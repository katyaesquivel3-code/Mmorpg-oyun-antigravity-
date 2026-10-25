/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Dairesel DOM Mini Harita (Minimap)
 * (Oyuncu Yön Oku, 160m Radar Yarıçapı, İşaretçiler: Bay Terek, Bengü Taşlar, Kamplar, Tepegöz, NPC'ler & Sıfır GC)
 */

import { Vector3 } from '@babylonjs/core';
import { WorldManager } from '../world/WorldManager';
import { LandmarkManager } from '../world/LandmarkManager';
import { EnemyCampManager } from '../world/EnemyCampManager';
import { NPCManager } from '../world/NPCManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface MinimapMarker {
  id: string;
  type: 'BAY_TEREK' | 'BENGU_TAS' | 'CAMP' | 'BOSS' | 'NPC' | 'TRAINING';
  worldX: number;
  worldZ: number;
  icon: string;
  color: string;
}

export class Minimap {
  private container: HTMLElement | null;
  private playerArrow: HTMLElement | null;
  private markersContainer: HTMLElement | null;
  private compassNorth: HTMLElement | null;

  private readonly RADAR_RADIUS = 160.0; // 160 metre yarıçap
  private readonly MINIMAP_RADIUS_PX = 38.0; // 82px / 2 - 3px kenar payı

  // Statik İşaretçi Listesi
  private staticMarkers: MinimapMarker[] = [];

  constructor(
    landmarks: LandmarkManager,
    campManager: EnemyCampManager,
    npcManager: NPCManager
  ) {
    this.container = document.getElementById('minimapContainer');
    this.playerArrow = document.getElementById('minimapPlayer');
    this.markersContainer = document.getElementById('minimapMarkers');
    this.compassNorth = document.getElementById('minimapNorth');

    this.initStaticMarkers(landmarks, campManager, npcManager);

    if (this.container) {
      this.container.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        EventBus.emit('map:open');
      });
    }
  }

  private initStaticMarkers(
    landmarks: LandmarkManager,
    campManager: EnemyCampManager,
    npcManager: NPCManager
  ): void {
    // 1. Bay Terek
    this.staticMarkers.push({
      id: 'mm_bay_terek',
      type: 'BAY_TEREK',
      worldX: 0,
      worldZ: 28,
      icon: '🌳',
      color: '#4ade80'
    });

    // 2. Bengü Taşlar
    landmarks.benguTaslar.forEach((b) => {
      this.staticMarkers.push({
        id: `mm_${b.id}`,
        type: 'BENGU_TAS',
        worldX: b.position.x,
        worldZ: b.position.z,
        icon: '🗿',
        color: '#38bdf8'
      });
    });

    // 3. Karakollar
    campManager.camps.forEach((c) => {
      this.staticMarkers.push({
        id: `mm_${c.id}`,
        type: 'CAMP',
        worldX: c.center.x,
        worldZ: c.center.z,
        icon: '💀',
        color: '#f87171'
      });
    });

    // 4. Tepegöz Arenası
    this.staticMarkers.push({
      id: 'mm_tepegoz',
      type: 'BOSS',
      worldX: 0,
      worldZ: -135,
      icon: '👁️',
      color: '#c084fc'
    });

    // 5. Antrenman Sahası
    this.staticMarkers.push({
      id: 'mm_training',
      type: 'TRAINING',
      worldX: -32,
      worldZ: 4,
      icon: '🎯',
      color: '#facc15'
    });

    // 6. NPC'ler
    npcManager.npcs.forEach((n) => {
      this.staticMarkers.push({
        id: `mm_${n.id}`,
        type: 'NPC',
        worldX: n.position.x,
        worldZ: n.position.z,
        icon: '👤',
        color: '#fde047'
      });
    });
  }

  /**
   * Her karede mini haritadaki oyuncu yönünü ve işaretçileri günceller (Sıfır GC)
   */
  public update(playerPos: Vector3, playerHeading: number, cameraYaw: number): void {
    if (!this.container || !this.playerArrow || !this.markersContainer) return;

    // Oyuncu okunu kameranın yönüne göre döndür
    const deg = (cameraYaw * 180) / Math.PI;
    this.playerArrow.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;

    // Kuzey İşareti Rotasyonu
    if (this.compassNorth) {
      const northAngle = -deg;
      this.compassNorth.style.transform = `rotate(${northAngle}deg)`;
    }

    // İşaretçileri radar mesafesine göre konumlandır
    let html = '';
    const px = playerPos.x;
    const pz = playerPos.z;

    for (let i = 0; i < this.staticMarkers.length; i++) {
      const m = this.staticMarkers[i];
      const dx = m.worldX - px;
      const dz = m.worldZ - pz;
      const dist = Math.hypot(dx, dz);

      if (dist <= this.RADAR_RADIUS) {
        // Kameraya göre bağıl açı hesabı
        const relAngle = Math.atan2(dx, dz) - cameraYaw;
        const normalizedDist = (dist / this.RADAR_RADIUS) * this.MINIMAP_RADIUS_PX;

        const posX = Math.sin(relAngle) * normalizedDist;
        const posZ = -Math.cos(relAngle) * normalizedDist;

        html += `<div class="minimap-marker" style="transform: translate(calc(-50% + ${posX.toFixed(1)}px), calc(-50% + ${posZ.toFixed(1)}px)); color: ${m.color};" title="${m.type}">${m.icon}</div>`;
      }
    }

    this.markersContainer.innerHTML = html;
  }
}
