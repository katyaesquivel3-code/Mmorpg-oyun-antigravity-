/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kut Kalbi Seçim Modalı (KutHeartModal)
 * (4 Kam Taşı = 1 Kut Kalbi: Can [+25 HP] veya Kut Gücü [+25 KP] Artışı Seçimi)
 */

import { KamPowerManager } from '../powers/KamPowerManager';
import { CombatSystem } from '../combat/CombatSystem';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export class KutHeartModal {
  private modal: HTMLElement | null;
  private btnHealth: HTMLElement | null;
  private btnKutPower: HTMLElement | null;
  private kamManager: KamPowerManager;
  private combat: CombatSystem;
  public isOpen = false;

  constructor(kamManager: KamPowerManager, combat: CombatSystem) {
    this.kamManager = kamManager;
    this.combat = combat;

    this.modal = document.getElementById('kutHeartModal');
    this.btnHealth = document.getElementById('btnUpgradeHealth');
    this.btnKutPower = document.getElementById('btnUpgradeKutPower');

    this.setupEvents();

    EventBus.on('ui:menu_open', (data) => {
      if (data && data.menuId === 'kut_heart') {
        this.open();
      }
    });
  }

  private setupEvents(): void {
    if (this.btnHealth) {
      this.btnHealth.addEventListener('click', () => {
        this.kamManager.applyKutHeartUpgrade('HEALTH', this.combat);
        this.close();
      });
    }

    if (this.btnKutPower) {
      this.btnKutPower.addEventListener('click', () => {
        this.kamManager.applyKutHeartUpgrade('KUT_POWER', this.combat);
        this.close();
      });
    }
  }

  public open(): void {
    if (this.isOpen || !this.modal) return;
    this.isOpen = true;
    this.modal.classList.add('active');
    ProceduralAudio.playOathFanfare();
  }

  public close(): void {
    if (!this.isOpen || !this.modal) return;
    this.isOpen = false;
    this.modal.classList.remove('active');
    ProceduralAudio.playButtonClick();
  }
}
