/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Düşman Yapay Zekası ve Varlık Sistemi (EnemyEntity)
 * (Albız Ruhu, Kara Kış Gölgesi, Yek Kalkanlı Er, Yek Komutanı Mini Boss,
 *  10 Durumlu FSM, Algı Konisi, Ses & Gece/Işık Algısı, 3D Billboard Göstergesi,
 *  0.5s Yer Halkası Telegraph, Renk Körü Paleti, Eşzamanlı Kuşatma & Sıfır GC)
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
import { WorldManager } from '../world/WorldManager';
import { ProceduralAudio } from '../audio/ProceduralAudio';
import { EventBus } from '../infra/EventBus';
import { SettingsStore } from '../infra/SettingsStore';
import { DamageType, DamageResistances } from './WeaponData';
import { EnemyCoordinator } from './EnemyCoordinator';
import { LootManager, LootType } from './LootManager';

export type EnemyType =
  | 'ALBIZ_SPIRIT'
  | 'KARA_KIS_GOLGE'
  | 'YEK'
  | 'YEK_KOMUTAN'
  | 'DEMIR_YEK'
  | 'KOR_ALBIZ'
  | 'SU_YEK'
  | 'YILAN_ALBIZ'
  | 'SU_ALBIZI'
  | 'ZEHIRLI_SAZAN_SURUSU'
  | 'KARA_YILAN';

export type EnemyAIState =
  | 'IDLE'
  | 'PATROL'
  | 'SUSPICION'
  | 'ALERT'
  | 'ENCIRCLE'
  | 'TELEGRAPH'
  | 'ATTACK'
  | 'STAGGER'
  | 'FLEE'
  | 'DEAD';

export class EnemyEntity {
  public id: string;
  public name: string;
  public type: EnemyType;
  public root: TransformNode;
  public position: Vector3;
  public heading = 0;

  // Nitelikler
  public maxHealth: number;
  public health: number;
  public isDead = false;
  public state: EnemyAIState = 'IDLE';

  // Kamp ve Karakol Bağlantısı
  public campId: string | null = null;
  public isSleeping = false;
  public hasBlownHorn = false;
  public isDormant = false;

  // Hasar Dirençleri
  public resistances: DamageResistances;

  // Kalkan ve Savunma
  public hasShield: boolean;
  public isGuarding = false;

  // Algı ve Farkındalık
  public isAware = false;
  private suspicionMeter = 0; // 0.0 - 1.0 arası dolar
  private sightRangeDay = 18.0;
  private sightRangeNight = 8.5;
  private sightAngle = Math.PI * 0.65; // ~117 derece görüş açısı

  // Zamanlayıcılar ve Durum Değişkenleri
  private stateTimer = 0;
  public staggerTimer = 0;
  private attackCooldown = 0;
  private animTimer = 0;
  private encircleIndex = 0;

  // 3D Billboard Algı Göstergesi (? ve ! İşareti)
  private indicatorRoot: TransformNode;
  private questionMarkMesh: Mesh;
  private exclamationMarkMesh: Mesh;
  private overheadHpTrack: Mesh;
  private overheadHpFill: Mesh;

  // 0.5s Yer Halkası Telegraph Göstergesi
  private groundTelegraphRing: Mesh;
  private matTelegraphRing: StandardMaterial;

  // Hiyerarşi Parçaları
  public bodyMesh: Mesh;
  public headMesh: Mesh;
  public weaponMesh: Mesh;
  public shieldMesh: Mesh | null = null;
  public eyeGlowLeft: Mesh;
  public eyeGlowRight: Mesh;

  // Devriye Noktaları
  public spawnPos: Vector3;
  public patrolTarget: Vector3;

  // Materyaller
  private matArmor: StandardMaterial;
  private matFlesh: StandardMaterial;
  private matWeapon: StandardMaterial;
  private matRuneGlow: StandardMaterial;
  private matIndicatorYellow: StandardMaterial;
  private matIndicatorRed: StandardMaterial;
  private matHpTrack: StandardMaterial;
  private matHpFill: StandardMaterial;

  // Sıcak döngü scratch nesneleri (Zero GC)
  private scratchToPlayer = new Vector3(0, 0, 0);
  private scratchForward = new Vector3(0, 0, 0);

  constructor(
    id: string,
    type: EnemyType,
    x: number,
    z: number,
    scene: Scene,
    world: WorldManager,
    shadowGen: ShadowGenerator | null = null,
    campId: string | null = null,
    startSleeping = false
  ) {
    this.id = id;
    this.type = type;
    this.campId = campId;
    this.isSleeping = startSleeping;

    const groundY = world.getHeightAt(x, z);
    this.position = new Vector3(x, groundY, z);
    this.spawnPos = this.position.clone();
    this.patrolTarget = new Vector3(x + (Math.random() - 0.5) * 12, groundY, z + (Math.random() - 0.5) * 12);

    this.root = new TransformNode(`enemy_root_${id}`, scene);
    this.root.position.copyFrom(this.position);

    // ================= DÜŞMAN NİTELİKLERİ =================
    switch (type) {
      case 'ALBIZ_SPIRIT':
        this.name = 'Albız Ruhu';
        this.maxHealth = 35;
        this.health = 35;
        this.hasShield = false;
        this.resistances = { slashResist: 0.0, bluntResist: -0.2, fireResist: -0.5, frostResist: 0.6 };
        break;
      case 'KARA_KIS_GOLGE':
        this.name = 'Kara Kış Gölgesi';
        this.maxHealth = 55;
        this.health = 55;
        this.hasShield = false;
        this.resistances = { slashResist: 0.0, bluntResist: 0.1, fireResist: -0.8, frostResist: 0.8 };
        break;
      case 'YEK':
        this.name = 'Yek Kalkanlı Er';
        this.maxHealth = 85;
        this.health = 85;
        this.hasShield = true;
        this.resistances = { slashResist: 0.3, bluntResist: -0.4, fireResist: 0.0, frostResist: 0.0 };
        break;
      case 'YEK_KOMUTAN':
        this.name = 'Yek Komutanı';
        this.maxHealth = 190;
        this.health = 190;
        this.hasShield = false;
        this.resistances = { slashResist: 0.15, bluntResist: -0.1, fireResist: 0.0, frostResist: 0.2 };
        break;
      case 'DEMIR_YEK':
        this.name = 'Demir Yek';
        this.maxHealth = 140;
        this.health = 140;
        this.hasShield = false;
        this.resistances = { slashResist: 0.6, bluntResist: 0.2, fireResist: 0.4, frostResist: -0.3 };
        break;
      case 'KOR_ALBIZ':
        this.name = 'Kor Albız';
        this.maxHealth = 70;
        this.health = 70;
        this.hasShield = false;
        this.resistances = { slashResist: 0.1, bluntResist: -0.1, fireResist: 1.0, frostResist: -1.0 };
        break;
      case 'SU_YEK':
        this.name = "Su Yek'i";
        this.maxHealth = 130;
        this.health = 130;
        this.hasShield = false;
        this.resistances = { slashResist: 0.1, bluntResist: 0.0, fireResist: -0.4, frostResist: 0.5 };
        break;
      case 'YILAN_ALBIZ':
        this.name = 'Yılan Albız';
        this.maxHealth = 90;
        this.health = 90;
        this.hasShield = false;
        this.resistances = { slashResist: -0.1, bluntResist: 0.2, fireResist: -0.5, frostResist: 0.6 };
        break;
      case 'SU_ALBIZI':
        this.name = 'Su Albızı';
        this.maxHealth = 85;
        this.health = 85;
        this.hasShield = false;
        this.resistances = { slashResist: 0.1, bluntResist: -0.1, fireResist: -0.6, frostResist: 0.6 };
        break;
      case 'ZEHIRLI_SAZAN_SURUSU':
        this.name = 'Zehirli Sazan Sürüsü';
        this.maxHealth = 60;
        this.health = 60;
        this.hasShield = false;
        this.resistances = { slashResist: -0.2, bluntResist: 0.3, fireResist: -0.7, frostResist: 0.4 };
        break;
      case 'KARA_YILAN':
        this.name = 'Kara Yılan';
        this.maxHealth = 110;
        this.health = 110;
        this.hasShield = false;
        this.resistances = { slashResist: 0.2, bluntResist: -0.1, fireResist: -0.5, frostResist: 0.5 };
        break;
    }

    // ================= MATERYALLER =================
    this.matArmor = new StandardMaterial(`mat_arm_${id}`, scene);
    if (type === 'DEMIR_YEK') {
      this.matArmor.diffuseColor = new Color3(0.12, 0.13, 0.16);
    } else if (type === 'KOR_ALBIZ') {
      this.matArmor.diffuseColor = new Color3(0.85, 0.25, 0.05);
      this.matArmor.emissiveColor = new Color3(0.65, 0.15, 0.02);
    } else if (type === 'SU_YEK') {
      this.matArmor.diffuseColor = new Color3(0.1, 0.45, 0.52);
      this.matArmor.emissiveColor = new Color3(0.05, 0.2, 0.25);
    } else if (type === 'YILAN_ALBIZ' || type === 'KARA_YILAN') {
      this.matArmor.diffuseColor = type === 'KARA_YILAN' ? new Color3(0.06, 0.08, 0.1) : new Color3(0.12, 0.48, 0.22);
      this.matArmor.emissiveColor = new Color3(0.08, 0.35, 0.12);
    } else if (type === 'SU_ALBIZI') {
      this.matArmor.diffuseColor = new Color3(0.15, 0.55, 0.65);
      this.matArmor.emissiveColor = new Color3(0.08, 0.3, 0.4);
    } else if (type === 'ZEHIRLI_SAZAN_SURUSU') {
      this.matArmor.diffuseColor = new Color3(0.4, 0.2, 0.5);
      this.matArmor.emissiveColor = new Color3(0.25, 0.08, 0.35);
    } else {
      this.matArmor.diffuseColor = type === 'YEK_KOMUTAN' ? new Color3(0.12, 0.12, 0.14) : new Color3(0.22, 0.22, 0.24);
    }
    this.matArmor.freeze();

    this.matFlesh = new StandardMaterial(`mat_fl_${id}`, scene);
    if (type === 'KOR_ALBIZ') {
      this.matFlesh.diffuseColor = new Color3(1.0, 0.35, 0.05);
      this.matFlesh.emissiveColor = new Color3(0.8, 0.2, 0.0);
    } else if (type === 'SU_YEK') {
      this.matFlesh.diffuseColor = new Color3(0.2, 0.6, 0.55);
    } else if (type === 'YILAN_ALBIZ') {
      this.matFlesh.diffuseColor = new Color3(0.25, 0.65, 0.3);
      this.matFlesh.emissiveColor = new Color3(0.15, 0.4, 0.18);
    } else {
      this.matFlesh.diffuseColor = type === 'ALBIZ_SPIRIT' ? new Color3(0.35, 0.15, 0.45) : new Color3(0.42, 0.38, 0.32);
    }
    this.matFlesh.freeze();

    this.matWeapon = new StandardMaterial(`mat_wp_${id}`, scene);
    this.matWeapon.diffuseColor = new Color3(0.2, 0.2, 0.25);
    this.matWeapon.freeze();

    this.matRuneGlow = new StandardMaterial(`mat_rg_${id}`, scene);
    if (type === 'KARA_KIS_GOLGE') {
      this.matRuneGlow.diffuseColor = new Color3(0.2, 0.8, 1.0);
      this.matRuneGlow.emissiveColor = new Color3(0.1, 0.6, 0.9);
    } else if (type === 'KOR_ALBIZ' || type === 'DEMIR_YEK') {
      this.matRuneGlow.diffuseColor = new Color3(1.0, 0.45, 0.05);
      this.matRuneGlow.emissiveColor = new Color3(0.95, 0.35, 0.02);
    } else if (type === 'SU_YEK' || type === 'SU_ALBIZI') {
      this.matRuneGlow.diffuseColor = new Color3(0.3, 0.9, 1.0);
      this.matRuneGlow.emissiveColor = new Color3(0.1, 0.75, 0.9);
    } else if (type === 'YILAN_ALBIZ' || type === 'KARA_YILAN') {
      this.matRuneGlow.diffuseColor = new Color3(0.35, 1.0, 0.25);
      this.matRuneGlow.emissiveColor = new Color3(0.2, 0.85, 0.15);
    } else if (type === 'ZEHIRLI_SAZAN_SURUSU') {
      this.matRuneGlow.diffuseColor = new Color3(0.8, 0.2, 0.9);
      this.matRuneGlow.emissiveColor = new Color3(0.65, 0.1, 0.75);
    } else {
      this.matRuneGlow.diffuseColor = new Color3(1.0, 0.1, 0.1);
      this.matRuneGlow.emissiveColor = new Color3(0.9, 0.05, 0.05);
    }

    this.matIndicatorYellow = new StandardMaterial(`mat_ind_y_${id}`, scene);
    this.matIndicatorYellow.diffuseColor = new Color3(1.0, 0.85, 0.1);
    this.matIndicatorYellow.emissiveColor = new Color3(0.9, 0.75, 0.05);

    this.matIndicatorRed = new StandardMaterial(`mat_ind_r_${id}`, scene);
    this.matIndicatorRed.diffuseColor = new Color3(1.0, 0.15, 0.15);
    this.matIndicatorRed.emissiveColor = new Color3(0.95, 0.05, 0.05);

    this.matHpTrack = new StandardMaterial(`mat_hpt_${id}`, scene);
    this.matHpTrack.diffuseColor = new Color3(0.1, 0.1, 0.15);
    this.matHpTrack.freeze();

    this.matHpFill = new StandardMaterial(`mat_hpf_${id}`, scene);
    this.matHpFill.diffuseColor = new Color3(0.9, 0.2, 0.2);
    this.matHpFill.emissiveColor = new Color3(0.7, 0.1, 0.1);

    this.matTelegraphRing = new StandardMaterial(`mat_tel_ring_${id}`, scene);
    this.updateTelegraphColor();

    // ================= 3D HİYERARŞİ =================
    // 1. Gövde
    const scale =
      type === 'YEK_KOMUTAN'
        ? 1.35
        : type === 'DEMIR_YEK'
        ? 1.25
        : type === 'SU_YEK'
        ? 1.15
        : type === 'ZEHIRLI_SAZAN_SURUSU'
        ? 0.55
        : type === 'ALBIZ_SPIRIT' || type === 'KOR_ALBIZ' || type === 'YILAN_ALBIZ' || type === 'SU_ALBIZI'
        ? 0.85
        : 1.0;
    this.bodyMesh = MeshBuilder.CreateBox(`body_${id}`, { width: 0.65 * scale, height: 0.95 * scale, depth: 0.4 * scale }, scene);
    this.bodyMesh.position.y = 0.95 * scale;
    this.bodyMesh.material = this.matArmor;
    this.bodyMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.bodyMesh);

    // 2. Baş
    this.headMesh = MeshBuilder.CreateBox(`head_${id}`, { width: 0.42 * scale, height: 0.45 * scale, depth: 0.42 * scale }, scene);
    this.headMesh.position.set(0, 1.62 * scale, 0);
    this.headMesh.material = this.matFlesh;
    this.headMesh.parent = this.root;

    // Göz Işıkları
    this.eyeGlowLeft = MeshBuilder.CreateSphere(`el_${id}`, { diameter: 0.08 * scale, segments: 4 }, scene);
    this.eyeGlowLeft.position.set(-0.11 * scale, 1.65 * scale, 0.22 * scale);
    this.eyeGlowLeft.material = this.matRuneGlow;
    this.eyeGlowLeft.parent = this.root;

    this.eyeGlowRight = MeshBuilder.CreateSphere(`er_${id}`, { diameter: 0.08 * scale, segments: 4 }, scene);
    this.eyeGlowRight.position.set(0.11 * scale, 1.65 * scale, 0.22 * scale);
    this.eyeGlowRight.material = this.matRuneGlow;
    this.eyeGlowRight.parent = this.root;

    // 3. Silah & Kalkan
    if (type === 'YEK') {
      this.weaponMesh = MeshBuilder.CreateBox(`wep_${id}`, { width: 0.1, height: 1.15, depth: 0.05 }, scene);
      this.weaponMesh.position.set(0.5, 1.0, 0.35);
      this.weaponMesh.rotation.x = Math.PI * 0.25;
      this.weaponMesh.material = this.matWeapon;
      this.weaponMesh.parent = this.root;

      this.shieldMesh = MeshBuilder.CreateBox(`shd_${id}`, { width: 0.55, height: 0.85, depth: 0.08 }, scene);
      this.shieldMesh.position.set(-0.45, 1.0, 0.3);
      this.shieldMesh.material = this.matArmor;
      this.shieldMesh.parent = this.root;
      this.isGuarding = true;
    } else if (type === 'DEMIR_YEK') {
      // Ağır Çelik Balyoz
      this.weaponMesh = MeshBuilder.CreateCylinder(`wep_${id}`, { height: 1.6, diameter: 0.08, tessellation: 6 }, scene);
      this.weaponMesh.position.set(0.55, 1.1, 0.35);
      this.weaponMesh.rotation.x = Math.PI * 0.25;
      this.weaponMesh.material = this.matWeapon;
      this.weaponMesh.parent = this.root;

      const hammerHead = MeshBuilder.CreateBox(`wep_head_${id}`, { width: 0.35, height: 0.35, depth: 0.55 }, scene);
      hammerHead.position.set(0, 0.75, 0);
      hammerHead.material = this.matWeapon;
      hammerHead.parent = this.weaponMesh;
    } else if (type === 'YEK_KOMUTAN') {
      // Dev Kargı / Ağır Pala
      this.weaponMesh = MeshBuilder.CreateCylinder(`wep_${id}`, { height: 2.2, diameter: 0.08, tessellation: 6 }, scene);
      this.weaponMesh.position.set(0.65, 1.2, 0.4);
      this.weaponMesh.rotation.x = Math.PI * 0.3;
      this.weaponMesh.material = this.matWeapon;
      this.weaponMesh.parent = this.root;
    } else if (type === 'KARA_KIS_GOLGE') {
      // Buz Asası
      this.weaponMesh = MeshBuilder.CreateCylinder(`wep_${id}`, { height: 1.8, diameter: 0.06, tessellation: 6 }, scene);
      this.weaponMesh.position.set(0.45, 1.1, 0.3);
      this.weaponMesh.material = this.matWeapon;
      this.weaponMesh.parent = this.root;
    } else if (type === 'SU_YEK') {
      // Amfibik Mızrak
      this.weaponMesh = MeshBuilder.CreateCylinder(`wep_${id}`, { height: 2.3, diameter: 0.06, tessellation: 6 }, scene);
      this.weaponMesh.position.set(0.5, 1.15, 0.38);
      this.weaponMesh.rotation.x = Math.PI * 0.28;
      this.weaponMesh.material = this.matWeapon;
      this.weaponMesh.parent = this.root;

      const spearTip = MeshBuilder.CreateCylinder(`wep_tip_${id}`, { height: 0.5, diameterTop: 0, diameterBottom: 0.16, tessellation: 4 }, scene);
      spearTip.position.set(0, 1.15, 0);
      spearTip.material = this.matRuneGlow;
      spearTip.parent = this.weaponMesh;
    } else if (type === 'YILAN_ALBIZ' || type === 'KARA_YILAN') {
      // Kıvrak Zehir İğnesi / Dişi
      this.weaponMesh = MeshBuilder.CreateCylinder(`wep_${id}`, { height: 1.1, diameterTop: 0.1, diameterBottom: 0.04, tessellation: 6 }, scene);
      this.weaponMesh.position.set(0.3, 0.95, 0.35);
      this.weaponMesh.rotation.x = Math.PI * 0.35;
      this.weaponMesh.material = this.matRuneGlow;
      this.weaponMesh.parent = this.root;
    } else if (type === 'ZEHIRLI_SAZAN_SURUSU') {
      // Küçük Yüzgeç / Diken
      this.weaponMesh = MeshBuilder.CreateBox(`wep_${id}`, { width: 0.25, height: 0.1, depth: 0.35 }, scene);
      this.weaponMesh.position.set(0, 0.5, 0.2);
      this.weaponMesh.material = this.matRuneGlow;
      this.weaponMesh.parent = this.root;
    } else if (type === 'SU_ALBIZI') {
      // Su Pençesi
      this.weaponMesh = MeshBuilder.CreateBox(`wep_${id}`, { width: 0.08, height: 0.5, depth: 0.08 }, scene);
      this.weaponMesh.position.set(0.35, 0.9, 0.3);
      this.weaponMesh.material = this.matRuneGlow;
      this.weaponMesh.parent = this.root;
    } else {
      // Albız Ruhu pençeleri / Kor Albız magma küresi
      this.weaponMesh = MeshBuilder.CreateBox(`wep_${id}`, { width: 0.08, height: 0.45, depth: 0.05 }, scene);
      this.weaponMesh.position.set(0.35, 0.85, 0.3);
      this.weaponMesh.material = this.matRuneGlow;
      this.weaponMesh.parent = this.root;
    }

    // ================= 4. 3D BILLBOARD ALGI GÖSTERGESİ (? ve !) =================
    this.indicatorRoot = new TransformNode(`ind_root_${id}`, scene);
    this.indicatorRoot.parent = this.root;
    this.indicatorRoot.position.set(0, 2.2 * scale, 0);

    // Soru İşareti (Şüphe)
    this.questionMarkMesh = MeshBuilder.CreateTorus(`qm_${id}`, { diameter: 0.28, thickness: 0.06, tessellation: 8 }, scene);
    this.questionMarkMesh.material = this.matIndicatorYellow;
    this.questionMarkMesh.parent = this.indicatorRoot;
    this.questionMarkMesh.setEnabled(false);

    // Ünlem İşareti (Fark Etme / Alarm)
    this.exclamationMarkMesh = MeshBuilder.CreateCylinder(`em_${id}`, { height: 0.32, diameter: 0.08, tessellation: 6 }, scene);
    this.exclamationMarkMesh.material = this.matIndicatorRed;
    this.exclamationMarkMesh.parent = this.indicatorRoot;
    this.exclamationMarkMesh.setEnabled(false);

    // 3D Tepe Can Barı
    this.overheadHpTrack = MeshBuilder.CreateBox(`hp_t_${id}`, { width: 0.7, height: 0.08, depth: 0.04 }, scene);
    this.overheadHpTrack.position.y = -0.25;
    this.overheadHpTrack.material = this.matHpTrack;
    this.overheadHpTrack.parent = this.indicatorRoot;

    this.overheadHpFill = MeshBuilder.CreateBox(`hp_f_${id}`, { width: 0.68, height: 0.06, depth: 0.05 }, scene);
    this.overheadHpFill.position.set(0, -0.25, 0.01);
    this.overheadHpFill.material = this.matHpFill;
    this.overheadHpFill.parent = this.indicatorRoot;

    // ================= 5. 0.5s YER HALKASI TELEGRAPH =================
    this.groundTelegraphRing = MeshBuilder.CreateTorus(`tel_ring_${id}`, {
      diameter: type === 'YEK_KOMUTAN' ? 4.2 : 2.8,
      thickness: 0.12,
      tessellation: 16
    }, scene);
    this.groundTelegraphRing.position.set(0, 0.05, 0);
    this.groundTelegraphRing.material = this.matTelegraphRing;
    this.groundTelegraphRing.parent = this.root;
    this.groundTelegraphRing.setEnabled(false);

    if (this.isSleeping) {
      this.state = 'IDLE';
      this.bodyMesh.rotation.x = Math.PI * 0.45;
      this.bodyMesh.position.y = 0.25;
      this.headMesh.position.set(0, 0.25, 0.7);
    }
  }

  /**
   * Renk körü paletini günceller
   */
  public updateTelegraphColor(): void {
    const isColorblind = SettingsStore.get().colorblindMode;
    if (isColorblind) {
      // Protanopia/Deuteranopia için altın sarısı & parlak camgöbeği
      this.matTelegraphRing.diffuseColor = new Color3(1.0, 0.85, 0.1);
      this.matTelegraphRing.emissiveColor = new Color3(0.9, 0.75, 0.05);
    } else {
      // Standart tehlike kırmızısı / turuncu
      this.matTelegraphRing.diffuseColor = new Color3(0.95, 0.2, 0.1);
      this.matTelegraphRing.emissiveColor = new Color3(0.9, 0.1, 0.05);
    }
  }

  /**
   * Düşman Yapay Zekası Döngüsü (10-15 Hz Zaman Dilimli Algı, Sıfır GC)
   */
  public update(
    playerPos: Vector3,
    world: WorldManager,
    deltaTime: number,
    playerFootstepRadius: number,
    isPlayerCamouflaged: boolean,
    isNight: boolean,
    isNearCampfire: boolean,
    coordinator: EnemyCoordinator,
    lootManager?: LootManager
  ): { isAttacking: boolean; isMelee: boolean; damage: number; isFrost?: boolean } {
    if (this.isDead) return { isAttacking: false, isMelee: false, damage: 0 };

    this.animTimer += deltaTime;
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

    // Can Barı Ölçekleme
    const hpPct = Math.max(0, this.health / this.maxHealth);
    this.overheadHpFill.scaling.x = hpPct;
    this.overheadHpFill.position.x = (hpPct - 1.0) * 0.34;

    this.scratchToPlayer.x = playerPos.x - this.position.x;
    this.scratchToPlayer.z = playerPos.z - this.position.z;
    const dist = Math.hypot(this.scratchToPlayer.x, this.scratchToPlayer.z);

    // Uzak düşman uyur (64m sınırı)
    if (dist > 64.0) {
      this.isDormant = true;
      return { isAttacking: false, isMelee: false, damage: 0 };
    }
    this.isDormant = false;

    // AI Karar Ağacı (10-15 Hz Dilimleme)
    if (coordinator.shouldTickAI) {
      this.tickPerception(dist, playerFootstepRadius, isPlayerCamouflaged, isNight, isNearCampfire);
    }

    // ================= DURUM MAKİNESİ (FSM) =================
    switch (this.state) {
      case 'IDLE':
      case 'PATROL':
        this.updatePatrol(deltaTime, world);
        break;

      case 'SUSPICION':
        this.updateSuspicion(dist, deltaTime);
        break;

      case 'ALERT':
      case 'ENCIRCLE':
        this.updateCombatApproach(playerPos, dist, deltaTime, world, coordinator);
        break;

      case 'TELEGRAPH':
        return this.updateTelegraph(deltaTime);

      case 'ATTACK':
        return this.updateAttack(deltaTime, playerPos, coordinator);

      case 'STAGGER':
        this.updateStagger(deltaTime);
        break;

      case 'FLEE':
        this.updateFlee(playerPos, deltaTime, world);
        break;
    }

    return { isAttacking: false, isMelee: false, damage: 0 };
  }

  /**
   * Algı Hesaplaması (Görüş Konisi, Ses, Gece/Ateş Işığı)
   */
  private tickPerception(
    dist: number,
    footstepRadius: number,
    isCamouflaged: boolean,
    isNight: boolean,
    isNearCampfire: boolean
  ): void {
    if (this.isSleeping) {
      if (dist < 1.6 || (dist < footstepRadius && footstepRadius > 8.0)) {
        this.wakeUp();
      }
      return;
    }

    // 1. Görüş Mesafesi (Gece düşer, meşale/ateş yanında normale döner)
    const effectiveSightRange = isNight && !isNearCampfire ? this.sightRangeNight : this.sightRangeDay;

    let canSeePlayer = false;
    if (dist <= effectiveSightRange && !isCamouflaged) {
      this.scratchForward.x = Math.sin(this.heading);
      this.scratchForward.z = Math.cos(this.heading);

      const toPlayerX = this.scratchToPlayer.x / dist;
      const toPlayerZ = this.scratchToPlayer.z / dist;
      const dot = this.scratchForward.x * toPlayerX + this.scratchForward.z * toPlayerZ;
      const angle = Math.acos(Scalar.Clamp(dot, -1, 1));

      if (angle <= this.sightAngle / 2) {
        canSeePlayer = true;
      }
    }

    // 2. Ses Duyma
    const canHearPlayer = dist <= footstepRadius;

    // 3. Şüphe & Fark Etme Derecesi
    if (canSeePlayer) {
      this.suspicionMeter += 0.35;
    } else if (canHearPlayer) {
      this.suspicionMeter += 0.18;
    } else {
      this.suspicionMeter = Math.max(0, this.suspicionMeter - 0.12);
    }

    if (this.suspicionMeter >= 1.0) {
      if (!this.isAware) {
        this.triggerAlert();
      }
    } else if (this.suspicionMeter > 0.25) {
      if (!this.isAware && this.state !== 'SUSPICION') {
        this.state = 'SUSPICION';
        this.questionMarkMesh.setEnabled(true);
        this.exclamationMarkMesh.setEnabled(false);
      }
    } else if (this.suspicionMeter <= 0.05 && this.state === 'SUSPICION') {
      this.state = 'PATROL';
      this.questionMarkMesh.setEnabled(false);
    }
  }

  private triggerAlert(): void {
    this.isAware = true;
    this.state = 'ALERT';
    this.suspicionMeter = 1.0;
    this.questionMarkMesh.setEnabled(false);
    this.exclamationMarkMesh.setEnabled(true);
    ProceduralAudio.playButtonClick();
    EventBus.emit('enemy:alert', { enemyId: this.id });

    // Komutan savaş borusunu çalar
    if (this.type === 'YEK_KOMUTAN' && !this.hasBlownHorn) {
      this.hasBlownHorn = true;
      ProceduralAudio.playWarHorn();
      EventBus.emit('ui:dialogue_show', {
        speaker: 'Yek Komutanı',
        text: 'Erlik Han adına! Gölgeler toplanın, Kam çırağını ezin!'
      });
    }
  }

  private wakeUp(): void {
    this.isSleeping = false;
    this.bodyMesh.rotation.x = 0;
    this.bodyMesh.position.y = 0.95;
    this.headMesh.position.set(0, 1.62, 0);
    this.triggerAlert();
  }

  private updatePatrol(deltaTime: number, world: WorldManager): void {
    const dx = this.patrolTarget.x - this.position.x;
    const dz = this.patrolTarget.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 1.2) {
      this.patrolTarget.set(
        this.spawnPos.x + (Math.random() - 0.5) * 14,
        world.getHeightAt(this.position.x, this.position.z),
        this.spawnPos.z + (Math.random() - 0.5) * 14
      );
    } else {
      const targetHeading = Math.atan2(dx, dz);
      this.heading = Scalar.Lerp(this.heading, targetHeading, Math.min(1.0, deltaTime * 3.0));
      this.root.rotation.y = this.heading;

      const speed = 1.6;
      this.position.x += Math.sin(this.heading) * speed * deltaTime;
      this.position.z += Math.cos(this.heading) * speed * deltaTime;
      this.position.y = world.getHeightAt(this.position.x, this.position.z);
      this.root.position.copyFrom(this.position);
    }
  }

  private updateSuspicion(dist: number, deltaTime: number): void {
    // Oyuncunun ses çıkardığı yöne yavaşça döner
    const targetHeading = Math.atan2(this.scratchToPlayer.x, this.scratchToPlayer.z);
    this.heading = Scalar.Lerp(this.heading, targetHeading, Math.min(1.0, deltaTime * 4.0));
    this.root.rotation.y = this.heading;
  }

  private updateCombatApproach(
    playerPos: Vector3,
    dist: number,
    deltaTime: number,
    world: WorldManager,
    coordinator: EnemyCoordinator
  ): void {
    const targetHeading = Math.atan2(this.scratchToPlayer.x, this.scratchToPlayer.z);
    this.heading = Scalar.Lerp(this.heading, targetHeading, Math.min(1.0, deltaTime * 7.5));
    this.root.rotation.y = this.heading;

    const attackRange =
      this.type === 'KARA_KIS_GOLGE'
        ? 12.0
        : this.type === 'KOR_ALBIZ'
        ? 8.0
        : this.type === 'YILAN_ALBIZ'
        ? 7.5
        : this.type === 'SU_ALBIZI'
        ? 4.0
        : this.type === 'KARA_YILAN'
        ? 3.5
        : this.type === 'SU_YEK'
        ? 3.4
        : this.type === 'ZEHIRLI_SAZAN_SURUSU'
        ? 2.0
        : 2.5;

    // Saldırı Token'ı İsteme
    const canAttack = coordinator.requestAttackToken(this);

    if (canAttack && dist <= attackRange && this.attackCooldown <= 0) {
      // 0.5s Telegraph Başlat
      this.state = 'TELEGRAPH';
      this.stateTimer = 0.50; // Kesin kural 2: 0.5 sn telegraph
      this.groundTelegraphRing.setEnabled(true);
      ProceduralAudio.playButtonClick();
      return;
    }

    // Token alamayanlar veya uzakta olanlar çevreler (Encircle)
    const speed =
      this.type === 'ZEHIRLI_SAZAN_SURUSU'
        ? 6.5
        : this.type === 'ALBIZ_SPIRIT' || this.type === 'KOR_ALBIZ'
        ? 5.8
        : this.type === 'SU_ALBIZI'
        ? 5.5
        : this.type === 'YILAN_ALBIZ'
        ? 5.2
        : this.type === 'KARA_YILAN'
        ? 4.5
        : this.type === 'SU_YEK'
        ? 4.2
        : this.type === 'YEK_KOMUTAN'
        ? 3.6
        : this.type === 'DEMIR_YEK'
        ? 2.8
        : 3.0;

    if (!canAttack) {
      this.state = 'ENCIRCLE';
      const offset = coordinator.getEncircleOffset(this.encircleIndex, 4, 5.0);
      const targetX = playerPos.x + offset.x;
      const targetZ = playerPos.z + offset.z;
      const toTargetX = targetX - this.position.x;
      const toTargetZ = targetZ - this.position.z;
      const tDist = Math.hypot(toTargetX, toTargetZ);

      if (tDist > 0.5) {
        this.position.x += (toTargetX / tDist) * speed * deltaTime;
        this.position.z += (toTargetZ / tDist) * speed * deltaTime;
      }
    } else {
      // Doğrudan oyuncunun üzerine ilerleme
      if (dist > (this.type === 'KARA_KIS_GOLGE' ? 9.0 : 2.2)) {
        this.position.x += Math.sin(this.heading) * speed * deltaTime;
        this.position.z += Math.cos(this.heading) * speed * deltaTime;
      }
    }

    this.position.y = world.getHeightAt(this.position.x, this.position.z);
    this.root.position.copyFrom(this.position);
  }

  private updateTelegraph(deltaTime: number): {
    isAttacking: boolean;
    isMelee: boolean;
    damage: number;
    isFrost?: boolean;
    isFire?: boolean;
    isShieldBreaker?: boolean;
  } {
    this.stateTimer -= deltaTime;
    const pulse = 1.0 + Math.sin(this.stateTimer * 25.0) * 0.15;
    this.groundTelegraphRing.scaling.set(pulse, 1.0, pulse);

    if (this.stateTimer <= 0) {
      this.state = 'ATTACK';
      this.stateTimer = 0.28;
      this.groundTelegraphRing.setEnabled(false);
      const dmg =
        this.type === 'YEK_KOMUTAN'
          ? 36
          : this.type === 'DEMIR_YEK'
          ? 34
          : this.type === 'SU_YEK'
          ? 26
          : this.type === 'KARA_YILAN'
          ? 25
          : this.type === 'YEK'
          ? 24
          : this.type === 'SU_ALBIZI'
          ? 22
          : this.type === 'YILAN_ALBIZ'
          ? 22
          : this.type === 'KOR_ALBIZ'
          ? 20
          : this.type === 'ZEHIRLI_SAZAN_SURUSU'
          ? 18
          : 16;
      ProceduralAudio.playSwordSwing(2);
      return {
        isAttacking: true,
        isMelee: this.type !== 'KARA_KIS_GOLGE' && this.type !== 'KOR_ALBIZ' && this.type !== 'YILAN_ALBIZ' && this.type !== 'SU_ALBIZI',
        damage: dmg,
        isFrost: this.type === 'KARA_KIS_GOLGE',
        isFire: this.type === 'KOR_ALBIZ',
        isShieldBreaker: this.type === 'DEMIR_YEK'
      };
    }

    return { isAttacking: false, isMelee: false, damage: 0 };
  }

  private updateAttack(
    deltaTime: number,
    playerPos: Vector3,
    coordinator: EnemyCoordinator
  ): { isAttacking: boolean; isMelee: boolean; damage: number } {
    this.stateTimer -= deltaTime;
    if (this.stateTimer <= 0) {
      this.state = 'ALERT';
      this.attackCooldown = this.type === 'YEK_KOMUTAN' ? 2.8 : 2.2;
      coordinator.releaseAttackToken(this);
    }
    return { isAttacking: false, isMelee: false, damage: 0 };
  }

  private updateStagger(deltaTime: number): void {
    this.staggerTimer -= deltaTime;
    this.bodyMesh.rotation.z = Math.sin(this.animTimer * 20.0) * 0.18;
    if (this.staggerTimer <= 0) {
      this.state = 'ALERT';
      this.bodyMesh.rotation.z = 0;
    }
  }

  private updateFlee(playerPos: Vector3, deltaTime: number, world: WorldManager): void {
    const awayHeading = Math.atan2(-this.scratchToPlayer.x, -this.scratchToPlayer.z);
    this.heading = awayHeading;
    this.root.rotation.y = this.heading;

    const speed = 4.5;
    this.position.x += Math.sin(this.heading) * speed * deltaTime;
    this.position.z += Math.cos(this.heading) * speed * deltaTime;
    this.position.y = world.getHeightAt(this.position.x, this.position.z);
    this.root.position.copyFrom(this.position);
  }

  /**
   * Hasar Alma ve Kalkan Kırma Mekaniği
   */
  public takeTypedDamage(
    amount: number,
    damageType: DamageType,
    isShieldBreaker: boolean,
    isSneakStrike = false,
    hitNormal?: Vector3,
    lootManager?: LootManager
  ): number {
    if (this.isDead) return 0;

    // 1. Sessiz Vuruş (Sneak Strike)
    if (isSneakStrike) {
      amount *= 3.0; // x3 Kritik Suikast Hasarı
      ProceduralAudio.playImpact(true);
      this.triggerStagger(1.8);
    }

    // 2. Kalkan Bloklama Kontrolü
    if (this.hasShield && this.isGuarding && !isSneakStrike && hitNormal) {
      const forwardX = Math.sin(this.heading);
      const forwardZ = Math.cos(this.heading);
      const dot = forwardX * hitNormal.x + forwardZ * hitNormal.z;

      if (dot > 0.25) {
        // Önden gelen vuruş kalkanla karşılaşır
        if (isShieldBreaker) {
          // Kalkan Kırılır!
          this.isGuarding = false;
          if (this.shieldMesh) this.shieldMesh.position.y = -2.0;
          this.triggerStagger(2.2);
          ProceduralAudio.playImpact(true);
          amount *= 1.25;
        } else {
          // Tam Bloklama (Hasar %80 azalır)
          amount *= 0.2;
          ProceduralAudio.playShieldBlock();
          return amount;
        }
      }
    }

    // Kor Albız: Ateşe %100 bağışık, buza karşı aşırı zayıf (%200 hasar)
    if (this.type === 'KOR_ALBIZ') {
      if (damageType === 'FIRE') {
        ProceduralAudio.playFlameIgnition();
        return 0; // Ateş hasarı işlemez!
      } else if (damageType === 'FROST') {
        amount *= 2.0; // Buz şoku
        ProceduralAudio.playSteamHiss();
      }
    }

    // Su yaratıkları (Su Yek, Yılan Albız, Su Albızı, Zehirli Sazan, Kara Yılan): ateşe karşı zayıftır
    if (this.type === 'SU_YEK' || this.type === 'YILAN_ALBIZ' || this.type === 'SU_ALBIZI' || this.type === 'ZEHIRLI_SAZAN_SURUSU' || this.type === 'KARA_YILAN') {
      if (damageType === 'FIRE') {
        amount *= 1.6; // Alev buharlaştırma hasarı
        ProceduralAudio.playFlameIgnition();
      }
    }

    // Demir Yek: Ağır zırhlı; arkadan vuruş veya sersemletilme durumunda zırhı yarılır
    if (this.type === 'DEMIR_YEK') {
      const isStaggered = this.staggerTimer > 0;
      let isBackstab = false;
      if (hitNormal) {
        const forwardX = Math.sin(this.heading);
        const forwardZ = Math.cos(this.heading);
        const dot = forwardX * hitNormal.x + forwardZ * hitNormal.z;
        if (dot < -0.2) isBackstab = true;
      }
      if (isStaggered || isBackstab) {
        amount *= 1.45;
        ProceduralAudio.playCrit();
      }
    }

    let resist = 0;
    switch (damageType) {
      case 'SLASH': resist = this.resistances.slashResist; break;
      case 'BLUNT': resist = this.resistances.bluntResist; break;
      case 'FIRE': resist = this.resistances.fireResist; break;
      case 'FROST': resist = this.resistances.frostResist; break;
    }
    const mult = Math.max(0.0, 1.0 - resist);
    const finalDamage = amount * mult;
    this.health = Math.max(0, this.health - finalDamage);

    ProceduralAudio.playImpact(false);
    if (!this.isAware) {
      this.triggerAlert();
    }

    if (this.health <= 0) {
      this.die(lootManager);
    } else if (finalDamage > 25) {
      this.triggerStagger(0.45);
    }

    return finalDamage;
  }

  public triggerParryStagger(): void {
    this.triggerStagger(2.4);
    if (this.hasShield) {
      this.isGuarding = false;
    }
  }

  public triggerStagger(duration: number): void {
    this.state = 'STAGGER';
    this.staggerTimer = duration;
    this.groundTelegraphRing.setEnabled(false);
  }

  private die(lootManager?: LootManager): void {
    this.isDead = true;
    this.state = 'DEAD';
    this.root.setEnabled(false);

    // Ganimet Düşürme
    if (lootManager) {
      if (this.type === 'ALBIZ_SPIRIT') {
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 1);
      } else if (this.type === 'KARA_KIS_GOLGE') {
        lootManager.spawnLootDrop(this.position, 'ARROWS', 5);
      } else if (this.type === 'YEK') {
        lootManager.spawnLootDrop(this.position, 'IRON_ORE', 1);
        lootManager.spawnLootDrop(this.position, 'HEALTH_FRUIT', 1);
      } else if (this.type === 'YEK_KOMUTAN') {
        lootManager.spawnLootDrop(this.position, 'DEMON_BONE', 2);
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 2);
        lootManager.spawnLootDrop(this.position, 'HEALTH_FRUIT', 1);
      } else if (this.type === 'DEMIR_YEK') {
        lootManager.spawnLootDrop(this.position, 'IRON_ORE', 2);
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 1);
      } else if (this.type === 'KOR_ALBIZ') {
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 2);
      } else if (this.type === 'SU_YEK') {
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 2);
        lootManager.spawnLootDrop(this.position, 'HEALTH_FRUIT', 1);
      } else if (this.type === 'YILAN_ALBIZ') {
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 1);
        lootManager.spawnLootDrop(this.position, 'HEALTH_FRUIT', 1);
      } else if (this.type === 'SU_ALBIZI') {
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 2);
        lootManager.spawnLootDrop(this.position, 'HEALTH_FRUIT', 1);
      } else if (this.type === 'ZEHIRLI_SAZAN_SURUSU') {
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 1);
      } else if (this.type === 'KARA_YILAN') {
        lootManager.spawnLootDrop(this.position, 'KUT_DUST', 2);
        lootManager.spawnLootDrop(this.position, 'HEALTH_FRUIT', 1);
      }
    }

    EventBus.emit('enemy:killed', { enemyId: this.id, type: this.type });
  }

  public dispose(): void {
    this.root.dispose();
    this.matArmor.dispose();
    this.matFlesh.dispose();
    this.matWeapon.dispose();
    this.matRuneGlow.dispose();
    this.matIndicatorYellow.dispose();
    this.matIndicatorRed.dispose();
    this.matHpTrack.dispose();
    this.matHpFill.dispose();
    this.matTelegraphRing.dispose();
  }
}
