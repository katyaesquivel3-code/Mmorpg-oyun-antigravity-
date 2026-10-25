/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Şahmaran Gölü 4 Kam Taşı Mabedi (SahmaranShrines)
 * (1. Akıntı & Girdap Mabedi, 2. Yüzen Nilüfer Sıçrama Mabedi,
 *  3. Su Seviyesi & Vana Mabedi, 4. Su Altı Kristal Rezonans Mabedi & Sıfır GC)
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
import { PlayerController } from '../player/PlayerController';

// =========================================================================
// 1. AKINTI & GİRDAP MABEDİ (Su Akıntısını Yönlendirme Bulmacası)
// =========================================================================

export class SahmaranCurrentShrine extends ShrineBase {
  public diverter1Active = false;
  public diverter2Active = false;
  public isCurrentCalmed = false;

  private diverterPillar1: Mesh;
  private diverterPillar2: Mesh;
  private altarMesh: Mesh;
  private matGlow: StandardMaterial;

  constructor(scene: Scene) {
    super('shrine_sahmaran_current', 'Akıntı ve Girdap Mabedi', new Vector3(-85, -5.0, -15), scene);

    this.matGlow = new StandardMaterial('mat_shrine_current_glow', scene);
    this.matGlow.diffuseColor = new Color3(0.1, 0.4, 0.6);
    this.matGlow.emissiveColor = new Color3(0.05, 0.15, 0.25);

    // 1. Akıntı Yönlendirme Sütunu
    this.diverterPillar1 = MeshBuilder.CreateCylinder('div_pillar_1', { diameter: 1.2, height: 3.5, tessellation: 8 }, scene);
    this.diverterPillar1.position.set(-4.5, 1.75, 2.0);
    this.diverterPillar1.material = this.matGlow;
    this.diverterPillar1.parent = this.rootNode;

    // 2. Akıntı Yönlendirme Sütunu
    this.diverterPillar2 = MeshBuilder.CreateCylinder('div_pillar_2', { diameter: 1.2, height: 3.5, tessellation: 8 }, scene);
    this.diverterPillar2.position.set(4.5, 1.75, 2.0);
    this.diverterPillar2.material = this.matGlow;
    this.diverterPillar2.parent = this.rootNode;

    // Kam Taşı Sunağı
    this.altarMesh = MeshBuilder.CreateCylinder('altar_current', { diameter: 1.4, height: 0.9, tessellation: 6 }, scene);
    this.altarMesh.position.set(0, 0.45, 6.0);
    this.altarMesh.material = this.matGlow;
    this.altarMesh.parent = this.rootNode;
  }

  public activateDiverter(index: number): void {
    if (index === 1 && !this.diverter1Active) {
      this.diverter1Active = true;
      ProceduralAudio.playWaterSplash();
      EventBus.emit('ui:loot_toast', { text: '🌊 1. Su Dalgakıranı Açıldı!' });
    } else if (index === 2 && !this.diverter2Active) {
      this.diverter2Active = true;
      ProceduralAudio.playWaterSplash();
      EventBus.emit('ui:loot_toast', { text: '🌊 2. Su Dalgakıranı Açıldı!' });
    }

    if (this.diverter1Active && this.diverter2Active && !this.isCurrentCalmed) {
      this.isCurrentCalmed = true;
      this.matGlow.emissiveColor.set(0.15, 0.7, 0.9);
      ProceduralAudio.playShrineSolvedFanfare();
      EventBus.emit('ui:loot_toast', { text: '✨ Akıntı dindi! Kam Taşı sunağına geçit açıldı.' });
    }
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    if (this.diverter1Active) {
      this.diverterPillar1.rotation.y += deltaTime * 2.0;
    }
    if (this.diverter2Active) {
      this.diverterPillar2.rotation.y -= deltaTime * 2.0;
    }

    if (this.isCurrentCalmed && !this.isCompleted) {
      const altarWorld = this.altarMesh.getAbsolutePosition();
      const distToAltar = Vector3.Distance(playerPos, altarWorld);
      if (distToAltar < 2.5) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// 2. YÜZEN NİLÜFER SIÇRAMA MABEDİ (Platform Zamanlama Bulmacası)
// =========================================================================

export class SahmaranWaterLilyShrine extends ShrineBase {
  public lilyPads: { mesh: Mesh; baseY: number; sinkTimer: number; isSunk: boolean }[] = [];
  public altarMesh: Mesh;
  private matLily: StandardMaterial;

  constructor(scene: Scene) {
    super('shrine_sahmaran_lily', 'Yüzen Nilüfer Mabedi', new Vector3(-150, 0.5, 40), scene);

    this.matLily = new StandardMaterial('mat_shrine_lily', scene);
    this.matLily.diffuseColor = new Color3(0.15, 0.65, 0.28);
    this.matLily.emissiveColor = new Color3(0.05, 0.2, 0.08);

    // 4 Adet Sıçrama Nilüferi
    const offsets = [
      { x: -3.0, z: 2.0 },
      { x: -1.0, z: 4.5 },
      { x: 1.5, z: 6.5 },
      { x: 3.5, z: 8.5 }
    ];

    offsets.forEach((off, idx) => {
      const mesh = MeshBuilder.CreateCylinder(`lily_pad_${idx}`, { diameter: 2.2, height: 0.15, tessellation: 12 }, scene);
      mesh.position.set(off.x, 0.1, off.z);
      mesh.material = this.matLily;
      mesh.parent = this.rootNode;

      this.lilyPads.push({
        mesh,
        baseY: 0.1,
        sinkTimer: 0,
        isSunk: false
      });
    });

    // Kam Taşı Sunağı
    this.altarMesh = MeshBuilder.CreateCylinder('altar_lily', { diameter: 1.4, height: 0.9, tessellation: 6 }, scene);
    this.altarMesh.position.set(4.5, 0.8, 12.0);
    this.altarMesh.material = this.matLily;
    this.altarMesh.parent = this.rootNode;
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    // Nilüferlerin batıp çıkma fiziği
    this.lilyPads.forEach((pad) => {
      const padWorld = pad.mesh.getAbsolutePosition();
      const dist2D = Math.hypot(playerPos.x - padWorld.x, playerPos.z - padWorld.z);

      if (dist2D < 1.3 && Math.abs(playerPos.y - padWorld.y) < 0.8) {
        // Oyuncu üzerinde duruyor; yavaşça batar
        pad.sinkTimer += deltaTime;
        if (pad.sinkTimer > 1.8) {
          pad.isSunk = true;
          pad.mesh.position.y = Scalar.Lerp(pad.mesh.position.y, pad.baseY - 2.5, deltaTime * 3.0);
        } else {
          pad.mesh.position.y = Scalar.Lerp(pad.mesh.position.y, pad.baseY - 0.4, deltaTime * 2.0);
        }
      } else {
        // Oyuncu üstünde değilse eski haline döner
        pad.sinkTimer = Math.max(0, pad.sinkTimer - deltaTime * 0.8);
        if (pad.sinkTimer <= 0.2) {
          pad.isSunk = false;
        }
        pad.mesh.position.y = Scalar.Lerp(pad.mesh.position.y, pad.baseY, deltaTime * 2.0);
      }
    });

    if (!this.isCompleted) {
      const altarWorld = this.altarMesh.getAbsolutePosition();
      const distToAltar = Vector3.Distance(playerPos, altarWorld);
      if (distToAltar < 2.5) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// 3. SU SEVİYESİ & VANA MABEDİ (Batık Tapınak Drenaj Bulmacası)
// =========================================================================

export class SahmaranWaterLevelShrine extends ShrineBase {
  public valve1Turned = false;
  public valve2Turned = false;
  public isGateDrained = false;

  private valveWheel1: Mesh;
  private valveWheel2: Mesh;
  private gateMesh: Mesh;
  private altarMesh: Mesh;
  private matBronze: StandardMaterial;

  constructor(scene: Scene) {
    super('shrine_sahmaran_water_level', 'Su Seviyesi ve Vana Mabedi', new Vector3(-110, -6.0, -90), scene);

    this.matBronze = new StandardMaterial('mat_shrine_bronze', scene);
    this.matBronze.diffuseColor = new Color3(0.55, 0.4, 0.2);
    this.matBronze.emissiveColor = new Color3(0.1, 0.08, 0.03);

    // 1. Antik Drenaj Vanası
    this.valveWheel1 = MeshBuilder.CreateTorus('valve_wheel_1', { diameter: 1.1, thickness: 0.2, tessellation: 12 }, scene);
    this.valveWheel1.position.set(-3.5, 1.2, 2.0);
    this.valveWheel1.rotation.x = Math.PI * 0.5;
    this.valveWheel1.material = this.matBronze;
    this.valveWheel1.parent = this.rootNode;

    // 2. Antik Drenaj Vanası
    this.valveWheel2 = MeshBuilder.CreateTorus('valve_wheel_2', { diameter: 1.1, thickness: 0.2, tessellation: 12 }, scene);
    this.valveWheel2.position.set(3.5, 1.2, 2.0);
    this.valveWheel2.rotation.x = Math.PI * 0.5;
    this.valveWheel2.material = this.matBronze;
    this.valveWheel2.parent = this.rootNode;

    // Demir Parmaklık Kapı
    this.gateMesh = MeshBuilder.CreateBox('shrine_drain_gate', { width: 3.5, height: 3.2, depth: 0.3 }, scene);
    this.gateMesh.position.set(0, 1.6, 5.0);
    this.gateMesh.material = this.matBronze;
    this.gateMesh.parent = this.rootNode;

    // Kam Taşı Sunağı
    this.altarMesh = MeshBuilder.CreateCylinder('altar_water_level', { diameter: 1.4, height: 0.9, tessellation: 6 }, scene);
    this.altarMesh.position.set(0, 0.45, 8.0);
    this.altarMesh.material = this.matBronze;
    this.altarMesh.parent = this.rootNode;
  }

  public turnValve(index: number): void {
    if (index === 1 && !this.valve1Turned) {
      this.valve1Turned = true;
      this.valveWheel1.rotation.z += Math.PI * 2.0;
      ProceduralAudio.playPressurePlateClick();
      EventBus.emit('ui:loot_toast', { text: '⚙️ 1. Drenaj Vanası Çevrildi!' });
    } else if (index === 2 && !this.valve2Turned) {
      this.valve2Turned = true;
      this.valveWheel2.rotation.z += Math.PI * 2.0;
      ProceduralAudio.playPressurePlateClick();
      EventBus.emit('ui:loot_toast', { text: '⚙️ 2. Drenaj Vanası Çevrildi!' });
    }

    if (this.valve1Turned && this.valve2Turned && !this.isGateDrained) {
      this.isGateDrained = true;
      ProceduralAudio.playShrineSolvedFanfare();
      EventBus.emit('ui:loot_toast', { text: '✨ Sular çekildi! Mabet kapısı açıldı.' });
    }
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    if (this.isGateDrained && this.gateMesh.position.y > -2.0) {
      this.gateMesh.position.y -= deltaTime * 1.5;
    }

    if (this.isGateDrained && !this.isCompleted) {
      const altarWorld = this.altarMesh.getAbsolutePosition();
      const distToAltar = Vector3.Distance(playerPos, altarWorld);
      if (distToAltar < 2.5) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// 4. SU ALTI KRİSTAL REZONANS MABEDİ (Derin Dalış & Kristal Vuruş Bulmacası)
// =========================================================================

export class SahmaranUnderwaterCrystalShrine extends ShrineBase {
  public crystals: { mesh: Mesh; isLit: boolean; glowMat: StandardMaterial }[] = [];
  public isBarrierDissolved = false;
  private barrierMesh: Mesh;
  private altarMesh: Mesh;

  constructor(scene: Scene) {
    super('shrine_sahmaran_crystals', 'Su Altı Kristal Mabedi', new Vector3(-170, -14.0, -45), scene);

    // 3 Adet Rezonans Kristali
    const crystalOffsets = [
      new Vector3(-4.0, 1.2, 0),
      new Vector3(0.0, 2.5, 4.0),
      new Vector3(4.0, 1.2, 0)
    ];

    crystalOffsets.forEach((pos, idx) => {
      const mesh = MeshBuilder.CreatePolyhedron(`res_crystal_${idx}`, { type: 1, size: 0.7 }, scene);
      mesh.position.copyFrom(pos);
      const mat = new StandardMaterial(`mat_crys_${idx}`, scene);
      mat.diffuseColor = new Color3(0.2, 0.7, 0.9);
      mat.emissiveColor = new Color3(0.05, 0.15, 0.2);
      mesh.material = mat;
      mesh.parent = this.rootNode;

      this.crystals.push({
        mesh,
        isLit: false,
        glowMat: mat
      });
    });

    // Kristal Su Bariyeri
    this.barrierMesh = MeshBuilder.CreatePlane('shrine_water_barrier', { width: 4.0, height: 3.5 }, scene);
    this.barrierMesh.position.set(0, 1.75, 5.5);
    const matBarrier = new StandardMaterial('mat_barrier', scene);
    matBarrier.diffuseColor = new Color3(0.3, 0.85, 1.0);
    matBarrier.alpha = 0.45;
    this.barrierMesh.material = matBarrier;
    this.barrierMesh.parent = this.rootNode;

    // Kam Taşı Sunağı
    this.altarMesh = MeshBuilder.CreateCylinder('altar_crystal', { diameter: 1.4, height: 0.9, tessellation: 6 }, scene);
    this.altarMesh.position.set(0, 0.45, 8.5);
    this.altarMesh.parent = this.rootNode;
  }

  public strikeCrystal(index: number): void {
    if (index >= 0 && index < this.crystals.length) {
      const c = this.crystals[index];
      if (!c.isLit) {
        c.isLit = true;
        c.glowMat.emissiveColor.set(0.35, 0.95, 1.0);
        ProceduralAudio.playCrit();
        EventBus.emit('ui:loot_toast', { text: `💎 ${index + 1}. Su Kristali Işıldadı!` });

        const allLit = this.crystals.every((cr) => cr.isLit);
        if (allLit && !this.isBarrierDissolved) {
          this.isBarrierDissolved = true;
          this.barrierMesh.setEnabled(false);
          ProceduralAudio.playShrineSolvedFanfare();
          EventBus.emit('ui:loot_toast', { text: '✨ Su kristali bariyeri dağıldı! Sunak açıldı.' });
        }
      }
    }
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    this.checkEntrance(playerPos);

    this.crystals.forEach((c, idx) => {
      c.mesh.rotation.y += deltaTime * (idx % 2 === 0 ? 1.5 : -1.5);
    });

    if (this.isBarrierDissolved && !this.isCompleted) {
      const altarWorld = this.altarMesh.getAbsolutePosition();
      const distToAltar = Vector3.Distance(playerPos, altarWorld);
      if (distToAltar < 2.5) {
        this.completeShrine();
      }
    }
  }
}

// =========================================================================
// ŞAHMARAN MABETLERİ YÖNETİCİSİ (SahmaranShrineManager)
// =========================================================================

export class SahmaranShrineManager {
  private scene: Scene;
  public currentShrine: SahmaranCurrentShrine;
  public lilyShrine: SahmaranWaterLilyShrine;
  public waterLevelShrine: SahmaranWaterLevelShrine;
  public crystalShrine: SahmaranUnderwaterCrystalShrine;

  constructor(scene: Scene) {
    this.scene = scene;
    this.currentShrine = new SahmaranCurrentShrine(scene);
    this.lilyShrine = new SahmaranWaterLilyShrine(scene);
    this.waterLevelShrine = new SahmaranWaterLevelShrine(scene);
    this.crystalShrine = new SahmaranUnderwaterCrystalShrine(scene);
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    this.currentShrine.update(deltaTime, playerPos);
    this.lilyShrine.update(deltaTime, playerPos);
    this.waterLevelShrine.update(deltaTime, playerPos);
    this.crystalShrine.update(deltaTime, playerPos);
  }

  /**
   * Oyuncu eylemleriyle mabet bulmaca etkileşimlerini kontrol eder
   */
  public checkInteraction(playerPos: Vector3): boolean {
    // 1. Akıntı Mabedi Dalgakıran Kontrolleri
    const distCur = Vector3.Distance(playerPos, this.currentShrine.position);
    if (distCur < 12.0) {
      if (!this.currentShrine.diverter1Active) {
        this.currentShrine.activateDiverter(1);
        return true;
      } else if (!this.currentShrine.diverter2Active) {
        this.currentShrine.activateDiverter(2);
        return true;
      }
    }

    // 2. Su Seviyesi Mabedi Vana Kontrolleri
    const distLev = Vector3.Distance(playerPos, this.waterLevelShrine.position);
    if (distLev < 12.0) {
      if (!this.waterLevelShrine.valve1Turned) {
        this.waterLevelShrine.turnValve(1);
        return true;
      } else if (!this.waterLevelShrine.valve2Turned) {
        this.waterLevelShrine.turnValve(2);
        return true;
      }
    }

    // 3. Su Altı Kristal Mabedi
    const distCrys = Vector3.Distance(playerPos, this.crystalShrine.position);
    if (distCrys < 12.0) {
      for (let i = 0; i < this.crystalShrine.crystals.length; i++) {
        if (!this.crystalShrine.crystals[i].isLit) {
          this.crystalShrine.strikeCrystal(i);
          return true;
        }
      }
    }

    return false;
  }
}
