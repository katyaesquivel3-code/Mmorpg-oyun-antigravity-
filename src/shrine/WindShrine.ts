/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Rüzgâr Mabedi: "Yel Ana Uçurumu" (WindShrine)
 * (Rüzgâr Fırıldağı, Termal Süzülüş Boşluğu, Hareketli Platform, Işık Aynası & Kristal Alıcı, Sunak)
 */

import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { ShrineBase } from './ShrineBase';
import {
  WindPinwheel,
  MovingPlatform,
  LightMirror,
  LightReceiver,
  ShrineDoor,
  ShrineChest,
  ShrineAltar
} from './ShrineComponents';
import { ElementSystem } from '../elements/ElementSystem';
import { EventBus } from '../infra/EventBus';

export class WindShrine extends ShrineBase {
  public pinwheel: WindPinwheel;
  public platform: MovingPlatform;
  public mirror: LightMirror;
  public receiver: LightReceiver;
  public door: ShrineDoor;
  public chest: ShrineChest;
  public altar: ShrineAltar;

  constructor(scene: Scene, elementSystem: ElementSystem) {
    // Gök Zirve etekleri (x: -125, y: 14, z: 135)
    super('wind_shrine', 'Yel Ana Uçurumu', new Vector3(-125, 14, 135), scene);

    // 1. Rüzgâr Fırıldağı (Yel Ana gücü ile döndürülür)
    this.pinwheel = new WindPinwheel('wind_pinwheel', new Vector3(-125, 14, 140), scene);

    // Fırıldak dönünce ilk mekanizma tetiklenir
    this.pinwheel.onActivate = () => {
      EventBus.emit('ui:loot_toast', { text: 'Rüzgâr Çarkı Döndü! Platform Harekete Geçti.' });
    };

    // 2. Hareketli Platform (Uçurum üzerinde salınır)
    this.platform = new MovingPlatform(
      'wind_platform',
      new Vector3(-125, 14, 146),
      new Vector3(-125, 14, 160),
      scene
    );

    // 3. Işık Yansıtma Aynası ve Kristal Alıcı
    this.mirror = new LightMirror('wind_mirror', new Vector3(-125, 14, 163), 0, scene);
    this.receiver = new LightReceiver('wind_receiver', new Vector3(-118, 15, 163), scene);

    this.receiver.onPowerStateChange = (powered: boolean) => {
      if (powered && !this.door.isOpen) {
        this.door.open();
        EventBus.emit('ui:loot_toast', { text: 'Kadim Işık Kristale Ulaştı! Mabet Kapısı Açıldı.' });
      }
    };

    // 4. Mabet Kapısı
    this.door = new ShrineDoor('wind_door', new Vector3(-125, 14, 168), scene);

    // 5. Ganimet Sandığı ve Sunak
    this.chest = new ShrineChest('wind_chest', new Vector3(-122, 14, 172), scene);
    this.altar = new ShrineAltar('wind_altar', new Vector3(-125, 14, 175), scene);

    // Uçurumun ortasına kalıcı hafif bir rüzgâr sütunu ekle (Süzülmeyi destekler)
    elementSystem.createUpdraft(new Vector3(-125, 13, 150), 5.5, 20.0, -1, 10.0);
  }

  public override update(deltaTime: number, playerPos: Vector3, playerHeading: number): void {
    this.checkEntrance(playerPos);

    // Fırıldak ve Platform Güncellemesi
    this.pinwheel.update(deltaTime);
    this.platform.update(deltaTime);

    // Işık demeti simülasyonu: Aynanın açısı kontrol edilir
    // Eğer ayna yaklaşık 45 veya 135 dereceye çevrilmişse ışığı doğu duvarındaki kristale yansıtır
    const normAngle = ((this.mirror.rotationAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const targetAngle = Math.PI * 0.25; // 45 derece
    const isAngleCorrect = Math.abs(normAngle - targetAngle) < 0.25 || Math.abs(normAngle - targetAngle - Math.PI) < 0.25;

    this.receiver.setPowered(isAngleCorrect);

    this.door.update(deltaTime);
    this.altar.update(deltaTime);

    // Oyuncu aynanın yanına gelip dokunursa ayna döner (2.2m mesafe)
    // (Ayna etkileşimi için buton veya yakınlaşma)

    // Sandık açma kontrolü
    if (!this.chest.isOpened && Vector3.Distance(playerPos, this.chest.node.position) < 2.5) {
      this.chest.open();
      EventBus.emit('ui:loot_toast', { text: 'Sandık Açıldı! (60 Kut Tozu, 10 Keskin Ok)' });
    }

    // Altar etkileşimi
    if (!this.altar.isClaimed && Vector3.Distance(playerPos, this.altar.node.position) < 2.5) {
      if (this.door.isOpen && this.altar.claim()) {
        this.completeShrine();
      }
    }
  }

  /**
   * Aynayı oyuncu etkileşimiyle çevirir
   */
  public interactWithMirror(playerPos: Vector3): boolean {
    if (Vector3.Distance(playerPos, this.mirror.node.position) < 3.2) {
      this.mirror.rotateMirror();
      EventBus.emit('ui:loot_toast', { text: 'Ayna Döndürüldü!' });
      return true;
    }
    return false;
  }
}
