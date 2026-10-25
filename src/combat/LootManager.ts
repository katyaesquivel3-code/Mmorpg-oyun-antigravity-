/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Toplanabilir Ganimet Sistemi (LootManager)
 * (Can Meyvesi, Kut Tozu, Demir Cevheri, İfrit Kemiği, Ok Paketi, 3D Dönen Parçalar, Mıknatıs Çekimi & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  Scalar
} from '@babylonjs/core';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export type LootType = 'HEALTH_FRUIT' | 'KUT_DUST' | 'IRON_ORE' | 'DEMON_BONE' | 'ARROWS';

export interface LootItem {
  id: string;
  type: LootType;
  nameTr: string;
  amount: number;
  root: TransformNode;
  mesh: Mesh;
  position: Vector3;
  baseY: number;
  bobTimer: number;
  isCollected: boolean;
  isAttracting: boolean;
}

export class LootManager {
  private scene: Scene;
  public activeLoots: LootItem[] = [];

  // Ganimet Materyalleri
  private matHealthFruit: StandardMaterial;
  private matKutDust: StandardMaterial;
  private matIronOre: StandardMaterial;
  private matDemonBone: StandardMaterial;
  private matArrows: StandardMaterial;

  // Sıcak döngü scratch nesneleri (Zero GC)
  private scratchDir = new Vector3(0, 0, 0);

  constructor(scene: Scene) {
    this.scene = scene;

    this.matHealthFruit = new StandardMaterial('mat_loot_fruit', scene);
    this.matHealthFruit.diffuseColor = new Color3(0.95, 0.2, 0.25);
    this.matHealthFruit.emissiveColor = new Color3(0.4, 0.05, 0.05);
    this.matHealthFruit.freeze();

    this.matKutDust = new StandardMaterial('mat_loot_kut', scene);
    this.matKutDust.diffuseColor = new Color3(0.95, 0.85, 0.2);
    this.matKutDust.emissiveColor = new Color3(0.5, 0.4, 0.05);
    this.matKutDust.freeze();

    this.matIronOre = new StandardMaterial('mat_loot_iron', scene);
    this.matIronOre.diffuseColor = new Color3(0.5, 0.55, 0.6);
    this.matIronOre.specularColor = new Color3(0.8, 0.8, 0.9);
    this.matIronOre.freeze();

    this.matDemonBone = new StandardMaterial('mat_loot_bone', scene);
    this.matDemonBone.diffuseColor = new Color3(0.85, 0.82, 0.75);
    this.matDemonBone.freeze();

    this.matArrows = new StandardMaterial('mat_loot_arrows', scene);
    this.matArrows.diffuseColor = new Color3(0.35, 0.65, 0.25);
    this.matArrows.emissiveColor = new Color3(0.1, 0.25, 0.05);
    this.matArrows.freeze();
  }

  /**
   * Düşman veya sandık açıldığında ganimet düşürür
   */
  public spawnLootDrop(pos: Vector3, type: LootType, amount = 1): void {
    const id = `loot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const root = new TransformNode(`root_${id}`, this.scene);

    const scatterX = pos.x + (Math.random() - 0.5) * 1.4;
    const scatterZ = pos.z + (Math.random() - 0.5) * 1.4;
    const dropPos = new Vector3(scatterX, pos.y + 0.35, scatterZ);
    root.position.copyFrom(dropPos);

    let mesh: Mesh;
    let nameTr = '';

    switch (type) {
      case 'HEALTH_FRUIT':
        mesh = MeshBuilder.CreateSphere(`mesh_${id}`, { diameter: 0.35, segments: 6 }, this.scene);
        mesh.material = this.matHealthFruit;
        nameTr = 'Can Meyvesi (+30 Can)';
        break;
      case 'KUT_DUST':
        mesh = MeshBuilder.CreatePolyhedron(`mesh_${id}`, { type: 1, size: 0.22 }, this.scene);
        mesh.material = this.matKutDust;
        nameTr = 'Kut Tozu (+35 Soluk)';
        break;
      case 'IRON_ORE':
        mesh = MeshBuilder.CreateBox(`mesh_${id}`, { width: 0.3, height: 0.25, depth: 0.3 }, this.scene);
        mesh.material = this.matIronOre;
        nameTr = 'Demir Cevheri';
        break;
      case 'DEMON_BONE':
        mesh = MeshBuilder.CreateCylinder(`mesh_${id}`, { height: 0.45, diameter: 0.12, tessellation: 6 }, this.scene);
        mesh.material = this.matDemonBone;
        nameTr = 'İfrit Kemiği';
        break;
      case 'ARROWS':
        mesh = MeshBuilder.CreateCylinder(`mesh_${id}`, { height: 0.5, diameter: 0.16, tessellation: 6 }, this.scene);
        mesh.material = this.matArrows;
        nameTr = 'Ok Paketi (+5 Ok)';
        break;
    }

    mesh.parent = root;

    this.activeLoots.push({
      id,
      type,
      nameTr,
      amount,
      root,
      mesh,
      position: dropPos,
      baseY: dropPos.y,
      bobTimer: Math.random() * Math.PI * 2,
      isCollected: false,
      isAttracting: false
    });
  }

  /**
   * Her karede ganimetleri döndürür ve oyuncuya manyetik olarak çeker
   */
  public update(playerPos: Vector3, deltaTime: number, onCollect: (type: LootType, amount: number) => void): void {
    const pickupRadiusSq = 3.2 * 3.2;
    const collectRadiusSq = 0.65 * 0.65;

    for (let i = this.activeLoots.length - 1; i >= 0; i--) {
      const loot = this.activeLoots[i];
      if (loot.isCollected) continue;

      loot.bobTimer += deltaTime * 3.5;
      loot.mesh.rotation.y += deltaTime * 2.5;

      const dx = playerPos.x - loot.position.x;
      const dz = playerPos.z - loot.position.z;
      const dy = (playerPos.y + 0.8) - loot.position.y;
      const distSq = dx * dx + dz * dz + dy * dy;

      // Manyetik Çekim
      if (distSq <= pickupRadiusSq) {
        loot.isAttracting = true;
        const dist = Math.sqrt(distSq);
        const speed = 7.5;
        loot.position.x += (dx / dist) * speed * deltaTime;
        loot.position.y += (dy / dist) * speed * deltaTime;
        loot.position.z += (dz / dist) * speed * deltaTime;
        loot.root.position.copyFrom(loot.position);

        // Toplama
        if (distSq <= collectRadiusSq) {
          loot.isCollected = true;
          ProceduralAudio.playButtonClick();
          onCollect(loot.type, loot.amount);
          EventBus.emit('ui:loot_toast', { text: `+${loot.amount} ${loot.nameTr}` });

          loot.root.dispose();
          this.activeLoots.splice(i, 1);
        }
      } else {
        // Yerinde süzülme (bobbing)
        loot.position.y = loot.baseY + Math.sin(loot.bobTimer) * 0.12;
        loot.root.position.copyFrom(loot.position);
      }
    }
  }

  public dispose(): void {
    for (const l of this.activeLoots) {
      l.root.dispose();
    }
    this.activeLoots = [];
    this.matHealthFruit.dispose();
    this.matKutDust.dispose();
    this.matIronOre.dispose();
    this.matDemonBone.dispose();
    this.matArrows.dispose();
  }
}
