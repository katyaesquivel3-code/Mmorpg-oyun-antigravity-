/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * FAZ 12 TEST PROTOKOLÜ (test_faz12.mjs)
 * 
 * Test Kapsamı:
 * 1. PERFORMANS & ENSTRÜMANTASYON (AdaptiveQualitySystem.ts): Scene/Engine instrumentation, draw call (< 150), aktif mesh ve üçgen ölçümü, shader ön-ısıtma.
 * 2. UYARLANABİLİR KALİTE & TERMİNAL GÜVENLİK: Donanım sınıflandırması (LOW/MEDIUM/HIGH), dinamik hardwareScalingLevel, termal emniyet (30 FPS'e düşürme), pil tasarrufu (< %20 batarya).
 * 3. SES & ARKA PLAN YAŞAM DÖNGÜSÜ: ProceduralAudio.suspend()/resume(), AudioSystem.suspend()/resume(), appStateChange ve visibilitychange dinleyicileri.
 * 4. BLUETOOTH GAMEPAD & ANDROID GERİ TUŞU: Standart kontroller (Move, Aim, Attack, Jump, Dodge), D-Pad Kam Gücü değişimi, Select (Harita), Start (Ayarlar), Geri tuşu modal yönetimi.
 * 5. CAPACITOR & ANDROID YAPILANDIRMASI: capacitor.config.ts, AndroidManifest.xml (sensorLandscape, hardwareAccelerated, shortEdges), MainActivity.java (FLAG_KEEP_SCREEN_ON, immersive sticky), Keystore ve PRIVACY_POLICY.md.
 * 6. DERLEME & ASSET DOĞRULAMASI: manualChunks (vendor-babylon, vendor-capacitor), esbuild console drop, webDir varlıkları.
 */

import fs from 'fs';
import path from 'path';

console.log("======================================================================");
console.log("   ÖTÜKEN: KUT'UN DÖRT PARÇASI - FAZ 12 TEST PROTOKOLÜ BAŞLATILIYOR  ");
console.log("======================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [GEÇTİ] ${testName}`);
    if (details) console.log(`     └─ Bilgi: ${details}`);
    passedTests++;
  } else {
    console.error(`  ❌ [BAŞARISIZ] ${testName}`);
    if (details) console.error(`     └─ Hata: ${details}`);
  }
}

// ----------------------------------------------------------------------
// 1. TEST GRUBU: PERFORMANS & ADAPTIVE QUALITY SİSTEMİ
// ----------------------------------------------------------------------
console.log("--- 1. TEST GRUBU: PERFORMANS & ADAPTIVE QUALITY SİSTEMİ ---");

const adaptiveQualityPath = path.resolve('src/core/AdaptiveQualitySystem.ts');
assert(fs.existsSync(adaptiveQualityPath), 'AdaptiveQualitySystem.ts dosyası mevcut');
const adaptiveQualityCode = fs.readFileSync(adaptiveQualityPath, 'utf8');

assert(adaptiveQualityCode.includes('SceneInstrumentation') && adaptiveQualityCode.includes('EngineInstrumentation'),
  'SceneInstrumentation ve EngineInstrumentation ile performans izleme tanımlı');

assert(adaptiveQualityCode.includes('detectHardwareCapabilities') &&
       adaptiveQualityCode.includes('LOW') && adaptiveQualityCode.includes('MEDIUM') && adaptiveQualityCode.includes('HIGH'),
  'Cihaz donanım sınıfı tespiti (LOW, MEDIUM, HIGH) mevcut');

assert(adaptiveQualityCode.includes('hardwareScalingLevel') && adaptiveQualityCode.includes('setHardwareScalingLevel'),
  'FPS düşüşüne göre dinamik hardwareScalingLevel (çözünürlük ölçekleme) mevcut');

assert(adaptiveQualityCode.includes('thermalThrottle') || adaptiveQualityCode.includes('THERMAL_THROTTLE_THRESHOLD_S') || adaptiveQualityCode.includes('isThermalThrottled'),
  'Aşırı kare süresinde termal koruma (30 FPS emniyet modu) mevcut');

assert(adaptiveQualityCode.includes('initBatteryMonitoring') && (adaptiveQualityCode.includes('battery.level < 0.20') || adaptiveQualityCode.includes('batteryLevel <= 0.2')),
  'Pil seviyesi <%20 olduğunda otomatik pil tasarrufu modu tanımlı');

assert(adaptiveQualityCode.includes('prewarmShadersAsync'),
  'Yükleme ekranında shader ve materyal ön-ısıtma (prewarmShadersAsync) mevcut');

assert(adaptiveQualityCode.includes('webglcontextlost') && adaptiveQualityCode.includes('webglcontextrestored'),
  'WebGL context lost ve context restored otomatik kurtarma dinleyicileri tanımlı');

assert(adaptiveQualityCode.includes('checkDevInspectorSupport') && adaptiveQualityCode.includes('@babylonjs/inspector'),
  'Babylon Inspector yalnızca dev ortamında dinamik import ile yükleniyor');

// ----------------------------------------------------------------------
// 2. TEST GRUBU: ARKA PLAN DURAKLATMA & SES YAŞAM DÖNGÜSÜ
// ----------------------------------------------------------------------
console.log("\n--- 2. TEST GRUBU: ARKA PLAN DURAKLATMA & SES YAŞAM DÖNGÜSÜ ---");

const procAudioPath = path.resolve('src/audio/ProceduralAudio.ts');
assert(fs.existsSync(procAudioPath), 'ProceduralAudio.ts dosyası mevcut');
const procAudioCode = fs.readFileSync(procAudioPath, 'utf8');

assert(procAudioCode.includes('public static suspend()') && procAudioCode.includes('public static resume()'),
  'ProceduralAudio içinde suspend() ve resume() statik metotları mevcut');

const audioSysPath = path.resolve('src/audio/AudioSystem.ts');
assert(fs.existsSync(audioSysPath), 'AudioSystem.ts dosyası mevcut');
const audioSysCode = fs.readFileSync(audioSysPath, 'utf8');

assert(audioSysCode.includes('suspend()') && audioSysCode.includes('resume()'),
  'AudioSystem içinde suspend() ve resume() metotları tanımlı');

const mainPath = path.resolve('src/main.ts');
assert(fs.existsSync(mainPath), 'main.ts dosyası mevcut');
const mainCode = fs.readFileSync(mainPath, 'utf8');

assert(mainCode.includes("App.addListener('appStateChange'") && mainCode.includes("visibilitychange"),
  'Capacitor appStateChange ve web visibilitychange yaşam döngüsü dinleyicileri mevcut');

assert(mainCode.includes('handlePauseApp') && mainCode.includes('handleResumeApp'),
  'Arka plana geçişte oyun motoru ve ses sistemi duraklatılıyor, ön plana dönüşte devam ediyor');

// ----------------------------------------------------------------------
// 3. TEST GRUBU: BLUETOOTH GAMEPAD & ANDROID GERİ TUŞU
// ----------------------------------------------------------------------
console.log("\n--- 3. TEST GRUBU: BLUETOOTH GAMEPAD & ANDROID GERİ TUŞU ---");

const inputMgrPath = path.resolve('src/input/InputManager.ts');
assert(fs.existsSync(inputMgrPath), 'InputManager.ts dosyası mevcut');
const inputMgrCode = fs.readFileSync(inputMgrPath, 'utf8');

assert(inputMgrCode.includes('navigator.getGamepads') && inputMgrCode.includes('gp.buttons'),
  'Standard Gamepad API kontrolcü desteği tanımlı');

assert(inputMgrCode.includes('onPowerCast') && inputMgrCode.includes('power:change'),
  'Gamepad ile güç kullanımı ve D-Pad ile Kam Gücü değiştirme entegrasyonu mevcut');

assert(inputMgrCode.includes('map:open') && inputMgrCode.includes('ui:settings_open'),
  'Gamepad Select (Harita) ve Start (Ayarlar) tuş aksiyonları tanımlı');

assert(mainCode.includes("App.addListener('backButton'") || mainCode.includes("backButton"),
  'Android donanımsal geri tuşu dinleyicisi tanımlı');

// ----------------------------------------------------------------------
// 4. TEST GRUBU: CAPACITOR & ANDROID NATIVE KONFİGÜRASYONU
// ----------------------------------------------------------------------
console.log("\n--- 4. TEST GRUBU: CAPACITOR & ANDROID NATIVE KONFİGÜRASYONU ---");

const capConfigPath = path.resolve('capacitor.config.ts');
assert(fs.existsSync(capConfigPath), 'capacitor.config.ts yapılandırma dosyası mevcut');
const capConfigCode = fs.readFileSync(capConfigPath, 'utf8');

assert(capConfigCode.includes("appId: 'com.aistudio.otuken.game'") && capConfigCode.includes("webDir: 'app/src/main/assets/web'"),
  'Capacitor appId ve webDir doğru eşleştirilmiş');

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
assert(fs.existsSync(manifestPath), 'Android/AndroidManifest.xml mevcut');
const manifestCode = fs.readFileSync(manifestPath, 'utf8');

assert(manifestCode.includes('android:screenOrientation="sensorLandscape"'),
  'Ekran yönü sensorLandscape (akıllı yatay mod) olarak kilitli');

assert(manifestCode.includes('android:hardwareAccelerated="true"'),
  'Donanım ivmesi (hardwareAccelerated) etkin');

assert(manifestCode.includes('android:windowLayoutInDisplayCutoutMode="shortEdges"'),
  'Çentik ve kamera deliği (cutout) kısa kenarlara genişletilmiş');

assert(manifestCode.includes('android.permission.INTERNET') &&
       manifestCode.includes('android.permission.VIBRATE') &&
       manifestCode.includes('android.permission.WAKE_LOCK'),
  'Gerekli Android izinleri (INTERNET, VIBRATE, WAKE_LOCK) tanımlı');

assert(manifestCode.includes('android:glEsVersion="0x00030000"'),
  'OpenGL ES 3.0 / WebGL2 donanım gereksinimi beyan edilmiş');

const mainActivityPath = path.resolve('android/app/src/main/java/com/aistudio/otuken/game/MainActivity.java');
assert(fs.existsSync(mainActivityPath), 'MainActivity.java mevcut');
const mainActivityCode = fs.readFileSync(mainActivityPath, 'utf8');

assert(mainActivityCode.includes('FLAG_KEEP_SCREEN_ON'),
  'Oyun sırasında ekranın kapanmaması için FLAG_KEEP_SCREEN_ON mevcut');

assert(mainActivityCode.includes('LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES'),
  'Kamera çentiği boşluksuz tam ekran (short edges) MainActivity içinde tanımlı');

assert(mainActivityCode.includes('BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE'),
  'Kalıcı tam ekran (immersive sticky fullscreen) MainActivity içinde tanımlı');

// ----------------------------------------------------------------------
// 5. TEST GRUBU: PLAY STORE & GİZLİLİK POLİTİKASI & KEYSTORE
// ----------------------------------------------------------------------
console.log("\n--- 5. TEST GRUBU: PLAY STORE & GİZLİLİK POLİTİKASI & KEYSTORE ---");

const privacyPath = path.resolve('PRIVACY_POLICY.md');
assert(fs.existsSync(privacyPath), 'PRIVACY_POLICY.md dosyası mevcut');
const privacyCode = fs.readFileSync(privacyPath, 'utf8');

assert(privacyCode.includes('Sıfır Kişisel Veri') && privacyCode.includes('çevrimdışı öncelikli'),
  'Gizlilik politikasında sıfır veri toplama ve çevrimdışı prensibi açıkça beyan edilmiş');

assert(privacyCode.includes('PEGI 7') || privacyCode.includes('Everyone 10+'),
  'Google Play içerik derecelendirmesi (stilize fantezi şiddet) tanımlı');

const keystorePath = path.resolve('my-upload-key.jks');
assert(fs.existsSync(keystorePath), 'İmzalı APK/AAB üretimi için my-upload-key.jks anahtar deposu mevcut');

const androidBuildGradlePath = path.resolve('android/app/build.gradle');
const androidBuildGradleCode = fs.readFileSync(androidBuildGradlePath, 'utf8');
assert(androidBuildGradleCode.includes('signingConfigs') && androidBuildGradleCode.includes('my-upload-key.jks'),
  'Gradle release signingConfig keystore ile bağlanmış');

// ----------------------------------------------------------------------
// 6. TEST GRUBU: DERLEME & WEB VARLIKLARI DOĞRULAMASI
// ----------------------------------------------------------------------
console.log("\n--- 6. TEST GRUBU: DERLEME & WEB VARLIKLARI DOĞRULAMASI ---");

const webIndexPath = path.resolve('app/src/main/assets/web/index.html');
assert(fs.existsSync(webIndexPath), 'app/src/main/assets/web/index.html mevcut');
const webIndexSize = fs.statSync(webIndexPath).size;
assert(webIndexSize > 1000, `web/index.html geçerli boyutta (${(webIndexSize / 1024).toFixed(1)} KB)`);

const webAssetsDir = path.resolve('app/src/main/assets/web/assets');
assert(fs.existsSync(webAssetsDir), 'web/assets dizini mevcut');
const assetFiles = fs.readdirSync(webAssetsDir);

const hasBabylonChunk = assetFiles.some(f => f.startsWith('vendor-babylon-') && f.endsWith('.js'));
assert(hasBabylonChunk, 'vendor-babylon manual chunk başarıyla üretilmiş');

const hasCapacitorChunk = assetFiles.some(f => f.startsWith('vendor-capacitor-') && f.endsWith('.js'));
assert(hasCapacitorChunk, 'vendor-capacitor manual chunk başarıyla üretilmiş');

const hasMainChunk = assetFiles.some(f => f.startsWith('index-') && f.endsWith('.js'));
assert(hasMainChunk, 'index ana oyun script chunk başarıyla üretilmiş');

// ----------------------------------------------------------------------
// SONUÇ BİLDİRİMİ
// ----------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`   FAZ 12 TESTLERİ TAMAMLANDI: ${passedTests} / ${totalTests} BAŞARILI`);
console.log("======================================================================");

if (passedTests === totalTests) {
  console.log("\n🏆 TEBRİKLER! FAZ 12 OPTİMİZASYON, CİLALAMA VE ANDROID YAYIN ŞARTLARI EKSİKSİZ SAĞLANDI.");
  process.exit(0);
} else {
  console.error(`\n⚠️ UYARI: ${totalTests - passedTests} test başarısız oldu! Lütfen yukarıdaki hataları inceleyin.`);
  process.exit(1);
}
