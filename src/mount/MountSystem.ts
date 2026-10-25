/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Binek ve Atlı Okçuluk Sistemi (MountSystem)
 * (Yabani At Evcilleştirme, Dörtnala, At Sırtında Yay Atışı, Islıkla Çağırma & Efsanevi TULPAR Uçuşu)
 */

import {
  Scene,
  Vector3,
  ShadowGenerator,
  Scalar
} from '@babylonjs/core';
import { TulparModel } from './TulparModel';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { WorldManager } from '../world/WorldManager';
import { WildlifeManager, WildlifeEntity } from '../world/WildlifeManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export type MountType = 'NONE' | 'HORSE' | 'TULPAR';

export class MountSystem {
  public scene: Scene;
  public world: WorldManager;
  public tulpar: TulparModel;

  // Aktif Binek Durumu
  public currentMount: MountType = 'NONE';
  public isMounted = false;

  // Binek Konum ve Hız Fizikleri
  public position: Vector3 = new Vector3(0, 0, 0);
  public headingAngle = 0;
  public currentSpeed = 0;
  public verticalVelocity = 0;
  public isAirborne = false;

  // At Dayanıklılığı (Dörtnala için 3 mahmuz)
  public horseStamina = 100.0;
  public maxHorseStamina = 100.0;
  public isGalloping = false;

  // Tulpar Kanat Soluğu (Uçuş/Süzülme Sayacı)
  public tulparWingStamina = 100.0;
  public readonly MAX_WING_STAMINA = 100.0;
  public isTulparFlying = false;
  public isTulparUnlocked = false;

  // Evcilleştirilmiş At Referansı
  public activeTamedHorseId: string | null = null;

  // Adım ve Nal Ses Zamanlayıcısı
  private gallopSoundTimer = 0;

  constructor(scene: Scene, world: WorldManager, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.world = world;

    // Tulpar Modelini Yarat
    this.tulpar = new TulparModel(scene, shadowGen);
    this.tulpar.root.setEnabled(false);

    // ?debug=1 ise Tulpar'ı aç
    if (window.location.search.includes('debug=1')) {
      this.isTulparUnlocked = true;
    }
  }

  /**
   * FAZ 9: Tulpar'ı kalıcı olarak açar
   */
  public unlockTulparPermanently(): void {
    this.isTulparUnlocked = true;
    EventBus.emit('achievement:unlock', { id: 'TULPAR_RIDER' });
    EventBus.emit('ui:loot_toast', { text: '🪽 EFSANEVİ TULPAR KAZANILDI! (Artık kalıcı olarak çağırılabilir)' });
  }

  /**
   * Islıkla Binek Çağırma (HUD düdüğü veya 'H' tuşu)
   */
  public callMount(playerPos: Vector3): void {
    ProceduralAudio.playHorseWhistle();

    // Öncelik Tulpar'da (Açıksa) veya Evcil At'ta
    const type: MountType = this.isTulparUnlocked ? 'TULPAR' : 'HORSE';

    // Oyuncunun 4m arkasında beliriş
    const spawnX = playerPos.x - 3.5;
    const spawnZ = playerPos.z - 3.5;
    const spawnY = this.world.getHeightAt(spawnX, spawnZ);

    this.position.set(spawnX, spawnY, spawnZ);

    if (type === 'TULPAR') {
      this.tulpar.setWingsVisible(true);
      this.tulpar.root.position.copyFrom(this.position);
      this.tulpar.root.setEnabled(true);
      ProceduralAudio.playTulparWingFlap();
      EventBus.emit('ui:loot_toast', { text: '🪽 Efsanevi TULPAR Göğe Süzüldü ve Yanına Geldi!' });
    } else {
      this.tulpar.setWingsVisible(false);
      this.tulpar.root.position.copyFrom(this.position);
      this.tulpar.root.setEnabled(true);
      ProceduralAudio.playHorseWhinny();
      EventBus.emit('ui:loot_toast', { text: '🐎 Sadık Bozkır Atı Islığını Duydu!' });
    }
  }

  /**
   * Yabani Ata Binme veya Tulpar'a Binme
   */
  public mount(type: 'HORSE' | 'TULPAR', player: PlayerController): boolean {
    if (this.isMounted) return false;

    this.currentMount = type;
    this.isMounted = true;
    player.isMounted = true;
    player.locomotionState = 'GROUND';

    this.tulpar.root.setEnabled(true);
    if (type === 'TULPAR') {
      this.tulpar.setWingsVisible(true);
      this.tulparWingStamina = this.MAX_WING_STAMINA;
    } else {
      this.tulpar.setWingsVisible(false);
    }

    ProceduralAudio.playButtonClick();
    EventBus.emit('mount:mount', { mountType: type });
    EventBus.emit('ui:loot_toast', { text: `${type === 'TULPAR' ? 'TULPAR' : 'AT'} Sırtına Binildi!` });

    return true;
  }

  /**
   * Binekten İnme
   */
  public dismount(player: PlayerController): void {
    if (!this.isMounted) return;

    this.isMounted = false;
    player.isMounted = false;
    this.isGalloping = false;
    this.isTulparFlying = false;

    // Oyuncuyu atın yanına indir
    player.position.set(this.position.x + 1.2, this.position.y, this.position.z);
    player.model.root.position.copyFrom(player.position);

    EventBus.emit('mount:dismount');
    EventBus.emit('ui:loot_toast', { text: 'Binek Terk Edildi.' });
  }

  /**
   * Yakındaki Yabani Atı Kontrol Et ve Binme İstemi Sun
   */
  public checkWildHorseMount(playerPos: Vector3, wildlife: WildlifeManager): WildlifeEntity | null {
    if (this.isMounted) return null;

    for (const a of wildlife.animals) {
      if (a.species === 'AT' && !a.isDead) {
        const dist = Vector3.Distance(playerPos, a.position);
        if (dist < 2.8) {
          return a;
        }
      }
    }
    return null;
  }

  /**
   * Binek Hareket ve Fizik Güncellemesi (Her Kare)
   */
  public update(
    inputMagnitude: number,
    inputX: number,
    inputY: number,
    cameraYaw: number,
    isSprintRequested: boolean,
    isJumpRequested: boolean,
    player: PlayerController,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    if (!this.isMounted) return;

    const groundY = this.world.getHeightAt(this.position.x, this.position.z);

    // Dörtnala (Gallop) Kontrolü
    this.isGalloping = isSprintRequested && this.horseStamina > 10;
    if (this.isGalloping) {
      this.horseStamina = Math.max(0, this.horseStamina - 15.0 * deltaTime);
    } else {
      this.horseStamina = Math.min(this.maxHorseStamina, this.horseStamina + 12.0 * deltaTime);
    }

    // Hedef Hızlar: Yürüme (4.2 m/s), Tırıs (8.5 m/s), Dörtnala (15.5 m/s)
    let targetSpeed = 0;
    if (inputMagnitude > 0.05) {
      if (this.currentMount === 'TULPAR' && this.isTulparFlying) {
        targetSpeed = 16.5; // Uçuş hızı
      } else {
        targetSpeed = this.isGalloping ? 15.5 : 8.2;
      }
    }

    this.currentSpeed = Scalar.Lerp(this.currentSpeed, targetSpeed, Math.min(1.0, deltaTime * 5.0));

    // Yönlenme
    if (inputMagnitude > 0.05) {
      const targetAngle = cameraYaw + Math.atan2(inputX, inputY);
      this.headingAngle = Scalar.Lerp(this.headingAngle, targetAngle, Math.min(1.0, deltaTime * 4.5));
    }

    // İlerleme Vektörü
    const fX = Math.sin(this.headingAngle);
    const fZ = Math.cos(this.headingAngle);

    this.position.x += fX * this.currentSpeed * deltaTime;
    this.position.z += fZ * this.currentSpeed * deltaTime;

    // Tulpar Uçuş / Zıplama Mantığı
    if (this.currentMount === 'TULPAR') {
      if (isJumpRequested && !this.isTulparFlying && this.tulparWingStamina > 20) {
        this.isTulparFlying = true;
        this.verticalVelocity = 12.0; // Göğe sıçrama
        ProceduralAudio.playTulparWingFlap();
      }

      if (this.isTulparFlying) {
        this.tulparWingStamina = Math.max(0, this.tulparWingStamina - 12.0 * deltaTime);
        if (this.tulparWingStamina <= 0) {
          // Kanat soluğu bitti: yumuşak alçalma
          this.verticalVelocity = -2.0;
        } else {
          this.verticalVelocity = Scalar.Lerp(this.verticalVelocity, -0.6, deltaTime * 2.0); // Yavaş süzülüş
        }

        this.position.y += this.verticalVelocity * deltaTime;

        // Yere temas
        if (this.position.y <= groundY + 0.2) {
          this.position.y = groundY;
          this.isTulparFlying = false;
          this.verticalVelocity = 0;
        }
      } else {
        this.position.y = groundY;
      }
    } else {
      // Normal At Yer Fiziği
      this.position.y = groundY;
    }

    // Binek (At / Tulpar) Model Konum ve Animasyonu
    this.tulpar.root.position.copyFrom(this.position);
    this.tulpar.root.rotation.y = this.headingAngle;
    this.tulpar.updateAnimation(this.currentSpeed, this.isTulparFlying, this.isAirborne, deltaTime);

    // Nal ve Adım Sesleri
    if (this.currentSpeed > 2.0 && !this.isTulparFlying) {
      this.gallopSoundTimer += deltaTime * (this.isGalloping ? 14 : 7);
      if (this.gallopSoundTimer >= Math.PI) {
        this.gallopSoundTimer = 0;
        ProceduralAudio.playHorseGallop();
      }
    }

    // Oyuncuyu Bineğin Üstüne Kilitle (Eyer Hizası: +1.65m)
    player.position.set(this.position.x, this.position.y + 1.65, this.position.z);
    player.model.root.position.copyFrom(player.position);
    player.headingAngle = this.headingAngle;
  }
}
