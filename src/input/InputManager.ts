export interface MovementInput {
  x: number;       // -1.0 (left) to +1.0 (right)
  y: number;       // -1.0 (backward) to +1.0 (forward)
  magnitude: number; // 0.0 to 1.0
  isRunRequested: boolean;
}

export interface CombatInputCallbacks {
  onAttack: (isCharged: boolean) => void;
  onChargeStart: () => void;
  onChargeRelease: () => void;
  onDodgeRoll: () => void;
  onShield: (active: boolean) => void;
  onBowAimToggle: () => void;
  onBowShoot: () => void;
  onLockOnToggle: () => void;
}

export class InputManager {
  public moveInput: MovementInput = { x: 0, y: 0, magnitude: 0, isRunRequested: false };

  // Camera Orbit Delta
  public lookDelta = { x: 0, y: 0 };

  // Touch tracking IDs
  private joystickTouchId: number | null = null;
  private cameraTouchId: number | null = null;

  // Joystick DOM elements & math
  private joystickZone: HTMLElement | null = null;
  private joystickBase: HTMLElement | null = null;
  private joystickThumb: HTMLElement | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private maxRadius = 38;

  // Camera touch state
  private lastCameraTouchPos = { x: 0, y: 0 };

  // Keyboard state
  private keys: { [key: string]: boolean } = {};
  private prevKeys: { [key: string]: boolean } = {};

  // Attack button hold timer for charge attack
  private attackPressTimer: number | null = null;
  private isChargeTriggered = false;

  // Combat Callbacks
  public callbacks: CombatInputCallbacks | null = null;

  // Gamepad edge detectors
  private prevGpButtons: boolean[] = [];

  constructor() {
    this.initJoystickDOM();
    this.initCameraTouchDOM();
    this.initCombatActionDOM();
    this.initKeyboard();
    this.initGamepad();
  }

  public setCombatCallbacks(cbs: CombatInputCallbacks): void {
    this.callbacks = cbs;
  }

  private initJoystickDOM(): void {
    this.joystickZone = document.getElementById('joystickZone');
    this.joystickBase = document.getElementById('joystickBase');
    this.joystickThumb = document.getElementById('joystickThumb');

    if (!this.joystickZone || !this.joystickBase || !this.joystickThumb) return;

    this.joystickZone.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      if (this.joystickTouchId !== null) return;

      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;

      const rect = this.joystickBase!.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      this.handleJoystickMove(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          e.preventDefault();
          this.handleJoystickMove(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: false });

    const endJoystick = (e: TouchEvent) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.resetJoystick();
          break;
        }
      }
    };

    window.addEventListener('touchend', endJoystick, { passive: true });
    window.addEventListener('touchcancel', endJoystick, { passive: true });
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
      const activeRange = (normDist - deadzone) / (1 - deadzone);
      this.moveInput.x = Math.cos(angle) * activeRange;
      this.moveInput.y = -Math.sin(angle) * activeRange;
      this.moveInput.magnitude = activeRange;
      this.moveInput.isRunRequested = activeRange > 0.65;
    }
  }

  private resetJoystick(): void {
    if (this.joystickThumb) {
      this.joystickThumb.style.transform = 'translate(-50%, -50%)';
    }
    this.moveInput.x = 0;
    this.moveInput.y = 0;
    this.moveInput.magnitude = 0;
    this.moveInput.isRunRequested = false;
  }

  private initCameraTouchDOM(): void {
    const lookArea = document.getElementById('touchLookArea');
    if (!lookArea) return;

    lookArea.addEventListener('touchstart', (e: TouchEvent) => {
      if (this.cameraTouchId !== null) return;
      const touch = e.changedTouches[0];
      this.cameraTouchId = touch.identifier;
      this.lastCameraTouchPos = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.cameraTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.cameraTouchId) {
          const dx = touch.clientX - this.lastCameraTouchPos.x;
          const dy = touch.clientY - this.lastCameraTouchPos.y;

          this.lookDelta.x += dx;
          this.lookDelta.y += dy;

          this.lastCameraTouchPos = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    }, { passive: true });

    const endCamera = (e: TouchEvent) => {
      if (this.cameraTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.cameraTouchId) {
          this.cameraTouchId = null;
          break;
        }
      }
    };

    window.addEventListener('touchend', endCamera, { passive: true });
    window.addEventListener('touchcancel', endCamera, { passive: true });
  }

  /**
   * Initializes BotW Diamond Combat Buttons: Attack, Roll, Shield, Bow, Lock-on
   */
  private initCombatActionDOM(): void {
    const attackBtn = document.getElementById('btnAttack');
    const rollBtn = document.getElementById('btnRoll');
    const shieldBtn = document.getElementById('btnShield');
    const bowBtn = document.getElementById('btnBow');
    const lockBtn = document.getElementById('btnLockOn');

    // 1. Attack / Charge Button
    if (attackBtn) {
      const startAttack = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isChargeTriggered = false;
        this.attackPressTimer = window.setTimeout(() => {
          this.isChargeTriggered = true;
          this.callbacks?.onChargeStart();
        }, 320); // 320ms hold begins charge windup
      };

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

      attackBtn.addEventListener('touchstart', startAttack, { passive: false });
      attackBtn.addEventListener('touchend', endAttack, { passive: false });
      attackBtn.addEventListener('mousedown', startAttack);
      attackBtn.addEventListener('mouseup', endAttack);
    }

    // 2. Dodge Roll Button
    if (rollBtn) {
      const handleRoll = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks?.onDodgeRoll();
      };
      rollBtn.addEventListener('touchstart', handleRoll, { passive: false });
      rollBtn.addEventListener('mousedown', handleRoll);
    }

    // 3. Shield & Parry Button (Hold to Block, Tap for Parry)
    if (shieldBtn) {
      const raiseShield = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks?.onShield(true);
      };

      const lowerShield = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks?.onShield(false);
      };

      shieldBtn.addEventListener('touchstart', raiseShield, { passive: false });
      shieldBtn.addEventListener('touchend', lowerShield, { passive: false });
      shieldBtn.addEventListener('mousedown', raiseShield);
      shieldBtn.addEventListener('mouseup', lowerShield);
    }

    // 4. Bow Aim / Shoot Button
    if (bowBtn) {
      const handleBow = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks?.onBowAimToggle();
      };
      bowBtn.addEventListener('touchstart', handleBow, { passive: false });
      bowBtn.addEventListener('mousedown', handleBow);
    }

    // 5. Lock-On Target Button
    if (lockBtn) {
      const handleLock = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks?.onLockOnToggle();
      };
      lockBtn.addEventListener('touchstart', handleLock, { passive: false });
      lockBtn.addEventListener('mousedown', handleLock);
    }
  }

  private initKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;

      // Combat Hotkeys
      if (k === 'j' && !this.prevKeys['j']) {
        this.callbacks?.onAttack(false);
      }
      if ((k === ' ' || k === 'k') && !this.prevKeys[k]) {
        this.callbacks?.onDodgeRoll();
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

    // Mouse Controls (Left click attack, Right click shield)
    window.addEventListener('mousedown', (e) => {
      if (e.target !== document.getElementById('touchLookArea') && e.target !== document.getElementById('gameCanvas')) return;
      if (e.button === 0) {
        this.callbacks?.onAttack(false);
      } else if (e.button === 2) {
        this.callbacks?.onShield(true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.callbacks?.onShield(false);
      }
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // Prevent browser context menu during combat right-clicks
    });
  }

  private initGamepad(): void {
    window.addEventListener('gamepadconnected', () => {
      console.log('Gamepad connected for Ötüken');
    });
  }

  public consumeLookDelta(): { x: number; y: number } {
    const d = { x: this.lookDelta.x, y: this.lookDelta.y };
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    return d;
  }

  public poll(deltaTime: number): MovementInput {
    // 1. Check Gamepad
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      // Left stick for movement
      const leftX = gp.axes[0] || 0;
      const leftY = -gp.axes[1] || 0;
      const dist = Math.sqrt(leftX * leftX + leftY * leftY);

      // Right stick for camera orbit
      const rightX = gp.axes[2] || 0;
      const rightY = gp.axes[3] || 0;
      if (Math.abs(rightX) > 0.15 || Math.abs(rightY) > 0.15) {
        this.lookDelta.x += rightX * 300 * deltaTime;
        this.lookDelta.y += rightY * 200 * deltaTime;
      }

      // Gamepad Combat Buttons
      // X / Button 2: Attack
      const btnAttack = gp.buttons[2]?.pressed || false;
      if (btnAttack && !this.prevGpButtons[2]) {
        this.callbacks?.onAttack(false);
      }

      // A or B / Button 0 or 1: Dodge Roll
      const btnRoll = gp.buttons[1]?.pressed || gp.buttons[0]?.pressed || false;
      if (btnRoll && !this.prevGpButtons[1]) {
        this.callbacks?.onDodgeRoll();
      }

      // LB / Button 4: Shield
      const btnShield = gp.buttons[4]?.pressed || false;
      if (btnShield !== this.prevGpButtons[4]) {
        this.callbacks?.onShield(btnShield);
      }

      // RT / Button 7: Bow Aim/Shoot
      const btnBow = gp.buttons[7]?.pressed || false;
      if (btnBow && !this.prevGpButtons[7]) {
        this.callbacks?.onBowAimToggle();
      }

      // R3 / Button 11: Lock-On Toggle
      const btnLock = gp.buttons[11]?.pressed || false;
      if (btnLock && !this.prevGpButtons[11]) {
        this.callbacks?.onLockOnToggle();
      }

      for (let i = 0; i < gp.buttons.length; i++) {
        this.prevGpButtons[i] = gp.buttons[i]?.pressed || false;
      }

      if (dist > 0.15) {
        return {
          x: leftX,
          y: leftY,
          magnitude: Math.min(1.0, dist),
          isRunRequested: dist > 0.7 || gp.buttons[10]?.pressed || false
        };
      }
    }

    if (this.joystickTouchId !== null) {
      return this.moveInput;
    }

    // Keyboard Movement
    let kx = 0;
    let ky = 0;
    if (this.keys['w'] || this.keys['arrowup']) ky += 1;
    if (this.keys['s'] || this.keys['arrowdown']) ky -= 1;
    if (this.keys['a'] || this.keys['arrowleft']) kx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) kx += 1;

    // Keyboard Camera keys
    if (this.keys['arrowleft']) this.lookDelta.x -= 200 * deltaTime;
    if (this.keys['arrowright']) this.lookDelta.x += 200 * deltaTime;

    const mag = Math.sqrt(kx * kx + ky * ky);
    if (mag > 0.01) {
      const isShift = this.keys['shift'] || false;
      return {
        x: kx / mag,
        y: ky / mag,
        magnitude: isShift ? 1.0 : 0.5,
        isRunRequested: isShift
      };
    }

    return this.moveInput;
  }
}
