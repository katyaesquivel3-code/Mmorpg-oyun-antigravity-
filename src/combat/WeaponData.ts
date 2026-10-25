/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Silah, Ok ve Hasar Sistemi Veri Tanımları (WeaponData)
 * (Zelda BotW Silah Sınıfları, Hasar Türleri, Dirençler & Sıfır Harici Bağımlılık)
 */

export type WeaponType = 'KAM_SWORD' | 'BATTLE_AXE' | 'WAR_SPEAR';

export type DamageType = 'SLASH' | 'BLUNT' | 'FIRE' | 'FROST';

export type ArrowType = 'NORMAL' | 'FIRE' | 'PIERCING';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  nameTr: string;
  description: string;
  baseDamage: number;
  damageType: DamageType;
  reach: number;              // m
  swingSpeed: number;          // çarpan (1.0 = normal)
  staminaCost: number;         // vuruş başına
  poiseDamage: number;         // denge kırma gücü
  isShieldBreaker: boolean;    // kalkan kırabilir mi
  knockbackForce: number;      // m/s
  comboCount: number;          // kombo vuruş adedi
  comboTimings: number[];      // saniye cinsinden vuruş süreleri
  rootMotionSteps: number[];   // vuruş başı ileri adım mesafesi (m)
}

export interface ArrowDef {
  id: ArrowType;
  nameTr: string;
  description: string;
  baseDamage: number;
  damageType: DamageType;
  speed: number;               // m/s
  gravityFactor: number;
  pierceCount: number;         // kaç hedeften geçebilir
  specialEffect?: 'BURN' | 'SLOW' | 'ARMOR_PIERCE';
}

export interface DamageResistances {
  slashResist: number;  // 0.0 = tam hasar, 0.5 = %50 direnç, -0.5 = %50 zafiyet
  bluntResist: number;
  fireResist: number;
  frostResist: number;
}

export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponDef> = {
  KAM_SWORD: {
    id: 'KAM_SWORD',
    name: 'Kam Kılıcı',
    nameTr: 'Kam Kılıcı',
    description: 'Dengeli ve kutsal çelik kılıç. Hızlı ardışık kesişler yapar.',
    baseDamage: 24,
    damageType: 'SLASH',
    reach: 2.1,
    swingSpeed: 1.0,
    staminaCost: 9.0,
    poiseDamage: 22,
    isShieldBreaker: false,
    knockbackForce: 4.5,
    comboCount: 3,
    comboTimings: [0.36, 0.38, 0.52],
    rootMotionSteps: [0.45, 0.55, 0.85]
  },
  BATTLE_AXE: {
    id: 'BATTLE_AXE',
    name: 'Savaş Baltası',
    nameTr: 'Ağır Savaş Baltası',
    description: 'Yavaş ve yıkıcı bozkır baltası. Düşman kalkanlarını paramparça eder.',
    baseDamage: 46,
    damageType: 'BLUNT',
    reach: 1.85,
    swingSpeed: 0.72,
    staminaCost: 20.0,
    poiseDamage: 60,
    isShieldBreaker: true,
    knockbackForce: 8.0,
    comboCount: 2,
    comboTimings: [0.55, 0.68],
    rootMotionSteps: [0.35, 0.95]
  },
  WAR_SPEAR: {
    id: 'WAR_SPEAR',
    name: 'Kargı',
    nameTr: 'Bozkır Kargısı',
    description: 'Uzun erişimli süvari mızrağı. Düşmanları uzakta tutar ve iter.',
    baseDamage: 19,
    damageType: 'SLASH',
    reach: 3.3,
    swingSpeed: 1.15,
    staminaCost: 12.0,
    poiseDamage: 25,
    isShieldBreaker: false,
    knockbackForce: 7.2,
    comboCount: 3,
    comboTimings: [0.30, 0.32, 0.44],
    rootMotionSteps: [0.65, 0.70, 1.10]
  }
};

export const ARROW_DEFINITIONS: Record<ArrowType, ArrowDef> = {
  NORMAL: {
    id: 'NORMAL',
    nameTr: 'Bozkır Oku',
    description: 'Keskin demir temrenli klasik Türk oku.',
    baseDamage: 32,
    damageType: 'SLASH',
    speed: 46.0,
    gravityFactor: 9.8,
    pierceCount: 1
  },
  FIRE: {
    id: 'FIRE',
    nameTr: 'Ülgen Ateşi Oku',
    description: 'Kutsal ateşle yanan ok. İsabet ettiğinde hedefi yakar.',
    baseDamage: 45,
    damageType: 'FIRE',
    speed: 42.0,
    gravityFactor: 10.5,
    pierceCount: 1,
    specialEffect: 'BURN'
  },
  PIERCING: {
    id: 'PIERCING',
    nameTr: 'Gök Delici Ok',
    description: 'Zırh ve kalkanları delip geçen ağır delici temren.',
    baseDamage: 38,
    damageType: 'BLUNT',
    speed: 52.0,
    gravityFactor: 8.5,
    pierceCount: 3,
    specialEffect: 'ARMOR_PIERCE'
  }
};
