/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * 5 Telli Pentatonik Kopuz Çalma Modalı (KopuzModal)
 * (KURAL 4 UYUMLU: Yatay Ekranda 5 Telli Dokunmatik Pentatonik Pad, Canlı Titreşen Teller,
 *  Son Çalınan Nota Şeridi, Ezgi Eşleşme Bildirimi & Kapat Butonu)
 */

import { KopuzSystem, PentatonicNote } from '../powers/KopuzSystem';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { MountSystem } from '../mount/MountSystem';
import { SkySystem } from '../world/SkySystem';
import { WeatherSystem } from '../world/WeatherSystem';
import { BoruCompanion } from '../player/BoruCompanion';
import { ProceduralAudio } from '../audio/ProceduralAudio';

export class KopuzModal {
  private modal: HTMLElement | null;
  private btnClose: HTMLElement | null;
  private notesRibbon: HTMLElement | null;
  private stringBtns: NodeListOf<HTMLElement>;
  private melodyMatchesList: HTMLElement | null;

  private kopuzSystem: KopuzSystem;
  private player: PlayerController;
  private combat: CombatSystem;
  private kamPower: KamPowerManager;
  private mountSystem: MountSystem;
  public sky: SkySystem | null = null;
  public weather: WeatherSystem | null = null;
  public boru: BoruCompanion | null = null;

  public isOpen = false;

  constructor(
    kopuzSystem: KopuzSystem,
    player: PlayerController,
    combat: CombatSystem,
    kamPower: KamPowerManager,
    mountSystem: MountSystem
  ) {
    this.kopuzSystem = kopuzSystem;
    this.player = player;
    this.combat = combat;
    this.kamPower = kamPower;
    this.mountSystem = mountSystem;

    this.modal = document.getElementById('kopuzModal');
    this.btnClose = document.getElementById('btnCloseKopuzModal');
    this.notesRibbon = document.getElementById('kopuzNotesRibbon');
    this.stringBtns = document.querySelectorAll('.kopuz-string-fret');
    this.melodyMatchesList = document.getElementById('kopuzMelodyCheatsheet');

    this.setupEvents();
  }

  private setupEvents(): void {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    this.stringBtns.forEach((btn) => {
      const note = btn.getAttribute('data-note') as PentatonicNote;
      if (!note) return;

      const triggerPluck = (e: Event) => {
        e.preventDefault();
        btn.classList.add('plucking');
        setTimeout(() => btn.classList.remove('plucking'), 200);

        const matched = this.kopuzSystem.playNote(
          note,
          this.player,
          this.combat,
          this.kamPower,
          this.mountSystem,
          this.sky || undefined,
          this.weather || undefined,
          this.boru || undefined
        );

        this.updateNotesRibbon();

        if (matched) {
          this.flashMelodySuccess(matched.nameTr);
        }
      };

      btn.addEventListener('pointerdown', triggerPluck);
    });
  }

  private updateNotesRibbon(): void {
    if (!this.notesRibbon) return;
    const notes = this.kopuzSystem.playedNotesBuffer;
    if (notes.length === 0) {
      this.notesRibbon.innerHTML = '<span style="color: #64748b;">(Bir tele dokunarak çalmaya başla)</span>';
      return;
    }

    this.notesRibbon.innerHTML = notes
      .map((n) => `<span class="kopuz-note-pill">${n}</span>`)
      .join(' ');
  }

  private flashMelodySuccess(melodyName: string): void {
    if (!this.notesRibbon) return;
    this.notesRibbon.innerHTML = `<span class="kopuz-match-banner">🌟 ${melodyName.toUpperCase()} ÇALINDI! 🌟</span>`;
  }

  public open(): void {
    if (this.isOpen || !this.modal) return;
    this.isOpen = true;
    this.modal.classList.add('active');
    this.updateNotesRibbon();
    ProceduralAudio.playButtonClick();
  }

  public close(): void {
    if (!this.isOpen || !this.modal) return;
    this.isOpen = false;
    this.modal.classList.remove('active');
    ProceduralAudio.playButtonClick();
  }
}
