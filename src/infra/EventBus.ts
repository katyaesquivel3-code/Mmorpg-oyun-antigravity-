/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Tip Güvenli Olay Veriyolu (Typed EventBus)
 */

export type GameEventMap = {
  // Savaş Olayları
  'combat:start': void;
  'combat:attack': { isCharged: boolean; comboStep: number };
  'combat:hit': { damage: number; isCritical: boolean; targetId: string };
  'combat:parry': { enemyId: string };
  'combat:block': { damageBlocked: number };
  'combat:dodge': { isKutZamani: boolean };
  'combat:kutzamani_enter': void;
  'combat:kutzamani_exit': void;
  'combat:arrow_shoot': { originX: number; originY: number; originZ: number };
  'enemy:alert': { enemyId: string };
  'enemy:killed': { enemyId: string; type: string };
  'boss:phase': { phase: number | string };

  // FAZ 6: Kam Güçleri, Elementler ve Mabet Olayları
  'power:change': { power: 'FIRE' | 'WIND' | 'KUT_TIME' };
  'power:cast': { power: 'FIRE' | 'WIND' | 'KUT_TIME' };
  'power:kut_change': { current: number; max: number };
  'element:burn': { x: number; y: number; z: number };
  'element:melt': { x: number; y: number; z: number };
  'element:lightning_warning': { isPlayer: boolean; x: number; y: number; z: number };
  'shrine:entered': { shrineId: string; name: string };
  'shrine:puzzle_step': { shrineId: string; puzzleType: string };
  'shrine:completed': { shrineId: string; kamStoneReward: number };
  'shrine:upgrade_chosen': { type: 'HEALTH' | 'KUT_POWER' };

  // FAZ 7: Envanter, Yemek, Demirci ve Binek Olayları
  'inventory:update': void;
  'inventory:open': void;
  'inventory:close': void;
  'buff:update': { buffName: string; duration: number };
  'mount:mount': { mountType: 'HORSE' | 'TULPAR' };
  'mount:dismount': void;
  'crafting:cook': { recipeId: string; foodName: string };
  'crafting:upgrade': { itemId: string; newLevel: number };

  // FAZ 8: Kayıt, Kopuz, Ayarlar ve Başarım Olayları
  'achievement:unlocked': { achievementId: string; nameTr: string };
  'kopuz:play': { songType: string; songName: string };
  'save:complete': { slotId: string };
  'save:load_request': { slotId: string };
  'shrine:complete': void;
  'shrine:kut_heart_selected': void;
  'landmark:bengu_discovered': void;
  'combat:boss_defeat': void;
  'audio:layer_change': { layer: 'EXPLORATION' | 'NIGHT' | 'COMBAT' | 'BOSS' | 'CAVE_WATER' };
  'world:weather_change': { weatherType: string };
  'world:time_change': { time: number };
  'world:wind_change': { direction: number };

  // Oyuncu Durum Olayları
  'player:health_change': { current: number; max: number };
  'player:stamina_change': { current: number; max: number };
  'player:biome_change': { biomeName: string };
  'player:teleport': { x: number; y: number; z: number };

  // Dünya, Keşif & Hızlı Yolculuk Olayları
  'fast_travel:request': { benguId: string };
  'save:request': { benguId: string };
  'world:landmark_discovered': { id: string; name: string };
  'world:kut_restoration': { level: number };
  'camp:cleared': { campId: string };
  'totem:destroyed': { campId: string };
  'map:open': void;
  'map:close': void;

  // Hikaye, Sinematik ve Görev Olayları
  'quest:started': { questId: string };
  'quest:completed': { questId: string };
  'dialogue:start': { startNodeId: string };
  'cutscene:ended': void;
  'cutscene:start': void;
  'cutscene:end': void;

  // FAZ 9: Ergenekon, Demir Dağ & Tulpar Olayları
  'world:ergenekon_restored': void;
  'world:bay_terek_healed': { stage: number };
  'achievement:unlock': { id: string };

  // FAZ 10: Şahmaran Gölü, Su Kutu & Arınma Olayları
  'world:sahmaran_purified': void;
  'world:yelbegen_defeated': void;
  'story:sahmaran_moral_choice': { choice: 'OATH_KEPT' | 'TRIBE_FIRST' };

  // FAZ 11: Gök Zirve, Dokuz Kat Yeraltı & Oyun Sonları
  'world:gok_zirve_unlocked': void;
  'world:gok_kutu_unlocked': void;
  'world:yeralti_entered': void;
  'world:erlik_defeated': void;
  'ending:balance': void;
  'ending:ruin': void;

  // Arayüz ve Menü Olayları
  'ui:dialogue_show': { speaker: string; text: string };
  'ui:dialogue_hide': void;
  'ui:loot_toast': { text: string };
  'ui:menu_open': { menuId: string };
  'ui:menu_close': void;
  'ui:settings_open': void;
  'ui:settings_close': void;
  'ui:hud_edit_toggle': { isEditing: boolean };

  // Ayarlar ve Sistem Olayları
  'settings:updated': void;
  'device:orientation_change': { isLandscape: boolean };
};

type EventCallback<T> = (data: T) => void;

export class EventBus {
  private static listeners: Map<keyof GameEventMap, Set<EventCallback<any>>> = new Map();

  public static on<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public static off<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public static emit<K extends keyof GameEventMap>(event: K, data?: GameEventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data as GameEventMap[K]);
        } catch (err) {
          console.error(`[EventBus] Hata (${String(event)}):`, err);
        }
      });
    }
  }

  public static clear(): void {
    this.listeners.clear();
  }
}
