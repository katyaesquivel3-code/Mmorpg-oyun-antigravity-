/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Dinamik 3. Şahıs Takip Kamerası (CameraRig)
 * (16:9-21:9 Tutarlı FOV Üst Sınırı, Süzülüş Geniş Açısı, Look-Ahead, Kamera Yardımı, 1/3 Sol Kadraj, Jiroskop & Sıfır GC)
 */

import {
  UniversalCamera,
  Scene,
  Vector3,
  Scalar
} from '@babylonjs/core';
import { SettingsStore } from '../infra/SettingsStore';
import { GyroAimManager } from '../infra/GyroAimManager';

export class CameraRig {
  public camera: UniversalCamera;
  private scene: Scene;

  // Küresel Yörünge Açıları (Radyan)
  public yaw = 0;
  public pitch = 0.28;
  public distance = 5.2;

  // Hedef Modları
  public isAiming = false;
  public lockedTargetPos: Vector3 | null = null;

  // Düzgün Yumuşatma (Spring Lerp)
  private currentPos = new Vector3(0, 3, -5);
  private currentLookAt = new Vector3(0, 1.2, 0);

  // Limitler
  private minPitch = -0.22;
  private maxPitch = 1.15;

  // Referans FOV ve Ultra-Geniş Üst Sınırı (16:9 = 1.777)
  private readonly BASE_FOV = 0.82;
  private readonly BASE_AIM_FOV = 0.68;
  private readonly MAX_HORIZONTAL_FOV = 1.22;

  // Kamera Yardımı & Look-Ahead Durumları
  private lookAheadOffset = new Vector3(0, 0, 0);
  private lastManualRotateTime = 0;

  // Jiroskop scratch nesnesi
  private gyroDelta = { x: 0, y: 0 };

  // Sıcak döngüde sıfır bellek tahsis scratch nesneleri (Rule 7: Zero GC)
  private scratchTargetLookAt = new Vector3(0, 0, 0);
  private scratchTargetCamPos = new Vector3(0, 0, 0);
  private scratchMidPoint = new Vector3(0, 0, 0);
  private scratchToEnemy = new Vector3(0, 0, 0);
  private scratchPosWithShake = new Vector3(0, 0, 0);
  private scratchLookAtWithShake = new Vector3(0, 0, 0);

  constructor(scene: Scene) {
    this.scene = scene;

    this.camera = new UniversalCamera('otuken_follow_cam', new Vector3(0, 2, -5), scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.2;
    this.camera.maxZ = 160.0;
    this.camera.fovMode = UniversalCamera.FOVMODE_VERTICAL_FIXED;
    this.camera.fov = this.BASE_FOV;
  }

  public rotate(deltaX: number, deltaY: number): void {
    const sens = SettingsStore.get().cameraSensitivity * 0.005;
    const invert = SettingsStore.get().invertCameraY ? -1 : 1;

    this.yaw += deltaX * sens;
    this.pitch -= deltaY * sens * invert;
    this.pitch = Scalar.Clamp(this.pitch, this.minPitch, this.maxPitch);

    this.lastManualRotateTime = performance.now();
  }

  public recenter(playerHeading: number): void {
    this.yaw = playerHeading;
    this.pitch = 0.28;
    this.lastManualRotateTime = performance.now();
  }

  /**
   * Kural 3: 16:9'dan 21:9'a yatayda tutarlı FOV, ultra-geniş ekranda üst sınır & süzülüş FOV genişlemesi
   */
  private updateAdaptiveFOV(isAiming: boolean, isGliding = false): void {
    const engine = this.scene.getEngine();
    const aspect = engine.getAspectRatio(this.camera);

    let baseFov = isAiming ? this.BASE_AIM_FOV : this.BASE_FOV;
    if (isGliding) {
      baseFov *= 1.10; // Yel Ana ile süzülürken geniş açı
    }

    const baseAspect = 16 / 9;

    if (aspect > baseAspect) {
      let hFov = 2 * Math.atan(Math.tan(baseFov / 2) * baseAspect);
      if (hFov > this.MAX_HORIZONTAL_FOV) {
        hFov = this.MAX_HORIZONTAL_FOV;
      }
      this.camera.fov = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    } else {
      this.camera.fov = baseFov;
    }
  }

  /**
   * Kural 3: Sıcak döngüde sıfır tahsisli kamera güncellemesi
   */
  public update(
    targetPos: Vector3,
    terrain: { getHeightAt: (x: number, z: number) => number },
    deltaTime: number,
    shakeOffset: Vector3,
    isAiming = false,
    lockTargetPos: Vector3 | null = null,
    playerHeading = 0,
    isMoving = false,
    moveSpeed = 0,
    isGliding = false
  ): void {
    this.isAiming = isAiming;
    this.lockedTargetPos = lockTargetPos;

    this.updateAdaptiveFOV(isAiming, isGliding);

    // 1. Jiroskop İnce Nişan (Yay modundayken)
    if (isAiming) {
      GyroAimManager.consumeGyroDelta(true, this.gyroDelta);
      if (this.gyroDelta.x !== 0 || this.gyroDelta.y !== 0) {
        this.yaw += this.gyroDelta.x;
        this.pitch -= this.gyroDelta.y;
        this.pitch = Scalar.Clamp(this.pitch, this.minPitch, this.maxPitch);
      }
    }

    // 2. Kamera Yardımı (Koşarken kameranın hareket yönüne yavaşça yaslanması)
    const now = performance.now();
    const timeSinceManualRotate = (now - this.lastManualRotateTime) / 1000;
    if (
      SettingsStore.get().cameraAssist &&
      !isAiming &&
      !lockTargetPos &&
      isMoving &&
      moveSpeed > 2.5 &&
      timeSinceManualRotate > 1.2
    ) {
      let angleDiff = playerHeading - this.yaw;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.yaw += angleDiff * Math.min(1.0, deltaTime * 1.4);
    }

    // 3. Look-Ahead (Hareket yönüne hafif öne bakış)
    if (isMoving && !isAiming && !lockTargetPos) {
      const targetLookAheadX = Math.sin(playerHeading) * 1.4;
      const targetLookAheadZ = Math.cos(playerHeading) * 1.4;
      this.lookAheadOffset.x = Scalar.Lerp(this.lookAheadOffset.x, targetLookAheadX, Math.min(1.0, deltaTime * 3.0));
      this.lookAheadOffset.z = Scalar.Lerp(this.lookAheadOffset.z, targetLookAheadZ, Math.min(1.0, deltaTime * 3.0));
    } else {
      this.lookAheadOffset.x = Scalar.Lerp(this.lookAheadOffset.x, 0, Math.min(1.0, deltaTime * 4.0));
      this.lookAheadOffset.z = Scalar.Lerp(this.lookAheadOffset.z, 0, Math.min(1.0, deltaTime * 4.0));
    }

    // 4. Hedef ve Mesafe Belirleme
    let targetDist = this.distance;
    let targetHeight = 1.35;
    let shoulderOffsetX = 0;

    if (isAiming) {
      targetDist = 2.4;
      targetHeight = 1.45;
      shoulderOffsetX = 0.65;
    } else if (lockTargetPos) {
      targetDist = 5.8;
      targetHeight = 1.4;
      shoulderOffsetX = 0.25;

      this.scratchToEnemy.copyFrom(lockTargetPos).subtractInPlace(targetPos);
      const enemyAngle = Math.atan2(this.scratchToEnemy.x, this.scratchToEnemy.z);
      this.yaw = Scalar.Lerp(this.yaw, enemyAngle, Math.min(1.0, deltaTime * 7.0));
    } else {
      // Normal Keşif: Karakter ekranın sol-orta üçte birinde (shoulderOffsetX: 0.42)
      shoulderOffsetX = 0.42;
    }

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const rightX = cosYaw;
    const rightZ = -sinYaw;

    // Bakış Noktası (Look-At)
    this.scratchTargetLookAt.copyFrom(targetPos);
    this.scratchTargetLookAt.y += targetHeight;
    this.scratchTargetLookAt.x += rightX * shoulderOffsetX + this.lookAheadOffset.x;
    this.scratchTargetLookAt.z += rightZ * shoulderOffsetX + this.lookAheadOffset.z;

    // Kamera Pozisyonu
    this.scratchTargetCamPos.x = this.scratchTargetLookAt.x - sinYaw * cosPitch * targetDist;
    this.scratchTargetCamPos.y = this.scratchTargetLookAt.y + sinPitch * targetDist;
    this.scratchTargetCamPos.z = this.scratchTargetLookAt.z - cosYaw * cosPitch * targetDist;

    // Arazi Çarpışma Koruması
    const groundHeightAtCam = terrain.getHeightAt(this.scratchTargetCamPos.x, this.scratchTargetCamPos.z);
    if (this.scratchTargetCamPos.y < groundHeightAtCam + 0.5) {
      this.scratchTargetCamPos.y = groundHeightAtCam + 0.5;
    }

    // Düzgün Yumuşatma (Spring-Lerp)
    const lerpSpeed = isAiming ? 18.0 : lockTargetPos ? 12.0 : 9.0;
    this.currentPos.x = Scalar.Lerp(this.currentPos.x, this.scratchTargetCamPos.x, Math.min(1.0, deltaTime * lerpSpeed));
    this.currentPos.y = Scalar.Lerp(this.currentPos.y, this.scratchTargetCamPos.y, Math.min(1.0, deltaTime * lerpSpeed));
    this.currentPos.z = Scalar.Lerp(this.currentPos.z, this.scratchTargetCamPos.z, Math.min(1.0, deltaTime * lerpSpeed));

    this.currentLookAt.x = Scalar.Lerp(this.currentLookAt.x, this.scratchTargetLookAt.x, Math.min(1.0, deltaTime * lerpSpeed));
    this.currentLookAt.y = Scalar.Lerp(this.currentLookAt.y, this.scratchTargetLookAt.y, Math.min(1.0, deltaTime * lerpSpeed));
    this.currentLookAt.z = Scalar.Lerp(this.currentLookAt.z, this.scratchTargetLookAt.z, Math.min(1.0, deltaTime * lerpSpeed));

    // Kamera Sarsıntısı Ekle
    this.scratchPosWithShake.copyFrom(this.currentPos).addInPlace(shakeOffset);
    this.scratchLookAtWithShake.copyFrom(this.currentLookAt).addInPlace(shakeOffset);

    this.camera.position.copyFrom(this.scratchPosWithShake);
    this.camera.setTarget(this.scratchLookAtWithShake);
  }
}
