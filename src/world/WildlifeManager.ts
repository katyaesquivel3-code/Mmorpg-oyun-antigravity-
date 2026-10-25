/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Yaban Hayatı ve Avcılık Sistemi (WildlifeManager)
 * (Maral, Tavşan, Kartal, Yabani At Sürüsü, Bozkurt Sürüsü; Sürü Hareketi, Oyuncudan Kaçış, Chunk Uyku Modu, En Fazla 30 Aktif Hayvan & Av Ganimeti)
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
import { WorldManager } from './WorldManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { InventoryManager } from '../inventory/InventoryManager';

export type AnimalSpecies = 'MARAL' | 'TAVSAN' | 'KARTAL' | 'AT' | 'KURT';

export interface WildlifeEntity {
  id: string;
  species: AnimalSpecies;
  root: TransformNode;
  mesh: Mesh;
  bodyMesh: Mesh;
  position: Vector3;
  heading: number;
  speed: number;
  health: number;
  maxHealth: number;
  isDead: boolean;
  isSleeping: boolean;
  fleeRadius: number;
  flockId: number;
  animTimer: number;
  // Kartal için daire yörüngesi
  orbitCenter?: Vector3;
  orbitRadius?: number;
  orbitAngle?: number;
}

export class WildlifeManager {
  private scene: Scene;
  private world: WorldManager;
  private shadowGen: ShadowGenerator | null;

  // En çok 30 aktif hayvan bütçesi (Mobil performans garantisi)
  public static readonly MAX_ANIMALS = 30;
  public animals: WildlifeEntity[] = [];

  // Paylaşılan Düşük Poligonlu Materyaller (Materyaller dondurulur, sıfır aşırı çizim)
  private matDeer: StandardMaterial;
  private matRabbit: StandardMaterial;
  private matEagle: StandardMaterial;
  private matHorse: StandardMaterial;
  private matWolf: StandardMaterial;
  private matLoot: StandardMaterial;

  // Sıcak döngü scratch vektörleri (Rule 7: Zero GC)
  private scratchToPlayer = new Vector3(0, 0, 0);

  constructor(scene: Scene, world: WorldManager, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.world = world;
    this.shadowGen = shadowGen;

    this.matDeer = this.createMaterial('mat_deer', new Color3(0.58, 0.35, 0.18));
    this.matRabbit = this.createMaterial('mat_rabbit', new Color3(0.85, 0.82, 0.78));
    this.matEagle = this.createMaterial('mat_eagle', new Color3(0.28, 0.22, 0.16));
    this.matHorse = this.createMaterial('mat_horse', new Color3(0.42, 0.24, 0.12));
    this.matWolf = this.createMaterial('mat_wolf', new Color3(0.48, 0.48, 0.52));
    this.matLoot = this.createMaterial('mat_loot', new Color3(1.0, 0.84, 0.2), new Color3(0.4, 0.3, 0.05));

    this.spawnPopulations();
  }

  private createMaterial(name: string, diffuse: Color3, emissive?: Color3): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = diffuse;
    mat.specularColor = new Color3(0.04, 0.04, 0.04);
    if (emissive) mat.emissiveColor = emissive;
    mat.freeze();
    return mat;
  }

  /**
   * Doğal Bozkır Popülasyonunu Yerleştir (Toplam 24 hayvan - 30 bütçe altı)
   */
  private spawnPopulations(): void {
    // 1. Maral (Kızıl Geyik) - 4 adet Yer-Sub vadilerinde
    const deerSpawns = [
      { x: -35, z: 45 },
      { x: 42, z: 30 },
      { x: -20, z: -45 },
      { x: 30, z: -55 }
    ];
    deerSpawns.forEach((p, idx) => {
      this.createDeer(`deer_${idx}`, p.x, p.z, 1);
    });

    // 2. Tavşan - 8 adet yaylalarda
    const rabbitSpawns = [
      { x: 12, z: -18 },
      { x: -16, z: -25 },
      { x: 22, z: 15 },
      { x: -25, z: 20 },
      { x: 50, z: -20 },
      { x: -40, z: -30 },
      { x: 18, z: 60 },
      { x: -30, z: 70 }
    ];
    rabbitSpawns.forEach((p, idx) => {
      this.createRabbit(`rabbit_${idx}`, p.x, p.z);
    });

    // 3. Kartal - 2 adet Gök Zirve ve Bay Terek üzerinde termal daire çizer
    this.createEagle('eagle_1', new Vector3(0, 42, 28), 35);
    this.createEagle('eagle_2', new Vector3(80, 55, 90), 45);

    // 4. Yabani At Sürüsü - 6 adet at (3'lü iki sürü)
    const horseSpawns = [
      { x: 35, z: 80, flock: 1 },
      { x: 38, z: 84, flock: 1 },
      { x: 32, z: 78, flock: 1 },
      { x: -70, z: 40, flock: 2 },
      { x: -74, z: 44, flock: 2 },
      { x: -68, z: 38, flock: 2 }
    ];
    horseSpawns.forEach((p, idx) => {
      this.createHorse(`horse_${idx}`, p.x, p.z, p.flock);
    });

    // 5. Bozkurt Sürüsü - 4 adet Demir Dağ eteğinde
    const wolfSpawns = [
      { x: -55, z: 85, flock: 3 },
      { x: -58, z: 89, flock: 3 },
      { x: -52, z: 82, flock: 3 },
      { x: -62, z: 87, flock: 3 }
    ];
    wolfSpawns.forEach((p, idx) => {
      this.createWolf(`wolf_${idx}`, p.x, p.z, p.flock);
    });
  }

  // --- HAYVAN MODEL ÜRETİCİLERİ ---

  private createDeer(id: string, x: number, z: number, flockId: number): void {
    const groundY = this.world.getHeightAt(x, z);
    const root = new TransformNode(`root_${id}`, this.scene);
    root.position.set(x, groundY, z);

    // Gövde
    const body = MeshBuilder.CreateBox(`body_${id}`, { width: 0.9, height: 1.1, depth: 1.8 }, this.scene);
    body.position.y = 1.1;
    body.material = this.matDeer;
    body.parent = root;
    if (this.shadowGen) this.shadowGen.addShadowCaster(body);

    // Baş & Boyun
    const head = MeshBuilder.CreateBox(`head_${id}`, { width: 0.5, height: 0.6, depth: 0.7 }, this.scene);
    head.position.set(0, 1.8, 0.9);
    head.material = this.matDeer;
    head.parent = root;

    // Boynuzlar
    const antlerL = MeshBuilder.CreateCylinder(`antlerL_${id}`, { height: 0.9, diameterTop: 0.05, diameterBottom: 0.15, tessellation: 4 }, this.scene);
    antlerL.rotation.z = -0.4;
    antlerL.position.set(-0.35, 2.3, 0.85);
    antlerL.material = this.matDeer;
    antlerL.parent = root;

    const antlerR = MeshBuilder.CreateCylinder(`antlerR_${id}`, { height: 0.9, diameterTop: 0.05, diameterBottom: 0.15, tessellation: 4 }, this.scene);
    antlerR.rotation.z = 0.4;
    antlerR.position.set(0.35, 2.3, 0.85);
    antlerR.material = this.matDeer;
    antlerR.parent = root;

    this.animals.push({
      id,
      species: 'MARAL',
      root,
      mesh: body,
      bodyMesh: body,
      position: root.position,
      heading: Math.random() * Math.PI * 2,
      speed: 2.2,
      health: 45,
      maxHealth: 45,
      isDead: false,
      isSleeping: false,
      fleeRadius: 14.0,
      flockId,
      animTimer: Math.random() * 10
    });
  }

  private createRabbit(id: string, x: number, z: number): void {
    const groundY = this.world.getHeightAt(x, z);
    const root = new TransformNode(`root_${id}`, this.scene);
    root.position.set(x, groundY, z);

    const body = MeshBuilder.CreateSphere(`body_${id}`, { diameterX: 0.45, diameterY: 0.4, diameterZ: 0.65, segments: 5 }, this.scene);
    body.position.y = 0.22;
    body.material = this.matRabbit;
    body.parent = root;

    // Kulaklar
    const earL = MeshBuilder.CreateBox(`earL_${id}`, { width: 0.08, height: 0.35, depth: 0.08 }, this.scene);
    earL.position.set(-0.12, 0.52, 0.18);
    earL.material = this.matRabbit;
    earL.parent = root;

    const earR = MeshBuilder.CreateBox(`earR_${id}`, { width: 0.08, height: 0.35, depth: 0.08 }, this.scene);
    earR.position.set(0.12, 0.52, 0.18);
    earR.material = this.matRabbit;
    earR.parent = root;

    this.animals.push({
      id,
      species: 'TAVSAN',
      root,
      mesh: body,
      bodyMesh: body,
      position: root.position,
      heading: Math.random() * Math.PI * 2,
      speed: 3.8,
      health: 15,
      maxHealth: 15,
      isDead: false,
      isSleeping: false,
      fleeRadius: 7.5,
      flockId: 0,
      animTimer: Math.random() * 5
    });
  }

  private createEagle(id: string, orbitCenter: Vector3, orbitRadius: number): void {
    const root = new TransformNode(`root_${id}`, this.scene);
    root.position.copyFrom(orbitCenter);

    // Kartal Gövdesi ve Kanatları
    const body = MeshBuilder.CreateBox(`body_${id}`, { width: 0.6, height: 0.35, depth: 1.2 }, this.scene);
    body.material = this.matEagle;
    body.parent = root;

    const wingL = MeshBuilder.CreateBox(`wingL_${id}`, { width: 2.2, height: 0.08, depth: 0.8 }, this.scene);
    wingL.position.set(-1.25, 0.05, 0);
    wingL.material = this.matEagle;
    wingL.parent = root;

    const wingR = MeshBuilder.CreateBox(`wingR_${id}`, { width: 2.2, height: 0.08, depth: 0.8 }, this.scene);
    wingR.position.set(1.25, 0.05, 0);
    wingR.material = this.matEagle;
    wingR.parent = root;

    this.animals.push({
      id,
      species: 'KARTAL',
      root,
      mesh: body,
      bodyMesh: body,
      position: root.position,
      heading: 0,
      speed: 6.5,
      health: 25,
      maxHealth: 25,
      isDead: false,
      isSleeping: false,
      fleeRadius: 0,
      flockId: 0,
      animTimer: 0,
      orbitCenter,
      orbitRadius,
      orbitAngle: Math.random() * Math.PI * 2
    });
  }

  private createHorse(id: string, x: number, z: number, flockId: number): void {
    const groundY = this.world.getHeightAt(x, z);
    const root = new TransformNode(`root_${id}`, this.scene);
    root.position.set(x, groundY, z);

    const body = MeshBuilder.CreateBox(`body_${id}`, { width: 1.0, height: 1.3, depth: 2.2 }, this.scene);
    body.position.y = 1.35;
    body.material = this.matHorse;
    body.parent = root;
    if (this.shadowGen) this.shadowGen.addShadowCaster(body);

    const neck = MeshBuilder.CreateBox(`neck_${id}`, { width: 0.55, height: 1.1, depth: 0.8 }, this.scene);
    neck.rotation.x = -0.55;
    neck.position.set(0, 2.1, 1.0);
    neck.material = this.matHorse;
    neck.parent = root;

    this.animals.push({
      id,
      species: 'AT',
      root,
      mesh: body,
      bodyMesh: body,
      position: root.position,
      heading: Math.random() * Math.PI * 2,
      speed: 4.8,
      health: 65,
      maxHealth: 65,
      isDead: false,
      isSleeping: false,
      fleeRadius: 16.0,
      flockId,
      animTimer: Math.random() * 8
    });
  }

  private createWolf(id: string, x: number, z: number, flockId: number): void {
    const groundY = this.world.getHeightAt(x, z);
    const root = new TransformNode(`root_${id}`, this.scene);
    root.position.set(x, groundY, z);

    const body = MeshBuilder.CreateBox(`body_${id}`, { width: 0.75, height: 0.85, depth: 1.5 }, this.scene);
    body.position.y = 0.75;
    body.material = this.matWolf;
    body.parent = root;
    if (this.shadowGen) this.shadowGen.addShadowCaster(body);

    const head = MeshBuilder.CreateBox(`head_${id}`, { width: 0.45, height: 0.45, depth: 0.65 }, this.scene);
    head.position.set(0, 1.15, 0.85);
    head.material = this.matWolf;
    head.parent = root;

    this.animals.push({
      id,
      species: 'KURT',
      root,
      mesh: body,
      bodyMesh: body,
      position: root.position,
      heading: Math.random() * Math.PI * 2,
      speed: 4.2,
      health: 55,
      maxHealth: 55,
      isDead: false,
      isSleeping: false,
      fleeRadius: 13.0,
      flockId,
      animTimer: Math.random() * 6
    });
  }

  // --- DÖNGÜ VE YABAN HAYATI YAPAY ZEKASI (AI) ---

  public update(playerPos: Vector3, deltaTime: number): void {
    const px = playerPos.x;
    const pz = playerPos.z;

    for (const a of this.animals) {
      if (a.isDead) continue;

      // 1. Chunk Uyku Modu (Mesafe Culling)
      const dx = a.position.x - px;
      const dz = a.position.z - pz;
      const distSq = dx * dx + dz * dz;

      // 85 metreden uzaktaki hayvanlar CPU/GPU uyku moduna geçer
      if (distSq > 7225) {
        if (!a.isSleeping) {
          a.isSleeping = true;
          a.root.setEnabled(false);
        }
        continue;
      } else {
        if (a.isSleeping) {
          a.isSleeping = false;
          a.root.setEnabled(true);
        }
      }

      a.animTimer += deltaTime;

      // 2. Kartal Gökte Daire Uçuşu
      if (a.species === 'KARTAL' && a.orbitCenter && a.orbitRadius !== undefined && a.orbitAngle !== undefined) {
        a.orbitAngle += (a.speed / a.orbitRadius) * deltaTime;
        a.position.x = a.orbitCenter.x + Math.cos(a.orbitAngle) * a.orbitRadius;
        a.position.z = a.orbitCenter.z + Math.sin(a.orbitAngle) * a.orbitRadius;
        a.position.y = a.orbitCenter.y + Math.sin(a.animTimer * 1.5) * 2.5;

        a.root.rotation.y = -a.orbitAngle + Math.PI * 0.5;
        // Kanat çırpma salınımı
        a.root.rotation.z = Math.sin(a.animTimer * 5.0) * 0.18;
        continue;
      }

      // 3. Karada Yaşayan Hayvanların Hareketi & Oyuncudan Kaçış
      const dist = Math.sqrt(distSq);
      let isFleeing = false;

      if (dist < a.fleeRadius) {
        // Oyuncudan ters yöne kaç
        isFleeing = true;
        const fleeAngle = Math.atan2(a.position.x - px, a.position.z - pz);
        a.heading = Scalar.Lerp(a.heading, fleeAngle, Math.min(1.0, deltaTime * 6.0));
      } else {
        // Sakin Otlama & Gezinme (Wander)
        if (Math.sin(a.animTimer * 0.3) > 0.85) {
          a.heading += (Math.sin(a.animTimer * 1.8) * 0.8) * deltaTime;
        }
      }

      const moveSpeed = isFleeing ? a.speed * 1.6 : a.speed * 0.45;
      const stepX = Math.sin(a.heading) * moveSpeed * deltaTime;
      const stepZ = Math.cos(a.heading) * moveSpeed * deltaTime;

      a.position.x += stepX;
      a.position.z += stepZ;

      // Arazi Yüksekliğine Oturt
      a.position.y = this.world.getHeightAt(a.position.x, a.position.z);
      a.root.rotation.y = a.heading;

      // Yürüme Salınım Animasyonu
      if (isFleeing || moveSpeed > 0.5) {
        a.bodyMesh.position.y = (a.species === 'TAVSAN' ? 0.22 : a.species === 'MARAL' ? 1.1 : 1.35) + Math.abs(Math.sin(a.animTimer * 8.0)) * 0.12;
      }
    }
  }

  /**
   * Oyuncunun saldırısının veya okunun hayvana isabet etmesini denetler
   */
  public checkHit(pos: Vector3, radius: number, damage: number): WildlifeEntity | null {
    for (const a of this.animals) {
      if (a.isDead || a.isSleeping || a.species === 'KARTAL') continue;

      const dx = a.position.x - pos.x;
      const dz = a.position.z - pos.z;
      if (dx * dx + dz * dz <= radius * radius) {
        a.health -= damage;
        ProceduralAudio.playImpact(false);

        if (a.health <= 0) {
          this.killAnimal(a);
        }
        return a;
      }
    }
    return null;
  }

  private killAnimal(a: WildlifeEntity): void {
    a.isDead = true;
    a.root.setEnabled(false);

    // Av Ganimeti Düşürme (Faz 7 Yemek Sistemi Temeli)
    let lootName = 'Av Eti';
    const inv = InventoryManager.getInstance();
    if (a.species === 'MARAL') {
      lootName = 'Maral Eti & Geyik Boynuzu';
      inv.addItem('mat_meat', 2);
      inv.addItem('mat_bone', 1);
    } else if (a.species === 'TAVSAN') {
      lootName = 'Tavşan Eti & Kürk';
      inv.addItem('mat_meat', 1);
      inv.addItem('mat_leather', 1);
    } else if (a.species === 'AT') {
      lootName = 'Kısrak Sütü & At Yelesi';
      inv.addItem('mat_milk', 2);
    } else if (a.species === 'KURT') {
      lootName = 'Kurt Postu & Dişi';
      inv.addItem('mat_leather', 2);
      inv.addItem('mat_bone', 1);
    } else if (a.species === 'KARTAL') {
      lootName = 'Kartal Tüyü';
      inv.addItem('mat_kut_powder', 5);
    }

    // Parıldayan 3D Ganimet Küresi
    const lootOrb = MeshBuilder.CreateSphere(`loot_${a.id}`, { diameter: 0.65, segments: 6 }, this.scene);
    lootOrb.position.copyFrom(a.position);
    lootOrb.position.y += 0.5;
    lootOrb.material = this.matLoot;

    ProceduralAudio.playButtonClick();

    const hudStatus = document.getElementById('statusMessage');
    if (hudStatus) {
      hudStatus.innerText = `🏹 ${lootName.toUpperCase()} KAZANILDI!`;
      hudStatus.style.color = '#facc15';
    }

    EventBus.emit('ui:dialogue_show', {
      speaker: 'Ayaz',
      text: `${lootName} elde edildi. Bozkırın bereketi obamıza güç verecek.`
    });

    // 4 saniye sonra ganimet küresini temizle
    setTimeout(() => {
      lootOrb.dispose();
    }, 4000);
  }

  public dispose(): void {
    for (const a of this.animals) {
      a.root.dispose();
    }
    this.animals = [];
    this.matDeer.dispose();
    this.matRabbit.dispose();
    this.matEagle.dispose();
    this.matHorse.dispose();
    this.matWolf.dispose();
    this.matLoot.dispose();
  }
}
