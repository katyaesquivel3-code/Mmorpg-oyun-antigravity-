import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  Scalar
} from '@babylonjs/core';
import { WorldManager } from '../world/WorldManager';

export interface DummyAttackEvent {
  dummyPos: Vector3;
  damage: number;
  timeToHit: number; // in seconds
  isStrikeActive: boolean;
}

export class TrainingDummy {
  public id: string;
  public name: string;
  public isAttacker: boolean;
  public root: TransformNode;
  public position: Vector3;

  public maxHealth = 100;
  public health = 100;
  public isStaggered = false;
  public staggerTimer = 0;

  // Visual meshes
  private bodyMesh: Mesh;
  private headMesh: Mesh;
  private crossArmMesh: Mesh;
  private weaponMesh: Mesh | null = null;
  private runeEyeLeft: Mesh | null = null;
  private runeEyeRight: Mesh | null = null;

  // Materials
  private matWood: StandardMaterial;
  private matStraw: StandardMaterial;
  private matArmor: StandardMaterial;
  private matWeapon: StandardMaterial;
  private matRuneGlow: StandardMaterial;

  // Hit reaction & wobble physics
  private wobbleAngle = 0;
  private wobbleVelocity = 0;
  private hitFlashTimer = 0;

  // Attacker AI state
  private attackTimer = 0;
  private attackPhase: 'IDLE' | 'TELEGRAPH' | 'STRIKE' | 'RECOVERY' = 'IDLE';
  public isTelegraphing = false;
  public isStriking = false;

  constructor(
    id: string,
    name: string,
    position: Vector3,
    isAttacker: boolean,
    scene: Scene,
    world: WorldManager
  ) {
    this.id = id;
    this.name = name;
    this.isAttacker = isAttacker;

    // Ground position clamping
    const groundY = world.getHeightAt(position.x, position.z);
    this.position = new Vector3(position.x, groundY, position.z);

    this.root = new TransformNode(`dummy_root_${id}`, scene);
    this.root.position.copyFrom(this.position);

    // Materials
    this.matWood = new StandardMaterial(`mat_dummy_wood_${id}`, scene);
    this.matWood.diffuseColor = isAttacker ? new Color3(0.35, 0.22, 0.15) : new Color3(0.5, 0.35, 0.2);

    this.matStraw = new StandardMaterial(`mat_dummy_straw_${id}`, scene);
    this.matStraw.diffuseColor = isAttacker ? new Color3(0.65, 0.5, 0.25) : new Color3(0.85, 0.72, 0.4);

    this.matArmor = new StandardMaterial(`mat_dummy_armor_${id}`, scene);
    this.matArmor.diffuseColor = isAttacker ? new Color3(0.65, 0.15, 0.15) : new Color3(0.2, 0.4, 0.6);

    this.matWeapon = new StandardMaterial(`mat_dummy_weap_${id}`, scene);
    this.matWeapon.diffuseColor = new Color3(0.2, 0.2, 0.25);

    this.matRuneGlow = new StandardMaterial(`mat_dummy_rune_${id}`, scene);
    this.matRuneGlow.diffuseColor = new Color3(1.0, 0.2, 0.2);
    this.matRuneGlow.emissiveColor = new Color3(0.8, 0.1, 0.1);

    // Build Dummy hierarchy
    // Stand base post
    const basePost = MeshBuilder.CreateCylinder(`dummy_base_${id}`, {
      height: 0.6,
      diameter: 0.3,
      tessellation: 8
    }, scene);
    basePost.position.y = 0.3;
    basePost.material = this.matWood;
    basePost.parent = this.root;

    // Upper Wobble Pivot Node
    const wobbleNode = new TransformNode(`dummy_wobble_${id}`, scene);
    wobbleNode.position.y = 0.6;
    wobbleNode.parent = this.root;

    // Torso (Straw dummy with leather harness)
    this.bodyMesh = MeshBuilder.CreateCylinder(`dummy_body_${id}`, {
      height: 0.9,
      diameterTop: 0.45,
      diameterBottom: 0.38,
      tessellation: 10
    }, scene);
    this.bodyMesh.position.y = 0.45;
    this.bodyMesh.material = this.matStraw;
    this.bodyMesh.parent = wobbleNode;

    // Wooden cross arm (target bars)
    this.crossArmMesh = MeshBuilder.CreateBox(`dummy_arm_${id}`, {
      width: 1.1,
      height: 0.12,
      depth: 0.12
    }, scene);
    this.crossArmMesh.position.y = 0.7;
    this.crossArmMesh.material = this.matWood;
    this.crossArmMesh.parent = wobbleNode;

    // Head (Straw helmet with red/blue shaman talisman)
    this.headMesh = MeshBuilder.CreateSphere(`dummy_head_${id}`, {
      diameter: 0.36,
      segments: 8
    }, scene);
    this.headMesh.position.y = 1.05;
    this.headMesh.material = this.matStraw;
    this.headMesh.parent = wobbleNode;

    // Talisman Headband
    const band = MeshBuilder.CreateTorus(`dummy_band_${id}`, {
      diameter: 0.38,
      thickness: 0.05,
      tessellation: 12
    }, scene);
    band.position.y = 1.08;
    band.material = this.matArmor;
    band.parent = wobbleNode;

    // Attacker specifics: Glowing runic eyes & Spear weapon
    if (this.isAttacker) {
      const eyeL = MeshBuilder.CreateSphere(`eye_l_${id}`, { diameter: 0.08, segments: 6 }, scene);
      eyeL.position.set(-0.08, 1.08, 0.16);
      eyeL.material = this.matRuneGlow;
      eyeL.parent = wobbleNode;
      this.runeEyeLeft = eyeL;

      const eyeR = MeshBuilder.CreateSphere(`eye_r_${id}`, { diameter: 0.08, segments: 6 }, scene);
      eyeR.position.set(0.08, 1.08, 0.16);
      eyeR.material = this.matRuneGlow;
      eyeR.parent = wobbleNode;
      this.runeEyeRight = eyeR;

      // Training Halberd / Spear
      const spear = MeshBuilder.CreateCylinder(`dummy_spear_${id}`, {
        height: 1.8,
        diameter: 0.04,
        tessellation: 6
      }, scene);
      spear.position.set(0.45, 0.6, 0.4);
      spear.rotation.x = Math.PI / 4;
      spear.material = this.matWeapon;
      spear.parent = wobbleNode;
      this.weaponMesh = spear;
    }

    // Orient dummy to face camp center
    const lookAngle = Math.atan2(-this.position.x, -this.position.z);
    this.root.rotation.y = lookAngle;
  }

  /**
   * Applies damage to dummy, wobbles physics, flashes mesh, and handles instant regen.
   */
  public takeDamage(amount: number, hitDir: Vector3): boolean {
    this.health = Math.max(0, this.health - amount);

    // Wobble impulse
    this.wobbleVelocity += 14.0;
    this.hitFlashTimer = 0.14;

    // Flash bright emissive
    this.bodyMesh.material = this.matArmor;
    this.matStraw.emissiveColor = new Color3(0.9, 0.8, 0.7);

    // Instant reset / heal if defeated (training ground contract)
    if (this.health <= 0) {
      this.health = this.maxHealth;
      this.wobbleVelocity += 20.0;
      return true; // Was lethal blow
    }

    return false;
  }

  /**
   * Parried by player! Stuns the dummy for 2 seconds and cancels active attack.
   */
  public applyParryStun(): void {
    this.isStaggered = true;
    this.staggerTimer = 2.0;
    this.wobbleVelocity = -18.0;
    this.attackPhase = 'RECOVERY';
    this.attackTimer = 0;
    this.isTelegraphing = false;
    this.isStriking = false;

    // Flash blue/gold stun
    if (this.runeEyeLeft && this.runeEyeRight) {
      this.matRuneGlow.emissiveColor = new Color3(0.2, 0.8, 1.0);
    }
  }

  public update(deltaTime: number, playerPos: Vector3): DummyAttackEvent | null {
    // 1. Stun / Stagger recovery
    if (this.isStaggered) {
      this.staggerTimer -= deltaTime;
      if (this.staggerTimer <= 0) {
        this.isStaggered = false;
        if (this.runeEyeLeft && this.runeEyeRight) {
          this.matRuneGlow.emissiveColor = new Color3(0.8, 0.1, 0.1);
        }
      }
    }

    // 2. Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime;
      if (this.hitFlashTimer <= 0) {
        this.bodyMesh.material = this.matStraw;
        this.matStraw.emissiveColor = new Color3(0, 0, 0);
      }
    }

    // 3. Spring damped wobble physics
    const springK = 35.0;
    const damping = 7.0;
    const springForce = -springK * this.wobbleAngle;
    const dampingForce = -damping * this.wobbleVelocity;

    this.wobbleVelocity += (springForce + dampingForce) * deltaTime;
    this.wobbleAngle += this.wobbleVelocity * deltaTime;

    const wobbleNode = this.root.getChildren()[1] as TransformNode;
    if (wobbleNode) {
      wobbleNode.rotation.x = this.wobbleAngle * 0.08;
      wobbleNode.rotation.z = Math.sin(this.wobbleAngle * 1.5) * 0.04;
    }

    // 4. Attacking Dummy AI
    if (!this.isAttacker || this.isStaggered) {
      return null;
    }

    const distToPlayer = Vector3.Distance(this.position, playerPos);
    // Face player
    const toPlayer = playerPos.subtract(this.position);
    this.root.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

    this.attackTimer += deltaTime;

    let attackEvent: DummyAttackEvent | null = null;

    if (this.attackPhase === 'IDLE') {
      this.isTelegraphing = false;
      this.isStriking = false;
      if (this.attackTimer >= 2.6 && distToPlayer <= 5.5) {
        // Start 0.5s Telegraph windup
        this.attackPhase = 'TELEGRAPH';
        this.attackTimer = 0;
        this.isTelegraphing = true;
      }
    } else if (this.attackPhase === 'TELEGRAPH') {
      // 0.5s Telegraph: Glowing red spear and eye pulse
      this.isTelegraphing = true;
      const pulse = 1.0 + Math.sin(this.attackTimer * 20.0) * 0.6;
      this.matRuneGlow.emissiveColor = new Color3(1.0 * pulse, 0.1, 0.1);

      if (wobbleNode) {
        // Wind back
        wobbleNode.rotation.x = -0.25;
      }

      attackEvent = {
        dummyPos: this.position,
        damage: 22,
        timeToHit: Math.max(0, 0.5 - this.attackTimer),
        isStrikeActive: false
      };

      if (this.attackTimer >= 0.5) {
        // Execute strike
        this.attackPhase = 'STRIKE';
        this.attackTimer = 0;
        this.isTelegraphing = false;
        this.isStriking = true;
      }
    } else if (this.attackPhase === 'STRIKE') {
      // 0.22s strike window
      this.isStriking = true;
      if (wobbleNode) {
        // Thrust forward
        wobbleNode.rotation.x = 0.45;
      }

      attackEvent = {
        dummyPos: this.position,
        damage: 22,
        timeToHit: 0,
        isStrikeActive: true
      };

      if (this.attackTimer >= 0.22) {
        this.attackPhase = 'RECOVERY';
        this.attackTimer = 0;
        this.isStriking = false;
        this.matRuneGlow.emissiveColor = new Color3(0.8, 0.1, 0.1);
      }
    } else if (this.attackPhase === 'RECOVERY') {
      this.isStriking = false;
      this.isTelegraphing = false;
      if (this.attackTimer >= 1.0) {
        this.attackPhase = 'IDLE';
        this.attackTimer = 0;
      }
    }

    return attackEvent;
  }

  public dispose(): void {
    this.root.dispose();
  }
}
