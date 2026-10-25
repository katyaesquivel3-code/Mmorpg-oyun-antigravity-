/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Gelişmiş Ok ve Yay Sistemi (ArrowSystem)
 * (Normal, Ateşli & Delici Temrenler, Balistik Yörünge, Çoklu Delme & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode
} from '@babylonjs/core';
import { WorldManager } from '../world/WorldManager';
import { ArrowType, ARROW_DEFINITIONS } from './WeaponData';

export interface ArrowHitCallback {
  (hitPos: Vector3, normal: Vector3, damage: number, isHeadshot: boolean, arrowType: ArrowType): void;
}

interface ActiveArrow {
  root: TransformNode;
  mesh: Mesh;
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  damage: number;
  arrowType: ArrowType;
  pierceRemaining: number;
  isStuck: boolean;
}

export class ArrowSystem {
  private scene: Scene;
  public activeArrows: ActiveArrow[] = [];

  // Temren ve Malzeme Materyalleri
  private matWood: StandardMaterial;
  private matFeather: StandardMaterial;
  private matTipNormal: StandardMaterial;
  private matTipFire: StandardMaterial;
  private matTipPiercing: StandardMaterial;

  // Sadak Stokları
  public ammoStock: Record<ArrowType, number> = {
    NORMAL: 35,
    FIRE: 15,
    PIERCING: 10
  };
  public selectedArrowType: ArrowType = 'NORMAL';

  // Fizik Sabitleri
  private gravity = -16.5;

  // Sıcak döngüde sıfır GC scratch vektörleri
  private scratchStep = new Vector3(0, 0, 0);
  private scratchNextPos = new Vector3(0, 0, 0);
  private scratchNormal = new Vector3(0, 0, 0);

  constructor(scene: Scene) {
    this.scene = scene;

    this.matWood = new StandardMaterial('mat_arrow_wood', scene);
    this.matWood.diffuseColor = new Color3(0.5, 0.35, 0.2);

    this.matFeather = new StandardMaterial('mat_arrow_feather', scene);
    this.matFeather.diffuseColor = new Color3(0.9, 0.85, 0.7);

    this.matTipNormal = new StandardMaterial('mat_tip_norm', scene);
    this.matTipNormal.diffuseColor = new Color3(0.65, 0.68, 0.72);
    this.matTipNormal.specularColor = new Color3(0.8, 0.8, 0.8);

    this.matTipFire = new StandardMaterial('mat_tip_fire', scene);
    this.matTipFire.diffuseColor = new Color3(1.0, 0.35, 0.05);
    this.matTipFire.emissiveColor = new Color3(0.85, 0.25, 0.0);

    this.matTipPiercing = new StandardMaterial('mat_tip_pierce', scene);
    this.matTipPiercing.diffuseColor = new Color3(0.25, 0.85, 1.0);
    this.matTipPiercing.emissiveColor = new Color3(0.15, 0.65, 0.95);
  }

  /**
   * Seçili Ok Türünü Değiştirir
   */
  public selectNextArrowType(): ArrowType {
    const types: ArrowType[] = ['NORMAL', 'FIRE', 'PIERCING'];
    const curIdx = types.indexOf(this.selectedArrowType);
    this.selectedArrowType = types[(curIdx + 1) % types.length];
    return this.selectedArrowType;
  }

  /**
   * Yaydan Ok Fırlatır
   */
  public shootArrow(origin: Vector3, direction: Vector3, damageOverride?: number): boolean {
    const arrowType = this.selectedArrowType;
    if (this.ammoStock[arrowType] <= 0) {
      // Bu ok türü bittiyse ve normal ok varsa normale dön
      if (arrowType !== 'NORMAL' && this.ammoStock['NORMAL'] > 0) {
        this.selectedArrowType = 'NORMAL';
      } else {
        return false;
      }
    }

    this.ammoStock[this.selectedArrowType]--;
    const def = ARROW_DEFINITIONS[this.selectedArrowType];
    const damage = damageOverride ?? def.baseDamage;

    const root = new TransformNode('arrow_root', this.scene);
    root.position.copyFrom(origin);

    // Ahşap Gövde
    const shaft = MeshBuilder.CreateCylinder('arrow_shaft', {
      height: 0.92,
      diameter: 0.024,
      tessellation: 6
    }, this.scene);
    shaft.material = this.matWood;
    shaft.rotation.x = Math.PI / 2;
    shaft.parent = root;

    // Temren Ucu
    let tipMat = this.matTipNormal;
    if (this.selectedArrowType === 'FIRE') tipMat = this.matTipFire;
    else if (this.selectedArrowType === 'PIERCING') tipMat = this.matTipPiercing;

    const tip = MeshBuilder.CreateCylinder('arrow_tip', {
      height: 0.16,
      diameterTop: 0.002,
      diameterBottom: 0.048,
      tessellation: 4
    }, this.scene);
    tip.position.z = 0.50;
    tip.rotation.x = Math.PI / 2;
    tip.material = tipMat;
    tip.parent = root;

    // Yelek / Tüy
    const fletch = MeshBuilder.CreateBox('arrow_fletch', {
      width: 0.08,
      height: 0.02,
      depth: 0.22
    }, this.scene);
    fletch.position.z = -0.38;
    fletch.material = this.matFeather;
    fletch.parent = root;

    const normDir = direction.normalize();
    const speed = def.speed;

    this.activeArrows.push({
      root,
      mesh: shaft,
      position: origin.clone(),
      velocity: normDir.scale(speed),
      life: 0,
      maxLife: 5.5,
      damage,
      arrowType: this.selectedArrowType,
      pierceRemaining: def.pierceCount,
      isStuck: false
    });

    return true;
  }

  public update(
    deltaTime: number,
    world: WorldManager,
    onEnemyCheck: (pos: Vector3, radius: number) => { hit: boolean; enemyPos: Vector3; isHeadshot: boolean } | null,
    onHit: ArrowHitCallback
  ): void {
    for (let i = this.activeArrows.length - 1; i >= 0; i--) {
      const arrow = this.activeArrows[i];
      arrow.life += deltaTime;

      if (arrow.isStuck) {
        if (arrow.life >= arrow.maxLife) {
          arrow.root.dispose();
          this.activeArrows.splice(i, 1);
        }
        continue;
      }

      // Balistik Hareket: Yerçekimi ve Hız Entegrasyonu
      const def = ARROW_DEFINITIONS[arrow.arrowType];
      arrow.velocity.y += (this.gravity * (def.gravityFactor / 9.8)) * deltaTime;

      this.scratchStep.copyFrom(arrow.velocity).scaleInPlace(deltaTime);
      this.scratchNextPos.copyFrom(arrow.position).addInPlace(this.scratchStep);

      // Düşman / Hedef Çarpışma Kontrolü
      const enemyHit = onEnemyCheck(this.scratchNextPos, 0.48);
      if (enemyHit && enemyHit.hit) {
        this.scratchNormal.copyFrom(arrow.velocity).normalize().scaleInPlace(-1);
        const finalDamage = enemyHit.isHeadshot ? arrow.damage * 2.0 : arrow.damage;
        onHit(this.scratchNextPos, this.scratchNormal, finalDamage, enemyHit.isHeadshot, arrow.arrowType);

        arrow.pierceRemaining--;
        if (arrow.pierceRemaining <= 0) {
          arrow.isStuck = true;
          arrow.position.copyFrom(this.scratchNextPos);
          arrow.root.position.copyFrom(arrow.position);
          arrow.life = arrow.maxLife - 0.8;
          continue;
        }
      }

      // Arazi Çarpışması Kontrolü
      const groundH = world.getHeightAt(this.scratchNextPos.x, this.scratchNextPos.z);
      if (this.scratchNextPos.y <= groundH) {
        arrow.isStuck = true;
        arrow.position.x = this.scratchNextPos.x;
        arrow.position.z = this.scratchNextPos.z;
        arrow.position.y = groundH;
        arrow.root.position.copyFrom(arrow.position);
        arrow.life = arrow.maxLife - 1.2;
        continue;
      }

      // Havada İlerleme & Yön Açısı
      arrow.position.copyFrom(this.scratchNextPos);
      arrow.root.position.copyFrom(arrow.position);

      const vx = arrow.velocity.x;
      const vy = arrow.velocity.y;
      const vz = arrow.velocity.z;
      const hSpeed = Math.hypot(vx, vz);

      if (hSpeed > 0.01) {
        arrow.root.rotation.y = Math.atan2(vx, vz);
        arrow.root.rotation.x = -Math.atan2(vy, hSpeed);
      }

      if (arrow.life >= arrow.maxLife) {
        arrow.root.dispose();
        this.activeArrows.splice(i, 1);
      }
    }
  }

  public get currentStock(): number {
    return this.ammoStock[this.selectedArrowType] ?? 0;
  }

  public refillAllAmmo(): void {
    this.ammoStock.NORMAL = 35;
    this.ammoStock.FIRE = 15;
    this.ammoStock.PIERCING = 10;
  }

  public dispose(): void {
    for (const a of this.activeArrows) {
      a.root.dispose();
    }
    this.activeArrows = [];
    this.matWood.dispose();
    this.matFeather.dispose();
    this.matTipNormal.dispose();
    this.matTipFire.dispose();
    this.matTipPiercing.dispose();
  }
}
