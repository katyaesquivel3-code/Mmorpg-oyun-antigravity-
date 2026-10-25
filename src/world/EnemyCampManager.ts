/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Düşman Karakolları, Kara Totem ve Mühürlü Ganimet Sandığı Sistemi (EnemyCampManager)
 * (Gölge Boğazı & Kara Çamur Kampları, Erlik Kara Totemi, Yıkılınca Kirlenmeyi Dağıtma, Kalıcı Temizlenme & Sıfır GC)
 */

import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  ShadowGenerator,
  ParticleSystem,
  Color4
} from '@babylonjs/core';
import { WorldManager } from './WorldManager';
import { EnemyEntity } from '../combat/EnemyEntity';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { LootManager } from '../combat/LootManager';
import { WinterBlightManager } from './WinterBlightManager';

export interface CampData {
  id: string;
  name: string;
  center: Vector3;
  enemies: EnemyEntity[];
  // Kara Totem (Erlik Kara Totemi)
  totemMesh: Mesh;
  totemHealth: number;
  isTotemDestroyed: boolean;
  // Sandık
  chestMesh: Mesh;
  chestLid: Mesh;
  chestSealRing: Mesh;
  isCleared: boolean;
  isChestOpened: boolean;
}

export class EnemyCampManager {
  private scene: Scene;
  private world: WorldManager;
  private shadowGen: ShadowGenerator | null;

  public camps: CampData[] = [];

  // Materyaller
  private matChestWood: StandardMaterial;
  private matChestGold: StandardMaterial;
  private matSealRed: StandardMaterial;
  private matSealGold: StandardMaterial;
  private matTotemWood: StandardMaterial;
  private matTotemRune: StandardMaterial;

  constructor(scene: Scene, world: WorldManager, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.world = world;
    this.shadowGen = shadowGen;

    this.matChestWood = new StandardMaterial('mat_chest_wood', scene);
    this.matChestWood.diffuseColor = new Color3(0.32, 0.18, 0.1);
    this.matChestWood.freeze();

    this.matChestGold = new StandardMaterial('mat_chest_gold', scene);
    this.matChestGold.diffuseColor = new Color3(0.95, 0.75, 0.2);
    this.matChestGold.specularColor = new Color3(0.8, 0.6, 0.2);
    this.matChestGold.freeze();

    this.matSealRed = new StandardMaterial('mat_seal_red', scene);
    this.matSealRed.diffuseColor = new Color3(0.95, 0.1, 0.1);
    this.matSealRed.emissiveColor = new Color3(0.85, 0.05, 0.05);

    this.matSealGold = new StandardMaterial('mat_seal_gold', scene);
    this.matSealGold.diffuseColor = new Color3(0.2, 0.9, 0.4);
    this.matSealGold.emissiveColor = new Color3(0.1, 0.8, 0.3);

    this.matTotemWood = new StandardMaterial('mat_totem_wood', scene);
    this.matTotemWood.diffuseColor = new Color3(0.15, 0.12, 0.14);
    this.matTotemWood.freeze();

    this.matTotemRune = new StandardMaterial('mat_totem_rune', scene);
    this.matTotemRune.diffuseColor = new Color3(0.8, 0.1, 0.9);
    this.matTotemRune.emissiveColor = new Color3(0.7, 0.05, 0.8);

    // 1. Gölge Boğazı Karakolu (Demir Dağ Eteği)
    this.buildCamp(
      'blight_shadow_gorge',
      'Gölge Boğazı Karakolu',
      new Vector3(-92, world.getHeightAt(-92, 88), 88)
    );

    // 2. Kara Çamur Barınağı (Gök Zirve Eteği)
    this.buildCamp(
      'blight_black_mud',
      'Kara Çamur Barınağı',
      new Vector3(108, world.getHeightAt(108, 118), 118)
    );
  }

  private buildCamp(id: string, name: string, center: Vector3): void {
    const campRoot = new TransformNode(`root_${id}`, this.scene);
    campRoot.position.copyFrom(center);

    const enemies: EnemyEntity[] = [];

    // 1. Gözetleme Kulesi (Watchtower)
    const towerY = center.y;
    const tower = MeshBuilder.CreateBox(`tower_${id}`, { width: 4.5, height: 11.0, depth: 4.5 }, this.scene);
    tower.position.set(-6.5, 5.5, -6.5);
    tower.material = this.matChestWood;
    tower.parent = campRoot;
    if (this.shadowGen) this.shadowGen.addShadowCaster(tower);

    // Kule Üzerindeki Kara Kış Gölgesi (Gözcü Okçu)
    const scout = new EnemyEntity(
      `${id}_scout`,
      'KARA_KIS_GOLGE',
      center.x - 6.5,
      center.z - 6.5,
      this.scene,
      this.world,
      this.shadowGen,
      id,
      false
    );
    scout.position.y = towerY + 11.2;
    scout.root.position.copyFrom(scout.position);
    enemies.push(scout);

    // 2. Kamp Ateşi ve Çevresinde Nöbetçiler
    // Uyuyan Yek Savaşçısı (Sessiz Vuruş Testi için)
    const w1 = new EnemyEntity(
      `${id}_yek_sleep`,
      'YEK',
      center.x + 3.5,
      center.z - 2.5,
      this.scene,
      this.world,
      this.shadowGen,
      id,
      true // Uyuyor!
    );
    enemies.push(w1);

    // Devriye Gezen Albız Ruhu
    const w2 = new EnemyEntity(
      `${id}_albiz_patrol`,
      'ALBIZ_SPIRIT',
      center.x - 2.0,
      center.z + 5.0,
      this.scene,
      this.world,
      this.shadowGen,
      id,
      false
    );
    enemies.push(w2);

    // Kamp Komutanı (Yek Komutanı Mini Boss)
    const commander = new EnemyEntity(
      `${id}_commander`,
      'YEK_KOMUTAN',
      center.x + 5.0,
      center.z + 4.0,
      this.scene,
      this.world,
      this.shadowGen,
      id,
      false
    );
    enemies.push(commander);

    // 3. ERLİK KARA TOTEMİ (Yıkılabilir Kirlenme Kaynağı)
    const totemPillar = MeshBuilder.CreateCylinder(`totem_${id}`, {
      height: 4.8,
      diameterTop: 0.65,
      diameterBottom: 1.1,
      tessellation: 8
    }, this.scene);
    totemPillar.position.set(0, 2.4, -4.5);
    totemPillar.material = this.matTotemWood;
    totemPillar.parent = campRoot;
    if (this.shadowGen) this.shadowGen.addShadowCaster(totemPillar);

    const totemHead = MeshBuilder.CreateSphere(`totem_head_${id}`, { diameter: 1.1, segments: 6 }, this.scene);
    totemHead.position.set(0, 4.6, -4.5);
    totemHead.material = this.matTotemRune;
    totemHead.parent = campRoot;

    // 4. Mühürlü Ganimet Sandığı (Loot Chest)
    const chestBase = MeshBuilder.CreateBox(`chest_${id}`, { width: 1.6, height: 0.85, depth: 1.1 }, this.scene);
    chestBase.position.set(0, 0.42, 0);
    chestBase.material = this.matChestWood;
    chestBase.parent = campRoot;

    const chestLid = MeshBuilder.CreateBox(`chest_lid_${id}`, { width: 1.65, height: 0.35, depth: 1.15 }, this.scene);
    chestLid.position.set(0, 0.95, -0.45);
    chestLid.material = this.matChestGold;
    chestLid.parent = campRoot;

    // Kırmızı Koruma Mührü Halkası
    const sealRing = MeshBuilder.CreateTorus(`seal_${id}`, { diameter: 3.2, thickness: 0.15, tessellation: 20 }, this.scene);
    sealRing.position.set(0, 0.3, 0);
    sealRing.material = this.matSealRed;
    sealRing.parent = campRoot;

    this.camps.push({
      id,
      name,
      center,
      enemies,
      totemMesh: totemPillar,
      totemHealth: 120,
      isTotemDestroyed: false,
      chestMesh: chestBase,
      chestLid,
      chestSealRing: sealRing,
      isCleared: false,
      isChestOpened: false
    });
  }

  /**
   * Her karede kampların, totemlerin ve sandıkların durumunu denetler
   */
  public update(
    playerPos: Vector3,
    deltaTime: number,
    blightManager?: WinterBlightManager,
    lootManager?: LootManager
  ): void {
    for (let i = 0; i < this.camps.length; i++) {
      const camp = this.camps[i];

      // Sandık Açma Kontrolü (Temizlenmiş kampta)
      if (camp.isCleared && !camp.isChestOpened) {
        const dist = Vector3.Distance(playerPos, camp.center);
        if (dist < 2.5) {
          camp.isChestOpened = true;
          camp.chestLid.rotation.x = -Math.PI * 0.4;
          ProceduralAudio.playChestOpen();

          if (lootManager) {
            lootManager.spawnLootDrop(camp.center, 'HEALTH_FRUIT', 2);
            lootManager.spawnLootDrop(camp.center, 'KUT_DUST', 2);
            lootManager.spawnLootDrop(camp.center, 'IRON_ORE', 3);
            lootManager.spawnLootDrop(camp.center, 'ARROWS', 10);
          }

          EventBus.emit('ui:dialogue_show', {
            speaker: 'Börü',
            text: `${camp.name} ganimet sandığı açıldı! İksir, Kut tozu ve demir cevherleri toplandı.`
          });
        }
      }
    }
  }

  /**
   * Toteme hasar verme denetimi
   */
  public checkDamageTotem(pos: Vector3, radius: number, damage: number, blightManager?: WinterBlightManager): boolean {
    for (let i = 0; i < this.camps.length; i++) {
      const camp = this.camps[i];
      if (camp.isTotemDestroyed) continue;

      const totemWorldPos = camp.center.clone();
      totemWorldPos.z -= 4.5;
      totemWorldPos.y += 2.4;

      const dist = Vector3.Distance(pos, totemWorldPos);
      if (dist <= radius + 1.2) {
        camp.totemHealth = Math.max(0, camp.totemHealth - damage);
        ProceduralAudio.playImpact(true);

        if (camp.totemHealth <= 0) {
          this.destroyTotem(camp, blightManager);
        }
        return true;
      }
    }
    return false;
  }

  private destroyTotem(camp: CampData, blightManager?: WinterBlightManager): void {
    camp.isTotemDestroyed = true;
    camp.totemMesh.dispose();
    camp.isCleared = true;
    camp.chestSealRing.material = this.matSealGold;

    ProceduralAudio.playImpact(true);
    if (blightManager) {
      blightManager.purifyZone(camp.id);
    }

    EventBus.emit('totem:destroyed', { campId: camp.id });
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Börü',
      text: `KARA TOTEM YIKILDI! ${camp.name} kirlenmesi dağıldı, mühür kırıldı!`
    });
  }

  public getAllEnemies(): EnemyEntity[] {
    const list: EnemyEntity[] = [];
    for (let i = 0; i < this.camps.length; i++) {
      const c = this.camps[i];
      for (let j = 0; j < c.enemies.length; j++) {
        list.push(c.enemies[j]);
      }
    }
    return list;
  }

  public dispose(): void {
    for (let i = 0; i < this.camps.length; i++) {
      const c = this.camps[i];
      for (let j = 0; j < c.enemies.length; j++) {
        c.enemies[j].dispose();
      }
      c.chestMesh.dispose();
      c.chestLid.dispose();
      c.chestSealRing.dispose();
      if (!c.isTotemDestroyed) c.totemMesh.dispose();
    }
    this.camps = [];
    this.matChestWood.dispose();
    this.matChestGold.dispose();
    this.matSealRed.dispose();
    this.matSealGold.dispose();
    this.matTotemWood.dispose();
    this.matTotemRune.dispose();
  }
}
