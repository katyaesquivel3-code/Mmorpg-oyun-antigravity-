/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Mabet Temel Sınıfı (ShrineBase)
 * (Giriş Kapısı, Bulmaca Durumu, Tamamlanma Kaydı, Ganimet Sandığı & Sunak)
 */

import {
  Scene,
  Vector3,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh
} from '@babylonjs/core';
import { EventBus } from '../infra/EventBus';
import { ProceduralAudio } from '../audio/ProceduralAudio';

export abstract class ShrineBase {
  public id: string;
  public nameTr: string;
  public position: Vector3;
  public scene: Scene;
  public rootNode: TransformNode;

  public isCompleted = false;
  public isPlayerInside = false;

  // Giriş Portal / Kapı Yapısı
  protected exteriorMesh: Mesh;

  constructor(id: string, nameTr: string, pos: Vector3, scene: Scene) {
    this.id = id;
    this.nameTr = nameTr;
    this.position = pos.clone();
    this.scene = scene;

    this.rootNode = new TransformNode(`shrine_${id}`, scene);
    this.rootNode.position.copyFrom(this.position);

    // Dış Mimari: Antik Türk Mabet Girişi (Kubbe ve Granit Kapı)
    this.exteriorMesh = MeshBuilder.CreateCylinder(
      `${id}_exterior`,
      { diameterTop: 6.5, diameterBottom: 8.5, height: 6.0, tessellation: 8 },
      scene
    );
    this.exteriorMesh.position.y = 3.0;
    const mat = new StandardMaterial(`${id}_extMat`, scene);
    mat.diffuseColor = new Color3(0.28, 0.32, 0.38);
    mat.emissiveColor = new Color3(0.04, 0.08, 0.12);
    this.exteriorMesh.material = mat;
    this.exteriorMesh.parent = this.rootNode;
  }

  /**
   * Oyuncunun mabede yaklaşıp yaklaşmadığını kontrol eder
   */
  public checkEntrance(playerPos: Vector3): boolean {
    const distSq = Vector3.DistanceSquared(playerPos, this.position);
    const isNear = distSq < 36.0; // 6m giriş yarıçapı

    if (isNear && !this.isPlayerInside) {
      this.isPlayerInside = true;
      EventBus.emit('shrine:entered', { shrineId: this.id, name: this.nameTr });
      EventBus.emit('ui:loot_toast', { text: `⛩️ ${this.nameTr} Mabedine Girildi` });
      ProceduralAudio.playBeaconHum();
    } else if (!isNear && this.isPlayerInside) {
      this.isPlayerInside = false;
    }

    return isNear;
  }

  public completeShrine(): void {
    if (!this.isCompleted) {
      this.isCompleted = true;
      EventBus.emit('shrine:completed', { shrineId: this.id, kamStoneReward: 1 });
      EventBus.emit('ui:loot_toast', { text: `✨ ${this.nameTr} Tamamlandı! 1 Kam Taşı Alındı.` });
      ProceduralAudio.playShrineSolvedFanfare();
    }
  }

  public abstract update(deltaTime: number, playerPos: Vector3, playerHeading: number): void;
}
