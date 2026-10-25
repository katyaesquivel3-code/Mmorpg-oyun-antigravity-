/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Ergenekon Vadisi, 7 Körük Ocağı & Devasa Demir Kapı Sistemi (ErgenekonValley)
 * (Körük Pompası + Ateş Gücü + Rüzgâr Harlaması, Erime Animasyonu,
 *  Demir Cevheri Damarları & Baş Demirci Kızıl Usta - Sıfır GC)
 */

import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  ParticleSystem,
  ShadowGenerator,
  AbstractMesh
} from '@babylonjs/core';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { InventoryManager } from '../inventory/InventoryManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface BellowsForge {
  id: number;
  position: Vector3;
  heatLevel: number; // 0.0 ile 100.0 arası (%100 = akkor erime sıcaklığı)
  isLit: boolean;
  bellowsMesh: Mesh;
  forgeMesh: Mesh;
  fireParticles: ParticleSystem;
}

export interface IronOreVein {
  id: string;
  position: Vector3;
  mesh: Mesh;
  health: number;
  isMined: boolean;
}

export class ErgenekonValley {
  private static instance: ErgenekonValley | null = null;
  public scene: Scene;

  // 7 Körük Ocağı
  public forges: BellowsForge[] = [];

  // Devasa Demir Kapı
  public ironGateMesh: Mesh;
  public ironGateMat: StandardMaterial;
  public isGateMelted = false;
  private gateMeltProgress = 0.0;
  private gateMeltParticles: ParticleSystem;

  // Kırılabilir Demir Cevheri Damarları
  public oreVeins: IronOreVein[] = [];

  // NPC: Kızıl Usta (Ocak Ustası)
  public kizilUstaMesh: Mesh | null = null;
  public kizilUstaHead: AbstractMesh | null = null;

  // Sıcak döngü scratch nesnesi
  private scratchPos = new Vector3(0, 0, 0);

  public isRestored = false;

  public static getInstance(scene?: Scene, shadowGen?: ShadowGenerator | null): ErgenekonValley {
    if (!ErgenekonValley.instance && scene) {
      ErgenekonValley.instance = new ErgenekonValley(scene, null, shadowGen);
    }
    return ErgenekonValley.instance!;
  }

  constructor(scene: Scene, worldOrShadow?: any, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    const actualShadowGen = shadowGen ?? (worldOrShadow && 'addShadowCaster' in worldOrShadow ? worldOrShadow : null);

    this.ironGateMat = new StandardMaterial('mat_iron_gate', scene);
    this.ironGateMat.diffuseColor = new Color3(0.22, 0.24, 0.28);
    this.ironGateMat.specularColor = new Color3(0.4, 0.45, 0.5);
    this.ironGateMat.emissiveColor = new Color3(0.0, 0.0, 0.0);

    this.ironGateMesh = this.buildIronGate(actualShadowGen);
    this.gateMeltParticles = this.createGateMeltParticles();

    this.build7BellowsForges(actualShadowGen);
    this.buildIronOreVeins(actualShadowGen);
    this.buildKizilUstaNPC(actualShadowGen);

    EventBus.on('world:ergenekon_restored', () => {
      this.isRestored = true;
    });
  }

  /**
   * Ergenekon Kanyonu Girişini Tıkayan Devasa Demir Kapı
   */
  private buildIronGate(shadowGen: ShadowGenerator | null): Mesh {
    // 2 kanatlı devasa dökme demir kapı (x: 105, z: 15)
    const gate = MeshBuilder.CreateBox(
      'iron_gate_ergenekon',
      { width: 14.0, height: 16.0, depth: 2.2 },
      this.scene
    );
    gate.position.set(105, 9.0, 15);
    gate.rotation.y = 0.22;
    gate.material = this.ironGateMat;
    gate.checkCollisions = true;

    if (shadowGen) shadowGen.addShadowCaster(gate);
    return gate;
  }

  private createGateMeltParticles(): ParticleSystem {
    const ps = new ParticleSystem('gate_melt_sparks', 100, this.scene);
    ps.emitter = this.ironGateMesh;
    ps.minEmitBox = new Vector3(-6.0, -7.0, -1.0);
    ps.maxEmitBox = new Vector3(6.0, 7.0, 1.0);

    ps.color1 = new Color4(1.0, 0.85, 0.3, 0.95);
    ps.color2 = new Color4(1.0, 0.25, 0.05, 0.9);
    ps.colorDead = new Color4(0.2, 0.05, 0.05, 0.0);

    ps.minSize = 0.15;
    ps.maxSize = 0.45;
    ps.minLifeTime = 0.8;
    ps.maxLifeTime = 1.6;
    ps.emitRate = 45;
    ps.gravity = new Vector3(0, -9.8, 0); // Erimiş kor damlaları aşağı akar
    ps.minEmitPower = 0.5;
    ps.maxEmitPower = 2.5;

    return ps;
  }

  /**
   * 7 Körük Ocağı Zinciri (Ergenekon Eritme Bulmacası)
   */
  private build7BellowsForges(shadowGen: ShadowGenerator | null): void {
    const forgeConfigs = [
      { id: 1, pos: new Vector3(85, 5.0, 8) },
      { id: 2, pos: new Vector3(92, 5.5, 12) },
      { id: 3, pos: new Vector3(98, 6.0, 16) },
      { id: 4, pos: new Vector3(104, 6.5, 10) },
      { id: 5, pos: new Vector3(95, 6.0, 24) },
      { id: 6, pos: new Vector3(101, 7.0, 22) },
      { id: 7, pos: new Vector3(108, 7.5, 18) }
    ];

    const stoneMat = new StandardMaterial('mat_forge_stone', this.scene);
    stoneMat.diffuseColor = new Color3(0.25, 0.18, 0.15);
    stoneMat.freeze();

    forgeConfigs.forEach((cfg) => {
      // 1. Taş Ocak Haznesi
      const forgeMesh = MeshBuilder.CreateCylinder(
        `forge_base_${cfg.id}`,
        { height: 2.2, diameterTop: 2.8, diameterBottom: 3.2, tessellation: 8 },
        this.scene
      );
      forgeMesh.position.copyFrom(cfg.pos);
      forgeMesh.position.y += 1.1;
      forgeMesh.material = stoneMat;
      forgeMesh.checkCollisions = true;

      // 2. Yan Körük Pompası & Kolu
      const bellowsMesh = MeshBuilder.CreateBox(
        `bellows_pump_${cfg.id}`,
        { width: 1.4, height: 0.9, depth: 1.8 },
        this.scene
      );
      bellowsMesh.position.set(cfg.pos.x + 1.8, cfg.pos.y + 0.6, cfg.pos.z);
      bellowsMesh.rotation.y = 0.4;
      bellowsMesh.material = stoneMat;

      if (shadowGen) {
        shadowGen.addShadowCaster(forgeMesh);
        shadowGen.addShadowCaster(bellowsMesh);
      }

      // 3. Alev & Kor Parçacıkları (Isındıkça büyür)
      const firePs = new ParticleSystem(`forge_fire_${cfg.id}`, 45, this.scene);
      firePs.emitter = forgeMesh;
      firePs.minEmitBox = new Vector3(-0.6, 0.8, -0.6);
      firePs.maxEmitBox = new Vector3(0.6, 1.2, 0.6);

      firePs.color1 = new Color4(1.0, 0.7, 0.1, 0.9);
      firePs.color2 = new Color4(0.9, 0.2, 0.05, 0.8);
      firePs.colorDead = new Color4(0.1, 0.1, 0.1, 0.0);

      firePs.minSize = 0.2;
      firePs.maxSize = 0.5;
      firePs.minLifeTime = 0.6;
      firePs.maxLifeTime = 1.2;
      firePs.emitRate = 0; // Başlangıçta sönük
      firePs.gravity = new Vector3(0, 3.5, 0);
      firePs.start();

      this.forges.push({
        id: cfg.id,
        position: cfg.pos,
        heatLevel: 0.0,
        isLit: false,
        bellowsMesh,
        forgeMesh,
        fireParticles: firePs
      });
    });
  }

  /**
   * Kırılabilir Demir Cevheri Damarları
   */
  private buildIronOreVeins(shadowGen: ShadowGenerator | null): void {
    const oreMat = new StandardMaterial('mat_iron_ore_vein', this.scene);
    oreMat.diffuseColor = new Color3(0.65, 0.35, 0.25);
    oreMat.specularColor = new Color3(0.8, 0.6, 0.5);
    oreMat.freeze();

    const orePositions = [
      new Vector3(78, 4.5, 14),
      new Vector3(88, 5.2, 30),
      new Vector3(112, 6.8, 35),
      new Vector3(132, 6.2, 10),
      new Vector3(145, 5.8, -25)
    ];

    orePositions.forEach((pos, idx) => {
      const ore = MeshBuilder.CreatePolyhedron(
        `iron_ore_node_${idx}`,
        { type: 2, size: 1.2 },
        this.scene
      );
      ore.position.copyFrom(pos);
      ore.rotation.set(Math.random(), Math.random(), Math.random());
      ore.material = oreMat;
      ore.checkCollisions = true;

      if (shadowGen) shadowGen.addShadowCaster(ore);

      this.oreVeins.push({
        id: `ore_${idx}`,
        position: pos,
        mesh: ore,
        health: 3, // 3 vuruşta kırılır
        isMined: false
      });
    });
  }

  /**
   * Prosedürel Baş Demirci Kızıl Usta (Ergenekon Ocak Ustası)
   */
  private buildKizilUstaNPC(shadowGen: ShadowGenerator | null): void {
    const root = MeshBuilder.CreateBox('npc_kizil_usta_root', { size: 0.1 }, this.scene);
    root.position.set(82, 4.8, 6);
    root.rotation.y = 1.1;

    // Gövde & Deri Önlük
    const bodyMat = new StandardMaterial('mat_kizil_body', this.scene);
    bodyMat.diffuseColor = new Color3(0.48, 0.22, 0.14); // Kızıl deri demirci önlüğü
    bodyMat.freeze();

    const torso = MeshBuilder.CreateCylinder('kizil_torso', { height: 1.5, diameter: 0.9 }, this.scene);
    torso.parent = root;
    torso.position.y = 1.2;
    torso.material = bodyMat;

    // Baş
    const headMat = new StandardMaterial('mat_kizil_head', this.scene);
    headMat.diffuseColor = new Color3(0.85, 0.65, 0.52);
    headMat.freeze();

    const head = MeshBuilder.CreateSphere('kizil_head', { diameter: 0.55 }, this.scene);
    head.parent = root;
    head.position.y = 2.15;
    head.material = headMat;

    // Örs
    const anvilMat = new StandardMaterial('mat_kizil_anvil', this.scene);
    anvilMat.diffuseColor = new Color3(0.18, 0.2, 0.24);
    anvilMat.freeze();

    const anvil = MeshBuilder.CreateBox('kizil_anvil', { width: 1.1, height: 0.85, depth: 0.65 }, this.scene);
    anvil.parent = root;
    anvil.position.set(0.7, 0.45, 0.2);
    anvil.material = anvilMat;

    if (shadowGen) {
      shadowGen.addShadowCaster(torso);
      shadowGen.addShadowCaster(head);
      shadowGen.addShadowCaster(anvil);
    }

    this.kizilUstaMesh = root;
    this.kizilUstaHead = head;
  }

  /**
   * Körük Ocağını Isıt / Pompalama Etkileşimi
   */
  public pumpForge(forgeId: number, boostAmount = 35.0): boolean {
    const forge = this.forges.find((f) => f.id === forgeId);
    if (!forge) return false;

    forge.heatLevel = Math.min(100.0, forge.heatLevel + boostAmount);
    forge.isLit = true;

    // Körük darbesi görsel animasyonu
    forge.bellowsMesh.scaling.x = 0.65;
    setTimeout(() => {
      forge.bellowsMesh.scaling.x = 1.0;
    }, 180);

    // Parçacık oranını ısıya göre güncelle
    forge.fireParticles.emitRate = Math.floor(15 + (forge.heatLevel / 100.0) * 55);
    forge.fireParticles.minSize = 0.2 + (forge.heatLevel / 100.0) * 0.45;
    forge.fireParticles.maxSize = 0.5 + (forge.heatLevel / 100.0) * 0.85;

    ProceduralAudio.playFlameIgnition();

    // 7 ocak da akkor oldu mu?
    this.checkGateMeltingCondition();
    return true;
  }

  /**
   * Yakındaki Ocağa Ateş Kıvılcımı veya Ateşli Ok Çarptığında
   */
  public igniteNearbyForge(pos: Vector3, radius = 4.2): boolean {
    let ignitedAny = false;
    for (const forge of this.forges) {
      if (Vector3.Distance(pos, forge.position) < radius) {
        this.pumpForge(forge.id, 40.0);
        ignitedAny = true;
      }
    }
    return ignitedAny;
  }

  public checkFireIgnition(pos: Vector3, radius = 4.2): boolean {
    return this.igniteNearbyForge(pos, radius);
  }

  public checkInteract(playerPos: Vector3): boolean {
    for (const f of this.forges) {
      if (Vector3.Distance(playerPos, f.position) < 4.0) {
        return this.pumpForge(f.id);
      }
    }
    return this.checkHitOreVein(playerPos);
  }

  /**
   * 7 Körük Ocağının Tamamı Akkor Olduğunda Devasa Demir Kapıyı Erit
   */
  private checkGateMeltingCondition(): void {
    if (this.isGateMelted) return;

    const allForgesHot = this.forges.every((f) => f.heatLevel >= 90.0);
    if (allForgesHot) {
      this.isGateMelted = true;
      this.gateMeltParticles.start();
      ProceduralAudio.playThunderBoom();

      EventBus.emit('ui:loot_toast', {
        text: '🔥 7 KÖRÜK OCAĞI AKKOR OLDU! Devasa Demir Dağ Kapısı eriyor!'
      });
    }
  }

  /**
   * Demir Cevheri Madenciliği (Kılıç, balta veya ok vuruşu)
   */
  public checkHitOreVein(hitPos: Vector3, radius = 3.2): boolean {
    for (const ore of this.oreVeins) {
      if (!ore.isMined && Vector3.Distance(hitPos, ore.position) < radius) {
        ore.health--;
        ProceduralAudio.playShieldBlock(); // Metal çınlama sesi

        // Vuruş sarsıntısı
        ore.mesh.scaling.scaleInPlace(0.88);

        if (ore.health <= 0) {
          ore.isMined = true;
          ore.mesh.setEnabled(false);

          // Demir Cevheri Ganimeti Ekle
          const inv = InventoryManager.getInstance();
          inv.addItem('mat_iron', 3);
          ProceduralAudio.playLootPickup();

          EventBus.emit('ui:loot_toast', {
            text: '⛏️ +3 Demir Cevheri toplandı!'
          });
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Her Kare Güncelleme (Kapı erime animasyonu & ocak soğuma sönümü)
   */
  public update(deltaTime: number, playerPos: Vector3, combat?: any): void {
    this.scratchPos.copyFrom(playerPos);

    // 1. Kapı Erime Animasyonu (Kapı akkorlaşıp aşağı doğru eriyerek kaybolur)
    if (this.isGateMelted && this.gateMeltProgress < 1.0) {
      this.gateMeltProgress += deltaTime * 0.35; // ~3 saniyede erir
      const p = Math.min(1.0, this.gateMeltProgress);

      // Akkor turuncu parlama
      this.ironGateMat.emissiveColor = new Color3(1.0 * p, 0.45 * p, 0.1 * p);
      this.ironGateMesh.scaling.y = Math.max(0.05, 1.0 - p * 0.95);
      this.ironGateMesh.position.y = 9.0 - p * 8.0;

      if (p >= 1.0) {
        this.ironGateMesh.checkCollisions = false;
        this.ironGateMesh.setEnabled(false);
        this.gateMeltParticles.stop();
        EventBus.emit('ui:loot_toast', {
          text: '🚪 ERGENEKON GEÇİDİ AÇILDI! Kadim Vadiye Gir!'
        });
      }
    }

    // 2. Ocakların Isı Seviyesi Takibi (Zamanla çok yavaş sönümlenir)
    for (const forge of this.forges) {
      if (forge.heatLevel > 0) {
        forge.heatLevel = Math.max(0, forge.heatLevel - deltaTime * 0.45);
        if (forge.heatLevel <= 0) {
          forge.isLit = false;
          forge.fireParticles.emitRate = 0;
        }
      }
    }
  }
}
