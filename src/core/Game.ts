import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  DefaultRenderingPipeline
} from '@babylonjs/core';

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

    // Initialize Babylon WebGL2 Engine with high performance mobile flags
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
      powerPreference: 'high-performance',
      doNotHandleContextLost: false
    });

    // Adaptive Hardware Scaling: crisp rendering while preserving 60 FPS on mobile
    const dpr = window.devicePixelRatio || 1;
    this.engine.setHardwareScalingLevel(1 / Math.min(dpr, 1.75));

    this.scene = this.createScene();
    this.setupLighting();
    this.setupPostProcessing();
    this.setupResizeHandler();
    this.engine.resize();
  }

  private createScene(): Scene {
    const scene = new Scene(this.engine);
    // Vibrant Ötüken sky background color (Zelda BotW anime atmosphere)
    scene.clearColor = new Color4(0.42, 0.72, 0.94, 1.0);
    scene.ambientColor = new Color3(0.3, 0.35, 0.45);

    // Subtle atmospheric fog for open-world depth
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.005;
    scene.fogColor = new Color3(0.55, 0.78, 0.95);

    return scene;
  }

  private setupLighting(): void {
    // Hemispheric ambient light: Sky blue from above, warm steppe soil from below
    const hemiLight = new HemisphericLight(
      'skyHemiLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    hemiLight.intensity = 0.95;
    hemiLight.diffuse = new Color3(0.95, 0.98, 1.0);
    hemiLight.groundColor = new Color3(0.38, 0.42, 0.28);

    // Warm directional sun light (Zelda BotW bright afternoon steppe sun)
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

    // Mobile-optimized single cascade shadow generator (Rule: Tek cascade gölge)
    const shadowGen = new ShadowGenerator(1024, sunLight);
    shadowGen.useContactHardeningShadow = false;
    shadowGen.usePoissonSampling = true;
    shadowGen.bias = 0.002;
    shadowGen.normalBias = 0.01;
    this.shadowGenerator = shadowGen;
  }

  private setupPostProcessing(): void {
    // Post-process: ACES tonemapping, light bloom, FXAA as requested
    const pipeline = new DefaultRenderingPipeline(
      'defaultPipeline',
      true, // HDR
      this.scene,
      this.scene.cameras
    );

    pipeline.samples = 2; // Mobile MSAA
    pipeline.fxaaEnabled = true;

    // ACES Tonemapping
    if (pipeline.imageProcessing) {
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.imageProcessing.toneMappingType = 1; // TONEMAPPING_ACES
      pipeline.imageProcessing.contrast = 1.15;
      pipeline.imageProcessing.exposure = 1.1;
      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 1.2;
      pipeline.imageProcessing.vignetteColor = new Color4(0.05, 0.08, 0.15, 0.4);
    }

    // Light atmospheric bloom
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.85;
    pipeline.bloomWeight = 0.25;
    pipeline.bloomKernel = 16;
    pipeline.bloomScale = 0.5;

    this.pipeline = pipeline;
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.engine.resize();
      }, 100);
    });
  }

  public startRenderLoop(onUpdate: (deltaTime: number) => void): void {
    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000;
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
}
