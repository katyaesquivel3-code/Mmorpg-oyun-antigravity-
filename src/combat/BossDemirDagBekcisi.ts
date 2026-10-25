/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Ergenekon Vadisi Baş Düşmanı: DEMİR DAĞ BEKÇİSİ (BossDemirDagBekcisi)
 * (Erlik Han'ın Demirci Devi, 3 Fazlı Boss Savaşı: Çekiç Şok Dalgası, Kıvılcım Yağmuru,
 *  Su Kanalı Zincirlerini Kırma & Termal Şok Zırh Çatlatma, Akkor Öfke Fazı, ATEŞ KUTU Ödülü & Sıfır GC)
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
  Color4,
  Scalar
} from '@babylonjs/core';
import { WorldManager } from '../world/WorldManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { KamPowerManager } from '../powers/KamPowerManager';
import { CombatSystem } from './CombatSystem';

export type DemirDagBossPhase = 'PHASE_1' | 'PHASE_2_MOLTEN_ARMOR' | 'PHASE_3_ENRAGED' | 'STAGGERED' | 'DEAD';

export interface CoolingChannelChain {
  id: string;
  position: Vector3;
  mesh: Mesh;
  isBroken: boolean;
}

export class BossDemirDagBekcisi {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;
  public heading = 0;

  // Boss Nitelikleri
  public maxHealth = 850;
  public health = 850;
  public phase: DemirDagBossPhase = 'PHASE_1';
  public isDead = false;

  // Faz 2: Akkor Kor Zırh & Su Kanalı Zincirleri
  public isMoltenArmorActive = false;
  public coolingChains: CoolingChannelChain[] = [];
  public staggerTimer = 0.0;

  // Saldırı Zamanlayıcıları
  private attackCooldown = 0.0;
  private stateTimer = 0.0;
  private animTimer = 0.0;
  public isAttacking = false;
  public activeAttackType: 'SLAM' | 'SWEEP' | 'SPARK_STORM' | 'LAVA_BREATH' | 'NONE' = 'NONE';

  // Telegraph ve Zemin Halka Göstergesi
  private telegraphRing: Mesh;
  private matTelegraph: StandardMaterial;

  // 3D Parçalar (MeshBuilder)
  public bodyMesh: Mesh;
  public headMesh: Mesh;
  public hammerMesh: Mesh;
  public hornLeft: Mesh;
  public hornRight: Mesh;
  public anvilBelt: Mesh;

  // Kıvılcım & Lav Yağmuru Parçacıkları
  private sparkStormParticles: ParticleSystem;
  private moltenArmorParticles: ParticleSystem;

  // Kutsal ATEŞ KUTU Reliki
  public atesKutuMesh: Mesh | null = null;
  public isAtesKutuClaimed = false;

  // Materyaller
  private matFlesh: StandardMaterial;
  private matArmor: StandardMaterial;
  private matMoltenCore: StandardMaterial;
  private matHammer: StandardMaterial;
  private matChain: StandardMaterial;
  private matAtesKutu: StandardMaterial;

  // Sıcak döngü scratch nesneleri (Zero GC)
  private scratchToPlayer = new Vector3(0, 0, 0);

  constructor(
    arenaX: number,
    arenaZ: number,
    scene: Scene,
    world: WorldManager,
    shadowGen: ShadowGenerator | null = null
  ) {
    this.scene = scene;
    const arenaY = world.getHeightAt(arenaX, arenaZ);
    this.position = new Vector3(arenaX, arenaY, arenaZ);

    this.root = new TransformNode('boss_demirdag_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= MATERYALLER =================
    this.matFlesh = new StandardMaterial('mat_boss_flesh', scene);
    this.matFlesh.diffuseColor = new Color3(0.28, 0.12, 0.08); // Yanık lav kabuğu ten
    this.matFlesh.freeze();

    this.matArmor = new StandardMaterial('mat_boss_armor', scene);
    this.matArmor.diffuseColor = new Color3(0.18, 0.18, 0.22); // Dökme demir plaka zırh
    this.matArmor.specularColor = new Color3(0.5, 0.5, 0.6);
    this.matArmor.freeze();

    this.matMoltenCore = new StandardMaterial('mat_boss_molten_core', scene);
    this.matMoltenCore.diffuseColor = new Color3(1.0, 0.35, 0.05);
    this.matMoltenCore.emissiveColor = new Color3(0.9, 0.25, 0.02);

    this.matHammer = new StandardMaterial('mat_boss_hammer', scene);
    this.matHammer.diffuseColor = new Color3(0.15, 0.15, 0.18);
    this.matHammer.specularColor = new Color3(0.7, 0.7, 0.8);
    this.matHammer.freeze();

    this.matChain = new StandardMaterial('mat_cooling_chain', scene);
    this.matChain.diffuseColor = new Color3(0.45, 0.5, 0.55);
    this.matChain.freeze();

    this.matTelegraph = new StandardMaterial('mat_boss_telegraph', scene);
    this.matTelegraph.diffuseColor = new Color3(1.0, 0.1, 0.1);
    this.matTelegraph.emissiveColor = new Color3(0.95, 0.05, 0.05);

    this.matAtesKutu = new StandardMaterial('mat_ates_kutu', scene);
    this.matAtesKutu.diffuseColor = new Color3(1.0, 0.55, 0.1);
    this.matAtesKutu.emissiveColor = new Color3(1.0, 0.45, 0.05);

    // ================= 3D BOSS HİYERARŞİSİ =================
    // 1. Gövde (Geniş volkanik dev gövdesi)
    this.bodyMesh = MeshBuilder.CreateCylinder(
      'boss_torso',
      { height: 3.2, diameterTop: 2.8, diameterBottom: 2.2, tessellation: 12 },
      scene
    );
    this.bodyMesh.position.y = 2.8;
    this.bodyMesh.material = this.matFlesh;
    this.bodyMesh.parent = this.root;

    // Göğüs Zırhı
    const chestPlate = MeshBuilder.CreateBox(
      'boss_chestplate',
      { width: 2.4, height: 1.8, depth: 1.2 },
      scene
    );
    chestPlate.position.set(0, 0.2, 0.6);
    chestPlate.material = this.matArmor;
    chestPlate.parent = this.bodyMesh;

    // 2. Baş & Boynuzlar
    this.headMesh = MeshBuilder.CreateBox('boss_head', { width: 1.2, height: 1.3, depth: 1.2 }, scene);
    this.headMesh.position.y = 2.2;
    this.headMesh.material = this.matFlesh;
    this.headMesh.parent = this.bodyMesh;

    // Demirci Devi Boynuzları
    this.hornLeft = MeshBuilder.CreateCylinder('boss_horn_l', { height: 1.2, diameterTop: 0.1, diameterBottom: 0.4 }, scene);
    this.hornLeft.position.set(-0.65, 0.7, 0.2);
    this.hornLeft.rotation.z = -0.55;
    this.hornLeft.material = this.matArmor;
    this.hornLeft.parent = this.headMesh;

    this.hornRight = MeshBuilder.CreateCylinder('boss_horn_r', { height: 1.2, diameterTop: 0.1, diameterBottom: 0.4 }, scene);
    this.hornRight.position.set(0.65, 0.7, 0.2);
    this.hornRight.rotation.z = 0.55;
    this.hornRight.material = this.matArmor;
    this.hornRight.parent = this.headMesh;

    // 3. Devasa Demirci Çekici
    this.hammerMesh = this.buildGiantHammer(scene);
    this.hammerMesh.parent = this.root;
    this.hammerMesh.position.set(2.2, 1.8, 0.8);

    // 4. Bel Örsü
    this.anvilBelt = MeshBuilder.CreateBox('boss_anvil_belt', { width: 1.2, height: 0.8, depth: 0.7 }, scene);
    this.anvilBelt.position.set(0, -1.2, 0.8);
    this.anvilBelt.material = this.matArmor;
    this.anvilBelt.parent = this.bodyMesh;

    // 5. Zemin Telegraph Halkası
    this.telegraphRing = MeshBuilder.CreateTorus(
      'boss_telegraph_ring',
      { diameter: 14.0, thickness: 0.35, tessellation: 24 },
      scene
    );
    this.telegraphRing.position.y = 0.12;
    this.telegraphRing.material = this.matTelegraph;
    this.telegraphRing.parent = this.root;
    this.telegraphRing.setEnabled(false);

    // 6. Parçacık Sistemleri
    this.sparkStormParticles = this.createSparkStormParticles(scene);
    this.moltenArmorParticles = this.createMoltenArmorParticles(scene);

    if (shadowGen) {
      shadowGen.addShadowCaster(this.bodyMesh);
      shadowGen.addShadowCaster(this.headMesh);
      shadowGen.addShadowCaster(this.hammerMesh);
    }

    // Arenadaki 2 Asılı Soğutma Kanalı Zinciri
    this.buildCoolingChains(arenaX, arenaY, arenaZ, shadowGen);
  }

  private buildGiantHammer(scene: Scene): Mesh {
    const handle = MeshBuilder.CreateCylinder(
      'hammer_handle',
      { height: 4.5, diameter: 0.3, tessellation: 8 },
      scene
    );
    handle.material = this.matHammer;

    const head = MeshBuilder.CreateBox(
      'hammer_head',
      { width: 1.6, height: 1.4, depth: 2.2 },
      scene
    );
    head.position.y = 2.0;
    head.material = this.matHammer;
    head.parent = handle;

    return handle;
  }

  /**
   * Arenadaki 2 Antik Soğutma Kanalı Zinciri (Termal Şok Mekaniği)
   */
  private buildCoolingChains(
    arenaX: number,
    arenaY: number,
    arenaZ: number,
    shadowGen: ShadowGenerator | null
  ): void {
    const chainConfigs = [
      { id: 'chain_left', pos: new Vector3(arenaX - 16.0, arenaY + 8.5, arenaZ - 10.0) },
      { id: 'chain_right', pos: new Vector3(arenaX + 16.0, arenaY + 8.5, arenaZ - 10.0) }
    ];

    chainConfigs.forEach((cfg) => {
      const chainMesh = MeshBuilder.CreateCylinder(
        `cooling_chain_${cfg.id}`,
        { height: 7.0, diameter: 0.4, tessellation: 6 },
        this.scene
      );
      chainMesh.position.copyFrom(cfg.pos);
      chainMesh.material = this.matChain;
      chainMesh.checkCollisions = true;

      if (shadowGen) shadowGen.addShadowCaster(chainMesh);

      this.coolingChains.push({
        id: cfg.id,
        position: cfg.pos,
        mesh: chainMesh,
        isBroken: false
      });
    });
  }

  private createSparkStormParticles(scene: Scene): ParticleSystem {
    const ps = new ParticleSystem('boss_spark_storm', 120, scene);
    ps.emitter = this.root.position;
    ps.minEmitBox = new Vector3(-12, 14, -12);
    ps.maxEmitBox = new Vector3(12, 16, 12);

    ps.color1 = new Color4(1.0, 0.9, 0.3, 0.95);
    ps.color2 = new Color4(1.0, 0.25, 0.05, 0.9);
    ps.colorDead = new Color4(0.2, 0.05, 0.05, 0.0);

    ps.minSize = 0.2;
    ps.maxSize = 0.6;
    ps.minLifeTime = 1.0;
    ps.maxLifeTime = 1.8;
    ps.emitRate = 45;
    ps.gravity = new Vector3(0, -18.0, 0); // Yüksek hızda yere düşen lav taşları
    ps.minEmitPower = 1.0;
    ps.maxEmitPower = 3.0;

    return ps;
  }

  private createMoltenArmorParticles(scene: Scene): ParticleSystem {
    const ps = new ParticleSystem('boss_molten_armor_sparks', 70, scene);
    ps.emitter = this.bodyMesh;
    ps.minEmitBox = new Vector3(-1.4, -1.0, -1.4);
    ps.maxEmitBox = new Vector3(1.4, 1.5, 1.4);

    ps.color1 = new Color4(1.0, 0.4, 0.05, 0.85);
    ps.color2 = new Color4(1.0, 0.85, 0.1, 0.7);
    ps.colorDead = new Color4(0.3, 0.1, 0.1, 0.0);

    ps.minSize = 0.15;
    ps.maxSize = 0.4;
    ps.minLifeTime = 0.6;
    ps.maxLifeTime = 1.2;
    ps.emitRate = 35;
    ps.gravity = new Vector3(0, 1.5, 0);

    return ps;
  }

  /**
   * Oyuncu Yay veya Kılıçla Soğutma Kanalı Zincirine Vurduğunda
   */
  public hitCoolingChain(hitPos: Vector3, radius = 3.2): boolean {
    if (this.phase !== 'PHASE_2_MOLTEN_ARMOR' || !this.isMoltenArmorActive) return false;

    let hitAny = false;
    for (const chain of this.coolingChains) {
      if (!chain.isBroken && Vector3.Distance(hitPos, chain.position) < radius) {
        chain.isBroken = true;
        chain.mesh.setEnabled(false);
        hitAny = true;
        ProceduralAudio.playShieldBlock(); // Metal kopma sesi
        EventBus.emit('ui:loot_toast', { text: '⛓️ Antik Su Kanalı Zinciri Kırıldı!' });
      }
    }

    // İki zincir de kırıldıysa dev su savakları açılır -> Termal Şok!
    if (this.coolingChains.every((c) => c.isBroken)) {
      this.triggerThermalShock();
    }

    return hitAny;
  }

  /**
   * Termal Şok: Soğuk su kızgın akkor zırhın üzerine dökülür, buhar patlar ve zırh çatlar!
   */
  private triggerThermalShock(): void {
    this.isMoltenArmorActive = false;
    this.moltenArmorParticles.stop();
    this.phase = 'STAGGERED';
    this.staggerTimer = 7.0; // 7 saniye sersemler ve %150 hasar alır

    this.bodyMesh.material = this.matFlesh; // Akkor ışıma söner
    ProceduralAudio.playWaterSplash();
    ProceduralAudio.playSteamHiss();

    EventBus.emit('ui:loot_toast', {
      text: '❄️ TERMAL ŞOK! Akkor zırh çatladı! Şimdi tüm gücünle saldır!'
    });
  }

  /**
   * Hasar Alma ve Faz Geçişleri
   */
  public takeDamage(amount: number, isCritical = false): number {
    if (this.isDead) return 0;

    let finalDamage = amount;

    // Faz 2'de Akkor Zırh aktifse hasar %90 engellenir
    if (this.isMoltenArmorActive) {
      finalDamage *= 0.1;
      ProceduralAudio.playShieldBlock();
      EventBus.emit('ui:loot_toast', {
        text: '🛡️ Akkor Zırh Hasarı Soğurdu! Su kanallarını aç!'
      });
    } else if (this.phase === 'STAGGERED') {
      finalDamage *= 1.5; // Termal şokta %150 hasar
      ProceduralAudio.playCrit();
    }

    this.health = Math.max(0, this.health - finalDamage);

    // Faz Geçiş Kontrolleri
    if (this.health <= 0) {
      this.die();
    } else if (this.health < 260 && this.phase !== 'PHASE_3_ENRAGED') {
      this.enterPhase3();
    } else if (this.health < 560 && this.phase === 'PHASE_1') {
      this.enterPhase2();
    }

    return finalDamage;
  }

  private enterPhase2(): void {
    this.phase = 'PHASE_2_MOLTEN_ARMOR';
    this.isMoltenArmorActive = true;
    this.bodyMesh.material = this.matMoltenCore;
    this.moltenArmorParticles.start();
    this.sparkStormParticles.start();

    ProceduralAudio.playFlameIgnition();
    ProceduralAudio.playThunderBoom();

    EventBus.emit('ui:loot_toast', {
      text: '⚠️ FAZ 2: DEMİR DAĞ BEKÇİSİ AKKORLAŞTI! Zincirleri kırıp su akıt!'
    });
  }

  private enterPhase3(): void {
    this.phase = 'PHASE_3_ENRAGED';
    this.isMoltenArmorActive = false;
    this.moltenArmorParticles.start();
    this.sparkStormParticles.start();

    this.bodyMesh.scaling.scaleInPlace(1.15);
    this.headMesh.scaling.scaleInPlace(1.15);
    this.hammerMesh.scaling.scaleInPlace(1.2);

    ProceduralAudio.playWolfHowl(); // Yırtıcı öfke kükremesi
    ProceduralAudio.playThunderBoom();

    EventBus.emit('ui:loot_toast', {
      text: '🔥 FAZ 3: KIZGIN ÖFKE! Ocak çöküyor, Bekçi durdurulamaz oldu!'
    });
  }

  private die(): void {
    this.isDead = true;
    this.phase = 'DEAD';
    this.sparkStormParticles.stop();
    this.moltenArmorParticles.stop();
    this.telegraphRing.setEnabled(false);

    // Yıkılış animasyonu: Yere diz çöküş
    this.root.position.y -= 1.8;
    this.bodyMesh.rotation.x = 0.85;

    ProceduralAudio.playBossDefeatStinger();
    ProceduralAudio.playThunderBoom();

    // ATEŞ KUTU RELİKİNİ YARAT
    this.spawnAtesKutu();

    EventBus.emit('combat:boss_defeat');
    EventBus.emit('world:ergenekon_restored');
    EventBus.emit('world:bay_terek_healed', { stage: 2 });
    EventBus.emit('ui:loot_toast', {
      text: '🏆 DEMİR DAĞ BEKÇİSİ ALT EDİLDİ! Kutsal Ateş Kutu açığa çıktı!'
    });
  }

  /**
   * Kutsal Ateş Kutu Relikini Magma Havuzu Ortasında Bahşet
   */
  private spawnAtesKutu(): void {
    const pos = this.position.clone();
    pos.y += 1.8;
    pos.z -= 3.5;

    this.atesKutuMesh = MeshBuilder.CreatePolyhedron(
      'ates_kutu_relic',
      { type: 3, size: 0.85 },
      this.scene
    );
    this.atesKutuMesh.position.copyFrom(pos);
    this.atesKutuMesh.material = this.matAtesKutu;

    // Altın-alev parçacık halesi
    const ps = new ParticleSystem('ates_kutu_halo', 60, this.scene);
    ps.emitter = this.atesKutuMesh;
    ps.minEmitBox = new Vector3(-0.4, -0.4, -0.4);
    ps.maxEmitBox = new Vector3(0.4, 0.4, 0.4);

    ps.color1 = new Color4(1.0, 0.85, 0.2, 0.95);
    ps.color2 = new Color4(1.0, 0.35, 0.05, 0.9);
    ps.colorDead = new Color4(0.2, 0.05, 0.0, 0.0);

    ps.minSize = 0.15;
    ps.maxSize = 0.4;
    ps.minLifeTime = 0.8;
    ps.maxLifeTime = 1.6;
    ps.emitRate = 25;
    ps.gravity = new Vector3(0, 1.2, 0);
    ps.start();
  }

  /**
   * Oyuncu Ateş Kutu'na Yaklaşıp Aldığında
   */
  public claimAtesKutu(): boolean {
    if (this.isAtesKutuClaimed || !this.atesKutuMesh) return false;

    this.isAtesKutuClaimed = true;
    this.atesKutuMesh.setEnabled(false);

    // KamPowerManager'a Ateş Kutu'nu ver
    const kamPower = KamPowerManager.getInstance(this.scene);
    kamPower.hasAtesKutu = true;

    ProceduralAudio.playKutAcquired();
    EventBus.emit('ui:loot_toast', {
      text: '✨ ATEŞ KUTU KAZANILDI! Bay Terek 2. ulu budağını yeşertti!'
    });

    return true;
  }

  /**
   * Her Kare AI & Saldırı Döngüsü (Sıfır GC)
   */
  public update(deltaTime: number, playerPos: Vector3, playerCombat: CombatSystem): void {
    if (this.isDead) {
      // Ateş Kutu havada yavaşça dönsün
      if (this.atesKutuMesh && !this.isAtesKutuClaimed) {
        this.atesKutuMesh.rotation.y += deltaTime * 1.5;
        this.atesKutuMesh.rotation.x += deltaTime * 0.8;

        if (Vector3.Distance(playerPos, this.atesKutuMesh.position) < 3.2) {
          this.claimAtesKutu();
        }
      }
      return;
    }

    this.animTimer += deltaTime;

    // Sersemleme Kontrolü
    if (this.phase === 'STAGGERED') {
      this.staggerTimer -= deltaTime;
      this.bodyMesh.rotation.z = Math.sin(this.animTimer * 12.0) * 0.15;
      if (this.staggerTimer <= 0) {
        this.phase = 'PHASE_2_MOLTEN_ARMOR';
        this.bodyMesh.rotation.z = 0;
      }
      return;
    }

    // Oyuncuya Yönelme
    this.scratchToPlayer.copyFrom(playerPos).subtractInPlace(this.position);
    this.scratchToPlayer.y = 0;
    const distToPlayer = this.scratchToPlayer.length();

    // Demir Dağ Kor Ocağı Emniyeti: Oyuncu arenadan uzaktaysa saldırı tetikleme
    if (distToPlayer > 45.0) return;

    if (distToPlayer > 0.01) {
      const targetHeading = Math.atan2(this.scratchToPlayer.x, this.scratchToPlayer.z);
      this.heading = Scalar.Lerp(this.heading, targetHeading, deltaTime * 2.5);
      this.root.rotation.y = this.heading;
    }

    // Saldırı Mantığı
    this.attackCooldown += deltaTime;
    const cooldownThreshold = this.phase === 'PHASE_3_ENRAGED' ? 2.2 : 3.5;

    if (this.attackCooldown >= cooldownThreshold && !this.isAttacking) {
      this.attackCooldown = 0.0;
      this.isAttacking = true;
      this.stateTimer = 0.0;

      // Saldırı Tipi Seçimi
      if (distToPlayer < 7.0) {
        this.activeAttackType = 'SLAM'; // Çekiç Yer Sarsıntısı
        this.telegraphRing.setEnabled(true);
        this.telegraphRing.scaling.setAll(0.3);
      } else if (distToPlayer < 14.0) {
        this.activeAttackType = 'SWEEP'; // Süpürme Darbesi
      } else {
        this.activeAttackType = 'SPARK_STORM'; // Kıvılcım Yağmuru
      }
    }

    if (this.isAttacking) {
      this.stateTimer += deltaTime;

      if (this.activeAttackType === 'SLAM') {
        // Çekiç yukarı kalkar ve telegraph genişler
        const progress = Math.min(1.0, this.stateTimer / 1.0);
        this.hammerMesh.rotation.x = -progress * 1.8;
        this.telegraphRing.scaling.setAll(0.3 + progress * 0.7);

        if (this.stateTimer >= 1.0) {
          // İNDİR!
          this.hammerMesh.rotation.x = 0.8;
          this.telegraphRing.setEnabled(false);
          this.isAttacking = false;

          ProceduralAudio.playThunderBoom();
          playerCombat.addCameraTrauma(0.85);

          // Yakındaki oyuncuya hasar (eğer havada değilse)
          if (distToPlayer < 9.0) {
            playerCombat.health = Math.max(0, playerCombat.health - 42.0);
            EventBus.emit('ui:loot_toast', { text: '💥 ÇEKİÇ ŞOK DALGASI! Üzerinden zıpla!' });
          }
        }
      } else if (this.activeAttackType === 'SWEEP') {
        this.hammerMesh.rotation.y = Math.sin(this.stateTimer * 4.0) * 1.8;
        if (this.stateTimer >= 0.8) {
          this.hammerMesh.rotation.y = 0;
          this.isAttacking = false;
          if (distToPlayer < 6.5) {
            playerCombat.health = Math.max(0, playerCombat.health - 32.0);
            ProceduralAudio.playImpact(false);
          }
        }
      } else if (this.activeAttackType === 'SPARK_STORM') {
        if (this.stateTimer >= 1.5) {
          this.isAttacking = false;
        }
      }
    }
  }

  public dispose(): void {
    this.root.dispose();
    this.sparkStormParticles.dispose();
    this.moltenArmorParticles.dispose();
    this.telegraphRing.dispose();
    this.coolingChains.forEach((c) => c.mesh.dispose());
  }
}
