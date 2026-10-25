/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Kutsal Gök Kurt Yol Arkadaşı: BÖRÜ (BoruCompanion)
 * (Prosedürel 3D İskelet, Uçurum/Eğim Farkındalığı, Koku İzi 'KOKLA' Düğmesi & Parçacık Yolu,
 *  Savaşta Isırma, Emir Sistemi: GEL/BEKLE/SALDIR, Ölmezlik & Can Toparlanması & Sıfır GC)
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
  Color4,
  Texture
} from '@babylonjs/core';
import { WorldManager } from '../world/WorldManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';

export type BoruState =
  | 'FOLLOW'
  | 'SPRINT'
  | 'PROWL'
  | 'SIT'
  | 'HOWL'
  | 'SNIFF'
  | 'BITE_ATTACK'
  | 'DOWNED_WHIMPER';

export type BoruCommand = 'FOLLOW' | 'STAY' | 'ATTACK';

export class BoruCompanion {
  public scene: Scene;
  public root: TransformNode;
  public position: Vector3;
  public heading = 0;
  public state: BoruState = 'FOLLOW';
  public command: BoruCommand = 'FOLLOW';

  // Can ve Ölmezlik Durumu
  public health = 120;
  public maxHealth = 120;
  public isDowned = false;
  private reviveTimer = 0;

  // Hiyerarşi Parçaları
  public bodyMesh: Mesh;
  public chestMesh: Mesh;
  public headMesh: Mesh;
  public snoutMesh: Mesh;
  public earLeft: Mesh;
  public earRight: Mesh;
  public tailMesh: Mesh;
  public legFL: Mesh;
  public legFR: Mesh;
  public legBL: Mesh;
  public legBR: Mesh;
  public eyeLeft: Mesh;
  public eyeRight: Mesh;

  // Materyaller
  private matFur: StandardMaterial;
  private matMane: StandardMaterial;
  private matEyeGlow: StandardMaterial;

  // Takip & Hız Değişkenleri
  public currentSpeed = 0;
  private targetOffset = new Vector3(-2.2, 0, -2.0); // Oyuncunun sol arkası
  private idleStationaryTimer = 0;
  private howlTimer = 0;
  private sniffTimer = 0;
  private biteTimer = 0;
  private alertCooldown = 0;
  private animTimer = 0;

  // Koku İzi Parçacık Yolu
  private scentTrailParticles: ParticleSystem | null = null;
  private scentTargetPos = new Vector3(0, 0, 0);
  private isScentActive = false;
  private scentDuration = 0;

  // Yay-Sönüm Kuyruk Fiziği
  private tailAngle = 0;
  private tailVelocity = 0;

  // Sıcak döngü scratch nesneleri
  private scratchTargetPos = new Vector3(0, 0, 0);
  private scratchToTarget = new Vector3(0, 0, 0);
  private scratchProbePos = new Vector3(0, 0, 0);

  constructor(
    startX: number,
    startZ: number,
    scene: Scene,
    world: WorldManager,
    shadowGen: ShadowGenerator | null = null
  ) {
    this.scene = scene;
    const startY = world.getHeightAt(startX, startZ);
    this.position = new Vector3(startX, startY, startZ);

    this.root = new TransformNode('boru_root', scene);
    this.root.position.copyFrom(this.position);

    // ================= MATERYALLER =================
    this.matFur = new StandardMaterial('mat_boru_fur', scene);
    this.matFur.diffuseColor = new Color3(0.68, 0.74, 0.82); // Gümüşi bozkır kurdu
    this.matFur.specularColor = new Color3(0.15, 0.2, 0.25);

    this.matMane = new StandardMaterial('mat_boru_mane', scene);
    this.matMane.diffuseColor = new Color3(0.85, 0.9, 0.98); // Kutsal ak yele
    this.matMane.specularColor = new Color3(0.3, 0.35, 0.45);

    this.matEyeGlow = new StandardMaterial('mat_boru_eyeglow', scene);
    this.matEyeGlow.diffuseColor = new Color3(0.2, 0.75, 1.0);
    this.matEyeGlow.emissiveColor = new Color3(0.25, 0.8, 1.0); // Gök mavisi göz ışıması
    this.matEyeGlow.disableLighting = true;

    // ================= 3D PROSEDÜREL İSKELET =================
    // 1. Göğüs (Chest)
    this.chestMesh = MeshBuilder.CreateBox('boru_chest', { width: 0.65, height: 0.72, depth: 0.85 }, scene);
    this.chestMesh.position.set(0, 0.68, 0.35);
    this.chestMesh.material = this.matFur;
    this.chestMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.chestMesh);

    // Gür Boyun Yelesi
    const mane = MeshBuilder.CreateCylinder('boru_mane', { height: 0.55, diameterTop: 0.5, diameterBottom: 0.8, tessellation: 8 }, scene);
    mane.position.set(0, 0.82, 0.52);
    mane.rotation.x = 0.45;
    mane.material = this.matMane;
    mane.parent = this.root;

    // 2. Karın ve Kalça (Body)
    this.bodyMesh = MeshBuilder.CreateBox('boru_body', { width: 0.55, height: 0.58, depth: 0.9 }, scene);
    this.bodyMesh.position.set(0, 0.62, -0.42);
    this.bodyMesh.material = this.matFur;
    this.bodyMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.bodyMesh);

    // 3. Baş (Head)
    this.headMesh = MeshBuilder.CreateBox('boru_head', { width: 0.48, height: 0.45, depth: 0.55 }, scene);
    this.headMesh.position.set(0, 1.05, 0.75);
    this.headMesh.material = this.matFur;
    this.headMesh.parent = this.root;

    // 4. Burun & Çene (Snout)
    this.snoutMesh = MeshBuilder.CreateBox('boru_snout', { width: 0.28, height: 0.24, depth: 0.45 }, scene);
    this.snoutMesh.position.set(0, 0.95, 1.05);
    this.snoutMesh.material = this.matMane;
    this.snoutMesh.parent = this.root;

    // Siyah Burun Ucu
    const noseTip = MeshBuilder.CreateBox('boru_nosetip', { width: 0.12, height: 0.1, depth: 0.08 }, scene);
    noseTip.position.set(0, 1.0, 1.28);
    const matNose = new StandardMaterial('mat_boru_nose', scene);
    matNose.diffuseColor = new Color3(0.08, 0.08, 0.1);
    matNose.freeze();
    noseTip.material = matNose;
    noseTip.parent = this.root;

    // 5. Kulaklar (Ears)
    this.earLeft = MeshBuilder.CreateCylinder('boru_ear_l', { height: 0.35, diameterTop: 0.02, diameterBottom: 0.18, tessellation: 4 }, scene);
    this.earLeft.position.set(-0.2, 1.32, 0.68);
    this.earLeft.rotation.z = -0.25;
    this.earLeft.material = this.matFur;
    this.earLeft.parent = this.root;

    this.earRight = MeshBuilder.CreateCylinder('boru_ear_r', { height: 0.35, diameterTop: 0.02, diameterBottom: 0.18, tessellation: 4 }, scene);
    this.earRight.position.set(0.2, 1.32, 0.68);
    this.earRight.rotation.z = 0.25;
    this.earRight.material = this.matFur;
    this.earRight.parent = this.root;

    // 6. Gözler (Glowing Celestial Eyes)
    this.eyeLeft = MeshBuilder.CreateSphere('boru_eye_l', { diameter: 0.1, segments: 6 }, scene);
    this.eyeLeft.position.set(-0.16, 1.1, 0.92);
    this.eyeLeft.material = this.matEyeGlow;
    this.eyeLeft.parent = this.root;

    this.eyeRight = MeshBuilder.CreateSphere('boru_eye_r', { diameter: 0.1, segments: 6 }, scene);
    this.eyeRight.position.set(0.16, 1.1, 0.92);
    this.eyeRight.material = this.matEyeGlow;
    this.eyeRight.parent = this.root;

    // 7. Bacaklar (Legs)
    this.legFL = MeshBuilder.CreateCylinder('boru_leg_fl', { height: 0.68, diameter: 0.14, tessellation: 6 }, scene);
    this.legFL.position.set(-0.25, 0.34, 0.45);
    this.legFL.material = this.matFur;
    this.legFL.parent = this.root;

    this.legFR = MeshBuilder.CreateCylinder('boru_leg_fr', { height: 0.68, diameter: 0.14, tessellation: 6 }, scene);
    this.legFR.position.set(0.25, 0.34, 0.45);
    this.legFR.material = this.matFur;
    this.legFR.parent = this.root;

    this.legBL = MeshBuilder.CreateCylinder('boru_leg_bl', { height: 0.65, diameter: 0.15, tessellation: 6 }, scene);
    this.legBL.position.set(-0.22, 0.325, -0.62);
    this.legBL.material = this.matFur;
    this.legBL.parent = this.root;

    this.legBR = MeshBuilder.CreateCylinder('boru_leg_br', { height: 0.65, diameter: 0.15, tessellation: 6 }, scene);
    this.legBR.position.set(0.22, 0.325, -0.62);
    this.legBR.material = this.matFur;
    this.legBR.parent = this.root;

    // 8. Kuyruk (Tail)
    this.tailMesh = MeshBuilder.CreateCylinder('boru_tail', { height: 0.65, diameterTop: 0.12, diameterBottom: 0.04, tessellation: 6 }, scene);
    this.tailMesh.position.set(0, 0.65, -0.92);
    this.tailMesh.rotation.x = -0.65;
    this.tailMesh.material = this.matMane;
    this.tailMesh.parent = this.root;

    this.initScentParticles();
  }

  private initScentParticles(): void {
    const ps = new ParticleSystem('boru_scent_particles', 120, this.scene);
    ps.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', this.scene);
    ps.emitter = this.snoutMesh;
    ps.minEmitBox = new Vector3(-0.1, 0, 0);
    ps.maxEmitBox = new Vector3(0.1, 0.1, 0.2);

    ps.color1 = new Color4(0.95, 0.85, 0.25, 0.8);
    ps.color2 = new Color4(0.3, 0.85, 1.0, 0.6);
    ps.colorDead = new Color4(0.1, 0.3, 0.7, 0.0);

    ps.minSize = 0.12;
    ps.maxSize = 0.35;
    ps.minLifeTime = 1.2;
    ps.maxLifeTime = 2.4;
    ps.emitRate = 45;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new Vector3(0, 0.15, 0);
    ps.minAngularSpeed = -1.0;
    ps.maxAngularSpeed = 1.0;

    ps.minEmitPower = 1.2;
    ps.maxEmitPower = 2.5;

    this.scentTrailParticles = ps;
  }

  /**
   * "Kokla" İşlevi (Koku İzi & En Yakın Kutsal Sır Yönü)
   */
  public sniff(targetPos: Vector3, label: string): void {
    this.sniffTimer = 2.5;
    this.state = 'SNIFF';
    this.isScentActive = true;
    this.scentDuration = 7.5;
    this.scentTargetPos.copyFrom(targetPos);

    ProceduralAudio.playScentTrailChime();

    if (this.scentTrailParticles) {
      this.scentTrailParticles.start();
    }

    EventBus.emit('ui:dialogue_show', {
      speaker: 'Börü',
      text: `Hrr... Auuu! Börü havayı kokladı: ${label} kokusu alınıyor!`
    });
  }

  /**
   * Emir Değişimi: GEL / BEKLE / SALDIR
   */
  public setCommand(cmd: BoruCommand): void {
    this.command = cmd;
    ProceduralAudio.playButtonClick();

    if (cmd === 'STAY') {
      this.state = 'SIT';
      EventBus.emit('ui:loot_toast', { text: '🐺 Börü: Beklemede (Oturdu)' });
    } else if (cmd === 'FOLLOW') {
      this.state = 'FOLLOW';
      EventBus.emit('ui:loot_toast', { text: '🐺 Börü: Seni Takip Ediyor' });
    } else if (cmd === 'ATTACK') {
      this.state = 'BITE_ATTACK';
      EventBus.emit('ui:loot_toast', { text: '🐺 Börü: Saldırıya Geçti!' });
    }
  }

  /**
   * Savaşta Düşmanı Bacağından Isırarak Sersemletme
   */
  public performBiteAttack(targetPos: Vector3): boolean {
    if (this.isDowned || this.biteTimer > 0) return false;

    this.biteTimer = 4.5; // 4.5 saniye bekleme
    this.state = 'BITE_ATTACK';

    // Düşmana doğru atıl
    this.scratchToTarget.x = targetPos.x - this.position.x;
    this.scratchToTarget.z = targetPos.z - this.position.z;
    this.heading = Math.atan2(this.scratchToTarget.x, this.scratchToTarget.z);
    this.root.rotation.y = this.heading;

    ProceduralAudio.playBoruBite();
    return true;
  }

  /**
   * Hasar Alma ve Ölmezlik Toparlanması
   */
  public takeDamage(damage: number): void {
    if (this.isDowned) return;

    this.health = Math.max(0, this.health - damage);

    if (this.health <= 0) {
      this.isDowned = true;
      this.state = 'DOWNED_WHIMPER';
      this.reviveTimer = 8.0;

      // Yere uzanma animasyonu
      this.chestMesh.position.y = 0.3;
      this.bodyMesh.position.y = 0.25;
      this.headMesh.position.y = 0.35;
      this.headMesh.rotation.z = 0.45;

      EventBus.emit('ui:loot_toast', { text: '🐺 Börü yaralandı! Toparlanıyor...' });
    }
  }

  /**
   * Ana Güncelleme Döngüsü (Sıfır GC)
   */
  public update(
    playerPos: Vector3,
    playerHeading: number,
    playerSpeed: number,
    isPlayerCrouched: boolean,
    world: WorldManager,
    deltaTime: number,
    dangerNearby: boolean,
    secretNearby: boolean
  ): void {
    this.animTimer += deltaTime;
    this.alertCooldown = Math.max(0, this.alertCooldown - deltaTime);
    this.biteTimer = Math.max(0, this.biteTimer - deltaTime);

    // Koku İzi Parçacık Süresi
    if (this.isScentActive) {
      this.scentDuration -= deltaTime;
      if (this.scentDuration <= 0) {
        this.isScentActive = false;
        if (this.scentTrailParticles) {
          this.scentTrailParticles.stop();
        }
      }
    }

    // 1. Yaralanma / Toparlanma Yönetimi
    if (this.isDowned) {
      this.reviveTimer -= deltaTime;
      if (this.reviveTimer <= 0) {
        this.isDowned = false;
        this.health = this.maxHealth * 0.5;
        this.state = 'FOLLOW';
        this.chestMesh.position.y = 0.68;
        this.bodyMesh.position.y = 0.62;
        this.headMesh.position.y = 1.05;
        this.headMesh.rotation.z = 0;
        this.triggerHowl('victory');
        EventBus.emit('ui:loot_toast', { text: '🐺 Börü ayağa kalktı!' });
      }
      return;
    }

    // 2. Koklama Animasyonu
    if (this.sniffTimer > 0) {
      this.sniffTimer -= deltaTime;
      this.headMesh.rotation.x = -0.35;
      this.snoutMesh.position.y = 1.1;
      return;
    }

    // 3. Isırma Saldırısı Hareketi
    if (this.state === 'BITE_ATTACK') {
      this.currentSpeed = 12.0;
      this.position.x += Math.sin(this.heading) * this.currentSpeed * deltaTime;
      this.position.z += Math.cos(this.heading) * this.currentSpeed * deltaTime;
      this.position.y = world.getHeightAt(this.position.x, this.position.z);
      this.root.position.copyFrom(this.position);

      if (this.biteTimer <= 3.8) {
        this.state = 'FOLLOW';
      }
      return;
    }

    // 4. "BEKLE" Emrindeyse Hareket Etmez
    if (this.command === 'STAY') {
      this.currentSpeed = 0;
      this.state = 'SIT';
      this.chestMesh.position.y = 0.52;
      this.bodyMesh.position.y = 0.38;
      return;
    }

    // 5. Hedef Takip Konumu Hesapla (Uçurum ve Eğim Farkındalığı ile)
    const forwardX = Math.sin(playerHeading);
    const forwardZ = Math.cos(playerHeading);
    const rightX = forwardZ;
    const rightZ = -forwardX;

    const followDist = isPlayerCrouched ? 2.0 : 3.0;
    this.scratchTargetPos.x = playerPos.x - forwardX * followDist + rightX * (this.targetOffset.x);
    this.scratchTargetPos.z = playerPos.z - forwardZ * followDist + rightZ * (this.targetOffset.x);

    this.scratchToTarget.x = this.scratchTargetPos.x - this.position.x;
    this.scratchToTarget.z = this.scratchTargetPos.z - this.position.z;
    const distToTarget = Math.hypot(this.scratchToTarget.x, this.scratchToTarget.z);

    // Tehlike ve Hazine Uluması
    if (dangerNearby && this.alertCooldown <= 0) {
      this.alertCooldown = 18.0;
      this.triggerHowl('danger');
    } else if (secretNearby && this.alertCooldown <= 0) {
      this.alertCooldown = 22.0;
      this.triggerHowl('secret');
    }

    if (this.howlTimer > 0) {
      this.howlTimer -= deltaTime;
      this.state = 'HOWL';
      this.headMesh.position.y = 1.15;
      this.headMesh.rotation.x = -0.55;
      this.snoutMesh.rotation.x = -0.55;
      return;
    }

    this.headMesh.rotation.x = 0;
    this.snoutMesh.rotation.x = 0;

    if (distToTarget > 0.8) {
      this.idleStationaryTimer = 0;
      let targetHeading = Math.atan2(this.scratchToTarget.x, this.scratchToTarget.z);

      // Uçurum Farkındalığı: Bir adım ilerideki yükseklik farkını yokla
      const probeDist = 1.5;
      this.scratchProbePos.x = this.position.x + Math.sin(targetHeading) * probeDist;
      this.scratchProbePos.z = this.position.z + Math.cos(targetHeading) * probeDist;
      const currentGroundY = world.getHeightAt(this.position.x, this.position.z);
      const probeGroundY = world.getHeightAt(this.scratchProbePos.x, this.scratchProbePos.z);
      const slopeDiff = Math.abs(probeGroundY - currentGroundY);

      // Eğer uçurum (>2.8m dik düşüş) varsa rotayı hafif yana saptır
      if (slopeDiff > 2.8) {
        targetHeading += 0.6; // Güvenli eğimden dolan
      }

      this.heading = Scalar.Lerp(this.heading, targetHeading, Math.min(1.0, deltaTime * 8.5));
      this.root.rotation.y = this.heading;

      const maxSpeed = playerSpeed > 5.5 ? 9.2 : isPlayerCrouched ? 2.2 : 4.8;
      this.currentSpeed = Scalar.Lerp(this.currentSpeed, maxSpeed, Math.min(1.0, deltaTime * 6.0));

      this.position.x += Math.sin(this.heading) * this.currentSpeed * deltaTime;
      this.position.z += Math.cos(this.heading) * this.currentSpeed * deltaTime;
      this.position.y = world.getHeightAt(this.position.x, this.position.z);
      this.root.position.copyFrom(this.position);

      this.state = isPlayerCrouched ? 'PROWL' : this.currentSpeed > 5.5 ? 'SPRINT' : 'FOLLOW';

      // Bacak Yürüme/Koşma Animasyonu
      const legCycle = Math.sin(this.animTimer * this.currentSpeed * 2.2) * 0.35;
      this.legFL.rotation.x = legCycle;
      this.legFR.rotation.x = -legCycle;
      this.legBL.rotation.x = -legCycle;
      this.legBR.rotation.x = legCycle;

      this.chestMesh.position.y = isPlayerCrouched ? 0.48 : 0.68;
      this.bodyMesh.position.y = isPlayerCrouched ? 0.44 : 0.62;
    } else {
      this.currentSpeed = 0;
      this.idleStationaryTimer += deltaTime;
      this.legFL.rotation.x = 0;
      this.legFR.rotation.x = 0;
      this.legBL.rotation.x = 0;
      this.legBR.rotation.x = 0;

      if (this.idleStationaryTimer >= 2.5) {
        this.state = 'SIT';
        this.chestMesh.position.y = 0.52;
        this.bodyMesh.position.y = 0.38;
        this.tailMesh.position.set(0, 0.35, -0.65);
        this.tailMesh.rotation.x = -0.15;
      } else {
        this.state = 'FOLLOW';
      }
    }

    // Kuyruk Sallama Fiziği (Tail Spring Damper)
    const springK = 25.0;
    const damping = 5.0;
    const targetTail = this.currentSpeed > 1.0 ? Math.sin(this.animTimer * 12.0) * 0.45 : 0.15;
    const force = -springK * (this.tailAngle - targetTail) - damping * this.tailVelocity;
    this.tailVelocity += force * deltaTime;
    this.tailAngle += this.tailVelocity * deltaTime;
    this.tailMesh.rotation.y = this.tailAngle;
  }

  public triggerHowl(reason: 'danger' | 'secret' | 'victory'): void {
    this.howlTimer = 2.2;
    this.state = 'HOWL';
    ProceduralAudio.playWolfHowl();

    if (reason === 'secret') {
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'Auuu! Börü yakındaki kadim bir Bengü Taşı veya kurgan sezdi...'
      });
    } else if (reason === 'danger') {
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'Hrr! Körmöz gölgeleri pusuda, tetikte ol Ayaz!'
      });
    } else if (reason === 'victory') {
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Börü',
        text: 'Auuu! Börü zafer ulumasıyla göğe seslendi!'
      });
    }
  }

  public dispose(): void {
    this.root.dispose();
    this.matFur.dispose();
    this.matMane.dispose();
    this.matEyeGlow.dispose();
    if (this.scentTrailParticles) {
      this.scentTrailParticles.dispose();
    }
  }
}
