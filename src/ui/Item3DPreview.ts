/**
 * ÖTÜKEN: KUT'UN DÖRT PARÇASI
 * Envanter 3D Eşya İnceleme ve Önizleme Sistemi (Item3DPreview)
 * (KURAL 1 & 2 UYUMLU: 2D Canvas / DynamicTexture YOK, İkinci Babylon Kamerası + Viewport + LayerMask, Dokunarak Döndürme)
 */

import {
  Scene,
  FreeCamera,
  Viewport,
  Vector3,
  HemisphericLight,
  PointLight,
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode
} from '@babylonjs/core';
import { CameraRig } from '../core/CameraRig';
import { ItemDefinition } from '../inventory/InventoryData';

export class Item3DPreview {
  public scene: Scene;
  public cameraRig: CameraRig;
  public previewCamera: FreeCamera;
  public previewLight: PointLight;
  public stageNode: TransformNode;

  public isActive = false;

  // Önizleme Sahnesi Katman Maskesi (LayerMask 0x20000000)
  public static readonly PREVIEW_LAYER_MASK = 0x20000000;

  // Döndürülebilir Eşya Kökü
  private itemPivot: TransformNode;
  private currentMesh: Mesh | null = null;
  private rotY = 0;
  private isDragging = false;
  private lastPointerX = 0;

  constructor(scene: Scene, cameraRig: CameraRig) {
    this.scene = scene;
    this.cameraRig = cameraRig;

    // İzole Önizleme Sahne Kökü (Dünyanın çok altında x: 0, y: -200, z: 0)
    this.stageNode = new TransformNode('preview_stage_root', scene);
    this.stageNode.position.set(0, -200, 0);

    this.itemPivot = new TransformNode('preview_item_pivot', scene);
    this.itemPivot.parent = this.stageNode;

    // 2. Babylon Kamerası: Sağ Panel Viewport'u (x: 0.65, y: 0.35, w: 0.30, h: 0.50)
    this.previewCamera = new FreeCamera('preview_camera', new Vector3(0, -200, -3.2), scene);
    this.previewCamera.setTarget(new Vector3(0, -200, 0));
    this.previewCamera.layerMask = Item3DPreview.PREVIEW_LAYER_MASK;
    this.previewCamera.viewport = new Viewport(0.66, 0.35, 0.30, 0.48);

    // Önizleme Aydınlatması
    this.previewLight = new PointLight('preview_light', new Vector3(1.5, -198, -2.0), scene);
    this.previewLight.diffuse = new Color3(1.0, 0.95, 0.85);
    this.previewLight.intensity = 1.4;
    this.previewLight.includeOnlyWithLayerMask = Item3DPreview.PREVIEW_LAYER_MASK;

    const hemi = new HemisphericLight('preview_hemi', new Vector3(0, 1, 0), scene);
    hemi.diffuse = new Color3(0.7, 0.85, 1.0);
    hemi.intensity = 0.8;
    hemi.includeOnlyWithLayerMask = Item3DPreview.PREVIEW_LAYER_MASK;

    this.setupDragEvents();
  }

  private setupDragEvents(): void {
    const previewZone = document.getElementById('inventory3DZone');
    if (!previewZone) return;

    previewZone.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastPointerX;
        this.rotY += dx * 0.015;
        this.lastPointerX = e.clientX;
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });
  }

  /**
   * 3D Önizleme Kamerasını Etkinleştirir
   */
  public activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.updateViewportFromDOM();
    this.scene.activeCameras = [this.cameraRig.camera, this.previewCamera];
  }

  /**
   * DOM Elemanının (inventory3DZone) Boyut ve Konumuna Göre Viewport'u Günceller (20:9 ve 16:10 Tam Uyum)
   */
  public updateViewportFromDOM(): void {
    const previewZone = document.getElementById('inventory3DZone');
    if (!previewZone) return;
    const rect = previewZone.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && window.innerWidth > 0 && window.innerHeight > 0) {
      const vx = Math.max(0, Math.min(1, rect.left / window.innerWidth));
      const vy = Math.max(0, Math.min(1, (window.innerHeight - rect.bottom) / window.innerHeight));
      const vw = Math.max(0.05, Math.min(1, rect.width / window.innerWidth));
      const vh = Math.max(0.05, Math.min(1, rect.height / window.innerHeight));
      this.previewCamera.viewport.x = vx;
      this.previewCamera.viewport.y = vy;
      this.previewCamera.viewport.width = vw;
      this.previewCamera.viewport.height = vh;
    }
  }

  /**
   * 3D Önizleme Kamerasını Kapatır
   */
  public deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.scene.activeCameras = [this.cameraRig.camera];
    if (this.currentMesh) {
      this.currentMesh.dispose();
      this.currentMesh = null;
    }
  }

  /**
   * Eşya Seçildiğinde 3D Modeli Oluşturur
   */
  public displayItem(item: ItemDefinition): void {
    if (this.currentMesh) {
      this.currentMesh.dispose();
      this.currentMesh = null;
    }

    const mat = new StandardMaterial(`preview_mat_${item.id}`, this.scene);
    mat.specularColor = new Color3(0.5, 0.5, 0.5);

    switch (item.category) {
      case 'WEAPON': {
        this.currentMesh = MeshBuilder.CreateBox('preview_weapon', { width: 0.18, height: 1.8, depth: 0.1 }, this.scene);
        mat.diffuseColor = new Color3(0.75, 0.78, 0.85);
        mat.emissiveColor = new Color3(0.1, 0.15, 0.2);
        break;
      }
      case 'BOW': {
        this.currentMesh = MeshBuilder.CreateTorus('preview_bow', { diameter: 1.4, thickness: 0.08, tessellation: 16 }, this.scene);
        mat.diffuseColor = new Color3(0.48, 0.32, 0.18);
        break;
      }
      case 'SHIELD': {
        this.currentMesh = MeshBuilder.CreateCylinder('preview_shield', { diameter: 1.3, height: 0.12, tessellation: 16 }, this.scene);
        this.currentMesh.rotation.x = Math.PI / 2;
        mat.diffuseColor = new Color3(0.35, 0.4, 0.48);
        break;
      }
      case 'ARMOR': {
        this.currentMesh = MeshBuilder.CreateBox('preview_armor', { width: 0.9, height: 1.1, depth: 0.7 }, this.scene);
        mat.diffuseColor = item.armorSetId === 'BOZKURT_SET' ? new Color3(0.4, 0.4, 0.45) : new Color3(0.6, 0.5, 0.3);
        break;
      }
      case 'FOOD': {
        this.currentMesh = MeshBuilder.CreateSphere('preview_food', { diameter: 0.8, segments: 8 }, this.scene);
        mat.diffuseColor = new Color3(0.9, 0.55, 0.2);
        break;
      }
      default: {
        this.currentMesh = MeshBuilder.CreatePolyhedron('preview_default', { type: 1, size: 0.6 }, this.scene);
        mat.diffuseColor = new Color3(0.3, 0.7, 0.9);
        mat.emissiveColor = new Color3(0.1, 0.2, 0.3);
        break;
      }
    }

    if (this.currentMesh) {
      this.currentMesh.material = mat;
      this.currentMesh.layerMask = Item3DPreview.PREVIEW_LAYER_MASK;
      this.currentMesh.parent = this.itemPivot;
    }
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    if (!this.isDragging) {
      // Yavaşça kendi ekseni etrafında döner
      this.rotY += deltaTime * 0.8;
    }

    this.itemPivot.rotation.y = this.rotY;
  }
}
