import { Engine, ShadowGenerator, DefaultRenderingPipeline } from '@babylonjs/core';
import { FoliageManager } from '../world/FoliageManager';

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'AUTO';

export class QualityManager {
  private engine: Engine;
  private shadowGen: ShadowGenerator | null;
  private foliage: FoliageManager;
  private pipeline: DefaultRenderingPipeline | null;

  public currentMode: QualityLevel = 'AUTO';
  public activeTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

  // Auto Quality Adjuster Telemetry
  private fpsBuffer: number[] = [];
  private autoTimer = 0;

  constructor(
    engine: Engine,
    shadowGen: ShadowGenerator | null,
    foliage: FoliageManager,
    pipeline: DefaultRenderingPipeline | null
  ) {
    this.engine = engine;
    this.shadowGen = shadowGen;
    this.foliage = foliage;
    this.pipeline = pipeline;

    // Apply default starting tier
    this.applyTier('MEDIUM');
    this.initDOM();
  }

  public setQuality(level: QualityLevel): void {
    this.currentMode = level;
    if (level !== 'AUTO') {
      this.applyTier(level);
    }
    this.updateDOMButtons();
  }

  private applyTier(tier: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    this.activeTier = tier;
    const dpr = window.devicePixelRatio || 1;

    if (tier === 'LOW') {
      // 1.0 scale, shadows disabled for 60 FPS on budget devices
      this.engine.setHardwareScalingLevel(1 / Math.min(dpr, 1.0));
      this.foliage.densityMultiplier = 0.35;
      if (this.pipeline) {
        this.pipeline.bloomEnabled = false;
        this.pipeline.samples = 1;
      }
    } else if (tier === 'MEDIUM') {
      // Balanced 1.4 dpr scale, soft shadows, balanced trees
      this.engine.setHardwareScalingLevel(1 / Math.min(dpr, 1.4));
      this.foliage.densityMultiplier = 0.7;
      if (this.pipeline) {
        this.pipeline.bloomEnabled = true;
        this.pipeline.samples = 2;
      }
    } else {
      // HIGH: Crisp 1.75 dpr, dense foliage, full bloom
      this.engine.setHardwareScalingLevel(1 / Math.min(dpr, 1.75));
      this.foliage.densityMultiplier = 1.0;
      if (this.pipeline) {
        this.pipeline.bloomEnabled = true;
        this.pipeline.samples = 2;
      }
    }
  }

  public update(currentFps: number, deltaTime: number): void {
    if (this.currentMode !== 'AUTO') return;

    this.fpsBuffer.push(currentFps);
    this.autoTimer += deltaTime;

    // Evaluate every 3.5 seconds
    if (this.autoTimer >= 3.5 && this.fpsBuffer.length > 0) {
      const avgFps = this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length;
      this.fpsBuffer = [];
      this.autoTimer = 0;

      // Auto downgrader: If falling below 33 FPS, downgrade tier to sustain 60 FPS
      if (avgFps < 33) {
        if (this.activeTier === 'HIGH') {
          console.log('[QualityManager] Auto downgrading to MEDIUM to protect 60 FPS target');
          this.applyTier('MEDIUM');
        } else if (this.activeTier === 'MEDIUM') {
          console.log('[QualityManager] Auto downgrading to LOW to protect 30+ FPS floor');
          this.applyTier('LOW');
        }
      } else if (avgFps > 57 && this.activeTier === 'LOW') {
        // Upgrade back if performance stabilized
        this.applyTier('MEDIUM');
      }
    }
  }

  private initDOM(): void {
    const qBtn = document.getElementById('qualityToggleBtn');
    const qModal = document.getElementById('qualityModal');
    const closeBtn = document.getElementById('closeQualityModal');

    if (qBtn && qModal) {
      qBtn.addEventListener('click', () => {
        qModal.style.display = qModal.style.display === 'flex' ? 'none' : 'flex';
      });
    }

    if (closeBtn && qModal) {
      closeBtn.addEventListener('click', () => {
        qModal.style.display = 'none';
      });
    }

    const bindOpt = (id: string, mode: QualityLevel) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.setQuality(mode);
        });
      }
    };

    bindOpt('qOptAuto', 'AUTO');
    bindOpt('qOptHigh', 'HIGH');
    bindOpt('qOptMed', 'MEDIUM');
    bindOpt('qOptLow', 'LOW');

    this.updateDOMButtons();
  }

  private updateDOMButtons(): void {
    const ids: Record<QualityLevel, string> = {
      AUTO: 'qOptAuto',
      HIGH: 'qOptHigh',
      MEDIUM: 'qOptMed',
      LOW: 'qOptLow'
    };

    for (const [key, id] of Object.entries(ids)) {
      const el = document.getElementById(id);
      if (el) {
        if (key === this.currentMode) {
          el.style.borderColor = '#38bdf8';
          el.style.background = 'rgba(56, 189, 248, 0.3)';
          el.style.color = '#ffffff';
        } else {
          el.style.borderColor = 'rgba(148, 163, 184, 0.3)';
          el.style.background = 'rgba(15, 23, 42, 0.8)';
          el.style.color = '#94a3b8';
        }
      }
    }
  }
}
