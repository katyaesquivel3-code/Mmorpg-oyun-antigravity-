/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gelişmiş Savaş Sistemi (CombatSystem)
 * (Düşman Koordinatörü, 4 Düşman Türü, Kara Totem & Kamplar, Kara Kış Kirlenmesi,
 *  Ganimet Sistemi, Boss Tepegöz 3 Faz & Zayıf Noktalar, Telegraph & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Color4,
  ParticleSystem,
  TransformNode,
  Scalar
} from '@babylonjs/core';
import { TrainingDummy, DummyAttackEvent } from './TrainingDummy';
import { EnemyEntity } from './EnemyEntity';
import { BossTepegoz } from './BossTepegoz';
import { BossDemirDagBekcisi } from './BossDemirDagBekcisi';
import { BossSahmaran } from './BossSahmaran';
import { BossYelbegen } from './BossYelbegen';
import { BossErlikHan } from './BossErlikHan';
import { EnemyCampManager } from '../world/EnemyCampManager';
import { WinterBlightManager } from '../world/WinterBlightManager';
import { LootManager, LootType } from './LootManager';
import { EnemyCoordinator } from './EnemyCoordinator';
import { ArrowSystem } from './ArrowSystem';
import { DamageNumberManager } from './DamageNumberManager';
import { WorldManager } from '../world/WorldManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { SettingsStore } from '../infra/SettingsStore';
import { ElementSystem } from '../elements/ElementSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { InventoryManager } from '../inventory/InventoryManager';
import {
  WeaponType,
  DamageType,
  ArrowType,
  WEAPON_DEFINITIONS,
  ARROW_DEFINITIONS
} from './WeaponData';
import { AyazAnimState } from '../player/AyazModel';

export type CombatActionState = AyazAnimState;

export class CombatSystem {
  public scene: Scene;
  public arrowSystem: ArrowSystem;
  public damageNumbers: DamageNumberManager;
  public coordinator: EnemyCoordinator;
  public lootManager: LootManager;

  // Oyuncu Savaş Nitelikleri
  public maxHealth = 100;
  public health = 100;
  public maxStamina = 100;
  public stamina = 100;
  public staminaRegenRate = 28.0;
  private staminaRegenCooldown = 0;

  // Silah Yönetimi (Kam Kılıcı, Savaş Baltası, Kargı)
  public activeWeapon: WeaponType = 'KAM_SWORD';

  // Aktif Savaş Durum Makinesi
  public actionState: CombatActionState = 'IDLE';
  public actionTimer = 0;
  public comboWindowTimer = 0;
  public comboStep = 0;

  // Flurry Rush (Kut Saldırı Yağmuru)
  public isFlurryRush = false;
  public flurryStep = 0;
  public flurryTimer = 0;
  public readonly FLURRY_TOTAL_HITS = 5;

  // Şarjlı Saldırı
  public isCharging = false;
  public chargeHoldTime = 0;
  public readonly MIN_CHARGE_TIME = 0.55;

  // Kalkan & Parry (0.20 sn)
  public isShieldRaised = false;
  public parryWindowTimer = 0;
  public readonly PARRY_WINDOW = 0.20;

  // Kaçış & Kut Zamanı (%20 Hız, 3.0 sn)
  public isRolling = false;
  public rollTimer = 0;
  public readonly ROLL_DURATION = 0.45;
  public readonly ROLL_IFRAME_DURATION = 0.25;
  public isKutZamaniActive = false;
  public kutZamaniTimer = 0;
  public readonly KUT_ZAMANI_DURATION = 3.0;

  // Havada Bullet-Time Yay Nişanı (%20 Hız)
  public isAirborneAim = false;
  public bulletTimeScale = 1.0;

  // Kilitlenme, Düşmanlar, Boss ve Kamplar
  public lockedTarget: { position: Vector3 } | null = null;
  public dummies: TrainingDummy[] = [];
  public enemies: EnemyEntity[] = [];
  public bossTepegoz: BossTepegoz | null = null;
  public bossDemirDag: BossDemirDagBekcisi | null = null;
  public bossSahmaran: BossSahmaran | null = null;
  public bossYelbegen: BossYelbegen | null = null;
  public bossErlikHan: BossErlikHan | null = null;
  public campManager: EnemyCampManager | null = null;
  public blightManager: WinterBlightManager | null = null;

  // Hit-Stop Mikro-Donma
  public playerHitStopTimer = 0;

  // Kamera Sarsıntısı
  public cameraShakeTrauma = 0;
  public cameraShakeOffset = new Vector3(0, 0, 0);

  // Parçacık Sistemi
  private sparkSystem: ParticleSystem | null = null;
  private sparkEmitter: TransformNode;

  // Root Motion Ofseti
  public rootMotionOffset = new Vector3(0, 0, 0);

  // Sıcak döngü scratch nesneleri (Zero GC)
  private scratchDamagePos = new Vector3(0, 0, 0);
  private scratchHitNormal = new Vector3(0, 0, 0);

  constructor(scene: Scene, world: WorldManager) {
    this.scene = scene;
    this.arrowSystem = new ArrowSystem(scene);
    this.damageNumbers = new DamageNumberManager(scene);
    this.coordinator = EnemyCoordinator.getInstance();
    this.lootManager = new LootManager(scene);

    this.sparkEmitter = new TransformNode('spark_emitter', scene);
    this.initSparks();

    // 1. Kamp Alanı Talim Kuklaları
    const dummyPositions = [
      { id: '1', name: 'Talim Kuklası I', x: -3.5, z: 12.0, attacker: false },
      { id: '2', name: 'Talim Kuklası II', x: 0.0, z: 15.0, attacker: false },
      { id: '3', name: 'Talim Kuklası III', x: 3.5, z: 12.0, attacker: false },
      { id: '4', name: 'Usta Kukla (Saldıran)', x: 0.0, z: 8.5, attacker: true }
    ];

    for (let i = 0; i < dummyPositions.length; i++) {
      const d = dummyPositions[i];
      const dummy = new TrainingDummy(d.id, d.name, new Vector3(d.x, 0, d.z), d.attacker, scene, world);
      this.dummies.push(dummy);
    }
  }

  private initSparks(): void {
    const ps = new ParticleSystem('hit_sparks', 180, this.scene);
    ps.emitter = this.sparkEmitter as unknown as Vector3;
    ps.minEmitBox = new Vector3(-0.15, -0.15, -0.15);
    ps.maxEmitBox = new Vector3(0.15, 0.15, 0.15);
    ps.color1 = new Color4(1.0, 0.88, 0.35, 1.0);
    ps.color2 = new Color4(0.95, 0.45, 0.1, 0.9);
    ps.colorDead = new Color4(0.3, 0.1, 0.05, 0.0);
    ps.minSize = 0.05;
    ps.maxSize = 0.18;
    ps.minLifeTime = 0.08;
    ps.maxLifeTime = 0.22;
    ps.emitRate = 0;
    ps.gravity = new Vector3(0, -9.81, 0);
    ps.minEmitPower = 2.5;
    ps.maxEmitPower = 5.5;
    ps.start();
    this.sparkSystem = ps;
  }

  public emitSparksAt(pos: Vector3, count = 25): void {
    if (!this.sparkSystem) return;
    this.sparkEmitter.position.copyFrom(pos);
    this.sparkSystem.manualEmitCount = count;
  }

  public addCameraTrauma(amount: number): void {
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + amount);
  }

  public registerBoss(boss: BossTepegoz): void {
    this.bossTepegoz = boss;
  }

  public registerBossDemirDag(boss: BossDemirDagBekcisi): void {
    this.bossDemirDag = boss;
  }

  public registerBossSahmaran(boss: BossSahmaran): void {
    this.bossSahmaran = boss;
  }

  public registerBossYelbegen(boss: BossYelbegen): void {
    this.bossYelbegen = boss;
  }

  public registerBossErlikHan(boss: BossErlikHan): void {
    this.bossErlikHan = boss;
  }

  public registerCampManager(campManager: EnemyCampManager): void {
    this.campManager = campManager;
    const campEnemies = campManager.getAllEnemies();
    for (let i = 0; i < campEnemies.length; i++) {
      const ce = campEnemies[i];
      if (!this.enemies.includes(ce)) {
        this.enemies.push(ce);
      }
    }
  }

  public registerBlightManager(blightManager: WinterBlightManager): void {
    this.blightManager = blightManager;
  }

  public switchWeapon(type: WeaponType): void {
    this.activeWeapon = type;
    this.comboStep = 0;
    this.actionState = 'IDLE';
    ProceduralAudio.playButtonClick();
  }

  /**
   * Savaş Aksiyonları & 60 FPS Render Döngüsü Güncellemesi
   */
  public update(
    deltaTime: number,
    playerPos: Vector3,
    playerHeading: number,
    world: WorldManager,
    isAirborne = false,
    footstepRadius = 12.0,
    isCamouflaged = false,
    isNight = false
  ): void {
    // Hit-stop Mikro-Donma
    if (this.playerHitStopTimer > 0) {
      this.playerHitStopTimer -= deltaTime;
      return;
    }

    // Kamera Sarsıntısı Sönümlenmesi
    if (this.cameraShakeTrauma > 0) {
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - deltaTime * 1.8);
      const shakeFactor = this.cameraShakeTrauma * this.cameraShakeTrauma;
      this.cameraShakeOffset.x = (Math.random() - 0.5) * 0.45 * shakeFactor;
      this.cameraShakeOffset.y = (Math.random() - 0.5) * 0.45 * shakeFactor;
      this.cameraShakeOffset.z = (Math.random() - 0.5) * 0.45 * shakeFactor;
    } else {
      this.cameraShakeOffset.set(0, 0, 0);
    }

    // Havada Yay Nişanı (Mid-Air Bullet Time)
    this.isAirborneAim = this.actionState === 'BOW_AIM' && isAirborne;
    if (this.isAirborneAim) {
      this.bulletTimeScale = 0.20;
      this.stamina = Math.max(0, this.stamina - 20.0 * deltaTime);
      if (this.stamina <= 0) {
        this.actionState = 'IDLE';
        this.isAirborneAim = false;
      }
    } else if (this.isKutZamaniActive) {
      this.bulletTimeScale = 0.20;
    } else {
      this.bulletTimeScale = 1.0;
    }

    // Kut Zamanı Sayaç
    if (this.isKutZamaniActive) {
      this.kutZamaniTimer -= deltaTime;
      if (this.kutZamaniTimer <= 0) {
        this.exitKutZamani();
      }
    }

    // Stamina Yenilenmesi (Kara Kış Kirlenmesi içinde Kut yenilenmez!)
    const isBlockedByBlight = this.blightManager ? this.blightManager.isPlayerInsideBlight : false;
    if (this.staminaRegenCooldown > 0) {
      this.staminaRegenCooldown -= deltaTime;
    } else if (this.actionState !== 'BOW_AIM' && !this.isCharging && !isBlockedByBlight) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * deltaTime);
    }

    // Kombo & Parry Sayaçları
    if (this.comboWindowTimer > 0) {
      this.comboWindowTimer -= deltaTime;
      if (this.comboWindowTimer <= 0) {
        this.comboStep = 0;
      }
    }
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer -= deltaTime;
    }

    // Koordinatör & Uzamsal Izgara Güncellemesi (10-15 Hz Dilimleme)
    this.coordinator.update(deltaTime, this.enemies);

    // Düşmanların ve Kuklaların Güncellenmesi
    this.updateEnemies(deltaTime, playerPos, world, footstepRadius, isCamouflaged, isNight);

    // Boss Tepegöz Güncellemesi & Saldırı Karşılama
    if (this.bossTepegoz && !this.bossTepegoz.isDead) {
      const bossResult = this.bossTepegoz.update(playerPos, world, deltaTime);
      if (bossResult.isAttacking && bossResult.damage > 0) {
        const bossDist = Vector3.Distance(playerPos, this.bossTepegoz.position);
        if (bossDist < 6.5) {
          this.handleIncomingEnemyAttack(this.bossTepegoz.position, bossResult.damage, playerPos, undefined, true);
        }
      }
    }

    // Boss Demir Dağ Bekçisi Güncellemesi
    if (this.bossDemirDag && !this.bossDemirDag.isDead) {
      this.bossDemirDag.update(deltaTime, playerPos, this);
    }

    // Boss Şahmaran Güncellemesi
    if (this.bossSahmaran && !this.bossSahmaran.isDead) {
      this.bossSahmaran.update(deltaTime, playerPos, this);
    }

    // Boss 7 Başlı Yelbegen Güncellemesi
    if (this.bossYelbegen && !this.bossYelbegen.isDead) {
      this.bossYelbegen.update(deltaTime, playerPos, this);
    }

    // Boss Erlik Han Güncellemesi
    if (this.bossErlikHan && !this.bossErlikHan.isDead) {
      this.bossErlikHan.update(deltaTime, playerPos, this);
    }

    // Kampların ve Kara Totemlerin Güncellenmesi
    if (this.campManager) {
      this.campManager.update(playerPos, deltaTime, this.blightManager ?? undefined, this.lootManager);
    }

    // Ganimet Mıknatısı ve Toplama Güncellemesi
    this.lootManager.update(playerPos, deltaTime, (type: LootType, amount: number) => {
      const inv = InventoryManager.getInstance();
      if (type === 'HEALTH_FRUIT') {
        this.health = Math.min(this.maxHealth, this.health + 30);
      } else if (type === 'KUT_DUST') {
        this.stamina = Math.min(this.maxStamina, this.stamina + 35);
        inv.addItem('mat_kut_powder', amount * 5);
      } else if (type === 'IRON_ORE') {
        inv.addItem('mat_iron', amount * 2);
      } else if (type === 'DEMON_BONE') {
        inv.addItem('mat_bone', amount * 2);
      } else if (type === 'ARROWS') {
        this.arrowSystem.ammoStock.NORMAL = Math.min(60, this.arrowSystem.ammoStock.NORMAL + amount);
        inv.addItem('arrow_regular', amount);
      }
    });

    // Aktif Dövüş Durum Makinesini Güncelle
    this.updateCombatStateMachine(deltaTime, playerPos, playerHeading);

    // Ok Fırlatma Sistemini Güncelle
    this.arrowSystem.update(
      deltaTime,
      world,
      (pos: Vector3, radius: number) => {
        // 1. Boss Tepegöz Çarpışması
        if (this.bossTepegoz && !this.bossTepegoz.isDead) {
          if (this.bossTepegoz.checkEyeHit(pos)) {
            return { hit: true, enemyPos: this.bossTepegoz.position, isHeadshot: true };
          }
          const bdx = this.bossTepegoz.position.x - pos.x;
          const bdz = this.bossTepegoz.position.z - pos.z;
          const bdy = (this.bossTepegoz.position.y + 2.5) - pos.y;
          if (bdx * bdx + bdy * bdy + bdz * bdz < (radius + 2.2) * (radius + 2.2)) {
            return { hit: true, enemyPos: this.bossTepegoz.position, isHeadshot: false };
          }
        }

        // 1.5. Boss Demir Dağ Bekçisi Çarpışması
        if (this.bossDemirDag && !this.bossDemirDag.isDead) {
          const bdx = this.bossDemirDag.position.x - pos.x;
          const bdz = this.bossDemirDag.position.z - pos.z;
          const bdy = (this.bossDemirDag.position.y + 2.5) - pos.y;
          if (bdx * bdx + bdy * bdy + bdz * bdz < (radius + 2.5) * (radius + 2.5)) {
            return { hit: true, enemyPos: this.bossDemirDag.position, isHeadshot: false };
          }
        }

        // 1.6. Boss Şahmaran Çarpışması
        if (this.bossSahmaran && !this.bossSahmaran.isDead) {
          const bdx = this.bossSahmaran.position.x - pos.x;
          const bdz = this.bossSahmaran.position.z - pos.z;
          const bdy = (this.bossSahmaran.position.y + 2.5) - pos.y;
          if (bdx * bdx + bdy * bdy + bdz * bdz < (radius + 2.8) * (radius + 2.8)) {
            return { hit: true, enemyPos: this.bossSahmaran.position, isHeadshot: false };
          }
        }

        // 1.7. Boss Yelbegen Çarpışması
        if (this.bossYelbegen && !this.bossYelbegen.isDead) {
          const bdx = this.bossYelbegen.position.x - pos.x;
          const bdz = this.bossYelbegen.position.z - pos.z;
          const bdy = (this.bossYelbegen.position.y + 3.0) - pos.y;
          if (bdx * bdx + bdy * bdy + bdz * bdz < (radius + 4.5) * (radius + 4.5)) {
            return { hit: true, enemyPos: this.bossYelbegen.position, isHeadshot: false };
          }
        }

        // 1.8. Boss Erlik Han Çarpışması
        if (this.bossErlikHan && !this.bossErlikHan.isDead && this.bossErlikHan.phase !== 'PHASE_3_WEAKENED_CHOICE') {
          const bdx = this.bossErlikHan.position.x - pos.x;
          const bdz = this.bossErlikHan.position.z - pos.z;
          const bdy = (this.bossErlikHan.position.y + 2.5) - pos.y;
          if (bdx * bdx + bdy * bdy + bdz * bdz < (radius + 3.0) * (radius + 3.0)) {
            return { hit: true, enemyPos: this.bossErlikHan.position, isHeadshot: false };
          }
        }

        // 2. Kara Totem Çarpışması
        if (this.campManager && this.campManager.checkDamageTotem(pos, radius, 35, this.blightManager ?? undefined)) {
          return { hit: true, enemyPos: pos, isHeadshot: false };
        }

        // 3. Normal Körmöz Düşmanları
        for (let i = 0; i < this.enemies.length; i++) {
          const enemy = this.enemies[i];
          if (enemy.isDead) continue;
          const dx = enemy.position.x - pos.x;
          const dz = enemy.position.z - pos.z;
          const dy = (enemy.position.y + 1.0) - pos.y;
          if (dx * dx + dy * dy + dz * dz < (radius + 0.8) * (radius + 0.8)) {
            const isHead = pos.y > enemy.position.y + 1.4;
            return { hit: true, enemyPos: enemy.position, isHeadshot: isHead };
          }
        }

        for (let i = 0; i < this.dummies.length; i++) {
          const dummy = this.dummies[i];
          const dx = dummy.position.x - pos.x;
          const dz = dummy.position.z - pos.z;
          const dy = (dummy.position.y + 1.0) - pos.y;
          if (dx * dx + dy * dy + dz * dz < (radius + 0.6) * (radius + 0.6)) {
            return { hit: true, enemyPos: dummy.position, isHeadshot: pos.y > dummy.position.y + 1.4 };
          }
        }
        return null;
      },
      (hitPos: Vector3, hitNormal: Vector3, damage: number, isHeadshot: boolean, arrowType: ArrowType) => {
        const arrowDef = ARROW_DEFINITIONS[arrowType];

        // Boss Tepegöz'e Hasar
        if (this.bossTepegoz && !this.bossTepegoz.isDead) {
          const dist = Vector3.Distance(hitPos, this.bossTepegoz.position);
          if (dist < 4.2) {
            const finalDmg = isHeadshot ? damage * 2.2 : damage;
            this.bossTepegoz.takeDamage(finalDmg);
            this.damageNumbers.spawn(hitPos, Math.round(finalDmg), isHeadshot);
            this.emitSparksAt(hitPos, arrowType === 'FIRE' ? 55 : 30);
            this.addCameraTrauma(isHeadshot ? 0.65 : 0.35);
            ProceduralAudio.playImpact(true);
            return;
          }
        }

        // Boss Demir Dağ Bekçisi'ne Ok Hasarı
        if (this.bossDemirDag && !this.bossDemirDag.isDead) {
          const dist = Vector3.Distance(hitPos, this.bossDemirDag.position);
          if (dist < 4.5) {
            const dealt = this.bossDemirDag.takeDamage(damage, isHeadshot);
            this.damageNumbers.spawn(hitPos, Math.round(dealt), isHeadshot);
            this.emitSparksAt(hitPos, arrowType === 'FIRE' ? 55 : 30);
            this.addCameraTrauma(0.35);
            ProceduralAudio.playImpact(true);
            return;
          }
        }

        // Boss Şahmaran'a Ok Hasarı
        if (this.bossSahmaran && !this.bossSahmaran.isDead) {
          const dist = Vector3.Distance(hitPos, this.bossSahmaran.position);
          if (dist < 5.0) {
            const dealt = this.bossSahmaran.takeDamage(damage, arrowType === 'FIRE');
            this.damageNumbers.spawn(hitPos, Math.round(dealt), isHeadshot);
            this.emitSparksAt(hitPos, arrowType === 'FIRE' ? 55 : 30);
            this.addCameraTrauma(0.35);
            ProceduralAudio.playImpact(true);
            return;
          }
        }

        // Boss 7 Başlı Yelbegen'e Ok Hasarı (Ateşle dağlama ve baş kesme)
        if (this.bossYelbegen && !this.bossYelbegen.isDead) {
          const dist = Vector3.Distance(hitPos, this.bossYelbegen.position);
          if (dist < 8.0) {
            const isFire = arrowType === 'FIRE';
            const dealt = this.bossYelbegen.takeDamage(damage, isFire);
            this.damageNumbers.spawn(hitPos, Math.round(dealt), isHeadshot);
            this.emitSparksAt(hitPos, isFire ? 55 : 30);
            this.addCameraTrauma(0.4);
            ProceduralAudio.playImpact(true);
            return;
          }
        }

        // Boss Erlik Han'a Ok Hasarı
        if (this.bossErlikHan && !this.bossErlikHan.isDead && this.bossErlikHan.phase !== 'PHASE_3_WEAKENED_CHOICE') {
          const dist = Vector3.Distance(hitPos, this.bossErlikHan.position);
          if (dist < 5.5) {
            const isFire = arrowType === 'FIRE';
            const dealt = this.bossErlikHan.takeDamage(damage, isFire);
            this.damageNumbers.spawn(hitPos, Math.round(dealt), isHeadshot);
            this.emitSparksAt(hitPos, isFire ? 55 : 30);
            this.addCameraTrauma(0.4);
            ProceduralAudio.playImpact(true);
            return;
          }
        }

        // Normal Düşmanlara Hasar
        for (let i = 0; i < this.enemies.length; i++) {
          const enemy = this.enemies[i];
          if (enemy.isDead) continue;
          const dist = Vector3.Distance(hitPos, enemy.position);
          if (dist < 1.6) {
            enemy.takeTypedDamage(
              damage,
              arrowDef.damageType,
              arrowDef.id === 'PIERCING',
              false,
              hitNormal.scale(-1),
              this.lootManager
            );
            break;
          }
        }

        if (arrowType === 'FIRE') {
          ElementSystem.getInstance(this.scene).igniteAt(hitPos, 2.8);
        }

        this.damageNumbers.spawn(hitPos, damage, isHeadshot);
        this.emitSparksAt(hitPos, arrowType === 'FIRE' ? 45 : 22);
        this.addCameraTrauma(isHeadshot ? 0.45 : 0.25);
        ProceduralAudio.playImpact(true);
      }
    );
  }

  private updateEnemies(
    deltaTime: number,
    playerPos: Vector3,
    world: WorldManager,
    footstepRadius: number,
    isCamouflaged: number | boolean,
    isNight = false
  ): void {
    const camou = !!isCamouflaged;
    const campfire = world.landmarks ? world.landmarks.campfirePos : new Vector3(0, 0, 0);
    const distToCampfireSq = (playerPos.x - campfire.x) ** 2 + (playerPos.z - campfire.z) ** 2;
    const isNearCampfire = distToCampfireSq < 64.0;

    for (let i = 0; i < this.dummies.length; i++) {
      const dummy = this.dummies[i];
      const attackEvent = dummy.update(deltaTime, playerPos);
      if (attackEvent && attackEvent.isStrikeActive) {
        this.handleIncomingEnemyAttack(attackEvent.dummyPos, attackEvent.damage, playerPos);
      }
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const result = enemy.update(
        playerPos,
        world,
        deltaTime,
        footstepRadius,
        camou,
        isNight,
        isNearCampfire,
        this.coordinator,
        this.lootManager
      );

      if (result.isAttacking && result.damage > 0) {
        this.handleIncomingEnemyAttack(enemy.position, result.damage, playerPos, enemy);
      }
    }
  }

  /**
   * Düşmandan veya Tepegöz'den Gelen Saldırıyı Karşılama
   */
  private handleIncomingEnemyAttack(
    enemyPos: Vector3,
    damage: number,
    playerPos: Vector3,
    enemy?: EnemyEntity,
    isBoss = false
  ): void {
    const distSq = (enemyPos.x - playerPos.x) ** 2 + (enemyPos.z - playerPos.z) ** 2;
    if (distSq > (isBoss ? 48.0 : 9.0)) return;

    // 1. Mükemmel Savuşturma (Perfect Parry)
    if (this.parryWindowTimer > 0) {
      ProceduralAudio.playParry();
      this.addCameraTrauma(isBoss ? 0.75 : 0.5);
      this.emitSparksAt(playerPos, isBoss ? 60 : 45);

      if (isBoss && this.bossTepegoz) {
        this.bossTepegoz.takeDamage(95);
        this.damageNumbers.spawn(enemyPos, 95, true);
        EventBus.emit('ui:dialogue_show', {
          speaker: 'Börü',
          text: 'MÜKEMMEL PARRY! Dev Tepegöz sarsıldı, şimdi gözüne vur!'
        });
      } else if (enemy) {
        enemy.triggerParryStagger();
        this.damageNumbers.spawn(enemyPos, 0, false);
        EventBus.emit('ui:dialogue_show', {
          speaker: 'Börü',
          text: 'Mükemmel Parry! Düşman sersemledi, şimdi vur!'
        });
      }
      return;
    }

    // 2. Kaçış Sırasındaki i-Frame
    if (this.isRolling && this.rollTimer < this.ROLL_IFRAME_DURATION) {
      return;
    }

    // 3. Normal Kalkan Bloklama & Kalkan Kırılması
    const hasYerKutu = KamPowerManager.getInstance(this.scene).hasYerKutu;
    const baseCost = isBoss ? 38 : 15;
    const blockCost = Math.round(baseCost * (hasYerKutu ? 0.6 : 1.0));
    if (this.isShieldRaised && this.stamina >= blockCost) {
      this.stamina -= blockCost;
      this.staminaRegenCooldown = isBoss ? 1.5 : 1.0;
      ProceduralAudio.playShieldBlock();
      this.addCameraTrauma(isBoss ? 0.45 : 0.2);
      this.emitSparksAt(playerPos, isBoss ? 35 : 15);
      return;
    } else if (this.isShieldRaised && isBoss) {
      // Tepegöz'ün Gürzü Kalkanı Kırar!
      this.stamina = 0;
      this.isShieldRaised = false;
      this.actionState = 'HURT';
      this.actionTimer = 0;
      ProceduralAudio.playImpact(true);
      this.health = Math.max(0, this.health - Math.round(damage * 0.45));
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'Kalkanın kırıldı! Tepegöz’ün devasa gücünü ancak kaçarak veya Parry ile savuşturabilirsin!'
      });
      return;
    }

    // 4. Hasar Alma
    this.health = Math.max(0, this.health - damage);
    this.playerHitStopTimer = isBoss ? 0.12 : 0.08;
    this.addCameraTrauma(isBoss ? 0.7 : 0.45);
    ProceduralAudio.playImpact(true);
    this.actionState = 'HURT';
    this.actionTimer = 0;
  }

  private updateCombatStateMachine(deltaTime: number, playerPos: Vector3, playerHeading: number): void {
    this.rootMotionOffset.set(0, 0, 0);
    const weaponDef = WEAPON_DEFINITIONS[this.activeWeapon];

    // ================= FLURRY RUSH =================
    if (this.actionState === 'FLURRY_RUSH') {
      this.flurryTimer += deltaTime;
      if (this.flurryTimer >= 0.09) {
        this.flurryTimer = 0;
        this.flurryStep++;

        this.checkMeleeHitbox(playerPos, playerHeading, 28, 3.2, Math.PI * 0.75, false);
        ProceduralAudio.playSwordSwing(1);

        if (this.flurryStep >= this.FLURRY_TOTAL_HITS) {
          this.checkMeleeHitbox(playerPos, playerHeading, 45, 3.5, Math.PI, true);
          ProceduralAudio.playSwordSwing(3);
          this.actionState = 'IDLE';
          this.isFlurryRush = false;
        }
      }
      return;
    }

    // ================= KAM KILICI KOMBO DÖNGÜSÜ =================
    if (this.actionState === 'ATTACK_1' || this.actionState === 'ATTACK_2' || this.actionState === 'ATTACK_3') {
      this.actionTimer += deltaTime;
      const stepIdx = this.actionState === 'ATTACK_1' ? 0 : this.actionState === 'ATTACK_2' ? 1 : 2;
      const stepDuration = weaponDef.comboTimings[stepIdx];
      const forwardX = Math.sin(playerHeading);
      const forwardZ = Math.cos(playerHeading);

      if (this.actionTimer > 0.05 && this.actionTimer < stepDuration * 0.6) {
        const stepDist = weaponDef.rootMotionSteps[stepIdx];
        this.rootMotionOffset.x = forwardX * (stepDist / (stepDuration * 0.55)) * deltaTime;
        this.rootMotionOffset.z = forwardZ * (stepDist / (stepDuration * 0.55)) * deltaTime;
      }

      const hitFrame = stepDuration * 0.4;
      if (this.actionTimer >= hitFrame && this.actionTimer - deltaTime < hitFrame) {
        const dmg = weaponDef.baseDamage * (stepIdx === 2 ? 1.5 : stepIdx === 1 ? 1.15 : 1.0);
        this.checkMeleeHitbox(playerPos, playerHeading, dmg, weaponDef.reach, Math.PI * 0.65, stepIdx === 2);
      }

      if (this.actionTimer >= stepDuration) {
        this.actionState = 'IDLE';
        if (stepIdx < 2) {
          this.comboWindowTimer = 0.45;
          this.comboStep = stepIdx + 1;
        } else {
          this.comboStep = 0;
        }
      }
      return;
    }

    // ================= SAVAŞ BALTASI KOMBO DÖNGÜSÜ =================
    if (this.actionState === 'AXE_ATTACK_1' || this.actionState === 'AXE_ATTACK_2') {
      this.actionTimer += deltaTime;
      const stepIdx = this.actionState === 'AXE_ATTACK_1' ? 0 : 1;
      const stepDuration = weaponDef.comboTimings[stepIdx];
      const forwardX = Math.sin(playerHeading);
      const forwardZ = Math.cos(playerHeading);

      if (this.actionTimer > 0.1 && this.actionTimer < stepDuration * 0.6) {
        const stepDist = weaponDef.rootMotionSteps[stepIdx];
        this.rootMotionOffset.x = forwardX * (stepDist / (stepDuration * 0.5)) * deltaTime;
        this.rootMotionOffset.z = forwardZ * (stepDist / (stepDuration * 0.5)) * deltaTime;
      }

      const hitFrame = stepDuration * 0.45;
      if (this.actionTimer >= hitFrame && this.actionTimer - deltaTime < hitFrame) {
        const dmg = weaponDef.baseDamage * (stepIdx === 1 ? 1.9 : 1.1);
        this.checkMeleeHitbox(playerPos, playerHeading, dmg, weaponDef.reach, Math.PI * 0.85, true, true);
      }

      if (this.actionTimer >= stepDuration) {
        this.actionState = 'IDLE';
        if (stepIdx === 0) {
          this.comboWindowTimer = 0.50;
          this.comboStep = 1;
        } else {
          this.comboStep = 0;
        }
      }
      return;
    }

    // ================= KARGI KOMBO DÖNGÜSÜ =================
    if (this.actionState === 'SPEAR_ATTACK_1' || this.actionState === 'SPEAR_ATTACK_2' || this.actionState === 'SPEAR_ATTACK_3') {
      this.actionTimer += deltaTime;
      const stepIdx = this.actionState === 'SPEAR_ATTACK_1' ? 0 : this.actionState === 'SPEAR_ATTACK_2' ? 1 : 2;
      const stepDuration = weaponDef.comboTimings[stepIdx];
      const forwardX = Math.sin(playerHeading);
      const forwardZ = Math.cos(playerHeading);

      if (this.actionTimer > 0.05 && this.actionTimer < stepDuration * 0.5) {
        const stepDist = weaponDef.rootMotionSteps[stepIdx];
        this.rootMotionOffset.x = forwardX * (stepDist / (stepDuration * 0.45)) * deltaTime;
        this.rootMotionOffset.z = forwardZ * (stepDist / (stepDuration * 0.45)) * deltaTime;
      }

      const hitFrame = stepDuration * 0.35;
      if (this.actionTimer >= hitFrame && this.actionTimer - deltaTime < hitFrame) {
        const dmg = weaponDef.baseDamage * (stepIdx === 2 ? 1.6 : 1.0);
        this.checkMeleeHitbox(playerPos, playerHeading, dmg, weaponDef.reach, Math.PI * 0.55, stepIdx === 2);
      }

      if (this.actionTimer >= stepDuration) {
        this.actionState = 'IDLE';
        if (stepIdx < 2) {
          this.comboWindowTimer = 0.40;
          this.comboStep = stepIdx + 1;
        } else {
          this.comboStep = 0;
        }
      }
      return;
    }

    // ================= ŞARJLI SPİN SALDIRISI =================
    if (this.actionState === 'CHARGE_ATTACK') {
      this.actionTimer += deltaTime;
      if (this.actionTimer >= 0.28) {
        this.actionState = 'IDLE';
      }
      return;
    }

    // ================= KAÇIŞ / DODGE ROLL =================
    if (this.actionState === 'DODGE_ROLL') {
      this.rollTimer += deltaTime;
      const forwardX = Math.sin(playerHeading);
      const forwardZ = Math.cos(playerHeading);
      const rollSpeed = 9.5 * (1.0 - this.rollTimer / this.ROLL_DURATION);
      this.rootMotionOffset.x = forwardX * rollSpeed * deltaTime;
      this.rootMotionOffset.z = forwardZ * rollSpeed * deltaTime;

      if (this.rollTimer >= this.ROLL_DURATION) {
        this.actionState = 'IDLE';
        this.isRolling = false;
      }
      return;
    }

    // ================= HURT & PARRY =================
    if (this.actionState === 'PARRY') {
      this.actionTimer += deltaTime;
      if (this.actionTimer >= 0.32) {
        this.actionState = this.isShieldRaised ? 'SHIELD_BLOCK' : 'IDLE';
      }
      return;
    }

    if (this.actionState === 'HURT') {
      this.actionTimer += deltaTime;
      if (this.actionTimer >= 0.25) {
        this.actionState = 'IDLE';
      }
      return;
    }
  }

  /**
   * Vuruş Alanı Denetimi: Hasar Türü, Kalkan Kırma, Tepegöz Topuk Zayıflığı ve Direnç Uygulaması
   */
  private checkMeleeHitbox(
    playerPos: Vector3,
    playerHeading: number,
    baseDamage: number,
    maxDist: number,
    maxAngle: number,
    isKnockback: boolean,
    isShieldBreaker = false
  ): void {
    const forwardX = Math.sin(playerHeading);
    const forwardZ = Math.cos(playerHeading);
    const weaponDef = WEAPON_DEFINITIONS[this.activeWeapon];

    // 0. Boss Tepegöz'e Vuruş (Gövde ve Faz 2 Topuk Zayıf Noktası)
    if (this.bossTepegoz && !this.bossTepegoz.isDead) {
      // Faz 2 Topuk Vuruşu Denetimi
      if (this.bossTepegoz.checkHeelHit(playerPos, baseDamage)) {
        this.damageNumbers.spawn(playerPos, Math.round(baseDamage * 1.5), true);
        this.addCameraTrauma(0.55);
        this.emitSparksAt(playerPos, 45);
        return;
      }

      const dx = this.bossTepegoz.position.x - playerPos.x;
      const dz = this.bossTepegoz.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= maxDist + 2.2) {
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);
        const dot = forwardX * nx + forwardZ * nz;
        if (Math.acos(Scalar.Clamp(dot, -1, 1)) <= maxAngle / 2 || dist < 2.5) {
          const dmg = baseDamage * (isShieldBreaker || weaponDef.isShieldBreaker ? 1.35 : 1.0);
          this.bossTepegoz.takeDamage(dmg);

          this.scratchDamagePos.copyFrom(this.bossTepegoz.position);
          this.scratchDamagePos.y += 1.8;
          this.damageNumbers.spawn(this.scratchDamagePos, Math.round(dmg), isKnockback);

          this.playerHitStopTimer = 0.085;
          this.addCameraTrauma(isKnockback ? 0.55 : 0.32);
          this.emitSparksAt(this.scratchDamagePos, isKnockback ? 45 : 26);
          ProceduralAudio.playImpact(true);
        }
      }
    }

    // Boss Demir Dağ Bekçisi Yakın Dövüş Hasarı
    if (this.bossDemirDag && !this.bossDemirDag.isDead) {
      const dx = this.bossDemirDag.position.x - playerPos.x;
      const dz = this.bossDemirDag.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= maxDist + 2.5) {
        const dmg = baseDamage * (isShieldBreaker || weaponDef.isShieldBreaker ? 1.35 : 1.0);
        const dealt = this.bossDemirDag.takeDamage(dmg, isKnockback);

        this.scratchDamagePos.copyFrom(this.bossDemirDag.position);
        this.scratchDamagePos.y += 2.0;
        this.damageNumbers.spawn(this.scratchDamagePos, Math.round(dealt), isKnockback);

        this.playerHitStopTimer = 0.085;
        this.addCameraTrauma(isKnockback ? 0.55 : 0.32);
        this.emitSparksAt(this.scratchDamagePos, isKnockback ? 45 : 26);
      }
    }

    // Boss Şahmaran Yakın Dövüş Hasarı
    if (this.bossSahmaran && !this.bossSahmaran.isDead) {
      const dx = this.bossSahmaran.position.x - playerPos.x;
      const dz = this.bossSahmaran.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= maxDist + 2.8) {
        const dmg = baseDamage * (isShieldBreaker || weaponDef.isShieldBreaker ? 1.35 : 1.0);
        const dealt = this.bossSahmaran.takeDamage(dmg, isKnockback);

        this.scratchDamagePos.copyFrom(this.bossSahmaran.position);
        this.scratchDamagePos.y += 2.0;
        this.damageNumbers.spawn(this.scratchDamagePos, Math.round(dealt), isKnockback);

        this.playerHitStopTimer = 0.085;
        this.addCameraTrauma(isKnockback ? 0.55 : 0.32);
        this.emitSparksAt(this.scratchDamagePos, isKnockback ? 45 : 26);
      }
    }

    // Boss 7 Başlı Yelbegen Yakın Dövüş Hasarı (Ateş hasarı ve dağlama)
    if (this.bossYelbegen && !this.bossYelbegen.isDead) {
      const dx = this.bossYelbegen.position.x - playerPos.x;
      const dz = this.bossYelbegen.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= maxDist + 4.5) {
        const dmg = baseDamage * (isShieldBreaker || weaponDef.isShieldBreaker ? 1.35 : 1.0);
        const kamPower = KamPowerManager.getInstance();
        const isFire = (kamPower && kamPower.isFireUnlocked) || weaponDef.damageType === 'FIRE';
        const dealt = this.bossYelbegen.takeDamage(dmg, isFire);

        this.scratchDamagePos.copyFrom(this.bossYelbegen.position);
        this.scratchDamagePos.y += 2.5;
        this.damageNumbers.spawn(this.scratchDamagePos, Math.round(dealt), isKnockback);

        this.playerHitStopTimer = 0.085;
        this.addCameraTrauma(isKnockback ? 0.55 : 0.35);
        this.emitSparksAt(this.scratchDamagePos, isFire ? 55 : 30);
      }
    }

    // Boss Erlik Han Yakın Dövüş Hasarı
    if (this.bossErlikHan && !this.bossErlikHan.isDead && this.bossErlikHan.phase !== 'PHASE_3_WEAKENED_CHOICE') {
      const dx = this.bossErlikHan.position.x - playerPos.x;
      const dz = this.bossErlikHan.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= maxDist + 4.0) {
        const dmg = baseDamage * (isShieldBreaker || weaponDef.isShieldBreaker ? 1.35 : 1.0);
        const kamPower = KamPowerManager.getInstance();
        const isFire = (kamPower && kamPower.isFireUnlocked) || weaponDef.damageType === 'FIRE';
        const dealt = this.bossErlikHan.takeDamage(dmg, isFire);

        this.scratchDamagePos.copyFrom(this.bossErlikHan.position);
        this.scratchDamagePos.y += 2.0;
        this.damageNumbers.spawn(this.scratchDamagePos, Math.round(dealt), isKnockback);

        this.playerHitStopTimer = 0.085;
        this.addCameraTrauma(isKnockback ? 0.55 : 0.35);
        this.emitSparksAt(this.scratchDamagePos, isFire ? 55 : 30);
      }
    }

    // 1. Kara Toteme Vuruş
    if (this.campManager) {
      this.campManager.checkDamageTotem(playerPos, maxDist, baseDamage, this.blightManager ?? undefined);
    }

    // 2. Talim Kuklalarına Vuruş
    for (let i = 0; i < this.dummies.length; i++) {
      const dummy = this.dummies[i];
      const dx = dummy.position.x - playerPos.x;
      const dz = dummy.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= maxDist) {
        const nx = dx / dist;
        const nz = dz / dist;
        const dot = forwardX * nx + forwardZ * nz;
        if (Math.acos(Scalar.Clamp(dot, -1, 1)) <= maxAngle / 2) {
          this.scratchHitNormal.set(nx, 0, nz);
          dummy.takeDamage(baseDamage, this.scratchHitNormal);

          this.scratchDamagePos.copyFrom(dummy.position);
          this.scratchDamagePos.y += 1.1;
          this.damageNumbers.spawn(this.scratchDamagePos, baseDamage, isKnockback);

          this.playerHitStopTimer = 0.075;
          this.addCameraTrauma(isKnockback ? 0.45 : 0.25);
          this.emitSparksAt(this.scratchDamagePos, isKnockback ? 35 : 20);
          ProceduralAudio.playImpact(isKnockback);
        }
      }
    }

    // 3. Körmöz Düşmanlarına Vuruş
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.isDead) continue;

      const dx = enemy.position.x - playerPos.x;
      const dz = enemy.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= maxDist) {
        const nx = dx / dist;
        const nz = dz / dist;
        const dot = forwardX * nx + forwardZ * nz;
        if (Math.acos(Scalar.Clamp(dot, -1, 1)) <= maxAngle / 2) {
          this.scratchHitNormal.set(nx, 0, nz);
          const finalDamage = enemy.takeTypedDamage(
            baseDamage,
            weaponDef.damageType,
            isShieldBreaker || weaponDef.isShieldBreaker,
            false,
            this.scratchHitNormal,
            this.lootManager
          );

          this.scratchDamagePos.copyFrom(enemy.position);
          this.scratchDamagePos.y += 1.2;
          this.damageNumbers.spawn(this.scratchDamagePos, Math.round(finalDamage), isKnockback);

          this.playerHitStopTimer = 0.08;
          this.addCameraTrauma(isKnockback ? 0.5 : 0.28);
          this.emitSparksAt(this.scratchDamagePos, isKnockback ? 38 : 22);
          ProceduralAudio.playImpact(isKnockback);
        }
      }
    }
  }

  /**
   * Havadan Aşağı Vuruş Patlaması (Plunge Attack Shockwave)
   */
  public executePlungeImpact(landingPos: Vector3): void {
    const shockwaveRadius = 4.8;
    const plungeDamage = 68;

    this.addCameraTrauma(0.75);
    this.emitSparksAt(landingPos, 60);
    ProceduralAudio.playImpact(true);

    if (this.bossTepegoz && !this.bossTepegoz.isDead) {
      const dist = Vector3.Distance(landingPos, this.bossTepegoz.position);
      if (dist <= shockwaveRadius + 2.4) {
        this.bossTepegoz.takeDamage(plungeDamage * 1.6);
        this.damageNumbers.spawn(this.bossTepegoz.position, Math.round(plungeDamage * 1.6), true);
      }
    }

    if (this.bossSahmaran && !this.bossSahmaran.isDead) {
      const dist = Vector3.Distance(landingPos, this.bossSahmaran.position);
      if (dist <= shockwaveRadius + 2.8) {
        this.bossSahmaran.takeDamage(plungeDamage * 1.5, true);
        this.damageNumbers.spawn(this.bossSahmaran.position, Math.round(plungeDamage * 1.5), true);
      }
    }

    if (this.bossYelbegen && !this.bossYelbegen.isDead) {
      const dist = Vector3.Distance(landingPos, this.bossYelbegen.position);
      if (dist <= shockwaveRadius + 4.0) {
        this.bossYelbegen.takeDamage(plungeDamage * 1.5, true);
        this.damageNumbers.spawn(this.bossYelbegen.position, Math.round(plungeDamage * 1.5), true);
      }
    }

    if (this.bossErlikHan && !this.bossErlikHan.isDead && this.bossErlikHan.phase !== 'PHASE_3_WEAKENED_CHOICE') {
      const dist = Vector3.Distance(landingPos, this.bossErlikHan.position);
      if (dist <= shockwaveRadius + 3.5) {
        const kamPower = KamPowerManager.getInstance();
        const isFire = (kamPower && kamPower.isFireUnlocked);
        this.bossErlikHan.takeDamage(plungeDamage * 1.5, isFire);
        this.damageNumbers.spawn(this.bossErlikHan.position, Math.round(plungeDamage * 1.5), true);
      }
    }

    if (this.campManager) {
      this.campManager.checkDamageTotem(landingPos, shockwaveRadius, plungeDamage, this.blightManager ?? undefined);
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.isDead) continue;
      const dist = Vector3.Distance(landingPos, enemy.position);
      if (dist <= shockwaveRadius) {
        const dir = enemy.position.subtract(landingPos).normalize();
        enemy.takeTypedDamage(plungeDamage, 'BLUNT', true, false, dir, this.lootManager);
        this.damageNumbers.spawn(enemy.position, plungeDamage, true);
      }
    }

    for (let i = 0; i < this.dummies.length; i++) {
      const dummy = this.dummies[i];
      const dist = Vector3.Distance(landingPos, dummy.position);
      if (dist <= shockwaveRadius) {
        const dir = dummy.position.subtract(landingPos).normalize();
        dummy.takeDamage(plungeDamage, dir);
        this.damageNumbers.spawn(dummy.position, plungeDamage, true);
      }
    }
  }

  /**
   * Sessiz Vuruş (Sneak Strike) Hedef Adayı Kontrolü
   */
  public checkSneakStrikeCandidate(playerPos: Vector3, playerHeading: number): EnemyEntity | null {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.isDead || enemy.isAware) continue;
      const dist = Vector3.Distance(playerPos, enemy.position);
      if (dist < 2.8) {
        if (enemy.isSleeping) {
          return enemy;
        }
        const forwardEnemyX = Math.sin(enemy.heading);
        const forwardEnemyZ = Math.cos(enemy.heading);
        const toPlayerX = playerPos.x - enemy.position.x;
        const toPlayerZ = playerPos.z - enemy.position.z;
        const dot = forwardEnemyX * toPlayerX + forwardEnemyZ * toPlayerZ;
        if (dot < -0.3) {
          return enemy;
        }
      }
    }
    return null;
  }

  /**
   * Sessiz Vuruş (Sneak Strike / Backstab) İnfazı
   */
  public triggerSneakStrike(target: EnemyEntity): void {
    if (this.actionState !== 'IDLE') return;

    this.actionState = 'SNEAK_STRIKE';
    this.actionTimer = 0;
    const weaponDef = WEAPON_DEFINITIONS[this.activeWeapon];

    const damageDealt = target.takeTypedDamage(
      weaponDef.baseDamage,
      weaponDef.damageType,
      true,
      true,
      undefined,
      this.lootManager
    );
    this.damageNumbers.spawn(target.position, Math.round(damageDealt), true);
    this.emitSparksAt(target.position, 50);
    this.addCameraTrauma(0.6);
  }

  public triggerAttack(isCharged = false): void {
    if (this.isKutZamaniActive) {
      this.actionState = 'FLURRY_RUSH';
      this.flurryStep = 0;
      this.flurryTimer = 0;
      this.isFlurryRush = true;
      ProceduralAudio.playButtonClick();
      return;
    }

    if (this.actionState !== 'IDLE') return;

    // Tepegöz diz çökmüş ve canı az ise Basat bitirici vuruşu
    if (this.bossTepegoz && this.bossTepegoz.phase === 'KNEELING_BLIND') {
      const dist = Vector3.Distance(this.scratchDamagePos, this.bossTepegoz.position);
      if (dist < 4.5) {
        this.bossTepegoz.triggerBasatFinisher();
        return;
      }
    }

    const weaponDef = WEAPON_DEFINITIONS[this.activeWeapon];
    if (this.stamina < weaponDef.staminaCost) return;

    this.stamina -= weaponDef.staminaCost;
    this.staminaRegenCooldown = 0.8;

    if (isCharged) {
      this.executeSpinAttack();
      return;
    }

    if (this.activeWeapon === 'BATTLE_AXE') {
      if (this.comboStep === 0) {
        this.actionState = 'AXE_ATTACK_1';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(2);
      } else {
        this.actionState = 'AXE_ATTACK_2';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(3);
      }
    } else if (this.activeWeapon === 'WAR_SPEAR') {
      if (this.comboStep === 0) {
        this.actionState = 'SPEAR_ATTACK_1';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(1);
      } else if (this.comboStep === 1) {
        this.actionState = 'SPEAR_ATTACK_2';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(2);
      } else {
        this.actionState = 'SPEAR_ATTACK_3';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(3);
      }
    } else {
      if (this.comboStep === 0) {
        this.actionState = 'ATTACK_1';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(1);
      } else if (this.comboStep === 1) {
        this.actionState = 'ATTACK_2';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(2);
      } else if (this.comboStep === 2) {
        this.actionState = 'ATTACK_3';
        this.actionTimer = 0;
        ProceduralAudio.playSwordSwing(3);
      }
    }
  }

  public startCharge(): void {
    if (this.actionState === 'IDLE' && this.stamina >= 25) {
      this.isCharging = true;
      this.chargeHoldTime = 0;
      this.actionState = 'CHARGE_WINDUP';
      ProceduralAudio.playKutZamaniEnter();
    }
  }

  public releaseCharge(): void {
    if (this.isCharging) {
      this.isCharging = false;
      if (this.chargeHoldTime >= this.MIN_CHARGE_TIME) {
        this.executeSpinAttack();
      } else {
        this.actionState = 'IDLE';
      }
    }
  }

  private executeSpinAttack(): void {
    this.stamina = Math.max(0, this.stamina - 28);
    this.staminaRegenCooldown = 1.2;
    this.actionState = 'CHARGE_ATTACK';
    this.actionTimer = 0;
    this.addCameraTrauma(0.55);
    ProceduralAudio.playSwordSwing(3);
  }

  public triggerDodgeRoll(heading: number): void {
    if (this.actionState === 'IDLE' && this.stamina >= 14) {
      this.stamina -= 14;
      this.staminaRegenCooldown = 0.8;
      this.isRolling = true;
      this.rollTimer = 0;
      this.actionState = 'DODGE_ROLL';
      ProceduralAudio.playDodgeRoll();

      for (let i = 0; i < this.enemies.length; i++) {
        const enemy = this.enemies[i];
        if (enemy.state === 'TELEGRAPH') {
          this.enterKutZamani();
          break;
        }
      }
    }
  }

  public setShieldActive(active: boolean): void {
    if (active) {
      this.isShieldRaised = true;
      this.actionState = 'SHIELD_BLOCK';
      const hasYerKutu = KamPowerManager.getInstance(this.scene).hasYerKutu;
      const isWideParryAssist = SettingsStore.get().assistWideParry;
      this.parryWindowTimer = (hasYerKutu || isWideParryAssist) ? 0.32 : this.PARRY_WINDOW;
      ProceduralAudio.playShieldBlock();
    } else {
      this.isShieldRaised = false;
      if (this.actionState === 'SHIELD_BLOCK' || this.actionState === 'PARRY') {
        this.actionState = 'IDLE';
      }
    }
  }

  public triggerKutZamaniManual(): void {
    this.enterKutZamani();
  }

  public setBowAim(active: boolean): void {
    if (active) {
      this.actionState = 'BOW_AIM';
      ProceduralAudio.playBowDraw();
    } else {
      if (this.actionState === 'BOW_AIM') {
        this.actionState = 'IDLE';
        this.isAirborneAim = false;
      }
    }
  }

  public shootArrow(origin: Vector3, direction: Vector3): void {
    if (this.arrowSystem.shootArrow(origin, direction)) {
      ProceduralAudio.playBowRelease();
    }
  }

  public enterKutZamani(): void {
    this.isKutZamaniActive = true;
    this.kutZamaniTimer = this.KUT_ZAMANI_DURATION;
    ProceduralAudio.playKutZamaniEnter();
    EventBus.emit('combat:kutzamani_enter');

    const vignette = document.getElementById('kutZamaniVignette');
    if (vignette) vignette.classList.add('active');
  }

  public exitKutZamani(): void {
    this.isKutZamaniActive = false;
    this.kutZamaniTimer = 0;
    ProceduralAudio.playKutZamaniExit();
    EventBus.emit('combat:kutzamani_exit');

    const vignette = document.getElementById('kutZamaniVignette');
    if (vignette) vignette.classList.remove('active');
  }

  public toggleLockOn(playerPos: Vector3): void {
    if (this.lockedTarget) {
      this.lockedTarget = null;
    } else {
      let closestDist = 24.0;
      let target: { position: Vector3 } | null = null;

      if (this.bossTepegoz && !this.bossTepegoz.isDead) {
        const bDist = Vector3.Distance(playerPos, this.bossTepegoz.position);
        if (bDist < 35.0 && bDist < closestDist) {
          closestDist = bDist;
          target = this.bossTepegoz;
        }
      }

      if (this.bossSahmaran && !this.bossSahmaran.isDead) {
        const sDist = Vector3.Distance(playerPos, this.bossSahmaran.position);
        if (sDist < 35.0 && sDist < closestDist) {
          closestDist = sDist;
          target = this.bossSahmaran;
        }
      }

      if (this.bossYelbegen && !this.bossYelbegen.isDead) {
        const yDist = Vector3.Distance(playerPos, this.bossYelbegen.position);
        if (yDist < 38.0 && yDist < closestDist) {
          closestDist = yDist;
          target = this.bossYelbegen;
        }
      }

      if (this.bossErlikHan && !this.bossErlikHan.isDead && this.bossErlikHan.phase !== 'PHASE_3_WEAKENED_CHOICE') {
        const eDist = Vector3.Distance(playerPos, this.bossErlikHan.position);
        if (eDist < 38.0 && eDist < closestDist) {
          closestDist = eDist;
          target = this.bossErlikHan;
        }
      }

      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.isDead) continue;
        const d = Vector3.Distance(playerPos, e.position);
        if (d < closestDist) {
          closestDist = d;
          target = e;
        }
      }

      if (!target) {
        for (let i = 0; i < this.dummies.length; i++) {
          const d = this.dummies[i];
          const dist = Vector3.Distance(playerPos, d.position);
          if (dist < closestDist) {
            closestDist = dist;
            target = d;
          }
        }
      }

      this.lockedTarget = target;
      if (this.lockedTarget) {
        ProceduralAudio.playButtonClick();
      }
    }
  }

  public dispose(): void {
    if (this.bossTepegoz) this.bossTepegoz.dispose();
    if (this.bossDemirDag) this.bossDemirDag.dispose();
    if (this.bossSahmaran) this.bossSahmaran.dispose();
    if (this.bossYelbegen) this.bossYelbegen.dispose();
    if (this.bossErlikHan) this.bossErlikHan.dispose();
    if (this.campManager) this.campManager.dispose();
    if (this.blightManager) this.blightManager.dispose();
    this.lootManager.dispose();
    this.arrowSystem.dispose();
    this.damageNumbers.dispose();
    for (let i = 0; i < this.dummies.length; i++) this.dummies[i].dispose();
    for (let i = 0; i < this.enemies.length; i++) this.enemies[i].dispose();
    if (this.sparkSystem) this.sparkSystem.dispose();
    this.sparkEmitter.dispose();
  }
}
