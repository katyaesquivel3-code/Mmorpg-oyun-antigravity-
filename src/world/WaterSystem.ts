/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Şahmaran Gölü Su Sistemi & Su Altı Kamera Efekti (WaterSystem)
 * (GLSL Gerstner Dalgaları, Fresnel Yansıması, Kıyı Köpüğü, Su Altı Sisi & Sahte Caustics)
 */

import {
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  Effect,
  Vector3,
  Color3
} from '@babylonjs/core';
import { WorldNoise } from './WorldNoise';

export class WaterSystem {
  public mesh: Mesh;
  private material: ShaderMaterial;
  private scene: Scene;
  private time = 0;

  // Su Altı Durumu
  public isUnderwater = false;
  private underwaterOverlay: HTMLElement | null = null;
  private savedFogDensity = 0.005;
  private savedFogColor = new Color3(0.65, 0.82, 0.95);

  constructor(scene: Scene) {
    this.scene = scene;

    Effect.ShadersStore['otukenWaterVertexShader'] = `
      precision highp float;

      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;

      uniform mat4 world;
      uniform mat4 worldViewProjection;
      uniform float time;

      varying vec3 vPositionW;
      varying vec3 vNormalW;
      varying vec2 vUV;
      varying float vWaveHeight;

      void main(void) {
        vUV = uv;
        vec3 pos = position;

        // Gerstner Çift Dalga Deplasmanı
        float wave1 = sin(pos.x * 0.22 + time * 1.8) * 0.09;
        float wave2 = cos(pos.z * 0.32 + time * 1.4) * 0.07;
        float wave3 = sin((pos.x + pos.z) * 0.16 + time * 2.2) * 0.05;
        pos.y += wave1 + wave2 + wave3;
        vWaveHeight = pos.y;

        vec4 worldPos = world * vec4(pos, 1.0);
        vPositionW = worldPos.xyz;

        // Dalga Normal Türevi
        float dX = cos(pos.x * 0.22 + time * 1.8) * 0.22 * 0.09;
        float dZ = -sin(pos.z * 0.32 + time * 1.4) * 0.32 * 0.07;
        vec3 waveNormal = normalize(vec3(-dX, 1.0, -dZ));
        vNormalW = normalize((world * vec4(waveNormal, 0.0)).xyz);

        gl_Position = worldViewProjection * vec4(pos, 1.0);
      }
    `;

    Effect.ShadersStore['otukenWaterPixelShader'] = `
      precision highp float;

      uniform vec3 cameraPosition;
      uniform vec3 deepColor;
      uniform vec3 shallowColor;
      uniform vec3 sunDirection;
      uniform float time;

      varying vec3 vPositionW;
      varying vec3 vNormalW;
      varying vec2 vUV;
      varying float vWaveHeight;

      void main(void) {
        vec3 viewDir = normalize(cameraPosition - vPositionW);
        vec3 normal = normalize(vNormalW);

        // Fresnel Kırılımı: Dik bakışta göl derinliği, teğet bakışta gökyüzü yansıması
        float fresnel = clamp(1.0 - dot(viewDir, normal), 0.0, 1.0);
        fresnel = pow(fresnel, 2.6);

        // Kıyı Köpüğü ve Kaustik Dalga Paterni
        float foamPattern = sin(vPositionW.x * 0.85 + time * 2.2) * cos(vPositionW.z * 0.85 + time * 1.9);
        float foam = step(0.72, foamPattern) * 0.32;

        // Güneş Yansıması (Specular Glint)
        vec3 halfVec = normalize(viewDir + normalize(sunDirection));
        float spec = pow(max(0.0, dot(normal, halfVec)), 64.0) * 0.7;

        vec3 waterCol = mix(deepColor, shallowColor, fresnel * 0.85);
        waterCol += vec3(foam) + vec3(spec);

        gl_FragColor = vec4(waterCol, 0.86);
      }
    `;

    this.material = new ShaderMaterial(
      'mat_sahmaran_water',
      scene,
      {
        vertex: 'otukenWater',
        fragment: 'otukenWater'
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['world', 'worldViewProjection', 'time', 'cameraPosition', 'deepColor', 'shallowColor', 'sunDirection'],
        needAlphaBlending: true
      }
    );

    this.material.setColor3('deepColor', new Color3(0.02, 0.22, 0.38));
    this.material.setColor3('shallowColor', new Color3(0.18, 0.75, 0.78));
    this.material.setVector3('sunDirection', new Vector3(0.5, 0.8, 0.3));

    // 280x280m Genişletilmiş Göl Düzlemi (Batı Havzası)
    this.mesh = MeshBuilder.CreateGround('sahmaranWater', { width: 280, height: 280, subdivisions: 32 }, scene);
    this.mesh.position.set(-130, WorldNoise.WATER_LEVEL, -40);
    this.mesh.material = this.material;
    this.mesh.isPickable = false;

    // DOM Su Altı Efekt Katmanı
    this.underwaterOverlay = document.getElementById('underwaterCausticOverlay');
  }

  /**
   * Her kare su dalgalarını ve su altı kamera durumunu günceller
   */
  public update(deltaTime: number, sunDir: Vector3, cameraPos: Vector3): void {
    this.time += deltaTime;
    this.material.setFloat('time', this.time);
    this.material.setVector3('sunDirection', sunDir);
    this.material.setVector3('cameraPosition', cameraPos);

    // Su Altı Kamera Tespiti
    const isCameraUnder = cameraPos.y < WorldNoise.WATER_LEVEL && cameraPos.x < 30 && cameraPos.z < 110;

    if (isCameraUnder && !this.isUnderwater) {
      // Su Altına Giriş
      this.isUnderwater = true;
      this.savedFogDensity = this.scene.fogDensity;
      this.savedFogColor.copyFrom(this.scene.fogColor);

      this.scene.fogDensity = 0.075;
      this.scene.fogColor.set(0.02, 0.26, 0.38); // Kutsal turkuaz su altı sisi

      if (this.underwaterOverlay) {
        this.underwaterOverlay.style.display = 'block';
      }
    } else if (!isCameraUnder && this.isUnderwater) {
      // Su Yüzeyine Çıkış
      this.isUnderwater = false;
      this.scene.fogDensity = this.savedFogDensity;
      this.scene.fogColor.copyFrom(this.savedFogColor);

      if (this.underwaterOverlay) {
        this.underwaterOverlay.style.display = 'none';
      }
    }
  }

  public dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
  }
}
