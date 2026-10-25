/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Şahmaran Gölü, Batık Tapınak & Nilüfer Platformları (SahmaranLake)
 * (Batık Şehir Sütunları, Yüzen Nilüferler, Arıtıcı Su Pınarları,
 *  NPC Lokman Hekim Şifacı Kulübesi & Sıfır GC)
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

export interface FloatingWaterLily {
  id: string;
  position: Vector3;
  baseY: number;
  radius: number;
  mesh: Mesh;
  bobPhase: number;
}

export interface LakePurifierSpring {
  id: string;
  position: Vector3;
  mesh: Mesh;
  isPurified: boolean;
}

export class SahmaranLake {
  private static instance: SahmaranLake | null = null;
  public scene: Scene;

  // Batık Tapınak & Mimari Kalıntılar
  public sunkenRuinsRoot: TransformNode;
  public templeColumns: Mesh[] = [];

  // Yüzen Nilüfer Platformları (Üzerine basılabilir)
  public waterLilies: FloatingWaterLily[] = [];

  // 3 Kutsal Arıtıcı Pınar Vanası (Gölün zehrini arıtmak için)
  public purifierSprings: LakePurifierSpring[] = [];
  public isLakePurified = false;

  // NPC: Lokman Hekim (Göl Kenarı Şifacısı)
  public lokmanRoot: TransformNode | null = null;
  public lokmanHead: Mesh | null = null;

  // Materyaller
  private matAncientStone: StandardMaterial;
  private matWaterLily: StandardMaterial;
  private matPurifierValve: StandardMaterial;
  private matPurifiedGlow: StandardMaterial;

  // Scratch vektörler (Sıfır GC)
  private scratchPos = new Vector3(0, 0, 0);

  public static getInstance(scene?: Scene, shadowGen?: ShadowGenerator | null): SahmaranLake {
    if (!SahmaranLake.instance && scene) {
      SahmaranLake.instance = new SahmaranLake(scene, null, shadowGen);
    }
    return SahmaranLake.instance!;
  }

  constructor(scene: Scene, worldOrShadow?: any, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    SahmaranLake.instance = this;
    const actualShadowGen = shadowGen ?? (worldOrShadow && 'addShadowCaster' in worldOrShadow ? worldOrShadow : null);

    this.sunkenRuinsRoot = new TransformNode('sahmaran_lake_root', scene);

    // ================= MATERYALLER =================
    this.matAncientStone = new StandardMaterial('mat_sunken_stone', scene);
    this.matAncientStone.diffuseColor = new Color3(0.28, 0.42, 0.38); // Yosunlu su altı taşı
    this.matAncientStone.specularColor = new Color3(0.1, 0.2, 0.2);
    this.matAncientStone.freeze();

    this.matWaterLily = new StandardMaterial('mat_water_lily', scene);
    this.matWaterLily.diffuseColor = new Color3(0.18, 0.65, 0.32); // Nilüfer yeşili
    this.matWaterLily.specularColor = new Color3(0.2, 0.4, 0.2);
    this.matWaterLily.freeze();

    this.matPurifierValve = new StandardMaterial('mat_purifier_valve', scene);
    this.matPurifierValve.diffuseColor = new Color3(0.35, 0.55, 0.7);
    this.matPurifierValve.freeze();

    this.matPurifiedGlow = new StandardMaterial('mat_purified_glow', scene);
    this.matPurifiedGlow.diffuseColor = new Color3(0.3, 0.9, 0.85);
    this.matPurifiedGlow.emissiveColor = new Color3(0.15, 0.65, 0.6);

    this.buildSunkenTempleRuins(actualShadowGen);
    this.buildWaterLilyPlatforms(actualShadowGen);
    this.buildPurifierSprings(actualShadowGen);
    this.buildLokmanHekimNPC(actualShadowGen);

    EventBus.on('world:sahmaran_purified', () => {
      this.isLakePurified = true;
      this.matAncientStone.diffuseColor.set(0.35, 0.65, 0.58);
      EventBus.emit('ui:loot_toast', { text: '🌊 Şahmaran Gölü arındı, sular zümrüt ve turkuaza büründü!' });
    });
  }

  /**
   * Batık Tapınak Sütunları ve Su Altı Kemerleri
   */
  private buildSunkenTempleRuins(shadowGen: ShadowGenerator | null): void {
    const columnLocs = [
      { x: -110, y: -16, z: -35, height: 14 },
      { x: -125, y: -16, z: -40, height: 16 },
      { x: -140, y: -16, z: -30, height: 13 },
      { x: -120, y: -16, z: -55, height: 15 },
      { x: -135, y: -16, z: -60, height: 17 },
      { x: -150, y: -16, z: -45, height: 14 }
    ];

    columnLocs.forEach((loc, idx) => {
      const col = MeshBuilder.CreateCylinder(`sunken_col_${idx}`, {
        diameter: 2.2,
        height: loc.height,
        tessellation: 8
      }, this.scene);
      col.position.set(loc.x, loc.y + loc.height * 0.5, loc.z);
      col.material = this.matAncientStone;
      col.parent = this.sunkenRuinsRoot;
      col.checkCollisions = true;

      if (shadowGen) shadowGen.addShadowCaster(col);
      this.templeColumns.push(col);
    });

    // Batık Sunak Kemeri
    const arch = MeshBuilder.CreateTorus('sunken_arch', { diameter: 8.5, thickness: 1.2, tessellation: 12 }, this.scene);
    arch.position.set(-130, -8.0, -45);
    arch.rotation.x = Math.PI * 0.5;
    arch.material = this.matAncientStone;
    arch.parent = this.sunkenRuinsRoot;
  }

  /**
   * Su Yüzeyinde Dalgalanan Nilüfer Zambak Platformları (Zıplama Parkuru)
   */
  private buildWaterLilyPlatforms(shadowGen: ShadowGenerator | null): void {
    const lilyLocs = [
      new Vector3(-65, 0.05, -20),
      new Vector3(-80, 0.05, -28),
      new Vector3(-95, 0.05, -35),
      new Vector3(-110, 0.05, -22),
      new Vector3(-125, 0.05, -15),
      new Vector3(-140, 0.05, -25),
      new Vector3(-155, 0.05, -38)
    ];

    lilyLocs.forEach((pos, idx) => {
      const lily = MeshBuilder.CreateCylinder(`water_lily_${idx}`, {
        diameter: 3.4,
        height: 0.18,
        tessellation: 12
      }, this.scene);
      lily.position.copyFrom(pos);
      lily.material = this.matWaterLily;
      lily.parent = this.sunkenRuinsRoot;
      lily.checkCollisions = true;

      if (shadowGen) shadowGen.addShadowCaster(lily);

      this.waterLilies.push({
        id: `lily_${idx}`,
        position: pos.clone(),
        baseY: pos.y,
        radius: 1.7,
        mesh: lily,
        bobPhase: idx * 0.8
      });
    });
  }

  /**
   * 3 Kutsal Arıtıcı Pınar Vanası (Gölün Zehrini Temizlemek İçin)
   */
  private buildPurifierSprings(shadowGen: ShadowGenerator | null): void {
    const springLocs = [
      new Vector3(-85, 0.2, -12),
      new Vector3(-135, 0.2, 15),
      new Vector3(-160, 0.2, -75)
    ];

    springLocs.forEach((pos, idx) => {
      const valve = MeshBuilder.CreateTorus(`purifier_valve_${idx}`, {
        diameter: 1.6,
        thickness: 0.25,
        tessellation: 8
      }, this.scene);
      valve.position.set(pos.x, pos.y + 0.8, pos.z);
      valve.rotation.z = Math.PI * 0.5;
      valve.material = this.matPurifierValve;
      valve.parent = this.sunkenRuinsRoot;

      const basePedestal = MeshBuilder.CreateCylinder(`purifier_base_${idx}`, {
        diameter: 2.2,
        height: 0.8,
        tessellation: 6
      }, this.scene);
      basePedestal.position.copyFrom(pos);
      basePedestal.material = this.matAncientStone;
      basePedestal.parent = this.sunkenRuinsRoot;

      if (shadowGen) {
        shadowGen.addShadowCaster(valve);
        shadowGen.addShadowCaster(basePedestal);
      }

      this.purifierSprings.push({
        id: `purifier_${idx}`,
        position: pos,
        mesh: valve,
        isPurified: false
      });
    });
  }

  /**
   * NPC: Lokman Hekim (Göl Kıyısındaki Bilge Şifacı)
   */
  private buildLokmanHekimNPC(shadowGen: ShadowGenerator | null): void {
    const root = new TransformNode('npc_lokman_hekim_root', this.scene);
    root.position.set(-75, 1.2, -18);
    root.rotation.y = 1.4;

    // Şifacı Kaftanı
    const bodyMat = new StandardMaterial('mat_lokman_robe', this.scene);
    bodyMat.diffuseColor = new Color3(0.2, 0.45, 0.35); // Zümrüt şifacı yeşili
    bodyMat.freeze();

    const torso = MeshBuilder.CreateCylinder('lokman_torso', { height: 1.45, diameter: 0.85 }, this.scene);
    torso.position.y = 1.15;
    torso.material = bodyMat;
    torso.parent = root;

    // Baş & Şifacı Sarığı
    const headMat = new StandardMaterial('mat_lokman_head', this.scene);
    headMat.diffuseColor = new Color3(0.85, 0.72, 0.58);
    headMat.freeze();

    const head = MeshBuilder.CreateSphere('lokman_head', { diameter: 0.55 }, this.scene);
    head.position.y = 2.1;
    head.material = headMat;
    head.parent = root;

    const turbanMat = new StandardMaterial('mat_lokman_turban', this.scene);
    turbanMat.diffuseColor = new Color3(0.9, 0.9, 0.85);
    turbanMat.freeze();

    const turban = MeshBuilder.CreateTorus('lokman_turban', { diameter: 0.65, thickness: 0.18, tessellation: 8 }, this.scene);
    turban.position.y = 2.3;
    turban.material = turbanMat;
    turban.parent = root;

    // Şifalı Ot Sepeti
    const basketMat = new StandardMaterial('mat_lokman_basket', this.scene);
    basketMat.diffuseColor = new Color3(0.48, 0.32, 0.18);
    basketMat.freeze();

    const basket = MeshBuilder.CreateCylinder('lokman_basket', { diameter: 0.75, height: 0.65 }, this.scene);
    basket.position.set(0.65, 0.35, 0.2);
    basket.material = basketMat;
    basket.parent = root;

    if (shadowGen) {
      shadowGen.addShadowCaster(torso);
      shadowGen.addShadowCaster(head);
    }

    this.lokmanRoot = root;
    this.lokmanHead = head;
  }

  /**
   * Arıtıcı Pınar Vanasını Çevirme Etkileşimi
   */
  public turnPurifierValve(valveId: string): boolean {
    const spring = this.purifierSprings.find((s) => s.id === valveId);
    if (!spring || spring.isPurified) return false;

    spring.isPurified = true;
    spring.mesh.rotation.x += Math.PI * 0.5;
    spring.mesh.material = this.matPurifiedGlow;

    ProceduralAudio.playWaterSplash();
    ProceduralAudio.playBeaconHum();

    EventBus.emit('ui:loot_toast', { text: `✨ Arıtıcı Pınar Açıldı! Saf Su Akıyor (${this.getPurifiedCount()}/3)` });

    // 3 pınar da arındığında gölün zehri dağılır
    if (this.purifierSprings.every((s) => s.isPurified)) {
      EventBus.emit('world:sahmaran_purified');
    }

    return true;
  }

  public getPurifiedCount(): number {
    return this.purifierSprings.filter((s) => s.isPurified).length;
  }

  /**
   * Oyuncu Yakınında Bir Şeyle Etkileşime Geçtiğinde
   */
  public checkInteract(playerPos: Vector3): boolean {
    // 1. Arıtıcı Pınar Vanaları
    for (const s of this.purifierSprings) {
      if (!s.isPurified && Vector3.Distance(playerPos, s.position) < 3.5) {
        return this.turnPurifierValve(s.id);
      }
    }
    // 2. Lokman Hekim
    if (this.lokmanRoot && Vector3.Distance(playerPos, this.lokmanRoot.position) < 3.5) {
      EventBus.emit('dialogue:start', { startNodeId: 'lokman_main' });
      return true;
    }
    return false;
  }

  /**
   * Her Kare Nilüferlerin Dalgalanması & Su Fiziği (Sıfır GC)
   */
  public update(deltaTime: number, playerPos: Vector3): void {
    this.scratchPos.copyFrom(playerPos);

    // 1. Nilüfer Platformlarının Su Yüzeyinde Hafif Batıp Çıkması
    for (let i = 0; i < this.waterLilies.length; i++) {
      const lily = this.waterLilies[i];
      lily.bobPhase += deltaTime * 1.8;

      // Oyuncu nilüferin üzerindeyse biraz daha batar
      const dist2D = Math.hypot(this.scratchPos.x - lily.position.x, this.scratchPos.z - lily.position.z);
      const isPlayerOnLily = dist2D < lily.radius && Math.abs(this.scratchPos.y - lily.baseY) < 0.8;

      const targetY = lily.baseY + Math.sin(lily.bobPhase) * 0.08 - (isPlayerOnLily ? 0.15 : 0.0);
      lily.mesh.position.y = Scalar.Lerp(lily.mesh.position.y, targetY, Math.min(1.0, deltaTime * 8.0));
    }
  }
}
