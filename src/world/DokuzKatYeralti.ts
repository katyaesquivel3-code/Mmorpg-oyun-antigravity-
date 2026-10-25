/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Dokuz Kat Yeraltı / Tamu Krallığı (DokuzKatYeralti)
 * (1. Kemik Geçidi, 2. Kor Nehri, 3. Kara Su, 4. Gölge Ormanı, 5. Ayna Salonu,
 *  6. Soğuk Çekirdek, 7. Unutuş Pınarı [Duygusal Anı], 8. Demir Köprü, 9. Taht Salonu;
 *  Katlar Arası Kontrol Noktaları / Checkpoints & Sıfır GC)
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
  Scalar
} from '@babylonjs/core';
import { PlayerController } from '../player/PlayerController';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export type YeraltiFloorType =
  | 'KEMIK_GECIDI'
  | 'KOR_NEHRI'
  | 'KARA_SU'
  | 'GOLGE_ORMANI'
  | 'AYNA_SALONU'
  | 'SOGUK_CEKIRDEK'
  | 'UNUTUS_PINARI'
  | 'DEMIR_KOPRU'
  | 'TAHT_SALONU';

export interface YeraltiFloor {
  floorIndex: number;
  type: YeraltiFloorType;
  nameTr: string;
  descriptionTr: string;
  checkpointPos: Vector3;
  portalMesh: Mesh;
  isUnlocked: boolean;
}

export class DokuzKatYeralti {
  public scene: Scene;
  public root: TransformNode;

  // Aktif Kat (1..9)
  public currentFloorIndex = 1;
  public floors: YeraltiFloor[] = [];

  // 5. Kat Ayna Salonu Bulmacası
  public mirrorAngle1 = 0.0;
  public mirrorAngle2 = 0.0;
  public mirrorAngle3 = 0.0;
  public isMirrorPuzzleSolved = false;

  // 7. Kat Unutuş Pınarı Anı Vizyonu
  public isMemoryVisionTriggered = false;

  // Materyaller
  private matBone: StandardMaterial;
  private matObsidian: StandardMaterial;
  private matMagma: StandardMaterial;
  private matDarkWater: StandardMaterial;
  private matMirror: StandardMaterial;
  private matMemorySpring: StandardMaterial;

  // Scratch Vektörleri (Zero GC)
  private scratchPlayerPos = new Vector3(0, 0, 0);

  constructor(scene: Scene, kamPower?: any, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.root = new TransformNode('dokuz_kat_yeralti_root', scene);
    this.root.position.set(-300, -35.0, 300); // Açık dünyadan izole derin yeraltı koordinatları

    // ================= MATERYALLER =================
    this.matBone = new StandardMaterial('mat_yeralti_bone', scene);
    this.matBone.diffuseColor = new Color3(0.85, 0.82, 0.75); // Kemik rengi
    this.matBone.freeze();

    this.matObsidian = new StandardMaterial('mat_yeralti_obsidian_floor', scene);
    this.matObsidian.diffuseColor = new Color3(0.08, 0.08, 0.12);
    this.matObsidian.specularColor = new Color3(0.3, 0.3, 0.4);
    this.matObsidian.freeze();

    this.matMagma = new StandardMaterial('mat_yeralti_magma', scene);
    this.matMagma.diffuseColor = new Color3(0.9, 0.25, 0.05);
    this.matMagma.emissiveColor = new Color3(0.7, 0.15, 0.02);

    this.matDarkWater = new StandardMaterial('mat_yeralti_darkwater', scene);
    this.matDarkWater.diffuseColor = new Color3(0.05, 0.18, 0.22);
    this.matDarkWater.emissiveColor = new Color3(0.02, 0.08, 0.1);

    this.matMirror = new StandardMaterial('mat_yeralti_mirror', scene);
    this.matMirror.diffuseColor = new Color3(0.65, 0.9, 1.0);
    this.matMirror.emissiveColor = new Color3(0.2, 0.4, 0.6);

    this.matMemorySpring = new StandardMaterial('mat_memory_spring', scene);
    this.matMemorySpring.diffuseColor = new Color3(0.4, 0.85, 0.7);
    this.matMemorySpring.emissiveColor = new Color3(0.25, 0.6, 0.5);

    // 9 Katın Odalarını & Kontrol Noktalarını İnşa Et
    this.build9Floors(scene, shadowGen);
  }

  private build9Floors(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const floorConfigs: { type: YeraltiFloorType; name: string; desc: string; offset: Vector3 }[] = [
      { type: 'KEMIK_GECIDI', name: '1. Kat: Kemik Geçidi', desc: 'Kemik kalkanlı iskelet muhafızlar ve savaş sınavı.', offset: new Vector3(0, 0, 0) },
      { type: 'KOR_NEHRI', name: '2. Kat: Kor Nehri', desc: 'Magma lav akıntıları ve Yel Ana süzülüş geçidi.', offset: new Vector3(0, -6, 40) },
      { type: 'KARA_SU', name: '3. Kat: Kara Su', desc: 'Zehirli katran suyu ve hava kabarcığı dalış tüneli.', offset: new Vector3(0, -12, 80) },
      { type: 'GOLGE_ORMANI', name: '4. Kat: Gölge Ormanı', desc: 'Kör yeraltı körmözlerinin arasından sessizce süzülüş.', offset: new Vector3(0, -18, 120) },
      { type: 'AYNA_SALONU', name: '5. Kat: Ayna Salonu', desc: '3 Kut kristal aynasını 45° hizalayarak kapıyı açma bulmacası.', offset: new Vector3(0, -24, 160) },
      { type: 'SOGUK_CEKIRDEK', name: '6. Kat: Soğuk Çekirdek', desc: 'Dondurucu soğuk (-35°C) ve meşalelerle ilerleme.', offset: new Vector3(0, -30, 200) },
      { type: 'UNUTUS_PINARI', name: '7. Kat: Unutuş Pınarı', desc: 'Duygusal anı havuzu: Oba, Kam Ata ve Börü hatıraları.', offset: new Vector3(0, -36, 240) },
      { type: 'DEMIR_KOPRU', name: '8. Kat: Demir Köprü', desc: 'Zamanlamalı hareketli platformlar ve demir sarkıtlar.', offset: new Vector3(0, -42, 280) },
      { type: 'TAHT_SALONU', name: '9. Kat: Taht Salonu', desc: 'Erlik Han’ın obsidiyen tahtı ve son karşılaşma arenası.', offset: new Vector3(0, -48, 320) }
    ];

    floorConfigs.forEach((cfg, idx) => {
      const floorIdx = idx + 1;
      const worldCenter = this.root.position.add(cfg.offset);

      // Kat Zemin Platformu (18x18m)
      const platform = MeshBuilder.CreateBox(`yeralti_platform_${floorIdx}`, {
        width: 24.0,
        height: 1.2,
        depth: 24.0
      }, scene);
      platform.position.copyFrom(cfg.offset);
      platform.material = idx === 1 ? this.matMagma : idx === 2 ? this.matDarkWater : this.matObsidian;
      platform.parent = this.root;
      if (shadowGen) shadowGen.addShadowCaster(platform);

      // Katlar Arası Geçiş Kapısı (Portal)
      const portal = MeshBuilder.CreateTorus(`yeralti_portal_${floorIdx}`, {
        diameter: 4.5,
        thickness: 0.8,
        tessellation: 8
      }, scene);
      portal.position.set(cfg.offset.x, cfg.offset.y + 2.5, cfg.offset.z + 10.0);
      portal.rotation.x = Math.PI * 0.5;
      portal.material = this.matObsidian;
      portal.parent = this.root;

      this.floors.push({
        floorIndex: floorIdx,
        type: cfg.type,
        nameTr: cfg.name,
        descriptionTr: cfg.desc,
        checkpointPos: new Vector3(worldCenter.x, worldCenter.y + 1.5, worldCenter.z - 8.0),
        portalMesh: portal,
        isUnlocked: floorIdx === 1
      });
    });
  }

  /**
   * Bir Sonraki Kata Geçiş (Checkpoint Güncellemesi)
   */
  public advanceFloor(player: PlayerController): boolean {
    if (this.currentFloorIndex >= 9) return false;

    this.currentFloorIndex++;
    const current = this.floors[this.currentFloorIndex - 1];
    current.isUnlocked = true;

    // Oyuncuyu yeni katın kontrol noktasına taşı
    player.position.copyFrom(current.checkpointPos);

    ProceduralAudio.playBeaconHum();
    EventBus.emit('ui:loot_toast', {
      text: `🚪 ${current.nameTr} — ${current.descriptionTr}`
    });

    // 7. Kat Unutuş Pınarı Anı Sahnesi Tetikleyicisi
    if (current.type === 'UNUTUS_PINARI') {
      this.triggerMemoryVision();
    }

    return true;
  }

  /**
   * 5. Kat Ayna Salonu Bulmacası: Aynaları 45° Döndürme
   */
  public rotateMirror(mirrorIndex: number): boolean {
    if (mirrorIndex === 1) this.mirrorAngle1 = (this.mirrorAngle1 + Math.PI * 0.25) % (Math.PI * 2);
    if (mirrorIndex === 2) this.mirrorAngle2 = (this.mirrorAngle2 + Math.PI * 0.25) % (Math.PI * 2);
    if (mirrorIndex === 3) this.mirrorAngle3 = (this.mirrorAngle3 + Math.PI * 0.25) % (Math.PI * 2);

    ProceduralAudio.playPressurePlateClick();

    // 3 ayna da doğru 45° açıda hizalandığında
    if (
      Math.abs(this.mirrorAngle1 - Math.PI * 0.25) < 0.05 &&
      Math.abs(this.mirrorAngle2 - Math.PI * 0.25) < 0.05 &&
      Math.abs(this.mirrorAngle3 - Math.PI * 0.25) < 0.05
    ) {
      this.isMirrorPuzzleSolved = true;
      ProceduralAudio.playPuzzleSolveDing();
      EventBus.emit('ui:loot_toast', { text: '✨ Kut Işığı Odaklandı! 5. Kat Kapısı Açıldı.' });
      return true;
    }

    return false;
  }

  /**
   * 7. Kat Unutuş Pınarı Duygusal Hatıra Sahnesi
   */
  public triggerMemoryVision(): void {
    if (this.isMemoryVisionTriggered) return;
    this.isMemoryVisionTriggered = true;

    ProceduralAudio.playShrineSolvedFanfare();
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Kadim Anı (Ötüken Obası)',
      text: 'Kam Ata’nın kutsal ocağı... Börü’nün ilk sadık bakışı... "Unutma Ayaz; Kut, yok etmek için değil, yaşatmak ve dengeyi korumak içindir."'
    });
    EventBus.emit('ui:loot_toast', { text: '💧 Unutuş Pınarı: Kalbindeki Kut ateşi alevlendi (+50 Can).' });
  }

  /**
   * Oyuncu Öldüğünde Aktif Katın Kontrol Noktasına Geri Dönüş
   */
  public respawnAtCurrentCheckpoint(player: PlayerController): void {
    const current = this.floors[this.currentFloorIndex - 1];
    player.position.copyFrom(current.checkpointPos);
    EventBus.emit('ui:loot_toast', { text: `⛺ Kontrol Noktasına Dönüldü: ${current.nameTr}` });
  }

  public checkInteract(playerPos: Vector3, player?: PlayerController): boolean {
    const current = this.floors[this.currentFloorIndex - 1];
    const portalWorld = current.portalMesh.getAbsolutePosition();

    if (Vector3.Distance(playerPos, portalWorld) < 3.8 && player) {
      return this.advanceFloor(player);
    }

    // 5. Kat Aynalar Etkileşimi
    if (current.type === 'AYNA_SALONU' && !this.isMirrorPuzzleSolved) {
      return this.rotateMirror(1) || this.rotateMirror(2) || this.rotateMirror(3);
    }

    return false;
  }

  public update(deltaTime: number, player?: any, combat?: any): void {
    // Kat ışıklarının ve lav akıntılarının animasyonu
    if (player && player.position) {
      this.scratchPlayerPos.copyFrom(player.position);
    }
  }

  public dispose(): void {
    this.root.dispose();
  }
}
