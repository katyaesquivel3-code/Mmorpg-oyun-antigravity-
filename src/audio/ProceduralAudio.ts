/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Prosedürel Web Audio API Ses Motoru (Harici dosya yok, saf matematik ve osilatörler)
 */

export class ProceduralAudio {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static musicGain: GainNode | null = null;
  private static sfxGain: GainNode | null = null;
  private static ambienceGain: GainNode | null = null;
  private static uiGain: GainNode | null = null;
  private static noiseBuffer: AudioBuffer | null = null;
  private static isUnlocked = false;
  private static kutDroneOsc: OscillatorNode | null = null;
  private static kutDroneGain: GainNode | null = null;

  // Ses Düzeyleri (0.0 - 1.0)
  private static currentMasterVol = 0.85;
  private static currentMusicVol = 0.8;
  private static currentSfxVol = 0.9;
  private static currentAmbienceVol = 0.7;

  // Ortam ses üreteci
  private static isAmbienceRunning = false;
  private static ambienceSource: AudioBufferSourceNode | null = null;
  private static ambienceFilter: BiquadFilterNode | null = null;
  private static ambienceVolumeNode: GainNode | null = null;
  private static droneOsc: OscillatorNode | null = null;
  private static underwaterFilter: BiquadFilterNode | null = null;

  public static init(): void {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.currentMasterVol * this.currentMasterVol, this.ctx.currentTime);
    this.underwaterFilter = this.ctx.createBiquadFilter();
    this.underwaterFilter.type = 'lowpass';
    this.underwaterFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
    this.masterGain.connect(this.underwaterFilter);
    this.underwaterFilter.connect(this.ctx.destination);

    // Ses Veri Yolu (Audio Bus) Ağacı
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.currentMusicVol * this.currentMusicVol, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.currentSfxVol * this.currentSfxVol, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.setValueAtTime(this.currentAmbienceVol * this.currentAmbienceVol, this.ctx.currentTime);
    this.ambienceGain.connect(this.masterGain);

    this.uiGain = this.ctx.createGain();
    this.uiGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.uiGain.connect(this.masterGain);

    this.generateNoiseBuffer();

    const unlock = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
        });
      } else {
        this.isUnlocked = true;
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private static generateNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private static ensureContext(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  public static suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  public static resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Kam Kılıcı savurma sesi (kombo adımına göre ton ve rezonans değişir)
   */
  public static playSwordSwing(comboStep = 1): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const baseFreq = comboStep === 1 ? 520 : comboStep === 2 ? 640 : 820;
    const duration = comboStep === 3 ? 0.28 : 0.22;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + duration);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.8, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + duration);
    filter.Q.setValueAtTime(3.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  /**
   * Darbe / İsabet Vuruşu (hafif veya ağır kılıç çarpması)
   */
  public static playImpact(isHeavy = false): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = isHeavy ? 0.35 : 0.2;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 180 : 260, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + dur);

    oscGain.gain.setValueAtTime(isHeavy ? 0.6 : 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 1400 : 2200, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + dur);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(isHeavy ? 0.5 : 0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur);
    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * Kusursuz Savuşturma (Perfect Parry) Çınlaması (880Hz / 1760Hz harmonik çan)
   */
  public static playParry(): void {
    this.playParryClash();
  }

  public static playParryClash(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = 0.85;

    const freqs = [880, 1760, 2640, 3520];
    const amps = [0.4, 0.25, 0.15, 0.08];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(amps[idx], now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur * (1 - idx * 0.18));

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + dur);
    });

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.12);
  }

  /**
   * Kalkan Bloklama Tokluğu
   */
  public static playShieldBlock(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.24;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + dur);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur);
  }

  /**
   * Dodge Roll (Kaçınma taklası rüzgârı)
   */
  public static playDodgeRoll(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = 0.35;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.linearRampToValueAtTime(700, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(220, now + dur);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * Ok Fırlatma Sesi (kiriş sesi + ıslık)
   */
  public static playBowRelease(): void {
    this.playBowShoot();
  }

  public static playBowShoot(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const dur = 0.25;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + dur);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur);
  }

  /**
   * Yay Germe Sürtünmesi
   */
  public static playBowDraw(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = 0.3;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.linearRampToValueAtTime(850, now + dur);
    filter.Q.setValueAtTime(4.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * Kut Zamanı Başlangıcı (Düşük bas patlaması + rezonanslı yavaşlama uğultusu)
   */
  public static playKutZamaniEnter(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.45);

    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.15, now + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + 0.6);

    this.startKutDrone();
  }

  private static startKutDrone(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.stopKutDrone();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(68, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    this.kutDroneOsc = osc;
    this.kutDroneGain = gain;
  }

  /**
   * Kut Zamanı Bitişi
   */
  public static playKutZamaniExit(): void {
    this.stopKutDrone();
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  private static stopKutDrone(): void {
    if (this.kutDroneGain && this.ctx) {
      this.kutDroneGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);
    }
    if (this.kutDroneOsc && this.ctx) {
      try {
        this.kutDroneOsc.stop(this.ctx.currentTime + 0.1);
      } catch {
        // Zaten durdurulmuş olabilir
      }
    }
    this.kutDroneOsc = null;
    this.kutDroneGain = null;
  }

  /**
   * Ayak Sesi
   */
  public static playFootstep(inWater = false): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = inWater ? 0.14 : 0.08;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = inWater ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(inWater ? 750 : 380, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(inWater ? 0.18 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * Arayüz Buton Tıklaması
   */
  public static playButtonClick(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Gök Gürültüsü (Fırtına Şimşek Patlaması & Bas Yankısı)
   */
  public static playThunderBoom(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = 2.4;

    // 1. Düşük Frekanslı Çatlama Gürültüsü
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + dur);

    // 2. Sub-Bas Titreşim Tonu
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + dur);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + dur);
  }

  /**
   * Rüzgâr Uğultusu (Hamle geçişi)
   */
  public static playWindGust(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = 1.6;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.linearRampToValueAtTime(540, now + 0.7);
    filter.frequency.exponentialRampToValueAtTime(180, now + dur);
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * Erlik Han Gözcü Borusu (War Horn)
   */
  public static playWarHorn(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const dur = 2.4;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(145, now);
    osc1.frequency.linearRampToValueAtTime(165, now + 0.6);
    osc1.frequency.exponentialRampToValueAtTime(130, now + dur);

    osc2.frequency.setValueAtTime(147, now);
    osc2.frequency.linearRampToValueAtTime(167, now + 0.6);
    osc2.frequency.exponentialRampToValueAtTime(132, now + dur);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.linearRampToValueAtTime(680, now + 0.8);
    filter.frequency.exponentialRampToValueAtTime(220, now + dur);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur);
    osc2.stop(now + dur);
  }

  /**
   * Tepegöz Kükremesi (Monster Roar)
   */
  public static playRoar(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = 1.8;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.linearRampToValueAtTime(125, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(42, now + dur);

    oscGain.gain.setValueAtTime(0.01, now);
    oscGain.gain.linearRampToValueAtTime(0.55, now + 0.2);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.linearRampToValueAtTime(650, now + 0.5);
    filter.frequency.exponentialRampToValueAtTime(140, now + dur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.linearRampToValueAtTime(0.38, now + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + dur);
    noise.stop(now + dur);
  }

  /**
   * Sandık Açılışı & Ganimet Sesi (Chest Open)
   */
  public static playChestOpen(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.24, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.55);
    });
  }

  /**
   * Kutsal Kut Parçası Kazanımı (Sacred Kut Choir)
   */
  public static playKutAcquired(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const chords = [392.00, 493.88, 587.33, 783.99, 987.77];

    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.8 + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now);
      osc.stop(now + 3.6);
    });
  }

  /**
   * Kutsal Gök Kurt Börü Uluması (Celestial Wolf Howl)
   */
  public static playWolfHowl(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    // Uluma Frekans Eğrisi (360Hz -> 620Hz -> 280Hz)
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(580, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(260, now + 2.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 2.35);
  }

  /**
   * Görev Hedefi Güncellendi Sesi (Quest Objective Chime)
   */
  public static playQuestUpdate(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [440.0, 554.37, 659.25];

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  }

  /**
   * Görev Tamamlandı Zafer Fanfarı (Pentatonic Harp Cadence)
   */
  public static playQuestComplete(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const pentatonic = [329.63, 392.0, 440.0, 523.25, 659.25];

    pentatonic.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.24, now + idx * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 1.25);
    });
  }

  /**
   * Daktilo Yazı Karakteri Tıklama Sesi (Subtle Soft Click)
   */
  public static playTypewriterTick(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 200, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(now);
    src.stop(now + 0.035);
  }

  /**
   * Börü Koku İzi Parıldama Sesi (Celestial Shimmer Chime)
   */
  public static playScentTrailChime(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const freqs = [880.0, 1108.73, 1318.51, 1760.0];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.05 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.85);
    });
  }

  /**
   * Işık Sütunu İşaretçisi Rezonans Uğultusu (Beacon Hum)
   */
  public static playBeaconHum(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(146.83, now); // D3 derin kut frekansı
    osc.frequency.linearRampToValueAtTime(220.0, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 1.85);
  }

  /**
   * Bengü Taş Dokunma ve Runik Parlama Sesi
   */
  public static playBenguResonance(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const freqs = [220.0, 329.63, 440.0, 659.25, 880.0];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.06 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 1.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 1.45);
    });
  }

  /**
   * Börü Savaş Isırması Sesi (Bite Snarl)
   */
  public static playBoruBite(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noiseSrc.start(now);
    noiseSrc.stop(now + 0.22);
  }

  /**
   * Ayaz'ın Yemini Sinematik Boru Fanfarı (Solemn Ancient Horn)
   */
  public static playOathFanfare(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const hornNotes = [110.0, 164.81, 220.0, 277.18, 329.63];

    hornNotes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.35);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now + idx * 0.35);
      filter.frequency.linearRampToValueAtTime(950, now + idx * 0.35 + 0.3);

      gain.gain.setValueAtTime(0.001, now + idx * 0.35);
      gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.35 + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.35 + 1.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.35);
      osc.stop(now + idx * 0.35 + 1.85);
    });
  }

  /**
   * Oba Davul & Kopuz Ritim Vuruşu (Shaman Drum Pulse)
   */
  public static playVillageDrum(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.22);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * FAZ 6: Ülgen'in Kıvılcımı Ateş Fırlatma Sesi (Fire Spark Projectile)
   */
  public static playFireSpark(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.23);
  }

  /**
   * FAZ 6: Yangın & Harlanma Sesi (Fire Whoosh & Blaze)
   */
  public static playFireWhoosh(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.linearRampToValueAtTime(850, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.45);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.46);
  }

  /**
   * FAZ 6: Odun & Ot Yanma Çıtırtısı (Crackle)
   */
  public static playBurningCrackle(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.09);
  }

  /**
   * FAZ 6: Yel Ana Rüzgâr Sütunu Yükselme Uğultusu (Wind Updraft)
   */
  public static playWindUpdraft(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(680, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.85);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.92);
  }

  /**
   * FAZ 6: Rüzgâr Fırıldağı Dönme Sesi (Pinwheel Spin)
   */
  public static playPinwheelSpin(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.linearRampToValueAtTime(780, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  /**
   * FAZ 6: Basınç Plakası Ağır Taş Çökme & Klik Sesi (Pressure Plate Click)
   */
  public static playPressurePlateClick(isDown = true): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    const startFreq = isDown ? 240 : 180;
    const endFreq = isDown ? 90 : 280;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * FAZ 6: Işık Yansıtma Aynası & Kristal Rezonansı (Mirror Beam Hum)
   */
  public static playMirrorBeamHum(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.4); // A5

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  /**
   * FAZ 6: Mabet Bulmacası Çözüldü Fanfarı (Shrine Puzzle Solved Fanfare)
   */
  public static playShrineSolvedFanfare(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.14 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.58);
    });
  }

  public static playPuzzleSolveDing(): void {
    this.playShrineSolvedFanfare();
  }

  public static playKutRecharge(): void {
    this.playKutAcquired();
  }

  /**
   * FAZ 6: Fırtınada Metal Silahta Yıldırım Çıtırtı Uyarısı (Static Sparks Warning)
   */
  public static playLightningWarning(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.14);
  }

  /**
   * FAZ 6: Doğrudan Yıldırım Çarpması (Lightning Strike Thunder)
   */
  public static playLightningStrike(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.5, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.9);
  }

  /**
   * FAZ 7: At Çağırma Islığı (Horse Whistle)
   */
  public static playHorseWhistle(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.linearRampToValueAtTime(2200, now + 0.15);
    osc.frequency.linearRampToValueAtTime(1800, now + 0.35);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * FAZ 7: At Dörtnala Nalları (Horse Gallop)
   */
  public static playHorseGallop(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * FAZ 7: At Kişnemesi (Horse Whinny)
   */
  public static playHorseWhinny(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(840, now + 0.2);
    osc.frequency.linearRampToValueAtTime(620, now + 0.45);
    osc.frequency.linearRampToValueAtTime(420, now + 0.7);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.76);
  }

  /**
   * FAZ 7: Tulpar Kanat Çırpma Uğultusu (Wing Flap)
   */
  public static playTulparWingFlap(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.4);
  }

  /**
   * FAZ 7: Yemek Kazanı Cızırtısı & Kaynama (Cooking Sizzle)
   */
  public static playCookingSizzle(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.88);
  }

  /**
   * FAZ 7: Demirci Örs Çekiç Vuruşu (Hammer Strike)
   */
  public static playHammerStrike(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1760, now); // A6 metalik çınlama
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  /**
   * FAZ 7: Eşya Kuşanma / Çanta Hışırtısı (Item Equip)
   */
  public static playItemEquip(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.13);
  }

  // =========================================================================
  // FAZ 8: SES VERİ YOLU (AUDIO BUS) SEVİYE AYARLARI & DİNAMİK DUCKING
  // =========================================================================

  public static setMasterVolume(vol: number): void {
    this.currentMasterVol = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.currentMasterVol * this.currentMasterVol, this.ctx.currentTime);
    }
  }

  public static setMusicVolume(vol: number): void {
    this.currentMusicVol = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.currentMusicVol * this.currentMusicVol, this.ctx.currentTime);
    }
  }

  public static setSfxVolume(vol: number): void {
    this.currentSfxVol = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.currentSfxVol * this.currentSfxVol, this.ctx.currentTime);
    }
  }

  public static setAmbienceVolume(vol: number): void {
    this.currentAmbienceVol = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.ambienceGain) {
      this.ambienceGain.gain.setValueAtTime(this.currentAmbienceVol * this.currentAmbienceVol, this.ctx.currentTime);
    }
  }

  /**
   * Dinamik Ducking: Diyalog veya önemli aksiyon seslerinde müziği yumuşakça kısar
   */
  public static duckMusic(reductionDb = -6, durationMs = 1200): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const currentGain = this.currentMusicVol * this.currentMusicVol;
    const duckedGain = currentGain * Math.pow(10, reductionDb / 20);

    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(duckedGain, now + 0.08);
    this.musicGain.gain.setValueAtTime(duckedGain, now + durationMs / 1000 - 0.25);
    this.musicGain.gain.linearRampToValueAtTime(currentGain, now + durationMs / 1000);
  }

  /**
   * Prosedürel Sürekli Ortam Sesi Başlatımı
   */
  public static initAmbience(): void {
    if (!this.ensureContext() || !this.ctx || !this.ambienceGain || !this.noiseBuffer || this.isAmbienceRunning) return;
    this.isAmbienceRunning = true;

    // Pembe/kahverengi gürültü filtreli rüzgâr
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambienceGain);
    noise.start();

    this.ambienceSource = noise;
    this.ambienceFilter = filter;
    this.ambienceVolumeNode = gain;

    // Şamanik alt-bas uğultusu (Yer-Sub derinliği)
    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(55, this.ctx.currentTime); // A1
    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    drone.connect(droneGain);
    droneGain.connect(this.ambienceGain);
    drone.start();
    this.droneOsc = drone;
  }

  /**
   * Biyom ve Hava Durumuna Göre Prosedürel Ortam Sesini Modüle Eder
   */
  public static updateAmbience(biomeName: string, isNight: boolean, isRaining: boolean, isStorming: boolean): void {
    if (!this.ctx || !this.ambienceFilter || !this.ambienceVolumeNode) {
      this.initAmbience();
      return;
    }
    const now = this.ctx.currentTime;

    let targetFreq = 280;
    let targetVol = 0.08;

    if (isStorming) {
      targetFreq = 750;
      targetVol = 0.22;
    } else if (isRaining) {
      targetFreq = 580;
      targetVol = 0.16;
    } else if (biomeName.includes('Göl')) {
      targetFreq = 420;
      targetVol = 0.12;
    } else if (biomeName.includes('Orman')) {
      targetFreq = 340;
      targetVol = 0.10;
    } else {
      // Bozkır
      targetFreq = isNight ? 220 : 300;
      targetVol = isNight ? 0.06 : 0.09;
    }

    this.ambienceFilter.frequency.setTargetAtTime(targetFreq, now, 1.2);
    this.ambienceVolumeNode.gain.setTargetAtTime(targetVol, now, 1.2);
  }

  // =========================================================================
  // FAZ 8: 2 TELLİ KOPUZ (PENTATONİK TÜRK ŞAMAN ÇALGISI) SENTEZİ
  // =========================================================================

  /**
   * 2 Telli Kopuz Mızrap Sesi (Karplus-Strong / Rezonant Ahşap Gövde)
   */
  public static playKopuzPluck(frequency: number, duration = 0.65, isBass = false): void {
    if (!this.ensureContext() || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    // 1. Tel Osilatörü (Zengin Üst Harmonikler - Testere dişi + üçgen)
    const osc = this.ctx.createOscillator();
    osc.type = isBass ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(frequency, now);

    // Hafif kıl tel tınısı (mikro-pitch bend)
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.992, now + duration);

    // 2. Ahşap Tekne Rezonans Filtresi (Çam tekne akustik gövdesi)
    const woodFilter = this.ctx.createBiquadFilter();
    woodFilter.type = 'bandpass';
    woodFilter.frequency.setValueAtTime(isBass ? 240 : 480, now);
    woodFilter.Q.setValueAtTime(4.5, now);

    // 3. Mızrap / Tırnak Darbesi (Pluck impulse)
    const pluckGain = this.ctx.createGain();
    pluckGain.gain.setValueAtTime(0.001, now);
    pluckGain.gain.linearRampToValueAtTime(isBass ? 0.35 : 0.28, now + 0.012);
    pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(woodFilter);
    woodFilter.connect(pluckGain);
    pluckGain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    // Müzik çalarken diğer sesleri hafifçe dengele
    this.duckMusic(-3, duration * 1000);
  }

  /**
   * Kam Ata'nın Kopuz Ezgileri (Pentatonik Bozkır Makamı)
   */
  public static playKopuzSong(
    songType: 'YEL' | 'TENGRI' | 'ALP' | 'YERSUB',
    onNote?: (noteIdx: number) => void
  ): void {
    const PENTATONIC = {
      A2: 110,
      D3: 146.83,
      E3: 164.81,
      G3: 196.0,
      A3: 220.0,
      C4: 261.63,
      D4: 293.66,
      E4: 329.63,
      G4: 392.0,
      A4: 440.0,
      C5: 523.25
    };

    let melody: { freq: number; dur: number; delay: number; bass?: boolean }[] = [];

    switch (songType) {
      case 'YEL': // Bozkır Rüzgârı (Sakinleştirici esinti)
        melody = [
          { freq: PENTATONIC.D3, dur: 0.8, delay: 0, bass: true },
          { freq: PENTATONIC.A3, dur: 0.45, delay: 0.15 },
          { freq: PENTATONIC.C4, dur: 0.45, delay: 0.55 },
          { freq: PENTATONIC.D4, dur: 0.6, delay: 0.95 },
          { freq: PENTATONIC.G4, dur: 0.7, delay: 1.45 },
          { freq: PENTATONIC.E4, dur: 0.8, delay: 2.05 },
          { freq: PENTATONIC.D4, dur: 1.1, delay: 2.75 }
        ];
        break;

      case 'TENGRI': // Gök Tengri Duası (Yükselen kutsal nağme)
        melody = [
          { freq: PENTATONIC.A2, dur: 1.0, delay: 0, bass: true },
          { freq: PENTATONIC.E3, dur: 0.5, delay: 0.2 },
          { freq: PENTATONIC.A3, dur: 0.5, delay: 0.65 },
          { freq: PENTATONIC.C4, dur: 0.5, delay: 1.1 },
          { freq: PENTATONIC.E4, dur: 0.6, delay: 1.55 },
          { freq: PENTATONIC.A4, dur: 0.8, delay: 2.1 },
          { freq: PENTATONIC.G4, dur: 0.6, delay: 2.8 },
          { freq: PENTATONIC.A4, dur: 1.2, delay: 3.35 }
        ];
        break;

      case 'ALP': // Alp Destanı (Tempolu Savaş Ezgisi)
        melody = [
          { freq: PENTATONIC.D3, dur: 0.4, delay: 0, bass: true },
          { freq: PENTATONIC.D4, dur: 0.3, delay: 0.1 },
          { freq: PENTATONIC.D4, dur: 0.25, delay: 0.35 },
          { freq: PENTATONIC.C4, dur: 0.3, delay: 0.55 },
          { freq: PENTATONIC.D4, dur: 0.4, delay: 0.8 },
          { freq: PENTATONIC.G3, dur: 0.4, delay: 1.15, bass: true },
          { freq: PENTATONIC.G4, dur: 0.35, delay: 1.35 },
          { freq: PENTATONIC.E4, dur: 0.4, delay: 1.65 },
          { freq: PENTATONIC.D4, dur: 0.7, delay: 2.0 }
        ];
        break;

      case 'YERSUB': // Yer-Sub Ağıtı (Şifalı derin melodi)
        melody = [
          { freq: PENTATONIC.A2, dur: 0.9, delay: 0, bass: true },
          { freq: PENTATONIC.C4, dur: 0.6, delay: 0.3 },
          { freq: PENTATONIC.A3, dur: 0.5, delay: 0.85 },
          { freq: PENTATONIC.G3, dur: 0.6, delay: 1.3 },
          { freq: PENTATONIC.A3, dur: 0.8, delay: 1.85 },
          { freq: PENTATONIC.D4, dur: 0.9, delay: 2.55 }
        ];
        break;
    }

    melody.forEach((note, index) => {
      setTimeout(() => {
        this.playKopuzPluck(note.freq, note.dur, note.bass);
        if (onNote) onNote(index);
      }, note.delay * 1000);
    });
  }

  // =========================================================================
  // FAZ 8: BAŞARIM KAZANMA FANFARI & FAZ 9 SESLERİ
  // =========================================================================

  public static playAchievementFanfare(): void {
    if (!this.ensureContext() || !this.ctx || !this.uiGain) return;
    const now = this.ctx.currentTime;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.65);

      osc.connect(gain);
      gain.connect(this.uiGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.7);
    });
  }

  /**
   * FAZ 9: Alev Harlanması / Ateş Tutuşması
   */
  public static playFlameIgnition(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.42);
  }

  /**
   * FAZ 9: Su Fışkırması / Dökülmesi
   */
  public static playWaterSplash(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.52);
  }

  /**
   * FAZ 9: Buhar Fısıltısı (Kızgın demire su teması / Termal şok)
   */
  public static playSteamHiss(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.linearRampToValueAtTime(2400, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.72);
  }

  /**
   * FAZ 9: Kritik Darbe Sesi (Çatlama & Zırh Kırılması)
   */
  public static playCrit(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Eşya / Ganimet Toplama Sesi
   */
  public static playLootPickup(): void {
    if (!this.ensureContext() || !this.ctx || !this.uiGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.07); // A5

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.uiGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * FAZ 9: Ergenekon / Demir Dağ Boss Zafer Tınısı
   */
  public static playBossDefeatStinger(): void {
    if (!this.ensureContext() || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    // Kutsal ezgi üçlüsü (A3 - D4 - E4 - A4)
    const notes = [220, 293.66, 329.63, 440];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.01, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.2);

      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 1.25);
    });
  }

  /**
   * FAZ 10: Su Altı Boğuk Akustik Filtresi (Low-Pass Filter)
   */
  public static setUnderwaterMode(isUnderwater: boolean): void {
    if (!this.ctx || !this.underwaterFilter) return;
    const targetFreq = isUnderwater ? 380 : 20000;
    this.underwaterFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  /**
   * FAZ 10: Su Altı Kabarcık / Nefes Fokurtusu
   */
  public static playUnderwaterBubble(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * FAZ 10: Yelbegen Baş Kesilme Şakırtısı
   */
  public static playHeadSevered(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playImpact(true);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.5);
  }

  /**
   * FAZ 10: Ateşle Dağlama / Cauterize Cızırtısı
   */
  public static playCauterizeSizzle(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSteamHiss();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.6);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  /**
   * FAZ 10: 7 Başlı Ejder Yelbegen Çoklu Kükremesi
   */
  public static playYelbegenRoar(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playRoar();

    // İkinci alt bas frekansı
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(65, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 1.35);
  }

  // ================= FAZ 11: GÖK ZİRVE & ERLİK HAN PROSEDÜREL SESLERİ =================

  /**
   * FAZ 11: Çığ Gürültüsü ve Kar Yuvarlanması (Düşük frekanslı gürleme)
   */
  public static playAvalancheRumble(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.linearRampToValueAtTime(220, now + 1.2);
    filter.frequency.exponentialRampToValueAtTime(60, now + 2.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 2.6);
  }

  /**
   * FAZ 11: Buz Kırılması ve Kristal Parçalanması
   */
  public static playIceShatter(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.35);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * FAZ 11: Kemik Mızrak Savurması ve Fırlatışı
   */
  public static playBoneSpear(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  /**
   * FAZ 11: Erlik Kara Girdap / Karanlık Büyü Yankısı
   */
  public static playDarkVortex(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.3);
  }

  /**
   * FAZ 11: Donmuş Zaman Kırılışı (Kut Zamanı ile Donmuş Anı Parçalama)
   */
  public static playTimeShatter(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2200, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.5);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1650, now);
    osc2.frequency.exponentialRampToValueAtTime(220, now + 0.5);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  /**
   * FAZ 11: Erlik Han Yeraltı Kükremesi
   */
  public static playErlikRoar(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playRoar();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.linearRampToValueAtTime(40, now + 1.5);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.65);
  }

  /**
   * FAZ 11: Kut Ezgisi 4 Kutsal Nota (Pentatonik Dizi)
   */
  public static playKutEzgisiNote(noteIndex: number): void {
    if (!this.ensureContext() || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    // Türk Pentatonik frekansları: C4, D4, F4, G4, A4
    const freqs = [261.63, 293.66, 349.23, 392.00, 440.00];
    const freq = freqs[Math.abs(noteIndex) % freqs.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 1.85);
  }
}
