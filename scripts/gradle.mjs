// يشغّل gradlew على ويندوز/ماك/لينكس، ويعرض مكان الملف الناتج
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const tasks = process.argv.slice(2);
const win = process.platform === 'win32';
const r = spawnSync(win ? 'gradlew.bat' : './gradlew', tasks, { cwd: 'android', stdio: 'inherit', shell: win });
if (r.status !== 0) { console.error('\n✗ فشل البناء. انسخ آخر 30 سطر من الخطأ وارسلها.'); process.exit(r.status || 1); }

const outs = ['android/app/build/outputs/apk', 'android/app/build/outputs/bundle'];
const found = [];
const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : /\.(apk|aab)$/.test(n) && found.push(p); } };
outs.forEach(walk);
console.log('\n✓ الملفات الناتجة:');
for (const f of found) console.log(`  ${f}  (${(statSync(f).size / 1048576).toFixed(1)} MB)`);
if (found.some(f => f.includes('unsigned'))) console.log('\n⚠ النسخة غير موقّعة، ما تنثبّت. شغّل: npm run keystore');
