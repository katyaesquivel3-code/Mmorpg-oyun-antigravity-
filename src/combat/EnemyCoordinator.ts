/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Düşman Saldırı Koordinatörü ve Uzamsal Izgara (EnemyCoordinator)
 * (Aynı Anda En Çok 2 Saldırgan Token'ı, Çevreleme/Kuşatma Pozisyonları, 10-15 Hz Zaman Dilimleme, Uzamsal Izgara & Sıfır GC)
 */

import { Vector3 } from '@babylonjs/core';
import { EnemyEntity } from './EnemyEntity';

export class EnemyCoordinator {
  private static instance: EnemyCoordinator | null = null;

  // Koordinasyon Sınırları
  public readonly MAX_CONCURRENT_ATTACKERS = 2;
  private currentAttackers: EnemyEntity[] = [];

  // AI Zaman Dilimleme (10-15 Hz Tick)
  private aiTickInterval = 0.08; // ~12.5 Hz
  private aiTickTimer = 0;
  public shouldTickAI = false;

  // Uzamsal Izgara (Spatial Partitioning Grid - 32m hücreler)
  private readonly GRID_CELL_SIZE = 32.0;
  private spatialGrid: Map<string, EnemyEntity[]> = new Map();

  // Sıcak döngü scratch nesneleri (Zero GC)
  private scratchEncirclePos = new Vector3(0, 0, 0);

  private constructor() {}

  public static getInstance(): EnemyCoordinator {
    if (!EnemyCoordinator.instance) {
      EnemyCoordinator.instance = new EnemyCoordinator();
    }
    return EnemyCoordinator.instance;
  }

  /**
   * Her karede AI zamanlayıcısını ve uzamsal ızgarayı günceller
   */
  public update(deltaTime: number, allEnemies: EnemyEntity[]): void {
    this.aiTickTimer += deltaTime;
    if (this.aiTickTimer >= this.aiTickInterval) {
      this.aiTickTimer = 0;
      this.shouldTickAI = true;
      this.rebuildSpatialGrid(allEnemies);
      this.cleanDeadAttackers();
    } else {
      this.shouldTickAI = false;
    }
  }

  /**
   * Uzamsal ızgarayı yeniden inşa eder
   */
  private rebuildSpatialGrid(allEnemies: EnemyEntity[]): void {
    this.spatialGrid.clear();
    for (let i = 0; i < allEnemies.length; i++) {
      const e = allEnemies[i];
      if (e.isDead) continue;

      const cellX = Math.floor(e.position.x / this.GRID_CELL_SIZE);
      const cellZ = Math.floor(e.position.z / this.GRID_CELL_SIZE);
      const key = `${cellX}_${cellZ}`;

      let cell = this.spatialGrid.get(key);
      if (!cell) {
        cell = [];
        this.spatialGrid.set(key, cell);
      }
      cell.push(e);
    }
  }

  /**
   * Belirli bir yarıçap içindeki düşmanları uzamsal ızgaradan sorgular
   */
  public queryNearbyEnemies(pos: Vector3, radius: number, outList: EnemyEntity[]): void {
    outList.length = 0;
    const minCellX = Math.floor((pos.x - radius) / this.GRID_CELL_SIZE);
    const maxCellX = Math.floor((pos.x + radius) / this.GRID_CELL_SIZE);
    const minCellZ = Math.floor((pos.z - radius) / this.GRID_CELL_SIZE);
    const maxCellZ = Math.floor((pos.z + radius) / this.GRID_CELL_SIZE);
    const radiusSq = radius * radius;

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = `${cx}_${cz}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const e = cell[i];
            const dx = e.position.x - pos.x;
            const dz = e.position.z - pos.z;
            if (dx * dx + dz * dz <= radiusSq) {
              outList.push(e);
            }
          }
        }
      }
    }
  }

  /**
   * Düşman saldırı token'ı talep eder (Aynı anda en çok 2 saldırgan)
   */
  public requestAttackToken(enemy: EnemyEntity): boolean {
    this.cleanDeadAttackers();

    if (this.currentAttackers.includes(enemy)) {
      return true;
    }

    if (this.currentAttackers.length < this.MAX_CONCURRENT_ATTACKERS) {
      this.currentAttackers.push(enemy);
      return true;
    }

    return false;
  }

  /**
   * Düşman saldırısını bitirdiğinde veya sersemlediğinde token'ı iade eder
   */
  public releaseAttackToken(enemy: EnemyEntity): void {
    const idx = this.currentAttackers.indexOf(enemy);
    if (idx !== -1) {
      this.currentAttackers.splice(idx, 1);
    }
  }

  /**
   * Token alamayan düşmanlar için kuşatma (encircle) hedef konumu hesaplar
   */
  public getEncircleOffset(index: number, totalSurrounding: number, radius = 5.2): { x: number; z: number } {
    const angleStep = (Math.PI * 2) / Math.max(1, totalSurrounding);
    const angle = index * angleStep;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius
    };
  }

  private cleanDeadAttackers(): void {
    for (let i = this.currentAttackers.length - 1; i >= 0; i--) {
      const e = this.currentAttackers[i];
      if (e.isDead || e.state === 'DEAD' || e.state === 'STAGGER' || e.state === 'IDLE') {
        this.currentAttackers.splice(i, 1);
      }
    }
  }

  public reset(): void {
    this.currentAttackers = [];
    this.spatialGrid.clear();
  }
}
