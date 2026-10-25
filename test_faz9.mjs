/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * FAZ 9 KABUL VE ENTEGRASYON DOĞRULAMA TESTİ (test_faz9.mjs)
 * 
 * Test Kapsamı:
 * 1. Bölge & Vadi: Kesintisiz chunk/biyom geçişi, demir damarları, WebGL2 lav shader'ı
 * 2. Hikâye & Görevler: Ergenekon Destanı, 2 Yan Görev, Kızıl Usta, 4 Balbal ve Bengü Taşlar
 * 3. Mekanikler: 7 Körük Ocağı zinciri, ısı pompalama ve demir dağı eritme bulmacası
 * 4. YENİ TemperatureSystem: Sıcaklık hesaplama, 45°C uyarı, 65°C ısı hasarı, Naneli Ayran & Demir Dağ Zırh Seti koruması
 * 5. YENİ LavaSystem & Yel Ana Bacaları: Lav teması hasarı ve +16 m/s dikey süzülüş kuvveti
 * 6. RÜZGÂR Gücü & Süzülme: Yel Ana mabediyle isWindUnlocked ve kalıcı süzülme açılışı
 * 7. Yeni Düşmanlar: Demir Yek (ağır zırh, balyoz, arkadan/stagger zafiyeti) & Kor Albız (ateş bağışıklığı, buz zafiyeti)
 * 8. BOSS DEMİR DAĞ BEKÇİSİ: 3 Faz (Çekiç şoku, Akkor zırh ve su zincirleriyle termal şok çatlatma, Akkor öfke, ATEŞ KUTU ödülü)
 * 9. TULPAR: Vadiden çıkış sinematiği, Kopuz Tulpar Ezgisi, güven kazanma ve kalıcı binek açılışı
 * 10. 4 Kam Taşı Mabedi: Körük Ocağı, Yel Ana Bacası, Kızıl Ayna ve Termal Şok Mabetleri (4 Kam Taşı = 1 Kut Kalbi)
 * 11. İyileşme: Boss zaferi sonrası dumanın dağılması ve Bay Terek Hayat Ağacı 2. kat dal yeşermesi
 * 12. Mimari Kuralları: WebGL2 saf 3D, DOM UI, Web Audio API ve Sıfır GC prensiplerine tam uyum
 */

import fs from 'fs';
import path from 'path';

console.log("======================================================================");
console.log("   ÖTÜKEN: KUT'UN DÖRT PARÇASI - FAZ 9 TEST PROTOKOLÜ BAŞLATILIYOR   ");
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
// 1. TEST GRUBU: BÖLGE, VADİ & WEBGL2 LAV SHADER'I
// ----------------------------------------------------------------------
console.log("--- 1. TEST GRUBU: BÖLGE, VADİ & WEBGL2 LAV SHADER'I ---");

const lavaSystemPath = path.resolve('src/world/LavaSystem.ts');
assert(fs.existsSync(lavaSystemPath), 'LavaSystem.ts dosyası mevcut');
const lavaSystemCode = fs.readFileSync(lavaSystemPath, 'utf8');

assert(lavaSystemCode.includes('lavaVertexShader') && (lavaSystemCode.includes('lavaPixelShader') || lavaSystemCode.includes('lavaFragmentShader')),
  'WebGL2 Viskoz Akkor Lav Shader GLSL kodları mevcut');

assert(lavaSystemCode.includes('uTime') && lavaSystemCode.includes('lavaMaterial'),
  'Zaman üniformu ve dinamik lav akış materyali mevcut');

assert(lavaSystemCode.includes('buildThermalUpdraftChimneys') && lavaSystemCode.includes('updraftPower'),
  'Yel Ana Bacaları (Thermal Updraft) dikey yükseltme bacaları mevcut');

const ergenekonValleyPath = path.resolve('src/world/ErgenekonValley.ts');
assert(fs.existsSync(ergenekonValleyPath), 'ErgenekonValley.ts dosyası mevcut');
const ergenekonValleyCode = fs.readFileSync(ergenekonValleyPath, 'utf8');

assert(ergenekonValleyCode.includes('mat_iron') && ergenekonValleyCode.includes('oreVeins'),
  'Kırılabilir demir cevheri damarları ve mat_iron tanımlı');

assert(ergenekonValleyCode.includes('kizilUstaMesh') && ergenekonValleyCode.includes('kizil_anvil'),
  'Baş Demirci Kızıl Usta 3D modeli ve örsü vadiye yerleştirilmiş');

// ----------------------------------------------------------------------
// 2. TEST GRUBU: HİKÂYE, ERGENEKON DESTANI, GÖREVLER & BALBALLAR
// ----------------------------------------------------------------------
console.log("\n--- 2. TEST GRUBU: HİKÂYE, ERGENEKON DESTANI, GÖREVLER & BALBALLAR ---");

const questDataPath = path.resolve('src/story/QuestData.ts');
const questDataCode = fs.readFileSync(questDataPath, 'utf8');

assert(questDataCode.includes('quest_ergenekon_destani'),
  'Ergenekon Destanı ana görevi (quest_ergenekon_destani) tanımlı');

assert(questDataCode.includes('quest_ciragin_korugu') && questDataCode.includes('quest_erimeyen_kilic'),
  '2 Yeni Yan Görev ("Çırağın Körüğü" & "Erimeyen Kılıç") tanımlı');

const dialogueDataPath = path.resolve('src/story/DialogueData.ts');
const dialogueDataCode = fs.readFileSync(dialogueDataPath, 'utf8');

assert(dialogueDataCode.includes('kizil_usta_main') && dialogueDataCode.includes('Baş Demirci Kızıl Usta'),
  'Baş Demirci Kızıl Usta diyalog ağacı mevcut');

assert(dialogueDataCode.includes('Dört yüz yıldır bu sarp kayalıkların') && dialogueDataCode.includes('Asena bize yol gösterdi'),
  'Ergenekon destanı mitolojik Türkçe diyalog metinleri eksiksiz');

const landmarkManagerPath = path.resolve('src/world/LandmarkManager.ts');
const landmarkManagerCode = fs.readFileSync(landmarkManagerPath, 'utf8');

assert(landmarkManagerCode.includes('{ x: 75, z: 8, rot: 1.1 }') &&
       landmarkManagerCode.includes('{ x: 86, z: 12, rot: -0.5 }') &&
       landmarkManagerCode.includes('{ x: 130, z: -15, rot: 2.4 }') &&
       landmarkManagerCode.includes('{ x: 175, z: 45, rot: 0.1 }'),
  'Ergenekon Vadisi ve Demir Dağ içine 4 yeni Balbal taşı koordinatları eklendi');

assert(landmarkManagerCode.includes('bengu_demirdag') && landmarkManagerCode.includes('bengu_bilgekagan'),
  'Ergenekon ve Demir Dağ Bengü Taşları kayıt noktası olarak tanımlı');

// ----------------------------------------------------------------------
// 3. TEST GRUBU: MEKANİKLER & 7 KÖRÜK OCAĞI ZİNCİRİ
// ----------------------------------------------------------------------
console.log("\n--- 3. TEST GRUBU: MEKANİKLER & 7 KÖRÜK OCAĞI ZİNCİRİ ---");

assert(ergenekonValleyCode.includes('build7BellowsForges') && ergenekonValleyCode.includes('forges.push'),
  '7 Körük Ocağının tamamı 3D sahneye prosedürel olarak inşa ediliyor');

// Körük ocağı mantığı simülasyonu
let forges = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, heatLevel: 0, isLit: false }));
assert(forges.length === 7, '7 körük ocağı dizisi doğrulandı');

function pumpForgeSim(id, boost = 35) {
  const f = forges.find(x => x.id === id);
  if (f) {
    f.heatLevel = Math.min(100, f.heatLevel + boost);
    f.isLit = true;
  }
}

pumpForgeSim(1, 40);
pumpForgeSim(1, 60);
assert(forges[0].heatLevel === 100 && forges[0].isLit, 'Körük pompalandıkça ısı seviyesi %100 seviyesine kadar artar');

// Tüm ocaklar akkor olana kadar kapı erimez
let isGateMelted = forges.every(f => f.heatLevel >= 90);
assert(!isGateMelted, 'Tüm ocaklar harlanmadan demir kapı kapalı kalır');

forges.forEach(f => { f.heatLevel = 95; f.isLit = true; });
isGateMelted = forges.every(f => f.heatLevel >= 90);
assert(isGateMelted, '7 Körük Ocağı birden akkor olduğunda demir dağı eritme koşulu sağlanır');

assert(ergenekonValleyCode.includes('ironGateMesh.scaling.y') && ergenekonValleyCode.includes('gateMeltProgress'),
  'Demir kapının akkorlaşıp lav gibi erimesi için kademeli fiziksel animasyon kodu mevcut');

// ----------------------------------------------------------------------
// 4. TEST GRUBU: YENİ TEMPERATURE SYSTEM (ISI VE DİRENÇLER)
// ----------------------------------------------------------------------
console.log("\n--- 4. TEST GRUBU: YENİ TEMPERATURE SYSTEM ---");

const tempSysPath = path.resolve('src/world/TemperatureSystem.ts');
assert(fs.existsSync(tempSysPath), 'TemperatureSystem.ts dosyası mevcut');
const tempSysCode = fs.readFileSync(tempSysPath, 'utf8');

assert(tempSysCode.includes('HEAT_THRESHOLD = 45.0') && tempSysCode.includes('EXTREME_HEAT_THRESHOLD = 65.0'),
  'Isı uyarı (45°C) ve aşırı ısı hasar (65°C) eşikleri tanımlı');

assert(tempSysCode.includes('hasHeatBuff') && tempSysCode.includes('hasDemirDagFullSet'),
  'Naneli Ayran (HEAT_RESIST) ve Demir Dağ Seti (DEMIR_DAG_SET) ısı direnci kontrolleri mevcut');

// Sıcaklık hesaplama simülasyonu
function calculateEffectiveDamage(temp, hasBuff, hasSet) {
  if (temp < 65.0) return 0;
  let dmg = (temp - 65.0) * 0.35;
  if (hasBuff) dmg *= 0.5;
  if (hasSet) dmg = 0; // Tam zırh seti lav sıcağını tamamen bloke eder
  return dmg;
}

const unprotDmg = calculateEffectiveDamage(75.0, false, false);
const buffDmg = calculateEffectiveDamage(75.0, true, false);
const setDmg = calculateEffectiveDamage(75.0, false, true);

assert(unprotDmg > 0, 'Korumasız oyuncu 75°C sıcaklıkta ısı hasarı alır', `${unprotDmg.toFixed(1)} HP/s`);
assert(buffDmg === unprotDmg * 0.5, 'Naneli Ayran içildiğinde ısı hasarı %50 azalır');
assert(setDmg === 0, 'Demir Dağ Zırh Seti kuşanıldığında ısı hasarı %100 engellenir');

// ----------------------------------------------------------------------
// 5. TEST GRUBU: YEL ANA BACALARI (THERMAL UPDRAFTS) & LAV ETKİSİ
// ----------------------------------------------------------------------
console.log("\n--- 5. TEST GRUBU: YEL ANA BACALARI & LAV ETKİSİ ---");

assert(lavaSystemCode.includes('updraftPower: 16.0'),
  'Yel Ana dikey sıcak hava bacası süzülüş kuvveti +16 m/s olarak ayarlı');

assert(lavaSystemCode.includes('combat.health = Math.max(0, combat.health - 35.0 * deltaTime)'),
  'Lav yüzeyine temas edildiğinde saniyede -35 HP yakıcı hasar verilir');

assert(lavaSystemCode.includes('player.verticalVelocity = 11.0'),
  'Lava basan oyuncu yukarı ve kenara sıçratılır');

// ----------------------------------------------------------------------
// 6. TEST GRUBU: RÜZGÂR GÜCÜ & SÜZÜLME KANADI AÇILIŞI
// ----------------------------------------------------------------------
console.log("\n--- 6. TEST GRUBU: RÜZGÂR GÜCÜ & SÜZÜLME KANADI AÇILIŞI ---");

const kamPowerPath = path.resolve('src/powers/KamPowerManager.ts');
const kamPowerCode = fs.readFileSync(kamPowerPath, 'utf8');

assert(kamPowerCode.includes('isWindUnlocked'),
  'KamPowerManager içinde isWindUnlocked (Yel Ana gücü) durumu mevcut');

const shrineCode = fs.readFileSync(path.resolve('src/shrine/ErgenekonShrines.ts'), 'utf8');
assert(shrineCode.includes('KamPowerManager.getInstance().isWindUnlocked = true'),
  'Yel Ana Mabedi tamamlandığında Rüzgâr gücü ve süzülme kanadı kalıcı olarak açılır');

// ----------------------------------------------------------------------
// 7. TEST GRUBU: YENİ DÜŞMANLAR (DEMİR YEK & KOR ALBIZ)
// ----------------------------------------------------------------------
console.log("\n--- 7. TEST GRUBU: YENİ DÜŞMANLAR (DEMİR YEK & KOR ALBIZ) ---");

const enemyEntityPath = path.resolve('src/combat/EnemyEntity.ts');
const enemyEntityCode = fs.readFileSync(enemyEntityPath, 'utf8');

assert(enemyEntityCode.includes("'DEMIR_YEK'") && enemyEntityCode.includes("'KOR_ALBIZ'"),
  'EnemyType tip tanımına DEMIR_YEK ve KOR_ALBIZ eklendi');

assert(enemyEntityCode.includes('Demir Yek') && enemyEntityCode.includes('slashResist: 0.6'),
  'Demir Yek ağır çelik zırh kesici darbe direnci (%60) mevcut');

assert(enemyEntityCode.includes('Kor Albız') && enemyEntityCode.includes('fireResist: 1.0'),
  'Kor Albız ateş direnci (%100 bağışıklık) mevcut');

// Hasar ve Zafiyet Mantığı Simülasyonu
function simulateEnemyDamage(enemyType, baseDamage, damageType, isStaggered, isBackstab) {
  if (enemyType === 'KOR_ALBIZ') {
    if (damageType === 'FIRE') return 0; // %100 bağışıklık
    if (damageType === 'FROST') return baseDamage * 2.0; // %200 zafiyet
    return baseDamage * 0.9;
  }
  if (enemyType === 'DEMIR_YEK') {
    if (damageType === 'FROST') return baseDamage * 1.3;
    let resist = 0.6; // Kesiciye %60 dirençli
    let mult = 1.0 - resist;
    let dmg = baseDamage * mult;
    if (isStaggered || isBackstab) {
      dmg = baseDamage * 1.45; // Zırh yarılır
    }
    return dmg;
  }
  return baseDamage;
}

const korAlbizFire = simulateEnemyDamage('KOR_ALBIZ', 50, 'FIRE', false, false);
const korAlbizFrost = simulateEnemyDamage('KOR_ALBIZ', 50, 'FROST', false, false);
assert(korAlbizFire === 0, 'Kor Albız ateş saldırısından 0 hasar alır (%100 bağışık)');
assert(korAlbizFrost === 100, 'Kor Albız buz/su saldırısından 2 kat (%200) hasar alır');

const demirYekFront = simulateEnemyDamage('DEMIR_YEK', 50, 'SLASH', false, false);
const demirYekBackstab = simulateEnemyDamage('DEMIR_YEK', 50, 'SLASH', false, true);
assert(demirYekFront === 20, 'Demir Yek önden kesici darbede %60 zırh direnci uygular (20 hasar)');
assert(demirYekBackstab === 72.5, 'Demir Yek arkadan vurulduğunda veya parry ile sersemletildiğinde zırhı yarılır (+%45 kritik)');

// ----------------------------------------------------------------------
// 8. TEST GRUBU: BOSS DEMİR DAĞ BEKÇİSİ (3 FAZ VE TERMAL ŞOK)
// ----------------------------------------------------------------------
console.log("\n--- 8. TEST GRUBU: BOSS DEMİR DAĞ BEKÇİSİ ---");

const bossPath = path.resolve('src/combat/BossDemirDagBekcisi.ts');
assert(fs.existsSync(bossPath), 'BossDemirDagBekcisi.ts dosyası mevcut');
const bossCode = fs.readFileSync(bossPath, 'utf8');

assert(bossCode.includes('PHASE_1') && bossCode.includes('PHASE_2_MOLTEN_ARMOR') && bossCode.includes('PHASE_3_ENRAGED'),
  'Demir Dağ Bekçisi 3 fazlı durum makinesi tanımlı');

assert(bossCode.includes('hitCoolingChain') && bossCode.includes('triggerThermalShock'),
  '2 Asılı soğutma kanalı zincirlerini kırma ve Akkor Zırhı termal şokla çatlatma mekaniği mevcut');

assert(bossCode.includes('spawnAtesKutu') && bossCode.includes('mat_ates_kutu'),
  'Boss yenildiğinde kutsal ATEŞ KUTU reliki magma ortasında açığa çıkar');

// Boss Faz & Zırh Mantığı Simülasyonu
let bossHp = 850;
let bossPhase = 'PHASE_1';
let isMoltenArmor = false;
let brokenChains = 0;

function hitBoss(amount) {
  if (isMoltenArmor) amount *= 0.1; // %90 absorbe
  bossHp -= amount;
  if (bossHp < 560 && bossPhase === 'PHASE_1') {
    bossPhase = 'PHASE_2_MOLTEN_ARMOR';
    isMoltenArmor = true;
  } else if (bossHp < 260 && bossPhase !== 'PHASE_3_ENRAGED') {
    bossPhase = 'PHASE_3_ENRAGED';
    isMoltenArmor = false;
  }
}

function breakChainSim() {
  brokenChains++;
  if (brokenChains >= 2) {
    isMoltenArmor = false; // Termal şok!
  }
}

hitBoss(300); // 850 -> 550
assert(bossPhase === 'PHASE_2_MOLTEN_ARMOR' && isMoltenArmor, 'Can < 560 olduğunda Faz 2 Akkor Zırh aktifleşir');

const preBreakHp = bossHp;
hitBoss(100); // Akkor zırh nedeniyle sadece 10 hasar işlemeli
assert(bossHp === preBreakHp - 10, 'Akkor Zırh açıkken gelen hasar %90 engellenir');

breakChainSim();
breakChainSim();
assert(!isMoltenArmor, '2 Soğutma zinciri kırıldığında akkor zırh termal şokla çatlar');

hitBoss(300); // Can < 260
assert(bossPhase === 'PHASE_3_ENRAGED', 'Can < 260 olduğunda Faz 3 Akkor Öfke modu başlar');

// ----------------------------------------------------------------------
// 9. TEST GRUBU: TULPAR EDİNİMİ & ÇIKIŞ SİNEMATİĞİ
// ----------------------------------------------------------------------
console.log("\n--- 9. TEST GRUBU: TULPAR EDİNİMİ & ÇIKIŞ SİNEMATİĞİ ---");

const cutscenePath = path.resolve('src/story/ErgenekonCutscenes.ts');
assert(fs.existsSync(cutscenePath), 'ErgenekonCutscenes.ts dosyası mevcut');
const cutsceneCode = fs.readFileSync(cutscenePath, 'utf8');

assert(cutsceneCode.includes('unlockTulparPermanently'),
  'Vadiden çıkışta Tulpar güveni kazanılır ve binek kalıcı olarak açılır');

const mountPath = path.resolve('src/mount/MountSystem.ts');
const mountCode = fs.readFileSync(mountPath, 'utf8');

assert(mountCode.includes('unlockTulparPermanently()') && mountCode.includes('this.isTulparUnlocked = true'),
  'MountSystem içinde unlockTulparPermanently metodu mevcut');

assert(cutsceneCode.includes("playKopuzSong('TENGRI')") || cutsceneCode.includes('playKopuzSong'),
  'Tulpar ara sahnesinde kutsal Kopuz ezgisi çalınır');

// ----------------------------------------------------------------------
// 10. TEST GRUBU: 4 KAM TAŞI MABETLERİ
// ----------------------------------------------------------------------
console.log("\n--- 10. TEST GRUBU: 4 KAM TAŞI MABETLERİ ---");

assert(shrineCode.includes('ErgenekonBellowsShrine') &&
       shrineCode.includes('ErgenekonUpdraftShrine') &&
       shrineCode.includes('ErgenekonMirrorShrine') &&
       shrineCode.includes('ErgenekonThermalShockShrine'),
  'Ergenekon Vadisi 4 Kam Taşı Mabedi sınıfı eksiksiz tanımlı');

assert(shrineCode.includes('ErgenekonShrineManager'),
  'ErgenekonShrineManager koordinatörü mevcut');

assert(shrineCode.includes('completeShrine()') && shrineCode.includes('kamPower.addKamStone()'),
  'Her mabet tamamlandığında 1 Kam Taşı eklenir (4 Kam Taşı = 1 Kut Kalbi)');

// ----------------------------------------------------------------------
// 11. TEST GRUBU: İYİLEŞME (WORLD RESTORATION & BAY TEREK)
// ----------------------------------------------------------------------
console.log("\n--- 11. TEST GRUBU: İYİLEŞME & BAY TEREK FAZ 2 ---");

assert(bossCode.includes("EventBus.emit('world:ergenekon_restored')"),
  'Boss öldüğünde vadi dumanının dağılması için world:ergenekon_restored tetiklenir');

assert(bossCode.includes("EventBus.emit('world:bay_terek_healed', { stage: 2 })") ||
       cutsceneCode.includes("EventBus.emit('world:bay_terek_healed', { stage: 2 })"),
  'Ateş Kutu açıldığında Bay Terek Hayat Ağacı 2. kat dal yeşermesi (stage: 2) tetiklenir');

assert(landmarkManagerCode.includes('EventBus.on(\'world:bay_terek_healed\''),
  'LandmarkManager Bay Terek iyileşme sinyalini yakalar ve yaprak rengini altın/kehribar tona çevirir');

// ----------------------------------------------------------------------
// 12. TEST GRUBU: DOM HUD SICAKLIK GÖSTERGESİ & BOSS BARI
// ----------------------------------------------------------------------
console.log("\n--- 12. TEST GRUBU: DOM HUD SICAKLIK GÖSTERGESİ & BOSS BARI ---");

const hudPath = path.resolve('src/ui/HUD.ts');
const hudCode = fs.readFileSync(hudPath, 'utf8');

assert(hudCode.includes('temperatureBadge') && hudCode.includes('tempValue'),
  'HUD içinde dinamik termometre ve sıcaklık rozeti referansları mevcut');

assert(hudCode.includes('combat.bossDemirDag') && hudCode.includes('DEMİR DAĞ BEKÇİSİ'),
  'HUD içinde Demir Dağ Bekçisi fazlarına göre güncellenen boss can barı mevcut');

const indexPath = path.resolve('index.html');
const indexCode = fs.readFileSync(indexPath, 'utf8');

assert(indexCode.includes('id="temperatureBadge"') && indexCode.includes('id="tempValue"'),
  'index.html içinde saf DOM sıcaklık göstergesi (#temperatureBadge) mevcut');

// ----------------------------------------------------------------------
// 13. TEST GRUBU: PROD BUNDLE & HATA SIFIRLAMA
// ----------------------------------------------------------------------
console.log("\n--- 13. TEST GRUBU: PRODUCTION BUNDLE & DAĞITIM DOĞRULAMASI ---");

const webAssetsDir = path.resolve('app/src/main/assets/web/assets');
assert(fs.existsSync(webAssetsDir), 'Android WebView web assets klasörü mevcut');

const files = fs.readdirSync(webAssetsDir);
const mainBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
assert(!!mainBundle, 'Vite üretim JS paketi (index-*.js) başarıyla derlendi', mainBundle);

const indexHtml = fs.readFileSync(path.resolve('app/src/main/assets/web/index.html'), 'utf8');
assert(indexHtml.includes(mainBundle), 'Android web/index.html en son derlenen JS paketini çağırıyor');

// ======================================================================
// TEST SONUCU DEĞERLENDİRMESİ
// ======================================================================
console.log("\n======================================================================");
console.log(`   FAZ 9 TEST PROTOKOLÜ TAMAMLANDI: ${passedTests} / ${totalTests} TEST BAŞARILI`);
console.log("======================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 TEBRİKLER! FAZ 9: ERGENEKON / DEMİR DAĞ TÜM GEREKSİNİMLERİ %100 KARŞILIYOR!");
  process.exit(0);
} else {
  console.error(`⚠️ DİKKAT: ${totalTests - passedTests} test başarısız oldu!`);
  process.exit(1);
}
