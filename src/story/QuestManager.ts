/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gelişmiş Görev Sistemi ve İlerleme Yöneticisi (QuestManager)
 * (6 Ana Görev, 4 Yan Görev, Hedef Takibi, Işık Sütunu İşaretçisi, Fanfarlar & Sıfır GC)
 */

import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { QUEST_DEFINITIONS, QuestDefinition, QuestObjective } from './QuestData';

export class QuestManager {
  private static instance: QuestManager | null = null;
  public quests: QuestDefinition[] = [];
  public activeQuestId: string = 'quest_kul_olan_oba';

  private constructor() {
    this.initQuests();
    this.setupEventListeners();
  }

  public static getInstance(): QuestManager {
    if (!QuestManager.instance) {
      QuestManager.instance = new QuestManager();
    }
    return QuestManager.instance;
  }

  private initQuests(): void {
    // Derin kopya ile görevleri başlat
    this.quests = JSON.parse(JSON.stringify(QUEST_DEFINITIONS));
  }

  private setupEventListeners(): void {
    EventBus.on('quest:started', (data: { questId: string }) => {
      this.activateQuest(data.questId);
    });

    EventBus.on('quest:completed', (data: { questId: string }) => {
      this.completeQuest(data.questId);
    });

    // Tepegöz yenilip Yer Kutu geri alınınca
    EventBus.on('world:kut_restoration', (data: { level: number }) => {
      if (data.level >= 1) {
        this.advanceObjective('quest_yersubun_kalbi', 0, 1);
        this.completeQuest('quest_yersubun_kalbi');
      }
    });

    // Kara Totem yıkılınca
    EventBus.on('totem:destroyed', () => {
      this.advanceObjective('quest_demircinin_borcu', 0, 1);
    });

    // Anıt ve Bengü Taş keşfedilince
    EventBus.on('world:landmark_discovered', () => {
      this.advanceObjective('quest_balballar', 0, 1);
    });
  }

  public getQuestState(questId: string): string {
    const q = this.quests.find((item) => item.id === questId);
    return q ? q.state : 'LOCKED';
  }

  public activateQuest(questId: string): void {
    const q = this.quests.find((item) => item.id === questId);
    if (!q || q.state === 'COMPLETED' || q.state === 'ACTIVE') return;

    q.state = 'ACTIVE';
    this.activeQuestId = questId;
    ProceduralAudio.playQuestUpdate();

    EventBus.emit('ui:dialogue_show', {
      speaker: 'Yeni Görev',
      text: `${q.titleTr} görevi günlüğe eklendi!`
    });
  }

  public advanceObjective(questId: string, objectiveIndex: number, amount = 1): void {
    const q = this.quests.find((item) => item.id === questId);
    if (!q || q.state !== 'ACTIVE') return;

    const obj = q.objectives[objectiveIndex];
    if (!obj || obj.isDone) return;

    obj.currentCount = Math.min(obj.targetCount, obj.currentCount + amount);
    ProceduralAudio.playQuestUpdate();

    if (obj.currentCount >= obj.targetCount) {
      obj.isDone = true;
    }

    // Tüm hedefler bitti mi?
    const allDone = q.objectives.every((o) => o.isDone);
    if (allDone) {
      q.state = 'OBJECTIVE_MET';
      this.completeQuest(questId);
    }
  }

  public advanceProgress(questId: string, amount = 1): void {
    const q = this.quests.find((item) => item.id === questId);
    if (!q || q.state !== 'ACTIVE') return;

    // İlk tamamlanmamış hedefi ilerlet
    const firstIncomplete = q.objectives.find((o) => !o.isDone);
    if (firstIncomplete) {
      const idx = q.objectives.indexOf(firstIncomplete);
      this.advanceObjective(questId, idx, amount);
    }
  }

  public completeQuest(questId: string): void {
    const q = this.quests.find((item) => item.id === questId);
    if (!q || q.state === 'COMPLETED') return;

    q.state = 'COMPLETED';
    q.objectives.forEach((o) => {
      o.currentCount = o.targetCount;
      o.isDone = true;
    });

    ProceduralAudio.playQuestComplete();

    EventBus.emit('ui:dialogue_show', {
      speaker: 'Görev Tamamlandı!',
      text: `${q.titleTr} tamamlandı! Ödül: ${q.rewardTr}`
    });

    // Zincirdeki bir sonraki ana görevi otomatik aç
    if (q.nextQuestId) {
      setTimeout(() => {
        this.activateQuest(q.nextQuestId!);
      }, 1500);
    }
  }

  public getActiveQuest(): QuestDefinition | null {
    return this.quests.find((q) => q.id === this.activeQuestId && q.state === 'ACTIVE') ||
           this.quests.find((q) => q.state === 'ACTIVE') ||
           this.quests[0];
  }

  public getActiveBeaconPos(): { x: number; y: number; z: number } | null {
    const active = this.getActiveQuest();
    if (!active) return null;

    // İlk tamamlanmamış hedefin koordinatlarını al
    const currentObj = active.objectives.find((o) => !o.isDone);
    if (currentObj && currentObj.targetCoords) {
      return currentObj.targetCoords;
    }
    return active.beaconPos || null;
  }
}
