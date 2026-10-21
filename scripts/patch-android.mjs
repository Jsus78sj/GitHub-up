// يجهّز مشروع أندرويد للنشر (يتشغل تلقائياً قبل كل build، وآمن تشغيله أكثر من مرة)
// - رقم النسخة من package.json
// - توقيع release من android/keystore.properties أو من متغيرات البيئة (GitHub Actions)
// - تصغير الكود (R8) + قواعد حماية Capacitor
// - منع النسخ الاحتياطي (التوكن المشفّر ما ينفك على جهاز ثاني فيسبب أخطاء)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const [ma, mi, pa] = pkg.version.split('.').map(Number);
const versionCode = ma * 10000 + mi * 100 + pa;
const GRADLE = 'android/app/build.gradle';
const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const PROGUARD = 'android/app/proguard-rules.pro';

if (!existsSync(GRADLE)) { console.error('✗ ما فيه مجلد android. شغّل: npm run android:init'); process.exit(1); }

let g = readFileSync(GRADLE, 'utf8');
g = g.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
     .replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);

if (!g.includes('// NEXUS-SIGNING')) {
    const header = `// NEXUS-SIGNING
def nexusProps = new Properties()
def nexusPropsFile = rootProject.file("keystore.properties")
if (nexusPropsFile.exists()) { nexusPropsFile.withInputStream { nexusProps.load(it) } }
def nexusSecret = { String k, String env -> (System.getenv(env) ?: nexusProps.getProperty(k)) }
def nexusStore = nexusSecret("storeFile", "NEXUS_KEYSTORE_PATH")
def nexusCanSign = nexusStore != null && file(nexusStore).exists()

`;
    g = g.replace(/^android\s*\{/m, header + 'android {');
    g = g.replace(/(\n\s*)buildTypes\s*\{/, `$1signingConfigs {
        release {
            if (nexusCanSign) {
                storeFile file(nexusStore)
                storePassword nexusSecret("storePassword", "NEXUS_KEYSTORE_PASSWORD")
                keyAlias nexusSecret("keyAlias", "NEXUS_KEY_ALIAS")
                keyPassword nexusSecret("keyPassword", "NEXUS_KEY_PASSWORD")
            }
        }
    }$1buildTypes {`);
    g = g.replace(/(release\s*\{\s*\n\s*)minifyEnabled\s+false/, `$1minifyEnabled true
            shrinkResources true
            if (nexusCanSign) { signingConfig signingConfigs.release }`);
    g = g.replace("getDefaultProguardFile('proguard-android.txt')", "getDefaultProguardFile('proguard-android-optimize.txt')");
}
writeFileSync(GRADLE, g);

if (existsSync(MANIFEST)) {
    let m = readFileSync(MANIFEST, 'utf8');
    m = m.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
    if (!/android:allowBackup=/.test(m)) m = m.replace('<application', '<application\n        android:allowBackup="false"');
    if (!/android:usesCleartextTraffic=/.test(m)) m = m.replace('<application', '<application\n        android:usesCleartextTraffic="false"');
    writeFileSync(MANIFEST, m);
}

const rules = `
# NEXUS-RULES: Capacitor يستخدم reflection للـ plugins
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.capacitorjs.** { *; }
-keep class com.whitestein.securestorage.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
`;
let pr = existsSync(PROGUARD) ? readFileSync(PROGUARD, 'utf8') : '';
if (!pr.includes('NEXUS-RULES')) writeFileSync(PROGUARD, pr + rules);

const signing = existsSync('android/keystore.properties') || process.env.NEXUS_KEYSTORE_PATH;
console.log(`✓ android جاهز · v${pkg.version} (code ${versionCode}) · ${signing ? 'توقيع release مفعّل' : '⚠ بدون مفتاح توقيع (شغّل npm run keystore)'}`);
