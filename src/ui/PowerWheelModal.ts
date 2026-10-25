/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kam Güç Çarkı Modalı (PowerWheelModal)
 * (Düğmeyi basılı tut → zaman yavaşlar [%15 hız], 3 radyal güç [Ateş, Rüzgâr, Kut Zamanı],
 *  Bırakınca seçilir, Dış halka 4 Kut Parçasıyla [Yer, Ateş, Su, Gök] dolar, Saf DOM & Sıfır GC)
 */

import { KamPowerManager, KamPowerType } from '../powers/KamPowerManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export class PowerWheelModal {
  private container: HTMLElement | null;
  private kamManager: KamPowerManager;
  public isOpen = false;

  // Çark Dilimleri
  private slotFire: HTMLElement | null = null;
  private slotWind: HTMLElement | null = null;
  private slotKutTime: HTMLElement | null = null;

  // Dış Halka Kut Parçaları (Yer, Ateş, Su, Gök)
  private ringYer: HTMLElement | null = null;
  private ringAtes: HTMLElement | null = null;
  private ringSu: HTMLElement | null = null;
  private ringGok: HTMLElement | null = null;

  // Zaman Yavaşlama Kontrolü
  private onTimeScaleChange: (scale: number) => void;

  // Geçici seçili güç
  private hoveredPower: KamPowerType = 'FIRE';

  constructor(kamManager: KamPowerManager, onTimeScaleChange: (scale: number) => void) {
    this.kamManager = kamManager;
    this.onTimeScaleChange = onTimeScaleChange;

    this.container = document.getElementById('powerWheelOverlay');
    this.slotFire = document.getElementById('wheelSlotFire');
    this.slotWind = document.getElementById('wheelSlotWind');
    this.slotKutTime = document.getElementById('wheelSlotKutTime');

    this.ringYer = document.getElementById('ringPieceYer');
    this.ringAtes = document.getElementById('ringPieceAtes');
    this.ringSu = document.getElementById('ringPieceSu');
    this.ringGok = document.getElementById('ringPieceGok');

    this.setupEvents();
  }

  private setupEvents(): void {
    if (!this.container) return;

    const selectSlot = (power: KamPowerType) => {
      this.hoveredPower = power;
      this.highlightSlot(power);
      ProceduralAudio.playButtonClick();
    };

    if (this.slotFire) {
      this.slotFire.addEventListener('pointerenter', () => selectSlot('FIRE'));
      this.slotFire.addEventListener('pointerdown', () => selectSlot('FIRE'));
    }

    if (this.slotWind) {
      this.slotWind.addEventListener('pointerenter', () => selectSlot('WIND'));
      this.slotWind.addEventListener('pointerdown', () => selectSlot('WIND'));
    }

    if (this.slotKutTime) {
      this.slotKutTime.addEventListener('pointerenter', () => selectSlot('KUT_TIME'));
      this.slotKutTime.addEventListener('pointerdown', () => selectSlot('KUT_TIME'));
    }

    // Mobil dokunmatik sürükleme takibi (Touch Move angle calculation)
    this.container.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isOpen || !this.container) return;
      const rect = this.container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > 35) {
        // Açıya göre dilim seç (120'şer derece)
        let angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 ile +180
        if (angle < 0) angle += 360;

        if (angle >= 30 && angle < 150) {
          // Alt kısım: Kut Zamanı
          selectSlot('KUT_TIME');
        } else if (angle >= 150 && angle < 270) {
          // Sol / Üst-Sol: Ateş
          selectSlot('FIRE');
        } else {
          // Sağ / Üst-Sağ: Rüzgâr
          selectSlot('WIND');
        }
      }
    });

    // Parmak veya tık bırakıldığında çarkı kapat ve gücü onayla
    window.addEventListener('pointerup', () => {
      if (this.isOpen) {
        this.closeWheel();
      }
    });
  }

  public openWheel(): void {
    if (this.isOpen || !this.container) return;
    this.isOpen = true;
    this.hoveredPower = this.kamManager.activePower;

    // Zamanı %15'e yavaşlat (Bullet-time slow motion)
    this.onTimeScaleChange(0.15);
    ProceduralAudio.playKutZamaniEnter();

    // Dış halka kut parçalarının güncellenmesi
    this.updateKutPiecesGlow();

    this.container.classList.add('active');
    this.highlightSlot(this.hoveredPower);
  }

  public closeWheel(): void {
    if (!this.isOpen || !this.container) return;
    this.isOpen = false;

    // Seçilen gücü etkinleştir
    this.kamManager.selectPower(this.hoveredPower);

    // Zamanı normale döndür
    this.onTimeScaleChange(1.0);
    ProceduralAudio.playKutZamaniExit();

    this.container.classList.remove('active');
  }

  private highlightSlot(power: KamPowerType): void {
    const slots = [
      { el: this.slotFire, type: 'FIRE' },
      { el: this.slotWind, type: 'WIND' },
      { el: this.slotKutTime, type: 'KUT_TIME' }
    ];

    slots.forEach((s) => {
      if (s.el) {
        if (s.type === power) {
          s.el.classList.add('selected');
        } else {
          s.el.classList.remove('selected');
        }
      }
    });
  }

  private updateKutPiecesGlow(): void {
    if (this.ringYer) {
      if (this.kamManager.hasYerKutu) this.ringYer.classList.add('unlocked');
      else this.ringYer.classList.remove('unlocked');
    }
    if (this.ringAtes) {
      if (this.kamManager.hasAtesKutu) this.ringAtes.classList.add('unlocked');
      else this.ringAtes.classList.remove('unlocked');
    }
    if (this.ringSu) {
      if (this.kamManager.hasSuKutu) this.ringSu.classList.add('unlocked');
      else this.ringSu.classList.remove('unlocked');
    }
    if (this.ringGok) {
      if (this.kamManager.hasGokKutu) this.ringGok.classList.add('unlocked');
      else this.ringGok.classList.remove('unlocked');
    }
  }
}
