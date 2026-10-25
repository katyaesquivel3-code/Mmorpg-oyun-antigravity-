/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Dokunmatik Kontrol Yöneticisi (InputManager)
 * (Floating Joystick sol %40, Pençe Tutuş Köşe Düğmeleri, Sağ Başparmak Kümesi, Çömelme, Silah/Ok Değişimi & İvmeli Kamera)
 */

import { ProceduralAudio } from '../audio/ProceduralAudio';
import { HapticsManager } from '../infra/HapticsManager';
import { SettingsStore } from '../infra/SettingsStore';
import { WeaponType } from '../combat/WeaponData';
import { EventBus } from '../infra/EventBus';

export interface MovementInput {
  x: number;
  y: number;
  magnitude: number;
  isRunRequested: boolean;
}

export interface CombatInputCallbacks {
  onAttack: (isCharged: boolean) => void;
  onChargeStart: () => void;
  onChargeRelease: () => void;
  onDodgeRoll: () => void;
  onJump?: () => void;
  onCrouchToggle?: () => void;
  onWeaponSwitch?: (type?: WeaponType) => void;
  onArrowSwitch?: () => void;
  onSneakStrike?: () => void;
  onShield: (active: boolean) => void;
  onBowAimToggle: () => void;
  onBowShoot: () => void;
  onLockOnToggle: () => void;
  onPowerCast?: () => void;
  onMapToggle?: () => void;
  onMenuToggle?: () => void;
}

export class InputManager {
  public moveInput: MovementInput = { x: 0, y: 0, magnitude: 0, isRunRequested: false };
  public lookDelta = { x: 0, y: 0 };
  private consumedLookDelta = { x: 0, y: 0 };

  // Pointer IDs
  private joystickPointerId: number | null = null;
  private cameraPointerId: number | null = null;

  // Floating Joystick
  private joystickZone: HTMLElement | null = null;
  private joystickBase: HTMLElement | null = null;
  private joystickThumb: HTMLElement | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private readonly maxRadius = 48.0;

  // Kamera Sürükleme & İvmelenme
  private lastCameraPos = { x: 0, y: 0 };
  private cameraVelocity = { x: 0, y: 0 };

  // Klavye & Gamepad
  private keys: { [key: string]: boolean } = {};
  private prevKeys: { [key: string]: boolean } = {};
  private prevGpButtons: boolean[] = [];

  // Saldırı Şarj Sayacı
  private attackPressTimer: number | null = null;
  private isChargeTriggered = false;

  // Pençe Tutuş Yay (Tut = Nişan, Bırak = At)
  private isClawBowAiming = false;

  public callbacks: CombatInputCallbacks | null = null;

  constructor() {
    this.initFloatingJoystick();
    this.initCameraSwipe();
    this.initClawAndThumbButtons();
    this.initKeyboard();
    this.initGamepad();
  }

  public setCombatCallbacks(cbs: CombatInputCallbacks): void {
    this.callbacks = cbs;
  }

  /**
   * Kural 4: Floating Joystick (Sol %40 ekran, dokunulan yerde belirir, uca itilince otomatik sprint)
   */
  private initFloatingJoystick(): void {
    this.joystickZone = document.getElementById('joystickZone');
    this.joystickBase = document.getElementById('joystickBase');
    this.joystickThumb = document.getElementById('joystickThumb');

    if (!this.joystickZone || !this.joystickBase || !this.joystickThumb) return;

    this.joystickZone.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      ProceduralAudio.init();

      if (this.joystickPointerId !== null) return;

      const isLeftHand = SettingsStore.get().leftHandMode;
      const screenW = window.innerWidth;
      const inZone = !isLeftHand ? e.clientX < screenW * 0.45 : e.clientX > screenW * 0.55;
      if (!inZone) return;

      this.joystickPointerId = e.pointerId;

      try {
        this.joystickZone!.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }

      this.joystickCenter.x = e.clientX;
      this.joystickCenter.y = e.clientY;

      this.joystickBase!.style.left = `${e.clientX}px`;
      this.joystickBase!.style.top = `${e.clientY}px`;
      this.joystickBase!.style.opacity = '1';
      this.joystickThumb!.style.transform = 'translate(-50%, -50%)';

      this.handleJoystickMove(e.clientX, e.clientY);
    }, { passive: false });

    this.joystickZone.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.joystickPointerId === e.pointerId) {
        e.preventDefault();
        e.stopPropagation();
        this.handleJoystickMove(e.clientX, e.clientY);
      }
    }, { passive: false });

    const endJoystick = (e: PointerEvent) => {
      if (this.joystickPointerId === e.pointerId) {
        e.preventDefault();
        try {
          this.joystickZone!.releasePointerCapture(e.pointerId);
        } catch {
          // Fallback
        }
        this.joystickPointerId = null;
        this.resetJoystick();
      }
    };

    this.joystickZone.addEventListener('pointerup', endJoystick, { passive: false });
    this.joystickZone.addEventListener('pointercancel', endJoystick, { passive: false });
  }

  private handleJoystickMove(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    if (this.joystickThumb) {
      this.joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
    }

    const normDist = clampedDist / this.maxRadius;
    const deadzone = 0.12;

    if (normDist < deadzone) {
      this.moveInput.x = 0;
      this.moveInput.y = 0;
      this.moveInput.magnitude = 0;
      this.moveInput.isRunRequested = false;
    } else {
      const activeRange = (normDist - deadzone) / (1.0 - deadzone);
      this.moveInput.x = Math.cos(angle) * activeRange;
      this.moveInput.y = -Math.sin(angle) * activeRange;
      this.moveInput.magnitude = activeRange;
      this.moveInput.isRunRequested = normDist > 0.85;
    }
  }

  private resetJoystick(): void {
    if (this.joystickBase) {
      this.joystickBase.style.opacity = '0.4';
    }
    if (this.joystickThumb) {
      this.joystickThumb.style.transform = 'translate(-50%, -50%)';
    }
    this.moveInput.x = 0;
    this.moveInput.y = 0;
    this.moveInput.magnitude = 0;
    this.moveInput.isRunRequested = false;
  }

  /**
   * Kural 4: Sağ yarı bağımsız ivmeli kamera sürükleme
   */
  private initCameraSwipe(): void {
    const lookArea = document.getElementById('touchLookArea');
    if (!lookArea) return;

    lookArea.addEventListener('pointerdown', (e: PointerEvent) => {
      ProceduralAudio.init();
      if (this.cameraPointerId !== null) return;

      this.cameraPointerId = e.pointerId;
      this.lastCameraPos.x = e.clientX;
      this.lastCameraPos.y = e.clientY;
      this.cameraVelocity.x = 0;
      this.cameraVelocity.y = 0;

      try {
        lookArea.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
    }, { passive: true });

    lookArea.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.cameraPointerId === e.pointerId) {
        const dx = e.clientX - this.lastCameraPos.x;
        const dy = e.clientY - this.lastCameraPos.y;

        const sens = SettingsStore.get().cameraSensitivity;
        this.lookDelta.x += dx * sens;
        this.lookDelta.y += dy * sens;

        this.cameraVelocity.x = dx;
        this.cameraVelocity.y = dy;

        this.lastCameraPos.x = e.clientX;
        this.lastCameraPos.y = e.clientY;
      }
    }, { passive: true });

    const endCamera = (e: PointerEvent) => {
      if (this.cameraPointerId === e.pointerId) {
        try {
          lookArea.releasePointerCapture(e.pointerId);
        } catch {
          // Fallback
        }
        this.cameraPointerId = null;
      }
    };

    lookArea.addEventListener('pointerup', endCamera, { passive: true });
    lookArea.addEventListener('pointercancel', endCamera, { passive: true });
  }

  /**
   * Kural 4: Pençe Tutuş Omuz Düğmeleri & Sağ Başparmak Kümesi
   */
  private initClawAndThumbButtons(): void {
    // 1. Pençe Sol Üst: Kalkan
    const clawShield = document.getElementById('btnClawShield');
    if (clawShield) {
      clawShield.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.callbacks?.onShield(true);
      });
      const endShield = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks?.onShield(false);
      };
      clawShield.addEventListener('pointerup', endShield);
      clawShield.addEventListener('pointercancel', endShield);
    }

    // 2. Pençe Sağ Üst: Yay
    const clawBow = document.getElementById('btnClawBow');
    if (clawBow) {
      clawBow.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.isClawBowAiming = true;
        this.callbacks?.onBowAimToggle();
      });
      const endBow = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isClawBowAiming) {
          this.isClawBowAiming = false;
          this.callbacks?.onBowShoot();
        }
      };
      clawBow.addEventListener('pointerup', endBow);
      clawBow.addEventListener('pointercancel', endBow);
    }

    // 3. Sağ Başparmak: Büyük Saldırı
    const attackBtn = document.getElementById('btnAttack');
    if (attackBtn) {
      attackBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.isChargeTriggered = false;

        this.attackPressTimer = window.setTimeout(() => {
          this.isChargeTriggered = true;
          this.callbacks?.onChargeStart();
        }, 320);
      });

      const endAttack = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.attackPressTimer !== null) {
          clearTimeout(this.attackPressTimer);
          this.attackPressTimer = null;
        }

        if (this.isChargeTriggered) {
          this.callbacks?.onChargeRelease();
        } else {
          this.callbacks?.onAttack(false);
        }
        this.isChargeTriggered = false;
      };

      attackBtn.addEventListener('pointerup', endAttack);
      attackBtn.addEventListener('pointercancel', endAttack);
    }

    // 4. Roll (Kaçış)
    const rollBtn = document.getElementById('btnRoll');
    if (rollBtn) {
      rollBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.dodgeRoll();
        this.callbacks?.onDodgeRoll();
      });
    }

    // 5. Zıpla (Jump)
    const jumpBtn = document.getElementById('btnJump');
    if (jumpBtn) {
      jumpBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.callbacks?.onJump?.();
      });
    }

    // 6. Çömelme / Gizlilik (Crouch)
    const crouchBtn = document.getElementById('btnCrouch');
    if (crouchBtn) {
      crouchBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.callbacks?.onCrouchToggle?.();
      });
    }

    // 7. Silah Değiştirme
    const weaponBtn = document.getElementById('btnWeaponSwitch');
    if (weaponBtn) {
      weaponBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.callbacks?.onWeaponSwitch?.();
      });
    }

    // 8. Ok Değiştirme
    const arrowBtn = document.getElementById('btnArrowSwitch');
    if (arrowBtn) {
      arrowBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.callbacks?.onArrowSwitch?.();
      });
    }

    // 9. Sessiz Vuruş (Sneak Strike)
    const sneakBtn = document.getElementById('btnSneakStrike');
    if (sneakBtn) {
      sneakBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.criticalHit();
        this.callbacks?.onSneakStrike?.();
      });
    }

    // 10. Kilitlenme
    const lockBtn = document.getElementById('btnLockOn');
    if (lockBtn) {
      lockBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ProceduralAudio.init();
        HapticsManager.buttonTap();
        this.callbacks?.onLockOnToggle();
      });
    }
  }

  private initKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      ProceduralAudio.init();
      const k = e.key.toLowerCase();
      this.keys[k] = true;

      if (k === 'j' && !this.prevKeys['j']) {
        this.callbacks?.onAttack(false);
      }
      if (k === 'k' && !this.prevKeys['k']) {
        this.callbacks?.onDodgeRoll();
      }
      if (k === ' ' && !this.prevKeys[' ']) {
        this.callbacks?.onJump?.();
      }
      if (k === 'c' && !this.prevKeys['c']) {
        this.callbacks?.onCrouchToggle?.();
      }
      if (k === '1' && !this.prevKeys['1']) {
        this.callbacks?.onWeaponSwitch?.('KAM_SWORD');
      }
      if (k === '2' && !this.prevKeys['2']) {
        this.callbacks?.onWeaponSwitch?.('BATTLE_AXE');
      }
      if (k === '3' && !this.prevKeys['3']) {
        this.callbacks?.onWeaponSwitch?.('WAR_SPEAR');
      }
      if (k === 'r' && !this.prevKeys['r']) {
        this.callbacks?.onArrowSwitch?.();
      }
      if (k === 'e' && !this.prevKeys['e']) {
        this.callbacks?.onSneakStrike?.();
      }
      if (k === 'l') {
        this.callbacks?.onShield(true);
      }
      if ((k === 'u' || k === 'q') && !this.prevKeys[k]) {
        this.callbacks?.onBowAimToggle();
      }
      if (k === 'f' && !this.prevKeys['f']) {
        this.callbacks?.onLockOnToggle();
      }

      this.prevKeys[k] = true;
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = false;
      this.prevKeys[k] = false;

      if (k === 'l') {
        this.callbacks?.onShield(false);
      }
    });
  }

  private initGamepad(): void {
    window.addEventListener('gamepadconnected', () => {
      console.log('[InputManager] Gamepad bağlandı.');
    });
  }

  public consumeLookDelta(): { x: number; y: number } {
    this.consumedLookDelta.x = this.lookDelta.x;
    this.consumedLookDelta.y = this.lookDelta.y;
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    return this.consumedLookDelta;
  }

  public poll(deltaTime: number): MovementInput {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      const leftX = gp.axes[0] || 0;
      const leftY = -gp.axes[1] || 0;

      const rightX = gp.axes[2] || 0;
      const rightY = gp.axes[3] || 0;
      if (Math.abs(rightX) > 0.15 || Math.abs(rightY) > 0.15) {
        this.lookDelta.x += rightX * 320 * deltaTime;
        this.lookDelta.y += rightY * 220 * deltaTime;
      }

      const btnAttack = gp.buttons[2]?.pressed || false;
      if (btnAttack && !this.prevGpButtons[2]) {
        this.callbacks?.onAttack(false);
      }

      const btnRoll = gp.buttons[1]?.pressed || false;
      if (btnRoll && !this.prevGpButtons[1]) {
        this.callbacks?.onDodgeRoll();
      }

      const btnJump = gp.buttons[0]?.pressed || false;
      if (btnJump && !this.prevGpButtons[0]) {
        this.callbacks?.onJump?.();
      }

      const btnShield = gp.buttons[4]?.pressed || false;
      if (btnShield !== this.prevGpButtons[4]) {
        this.callbacks?.onShield(btnShield);
      }

      const btnBow = gp.buttons[5]?.pressed || false;
      if (btnBow !== this.prevGpButtons[5]) {
        if (btnBow) this.callbacks?.onBowAimToggle();
        else this.callbacks?.onBowShoot();
      }

      // Button 3 (Y / Triangle): Kam Gücü Kullanımı
      const btnPower = gp.buttons[3]?.pressed || false;
      if (btnPower && !this.prevGpButtons[3]) {
        this.callbacks?.onPowerCast?.();
      }

      // Button 8 (Select / Share): Harita Aç/Kapat
      const btnSelect = gp.buttons[8]?.pressed || false;
      if (btnSelect && !this.prevGpButtons[8]) {
        EventBus.emit('map:open');
      }

      // Button 9 (Start / Options): Duraklat / Ayarlar Menüsü
      const btnStart = gp.buttons[9]?.pressed || false;
      if (btnStart && !this.prevGpButtons[9]) {
        EventBus.emit('ui:settings_open');
      }

      // D-Pad: D-Pad Sol (Ateş), D-Pad Yukarı (Rüzgâr), D-Pad Sağ (Kut Zamanı)
      if (gp.buttons[14]?.pressed && !this.prevGpButtons[14]) {
        EventBus.emit('power:change', { power: 'FIRE' });
      }
      if (gp.buttons[12]?.pressed && !this.prevGpButtons[12]) {
        EventBus.emit('power:change', { power: 'WIND' });
      }
      if (gp.buttons[15]?.pressed && !this.prevGpButtons[15]) {
        EventBus.emit('power:change', { power: 'KUT_TIME' });
      }

      for (let i = 0; i < gp.buttons.length; i++) {
        this.prevGpButtons[i] = gp.buttons[i].pressed;
      }

      const dist = Math.hypot(leftX, leftY);
      if (dist > 0.15) {
        return {
          x: leftX,
          y: leftY,
          magnitude: Math.min(1.0, dist),
          isRunRequested: dist > 0.88
        };
      }
    }

    // Klavye Girişi (WASD)
    let kx = 0;
    let ky = 0;
    if (this.keys['w'] || this.keys['arrowup']) ky += 1;
    if (this.keys['s'] || this.keys['arrowdown']) ky -= 1;
    if (this.keys['a'] || this.keys['arrowleft']) kx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) kx += 1;

    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      const isShift = !!(this.keys['shift']);
      return {
        x: kx / len,
        y: ky / len,
        magnitude: 1.0,
        isRunRequested: isShift
      };
    }

    return this.moveInput;
  }
}
