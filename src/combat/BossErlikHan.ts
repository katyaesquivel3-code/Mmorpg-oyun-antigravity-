/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * BÜYÜK FİNAL BOSS: ERLİK HAN (BossErlikHan)
 * (Yeraltı ve Ölüm Hakanı, 3 Fazlı Savaş:
 *  Faz 1: Gölge Kopyalar & Kemik Mızrakları,
 *  Faz 2: Üç Düzen / Üç Güç Zorunlu [Gölge Kalkanı: Ateş, Kara Girdap: Rüzgâr, Donmuş An: Kut Zamanı],
 *  Faz 3: Diz Çöküş & Kader Seçimi, 0.5s Telegraph & Sıfır GC)
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
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { CombatSystem } from './CombatSystem';

export type ErlikPhase = 'PHASE_1_SHADOWS' | 'PHASE_2_THREE_REGIMES' | 'PHASE_3_WEAKENED_CHOICE' | 'DEAD';

export type ErlikRegime = 'NONE' | 'SHADOW_SHIELD' | 'DARK_VORTEX' | 'FROZEN_TIME';

export interface ErlikShadowClone {
  mesh: Mesh;
  health: number;
  isDead: boolean;
}

export class BossErlikHan {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;

  // Boss Genel Durumu
  public phase: ErlikPhase = 'PHASE_1_SHADOWS';
  public currentRegime: ErlikRegime = 'NONE';
  public isDead = false;
  public isKneeling = false;
  public maxHealth = 1600;
  public health = 1600;

  // 3D Model Parçaları
  public bodyMesh: Mesh;
  public headMesh: Mesh;
  public hornsMesh: Mesh;
  public capeMesh: Mesh;
  public maceMesh: Mesh; // Kara Demir Gürz

  // Faz 1: Gölge Kopyalar (Shadow Clones)
  public shadowClones: ErlikShadowClone[] = [];

  // Faz 2 Kalkan ve Girdap Görselleri
  public shieldMesh: Mesh;
  public vortexMesh: Mesh;

  // Telegraph Halka Göstergesi (0.50 sn kuralı)
  private telegraphRing: Mesh;
  private matTelegraph: StandardMaterial;
  private isTelegraphActive = false;
  private telegraphTimer = 0.0;
  private telegraphTargetPos = new Vector3(0, 0, 0);

  // Zamanlayıcılar
  private attackTimer = 0.0;
  private attackCooldown = 2.4;
  private regimeTimer = 0.0;
  private animTimer = 0.0;

  // Materyaller
  private matDarkArmor: StandardMaterial;
  private matPaleSkin: StandardMaterial;
  private matHorn: StandardMaterial;
  private matShieldGlow: StandardMaterial;
  private matVortexDark: StandardMaterial;

  // Scratch Vektörleri (Zero GC)
  private scratchDir = new Vector3(0, 0, 0);

  constructor(
    arenaX = -300,
    arenaZ = 620,
    scene: Scene,
    shadowGen: ShadowGenerator | null = null
  ) {
    this.scene = scene;
    const arenaY = -83.0; // 9. Kat Taht Salonu zemin yüksekliği
    this.position = new Vector3(arenaX, arenaY, arenaZ);

    this.root = new TransformNode('boss_erlik_han_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= MATERYALLER =================
    this.matDarkArmor = new StandardMaterial('mat_erlik_armor', scene);
    this.matDarkArmor.diffuseColor = new Color3(0.06, 0.06, 0.1);
    this.matDarkArmor.specularColor = new Color3(0.2, 0.2, 0.3);
    this.matDarkArmor.freeze();

    this.matPaleSkin = new StandardMaterial('mat_erlik_flesh', scene);
    this.matPaleSkin.diffuseColor = new Color3(0.68, 0.72, 0.78); // Solgun yeraltı teni
    this.matPaleSkin.freeze();

    this.matHorn = new StandardMaterial('mat_erlik_horn', scene);
    this.matHorn.diffuseColor = new Color3(0.04, 0.04, 0.04);
    this.matHorn.specularColor = new Color3(0.4, 0.1, 0.1);
    this.matHorn.freeze();

    this.matShieldGlow = new StandardMaterial('mat_erlik_shadow_shield', scene);
    this.matShieldGlow.diffuseColor = new Color3(0.25, 0.05, 0.35);
    this.matShieldGlow.emissiveColor = new Color3(0.45, 0.05, 0.65);
    this.matShieldGlow.alpha = 0.75;

    this.matVortexDark = new StandardMaterial('mat_erlik_vortex', scene);
    this.matVortexDark.diffuseColor = new Color3(0.1, 0.1, 0.15);
    this.matVortexDark.emissiveColor = new Color3(0.2, 0.05, 0.25);
    this.matVortexDark.alpha = 0.65;

    // ================= 1. ERLİK HAN 3D HEYBETLİ GÖVDESİ =================
    // Ağır Kara Zırhlı Gövde
    this.bodyMesh = MeshBuilder.CreateBox('erlik_body', { width: 1.8, height: 2.8, depth: 1.2 }, scene);
    this.bodyMesh.position.set(0, 2.0, 0);
    this.bodyMesh.material = this.matDarkArmor;
    this.bodyMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.bodyMesh);

    // Baş & Çatık Kaşlı Yeraltı Miğferi
    this.headMesh = MeshBuilder.CreateBox('erlik_head', { width: 0.9, height: 1.0, depth: 0.9 }, scene);
    this.headMesh.position.set(0, 3.8, 0);
    this.headMesh.material = this.matPaleSkin;
    this.headMesh.parent = this.root;

    // Kara Boynuzlar
    this.hornsMesh = MeshBuilder.CreateTorus('erlik_horns', { diameter: 1.8, thickness: 0.35, tessellation: 8 }, scene);
    this.hornsMesh.position.set(0, 4.2, 0);
    this.hornsMesh.rotation.x = Math.PI * 0.35;
    this.hornsMesh.material = this.matHorn;
    this.hornsMesh.parent = this.root;

    // Kara Pelerin
    this.capeMesh = MeshBuilder.CreateBox('erlik_cape', { width: 2.2, height: 3.2, depth: 0.15 }, scene);
    this.capeMesh.position.set(0, 1.8, -0.65);
    this.capeMesh.material = this.matDarkArmor;
    this.capeMesh.parent = this.root;

    // Kara Demir Gürz
    this.maceMesh = MeshBuilder.CreateCylinder('erlik_mace', { diameterTop: 0.7, diameterBottom: 0.2, height: 3.2, tessellation: 8 }, scene);
    this.maceMesh.position.set(1.4, 2.2, 0.6);
    this.maceMesh.rotation.z = Math.PI * 0.15;
    this.maceMesh.material = this.matDarkArmor;
    this.maceMesh.parent = this.root;

    // ================= 2. FAZ 2 KALKAN VE GİRDAP =================
    this.shieldMesh = MeshBuilder.CreateSphere('erlik_shield', { diameter: 4.8 }, scene);
    this.shieldMesh.position.set(0, 2.4, 0);
    this.shieldMesh.material = this.matShieldGlow;
    this.shieldMesh.parent = this.root;
    this.shieldMesh.setEnabled(false);

    this.vortexMesh = MeshBuilder.CreateCylinder('erlik_vortex', { diameterTop: 16.0, diameterBottom: 2.0, height: 6.0 }, scene);
    this.vortexMesh.position.set(0, 3.0, 0);
    this.vortexMesh.material = this.matVortexDark;
    this.vortexMesh.parent = this.root;
    this.vortexMesh.setEnabled(false);

    // ================= 3. 0.5s YER HALKASI TELEGRAPH UYARISI =================
    this.matTelegraph = new StandardMaterial('mat_erlik_telegraph', scene);
    this.matTelegraph.diffuseColor = new Color3(0.85, 0.1, 0.1);
    this.matTelegraph.emissiveColor = new Color3(1.0, 0.2, 0.2);
    this.matTelegraph.alpha = 0.55;

    this.telegraphRing = MeshBuilder.CreateTorus('erlik_telegraph', { diameter: 9.5, thickness: 0.35, tessellation: 20 }, scene);
    this.telegraphRing.position.y = 0.2;
    this.telegraphRing.material = this.matTelegraph;
    this.telegraphRing.parent = this.root;
    this.telegraphRing.setEnabled(false);

    // Faz 1 Gölge Kopyaları Oluştur
    this.spawnShadowClones(scene);

    // Faz 2 Rejim Kırma Dinleyicisi
    EventBus.on('power:cast', (data) => {
      if (this.phase === 'PHASE_2_THREE_REGIMES') {
        this.breakRegime(data.power);
      }
    });
  }

  private spawnShadowClones(scene: Scene): void {
    const clonePositions = [new Vector3(-4.5, 0, 2.0), new Vector3(4.5, 0, 2.0)];
    clonePositions.forEach((pos, idx) => {
      const clone = MeshBuilder.CreateBox(`erlik_clone_${idx}`, { width: 1.5, height: 2.5, depth: 1.0 }, scene);
      clone.position.copyFrom(pos);
      clone.position.y = 1.8;
      clone.material = this.matDarkArmor;
      clone.parent = this.root;

      this.shadowClones.push({
        mesh: clone,
        health: 80,
        isDead: false
      });
    });
  }

  /**
   * Her Kare Erlik Han Dövüş Durum Makinesi
   */
  public update(deltaTime: number, playerPos: Vector3, playerCombat: CombatSystem): void {
    if (this.isDead) return;
    this.animTimer += deltaTime;

    const distToPlayer = Vector3.Distance(playerPos, this.root.position);

    // Yüzünü Oyuncuya Dön
    if (!this.isKneeling) {
      const targetHeading = Math.atan2(playerPos.x - this.root.position.x, playerPos.z - this.root.position.z);
      this.root.rotation.y = targetHeading;
    }

    // Faz Geçiş Kontrolleri
    if (this.health <= 1120 && this.phase === 'PHASE_1_SHADOWS') {
      this.enterPhase2();
    } else if (this.health <= 380 && this.phase === 'PHASE_2_THREE_REGIMES') {
      this.enterPhase3();
    }

    // Faz 1: Gölge Kopyalar ve Kemik Mızrakları
    if (this.phase === 'PHASE_1_SHADOWS') {
      this.updatePhase1(deltaTime, playerPos, playerCombat, distToPlayer);
    }
    // Faz 2: Üç Düzen / Üç Güç Zorunlu Mekaniği
    else if (this.phase === 'PHASE_2_THREE_REGIMES') {
      this.updatePhase2(deltaTime, playerPos, playerCombat, distToPlayer);
    }
    // Faz 3: Diz Çöküş ve Seçim Bekleme
    else if (this.phase === 'PHASE_3_WEAKENED_CHOICE') {
      this.updatePhase3(deltaTime);
    }
  }

  private updatePhase1(deltaTime: number, playerPos: Vector3, playerCombat: CombatSystem, distToPlayer: number): void {
    // 0.5s Telegraph Mantığı
    if (this.isTelegraphActive) {
      this.telegraphTimer -= deltaTime;
      const pulse = 1.0 + Math.sin(this.telegraphTimer * 20.0) * 0.18;
      this.telegraphRing.scaling.set(pulse, 1.0, pulse);

      if (this.telegraphTimer <= 0) {
        this.isTelegraphActive = false;
        this.telegraphRing.setEnabled(false);

        // Darbe Anı
        const distToHit = Vector3.Distance(playerPos, this.telegraphTargetPos);
        if (distToHit < 5.5) {
          playerCombat.health = Math.max(0, playerCombat.health - 34.0);
          playerCombat.addCameraTrauma(0.75);
          ProceduralAudio.playImpact(true);
          ProceduralAudio.playBoneSpear();
          EventBus.emit('ui:loot_toast', { text: '💥 Erlik Han kemik mızrakla vurdu!' });
        }
      }
      return;
    }

    this.attackTimer += deltaTime;
    if (this.attackTimer >= this.attackCooldown) {
      this.attackTimer = 0.0;
      this.isTelegraphActive = true;
      this.telegraphTimer = 0.50;
      this.telegraphTargetPos.copyFrom(playerPos);
      this.telegraphRing.position.copyFrom(playerPos);
      this.telegraphRing.position.y = -82.8;
      this.telegraphRing.setEnabled(true);

      ProceduralAudio.playButtonClick();
      ProceduralAudio.playBoneSpear();
    }
  }

  private enterPhase2(): void {
    this.phase = 'PHASE_2_THREE_REGIMES';
    this.currentRegime = 'SHADOW_SHIELD';
    this.shieldMesh.setEnabled(true);
    this.regimeTimer = 0.0;

    ProceduralAudio.playErlikRoar();
    EventBus.emit('ui:loot_toast', {
      text: '🛡️ ERLİK FAZ 2: GÖLGE KALKANI! Normal kılıç işlemez, ATEŞ GÜCÜYLE YAK!'
    });
  }

  private updatePhase2(deltaTime: number, playerPos: Vector3, playerCombat: CombatSystem, distToPlayer: number): void {
    this.regimeTimer += deltaTime;

    // Rejim Animasyonları
    if (this.currentRegime === 'SHADOW_SHIELD') {
      this.shieldMesh.rotation.y += deltaTime * 2.0;
    } else if (this.currentRegime === 'DARK_VORTEX') {
      this.vortexMesh.rotation.y += deltaTime * 4.0;
      // Oyuncuyu merkeze doğru çeker
      const toBoss = this.root.position.subtract(playerPos).normalize();
      playerPos.addInPlace(toBoss.scale(3.5 * deltaTime));
    } else if (this.currentRegime === 'FROZEN_TIME') {
      // Donmuş zaman nabzı
      this.bodyMesh.scaling.set(1.05 + Math.sin(this.animTimer * 10.0) * 0.05, 1.0, 1.05);
    }
  }

  /**
   * Faz 2 Rejimini Oyuncu Karşı Güçle Kırdığında:
   * 1. SHADOW_SHIELD -> ATEŞ ile kırılır
   * 2. DARK_VORTEX -> RÜZGÂR ile kırılır
   * 3. FROZEN_TIME -> KUT ZAMANI ile kırılır
   */
  public breakRegime(usedPower: 'FIRE' | 'WIND' | 'KUT_TIME'): boolean {
    if (this.phase !== 'PHASE_2_THREE_REGIMES') return false;

    if (this.currentRegime === 'SHADOW_SHIELD' && usedPower === 'FIRE') {
      this.shieldMesh.setEnabled(false);
      this.takeDamage(180);
      ProceduralAudio.playFlameIgnition();
      ProceduralAudio.playCrit();
      EventBus.emit('ui:loot_toast', { text: '🔥 Gölge Kalkanı eridi! Şimdi KARA GİRDAP geliyor (RÜZGÂR ile savur)!' });
      this.currentRegime = 'DARK_VORTEX';
      this.vortexMesh.setEnabled(true);
      return true;
    }

    if (this.currentRegime === 'DARK_VORTEX' && usedPower === 'WIND') {
      this.vortexMesh.setEnabled(false);
      this.takeDamage(180);
      ProceduralAudio.playWindGust();
      ProceduralAudio.playCrit();
      EventBus.emit('ui:loot_toast', { text: '🌪️ Kara Girdap dağıtıldı! DONMUŞ AN geliyor (KUT ZAMANI ile kır)!' });
      this.currentRegime = 'FROZEN_TIME';
      return true;
    }

    if (this.currentRegime === 'FROZEN_TIME' && usedPower === 'KUT_TIME') {
      this.takeDamage(220);
      ProceduralAudio.playTimeShatter();
      ProceduralAudio.playCrit();
      EventBus.emit('ui:loot_toast', { text: '⚡ Donmuş An paramparça oldu! Erlik ağır sersemledi!' });
      this.currentRegime = 'NONE';
      return true;
    }

    return false;
  }

  private enterPhase3(): void {
    this.phase = 'PHASE_3_WEAKENED_CHOICE';
    this.isKneeling = true;
    this.shieldMesh.setEnabled(false);
    this.vortexMesh.setEnabled(false);

    // Erlik Han diz çöker
    this.bodyMesh.position.y = 1.0;
    this.bodyMesh.rotation.x = Math.PI * 0.25;
    this.maceMesh.position.y = 0.5;

    ProceduralAudio.playKutAcquired();
    EventBus.emit('ui:loot_toast', {
      text: '👑 ERLİK HAN DİZ ÇÖKTÜ! Son seçimi yap: DENGE mi, YIKIM mı?'
    });
    EventBus.emit('dialogue:start', { startNodeId: 'erlik_final_choice' });
  }

  private updatePhase3(deltaTime: number): void {
    // Diz çökmüş durumda titreme
    this.headMesh.position.y = 2.4 + Math.sin(this.animTimer * 4.0) * 0.05;
  }

  /**
   * Hasar Alma Mekaniği
   */
  public takeDamage(amount: number, isFire = false): number {
    if (this.isDead || this.phase === 'PHASE_3_WEAKENED_CHOICE') return 0;

    // Faz 2'de Gölge Kalkanı açıkken ateş dışı hasar işlemez
    if (this.phase === 'PHASE_2_THREE_REGIMES' && this.currentRegime === 'SHADOW_SHIELD') {
      if (isFire) {
        this.breakRegime('FIRE');
        return amount;
      }
      ProceduralAudio.playShieldBlock();
      EventBus.emit('ui:loot_toast', { text: '🛡️ Gölge Kalkanı hasarı yuttu! ATEŞ GÜCÜ KULLAN!' });
      return 0;
    }

    this.health = Math.max(0, this.health - amount);
    ProceduralAudio.playImpact(false);
    return amount;
  }

  public dispose(): void {
    this.root.dispose();
  }
}
