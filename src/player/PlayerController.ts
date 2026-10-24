import { Vector3, Scalar } from '@babylonjs/core';
import { AyazModel, AyazAnimState } from './AyazModel';
import { MovementInput } from '../input/InputManager';
import { WorldManager } from '../world/WorldManager';
import { WorldNoise } from '../world/WorldNoise';
import { CombatSystem } from '../combat/CombatSystem';

export class PlayerController {
  public model: AyazModel;
  public position: Vector3 = new Vector3(0, 0, 0);
  public headingAngle = 0; // In radians

  // Movement physics constants
  private walkSpeed = 3.4; // m/s
  private runSpeed = 7.6;  // m/s
  private swimSpeed = 3.0; // m/s
  private aimSpeed = 1.6;  // m/s during bow aim
  private currentSpeed = 0;
  private acceleration = 12.0;
  private deceleration = 16.0;
  private rotationSpeed = 14.0;

  // 512x512m region world boundary (-250m to +250m)
  private maxBoundary = 250.0;

  // Ground elevation and water status
  public currentGroundHeight = 0;
  public isInWater = false;

  constructor(model: AyazModel) {
    this.model = model;
    this.position = this.model.root.position;
  }

  public update(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    combat: CombatSystem,
    deltaTime: number
  ): void {
    const hasMoveInput = input.magnitude > 0.05;

    // 1. Water Volume Check
    this.currentGroundHeight = world.getHeightAt(this.position.x, this.position.z);
    this.isInWater = this.currentGroundHeight < (WorldNoise.WATER_LEVEL - 0.35);

    // 2. Determine Action State vs Locomotion State
    const combatAction = combat.actionState;
    const isActing = combatAction !== 'IDLE';

    // 3. Handle Root Motion during Melee Attacks or Dodge Roll
    if (isActing) {
      // Apply Combat Root Motion (Step forward during slashes, somersault during roll)
      if (combat.rootMotionOffset.lengthSquared() > 0.00001) {
        this.position.x += combat.rootMotionOffset.x;
        this.position.z += combat.rootMotionOffset.z;
      }

      // During bow aim, allow slow strafing
      if (combatAction === 'BOW_AIM') {
        this.handleBowAimMovement(input, cameraYaw, deltaTime);
      }

      // In Lock-on mode during attacks, keep facing the locked target
      if (combat.lockedTarget) {
        const toTarget = combat.lockedTarget.position.subtract(this.position);
        this.headingAngle = Math.atan2(toTarget.x, toTarget.z);
      }

      // Snap elevation
      this.snapElevation();
      this.model.root.position.copyFrom(this.position);
      this.model.root.rotation.y = this.headingAngle;

      // Animate combat action
      const hitStopped = combat.playerHitStopTimer > 0;
      this.model.updateAnimation(combatAction, 1.0, deltaTime, hitStopped);
      return;
    }

    // 4. Locomotion Logic (Lock-on Orbit Strafe vs Standard Free Movement)
    if (combat.lockedTarget) {
      this.handleLockOnLocomotion(input, combat.lockedTarget.position, cameraYaw, world, deltaTime);
    } else {
      this.handleFreeLocomotion(input, cameraYaw, world, deltaTime);
    }

    // 5. Ground & Water Level Snapping
    this.snapElevation();

    this.model.root.position.copyFrom(this.position);
    this.model.root.rotation.y = this.headingAngle;

    // 6. Update Locomotion Animation
    let locomotionState: AyazAnimState = 'IDLE';
    if (this.isInWater) {
      locomotionState = 'SWIM';
    } else if (this.currentSpeed > 0.2) {
      locomotionState = input.isRunRequested ? 'RUN' : 'WALK';
    }

    const maxReferenceSpeed = this.isInWater ? this.swimSpeed : this.runSpeed;
    const speedRatio = this.currentSpeed / maxReferenceSpeed;
    const hitStopped = combat.playerHitStopTimer > 0;
    this.model.updateAnimation(locomotionState, speedRatio, deltaTime, hitStopped);
  }

  /**
   * Lock-on Mode: Ayaz always faces the target, and joystick strafes in orbit around it.
   */
  private handleLockOnLocomotion(
    input: MovementInput,
    targetPos: Vector3,
    cameraYaw: number,
    world: WorldManager,
    deltaTime: number
  ): void {
    // Face the target
    const toTarget = targetPos.subtract(this.position);
    this.headingAngle = Math.atan2(toTarget.x, toTarget.z);

    const hasMoveInput = input.magnitude > 0.05;
    const targetSpeed = hasMoveInput ? (input.isRunRequested ? this.runSpeed * 0.8 : this.walkSpeed) : 0;
    this.currentSpeed = Scalar.Lerp(this.currentSpeed, targetSpeed, Math.min(1.0, deltaTime * this.acceleration));

    if (hasMoveInput) {
      // Forward/backward = radially towards/away from target
      // Left/right = tangentially orbiting target
      const forwardDir = toTarget.clone().normalize();
      const rightDir = new Vector3(forwardDir.z, 0, -forwardDir.x);

      const moveDir = forwardDir.scale(input.y).add(rightDir.scale(input.x)).normalize();

      this.position.x += moveDir.x * this.currentSpeed * deltaTime;
      this.position.z += moveDir.z * this.currentSpeed * deltaTime;

      this.clampWorldBounds();
    }
  }

  /**
   * Free-roam Movement: Rotates towards camera-relative input direction.
   */
  private handleFreeLocomotion(
    input: MovementInput,
    cameraYaw: number,
    world: WorldManager,
    deltaTime: number
  ): void {
    const hasMoveInput = input.magnitude > 0.05;

    let targetSpeed = 0;
    if (this.isInWater) {
      targetSpeed = hasMoveInput ? this.swimSpeed * input.magnitude : 0;
    } else if (hasMoveInput) {
      targetSpeed = (input.isRunRequested ? this.runSpeed : this.walkSpeed) * input.magnitude;
    }

    // Direction Relative to Camera Angle
    if (hasMoveInput) {
      const camForwardX = Math.sin(cameraYaw);
      const camForwardZ = Math.cos(cameraYaw);
      const camRightX = camForwardZ;
      const camRightZ = -camForwardX;

      const moveDirX = camForwardX * input.y + camRightX * input.x;
      const moveDirZ = camForwardZ * input.y + camRightZ * input.x;

      const moveLen = Math.sqrt(moveDirX * moveDirX + moveDirZ * moveDirZ);
      if (moveLen > 0.01) {
        const normDirX = moveDirX / moveLen;
        const normDirZ = moveDirZ / moveLen;

        // Slope Speed Adjustment
        let slopeSpeedMultiplier = 1.0;
        if (!this.isInWater) {
          const heightAhead = world.getHeightAt(this.position.x + normDirX * 1.0, this.position.z + normDirZ * 1.0);
          const deltaHeight = heightAhead - this.currentGroundHeight;

          if (deltaHeight > 0.1) {
            slopeSpeedMultiplier = Math.max(0.6, 1.0 - (deltaHeight / 1.0) * 0.45);
          } else if (deltaHeight < -0.1) {
            slopeSpeedMultiplier = Math.min(1.2, 1.0 + (-deltaHeight / 1.0) * 0.25);
          }
        }

        targetSpeed *= slopeSpeedMultiplier;

        // Smooth rotation towards movement direction
        const targetAngle = Math.atan2(normDirX, normDirZ);
        let angleDiff = targetAngle - this.headingAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        this.headingAngle += angleDiff * Math.min(1.0, deltaTime * this.rotationSpeed);

        // Apply Position Delta
        this.position.x += normDirX * this.currentSpeed * deltaTime;
        this.position.z += normDirZ * this.currentSpeed * deltaTime;

        this.clampWorldBounds();
      }
    }

    // Smooth Velocity
    const rate = targetSpeed > this.currentSpeed ? this.acceleration : this.deceleration;
    this.currentSpeed = Scalar.Lerp(this.currentSpeed, targetSpeed, Math.min(1.0, deltaTime * rate));

    if (this.currentSpeed < 0.08 && !hasMoveInput) {
      this.currentSpeed = 0;
    }
  }

  private handleBowAimMovement(input: MovementInput, cameraYaw: number, deltaTime: number): void {
    // Face camera aim direction
    this.headingAngle = cameraYaw;

    if (input.magnitude > 0.05) {
      const camForwardX = Math.sin(cameraYaw);
      const camForwardZ = Math.cos(cameraYaw);
      const camRightX = camForwardZ;
      const camRightZ = -camForwardX;

      const moveX = camForwardX * input.y + camRightX * input.x;
      const moveZ = camForwardZ * input.y + camRightZ * input.x;

      this.position.x += moveX * this.aimSpeed * deltaTime;
      this.position.z += moveZ * this.aimSpeed * deltaTime;
      this.clampWorldBounds();
    }
  }

  private snapElevation(): void {
    if (this.isInWater) {
      this.position.y = WorldNoise.WATER_LEVEL - 0.22;
    } else {
      this.position.y = this.currentGroundHeight;
    }
  }

  private clampWorldBounds(): void {
    this.position.x = Scalar.Clamp(this.position.x, -this.maxBoundary, this.maxBoundary);
    this.position.z = Scalar.Clamp(this.position.z, -this.maxBoundary, this.maxBoundary);
  }
}
