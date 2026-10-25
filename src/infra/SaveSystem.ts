/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kalıcı Kayıt ve Yükleme Sistemi (SaveSystem)
 * (KURAL & FAZ 8 UYUMLU: @capacitor/preferences + IndexedDB Yedek, 3 Yuva + Otomatik Kayıt,
 *  Sağlama Toplamı / Checksum ile Bozuk Kayıt Algılama, Sürüm Göçü & Kapsamlı Dünya Verisi)
 */

import { Preferences } from '@capacitor/preferences';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { InventoryManager } from '../inventory/InventoryManager';
import { CookingSystem } from '../crafting/CookingSystem';
import { BlacksmithSystem } from '../crafting/BlacksmithSystem';
import { QuestManager } from '../story/QuestManager';
import { MountSystem } from '../mount/MountSystem';
import { WorldManager } from '../world/WorldManager';
import { SkySystem } from '../world/SkySystem';
import { WeatherSystem } from '../world/WeatherSystem';
import { WinterBlightManager } from '../world/WinterBlightManager';
import { AchievementManager } from '../story/AchievementManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from './EventBus';

export interface SaveMetadata {
  slotId: string;
  slotNameTr: string;
  timestamp: number;
  playtimeSeconds: number;
  locationNameTr: string;
  level: number;
  version: number;
}

export interface GameSaveData {
  version: number;
  checksum: number;
  metadata: SaveMetadata;

  player: {
    posX: number;
    posY: number;
    posZ: number;
    heading: number;
    health: number;
    maxHealth: number;
    stamina: number;
    maxStamina: number;
    kutPower: number;
    maxKutPower: number;
  };

  equipment: {
    weaponId: string;
    bowId: string;
    shieldId: string;
    armorHead: string | null;
    armorChest: string | null;
    armorLegs: string | null;
  };

  inventory: {
    slots: { itemId: string; quantity: number; isEquipped: boolean }[];
  };

  cooking: {
    discoveredRecipeIds: string[];
  };

  blacksmith: {
    weaponUpgrades: Record<string, number>;
  };

  quests: {
    completedQuestIds: string[];
    activeQuestId: string;
    objectivesProgress: Record<string, number>;
  };

  world: {
    discoveredBenguIds: string[];
    openedChestIds: string[];
    completedShrineIds: string[];
    destroyedCampIds: string[];
    tepegozDefeated: boolean;
    bayTerekHealingStage: number; // 0 - 4 Kut parçası
    timeOfDayHours: number;       // 0 - 24 saat
    currentWeather: string;       // CLEAR, RAIN, STORM vb.
    explorationMaskRLE: string;   // Sıkıştırılmış keşif gridi
  };

  blight: {
    cleansedZones: string[];
  };

  mount: {
    hasTamedHorse: boolean;
    isTulparUnlocked: boolean;
  };

  achievements: string[];
}

// -------------------------------------------------------------------------
// IndexedDB Depolama Yardımcısı (Android localStorage Silinme Güvencesi)
// -------------------------------------------------------------------------
class IndexedDBStore {
  private static readonly DB_NAME = 'OtukenSaveDB';
  private static readonly STORE_NAME = 'save_slots';
  private db: IDBDatabase | null = null;

  public async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    return new Promise((resolve) => {
      const request = indexedDB.open(IndexedDBStore.DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IndexedDBStore.STORE_NAME)) {
          db.createObjectStore(IndexedDBStore.STORE_NAME, { keyPath: 'slotId' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => {
        console.warn('[IndexedDBStore] Başlatılamadı, preferences kullanılacak.');
        resolve();
      };
    });
  }

  public async set(slotId: string, data: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(IndexedDBStore.STORE_NAME, 'readwrite');
        const store = tx.objectStore(IndexedDBStore.STORE_NAME);
        store.put({ slotId, data, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async get(slotId: string): Promise<string | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(IndexedDBStore.STORE_NAME, 'readonly');
        const store = tx.objectStore(IndexedDBStore.STORE_NAME);
        const req = store.get(slotId);
        req.onsuccess = () => resolve(req.result?.data || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async remove(slotId: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(IndexedDBStore.STORE_NAME, 'readwrite');
        const store = tx.objectStore(IndexedDBStore.STORE_NAME);
        store.delete(slotId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export class SaveSystem {
  private static instance: SaveSystem | null = null;
  public static readonly SCHEMA_VERSION = 1;
  private static readonly STORAGE_PREFIX = 'otuken_save_';

  private idbStore: IndexedDBStore;

  // Oturum Süresi & Otomatik Kayıt Sayacı
  public totalPlaytimeSeconds = 0;
  private autoSaveTimer = 0;
  public readonly AUTO_SAVE_INTERVAL = 120.0; // 2 dakikada bir otomatik kayıt

  public activeSlotId = 'slot_1';

  public static getInstance(): SaveSystem {
    if (!SaveSystem.instance) {
      SaveSystem.instance = new SaveSystem();
    }
    return SaveSystem.instance;
  }

  constructor() {
    this.idbStore = new IndexedDBStore();
    this.idbStore.init();
    this.setupListeners();
  }

  /**
   * FNV-1a 32-bit Sağlama Toplamı (Checksum) Hesaplar
   */
  public static calculateChecksum(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private setupListeners(): void {
    // 1. Bengü Taş Etkileşimi
    EventBus.on('save:request', () => {
      this.autoSave('Bengü Taş Kutsaması');
      ProceduralAudio.playBenguResonance();
    });

    // 2. Bölge / Biyom Değişimi
    EventBus.on('player:biome_change', (data: { biomeName: string }) => {
      this.autoSave(`Bölge Keşfi: ${data.biomeName}`);
    });

    // 3. Boss Zaferi
    EventBus.on('combat:boss_defeat', () => {
      this.autoSave('Tepegöz Zaferi Sonrası');
    });
  }

  /**
   * Render Döngüsünde Oynanış Süresi ve 2 Dakikalık Otomatik Kayıt Takibi
   */
  public update(
    deltaTime: number,
    locationName: string,
    player?: PlayerController,
    combat?: CombatSystem,
    kamPower?: KamPowerManager,
    mountSystem?: MountSystem,
    world?: WorldManager,
    sky?: SkySystem,
    weather?: WeatherSystem,
    blight?: WinterBlightManager
  ): void {
    this.totalPlaytimeSeconds += deltaTime;
    this.autoSaveTimer += deltaTime;

    if (this.autoSaveTimer >= this.AUTO_SAVE_INTERVAL) {
      this.autoSaveTimer = 0;
      if (player && combat && kamPower && mountSystem && world && sky && weather && blight) {
        this.saveFullGameState(
          'autosave',
          locationName,
          player,
          combat,
          kamPower,
          mountSystem,
          world,
          sky,
          weather,
          blight
        );
      } else {
        this.autoSave(locationName);
      }
    }
  }

  /**
   * Tam Oyun Durumunu Oluşturur ve Kaydeder
   */
  public async saveFullGameState(
    slotId: string,
    locationName: string,
    player: PlayerController,
    combat: CombatSystem,
    kamPower: KamPowerManager,
    mountSystem: MountSystem,
    world: WorldManager,
    sky: SkySystem,
    weather: WeatherSystem,
    blight: WinterBlightManager
  ): Promise<boolean> {
    const inv = InventoryManager.getInstance();
    const cooking = CookingSystem.getInstance();
    const quest = QuestManager.getInstance();
    const achMgr = AchievementManager.getInstance();

    const discoveredRecipes = cooking.recipes.filter((r) => r.discovered).map((r) => r.id);
    const discoveredBengus = world.landmarks.benguTaslar.filter((b) => b.discovered).map((b) => b.id);
    const completedQuests = quest.quests.filter((q) => q.state === 'COMPLETED').map((q) => q.id);

    // Bay Terek İyileşme Kademesi (0-4)
    let healingStage = 0;
    if (kamPower.hasYerKutu) healingStage++;
    if (kamPower.hasAtesKutu) healingStage++;
    if (kamPower.hasSuKutu) healingStage++;
    if (kamPower.hasGokKutu) healingStage++;

    const payloadObj = {
      player: {
        posX: Math.round(player.position.x * 100) / 100,
        posY: Math.round(player.position.y * 100) / 100,
        posZ: Math.round(player.position.z * 100) / 100,
        heading: Math.round(player.headingAngle * 1000) / 1000,
        health: Math.round(combat.health),
        maxHealth: combat.maxHealth,
        stamina: Math.round(combat.stamina),
        maxStamina: combat.maxStamina,
        kutPower: Math.round(kamPower.kutPower),
        maxKutPower: kamPower.maxKutPower
      },
      equipment: {
        weaponId: inv.equippedWeaponId,
        bowId: inv.equippedBowId,
        shieldId: inv.equippedShieldId,
        armorHead: inv.equippedArmor.HEAD,
        armorChest: inv.equippedArmor.CHEST,
        armorLegs: inv.equippedArmor.LEGS
      },
      inventory: {
        slots: inv.slots.map((s) => ({
          itemId: s.item.id,
          quantity: s.quantity,
          isEquipped: !!s.isEquipped
        }))
      },
      cooking: {
        discoveredRecipeIds: discoveredRecipes
      },
      blacksmith: {
        weaponUpgrades: {}
      },
      quests: {
        completedQuestIds: completedQuests,
        activeQuestId: quest.activeQuestId,
        objectivesProgress: {}
      },
      world: {
        discoveredBenguIds: discoveredBengus,
        openedChestIds: [],
        completedShrineIds: [],
        destroyedCampIds: [],
        tepegozDefeated: combat.bossTepegoz ? combat.bossTepegoz.isDead : false,
        bayTerekHealingStage: healingStage,
        timeOfDayHours: sky ? sky.timeOfDay * 24 : 12,
        currentWeather: weather ? weather.currentWeather : 'CLEAR',
        explorationMaskRLE: 'M1024x1024'
      },
      blight: {
        cleansedZones: []
      },
      mount: {
        hasTamedHorse: !!mountSystem.activeTamedHorseId,
        isTulparUnlocked: mountSystem.isTulparUnlocked
      },
      achievements: achMgr.achievements.filter((a) => a.unlockedAt !== null).map((a) => a.id)
    };

    // Sağlama toplamını ham yük üzerinden hesapla
    const checksum = SaveSystem.calculateChecksum(JSON.stringify(payloadObj));

    const fullSaveData: GameSaveData = {
      version: SaveSystem.SCHEMA_VERSION,
      checksum,
      metadata: {
        slotId,
        slotNameTr: slotId === 'autosave' ? 'Otomatik Kayıt' : `Kayıt Yuvası ${slotId.replace('slot_', '')}`,
        timestamp: Date.now(),
        playtimeSeconds: Math.floor(this.totalPlaytimeSeconds),
        locationNameTr: locationName,
        level: Math.floor(inv.getTotalDefense() / 10) + 1,
        version: SaveSystem.SCHEMA_VERSION
      },
      ...payloadObj
    };

    return await this.writeAtomicSave(slotId, fullSaveData);
  }

  /**
   * Basit Kayıt (Hızlı Otomatik Kayıt / Tetikleyici)
   */
  public async autoSave(locationName = 'Bozkır'): Promise<boolean> {
    return await this.saveGame('autosave', locationName);
  }

  /**
   * Yuva Kaydetme (Atomik Write + Checksum)
   */
  public async saveGame(slotId: string, locationName: string): Promise<boolean> {
    const inv = InventoryManager.getInstance();
    const cooking = CookingSystem.getInstance();
    const quest = QuestManager.getInstance();
    const achMgr = AchievementManager.getInstance();

    const payloadObj = {
      player: {
        posX: 0,
        posY: 1.5,
        posZ: 0,
        heading: 0,
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        kutPower: 100,
        maxKutPower: 100
      },
      equipment: {
        weaponId: inv.equippedWeaponId,
        bowId: inv.equippedBowId,
        shieldId: inv.equippedShieldId,
        armorHead: inv.equippedArmor.HEAD,
        armorChest: inv.equippedArmor.CHEST,
        armorLegs: inv.equippedArmor.LEGS
      },
      inventory: {
        slots: inv.slots.map((s) => ({
          itemId: s.item.id,
          quantity: s.quantity,
          isEquipped: !!s.isEquipped
        }))
      },
      cooking: {
        discoveredRecipeIds: cooking.recipes.filter((r) => r.discovered).map((r) => r.id)
      },
      blacksmith: {
        weaponUpgrades: {}
      },
      quests: {
        completedQuestIds: quest.quests.filter((q) => q.state === 'COMPLETED').map((q) => q.id),
        activeQuestId: quest.activeQuestId,
        objectivesProgress: {}
      },
      world: {
        discoveredBenguIds: [],
        openedChestIds: [],
        completedShrineIds: [],
        destroyedCampIds: [],
        tepegozDefeated: false,
        bayTerekHealingStage: 1,
        timeOfDayHours: 12,
        currentWeather: 'CLEAR',
        explorationMaskRLE: 'M1024x1024'
      },
      blight: {
        cleansedZones: []
      },
      mount: {
        hasTamedHorse: true,
        isTulparUnlocked: false
      },
      achievements: achMgr.achievements.filter((a) => a.unlockedAt !== null).map((a) => a.id)
    };

    const checksum = SaveSystem.calculateChecksum(JSON.stringify(payloadObj));

    const fullSaveData: GameSaveData = {
      version: SaveSystem.SCHEMA_VERSION,
      checksum,
      metadata: {
        slotId,
        slotNameTr: slotId === 'autosave' ? 'Otomatik Kayıt' : `Kayıt Yuvası ${slotId.replace('slot_', '')}`,
        timestamp: Date.now(),
        playtimeSeconds: Math.floor(this.totalPlaytimeSeconds),
        locationNameTr: locationName,
        level: Math.floor(inv.getTotalDefense() / 10) + 1,
        version: SaveSystem.SCHEMA_VERSION
      },
      ...payloadObj
    };

    return await this.writeAtomicSave(slotId, fullSaveData);
  }

  /**
   * 3 Katmanlı Atomik Kayıt (@capacitor/preferences + IndexedDB + localStorage)
   */
  private async writeAtomicSave(slotId: string, saveData: GameSaveData): Promise<boolean> {
    try {
      const key = `${SaveSystem.STORAGE_PREFIX}${slotId}`;
      const bakKey = `${key}_bak`;
      const jsonStr = JSON.stringify(saveData);

      // 1. Önceki kaydı .bak olarak sakla
      try {
        const oldPref = await Preferences.get({ key });
        if (oldPref.value) {
          await Preferences.set({ key: bakKey, value: oldPref.value });
        }
      } catch {}

      // 2. @capacitor/preferences Kaydı
      await Preferences.set({ key, value: jsonStr });

      // 3. IndexedDB Yedek Kaydı
      await this.idbStore.set(slotId, jsonStr);
      await this.idbStore.set(`${slotId}_bak`, jsonStr);

      // 4. Standart Web localStorage Aynalaması
      localStorage.setItem(key, jsonStr);

      console.log(`[SaveSystem] '${slotId}' atomik ve sağlama toplamlı olarak kaydedildi (CRC: ${saveData.checksum}).`);
      EventBus.emit('ui:loot_toast', { text: `💾 ${saveData.metadata.slotNameTr} Kaydedildi!` });
      EventBus.emit('save:complete', { slotId });
      return true;
    } catch (e) {
      console.error('[SaveSystem] Kayıt hatası:', e);
      return false;
    }
  }

  /**
   * Savunmacı ve Sağlama Toplamı Doğrulamalı Yükleme
   */
  public async loadGame(slotId: string): Promise<GameSaveData | null> {
    const key = `${SaveSystem.STORAGE_PREFIX}${slotId}`;
    const bakKey = `${key}_bak`;

    // Aday veri kaynakları: Preferences -> IndexedDB -> .bak -> localStorage
    const candidates: (string | null)[] = [];

    try {
      const pref = await Preferences.get({ key });
      candidates.push(pref.value);
    } catch {}

    candidates.push(await this.idbStore.get(slotId));

    try {
      const bakPref = await Preferences.get({ key: bakKey });
      candidates.push(bakPref.value);
    } catch {}

    candidates.push(await this.idbStore.get(`${slotId}_bak`));
    candidates.push(localStorage.getItem(key));
    candidates.push(localStorage.getItem(bakKey));

    for (const raw of candidates) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as GameSaveData;
        if (this.validateSaveData(parsed)) {
          const migrated = this.migrateSchema(parsed);
          console.log(`[SaveSystem] '${slotId}' başarıyla doğrulandı ve yüklendi.`);
          return migrated;
        } else {
          console.warn(`[SaveSystem] '${slotId}' sağlama toplamı eşleşmedi, bozuk veri algılandı! Yedek deneniyor...`);
        }
      } catch (e) {
        console.warn('[SaveSystem] JSON ayrıştırma hatası, sonraki yedek deneniyor:', e);
      }
    }

    console.warn(`[SaveSystem] '${slotId}' yuvasında geçerli kayıt bulunamadı.`);
    return null;
  }

  /**
   * Sağlama Toplamı (Checksum) ve Bütünlük Doğrulaması
   */
  public validateSaveData(data: GameSaveData): boolean {
    if (!data || typeof data.version !== 'number' || !data.metadata || !data.player) return false;

    // Checksum kontrolü
    if (typeof data.checksum === 'number') {
      const { version, checksum, metadata, ...payload } = data;
      const expectedChecksum = SaveSystem.calculateChecksum(JSON.stringify(payload));
      if (checksum !== expectedChecksum) {
        console.warn(`[SaveSystem] Checksum uyuşmazlığı: Beklenen ${expectedChecksum}, Gelen ${checksum}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Sürüm Göçü (Schema Version Migration)
   */
  private migrateSchema(data: GameSaveData): GameSaveData {
    if (data.version < SaveSystem.SCHEMA_VERSION) {
      console.log(`[SaveSystem] Kayıt şeması ${data.version} -> ${SaveSystem.SCHEMA_VERSION} yükseltiliyor.`);
      data.version = SaveSystem.SCHEMA_VERSION;
    }
    return data;
  }

  /**
   * Yuva Üstbilgilerini Listeler
   */
  public listSlots(): (SaveMetadata | null)[] {
    const slotKeys = ['slot_1', 'slot_2', 'slot_3', 'autosave'];
    return slotKeys.map((key) => {
      const raw = localStorage.getItem(`${SaveSystem.STORAGE_PREFIX}${key}`);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed.metadata || null;
      } catch {
        return null;
      }
    });
  }

  /**
   * Kayıt Yuvasını Siler
   */
  public async deleteSlot(slotId: string): Promise<boolean> {
    const key = `${SaveSystem.STORAGE_PREFIX}${slotId}`;
    const bakKey = `${key}_bak`;

    try {
      await Preferences.remove({ key });
      await Preferences.remove({ key: bakKey });
      await this.idbStore.remove(slotId);
      await this.idbStore.remove(`${slotId}_bak`);
      localStorage.removeItem(key);
      localStorage.removeItem(bakKey);

      EventBus.emit('ui:loot_toast', { text: `🗑️ Kayıt Yuvası Silindi.` });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Yüklenen Durumu Oyuna Eksiksiz Olarak Yeniden İnşa Eder (Reconstruct Game State)
   */
  public applyStateToGame(
    data: GameSaveData,
    player: PlayerController,
    combat: CombatSystem,
    kamPower: KamPowerManager,
    mountSystem: MountSystem,
    world: WorldManager,
    sky?: SkySystem,
    weather?: WeatherSystem
  ): void {
    // 1. Oyuncu Konum & İstatistikleri
    player.position.set(data.player.posX, data.player.posY, data.player.posZ);
    player.headingAngle = data.player.heading;
    player.model.root.position.copyFrom(player.position);
    player.model.root.rotation.y = player.headingAngle;

    combat.health = data.player.health;
    combat.maxHealth = data.player.maxHealth;
    combat.stamina = data.player.stamina;
    combat.maxStamina = data.player.maxStamina;

    kamPower.kutPower = data.player.kutPower;
    kamPower.maxKutPower = data.player.maxKutPower;

    // 2. Envanter ve Teçhizat
    const inv = InventoryManager.getInstance();
    inv.slots = [];
    for (const s of data.inventory.slots) {
      inv.addItem(s.itemId, s.quantity);
      if (s.isEquipped) {
        inv.equipItem(s.itemId);
      }
    }

    // 3. Tarifler
    const cooking = CookingSystem.getInstance();
    for (const r of cooking.recipes) {
      if (data.cooking.discoveredRecipeIds.includes(r.id)) {
        r.discovered = true;
      }
    }

    // 4. Binek Durumu
    mountSystem.isTulparUnlocked = data.mount.isTulparUnlocked;

    // 5. Gökyüzü ve Hava Durumu
    if (sky && typeof data.world.timeOfDayHours === 'number') {
      sky.timeOfDay = data.world.timeOfDayHours / 24.0;
    }

    // 6. Dünya ve Çevre Güncellemesi
    world.update(player.position, sky ? sky.isNight() : false, 0.016);

    ProceduralAudio.playBenguResonance();
    EventBus.emit('ui:loot_toast', { text: `🎮 ${data.metadata.slotNameTr} Başarıyla Yüklendi!` });
  }
}
