import * as THREE from 'three';
import { CoreItem, Direction, GameMode, GridCoord, HazardItem, SnakeSkin } from '../../types/game';
import { sound } from '../audio/SoundSynthesizer';
import { ArenaEnvironment } from '../entities/ArenaEnvironment';
import { EnergyCoreModel } from '../entities/EnergyCoreModel';
import { SnakeModel } from '../entities/SnakeModel';
import { Pathfinding } from '../physics/Pathfinding';

// Scratch math objects to prevent garbage collection allocations in 60fps loop
const _vec3 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

export interface GameEngineEvents {
  onScoreUpdate: (score: number, combo: number, multiplier: number, length: number, speed: number) => void;
  onGameOver: (score: number, duration: number, cores: number, cause: 'wall' | 'body' | 'hazard' | 'rival', rivalScore: number) => void;
  onCoreEaten: (coreType: string, points: number) => void;
  onCommentary: (text: string) => void;
  onRivalUpdate: (rivalScore: number, rivalLength: number) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;

  private isSoftwareGl: boolean = false;
  private animFrameId: number = 0;
  private isDestroyed: boolean = false;

  // Grid config
  public readonly gridWidth = 22;
  public readonly gridHeight = 22;

  // Arena & Entities
  private arena: ArenaEnvironment;
  private playerSnake: SnakeModel;
  private rivalSnake: SnakeModel | null = null;
  private coreModels: Map<string, EnergyCoreModel> = new Map();

  // Lighting
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Game State
  public mode: GameMode = 'classic';
  public isPlaying: boolean = false;
  public isPaused: boolean = false;

  // Player Snake Logic
  private playerCoords: GridCoord[] = [];
  private playerDir: Direction = 'RIGHT';
  private nextDir: Direction = 'RIGHT';
  private dirQueue: Direction[] = [];
  private isTurbo: boolean = false;
  private hasShield: boolean = false;

  // Rival Snake Logic
  private rivalCoords: GridCoord[] = [];
  private rivalDir: Direction = 'LEFT';
  private rivalScore: number = 0;
  private rivalRespawnTimer: number = 0;

  // Movement Timing
  private stepInterval: number = 0.15; // seconds per grid step
  private stepAccumulator: number = 0;
  private rivalStepAccumulator: number = 0;

  // Score & Progression
  private score: number = 0;
  private coresCollected: number = 0;
  private combo: number = 1;
  private comboTimer: number = 0;
  private gameDuration: number = 0;

  // Items & Hazards
  private cores: CoreItem[] = [];
  private hazards: HazardItem[] = [];

  // Camera Shake & Cinematic Orbit
  private shakeIntensity: number = 0;
  private orbitAngle: number = 0;

  // Event Callbacks
  private events: GameEngineEvents;

  // Current Skin
  private currentSkin: SnakeSkin;

  constructor(container: HTMLElement, skin: SnakeSkin, events: GameEngineEvents) {
    this.container = container;
    this.currentSkin = skin;
    this.events = events;

    // 1. Detect software WebGL as per guidelines
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Setup Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Scene & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);
    this.scene.fog = new THREE.FogExp2(0x02040a, 0.025);

    // 4. Camera (Isometric perspective angled at arena center)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.5, 120);
    this.camera.position.set(11, 22, 26);
    this.camera.lookAt(11, 0, 11);

    // 5. Studio Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x06b6d4, 0x1e1b4b, 1.4);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.keyLight.position.set(15, 30, 20);
    this.keyLight.castShadow = !this.isSoftwareGl;
    if (this.keyLight.castShadow) {
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.camera.left = -18;
      this.keyLight.shadow.camera.right = 18;
      this.keyLight.shadow.camera.top = 18;
      this.keyLight.shadow.camera.bottom = -18;
    }
    this.scene.add(this.keyLight);

    // 6. Arena Environment
    this.arena = new ArenaEnvironment(this.gridWidth, this.gridHeight);
    this.scene.add(this.arena.group);

    // 7. Player Snake
    this.playerSnake = new SnakeModel(skin);
    this.scene.add(this.playerSnake.group);

    this.clock = new THREE.Clock();

    // Resize listener
    window.addEventListener('resize', this.handleResize);

    // Initial setup in menu preview mode
    this.setupMenuPreview();

    // Start 60fps render loop
    this.tick();
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  /**
   * Title Screen live 3D preview
   */
  public setupMenuPreview() {
    this.isPlaying = false;
    this.isPaused = false;
    this.clearCores();
    this.hazards = [];
    this.arena.updateHazards([]);

    // Sample snake moving in a smooth pattern
    this.playerCoords = [
      { x: 11, z: 11 },
      { x: 10, z: 11 },
      { x: 9, z: 11 },
      { x: 8, z: 11 },
      { x: 7, z: 11 },
      { x: 6, z: 11 },
    ];
    this.playerSnake.updateSegments(this.playerCoords);

    // Add demo cores
    this.spawnCore('quantum', 14, 11);
    this.spawnCore('mega_crystal', 11, 14);
    this.spawnCore('overclock', 7, 7);

    sound.startBgm('menu');
  }

  /**
   * Start or restart gameplay in chosen mode
   */
  public startGame(mode: GameMode = 'classic') {
    this.mode = mode;
    this.isPlaying = true;
    this.isPaused = false;
    this.score = 0;
    this.coresCollected = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.gameDuration = 0;
    this.isTurbo = false;
    this.hasShield = false;
    this.shakeIntensity = 0;
    this.dirQueue = [];

    // Clear old cores & hazards
    this.clearCores();
    this.hazards = [];

    // Spawn player in center
    this.playerCoords = [
      { x: 6, z: 11 },
      { x: 5, z: 11 },
      { x: 4, z: 11 },
    ];
    this.playerDir = 'RIGHT';
    this.nextDir = 'RIGHT';
    this.playerSnake.updateSegments(this.playerCoords);

    // Mode-specific configuration
    if (this.mode === 'ai_rival') {
      this.initRival();
    } else if (this.rivalSnake) {
      this.scene.remove(this.rivalSnake.group);
      this.rivalSnake.dispose();
      this.rivalSnake = null;
    }

    if (this.mode === 'cyber_arena') {
      this.setupCyberArenaHazards();
    } else if (this.mode === 'survival') {
      this.setupSurvivalHazards();
    } else {
      this.arena.updateHazards([]);
    }

    // Spawn initial energy cores
    for (let i = 0; i < (this.mode === 'ai_rival' ? 4 : 2); i++) {
      this.spawnRandomCore();
    }

    // Play BGM
    sound.startBgm(this.mode === 'challenge' ? 'challenge' : 'play');
    this.notifyScore();
    this.events.onCommentary('¡Sistemas activados! Buena suerte, piloto.');
  }

  private initRival() {
    const rivalSkin: SnakeSkin = {
      id: 'rival_skin',
      name: 'CYBER COBRA MK-IV',
      primaryColor: '#ef4444',
      secondaryColor: '#991b1b',
      emissiveColor: '#f87171',
      eyeColor: '#facc15',
      particleColor: '#ef4444',
      metalness: 0.9,
      roughness: 0.15,
      headShape: 'cyber_dragon',
      lore: 'IA hostil programada para supremacía en la arena.',
      unlocked: true,
    };

    if (this.rivalSnake) {
      this.scene.remove(this.rivalSnake.group);
      this.rivalSnake.dispose();
    }

    this.rivalSnake = new SnakeModel(rivalSkin);
    this.scene.add(this.rivalSnake.group);

    this.rivalCoords = [
      { x: 16, z: 11 },
      { x: 17, z: 11 },
      { x: 18, z: 11 },
    ];
    this.rivalDir = 'LEFT';
    this.rivalScore = 0;
    this.rivalRespawnTimer = 0;
    this.rivalSnake.updateSegments(this.rivalCoords);
    this.events.onRivalUpdate(0, this.rivalCoords.length);
  }

  private setupCyberArenaHazards() {
    this.hazards = [
      // Paired Teleport Wormhole Portals
      { id: 'portal_a', x: 3, z: 3, type: 'portal', targetPortal: { x: 18, z: 18 } },
      { id: 'portal_b', x: 18, z: 18, type: 'portal', targetPortal: { x: 3, z: 3 } },
      // Moving Laser Spires
      { id: 'spire_1', x: 11, z: 6, type: 'moving_spire', dx: 1, dz: 0 },
      { id: 'spire_2', x: 11, z: 15, type: 'moving_spire', dx: -1, dz: 0 },
    ];
    this.arena.updateHazards(this.hazards);
  }

  private setupSurvivalHazards() {
    this.hazards = [
      { id: 'block_1', x: 5, z: 5, type: 'plasma_block' },
      { id: 'block_2', x: 16, z: 5, type: 'plasma_block' },
      { id: 'block_3', x: 5, z: 16, type: 'plasma_block' },
      { id: 'block_4', x: 16, z: 16, type: 'plasma_block' },
    ];
    this.arena.updateHazards(this.hazards);
  }

  public setDirection(dir: Direction) {
    if (!this.isPlaying || this.isPaused) return;

    // Disallow 180-degree instant reversal into own neck
    const current = this.dirQueue.length > 0 ? this.dirQueue[this.dirQueue.length - 1] : this.playerDir;
    if (this.isOpposite(dir, current)) return;

    // Buffer input
    if (this.dirQueue.length < 2) {
      this.dirQueue.push(dir);
      sound.playTurn();
    }
  }

  public setTurbo(active: boolean) {
    if (this.isTurbo !== active) {
      this.isTurbo = active;
      if (active) {
        sound.playTurbo();
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.15);
      }
    }
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
  }

  public updateSkin(newSkin: SnakeSkin) {
    this.currentSkin = newSkin;
    this.playerSnake.updateSkin(newSkin);
  }

  /**
   * Main 60 FPS animation & physics loop
   */
  private tick = () => {
    if (this.isDestroyed) return;

    const rawDelta = this.clock.getDelta();
    // Delta clamping to prevent physics tunneling or lag spikes
    const delta = Math.min(rawDelta, 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.isPlaying && !this.isPaused) {
      this.gameDuration += delta;
      this.updateGameLogic(delta, elapsedTime);
    } else if (!this.isPlaying) {
      // Cinematic Camera Orbit in Title/Menu screen
      this.orbitAngle += delta * 0.25;
      const radius = 28;
      this.camera.position.x = 11 + Math.sin(this.orbitAngle) * radius;
      this.camera.position.z = 11 + Math.cos(this.orbitAngle) * radius;
      this.camera.position.y = 18 + Math.sin(this.orbitAngle * 0.5) * 4;
      this.camera.lookAt(11, 0, 11);
    }

    // Update 3D entity models and animations
    this.arena.update(elapsedTime, delta);

    for (const core of this.coreModels.values()) {
      core.update(elapsedTime, delta);
    }

    // Orient player snake head
    this.playerSnake.orientHead(this.playerDir, delta);

    if (this.rivalSnake && this.rivalCoords.length > 0) {
      this.rivalSnake.orientHead(this.rivalDir, delta);
    }

    // Decay camera shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 1.5);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private updateGameLogic(delta: number, elapsedTime: number) {
    // 1. Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.notifyScore();
      }
    }

    // 2. Camera smooth follow player head in game
    const head = this.playerCoords[0];
    if (head) {
      _camTarget.set(head.x, 0, head.z);
      const targetCamX = THREE.MathUtils.clamp(head.x * 0.4 + 6.6, 6, 16);
      const targetCamZ = THREE.MathUtils.clamp(head.z * 0.5 + 16, 17, 26);
      const targetCamY = this.isTurbo ? 21 : 23;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 4, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 4, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 4, delta);
      this.camera.lookAt(head.x, 0, head.z);
    }

    // 3. Player Movement Step
    const currentSpeed = this.isTurbo ? this.stepInterval * 0.5 : this.stepInterval;
    this.stepAccumulator += delta;

    if (this.stepAccumulator >= currentSpeed) {
      this.stepAccumulator = 0;
      this.stepPlayer();
    }

    // 4. Rival Movement Step (AI Rival mode)
    if (this.mode === 'ai_rival' && this.rivalSnake) {
      if (this.rivalRespawnTimer > 0) {
        this.rivalRespawnTimer -= delta;
        if (this.rivalRespawnTimer <= 0) {
          this.initRival();
        }
      } else {
        this.rivalStepAccumulator += delta;
        const rivalSpeed = this.stepInterval * 0.95; // Rival moves at competitive pace
        if (this.rivalStepAccumulator >= rivalSpeed) {
          this.rivalStepAccumulator = 0;
          this.stepRival();
        }
      }
    }

    // 5. Dynamic Hazard Spawning in Survival mode
    if (this.mode === 'survival' && Math.floor(this.gameDuration) % 25 === 0 && this.hazards.length < 10) {
      const hId = `dynamic_hazard_${this.hazards.length}`;
      if (!this.hazards.some((h) => h.id === hId)) {
        const hx = Math.floor(Math.random() * (this.gridWidth - 4)) + 2;
        const hz = Math.floor(Math.random() * (this.gridHeight - 4)) + 2;
        this.hazards.push({ id: hId, x: hx, z: hz, type: 'plasma_block' });
        this.arena.updateHazards(this.hazards);
        this.events.onCommentary('¡Alerta! Nuevo obstáculo materializado.');
      }
    }
  }

  private stepPlayer() {
    if (this.dirQueue.length > 0) {
      this.playerDir = this.dirQueue.shift()!;
    }

    const head = this.playerCoords[0];
    let nextX = head.x;
    let nextZ = head.z;

    switch (this.playerDir) {
      case 'UP': nextZ -= 1; break;
      case 'DOWN': nextZ += 1; break;
      case 'LEFT': nextX -= 1; break;
      case 'RIGHT': nextX += 1; break;
    }

    // Check Portals
    const portal = this.hazards.find((h) => h.type === 'portal' && h.x === nextX && h.z === nextZ);
    if (portal && portal.targetPortal) {
      sound.playPortal();
      nextX = portal.targetPortal.x;
      nextZ = portal.targetPortal.z;
      this.shakeIntensity = 0.2;
    }

    // Check Wall Collisions
    if (nextX < 0 || nextX >= this.gridWidth || nextZ < 0 || nextZ >= this.gridHeight) {
      if (this.hasShield) {
        this.hasShield = false;
        sound.playPowerup();
        this.events.onCommentary('¡Escudo cuántico absorbió el impacto perimetral!');
        return;
      }
      this.handleDeath('wall');
      return;
    }

    // Check Self Collisions
    for (let i = 0; i < this.playerCoords.length - 1; i++) {
      if (this.playerCoords[i].x === nextX && this.playerCoords[i].z === nextZ) {
        if (this.hasShield) {
          this.hasShield = false;
          sound.playPowerup();
          this.events.onCommentary('¡Escudo absorbió la autocolisión!');
          return;
        }
        this.handleDeath('body');
        return;
      }
    }

    // Check Hazard Collisions
    const hazard = this.hazards.find((h) => h.type !== 'portal' && h.x === nextX && h.z === nextZ);
    if (hazard) {
      if (this.hasShield) {
        this.hasShield = false;
        sound.playPowerup();
        this.events.onCommentary('¡Escudo destruyó el obstáculo!');
        return;
      }
      this.handleDeath('hazard');
      return;
    }

    // Check Rival Collisions
    if (this.mode === 'ai_rival' && this.rivalCoords.length > 0) {
      for (const seg of this.rivalCoords) {
        if (seg.x === nextX && seg.z === nextZ) {
          if (this.hasShield) {
            this.hasShield = false;
            sound.playPowerup();
            this.events.onCommentary('¡Escudo repelió a la Cobra Rival!');
            return;
          }
          this.handleDeath('rival');
          return;
        }
      }
    }

    // Move Forward
    const newHead = { x: nextX, z: nextZ };
    this.playerCoords.unshift(newHead);

    // Check Food Collection
    const eatenIndex = this.cores.findIndex((c) => c.x === nextX && c.z === nextZ);

    if (eatenIndex !== -1) {
      const core = this.cores.splice(eatenIndex, 1)[0];
      this.removeCoreMesh(core.id);
      this.processCoreEaten(core);
    } else {
      // Pop tail if no food eaten
      this.playerCoords.pop();
    }

    this.playerSnake.updateSegments(this.playerCoords);
  }

  private stepRival() {
    if (this.rivalCoords.length === 0) return;

    const head = this.rivalCoords[0];

    // Compute obstacles for AI Rival:
    // (bounds, player snake segments, rival's own body segments, hazards)
    const obstacleKeys = new Set<string>();

    for (const p of this.playerCoords) {
      obstacleKeys.add(`${p.x},${p.z}`);
    }
    for (let i = 0; i < this.rivalCoords.length - 1; i++) {
      obstacleKeys.add(`${this.rivalCoords[i].x},${this.rivalCoords[i].z}`);
    }
    for (const h of this.hazards) {
      if (h.type !== 'portal') {
        obstacleKeys.add(`${h.x},${h.z}`);
      }
    }

    const foodTargets = this.cores.map((c) => ({ x: c.x, z: c.z }));

    // Run A* Pathfinding
    this.rivalDir = Pathfinding.getNextMove(
      head,
      this.rivalDir,
      foodTargets,
      obstacleKeys,
      this.gridWidth,
      this.gridHeight
    );

    let nextX = head.x;
    let nextZ = head.z;

    switch (this.rivalDir) {
      case 'UP': nextZ -= 1; break;
      case 'DOWN': nextZ += 1; break;
      case 'LEFT': nextX -= 1; break;
      case 'RIGHT': nextX += 1; break;
    }

    // Bounds / Obstacle check
    if (
      nextX < 0 ||
      nextX >= this.gridWidth ||
      nextZ < 0 ||
      nextZ >= this.gridHeight ||
      obstacleKeys.has(`${nextX},${nextZ}`)
    ) {
      // Rival crashed!
      sound.playCrash();
      this.shakeIntensity = 0.35;
      this.score += 500;
      this.events.onCommentary('¡La Cobra Rival ha colisionado! +500 PTS');
      this.rivalCoords = [];
      if (this.rivalSnake) {
        this.rivalSnake.updateSegments([]);
      }
      this.rivalRespawnTimer = 4.0; // Respawns in 4 seconds
      this.notifyScore();
      return;
    }

    const newHead = { x: nextX, z: nextZ };
    this.rivalCoords.unshift(newHead);

    // Check if rival ate food
    const eatenIndex = this.cores.findIndex((c) => c.x === nextX && c.z === nextZ);
    if (eatenIndex !== -1) {
      const core = this.cores.splice(eatenIndex, 1)[0];
      this.removeCoreMesh(core.id);
      this.rivalScore += core.value;
      sound.playEat(1, 'quantum');
      this.spawnRandomCore();
      this.events.onRivalUpdate(this.rivalScore, this.rivalCoords.length);
    } else {
      this.rivalCoords.pop();
    }

    if (this.rivalSnake) {
      this.rivalSnake.updateSegments(this.rivalCoords);
    }
  }

  private processCoreEaten(core: CoreItem) {
    this.coresCollected++;
    this.comboTimer = 4.0; // 4 seconds to chain next core
    this.combo = Math.min(5, this.combo + 1);

    const points = core.value * this.combo;
    this.score += points;
    this.shakeIntensity = core.type === 'mega_crystal' ? 0.3 : 0.1;

    sound.playEat(this.combo, core.type);

    if (core.type === 'overclock') {
      sound.playPowerup();
      this.isTurbo = true;
      setTimeout(() => { this.isTurbo = false; }, 5000);
      this.events.onCommentary('¡SOBRECARGA TEMPORAL ACTIVADA!');
    } else if (core.type === 'nano_shield') {
      sound.playPowerup();
      this.hasShield = true;
      this.events.onCommentary('¡Escudo Nano-Defensivo cargado!');
    } else if (core.type === 'mega_crystal') {
      sound.playVictory();
      this.events.onCommentary('¡MEGA CRISTAL SINTETIZADO!');
    }

    this.events.onCoreEaten(core.type, points);
    this.notifyScore();

    // Spawn new core
    this.spawnRandomCore();

    // Occasionally spawn bonus special core
    if (this.cores.length < 3 && Math.random() < 0.35) {
      this.spawnRandomCore();
    }
  }

  private handleDeath(cause: 'wall' | 'body' | 'hazard' | 'rival') {
    this.isPlaying = false;
    sound.playCrash();
    sound.setMode('menu');
    this.shakeIntensity = 0.5;

    this.events.onGameOver(
      this.score,
      Math.floor(this.gameDuration),
      this.coresCollected,
      cause,
      this.rivalScore
    );
  }

  private spawnRandomCore() {
    let x = 0;
    let z = 0;
    let attempts = 0;
    const occupied = new Set<string>();

    for (const p of this.playerCoords) occupied.add(`${p.x},${p.z}`);
    for (const r of this.rivalCoords) occupied.add(`${r.x},${r.z}`);
    for (const c of this.cores) occupied.add(`${c.x},${c.z}`);
    for (const h of this.hazards) occupied.add(`${h.x},${h.z}`);

    do {
      x = Math.floor(Math.random() * (this.gridWidth - 2)) + 1;
      z = Math.floor(Math.random() * (this.gridHeight - 2)) + 1;
      attempts++;
    } while (occupied.has(`${x},${z}`) && attempts < 100);

    const roll = Math.random();
    let type: CoreItem['type'] = 'quantum';
    let value = 100;
    let color = '#06b6d4';

    if (roll < 0.1) {
      type = 'mega_crystal';
      value = 500;
      color = '#ec4899';
    } else if (roll < 0.25) {
      type = 'overclock';
      value = 250;
      color = '#f59e0b';
    } else if (roll < 0.4) {
      type = 'nano_shield';
      value = 180;
      color = '#10b981';
    } else if (roll < 0.55) {
      type = 'time_dilator';
      value = 150;
      color = '#a855f7';
    }

    this.spawnCore(type, x, z, value, color);
  }

  private spawnCore(type: CoreItem['type'], x: number, z: number, value: number = 100, color: string = '#06b6d4') {
    const id = `core_${Date.now()}_${Math.random()}`;
    const item: CoreItem = { id, x, z, type, value, color };
    this.cores.push(item);

    const model = new EnergyCoreModel(item);
    this.scene.add(model.group);
    this.coreModels.set(id, model);
  }

  private clearCores() {
    for (const model of this.coreModels.values()) {
      this.scene.remove(model.group);
      model.dispose();
    }
    this.coreModels.clear();
    this.cores = [];
  }

  private removeCoreMesh(id: string) {
    const model = this.coreModels.get(id);
    if (model) {
      this.scene.remove(model.group);
      model.dispose();
      this.coreModels.delete(id);
    }
  }

  private notifyScore() {
    const currentSpeed = this.isTurbo ? 2.0 : 1.0;
    this.events.onScoreUpdate(
      this.score,
      this.combo,
      this.combo,
      this.playerCoords.length,
      currentSpeed
    );
  }

  private isOpposite(d1: Direction, d2: Direction): boolean {
    return (
      (d1 === 'UP' && d2 === 'DOWN') ||
      (d1 === 'DOWN' && d2 === 'UP') ||
      (d1 === 'LEFT' && d2 === 'RIGHT') ||
      (d1 === 'RIGHT' && d2 === 'LEFT')
    );
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    sound.stopBgm();

    this.clearCores();
    this.playerSnake.dispose();
    if (this.rivalSnake) this.rivalSnake.dispose();
    this.arena.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
