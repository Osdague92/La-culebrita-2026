# ARCHITECTURE — Mundos, Progresión y Persistencia

> **Objetivo:** desacoplar el escenario actual de la lógica del juego para soportar **4 biomas** sin duplicar código, con progresión persistente y una base extensible a más mundos.
>
> **Alcance:** diseño técnico. En esta fase **no se modifica** `GameEngine`, `ArenaEnvironment` ni componentes funcionales. Los snippets son contratos propuestos, no código aplicado.

---

## 1. Principios de diseño

1. **Datos sobre condicionales.** El motor no debe preguntar "¿estoy en el mundo X?". Debe leer un `WorldConfig` y aplicar sus valores. Los `if (world === ...)` se consideran deuda.
2. **Mundos ≠ Modos.** Un mundo define *escenario, tema, obstáculos, reglas ambientales y desbloqueo*. Un modo define *condición de victoria/derrota, spawns y ritmo*. La combinación `WorldConfig × ModeConfig` produce una `RunConfig`.
3. **Paridad primero.** El primer mundo (`neon_core`) debe reproducir el comportamiento actual exacto. La refactorización se valida contra el comportamiento previo antes de añadir contenido.
4. **Sin assets binarios.** Temas, texturas (Canvas) y audio se generan proceduralmente a partir de la configuración. Esto mantiene el peso del bundle y evita problemas de licencias en portales.
5. **Persistencia versionada y migrable.** Un único esquema con `version`, validación y migraciones; nunca leer JSON sin validar.
6. **Monetización desacoplada.** El motor emite eventos; el `AdManager` decide si hay anuncio. El gameplay no importa SDKs de anuncios.
7. **Determinismo testeable.** RNG inyectable (seed) para misiones/spawns; pruebas de reglas sin WebGL.

---

## 2. Estructura de carpetas recomendada

La migración debe ser incremental. La estructura objetivo:

```text
src/
├── App.tsx                          # Orquestador de pantallas (se adelgaza)
├── main.tsx
├── types/
│   └── game.ts                      # Tipos compartidos existentes
├── game/
│   ├── engine/
│   │   └── GameEngine.ts            # Orquestador del loop; delega en systems
│   ├── systems/
│   │   ├── MovementSystem.ts        # Avance de jugador/rival, buffer de giro
│   │   ├── CollisionSystem.ts       # Muros, cuerpo, hazards, rival, portales
│   │   ├── SpawnSystem.ts           # Cores, hazards, obstáculos iniciales
│   │   ├── ScoringSystem.ts         # Puntos, combo, créditos, récords
│   │   ├── PowerUpSystem.ts         # Escudo, turbo, time dilation
│   │   ├── HazardSystem.ts          # Movimiento/rotación de hazards
│   │   ├── CameraSystem.ts          # Follow, shake, órbita de menú
│   │   └── AudioSystem.ts           # Wrapper de SoundSynthesizer
│   ├── entities/
│   │   ├── ArenaEnvironment.ts      # Acepta un WorldTheme en constructor
│   │   ├── SnakeModel.ts
│   │   └── EnergyCoreModel.ts
│   ├── physics/
│   │   └── Pathfinding.ts
│   ├── world/
│   │   ├── WorldManager.ts          # Carga/descarga un mundo, aplica tema
│   │   ├── applyWorldTheme.ts       # Scene/fog/luces/materials desde config
│   │   └── validateWorldConfig.ts   # Validación en dev/build
│   └── audio/
│       └── SoundSynthesizer.ts
├── worlds/
│   ├── types.ts                     # WorldConfig, WorldTheme, reglas, unlock
│   ├── registry.ts                  # Mapa id → config + orden
│   ├── shared/
│   │   └── palettes.ts              # Paletas reutilizables
│   ├── neon-core/config.ts
│   ├── bio-hazard/config.ts
│   ├── cryo-void/config.ts
│   └── solar-forge/config.ts
├── modes/
│   ├── types.ts                     # ModeConfig
│   ├── registry.ts
│   ├── classic.ts
│   ├── survival.ts
│   ├── cyber-arena.ts
│   ├── ai-rival.ts
│   ├── infinite.ts
│   └── challenge.ts
├── progression/
│   ├── SaveSchema.ts                # Tipos del save + validación
│   ├── ProgressStore.ts             # API de lectura/escritura
│   ├── migrations.ts                # v0 → v1 → ...
│   ├── unlockEngine.ts              # Reglas de desbloqueo
│   └── StorageAdapter.ts            # localStorage / SDK de portal
├── content/
│   ├── missions.ts                  # Misiones estáticas/pregeneradas
│   ├── commentary.ts                # Frases locales por evento
│   ├── coachRules.ts                # Análisis heurístico determinista
│   ├── assistantKb.ts               # Base de conocimiento de AURA-26
│   └── skins.ts                     # Skins predefinidas + presets
├── monetization/
│   ├── AdManager.ts
│   ├── types.ts                     # AdAdapter, AdPlacement, AdResult
│   ├── policy.ts                    # Caps, cooldowns, consentimiento
│   └── adapters/
│       ├── NoopAdapter.ts
│       ├── CrazyGamesAdapter.ts
│       ├── AdSenseAdapter.ts
│       └── PokiAdapter.ts
├── services/
│   └── staticContentService.ts      # Sustituye geminiService en producción
├── components/                      # Se mantiene; añadir WorldSelectModal
└── game/entities/...                # Sin cambios de API pública
```

**Regla de oro:** `src/worlds/*/config.ts` solo contiene datos y, como máximo, *hooks puros* claramente tipados. La lógica genérica vive en `src/game/systems/`.

---

## 3. Contrato `WorldConfig`

### 3.1 Tipos base

```ts
// src/worlds/types.ts
import type { CoreItem, Direction, GameMode, GridCoord, SnakeSkin } from '../types/game';

export type WorldId = 'neon_core' | 'bio_hazard' | 'cryo_void' | 'solar_forge';

export type CollisionMode = 'death' | 'wrap' | 'bounce';

export type CoreType = CoreItem['type'];

export type ShieldTarget = 'wall' | 'body' | 'hazard' | 'rival';

export type HazardType = 'laser_barrier' | 'plasma_block' | 'moving_spire' | 'portal';

export interface WorldPalette {
  floorBase: string;
  floorAccent: string;
  floorSecondary: string;
  wall: string;
  wallRail: string;
  pylon: string;
  pylonCrystal: string;
  particle: string;
  hazard: string;
  hazardGlow: string;
  portal: string;
  uiAccent: string;
  uiAccentSoft: string;
  uiGradientFrom: string;
  uiGradientTo: string;
}

export interface FogConfig {
  mode: 'exp2' | 'linear';
  color: string;
  density?: number;   // exp2
  near?: number;      // linear
  far?: number;       // linear
}

export interface LightingConfig {
  hemisphere: {
    sky: string;
    ground: string;
    intensity: number;
  };
  key: {
    color: string;
    intensity: number;
    position: { x: number; y: number; z: number };
  };
  ambient?: {
    color: string;
    intensity: number;
  };
  shadows: boolean;
}

export interface FloorTheme {
  pattern: 'circuit' | 'organic' | 'ice' | 'lava';
  baseColor: string;
  accentColor: string;
  secondaryColor: string;
  metalness: number;
  roughness: number;
  emissiveIntensity: number;
  textureRepeat?: number; // por defecto grid.width
}

export interface ParticleTheme {
  count: number;
  color: string;
  size: number;
  speed: number;
  opacity: number;
  blending: 'additive' | 'normal';
}

export interface WorldTheme {
  background: string;
  fog: FogConfig;
  lighting: LightingConfig;
  palette: WorldPalette;
  floor: FloorTheme;
  particles: ParticleTheme;
}

export interface SpeedConfig {
  baseStepInterval: number;   // segundos por celda, p. ej. 0.15
  minStepInterval: number;    // límite de aceleración
  rampEveryCores: number;     // acelera cada N cores
  rampFactor: number;         // multiplicador por escalón (0.98)
  turboFactor: number;        // 0.5 = mitad de intervalo
}

export interface ScoringConfig {
  coreValues: Record<CoreType, number>;
  comboWindowSec: number;
  comboMax: number;
  rivalCrashBonus: number;
  creditsPerPoint: number;    // 0.1 => score/10
}

export interface CollisionRules {
  wall: CollisionMode;
  self: boolean;
  rival: boolean;
  hazard: boolean;
  shieldBlocks: ShieldTarget[];
  /** Algunos mundos permiten atravesar el borde con coste de puntos. */
  wallScorePenalty?: number;
}

export interface DynamicHazardRule {
  type: HazardType;
  startAfterSec: number;
  intervalSec: number;
  maxCount: number;
  placement: 'random' | 'perimeter' | 'center' | 'mirrored';
  /** Solo para moving_spire */
  movement?: { axis: 'x' | 'z'; speedCellsPerSec: number; range: number };
}

export interface ObstacleSpec {
  type: HazardType;
  x: number;
  z: number;
  dx?: number;
  dz?: number;
  targetPortal?: GridCoord;
}

export interface PowerUpRule {
  enabled: boolean;
  weight: number;       // peso relativo de spawn
  value: number;        // puntos
  durationSec?: number; // overclock, time_dilator
  charges?: number;     // shield
}

export interface MissionTemplate {
  objectiveType:
    | 'collect_energy'
    | 'survive_time'
    | 'reach_score'
    | 'beat_rival'
    | 'reach_multiplier';
  targetRange: [number, number];
  rewardCreditsRange: [number, number];
  lore: string;
  weight: number;
}

export type UnlockRule =
  | { kind: 'always' }
  | { kind: 'best_score'; value: number }
  | { kind: 'clear_world'; worldId: WorldId; stars?: number }
  | { kind: 'credits'; value: number }
  | { kind: 'missions'; worldId: WorldId; count: number };

export interface WorldAudioTheme {
  bgmMode: 'menu' | 'play' | 'turbo' | 'challenge';
  /** Transposición tonal del sintetizador (semitonos). */
  transpose?: number;
  ambientEnabled?: boolean;
}

export interface WorldConfig {
  id: WorldId;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  order: number;              // 1..N, orden de presentación
  version: number;            // versión del contenido del mundo

  theme: WorldTheme;

  grid: {
    width: number;            // 22 por defecto
    height: number;
  };

  speed: SpeedConfig;
  scoring: ScoringConfig;
  collisions: CollisionRules;

  /** Obstáculos que existen desde el inicio del run. */
  initialObstacles: ObstacleSpec[];

  /** Reglas de hazards que aparecen con el tiempo. */
  dynamicHazards: DynamicHazardRule[];

  powerUps: Record<CoreType, PowerUpRule>;

  missions: {
    pool: MissionTemplate[];
    /** Modos en los que este mundo puede jugarse. */
    supportedModes: GameMode[];
  };

  unlock: UnlockRule;

  audio: WorldAudioTheme;

  camera: {
    fov: number;
    menuOrbitRadius: number;
    followHeight: number;
    turboHeight: number;
  };

  ui: {
    cardGradient: [string, string];
    icon: string;             // nombre de icono lucide
    difficultyLabel: 'INICIADO' | 'AVANZADO' | 'EXPERTO' | 'MAESTRO';
  };

  /**
   * Hooks opcionales para mecánicas que no encajan en datos.
   * Deben ser puros y recibir/retornar un contexto serializable.
   * Preferir siempre una regla de datos antes que un hook.
   */
  hooks?: {
    onRunStart?: (ctx: WorldHookContext) => void;
    onStep?: (ctx: WorldHookContext) => void;
    onCoreEaten?: (ctx: WorldHookContext, coreType: CoreType) => void;
    onRunEnd?: (ctx: WorldHookContext, result: { score: number; cause: string }) => void;
  };
}

export interface WorldHookContext {
  grid: { width: number; height: number };
  score: number;
  combo: number;
  coresCollected: number;
  elapsedSec: number;
  speedMultiplier: number;
  /** RNG determinista inyectado por el motor. */
  rng: () => number;
}
```

### 3.2 Composición con modos

```ts
// src/modes/types.ts
import type { GameMode } from '../types/game';
import type { WorldConfig } from '../worlds/types';

export interface ModeConfig {
  id: GameMode;
  name: string;
  description: string;
  /** Modificadores sobre el WorldConfig. */
  overrides: {
    coreCount?: number;
    initialHazards?: 'world' | 'none' | 'mode';
    rivalEnabled?: boolean;
    rampsDifficulty?: boolean;
    timeLimitSec?: number;
    targetScore?: number;
    missionObjective?: 'auto' | 'collect_energy' | 'survive_time' | 'reach_score';
  };
  winCondition?: (stats: RunStats) => boolean;
  loseCondition: 'collision' | 'time' | 'target_missed';
}

export interface RunStats {
  score: number;
  durationSec: number;
  coresCollected: number;
  comboMax: number;
  rivalScore: number;
}

/** Resultado final que consume el GameEngine. */
export interface RunConfig {
  world: WorldConfig;
  mode: ModeConfig;
  seed: number;
}
```

**Uso:** `runConfig = composeRunConfig(world, mode)`; el motor solo lee `RunConfig`. Los cuatro mundos pueden jugarse en `classic`, `survival`, `cyber_arena` y `infinite` si `supportedModes` lo permite; la lógica específica de modo se aplica como override.

---

## 4. Los 4 mundos propuestos

> Todos los valores son propuestas iniciales (tuning pendiente). La paleta usa hex compatibles con `THREE.Color`. Los temas se generan proceduralmente; no se añaden texturas externas.

### Mundo 1 — NEON CORE

| Atributo | Valor |
|----------|-------|
| Rol | Mundo base / tutorial / paridad con el juego actual |
| Estética | Cian + violeta sobre azul noche; rejilla de circuito; partículas de datos |
| Fondo / niebla | `#02040a`; `FogExp2` densidad `0.025` |
| Luces | Hemi cian/índigo 1.4; key cálido 2.2; 4 balizas violeta |
| Suelo | Patrón `circuit`, metalness 0.8, roughness 0.35 |
| Partículas | 300, cian, additive |
| Velocidad | `baseStepInterval 0.15`; `min 0.09`; ramp cada 10 cores ×0.98; turbo 0.5 |
| Colisiones | Muro: muerte; cuerpo/rival/hazard: muerte; escudo bloquea los 4 |
| Obstáculos | Ninguno inicial; sin hazards dinámicos en classic |
| Power-ups | quantum 100, overclock 250/5 s, nano_shield 180/1, time_dilator 150/3 s, mega 500 |
| Desbloqueo | `always` |
| Twist | Ninguno: es la referencia competitiva |

### Mundo 2 — BIO-HAZARD SWAMP

| Atributo | Valor |
|----------|-------|
| Rol | Supervivencia y gestión de espacio |
| Estética | Verde ácido + ámbar; niebla densa; esporas flotantes; suelo orgánico |
| Fondo / niebla | `#04120a`; `FogExp2` densidad `0.04` |
| Luces | Hemi verde/oliva 1.1; key amarillo 1.8; balizas ámbar |
| Suelo | Patrón `organic`, metalness 0.2, roughness 0.75, emisivo bajo |
| Partículas | 450, verde, additive, tamaño 0.09 |
| Velocidad | `baseStepInterval 0.16`; `min 0.10`; ramp cada 8 cores ×0.985; turbo 0.55 |
| Colisiones | Muro: muerte; cuerpo: muerte; hazard: muerte; escudo bloquea hazard/cuerpo |
| Obstáculos iniciales | 4 `plasma_block` en diagonales (equivalente al survival actual, corregido) |
| Hazards dinámicos | `plasma_block` cada 22 s, máx 8, placement `random`; `moving_spire` desde 60 s, máx 2, velocidad 0.6 celdas/s |
| Power-ups | nano_shield con peso ×2; time_dilator ×1.5; mega ×0.5; overclock normal |
| Desbloqueo | `clear_world neon_core` con `stars >= 2` **o** `best_score >= 3000` |
| Twist | "Zona de esporas": cada 30 s se marca una zona 3×3 que ralentiza (`stepInterval ×1.15`) durante 6 s. Implementable con `dynamicHazards` + `hooks.onStep`. |

### Mundo 3 — CRYO VOID

| Atributo | Valor |
|----------|-------|
| Rol | Movilidad, bordes envolventes y precisión |
| Estética | Azul hielo + blanco + violeta tenue; niebla ligera; cristales y partículas de escarcha |
| Fondo / niebla | `#050b18`; `FogExp2` densidad `0.018` |
| Luces | Hemi azul/blanco 1.3; key frío 2.0; balizas cian claro |
| Suelo | Patrón `ice`, metalness 0.6, roughness 0.15, emisivo cian bajo |
| Partículas | 250, blanco azulado, tamaño 0.1, velocidad 0.12 |
| Velocidad | `baseStepInterval 0.135`; `min 0.08`; ramp cada 12 cores ×0.99; turbo 0.45 |
| Colisiones | **Muro: `wrap`** (teletransporte al lado opuesto); cuerpo: muerte; hazard: muerte |
| Obstáculos iniciales | 2 pares de portales + 2 `moving_spire` |
| Hazards dinámicos | `moving_spire` cada 25 s, máx 4, `placement: 'mirrored'` |
| Power-ups | time_dilator con peso ×2; overclock ×1.2; shield normal; mega ×0.7 |
| Desbloqueo | `clear_world bio_hazard` + `credits >= 5000` |
| Twist | **Inercia de hielo:** el buffer de giro se aplica con 1 paso de retraso (`turnDelaySteps: 1`). El jugador debe anticipar. Implementable en `MovementSystem` con un campo de config. |

> **Nota de implementación:** `wrap` requiere que el `CollisionSystem` transforme la coordenada antes de comprobar muros y que el render interpole el salto (o muestre un efecto de portal) para que no parezca un glitch.

### Mundo 4 — SOLAR FORGE

| Atributo | Valor |
|----------|-------|
| Rol | Alta velocidad, presión constante, experto |
| Estética | Naranja incandescente + rojo + negro forja; suelo de lava; brasas |
| Fondo / niebla | `#0d0503`; `FogExp2` densidad `0.03` |
| Luces | Hemi naranja/rojo 1.5; key blanco cálido 2.4; balizas rojas |
| Suelo | Patrón `lava`, metalness 0.4, roughness 0.4, emisivo alto |
| Partículas | 500, naranja, additive, tamaño 0.11, velocidad 0.4 |
| Velocidad | `baseStepInterval 0.125`; `min 0.07`; ramp cada 5 cores ×0.975; turbo 0.5 |
| Colisiones | Muro: muerte; cuerpo: muerte; hazard: muerte; **escudo solo bloquea hazard y rival** |
| Obstáculos iniciales | 4 `plasma_block` + 2 `laser_barrier` |
| Hazards dinámicos | `plasma_block` cada 18 s, máx 10; `moving_spire` desde 40 s, máx 3 |
| Power-ups | overclock ×2; shield ×0.7; time_dilator ×0.7; mega ×1.2 |
| Desbloqueo | `clear_world cryo_void` + `best_score >= 10000` |
| Twist | **Medidor de calor:** cada 15 s sin comer, el intervalo se multiplica por 0.97 acumulativo (máx 1.4× velocidad). Comer reinicia el medidor. Implementable con `hooks.onStep` o una regla `heat` en `SpeedConfig`. |

### 4.1 Matriz resumen

| Mundo | Dificultad | Muro | Velocidad base | Hazards | Unlock | Mecánica firma |
|-------|-----------|------|----------------|---------|--------|----------------|
| Neon Core | Iniciado | Muerte | 0.150 s | Ninguno/opcional | Siempre | Referencia |
| Bio-Hazard | Avanzado | Muerte | 0.160 s | Bloques + esporas | Neon Core 2★ o 3k | Zona de esporas |
| Cryo Void | Experto | **Wrap** | 0.135 s | Agujas + portales | Bio-Hazard + 5k CR | Inercia de hielo |
| Solar Forge | Maestro | Muerte | 0.125 s | Bloques + láseres | Cryo Void + 10k pts | Medidor de calor |

---

## 5. Flujo de estados

### 5.1 Nivel aplicación (React)

```text
BOOT
 └─ ProgressStore.load() + migrate()
     └─ TITLE
         ├─ WORLD_SELECT (lista, candados, récord por mundo)
         │   └─ MODE_SELECT (modos soportados por el mundo)
         │       └─ PLAYING
         │           ├─ PAUSED
         │           ├─ GAME_OVER
         │           │   ├─ RESULTS (stats, récord, misión)
         │           │   ├─ [Rewarded] Revivir (1 vez/run)
         │           │   ├─ [Rewarded] Probar mundo/skin bloqueado
         │           │   └─ [Interstitial] solo en transición natural
         │           └─ QUIT → TITLE (con confirmación)
         ├─ CUSTOMIZER (skins propias/preset)
         ├─ MISSIONS
         ├─ ASSISTANT (contenido estático)
         └─ SETTINGS
```

### 5.2 Nivel motor

```text
UNINITIALIZED
  → PREVIEW (menú, órbita de cámara, sin colisiones)
  → PLAYING (RunConfig activa)
      ↔ PAUSED
  → GAME_OVER (evento onGameOver, sin más pasos de simulación)
  → PREVIEW (al volver al menú)
  → DISPOSED (al desmontar)
```

`GameEngine` debe recibir `RunConfig` en `startRun(runConfig)` y exponer `worldId`/`modeId` de solo lectura. `WorldManager.apply(worldId)` se encarga de:

1. Validar el `WorldConfig` (en dev lanza; en prod cae a `neon_core`).
2. Aplicar fondo, niebla, luces y paleta a la escena.
3. Reconstruir `ArenaEnvironment` con el tema y tamaño de grilla.
4. Reconfigurar `SpawnSystem` y `HazardSystem`.
5. Notificar a la UI para actualizar acentos visuales.

### 5.3 Contrato de eventos ampliado

```ts
export interface GameEngineEvents {
  onRunStart: (run: RunConfig) => void;
  onScoreUpdate: (s: ScoreSnapshot) => void;
  onGameOver: (r: GameOverResult) => void;
  onCoreEaten: (e: CoreEatenEvent) => void;
  onCommentary: (text: string) => void;
  onRivalUpdate: (r: RivalSnapshot) => void;
  onWorldEvent: (e: WorldEvent) => void; // esporas, calor, wrap, portal
  onAdOpportunity: (p: AdPlacement) => void; // desacopla monetización
}
```

La UI nunca debe llamar a SDKs de anuncios directamente; solo reacciona a `onAdOpportunity` o solicita `AdManager.showRewarded()`.

---

## 6. Persistencia ligera con `localStorage`

### 6.1 Esquema `SaveDataV1`

```ts
// src/progression/SaveSchema.ts
import type { GameMission, GameSettings, SnakeSkin } from '../types/game';
import type { WorldId } from '../worlds/types';

export const SAVE_KEY = 'snakeai2026:save';
export const SAVE_VERSION = 1;

export interface WorldProgress {
  unlocked: boolean;
  unlockedAt: number | null;
  bestScore: number;
  bestDurationSec: number;
  bestCombo: number;
  stars: 0 | 1 | 2 | 3;
  plays: number;
  missionsCompleted: number;
  lastPlayedAt: number | null;
}

export interface SaveDataV1 {
  schema: 'snakeai2026/save';
  version: 1;
  createdAt: number;
  updatedAt: number;
  profileId: string; // UUID local, no PII

  settings: GameSettings & {
    reducedMotion: boolean;
    highContrast: boolean;
  };

  progression: {
    currentWorld: WorldId;
    unlockedWorlds: WorldId[];
    worlds: Record<WorldId, WorldProgress>;
    credits: number;
    totalGames: number;
    totalCoresCollected: number;
    longestSurvivalSec: number;
    victoriesOverRival: number;
    globalHighScore: number;
  };

  cosmetics: {
    ownedSkins: string[];
    equippedSkinId: string;
    customSkins: SnakeSkin[]; // límite: 20
  };

  missions: {
    active: GameMission[]; // límite: 10
    completedIds: string[];
    lastGeneratedAt: number | null;
  };

  flags: {
    tutorialCompleted: boolean;
    adsConsent: 'unknown' | 'granted' | 'denied';
    analyticsConsent: 'unknown' | 'granted' | 'denied';
    hasSeenPortalIntro: boolean;
  };
}
```

### 6.2 Reglas

| Regla | Implementación |
|-------|----------------|
| Una sola clave | `snakeai2026:save` (evita 5 claves dispersas). |
| Versión explícita | `version: 1`; migraciones en `migrations.ts`. |
| Validación | `parseSave(raw): SaveDataV1` con comprobación de tipos/rangos; si falla, backup + save nuevo. |
| Escritura debounced | 300–500 ms tras el último cambio; `beforeunload`/`visibilitychange` flush. |
| Cuota | Si `localStorage` lanza `QuotaExceededError`, recortar `customSkins` y reintentar; avisar. |
| Tamaño | Objetivo < 50 KB; límites de arrays y strings. |
| Migración legacy | Leer `snake_ai_2026_stats`, `_settings`, `_custom_skins` una vez y volcar a V1. |
| Sin secretos/PII | Nunca guardar tokens, emails ni claves. |
| Export/import | JSON descargable para soporte y portabilidad. |
| Adaptador | `StorageAdapter` permite usar `localStorage`, datos del SDK de portal o memoria (tests). |

### 6.3 Migración desde el estado actual

```ts
// pseudocódigo de migrations.ts
export function migrateLegacy(): SaveDataV1 {
  const legacyStats = safeParse(localStorage.getItem('snake_ai_2026_stats'));
  const legacySettings = safeParse(localStorage.getItem('snake_ai_2026_settings'));
  const legacySkins = safeParse(localStorage.getItem('snake_ai_2026_custom_skins')) ?? [];

  return createDefaultSave({
    progression: {
      credits: legacyStats?.credits ?? 0,
      totalGames: legacyStats?.totalGames ?? 0,
      totalCoresCollected: legacyStats?.totalEnergyCollected ?? 0,
      longestSurvivalSec: legacyStats?.longestSurvivalTime ?? 0,
      globalHighScore: legacyStats?.highScore ?? 0,
      victoriesOverRival: legacyStats?.victoriesOverRival ?? 0,
    },
    settings: { ...DEFAULT_SETTINGS, ...(legacySettings ?? {}) },
    cosmetics: { customSkins: legacySkins.slice(0, 20) },
  });
}
```

### 6.4 API de `ProgressStore`

```ts
export interface ProgressStore {
  load(): SaveDataV1;
  save(patch?: Partial<SaveDataV1>): void;
  flush(): void;

  getWorldProgress(id: WorldId): WorldProgress;
  setBest(id: WorldId, result: { score: number; durationSec: number; combo: number }): void;
  addCredits(amount: number): void;
  spendCredits(amount: number): boolean;
  unlockWorld(id: WorldId): void;
  isUnlocked(id: WorldId): boolean;

  ownSkin(skin: SnakeSkin): void;
  equipSkin(id: string): void;

  setMissionProgress(patch: Partial<SaveDataV1['missions']>): void;
  setConsent(type: 'ads' | 'analytics', value: 'granted' | 'denied'): void;

  exportJson(): string;
  importJson(json: string): { ok: boolean; error?: string };
  reset(): void;
}
```

### 6.5 Motor de desbloqueo

```ts
export function evaluateUnlock(
  rule: UnlockRule,
  save: SaveDataV1,
  worldId: WorldId,
  run?: { score: number; stars: 0 | 1 | 2 | 3 }
): boolean {
  switch (rule.kind) {
    case 'always':
      return true;
    case 'best_score':
      return save.progression.worlds[worldId].bestScore >= rule.value;
    case 'clear_world': {
      const w = save.progression.worlds[rule.worldId];
      return w.bestScore > 0 && w.stars >= (rule.stars ?? 1);
    }
    case 'credits':
      return save.progression.credits >= rule.value;
    case 'missions':
      return save.progression.worlds[rule.worldId].missionsCompleted >= rule.count;
  }
}
```

- Las estrellas se calculan al final del run con umbrales por mundo (p. ej. 1★ = terminar, 2★ = récord, 3★ = objetivo de misión).
- El desbloqueo se evalúa **después** de guardar el resultado, nunca durante el gameplay.
- Los mundos bloqueados pueden "probarse" con un *rewarded ad* (ver `MONETIZATION_AND_DEPLOY.md`), sin desbloquearlos permanentemente.

---

## 7. Aplicación del tema al render (contrato)

```ts
// src/game/world/applyWorldTheme.ts
export function applyWorldTheme(
  scene: THREE.Scene,
  lights: { hemi: THREE.HemisphereLight; key: THREE.DirectionalLight },
  theme: WorldTheme
) {
  scene.background = new THREE.Color(theme.background);

  if (theme.fog.mode === 'exp2') {
    scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density ?? 0.025);
  } else {
    scene.fog = new THREE.Fog(
      theme.fog.color,
      theme.fog.near ?? 1,
      theme.fog.far ?? 100
    );
  }

  lights.hemi.color.set(theme.lighting.hemisphere.sky);
  lights.hemi.groundColor.set(theme.lighting.hemisphere.ground);
  lights.hemi.intensity = theme.lighting.hemisphere.intensity;

  lights.key.color.set(theme.lighting.key.color);
  lights.key.intensity = theme.lighting.key.intensity;
  lights.key.position.set(
    theme.lighting.key.position.x,
    theme.lighting.key.position.y,
    theme.lighting.key.position.z
  );
  lights.key.castShadow = theme.lighting.shadows;
}
```

`ArenaEnvironment` debe recibir `WorldTheme` en el constructor y usar `theme.floor`/`theme.palette` para construir suelo, muros, pilones y partículas. Los materiales de hazards y portales deben leer `palette.hazard`, `palette.hazardGlow` y `palette.portal`.

---

## 8. Plan de refactorización sin *big bang*

| Etapa | Cambio | Criterio de aceptación |
|-------|--------|------------------------|
| A | Extraer `WorldTheme` del código actual a `neon-core/config.ts`; `ArenaEnvironment` acepta tema. | Captura visual y gameplay idénticos; `tsc` limpio; build OK. |
| B | Extraer `SpeedConfig`, `ScoringConfig`, `CollisionRules` y `initialObstacles` desde `GameEngine`. | Tests de reglas pasan; misma puntuación para una secuencia de inputs grabada. |
| C | Introducir `WorldManager` y `registry`; selector de mundo en UI con 1 mundo. | Cambio de mundo no recarga la página; dispose correcto de geometrías. |
| D | Añadir `modes` como overrides y mover la lógica de hazards de modo. | `survival`, `cyber_arena` y `ai_rival` conservan comportamiento (salvo bugs corregidos). |
| E | Añadir mundos 2–4 con sus configs y reglas de desbloqueo. | Cada mundo jugable, récord persistente, sin `if (worldId)` en systems. |
| F | Persistencia V1 + migración de claves legacy. | Datos antiguos migran; recarga conserva progreso; export/import funciona. |
| G | Contenido estático de misiones/coach y textos por mundo. | Sin llamadas de red; misma variedad percibida. |

### Riesgos del refactor

| Riesgo | Mitigación |
|--------|------------|
| Regresiones invisibles en colisiones | Tests unitarios de `CollisionSystem` con matrices de casos y "golden runs". |
| Configuración excesiva e ilegible | Validación + defaults + `shared/palettes.ts`; documentar cada campo. |
| Hooks que reintroducen acoplamiento | Limitar a 3 hooks, con contexto serializable; revisión de arquitectura. |
| Diferencia visual entre mundos "de papel" | Usar presupuesto de arte procedural: paletas, niebla, partículas, patrón de suelo. |
| Persistencia corrupta | Validación estricta, backup de save inválido, reset seguro. |
| Bundle growth por 4 mundos | Configs son datos pequeños; cargar temas por `import()` dinámico si crece. |

---

## 9. Criterios de aceptación de la Fase 2

- [ ] Existe `WorldConfig` tipado y validado; ningún sistema hace `if (worldId === ...)`.
- [ ] `neon_core` reproduce el gameplay y la estética actuales (paridad verificada).
- [ ] 4 mundos seleccionables, cada uno con tema, velocidad, colisiones, hazards y power-ups propios.
- [ ] Los mundos 2–4 se desbloquean según reglas persistidas y muestran su estado en la UI.
- [ ] Récord por mundo, créditos, estrellas y skins se guardan en un save versionado.
- [ ] Migración desde las claves legacy sin pérdida de datos.
- [ ] `tsc --noEmit` y build pasan; no hay regresiones de FPS en móvil de gama media.
