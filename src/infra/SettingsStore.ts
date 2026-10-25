/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kalıcı Kullanıcı Ayarları Yöneticisi (SettingsStore & LocalStorage)
 * (Kapsamlı Ayarlar: Grafik, Kontrol, Ses Veri Yolları, Erişilebilirlik & Dil)
 */

import { EventBus } from './EventBus';

export interface HudButtonPosition {
  x: number;
  y: number;
}

export interface GameSettings {
  // 1. GRAFİK
  graphicsQuality: 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH';
  targetFps: 30 | 60;
  resolutionScale: number; // 0.7 - 1.5
  shadowQuality: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  grassDensity: 'LOW' | 'MEDIUM' | 'HIGH';
  viewDistance: 'LOW' | 'MEDIUM' | 'HIGH';
  batterySaver: boolean;

  // 2. KONTROLLER & KAMERA
  hudEditMode: boolean;
  leftHandMode: boolean; // Sol el modu (aynalı kontroller)
  cameraSensitivity: number; // 0.5 - 2.5
  cameraAssist: boolean; // Yürürken kameranın hareket yönüne hafif yaslanması
  gyroAimEnabled: boolean; // Yay nişanında jiroskopla ince nişan
  gyroSensitivity: number; // 0.5 - 3.0
  invertCameraY: boolean;
  hapticsEnabled: boolean; // Dokunsal titreşim geri bildirimi

  // 3. SES VERİ YOLLARI (AUDIO BUS)
  masterVolume: number; // 0.0 - 1.0
  musicVolume: number; // 0.0 - 1.0
  sfxVolume: number; // 0.0 - 1.0
  ambienceVolume: number; // 0.0 - 1.0
  kopuzVolume: number; // 0.0 - 1.0

  // 4. ERİŞİLEBİLİRLİK & YARDIM MODU
  subtitleSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  colorblindMode: boolean; // Renk körü telegraph ve arayüz paleti
  assistAutoLock: boolean; // Düşmana otomatik kilitlenme yardımı
  assistWideParry: boolean; // Geniş parry penceresi (160ms yerine 320ms)
  hudScale: number; // 0.7 - 1.4 (%70 - %140)
  hudOpacity: number; // 0.3 - 1.0
  customButtonPositions: Record<string, HudButtonPosition>;

  // 5. DİL (LANGUAGE)
  language: 'tr' | 'en';

  // GELİŞTİRİCİ & HATA AYIKLAMA
  showDebugPanel: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  // Grafik
  graphicsQuality: 'AUTO',
  targetFps: 60,
  resolutionScale: 1.0,
  shadowQuality: 'MEDIUM',
  grassDensity: 'HIGH',
  viewDistance: 'HIGH',
  batterySaver: false,

  // Kontroller
  hudEditMode: false,
  leftHandMode: false,
  cameraSensitivity: 1.0,
  cameraAssist: true,
  gyroAimEnabled: true,
  gyroSensitivity: 1.2,
  invertCameraY: false,
  hapticsEnabled: true,

  // Ses
  masterVolume: 0.85,
  musicVolume: 0.75,
  sfxVolume: 0.9,
  ambienceVolume: 0.65,
  kopuzVolume: 0.8,

  // Erişilebilirlik
  subtitleSize: 'MEDIUM',
  colorblindMode: false,
  assistAutoLock: false,
  assistWideParry: false,
  hudScale: 1.0,
  hudOpacity: 0.92,
  customButtonPositions: {},

  // Dil
  language: 'tr',

  // Hata Ayıklama
  showDebugPanel: false
};

export class SettingsStore {
  private static readonly STORAGE_KEY = 'otuken_game_settings_v1';
  private static settings: GameSettings = { ...DEFAULT_SETTINGS };

  public static init(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('[SettingsStore] Ayarlar yüklenemedi, varsayılanlar devrede:', e);
      this.settings = { ...DEFAULT_SETTINGS };
    }

    // URL'de ?debug=1 parametresi varsa debug panelini otomatik aktif et
    if (window.location.search.includes('debug=1')) {
      this.settings.showDebugPanel = true;
    }
  }

  public static get(): GameSettings {
    return this.settings;
  }

  public static set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.settings[key] = value;
    this.save();
    EventBus.emit('settings:updated', undefined);
  }

  public static update(patch: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.save();
    EventBus.emit('settings:updated', undefined);
  }

  public static saveButtonPosition(btnId: string, x: number, y: number): void {
    this.settings.customButtonPositions[btnId] = { x, y };
    this.save();
    EventBus.emit('settings:updated', undefined);
  }

  public static resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    EventBus.emit('settings:updated', undefined);
  }

  private static save(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('[SettingsStore] Ayarlar diske kaydedilemedi:', e);
    }
  }
}
