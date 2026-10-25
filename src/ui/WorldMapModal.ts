/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * İki Sütunlu Kadim Dünya Haritası ve Hızlı Yolculuk Modalı (WorldMapModal)
 * (1024x1024m Ölçekli Stilize Harita, 4 Biyom, Bengü Taş Hızlı Yolculuk,
 *  İşaretçi Seçimi, Canlı Oyuncu Radarı, Görev Özeti & Sıfır GC)
 */

import { Vector3 } from '@babylonjs/core';
import { WorldManager } from '../world/WorldManager';
import { LandmarkManager, BenguTasData } from '../world/LandmarkManager';
import { EnemyCampManager } from '../world/EnemyCampManager';
import { NPCManager } from '../world/NPCManager';
import { QuestManager } from '../story/QuestManager';
import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';

export interface MapLandmarkInfo {
  id: string;
  name: string;
  type: 'BAY_TEREK' | 'BENGU_TAS' | 'CAMP' | 'BOSS' | 'TRAINING' | 'NPC';
  biome: string;
  worldX: number;
  worldZ: number;
  icon: string;
  color: string;
  loreTr: string;
  isFastTravelPoint: boolean;
  benguId?: string;
  isDiscovered: boolean;
}

export class WorldMapModal {
  private modalContainer: HTMLElement | null;
  private mapCanvas: HTMLElement | null;
  private playerPin: HTMLElement | null;
  private pinsContainer: HTMLElement | null;
  private detailsContainer: HTMLElement | null;
  private closeBtn: HTMLElement | null;

  public isOpen = false;

  private landmarks: MapLandmarkInfo[] = [];
  private selectedLandmark: MapLandmarkInfo | null = null;

  constructor(
    private world: WorldManager,
    private landmarkMgr: LandmarkManager,
    private campMgr: EnemyCampManager,
    private npcMgr: NPCManager
  ) {
    this.modalContainer = document.getElementById('worldMapModal');
    this.mapCanvas = document.getElementById('worldMapCanvas');
    this.playerPin = document.getElementById('worldMapPlayerPin');
    this.pinsContainer = document.getElementById('worldMapPinsContainer');
    this.detailsContainer = document.getElementById('worldMapDetails');
    this.closeBtn = document.getElementById('closeWorldMapModal');

    this.initLandmarks();
    this.setupListeners();
  }

  private initLandmarks(): void {
    this.landmarks = [
      // 1. Bay Terek (Hayat Ağacı)
      {
        id: 'lm_bay_terek',
        name: 'Bay Terek (Ulu Hayat Ağacı)',
        type: 'BAY_TEREK',
        biome: 'Yer-Sub Ormanı',
        worldX: 0,
        worldZ: 28,
        icon: '🌳',
        color: '#4ade80',
        loreTr: 'Dokuz budaklı kutlu ağaç; kökleri yer altını, gövdesi yeri, doruğu Gök Tengri katını birleştirir. Kut parçaları toplandıkça dalları yeşerir.',
        isFastTravelPoint: false,
        isDiscovered: true
      },
      // 2. Tepegöz Arenası
      {
        id: 'lm_tepegoz',
        name: 'Tepegöz Mağarası & Amfiteatrı',
        type: 'BOSS',
        biome: 'Yer-Sub Ormanı (Güney Vadisi)',
        worldX: 0,
        worldZ: -135,
        icon: '👁️',
        color: '#f87171',
        loreTr: 'Dede Korkut destanlarının korkunç tek gözlü devi. Yer Kutu relikini korur; zayıf noktası ancak bir ok isabetiyle açılan devasa gözüdür.',
        isFastTravelPoint: false,
        isDiscovered: true
      },
      // 3. Antrenman Sahası
      {
        id: 'lm_training',
        name: 'Kam Antrenman Sahası',
        type: 'TRAINING',
        biome: 'Yer-Sub Batı Platosu',
        worldX: -32,
        worldZ: 4,
        icon: '🎯',
        color: '#facc15',
        loreTr: 'Kılıç, balta, kargı talimleri, 14m tırmanma kulesi, süzülme rampası, gizlilik otları ve ok yenileme tezgahının bulunduğu hazırlık alanı.',
        isFastTravelPoint: false,
        isDiscovered: true
      }
    ];

    // 4 Bengü Taş
    this.landmarkMgr.benguTaslar.forEach((b: BenguTasData) => {
      this.landmarks.push({
        id: `lm_${b.id}`,
        name: b.name,
        type: 'BENGU_TAS',
        biome: b.biome,
        worldX: b.position.x,
        worldZ: b.position.z,
        icon: '🗿',
        color: '#38bdf8',
        loreTr: 'Gök Tengri’nin ebedî runik yazıtı. Yakınına gidildiğinde uyanır ve kadim ruhani enerjiyle anında Hızlı Yolculuk yapmanı sağlar.',
        isFastTravelPoint: true,
        benguId: b.id,
        isDiscovered: b.discovered
      });
    });

    // Düşman Karakolları
    this.campMgr.camps.forEach((c) => {
      this.landmarks.push({
        id: `lm_${c.id}`,
        name: c.name,
        type: 'CAMP',
        biome: c.center.x > 0 ? 'Demir Dağ' : 'Yer-Sub',
        worldX: c.center.x,
        worldZ: c.center.z,
        icon: '💀',
        color: '#ef4444',
        loreTr: 'Erlik Han’ın körmözleri tarafından kurulan kirlenmiş karakol. Ortasındaki Kara Totem yok edilene dek Kut Gücü yenilenmesini engeller.',
        isFastTravelPoint: false,
        isDiscovered: true
      });
    });

    // NPC'ler (Ötüken Obası)
    this.npcMgr.npcs.forEach((n) => {
      this.landmarks.push({
        id: `lm_${n.id}`,
        name: `${n.name} (${n.title})`,
        type: 'NPC',
        biome: 'Ötüken Obası',
        worldX: n.position.x,
        worldZ: n.position.z,
        icon: '👤',
        color: '#fde047',
        loreTr: 'Ötüken Obası sakini. Kadim efsaneleri anlatır, yeni görevler verir ve cephaneni yeniler.',
        isFastTravelPoint: false,
        isDiscovered: true
      });
    });

    // Varsayılan seçim Bay Terek
    this.selectedLandmark = this.landmarks[0];
  }

  private setupListeners(): void {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Modal dışına veya ESC basılınca kapat
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        if (this.isOpen) {
          this.close();
        } else {
          this.open();
        }
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    EventBus.on('map:open', () => {
      this.open();
    });

    EventBus.on('map:close', () => {
      this.close();
    });

    EventBus.on('world:landmark_discovered', (data: { id: string; name: string }) => {
      const found = this.landmarks.find((l) => l.benguId === data.id);
      if (found) {
        found.isDiscovered = true;
        if (this.isOpen) {
          this.renderPins();
          this.renderDetails();
        }
      }
    });
  }

  public open(): void {
    if (!this.modalContainer) return;
    this.isOpen = true;
    this.modalContainer.classList.add('active');
    ProceduralAudio.playButtonClick();

    // Bengü taş keşif durumlarını senkronize et
    this.landmarkMgr.benguTaslar.forEach((b) => {
      const lm = this.landmarks.find((l) => l.benguId === b.id);
      if (lm) {
        lm.isDiscovered = b.discovered;
      }
    });

    this.renderPins();
    this.renderDetails();
  }

  public close(): void {
    if (!this.modalContainer) return;
    this.isOpen = false;
    this.modalContainer.classList.remove('active');
    ProceduralAudio.playButtonClick();
  }

  /**
   * 1024x1024m dünyadan harita yüzdesine dönüştürme (Sıfır GC)
   */
  private worldToPercent(x: number, z: number): { leftPct: number; topPct: number } {
    // x: -512 -> 0%, +512 -> 100%
    const leftPct = ((x + 512) / 1024) * 100;
    // z: +512 (Kuzey) -> 0%, -512 (Güney) -> 100%
    const topPct = ((512 - z) / 1024) * 100;
    return {
      leftPct: Math.max(2, Math.min(98, leftPct)),
      topPct: Math.max(2, Math.min(98, topPct))
    };
  }

  public updatePlayer(playerPos: Vector3, playerHeading: number): void {
    if (!this.isOpen || !this.playerPin) return;

    const { leftPct, topPct } = this.worldToPercent(playerPos.x, playerPos.z);
    this.playerPin.style.left = `${leftPct.toFixed(2)}%`;
    this.playerPin.style.top = `${topPct.toFixed(2)}%`;

    const deg = (playerHeading * 180) / Math.PI;
    const arrow = this.playerPin.querySelector('.world-map-player-arrow') as HTMLElement;
    if (arrow) {
      arrow.style.transform = `rotate(${deg}deg)`;
    }
  }

  private renderPins(): void {
    if (!this.pinsContainer) return;

    let html = '';
    this.landmarks.forEach((lm) => {
      const { leftPct, topPct } = this.worldToPercent(lm.worldX, lm.worldZ);
      const isSelected = this.selectedLandmark?.id === lm.id;
      const discoveredClass = lm.isFastTravelPoint && !lm.isDiscovered ? 'undiscovered' : 'discovered';

      html += `
        <div class="world-map-pin ${isSelected ? 'selected' : ''} ${discoveredClass}"
             data-id="${lm.id}"
             style="left: ${leftPct.toFixed(2)}%; top: ${topPct.toFixed(2)}%;"
             title="${lm.name}">
          <span class="pin-icon">${lm.icon}</span>
          <span class="pin-badge" style="color: ${lm.color};">${lm.name.split(' ')[0]}</span>
        </div>
      `;
    });

    this.pinsContainer.innerHTML = html;

    // Pin tıklama dinleyicileri
    const pinEls = this.pinsContainer.querySelectorAll('.world-map-pin');
    pinEls.forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.id;
        const found = this.landmarks.find((l) => l.id === id);
        if (found) {
          this.selectLandmark(found);
        }
      });
    });
  }

  public selectLandmark(landmark: MapLandmarkInfo): void {
    this.selectedLandmark = landmark;
    ProceduralAudio.playButtonClick();
    this.renderPins();
    this.renderDetails();
  }

  private renderDetails(): void {
    if (!this.detailsContainer) return;

    const lm = this.selectedLandmark || this.landmarks[0];
    const questMgr = QuestManager.getInstance();
    const activeQuest = questMgr.getActiveQuest();

    const isBenguDiscovered = lm.isFastTravelPoint && lm.isDiscovered;
    const isBenguLocked = lm.isFastTravelPoint && !lm.isDiscovered;

    let fastTravelBtnHtml = '';
    if (lm.isFastTravelPoint) {
      if (isBenguDiscovered) {
        fastTravelBtnHtml = `
          <button class="map-fast-travel-btn active" id="btnMapFastTravel">
            ⚡ BU BENGÜ TAŞA HIZLI YOLCULUK YAP
          </button>
        `;
      } else {
        fastTravelBtnHtml = `
          <button class="map-fast-travel-btn disabled" disabled title="Önce bölgeye giderek taşı uyandırmalısın">
            🔒 KİLİTLİ (Önce Keşfet)
          </button>
        `;
      }
    }

    let questHtml = '';
    if (activeQuest) {
      const curObj = activeQuest.objectives.find((o) => !o.isDone) || activeQuest.objectives[0];
      const curCount = curObj ? curObj.currentCount : 0;
      const targetCount = curObj ? curObj.targetCount : 1;
      const pct = Math.round((curCount / targetCount) * 100);

      questHtml = `
        <div class="map-quest-card">
          <div class="map-quest-header">
            <span class="badge-${activeQuest.type.toLowerCase()}">${activeQuest.type === 'MAIN' ? '★ ANA GÖREV' : '◇ YAN GÖREV'}</span>
            <span class="map-quest-title">${activeQuest.titleTr}</span>
          </div>
          <div class="map-quest-obj">🎯 ${curObj ? curObj.descriptionTr : activeQuest.descriptionTr}</div>
          <div class="map-quest-progress-bar">
            <div class="map-quest-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="map-quest-footer">
            <span>İlerleme: ${curCount} / ${targetCount}</span>
            <span style="color: #facc15;">Ödül: ${activeQuest.rewardTr}</span>
          </div>
        </div>
      `;
    }

    this.detailsContainer.innerHTML = `
      <div class="map-detail-card">
        <div class="map-detail-top">
          <span class="map-detail-icon">${lm.icon}</span>
          <div>
            <h3 class="map-detail-title" style="color: ${lm.color};">${lm.name}</h3>
            <span class="map-detail-biome">Biyom: ${lm.biome}</span>
          </div>
        </div>

        <p class="map-detail-lore">${lm.loreTr}</p>

        <div class="map-coords-row">
          <span>Konum: [X: ${Math.round(lm.worldX)}, Z: ${Math.round(lm.worldZ)}]</span>
          <span>${lm.isFastTravelPoint ? (isBenguDiscovered ? '🟢 Aktif Anıt' : '🔴 Henüz Uyanmadı') : '📍 Sabit Anıt'}</span>
        </div>

        ${fastTravelBtnHtml}
      </div>

      <div class="map-section-title">GÜNCEL GÖREV TAKİBİ</div>
      ${questHtml}

      <div class="map-journal-list">
        <div class="map-section-title">GÖREV GÜNLÜĞÜ ÖZETİ</div>
        ${questMgr.quests
          .map(
            (q) => {
              const obj = q.objectives.find((o) => !o.isDone) || q.objectives[0];
              const progressStr = obj ? `${obj.currentCount}/${obj.targetCount}` : 'Aktif';
              return `
              <div class="journal-item ${q.state.toLowerCase()}">
                <span class="journal-state-icon">${q.state === 'COMPLETED' ? '✓' : q.state === 'ACTIVE' ? '▶' : '🔒'}</span>
                <span class="journal-name">${q.titleTr}</span>
                <span class="journal-status">${q.state === 'COMPLETED' ? 'Tamamlandı' : q.state === 'ACTIVE' ? progressStr : 'Kilitli'}</span>
              </div>
            `;
            }
          )
          .join('')}
      </div>
    `;

    // Hızlı Yolculuk Buton Bağlantısı
    const ftBtn = document.getElementById('btnMapFastTravel');
    if (ftBtn && lm.benguId) {
      ftBtn.addEventListener('click', () => {
        ProceduralAudio.playButtonClick();
        EventBus.emit('fast_travel:request', { benguId: lm.benguId! });
        this.close();
      });
    }
  }
}
