import {
  ParticleSystem,
  Texture,
  Scene,
  Vector3,
  Color4
} from '@babylonjs/core';
import { BiomeData } from './WorldNoise';

// Valid 16x16 power-of-2 white particle PNG (prevents WebGL mipmap / NPOT errors)
const WHITE_DOT_PNG_16 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==';

export class WeatherSystem {
  private scene: Scene;
  private particleSystem: ParticleSystem;
  private particleTexture: Texture;

  private currentWeather: 'CLEAR' | 'RAIN' | 'SNOW' | 'FOG' = 'CLEAR';
  private targetFogDensity = 0.005;

  constructor(scene: Scene) {
    this.scene = scene;

    // noMipmap = true, invertY = false, NEAREST sampling to strictly avoid glGenerateMipmap errors
    this.particleTexture = new Texture(
      WHITE_DOT_PNG_16,
      scene,
      true, // noMipmap
      false,
      Texture.NEAREST_SAMPLINGMODE
    );
    this.particleTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.particleTexture.wrapV = Texture.CLAMP_ADDRESSMODE;

    this.particleSystem = new ParticleSystem('weatherParticles', 600, scene);
    this.particleSystem.particleTexture = this.particleTexture;
    this.particleSystem.emitter = new Vector3(0, 10, 0);
    this.particleSystem.minEmitBox = new Vector3(-25, 0, -25);
    this.particleSystem.maxEmitBox = new Vector3(25, 4, 25);

    // Default: light clear breeze
    this.setClear();
    this.particleSystem.start();
  }

  public update(playerPos: Vector3, biome: BiomeData, deltaTime: number): void {
    // Emitter follows above player head
    this.particleSystem.emitter = new Vector3(playerPos.x, playerPos.y + 12, playerPos.z);

    // Weather transition according to biome
    if (biome.type === 'ALTAY') {
      if (this.currentWeather !== 'SNOW') this.setSnow();
    } else if (biome.type === 'DEMIR_DAG') {
      if (this.currentWeather !== 'FOG') this.setFog();
    } else if (biome.type === 'SAHMARAN') {
      if (this.currentWeather !== 'CLEAR') this.setClear();
    } else {
      if (this.currentWeather !== 'CLEAR') this.setClear();
    }

    // Smooth fog density transition
    this.scene.fogDensity += (this.targetFogDensity - this.scene.fogDensity) * Math.min(1.0, deltaTime * 1.5);
  }

  private setClear(): void {
    this.currentWeather = 'CLEAR';
    this.targetFogDensity = 0.005;
    this.particleSystem.emitRate = 40;
    this.particleSystem.minSize = 0.08;
    this.particleSystem.maxSize = 0.16;
    this.particleSystem.minLifeTime = 1.5;
    this.particleSystem.maxLifeTime = 3.0;
    this.particleSystem.color1 = new Color4(1.0, 1.0, 0.9, 0.4); // Golden pollen/dust
    this.particleSystem.color2 = new Color4(0.8, 1.0, 0.8, 0.1);
    this.particleSystem.direction1 = new Vector3(-1.0, -0.5, -0.5);
    this.particleSystem.direction2 = new Vector3(-2.0, -1.0, -1.0);
  }

  private setSnow(): void {
    this.currentWeather = 'SNOW';
    this.targetFogDensity = 0.012; // Misty snow atmosphere
    this.particleSystem.emitRate = 350;
    this.particleSystem.minSize = 0.12;
    this.particleSystem.maxSize = 0.28;
    this.particleSystem.minLifeTime = 2.0;
    this.particleSystem.maxLifeTime = 4.0;
    this.particleSystem.color1 = new Color4(0.95, 0.98, 1.0, 0.85); // Snow flakes
    this.particleSystem.color2 = new Color4(0.85, 0.92, 1.0, 0.5);
    this.particleSystem.direction1 = new Vector3(-0.8, -3.5, -0.5);
    this.particleSystem.direction2 = new Vector3(0.5, -5.0, 0.5);
  }

  private setFog(): void {
    this.currentWeather = 'FOG';
    this.targetFogDensity = 0.016; // Dense mountain mist
    this.particleSystem.emitRate = 60;
    this.particleSystem.minSize = 0.3;
    this.particleSystem.maxSize = 0.8;
    this.particleSystem.minLifeTime = 2.0;
    this.particleSystem.maxLifeTime = 3.5;
    this.particleSystem.color1 = new Color4(0.65, 0.6, 0.55, 0.25);
    this.particleSystem.color2 = new Color4(0.45, 0.4, 0.35, 0.05);
    this.particleSystem.direction1 = new Vector3(-1.5, -0.2, -1.0);
    this.particleSystem.direction2 = new Vector3(-3.0, -0.5, -1.5);
  }

  public dispose(): void {
    this.particleSystem.dispose();
    this.particleTexture.dispose();
  }
}
