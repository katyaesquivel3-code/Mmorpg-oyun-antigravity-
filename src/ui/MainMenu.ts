/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Yatay Canlı 3D Ana Menü (MainMenu)
 * (KURAL 4 UYUMLU: Solda Devam, Yeni Oyun, Yuvalar, Ayarlar; Arkada Canlı 3D Bay Terek Sahnesi & Yumuşak Geçiş)
 */

import {
  Scene,
  FreeCamera,
  Vector3,
  ParticleSystem,
  Color4,
  MeshBuilder,
  StandardMaterial,
  Color3
} from '@babylonjs/core';
import { SaveSystem, GameSaveData } from '../infra/SaveSystem';
import { ProceduralAudio } from '../audio/ProceduralAudio';

export class MainMenu {
  public scene: Scene;
  private menuContainer: HTMLElement | null;
  private btnContinue: HTMLElement | null;
  private btnNewGame: HTMLElement | null;
  private btnSlots: HTMLElement | null;
  private btnSettings: HTMLElement | null;
  private continueSubtext: HTMLElement | null;

  // 3D Menü Kamerası
  public menuCamera: FreeCamera;
  private cameraYaw = 0;
  public isActive = true;

  private onStartGameCallback: (loadedSave: GameSaveData | null) => void;
  private onOpenSettingsCallback: () => void;
  private onOpenSlotsCallback: () => void;

  constructor(
    scene: Scene,
    onStartGame: (loadedSave: GameSaveData | null) => void,
    onOpenSettings: () => void,
    onOpenSlots: () => void
  ) {
    this.scene = scene;
    this.onStartGameCallback = onStartGame;
    this.onOpenSettingsCallback = onOpenSettings;
    this.onOpenSlotsCallback = onOpenSlots;

    this.menuContainer = document.getElementById('mainMenuOverlay');
    this.btnContinue = document.getElementById('btnMenuContinue');
    this.btnNewGame = document.getElementById('btnMenuNewGame');
    this.btnSlots = document.getElementById('btnMenuSlots');
    this.btnSettings = document.getElementById('btnMenuSettings');
    this.continueSubtext = document.getElementById('menuContinueSubtext');

    // Menü 3D Sahne Kamerası (Bay Terek önünde konumlanmış)
    this.menuCamera = new FreeCamera('menu_camera', new Vector3(0, 8.5, -28), scene);
    this.menuCamera.setTarget(new Vector3(0, 12, 0));

    this.setupDOM();
    this.checkExistingSave();
  }

  private setupDOM(): void {
    if (this.btnContinue) {
      this.btnContinue.addEventListener('click', async () => {
        ProceduralAudio.playButtonClick();
        const saveSys = SaveSystem.getInstance();
        const latest = await saveSys.loadGame('autosave') || await saveSys.loadGame('slot_1');
        this.hideMenu(() => this.onStartGameCallback(latest));
      });
    }

    if (this.btnNewGame) {
      this.btnNewGame.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        this.hideMenu(() => this.onStartGameCallback(null));
      });
    }

    if (this.btnSlots) {
      this.btnSlots.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        this.onOpenSlotsCallback();
      });
    }

    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        this.onOpenSettingsCallback();
      });
    }
  }

  private checkExistingSave(): void {
    const saveSys = SaveSystem.getInstance();
    const slots = saveSys.listSlots();
    const hasAnySave = slots.some((s) => s !== null);

    if (this.btnContinue && this.continueSubtext) {
      if (hasAnySave) {
        this.btnContinue.removeAttribute('disabled');
        const latest = slots.find((s) => s !== null);
        if (latest) {
          this.continueSubtext.textContent = `📍 ${latest.locationNameTr} (${Math.floor(latest.playtimeSeconds / 60)} dk)`;
        }
      } else {
        this.btnContinue.setAttribute('disabled', 'true');
        this.continueSubtext.textContent = 'Kayıtlı oyun bulunamadı';
      }
    }
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Menüde kamerayı Bay Terek etrafında yavaşça süz
    this.cameraYaw += deltaTime * 0.08;
    const radius = 32.0;
    this.menuCamera.position.x = Math.sin(this.cameraYaw) * radius;
    this.menuCamera.position.z = -Math.cos(this.cameraYaw) * radius;
    this.menuCamera.setTarget(new Vector3(0, 10, 0));
  }

  public hideMenu(onComplete?: () => void): void {
    this.isActive = false;
    if (this.menuContainer) {
      this.menuContainer.style.opacity = '0';
      this.menuContainer.style.pointerEvents = 'none';
      setTimeout(() => {
        if (this.menuContainer) this.menuContainer.style.display = 'none';
        if (onComplete) onComplete();
      }, 600);
    } else {
      if (onComplete) onComplete();
    }
  }

  public showMenu(): void {
    this.isActive = true;
    this.checkExistingSave();
    if (this.menuContainer) {
      this.menuContainer.style.display = 'flex';
      setTimeout(() => {
        if (this.menuContainer) {
          this.menuContainer.style.opacity = '1';
          this.menuContainer.style.pointerEvents = 'auto';
        }
      }, 50);
    }
  }
}
