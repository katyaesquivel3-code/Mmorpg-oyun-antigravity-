/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Umay Ana Kutsal Mabedi & 3 Sınav (UmayTrialShrine)
 * (1. Sınav: Cesaret [Kara Kış Sürüsü], 2. Sınav: Merhamet [Donan Albız Yavrusu],
 *  3. Sınav: Denge [İki Kefeli Yer-Gök Terazisi Bulmacası] -> ÖDÜL: GÖK KUTU & Sıfır GC)
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
import { KamPowerManager } from '../powers/KamPowerManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export interface ScaleWeightBlock {
  id: string;
  weight: number;
  currentPan: 'NONE' | 'LEFT' | 'RIGHT';
  mesh: Mesh;
}

export class UmayTrialShrine {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;

  // 3 Sınav Durumları
  public courageCompleted = false;
  public compassionCompleted = false;
  public balanceCompleted = false;
  public isShrineFinished = false;

  // 1. Cesaret Sınavı Zamanlayıcısı
  public isCourageTrialActive = false;
  public courageTimer = 0.0;
  public readonly COURAGE_DURATION = 35.0; // 35 sn hayatta kalma

  // 2. Merhamet Sınavı (Donan Albız Yavrusu)
  public babyAlbizMesh!: Mesh;
  public isBabyWarmed = false;

  // 3. Denge Sınavı (İki Kefeli Yer-Gök Terazisi)
  public scaleBeamMesh!: Mesh;
  public leftPanMesh!: Mesh;  // Yer Kefesi
  public rightPanMesh!: Mesh; // Gök Kefesi
  public weightBlocks: ScaleWeightBlock[] = [];
  public balanceBeamAngle = 0.25; // Başlangıçta dengesiz eğik açı

  // Altar & Kutsal Gök Kutu Reliki
  public altarMesh!: Mesh;
  public relicMesh!: Mesh;

  // Materyaller
  private matWhiteMarble: StandardMaterial;
  private matGoldTrim: StandardMaterial;
  private matGlowCyan: StandardMaterial;
  private matBabyAlbiz: StandardMaterial;

  private animTimer = 0.0;

  constructor(scene: Scene, kamPower?: KamPowerManager | null, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.position = new Vector3(140, 26.0, 140); // Gök Zirve Umay Platosu

    this.root = new TransformNode('umay_shrine_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= MATERYALLER =================
    this.matWhiteMarble = new StandardMaterial('mat_umay_marble', scene);
    this.matWhiteMarble.diffuseColor = new Color3(0.92, 0.95, 0.98);
    this.matWhiteMarble.specularColor = new Color3(0.8, 0.9, 1.0);
    this.matWhiteMarble.freeze();

    this.matGoldTrim = new StandardMaterial('mat_umay_gold', scene);
    this.matGoldTrim.diffuseColor = new Color3(0.95, 0.82, 0.25);
    this.matGoldTrim.emissiveColor = new Color3(0.3, 0.2, 0.05);
    this.matGoldTrim.freeze();

    this.matGlowCyan = new StandardMaterial('mat_umay_glow', scene);
    this.matGlowCyan.diffuseColor = new Color3(0.3, 0.85, 0.95);
    this.matGlowCyan.emissiveColor = new Color3(0.2, 0.65, 0.85);

    this.matBabyAlbiz = new StandardMaterial('mat_baby_albiz', scene);
    this.matBabyAlbiz.diffuseColor = new Color3(0.65, 0.75, 0.85);
    this.matBabyAlbiz.emissiveColor = new Color3(0.1, 0.2, 0.3);

    // ================= 1. MABET SÜTUNLARI & KEMERİ =================
    this.buildShrineArchitecture(scene, shadowGen);

    // ================= 2. MERHAMET SINAVI (DONAN ALBIZ YAVRUSU) =================
    this.babyAlbizMesh = MeshBuilder.CreateSphere('baby_albiz', { diameter: 0.9, segments: 6 }, scene);
    this.babyAlbizMesh.position.set(-8.5, 0.45, -6.0);
    this.babyAlbizMesh.material = this.matBabyAlbiz;
    this.babyAlbizMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.babyAlbizMesh);

    // ================= 3. DENGE SINAVI (İKİ KEFELİ TERAZİ) =================
    this.buildBalanceScale(scene, shadowGen);

    // ================= 4. KUTSAL ALTAR & GÖK KUTU RELİKİ =================
    this.altarMesh = MeshBuilder.CreateCylinder('umay_altar', { diameterTop: 3.2, diameterBottom: 4.2, height: 1.6, tessellation: 10 }, scene);
    this.altarMesh.position.set(0, 0.8, 8.5);
    this.altarMesh.material = this.matWhiteMarble;
    this.altarMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.altarMesh);

    this.relicMesh = MeshBuilder.CreatePolyhedron('gok_kutu_relic', { type: 1, size: 0.75 }, scene);
    this.relicMesh.position.set(0, 2.2, 8.5);
    this.relicMesh.material = this.matGlowCyan;
    this.relicMesh.parent = this.root;
  }

  private buildShrineArchitecture(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const colLocs = [
      new Vector3(-12, 0, -12),
      new Vector3(12, 0, -12),
      new Vector3(-12, 0, 12),
      new Vector3(12, 0, 12)
    ];

    colLocs.forEach((cpos, idx) => {
      const col = MeshBuilder.CreateCylinder(`umay_col_${idx}`, { diameter: 1.4, height: 9.0, tessellation: 8 }, scene);
      col.position.set(cpos.x, 4.5, cpos.z);
      col.material = this.matWhiteMarble;
      col.parent = this.root;
      if (shadowGen) shadowGen.addShadowCaster(col);
    });

    // Mabet Taban Döşemesi
    const floor = MeshBuilder.CreateCylinder('umay_floor', { diameter: 30.0, height: 0.6, tessellation: 16 }, scene);
    floor.position.set(0, 0.3, 0);
    floor.material = this.matWhiteMarble;
    floor.parent = this.root;
  }

  private buildBalanceScale(scene: Scene, shadowGen: ShadowGenerator | null): void {
    // Terazi Direği
    const post = MeshBuilder.CreateCylinder('scale_post', { diameter: 0.6, height: 5.5 }, scene);
    post.position.set(0, 2.75, -8.0);
    post.material = this.matGoldTrim;
    post.parent = this.root;

    // Terazi Kolu (Dönen Işın)
    this.scaleBeamMesh = MeshBuilder.CreateBox('scale_beam', { width: 8.5, height: 0.3, depth: 0.4 }, scene);
    this.scaleBeamMesh.position.set(0, 5.2, -8.0);
    this.scaleBeamMesh.rotation.z = this.balanceBeamAngle;
    this.scaleBeamMesh.material = this.matGoldTrim;
    this.scaleBeamMesh.parent = this.root;

    // Sol Kefe (Yer)
    this.leftPanMesh = MeshBuilder.CreateCylinder('scale_pan_left', { diameter: 2.6, height: 0.25 }, scene);
    this.leftPanMesh.position.set(-4.0, 3.2, -8.0);
    this.leftPanMesh.material = this.matGoldTrim;
    this.leftPanMesh.parent = this.root;

    // Sağ Kefe (Gök)
    this.rightPanMesh = MeshBuilder.CreateCylinder('scale_pan_right', { diameter: 2.6, height: 0.25 }, scene);
    this.rightPanMesh.position.set(4.0, 3.8, -8.0);
    this.rightPanMesh.material = this.matGoldTrim;
    this.rightPanMesh.parent = this.root;

    // 3 Kutsal Denge Taşı
    const weightConfigs = [
      { id: 'yer_stone', weight: 2, pos: new Vector3(-3.0, 0.4, -4.5) },
      { id: 'gok_stone', weight: 3, pos: new Vector3(3.0, 0.4, -4.5) },
      { id: 'denge_stone', weight: 1, pos: new Vector3(0.0, 0.4, -4.5) }
    ];

    weightConfigs.forEach((w) => {
      const block = MeshBuilder.CreateBox(`weight_${w.id}`, { width: 0.8, height: 0.8, depth: 0.8 }, scene);
      block.position.copyFrom(w.pos);
      block.material = this.matWhiteMarble;
      block.parent = this.root;

      this.weightBlocks.push({
        id: w.id,
        weight: w.weight,
        currentPan: 'NONE',
        mesh: block
      });

      if (shadowGen) shadowGen.addShadowCaster(block);
    });
  }

  /**
   * 1. Cesaret Sınavını Başlat
   */
  public startCourageTrial(): void {
    if (this.courageCompleted || this.isCourageTrialActive) return;
    this.isCourageTrialActive = true;
    this.courageTimer = this.COURAGE_DURATION;
    ProceduralAudio.playFlameIgnition();
    EventBus.emit('ui:loot_toast', {
      text: '⚔️ UMAY CESARET SINAVI: 35 saniye boyunca Kara Kış Körmözlerine dayan!'
    });
  }

  /**
   * 2. Merhamet Sınavı: Donan Albız Yavrusunu Isıtma
   */
  public warmBabyAlbiz(): boolean {
    if (this.compassionCompleted) return false;

    this.isBabyWarmed = true;
    this.compassionCompleted = true;
    this.matBabyAlbiz.emissiveColor = new Color3(0.4, 0.8, 0.95); // Canlandı ve parıldadı
    this.babyAlbizMesh.scaling.set(1.2, 1.2, 1.2);

    ProceduralAudio.playShrineSolvedFanfare();
    EventBus.emit('ui:loot_toast', {
      text: '🕊️ UMAY MERHAMET SINAVI GEÇİLDİ! Ak Tüy kutsaması kazanıldı.'
    });

    this.checkAllTrialsCompleted();
    return true;
  }

  /**
   * 3. Denge Sınavı: Ağırlık Taşını Kefeye Yerleştirme
   */
  public placeWeightOnPan(weightId: string, pan: 'LEFT' | 'RIGHT'): boolean {
    const w = this.weightBlocks.find((b) => b.id === weightId);
    if (!w) return false;

    w.currentPan = pan;
    if (pan === 'LEFT') {
      w.mesh.position.set(-4.0, 3.8, -8.0);
    } else {
      w.mesh.position.set(4.0, 3.8, -8.0);
    }

    ProceduralAudio.playPressurePlateClick();
    this.evaluateBalance();
    return true;
  }

  /**
   * İki Kefe Arasındaki Ağırlık Dengesini Değerlendir
   */
  public evaluateBalance(): void {
    let leftWeight = 0;
    let rightWeight = 0;

    for (let i = 0; i < this.weightBlocks.length; i++) {
      const b = this.weightBlocks[i];
      if (b.currentPan === 'LEFT') leftWeight += b.weight;
      if (b.currentPan === 'RIGHT') rightWeight += b.weight;
    }

    // Sol: Yer (2) + Denge (1) = 3 | Sağ: Gök (3) = 3 -> TAM DENGE!
    if (leftWeight === 3 && rightWeight === 3) {
      this.balanceBeamAngle = 0.0;
      this.scaleBeamMesh.rotation.z = 0.0;
      this.balanceCompleted = true;
      ProceduralAudio.playPuzzleSolveDing();
      EventBus.emit('ui:loot_toast', {
        text: '⚖️ UMAY DENGE SINAVI GEÇİLDİ! Yer ve Gök tam dengede.'
      });
      this.checkAllTrialsCompleted();
    } else {
      // Dengesiz eğim
      this.balanceBeamAngle = leftWeight > rightWeight ? -0.22 : 0.22;
      this.scaleBeamMesh.rotation.z = this.balanceBeamAngle;
    }
  }

  /**
   * 3 Sınav da Tamamlandığında Kutsal GÖK KUTU'nu Bahşet
   */
  private checkAllTrialsCompleted(): void {
    if (this.courageCompleted && this.compassionCompleted && this.balanceCompleted && !this.isShrineFinished) {
      this.isShrineFinished = true;
      const kamPower = KamPowerManager.getInstance();
      kamPower.hasGokKutu = true;

      ProceduralAudio.playKutAcquired();
      EventBus.emit('world:gok_kutu_unlocked');
      EventBus.emit('ui:loot_toast', {
        text: '✨ KUT’UN 4. PARÇASI: GÖK KUTU KAZANILDI! (Çift Zıplama & Şimşek Atılımı)'
      });
    }
  }

  public checkInteract(playerPos: Vector3): boolean {
    const shrineWorld = this.root.position;

    // Yavru Albız ile etkileşim
    const distToBaby = Vector3.Distance(playerPos, shrineWorld.add(this.babyAlbizMesh.position));
    if (distToBaby < 3.2 && !this.compassionCompleted) {
      return this.warmBabyAlbiz();
    }

    // Cesaret Sınavı tetikleyicisi
    if (!this.courageCompleted && !this.isCourageTrialActive && Vector3.Distance(playerPos, shrineWorld) < 12.0) {
      this.startCourageTrial();
      return true;
    }

    // Denge sınavı taş etkileşimi: Otomatik doğru dizilim yardımı
    for (const b of this.weightBlocks) {
      const blockWorld = shrineWorld.add(b.mesh.position);
      if (Vector3.Distance(playerPos, blockWorld) < 2.8) {
        if (b.id === 'yer_stone' || b.id === 'denge_stone') {
          return this.placeWeightOnPan(b.id, 'LEFT');
        } else if (b.id === 'gok_stone') {
          return this.placeWeightOnPan(b.id, 'RIGHT');
        }
      }
    }

    return false;
  }

  public update(deltaTime: number, playerPos?: Vector3): void {
    this.animTimer += deltaTime;

    // Gök Kutu Relikinin mistik dönüşü
    this.relicMesh.rotation.y += deltaTime * 1.8;
    this.relicMesh.position.y = 2.2 + Math.sin(this.animTimer * 2.5) * 0.15;

    // 1. Cesaret Sınavı Sayacı
    if (this.isCourageTrialActive && !this.courageCompleted) {
      this.courageTimer -= deltaTime;
      if (this.courageTimer <= 0) {
        this.isCourageTrialActive = false;
        this.courageCompleted = true;
        ProceduralAudio.playQuestComplete();
        EventBus.emit('ui:loot_toast', { text: '🛡️ Cesaret Sınavı Tamamlandı! Dalgalar dindi.' });
        this.checkAllTrialsCompleted();
      }
    }
  }

  public dispose(): void {
    this.root.dispose();
  }
}
