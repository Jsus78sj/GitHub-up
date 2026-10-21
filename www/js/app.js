// State
let githubToken = '', currentUser = null, repositories = [], selectedRepo = null, selectedBranch = null, branches = [], zipContents = null, currentTab = 'existing', deployMode = 'fullSync', pendingDeploy = false;

// Utils
const showToast = (msg, type = 'info') => {
    const toast = document.createElement('div');
    const colors = {
        info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    };
    const icons = {
        info: 'info',
        success: 'circle-check',
        error: 'circle-x',
        warning: 'triangle-alert'
    };
    toast.className = `toast pointer-events-auto p-4 rounded-xl border backdrop-blur-md flex items-start gap-3 shadow-xl ${colors[type]}`;
    toast.innerHTML = `
        <i data-lucide="${icons[type]}" class="w-5 h-5 shrink-0 mt-0.5"></i>
        <div class="flex-1 text-sm">${msg}</div>
    `;
    document.getElementById('toastContainer').appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
};

const logProgress = (msg, type = 'info') => {
    const logDiv = document.getElementById('progressLog');
    const entry = document.createElement('div');
    const colors = {
        info: 'text-slate-300',
        success: 'text-emerald-400',
        error: 'text-rose-400',
        warning: 'text-amber-400',
        delete: 'text-rose-300'
    };
    const icons = {
        info: '•',
        success: '✓',
        error: '✗',
        warning: '⚠',
        delete: '🗑'
    };
    entry.className = `flex items-center gap-2 ${colors[type]}`;
    entry.innerHTML = `
        <span class="text-slate-600 text-[10px]">${new Date().toLocaleTimeString()}</span>
        <span class="opacity-50">${icons[type]}</span>
        <span>${msg}</span>
    `;
    logDiv.appendChild(entry);
    entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const updateProgress = (percent, label, stats = '') => {
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressPercent').innerText = `${percent}%`;
    if (label) document.getElementById('progressLabel').innerText = label;
    if (stats) document.getElementById('progressStats').innerText = stats;
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Auth
function toggleTokenVisibility() {
    const inp = document.getElementById('tokenInput');
    const icon = document.getElementById('eyeIcon');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    icon.setAttribute('data-lucide', inp.type === 'password' ? 'eye' : 'eye-off');
    lucide.createIcons();
}

async function fetchRepos() {
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) return showToast('Please enter your GitHub token', 'error');
    githubToken = token;
    
    const btn = document.getElementById('fetchBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-circle" class="animate-spin w-4 h-4"></i> Connecting...';
    lucide.createIcons();
    
    try {
        let userRes;
        try { userRes = await fetch('https://api.github.com/user', { headers: { 'Authorization': `Bearer ${githubToken}` } }); }
        catch (_) { throw new Error('No internet connection'); }
        if (userRes.status === 401) throw new Error('Invalid or expired token');
        if (!userRes.ok) throw new Error('GitHub is not responding, try again');
        const scopes = userRes.headers.get('x-oauth-scopes');
        if (scopes !== null && !scopes.split(',').map(s => s.trim()).includes('repo')) showToast('Token is missing the "repo" scope', 'warning');
        currentUser = await userRes.json();
        
        document.getElementById('userAvatar').src = currentUser.avatar_url;
        document.getElementById('userName').innerText = currentUser.name || currentUser.login;
        document.getElementById('userLogin').innerText = '@' + currentUser.login;
        
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('userBar').classList.remove('hidden');
        document.getElementById('userBar').classList.add('flex');
        document.getElementById('headerActions').classList.remove('hidden');
        document.getElementById('headerActions').classList.add('flex');
        document.getElementById('step2').classList.remove('hidden');
        
        await loadRepositories();
        showToast(`Welcome, ${currentUser.login}!`, 'success');
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="zap" class="w-4 h-4"></i> Connect to GitHub';
        lucide.createIcons();
    }
}

function disconnect() {
    githubToken = '';
    currentUser = null;
    selectedRepo = null;
    zipContents = null;
    location.reload();
}

// Repos
async function loadRepositories() {
    let page = 1, allRepos = [];
    while (page <= 5) {
        const res = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`, { headers: { 'Authorization': `Bearer ${githubToken}` } });
        if (!res.ok) break;
        const data = await res.json();
        if (data.length === 0) break;
        allRepos.push(...data);
        page++;
    }
    repositories = allRepos;
    displayRepos(repositories);
}

function displayRepos(repos) {
    const container = document.getElementById('repoList');
    document.getElementById('repoCountBadge').innerText = `${repos.length} repos`;
    
    if (!repos.length) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 text-slate-600">
                <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                <p>No repositories found</p>
            </div>`;
        lucide.createIcons();
        return;
    }
    
    container.innerHTML = repos.map(repo => `
        <div class="repo-card rounded-xl p-4 cursor-pointer group" data-fullname="${repo.full_name}" data-default="${repo.default_branch}">
            <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-white truncate pe-2 group-hover:text-blue-400 transition-colors repo-name">${escapeHtml(repo.name)}</h3>
                ${repo.private 
                    ? '<span class="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Private</span>'
                    : '<span class="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Public</span>'
                }
            </div>
            <p class="text-xs text-slate-500 line-clamp-2 mb-3 h-8${repo.description ? ' repo-name' : ''}">${repo.description ? escapeHtml(repo.description) : 'No description'}</p>
            <div class="flex items-center gap-3 text-xs text-slate-500">
                <span class="flex items-center gap-1.5 repo-name">
                    <i data-lucide="git-branch" class="w-3 h-3"></i>
                    ${repo.default_branch}
                </span>
                <span class="flex items-center gap-1.5">
                    <i data-lucide="star" class="w-3 h-3"></i>
                    ${repo.stargazers_count}
                </span>
                ${repo.language ? `<span class="ms-auto text-[10px] px-2 py-0.5 rounded-full bg-white/5 repo-name">${escapeHtml(repo.language)}</span>` : ''}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.repo-card').forEach(card => {
        card.addEventListener('click', () => selectRepo(card.dataset.fullname, card.dataset.default, card));
    });
    lucide.createIcons();
}

function filterRepos() {
    const search = document.getElementById('repoSearch').value.toLowerCase();
    const vis = document.getElementById('visibilityFilter').value;
    const filtered = repositories.filter(r => 
        r.name.toLowerCase().includes(search) && 
        (vis === 'all' || (vis === 'public' && !r.private) || (vis === 'private' && r.private))
    );
    displayRepos(filtered);
}

function refreshRepos() {
    loadRepositories();
    showToast('Refreshing repositories...', 'info');
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tabExisting').className = tab === 'existing' 
        ? 'flex-1 tab-active px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2'
        : 'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2';
    document.getElementById('tabNew').className = tab === 'new'
        ? 'flex-1 tab-active px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2'
        : 'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2';
    document.getElementById('existingReposView').classList.toggle('hidden', tab !== 'existing');
    document.getElementById('newRepoView').classList.toggle('hidden', tab !== 'new');
}

async function selectRepo(fullName, defaultBranch, element) {
    document.querySelectorAll('.repo-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    selectedRepo = fullName;
    selectedBranch = defaultBranch;
    
    document.getElementById('selectedRepoInfo').classList.remove('hidden');
    document.getElementById('selectedRepoName').innerText = fullName;
    document.getElementById('step3').classList.remove('hidden');
    document.getElementById('targetRepo').innerText = fullName;
    document.getElementById('targetBranch').innerText = defaultBranch;
    
    await loadBranches(fullName);
    if (zipContents) document.getElementById('deployBtn').disabled = false;
    
    // Scroll to deploy section
    setTimeout(() => {
        document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

async function loadBranches(repoFullName) {
    const [owner, repo] = repoFullName.split('/');
    const select = document.getElementById('branchSelect');
    const baseSelect = document.getElementById('baseBranchSelect');
    
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, { headers: { 'Authorization': `Bearer ${githubToken}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        branches = data;
        
        const options = data.map(b => `<option value="${b.name}" class="bg-slate-900"${b.name === selectedBranch ? ' selected' : ''}>${b.name}</option>`).join('');
        select.innerHTML = options;
        baseSelect.innerHTML = options;
    } catch (e) {
        showToast('Could not load branches', 'error');
    }
}

function onBranchChange() {
    selectedBranch = document.getElementById('branchSelect').value;
    document.getElementById('targetBranch').innerText = selectedBranch;
}

// Repo Creation
function openCreateRepoModal() {
    document.getElementById('createRepoModal').style.display = 'flex';
    document.getElementById('newRepoName').focus();
}

function closeCreateRepoModal() {
    document.getElementById('createRepoModal').style.display = 'none';
    document.getElementById('newRepoName').value = '';
    if (currentTab === 'new') switchTab('existing');
}

async function createRepository() {
    const name = document.getElementById('newRepoName').value.trim();
    if (!name) return showToast('Repository name is required', 'error');
    
    const btn = document.getElementById('createRepoBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-circle" class="animate-spin w-4 h-4"></i> Creating...';
    lucide.createIcons();
    
    try {
        const res = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                description: document.getElementById('newRepoDescription').value,
                private: document.querySelector('input[name="repoVisibility"]:checked').value === 'private',
                auto_init: document.getElementById('initReadme').checked
            })
        });
        if (!res.ok) throw new Error();
        const newRepo = await res.json();
        showToast(`Created repository: ${newRepo.name}`, 'success');
        await loadRepositories();
        closeCreateRepoModal();
    } catch (e) {
        showToast('Failed to create repository', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Create';
    }
}

// Branch Creation
function openCreateBranchModal() {
    if (!selectedRepo) return showToast('Select a repository first', 'warning');
    document.getElementById('createBranchModal').style.display = 'flex';
    document.getElementById('newBranchName').focus();
}

function closeCreateBranchModal() {
    document.getElementById('createBranchModal').style.display = 'none';
}

async function createBranch() {
    const branchName = document.getElementById('newBranchName').value.trim();
    const baseBranch = document.getElementById('baseBranchSelect').value;
    if (!branchName) return showToast('Branch name is required', 'error');
    
    const btn = document.getElementById('createBranchBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-circle" class="animate-spin w-4 h-4"></i> Creating...';
    
    try {
        const [owner, repo] = selectedRepo.split('/');
        const baseRef = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`, { headers: { 'Authorization': `Bearer ${githubToken}` } });
        const sha = (await baseRef.json()).object.sha;
        
        const create = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha })
        });
        if (!create.ok) throw new Error();
        
        showToast(`Created branch: ${branchName}`, 'success');
        await loadBranches(selectedRepo);
        document.getElementById('branchSelect').value = branchName;
        selectedBranch = branchName;
        document.getElementById('targetBranch').innerText = branchName;
        closeCreateBranchModal();
    } catch (e) {
        showToast('Failed to create branch', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="git-branch" class="w-4 h-4"></i> Create Branch';
    }
}

// Deploy Mode
function updateDeployMode(mode) {
    deployMode = mode;
    document.getElementById('modeFullSyncLabel').classList.toggle('selected', mode === 'fullSync');
    document.getElementById('modePartialLabel').classList.toggle('selected', mode === 'partial');
}

// File Handling
function handleDragOver(e) { e.preventDefault(); document.getElementById('dropZone').classList.add('drag-over'); }
function handleDragLeave(e) { document.getElementById('dropZone').classList.remove('drag-over'); }

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropZone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) processZipFile(file);
    else showToast('Please drop a ZIP file', 'error');
}

function handleFileSelect(e) { if (e.target.files[0]) processZipFile(e.target.files[0]); }

function clearFile(e) {
    e.stopPropagation();
    zipContents = null;
    document.getElementById('dropContent').classList.remove('hidden');
    document.getElementById('fileSelected').classList.add('hidden');
    document.getElementById('fileTreeSection').classList.add('hidden');
    document.getElementById('fileInput').value = '';
    document.getElementById('deployBtn').disabled = true;
}

function buildTree(files) {
    const root = { name: '', children: {}, isDir: true };
    files.forEach(path => {
        const parts = path.split('/');
        let current = root;
        parts.forEach((part, idx) => {
            const isLast = idx === parts.length - 1;
            if (!current.children[part]) current.children[part] = { name: part, children: {}, isDir: !isLast };
            current = current.children[part];
        });
    });
    return root;
}

function renderTree(node) {
    if (node.name === '') return Object.values(node.children).map(c => renderTree(c)).join('');
    const hasChildren = Object.keys(node.children).length > 0;
    if (!hasChildren) return `<li class="tree-node"><div class="tree-node-content"><i data-lucide="file-text" class="w-4 h-4 file-icon"></i><span>${escapeHtml(node.name)}</span></div></li>`;
    
    const nodeId = 'node_' + Math.random().toString(36).substr(2, 8);
    return `<li class="tree-node">
        <div class="tree-node-content" onclick="toggleTree(this)">
            <span class="tree-toggle"><i data-lucide="chevron-right" class="w-3 h-3"></i></span>
            <i data-lucide="folder" class="w-4 h-4 folder-icon"></i>
            <span class="text-slate-300">${escapeHtml(node.name)}</span>
        </div>
        <ul class="tree-children" id="${nodeId}">${Object.values(node.children).map(c => renderTree(c)).join('')}</ul>
    </li>`;
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function toggleTree(el) {
    const children = el.parentElement.querySelector('.tree-children');
    const toggle = el.querySelector('.tree-toggle');
    if (children) {
        children.classList.toggle('open');
        toggle.classList.toggle('rotated');
    }
}

async function processZipFile(file) {
    if (file.size > 100 * 1024 * 1024) return showToast('File too large (max 100MB)', 'error');
    
    document.getElementById('dropContent').classList.add('hidden');
    document.getElementById('fileSelected').classList.remove('hidden');
    document.getElementById('selectedFileName').innerText = file.name;
    document.getElementById('fileSize').innerText = formatBytes(file.size);
    
    try {
        const zip = await JSZip.loadAsync(file);
        zipContents = zip;
        const allPaths = Object.keys(zip.files).filter(p => !zip.files[p].dir);
        
        document.getElementById('fileCountBadge').innerText = `${allPaths.length} files`;
        const treeRoot = buildTree(allPaths);
        document.getElementById('fileTree').innerHTML = `<ul class="tree-root">${Object.values(treeRoot.children).map(c => renderTree(c)).join('')}</ul>`;
        document.getElementById('fileTreeSection').classList.remove('hidden');
        lucide.createIcons();
        
        if (selectedRepo && selectedBranch) document.getElementById('deployBtn').disabled = false;
        showToast('Archive loaded successfully', 'success');
    } catch (e) {
        showToast('Failed to read ZIP file', 'error');
        clearFile({ stopPropagation: () => {} });
    }
}

// Deployment
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    pendingDeploy = false;
}

function confirmedDeploy() {
    closeConfirmModal();
    executeDeploy();
}

async function deployFiles() {
    if (!selectedRepo || !selectedBranch || !zipContents) return;
    
    if (deployMode === 'fullSync') {
        pendingDeploy = true;
        document.getElementById('confirmTarget').innerText = `${selectedRepo}:${selectedBranch}`;
        document.getElementById('confirmModal').style.display = 'flex';
        return;
    }
    
    executeDeploy();
}

// executeDeploy → js/deploy.js

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !document.getElementById('deployBtn').disabled && document.getElementById('step3').classList.contains('hidden') === false) {
        deployFiles();
    }
    if (e.key === 'Escape') {
        closeCreateRepoModal();
        closeCreateBranchModal();
        closeConfirmModal();
    }
});

// Init
lucide.createIcons();
    
