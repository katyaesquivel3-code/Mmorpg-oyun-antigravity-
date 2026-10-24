import { Vector3, Scene } from '@babylonjs/core';
import { CombatSystem } from '../combat/CombatSystem';

export class HUD {
  private fpsDisplay: HTMLElement | null;
  private stateDisplay: HTMLElement | null;
  private vertDisplay: HTMLElement | null;
  private recenterBtn: HTMLElement | null;
  private biomeDisplay: HTMLElement | null;
  private hpFill: HTMLElement | null;
  private hpValue: HTMLElement | null;
  private spFill: HTMLElement | null;
  private spValue: HTMLElement | null;
  private arrowCount: HTMLElement | null;
  private kutVignette: HTMLElement | null;
  private bowCrosshair: HTMLElement | null;
  private lockReticle: HTMLElement | null;

  // Smoothing FPS
  private frameCount = 0;
  private timeAccumulator = 0;
  public currentFps = 60;

  constructor(onRecenterCamera: () => void) {
    this.fpsDisplay = document.getElementById('fpsDisplay');
    this.stateDisplay = document.getElementById('stateDisplay');
    this.vertDisplay = document.getElementById('vertDisplay');
    this.recenterBtn = document.getElementById('recenterBtn');
    this.biomeDisplay = document.getElementById('biomeDisplay');
    this.hpFill = document.getElementById('hpFill');
    this.hpValue = document.getElementById('hpValue');
    this.spFill = document.getElementById('spFill');
    this.spValue = document.getElementById('spValue');
    this.arrowCount = document.getElementById('arrowCount');
    this.kutVignette = document.getElementById('kutZamaniVignette');
    this.bowCrosshair = document.getElementById('bowCrosshair');
    this.lockReticle = document.getElementById('lockOnReticle');

    if (this.recenterBtn) {
      this.recenterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        onRecenterCamera();
      });

      this.recenterBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onRecenterCamera();
      }, { passive: false });
    }
  }

  public update(
    deltaTime: number,
    combat: CombatSystem,
    activeVertices: number,
    biomeName: string,
    activeChunks: number,
    scene: Scene
  ): void {
    this.frameCount++;
    this.timeAccumulator += deltaTime;

    // 1. Health and Stamina Bars
    if (this.hpFill && this.hpValue) {
      const hpPct = Math.max(0, Math.min(100, (combat.health / combat.maxHealth) * 100));
      this.hpFill.style.width = `${hpPct}%`;
      this.hpValue.textContent = Math.round(combat.health).toString();
    }

    if (this.spFill && this.spValue) {
      const spPct = Math.max(0, Math.min(100, (combat.stamina / combat.maxStamina) * 100));
      this.spFill.style.width = `${spPct}%`;
      this.spValue.textContent = Math.round(combat.stamina).toString();
    }

    // 2. Arrow Count
    if (this.arrowCount) {
      this.arrowCount.textContent = combat.arrowSystem.arrowCount.toString();
    }

    // 3. Kut Zamanı Golden Vignette
    if (this.kutVignette) {
      if (combat.isKutZamaniActive) {
        this.kutVignette.classList.add('active');
      } else {
        this.kutVignette.classList.remove('active');
      }
    }

    // 4. Bow Aim Crosshair
    if (this.bowCrosshair) {
      this.bowCrosshair.style.display = (combat.actionState === 'BOW_AIM' || combat.actionState === 'BOW_SHOOT') ? 'block' : 'none';
    }

    // 5. Lock-On 3D to 2D Screen Reticle Projection
    if (this.lockReticle) {
      if (combat.lockedTarget) {
        this.lockReticle.style.display = 'block';
        const targetWorldPos = combat.lockedTarget.position.clone().add(new Vector3(0, 1.0, 0));
        const screenPos = Vector3.Project(
          targetWorldPos,
          scene.getTransformMatrix(),
          scene.getProjectionMatrix(),
          scene.activeCamera?.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight()) || scene.activeCamera!.viewport
        );

        if (screenPos.z > 0 && screenPos.z < 1) {
          const x = (screenPos.x / scene.getEngine().getRenderWidth()) * window.innerWidth;
          const y = (screenPos.y / scene.getEngine().getRenderHeight()) * window.innerHeight;
          this.lockReticle.style.left = `${x}px`;
          this.lockReticle.style.top = `${y}px`;
        }
      } else {
        this.lockReticle.style.display = 'none';
      }
    }

    // 6. Refresh FPS and status every 0.25 seconds
    if (this.timeAccumulator >= 0.25) {
      this.currentFps = Math.round(this.frameCount / this.timeAccumulator);
      this.frameCount = 0;
      this.timeAccumulator = 0;

      if (this.fpsDisplay) {
        this.fpsDisplay.textContent = `${this.currentFps} FPS`;
        if (this.currentFps >= 50) {
          this.fpsDisplay.style.color = '#4ade80';
        } else if (this.currentFps >= 30) {
          this.fpsDisplay.style.color = '#facc15';
        } else {
          this.fpsDisplay.style.color = '#f87171';
        }
      }

      if (this.vertDisplay) {
        this.vertDisplay.textContent = `CHUNK: ${activeChunks} (${Math.round(activeVertices / 1000)}K)`;
      }

      if (this.biomeDisplay) {
        this.biomeDisplay.textContent = biomeName.toUpperCase();
      }
    }

    if (this.stateDisplay) {
      const act = combat.actionState;
      let stateText = 'DURUM: BEKLEME';
      if (act === 'ATTACK_1') stateText = 'KAM KILIÇ: VURUŞ I';
      else if (act === 'ATTACK_2') stateText = 'KAM KILIÇ: VURUŞ II';
      else if (act === 'ATTACK_3') stateText = 'KAM KILIÇ: BİTİRİCİ';
      else if (act === 'CHARGE_WINDUP') stateText = 'ŞARJ EDİLİYOR...';
      else if (act === 'CHARGE_ATTACK') stateText = 'KUT GIRDABI (360°)';
      else if (act === 'DODGE_ROLL') stateText = 'DODGE ROLL (KAÇIŞ)';
      else if (act === 'SHIELD_BLOCK') stateText = 'KALKAN SAVUNMASI';
      else if (act === 'PARRY') stateText = 'PARRY SAVUŞTURMA!';
      else if (act === 'BOW_AIM') stateText = 'YAY NİŞANI (YAVAŞ)';
      else if (act === 'BOW_SHOOT') stateText = 'OK FIRLATILDI!';
      else if (act === 'HURT') stateText = 'DARBE ALINDI!';
      this.stateDisplay.textContent = stateText;
    }
  }
}
