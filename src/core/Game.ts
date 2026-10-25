/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * WebGL2 Oyun Motoru & Sahne Yöneticisi
 * (Mobil 60 FPS bütçesi, FXAA, Context Lost Yönetimi, Sıfır GC Render Döngüsü)
 */

import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  DefaultRenderingPipeline,
  ScenePerformancePriority
} from '@babylonjs/core';
import { SettingsStore } from '../infra/SettingsStore';

export class Game {
  public engine: Engine;
  public scene: Scene;
  public shadowGenerator: ShadowGenerator | null = null;
  public sunLight: DirectionalLight | null = null;
  public pipeline: DefaultRenderingPipeline | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id '${canvasId}' not found!`);
    }
    this.canvas = canvas;

    // Kural 2: antialias=false (FXAA var), adaptToDeviceRatio=false, preserveDrawingBuffer=false, stencil=false
    this.engine = new Engine(canvas, false, {
      preserveDrawingBuffer: false,
      stencil: false,
      antialias: false,
      adaptToDeviceRatio: false,
      powerPreference: 'high-performance',
      doNotHandleContextLost: false
    });

    this.applyResolutionScaling();

    this.scene = this.createScene();
    this.setupLighting();
    this.setupPostProcessing();
    this.setupContextLostHandling();
    this.setupResizeHandler();
    this.applyEngineOptimizations();
  }

  /**
   * Çözünürlük: Yatay iç genişliği ~1280 - 1600 px aralığında tutan başlangıç hardwareScalingLevel
   */
  public applyResolutionScaling(): void {
    const dpr = window.devicePixelRatio || 1;
    const physicalWidth = (window.innerWidth || 1280) * dpr;

    // 1440px referans yatay genişlik (orta segmentte 60 FPS dengesi)
    const targetWidth = 1440.0;
    const computedScaling = physicalWidth / targetWidth;
    const finalScaling = Math.max(0.7, Math.min(1.6, computedScaling));

    this.engine.setHardwareScalingLevel(finalScaling);
    this.engine.resize();
  }

  private createScene(): Scene {
    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0.42, 0.72, 0.94, 1.0);
    scene.ambientColor = new Color3(0.3, 0.35, 0.45);

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.005;
    scene.fogColor = new Color3(0.55, 0.78, 0.95);

    return scene;
  }

  /**
   * Kural 9: scene.skipPointerMovePicking, performancePriority
   */
  private applyEngineOptimizations(): void {
    this.scene.skipPointerMovePicking = true;
    this.scene.autoClear = false;
    this.scene.autoClearDepthAndStencil = false;
    this.scene.performancePriority = ScenePerformancePriority.Aggressive;
  }

  private setupLighting(): void {
    const hemiLight = new HemisphericLight(
      'skyHemiLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    hemiLight.intensity = 0.95;
    hemiLight.diffuse = new Color3(0.95, 0.98, 1.0);
    hemiLight.groundColor = new Color3(0.38, 0.42, 0.28);

    const sunLight = new DirectionalLight(
      'sunLight',
      new Vector3(-0.6, -1.2, 0.8).normalize(),
      this.scene
    );
    sunLight.position = new Vector3(25, 50, -25);
    sunLight.intensity = 1.35;
    sunLight.diffuse = new Color3(1.0, 0.95, 0.82);
    sunLight.specular = new Color3(0.8, 0.7, 0.5);
    this.sunLight = sunLight;

    // Mobil bütçesi: Tek cascade gölge, Poisson sampling (1024x1024)
    const shadowGen = new ShadowGenerator(1024, sunLight);
    shadowGen.useContactHardeningShadow = false;
    shadowGen.usePoissonSampling = true;
    shadowGen.bias = 0.002;
    shadowGen.normalBias = 0.01;
    this.shadowGenerator = shadowGen;
  }

  private setupPostProcessing(): void {
    const pipeline = new DefaultRenderingPipeline(
      'defaultPipeline',
      true, // HDR
      this.scene,
      this.scene.cameras
    );

    // Kural: MSAA yok (samples = 1), yalnızca FXAA
    pipeline.samples = 1;
    pipeline.fxaaEnabled = true;

    if (pipeline.imageProcessing) {
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.imageProcessing.toneMappingType = 1; // TONEMAPPING_ACES
      pipeline.imageProcessing.contrast = 1.15;
      pipeline.imageProcessing.exposure = 1.1;
      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 1.15;
      pipeline.imageProcessing.vignetteColor = new Color4(0.05, 0.08, 0.15, 0.35);
    }

    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.85;
    pipeline.bloomWeight = 0.22;
    pipeline.bloomKernel = 16;
    pipeline.bloomScale = 0.5;

    this.pipeline = pipeline;
  }

  private setupContextLostHandling(): void {
    this.engine.onContextLostObservable.add(() => {
      console.warn('[Game] WebGL Context Kaybedildi! Sahne donduruluyor...');
    });

    this.engine.onContextRestoredObservable.add(() => {
      console.log('[Game] WebGL Context Yenilendi! Sahne tazeleniyor...');
      this.applyResolutionScaling();
      this.engine.resize();
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.applyResolutionScaling();
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this.applyResolutionScaling();
      });
    }

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.applyResolutionScaling();
      }, 120);
    });
  }

  public startRenderLoop(onUpdate: (deltaTime: number) => void): void {
    this.engine.runRenderLoop(() => {
      const rawDt = this.engine.getDeltaTime() / 1000;
      // İlk kare yükleme veya takılma sırasında aşırı delta sıçramalarını önlemek için 0.001 - 0.05 sn arasına kırp (Zero GC)
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      onUpdate(dt);
      this.scene.render();
    });
  }

  public getFps(): number {
    return Math.round(this.engine.getFps());
  }

  public getActiveVertices(): number {
    return this.scene.totalVerticesPerfCounter.current;
  }

  public getDrawCalls(): number {
    return (this.scene.getEngine() as any)._drawCalls.current || 0;
  }

  public getActiveMeshesCount(): number {
    return this.scene.getActiveMeshes().length;
  }
}
