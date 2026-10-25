/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Dokunsal Titreşim ve Geri Bildirim Yöneticisi (Haptics)
 */

import { SettingsStore } from './SettingsStore';

export class HapticsManager {
  private static canVibrate: boolean = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  public static hit(): void {
    if (!SettingsStore.get().hapticsEnabled || !this.canVibrate) return;
    try {
      navigator.vibrate(22);
    } catch {
      // Sessizce geç
    }
  }

  public static heavyHit(): void {
    if (!SettingsStore.get().hapticsEnabled || !this.canVibrate) return;
    try {
      navigator.vibrate(45);
    } catch {
      // Sessizce geç
    }
  }

  public static criticalHit(): void {
    if (!SettingsStore.get().hapticsEnabled || !this.canVibrate) return;
    try {
      navigator.vibrate([25, 40, 70]);
    } catch {
      // Sessizce geç
    }
  }

  public static parry(): void {
    if (!SettingsStore.get().hapticsEnabled || !this.canVibrate) return;
    try {
      navigator.vibrate([35, 25, 60]);
    } catch {
      // Sessizce geç
    }
  }

  public static dodgeRoll(): void {
    if (!SettingsStore.get().hapticsEnabled || !this.canVibrate) return;
    try {
      navigator.vibrate(18);
    } catch {
      // Sessizce geç
    }
  }

  public static hurt(): void {
    if (!SettingsStore.get().hapticsEnabled || !this.canVibrate) return;
    try {
      navigator.vibrate([70, 35, 80]);
    } catch {
      // Sessizce geç
    }
  }

  public static buttonTap(): void {
    if (!SettingsStore.get().hapticsEnabled || !this.canVibrate) return;
    try {
      navigator.vibrate(12);
    } catch {
      // Sessizce geç
    }
  }
}
