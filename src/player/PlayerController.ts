/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gelişmiş Oyuncu Hareket ve Fizik Kontrolcüsü (PlayerController)
 * (Zelda BotW Dinamikleri: İvmelenme, Eğim Hızı, Coyote Time, Zıplama Tamponu, İniş Şoku,
 *  Tırmanma & Yağmurda Kayma & Mantle, Yel Ana Süzülüşü & Termal Akım, Yüzme & Dalış & Oksijen,
 *  Çömelme & Gizlilik, Ayak IK & Havadan Vuruş & Sıfır GC)
 */

import { Vector3, Scalar } from '@babylonjs/core';
import { AyazModel, AyazAnimState } from './AyazModel';
import { MovementInput } from '../input/InputManager';
import { WorldManager } from '../world/WorldManager';
import { WorldNoise } from '../world/WorldNoise';
import { CombatSystem } from '../combat/CombatSystem';
import { WindField } from '../world/WindField';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { TrainingGround } from '../world/TrainingGround';
import { ElementSystem } from '../elements/ElementSystem';
import { KamPowerManager } from '../powers/KamPowerManager';

export type LocomotionState =
  | 'GROUND'
  | 'AIRBORNE'
  | 'CLIMB'
  | 'GLIDE'
  | 'SHIELD_SURF'
  | 'SWIM'
  | 'DIVE';

export class PlayerController {
  public model: AyazModel;
  public position: Vector3 = new Vector3(0, 0, 0);
  public headingAngle = 0; // Radyan cinsinden oyuncu yönü

  // Hareket Durum Makinesi
  public locomotionState: LocomotionState = 'GROUND';

  // Hız ve Fizik Sabitleri
  private walkSpeed = 3.6;          // m/s
  public readonly runSpeed = 7.2;           // m/s
  private sprintSpeed = 9.8;        // m/s
  private crouchSpeed = 2.1;        // m/s
  private swimSpeed = 3.2;          // m/s
  private sprintSwimSpeed = 5.6;    // m/s
  private diveSpeed = 2.8;          // m/s
  private climbSpeed = 2.2;         // m/s
  private glideSpeed = 8.5;         // m/s
  private aimSpeed = 1.6;           // m/s
  public currentSpeed = 0;

  // Dikey Fizik (Zıplama & Yerçekimi)
  public verticalVelocity = 0;
  private gravity = -18.0;          // m/s²
  private jumpForce = 7.6;          // m/s
  private glideFallSpeed = -2.2;    // m/s (yavaş süzülme inişi)
  private plungeFallSpeed = -22.0;  // m/s (havadan aşağı vuruş dalışı)

  // Tepkisellik ve Tamponlar (Responsiveness)
  private coyoteTimer = 0;          // 0.10 sn uçurumdan düşüş toleransı
  private readonly COYOTE_TIME = 0.10;
  private jumpBufferTimer = 0;      // 0.12 sn erken zıplama girdi tamponu
  private readonly JUMP_BUFFER_TIME = 0.12;
  private landingShockTimer = 0;    // Yüksekten iniş şok animasyonu

  // Tırmanma ve Yağmurda Kayma
  private climbNormal = new Vector3(0, 0, 1);
  private rainSlipTimer = 0;
  private isSlipping = false;

  // Kalkan Kızağı
  private surfSpeed = 0;

  // Yel Ana Süzülme Kanadı (Altyapı hazır, varsayılan kilitli veya açık)
  public isGliderUnlocked = true;   // Test ve oynanabilirlik için açık
  public isGlidingActive = false;

  // Yüzme, Dalış & Nefes Çarkı (Oksijen)
  public isDiving = false;
  public oxygen = 100.0;
  public readonly MAX_OXYGEN = 100.0;
  public characterWetness = 0.0;    // 0.0 - 1.0 arası ıslanma

  // Çömelme & Gizlilik
  public isCrouching = false;
  public isCamouflaged = false;     // Uzun otta gizlenme
  public footstepRadius = 12.0;     // m (düşmanların duyma yarıçapı)

  // Havadan Aşağı Vuruş (Plunge Attack)
  public isPlunging = false;

  // Gök Kutu ile Çift Zıplama (Gök Sıçraması)
  public hasDoubleJumped = false;

  // İvmelenme & Dönüş
  private acceleration = 12.0;
  private deceleration = 16.0;
  private rotationSpeed = 14.0;

  // Dünya Sınırları (-480m ile +480m)
  private maxBoundary = 480.0;

  // Durum Bayrakları
  public currentGroundHeight = 0;
  public isInWater = false;
  public isAirborne = false;
  public isMounted = false;

  // Rüzgâr Referansı
  private windField: WindField;

  // Antrenman Sahası Referansı
  public trainingGround: TrainingGround | null = null;

  // Sıcak döngü scratch nesneleri (Rule 7: Zero GC)
  private scratchWind = new Vector3(0, 0, 0);

  constructor(model: AyazModel) {
    this.model = model;
    this.position = this.model.root.position;
    this.windField = WindField.getInstance();
  }

  public update(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    if (this.isMounted) {
      if (combat.actionState === 'BOW_AIM') {
        this.headingAngle = cameraYaw;
        this.model.root.rotation.y = this.headingAngle;
        const hitStopped = combat.playerHitStopTimer > 0;
        this.model.updateAnimation('BOW_AIM', 1.0, deltaTime, hitStopped, combat.stamina, combat.maxStamina);
      }
      return;
    }

    this.currentGroundHeight = world.getHeightAt(this.position.x, this.position.z);
    const inTrainingPool = this.trainingGround ? this.trainingGround.isInTrainingPool(this.position) : false;
    this.isInWater = this.position.y < (WorldNoise.WATER_LEVEL - 0.35) || inTrainingPool;

    // Islaklık kuruma döngüsü
    if (this.isInWater) {
      this.characterWetness = 1.0;
    } else if (this.characterWetness > 0) {
      this.characterWetness = Math.max(0, this.characterWetness - deltaTime * 0.04);
    }

    // Zamanlayıcıları düşür
    if (this.coyoteTimer > 0) this.coyoteTimer -= deltaTime;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= deltaTime;
    if (this.landingShockTimer > 0) this.landingShockTimer -= deltaTime;

    const combatAction = combat.actionState;
    const isCombatActing = combatAction !== 'IDLE';

    // 1. Dövüş Aksiyonu Sırasında Kök Hareketi (Root Motion)
    if (isCombatActing) {
      if (combat.rootMotionOffset.lengthSquared() > 0.00001) {
        this.position.x += combat.rootMotionOffset.x;
        this.position.z += combat.rootMotionOffset.z;
      }

      if (combatAction === 'BOW_AIM') {
        this.handleBowAimMovement(input, cameraYaw, deltaTime);
      }

      if (combat.lockedTarget) {
        const dx = combat.lockedTarget.position.x - this.position.x;
        const dz = combat.lockedTarget.position.z - this.position.z;
        this.headingAngle = Math.atan2(dx, dz);
      }

      this.snapElevation();
      this.model.root.position.copyFrom(this.position);
      this.model.root.rotation.y = this.headingAngle;

      const hitStopped = combat.playerHitStopTimer > 0;
      this.model.updateAnimation(combatAction, 1.0, deltaTime, hitStopped, combat.stamina, combat.maxStamina);
      return;
    }

    // 2. Hareket Durum Makinesi
    switch (this.locomotionState) {
      case 'CLIMB':
        this.handleClimbing(input, world, combat, deltaTime);
        break;
      case 'GLIDE':
        this.handleGliding(input, cameraYaw, world, combat, deltaTime);
        break;
      case 'SHIELD_SURF':
        this.handleShieldSurfing(input, cameraYaw, world, combat, deltaTime);
        break;
      case 'SWIM':
      case 'DIVE':
        this.handleSwimmingAndDiving(input, cameraYaw, world, combat, deltaTime);
        break;
      case 'AIRBORNE':
        this.handleAirborne(input, cameraYaw, world, combat, deltaTime);
        break;
      case 'GROUND':
      default:
        this.handleGround(input, cameraYaw, world, combat, deltaTime);
        break;
    }

    this.clampWorldBounds();
    this.model.root.position.copyFrom(this.position);
    this.model.root.rotation.y = this.headingAngle;

    // Ayak IK: Sol ve sağ ayak altındaki arazi yüksekliğini raycast / sampling ile hesapla
    const leftHipX = this.position.x - Math.cos(this.headingAngle) * 0.16;
    const leftHipZ = this.position.z + Math.sin(this.headingAngle) * 0.16;
    const rightHipX = this.position.x + Math.cos(this.headingAngle) * 0.16;
    const rightHipZ = this.position.z - Math.sin(this.headingAngle) * 0.16;

    const leftGroundY = world.getHeightAt(leftHipX, leftHipZ);
    const rightGroundY = world.getHeightAt(rightHipX, rightHipZ);
    this.model.applyFootIK(leftGroundY, rightGroundY, this.currentGroundHeight, deltaTime);

    // 3. Durum Animasyonunu Belirle
    let animState: AyazAnimState = 'IDLE';
    const hitStopped = combat.playerHitStopTimer > 0;

    if (this.landingShockTimer > 0) {
      animState = 'LANDING_SHOCK';
    } else if (this.isPlunging) {
      animState = 'PLUNGE_ATTACK';
    } else if (this.locomotionState === 'CLIMB') {
      animState = 'CLIMB';
    } else if (this.locomotionState === 'GLIDE') {
      animState = 'GLIDE';
    } else if (this.locomotionState === 'SHIELD_SURF') {
      animState = 'SHIELD_SURF';
    } else if (this.locomotionState === 'DIVE') {
      animState = 'DIVE_SWIM';
    } else if (this.locomotionState === 'SWIM') {
      animState = 'SWIM';
    } else if (this.locomotionState === 'AIRBORNE') {
      animState = this.verticalVelocity > 0 ? 'JUMP' : 'FALL';
    } else if (this.isCrouching) {
      animState = this.currentSpeed > 0.2 ? 'CROUCH_WALK' : 'CROUCH_IDLE';
    } else {
      if (this.currentSpeed > 0.2) {
        if (input.isRunRequested && combat.stamina > 5) {
          animState = this.currentSpeed > this.runSpeed ? 'SPRINT' : 'RUN';
        } else {
          animState = 'WALK';
        }
      }
    }

    const maxRefSpeed = this.isCrouching ? this.crouchSpeed : this.sprintSpeed;
    const speedRatio = Math.max(0.1, this.currentSpeed / maxRefSpeed);
    this.model.updateAnimation(animState, speedRatio, deltaTime, hitStopped, combat.stamina, combat.maxStamina);
  }

  // ================= ZEMİN HAREKETİ (GROUND) =================

  private handleGround(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    // Suya temas
    if (this.isInWater) {
      this.locomotionState = 'SWIM';
      return;
    }

    // Uçurumdan düşme kontrolü (Coyote Time başlangıcı)
    const cliffDelta = this.position.y - this.currentGroundHeight;
    if (cliffDelta > 0.4) {
      this.locomotionState = 'AIRBORNE';
      this.coyoteTimer = this.COYOTE_TIME;
      return;
    }

    // İniş tamponu kontrolü (Jump buffer)
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = 0;
      this.executeJump();
      return;
    }

    const hasInput = input.magnitude > 0.05;

    // Eğim Hesabı (Slope speed penalty)
    const normal = world.getNormalAt(this.position.x, this.position.z);
    const slope = 1.0 - normal[1];

    // Hedef Hız
    let targetSpeed = 0;
    if (hasInput && this.landingShockTimer <= 0) {
      if (this.isCrouching) {
        targetSpeed = this.crouchSpeed * input.magnitude;
        this.footstepRadius = 2.5; // Fısıltı sessizliği
      } else {
        const isSprinting = input.isRunRequested && combat.stamina > 4;
        const baseSpeed = isSprinting ? this.sprintSpeed : this.runSpeed;
        targetSpeed = baseSpeed * input.magnitude;

        // Yokuş yukarı yavaşlama çarpanı
        if (slope > 0.15) {
          targetSpeed *= Math.max(0.55, 1.0 - slope * 0.9);
        }

        if (isSprinting) {
          combat.stamina = Math.max(0, combat.stamina - 14.0 * deltaTime);
          this.footstepRadius = 16.0;
        } else {
          this.footstepRadius = 9.0;
        }
      }
    }

    // Kamera Bağıl Hareket
    if (hasInput && this.landingShockTimer <= 0) {
      const camForwardX = Math.sin(cameraYaw);
      const camForwardZ = Math.cos(cameraYaw);
      const camRightX = camForwardZ;
      const camRightZ = -camForwardX;

      const moveDirX = camForwardX * input.y + camRightX * input.x;
      const moveDirZ = camForwardZ * input.y + camRightZ * input.x;

      const len = Math.hypot(moveDirX, moveDirZ);
      if (len > 0.01) {
        const normDirX = moveDirX / len;
        const normDirZ = moveDirZ / len;

        // Tırmanma Tespiti: Eğim > 60° (normal.y < 0.5) veya 14m Antrenman Duvarı
        const checkDist = 0.85;
        const hAhead = world.getHeightAt(this.position.x + normDirX * checkDist, this.position.z + normDirZ * checkDist);
        const deltaH = hAhead - this.currentGroundHeight;

        const isNearClimbingWall = this.trainingGround &&
          Math.abs(this.position.x - this.trainingGround.origin.x) < 3.8 &&
          Math.abs(this.position.z - (this.trainingGround.origin.z - 8.0)) < 2.0;

        if ((deltaH > 1.4 || normal[1] < 0.52 || isNearClimbingWall) && combat.stamina > 10) {
          this.locomotionState = 'CLIMB';
          if (isNearClimbingWall) {
            this.climbNormal.set(0, 0, 1);
          } else {
            this.climbNormal.set(-normDirX, 0, -normDirZ);
            this.climbNormal.normalize();
          }
          this.headingAngle = Math.atan2(normDirX, normDirZ);
          this.isCrouching = false;
          ProceduralAudio.playButtonClick();
          return;
        }

        // Yumuşak Dönüş ve Gövde Yatışı (Lean Bank)
        const targetAngle = Math.atan2(normDirX, normDirZ);
        let angleDiff = targetAngle - this.headingAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        this.headingAngle += angleDiff * Math.min(1.0, deltaTime * this.rotationSpeed);
        this.model.leanBank = Scalar.Lerp(this.model.leanBank, -angleDiff * 0.22, Math.min(1.0, deltaTime * 8.0));

        // İlerleme
        this.position.x += normDirX * this.currentSpeed * deltaTime;
        this.position.z += normDirZ * this.currentSpeed * deltaTime;
      }
    } else {
      this.model.leanBank = Scalar.Lerp(this.model.leanBank, 0, Math.min(1.0, deltaTime * 6.0));
    }

    const rate = targetSpeed > this.currentSpeed ? this.acceleration : this.deceleration;
    this.currentSpeed = Scalar.Lerp(this.currentSpeed, targetSpeed, Math.min(1.0, deltaTime * rate));

    // Öne Eğilme (Forward lean)
    this.model.leanForward = (this.currentSpeed / this.sprintSpeed) * 0.16;

    // Zemin yüksekliğine otur
    this.position.y = this.currentGroundHeight;
  }

  // ================= TIRMANMA & YAĞMURDA KAYMA (CLIMBING) =================

  private handleClimbing(
    input: MovementInput,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    // Tırmanırken sürekli soluk tüketimi
    combat.stamina = Math.max(0, combat.stamina - 10.5 * deltaTime);

    // Soluk biterse düşer
    if (combat.stamina <= 0) {
      this.locomotionState = 'AIRBORNE';
      this.verticalVelocity = -2.5;
      ProceduralAudio.playImpact(false);
      return;
    }

    // Yağmurda Kayma Mekaniği (Rain Slip)
    const isRaining = world.terrainPlugin ? world.terrainPlugin.wetness > 0.35 : false;
    if (isRaining) {
      this.rainSlipTimer += deltaTime;
      if (this.rainSlipTimer > 3.8) {
        this.rainSlipTimer = 0;
        // Kayma gerçekleşir: 1.2m aşağı kayar ve ekstra 8 stamina kaybeder
        this.position.y -= 1.2;
        combat.stamina = Math.max(0, combat.stamina - 8.0);
        ProceduralAudio.playFootstep(true);
      }
    }

    const hasInput = input.magnitude > 0.05;
    if (hasInput) {
      const upStep = input.y * this.climbSpeed * deltaTime;
      this.position.y += upStep;

      // Duvara teğet sağ vektör
      const tangentX = -this.climbNormal.z;
      const tangentZ = this.climbNormal.x;
      this.position.x += tangentX * input.x * this.climbSpeed * deltaTime;
      this.position.z += tangentZ * input.x * this.climbSpeed * deltaTime;
    }

    // Uçurumun Tepesine Çıkış (Mantle)
    const isNearClimbingWall = this.trainingGround &&
      Math.abs(this.position.x - this.trainingGround.origin.x) < 4.2 &&
      Math.abs(this.position.z - (this.trainingGround.origin.z - 8.0)) < 2.5;

    if (isNearClimbingWall && this.trainingGround && this.position.y >= this.trainingGround.origin.y + 13.8) {
      this.position.y = this.trainingGround.origin.y + 14.2;
      this.position.z = this.trainingGround.origin.z - 9.2;
      this.locomotionState = 'GROUND';
      ProceduralAudio.playButtonClick();
      return;
    }

    const groundUnder = world.getHeightAt(this.position.x, this.position.z);
    if (!isNearClimbingWall && this.position.y >= groundUnder - 0.22) {
      // Düzlüğe ulaşıldı: Mantle hamlesi ile zemin üzerine çık
      this.position.y = groundUnder;
      this.locomotionState = 'GROUND';
      ProceduralAudio.playButtonClick();
      return;
    }

    // Zemine geri inme
    if (this.position.y <= groundUnder + 0.35 && input.y < -0.2) {
      this.position.y = groundUnder;
      this.locomotionState = 'GROUND';
      return;
    }
  }

  /**
   * Tırmanırken Zıplama Sıçraması (Climb Leap)
   */
  public triggerClimbLeap(combat: CombatSystem): void {
    if (this.locomotionState !== 'CLIMB' || combat.stamina < 20) return;
    combat.stamina -= 20;
    this.position.y += 1.85;
    ProceduralAudio.playButtonClick();
  }

  // ================= SÜZÜLME & TERMAL AKIM (GLIDING) =================

  private handleGliding(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    this.isGlidingActive = true;
    combat.stamina = Math.max(0, combat.stamina - 7.2 * deltaTime);

    if (combat.stamina <= 0) {
      this.locomotionState = 'AIRBORNE';
      this.isGlidingActive = false;
      return;
    }

    // Termal Yükselme Kontrolü (Kamp Ateşi, Fumaroller, Antrenman Köz Ocağı & Yangın Updraft'ları)
    const campfire = world.landmarks.campfirePos;
    const dxFire = this.position.x - campfire.x;
    const dzFire = this.position.z - campfire.z;
    const isOverCampfire = (dxFire * dxFire + dzFire * dzFire) < 42.0;
    const isOverTrainingPit = this.trainingGround ? this.trainingGround.isOverThermalPit(this.position) : false;
    const isOverElementUpdraft = ElementSystem.getInstance().isOverThermalUpdraft(this.position);

    if (isOverCampfire || isOverTrainingPit || isOverElementUpdraft) {
      // Güçlü sıcak hava yükselmesi (+8.5 m/s)
      this.verticalVelocity = 8.5;
    } else {
      this.verticalVelocity = this.glideFallSpeed;
    }

    this.position.y += this.verticalVelocity * deltaTime;

    // Rüzgâr Etkisi ve İlerleme
    const forwardX = Math.sin(this.headingAngle);
    const forwardZ = Math.cos(this.headingAngle);

    this.windField.getWindAt(this.position, this.scratchWind);
    const windDot = forwardX * this.scratchWind.x + forwardZ * this.scratchWind.z;
    const effSpeed = this.glideSpeed + Math.max(-2.5, windDot * 0.4);

    this.position.x += forwardX * effSpeed * deltaTime;
    this.position.z += forwardZ * effSpeed * deltaTime;

    // Yönlendirme
    if (input.magnitude > 0.05) {
      const targetAngle = cameraYaw + Math.atan2(input.x, input.y);
      this.headingAngle = Scalar.Lerp(this.headingAngle, targetAngle, Math.min(1.0, deltaTime * 5.0));
    }

    // İniş kontrolü
    if (this.position.y <= this.currentGroundHeight + 0.3) {
      this.position.y = this.currentGroundHeight;
      this.locomotionState = this.isInWater ? 'SWIM' : 'GROUND';
      this.hasDoubleJumped = false;
      this.verticalVelocity = 0;
      this.isGlidingActive = false;
      ProceduralAudio.playFootstep(this.isInWater);
    }
  }

  // ================= KALKAN KIZAĞI (SHIELD SURFING) =================

  private handleShieldSurfing(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    const normal = world.getNormalAt(this.position.x, this.position.z);
    const slope = 1.0 - normal[1];

    if (slope > 0.12) {
      this.surfSpeed = Math.min(14.5, this.surfSpeed + slope * 19.0 * deltaTime);
    } else {
      this.surfSpeed = Math.max(0, this.surfSpeed - 5.5 * deltaTime);
    }

    const slopeDirX = normal[0];
    const slopeDirZ = normal[2];

    this.position.x += (Math.sin(this.headingAngle) * 0.65 + slopeDirX * 0.35) * this.surfSpeed * deltaTime;
    this.position.z += (Math.cos(this.headingAngle) * 0.65 + slopeDirZ * 0.35) * this.surfSpeed * deltaTime;
    this.position.y = this.currentGroundHeight;

    if (input.magnitude > 0.05) {
      const turnAngle = cameraYaw + Math.atan2(input.x, input.y);
      this.headingAngle = Scalar.Lerp(this.headingAngle, turnAngle, Math.min(1.0, deltaTime * 6.5));
    }

    if (this.surfSpeed < 1.0 || this.isInWater) {
      this.locomotionState = this.isInWater ? 'SWIM' : 'GROUND';
      this.surfSpeed = 0;
    }
  }

  // ================= YÜZME, DALIŞ & NEFES ÇARKI =================

  private handleSwimmingAndDiving(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    if (!this.isInWater) {
      this.locomotionState = 'GROUND';
      this.isDiving = false;
      this.oxygen = this.MAX_OXYGEN;
      return;
    }

    const hasInput = input.magnitude > 0.05;
    const isSprintSwim = input.isRunRequested && combat.stamina > 5;
    const hasSuKutu = KamPowerManager.getInstance().hasSuKutu;
    const swimSpeedMult = hasSuKutu ? 1.5 : 1.0;

    // Dalış Durumu
    if (this.isDiving) {
      this.locomotionState = 'DIVE';
      if (hasSuKutu) {
        this.oxygen = this.MAX_OXYGEN;
      } else {
        this.oxygen = Math.max(0, this.oxygen - 6.5 * deltaTime);
      }

      // Oksijen biterse boğulma hasarı
      if (this.oxygen <= 0 && !hasSuKutu) {
        combat.health -= 9.0 * deltaTime;
      }

      this.position.y = WorldNoise.WATER_LEVEL - 1.85;
    } else {
      this.locomotionState = 'SWIM';
      // Yüzeyde nefes hızla yenilenir
      this.oxygen = Math.min(this.MAX_OXYGEN, this.oxygen + 35.0 * deltaTime);
      this.position.y = WorldNoise.WATER_LEVEL - 0.22;
    }

    let targetSpeed = 0;
    if (hasInput) {
      if (this.isDiving) {
        targetSpeed = this.diveSpeed * swimSpeedMult;
      } else {
        targetSpeed = (isSprintSwim ? this.sprintSwimSpeed : this.swimSpeed) * swimSpeedMult;
      }
    }

    if (isSprintSwim && !this.isDiving) {
      combat.stamina = Math.max(0, combat.stamina - (hasSuKutu ? 7.5 : 15.0) * deltaTime);
    }

    if (hasInput) {
      const camForwardX = Math.sin(cameraYaw);
      const camForwardZ = Math.cos(cameraYaw);
      const moveX = camForwardX * input.y + camForwardZ * input.x;
      const moveZ = camForwardZ * input.y - camForwardX * input.x;

      const len = Math.hypot(moveX, moveZ);
      if (len > 0.01) {
        this.headingAngle = Math.atan2(moveX / len, moveZ / len);
        this.position.x += (moveX / len) * this.currentSpeed * deltaTime;
        this.position.z += (moveZ / len) * this.currentSpeed * deltaTime;
      }
    }

    this.currentSpeed = Scalar.Lerp(this.currentSpeed, targetSpeed, Math.min(1.0, deltaTime * 8.0));
  }

  // ================= HAVADA DÜŞÜŞ & HAVADAN VURUŞ (AIRBORNE) =================

  private handleAirborne(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    if (this.isPlunging) {
      // Havadan aşağı vuruş dalışı
      this.verticalVelocity = this.plungeFallSpeed;
    } else {
      this.verticalVelocity += this.gravity * deltaTime;
    }

    this.position.y += this.verticalVelocity * deltaTime;

    // Havada yönlendirme
    if (input.magnitude > 0.05 && !this.isPlunging) {
      const camForwardX = Math.sin(cameraYaw);
      const camForwardZ = Math.cos(cameraYaw);
      this.position.x += (camForwardX * input.y + camForwardZ * input.x) * 4.2 * deltaTime;
      this.position.z += (camForwardZ * input.y - camForwardX * input.x) * 4.2 * deltaTime;
    }

    // Yere İniş Kontrolü
    if (this.position.y <= this.currentGroundHeight) {
      const impactVelocity = this.verticalVelocity;
      this.position.y = this.currentGroundHeight;
      this.verticalVelocity = 0;

      if (this.isPlunging) {
        // Havadan Vuruş İniş Patlaması
        this.isPlunging = false;
        combat.executePlungeImpact(this.position);
        this.landingShockTimer = 0.22;
      } else if (impactVelocity < -7.5) {
        // İniş şoku
        this.landingShockTimer = 0.16;
        ProceduralAudio.playImpact(false);
      } else {
        ProceduralAudio.playFootstep(this.isInWater);
      }

      this.locomotionState = this.isInWater ? 'SWIM' : 'GROUND';
      this.hasDoubleJumped = false;
    }
  }

  // ================= ZIPLAMA, SÜZÜLME & ÇÖMELME GİRDİLERİ =================

  /**
   * Zıplama Düğmesi: Yerdeyken zıplar, havada süzülür, tırmanırken leap yapar
   */
  public triggerJumpOrGlide(combat: CombatSystem): void {
    if (this.locomotionState === 'CLIMB') {
      this.triggerClimbLeap(combat);
      return;
    }

    if (this.locomotionState === 'GROUND' || this.coyoteTimer > 0) {
      if (combat.isShieldRaised) {
        this.locomotionState = 'SHIELD_SURF';
        this.surfSpeed = 6.8;
        ProceduralAudio.playButtonClick();
        return;
      }

      this.executeJump();
      return;
    }

    // Gök Kutu ile Çift Zıplama (Gök Sıçraması)
    if (this.locomotionState === 'AIRBORNE' && KamPowerManager.getInstance().hasGokKutu && !this.hasDoubleJumped && combat.stamina > 8) {
      this.hasDoubleJumped = true;
      this.verticalVelocity = this.jumpForce * 1.15;
      combat.stamina = Math.max(0, combat.stamina - 8.0);
      ProceduralAudio.playWindGust();
      return;
    }

    // Havada Zıplama Düğmesi = Süzülme Aç/Kapat
    if (this.locomotionState === 'AIRBORNE' && this.isGliderUnlocked && this.verticalVelocity < 2.0 && combat.stamina > 8) {
      this.locomotionState = 'GLIDE';
      this.verticalVelocity = this.glideFallSpeed;
      ProceduralAudio.playWindGust();
      return;
    }

    if (this.locomotionState === 'GLIDE') {
      this.locomotionState = 'AIRBORNE';
      this.isGlidingActive = false;
      return;
    }

    // Erken Zıplama Girdisi (Jump Input Buffering)
    if (this.locomotionState === 'AIRBORNE') {
      this.jumpBufferTimer = this.JUMP_BUFFER_TIME;
    }
  }

  private executeJump(): void {
    this.locomotionState = 'AIRBORNE';
    this.verticalVelocity = this.jumpForce;
    this.coyoteTimer = 0;
    this.isCrouching = false;
    ProceduralAudio.playFootstep(false);
  }

  /**
   * Çömelme / Gizlilik / Dalış Tetikleyicisi
   */
  public toggleCrouchOrDive(): void {
    if (this.locomotionState === 'SWIM') {
      this.isDiving = !this.isDiving;
      return;
    }

    if (this.locomotionState === 'GROUND') {
      this.isCrouching = !this.isCrouching;
      ProceduralAudio.playButtonClick();
    }
  }

  /**
   * Havadan Aşağı Vuruş (Plunge Attack) Başlatır
   */
  public triggerPlungeAttack(combat: CombatSystem): boolean {
    if ((this.locomotionState === 'AIRBORNE' || this.locomotionState === 'GLIDE') && !this.isPlunging) {
      this.locomotionState = 'AIRBORNE';
      this.isGlidingActive = false;
      this.isPlunging = true;
      ProceduralAudio.playSwordSwing(2);
      return true;
    }
    return false;
  }

  private handleBowAimMovement(input: MovementInput, cameraYaw: number, deltaTime: number): void {
    this.headingAngle = cameraYaw;

    if (input.magnitude > 0.05) {
      const camForwardX = Math.sin(cameraYaw);
      const camForwardZ = Math.cos(cameraYaw);
      const moveX = camForwardX * input.y + camForwardZ * input.x;
      const moveZ = camForwardZ * input.y - camForwardX * input.x;

      this.position.x += moveX * this.aimSpeed * deltaTime;
      this.position.z += moveZ * this.aimSpeed * deltaTime;
    }
  }

  private snapElevation(): void {
    if (this.isInWater) {
      if (this.trainingGround && this.trainingGround.isInTrainingPool(this.position)) {
        this.position.y = this.trainingGround.origin.y - 0.15;
      } else {
        this.position.y = WorldNoise.WATER_LEVEL - 0.22;
      }
    } else if (this.locomotionState !== 'AIRBORNE' && this.locomotionState !== 'GLIDE' && this.locomotionState !== 'CLIMB') {
      this.position.y = this.currentGroundHeight;
    }
  }

  private clampWorldBounds(): void {
    this.position.x = Scalar.Clamp(this.position.x, -this.maxBoundary, this.maxBoundary);
    this.position.z = Scalar.Clamp(this.position.z, -this.maxBoundary, this.maxBoundary);
  }
}
