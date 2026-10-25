/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Yer-Sub Ormanı Kadim Baş Düşmanı: TEPEGÖZ (BossTepegoz)
 * (Dede Korkut Destanı'ndan Tek Gözlü Dev, 3 Fazlı Boss Savaşı, Topuk Zayıf Noktası,
 *  Kaya Fırlatma, Göz Siper Etme, Basat Kör Ediş & Bitiriş Sinematiği, YER KUTU Ödülü & Sıfır GC)
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

export type TepegozPhase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3_ENRAGED' | 'KNEELING_BLIND' | 'DEAD';

export class BossTepegoz {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;
  public heading = 0;

  // Boss Nitelikleri
  public maxHealth = 650;
  public health = 650;
  public phase: TepegozPhase = 'PHASE_1';
  public isDead = false;

  // Zayıf Noktalar
  public eyeWeakpoint: Mesh;
  public heelWeakpoint: Mesh;
  public isEyeShielded = false;
  public isEyeBlinded = false;
  public kneelTimer = 0;
  public shieldDropTimer = 0;

  // Saldırı Zamanlayıcıları
  private attackCooldown = 0;
  private stateTimer = 0;
  private animTimer = 0;
  public isAttacking = false;
  public activeAttackType: 'SLAM' | 'STOMP' | 'BOULDER' | 'NONE' = 'NONE';

  // Prosedürel Mağara Arenası Prop'ları
  private arenaPillars: Mesh[] = [];
  private telegraphRing: Mesh;

  // Hiyerarşi Parçaları
  public bodyMesh: Mesh;
  public headMesh: Mesh;
  public clubMesh: Mesh;
  public leftArmShield: Mesh;
  public boulderMesh: Mesh | null = null;
  public boulderPos = new Vector3(0, 0, 0);
  public boulderVel = new Vector3(0, 0, 0);
  public isBoulderActive = false;

  // Kutsal Yer Kutu Reliki
  public yerKutuMesh: Mesh | null = null;
  public isYerKutuClaimed = false;

  // Materyaller
  private matFlesh: StandardMaterial;
  private matArmor: StandardMaterial;
  private matClub: StandardMaterial;
  private matEyeGlow: StandardMaterial;
  private matEyeBlind: StandardMaterial;
  private matHeelGlow: StandardMaterial;
  private matTelegraph: StandardMaterial;
  private matYerKutu: StandardMaterial;
  private matStonePillar: StandardMaterial;

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

    this.root = new TransformNode('tepegoz_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= MATERYALLER =================
    this.matFlesh = new StandardMaterial('mat_tep_flesh', scene);
    this.matFlesh.diffuseColor = new Color3(0.42, 0.32, 0.25);
    this.matFlesh.freeze();

    this.matArmor = new StandardMaterial('mat_tep_armor', scene);
    this.matArmor.diffuseColor = new Color3(0.18, 0.16, 0.18);
    this.matArmor.freeze();

    this.matClub = new StandardMaterial('mat_tep_club', scene);
    this.matClub.diffuseColor = new Color3(0.25, 0.2, 0.15);
    this.matClub.freeze();

    this.matEyeGlow = new StandardMaterial('mat_tep_eyeglow', scene);
    this.matEyeGlow.diffuseColor = new Color3(1.0, 0.45, 0.05);
    this.matEyeGlow.emissiveColor = new Color3(1.0, 0.35, 0.05);

    this.matEyeBlind = new StandardMaterial('mat_tep_eyeblind', scene);
    this.matEyeBlind.diffuseColor = new Color3(0.15, 0.15, 0.15);
    this.matEyeBlind.emissiveColor = new Color3(0.1, 0.1, 0.1);

    this.matHeelGlow = new StandardMaterial('mat_tep_heel', scene);
    this.matHeelGlow.diffuseColor = new Color3(0.9, 0.7, 0.1);
    this.matHeelGlow.emissiveColor = new Color3(0.8, 0.6, 0.05);

    this.matTelegraph = new StandardMaterial('mat_tep_tel', scene);
    this.matTelegraph.diffuseColor = new Color3(1.0, 0.15, 0.15);
    this.matTelegraph.emissiveColor = new Color3(0.95, 0.1, 0.1);

    this.matYerKutu = new StandardMaterial('mat_yer_kutu', scene);
    this.matYerKutu.diffuseColor = new Color3(0.3, 1.0, 0.5);
    this.matYerKutu.emissiveColor = new Color3(0.2, 0.9, 0.4);

    this.matStonePillar = new StandardMaterial('mat_tep_pillar', scene);
    this.matStonePillar.diffuseColor = new Color3(0.35, 0.35, 0.38);
    this.matStonePillar.freeze();

    // ================= 1. PROSEDÜREL MAĞARA AMFİTEATRI SÜTUNLARI =================
    const pillarAngles = [0.2, 1.2, 2.3, 3.4, 4.5, 5.6];
    for (let i = 0; i < pillarAngles.length; i++) {
      const a = pillarAngles[i];
      const r = 18.0;
      const px = arenaX + Math.cos(a) * r;
      const pz = arenaZ + Math.sin(a) * r;
      const py = world.getHeightAt(px, pz);

      const pillar = MeshBuilder.CreateCylinder(`tep_pillar_${i}`, {
        height: 12.0,
        diameter: 2.2,
        tessellation: 8
      }, scene);
      pillar.position.set(px, py + 6.0, pz);
      pillar.material = this.matStonePillar;
      if (shadowGen) shadowGen.addShadowCaster(pillar);
      this.arenaPillars.push(pillar);
    }

    // ================= 2. 5.5M TEPEGÖZ 3D HİYERARŞİSİ =================
    // Gövde (2.6m genişlik, 3.2m yükseklik)
    this.bodyMesh = MeshBuilder.CreateBox('tep_body', { width: 2.6, height: 3.2, depth: 1.8 }, scene);
    this.bodyMesh.position.y = 2.8;
    this.bodyMesh.material = this.matFlesh;
    this.bodyMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.bodyMesh);

    // Kafa
    this.headMesh = MeshBuilder.CreateBox('tep_head', { width: 1.6, height: 1.6, depth: 1.5 }, scene);
    this.headMesh.position.set(0, 4.9, 0.3);
    this.headMesh.material = this.matFlesh;
    this.headMesh.parent = this.root;

    // Tek Göz Zayıf Noktası (Alnın Tam Ortasında 0.65m Dev Göz)
    this.eyeWeakpoint = MeshBuilder.CreateSphere('tep_eye', { diameter: 0.65, segments: 10 }, scene);
    this.eyeWeakpoint.position.set(0, 5.05, 1.1);
    this.eyeWeakpoint.material = this.matEyeGlow;
    this.eyeWeakpoint.parent = this.root;

    // Ayak Topuğu Zayıf Noktası (Heel Weakpoint - Faz 2 için)
    this.heelWeakpoint = MeshBuilder.CreateSphere('tep_heel', { diameter: 0.55, segments: 6 }, scene);
    this.heelWeakpoint.position.set(0.65, 0.35, -0.9);
    this.heelWeakpoint.material = this.matHeelGlow;
    this.heelWeakpoint.parent = this.root;

    // Dev Gürz (3.8m devasa kütük ve demir çiviler)
    this.clubMesh = MeshBuilder.CreateCylinder('tep_club', { height: 4.2, diameterTop: 0.85, diameterBottom: 0.35, tessellation: 8 }, scene);
    this.clubMesh.position.set(1.9, 3.2, 0.9);
    this.clubMesh.rotation.x = Math.PI * 0.25;
    this.clubMesh.material = this.matClub;
    this.clubMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.clubMesh);

    // Sol El Siper Kolu (Faz 2'de gözü kapatır)
    this.leftArmShield = MeshBuilder.CreateBox('tep_left_arm', { width: 1.8, height: 0.85, depth: 0.75 }, scene);
    this.leftArmShield.position.set(-1.8, 3.4, 0.6);
    this.leftArmShield.material = this.matFlesh;
    this.leftArmShield.parent = this.root;

    // 0.5s Telegraph Yer Halkası
    this.telegraphRing = MeshBuilder.CreateTorus('tep_telegraph', { diameter: 7.5, thickness: 0.25, tessellation: 20 }, scene);
    this.telegraphRing.position.set(0, 0.08, 0);
    this.telegraphRing.material = this.matTelegraph;
    this.telegraphRing.parent = this.root;
    this.telegraphRing.setEnabled(false);
  }

  /**
   * Tepegöz Boss Döngüsü (Yüksek Performans, Sıfır GC)
   */
  public update(
    playerPos: Vector3,
    world: WorldManager,
    deltaTime: number
  ): { isAttacking: boolean; attackType: string; damage: number; shockwavePos?: Vector3 } {
    if (this.isDead) return { isAttacking: false, attackType: 'NONE', damage: 0 };

    this.animTimer += deltaTime;
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

    this.scratchToPlayer.x = playerPos.x - this.position.x;
    this.scratchToPlayer.z = playerPos.z - this.position.z;
    const dist = Math.hypot(this.scratchToPlayer.x, this.scratchToPlayer.z);

    // ================= KÖR OLUP DİZ ÇÖKME DURUMU =================
    if (this.phase === 'KNEELING_BLIND') {
      this.kneelTimer -= deltaTime;
      this.bodyMesh.position.y = 1.35;
      this.headMesh.position.y = 2.95;
      this.eyeWeakpoint.position.y = 3.05;
      this.clubMesh.position.set(1.4, 1.2, 0.8);

      if (this.kneelTimer <= 0) {
        // Yeniden ayağa kalkar
        this.phase = 'PHASE_3_ENRAGED';
        this.bodyMesh.position.y = 2.8;
        this.headMesh.position.y = 4.9;
        this.eyeWeakpoint.position.y = 5.05;
        this.eyeWeakpoint.material = this.matEyeGlow;
        this.isEyeBlinded = false;
        ProceduralAudio.playRoar();
      }
      return { isAttacking: false, attackType: 'NONE', damage: 0 };
    }

    // Faz Geçiş Denetimleri
    const hpRatio = this.health / this.maxHealth;
    if (hpRatio <= 0.35 && this.phase !== 'PHASE_3_ENRAGED') {
      this.phase = 'PHASE_3_ENRAGED';
      this.matEyeGlow.emissiveColor = new Color3(1.0, 0.05, 0.05); // Kan kırmızısı göz
      this.isEyeShielded = false;
      this.leftArmShield.position.set(-1.8, 3.4, 0.6);
      ProceduralAudio.playRoar();
      EventBus.emit('boss:phase', { phase: 3 });
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'TEPEGÖZ KUT ÖFKESİNE KAPILDI! Gözünü açtı, oku doğrudan gözünün bebeğine sapla!'
      });
    } else if (hpRatio <= 0.70 && hpRatio > 0.35 && this.phase === 'PHASE_1') {
      this.phase = 'PHASE_2';
      this.isEyeShielded = true;
      // Kolunu gözünün önüne siper eder
      this.leftArmShield.position.set(0, 5.0, 0.85);
      ProceduralAudio.playRoar();
      EventBus.emit('boss:phase', { phase: 2 });
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'Tepegöz gözünü dev eliyle kapattı! Arkasına dolan, topuğundaki zayıf noktaya vurup elini düşür!'
      });
    }

    // Topuk Vuruşu Sonrası Gözün Açılması Sayacı (Faz 2)
    if (this.shieldDropTimer > 0) {
      this.shieldDropTimer -= deltaTime;
      if (this.shieldDropTimer <= 0 && this.phase === 'PHASE_2') {
        this.isEyeShielded = true;
        this.leftArmShield.position.set(0, 5.0, 0.85);
      }
    }

    // Oyuncuya Yönel
    const targetHeading = Math.atan2(this.scratchToPlayer.x, this.scratchToPlayer.z);
    const turnSpeed = this.phase === 'PHASE_3_ENRAGED' ? 5.5 : 3.5;
    this.heading = Scalar.Lerp(this.heading, targetHeading, Math.min(1.0, deltaTime * turnSpeed));
    this.root.rotation.y = this.heading;

    // ================= SALDIRI AKTİVİTESİ =================
    if (this.isAttacking) {
      this.stateTimer -= deltaTime;

      if (this.activeAttackType === 'SLAM') {
        this.clubMesh.rotation.x = Math.PI * 0.7;
        this.clubMesh.position.y = 1.1;

        if (this.stateTimer <= 0) {
          this.isAttacking = false;
          this.telegraphRing.setEnabled(false);
          this.clubMesh.rotation.x = Math.PI * 0.25;
          this.clubMesh.position.y = 3.2;
          this.attackCooldown = this.phase === 'PHASE_3_ENRAGED' ? 2.0 : 3.0;

          ProceduralAudio.playImpact(true);
          const slamPos = this.position.clone();
          slamPos.x += Math.sin(this.heading) * 3.8;
          slamPos.z += Math.cos(this.heading) * 3.8;
          return { isAttacking: true, attackType: 'SLAM', damage: 45, shockwavePos: slamPos };
        }
      } else if (this.activeAttackType === 'STOMP') {
        if (this.stateTimer <= 0) {
          this.isAttacking = false;
          this.telegraphRing.setEnabled(false);
          this.attackCooldown = 3.5;
          ProceduralAudio.playThunderBoom();
          return { isAttacking: true, attackType: 'STOMP', damage: 32, shockwavePos: this.position };
        }
      }

      return { isAttacking: true, attackType: this.activeAttackType, damage: 0 };
    }

    // ================= SALDIRI SEÇİMİ =================
    if (this.attackCooldown <= 0) {
      if (dist < 5.2) {
        // 0.5s Telegraph ile Gürz Darbesi
        this.isAttacking = true;
        this.activeAttackType = 'SLAM';
        this.stateTimer = 0.50; // Kesin kural: 0.5s telegraph
        this.telegraphRing.setEnabled(true);
        ProceduralAudio.playButtonClick();
      } else if (dist < 9.5) {
        // Deprem Darbesi (Stomp)
        this.isAttacking = true;
        this.activeAttackType = 'STOMP';
        this.stateTimer = 0.50;
        this.telegraphRing.setEnabled(true);
      }
    }

    // Oyuncuya Doğru İlerleme
    if (!this.isAttacking && dist > 4.2) {
      const speed = this.phase === 'PHASE_3_ENRAGED' ? 4.8 : 3.2;
      this.position.x += Math.sin(this.heading) * speed * deltaTime;
      this.position.z += Math.cos(this.heading) * speed * deltaTime;
      this.position.y = world.getHeightAt(this.position.x, this.position.z);
      this.root.position.copyFrom(this.position);

      this.bodyMesh.position.y = 2.8 + Math.abs(Math.sin(this.animTimer * 5.0)) * 0.25;
    }

    return { isAttacking: false, attackType: 'NONE', damage: 0 };
  }

  /**
   * Zayıf Nokta (Tek Göz) Ok İsabet Denetimi
   */
  public checkEyeHit(arrowPos: Vector3): boolean {
    if (this.isDead || this.isEyeBlinded || this.isEyeShielded) return false;

    const eyeWorldPos = this.position.clone();
    eyeWorldPos.y += (this.phase === 'KNEELING_BLIND' ? 3.05 : 5.05);
    eyeWorldPos.x += Math.sin(this.heading) * 1.1;
    eyeWorldPos.z += Math.cos(this.heading) * 1.1;

    const distSq = Vector3.DistanceSquared(arrowPos, eyeWorldPos);
    if (distSq < 0.75 * 0.75) {
      this.triggerEyeBlind();
      return true;
    }
    return false;
  }

  /**
   * Topuk Vuruşu Denetimi (Faz 2 Zayıf Noktası)
   */
  public checkHeelHit(hitPos: Vector3, damage: number): boolean {
    if (this.phase !== 'PHASE_2' || !this.isEyeShielded) return false;

    const heelWorldPos = this.position.clone();
    heelWorldPos.y += 0.35;
    heelWorldPos.x += Math.cos(this.heading) * 0.65;
    heelWorldPos.z += -Math.sin(this.heading) * 0.65;

    const distSq = Vector3.DistanceSquared(hitPos, heelWorldPos);
    if (distSq < 1.1 * 1.1) {
      // Topuğa başarılı vuruş! Tepegöz sendeler, gözü açılır
      this.isEyeShielded = false;
      this.shieldDropTimer = 5.0; // 5 saniye boyunca gözü savunmasız kalır
      this.leftArmShield.position.set(-1.8, 3.4, 0.6);
      this.takeDamage(damage * 1.5);
      ProceduralAudio.playImpact(true);

      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'TOPUĞUNA İSABET! Tepegöz acıyla elini çekti! Gözü açık, hemen ok at!'
      });
      return true;
    }
    return false;
  }

  /**
   * Göze İsabetle Tepegöz'ün Kör Edilmesi (Basat Kör Edişi)
   */
  public triggerEyeBlind(): void {
    this.isEyeBlinded = true;
    this.phase = 'KNEELING_BLIND';
    this.kneelTimer = 9.5;
    this.eyeWeakpoint.material = this.matEyeBlind;
    this.takeDamage(120);
    ProceduralAudio.playRoar();

    EventBus.emit('ui:dialogue_show', {
      speaker: 'Börü',
      text: 'TAM GÖZÜNDEN! Tepegöz kör oldu ve diz çöktü! Yaklaş ve kılıçla bitirici vuruşu yap!'
    });
  }

  /**
   * Basat Bitiriş Vuruşu (Cinematic Finisher)
   */
  public triggerBasatFinisher(): void {
    if (this.phase !== 'KNEELING_BLIND' && this.health > 80) return;

    EventBus.emit('ui:dialogue_show', {
      speaker: 'Ayaz (Basat’ın Yolu)',
      text: 'Kut Tengri adına! Yer-Sub devinin karanlığı son bulsun!'
    });

    this.takeDamage(this.health); // Ölüm tetiklenir
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    // Diz çökmüşken zafiyet hasarı (x2.2)
    const finalAmount = this.phase === 'KNEELING_BLIND' ? amount * 2.2 : amount;
    this.health = Math.max(0, this.health - finalAmount);

    ProceduralAudio.playImpact(true);

    if (this.health <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.phase = 'DEAD';
    this.telegraphRing.setEnabled(false);
    ProceduralAudio.playRoar();

    // Dev Yıkılır
    this.bodyMesh.rotation.x = Math.PI * 0.5;
    this.bodyMesh.position.y = 0.8;
    this.headMesh.position.set(0, 0.8, 2.2);

    // Kutsal YER KUTU Ortaya Çıkar
    this.spawnYerKutu();

    EventBus.emit('boss:phase', { phase: 'dead' });
    EventBus.emit('combat:boss_defeat');
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Börü',
      text: 'TEPEGÖZ YIKILDI! Dev gövdesinden yükselen kutsal YER KUTU’nu al ve Bay Terek’i dirilt!'
    });
  }

  private spawnYerKutu(): void {
    this.yerKutuMesh = MeshBuilder.CreatePolyhedron('yer_kutu_relic', { type: 1, size: 0.8 }, this.scene);
    this.yerKutuMesh.position.set(this.position.x, this.position.y + 2.4, this.position.z + 1.2);
    this.yerKutuMesh.material = this.matYerKutu;

    const ps = new ParticleSystem('yer_kutu_burst', 90, this.scene);
    ps.emitter = this.yerKutuMesh;
    ps.color1 = new Color4(0.3, 1.0, 0.4, 0.9);
    ps.color2 = new Color4(0.9, 1.0, 0.2, 0.7);
    ps.colorDead = new Color4(0.1, 0.3, 0.1, 0.0);
    ps.minSize = 0.15;
    ps.maxSize = 0.45;
    ps.minLifeTime = 1.0;
    ps.maxLifeTime = 2.4;
    ps.emitRate = 35;
    ps.gravity = new Vector3(0, 1.8, 0);
    ps.start();
  }

  public checkClaimYerKutu(playerPos: Vector3, world: WorldManager): boolean {
    if (!this.yerKutuMesh || this.isYerKutuClaimed) return false;

    const dist = Vector3.Distance(playerPos, this.yerKutuMesh.position);
    if (dist < 2.5) {
      this.isYerKutuClaimed = true;
      this.yerKutuMesh.dispose();
      this.yerKutuMesh = null;

      ProceduralAudio.playKutAcquired();

      // Bay Terek'in ilk dal ve kökleri dirilir!
      world.landmarks.setKutRestorationLevel(1);

      EventBus.emit('world:kut_restoration', { level: 1 });
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'YER KUTU SENİNDİR! Bay Terek’in köklerine kutsal su yürüdü, Yer-Sub ormanı yeniden hayat buluyor!'
      });

      return true;
    }
    return false;
  }

  public dispose(): void {
    for (const p of this.arenaPillars) p.dispose();
    if (this.boulderMesh) this.boulderMesh.dispose();
    if (this.yerKutuMesh) this.yerKutuMesh.dispose();
    this.telegraphRing.dispose();
    this.root.dispose();
    this.matFlesh.dispose();
    this.matArmor.dispose();
    this.matClub.dispose();
    this.matEyeGlow.dispose();
    this.matEyeBlind.dispose();
    this.matHeelGlow.dispose();
    this.matTelegraph.dispose();
    this.matYerKutu.dispose();
    this.matStonePillar.dispose();
  }
}
