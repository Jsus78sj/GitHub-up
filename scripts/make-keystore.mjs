// ينشئ مفتاح التوقيع مرة وحدة بس. احتفظ بالملف وكلمة السر: لو ضاعت ما تقدر تحدّث التطبيق أبداً.
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';

const KS = resolve('keys/nexus-release.jks');
if (existsSync(KS)) { console.log('✓ المفتاح موجود من قبل: ' + KS + '\n  (ما راح أنشئ واحد جديد عشان ما يضيع القديم)'); process.exit(0); }

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pass = await rl.question('كلمة سر للمفتاح (6 أحرف أو أكثر، احفظها!): ');
const name = (await rl.question('اسمك أو اسم الناشر: ')) || 'akllk';
rl.close();
if (pass.length < 6) { console.error('✗ كلمة السر قصيرة'); process.exit(1); }

mkdirSync('keys', { recursive: true });
const r = spawnSync('keytool', ['-genkeypair', '-v', '-keystore', KS, '-alias', 'nexus', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-storepass', pass, '-keypass', pass, '-dname', `CN=${name}, O=GitHub Nexus, C=YE`], { stdio: 'inherit', shell: process.platform === 'win32' });
if (r.status !== 0) { console.error('✗ keytool ما اشتغل. تأكد إن JDK مثبت (يجي مع Android Studio) وإنه في PATH.'); process.exit(1); }

mkdirSync('android', { recursive: true });
writeFileSync('android/keystore.properties', `storeFile=${KS.replace(/\\/g, '/')}\nstorePassword=${pass}\nkeyAlias=nexus\nkeyPassword=${pass}\n`);
console.log('\n✓ تم: ' + KS);
console.log('✓ android/keystore.properties (لا ترفعه على GitHub، موجود في .gitignore)');
console.log('\nللبناء على GitHub Actions، ضيف هذي في Settings ← Secrets ← Actions:');
console.log('  NEXUS_KEYSTORE_BASE64  = (محتوى الأمر التالي)');
console.log(process.platform === 'win32'
  ? `    powershell "[Convert]::ToBase64String([IO.File]::ReadAllBytes('${KS}'))"`
  : `    base64 -w0 "${KS}"   (ماك: base64 -i "${KS}")`);
console.log('  NEXUS_KEYSTORE_PASSWORD = كلمة السر');
console.log('  NEXUS_KEY_ALIAS = nexus');
console.log('  NEXUS_KEY_PASSWORD = كلمة السر');
console.log('\n⚠ انسخ مجلد keys/ لمكان آمن (فلاشة / Google Drive) الحين.');
