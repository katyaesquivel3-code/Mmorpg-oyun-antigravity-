import {
  Scene,
  Vector3,
  Color4,
  ParticleSystem,
  Texture,
  TransformNode,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Scalar
} from '@babylonjs/core';
import { TrainingDummy, DummyAttackEvent } from './TrainingDummy';
import { ArrowSystem } from './ArrowSystem';
import { DamageNumberManager } from './DamageNumberManager';
import { WorldManager } from '../world/WorldManager';

export type CombatActionState =
  | 'IDLE'
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'ATTACK_3'
  | 'CHARGE_WINDUP'
  | 'CHARGE_ATTACK'
  | 'DODGE_ROLL'
  | 'SHIELD_BLOCK'
  | 'PARRY'
  | 'BOW_AIM'
  | 'BOW_SHOOT'
  | 'HURT';

export class CombatSystem {
  public scene: Scene;
  public arrowSystem: ArrowSystem;
  public damageNumbers: DamageNumberManager;

  // Player Combat Attributes
  public maxHealth = 100;
  public health = 100;
  public maxStamina = 100;
  public stamina = 100;
  public staminaRegenRate = 28.0; // /sec
  private staminaRegenCooldown = 0;

  // Active Combat State
  public actionState: CombatActionState = 'IDLE';
  public actionTimer = 0;
  public comboWindowTimer = 0;
  public comboStep = 0; // 0=None, 1=First, 2=Second, 3=Third

  // Charge Attack
  public isCharging = false;
  public chargeHoldTime = 0;
  public readonly MIN_CHARGE_TIME = 0.55;

  // Parry & Block Timing
  public isShieldRaised = false;
  public parryWindowTimer = 0;
  public readonly PARRY_WINDOW = 0.20; // 0.2s parry frame window

  // Dodge & Kut Zamanı
  public isRolling = false;
  public rollTimer = 0;
  public readonly ROLL_DURATION = 0.45;
  public readonly ROLL_IFRAME_DURATION = 0.25;
  public isKutZamaniActive = false;
  public kutZamaniTimer = 0;
  public readonly KUT_ZAMANI_DURATION = 3.0;

  // Lock-On Target
  public lockedTarget: TrainingDummy | null = null;
  public dummies: TrainingDummy[] = [];

  // Hit-Stop Micro-freeze (60-90ms)
  public playerHitStopTimer = 0;

  // Camera Trauma / Shake
  public cameraShakeTrauma = 0;
  public cameraShakeOffset = new Vector3(0, 0, 0);

  // Sparks Particle System (Pure procedural color / vertex particles)
  private sparkSystem: ParticleSystem | null = null;
  private sparkEmitter: TransformNode;

  // Root Motion displacement vector for current frame
  public rootMotionOffset = new Vector3(0, 0, 0);

  // Sword Trail Node
  public swordTipPos = new Vector3(0, 0, 0);

  constructor(scene: Scene, world: WorldManager) {
    this.scene = scene;
    this.arrowSystem = new ArrowSystem(scene);
    this.damageNumbers = new DamageNumberManager(scene);

    // Emitter node for spark particles
    this.sparkEmitter = new TransformNode('spark_emitter', scene);
    this.initSparks();

    // Spawn 3 stationary dummies and 1 attacking dummy ("Usta Kukla")
    // Form a circle in the Yer-Sub starting clearing near (x: 0, z: 12)
    const dummyPositions = [
      { id: '1', name: 'Talim Kuklası I', x: -3.5, z: 12.0, attacker: false },
      { id: '2', name: 'Talim Kuklası II', x: 0.0, z: 15.0, attacker: false },
      { id: '3', name: 'Talim Kuklası III', x: 3.5, z: 12.0, attacker: false },
      { id: '4', name: 'Usta Kukla (Saldıran)', x: 0.0, z: 8.5, attacker: true }
    ];

    for (const d of dummyPositions) {
      const dummy = new TrainingDummy(
        d.id,
        d.name,
        new Vector3(d.x, 0, d.z),
        d.attacker,
        scene,
        world
      );
      this.dummies.push(dummy);
    }
  }

  private initSparks(): void {
    const ps = new ParticleSystem('sparks', 100, this.scene);
    // Use procedural particle buffer with warm sparks
    ps.emitter = this.sparkEmitter;
    ps.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
    ps.maxEmitBox = new Vector3(0.1, 0.1, 0.1);

    ps.color1 = new Color4(1.0, 0.9, 0.3, 1.0); // Bright gold
    ps.color2 = new Color4(1.0, 0.4, 0.1, 1.0); // Spark orange
    ps.colorDead = new Color4(0.4, 0.1, 0.0, 0.0);

    ps.minSize = 0.08;
    ps.maxSize = 0.18;
    ps.minLifeTime = 0.15;
    ps.maxLifeTime = 0.35;
    ps.emitRate = 0; // Manual burst

    ps.gravity = new Vector3(0, -9.81, 0);
    ps.direction1 = new Vector3(-2, 2, -2);
    ps.direction2 = new Vector3(2, 4, 2);
    ps.minEmitPower = 3;
    ps.maxEmitPower = 7;
    ps.updateSpeed = 0.02;

    ps.start();
    this.sparkSystem = ps;
  }

  public emitSparksAt(pos: Vector3, count = 25): void {
    if (!this.sparkSystem) return;
    this.sparkEmitter.position.copyFrom(pos);
    this.sparkSystem.manualEmitCount = count;
  }

  /**
   * Triggers a Camera Trauma Shake (e.g. 0.4 = medium hit, 0.8 = heavy spin or parry)
   */
  public addCameraTrauma(amount: number): void {
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + amount);
  }

  // ===================== PLAYER COMBAT COMMANDS =====================

  /**
   * Attack button pressed (Kam Kılıcı)
   */
  public triggerAttack(isCharged = false): boolean {
    if (this.actionState === 'DODGE_ROLL' || this.actionState === 'HURT') return false;

    // Check stamina
    const stamCost = isCharged ? 30 : 12;
    if (this.stamina < stamCost) return false;

    this.stamina -= stamCost;
    this.staminaRegenCooldown = 0.8;

    if (isCharged) {
      this.actionState = 'CHARGE_ATTACK';
      this.actionTimer = 0;
      this.comboStep = 0;
      this.comboWindowTimer = 0;
      return true;
    }

    // 3-hit combo sequence
    if (this.comboWindowTimer > 0 && this.comboStep === 1) {
      // Step 2
      this.comboStep = 2;
      this.actionState = 'ATTACK_2';
      this.actionTimer = 0;
      this.comboWindowTimer = 0;
    } else if (this.comboWindowTimer > 0 && this.comboStep === 2) {
      // Step 3 (Finisher)
      this.comboStep = 3;
      this.actionState = 'ATTACK_3';
      this.actionTimer = 0;
      this.comboWindowTimer = 0;
    } else {
      // Step 1
      this.comboStep = 1;
      this.actionState = 'ATTACK_1';
      this.actionTimer = 0;
      this.comboWindowTimer = 0;
    }

    return true;
  }

  /**
   * Attack button held down for charged spin
   */
  public startCharge(): void {
    if (this.actionState === 'DODGE_ROLL' || this.actionState === 'HURT') return;
    if (this.stamina < 30) return;
    this.isCharging = true;
    this.chargeHoldTime = 0;
    this.actionState = 'CHARGE_WINDUP';
  }

  public releaseCharge(): void {
    if (!this.isCharging) return;
    this.isCharging = false;
    if (this.chargeHoldTime >= this.MIN_CHARGE_TIME) {
      this.triggerAttack(true);
    } else {
      // Standard strike fallback
      this.triggerAttack(false);
    }
  }

  /**
   * Dodge Roll (0.25s i-frame + possible Kut Zamanı)
   */
  public triggerDodgeRoll(headingAngle: number): boolean {
    if (this.actionState === 'DODGE_ROLL' || this.actionState === 'HURT') return false;
    if (this.stamina < 18) return false;

    this.stamina -= 18;
    this.staminaRegenCooldown = 0.9;
    this.actionState = 'DODGE_ROLL';
    this.actionTimer = 0;
    this.rollTimer = 0;
    this.isRolling = true;

    // Check if dodging right before an incoming dummy attack (0.15s window -> Kut Zamanı!)
    for (const dummy of this.dummies) {
      if (dummy.isAttacker && dummy.isTelegraphing) {
        // Perfect Dodge window triggered!
        this.triggerKutZamani();
        break;
      }
    }

    return true;
  }

  /**
   * Raises shield (Hold) or taps for Parry
   */
  public setShieldActive(active: boolean): void {
    if (this.actionState === 'DODGE_ROLL' || this.actionState === 'HURT') return;

    if (active) {
      if (!this.isShieldRaised) {
        // Shield just raised: start 0.20s parry frame window
        this.parryWindowTimer = this.PARRY_WINDOW;
      }
      this.isShieldRaised = true;
      if (this.actionState === 'IDLE') {
        this.actionState = 'SHIELD_BLOCK';
      }
    } else {
      this.isShieldRaised = false;
      this.parryWindowTimer = 0;
      if (this.actionState === 'SHIELD_BLOCK' || this.actionState === 'PARRY') {
        this.actionState = 'IDLE';
      }
    }
  }

  /**
   * Bow Aim Mode Toggle
   */
  public setBowAim(active: boolean): void {
    if (this.actionState === 'DODGE_ROLL' || this.actionState === 'HURT') return;
    if (active) {
      this.actionState = 'BOW_AIM';
    } else {
      if (this.actionState === 'BOW_AIM') {
        this.actionState = 'IDLE';
      }
    }
  }

  /**
   * Fires arrow in direction
   */
  public shootArrow(origin: Vector3, forwardDir: Vector3): boolean {
    if (this.stamina < 15) return false;
    const shot = this.arrowSystem.shootArrow(origin, forwardDir, 32);
    if (shot) {
      this.stamina -= 15;
      this.staminaRegenCooldown = 0.6;
      this.actionState = 'BOW_SHOOT';
      this.actionTimer = 0;
      this.addCameraTrauma(0.2);
    }
    return shot;
  }

  /**
   * Toggles Lock-on to nearest target or cycles targets
   */
  public toggleLockOn(playerPos: Vector3): void {
    if (this.lockedTarget) {
      // Find next target or unlock
      const idx = this.dummies.indexOf(this.lockedTarget);
      const nextIdx = (idx + 1) % this.dummies.length;
      const nextTarget = this.dummies[nextIdx];
      const dist = Vector3.Distance(playerPos, nextTarget.position);
      if (dist <= 25.0) {
        this.lockedTarget = nextTarget;
      } else {
        this.lockedTarget = null;
      }
    } else {
      // Acquire closest dummy within 25m
      let closest: TrainingDummy | null = null;
      let closestDist = 25.0;

      for (const d of this.dummies) {
        const dist = Vector3.Distance(playerPos, d.position);
        if (dist < closestDist) {
          closestDist = dist;
          closest = d;
        }
      }

      this.lockedTarget = closest;
    }
  }

  /**
   * Kut Zamanı (Flurry Time) - Golden slow-motion for 3.0s
   */
  public triggerKutZamani(): void {
    this.isKutZamaniActive = true;
    this.kutZamaniTimer = this.KUT_ZAMANI_DURATION;
    this.addCameraTrauma(0.5);

    // Announce via HUD
    const hudCenter = document.getElementById('statusMessage');
    if (hudCenter) {
      hudCenter.innerText = "⚡ KUT ZAMANI! (YAVAŞ ÇEKİM)";
      hudCenter.style.color = '#facc15';
      hudCenter.style.borderColor = '#facc15';
    }

    // Spawn golden Kut spark burst
    this.emitSparksAt(this.scene.activeCamera?.position || Vector3.Zero(), 35);
  }

  // ===================== MAIN COMBAT TICK =====================

  public update(deltaTime: number, playerPos: Vector3, playerHeading: number, world: WorldManager): void {
    // 1. Kut Zamanı slow-motion timer (world speed = 0.2x, but player at 1.0x)
    const effectiveWorldDelta = this.isKutZamaniActive ? deltaTime * 0.2 : deltaTime;

    if (this.isKutZamaniActive) {
      this.kutZamaniTimer -= deltaTime;
      if (this.kutZamaniTimer <= 0) {
        this.isKutZamaniActive = false;
        const hudCenter = document.getElementById('statusMessage');
        if (hudCenter) {
          hudCenter.innerText = "512x512m Açık Dünya — Dört Biyom";
          hudCenter.style.color = '#f8fafc';
          hudCenter.style.borderColor = 'rgba(250, 204, 21, 0.35)';
        }
      }
    }

    // 2. Camera Trauma Shake Decay
    if (this.cameraShakeTrauma > 0) {
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - deltaTime * 2.2);
      const shakeMag = this.cameraShakeTrauma * this.cameraShakeTrauma * 0.35;
      this.cameraShakeOffset.set(
        (Math.random() - 0.5) * shakeMag,
        (Math.random() - 0.5) * shakeMag,
        (Math.random() - 0.5) * shakeMag
      );
    } else {
      this.cameraShakeOffset.set(0, 0, 0);
    }

    // 3. Hit-stop micro-freeze (on player animation only)
    if (this.playerHitStopTimer > 0) {
      this.playerHitStopTimer -= deltaTime;
    }

    // 4. Parry window decay
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer -= deltaTime;
    }

    // 5. Stamina regeneration
    if (this.staminaRegenCooldown > 0) {
      this.staminaRegenCooldown -= deltaTime;
    } else if (this.actionState === 'IDLE' && !this.isShieldRaised) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * deltaTime);
    }

    // 6. Update 3D Floating Damage Numbers
    this.damageNumbers.update(deltaTime);

    // 7. Update Ballistic Arrows
    this.arrowSystem.update(
      effectiveWorldDelta,
      world,
      (pos, radius) => {
        for (const dummy of this.dummies) {
          const dummyCenter = dummy.position.clone().add(new Vector3(0, 0.8, 0));
          if (Vector3.Distance(pos, dummyCenter) <= (0.55 + radius)) {
            const isHead = pos.y >= (dummy.position.y + 1.15);
            return { hit: true, enemyPos: dummy.position, isHeadshot: isHead };
          }
        }
        return null;
      },
      (hitPos, normal, damage, isHeadshot) => {
        // Register arrow damage on dummy
        for (const dummy of this.dummies) {
          if (Vector3.Distance(hitPos, dummy.position.clone().add(new Vector3(0, 0.8, 0))) <= 1.2) {
            dummy.takeDamage(damage, normal);
            this.damageNumbers.spawn(hitPos, damage, isHeadshot);
            this.emitSparksAt(hitPos, isHeadshot ? 30 : 15);
            this.addCameraTrauma(isHeadshot ? 0.35 : 0.15);
            break;
          }
        }
      }
    );

    // 8. Update Training Dummies & check incoming attacks on player
    for (const dummy of this.dummies) {
      const attackEvent = dummy.update(effectiveWorldDelta, playerPos);
      if (attackEvent && attackEvent.isStrikeActive) {
        this.handleIncomingEnemyAttack(dummy, attackEvent, playerPos);
      }
    }

    // 9. Player Action State Machine (Combo timings, root motion, hitboxes)
    this.updatePlayerActions(deltaTime, playerPos, playerHeading);

    // 10. Validate lock-on target distance
    if (this.lockedTarget) {
      const dist = Vector3.Distance(playerPos, this.lockedTarget.position);
      if (dist > 30.0) {
        this.lockedTarget = null;
      }
    }
  }

  /**
   * Evaluates incoming enemy attacks against Block, Parry, Dodge i-frames, and Damage.
   */
  private handleIncomingEnemyAttack(
    dummy: TrainingDummy,
    event: DummyAttackEvent,
    playerPos: Vector3
  ): void {
    const dist = Vector3.Distance(dummy.position, playerPos);
    if (dist > 2.8) return; // Out of melee reach

    // 1. Invulnerable during dodge roll i-frames?
    if (this.isRolling && this.rollTimer <= this.ROLL_IFRAME_DURATION) {
      // Evaded with i-frames!
      return;
    }

    // 2. Parry Window Active? (Tap shield within 0.20s of impact)
    if (this.isShieldRaised && this.parryWindowTimer > 0) {
      // PARRY SUCCESSFUL!
      dummy.applyParryStun();
      this.emitSparksAt(playerPos.clone().add(new Vector3(0, 1.0, 0)), 40);
      this.damageNumbers.spawn(dummy.position.clone().add(new Vector3(0, 1.2, 0)), 0, true);
      this.addCameraTrauma(0.6);
      this.stamina = Math.min(this.maxStamina, this.stamina + 25); // Reward stamina
      this.actionState = 'PARRY';
      this.actionTimer = 0;
      this.parryWindowTimer = 0;

      const hudCenter = document.getElementById('statusMessage');
      if (hudCenter) {
        hudCenter.innerText = "🛡️ PARRY! DÜŞMAN SERSEMLEDİ!";
        hudCenter.style.color = '#38bdf8';
      }
      return;
    }

    // 3. Regular Shield Block Active? (Reduces damage 80%, consumes stamina)
    if (this.isShieldRaised) {
      const blockedDmg = event.damage * 0.2;
      this.health = Math.max(0, this.health - blockedDmg);
      this.stamina = Math.max(0, this.stamina - 15);
      this.emitSparksAt(playerPos.clone().add(new Vector3(0, 1.0, 0)), 15);
      this.damageNumbers.spawn(playerPos.clone().add(new Vector3(0, 1.0, 0)), blockedDmg, false);
      this.addCameraTrauma(0.2);
      return;
    }

    // 4. Direct Hit Taken!
    this.health = Math.max(0, this.health - event.damage);
    this.damageNumbers.spawn(playerPos.clone().add(new Vector3(0, 1.0, 0)), event.damage, false);
    this.emitSparksAt(playerPos.clone().add(new Vector3(0, 1.0, 0)), 20);
    this.addCameraTrauma(0.45);
    this.actionState = 'HURT';
    this.actionTimer = 0;

    // Reset health if player falls during practice
    if (this.health <= 0) {
      this.health = this.maxHealth;
    }
  }

  /**
   * Advances player's active melee combos, charge spin, roll, and bow actions.
   */
  private updatePlayerActions(deltaTime: number, playerPos: Vector3, playerHeading: number): void {
    this.rootMotionOffset.set(0, 0, 0);

    // Combo Window decay (0.35s after each strike)
    if (this.comboWindowTimer > 0) {
      this.comboWindowTimer -= deltaTime;
      if (this.comboWindowTimer <= 0) {
        this.comboStep = 0;
      }
    }

    // Charge windup holding
    if (this.actionState === 'CHARGE_WINDUP') {
      this.chargeHoldTime += deltaTime;
      return;
    }

    // Dodge Roll
    if (this.actionState === 'DODGE_ROLL') {
      this.actionTimer += deltaTime;
      this.rollTimer = this.actionTimer;

      // Root motion leap forward
      const forwardX = Math.sin(playerHeading);
      const forwardZ = Math.cos(playerHeading);
      const rollSpeed = 10.5 * (1.0 - this.actionTimer / this.ROLL_DURATION);
      this.rootMotionOffset.x = forwardX * rollSpeed * deltaTime;
      this.rootMotionOffset.z = forwardZ * rollSpeed * deltaTime;

      if (this.actionTimer >= this.ROLL_DURATION) {
        this.isRolling = false;
        this.actionState = 'IDLE';
        this.actionTimer = 0;
      }
      return;
    }

    // Attack 1: Slash Right-to-Left (0.36s)
    if (this.actionState === 'ATTACK_1') {
      this.actionTimer += deltaTime;

      // Root motion step
      if (this.actionTimer > 0.08 && this.actionTimer < 0.22) {
        const forwardX = Math.sin(playerHeading);
        const forwardZ = Math.cos(playerHeading);
        this.rootMotionOffset.x = forwardX * 2.8 * deltaTime;
        this.rootMotionOffset.z = forwardZ * 2.8 * deltaTime;
      }

      // Hitbox active window at 0.16s
      if (this.actionTimer >= 0.16 && this.actionTimer - deltaTime < 0.16) {
        this.checkMeleeHitbox(playerPos, playerHeading, 18, 2.2, Math.PI * 0.55);
      }

      if (this.actionTimer >= 0.36) {
        this.actionState = 'IDLE';
        this.actionTimer = 0;
        this.comboWindowTimer = 0.35; // 0.35s window to press attack for Strike 2
      }
      return;
    }

    // Attack 2: Slash Left-to-Right (0.38s)
    if (this.actionState === 'ATTACK_2') {
      this.actionTimer += deltaTime;

      if (this.actionTimer > 0.08 && this.actionTimer < 0.24) {
        const forwardX = Math.sin(playerHeading);
        const forwardZ = Math.cos(playerHeading);
        this.rootMotionOffset.x = forwardX * 3.4 * deltaTime;
        this.rootMotionOffset.z = forwardZ * 3.4 * deltaTime;
      }

      if (this.actionTimer >= 0.18 && this.actionTimer - deltaTime < 0.18) {
        this.checkMeleeHitbox(playerPos, playerHeading, 24, 2.4, Math.PI * 0.6);
      }

      if (this.actionTimer >= 0.38) {
        this.actionState = 'IDLE';
        this.actionTimer = 0;
        this.comboWindowTimer = 0.35; // 0.35s window for Strike 3 finisher
      }
      return;
    }

    // Attack 3: Finisher Thrust & Slam (0.52s)
    if (this.actionState === 'ATTACK_3') {
      this.actionTimer += deltaTime;

      if (this.actionTimer > 0.12 && this.actionTimer < 0.32) {
        const forwardX = Math.sin(playerHeading);
        const forwardZ = Math.cos(playerHeading);
        this.rootMotionOffset.x = forwardX * 5.2 * deltaTime;
        this.rootMotionOffset.z = forwardZ * 5.2 * deltaTime;
      }

      if (this.actionTimer >= 0.25 && this.actionTimer - deltaTime < 0.25) {
        this.checkMeleeHitbox(playerPos, playerHeading, 42, 2.8, Math.PI * 0.45, true);
        this.addCameraTrauma(0.5);
      }

      if (this.actionTimer >= 0.52) {
        this.actionState = 'IDLE';
        this.actionTimer = 0;
        this.comboStep = 0;
        this.comboWindowTimer = 0;
      }
      return;
    }

    // Charged Spin Attack: 360 Whirlwind (0.65s)
    if (this.actionState === 'CHARGE_ATTACK') {
      this.actionTimer += deltaTime;

      if (this.actionTimer >= 0.22 && this.actionTimer - deltaTime < 0.22) {
        // Full 360 degree 3.5m radius blast
        this.checkMeleeHitbox(playerPos, playerHeading, 55, 3.5, Math.PI * 2.0, true);
        this.emitSparksAt(playerPos.clone().add(new Vector3(0, 0.8, 0)), 50);
        this.addCameraTrauma(0.7);
      }

      if (this.actionTimer >= 0.65) {
        this.actionState = 'IDLE';
        this.actionTimer = 0;
      }
      return;
    }

    // Hurt recovery
    if (this.actionState === 'HURT') {
      this.actionTimer += deltaTime;
      if (this.actionTimer >= 0.32) {
        this.actionState = 'IDLE';
        this.actionTimer = 0;
      }
      return;
    }

    // Bow Shoot recovery
    if (this.actionState === 'BOW_SHOOT') {
      this.actionTimer += deltaTime;
      if (this.actionTimer >= 0.3) {
        this.actionState = 'BOW_AIM';
        this.actionTimer = 0;
      }
      return;
    }

    // Parry recoil recovery
    if (this.actionState === 'PARRY') {
      this.actionTimer += deltaTime;
      if (this.actionTimer >= 0.35) {
        this.actionState = this.isShieldRaised ? 'SHIELD_BLOCK' : 'IDLE';
        this.actionTimer = 0;
      }
      return;
    }
  }

  /**
   * Tests arc hitbox around player and applies damage, knockback, hit-stop, and sparks.
   */
  private checkMeleeHitbox(
    playerPos: Vector3,
    playerHeading: number,
    damage: number,
    maxDist: number,
    maxAngle: number,
    isKnockback = false
  ): void {
    const forwardX = Math.sin(playerHeading);
    const forwardZ = Math.cos(playerHeading);

    for (const dummy of this.dummies) {
      const toDummyX = dummy.position.x - playerPos.x;
      const toDummyZ = dummy.position.z - playerPos.z;
      const dist = Math.sqrt(toDummyX * toDummyX + toDummyZ * toDummyZ);

      if (dist <= maxDist) {
        // Angle test
        const normX = toDummyX / dist;
        const normZ = toDummyZ / dist;
        const dot = forwardX * normX + forwardZ * normZ;
        const angle = Math.acos(Scalar.Clamp(dot, -1, 1));

        if (angle <= maxAngle / 2) {
          // HIT CONFIRMED!
          dummy.takeDamage(damage, new Vector3(normX, 0, normZ));
          this.damageNumbers.spawn(dummy.position.clone().add(new Vector3(0, 1.1, 0)), damage, isKnockback);

          // Hit-stop micro freeze (75ms)
          this.playerHitStopTimer = 0.075;

          // Camera Shake
          this.addCameraTrauma(isKnockback ? 0.45 : 0.25);

          // Spark particles
          const sparkPoint = dummy.position.clone().add(new Vector3(0, 0.9, 0));
          this.emitSparksAt(sparkPoint, isKnockback ? 35 : 20);
        }
      }
    }
  }

  public dispose(): void {
    this.arrowSystem.dispose();
    this.damageNumbers.dispose();
    for (const d of this.dummies) {
      d.dispose();
    }
    this.dummies = [];
    if (this.sparkSystem) {
      this.sparkSystem.dispose();
    }
    this.sparkEmitter.dispose();
  }
}
