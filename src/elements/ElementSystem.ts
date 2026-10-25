/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Veri Tabanlı Element Etkileşim Sistemi (ElementSystem)
 * (Ateş + Otlak = Yangın [WindField yayılımlı], Yangın = Termal Sıcak Hava Akımı [Süzülme yükselir],
 *  Yağmur ateşi söndürür, Ateş + Buz = Erime, Su + Ateş = Buhar, Şimşek metal silahı çeker [Fırtınada uyarı & yıldırım],
 *  Seyrek Izgara, Olay Tabanlı, Chunk Başına Yanma Sınırı & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  ParticleSystem,
  GPUParticleSystem,
  Texture,
  Color4,
  Scalar
} from '@babylonjs/core';
import { WindField } from '../world/WindField';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export type ElementType = 'FIRE' | 'WATER' | 'ICE' | 'WIND' | 'LIGHTNING';

export interface BurnableCell {
  id: string;
  x: number;
  y: number;
  z: number;
  chunkKey: string;
  isBurning: boolean;
  burnTimer: number;       // Saniye cinsinden kalan yanma süresi
  burnDuration: number;    // Toplam yanma süresi (örn. 5 sn)
  spreadCooldown: number;  // Rüzgârla yayılma aralığı
}

export interface IceObject {
  id: string;
  position: Vector3;
  radius: number;
  meltProgress: number;    // 0.0 (tam buz) ile 1.0 (tamamen eridi)
  isMelted: boolean;
  onMelt?: () => void;
}

export interface UpdraftSource {
  position: Vector3;
  radius: number;
  height: number;
  strength: number;
  duration: number;        // Sonsuz için < 0
  elapsed: number;
}

const WHITE_DOT_PNG_16 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==';

export class ElementSystem {
  private static instance: ElementSystem | null = null;
  public scene: Scene;
  private windField: WindField;

  // Seyrek Izgara (Sparse Spatial Hash Grid, hücre boyutu: 4m)
  private readonly CELL_SIZE = 4.0;
  private burnableCells: Map<string, BurnableCell> = new Map();
  private activeBurningKeys: string[] = [];

  // Chunk başına aktif yanabilir hücre sınırı (FPS koruma ve aşırı yayılmayı engelleme)
  private readonly MAX_BURNING_PER_CHUNK = 16;
  private chunkBurningCounts: Map<string, number> = new Map();

  // Buz Nesneleri Kaydı
  public iceObjects: IceObject[] = [];

  // Termal Hava Akımları (Updrafts)
  public updrafts: UpdraftSource[] = [];

  // Parçacık Sistemleri (Ateş, Duman, Buhar, Yıldırım Uyarısı)
  private fireParticles: ParticleSystem | GPUParticleSystem;
  private smokeParticles: ParticleSystem | GPUParticleSystem;
  private steamParticles: ParticleSystem | GPUParticleSystem;
  private sparkParticles: ParticleSystem;

  // Fırtınada Metal Silah Yıldırım Çekme Sayacı
  private lightningWarningTimer = 0;
  private isWarningActive = false;
  private readonly LIGHTNING_STRIKE_TIME = 2.6; // sn
  private lightningSparksPos = new Vector3(0, 0, 0);

  // Sıcak döngüde sıfır GC tahsisi için scratch nesneleri (Rule 7: Zero GC)
  private scratchWind = new Vector3(0, 0, 0);
  private scratchPos = new Vector3(0, 0, 0);
  private scratchDiff = new Vector3(0, 0, 0);

  public static getInstance(scene?: Scene): ElementSystem {
    if (!ElementSystem.instance) {
      if (!scene) throw new Error('[ElementSystem] İlk çağrıda scene parametresi gereklidir.');
      ElementSystem.instance = new ElementSystem(scene);
    }
    return ElementSystem.instance;
  }

  constructor(scene: Scene) {
    this.scene = scene;
    this.windField = WindField.getInstance();

    const particleTex = new Texture(
      WHITE_DOT_PNG_16,
      scene,
      true,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );

    // 1. Ateş Parçacıkları
    if (GPUParticleSystem.IsSupported) {
      this.fireParticles = new GPUParticleSystem('elementFireGpu', { capacity: 600 }, scene);
    } else {
      this.fireParticles = new ParticleSystem('elementFireCpu', 400, scene);
    }
    this.fireParticles.particleTexture = particleTex;
    this.fireParticles.emitter = new Vector3(0, -999, 0);
    this.fireParticles.color1 = new Color4(1.0, 0.55, 0.1, 0.95);
    this.fireParticles.color2 = new Color4(0.95, 0.22, 0.05, 0.85);
    this.fireParticles.colorDead = new Color4(0.3, 0.05, 0.0, 0.0);
    this.fireParticles.minSize = 0.35;
    this.fireParticles.maxSize = 0.95;
    this.fireParticles.minLifeTime = 0.35;
    this.fireParticles.maxLifeTime = 0.75;
    this.fireParticles.emitRate = 0; // Dinamik ayarlanır
    this.fireParticles.direction1 = new Vector3(-0.3, 1.8, -0.3);
    this.fireParticles.direction2 = new Vector3(0.3, 2.8, 0.3);
    this.fireParticles.start();

    // 2. Duman Parçacıkları
    if (GPUParticleSystem.IsSupported) {
      this.smokeParticles = new GPUParticleSystem('elementSmokeGpu', { capacity: 400 }, scene);
    } else {
      this.smokeParticles = new ParticleSystem('elementSmokeCpu', 250, scene);
    }
    this.smokeParticles.particleTexture = particleTex;
    this.smokeParticles.emitter = new Vector3(0, -999, 0);
    this.smokeParticles.color1 = new Color4(0.25, 0.25, 0.25, 0.45);
    this.smokeParticles.color2 = new Color4(0.4, 0.4, 0.4, 0.25);
    this.smokeParticles.colorDead = new Color4(0.1, 0.1, 0.1, 0.0);
    this.smokeParticles.minSize = 0.6;
    this.smokeParticles.maxSize = 1.8;
    this.smokeParticles.minLifeTime = 0.8;
    this.smokeParticles.maxLifeTime = 1.6;
    this.smokeParticles.emitRate = 0;
    this.smokeParticles.direction1 = new Vector3(-0.4, 2.0, -0.4);
    this.smokeParticles.direction2 = new Vector3(0.4, 3.5, 0.4);
    this.smokeParticles.start();

    // 3. Buhar Parçacıkları (Su + Ateş)
    this.steamParticles = new ParticleSystem('elementSteam', 150, scene);
    this.steamParticles.particleTexture = particleTex;
    this.steamParticles.emitter = new Vector3(0, -999, 0);
    this.steamParticles.color1 = new Color4(0.85, 0.92, 1.0, 0.55);
    this.steamParticles.color2 = new Color4(0.7, 0.8, 0.9, 0.3);
    this.steamParticles.colorDead = new Color4(0.9, 0.95, 1.0, 0.0);
    this.steamParticles.minSize = 0.4;
    this.steamParticles.maxSize = 1.4;
    this.steamParticles.minLifeTime = 0.5;
    this.steamParticles.maxLifeTime = 1.1;
    this.steamParticles.emitRate = 0;
    this.steamParticles.direction1 = new Vector3(-0.2, 1.5, -0.2);
    this.steamParticles.direction2 = new Vector3(0.2, 2.5, 0.2);
    this.steamParticles.start();

    // 4. Metal Silah Yıldırım Çıtırtı Parçacığı
    this.sparkParticles = new ParticleSystem('elementSparks', 60, scene);
    this.sparkParticles.particleTexture = particleTex;
    this.sparkParticles.emitter = this.lightningSparksPos;
    this.sparkParticles.color1 = new Color4(0.6, 0.85, 1.0, 0.95);
    this.sparkParticles.color2 = new Color4(0.95, 1.0, 1.0, 0.9);
    this.sparkParticles.colorDead = new Color4(0.2, 0.5, 0.9, 0.0);
    this.sparkParticles.minSize = 0.08;
    this.sparkParticles.maxSize = 0.22;
    this.sparkParticles.minLifeTime = 0.08;
    this.sparkParticles.maxLifeTime = 0.18;
    this.sparkParticles.emitRate = 0;
    this.sparkParticles.direction1 = new Vector3(-1, -1, -1);
    this.sparkParticles.direction2 = new Vector3(1, 1, 1);
    this.sparkParticles.start();
  }

  private getCellKey(x: number, z: number): string {
    const gx = Math.floor(x / this.CELL_SIZE);
    const gz = Math.floor(z / this.CELL_SIZE);
    return `${gx}_${gz}`;
  }

  private getChunkKey(x: number, z: number): string {
    const cx = Math.floor(x / 64.0);
    const cz = Math.floor(z / 64.0);
    return `${cx}_${cz}`;
  }

  /**
   * Belirtilen konum ve yarıçapta yangın başlatır (Ateş + Otlak / Ahşap)
   */
  public igniteAt(pos: Vector3, radius = 2.4): boolean {
    const key = this.getCellKey(pos.x, pos.z);
    const chunk = this.getChunkKey(pos.x, pos.z);

    // Chunk başına yanma sınırı kontrolü
    const currentChunkBurns = this.chunkBurningCounts.get(chunk) || 0;
    if (currentChunkBurns >= this.MAX_BURNING_PER_CHUNK) {
      return false;
    }

    let cell = this.burnableCells.get(key);
    if (!cell) {
      cell = {
        id: key,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        chunkKey: chunk,
        isBurning: true,
        burnTimer: 5.5,
        burnDuration: 5.5,
        spreadCooldown: 1.2
      };
      this.burnableCells.set(key, cell);
      this.activeBurningKeys.push(key);
      this.chunkBurningCounts.set(chunk, currentChunkBurns + 1);
    } else if (!cell.isBurning) {
      cell.isBurning = true;
      cell.burnTimer = 5.5;
      cell.spreadCooldown = 1.2;
      this.activeBurningKeys.push(key);
      this.chunkBurningCounts.set(chunk, currentChunkBurns + 1);
    } else {
      // Zaten yanıyor, süresini tazele
      cell.burnTimer = 5.5;
    }

    ProceduralAudio.playFireWhoosh();
    ProceduralAudio.playBurningCrackle();
    EventBus.emit('element:burn', { x: pos.x, y: pos.y, z: pos.z });

    // Çevredeki buz nesnelerini de kontrol et
    this.meltIceAt(pos, radius + 1.2);

    return true;
  }

  /**
   * Buz nesnelerini eritir (Ateş + Buz = Su/Erime)
   */
  public meltIceAt(pos: Vector3, radius: number): boolean {
    let meltedAny = false;
    for (const ice of this.iceObjects) {
      if (ice.isMelted) continue;
      const dist = Vector3.Distance(pos, ice.position);
      if (dist <= radius + ice.radius) {
        ice.meltProgress = Math.min(1.0, ice.meltProgress + 0.55);
        this.createSteamAt(ice.position, 15);
        ProceduralAudio.playFireSpark();

        if (ice.meltProgress >= 1.0) {
          ice.isMelted = true;
          if (ice.onMelt) ice.onMelt();
          EventBus.emit('element:melt', { x: ice.position.x, y: ice.position.y, z: ice.position.z });
          EventBus.emit('ui:loot_toast', { text: 'Kadim Buz Eriydi! Yol Açıldı.' });
        }
        meltedAny = true;
      }
    }
    return meltedAny;
  }

  /**
   * Su ile ateşi söndürür veya buhar bulutu patlatır (Su + Ateş = Buhar)
   */
  public createSteamAt(pos: Vector3, particleCount = 20): void {
    this.steamParticles.emitter = pos;
    this.steamParticles.manualEmitCount = particleCount;
    ProceduralAudio.playFireSpark();
  }

  /**
   * Geçici veya sürekli yukarı sıcak hava akımı (Updraft) oluşturur
   */
  public createUpdraft(pos: Vector3, radius = 4.2, height = 15.0, duration = 7.5, strength = 12.0): UpdraftSource {
    const updraft: UpdraftSource = {
      position: pos.clone(),
      radius,
      height,
      strength,
      duration,
      elapsed: 0
    };
    this.updrafts.push(updraft);
    ProceduralAudio.playWindUpdraft();
    return updraft;
  }

  /**
   * Oyuncunun termal sıcak hava akımının üstünde olup olmadığını kontrol eder
   */
  public isOverThermalUpdraft(playerPos: Vector3): boolean {
    // 1. Manuel çağrılan updraft'lar
    for (const updraft of this.updrafts) {
      const dx = playerPos.x - updraft.position.x;
      const dz = playerPos.z - updraft.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= updraft.radius * updraft.radius) {
        const dy = playerPos.y - updraft.position.y;
        if (dy >= -0.5 && dy <= updraft.height) {
          return true;
        }
      }
    }

    // 2. Yanan otlak hücrelerinden yükselen sıcak hava akımı
    for (const key of this.activeBurningKeys) {
      const cell = this.burnableCells.get(key);
      if (cell && cell.isBurning) {
        const dx = playerPos.x - cell.x;
        const dz = playerPos.z - cell.z;
        if (dx * dx + dz * dz < 12.0) {
          const dy = playerPos.y - cell.y;
          if (dy >= 0 && dy <= 12.0) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Fırtınada Metal Silah Yıldırım Riski Kontrolü
   */
  public checkMetalLightningRisk(
    playerPos: Vector3,
    hasMetalWeapon: boolean,
    isStorm: boolean,
    deltaTime: number,
    onDirectHit: (damage: number) => void
  ): void {
    if (!isStorm || !hasMetalWeapon) {
      this.lightningWarningTimer = 0;
      this.isWarningActive = false;
      this.sparkParticles.emitRate = 0;
      return;
    }

    // Fırtınada metal silah taşınıyor: Statik elektrik uyarısı başlar!
    this.lightningWarningTimer += deltaTime;
    this.lightningSparksPos.copyFrom(playerPos);
    this.lightningSparksPos.y += 1.4;
    this.sparkParticles.emitRate = 30;

    if (!this.isWarningActive) {
      this.isWarningActive = true;
      ProceduralAudio.playLightningWarning();
      EventBus.emit('element:lightning_warning', {
        isPlayer: true,
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z
      });
      EventBus.emit('ui:loot_toast', { text: '⚡ DİKKAT: Metal Silah Yıldırım Çekiyor! Yaya Geçin!' });
    }

    // Belirli aralıklarla çıtırtı sesi
    if (Math.random() < 0.12) {
      ProceduralAudio.playLightningWarning();
    }

    // Süre dolunca doğrudan yıldırım çarpar
    if (this.lightningWarningTimer >= this.LIGHTNING_STRIKE_TIME) {
      this.lightningWarningTimer = 0;
      this.isWarningActive = false;
      this.sparkParticles.emitRate = 0;
      ProceduralAudio.playLightningStrike();
      this.igniteAt(playerPos, 3.5);
      onDirectHit(45); // 45 can hasarı
    }
  }

  /**
   * Ana Güncelleme Döngüsü (Her kare çağrılır)
   */
  public update(deltaTime: number, isRaining: boolean, wetness: number): void {
    // 1. Yangın Hücrelerinin Yönetimi ve Rüzgârla Yayılımı
    const activeLen = this.activeBurningKeys.length;
    let particlesNeeded = 0;

    for (let i = activeLen - 1; i >= 0; i--) {
      const key = this.activeBurningKeys[i];
      const cell = this.burnableCells.get(key);
      if (!cell || !cell.isBurning) {
        this.activeBurningKeys.splice(i, 1);
        continue;
      }

      // Yağmur ateşi 6 kat daha hızlı söndürür (Su + Ateş etkileşimi)
      const burnSpeed = (isRaining || wetness > 0.35) ? 6.0 : 1.0;
      cell.burnTimer -= deltaTime * burnSpeed;

      // Parçacık vericisi son yanan hücre konumuna yerleştirilir
      this.fireParticles.emitter = new Vector3(cell.x, cell.y + 0.4, cell.z);
      this.smokeParticles.emitter = new Vector3(cell.x, cell.y + 1.2, cell.z);
      particlesNeeded += 45;

      // Rüzgâr yönünde komşu hücrelere yayılma (Fire Spread)
      cell.spreadCooldown -= deltaTime;
      if (cell.spreadCooldown <= 0 && !isRaining && wetness < 0.25) {
        cell.spreadCooldown = 2.2;
        this.windField.getWindAt(this.scratchPos.set(cell.x, cell.y, cell.z), this.scratchWind);

        // Rüzgâr yönüne doğru komşu hücre konumu
        const spreadDist = Math.max(3.0, this.windField.currentSpeed * 0.7);
        const nextX = cell.x + this.windField.direction.x * spreadDist + (Math.random() - 0.5) * 2.0;
        const nextZ = cell.z + this.windField.direction.z * spreadDist + (Math.random() - 0.5) * 2.0;

        // Rastgele yayılma şansı (%40)
        if (Math.random() < 0.40) {
          this.scratchPos.set(nextX, cell.y, nextZ);
          this.igniteAt(this.scratchPos, 1.8);
        }
      }

      // Yanma süresi bitti: Hücre söner ve kül olur
      if (cell.burnTimer <= 0) {
        cell.isBurning = false;
        this.activeBurningKeys.splice(i, 1);

        // Chunk sayacını azalt
        const curCount = this.chunkBurningCounts.get(cell.chunkKey) || 1;
        if (curCount <= 1) {
          this.chunkBurningCounts.delete(cell.chunkKey);
        } else {
          this.chunkBurningCounts.set(cell.chunkKey, curCount - 1);
        }

        // Sönerken hafif buhar/duman
        this.createSteamAt(new Vector3(cell.x, cell.y, cell.z), 12);
      }
    }

    this.fireParticles.emitRate = Math.min(500, particlesNeeded);
    this.smokeParticles.emitRate = Math.min(300, Math.floor(particlesNeeded * 0.65));

    // 2. Termal Hava Akımlarının Süresi
    for (let i = this.updrafts.length - 1; i >= 0; i--) {
      const u = this.updrafts[i];
      if (u.duration > 0) {
        u.elapsed += deltaTime;
        if (u.elapsed >= u.duration) {
          this.updrafts.splice(i, 1);
        }
      }
    }
  }

  /**
   * Belirli bir konumun yakındaki düşmanlara yanma hasarı uygulayıp uygulamadığını sorgular
   */
  public checkBurnDamageAt(pos: Vector3, radius: number): boolean {
    for (const key of this.activeBurningKeys) {
      const cell = this.burnableCells.get(key);
      if (cell && cell.isBurning) {
        const dx = pos.x - cell.x;
        const dz = pos.z - cell.z;
        if (dx * dx + dz * dz <= radius * radius) {
          return true;
        }
      }
    }
    return false;
  }
}
