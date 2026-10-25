/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Jiroskop İnce Nişan Alma Yöneticisi (Gyro Aim)
 * Yalnızca yatay modda ve yay nişanında devreye girer.
 */

import { SettingsStore } from './SettingsStore';

export class GyroAimManager {
  private static delta = { x: 0, y: 0 };
  private static isListening = false;
  private static lastTimestamp = 0;

  public static init(): void {
    if (this.isListening) return;
    if (typeof window === 'undefined') return;

    // DeviceMotionEvent desteği
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', this.handleMotion, { passive: true });
      this.isListening = true;
    }
  }

  private static handleMotion = (event: DeviceMotionEvent): void => {
    if (!SettingsStore.get().gyroAimEnabled) return;
    if (!event.rotationRate) return;

    const now = performance.now();
    const dt = this.lastTimestamp > 0 ? (now - this.lastTimestamp) / 1000 : 0.016;
    this.lastTimestamp = now;

    // Yatay modda eksen eşlemesi (Landscape-primary):
    // alpha: Ekran düzlemine dik eksen dönüşü
    // beta: Yatay eksen eğimi (Pitch)
    // gamma: Dikey eksen dönüşü (Yaw)
    const rawYaw = event.rotationRate.beta || 0;
    const rawPitch = -(event.rotationRate.alpha || 0);

    const deadzone = 0.45; // Titreme önleme (deg/sn)
    const sens = SettingsStore.get().gyroSensitivity * 0.0035;

    if (Math.abs(rawYaw) > deadzone) {
      this.delta.x += rawYaw * sens * dt * 50;
    }
    if (Math.abs(rawPitch) > deadzone) {
      this.delta.y += rawPitch * sens * dt * 50;
    }
  };

  /**
   * Sıcak döngüde tüketim (Sıfır GC tahsisi)
   */
  public static consumeGyroDelta(isAiming: boolean, out: { x: number; y: number }): void {
    if (!isAiming || !SettingsStore.get().gyroAimEnabled) {
      this.delta.x = 0;
      this.delta.y = 0;
      out.x = 0;
      out.y = 0;
      return;
    }

    out.x = this.delta.x;
    out.y = this.delta.y;

    this.delta.x = 0;
    this.delta.y = 0;
  }
}
