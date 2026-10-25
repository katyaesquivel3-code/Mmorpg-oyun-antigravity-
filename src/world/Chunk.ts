/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Arazi Parçası (Terrain Chunk) & Çok Kademeli LOD Sistemi
 * (64x64m Boyut, 4 Kademeli LOD + Etek / Skirt, Dikişsiz Geçiş & Sıfır GC)
 */

import {
  Mesh,
  Scene,
  VertexData,
  StandardMaterial,
  Color3
} from '@babylonjs/core';
import { WorldNoise, BiomeData } from './WorldNoise';

export type ChunkLOD = 0 | 1 | 2 | 3;

export class Chunk {
  public key: string;
  public cx: number;
  public cz: number;
  public worldCenterX: number;
  public worldCenterZ: number;
  public lod: ChunkLOD;
  public mesh: Mesh | null = null;
  public biome: BiomeData;
  public isDisposed = false;

  private scene: Scene;
  private noise: WorldNoise;
  private material: StandardMaterial;

  public static readonly CHUNK_SIZE = 64; // 64x64 metre

  constructor(
    cx: number,
    cz: number,
    lod: ChunkLOD,
    scene: Scene,
    noise: WorldNoise,
    sharedMaterial: StandardMaterial
  ) {
    this.cx = cx;
    this.cz = cz;
    this.lod = lod;
    this.key = `${cx}_${cz}`;
    this.scene = scene;
    this.noise = noise;
    this.material = sharedMaterial;

    this.worldCenterX = cx * Chunk.CHUNK_SIZE + Chunk.CHUNK_SIZE / 2;
    this.worldCenterZ = cz * Chunk.CHUNK_SIZE + Chunk.CHUNK_SIZE / 2;
    this.biome = this.noise.getBiome(this.worldCenterX, this.worldCenterZ);

    this.buildMesh();
  }

  private buildMesh(): void {
    // LOD 0 = 24 alt bölüm, LOD 1 = 14, LOD 2 = 8, LOD 3 = 4 alt bölüm
    const sub = this.lod === 0 ? 24 : this.lod === 1 ? 14 : this.lod === 2 ? 8 : 4;
    const size = Chunk.CHUNK_SIZE;
    const startX = this.cx * size;
    const startZ = this.cz * size;
    const step = size / sub;

    const gridVerts = (sub + 1) * (sub + 1);
    const skirtVerts = 4 * (sub + 1);
    const totalVerts = gridVerts + skirtVerts;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const colors = new Float32Array(totalVerts * 4);
    const indices: number[] = [];

    let vIdx = 0;
    let uvIdx = 0;
    let cIdx = 0;

    // 1. Ana Yüzey Izgarası Üretimi
    for (let z = 0; z <= sub; z++) {
      for (let x = 0; x <= sub; x++) {
        const wx = startX + x * step;
        const wz = startZ + z * step;
        const wy = this.noise.getHeight(wx, wz);
        const normal = this.noise.getNormal(wx, wz);
        const biome = this.noise.getBiome(wx, wz, wy);

        positions[vIdx] = wx;
        positions[vIdx + 1] = wy;
        positions[vIdx + 2] = wz;
        vIdx += 3;

        uvs[uvIdx] = x / sub;
        uvs[uvIdx + 1] = z / sub;
        uvIdx += 2;

        // Eğim Faktörü: 1.0 - NormalY
        const slope = Math.max(0, Math.min(1.0, 1.0 - normal[1]));
        const rockFactor = Math.pow(slope, 1.4);

        const r = biome.grassColor[0] * (1.0 - rockFactor) + biome.rockColor[0] * rockFactor;
        const g = biome.grassColor[1] * (1.0 - rockFactor) + biome.rockColor[1] * rockFactor;
        const b = biome.grassColor[2] * (1.0 - rockFactor) + biome.rockColor[2] * rockFactor;

        // Vadi Gölgelendirmesi (Doğal Ortam Kapanması - AO)
        const ao = Math.min(1.0, Math.max(0.68, (wy + 4.0) / 16.0));

        colors[cIdx] = r * ao;
        colors[cIdx + 1] = g * ao;
        colors[cIdx + 2] = b * ao;
        colors[cIdx + 3] = 1.0;
        cIdx += 4;
      }
    }

    // Ana Izgara İndeksleri
    for (let z = 0; z < sub; z++) {
      for (let x = 0; x < sub; x++) {
        const row1 = z * (sub + 1) + x;
        const row2 = (z + 1) * (sub + 1) + x;

        indices.push(row1, row2, row1 + 1);
        indices.push(row1 + 1, row2, row2 + 1);
      }
    }

    // 2. Etek (Skirt) Üretimi — Farklı LOD seviyeleri arasındaki boşlukları ve dikişleri kapatır
    const skirtDrop = 3.0;
    const skirtBaseIndex = gridVerts;
    let sIdx = 0;

    // Güney Kenar (z = 0)
    for (let x = 0; x <= sub; x++) {
      const topIdx = x;
      positions[vIdx] = positions[topIdx * 3];
      positions[vIdx + 1] = positions[topIdx * 3 + 1] - skirtDrop;
      positions[vIdx + 2] = positions[topIdx * 3 + 2];
      vIdx += 3;

      uvs[uvIdx] = uvs[topIdx * 2];
      uvs[uvIdx + 1] = uvs[topIdx * 2 + 1];
      uvIdx += 2;

      colors[cIdx] = colors[topIdx * 4] * 0.7;
      colors[cIdx + 1] = colors[topIdx * 4 + 1] * 0.7;
      colors[cIdx + 2] = colors[topIdx * 4 + 2] * 0.7;
      colors[cIdx + 3] = 1.0;
      cIdx += 4;

      if (x < sub) {
        const currTop = topIdx;
        const nextTop = topIdx + 1;
        const currBot = skirtBaseIndex + sIdx;
        const nextBot = skirtBaseIndex + sIdx + 1;
        indices.push(currTop, currBot, nextTop);
        indices.push(nextTop, currBot, nextBot);
      }
      sIdx++;
    }

    // Kuzey Kenar (z = sub)
    const northRowStart = sub * (sub + 1);
    for (let x = 0; x <= sub; x++) {
      const topIdx = northRowStart + x;
      positions[vIdx] = positions[topIdx * 3];
      positions[vIdx + 1] = positions[topIdx * 3 + 1] - skirtDrop;
      positions[vIdx + 2] = positions[topIdx * 3 + 2];
      vIdx += 3;

      uvs[uvIdx] = uvs[topIdx * 2];
      uvs[uvIdx + 1] = uvs[topIdx * 2 + 1];
      uvIdx += 2;

      colors[cIdx] = colors[topIdx * 4] * 0.7;
      colors[cIdx + 1] = colors[topIdx * 4 + 1] * 0.7;
      colors[cIdx + 2] = colors[topIdx * 4 + 2] * 0.7;
      colors[cIdx + 3] = 1.0;
      cIdx += 4;

      if (x < sub) {
        const currTop = topIdx;
        const nextTop = topIdx + 1;
        const currBot = skirtBaseIndex + sIdx;
        const nextBot = skirtBaseIndex + sIdx + 1;
        indices.push(currTop, nextTop, currBot);
        indices.push(nextTop, nextBot, currBot);
      }
      sIdx++;
    }

    // Normalleri hesapla
    VertexData.ComputeNormals(positions, indices, normals);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.colors = colors;

    this.mesh = new Mesh(`chunk_${this.key}_lod${this.lod}`, this.scene);
    vertexData.applyToMesh(this.mesh, false);

    this.mesh.material = this.material;
    this.mesh.receiveShadows = true;
    this.mesh.isPickable = false;
    this.mesh.freezeWorldMatrix();
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.mesh) {
      this.mesh.dispose(false, true);
      this.mesh = null;
    }
  }
}
