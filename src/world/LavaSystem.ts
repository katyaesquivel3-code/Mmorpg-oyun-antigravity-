/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Prosedürel Lav Sistemi, Isı Sisi & Yel Ana Bacaları (LavaSystem)
 * (Ergenekon Magma Gölleri, Akkor Lav Shader'ı, Köz Parçacıkları, Lav Hasarı,
 *  ve Yüksek Platformlara Fırlatan Dikey Termal Sıcak Hava Sütunları - Sıfır GC)
 */

import {
  Scene,
  Mesh,
  MeshBuilder,
  ShaderMaterial,
  Effect,
  Vector3,
  Color3,
  Color4,
  ParticleSystem,
  Ray
} from '@babylonjs/core';
import { PlayerController } from '../player/PlayerController';
import { CombatSystem } from '../combat/CombatSystem';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface ThermalUpdraftChimney {
  id: string;
  position: Vector3;
  radius: number;
  height: number;
  updraftPower: number; // m/s yukarı fırlatma kuvveti
  particles: ParticleSystem;
}

export class LavaSystem {
  private static instance: LavaSystem | null = null;
  public scene: Scene;

  // Lav Meshleri & Materyalleri
  public lavaMeshes: Mesh[] = [];
  private lavaMaterial: ShaderMaterial;
  private timeUniform = 0.0;

  // Köz & Duman Parçacıkları
  private emberParticles: ParticleSystem;

  // Yel Ana Bacaları (Thermal Updrafts)
  public updraftChimneys: ThermalUpdraftChimney[] = [];

  // Scratch nesneleri (Sıcak döngüde sıfır GC)
  private scratchPlayerPos = new Vector3(0, 0, 0);

  public static getInstance(scene?: Scene): LavaSystem {
    if (!LavaSystem.instance && scene) {
      LavaSystem.instance = new LavaSystem(scene);
    }
    return LavaSystem.instance!;
  }

  constructor(scene: Scene) {
    this.scene = scene;
    this.lavaMaterial = this.createLavaShader();
    this.emberParticles = this.createEmberParticles();

    this.buildErgenekonLavaLakes();
    this.buildThermalUpdraftChimneys();
  }

  /**
   * Prosedürel WebGL2 Akkor Lav Shader'ı
   */
  private createLavaShader(): ShaderMaterial {
    Effect.ShadersStore['lavaVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;

      uniform mat4 worldViewProjection;
      uniform mat4 world;
      uniform float uTime;

      varying vec3 vPositionW;
      varying vec3 vNormalW;
      varying vec2 vUV;

      void main(void) {
        vUV = uv * 6.0;
        vec3 pos = position;

        // Lav yüzeyinde yavaş viskoz dalgalanma
        float wave = sin(pos.x * 0.18 + uTime * 1.2) * cos(pos.z * 0.18 + uTime * 0.9) * 0.35;
        pos.y += wave;

        vec4 worldPos = world * vec4(pos, 1.0);
        vPositionW = worldPos.xyz;
        vNormalW = normalize((world * vec4(normal, 0.0)).xyz);

        gl_Position = worldViewProjection * vec4(pos, 1.0);
      }
    `;

    Effect.ShadersStore['lavaPixelShader'] = `
      precision highp float;
      varying vec3 vPositionW;
      varying vec3 vNormalW;
      varying vec2 vUV;

      uniform float uTime;
      uniform vec3 uColorDark;
      uniform vec3 uColorGlow;
      uniform vec3 uColorCore;

      float hash2D(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash2D(i + vec2(0.0, 0.0)), hash2D(i + vec2(1.0, 0.0)), u.x),
                   mix(hash2D(i + vec2(0.0, 1.0)), hash2D(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main(void) {
        vec2 uv = vUV;
        float n1 = noise2D(uv * 1.5 + vec2(uTime * 0.08, uTime * 0.05));
        float n2 = noise2D(uv * 3.2 - vec2(uTime * 0.12, uTime * 0.09));
        float magmaPattern = smoothstep(0.35, 0.72, n1 * 0.65 + n2 * 0.35);

        // Akkor Çekirdek (Sarı-Turuncu), Kızgın Lav (Alev Kırmızısı) ve Soğuyan Kabuk (Koyu Bazalt)
        vec3 col = mix(uColorDark, uColorGlow, magmaPattern);
        float coreGlow = smoothstep(0.68, 0.92, magmaPattern);
        col = mix(col, uColorCore, coreGlow);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const mat = new ShaderMaterial(
      'mat_lava_proc',
      this.scene,
      { vertex: 'lava', fragment: 'lava' },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['worldViewProjection', 'world', 'uTime', 'uColorDark', 'uColorGlow', 'uColorCore']
      }
    );

    mat.setColor3('uColorDark', new Color3(0.18, 0.04, 0.02)); // Soğuyan volkanik kabuk
    mat.setColor3('uColorGlow', new Color3(0.95, 0.28, 0.05)); // Akkor lav nehri
    mat.setColor3('uColorCore', new Color3(1.0, 0.88, 0.35)); // En sıcak sarı plazma çekirdek
    mat.freeze();

    return mat;
  }

  /**
   * Ergenekon Vadisi Boyunca Lav Gölleri ve Akıntıları
   */
  private buildErgenekonLavaLakes(): void {
    // 1. Ana Demir Dağ Magma Havzası (x: 160, z: 45)
    const mainLake = MeshBuilder.CreateGround(
      'lava_lake_main',
      { width: 68, height: 68, subdivisions: 24 },
      this.scene
    );
    mainLake.position.set(160, 4.2, 45);
    mainLake.material = this.lavaMaterial;
    mainLake.checkCollisions = false;
    this.lavaMeshes.push(mainLake);

    // 2. Ergenekon Kanyonu Lav Nehri (x: 135, z: -10)
    const lavaRiver = MeshBuilder.CreateGround(
      'lava_river_canyon',
      { width: 34, height: 85, subdivisions: 20 },
      this.scene
    );
    lavaRiver.position.set(135, 3.8, -10);
    lavaRiver.rotation.y = 0.35;
    lavaRiver.material = this.lavaMaterial;
    lavaRiver.checkCollisions = false;
    this.lavaMeshes.push(lavaRiver);

    // 3. 7 Körük Ocağı Erimiş Maden Kanalı (x: 115, z: 22)
    const forgeChannel = MeshBuilder.CreateGround(
      'lava_forge_channel',
      { width: 18, height: 48, subdivisions: 14 },
      this.scene
    );
    forgeChannel.position.set(115, 5.0, 22);
    forgeChannel.rotation.y = -0.55;
    forgeChannel.material = this.lavaMaterial;
    forgeChannel.checkCollisions = false;
    this.lavaMeshes.push(forgeChannel);
  }

  /**
   * YENİ: Yel Ana Bacaları (Thermal Updraft Chimneys)
   * (Oyuncu süzülürken bacanın üzerine geldiğinde +16 m/s ile dikey fırlatılır!)
   */
  private buildThermalUpdraftChimneys(): void {
    const chimneyPositions = [
      { id: 'updraft_1', pos: new Vector3(125, 4.0, 15), radius: 5.5, height: 26.0 },
      { id: 'updraft_2', pos: new Vector3(148, 4.5, 30), radius: 6.0, height: 32.0 },
      { id: 'updraft_3', pos: new Vector3(170, 4.5, 60), radius: 5.5, height: 28.0 }
    ];

    chimneyPositions.forEach((cfg) => {
      // Baca 3D Volkanik Taş Halkası
      const chimneyBase = MeshBuilder.CreateCylinder(
        `chimney_mesh_${cfg.id}`,
        { height: 1.8, diameterTop: cfg.radius * 1.8, diameterBottom: cfg.radius * 2.2, tessellation: 12 },
        this.scene
      );
      chimneyBase.position.copyFrom(cfg.pos);
      chimneyBase.position.y += 0.9;
      chimneyBase.freezeWorldMatrix();

      // Dikey Sıcak Hava ve Kıvılcım Parçacık Sütunu
      const ps = new ParticleSystem(`ps_${cfg.id}`, 65, this.scene);
      ps.emitter = chimneyBase;
      ps.minEmitBox = new Vector3(-cfg.radius * 0.4, 0.5, -cfg.radius * 0.4);
      ps.maxEmitBox = new Vector3(cfg.radius * 0.4, 1.5, cfg.radius * 0.4);

      // Sıcak akkor hava ve duman renkleri
      ps.color1 = new Color4(1.0, 0.55, 0.1, 0.85);
      ps.color2 = new Color4(0.85, 0.25, 0.05, 0.65);
      ps.colorDead = new Color4(0.3, 0.3, 0.3, 0.0);

      ps.minSize = 0.4;
      ps.maxSize = 1.6;
      ps.minLifeTime = 1.4;
      ps.maxLifeTime = 2.6;
      ps.emitRate = 22;
      ps.gravity = new Vector3(0, 8.5, 0); // Hızla göğe yükselen termal akım
      ps.minEmitPower = 4.0;
      ps.maxEmitPower = 9.0;
      ps.start();

      this.updraftChimneys.push({
        id: cfg.id,
        position: cfg.pos,
        radius: cfg.radius,
        height: cfg.height,
        updraftPower: 16.0,
        particles: ps
      });
    });
  }

  private createEmberParticles(): ParticleSystem {
    const ps = new ParticleSystem('lava_embers', 80, this.scene);
    ps.emitter = new Vector3(150, 5, 25);
    ps.minEmitBox = new Vector3(-35, 0, -35);
    ps.maxEmitBox = new Vector3(35, 1, 35);

    ps.color1 = new Color4(1.0, 0.8, 0.2, 0.9);
    ps.color2 = new Color4(1.0, 0.2, 0.05, 0.8);
    ps.colorDead = new Color4(0.2, 0.1, 0.1, 0.0);

    ps.minSize = 0.08;
    ps.maxSize = 0.25;
    ps.minLifeTime = 1.8;
    ps.maxLifeTime = 3.5;
    ps.emitRate = 25;
    ps.gravity = new Vector3(0, 2.2, 0);
    ps.minEmitPower = 0.5;
    ps.maxEmitPower = 2.0;
    ps.start();

    return ps;
  }

  /**
   * Her Kare Lav Teması ve Yel Ana Termal Baca Güncellemesi
   */
  public update(deltaTime: number, player: PlayerController, combat: CombatSystem): void {
    this.timeUniform += deltaTime;
    this.lavaMaterial.setFloat('uTime', this.timeUniform);

    this.scratchPlayerPos.copyFrom(player.position);

    // 1. Oyuncunun Lav Teması Kontrolü (Lav yüzeyinde mi?)
    for (let i = 0; i < this.lavaMeshes.length; i++) {
      const lake = this.lavaMeshes[i];
      const distX = Math.abs(this.scratchPlayerPos.x - lake.position.x);
      const distZ = Math.abs(this.scratchPlayerPos.z - lake.position.z);
      const boundHalf = 32.0;

      if (distX < boundHalf && distZ < boundHalf) {
        if (this.scratchPlayerPos.y <= lake.position.y + 0.6) {
          // Oyuncu lava bastı!
          combat.health = Math.max(0, combat.health - 35.0 * deltaTime);
          combat.addCameraTrauma(0.65);
          ProceduralAudio.playFlameIgnition();

          // Yukarı ve kenara hafif fırlat
          player.verticalVelocity = 11.0;
          EventBus.emit('element:burn', {
            x: this.scratchPlayerPos.x,
            y: this.scratchPlayerPos.y,
            z: this.scratchPlayerPos.z
          });
          break;
        }
      }
    }

    // 2. Yel Ana Bacaları (Thermal Updraft): Sıcak hava süzülmeyi göğe fırlatır!
    for (let i = 0; i < this.updraftChimneys.length; i++) {
      const chimney = this.updraftChimneys[i];
      const dx = this.scratchPlayerPos.x - chimney.position.x;
      const dz = this.scratchPlayerPos.z - chimney.position.z;
      const dist2D = Math.hypot(dx, dz);

      if (dist2D < chimney.radius && this.scratchPlayerPos.y < chimney.position.y + chimney.height) {
        // Eğer süzülme aktifse veya havadaysa dikey yukarı fırlat
        if (player.isGlidingActive || player.locomotionState === 'AIRBORNE' || player.locomotionState === 'GLIDE') {
          player.verticalVelocity = Math.max(player.verticalVelocity, chimney.updraftPower);
          player.locomotionState = 'GLIDE';
          player.isGlidingActive = true;
          ProceduralAudio.playWindGust();

          EventBus.emit('ui:loot_toast', {
            text: '🌪️ YEL ANA BACASI: Sıcak hava akımı seni göğe fırlattı!'
          });
          break;
        }
      }
    }
  }

  public cleanup(): void {
    this.lavaMeshes.forEach((m) => m.dispose());
    this.emberParticles.dispose();
    this.updraftChimneys.forEach((c) => c.particles.dispose());
  }
}
