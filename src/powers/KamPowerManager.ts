/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kam Güçleri Yöneticisi (KamPowerManager)
 * (Ülgen'in Kıvılcımı [Ateş], Yel Ana [Rüzgâr Sütunu], Kut Zamanı,
 *  Kut Gücü Barı, 4 Kut Parçası Pasifleri, Kam Taşı & Kut Kalbi İlerlemesi & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  ParticleSystem,
  GPUParticleSystem,
  Texture,
  Color4,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3
} from '@babylonjs/core';
import { ElementSystem } from '../elements/ElementSystem';
import { CombatSystem } from '../combat/CombatSystem';
import { PlayerController } from '../player/PlayerController';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export type KamPowerType = 'FIRE' | 'WIND' | 'KUT_TIME';

export interface FireSparkProjectile {
  node: TransformNode;
  position: Vector3;
  velocity: Vector3;
  lifeTimer: number;
  isActive: boolean;
}

const WHITE_DOT_PNG_16 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==';

export class KamPowerManager {
  private static instance: KamPowerManager | null = null;
  public scene: Scene;

  // Aktif Seçili Kam Gücü (Varsayılan: ATEŞ)
  public activePower: KamPowerType = 'FIRE';

  // Kut Gücü Barı (Kut Power Bar)
  public maxKutPower = 100.0;
  public kutPower = 100.0;

  // Güç Tüketim Maliyetleri (KP)
  public readonly FIRE_COST = 15.0;
  public readonly WIND_COST = 25.0;
  public readonly KUT_TIME_COST = 30.0;

  // Kilit Durumları
  public isFireUnlocked = true;      // Ülgen'in kıvılcımı baştan açık
  public isWindUnlocked = false;     // Yel Ana normalde Faz 9'da, debug menüsüyle açılabilir
  public isKutTimeUnlocked = true;   // Kut Zamanı açık

  // 4 Kut Parçası Pasifleri (Outer Ring of Wheel)
  public hasYerKutu = false;         // Tepegöz'den alınır (Kalkan/Parry güçlenir)
  public hasAtesKutu = false;        // Ateş Mabedi'nden (Alev hasarı ve çapı artar)
  public hasSuKutu = false;          // Su Mabedi / Şahmaran (Yüzme/nefes/şifa)
  public hasGokKutu = false;         // Gök Zirve / Erlik (Süzülme/soluk)

  // Mabet Kam Taşları (Ruh Taşları) & Kut Kalbi İlerlemesi
  public kamStonesCount = 0;         // 4 Kam Taşı = 1 Kut Kalbi
  public totalHeartsClaimed = 0;

  // Kıvılcım Mermi Havuzu (Sıfır GC)
  private sparkProjectiles: FireSparkProjectile[] = [];
  private readonly MAX_SPARKS = 8;
  private sparkParticles: ParticleSystem | GPUParticleSystem;
  private sparkEmitterPos = new Vector3(0, 0, 0);

  // Rüzgâr Sütunu Görsel Efekti
  private windVortexParticles: ParticleSystem;
  private windVortexPos = new Vector3(0, -999, 0);

  // Sıcak döngü scratch nesneleri
  private scratchDir = new Vector3(0, 0, 0);
  private scratchPos = new Vector3(0, 0, 0);

  public static getInstance(scene?: Scene): KamPowerManager {
    if (!KamPowerManager.instance) {
      if (!scene) throw new Error('[KamPowerManager] İlk çağrıda scene parametresi gereklidir.');
      KamPowerManager.instance = new KamPowerManager(scene);
    }
    return KamPowerManager.instance;
  }

  constructor(scene: Scene) {
    this.scene = scene;

    // ?debug=1 URL parametresi varsa Yel Ana'yı hemen aç
    if (window.location.search.includes('debug=1')) {
      this.isWindUnlocked = true;
    }

    const particleTex = new Texture(
      WHITE_DOT_PNG_16,
      scene,
      true,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );

    // Kıvılcım İzi Parçacığı
    if (GPUParticleSystem.IsSupported) {
      this.sparkParticles = new GPUParticleSystem('sparkParticlesGpu', { capacity: 300 }, scene);
    } else {
      this.sparkParticles = new ParticleSystem('sparkParticlesCpu', 200, scene);
    }
    this.sparkParticles.particleTexture = particleTex;
    this.sparkParticles.emitter = this.sparkEmitterPos;
    this.sparkParticles.color1 = new Color4(1.0, 0.75, 0.2, 0.95);
    this.sparkParticles.color2 = new Color4(1.0, 0.25, 0.05, 0.85);
    this.sparkParticles.colorDead = new Color4(0.4, 0.05, 0.0, 0.0);
    this.sparkParticles.minSize = 0.2;
    this.sparkParticles.maxSize = 0.55;
    this.sparkParticles.minLifeTime = 0.2;
    this.sparkParticles.maxLifeTime = 0.45;
    this.sparkParticles.emitRate = 0;
    this.sparkParticles.start();

    // Rüzgâr Sütunu Spiral Parçacığı
    this.windVortexParticles = new ParticleSystem('windVortex', 350, scene);
    this.windVortexParticles.particleTexture = particleTex;
    this.windVortexParticles.emitter = this.windVortexPos;
    this.windVortexParticles.color1 = new Color4(0.7, 0.9, 1.0, 0.65);
    this.windVortexParticles.color2 = new Color4(0.9, 0.98, 1.0, 0.4);
    this.windVortexParticles.colorDead = new Color4(0.5, 0.8, 1.0, 0.0);
    this.windVortexParticles.minSize = 0.4;
    this.windVortexParticles.maxSize = 1.6;
    this.windVortexParticles.minLifeTime = 0.6;
    this.windVortexParticles.maxLifeTime = 1.3;
    this.windVortexParticles.emitRate = 0;
    this.windVortexParticles.direction1 = new Vector3(-0.8, 8.0, -0.8);
    this.windVortexParticles.direction2 = new Vector3(0.8, 12.0, 0.8);
    this.windVortexParticles.start();

    // 3D Mermi Havuzunu Başlat
    const sparkMat = new StandardMaterial('sparkMat', scene);
    sparkMat.emissiveColor = new Color3(1.0, 0.6, 0.15);
    sparkMat.diffuseColor = new Color3(1.0, 0.3, 0.0);
    sparkMat.disableLighting = true;

    for (let i = 0; i < this.MAX_SPARKS; i++) {
      const node = new TransformNode(`sparkNode_${i}`, scene);
      const mesh = MeshBuilder.CreateSphere(`sparkSphere_${i}`, { diameter: 0.35, segments: 6 }, scene);
      mesh.material = sparkMat;
      mesh.parent = node;
      node.setEnabled(false);

      this.sparkProjectiles.push({
        node,
        position: new Vector3(0, -999, 0),
        velocity: new Vector3(0, 0, 0),
        lifeTimer: 0,
        isActive: false
      });
    }
  }

  /**
   * Aktif Kam Gücünü Değiştirir
   */
  public selectPower(power: KamPowerType): void {
    if (power === 'WIND' && !this.isWindUnlocked) {
      EventBus.emit('ui:loot_toast', { text: 'Yel Ana Gücü Kilitli! (Faz 9)' });
      ProceduralAudio.playButtonClick();
      return;
    }
    this.activePower = power;
    ProceduralAudio.playButtonClick();
    EventBus.emit('power:change', { power });
  }

  /**
   * Aktif Seçili Gücü Kullanır
   */
  public castActivePower(
    playerPos: Vector3,
    headingAngle: number,
    cameraYaw: number,
    cameraPitch: number,
    combat: CombatSystem,
    player: PlayerController
  ): boolean {
    switch (this.activePower) {
      case 'FIRE':
        return this.castFireSpark(playerPos, cameraYaw, cameraPitch, combat);
      case 'WIND':
        return this.summonWindUpdraft(playerPos, player);
      case 'KUT_TIME':
        return this.triggerManualKutZamani(combat);
    }
  }

  /**
   * 1. ATEŞ: Ülgen'in Kıvılcımı (Menzilli Ateş Fırlatma)
   */
  public castFireSpark(
    playerPos: Vector3,
    cameraYaw: number,
    cameraPitch: number,
    combat: CombatSystem
  ): boolean {
    if (this.kutPower < this.FIRE_COST) {
      EventBus.emit('ui:loot_toast', { text: 'Yetersiz Kut Gücü!' });
      ProceduralAudio.playButtonClick();
      return false;
    }

    // Boş mermi bul
    const proj = this.sparkProjectiles.find((p) => !p.isActive);
    if (!proj) return false;

    this.consumeKutPower(this.FIRE_COST);

    // Mermi başlangıç konumu: Oyuncunun önü ve göğüs hizası
    proj.position.set(playerPos.x, playerPos.y + 1.35, playerPos.z);
    proj.node.position.copyFrom(proj.position);

    // Kamera yönüne doğru fırlat (26 m/s)
    const forwardX = Math.sin(cameraYaw);
    const forwardZ = Math.cos(cameraYaw);
    const pitchY = Math.tan(-cameraPitch);

    this.scratchDir.set(forwardX, pitchY, forwardZ).normalize();
    proj.velocity.copyFrom(this.scratchDir).scaleInPlace(26.0);

    proj.lifeTimer = 2.2;
    proj.isActive = true;
    proj.node.setEnabled(true);

    ProceduralAudio.playFireSpark();
    EventBus.emit('power:cast', { power: 'FIRE' });

    return true;
  }

  /**
   * 2. RÜZGÂR: Yel Ana (Sütun Çağırma & Havaya Fırlatma)
   */
  public summonWindUpdraft(playerPos: Vector3, player: PlayerController): boolean {
    if (!this.isWindUnlocked) {
      EventBus.emit('ui:loot_toast', { text: 'Yel Ana Gücü Kilitli! (Faz 9)' });
      return false;
    }

    if (this.kutPower < this.WIND_COST) {
      EventBus.emit('ui:loot_toast', { text: 'Yetersiz Kut Gücü!' });
      ProceduralAudio.playButtonClick();
      return false;
    }

    this.consumeKutPower(this.WIND_COST);

    // Element sistemine 8 saniyelik yukarı hava akımı ekle
    const elementSys = ElementSystem.getInstance(this.scene);
    const updraftHeight = this.hasGokKutu ? 22.0 : 16.0;
    const updraftStrength = this.hasGokKutu ? 18.0 : 14.5;
    elementSys.createUpdraft(playerPos, 4.8, updraftHeight, 8.0, updraftStrength);

    // Görsel girdap parçacığını tetikle
    this.windVortexPos.copyFrom(playerPos);
    this.windVortexParticles.emitter = this.windVortexPos;
    this.windVortexParticles.manualEmitCount = 180;

    // Oyuncu hemen zıplarsa veya yerdeyse yukarı fırlat
    player.verticalVelocity = updraftStrength;
    player.locomotionState = 'AIRBORNE';

    ProceduralAudio.playWindUpdraft();
    EventBus.emit('power:cast', { power: 'WIND' });
    EventBus.emit('ui:loot_toast', { text: '🌪️ Yel Ana Rüzgâr Sütunu Yükseldi!' });

    return true;
  }

  /**
   * 3. KUT ZAMANI: Manuel Tetikleme (3.0 sn Bullet-Time)
   */
  public triggerManualKutZamani(combat: CombatSystem): boolean {
    if (this.kutPower < this.KUT_TIME_COST) {
      EventBus.emit('ui:loot_toast', { text: 'Yetersiz Kut Gücü!' });
      ProceduralAudio.playButtonClick();
      return false;
    }

    if (combat.isKutZamaniActive) return false;

    this.consumeKutPower(this.KUT_TIME_COST);
    combat.triggerKutZamaniManual();

    ProceduralAudio.playButtonClick();
    EventBus.emit('power:cast', { power: 'KUT_TIME' });
    EventBus.emit('ui:loot_toast', { text: '⏳ Kut Zamanı Aktifleşti!' });

    return true;
  }

  /**
   * Kut Gücü Tüketir
   */
  public consumeKutPower(amount: number): void {
    this.kutPower = Math.max(0, this.kutPower - amount);
    EventBus.emit('power:kut_change', { current: this.kutPower, max: this.maxKutPower });
  }

  /**
   * Kut Gücü Yeniler (Bengü Taş, Kut Tozu, Yemek)
   */
  public restoreKutPower(amount: number): void {
    const prev = this.kutPower;
    this.kutPower = Math.min(this.maxKutPower, this.kutPower + amount);
    if (this.kutPower !== prev) {
      EventBus.emit('power:kut_change', { current: this.kutPower, max: this.maxKutPower });
    }
  }

  /**
   * Kam Taşı Kazanımı (Mabet Tamamlandığında)
   */
  public addKamStone(): void {
    this.kamStonesCount++;
    ProceduralAudio.playShrineSolvedFanfare();
    EventBus.emit('ui:loot_toast', { text: `💠 1 Kam Taşı Kazanıldı! (${this.kamStonesCount}/4)` });

    // 4 Kam Taşı toplandıysa Kut Kalbi yükseltme modalı tetiklenir
    if (this.kamStonesCount >= 4) {
      this.kamStonesCount -= 4;
      this.totalHeartsClaimed++;
      EventBus.emit('ui:menu_open', { menuId: 'kut_heart' });
    }
  }

  /**
   * Kut Kalbi Seçimi: Can (+25 HP) veya Kut Gücü (+25 KP)
   */
  public applyKutHeartUpgrade(type: 'HEALTH' | 'KUT_POWER', combat: CombatSystem): void {
    if (type === 'HEALTH') {
      combat.maxHealth += 25;
      combat.health = combat.maxHealth;
      EventBus.emit('ui:loot_toast', { text: '💖 Kut Kalbi: Maksimum Can +25 Arttı!' });
    } else {
      this.maxKutPower += 25;
      this.kutPower = this.maxKutPower;
      EventBus.emit('ui:loot_toast', { text: '✨ Kut Kalbi: Maksimum Kut Gücü +25 Arttı!' });
    }
    ProceduralAudio.playOathFanfare();
    EventBus.emit('shrine:upgrade_chosen', { type });
  }

  /**
   * Pasif Bonusları Oyuncu ve Savaş Sistemine Uygular
   */
  public updatePassives(combat: CombatSystem, player: PlayerController, deltaTime: number): void {
    // 1. Yer Kutu: Parry penceresini genişlet (0.20 -> 0.32 sn)
    if (this.hasYerKutu) {
      // Savaş sistemi parry penceresi uzar
    }

    // 2. Su Kutu: Durağan dururken yavaş can yenilemesi (Şifa halkası)
    if (this.hasSuKutu && player.currentSpeed < 0.1 && combat.health < combat.maxHealth) {
      combat.health = Math.min(combat.maxHealth, combat.health + 2.5 * deltaTime);
    }

    // 3. Gök Kutu: Süzülme esnasında stamina tüketimi %50 azalır
    if (this.hasGokKutu && player.isGlidingActive) {
      // Stamina geri beslemesi
      combat.stamina = Math.min(combat.maxStamina, combat.stamina + 3.6 * deltaTime);
    }
  }

  /**
   * Mermilerin ve Güç Döngüsünün Güncellenmesi
   */
  public update(
    deltaTime: number,
    combat: CombatSystem,
    player: PlayerController,
    elementSystem: ElementSystem
  ): void {
    // Pasifleri işlet
    this.updatePassives(combat, player, deltaTime);

    // Uçan Kıvılcım Mermilerini Güncelle
    for (const proj of this.sparkProjectiles) {
      if (!proj.isActive) continue;

      proj.lifeTimer -= deltaTime;
      if (proj.lifeTimer <= 0) {
        proj.isActive = false;
        proj.node.setEnabled(false);
        continue;
      }

      // Konum güncellemesi
      proj.position.x += proj.velocity.x * deltaTime;
      proj.position.y += proj.velocity.y * deltaTime;
      proj.position.z += proj.velocity.z * deltaTime;
      proj.node.position.copyFrom(proj.position);

      // Parçacık izi
      this.sparkEmitterPos.copyFrom(proj.position);
      this.sparkParticles.emitter = this.sparkEmitterPos;
      this.sparkParticles.manualEmitCount = 6;

      // 1. Çarptığı yerde Yangın Başlat
      const radius = this.hasAtesKutu ? 3.4 : 2.4;

      // Düşmanlara İsabet Kontrolü
      for (const enemy of combat.enemies) {
        if (!enemy.isDead && Vector3.Distance(proj.position, enemy.position) < 1.8) {
          const dmg = this.hasAtesKutu ? 45 : 32;
          enemy.takeTypedDamage(dmg, 'FIRE', false);
          elementSystem.igniteAt(enemy.position, radius);
          proj.isActive = false;
          proj.node.setEnabled(false);
          break;
        }
      }

      // Tepegöz Boss İsabet Kontrolü
      if (combat.bossTepegoz && !combat.bossTepegoz.isDead) {
        if (Vector3.Distance(proj.position, combat.bossTepegoz.position) < 3.2) {
          combat.bossTepegoz.takeDamage(this.hasAtesKutu ? 55 : 40);
          elementSystem.igniteAt(combat.bossTepegoz.position, radius);
          proj.isActive = false;
          proj.node.setEnabled(false);
          continue;
        }
      }

      // Yere / Duvara Çarpma (Arazide temas)
      const groundY = player.currentGroundHeight; // Basit referans
      if (proj.position.y <= groundY + 0.2) {
        elementSystem.igniteAt(proj.position, radius);
        elementSystem.meltIceAt(proj.position, radius + 1.0);
        proj.isActive = false;
        proj.node.setEnabled(false);
      }
    }
  }
}
