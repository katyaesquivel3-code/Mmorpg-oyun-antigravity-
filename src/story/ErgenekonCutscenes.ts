/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Ergenekon Çıkışı ve TULPAR Edinimi Ara Sahnesi (ErgenekonCutscenes)
 * (3D Sinematik Kamera Yolu, DOM Altyazı & Daktilo, Tulpar İnişi,
 *  Kopuz Ezgisiyle Güven Kazanma, ATEŞ KUTU ve Bay Terek İyileşme Fazı 2 & Sıfır GC)
 */

import { Scene, Vector3, Scalar } from '@babylonjs/core';
import { CameraRig } from '../core/CameraRig';
import { WorldManager } from '../world/WorldManager';
import { MountSystem } from '../mount/MountSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface ErgenekonWaypoint {
  time: number;
  camPos: Vector3;
  targetPos: Vector3;
  speaker: string;
  subtitle: string;
}

export class ErgenekonCutscenes {
  public isRunning = false;
  private timer = 0;
  private readonly TOTAL_DURATION = 15.0;

  private waypoints: ErgenekonWaypoint[] = [];

  // DOM Referansları
  private container: HTMLElement | null;
  private subtitleText: HTMLElement | null;
  private subtitleSpeaker: HTMLElement | null;
  private skipBtn: HTMLElement | null;
  private letterboxTop: HTMLElement | null;
  private letterboxBottom: HTMLElement | null;

  // Scratch vektörler (Sıfır GC)
  private scratchCamPos = new Vector3(0, 0, 0);
  private scratchTargetPos = new Vector3(0, 0, 0);

  private lastPlayedPhase = -1;

  constructor(
    private scene: Scene,
    private cameraRig: CameraRig,
    private world: WorldManager,
    private mountSystem: MountSystem,
    private kamPower: KamPowerManager
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
        if (this.isRunning) {
          this.skip();
        }
      });
    }
  }

  private initWaypoints(): void {
    // 1. Faz (0s - 4.5s): Eriyen devasa demir dağın dumanları arasından göğe bakış
    this.waypoints.push({
      time: 0.0,
      camPos: new Vector3(175, 14, 55),
      targetPos: new Vector3(160, 28, 40),
      speaker: 'Anlatıcı',
      subtitle: 'Demir Dağ eridi... Erlik Han’ın karanlık zincirleri asırların ardından paramparça oldu!'
    });

    // 2. Faz (4.5s - 9.0s): Bulutların arasından süzülen efsanevi kanatlı at TULPAR
    this.waypoints.push({
      time: 4.5,
      camPos: new Vector3(190, 22, 70),
      targetPos: new Vector3(180, 18, 65),
      speaker: 'Börü',
      subtitle: 'Auuuuu! Gök Tengri’nin kanatlı elçisi Tulpar, dağın bağrından özgürlüğe süzülüyor!'
    });

    // 3. Faz (9.0s - 15.0s): Ayaz’ın önüne iniş, Kopuz Tulpar Ezgisi tınısı ve kutsal bağ
    this.waypoints.push({
      time: 9.0,
      camPos: new Vector3(188, 7.5, 76),
      targetPos: new Vector3(185, 6.0, 72),
      speaker: 'Baş Demirci Kızıl Usta',
      subtitle: 'Kopuzun kadim tınısını duydu yiğidim... Artık gökler de bozkır da sana dar gelmeyecek!'
    });
  }

  public startCutscene(playerPos: Vector3): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = 0;
    this.lastPlayedPhase = -1;

    // Tulpar'ı vadinin çıkış noktasına indir
    this.mountSystem.position.set(184, this.world.getHeightAt(184, 72) + 0.5, 72);
    this.mountSystem.tulpar.root.position.copyFrom(this.mountSystem.position);
    this.mountSystem.tulpar.setWingsVisible(true);
    this.mountSystem.tulpar.root.setEnabled(true);

    if (this.container) this.container.style.display = 'block';
    if (this.letterboxTop) this.letterboxTop.style.height = '12vh';
    if (this.letterboxBottom) this.letterboxBottom.style.height = '12vh';

    ProceduralAudio.playWolfHowl();
    EventBus.emit('cutscene:start');
  }

  public update(deltaTime: number): void {
    if (!this.isRunning) return;

    this.timer += deltaTime;

    // Faz Ses ve Efekt Tetikleyicileri
    const currentPhaseIndex = this.waypoints.findIndex((wp, idx) => {
      const nextTime = this.waypoints[idx + 1]?.time ?? this.TOTAL_DURATION;
      return this.timer >= wp.time && this.timer < nextTime;
    });

    if (currentPhaseIndex !== -1 && currentPhaseIndex !== this.lastPlayedPhase) {
      this.lastPlayedPhase = currentPhaseIndex;
      const wp = this.waypoints[currentPhaseIndex];

      if (this.subtitleSpeaker) this.subtitleSpeaker.textContent = wp.speaker;
      if (this.subtitleText) this.subtitleText.textContent = wp.subtitle;

      if (currentPhaseIndex === 1) {
        ProceduralAudio.playTulparWingFlap();
        ProceduralAudio.playWindGust();
      } else if (currentPhaseIndex === 2) {
        // Tulpar Ezgisi (Gök Tengri Makamı)
        ProceduralAudio.playKopuzSong('TENGRI');
      }
    }

    // Kamera Yolu İnterpolasyonu
    if (currentPhaseIndex !== -1) {
      const curWp = this.waypoints[currentPhaseIndex];
      const nextWp = this.waypoints[currentPhaseIndex + 1] ?? curWp;
      const duration = (nextWp.time - curWp.time) || 4.5;
      const t = Math.min(1.0, Math.max(0.0, (this.timer - curWp.time) / duration));

      Vector3.LerpToRef(curWp.camPos, nextWp.camPos, t, this.scratchCamPos);
      Vector3.LerpToRef(curWp.targetPos, nextWp.targetPos, t, this.scratchTargetPos);

      this.cameraRig.camera.position.copyFrom(this.scratchCamPos);
      this.cameraRig.camera.setTarget(this.scratchTargetPos);
    }

    if (this.timer >= this.TOTAL_DURATION) {
      this.endCutscene();
    }
  }

  public skip(): void {
    this.endCutscene();
  }

  private endCutscene(): void {
    this.isRunning = false;

    if (this.container) this.container.style.display = 'none';
    if (this.letterboxTop) this.letterboxTop.style.height = '0px';
    if (this.letterboxBottom) this.letterboxBottom.style.height = '0px';

    // TULPAR'ı kalıcı olarak aç
    this.mountSystem.unlockTulparPermanently();

    // ATEŞ KUTU relikini aç ve Bay Terek'in 2. dalını yeşert
    this.kamPower.hasAtesKutu = true;
    EventBus.emit('world:bay_terek_healed', { stage: 2 });
    EventBus.emit('achievement:unlock', { id: 'FIRE_KUT_CLAIMED' });

    ProceduralAudio.playAchievementFanfare();
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Tengri Fısıltısı',
      text: 'Ergenekon hürriyetine kavuştu! Ateş Kutu yüreğinde harlandı, Bay Terek yeni dallar sürdü!'
    });

    EventBus.emit('cutscene:end');
  }
}
