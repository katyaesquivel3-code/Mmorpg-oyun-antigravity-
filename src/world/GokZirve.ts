/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kuzey Altay Karlı Dağları: GÖK ZİRVE (GokZirve)
 * (Dondurucu Kar Fırtınası & Tipi, Çığ Olayı [Telegraph & Mağara Sığınağı],
 *  Buz Köprüleri, Buz Tırmanışı Kaygan Duvarları, Isınma Kamp Ateşleri,
 *  Dokuz Kat Yeraltı Tamu Kapısı & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  ParticleSystem,
  Texture,
  TransformNode,
  ShadowGenerator,
  Scalar
} from '@babylonjs/core';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface ShelterCave {
  id: string;
  center: Vector3;
  radius: number;
}

export interface IceBridge {
  mesh: Mesh;
  startPos: Vector3;
  endPos: Vector3;
}

export class GokZirve {
  public scene: Scene;
  public root: TransformNode;

  // Biyom Merkez Koordinatları
  public readonly CENTER_X = 110.0;
  public readonly CENTER_Z = 120.0;

  // Çığ Sistemi (Avalanche Event)
  public isAvalancheWarning = false;
  public isAvalancheActive = false;
  private avalancheTimer = 0.0;
  private readonly AVALANCHE_INTERVAL = 38.0; // Her 38 saniyede bir çığ tetiklenir
  private telegraphTimer = 0.0;
  public avalancheWaveMesh: Mesh;
  public telegraphMesh: Mesh;
  public shelterCaves: ShelterCave[] = [];

  // Buz Köprüleri & Tırmanış Duvarları
  public iceBridges: IceBridge[] = [];
  public iceClimbingWalls: Mesh[] = [];

  // Kamp Ateşleri & Meşaleler
  public campfires: Mesh[] = [];

  // Dokuz Kat Yeraltı Giriş Kapısı
  public yeraltiEntranceMesh: Mesh;

  // Kar Fırtınası Parçacık Sistemi
  private blizzardParticles: ParticleSystem | null = null;

  // Materyaller
  private matSnowRock: StandardMaterial;
  private matIceCrystal: StandardMaterial;
  private matTelegraph: StandardMaterial;
  private matYeraltiObsidian: StandardMaterial;

  // Scratch Vektörleri (Sıcak döngüde sıfır GC)
  private scratchPlayerPos = new Vector3(0, 0, 0);
  private scratchDist = new Vector3(0, 0, 0);

  constructor(scene: Scene, world?: any, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.root = new TransformNode('gok_zirve_root', scene);
    this.root.position.set(this.CENTER_X, 22.0, this.CENTER_Z);

    // ================= MATERYALLER =================
    this.matSnowRock = new StandardMaterial('mat_gok_snow_rock', scene);
    this.matSnowRock.diffuseColor = new Color3(0.85, 0.92, 0.98); // Kar örtülü granit
    this.matSnowRock.specularColor = new Color3(0.3, 0.4, 0.5);
    this.matSnowRock.freeze();

    this.matIceCrystal = new StandardMaterial('mat_gok_ice_crystal', scene);
    this.matIceCrystal.diffuseColor = new Color3(0.55, 0.85, 0.98);
    this.matIceCrystal.specularColor = new Color3(0.9, 0.95, 1.0);
    this.matIceCrystal.emissiveColor = new Color3(0.1, 0.25, 0.4);
    this.matIceCrystal.alpha = 0.78;

    this.matTelegraph = new StandardMaterial('mat_avalanche_telegraph', scene);
    this.matTelegraph.diffuseColor = new Color3(0.2, 0.6, 0.9);
    this.matTelegraph.emissiveColor = new Color3(0.3, 0.7, 1.0);
    this.matTelegraph.alpha = 0.45;

    this.matYeraltiObsidian = new StandardMaterial('mat_yeralti_obsidian', scene);
    this.matYeraltiObsidian.diffuseColor = new Color3(0.05, 0.05, 0.08);
    this.matYeraltiObsidian.emissiveColor = new Color3(0.15, 0.02, 0.02);
    this.matYeraltiObsidian.freeze();

    // ================= 1. BUZ KÖPRÜLERİ & UÇURUMLAR =================
    this.buildIceBridges(scene, shadowGen);

    // ================= 2. ÇIĞ VE SIĞINAK MAĞARALARI =================
    this.buildShelterCaves(scene, shadowGen);

    // Çığ Dalgası 3D Meshi
    this.avalancheWaveMesh = MeshBuilder.CreateCylinder('avalanche_wave', {
      diameterTop: 24.0,
      diameterBottom: 28.0,
      height: 4.5,
      tessellation: 12
    }, scene);
    this.avalancheWaveMesh.position.set(0, -999, 0);
    this.avalancheWaveMesh.material = this.matSnowRock;
    this.avalancheWaveMesh.isPickable = false;

    // 0.5s Çığ Telegraph Uyarısı (Zemin Koridoru)
    this.telegraphMesh = MeshBuilder.CreateBox('avalanche_telegraph', {
      width: 22.0,
      height: 0.25,
      depth: 60.0
    }, scene);
    this.telegraphMesh.position.set(0, -999, 0);
    this.telegraphMesh.material = this.matTelegraph;
    this.telegraphMesh.setEnabled(false);

    // ================= 3. ISINMA KAMP ATEŞLERİ & MEŞALELER =================
    this.buildWarmthSources(scene, shadowGen);

    // ================= 4. DOKUZ KAT YERALTI (TAMU) PORTALI =================
    this.yeraltiEntranceMesh = MeshBuilder.CreateTorus('yeralti_portal', {
      diameter: 8.5,
      thickness: 1.8,
      tessellation: 12
    }, scene);
    this.yeraltiEntranceMesh.position.set(45, 6.0, 45); // Zirvenin en kuzey mağara ağzı
    this.yeraltiEntranceMesh.rotation.x = Math.PI * 0.5;
    this.yeraltiEntranceMesh.material = this.matYeraltiObsidian;
    this.yeraltiEntranceMesh.parent = this.root;

    // ================= 5. TİPİ & KAR FIRTINASI PARÇACIKLARI =================
    this.initBlizzardParticles(scene);
  }

  private buildIceBridges(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const bridgeConfigs = [
      { start: new Vector3(-25, 2, -20), end: new Vector3(5, 5, 0), rotY: 0.5 },
      { start: new Vector3(10, 6, 15), end: new Vector3(35, 9, 35), rotY: -0.3 }
    ];

    bridgeConfigs.forEach((b, idx) => {
      const bridge = MeshBuilder.CreateBox(`ice_bridge_${idx}`, { width: 3.8, height: 0.6, depth: 26.0 }, scene);
      bridge.position.copyFrom(b.start).addInPlace(b.end).scaleInPlace(0.5);
      bridge.rotation.y = b.rotY;
      bridge.material = this.matIceCrystal;
      bridge.parent = this.root;
      if (shadowGen) shadowGen.addShadowCaster(bridge);

      this.iceBridges.push({
        mesh: bridge,
        startPos: b.start,
        endPos: b.end
      });
    });

    // Buz Tırmanış Duvarı
    const wall = MeshBuilder.CreateBox('ice_climbing_wall', { width: 14.0, height: 16.0, depth: 2.5 }, scene);
    wall.position.set(-15, 6.0, 20);
    wall.material = this.matIceCrystal;
    wall.parent = this.root;
    this.iceClimbingWalls.push(wall);
    if (shadowGen) shadowGen.addShadowCaster(wall);
  }

  private buildShelterCaves(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const caveCoords = [
      { id: 'cave_lower', pos: new Vector3(-12, 1.5, -5), radius: 6.5 },
      { id: 'cave_upper', pos: new Vector3(20, 7.5, 25), radius: 7.0 }
    ];

    caveCoords.forEach((c) => {
      // 3D Korunaklı Mağara Kemeri
      const arch = MeshBuilder.CreateTorus(`cave_arch_${c.id}`, { diameter: 7.0, thickness: 2.2, tessellation: 8 }, scene);
      arch.position.copyFrom(c.pos);
      arch.rotation.x = Math.PI * 0.5;
      arch.material = this.matSnowRock;
      arch.parent = this.root;
      if (shadowGen) shadowGen.addShadowCaster(arch);

      this.shelterCaves.push({
        id: c.id,
        center: this.root.position.add(c.pos),
        radius: c.radius
      });
    });
  }

  private buildWarmthSources(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const fireLocs = [
      new Vector3(-10, 0.5, -5), // Alt sığınak içi kamp ateşi
      new Vector3(22, 6.5, 25)   // Üst sığınak içi meşale
    ];

    const matWood = new StandardMaterial('mat_fire_wood', scene);
    matWood.diffuseColor = new Color3(0.2, 0.12, 0.08);
    matWood.freeze();

    fireLocs.forEach((pos, idx) => {
      const campfire = MeshBuilder.CreateCylinder(`campfire_mesh_${idx}`, { diameter: 1.6, height: 0.4 }, scene);
      campfire.position.copyFrom(pos);
      campfire.material = matWood;
      campfire.parent = this.root;
      this.campfires.push(campfire);
    });
  }

  private initBlizzardParticles(scene: Scene): void {
    const ps = new ParticleSystem('gok_blizzard_particles', 120, scene);
    ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==', scene);
    ps.emitter = this.root.position.clone().add(new Vector3(0, 15, 0));
    ps.minEmitBox = new Vector3(-60, 0, -60);
    ps.maxEmitBox = new Vector3(60, 5, 60);
    ps.color1 = new Color3(0.9, 0.95, 1.0).toColor4(0.85);
    ps.color2 = new Color3(0.7, 0.85, 0.95).toColor4(0.4);
    ps.minSize = 0.15;
    ps.maxSize = 0.45;
    ps.minLifeTime = 1.2;
    ps.maxLifeTime = 2.4;
    ps.emitRate = 35;
    ps.direction1 = new Vector3(-1.0, -0.6, -0.8);
    ps.direction2 = new Vector3(-0.7, -0.9, -0.5);
    ps.minEmitPower = 8.0;
    ps.maxEmitPower = 14.0;
    ps.start();
    this.blizzardParticles = ps;
  }

  /**
   * Oyuncu Bir Sığınak Mağarasının İçinde mi?
   */
  public isPlayerInShelter(playerPos: Vector3): boolean {
    for (let i = 0; i < this.shelterCaves.length; i++) {
      const cave = this.shelterCaves[i];
      const dist2D = Math.hypot(playerPos.x - cave.center.x, playerPos.z - cave.center.z);
      if (dist2D < cave.radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Her Kare Gök Zirve Çığ Döngüsü, Tipi ve Fizik Güncellemesi (Sıfır GC)
   */
  public update(deltaTime: number, player: PlayerController, combat: CombatSystem): void {
    this.scratchPlayerPos.copyFrom(player.position);

    // Oyuncu Gök Zirve Bölgesinde mi?
    const distToSummit = Math.hypot(
      this.scratchPlayerPos.x - this.CENTER_X,
      this.scratchPlayerPos.z - this.CENTER_Z
    );

    if (distToSummit > 120.0) {
      if (this.telegraphMesh.isEnabled()) this.telegraphMesh.setEnabled(false);
      this.avalancheWaveMesh.position.y = -999;
      return;
    }

    // Kar Fırtınası Rüzgâr İtmesi (Batıya ve güneye doğru rüzgâr direnci)
    if (!this.isPlayerInShelter(this.scratchPlayerPos) && player.locomotionState !== 'CLIMB') {
      const windPushX = -1.8 * deltaTime;
      const windPushZ = -1.2 * deltaTime;
      player.position.x += windPushX;
      player.position.z += windPushZ;
    }

    // Çığ Zamanlayıcısı
    this.avalancheTimer += deltaTime;

    // 1. Çığ Uyarısı Başlat (0.50 sn Telegraph kuralı)
    if (this.avalancheTimer >= this.AVALANCHE_INTERVAL - 0.50 && !this.isAvalancheWarning && !this.isAvalancheActive) {
      this.isAvalancheWarning = true;
      this.telegraphTimer = 0.50;

      // Telegraph koridorunu dağın yamacına yerleştir
      this.telegraphMesh.position.set(this.CENTER_X, 22.2, this.CENTER_Z);
      this.telegraphMesh.setEnabled(true);

      ProceduralAudio.playButtonClick();
      EventBus.emit('ui:loot_toast', {
        text: '⚠️ ÇIĞ GELİYOR! HEMEN YAKINDAKİ SIĞINAK MAĞARASINA KAÇ!'
      });
    }

    // 2. Telegraph Sayımı
    if (this.isAvalancheWarning) {
      this.telegraphTimer -= deltaTime;
      const pulse = 1.0 + Math.sin(this.telegraphTimer * 25.0) * 0.15;
      this.telegraphMesh.scaling.set(pulse, 1.0, 1.0);

      if (this.telegraphTimer <= 0) {
        this.isAvalancheWarning = false;
        this.telegraphMesh.setEnabled(false);
        this.triggerAvalancheWave();
      }
    }

    // 3. Aktif Çığ Kar Dalgası Akışı
    if (this.isAvalancheActive) {
      this.avalancheWaveMesh.position.z -= 28.0 * deltaTime; // Hızla yamaçtan aşağı akar
      this.avalancheWaveMesh.position.x -= 8.0 * deltaTime;
      this.avalancheWaveMesh.rotation.x += deltaTime * 4.0;

      // Oyuncuya Çarpma Kontrolü
      const distToWave = Vector3.Distance(this.scratchPlayerPos, this.avalancheWaveMesh.position);
      if (distToWave < 12.0) {
        if (!this.isPlayerInShelter(this.scratchPlayerPos)) {
          // Mağarada değil: Ezici darbe hasarı ve dağın eteğine yuvarlama
          combat.health = Math.max(0, combat.health - 32.0);
          combat.addCameraTrauma(0.85);
          player.position.x -= 16.0;
          player.position.z -= 18.0;
          player.position.y = Math.max(12.0, player.position.y - 6.0);
          ProceduralAudio.playImpact(true);
          EventBus.emit('ui:loot_toast', { text: '💥 Çığa yakalandın! Kar yığını seni aşağı yuvarladı.' });
        }
      }

      // Çığ dağın eteğine ulaştığında sonlanır
      if (this.avalancheWaveMesh.position.z < this.CENTER_Z - 50.0) {
        this.isAvalancheActive = false;
        this.avalancheWaveMesh.position.y = -999;
        this.avalancheTimer = 0.0;
      }
    }
  }

  private triggerAvalancheWave(): void {
    this.isAvalancheActive = true;
    this.avalancheWaveMesh.position.set(this.CENTER_X + 10, 32.0, this.CENTER_Z + 40);
    ProceduralAudio.playAvalancheRumble();
  }

  /**
   * Dokuz Kat Yeraltı Giriş Etkileşimi
   */
  public checkInteract(playerPos: Vector3): boolean {
    const portalWorld = this.yeraltiEntranceMesh.getAbsolutePosition();
    if (Vector3.Distance(playerPos, portalWorld) < 4.5) {
      EventBus.emit('ui:loot_toast', { text: '🌀 Dokuz Kat Yeraltı (Tamu) Kapısı açılıyor...' });
      EventBus.emit('world:yeralti_entered');
      return true;
    }
    return false;
  }

  public dispose(): void {
    this.root.dispose();
    this.avalancheWaveMesh.dispose();
    this.telegraphMesh.dispose();
    if (this.blizzardParticles) this.blizzardParticles.dispose();
  }
}
