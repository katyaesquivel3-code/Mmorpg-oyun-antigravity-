/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Ateş Mabedi: "Köz Ocağı Sığınağı" (FireShrine)
 * (Zamanlı Meşaleler, Yanabilir Engeller, Basınç Plakası, İtilebilir Blok, Buz Erimesi & Sunak)
 */

import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { ShrineBase } from './ShrineBase';
import {
  TimedBrazier,
  PressurePlate,
  PushableBlock,
  ShrineDoor,
  ShrineChest,
  ShrineAltar
} from './ShrineComponents';
import { ElementSystem } from '../elements/ElementSystem';
import { EventBus } from '../infra/EventBus';

export class FireShrine extends ShrineBase {
  public braziers: TimedBrazier[] = [];
  public door: ShrineDoor;
  public pressurePlate: PressurePlate;
  public pushBlock: PushableBlock;
  public chest: ShrineChest;
  public altar: ShrineAltar;

  constructor(scene: Scene, elementSystem: ElementSystem) {
    // Demir Dağ etekleri (x: 135, y: 10, z: -75)
    super('fire_shrine', 'Köz Ocağı Sığınağı', new Vector3(135, 10, -75), scene);

    // 1. Üç Adet Zamanlı Meşale (14 sn içinde hepsi yakılmalı)
    const b1 = new TimedBrazier('fb_1', new Vector3(132, 10, -71), scene);
    const b2 = new TimedBrazier('fb_2', new Vector3(135, 10, -68), scene);
    const b3 = new TimedBrazier('fb_3', new Vector3(138, 10, -71), scene);
    this.braziers.push(b1, b2, b3);

    // 2. Mabet Kapısı (Meşaleler yanınca açılır)
    this.door = new ShrineDoor('fire_door', new Vector3(135, 10, -65), scene);

    // 3. Basınç Plakası ve İtilebilir Taş Blok
    this.pressurePlate = new PressurePlate('fire_plate', new Vector3(133, 10, -60), scene);
    this.pushBlock = new PushableBlock('fire_block', new Vector3(137, 10, -62), scene);

    // 4. Ganimet Sandığı
    this.chest = new ShrineChest('fire_chest', new Vector3(133, 10, -56), scene);

    // 5. Sandığın Önünü Kapatan Kadim Buz Bloğu (Ateşle erir)
    const iceMesh = MeshBuilder.CreateBox('fire_shrine_ice', { width: 2.2, height: 2.2, depth: 2.2 }, scene);
    iceMesh.position.set(133, 11, -58);
    const iceMat = new StandardMaterial('shrine_ice_mat', scene);
    iceMat.diffuseColor = new Color3(0.5, 0.8, 1.0);
    iceMat.alpha = 0.85;
    iceMesh.material = iceMat;

    elementSystem.iceObjects.push({
      id: 'shrine_fire_ice',
      position: new Vector3(133, 11, -58),
      radius: 1.8,
      meltProgress: 0,
      isMelted: false,
      onMelt: () => {
        iceMesh.dispose();
      }
    });

    // 6. Kam Taşı Sunan Altar
    this.altar = new ShrineAltar('fire_altar', new Vector3(135, 10, -52), scene);

    // Basınç plakasına blok gelince sandık kilidini aç
    this.pressurePlate.onTrigger = (isDown: boolean) => {
      if (isDown && !this.chest.isOpened) {
        this.chest.open();
        EventBus.emit('ui:loot_toast', { text: 'Sandık Kilidi Açıldı! (50 Kut Tozu, 5 Demir)' });
      }
    };
  }

  public override update(deltaTime: number, playerPos: Vector3, playerHeading: number): void {
    this.checkEntrance(playerPos);

    // Meşaleleri güncelle ve kontrol et
    let allLit = true;
    for (const b of this.braziers) {
      b.update(deltaTime);
      if (!b.isLit) allLit = false;
    }

    if (allLit && !this.door.isOpen) {
      this.door.open();
      EventBus.emit('ui:loot_toast', { text: 'Tüm Meşaleler Yandı! Mabet Kapısı Açıldı.' });
    }

    this.door.update(deltaTime);

    // Basınç plakasını oyuncu veya taş blokla tetikle
    const pushPos = this.pushBlock.position;
    this.pressurePlate.checkActivation([playerPos, pushPos]);
    this.pressurePlate.update(deltaTime);

    // Oyuncu bloğu itebilir
    this.pushBlock.tryPush(playerPos, playerHeading, 2.2, deltaTime);

    // Altar etkileşimi
    this.altar.update(deltaTime);
    if (!this.altar.isClaimed && Vector3.Distance(playerPos, this.altar.node.position) < 2.5) {
      if (this.door.isOpen && this.altar.claim()) {
        this.completeShrine();
      }
    }
  }
}
