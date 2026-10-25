/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Envanter ve Teçhizat Yöneticisi (InventoryManager)
 * (Kuşanma, Yuva Sınırı, Zırh Set Bonusları, Yemek Tüketimi & Süreli Buff Sistemi & Sıfır GC)
 */

import {
  ItemDefinition,
  InventorySlot,
  ItemCategory,
  ArmorSlot,
  ArmorSetId,
  ARMOR_SET_BONUSES,
  ArmorSetBonus,
  ITEM_CATALOG
} from './InventoryData';
import { CombatSystem } from '../combat/CombatSystem';
import { PlayerController } from '../player/PlayerController';
import { KamPowerManager } from '../powers/KamPowerManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface ActiveBuff {
  type: string;
  nameTr: string;
  duration: number;      // Kalan süre (saniye)
  totalDuration: number;
}

export class InventoryManager {
  private static instance: InventoryManager | null = null;

  // Yuva Sınırı (Maksimum 36 farklı eşya slotu)
  public readonly MAX_SLOTS = 36;
  public slots: InventorySlot[] = [];

  // Kuşanılan Teçhizat
  public equippedWeaponId = 'kam_sword';
  public equippedBowId = 'short_bow';
  public equippedShieldId = 'willow_shield';
  public equippedArmor: Record<ArmorSlot, string | null> = {
    HEAD: null,
    CHEST: null,
    LEGS: null
  };

  // Aktif Süreli Yemek Buff'ları
  public activeBuffs: ActiveBuff[] = [];

  public static getInstance(): InventoryManager {
    if (!InventoryManager.instance) {
      InventoryManager.instance = new InventoryManager();
    }
    return InventoryManager.instance;
  }

  constructor() {
    this.initDefaultInventory();
  }

  private initDefaultInventory(): void {
    // Başlangıç Teçhizatı
    this.addItem('kam_sword', 1);
    this.addItem('short_bow', 1);
    this.addItem('arrow_regular', 35);
    this.addItem('willow_shield', 1);

    // Başlangıç Malzeme & Yemekleri
    this.addItem('food_kavurma', 2);
    this.addItem('food_kimiz', 1);
    this.addItem('food_pisi', 3);
    this.addItem('mat_meat', 4);
    this.addItem('mat_iron', 6);
    this.addItem('mat_kut_powder', 25);

    // Başlangıç Zırh Parçaları (Bozkurt seti)
    this.addItem('bozkurt_helm', 1);
    this.addItem('bozkurt_vest', 1);
    this.addItem('bozkurt_boots', 1);

    // Otomatik Kuşan
    this.equipItem('bozkurt_helm');
    this.equipItem('bozkurt_vest');
    this.equipItem('bozkurt_boots');
  }

  public addItem(itemId: string, quantity = 1): boolean {
    const def = ITEM_CATALOG[itemId];
    if (!def) {
      console.warn(`[InventoryManager] Bilinmeyen eşya: ${itemId}`);
      return false;
    }

    // 1. İstiflenebilir eşya kontrolü
    if (def.isStackable) {
      const existing = this.slots.find((s) => s.item.id === itemId);
      if (existing) {
        existing.quantity += quantity;
        EventBus.emit('inventory:update');
        return true;
      }
    }

    // 2. Yeni slot kontrolü
    if (this.slots.length >= this.MAX_SLOTS) {
      EventBus.emit('ui:loot_toast', { text: 'Çantanız Dolu! (36/36 Yuva)' });
      return false;
    }

    this.slots.push({
      item: def,
      quantity,
      isEquipped: false
    });

    EventBus.emit('inventory:update');
    return true;
  }

  public removeItem(itemId: string, quantity = 1): boolean {
    const idx = this.slots.findIndex((s) => s.item.id === itemId);
    if (idx < 0) return false;

    const slot = this.slots[idx];
    if (slot.quantity > quantity) {
      slot.quantity -= quantity;
    } else {
      this.slots.splice(idx, 1);
    }

    EventBus.emit('inventory:update');
    return true;
  }

  public getItemCount(itemId: string): number {
    const slot = this.slots.find((s) => s.item.id === itemId);
    return slot ? slot.quantity : 0;
  }

  public getSlotsByCategory(cat: ItemCategory): InventorySlot[] {
    return this.slots.filter((s) => s.item.category === cat);
  }

  /**
   * Eşya Kuşanma (Zırh, Silah, Kalkan, Yay)
   */
  public equipItem(itemId: string): boolean {
    const slot = this.slots.find((s) => s.item.id === itemId);
    if (!slot) return false;

    const def = slot.item;
    ProceduralAudio.playItemEquip();

    if (def.category === 'WEAPON') {
      this.equippedWeaponId = def.id;
    } else if (def.category === 'BOW') {
      this.equippedBowId = def.id;
    } else if (def.category === 'SHIELD') {
      this.equippedShieldId = def.id;
    } else if (def.category === 'ARMOR' && def.armorSlot) {
      this.equippedArmor[def.armorSlot] = def.id;
    }

    this.updateEquippedFlags();
    EventBus.emit('inventory:update');
    return true;
  }

  private updateEquippedFlags(): void {
    for (const s of this.slots) {
      if (s.item.category === 'WEAPON') {
        s.isEquipped = s.item.id === this.equippedWeaponId;
      } else if (s.item.category === 'BOW') {
        s.isEquipped = s.item.id === this.equippedBowId;
      } else if (s.item.category === 'SHIELD') {
        s.isEquipped = s.item.id === this.equippedShieldId;
      } else if (s.item.category === 'ARMOR' && s.item.armorSlot) {
        s.isEquipped = this.equippedArmor[s.item.armorSlot] === s.item.id;
      }
    }
  }

  /**
   * Yemek veya İksir Tüketme
   */
  public consumeFood(
    itemId: string,
    combat: CombatSystem,
    kamPower: KamPowerManager
  ): boolean {
    const slot = this.slots.find((s) => s.item.id === itemId);
    if (!slot || slot.item.category !== 'FOOD') return false;

    const food = slot.item;
    ProceduralAudio.playButtonClick();

    // Can Yenileme
    if (food.healAmount) {
      combat.health = Math.min(combat.maxHealth, combat.health + food.healAmount);
    }

    // Kut Gücü Yenileme
    if (food.kutRestoreAmount) {
      kamPower.restoreKutPower(food.kutRestoreAmount);
    }

    // Soluk Yenileme
    if (food.staminaRestoreAmount) {
      combat.stamina = Math.min(combat.maxStamina, combat.stamina + food.staminaRestoreAmount);
    }

    // Süreli Buff Ekleme
    if (food.buffType && food.buffDuration) {
      // Var olan aynı buff'ı yenile veya yeni ekle
      const existing = this.activeBuffs.find((b) => b.type === food.buffType);
      if (existing) {
        existing.duration = food.buffDuration;
      } else {
        this.activeBuffs.push({
          type: food.buffType,
          nameTr: food.nameTr,
          duration: food.buffDuration,
          totalDuration: food.buffDuration
        });
      }
      EventBus.emit('buff:update', { buffName: food.nameTr, duration: food.buffDuration });
    }

    EventBus.emit('ui:loot_toast', { text: `🍽️ ${food.nameTr} Tüketildi!` });
    this.removeItem(itemId, 1);
    return true;
  }

  /**
   * Aktif Zırh Set Bonusunu Kontrol Eder (3 Parça Eşleşmesi)
   */
  public getActiveSetBonus(): ArmorSetBonus | null {
    const head = this.equippedArmor.HEAD ? ITEM_CATALOG[this.equippedArmor.HEAD] : null;
    const chest = this.equippedArmor.CHEST ? ITEM_CATALOG[this.equippedArmor.CHEST] : null;
    const legs = this.equippedArmor.LEGS ? ITEM_CATALOG[this.equippedArmor.LEGS] : null;

    if (!head || !chest || !legs) return null;
    if (!head.armorSetId || !chest.armorSetId || !legs.armorSetId) return null;

    if (head.armorSetId === chest.armorSetId && chest.armorSetId === legs.armorSetId) {
      return ARMOR_SET_BONUSES[head.armorSetId];
    }

    return null;
  }

  /**
   * Belirli bir buff'ın aktif olup olmadığını kontrol eder
   */
  public hasBuff(buffType: string): boolean {
    return this.activeBuffs.some((b) => b.type === buffType && b.duration > 0);
  }

  /**
   * Belirli bir zırh seti bonusunun aktif olup olmadığını kontrol eder
   */
  public hasSetBonus(setId: ArmorSetId): boolean {
    const bonus = this.getActiveSetBonus();
    return bonus !== null && bonus.id === setId;
  }

  /**
   * Kuşanılmış Toplam Zırh Savunmasını Hesaplar
   */
  public getTotalDefense(): number {
    let def = 0;
    if (this.equippedArmor.HEAD) def += ITEM_CATALOG[this.equippedArmor.HEAD]?.defense || 0;
    if (this.equippedArmor.CHEST) def += ITEM_CATALOG[this.equippedArmor.CHEST]?.defense || 0;
    if (this.equippedArmor.LEGS) def += ITEM_CATALOG[this.equippedArmor.LEGS]?.defense || 0;
    if (this.equippedShieldId) def += ITEM_CATALOG[this.equippedShieldId]?.defense || 0;
    return def;
  }

  /**
   * Her Kare Süreli Yemek Buff'larını Günceller
   */
  public update(
    deltaTime: number,
    combat: CombatSystem,
    player: PlayerController,
    kamPower: KamPowerManager
  ): void {
    // 1. Zırh Set Bonusunu Uygula
    const setBonus = this.getActiveSetBonus();
    if (setBonus) {
      if (setBonus.id === 'KAM_SET') {
        kamPower.restoreKutPower(6.0 * deltaTime);
      } else if (setBonus.id === 'BOZKURT_SET') {
        player.footstepRadius = Math.min(player.footstepRadius, 4.5);
      }
    }

    // 2. Aktif Yemek Buff'larını İşlet
    for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
      const buff = this.activeBuffs[i];
      buff.duration -= deltaTime;

      switch (buff.type) {
        case 'KUT_REGEN':
          kamPower.restoreKutPower(10.0 * deltaTime);
          break;
        case 'STAMINA_REGEN':
          combat.stamina = Math.min(combat.maxStamina, combat.stamina + 18.0 * deltaTime);
          break;
        case 'SPEED_BOOST':
          // PlayerController hız çarpanına etki
          break;
      }

      if (buff.duration <= 0) {
        EventBus.emit('ui:loot_toast', { text: `⌛ ${buff.nameTr} Etkisi Sona Erdi.` });
        this.activeBuffs.splice(i, 1);
      }
    }
  }
}
