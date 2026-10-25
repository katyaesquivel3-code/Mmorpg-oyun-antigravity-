/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Su Altı Fiziği, Oksijen Barı & Akıntı Sistemi (UnderwaterSystem)
 * (Yüzme, Derin Dalış, Nefes Çarkı, Islanma/Kuruma Fiziği, Su Altı Işık Huzmeleri / God Rays,
 *  Hava Kabarcığı Bacaları, Su Akıntıları, Kostik Işık Efekti & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  ParticleSystem,
  Texture,
  Scalar
} from '@babylonjs/core';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { KamPowerManager } from '../powers/KamPowerManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface AirBubbleVent {
  id: string;
  position: Vector3;
  radius: number;
  particles: ParticleSystem;
  isActive: boolean;
}

export interface WaterCurrentCorridor {
  id: string;
  startPos: Vector3;
  endPos: Vector3;
  radius: number;
  flowDirection: Vector3;
  flowSpeed: number; // m/s
}

export class UnderwaterSystem {
  private static instance: UnderwaterSystem | null = null;
  public scene: Scene;

  // Su Seviyesi
  public readonly WATER_SURFACE_Y = 0.0;
  public readonly LAKE_BED_Y = -18.0;

  // Oksijen ve Nefes Parametreleri (Nefes Çarkı)
  public oxygen = 100.0;
  public readonly MAX_OXYGEN = 100.0;
  public isDrowning = false;
  private drownDamageTimer = 0.0;

  // Islanma ve Kuruma Sistemi (Wetness)
  public playerWetness = 0.0; // 0.0 (kuru) - 1.0 (sırılsıklam)

  // Ses Durumu
  private wasUnderwater = false;

  // Hava Kabarcığı Pınarları (Oksijen Dolduran Menfezler)
  public bubbleVents: AirBubbleVent[] = [];

  // Yönlendirilmiş Su Akıntı Koridorları (Water Currents)
  public currentCorridors: WaterCurrentCorridor[] = [];

  // Su Altı Işık Huzmeleri (Volumetric God Rays)
  public godRayMeshes: Mesh[] = [];
  private matGodRay: StandardMaterial | null = null;

  // Su Altı Görsel Parçacıkları (Yosun ve Kabarcıklar)
  private ambientBubbleParticles: ParticleSystem | null = null;

  // DOM Arayüz Referansları
  private underwaterOverlay: HTMLElement | null = null;
  private oxygenBadge: HTMLElement | null = null;
  private oxygenValue: HTMLElement | null = null;
  private breathWheelCircle: SVGPathElement | null = null;
  private wetnessBadge: HTMLElement | null = null;
  private wetnessValue: HTMLElement | null = null;

  // Animasyon Zamanlayıcısı
  private animTimer = 0.0;

  // Sıcak döngü scratch nesneleri (Zero GC)
  private scratchPlayerPos = new Vector3(0, 0, 0);
  private scratchFlow = new Vector3(0, 0, 0);

  public static getInstance(scene?: Scene): UnderwaterSystem {
    if (!UnderwaterSystem.instance && scene) {
      UnderwaterSystem.instance = new UnderwaterSystem(scene);
    }
    return UnderwaterSystem.instance!;
  }

  constructor(scene: Scene) {
    this.scene = scene;
    UnderwaterSystem.instance = this;

    this.underwaterOverlay = document.getElementById('underwaterCausticOverlay');
    this.oxygenBadge = document.getElementById('oxygenBadge');
    this.oxygenValue = document.getElementById('oxygenValue');
    this.breathWheelCircle = document.getElementById('breathWheelCircle') as unknown as SVGPathElement;
    this.wetnessBadge = document.getElementById('wetnessBadge');
    this.wetnessValue = document.getElementById('wetnessValue');

    this.initDefaultBubbleVents();
    this.initDefaultCurrents();
    this.initUnderwaterGodRays();
    this.createAmbientBubbleParticles();
  }

  /**
   * Şahmaran Gölü'nün derinliklerindeki antik oksijen kabarcık menfezleri
   */
  private initDefaultBubbleVents(): void {
    const ventLocations = [
      new Vector3(-95, -14.5, -45),
      new Vector3(-130, -16.0, -70),
      new Vector3(-165, -15.0, -30),
      new Vector3(-110, -12.5, 10),
      new Vector3(-140, -14.0, 35)
    ];

    ventLocations.forEach((pos, idx) => {
      // 3D Taş Menfez Ağzı
      const ventMesh = MeshBuilder.CreateCylinder(`vent_mesh_${idx}`, { diameter: 2.2, height: 0.6, tessellation: 8 }, this.scene);
      ventMesh.position.copyFrom(pos);
      const ventMat = new StandardMaterial(`mat_vent_${idx}`, this.scene);
      ventMat.diffuseColor = new Color3(0.2, 0.45, 0.4);
      ventMat.emissiveColor = new Color3(0.05, 0.2, 0.25);
      ventMat.freeze();
      ventMesh.material = ventMat;

      // Yükselen Hava Kabarcığı Parçacıkları
      const ps = new ParticleSystem(`vent_ps_${idx}`, 60, this.scene);
      ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==', this.scene);
      ps.emitter = pos.clone().add(new Vector3(0, 0.4, 0));
      ps.minEmitBox = new Vector3(-0.6, 0, -0.6);
      ps.maxEmitBox = new Vector3(0.6, 0, 0.6);
      ps.color1 = new Color3(0.6, 0.95, 1.0).toColor4(0.85);
      ps.color2 = new Color3(0.3, 0.8, 0.9).toColor4(0.5);
      ps.minSize = 0.25;
      ps.maxSize = 0.65;
      ps.minLifeTime = 2.5;
      ps.maxLifeTime = 4.5;
      ps.emitRate = 22;
      ps.direction1 = new Vector3(-0.15, 1.0, -0.15);
      ps.direction2 = new Vector3(0.15, 1.0, 0.15);
      ps.minEmitPower = 3.5;
      ps.maxEmitPower = 5.5;
      ps.gravity = new Vector3(0, 4.0, 0); // Su içinde yukarı yükselir
      ps.start();

      this.bubbleVents.push({
        id: `vent_${idx}`,
        position: pos,
        radius: 3.5,
        particles: ps,
        isActive: true
      });
    });
  }

  /**
   * Su Akıntı Koridorları (Batık tapınak tünelleri ve kanyon akıntıları)
   */
  private initDefaultCurrents(): void {
    // 1. Batık Tapınak Giriş Akıntısı (Güneydoğudan Kuzeybatıya doğru güçlü akış)
    const dir1 = new Vector3(-1, 0, -0.5).normalize();
    this.currentCorridors.push({
      id: 'current_temple_channel',
      startPos: new Vector3(-80, -10, -20),
      endPos: new Vector3(-130, -10, -50),
      radius: 6.5,
      flowDirection: dir1,
      flowSpeed: 7.5
    });

    // 2. Şahmaran Mağarası Girdap Akıntısı (Merkezi çukura doğru çekim)
    const dir2 = new Vector3(-0.3, 0, -1).normalize();
    this.currentCorridors.push({
      id: 'current_cave_whirlpool',
      startPos: new Vector3(-120, -12, 10),
      endPos: new Vector3(-125, -12, -25),
      radius: 8.0,
      flowDirection: dir2,
      flowSpeed: 6.0
    });
  }

  /**
   * Su Altı Işık Huzmeleri (Volumetric God Rays)
   * Su yüzeyinden göl tabanına süzülen parlak ışık demetleri
   */
  private initUnderwaterGodRays(): void {
    this.matGodRay = new StandardMaterial('mat_underwater_godray', this.scene);
    this.matGodRay.diffuseColor = new Color3(0.25, 0.85, 0.95);
    this.matGodRay.emissiveColor = new Color3(0.18, 0.65, 0.8);
    this.matGodRay.alpha = 0.18;
    this.matGodRay.backFaceCulling = false;

    const rayLocations = [
      new Vector3(-90, -8.0, -35),
      new Vector3(-115, -9.0, -55),
      new Vector3(-135, -9.5, -20),
      new Vector3(-150, -8.5, -60),
      new Vector3(-105, -7.5, 5),
      new Vector3(-125, -8.0, 25)
    ];

    rayLocations.forEach((pos, idx) => {
      const ray = MeshBuilder.CreateCylinder(`godray_${idx}`, {
        diameterTop: 2.5,
        diameterBottom: 8.0,
        height: 16.0,
        tessellation: 8
      }, this.scene);
      ray.position.copyFrom(pos);
      ray.rotation.x = 0.22;
      ray.rotation.z = -0.15;
      ray.material = this.matGodRay;
      ray.isPickable = false;
      this.godRayMeshes.push(ray);
    });
  }

  private createAmbientBubbleParticles(): void {
    const ps = new ParticleSystem('ambient_underwater_bubbles', 80, this.scene);
    ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==', this.scene);
    ps.emitter = new Vector3(-130, -8, -40);
    ps.minEmitBox = new Vector3(-90, -8, -90);
    ps.maxEmitBox = new Vector3(90, 6, 90);
    ps.color1 = new Color3(0.5, 0.85, 0.95).toColor4(0.4);
    ps.color2 = new Color3(0.2, 0.6, 0.8).toColor4(0.1);
    ps.minSize = 0.15;
    ps.maxSize = 0.4;
    ps.minLifeTime = 3.0;
    ps.maxLifeTime = 6.0;
    ps.emitRate = 25;
    ps.gravity = new Vector3(0, 2.5, 0);
    ps.start();
    this.ambientBubbleParticles = ps;
  }

  /**
   * Her Kare Su Altı Fiziği, Oksijen Tüketimi ve Akıntı İtmesi (Sıfır GC)
   */
  public update(
    deltaTime: number,
    player: PlayerController,
    combat: CombatSystem,
    kamPower: KamPowerManager
  ): void {
    this.scratchPlayerPos.copyFrom(player.position);
    this.animTimer += deltaTime;

    // Su Altı Durumu Kontrolü (Göz seviyesi suyun altında mı?)
    const isUnderwater = this.scratchPlayerPos.y < this.WATER_SURFACE_Y - 0.4;

    // Suya Giriş / Çıkış Ses ve Filtre Yönetimi (Low-Pass Filter)
    if (isUnderwater !== this.wasUnderwater) {
      this.wasUnderwater = isUnderwater;
      ProceduralAudio.setUnderwaterMode(isUnderwater);
      if (isUnderwater) {
        ProceduralAudio.playWaterSplash();
      }
    }

    // 1. Islanma ve Kuruma Sistemi (Wetness)
    if (isUnderwater || player.locomotionState === 'SWIM') {
      this.playerWetness = 1.0;
    } else if (this.playerWetness > 0.0) {
      this.playerWetness = Math.max(0.0, this.playerWetness - deltaTime / 16.0); // 16 sn içinde kurur
    }

    if (this.wetnessBadge) {
      if (this.playerWetness > 0.05 && !isUnderwater) {
        this.wetnessBadge.style.display = 'inline-flex';
        if (this.wetnessValue) {
          this.wetnessValue.textContent = `${Math.round(this.playerWetness * 100)}%`;
        }
      } else {
        this.wetnessBadge.style.display = 'none';
      }
    }

    // 2. DOM Su Altı Kostik Filtresi
    if (this.underwaterOverlay) {
      this.underwaterOverlay.style.display = isUnderwater ? 'block' : 'none';
    }

    // 3. Su Altı Işık Huzmelerini Dalgalandır
    if (this.matGodRay && this.godRayMeshes.length > 0) {
      this.matGodRay.alpha = 0.16 + Math.sin(this.animTimer * 1.8) * 0.06;
    }

    // 4. Oksijen ve Nefes Mekaniği (Nefes Çarkı)
    if (isUnderwater) {
      if (this.oxygenBadge) this.oxygenBadge.style.display = 'inline-flex';

      // SU KUTU Pasifi Varsa: Sınırsız Oksijen ve Su Şifası!
      if (kamPower.hasSuKutu) {
        this.oxygen = 100.0;
        this.isDrowning = false;
        // Su içinde pasif can yenilenmesi (+6 HP/s)
        if (combat.health < combat.maxHealth) {
          combat.health = Math.min(combat.maxHealth, combat.health + 6.0 * deltaTime);
        }
      } else {
        // Hava Kabarcığı Menfezinde mi? (Oksijen yenilenir)
        let isNearBubbleVent = false;
        for (let i = 0; i < this.bubbleVents.length; i++) {
          const vent = this.bubbleVents[i];
          const dist2D = Math.hypot(
            this.scratchPlayerPos.x - vent.position.x,
            this.scratchPlayerPos.z - vent.position.z
          );
          if (dist2D < vent.radius && this.scratchPlayerPos.y >= vent.position.y) {
            isNearBubbleVent = true;
            this.oxygen = Math.min(this.MAX_OXYGEN, this.oxygen + 45.0 * deltaTime);
            ProceduralAudio.playUnderwaterBubble();
            break;
          }
        }

        if (!isNearBubbleVent) {
          // Oksijen kademeli azalır (~35 saniye toplam nefes süresi)
          const oxygenDepletionRate = 2.85;
          this.oxygen = Math.max(0, this.oxygen - oxygenDepletionRate * deltaTime);
        }

        // Boğulma Hasarı (Oksijen bittiğinde)
        if (this.oxygen <= 0) {
          this.isDrowning = true;
          this.drownDamageTimer += deltaTime;
          if (this.drownDamageTimer >= 1.0) {
            this.drownDamageTimer = 0.0;
            combat.health = Math.max(0, combat.health - 18.0);
            combat.addCameraTrauma(0.5);
            ProceduralAudio.playWaterSplash();
            EventBus.emit('ui:loot_toast', { text: '⚠️ NEFESİN TÜKENDİ! Su yüzeyine çık veya hava pınarı bul!' });
          }
        } else {
          this.isDrowning = false;
          this.drownDamageTimer = 0.0;
        }
      }

      if (this.oxygenValue) {
        this.oxygenValue.textContent = `${Math.round(this.oxygen)}%`;
      }

      // Nefes Çarkı SVG Dairesini Güncelle
      if (this.breathWheelCircle) {
        const pct = Math.max(0, Math.min(100, this.oxygen));
        this.breathWheelCircle.setAttribute('stroke-dasharray', `${pct}, 100`);
        this.breathWheelCircle.setAttribute('stroke', pct < 25 ? '#ef4444' : '#38bdf8');
      }
    } else {
      // Su Yüzeyinde veya Karada: Oksijen hızla dolar
      if (this.oxygen < this.MAX_OXYGEN) {
        this.oxygen = Math.min(this.MAX_OXYGEN, this.oxygen + 50.0 * deltaTime);
        if (this.oxygenValue) {
          this.oxygenValue.textContent = `${Math.round(this.oxygen)}%`;
        }
        if (this.breathWheelCircle) {
          const pct = Math.max(0, Math.min(100, this.oxygen));
          this.breathWheelCircle.setAttribute('stroke-dasharray', `${pct}, 100`);
          this.breathWheelCircle.setAttribute('stroke', '#38bdf8');
        }
      } else if (this.oxygenBadge) {
        this.oxygenBadge.style.display = 'none';
      }
      this.isDrowning = false;
      this.drownDamageTimer = 0.0;
    }

    // 5. Su Akıntı Koridorları (Oyuncuyu akıntı yönünde sürükler)
    if (isUnderwater || player.locomotionState === 'SWIM') {
      for (let i = 0; i < this.currentCorridors.length; i++) {
        const corridor = this.currentCorridors[i];
        const distToStart = Vector3.Distance(this.scratchPlayerPos, corridor.startPos);
        const distToEnd = Vector3.Distance(this.scratchPlayerPos, corridor.endPos);
        const totalSpan = Vector3.Distance(corridor.startPos, corridor.endPos);

        // Koridor segmenti üzerinde mi?
        if (distToStart + distToEnd < totalSpan + corridor.radius) {
          this.scratchFlow.copyFrom(corridor.flowDirection);
          this.scratchFlow.scaleInPlace(corridor.flowSpeed * deltaTime);

          player.position.addInPlace(this.scratchFlow);

          // SU KUTU varsa akıntıya karşı daha rahat yüzer
          if (!kamPower.hasSuKutu && Math.random() < 0.04) {
            EventBus.emit('ui:loot_toast', { text: '🌊 Güçlü su akıntısına kapıldın!' });
          }
        }
      }
    }
  }

  public dispose(): void {
    for (const ray of this.godRayMeshes) {
      ray.dispose();
    }
    this.godRayMeshes = [];
    if (this.matGodRay) {
      this.matGodRay.dispose();
      this.matGodRay = null;
    }
  }
}
