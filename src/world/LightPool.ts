/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gece Meşale ve Ateş Işıkları Dinamik Işık Havuzu (LightPool)
 * (Mobil Bütçesi: En Fazla 4 Dinamik PointLight, Mesafe Sıralaması, Ateş Titremesi & Sıfır GC)
 */

import {
  Scene,
  PointLight,
  Vector3,
  Color3
} from '@babylonjs/core';

export interface LightAnchor {
  id: string;
  pos: Vector3;
  baseColor: Color3;
  baseIntensity: number;
  radius: number;
}

export class LightPool {
  private scene: Scene;
  public static readonly MAX_LIGHTS = 4;

  // 4 Adet Havuzlanmış Dinamik Nokta Işığı
  private lights: PointLight[] = [];

  // Haritadaki Işık Kaynağı Noktaları (Ateş, meşaleler, kutsal yazıtlar)
  private anchors: LightAnchor[] = [];

  // Sıcak döngüde sıfır GC için önceden ayrılmış mesafe dizisi
  private anchorDistances: { anchor: LightAnchor; distSq: number }[] = [];

  constructor(scene: Scene) {
    this.scene = scene;

    for (let i = 0; i < LightPool.MAX_LIGHTS; i++) {
      const pl = new PointLight(`pool_light_${i}`, new Vector3(0, -100, 0), scene);
      pl.diffuse = new Color3(1.0, 0.65, 0.25); // Sıcak kamp ateşi / meşale sarısı
      pl.specular = new Color3(0.4, 0.2, 0.05);
      pl.range = 14.0;
      pl.intensity = 0.0;
      pl.setEnabled(false);
      this.lights.push(pl);
    }
  }

  /**
   * Işık havuzuna yeni bir ışık kaynağı çıpası ekler
   */
  public registerAnchor(id: string, pos: Vector3, color = new Color3(1.0, 0.62, 0.22), intensity = 1.3, radius = 14): void {
    if (this.anchors.some(a => a.id === id)) return;
    const anchor: LightAnchor = { id, pos, baseColor: color, baseIntensity: intensity, radius };
    this.anchors.push(anchor);
    this.anchorDistances.push({ anchor, distSq: 0 });
  }

  /**
   * Oyuncu konumuna ve gün/gece durumuna göre en yakın 4 ışığı havuzdan atar (Sıfır GC)
   */
  public update(playerPos: Vector3, isNight: boolean, time: number): void {
    if (!isNight) {
      // Gündüz ışıklar kapatılarak GPU bütçesi korunur
      for (const pl of this.lights) {
        if (pl.isEnabled()) {
          pl.intensity = 0;
          pl.setEnabled(false);
        }
      }
      return;
    }

    // Oyuncuya olan mesafeleri hesapla
    const px = playerPos.x;
    const pz = playerPos.z;

    for (let i = 0; i < this.anchors.length; i++) {
      const a = this.anchors[i];
      const dx = a.pos.x - px;
      const dz = a.pos.z - pz;
      this.anchorDistances[i].distSq = dx * dx + dz * dz;
    }

    // En yakın olanları öne sırala
    this.anchorDistances.sort((a, b) => a.distSq - b.distSq);

    // En yakın 4 kaynağı havuzdaki ışıklara ata
    for (let i = 0; i < LightPool.MAX_LIGHTS; i++) {
      const pl = this.lights[i];

      if (i < this.anchorDistances.length) {
        const item = this.anchorDistances[i];
        const a = item.anchor;

        // 70 metreden uzaktaki ışıklar açılmaz
        if (item.distSq < 4900) {
          if (!pl.isEnabled()) pl.setEnabled(true);

          pl.position.copyFrom(a.pos);
          pl.range = a.radius;
          pl.diffuse.copyFrom(a.baseColor);

          // Ateş Titremesi (Flicker)
          const flicker = Math.sin(time * 14.0 + i * 2.3) * 0.12 + Math.cos(time * 28.0 + i) * 0.06;
          pl.intensity = a.baseIntensity * (1.0 + flicker);
          continue;
        }
      }

      if (pl.isEnabled()) {
        pl.intensity = 0;
        pl.setEnabled(false);
      }
    }
  }

  public dispose(): void {
    for (const pl of this.lights) {
      pl.dispose();
    }
    this.lights = [];
    this.anchors = [];
  }
}
