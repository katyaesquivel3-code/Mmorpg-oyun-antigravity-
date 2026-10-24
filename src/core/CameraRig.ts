import {
  UniversalCamera,
  Scene,
  Vector3,
  Scalar
} from '@babylonjs/core';

export class CameraRig {
  public camera: UniversalCamera;
  private scene: Scene;

  // Orbit Angles in Radians
  public yaw = 0;
  public pitch = 0.28; // ~16 degrees downward angle
  public distance = 5.2;

  // Target modes
  public isAiming = false;
  public lockedTargetPos: Vector3 | null = null;

  // Smoothing Lerp state
  private currentPos = new Vector3(0, 3, -5);
  private currentLookAt = new Vector3(0, 1.2, 0);

  // Clamps
  private minPitch = -0.15;
  private maxPitch = 1.15;

  constructor(scene: Scene) {
    this.scene = scene;

    this.camera = new UniversalCamera('otuken_follow_cam', new Vector3(0, 2, -5), scene);
    this.camera.inputs.clear();
    this.camera.fov = 0.85;
    this.camera.minZ = 0.2;
    this.camera.maxZ = 150.0;
  }

  public rotate(deltaX: number, deltaY: number): void {
    const sensitivity = 0.005;
    this.yaw += deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;
    this.pitch = Scalar.Clamp(this.pitch, this.minPitch, this.maxPitch);
  }

  public recenter(playerHeading: number): void {
    this.yaw = playerHeading;
    this.pitch = 0.28;
  }

  public update(
    targetPos: Vector3,
    terrain: { getHeightAt: (x: number, z: number) => number },
    deltaTime: number,
    shakeOffset: Vector3 = Vector3.Zero(),
    isAiming = false,
    lockTargetPos: Vector3 | null = null
  ): void {
    this.isAiming = isAiming;
    this.lockedTargetPos = lockTargetPos;

    // 1. Dynamic Camera Distance & Framing based on mode
    let targetDist = 5.2;
    let targetLookAt = new Vector3(targetPos.x, targetPos.y + 1.25, targetPos.z);
    let rightOffset = 0;

    if (this.isAiming) {
      // Over the shoulder bow zoom
      targetDist = 2.4;
      targetLookAt.y = targetPos.y + 1.4;
      rightOffset = 0.65; // Offset to right shoulder
      this.camera.fov = 0.72; // Zoomed FOV
    } else if (this.lockedTargetPos) {
      // Frame both Ayaz and locked target
      targetDist = 6.2;
      this.camera.fov = 0.85;

      // Look at midpoint between player and enemy
      const midPoint = targetPos.add(this.lockedTargetPos).scale(0.5);
      midPoint.y += 1.2;
      targetLookAt = midPoint;

      // Auto-align yaw to look from behind player towards enemy
      const toEnemy = this.lockedTargetPos.subtract(targetPos);
      const desiredYaw = Math.atan2(toEnemy.x, toEnemy.z);
      let diff = desiredYaw - this.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.yaw += diff * Math.min(1.0, deltaTime * 3.5);
    } else {
      targetDist = 5.2;
      this.camera.fov = 0.85;
    }

    const horizDist = targetDist * Math.cos(this.pitch);
    const vertDist = targetDist * Math.sin(this.pitch);

    // Compute base position
    const camForwardX = Math.sin(this.yaw);
    const camForwardZ = Math.cos(this.yaw);
    const camRightX = camForwardZ;
    const camRightZ = -camForwardX;

    const targetCamPos = new Vector3(
      targetLookAt.x - camForwardX * horizDist + camRightX * rightOffset,
      targetLookAt.y + vertDist,
      targetLookAt.z - camForwardZ * horizDist + camRightZ * rightOffset
    );

    // 2. Terrain Collision Avoidance
    const groundHeightAtCam = terrain.getHeightAt(targetCamPos.x, targetCamPos.z);
    if (targetCamPos.y < groundHeightAtCam + 0.75) {
      targetCamPos.y = groundHeightAtCam + 0.75;
    }

    // 3. Smooth Damping (Spring Lerp)
    const lerpFactor = Math.min(1.0, deltaTime * 8.5);
    this.currentPos = Vector3.Lerp(this.currentPos, targetCamPos, lerpFactor);
    this.currentLookAt = Vector3.Lerp(this.currentLookAt, targetLookAt, lerpFactor);

    // Apply Camera Shake Trauma Offset
    this.camera.position.copyFrom(this.currentPos.add(shakeOffset));
    this.camera.setTarget(this.currentLookAt.add(shakeOffset.scale(0.5)));
  }
}
