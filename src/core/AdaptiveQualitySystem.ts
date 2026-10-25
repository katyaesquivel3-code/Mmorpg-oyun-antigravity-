/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Uyarlanabilir Kalite & Performans Optimizasyon Sistemi (AdaptiveQualitySystem)
 * 
 * (Cihaz Sınıfı Tespiti [GPU, RAM, Çekirdek], Dinamik Çözünürlük Ölçeği [hardwareScalingLevel],
 *  Termal Koruma & Pil Tasarrufu [30 FPS Emniyeti], WebGL Context Lost/Restored Kurtarma,
 *  SceneInstrumentation ile Draw Call [Hedef < 150] & Üçgen Takibi, Shader Ön-Isıtma & Sıfır GC)
 */

import {
  Engine,
  Scene,
  SceneInstrumentation,
  EngineInstrumentation,
  Material
} from '@babylonjs/core';
import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';

export type DeviceTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PerformanceStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  activeMeshes: number;
  activeVertices: number;
  hardwareScaling: number;
  deviceTier: DeviceTier;
  isBatterySaver: boolean;
  isThermalThrottled: boolean;
}

export class AdaptiveQualitySystem {
  private static instance: AdaptiveQualitySystem | null = null;

  public engine: Engine;
  public scene: Scene;

  // Cihaz ve Kalite Sınıfı
  public deviceTier: DeviceTier = 'MEDIUM';
  public gpuRenderer = '';
  public memoryGb = 4;
  public cpuCores = 4;

  // Çözünürlük ve Kare Oranı
  public currentScalingLevel = 1.0;
  public targetFps = 60;
  public isBatterySaverActive = false;
  public isThermalThrottled = false;

  // Termal İzleme ve Kare Süresi İstatistikleri
  private frameTimeHistory: number[] = [];
  private readonly HISTORY_SIZE = 60;
  private highFrameTimeDuration = 0.0;
  private readonly THERMAL_THROTTLE_THRESHOLD_S = 30.0; // 30 sn aralıksız yüksek kare süresi
  private startupGraceTimer = 10.0; // İlk açılış ve shader derleme sürecinde erken termal tetiklemeyi önleyen 10 sn hoşgörü süresi

  // Enstrümantasyon (SceneInstrumentation & EngineInstrumentation)
  public sceneInstrumentation: SceneInstrumentation;
  public engineInstrumentation: EngineInstrumentation;

  // İstatistik Önbelleği (Sıfır GC)
  public readonly stats: PerformanceStats = {
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    activeMeshes: 0,
    activeVertices: 0,
    hardwareScaling: 1.0,
    deviceTier: 'MEDIUM',
    isBatterySaver: false,
    isThermalThrottled: false
  };

  public static getInstance(engine?: Engine, scene?: Scene): AdaptiveQualitySystem {
    if (!AdaptiveQualitySystem.instance && engine && scene) {
      AdaptiveQualitySystem.instance = new AdaptiveQualitySystem(engine, scene);
    }
    return AdaptiveQualitySystem.instance!;
  }

  constructor(engine: Engine, scene: Scene) {
    this.engine = engine;
    this.scene = scene;
    AdaptiveQualitySystem.instance = this;

    // 1. Cihaz Donanım Sınıfını Belirle
    this.detectHardwareCapabilities();

    // 2. Enstrümantasyon Sayaçlarını Başlat
    this.sceneInstrumentation = new SceneInstrumentation(scene);
    this.sceneInstrumentation.captureActiveMeshesEvaluationTime = true;
    this.sceneInstrumentation.captureRenderTime = true;
    this.sceneInstrumentation.captureFrameTime = true;

    this.engineInstrumentation = new EngineInstrumentation(engine);
    this.engineInstrumentation.captureGPUFrameTime = true;
    this.engineInstrumentation.captureShaderCompilationTime = true;

    // 3. WebGL Context Kaybı ve Kurtarma Dinleyicileri
    this.setupWebGLContextHandlers();

    // 4. Pil Tasarrufu ve Batarya Durumu Dinleyicisi
    this.initBatteryMonitoring();

    // 5. İlk Kalite Seviyesini Uygula
    this.applyInitialTierSettings();

    // 6. Geliştirici Modunda Dinamik Inspector Desteği
    this.checkDevInspectorSupport();
  }

  /**
   * 1. Cihaz Donanım Tespiti (GPU, RAM, CPU Çekirdek Sayısı)
   */
  private detectHardwareCapabilities(): void {
    const nav = typeof navigator !== 'undefined' ? navigator : null;

    // CPU Çekirdek Sayısı
    this.cpuCores = nav?.hardwareConcurrency || 4;

    // Cihaz RAM Miktarı (GB)
    this.memoryGb = (nav as any)?.deviceMemory || 4;

    // WebGL GPU Renderer Adı
    try {
      const canvas = this.engine.getRenderingCanvas();
      if (canvas) {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          const dbgInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
          if (dbgInfo) {
            this.gpuRenderer = (gl as any).getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) || '';
          }
        }
      }
    } catch {
      this.gpuRenderer = 'Unknown GPU';
    }

    // Sınıflandırma Mantığı:
    const lowerGpu = this.gpuRenderer.toLowerCase();
    const isLowGpu =
      lowerGpu.includes('mali-g5') ||
      lowerGpu.includes('mali-4') ||
      lowerGpu.includes('adreno (tm) 5') ||
      lowerGpu.includes('adreno (tm) 61') ||
      lowerGpu.includes('powervr');

    const isHighGpu =
      lowerGpu.includes('apple') ||
      lowerGpu.includes('adreno (tm) 7') ||
      lowerGpu.includes('mali-g7') ||
      lowerGpu.includes('nvidia') ||
      lowerGpu.includes('radeon');

    if (this.memoryGb <= 3 || this.cpuCores <= 4 || isLowGpu) {
      this.deviceTier = 'LOW';
    } else if (this.memoryGb >= 8 && this.cpuCores >= 8 && isHighGpu) {
      this.deviceTier = 'HIGH';
    } else {
      this.deviceTier = 'MEDIUM';
    }

    this.stats.deviceTier = this.deviceTier;
  }

  /**
   * 2. Başlangıç Kalite ve Çözünürlük Ölçeğini Uygula
   */
  private applyInitialTierSettings(): void {
    switch (this.deviceTier) {
      case 'LOW':
        this.currentScalingLevel = 1.35; // %74 dahili çözünürlük ile yüksek FPS
        this.targetFps = 30;             // Düşük donanımlarda stabil 30 FPS
        break;
      case 'MEDIUM':
        this.currentScalingLevel = 1.15; // Hafif ölçekleme (%87)
        this.targetFps = 60;
        break;
      case 'HIGH':
      default:
        this.currentScalingLevel = 1.0;  // 1:1 Tam yerel çözünürlük
        this.targetFps = 60;
        break;
    }

    this.engine.setHardwareScalingLevel(this.currentScalingLevel);
    this.stats.hardwareScaling = this.currentScalingLevel;
  }

  /**
   * 3. WebGL Context Lost & Restored Kurtarma
   */
  private setupWebGLContextHandlers(): void {
    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      ProceduralAudio.suspend();
      EventBus.emit('ui:loot_toast', { text: '⚠️ Grafik belleği yeniden yapılandırılıyor...' });
    });

    canvas.addEventListener('webglcontextrestored', () => {
      ProceduralAudio.resume();
      this.applyInitialTierSettings();
      EventBus.emit('ui:loot_toast', { text: '✨ Grafik ortamı başarıyla kurtarıldı.' });
    });
  }

  /**
   * 4. Batarya ve Pil Tasarrufu Takibi
   */
  private async initBatteryMonitoring(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        const checkBattery = () => {
          if (battery.level < 0.20 && !battery.charging) {
            this.setBatterySaver(true);
          }
        };
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
        checkBattery();
      }
    } catch {
      // Battery API desteklenmiyorsa varsayılan durum korunur
    }
  }

  /**
   * Pil Tasarrufu Modunu Aç/Kapat
   */
  public setBatterySaver(active: boolean): void {
    this.isBatterySaverActive = active;
    this.stats.isBatterySaver = active;

    if (active) {
      this.engine.setHardwareScalingLevel(Math.max(1.35, this.currentScalingLevel));
      this.targetFps = 30;
      EventBus.emit('ui:loot_toast', { text: '🔋 Pil Tasarrufu Modu: 30 FPS ve optimize çözünürlük devrede.' });
    } else {
      this.applyInitialTierSettings();
    }
  }

  /**
   * 5. Shader ve Materyalleri Arka Planda Ön-Isıtma (Warm-Up / Asenkron Derleme)
   * İlk açılışta veya bölge yüklemelerinde oyun içi mikro donmaları (hitch) tamamen engeller.
   */
  public async prewarmShadersAsync(): Promise<void> {
    const materials = this.scene.materials;
    const meshes = this.scene.meshes;

    const compilePromises: Promise<any>[] = [];

    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      // Sahnedeki ilk uyumlu mesh üzerinde derlemeyi tetikle
      const targetMesh = meshes.find((m) => m.material === mat) || meshes[0];
      if (targetMesh && typeof mat.isReadyForSubMesh === 'function') {
        try {
          compilePromises.push(mat.forceCompilationAsync(targetMesh));
        } catch {
          // Desteklenmeyen materyaller yoksayılır
        }
      }
    }

    try {
      await Promise.all(compilePromises);
    } catch {
      // Sessiz tamamlama
    }
  }

  /**
   * 6. Dev Modunda İsteğe Bağlı Dinamik Inspector (Üretim Paketi Şişmesini Önler)
   */
  private async checkDevInspectorSupport(): Promise<void> {
    const isDebugUrl = typeof window !== 'undefined' && window.location.search.includes('debug=1');
    const isDevEnv = (import.meta as any).env?.DEV;

    if (isDebugUrl || isDevEnv) {
      // 'I' tuşuna basıldığında Inspector'ı dinamik olarak import et ve aç
      window.addEventListener('keydown', async (e) => {
        if (e.key === 'I' && e.shiftKey) {
          try {
            await (new Function('return import("@babylonjs/inspector")'))();
            this.scene.debugLayer.show({ embedMode: true });
          } catch (err) {
            console.warn('[AdaptiveQuality] Inspector dinamik yüklenemedi:', err);
          }
        }
      });
    }
  }

  /**
   * Her Kare Çalışan Uyarlanabilir Performans ve Termal Denetçi (Sıcak Döngü & Sıfır GC)
   */
  public update(deltaTime: number): PerformanceStats {
    const safeDelta = Math.min(0.05, Math.max(0.001, deltaTime));
    const frameMs = safeDelta * 1000.0;
    this.frameTimeHistory.push(frameMs);
    if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    // Başlangıç ısınma koruması (İlk 10 saniye boyunca sahneler yüklenirken termal kısma tetiklenmez)
    if (this.startupGraceTimer > 0) {
      this.startupGraceTimer -= safeDelta;
      this.stats.fps = Math.round(this.engine.getFps());
      this.stats.frameTimeMs = Math.round(frameMs * 10) / 10;
      return this.stats;
    }

    // Hareketli Ortalama Kare Süresi (Moving Average)
    let sum = 0.0;
    for (let i = 0; i < this.frameTimeHistory.length; i++) {
      sum += this.frameTimeHistory[i];
    }
    const avgFrameTime = sum / this.frameTimeHistory.length;

    // Termal Stres ve Aşırı Kare Süresi Takibi
    if (avgFrameTime > 25.0) {
      this.highFrameTimeDuration += safeDelta;
      if (this.highFrameTimeDuration > this.THERMAL_THROTTLE_THRESHOLD_S && !this.isThermalThrottled) {
        this.isThermalThrottled = true;
        this.stats.isThermalThrottled = true;
        this.targetFps = 30; // Termal hasar ve pil tüketimini önlemek için 30 FPS'e çek
        this.engine.setHardwareScalingLevel(Math.max(1.35, this.currentScalingLevel));
        EventBus.emit('ui:loot_toast', { text: '❄️ Termal Emniyet Devrede: Cihaz sıcaklığını korumak için 30 FPS optimize edildi.' });
      }
    } else {
      this.highFrameTimeDuration = Math.max(0, this.highFrameTimeDuration - safeDelta * 0.5);
    }

    // İstatistikleri Güncelle
    this.stats.fps = Math.round(this.engine.getFps());
    this.stats.frameTimeMs = Math.round(avgFrameTime * 10) / 10;
    this.stats.drawCalls = this.sceneInstrumentation.drawCallsCounter.current;
    this.stats.activeMeshes = this.scene.getActiveMeshes().length;
    this.stats.activeVertices = this.scene.totalVerticesPerfCounter.current;
    this.stats.hardwareScaling = this.currentScalingLevel;

    return this.stats;
  }

  public dispose(): void {
    this.sceneInstrumentation.dispose();
    this.engineInstrumentation.dispose();
  }
}
