/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Mabet Yöneticisi (ShrineManager)
 * (Ateş ve Rüzgâr Mabetlerinin Koordinasyonu, Etkileşimler, Kam Taşı & Kut Kalbi Bağlantısı)
 */

import { Scene, Vector3 } from '@babylonjs/core';
import { FireShrine } from './FireShrine';
import { WindShrine } from './WindShrine';
import { ElementSystem } from '../elements/ElementSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { EventBus } from '../infra/EventBus';

export class ShrineManager {
  public scene: Scene;
  public fireShrine: FireShrine;
  public windShrine: WindShrine;
  public kamPowerManager: KamPowerManager;

  constructor(scene: Scene, elementSystem: ElementSystem, kamPowerManager: KamPowerManager) {
    this.scene = scene;
    this.kamPowerManager = kamPowerManager;

    this.fireShrine = new FireShrine(scene, elementSystem);
    this.windShrine = new WindShrine(scene, elementSystem);

    // Mabet tamamlandığında Kam Taşı ekle
    EventBus.on('shrine:completed', () => {
      this.kamPowerManager.addKamStone();
    });
  }

  /**
   * Oyuncu ateş kıvılcımı veya ateş oku fırlattığında meşaleleri kontrol et
   */
  public checkFireIgnition(pos: Vector3, radius = 2.5): void {
    for (const b of this.fireShrine.braziers) {
      if (!b.isLit && Vector3.Distance(pos, b.node.position) < radius + 1.2) {
        b.ignite();
        EventBus.emit('ui:loot_toast', { text: '🔥 Mabet Meşalesi Yandı!' });
      }
    }
  }

  /**
   * Rüzgâr sütunu veya hamlesi tetiklendiğinde fırıldakları kontrol et
   */
  public checkWindBlow(pos: Vector3, radius = 5.0): void {
    const pw = this.windShrine.pinwheel;
    if (Vector3.Distance(pos, pw.node.position) < radius + 2.0) {
      pw.blowWind(1.5);
    }
  }

  /**
   * Aynayla etkileşim kontrolü
   */
  public checkInteract(playerPos: Vector3): boolean {
    return this.windShrine.interactWithMirror(playerPos);
  }

  public update(deltaTime: number, playerPos: Vector3, playerHeading: number): void {
    this.fireShrine.update(deltaTime, playerPos, playerHeading);
    this.windShrine.update(deltaTime, playerPos, playerHeading);
  }
}
