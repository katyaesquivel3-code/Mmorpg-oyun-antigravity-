/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Global Rüzgâr Alanı (Global WindField)
 * (Yön, Hız, Dalgalı Hamle Gürültüsü & Sıfır GC)
 * Çim, ağaçlar, pelerin, bayraklar, parçacıklar, süzülme ve ateş bu alandan beslenir.
 */

import { Vector3 } from '@babylonjs/core';

export class WindField {
  private static instance: WindField | null = null;

  // Ana Rüzgâr Vektörü (XZ düzleminde birim yön)
  public direction: Vector3 = new Vector3(0.707, 0, 0.707); // Kuzeydoğu esintisi
  public baseSpeed = 4.5; // m/s (sakin bozkır rüzgârı)
  public currentSpeed = 4.5;
  public gustStrength = 0.0; // 0.0 ile 1.0 arası hamle katsayısı

  public get directionAngle(): number {
    return Math.atan2(this.direction.x, this.direction.z);
  }

  public set directionAngle(angle: number) {
    this.direction.x = Math.sin(angle);
    this.direction.z = Math.cos(angle);
    this.direction.y = 0;
  }

  // Zaman sayacı
  private time = 0;

  // Sıcak döngüde sıfır GC tahsisi için dahili scratch nesnesi (Rule 7: Zero GC)
  private scratchWind = new Vector3(0, 0, 0);

  public static getInstance(): WindField {
    if (!WindField.instance) {
      WindField.instance = new WindField();
    }
    return WindField.instance;
  }

  constructor() {
    this.direction.normalize();
  }

  /**
   * Rüzgâr durumunu her kare günceller
   */
  public update(deltaTime: number, weatherMultiplier = 1.0): void {
    this.time += deltaTime;

    // Yavaş yön salınımı (-15 ile +15 derece)
    const angleOsc = Math.sin(this.time * 0.15) * 0.26;
    const baseAngle = Math.PI * 0.25; // 45 derece (kuzeydoğu)
    const curAngle = baseAngle + angleOsc;

    this.direction.x = Math.cos(curAngle);
    this.direction.z = Math.sin(curAngle);
    this.direction.y = 0;

    // Rüzgâr Hamlesi Gürültüsü (Gust Noise - 3 harmonik sinüs dalgası bileşimi)
    const gust1 = Math.sin(this.time * 0.85);
    const gust2 = Math.sin(this.time * 2.1 + 1.4) * 0.5;
    const gust3 = Math.sin(this.time * 4.3 + 2.7) * 0.25;
    const rawGust = (gust1 + gust2 + gust3) / 1.75; // -1 ile +1 arası

    this.gustStrength = Math.max(0, rawGust); // 0 ile 1 arası pozitif darbe

    // Anlık Rüzgâr Hızı
    this.currentSpeed = (this.baseSpeed + this.gustStrength * 6.5) * weatherMultiplier;
  }

  /**
   * Belirli bir dünya konumundaki rüzgâr vektörünü döndürür (Sıfır GC, targetOut'a yazar)
   */
  public getWindAt(pos: Vector3, targetOut: Vector3): Vector3 {
    // Konuma bağlı faz kayması (rüzgâr dalgası arazide akar)
    const spatialPhase = (pos.x * this.direction.x + pos.z * this.direction.z) * 0.08 - this.time * 2.5;
    const localGust = Math.sin(spatialPhase) * 0.35 + this.gustStrength * 0.65;
    const effSpeed = Math.max(1.0, this.currentSpeed * (0.8 + localGust * 0.5));

    targetOut.x = this.direction.x * effSpeed;
    targetOut.y = Math.sin(spatialPhase * 1.5) * 0.4; // Hafif dikey hava türbülansı
    targetOut.z = this.direction.z * effSpeed;

    return targetOut;
  }

  /**
   * Shader uniform'ları için normalize rüzgâr yönü ve şiddet vektörü (vec4)
   * x, z: yön, y: şiddet, w: zaman fazı
   */
  public getShaderWindVector(): [number, number, number, number] {
    return [
      this.direction.x,
      this.currentSpeed,
      this.direction.z,
      this.time
    ];
  }
}
