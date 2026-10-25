/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Ayaz 3D Prosedürel İskelet & Karakter Modeli (AyazModel)
 * (3 Silah Grubu Değişimi, Sırt Sadağı, 3D Soluk Çarkı, Ayak IK, Çömelme & Gizlilik, Havadan Vuruş, Yay-Sönüm & Sıfır Harici Dosya)
 */

import {
  TransformNode,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  ShadowGenerator,
  TrailMesh,
  Scalar
} from '@babylonjs/core';
import { WeaponType, ArrowType } from '../combat/WeaponData';
import { StaminaWheel3D } from './StaminaWheel3D';

export type AyazAnimState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'SPRINT'
  | 'CROUCH_IDLE'
  | 'CROUCH_WALK'
  | 'SWIM'
  | 'DIVE_SWIM'
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'ATTACK_3'
  | 'AXE_ATTACK_1'
  | 'AXE_ATTACK_2'
  | 'SPEAR_ATTACK_1'
  | 'SPEAR_ATTACK_2'
  | 'SPEAR_ATTACK_3'
  | 'PLUNGE_ATTACK'
  | 'SNEAK_STRIKE'
  | 'FLURRY_RUSH'
  | 'CHARGE_WINDUP'
  | 'CHARGE_ATTACK'
  | 'DODGE_ROLL'
  | 'SHIELD_BLOCK'
  | 'PARRY'
  | 'BOW_AIM'
  | 'BOW_SHOOT'
  | 'HURT'
  | 'CLIMB'
  | 'GLIDE'
  | 'SHIELD_SURF'
  | 'JUMP'
  | 'FALL'
  | 'LANDING_SHOCK';

export class AyazModel {
  public scene: Scene;
  public root: TransformNode;

  // İskelet Düğümleri
  public pelvisNode: TransformNode;
  public chestNode: TransformNode;
  public headNode: TransformNode;

  // Kollar
  public lShoulderNode: TransformNode;
  public lArmNode: TransformNode;
  public lForearmNode: TransformNode;
  public rShoulderNode: TransformNode;
  public rArmNode: TransformNode;
  public rForearmNode: TransformNode;

  // Bacaklar
  public lHipNode: TransformNode;
  public lThighNode: TransformNode;
  public lCalfNode: TransformNode;
  public rHipNode: TransformNode;
  public rThighNode: TransformNode;
  public rCalfNode: TransformNode;

  // Ekipman & Silah Düğümleri
  public capeNode: TransformNode;
  public shieldNode: TransformNode;
  public bowNode: TransformNode;
  public quiverNode: TransformNode;
  public gliderWingsNode: TransformNode; // Yel Ana Süzülme Kanatları

  // Silah Grupları (Dinamik Geçiş)
  public swordGroup: TransformNode;
  public axeGroup: TransformNode;
  public spearGroup: TransformNode;
  public activeWeaponType: WeaponType = 'KAM_SWORD';

  public swordTipNode: TransformNode;
  public swordTrail: TrailMesh | null = null;
  private matSwordTrail: StandardMaterial;

  // Sadak Okları (Dinamik 3D Görsel)
  private quiverArrowMeshes: Mesh[] = [];
  private matArrowFire: StandardMaterial;
  private matArrowNormal: StandardMaterial;
  private matArrowPiercing: StandardMaterial;

  // 3D Soluk Çarkı
  public staminaWheel: StaminaWheel3D;

  // Animasyon & Fizik Zamanlayıcıları
  private animPhase = 0;
  private capePhase = 0;
  private actionTimer = 0;

  // Pelerin / Saç Yay-Sönüm (Spring-Damper Simulation)
  private capeAngleX = 0;
  private capeAngleZ = 0;
  private capeVelX = 0;
  private capeVelZ = 0;

  // Gövde Eğimi (Lean)
  public leanForward = 0;
  public leanBank = 0;

  // Kalkan Durumu
  private isShieldSurfing = false;

  constructor(scene: Scene, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.root = new TransformNode('ayaz_root', scene);

    // Cel-shaded / Toon Materyaller
    const matTunic = new StandardMaterial('mat_ayaz_tunic', scene);
    matTunic.diffuseColor = new Color3(0.12, 0.25, 0.42); // Kutsal Türk Mavisi
    matTunic.specularColor = new Color3(0.1, 0.1, 0.1);

    const matBelt = new StandardMaterial('mat_ayaz_belt', scene);
    matBelt.diffuseColor = new Color3(0.85, 0.15, 0.15); // Kut Kırmızısı Kuşak
    matBelt.specularColor = new Color3(0.15, 0.15, 0.15);

    const matLeather = new StandardMaterial('mat_ayaz_leather', scene);
    matLeather.diffuseColor = new Color3(0.42, 0.22, 0.1); // Savaşçı Derisi
    matLeather.specularColor = new Color3(0.08, 0.08, 0.08);

    const matSkin = new StandardMaterial('mat_ayaz_skin', scene);
    matSkin.diffuseColor = new Color3(0.92, 0.72, 0.58);
    matSkin.specularColor = new Color3(0.05, 0.05, 0.05);

    const matHair = new StandardMaterial('mat_ayaz_hair', scene);
    matHair.diffuseColor = new Color3(0.15, 0.1, 0.08);

    const matFur = new StandardMaterial('mat_ayaz_fur', scene);
    matFur.diffuseColor = new Color3(0.92, 0.9, 0.85); // Bozkurt kürkü yaka

    const matKutGlow = new StandardMaterial('mat_ayaz_kut_gem', scene);
    matKutGlow.diffuseColor = new Color3(0.2, 0.75, 0.98);
    matKutGlow.emissiveColor = new Color3(0.15, 0.65, 0.95);

    const matSteel = new StandardMaterial('mat_ayaz_steel', scene);
    matSteel.diffuseColor = new Color3(0.85, 0.88, 0.92);
    matSteel.specularColor = new Color3(0.9, 0.9, 0.95);

    const matBronze = new StandardMaterial('mat_ayaz_bronze', scene);
    matBronze.diffuseColor = new Color3(0.75, 0.55, 0.25);
    matBronze.specularColor = new Color3(0.5, 0.4, 0.2);

    const matWood = new StandardMaterial('mat_ayaz_wood', scene);
    matWood.diffuseColor = new Color3(0.38, 0.24, 0.14);

    // Ok Ucu Materyalleri
    this.matArrowNormal = new StandardMaterial('mat_arrow_norm', scene);
    this.matArrowNormal.diffuseColor = new Color3(0.7, 0.7, 0.75);

    this.matArrowFire = new StandardMaterial('mat_arrow_fire', scene);
    this.matArrowFire.diffuseColor = new Color3(1.0, 0.4, 0.05);
    this.matArrowFire.emissiveColor = new Color3(0.8, 0.3, 0.0);

    this.matArrowPiercing = new StandardMaterial('mat_arrow_pierce', scene);
    this.matArrowPiercing.diffuseColor = new Color3(0.3, 0.85, 1.0);
    this.matArrowPiercing.emissiveColor = new Color3(0.2, 0.6, 0.9);

    // 1. Pelvis (Kalça)
    this.pelvisNode = new TransformNode('pelvis', scene);
    this.pelvisNode.parent = this.root;
    this.pelvisNode.position.y = 0.95;

    const pelvisMesh = MeshBuilder.CreateBox('pelvisMesh', { width: 0.38, height: 0.22, depth: 0.24 }, scene);
    pelvisMesh.material = matBelt;
    pelvisMesh.parent = this.pelvisNode;

    // 2. Göğüs & Gövde
    this.chestNode = new TransformNode('chest', scene);
    this.chestNode.parent = this.pelvisNode;
    this.chestNode.position.y = 0.22;

    const chestMesh = MeshBuilder.CreateBox('chestMesh', { width: 0.42, height: 0.4, depth: 0.26 }, scene);
    chestMesh.position.y = 0.2;
    chestMesh.material = matTunic;
    chestMesh.parent = this.chestNode;

    const furCollar = MeshBuilder.CreateTorus('furCollar', { diameter: 0.42, thickness: 0.1, tessellation: 12 }, scene);
    furCollar.scaling.z = 0.7;
    furCollar.position.y = 0.38;
    furCollar.material = matFur;
    furCollar.parent = this.chestNode;

    // 3. Baş & Saç Örgüsü
    this.headNode = new TransformNode('head', scene);
    this.headNode.parent = this.chestNode;
    this.headNode.position.y = 0.45;

    const headMesh = MeshBuilder.CreateSphere('headMesh', { diameterX: 0.26, diameterY: 0.3, diameterZ: 0.26, segments: 10 }, scene);
    headMesh.material = matSkin;
    headMesh.parent = this.headNode;

    const hair = MeshBuilder.CreateSphere('hairMesh', { diameterX: 0.28, diameterY: 0.26, diameterZ: 0.28, segments: 8 }, scene);
    hair.position.set(0, 0.08, -0.04);
    hair.material = matHair;
    hair.parent = this.headNode;

    // Arka saç örgüsü (Kam örgüsü)
    const hairBraid = MeshBuilder.CreateCylinder('hairBraid', { height: 0.4, diameterTop: 0.08, diameterBottom: 0.03, tessellation: 6 }, scene);
    hairBraid.position.set(0, -0.15, -0.14);
    hairBraid.rotation.x = -0.35;
    hairBraid.material = matHair;
    hairBraid.parent = this.headNode;

    // 4. Sol Kol ve Kalkan
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

    // Bozkurt Başlı Kalkan
    this.shieldNode = new TransformNode('shieldNode', scene);
    this.shieldNode.parent = this.lForearmNode;
    this.shieldNode.position.set(-0.06, -0.14, 0.12);
    this.shieldNode.rotation.y = Math.PI / 2;

    const shieldMesh = MeshBuilder.CreateCylinder('shieldMesh', { height: 0.06, diameter: 0.62, tessellation: 16 }, scene);
    shieldMesh.material = matBronze;
    shieldMesh.parent = this.shieldNode;

    const shieldBoss = MeshBuilder.CreateSphere('shieldBoss', { diameter: 0.18, segments: 8 }, scene);
    shieldBoss.position.y = 0.04;
    shieldBoss.material = matSteel;
    shieldBoss.parent = this.shieldNode;

    // 5. Sağ Kol ve 3 Silah Sınıfı (Kam Kılıcı, Savaş Baltası, Kargı)
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

    // ============= SILAH 1: KAM KILICI =============
    this.swordGroup = new TransformNode('swordGroup', scene);
    this.swordGroup.parent = this.rForearmNode;
    this.swordGroup.position.set(0, -0.26, 0.06);
    this.swordGroup.rotation.x = Math.PI / 2.2;

    const swordHilt = MeshBuilder.CreateCylinder('swordHilt', { height: 0.2, diameter: 0.04, tessellation: 8 }, scene);
    swordHilt.position.y = -0.05;
    swordHilt.material = matLeather;
    swordHilt.parent = this.swordGroup;

    const swordGuard = MeshBuilder.CreateBox('swordGuard', { width: 0.22, height: 0.03, depth: 0.06 }, scene);
    swordGuard.position.y = 0.06;
    swordGuard.material = matBronze;
    swordGuard.parent = this.swordGroup;

    const swordBlade = MeshBuilder.CreateBox('swordBlade', { width: 0.06, height: 0.95, depth: 0.018 }, scene);
    swordBlade.position.y = 0.54;
    swordBlade.material = matSteel;
    swordBlade.parent = this.swordGroup;

    const swordGem = MeshBuilder.CreatePolyhedron('swordGem', { type: 1, size: 0.045 }, scene);
    swordGem.position.y = -0.16;
    swordGem.material = matKutGlow;
    swordGem.parent = this.swordGroup;

    this.swordTipNode = new TransformNode('swordTip', scene);
    this.swordTipNode.position.y = 1.05;
    this.swordTipNode.parent = this.swordGroup;

    // ============= SILAH 2: SAVAŞ BALTASI (AĞIR, KALKAN KIRAR) =============
    this.axeGroup = new TransformNode('axeGroup', scene);
    this.axeGroup.parent = this.rForearmNode;
    this.axeGroup.position.set(0, -0.26, 0.06);
    this.axeGroup.rotation.x = Math.PI / 2.2;
    this.axeGroup.setEnabled(false);

    const axeHaft = MeshBuilder.CreateCylinder('axeHaft', { height: 1.05, diameter: 0.045, tessellation: 8 }, scene);
    axeHaft.position.y = 0.35;
    axeHaft.material = matWood;
    axeHaft.parent = this.axeGroup;

    const axeBladeL = MeshBuilder.CreateCylinder('axeBladeL', { height: 0.04, diameter: 0.44, tessellation: 12 }, scene);
    axeBladeL.rotation.z = Math.PI * 0.5;
    axeBladeL.position.set(0.18, 0.72, 0);
    axeBladeL.material = matSteel;
    axeBladeL.parent = this.axeGroup;

    const axeBladeR = MeshBuilder.CreateBox('axeBladeBack', { width: 0.12, height: 0.14, depth: 0.04 }, scene);
    axeBladeR.position.set(-0.1, 0.72, 0);
    axeBladeR.material = matBronze;
    axeBladeR.parent = this.axeGroup;

    // ============= SILAH 3: BOZKIR KARGISI (UZUN MENZİL, İTME) =============
    this.spearGroup = new TransformNode('spearGroup', scene);
    this.spearGroup.parent = this.rForearmNode;
    this.spearGroup.position.set(0, -0.26, 0.06);
    this.spearGroup.rotation.x = Math.PI / 2.2;
    this.spearGroup.setEnabled(false);

    const spearShaft = MeshBuilder.CreateCylinder('spearShaft', { height: 2.1, diameter: 0.038, tessellation: 8 }, scene);
    spearShaft.position.y = 0.85;
    spearShaft.material = matWood;
    spearShaft.parent = this.spearGroup;

    const spearHead = MeshBuilder.CreateCylinder('spearHead', { height: 0.38, diameterTop: 0.01, diameterBottom: 0.07, tessellation: 8 }, scene);
    spearHead.position.y = 1.95;
    spearHead.material = matSteel;
    spearHead.parent = this.spearGroup;

    const spearTassel = MeshBuilder.CreateCylinder('spearTassel', { height: 0.15, diameter: 0.09, tessellation: 8 }, scene);
    spearTassel.position.y = 1.75;
    spearTassel.material = matBelt; // Kırmızı at kılı püskül
    spearTassel.parent = this.spearGroup;

    // Kılıç İzi (Trail)
    this.matSwordTrail = new StandardMaterial('mat_sword_trail', scene);
    this.matSwordTrail.diffuseColor = new Color3(0.3, 0.85, 1.0);
    this.matSwordTrail.emissiveColor = new Color3(0.2, 0.65, 0.95);
    this.matSwordTrail.alpha = 0.65;
    this.matSwordTrail.backFaceCulling = false;

    // 6. Yay (Sırtta Asılı)
    this.bowNode = new TransformNode('bowNode', scene);
    this.bowNode.parent = this.chestNode;
    this.bowNode.position.set(-0.12, 0.18, -0.18);
    this.bowNode.rotation.z = Math.PI / 3.8;
    this.bowNode.rotation.y = Math.PI / 2;

    const bowCurve = MeshBuilder.CreateTorus('bowCurve', { diameter: 0.75, thickness: 0.035, tessellation: 16 }, scene);
    bowCurve.scaling.z = 0.35;
    bowCurve.material = matLeather;
    bowCurve.parent = this.bowNode;

    // 7. Sırtta Sadak (Quiver) ve Dinamik Oklar
    this.quiverNode = new TransformNode('quiverNode', scene);
    this.quiverNode.parent = this.chestNode;
    this.quiverNode.position.set(0.12, 0.16, -0.17);
    this.quiverNode.rotation.z = -Math.PI / 5.5;

    const quiverPouch = MeshBuilder.CreateCylinder('quiverPouch', { height: 0.52, diameterTop: 0.16, diameterBottom: 0.12, tessellation: 8 }, scene);
    quiverPouch.material = matLeather;
    quiverPouch.parent = this.quiverNode;

    // Sadağın içindeki 4 adet 3D ok gövdesi
    const arrowOffsets = [
      { x: -0.03, z: -0.02 },
      { x: 0.03, z: -0.02 },
      { x: -0.02, z: 0.03 },
      { x: 0.02, z: 0.03 }
    ];

    for (let i = 0; i < 4; i++) {
      const arr = MeshBuilder.CreateCylinder(`quiver_arrow_${i}`, { height: 0.62, diameter: 0.016, tessellation: 6 }, scene);
      arr.position.set(arrowOffsets[i].x, 0.18, arrowOffsets[i].z);
      arr.material = this.matArrowNormal;
      arr.parent = this.quiverNode;
      this.quiverArrowMeshes.push(arr);
    }

    // 8. Bacaklar
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

    // 9. Pelerin (Cape)
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

    // 10. Yel Ana Süzülme Kanatları (Spirit Glider Paraglider)
    this.gliderWingsNode = new TransformNode('gliderWings', scene);
    this.gliderWingsNode.parent = this.root;
    this.gliderWingsNode.position.set(0, 2.2, 0);
    this.gliderWingsNode.setEnabled(false);

    const gliderFrame = MeshBuilder.CreateCylinder('glider_bar', { height: 2.6, diameter: 0.06, tessellation: 6 }, scene);
    gliderFrame.rotation.z = Math.PI * 0.5;
    gliderFrame.material = matLeather;
    gliderFrame.parent = this.gliderWingsNode;

    const gliderCloth = MeshBuilder.CreatePlane('glider_cloth', { width: 2.8, height: 1.4 }, scene);
    gliderCloth.rotation.x = Math.PI * 0.5;
    gliderCloth.material = matKutGlow;
    gliderCloth.parent = this.gliderWingsNode;

    // 11. 3D Soluk (Stamina) Çarkı
    this.staminaWheel = new StaminaWheel3D(scene, this.root);

    // Gölgeler
    if (shadowGen) {
      const allMeshes = this.root.getChildMeshes(false);
      for (const m of allMeshes) {
        shadowGen.addShadowCaster(m);
        m.receiveShadows = false;
      }
    }
  }

  /**
   * Aktif Silah Sınıfını Değiştirir (Kam Kılıcı / Savaş Baltası / Kargı)
   */
  public setEquippedWeapon(weaponType: WeaponType): void {
    this.activeWeaponType = weaponType;
    this.swordGroup.setEnabled(weaponType === 'KAM_SWORD');
    this.axeGroup.setEnabled(weaponType === 'BATTLE_AXE');
    this.spearGroup.setEnabled(weaponType === 'WAR_SPEAR');

    // Uç noktasını seçili silaha bağla
    if (weaponType === 'BATTLE_AXE') {
      this.swordTipNode.parent = this.axeGroup;
      this.swordTipNode.position.set(0.18, 0.75, 0);
    } else if (weaponType === 'WAR_SPEAR') {
      this.swordTipNode.parent = this.spearGroup;
      this.swordTipNode.position.set(0, 2.05, 0);
    } else {
      this.swordTipNode.parent = this.swordGroup;
      this.swordTipNode.position.set(0, 1.05, 0);
    }
  }

  /**
   * Sırttaki Sadak Oklarını ve Tipini Günceller
   */
  public updateQuiverArrows(arrowCount: number, arrowType: ArrowType): void {
    let mat = this.matArrowNormal;
    if (arrowType === 'FIRE') mat = this.matArrowFire;
    else if (arrowType === 'PIERCING') mat = this.matArrowPiercing;

    for (let i = 0; i < this.quiverArrowMeshes.length; i++) {
      const mesh = this.quiverArrowMeshes[i];
      const isVisible = i < arrowCount;
      mesh.setEnabled(isVisible);
      if (isVisible) {
        mesh.material = mat;
      }
    }
  }

  /**
   * Ayak IK (Zemin Yüksekliği Eşleme)
   */
  public applyFootIK(leftGroundY: number, rightGroundY: number, rootY: number, deltaTime: number): void {
    const leftDiff = Scalar.Clamp(leftGroundY - rootY, -0.25, 0.25);
    const rightDiff = Scalar.Clamp(rightGroundY - rootY, -0.25, 0.25);

    this.lHipNode.position.y = Scalar.Lerp(this.lHipNode.position.y, -0.12 + leftDiff * 0.45, Math.min(1.0, deltaTime * 12.0));
    this.rHipNode.position.y = Scalar.Lerp(this.rHipNode.position.y, -0.12 + rightDiff * 0.45, Math.min(1.0, deltaTime * 12.0));
  }

  /**
   * Ayaz'ın İskelet Düğümlerini Prosedürel Olarak Canlandırır
   */
  public updateAnimation(
    state: AyazAnimState,
    speedRatio: number,
    deltaTime: number,
    isHitStopped = false,
    stamina = 100,
    maxStamina = 100
  ): void {
    // 3D Soluk Çarkını Güncelle
    this.staminaWheel.update(stamina, maxStamina, deltaTime);

    if (isHitStopped) return;

    // Pelerin & Saç Yay-Sönüm Simülasyonu (Spring-Damper Physics)
    this.capePhase += deltaTime * (state === 'SPRINT' ? 16 : state === 'RUN' ? 12 : state === 'WALK' ? 6 : 3);
    const targetCapeX = (state === 'SPRINT' ? -0.85 : state === 'RUN' ? -0.55 : state === 'WALK' ? -0.25 : -0.1) + Math.sin(this.capePhase) * 0.08;
    const springForceX = (targetCapeX - this.capeAngleX) * 18.0;
    this.capeVelX = (this.capeVelX + springForceX * deltaTime) * 0.84;
    this.capeAngleX += this.capeVelX * deltaTime;
    this.capeNode.rotation.x = this.capeAngleX;

    // Gövde Eğimi (Lean into turns & forward sprint)
    this.chestNode.rotation.z = this.leanBank;
    this.root.rotation.z = this.leanBank * 0.5;

    // Kalkan Kızağı Pozisyon Yönetimi
    if (state === 'SHIELD_SURF') {
      if (!this.isShieldSurfing) {
        this.isShieldSurfing = true;
        this.shieldNode.parent = this.root;
        this.shieldNode.position.set(0, 0.05, 0.1);
        this.shieldNode.rotation.set(Math.PI * 0.5, 0, 0);
      }
    } else {
      if (this.isShieldSurfing) {
        this.isShieldSurfing = false;
        this.shieldNode.parent = this.lForearmNode;
        this.shieldNode.position.set(-0.06, -0.14, 0.12);
        this.shieldNode.rotation.set(0, Math.PI * 0.5, 0);
      }
    }

    // Yel Ana Süzülme Kanadı Görünürlüğü
    this.gliderWingsNode.setEnabled(state === 'GLIDE');

    // ================= HAVADAN AŞAĞI VURUŞ (PLUNGE ATTACK) =================
    if (state === 'PLUNGE_ATTACK') {
      this.pelvisNode.position.y = 0.85;
      this.chestNode.rotation.set(1.4, 0, 0); // Dik dalış
      this.rArmNode.rotation.set(-2.4, 0, 0); // Kılıç/balta önde aşağı bakar
      this.lArmNode.rotation.set(-2.0, 0, 0);
      this.lThighNode.rotation.set(-0.6, 0, -0.2);
      this.rThighNode.rotation.set(-0.6, 0, 0.2);
      return;
    }

    // ================= SESSIZ VURUŞ (SNEAK STRIKE - BACKSTAB) =================
    if (state === 'SNEAK_STRIKE') {
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.65);
      if (progress < 0.4) {
        this.chestNode.rotation.set(-0.2, 0.6, 0);
        this.rArmNode.rotation.set(-1.6, 0, -0.6);
      } else {
        this.chestNode.rotation.set(0.3, -0.4, 0);
        this.rArmNode.rotation.set(0.8, 0, 0.4);
      }
      return;
    }

    // ================= İNİŞ ŞOKU (LANDING SHOCK) =================
    if (state === 'LANDING_SHOCK') {
      this.pelvisNode.position.y = 0.55; // Çökme (Squash)
      this.chestNode.rotation.set(0.4, 0, 0);
      this.lThighNode.rotation.set(1.1, 0, -0.3);
      this.rThighNode.rotation.set(1.1, 0, 0.3);
      this.lCalfNode.rotation.x = -1.2;
      this.rCalfNode.rotation.x = -1.2;
      return;
    }

    // ================= ÇÖMELME VE GİZLİLİK (CROUCH) =================
    if (state === 'CROUCH_IDLE') {
      this.pelvisNode.position.y = 0.62;
      this.chestNode.rotation.set(0.35, 0, 0);
      this.lThighNode.rotation.set(0.85, 0, -0.2);
      this.rThighNode.rotation.set(0.85, 0, 0.2);
      this.lCalfNode.rotation.x = -0.95;
      this.rCalfNode.rotation.x = -0.95;
      this.lArmNode.rotation.set(0.4, 0, 0.2);
      this.rArmNode.rotation.set(0.4, 0, -0.2);
      return;
    }

    if (state === 'CROUCH_WALK') {
      this.animPhase += deltaTime * 5.5 * speedRatio;
      const legSwing = Math.sin(this.animPhase) * 0.45;
      this.pelvisNode.position.y = 0.62 + Math.abs(Math.sin(this.animPhase * 2.0)) * 0.04;
      this.chestNode.rotation.set(0.42, 0, 0);
      this.lThighNode.rotation.set(0.85 + legSwing, 0, -0.2);
      this.rThighNode.rotation.set(0.85 - legSwing, 0, 0.2);
      this.lCalfNode.rotation.x = -0.95 + Math.max(0, -legSwing);
      this.rCalfNode.rotation.x = -0.95 + Math.max(0, legSwing);
      return;
    }

    // ================= SAVAŞ BALTASI KOMBO ANİMASYONLARI =================
    if (state === 'AXE_ATTACK_1') {
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.55);
      if (progress < 0.4) {
        // Geriye açılıp kaldırma (Anticipation)
        const t = progress / 0.4;
        this.chestNode.rotation.set(-0.2 * t, 0.65 * t, 0);
        this.rArmNode.rotation.set(-1.8 * t, 0, -0.6 * t);
      } else {
        // Güçlü yatay savuruş (Slash & Cleave)
        const t = (progress - 0.4) / 0.6;
        this.chestNode.rotation.set(0.2 * (1 - t), 0.65 - t * 1.4, 0);
        this.rArmNode.rotation.set(-1.8 + t * 2.4, 0, 0.4);
      }
      return;
    }

    if (state === 'AXE_ATTACK_2') {
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.68);
      if (progress < 0.45) {
        // İki elle baş üstüne kaldırma
        const t = progress / 0.45;
        this.pelvisNode.position.y = 0.95 + t * 0.12;
        this.chestNode.rotation.set(-0.4 * t, 0, 0);
        this.rArmNode.rotation.set(-2.2 * t, 0, 0);
        this.lArmNode.rotation.set(-2.0 * t, 0, 0.3);
      } else {
        // Yeri yaran darbe (Earth slam)
        const t = (progress - 0.45) / 0.55;
        this.pelvisNode.position.y = 1.07 - t * 0.38;
        this.chestNode.rotation.set(0.65 * t, 0, 0);
        this.rArmNode.rotation.set(-2.2 + t * 3.0, 0, 0);
        this.lArmNode.rotation.set(-2.0 + t * 2.8, 0, 0);
      }
      return;
    }

    // ================= KARGI KOMBO ANİMASYONLARI =================
    if (state === 'SPEAR_ATTACK_1' || state === 'SPEAR_ATTACK_2') {
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.32);
      if (progress < 0.35) {
        // Geriye çekilme
        const t = progress / 0.35;
        this.rArmNode.rotation.set(-0.6 * t, 0, 0);
        this.chestNode.rotation.y = 0.3 * t;
      } else {
        // Hızlı ileri saplama (Direct thrust)
        const t = (progress - 0.35) / 0.65;
        this.rArmNode.rotation.set(-0.6 + t * 1.6, 0, 0);
        this.chestNode.rotation.y = 0.3 - t * 0.5;
      }
      return;
    }

    if (state === 'SPEAR_ATTACK_3') {
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.44);
      // Geniş süpürme (Sweeping sweep)
      const t = progress;
      this.chestNode.rotation.y = -0.6 + t * 1.3;
      this.rArmNode.rotation.set(-0.4, 0, -0.6 + t * 1.2);
      return;
    }

    // ================= KAM KILIÇ KOMBO ANİMASYONLARI =================
    if (state === 'ATTACK_1') {
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.36);
      if (progress < 0.25) {
        const t = progress / 0.25;
        this.chestNode.rotation.y = t * 0.45;
        this.rArmNode.rotation.set(-0.6 * t, 0, -0.8 * t);
      } else if (progress < 0.65) {
        const t = (progress - 0.25) / 0.4;
        this.chestNode.rotation.y = 0.45 - t * 0.95;
        this.rArmNode.rotation.set(-0.6 + t * 1.1, 0, -0.8 + t * 1.5);
      } else {
        const t = (progress - 0.65) / 0.35;
        this.chestNode.rotation.y = -0.5 * (1 - t);
      }
      return;
    }

    if (state === 'ATTACK_2') {
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
      this.actionTimer += deltaTime;
      const progress = Math.min(1.0, this.actionTimer / 0.52);
      if (progress < 0.4) {
        const t = progress / 0.4;
        this.pelvisNode.position.y = 0.95 + t * 0.15;
        this.chestNode.rotation.x = -0.3 * t;
        this.rArmNode.rotation.set(-1.8 * t, 0, -0.3 * t);
      } else if (progress < 0.7) {
        const t = (progress - 0.4) / 0.3;
        this.pelvisNode.position.y = 1.1 - t * 0.35;
        this.chestNode.rotation.x = 0.45 * t;
        this.rArmNode.rotation.set(-1.8 + t * 2.4, 0, 0);
      } else {
        const t = (progress - 0.7) / 0.3;
        this.pelvisNode.position.y = 0.75 + t * 0.2;
        this.chestNode.rotation.x = 0.45 * (1 - t);
      }
      return;
    }

    // ================= FLURRY RUSH (KUT SALDIRI YAĞMURU) =================
    if (state === 'FLURRY_RUSH') {
      this.actionTimer += deltaTime;
      const strikeCycle = (this.actionTimer * 14.0) % (Math.PI * 2);
      this.chestNode.rotation.y = Math.sin(strikeCycle) * 0.65;
      this.rArmNode.rotation.set(Math.cos(strikeCycle) * 1.2, 0, Math.sin(strikeCycle) * 0.8);
      this.lArmNode.rotation.set(-0.5, 0, 0.5);
      this.pelvisNode.position.y = 0.85 + Math.abs(Math.sin(strikeCycle * 2.0)) * 0.1;
      return;
    }

    // ================= TIRMANMA (CLIMBING) =================
    if (state === 'CLIMB') {
      this.animPhase += deltaTime * 5.0;
      const climbCycle = Math.sin(this.animPhase);
      this.chestNode.rotation.set(0.15, 0, 0);
      this.pelvisNode.position.y = 0.95;
      this.lArmNode.rotation.set(-1.6 + climbCycle * 0.35, 0, 0.2);
      this.rArmNode.rotation.set(-1.6 - climbCycle * 0.35, 0, -0.2);
      this.lThighNode.rotation.set(0.6 - climbCycle * 0.25, 0, -0.2);
      this.rThighNode.rotation.set(0.6 + climbCycle * 0.25, 0, 0.2);
      return;
    }

    // ================= SÜZÜLME (GLIDING) =================
    if (state === 'GLIDE') {
      this.gliderWingsNode.rotation.y = Math.sin(this.capePhase * 0.8) * 0.05;
      this.lArmNode.rotation.set(-1.8, 0, 0.35);
      this.rArmNode.rotation.set(-1.8, 0, -0.35);
      this.lThighNode.rotation.set(-0.25 + Math.sin(this.capePhase) * 0.08, 0, -0.15);
      this.rThighNode.rotation.set(-0.25 - Math.sin(this.capePhase) * 0.08, 0, 0.15);
      this.chestNode.rotation.set(0.2, 0, 0);
      this.pelvisNode.position.y = 0.95;
      return;
    }

    // ================= KALKAN KIZAĞI =================
    if (state === 'SHIELD_SURF') {
      this.chestNode.rotation.set(0.2, -0.85, 0);
      this.pelvisNode.position.y = 0.72;
      this.lArmNode.rotation.set(-0.4, 0, 0.8);
      this.rArmNode.rotation.set(-0.4, 0, -0.8);
      this.lThighNode.rotation.set(0.7, 0, -0.3);
      this.rThighNode.rotation.set(0.8, 0, 0.2);
      return;
    }

    // ================= YÜZME & DALIŞ =================
    if (state === 'SWIM' || state === 'DIVE_SWIM') {
      this.animPhase += deltaTime * 4.5 * Math.max(0.4, speedRatio);
      const stroke = Math.sin(this.animPhase);
      this.chestNode.rotation.set(state === 'DIVE_SWIM' ? 1.45 : 1.15, 0, 0);
      this.pelvisNode.position.y = state === 'DIVE_SWIM' ? 0.25 : 0.35;
      this.lArmNode.rotation.set(stroke * 0.8, 0, 0.6);
      this.rArmNode.rotation.set(-stroke * 0.8, 0, -0.6);
      this.lThighNode.rotation.set(-stroke * 0.4, 0, -0.2);
      this.rThighNode.rotation.set(stroke * 0.4, 0, 0.2);
      return;
    }

    // ================= HAVADA ZIPLAMA VE DÜŞÜŞ =================
    if (state === 'JUMP') {
      this.pelvisNode.position.y = 1.05;
      this.lThighNode.rotation.set(0.6, 0, -0.2);
      this.rThighNode.rotation.set(0.6, 0, 0.2);
      this.lArmNode.rotation.set(-0.8, 0, 0.4);
      this.rArmNode.rotation.set(-0.8, 0, -0.4);
      return;
    }

    if (state === 'FALL') {
      this.pelvisNode.position.y = 0.95;
      this.lThighNode.rotation.set(0.3, 0, -0.15);
      this.rThighNode.rotation.set(0.3, 0, 0.15);
      this.lArmNode.rotation.set(-1.2, 0, 0.6);
      this.rArmNode.rotation.set(-1.2, 0, -0.6);
      return;
    }

    // ================= YÜRÜME, KOŞMA, SPRINT =================
    if (state === 'WALK' || state === 'RUN' || state === 'SPRINT') {
      const isSprint = state === 'SPRINT';
      const isRun = state === 'RUN' || isSprint;
      const freq = isSprint ? 17.0 : isRun ? 13.5 : 8.5;
      this.animPhase += deltaTime * freq * speedRatio;

      const legSwing = Math.sin(this.animPhase) * (isSprint ? 1.05 : isRun ? 0.85 : 0.45);
      const armSwing = -legSwing * (isSprint ? 0.95 : 0.75);

      this.lThighNode.rotation.x = legSwing;
      this.rThighNode.rotation.x = -legSwing;
      this.lCalfNode.rotation.x = Math.max(0, -legSwing * 1.25);
      this.rCalfNode.rotation.x = Math.max(0, legSwing * 1.25);

      this.lArmNode.rotation.x = armSwing;
      this.rArmNode.rotation.x = -armSwing;

      this.chestNode.rotation.x = (isSprint ? 0.28 : isRun ? 0.18 : 0.06) + this.leanForward;
      this.pelvisNode.position.y = 0.95 + Math.abs(Math.sin(this.animPhase * 2.0)) * (isSprint ? 0.11 : isRun ? 0.08 : 0.03);
      return;
    }

    // ================= IDLE (DURGUN BEKLEME) =================
    this.animPhase += deltaTime * 1.8;
    const breathe = Math.sin(this.animPhase) * 0.025;
    this.chestNode.rotation.set(breathe, 0, 0);
    this.pelvisNode.position.y = 0.95 + breathe * 0.4;
    this.lArmNode.rotation.set(0.1, 0, 0.08);
    this.rArmNode.rotation.set(0.1, 0, -0.08);
    this.lThighNode.rotation.set(0, 0, -0.05);
    this.rThighNode.rotation.set(0, 0, 0.05);
    this.lCalfNode.rotation.x = 0;
    this.rCalfNode.rotation.x = 0;
  }

  public resetActionTimer(): void {
    this.actionTimer = 0;
  }
}
