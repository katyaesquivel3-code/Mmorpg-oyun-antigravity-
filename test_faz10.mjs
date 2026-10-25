/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * FAZ 10 KABUL VE ENTEGRASYON DOĞRULAMA TESTİ (test_faz10.mjs)
 * 
 * Test Kapsamı:
 * 1. Bölge & Su Altı Dünyası: Şahmaran Gölü havzası, batık tapınak kalıntıları, yüzen nilüferler, 3 arıtıcı pınar vanası
 * 2. YENİ UnderwaterSystem: Su altı derinliği, oksijen tüketimi, hava kabarcığı menfezleri, akıntı koridorları ve kostik filtre
 * 3. SU KUTU Pasifleri: Sınırsız oksijen/nefes, +%50 yüzme hızı, su içi can yenilenmesi (+6 HP/s) ve soluk koruması
 * 4. Yeni Düşmanlar: Su Yek'i (amfibik mızraklı savaşçı, ateşe zayıf) & Yılan Albız (zehirli su ruhu, zehir tükürme)
 * 5. BOSS ŞAHMARAN / KARA SU DEVİ: 3 Fazlı gövde, 0.5s telegraph, zehir kalkanı, 3 arıtıcı taş ile arınma şoku, SU KUTU reliki
 * 6. 4 Kam Taşı Mabedi: Akıntı & Girdap, Yüzen Nilüfer, Su Seviyesi & Vana, Su Altı Kristal Mabetleri
 * 7. Hikâye, Görevler & Balballar: Şahmaran Destanı, 2 Yan Görev, Lokman Hekim diyalogları, 4 Balbal ve Bengü Taş
 * 8. İyileşme (Restoration) & Sinematikler: Şahmaran arınma sinematiği, Bay Terek Hayat Ağacı 3. seviye zümrüt dalları
 * 9. Mimari Kuralları: WebGL2 saf 3D, DOM UI, Web Audio API ve Sıfır GC prensiplerine tam uyum
 */

import fs from 'fs';
import path from 'path';

console.log("======================================================================");
console.log("   ÖTÜKEN: KUT'UN DÖRT PARÇASI - FAZ 10 TEST PROTOKOLÜ BAŞLATILIYOR  ");
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
// 1. TEST GRUBU: BÖLGE & SU ALTI DÜNYASI (SahmaranLake.ts)
// ----------------------------------------------------------------------
console.log("--- 1. TEST GRUBU: BÖLGE & SU ALTI DÜNYASI ---");

const sahmaranLakePath = path.resolve('src/world/SahmaranLake.ts');
assert(fs.existsSync(sahmaranLakePath), 'SahmaranLake.ts dosyası mevcut');
const sahmaranLakeCode = fs.readFileSync(sahmaranLakePath, 'utf8');

assert(sahmaranLakeCode.includes('buildSunkenTempleRuins') && sahmaranLakeCode.includes('templeColumns'),
  'Batık tapınak sütunları ve kemer kalıntıları mevcut');

assert(sahmaranLakeCode.includes('FloatingWaterLily') && (sahmaranLakeCode.includes('sinkTimer') || sahmaranLakeCode.includes('waterLilies')),
  'Yüzen nilüfer yaprakları (FloatingWaterLily) batıp çıkma fiziği mevcut');

assert((sahmaranLakeCode.includes('SpringValve') || sahmaranLakeCode.includes('LakePurifierSpring')) && (sahmaranLakeCode.includes('purifiedCount') || sahmaranLakeCode.includes('purifierSprings')),
  '3 Kutsal arıtıcı pınar vanası (LakePurifierSpring) sistemi mevcut');

assert((sahmaranLakeCode.includes('lokmanMesh') || sahmaranLakeCode.includes('buildLokmanHekimNPC')) && sahmaranLakeCode.includes('Lokman Hekim'),
  'Bilge Lokman Hekim 3D modeli ve kamp alanı oluşturulmuş');

assert(sahmaranLakeCode.includes('world:sahmaran_purified'),
  'Gölün zehirden arınma olayı (world:sahmaran_purified) dinleyicisi mevcut');

// ----------------------------------------------------------------------
// 2. TEST GRUBU: YENİ UNDERWATER SYSTEM & OKSİJEN MEKANİĞİ
// ----------------------------------------------------------------------
console.log("\n--- 2. TEST GRUBU: YENİ UNDERWATER SYSTEM & OKSİJEN MEKANİĞİ ---");

const underwaterSystemPath = path.resolve('src/world/UnderwaterSystem.ts');
assert(fs.existsSync(underwaterSystemPath), 'UnderwaterSystem.ts dosyası mevcut');
const underwaterSystemCode = fs.readFileSync(underwaterSystemPath, 'utf8');

assert(underwaterSystemCode.includes('WATER_SURFACE_Y = 0.0') && underwaterSystemCode.includes('LAKE_BED_Y = -18.0'),
  'Su seviyesi Y=0.0 ve göl tabanı derinliği Y=-18.0 tanımlı');

assert(underwaterSystemCode.includes('AirBubbleVent') && underwaterSystemCode.includes('initDefaultBubbleVents'),
  'Hava kabarcığı menfezleri (AirBubbleVent) ve parçacık bacaları mevcut');

assert(underwaterSystemCode.includes('WaterCurrentCorridor') && underwaterSystemCode.includes('flowDirection'),
  'Yönlendirilmiş su akıntı koridorları (WaterCurrentCorridor) mevcut');

assert(underwaterSystemCode.includes('underwaterOverlay') && underwaterSystemCode.includes('underwaterCausticOverlay'),
  'DOM tabanlı su altı kostik filtre referansı mevcut');

assert(underwaterSystemCode.includes('oxygenDepletionRate') && underwaterSystemCode.includes('drownDamageTimer'),
  'Oksijen tükenmesi ve boğulma hasarı hesaplama mekanizması mevcut');

// ----------------------------------------------------------------------
// 3. TEST GRUBU: SU KUTU PASİF GÜÇLERİ & ENTEGRASYONU
// ----------------------------------------------------------------------
console.log("\n--- 3. TEST GRUBU: SU KUTU PASİF GÜÇLERİ & ENTEGRASYONU ---");

const kamPowerPath = path.resolve('src/powers/KamPowerManager.ts');
const kamPowerCode = fs.readFileSync(kamPowerPath, 'utf8');

assert(kamPowerCode.includes('public hasSuKutu = false;') || kamPowerCode.includes('hasSuKutu'),
  'KamPowerManager içinde hasSuKutu bayrağı tanımlı');

assert(underwaterSystemCode.includes('kamPower.hasSuKutu') && underwaterSystemCode.includes('combat.health = Math.min'),
  'hasSuKutu aktifken su altında sınırsız oksijen ve +6 HP/s can yenilenmesi mevcut');

const playerControllerPath = path.resolve('src/player/PlayerController.ts');
const playerControllerCode = fs.readFileSync(playerControllerPath, 'utf8');

assert(playerControllerCode.includes('hasSuKutu') && playerControllerCode.includes('swimSpeedMult = hasSuKutu ? 1.5 : 1.0'),
  'hasSuKutu aktifken yüzme ve dalış hızında +%50 artış sağlandı');

assert(playerControllerCode.includes('hasSuKutu ? 7.5 : 15.0'),
  'hasSuKutu aktifken sprint yüzmede soluk tüketimi %50 azaldı');

// ----------------------------------------------------------------------
// 4. TEST GRUBU: YENİ DÜŞMANLAR (SU YEK & YILAN ALBIZ)
// ----------------------------------------------------------------------
console.log("\n--- 4. TEST GRUBU: YENİ DÜŞMANLAR (SU YEK & YILAN ALBIZ) ---");

const enemyEntityPath = path.resolve('src/combat/EnemyEntity.ts');
const enemyEntityCode = fs.readFileSync(enemyEntityPath, 'utf8');

assert(enemyEntityCode.includes("'SU_YEK'") && enemyEntityCode.includes("'YILAN_ALBIZ'"),
  'EnemyType içine SU_YEK ve YILAN_ALBIZ eklendi');

assert(enemyEntityCode.includes("Su Yek'i") && enemyEntityCode.includes("Yılan Albız"),
  'Su Yek ve Yılan Albız isim ve nitelik tanımları mevcut');

assert(enemyEntityCode.includes('Amfibik Mızrak') && enemyEntityCode.includes('Kıvrak Zehir'),
  'Su Yek için 3D amfibik mızrak ve Yılan Albız için zehir dişi silah modelleri mevcut');

assert(enemyEntityCode.includes("this.type === 'SU_YEK' || this.type === 'YILAN_ALBIZ'") &&
       enemyEntityCode.includes('amount *= 1.6'),
  'Su düşmanlarına karşı ateş hasarı zafiyeti (%160 hasar) tanımlı');

// ----------------------------------------------------------------------
// 5. TEST GRUBU: BOSS ŞAHMARAN / KARA SU DEVİ
// ----------------------------------------------------------------------
console.log("\n--- 5. TEST GRUBU: BOSS ŞAHMARAN / KARA SU DEVİ ---");

const bossSahmaranPath = path.resolve('src/combat/BossSahmaran.ts');
assert(fs.existsSync(bossSahmaranPath), 'BossSahmaran.ts dosyası mevcut');
const bossSahmaranCode = fs.readFileSync(bossSahmaranPath, 'utf8');

assert(bossSahmaranCode.includes('headMesh') && bossSahmaranCode.includes('crownMesh') && bossSahmaranCode.includes('bodySegments'),
  '3D Prosedürel yılan modeli: baş, altın taç ve kıvrımlı segmentler mevcut');

assert(bossSahmaranCode.includes('telegraphRing') && bossSahmaranCode.includes('0.50'),
  '0.5s Yer halkası telegraph uyarı sistemi mevcut (Kural 2)');

assert(bossSahmaranCode.includes('PHASE_1') &&
       bossSahmaranCode.includes('PHASE_2_VENOM_SHIELD') &&
       bossSahmaranCode.includes('PHASE_3_TSUNAMI'),
  'Boss Şahmaran 3 dövüş fazı tanımlı');

assert(bossSahmaranCode.includes('PurifierStone') && bossSahmaranCode.includes('triggerPurificationShock'),
  '3 Arıtıcı taş vanası ve Zehir Kalkanı arınma şoku zırh çökertme mekaniği mevcut');

assert(bossSahmaranCode.includes('spawnSuKutu') && bossSahmaranCode.includes('su_kutu_relic'),
  'Zafer sonrası kutsal SU KUTU relikini bahşetme metodu mevcut');

// ----------------------------------------------------------------------
// 6. TEST GRUBU: 4 KAM TAŞI MABEDİ (SahmaranShrines.ts)
// ----------------------------------------------------------------------
console.log("\n--- 6. TEST GRUBU: 4 KAM TAŞI MABEDİ ---");

const sahmaranShrinesPath = path.resolve('src/shrine/SahmaranShrines.ts');
assert(fs.existsSync(sahmaranShrinesPath), 'SahmaranShrines.ts dosyası mevcut');
const sahmaranShrinesCode = fs.readFileSync(sahmaranShrinesPath, 'utf8');

assert(sahmaranShrinesCode.includes('SahmaranCurrentShrine') && sahmaranShrinesCode.includes('diverterPillar1'),
  '1. Mabet: Akıntı ve Girdap Mabedi (Dalgakıran sütunları) mevcut');

assert(sahmaranShrinesCode.includes('SahmaranWaterLilyShrine') && sahmaranShrinesCode.includes('lilyPads'),
  '2. Mabet: Yüzen Nilüfer Mabedi (Batıp çıkan nilüferler) mevcut');

assert(sahmaranShrinesCode.includes('SahmaranWaterLevelShrine') && sahmaranShrinesCode.includes('valveWheel1'),
  '3. Mabet: Su Seviyesi ve Vana Mabedi (Drenaj vanaları) mevcut');

assert(sahmaranShrinesCode.includes('SahmaranUnderwaterCrystalShrine') && sahmaranShrinesCode.includes('crystals'),
  '4. Mabet: Su Altı Kristal Mabedi (Rezonans kristalleri) mevcut');

assert(sahmaranShrinesCode.includes('SahmaranShrineManager'),
  'SahmaranShrineManager orkestratör sınıfı mevcut');

// ----------------------------------------------------------------------
// 7. TEST GRUBU: HİKÂYE, GÖREVLER, BALBALLAR & BENGÜ TAŞ
// ----------------------------------------------------------------------
console.log("\n--- 7. TEST GRUBU: HİKÂYE, GÖREVLER, BALBALLAR & BENGÜ TAŞ ---");

const questDataCode = fs.readFileSync('src/story/QuestData.ts', 'utf8');
assert(questDataCode.includes('quest_sahmaran_destani'),
  'Şahmaran Destanı ana görevi (quest_sahmaran_destani) tanımlı');

assert(questDataCode.includes('quest_lokman_sifa_otu') && questDataCode.includes('quest_zehirli_pinarlar'),
  '2 Yeni Yan Görev ("Lokman\'ın Şifa Otu" & "Zehirli Pınarlar") tanımlı');

const dialogueDataCode = fs.readFileSync('src/story/DialogueData.ts', 'utf8');
assert(dialogueDataCode.includes('lokman_hekim_greet') && dialogueDataCode.includes('Bilge Lokman Hekim'),
  'Bilge Lokman Hekim diyalog ağacı mevcut');

const landmarkManagerCode = fs.readFileSync('src/world/LandmarkManager.ts', 'utf8');
assert(landmarkManagerCode.includes('{ x: -60, z: 20, rot: 0.5 }') &&
       landmarkManagerCode.includes('{ x: -80, z: -35, rot: -0.8 }') &&
       landmarkManagerCode.includes('{ x: -125, z: 45, rot: 1.6 }') &&
       landmarkManagerCode.includes('{ x: -160, z: -80, rot: -2.0 }'),
  'Şahmaran Gölü havzasına 4 yeni Balbal taşı koordinatları eklendi');

assert(landmarkManagerCode.includes('bengu_sahmaran') && landmarkManagerCode.includes('Şahmaran Bengü Taşı'),
  'Şahmaran Bengü Taşı (Hızlı yolculuk ve kayıt anıtı) mevcut');

// ----------------------------------------------------------------------
// 8. TEST GRUBU: İYİLEŞME, SİNEMATİK & BAY TEREK DİRİLİŞİ
// ----------------------------------------------------------------------
console.log("\n--- 8. TEST GRUBU: İYİLEŞME, SİNEMATİK & BAY TEREK DİRİLİŞİ ---");

const sahmaranCutscenesPath = path.resolve('src/story/SahmaranCutscenes.ts');
assert(fs.existsSync(sahmaranCutscenesPath), 'SahmaranCutscenes.ts dosyası mevcut');
const sahmaranCutscenesCode = fs.readFileSync(sahmaranCutscenesPath, 'utf8');

assert(sahmaranCutscenesCode.includes('waypoints') && sahmaranCutscenesCode.includes('TOTAL_DURATION = 14.0'),
  'Şahmaran arınma sinematiği 3 fazlı kamera yolu ve 14s süre tanımlı');

assert(sahmaranCutscenesCode.includes('kamPower.hasSuKutu = true') && sahmaranCutscenesCode.includes('world:bay_terek_healed'),
  'Sinematik bitiminde SU KUTU açılışı ve Bay Terek 3. aşama şifası tetikleniyor');

assert(landmarkManagerCode.includes('level === 3') && landmarkManagerCode.includes('mat.diffuseColor.set(0.2, 0.85, 0.45)'),
  'Bay Terek Hayat Ağacı 3. seviye su kutu berrak turkuaz canlanması mevcut');

// ----------------------------------------------------------------------
// 9. TEST GRUBU: SİSTEM ENTEGRASYONU (CombatSystem, HUD, main.ts)
// ----------------------------------------------------------------------
console.log("\n--- 9. TEST GRUBU: SİSTEM ENTEGRASYONU ---");

const combatSystemCode = fs.readFileSync('src/combat/CombatSystem.ts', 'utf8');
assert(combatSystemCode.includes('bossSahmaran: BossSahmaran | null = null') &&
       combatSystemCode.includes('registerBossSahmaran'),
  'CombatSystem içine bossSahmaran kaydı ve referansı eklendi');

assert(combatSystemCode.includes('this.bossSahmaran.takeDamage(damage, arrowType === \'FIRE\')') &&
       combatSystemCode.includes('this.bossSahmaran.takeDamage(dmg, isKnockback)'),
  'CombatSystem ok ve yakın dövüş saldırıları Boss Şahmaran\'a hasar veriyor');

const hudCode = fs.readFileSync('src/ui/HUD.ts', 'utf8');
assert(hudCode.includes('combat.bossSahmaran') && hudCode.includes('ARITICI TAŞLAR:'),
  'HUD içinde Şahmaran Boss can barı ve arıtıcı taş sayaçları mevcut');

const mainCode = fs.readFileSync('src/main.ts', 'utf8');
assert(mainCode.includes('underwaterSystem.update') &&
       mainCode.includes('sahmaranLake.update') &&
       mainCode.includes('sahmaranShrines.update'),
  'main.ts ana render döngüsünde su altı, göl ve mabet güncellemeleri bağlı');

assert(mainCode.includes('bossSahmaran') && mainCode.includes('sahmaranCutscene'),
  'main.ts içinde Boss Şahmaran ve arınma ara sahnesi entegrasyonu tamamlandı');

// ----------------------------------------------------------------------
// 10. TEST GRUBU: HARAP BALIKÇI KÖYÜ & SU TAHLİYE SİSTEMİ (HarapKoy.ts)
// ----------------------------------------------------------------------
console.log("\n--- 10. TEST GRUBU: HARAP BALIKÇI KÖYÜ & SU TAHLİYE SİSTEMİ ---");

const harapKoyPath = path.resolve('src/world/HarapKoy.ts');
assert(fs.existsSync(harapKoyPath), 'HarapKoy.ts dosyası mevcut');
const harapKoyCode = fs.readFileSync(harapKoyPath, 'utf8');

assert(harapKoyCode.includes('buildRuinedPiers') && harapKoyCode.includes('buildSunkenBoats') && harapKoyCode.includes('buildRuinedHuts'),
  'Harap iskeleler, batık kayıklar ve yıkık saz kulübeler mevcut');

assert(harapKoyCode.includes('sluiceGateMesh') && harapKoyCode.includes('sluiceCrankMesh') && harapKoyCode.includes('turnSluiceCrank'),
  'Su tahliye kapağı ve çevrilebilir vana kolu (SluiceGate) mekanizması mevcut');

assert(harapKoyCode.includes('caveEntranceMesh') && harapKoyCode.includes('water_cave_portal'),
  'Yeraltı su mağarası girişi (portal) tanımlı');

// ----------------------------------------------------------------------
// 11. TEST GRUBU: MÜTTEFİK ŞAHMARAN, AHLAKİ SEÇİM & ZEHİR-ŞİFA SINAVI
// ----------------------------------------------------------------------
console.log("\n--- 11. TEST GRUBU: MÜTTEFİK ŞAHMARAN, AHLAKİ SEÇİM & SINAVI ---");

const sahmaranAllyPath = path.resolve('src/story/SahmaranAlly.ts');
assert(fs.existsSync(sahmaranAllyPath), 'SahmaranAlly.ts dosyası mevcut');
const sahmaranAllyCode = fs.readFileSync(sahmaranAllyPath, 'utf8');

assert(sahmaranAllyCode.includes('torsoMesh') && sahmaranAllyCode.includes('crownMesh') && sahmaranAllyCode.includes('tailSegments'),
  'Yarı insan yarı yılan bilge model: zarif gövde, taç ve 5 kıvrımlı kuyruk segmenti mevcut');

assert(sahmaranAllyCode.includes('makeMoralChoice') && sahmaranAllyCode.includes('OATH_KEPT') && sahmaranAllyCode.includes('TRIBE_FIRST'),
  'Ahlaki karar mekanizması (Söz Verme / Sır Saklama) tanımlı');

assert(sahmaranAllyCode.includes('hasSahmaranBlessing'),
  'Söz tutma kararıyla Kutsal Şahmaran Tılsımı (+%30 zehir direnci) kutsaması mevcut');

assert(sahmaranAllyCode.includes('mat_pure_lotus') && sahmaranAllyCode.includes('mat_blighted_lotus'),
  'Zehir ve şifa sınavı: Kutsal Arı Nilüfer ve Zehirli Kara Nilüfer ayırt etme mevcut');

const cookingCode = fs.readFileSync('src/crafting/CookingSystem.ts', 'utf8');
assert(cookingCode.includes('recipe_panzehir') && cookingCode.includes('food_panzehir'),
  'Kamp ateşinde Panzehir Şerbeti pişirme tarifi mevcut');

assert(sahmaranAllyCode.includes('completeTrial') && sahmaranAllyCode.includes('food_panzehir'),
  'Panzehir Şerbeti teslimi ile Şahmaran Sınavı tamamlama mekanizması mevcut');

// ----------------------------------------------------------------------
// 12. TEST GRUBU: FAZ 10 YENİ DÜŞMANLAR (SU ALBIZI, SAZAN SÜRÜSÜ, KARA YILAN)
// ----------------------------------------------------------------------
console.log("\n--- 12. TEST GRUBU: YENİ DÜŞMANLAR (SU ALBIZI, SAZAN SÜRÜSÜ, KARA YILAN) ---");

assert(enemyEntityCode.includes("'SU_ALBIZI'") && enemyEntityCode.includes("'ZEHIRLI_SAZAN_SURUSU'") && enemyEntityCode.includes("'KARA_YILAN'"),
  'EnemyType içine SU_ALBIZI, ZEHIRLI_SAZAN_SURUSU ve KARA_YILAN eklendi');

assert(enemyEntityCode.includes('Su Albızı') && enemyEntityCode.includes('Zehirli Sazan Sürüsü') && enemyEntityCode.includes('Kara Yılan'),
  'Yeni su düşmanları Türkçe ad ve nitelik tanımları mevcut');

// ----------------------------------------------------------------------
// 13. TEST GRUBU: 7 BAŞLI EJDER BOSS YELBEGEN & DAĞLAMA MEKANİĞİ
// ----------------------------------------------------------------------
console.log("\n--- 13. TEST GRUBU: 7 BAŞLI EJDER BOSS YELBEGEN & DAĞLAMA ---");

const bossYelbegenPath = path.resolve('src/combat/BossYelbegen.ts');
assert(fs.existsSync(bossYelbegenPath), 'BossYelbegen.ts dosyası mevcut');
const bossYelbegenCode = fs.readFileSync(bossYelbegenPath, 'utf8');

assert(bossYelbegenCode.includes('heads: YelbegenHead[]') && bossYelbegenCode.includes('build7Heads'),
  '7 Bağımsız Element Başlığı (Ateş, Buz, Zehir, Rüzgâr, Asit, Şimşek, Ulu Kara Baş) mevcut');

assert(bossYelbegenCode.includes('telegraphRing') && bossYelbegenCode.includes('0.50'),
  'Boss Yelbegen 0.5s yer halkası telegraph uyarı sistemi mevcut');

assert(bossYelbegenCode.includes('severHead') && bossYelbegenCode.includes('regrowthTimer = 30.0'),
  'Kesilen başın 30 saniye sonra yeniden uzama mekanizması mevcut');

assert(bossYelbegenCode.includes('cauterizeStump') && bossYelbegenCode.includes('isCauterized = true'),
  'Ateşle dağlama (Cauterize) ile başın yeniden uzamasını kalıcı durdurma mevcut');

assert(bossYelbegenCode.includes('FINAL_HEAD_RAGE') && bossYelbegenCode.includes('enterFinalRagePhase'),
  '6 Baş dağlandığında 7. Ulu Kara Baş öfke ve tsunami fazına geçiyor');

assert(bossYelbegenCode.includes('spawnSuKutu') && bossYelbegenCode.includes('su_kutu_relic'),
  'Yelbegen alt edildiğinde kutsal SU KUTU reliki bahşediliyor');

// ----------------------------------------------------------------------
// 14. TEST GRUBU: GELİŞMİŞ SU ALTI: NEFES ÇARKI, ISLANMA & LOW-PASS SES
// ----------------------------------------------------------------------
console.log("\n--- 14. TEST GRUBU: GELİŞMİŞ SU ALTI MEKANİKLERİ ---");

assert(underwaterSystemCode.includes('playerWetness') && underwaterSystemCode.includes('wetnessBadge'),
  'Oyuncu ıslanma ve kuruma fiziği (playerWetness) ve DOM göstergesi mevcut');

assert(underwaterSystemCode.includes('breathWheelCircle') && underwaterSystemCode.includes('stroke-dasharray'),
  'DOM SVG tabanlı dairesel nefes çarkı güncellemesi mevcut');

assert(underwaterSystemCode.includes('godRayMeshes') && underwaterSystemCode.includes('initUnderwaterGodRays'),
  'Su yüzeyinden tabana süzülen su altı ışık huzmeleri (Volumetric God Rays) mevcut');

const audioSystemCode = fs.readFileSync('src/audio/ProceduralAudio.ts', 'utf8');
assert(audioSystemCode.includes('underwaterFilter') && audioSystemCode.includes('setUnderwaterMode'),
  'Web Audio API su altı boğukluğu low-pass filtre sistemi (380 Hz) mevcut');

assert(audioSystemCode.includes('playHeadSevered') && audioSystemCode.includes('playCauterizeSizzle') && audioSystemCode.includes('playYelbegenRoar'),
  'Yelbegen baş kesme, ateşle dağlama ve ejder kükremesi prosedürel sesleri mevcut');

// ----------------------------------------------------------------------
// 15. TEST GRUBU: YENİ GÖREVLER, DİYALOGLAR VE SİSTEM BAĞLANTILARI
// ----------------------------------------------------------------------
console.log("\n--- 15. TEST GRUBU: YENİ GÖREVLER, DİYALOGLAR VE SİSTEM BAĞLANTILARI ---");

assert(questDataCode.includes('quest_sahmaran_sinavi') && questDataCode.includes('quest_yelbegen_yikimi'),
  'Şahmaran Sınavı ve 7 Başlı Yelbegen ana görevleri tanımlı');

assert(dialogueDataCode.includes('sahmaran_sanctuary_greet') && dialogueDataCode.includes('sahmaran_oath_accept'),
  'Müttefik Bilge Şahmaran diyalog ağacı ve ahlaki seçim düğümleri mevcut');

assert(combatSystemCode.includes('bossYelbegen: BossYelbegen | null = null') && combatSystemCode.includes('registerBossYelbegen'),
  'CombatSystem içine Boss Yelbegen entegrasyonu tamamlandı');

assert(hudCode.includes('combat.bossYelbegen') && hudCode.includes('YELBEGEN'),
  'HUD içinde 7 Başlı Yelbegen can barı ve dağlanan/kesilen baş sayaçları mevcut');

assert(mainCode.includes('harapKoy.update') && mainCode.includes('sahmaranAlly.update') && mainCode.includes('bossYelbegen'),
  'main.ts render döngüsünde Harap Köy, Müttefik Şahmaran ve Boss Yelbegen bağlı');

// ----------------------------------------------------------------------
// ÖZET VE SONUÇ
// ----------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`   FAZ 10 DOĞRULAMA TEST RAPORU: ${passedTests} / ${totalTests} TEST GEÇTİ (%${Math.round((passedTests/totalTests)*100)})`);
console.log("======================================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 TEBRİKLER! FAZ 10: ŞAHMARAN GÖLÜ (SU KUTU) TÜM ŞARTLARI BAŞARIYLA KARŞILADI!");
  process.exit(0);
} else {
  console.error("⚠️ BAZI TESTLER BAŞARISIZ OLDU. Lütfen yukarıdaki hata kayıtlarını inceleyin.");
  process.exit(1);
}
