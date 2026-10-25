/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Türk Mitolojisi Dünya Anıtları ve Keşif Sistemi (Landmarks)
 * (Bay Terek Ulu Hayat Ağacı, Yurt Çadırları, 4 Bengü Taş, Balballar, Kurganlar, Kamp Ateşi)
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
  Color4,
  Texture
} from '@babylonjs/core';
import { WorldManager } from './WorldManager';
import { WorldNoise } from './WorldNoise';
import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';

export interface BenguTasData {
  id: string;
  name: string;
  biome: string;
  position: Vector3;
  discovered: boolean;
  mesh: Mesh;
}

export class LandmarkManager {
  private scene: Scene;
  private world: WorldManager;
  private shadowGen: ShadowGenerator | null;

  // Ana Kutsal Anıt: Bay Terek
  public bayTerekRoot: TransformNode;
  private bayTerekFoliageMeshes: Mesh[] = [];
  public kutRestorationLevel = 0; // 0 = Kurumuş, 1 = Yer Kutu, 2 = Ateş, 3 = Su, 4 = Tam Diriliş

  // 4 Bengü Taş (Hızlı Yolculuk & Kayıt Anıtları)
  public benguTaslar: BenguTasData[] = [];

  // Yurt Çadırları ve Oba Kamp Ateşi
  private obaRoot: TransformNode;
  public campfirePos: Vector3;
  private campfireParticles: ParticleSystem | null = null;

  // Balbal Taşları
  private balbalMeshes: Mesh[] = [];

  // Kurganlar
  private kurganRoots: TransformNode[] = [];

  // Sıcak döngü scratch nesnesi
  private scratchDistVec = new Vector3(0, 0, 0);

  constructor(scene: Scene, world: WorldManager, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.world = world;
    this.shadowGen = shadowGen;

    this.bayTerekRoot = new TransformNode('bay_terek_root', scene);
    this.obaRoot = new TransformNode('otuken_oba_root', scene);
    this.campfirePos = new Vector3(0, 0, 0);

    this.buildBayTerek();
    this.buildOtukenOba();
    this.buildBenguTaslar();
    this.buildBalbalStones();
    this.buildKurganTombs();
    this.build12KamShrine();

    EventBus.on('world:kut_restoration', (data) => {
      this.setKutRestorationLevel(data.level);
    });
    EventBus.on('world:bay_terek_healed', (data: { stage: number }) => {
      this.setKutRestorationLevel(data.stage);
    });
  }

  /**
   * 1. BAY TEREK (Ulu Hayat Ağacı - Yer ile Gök'ü Bağlayan Kutsal Ağaç)
   * Başlangıç platosunun kuzeyinde (x: 0, z: 28) yükselir.
   */
  private buildBayTerek(): void {
    const posX = 0;
    const posZ = 28;
    const posY = this.world.getHeightAt(posX, posZ);

    this.bayTerekRoot.position.set(posX, posY, posZ);

    // Kadim Ağaç Kabuğu Materyali
    const matTrunk = new StandardMaterial('mat_bay_terek_bark', this.scene);
    matTrunk.diffuseColor = new Color3(0.28, 0.18, 0.12);
    matTrunk.specularColor = new Color3(0.04, 0.04, 0.04);
    matTrunk.roughness = 0.95;
    matTrunk.freeze();

    // Ulu Gövde (Alt çap 4.8m, üst çap 2.6m, yükseklik 18m)
    const trunk = MeshBuilder.CreateCylinder('bay_terek_trunk', {
      height: 18,
      diameterTop: 2.6,
      diameterBottom: 4.8,
      tessellation: 10
    }, this.scene);
    trunk.position.y = 9;
    trunk.material = matTrunk;
    trunk.parent = this.bayTerekRoot;
    if (this.shadowGen) this.shadowGen.addShadowCaster(trunk);

    // Kök Destekleri (Gövdeden zemine yayılan 4 ana kadim kök)
    const rootAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    rootAngles.forEach((angle, idx) => {
      const rootMesh = MeshBuilder.CreateCylinder(`terek_root_${idx}`, {
        height: 7,
        diameterTop: 0.6,
        diameterBottom: 1.8,
        tessellation: 6
      }, this.scene);
      rootMesh.rotation.z = Math.PI * 0.32;
      rootMesh.rotation.y = angle;
      rootMesh.position.set(Math.cos(angle) * 3.2, 2.2, Math.sin(angle) * 3.2);
      rootMesh.material = matTrunk;
      rootMesh.parent = this.bayTerekRoot;
      if (this.shadowGen) this.shadowGen.addShadowCaster(rootMesh);
    });

    // 4 Ana Yöne Uzanan Göksel Dallar
    const branchDirs = [
      { angle: 0.2, y: 14, len: 10 },
      { angle: 1.8, y: 15, len: 11 },
      { angle: 3.4, y: 13.5, len: 10.5 },
      { angle: 4.9, y: 16, len: 11.5 }
    ];

    branchDirs.forEach((b, idx) => {
      const branch = MeshBuilder.CreateCylinder(`terek_branch_${idx}`, {
        height: b.len,
        diameterTop: 0.5,
        diameterBottom: 1.4,
        tessellation: 6
      }, this.scene);
      branch.rotation.z = Math.PI * 0.38;
      branch.rotation.y = b.angle;
      branch.position.set(Math.cos(b.angle) * 3.5, b.y, Math.sin(b.angle) * 3.5);
      branch.material = matTrunk;
      branch.parent = this.bayTerekRoot;
      if (this.shadowGen) this.shadowGen.addShadowCaster(branch);
    });

    // Kut Işığı Saçan Yaprak Taçları (Başlangıçta solgun/kurumuş)
    const matFoliage = new StandardMaterial('mat_bay_terek_leaves', this.scene);
    matFoliage.diffuseColor = new Color3(0.55, 0.48, 0.25); // Kara Kış solgunluğu
    matFoliage.emissiveColor = new Color3(0.08, 0.06, 0.02);
    matFoliage.specularColor = new Color3(0.05, 0.05, 0.05);

    const leafClusters = [
      { x: 0, y: 18.5, z: 0, s: 7.5 },
      { x: 6.5, y: 16, z: 2, s: 5.5 },
      { x: -5.5, y: 17, z: 3.5, s: 5.8 },
      { x: -2, y: 15.5, z: -6.5, s: 5.2 },
      { x: 5, y: 17.5, z: -4.5, s: 5.6 }
    ];

    leafClusters.forEach((lc, idx) => {
      const crown = MeshBuilder.CreateSphere(`terek_leaves_${idx}`, {
        diameter: lc.s,
        segments: 6
      }, this.scene);
      crown.position.set(lc.x, lc.y, lc.z);
      crown.material = matFoliage;
      crown.parent = this.bayTerekRoot;
      if (this.shadowGen) this.shadowGen.addShadowCaster(crown);
      this.bayTerekFoliageMeshes.push(crown);
    });
  }

  /**
   * Kut Parçaları Toplandıkça Bay Terek'in Canlanması
   */
  public setKutRestorationLevel(level: number): void {
    this.kutRestorationLevel = level;
    if (this.bayTerekFoliageMeshes.length === 0) return;

    const mat = this.bayTerekFoliageMeshes[0].material as StandardMaterial;
    if (!mat) return;

    if (level === 0) {
      // Başlangıç: Erlik Han'ın Kara Kışı yüzünden kurumuş
      mat.diffuseColor.set(0.52, 0.45, 0.25);
      mat.emissiveColor.set(0.06, 0.05, 0.02);
    } else if (level === 1) {
      // Yer Kutu alındı: İlk taze yeşil filizler ve hafif zümrüt ışıltı
      mat.diffuseColor.set(0.25, 0.72, 0.32);
      mat.emissiveColor.set(0.08, 0.25, 0.1);
    } else if (level === 2) {
      // Ateş Kutu alındı: Sıcak altın ve kehribar kut dalgaları
      mat.diffuseColor.set(0.35, 0.78, 0.28);
      mat.emissiveColor.set(0.25, 0.22, 0.05);
    } else if (level === 3) {
      // Su Kutu alındı: Berrak turkuaz kut canlanması
      mat.diffuseColor.set(0.2, 0.85, 0.45);
      mat.emissiveColor.set(0.1, 0.35, 0.3);
    } else {
      // Gök Kutu alındı: Tam diriliş, ilahi Gök Tengri kut ışığı
      mat.diffuseColor.set(0.18, 0.95, 0.55);
      mat.emissiveColor.set(0.2, 0.55, 0.45);
    }
  }

  /**
   * 2. ÖTÜKEN OBASI & YURT ÇADIRLARI (Keçe Türk Çadırları & Şifalı Kamp Ateşi)
   */
  private buildOtukenOba(): void {
    const matFelt = new StandardMaterial('mat_yurt_felt', this.scene);
    matFelt.diffuseColor = new Color3(0.92, 0.88, 0.82); // Beyaz koyun keçesi
    matFelt.specularColor = new Color3(0.02, 0.02, 0.02);
    matFelt.freeze();

    const matWoodDoor = new StandardMaterial('mat_yurt_wood', this.scene);
    matWoodDoor.diffuseColor = new Color3(0.48, 0.28, 0.15);
    matWoodDoor.freeze();

    const matBanner = new StandardMaterial('mat_oba_banner', this.scene);
    matBanner.diffuseColor = new Color3(0.85, 0.18, 0.18); // Kut kırmızısı
    matBanner.emissiveColor = new Color3(0.15, 0.02, 0.02);
    matBanner.freeze();

    // 3 Adet Yurt Çadırı Konumları (Başlangıç yaylası çevresi)
    const yurtLocs = [
      { x: -14, z: 6, rot: 0.4, scale: 1.1 },
      { x: 13, z: 8, rot: -0.8, scale: 1.0 },
      { x: -9, z: -12, rot: 1.9, scale: 0.95 }
    ];

    yurtLocs.forEach((yl, idx) => {
      const yurtBaseY = this.world.getHeightAt(yl.x, yl.z);
      const yurtNode = new TransformNode(`yurt_node_${idx}`, this.scene);
      yurtNode.position.set(yl.x, yurtBaseY, yl.z);
      yurtNode.rotation.y = yl.rot;

      // Çadır Silindirik Duvarı (Gövde)
      const wall = MeshBuilder.CreateCylinder(`yurt_wall_${idx}`, {
        height: 1.6,
        diameter: 5.2 * yl.scale,
        tessellation: 12
      }, this.scene);
      wall.position.y = 0.8;
      wall.material = matFelt;
      wall.parent = yurtNode;
      if (this.shadowGen) this.shadowGen.addShadowCaster(wall);

      // Çadır Kubbesi (Konik çatı)
      const roof = MeshBuilder.CreateCylinder(`yurt_roof_${idx}`, {
        height: 1.4,
        diameterTop: 0.8,
        diameterBottom: 5.4 * yl.scale,
        tessellation: 12
      }, this.scene);
      roof.position.y = 2.3;
      roof.material = matFelt;
      roof.parent = yurtNode;
      if (this.shadowGen) this.shadowGen.addShadowCaster(roof);

      // Ahşap Kapı Girişi
      const door = MeshBuilder.CreateBox(`yurt_door_${idx}`, {
        width: 1.1,
        height: 1.3,
        depth: 0.3
      }, this.scene);
      door.position.set(0, 0.65, 2.5 * yl.scale);
      door.material = matWoodDoor;
      door.parent = yurtNode;

      // Tuğ Sancağı (At kılı süslü sancak direği)
      const pole = MeshBuilder.CreateCylinder(`yurt_pole_${idx}`, {
        height: 4.2,
        diameter: 0.08,
        tessellation: 5
      }, this.scene);
      pole.position.set(1.4, 2.1, 2.4 * yl.scale);
      pole.material = matWoodDoor;
      pole.parent = yurtNode;

      const flag = MeshBuilder.CreateBox(`yurt_flag_${idx}`, {
        width: 0.6,
        height: 0.4,
        depth: 0.04
      }, this.scene);
      flag.position.set(1.7, 3.8, 2.4 * yl.scale);
      flag.material = matBanner;
      flag.parent = yurtNode;
    });

    // Oba Kamp Ateşi (Dinlenme & Şifa Yeri: x: 0, z: -2)
    const fireX = 0;
    const fireZ = -2;
    const fireY = this.world.getHeightAt(fireX, fireZ);
    this.campfirePos.set(fireX, fireY, fireZ);

    const fireRing = MeshBuilder.CreateTorus('campfire_ring', {
      diameter: 1.8,
      thickness: 0.35,
      tessellation: 10
    }, this.scene);
    fireRing.position.copyFrom(this.campfirePos);
    fireRing.position.y += 0.15;

    const matStone = new StandardMaterial('mat_fire_stone', this.scene);
    matStone.diffuseColor = new Color3(0.32, 0.3, 0.28);
    matStone.freeze();
    fireRing.material = matStone;

    // Kamp Ateşi Odunları
    const logs = MeshBuilder.CreateCylinder('campfire_logs', {
      height: 1.2,
      diameter: 0.2,
      tessellation: 6
    }, this.scene);
    logs.rotation.x = Math.PI * 0.25;
    logs.position.copyFrom(this.campfirePos);
    logs.position.y += 0.2;
    logs.material = matWoodDoor;

    // Kamp Ateşi Parçacıkları (Köz & Hafif Duman)
    const ps = new ParticleSystem('campfire_flames', 60, this.scene);
    ps.emitter = this.campfirePos.add(new Vector3(0, 0.35, 0));
    ps.minEmitBox = new Vector3(-0.25, 0, -0.25);
    ps.maxEmitBox = new Vector3(0.25, 0.2, 0.25);
    ps.color1 = new Color4(1.0, 0.65, 0.15, 1.0);
    ps.color2 = new Color4(0.9, 0.2, 0.05, 0.8);
    ps.colorDead = new Color4(0.3, 0.1, 0.05, 0.0);
    ps.minSize = 0.25;
    ps.maxSize = 0.55;
    ps.minLifeTime = 0.4;
    ps.maxLifeTime = 0.9;
    ps.emitRate = 22;
    ps.gravity = new Vector3(0, 2.5, 0);
    ps.start();
    this.campfireParticles = ps;
  }

  /**
   * 3. 4 BENGÜ TAŞ (Orhun Abideleri Stili Hızlı Yolculuk & Kayıt Anıtları)
   */
  private buildBenguTaslar(): void {
    const matObelisk = new StandardMaterial('mat_bengu_stone', this.scene);
    matObelisk.diffuseColor = new Color3(0.42, 0.44, 0.46); // Gri granit dikilitaş
    matObelisk.specularColor = new Color3(0.1, 0.1, 0.1);
    matObelisk.freeze();

    const matRuneGlow = new StandardMaterial('mat_bengu_runes', this.scene);
    matRuneGlow.diffuseColor = new Color3(0.2, 0.65, 0.95);
    matRuneGlow.emissiveColor = new Color3(0.15, 0.5, 0.85); // Kutsal Orhun mavisi

    const shrines = [
      { id: 'bengu_yersub', name: 'Yer-Sub Bengü Taşı', biome: 'Yer-Sub Ormanı', x: 0, z: -16 },
      { id: 'bengu_demirdag', name: 'Ergenekon Bengü Taşı', biome: 'Demir Dağ Eteği', x: -85, z: 95 },
      { id: 'bengu_sahmaran', name: 'Şahmaran Bengü Taşı', biome: 'Şahmaran Gölü', x: -95, z: -80 },
      { id: 'bengu_altay', name: 'Gök Zirve Bengü Taşı', biome: 'Gök Zirve Altay', x: 80, z: 90 },
      { id: 'bengu_tonyukuk', name: 'Tonyukuk Bengü Taşı', biome: 'Kuzeybatı Geçidi', x: -140, z: 45 },
      { id: 'bengu_kultigin', name: 'Kül Tigin Bengü Taşı', biome: 'Doğu Bozkırı', x: 65, z: -85 },
      { id: 'bengu_bilgekagan', name: 'Bilge Kağan Bengü Taşı', biome: 'Güneydoğu Kurganı', x: 120, z: 20 },
      { id: 'bengu_otuken', name: 'Ötüken Orman Bengü Taşı', biome: 'Güney Vadi', x: 25, z: -110 }
    ];

    shrines.forEach((s) => {
      const groundY = this.world.getHeightAt(s.x, s.z);
      const pos = new Vector3(s.x, groundY, s.z);

      const obeliskRoot = new TransformNode(`node_${s.id}`, this.scene);
      obeliskRoot.position.copyFrom(pos);

      // Taş Kaide
      const base = MeshBuilder.CreateBox(`base_${s.id}`, { width: 2.4, height: 0.6, depth: 2.4 }, this.scene);
      base.position.y = 0.3;
      base.material = matObelisk;
      base.parent = obeliskRoot;

      // Dörtgen Dikilitaş (Yükseklik 4.2m)
      const pillar = MeshBuilder.CreateBox(`pillar_${s.id}`, { width: 1.1, height: 4.2, depth: 0.9 }, this.scene);
      pillar.position.y = 2.4;
      pillar.material = matObelisk;
      pillar.parent = obeliskRoot;
      if (this.shadowGen) this.shadowGen.addShadowCaster(pillar);

      // Üst Kubbeli Başlık
      const cap = MeshBuilder.CreateCylinder(`cap_${s.id}`, { height: 0.6, diameterTop: 0.1, diameterBottom: 1.3, tessellation: 4 }, this.scene);
      cap.position.y = 4.8;
      cap.rotation.y = Math.PI * 0.25;
      cap.material = matObelisk;
      cap.parent = obeliskRoot;

      // Parıldayan Runik Yazıt Kemeri
      const runePanel = MeshBuilder.CreatePlane(`rune_${s.id}`, { width: 0.75, height: 2.8 }, this.scene);
      runePanel.position.set(0, 2.5, 0.46);
      runePanel.material = matRuneGlow;
      runePanel.parent = obeliskRoot;

      this.benguTaslar.push({
        id: s.id,
        name: s.name,
        biome: s.biome,
        position: pos,
        discovered: s.id === 'bengu_yersub', // İlk taş keşfedilmiş başlar
        mesh: pillar
      });
    });
  }

  /**
   * 4. BALBAL TAŞLARI (Kadim Türk Savaşçı Heykelleri)
   */
  private buildBalbalStones(): void {
    const matBalbal = new StandardMaterial('mat_balbal_stone', this.scene);
    matBalbal.diffuseColor = new Color3(0.5, 0.48, 0.44);
    matBalbal.specularColor = new Color3(0.05, 0.05, 0.05);
    matBalbal.freeze();

    // Patika ve Biyom Sınırlarına Yerleştirilmiş 10 Balbal (Faz 9: 4 Ergenekon Balbalı Dahil)
    const balbalLocs = [
      { x: -5, z: 2, rot: 0.2 },
      { x: 5, z: 3, rot: -0.3 },
      { x: -35, z: 40, rot: 0.8 },
      { x: 38, z: 35, rot: -0.7 },
      { x: -45, z: -35, rot: 2.1 },
      { x: 45, z: 75, rot: 0.5 },
      // Ergenekon & Demir Dağ Balbalları
      { x: 75, z: 8, rot: 1.1 },
      { x: 86, z: 12, rot: -0.5 },
      { x: 130, z: -15, rot: 2.4 },
      { x: 175, z: 45, rot: 0.1 },
      // Faz 10 Şahmaran Gölü Balbalları
      { x: -60, z: 20, rot: 0.5 },   // Su Muhafızı Balbalı
      { x: -80, z: -35, rot: -0.8 }, // Lokman Hekim Balbalı
      { x: -125, z: 45, rot: 1.6 },  // Göl Savaşçısı Balbalı
      { x: -160, z: -80, rot: -2.0 } // Ak Ana Balbalı
    ];

    balbalLocs.forEach((bl, idx) => {
      const groundY = this.world.getHeightAt(bl.x, bl.z);
      const root = new TransformNode(`balbal_node_${idx}`, this.scene);
      root.position.set(bl.x, groundY, bl.z);
      root.rotation.y = bl.rot;

      // Taş Gövde (Düz hatlı savaşçı silüeti)
      const body = MeshBuilder.CreateCylinder(`balbal_body_${idx}`, {
        height: 2.1,
        diameterTop: 0.65,
        diameterBottom: 0.85,
        tessellation: 8
      }, this.scene);
      body.position.y = 1.05;
      body.material = matBalbal;
      body.parent = root;
      if (this.shadowGen) this.shadowGen.addShadowCaster(body);

      // Baş ve Taş Miğfer
      const head = MeshBuilder.CreateSphere(`balbal_head_${idx}`, {
        diameter: 0.65,
        segments: 6
      }, this.scene);
      head.position.y = 2.25;
      head.material = matBalbal;
      head.parent = root;

      // Göğüste Ant Kadehi Tutan Eller (Kabartma blok)
      const cup = MeshBuilder.CreateBox(`balbal_cup_${idx}`, {
        width: 0.35,
        height: 0.35,
        depth: 0.25
      }, this.scene);
      cup.position.set(0, 1.25, 0.4);
      cup.material = matBalbal;
      cup.parent = root;

      this.balbalMeshes.push(body);
    });
  }

  /**
   * 5. KURGAN MEZARLARI (Tümülüs Höyükleri & Taş Girişler)
   */
  private buildKurganTombs(): void {
    const matKurganEarth = new StandardMaterial('mat_kurgan_earth', this.scene);
    matKurganEarth.diffuseColor = new Color3(0.35, 0.45, 0.28);
    matKurganEarth.freeze();

    const matStonePortal = new StandardMaterial('mat_kurgan_portal', this.scene);
    matStonePortal.diffuseColor = new Color3(0.38, 0.35, 0.32);
    matStonePortal.freeze();

    const kurganLocs = [
      { x: -55, z: 20, r: 12 },
      { x: 60, z: -40, r: 14 },
      { x: 25, z: 120, r: 15 }
    ];

    kurganLocs.forEach((k, idx) => {
      const groundY = this.world.getHeightAt(k.x, k.z);
      const root = new TransformNode(`kurgan_root_${idx}`, this.scene);
      root.position.set(k.x, groundY, k.z);

      // Kubbeli Toprak Höyük
      const mound = MeshBuilder.CreateSphere(`kurgan_mound_${idx}`, {
        diameterX: k.r * 2,
        diameterY: 6.5,
        diameterZ: k.r * 2,
        segments: 10
      }, this.scene);
      mound.position.y = 1.2;
      mound.material = matKurganEarth;
      mound.parent = root;

      // Taş Mezar Kapısı (Megalit Portal)
      const leftPillar = MeshBuilder.CreateBox(`portal_l_${idx}`, { width: 0.7, height: 3.2, depth: 0.8 }, this.scene);
      leftPillar.position.set(-1.1, 1.6, k.r * 0.85);
      leftPillar.material = matStonePortal;
      leftPillar.parent = root;

      const rightPillar = MeshBuilder.CreateBox(`portal_r_${idx}`, { width: 0.7, height: 3.2, depth: 0.8 }, this.scene);
      rightPillar.position.set(1.1, 1.6, k.r * 0.85);
      rightPillar.material = matStonePortal;
      rightPillar.parent = root;

      const lintel = MeshBuilder.CreateBox(`portal_lintel_${idx}`, { width: 3.2, height: 0.7, depth: 0.9 }, this.scene);
      lintel.position.set(0, 3.4, k.r * 0.85);
      lintel.material = matStonePortal;
      lintel.parent = root;

      this.kurganRoots.push(root);
    });
  }

  /**
   * 6. 12 KAM TAŞI MABEDİ (Kutsal Taş Çemberi)
   * Yer-Sub ile Şahmaran arasındaki vadide (x: -45, z: -15).
   */
  private build12KamShrine(): void {
    const matShrineStone = new StandardMaterial('mat_shrine_stone', this.scene);
    matShrineStone.diffuseColor = new Color3(0.45, 0.48, 0.52);
    matShrineStone.freeze();

    const centerX = -45;
    const centerZ = -15;
    const centerY = this.world.getHeightAt(centerX, centerZ);
    const shrineRadius = 9.0;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * shrineRadius;
      const z = centerZ + Math.sin(angle) * shrineRadius;
      const y = this.world.getHeightAt(x, z);

      const monolith = MeshBuilder.CreateBox(`kam_monolith_${i}`, {
        width: 1.2,
        height: 3.8 + (i % 3) * 0.4,
        depth: 0.7
      }, this.scene);
      monolith.position.set(x, y + 1.8, z);
      monolith.rotation.y = angle + Math.PI * 0.5;
      monolith.material = matShrineStone;
      if (this.shadowGen) this.shadowGen.addShadowCaster(monolith);
    }
  }

  /**
   * Oyuncunun yakındaki anıtları ve Bengü Taşları keşfetmesini denetler (Sıcak döngüde sıfır GC)
   */
  public update(playerPos: Vector3): void {
    for (const b of this.benguTaslar) {
      this.scratchDistVec.x = b.position.x - playerPos.x;
      this.scratchDistVec.z = b.position.z - playerPos.z;
      const distSq = this.scratchDistVec.x * this.scratchDistVec.x + this.scratchDistVec.z * this.scratchDistVec.z;

      // 6 metrelik keşif yarıçapı (distSq < 36)
      if (!b.discovered && distSq < 36) {
        b.discovered = true;
        ProceduralAudio.playBenguResonance();

        const hudCenter = document.getElementById('statusMessage');
        if (hudCenter) {
          hudCenter.innerText = `✨ ${b.name.toUpperCase()} KEŞFEDİLDİ!`;
          hudCenter.style.color = '#38bdf8';
        }

        EventBus.emit('world:landmark_discovered', { id: b.id, name: b.name });
        EventBus.emit('save:request', { benguId: b.id });

        EventBus.emit('ui:dialogue_show', {
          speaker: 'Börü',
          text: `Kadim ${b.name} uyandı! Runik ışıklar parıldıyor. Kayıt noktası güncellendi ve Hızlı Yolculuk açıldı.`
        });
      }
    }
  }

  public dispose(): void {
    this.bayTerekRoot.dispose();
    this.obaRoot.dispose();
    if (this.campfireParticles) {
      this.campfireParticles.dispose();
    }
  }
}
