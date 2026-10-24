import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode
} from '@babylonjs/core';

/**
 * 3D Billboard Mesh Damage Numbers
 * Strictly adheres to project rule: NO DynamicTexture, NO 2D Canvas, NO Babylon GUI.
 * Renders damage numbers in world space using procedural 3D glyph quad segment meshes!
 */

// 7-segment display logic for digits 0-9
// Segments: 0=top, 1=top-right, 2=bottom-right, 3=bottom, 4=bottom-left, 5=top-left, 6=middle
const DIGIT_SEGMENTS: boolean[][] = [
  [true,  true,  true,  true,  true,  true,  false], // 0
  [false, true,  true,  false, false, false, false], // 1
  [true,  true,  false, true,  true,  false, true ], // 2
  [true,  true,  true,  true,  false, false, true ], // 3
  [false, true,  true,  false, false, true,  true ], // 4
  [true,  false, true,  true,  false, true,  true ], // 5
  [true,  false, true,  true,  true,  true,  true ], // 6
  [true,  true,  true,  false, false, false, false], // 7
  [true,  true,  true,  true,  true,  true,  true ], // 8
  [true,  true,  true,  true,  false, true,  true ]  // 9
];

interface ActiveDamageNumber {
  root: TransformNode;
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  isCrit: boolean;
}

export class DamageNumberManager {
  private scene: Scene;
  private activeNumbers: ActiveDamageNumber[] = [];
  private pool: TransformNode[] = [];
  
  private matNormal: StandardMaterial;
  private matCrit: StandardMaterial;
  private matHeal: StandardMaterial;

  constructor(scene: Scene) {
    this.scene = scene;

    // Glowing unlit emissive materials for 3D billboard digits
    this.matNormal = new StandardMaterial('mat_dmg_normal', scene);
    this.matNormal.diffuseColor = new Color3(1, 1, 1);
    this.matNormal.emissiveColor = new Color3(1, 0.95, 0.8);
    this.matNormal.disableLighting = true;

    this.matCrit = new StandardMaterial('mat_dmg_crit', scene);
    this.matCrit.diffuseColor = new Color3(1, 0.85, 0.1);
    this.matCrit.emissiveColor = new Color3(1, 0.75, 0.05); // Gold Kut crit
    this.matCrit.disableLighting = true;

    this.matHeal = new StandardMaterial('mat_dmg_heal', scene);
    this.matHeal.diffuseColor = new Color3(0.2, 1, 0.3);
    this.matHeal.emissiveColor = new Color3(0.1, 0.9, 0.2);
    this.matHeal.disableLighting = true;
  }

  /**
   * Spawns a floating 3D billboard damage number in world space.
   */
  public spawn(worldPos: Vector3, value: number, isCrit = false, isHeal = false): void {
    const root = new TransformNode('dmg_root', this.scene);
    root.billboardMode = Mesh.BILLBOARDMODE_ALL;
    
    // Slight random horizontal scatter
    const scatterX = (Math.random() - 0.5) * 0.4;
    const scatterZ = (Math.random() - 0.5) * 0.4;
    const initialPos = worldPos.clone().add(new Vector3(scatterX, 0.8, scatterZ));
    root.position.copyFrom(initialPos);

    const mat = isHeal ? this.matHeal : (isCrit ? this.matCrit : this.matNormal);
    const scale = isCrit ? 0.32 : 0.22;

    // Build digit meshes
    const digitsStr = Math.round(value).toString();
    const charWidth = 0.55;
    const totalWidth = digitsStr.length * charWidth;
    const startX = -totalWidth / 2 + charWidth / 2;

    for (let i = 0; i < digitsStr.length; i++) {
      const char = digitsStr[i];
      const digitVal = parseInt(char, 10);
      if (isNaN(digitVal)) continue;

      const digitNode = this.buildDigitMesh(digitVal, mat);
      digitNode.parent = root;
      digitNode.position.x = startX + i * charWidth;
      digitNode.scaling.setAll(scale);
    }

    this.activeNumbers.push({
      root,
      position: initialPos,
      velocity: new Vector3(scatterX * 0.8, isCrit ? 2.6 : 2.0, scatterZ * 0.8),
      life: 0,
      maxLife: isCrit ? 1.1 : 0.85,
      isCrit
    });
  }

  /**
   * Constructs a 7-segment digit from lightweight 3D quad segment primitives.
   */
  private buildDigitMesh(digit: number, mat: StandardMaterial): TransformNode {
    const digitParent = new TransformNode(`digit_${digit}`, this.scene);
    const segs = DIGIT_SEGMENTS[digit] || DIGIT_SEGMENTS[0];

    const segThick = 0.08;
    const segLen = 0.36;

    // Segment positions relative to digit center:
    // 0: top horiz
    // 1: top-right vert
    // 2: bot-right vert
    // 3: bot horiz
    // 4: bot-left vert
    // 5: top-left vert
    // 6: mid horiz
    const configs = [
      { x: 0, y: segLen, w: segLen, h: segThick },             // 0: Top
      { x: segLen / 2, y: segLen / 2, w: segThick, h: segLen }, // 1: Top-Right
      { x: segLen / 2, y: -segLen / 2, w: segThick, h: segLen },// 2: Bot-Right
      { x: 0, y: -segLen, w: segLen, h: segThick },            // 3: Bottom
      { x: -segLen / 2, y: -segLen / 2, w: segThick, h: segLen },// 4: Bot-Left
      { x: -segLen / 2, y: segLen / 2, w: segThick, h: segLen }, // 5: Top-Left
      { x: 0, y: 0, w: segLen, h: segThick }                   // 6: Mid
    ];

    for (let s = 0; s < 7; s++) {
      if (!segs[s]) continue;
      const c = configs[s];
      const quad = MeshBuilder.CreatePlane(`seg_${s}`, { width: c.w, height: c.h }, this.scene);
      quad.position.set(c.x, c.y, 0);
      quad.material = mat;
      quad.parent = digitParent;
    }

    return digitParent;
  }

  public update(deltaTime: number): void {
    for (let i = this.activeNumbers.length - 1; i >= 0; i--) {
      const item = this.activeNumbers[i];
      item.life += deltaTime;

      // Parabolic upward arc with gravity deceleration
      item.velocity.y -= 3.8 * deltaTime;
      item.position.addInPlace(item.velocity.scale(deltaTime));
      item.root.position.copyFrom(item.position);

      // Fade-out and pop scale effect
      const progress = item.life / item.maxLife;
      if (progress < 0.2) {
        // Pop in
        const s = 1.0 + (progress / 0.2) * 0.3;
        item.root.scaling.setAll(s);
      } else {
        // Float out & shrink
        const s = Math.max(0.01, 1.3 - (progress - 0.2) * 1.5);
        item.root.scaling.setAll(s);
      }

      if (item.life >= item.maxLife) {
        item.root.dispose();
        this.activeNumbers.splice(i, 1);
      }
    }
  }

  public dispose(): void {
    for (const item of this.activeNumbers) {
      item.root.dispose();
    }
    this.activeNumbers = [];
  }
}
