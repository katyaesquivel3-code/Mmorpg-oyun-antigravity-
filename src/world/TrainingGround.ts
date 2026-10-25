/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Birleşik Antrenman Sahası (TrainingGround)
 * (Kuklalar, 14m Tırmanma Duvarı, Su Dalış Havuzu, Süzülme Kulesi & Termal Köz Çukuru, Gizlilik Alanı & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  ShadowGenerator,
  ParticleSystem,
  Color4
} from '@babylonjs/core';
import { WorldManager } from './WorldManager';
import { WorldNoise } from './WorldNoise';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EnemyEntity } from '../combat/EnemyEntity';

export class TrainingGround {
  public scene: Scene;
  public root: TransformNode;
  public origin: Vector3;

  // Önemli Noktalar
  public thermalPitPos: Vector3;
  public poolCenter: Vector3;
  public poolRadius = 5.0;

  // Yapı Elemanları
  public climbingWallMesh: Mesh;
  public towerPlatformMesh: Mesh;
  public poolMesh: Mesh;

  // Gizlilik ve Sessiz Vuruş Test Kuklası/Düşmanı
  public stealthEnemy: EnemyEntity | null = null;

  // Termal Köz Parçacık Sistemi
  private thermalParticles: ParticleSystem | null = null;

  constructor(scene: Scene, world: WorldManager, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    const originX = -32.0;
    const originZ = 4.0;
    const originY = world.getHeightAt(originX, originZ);

    this.origin = new Vector3(originX, originY, originZ);
    this.root = new TransformNode('training_ground_root', scene);
    this.root.position.copyFrom(this.origin);

    this.thermalPitPos = new Vector3(originX + 8.0, originY, originZ + 12.0);
    this.poolCenter = new Vector3(originX - 12.0, originY, originZ + 10.0);

    // ================= MATERYALLER =================
    const matWood = new StandardMaterial('mat_tg_wood', scene);
    matWood.diffuseColor = new Color3(0.38, 0.24, 0.14);
    matWood.freeze();

    const matStone = new StandardMaterial('mat_tg_stone', scene);
    matStone.diffuseColor = new Color3(0.45, 0.48, 0.52);
    matStone.specularColor = new Color3(0.1, 0.1, 0.1);
    matStone.freeze();

    const matEmbers = new StandardMaterial('mat_tg_embers', scene);
    matEmbers.diffuseColor = new Color3(1.0, 0.35, 0.05);
    matEmbers.emissiveColor = new Color3(0.9, 0.25, 0.0);

    const matWaterFake = new StandardMaterial('mat_tg_water', scene);
    matWaterFake.diffuseColor = new Color3(0.08, 0.55, 0.65);
    matWaterFake.alpha = 0.75;

    const matGrassZone = new StandardMaterial('mat_tg_grass', scene);
    matGrassZone.diffuseColor = new Color3(0.18, 0.42, 0.15);
    matGrassZone.freeze();

    // ================= 1. 14M TIRMANMA DUVARI (CLIMBING WALL) =================
    // Dik yüzey: eğim 90°, oyuncu doğrudan tırmanabilir
    const wallRoot = new TransformNode('tg_wall_root', scene);
    wallRoot.parent = this.root;
    wallRoot.position.set(0, 0, -8.0);

    this.climbingWallMesh = MeshBuilder.CreateBox('tg_climbing_wall', {
      width: 7.5,
      height: 14.0,
      depth: 2.2
    }, scene);
    this.climbingWallMesh.position.y = 7.0;
    this.climbingWallMesh.material = matWood;
    this.climbingWallMesh.parent = wallRoot;
    if (shadowGen) shadowGen.addShadowCaster(this.climbingWallMesh);

    // Tutamaklar (Climbing Handholds)
    for (let y = 1.2; y < 13.5; y += 1.6) {
      for (let x = -2.6; x <= 2.6; x += 1.3) {
        const hold = MeshBuilder.CreateBox(`hold_${y}_${x}`, { width: 0.35, height: 0.14, depth: 0.22 }, scene);
        hold.position.set(x + (Math.sin(y) * 0.2), y, 1.15);
        hold.material = matStone;
        hold.parent = wallRoot;
      }
    }

    // Duvar Tepesi Platformu (Mantle / Zirve Platformu)
    const wallTopPlatform = MeshBuilder.CreateBox('tg_wall_platform', { width: 8.5, height: 0.6, depth: 4.5 }, scene);
    wallTopPlatform.position.set(0, 14.1, -1.0);
    wallTopPlatform.material = matWood;
    wallTopPlatform.parent = wallRoot;

    // ================= 2. 16M SÜZÜLME KULESİ (GLIDING TOWER) =================
    const towerRoot = new TransformNode('tg_tower_root', scene);
    towerRoot.parent = this.root;
    towerRoot.position.set(10.0, 0, 10.0);

    // 4 Ayaklı Ahşap İskelet
    const legOffsets = [
      { x: -2.2, z: -2.2 },
      { x: 2.2, z: -2.2 },
      { x: -2.2, z: 2.2 },
      { x: 2.2, z: 2.2 }
    ];

    legOffsets.forEach((off, i) => {
      const leg = MeshBuilder.CreateCylinder(`tg_tower_leg_${i}`, { height: 16.5, diameter: 0.45, tessellation: 6 }, scene);
      leg.position.set(off.x, 8.25, off.z);
      leg.material = matWood;
      leg.parent = towerRoot;
      if (shadowGen) shadowGen.addShadowCaster(leg);
    });

    // Zirve Atlayış Platformu (Ramp & Parapet)
    this.towerPlatformMesh = MeshBuilder.CreateBox('tg_tower_deck', { width: 5.6, height: 0.5, depth: 5.6 }, scene);
    this.towerPlatformMesh.position.set(0, 16.5, 0);
    this.towerPlatformMesh.material = matWood;
    this.towerPlatformMesh.parent = towerRoot;

    const launchRamp = MeshBuilder.CreateBox('tg_launch_ramp', { width: 2.8, height: 0.25, depth: 3.2 }, scene);
    launchRamp.position.set(0, 16.4, -3.6);
    launchRamp.rotation.x = 0.15;
    launchRamp.material = matWood;
    launchRamp.parent = towerRoot;

    // ================= 3. TERMAL KÖZ OCAĞI (UPGRADE THERMAL UPDRAFT) =================
    const pitRoot = new TransformNode('tg_pit_root', scene);
    pitRoot.parent = this.root;
    pitRoot.position.set(8.0, 0, 12.0);

    const pitRim = MeshBuilder.CreateTorus('tg_pit_rim', { diameter: 4.8, thickness: 0.5, tessellation: 16 }, scene);
    pitRim.material = matStone;
    pitRim.parent = pitRoot;

    const pitCoals = MeshBuilder.CreateCylinder('tg_pit_coals', { height: 0.2, diameter: 4.2, tessellation: 12 }, scene);
    pitCoals.material = matEmbers;
    pitCoals.parent = pitRoot;

    // Termal Yükselen Köz Parçacıkları
    const ps = new ParticleSystem('thermal_updraft_embers', 120, scene);
    ps.emitter = pitCoals;
    ps.minEmitBox = new Vector3(-1.8, 0.2, -1.8);
    ps.maxEmitBox = new Vector3(1.8, 0.5, 1.8);
    ps.color1 = new Color4(1.0, 0.65, 0.1, 0.85);
    ps.color2 = new Color4(0.95, 0.25, 0.05, 0.7);
    ps.colorDead = new Color4(0.2, 0.05, 0.0, 0.0);
    ps.minSize = 0.08;
    ps.maxSize = 0.22;
    ps.minLifeTime = 1.4;
    ps.maxLifeTime = 2.8;
    ps.emitRate = 35;
    ps.gravity = new Vector3(0, 4.5, 0); // Yukarı doğru güçlü termal akım
    ps.minEmitPower = 2.5;
    ps.maxEmitPower = 5.5;
    ps.start();
    this.thermalParticles = ps;

    // ================= 4. SU HAVUZU VE DALIŞ GÖLETİ (WATER POOL) =================
    const poolRoot = new TransformNode('tg_pool_root', scene);
    poolRoot.parent = this.root;
    poolRoot.position.set(-12.0, 0, 10.0);

    const poolRim = MeshBuilder.CreateBox('tg_pool_rim', { width: 9.6, height: 0.4, depth: 9.6 }, scene);
    poolRim.position.y = 0.15;
    poolRim.material = matStone;
    poolRim.parent = poolRoot;

    this.poolMesh = MeshBuilder.CreateBox('tg_pool_water', { width: 9.0, height: 3.5, depth: 9.0 }, scene);
    this.poolMesh.position.y = -1.6;
    this.poolMesh.material = matWaterFake;
    this.poolMesh.parent = poolRoot;

    // ================= 5. GİZLİLİK VE SESSİZ VURUŞ BÖLGESİ (STEALTH GRASS PATCH) =================
    const stealthRoot = new TransformNode('tg_stealth_root', scene);
    stealthRoot.parent = this.root;
    stealthRoot.position.set(-14.0, 0, -6.0);

    const grassBed = MeshBuilder.CreateCylinder('tg_grass_bed', { height: 0.1, diameter: 7.5, tessellation: 12 }, scene);
    grassBed.material = matGrassZone;
    grassBed.parent = stealthRoot;

    // Yoğun Uzun Ot Öbekleri
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const r = 1.0 + (i % 3) * 0.9;
      const blade = MeshBuilder.CreateBox(`tg_blade_${i}`, { width: 0.12, height: 1.6, depth: 0.12 }, scene);
      blade.position.set(Math.cos(angle) * r, 0.8, Math.sin(angle) * r);
      blade.rotation.z = (Math.random() - 0.5) * 0.2;
      blade.material = matGrassZone;
      blade.parent = stealthRoot;
    }

    // Gizlilik Alanında Uyuyan Yek Savaşçısı (Sessiz Vuruş Testi için)
    this.stealthEnemy = new EnemyEntity(
      'tg_stealth_guard',
      'YEK',
      originX - 12.5,
      originZ - 6.0,
      scene,
      world,
      shadowGen,
      null,
      true // Uyuyor!
    );

    // ================= 6. CEPHANELİK VE OK İKMAL TEZGAHI (AMMO RACK) =================
    const rackRoot = new TransformNode('tg_rack_root', scene);
    rackRoot.parent = this.root;
    rackRoot.position.set(4.0, 0, -2.0);

    const rackTable = MeshBuilder.CreateBox('tg_rack_table', { width: 2.2, height: 0.85, depth: 1.2 }, scene);
    rackTable.position.y = 0.42;
    rackTable.material = matWood;
    rackTable.parent = rackRoot;

    const quiverDisplay = MeshBuilder.CreateCylinder('tg_rack_quiver', { height: 0.6, diameter: 0.24, tessellation: 8 }, scene);
    quiverDisplay.position.set(0.4, 1.0, 0);
    quiverDisplay.material = matStone;
    quiverDisplay.parent = rackRoot;
  }

  /**
   * Gizlilik Ot Öbeğinin İçinde Mi? (Sessizce gizlenme)
   */
  public isInStealthPatch(playerPos: Vector3): boolean {
    const patchX = this.origin.x - 14.0;
    const patchZ = this.origin.z - 6.0;
    const dx = playerPos.x - patchX;
    const dz = playerPos.z - patchZ;
    return (dx * dx + dz * dz) < 18.0;
  }

  /**
   * Cephaneliğin Yanında Mı? (Ok ikmali)
   */
  public isNearAmmoRack(playerPos: Vector3): boolean {
    const rackX = this.origin.x + 4.0;
    const rackZ = this.origin.z - 2.0;
    const dx = playerPos.x - rackX;
    const dz = playerPos.z - rackZ;
    return (dx * dx + dz * dz) < 6.0;
  }

  /**
   * Termal Köz Ocağının Üzerinde Mi? (Süzülürken termal yükselme sağlar)
   */
  public isOverThermalPit(playerPos: Vector3): boolean {
    const dx = playerPos.x - this.thermalPitPos.x;
    const dz = playerPos.z - this.thermalPitPos.z;
    return (dx * dx + dz * dz) < 32.0;
  }

  /**
   * Dalış Havuzunun İçinde Mi?
   */
  public isInTrainingPool(playerPos: Vector3): boolean {
    const dx = playerPos.x - this.poolCenter.x;
    const dz = playerPos.z - this.poolCenter.z;
    return (dx * dx + dz * dz) < (this.poolRadius * this.poolRadius) && playerPos.y <= this.origin.y + 0.3;
  }

  public dispose(): void {
    if (this.stealthEnemy) this.stealthEnemy.dispose();
    if (this.thermalParticles) this.thermalParticles.dispose();
    this.root.dispose();
  }
}
