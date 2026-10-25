/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Şahmaran Arınışı ve SU KUTU Edinimi Ara Sahnesi (SahmaranCutscenes)
 * (3D Sinematik Kamera Yolu, DOM Altyazı & Daktilo, Zehir Arınması,
 *  Kopuz Su Ezgisi Tınısı, SU KUTU ve Bay Terek İyileşme Fazı 3 & Sıfır GC)
 */

import { Scene, Vector3, Scalar } from '@babylonjs/core';
import { CameraRig } from '../core/CameraRig';
import { WorldManager } from '../world/WorldManager';
import { KamPowerManager } from '../powers/KamPowerManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface SahmaranWaypoint {
  time: number;
  camPos: Vector3;
  targetPos: Vector3;
  speaker: string;
  subtitle: string;
}

export class SahmaranCutscenes {
  public isRunning = false;
  private timer = 0;
  private readonly TOTAL_DURATION = 14.0;

  private waypoints: SahmaranWaypoint[] = [];

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
    // 1. Faz (0s - 4.5s): Şahmaran'ın başındaki zehirli sisin dağılışı ve zümrüt gözler
    this.waypoints.push({
      time: 0.0,
      camPos: new Vector3(-135, -8.0, -35),
      targetPos: new Vector3(-130, -7.0, -45),
      speaker: 'Şahmaran (Su İyesi)',
      subtitle: 'Zehir dindi... Asırlardır ilk defa gölün berrak ve kutsal nefesini duyuyorum küçük kam...'
    });

    // 2. Faz (4.5s - 9.0s): Kutsal arıtıcı pınarların fışkırması, gölün turkuaza dönüşü
    this.waypoints.push({
      time: 4.5,
      camPos: new Vector3(-115, 2.0, -30),
      targetPos: new Vector3(-130, 0.0, -45),
      speaker: 'Bilge Lokman Hekim',
      subtitle: 'Kutsal pınarlar çağladı! Ötüken’in can damarı yeniden saf ve lekesiz akıyor!'
    });

    // 3. Faz (9.0s - 14.0s): Şahmaran'ın tacından SU KUTU'nun ayrılıp Ayaz'a sunulması
    this.waypoints.push({
      time: 9.0,
      camPos: new Vector3(-128, -9.5, -42),
      targetPos: new Vector3(-130, -10.0, -45),
      speaker: 'Şahmaran (Su İyesi)',
      subtitle: 'Al bu kutsal SU KUTU’nu. Artık hiçbir derinlik nefesini kesemez; sular yaralarını saracak!'
    });
  }

  public startCutscene(playerPos: Vector3): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.timer = 0;
    this.lastPlayedPhase = -1;

    EventBus.emit('cutscene:start');

    if (this.container) {
      this.container.style.display = 'block';
    }
    if (this.letterboxTop && this.letterboxBottom) {
      this.letterboxTop.style.transform = 'translateY(0%)';
      this.letterboxBottom.style.transform = 'translateY(0%)';
    }

    ProceduralAudio.playBeaconHum();
  }

  public update(deltaTime: number): void {
    if (!this.isRunning) return;

    this.timer += deltaTime;

    if (this.timer >= this.TOTAL_DURATION) {
      this.finish();
      return;
    }

    // Waypoint interpolasyonu
    let curWp = this.waypoints[0];
    let nxtWp = this.waypoints[0];
    let localT = 0;

    for (let i = 0; i < this.waypoints.length; i++) {
      if (this.timer >= this.waypoints[i].time) {
        curWp = this.waypoints[i];
        if (i < this.waypoints.length - 1) {
          nxtWp = this.waypoints[i + 1];
          const span = nxtWp.time - curWp.time;
          localT = Math.min(1.0, (this.timer - curWp.time) / span);
        } else {
          nxtWp = curWp;
          localT = 1.0;
        }

        if (this.lastPlayedPhase !== i) {
          this.lastPlayedPhase = i;
          this.showSubtitle(curWp.speaker, curWp.subtitle);
          if (i === 1) {
            ProceduralAudio.playWaterSplash();
          } else if (i === 2) {
            ProceduralAudio.playKutAcquired();
          }
        }
      }
    }

    // Kamera hareketi
    Vector3.LerpToRef(curWp.camPos, nxtWp.camPos, localT, this.scratchCamPos);
    Vector3.LerpToRef(curWp.targetPos, nxtWp.targetPos, localT, this.scratchTargetPos);

    this.cameraRig.camera.position.copyFrom(this.scratchCamPos);
    this.cameraRig.camera.setTarget(this.scratchTargetPos);
  }

  private showSubtitle(speaker: string, text: string): void {
    if (this.subtitleSpeaker) {
      this.subtitleSpeaker.textContent = speaker;
    }
    if (this.subtitleText) {
      this.subtitleText.textContent = text;
    }
  }

  public skip(): void {
    if (!this.isRunning) return;
    this.finish();
  }

  private finish(): void {
    this.isRunning = false;

    if (this.container) {
      this.container.style.display = 'none';
    }
    if (this.letterboxTop && this.letterboxBottom) {
      this.letterboxTop.style.transform = 'translateY(-100%)';
      this.letterboxBottom.style.transform = 'translateY(100%)';
    }

    // SU KUTU KAZANIMI & DÜNYA İYİLEŞMESİ (3. FAZ)
    this.kamPower.hasSuKutu = true;
    ProceduralAudio.playShrineSolvedFanfare();

    EventBus.emit('world:sahmaran_purified');
    EventBus.emit('world:bay_terek_healed', { stage: 3 });
    EventBus.emit('achievement:unlock', { id: 'ach_su_kutu' });
    EventBus.emit('quest:completed', { questId: 'quest_sahmaran_destani' });
    EventBus.emit('ui:loot_toast', { text: '✨ SU KUTU EDİNİLDİ! Sınırsız su altı nefesi ve şifa uyandı.' });
    EventBus.emit('cutscene:end');
  }
}
