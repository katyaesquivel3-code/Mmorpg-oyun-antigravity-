/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Prosedürel 3D NPC, Oba Halkı & Gün/Gece Rutini (NPCManager)
 * (Korkut Ata, Bamsı, Günçiçek, Toygun, Yaralı Göçebeler, Baş Çevirme, Gün-Gece Rutini & Sıfır GC)
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
  Scalar
} from '@babylonjs/core';
import { WorldManager } from './WorldManager';
import { EventBus } from '../infra/EventBus';

export interface NPCEntity {
  id: string;
  name: string;
  title: string;
  dialogueId: string;
  position: Vector3;
  dayPosition: Vector3;
  nightPosition: Vector3;
  root: TransformNode;
  headMesh: Mesh;
  heading: number;
}

export class NPCManager {
  private scene: Scene;
  private world: WorldManager;
  public npcs: NPCEntity[] = [];

  // Aktif Konuşulabilir NPC
  public activeInteractableNPC: NPCEntity | null = null;

  // Materyaller
  private matKorkutRobe: StandardMaterial;
  private matBamsiApron: StandardMaterial;
  private matHunterTunic: StandardMaterial;
  private matOzanFelt: StandardMaterial;
  private matVillagerFelt: StandardMaterial;
  private matFlesh: StandardMaterial;
  private matWhiteBeard: StandardMaterial;
  private matWoodProp: StandardMaterial;

  constructor(scene: Scene, world: WorldManager, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.world = world;

    this.matKorkutRobe = new StandardMaterial('mat_npc_korkut', scene);
    this.matKorkutRobe.diffuseColor = new Color3(0.15, 0.25, 0.45); // Ulu Kam laciverti
    this.matKorkutRobe.freeze();

    this.matBamsiApron = new StandardMaterial('mat_npc_bamsi', scene);
    this.matBamsiApron.diffuseColor = new Color3(0.45, 0.28, 0.18); // Demirci deri önlüğü
    this.matBamsiApron.freeze();

    this.matHunterTunic = new StandardMaterial('mat_npc_hunter', scene);
    this.matHunterTunic.diffuseColor = new Color3(0.25, 0.42, 0.22); // Avcı yeşili
    this.matHunterTunic.freeze();

    this.matOzanFelt = new StandardMaterial('mat_npc_ozan', scene);
    this.matOzanFelt.diffuseColor = new Color3(0.65, 0.35, 0.15); // Ozan keçesi
    this.matOzanFelt.freeze();

    this.matVillagerFelt = new StandardMaterial('mat_npc_villager', scene);
    this.matVillagerFelt.diffuseColor = new Color3(0.52, 0.48, 0.38); // Göçebe beji
    this.matVillagerFelt.freeze();

    this.matFlesh = new StandardMaterial('mat_npc_flesh', scene);
    this.matFlesh.diffuseColor = new Color3(0.82, 0.65, 0.52);
    this.matFlesh.freeze();

    this.matWhiteBeard = new StandardMaterial('mat_npc_beard', scene);
    this.matWhiteBeard.diffuseColor = new Color3(0.92, 0.92, 0.92);
    this.matWhiteBeard.freeze();

    this.matWoodProp = new StandardMaterial('mat_npc_wood', scene);
    this.matWoodProp.diffuseColor = new Color3(0.35, 0.22, 0.12);
    this.matWoodProp.freeze();

    // 1. ULU KAM KORKUT ATA (Bay Terek ve Çadır Önü)
    this.buildKorkutAta(-2.5, 18.0, shadowGen);

    // 2. DEMİRCİ BAMSI (Ocak ve Örs Yanı)
    this.buildDemirciBamsi(14.0, -8.0, shadowGen);

    // 3. AVCI GÜNÇİÇEK (Ok Tezgahı Yanı)
    this.buildAvciGuncicek(-12.0, -10.0, shadowGen);

    // 4. OZAN TOYGUN (Kamp Ateşi Çevresi)
    this.buildOzanToygun(4.0, -16.0, shadowGen);

    // 5. YARALI OBA HALKI (Oğuz, İlbilge, Ağlayan Ana)
    this.buildVillager('npc_oguz', 'Yaralı Oğuz', 'Oba Yiğidi', 'villager_oguz', 5.0, 10.0, shadowGen);
    this.buildVillager('npc_ilbilge', 'Yaralı İlbilge', 'Oba Hatunu', 'villager_ilbilge', -7.0, 6.0, shadowGen);
    this.buildVillager('npc_mother', 'Ağlayan Ana', 'Alpagut’un Anası', 'mother_lost_child', 8.0, 5.0, shadowGen);
  }

  private buildKorkutAta(x: number, z: number, shadowGen: ShadowGenerator | null): void {
    const y = this.world.getHeightAt(x, z);
    const root = new TransformNode('npc_korkut', this.scene);
    root.position.set(x, y, z);

    // Gövde & Kaftan
    const body = MeshBuilder.CreateCylinder('korkut_body', { height: 1.55, diameterTop: 0.5, diameterBottom: 0.85, tessellation: 10 }, this.scene);
    body.position.y = 0.77;
    body.material = this.matKorkutRobe;
    body.parent = root;
    if (shadowGen) shadowGen.addShadowCaster(body);

    // Baş
    const head = MeshBuilder.CreateSphere('korkut_head', { diameter: 0.42, segments: 8 }, this.scene);
    head.position.y = 1.7;
    head.material = this.matFlesh;
    head.parent = root;

    // Ak Sakal
    const beard = MeshBuilder.CreateCylinder('korkut_beard', { height: 0.5, diameterTop: 0.35, diameterBottom: 0.08, tessellation: 6 }, this.scene);
    beard.position.set(0, 1.45, 0.18);
    beard.rotation.x = 0.25;
    beard.material = this.matWhiteBeard;
    beard.parent = root;

    // Kam Asası (Ahşap baston)
    const staff = MeshBuilder.CreateCylinder('korkut_staff', { height: 2.1, diameter: 0.06, tessellation: 6 }, this.scene);
    staff.position.set(0.42, 1.05, 0.25);
    staff.material = this.matWoodProp;
    staff.parent = root;

    this.npcs.push({
      id: 'npc_korkut',
      name: 'Ulu Kam Korkut Ata',
      title: 'Oba Bilgesi',
      dialogueId: 'korkut_main',
      position: new Vector3(x, y, z),
      dayPosition: new Vector3(x, y, z),
      nightPosition: new Vector3(x + 1.5, y, z - 2.0),
      root,
      headMesh: head,
      heading: 0
    });
  }

  private buildDemirciBamsi(x: number, z: number, shadowGen: ShadowGenerator | null): void {
    const y = this.world.getHeightAt(x, z);
    const root = new TransformNode('npc_bamsi', this.scene);
    root.position.set(x, y, z);

    // Güçlü Gövde & Deri Önlük
    const body = MeshBuilder.CreateBox('bamsi_body', { width: 0.75, height: 1.6, depth: 0.55 }, this.scene);
    body.position.y = 0.8;
    body.material = this.matBamsiApron;
    body.parent = root;
    if (shadowGen) shadowGen.addShadowCaster(body);

    // Baş
    const head = MeshBuilder.CreateSphere('bamsi_head', { diameter: 0.44, segments: 8 }, this.scene);
    head.position.y = 1.75;
    head.material = this.matFlesh;
    head.parent = root;

    // Demirci Çekici
    const hammer = MeshBuilder.CreateBox('bamsi_hammer', { width: 0.22, height: 0.18, depth: 0.35 }, this.scene);
    hammer.position.set(0.45, 0.85, 0.25);
    hammer.material = this.matWoodProp;
    hammer.parent = root;

    this.npcs.push({
      id: 'npc_bamsi',
      name: 'Demirci Bamsı',
      title: 'Körük ve Çekiç Ustası',
      dialogueId: 'bamsi_forge',
      position: new Vector3(x, y, z),
      dayPosition: new Vector3(x, y, z),
      nightPosition: new Vector3(x - 3.0, y, z - 1.0),
      root,
      headMesh: head,
      heading: Math.PI * 0.5
    });
  }

  private buildAvciGuncicek(x: number, z: number, shadowGen: ShadowGenerator | null): void {
    const y = this.world.getHeightAt(x, z);
    const root = new TransformNode('npc_guncicek', this.scene);
    root.position.set(x, y, z);

    // Çevik Gövde & Avcı Tuniği
    const body = MeshBuilder.CreateCylinder('hunter_body', { height: 1.5, diameterTop: 0.42, diameterBottom: 0.65, tessellation: 8 }, this.scene);
    body.position.y = 0.75;
    body.material = this.matHunterTunic;
    body.parent = root;
    if (shadowGen) shadowGen.addShadowCaster(body);

    // Baş
    const head = MeshBuilder.CreateSphere('hunter_head', { diameter: 0.4, segments: 8 }, this.scene);
    head.position.y = 1.65;
    head.material = this.matFlesh;
    head.parent = root;

    this.npcs.push({
      id: 'npc_hunter',
      name: 'Avcı Günçiçek',
      title: 'Bozkırın Gözü',
      dialogueId: 'hunter_lodge',
      position: new Vector3(x, y, z),
      dayPosition: new Vector3(x, y, z),
      nightPosition: new Vector3(x + 2.0, y, z + 2.0),
      root,
      headMesh: head,
      heading: -Math.PI * 0.4
    });
  }

  private buildOzanToygun(x: number, z: number, shadowGen: ShadowGenerator | null): void {
    const y = this.world.getHeightAt(x, z);
    const root = new TransformNode('npc_ozan', this.scene);
    root.position.set(x, y, z);

    // Gövde & Keçe Kaftan
    const body = MeshBuilder.CreateCylinder('ozan_body', { height: 1.45, diameterTop: 0.45, diameterBottom: 0.7, tessellation: 8 }, this.scene);
    body.position.y = 0.72;
    body.material = this.matOzanFelt;
    body.parent = root;
    if (shadowGen) shadowGen.addShadowCaster(body);

    // Baş
    const head = MeshBuilder.CreateSphere('ozan_head', { diameter: 0.42, segments: 8 }, this.scene);
    head.position.y = 1.62;
    head.material = this.matFlesh;
    head.parent = root;

    // Kopuz Müzik Aleti
    const kopuzNeck = MeshBuilder.CreateCylinder('kopuz_neck', { height: 0.85, diameter: 0.04, tessellation: 6 }, this.scene);
    kopuzNeck.position.set(0.18, 0.75, 0.28);
    kopuzNeck.rotation.z = -0.45;
    kopuzNeck.material = this.matWoodProp;
    kopuzNeck.parent = root;

    this.npcs.push({
      id: 'npc_ozan',
      name: 'Ozan Toygun',
      title: 'Kopuz Ustası',
      dialogueId: 'ozan_legends',
      position: new Vector3(x, y, z),
      dayPosition: new Vector3(x, y, z),
      nightPosition: new Vector3(0, y, -2.0), // Gece kamp ateşi başında
      root,
      headMesh: head,
      heading: Math.PI * 0.8
    });
  }

  private buildVillager(
    id: string,
    name: string,
    title: string,
    dialogueId: string,
    x: number,
    z: number,
    shadowGen: ShadowGenerator | null
  ): void {
    const y = this.world.getHeightAt(x, z);
    const root = new TransformNode(id, this.scene);
    root.position.set(x, y, z);

    const body = MeshBuilder.CreateCylinder(`${id}_body`, { height: 1.4, diameterTop: 0.42, diameterBottom: 0.65, tessellation: 8 }, this.scene);
    body.position.y = 0.7;
    body.material = this.matVillagerFelt;
    body.parent = root;
    if (shadowGen) shadowGen.addShadowCaster(body);

    const head = MeshBuilder.CreateSphere(`${id}_head`, { diameter: 0.4, segments: 8 }, this.scene);
    head.position.y = 1.55;
    head.material = this.matFlesh;
    head.parent = root;

    this.npcs.push({
      id,
      name,
      title,
      dialogueId,
      position: new Vector3(x, y, z),
      dayPosition: new Vector3(x, y, z),
      nightPosition: new Vector3(x - 1.0, y, z + 1.0),
      root,
      headMesh: head,
      heading: 0
    });
  }

  /**
   * Her karede NPC'lerin oyuncuya bakışını ve gün-gece rutinini yönetir (Sıfır GC)
   */
  public update(playerPos: Vector3, deltaTime: number, isNight = false): NPCEntity | null {
    let closestNpc: NPCEntity | null = null;
    let closestDistSq = 3.8 * 3.8; // 3.8m etkileşim yarıçapı

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];

      // Gün-Gece Rutini Yumuşak Geçişi
      const targetPos = isNight ? npc.nightPosition : npc.dayPosition;
      npc.position.x = Scalar.Lerp(npc.position.x, targetPos.x, Math.min(1.0, deltaTime * 0.5));
      npc.position.z = Scalar.Lerp(npc.position.z, targetPos.z, Math.min(1.0, deltaTime * 0.5));
      npc.position.y = this.world.getHeightAt(npc.position.x, npc.position.z);
      npc.root.position.copyFrom(npc.position);

      const dx = playerPos.x - npc.position.x;
      const dz = playerPos.z - npc.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= closestDistSq) {
        closestDistSq = distSq;
        closestNpc = npc;

        // Oyuncuya doğru yumuşak baş/gövde dönüşü
        const targetHeading = Math.atan2(dx, dz);
        npc.heading = Scalar.Lerp(npc.heading, targetHeading, Math.min(1.0, deltaTime * 5.0));
        npc.root.rotation.y = npc.heading;
      }
    }

    this.activeInteractableNPC = closestNpc;
    return this.activeInteractableNPC;
  }

  public dispose(): void {
    for (let i = 0; i < this.npcs.length; i++) {
      this.npcs[i].root.dispose();
    }
    this.npcs = [];
    this.matKorkutRobe.dispose();
    this.matBamsiApron.dispose();
    this.matHunterTunic.dispose();
    this.matOzanFelt.dispose();
    this.matVillagerFelt.dispose();
    this.matFlesh.dispose();
    this.matWhiteBeard.dispose();
    this.matWoodProp.dispose();
  }
}
