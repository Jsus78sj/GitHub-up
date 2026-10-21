// يتأكد إن ما في أي ملف داخل www يطلب شي من الإنترنت غير GitHub API
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const allowed = [/^https:\/\/api\.github\.com/, /^https:\/\/([a-z0-9-]+\.)?githubusercontent\.com/, /^https:\/\/\*\.githubusercontent\.com/, /^http:\/\/www\.w3\.org\//, /^https:\/\/github\.com\//];
const required = ['www/index.html', 'www/js/app.js', 'www/js/native.js', 'www/js/deploy.js', 'www/js/i18n.js', 'www/css/styles.css', 'www/css/tailwind.css', 'www/vendor/jszip.min.js', 'www/vendor/lucide.min.js', 'www/fonts/fonts.css'];
let bad = 0;

for (const f of required) if (!existsSync(f)) { console.error('✗ ملف ناقص: ' + f); bad++; }

function walk(d) { return readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
for (const file of walk('www').filter(p => /\.(html|js|css)$/.test(p) && !p.includes('vendor'))) {
  let txt = readFileSync(file, 'utf8');
  // تجاهل التعليقات في ملفات CSS (مثل ترويسة الترخيص لـ tailwind اللي فيها رابط)
  if (file.endsWith('.css')) txt = txt.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of txt.matchAll(/https?:\/\/[^"'`\s)<>;]+/g)) {
    if (!allowed.some(r => r.test(m[0]))) { console.error(`✗ رابط خارجي في ${file}: ${m[0]}`); bad++; }
  }
}
if (bad) { console.error(`\n✗ ${bad} مشكلة. صلّحها قبل المرحلة 2.`); process.exit(1); }
console.log('\n✓ كل شي محلي. جاهز.');
