/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Ana Başlatıcı & 60 FPS Render Döngüsü (main.ts)
 * (Faz 6: Açılış Sinematiği, Canlı 3D Portre, BotW Pusula Şeridi, Işık Sütunu İşaretçisi,
 *  6 Ana Görev Zinciri, 4 Yan Görev, Börü Koku İzi & Emir Sistemi, 8+ Bengü Taş,
 *  Oba Yeniden İnşası, Destan Defteri Ansiklopedisi & Sıfır GC)
 */

import { Game } from './core/Game';
import { CameraRig } from './core/CameraRig';
import { WorldNoise } from './world/WorldNoise';
import { WorldManager } from './world/WorldManager';
import { FoliageManager } from './world/FoliageManager';
import { SkySystem } from './world/SkySystem';
import { WaterSystem } from './world/WaterSystem';
import { WeatherSystem } from './world/WeatherSystem';
import { AyazModel } from './player/AyazModel';
import { PlayerController } from './player/PlayerController';
import { CombatSystem } from './combat/CombatSystem';
import { InputManager } from './input/InputManager';
import { QualityManager } from './ui/QualityManager';
import { HUD } from './ui/HUD';
import { Vector3 } from '@babylonjs/core';
import { WeaponType } from './combat/WeaponData';

import { TrainingGround } from './world/TrainingGround';
import { EnemyCampManager } from './world/EnemyCampManager';
import { WinterBlightManager } from './world/WinterBlightManager';
import { BossTepegoz } from './combat/BossTepegoz';

import { SettingsStore } from './infra/SettingsStore';
import { ProceduralAudio } from './audio/ProceduralAudio';
import { GyroAimManager } from './infra/GyroAimManager';
import { EventBus } from './infra/EventBus';

// HİKÂYE, SİNEMATİK & DİYALOG
import { OpeningCutscene } from './story/OpeningCutscene';
import { Live3DPortrait } from './story/Live3DPortrait';
import { DialogueManager } from './story/DialogueManager';
import { QuestManager } from './story/QuestManager';

// DÜNYA ANITLARI, BEACON & YENİDEN İNŞA
import { BeaconPillar } from './world/BeaconPillar';
import { VillageReconstruction } from './world/VillageReconstruction';
import { NPCManager } from './world/NPCManager';
import { BoruCompanion } from './player/BoruCompanion';

// KULLANICI ARAYÜZÜ (PUSULA, HARİTA & DESTAN DEFTERİ)
import { CompassRibbon } from './ui/CompassRibbon';
import { Minimap } from './ui/Minimap';
import { WorldMapModal } from './ui/WorldMapModal';
import { DestanDefteriModal } from './ui/DestanDefteriModal';

// FAZ 6: KAM GÜÇLERİ, ELEMENT SİSTEMİ & MABETLER
import { ElementSystem } from './elements/ElementSystem';
import { KamPowerManager } from './powers/KamPowerManager';
import { ShrineManager } from './shrine/ShrineManager';
import { PowerWheelModal } from './ui/PowerWheelModal';
import { KutHeartModal } from './ui/KutHeartModal';

// FAZ 7: ENVANTER, YEMEK, DEMİRCİ & BİNEKLER
import { InventoryManager } from './inventory/InventoryManager';
import { CookingSystem } from './crafting/CookingSystem';
import { BlacksmithSystem } from './crafting/BlacksmithSystem';
import { MountSystem } from './mount/MountSystem';
import { Item3DPreview } from './ui/Item3DPreview';
import { InventoryModal } from './ui/InventoryModal';

// FAZ 8: KAYIT, SES, KOPUZ, AYARLAR & BAŞARIMLAR
import { SaveSystem } from './infra/SaveSystem';
import { AchievementManager } from './story/AchievementManager';
import { KopuzSystem } from './powers/KopuzSystem';
import { KopuzModal } from './ui/KopuzModal';
import { AudioSystem, FootstepSurface } from './audio/AudioSystem';
import { MainMenu } from './ui/MainMenu';

// FAZ 9: ERGENEKON, DEMİR DAĞ, LAV, SICAKLIK, BOSS VE TULPAR
import { TemperatureSystem } from './world/TemperatureSystem';
import { LavaSystem } from './world/LavaSystem';
import { ErgenekonValley } from './world/ErgenekonValley';
import { BossDemirDagBekcisi } from './combat/BossDemirDagBekcisi';
import { ErgenekonShrineManager } from './shrine/ErgenekonShrines';
import { ErgenekonCutscenes } from './story/ErgenekonCutscenes';

// FAZ 10: ŞAHMARAN GÖLÜ, SU ALTI SİSTEMİ, BOSS VE SU KUTU
import { UnderwaterSystem } from './world/UnderwaterSystem';
import { SahmaranLake } from './world/SahmaranLake';
import { HarapKoy } from './world/HarapKoy';
import { SahmaranAlly } from './story/SahmaranAlly';
import { BossSahmaran } from './combat/BossSahmaran';
import { BossYelbegen } from './combat/BossYelbegen';
import { SahmaranShrineManager } from './shrine/SahmaranShrines';
import { SahmaranCutscenes } from './story/SahmaranCutscenes';
import { EnemyEntity } from './combat/EnemyEntity';

// FAZ 11: GÖK ZİRVE, DOKUZ KAT YERALTI, ERLİK HAN & BÜYÜK FİNAL
import { GokZirve } from './world/GokZirve';
import { UmayTrialShrine } from './shrine/UmayTrialShrine';
import { DokuzKatYeralti } from './world/DokuzKatYeralti';
import { BossErlikHan } from './combat/BossErlikHan';
import { EndingManager } from './story/EndingManager';

// FAZ 12: UYARLANABİLİR KALİTE, PERFORMANS ENSTRÜMANTASYONU & ANDROID LİFECYCLE
import { AdaptiveQualitySystem } from './core/AdaptiveQualitySystem';
import { App } from '@capacitor/app';

// Sıcak döngüde sıfır bellek tahsis scratch nesneleri (Rule 7: Zero GC)
const scratchArrowOrigin = new Vector3(0, 0, 0);
const scratchArrowDir = new Vector3(0, 0, 0);

window.addEventListener('DOMContentLoaded', () => {
  console.log("=== ÖTÜKEN: KUT'UN DÖRT PARÇASI (FAZ 6: SİNEMATİK, DİYALOG, GÖREV, BÖRÜ & DESTAN DEFTERİ) BAŞLATILIYOR ===");

  // 1. Kalıcı Ayarlar & Prosedürel Ses Motoru Başlatımı
  SettingsStore.init();
  ProceduralAudio.init();
  const audioSystem = AudioSystem.getInstance();
  GyroAimManager.init();

  // 2. WebGL2 Oyun Motoru & Sahne Kurulumu (FXAA, Çözünürlük Ölçeği, Context Yönetimi)
  const game = new Game('gameCanvas');

  // FAZ 12: Uyarlanabilir Kalite & Performans Optimizasyon Sistemi (Ön-Isıtma & Cihaz Sınıfı)
  const adaptiveQuality = AdaptiveQualitySystem.getInstance(game.engine, game.scene);
  adaptiveQuality.prewarmShadersAsync();

  // 3. Matematiksel Açık Dünya Gürültüsü (Saf fBm & Domain Warping - 1024x1024m)
  const noise = new WorldNoise(4815);

  // 4. Thin Instance Bitki Örtüsü Yöneticisi (Çim Rüzgâr & Oyuncuya Eğilme Shader'ı, Çapraz-Quad LOD)
  const foliage = new FoliageManager(game.scene, noise, game.shadowGenerator);

  // 5. 1024x1024m Açık Dünya Yöneticisi, MaterialPluginBase, Yaban Hayatı & Gece Işık Havuzu
  const world = new WorldManager(game.scene, foliage, game.shadowGenerator);

  // 6. 20 Dakikalık Gündüz/Gece Gökkubbesi (FBM Bulutlar, Tengri Perdesi Aurora, 3D Güneş & Hilal)
  const sky = new SkySystem(game.scene, game.sunLight!, game.shadowGenerator);
  sky.terrainPlugin = world.terrainPlugin;

  // 7. Şahmaran Gölü Gerstner Dalgaları, Kıyı Köpüğü & Su Altı Efekti
  const water = new WaterSystem(game.scene);

  // 8. Dinamik Hava Durumu Makinesi (Yağmur, Fırtına Şimşek/Gök Gürültüsü, Kar, Tipi, Sis & Islaklık)
  const weather = new WeatherSystem(game.scene);
  weather.terrainPlugin = world.terrainPlugin;

  // 9. Ayaz 3D Prosedürel İskelet Modeli (3 Silah Grubu, Sadak, 3D Soluk Çarkı, Ayak IK, Çömelme & Pelerin Yay-Sönüm)
  const ayaz = new AyazModel(game.scene, game.shadowGenerator);

  // 10. Zelda BotW Stili Gelişmiş Oyuncu Kontrolcüsü (Tırmanma, Süzülme, Kalkan Kızağı, Yüzme & Dalış, Çömelme & Gizlilik)
  const player = new PlayerController(ayaz);

  // 11. Birleşik Antrenman Sahası (Kukla, 14m Tırmanma Duvarı, Su Havuzu, Süzülme Kulesi & Köz Ocağı, Gizlilik & Cephanelik)
  const trainingGround = new TrainingGround(game.scene, world, game.shadowGenerator);
  player.trainingGround = trainingGround;

  // 12. Gelişmiş Savaş Sistemi (3 Silah Sınıfı, Plunge Attack, Havada Bullet-Time, Sessiz Vuruş, Flurry Rush, Parry)
  const combat = new CombatSystem(game.scene, world);

  // Antrenman sahasındaki uyuyan test hedefini savaşa ekle
  if (trainingGround.stealthEnemy) {
    combat.enemies.push(trainingGround.stealthEnemy);
  }

  // 13. Kara Kış Kirlenmesi Yöneticisi (Kut Gücü Engelleme ve Arınma)
  const blightManager = new WinterBlightManager(game.scene);
  combat.registerBlightManager(blightManager);

  // 14. Düşman Karakolları, Kara Totem ve Mühürlü Ganimet Sandıkları (Gölge Boğazı & Kara Çamur)
  const campManager = new EnemyCampManager(game.scene, world, game.shadowGenerator);
  combat.registerCampManager(campManager);

  // 15. Yer-Sub Ormanı Baş Düşmanı: TEPEGÖZ (Dede Korkut Tek Gözlü Dev, Göz & Topuk Zayıf Noktaları, Yer Kutu Ödülü)
  const tepegoz = new BossTepegoz(0, -135, game.scene, world, game.shadowGenerator);
  combat.registerBoss(tepegoz);

  // Sadağın oklarını senkronize et
  ayaz.updateQuiverArrows(combat.arrowSystem.currentStock, combat.arrowSystem.selectedArrowType);

  // 16. KUTSAL GÖK KURT BÖRÜ (Yoldaş Kurt, İskelet, Uçurum Farkındalığı, Koku İzi, Isırma, Emirler)
  const boru = new BoruCompanion(-2.5, -2.0, game.scene, world, game.shadowGenerator);

  // 17. 3D PROSEDÜREL NPC'LER & OBA HALKI (Korkut Ata, Bamsı, Günçiçek, Toygun, Yaralı Göçebeler)
  const npcManager = new NPCManager(game.scene, world, game.shadowGenerator);

  // 18. OBA YENİDEN İNŞASI (Görevlere Göre Onarılan Çadırlar, Pazar Tezgahı, Kutsal Ocak & Şaman Davulu)
  const villageReconstruction = new VillageReconstruction(game.scene, world, game.shadowGenerator);

  // 19. GÖREV & DİYALOG SİSTEMLERİ
  const questManager = QuestManager.getInstance();
  const dialogueManager = DialogueManager.getInstance();

  // 20. 16:9 - 21:9 Tutarlı FOV & Look-Ahead Kamera
  const cameraRig = new CameraRig(game.scene);
  game.scene.activeCamera = cameraRig.camera;

  // 21. CANLI 3D PORTRE SİSTEMİ (İkinci Babylon Kamerası + Viewport + LayerMask)
  const livePortrait = new Live3DPortrait(game.scene, cameraRig);
  dialogueManager.setLivePortrait(livePortrait);

  // 22. GÖĞE YÜKSELEN IŞIK SÜTUNU GÖREV İŞARETÇİSİ (BeaconPillar Shader)
  const beaconPillar = new BeaconPillar(game.scene);

  // 23. BOTW STİLİ YATAY PUSULA ŞERİDİ (K, D, G, B Kardinalleri, Görev Yıldızı, Bengü Taşlar)
  const compassRibbon = new CompassRibbon(world.landmarks, campManager);

  // 24. MİNİMAP (Dairesel DOM Radarı, 160m Yarıçap, Kuzey İbresi & İşaretçiler)
  const minimap = new Minimap(world.landmarks, campManager, npcManager);

  // 25. İKİ SÜTUNLU KADİM DÜNYA HARİTASI (WorldMapModal & Fast Travel)
  const worldMapModal = new WorldMapModal(world, world.landmarks, campManager, npcManager);

  // 26. DESTAN DEFTERİ (Mitoloji Ansiklopedisi & Birleşik Duraklatma Menüsü)
  const destanModal = new DestanDefteriModal();

  // 27. AÇILIŞ SİNEMATİĞİ (3D Kamera Yolu, DOM Altyazı & Ayaz'ın Yemini)
  const openingCutscene = new OpeningCutscene(game.scene, cameraRig, world, ayaz, boru);

  // 28. VERİ TABANLI ELEMENT SİSTEMİ (Ateş + Otlak = Yangın, Rüzgâr Yayılımı, Termal Updraft, Şimşek)
  const elementSystem = ElementSystem.getInstance(game.scene);

  // 29. KAM GÜÇLERİ YÖNETİCİSİ (Ülgen'in Kıvılcımı, Yel Ana, Kut Zamanı, Kut Gücü Barı, 4 Kut Pasifi)
  const kamPowerManager = KamPowerManager.getInstance(game.scene);

  // 30. ANTİK MABETLER (Ateş Mabedi, Rüzgâr Mabedi, Bulmaca Mekanizmaları & Kam Taşı Ödülleri)
  const shrineManager = new ShrineManager(game.scene, elementSystem, kamPowerManager);

  // 31. KAM GÜÇ ÇARKI (%15 Zaman Yavaşlama, 3 Radyal Güç, Dış Halka 4 Kut Parçası)
  const powerWheelModal = new PowerWheelModal(kamPowerManager, (scale: number) => {
    combat.bulletTimeScale = scale;
  });

  // 32. KUT KALBİ SEÇİM MODALI (4 Kam Taşı = 1 Kut Kalbi)
  const kutHeartModal = new KutHeartModal(kamPowerManager, combat);

  // 33. FAZ 7: ENVANTER, YEMEK, DEMİRCİ & BİNEK SİSTEMLERİ
  const inventoryManager = InventoryManager.getInstance();
  const cookingSystem = CookingSystem.getInstance();
  const blacksmithSystem = BlacksmithSystem.getInstance();
  const mountSystem = new MountSystem(game.scene, world, game.shadowGenerator);
  const item3DPreview = new Item3DPreview(game.scene, cameraRig);
  const inventoryModal = new InventoryModal(item3DPreview, combat, kamPowerManager);

  // 34. FAZ 8: KAYIT, SES, KOPUZ, AYARLAR & BAŞARIM SİSTEMLERİ
  const saveSystem = SaveSystem.getInstance();
  const achievementManager = AchievementManager.getInstance();
  const kopuzSystem = KopuzSystem.getInstance(game.scene);
  const kopuzModal = new KopuzModal(kopuzSystem, player, combat, kamPowerManager, mountSystem);
  kopuzModal.sky = sky;
  kopuzModal.weather = weather;
  kopuzModal.boru = boru;

  // 35. FAZ 9: ERGENEKON, DEMİR DAĞ, LAV, SICAKLIK, BOSS VE TULPAR SİSTEMLERİ
  const temperatureSystem = TemperatureSystem.getInstance();
  const lavaSystem = new LavaSystem(game.scene);
  const ergenekonValley = new ErgenekonValley(game.scene, world, game.shadowGenerator);
  const bossDemirDag = new BossDemirDagBekcisi(160, 35, game.scene, world, game.shadowGenerator);
  combat.registerBossDemirDag(bossDemirDag);
  const ergenekonShrines = new ErgenekonShrineManager(game.scene, kamPowerManager);
  const ergenekonCutscene = new ErgenekonCutscenes(game.scene, cameraRig, world, mountSystem, kamPowerManager);

  // Ergenekon ve Demir Dağ Düşmanları (Demir Yek & Kor Albız)
  const demirYek1 = new EnemyEntity('demiryek_1', 'DEMIR_YEK', 95, 15, game.scene, world, game.shadowGenerator);
  const demirYek2 = new EnemyEntity('demiryek_2', 'DEMIR_YEK', 125, -20, game.scene, world, game.shadowGenerator);
  const korAlbiz1 = new EnemyEntity('koralbiz_1', 'KOR_ALBIZ', 115, 30, game.scene, world, game.shadowGenerator);
  const korAlbiz2 = new EnemyEntity('koralbiz_2', 'KOR_ALBIZ', 140, 45, game.scene, world, game.shadowGenerator);
  combat.enemies.push(demirYek1, demirYek2, korAlbiz1, korAlbiz2);

  // 35.5. FAZ 10: ŞAHMARAN GÖLÜ, SU ALTI SİSTEMİ, BOSS VE SU KUTU
  const underwaterSystem = UnderwaterSystem.getInstance(game.scene);
  const sahmaranLake = new SahmaranLake(game.scene, world, game.shadowGenerator);
  const harapKoy = new HarapKoy(game.scene, game.shadowGenerator);
  const sahmaranAlly = new SahmaranAlly(game.scene, game.shadowGenerator);
  const bossSahmaran = new BossSahmaran(-130, -45, game.scene, world, game.shadowGenerator);
  combat.registerBossSahmaran(bossSahmaran);
  const bossYelbegen = new BossYelbegen(-130, -45, game.scene, game.shadowGenerator);
  combat.registerBossYelbegen(bossYelbegen);
  const sahmaranShrines = new SahmaranShrineManager(game.scene);
  const sahmaranCutscene = new SahmaranCutscenes(game.scene, cameraRig, world, kamPowerManager);

  // Şahmaran Gölü Düşmanları (Su Yek amfibik mızraklı savaşçı & Yılan Albız zehirli su ruhu)
  const suYek1 = new EnemyEntity('suyek_1', 'SU_YEK', -90, -40, game.scene, world, game.shadowGenerator);
  const suYek2 = new EnemyEntity('suyek_2', 'SU_YEK', -140, 15, game.scene, world, game.shadowGenerator);
  const yilanAlbiz1 = new EnemyEntity('yilanalbiz_1', 'YILAN_ALBIZ', -115, -60, game.scene, world, game.shadowGenerator);
  const yilanAlbiz2 = new EnemyEntity('yilanalbiz_2', 'YILAN_ALBIZ', -165, -30, game.scene, world, game.shadowGenerator);

  // Faz 10 Yeni Düşmanlar (Su Albızı, Zehirli Sazan Sürüsü, Kara Yılan)
  const suAlbizi = new EnemyEntity('sualbizi_1', 'SU_ALBIZI', -85, 25, game.scene, world, game.shadowGenerator);
  const sazanSurusu = new EnemyEntity('sazan_1', 'ZEHIRLI_SAZAN_SURUSU', -120, -15, game.scene, world, game.shadowGenerator);
  const karaYilan = new EnemyEntity('karayilan_1', 'KARA_YILAN', -105, -35, game.scene, world, game.shadowGenerator);
  combat.enemies.push(suYek1, suYek2, yilanAlbiz1, yilanAlbiz2, suAlbizi, sazanSurusu, karaYilan);

  // FAZ 11: GÖK ZİRVE, UMAY ANA SINAVLARI, DOKUZ KAT YERALTI & ERLİK HAN
  const gokZirve = new GokZirve(game.scene, world, game.shadowGenerator);
  const umayShrine = new UmayTrialShrine(game.scene, kamPowerManager, game.shadowGenerator);
  const dokuzKatYeralti = new DokuzKatYeralti(game.scene, kamPowerManager, game.shadowGenerator);
  const bossErlikHan = new BossErlikHan(450, -72, game.scene, game.shadowGenerator);
  combat.registerBossErlikHan(bossErlikHan);
  const endingManager = new EndingManager(game.scene);

  // Oyuncu Işınlanma Dinleyicisi (Yeraltı & Yeni Oyun+)
  EventBus.on('player:teleport', (data: { x: number; y: number; z: number }) => {
    player.position.set(data.x, data.y, data.z);
    ayaz.root.position.copyFrom(player.position);
  });

  // 36. Giriş Yöneticisi (Floating Joystick, Pençe Tutuş, Çömelme, Silah/Ok Değişimi, İvmeli Kamera)
  const inputManager = new InputManager();

  // Sıfır GC Ok Atışı
  const fireArrowAtCameraTarget = () => {
    scratchArrowOrigin.copyFrom(ayaz.root.position);
    scratchArrowOrigin.y += 1.35;

    const forwardX = Math.sin(cameraRig.yaw);
    const forwardZ = Math.cos(cameraRig.yaw);
    const pitchY = Math.tan(-cameraRig.pitch);

    scratchArrowDir.x = forwardX;
    scratchArrowDir.y = pitchY;
    scratchArrowDir.z = forwardZ;
    scratchArrowDir.normalize();

    combat.shootArrow(scratchArrowOrigin, scratchArrowDir);
    ayaz.updateQuiverArrows(combat.arrowSystem.currentStock, combat.arrowSystem.selectedArrowType);
  };

  inputManager.setCombatCallbacks({
    onAttack: (isCharged: boolean) => {
      if (openingCutscene.isRunning) return;
      if (combat.actionState === 'BOW_AIM') {
        fireArrowAtCameraTarget();
        shrineManager.checkFireIgnition(player.position, 25.0);
        ergenekonValley.checkFireIgnition(player.position, 25.0);
        ergenekonShrines.checkFireIgnition(player.position, 25.0);
      } else if (player.locomotionState === 'AIRBORNE' || player.locomotionState === 'GLIDE') {
        player.triggerPlungeAttack(combat);
      } else {
        combat.triggerAttack(isCharged);
        world.wildlife.checkHit(player.position, 3.2, isCharged ? 50 : 25);
        shrineManager.checkInteract(player.position);
        ergenekonValley.checkInteract(player.position);
        ergenekonShrines.checkInteract(player.position);
        sahmaranLake.checkInteract(player.position);
        harapKoy.checkInteract(player.position);
        sahmaranAlly.checkInteract(player.position);
        sahmaranShrines.checkInteraction(player.position);
        bossSahmaran.checkInteract(player.position);
        gokZirve.checkInteract(player.position);
        umayShrine.checkInteract(player.position);
        dokuzKatYeralti.checkInteract(player.position, player);
      }
    },
    onChargeStart: () => {
      if (!openingCutscene.isRunning) combat.startCharge();
    },
    onChargeRelease: () => {
      if (!openingCutscene.isRunning) {
        combat.releaseCharge();
        world.wildlife.checkHit(player.position, 4.2, 60);
      }
    },
    onDodgeRoll: () => {
      if (!openingCutscene.isRunning) combat.triggerDodgeRoll(player.headingAngle);
    },
    onJump: () => {
      if (openingCutscene.isRunning) return;
      if (mountSystem.isMounted) {
        if (mountSystem.currentMount === 'TULPAR') {
          mountSystem.isTulparFlying = true;
          mountSystem.verticalVelocity = 12.0;
          ProceduralAudio.playTulparWingFlap();
        }
      } else {
        player.triggerJumpOrGlide(combat);
      }
    },
    onCrouchToggle: () => {
      if (!openingCutscene.isRunning) player.toggleCrouchOrDive();
    },
    onWeaponSwitch: (targetType?: WeaponType) => {
      const weaponCycle: WeaponType[] = ['KAM_SWORD', 'BATTLE_AXE', 'WAR_SPEAR'];
      let nextType = targetType;
      if (!nextType) {
        const idx = weaponCycle.indexOf(combat.activeWeapon);
        nextType = weaponCycle[(idx + 1) % weaponCycle.length];
      }
      combat.switchWeapon(nextType);
      ayaz.setEquippedWeapon(nextType);
    },
    onArrowSwitch: () => {
      const nextArrow = combat.arrowSystem.selectNextArrowType();
      ayaz.updateQuiverArrows(combat.arrowSystem.currentStock, nextArrow);
      ProceduralAudio.playButtonClick();
    },
    onSneakStrike: () => {
      const candidate = combat.checkSneakStrikeCandidate(player.position, player.headingAngle);
      if (candidate) {
        combat.triggerSneakStrike(candidate);
      }
    },
    onShield: (active: boolean) => {
      if (!openingCutscene.isRunning) combat.setShieldActive(active);
    },
    onBowAimToggle: () => {
      if (openingCutscene.isRunning) return;
      if (combat.actionState === 'BOW_AIM') {
        fireArrowAtCameraTarget();
        combat.setBowAim(false);
      } else {
        combat.setBowAim(true);
      }
    },
    onBowShoot: () => {
      if (openingCutscene.isRunning) return;
      fireArrowAtCameraTarget();
      combat.setBowAim(false);
    },
    onLockOnToggle: () => {
      if (!openingCutscene.isRunning) combat.toggleLockOn(player.position);
    },
    onPowerCast: () => {
      if (!openingCutscene.isRunning) {
        kamPowerManager.castActivePower(player.position, player.headingAngle, cameraRig.yaw, cameraRig.pitch, combat, player);
      }
    }
  });

  // Hızlı Yolculuk ve Işınlanma Olay Dinleyicileri
  EventBus.on('player:teleport', (data: { x: number; y: number; z: number }) => {
    player.position.set(data.x, data.y, data.z);
    ayaz.root.position.copyFrom(player.position);
    cameraRig.recenter(player.headingAngle);
    world.update(player.position, sky.isNight(), 0.016);
  });

  EventBus.on('fast_travel:request', (data: { benguId: string }) => {
    const targetPos = world.getBenguTasFastTravelPos(data.benguId);
    if (targetPos) {
      player.position.copyFrom(targetPos);
      ayaz.root.position.copyFrom(player.position);
      cameraRig.recenter(player.headingAngle);
      world.update(player.position, sky.isNight(), 0.016);
      ProceduralAudio.playBenguResonance();
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'Bengü Taş seni kutsal ışık sütunuyla taşıdı. Kut yanında olsun!'
      });
    }
  });

  EventBus.on('save:request', (data: { benguId: string }) => {
    saveSystem.saveFullGameState(
      'autosave',
      'Ötüken Obası (Bengü Taş)',
      player,
      combat,
      kamPowerManager,
      mountSystem,
      world,
      sky,
      weather,
      blightManager
    );
    ProceduralAudio.playBenguResonance();
  });

  EventBus.on('save:load_request', async (data: { slotId: string }) => {
    const loaded = await saveSystem.loadGame(data.slotId);
    if (loaded) {
      saveSystem.applyStateToGame(
        loaded,
        player,
        combat,
        kamPowerManager,
        mountSystem,
        world,
        sky,
        weather
      );
      if (mainMenu.isActive) {
        mainMenu.hideMenu();
      }
      game.scene.activeCamera = cameraRig.camera;
    }
  });

  EventBus.on('ui:menu_open', (data: { menuId: string }) => {
    if (data.menuId === 'kopuz') {
      kopuzModal.open();
    } else {
      destanModal.open(data.menuId as any);
    }
  });

  EventBus.on('inventory:open', () => {
    inventoryModal.open();
  });

  EventBus.on('inventory:close', () => {
    inventoryModal.close();
  });

  // Klavye Kısayolları (F/E = Konuş, I = Envanter, H = Binek, K = Kopuz, P/Esc = Destan Defteri / Duraklat)
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'f' || e.key === 'F' || e.key === 'e' || e.key === 'E') {
      if (!dialogueManager.isDialogueActive && npcManager.activeInteractableNPC) {
        dialogueManager.startDialogue(npcManager.activeInteractableNPC.dialogueId, npcManager.activeInteractableNPC.headMesh);
      }
    } else if (e.key === 'i' || e.key === 'I') {
      if (inventoryModal.isOpen) {
        inventoryModal.close();
      } else {
        inventoryModal.open();
      }
    } else if (e.key === 'h' || e.key === 'H') {
      mountSystem.callMount(player.position);
    } else if (e.key === 'k' || e.key === 'K') {
      if (kopuzModal.isOpen) {
        kopuzModal.close();
      } else {
        kopuzModal.open();
      }
    } else if (e.key === 'p' || e.key === 'P') {
      if (destanModal.isOpen) {
        destanModal.close();
      } else {
        destanModal.open('destan');
      }
    }
  });

  // 29. Grafik Kalite Yöneticisi
  const quality = new QualityManager(game.engine, game.shadowGenerator, foliage, game.pipeline);

  // 30. DOM HUD
  const hud = new HUD(() => {
    cameraRig.recenter(player.headingAngle);
  });

  // Börü Yoldaş Butonlarını HUD'a Bağla (Kokla & Emir Sistemi)
  hud.setupBoruCallbacks({
    onSniff: () => {
      const beaconPos = questManager.getActiveBeaconPos();
      if (beaconPos) {
        boru.sniff(new Vector3(beaconPos.x, beaconPos.y, beaconPos.z), 'Aktif Görev');
      } else {
        const b = world.landmarks.benguTaslar[0];
        boru.sniff(b.position, b.name);
      }
    },
    onFollow: () => boru.setCommand('FOLLOW'),
    onStay: () => boru.setCommand('STAY'),
    onAttack: () => {
      boru.setCommand('ATTACK');
      const nearest = combat.enemies.find((e) => !e.isDead && Vector3.Distance(player.position, e.position) < 22.0);
      if (nearest) {
        boru.performBiteAttack(nearest.position);
      }
    }
  });

  // FAZ 6: KAM GÜÇLERİ VE GÜÇ ÇARKI ETKİLEŞİMLERİ
  hud.setupPowerCallbacks({
    onCastPower: () => {
      if (openingCutscene.isRunning) return;
      kamPowerManager.castActivePower(
        player.position,
        player.headingAngle,
        cameraRig.yaw,
        cameraRig.pitch,
        combat,
        player
      );
      shrineManager.checkFireIgnition(player.position, 8.0);
      shrineManager.checkWindBlow(player.position, 6.0);
      achievementManager.unlock('ACH_FIRE_POWER');
    },
    onOpenPowerWheel: () => {
      if (!openingCutscene.isRunning) {
        powerWheelModal.openWheel();
      }
    }
  });

  // FAZ 7: BİNEK VE AT ISLIĞI ETKİLEŞİMLERİ
  hud.setupMountCallbacks({
    onCallMount: () => {
      if (openingCutscene.isRunning) return;
      mountSystem.callMount(player.position);
    },
    onToggleMount: () => {
      if (openingCutscene.isRunning) return;
      if (mountSystem.isMounted) {
        mountSystem.dismount(player);
        hud.setMountButtonVisible(true, 'BİN');
      } else {
        const wildHorse = mountSystem.checkWildHorseMount(player.position, world.wildlife);
        if (wildHorse) {
          mountSystem.mount('HORSE', player);
          hud.setMountButtonVisible(true, 'İN');
        } else if (mountSystem.tulpar.root.isEnabled()) {
          mountSystem.mount('TULPAR', player);
          hud.setMountButtonVisible(true, 'İN');
        } else {
          mountSystem.callMount(player.position);
        }
      }
    }
  });

  // Başlangıç Konumlandırması: Yer-Sub başlangıç platosu (Ötüken Obası önü, x: 0, z: 0)
  const initialGroundHeight = world.getHeightAt(0, 0);
  player.position.set(0, initialGroundHeight, 0);
  ayaz.root.position.copyFrom(player.position);
  cameraRig.recenter(player.headingAngle);

  world.update(player.position, sky.isNight(), 0.016);

  // 36. FAZ 8: YATAY CANLI 3D ANA MENÜ
  const mainMenu = new MainMenu(
    game.scene,
    (loadedSave) => {
      game.scene.activeCamera = cameraRig.camera;
      if (loadedSave) {
        saveSystem.applyStateToGame(
          loadedSave,
          player,
          combat,
          kamPowerManager,
          mountSystem,
          world,
          sky,
          weather
        );
      } else {
        openingCutscene.start();
      }
    },
    () => destanModal.open('settings'),
    () => destanModal.open('settings')
  );

  // Başlangıçta 3D Bay Terek menü kamerasını aktif yap
  game.scene.activeCamera = mainMenu.menuCamera;

  let footstepTimer = 0;

  // FAZ 12: Capacitor & Android Uygulama Yaşam Döngüsü (Arka Planda Duraksatma, Geri Tuşu)
  let isAppInBackground = false;

  const handlePauseApp = () => {
    isAppInBackground = true;
    ProceduralAudio.suspend();
    audioSystem.suspend();
  };

  const handleResumeApp = () => {
    isAppInBackground = false;
    ProceduralAudio.resume();
    audioSystem.resume();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handlePauseApp();
    } else {
      handleResumeApp();
    }
  });

  try {
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        handlePauseApp();
      } else {
        handleResumeApp();
      }
    });

    App.addListener('backButton', () => {
      const openModal = document.querySelector('.modal[style*="display: flex"], .modal[style*="display: block"]');
      if (openModal) {
        EventBus.emit('ui:menu_close');
        EventBus.emit('ui:settings_close');
      } else {
        EventBus.emit('ui:settings_open');
      }
    });
  } catch {
    // Tarayıcı ortamında Capacitor App dinleyicisi yoksa sessizce geç
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal[style*="display: flex"], .modal[style*="display: block"]');
      if (openModal) {
        EventBus.emit('ui:menu_close');
        EventBus.emit('ui:settings_close');
      } else {
        EventBus.emit('ui:settings_open');
      }
    }
  });

  // 31. 60 FPS Ana Render Döngüsü (Sıfır GC Tahsisi)
  game.startRenderLoop((deltaTime: number) => {
    // 1. Arka Plana Atılınca Duraklat (Lifecycle Pause)
    if (document.hidden || isAppInBackground) return;

    // 2. Ana Menü Aktifken 3D Bay Terek Etrafında Dönüş
    if (mainMenu.isActive) {
      mainMenu.update(deltaTime);
      world.update(mainMenu.menuCamera.position, sky.isNight(), deltaTime);
      sky.update(deltaTime, mainMenu.menuCamera.position);
      return;
    }

    // 3. Açılış Sinematiği Sırasında Kamera ve Zaman Kontrolü
    if (openingCutscene.isRunning) {
      openingCutscene.update(deltaTime);
      world.update(player.position, sky.isNight(), deltaTime);
      sky.update(deltaTime, player.position);
      water.update(deltaTime, sky.sunLight.direction, cameraRig.camera.position);
      return;
    }

    // 4. FAZ 9: Ergenekon Vadisi Çıkışı & TULPAR Sinematiği
    if (ergenekonCutscene.isRunning) {
      ergenekonCutscene.update(deltaTime);
      world.update(player.position, sky.isNight(), deltaTime);
      sky.update(deltaTime, player.position);
      return;
    }

    // Ergenekon Çıkış Sinematiği Tetikleyici (Demir Dağ Bekçisi yenildikten sonra)
    if (bossDemirDag.isDead && !ergenekonCutscene.isRunning && !mountSystem.isTulparUnlocked) {
      if (Vector3.Distance(player.position, new Vector3(184, player.position.y, 72)) < 16.0) {
        ergenekonCutscene.startCutscene(player.position);
      }
    }

    // 5. FAZ 10: Şahmaran Arınışı & SU KUTU Sinematiği
    if (sahmaranCutscene.isRunning) {
      sahmaranCutscene.update(deltaTime);
      world.update(player.position, sky.isNight(), deltaTime);
      sky.update(deltaTime, player.position);
      return;
    }

    // Şahmaran Arınma / Yelbegen Zaferi Sinematiği Tetikleyici (Boss yenildikten sonra)
    if ((bossSahmaran.isDead || bossYelbegen.isDead) && !sahmaranCutscene.isRunning && !kamPowerManager.hasSuKutu) {
      if (
        (bossSahmaran.isDead && Vector3.Distance(player.position, bossSahmaran.position) < 22.0) ||
        (bossYelbegen.isDead && Vector3.Distance(player.position, bossYelbegen.position) < 25.0)
      ) {
        sahmaranCutscene.startCutscene(player.position);
      }
    }

    // Çim Alanında Gizlilik Kontrolü
    player.isCamouflaged = player.isCrouching && (Math.abs(player.position.x) < 400 && Math.abs(player.position.z) < 400);

    // Zaman Dilatasyonu (Kut Zamanı veya Havada Yay Nişanı %20 Hız)
    const effectiveDelta = deltaTime * combat.bulletTimeScale;

    const moveInput = inputManager.poll(deltaTime);
    const lookDelta = inputManager.consumeLookDelta();

    if (lookDelta.x !== 0 || lookDelta.y !== 0) {
      cameraRig.rotate(lookDelta.x, lookDelta.y);
    }

    combat.update(
      effectiveDelta,
      player.position,
      player.headingAngle,
      world,
      player.locomotionState === 'AIRBORNE' || player.locomotionState === 'GLIDE',
      player.footstepRadius,
      player.isCamouflaged,
      sky.isNight()
    );

    // FAZ 7: BİNEK SİSTEMİ GÜNCELLEMESİ
    if (mountSystem.isMounted) {
      mountSystem.update(
        moveInput.magnitude,
        moveInput.x,
        moveInput.y,
        cameraRig.yaw,
        moveInput.isRunRequested,
        false,
        player,
        combat,
        effectiveDelta
      );

      // Binek sırtında oturuş pozu (üst gövde ok atışı veya silaha izin verir)
      ayaz.lThighNode.rotation.x = 1.05;
      ayaz.lThighNode.rotation.z = -0.32;
      ayaz.lCalfNode.rotation.x = -1.15;
      ayaz.rThighNode.rotation.x = 1.05;
      ayaz.rThighNode.rotation.z = 0.32;
      ayaz.rCalfNode.rotation.x = -1.15;

      hud.setMountButtonVisible(true, 'İN');
    } else {
      player.update(moveInput, cameraRig.yaw, world, combat, effectiveDelta);

      // Yakında yabani at var mı kontrol et
      const wildNear = mountSystem.checkWildHorseMount(player.position, world.wildlife);
      if (wildNear || (mountSystem.tulpar.root.isEnabled() && Vector3.Distance(player.position, mountSystem.tulpar.root.position) < 3.2)) {
        hud.setMountButtonVisible(true, 'BİN');
      } else {
        hud.setMountButtonVisible(false);
      }
    }

    // FAZ 7: ENVANTER VE SÜRELİ YEMEK BUFFLARI
    inventoryManager.update(deltaTime, combat, player, kamPowerManager);

    // FAZ 7: 3D EŞYA ÖNİZLEME (Envanter açıkken döner)
    if (inventoryModal.isOpen) {
      item3DPreview.update(deltaTime);
    }

    // Okların yaban hayvanlarına ve düşmanlara isabet kontrolü
    for (const arrow of combat.arrowSystem.activeArrows) {
      if (!arrow.isStuck) {
        world.wildlife.checkHit(arrow.root.position, 1.4, arrow.damage);
      }
    }

    // Kara Kış Kirlenmesi Kontrolü (İçerideyken Kut Gücü yenilenmez)
    blightManager.update(player.position, deltaTime);

    // Yer Kutu'nun Alınması ve Bay Terek'in Dirilişi Kontrolü
    if (tepegoz.checkClaimYerKutu(player.position, world)) {
      kamPowerManager.hasYerKutu = true;
    }

    // Cephanelik Ok İkmali Kontrolü (Antrenman Sahası Tezgahı)
    if (trainingGround.isNearAmmoRack(player.position) && combat.arrowSystem.currentStock < 35) {
      combat.arrowSystem.refillAllAmmo();
      ayaz.updateQuiverArrows(combat.arrowSystem.currentStock, combat.arrowSystem.selectedArrowType);
      ProceduralAudio.playButtonClick();
    }

    // Oba Kamp Ateşi Dinlenme & Şifa Mekaniği (3.5m etki alanı)
    const firePos = world.landmarks.campfirePos;
    const dxFire = player.position.x - firePos.x;
    const dzFire = player.position.z - firePos.z;
    if (dxFire * dxFire + dzFire * dzFire < 12.25) {
      if (combat.health < combat.maxHealth) {
        combat.health = Math.min(combat.maxHealth, combat.health + 8.0 * deltaTime);
      }
      if (combat.stamina < combat.maxStamina) {
        combat.stamina = Math.min(combat.maxStamina, combat.stamina + 25.0 * deltaTime);
      }
      kamPowerManager.restoreKutPower(20.0 * deltaTime);
    }

    // Bengü Taş Yanında Kut Gücü Dolumu (+35 KP/s)
    const isNearBengu = world.landmarks.benguTaslar.some(
      (b) => Vector3.Distance(player.position, b.position) < 8.0
    );
    if (isNearBengu) {
      kamPowerManager.restoreKutPower(35.0 * deltaTime);
    }

    // FAZ 6: VERİ TABANLI ELEMENT SİSTEMİ GÜNCELLEMESİ
    elementSystem.update(
      deltaTime,
      weather.currentWeather === 'RAIN' || weather.currentWeather === 'STORM',
      weather.wetness
    );

    // Fırtınada Metal Silahta Yıldırım Çekme Riski Kontrolü
    const isMetalWeapon =
      combat.activeWeapon === 'KAM_SWORD' ||
      combat.activeWeapon === 'BATTLE_AXE' ||
      combat.activeWeapon === 'WAR_SPEAR';

    elementSystem.checkMetalLightningRisk(
      player.position,
      isMetalWeapon && combat.actionState !== 'BOW_AIM',
      weather.currentWeather === 'STORM',
      deltaTime,
      (damage) => {
        combat.health = Math.max(0, combat.health - damage);
        combat.addCameraTrauma(0.8);
      }
    );

    // FAZ 6: KAM GÜÇLERİ, MERMİLER VE PASİFLER GÜNCELLEMESİ
    kamPowerManager.update(deltaTime, combat, player, elementSystem);

    // FAZ 6: ANTİK MABETLERİN BULMACALARI VE ETKİLEŞİMİ (Ateş ve Rüzgâr Mabedi)
    shrineManager.update(deltaTime, player.position, player.headingAngle);

    // FAZ 9: SICAKLIK, LAV, ERGENEKON VADİSİ VE MABETLER
    const currentBiomeForTemp = world.getBiomeAt(player.position.x, player.position.z, player.position.y);
    temperatureSystem.update(deltaTime, player.position, currentBiomeForTemp.name, sky.isNight(), combat);
    lavaSystem.update(deltaTime, player, combat);
    ergenekonValley.update(deltaTime, player.position, combat);
    ergenekonShrines.update(deltaTime, player.position);

    // FAZ 10: SU ALTI SİSTEMİ, ŞAHMARAN GÖLÜ, HARAP KÖY, MÜTTEFİK ŞAHMARAN VE MABETLER
    underwaterSystem.update(deltaTime, player, combat, kamPowerManager);
    sahmaranLake.update(deltaTime, player.position);
    harapKoy.update(deltaTime, player.position);
    sahmaranAlly.update(deltaTime);
    sahmaranShrines.update(deltaTime, player.position);

    // FAZ 11: GÖK ZİRVE, UMAY MABETLERİ, DOKUZ KAT YERALTI & ERLİK HAN GÜNCELLEMESİ
    gokZirve.update(deltaTime, player, combat);
    umayShrine.update(deltaTime, player.position);
    dokuzKatYeralti.update(deltaTime, player, combat);

    // BÖRÜ YOLDAŞ KURT GÜNCELLEMESİ (Tehlike ve Kadim Sır Sezisi)
    const isDangerNearby =
      combat.enemies.some((e) => !e.isDead && Vector3.Distance(player.position, e.position) < 24.0) ||
      (!tepegoz.isDead && Vector3.Distance(player.position, tepegoz.position) < 40.0);

    const isSecretNearby = world.landmarks.benguTaslar.some(
      (b) => !b.discovered && Vector3.Distance(player.position, b.position) < 28.0
    );

    boru.update(
      player.position,
      player.headingAngle,
      player.currentSpeed,
      player.isCrouching,
      world,
      effectiveDelta,
      isDangerNearby,
      isSecretNearby
    );

    // 3D NPC GÜNCELLEMESİ (Baş/Gövde Dönüşü & Gün-Gece Rutini)
    const nearbyNpc = npcManager.update(player.position, effectiveDelta, sky.isNight());

    // CANLI 3D PORTRE GÜNCELLEMESİ (Aktif Konuşmacı Varsa)
    if (livePortrait.isActive) {
      livePortrait.update(deltaTime, nearbyNpc?.headMesh);
    }

    // GÖĞE YÜKSELEN IŞIK SÜTUNU İŞARETÇİSİ
    beaconPillar.update(deltaTime);

    // BOTW STİLİ YATAY PUSULA ŞERİDİ
    compassRibbon.update(player.position, cameraRig.yaw);

    // OBA YENİDEN İNŞASI (Şaman Davulu ve Çadırlar)
    const distToOba = Math.hypot(player.position.x, player.position.z);
    villageReconstruction.update(deltaTime, distToOba < 45.0);

    // DİNAMİK MİNİMAP GÜNCELLEMESİ (Sıfır GC)
    minimap.update(player.position, player.headingAngle, cameraRig.yaw);

    // DÜNYA HARİTASI OYUNCU İŞARETÇİSİ (Açıkken)
    if (worldMapModal.isOpen) {
      worldMapModal.updatePlayer(player.position, player.headingAngle);
    }

    const isBowAiming = combat.actionState === 'BOW_AIM' || combat.actionState === 'BOW_SHOOT';
    const lockPos = combat.lockedTarget ? combat.lockedTarget.position : null;

    cameraRig.update(
      player.position,
      world,
      deltaTime,
      combat.cameraShakeOffset,
      isBowAiming,
      lockPos,
      player.headingAngle,
      moveInput.magnitude > 0.05,
      player.currentSpeed,
      player.isGlidingActive
    );

    // Dünya, Gökkubbe, Su ve Hava Durumu Güncellemeleri
    world.update(player.position, sky.isNight(), deltaTime);
    sky.update(effectiveDelta, player.position);
    water.update(effectiveDelta, sky.sunLight.direction, cameraRig.camera.position);

    const activeBiome = world.getBiomeAt(player.position.x, player.position.z, player.position.y);
    weather.update(player.position, activeBiome, effectiveDelta);

    quality.update(hud.currentFps, deltaTime);

    // FAZ 8: KAYIT SÜRESİ, 2 DAKİKALIK OTOMATİK KAYIT & KOPUZ GÜNCELLEMESİ
    saveSystem.update(
      deltaTime,
      `Ötüken Obası (${activeBiome.name})`,
      player,
      combat,
      kamPowerManager,
      mountSystem,
      world,
      sky,
      weather,
      blightManager
    );
    kopuzSystem.update(player.position, deltaTime);

    // Müzik Katmanı Yönetimi (Exploration, Night, Combat, Boss, Cave/Water)
    if (
      (!tepegoz.isDead && Vector3.Distance(player.position, tepegoz.position) < 45.0) ||
      (!bossDemirDag.isDead && Vector3.Distance(player.position, bossDemirDag.position) < 55.0) ||
      (!bossSahmaran.isDead && Vector3.Distance(player.position, bossSahmaran.position) < 55.0) ||
      (!bossYelbegen.isDead && Vector3.Distance(player.position, bossYelbegen.position) < 60.0) ||
      (!bossErlikHan.isDead && Vector3.Distance(player.position, bossErlikHan.position) < 60.0)
    ) {
      audioSystem.switchMusicLayer('BOSS');
    } else if (combat.enemies.some((e) => !e.isDead && Vector3.Distance(player.position, e.position) < 22.0)) {
      audioSystem.switchMusicLayer('COMBAT');
    } else if (player.locomotionState === 'SWIM' || player.locomotionState === 'DIVE') {
      audioSystem.switchMusicLayer('CAVE_WATER');
    } else if (sky.isNight()) {
      audioSystem.switchMusicLayer('NIGHT');
    } else {
      audioSystem.switchMusicLayer('EXPLORATION');
    }

    // Zemine Göre Ayak Sesleri (Grass, Stone, Water, Snow)
    if (player.locomotionState === 'GROUND' && player.currentSpeed > 0.5) {
      footstepTimer += deltaTime * (player.currentSpeed / player.runSpeed);
      if (footstepTimer >= 0.38) {
        footstepTimer = 0;
        const surface: FootstepSurface = activeBiome.name.includes('KAR')
          ? 'SNOW'
          : activeBiome.name.includes('KAYA')
          ? 'STONE'
          : 'GRASS';
        audioSystem.playSurfaceFootstep(surface);
      }
    } else if (player.locomotionState === 'SWIM' && player.currentSpeed > 0.5) {
      footstepTimer += deltaTime;
      if (footstepTimer >= 0.55) {
        footstepTimer = 0;
        audioSystem.playSurfaceFootstep('WATER');
      }
    }

    ProceduralAudio.updateAmbience(
      activeBiome.name,
      sky.isNight(),
      weather.currentWeather === 'RAIN',
      weather.currentWeather === 'STORM'
    );

    // HUD Güncellemesi (NPC konuşma istemi ve aktif görev kartı dahil)
    hud.update(
      combat,
      player,
      activeBiome.name,
      deltaTime,
      game.scene,
      nearbyNpc
    );

    // FAZ 12: Uyarlanabilir Performans & Termal İzleme Güncellemesi
    adaptiveQuality.update(deltaTime);
  });

  console.log("=== ÖTÜKEN SİSTEMİ FAZ 8 HAZIR (KAYIT, SES, KOPUZ, AYARLAR, BAŞARIMLAR) ===");
});
