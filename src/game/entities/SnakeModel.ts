import * as THREE from 'three';
import { SnakeSkin } from '../../types/game';

export class SnakeModel {
  public group: THREE.Group;
  public headGroup: THREE.Group;
  public segmentMeshes: THREE.Group[] = [];
  public tailGroup: THREE.Group | null = null;

  private skin: SnakeSkin;
  private primaryMat: THREE.MeshStandardMaterial;
  private secondaryMat: THREE.MeshStandardMaterial;
  private emissiveMat: THREE.MeshBasicMaterial;
  private eyeMat: THREE.MeshBasicMaterial;
  private visorMat: THREE.MeshPhysicalMaterial;

  // Reusable geometries
  private headHullGeo: THREE.BufferGeometry;
  private eyeGeo: THREE.BufferGeometry;
  private antennaGeo: THREE.BufferGeometry;
  private thrusterGeo: THREE.BufferGeometry;
  private bodyHullGeo: THREE.BufferGeometry;
  private coreRingGeo: THREE.BufferGeometry;
  private innerCoreGeo: THREE.BufferGeometry;

  constructor(skin: SnakeSkin) {
    this.skin = skin;
    this.group = new THREE.Group();
    this.headGroup = new THREE.Group();

    // 1. Materials setup with PBR parameters
    this.primaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skin.primaryColor),
      metalness: skin.metalness,
      roughness: skin.roughness,
    });

    this.secondaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skin.secondaryColor),
      metalness: Math.max(0.2, skin.metalness - 0.2),
      roughness: Math.min(0.8, skin.roughness + 0.2),
    });

    this.emissiveMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(skin.emissiveColor),
    });

    this.eyeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(skin.eyeColor),
    });

    this.visorMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(skin.emissiveColor),
      transmission: 0.6,
      opacity: 0.85,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.5,
    });

    // 2. Pre-allocate geometries
    this.headHullGeo = new THREE.BoxGeometry(0.88, 0.54, 0.95);
    this.eyeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.32);
    this.antennaGeo = new THREE.ConeGeometry(0.06, 0.45, 5);
    this.thrusterGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.22, 8);
    this.bodyHullGeo = new THREE.BoxGeometry(0.78, 0.52, 0.78);
    this.coreRingGeo = new THREE.TorusGeometry(0.38, 0.05, 8, 16);
    this.innerCoreGeo = new THREE.OctahedronGeometry(0.18);

    // 3. Assemble composite Head (7 distinct parts)
    this.buildHead();
    this.group.add(this.headGroup);
  }

  private buildHead() {
    // Part 1: Main Head Chassis Hull
    const hull = new THREE.Mesh(this.headHullGeo, this.primaryMat);
    hull.position.y = 0.3;
    hull.castShadow = true;
    hull.receiveShadow = true;
    this.headGroup.add(hull);

    // Part 2: Aerodynamic Top Visor / Cockpit
    const visorGeo = new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const visor = new THREE.Mesh(visorGeo, this.visorMat);
    visor.scale.set(1.1, 0.6, 1.3);
    visor.position.set(0, 0.54, 0.05);
    this.headGroup.add(visor);

    // Parts 3 & 4: Dual Optical Glowing Eyes
    const leftEye = new THREE.Mesh(this.eyeGeo, this.eyeMat);
    leftEye.position.set(-0.38, 0.36, 0.32);
    leftEye.rotation.y = -0.2;
    this.headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(this.eyeGeo, this.eyeMat);
    rightEye.position.set(0.38, 0.36, 0.32);
    rightEye.rotation.y = 0.2;
    this.headGroup.add(rightEye);

    // Parts 5 & 6: Aerodynamic Fin Antennas
    const leftFin = new THREE.Mesh(this.antennaGeo, this.secondaryMat);
    leftFin.position.set(-0.4, 0.52, -0.2);
    leftFin.rotation.z = 0.4;
    leftFin.rotation.x = -0.3;
    this.headGroup.add(leftFin);

    const rightFin = new THREE.Mesh(this.antennaGeo, this.secondaryMat);
    rightFin.position.set(0.4, 0.52, -0.2);
    rightFin.rotation.z = -0.4;
    rightFin.rotation.x = -0.3;
    this.headGroup.add(rightFin);

    // Part 7: Rear Ion Thruster Exhaust
    const thruster = new THREE.Mesh(this.thrusterGeo, this.secondaryMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, 0.28, -0.5);
    this.headGroup.add(thruster);

    const thrusterGlowGeo = new THREE.RingGeometry(0.04, 0.12, 8);
    const thrusterGlow = new THREE.Mesh(thrusterGlowGeo, this.emissiveMat);
    thrusterGlow.position.set(0, 0.28, -0.62);
    thrusterGlow.rotation.y = Math.PI;
    this.headGroup.add(thrusterGlow);
  }

  /**
   * Syncs the snake segments with target grid coordinates
   */
  public updateSegments(positions: { x: number; z: number }[]) {
    // First position is head
    if (positions.length > 0) {
      this.headGroup.position.set(positions[0].x, 0, positions[0].z);
    }

    const bodyCount = Math.max(0, positions.length - 1);

    // Grow segment pool if needed
    while (this.segmentMeshes.length < bodyCount) {
      const segGroup = this.createSegment(this.segmentMeshes.length);
      this.group.add(segGroup);
      this.segmentMeshes.push(segGroup);
    }

    // Shrink segment pool if shortened
    while (this.segmentMeshes.length > bodyCount) {
      const removed = this.segmentMeshes.pop();
      if (removed) {
        this.group.remove(removed);
        this.disposeGroup(removed);
      }
    }

    // Update segment positions & subtle scale taper towards the tail
    for (let i = 0; i < bodyCount; i++) {
      const pos = positions[i + 1];
      const mesh = this.segmentMeshes[i];
      mesh.position.set(pos.x, 0, pos.z);

      // Subtle scale taper
      const progress = i / Math.max(1, bodyCount);
      const scale = 1.0 - progress * 0.28;
      mesh.scale.set(scale, scale, scale);
    }
  }

  private createSegment(index: number): THREE.Group {
    const seg = new THREE.Group();

    // Part 1: Outer Armor Shell
    const hull = new THREE.Mesh(this.bodyHullGeo, index % 2 === 0 ? this.primaryMat : this.secondaryMat);
    hull.position.y = 0.28;
    hull.castShadow = true;
    hull.receiveShadow = true;
    seg.add(hull);

    // Part 2: Energy Conduit Ring
    const ring = new THREE.Mesh(this.coreRingGeo, this.emissiveMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;
    seg.add(ring);

    // Part 3: Inner Levitation Core
    const inner = new THREE.Mesh(this.innerCoreGeo, this.emissiveMat);
    inner.position.y = 0.28;
    seg.add(inner);

    return seg;
  }

  public updateSkin(newSkin: SnakeSkin) {
    this.skin = newSkin;
    this.primaryMat.color.set(newSkin.primaryColor);
    this.primaryMat.metalness = newSkin.metalness;
    this.primaryMat.roughness = newSkin.roughness;

    this.secondaryMat.color.set(newSkin.secondaryColor);
    this.emissiveMat.color.set(newSkin.emissiveColor);
    this.eyeMat.color.set(newSkin.eyeColor);
    this.visorMat.color.set(newSkin.emissiveColor);
  }

  public orientHead(dir: string, delta: number) {
    let targetAngle = 0;
    switch (dir) {
      case 'UP': targetAngle = Math.PI; break;
      case 'DOWN': targetAngle = 0; break;
      case 'LEFT': targetAngle = -Math.PI / 2; break;
      case 'RIGHT': targetAngle = Math.PI / 2; break;
    }

    // Smooth rotation towards target direction
    this.headGroup.rotation.y = THREE.MathUtils.damp(
      this.headGroup.rotation.y,
      targetAngle,
      18,
      delta
    );
  }

  public dispose() {
    this.disposeGroup(this.group);
    this.headHullGeo.dispose();
    this.eyeGeo.dispose();
    this.antennaGeo.dispose();
    this.thrusterGeo.dispose();
    this.bodyHullGeo.dispose();
    this.coreRingGeo.dispose();
    this.innerCoreGeo.dispose();
    this.primaryMat.dispose();
    this.secondaryMat.dispose();
    this.emissiveMat.dispose();
    this.eyeMat.dispose();
    this.visorMat.dispose();
  }

  private disposeGroup(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Shared materials and geometries are disposed in SnakeModel.dispose()
      }
    });
  }
}
