/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Arazi Materyali MaterialPluginBase Eklentisi
 * (Eğime Göre Kaya/Çim, Biyom Harmanı, GPU Gürültü Detayı, Kıyı Islaklığı, Bulut Gölgeleri & Sis/Gölge Korunumu)
 */

import {
  MaterialPluginBase,
  Material,
  StandardMaterial,
  Scene,
  AbstractEngine,
  SubMesh,
  UniformBuffer,
  Vector2
} from '@babylonjs/core';
import { WorldNoise } from './WorldNoise';

export class TerrainMaterialPlugin extends MaterialPluginBase {
  // Islaklık parametresi (0.0 = Kuru, 1.0 = Yağmurda sırılsıklam ve parlak)
  public wetness = 0.0;

  // Bulut gölgesi parametreleri
  public time = 0.0;
  public cloudCover = 0.45;
  public windDir = new Vector2(0.707, 0.707);
  public waterLevel = WorldNoise.WATER_LEVEL;

  constructor(material: Material) {
    super(material, 'OtukenTerrainPlugin', 200, {
      OTUKEN_TERRAIN: true
    });

    this._enable(true);
  }

  public override getClassName(): string {
    return 'TerrainMaterialPlugin';
  }

  public override getUniforms(): {
    ubo?: Array<{ name: string; size?: number; type?: string; arraySize?: number }>;
    vertex?: string;
    fragment?: string;
  } {
    return {
      ubo: [
        { name: 'uWetness', size: 1, type: 'float' },
        { name: 'uTime', size: 1, type: 'float' },
        { name: 'uCloudCover', size: 1, type: 'float' },
        { name: 'uWaterLevel', size: 1, type: 'float' },
        { name: 'uWindDir', size: 2, type: 'vec2' }
      ],
      fragment: `
        uniform float uWetness;
        uniform float uTime;
        uniform float uCloudCover;
        uniform float uWaterLevel;
        uniform vec2 uWindDir;
      `
    };
  }

  public override bindForSubMesh(
    uniformBuffer: UniformBuffer,
    _scene: Scene,
    _engine: AbstractEngine,
    _subMesh: SubMesh
  ): void {
    uniformBuffer.updateFloat('uWetness', this.wetness);
    uniformBuffer.updateFloat('uTime', this.time);
    uniformBuffer.updateFloat('uCloudCover', this.cloudCover);
    uniformBuffer.updateFloat('uWaterLevel', this.waterLevel);
    uniformBuffer.updateFloat2('uWindDir', this.windDir.x, this.windDir.y);
  }

  public override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === 'fragment') {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
          #ifndef OTUKEN_NOISE_FUNC
          #define OTUKEN_NOISE_FUNC
          float otukenHash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }

          float otukenSmoothNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(otukenHash(i + vec2(0.0, 0.0)), otukenHash(i + vec2(1.0, 0.0)), u.x),
              mix(otukenHash(i + vec2(0.0, 1.0)), otukenHash(i + vec2(1.0, 1.0)), u.x),
              u.y
            );
          }
          #endif
        `,
        CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
          // 1. Eğim Analizi (World Normal Y bileşeni üzerinden dik uçurum tespiti)
          float terrainSlope = 1.0 - clamp(vNormalW.y, 0.0, 1.0);
          float slopeRock = smoothstep(0.26, 0.68, terrainSlope);

          // 2. Yüksek Frekanslı GPU Mikro Doku Gürültüsü
          float microNoise = otukenSmoothNoise(vPositionW.xz * 1.6) * 0.12 - 0.06;
          baseColor.rgb = clamp(baseColor.rgb + vec3(microNoise), 0.0, 1.0);

          // Dik uçurumlara kaya damarları ekle
          vec3 cliffRock = vec3(0.38, 0.35, 0.32);
          baseColor.rgb = mix(baseColor.rgb, cliffRock, slopeRock * 0.78);

          // 3. Kıyı Islaklığı ve Yağmur Islaklığı
          float shoreDist = max(0.0, vPositionW.y - uWaterLevel);
          float shoreWet = clamp(1.0 - shoreDist / 2.0, 0.0, 1.0);
          float totalWet = clamp(uWetness + shoreWet * 0.92, 0.0, 1.0);

          // Islak zemin koyulaşması (kararımı)
          baseColor.rgb *= (1.0 - totalWet * 0.38);

          // 4. Rüzgârla Akan Dinamik Bulut Gölgeleri
          vec2 cloudUV = vPositionW.xz * 0.0035 + uWindDir * uTime * 0.015;
          float cNoise1 = otukenSmoothNoise(cloudUV * 3.0);
          float cNoise2 = otukenSmoothNoise(cloudUV * 6.0) * 0.5;
          float cloudPattern = cNoise1 + cNoise2;
          float cloudShadow = smoothstep(0.68, 1.2, cloudPattern);
          baseColor.rgb *= (1.0 - cloudShadow * uCloudCover * 0.35);
        `,
        CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
          // Islak yüzeylerde su yansıma parlaklığı (Specular & Glossiness)
          specularColor += vec3(totalWet * 0.32);
          glossiness = mix(glossiness, 0.88, totalWet * 0.85);
        `
      };
    }
    return null;
  }
}
