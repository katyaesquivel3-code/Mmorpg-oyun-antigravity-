import {
  Mesh,
  InstancedMesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  ShadowGenerator
} from '@babylonjs/core';
import { WorldNoise } from './WorldNoise';
import { Chunk } from './Chunk';

export class FoliageManager {
  private scene: Scene;
  private noise: WorldNoise;
  private shadowGen: ShadowGenerator | null;

  // Master Prototypes (Single-material, valid positions, normals & UVs)
  public birchPrototype: Mesh;
  public pinePrototype: Mesh;
  public rockPrototype: Mesh;
  public bushPrototype: Mesh;
  public flowerPrototype: Mesh;

  // Track InstancedMesh instances per chunk key
  private chunkFoliageMap: Map<string, InstancedMesh[]> = new Map();

  // Density factor (1.0 = High, 0.7 = Medium, 0.35 = Low)
  public densityMultiplier = 0.7;

  constructor(scene: Scene, noise: WorldNoise, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.noise = noise;
    this.shadowGen = shadowGen;

    this.birchPrototype = this.createBirchPrototype();
    this.pinePrototype = this.createPinePrototype();
    this.rockPrototype = this.createRockPrototype();
    this.bushPrototype = this.createBushPrototype();
    this.flowerPrototype = this.createFlowerPrototype();
  }

  private createBirchPrototype(): Mesh {
    const matLeaves = new StandardMaterial('mat_birch_leaves', this.scene);
    matLeaves.diffuseColor = new Color3(0.25, 0.72, 0.28); // Vibrant birch green
    matLeaves.specularColor = new Color3(0.04, 0.04, 0.04);
    matLeaves.ambientColor = new Color3(0.2, 0.3, 0.2);

    // Stylized low-poly biconical foliage crown with complete UVs
    const crown = MeshBuilder.CreateSphere('proto_birch', { diameterX: 2.2, diameterY: 4.2, diameterZ: 2.2, segments: 6 }, this.scene);
    crown.position.y = 2.4;
    crown.material = matLeaves;
    crown.isVisible = false; // Hidden template
    if (this.shadowGen) this.shadowGen.addShadowCaster(crown);
    return crown;
  }

  private createPinePrototype(): Mesh {
    const matNeedles = new StandardMaterial('mat_pine_needles', this.scene);
    matNeedles.diffuseColor = new Color3(0.12, 0.42, 0.2); // Dark evergreen
    matNeedles.specularColor = new Color3(0.04, 0.04, 0.04);
    matNeedles.ambientColor = new Color3(0.1, 0.25, 0.15);

    // Low-poly evergreen cone with complete positions, normals, and UVs
    const pine = MeshBuilder.CreateCylinder('proto_pine', { height: 4.8, diameterTop: 0.1, diameterBottom: 2.8, tessellation: 7 }, this.scene);
    pine.position.y = 2.4;
    pine.material = matNeedles;
    pine.isVisible = false;
    if (this.shadowGen) this.shadowGen.addShadowCaster(pine);
    return pine;
  }

  private createRockPrototype(): Mesh {
    const matRock = new StandardMaterial('mat_proto_rock', this.scene);
    matRock.diffuseColor = new Color3(0.48, 0.45, 0.42);
    matRock.specularColor = new Color3(0.08, 0.08, 0.08);
    matRock.ambientColor = new Color3(0.25, 0.22, 0.2);

    // CreateBox has guaranteed complete positions, normals, and UVs (attribute 2 safe!)
    const rock = MeshBuilder.CreateBox('proto_rock', { width: 1.6, height: 1.1, depth: 1.4 }, this.scene);
    rock.position.y = 0.55;
    rock.material = matRock;
    rock.isVisible = false;
    if (this.shadowGen) this.shadowGen.addShadowCaster(rock);
    return rock;
  }

  private createBushPrototype(): Mesh {
    const matBush = new StandardMaterial('mat_proto_bush', this.scene);
    matBush.diffuseColor = new Color3(0.28, 0.62, 0.24);
    matBush.specularColor = new Color3(0.04, 0.04, 0.04);

    const bush = MeshBuilder.CreateSphere('proto_bush', { diameterX: 1.5, diameterY: 0.9, diameterZ: 1.4, segments: 6 }, this.scene);
    bush.position.y = 0.45;
    bush.material = matBush;
    bush.isVisible = false;
    return bush;
  }

  private createFlowerPrototype(): Mesh {
    const matFlower = new StandardMaterial('mat_proto_flower', this.scene);
    matFlower.diffuseColor = new Color3(0.98, 0.82, 0.15); // Golden Kam flower
    matFlower.specularColor = new Color3(0.1, 0.1, 0.1);

    const flower = MeshBuilder.CreateSphere('proto_flower', { diameter: 0.45, segments: 5 }, this.scene);
    flower.position.y = 0.25;
    flower.material = matFlower;
    flower.isVisible = false;
    return flower;
  }

  /**
   * Spawns hardware-instanced meshes (InstancedMesh) for a chunk.
   * Completely immune to attribute 2 mismatch and out-of-range vertex index errors.
   */
  public populateChunk(chunk: Chunk): void {
    if (chunk.lod > 1) return; // Distant chunks (LOD2) skip foliage for performance

    const startX = chunk.cx * Chunk.CHUNK_SIZE;
    const startZ = chunk.cz * Chunk.CHUNK_SIZE;

    // Determinstic PRNG based on chunk coords
    let seed = Math.abs(chunk.cx * 73856093 ^ chunk.cz * 19349663);
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const chunkInstances: InstancedMesh[] = [];

    // Density based on biome and LOD
    const baseCount = Math.floor((chunk.lod === 0 ? 24 : 10) * chunk.biome.foliageDensity * this.densityMultiplier);

    for (let i = 0; i < baseCount; i++) {
      const lx = rnd() * (Chunk.CHUNK_SIZE - 4) + 2;
      const lz = rnd() * (Chunk.CHUNK_SIZE - 4) + 2;
      const wx = startX + lx;
      const wz = startZ + lz;
      const wy = this.noise.getHeight(wx, wz);

      // Do NOT spawn foliage submerged under water!
      if (wy < WorldNoise.WATER_LEVEL + 0.3) continue;

      const normal = this.noise.getNormal(wx, wz);
      const slope = 1.0 - normal[1];

      const scaleVar = 0.75 + rnd() * 0.5;
      const rotY = rnd() * Math.PI * 2;

      // Select prototype based on biome distribution
      let proto: Mesh;
      if (chunk.biome.type === 'DEMIR_DAG') {
        proto = (slope > 0.25 || rnd() < 0.65) ? this.rockPrototype : this.pinePrototype;
      } else if (chunk.biome.type === 'ALTAY') {
        proto = rnd() < 0.5 ? this.pinePrototype : this.rockPrototype;
      } else if (chunk.biome.type === 'SAHMARAN') {
        const r = rnd();
        proto = r < 0.4 ? this.bushPrototype : r < 0.7 ? this.rockPrototype : this.flowerPrototype;
      } else {
        // YER_SUB
        const r = rnd();
        proto = r < 0.35 ? this.birchPrototype : r < 0.65 ? this.pinePrototype : r < 0.85 ? this.bushPrototype : this.flowerPrototype;
      }

      // Create native Hardware InstancedMesh
      const inst = proto.createInstance(`fol_${chunk.key}_${i}`);
      inst.position.set(wx, wy, wz);
      inst.rotation.y = rotY;
      inst.scaling.set(scaleVar, scaleVar, scaleVar);
      inst.isPickable = false;
      inst.freezeWorldMatrix();

      chunkInstances.push(inst);
    }

    this.chunkFoliageMap.set(chunk.key, chunkInstances);
  }

  /**
   * Disposes of all hardware instances attached to a chunk when unstreamed.
   */
  public depopulateChunk(chunkKey: string): void {
    const instances = this.chunkFoliageMap.get(chunkKey);
    if (instances) {
      for (const inst of instances) {
        inst.dispose();
      }
      this.chunkFoliageMap.delete(chunkKey);
    }
  }
}
