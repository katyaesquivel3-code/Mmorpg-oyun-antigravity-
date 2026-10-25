/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Dinamik Hava Durumu Makinesi & Parçacık Sistemi (WeatherSystem)
 * (CLEAR, RAIN, STORM, SNOW, BLIZZARD, FOG; Şimşek & Gök Gürültüsü, Zemin Islaklık Uniform'u, GPU/CPU Parçacık)
 */

import {
  ParticleSystem,
  GPUParticleSystem,
  Texture,
  Scene,
  Vector3,
  Color4,
  Color3
} from '@babylonjs/core';
import { BiomeData } from './WorldNoise';
import { WindField } from './WindField';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { TerrainMaterialPlugin } from './TerrainMaterialPlugin';

export type WeatherType = 'CLEAR' | 'RAIN' | 'STORM' | 'SNOW' | 'BLIZZARD' | 'FOG';

const WHITE_DOT_PNG_16 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==';

export class WeatherSystem {
  private scene: Scene;
  private particleSystem: ParticleSystem | GPUParticleSystem;
  private particleTexture: Texture;

  public currentWeather: WeatherType = 'CLEAR';
  private targetWeather: WeatherType = 'CLEAR';

  // Zemin Islaklığı (0.0 = Kuru, 1.0 = Yağmurda koyulaşmış ve parlak zemin)
  public wetness = 0.0;
  public terrainPlugin: TerrainMaterialPlugin | null = null;

  // Sis yoğunluğu
  private targetFogDensity = 0.005;

  // Fırtına Şimşek & Gök Gürültüsü Zamanlayıcıları
  private lightningTimer = 0.0;
  private lightningFlashTimer = 0.0;
  private isFlashing = false;

  // Hava Durumu Geçiş Zamanlayıcısı (Rastgele döngü)
  private weatherChangeTimer = 140.0;

  // Rüzgâr Referansı
  private windField: WindField;

  // Sıcak döngüde sıfır GC scratch nesnesi (Rule 7: Zero GC)
  private emitterPos = new Vector3(0, 0, 0);

  constructor(scene: Scene) {
    this.scene = scene;
    this.windField = WindField.getInstance();

    this.particleTexture = new Texture(
      WHITE_DOT_PNG_16,
      scene,
      true,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );
    this.particleTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.particleTexture.wrapV = Texture.CLAMP_ADDRESSMODE;

    // GPU Parçacık Sistemi desteği kontrolü, desteklenmezse CPU yedeği
    if (GPUParticleSystem.IsSupported) {
      this.particleSystem = new GPUParticleSystem('weatherGpuParticles', { capacity: 800 }, scene);
    } else {
      this.particleSystem = new ParticleSystem('weatherCpuParticles', 600, scene);
    }

    this.particleSystem.particleTexture = this.particleTexture;
    this.particleSystem.emitter = this.emitterPos;
    this.particleSystem.minEmitBox = new Vector3(-28, 0, -28);
    this.particleSystem.maxEmitBox = new Vector3(28, 4, 28);

    this.setClearWeather();
    this.particleSystem.start();
  }

  public update(playerPos: Vector3, biome: BiomeData, deltaTime: number): void {
    // Emitter oyuncunun 12 metre yukarısını sıfır GC ile takip eder
    this.emitterPos.x = playerPos.x;
    this.emitterPos.y = playerPos.y + 12;
    this.emitterPos.z = playerPos.z;

    // 1. Hava Durumu Durum Makinesi Zamanlayıcısı
    this.weatherChangeTimer -= deltaTime;
    if (this.weatherChangeTimer <= 0) {
      this.weatherChangeTimer = 120.0 + Math.random() * 80.0;
      this.rollNextWeather(biome);
    }

    // 2. Islaklık Katsayısı Hesaplaması
    if (this.currentWeather === 'RAIN' || this.currentWeather === 'STORM') {
      this.wetness = Math.min(1.0, this.wetness + deltaTime * 0.08);
    } else {
      this.wetness = Math.max(0.0, this.wetness - deltaTime * 0.03);
    }

    if (this.terrainPlugin) {
      this.terrainPlugin.wetness = this.wetness;
    }

    // 3. Fırtına Şimşek & Gök Gürültüsü Mekaniği
    if (this.currentWeather === 'STORM') {
      this.lightningTimer -= deltaTime;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7.0 + Math.random() * 9.0;
        this.triggerLightningFlash();
      }

      if (this.isFlashing) {
        this.lightningFlashTimer -= deltaTime;
        if (this.lightningFlashTimer <= 0) {
          this.isFlashing = false;
          // Gök gürültüsü sesi ışık patlamasından 0.25sn sonra gelir (Ses hızı hissi)
          setTimeout(() => {
            ProceduralAudio.playThunderBoom();
          }, 250);
        }
      }
    }

    // Yumuşak sis yoğunluğu geçişi
    this.scene.fogDensity += (this.targetFogDensity - this.scene.fogDensity) * Math.min(1.0, deltaTime * 1.5);
  }

  /**
   * Biyom ve rastgelelik faktörlerine göre bir sonraki havayı seçer
   */
  private rollNextWeather(biome: BiomeData): void {
    const r = Math.random();

    if (biome.type === 'ALTAY') {
      if (r < 0.55) this.setSnowWeather();
      else if (r < 0.85) this.setBlizzardWeather();
      else this.setFogWeather();
    } else if (biome.type === 'DEMIR_DAG') {
      if (r < 0.5) this.setFogWeather();
      else if (r < 0.8) this.setStormWeather();
      else this.setClearWeather();
    } else if (biome.type === 'SAHMARAN') {
      if (r < 0.45) this.setFogWeather();
      else if (r < 0.75) this.setRainWeather();
      else this.setClearWeather();
    } else {
      // YER_SUB
      if (r < 0.5) this.setClearWeather();
      else if (r < 0.78) this.setRainWeather();
      else if (r < 0.92) this.setStormWeather();
      else this.setFogWeather();
    }
  }

  private triggerLightningFlash(): void {
    this.isFlashing = true;
    this.lightningFlashTimer = 0.09;

    // Şimşek çakışında sahne ışığını anlık patlat
    const originalHemi = this.scene.getLightByName('worldHemi');
    if (originalHemi) {
      originalHemi.intensity = 2.6;
      setTimeout(() => {
        if (originalHemi) originalHemi.intensity = 0.5;
      }, 90);
    }
  }

  public setClearWeather(): void {
    this.currentWeather = 'CLEAR';
    this.targetFogDensity = 0.005;
    this.particleSystem.emitRate = 35;
    this.particleSystem.minSize = 0.08;
    this.particleSystem.maxSize = 0.16;
    this.particleSystem.minLifeTime = 1.8;
    this.particleSystem.maxLifeTime = 3.5;
    this.particleSystem.color1 = new Color4(1.0, 0.95, 0.5, 0.4);
    this.particleSystem.color2 = new Color4(0.85, 1.0, 0.75, 0.1);
    this.particleSystem.direction1.set(-0.8, -0.6, -0.8);
    this.particleSystem.direction2.set(0.8, -1.2, 0.8);
  }

  public setRainWeather(): void {
    this.currentWeather = 'RAIN';
    this.targetFogDensity = 0.012;
    this.particleSystem.emitRate = 380;
    this.particleSystem.minSize = 0.08;
    this.particleSystem.maxSize = 0.18;
    this.particleSystem.minLifeTime = 0.55;
    this.particleSystem.maxLifeTime = 0.95;
    this.particleSystem.color1 = new Color4(0.75, 0.88, 1.0, 0.7);
    this.particleSystem.color2 = new Color4(0.65, 0.8, 0.95, 0.4);
    this.particleSystem.direction1.set(-1.0, -9.0, -1.0);
    this.particleSystem.direction2.set(1.0, -14.0, 1.0);
  }

  public setStormWeather(): void {
    this.currentWeather = 'STORM';
    this.targetFogDensity = 0.022;
    this.lightningTimer = 3.0;
    this.particleSystem.emitRate = 650;
    this.particleSystem.minSize = 0.1;
    this.particleSystem.maxSize = 0.25;
    this.particleSystem.minLifeTime = 0.45;
    this.particleSystem.maxLifeTime = 0.8;
    this.particleSystem.color1 = new Color4(0.65, 0.8, 1.0, 0.85);
    this.particleSystem.color2 = new Color4(0.45, 0.6, 0.8, 0.5);
    this.particleSystem.direction1.set(-3.5, -14.0, -3.5);
    this.particleSystem.direction2.set(2.0, -20.0, 2.0);
  }

  public setSnowWeather(): void {
    this.currentWeather = 'SNOW';
    this.targetFogDensity = 0.014;
    this.particleSystem.emitRate = 320;
    this.particleSystem.minSize = 0.12;
    this.particleSystem.maxSize = 0.3;
    this.particleSystem.minLifeTime = 1.8;
    this.particleSystem.maxLifeTime = 3.8;
    this.particleSystem.color1 = new Color4(0.96, 0.98, 1.0, 0.9);
    this.particleSystem.color2 = new Color4(0.85, 0.92, 1.0, 0.5);
    this.particleSystem.direction1.set(-1.2, -3.8, -1.2);
    this.particleSystem.direction2.set(1.2, -5.5, 1.2);
  }

  public setBlizzardWeather(): void {
    this.currentWeather = 'BLIZZARD';
    this.targetFogDensity = 0.028; // Yoğun beyaz tipi
    this.particleSystem.emitRate = 750;
    this.particleSystem.minSize = 0.15;
    this.particleSystem.maxSize = 0.38;
    this.particleSystem.minLifeTime = 1.2;
    this.particleSystem.maxLifeTime = 2.4;
    this.particleSystem.color1 = new Color4(1.0, 1.0, 1.0, 0.95);
    this.particleSystem.color2 = new Color4(0.9, 0.95, 1.0, 0.7);
    this.particleSystem.direction1.set(-6.5, -5.5, -6.5);
    this.particleSystem.direction2.set(-2.0, -8.0, -2.0);
  }

  public setFogWeather(): void {
    this.currentWeather = 'FOG';
    this.targetFogDensity = 0.024;
    this.particleSystem.emitRate = 75;
    this.particleSystem.minSize = 0.28;
    this.particleSystem.maxSize = 0.65;
    this.particleSystem.minLifeTime = 2.4;
    this.particleSystem.maxLifeTime = 4.6;
    this.particleSystem.color1 = new Color4(0.75, 0.85, 0.95, 0.3);
    this.particleSystem.color2 = new Color4(0.65, 0.75, 0.85, 0.1);
    this.particleSystem.direction1.set(-0.6, -0.4, -0.6);
    this.particleSystem.direction2.set(0.6, -0.8, 0.6);
  }

  public dispose(): void {
    this.particleSystem.dispose();
    this.particleTexture.dispose();
  }
}
