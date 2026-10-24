import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  Vector3
} from '@babylonjs/core';

export class SkySystem {
  private scene: Scene;
  private skyDome: Mesh;
  private skyMaterial: StandardMaterial;

  public sunLight: DirectionalLight;
  public hemiLight: HemisphericLight;
  public shadowGen: ShadowGenerator | null;

  // Day-Night Time Constants
  public static readonly DAY_DURATION_SEC = 1200; // 20 minutes = 1 full day
  private timeOfDay = 0.35; // Start in pleasant morning (0.0 to 1.0)
  public timeScale = 1.0;

  // Sun and Moon orbit radius
  private orbitRadius = 150;

  constructor(scene: Scene, sunLight: DirectionalLight, shadowGen: ShadowGenerator | null) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.shadowGen = shadowGen;

    // Hemispheric ambient light for ground bounce
    this.hemiLight = new HemisphericLight('worldHemi', new Vector3(0, 1, 0), scene);
    this.hemiLight.intensity = 0.7;

    // Create a large inverted hemisphere skydome
    this.skyDome = MeshBuilder.CreateSphere('skyDome', { diameter: 450, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
    this.skyDome.isPickable = false;

    this.skyMaterial = new StandardMaterial('mat_skydome', scene);
    this.skyMaterial.backFaceCulling = false;
    this.skyMaterial.disableLighting = true; // Emissive sky colors
    this.skyDome.material = this.skyMaterial;

    // Initial sky update
    this.update(0, new Vector3(0, 0, 0));
  }

  public update(deltaTime: number, playerPos: Vector3): void {
    // Advance time
    this.timeOfDay = (this.timeOfDay + (deltaTime * this.timeScale) / SkySystem.DAY_DURATION_SEC) % 1.0;

    // Calculate solar angle (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunDirX = Math.cos(sunAngle);
    const sunDirY = Math.sin(sunAngle);
    const sunDirZ = 0.35; // Slight seasonal tilt

    // 1. Move Sun Light to follow player with orbital direction
    const sunPos = new Vector3(
      playerPos.x - sunDirX * this.orbitRadius,
      playerPos.y + Math.max(-20, sunDirY * this.orbitRadius),
      playerPos.z - sunDirZ * this.orbitRadius
    );
    this.sunLight.position.copyFrom(sunPos);
    this.sunLight.direction = new Vector3(sunDirX, -Math.max(0.15, sunDirY), sunDirZ).normalize();

    // 2. Center Skydome on player to prevent edge clipping
    this.skyDome.position.set(playerPos.x, playerPos.y - 40, playerPos.z);

    // 3. Sun Intensity & Day/Night Color Blending
    const sunAltitude = sunDirY; // -1 (midnight) to +1 (noon)

    if (sunAltitude > 0.15) {
      // Daytime (Golden noon to bright afternoon)
      const dayFactor = Math.min(1.0, (sunAltitude - 0.15) / 0.5);
      this.sunLight.intensity = 1.1 + dayFactor * 0.4;
      this.sunLight.diffuse = Color3.Lerp(new Color3(1.0, 0.85, 0.6), new Color3(1.0, 0.98, 0.88), dayFactor);

      // Sky: Azure blue
      const skyCol = Color3.Lerp(new Color3(0.35, 0.65, 0.95), new Color3(0.22, 0.58, 0.98), dayFactor);
      this.skyMaterial.emissiveColor = skyCol;
      this.scene.fogColor = Color3.Lerp(new Color3(0.7, 0.82, 0.95), new Color3(0.55, 0.78, 0.95), dayFactor);
      this.scene.clearColor.set(skyCol.r, skyCol.g, skyCol.b, 1.0);

      this.hemiLight.intensity = 0.65 + dayFactor * 0.25;
      this.hemiLight.diffuse = new Color3(0.9, 0.95, 1.0);
      this.hemiLight.groundColor = new Color3(0.25, 0.35, 0.2);
    } else if (sunAltitude > -0.15) {
      // Twilight (Dawn / Dusk Golden Hour)
      const t = (sunAltitude + 0.15) / 0.3; // 0 (night boundary) to 1 (day boundary)
      this.sunLight.intensity = 0.4 + t * 0.7;
      this.sunLight.diffuse = new Color3(1.0, 0.45, 0.2); // Golden crimson horizon

      // Sky: Rose / Purple / Amber gradient
      const twilightSky = Color3.Lerp(new Color3(0.12, 0.1, 0.25), new Color3(0.95, 0.45, 0.3), t);
      this.skyMaterial.emissiveColor = twilightSky;
      this.scene.fogColor = Color3.Lerp(new Color3(0.2, 0.18, 0.32), new Color3(0.85, 0.55, 0.45), t);
      this.scene.clearColor.set(twilightSky.r, twilightSky.g, twilightSky.b, 1.0);

      this.hemiLight.intensity = 0.35 + t * 0.3;
    } else {
      // Night (Moonlight and Starlight)
      this.sunLight.intensity = 0.15; // Soft moonlight
      this.sunLight.diffuse = new Color3(0.35, 0.45, 0.75); // Pale lunar blue

      // Sky: Deep obsidian / indigo
      const nightSky = new Color3(0.02, 0.04, 0.1);
      this.skyMaterial.emissiveColor = nightSky;
      this.scene.fogColor = new Color3(0.04, 0.06, 0.12);
      this.scene.clearColor.set(0.02, 0.04, 0.09, 1.0);

      this.hemiLight.intensity = 0.2;
      this.hemiLight.diffuse = new Color3(0.25, 0.35, 0.55);
      this.hemiLight.groundColor = new Color3(0.05, 0.05, 0.08);
    }
  }

  /**
   * Formats current game time as string (e.g. "14:30 - GÜNDÜZ").
   */
  public getTimeString(): string {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

    let period = 'GÜNDÜZ';
    if (hours >= 5 && hours < 8) period = 'ŞAFAK';
    else if (hours >= 8 && hours < 18) period = 'GÜNDÜZ';
    else if (hours >= 18 && hours < 21) period = 'GÜN BATIMI';
    else period = 'GECE';

    return `${pad(hours)}:${pad(mins)} &bull; ${period}`;
  }
}
