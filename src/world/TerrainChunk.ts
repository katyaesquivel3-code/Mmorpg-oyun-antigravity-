import {
  Mesh,
  Scene,
  VertexData,
  StandardMaterial,
  Color3,
  Vector3
} from '@babylonjs/core';

// Simplex-inspired 2D noise implementation purely in math (No 2D canvas context)
class FastNoise {
  private perm: Uint8Array = new Uint8Array(512);

  constructor(seed = 1337) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Simple PRNG shuffle
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const temp = p[i];
      p[i] = p[j];
      p[j] = temp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;

    return this.lerp(
      v,
      this.lerp(u, this.grad(this.perm[A], xf, yf), this.grad(this.perm[B], xf - 1, yf)),
      this.lerp(u, this.grad(this.perm[A + 1], xf, yf - 1), this.grad(this.perm[B + 1], xf - 1, yf - 1))
    );
  }

  public fbm(x: number, y: number, octaves = 3): number {
    let value = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let max = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      max += amplitude;
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value / max;
  }
}

export class TerrainChunk {
  public mesh: Mesh;
  public size: number;
  public subdivisions: number;
  private noiseGen: FastNoise;
  private heightScale = 4.5;
  private noiseFrequency = 0.035;

  constructor(scene: Scene, size = 64, subdivisions = 64) {
    this.size = size;
    this.subdivisions = subdivisions;
    this.noiseGen = new FastNoise(42);

    this.mesh = this.generateMesh(scene);
  }

  /**
   * Generates procedural 3D terrain strictly using Float32Array and VertexData.
   * Completely avoids 2D canvas context and CreateGroundFromHeightMap.
   */
  private generateMesh(scene: Scene): Mesh {
    const sub = this.subdivisions;
    const numVerts = (sub + 1) * (sub + 1);

    const positions = new Float32Array(numVerts * 3);
    const normals = new Float32Array(numVerts * 3);
    const uvs = new Float32Array(numVerts * 2);
    const colors = new Float32Array(numVerts * 4);
    const indices: number[] = [];

    const halfSize = this.size / 2;
    const step = this.size / sub;

    let vIdx = 0;
    let uvIdx = 0;
    let cIdx = 0;

    // Generate vertices with procedural height and vertex colors for Zelda-like terrain
    for (let z = 0; z <= sub; z++) {
      for (let x = 0; x <= sub; x++) {
        const worldX = x * step - halfSize;
        const worldZ = z * step - halfSize;

        // Calculate procedural height using multi-octave noise
        const height = this.sampleHeight(worldX, worldZ);

        positions[vIdx] = worldX;
        positions[vIdx + 1] = height;
        positions[vIdx + 2] = worldZ;
        vIdx += 3;

        uvs[uvIdx] = x / sub;
        uvs[uvIdx + 1] = z / sub;
        uvIdx += 2;

        // Vertex color styling: Cel-shaded steppe greens, warm hills, earthy depressions
        const normalizedH = Math.max(0, Math.min(1, (height + 2.0) / (this.heightScale + 2.0)));

        // Color blending: Deep lush grass -> golden meadow grass -> rocky outcrop
        if (normalizedH < 0.4) {
          // Lush valley grass (#34d399 / #15803d)
          colors[cIdx] = 0.22;
          colors[cIdx + 1] = 0.68;
          colors[cIdx + 2] = 0.32;
        } else if (normalizedH < 0.75) {
          // Vibrant sunny steppe grass (#4ade80 / #84cc16)
          colors[cIdx] = 0.38;
          colors[cIdx + 1] = 0.76;
          colors[cIdx + 2] = 0.25;
        } else {
          // Hill top golden earth (#a16207 / #ca8a04)
          colors[cIdx] = 0.58;
          colors[cIdx + 1] = 0.55;
          colors[cIdx + 2] = 0.35;
        }
        colors[cIdx + 3] = 1.0;
        cIdx += 4;
      }
    }

    // Generate indices for triangle grid
    for (let z = 0; z < sub; z++) {
      for (let x = 0; x < sub; x++) {
        const row1 = z * (sub + 1) + x;
        const row2 = (z + 1) * (sub + 1) + x;

        // Triangle 1
        indices.push(row1, row2, row1 + 1);
        // Triangle 2
        indices.push(row1 + 1, row2, row2 + 1);
      }
    }

    // Compute normals mathematically
    VertexData.ComputeNormals(positions, indices, normals);

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.colors = colors;

    const mesh = new Mesh('otuken_terrain_chunk_0_0', scene);
    vertexData.applyToMesh(mesh, false);

    // Cel-shaded / Toon StandardMaterial
    const mat = new StandardMaterial('mat_otuken_terrain', scene);
    mat.diffuseColor = new Color3(1.0, 1.0, 1.0);
    mat.specularColor = new Color3(0.08, 0.08, 0.05);
    mat.ambientColor = new Color3(0.35, 0.4, 0.3);
    mat.roughness = 0.95;

    mesh.material = mat;
    mesh.receiveShadows = true;

    // Freeze world matrix for high mobile performance
    mesh.freezeWorldMatrix();

    return mesh;
  }

  /**
   * Fast mathematical height evaluation at any (x, z) coordinates.
   */
  public sampleHeight(x: number, z: number): number {
    // Flatten the center spawning plateau for seamless initial standing and movement
    const distFromCenter = Math.sqrt(x * x + z * z);
    const plateauFactor = Math.min(1.0, Math.max(0.0, (distFromCenter - 4.0) / 10.0));

    const rawNoise = this.noiseGen.fbm(x * this.noiseFrequency, z * this.noiseFrequency, 3);
    return rawNoise * this.heightScale * plateauFactor;
  }

  /**
   * Raycast / sample height at exact player position
   */
  public getHeightAt(x: number, z: number): number {
    return this.sampleHeight(x, z);
  }
}
