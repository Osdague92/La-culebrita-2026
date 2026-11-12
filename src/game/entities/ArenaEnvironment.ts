import * as THREE from 'three';
import { HazardItem } from '../../types/game';

export class ArenaEnvironment {
  public group: THREE.Group;
  public gridWidth: number;
  public gridHeight: number;

  private floorMesh: THREE.Mesh;
  private borderWalls: THREE.Group;
  private cornerPylons: THREE.Group;
  private particles: THREE.Points;
  private portalsGroup: THREE.Group;
  private hazardsGroup: THREE.Group;

  private hazardMeshes: Map<string, THREE.Group> = new Map();

  constructor(gridWidth: number = 22, gridHeight: number = 22) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.group = new THREE.Group();

    // 1. Procedural Grid Floor with Cyberpunk Emissive Circuit Pattern
    this.floorMesh = this.buildFloor();
    this.group.add(this.floorMesh);

    // 2. Glowing Perimeter Laser Walls
    this.borderWalls = this.buildBorderWalls();
    this.group.add(this.borderWalls);

    // 3. Cyber Corner Towers / Pylons
    this.cornerPylons = this.buildCornerPylons();
    this.group.add(this.cornerPylons);

    // 4. Floating Ambient Cyber Dust / Data Particles
    this.particles = this.buildDataParticles();
    this.group.add(this.particles);

    // 5. Dynamic Portals & Hazards
    this.portalsGroup = new THREE.Group();
    this.hazardsGroup = new THREE.Group();
    this.group.add(this.portalsGroup);
    this.group.add(this.hazardsGroup);
  }

  private buildFloor(): THREE.Mesh {
    const geo = new THREE.BoxGeometry(this.gridWidth, 0.4, this.gridHeight);

    // Procedural grid texture via Canvas2D for maximum sharpness and zero 404s
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark cyber carbon base
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle neon cyan grid lines
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 504);

    // Sub-circuit inner accents
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 64, 384, 384);

    // Center microchip glyph
    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.fillRect(240, 240, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.gridWidth, this.gridHeight);
    texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.35,
      metalness: 0.8,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((this.gridWidth - 1) / 2, -0.2, (this.gridHeight - 1) / 2);
    mesh.receiveShadow = true;
    return mesh;
  }

  private buildBorderWalls(): THREE.Group {
    const group = new THREE.Group();
    const halfW = (this.gridWidth - 1) / 2;
    const halfH = (this.gridHeight - 1) / 2;

    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });

    const topBarMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
    });

    // Four boundary laser fences
    const configs = [
      { w: this.gridWidth, h: 0.8, x: halfW, z: -0.5, rotY: 0 },
      { w: this.gridWidth, h: 0.8, x: halfW, z: this.gridHeight - 0.5, rotY: 0 },
      { w: this.gridHeight, h: 0.8, x: -0.5, z: halfH, rotY: Math.PI / 2 },
      { w: this.gridHeight, h: 0.8, x: this.gridWidth - 0.5, z: halfH, rotY: Math.PI / 2 },
    ];

    for (const c of configs) {
      const wallGeo = new THREE.PlaneGeometry(c.w, c.h);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(c.x, c.h / 2, c.z);
      wall.rotation.y = c.rotY;
      group.add(wall);

      // Emissive rail on top of wall
      const railGeo = new THREE.BoxGeometry(c.w, 0.08, 0.1);
      const rail = new THREE.Mesh(railGeo, topBarMat);
      rail.position.set(c.x, c.h, c.z);
      rail.rotation.y = c.rotY;
      group.add(rail);
    }

    return group;
  }

  private buildCornerPylons(): THREE.Group {
    const group = new THREE.Group();
    const pylonGeo = new THREE.BoxGeometry(0.8, 2.2, 0.8);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });

    const crystalGeo = new THREE.OctahedronGeometry(0.35);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

    const corners = [
      { x: -0.5, z: -0.5 },
      { x: this.gridWidth - 0.5, z: -0.5 },
      { x: -0.5, z: this.gridHeight - 0.5 },
      { x: this.gridWidth - 0.5, z: this.gridHeight - 0.5 },
    ];

    for (const pos of corners) {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(pos.x, 1.1, pos.z);
      pylon.castShadow = true;
      group.add(pylon);

      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(pos.x, 2.4, pos.z);
      group.add(crystal);

      // Soft corner beacon light
      const beacon = new THREE.PointLight(0xa855f7, 0.6, 6);
      beacon.position.set(pos.x, 2.4, pos.z);
      group.add(beacon);
    }

    return group;
  }

  private buildDataParticles(): THREE.Points {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * (this.gridWidth * 1.5) + this.gridWidth / 2;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * (this.gridHeight * 1.5) + this.gridHeight / 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geo, mat);
  }

  public updateHazards(hazards: HazardItem[]) {
    // Sync hazard meshes
    const currentIds = new Set(hazards.map((h) => h.id));

    // Remove obsolete
    for (const [id, mesh] of this.hazardMeshes.entries()) {
      if (!currentIds.has(id)) {
        this.hazardsGroup.remove(mesh);
        this.hazardMeshes.delete(id);
      }
    }

    // Add or update
    for (const h of hazards) {
      let mesh = this.hazardMeshes.get(h.id);
      if (!mesh) {
        mesh = this.createHazardMesh(h);
        this.hazardsGroup.add(mesh);
        this.hazardMeshes.set(h.id, mesh);
      }
      mesh.position.set(h.x, 0, h.z);
    }
  }

  private createHazardMesh(hazard: HazardItem): THREE.Group {
    const group = new THREE.Group();

    if (hazard.type === 'portal') {
      // Swirling Wormhole Gate
      const ringGeo = new THREE.TorusGeometry(0.55, 0.08, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.55;
      group.add(ring);

      const centerGeo = new THREE.CircleGeometry(0.48, 16);
      const centerMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.y = 0.55;
      group.add(center);
    } else {
      // Laser Barrier or Plasma Block
      const geo = new THREE.BoxGeometry(0.85, 0.9, 0.85);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xff0044,
        emissiveIntensity: 0.7,
        metalness: 0.8,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.45;
      mesh.castShadow = true;
      group.add(mesh);

      const haloGeo = new THREE.RingGeometry(0.1, 0.5, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.02;
      group.add(halo);
    }

    return group;
  }

  public update(time: number, delta: number) {
    // Gentle particle drift
    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < array.length; i += 3) {
      array[i + 1] += delta * 0.25;
      if (array[i + 1] > 6) {
        array[i + 1] = 0;
      }
    }
    posAttr.needsUpdate = true;

    // Rotate hazards & portals
    for (const mesh of this.hazardMeshes.values()) {
      mesh.rotation.y += delta * 1.8;
    }
  }

  public dispose() {
    this.floorMesh.geometry.dispose();
    (this.floorMesh.material as THREE.Material).dispose();

    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}
