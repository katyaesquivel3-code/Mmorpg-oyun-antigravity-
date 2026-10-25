/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Açık Dünya Yöneticisi & Chunk Streaming Sistemi (WorldManager)
 * (1024x1024m Dünya, 5x5 Yakın Pencere + Uzak LOD3 Halkaları, MaterialPluginBase, Yaban Hayatı, Işık Havuzu & Sıfır GC)
 */

import {
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  ShadowGenerator
} from '@babylonjs/core';
import { WorldNoise, BiomeData } from './WorldNoise';
import { Chunk, ChunkLOD } from './Chunk';
import { FoliageManager } from './FoliageManager';
import { LandmarkManager, BenguTasData } from './LandmarkManager';
import { TerrainMaterialPlugin } from './TerrainMaterialPlugin';
import { WindField } from './WindField';
import { LightPool } from './LightPool';
import { WildlifeManager } from './WildlifeManager';

export class WorldManager {
  private scene: Scene;
  public noise: WorldNoise;
  public foliage: FoliageManager;
  public landmarks: LandmarkManager;
  public wildlife: WildlifeManager;
  public lightPool: LightPool;
  public windField: WindField;

  // Paylaşılan Arazi Materyali & MaterialPluginBase Eklentisi
  public sharedTerrainMaterial: StandardMaterial;
  public terrainPlugin: TerrainMaterialPlugin;

  // Aktif Chunk haritası 'cx_cz'
  private chunks: Map<string, Chunk> = new Map();

  // Oyuncu Chunk Koordinatları
  public currentChunkX = 0;
  public currentChunkZ = 0;

  // Bütçeli Chunk Üretim Kuyruğu (Kare başına en fazla 1 chunk, takılma yok)
  private creationQueue: { cx: number; cz: number; lod: ChunkLOD }[] = [];

  constructor(scene: Scene, foliageManager: FoliageManager, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.noise = new WorldNoise(4815);
    this.foliage = foliageManager;
    this.windField = WindField.getInstance();

    // 1. Vertex Color destekli PBR/Standart Arazi Materyali
    this.sharedTerrainMaterial = new StandardMaterial('mat_shared_otuken_terrain', scene);
    this.sharedTerrainMaterial.diffuseColor = new Color3(1.0, 1.0, 1.0);
    this.sharedTerrainMaterial.specularColor = new Color3(0.06, 0.06, 0.04);
    this.sharedTerrainMaterial.ambientColor = new Color3(0.38, 0.42, 0.35);
    this.sharedTerrainMaterial.roughness = 0.92;

    // 2. MaterialPluginBase Arazi Eklentisi (Eğim, GPU Gürültü, Kıyı Islaklığı, Bulut Gölgeleri)
    this.terrainPlugin = new TerrainMaterialPlugin(this.sharedTerrainMaterial);

    // 3. Kutsal Anıtlar (Bay Terek, Obası, 4 Bengü Taş, Balballar, Kurganlar)
    this.landmarks = new LandmarkManager(scene, this, shadowGen);

    // 4. Dinamik Gece Işık Havuzu (En Fazla 4 Dinamik PointLight)
    this.lightPool = new LightPool(scene);
    this.registerWorldLights();

    // 5. Yaban Hayatı (Maral, Tavşan, Kartal, At, Kurt Sürüleri)
    this.wildlife = new WildlifeManager(scene, this, shadowGen);
  }

  private registerWorldLights(): void {
    // Oba Kamp Ateşi
    this.lightPool.registerAnchor('fire_oba', new Vector3(0, this.getHeightAt(0, -2) + 0.6, -2), new Color3(1.0, 0.62, 0.22), 1.6, 16);
    // Yurt Meşaleleri
    this.lightPool.registerAnchor('torch_yurt_0', new Vector3(-13, this.getHeightAt(-13, 7) + 1.2, 7), new Color3(1.0, 0.58, 0.18), 1.1, 11);
    this.lightPool.registerAnchor('torch_yurt_1', new Vector3(14, this.getHeightAt(14, 9) + 1.2, 9), new Color3(1.0, 0.58, 0.18), 1.1, 11);
    // 4 Bengü Taş Kutsal Mavi Runik Işıkları
    this.landmarks.benguTaslar.forEach(b => {
      this.lightPool.registerAnchor(`bengu_light_${b.id}`, new Vector3(b.position.x, b.position.y + 2.5, b.position.z), new Color3(0.25, 0.65, 0.95), 1.4, 14);
    });
  }

  /**
   * Oyuncu hareketine göre 1024m dünya akışını, yaban hayatını ve ışık havuzunu günceller.
   */
  public update(playerPos: Vector3, isNight: boolean, deltaTime: number): void {
    const pCx = Math.floor(playerPos.x / Chunk.CHUNK_SIZE);
    const pCz = Math.floor(playerPos.z / Chunk.CHUNK_SIZE);

    if (pCx !== this.currentChunkX || pCz !== this.currentChunkZ || this.chunks.size === 0) {
      this.currentChunkX = pCx;
      this.currentChunkZ = pCz;
      this.refreshStreamingGrid(pCx, pCz);
    }

    // Kare başına en fazla 1 chunk oluşturarak sabit 60 FPS garantisi (Bütçeli üretim)
    this.processQueue();

    // Bitki örtüsü rüzgâr & oyuncu eğilme shader güncellemesi
    this.foliage.update(playerPos, deltaTime);

    // Kutsal anıtlar ve Bengü Taş keşif denetimi
    this.landmarks.update(playerPos);

    // Dinamik Gece Işık Havuzu (En yakın 4 ışık)
    this.lightPool.update(playerPos, isNight, performance.now() * 0.001);

    // Yaban Hayatı sürü ve kaçış yapay zekası
    this.wildlife.update(playerPos, deltaTime);
  }

  private refreshStreamingGrid(centerCx: number, centerCz: number): void {
    const desiredKeys = new Set<string>();

    // 1024x1024m Dünya Akışı:
    // Yakın 5x5 pencere (radius 2): LOD 0 & 1
    // Uzak halkalar (radius 3 ve 4): LOD 2 ve LOD 3 (sisle gizli)
    const maxRadius = 4; // Toplam 9x9 ızgara (576m çap)

    for (let dz = -maxRadius; dz <= maxRadius; dz++) {
      for (let dx = -maxRadius; dx <= maxRadius; dx++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;

        // 1024m dünya sınırları (-8 ile +7 chunk = -512m ile +512m)
        if (cx < -8 || cx > 7 || cz < -8 || cz > 7) continue;

        const key = `${cx}_${cz}`;
        desiredKeys.add(key);

        const dist = Math.max(Math.abs(dx), Math.abs(dz));
        const lod: ChunkLOD = dist <= 1 ? 0 : dist === 2 ? 1 : dist === 3 ? 2 : 3;

        const existing = this.chunks.get(key);
        if (!existing) {
          if (!this.creationQueue.some(item => item.cx === cx && item.cz === cz)) {
            this.creationQueue.push({ cx, cz, lod });
          }
        }
      }
    }

    // Görüş alanından çıkan chunk'ları bellekten temizle
    for (const [key, chunk] of this.chunks.entries()) {
      if (!desiredKeys.has(key)) {
        this.foliage.depopulateChunk(key);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }

    // Oyuncuya en yakın chunk'ları önce üret
    this.creationQueue.sort((a, b) => {
      const distA = Math.hypot(a.cx - centerCx, a.cz - centerCz);
      const distB = Math.hypot(b.cx - centerCx, b.cz - centerCz);
      return distA - distB;
    });
  }

  private processQueue(): void {
    if (this.creationQueue.length === 0) return;

    const next = this.creationQueue.shift()!;
    const key = `${next.cx}_${next.cz}`;

    if (!this.chunks.has(key)) {
      const chunk = new Chunk(
        next.cx,
        next.cz,
        next.lod,
        this.scene,
        this.noise,
        this.sharedTerrainMaterial
      );
      this.chunks.set(key, chunk);

      // Bitki örtüsü Thin Instance'larını üret
      this.foliage.populateChunk(chunk);
    }
  }

  public getHeightAt(x: number, z: number): number {
    return this.noise.getHeight(x, z);
  }

  public getBiomeAt(x: number, z: number, height?: number): BiomeData {
    return this.noise.getBiome(x, z, height);
  }

  public getNormalAt(x: number, z: number): [number, number, number] {
    return this.noise.getNormal(x, z);
  }

  public getActiveChunkCount(): number {
    return this.chunks.size;
  }

  public getBenguTasFastTravelPos(benguId: string): Vector3 | null {
    const tas = this.landmarks.benguTaslar.find(b => b.id === benguId);
    if (tas && tas.discovered) {
      return new Vector3(tas.position.x, tas.position.y, tas.position.z + 2.5);
    }
    return null;
  }

  public dispose(): void {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    this.landmarks.dispose();
    this.wildlife.dispose();
    this.lightPool.dispose();
    this.sharedTerrainMaterial.dispose();
  }
}
