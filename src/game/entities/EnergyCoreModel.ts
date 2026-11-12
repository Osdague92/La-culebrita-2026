import * as THREE from 'three';
import { CoreItem } from '../../types/game';

export class EnergyCoreModel {
  public group: THREE.Group;
  public itemData: CoreItem;

  private innerMesh: THREE.Mesh;
  private ringMesh1: THREE.Mesh;
  private ringMesh2: THREE.Mesh;
  private shadowMesh: THREE.Mesh;
  private light: THREE.PointLight;

  private baseY: number = 0.45;
  private animOffset: number;

  constructor(item: CoreItem) {
    this.itemData = item;
    this.group = new THREE.Group();
    this.group.position.set(item.x, 0, item.z);
    this.animOffset = Math.random() * Math.PI * 2;

    const color = new THREE.Color(item.color);

    // 1. Inner Crystalline Core
    const coreGeo = item.type === 'mega_crystal'
      ? new THREE.DodecahedronGeometry(0.35)
      : new THREE.OctahedronGeometry(0.28);

    const coreMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.15,
    });
    this.innerMesh = new THREE.Mesh(coreGeo, coreMat);
    this.innerMesh.position.y = this.baseY;
    this.innerMesh.castShadow = true;
    this.group.add(this.innerMesh);

    // 2. Dual Concentric Gimbal Rings
    const ringGeo1 = new THREE.TorusGeometry(0.42, 0.03, 8, 20);
    const ringGeo2 = new THREE.TorusGeometry(0.52, 0.025, 8, 20);

    const ringMat = new THREE.MeshBasicMaterial({
      color,
      wireframe: false,
    });

    this.ringMesh1 = new THREE.Mesh(ringGeo1, ringMat);
    this.ringMesh1.position.y = this.baseY;
    this.group.add(this.ringMesh1);

    this.ringMesh2 = new THREE.Mesh(ringGeo2, ringMat);
    this.ringMesh2.position.y = this.baseY;
    this.group.add(this.ringMesh2);

    // 3. Contact Ground Glow Disc (Soft shadow / light projection)
    const shadowGeo = new THREE.RingGeometry(0.1, 0.45, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    this.group.add(this.shadowMesh);

    // 4. Subtle localized point light
    this.light = new THREE.PointLight(color, 0.8, 2.5);
    this.light.position.y = this.baseY;
    this.group.add(this.light);
  }

  public update(time: number, delta: number) {
    // Bobbing levitation
    const bob = Math.sin(time * 3 + this.animOffset) * 0.1;
    const currentY = this.baseY + bob;

    this.innerMesh.position.y = currentY;
    this.ringMesh1.position.y = currentY;
    this.ringMesh2.position.y = currentY;
    this.light.position.y = currentY;

    // Dual axis spin
    this.innerMesh.rotation.y += delta * 1.5;
    this.innerMesh.rotation.x += delta * 0.8;

    this.ringMesh1.rotation.x += delta * 2.2;
    this.ringMesh1.rotation.y += delta * 1.2;

    this.ringMesh2.rotation.y -= delta * 1.8;
    this.ringMesh2.rotation.z += delta * 1.4;

    // Ground projection scale pulse
    const shadowScale = 1.0 - bob * 1.2;
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
  }

  public dispose() {
    this.innerMesh.geometry.dispose();
    (this.innerMesh.material as THREE.Material).dispose();

    this.ringMesh1.geometry.dispose();
    (this.ringMesh1.material as THREE.Material).dispose();

    this.ringMesh2.geometry.dispose();
    (this.ringMesh2.material as THREE.Material).dispose();

    this.shadowMesh.geometry.dispose();
    (this.shadowMesh.material as THREE.Material).dispose();

    this.light.dispose();
  }
}
