import {
  TransformNode,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  ShadowGenerator,
  TrailMesh
} from '@babylonjs/core';

export type AyazAnimState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'SWIM'
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

export class AyazModel {
  public root: TransformNode;

  // Skeletal Hierarchy Nodes
  public pelvisNode: TransformNode;
  public chestNode: TransformNode;
  public headNode: TransformNode;

  // Arms
  public lShoulderNode: TransformNode;
  public lArmNode: TransformNode;
  public lForearmNode: TransformNode;
  public rShoulderNode: TransformNode;
  public rArmNode: TransformNode;
  public rForearmNode: TransformNode;

  // Legs
  public lHipNode: TransformNode;
  public lThighNode: TransformNode;
  public lCalfNode: TransformNode;
  public rHipNode: TransformNode;
  public rThighNode: TransformNode;
  public rCalfNode: TransformNode;

  // Secondary Motion & Equipment Nodes
  public capeNode: TransformNode;
  public swordNode: TransformNode;
  public shieldNode: TransformNode;
  public bowNode: TransformNode;
  public swordTipNode: TransformNode;

  // Trail
  public swordTrail: TrailMesh | null = null;
  private matSwordTrail: StandardMaterial;

  // Animation cycle phase & action timers
  private animPhase = 0;
  private capePhase = 0;
  private actionTimer = 0;
  private rollAngle = 0;

  constructor(scene: Scene, shadowGen: ShadowGenerator | null = null) {
    this.root = new TransformNode('ayaz_root', scene);

    // Create Toon / Cel-shaded Materials
    const matTunic = new StandardMaterial('mat_ayaz_tunic', scene);
    matTunic.diffuseColor = new Color3(0.12, 0.25, 0.42); // Deep Turkish Blue
    matTunic.specularColor = new Color3(0.1, 0.1, 0.1);

    const matBelt = new StandardMaterial('mat_ayaz_belt', scene);
    matBelt.diffuseColor = new Color3(0.85, 0.15, 0.15); // Kut Red
    matBelt.specularColor = new Color3(0.15, 0.15, 0.15);

    const matLeather = new StandardMaterial('mat_ayaz_leather', scene);
    matLeather.diffuseColor = new Color3(0.42, 0.22, 0.1); // Warrior Leather
    matLeather.specularColor = new Color3(0.08, 0.08, 0.08);

    const matSkin = new StandardMaterial('mat_ayaz_skin', scene);
    matSkin.diffuseColor = new Color3(0.92, 0.72, 0.58); // Sun-kissed skin
    matSkin.specularColor = new Color3(0.05, 0.05, 0.05);

    const matHair = new StandardMaterial('mat_ayaz_hair', scene);
    matHair.diffuseColor = new Color3(0.15, 0.1, 0.08); // Dark hair

    const matFur = new StandardMaterial('mat_ayaz_fur', scene);
    matFur.diffuseColor = new Color3(0.92, 0.9, 0.85); // Cream fur collar

    const matKutGlow = new StandardMaterial('mat_ayaz_kut_gem', scene);
    matKutGlow.diffuseColor = new Color3(0.2, 0.75, 0.98);
    matKutGlow.emissiveColor = new Color3(0.1, 0.65, 0.95); // Glowing Kut magic

    const matSteel = new StandardMaterial('mat_ayaz_steel', scene);
    matSteel.diffuseColor = new Color3(0.85, 0.88, 0.92);
    matSteel.specularColor = new Color3(0.9, 0.9, 0.95);

    const matBronze = new StandardMaterial('mat_ayaz_bronze', scene);
    matBronze.diffuseColor = new Color3(0.75, 0.55, 0.25);
    matBronze.specularColor = new Color3(0.5, 0.4, 0.2);

    // 1. Pelvis
    this.pelvisNode = new TransformNode('pelvis', scene);
    this.pelvisNode.parent = this.root;
    this.pelvisNode.position.y = 0.95;

    const pelvisMesh = MeshBuilder.CreateBox('pelvisMesh', { width: 0.38, height: 0.22, depth: 0.24 }, scene);
    pelvisMesh.material = matBelt;
    pelvisMesh.parent = this.pelvisNode;

    // 2. Chest & Torso
    this.chestNode = new TransformNode('chest', scene);
    this.chestNode.parent = this.pelvisNode;
    this.chestNode.position.y = 0.22;

    const chestMesh = MeshBuilder.CreateBox('chestMesh', { width: 0.42, height: 0.4, depth: 0.26 }, scene);
    chestMesh.position.y = 0.2;
    chestMesh.material = matTunic;
    chestMesh.parent = this.chestNode;

    // Fur Pauldrons / Collar
    const furCollar = MeshBuilder.CreateTorus('furCollar', { diameter: 0.42, thickness: 0.1, tessellation: 12 }, scene);
    furCollar.scaling.z = 0.7;
    furCollar.position.y = 0.38;
    furCollar.material = matFur;
    furCollar.parent = this.chestNode;

    // 3. Head & Shaman details
    this.headNode = new TransformNode('head', scene);
    this.headNode.parent = this.chestNode;
    this.headNode.position.y = 0.45;

    const headMesh = MeshBuilder.CreateSphere('headMesh', { diameterX: 0.26, diameterY: 0.3, diameterZ: 0.26, segments: 10 }, scene);
    headMesh.position.y = 0.15;
    headMesh.material = matSkin;
    headMesh.parent = this.headNode;

    // Hair bun & braids
    const hairBun = MeshBuilder.CreateSphere('hairBun', { diameter: 0.16, segments: 8 }, scene);
    hairBun.position.set(0, 0.26, -0.1);
    hairBun.material = matHair;
    hairBun.parent = this.headNode;

    // Shaman eagle feather / headband
    const feather = MeshBuilder.CreateCylinder('feather', { height: 0.24, diameterTop: 0.01, diameterBottom: 0.05, tessellation: 6 }, scene);
    feather.rotation.z = 0.35;
    feather.position.set(0.12, 0.32, -0.05);
    feather.material = matFur;
    feather.parent = this.headNode;

    // 4. Left Arm & Shield
    this.lShoulderNode = new TransformNode('lShoulder', scene);
    this.lShoulderNode.parent = this.chestNode;
    this.lShoulderNode.position.set(-0.26, 0.35, 0);

    this.lArmNode = new TransformNode('lArm', scene);
    this.lArmNode.parent = this.lShoulderNode;
    const lUpperArm = MeshBuilder.CreateCylinder('lUpperArm', { height: 0.28, diameter: 0.12, tessellation: 8 }, scene);
    lUpperArm.position.y = -0.14;
    lUpperArm.material = matTunic;
    lUpperArm.parent = this.lArmNode;

    this.lForearmNode = new TransformNode('lForearm', scene);
    this.lForearmNode.parent = this.lArmNode;
    this.lForearmNode.position.y = -0.28;
    const lLowerArm = MeshBuilder.CreateCylinder('lLowerArm', { height: 0.26, diameter: 0.1, tessellation: 8 }, scene);
    lLowerArm.position.y = -0.13;
    lLowerArm.material = matLeather;
    lLowerArm.parent = this.lForearmNode;

    const lHand = MeshBuilder.CreateSphere('lHand', { diameter: 0.1, segments: 6 }, scene);
    lHand.position.y = -0.27;
    lHand.material = matSkin;
    lHand.parent = this.lForearmNode;

    // Warrior Shield (Kalkan) attached to Left Forearm
    this.shieldNode = new TransformNode('shieldNode', scene);
    this.shieldNode.parent = this.lForearmNode;
    this.shieldNode.position.set(-0.08, -0.12, 0.06);
    this.shieldNode.rotation.y = Math.PI / 2;

    const shieldDisc = MeshBuilder.CreateCylinder('shieldDisc', { height: 0.04, diameter: 0.52, tessellation: 14 }, scene);
    shieldDisc.material = matLeather;
    shieldDisc.parent = this.shieldNode;

    const shieldRim = MeshBuilder.CreateTorus('shieldRim', { diameter: 0.52, thickness: 0.04, tessellation: 14 }, scene);
    shieldRim.material = matBronze;
    shieldRim.parent = this.shieldNode;

    const shieldBoss = MeshBuilder.CreateSphere('shieldBoss', { diameter: 0.14, segments: 8 }, scene);
    shieldBoss.position.y = 0.02;
    shieldBoss.material = matBronze;
    shieldBoss.parent = this.shieldNode;

    // 5. Right Arm & Kam Kılıcı (Spirit Sword)
    this.rShoulderNode = new TransformNode('rShoulder', scene);
    this.rShoulderNode.parent = this.chestNode;
    this.rShoulderNode.position.set(0.26, 0.35, 0);

    this.rArmNode = new TransformNode('rArm', scene);
    this.rArmNode.parent = this.rShoulderNode;
    const rUpperArm = MeshBuilder.CreateCylinder('rUpperArm', { height: 0.28, diameter: 0.12, tessellation: 8 }, scene);
    rUpperArm.position.y = -0.14;
    rUpperArm.material = matTunic;
    rUpperArm.parent = this.rArmNode;

    this.rForearmNode = new TransformNode('rForearm', scene);
    this.rForearmNode.parent = this.rArmNode;
    this.rForearmNode.position.y = -0.28;
    const rLowerArm = MeshBuilder.CreateCylinder('rLowerArm', { height: 0.26, diameter: 0.1, tessellation: 8 }, scene);
    rLowerArm.position.y = -0.13;
    rLowerArm.material = matLeather;
    rLowerArm.parent = this.rForearmNode;

    const rHand = MeshBuilder.CreateSphere('rHand', { diameter: 0.1, segments: 6 }, scene);
    rHand.position.y = -0.27;
    rHand.material = matSkin;
    rHand.parent = this.rForearmNode;

    // Kam Kılıcı (Steppe Curved Sabre with Kut Rune Gem)
    this.swordNode = new TransformNode('swordNode', scene);
    this.swordNode.parent = this.rForearmNode;
    this.swordNode.position.set(0, -0.26, 0.06);
    this.swordNode.rotation.x = Math.PI / 2.2;

    // Sword Hilt & Pommel
    const swordHilt = MeshBuilder.CreateCylinder('swordHilt', { height: 0.2, diameter: 0.04, tessellation: 8 }, scene);
    swordHilt.position.y = -0.05;
    swordHilt.material = matLeather;
    swordHilt.parent = this.swordNode;

    const swordGuard = MeshBuilder.CreateBox('swordGuard', { width: 0.22, height: 0.03, depth: 0.06 }, scene);
    swordGuard.position.y = 0.06;
    swordGuard.material = matBronze;
    swordGuard.parent = this.swordNode;

    // Steel Blade
    const swordBlade = MeshBuilder.CreateBox('swordBlade', { width: 0.06, height: 0.95, depth: 0.018 }, scene);
    swordBlade.position.y = 0.54;
    swordBlade.material = matSteel;
    swordBlade.parent = this.swordNode;

    // Glowing Pommel Kut Gem
    const swordGem = MeshBuilder.CreatePolyhedron('swordGem', { type: 1, size: 0.045 }, scene);
    swordGem.position.y = -0.16;
    swordGem.material = matKutGlow;
    swordGem.parent = this.swordNode;

    // Sword Tip Tracker Node for Trails
    this.swordTipNode = new TransformNode('swordTip', scene);
    this.swordTipNode.position.y = 1.05;
    this.swordTipNode.parent = this.swordNode;

    // Sword Trail Mesh
    this.matSwordTrail = new StandardMaterial('mat_sword_trail', scene);
    this.matSwordTrail.diffuseColor = new Color3(0.3, 0.85, 1.0);
    this.matSwordTrail.emissiveColor = new Color3(0.2, 0.65, 0.95);
    this.matSwordTrail.alpha = 0.65;
    this.matSwordTrail.backFaceCulling = false;

    // 6. Recurve Shaman Bow (Yay) on Back
    this.bowNode = new TransformNode('bowNode', scene);
    this.bowNode.parent = this.chestNode;
    this.bowNode.position.set(-0.05, 0.18, -0.16);
    this.bowNode.rotation.z = Math.PI / 4;
    this.bowNode.rotation.y = Math.PI / 2;

    const bowCurve = MeshBuilder.CreateTorus('bowCurve', { diameter: 0.75, thickness: 0.035, tessellation: 16 }, scene);
    bowCurve.scaling.z = 0.35;
    bowCurve.material = matLeather;
    bowCurve.parent = this.bowNode;

    // 7. Legs (Left & Right)
    this.lHipNode = new TransformNode('lHip', scene);
    this.lHipNode.parent = this.pelvisNode;
    this.lHipNode.position.set(-0.13, -0.12, 0);

    this.lThighNode = new TransformNode('lThigh', scene);
    this.lThighNode.parent = this.lHipNode;
    const lThighMesh = MeshBuilder.CreateCylinder('lThighMesh', { height: 0.38, diameter: 0.16, tessellation: 8 }, scene);
    lThighMesh.position.y = -0.19;
    lThighMesh.material = matLeather;
    lThighMesh.parent = this.lThighNode;

    this.lCalfNode = new TransformNode('lCalf', scene);
    this.lCalfNode.parent = this.lThighNode;
    this.lCalfNode.position.y = -0.38;
    const lCalfMesh = MeshBuilder.CreateCylinder('lCalfMesh', { height: 0.38, diameter: 0.14, tessellation: 8 }, scene);
    lCalfMesh.position.y = -0.19;
    lCalfMesh.material = matFur;
    lCalfMesh.parent = this.lCalfNode;

    const lBoot = MeshBuilder.CreateBox('lBoot', { width: 0.14, height: 0.1, depth: 0.22 }, scene);
    lBoot.position.set(0, -0.38, 0.04);
    lBoot.material = matLeather;
    lBoot.parent = this.lCalfNode;

    this.rHipNode = new TransformNode('rHip', scene);
    this.rHipNode.parent = this.pelvisNode;
    this.rHipNode.position.set(0.13, -0.12, 0);

    this.rThighNode = new TransformNode('rThigh', scene);
    this.rThighNode.parent = this.rHipNode;
    const rThighMesh = MeshBuilder.CreateCylinder('rThighMesh', { height: 0.38, diameter: 0.16, tessellation: 8 }, scene);
    rThighMesh.position.y = -0.19;
    rThighMesh.material = matLeather;
    rThighMesh.parent = this.rThighNode;

    this.rCalfNode = new TransformNode('rCalf', scene);
    this.rCalfNode.parent = this.rThighNode;
    this.rCalfNode.position.y = -0.38;
    const rCalfMesh = MeshBuilder.CreateCylinder('rCalfMesh', { height: 0.38, diameter: 0.14, tessellation: 8 }, scene);
    rCalfMesh.position.y = -0.19;
    rCalfMesh.material = matFur;
    rCalfMesh.parent = this.rCalfNode;

    const rBoot = MeshBuilder.CreateBox('rBoot', { width: 0.14, height: 0.1, depth: 0.22 }, scene);
    rBoot.position.set(0, -0.38, 0.04);
    rBoot.material = matLeather;
    rBoot.parent = this.rCalfNode;

    // 8. Secondary Motion Cape / Mantle
    this.capeNode = new TransformNode('cape', scene);
    this.capeNode.parent = this.chestNode;
    this.capeNode.position.set(0, 0.32, -0.14);

    const capeMat = new StandardMaterial('mat_ayaz_cape', scene);
    capeMat.diffuseColor = new Color3(0.08, 0.15, 0.28);
    capeMat.backFaceCulling = false;

    const capeMesh = MeshBuilder.CreateBox('capeMesh', { width: 0.46, height: 0.85, depth: 0.02 }, scene);
    capeMesh.position.y = -0.42;
    capeMesh.material = capeMat;
    capeMesh.parent = this.capeNode;

    // Shadows
    if (shadowGen) {
      const allMeshes = this.root.getChildMeshes(false);
      for (const m of allMeshes) {
        shadowGen.addShadowCaster(m);
        m.receiveShadows = false;
      }
    }
  }

  /**
   * Procedurally animates Ayaz's skeletal hierarchy based on motion state and combat actions.
   */
  public updateAnimation(
    state: AyazAnimState,
    speedRatio: number,
    deltaTime: number,
    isHitStopped = false
  ): void {
    if (isHitStopped) return; // Micro freeze on hit-stop (60-90ms)

    // Secondary motion wave
    this.capePhase += deltaTime * (state === 'RUN' ? 12 : state === 'WALK' ? 6 : state === 'SWIM' ? 4 : 2);

    // ================= COMBAT ACTION ANIMATIONS =================

    if (state === 'ATTACK_1') {
      // Strike 1: Anticipation (wind back right) -> Horizontal slash across left -> Follow-through
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.36);

      if (progress < 0.25) {
        // Windup anticipation
        const t = progress / 0.25;
        this.chestNode.rotation.y = t * 0.45;
        this.rArmNode.rotation.x = -0.6 * t;
        this.rArmNode.rotation.z = -0.8 * t;
        this.rForearmNode.rotation.x = -0.9 * t;
        this.swordNode.rotation.x = Math.PI / 2.0 + t * 0.5;
      } else if (progress < 0.65) {
        // Active slash right to left
        const t = (progress - 0.25) / 0.4;
        this.chestNode.rotation.y = 0.45 - t * 0.95;
        this.rArmNode.rotation.x = -0.6 + t * 1.1;
        this.rArmNode.rotation.z = -0.8 + t * 1.5;
        this.rForearmNode.rotation.x = -0.9 + t * 0.6;
        this.swordNode.rotation.x = Math.PI / 2.0 - t * 0.8;
      } else {
        // Follow-through recovery
        const t = (progress - 0.65) / 0.35;
        this.chestNode.rotation.y = -0.5 * (1 - t);
        this.rArmNode.rotation.set(-0.2, 0, -0.2);
        this.rForearmNode.rotation.x = -0.4;
      }
      return;
    }

    if (state === 'ATTACK_2') {
      // Strike 2: Backswing slash from left to right
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.38);

      if (progress < 0.3) {
        const t = progress / 0.3;
        this.chestNode.rotation.y = -0.4 * t;
        this.rArmNode.rotation.set(-0.4, 0, 0.6 * t);
      } else if (progress < 0.7) {
        const t = (progress - 0.3) / 0.4;
        this.chestNode.rotation.y = -0.4 + t * 0.85;
        this.rArmNode.rotation.set(0.6 - t * 1.0, 0, 0.6 - t * 1.3);
      } else {
        const t = (progress - 0.7) / 0.3;
        this.chestNode.rotation.y = 0.45 * (1 - t);
      }
      return;
    }

    if (state === 'ATTACK_3') {
      // Strike 3: Heavy Overhead Downward Finisher
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.52);

      if (progress < 0.4) {
        // Raise arms high overhead
        const t = progress / 0.4;
        this.pelvisNode.position.y = 0.95 + t * 0.15;
        this.chestNode.rotation.x = -0.3 * t;
        this.rArmNode.rotation.set(-1.8 * t, 0, -0.3 * t);
        this.lArmNode.rotation.set(-1.6 * t, 0, 0.3 * t);
        this.swordNode.rotation.x = Math.PI * 0.9;
      } else if (progress < 0.7) {
        // Slam down into earth
        const t = (progress - 0.4) / 0.3;
        this.pelvisNode.position.y = 1.1 - t * 0.35; // Deep crouch
        this.chestNode.rotation.x = 0.45 * t;
        this.rArmNode.rotation.set(-1.8 + t * 2.4, 0, 0);
        this.lArmNode.rotation.set(-1.6 + t * 2.0, 0, 0);
        this.swordNode.rotation.x = 0.2;
      } else {
        // Rise up
        const t = (progress - 0.7) / 0.3;
        this.pelvisNode.position.y = 0.75 + t * 0.2;
        this.chestNode.rotation.x = 0.45 * (1 - t);
      }
      return;
    }

    if (state === 'CHARGE_WINDUP') {
      // Crouched tense windup, sword pulled back glowing
      this.pelvisNode.position.y = 0.82;
      this.pelvisNode.rotation.x = 0.18;
      this.chestNode.rotation.y = 0.6;
      this.rArmNode.rotation.set(-0.8, 0, -0.8);
      this.rForearmNode.rotation.x = -1.1;
      this.swordNode.rotation.x = Math.PI / 2.0;
      return;
    }

    if (state === 'CHARGE_ATTACK') {
      // 360 Spin Attack Whirlwind
      this.actionTimer += deltaTime;
      const spinAngle = (this.actionTimer / 0.65) * Math.PI * 2.0;
      this.root.rotation.y += deltaTime * 25.0; // Rapid spin

      this.pelvisNode.position.y = 0.88;
      this.rArmNode.rotation.set(0, 0, -1.35); // Arms wide out
      this.lArmNode.rotation.set(0, 0, 1.35);
      this.swordNode.rotation.x = Math.PI / 2.0;
      return;
    }

    if (state === 'DODGE_ROLL') {
      // Somersault dive roll
      this.actionTimer += deltaTime;
      this.rollAngle += deltaTime * (Math.PI * 2.0 / 0.45);

      this.pelvisNode.position.y = 0.45 + Math.sin(this.rollAngle) * 0.25;
      this.pelvisNode.rotation.x = this.rollAngle;
      this.chestNode.rotation.x = 0.5; // Tucked tight
      this.lThighNode.rotation.x = 1.2;
      this.rThighNode.rotation.x = 1.2;
      return;
    }

    if (state === 'SHIELD_BLOCK') {
      // Sturdy defensive shield stance
      this.pelvisNode.position.y = 0.88;
      this.chestNode.rotation.y = 0.3;
      this.lArmNode.rotation.set(-0.9, 0, 0.4);
      this.lForearmNode.rotation.set(-0.8, 0, 0.5);
      this.rArmNode.rotation.set(-0.3, 0, -0.3);
      this.rForearmNode.rotation.x = -0.5;
      return;
    }

    if (state === 'PARRY') {
      // Shield deflected forward with authority
      this.pelvisNode.position.y = 0.95;
      this.chestNode.rotation.y = -0.2;
      this.lArmNode.rotation.set(-1.2, 0, 0.1);
      this.lForearmNode.rotation.set(-0.3, 0, 0.2);
      return;
    }

    if (state === 'BOW_AIM' || state === 'BOW_SHOOT') {
      // Archery posture: left arm points forward, right arm draws string to cheek
      this.bowNode.parent = this.lForearmNode;
      this.bowNode.position.set(0, -0.15, 0.08);
      this.bowNode.rotation.set(0, 0, 0);

      this.chestNode.rotation.y = -0.7; // Sideways aim stance
      this.lArmNode.rotation.set(-1.45, 0, 0.45);
      this.lForearmNode.rotation.set(-0.1, 0, 0);

      this.rArmNode.rotation.set(-1.3, 0, -0.55);
      this.rForearmNode.rotation.set(-1.5, 0, 0);
      return;
    }

    // Reset bow to back when not aiming
    if (this.bowNode.parent !== this.chestNode) {
      this.bowNode.parent = this.chestNode;
      this.bowNode.position.set(-0.05, 0.18, -0.16);
      this.bowNode.rotation.z = Math.PI / 4;
      this.bowNode.rotation.y = Math.PI / 2;
    }

    if (state === 'HURT') {
      // Flinch recoil
      this.pelvisNode.position.y = 0.9;
      this.chestNode.rotation.x = -0.4;
      this.headNode.rotation.x = -0.3;
      this.lArmNode.rotation.set(0.5, 0, 0.4);
      this.rArmNode.rotation.set(0.5, 0, -0.4);
      return;
    }

    // Reset action timer & roll angle for non-action states
    this.actionTimer = 0;
    this.rollAngle = 0;

    // ================= LOCOMOTION ANIMATIONS =================

    if (state === 'SWIM') {
      this.animPhase += deltaTime * (speedRatio > 0.1 ? 6.0 : 2.5);
      const paddle = Math.sin(this.animPhase);

      this.pelvisNode.position.y = 0.35;
      this.pelvisNode.rotation.x = Math.PI / 2.3;
      this.chestNode.rotation.x = -0.25;

      this.lThighNode.rotation.x = paddle * 0.38;
      this.lCalfNode.rotation.x = 0.12;
      this.rThighNode.rotation.x = -paddle * 0.38;
      this.rCalfNode.rotation.x = 0.12;

      this.lArmNode.rotation.x = -paddle * 0.8 - 0.3;
      this.lArmNode.rotation.z = 0.55;
      this.lForearmNode.rotation.x = -0.4;

      this.rArmNode.rotation.x = paddle * 0.8 - 0.3;
      this.rArmNode.rotation.z = -0.55;
      this.rForearmNode.rotation.x = -0.4;

      this.capeNode.rotation.x = 0.2 + Math.sin(this.capePhase) * 0.06;
      this.capeNode.rotation.z = Math.cos(this.capePhase * 0.5) * 0.04;
      return;
    }

    if (state === 'IDLE') {
      this.animPhase += deltaTime * 2.2;
      const breath = Math.sin(this.animPhase);

      this.pelvisNode.position.y = 0.95 + breath * 0.015;
      this.pelvisNode.rotation.x = 0;
      this.pelvisNode.rotation.y = 0;
      this.chestNode.rotation.x = breath * 0.03;
      this.chestNode.rotation.y = 0;

      // Relaxed warrior guard stance with sword & shield
      this.lArmNode.rotation.set(0.1 + breath * 0.03, 0, 0.25);
      this.lForearmNode.rotation.set(-0.35, 0, 0.1);

      this.rArmNode.rotation.set(-0.2 + breath * 0.02, 0, -0.25);
      this.rForearmNode.rotation.set(-0.45, 0, -0.1);

      this.lThighNode.rotation.set(0, 0, 0);
      this.lCalfNode.rotation.set(0, 0, 0);
      this.rThighNode.rotation.set(0, 0, 0);
      this.rCalfNode.rotation.set(0, 0, 0);

      this.capeNode.rotation.x = 0.08 + Math.sin(this.capePhase) * 0.05;
      this.capeNode.rotation.z = Math.cos(this.capePhase * 0.5) * 0.03;
    } else {
      // Walking or Running
      const strideFreq = state === 'RUN' ? 14.5 : 8.0;
      this.animPhase += deltaTime * strideFreq;

      const legWave = Math.sin(this.animPhase);
      const legCos = Math.cos(this.animPhase);

      const amplitude = state === 'RUN' ? 0.95 : 0.55;
      const armAmp = state === 'RUN' ? 1.1 : 0.6;

      const forwardLean = state === 'RUN' ? 0.28 : 0.12;
      this.pelvisNode.rotation.x = forwardLean;
      this.pelvisNode.rotation.y = legWave * 0.12;
      this.chestNode.rotation.x = forwardLean * 0.5;
      this.chestNode.rotation.y = 0;

      this.pelvisNode.position.y = 0.95 + Math.abs(legCos) * (state === 'RUN' ? 0.08 : 0.04);

      // Left Leg
      this.lThighNode.rotation.x = legWave * amplitude;
      this.lCalfNode.rotation.x = legWave > 0 ? legWave * amplitude * 1.2 : 0.1;

      // Right Leg
      this.rThighNode.rotation.x = -legWave * amplitude;
      this.rCalfNode.rotation.x = -legWave > 0 ? -legWave * amplitude * 1.2 : 0.1;

      // Arms swing
      this.lArmNode.rotation.set(-legWave * armAmp, 0, 0.25);
      this.lForearmNode.rotation.x = -0.4 - Math.max(0, -legWave) * 0.5;

      this.rArmNode.rotation.set(legWave * armAmp, 0, -0.25);
      this.rForearmNode.rotation.x = -0.4 - Math.max(0, legWave) * 0.5;

      const capeFlow = state === 'RUN' ? 0.75 : 0.35;
      this.capeNode.rotation.x = capeFlow + Math.sin(this.capePhase) * (state === 'RUN' ? 0.18 : 0.08);
      this.capeNode.rotation.z = Math.cos(this.capePhase * 0.1);
    }
  }
}
