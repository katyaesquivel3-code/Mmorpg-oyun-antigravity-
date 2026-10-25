/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Envanter Veri Modeli ve Eşya Kataloğu (InventoryData)
 * (Silah, Yay, Ok, Kalkan, Zırh Setleri, Türk Mutfağı Yemekleri, Malzemeler & Görev Eşyaları)
 */

export type ItemCategory =
  | 'WEAPON'
  | 'BOW'
  | 'ARROW'
  | 'SHIELD'
  | 'ARMOR'
  | 'FOOD'
  | 'MATERIAL'
  | 'QUEST';

export type ArmorSlot = 'HEAD' | 'CHEST' | 'LEGS';

export type ArmorSetId = 'KAM_SET' | 'BOZKURT_SET' | 'DEMIR_DAG_SET' | 'GOK_SET';

export interface ItemDefinition {
  id: string;
  nameTr: string;
  category: ItemCategory;
  descriptionTr: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

  // İstatistikler
  damage?: number;
  defense?: number;
  upgradeLevel?: number; // 1 ile 4 arası
  maxLevel?: number;

  // Zırh
  armorSlot?: ArmorSlot;
  armorSetId?: ArmorSetId;

  // Yemek / Tüketim Etkisi
  healAmount?: number;
  kutRestoreAmount?: number;
  staminaRestoreAmount?: number;
  buffType?: 'KUT_REGEN' | 'ATTACK_BOOST' | 'DEFENSE_BOOST' | 'STAMINA_REGEN' | 'SPEED_BOOST' | 'HEAT_RESIST' | 'COLD_RESIST' | 'POISON_RESIST';
  buffDuration?: number; // saniye

  // İstiflenebilirlik
  isStackable: boolean;
  maxStack?: number;
}

export interface InventorySlot {
  item: ItemDefinition;
  quantity: number;
  isEquipped?: boolean;
}

export interface ArmorSetBonus {
  id: ArmorSetId;
  nameTr: string;
  descriptionTr: string;
  requiredPieces: number; // 3 parça
}

export const ARMOR_SET_BONUSES: Record<ArmorSetId, ArmorSetBonus> = {
  KAM_SET: {
    id: 'KAM_SET',
    nameTr: 'Kut Rezonansı',
    descriptionTr: 'Kut Gücü dolum hızı +%40 artar ve tüm Kam büyülerinin maliyeti %25 azalır.',
    requiredPieces: 3
  },
  BOZKURT_SET: {
    id: 'BOZKURT_SET',
    nameTr: 'Gece Avcısı',
    descriptionTr: 'Koşu hızı +%20 artar, gizlilik ayak sesi mesafesi yarıya iner, kritik hasar +%30 artar.',
    requiredPieces: 3
  },
  DEMIR_DAG_SET: {
    id: 'DEMIR_DAG_SET',
    nameTr: 'Sarsılmaz Kor',
    descriptionTr: 'Ateş hasarını %60 azaltır, düşman darbelerinde sendeletme ve geriye savrulmayı önler.',
    requiredPieces: 3
  },
  GOK_SET: {
    id: 'GOK_SET',
    nameTr: 'Tengri Ayazı',
    descriptionTr: 'Buz ve donma hasarını %60 azaltır, tipi fırtınalarında görüşü ve hızı korur.',
    requiredPieces: 3
  }
};

export const ITEM_CATALOG: Record<string, ItemDefinition> = {
  // ================= SİLAHLAR =================
  kam_sword: {
    id: 'kam_sword',
    nameTr: 'Kam Kılıcı',
    category: 'WEAPON',
    descriptionTr: 'Kam Ata tarafından kutsanmış dengeli süvari kılıcı. Kırılmaz, demircide güçlendirilebilir.',
    icon: '🗡️',
    rarity: 'RARE',
    damage: 28,
    upgradeLevel: 1,
    maxLevel: 4,
    isStackable: false
  },
  battle_axe: {
    id: 'battle_axe',
    nameTr: 'Bozkır Savaş Baltası',
    category: 'WEAPON',
    descriptionTr: 'Ağır çelik balta. Yavaş vurur fakat düşman kalkanlarını paramparça eder.',
    icon: '🪓',
    rarity: 'RARE',
    damage: 42,
    upgradeLevel: 1,
    maxLevel: 4,
    isStackable: false
  },
  war_spear: {
    id: 'war_spear',
    nameTr: 'Kargı (Süvari Mızrağı)',
    category: 'WEAPON',
    descriptionTr: 'Uzun menzilli delici kargı. Düşmanları uzakta tutar ve at sırtında ekstra ivme sağlar.',
    icon: '🔱',
    rarity: 'RARE',
    damage: 32,
    upgradeLevel: 1,
    maxLevel: 4,
    isStackable: false
  },

  // ================= YAY & OKLAR =================
  short_bow: {
    id: 'short_bow',
    nameTr: 'Bozkır Kompozit Yayı',
    category: 'BOW',
    descriptionTr: 'Huş ağacı ve boynuzdan yapılmış esnek Türk yayı. At sırtında seri atışlar için mükemmeldir.',
    icon: '🏹',
    rarity: 'RARE',
    damage: 24,
    upgradeLevel: 1,
    maxLevel: 4,
    isStackable: false
  },
  arrow_regular: {
    id: 'arrow_regular',
    nameTr: 'Bozkır Oku',
    category: 'ARROW',
    descriptionTr: 'Kartal tüylü, kemik temrenli keskin av oku.',
    icon: '🎯',
    rarity: 'COMMON',
    damage: 15,
    isStackable: true,
    maxStack: 99
  },
  arrow_fire: {
    id: 'arrow_fire',
    nameTr: 'Ateşli Ok',
    category: 'ARROW',
    descriptionTr: 'Reçine ve köz tozuyla sarılmış alevli ok. Otlakları yakar ve buzu eritir.',
    icon: '🔥',
    rarity: 'RARE',
    damage: 25,
    isStackable: true,
    maxStack: 99
  },
  arrow_piercing: {
    id: 'arrow_piercing',
    nameTr: 'Delici Çelik Temren',
    category: 'ARROW',
    descriptionTr: 'Zırhları ve kalkanları delip geçen ağır çelik ok.',
    icon: '⚡',
    rarity: 'EPIC',
    damage: 35,
    isStackable: true,
    maxStack: 99
  },

  // ================= KALKANLAR =================
  willow_shield: {
    id: 'willow_shield',
    nameTr: 'Söğüt Kalkan',
    category: 'SHIELD',
    descriptionTr: 'Deri kaplı hafif söğüt ağacı kalkan. Hızlı parry imkanı tanır.',
    icon: '🛡️',
    rarity: 'COMMON',
    defense: 15,
    upgradeLevel: 1,
    maxLevel: 4,
    isStackable: false
  },
  iron_wolf_shield: {
    id: 'iron_wolf_shield',
    nameTr: 'Demir Kurt Kalkanı',
    category: 'SHIELD',
    descriptionTr: 'Tunç ve çelikten dövülmüş kurt kabartmalı ağır kalkan. Bloklama maliyetini düşürür.',
    icon: '🐺',
    rarity: 'EPIC',
    defense: 35,
    upgradeLevel: 1,
    maxLevel: 4,
    isStackable: false
  },

  // ================= ZIRH SETLERİ =================
  // 1. Kam Seti (Kut Yenilenmesi)
  kam_helm: {
    id: 'kam_helm',
    nameTr: 'Kam Börkü',
    category: 'ARMOR',
    armorSlot: 'HEAD',
    armorSetId: 'KAM_SET',
    descriptionTr: 'Kutsal baykuş ve kartal tüyleriyle bezeli şaman başlığı.',
    icon: '🪶',
    rarity: 'EPIC',
    defense: 8,
    isStackable: false
  },
  kam_robe: {
    id: 'kam_robe',
    nameTr: 'Kam Kaftanı',
    category: 'ARMOR',
    armorSlot: 'CHEST',
    armorSetId: 'KAM_SET',
    descriptionTr: 'Sedir ağacı kabuğu ve geyik derisinden örülü kutsal cübbe.',
    icon: '🥋',
    rarity: 'EPIC',
    defense: 14,
    isStackable: false
  },
  kam_boots: {
    id: 'kam_boots',
    nameTr: 'Kam Çizmesi',
    category: 'ARMOR',
    armorSlot: 'LEGS',
    armorSetId: 'KAM_SET',
    descriptionTr: 'Yumuşak deriden, sessiz adımlar sağlayan törensel çizme.',
    icon: '👢',
    rarity: 'EPIC',
    defense: 8,
    isStackable: false
  },

  // 2. Bozkurt Seti (Gizlilik & Hız)
  bozkurt_helm: {
    id: 'bozkurt_helm',
    nameTr: 'Bozkurt Başlığı',
    category: 'ARMOR',
    armorSlot: 'HEAD',
    armorSetId: 'BOZKURT_SET',
    descriptionTr: 'Yaban kurdu kafatası ve postundan biçilmiş savaş başlığı.',
    icon: '🐺',
    rarity: 'RARE',
    defense: 10,
    isStackable: false
  },
  bozkurt_vest: {
    id: 'bozkurt_vest',
    nameTr: 'Kurt Postu Yelek',
    category: 'ARMOR',
    armorSlot: 'CHEST',
    armorSetId: 'BOZKURT_SET',
    descriptionTr: 'Kalın gri kurt kürkü. Avcıya rüzgâr gibi hafiflik verir.',
    icon: '🦺',
    rarity: 'RARE',
    defense: 18,
    isStackable: false
  },
  bozkurt_boots: {
    id: 'bozkurt_boots',
    nameTr: 'Bozkurt Çizmesi',
    category: 'ARMOR',
    armorSlot: 'LEGS',
    armorSetId: 'BOZKURT_SET',
    descriptionTr: 'Bozkır çimeninde çıt çıkarmayan avcı çizmeleri.',
    icon: '👢',
    rarity: 'RARE',
    defense: 10,
    isStackable: false
  },

  // 3. Demir Dağ Seti (Ağır Zırh & Ateş Direnci)
  demirdag_helm: {
    id: 'demirdag_helm',
    nameTr: 'Demir Dağ Miğferi',
    category: 'ARMOR',
    armorSlot: 'HEAD',
    armorSetId: 'DEMIR_DAG_SET',
    descriptionTr: 'Ergenekon ocaklarında dövülmüş yekpare çelik miğfer.',
    icon: '🪖',
    rarity: 'EPIC',
    defense: 16,
    isStackable: false
  },
  demirdag_armor: {
    id: 'demirdag_armor',
    nameTr: 'Demir Dağ Çelik Zırhı',
    category: 'ARMOR',
    armorSlot: 'CHEST',
    armorSetId: 'DEMIR_DAG_SET',
    descriptionTr: 'Perçinli ağır çelik plaka zırh. Lav ve alev darbelerine geçit vermez.',
    icon: '🛡️',
    rarity: 'EPIC',
    defense: 28,
    isStackable: false
  },
  demirdag_greaves: {
    id: 'demirdag_greaves',
    nameTr: 'Demir Dağ Tozluğu',
    category: 'ARMOR',
    armorSlot: 'LEGS',
    armorSetId: 'DEMIR_DAG_SET',
    descriptionTr: 'Çelik dizlikli ağır zırh tozlukları.',
    icon: '🥾',
    rarity: 'EPIC',
    defense: 16,
    isStackable: false
  },

  // 4. Gök Seti (Soğuk Direnci & Tipi Koruması)
  gok_helm: {
    id: 'gok_helm',
    nameTr: 'Gök Börkü',
    category: 'ARMOR',
    armorSlot: 'HEAD',
    armorSetId: 'GOK_SET',
    descriptionTr: 'Kutup tilkisi kürkü ve gök mavisi keçeden dondurucu soğuk börkü.',
    icon: '🧢',
    rarity: 'LEGENDARY',
    defense: 14,
    isStackable: false
  },
  gok_coat: {
    id: 'gok_coat',
    nameTr: 'Kutup Kaftanı',
    category: 'ARMOR',
    armorSlot: 'CHEST',
    armorSetId: 'GOK_SET',
    descriptionTr: 'Gök Zirve fırtınalarına kafa tutan kalın samur kürk kaftan.',
    icon: '🧥',
    rarity: 'LEGENDARY',
    defense: 24,
    isStackable: false
  },
  gok_boots: {
    id: 'gok_boots',
    nameTr: 'Gök Çizmesi',
    category: 'ARMOR',
    armorSlot: 'LEGS',
    armorSetId: 'GOK_SET',
    descriptionTr: 'Kar ve buz üzerinde kaymayı engelleyen yün astarlı çizmeler.',
    icon: '👢',
    rarity: 'LEGENDARY',
    defense: 14,
    isStackable: false
  },

  // ================= YEMEKLER (TÜRK MUTFAĞI) =================
  food_kimiz: {
    id: 'food_kimiz',
    nameTr: 'Kutsal Kımız',
    category: 'FOOD',
    descriptionTr: 'Mayalanmış kısrak sütü ve dağ balı. Kut Gücü yenilenmesini hızlandırır (+10 KP/sn, 90 sn).',
    icon: '🍶',
    rarity: 'EPIC',
    healAmount: 25,
    kutRestoreAmount: 50,
    buffType: 'KUT_REGEN',
    buffDuration: 90,
    isStackable: true,
    maxStack: 10
  },
  food_kavurma: {
    id: 'food_kavurma',
    nameTr: 'Bozkır Kavurması',
    category: 'FOOD',
    descriptionTr: 'Közde pişirilmiş dağ kekiği kokulu maral eti. Anında +75 Can yeniler ve geçici güç verir.',
    icon: '🥩',
    rarity: 'RARE',
    healAmount: 75,
    buffType: 'ATTACK_BOOST',
    buffDuration: 120,
    isStackable: true,
    maxStack: 10
  },
  food_kurut: {
    id: 'food_kurut',
    nameTr: 'Kurut (Güneşte Kurutulmuş Yoğurt)',
    category: 'FOOD',
    descriptionTr: 'Güneşte taş gibi kurutulmuş ekşi keçi yoğurdu. Zorlu yolculukta savunma direnci verir (+12 Def, 150 sn).',
    icon: '🧀',
    rarity: 'COMMON',
    healAmount: 30,
    buffType: 'DEFENSE_BOOST',
    buffDuration: 150,
    isStackable: true,
    maxStack: 20
  },
  food_pisi: {
    id: 'food_pisi',
    nameTr: 'Köz Pişisi',
    category: 'FOOD',
    descriptionTr: 'Kızgın yağda kabartılmış altın sarısı hamur. Soluk barını doldurur ve tüketimi azaltır (60 sn).',
    icon: '🫓',
    rarity: 'COMMON',
    staminaRestoreAmount: 100,
    buffType: 'STAMINA_REGEN',
    buffDuration: 60,
    isStackable: true,
    maxStack: 15
  },
  food_talkan: {
    id: 'food_talkan',
    nameTr: 'Talkan (Kavrulmuş Arpa Aşı)',
    category: 'FOOD',
    descriptionTr: 'Kavrulmuş arpa unu, tereyağı ve bal karışımı. Koşu hızını ve dayanıklılığı artırır (+%25 Hız, 90 sn).',
    icon: '🥣',
    rarity: 'RARE',
    staminaRestoreAmount: 80,
    buffType: 'SPEED_BOOST',
    buffDuration: 90,
    isStackable: true,
    maxStack: 10
  },
  food_ayran: {
    id: 'food_ayran',
    nameTr: 'Naneli Yayık Ayranı',
    category: 'FOOD',
    descriptionTr: 'Buz gibi kaynak suyu ve taze nane ile yayıkta çalkalanmış koyu ayran. Demir Dağ sıcağına direnç sağlar (180 sn).',
    icon: '🥛',
    rarity: 'COMMON',
    healAmount: 20,
    buffType: 'HEAT_RESIST',
    buffDuration: 180,
    isStackable: true,
    maxStack: 10
  },
  food_burnt: {
    id: 'food_burnt',
    nameTr: 'Közlenmiş Kömür Aşı',
    category: 'FOOD',
    descriptionTr: 'Malzemelerin dengesini tutturamadın! Sert, acı ve kömür karası... Yine de biraz açlığı bastırır (+5 Can).',
    icon: '🪨',
    rarity: 'COMMON',
    healAmount: 5,
    isStackable: true,
    maxStack: 20
  },
  food_panzehir: {
    id: 'food_panzehir',
    nameTr: 'Panzehir Şerbeti',
    category: 'FOOD',
    descriptionTr: 'Kutsal arı nilüfer, kekik ve orman balı ile kaynatılmış kadim panzehir. Zehir etkilerini temizler ve 180 sn zehir direnci sağlar.',
    icon: '🧪',
    rarity: 'EPIC',
    healAmount: 80,
    buffType: 'POISON_RESIST',
    buffDuration: 180,
    isStackable: true,
    maxStack: 10
  },

  // ================= MALZEMELER (CRAFTING & YEMEK) =================
  mat_meat: {
    id: 'mat_meat',
    nameTr: 'Taze Av Eti',
    category: 'MATERIAL',
    descriptionTr: 'Maral veya tavşandan elde edilmiş lezzetli taze et.',
    icon: '🍖',
    rarity: 'COMMON',
    isStackable: true,
    maxStack: 99
  },
  mat_fish: {
    id: 'mat_fish',
    nameTr: 'Şahmaran Alabalığı',
    category: 'MATERIAL',
    descriptionTr: 'Şahmaran Gölü kıyısında ok ile avlanmış parlak pullu göl balığı.',
    icon: '🐟',
    rarity: 'COMMON',
    isStackable: true,
    maxStack: 99
  },
  mat_milk: {
    id: 'mat_milk',
    nameTr: 'Kısrak Sütü',
    category: 'MATERIAL',
    descriptionTr: 'Bozkır atlarından sağılmış taze kısrak sütü. Kımız için temel malzeme.',
    icon: '🥛',
    rarity: 'RARE',
    isStackable: true,
    maxStack: 99
  },
  mat_honey: {
    id: 'mat_honey',
    nameTr: 'Yabani Orman Balı',
    category: 'MATERIAL',
    descriptionTr: 'Yaşlı kayın ağaçlarının kovuğundan toplanmış altın sarısı petek balı.',
    icon: '🍯',
    rarity: 'RARE',
    isStackable: true,
    maxStack: 99
  },
  mat_mushroom: {
    id: 'mat_mushroom',
    nameTr: 'Yer-Sub Mantarı',
    category: 'MATERIAL',
    descriptionTr: 'Orman kütüklerinde yetişen etli şifalı orman mantarı.',
    icon: '🍄',
    rarity: 'COMMON',
    isStackable: true,
    maxStack: 99
  },
  mat_herb: {
    id: 'mat_herb',
    nameTr: 'Dağ Kekiği & Şifalı Ot',
    category: 'MATERIAL',
    descriptionTr: 'Bozkır rüzgârıyla kuruyan hoş kokulu şifalı dağ kekiği.',
    icon: '🌿',
    rarity: 'COMMON',
    isStackable: true,
    maxStack: 99
  },
  mat_pure_lotus: {
    id: 'mat_pure_lotus',
    nameTr: 'Kutsal Arı Nilüfer',
    category: 'MATERIAL',
    descriptionTr: 'Şahmaran Gölü’nün berrak koylarında açan saf şifalı zambak. Panzehir yapımının anahtarıdır.',
    icon: '🪷',
    rarity: 'RARE',
    isStackable: true,
    maxStack: 99
  },
  mat_blighted_lotus: {
    id: 'mat_blighted_lotus',
    nameTr: 'Zehirli Kara Nilüfer',
    category: 'MATERIAL',
    descriptionTr: 'Kara Kış zehriyle kararmış çürük nilüfer yaprağı. Zehir taşır.',
    icon: '🥀',
    rarity: 'COMMON',
    isStackable: true,
    maxStack: 99
  },
  mat_grain: {
    id: 'mat_grain',
    nameTr: 'Bozkır Arpası / Un',
    category: 'MATERIAL',
    descriptionTr: 'Değirmende öğütülmüş besleyici altın arpa unu.',
    icon: '🌾',
    rarity: 'COMMON',
    isStackable: true,
    maxStack: 99
  },
  mat_iron: {
    id: 'mat_iron',
    nameTr: 'Ham Demir Cevheri',
    category: 'MATERIAL',
    descriptionTr: 'Demir Dağ kayalıklarından çıkarılan kaliteli demir cevheri. Silah yükseltmede kullanılır.',
    icon: '⛏️',
    rarity: 'RARE',
    isStackable: true,
    maxStack: 99
  },
  mat_bone: {
    id: 'mat_bone',
    nameTr: 'Yaban Kemiği & Boynuz',
    category: 'MATERIAL',
    descriptionTr: 'Maral boynuzu ve sağlam av hayvanı kemikleri.',
    icon: '🦴',
    rarity: 'COMMON',
    isStackable: true,
    maxStack: 99
  },
  mat_leather: {
    id: 'mat_leather',
    nameTr: 'İşlenmiş Bozkurt Postu',
    category: 'MATERIAL',
    descriptionTr: 'Tabaklanmış dayanıklı ve su geçirmez kurt derisi.',
    icon: '📜',
    rarity: 'RARE',
    isStackable: true,
    maxStack: 99
  },
  mat_kut_powder: {
    id: 'mat_kut_powder',
    nameTr: 'Kut Tozu',
    category: 'MATERIAL',
    descriptionTr: 'Kara Totemlerden ve düşman ruhlarından düşen kutsal mavi ışıltılı cevher.',
    icon: '✨',
    rarity: 'EPIC',
    isStackable: true,
    maxStack: 99
  },

  // ================= GÖREV EŞYALARI =================
  quest_cedar_kopuz: {
    id: 'quest_cedar_kopuz',
    nameTr: 'Kam Ata’nın Sedir Kopuzu',
    category: 'QUEST',
    descriptionTr: 'Kadim sedir ağacından oyulmuş iki telli kutsal kopuz.',
    icon: '🪕',
    rarity: 'LEGENDARY',
    isStackable: false
  },
  quest_kam_stone: {
    id: 'quest_kam_stone',
    nameTr: 'Kam Taşı (Ruh Taşı)',
    category: 'QUEST',
    descriptionTr: 'Mabetlerin derinliğindeki kadim kamların bahşettiği mavi parıltılı ruh taşı. 4 taş = 1 Kut Kalbi.',
    icon: '💠',
    rarity: 'LEGENDARY',
    isStackable: true,
    maxStack: 99
  },
  quest_yer_kutu: {
    id: 'quest_yer_kutu',
    nameTr: 'Yer Kutu Parçası',
    category: 'QUEST',
    descriptionTr: 'Tepegöz devrildiğinde ortaya çıkan toprağın ve doğanın hayat çekirdeği.',
    icon: '🌱',
    rarity: 'LEGENDARY',
    isStackable: false
  }
};
