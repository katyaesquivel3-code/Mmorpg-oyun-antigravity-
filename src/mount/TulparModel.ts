/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Efsanevi Kanatlı At: TULPAR (TulparModel)
 * (Prosedürel İskelet: Gövde, Boyun, Baş, 4 Bacak, 3 Segmentli Kanatlar, Kuyruk Yay-Sönüm & Işıltı)
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

export class TulparModel {
  public root: TransformNode;
  public bodyMesh: Mesh;
  public neckNode: TransformNode;
  public headNode: TransformNode;

  // 4 Bacak
  public legFL: TransformNode;
  public legFR: TransformNode;
  public legBL: TransformNode;
  public legBR: TransformNode;

  // 3 Segmentli Kanatlar
  public wingLeft: TransformNode[] = [];
  public wingRight: TransformNode[] = [];

  // Kuyruk ve Yay-Sönüm
  public tailNode: TransformNode;
  private tailAngle = 0;
  private tailVelocity = 0;

  // Animasyon Fazı
  private animTimer = 0;

  constructor(scene: Scene, shadowGen: ShadowGenerator | null = null) {
    this.root = new TransformNode('tulpar_root', scene);

    // Kutsal Beyaz & Gök Mavisi Işıltılı Materyal
    const matBody = new StandardMaterial('mat_tulpar_body', scene);
    matBody.diffuseColor = new Color3(0.95, 0.98, 1.0);
    matBody.emissiveColor = new Color3(0.15, 0.25, 0.35);
    matBody.specularColor = new Color3(0.6, 0.8, 1.0);

    const matGold = new StandardMaterial('mat_tulpar_gold', scene);
    matGold.diffuseColor = new Color3(0.9, 0.8, 0.3);
    matGold.emissiveColor = new Color3(0.2, 0.18, 0.05);

    const matFeather = new StandardMaterial('mat_tulpar_feather', scene);
    matFeather.diffuseColor = new Color3(0.9, 0.95, 1.0);
    matFeather.emissiveColor = new Color3(0.1, 0.2, 0.3);
    matFeather.alpha = 0.92;

    // 1. Gövde
    this.bodyMesh = MeshBuilder.CreateBox('tulpar_body', { width: 1.1, height: 1.35, depth: 2.4 }, scene);
    this.bodyMesh.position.y = 1.45;
    this.bodyMesh.material = matBody;
    this.bodyMesh.parent = this.root;
    if (shadowGen) shadowGen.addShadowCaster(this.bodyMesh);

    // 2. Boyun ve Baş
    this.neckNode = new TransformNode('tulpar_neck', scene);
    this.neckNode.position.set(0, 2.0, 1.0);
    this.neckNode.rotation.x = -0.55;
    this.neckNode.parent = this.root;

    const neckMesh = MeshBuilder.CreateBox('tulpar_neck_mesh', { width: 0.6, height: 1.2, depth: 0.8 }, scene);
    neckMesh.material = matBody;
    neckMesh.parent = this.neckNode;

    this.headNode = new TransformNode('tulpar_head', scene);
    this.headNode.position.set(0, 0.65, 0.45);
    this.headNode.parent = this.neckNode;

    const headMesh = MeshBuilder.CreateBox('tulpar_head_mesh', { width: 0.5, height: 0.55, depth: 0.9 }, scene);
    headMesh.material = matBody;
    headMesh.parent = this.headNode;

    // Altın Boynuz / Alın Süsü
    const horn = MeshBuilder.CreateCylinder('tulpar_horn', { diameterTop: 0.02, diameterBottom: 0.12, height: 0.6 }, scene);
    horn.rotation.x = 0.45;
    horn.position.set(0, 0.35, 0.2);
    horn.material = matGold;
    horn.parent = this.headNode;

    // 3. Dört Bacak
    this.legFL = this.createLeg('legFL', -0.45, 0.95, scene, matBody);
    this.legFR = this.createLeg('legFR', 0.45, 0.95, scene, matBody);
    this.legBL = this.createLeg('legBL', -0.45, -0.95, scene, matBody);
    this.legBR = this.createLeg('legBR', 0.45, -0.95, scene, matBody);

    // 4. 3 Segmentli Kanatlar (Sol & Sağ)
    this.wingLeft = this.createWing('wingL', -1, scene, matFeather, matGold);
    this.wingRight = this.createWing('wingR', 1, scene, matFeather, matGold);

    // 5. Kuyruk
    this.tailNode = new TransformNode('tulpar_tail', scene);
    this.tailNode.position.set(0, 1.8, -1.2);
    this.tailNode.parent = this.root;

    const tailMesh = MeshBuilder.CreateCylinder('tulpar_tail_mesh', { diameterTop: 0.25, diameterBottom: 0.05, height: 1.4 }, scene);
    tailMesh.rotation.x = 0.35;
    tailMesh.position.y = -0.65;
    tailMesh.material = matBody;
    tailMesh.parent = this.tailNode;
  }

  private createLeg(name: string, offsetX: number, offsetZ: number, scene: Scene, mat: StandardMaterial): TransformNode {
    const hip = new TransformNode(`hip_${name}`, scene);
    hip.position.set(offsetX, 1.4, offsetZ);
    hip.parent = this.root;

    const upperLeg = MeshBuilder.CreateCylinder(`${name}_upper`, { diameter: 0.28, height: 0.75 }, scene);
    upperLeg.position.y = -0.35;
    upperLeg.material = mat;
    upperLeg.parent = hip;

    const knee = new TransformNode(`knee_${name}`, scene);
    knee.position.y = -0.7;
    knee.parent = hip;

    const lowerLeg = MeshBuilder.CreateCylinder(`${name}_lower`, { diameter: 0.2, height: 0.75 }, scene);
    lowerLeg.position.y = -0.35;
    lowerLeg.material = mat;
    lowerLeg.parent = knee;

    return hip;
  }

  private createWing(prefix: string, side: number, scene: Scene, matFeather: StandardMaterial, matGold: StandardMaterial): TransformNode[] {
    const segments: TransformNode[] = [];

    // Segment 1: Omuz Mafsalı
    const s1 = new TransformNode(`${prefix}_seg1`, scene);
    s1.position.set(side * 0.55, 1.9, 0.15);
    s1.parent = this.root;

    const m1 = MeshBuilder.CreateBox(`${prefix}_mesh1`, { width: 0.8, height: 0.12, depth: 0.4 }, scene);
    m1.position.x = side * 0.4;
    m1.material = matGold;
    m1.parent = s1;
    segments.push(s1);

    // Segment 2: Ana Kanat Gövdesi
    const s2 = new TransformNode(`${prefix}_seg2`, scene);
    s2.position.set(side * 0.8, 0, 0);
    s2.parent = s1;

    const m2 = MeshBuilder.CreateBox(`${prefix}_mesh2`, { width: 1.4, height: 0.08, depth: 0.7 }, scene);
    m2.position.x = side * 0.7;
    m2.material = matFeather;
    m2.parent = s2;
    segments.push(s2);

    // Segment 3: Uç Telekler
    const s3 = new TransformNode(`${prefix}_seg3`, scene);
    s3.position.set(side * 1.4, 0, 0);
    s3.parent = s2;

    const m3 = MeshBuilder.CreateBox(`${prefix}_mesh3`, { width: 1.6, height: 0.05, depth: 0.85 }, scene);
    m3.position.x = side * 0.8;
    m3.material = matFeather;
    m3.parent = s3;
    segments.push(s3);

    return segments;
  }

  /**
   * Tulpar Hareketi ve Kanat Animasyonu
   */
  public updateAnimation(speed: number, isFlying: boolean, isAirborne: boolean, deltaTime: number): void {
    this.animTimer += deltaTime * (speed > 5 ? 12 : 6);

    // 1. Dört Bacak Koşu / Dörtnala Animasyonu
    if (!isFlying && speed > 0.5) {
      const legStride = Math.sin(this.animTimer) * 0.65;
      this.legFL.rotation.x = legStride;
      this.legFR.rotation.x = -legStride;
      this.legBL.rotation.x = -legStride * 0.85;
      this.legBR.rotation.x = legStride * 0.85;
    } else if (isAirborne || isFlying) {
      // Havada bacaklar arkaya toplanır
      this.legFL.rotation.x = Scalar.Lerp(this.legFL.rotation.x, 0.45, deltaTime * 5);
      this.legFR.rotation.x = Scalar.Lerp(this.legFR.rotation.x, 0.45, deltaTime * 5);
      this.legBL.rotation.x = Scalar.Lerp(this.legBL.rotation.x, -0.65, deltaTime * 5);
      this.legBR.rotation.x = Scalar.Lerp(this.legBR.rotation.x, -0.65, deltaTime * 5);
    } else {
      this.legFL.rotation.x = 0;
      this.legFR.rotation.x = 0;
      this.legBL.rotation.x = 0;
      this.legBR.rotation.x = 0;
    }

    // 2. Kanatların Çırpılması veya Süzülmesi
    if (isFlying) {
      // Güçlü kanat çırpma
      const flap = Math.sin(this.animTimer * 1.4) * 0.55;
      this.wingLeft[0].rotation.z = flap;
      this.wingLeft[1].rotation.z = flap * 0.6;
      this.wingLeft[2].rotation.z = flap * 0.4;

      this.wingRight[0].rotation.z = -flap;
      this.wingRight[1].rotation.z = -flap * 0.6;
      this.wingRight[2].rotation.z = -flap * 0.4;
    } else if (isAirborne) {
      // Havada açık süzülme duruşu
      this.wingLeft[0].rotation.z = Scalar.Lerp(this.wingLeft[0].rotation.z, 0.15, deltaTime * 4);
      this.wingRight[0].rotation.z = Scalar.Lerp(this.wingRight[0].rotation.z, -0.15, deltaTime * 4);
    } else {
      // Yerde kanatlar gövdeye katlanır
      this.wingLeft[0].rotation.z = Scalar.Lerp(this.wingLeft[0].rotation.z, -1.25, deltaTime * 6);
      this.wingRight[0].rotation.z = Scalar.Lerp(this.wingRight[0].rotation.z, 1.25, deltaTime * 6);
    }

    // 3. Kuyruk Yay-Sönüm Fizik Salınımı
    const targetTail = Math.sin(this.animTimer * 0.6) * 0.25;
    const force = (targetTail - this.tailAngle) * 35.0;
    this.tailVelocity = (this.tailVelocity + force * deltaTime) * 0.88;
    this.tailAngle += this.tailVelocity * deltaTime;
    this.tailNode.rotation.y = this.tailAngle;
  }

  public setWingsVisible(visible: boolean): void {
    for (const w of this.wingLeft) {
      w.setEnabled(visible);
    }
    for (const w of this.wingRight) {
      w.setEnabled(visible);
    }
  }
}
