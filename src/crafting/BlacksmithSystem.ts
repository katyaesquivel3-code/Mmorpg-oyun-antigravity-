/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Demirci Yükseltme Sistemi (BlacksmithSystem)
 * (Demirci Bamsı, 4 Seviyeli Silah/Yay/Kalkan Güçlendirme, Kırılmaz Silahlar & Sıfır GC)
 */

import { InventoryManager } from '../inventory/InventoryManager';
import { ITEM_CATALOG, ItemDefinition } from '../inventory/InventoryData';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface UpgradeCost {
  iron: number;
  boneOrLeather: number;
  kutPowder: number;
}

export class BlacksmithSystem {
  private static instance: BlacksmithSystem | null = null;

  public static getInstance(): BlacksmithSystem {
    if (!BlacksmithSystem.instance) {
      BlacksmithSystem.instance = new BlacksmithSystem();
    }
    return BlacksmithSystem.instance;
  }

  /**
   * Hedef seviyeye göre yükseltme maliyetini döndürür
   */
  public getUpgradeCost(currentLevel: number): UpgradeCost | null {
    if (currentLevel >= 4) return null; // Zaten son seviye

    switch (currentLevel) {
      case 1:
        return { iron: 5, boneOrLeather: 3, kutPowder: 20 };
      case 2:
        return { iron: 10, boneOrLeather: 6, kutPowder: 45 };
      case 3:
        return { iron: 18, boneOrLeather: 12, kutPowder: 90 };
      default:
        return null;
    }
  }

  /**
   * Yükseltme için yeterli malzeme var mı kontrol eder
   */
  public canUpgrade(itemId: string): boolean {
    const item = ITEM_CATALOG[itemId];
    if (!item || !item.upgradeLevel || item.upgradeLevel >= (item.maxLevel || 4)) return false;

    const cost = this.getUpgradeCost(item.upgradeLevel);
    if (!cost) return false;

    const inv = InventoryManager.getInstance();
    const ironCount = inv.getItemCount('mat_iron');
    const boneCount = inv.getItemCount('mat_bone') + inv.getItemCount('mat_leather');
    const kutCount = inv.getItemCount('mat_kut_powder');

    return ironCount >= cost.iron && boneCount >= cost.boneOrLeather && kutCount >= cost.kutPowder;
  }

  /**
   * Eşyayı bir üst seviyeye yükseltir
   */
  public upgradeItem(itemId: string): boolean {
    if (!this.canUpgrade(itemId)) {
      EventBus.emit('ui:loot_toast', { text: 'Yetersiz malzeme veya Kut Tozu!' });
      ProceduralAudio.playButtonClick();
      return false;
    }

    const item = ITEM_CATALOG[itemId];
    const cost = this.getUpgradeCost(item.upgradeLevel || 1)!;
    const inv = InventoryManager.getInstance();

    // Malzemeleri tüket
    inv.removeItem('mat_iron', cost.iron);
    if (inv.getItemCount('mat_bone') >= cost.boneOrLeather) {
      inv.removeItem('mat_bone', cost.boneOrLeather);
    } else {
      inv.removeItem('mat_leather', cost.boneOrLeather);
    }
    inv.removeItem('mat_kut_powder', cost.kutPowder);

    // Seviye ve İstatistik Artışı
    item.upgradeLevel = (item.upgradeLevel || 1) + 1;
    if (item.damage) {
      item.damage = Math.round(item.damage * 1.45);
    }
    if (item.defense) {
      item.defense = Math.round(item.defense * 1.45);
    }

    ProceduralAudio.playHammerStrike();
    EventBus.emit('crafting:upgrade', { itemId, newLevel: item.upgradeLevel });
    EventBus.emit('ui:loot_toast', {
      text: `🔨 ${item.nameTr} Seviye ${item.upgradeLevel}'e Yükseltildi! (Kırılmaz)`
    });

    return true;
  }
}
