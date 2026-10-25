/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gelişmiş Dallanmalı Diyalog Yöneticisi (DialogueManager)
 * (Daktilo Efekti, Canlı 3D Portre Entegrasyonu, Görev Koşulları,
 *  Büyük Dokunmatik Seçenekler, 2.39:1 Letterbox & Sıfır GC)
 */

import { DIALOGUE_NODES, DialogueNode, DialogueChoice } from './DialogueData';
import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { QuestManager } from './QuestManager';
import { Live3DPortrait } from './Live3DPortrait';
import { TransformNode } from '@babylonjs/core';

export class DialogueManager {
  private static instance: DialogueManager | null = null;
  public currentNode: DialogueNode | null = null;
  public isDialogueActive = false;

  // Canlı 3D Portre Referansı
  public livePortrait: Live3DPortrait | null = null;
  private currentSpeakerNode: TransformNode | null = null;

  // DOM Referansları
  private dialogueBanner: HTMLElement | null;
  private dialogueSpeaker: HTMLElement | null;
  private dialogueText: HTMLElement | null;
  private dialogueChoicesContainer: HTMLElement | null;
  private letterboxTop: HTMLElement | null;
  private letterboxBottom: HTMLElement | null;

  // Daktilo Efekti Değişkenleri
  private fullText = '';
  private displayedCharIndex = 0;
  private typewriterInterval: number | null = null;
  private isTypewriterComplete = false;

  private constructor() {
    this.dialogueBanner = document.getElementById('dialogueBanner');
    this.dialogueSpeaker = document.getElementById('dialogueSpeaker');
    this.dialogueText = document.getElementById('dialogueText');
    this.dialogueChoicesContainer = document.getElementById('dialogueChoices');
    this.letterboxTop = document.getElementById('letterboxTop');
    this.letterboxBottom = document.getElementById('letterboxBottom');

    // Diyalog şeridine dokununca yazıyı anında tamamla
    if (this.dialogueBanner) {
      this.dialogueBanner.addEventListener('click', (e) => {
        // Eğer bir seçeneğe tıklanmadıysa yazıyı hızlandır
        if ((e.target as HTMLElement).tagName !== 'BUTTON') {
          this.completeTypewriterInstant();
        }
      });
    }
  }

  public static getInstance(): DialogueManager {
    if (!DialogueManager.instance) {
      DialogueManager.instance = new DialogueManager();
    }
    return DialogueManager.instance;
  }

  public setLivePortrait(portrait: Live3DPortrait): void {
    this.livePortrait = portrait;
  }

  /**
   * Belirli bir diyalog düğümünü konuşmacının 3D başlık noduyla başlatır
   */
  public startDialogue(startNodeId: string, speakerNode?: TransformNode): void {
    const node = DIALOGUE_NODES[startNodeId];
    if (!node) return;

    this.isDialogueActive = true;
    this.currentSpeakerNode = speakerNode || null;

    // Canlı 3D Portreyi Aç
    if (this.livePortrait && speakerNode) {
      this.livePortrait.activate(speakerNode);
    }

    this.showNode(node);
    ProceduralAudio.playButtonClick();
  }

  public showNode(node: DialogueNode): void {
    this.currentNode = node;

    if (this.dialogueBanner && this.dialogueSpeaker && this.dialogueText) {
      this.dialogueSpeaker.textContent = `${node.speaker}:`;
      this.dialogueBanner.style.display = 'flex';

      // 2.39:1 Sinematik Letterbox'ı aç
      if (this.letterboxTop && this.letterboxBottom) {
        this.letterboxTop.classList.add('active');
        this.letterboxBottom.classList.add('active');
      }

      // Daktilo Efektini Başlat
      this.startTypewriter(node.text, () => {
        // Yazı bittiğinde seçenekleri göster
        this.renderChoices(node.choices, !!node.isEnd);
      });
    }
  }

  /**
   * Daktilo Yazı Efekti (~22ms aralıkla harf harf ekleme)
   */
  private startTypewriter(text: string, onComplete: () => void): void {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.fullText = text;
    this.displayedCharIndex = 0;
    this.isTypewriterComplete = false;

    if (this.dialogueText) {
      this.dialogueText.textContent = '';
    }
    if (this.dialogueChoicesContainer) {
      this.dialogueChoicesContainer.innerHTML = '';
    }

    this.typewriterInterval = window.setInterval(() => {
      this.displayedCharIndex++;

      if (this.dialogueText) {
        this.dialogueText.textContent = this.fullText.substring(0, this.displayedCharIndex);
      }

      // Her 2 harfte bir hafif tık sesi
      if (this.displayedCharIndex % 2 === 0) {
        ProceduralAudio.playTypewriterTick();
      }

      if (this.displayedCharIndex >= this.fullText.length) {
        this.completeTypewriterInstant();
        onComplete();
      }
    }, 22);
  }

  private completeTypewriterInstant(): void {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    if (this.dialogueText) {
      this.dialogueText.textContent = this.fullText;
    }
    this.isTypewriterComplete = true;

    if (this.currentNode) {
      this.renderChoices(this.currentNode.choices, !!this.currentNode.isEnd);
    }
  }

  /**
   * Koşulları değerlendirerek seçenekleri oluşturur
   */
  private renderChoices(choices?: DialogueChoice[], isEnd?: boolean): void {
    if (!this.dialogueChoicesContainer) return;
    this.dialogueChoicesContainer.innerHTML = '';

    if (isEnd || !choices || choices.length === 0) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'dialogue-choice-btn';
      closeBtn.innerHTML = '▶ <span>Tamam (Ayrıl)</span>';
      closeBtn.onclick = () => this.closeDialogue();
      this.dialogueChoicesContainer.appendChild(closeBtn);
      return;
    }

    const questMgr = QuestManager.getInstance();

    // Koşul filtresi
    const validChoices = choices.filter((c) => {
      if (!c.condition) return true;
      const cond = c.condition;

      if (cond.questId && cond.questState) {
        const q = questMgr.quests.find((item) => item.id === cond.questId);
        if (!q || q.state !== cond.questState) {
          return false;
        }
      }
      return true;
    });

    if (validChoices.length === 0) {
      const defaultClose = document.createElement('button');
      defaultClose.className = 'dialogue-choice-btn';
      defaultClose.innerHTML = '▶ <span>Görüşmek üzere.</span>';
      defaultClose.onclick = () => this.closeDialogue();
      this.dialogueChoicesContainer.appendChild(defaultClose);
      return;
    }

    validChoices.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-choice-btn';
      btn.innerHTML = `▶ <span>${c.text}</span>`;
      btn.onclick = () => {
        ProceduralAudio.playButtonClick();
        if (c.action) {
          this.handleAction(c.action);
        }
        const next = DIALOGUE_NODES[c.nextNodeId];
        if (next) {
          this.showNode(next);
        } else {
          this.closeDialogue();
        }
      };
      this.dialogueChoicesContainer!.appendChild(btn);
    });
  }

  private handleAction(action: string): void {
    if (action.startsWith('quest:accept:')) {
      const questId = action.replace('quest:accept:', '');
      EventBus.emit('quest:started', { questId });
    } else if (action.startsWith('quest:advance:')) {
      const questId = action.replace('quest:advance:', '');
      QuestManager.getInstance().advanceProgress(questId, 1);
    } else if (action.startsWith('quest:complete:')) {
      const questId = action.replace('quest:complete:', '');
      EventBus.emit('quest:completed', { questId });
    } else if (action === 'reward:sword_damage_boost') {
      EventBus.emit('ui:loot_toast', { text: '⚔️ Kılıç Hasarı Artırıldı! (+10 Keskinlik)' });
      ProceduralAudio.playQuestComplete();
    } else if (action === 'reward:fire_arrows') {
      EventBus.emit('ui:loot_toast', { text: '🔥 Ateş Temrenleri Açıldı!' });
      ProceduralAudio.playQuestComplete();
    } else if (action === 'reward:quiver_upgrade') {
      EventBus.emit('ui:loot_toast', { text: '🏹 Sadak Kapasitesi 45 Oka Çıkarıldı!' });
      ProceduralAudio.playQuestComplete();
    } else if (action === 'moral:oath_kept') {
      EventBus.emit('story:sahmaran_moral_choice', { choice: 'OATH_KEPT' });
    } else if (action === 'moral:tribe_first') {
      EventBus.emit('story:sahmaran_moral_choice', { choice: 'TRIBE_FIRST' });
    }
  }

  public closeDialogue(): void {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.isDialogueActive = false;
    this.currentNode = null;
    this.currentSpeakerNode = null;

    // Canlı 3D Portreyi Kapat
    if (this.livePortrait) {
      this.livePortrait.deactivate();
    }

    if (this.dialogueBanner) {
      this.dialogueBanner.style.display = 'none';
    }
    if (this.dialogueChoicesContainer) {
      this.dialogueChoicesContainer.innerHTML = '';
    }
    if (this.letterboxTop && this.letterboxBottom) {
      this.letterboxTop.classList.remove('active');
      this.letterboxBottom.classList.remove('active');
    }

    EventBus.emit('ui:dialogue_hide');
  }
}
