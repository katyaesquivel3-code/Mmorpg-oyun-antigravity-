import {
  Scene,
  StandardMaterial,
  Color3,
  Vector3
} from '@babylonjs/core';
import { WorldNoise, BiomeData } from './WorldNoise';
import { Chunk, ChunkLOD } from './Chunk';
import { FoliageManager } from './FoliageManager';

export class WorldManager {
  private scene: Scene;
  public noise: WorldNoise;
  public foliage: FoliageManager;

  // Active Chunks by key 'cx_cz'
  private chunks: Map<string, Chunk> = new Map();

  // Shared Terrain Material across all chunks
  private sharedTerrainMaterial: StandardMaterial;

  // Player Chunk Coordinates
  public currentChunkX = 0;
  public currentChunkZ = 0;

  // Chunk Generation Queue (spawns 1 chunk per frame to avoid lag spikes)
  private creationQueue: { cx: number; cz: number; lod: ChunkLOD }[] = [];

  constructor(scene: Scene, foliageManager: FoliageManager) {
    this.scene = scene;
    this.noise = new WorldNoise(4815);
    this.foliage = foliageManager;

    // Create shared PBR/Toon StandardMaterial with vertex color support
    this.sharedTerrainMaterial = new StandardMaterial('mat_shared_otuken_terrain', scene);
    this.sharedTerrainMaterial.diffuseColor = new Color3(1.0, 1.0, 1.0);
    this.sharedTerrainMaterial.specularColor = new Color3(0.06, 0.06, 0.04);
    this.sharedTerrainMaterial.ambientColor = new Color3(0.38, 0.42, 0.35);
    this.sharedTerrainMaterial.roughness = 0.92;
  }

  /**
   * Updates streaming chunks centered around the player's world position.
   */
  public update(playerPos: Vector3): void {
    const pCx = Math.floor(playerPos.x / Chunk.CHUNK_SIZE);
    const pCz = Math.floor(playerPos.z / Chunk.CHUNK_SIZE);

    if (pCx !== this.currentChunkX || pCz !== this.currentChunkZ || this.chunks.size === 0) {
      this.currentChunkX = pCx;
      this.currentChunkZ = pCz;
      this.refreshStreamingGrid(pCx, pCz);
    }

    // Process at most 1 chunk per frame from the creation queue to guarantee steady 60 FPS
    this.processQueue();
  }

  private refreshStreamingGrid(centerCx: number, centerCz: number): void {
    const desiredKeys = new Set<string>();

    // 5x5 Chunk Window (25 chunks total covering ~200m draw distance)
    const radius = 2; // -2 to +2

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;

        // Check world bounds (-4 to +3 in 64m chunks = -256m to +256m world)
        if (cx < -4 || cx > 3 || cz < -4 || cz > 3) continue;

        const key = `${cx}_${cz}`;
        desiredKeys.add(key);

        const dist = Math.max(Math.abs(dx), Math.abs(dz));
        const lod: ChunkLOD = dist <= 1 ? 0 : 1;

        const existing = this.chunks.get(key);
        if (!existing) {
          // If not already queued or existing, add to priority queue
          if (!this.creationQueue.some(item => item.cx === cx && item.cz === cz)) {
            this.creationQueue.push({ cx, cz, lod });
          }
        }
      }
    }

    // Unload chunks that fell outside the 5x5 window
    for (const [key, chunk] of this.chunks.entries()) {
      if (!desiredKeys.has(key)) {
        this.foliage.depopulateChunk(key);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }

    // Sort queue by proximity to player (closest chunk generates first)
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

      // Populate foliage thin instances for this chunk
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
}
