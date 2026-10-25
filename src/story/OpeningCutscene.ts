/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Açılış Sinematiği Yöneticisi (OpeningCutscene)
 * (3D Kamera Yolu, DOM Altyazı & Daktilo, Atlanabilir 'ATLA', Müzikal Fanfar, 2.39:1 Letterbox & Sıfır GC)
 */

import { Scene, Vector3, Scalar } from '@babylonjs/core';
import { CameraRig } from '../core/CameraRig';
import { WorldManager } from '../world/WorldManager';
import { AyazModel } from '../player/AyazModel';
import { BoruCompanion } from '../player/BoruCompanion';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { AchievementManager } from './AchievementManager';

export interface CutsceneWaypoint {
  time: number;
  camPos: Vector3;
  targetPos: Vector3;
  subtitle: string;
  speaker: string;
}

export class OpeningCutscene {
  public isRunning = false;
  private timer = 0;
  private readonly TOTAL_DURATION = 18.0;

  private waypoints: CutsceneWaypoint[] = [];

  // DOM Referansları
  private container: HTMLElement | null;
  private subtitleText: HTMLElement | null;
  private subtitleSpeaker: HTMLElement | null;
  private skipBtn: HTMLElement | null;
  private letterboxTop: HTMLElement | null;
  private letterboxBottom: HTMLElement | null;

  // Sıcak döngüde sıfır bellek tahsis scratch vektörleri
  private scratchCamPos = new Vector3(0, 0, 0);
  private scratchTargetPos = new Vector3(0, 0, 0);

  private lastPlayedPhase = -1;

  constructor(
    private scene: Scene,
    private cameraRig: CameraRig,
    private world: WorldManager,
    private ayaz: AyazModel,
    private boru: BoruCompanion
  ) {
    this.container = document.getElementById('cutsceneOverlay');
    this.subtitleText = document.getElementById('cutsceneSubtitleText');
    this.subtitleSpeaker = document.getElementById('cutsceneSubtitleSpeaker');
    this.skipBtn = document.getElementById('btnSkipCutscene');
    this.letterboxTop = document.getElementById('letterboxTop');
    this.letterboxBottom = document.getElementById('letterboxBottom');

    this.initWaypoints();

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => {
        this.skip();
      });
    }
  }

  private initWaypoints(): void {
    // 1. Faz (0s - 4.5s): Yanan Ötüken Obası üzerinden yüksek süzülüş
    this.waypoints.push({
      time: 0.0,
      camPos: new Vector3(25, 22, -35),
      targetPos: new Vector3(0, 3, 0),
      speaker: 'Anlatıcı',
      subtitle: 'Kara Kış bastırdı... Erlik Han’ın körmözleri barış içindeki Ötüken Obası’nı ateşe verdi.'
    });

    // 2. Faz (4.5s - 9.0s): Yaralı Korkut Ata ve Bay Terek dibi
    this.waypoints.push({
      time: 4.5,
      camPos: new Vector3(-2, 4.5, 12),
      targetPos: new Vector3(-2.5, 1.2, 18),
      speaker: 'Ulu Kam Korkut Ata',
      subtitle: 'Kut parçalandı Ayaz... Yer, Ateş, Su, Gök... Dört bir yana saçıldı... Bay Terek kuruyor...'
    });

    // 3. Faz (9.0s - 13.5s): Kaya üzerindeki Gök Kurt Börü ve Gök Tengri uluması
    this.waypoints.push({
      time: 9.0,
      camPos: new Vector3(-6, 3.8, -4),
      targetPos: new Vector3(-2.5, 2.2, -2.0),
      speaker: 'Börü',
      subtitle: 'Gök Tengri’nin gök yeleli elçisi Börü, kadim sadakatiyle ulu kurt ulumasını göklere saldı.'
    });

    // 4. Faz (13.5s - 18.0s): Ayaz kılıcını toprağa saplar ve yemin eder
    this.waypoints.push({
      time: 13.5,
      camPos: new Vector3(1.4, 2.2, -2.4),
      targetPos: new Vector3(0, 1.4, 0),
      speaker: 'Kam Çırağı Ayaz',
      subtitle: 'Ant olsun ataların kemiklerine, ant olsun Gök Tengri’ye! Kut’un dört parçasını toplayıp obayı dirilteceğim!'
    });
  }

  public start(): void {
    this.isRunning = true;
    this.timer = 0;
    this.lastPlayedPhase = -1;

    if (this.container) {
      this.container.classList.add('active');
    }
    if (this.letterboxTop && this.letterboxBottom) {
      this.letterboxTop.classList.add('active');
      this.letterboxBottom.classList.add('active');
    }

    // Börü'yü sinematik başlangıç kayasına koy ve ulut
    this.boru.root.position.set(-2.5, this.world.getHeightAt(-2.5, -2.0), -2.0);

    // İlk ses efekti
    ProceduralAudio.playBeaconHum();
  }

  public update(deltaTime: number): void {
    if (!this.isRunning) return;

    this.timer += deltaTime;

    if (this.timer >= this.TOTAL_DURATION) {
      this.finish();
      return;
    }

    // Aktif Waypoint Aralığını Bul
    let curWp = this.waypoints[0];
    let nextWp = this.waypoints[1];

    for (let i = 0; i < this.waypoints.length - 1; i++) {
      if (this.timer >= this.waypoints[i].time && this.timer < this.waypoints[i + 1].time) {
        curWp = this.waypoints[i];
        nextWp = this.waypoints[i + 1];
        break;
      } else if (i === this.waypoints.length - 2 && this.timer >= this.waypoints[i + 1].time) {
        curWp = this.waypoints[i + 1];
        nextWp = this.waypoints[i + 1];
      }
    }

    // Zaman normalizasyonu
    const span = Math.max(0.1, nextWp.time - curWp.time);
    const alpha = Math.min(1.0, Math.max(0.0, (this.timer - curWp.time) / span));
    // Smoothstep eğrisi
    const smoothT = alpha * alpha * (3 - 2 * alpha);

    Vector3.LerpToRef(curWp.camPos, nextWp.camPos, smoothT, this.scratchCamPos);
    Vector3.LerpToRef(curWp.targetPos, nextWp.targetPos, smoothT, this.scratchTargetPos);

    // Kamerayı konumlandır
    this.cameraRig.camera.position.copyFrom(this.scratchCamPos);
    this.cameraRig.camera.setTarget(this.scratchTargetPos);

    // Altyazı ve Olay Tetiklemeleri
    const phaseIndex = this.waypoints.indexOf(curWp);
    if (phaseIndex !== this.lastPlayedPhase) {
      this.lastPlayedPhase = phaseIndex;
      this.displaySubtitle(curWp.speaker, curWp.subtitle);

      if (phaseIndex === 2) {
        // Börü uluma sesi
        this.boru.triggerHowl('secret');
      } else if (phaseIndex === 3) {
        // Ayaz yemin fanfarı
        ProceduralAudio.playOathFanfare();
      }
    }
  }

  private displaySubtitle(speaker: string, text: string): void {
    if (this.subtitleSpeaker && this.subtitleText) {
      this.subtitleSpeaker.textContent = speaker;
      this.subtitleText.textContent = text;
      ProceduralAudio.playTypewriterTick();
    }
  }

  public skip(): void {
    if (!this.isRunning) return;
    ProceduralAudio.playButtonClick();
    this.finish();
  }

  public finish(): void {
    this.isRunning = false;

    if (this.container) {
      this.container.classList.remove('active');
    }
    if (this.letterboxTop && this.letterboxBottom) {
      this.letterboxTop.classList.remove('active');
      this.letterboxBottom.classList.remove('active');
    }

    // Kamerayı oyuncuya yumuşakça hizala
    this.cameraRig.recenter(this.ayaz.root.rotation.y);

    // İlk ana görevi başlat: Kül Olan Oba
    EventBus.emit('quest:started', { questId: 'quest_kul_olan_oba' });
    EventBus.emit('cutscene:ended');
    AchievementManager.getInstance().unlock('ACH_OATH');

    // Bildirim
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Börü',
      text: 'Oba dumanlar altında Ayaz! Önce yaralı oba halkına el uzatmalı ve Kam Ata’nın kutsal kemerini bulmalıyız!'
    });
  }
}
