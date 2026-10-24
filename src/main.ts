import { Game } from './core/Game';
import { CameraRig } from './core/CameraRig';
import { WorldNoise } from './world/WorldNoise';
import { WorldManager } from './world/WorldManager';
import { FoliageManager } from './world/FoliageManager';
import { SkySystem } from './world/SkySystem';
import { WaterSystem } from './world/WaterSystem';
import { WeatherSystem } from './world/WeatherSystem';
import { AyazModel } from './player/AyazModel';
import { PlayerController } from './player/PlayerController';
import { CombatSystem } from './combat/CombatSystem';
import { InputManager } from './input/InputManager';
import { QualityManager } from './ui/QualityManager';
import { HUD } from './ui/HUD';
import { Vector3 } from '@babylonjs/core';

window.addEventListener('DOMContentLoaded', () => {
  console.log("=== ÖTÜKEN: KUT'UN DÖRT PARÇASI (FAZ 2: SAVAŞ SİSTEMİ) BAŞLATILIYOR ===");

  // 1. Initialize WebGL2 Game Engine & Lighting
  const game = new Game('gameCanvas');

  // 2. Initialize Shared World Mathematical Noise
  const noise = new WorldNoise(4815);

  // 3. Initialize GPU Thin Instance Foliage System
  const foliage = new FoliageManager(game.scene, noise, game.shadowGenerator);

  // 4. Initialize 512x512m Open World Manager & 5x5 Streaming Chunk Grid
  const world = new WorldManager(game.scene, foliage);

  // 5. Initialize 20-minute Day-Night Sky & Sun Orbital System
  const sky = new SkySystem(game.scene, game.sunLight!, game.shadowGenerator);

  // 6. Initialize Şahmaran Lake Water Shader
  const water = new WaterSystem(game.scene);

  // 7. Initialize Biome Weather Particle System
  const weather = new WeatherSystem(game.scene);

  // 8. Construct Ayaz 3D Procedural Model with TransformNode Skeletal Rig & Equipment
  const ayaz = new AyazModel(game.scene, game.shadowGenerator);

  // 9. Initialize Player Movement Controller
  const player = new PlayerController(ayaz);

  // 10. Initialize Combat System (Kam Kılıcı, Yay, Kalkan, Parry, Dodge Roll, Kut Zamanı, Talim Kuklaları)
  const combat = new CombatSystem(game.scene, world);

  // 11. Initialize Smooth 3rd Person Follow Camera Rig
  const cameraRig = new CameraRig(game.scene);
  game.scene.activeCamera = cameraRig.camera;

  // 12. Initialize Input Manager (BotW Diamond, Touch Joystick, Keyboard, Gamepad)
  const inputManager = new InputManager();

  // Wire Combat Actions
  inputManager.setCombatCallbacks({
    onAttack: (isCharged: boolean) => {
      if (combat.actionState === 'BOW_AIM') {
        // In Bow Aim mode, tapping attack button releases arrow!
        const arrowOrigin = ayaz.root.position.clone().add(new Vector3(0, 1.3, 0));
        const forwardX = Math.sin(cameraRig.yaw);
        const forwardZ = Math.cos(cameraRig.yaw);
        const pitchY = Math.tan(-cameraRig.pitch);
        const dir = new Vector3(forwardX, pitchY, forwardZ).normalize();
        combat.shootArrow(arrowOrigin, dir);
      } else {
        combat.triggerAttack(isCharged);
      }
    },
    onChargeStart: () => {
      combat.startCharge();
    },
    onChargeRelease: () => {
      combat.releaseCharge();
    },
    onDodgeRoll: () => {
      combat.triggerDodgeRoll(player.headingAngle);
    },
    onShield: (active: boolean) => {
      combat.setShieldActive(active);
    },
    onBowAimToggle: () => {
      if (combat.actionState === 'BOW_AIM') {
        // Fire arrow and exit aim
        const arrowOrigin = ayaz.root.position.clone().add(new Vector3(0, 1.3, 0));
        const forwardX = Math.sin(cameraRig.yaw);
        const forwardZ = Math.cos(cameraRig.yaw);
        const pitchY = Math.tan(-cameraRig.pitch);
        const dir = new Vector3(forwardX, pitchY, forwardZ).normalize();
        combat.shootArrow(arrowOrigin, dir);
        combat.setBowAim(false);
      } else {
        combat.setBowAim(true);
      }
    },
    onBowShoot: () => {
      const arrowOrigin = ayaz.root.position.clone().add(new Vector3(0, 1.3, 0));
      const forwardX = Math.sin(cameraRig.yaw);
      const forwardZ = Math.cos(cameraRig.yaw);
      const pitchY = Math.tan(-cameraRig.pitch);
      const dir = new Vector3(forwardX, pitchY, forwardZ).normalize();
      combat.shootArrow(arrowOrigin, dir);
    },
    onLockOnToggle: () => {
      combat.toggleLockOn(player.position);
    }
  });

  // 13. Initialize DOM Graphics Quality Manager
  const quality = new QualityManager(game.engine, game.shadowGenerator, foliage, game.pipeline);

  // 14. Initialize DOM HUD Telemetry
  const hud = new HUD(() => {
    cameraRig.recenter(player.headingAngle);
  });

  // Initial positioning: Center Ayaz on the starting homeland plateau near the training dummies
  const initialGroundHeight = world.getHeightAt(0, 0);
  player.position.set(0, initialGroundHeight, 0);
  ayaz.root.position.copyFrom(player.position);
  cameraRig.recenter(player.headingAngle);

  // Initial chunk grid population
  world.update(player.position);

  // 15. 60 FPS Game Loop
  game.startRenderLoop((deltaTime: number) => {
    // Effective time scale during Kut Zamanı (world moves at 20% speed)
    const effectiveDelta = combat.isKutZamaniActive ? deltaTime * 0.2 : deltaTime;

    // Poll input vectors
    const moveInput = inputManager.poll(deltaTime);
    const lookDelta = inputManager.consumeLookDelta();

    // Rotate camera based on touch swipe (unless locked on)
    if (lookDelta.x !== 0 || lookDelta.y !== 0) {
      cameraRig.rotate(lookDelta.x, lookDelta.y);
    }

    // Update Combat System (combos, charges, arrow ballistics, 3D damage numbers, dummy AI)
    combat.update(deltaTime, player.position, player.headingAngle, world);

    // Update Player physics, root motion, lock-on strafe, swimming, and animations
    player.update(moveInput, cameraRig.yaw, world, combat, deltaTime);

    // Update Camera follow position, over-the-shoulder bow aim, lock-on framing, and trauma shake
    const isBowAiming = combat.actionState === 'BOW_AIM' || combat.actionState === 'BOW_SHOOT';
    const lockPos = combat.lockedTarget ? combat.lockedTarget.position : null;
    cameraRig.update(
      player.position,
      world,
      deltaTime,
      combat.cameraShakeOffset,
      isBowAiming,
      lockPos
    );

    // Stream 5x5 chunk grid around player
    world.update(player.position);

    // Update 20-min Day-Night sky and sun shadows following player
    sky.update(effectiveDelta, player.position);

    // Update water wave displacement and specular direction
    water.update(effectiveDelta, sky.sunLight.direction);

    // Determine current biome and trigger procedural weather
    const activeBiome = world.getBiomeAt(player.position.x, player.position.z, player.position.y);
    weather.update(player.position, activeBiome, effectiveDelta);

    // Auto quality tuner (protects 30+ FPS floor)
    quality.update(hud.currentFps, deltaTime);

    // Update HUD telemetry
    hud.update(
      deltaTime,
      combat,
      game.getActiveVertices(),
      activeBiome.name,
      world.getActiveChunkCount(),
      game.scene
    );
  });

  console.log("=== ÖTÜKEN SAVAŞ MOTORU AKTİF (KAM KILIÇ, YAY, KALKAN, PARRY, KUT ZAMANI) ===");
});
