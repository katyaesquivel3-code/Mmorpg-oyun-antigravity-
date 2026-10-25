/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Çok Dilli Yerelleştirme Motoru (Türkçe & İngilizce - i18n)
 */

import { SettingsStore } from './SettingsStore';

const DICTIONARY: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    // HUD & Genel
    'hud.health': 'CAN',
    'hud.stamina': 'SOLUK',
    'hud.arrow': 'OK',
    'hud.sword': 'KILIÇ',
    'hud.shield': 'KALKAN',
    'hud.bow': 'YAY',
    'hud.roll': 'ROLL',
    'hud.jump': 'ZIPLA',
    'hud.lock': 'KİLİT',
    'hud.recenter': 'HİZALA',
    'hud.quality': 'AYARLAR',
    'hud.edit_hud': 'HUD DÜZENİ',
    'hud.save_layout': 'KAYDET',
    'hud.reset_layout': 'SIFIRLA',
    'hud.kut_zamani': '⚡ KUT ZAMANI! (%20 HIZ)',
    'hud.parry_success': '🛡️ PARRY! DÜŞMAN SERSEMLEDİ!',
    'hud.default_status': "Ötüken: Kut'un Dört Parçası",

    // Ayarlar Sekmeleri
    'settings.title': 'ÖTÜKEN OYUN AYARLARI',
    'settings.tab_graphics': 'Grafik',
    'settings.tab_controls': 'Kontroller',
    'settings.tab_audio': 'Ses',
    'settings.tab_accessibility': 'Erişilebilirlik',

    // Grafik
    'settings.graphics_mode': 'Grafik Kalitesi',
    'settings.auto': 'Otomatik (Dengeli)',
    'settings.high': 'Yüksek (Canlı)',
    'settings.medium': 'Orta (60 FPS)',
    'settings.low': 'Düşük (Tasarruf)',
    'settings.fps_target': 'Hedef Kare Hızı',

    // Kontroller
    'settings.camera_assist': 'Kamera Yardımı (Koşarken Otomatik Yönlenme)',
    'settings.camera_sensitivity': 'Kamera Hassasiyeti',
    'settings.gyro_aim': 'Yay Nişanında Jiroskop',
    'settings.gyro_sensitivity': 'Jiroskop Hassasiyeti',
    'settings.invert_y': 'Dikey Kamerayı Ters Çevir',

    // Ses & Dokunsal
    'settings.haptics': 'Dokunsal Titreşim (Haptics)',
    'settings.master_vol': 'Ana Ses Düzeyi',
    'settings.sfx_vol': 'Efekt Sesleri',

    // Erişilebilirlik
    'settings.language': 'Oyun Dili',
    'settings.left_hand': 'Sol El Modu (Aynalanmış Kontroller)',
    'settings.hud_scale': 'Düğme Boyutları',
    'settings.hud_opacity': 'Arayüz Saydamlığı',
    'settings.debug_panel': 'Geliştirici Telemetri Paneli',

    // Biyomlar
    'biome.yer_sub': 'Yer-Sub Ormanı',
    'biome.demir_dag': 'Demir Dağ Eteği',
    'biome.sahmaran': 'Şahmaran Gölü',
    'biome.altay': 'Gök Zirve Altay'
  },
  en: {
    // HUD & General
    'hud.health': 'HP',
    'hud.stamina': 'STAMINA',
    'hud.arrow': 'ARROW',
    'hud.sword': 'SWORD',
    'hud.shield': 'SHIELD',
    'hud.bow': 'BOW',
    'hud.roll': 'ROLL',
    'hud.jump': 'JUMP',
    'hud.lock': 'LOCK',
    'hud.recenter': 'CENTER',
    'hud.quality': 'SETTINGS',
    'hud.edit_hud': 'EDIT HUD',
    'hud.save_layout': 'SAVE',
    'hud.reset_layout': 'RESET',
    'hud.kut_zamani': '⚡ KUT TIME! (SLOW-MO)',
    'hud.parry_success': '🛡️ PARRY! ENEMY STAGGERED!',
    'hud.default_status': 'Otuken: Four Shards of Kut',

    // Settings Tabs
    'settings.title': 'OTUKEN GAME SETTINGS',
    'settings.tab_graphics': 'Graphics',
    'settings.tab_controls': 'Controls',
    'settings.tab_audio': 'Audio',
    'settings.tab_accessibility': 'Accessibility',

    // Graphics
    'settings.graphics_mode': 'Graphics Quality',
    'settings.auto': 'Auto (Balanced)',
    'settings.high': 'High (Vivid)',
    'settings.medium': 'Medium (60 FPS)',
    'settings.low': 'Low (Performance)',
    'settings.fps_target': 'Target FPS',

    // Controls
    'settings.camera_assist': 'Camera Assist (Auto-align while running)',
    'settings.camera_sensitivity': 'Camera Sensitivity',
    'settings.gyro_aim': 'Gyro Aiming with Bow',
    'settings.gyro_sensitivity': 'Gyro Sensitivity',
    'settings.invert_y': 'Invert Camera Y',

    // Audio & Haptics
    'settings.haptics': 'Haptic Vibration',
    'settings.master_vol': 'Master Volume',
    'settings.sfx_vol': 'SFX Volume',

    // Accessibility
    'settings.language': 'Language',
    'settings.left_hand': 'Left Hand Mode (Mirrored Controls)',
    'settings.hud_scale': 'Button Sizes',
    'settings.hud_opacity': 'HUD Opacity',
    'settings.debug_panel': 'Developer Telemetry Panel',

    // Biomes
    'biome.yer_sub': 'Yer-Sub Forest',
    'biome.demir_dag': 'Iron Mountain Foothills',
    'biome.sahmaran': 'Shahmaran Lake',
    'biome.altay': 'Sky Summit Altay'
  }
};

export function t(key: string): string {
  const lang = SettingsStore.get().language || 'tr';
  const dict = DICTIONARY[lang] || DICTIONARY.tr;
  return dict[key] || key;
}
