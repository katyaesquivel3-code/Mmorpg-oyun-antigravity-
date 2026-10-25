/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Destan Defteri, Başarımlar, Ayarlar & Birleşik Duraklatma Menüsü (DestanDefteriModal)
 * (Harita, Görevler, Mitoloji Ansiklopedisi, 12 Kadim Başarım, Ses Veri Yolu Ayarları, 3 Kayıt Yuvası & Sıfır GC)
 */

import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { QuestManager } from '../story/QuestManager';
import { AchievementManager, Achievement } from '../story/AchievementManager';
import { SaveSystem } from '../infra/SaveSystem';
import { SettingsStore } from '../infra/SettingsStore';

export interface LoreEntry {
  id: string;
  nameTr: string;
  categoryTr: string;
  icon: string;
  color: string;
  loreTr: string;
  quoteTr: string;
  isUnlocked: boolean;
}

export class DestanDefteriModal {
  private modalContainer: HTMLElement | null;
  private closeBtn: HTMLElement | null;

  // Tab Butonları
  private tabBtns: NodeListOf<HTMLElement> | null = null;
  private tabPanes: NodeListOf<HTMLElement> | null = null;

  // Destan Defteri DOM Alanları
  private loreListContainer: HTMLElement | null = null;
  private loreDetailContainer: HTMLElement | null = null;

  // Görevler Tab DOM Alanları
  private questListContainer: HTMLElement | null = null;

  // Başarımlar Tab DOM Alanları
  private achievementsContainer: HTMLElement | null = null;

  // Ayarlar & Kayıt Tab DOM Alanları
  private settingsContainer: HTMLElement | null = null;

  public isOpen = false;
  public activeTab: 'map' | 'quests' | 'destan' | 'achievements' | 'settings' = 'destan';

  public loreEntries: LoreEntry[] = [];
  public selectedLoreId = 'lore_tepegoz';

  constructor() {
    this.modalContainer = document.getElementById('pauseMenuModal');
    this.closeBtn = document.getElementById('closePauseMenuModal');

    this.initLoreEntries();
    this.setupDOM();
    this.setupListeners();
  }

  private initLoreEntries(): void {
    this.loreEntries = [
      {
        id: 'lore_tepegoz',
        nameTr: 'Tepegöz (Yer-Sub Devi)',
        categoryTr: 'Destansı Varlıklar',
        icon: '👁️',
        color: '#f87171',
        loreTr: 'Dede Korkut Kitabı’nda Basat’ın alt ettiği tek gözlü dev. Anası alageyik donundaki bir peri kızı, atası Uruz Koca’nın çobanıdır. Dağları titreten cüssesine kılıç ve mızrak işlemez; tek zayıf noktası alnının çatısındaki dev gözüdür.',
        quoteTr: '“Basat kılıcını kınından çekti, ateşte kızdırdığı temreni Tepegöz’ün tek gözüne vurdu...” — Dede Korkut',
        isUnlocked: true
      },
      {
        id: 'lore_boru',
        nameTr: 'Kutsal Gök Kurt Börü',
        categoryTr: 'Kutsal Kılavuzlar',
        icon: '🐺',
        color: '#38bdf8',
        loreTr: 'Gök Tengri’nin gök yeleli elçisi. Ergenekon’da dağlar eritilirken Türk boylarına yol gösteren kutsal varlık. Kurt uluması düşmana korku salarken, dostlarına ataların desteğini müjdeler.',
        quoteTr: '“Önlerine gök tüylü, gök yeleli ulu bir erkek kurt düştü, yol gösterdi.” — Ergenekon Destanı',
        isUnlocked: true
      },
      {
        id: 'lore_bay_terek',
        nameTr: 'Bay Terek (Ulu Hayat Ağacı)',
        categoryTr: 'Kozmoloji & Kutsal Ağaç',
        icon: '🌳',
        color: '#4ade80',
        loreTr: 'Evrenin direği, dokuz budaklı hayat ağacı. Kökleri yer altını, gövdesi insan dünyasını, doruğu ise Gök Tengri’nin altın tahtını birleştirir. Kut parçaları saçıldığında kurur, Kut birleştikçe yeniden yeşerir.',
        quoteTr: '“Ağacın kökü yer altı ırmaklarına, yaprakları yıldızlara değerdi.” — Altay Yaratılış Destanı',
        isUnlocked: true
      },
      {
        id: 'lore_albiz',
        nameTr: 'Albız Ruhları (Körmözler)',
        categoryTr: 'Yeraltı Varlıkları',
        icon: '👻',
        color: '#c084fc',
        loreTr: 'Erlik Han’ın yeraltındaki karanlıktan çıkardığı gölge ruhları. Gece bastığında bozkırda sürü halinde avlanırlar. Ateşten ve kutsal kam davulunun sesinden kaçarlar.',
        quoteTr: '“Karanlık çöktüğünde oba ateşini söndürmeyin, zira Albız sönmüş ocağı sever.” — Kam Öğüdü',
        isUnlocked: true
      },
      {
        id: 'lore_erlik',
        nameTr: 'Erlik Han',
        categoryTr: 'Yeraltı Hükümdarı',
        icon: '💀',
        color: '#ef4444',
        loreTr: 'Karanlığın, yeraltı dünyasının ve soğuk kışın efendisi. İnsanların kibrini ve zayıflığını kullanarak Kut’u parçalamış, Ötüken üzerine bitmeyen Kara Kış’ı salmıştır.',
        quoteTr: '“Güneşin batmadığı diyarlardan kara atıyla geldi, oba ocağını dondurdu.”',
        isUnlocked: false
      },
      {
        id: 'lore_kopuz',
        nameTr: 'Kam Ata’nın Kopuzu',
        categoryTr: 'Kutsal Çalgılar',
        icon: '🪕',
        color: '#fb923c',
        loreTr: 'İki at kılı teli ve içi oyulmuş kayın ağacından yapılan kadim çalgı. Kamların göğe ve yeraltına yaptığı yolculuklarda ruhları çağırmak, doğayı teskin etmek için çalınır.',
        quoteTr: '“Kopuzun teline vurdukça yer inledi, gök gürledi, atlar huysuzluğunu unuttu.” — Dede Korkut',
        isUnlocked: true
      },
      {
        id: 'lore_yer_sub',
        nameTr: 'Yer-Sub İyeleri (Toprak ve Su Ruhları)',
        categoryTr: 'Doğa İyeleri',
        icon: '🌊',
        color: '#2dd4bf',
        loreTr: 'Kutsal toprak, orman, dağ ve ırmak ruhları. Doğaya saygı gösteren avcılara bereket sunar; kutsal ağaçları kesen ve suları kirletenleri ise kör eder.',
        quoteTr: '“Üstte mavi gök, altta yağız yer kılındıkta, ikisi arasında insanoğlu kılındı.” — Kül Tigin Yazıtı',
        isUnlocked: true
      },
      {
        id: 'lore_bengu',
        nameTr: 'Bengü Taşlar (Orhun Abideleri)',
        categoryTr: 'Kadim Anıtlar',
        icon: '🗿',
        color: '#60a5fa',
        loreTr: 'Gök Tengri’nin buyruklarını ve Türk milletinin ebedî varlığını taşa kazıyan Orhun dikilitaşları. Tonyukuk, Kül Tigin ve Bilge Kağan’ın ruhu bu taşlarda yaşar.',
        quoteTr: '“Türk milleti için gece uyumadım, gündüz oturmadım... Taş üzerine yazdırdım, Bengü Taş ettim.” — Bilge Kağan',
        isUnlocked: true
      },
      {
        id: 'lore_tulpar',
        nameTr: 'Efsanevi TULPAR (Kanatlı At)',
        categoryTr: 'Efsanevi Varlıklar',
        icon: '🪽',
        color: '#facc15',
        loreTr: 'Gök Tengri tarafından bahşedilmiş altın yeleli, bulutları yaran beyaz kanatlı kutsal at. Sadece yüreğinde kut taşıyan yiğitlerin ıslığını işitir.',
        quoteTr: '“Tulpar kanat açtığında gölge yere düşmez, rüzgâr ardında diz çökerdi.” — Manas Destanı',
        isUnlocked: true
      }
    ];
  }

  private setupDOM(): void {
    if (!this.modalContainer) return;

    this.tabBtns = this.modalContainer.querySelectorAll('.pause-tab-btn');
    this.tabPanes = this.modalContainer.querySelectorAll('.pause-tab-pane');

    this.loreListContainer = document.getElementById('destanLoreList');
    this.loreDetailContainer = document.getElementById('destanLoreDetail');
    this.questListContainer = document.getElementById('pauseQuestList');
    this.achievementsContainer = document.getElementById('pauseAchievementsList');
    this.settingsContainer = document.getElementById('pauseSettingsContent');
  }

  private setupListeners(): void {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    if (this.tabBtns) {
      this.tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const tab = (btn as HTMLElement).dataset.tab as any;
          if (tab) {
            this.switchTab(tab);
            ProceduralAudio.playButtonClick();
          }
        });
      });
    }
  }

  public open(defaultTab: 'map' | 'quests' | 'destan' | 'achievements' | 'settings' = 'destan'): void {
    if (this.isOpen || !this.modalContainer) return;
    this.isOpen = true;
    this.modalContainer.classList.add('active');
    this.switchTab(defaultTab);
    ProceduralAudio.playButtonClick();
  }

  public close(): void {
    if (!this.isOpen || !this.modalContainer) return;
    this.isOpen = false;
    this.modalContainer.classList.remove('active');
    ProceduralAudio.playButtonClick();
  }

  public switchTab(tab: 'map' | 'quests' | 'destan' | 'achievements' | 'settings'): void {
    if (tab === 'map') {
      this.close();
      EventBus.emit('map:open');
      return;
    }

    this.activeTab = tab;

    if (this.tabBtns && this.tabPanes) {
      this.tabBtns.forEach((b) => {
        if ((b as HTMLElement).dataset.tab === tab) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      this.tabPanes.forEach((p) => {
        if (p.id === `pauseTab_${tab}`) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }

    if (tab === 'destan') {
      this.renderDestanList();
      this.renderDestanDetail();
    } else if (tab === 'quests') {
      this.renderQuestList();
    } else if (tab === 'achievements') {
      this.renderAchievements();
    } else if (tab === 'settings') {
      this.renderSettingsAndSaves();
    }
  }

  public unlockLore(id: string): void {
    const entry = this.loreEntries.find((e) => e.id === id);
    if (entry && !entry.isUnlocked) {
      entry.isUnlocked = true;
      EventBus.emit('ui:loot_toast', { text: `📖 Destan Defteri: "${entry.nameTr}" kaydı açıldı!` });
      ProceduralAudio.playQuestUpdate();
    }
  }

  private renderDestanList(): void {
    if (!this.loreListContainer) return;

    let html = '';
    this.loreEntries.forEach((entry) => {
      const isSelected = entry.id === this.selectedLoreId;
      const isLocked = !entry.isUnlocked;

      html += `
        <div class="destan-list-item ${isSelected ? 'active' : ''} ${isLocked ? 'locked' : ''}" data-id="${entry.id}">
          <span class="destan-item-icon">${isLocked ? '🔒' : entry.icon}</span>
          <div class="destan-item-info">
            <span class="destan-item-name" style="color: ${isLocked ? '#64748b' : entry.color};">${isLocked ? 'Bilinmeyen Varlık' : entry.nameTr}</span>
            <span class="destan-item-cat">${entry.categoryTr}</span>
          </div>
        </div>
      `;
    });

    this.loreListContainer.innerHTML = html;

    const items = this.loreListContainer.querySelectorAll('.destan-list-item');
    items.forEach((it) => {
      it.addEventListener('click', () => {
        const id = (it as HTMLElement).dataset.id;
        if (id) {
          this.selectedLoreId = id;
          ProceduralAudio.playButtonClick();
          this.renderDestanList();
          this.renderDestanDetail();
        }
      });
    });
  }

  private renderDestanDetail(): void {
    if (!this.loreDetailContainer) return;

    const entry = this.loreEntries.find((e) => e.id === this.selectedLoreId) || this.loreEntries[0];

    if (!entry.isUnlocked) {
      this.loreDetailContainer.innerHTML = `
        <div class="destan-locked-detail">
          <span style="font-size: 38px;">🔒</span>
          <h3>Bu Destan Kaydı Henüz Açılmadı</h3>
          <p>Ötüken açık dünyasını keşfet, kadim varlıklarla karşılaş veya Ulu Kam Korkut Ata ile konuşarak bu gizemi aydınlat.</p>
        </div>
      `;
      return;
    }

    this.loreDetailContainer.innerHTML = `
      <div class="destan-detail-card">
        <div class="destan-detail-header">
          <span class="destan-header-icon">${entry.icon}</span>
          <div>
            <h2 class="destan-header-title" style="color: ${entry.color};">${entry.nameTr}</h2>
            <span class="destan-header-cat">${entry.categoryTr}</span>
          </div>
        </div>

        <blockquote class="destan-quote">${entry.quoteTr}</blockquote>

        <div class="destan-lore-body">
          <p>${entry.loreTr}</p>
        </div>

        <div class="destan-cultural-note">
          <span>📜 Türk Mitolojisi & Kültürel Miras Kaydı</span>
        </div>
      </div>
    `;
  }

  private renderQuestList(): void {
    if (!this.questListContainer) return;

    const questMgr = QuestManager.getInstance();

    let html = '';
    questMgr.quests.forEach((q) => {
      const isCompleted = q.state === 'COMPLETED';
      const isActive = q.state === 'ACTIVE';

      html += `
        <div class="quest-pause-card ${q.state.toLowerCase()}">
          <div class="quest-pause-top">
            <span class="badge-${q.type.toLowerCase()}">${q.type === 'MAIN' ? '★ ANA GÖREV' : '◇ YAN GÖREV'}</span>
            <span class="quest-pause-title">${q.titleTr}</span>
            <span class="quest-pause-status">${isCompleted ? '✓ TAMAMLANDI' : isActive ? '▶ AKTİF' : '🔒 KİLİTLİ'}</span>
          </div>

          <p class="quest-pause-desc">${q.descriptionTr}</p>

          <div class="quest-pause-objectives">
            ${q.objectives
              .map(
                (obj) => `
                <div class="quest-pause-obj-row ${obj.isDone ? 'done' : ''}">
                  <span class="obj-check">${obj.isDone ? '✓' : '○'}</span>
                  <span class="obj-text">${obj.descriptionTr} (${obj.currentCount}/${obj.targetCount})</span>
                </div>
              `
              )
              .join('')}
          </div>

          <div class="quest-pause-footer">
            <span style="color: #facc15;">Ödül: ${q.rewardTr}</span>
          </div>
        </div>
      `;
    });

    this.questListContainer.innerHTML = html;
  }

  /**
   * FAZ 8: 12 Kadim Destan Başarımı Görünümü
   */
  private renderAchievements(): void {
    if (!this.achievementsContainer) return;

    const achMgr = AchievementManager.getInstance();
    const pct = achMgr.getProgressPercentage();
    const unlockedCount = achMgr.achievements.filter((a) => a.unlockedAt !== null).length;

    let html = `
      <div class="ach-header-banner">
        <div>
          <h3 style="margin: 0; color: #facc15; font-size: 14px;">🏆 KADİM DESTAN BAŞARIMLARI</h3>
          <span style="color: #94a3b8; font-size: 10px;">${unlockedCount} / ${achMgr.achievements.length} Başarım Açıldı (%${pct})</span>
        </div>
        <div class="ach-progress-bar-bg">
          <div class="ach-progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
      <div class="ach-grid">
    `;

    achMgr.achievements.forEach((a) => {
      const isUnlocked = a.unlockedAt !== null;
      html += `
        <div class="ach-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="ach-card-icon">${isUnlocked ? a.icon : '🔒'}</div>
          <div class="ach-card-info">
            <div class="ach-card-title" style="color: ${isUnlocked ? '#facc15' : '#64748b'};">${a.nameTr}</div>
            <div class="ach-card-cat">${a.categoryTr}</div>
            <div class="ach-card-desc">${a.descriptionTr}</div>
            <div class="ach-card-status">${isUnlocked ? '✓ AÇILDI' : 'KİLİTLİ'}</div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.achievementsContainer.innerHTML = html;
  }

  /**
   * FAZ 8: Kapsamlı Ayarlar (Grafik, Kontrol, Ses, Erişilebilirlik, Dil) & 3 Yuvalı Kayıt Yönetimi Görünümü
   */
  private renderSettingsAndSaves(): void {
    if (!this.settingsContainer) return;

    const saveSys = SaveSystem.getInstance();
    const slots = saveSys.listSlots();
    const settings = SettingsStore.get();

    let html = `
      <div class="settings-pause-layout">
        <!-- Sol Kolon: Grafik, Kontrol, Ses, Erişilebilirlik ve Dil Ayarları -->
        <div class="settings-pause-col" style="max-height: 440px; overflow-y: auto; padding-right: 6px;">
          <!-- 1. GRAFİK AYARLARI -->
          <h4 style="color: #38bdf8; margin: 0 0 6px 0; font-size: 11px;">🎨 GRAFİK AYARLARI</h4>
          <div class="setting-row">
            <label>Grafik Kalitesi</label>
            <select id="settingGraphicsQuality" class="setting-select">
              <option value="AUTO" ${settings.graphicsQuality === 'AUTO' ? 'selected' : ''}>Otomatik</option>
              <option value="LOW" ${settings.graphicsQuality === 'LOW' ? 'selected' : ''}>Düşük</option>
              <option value="MEDIUM" ${settings.graphicsQuality === 'MEDIUM' ? 'selected' : ''}>Orta</option>
              <option value="HIGH" ${settings.graphicsQuality === 'HIGH' ? 'selected' : ''}>Yüksek</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Hedef Kare Hızı (FPS)</label>
            <select id="settingTargetFps" class="setting-select">
              <option value="30" ${settings.targetFps === 30 ? 'selected' : ''}>30 FPS</option>
              <option value="60" ${settings.targetFps === 60 ? 'selected' : ''}>60 FPS</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Çözünürlük Ölçeği (${Math.round(settings.resolutionScale * 100)}%)</label>
            <input type="range" id="settingResScale" min="0.7" max="1.5" step="0.1" value="${settings.resolutionScale}" />
          </div>
          <div class="setting-row">
            <label>Gölge Kalitesi</label>
            <select id="settingShadowQuality" class="setting-select">
              <option value="OFF" ${settings.shadowQuality === 'OFF' ? 'selected' : ''}>Kapalı</option>
              <option value="LOW" ${settings.shadowQuality === 'LOW' ? 'selected' : ''}>Düşük</option>
              <option value="MEDIUM" ${settings.shadowQuality === 'MEDIUM' ? 'selected' : ''}>Orta</option>
              <option value="HIGH" ${settings.shadowQuality === 'HIGH' ? 'selected' : ''}>Yüksek</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Çim Yoğunluğu</label>
            <select id="settingGrassDensity" class="setting-select">
              <option value="LOW" ${settings.grassDensity === 'LOW' ? 'selected' : ''}>Düşük</option>
              <option value="MEDIUM" ${settings.grassDensity === 'MEDIUM' ? 'selected' : ''}>Orta</option>
              <option value="HIGH" ${settings.grassDensity === 'HIGH' ? 'selected' : ''}>Yüksek</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Görüş Mesafesi</label>
            <select id="settingViewDistance" class="setting-select">
              <option value="LOW" ${settings.viewDistance === 'LOW' ? 'selected' : ''}>Düşük</option>
              <option value="MEDIUM" ${settings.viewDistance === 'MEDIUM' ? 'selected' : ''}>Orta</option>
              <option value="HIGH" ${settings.viewDistance === 'HIGH' ? 'selected' : ''}>Yüksek</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Pil Tasarrufu Modu</label>
            <input type="checkbox" id="settingBatterySaver" ${settings.batterySaver ? 'checked' : ''} />
          </div>

          <!-- 2. KONTROLLER & KAMERA -->
          <h4 style="color: #38bdf8; margin: 12px 0 6px 0; font-size: 11px;">🎮 KONTROLLER & KAMERA</h4>
          <div class="setting-row">
            <label>Kamera Hassasiyeti</label>
            <input type="range" id="pauseCamSens" min="0.5" max="2.5" step="0.1" value="${settings.cameraSensitivity}" />
          </div>
          <div class="setting-row">
            <label>Sol El Modu (Aynalı Kontroller)</label>
            <input type="checkbox" id="settingLeftHand" ${settings.leftHandMode ? 'checked' : ''} />
          </div>
          <div class="setting-row">
            <label>Yay İnce Nişan Jiroskopu</label>
            <input type="checkbox" id="settingGyro" ${settings.gyroAimEnabled ? 'checked' : ''} />
          </div>
          <div class="setting-row">
            <label>Dokunsal Titreşim (Haptics)</label>
            <input type="checkbox" id="settingHaptics" ${settings.hapticsEnabled ? 'checked' : ''} />
          </div>

          <!-- 3. SES VERİ YOLLARI (AUDIO BUS) -->
          <h4 style="color: #38bdf8; margin: 12px 0 6px 0; font-size: 11px;">🔊 SES VERİ YOLLARI (AUDIO BUS)</h4>
          <div class="setting-row">
            <label>Ana Ses (Master)</label>
            <input type="range" id="pauseMasterVol" min="0" max="1" step="0.05" value="${settings.masterVolume}" />
          </div>
          <div class="setting-row">
            <label>Müzik & Katmanlar</label>
            <input type="range" id="pauseMusicVol" min="0" max="1" step="0.05" value="${settings.musicVolume}" />
          </div>
          <div class="setting-row">
            <label>Savaş & Efektler (SFX)</label>
            <input type="range" id="pauseSfxVol" min="0" max="1" step="0.05" value="${settings.sfxVolume}" />
          </div>
          <div class="setting-row">
            <label>Doğa & Çevre (Ambience)</label>
            <input type="range" id="pauseAmbienceVol" min="0" max="1" step="0.05" value="${settings.ambienceVolume}" />
          </div>
          <div class="setting-row">
            <label>Kam Kopuzu Sesi</label>
            <input type="range" id="pauseKopuzVol" min="0" max="1" step="0.05" value="${settings.kopuzVolume}" />
          </div>

          <!-- 4. ERİŞİLEBİLİRLİK & YARDIM MODU -->
          <h4 style="color: #38bdf8; margin: 12px 0 6px 0; font-size: 11px;">👁️ ERİŞİLEBİLİRLİK & YARDIM MODU</h4>
          <div class="setting-row">
            <label>Altyazı Boyutu</label>
            <select id="settingSubtitleSize" class="setting-select">
              <option value="SMALL" ${settings.subtitleSize === 'SMALL' ? 'selected' : ''}>Küçük</option>
              <option value="MEDIUM" ${settings.subtitleSize === 'MEDIUM' ? 'selected' : ''}>Orta</option>
              <option value="LARGE" ${settings.subtitleSize === 'LARGE' ? 'selected' : ''}>Büyük</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Renk Körü Telegraph Paleti</label>
            <input type="checkbox" id="settingColorblind" ${settings.colorblindMode ? 'checked' : ''} />
          </div>
          <div class="setting-row">
            <label>Yardım Modu: Otomatik Kilit</label>
            <input type="checkbox" id="settingAssistAutoLock" ${settings.assistAutoLock ? 'checked' : ''} />
          </div>
          <div class="setting-row">
            <label>Yardım Modu: Geniş Parry Penceresi (320ms)</label>
            <input type="checkbox" id="settingAssistWideParry" ${settings.assistWideParry ? 'checked' : ''} />
          </div>

          <!-- 5. DİL (LANGUAGE) -->
          <h4 style="color: #38bdf8; margin: 12px 0 6px 0; font-size: 11px;">🌐 DİL (LANGUAGE)</h4>
          <div class="setting-row">
            <label>Arayüz Dili</label>
            <select id="settingLanguage" class="setting-select">
              <option value="tr" ${settings.language === 'tr' ? 'selected' : ''}>Türkçe (TR)</option>
              <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English (EN)</option>
            </select>
          </div>
        </div>

        <!-- Sağ Kolon: 3 Yuvalı Kayıt Yönetimi (Save Slots) -->
        <div class="settings-pause-col">
          <h4 style="color: #facc15; margin: 0 0 10px 0; font-size: 12px;">💾 KAYIT YUVALARI (SAVE SLOTS)</h4>
          <div class="save-slots-list">
    `;

    const slotLabels = ['Kayıt Yuvası 1', 'Kayıt Yuvası 2', 'Kayıt Yuvası 3', 'Otomatik Kayıt'];
    const slotKeys = ['slot_1', 'slot_2', 'slot_3', 'autosave'];

    slotKeys.forEach((key, idx) => {
      const meta = slots[idx];
      const hasSave = meta !== null;

      html += `
        <div class="save-slot-card ${hasSave ? 'has-save' : 'empty'}">
          <div class="slot-header">
            <span class="slot-title">${slotLabels[idx]}</span>
            <span class="slot-badge">${hasSave ? `KUT SEVİYE ${meta.level}` : 'BOŞ'}</span>
          </div>
          ${
            hasSave
              ? `
            <div class="slot-details">
              <span>📍 ${meta.locationNameTr}</span>
              <span>⏱️ ${Math.floor(meta.playtimeSeconds / 60)} dk</span>
              <span>📅 ${new Date(meta.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="slot-actions">
              <button class="btn-slot btn-slot-load" data-slot="${key}">YÜKLE</button>
              <button class="btn-slot btn-slot-save" data-slot="${key}">ÜZERİNE YAZ</button>
              <button class="btn-slot btn-slot-del" data-slot="${key}">SİL</button>
            </div>
          `
              : `
            <div class="slot-actions">
              <button class="btn-slot btn-slot-save" data-slot="${key}">BURAYA KAYDET</button>
            </div>
          `
          }
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    this.settingsContainer.innerHTML = html;
    this.wireSettingsDOM();
  }

  private wireSettingsDOM(): void {
    if (!this.settingsContainer) return;

    // 1. Grafik Kontrolleri
    const gqSelect = document.getElementById('settingGraphicsQuality') as HTMLSelectElement;
    gqSelect?.addEventListener('change', () => {
      SettingsStore.set('graphicsQuality', gqSelect.value as any);
    });

    const fpsSelect = document.getElementById('settingTargetFps') as HTMLSelectElement;
    fpsSelect?.addEventListener('change', () => {
      SettingsStore.set('targetFps', parseInt(fpsSelect.value) as any);
    });

    const resSlider = document.getElementById('settingResScale') as HTMLInputElement;
    resSlider?.addEventListener('input', () => {
      SettingsStore.set('resolutionScale', parseFloat(resSlider.value));
    });

    const shSelect = document.getElementById('settingShadowQuality') as HTMLSelectElement;
    shSelect?.addEventListener('change', () => {
      SettingsStore.set('shadowQuality', shSelect.value as any);
    });

    const grassSelect = document.getElementById('settingGrassDensity') as HTMLSelectElement;
    grassSelect?.addEventListener('change', () => {
      SettingsStore.set('grassDensity', grassSelect.value as any);
    });

    const viewSelect = document.getElementById('settingViewDistance') as HTMLSelectElement;
    viewSelect?.addEventListener('change', () => {
      SettingsStore.set('viewDistance', viewSelect.value as any);
    });

    const batteryCb = document.getElementById('settingBatterySaver') as HTMLInputElement;
    batteryCb?.addEventListener('change', () => {
      SettingsStore.set('batterySaver', batteryCb.checked);
    });

    // 2. Kontroller & Kamera
    const sensSlider = document.getElementById('pauseCamSens') as HTMLInputElement;
    sensSlider?.addEventListener('input', () => {
      SettingsStore.set('cameraSensitivity', parseFloat(sensSlider.value));
    });

    const leftHandCb = document.getElementById('settingLeftHand') as HTMLInputElement;
    leftHandCb?.addEventListener('change', () => {
      SettingsStore.set('leftHandMode', leftHandCb.checked);
    });

    const gyroCb = document.getElementById('settingGyro') as HTMLInputElement;
    gyroCb?.addEventListener('change', () => {
      SettingsStore.set('gyroAimEnabled', gyroCb.checked);
    });

    const hapticsCb = document.getElementById('settingHaptics') as HTMLInputElement;
    hapticsCb?.addEventListener('change', () => {
      SettingsStore.set('hapticsEnabled', hapticsCb.checked);
    });

    // 3. Ses Kaydırıcıları
    const masterSlider = document.getElementById('pauseMasterVol') as HTMLInputElement;
    masterSlider?.addEventListener('input', () => {
      const val = parseFloat(masterSlider.value);
      ProceduralAudio.setMasterVolume(val);
      SettingsStore.set('masterVolume', val);
    });

    const musicSlider = document.getElementById('pauseMusicVol') as HTMLInputElement;
    musicSlider?.addEventListener('input', () => {
      const val = parseFloat(musicSlider.value);
      ProceduralAudio.setMusicVolume(val);
      SettingsStore.set('musicVolume', val);
    });

    const sfxSlider = document.getElementById('pauseSfxVol') as HTMLInputElement;
    sfxSlider?.addEventListener('input', () => {
      const val = parseFloat(sfxSlider.value);
      ProceduralAudio.setSfxVolume(val);
      SettingsStore.set('sfxVolume', val);
    });

    const ambSlider = document.getElementById('pauseAmbienceVol') as HTMLInputElement;
    ambSlider?.addEventListener('input', () => {
      const val = parseFloat(ambSlider.value);
      ProceduralAudio.setAmbienceVolume(val);
      SettingsStore.set('ambienceVolume', val);
    });

    const kopuzSlider = document.getElementById('pauseKopuzVol') as HTMLInputElement;
    kopuzSlider?.addEventListener('input', () => {
      const val = parseFloat(kopuzSlider.value);
      SettingsStore.set('kopuzVolume', val);
    });

    // 4. Erişilebilirlik
    const subSizeSelect = document.getElementById('settingSubtitleSize') as HTMLSelectElement;
    subSizeSelect?.addEventListener('change', () => {
      SettingsStore.set('subtitleSize', subSizeSelect.value as any);
    });

    const colorblindCb = document.getElementById('settingColorblind') as HTMLInputElement;
    colorblindCb?.addEventListener('change', () => {
      SettingsStore.set('colorblindMode', colorblindCb.checked);
    });

    const assistLockCb = document.getElementById('settingAssistAutoLock') as HTMLInputElement;
    assistLockCb?.addEventListener('change', () => {
      SettingsStore.set('assistAutoLock', assistLockCb.checked);
    });

    const assistParryCb = document.getElementById('settingAssistWideParry') as HTMLInputElement;
    assistParryCb?.addEventListener('change', () => {
      SettingsStore.set('assistWideParry', assistParryCb.checked);
    });

    // 5. Dil
    const langSelect = document.getElementById('settingLanguage') as HTMLSelectElement;
    langSelect?.addEventListener('change', () => {
      SettingsStore.set('language', langSelect.value as any);
    });

    // 6. Kayıt Butonları (Save Slots)
    const saveSys = SaveSystem.getInstance();

    this.settingsContainer.querySelectorAll('.btn-slot-save').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = (btn as HTMLElement).dataset.slot;
        if (slot) {
          saveSys.saveGame(slot, 'Ötüken Obası');
          ProceduralAudio.playButtonClick();
          this.renderSettingsAndSaves();
        }
      });
    });

    this.settingsContainer.querySelectorAll('.btn-slot-load').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slot = (btn as HTMLElement).dataset.slot;
        if (slot) {
          const data = await saveSys.loadGame(slot);
          if (data) {
            EventBus.emit('save:load_request', { slotId: slot });
            EventBus.emit('ui:loot_toast', { text: `💾 ${data.metadata.slotNameTr} Yükleniyor...` });
            this.close();
          }
        }
      });
    });

    this.settingsContainer.querySelectorAll('.btn-slot-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slot = (btn as HTMLElement).dataset.slot;
        if (slot) {
          await saveSys.deleteSlot(slot);
          ProceduralAudio.playButtonClick();
          this.renderSettingsAndSaves();
        }
      });
    });
  }
}
