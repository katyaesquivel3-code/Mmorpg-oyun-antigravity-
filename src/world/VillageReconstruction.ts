/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Oba Yeniden İnşası ve Görsel Gelişimi (VillageReconstruction)
 * (Kül Olan Çadırların Onarımı, Pazar Tezgahları, Kutsal Ocak & Şaman Davul Sesi)
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
  Texture,
  Color4
} from '@babylonjs/core';
import { WorldManager } from './WorldManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export class VillageReconstruction {
  public stage = 0; // 0 = Yanmış/Kül, 1 = Onarılmış Çadırlar, 2 = Demirci Sundurması & Pazar, 3 = Kutsal Ateş & Davul

  private root: TransformNode;

  // Aşama 0: Yanmış Harabe Parçaları
  private burntDebris: Mesh[] = [];

  // Aşama 1: Onarılmış Beyaz Keçe Çadırlar & Bayraklar
  private repairedYurts: TransformNode[] = [];

  // Aşama 2: Demirci Sundurması & Pazar Tezgahı
  private marketStalls: TransformNode[] = [];

  // Aşama 3: Kutsal Ocak Alevi & Parçacıkları
  private sacredFireNode: TransformNode | null = null;
  private sacredFireParticles: ParticleSystem | null = null;

  private drumTimer = 0;

  constructor(
    private scene: Scene,
    private world: WorldManager,
    private shadowGen: ShadowGenerator | null = null
  ) {
    this.root = new TransformNode('village_reconstruction_root', scene);

    this.buildStage0Debris();
    this.buildStage1Repairs();
    this.buildStage2Market();
    this.buildStage3SacredFire();

    this.applyStage(0);

    // Görev Olaylarına Göre Oba Gelişimi
    EventBus.on('quest:completed', (data: { questId: string }) => {
      if (data.questId === 'quest_kul_olan_oba' && this.stage < 1) {
        this.setStage(1);
      } else if (data.questId === 'quest_demircinin_borcu' && this.stage < 2) {
        this.setStage(2);
      } else if (data.questId === 'quest_ocagin_kulu' && this.stage < 3) {
        this.setStage(3);
      }
    });
  }

  private buildStage0Debris(): void {
    const matCharred = new StandardMaterial('mat_charred_wood', this.scene);
    matCharred.diffuseColor = new Color3(0.08, 0.08, 0.09); // Kömürleşmiş siyah tahta
    matCharred.freeze();

    // 4 Yanmış Direk ve Kül Yığını
    const debrisLocs = [
      { x: -6, z: 8 },
      { x: 8, z: 6 },
      { x: -4, z: -12 },
      { x: 10, z: -14 }
    ];

    debrisLocs.forEach((dl, i) => {
      const y = this.world.getHeightAt(dl.x, dl.z);
      const post = MeshBuilder.CreateBox(`debris_post_${i}`, { width: 0.35, height: 1.8, depth: 0.35 }, this.scene);
      post.position.set(dl.x, y + 0.6, dl.z);
      post.rotation.z = (i % 2 === 0 ? 0.35 : -0.4);
      post.material = matCharred;
      post.parent = this.root;
      this.burntDebris.push(post);
    });
  }

  private buildStage1Repairs(): void {
    const matWhiteFelt = new StandardMaterial('mat_repaired_felt', this.scene);
    matWhiteFelt.diffuseColor = new Color3(0.92, 0.9, 0.85); // Temiz ak keçe
    matWhiteFelt.freeze();

    const matWood = new StandardMaterial('mat_yurt_door', this.scene);
    matWood.diffuseColor = new Color3(0.42, 0.25, 0.15);
    matWood.freeze();

    // Onarılan 2 Yeni Göçebe Çadırı
    const yurtLocs = [
      { x: -8, z: 12 },
      { x: 12, z: 10 }
    ];

    yurtLocs.forEach((yl, idx) => {
      const y = this.world.getHeightAt(yl.x, yl.z);
      const node = new TransformNode(`repaired_yurt_${idx}`, this.scene);
      node.position.set(yl.x, y, yl.z);

      const base = MeshBuilder.CreateCylinder(`yurt_b_${idx}`, { height: 1.8, diameter: 5.2, tessellation: 12 }, this.scene);
      base.position.y = 0.9;
      base.material = matWhiteFelt;
      base.parent = node;

      const dome = MeshBuilder.CreateCylinder(`yurt_d_${idx}`, { height: 1.4, diameterTop: 0.3, diameterBottom: 5.4, tessellation: 12 }, this.scene);
      dome.position.y = 2.4;
      dome.material = matWhiteFelt;
      dome.parent = node;

      const door = MeshBuilder.CreateBox(`yurt_dr_${idx}`, { width: 1.0, height: 1.5, depth: 0.4 }, this.scene);
      door.position.set(0, 0.75, 2.6);
      door.material = matWood;
      door.parent = node;

      node.parent = this.root;
      this.repairedYurts.push(node);
    });
  }

  private buildStage2Market(): void {
    const matAwning = new StandardMaterial('mat_market_awning', this.scene);
    matAwning.diffuseColor = new Color3(0.75, 0.25, 0.2); // Kızıl pazar tentesi
    matAwning.freeze();

    const matTimber = new StandardMaterial('mat_stall_wood', this.scene);
    matTimber.diffuseColor = new Color3(0.38, 0.24, 0.14);
    matTimber.freeze();

    const stallLocs = [
      { x: 16, z: -4 },
      { x: 18, z: -10 }
    ];

    stallLocs.forEach((sl, idx) => {
      const y = this.world.getHeightAt(sl.x, sl.z);
      const stallRoot = new TransformNode(`stall_node_${idx}`, this.scene);
      stallRoot.position.set(sl.x, y, sl.z);

      // Tezgah Masası
      const bench = MeshBuilder.CreateBox(`bench_${idx}`, { width: 2.4, height: 0.9, depth: 1.2 }, this.scene);
      bench.position.y = 0.45;
      bench.material = matTimber;
      bench.parent = stallRoot;

      // Kumaş Tente
      const awning = MeshBuilder.CreateBox(`awning_${idx}`, { width: 2.6, height: 0.1, depth: 1.6 }, this.scene);
      awning.position.set(0, 2.2, 0);
      awning.rotation.x = 0.15;
      awning.material = matAwning;
      awning.parent = stallRoot;

      stallRoot.parent = this.root;
      this.marketStalls.push(stallRoot);
    });
  }

  private buildStage3SacredFire(): void {
    const y = this.world.getHeightAt(0, 0);
    const firePos = new Vector3(0, y + 0.4, 0);
    this.sacredFireNode = new TransformNode('sacred_fire_node', this.scene);
    this.sacredFireNode.position.copyFrom(firePos);
    this.sacredFireNode.parent = this.root;

    // Alev Parçacık Sistemi
    const ps = new ParticleSystem('sacred_fire_particles', 180, this.scene);
    ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', this.scene);
    ps.emitter = firePos;
    ps.minEmitBox = new Vector3(-0.4, 0, -0.4);
    ps.maxEmitBox = new Vector3(0.4, 0.2, 0.4);

    ps.color1 = new Color4(1.0, 0.65, 0.1, 1.0);
    ps.color2 = new Color4(0.9, 0.2, 0.05, 0.8);
    ps.colorDead = new Color4(0.2, 0.05, 0.02, 0.0);

    ps.minSize = 0.35;
    ps.maxSize = 0.85;
    ps.minLifeTime = 0.6;
    ps.maxLifeTime = 1.4;
    ps.emitRate = 90;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new Vector3(0, 3.5, 0);

    this.sacredFireParticles = ps;
  }

  public setStage(newStage: number): void {
    this.stage = Math.min(3, Math.max(0, newStage));
    this.applyStage(this.stage);

    if (this.stage === 1) {
      EventBus.emit('ui:loot_toast', { text: '🏕️ Ötüken Obası: Çadırlar Onarıldı!' });
    } else if (this.stage === 2) {
      EventBus.emit('ui:loot_toast', { text: '🔨 Ötüken Obası: Demirci Sundurması & Pazar Açıldı!' });
    } else if (this.stage === 3) {
      EventBus.emit('ui:loot_toast', { text: '🔥 Ötüken Obası: Kutsal Ocak Alevlendi & Şaman Davulu Çalıyor!' });
      ProceduralAudio.playQuestComplete();
    }
  }

  private applyStage(stage: number): void {
    // Aşama 0 Debris
    const showDebris = stage === 0;
    this.burntDebris.forEach((d) => d.setEnabled(showDebris));

    // Aşama 1 Repairs
    const showRepairs = stage >= 1;
    this.repairedYurts.forEach((y) => y.setEnabled(showRepairs));

    // Aşama 2 Market
    const showMarket = stage >= 2;
    this.marketStalls.forEach((s) => s.setEnabled(showMarket));

    // Aşama 3 Sacred Fire
    const showFire = stage >= 3;
    if (this.sacredFireParticles) {
      if (showFire) {
        this.sacredFireParticles.start();
      } else {
        this.sacredFireParticles.stop();
      }
    }
  }

  public update(deltaTime: number, isNearOba: boolean): void {
    // Aşama 3'te obaya yakınken periyodik şaman davulu sesi
    if (this.stage >= 3 && isNearOba) {
      this.drumTimer += deltaTime;
      if (this.drumTimer >= 3.8) {
        this.drumTimer = 0;
        ProceduralAudio.playVillageDrum();
      }
    }
  }

  public dispose(): void {
    this.root.dispose();
    if (this.sacredFireParticles) {
      this.sacredFireParticles.dispose();
    }
  }
}
