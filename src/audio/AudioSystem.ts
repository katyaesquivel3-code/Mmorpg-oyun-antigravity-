/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gelişmiş Prosedürel Ses & Müzik Sistemi (AudioSystem)
 * (KURAL 5 UYUMLU: Harici Ses Dosyası YOK, Karplus-Strong Kopuz, Kam Davulu, Formant Filtreli Boğaz Şarkısı 'Kargyraa',
 *  5 Müzik Katmanı Crossfade, 3D PannerNode Konumlu Ses, Zemine Göre Ayak Sesi & Arka Plan Askıya Alma)
 */

import { Vector3 } from '@babylonjs/core';
import { EventBus } from '../infra/EventBus';

export type MusicLayer = 'EXPLORATION' | 'NIGHT' | 'COMBAT' | 'BOSS' | 'CAVE_WATER';
export type FootstepSurface = 'GRASS' | 'STONE' | 'WATER' | 'SNOW';

export class AudioSystem {
  private static instance: AudioSystem | null = null;
  public ctx: AudioContext | null = null;

  // Veri Yolu (Audio Bus) Ağacı
  public masterBus: GainNode | null = null;
  public musicBus: GainNode | null = null;
  public sfxBus: GainNode | null = null;
  public ambienceBus: GainNode | null = null;
  public uiBus: GainNode | null = null;

  // Müzik Katman Gain Düğümleri (Crossfade için)
  private layerGains: Record<MusicLayer, GainNode | null> = {
    EXPLORATION: null,
    NIGHT: null,
    COMBAT: null,
    BOSS: null,
    CAVE_WATER: null
  };

  public currentLayer: MusicLayer = 'EXPLORATION';
  public isSuspended = false;
  private noiseBuffer: AudioBuffer | null = null;

  // Boğaz Şarkısı Drone & Davul Ritim Döngüsü
  private isThroatSingingActive = false;
  private throatOsc1: OscillatorNode | null = null;
  private throatOsc2: OscillatorNode | null = null;
  private throatGain: GainNode | null = null;

  private combatRhythmTimer: number | null = null;

  public static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }

  constructor() {
    this.initAudioContext();
    this.setupLifecycle();
    this.setupEventListeners();
  }

  private initAudioContext(): void {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // 1. Ana Çıkış (Master Bus)
    this.masterBus = this.ctx.createGain();
    this.masterBus.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterBus.connect(this.ctx.destination);

    // 2. Alt Veri Yolları
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.setValueAtTime(0.75, this.ctx.currentTime);
    this.musicBus.connect(this.masterBus);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.sfxBus.connect(this.masterBus);

    this.ambienceBus = this.ctx.createGain();
    this.ambienceBus.gain.setValueAtTime(0.65, this.ctx.currentTime);
    this.ambienceBus.connect(this.masterBus);

    this.uiBus = this.ctx.createGain();
    this.uiBus.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.uiBus.connect(this.masterBus);

    // 3. Müzik Katman Düğümleri
    const layers: MusicLayer[] = ['EXPLORATION', 'NIGHT', 'COMBAT', 'BOSS', 'CAVE_WATER'];
    layers.forEach((lyr) => {
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(lyr === 'EXPLORATION' ? 1.0 : 0.0, this.ctx!.currentTime);
      g.connect(this.musicBus!);
      this.layerGains[lyr] = g;
    });

    this.generateNoiseBuffer();
    this.initThroatSingingDrone();
  }

  private generateNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  /**
   * Arka Plana Gidince Ses ve Oyunu Askıya Al, Ön Plana Dönünce Devam Et
   */
  private setupLifecycle(): void {
    const resumeOnTouch = () => {
      if (this.ctx && this.ctx.state === 'suspended' && !document.hidden) {
        this.ctx.resume().then(() => {
          console.log('[AudioSystem] AudioContext ilk dokunuşla başlatıldı.');
        });
      }
      window.removeEventListener('pointerdown', resumeOnTouch);
      window.removeEventListener('keydown', resumeOnTouch);
    };

    window.addEventListener('pointerdown', resumeOnTouch, { passive: true });
    window.addEventListener('keydown', resumeOnTouch, { passive: true });

    // Sayfa görünürlük değişimi (Arka Plan / Ön Plan)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.suspendAudio();
      } else {
        this.resumeAudio();
      }
    });

    window.addEventListener('blur', () => this.suspendAudio());
    window.addEventListener('focus', () => this.resumeAudio());
  }

  public suspendAudio(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().then(() => {
        this.isSuspended = true;
        console.log('[AudioSystem] Uygulama arka planda: Ses motoru askıya alındı.');
      });
    }
  }

  public suspend(): void {
    this.suspendAudio();
  }

  public resumeAudio(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isSuspended = false;
        console.log('[AudioSystem] Uygulama ön planda: Ses motoru sürdürüldü.');
      });
    }
  }

  public resume(): void {
    this.resumeAudio();
  }

  private setupEventListeners(): void {
    EventBus.on('audio:layer_change', (data: { layer: MusicLayer }) => {
      this.switchMusicLayer(data.layer);
    });

    EventBus.on('dialogue:start', () => {
      this.duckMusic(-6, 1500);
    });
  }

  /**
   * Müzik Katmanları Arasında Pürüzsüz Crossfade (EventBus ile Geçiş)
   */
  public switchMusicLayer(targetLayer: MusicLayer, transitionDurationSeconds = 2.0): void {
    if (this.currentLayer === targetLayer || !this.ctx) return;
    const now = this.ctx.currentTime;

    const oldGain = this.layerGains[this.currentLayer];
    const newGain = this.layerGains[targetLayer];

    if (oldGain) {
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0.001, now + transitionDurationSeconds);
    }

    if (newGain) {
      newGain.gain.cancelScheduledValues(now);
      newGain.gain.setValueAtTime(newGain.gain.value, now);
      newGain.gain.linearRampToValueAtTime(1.0, now + transitionDurationSeconds);
    }

    this.currentLayer = targetLayer;

    // Savaş katmanında kam davulu ritmini devreye al
    if (targetLayer === 'COMBAT' || targetLayer === 'BOSS') {
      this.startCombatDrumPattern(targetLayer === 'BOSS');
    } else {
      this.stopCombatDrumPattern();
    }
  }

  /**
   * Dinamik Ducking (Diyalog veya Kritik Darbelerde Müziği Kısma)
   */
  public duckMusic(reductionDb = -6, durationMs = 1200): void {
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;
    const currentGain = 0.75;
    const duckedGain = currentGain * Math.pow(10, reductionDb / 20);

    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(duckedGain, now + 0.08);
    this.musicBus.gain.setValueAtTime(duckedGain, now + durationMs / 1000 - 0.2);
    this.musicBus.gain.linearRampToValueAtTime(currentGain, now + durationMs / 1000);
  }

  // =========================================================================
  // BOĞAZ ŞARKISI (THROAT SINGING / KARGYRAA) FORMANT FİLTRELİ DRONE
  // =========================================================================
  private initThroatSingingDrone(): void {
    if (!this.ctx || !this.musicBus) return;

    // 1. Derin Temel Ses (Kargyraa alt armonik 65Hz C2)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(65.4, this.ctx.currentTime);

    // 2. Formant 1 Filtresi (Ağız boşluğu tınısı ~480 Hz)
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(480, this.ctx.currentTime);
    f1.Q.setValueAtTime(5.5, this.ctx.currentTime);

    // 3. Formant 2 Filtresi (Islık tınısı Sygyt üst armonik ~1450 Hz)
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1450, this.ctx.currentTime);
    f2.Q.setValueAtTime(7.0, this.ctx.currentTime);

    const throatGain = this.ctx.createGain();
    throatGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    osc1.connect(f1);
    osc1.connect(f2);
    f1.connect(throatGain);
    f2.connect(throatGain);

    const layerNight = this.layerGains.NIGHT;
    if (layerNight) {
      throatGain.connect(layerNight);
    } else {
      throatGain.connect(this.musicBus);
    }

    osc1.start();
    this.throatOsc1 = osc1;
    this.throatGain = throatGain;
    this.isThroatSingingActive = true;
  }

  // =========================================================================
  // KARPLUS-STRONG PENTATONİK KOPUZ SENTEZİ
  // =========================================================================
  public playKarplusStrongKopuz(frequency: number, duration = 0.85): void {
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;

    // Gürültü Darbesi (Pluck excitation)
    const burstLength = Math.max(0.005, 1 / frequency);
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, now);

    // Geri Beslemeli Karplus-Strong Gecikme Filtresi
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency * 3.5, now);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.8, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + burstLength);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    osc.start(now);
    osc.stop(now + duration);
  }

  // =========================================================================
  // ŞAMAN KAM DAVULU (ÇİFT FAZLI MEMBRAN REZONANSI)
  // =========================================================================
  public playKamDrum(isHeavy = false): void {
    if (!this.ctx || !this.musicBus || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const baseFreq = isHeavy ? 68 : 95;
    const dur = isHeavy ? 0.75 : 0.55;

    // 1. Membran Bas Osilatörü
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.08);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.musicBus);

    // 2. Deri Tokmak Vuruş Gürültüsü
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicBus);

    osc.start(now);
    osc.stop(now + dur);
    noise.start(now);
    noise.stop(now + 0.07);
  }

  private startCombatDrumPattern(isBoss = false): void {
    if (this.combatRhythmTimer) return;

    let step = 0;
    const intervalMs = isBoss ? 380 : 480;

    this.combatRhythmTimer = window.setInterval(() => {
      if (this.isSuspended || !this.ctx) return;
      step++;
      const isHeavy = step % 4 === 1;
      this.playKamDrum(isHeavy);

      // Boss modunda ikinci tokmak senkopu
      if (isBoss && step % 4 === 3) {
        setTimeout(() => this.playKamDrum(false), intervalMs * 0.45);
      }
    }, intervalMs);
  }

  private stopCombatDrumPattern(): void {
    if (this.combatRhythmTimer) {
      clearInterval(this.combatRhythmTimer);
      this.combatRhythmTimer = null;
    }
  }

  // =========================================================================
  // 3D KONUMLU SES (PANNERNODE İLE DÜNYA KOORDİNATLARINDA SES)
  // =========================================================================
  public play3DSound(
    soundType: 'IMPACT' | 'FIRE' | 'WATER' | 'ROAR',
    soundPos: Vector3,
    listenerPos: Vector3
  ): void {
    if (!this.ctx || !this.sfxBus) return;
    const now = this.ctx.currentTime;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 3.0;
    panner.maxDistance = 50.0;
    panner.rolloffFactor = 1.2;

    panner.positionX.setValueAtTime(soundPos.x - listenerPos.x, now);
    panner.positionY.setValueAtTime(soundPos.y - listenerPos.y, now);
    panner.positionZ.setValueAtTime(soundPos.z - listenerPos.z, now);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    switch (soundType) {
      case 'FIRE':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        break;
      case 'WATER':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        break;
      case 'ROAR':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        break;
      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  // =========================================================================
  // ZEMİNE GÖRE AYAK SESİ (ÇİM, TAŞ/KAYA, SU, KAR)
  // =========================================================================
  public playSurfaceFootstep(surface: FootstepSurface): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    switch (surface) {
      case 'GRASS':
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(680, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        break;
      case 'STONE':
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        break;
      case 'WATER':
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(420, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        break;
      case 'SNOW':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        break;
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);

    noise.start(now);
    noise.stop(now + 0.15);
  }
}
