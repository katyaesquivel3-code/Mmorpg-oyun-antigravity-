export type BiomeType = 'YER_SUB' | 'DEMIR_DAG' | 'SAHMARAN' | 'ALTAY';

export interface BiomeData {
  type: BiomeType;
  name: string;
  subTitle: string;
  grassColor: [number, number, number];
  rockColor: [number, number, number];
  ambientFogColor: [number, number, number];
  foliageDensity: number; // 0.0 to 1.0
  weatherType: 'CLEAR' | 'RAIN' | 'SNOW' | 'FOG';
}

/**
 * Procedural Simplex-based noise generator with domain warping and multi-octave fBm.
 * Strictly pure math — zero 2D canvas, zero external heightmaps.
 */
export class WorldNoise {
  private perm: Uint8Array = new Uint8Array(512);

  public static readonly WORLD_SIZE = 512; // 512x512 meters
  public static readonly HALF_SIZE = 256;  // -256 to +256
  public static readonly WATER_LEVEL = 1.0; // Y = 1.0m is lake surface

  constructor(seed = 9871) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 11) % 2147483647;
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

  public noise2D(x: number, y: number): number {
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

  public fbm(x: number, y: number, octaves = 4, lacunarity = 2.0, persistence = 0.5): number {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return total / maxValue;
  }

  /**
   * Domain Warped noise: F(p + D(p)) creates natural geological mountain ridges and river meanders.
   */
  public domainWarpedNoise(x: number, z: number): number {
    const qx = this.fbm(x * 0.006 + 1.2, z * 0.006 + 3.4, 2);
    const qz = this.fbm(x * 0.006 + 5.6, z * 0.006 + 7.8, 2);

    const rx = this.fbm((x + qx * 40.0) * 0.008, (z + qz * 40.0) * 0.008, 3);
    const rz = this.fbm((x + qx * 35.0) * 0.008 + 4.2, (z + qz * 35.0) * 0.008 + 2.1, 3);

    return this.fbm((x + rx * 50.0) * 0.007, (z + rz * 50.0) * 0.007, 4);
  }

  /**
   * Calculates world terrain height at any (x, z) coordinates within the 512x512m region.
   */
  public getHeight(x: number, z: number): number {
    // Distance from world center (-256..+256)
    const normX = x / WorldNoise.HALF_SIZE; // -1 to +1
    const normZ = z / WorldNoise.HALF_SIZE; // -1 to +1

    // 1. Regional Biome Macro Masks:
    // South-West (normX < 0, normZ < 0): Şahmaran Lake Basin
    // South-East (normX > 0, normZ < 0): Yer-Sub Forest Foothills
    // North-West (normX < 0, normZ > 0): Demir Dağ Peaks
    // North-East (normX > 0, normZ > 0): Altay Snowy Summit
    const lakeWeight = Math.max(0, Math.min(1, (-normX * 0.8 - normZ * 0.8)));
    const mountainWeight = Math.max(0, Math.min(1, (normZ * 1.1 + normX * 0.4)));

    // Base macro height curve
    const warped = this.domainWarpedNoise(x, z);
    const fineNoise = this.fbm(x * 0.035, z * 0.035, 2) * 2.2;

    // Mountainous peaks (Demir Dağ & Altay) reach up to 38 meters
    const mountainHeight = (warped * 28.0 + Math.pow(Math.max(0, warped), 2.2) * 16.0);

    // Forest rolling hills (Yer-Sub) range from 2 to 14 meters
    const forestHeight = warped * 10.0 + 3.5 + fineNoise;

    // Lake depression: carves out basin down to -3.5m (water is at 1.0m)
    const lakeCarve = lakeWeight * 14.0;

    let finalHeight = (forestHeight * (1 - mountainWeight)) + (mountainHeight * mountainWeight) - lakeCarve;

    // Central Starting Camp / Plateau flattening (around origin 0, 0)
    const distFromOrigin = Math.sqrt(x * x + z * z);
    if (distFromOrigin < 24.0) {
      const campBlend = Math.min(1.0, distFromOrigin / 24.0);
      const campFloor = 3.2; // Dry grassy elevation
      finalHeight = campFloor * (1 - campBlend) + finalHeight * campBlend;
    }

    return finalHeight;
  }

  /**
   * Determines the active biome data at given coordinates.
   */
  public getBiome(x: number, z: number, height?: number): BiomeData {
    const h = height !== undefined ? height : this.getHeight(x, z);

    // 1. Şahmaran Lake (Water and shoreline)
    if (h < WorldNoise.WATER_LEVEL + 1.2 && x < 40 && z < 40) {
      return {
        type: 'SAHMARAN',
        name: 'Şahmaran Gölü',
        subTitle: 'Yeraltı Sularının Kutsal Havzası',
        grassColor: [0.28, 0.65, 0.55], // Turquoise green bank
        rockColor: [0.72, 0.68, 0.52],  // Sandy shore stones
        ambientFogColor: [0.4, 0.75, 0.85],
        foliageDensity: 0.5,
        weatherType: 'CLEAR'
      };
    }

    // 2. Karlı Altay (High snowy peaks, mostly North-East and elevation > 21m)
    if (h > 21.0 || (z > 60 && x > 40 && h > 15.0)) {
      return {
        type: 'ALTAY',
        name: 'Gök Zirve Altay',
        subTitle: 'Umay Ana ve Gök Ruhu Sınavı',
        grassColor: [0.88, 0.92, 0.98], // Pure snow
        rockColor: [0.45, 0.52, 0.62],  // Cold icy granite
        ambientFogColor: [0.75, 0.85, 0.95],
        foliageDensity: 0.25,
        weatherType: 'SNOW'
      };
    }

    // 3. Demir Dağ (Craggy iron-rich ridges, North-West and elevation > 11m)
    if (x < -20 && z > 20) {
      return {
        type: 'DEMIR_DAG',
        name: 'Demir Dağ Eteği',
        subTitle: 'Erlik Han\'ın Demirci Ocağı',
        grassColor: [0.42, 0.48, 0.28], // Arid steppe grass
        rockColor: [0.48, 0.28, 0.18],  // Rust/iron ore stone
        ambientFogColor: [0.65, 0.58, 0.52],
        foliageDensity: 0.35,
        weatherType: 'FOG'
      };
    }

    // 4. Yer-Sub Ormanı (Default starting homeland, lush ancient forest)
    return {
      type: 'YER_SUB',
      name: 'Yer-Sub Ormanı',
      subTitle: 'Bay Terek ve Kutsal Ruhlar Yurdu',
      grassColor: [0.22, 0.68, 0.28], // Lush green meadow
      rockColor: [0.42, 0.44, 0.38],  // Mossy stone
      ambientFogColor: [0.55, 0.78, 0.95],
      foliageDensity: 0.9,
      weatherType: 'CLEAR'
    };
  }

  /**
   * Fast mathematical analytical normal vector calculation.
   */
  public getNormal(x: number, z: number): [number, number, number] {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);

    const nx = hL - hR;
    const ny = 2.0 * eps;
    const nz = hD - hU;

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return [nx / len, ny / len, nz / len];
  }
}
