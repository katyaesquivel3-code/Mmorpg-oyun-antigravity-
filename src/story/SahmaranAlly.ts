/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Müttefik Bilge Şahmaran & Sır Yemini Ahlaki Seçimi (SahmaranAlly)
 * (Yarı İnsan Yarı Yılan 3D Model, Ahlaki İkilem / Sır Saklama Kararı,
 *  Zehir ve Şifa Sınavı, Kutsal Şahmaran Tılsımı & Sıfır GC)
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
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { InventoryManager } from '../inventory/InventoryManager';

export type SahmaranMoralChoice = 'UNDECIDED' | 'OATH_KEPT' | 'TRIBE_FIRST';

export interface HerbPatch {
  id: string;
  isPure: boolean;
  position: Vector3;
  mesh: Mesh;
  isHarvested: boolean;
}

export class SahmaranAlly {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;

  // 3D Parçalar
  public headMesh: Mesh;
  public crownMesh: Mesh;
  public torsoMesh: Mesh;
  public tailSegments: Mesh[] = [];

  // Ahlaki Seçim Durumu
  public moralChoice: SahmaranMoralChoice = 'UNDECIDED';
  public hasSahmaranBlessing = false;

  // Şahmaran'ın Sınavı (Zehir ve Şifa)
  public isTrialActive = false;
  public isTrialCompleted = false;
  public herbPatches: HerbPatch[] = [];

  // Materyaller
  private matFlesh: StandardMaterial;
  private matCrown: StandardMaterial;
  private matScales: StandardMaterial;
  private matPureLotus: StandardMaterial;
  private matBlightedLotus: StandardMaterial;

  private animTimer = 0.0;

  constructor(scene: Scene, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.position = new Vector3(-130, -10.5, -45); // Batık Tapınak Kutsal Tahtı

    this.root = new TransformNode('sahmaran_ally_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= MATERYALLER =================
    this.matFlesh = new StandardMaterial('mat_sahmaran_flesh', scene);
    this.matFlesh.diffuseColor = new Color3(0.9, 0.78, 0.68);
    this.matFlesh.freeze();

    this.matCrown = new StandardMaterial('mat_sahmaran_ally_crown', scene);
    this.matCrown.diffuseColor = new Color3(0.95, 0.82, 0.2);
    this.matCrown.emissiveColor = new Color3(0.4, 0.3, 0.05);

    this.matScales = new StandardMaterial('mat_sahmaran_ally_scales', scene);
    this.matScales.diffuseColor = new Color3(0.12, 0.55, 0.42); // Zümrüt yılan pulları
    this.matScales.specularColor = new Color3(0.3, 0.8, 0.6);
    this.matScales.freeze();

    this.matPureLotus = new StandardMaterial('mat_pure_lotus_herb', scene);
    this.matPureLotus.diffuseColor = new Color3(0.25, 0.85, 0.45);
    this.matPureLotus.emissiveColor = new Color3(0.1, 0.4, 0.2);

    this.matBlightedLotus = new StandardMaterial('mat_blighted_lotus_herb', scene);
    this.matBlightedLotus.diffuseColor = new Color3(0.35, 0.1, 0.45);
    this.matBlightedLotus.emissiveColor = new Color3(0.15, 0.02, 0.2);

    // ================= 1. YARI İNSAN YARI YILAN 3D MODELİ =================
    // Üst Gövde (Zarif Bilge Kadın Silüeti)
    this.torsoMesh = MeshBuilder.CreateCylinder('sahmaran_torso', { diameterTop: 0.7, diameterBottom: 0.9, height: 1.6 }, scene);
    this.torsoMesh.position.set(0, 2.2, 0);
    this.torsoMesh.material = this.matFlesh;
    this.torsoMesh.parent = this.root;

    // Baş & Saçlar
    this.headMesh = MeshBuilder.CreateSphere('sahmaran_head', { diameter: 0.6 }, scene);
    this.headMesh.position.set(0, 3.25, 0.05);
    this.headMesh.material = this.matFlesh;
    this.headMesh.parent = this.root;

    // Altın Bilgelik Tacı
    this.crownMesh = MeshBuilder.CreateCylinder('sahmaran_crown', { diameterTop: 0.75, diameterBottom: 0.6, height: 0.35, tessellation: 8 }, scene);
    this.crownMesh.position.set(0, 3.55, 0.05);
    this.crownMesh.material = this.matCrown;
    this.crownMesh.parent = this.root;

    // Alt Gövde: 5 Kıvrımlı Zümrüt Yılan Segmenti
    for (let i = 0; i < 5; i++) {
      const seg = MeshBuilder.CreateCylinder(`sahmaran_tail_seg_${i}`, {
        diameter: 1.4 - i * 0.18,
        height: 1.8,
        tessellation: 10
      }, scene);
      seg.position.set(0, 1.2 - i * 0.25, -1.2 * (i + 1));
      seg.rotation.x = Math.PI * 0.42;
      seg.material = this.matScales;
      seg.parent = this.root;
      this.tailSegments.push(seg);
      if (shadowGen) shadowGen.addShadowCaster(seg);
    }

    if (shadowGen) {
      shadowGen.addShadowCaster(this.torsoMesh);
      shadowGen.addShadowCaster(this.headMesh);
    }

    // ================= 2. ŞAHMARAN'IN SINAV BİTKİLERİ =================
    this.buildTrialHerbs(scene, shadowGen);

    // Ahlaki Karar Olayı Dinleyicisi
    EventBus.on('story:sahmaran_moral_choice', (data: { choice: 'OATH_KEPT' | 'TRIBE_FIRST' }) => {
      this.makeMoralChoice(data.choice);
    });
  }

  /**
   * Tapınak etrafında yetişen saf nilüferler ve zehirli kara nilüferler
   */
  private buildTrialHerbs(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const patchLocs = [
      // 3 Saf Arı Nilüfer (Doğru Bitkiler)
      { id: 'pure_1', x: -122, z: -40, isPure: true },
      { id: 'pure_2', x: -136, z: -38, isPure: true },
      { id: 'pure_3', x: -128, z: -55, isPure: true },
      // 3 Zehirli Kara Nilüfer (Yanıltıcı Bitkiler)
      { id: 'blight_1', x: -120, z: -48, isPure: false },
      { id: 'blight_2', x: -138, z: -50, isPure: false },
      { id: 'blight_3', x: -132, z: -35, isPure: false }
    ];

    patchLocs.forEach((loc) => {
      const flower = MeshBuilder.CreateCylinder(`herb_${loc.id}`, { diameter: 0.9, height: 0.25, tessellation: 6 }, scene);
      flower.position.set(loc.x, -11.6, loc.z);
      flower.material = loc.isPure ? this.matPureLotus : this.matBlightedLotus;

      this.herbPatches.push({
        id: loc.id,
        isPure: loc.isPure,
        position: flower.position.clone(),
        mesh: flower,
        isHarvested: false
      });

      if (shadowGen) shadowGen.addShadowCaster(flower);
    });
  }

  /**
   * Oyuncu Bir Bitkiyi Topladığında
   */
  public harvestHerb(herbId: string): boolean {
    const patch = this.herbPatches.find((p) => p.id === herbId && !p.isHarvested);
    if (!patch) return false;

    patch.isHarvested = true;
    patch.mesh.setEnabled(false);
    const inv = InventoryManager.getInstance();

    if (patch.isPure) {
      inv.addItem('mat_pure_lotus', 1);
      ProceduralAudio.playLootPickup();
      EventBus.emit('ui:loot_toast', { text: '🪷 Kutsal Arı Nilüfer Toplandı! (Şahmaran’ın Sınavı)' });
    } else {
      inv.addItem('mat_blighted_lotus', 1);
      ProceduralAudio.playSteamHiss();
      EventBus.emit('ui:loot_toast', { text: '🥀 Zehirli Kara Nilüfer! Dikkat et, panzehire katılamaz!' });
    }

    return true;
  }

  /**
   * Ahlaki Karar: Ayaz'ın Söz Verme / Sır Saklama Kararı
   */
  public makeMoralChoice(choice: 'OATH_KEPT' | 'TRIBE_FIRST'): void {
    this.moralChoice = choice;

    if (choice === 'OATH_KEPT') {
      this.hasSahmaranBlessing = true;
      ProceduralAudio.playShrineSolvedFanfare();
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Bilge Şahmaran',
        text: '🐍 Sözün andımız olsun Ayaz... İnsanoğlunun ihanetini senin sadakatin sildi. Al bu Kutsal Şahmaran Tılsımı’nı; zehir artık kanına işleyemez!'
      });
      EventBus.emit('ui:loot_toast', { text: '✨ KUTSAL ŞAHMARAN KUTSAMASI KAZANILDI! (+%30 Zehir Direnci)' });
    } else {
      this.hasSahmaranBlessing = false;
      ProceduralAudio.playBeaconHum();
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Bilge Şahmaran',
        text: '🐍 Dürüstlüğün acı verici de olsa takdire şayan. Obanı korumak için verdiğin mücadeleyi anlıyorum. Yelbegen’i devirmenin sırrı boyunlarını ateşle dağlamaktır!'
      });
      EventBus.emit('ui:loot_toast', { text: '📜 Yelbegen’in Zaafı Öğrenildi! (Kesilen başları ateşle dağla!)' });
    }
  }

  /**
   * Panzehir Teslimatı ile Sınavı Tamamlama
   */
  public completeTrial(): boolean {
    const inv = InventoryManager.getInstance();
    const panzehirSlot = inv.slots.find((s) => s.item.id === 'food_panzehir' && s.quantity > 0);

    if (panzehirSlot) {
      inv.removeItem('food_panzehir', 1);
      this.isTrialCompleted = true;
      ProceduralAudio.playQuestComplete();
      EventBus.emit('quest:completed', { questId: 'quest_sahmaran_sinavi' });
      EventBus.emit('ui:loot_toast', { text: '🏆 Şahmaran’ın Sınavı Tamamlandı! Yelbegen Arenası Açıldı.' });
      return true;
    }

    EventBus.emit('ui:loot_toast', { text: '⚠️ Henüz Panzehir Şerbeti pişirmedin! Kamp ateşine git.' });
    return false;
  }

  public checkInteract(playerPos: Vector3): boolean {
    // Şahmaran ile etkileşim
    const distToSahmaran = Vector3.Distance(playerPos, this.position);
    if (distToSahmaran < 4.5) {
      EventBus.emit('dialogue:start', { startNodeId: 'sahmaran_sanctuary_greet' });
      return true;
    }

    // Yakındaki bitkiyi toplama
    for (const patch of this.herbPatches) {
      if (!patch.isHarvested && Vector3.Distance(playerPos, patch.position) < 2.5) {
        return this.harvestHerb(patch.id);
      }
    }

    return false;
  }

  public update(deltaTime: number): void {
    this.animTimer += deltaTime;

    // Yarı yılan gövdesinin su içinde zarifçe dalgalanması
    this.headMesh.position.y = 3.25 + Math.sin(this.animTimer * 2.0) * 0.08;
    this.tailSegments.forEach((seg, idx) => {
      seg.rotation.y = Math.sin(this.animTimer * 2.5 + idx * 0.8) * 0.25;
    });
  }

  public dispose(): void {
    this.root.dispose();
  }
}
