/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kutsal Işık Sütunu Görev İşaretçisi (BeaconPillar)
 * (3D Silindir Göğe Yükselen Işık Demeti, Additive Emissive Işıma, Dalgalanan Puls & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3
} from '@babylonjs/core';
import { QuestManager } from '../story/QuestManager';

export class BeaconPillar {
  private pillarMesh: Mesh;
  private ringMesh: Mesh;
  private matPillar: StandardMaterial;
  private matRing: StandardMaterial;

  private animTimer = 0;
  private scratchPos = new Vector3(0, 0, 0);

  constructor(private scene: Scene) {
    // 65 metre göğe uzanan ışık silindiri
    this.pillarMesh = MeshBuilder.CreateCylinder(
      'quest_beacon_pillar',
      { height: 65, diameterTop: 0.8, diameterBottom: 1.6, tessellation: 12 },
      this.scene
    );
    this.pillarMesh.isPickable = false;

    // Zemin Halka Dalgası
    this.ringMesh = MeshBuilder.CreateTorus(
      'quest_beacon_ring',
      { diameter: 3.5, thickness: 0.15, tessellation: 24 },
      this.scene
    );
    this.ringMesh.isPickable = false;

    // Additive Parlayan Kutsal Gök Mavisi & Altın Materyal
    this.matPillar = new StandardMaterial('mat_beacon_pillar', this.scene);
    this.matPillar.diffuseColor = new Color3(0.2, 0.7, 1.0);
    this.matPillar.emissiveColor = new Color3(0.3, 0.75, 1.0);
    this.matPillar.alpha = 0.55;
    this.matPillar.backFaceCulling = false;
    this.matPillar.disableLighting = true;
    this.pillarMesh.material = this.matPillar;

    this.matRing = new StandardMaterial('mat_beacon_ring', this.scene);
    this.matRing.diffuseColor = new Color3(0.95, 0.8, 0.2);
    this.matRing.emissiveColor = new Color3(1.0, 0.85, 0.25);
    this.matRing.alpha = 0.7;
    this.matRing.disableLighting = true;
    this.ringMesh.material = this.matRing;
  }

  public update(deltaTime: number): void {
    const beaconCoords = QuestManager.getInstance().getActiveBeaconPos();

    if (!beaconCoords) {
      this.pillarMesh.setEnabled(false);
      this.ringMesh.setEnabled(false);
      return;
    }

    this.pillarMesh.setEnabled(true);
    this.ringMesh.setEnabled(true);

    this.animTimer += deltaTime;

    // Sütun konumu (Yarı yükseklik +32.5m)
    this.scratchPos.set(beaconCoords.x, beaconCoords.y + 32.5, beaconCoords.z);
    this.pillarMesh.position.copyFrom(this.scratchPos);

    // Zemin halkası
    this.ringMesh.position.set(beaconCoords.x, beaconCoords.y + 0.2, beaconCoords.z);

    // Nabız puls efekti
    const pulse = 0.55 + Math.sin(this.animTimer * 3.5) * 0.15;
    this.matPillar.alpha = pulse;

    const ringScale = 1.0 + Math.sin(this.animTimer * 2.2) * 0.25;
    this.ringMesh.scaling.set(ringScale, 1.0, ringScale);
  }

  public dispose(): void {
    this.pillarMesh.dispose();
    this.ringMesh.dispose();
    this.matPillar.dispose();
    this.matRing.dispose();
  }
}
