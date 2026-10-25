/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kam Ata'nın 2 Telli Kopuzu & Pentatonik Ezgiler Sistemi (KopuzSystem)
 * (5 Telli Pentatonik DOM Pad, 6 Kutsal Ezgi: Gün, Yel, Yağmur, Börü, Tulpar, Kut;
 *  Gerçek Zamanlı Dünya Değişimi, Karplus-Strong Tınısı, Runic Parçacıklar & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  ParticleSystem,
  Color4,
  Mesh,
  MeshBuilder
} from '@babylonjs/core';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { MountSystem } from '../mount/MountSystem';
import { SkySystem } from '../world/SkySystem';
import { WeatherSystem } from '../world/WeatherSystem';
import { WindField } from '../world/WindField';
import { BoruCompanion } from '../player/BoruCompanion';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { AchievementManager } from '../story/AchievementManager';
import { EventBus } from '../infra/EventBus';

export type PentatonicNote = 'A' | 'C' | 'D' | 'E' | 'G';

export interface LearnedMelody {
  id: string;
  nameTr: string;
  sequence: PentatonicNote[];
  descriptionTr: string;
  isUnlocked: boolean;
}

export class KopuzSystem {
  private static instance: KopuzSystem | null = null;
  public scene: Scene;

  // Çalınan Son Notalar Tamponu (Son 8 nota)
  public playedNotesBuffer: PentatonicNote[] = [];
  public isPlaying = false;

  // 6 Kutsal Ezgi ve Doğrulama Dizilimleri
  public melodies: LearnedMelody[] = [
    {
      id: 'SONG_GUN',
      nameTr: 'Gün Ezgisi',
      sequence: ['D', 'G', 'E', 'D'],
      descriptionTr: 'Zamanın çarkını çevirir: Şafağı geceye, geceyi altın şafağa sürer.',
      isUnlocked: true
    },
    {
      id: 'SONG_YEL',
      nameTr: 'Yel Ezgisi',
      sequence: ['A', 'C', 'D', 'E'],
      descriptionTr: 'Yel Ana’nın nefesini çağırır: Rüzgâr yönünü baktığın yöne çevirir.',
      isUnlocked: true
    },
    {
      id: 'SONG_YAGMUR',
      nameTr: 'Yağmur Ezgisi',
      sequence: ['G', 'E', 'D', 'C'],
      descriptionTr: 'Bulutları toplar ya da dağıtır: Bozkıra yağmur yağdırır veya göğü açar.',
      isUnlocked: true
    },
    {
      id: 'SONG_BORU',
      nameTr: 'Börü Ezgisi',
      sequence: ['A', 'E', 'D', 'A'],
      descriptionTr: 'Gök Kurt’a seslenir: Nerede olursa olsun Börü’yü anında yanına çağırır.',
      isUnlocked: true
    },
    {
      id: 'SONG_TULPAR',
      nameTr: 'Tulpar Ezgisi',
      sequence: ['C', 'D', 'G', 'E'],
      descriptionTr: 'Efsanevi kanatlı at Tulpar’ı çağırır ve kanat soluğunu tamamen tazeler.',
      isUnlocked: true
    },
    {
      id: 'SONG_KUT',
      nameTr: 'Kut Ezgisi',
      sequence: ['E', 'G', 'A', 'C', 'D', 'E'],
      descriptionTr: 'Bay Terek’in kutsal nurunu uyandırır: Tüm obayı ve ruhları arındırır.',
      isUnlocked: true
    }
  ];

  // 3D Runik Parçacık Sistemi
  private emitterMesh: Mesh;
  private particleSystem: ParticleSystem;

  public static getInstance(scene?: Scene): KopuzSystem {
    if (!KopuzSystem.instance && scene) {
      KopuzSystem.instance = new KopuzSystem(scene);
    }
    return KopuzSystem.instance!;
  }

  constructor(scene: Scene) {
    this.scene = scene;

    // Görünmez emitter kutusu (TransformNode yerine AbstractMesh tip uyumu)
    this.emitterMesh = MeshBuilder.CreateBox('kopuz_emitter_box', { size: 0.1 }, scene);
    this.emitterMesh.isVisible = false;

    this.particleSystem = new ParticleSystem('kopuz_runes', 75, scene);
    this.initParticles();
  }

  private initParticles(): void {
    const ps = this.particleSystem;
    ps.emitter = this.emitterMesh;
    ps.minEmitBox = new Vector3(-0.7, 0.3, -0.7);
    ps.maxEmitBox = new Vector3(0.7, 1.9, 0.7);

    // Kutsal Altın ve Tengri Mavisi
    ps.color1 = new Color4(1.0, 0.85, 0.25, 0.95);
    ps.color2 = new Color4(0.3, 0.8, 1.0, 0.95);
    ps.colorDead = new Color4(0.05, 0.1, 0.2, 0.0);

    ps.minSize = 0.16;
    ps.maxSize = 0.42;
    ps.minLifeTime = 1.0;
    ps.maxLifeTime = 2.0;
    ps.emitRate = 35;
    ps.gravity = new Vector3(0, 0.5, 0);
    ps.minEmitPower = 0.2;
    ps.maxEmitPower = 0.8;
  }

  /**
   * DOM Pad Üzerinden Bir Nota Çalındığında Tetiklenir
   */
  public playNote(
    note: PentatonicNote,
    player: PlayerController,
    combat: CombatSystem,
    kamPower: KamPowerManager,
    mountSystem: MountSystem,
    sky?: SkySystem,
    weather?: WeatherSystem,
    boru?: BoruCompanion
  ): LearnedMelody | null {
    // 1. Karplus-Strong Pentatonik Tınıyı Çal
    const freqs: Record<PentatonicNote, number> = {
      A: 220.0,
      C: 261.63,
      D: 293.66,
      E: 329.63,
      G: 392.0
    };

    ProceduralAudio.playKopuzPluck(freqs[note], 0.7);

    // İlk Ezgi/Nota Başarımını Aç
    AchievementManager.getInstance().unlock('ACH_KOPUZ_SONG');

    // 2. Tampona Ekle
    this.playedNotesBuffer.push(note);
    if (this.playedNotesBuffer.length > 8) {
      this.playedNotesBuffer.shift();
    }

    // 3. Parçacık Efektini Konumlandır
    this.emitterMesh.position.copyFrom(player.position);
    this.particleSystem.start();
    setTimeout(() => this.particleSystem.stop(), 800);

    // 4. Ezgi Eşleşmesini Kontrol Et
    const matched = this.checkMelodyMatch();
    if (matched) {
      this.triggerWorldTransformation(
        matched,
        player,
        combat,
        kamPower,
        mountSystem,
        sky,
        weather,
        boru
      );
      this.playedNotesBuffer = []; // Eşleşince tamponu sıfırla
      return matched;
    }

    return null;
  }

  /**
   * Tamponun Son Notalarının Bir Ezgiyle Eşleşip Eşleşmediğini Denetler
   * (En uzun ezgiyi -örn. 6 notalı Kut Ezgisi- 4 notalı ezgilerden önce kontrol eder)
   */
  private checkMelodyMatch(): LearnedMelody | null {
    const sortedMelodies = [...this.melodies].sort((a, b) => b.sequence.length - a.sequence.length);

    for (const melody of sortedMelodies) {
      if (!melody.isUnlocked) continue;

      const seqLen = melody.sequence.length;
      if (this.playedNotesBuffer.length < seqLen) continue;

      const recentNotes = this.playedNotesBuffer.slice(-seqLen);
      const isMatch = melody.sequence.every((n, i) => n === recentNotes[i]);

      if (isMatch) {
        return melody;
      }
    }
    return null;
  }

  /**
   * DOĞRU DİZİLİMDE DÜNYA GERÇEKTEN DEĞİŞİR!
   */
  public triggerWorldTransformation(
    melody: LearnedMelody,
    player: PlayerController,
    combat: CombatSystem,
    kamPower: KamPowerManager,
    mountSystem: MountSystem,
    sky?: SkySystem,
    weather?: WeatherSystem,
    boru?: BoruCompanion
  ): void {
    ProceduralAudio.playBenguResonance();

    switch (melody.id) {
      case 'SONG_GUN': {
        // Zamanı Sabaha veya Akşama Sürer
        if (sky) {
          const isNight = sky.isNight();
          sky.timeOfDay = isNight ? 0.35 : 0.85; // Sabah şafağı veya akşam alacası
          EventBus.emit('world:time_change', { time: sky.timeOfDay * 24 });
          EventBus.emit('ui:loot_toast', {
            text: `☀️ GÜN EZGİSİ: Zaman ileri sarıldı (${isNight ? 'Şafak Söktü' : 'Karanlık Bastı'})!`
          });
        }
        break;
      }

      case 'SONG_YEL': {
        // Rüzgâr Yönünü Oyuncunun Baktığı Yöne Çevirir
        const wind = WindField.getInstance();
        wind.directionAngle = player.headingAngle;
        EventBus.emit('world:wind_change', { direction: wind.directionAngle });
        ProceduralAudio.playWindGust();
        EventBus.emit('ui:loot_toast', { text: '💨 YEL EZGİSİ: Rüzgâr yönü baktığın ufka döndü!' });
        break;
      }

      case 'SONG_YAGMUR': {
        // Havayı Yağmurlu Yapar veya Dindirir
        if (weather) {
          if (weather.currentWeather === 'RAIN' || weather.currentWeather === 'STORM') {
            weather.currentWeather = 'CLEAR';
            EventBus.emit('ui:loot_toast', { text: '🌤️ YAĞMUR EZGİSİ: Bulutlar dağıldı, gök açıldı!' });
          } else {
            weather.currentWeather = 'RAIN';
            ProceduralAudio.playThunderBoom();
            EventBus.emit('ui:loot_toast', { text: '🌧️ YAĞMUR EZGİSİ: Bereketli bozkır yağmuru başladı!' });
          }
          EventBus.emit('world:weather_change', { weatherType: weather.currentWeather });
        }
        break;
      }

      case 'SONG_BORU': {
        // Börü'yü Nerede Olursa Olsun Oyuncunun Yanına Işınlar
        if (boru) {
          boru.position.set(player.position.x - 2.5, player.position.y, player.position.z - 2.0);
          boru.root.position.copyFrom(boru.position);
          ProceduralAudio.playWolfHowl();
          EventBus.emit('ui:loot_toast', { text: '🐺 BÖRÜ EZGİSİ: Gök Kurt uluyarak yanına koştu!' });
        }
        break;
      }

      case 'SONG_TULPAR': {
        // Tulpar'ı Çağırır ve Kanat Soluğunu Yineler
        mountSystem.callMount(player.position);
        mountSystem.tulparWingStamina = mountSystem.MAX_WING_STAMINA;
        EventBus.emit('ui:loot_toast', { text: '🪽 TULPAR EZGİSİ: Tulpar geldi, kanat soluğu %100 doldu!' });
        break;
      }

      case 'SONG_KUT': {
        // Kutsal Bay Terek Işığı & Tam Arınma
        kamPower.restoreKutPower(100.0);
        combat.health = combat.maxHealth;
        combat.stamina = combat.maxStamina;
        ProceduralAudio.playKutAcquired();
        EventBus.emit('ui:loot_toast', { text: '✨ KUT EZGİSİ: Bay Terek nurlandı, tüm oba şifalandı!' });
        break;
      }
    }
  }

  public update(playerPos: Vector3, deltaTime: number): void {
    this.emitterMesh.position.copyFrom(playerPos);
  }
}
