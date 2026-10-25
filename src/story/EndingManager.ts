/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Oyun Sonu Yöneticisi: DENGE ve YIKIM Sonları, Kredi Ekranı & Yeni Oyun+ (EndingManager)
 * (Denge Sonu: Kut Ezgisi Mini Oyunu, Bay Terek 4. Seviye Uyanışı, Erlik'in Yeraltına Mührü;
 *  Yıkım Sonu: Buruk Son & Son Seçime Geri Dönüş;
 *  Yeni Oyun+ [Eşyalar Korunur, Düşmanlar Güçlenir], Saf DOM Kredi Ekranı & Sıfır GC)
 */

import { Scene, Vector3, Matrix } from '@babylonjs/core';
import { KamPowerManager } from '../powers/KamPowerManager';
import { InventoryManager } from '../inventory/InventoryManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export type EndingType = 'DENGE' | 'YIKIM';

export class EndingManager {
  private static instance: EndingManager | null = null;
  public scene: Scene;

  // Aktif Son ve Durumlar
  public selectedEnding: EndingType | null = null;
  public isCreditsRunning = false;
  public isFreeRoamActive = false;
  public isNewGamePlus = false;

  // Kut Ezgisi Mini Oyunu Notaları (Denge Sonu)
  public kutEzgisiStep = 0;
  public readonly KUT_EZGISI_TARGET = 4; // 4 kutsal nota

  // DOM Kredi ve Arayüz Referansları
  private creditsOverlay: HTMLElement | null = null;
  private fateChoiceModal: HTMLElement | null = null;

  public static getInstance(scene?: Scene): EndingManager {
    if (!EndingManager.instance && scene) {
      EndingManager.instance = new EndingManager(scene);
    }
    return EndingManager.instance!;
  }

  constructor(scene: Scene) {
    this.scene = scene;
    EndingManager.instance = this;

    this.createDomElements();

    EventBus.on('ending:balance', () => {
      this.triggerDengeEnding();
    });

    EventBus.on('ending:ruin', () => {
      this.triggerYikimEnding();
    });
  }

  private createDomElements(): void {
    // 1. Kredi Ekranı DOM Kapsayıcısı
    if (!document.getElementById('creditsOverlay')) {
      const credits = document.createElement('div');
      credits.id = 'creditsOverlay';
      credits.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(180deg, rgba(2, 6, 23, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
        color: #f8fafc;
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        font-family: 'Cinzel', serif;
        z-index: 100;
        overflow: hidden;
        pointer-events: auto;
      `;
      credits.innerHTML = `
        <div id="creditsScroll" style="animation: scrollCredits 28s linear forwards; display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 40px 20px;">
          <h1 style="color: #fde047; font-size: 32px; letter-spacing: 4px; margin: 0;">ÖTÜKEN: KUT'UN DÖRT PARÇASI</h1>
          <p style="color: #38bdf8; font-size: 16px; letter-spacing: 2px;">TÜRK MİTOLOJİSİ AÇIK DÜNYA AKSİYON MACERASI</p>
          <div style="width: 120px; height: 2px; background: #e2e8f0; opacity: 0.4;"></div>
          <p style="font-size: 14px; max-width: 600px; line-height: 1.8; color: #cbd5e1;">
            "Gök Tengri kut verdi, yer-su ruhları uyandı.<br>
            Ateş harlanıp demir dağları eritti,<br>
            Şahmaran gölünde zehir berrak pınarlara döndü.<br>
            Altay zirvesinde Umay Ana’nın merhameti ve adaletiyle,<br>
            Bay Terek ulu dallarını sonsuzluğa uzattı."
          </p>
          <div style="margin-top: 30px; display: flex; flex-direction: column; gap: 12px;">
            <span style="color: #fde047; font-weight: bold; font-size: 16px;">YAPIM & GELİŞTİRME</span>
            <span style="font-size: 13px;">Google DeepMind Antigravity Ekibi & Geliştirici</span>
            <span style="color: #fde047; font-weight: bold; font-size: 16px; margin-top: 15px;">MÜZİK & SES TASARIMI</span>
            <span style="font-size: 13px;">Web Audio API Prosedürel Kopuz & Kam Davulu</span>
            <span style="color: #fde047; font-weight: bold; font-size: 16px; margin-top: 15px;">GRAFİK & MOTOR</span>
            <span style="font-size: 13px;">Babylon.js 7.x Saf WebGL2 3D Motoru</span>
          </div>
          <div style="margin-top: 40px; display: flex; gap: 16px;">
            <button id="btnFreeRoam" style="padding: 10px 24px; background: rgba(56, 189, 248, 0.25); border: 2px solid #38bdf8; color: #fff; font-family: 'Cinzel', serif; font-weight: bold; border-radius: 8px; cursor: pointer;">SERBEST DOLAŞIM</button>
            <button id="btnNewGamePlus" style="padding: 10px 24px; background: rgba(234, 179, 8, 0.25); border: 2px solid #facc15; color: #fff; font-family: 'Cinzel', serif; font-weight: bold; border-radius: 8px; cursor: pointer;">YENİ OYUN+ (NG+)</button>
          </div>
        </div>
      `;
      document.body.appendChild(credits);
      this.creditsOverlay = credits;

      // Buton Dinleyicileri
      document.getElementById('btnFreeRoam')?.addEventListener('click', () => this.startFreeRoam());
      document.getElementById('btnNewGamePlus')?.addEventListener('click', () => this.startNewGamePlus());
    }

    // 2. Yıkım Sonu "Kaderi Değiştir" Modalı
    if (!document.getElementById('yikimFateModal')) {
      const modal = document.createElement('div');
      modal.id = 'yikimFateModal';
      modal.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 24px 32px;
        color: #f8fafc;
        display: none;
        flex-direction: column;
        align-items: center;
        text-align: center;
        font-family: 'Cinzel', serif;
        z-index: 95;
      `;
      modal.innerHTML = `
        <h2 style="color: #f87171; margin-top: 0;">⚠️ YIKIM SONU: DENGELER SARSILDI</h2>
        <p style="font-size: 13px; color: #cbd5e1; max-width: 440px; line-height: 1.6;">
          Erlik Han tamamen yok edildi ancak evrenin zıtlık dengesi çöktü. Kara Kış dindi fakat Hayat Ağacı Bay Terek meyvesiz ve yapraksız donuk kaldı.
        </p>
        <button id="btnChangeFate" style="margin-top: 15px; padding: 8px 20px; background: rgba(239, 68, 68, 0.3); border: 1.5px solid #ef4444; color: #fff; border-radius: 6px; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer;">
          KADERİ DEĞİŞTİR (SON SEÇİME DÖN)
        </button>
      `;
      document.body.appendChild(modal);
      this.fateChoiceModal = modal;

      document.getElementById('btnChangeFate')?.addEventListener('click', () => this.revertToFinalChoice());
    }
  }

  /**
   * Ayaz'ın Nihai Seçimi: DENGE mi, YIKIM mı?
   */
  public makeEndingChoice(choice: EndingType): void {
    this.selectedEnding = choice;

    if (choice === 'DENGE') {
      this.triggerDengeEnding();
    } else {
      this.triggerYikimEnding();
    }
  }

  /**
   * 1. DENGE SONU (Gerçek Mitolojik Son)
   */
  public triggerDengeEnding(): void {
    ProceduralAudio.playShrineSolvedFanfare();
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Ulu Kam Korkut Ata',
      text: 'Evlat... Erlik Han’ı yok etmek değil, yerine mühürleyip yer ile göğün dengesini kurmak kutlu kam yoludur. Şimdi 4 Kut parçasını Bay Terek’in köklerine sun ve kutsal Kut Ezgisi’ni çal!'
    });

    // Kut Ezgisi Notalarını Çal
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        ProceduralAudio.playKutEzgisiNote(i);
        this.kutEzgisiStep++;
      }, i * 700);
    }

    // 4. Aşama Bay Terek Tam Dirilişi
    setTimeout(() => {
      EventBus.emit('world:bay_terek_healed', { stage: 4 });
      EventBus.emit('ui:loot_toast', {
        text: '🌳 BAY TEREK 4. SEVİYE TAM UYANIŞI! Ötüken bahara kavuştu.'
      });
      EventBus.emit('achievement:unlock', { id: 'ach_denge_sonu' });
      this.showCreditsScreen();
    }, 3200);
  }

  /**
   * 2. YIKIM SONU (Buruk Son)
   */
  public triggerYikimEnding(): void {
    ProceduralAudio.playCrit();
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Erlik Han',
      text: 'Beni yok ettin gök yüzlü Ayaz... Ama karanlık olmadan ışık, kış olmadan bahar var olamaz... Ağacın kökleri kuruyacak...'
    });

    EventBus.emit('achievement:unlock', { id: 'ach_yikim_sonu' });

    setTimeout(() => {
      if (this.fateChoiceModal) {
        this.fateChoiceModal.style.display = 'flex';
      }
    }, 2500);
  }

  /**
   * Yıkım Sonundan Seçim Anına Geri Dönüş
   */
  public revertToFinalChoice(): void {
    if (this.fateChoiceModal) {
      this.fateChoiceModal.style.display = 'none';
    }
    this.selectedEnding = null;
    ProceduralAudio.playTimeShatter();
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Zamanın Ruhu',
      text: 'Kut Zamanı geriye aktı... Şimdi kaderini yeniden belirle.'
    });
    EventBus.emit('dialogue:start', { startNodeId: 'erlik_final_choice' });
  }

  /**
   * Epik Kredi Ekranını Başlat
   */
  public showCreditsScreen(): void {
    this.isCreditsRunning = true;
    if (this.creditsOverlay) {
      this.creditsOverlay.style.display = 'flex';
    }
    ProceduralAudio.playKutAcquired();
  }

  /**
   * Serbest Dolaşım Modu (Kalan mabet ve balbalları toplama)
   */
  public startFreeRoam(): void {
    this.isCreditsRunning = false;
    this.isFreeRoamActive = true;
    if (this.creditsOverlay) {
      this.creditsOverlay.style.display = 'none';
    }
    EventBus.emit('ui:loot_toast', {
      text: '🏹 SERBEST DOLAŞIM: Kalan Kam Taşlarını, Balbalları ve gizemleri keşfet!'
    });
  }

  /**
   * Yeni Oyun+ (New Game+) Başlatımı
   */
  public startNewGamePlus(): void {
    this.isCreditsRunning = false;
    this.isNewGamePlus = true;
    if (this.creditsOverlay) {
      this.creditsOverlay.style.display = 'none';
    }

    ProceduralAudio.playKutRecharge();
    EventBus.emit('ui:loot_toast', {
      text: '🔥 YENİ OYUN+ (NG+) BAŞLADI! Düşmanlar %80 daha güçlü, tüm eşyaların korundu.'
    });

    // Oyuncuyu Ötüken Obası merkezine taşı
    EventBus.emit('player:teleport', { x: 0, y: 3.5, z: 0 });
  }

  public dispose(): void {
    if (this.creditsOverlay) this.creditsOverlay.remove();
    if (this.fateChoiceModal) this.fateChoiceModal.remove();
  }
}
