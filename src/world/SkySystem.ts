/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gökyüzü, Bulut, Aurora & Göksel Cisim Sistemi (SkySystem)
 * (20 Dakikalık Gün Döngüsü, FBM Dinamik Bulutlar, 3D Güneş & Hilal, Yıldızlar, Tengri Perdesi Aurora & Işık Huzmeleri)
 */

import {
  Mesh,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  Effect,
  StandardMaterial,
  Color3,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  Vector3,
  Vector2,
  Constants
} from '@babylonjs/core';
import { WindField } from './WindField';
import { TerrainMaterialPlugin } from './TerrainMaterialPlugin';

export class SkySystem {
  private scene: Scene;
  private skyDome: Mesh;
  private skyShaderMat: ShaderMaterial;

  public sunLight: DirectionalLight;
  public hemiLight: HemisphericLight;
  public shadowGen: ShadowGenerator | null;

  // 3D Göksel Cisimler: Güneş Diski ve Hilal Ay
  private sunMesh: Mesh;
  private moonMesh: Mesh;
  private matSun: StandardMaterial;
  private matMoon: StandardMaterial;

  // Işık Huzmeleri (Additive God Rays Billboard Mesh)
  private godRaysMesh: Mesh;
  private matGodRays: StandardMaterial;

  // Gün-Gece Döngüsü Sabitleri (20 dakika = 1200 saniye)
  public static readonly DAY_DURATION_SEC = 1200;
  public timeOfDay = 0.35; // Sabah 08:30 civarı
  public timeScale = 1.0;

  // Yörünge Yarıçapı
  private orbitRadius = 180;

  // Rüzgâr Referansı
  private windField: WindField;

  // Arazi Plugin Referansı
  public terrainPlugin: TerrainMaterialPlugin | null = null;

  // Sıcak döngüde sıfır GC tahsisi için scratch nesneleri (Rule 7: Zero GC)
  private scratchSunPos = new Vector3(0, 0, 0);
  private scratchMoonPos = new Vector3(0, 0, 0);
  private scratchSunDir = new Vector3(0, 0, 0);
  private scratchFogColor = new Color3(0, 0, 0);

  constructor(scene: Scene, sunLight: DirectionalLight, shadowGen: ShadowGenerator | null) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.shadowGen = shadowGen;
    this.windField = WindField.getInstance();

    this.hemiLight = new HemisphericLight('worldHemi', new Vector3(0, 1, 0), scene);
    this.hemiLight.intensity = 0.7;

    // Gökyüzü Shader'ını Derle (FBM Bulutlar, Yıldızlar, Tengri Perdesi Aurora)
    this.skyShaderMat = this.createSkyShaderMaterial();

    // Ters Çevrilmiş Gökkubbe (Inverted Skydome)
    this.skyDome = MeshBuilder.CreateSphere('skyDome', { diameter: 520, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
    this.skyDome.isPickable = false;
    this.skyDome.material = this.skyShaderMat;

    // 3D Güneş Diski
    this.sunMesh = MeshBuilder.CreateSphere('celestial_sun', { diameter: 16, segments: 10 }, scene);
    this.sunMesh.isPickable = false;
    this.matSun = new StandardMaterial('mat_sun_disk', scene);
    this.matSun.emissiveColor = new Color3(1.0, 0.95, 0.75);
    this.matSun.disableLighting = true;
    this.matSun.freeze();
    this.sunMesh.material = this.matSun;

    // 3D Hilal Ay (Türk Hilal Formunda Torus)
    this.moonMesh = MeshBuilder.CreateTorus('celestial_moon', { diameter: 14, thickness: 2.6, tessellation: 16 }, scene);
    this.moonMesh.isPickable = false;
    this.moonMesh.scaling.set(1.0, 1.0, 0.35);
    this.matMoon = new StandardMaterial('mat_moon_disk', scene);
    this.matMoon.emissiveColor = new Color3(0.85, 0.92, 1.0);
    this.matMoon.disableLighting = true;
    this.matMoon.freeze();
    this.moonMesh.material = this.matMoon;

    // Ucuz Işık Huzmeleri (Additive God Rays Cone)
    this.godRaysMesh = MeshBuilder.CreateCylinder('god_rays', { height: 75, diameterTop: 4, diameterBottom: 48, tessellation: 8 }, scene);
    this.godRaysMesh.isPickable = false;
    this.matGodRays = new StandardMaterial('mat_god_rays', scene);
    this.matGodRays.diffuseColor = new Color3(0, 0, 0);
    this.matGodRays.emissiveColor = new Color3(1.0, 0.85, 0.45);
    this.matGodRays.alpha = 0.0;
    this.matGodRays.backFaceCulling = false;
    this.matGodRays.disableLighting = true;
    this.matGodRays.alphaMode = Constants.ALPHA_ADD;
    this.godRaysMesh.material = this.matGodRays;

    this.update(0, new Vector3(0, 0, 0));
  }

  private createSkyShaderMaterial(): ShaderMaterial {
    Effect.ShadersStore['otukenSkyVertexShader'] = `
      precision highp float;

      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;

      uniform mat4 worldViewProjection;
      uniform mat4 world;

      varying vec3 vPositionW;
      varying vec3 vNormalW;

      void main(void) {
        vec4 worldPos = world * vec4(position, 1.0);
        vPositionW = worldPos.xyz;
        vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
        gl_Position = worldViewProjection * vec4(position, 1.0);
      }
    `;

    Effect.ShadersStore['otukenSkyPixelShader'] = `
      precision highp float;

      uniform vec3 uSunDir;
      uniform float uSunAltitude;
      uniform float uTime;
      uniform vec2 uWindDir;
      uniform float uAuroraActive;

      varying vec3 vPositionW;
      varying vec3 vNormalW;

      // Hash gürültüsü
      float skyHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float skyNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(skyHash(i + vec2(0.0, 0.0)), skyHash(i + vec2(1.0, 0.0)), u.x),
                   mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      float skyFbm(vec2 p) {
        float v = 0.0;
        v += skyNoise(p) * 0.5;
        p *= 2.02;
        v += skyNoise(p) * 0.25;
        p *= 2.03;
        v += skyNoise(p) * 0.125;
        return v / 0.875;
      }

      void main(void) {
        vec3 dir = normalize(vPositionW);
        float y = dir.y;

        // 1. Atmosferik Renk Geçişleri
        vec3 daySky = vec3(0.28, 0.58, 0.92);
        vec3 dayHorizon = vec3(0.65, 0.82, 0.98);

        vec3 sunsetSky = vec3(0.2, 0.12, 0.35);
        vec3 sunsetHorizon = vec3(0.95, 0.42, 0.15);

        vec3 nightSky = vec3(0.02, 0.03, 0.08);
        vec3 nightHorizon = vec3(0.05, 0.07, 0.14);

        // Güneş yüksekliğine göre gün evresi harmanlama
        float dayT = smoothstep(-0.05, 0.25, uSunAltitude);
        float sunsetT = smoothstep(-0.2, 0.1, uSunAltitude) * (1.0 - dayT);

        vec3 currentSky = mix(nightSky, daySky, dayT);
        currentSky = mix(currentSky, sunsetSky, sunsetT);

        vec3 currentHorizon = mix(nightHorizon, dayHorizon, dayT);
        currentHorizon = mix(currentHorizon, sunsetHorizon, sunsetT);

        // Dikey ufuk gradyanı
        vec3 baseColor = mix(currentHorizon, currentSky, clamp(y * 1.8, 0.0, 1.0));

        // 2. Gece Göğü Yıldızları
        if (uSunAltitude < 0.05 && y > 0.05) {
          vec2 starCoord = dir.xz / (dir.y + 0.35) * 80.0;
          float starVal = skyHash(floor(starCoord));
          if (starVal > 0.982) {
            float twinkle = sin(uTime * 3.5 + starVal * 20.0) * 0.5 + 0.5;
            float starAlpha = (1.0 - smoothstep(-0.1, 0.05, uSunAltitude)) * twinkle;
            baseColor += vec3(0.9, 0.95, 1.0) * starAlpha * 0.9;
          }
        }

        // 3. Tengri Perdesi (Aurora Borealis) — Kuzey (Gök Zirve Altay) Gecelerinde Işıldar
        if (uSunAltitude < -0.05 && dir.z > 0.15 && y > 0.12) {
          vec2 aurCoord = vec2(dir.x * 3.5 + sin(uTime * 0.3) * 0.5, y * 4.0 - uTime * 0.45);
          float wave1 = sin(aurCoord.x * 2.2 + uTime * 0.6) * 0.5 + 0.5;
          float wave2 = sin(dir.x * 4.8 - uTime * 0.8) * 0.5 + 0.5;
          float auroraMask = smoothstep(0.4, 0.85, wave1 * wave2) * smoothstep(0.12, 0.45, y) * smoothstep(0.9, 0.5, y);

          vec3 auroraEmerald = vec3(0.08, 0.95, 0.55);
          vec3 auroraViolet = vec3(0.65, 0.18, 0.92);
          vec3 aurColor = mix(auroraEmerald, auroraViolet, sin(uTime * 0.5 + dir.x * 3.0) * 0.5 + 0.5);

          baseColor += aurColor * (auroraMask * uAuroraActive * 0.85);
        }

        // 4. FBM Dinamik Bulut Katmanı (Rüzgârla Akar)
        if (y > 0.04) {
          vec2 cloudUV = (dir.xz / (y + 0.22)) * 0.35 + uWindDir * (uTime * 0.015);
          float clouds = skyFbm(cloudUV);
          float cloudMask = smoothstep(0.45, 0.72, clouds);

          vec3 cloudCol = mix(vec3(0.15, 0.18, 0.25), vec3(1.0, 0.98, 0.92), dayT);
          cloudCol = mix(cloudCol, vec3(1.0, 0.55, 0.3), sunsetT);

          baseColor = mix(baseColor, cloudCol, cloudMask * 0.75 * smoothstep(0.04, 0.25, y));
        }

        gl_FragColor = vec4(baseColor, 1.0);
      }
    `;

    const mat = new ShaderMaterial(
      'mat_otuken_sky',
      this.scene,
      {
        vertex: 'otukenSky',
        fragment: 'otukenSky'
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['worldViewProjection', 'world', 'uSunDir', 'uSunAltitude', 'uTime', 'uWindDir', 'uAuroraActive']
      }
    );

    mat.backFaceCulling = false;
    mat.setVector3('uSunDir', new Vector3(0, 1, 0));
    mat.setFloat('uSunAltitude', 0.5);
    mat.setFloat('uTime', 0);
    mat.setVector2('uWindDir', new Vector2(0.707, 0.707));
    mat.setFloat('uAuroraActive', 1.0);
    return mat;
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    // 20 Dakikalık Zaman Akışı
    this.timeOfDay = (this.timeOfDay + (deltaTime * this.timeScale) / SkySystem.DAY_DURATION_SEC) % 1.0;

    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunDirX = Math.cos(sunAngle);
    const sunDirY = Math.sin(sunAngle);
    const sunDirZ = 0.32;

    // 1. Güneş ve Ay Konumları (Sıfır GC)
    this.scratchSunPos.x = playerPos.x - sunDirX * this.orbitRadius;
    this.scratchSunPos.y = playerPos.y + Math.max(-35, sunDirY * this.orbitRadius);
    this.scratchSunPos.z = playerPos.z - sunDirZ * this.orbitRadius;

    this.sunLight.position.copyFrom(this.scratchSunPos);
    this.sunMesh.position.copyFrom(this.scratchSunPos);

    this.scratchSunDir.x = sunDirX;
    this.scratchSunDir.y = -Math.max(0.12, sunDirY);
    this.scratchSunDir.z = sunDirZ;
    this.scratchSunDir.normalize();
    this.sunLight.direction.copyFrom(this.scratchSunDir);

    // 3D Hilal Ay
    this.scratchMoonPos.x = playerPos.x + sunDirX * this.orbitRadius;
    this.scratchMoonPos.y = playerPos.y - Math.max(-35, sunDirY * this.orbitRadius);
    this.scratchMoonPos.z = playerPos.z + sunDirZ * this.orbitRadius;
    this.moonMesh.position.copyFrom(this.scratchMoonPos);
    this.moonMesh.lookAt(playerPos);

    // Gökkubbeyi Oyuncuya Merkezle
    this.skyDome.position.set(playerPos.x, playerPos.y - 45, playerPos.z);

    // Işık Huzmeleri (Güneşin önünde yere doğru eğimli)
    this.godRaysMesh.position.copyFrom(this.scratchSunPos);
    this.godRaysMesh.position.y -= 25;
    this.godRaysMesh.lookAt(playerPos);

    // Shader Uniform'larını Güncelle
    const curTime = performance.now() * 0.001;
    this.skyShaderMat.setVector3('uSunDir', this.scratchSunDir);
    this.skyShaderMat.setFloat('uSunAltitude', sunDirY);
    this.skyShaderMat.setFloat('uTime', curTime);
    this.skyShaderMat.setVector2('uWindDir', new Vector2(this.windField.direction.x, this.windField.direction.z));

    // Arazi Plugin'ine Bulut Verilerini İlet
    if (this.terrainPlugin) {
      this.terrainPlugin.time = curTime;
      this.terrainPlugin.windDir.set(this.windField.direction.x, this.windField.direction.z);
    }

    // 2. Gün Işığı & Renk Evreleri
    if (sunDirY > 0.15) {
      // GÜNDÜZ
      const dayFactor = Math.min(1.0, (sunDirY - 0.15) / 0.5);
      this.sunLight.intensity = 1.1 + dayFactor * 0.45;
      this.sunLight.diffuse.set(1.0, 0.88 + dayFactor * 0.1, 0.65 + dayFactor * 0.25);

      this.hemiLight.intensity = 0.65 + dayFactor * 0.25;
      this.hemiLight.diffuse.set(0.92, 0.96, 1.0);
      this.hemiLight.groundColor.set(0.28, 0.38, 0.22);

      this.scratchFogColor.set(0.65, 0.82, 0.95);
      this.scene.fogColor.copyFrom(this.scratchFogColor);

      this.sunMesh.setEnabled(true);
      this.moonMesh.setEnabled(false);
      this.matGodRays.alpha = 0.0;
    } else if (sunDirY > -0.15) {
      // ŞAFAK / GÜNBATIMI (Altın Saat & Işık Huzmeleri)
      const t = (sunDirY + 0.15) / 0.3;
      this.sunLight.intensity = 0.35 + t * 0.75;
      this.sunLight.diffuse.set(1.0, 0.45 + t * 0.4, 0.2 + t * 0.4);

      this.hemiLight.intensity = 0.4 + t * 0.25;
      this.hemiLight.diffuse.set(0.75, 0.55, 0.45);
      this.hemiLight.groundColor.set(0.18, 0.14, 0.1);

      this.scratchFogColor.set(0.75, 0.45, 0.3);
      this.scene.fogColor.copyFrom(this.scratchFogColor);

      this.sunMesh.setEnabled(true);
      this.moonMesh.setEnabled(true);

      // Altın saatte ışık huzmelerini göster
      this.matGodRays.alpha = (1.0 - Math.abs(t - 0.5) * 2.0) * 0.35;
    } else {
      // GECE (Kut Hilali Aydınlığı & Tengri Perdesi)
      this.sunLight.intensity = 0.15;
      this.sunLight.diffuse.set(0.25, 0.35, 0.65);

      this.hemiLight.intensity = 0.22;
      this.hemiLight.diffuse.set(0.18, 0.22, 0.38);
      this.hemiLight.groundColor.set(0.06, 0.08, 0.12);

      this.scratchFogColor.set(0.06, 0.08, 0.14);
      this.scene.fogColor.copyFrom(this.scratchFogColor);

      this.sunMesh.setEnabled(false);
      this.moonMesh.setEnabled(true);
      this.matGodRays.alpha = 0.0;
    }
  }

  public isNight(): boolean {
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    return Math.sin(sunAngle) < -0.05;
  }

  public dispose(): void {
    this.skyDome.dispose();
    this.sunMesh.dispose();
    this.moonMesh.dispose();
    this.godRaysMesh.dispose();
    this.skyShaderMat.dispose();
    this.matSun.dispose();
    this.matMoon.dispose();
    this.matGodRays.dispose();
  }
}
