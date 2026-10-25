/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Ergenekon Vadisi 4 Kam Taşı Mabedi (ErgenekonShrines)
 * (1. Körük Ocağı Mabedi, 2. Termal Baca Süzülüş Mabedi,
 *  3. Lav Aynası Mabedi, 4. Termal Şok Zırh Kırma Mabedi & Sıfır GC)
 */

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
import { ShrineBase } from './ShrineBase';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { KamPowerManager } from '../powers/KamPowerManager';

// =========================================================================
// 1. KÖRÜK OCAĞI MABEDİ (Isı & Körükleme Bulmacası)
// =========================================================================

export class ErgenekonBellowsShrine extends ShrineBase {
  public bellowsHeat = 0.0;
  public isGateMelted = false;
  private furnaceMesh: Mesh;
  private bellowsLeverMesh: Mesh;
  private gateMesh: Mesh;
  private altarMesh: Mesh;
  private matFurnaceGlow: StandardMaterial;
  private matGate: StandardMaterial;

  constructor(scene: Scene) {
    super('shrine_ergenekon_bellows', 'Demir Ocağı Mabedi', new Vector3(120, 4.0, -10), scene);

    // Merkezi Ocak
    this.furnaceMesh = MeshBuilder.CreateCylinder('furnace_mesh', { diameter: 2.2, height: 1.8, tessellation: 8 }, scene);
    this.furnaceMesh.position.set(0, 0.9, 0);
    this.furnaceMesh.parent = this.rootNode;

    this.matFurnaceGlow = new StandardMaterial('mat_shrine_furnace', scene);
    this.matFurnaceGlow.diffuseColor = new Color3(0.2, 0.1, 0.05);
    this.matFurnaceGlow.emissiveColor = new Color3(0.0, 0.0, 0.0);
    this.furnaceMesh.material = this.matFurnaceGlow;

    // Körük Kolu
    this.bellowsLeverMesh = MeshBuilder.CreateBox('bellows_lever', { width: 0.25, height: 1.2, depth: 0.25 }, scene);
    this.bellowsLeverMesh.position.set(-1.8, 0.6, 0);
    this.bellowsLeverMesh.parent = this.rootNode;
    const matWood = new StandardMaterial('mat_shrine_wood', scene);
    matWood.diffuseColor = new Color3(0.4, 0.25, 0.15);
    this.bellowsLeverMesh.material = matWood;

    // Eritilecek Demir Parmaklık Kapı
    this.gateMesh = MeshBuilder.CreateBox('shrine_iron_gate', { width: 3.5, height: 3.2, depth: 0.3 }, scene);
    this.gateMesh.position.set(0, 1.6, 4.5);
    this.gateMesh.parent = this.rootNode;
    this.matGate = new StandardMaterial('mat_shrine_gate', scene);
    this.matGate.diffuseColor = new Color3(0.22, 0.24, 0.28);
    this.gateMesh.material = this.matGate;

    // Kam Taşı Sunağı
    this.altarMesh = MeshBuilder.CreateCylinder('shrine_altar', { diameter: 1.2, height: 0.8, tessellation: 6 }, scene);
    this.altarMesh.position.set(0, 0.4, 6.5);
    this.altarMesh.parent = this.rootNode;
  }

  public pumpBellows(): void {
    if (this.isCompleted) return;
    this.bellowsHeat = Math.min(100.0, this.bellowsHeat + 28.0);
    ProceduralAudio.playFlameIgnition();
    this.bellowsLeverMesh.rotation.z = 0.4;
    setTimeout(() => {
      this.bellowsLeverMesh.rotation.z = 0.0;
    }, 200);

    EventBus.emit('ui:loot_toast', { text: `🔥 Mabet Körüğü Harladı! Isı: %${Math.round(this.bellowsHeat)}` });
  }

  public applyFire(): void {
    if (this.isCompleted) return;
    this.bellowsHeat = Math.min(100.0, this.bellowsHeat + 35.0);
    ProceduralAudio.playFlameIgnition();
  }

  public override update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    if (!this.isGateMelted) {
      if (this.bellowsHeat > 0) {
        this.bellowsHeat = Math.max(0, this.bellowsHeat - deltaTime * 4.5);
        const ratio = this.bellowsHeat / 100.0;
        this.matFurnaceGlow.emissiveColor.set(ratio * 0.95, ratio * 0.35, 0.02);

        if (this.bellowsHeat >= 95.0) {
          this.isGateMelted = true;
          this.gateMesh.scaling.y = 0.05;
          this.gateMesh.position.y = 0.1;
          ProceduralAudio.playSteamHiss();
          EventBus.emit('ui:loot_toast', { text: '✨ Demir Kapı Eridi! Kam Taşı Altarı Açıldı!' });
        }
      }
    } else if (!this.isCompleted) {
      // Oyuncu sunağa yaklaşırsa tamamla
      const altarWorldPos = this.altarMesh.getAbsolutePosition();
      if (Vector3.Distance(playerPos, altarWorldPos) < 2.2) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// 2. TERMAL BACA SÜZÜLÜŞ MABEDİ (Yel Ana & Sıcak Hava Akımı Bulmacası)
// =========================================================================

export class ErgenekonUpdraftShrine extends ShrineBase {
  public isPlatePressed = false;
  private pressurePlateMesh: Mesh;
  private ventMesh: Mesh;
  private altarMesh: Mesh;

  constructor(scene: Scene) {
    super('shrine_ergenekon_updraft', 'Yel Ana Bacası Mabedi', new Vector3(145, 5.0, 30), scene);

    // Sıcak Lav Bacası Menfezi
    this.ventMesh = MeshBuilder.CreateCylinder('shrine_vent', { diameter: 3.2, height: 0.6, tessellation: 8 }, scene);
    this.ventMesh.position.set(0, 0.3, 0);
    this.ventMesh.parent = this.rootNode;
    const ventMat = new StandardMaterial('mat_shrine_vent', scene);
    ventMat.diffuseColor = new Color3(0.18, 0.12, 0.1);
    ventMat.emissiveColor = new Color3(0.65, 0.2, 0.05);
    this.ventMesh.material = ventMat;

    // Yüksek Platformdaki Baskı Plakası (+14m yükseklik)
    this.pressurePlateMesh = MeshBuilder.CreateCylinder('shrine_pressure_plate', { diameter: 2.2, height: 0.3, tessellation: 8 }, scene);
    this.pressurePlateMesh.position.set(0, 14.0, 6.0);
    this.pressurePlateMesh.parent = this.rootNode;
    const plateMat = new StandardMaterial('mat_shrine_plate', scene);
    plateMat.diffuseColor = new Color3(0.3, 0.35, 0.4);
    this.pressurePlateMesh.material = plateMat;

    // Sunak (Yüksek platformda)
    this.altarMesh = MeshBuilder.CreateBox('shrine_updraft_altar', { width: 1.2, height: 0.8, depth: 1.2 }, scene);
    this.altarMesh.position.set(0, 14.5, 9.5);
    this.altarMesh.parent = this.rootNode;
  }

  public override completeShrine(): void {
    super.completeShrine();
    KamPowerManager.getInstance().isWindUnlocked = true;
    EventBus.emit('achievement:unlock', { id: 'WIND_POWER_UNLOCKED' });
    EventBus.emit('ui:loot_toast', { text: '🌪️ YEL ANA RÜZGÂR GÜCÜ VE SÜZÜLME KANADI KALICI AÇILDI!' });
  }

  public override update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    if (!this.isPlatePressed) {
      const plateWorldPos = this.pressurePlateMesh.getAbsolutePosition();
      if (Vector3.Distance(playerPos, plateWorldPos) < 2.0) {
        this.isPlatePressed = true;
        this.pressurePlateMesh.position.y = 13.85; // Aşağı basıldı
        ProceduralAudio.playPressurePlateClick(true);
        EventBus.emit('ui:loot_toast', { text: '⚡ Antik Baskı Plakası Kilitlendi!' });
      }
    } else if (!this.isCompleted) {
      const altarWorldPos = this.altarMesh.getAbsolutePosition();
      if (Vector3.Distance(playerPos, altarWorldPos) < 2.2) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// 3. LAV AYNASI MABEDİ (Işık Yansıtma & Güneş Kristali Bulmacası)
// =========================================================================

export class ErgenekonMirrorShrine extends ShrineBase {
  public mirrorAngle = 0.0;
  public isTargetAligned = false;
  private mirrorMesh: Mesh;
  private targetRuneMesh: Mesh;
  private altarMesh: Mesh;
  private matTarget: StandardMaterial;

  constructor(scene: Scene) {
    super('shrine_ergenekon_mirror', 'Kızıl Ayna Mabedi', new Vector3(165, 3.5, 65), scene);

    // Dönen Bronz Ayna
    this.mirrorMesh = MeshBuilder.CreateBox('shrine_mirror_mesh', { width: 1.6, height: 2.2, depth: 0.15 }, scene);
    this.mirrorMesh.position.set(0, 1.2, 0);
    this.mirrorMesh.parent = this.rootNode;
    const matMirror = new StandardMaterial('mat_shrine_mirror', scene);
    matMirror.diffuseColor = new Color3(0.85, 0.75, 0.4);
    matMirror.specularColor = new Color3(0.95, 0.95, 0.95);
    this.mirrorMesh.material = matMirror;

    // Hedef Güneş Rünü
    this.targetRuneMesh = MeshBuilder.CreateDisc('shrine_target_rune', { radius: 0.9, tessellation: 12 }, scene);
    this.targetRuneMesh.position.set(5.5, 2.0, 5.5);
    this.targetRuneMesh.rotation.y = -Math.PI * 0.75;
    this.targetRuneMesh.parent = this.rootNode;
    this.matTarget = new StandardMaterial('mat_shrine_rune', scene);
    this.matTarget.diffuseColor = new Color3(0.3, 0.25, 0.2);
    this.targetRuneMesh.material = this.matTarget;

    // Sunak
    this.altarMesh = MeshBuilder.CreateCylinder('shrine_mirror_altar', { diameter: 1.2, height: 0.8 }, scene);
    this.altarMesh.position.set(5.5, 0.4, 7.5);
    this.altarMesh.parent = this.rootNode;
  }

  public rotateMirror(): void {
    if (this.isTargetAligned) return;
    this.mirrorAngle += Math.PI * 0.25; // 45 derecelik açılarla döner
    this.mirrorMesh.rotation.y = this.mirrorAngle;
    ProceduralAudio.playButtonClick();

    // ~135 dereceye gelince hizalanır
    const normalized = Math.abs(this.mirrorAngle % (Math.PI * 2));
    if (Math.abs(normalized - Math.PI * 0.75) < 0.15) {
      this.isTargetAligned = true;
      this.matTarget.emissiveColor = new Color3(1.0, 0.85, 0.2);
      ProceduralAudio.playMirrorBeamHum();
      EventBus.emit('ui:loot_toast', { text: '☀️ Işık Demeti Güneş Rününe Kilitlendi!' });
    }
  }

  public override update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    if (this.isTargetAligned && !this.isCompleted) {
      const altarWorldPos = this.altarMesh.getAbsolutePosition();
      if (Vector3.Distance(playerPos, altarWorldPos) < 2.2) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// 4. TERMAL ŞOK MABEDİ (Kızgın Akkor Demir + Su Vanası Çatlatma)
// =========================================================================

export class ErgenekonThermalShockShrine extends ShrineBase {
  public blockHeat = 0.0;
  public isBlockShattered = false;
  private ironBlockMesh: Mesh;
  private waterValveMesh: Mesh;
  private altarMesh: Mesh;
  private matIronBlock: StandardMaterial;

  constructor(scene: Scene) {
    super('shrine_ergenekon_thermal_shock', 'Termal Şok Mabedi', new Vector3(180, 6.0, -35), scene);

    // Kırılacak Akkor Demir Blok
    this.ironBlockMesh = MeshBuilder.CreateBox('shrine_shock_block', { width: 2.2, height: 2.2, depth: 2.2 }, scene);
    this.ironBlockMesh.position.set(0, 1.1, 0);
    this.ironBlockMesh.parent = this.rootNode;

    this.matIronBlock = new StandardMaterial('mat_shrine_iron_block', scene);
    this.matIronBlock.diffuseColor = new Color3(0.25, 0.25, 0.28);
    this.ironBlockMesh.material = this.matIronBlock;

    // Su Kanalı Vanası
    this.waterValveMesh = MeshBuilder.CreateTorus('shrine_water_valve', { diameter: 0.9, thickness: 0.15, tessellation: 8 }, scene);
    this.waterValveMesh.position.set(-2.2, 1.5, 0);
    this.waterValveMesh.rotation.z = Math.PI * 0.5;
    this.waterValveMesh.parent = this.rootNode;
    const matValve = new StandardMaterial('mat_shrine_valve', scene);
    matValve.diffuseColor = new Color3(0.3, 0.45, 0.65);
    this.waterValveMesh.material = matValve;

    // Sunak (Bloğun arkasında)
    this.altarMesh = MeshBuilder.CreateBox('shrine_shock_altar', { width: 1.2, height: 0.8, depth: 1.2 }, scene);
    this.altarMesh.position.set(0, 0.4, 4.0);
    this.altarMesh.parent = this.rootNode;
  }

  public applyFire(): void {
    if (this.isBlockShattered) return;
    this.blockHeat = Math.min(100.0, this.blockHeat + 40.0);
    ProceduralAudio.playFlameIgnition();
    EventBus.emit('ui:loot_toast', { text: `🔥 Demir Blok Akkorlaştı: %${Math.round(this.blockHeat)}` });
  }

  public turnWaterValve(): void {
    if (this.isBlockShattered) return;
    this.waterValveMesh.rotation.y += Math.PI * 0.5;
    ProceduralAudio.playWaterSplash();

    if (this.blockHeat >= 80.0) {
      // TERMAL ŞOK! Akkor demir ani soğuk suyla çatlar ve dağılır!
      this.isBlockShattered = true;
      this.ironBlockMesh.scaling.set(0.1, 0.1, 0.1);
      this.ironBlockMesh.setEnabled(false);
      ProceduralAudio.playSteamHiss();
      ProceduralAudio.playCrit();
      EventBus.emit('ui:loot_toast', { text: '💥 TERMAL ŞOK! Akkor Demir Blok Paramparça Oldu!' });
    } else {
      EventBus.emit('ui:loot_toast', { text: '💧 Su aktı lakin blok yeterince sıcak değildi! Önce ateşle kızdır!' });
    }
  }

  public override update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    if (!this.isBlockShattered) {
      if (this.blockHeat > 0) {
        this.blockHeat = Math.max(0, this.blockHeat - deltaTime * 5.0);
        const r = this.blockHeat / 100.0;
        this.matIronBlock.emissiveColor.set(r * 0.95, r * 0.25, 0.02);
      }
    } else if (!this.isCompleted) {
      const altarWorldPos = this.altarMesh.getAbsolutePosition();
      if (Vector3.Distance(playerPos, altarWorldPos) < 2.2) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// ERGENEKON MABETLERİ YÖNETİCİSİ (ErgenekonShrineManager)
// =========================================================================

export class ErgenekonShrineManager {
  public bellowsShrine: ErgenekonBellowsShrine;
  public updraftShrine: ErgenekonUpdraftShrine;
  public mirrorShrine: ErgenekonMirrorShrine;
  public thermalShockShrine: ErgenekonThermalShockShrine;

  constructor(scene: Scene, kamPower: KamPowerManager) {
    this.bellowsShrine = new ErgenekonBellowsShrine(scene);
    this.updraftShrine = new ErgenekonUpdraftShrine(scene);
    this.mirrorShrine = new ErgenekonMirrorShrine(scene);
    this.thermalShockShrine = new ErgenekonThermalShockShrine(scene);

    EventBus.on('shrine:completed', () => {
      kamPower.addKamStone();
    });
  }

  public checkInteract(playerPos: Vector3): boolean {
    // 1. Körük Mabedi
    if (Vector3.Distance(playerPos, this.bellowsShrine.position) < 5.0) {
      this.bellowsShrine.pumpBellows();
      return true;
    }
    // 2. Lav Aynası Mabedi
    if (Vector3.Distance(playerPos, this.mirrorShrine.position) < 4.5) {
      this.mirrorShrine.rotateMirror();
      return true;
    }
    // 3. Termal Şok Mabedi Su Vanası
    if (Vector3.Distance(playerPos, this.thermalShockShrine.position) < 5.0) {
      this.thermalShockShrine.turnWaterValve();
      return true;
    }
    return false;
  }

  public checkFireIgnition(pos: Vector3, radius = 3.0): void {
    if (Vector3.Distance(pos, this.bellowsShrine.position) < radius + 3.0) {
      this.bellowsShrine.applyFire();
    }
    if (Vector3.Distance(pos, this.thermalShockShrine.position) < radius + 3.0) {
      this.thermalShockShrine.applyFire();
    }
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    this.bellowsShrine.update(deltaTime, playerPos);
    this.updraftShrine.update(deltaTime, playerPos);
    this.mirrorShrine.update(deltaTime, playerPos);
    this.thermalShockShrine.update(deltaTime, playerPos);
  }
}
