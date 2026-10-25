/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Mabet Bulmaca Bileşenleri (ShrineComponents)
 * (Basınç Plakası, Zamanlı Meşale, Rüzgâr Fırıldağı, Işık Aynası & Alıcı,
 *  İtilebilir Blok, Hareketli Platform, Mabet Kapısı, Sandık & Sunak)
 */

import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  TransformNode,
  ParticleSystem,
  Texture,
  Ray,
  Mesh,
  Scalar
} from '@babylonjs/core';
import { ProceduralAudio } from '../audio/ProceduralAudio';

const WHITE_DOT_PNG_16 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==';

// ================= 1. BASINÇ PLAKASI (PressurePlate) =================
export class PressurePlate {
  public node: TransformNode;
  public plateMesh: Mesh;
  public isPressed = false;
  private targetY = 0;
  private currentY = 0;
  public onTrigger?: (isDown: boolean) => void;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);

    // Kaide
    const base = MeshBuilder.CreateCylinder(`${name}_base`, { diameter: 2.2, height: 0.15, tessellation: 16 }, scene);
    const baseMat = new StandardMaterial(`${name}_baseMat`, scene);
    baseMat.diffuseColor = new Color3(0.25, 0.28, 0.32);
    base.material = baseMat;
    base.parent = this.node;

    // Basamak
    this.plateMesh = MeshBuilder.CreateCylinder(`${name}_plate`, { diameter: 1.8, height: 0.12, tessellation: 16 }, scene);
    const plateMat = new StandardMaterial(`${name}_plateMat`, scene);
    plateMat.diffuseColor = new Color3(0.4, 0.45, 0.5);
    plateMat.emissiveColor = new Color3(0.08, 0.12, 0.18);
    this.plateMesh.material = plateMat;
    this.plateMesh.position.y = 0.08;
    this.plateMesh.parent = this.node;

    this.currentY = 0.08;
    this.targetY = 0.08;
  }

  public checkActivation(activatorPositions: Vector3[], radius = 1.1): void {
    const worldPos = this.node.position;
    let shouldPress = false;

    for (const pos of activatorPositions) {
      const dx = pos.x - worldPos.x;
      const dz = pos.z - worldPos.z;
      if (dx * dx + dz * dz <= radius * radius && Math.abs(pos.y - worldPos.y) < 1.2) {
        shouldPress = true;
        break;
      }
    }

    if (shouldPress !== this.isPressed) {
      this.isPressed = shouldPress;
      this.targetY = this.isPressed ? 0.02 : 0.08;
      ProceduralAudio.playPressurePlateClick(this.isPressed);
      if (this.onTrigger) this.onTrigger(this.isPressed);

      const mat = this.plateMesh.material as StandardMaterial;
      if (mat) {
        mat.emissiveColor = this.isPressed
          ? new Color3(0.2, 0.65, 1.0)
          : new Color3(0.08, 0.12, 0.18);
      }
    }
  }

  public update(deltaTime: number): void {
    this.currentY = Scalar.Lerp(this.currentY, this.targetY, Math.min(1.0, deltaTime * 12.0));
    this.plateMesh.position.y = this.currentY;
  }
}

// ================= 2. ZAMANLI ATEŞ MEŞALESİ (TimedBrazier) =================
export class TimedBrazier {
  public node: TransformNode;
  public isLit = false;
  public timer = 0;
  public readonly DURATION = 14.0; // 14 saniye boyunca yanar
  private flameParticles: ParticleSystem;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);

    // Kupa / Ayaklık
    const pillar = MeshBuilder.CreateCylinder(`${name}_pillar`, { diameterTop: 0.8, diameterBottom: 0.6, height: 1.4 }, scene);
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new Color3(0.35, 0.28, 0.2);
    pillar.material = mat;
    pillar.parent = this.node;

    const bowl = MeshBuilder.CreateCylinder(`${name}_bowl`, { diameterTop: 1.1, diameterBottom: 0.6, height: 0.4 }, scene);
    bowl.position.y = 0.8;
    bowl.material = mat;
    bowl.parent = this.node;

    // Alev Parçacığı
    const tex = new Texture(WHITE_DOT_PNG_16, scene, true, false, Texture.NEAREST_SAMPLINGMODE);
    this.flameParticles = new ParticleSystem(`${name}_flame`, 80, scene);
    this.flameParticles.particleTexture = tex;
    this.flameParticles.emitter = new Vector3(pos.x, pos.y + 1.1, pos.z);
    this.flameParticles.color1 = new Color4(1.0, 0.6, 0.1, 0.95);
    this.flameParticles.color2 = new Color4(0.9, 0.2, 0.05, 0.85);
    this.flameParticles.colorDead = new Color4(0.2, 0.05, 0.0, 0.0);
    this.flameParticles.minSize = 0.25;
    this.flameParticles.maxSize = 0.65;
    this.flameParticles.minLifeTime = 0.25;
    this.flameParticles.maxLifeTime = 0.55;
    this.flameParticles.emitRate = 0;
    this.flameParticles.direction1 = new Vector3(-0.2, 1.2, -0.2);
    this.flameParticles.direction2 = new Vector3(0.2, 1.8, 0.2);
    this.flameParticles.start();
  }

  public ignite(): void {
    if (!this.isLit) {
      this.isLit = true;
      this.timer = this.DURATION;
      this.flameParticles.emitRate = 45;
      ProceduralAudio.playFireWhoosh();
    } else {
      this.timer = this.DURATION; // Süreyi tazele
    }
  }

  public extinguish(): void {
    this.isLit = false;
    this.timer = 0;
    this.flameParticles.emitRate = 0;
  }

  public update(deltaTime: number): void {
    if (this.isLit) {
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.extinguish();
      }
    }
  }
}

// ================= 3. RÜZGÂR FIRILDAĞI (WindPinwheel) =================
export class WindPinwheel {
  public node: TransformNode;
  public bladesNode: TransformNode;
  public rotationSpeed = 0;
  public isActivated = false;
  private activateTimer = 0;
  public onActivate?: () => void;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);

    // Direk
    const post = MeshBuilder.CreateCylinder(`${name}_post`, { diameter: 0.25, height: 2.2 }, scene);
    const postMat = new StandardMaterial(`${name}_postMat`, scene);
    postMat.diffuseColor = new Color3(0.45, 0.45, 0.5);
    post.material = postMat;
    post.parent = this.node;

    // Kanatlar
    this.bladesNode = new TransformNode(`${name}_blades`, scene);
    this.bladesNode.position.y = 1.1;
    this.bladesNode.parent = this.node;

    const bladeMat = new StandardMaterial(`${name}_bladeMat`, scene);
    bladeMat.diffuseColor = new Color3(0.25, 0.7, 0.95);
    bladeMat.emissiveColor = new Color3(0.1, 0.25, 0.4);

    for (let i = 0; i < 4; i++) {
      const blade = MeshBuilder.CreateBox(`${name}_blade_${i}`, { width: 0.28, height: 0.85, depth: 0.04 }, scene);
      blade.position.y = 0.42;
      blade.rotation.z = (Math.PI / 2) * i;
      blade.material = bladeMat;
      blade.parent = this.bladesNode;
    }
  }

  public blowWind(strength = 1.0): void {
    this.rotationSpeed = Math.min(22.0, this.rotationSpeed + strength * 14.0);
    ProceduralAudio.playPinwheelSpin();

    if (this.rotationSpeed > 10.0 && !this.isActivated) {
      this.isActivated = true;
      this.activateTimer = 6.0;
      if (this.onActivate) this.onActivate();
    }
  }

  public update(deltaTime: number): void {
    if (this.rotationSpeed > 0) {
      this.bladesNode.rotation.y += this.rotationSpeed * deltaTime;
      this.rotationSpeed = Math.max(0, this.rotationSpeed - deltaTime * 4.5);
    }

    if (this.isActivated) {
      this.activateTimer -= deltaTime;
      if (this.activateTimer <= 0) {
        this.isActivated = false;
      }
    }
  }
}

// ================= 4. IŞIK AYNASI VE ALICI (LightMirror & LightReceiver) =================
export class LightMirror {
  public node: TransformNode;
  public mirrorMesh: Mesh;
  public rotationAngle = 0; // Radyan cinsinden yön

  constructor(name: string, pos: Vector3, initialAngle = 0, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);
    this.rotationAngle = initialAngle;

    // Ayaklık
    const stand = MeshBuilder.CreateCylinder(`${name}_stand`, { diameter: 0.4, height: 1.2 }, scene);
    const standMat = new StandardMaterial(`${name}_standMat`, scene);
    standMat.diffuseColor = new Color3(0.3, 0.32, 0.36);
    stand.material = standMat;
    stand.parent = this.node;

    // Altın Yansıtıcı Çerçeve ve Ayna
    this.mirrorMesh = MeshBuilder.CreateBox(`${name}_mirror`, { width: 1.2, height: 1.2, depth: 0.12 }, scene);
    this.mirrorMesh.position.y = 1.0;
    const mirrorMat = new StandardMaterial(`${name}_mirrorMat`, scene);
    mirrorMat.diffuseColor = new Color3(0.9, 0.8, 0.3);
    mirrorMat.specularColor = new Color3(1.0, 1.0, 1.0);
    mirrorMat.emissiveColor = new Color3(0.2, 0.18, 0.05);
    this.mirrorMesh.material = mirrorMat;
    this.mirrorMesh.parent = this.node;

    this.mirrorMesh.rotation.y = this.rotationAngle;
  }

  public rotateMirror(): void {
    this.rotationAngle += Math.PI / 4; // 45 derecelik adımlarla döner
    this.mirrorMesh.rotation.y = this.rotationAngle;
    ProceduralAudio.playMirrorBeamHum();
  }
}

export class LightReceiver {
  public node: TransformNode;
  public crystalMesh: Mesh;
  public isPowered = false;
  public onPowerStateChange?: (powered: boolean) => void;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);

    // Duvar Yuvası
    const socket = MeshBuilder.CreateCylinder(`${name}_socket`, { diameter: 1.4, height: 0.3 }, scene);
    socket.rotation.x = Math.PI / 2;
    const sMat = new StandardMaterial(`${name}_sMat`, scene);
    sMat.diffuseColor = new Color3(0.2, 0.22, 0.25);
    socket.material = sMat;
    socket.parent = this.node;

    // Kristal
    this.crystalMesh = MeshBuilder.CreatePolyhedron(`${name}_crystal`, { type: 1, size: 0.45 }, scene);
    this.crystalMesh.position.z = 0.25;
    const cMat = new StandardMaterial(`${name}_cMat`, scene);
    cMat.diffuseColor = new Color3(0.2, 0.5, 0.8);
    cMat.emissiveColor = new Color3(0.05, 0.12, 0.2);
    this.crystalMesh.material = cMat;
    this.crystalMesh.parent = this.node;
  }

  public setPowered(powered: boolean): void {
    if (this.isPowered !== powered) {
      this.isPowered = powered;
      const mat = this.crystalMesh.material as StandardMaterial;
      if (mat) {
        mat.emissiveColor = powered
          ? new Color3(0.4, 0.85, 1.0)
          : new Color3(0.05, 0.12, 0.2);
      }
      if (powered) {
        ProceduralAudio.playMirrorBeamHum();
      }
      if (this.onPowerStateChange) this.onPowerStateChange(powered);
    }
  }
}

// ================= 5. İTİLEBİLİR TAŞ BLOK (PushableBlock) =================
export class PushableBlock {
  public node: TransformNode;
  public mesh: Mesh;
  public position: Vector3;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.position = pos.clone();
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(this.position);

    this.mesh = MeshBuilder.CreateBox(`${name}_box`, { width: 1.6, height: 1.6, depth: 1.6 }, scene);
    this.mesh.position.y = 0.8;
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new Color3(0.5, 0.48, 0.45);
    mat.specularColor = new Color3(0.1, 0.1, 0.1);
    this.mesh.material = mat;
    this.mesh.parent = this.node;
  }

  public tryPush(pusherPos: Vector3, pusherHeading: number, pushSpeed: number, deltaTime: number): boolean {
    const dx = this.position.x - pusherPos.x;
    const dz = this.position.z - pusherPos.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < 2.8) {
      const pushDirX = Math.sin(pusherHeading);
      const pushDirZ = Math.cos(pusherHeading);

      this.position.x += pushDirX * pushSpeed * deltaTime;
      this.position.z += pushDirZ * pushSpeed * deltaTime;
      this.node.position.copyFrom(this.position);

      if (Math.random() < 0.1) {
        ProceduralAudio.playFootstep(false);
      }
      return true;
    }
    return false;
  }
}

// ================= 6. HAREKETLİ PLATFORM (MovingPlatform) =================
export class MovingPlatform {
  public node: TransformNode;
  public mesh: Mesh;
  public startPos: Vector3;
  public endPos: Vector3;
  public currentPos: Vector3;
  public progress = 0;
  public direction = 1;
  public speed = 2.4; // m/s

  constructor(name: string, start: Vector3, end: Vector3, scene: Scene) {
    this.startPos = start.clone();
    this.endPos = end.clone();
    this.currentPos = start.clone();

    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(this.currentPos);

    this.mesh = MeshBuilder.CreateBox(`${name}_slab`, { width: 3.5, height: 0.4, depth: 3.5 }, scene);
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new Color3(0.38, 0.42, 0.46);
    this.mesh.material = mat;
    this.mesh.parent = this.node;
  }

  public update(deltaTime: number): void {
    const totalDist = Vector3.Distance(this.startPos, this.endPos);
    if (totalDist < 0.1) return;

    const step = (this.speed * deltaTime) / totalDist;
    this.progress += step * this.direction;

    if (this.progress >= 1.0) {
      this.progress = 1.0;
      this.direction = -1;
    } else if (this.progress <= 0.0) {
      this.progress = 0.0;
      this.direction = 1;
    }

    Vector3.LerpToRef(this.startPos, this.endPos, this.progress, this.currentPos);
    this.node.position.copyFrom(this.currentPos);
  }
}

// ================= 7. MABET KAPISI (ShrineDoor) =================
export class ShrineDoor {
  public node: TransformNode;
  public doorMesh: Mesh;
  public isOpen = false;
  private currentY = 0;
  private targetY = 0;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);

    this.doorMesh = MeshBuilder.CreateBox(`${name}_gate`, { width: 3.2, height: 4.5, depth: 0.35 }, scene);
    this.doorMesh.position.y = 2.25;
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new Color3(0.22, 0.25, 0.3);
    mat.emissiveColor = new Color3(0.04, 0.06, 0.08);
    this.doorMesh.material = mat;
    this.doorMesh.parent = this.node;
  }

  public open(): void {
    if (!this.isOpen) {
      this.isOpen = true;
      this.targetY = 4.2;
      ProceduralAudio.playPressurePlateClick(false);
      ProceduralAudio.playShrineSolvedFanfare();
    }
  }

  public close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.targetY = 0;
    }
  }

  public update(deltaTime: number): void {
    this.currentY = Scalar.Lerp(this.currentY, this.targetY, Math.min(1.0, deltaTime * 3.5));
    this.doorMesh.position.y = 2.25 + this.currentY;
  }
}

// ================= 8. GANİMET SANDIĞI (ShrineChest) =================
export class ShrineChest {
  public node: TransformNode;
  public lidNode: TransformNode;
  public isOpened = false;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);

    // Kasa
    const base = MeshBuilder.CreateBox(`${name}_base`, { width: 1.4, height: 0.6, depth: 0.9 }, scene);
    base.position.y = 0.3;
    const mat = new StandardMaterial(`${name}_chestMat`, scene);
    mat.diffuseColor = new Color3(0.45, 0.32, 0.18);
    base.material = mat;
    base.parent = this.node;

    // Kapak
    this.lidNode = new TransformNode(`${name}_lid`, scene);
    this.lidNode.position.set(0, 0.6, -0.45);
    this.lidNode.parent = this.node;

    const lid = MeshBuilder.CreateBox(`${name}_lidMesh`, { width: 1.4, height: 0.35, depth: 0.9 }, scene);
    lid.position.set(0, 0.17, 0.45);
    lid.material = mat;
    lid.parent = this.lidNode;
  }

  public open(): void {
    if (!this.isOpened) {
      this.isOpened = true;
      this.lidNode.rotation.x = -Math.PI * 0.45;
      ProceduralAudio.playButtonClick();
    }
  }
}

// ================= 9. KAM TAŞI SUNAĞI (ShrineAltar) =================
export class ShrineAltar {
  public node: TransformNode;
  public orbMesh: Mesh;
  public isClaimed = false;

  constructor(name: string, pos: Vector3, scene: Scene) {
    this.node = new TransformNode(name, scene);
    this.node.position.copyFrom(pos);

    // Sunak Kaidesi
    const pedestal = MeshBuilder.CreateCylinder(`${name}_ped`, { diameterTop: 1.6, diameterBottom: 2.2, height: 1.2 }, scene);
    pedestal.position.y = 0.6;
    const pMat = new StandardMaterial(`${name}_pMat`, scene);
    pMat.diffuseColor = new Color3(0.25, 0.3, 0.35);
    pedestal.material = pMat;
    pedestal.parent = this.node;

    // Yüzen Ruh Küresi (Kam Taşı)
    this.orbMesh = MeshBuilder.CreateSphere(`${name}_orb`, { diameter: 0.75, segments: 12 }, scene);
    this.orbMesh.position.y = 1.9;
    const oMat = new StandardMaterial(`${name}_oMat`, scene);
    oMat.emissiveColor = new Color3(0.3, 0.8, 1.0);
    oMat.diffuseColor = new Color3(0.1, 0.4, 0.8);
    this.orbMesh.material = oMat;
    this.orbMesh.parent = this.node;
  }

  public claim(): boolean {
    if (!this.isClaimed) {
      this.isClaimed = true;
      this.orbMesh.setEnabled(false);
      return true;
    }
    return false;
  }

  public update(deltaTime: number): void {
    if (!this.isClaimed) {
      this.orbMesh.rotation.y += deltaTime * 1.5;
      this.orbMesh.position.y = 1.9 + Math.sin(Date.now() * 0.003) * 0.12;
    }
  }
}
