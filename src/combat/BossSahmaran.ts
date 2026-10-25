/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Şahmaran Gölü Baş Düşmanı: ŞAHMARAN / KARA SU DEVİ (BossSahmaran)
 * (Yılanlar Şahı, 3 Fazlı Boss Savaşı: Kuyruk Kamçısı & Girdap,
 *  Zehir Kalkanı & 3 Kutsal Arıtıcı Pınarla Zehri Çökertme, Tsunami Öfkesi, SU KUTU Ödülü & Sıfır GC)
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
import { WorldManager } from '../world/WorldManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { KamPowerManager } from '../powers/KamPowerManager';
import { CombatSystem } from './CombatSystem';

export type SahmaranBossPhase = 'PHASE_1' | 'PHASE_2_VENOM_SHIELD' | 'PHASE_3_TSUNAMI' | 'STAGGERED' | 'DEAD';

export interface ArenaPurifierStone {
  id: string;
  position: Vector3;
  mesh: Mesh;
  isActivated: boolean;
}

export class BossSahmaran {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;

  // Nitelikler
  public readonly maxHealth = 900.0;
  public health = 900.0;
  public phase: SahmaranBossPhase = 'PHASE_1';
  public isDead = false;

  // Faz 2 Mekaniği: Zehir Kalkanı & 3 Arıtıcı Taş
  public isVenomShieldActive = false;
  public purifierStones: ArenaPurifierStone[] = [];
  public staggerTimer = 0.0;

  // Saldırı & Davranış Zamanlayıcıları
  private attackTimer = 0.0;
  private attackCooldown = 2.4;
  private currentHeading = 0.0;
  private animTimer = 0.0;

  // 3D Hiyerarşi Parçaları (Yılan Gövde Segmentleri)
  public headMesh: Mesh;
  public crownMesh: Mesh;
  public eyeGlowLeft: Mesh;
  public eyeGlowRight: Mesh;
  public bodySegments: Mesh[] = [];
  private tailMesh: Mesh;

  // Telegraph Halka Göstergesi
  private telegraphRing: Mesh;
  private isTelegraphActive = false;
  private telegraphTimer = 0.0;

  // Parçacık Sistemleri
  private venomParticles: ParticleSystem;
  private waterSplashes: ParticleSystem;

  // Kutsal SU KUTU Reliki
  public suKutuMesh: Mesh | null = null;
  public isSuKutuClaimed = false;

  // Materyaller
  private matScales: StandardMaterial;
  private matUnderbelly: StandardMaterial;
  private matVenomGlow: StandardMaterial;
  private matCrown: StandardMaterial;
  private matPurifierStone: StandardMaterial;
  private matPurifiedActive: StandardMaterial;

  // Sıcak döngü scratch nesneleri (Zero GC)
  private scratchDir = new Vector3(0, 0, 0);

  constructor(
    arenaX = -130,
    arenaZ = -45,
    scene: Scene,
    world: WorldManager,
    shadowGen: ShadowGenerator | null = null
  ) {
    this.scene = scene;
    const arenaY = -12.0; // Göl altı tapınak tabanı
    this.position = new Vector3(arenaX, arenaY, arenaZ);

    this.root = new TransformNode('boss_sahmaran_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= MATERYALLER =================
    this.matScales = new StandardMaterial('mat_sahmaran_scales', scene);
    this.matScales.diffuseColor = new Color3(0.08, 0.35, 0.28); // Koyu zümrüt yılan pulu
    this.matScales.specularColor = new Color3(0.3, 0.7, 0.5);
    this.matScales.freeze();

    this.matUnderbelly = new StandardMaterial('mat_sahmaran_belly', scene);
    this.matUnderbelly.diffuseColor = new Color3(0.72, 0.78, 0.65);
    this.matUnderbelly.freeze();

    this.matVenomGlow = new StandardMaterial('mat_sahmaran_venom', scene);
    this.matVenomGlow.diffuseColor = new Color3(0.4, 0.85, 0.1);
    this.matVenomGlow.emissiveColor = new Color3(0.3, 0.75, 0.05);

    this.matCrown = new StandardMaterial('mat_sahmaran_crown', scene);
    this.matCrown.diffuseColor = new Color3(0.95, 0.82, 0.25); // Altın taç
    this.matCrown.specularColor = new Color3(0.9, 0.9, 0.8);
    this.matCrown.freeze();

    this.matPurifierStone = new StandardMaterial('mat_arena_purifier', scene);
    this.matPurifierStone.diffuseColor = new Color3(0.3, 0.35, 0.4);
    this.matPurifierStone.freeze();

    this.matPurifiedActive = new StandardMaterial('mat_arena_purified_active', scene);
    this.matPurifiedActive.diffuseColor = new Color3(0.2, 0.9, 0.85);
    this.matPurifiedActive.emissiveColor = new Color3(0.1, 0.6, 0.55);

    // ================= 3D PROSEDÜREL YILAN MODELİ =================
    // 1. Baş & Taç
    this.headMesh = MeshBuilder.CreateBox('sahmaran_head', { width: 2.2, height: 1.8, depth: 3.2 }, scene);
    this.headMesh.position.set(0, 4.5, 0);
    this.headMesh.material = this.matScales;
    this.headMesh.parent = this.root;

    this.crownMesh = MeshBuilder.CreateCylinder('sahmaran_crown', { diameterTop: 1.6, diameterBottom: 1.2, height: 1.2, tessellation: 8 }, scene);
    this.crownMesh.position.set(0, 1.3, -0.4);
    this.crownMesh.material = this.matCrown;
    this.crownMesh.parent = this.headMesh;

    // Göz Işıkları (Zümrüt Yeşili)
    this.eyeGlowLeft = MeshBuilder.CreateSphere('sahmaran_eye_l', { diameter: 0.45 }, scene);
    this.eyeGlowLeft.position.set(-0.95, 0.3, 1.1);
    this.eyeGlowLeft.material = this.matVenomGlow;
    this.eyeGlowLeft.parent = this.headMesh;

    this.eyeGlowRight = MeshBuilder.CreateSphere('sahmaran_eye_r', { diameter: 0.45 }, scene);
    this.eyeGlowRight.position.set(0.95, 0.3, 1.1);
    this.eyeGlowRight.material = this.matVenomGlow;
    this.eyeGlowRight.parent = this.headMesh;

    // 2. Kıvrımlı 5 Gövde Segmenti (Sırayla dizili halkalar)
    for (let i = 0; i < 5; i++) {
      const seg = MeshBuilder.CreateCylinder(`sahmaran_seg_${i}`, {
        diameter: 2.4 - i * 0.28,
        height: 2.2,
        tessellation: 10
      }, scene);
      seg.position.set(0, 3.2 - i * 0.6, -1.8 * (i + 1));
      seg.rotation.x = Math.PI * 0.45;
      seg.material = i % 2 === 0 ? this.matScales : this.matUnderbelly;
      seg.parent = this.root;
      this.bodySegments.push(seg);

      if (shadowGen) shadowGen.addShadowCaster(seg);
    }

    // 3. Kuyruk Kamçısı
    this.tailMesh = MeshBuilder.CreateCylinder('sahmaran_tail', { diameterTop: 0.8, diameterBottom: 0.15, height: 3.5, tessellation: 8 }, scene);
    this.tailMesh.position.set(0, 0.6, -12.5);
    this.tailMesh.rotation.x = Math.PI * 0.45;
    this.tailMesh.material = this.matScales;
    this.tailMesh.parent = this.root;

    if (shadowGen) {
      shadowGen.addShadowCaster(this.headMesh);
      shadowGen.addShadowCaster(this.tailMesh);
    }

    // ================= 0.5s TELEGRAPH HALKASI =================
    this.telegraphRing = MeshBuilder.CreateTorus('sahmaran_telegraph', { diameter: 14.0, thickness: 0.3, tessellation: 24 }, scene);
    this.telegraphRing.position.y = 0.2;
    this.telegraphRing.parent = this.root;
    const matTel = new StandardMaterial('mat_sahmaran_tel', scene);
    matTel.diffuseColor = new Color3(0.2, 0.85, 0.4);
    matTel.emissiveColor = new Color3(0.1, 0.65, 0.25);
    this.telegraphRing.material = matTel;
    this.telegraphRing.setEnabled(false);

    // ================= PARÇACIKLAR =================
    this.venomParticles = this.createVenomParticles();
    this.waterSplashes = this.createWaterSplashParticles();

    // ================= 3 ARENA ARITICI TAŞI =================
    this.buildArenaPurifierStones(arenaX, arenaY, arenaZ, shadowGen);
  }

  private createVenomParticles(): ParticleSystem {
    const ps = new ParticleSystem('sahmaran_venom_ps', 60, this.scene);
    ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==', this.scene);
    ps.emitter = this.headMesh;
    ps.minEmitBox = new Vector3(-1, -1, -1);
    ps.maxEmitBox = new Vector3(1, 1, 1);
    ps.color1 = new Color3(0.3, 0.85, 0.1).toColor4(0.8);
    ps.color2 = new Color3(0.1, 0.45, 0.05).toColor4(0.3);
    ps.minSize = 0.35;
    ps.maxSize = 0.9;
    ps.minLifeTime = 1.0;
    ps.maxLifeTime = 2.2;
    ps.emitRate = 0;
    ps.gravity = new Vector3(0, -1.0, 0);
    ps.start();
    return ps;
  }

  private createWaterSplashParticles(): ParticleSystem {
    const ps = new ParticleSystem('sahmaran_splash_ps', 50, this.scene);
    ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfqChgHMy/+47t5AAAADklEQVQI12P4/5+BFAQA/U4f4XOLpqwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMTAtMjRUMDc6NTE6NDcrMDA6MDC5DCokAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTEwLTI0VDA3OjUxOjQ3KzAwOjAwyFGSmAAAAABJRU5ErkJggg==', this.scene);
    ps.emitter = this.headMesh;
    ps.minEmitBox = new Vector3(-4, 0, -4);
    ps.maxEmitBox = new Vector3(4, 2, 4);
    ps.color1 = new Color3(0.6, 0.95, 1.0).toColor4(0.7);
    ps.color2 = new Color3(0.2, 0.6, 0.8).toColor4(0.2);
    ps.minSize = 0.4;
    ps.maxSize = 1.2;
    ps.minLifeTime = 0.6;
    ps.maxLifeTime = 1.2;
    ps.emitRate = 0;
    ps.start();
    return ps;
  }

  /**
   * Arenadaki 3 Kutsal Arıtıcı Pınar Taşı (Faz 2 Bulmacası)
   */
  private buildArenaPurifierStones(arenaX: number, arenaY: number, arenaZ: number, shadowGen: ShadowGenerator | null): void {
    const stoneOffsets = [
      new Vector3(-12, 0, 10),
      new Vector3(12, 0, 10),
      new Vector3(0, 0, -16)
    ];

    stoneOffsets.forEach((off, idx) => {
      const stonePos = new Vector3(arenaX + off.x, arenaY + 0.6, arenaZ + off.z);
      const stone = MeshBuilder.CreateCylinder(`sahmaran_stone_${idx}`, {
        diameter: 2.2,
        height: 1.4,
        tessellation: 8
      }, this.scene);
      stone.position.copyFrom(stonePos);
      stone.material = this.matPurifierStone;
      stone.checkCollisions = true;

      if (shadowGen) shadowGen.addShadowCaster(stone);

      this.purifierStones.push({
        id: `purifier_stone_${idx}`,
        position: stonePos,
        mesh: stone,
        isActivated: false
      });
    });
  }

  /**
   * Oyuncu Arıtıcı Taşa vurduğunda veya etkileşime girdiğinde
   */
  public activatePurifierStone(hitPos: Vector3, radius = 3.5): boolean {
    if (this.phase !== 'PHASE_2_VENOM_SHIELD' || !this.isVenomShieldActive) return false;

    let activatedAny = false;
    for (const stone of this.purifierStones) {
      if (!stone.isActivated && Vector3.Distance(hitPos, stone.position) < radius) {
        stone.isActivated = true;
        stone.mesh.material = this.matPurifiedActive;
        activatedAny = true;

        ProceduralAudio.playWaterSplash();
        ProceduralAudio.playBeaconHum();
        EventBus.emit('ui:loot_toast', { text: `✨ Arıtma Taşı Açıldı! Kutsal Su Akıyor (${this.getActivatedStoneCount()}/3)` });
      }
    }

    if (this.purifierStones.every((s) => s.isActivated)) {
      this.triggerPurificationShock();
    }

    return activatedAny;
  }

  public checkInteract(pos: Vector3): boolean {
    return this.activatePurifierStone(pos);
  }

  public getActivatedStoneCount(): number {
    return this.purifierStones.filter((s) => s.isActivated).length;
  }

  /**
   * 3 Pınar da açılınca oluşan Arınma Şoku! Zehir kalkanı çöker, boss sersemler
   */
  private triggerPurificationShock(): void {
    this.isVenomShieldActive = false;
    this.venomParticles.emitRate = 0;
    this.phase = 'STAGGERED';
    this.staggerTimer = 7.0; // 7 saniye boyunca %150 hasar alır

    this.headMesh.material = this.matUnderbelly;
    ProceduralAudio.playSteamHiss();
    ProceduralAudio.playCrit();

    EventBus.emit('ui:loot_toast', {
      text: '🌊 ARINMA ŞOKU! Zehir kalkanı çöktü, Şahmaran savunmasız! Vur!'
    });
  }

  /**
   * Hasar Alma ve Faz Geçişleri (Sıfır GC)
   */
  public takeDamage(amount: number, isCritical = false): number {
    if (this.isDead) return 0;

    let finalDamage = amount;

    // Faz 2'de Zehir Kalkanı varken hasar %85 engellenir
    if (this.isVenomShieldActive) {
      finalDamage *= 0.15;
      ProceduralAudio.playShieldBlock();
      EventBus.emit('ui:loot_toast', {
        text: '🛡️ Zehir Kalkanı Hasarı Soğurdu! 3 Arıtma Taşını aç!'
      });
    } else if (this.phase === 'STAGGERED') {
      finalDamage *= 1.5; // Arınma şokunda %150 hasar
      ProceduralAudio.playCrit();
    }

    this.health = Math.max(0, this.health - finalDamage);

    // Faz Geçişleri
    if (this.health <= 0) {
      this.die();
    } else if (this.health < 280 && this.phase !== 'PHASE_3_TSUNAMI') {
      this.enterPhase3();
    } else if (this.health < 600 && this.phase === 'PHASE_1') {
      this.enterPhase2();
    }

    return finalDamage;
  }

  private enterPhase2(): void {
    this.phase = 'PHASE_2_VENOM_SHIELD';
    this.isVenomShieldActive = true;
    this.headMesh.material = this.matVenomGlow;
    this.venomParticles.emitRate = 45;

    ProceduralAudio.playRoar();
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Şahmaran',
      text: '🐍 Kutsal pınarlar Erlik’in zehriyle kaynıyor... Çekil önümden yiğit!'
    });
  }

  private enterPhase3(): void {
    this.phase = 'PHASE_3_TSUNAMI';
    this.isVenomShieldActive = false;
    this.attackCooldown = 1.4; // Saldırılar çok daha hızlı
    this.venomParticles.emitRate = 30;
    this.waterSplashes.emitRate = 40;

    ProceduralAudio.playThunderBoom();
    ProceduralAudio.playRoar();
    EventBus.emit('ui:dialogue_show', {
      speaker: 'Şahmaran',
      text: '🌊 TSUNAMİ ÖFKESİ! Sular kabarıyor, kadim göl titriyor!'
    });
  }

  private die(): void {
    this.isDead = true;
    this.phase = 'DEAD';
    this.venomParticles.stop();
    this.waterSplashes.stop();
    this.telegraphRing.setEnabled(false);

    // Sakince suya uzanış animasyonu
    this.root.position.y -= 2.5;

    ProceduralAudio.playBossDefeatStinger();
    ProceduralAudio.playWaterSplash();

    // SU KUTU RELİKİNİ BAHŞET
    this.spawnSuKutu();

    EventBus.emit('combat:boss_defeat');
    EventBus.emit('world:sahmaran_purified');
    EventBus.emit('world:bay_terek_healed', { stage: 3 });
    EventBus.emit('ui:loot_toast', {
      text: '🏆 ŞAHMARAN ARINDI! Kutsal SU KUTU açığa çıktı!'
    });
  }

  private spawnSuKutu(): void {
    const suKutuPos = this.position.clone();
    suKutuPos.y += 3.5;

    const suKutu = MeshBuilder.CreatePolyhedron('su_kutu_relic', { type: 2, size: 1.1 }, this.scene);
    suKutu.position.copyFrom(suKutuPos);

    const mat = new StandardMaterial('mat_su_kutu', this.scene);
    mat.diffuseColor = new Color3(0.15, 0.85, 0.95);
    mat.emissiveColor = new Color3(0.2, 0.7, 0.9);
    mat.specularColor = new Color3(1, 1, 1);
    suKutu.material = mat;

    this.suKutuMesh = suKutu;
  }

  public checkClaimSuKutu(playerPos: Vector3, kamPower: KamPowerManager): boolean {
    if (!this.suKutuMesh || this.isSuKutuClaimed) return false;

    if (Vector3.Distance(playerPos, this.suKutuMesh.position) < 3.2) {
      this.isSuKutuClaimed = true;
      this.suKutuMesh.dispose();
      this.suKutuMesh = null;

      kamPower.hasSuKutu = true;
      ProceduralAudio.playKutAcquired();
      ProceduralAudio.playAchievementFanfare();

      EventBus.emit('ui:loot_toast', {
        text: '💧 KUT’UN ÜÇÜNCÜ PARÇASI: SU KUTU KAZANILDI! (Sınırsız Nefes & Su Şifası)'
      });
      return true;
    }
    return false;
  }

  /**
   * Her Kare Boss Yapay Zekası ve Saldırı Döngüsü (Sıfır GC)
   */
  public update(deltaTime: number, playerPos: Vector3, playerCombat: CombatSystem): void {
    if (this.isDead) return;

    this.animTimer += deltaTime;

    // Yılanın S dalgalanma animasyonu
    for (let i = 0; i < this.bodySegments.length; i++) {
      const seg = this.bodySegments[i];
      seg.position.x = Math.sin(this.animTimer * 3.0 + i * 0.8) * 0.95;
    }
    this.tailMesh.position.x = Math.sin(this.animTimer * 4.0 + 4.0) * 1.6;

    // Sersemleme Kontrolü
    if (this.phase === 'STAGGERED') {
      this.staggerTimer -= deltaTime;
      if (this.staggerTimer <= 0) {
        this.phase = 'PHASE_2_VENOM_SHIELD';
        this.isVenomShieldActive = true;
        this.headMesh.material = this.matVenomGlow;
        // Taşları sıfırla
        this.purifierStones.forEach((s) => {
          s.isActivated = false;
          s.mesh.material = this.matPurifierStone;
        });
      }
      return;
    }

    // Oyuncuya Yönelme
    this.scratchDir.copyFrom(playerPos).subtractInPlace(this.position);
    this.scratchDir.y = 0;
    const distToPlayer = this.scratchDir.length();

    if (distToPlayer > 0.1) {
      const targetAngle = Math.atan2(this.scratchDir.x, this.scratchDir.z);
      this.currentHeading = Scalar.Lerp(this.currentHeading, targetAngle, Math.min(1.0, deltaTime * 2.5));
      this.root.rotation.y = this.currentHeading;
    }

    // 0.5s Telegraph İşletimi
    if (this.isTelegraphActive) {
      this.telegraphTimer -= deltaTime;
      const pulse = 1.0 + Math.sin(this.telegraphTimer * 20.0) * 0.2;
      this.telegraphRing.scaling.set(pulse, 1.0, pulse);

      if (this.telegraphTimer <= 0) {
        this.isTelegraphActive = false;
        this.telegraphRing.setEnabled(false);

        // Saldırı Darbesi (Kuyruk kamçısı / Zehir fırtınası)
        if (distToPlayer < 7.5) {
          const dmg = this.phase === 'PHASE_3_TSUNAMI' ? 42.0 : 28.0;
          playerCombat.health = Math.max(0, playerCombat.health - dmg);
          playerCombat.addCameraTrauma(0.7);
          ProceduralAudio.playWaterSplash();
          ProceduralAudio.playImpact(true);
        }
      }
      return;
    }

    // Saldırı Zamanlayıcısı
    this.attackTimer += deltaTime;
    if (this.attackTimer >= this.attackCooldown && distToPlayer < 12.0) {
      this.attackTimer = 0.0;
      this.isTelegraphActive = true;
      this.telegraphTimer = 0.50; // Kural: Kesin 0.5 sn telegraph
      this.telegraphRing.setEnabled(true);
      ProceduralAudio.playRoar();
    }
  }

  public dispose(): void {
    this.root.dispose();
    this.matScales.dispose();
    this.matUnderbelly.dispose();
    this.matVenomGlow.dispose();
    this.matCrown.dispose();
    this.matPurifierStone.dispose();
    this.matPurifiedActive.dispose();
    this.telegraphRing.dispose();
    this.purifierStones.forEach((s) => s.mesh.dispose());
  }
}
