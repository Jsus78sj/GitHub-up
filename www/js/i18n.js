/* GitHub Nexus · العربي / English (المرحلة 4)
 * يترجم الواجهة تلقائياً (حتى الرسائل اللي تنضاف بعدين: الإشعارات، السجل، الأزرار)
 * بدون ما نعدّل كل سطر في الكود: MutationObserver يراقب الصفحة ويترجم أي نص معروف.
 * أسماء الريبوهات والمسارات والتوكن ما تنترجم أبداً.
 */
(function () {
    const AR = {
        // عام
        'GitHub Nexus · Repo Manager Pro': 'GitHub Nexus · مدير المستودعات',
        'REPO MANAGER PRO': 'مدير المستودعات',
        'Connected': 'متصل',
        'Disconnect': 'تسجيل الخروج',
        'Language': 'اللغة',
        'Refresh': 'تحديث',
        // الخطوة 1
        'Welcome back': 'أهلاً بعودتك',
        'Enter your GitHub Personal Access Token to continue': 'أدخل رمز الوصول الشخصي (Token) من GitHub للمتابعة',
        'Personal Access Token': 'رمز الوصول الشخصي',
        'Requires': 'يحتاج صلاحية',
        'scope': '',
        'Connect to GitHub': 'الاتصال بـ GitHub',
        'Connecting...': 'جارٍ الاتصال...',
        'Press': 'اضغط',
        'to connect': 'للاتصال',
        // الخطوة 2
        'New Repository': 'مستودع جديد',
        'Select Repository': 'اختر المستودع',
        'Choose a target for deployment': 'اختر وجهة الرفع',
        'Existing Repos': 'المستودعات الحالية',
        'Create New': 'إنشاء جديد',
        'All Types': 'الكل',
        'Public': 'عام',
        'Private': 'خاص',
        'Search repositories...': 'ابحث في المستودعات...',
        'No repositories found': 'ما فيه مستودعات',
        'No description': 'بدون وصف',
        'Create New Repository': 'إنشاء مستودع جديد',
        'Set up a fresh repo for deployment': 'جهّز مستودع جديد للرفع',
        'Selected Target': 'الوجهة المختارة',
        'Branch:': 'الفرع:',
        'New Branch': 'فرع جديد',
        // الخطوة 3
        'Deploy Center': 'مركز الرفع',
        'Configure deployment and upload files': 'اضبط الرفع وارفع ملفاتك',
        'Target:': 'الوجهة:',
        'Deployment Strategy': 'طريقة الرفع',
        'Full Sync': 'مزامنة كاملة',
        'Mirror': 'نسخة طبق الأصل',
        'Replaces entire repository with ZIP contents. Files not in ZIP will be deleted.': 'يستبدل المستودع كامل بمحتوى الـ ZIP. أي ملف مو موجود في الـ ZIP راح ينحذف.',
        'Partial Update': 'تحديث جزئي',
        'Merge': 'دمج',
        'Adds new files and updates existing ones. Preserves files not present in ZIP.': 'يضيف الملفات الجديدة ويحدّث الموجودة. الملفات اللي مو في الـ ZIP تبقى.',
        'Upload Speed': 'سرعة الرفع',
        'Auto slows down if GitHub limits': 'تنخفض تلقائياً إذا GitHub حدّ الطلبات',
        'Safe': 'آمن',
        'Weak network or very large repos': 'نت ضعيف أو مستودع ضخم',
        'Balanced': 'متوازن',
        'Recommended for most uploads': 'الأنسب لأغلب الحالات',
        'Fast': 'سريع',
        'Strong Wi-Fi / 4G+': 'واي فاي قوي / 4G+',
        'Turbo': 'أقصى سرعة',
        'Max speed, may hit GitHub limits': 'أعلى سرعة، وممكن توصل لحد GitHub',
        'Upload Archive': 'ملف الرفع',
        'Drop ZIP file here': 'اسحب ملف ZIP هنا',
        'or click to browse • Max 100MB': 'أو اضغط للاختيار • الحد 100MB',
        'Remove file': 'إزالة الملف',
        'Archive Contents': 'محتويات الملف',
        'Deploy to GitHub': 'ارفع إلى GitHub',
        'Upload contents of': 'ارفع محتويات',
        'to repo root': 'إلى جذر المستودع',
        // التقدم
        'Deployment in Progress': 'جارٍ الرفع',
        'Initializing...': 'جارٍ التجهيز...',
        'Reading branch...': 'قراءة الفرع...',
        'Comparing files...': 'مقارنة الملفات...',
        'Uploading...': 'جارٍ الرفع...',
        'Creating commit...': 'إنشاء الـ commit...',
        'Updating branch...': 'تحديث الفرع...',
        'Deployment complete': 'تم الرفع',
        'Deployment failed': 'فشل الرفع',
        'Repository unchanged': 'المستودع ما تغيّر',
        'No changes': 'ما فيه تغييرات',
        'GitHub API': 'GitHub API',
        // الفوتر
        'GitHub Nexus • Client-side Repository Manager': 'GitHub Nexus • مدير مستودعات يعمل على جهازك',
        'Ready': 'جاهز',
        'Secure Connection': 'اتصال آمن',
        // المودالات
        'Repository Name': 'اسم المستودع',
        'Description': 'الوصف',
        '(optional)': '(اختياري)',
        'Short project description': 'وصف مختصر للمشروع',
        'Initialize with README': 'إنشاء مع ملف README',
        'Cancel': 'إلغاء',
        'Create': 'إنشاء',
        'Creating...': 'جارٍ الإنشاء...',
        'Branch Name': 'اسم الفرع',
        'Base Branch': 'الفرع الأساسي',
        'Create Branch': 'إنشاء الفرع',
        'Destructive Operation': 'عملية حذف',
        'Full Sync mode will': 'المزامنة الكاملة راح',
        'permanently delete': 'تحذف نهائياً',
        'all files in': 'كل الملفات في',
        'that are not present in your ZIP archive.': 'اللي مو موجودة في ملف الـ ZIP.',
        'This action cannot be undone. Make sure you have a backup if needed.': 'ما تقدر تتراجع عن هالعملية. تأكد إن عندك نسخة احتياطية.',
        'Yes, Proceed': 'نعم، تابع',
        // الإشعارات والأخطاء
        'Please enter your GitHub token': 'أدخل التوكن أولاً',
        'No internet connection': 'ما فيه اتصال بالإنترنت',
        'Failed to fetch': 'تعذّر الاتصال',
        'Invalid or expired token': 'التوكن غير صحيح أو منتهي',
        'GitHub is not responding, try again': 'GitHub ما يستجيب، حاول مرة ثانية',
        'Token is missing the "repo" scope': 'التوكن ما فيه صلاحية "repo"',
        'Token has no write access to this repository': 'التوكن ما عنده صلاحية كتابة على هذا المستودع',
        'Refreshing repositories...': 'جارٍ تحديث المستودعات...',
        'Could not load branches': 'تعذّر تحميل الفروع',
        'Repository name is required': 'اكتب اسم المستودع',
        'Failed to create repository': 'فشل إنشاء المستودع',
        'Select a repository first': 'اختر مستودع أولاً',
        'Branch name is required': 'اكتب اسم الفرع',
        'Failed to create branch': 'فشل إنشاء الفرع',
        'Please drop a ZIP file': 'لازم يكون الملف ZIP',
        'File too large (max 100MB)': 'الملف كبير (الحد 100MB)',
        'Archive loaded successfully': 'تم تحميل الملف',
        'Failed to read ZIP file': 'تعذّرت قراءة ملف الـ ZIP',
        'The ZIP archive is empty': 'ملف الـ ZIP فاضي',
        'Repository is empty or branch not found. Create it with a README first.': 'المستودع فاضي أو الفرع مو موجود. أنشئه مع README أول مرة.',
        'Very large repository: unchanged-file skipping is partial': 'المستودع ضخم جداً: تخطي الملفات غير المتغيرة جزئي',
        'No changes detected, no commit created': 'ما فيه تغييرات، ما انعمل commit',
        'No changes: everything is already up to date': 'ما فيه تغييرات: كل شي محدّث',
        'Branch changed during upload, retrying...': 'الفرع تغيّر أثناء الرفع، إعادة المحاولة...',
        'Upload in progress, please wait': 'الرفع شغّال، انتظر لين يخلص',
        'Internet connection lost': 'انقطع الاتصال بالإنترنت',
        'Back online': 'رجع الاتصال'
    };

    const SPEED_AR = { Safe: 'آمن', Balanced: 'متوازن', Fast: 'سريع', Turbo: 'أقصى سرعة' };
    const t = (s) => (AR[s] !== undefined ? AR[s] : s);

    const PATTERNS = [
        [/^(\d+) repos$/, (m) => `${m[1]} مستودع`],
        [/^(\d+) files$/, (m) => `${m[1]} ملف`],
        [/^(\d+)\/(\d+) files$/, (m) => `${m[1]}/${m[2]} ملف`],
        [/^Welcome, (.+)!$/, (m) => `أهلاً، ${m[1]}!`],
        [/^Created repository: (.+)$/, (m) => `تم إنشاء المستودع: ${m[1]}`],
        [/^Created branch: (.+)$/, (m) => `تم إنشاء الفرع: ${m[1]}`],
        [/^Created: (.+)$/, (m) => `جديد: ${m[1]}`],
        [/^Updated: (.+)$/, (m) => `تحديث: ${m[1]}`],
        [/^Deleted: (.+)$/, (m) => `حذف: ${m[1]}`],
        [/^Failed: (.+)$/, (m) => `فشل: ${t(m[1])}`],
        [/^Deploy failed: (.+) \(repo unchanged\)$/, (m) => `فشل الرفع: ${t(m[1])} (المستودع ما تغيّر)`],
        [/^Deploy → (.+) \[(FULL SYNC|PARTIAL)\] · (\d+) files$/, (m) => `رفع ← ${m[1]} [${m[2] === 'FULL SYNC' ? 'مزامنة كاملة' : 'تحديث جزئي'}] · ${m[3]} ملف`],
        [/^Speed: (\w+) \((\d+)× parallel\)$/, (m) => `السرعة: ${SPEED_AR[m[1]] || m[1]} (${m[2]}× متوازي)`],
        [/^GitHub rate limit: slowing to (\d+)× and waiting (\d+)s\.\.\.$/, (m) => `حد GitHub: تخفيض السرعة إلى ${m[1]}× والانتظار ${m[2]} ثانية...`],
        [/^GitHub rate limit: waiting (\d+)s\.\.\.$/, (m) => `حد GitHub: انتظار ${m[1]} ثانية...`],
        [/^Large file \((.+)\): (.+)$/, (m) => `ملف كبير (${m[1]}): ${m[2]}`],
        [/^File larger than 100MB: (.+)$/, (m) => `ملف أكبر من 100MB: ${m[1]}`],
        [/^(\d+) files identical$/, (m) => `${m[1]} ملف بدون تغيير`],
        [/^Deployed in ([\d.]+)s: (\d+) uploaded(?:, (\d+) deleted)?$/, (m) => `تم الرفع في ${m[1]} ثانية: ${m[2]} ملف${m[3] ? `، حذف ${m[3]}` : ''}`],
        [/^(\d+) new, (\d+) updated, (\d+) deleted, (\d+) unchanged · ([\d.]+)s$/, (m) => `${m[1]} جديد، ${m[2]} محدّث، ${m[3]} محذوف، ${m[4]} بدون تغيير · ${m[5]} ثانية`],
        [/^✓ Commit (\w+) · (.+)$/, (m) => `✓ Commit ${m[1]} · ${translate(m[2]) ?? m[2]}`]
    ];

    function translate(text) {
        const key = text.replace(/\s+/g, ' ').trim();
        if (!key) return null;
        if (AR[key] !== undefined) return AR[key];
        for (const [re, fn] of PATTERNS) { const m = key.match(re); if (m) return fn(m); }
        return null;
    }

    const LANG_KEY = 'nexus_lang';
    let lang = 'en';
    try {
        const saved = localStorage.getItem(LANG_KEY);
        lang = saved === 'ar' || saved === 'en' ? saved : ((navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en');
    } catch (_) {}

    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'KBD', 'TEXTAREA', 'SVG']);
    const SKIP_IDS = new Set(['fileTree', 'userName', 'userLogin', 'selectedRepoName', 'targetRepo', 'targetBranch', 'confirmTarget', 'selectedFileName', 'branchSelect', 'baseBranchSelect']);
    function skipped(node) {
        for (let el = node.nodeType === 3 ? node.parentNode : node; el && el.nodeType === 1; el = el.parentNode) {
            if (SKIP_TAGS.has(el.tagName.toUpperCase()) || (el.id && SKIP_IDS.has(el.id))) return true;
            if (el.classList && el.classList.contains('repo-name')) return true;
        }
        return false;
    }

    function doText(node) {
        if (node.data === node.__tr) return;          // تغييرنا نحن
        node.__en = node.data;                          // نص جديد من الكود
        apply(node);
    }
    function apply(node) {
        if (node.__en === undefined) node.__en = node.data;
        if (skipped(node)) return;
        const src = node.__en;
        let out = src;
        if (lang === 'ar') {
            const tr = translate(src);
            if (tr !== null) { const lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0]; out = lead + tr + trail; }
        }
        if (node.data !== out) { node.__tr = out; node.data = out; }
        else node.__tr = out;
    }
    const ATTRS = ['placeholder', 'title', 'aria-label'];
    function doAttrs(el) {
        if (skipped(el)) return;
        el.__enAttr = el.__enAttr || {};
        el.__trAttr = el.__trAttr || {};
        for (const a of ATTRS) {
            if (!el.hasAttribute(a)) continue;
            const v = el.getAttribute(a);
            if (v !== el.__trAttr[a]) el.__enAttr[a] = v;
            const src = el.__enAttr[a];
            const out = lang === 'ar' ? (translate(src) ?? src) : src;
            el.__trAttr[a] = out;
            if (v !== out) el.setAttribute(a, out);
        }
    }
    function walk(root) {
        if (root.nodeType === 3) return apply(root);
        if (root.nodeType !== 1) return;
        doAttrs(root);
        const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let n;
        while ((n = it.nextNode())) n.nodeType === 3 ? apply(n) : doAttrs(n);
    }

    let titleEn = document.title;
    function applyLang() {
        const html = document.documentElement;
        html.lang = lang;
        html.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.title = lang === 'ar' ? (translate(titleEn) ?? titleEn) : titleEn;
        walk(document.body);
        const b = document.getElementById('langToggle');
        if (b) { b.textContent = lang === 'ar' ? 'EN' : 'ع'; b.__tr = undefined; }
    }

    window.toggleLanguage = function () {
        lang = lang === 'ar' ? 'en' : 'ar';
        try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}
        applyLang();
    };
    window.nexusLang = () => lang;
    window.__nexusTranslate = translate; // للاختبار

    function start() {
        applyLang();
        new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.type === 'characterData') doText(m.target);
                else if (m.type === 'attributes') doAttrs(m.target);
                else m.addedNodes.forEach((n) => { if (n.nodeType === 3) { n.__en = n.data; apply(n); } else walk(n); });
            }
        }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
