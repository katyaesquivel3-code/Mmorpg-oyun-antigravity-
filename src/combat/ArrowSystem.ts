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

export interface ArrowHitCallback {
  (hitPos: Vector3, normal: Vector3, damage: number, isHeadshot: boolean): void;
}

interface ActiveArrow {
  root: TransformNode;
  mesh: Mesh;
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  damage: number;
  isStuck: boolean;
}

export class ArrowSystem {
  private scene: Scene;
  private activeArrows: ActiveArrow[] = [];
  private matWood: StandardMaterial;
  private matFeather: StandardMaterial;
  private matTip: StandardMaterial;

  public arrowCount = 30; // Player arrow stock
  private gravity = -18.0; // Parabolic arrow drop

  constructor(scene: Scene) {
    this.scene = scene;

    this.matWood = new StandardMaterial('mat_arrow_wood', scene);
    this.matWood.diffuseColor = new Color3(0.5, 0.35, 0.2);

    this.matFeather = new StandardMaterial('mat_arrow_feather', scene);
    this.matFeather.diffuseColor = new Color3(0.9, 0.85, 0.7);

    this.matTip = new StandardMaterial('mat_arrow_tip', scene);
    this.matTip.diffuseColor = new Color3(0.2, 0.2, 0.25);
    this.matTip.specularColor = new Color3(0.8, 0.8, 0.8);
  }

  /**
   * Fires an arrow from spawn position along launch direction.
   */
  public shootArrow(origin: Vector3, direction: Vector3, damage = 35): boolean {
    if (this.arrowCount <= 0) return false;
    this.arrowCount--;

    const root = new TransformNode('arrow_root', this.scene);
    root.position.copyFrom(origin);

    // Arrow Shaft
    const shaft = MeshBuilder.CreateCylinder('arrow_shaft', {
      height: 0.9,
      diameter: 0.025,
      tessellation: 6
    }, this.scene);
    shaft.material = this.matWood;
    shaft.rotation.x = Math.PI / 2;
    shaft.parent = root;

    // Arrow Head / Iron Tip
    const tip = MeshBuilder.CreateCylinder('arrow_tip', {
      height: 0.15,
      diameterTop: 0.002,
      diameterBottom: 0.05,
      tessellation: 4
    }, this.scene);
    tip.position.z = 0.48;
    tip.rotation.x = Math.PI / 2;
    tip.material = this.matTip;
    tip.parent = root;

    // Feather Fletching
    const fletch = MeshBuilder.CreateBox('arrow_fletch', {
      width: 0.08,
      height: 0.02,
      depth: 0.22
    }, this.scene);
    fletch.position.z = -0.38;
    fletch.material = this.matFeather;
    fletch.parent = root;

    const normDir = direction.normalize();
    const speed = 40.0; // 40 m/s muzzle velocity

    this.activeArrows.push({
      root,
      mesh: shaft,
      position: origin.clone(),
      velocity: normDir.scale(speed),
      life: 0,
      maxLife: 5.0,
      damage,
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

      // Physics integration: gravity & velocity
      arrow.velocity.y += this.gravity * deltaTime;
      const step = arrow.velocity.scale(deltaTime);
      const nextPos = arrow.position.add(step);

      // Check collision with enemies
      const enemyHit = onEnemyCheck(nextPos, 0.45);
      if (enemyHit && enemyHit.hit) {
        arrow.isStuck = true;
        arrow.position.copyFrom(nextPos);
        arrow.root.position.copyFrom(arrow.position);
        arrow.life = arrow.maxLife - 0.6; // Despawn soon after hit

        const normal = arrow.velocity.normalize().scale(-1);
        const finalDamage = enemyHit.isHeadshot ? arrow.damage * 2.0 : arrow.damage;
        onHit(nextPos, normal, finalDamage, enemyHit.isHeadshot);
        continue;
      }

      // Check ground collision
      const groundH = world.getHeightAt(nextPos.x, nextPos.z);
      if (nextPos.y <= groundH) {
        arrow.isStuck = true;
        arrow.position.x = nextPos.x;
        arrow.position.z = nextPos.z;
        arrow.position.y = groundH;
        arrow.root.position.copyFrom(arrow.position);
        arrow.life = arrow.maxLife - 1.2; // Fade out stuck arrow
        continue;
      }

      // Advance in air and orient mesh with flight velocity
      arrow.position.copyFrom(nextPos);
      arrow.root.position.copyFrom(arrow.position);

      const lookTarget = arrow.position.add(arrow.velocity);
      arrow.root.lookAt(lookTarget);

      if (arrow.life >= arrow.maxLife) {
        arrow.root.dispose();
        this.activeArrows.splice(i, 1);
      }
    }
  }

  public addArrows(count: number): void {
    this.arrowCount = Math.min(50, this.arrowCount + count);
  }

  public dispose(): void {
    for (const a of this.activeArrows) {
      a.root.dispose();
    }
    this.activeArrows = [];
  }
}
