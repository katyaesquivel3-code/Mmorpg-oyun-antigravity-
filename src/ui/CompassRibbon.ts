/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * BotW Stili Yatay Pusula Şeridi (CompassRibbon)
 * (Kardinal Yönler: K, D, G, B, Aktif Görev Yıldızı, Bengü Taşlar, Karakollar & Sıfır GC)
 */

import { Vector3 } from '@babylonjs/core';
import { QuestManager } from '../story/QuestManager';
import { LandmarkManager } from '../world/LandmarkManager';
import { EnemyCampManager } from '../world/EnemyCampManager';

export interface CompassPoint {
  id: string;
  name: string;
  icon: string;
  color: string;
  worldX: number;
  worldZ: number;
  isQuest?: boolean;
}

export class CompassRibbon {
  private container: HTMLElement | null;
  private cardinalTrack: HTMLElement | null;
  private markersTrack: HTMLElement | null;

  // Görünür açı genişliği (~110 derece FOV penceresi)
  private readonly FOV_DEG = 110.0;
  private readonly RIBBON_WIDTH_PX = 320.0;

  constructor(
    private landmarks: LandmarkManager,
    private campManager: EnemyCampManager
  ) {
    this.container = document.getElementById('compassRibbon');
    this.cardinalTrack = document.getElementById('compassCardinalTrack');
    this.markersTrack = document.getElementById('compassMarkersTrack');
  }

  /**
   * Her karede kamera yönüne göre pusula şeridini ve hedefleri kaydırır (Sıfır GC)
   */
  public update(playerPos: Vector3, cameraYaw: number): void {
    if (!this.container || !this.cardinalTrack || !this.markersTrack) return;

    // Kameranın baktığı açı (0 - 360 derece)
    // Babylon'da yaw radyan cinsindendir
    let yawDeg = (cameraYaw * 180) / Math.PI;
    while (yawDeg < 0) yawDeg += 360;
    while (yawDeg >= 360) yawDeg -= 360;

    // Kardinal derece kayması (360 derece = ~1047px)
    // 1 derece = (RIBBON_WIDTH_PX / FOV_DEG) px
    const pxPerDeg = this.RIBBON_WIDTH_PX / this.FOV_DEG;
    const offsetPx = -yawDeg * pxPerDeg;

    this.cardinalTrack.style.transform = `translateX(${offsetPx.toFixed(1)}px)`;

    // Hedef İşaretçilerini Hesapla ve Konumlandır
    const px = playerPos.x;
    const pz = playerPos.z;

    let markersHtml = '';

    // 1. Aktif Görev Hedefi
    const beaconCoords = QuestManager.getInstance().getActiveBeaconPos();
    if (beaconCoords) {
      const dx = beaconCoords.x - px;
      const dz = beaconCoords.z - pz;
      const dist = Math.hypot(dx, dz);

      // Bağıl Açı
      const angleRad = Math.atan2(dx, dz);
      let targetDeg = (angleRad * 180) / Math.PI;
      while (targetDeg < 0) targetDeg += 360;

      let diffDeg = targetDeg - yawDeg;
      while (diffDeg > 180) diffDeg -= 360;
      while (diffDeg < -180) diffDeg += 360;

      if (Math.abs(diffDeg) <= this.FOV_DEG * 0.5) {
        const markerX = (this.RIBBON_WIDTH_PX * 0.5) + (diffDeg * pxPerDeg);
        markersHtml += `
          <div class="compass-marker compass-quest-marker" style="left: ${markerX.toFixed(1)}px;" title="Görev Hedefi (${Math.round(dist)}m)">
            <span class="compass-icon">★</span>
            <span class="compass-dist">${Math.round(dist)}m</span>
          </div>
        `;
      }
    }

    // 2. En Yakın Bengü Taşı (220m içinde)
    let closestBenguDist = 220.0;
    let closestBenguPos: { x: number; z: number; name: string } | null = null;

    for (let i = 0; i < this.landmarks.benguTaslar.length; i++) {
      const b = this.landmarks.benguTaslar[i];
      const dx = b.position.x - px;
      const dz = b.position.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist < closestBenguDist) {
        closestBenguDist = dist;
        closestBenguPos = { x: b.position.x, z: b.position.z, name: b.name };
      }
    }

    if (closestBenguPos) {
      const dx = closestBenguPos.x - px;
      const dz = closestBenguPos.z - pz;
      const angleRad = Math.atan2(dx, dz);
      let targetDeg = (angleRad * 180) / Math.PI;
      while (targetDeg < 0) targetDeg += 360;

      let diffDeg = targetDeg - yawDeg;
      while (diffDeg > 180) diffDeg -= 360;
      while (diffDeg < -180) diffDeg += 360;

      if (Math.abs(diffDeg) <= this.FOV_DEG * 0.5) {
        const markerX = (this.RIBBON_WIDTH_PX * 0.5) + (diffDeg * pxPerDeg);
        markersHtml += `
          <div class="compass-marker compass-bengu-marker" style="left: ${markerX.toFixed(1)}px;" title="${closestBenguPos.name} (${Math.round(closestBenguDist)}m)">
            <span class="compass-icon">🗿</span>
            <span class="compass-dist">${Math.round(closestBenguDist)}m</span>
          </div>
        `;
      }
    }

    // 3. Bay Terek (0, 28)
    const dxTerek = 0 - px;
    const dzTerek = 28 - pz;
    const distTerek = Math.hypot(dxTerek, dzTerek);
    if (distTerek < 350.0) {
      const angleRad = Math.atan2(dxTerek, dzTerek);
      let targetDeg = (angleRad * 180) / Math.PI;
      while (targetDeg < 0) targetDeg += 360;

      let diffDeg = targetDeg - yawDeg;
      while (diffDeg > 180) diffDeg -= 360;
      while (diffDeg < -180) diffDeg += 360;

      if (Math.abs(diffDeg) <= this.FOV_DEG * 0.5) {
        const markerX = (this.RIBBON_WIDTH_PX * 0.5) + (diffDeg * pxPerDeg);
        markersHtml += `
          <div class="compass-marker compass-terek-marker" style="left: ${markerX.toFixed(1)}px;" title="Bay Terek (${Math.round(distTerek)}m)">
            <span class="compass-icon">🌳</span>
          </div>
        `;
      }
    }

    this.markersTrack.innerHTML = markersHtml;
  }
}
