/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Matematiksel Açık Dünya Gürültüsü & Biyom Sistemi
 * (1024x1024m Dünya, 4 Biyom: Yer-Sub, Demir Dağ, Şahmaran Gölü, Gök Zirve Altay)
 * Saf Matematik — Sıfır 2D Canvas, Sıfır Harici Yükseklik Haritası
 */

export type BiomeType = 'YER_SUB' | 'DEMIR_DAG' | 'SAHMARAN' | 'ALTAY';

export interface BiomeData {
  type: BiomeType;
  name: string;
  subTitle: string;
  grassColor: [number, number, number];
  rockColor: [number, number, number];
  ambientFogColor: [number, number, number];
  foliageDensity: number; // 0.0 ile 1.0 arası
  weatherType: 'CLEAR' | 'RAIN' | 'SNOW' | 'FOG';
}

export class WorldNoise {
  private perm: Uint8Array = new Uint8Array(512);

  // 1024x1024 metre açık dünya koordinat sınırları (-512m ile +512m)
  public static readonly WORLD_SIZE = 1024;
  public static readonly HALF_SIZE = 512;
  public static readonly WATER_LEVEL = 1.0; // Y = 1.0m Şahmaran Gölü yüzeyi

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
   * Domain Warping: F(p + D(p)) ile doğal kanyon sırtları ve nehir vadileri
   */
  public domainWarpedNoise(x: number, z: number): number {
    const qx = this.fbm(x * 0.0035 + 1.2, z * 0.0035 + 3.4, 2);
    const qz = this.fbm(x * 0.0035 + 5.6, z * 0.0035 + 7.8, 2);

    const rx = this.fbm((x + qx * 65.0) * 0.0045, (z + qz * 65.0) * 0.0045, 3);
    const rz = this.fbm((x + qx * 55.0) * 0.0045 + 4.2, (z + qz * 55.0) * 0.0045 + 2.1, 3);

    return this.fbm((x + rx * 80.0) * 0.004, (z + rz * 80.0) * 0.004, 4);
  }

  /**
   * 1024x1024m açık dünya zemin yüksekliği hesabı (x, z)
   */
  public getHeight(x: number, z: number): number {
    const normX = x / WorldNoise.HALF_SIZE; // -1.0 ile +1.0
    const normZ = z / WorldNoise.HALF_SIZE; // -1.0 ile +1.0

    // Bölgesel Biyom Ağırlıkları:
    // Güney (z < 0): Yer-Sub Ormanı & Bozkır
    // Batı (x < -0.15, z < 0.2): Şahmaran Gölü Derin Çanağı
    // Doğu (x > 0.15, z > -0.2): Demir Dağ Sivri Sırtları
    // Kuzey (z > 0.25): Gök Zirve Altay Kar Zirveleri
    const lakeWeight = Math.max(0, Math.min(1.0, (-normX * 1.3 - normZ * 0.6 + 0.15)));
    const altayWeight = Math.max(0, Math.min(1.0, (normZ * 1.4 + normX * 0.35)));
    const demirDagWeight = Math.max(0, Math.min(1.0, (normX * 1.4 - normZ * 0.3)));

    const warped = this.domainWarpedNoise(x, z);
    const fineNoise = this.fbm(x * 0.025, z * 0.025, 2) * 2.5;

    // Altay karlı zirveleri 48 metreye kadar yükselir
    const altayHeight = (warped * 38.0 + Math.pow(Math.max(0, warped), 2.2) * 22.0) + fineNoise;

    // Demir Dağ dik kızıl kayalıkları 34 metreye kadar yükselir
    const demirHeight = (warped * 28.0 + Math.pow(Math.max(0, warped), 1.8) * 14.0) + fineNoise;

    // Yer-Sub Ormanı yumuşak yaylaları 2 ile 12 metre arasındadır
    const yersubHeight = warped * 9.0 + 3.8 + fineNoise;

    // Biyom yüksekliklerinin harmanlanması
    let baseH = yersubHeight;
    baseH = this.lerp(altayWeight, baseH, altayHeight);
    baseH = this.lerp(demirDagWeight, baseH, demirHeight);

    // Şahmaran Gölü çanak oyması (-4.5m derinliğe kadar)
    const lakeCarve = lakeWeight * 18.0;
    let finalHeight = baseH - lakeCarve;

    // Başlangıç Obası ve Bay Terek Platosu Düzleştirmesi (Merkez 0, 0 çevresi 32m yarıçap)
    const distFromOrigin = Math.sqrt(x * x + z * z);
    if (distFromOrigin < 32.0) {
      const campBlend = Math.min(1.0, distFromOrigin / 32.0);
      const campFloor = 3.4; // Kuru yayla başlangıç tabanı
      finalHeight = campFloor * (1.0 - campBlend) + finalHeight * campBlend;
    }

    // Dünya Sınır Bariyeri: 1024m sınırlarına yaklaştıkça aşılmaz dik sisli dağ duvarı yükselir
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    if (edgeDist > 460) {
      const barrierT = (edgeDist - 460) / 52; // 0.0 ile 1.0 arası
      finalHeight += barrierT * barrierT * 60.0;
    }

    return finalHeight;
  }

  /**
   * Verilen koordinatlardaki biyom özelliklerini döndürür
   */
  public getBiome(x: number, z: number, height?: number): BiomeData {
    // 0. Ötüken Obası (Merkez yayla ve Bay Terek kutsal obası)
    const distFromOrigin = Math.hypot(x, z);
    if (distFromOrigin < 36.0) {
      return {
        type: 'YER_SUB',
        name: 'Ötüken Obası',
        subTitle: 'Kutlu Yurt ve Bay Terek Ocağı',
        grassColor: [0.28, 0.72, 0.32],
        rockColor: [0.45, 0.45, 0.40],
        ambientFogColor: [0.55, 0.78, 0.95],
        foliageDensity: 0.85,
        weatherType: 'CLEAR'
      };
    }

    const h = height !== undefined ? height : this.getHeight(x, z);

    // 1. Şahmaran Gölü (Batı çanağı ve kıyı şeridi)
    if (h < WorldNoise.WATER_LEVEL + 1.4 && x < -25 && z < 60) {
      return {
        type: 'SAHMARAN',
        name: 'Şahmaran Gölü',
        subTitle: 'Yeraltı Sularının Kutsal Havzası',
        grassColor: [0.26, 0.68, 0.58], // Kutsal turkuaz kıyı çimi
        rockColor: [0.72, 0.68, 0.54],  // Islak kum ve kıyı taşları
        ambientFogColor: [0.35, 0.72, 0.85],
        foliageDensity: 0.55,
        weatherType: 'CLEAR'
      };
    }

    // 2. Gök Zirve Altay (Kuzey karlı buzlu zirveler, yükseklik > 22m veya z > 120)
    if (h > 22.0 || (z > 100 && h > 14.0)) {
      return {
        type: 'ALTAY',
        name: 'Gök Zirve Altay',
        subTitle: 'Umay Ana ve Gök Ruhu Sınavı',
        grassColor: [0.9, 0.94, 0.99],   // Sonsuz kar örtüsü
        rockColor: [0.42, 0.48, 0.58],   // Buzlu granit kaya
        ambientFogColor: [0.75, 0.85, 0.96],
        foliageDensity: 0.2,
        weatherType: 'SNOW'
      };
    }

    // 3. Demir Dağ (Doğu sırtları, pas ve demir oksit madenleri, x > 60)
    if (x > 50 && z > -90) {
      return {
        type: 'DEMIR_DAG',
        name: 'Demir Dağ Eteği',
        subTitle: "Erlik Han'ın Demirci Ocağı",
        grassColor: [0.44, 0.46, 0.26],  // Bozkır kuru otu
        rockColor: [0.52, 0.26, 0.16],   // Demir ve bakır damarlı kızıl kaya
        ambientFogColor: [0.65, 0.55, 0.48],
        foliageDensity: 0.35,
        weatherType: 'FOG'
      };
    }

    // 4. Yer-Sub Ormanı (Güney kutsal orman yurdu, Bay Terek yaylası)
    return {
      type: 'YER_SUB',
      name: 'Yer-Sub Ormanı',
      subTitle: 'Bay Terek ve Kutsal Ruhlar Yurdu',
      grassColor: [0.22, 0.68, 0.28],   // Canlı zümrüt çayır
      rockColor: [0.42, 0.44, 0.38],    // Yosunlu kadim kaya
      ambientFogColor: [0.55, 0.78, 0.95],
      foliageDensity: 0.88,
      weatherType: 'CLEAR'
    };
  }

  /**
   * Analitik yüzey normal vektörü hesabı
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
