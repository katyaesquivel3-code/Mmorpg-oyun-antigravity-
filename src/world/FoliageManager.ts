/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Thin Instance Tabanlı Bitki Örtüsü Yöneticisi (FoliageManager)
 * (Thin Instances, Chunk Başına Tek Matris Buffer, Çim Rüzgâr & Oyuncuya Eğilme Shader'ı, Çapraz-Quad LOD)
 */

import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  ShaderMaterial,
  Effect,
  Color3,
  Vector3,
  Vector2,
  Matrix,
  ShadowGenerator
} from '@babylonjs/core';
import { WorldNoise } from './WorldNoise';
import { Chunk } from './Chunk';
import { WindField } from './WindField';

export class FoliageManager {
  private scene: Scene;
  private noise: WorldNoise;
  private shadowGen: ShadowGenerator | null;

  // Master Şablon Prototipleri (Geometrileri paylaşılır, tek buffer üzerinden Thin Instance çizilir)
  public birchPrototype: Mesh;
  public pinePrototype: Mesh;
  public rockPrototype: Mesh;
  public bushPrototype: Mesh;
  public flowerPrototype: Mesh;
  public grassPrototype: Mesh;
  public crossQuadPrototype: Mesh;

  // Çim Rüzgâr & Eğilme Shader Materyali
  private grassMaterial: ShaderMaterial;

  // Chunk bazında Thin Instance mesh listesi
  private chunkThinMeshes: Map<string, Mesh[]> = new Map();

  // Kaliteye bağlı yoğunluk çarpanı
  public densityMultiplier = 0.75;

  // Rüzgâr ve oyuncu konumu (Shader uniform'ları için)
  private windField: WindField;

  constructor(scene: Scene, noise: WorldNoise, shadowGen: ShadowGenerator | null = null) {
    this.scene = scene;
    this.noise = noise;
    this.shadowGen = shadowGen;
    this.windField = WindField.getInstance();

    this.grassMaterial = this.createGrassShaderMaterial();

    this.birchPrototype = this.createBirchPrototype();
    this.pinePrototype = this.createPinePrototype();
    this.rockPrototype = this.createRockPrototype();
    this.bushPrototype = this.createBushPrototype();
    this.flowerPrototype = this.createFlowerPrototype();
    this.grassPrototype = this.createGrassPrototype();
    this.crossQuadPrototype = this.createCrossQuadPrototype();
  }

  /**
   * Çim Rüzgâr Salınımı & Oyuncuya Eğilme (Bend) Shader'ı
   */
  private createGrassShaderMaterial(): ShaderMaterial {
    Effect.ShadersStore['otukenGrassVertexShader'] = `
      precision highp float;

      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      attribute mat4 world0;
      attribute mat4 world1;
      attribute mat4 world2;
      attribute mat4 world3;

      uniform mat4 viewProjection;
      uniform vec2 uWindDir;
      uniform float uWindSpeed;
      uniform float uTime;
      uniform vec3 uPlayerPos;

      varying vec2 vUV;
      varying float vHeight;

      void main(void) {
        vUV = uv;
        vHeight = position.y;

        // Thin instance dünya matrisi bileşimi
        mat4 finalWorld = mat4(world0, world1, world2, world3);
        vec4 worldPos = finalWorld * vec4(position, 1.0);

        // Yalnızca yaprak uçları (position.y > 0.08) rüzgâr ve etkileşimden etkilenir
        if (position.y > 0.08) {
          // 1. Rüzgâr Dalgalanması
          float windWave = sin(worldPos.x * 0.45 + worldPos.z * 0.45 + uTime * (uWindSpeed * 0.8)) * 0.16;
          worldPos.xz += uWindDir * (windWave * position.y);

          // 2. Oyuncuya Eğilme (Player Bending - Çimler oyuncunun altından dışa doğru yatar)
          vec3 toPlayer = worldPos.xyz - uPlayerPos;
          toPlayer.y = 0.0;
          float playerDist = length(toPlayer);
          float bendRadius = 1.6;

          if (playerDist < bendRadius && playerDist > 0.02) {
            float bendFactor = (1.0 - playerDist / bendRadius);
            vec3 pushDir = normalize(toPlayer);
            worldPos.xz += pushDir.xz * (bendFactor * 0.55 * position.y);
            worldPos.y -= bendFactor * 0.22 * position.y;
          }
        }

        gl_Position = viewProjection * worldPos;
      }
    `;

    Effect.ShadersStore['otukenGrassPixelShader'] = `
      precision highp float;

      varying vec2 vUV;
      varying float vHeight;

      void main(void) {
        // Kökten uca doğru gölgeli bozkır yeşili renk gradyanı
        vec3 rootColor = vec3(0.12, 0.35, 0.15);
        vec3 tipColor = vec3(0.48, 0.78, 0.22);
        vec3 finalColor = mix(rootColor, tipColor, clamp(vHeight * 1.5, 0.0, 1.0));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const mat = new ShaderMaterial(
      'mat_otuken_grass',
      this.scene,
      {
        vertex: 'otukenGrass',
        fragment: 'otukenGrass'
      },
      {
        attributes: ['position', 'normal', 'uv', 'world0', 'world1', 'world2', 'world3'],
        uniforms: ['viewProjection', 'uWindDir', 'uWindSpeed', 'uTime', 'uPlayerPos']
      }
    );

    mat.setVector2('uWindDir', new Vector2(0.707, 0.707));
    mat.setFloat('uWindSpeed', 4.5);
    mat.setFloat('uTime', 0);
    mat.setVector3('uPlayerPos', new Vector3(0, 0, 0));
    return mat;
  }

  private createBirchPrototype(): Mesh {
    const mat = new StandardMaterial('mat_proto_birch', this.scene);
    mat.diffuseColor = new Color3(0.25, 0.72, 0.28);
    mat.specularColor = new Color3(0.04, 0.04, 0.04);
    mat.ambientColor = new Color3(0.2, 0.3, 0.2);
    mat.freeze();

    const crown = MeshBuilder.CreateSphere('proto_birch', { diameterX: 2.2, diameterY: 4.2, diameterZ: 2.2, segments: 6 }, this.scene);
    crown.position.y = 2.4;
    crown.material = mat;
    crown.isVisible = false;
    if (this.shadowGen) this.shadowGen.addShadowCaster(crown);
    return crown;
  }

  private createPinePrototype(): Mesh {
    const mat = new StandardMaterial('mat_proto_pine', this.scene);
    mat.diffuseColor = new Color3(0.12, 0.42, 0.2);
    mat.specularColor = new Color3(0.04, 0.04, 0.04);
    mat.freeze();

    const pine = MeshBuilder.CreateCylinder('proto_pine', { height: 4.8, diameterTop: 0.1, diameterBottom: 2.8, tessellation: 7 }, this.scene);
    pine.position.y = 2.4;
    pine.material = mat;
    pine.isVisible = false;
    if (this.shadowGen) this.shadowGen.addShadowCaster(pine);
    return pine;
  }

  private createRockPrototype(): Mesh {
    const mat = new StandardMaterial('mat_proto_rock', this.scene);
    mat.diffuseColor = new Color3(0.48, 0.45, 0.42);
    mat.specularColor = new Color3(0.08, 0.08, 0.08);
    mat.freeze();

    const rock = MeshBuilder.CreateBox('proto_rock', { width: 1.6, height: 1.1, depth: 1.4 }, this.scene);
    rock.position.y = 0.55;
    rock.material = mat;
    rock.isVisible = false;
    if (this.shadowGen) this.shadowGen.addShadowCaster(rock);
    return rock;
  }

  private createBushPrototype(): Mesh {
    const mat = new StandardMaterial('mat_proto_bush', this.scene);
    mat.diffuseColor = new Color3(0.28, 0.62, 0.24);
    mat.freeze();

    const bush = MeshBuilder.CreateSphere('proto_bush', { diameterX: 1.5, diameterY: 0.9, diameterZ: 1.4, segments: 6 }, this.scene);
    bush.position.y = 0.45;
    bush.material = mat;
    bush.isVisible = false;
    return bush;
  }

  private createFlowerPrototype(): Mesh {
    const mat = new StandardMaterial('mat_proto_flower', this.scene);
    mat.diffuseColor = new Color3(0.98, 0.82, 0.15); // Altın Kam çiçeği
    mat.freeze();

    const flower = MeshBuilder.CreateSphere('proto_flower', { diameter: 0.45, segments: 5 }, this.scene);
    flower.position.y = 0.25;
    flower.material = mat;
    flower.isVisible = false;
    return flower;
  }

  private createGrassPrototype(): Mesh {
    // 3 yapraklı tabandan yukarı uzanan çim modeli
    const grass = MeshBuilder.CreateCylinder('proto_grass', { height: 0.75, diameterTop: 0.85, diameterBottom: 0.15, tessellation: 5 }, this.scene);
    grass.position.y = 0.375;
    grass.material = this.grassMaterial;
    grass.isVisible = false;
    return grass;
  }

  private createCrossQuadPrototype(): Mesh {
    // Uzak mesafeler için 2 çapraz dikey dörtgen (X-billboard LOD)
    const mat = new StandardMaterial('mat_proto_cross_quad', this.scene);
    mat.diffuseColor = new Color3(0.28, 0.55, 0.22);
    mat.specularColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    mat.freeze();

    const p1 = MeshBuilder.CreatePlane('p1', { size: 1.4 }, this.scene);
    p1.position.y = 0.7;
    const p2 = MeshBuilder.CreatePlane('p2', { size: 1.4 }, this.scene);
    p2.position.y = 0.7;
    p2.rotation.y = Math.PI * 0.5;

    const cross = Mesh.MergeMeshes([p1, p2], true, true, undefined, false, true)!;
    cross.name = 'proto_cross_quad';
    cross.material = mat;
    cross.isVisible = false;
    return cross;
  }

  /**
   * Kutsal Anıtlar, Yurtlar ve Bengü Taşların çevresinde bitki/kaya çakışmasını engeller
   */
  private isInLandmarkExclusionZone(wx: number, wz: number): boolean {
    if ((wx - 0) ** 2 + (wz - 28) ** 2 < 196) return true; // Bay Terek
    if ((wx - 0) ** 2 + (wz - (-2)) ** 2 < 400) return true; // Oba & Yurts
    if ((wx - 0) ** 2 + (wz - (-16)) ** 2 < 49) return true; // Yer-Sub Bengü Taşı
    if ((wx - (-85)) ** 2 + (wz - 95) ** 2 < 64) return true; // Ergenekon Bengü Taşı
    if ((wx - (-95)) ** 2 + (wz - (-80)) ** 2 < 64) return true; // Şahmaran Bengü Taşı
    if ((wx - 80) ** 2 + (wz - 90) ** 2 < 64) return true; // Altay Bengü Taşı
    if ((wx - (-45)) ** 2 + (wz - (-15)) ** 2 < 196) return true; // 12 Kam Mabedi
    if ((wx - (-55)) ** 2 + (wz - 20) ** 2 < 225) return true; // Kurgan 1
    if ((wx - 60) ** 2 + (wz - (-40)) ** 2 < 289) return true; // Kurgan 2
    return false;
  }

  /**
   * Chunk için Thin Instance Buffer'ı oluşturur ve sahneye ekler (Tek Draw Call per tür)
   */
  public populateChunk(chunk: Chunk): void {
    if (chunk.lod >= 3) return; // LOD3 sisle gizli en dış halka

    const startX = chunk.cx * Chunk.CHUNK_SIZE;
    const startZ = chunk.cz * Chunk.CHUNK_SIZE;

    let seed = Math.abs(chunk.cx * 73856093 ^ chunk.cz * 19349663);
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Tür bazında matris listeleri
    const matricesByType: { [key: string]: number[] } = {
      birch: [],
      pine: [],
      rock: [],
      bush: [],
      flower: [],
      grass: [],
      crossQuad: []
    };

    const isFarLOD = chunk.lod === 2;
    const baseCount = Math.floor((chunk.lod === 0 ? 32 : chunk.lod === 1 ? 16 : 8) * chunk.biome.foliageDensity * this.densityMultiplier);

    const tempMat = new Matrix();

    for (let i = 0; i < baseCount; i++) {
      const lx = rnd() * (Chunk.CHUNK_SIZE - 4) + 2;
      const lz = rnd() * (Chunk.CHUNK_SIZE - 4) + 2;
      const wx = startX + lx;
      const wz = startZ + lz;

      if (this.isInLandmarkExclusionZone(wx, wz)) continue;

      const wy = this.noise.getHeight(wx, wz);
      if (wy < WorldNoise.WATER_LEVEL + 0.35) continue;

      const normal = this.noise.getNormal(wx, wz);
      const slope = 1.0 - normal[1];

      const scaleVar = 0.75 + rnd() * 0.5;
      const rotY = rnd() * Math.PI * 2;

      let typeKey = 'grass';

      if (isFarLOD) {
        // Uzak LOD'da çalı ve çimler tek bir çapraz-quad kartında birleşir
        typeKey = rnd() < 0.65 ? 'crossQuad' : (slope > 0.25 ? 'rock' : 'pine');
      } else {
        if (chunk.biome.type === 'DEMIR_DAG') {
          typeKey = (slope > 0.22 || rnd() < 0.65) ? 'rock' : 'pine';
        } else if (chunk.biome.type === 'ALTAY') {
          typeKey = rnd() < 0.55 ? 'pine' : 'rock';
        } else if (chunk.biome.type === 'SAHMARAN') {
          const r = rnd();
          typeKey = r < 0.35 ? 'bush' : r < 0.6 ? 'grass' : r < 0.8 ? 'rock' : 'flower';
        } else {
          // YER_SUB
          const r = rnd();
          typeKey = r < 0.28 ? 'birch' : r < 0.52 ? 'pine' : r < 0.78 ? 'grass' : r < 0.9 ? 'bush' : 'flower';
        }
      }

      // Matrisi hesapla ve diziye ekle (16 float)
      Matrix.ScalingToRef(scaleVar, scaleVar, scaleVar, tempMat);
      tempMat.setTranslationFromFloats(wx, wy, wz);
      tempMat.multiplyToRef(Matrix.RotationY(rotY), tempMat);

      const targetArr = matricesByType[typeKey];
      for (let m = 0; m < 16; m++) {
        targetArr.push(tempMat.asArray()[m]);
      }
    }

    const chunkMeshes: Mesh[] = [];

    // Her tür için tek bir Thin Instance Mesh oluştur
    const protoMap: { [key: string]: Mesh } = {
      birch: this.birchPrototype,
      pine: this.pinePrototype,
      rock: this.rockPrototype,
      bush: this.bushPrototype,
      flower: this.flowerPrototype,
      grass: this.grassPrototype,
      crossQuad: this.crossQuadPrototype
    };

    for (const [key, matData] of Object.entries(matricesByType)) {
      if (matData.length === 0) continue;

      const proto = protoMap[key];
      const thinMesh = proto.clone(`fol_thin_${key}_${chunk.key}`, null, false);
      thinMesh.isVisible = true;

      const buffer = new Float32Array(matData);
      thinMesh.thinInstanceSetBuffer('matrix', buffer, 16, true);
      thinMesh.isPickable = false;
      thinMesh.freezeWorldMatrix();

      chunkMeshes.push(thinMesh);
    }

    this.chunkThinMeshes.set(chunk.key, chunkMeshes);
  }

  /**
   * Rüzgâr ve oyuncu konumunu çim shader'ına günceller (Sıcak döngü)
   */
  public update(playerPos: Vector3, deltaTime: number): void {
    this.windField.update(deltaTime);

    this.grassMaterial.setVector2('uWindDir', new Vector2(this.windField.direction.x, this.windField.direction.z));
    this.grassMaterial.setFloat('uWindSpeed', this.windField.currentSpeed);
    this.grassMaterial.setFloat('uTime', performance.now() * 0.001);
    this.grassMaterial.setVector3('uPlayerPos', playerPos);
  }

  /**
   * Chunk görüşten çıktığında Thin Instance mesh'lerini temizler
   */
  public depopulateChunk(chunkKey: string): void {
    const meshes = this.chunkThinMeshes.get(chunkKey);
    if (meshes) {
      for (const m of meshes) {
        m.dispose(false, true);
      }
      this.chunkThinMeshes.delete(chunkKey);
    }
  }

  public dispose(): void {
    for (const meshes of this.chunkThinMeshes.values()) {
      for (const m of meshes) {
        m.dispose(false, true);
      }
    }
    this.chunkThinMeshes.clear();
    this.birchPrototype.dispose();
    this.pinePrototype.dispose();
    this.rockPrototype.dispose();
    this.bushPrototype.dispose();
    this.flowerPrototype.dispose();
    this.grassPrototype.dispose();
    this.crossQuadPrototype.dispose();
    this.grassMaterial.dispose();
  }
}
