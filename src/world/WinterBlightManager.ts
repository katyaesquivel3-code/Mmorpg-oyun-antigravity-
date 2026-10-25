/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kara Kış Kirlenmesi ve Arınma Sistemi (WinterBlightManager)
 * (Kirlenmiş Küre Hacimleri, Kut Gücü Yenilenmesini Engelleme, Zemin/Bitki Solması, Totem Yıkılınca Arınma & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  ParticleSystem,
  Color4
} from '@babylonjs/core';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface BlightZone {
  id: string;
  name: string;
  center: Vector3;
  radius: number;
  isPurified: boolean;
  domeMesh: Mesh;
  pulseTimer: number;
}

export class WinterBlightManager {
  private scene: Scene;
  public blightZones: BlightZone[] = [];

  // Materyaller
  private matBlightDome: StandardMaterial;
  private matPurifiedDome: StandardMaterial;

  // Oyuncunun aktif olarak kirlenmiş bölge içinde olup olmadığı
  public isPlayerInsideBlight = false;

  constructor(scene: Scene) {
    this.scene = scene;

    this.matBlightDome = new StandardMaterial('mat_blight_dome', scene);
    this.matBlightDome.diffuseColor = new Color3(0.08, 0.05, 0.12);
    this.matBlightDome.emissiveColor = new Color3(0.25, 0.05, 0.35); // Erlik kara büyü eflatun
    this.matBlightDome.alpha = 0.32;
    this.matBlightDome.backFaceCulling = false;

    this.matPurifiedDome = new StandardMaterial('mat_purified_dome', scene);
    this.matPurifiedDome.diffuseColor = new Color3(0.2, 0.85, 0.45);
    this.matPurifiedDome.emissiveColor = new Color3(0.15, 0.7, 0.35);
    this.matPurifiedDome.alpha = 0.0; // Arınınca görünmez olur

    // 1. Gölge Boğazı Kirlenme Bölgesi
    this.createBlightZone(
      'blight_shadow_gorge',
      'Gölge Boğazı Kirlenmesi',
      new Vector3(-92, 12, 88),
      28.0
    );

    // 2. Kara Çamur Kirlenme Bölgesi
    this.createBlightZone(
      'blight_black_mud',
      'Kara Çamur Kirlenmesi',
      new Vector3(108, 14, 118),
      32.0
    );

    // 3. Tepegöz Arenası Giriş Kirlenmesi
    this.createBlightZone(
      'blight_tepegoz_approach',
      'Tepegöz Mağara Kirlenmesi',
      new Vector3(0, 8, -115),
      34.0
    );
  }

  private createBlightZone(id: string, name: string, center: Vector3, radius: number): void {
    const dome = MeshBuilder.CreateSphere(`dome_${id}`, {
      diameter: radius * 2.0,
      segments: 12
    }, this.scene);
    dome.position.copyFrom(center);
    dome.material = this.matBlightDome;

    this.blightZones.push({
      id,
      name,
      center,
      radius,
      isPurified: false,
      domeMesh: dome,
      pulseTimer: Math.random() * Math.PI
    });
  }

  /**
   * Her karede oyuncunun kirlenmiş bölgede olup olmadığını denetler (Kut Gücü engeli)
   */
  public update(playerPos: Vector3, deltaTime: number): boolean {
    let inBlight = false;

    for (let i = 0; i < this.blightZones.length; i++) {
      const zone = this.blightZones[i];
      if (zone.isPurified) continue;

      zone.pulseTimer += deltaTime * 1.5;
      const pulseScale = 1.0 + Math.sin(zone.pulseTimer) * 0.03;
      zone.domeMesh.scaling.set(pulseScale, pulseScale, pulseScale);

      const dx = playerPos.x - zone.center.x;
      const dz = playerPos.z - zone.center.z;
      const dy = playerPos.y - zone.center.y;
      if (dx * dx + dz * dz + dy * dy <= zone.radius * zone.radius) {
        inBlight = true;
      }
    }

    this.isPlayerInsideBlight = inBlight;
    return this.isPlayerInsideBlight;
  }

  /**
   * Kara Totem yıkıldığında ilgili bölgedeki kirlenmeyi arındırır
   */
  public purifyZone(zoneId: string): void {
    const zone = this.blightZones.find((z) => z.id === zoneId);
    if (!zone || zone.isPurified) return;

    zone.isPurified = true;
    zone.domeMesh.material = this.matPurifiedDome;

    // Arınma Işık Patlaması
    const ps = new ParticleSystem(`purify_burst_${zoneId}`, 90, this.scene);
    ps.emitter = zone.domeMesh;
    ps.color1 = new Color4(0.3, 1.0, 0.5, 0.9);
    ps.color2 = new Color4(0.8, 1.0, 0.3, 0.7);
    ps.colorDead = new Color4(0.1, 0.4, 0.1, 0.0);
    ps.minSize = 0.25;
    ps.maxSize = 0.85;
    ps.minLifeTime = 1.0;
    ps.maxLifeTime = 2.4;
    ps.emitRate = 45;
    ps.minEmitPower = 3.5;
    ps.maxEmitPower = 7.0;
    ps.targetStopDuration = 2.5;
    ps.start();

    ProceduralAudio.playImpact(true);
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Börü',
      text: `${zone.name} arındırıldı! Kara Kış sönüyor, Kut Gücün yeniden akıyor!`
    });

    setTimeout(() => {
      zone.domeMesh.dispose();
    }, 2800);
  }

  public dispose(): void {
    for (const z of this.blightZones) {
      z.domeMesh.dispose();
    }
    this.blightZones = [];
    this.matBlightDome.dispose();
    this.matPurifiedDome.dispose();
  }
}
