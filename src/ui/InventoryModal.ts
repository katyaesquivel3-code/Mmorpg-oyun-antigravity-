/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Envanter ve Teçhizat Menüsü Modalı (InventoryModal)
 * (Yatay İki Panel: Solda Kategori Sekmeleri + Izgara, Sağda İstatistikler, Döndürülebilir 3D Önizleme,
 *  Kuşanma, Yemek Pişirme & Demirci Yükseltme Entegrasyonu)
 */

import { InventoryManager } from '../inventory/InventoryManager';
import { ItemCategory, InventorySlot, ItemDefinition } from '../inventory/InventoryData';
import { Item3DPreview } from './Item3DPreview';
import { CombatSystem } from '../combat/CombatSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { CookingSystem } from '../crafting/CookingSystem';
import { BlacksmithSystem } from '../crafting/BlacksmithSystem';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export class InventoryModal {
  private modal: HTMLElement | null;
  private btnClose: HTMLElement | null;
  private gridContainer: HTMLElement | null;
  private categoryTabs: NodeListOf<HTMLElement>;

  // Sağ Panel Elemanları
  private itemTitle: HTMLElement | null;
  private itemIcon: HTMLElement | null;
  private itemDesc: HTMLElement | null;
  private itemStats: HTMLElement | null;
  private btnActionEquip: HTMLElement | null;
  private btnActionUse: HTMLElement | null;
  private setBonusNotice: HTMLElement | null;

  // Seçili Durum
  private currentCategory: ItemCategory = 'WEAPON';
  private selectedSlot: InventorySlot | null = null;

  private preview: Item3DPreview;
  private combat: CombatSystem;
  private kamPower: KamPowerManager;
  public isOpen = false;

  constructor(
    preview: Item3DPreview,
    combat: CombatSystem,
    kamPower: KamPowerManager
  ) {
    this.preview = preview;
    this.combat = combat;
    this.kamPower = kamPower;

    this.modal = document.getElementById('inventoryModal');
    this.btnClose = document.getElementById('btnCloseInventory');
    this.gridContainer = document.getElementById('inventoryGrid');
    this.categoryTabs = document.querySelectorAll('.inv-cat-tab');

    this.itemTitle = document.getElementById('invItemTitle');
    this.itemIcon = document.getElementById('invItemIcon');
    this.itemDesc = document.getElementById('invItemDesc');
    this.itemStats = document.getElementById('invItemStats');
    this.btnActionEquip = document.getElementById('btnInvEquip');
    this.btnActionUse = document.getElementById('btnInvUse');
    this.setBonusNotice = document.getElementById('invSetBonus');

    this.setupEvents();
  }

  private setupEvents(): void {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    this.categoryTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const cat = tab.getAttribute('data-cat') as ItemCategory;
        if (cat) {
          this.categoryTabs.forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          this.currentCategory = cat;
          this.renderGrid();
          ProceduralAudio.playButtonClick();
        }
      });
    });

    if (this.btnActionEquip) {
      this.btnActionEquip.addEventListener('click', () => {
        if (this.selectedSlot) {
          InventoryManager.getInstance().equipItem(this.selectedSlot.item.id);
          this.renderGrid();
          this.displayItemDetails(this.selectedSlot);
        }
      });
    }

    if (this.btnActionUse) {
      this.btnActionUse.addEventListener('click', () => {
        if (this.selectedSlot && this.selectedSlot.item.category === 'FOOD') {
          InventoryManager.getInstance().consumeFood(
            this.selectedSlot.item.id,
            this.combat,
            this.kamPower
          );
          this.renderGrid();
          this.selectedSlot = null;
          this.clearItemDetails();
        }
      });
    }

    EventBus.on('inventory:open', () => this.open());
    EventBus.on('inventory:close', () => this.close());
    EventBus.on('inventory:update', () => {
      if (this.isOpen) {
        this.renderGrid();
        if (this.selectedSlot) {
          const fresh = InventoryManager.getInstance().slots.find(
            (s) => s.item.id === this.selectedSlot?.item.id
          );
          if (fresh) this.displayItemDetails(fresh);
        }
      }
    });
  }

  public open(): void {
    if (this.isOpen || !this.modal) return;
    this.isOpen = true;
    this.modal.classList.add('active');
    this.preview.activate();
    this.renderGrid();
    ProceduralAudio.playButtonClick();
  }

  public close(): void {
    if (!this.isOpen || !this.modal) return;
    this.isOpen = false;
    this.modal.classList.remove('active');
    this.preview.deactivate();
    ProceduralAudio.playButtonClick();
  }

  private renderGrid(): void {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    const inv = InventoryManager.getInstance();
    const filteredSlots = inv.getSlotsByCategory(this.currentCategory);

    // 36 Slotluk Izgarayı Doldur
    for (let i = 0; i < inv.MAX_SLOTS; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'inv-slot';

      const slotData = filteredSlots[i];
      if (slotData) {
        slotEl.classList.add('has-item');
        if (slotData.isEquipped) slotEl.classList.add('equipped');
        if (this.selectedSlot && this.selectedSlot.item.id === slotData.item.id) {
          slotEl.classList.add('selected');
        }

        slotEl.innerHTML = `
          <div class="slot-icon">${slotData.item.icon}</div>
          ${slotData.quantity > 1 ? `<div class="slot-qty">${slotData.quantity}</div>` : ''}
          ${slotData.isEquipped ? `<div class="slot-eq-badge">KUŞANILDI</div>` : ''}
        `;

        slotEl.addEventListener('click', () => {
          this.selectedSlot = slotData;
          document.querySelectorAll('.inv-slot').forEach((s) => s.classList.remove('selected'));
          slotEl.classList.add('selected');
          this.displayItemDetails(slotData);
          ProceduralAudio.playButtonClick();
        });
      }

      this.gridContainer.appendChild(slotEl);
    }

    // Aktif Zırh Set Bonusunu Göster
    const setBonus = inv.getActiveSetBonus();
    if (this.setBonusNotice) {
      if (setBonus) {
        this.setBonusNotice.style.display = 'block';
        this.setBonusNotice.innerHTML = `🌟 <b>SET BONUSU: ${setBonus.nameTr}</b><br>${setBonus.descriptionTr}`;
      } else {
        this.setBonusNotice.style.display = 'none';
      }
    }
  }

  private displayItemDetails(slot: InventorySlot): void {
    const item = slot.item;
    if (this.itemTitle) this.itemTitle.textContent = item.nameTr;
    if (this.itemIcon) this.itemIcon.textContent = item.icon;
    if (this.itemDesc) this.itemDesc.textContent = item.descriptionTr;

    if (this.itemStats) {
      let statsHtml = '';
      if (item.damage) statsHtml += `<div>🗡️ Hasar: <b>${item.damage}</b></div>`;
      if (item.defense) statsHtml += `<div>🛡️ Savunma: <b>${item.defense}</b></div>`;
      if (item.upgradeLevel) statsHtml += `<div>🔨 Seviye: <b>${item.upgradeLevel}/${item.maxLevel || 4}</b></div>`;
      if (item.healAmount) statsHtml += `<div>❤️ İyileştirme: <b>+${item.healAmount} Can</b></div>`;
      if (item.kutRestoreAmount) statsHtml += `<div>✨ Kut Yenileme: <b>+${item.kutRestoreAmount} KP</b></div>`;
      if (item.buffDuration) statsHtml += `<div>⏱️ Etki Süresi: <b>${item.buffDuration} sn</b></div>`;
      this.itemStats.innerHTML = statsHtml;
    }

    // Buton Durumları
    if (this.btnActionEquip) {
      const isEquippable = ['WEAPON', 'BOW', 'SHIELD', 'ARMOR'].includes(item.category);
      this.btnActionEquip.style.display = isEquippable ? 'block' : 'none';
      this.btnActionEquip.textContent = slot.isEquipped ? 'KUŞANILDI' : 'KUŞAN';
    }

    if (this.btnActionUse) {
      this.btnActionUse.style.display = item.category === 'FOOD' ? 'block' : 'none';
    }

    // 3D Önizleme Kamerasında Eşyayı Göster
    this.preview.displayItem(item);
  }

  private clearItemDetails(): void {
    if (this.itemTitle) this.itemTitle.textContent = 'Eşya Seçiniz';
    if (this.itemIcon) this.itemIcon.textContent = '';
    if (this.itemDesc) this.itemDesc.textContent = 'Detayları ve 3D önizlemeyi görmek için soldaki ızgaradan bir eşyaya dokunun.';
    if (this.itemStats) this.itemStats.innerHTML = '';
    if (this.btnActionEquip) this.btnActionEquip.style.display = 'none';
    if (this.btnActionUse) this.btnActionUse.style.display = 'none';
  }
}
