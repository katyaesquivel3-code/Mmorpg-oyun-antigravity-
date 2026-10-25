/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Canlı 3D Portre Sistemi (Live3DPortrait)
 * (Kural 1 & 2: 2D Canvas ve DynamicTexture KESİNLİKLE YOKTUR!
 *  İkinci Babylon.js Kamerası + Viewport + LayerMask ile Gerçek 3D Konuşmacı Portresi)
 */

import {
  Scene,
  FreeCamera,
  Viewport,
  Vector3,
  TransformNode,
  PointLight,
  Color3
} from '@babylonjs/core';
import { CameraRig } from '../core/CameraRig';

export class Live3DPortrait {
  public portraitCamera: FreeCamera;
  public isActive = false;
  private portraitLight: PointLight;

  // Sıcak döngü scratch nesneleri
  private scratchHeadPos = new Vector3(0, 0, 0);
  private scratchCamPos = new Vector3(0, 0, 0);

  private animTimer = 0;

  constructor(private scene: Scene, private cameraRig: CameraRig) {
    // İkinci Babylon Kamerası (Canlı 3D Portre)
    this.portraitCamera = new FreeCamera('livePortraitCamera', new Vector3(0, 0, 0), this.scene);
    this.portraitCamera.fov = 0.42; // Dar portre açısı (~24 derece tele-lens etkisi)
    this.portraitCamera.minZ = 0.1;
    this.portraitCamera.maxZ = 20.0;

    // Yatay ekranda sol alt çeyrek (x: %3, y: %6, genişlik: %18, yükseklik: %32)
    this.portraitCamera.viewport = new Viewport(0.03, 0.05, 0.16, 0.32);

    // Portre Yüz Işığı (Sıcak samimi yüz aydınlatması)
    this.portraitLight = new PointLight('portrait_rim_light', new Vector3(0, 0, 0), this.scene);
    this.portraitLight.diffuse = new Color3(1.0, 0.92, 0.82);
    this.portraitLight.specular = new Color3(0.3, 0.3, 0.2);
    this.portraitLight.intensity = 0.0; // Başlangıçta kapalı
  }

  /**
   * Belirtilen 3D NPC başlığına canlı kamerayı odaklar
   */
  public activate(targetHeadNode: TransformNode): void {
    this.isActive = true;

    // Dünya konumunu al
    targetHeadNode.computeWorldMatrix(true);
    this.scratchHeadPos.copyFrom(targetHeadNode.getAbsolutePosition());

    // Konuşmacının tam karşısına 1.35m mesafeye kamera yerleştir
    const forwardX = Math.sin(targetHeadNode.rotation.y || 0);
    const forwardZ = Math.cos(targetHeadNode.rotation.y || 0);

    this.scratchCamPos.set(
      this.scratchHeadPos.x + forwardX * 1.35,
      this.scratchHeadPos.y + 0.05,
      this.scratchHeadPos.z + forwardZ * 1.35
    );

    this.portraitCamera.position.copyFrom(this.scratchCamPos);
    this.portraitCamera.setTarget(this.scratchHeadPos);

    // Yüz aydınlatmasını konuşmacının 0.6m üst-önüne koy
    this.portraitLight.position.set(
      this.scratchHeadPos.x + forwardX * 0.7,
      this.scratchHeadPos.y + 0.4,
      this.scratchHeadPos.z + forwardZ * 0.7
    );
    this.portraitLight.intensity = 1.4;

    // Çoklu kamera dizisini sahneye ata
    this.scene.activeCameras = [this.cameraRig.camera, this.portraitCamera];
  }

  public update(deltaTime: number, targetHeadNode?: TransformNode | null): void {
    if (!this.isActive) return;

    this.animTimer += deltaTime;

    if (targetHeadNode) {
      targetHeadNode.computeWorldMatrix(true);
      this.scratchHeadPos.copyFrom(targetHeadNode.getAbsolutePosition());

      // Canlı nefes alma ve hafif konuşma mikro kafa salınımı
      const bobY = Math.sin(this.animTimer * 2.5) * 0.015;
      this.portraitCamera.position.y = this.scratchHeadPos.y + 0.05 + bobY;
      this.scratchHeadPos.y += bobY * 0.5;
      this.portraitCamera.setTarget(this.scratchHeadPos);
    }
  }

  public deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.portraitLight.intensity = 0.0;

    // Tek kameraya (ana oyun kamerası) geri dön
    this.scene.activeCameras = [this.cameraRig.camera];
    this.scene.activeCamera = this.cameraRig.camera;
  }

  public dispose(): void {
    this.deactivate();
    this.portraitCamera.dispose();
    this.portraitLight.dispose();
  }
}
