/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kadim Destan Başarımları Yöneticisi (AchievementManager)
 * (Dede Korkut & Türk Mitolojisi Temalı 30 Başarım, İlerleme Takibi, DOM Toast & Kalıcı Kayıt)
 */

import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';

export interface Achievement {
  id: string;
  nameTr: string;
  categoryTr: string;
  descriptionTr: string;
  icon: string;
  unlockedAt: number | null; // null = kilitli, timestamp = açıldı
  isSecret?: boolean;
  targetCount?: number;
  currentCount?: number;
}

export class AchievementManager {
  private static instance: AchievementManager | null = null;
  private static readonly STORAGE_KEY = 'otuken_achievements_v2';

  public achievements: Achievement[] = [
    // 1-4: Hikâye & Kader
    {
      id: 'ACH_OATH',
      nameTr: "Ayaz'ın Yemini",
      categoryTr: 'Destan & Kader',
      descriptionTr: 'Yıkılan obanın külleri üzerinde Kam Ata emanetini al ve intikam yemini et.',
      icon: '🗡️',
      unlockedAt: null
    },
    {
      id: 'ACH_FIRST_MOUNT',
      nameTr: 'Bozkırın Rüzgârı',
      categoryTr: 'Binekler & Keşif',
      descriptionTr: 'İlk yabani bozkır atını sessizce evcilleştir ve sırtına bin.',
      icon: '🐎',
      unlockedAt: null
    },
    {
      id: 'ACH_TULPAR',
      nameTr: 'Göklerin Hükümdarı',
      categoryTr: 'Efsanevi Varlıklar',
      descriptionTr: 'Efsanevi kanatlı at TULPAR ile göğe yüksel ve bulutların üstünde süzül.',
      icon: '🪽',
      unlockedAt: null
    },
    {
      id: 'ACH_FIRE_POWER',
      nameTr: "Ülgen'in Kıvılcımı",
      categoryTr: 'Kam Güçleri',
      descriptionTr: 'Ateş elementini uyandır, ilk kutsal kıvılcımı fırlat.',
      icon: '🔥',
      unlockedAt: null
    },

    // 5-8: Kut Parçaları
    {
      id: 'ACH_WIND_POWER',
      nameTr: "Yel Ana'nın Kanatları",
      categoryTr: 'Kam Güçleri',
      descriptionTr: 'Rüzgâr sütunu ve Yel Ana süzülüşü ile göklere meydan oku.',
      icon: '🌪️',
      unlockedAt: null
    },
    {
      id: 'ACH_KUT_TIME',
      nameTr: 'Zamanın Durduğu An',
      categoryTr: 'Kam Güçleri',
      descriptionTr: 'Kut Zamanı ile dünyayı yavaşlat ve düşman saldırısını boşa çıkar.',
      icon: '⏳',
      unlockedAt: null
    },
    {
      id: 'ACH_TEPEGOZ',
      nameTr: 'Dev Kıran',
      categoryTr: 'Destansı Savaşlar',
      descriptionTr: 'Yer-Sub ormanının tek gözlü canavarı Tepegöz’ü alt et ve Yer Kutu’nu kazan.',
      icon: '👁️',
      unlockedAt: null
    },
    {
      id: 'ACH_YER_KUTU',
      nameTr: 'Toprağın Kalbi',
      categoryTr: 'Kut Parçaları',
      descriptionTr: 'Yer Kutu’nu Bay Terek’in köklerine ulaştır ve ulu ağacı canlandır.',
      icon: '🌱',
      unlockedAt: null
    },

    // 9-12: Mabetler & Gelişim
    {
      id: 'ACH_ATES_KUTU',
      nameTr: 'Kutsal Köz',
      categoryTr: 'Kut Parçaları',
      descriptionTr: 'Ateş Kutu’nu bul ve obanın ocağını sonsuz alevle harla.',
      icon: '🔥',
      unlockedAt: null
    },
    {
      id: 'ACH_SU_KUTU',
      nameTr: 'Şahmaran’ın Gözyaşı',
      categoryTr: 'Kut Parçaları',
      descriptionTr: 'Su Kutu’nu Şahmaran Gölü derinliklerinden çekip çıkar.',
      icon: '💧',
      unlockedAt: null
    },
    {
      id: 'ACH_GOK_KUTU',
      nameTr: 'Tengri’nin Nefesi',
      categoryTr: 'Kut Parçaları',
      descriptionTr: 'Gök Kutu’nu en yüksek dağın zirvesinde kutsa.',
      icon: '✨',
      unlockedAt: null
    },
    {
      id: 'ACH_SHRINE_FIRE',
      nameTr: 'Ateş Mabedi Fatihi',
      categoryTr: 'Antik Mabetler',
      descriptionTr: 'Ateş Mabedinin tüm meşale ve basınç bulmacalarını çöz.',
      icon: '🏛️',
      unlockedAt: null
    },

    // 13-16: Mabet & Anıtlar
    {
      id: 'ACH_SHRINE_WIND',
      nameTr: 'Rüzgâr Mabedi Fatihi',
      categoryTr: 'Antik Mabetler',
      descriptionTr: 'Rüzgâr Mabedinin yel çarkı ve ayna ışığı mekanizmalarını tamamla.',
      icon: '🌀',
      unlockedAt: null
    },
    {
      id: 'ACH_4_KAM_STONE',
      nameTr: 'Kam Taşı Ustası',
      categoryTr: 'Kutsama',
      descriptionTr: 'Mabetlerden 4 Kam Taşı toplayarak ilk Kut Kalbi eşiğine ulaş.',
      icon: '💎',
      unlockedAt: null
    },
    {
      id: 'ACH_KUT_HEART',
      nameTr: "Kut'un Kalbi",
      categoryTr: 'Kutsama',
      descriptionTr: 'Can veya Kut Gücü barını kalıcı olarak artıran Kut Kalbi’ni bahşettir.',
      icon: '💖',
      unlockedAt: null
    },
    {
      id: 'ACH_BALBAL_1',
      nameTr: 'Alpın Hatırası',
      categoryTr: 'Kadim Anıtlar',
      descriptionTr: 'Bozkırda ilk kadim savaşçı balbal taşını keşfet ve ruhuna selam dur.',
      icon: '🗿',
      unlockedAt: null
    },

    // 17-20: Keşif & Hazine
    {
      id: 'ACH_BALBAL_ALL',
      nameTr: 'Ulu Alplar Meclisi',
      categoryTr: 'Kadim Anıtlar',
      descriptionTr: 'Ötüken topraklarındaki 6 Balbal taşının tamamını bul ve haritaya işle.',
      icon: '🗿',
      unlockedAt: null,
      currentCount: 0,
      targetCount: 6
    },
    {
      id: 'ACH_KURGAN_TREASURE',
      nameTr: 'Altın Elbiseli Adam',
      categoryTr: 'Kurganlar',
      descriptionTr: 'Tarihi bir kurgan höyüğünün gizli mezar odasını aç ve hazinesini al.',
      icon: '🏺',
      unlockedAt: null
    },
    {
      id: 'ACH_KURGAN_ALL',
      nameTr: 'Hanlar Hazinesi',
      categoryTr: 'Kurganlar',
      descriptionTr: '3 kutsal kurgan höyüğünün tamamındaki emanetleri topla.',
      icon: '👑',
      unlockedAt: null,
      currentCount: 0,
      targetCount: 3
    },
    {
      id: 'ACH_COMBO_3',
      nameTr: 'Üçleme Vuruşu',
      categoryTr: 'Savaş Ustalığı',
      descriptionTr: 'Kam Kılıcı ile kusursuz 3 kademeli kombo savuruşunu tamamla.',
      icon: '⚔️',
      unlockedAt: null
    },

    // 21-24: Savaş Ustalığı
    {
      id: 'ACH_COMBO_5',
      nameTr: 'Bozkır Kasırgası',
      categoryTr: 'Savaş Ustalığı',
      descriptionTr: 'Düşman ordusuna karşı 5’li kesintisiz darbe serisi gerçekleştir.',
      icon: '⚡',
      unlockedAt: null
    },
    {
      id: 'ACH_PLUNGE',
      nameTr: 'Gökten İnen Gazap',
      categoryTr: 'Savaş Ustalığı',
      descriptionTr: 'Süzülürken gökten yere sert vuruş (Plunge Attack) ile şok dalgası yarat.',
      icon: '💥',
      unlockedAt: null
    },
    {
      id: 'ACH_FLURRY_RUSH',
      nameTr: 'Kut Şimşeği',
      categoryTr: 'Savaş Ustalığı',
      descriptionTr: 'Düşman saldırısından son milisaniyede kaçarak Flurry Rush serisini tetikle.',
      icon: '⚡',
      unlockedAt: null
    },
    {
      id: 'ACH_PARRY_MASTER',
      nameTr: 'Çelik İrade',
      categoryTr: 'Savaş Ustalığı',
      descriptionTr: 'Kalkanın ile kusursuz savuşturma (Perfect Parry) yaparak saldırıyı geri püskürt.',
      icon: '🛡️',
      unlockedAt: null
    },

    // 25-28: Zanaat & Keşif
    {
      id: 'ACH_CHEF_6',
      nameTr: 'Bozkır Ziyafeti',
      categoryTr: 'Yemek & Simya',
      descriptionTr: 'Kımız, kavurma, kurut, pişi, talkan ve ayran dahil 6 Türk tarifini keşfet.',
      icon: '🍲',
      unlockedAt: null,
      currentCount: 0,
      targetCount: 6
    },
    {
      id: 'ACH_BLACKSMITH_4',
      nameTr: 'Demir Dağ Ustalığı',
      categoryTr: 'Zanaat & Teçhizat',
      descriptionTr: 'Demirci Bamsı tezgahında bir silahı 4. seviye efsanevi mertebeye ulaştır.',
      icon: '🔨',
      unlockedAt: null
    },
    {
      id: 'ACH_EXPLORE_25',
      nameTr: 'Ötüken Yolcusu',
      categoryTr: 'Keşif',
      descriptionTr: '1024x1024m açık dünya haritasının %25’ini sislerden arındır.',
      icon: '🗺️',
      unlockedAt: null
    },
    {
      id: 'ACH_EXPLORE_100',
      nameTr: 'Ötüken Fatihi',
      categoryTr: 'Keşif',
      descriptionTr: 'Bozkır, Şahmaran Gölü ve Demir Dağ dahil tüm haritayı %100 keşfet.',
      icon: '🌟',
      unlockedAt: null
    },

    // 29-30: Kopuz & Gizli
    {
      id: 'ACH_KOPUZ_ALL',
      nameTr: 'Altı Kutsal Ezgi',
      categoryTr: 'Kültür & Müzik',
      descriptionTr: 'Gün, Yel, Yağmur, Börü, Tulpar ve Kut ezgilerinin tamamını öğren ve icra et.',
      icon: '🪕',
      unlockedAt: null,
      currentCount: 0,
      targetCount: 6
    },
    {
      id: 'ACH_SECRET_LAKE',
      nameTr: 'Şahmaran’ın Sırrı',
      categoryTr: 'Gizli Keşif',
      descriptionTr: 'Şahmaran Gölü kıyısında gece yarısı ok ile kutsal alabalık avla.',
      icon: '🐟',
      unlockedAt: null,
      isSecret: true
    }
  ];

  public static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }

  constructor() {
    this.loadState();
    this.setupListeners();
  }

  private loadState(): void {
    try {
      const raw = localStorage.getItem(AchievementManager.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        for (const ach of this.achievements) {
          if (parsed[ach.id]) {
            ach.unlockedAt = parsed[ach.id];
          }
        }
      }
    } catch (e) {
      console.warn('[AchievementManager] Başarımlar yüklenirken hata:', e);
    }
  }

  private saveState(): void {
    try {
      const map: Record<string, number> = {};
      for (const ach of this.achievements) {
        if (ach.unlockedAt) {
          map[ach.id] = ach.unlockedAt;
        }
      }
      localStorage.setItem(AchievementManager.STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('[AchievementManager] Başarımlar kaydedilirken hata:', e);
    }
  }

  private setupListeners(): void {
    EventBus.on('mount:mount', (data: { mountType: 'HORSE' | 'TULPAR' }) => {
      if (data.mountType === 'TULPAR') {
        this.unlock('ACH_TULPAR');
      } else {
        this.unlock('ACH_FIRST_MOUNT');
      }
    });

    EventBus.on('crafting:upgrade', (data: { itemId: string; newLevel: number }) => {
      if (data.newLevel >= 4) {
        this.unlock('ACH_BLACKSMITH_4');
      }
    });

    EventBus.on('crafting:cook', () => {
      const ach = this.get('ACH_CHEF_6');
      if (ach && !ach.unlockedAt) {
        ach.currentCount = (ach.currentCount || 0) + 1;
        if (ach.currentCount >= (ach.targetCount || 6)) {
          this.unlock('ACH_CHEF_6');
        }
      }
    });

    EventBus.on('shrine:complete', () => {
      this.unlock('ACH_SHRINE_FIRE');
    });

    EventBus.on('combat:boss_defeat', () => {
      this.unlock('ACH_TEPEGOZ');
    });

    EventBus.on('shrine:kut_heart_selected', () => {
      this.unlock('ACH_KUT_HEART');
    });

    EventBus.on('kopuz:play', () => {
      const ach = this.get('ACH_KOPUZ_ALL');
      if (ach && !ach.unlockedAt) {
        ach.currentCount = (ach.currentCount || 0) + 1;
        if (ach.currentCount >= (ach.targetCount || 6)) {
          this.unlock('ACH_KOPUZ_ALL');
        }
      }
    });
  }

  public get(id: string): Achievement | undefined {
    return this.achievements.find((a) => a.id === id);
  }

  public unlock(id: string): boolean {
    const ach = this.get(id);
    if (!ach || ach.unlockedAt) return false;

    ach.unlockedAt = Date.now();
    this.saveState();

    ProceduralAudio.playAchievementFanfare();
    this.showToast(ach);

    EventBus.emit('achievement:unlocked', { achievementId: id, nameTr: ach.nameTr });
    console.log(`[AchievementManager] 🏆 BAŞARIM AÇILDI: ${ach.nameTr}`);
    return true;
  }

  private showToast(ach: Achievement): void {
    let toast = document.getElementById('achievementToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'achievementToast';
      document.body.appendChild(toast);
    }

    toast.className = 'achievement-toast active';
    toast.innerHTML = `
      <div class="ach-toast-icon">${ach.icon}</div>
      <div class="ach-toast-content">
        <div class="ach-toast-header">🏆 KADİM DESTAN BAŞARIMI</div>
        <div class="ach-toast-title">${ach.nameTr}</div>
        <div class="ach-toast-desc">${ach.descriptionTr}</div>
      </div>
    `;

    setTimeout(() => {
      toast?.classList.remove('active');
    }, 4500);
  }

  public getProgressPercentage(): number {
    const unlocked = this.achievements.filter((a) => a.unlockedAt !== null).length;
    return Math.round((unlocked / this.achievements.length) * 100);
  }
}
