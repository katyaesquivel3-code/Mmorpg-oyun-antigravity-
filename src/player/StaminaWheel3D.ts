/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * 3D Prosedürel Soluk (Stamina) Çarkı (StaminaWheel3D)
 * (Babylon.js 7.x WebGL2 ShaderMaterial, Cel-Shaded Dairesel Doluluk, Billboard & Sıfır GC)
 */

import {
  Scene,
  TransformNode,
  Mesh,
  MeshBuilder,
  ShaderMaterial,
  Effect,
  Color3,
  Vector3,
  Scalar
} from '@babylonjs/core';

export class StaminaWheel3D {
  public root: TransformNode;
  public mesh: Mesh;
  private material: ShaderMaterial;

  private currentStaminaRatio = 1.0;
  private targetStaminaRatio = 1.0;
  private isExhausted = false;
  private pulseTimer = 0;
  private fadeTimer = 0;
  private currentAlpha = 0;

  // Sıcak döngüde Vector3 tahsisini önlemek için scratch
  private offsetPos = new Vector3(0.42, 1.35, 0.1);

  constructor(scene: Scene, parentNode: TransformNode) {
    this.root = new TransformNode('stamina_wheel_root', scene);
    this.root.parent = parentNode;
    this.root.position.copyFrom(this.offsetPos);

    // Özel WebGL2 Shader Kaydı
    Effect.ShadersStore['staminaRingVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 worldViewProjection;
      varying vec2 vUV;
      void main(void) {
        vUV = uv;
        gl_Position = worldViewProjection * vec4(position, 1.0);
      }
    `;

    Effect.ShadersStore['staminaRingFragmentShader'] = `
      precision highp float;
      varying vec2 vUV;
      uniform float uRatio;
      uniform float uPulse;
      uniform float uAlpha;
      uniform vec3 uColorGreen;
      uniform vec3 uColorYellow;
      uniform vec3 uColorRed;

      #define PI 3.14159265359

      void main(void) {
        vec2 centered = vUV - vec2(0.5, 0.5);
        float dist = length(centered) * 2.0;

        // Dış ve İç Halka Sınırları (Kalınlık 0.65 - 0.95)
        if (dist < 0.62 || dist > 0.96) {
          discard;
        }

        // Açıyı Saat Yönünde Yukarıdan Başlat (0.0 -> 1.0)
        // atan(-x, y): y yukarı, x sağ
        float angle = atan(-centered.x, centered.y);
        if (angle < 0.0) {
          angle += 2.0 * PI;
        }
        float normAngle = angle / (2.0 * PI);

        // Halka Kenar Çerçevesi (Koyu Kontur)
        float borderEdge = smoothstep(0.62, 0.66, dist) * (1.0 - smoothstep(0.92, 0.96, dist));

        // Boşta Kalan Arka Plan Halkası
        vec4 bgRingColor = vec4(0.08, 0.12, 0.15, 0.45 * uAlpha);

        // Dinamik Renk Geçişi (Yeşil -> Sarı -> Kırmızı)
        vec3 fillColor = uColorGreen;
        if (uRatio < 0.35) {
          fillColor = mix(uColorRed, uColorYellow, uRatio / 0.35);
        } else if (uRatio < 0.70) {
          fillColor = mix(uColorYellow, uColorGreen, (uRatio - 0.35) / 0.35);
        }

        // Tükendiğinde veya kritik seviyede nabız gibi yanıp sönme
        if (uRatio < 0.22) {
          fillColor += vec3(0.35 * uPulse);
        }

        vec4 activeRingColor = vec4(fillColor, 0.95 * uAlpha);

        if (normAngle <= uRatio) {
          // Dolu Kısım
          gl_FragColor = activeRingColor * borderEdge;
        } else {
          // Boş Kısım
          gl_FragColor = bgRingColor * borderEdge;
        }
      }
    `;

    this.material = new ShaderMaterial(
      'mat_stamina_ring',
      scene,
      {
        vertex: 'staminaRing',
        fragment: 'staminaRing'
      },
      {
        attributes: ['position', 'uv'],
        uniforms: [
          'worldViewProjection',
          'uRatio',
          'uPulse',
          'uAlpha',
          'uColorGreen',
          'uColorYellow',
          'uColorRed'
        ],
        needAlphaBlending: true
      }
    );

    this.material.setFloat('uRatio', 1.0);
    this.material.setFloat('uPulse', 0.0);
    this.material.setFloat('uAlpha', 0.0);
    this.material.setColor3('uColorGreen', new Color3(0.18, 0.92, 0.32));
    this.material.setColor3('uColorYellow', new Color3(0.96, 0.82, 0.12));
    this.material.setColor3('uColorRed', new Color3(0.98, 0.18, 0.16));
    this.material.backFaceCulling = false;

    // Billboard Quad / Disc Mesh (Kamera yönüne bakar)
    this.mesh = MeshBuilder.CreatePlane('stamina_ring_plane', { size: 0.44 }, scene);
    this.mesh.parent = this.root;
    this.mesh.material = this.material;
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.mesh.isPickable = false;
    this.mesh.renderingGroupId = 2; // Ön planda net çizim
    this.mesh.visibility = 0;
  }

  /**
   * Her karede soluk durumunu günceller ve yumuşak geçiş yapar
   */
  public update(currentStamina: number, maxStamina: number, deltaTime: number): void {
    this.targetStaminaRatio = Math.max(0, Math.min(1.0, currentStamina / maxStamina));
    this.currentStaminaRatio = Scalar.Lerp(this.currentStaminaRatio, this.targetStaminaRatio, Math.min(1.0, deltaTime * 14.0));

    this.isExhausted = this.targetStaminaRatio <= 0.01;

    // Nabız efekti
    this.pulseTimer += deltaTime * (this.isExhausted ? 12.0 : 6.0);
    const pulse = Math.abs(Math.sin(this.pulseTimer));

    // Görünürlük Mantığı: Yalnızca stamina harcanırken veya dolarken görünür
    const isUsingStamina = this.targetStaminaRatio < 0.985;
    if (isUsingStamina) {
      this.fadeTimer = 1.0; // Tam dolduktan sonra 1 sn daha görünür kal
      this.currentAlpha = Scalar.Lerp(this.currentAlpha, 1.0, Math.min(1.0, deltaTime * 10.0));
    } else {
      if (this.fadeTimer > 0) {
        this.fadeTimer -= deltaTime;
        this.currentAlpha = Scalar.Lerp(this.currentAlpha, 1.0, Math.min(1.0, deltaTime * 8.0));
      } else {
        this.currentAlpha = Scalar.Lerp(this.currentAlpha, 0.0, Math.min(1.0, deltaTime * 5.0));
      }
    }

    if (this.currentAlpha < 0.01) {
      this.mesh.visibility = 0;
      this.mesh.setEnabled(false);
      return;
    }

    this.mesh.setEnabled(true);
    this.mesh.visibility = this.currentAlpha;

    this.material.setFloat('uRatio', this.currentStaminaRatio);
    this.material.setFloat('uPulse', pulse);
    this.material.setFloat('uAlpha', this.currentAlpha);
  }

  public dispose(): void {
    this.material.dispose();
    this.mesh.dispose();
    this.root.dispose();
  }
}
