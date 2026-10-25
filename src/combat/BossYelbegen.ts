/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * 7 Başlı Ejder / Yeraltı Canavarı BOSS YELBEGEN (BossYelbegen)
 * (7 Bağımsız Element Başlığı: Ateş, Buz, Zehir, Rüzgâr, Asit, Şimşek, Ulu Kara Baş;
 *  Baş Kesme Mekaniği, 30 sn Yeniden Uzama Zamanlayıcısı, Ateşle Dağlama / Cauterize,
 *  0.5s Zemin Telegraph Göstergesi, Tsunami Öfkesi ve SU KUTU Ödülü & Sıfır GC)
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
  Scalar,
  ParticleSystem,
  Texture
} from '@babylonjs/core';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { CombatSystem } from './CombatSystem';

export type YelbegenElementType = 'FIRE' | 'FROST' | 'POISON' | 'WIND' | 'ACID' | 'LIGHTNING' | 'DARK';

export interface YelbegenHead {
  index: number;
  nameTr: string;
  element: YelbegenElementType;
  headMesh: Mesh;
  neckRoot: TransformNode;
  neckSegments: Mesh[];
  maxHealth: number;
  health: number;
  isSevered: boolean;
  isCauterized: boolean;
  regrowthTimer: number; // 30 sn
  baseAngle: number;
  matGlow: StandardMaterial;
  matStump: StandardMaterial;
}

export type YelbegenPhase = 'HEADS_PHASE' | 'FINAL_HEAD_RAGE' | 'DEAD';

export class BossYelbegen {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;

  // Boss Genel Durumu
  public phase: YelbegenPhase = 'HEADS_PHASE';
  public isDead = false;
  public maxHealth = 1400; // 6 * 150 + 500
  public health = 1400;

  // 7 Baş Koleksiyonu
  public heads: YelbegenHead[] = [];

  // 3D Gövde ve Bacaklar
  public bodyMesh: Mesh;
  public legs: Mesh[] = [];
  public tailMesh: Mesh;

  // Telegraph Halka Göstergesi (0.5 sn kuralı)
  private telegraphRing: Mesh;
  private matTelegraph: StandardMaterial;
  private isTelegraphActive = false;
  private telegraphTimer = 0.0;
  private telegraphTargetPos = new Vector3(0, 0, 0);

  // Parçacıklar
  private venomParticles: ParticleSystem | null = null;
  private flameParticles: ParticleSystem | null = null;

  // Dövüş ve Animasyon Zamanlayıcıları
  private attackTimer = 0.0;
  private attackCooldown = 2.2;
  private animTimer = 0.0;
  private currentHeading = 0.0;

  // Sıcak döngü scratch nesneleri (Sıfır GC)
  private scratchDir = new Vector3(0, 0, 0);
  private scratchHeadPos = new Vector3(0, 0, 0);

  constructor(
    arenaX = -130,
    arenaZ = -45,
    scene: Scene,
    shadowGen: ShadowGenerator | null = null
  ) {
    this.scene = scene;
    const arenaY = -12.0; // Göl altı tapınak tabanı derinliği
    this.position = new Vector3(arenaX, arenaY, arenaZ);

    this.root = new TransformNode('boss_yelbegen_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= 1. DEVASA EJDER GÖVDESİ & PENÇELERİ =================
    const matDragonSkin = new StandardMaterial('mat_yelbegen_skin', scene);
    matDragonSkin.diffuseColor = new Color3(0.1, 0.12, 0.15); // Obsidiyen koyu pullar
    matDragonSkin.specularColor = new Color3(0.2, 0.4, 0.35);
    matDragonSkin.freeze();

    this.bodyMesh = MeshBuilder.CreateCylinder('yelbegen_body', {
      diameterTop: 4.5,
      diameterBottom: 5.5,
      height: 8.0,
      tessellation: 12
    }, scene);
    this.bodyMesh.position.set(0, 3.2, 0);
    this.bodyMesh.rotation.x = Math.PI * 0.45;
    this.bodyMesh.material = matDragonSkin;
    this.bodyMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.bodyMesh);

    // 4 Ağır Pençe Ayak
    const legPositions = [
      new Vector3(-2.8, 1.2, 2.5),
      new Vector3(2.8, 1.2, 2.5),
      new Vector3(-3.2, 1.2, -2.5),
      new Vector3(3.2, 1.2, -2.5)
    ];

    legPositions.forEach((lpos, idx) => {
      const leg = MeshBuilder.CreateBox(`yelbegen_leg_${idx}`, { width: 1.2, height: 2.6, depth: 1.4 }, scene);
      leg.position.copyFrom(lpos);
      leg.material = matDragonSkin;
      leg.parent = this.root;
      this.legs.push(leg);
      if (shadowGen) shadowGen.addShadowCaster(leg);
    });

    // Kuyruk
    this.tailMesh = MeshBuilder.CreateCylinder('yelbegen_tail', { diameterTop: 1.8, diameterBottom: 0.3, height: 7.0, tessellation: 8 }, scene);
    this.tailMesh.position.set(0, 1.5, -6.5);
    this.tailMesh.rotation.x = Math.PI * 0.48;
    this.tailMesh.material = matDragonSkin;
    this.tailMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.tailMesh);

    // ================= 2. 7 BAĞIMSIZ BOYUN VE ELEMENT BAŞI =================
    this.build7Heads(scene, shadowGen);

    // ================= 3. 0.5s YER HALKASI TELEGRAPH GÖSTERGESİ =================
    this.telegraphRing = MeshBuilder.CreateTorus('yelbegen_telegraph', { diameter: 12.0, thickness: 0.35, tessellation: 24 }, scene);
    this.telegraphRing.position.y = 0.25;
    this.telegraphRing.parent = this.root;

    this.matTelegraph = new StandardMaterial('mat_yelbegen_tel', scene);
    this.matTelegraph.diffuseColor = new Color3(1.0, 0.2, 0.1);
    this.matTelegraph.emissiveColor = new Color3(0.9, 0.1, 0.05);
    this.telegraphRing.material = this.matTelegraph;
    this.telegraphRing.setEnabled(false);
  }

  /**
   * 7 Bağımsız Element Başlığını İnşa Eder
   */
  private build7Heads(scene: Scene, shadowGen: ShadowGenerator | null): void {
    const headConfigs: { name: string; element: YelbegenElementType; color: Color3; emissive: Color3; angle: number }[] = [
      { name: 'Ateş Başı', element: 'FIRE', color: new Color3(0.95, 0.35, 0.1), emissive: new Color3(0.85, 0.2, 0.02), angle: -1.3 },
      { name: 'Buz Başı', element: 'FROST', color: new Color3(0.3, 0.85, 1.0), emissive: new Color3(0.15, 0.7, 0.95), angle: -0.8 },
      { name: 'Zehir Başı', element: 'POISON', color: new Color3(0.3, 0.9, 0.2), emissive: new Color3(0.18, 0.8, 0.1), angle: -0.3 },
      { name: 'Rüzgâr Başı', element: 'WIND', color: new Color3(0.75, 0.95, 1.0), emissive: new Color3(0.4, 0.85, 0.95), angle: 0.3 },
      { name: 'Asit Başı', element: 'ACID', color: new Color3(0.85, 0.9, 0.15), emissive: new Color3(0.65, 0.75, 0.05), angle: 0.8 },
      { name: 'Şimşek Başı', element: 'LIGHTNING', color: new Color3(0.65, 0.35, 1.0), emissive: new Color3(0.55, 0.2, 0.95), angle: 1.3 },
      // 7. Baş (Merkezi Ulu Kara Baş - Tsunami)
      { name: 'Ulu Kara Baş (Tsunami)', element: 'DARK', color: new Color3(0.15, 0.15, 0.2), emissive: new Color3(0.08, 0.2, 0.35), angle: 0.0 }
    ];

    headConfigs.forEach((cfg, idx) => {
      const neckRoot = new TransformNode(`neck_root_${idx}`, scene);
      neckRoot.parent = this.root;
      neckRoot.position.set(Math.sin(cfg.angle) * 2.8, 4.2 + (idx === 6 ? 1.5 : 0), Math.cos(cfg.angle) * 1.5 + (idx === 6 ? 0.8 : 0));

      const matGlow = new StandardMaterial(`mat_head_glow_${idx}`, scene);
      matGlow.diffuseColor = cfg.color;
      matGlow.emissiveColor = cfg.emissive;

      const matStump = new StandardMaterial(`mat_stump_${idx}`, scene);
      matStump.diffuseColor = new Color3(0.1, 0.1, 0.1);
      matStump.emissiveColor = new Color3(0.0, 0.0, 0.0);

      // Boyun Segmentleri (3 halka)
      const segments: Mesh[] = [];
      for (let s = 0; s < 3; s++) {
        const seg = MeshBuilder.CreateCylinder(`neck_seg_${idx}_${s}`, {
          diameter: (idx === 6 ? 1.5 : 1.1) - s * 0.15,
          height: 1.6,
          tessellation: 8
        }, scene);
        seg.position.set(0, s * 1.35 + 0.8, s * 0.4);
        seg.rotation.x = 0.25;
        seg.material = this.bodyMesh.material;
        seg.parent = neckRoot;
        segments.push(seg);
        if (shadowGen) shadowGen.addShadowCaster(seg);
      }

      // Baş Modeli (Boynuzlu Ejder Kafası)
      const headScale = idx === 6 ? 1.6 : 1.0;
      const head = MeshBuilder.CreateBox(`yelbegen_head_${idx}`, {
        width: 1.3 * headScale,
        height: 1.1 * headScale,
        depth: 2.2 * headScale
      }, scene);
      head.position.set(0, 4.4 * (idx === 6 ? 1.25 : 1.0), 1.6 * (idx === 6 ? 1.3 : 1.0));
      head.material = matGlow;
      head.parent = neckRoot;
      if (shadowGen) shadowGen.addShadowCaster(head);

      // Boynuzlar
      const hornLeft = MeshBuilder.CreateCylinder(`horn_l_${idx}`, { diameterTop: 0.0, diameterBottom: 0.25, height: 1.2 }, scene);
      hornLeft.position.set(-0.45 * headScale, 0.7 * headScale, -0.4 * headScale);
      hornLeft.rotation.x = -0.4;
      hornLeft.rotation.z = -0.3;
      hornLeft.material = matGlow;
      hornLeft.parent = head;

      const hornRight = MeshBuilder.CreateCylinder(`horn_r_${idx}`, { diameterTop: 0.0, diameterBottom: 0.25, height: 1.2 }, scene);
      hornRight.position.set(0.45 * headScale, 0.7 * headScale, -0.4 * headScale);
      hornRight.rotation.x = -0.4;
      hornRight.rotation.z = 0.3;
      hornRight.material = matGlow;
      hornRight.parent = head;

      this.heads.push({
        index: idx,
        nameTr: cfg.name,
        element: cfg.element,
        headMesh: head,
        neckRoot,
        neckSegments: segments,
        maxHealth: idx === 6 ? 500 : 150,
        health: idx === 6 ? 500 : 150,
        isSevered: false,
        isCauterized: false,
        regrowthTimer: 0,
        baseAngle: cfg.angle,
        matGlow,
        matStump
      });
    });
  }

  /**
   * Her Kare Güncelleme & 7 Başın Fiziği, Saldırıları ve Dağlama Kontrolleri (Sıfır GC)
   */
  public update(deltaTime: number, playerPos: Vector3, playerCombat: CombatSystem): void {
    if (this.isDead) return;

    this.animTimer += deltaTime;

    // Gövde nefes dalgalanması
    this.bodyMesh.scaling.y = 1.0 + Math.sin(this.animTimer * 2.5) * 0.06;
    this.tailMesh.rotation.y = Math.sin(this.animTimer * 3.0) * 0.45;

    // Oyuncuya doğru devasa gövdeyi yavaşça yönelt
    this.scratchDir.copyFrom(playerPos).subtractInPlace(this.position);
    this.scratchDir.y = 0;
    const distToPlayer = this.scratchDir.length();

    // Şahmaran Gölü Derinlikleri Emniyeti: Oyuncu su altı arenasında değilse saldırı tetikleme
    if (distToPlayer > 45.0) return;

    if (distToPlayer > 0.5) {
      const targetAngle = Math.atan2(this.scratchDir.x, this.scratchDir.z);
      this.currentHeading = Scalar.Lerp(this.currentHeading, targetAngle, Math.min(1.0, deltaTime * 1.8));
      this.root.rotation.y = this.currentHeading;
    }

    // 7 Başın Dalgalanması ve Yeniden Uzama (Regrowth) Sayacı
    this.updateHeads(deltaTime, playerPos);

    // Dövüş ve Telegraph Saldırıları
    this.updateAttacks(deltaTime, playerPos, playerCombat, distToPlayer);
  }

  /**
   * 7 Başın dalgalanması, baş kopması ve 30 sn sonra yeniden uzaması
   */
  private updateHeads(deltaTime: number, playerPos: Vector3): void {
    let severedCount = 0;
    let cauterizedCount = 0;

    for (let i = 0; i < 6; i++) {
      const h = this.heads[i];

      if (h.isSevered) {
        severedCount++;
        if (h.isCauterized) {
          cauterizedCount++;
          // Dağlanmış kütük: Kömür karası ve alevsiz kalır
          continue;
        }

        // Dağlanmamış baş: 30 sn sonra yeniden uzar!
        h.regrowthTimer -= deltaTime;
        if (h.regrowthTimer <= 0) {
          this.regrowHead(h);
        }
      } else {
        // Canlı baş: Oyuncuya doğru tıslayarak yılan gibi kıvrılır
        const wave = Math.sin(this.animTimer * 3.5 + i * 1.1) * 0.25;
        h.neckRoot.rotation.x = 0.2 + wave;
        h.neckRoot.rotation.y = Math.cos(this.animTimer * 2.5 + i) * 0.3;
      }
    }

    // 6 Başın tamamı dağlanıp mühürlendiğinde -> 7. Baş (Ulu Kara Baş) Öfke Fazı
    const mainHead = this.heads[6];
    if (cauterizedCount >= 6 && this.phase === 'HEADS_PHASE') {
      this.enterFinalRagePhase();
    }

    if (this.phase === 'FINAL_HEAD_RAGE' && !mainHead.isSevered) {
      // 7. Baş devasa saldırganlık ile ileri atılır
      mainHead.neckRoot.rotation.x = Math.sin(this.animTimer * 6.0) * 0.45 + 0.3;
      mainHead.neckRoot.rotation.y = Math.sin(this.animTimer * 4.0) * 0.35;
    }
  }

  /**
   * 0.5s Telegraph ve Element Saldırıları
   */
  private updateAttacks(
    deltaTime: number,
    playerPos: Vector3,
    playerCombat: CombatSystem,
    distToPlayer: number
  ): void {
    if (this.isTelegraphActive) {
      this.telegraphTimer -= deltaTime;
      const pulse = 1.0 + Math.sin(this.telegraphTimer * 20.0) * 0.2;
      this.telegraphRing.scaling.set(pulse, 1.0, pulse);

      if (this.telegraphTimer <= 0) {
        this.isTelegraphActive = false;
        this.telegraphRing.setEnabled(false);

        // Darbe anı
        const distToTelegraph = Vector3.Distance(playerPos, this.telegraphTargetPos);
        if (distToTelegraph < 6.5) {
          const dmg = this.phase === 'FINAL_HEAD_RAGE' ? 48.0 : 32.0;
          playerCombat.health = Math.max(0, playerCombat.health - dmg);
          playerCombat.addCameraTrauma(0.75);
          ProceduralAudio.playImpact(true);
          ProceduralAudio.playWaterSplash();
          EventBus.emit('ui:loot_toast', { text: '💥 Yelbegen ezici darbe indirdi!' });
        }
      }
      return;
    }

    this.attackTimer += deltaTime;
    if (this.attackTimer >= this.attackCooldown) {
      this.attackTimer = 0.0;
      this.attackCooldown = this.phase === 'FINAL_HEAD_RAGE' ? 1.5 : 2.5;

      // 0.5s Telegraph Başlat
      this.isTelegraphActive = true;
      this.telegraphTimer = 0.50;
      this.telegraphTargetPos.copyFrom(playerPos);
      this.telegraphRing.position.copyFrom(playerPos);
      this.telegraphRing.position.y = -11.8;
      this.telegraphRing.setEnabled(true);

      ProceduralAudio.playButtonClick();
      ProceduralAudio.playYelbegenRoar();
    }
  }

  /**
   * Oyuncu Bir Başa Hasar Verdiğinde (Yakın Dövüş veya Ok)
   */
  public takeDamageToHead(headIndex: number, amount: number, isFireDamage = false): number {
    if (this.isDead) return 0;
    if (headIndex < 0 || headIndex >= this.heads.length) return 0;

    const h = this.heads[headIndex];

    // Dağlama Kontrolü: Eğer baş zaten kopmuşsa ve ATEŞ hasarı alırsa dağlanır!
    if (h.isSevered) {
      if (!h.isCauterized && isFireDamage) {
        this.cauterizeStump(h);
        return amount;
      }
      return 0; // Kopmuş başa ateş harici hasar işlemez
    }

    // 7. Baş (Ulu Kara Baş), 6 baş dağlanmadan hasar almaz (kalkanlıdır)
    if (headIndex === 6 && this.phase !== 'FINAL_HEAD_RAGE') {
      ProceduralAudio.playShieldBlock();
      EventBus.emit('ui:loot_toast', { text: '🛡️ Ulu Kara Baş koruma altında! Önce 6 element başını kes ve dağla!' });
      return 0;
    }

    h.health = Math.max(0, h.health - amount);
    this.calculateTotalHealth();

    ProceduralAudio.playImpact(false);

    if (h.health <= 0) {
      if (headIndex === 6) {
        this.die();
      } else {
        this.severHead(h);
      }
    }

    return amount;
  }

  /**
   * Genel Gövde Hasarı (En yakın canlı başa yönlendirilir)
   */
  public takeDamage(amount: number, isFireDamage = false): number {
    if (this.isDead) return 0;

    // En yakın açık/canlı başı bul
    const activeHead = this.phase === 'FINAL_HEAD_RAGE'
      ? this.heads[6]
      : this.heads.find((h) => !h.isSevered);

    if (activeHead) {
      return this.takeDamageToHead(activeHead.index, amount, isFireDamage);
    }

    // Eğer tüm 6 baş kopmuş ama dağlanmamışsa
    const severedStump = this.heads.find((h) => h.isSevered && !h.isCauterized);
    if (severedStump && isFireDamage) {
      this.cauterizeStump(severedStump);
      return amount;
    }

    return 0;
  }

  /**
   * Başın Kesilmesi Mekaniği
   */
  private severHead(head: YelbegenHead): void {
    head.isSevered = true;
    head.regrowthTimer = 30.0; // 30 sn yeniden büyüme süresi
    head.headMesh.setEnabled(false);

    ProceduralAudio.playHeadSevered();
    EventBus.emit('ui:loot_toast', {
      text: `⚔️ ${head.nameTr} KESİLDİ! 30 sn içinde ATEŞLE DAĞLA yoksa yeniden uzayacak!`
    });
  }

  /**
   * Kesilen Boynun Ateşle Dağlanması (Yeniden uzamayı kalıcı olarak durdurur)
   */
  private cauterizeStump(head: YelbegenHead): void {
    head.isCauterized = true;
    head.regrowthTimer = 99999;

    // Dağlanmış boyun kökünü karart ve kıvılcım tınısı çal
    head.matGlow.diffuseColor = new Color3(0.08, 0.08, 0.08);
    head.matGlow.emissiveColor = new Color3(0.3, 0.05, 0.0);

    ProceduralAudio.playCauterizeSizzle();
    ProceduralAudio.playFlameIgnition();

    const cauterizedCount = this.heads.filter((h) => h.index < 6 && h.isCauterized).length;
    EventBus.emit('ui:loot_toast', {
      text: `🔥 ${head.nameTr} ATEŞLE DAĞLANDI! Mühürlendi (${cauterizedCount}/6)`
    });
  }

  /**
   * 30 sn içinde dağlanmayan başın yeniden uzaması
   */
  private regrowHead(head: YelbegenHead): void {
    head.isSevered = false;
    head.health = head.maxHealth;
    head.headMesh.setEnabled(true);

    ProceduralAudio.playWaterSplash();
    ProceduralAudio.playRoar();
    EventBus.emit('ui:loot_toast', {
      text: `⚠️ ${head.nameTr} YENİDEN UZADI! Zamanında dağlayamadın!`
    });

    this.calculateTotalHealth();
  }

  /**
   * 6 Element Baş Dağlandığında 7. Baş (Ulu Kara Baş) Öfke Fazına Geçer
   */
  private enterFinalRagePhase(): void {
    this.phase = 'FINAL_HEAD_RAGE';
    const mainHead = this.heads[6];
    mainHead.matGlow.diffuseColor = new Color3(0.9, 0.15, 0.2);
    mainHead.matGlow.emissiveColor = new Color3(0.85, 0.1, 0.1);

    ProceduralAudio.playThunderBoom();
    ProceduralAudio.playYelbegenRoar();

    EventBus.emit('ui:dialogue_show', {
      speaker: 'Yelbegen',
      text: '🌊 TSUNAMİ ÖFKESİ! Suların kadim efendisi karşısında hiçbir ölümlü duramaz!'
    });
    EventBus.emit('ui:loot_toast', {
      text: '⚠️ ULU KARA BAŞ ÖFKEYLE UYANDI! Tsunami dalgalarından kaç ve son başı vur!'
    });
  }

  private calculateTotalHealth(): void {
    let total = 0;
    for (const h of this.heads) {
      if (!h.isSevered) total += h.health;
    }
    this.health = total;
  }

  /**
   * Yelbegen'in Yenilgisi ve SU KUTU Ödülü
   */
  private die(): void {
    this.isDead = true;
    this.phase = 'DEAD';
    this.health = 0;

    // Tüm başları ve boyunları eğ
    this.heads.forEach((h) => {
      h.neckRoot.rotation.x = 1.2;
      h.headMesh.setEnabled(false);
    });

    this.bodyMesh.position.y -= 2.5;
    this.telegraphRing.setEnabled(false);

    ProceduralAudio.playBossDefeatStinger();
    ProceduralAudio.playWaterSplash();

    // KUTSAL SU KUTU RELİKİNİ SPAWN ET
    this.spawnSuKutu();

    EventBus.emit('combat:boss_defeat');
    EventBus.emit('world:yelbegen_defeated');
    EventBus.emit('world:sahmaran_purified');
    EventBus.emit('world:bay_terek_healed', { stage: 3 });
    EventBus.emit('achievement:unlock', { id: 'ach_yelbegen_defeated' });

    EventBus.emit('ui:loot_toast', {
      text: '🏆 7 BAŞLI YELBEGEN DEVRİLDİ! Kutsal SU KUTU açığa çıktı!'
    });
  }

  private spawnSuKutu(): void {
    const suKutuPos = this.position.clone();
    suKutuPos.y += 3.5;

    const suKutu = MeshBuilder.CreatePolyhedron('su_kutu_relic', { type: 2, size: 1.2 }, this.scene);
    suKutu.position.copyFrom(suKutuPos);

    const mat = new StandardMaterial('mat_su_kutu_relic', this.scene);
    mat.diffuseColor = new Color3(0.2, 0.85, 0.95);
    mat.emissiveColor = new Color3(0.15, 0.7, 0.9);
    suKutu.material = mat;
  }

  public dispose(): void {
    this.root.dispose();
  }
}
