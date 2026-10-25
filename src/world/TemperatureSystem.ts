/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Çevre ve Vücut Isı Sistemi (TemperatureSystem)
 * (Demir Dağ & Ergenekon Aşırı Isı, Lav Yakınlığı, Naneli Ayran & Demir Dağ Seti Koruması,
 *  FAZ 11: Altay Gök Zirvesi Dondurucu Soğuğu, Kamp Ateşinde Isınma, Gök Seti Direnci,
 *  Gök Kutu Bağışıklığı, Donma Hasarı & Sıfır GC)
 */

import { Vector3 } from '@babylonjs/core';
import { EventBus } from '../infra/EventBus';
import { InventoryManager } from '../inventory/InventoryManager';
import { CombatSystem } from '../combat/CombatSystem';
import { KamPowerManager } from '../powers/KamPowerManager';

export interface TemperatureZone {
  center: Vector3;
  radius: number;
  heatBonus: number; // İlave sıcaklık (+°C) veya soğukluk (-°C)
}

export class TemperatureSystem {
  private static instance: TemperatureSystem | null = null;

  // Sıcaklık Değerleri (°C)
  public currentTemperature = 22.0; // Anlık hissedilen sıcaklık
  public baseBiomeTemperature = 22.0;

  // Sıcaklık Eşik Değerleri
  public readonly HEAT_THRESHOLD = 45.0; // 45°C üstü aşırı sıcaklık uyarısı
  public readonly EXTREME_HEAT_THRESHOLD = 65.0; // 65°C üstü yakıcı can kaybı

  // Soğuk Eşik Değerleri (Faz 11: Altay & Gök Zirve)
  public readonly COLD_THRESHOLD = -5.0; // -5°C altı üşüme uyarısı
  public readonly EXTREME_COLD_THRESHOLD = -15.0; // -15°C altı donma hasarı (Frostbite)

  // Hasar ve Telegraph Zamanlayıcıları
  public isTemperatureSystemActive = true;
  private damageTimer = 0.0;
  private coldDamageTimer = 0.0;
  private warningToastCooldown = 0.0;

  // Lav ve Ocak Isı Kaynakları (Sıcak Bölgeler)
  public heatZones: TemperatureZone[] = [];

  // Kamp Ateşi ve Meşale Isınma Kaynakları (Ilıman Bölgeler)
  public warmthZones: TemperatureZone[] = [];

  // Scratch nesnesi (Sıcak döngüde sıfır GC)
  private scratchPos = new Vector3(0, 0, 0);

  public static getInstance(): TemperatureSystem {
    if (!TemperatureSystem.instance) {
      TemperatureSystem.instance = new TemperatureSystem();
    }
    return TemperatureSystem.instance;
  }

  constructor() {
    this.initDefaultHeatSources();
    this.initDefaultWarmthSources();
  }

  /**
   * Demir Dağ ve Ergenekon Lav/Ocak Isı Kaynakları
   */
  private initDefaultHeatSources(): void {
    // 1. Ergenekon Ana Ocak Arenası (x: 160, z: 45)
    this.heatZones.push({
      center: new Vector3(160, 10, 45),
      radius: 55.0,
      heatBonus: 40.0
    });

    // 2. Ergenekon 7 Körük Ocağı Geçidi (x: 115, z: 20)
    this.heatZones.push({
      center: new Vector3(115, 12, 20),
      radius: 40.0,
      heatBonus: 32.0
    });

    // 3. Lav Nehri Kanyonu (x: 140, z: -15)
    this.heatZones.push({
      center: new Vector3(140, 6, -15),
      radius: 45.0,
      heatBonus: 35.0
    });
  }

  /**
   * Altay Gök Zirve Kamp Ateşi ve Isınma Menfezleri
   */
  private initDefaultWarmthSources(): void {
    // 1. Gök Zirve Alt Kamp Ateşi (x: 80, z: 90)
    this.warmthZones.push({
      center: new Vector3(80, 20, 90),
      radius: 12.0,
      heatBonus: 38.0
    });

    // 2. Umay Ana Mabedi Önü Kutsal Ateş (x: 140, z: 140)
    this.warmthZones.push({
      center: new Vector3(140, 28, 140),
      radius: 16.0,
      heatBonus: 42.0
    });

    // 3. Çığ Sığınak Mağarası Meşalesi (x: 110, z: 120)
    this.warmthZones.push({
      center: new Vector3(110, 24, 120),
      radius: 14.0,
      heatBonus: 35.0
    });
  }

  public registerHeatZone(center: Vector3, radius: number, heatBonus: number): void {
    this.heatZones.push({ center, radius, heatBonus });
  }

  public registerWarmthZone(center: Vector3, radius: number, heatBonus: number): void {
    this.warmthZones.push({ center, radius, heatBonus });
  }

  /**
   * Her Kare Sıcaklık, Soğukluk ve Direnç Hesaplaması (Sıfır GC)
   */
  public update(
    deltaTime: number,
    playerPos: Vector3,
    biomeName: string,
    isNight: boolean,
    combat: CombatSystem
  ): void {
    this.scratchPos.copyFrom(playerPos);

    // 1. Temel Biyom Sıcaklığı
    if (biomeName.includes('Ergenekon')) {
      this.baseBiomeTemperature = isNight ? 42.0 : 54.0;
    } else if (biomeName.includes('Demir Dağ')) {
      this.baseBiomeTemperature = isNight ? 28.0 : 46.0;
    } else if (biomeName.includes('Altay') || biomeName.includes('Gök Zirve') || biomeName.includes('Kar') || biomeName.includes('Soğuk')) {
      this.baseBiomeTemperature = isNight ? -30.0 : -18.0;
    } else {
      this.baseBiomeTemperature = isNight ? 16.0 : 24.0;
    }

    // 2. Çevredeki Lav ve Ocak Kaynaklarından Gelen Isı Katkısı
    let additionalHeat = 0.0;
    for (let i = 0; i < this.heatZones.length; i++) {
      const zone = this.heatZones[i];
      const dist = Vector3.Distance(this.scratchPos, zone.center);
      if (dist < zone.radius) {
        const factor = 1.0 - dist / zone.radius;
        additionalHeat = Math.max(additionalHeat, factor * zone.heatBonus);
      }
    }

    // 3. Kamp Ateşleri ve Meşalelerden Gelen Isınma Katkısı (Faz 11)
    let warmthBonus = 0.0;
    for (let i = 0; i < this.warmthZones.length; i++) {
      const zone = this.warmthZones[i];
      const dist = Vector3.Distance(this.scratchPos, zone.center);
      if (dist < zone.radius) {
        const factor = 1.0 - dist / zone.radius;
        warmthBonus = Math.max(warmthBonus, factor * zone.heatBonus);
      }
    }

    this.currentTemperature = this.baseBiomeTemperature + additionalHeat + warmthBonus;

    // 4. Korunma / Direnç ve Kut Gücü Kontrolleri:
    const inv = InventoryManager.getInstance();
    const kamPower = KamPowerManager.getInstance();

    // a) Isı Korunması (Sıcaklık)
    const hasHeatBuff = inv.hasBuff('HEAT_RESIST');
    const hasDemirDagFullSet = inv.hasSetBonus('DEMIR_DAG_SET');
    if (hasHeatBuff || hasDemirDagFullSet) {
      this.currentTemperature = Math.min(this.currentTemperature, 32.0);
    }

    // b) Soğuk Korunması (Faz 11: Altay & Gök Zirve)
    const hasColdBuff = inv.hasBuff('COLD_RESIST') || inv.hasBuff('ATTACK_BOOST');
    const hasGokSetFull = inv.hasSetBonus('GOK_SET');
    const hasGokKutuImmunity = kamPower && kamPower.hasGokKutu;

    // Gök Zırh Seti, Gök Kutu veya Sıcak Yemek tüketildiyse soğuk etkisiz kalır
    if (hasColdBuff || hasGokSetFull || hasGokKutuImmunity) {
      this.currentTemperature = Math.max(this.currentTemperature, 18.0);
    }

    // 5. Aşırı Sıcaklık Hasarı (> 45°C)
    if (this.currentTemperature > this.HEAT_THRESHOLD) {
      this.damageTimer += deltaTime;
      const isExtreme = this.currentTemperature > this.EXTREME_HEAT_THRESHOLD;
      const damageInterval = isExtreme ? 1.0 : 2.5;
      const damageAmount = isExtreme ? 8.0 : 4.0;

      if (this.damageTimer >= damageInterval) {
        this.damageTimer = 0.0;
        combat.health = Math.max(0, combat.health - damageAmount);
        combat.addCameraTrauma(0.35);

        EventBus.emit('ui:loot_toast', {
          text: `🔥 AŞIRI SICAKLIK (${Math.round(this.currentTemperature)}°C): Naneli Ayran iç veya Demir Dağ Zırhı kuşan!`
        });
      }
    } else {
      this.damageTimer = 0.0;
    }

    // 6. Dondurucu Soğuk Hasarı (< -15°C) - Faz 11
    if (this.currentTemperature < this.EXTREME_COLD_THRESHOLD) {
      this.coldDamageTimer += deltaTime;
      const coldInterval = 1.5;
      const coldDamage = 5.0;

      if (this.coldDamageTimer >= coldInterval) {
        this.coldDamageTimer = 0.0;
        combat.health = Math.max(0, combat.health - coldDamage);
        combat.addCameraTrauma(0.25);

        EventBus.emit('ui:loot_toast', {
          text: `❄️ DONDURUCU SOĞUK (${Math.round(this.currentTemperature)}°C): Ateş başına sığın, Gök Seti kuşan ya da Talkan/Kurut ye!`
        });
      }

      this.warningToastCooldown += deltaTime;
      if (this.warningToastCooldown >= 14.0) {
        this.warningToastCooldown = 0.0;
        EventBus.emit('ui:loot_toast', {
          text: '⚠️ Bedenin donuyor! Kamp ateşine yaklaş veya sıcak yemek tüket.'
        });
      }
    } else {
      this.coldDamageTimer = 0.0;
    }
  }

  public getTemperatureDisplay(): { tempC: number; status: 'COLD' | 'COMFORTABLE' | 'HOT' | 'EXTREME' } {
    const t = Math.round(this.currentTemperature);
    if (t < this.COLD_THRESHOLD) return { tempC: t, status: 'COLD' };
    if (t > this.EXTREME_HEAT_THRESHOLD) return { tempC: t, status: 'EXTREME' };
    if (t > this.HEAT_THRESHOLD) return { tempC: t, status: 'HOT' };
    return { tempC: t, status: 'COMFORTABLE' };
  }
}
