/* GitHub Nexus · طبقة أندرويد (المرحلة 2)
 * - حفظ التوكن مشفّر في Android Keystore والدخول التلقائي
 * - زر الرجوع: يقفل المودال المفتوح بدل ما يطلع من التطبيق
 * - تنبيه انقطاع/رجوع الإنترنت
 * - شريط الحالة + شاشة البداية
 * - منع الجوال من النوم أثناء الرفع
 * في المتصفح العادي: كل شي يشتغل بدون هذي الميزات (والتوكن ما ينحفظ أبداً).
 */
(function () {
    const Cap = window.Capacitor;
    const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
    const P = (Cap && Cap.Plugins) || {};
    const TOKEN_KEY = 'gh_token';
    const MODALS = ['confirmModal', 'createBranchModal', 'createRepoModal'];
    let deploying = false;

    const safe = async (fn) => { try { return await fn(); } catch (e) { console.warn('[native]', e); return undefined; } };

    // ---------- التخزين الآمن ----------
    const Secure = {
        available: () => isNative && !!P.SecureStoragePlugin,
        get: () => safe(async () => (await P.SecureStoragePlugin.get({ key: TOKEN_KEY })).value),
        set: (v) => safe(() => P.SecureStoragePlugin.set({ key: TOKEN_KEY, value: v })),
        remove: () => safe(() => P.SecureStoragePlugin.remove({ key: TOKEN_KEY }))
    };

    // نلف fetchRepos: بعد الدخول الناجح نحفظ التوكن
    const origFetchRepos = window.fetchRepos;
    window.fetchRepos = async function () {
        await origFetchRepos.apply(this, arguments);
        if (currentUser && githubToken && Secure.available()) await Secure.set(githubToken);
    };

    // نلف disconnect: نمسح التوكن قبل إعادة التحميل
    const origDisconnect = window.disconnect;
    window.disconnect = async function () {
        if (Secure.available()) await Secure.remove();
        origDisconnect.apply(this, arguments);
    };

    // نلف executeDeploy: نمنع النوم ونقفل زر الرجوع أثناء الرفع
    const origExecuteDeploy = window.executeDeploy;
    window.executeDeploy = async function () {
        deploying = true;
        if (isNative && P.KeepAwake) await safe(() => P.KeepAwake.keepAwake());
        try { return await origExecuteDeploy.apply(this, arguments); }
        finally {
            deploying = false;
            if (isNative && P.KeepAwake) await safe(() => P.KeepAwake.allowSleep());
        }
    };

    // ---------- زر الرجوع ----------
    function closeTopModal() {
        for (const id of MODALS) {
            const el = document.getElementById(id);
            if (el && getComputedStyle(el).display !== 'none') {
                if (id === 'confirmModal') closeConfirmModal();
                else if (id === 'createBranchModal') closeCreateBranchModal();
                else closeCreateRepoModal();
                return true;
            }
        }
        return false;
    }
    if (isNative && P.App) {
        P.App.addListener('backButton', () => {
            if (closeTopModal()) return;
            if (deploying) { showToast('Upload in progress, please wait', 'warning'); return; }
            P.App.minimizeApp();
        });
    }

    // ---------- الإنترنت ----------
    let wasOffline = false;
    function onNet(connected) {
        if (!connected) { wasOffline = true; showToast('Internet connection lost', 'warning'); }
        else if (wasOffline) { wasOffline = false; showToast('Back online', 'success'); }
    }
    if (isNative && P.Network) {
        P.Network.addListener('networkStatusChange', (s) => onNet(s.connected));
    } else {
        window.addEventListener('offline', () => onNet(false));
        window.addEventListener('online', () => onNet(true));
    }

    // ---------- البداية ----------
    async function init() {
        if (isNative && P.StatusBar) {
            await safe(() => P.StatusBar.setStyle({ style: 'DARK' }));
            await safe(() => P.StatusBar.setBackgroundColor({ color: '#020617' }));
        }
        if (isNative && P.Network) {
            const s = await safe(() => P.Network.getStatus());
            if (s && !s.connected) onNet(false);
        }
        if (Secure.available()) {
            const saved = await Secure.get();
            if (saved) {
                document.getElementById('tokenInput').value = saved;
                if (P.SplashScreen) await safe(() => P.SplashScreen.hide());
                await window.fetchRepos();
                // التوكن انتهى أو انسحب؟ امسحه عشان ما يحاول كل مرة
                if (!currentUser) await Secure.remove();
                return;
            }
        }
        if (isNative && P.SplashScreen) await safe(() => P.SplashScreen.hide());
    }
    init();
})();
