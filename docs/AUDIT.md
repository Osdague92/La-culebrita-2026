# AUDIT — SNAKE AI 2026 / La Culebrita 2026

> **Tipo:** Auditoría técnica de solo lectura (Fase 1)  
> **Repositorio:** `Osdague92/La-culebrita-2026`  
> **Commit auditado:** `1a9a7e2` — *build: switch to pre-compiled server execution* (2026-11-11)  
> **Fecha de auditoría:** 2026-11-16  
> **Alcance:** arquitectura, game loop, renderizado, estado, controles, puntuación, costos/seguridad de IA, rendimiento, bundle y preparación para producción.  
> **Restricción respetada:** no se modificó código funcional del juego. Solo se generaron artefactos locales ignorados por Git (`node_modules/`, `dist/`) para medir el build real y este documento.

---

## 0. Resumen ejecutivo

El proyecto es un arcade 3D funcional y visualmente sólido, construido con **React 19 + Three.js + Vite + TypeScript**, con un backend **Express** opcional que encapsula las llamadas a **Google Gemini**. La buena noticia es que **la API key no está expuesta en el cliente**: las llamadas a IA se hacen contra endpoints relativos `/api/*` y el SDK `@google/genai` solo se importa en `server.ts`.

Los tres riesgos principales para producción no son visuales sino operativos:

| # | Severidad | Hallazgo | Impacto |
|---|-----------|----------|---------|
| 1 | **Alto** | Si el servidor Express se despliega públicamente, los endpoints de IA no tienen autenticación, rate limiting, caché ni presupuesto máximo. | *Denial-of-wallet*: consumo de cuota/creditos de Gemini por tráfico masivo o abuso de terceros. |
| 2 | **Alto** | `npm install` limpio falla por conflicto de peer dependencies (`esbuild@0.25` vs. `vite@8` que exige `esbuild@^0.27 || ^0.28`). Solo existe `bun.lock`, no `package-lock.json`. | Un despliegue en Netlify/CI con `npm` puede fallar antes de construir. |
| 3 | **Medio** | El bundle cliente pesa **868.23 kB minificados / 230.67 kB gzip** y Vite emite warning de chunk > 500 kB; además hay hasta 10 luces (4 balizas + cores + hemi + direccional) y sombras activas por defecto. | Carga inicial aceptable en escritorio, pero mejorable en móvil de gama baja y portales H5. |

En Netlify **estático** el costo de IA es **$0** porque los endpoints Express no existen y el cliente cae siempre a sus fallbacks locales. Sin embargo, esto también significa que las funciones "Gemini" se degradan silenciosamente a contenido local. La estrategia recomendada es **desacoplar la IA a contenido estático/pregenerado** y eliminar el backend del despliegue público (ver `MONETIZATION_AND_DEPLOY.md`).

**Estado general:** jugable y publicable como build estático tras corregir el flujo de instalación, la persistencia y los detalles de modos. **No está listo** para enviarse a CrazyGames/Poki todavía: faltan SDK de portal, ciclo de vida de carga/gameplay, política de privacidad, `ads.txt` por target y una capa de monetización.

---

## 1. Arquitectura y stack

### 1.1 Stack real verificado

| Capa | Tecnología | Versión instalada / resuelta | Observaciones |
|------|------------|------------------------------|---------------|
| UI | React + ReactDOM | 19.3.1 | Sin router, sin estado global externo. |
| Render 3D | Three.js | 0.187.0 | `import * as THREE`; sin postprocessing. |
| Build | Vite | 8.3.8 | Rolldown/Vite 8; warning de `__dirname` en config. |
| Lenguaje | TypeScript | 7.0.2 | `tsc --noEmit` pasa sin errores. |
| Estilos | Tailwind CSS v4 | 4.3.x | Vía `@tailwindcss/vite`; CSS final 56.04 kB. |
| Backend opcional | Express | 4.21.x | Solo para dev/servidor Node; no requerido por el cliente. |
| IA | `@google/genai` | 2.32.0 | Importado **solo** en `server.ts`. |
| Audio | Web Audio API | Nativa | Sintetizador procedural; cero archivos de audio. |
| Animación UI | `motion` | 12.x | **Dependencia declarada pero no importada** en `src/`. |

### 1.2 Mapa de módulos

```
src/
├── main.tsx                 → monta <App />
├── App.tsx                  → orquestador React: pantallas, modales, stats, controles teclado
├── types/game.ts            → contratos de dominio (GameMode, SnakeSkin, CoreItem, etc.)
├── services/geminiService.ts→ cliente HTTP hacia /api/* con fallbacks locales
├── game/
│   ├── engine/GameEngine.ts → loop, física de grilla, colisiones, puntuación, cámara
│   ├── entities/
│   │   ├── ArenaEnvironment.ts → suelo, muros, pilones, partículas, hazards
│   │   ├── SnakeModel.ts       → malla compuesta de cabeza + segmentos
│   │   └── EnergyCoreModel.ts  → orbe + anillos + luz local
│   ├── physics/Pathfinding.ts  → A* + flood-fill para la serpiente rival
│   └── audio/SoundSynthesizer.ts → SFX y BGM sintetizados en runtime
└── components/
    ├── TitleScreen.tsx        → selección de modo y accesos a modales
    ├── GameHUD.tsx            → HUD de partida
    ├── MobileControls.tsx     → D-pad táctil + swipe + turbo
    ├── ResultsModal.tsx       → resultados y AI Coach
    ├── CustomizerModal.tsx    → skins predefinidas + generación "IA"
    ├── MissionsModal.tsx      → misiones Game Master
    ├── AssistantModal.tsx     → chat AURA-26
    └── SettingsModal.tsx      → ajustes de audio/vídeo
```

**Acoplamiento principal:** `GameEngine` conoce directamente el tamaño de la grilla, la paleta, los hazards de cada modo, la velocidad y las reglas de colisión. No existe una capa de configuración de mundo. Esto es exactamente lo que la Fase 2 debe desacoplar.

### 1.3 Game loop

El loop se implementa en `GameEngine.tick` (`src/game/engine/GameEngine.ts:367-413`):

```text
requestAnimationFrame(tick)
  ├─ clock.getDelta()
  ├─ clamp(delta, 0.05)              ← evita tunneling/lag spikes
  ├─ si playing && !paused:
  │    ├─ gameDuration += delta
  │    └─ updateGameLogic(delta)
  ├─ si !playing: órbita cinematográfica de cámara (menú)
  ├─ arena.update(elapsed, delta)
  ├─ coreModels.update(elapsed, delta)
  ├─ orientHead(playerDir, delta)
  ├─ decay de camera shake
  └─ renderer.render(scene, camera)
```

La simulación no es estrictamente de paso fijo, sino **acumulador de pasos de grilla**:

| Parámetro | Valor actual | Ubicación |
|-----------|--------------|-----------|
| Intervalo base por celda | `0.15 s` (~6.67 celdas/s) | `GameEngine.ts:66` |
| Turbo | `stepInterval * 0.5` (`0.075 s`) | `GameEngine.ts:440` |
| Rival | `stepInterval * 0.95` | `GameEngine.ts:457` |
| Ventana de combo | `4.0 s` | `GameEngine.ts:665` |
| Combo máximo | `5` | `GameEngine.ts:666` |
| Clamp de delta | `0.05 s` | `GameEngine.ts:372` |
| Grilla | `22 × 22` | `GameEngine.ts:33-34` |

Fortalezas:
- Delta clamp correcto para evitar saltos físicos.
- Cámara con `THREE.MathUtils.damp`, independiente del framerate.
- Separación entre simulación de grilla y render interpolado (parcial).
- Scratch vectors (`_vec3`, `_camTarget`) para reducir allocations.

Limitaciones:
- El movimiento del cuerpo **no se interpola** entre celdas: los segmentos "saltan" cada 0.075–0.15 s. En 60 fps se percibe a 6.6 pasos/s; en pantallas de 120/144 Hz el salto es más evidente.
- No hay `visibilitychange`/`blur` handler: la BGM y algunos timers (`setTimeout` del overclock) siguen vivos en segundo plano; el loop rAF sí se detiene.
- No hay manejo de pérdida de contexto WebGL (`webglcontextlost`).
- El modo `paused` no congela el `setTimeout` de power-ups.
- No existe un `fixedUpdate` separado del render; el acumulador puede ejecutar un solo paso por frame aunque el delta sea grande (limitado por el clamp).

### 1.4 Renderizado 3D

| Elemento | Implementación | Coste |
|----------|----------------|-------|
| Renderer | `WebGLRenderer`, `alpha:false`, `powerPreference:'high-performance'` | Correcto |
| Tone mapping | `ACESFilmicToneMapping`, exposure 1.15 | Coste bajo |
| Color space | `SRGBColorSpace` | Correcto |
| Sombras | `PCFSoftShadowMap`, mapa 1024², solo directional | Medio/alto en móvil |
| DPR | `min(devicePixelRatio, 2)` | Alto en móviles 2x/3x |
| Detección software GL | Extensión `WEBGL_debug_renderer_info` + regex SwiftShader/llvmpipe | Buena práctica |
| Niebla | `FogExp2(0x02040a, 0.025)` | Bajo |
| Luces | Hemisphere + Directional + 4 `PointLight` de esquina + 1 `PointLight` por core | **Hasta 10 luces** en el peor caso (4 cores) |
| Suelo | `BoxGeometry` 22×0.4×22 + textura Canvas 512² repetida 22×22 | Bajo |
| Partículas | 300 puntos, actualización CPU por frame + `needsUpdate` | Bajo, pero mejorable |
| Assets externos | Ninguno (geometría procedural, textura Canvas, audio sintetizado) | Excelente para portales |

La ausencia total de assets binarios es una **ventaja competitiva** para H5: no hay 404s, no hay descargas pesadas, no hay problemas de licencias de texturas/modelos. Las únicas dependencias externas son las fuentes de Google Fonts en `index.html`.

### 1.5 Manejo de estado

Hay dos fuentes de verdad:

1. **Estado mutable del motor** (`GameEngine`): `isPlaying`, `score`, `combo`, `playerCoords`, `rivalCoords`, `hazards`, `cores`, `isTurbo`, `hasShield`, etc.
2. **Estado React** (`App.tsx`): `gameState` (`title | playing | results`), `selectedMode`, modales, `stats`, `settings`, `currentSkin`, `customSkins`, telemetría HUD (`score`, `combo`, `speed`, etc.).

El puente es la interfaz `GameEngineEvents` (`GameEngine.ts:13-19`):

```ts
onScoreUpdate(score, combo, multiplier, length, speed)
onGameOver(score, duration, cores, cause, rivalScore)
onCoreEaten(coreType, points)
onCommentary(text)
onRivalUpdate(rivalScore, rivalLength)
```

Problemas detectados:

- **Stale closure:** `GameEngine` se instancia una sola vez en `App.tsx:155-200` (`useEffect(..., [])`) con callbacks que capturan `handleGameOver` y `stats.highScore`/`selectedMode` del **primer render**. Tras la primera partida, `isNewRecord` puede calcularse contra el récord inicial (seed `1200`) y el AI Coach puede recibir un `mode` obsoleto.
- **Récord inicial sembrado:** `highScore: 1200` en `App.tsx:45`; un jugador nuevo que haga 800 puntos no verá "nuevo récord", lo cual es intencional o un residuo de demo, pero debe documentarse.
- **Sin store central:** misiones, settings, skin equipada y progreso no comparten un esquema de persistencia.
- **`multiplier` es redundante:** `notifyScore` envía `this.combo` dos veces (`GameEngine.ts:786-795`).
- **Actualizaciones de HUD:** `notifyScore()` solo se invoca al comer/arrancar/resetear combo; el indicador de velocidad no refleja el turbo en tiempo real.

### 1.6 Controles

| Plataforma | Entrada | Implementación |
|------------|---------|----------------|
| Desktop | WASD / flechas | `App.tsx:255-320` |
| Desktop | Shift = turbo | `setTurbo(true/false)` |
| Desktop | Espacio / Escape = pausa | `togglePause()` |
| Móvil | Swipe (umbral 25 px) | `MobileControls.tsx:12-44` |
| Móvil | D-pad táctil + botón turbo | `MobileControls.tsx:47-109` |
| Ambos | Cola de entrada máxima 2 | `GameEngine.setDirection` (`331-343`) |
| Ambos | Bloqueo de giro 180° | `isOpposite()` |

No hay soporte para gamepad, teclas de pausa del sistema, ni foco accesible. El `user-scalable=no` del viewport impide zoom (mala práctica de accesibilidad).

### 1.7 Puntuación y economía actual

| Core | Valor base | Efecto | Estado |
|------|-----------:|--------|--------|
| `quantum` | 100 | Puntos | OK |
| `overclock` | 250 | Turbo automático 5 s | Parcial (timer no pausable) |
| `nano_shield` | 180 | Escudo de un impacto | **Defectuoso** (ver 1.8) |
| `time_dilator` | 150 | Ninguno | **No implementado** |
| `mega_crystal` | 500 | Puntos + SFX | OK |
| Crash del rival | +500 | Bonus | OK |

- Puntos = `valor del core × combo` (combo cap 5).
- Créditos al final = `floor(score / 10)` (`App.tsx:219`).
- Monedas/créditos se guardan en `stats.credits`, pero no hay tienda ni gate real de desbloqueo.
- Misiones: solo progresa `collect_energy` (`App.tsx:171-183`); `survive_time`, `reach_score`, `beat_rival` y `reach_multiplier` nunca actualizan progreso.
- La misión activa mostrada en HUD es `missions[0]`, no necesariamente la del modo `challenge`.

### 1.8 Modos: lo que dice la UI vs. lo que hace el motor

| Modo | Comportamiento real | Deuda |
|------|---------------------|-------|
| `classic` | Grilla abierta, 2 cores, sin hazards | OK |
| `survival` | 4 bloques de plasma + spawn dinámico | **Bug de ráfaga:** condición `Math.floor(t) % 25 === 0` es verdadera durante ~1 s y añade hazards hasta el máximo de 10 en ese segundo (`GameEngine.ts:466-475`). |
| `cyber_arena` | 2 portales + 2 agujas móviles | Las agujas solo rotan visualmente; `dx/dz` no se aplican al movimiento ni a la colisión. |
| `ai_rival` | Rival con A* + flood-fill, respawn 4 s | Rival no usa portales; al volver al menú la serpiente rival permanece en escena. |
| `infinite` | Idéntico a `classic` | Sin rampa de dificultad ni límite temporal. |
| `challenge` | Idéntico a `classic` (solo cambia BGM) | No consume la misión generada por el Game Master. |

### 1.9 Persistencia actual (solo `localStorage`)

| Clave | Contenido | Escritura |
|-------|-----------|-----------|
| `snake_ai_2026_stats` | `GameStats` (récord, partidas, cores, tiempo, créditos, victorias) | `useEffect` en `App.tsx:134-138` |
| `snake_ai_2026_custom_skins` | Array de `SnakeSkin` generadas | `useEffect` en `App.tsx:141-145` |
| `snake_ai_2026_settings` | `GameSettings` | **Solo lectura** (`App.tsx:55-69`); nunca se guarda. |

No se persisten: skin equipada, misiones, progreso por modo, mundos, estrellas, consentimiento de anuncios ni versión de esquema. Tampoco hay validación del JSON leído ni migraciones.

### 1.10 Calidad de código

- TypeScript estricto en la práctica: `npx tsc --noEmit` termina sin errores.
- Convenciones consistentes de nombres y separación `entities/engine/physics/audio`.
- Sin tests, sin linter distinto de `tsc`, sin CI, sin `README`, sin `LICENSE`.
- `GameEngine` concentra demasiadas responsabilidades (input, física, colisiones, spawns, scoring, cámara, hazards, rival). Es el principal candidato a extracción de sistemas en la Fase 2.
- `server.ts` y `server.js` duplican lógica; `server.js` es un artefacto compilado versionado en Git.

---

## 2. Auditoría de costos y seguridad de IA (crítico)

### 2.1 Dónde vive la API key

| Verificación | Resultado |
|--------------|-----------|
| `@google/genai` importado en cliente | **No**. Solo en `server.ts:5`. |
| `GEMINI_API_KEY` en `src/` | **No**. |
| Prefijo `VITE_` con secreto | **No**. |
| Clave real en `.env.example` | **No**. Solo placeholder `MY_GEMINI_API_KEY`. |
| `.env*` ignorado por Git | **Sí** (`.gitignore`, con excepción de `.env.example`). |
| Clave en historial Git | **No**. Solo aparece el placeholder; se verificó `git log --all -p`. |
| Clave embebida en bundle final | **No**. Se buscó `GEMINI_API_KEY`, `google/genai`, `generativelanguage.googleapis`, `AIza` en `dist/assets/*.js`: 0 coincidencias. |

**Conclusión:** la postura de secreto es correcta. El riesgo no es filtración de clave, sino **abuso de los endpoints que usan la clave**.

### 2.2 Superficie de API y comportamiento en runtime

| Endpoint | Método | Llama a Gemini | Frecuencia desde cliente | Fallback local | Protecciones |
|----------|--------|:--------------:|--------------------------|:--------------:|--------------|
| `/api/status` | GET | No | 1 al montar | Sí | Ninguna |
| `/api/game-master/mission` | POST | Sí (3 s timeout) | Al abrir/generar misión | Sí (5 misiones) | Ninguna |
| `/api/game-master/commentary` | POST | Sí (2.5 s timeout) | **No usado por el cliente** | Sí | Ninguna |
| `/api/coach/analyze` | POST | Sí (3 s timeout) | 1 por fin de partida | Sí (heurística) | Ninguna |
| `/api/assistant/chat` | POST | Sí (3 s timeout) | 1 por mensaje | Sí (reglas) | Ninguna |
| `/api/generate/skin` | POST | Sí (3 s timeout) | 1 por click en "Forjar skin" | Sí (4 paletas) | Ninguna |
| `/api/generate/video` | POST | No | No usado | N/A | Ninguna |

Observaciones importantes:

- **`getCommentary()` existe en el cliente pero no se invoca.** El HUD usa frases locales generadas por `GameEngine` (`events.onCommentary`). Es una vía de costo "latente" si alguien llama al endpoint directamente.
- **Timeout sin cancelación:** `withTimeout` usa `Promise.race`; la petición a Gemini sigue en vuelo y **puede facturarse** aunque el cliente ya haya recibido el fallback. No hay `AbortController`.
- **Sin caché:** dos jugadores con la misma petición de skin/misión generan dos llamadas; un mismo jugador que repite prompt genera otra.
- **Sin autenticación ni rate limiting:** cualquier origen puede hacer `POST` al servidor. No hay CORS allowlist, ni token anónimo, ni cuota por IP/sesión, ni CAPTCHA.
- **Body limit de 10 MB** (`server.ts:15`): vector de agotamiento de memoria/CPU si se expone públicamente.
- **Sin validación de entrada** (zod/joi) ni moderación de prompts. Un usuario puede enviar instrucciones maliciosas al chat o al generador de skins; en un portal esto es riesgo de cumplimiento.
- **Sin observabilidad:** no hay logs estructurados, métricas de tokens, alertas de presupuesto ni identificación de abuso.
- **Modelos posiblemente inexistentes:** `gemini-3.8-flash`, `gemini-nano-banana-2.1`, `gemini-omni-1.2-flash`, `lyria-3-clip-preview`. Si el ID no es válido, cada llamada falla y cae al fallback. El estado `/api/status` puede reportar `hasKey: true` y la UI mostrar "GEMINI CONECTADO" aunque todas las llamadas estén fallando. **Verificar contra la cuenta real antes de producción.**
- **`hasGeminiKey` expuesto** como booleano en `/api/status`: no es un secreto, pero revela la configuración del despliegue.
- **Puerto fijo 3000** (`server.ts:13`), ignorando `process.env.PORT`; muchos PaaS asignan puerto dinámico y el despliegue Node fallaría.
- **Sin Helmet/CSP/HSTS/X-Frame-Options**: relevante si se sirve el frontend y la API desde el mismo origen.

### 2.3 ¿Qué ocurre en Netlify?

| Escenario | Comportamiento |
|-----------|----------------|
| Build estático (`vite build` → `dist/`) | El juego carga y es 100% jugable. |
| Llamada a `/api/status` | Netlify devuelve 404/HTML; `res.json()` lanza; el servicio devuelve `{ status:'offline', hasKey:false }`. La UI muestra "IA LOCAL: ACTIVA". |
| Llamada a `/api/coach/analyze` | Falla el parseo; `catch` devuelve el análisis heurístico local. |
| Llamada a `/api/generate/skin` | Falla; devuelve una skin procedural local. |
| Coste Gemini | **$0** (no hay servidor que llame a Gemini). |
| Cold starts | **Ninguno** (hosting estático + CDN). |
| Riesgo de abuso | **Nulo** sobre Gemini, porque no hay endpoint. |

Esto confirma la estrategia: **para Netlify no se debe desplegar el servidor Express**. Si se quiere conservar la IA en producción, debe hacerse con Functions + control de cuota, no con el servidor actual.

### 2.4 Escenario de costo si se despliega el servidor Node

Fórmula:

```text
costo_mensual ≈
  MAU
  × sesiones_por_usuario
  × llamadas_IA_por_sesión
  × (tokens_entrada × precio_entrada + tokens_salida × precio_salida)
```

Ejemplo ilustrativo (precios ficticios solo para mostrar el orden de magnitud; **verificar tarifa vigente de Gemini**):

- 100,000 MAU
- 8 sesiones/usuario/mes
- 1.5 llamadas de Coach por sesión (una por partida)
- 400 tokens de entrada + 200 de salida por llamada
- Precio ejemplo: $0.10 / 1M tokens entrada; $0.40 / 1M tokens salida

```text
Llamadas/mes = 100,000 × 8 × 1.5 = 1,200,000
Entrada      = 1.2M × 400 = 480M tokens  → $48
Salida       = 1.2M × 200 = 240M tokens  → $96
Total aprox. = $144/mes
```

Si se activara el comentario por cada core (40 cores/partida) y se llamara a Gemini en cada uno:

```text
1.2M partidas × 40 = 48M llamadas/mes  → ~40× el escenario anterior
→ miles de dólares/mes, además de latencia inaceptable y agotamiento de cuota.
```

Riesgos asociados:

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:------------:|:-------:|------------|
| Abuso externo de endpoints | Alta si es público | Alto | Auth anónima + rate limit + CORS + WAF |
| Agotamiento de cuota gratuita | Alta con viralidad | Medio | Caché + fallback local + budget alerts |
| Factura inesperada | Media | Alto | Límite de gasto en Google Cloud + alertas + tope diario |
| Contenido inapropiado generado | Media | Alto (portal) | Moderación + listas de bloqueo + revisión |
| Timeout que sigue facturando | Alta | Medio | `AbortController` + presupuesto por petición |
| Prompt injection / jailbreak | Media | Medio | Sanitización + instrucciones de sistema + límites |
| DoS por body grande | Media | Medio | Bajar límite a 32 KB + validación estricta |
| Fallo silencioso de modelo | Alta | Medio | Health-check real con una llamada mínima + telemetría |

### 2.5 Recomendación de seguridad (resumen)

1. **No desplegar Express en producción pública para Netlify.**
2. Si se conserva IA en vivo, ponerla detrás de **Netlify Functions** con: token anónimo, rate limit por IP + sesión, caché de respuestas, tope diario de gasto, `AbortController`, validación zod, moderación y logs de tokens.
3. **Presupuesto y alertas** en Google Cloud desde el día 0; clave separada por entorno (dev/prod), rotación documentada.
4. **Nunca** mover la clave al cliente ni usar `VITE_GEMINI_KEY`.
5. Eliminar del cliente las llamadas a IA en producción y sustituirlas por contenido estático (ver `MONETIZATION_AND_DEPLOY.md`).

---

## 3. Rendimiento y tamaño del bundle

### 3.1 Medición real de build

Comando ejecutado: `npx vite build` (sin compilar `server.js` para no tocar artefactos versionados).

| Salida | Tamaño | Gzip |
|--------|-------:|-----:|
| `dist/assets/index-*.js` | **868.23 kB** | **230.67 kB** |
| `dist/assets/index-*.css` | 56.04 kB | 8.98 kB |
| `dist/index.html` | 1.49 kB | 0.69 kB |
| Módulos transformados | 1,677 | — |
| Tiempo de build | 1.54 s | — |

Vite emite:

```text
(!) Some chunks are larger than 500 kB after minification.
```

### 3.2 Composición estimada

| Componente | Peso relativo | Notas |
|------------|---------------|-------|
| Three.js | Dominante (~60-70% del JS) | Se usa el namespace completo, pero el tree-shaking de ESM elimina clases no referenciadas. |
| React + ReactDOM | ~15-20% | React 19.3.1. |
| Lucide React | Pequeño | Iconos tree-shaken; solo los importados. |
| Código de juego/UI | ~10-15% | `GameEngine` es el módulo más grande (25.8 kB de fuente). |
| `motion` | **0%** | Declarado pero no importado; no entra al bundle, pero infla instalación/auditoría. |
| `@google/genai`, Express, dotenv | **0% en cliente** | Solo servidor. |

Objetivo recomendado: **< 200 kB gzip** para la carga inicial y **< 1.5 s** de "time to play" en 4G. Se puede lograr con code splitting (Three/UI), carga diferida de modales y compresión Brotli de Netlify.

### 3.3 Cuellos de botella probables

| Área | Estado | Impacto | Recomendación |
|------|--------|---------|---------------|
| DPR hasta 2 | `setPixelRatio(min(dpr,2))` | Alto en móviles OLED | Escalar a 1.5 o 1.25 en gama baja; quality tiers. |
| Hasta 10 luces | 4 balizas + hasta 4 cores + hemi + dir | Medio/alto en mobile | Sustituir luces de core por sprites/emissive; reducir balizas. |
| Sombras PCFSoft 1024 | Activas salvo software GL | Medio | Toggle de calidad; sombras solo en desktop. |
| Sin postprocessing | Bloom no implementado | Bajo | Mantener desactivado por rendimiento o añadir bloom opcional con UnrealBloomPass. |
| Partículas CPU | 300 puntos, loop `for` + `needsUpdate` cada frame | Bajo | Mantener; mover a shader si crece. |
| Allocations por core | Nueva geometría/material/luz por cada core | Medio (GC) | Object pooling / reutilización de geometrías y materiales. |
| Movimiento snap | Sin interpolación | Percepción de fluidez | Interpolar posiciones entre celdas en el render. |
| `A*` cada paso del rival | Búsqueda O(n²) sobre 484 celdas | Bajo | OK para 22×22; usar heap si crece el grid. |
| Falta de `visibilitychange` | BGM/timers siguen | Medio (batería/UX) | Pausar audio y timers al ocultar pestaña. |
| Sin context loss | No hay handler | Medio | Recrear recursos o recargar escena. |
| Resize | Solo `window.resize` | Bajo | `ResizeObserver` en el contenedor. |
| Fuentes externas | 3 familias de Google Fonts | Medio (render-blocking/CLS) | Self-host + `font-display: swap` + subset latin. |

### 3.4 Instalación y reproducibilidad (hallazgo alto)

`npm install` limpio falla:

```text
npm error ERESOLVE could not resolve
npm error While resolving: vite@8.3.8
npm error Found: esbuild@0.25.12
npm error Could not resolve dependency:
npm error peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.3.8
```

- Causa: `esbuild` está fijado en `devDependencies` como `^0.25.0`, pero Vite 8 espera `^0.27 || ^0.28`.
- Workaround actual: `npm install --legacy-peer-deps` (fue necesario para esta auditoría).
- El repo solo incluye `bun.lock` (v2). No hay `package-lock.json` ni `pnpm-lock.yaml`.
- Netlify, por defecto, puede intentar `npm install` y fallar. Si detecta Bun, el resultado puede diferir del entorno probado.
- El script `build` ejecuta `vite build && esbuild server.ts ... --outfile server.js`, y `server.js` está versionado. Cualquier build local modifica un archivo rastreado.
- `clean` usa `rm -rf dist server.js`, no es portable a Windows sin shell POSIX.

**Acción P0:** alinear `esbuild` con Vite 8, generar y versionar `package-lock.json` (o declarar el gestor con `packageManager`), y separar scripts `build:web` (Netlify) de `build:server` (Node).

### 3.5 Deuda técnica priorizada

| ID | Hallazgo | Severidad | Esfuerzo | Evidencia |
|----|----------|:---------:|:--------:|-----------|
| TD-01 | `npm install` falla por peer de esbuild | Alto | S | `package.json` |
| TD-02 | Endpoints IA sin auth/rate limit/caché | Alto | M | `server.ts:46-449` |
| TD-03 | Configuración de mundo hardcodeada | Alto | L | `GameEngine.ts` (grid, hazards, paleta) |
| TD-04 | Persistencia incompleta y sin versión | Alto | M | `App.tsx:39-81`, `134-145` |
| TD-05 | Stale closure en callbacks del motor | Medio | S | `App.tsx:155-253` |
| TD-06 | Settings no se guardan ni afectan al motor | Medio | S | `App.tsx:55-69` |
| TD-07 | Modos `infinite`/`challenge` sin lógica propia | Medio | M | `GameEngine.ts:245-271` |
| TD-08 | Bug de ráfaga de hazards en Survival | Medio | S | `GameEngine.ts:466-475` |
| TD-09 | Escudo no reposiciona y muere al siguiente paso | Medio | S | `GameEngine.ts:503-556` |
| TD-10 | `time_dilator` sin efecto | Medio | S | `GameEngine.ts:663-698` |
| TD-11 | Overclock y turbo manual se pisan | Medio | S | `GameEngine.ts:674-678`, `345-353` |
| TD-12 | Rival permanece en escena al volver al menú | Bajo | S | `GameEngine.setupMenuPreview` |
| TD-13 | Hazards `moving_spire` no se mueven | Medio | S | `ArenaEnvironment.ts:195-217` |
| TD-14 | Sin SDK de portal ni lifecycle de carga | Alto | M | `index.html`, `App.tsx` |
| TD-15 | Sin SEO/OG completo, ads.txt, manifest | Medio | S | `index.html` |
| TD-16 | `motion` no usado; tipos en `dependencies` | Bajo | S | `package.json` |
| TD-17 | `server.ts`/`server.js` duplicados; puerto fijo | Medio | S | raíz del repo |
| TD-18 | Sin tests/CI/README/LICENSE | Medio | M | repo |
| TD-19 | Sin manejo de visibilidad/context loss | Medio | S | `GameEngine` |
| TD-20 | Fuentes externas y viewport no accesible | Bajo | S | `index.html` |

---

## 4. Preparación para producción

### 4.1 Lo que ya está bien

- Build estático generable sin backend.
- Cero assets binarios y cero dependencias de red para el gameplay.
- Typecheck limpio.
- Secreto de Gemini fuera del cliente y fuera del historial.
- Fallbacks locales para todas las funciones de IA.
- Detección de WebGL software y reducción de DPR/sombras.
- UI responsive con controles táctiles.

### 4.2 Bloqueadores antes de publicar en portales

| Bloqueador | Estado | Referencia |
|------------|:------:|------------|
| SDK de portal (CrazyGames/Poki) y lifecycle | ❌ | `MONETIZATION_AND_DEPLOY.md` §4 |
| Monetización con adapter y caps | ❌ | `MONETIZATION_AND_DEPLOY.md` §2 |
| `ads.txt` por target | ❌ | `MONETIZATION_AND_DEPLOY.md` §3 |
| SEO/OG completo y favicon | ❌ | `index.html` |
| Privacidad/consentimiento/edad | ❌ | sin política |
| Persistencia de progreso y settings | ⚠️ | `App.tsx` |
| Build reproducible en CI | ❌ | `package.json` |
| QA multi-dispositivo y performance budget | ⚠️ | pendiente |
| Eliminación/aislamiento de IA en producción | ✅ (si se usa build estático) / ⚠️ (si se usa Node) | `server.ts` |
| Accesibilidad básica | ⚠️ | viewport, foco, reduced motion |

### 4.3 Veredicto

- **Como demo técnica / portfolio:** listo.
- **Como build estático en Netlify:** casi listo; corregir instalación reproducible y persistencia. Coste de IA $0.
- **Como juego en CrazyGames/Poki:** no listo; falta la capa de portal, monetización, cumplimiento y QA.
- **Como servicio con IA en vivo:** no recomendado en su forma actual por riesgo de costo/abuso.

---

## 5. Evidencia de las verificaciones realizadas

```text
git rev-parse --short HEAD            → 1a9a7e2
npx tsc --noEmit                      → OK (sin salida, exit 0)
npx vite build                        → OK
  JS  868.23 kB (gzip 230.67 kB)
  CSS  56.04 kB (gzip   8.98 kB)
  HTML  1.49 kB (gzip   0.69 kB)
  módulos: 1,677
búsqueda de secretos en dist/assets   → 0 coincidencias
búsqueda de claves en historial Git    → solo placeholder MY_GEMINI_API_KEY
npm install (limpio)                  → falla ERESOLVE
npm install --legacy-peer-deps        → OK (194 paquetes)
```

> **Nota:** los artefactos `node_modules/` y `dist/` están ignorados por `.gitignore`; no forman parte de los entregables ni se versionaron. El único cambio de esta fase son los archivos de `docs/`.
