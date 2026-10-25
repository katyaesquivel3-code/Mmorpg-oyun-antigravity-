/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Harap Balıkçı Köyü, Batık İskeleler & Su Tahliye Sistemi (HarapKoy)
 * (Harap İskeleler, Batık Kayıklar, Yıpranmış Saz Evler, Yeraltı Su Mağarası Girişi,
 *  Su Tahliye Kapağı Bulmacası & Sıfır GC)
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
  Scalar
} from '@babylonjs/core';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export class HarapKoy {
  public scene: Scene;
  public root: TransformNode;

  // Harap Köy Yapıları
  public piers: Mesh[] = [];
  public sunkenBoats: Mesh[] = [];
  public ruinedHuts: Mesh[] = [];

  // Su Tahliye Kapağı (Sluice Gate Puzzle)
  public sluiceGateMesh: Mesh;
  public sluiceCrankMesh: Mesh;
  public isSluiceOpen = false;
  private sluiceGateY = 0.5;
  private targetSluiceY = 0.5;

  // Yeraltı Su Mağarası Girişi
  public caveEntranceMesh: Mesh;

  // Materyaller
  private matWeatheredWood: StandardMaterial;
  private matRuinedThatch: StandardMaterial;
  private matBronzeCrank: StandardMaterial;
  private matWaterCave: StandardMaterial;

  constructor(scene: Scene, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.root = new TransformNode('harap_koy_root', scene);
    this.root.position.set(-35, 0, -10); // Kıyı harap köy konumu

    // ================= MATERYALLER =================
    this.matWeatheredWood = new StandardMaterial('mat_weathered_wood', scene);
    this.matWeatheredWood.diffuseColor = new Color3(0.28, 0.22, 0.16); // Yıpranmış nemli ahşap
    this.matWeatheredWood.specularColor = new Color3(0.05, 0.05, 0.05);
    this.matWeatheredWood.freeze();

    this.matRuinedThatch = new StandardMaterial('mat_ruined_thatch', scene);
    this.matRuinedThatch.diffuseColor = new Color3(0.35, 0.32, 0.22); // Çürümüş sazlık
    this.matRuinedThatch.freeze();

    this.matBronzeCrank = new StandardMaterial('mat_bronze_crank', scene);
    this.matBronzeCrank.diffuseColor = new Color3(0.65, 0.45, 0.2);
    this.matBronzeCrank.freeze();

    this.matWaterCave = new StandardMaterial('mat_water_cave', scene);
    this.matWaterCave.diffuseColor = new Color3(0.12, 0.18, 0.22);
    this.matWaterCave.freeze();

    // ================= 1. HARAP İSKELELER & BATIK KAYIKLAR =================
    this.buildRuinedPiers(scene, shadowGen);
    this.buildSunkenBoats(scene, shadowGen);

    // ================= 2. YIPRANMIŞ SAZ KULÜBELER =================
    this.buildRuinedHuts(scene, shadowGen);

    // ================= 3. SU TAHLİYE KAPAĞI VE VANA KOLU =================
    this.sluiceGateMesh = MeshBuilder.CreateBox('sluice_gate', { width: 4.2, height: 3.5, depth: 0.4 }, scene);
    this.sluiceGateMesh.position.set(-15, 0.5, 12);
    this.sluiceGateMesh.material = this.matWeatheredWood;
    this.sluiceGateMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.sluiceGateMesh);

    this.sluiceCrankMesh = MeshBuilder.CreateTorus('sluice_crank', { diameter: 1.2, thickness: 0.2, tessellation: 12 }, scene);
    this.sluiceCrankMesh.position.set(-12, 1.2, 12);
    this.sluiceCrankMesh.rotation.x = Math.PI * 0.5;
    this.sluiceCrankMesh.material = this.matBronzeCrank;
    this.sluiceCrankMesh.parent = this.root;

    // ================= 4. YERALTI SU MAĞARASI GİRİŞİ =================
    this.caveEntranceMesh = MeshBuilder.CreateTorus('water_cave_portal', { diameter: 7.5, thickness: 1.4, tessellation: 10 }, scene);
    this.caveEntranceMesh.position.set(-20, -2.5, 20);
    this.caveEntranceMesh.rotation.x = Math.PI * 0.5;
    this.caveEntranceMesh.material = this.matWaterCave;
    this.caveEntranceMesh.parent = this.root;
  }

  private buildRuinedPiers(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const pierConfigs = [
      { x: -5, z: 0, rot: 0.1 },
      { x: -12, z: -8, rot: -0.2 },
      { x: -8, z: 15, rot: 0.35 }
    ];

    pierConfigs.forEach((cfg, idx) => {
      const pier = MeshBuilder.CreateBox(`pier_${idx}`, { width: 2.2, height: 0.4, depth: 10.0 }, scene);
      pier.position.set(cfg.x, 0.3, cfg.z);
      pier.rotation.y = cfg.rot;
      pier.material = this.matWeatheredWood;
      pier.parent = this.root;
      this.piers.push(pier);
      if (shadowGen) shadowGen.addShadowCaster(pier);

      // İskele Kazıkları
      for (let p = -4; p <= 4; p += 2.6) {
        const postL = MeshBuilder.CreateCylinder(`pier_post_${idx}_${p}_l`, { diameter: 0.25, height: 2.5 }, scene);
        postL.position.set(cfg.x - 1.0, -0.6, cfg.z + p);
        postL.material = this.matWeatheredWood;
        postL.parent = this.root;

        const postR = MeshBuilder.CreateCylinder(`pier_post_${idx}_${p}_r`, { diameter: 0.25, height: 2.5 }, scene);
        postR.position.set(cfg.x + 1.0, -0.6, cfg.z + p);
        postR.material = this.matWeatheredWood;
        postR.parent = this.root;
      }
    });
  }

  private buildSunkenBoats(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const boatLocs = [
      { x: -3, z: -6, rotY: 0.4, rotZ: 0.25 },
      { x: -15, z: 5, rotY: -0.6, rotZ: -0.3 },
      { x: -18, z: -14, rotY: 1.2, rotZ: 0.4 }
    ];

    boatLocs.forEach((bloc, idx) => {
      const boat = MeshBuilder.CreateBox(`boat_${idx}`, { width: 1.6, height: 0.8, depth: 4.2 }, scene);
      boat.position.set(bloc.x, -0.3, bloc.z);
      boat.rotation.set(0.1, bloc.rotY, bloc.rotZ);
      boat.material = this.matWeatheredWood;
      boat.parent = this.root;
      this.sunkenBoats.push(boat);
      if (shadowGen) shadowGen.addShadowCaster(boat);
    });
  }

  private buildRuinedHuts(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const hutLocs = [
      { x: 8, z: 4 },
      { x: 5, z: -10 },
      { x: 12, z: 12 }
    ];

    hutLocs.forEach((hloc, idx) => {
      const wall = MeshBuilder.CreateCylinder(`hut_wall_${idx}`, { diameter: 4.5, height: 2.2, tessellation: 8 }, scene);
      wall.position.set(hloc.x, 1.1, hloc.z);
      wall.material = this.matWeatheredWood;
      wall.parent = this.root;

      const roof = MeshBuilder.CreateCylinder(`hut_roof_${idx}`, { diameterTop: 0.2, diameterBottom: 5.2, height: 1.6, tessellation: 8 }, scene);
      roof.position.set(hloc.x, 2.8, hloc.z);
      roof.rotation.z = 0.15; // Yıkılmış, yana eğilmiş çatı
      roof.material = this.matRuinedThatch;
      roof.parent = this.root;

      this.ruinedHuts.push(wall, roof);
      if (shadowGen) {
        shadowGen.addShadowCaster(wall);
        shadowGen.addShadowCaster(roof);
      }
    });
  }

  /**
   * Su Tahliye Kapağını Çevirir ve Suyu Boşaltır
   */
  public turnSluiceCrank(): boolean {
    if (this.isSluiceOpen) return false;

    this.isSluiceOpen = true;
    this.targetSluiceY = -2.8; // Kapak aşağı çekilir
    this.sluiceCrankMesh.rotation.z += Math.PI * 3.0;

    ProceduralAudio.playPressurePlateClick();
    ProceduralAudio.playWaterSplash();
    EventBus.emit('ui:loot_toast', { text: '⚙️ Su Tahliye Kapağı Açıldı! Sular çekiliyor, yeraltı mağarası açığa çıktı!' });

    return true;
  }

  public checkInteract(playerPos: Vector3): boolean {
    const crankWorld = this.sluiceCrankMesh.getAbsolutePosition();
    if (Vector3.Distance(playerPos, crankWorld) < 3.5) {
      return this.turnSluiceCrank();
    }
    return false;
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    if (this.isSluiceOpen && this.sluiceGateY > this.targetSluiceY) {
      this.sluiceGateY = Scalar.Lerp(this.sluiceGateY, this.targetSluiceY, deltaTime * 1.5);
      this.sluiceGateMesh.position.y = this.sluiceGateY;
    }
  }

  public dispose(): void {
    this.root.dispose();
  }
}
