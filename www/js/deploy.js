/* GitHub Nexus · محرك الرفع السريع (المرحلة 3)
 * بدل: لكل ملف GET + PUT + commit مستقل (بطيء، يضرب rate limit، ويخرب تاريخ الريبو)
 * صار: blobs بالتوازي ← tree واحد ← commit واحد ← تحديث الفرع
 * + تخطي الملفات اللي ما تغيرت (مقارنة git SHA محلياً)
 * + إعادة المحاولة التلقائية + احترام حدود GitHub
 * + لو فشل أي شي بالنص: الريبو ما يتأثر (الفرع ما يتحدث إلا بالنهاية)
 */
(function () {
    const API = 'https://api.github.com';
    // ---------- سرعة الرفع ----------
    const SPEEDS = {
        safe:     { label: 'Safe',     parallel: 2,  gap: 250 },
        balanced: { label: 'Balanced', parallel: 6,  gap: 0 },
        fast:     { label: 'Fast',     parallel: 10, gap: 0 },
        turbo:    { label: 'Turbo',    parallel: 16, gap: 0 }
    };
    const SPEED_KEY = 'nexus_upload_speed';
    let speedKey = 'balanced';
    try { const s = localStorage.getItem(SPEED_KEY); if (SPEEDS[s]) speedKey = s; } catch (_) {}
    const live = { limit: SPEEDS[speedKey].parallel, lastDrop: 0 }; // ينخفض تلقائياً لو GitHub حدّد

    window.setUploadSpeed = function (key) {
        if (!SPEEDS[key]) return;
        speedKey = key;
        try { localStorage.setItem(SPEED_KEY, key); } catch (_) {}
        document.querySelectorAll('.speed-card').forEach(c => c.classList.toggle('selected', c.dataset.speed === key));
    };
    const paintSpeed = () => window.setUploadSpeed(speedKey);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintSpeed); else paintSpeed();
    const MAX_FILE = 100 * 1024 * 1024;   // حد GitHub
    const WARN_FILE = 50 * 1024 * 1024;
    const JUNK = [/(^|\/)__MACOSX\//, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/i, /(^|\/)desktop\.ini$/i, /(^|\/)\._[^/]*$/];
    // ملفات حساسة أو ثقيلة ما ترتفع أبداً، حتى لو كانت داخل الـ ZIP
    const NEVER = [/(^|\/)node_modules\//, /(^|\/)keys\//, /\.(jks|keystore|p12|pem)$/i, /(^|\/)keystore\.properties$/, /(^|\/)\.env(\.[\w-]+)?$/, /(^|\/)local\.properties$/];
    JUNK.push(...NEVER);

    window.deploySettings = { stripRoot: true, rootFolder: null };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s));
    const encRef = (b) => b.split('/').map(encodeURIComponent).join('/');

    // ---------- طلبات GitHub مع إعادة محاولة ----------
    class GhError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

    async function gh(path, { method = 'GET', body, tries = 4 } = {}) {
        for (let t = 0; ; t++) {
            let res;
            try {
                res = await fetch(API + path, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                        ...(body ? { 'Content-Type': 'application/json' } : {})
                    },
                    body: body ? JSON.stringify(body) : undefined
                });
            } catch (netErr) {
                if (t >= tries - 1) throw new GhError(0, 'No internet connection');
                await sleep(1000 * 2 ** t); continue;
            }
            if (res.ok) return res.status === 204 ? null : res.json();

            let msg = res.statusText;
            try { msg = (await res.json()).message || msg; } catch (_) {}

            const remaining = res.headers.get('x-ratelimit-remaining');
            const retryAfter = res.headers.get('retry-after');
            const isRate = res.status === 429 || (res.status === 403 && (remaining === '0' || retryAfter || /rate limit/i.test(msg)));
            if (isRate && t < tries - 1) {
                let wait = retryAfter ? +retryAfter * 1000 : 0;
                const reset = res.headers.get('x-ratelimit-reset');
                if (!wait && reset) wait = Math.max(0, reset * 1000 - Date.now()) + 1000;
                wait = Math.min(Math.max(wait, 5000), 120000);
                if (live.limit > 1 && Date.now() - (live.lastDrop || 0) > 3000) {
                    live.lastDrop = Date.now();
                    live.limit = Math.max(1, Math.floor(live.limit / 2));
                    logProgress(`GitHub rate limit: slowing to ${live.limit}× and waiting ${Math.round(wait / 1000)}s...`, 'warning');
                } else logProgress(`GitHub rate limit: waiting ${Math.round(wait / 1000)}s...`, 'warning');
                await sleep(wait); continue;
            }
            if (res.status >= 500 && t < tries - 1) { await sleep(1000 * 2 ** t); continue; }
            if (res.status === 401) msg = 'Invalid or expired token';
            if (res.status === 403 && !isRate) msg = 'Token has no write access to this repository';
            throw new GhError(res.status, msg);
        }
    }

    // عمّال متوازيين، وعددهم الفعلي يتبع live.limit (لو انخفض، العمّال الزايدين يوقفون)
    async function pool(items, limit, gap, worker) {
        let i = 0;
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async (_, w) => {
            while (i < items.length) {
                if (w >= live.limit) return;
                const idx = i++;
                await worker(items[idx], idx);
                if (gap) await sleep(gap);
            }
        }));
    }

    // ---------- أدوات ----------
    async function gitBlobSha(bytes) {
        const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
        const buf = new Uint8Array(header.length + bytes.length);
        buf.set(header); buf.set(bytes, header.length);
        const h = await crypto.subtle.digest('SHA-1', buf);
        return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    function toBase64(bytes) {
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s);
    }
    function detectRoot(paths) {
        if (!paths.length) return null;
        const first = paths[0].split('/')[0];
        if (!paths.every(p => p.includes('/') && p.split('/')[0] === first)) return null;
        return first + '/';
    }
    function zipEntries() {
        let paths = Object.keys(zipContents.files).filter(p => !zipContents.files[p].dir && !JUNK.some(r => r.test(p)));
        const root = detectRoot(paths);
        const strip = root && deploySettings.stripRoot;
        return paths.map(p => ({ zipPath: p, path: strip ? p.slice(root.length) : p })).filter(e => e.path);
    }

    // ---------- خيار حذف المجلد الجذري ----------
    const origProcessZip = window.processZipFile;
    window.processZipFile = async function (file) {
        await origProcessZip.apply(this, arguments);
        const old = document.getElementById('stripRootBox');
        if (old) old.remove();
        if (!zipContents) return;
        const paths = Object.keys(zipContents.files).filter(p => !zipContents.files[p].dir && !JUNK.some(r => r.test(p)));
        const root = detectRoot(paths);
        deploySettings.rootFolder = root;
        if (!root) return;
        const box = document.createElement('label');
        box.id = 'stripRootBox';
        box.className = 'flex items-center gap-3 mb-4 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-sm text-slate-300 cursor-pointer';
        box.innerHTML = `<input type="checkbox" ${deploySettings.stripRoot ? 'checked' : ''} class="w-4 h-4 accent-blue-500">
            <span>Upload contents of <code class="font-mono text-blue-300">${esc(root)}</code> to repo root</span>`;
        box.querySelector('input').addEventListener('change', (e) => { deploySettings.stripRoot = e.target.checked; });
        const sec = document.getElementById('fileTreeSection');
        sec.insertBefore(box, sec.firstChild);
    };

    // ---------- الرفع ----------
    window.executeDeploy = async function () {
        const [owner, repo] = selectedRepo.split('/');
        const R = `/repos/${owner}/${repo}`;
        const branch = selectedBranch;
        const full = deployMode === 'fullSync';
        const t0 = performance.now();
        const btn = document.getElementById('deployBtn');

        document.getElementById('progressSection').classList.remove('hidden');
        document.getElementById('progressLog').innerHTML = '';
        btn.disabled = true;
        document.getElementById('progressSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            const entries = zipEntries();
            if (!entries.length) throw new Error('The ZIP archive is empty');
            const tooBig = entries.filter(e => (zipContents.files[e.zipPath]._data?.uncompressedSize || 0) > MAX_FILE);
            if (tooBig.length) throw new Error(`File larger than 100MB: ${tooBig[0].path}`);

            logProgress(`Deploy → ${esc(selectedRepo)}:${esc(branch)} [${full ? 'FULL SYNC' : 'PARTIAL'}] · ${entries.length} files`, 'info');
            updateProgress(2, 'Reading branch...', '');

            // 1) آخر commit + الشجرة الحالية
            let headSha, baseTreeSha, remote = new Map(), truncated = false;
            try {
                const ref = await gh(`${R}/git/ref/heads/${encRef(branch)}`);
                headSha = ref.object.sha;
                const commit = await gh(`${R}/git/commits/${headSha}`);
                baseTreeSha = commit.tree.sha;
                const tree = await gh(`${R}/git/trees/${baseTreeSha}?recursive=1`);
                truncated = !!tree.truncated;
                for (const it of tree.tree) if (it.type === 'blob' || it.type === 'commit') remote.set(it.path, it);
            } catch (e) {
                if (e.status === 409 || e.status === 404) throw new Error('Repository is empty or branch not found. Create it with a README first.');
                throw e;
            }
            if (truncated) logProgress('Very large repository: unchanged-file skipping is partial', 'warning');

            // 2) مقارنة محلية + رفع المتغير فقط (بالتوازي)
            updateProgress(5, 'Comparing files...', '');
            const treeEntries = [];
            let added = 0, changed = 0, same = 0, done = 0, sentBytes = 0;
            const tUp = performance.now();
            const speed = () => {
                const s = (performance.now() - tUp) / 1000;
                return s > 0.5 && sentBytes ? `  ·  ${formatBytes(sentBytes / s)}/s` : '';
            };
            const stats = () => `${added + changed}↑  ${same}=  ${done}/${entries.length}${speed()}`;

            const sp = SPEEDS[speedKey];
            live.limit = sp.parallel;
            logProgress(`Speed: ${sp.label} (${sp.parallel}× parallel)`, 'info');

            await pool(entries, sp.parallel, sp.gap, async (e) => {
                const bytes = await zipContents.files[e.zipPath].async('uint8array');
                if (bytes.length > WARN_FILE) logProgress(`Large file (${formatBytes(bytes.length)}): ${esc(e.path)}`, 'warning');
                const sha = await gitBlobSha(bytes);
                const prev = remote.get(e.path);
                const mode = prev && prev.mode === '100755' ? '100755' : '100644';

                if (prev && prev.sha === sha) {
                    same++;
                    if (full) treeEntries.push({ path: e.path, mode, type: 'blob', sha });
                } else {
                    const blob = await gh(`${R}/git/blobs`, { method: 'POST', body: { content: toBase64(bytes), encoding: 'base64' } });
                    sentBytes += bytes.length;
                    treeEntries.push({ path: e.path, mode, type: 'blob', sha: blob.sha });
                    if (prev) { changed++; logProgress(`Updated: ${esc(e.path)}`, 'success'); }
                    else { added++; logProgress(`Created: ${esc(e.path)}`, 'success'); }
                }
                done++;
                updateProgress(5 + Math.round((done / entries.length) * 85), 'Uploading...', stats());
            });

            // 3) الحذف (Full Sync): أي ملف مو بالـ ZIP ينشال تلقائياً لأن الشجرة تنبني من الصفر
            const zipSet = new Set(entries.map(e => e.path));
            const removed = [];
            for (const [p, it] of remote) {
                if (zipSet.has(p)) continue;
                if (it.type === 'commit') { if (full) treeEntries.push({ path: p, mode: '160000', type: 'commit', sha: it.sha }); continue; } // نحافظ على submodules
                if (full) removed.push(p);
            }
            removed.forEach(p => logProgress(`Deleted: ${esc(p)}`, 'delete'));

            if (added + changed + removed.length === 0) {
                updateProgress(100, 'No changes', `${same} files identical`);
                logProgress('No changes detected, no commit created', 'info');
                showToast('No changes: everything is already up to date', 'info');
                return;
            }

            // 4) tree + commit + تحديث الفرع (مع إعادة محاولة لو أحد رفع بنفس الوقت)
            const message = `deploy: ${added + changed + removed.length} changes (+${added} ~${changed} -${removed.length})`;
            let commitSha;
            for (let attempt = 0; attempt < 2; attempt++) {
                updateProgress(93, 'Creating commit...', stats());
                const tree = await gh(`${R}/git/trees`, { method: 'POST', body: full ? { tree: treeEntries } : { base_tree: baseTreeSha, tree: treeEntries } });
                const commit = await gh(`${R}/git/commits`, { method: 'POST', body: { message, tree: tree.sha, parents: [headSha] } });
                commitSha = commit.sha;
                try {
                    updateProgress(97, 'Updating branch...', stats());
                    await gh(`${R}/git/refs/heads/${encRef(branch)}`, { method: 'PATCH', body: { sha: commitSha, force: false } });
                    break;
                } catch (e) {
                    if (e.status !== 422 || attempt === 1) throw e;
                    logProgress('Branch changed during upload, retrying...', 'warning');
                    const ref = await gh(`${R}/git/ref/heads/${encRef(branch)}`);
                    headSha = ref.object.sha;
                    baseTreeSha = (await gh(`${R}/git/commits/${headSha}`)).tree.sha;
                }
            }

            const secs = ((performance.now() - t0) / 1000).toFixed(1);
            const summary = `${added} new, ${changed} updated, ${removed.length} deleted, ${same} unchanged · ${secs}s`;
            updateProgress(100, 'Deployment complete', summary);
            logProgress(`✓ Commit ${commitSha.slice(0, 7)} · ${summary}`, 'success');
            showToast(`Deployed in ${secs}s: ${added + changed} uploaded${removed.length ? `, ${removed.length} deleted` : ''}`, 'success');
        } catch (e) {
            updateProgress(0, 'Deployment failed', 'Repository unchanged');
            logProgress(`Failed: ${esc(e.message)}`, 'error');
            showToast(`Deploy failed: ${esc(e.message)} (repo unchanged)`, 'error');
        } finally {
            btn.disabled = false;
        }
    };
})();
