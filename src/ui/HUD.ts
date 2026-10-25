/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Yatay Ekran Uyumlu DOM HUD & Menü Sistemi (HUD)
 * (Orta %60 Temiz Alan, Silah & Ok Seçimi, Sessiz Vuruş Butonu, Gizlilik & Oksijen Rozetleri,
 *  HUD Düzenleme Modu, 2 Sütunlu Ayarlar, ?debug=1 Paneli & Sıfır GC)
 */

import { Vector3, Scene } from '@babylonjs/core';
import { CombatSystem } from '../combat/CombatSystem';
import { PlayerController } from '../player/PlayerController';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { SettingsStore } from '../infra/SettingsStore';
import { HapticsManager } from '../infra/HapticsManager';
import { t } from '../infra/i18n';
import { EventBus } from '../infra/EventBus';
import { WEAPON_DEFINITIONS, ARROW_DEFINITIONS } from '../combat/WeaponData';
import { NPCEntity } from '../world/NPCManager';
import { QuestManager } from '../story/QuestManager';
import { DialogueManager } from '../story/DialogueManager';
import { KamPowerManager } from '../powers/KamPowerManager';
import { TemperatureSystem } from '../world/TemperatureSystem';

export class HUD {
  // DOM Referansları
  private fpsDisplay: HTMLElement | null;
  private stateDisplay: HTMLElement | null;
  private weaponDisplay: HTMLElement | null;
  private recenterBtn: HTMLElement | null;
  private biomeDisplay: HTMLElement | null;
  private hpFill: HTMLElement | null;
  private hpValue: HTMLElement | null;
  private spFill: HTMLElement | null;
  private spValue: HTMLElement | null;
  private kpFill: HTMLElement | null;
  private kpValue: HTMLElement | null;
  private btnPowerCast: HTMLElement | null;
  private btnPowerWheel: HTMLElement | null;
  private powerBtnIcon: HTMLElement | null;
  private arrowCount: HTMLElement | null;
  private arrowTypeName: HTMLElement | null;
  private attackBtnLabel: HTMLElement | null;
  private kutVignette: HTMLElement | null;
  private bowCrosshair: HTMLElement | null;
  private lockReticle: HTMLElement | null;
  private flurryBanner: HTMLElement | null;
  private btnSneakStrike: HTMLElement | null;
  private stealthBadge: HTMLElement | null;
  private oxygenBadge: HTMLElement | null;
  private oxygenValue: HTMLElement | null;
  private temperatureBadge: HTMLElement | null;
  private tempValue: HTMLElement | null;
  private tempWarning: HTMLElement | null;

  // Boss Can Barı (Tepegöz)
  private bossBarContainer: HTMLElement | null;
  private bossName: HTMLElement | null;
  private bossHpFill: HTMLElement | null;
  private bossHpValue: HTMLElement | null;

  // Görev, Harita & NPC DOM Referansları
  private activeQuestBanner: HTMLElement | null;
  private questBannerTitle: HTMLElement | null;
  private questBannerObjective: HTMLElement | null;
  private btnOpenMap: HTMLElement | null;
  private btnOpenPauseMenu: HTMLElement | null;
  private npcTalkPrompt: HTMLElement | null;
  private npcTalkName: HTMLElement | null;
  public activeNearbyNpc: NPCEntity | null = null;

  // Börü Yoldaş Butonları
  private btnBoruSniff: HTMLElement | null;
  private btnBoruFollow: HTMLElement | null;
  private btnBoruStay: HTMLElement | null;
  private btnBoruAttack: HTMLElement | null;

  // Diyalog ve Letterbox
  private dialogueBanner: HTMLElement | null;
  private dialogueSpeaker: HTMLElement | null;
  private dialogueText: HTMLElement | null;
  private letterboxTop: HTMLElement | null;
  private letterboxBottom: HTMLElement | null;

  // İki Sütunlu Ayarlar Menüsü
  private settingsModal: HTMLElement | null;
  private openSettingsBtn: HTMLElement | null;
  private closeSettingsBtn: HTMLElement | null;

  // HUD Düzenleme Modu (Edit Mode)
  public isHudEditMode = false;
  private editHudBtn: HTMLElement | null;
  private hudEditBar: HTMLElement | null;
  private saveHudBtn: HTMLElement | null;
  private resetHudBtn: HTMLElement | null;
  private scaleSlider: HTMLInputElement | null;
  private opacitySlider: HTMLInputElement | null;
  private leftHandToggle: HTMLInputElement | null;

  // Debug Telemetri Paneli
  private debugPanel: HTMLElement | null;
  private debugDrawCalls: HTMLElement | null;
  private debugActiveMeshes: HTMLElement | null;
  private debugJsHeap: HTMLElement | null;

  // Sıcak döngüde sıfır GC scratch nesnesi
  private scratchTargetPos = new Vector3(0, 0, 0);

  // FPS Telemetri
  private frameCount = 0;
  private timeAccumulator = 0;
  public currentFps = 60;

  // Sürükleme değişkenleri
  private activeDraggingEl: HTMLElement | null = null;
  private dragOffset = { x: 0, y: 0 };

  constructor(onRecenterCamera: () => void) {
    this.fpsDisplay = document.getElementById('fpsDisplay');
    this.stateDisplay = document.getElementById('stateDisplay');
    this.weaponDisplay = document.getElementById('weaponDisplay');
    this.recenterBtn = document.getElementById('recenterBtn');
    this.biomeDisplay = document.getElementById('biomeDisplay');
    this.hpFill = document.getElementById('hpFill');
    this.hpValue = document.getElementById('hpValue');
    this.spFill = document.getElementById('spFill');
    this.spValue = document.getElementById('spValue');
    this.kpFill = document.getElementById('kpFill');
    this.kpValue = document.getElementById('kpValue');
    this.btnPowerCast = document.getElementById('btnPowerCast');
    this.btnPowerWheel = document.getElementById('btnPowerWheel');
    this.powerBtnIcon = document.getElementById('powerBtnIcon');
    this.arrowCount = document.getElementById('arrowCount');
    this.arrowTypeName = document.getElementById('arrowTypeName');
    this.attackBtnLabel = document.getElementById('attackBtnLabel');
    this.kutVignette = document.getElementById('kutZamaniVignette');
    this.bowCrosshair = document.getElementById('bowCrosshair');
    this.lockReticle = document.getElementById('lockOnReticle');
    this.flurryBanner = document.getElementById('flurryRushBanner');
    this.btnSneakStrike = document.getElementById('btnSneakStrike');
    this.stealthBadge = document.getElementById('stealthBadge');
    this.oxygenBadge = document.getElementById('oxygenBadge');
    this.oxygenValue = document.getElementById('oxygenValue');
    this.temperatureBadge = document.getElementById('temperatureBadge');
    this.tempValue = document.getElementById('tempValue');
    this.tempWarning = document.getElementById('tempWarning');

    this.bossBarContainer = document.getElementById('bossBarContainer');
    if (this.bossBarContainer) {
      this.bossBarContainer.style.display = 'none';
    }
    this.bossName = document.getElementById('bossName');
    this.bossHpFill = document.getElementById('bossHpFill');
    this.bossHpValue = document.getElementById('bossHpValue');

    this.dialogueBanner = document.getElementById('dialogueBanner');
    this.dialogueSpeaker = document.getElementById('dialogueSpeaker');
    this.dialogueText = document.getElementById('dialogueText');
    this.letterboxTop = document.getElementById('letterboxTop');
    this.letterboxBottom = document.getElementById('letterboxBottom');

    this.activeQuestBanner = document.getElementById('activeQuestBanner');
    this.questBannerTitle = document.getElementById('questBannerTitle');
    this.questBannerObjective = document.getElementById('questBannerObjective');
    this.btnOpenMap = document.getElementById('btnOpenMap');
    this.btnOpenPauseMenu = document.getElementById('btnOpenPauseMenu');
    this.npcTalkPrompt = document.getElementById('npcTalkPrompt');
    this.npcTalkName = document.getElementById('npcTalkName');

    this.btnBoruSniff = document.getElementById('btnBoruSniff');
    this.btnBoruFollow = document.getElementById('btnBoruFollow');
    this.btnBoruStay = document.getElementById('btnBoruStay');
    this.btnBoruAttack = document.getElementById('btnBoruAttack');

    if (this.btnOpenMap) {
      this.btnOpenMap.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        EventBus.emit('map:open');
      });
    }

    if (this.btnOpenPauseMenu) {
      this.btnOpenPauseMenu.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        EventBus.emit('ui:menu_open', { menuId: 'destan' });
      });
    }

    const btnOpenKopuz = document.getElementById('btnOpenKopuz');
    if (btnOpenKopuz) {
      btnOpenKopuz.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        EventBus.emit('ui:menu_open', { menuId: 'kopuz' });
      });
    }

    const btnOpenInventory = document.getElementById('btnOpenInventory');
    if (btnOpenInventory) {
      btnOpenInventory.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        EventBus.emit('inventory:open');
      });
    }

    if (this.npcTalkPrompt) {
      this.npcTalkPrompt.addEventListener('click', () => {
        if (this.activeNearbyNpc) {
          ProceduralAudio.playButtonClick();
          DialogueManager.getInstance().startDialogue(this.activeNearbyNpc.dialogueId, this.activeNearbyNpc.headMesh);
        }
      });
    }

    this.settingsModal = document.getElementById('settingsModal');
    this.openSettingsBtn = document.getElementById('openSettingsBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsModal');

    this.editHudBtn = document.getElementById('btnEditHud');
    this.hudEditBar = document.getElementById('hudEditBar');
    this.saveHudBtn = document.getElementById('btnSaveHud');
    this.resetHudBtn = document.getElementById('btnResetHud');
    this.scaleSlider = document.getElementById('hudScaleSlider') as HTMLInputElement;
    this.opacitySlider = document.getElementById('hudOpacitySlider') as HTMLInputElement;
    this.leftHandToggle = document.getElementById('leftHandToggle') as HTMLInputElement;

    this.debugPanel = document.getElementById('debugPanel');
    this.debugDrawCalls = document.getElementById('debugDrawCalls');
    this.debugActiveMeshes = document.getElementById('debugActiveMeshes');
    this.debugJsHeap = document.getElementById('debugJsHeap');

    if (this.recenterBtn) {
      const handleRecenter = (e: Event) => {
        e.preventDefault();
        ProceduralAudio.playButtonClick();
        HapticsManager.buttonTap();
        onRecenterCamera();
      };
      this.recenterBtn.addEventListener('click', handleRecenter);
      this.recenterBtn.addEventListener('pointerdown', handleRecenter);
    }

    this.initSettingsModalDOM();
    this.initHudEditModeDOM();
    this.applySettingsToDOM();

    EventBus.on('settings:updated', () => {
      this.applySettingsToDOM();
    });

    EventBus.on('ui:dialogue_show', (data: { speaker: string; text: string }) => {
      this.showDialogue(data.speaker, data.text);
    });

    EventBus.on('ui:dialogue_hide', () => {
      this.hideDialogue();
    });

    EventBus.on('ui:loot_toast', (data: { text: string }) => {
      this.showLootToast(data.text);
    });
  }

  public setupBoruCallbacks(callbacks: {
    onSniff: () => void;
    onFollow: () => void;
    onStay: () => void;
    onAttack: () => void;
  }): void {
    if (this.btnBoruSniff) {
      this.btnBoruSniff.addEventListener('click', () => {
        callbacks.onSniff();
      });
    }
    if (this.btnBoruFollow) {
      this.btnBoruFollow.addEventListener('click', () => {
        callbacks.onFollow();
      });
    }
    if (this.btnBoruStay) {
      this.btnBoruStay.addEventListener('click', () => {
        callbacks.onStay();
      });
    }
    if (this.btnBoruAttack) {
      this.btnBoruAttack.addEventListener('click', () => {
        callbacks.onAttack();
      });
    }
  }

  public setupPowerCallbacks(callbacks: {
    onCastPower: () => void;
    onOpenPowerWheel: () => void;
  }): void {
    if (this.btnPowerCast) {
      this.btnPowerCast.addEventListener('click', () => {
        callbacks.onCastPower();
      });
    }

    if (this.btnPowerWheel) {
      this.btnPowerWheel.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        callbacks.onOpenPowerWheel();
      });
      this.btnPowerWheel.addEventListener('click', () => {
        callbacks.onOpenPowerWheel();
      });
    }
  }

  public setupMountCallbacks(callbacks: {
    onCallMount: () => void;
    onToggleMount: () => void;
  }): void {
    const btnCall = document.getElementById('btnCallMount');
    if (btnCall) {
      btnCall.addEventListener('click', () => callbacks.onCallMount());
    }

    const btnMount = document.getElementById('btnMount');
    if (btnMount) {
      btnMount.addEventListener('click', () => callbacks.onToggleMount());
    }
  }

  public setMountButtonVisible(visible: boolean, label = 'BİN'): void {
    const btnMount = document.getElementById('btnMount');
    if (btnMount) {
      btnMount.style.display = visible ? 'block' : 'none';
      btnMount.textContent = label;
    }
  }

  /**
   * Kural 5: HUD Düzenleme Modu (Düğme sürükleme, boyut, saydamlık, sol el modu)
   */
  private initHudEditModeDOM(): void {
    if (this.editHudBtn) {
      this.editHudBtn.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        HapticsManager.buttonTap();
        this.toggleHudEditMode();
      });
    }

    if (this.saveHudBtn) {
      this.saveHudBtn.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        HapticsManager.buttonTap();
        this.toggleHudEditMode(false);
      });
    }

    if (this.resetHudBtn) {
      this.resetHudBtn.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        HapticsManager.buttonTap();
        SettingsStore.update({
          customButtonPositions: {},
          hudScale: 1.0,
          hudOpacity: 0.92,
          leftHandMode: false
        });
        this.resetButtonStyles();
      });
    }

    if (this.scaleSlider) {
      this.scaleSlider.addEventListener('input', () => {
        const val = parseFloat(this.scaleSlider!.value);
        SettingsStore.set('hudScale', val);
      });
    }

    if (this.opacitySlider) {
      this.opacitySlider.addEventListener('input', () => {
        const val = parseFloat(this.opacitySlider!.value);
        SettingsStore.set('hudOpacity', val);
      });
    }

    if (this.leftHandToggle) {
      this.leftHandToggle.addEventListener('change', () => {
        SettingsStore.set('leftHandMode', this.leftHandToggle!.checked);
      });
    }

    const draggables = document.querySelectorAll<HTMLElement>('.draggable-hud-btn');
    draggables.forEach((el) => {
      el.addEventListener('pointerdown', (e: PointerEvent) => {
        if (!this.isHudEditMode) return;
        e.preventDefault();
        e.stopPropagation();

        this.activeDraggingEl = el;
        const rect = el.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Fallback
        }
      });

      el.addEventListener('pointermove', (e: PointerEvent) => {
        if (!this.isHudEditMode || this.activeDraggingEl !== el) return;
        e.preventDefault();

        const x = Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, e.clientX - this.dragOffset.x));
        const y = Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 10, e.clientY - this.dragOffset.y));

        el.style.position = 'fixed';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.bottom = 'auto';
        el.style.right = 'auto';
      });

      const endDrag = (e: PointerEvent) => {
        if (this.isHudEditMode && this.activeDraggingEl === el) {
          try {
            el.releasePointerCapture(e.pointerId);
          } catch {
            // Fallback
          }
          this.activeDraggingEl = null;

          const rect = el.getBoundingClientRect();
          SettingsStore.saveButtonPosition(el.id, rect.left, rect.top);
          HapticsManager.buttonTap();
        }
      };

      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);
    });
  }

  public toggleHudEditMode(force?: boolean): void {
    this.isHudEditMode = force !== undefined ? force : !this.isHudEditMode;

    const overlay = document.getElementById('hudOverlay');
    if (overlay) {
      if (this.isHudEditMode) {
        overlay.classList.add('hud-edit-active');
      } else {
        overlay.classList.remove('hud-edit-active');
      }
    }

    if (this.hudEditBar) {
      this.hudEditBar.style.display = this.isHudEditMode ? 'flex' : 'none';
    }

    EventBus.emit('ui:hud_edit_toggle', { isEditing: this.isHudEditMode });
  }

  private resetButtonStyles(): void {
    const draggables = document.querySelectorAll<HTMLElement>('.draggable-hud-btn');
    draggables.forEach((el) => {
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      el.style.bottom = '';
      el.style.right = '';
    });
  }

  /**
   * Kural 10: İki Sütunlu Ayarlar Menüsü (Grafik, Kontrol, Ses, Erişilebilirlik)
   */
  private initSettingsModalDOM(): void {
    if (this.openSettingsBtn) {
      this.openSettingsBtn.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        HapticsManager.buttonTap();
        this.openSettings();
      });
    }

    if (this.closeSettingsBtn) {
      this.closeSettingsBtn.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        HapticsManager.buttonTap();
        this.closeSettings();
      });
    }

    const tabButtons = document.querySelectorAll<HTMLElement>('.settings-tab-btn');
    const tabPanes = document.querySelectorAll<HTMLElement>('.settings-tab-pane');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        HapticsManager.buttonTap();

        const targetTab = btn.getAttribute('data-tab');
        tabButtons.forEach((b) => b.classList.remove('active'));
        tabPanes.forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const activePane = document.getElementById(`tabPane_${targetTab}`);
        if (activePane) activePane.classList.add('active');
      });
    });

    const initToggle = (id: string, settingKey: any) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) {
        el.addEventListener('change', () => {
          SettingsStore.set(settingKey, el.checked);
          ProceduralAudio.playButtonClick();
        });
      }
    };

    const initSlider = (id: string, settingKey: any) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) {
        el.addEventListener('input', () => {
          SettingsStore.set(settingKey, parseFloat(el.value));
        });
      }
    };

    initToggle('settingCameraAssist', 'cameraAssist');
    initSlider('settingCameraSens', 'cameraSensitivity');
    initToggle('settingGyroAim', 'gyroAimEnabled');
    initSlider('settingGyroSens', 'gyroSensitivity');
    initToggle('settingInvertY', 'invertY');
    initToggle('settingHaptics', 'hapticsEnabled');
    initSlider('settingMasterVol', 'masterVolume');
    initSlider('settingSfxVol', 'sfxVolume');
    initToggle('settingColorblindMode', 'colorblindMode');
    initToggle('settingDebugPanel', 'showDebugPanel');

    const langSelect = document.getElementById('settingLanguage') as HTMLSelectElement;
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        SettingsStore.set('language', langSelect.value as any);
        ProceduralAudio.playButtonClick();
      });
    }
  }

  public openSettings(): void {
    if (this.settingsModal) {
      this.settingsModal.style.display = 'flex';
      this.applySettingsToDOM();
    }
    EventBus.emit('ui:settings_open');
  }

  public closeSettings(): void {
    if (this.settingsModal) {
      this.settingsModal.style.display = 'none';
    }
    EventBus.emit('ui:settings_close');
  }

  private applySettingsToDOM(): void {
    const s = SettingsStore.get();
    document.documentElement.style.setProperty('--hud-scale', s.hudScale.toString());
    document.documentElement.style.setProperty('--hud-opacity', s.hudOpacity.toString());

    const bottomZone = document.querySelector('.bottom-zone');
    if (bottomZone) {
      if (s.leftHandMode) bottomZone.classList.add('left-hand-mode');
      else bottomZone.classList.remove('left-hand-mode');
    }

    if (this.debugPanel) {
      this.debugPanel.style.display = s.showDebugPanel ? 'block' : 'none';
    }

    for (const [btnId, pos] of Object.entries(s.customButtonPositions)) {
      const el = document.getElementById(btnId);
      if (el) {
        el.style.position = 'fixed';
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
        el.style.bottom = 'auto';
        el.style.right = 'auto';
      }
    }
  }

  public showDialogue(speaker: string, text: string): void {
    if (this.dialogueBanner && this.dialogueSpeaker && this.dialogueText) {
      this.dialogueSpeaker.textContent = `${speaker}:`;
      this.dialogueText.textContent = text;
      this.dialogueBanner.style.display = 'block';

      if (this.letterboxTop && this.letterboxBottom) {
        this.letterboxTop.classList.add('active');
        this.letterboxBottom.classList.add('active');
      }
    }
  }

  public hideDialogue(): void {
    if (this.dialogueBanner) {
      this.dialogueBanner.style.display = 'none';
    }
    if (this.letterboxTop && this.letterboxBottom) {
      this.letterboxTop.classList.remove('active');
      this.letterboxBottom.classList.remove('active');
    }
  }

  public showLootToast(text: string): void {
    const toast = document.createElement('div');
    toast.className = 'loot-toast';
    toast.textContent = text;
    const container = document.getElementById('lootToastContainer');
    if (container) {
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 1800);
    }
  }

  /**
   * HUD Güncellemesi (Sıcak Döngüde Sıfır GC)
   */
  public update(
    combat: CombatSystem,
    player: PlayerController,
    biomeName: string,
    deltaTime: number,
    scene: Scene,
    nearbyNpc: NPCEntity | null = null
  ): void {
    this.frameCount++;
    this.timeAccumulator += deltaTime;

    // NPC Etkileşim İstemi
    this.activeNearbyNpc = nearbyNpc;
    if (this.npcTalkPrompt && this.npcTalkName) {
      if (nearbyNpc) {
        this.npcTalkPrompt.style.display = 'flex';
        this.npcTalkName.textContent = nearbyNpc.name;
      } else {
        this.npcTalkPrompt.style.display = 'none';
      }
    }

    // Aktif Görev Banner'ı Güncellemesi
    if (this.activeQuestBanner && this.questBannerTitle && this.questBannerObjective) {
      const activeQuest = QuestManager.getInstance().getActiveQuest();
      if (activeQuest && activeQuest.state !== 'COMPLETED') {
        this.activeQuestBanner.style.display = 'flex';
        this.questBannerTitle.textContent = activeQuest.titleTr;
        const curObj = activeQuest.objectives.find((o) => !o.isDone) || activeQuest.objectives[0];
        if (curObj) {
          this.questBannerObjective.textContent = `🎯 ${curObj.descriptionTr} (${curObj.currentCount}/${curObj.targetCount})`;
        } else {
          this.questBannerObjective.textContent = 'Hedef tamamlandı, emaneti teslim et.';
        }
      } else {
        this.activeQuestBanner.style.display = 'none';
      }
    }

    // 1. Can ve Soluk Çubukları
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

    // Kut Gücü Barı Güncellemesi (Kut Power)
    const kamPower = KamPowerManager.getInstance(scene);
    if (this.kpFill && this.kpValue) {
      const kpPct = Math.max(0, Math.min(100, (kamPower.kutPower / kamPower.maxKutPower) * 100));
      this.kpFill.style.width = `${kpPct}%`;
      this.kpValue.textContent = Math.round(kamPower.kutPower).toString();
    }

    if (this.powerBtnIcon) {
      this.powerBtnIcon.textContent = kamPower.activePower === 'FIRE' ? '🔥' : kamPower.activePower === 'WIND' ? '🌪️' : '⏳';
    }

    // 2. Ok Sayısı ve Seçili Temren Türü
    if (this.arrowCount) {
      this.arrowCount.textContent = combat.arrowSystem.currentStock.toString();
    }
    if (this.arrowTypeName) {
      const arrowDef = ARROW_DEFINITIONS[combat.arrowSystem.selectedArrowType];
      this.arrowTypeName.textContent = `[${arrowDef.nameTr.toUpperCase()}]`;
    }

    // 3. Silah ve Vuruş Düğmesi Etiketi
    const weaponDef = WEAPON_DEFINITIONS[combat.activeWeapon];
    if (this.weaponDisplay) {
      this.weaponDisplay.textContent = weaponDef.nameTr.toUpperCase();
    }
    if (this.attackBtnLabel) {
      this.attackBtnLabel.textContent = combat.activeWeapon === 'KAM_SWORD' ? 'KILIÇ' : combat.activeWeapon === 'BATTLE_AXE' ? 'BALTA' : 'KARGI';
    }

    if (this.biomeDisplay) {
      this.biomeDisplay.textContent = biomeName.toUpperCase();
    }

    // 4. Gizlilik ve Oksijen Rozetleri
    if (this.stealthBadge) {
      const isStealth = player.isCrouching || player.isCamouflaged;
      this.stealthBadge.style.display = isStealth ? 'flex' : 'none';
    }

    if (this.oxygenBadge && this.oxygenValue) {
      if (player.isDiving) {
        this.oxygenBadge.style.display = 'flex';
        this.oxygenValue.textContent = `${Math.round(player.oxygen)}%`;
      } else {
        this.oxygenBadge.style.display = 'none';
      }
    }

    // 5. Sessiz Vuruş (Sneak Strike) Butonu
    const sneakCandidate = combat.checkSneakStrikeCandidate(player.position, player.headingAngle);
    if (this.btnSneakStrike) {
      this.btnSneakStrike.style.display = sneakCandidate ? 'block' : 'none';
    }

    // 6. Kut Zamanı Radyansı
    if (this.kutVignette) {
      if (combat.isKutZamaniActive) {
        this.kutVignette.classList.add('active');
      } else {
        this.kutVignette.classList.remove('active');
      }
    }

    // 6.5. Ortam Sıcaklığı ve Isı Uyarısı (FAZ 9: TemperatureSystem)
    const tempSys = TemperatureSystem.getInstance();
    if (this.temperatureBadge && this.tempValue) {
      if (tempSys.isTemperatureSystemActive) {
        this.temperatureBadge.style.display = 'inline-flex';
        this.tempValue.textContent = `${Math.round(tempSys.currentTemperature)}°C`;
        if (this.tempWarning) {
          this.tempWarning.style.display = tempSys.currentTemperature >= 45.0 ? 'inline' : 'none';
        }
      } else {
        this.temperatureBadge.style.display = 'none';
      }
    }

    // 7. Boss Can Barı (Tepegöz veya Demir Dağ Bekçisi)
    if (this.bossBarContainer && this.bossHpFill && this.bossHpValue) {
      if (combat.bossTepegoz && !combat.bossTepegoz.isDead) {
        const distToBoss = Vector3.Distance(player.position, combat.bossTepegoz.position);
        if (distToBoss < 32.0) {
          this.bossBarContainer.style.display = 'flex';
          const pct = Math.max(0, Math.min(100, (combat.bossTepegoz.health / combat.bossTepegoz.maxHealth) * 100));
          this.bossHpFill.style.width = `${pct}%`;
          this.bossHpValue.textContent = `${Math.round(combat.bossTepegoz.health)} / ${combat.bossTepegoz.maxHealth}`;

          if (this.bossName) {
            if (combat.bossTepegoz.phase === 'PHASE_3_ENRAGED') {
              this.bossName.textContent = 'TEPEGÖZ: KUT ÖFKESİ';
              this.bossName.style.color = '#ef4444';
            } else if (combat.bossTepegoz.phase === 'KNEELING_BLIND') {
              this.bossName.textContent = 'TEPEGÖZ (KÖR OLDU - BASAT BİTİRİŞİ!)';
              this.bossName.style.color = '#fde047';
            } else if (combat.bossTepegoz.phase === 'PHASE_2') {
              this.bossName.textContent = 'TEPEGÖZ: GÖZÜ SİPERLİ (TOPUĞA VUR!)';
              this.bossName.style.color = '#f59e0b';
            } else {
              this.bossName.textContent = 'TEPEGÖZ: YER-SUB DEVİ';
              this.bossName.style.color = '#fca5a5';
            }
          }
        } else {
          this.bossBarContainer.style.display = 'none';
        }
      } else if (combat.bossDemirDag && !combat.bossDemirDag.isDead) {
        const distToBoss = Vector3.Distance(player.position, combat.bossDemirDag.position);
        if (distToBoss < 55.0) {
          this.bossBarContainer.style.display = 'flex';
          const pct = Math.max(0, Math.min(100, (combat.bossDemirDag.health / combat.bossDemirDag.maxHealth) * 100));
          this.bossHpFill.style.width = `${pct}%`;
          this.bossHpValue.textContent = `${Math.round(combat.bossDemirDag.health)} / ${combat.bossDemirDag.maxHealth}`;

          if (this.bossName) {
            if (combat.bossDemirDag.phase === 'PHASE_2_MOLTEN_ARMOR') {
              this.bossName.textContent = 'DEMİR DAĞ BEKÇİSİ (AKKOR ZIRH - SU KANALLARINI KIR!)';
              this.bossName.style.color = '#f97316';
            } else if (combat.bossDemirDag.phase === 'PHASE_3_ENRAGED') {
              this.bossName.textContent = 'DEMİR DAĞ BEKÇİSİ (ERLİK ÖFKESİ & KOR OCAK)';
              this.bossName.style.color = '#ef4444';
            } else if (combat.bossDemirDag.phase === 'STAGGERED') {
              this.bossName.textContent = 'DEMİR DAĞ BEKÇİSİ (TERMAL ŞOK - ZIRH ÇATLADI!)';
              this.bossName.style.color = '#38bdf8';
            } else {
              this.bossName.textContent = 'DEMİR DAĞ BEKÇİSİ: ERLİK\'İN DEMİRCİ DEVİ';
              this.bossName.style.color = '#fca5a5';
            }
          }
        } else {
          this.bossBarContainer.style.display = 'none';
        }
      } else if (combat.bossSahmaran && !combat.bossSahmaran.isDead) {
        const distToBoss = Vector3.Distance(player.position, combat.bossSahmaran.position);
        if (distToBoss < 55.0) {
          this.bossBarContainer.style.display = 'flex';
          const pct = Math.max(0, Math.min(100, (combat.bossSahmaran.health / combat.bossSahmaran.maxHealth) * 100));
          this.bossHpFill.style.width = `${pct}%`;
          this.bossHpValue.textContent = `${Math.round(combat.bossSahmaran.health)} / ${combat.bossSahmaran.maxHealth}`;

          if (this.bossName) {
            if (combat.bossSahmaran.phase === 'PHASE_2_VENOM_SHIELD') {
              const activeCount = combat.bossSahmaran.purifierStones.filter((s: { isActivated: boolean }) => s.isActivated).length;
              this.bossName.textContent = `ŞAHMARAN: ZEHİR KALKANI (ARITICI TAŞLAR: ${activeCount}/3)`;
              this.bossName.style.color = '#4ade80';
            } else if (combat.bossSahmaran.phase === 'PHASE_3_TSUNAMI') {
              this.bossName.textContent = 'ŞAHMARAN (TSUNAMI ÖFKESİ & KARA SU)';
              this.bossName.style.color = '#ef4444';
            } else if (combat.bossSahmaran.phase === 'STAGGERED') {
              this.bossName.textContent = 'ŞAHMARAN (ARINMA ŞOKU - ZIRHI ÇÖKTÜ!)';
              this.bossName.style.color = '#38bdf8';
            } else {
              this.bossName.textContent = 'ŞAHMARAN: SU İYESİ / KARA SU DEVİ';
              this.bossName.style.color = '#67e8f9';
            }
          }
        } else {
          this.bossBarContainer.style.display = 'none';
        }
      } else if (combat.bossYelbegen && !combat.bossYelbegen.isDead) {
        const distToBoss = Vector3.Distance(player.position, combat.bossYelbegen.position);
        if (distToBoss < 60.0) {
          this.bossBarContainer.style.display = 'flex';
          const pct = Math.max(0, Math.min(100, (combat.bossYelbegen.health / combat.bossYelbegen.maxHealth) * 100));
          this.bossHpFill.style.width = `${pct}%`;
          this.bossHpValue.textContent = `${Math.round(combat.bossYelbegen.health)} / ${combat.bossYelbegen.maxHealth}`;

          if (this.bossName) {
            const severedCount = combat.bossYelbegen.heads.filter((h) => h.isSevered).length;
            const cauterizedCount = combat.bossYelbegen.heads.filter((h) => h.isCauterized).length;

            if (combat.bossYelbegen.phase === 'FINAL_HEAD_RAGE') {
              this.bossName.textContent = 'YELBEGEN: 7. ULU KARA BAŞ (ÖFKE & TSUNAMI!)';
              this.bossName.style.color = '#ef4444';
            } else {
              this.bossName.textContent = `YELBEGEN (Dağlanan: ${cauterizedCount}/6 | Kesilen: ${severedCount}/7)`;
              this.bossName.style.color = '#38bdf8';
            }
          }
        } else {
          this.bossBarContainer.style.display = 'none';
        }
      } else if (combat.bossErlikHan && !combat.bossErlikHan.isDead) {
        const distToBoss = Vector3.Distance(player.position, combat.bossErlikHan.position);
        if (distToBoss < 65.0) {
          this.bossBarContainer.style.display = 'flex';
          const pct = Math.max(0, Math.min(100, (combat.bossErlikHan.health / combat.bossErlikHan.maxHealth) * 100));
          this.bossHpFill.style.width = `${pct}%`;
          this.bossHpValue.textContent = `${Math.round(combat.bossErlikHan.health)} / ${combat.bossErlikHan.maxHealth}`;

          if (this.bossName) {
            if (combat.bossErlikHan.phase === 'PHASE_3_WEAKENED_CHOICE') {
              this.bossName.textContent = 'ERLİK HAN: DİZ ÇÖKTÜ (KADERİ SEÇ: DENGE VEYA YIKIM!)';
              this.bossName.style.color = '#fde047';
            } else if (combat.bossErlikHan.phase === 'PHASE_2_THREE_REGIMES') {
              if (combat.bossErlikHan.currentRegime === 'SHADOW_SHIELD') {
                this.bossName.textContent = 'ERLİK HAN: GÖLGE KALKANI (ATEŞLE YAK!)';
                this.bossName.style.color = '#f97316';
              } else if (combat.bossErlikHan.currentRegime === 'DARK_VORTEX') {
                this.bossName.textContent = 'ERLİK HAN: KARA GİRDAP (RÜZGÂRLA SAVUR!)';
                this.bossName.style.color = '#38bdf8';
              } else if (combat.bossErlikHan.currentRegime === 'FROZEN_TIME') {
                this.bossName.textContent = 'ERLİK HAN: DONMUŞ AN (KUT ZAMANI İLE KIR!)';
                this.bossName.style.color = '#c084fc';
              } else {
                this.bossName.textContent = 'ERLİK HAN: REJİM ÇÖKTÜ (AĞIR HASAR!)';
                this.bossName.style.color = '#ef4444';
              }
            } else {
              this.bossName.textContent = 'ERLİK HAN: YERALTININ VE KARA KIŞIN HAKANI';
              this.bossName.style.color = '#f87171';
            }
          }
        } else {
          this.bossBarContainer.style.display = 'none';
        }
      } else {
        this.bossBarContainer.style.display = 'none';
      }
    }

    if (this.bowCrosshair) {
      this.bowCrosshair.style.display = (combat.actionState === 'BOW_AIM' || combat.actionState === 'BOW_SHOOT') ? 'block' : 'none';
    }

    // Flurry Rush Banner'ı
    if (this.flurryBanner) {
      this.flurryBanner.style.display = combat.isKutZamaniActive ? 'block' : 'none';
    }

    // Kilitlenme Göstergesi Projeksiyonu (Sıfır GC)
    if (this.lockReticle) {
      if (combat.lockedTarget) {
        this.lockReticle.style.display = 'block';
        this.scratchTargetPos.copyFrom(combat.lockedTarget.position);
        this.scratchTargetPos.y += 1.0;

        const cam = scene.activeCamera;
        if (cam) {
          const vp = cam.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());
          const screenPos = Vector3.Project(
            this.scratchTargetPos,
            scene.getTransformMatrix(),
            scene.getViewMatrix(),
            vp
          );

          this.lockReticle.style.left = `${screenPos.x}px`;
          this.lockReticle.style.top = `${screenPos.y}px`;
        }
      } else {
        this.lockReticle.style.display = 'none';
      }
    }

    // Periyodik Telemetri & Debug Paneli Güncellemesi (0.5 saniyede bir)
    if (this.timeAccumulator >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.timeAccumulator);
      this.frameCount = 0;
      this.timeAccumulator = 0;

      if (this.fpsDisplay) {
        this.fpsDisplay.textContent = `${this.currentFps} FPS`;
        this.fpsDisplay.style.color = this.currentFps >= 50 ? '#4ade80' : this.currentFps >= 30 ? '#facc15' : '#ef4444';
      }

      if (this.stateDisplay) {
        this.stateDisplay.textContent = player.locomotionState;
      }

      // Kural 8: ?debug=1 Telemetri Paneli
      if (SettingsStore.get().showDebugPanel && this.debugPanel) {
        const engine = scene.getEngine() as any;
        if (this.debugDrawCalls) {
          this.debugDrawCalls.textContent = `Draw Calls: ${engine._drawCalls?.current || '--'}`;
        }
        if (this.debugActiveMeshes) {
          this.debugActiveMeshes.textContent = `Meshes: ${scene.getActiveMeshes().length}`;
        }
        if (this.debugJsHeap) {
          const mem = (performance as any).memory;
          if (mem) {
            const mb = Math.round(mem.usedJSHeapSize / (1024 * 1024));
            this.debugJsHeap.textContent = `JS Heap: ${mb} MB`;
          } else {
            this.debugJsHeap.textContent = `JS Heap: N/A`;
          }
        }
      }
    }
  }
}
