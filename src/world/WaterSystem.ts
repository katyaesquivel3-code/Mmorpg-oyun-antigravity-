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
  private time = 0;

  constructor(scene: Scene) {
    // Register custom GLSL shaders in Babylon's ShaderStore
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

      void main(void) {
        vUV = uv;
        vec3 pos = position;

        // Gerstner wave displacement
        float wave1 = sin(pos.x * 0.25 + time * 1.8) * 0.08;
        float wave2 = cos(pos.z * 0.35 + time * 1.4) * 0.06;
        float wave3 = sin((pos.x + pos.z) * 0.15 + time * 2.2) * 0.04;
        pos.y += wave1 + wave2 + wave3;

        vec4 worldPos = world * vec4(pos, 1.0);
        vPositionW = worldPos.xyz;

        // Approximate wave normal
        float dX = cos(pos.x * 0.25 + time * 1.8) * 0.25 * 0.08;
        float dZ = -sin(pos.z * 0.35 + time * 1.4) * 0.35 * 0.06;
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

      void main(void) {
        vec3 viewDir = normalize(cameraPosition - vPositionW);
        vec3 normal = normalize(vNormalW);

        // Fresnel term: shallow looking down, reflective at glancing angles
        float fresnel = clamp(1.0 - dot(viewDir, normal), 0.0, 1.0);
        fresnel = pow(fresnel, 2.8);

        // Procedural caustics & shore ripples
        float foamPattern = sin(vPositionW.x * 0.8 + time * 2.0) * cos(vPositionW.z * 0.8 + time * 2.0);
        float foam = step(0.72, foamPattern) * 0.25;

        // Sun specular glint
        vec3 halfVec = normalize(viewDir + normalize(sunDirection));
        float spec = pow(max(0.0, dot(normal, halfVec)), 64.0) * 0.6;

        vec3 waterCol = mix(deepColor, shallowColor, fresnel * 0.85);
        waterCol += vec3(foam) + vec3(spec);

        gl_FragColor = vec4(waterCol, 0.82);
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

    // Deep turquoise to sparkling teal (Zelda BotW water look)
    this.material.setColor3('deepColor', new Color3(0.02, 0.28, 0.42));
    this.material.setColor3('shallowColor', new Color3(0.18, 0.72, 0.75));
    this.material.setVector3('sunDirection', new Vector3(0.5, 0.8, 0.3));

    // Create a 220x220m water plane over the lake basin (SW quadrant)
    this.mesh = MeshBuilder.CreateGround('sahmaranWater', { width: 220, height: 220, subdivisions: 28 }, scene);
    this.mesh.position.set(-90, WorldNoise.WATER_LEVEL, -90);
    this.mesh.material = this.material;
    this.mesh.isPickable = false;
  }

  public update(deltaTime: number, sunDir: Vector3): void {
    this.time += deltaTime;
    this.material.setFloat('time', this.time);
    this.material.setVector3('sunDirection', sunDir);
  }
}
