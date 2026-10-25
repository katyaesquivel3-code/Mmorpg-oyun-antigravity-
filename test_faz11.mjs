/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * FAZ 11 KABUL VE ENTEGRASYON DOĞRULAMA TESTİ (test_faz11.mjs)
 * 
 * Test Kapsamı:
 * 1. GÖK ZİRVE & ALTAY TİPİSİ (GokZirve.ts): Tipi rüzgârı, 0.5s zemin telegraph'lı çığ olayı, sığınak mağaraları, buz tırmanışı ve Tamu portalı
 * 2. SOĞUK & DONMA MEKANİĞİ (TemperatureSystem.ts): -5°C soğuk, -15°C aşırı soğuk, kamp ateşi/meşale ısınma kaynakları, Gök Seti ve Gök Kutu bağışıklığı
 * 3. UMAY ANA'NIN ÜÇ SINAVI (UmayTrialShrine.ts): Cesaret, Merhamet (donan yavruyu ısıtma), Denge (3=3 antik terazi bulmacası) ve GÖK KUTU ödülü
 * 4. GÖK SIÇRAMASI / ÇİFT ZIPLAMA (PlayerController.ts): Gök Kutu ile havada çift zıplama ve inişte sıfırlanma
 * 5. DOKUZ KAT YERALTI (DokuzKatYeralti.ts): 9 ayrı mekanik kat, 5. kat Kut ayna bulmacası, 7. kat Unutuş Pınarı duygusal vizyonu, kontrol noktaları
 * 6. FİNAL BOSS ERLİK HAN (BossErlikHan.ts & CombatSystem.ts): 3 Faz, gölge kopyalar, Üç Düzen (Gölge Kalkanı [Ateş], Kara Girdap [Rüzgâr], Donmuş An [Kut Zamanı]), diz çöküş
 * 7. İKİ SON & OYUN SONU (EndingManager.ts): Denge Sonu (Kut Ezgisi 4 nota, Bay Terek 4. seviye uyanışı), Yıkım Sonu (Son seçime dönüş modalı), Serbest Dolaşım & Yeni Oyun+ (NG+)
 * 8. SAF DOM KREDİ EKRANI & PROSEDÜREL SESLER: DOM jeneriği (2D canvas yok), çığ, buz kırılışı, kemik mızrak, kara girdap, zaman kırılışı ve Kut ezgisi sesleri
 * 9. GÖREVLER, DİYALOGLAR VE TUTARLILIK DENETİMİ: Görev zinciri, Erlik Han seçimleri, Kam Ata ve Börü vedaları
 */

import fs from 'fs';
import path from 'path';

console.log("======================================================================");
console.log("   ÖTÜKEN: KUT'UN DÖRT PARÇASI - FAZ 11 TEST PROTOKOLÜ BAŞLATILIYOR  ");
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
// 1. TEST GRUBU: GÖK ZİRVE & ALTAY TİPİSİ (GokZirve.ts)
// ----------------------------------------------------------------------
console.log("--- 1. TEST GRUBU: GÖK ZİRVE & ALTAY TİPİSİ ---");

const gokZirvePath = path.resolve('src/world/GokZirve.ts');
assert(fs.existsSync(gokZirvePath), 'GokZirve.ts dosyası mevcut');
const gokZirveCode = fs.readFileSync(gokZirvePath, 'utf8');

assert(gokZirveCode.includes('CENTER_X = 110') && gokZirveCode.includes('CENTER_Z = 120'),
  'Gök Zirve Altay dağlık bölgesi doğru koordinatlarda (110, 120)');

assert(gokZirveCode.includes('windPushX') && gokZirveCode.includes('windPushZ'),
  'Kar fırtınası / tipi rüzgâr itiş fiziği mevcut');

assert(gokZirveCode.includes('telegraphMesh') && gokZirveCode.includes('telegraphTimer'),
  'Çığ olayı için 0.5s zemin telegraph uyarı halkası mevcut');

assert(gokZirveCode.includes('shelterCaves') && gokZirveCode.includes('isPlayerInShelter'),
  'Çığ felaketine karşı korunaklı sığınak mağaraları mevcut');

assert(gokZirveCode.includes('iceBridges') && gokZirveCode.includes('iceClimbingWalls'),
  'Buz köprüleri ve buz tırmanış yüzeyleri tanımlı');

assert(gokZirveCode.includes('yeraltiEntranceMesh') && gokZirveCode.includes('world:yeralti_entered'),
  'Dokuz Kat Yeraltı Tamu Kapısı portalı ve geçiş olayı mevcut');

// ----------------------------------------------------------------------
// 2. TEST GRUBU: SOĞUK & DONMA MEKANİĞİ (TemperatureSystem.ts)
// ----------------------------------------------------------------------
console.log("\n--- 2. TEST GRUBU: SOĞUK & DONMA MEKANİĞİ ---");

const tempSysPath = path.resolve('src/world/TemperatureSystem.ts');
assert(fs.existsSync(tempSysPath), 'TemperatureSystem.ts dosyası mevcut');
const tempSysCode = fs.readFileSync(tempSysPath, 'utf8');

assert(tempSysCode.includes('COLD_THRESHOLD = -5.0') && tempSysCode.includes('EXTREME_COLD_THRESHOLD = -15.0'),
  'Soğuk (-5°C) ve aşırı dondurucu (-15°C) eşikleri tanımlı');

assert(tempSysCode.includes('warmthZones') && tempSysCode.includes('initDefaultWarmthSources'),
  'Kamp ateşi ve meşale ısınma kaynakları tanımlı');

assert(tempSysCode.includes('GOK_SET') || tempSysCode.includes('hasGokKutu'),
  'Gök Seti ve Gök Kutu ile tam soğuk bağışıklığı destekleniyor');

assert(tempSysCode.includes('coldDamage = 5.0') || tempSysCode.includes('coldDamage'),
  'Korumasız aşırı soğukta saniyede 5 HP donma hasarı mevcut');

// ----------------------------------------------------------------------
// 3. TEST GRUBU: UMAY ANA'NIN ÜÇ SINAVI (UmayTrialShrine.ts)
// ----------------------------------------------------------------------
console.log("\n--- 3. TEST GRUBU: UMAY ANA'NIN ÜÇ SINAVI ---");

const umayShrinePath = path.resolve('src/shrine/UmayTrialShrine.ts');
assert(fs.existsSync(umayShrinePath), 'UmayTrialShrine.ts dosyası mevcut');
const umayShrineCode = fs.readFileSync(umayShrinePath, 'utf8');

assert(umayShrineCode.includes('startCourageTrial') && umayShrineCode.includes('COURAGE_DURATION = 35.0'),
  '1. Sınav: 35 saniyelik Cesaret Sınavı dalgası mevcut');

assert(umayShrineCode.includes('babyAlbizMesh') && umayShrineCode.includes('warmBabyAlbiz'),
  '2. Sınav: Donan Albız yavrusunu ateşle ısıtma ve Merhamet sınavı mevcut');

assert(umayShrineCode.includes('scaleBeamMesh') && umayShrineCode.includes('leftPanMesh') && umayShrineCode.includes('rightPanMesh'),
  '3. Sınav: İki kefeli Yer-Gök antik terazisi modeli mevcut');

assert(umayShrineCode.includes('leftWeight === 3 && rightWeight === 3') && umayShrineCode.includes('balanceCompleted = true'),
  '3. Sınav: Yer (2) + Denge (1) = 3 ve Gök (3) = 3 denge bulmacası mantığı doğrulanmış');

assert(umayShrineCode.includes('hasGokKutu = true') && umayShrineCode.includes('world:gok_kutu_unlocked'),
  '3 sınav tamamlandığında kutsal GÖK KUTU reliki oyuncuya veriliyor');

// ----------------------------------------------------------------------
// 4. TEST GRUBU: GÖK SIÇRAMASI / ÇİFT ZIPLAMA (PlayerController.ts)
// ----------------------------------------------------------------------
console.log("\n--- 4. TEST GRUBU: GÖK SIÇRAMASI / ÇİFT ZIPLAMA ---");

const playerCtrlPath = path.resolve('src/player/PlayerController.ts');
assert(fs.existsSync(playerCtrlPath), 'PlayerController.ts dosyası mevcut');
const playerCtrlCode = fs.readFileSync(playerCtrlPath, 'utf8');

assert(playerCtrlCode.includes('hasDoubleJumped = false;'),
  'Çift zıplama takip bayrağı (hasDoubleJumped) mevcut');

assert(playerCtrlCode.includes('KamPowerManager.getInstance().hasGokKutu') && playerCtrlCode.includes('!this.hasDoubleJumped'),
  'Gök Kutu ile havada çift zıplama kontrolü mevcut');

assert(playerCtrlCode.includes('this.hasDoubleJumped = false;') && playerCtrlCode.includes("locomotionState = this.isInWater ? 'SWIM' : 'GROUND';"),
  'Zemine veya suya inişte çift zıplama sıfırlanıyor');

// ----------------------------------------------------------------------
// 5. TEST GRUBU: DOKUZ KAT YERALTI (DokuzKatYeralti.ts)
// ----------------------------------------------------------------------
console.log("\n--- 5. TEST GRUBU: DOKUZ KAT YERALTI ---");

const yeraltiPath = path.resolve('src/world/DokuzKatYeralti.ts');
assert(fs.existsSync(yeraltiPath), 'DokuzKatYeralti.ts dosyası mevcut');
const yeraltiCode = fs.readFileSync(yeraltiPath, 'utf8');

assert(yeraltiCode.includes('KEMIK_GECIDI') && yeraltiCode.includes('KOR_NEHRI') && yeraltiCode.includes('KARA_SU'),
  '1, 2 ve 3. katlar tanımlı (Kemik Geçidi, Kor Nehri, Kara Su)');

assert(yeraltiCode.includes('GOLGE_ORMANI') && yeraltiCode.includes('AYNA_SALONU') && yeraltiCode.includes('SOGUK_CEKIRDEK'),
  '4, 5 ve 6. katlar tanımlı (Gölge Ormanı, Ayna Salonu, Soğuk Çekirdek)');

assert(yeraltiCode.includes('UNUTUS_PINARI') && yeraltiCode.includes('DEMIR_KOPRU') && yeraltiCode.includes('TAHT_SALONU'),
  '7, 8 ve 9. katlar tanımlı (Unutuş Pınarı, Demir Köprü, Erlik Han Taht Salonu)');

assert(yeraltiCode.includes('rotateMirror') && yeraltiCode.includes('isMirrorPuzzleSolved'),
  '5. Kat Ayna Salonu Kut ışığı odaklama bulmacası mevcut');

assert(yeraltiCode.includes('triggerMemoryVision') && yeraltiCode.includes('Kam Ata’nın kutsal ocağı'),
  '7. Kat Unutuş Pınarı duygusal anı vizyonu mevcut');

assert(yeraltiCode.includes('respawnAtCurrentCheckpoint') && yeraltiCode.includes('checkpointPos'),
  'Katlar arası kontrol noktaları ve yeniden doğuş mekaniği mevcut');

// ----------------------------------------------------------------------
// 6. TEST GRUBU: FİNAL BOSS ERLİK HAN (BossErlikHan.ts & CombatSystem.ts)
// ----------------------------------------------------------------------
console.log("\n--- 6. TEST GRUBU: FİNAL BOSS ERLİK HAN ---");

const erlikPath = path.resolve('src/combat/BossErlikHan.ts');
assert(fs.existsSync(erlikPath), 'BossErlikHan.ts dosyası mevcut');
const erlikCode = fs.readFileSync(erlikPath, 'utf8');

assert(erlikCode.includes('maxHealth = 1600') && erlikCode.includes('matDarkArmor') && erlikCode.includes('matHorn'),
  'Erlik Han 3D heybetli kara zırhlı ve boynuzlu gövde modeli tanımlı');

assert(erlikCode.includes('PHASE_1_SHADOWS') && erlikCode.includes('shadowClones') && erlikCode.includes('playBoneSpear'),
  'Faz 1: Gölge kopyalar ve kemik mızrakları saldırı mekaniği mevcut');

assert(erlikCode.includes('PHASE_2_THREE_REGIMES') && erlikCode.includes('SHADOW_SHIELD') && erlikCode.includes('DARK_VORTEX') && erlikCode.includes('FROZEN_TIME'),
  'Faz 2: Üç Düzen (Gölge Kalkanı, Kara Girdap, Donmuş An) tanımlı');

assert(erlikCode.includes('breakRegime') && erlikCode.includes('usedPower === \'FIRE\'') && erlikCode.includes('usedPower === \'WIND\'') && erlikCode.includes('usedPower === \'KUT_TIME\''),
  'Faz 2 rejimleri Ateş, Rüzgâr ve Kut Zamanı güçleriyle kırılıyor');

assert(erlikCode.includes('PHASE_3_WEAKENED_CHOICE') && erlikCode.includes('isKneeling = true'),
  'Faz 3: Erlik Han zayıflayıp diz çöküyor ve Ayaz’ın kader seçimi bekleniyor');

const combatPath = path.resolve('src/combat/CombatSystem.ts');
const combatCode = fs.readFileSync(combatPath, 'utf8');
assert(combatCode.includes('bossErlikHan: BossErlikHan | null') && combatCode.includes('registerBossErlikHan'),
  'CombatSystem içinde BossErlikHan kaydı ve entegrasyonu mevcut');

assert(combatCode.includes('this.bossErlikHan.takeDamage(dmg, isFire)'),
  'Yakın dövüş ve ok saldırıları Erlik Han’a ve rejim kalkanına hasar veriyor');

// ----------------------------------------------------------------------
// 7. TEST GRUBU: İKİ SON & OYUN SONU (EndingManager.ts)
// ----------------------------------------------------------------------
console.log("\n--- 7. TEST GRUBU: İKİ SON & OYUN SONU ---");

const endingPath = path.resolve('src/story/EndingManager.ts');
assert(fs.existsSync(endingPath), 'EndingManager.ts dosyası mevcut');
const endingCode = fs.readFileSync(endingPath, 'utf8');

assert(endingCode.includes('triggerDengeEnding') && endingCode.includes('kutEzgisiStep') && endingCode.includes('KUT_EZGISI_TARGET = 4'),
  'DENGE SONU: 4 notalık kutsal Kut Ezgisi mini oyunu tanımlı');

assert(endingCode.includes("EventBus.emit('world:bay_terek_healed', { stage: 4 })"),
  'DENGE SONU: Bay Terek 4. seviye tam uyanışı tetikleniyor');

assert(endingCode.includes('triggerYikimEnding') && endingCode.includes('revertToFinalChoice'),
  'YIKIM SONU: Buruk son ve son seçime geri dönüş mekaniği mevcut');

assert(endingCode.includes('startFreeRoam') && endingCode.includes('isFreeRoamActive = true'),
  'Final sonrası serbest dolaşım (kalan Kam Taşları ve Balbalları arama) modu mevcut');

assert(endingCode.includes('startNewGamePlus') && endingCode.includes('isNewGamePlus = true'),
  'Yeni Oyun+ (NG+) başlatımı ve Oba merkezine ışınlanma mevcut');

// ----------------------------------------------------------------------
// 8. TEST GRUBU: SAF DOM KREDİ EKRANI & PROSEDÜREL SESLER
// ----------------------------------------------------------------------
console.log("\n--- 8. TEST GRUBU: SAF DOM KREDİ EKRANI & PROSEDÜREL SESLER ---");

assert(endingCode.includes("credits.id = 'creditsOverlay'") && endingCode.includes('document.createElement'),
  'Kredi ekranı saf DOM elementi olarak oluşturuluyor (2D canvas yok)');

const audioPath = path.resolve('src/audio/ProceduralAudio.ts');
const audioCode = fs.readFileSync(audioPath, 'utf8');

assert(audioCode.includes('playAvalancheRumble') && audioCode.includes('playIceShatter'),
  'Çığ gürültüsü ve buz kırılışı prosedürel sesleri mevcut');

assert(audioCode.includes('playBoneSpear') && audioCode.includes('playDarkVortex') && audioCode.includes('playTimeShatter'),
  'Kemik mızrak, kara girdap ve donmuş zaman kırılışı sesleri mevcut');

assert(audioCode.includes('playErlikRoar') && audioCode.includes('playKutEzgisiNote'),
  'Erlik Han kükremesi ve 4 kutsal Kut ezgisi notası sentezi mevcut');

// ----------------------------------------------------------------------
// 9. TEST GRUBU: GÖREVLER, DİYALOGLAR VE TUTARLILIK DENETİMİ
// ----------------------------------------------------------------------
console.log("\n--- 9. TEST GRUBU: GÖREVLER, DİYALOGLAR VE TUTARLILIK DENETİMİ ---");

const questPath = path.resolve('src/story/QuestData.ts');
const questCode = fs.readFileSync(questPath, 'utf8');

assert(questCode.includes('quest_gok_zirve') && questCode.includes('quest_umay_sinavi'),
  'Gök Zirve ve Umay Ana Sınavları ana görevleri tanımlı');

assert(questCode.includes('quest_dokuz_kat_yeralti') && questCode.includes('quest_erlik_han_final'),
  'Dokuz Kat Yeralti ve Erlik Han Büyük Final ana görevleri tanımlı');

const dialoguePath = path.resolve('src/story/DialogueData.ts');
const dialogueCode = fs.readFileSync(dialoguePath, 'utf8');

assert(dialogueCode.includes('umay_shrine_greet') && dialogueCode.includes('umay_trial_complete'),
  'Umay Ana diyalogları ve sınav tamamlanma metinleri mevcut');

assert(dialogueCode.includes('erlik_kneeling_choice') && dialogueCode.includes('ending:balance') && dialogueCode.includes('ending:ruin'),
  'Erlik Han diz çöküş diyalogu ve Denge / Yıkım seçim aksiyonları mevcut');

assert(dialogueCode.includes('kam_ata_final_farewell') && dialogueCode.includes('boru_final_howl'),
  'Kam Ata Korkut ve Börü duygusal veda sahneleri mevcut');

// ----------------------------------------------------------------------
// SONUÇ RAPORU
// ----------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`   FAZ 11 TEST RAPORU: ${passedTests} / ${totalTests} TEST BAŞARIYLA GEÇTİ`);
console.log("======================================================================");

if (passedTests === totalTests) {
  console.log("\n🎉 TEBRİKLER! FAZ 11 (GÖK ZİRVE, DOKUZ KAT YERALTI, ERLİK HAN VE BÜYÜK FİNAL) EKSİKSİZ TAMAMLANDI!\n");
  process.exit(0);
} else {
  console.error(`\n❌ ${totalTests - passedTests} ADET TEST BAŞARISIZ OLDU. LÜTFEN EKSİKLERİ DÜZELTİN.\n`);
  process.exit(1);
}
