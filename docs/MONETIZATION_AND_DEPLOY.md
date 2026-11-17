# MONETIZATION & DEPLOY — IA estática, AdManager y Netlify

> **Objetivo:** publicar el juego con **costo de backend $0**, sin *cold starts*, con una capa de anuncios agnóstica (CrazyGames / AdSense H5 / Poki / sin anuncios) y un despliegue reproducible en Netlify con dominio propio.
>
> **Alcance:** diseño e integración propuestos. En esta fase no se modifica el código funcional; los snippets son contratos.

---

## 1. Decisiones de arquitectura

| Decisión | Elección | Motivo |
|----------|----------|--------|
| IA en producción | **Contenido estático/pregenerado** | $0 por usuario, sin latencia, sin claves, sin abuso, sin cold starts. |
| Backend | **Eliminado del despliegue web** | Netlify sirve solo `dist/`; no hay Express ni endpoints que proteger. |
| Anuncios | **Adapter + fachada `AdManager`** | Un solo gameplay para web, CrazyGames, Poki y desarrollo. |
| Anuncios por portal | **Solo el SDK del portal** | CrazyGames/Poki prohíben redes de anuncios de terceros. |
| Build | **Targets por plataforma** | `VITE_TARGET=web|crazygames|poki|local` genera variantes. |
| Persistencia | `localStorage` con adaptador | Portable; el SDK del portal puede sustituirlo si ofrece almacenamiento. |
| Costo Netlify | Plan gratuito | Tráfico estático + CDN; sin funciones. |

---

## 2. Desacoplar la IA de Gemini (costo $0)

### 2.1 Situación actual

- `geminiService` llama a `/api/*` con `fetch` y cae a fallbacks locales si falla.
- `server.ts` usa `GEMINI_API_KEY` y `@google/genai`; no está en el bundle cliente.
- En Netlify estático los endpoints no existen → **todo cae a local**. Es decir, el juego ya funciona sin IA, pero las funciones "IA" no aportan nada nuevo.

### 2.2 Arquitectura propuesta

```text
src/content/
├── missions.ts          # Plantillas + generador determinista con seed
├── commentary.ts        # Frases por evento (core, combo, close_call, death, rival)
├── coachRules.ts        # Reglas heurísticas -> grade, strengths, weaknesses, drill
├── assistantKb.ts       # Intenciones + respuestas de AURA-26
├── skins.ts             # Presets + mapeo prompt -> paleta (hash determinista)
└── generated/           # (Opcional) JSON pregenerado en build-time, versionado
    ├── missions.extra.json
    ├── skins.extra.json
    └── coach.extra.json
```

```ts
// src/services/staticContentService.ts
import type { CoachAnalysis, GameMission, SnakeSkin } from '../types/game';
import type { WorldId } from '../worlds/types';
import { MISSIONS_BY_WORLD } from '../content/missions';
import { buildCoachAnalysis } from '../content/coachRules';
import { synthesizeSkinFromPrompt } from '../content/skins';
import { answerAssistant } from '../content/assistantKb';

export interface MatchSummary {
  score: number;
  duration: number;
  energyCollected: number;
  collisionType: 'wall' | 'body' | 'hazard' | 'rival';
  mode: string;
  rivalScore: number;
  worldId: WorldId;
}

export const staticContent = {
  getMission(worldId: WorldId, seed: number, playerLevel: number): GameMission {
    return MISSIONS_BY_WORLD[worldId].pick(seed, playerLevel); // puro/determinista
  },
  analyzeMatch(summary: MatchSummary): CoachAnalysis {
    return buildCoachAnalysis(summary);
  },
  generateSkin(prompt: string): SnakeSkin {
    return synthesizeSkinFromPrompt(prompt); // hash(prompt) -> paleta/estilo
  },
  chat(message: string, context: Record<string, unknown>): string {
    return answerAssistant(message, context);
  },
};
```

Ventajas:
- API idéntica a la actual (`getMission`, `analyzeMatch`, `generateSkin`, `chat`) → migración de componentes casi mecánica.
- Sin `fetch`, sin `async`, sin estados de carga, sin timeouts, sin fallbacks duplicados.
- Determinista: mismos inputs → mismos resultados (testeable); se puede variar con seed por run/día.
- La "IA" percibida se mantiene: misiones con lore, coach con fortalezas/debilidades, skins con nombres y paletas, asistente con intenciones.

### 2.3 Generación opcional en build-time (si se quiere variedad "LLM")

No ejecutar Gemini en runtime. En su lugar:

```text
scripts/generate-content.mjs   (ejecución manual o job de CI, nunca en el navegador)
  1. Lee prompts desde content/prompts/*.json
  2. Calcula hash(prompt + versión) → si existe en content/generated/, reutiliza
  3. Si no existe y hay GEMINI_API_KEY local, genera y guarda JSON
  4. Valida el JSON y lo escribe en src/content/generated/
  5. Se revisa y se commitea junto al código
```

- La clave vive solo en el entorno de generación (local/CI secreto), **nunca** en Netlify ni en el bundle.
- El resultado es contenido estático versionado; costo único de generación, no por usuario.
- Si no hay clave, el generador determinista sigue funcionando; el contenido extra es un "nice to have".

### 2.4 Comparativa

| Criterio | IA en vivo (actual con Node) | IA estática (propuesta) |
|----------|------------------------------|--------------------------|
| Costo por usuario | Variable, ~$0.0001+ por llamada | **$0** |
| Latencia | 300–3000 ms + red | **0 ms** (local) |
| Cold start | Sí (serverless) | **No** |
| Clave en producción | Necesaria | **Ninguna** |
| Abuso/denial-of-wallet | Alto riesgo | **Nulo** |
| Variedad | Alta | Media-alta (packs + seeds) |
| Moderación de contenido | Necesaria | **Contenido curado** |
| Cumplimiento en portales | Complejo (red externa) | **Simple** |
| Mantenimiento | Modelos, cuotas, errores | Datos + tests |

> **Si en el futuro se requiere IA en vivo**, hacerlo con Netlify Functions + token anónimo + rate limit + caché + presupuesto diario + moderación. No reutilizar el Express actual tal cual.

### 2.5 Migración de código (sin tocar gameplay)

1. Crear `src/content/*` y `staticContentService`.
2. Sustituir en `App.tsx`, `CustomizerModal`, `MissionsModal`, `AssistantModal` las llamadas `gemini.*` por `staticContent.*`.
3. Eliminar `src/services/geminiService.ts` del cliente (o dejarlo como adaptador solo-dev detrás de flag).
4. Mover `server.ts`, `server.js`, `express`, `dotenv`, `@google/genai` a `server/` opcional o `devDependencies`; excluirlos del build web.
5. Verificar que `dist/` no contiene `fetch('/api/` ni cadenas de Gemini.

**Criterio de aceptación:** el juego es 100% funcional con la red desconectada (excepto fuentes si no se self-hostean).

---

## 3. Capa de monetización: `AdManager` (patrón Adapter)

### 3.1 Principios

1. **Nunca interrumpir el gameplay.** Sin anuncios durante la partida, pausa, carga o título.
2. **Rewarded siempre opt-in.** El jugador decide ver el anuncio a cambio de una recompensa clara.
3. **Interstitial solo en transiciones naturales:** fin de partida (al cerrar resultados) o cambio de mundo.
4. **Caps y cooldowns** para no degradar la experiencia ni incumplir políticas del portal.
5. **Un solo adaptador activo** según target/entorno.
6. **Recompensa solo si el anuncio se completó.** Nunca por dismiss/error/no-fill.
7. **Consentimiento** antes de anuncios personalizados (GDPR/EEA/UK); el portal puede gestionarlo.
8. **El gameplay no conoce SDKs.** Solo conoce `AdManager` y eventos de oportunidad.

### 3.2 Contratos

```ts
// src/monetization/types.ts
export type AdType = 'rewarded' | 'interstitial';

export type AdPlacement =
  | 'revive'          // revivir tras morir (1/run)
  | 'unlock_trial'    // probar mundo/skin bloqueado
  | 'double_credits'  // duplicar créditos al final
  | 'post_game'       // interstitial tras cerrar resultados
  | 'world_transition'; // interstitial al cambiar de mundo

export type AdStatus =
  | 'completed'
  | 'dismissed'
  | 'unavailable'   // no-fill / SDK no listo / adblock
  | 'error'
  | 'cooldown'
  | 'no_consent'
  | 'not_supported';

export interface AdResult {
  status: AdStatus;
  rewardGranted: boolean;
  placement: AdPlacement;
  message?: string;
}

export interface AdAdapter {
  readonly id: 'crazygames' | 'adsense' | 'poki' | 'noop';
  init(): Promise<void>;
  isSupported(type: AdType): boolean;
  showRewarded(placement: AdPlacement): Promise<AdResult>;
  showInterstitial(placement: AdPlacement): Promise<AdResult>;

  // Ciclo de vida exigido por portales (opcional en web)
  gameLoadingStart?(): void;
  gameLoadingStop?(): void;
  gameplayStart?(): void;
  gameplayStop?(): void;
  isAdBlocked?(): boolean;
}
```

```ts
// src/monetization/AdManager.ts
export class AdManager {
  private adapter: AdAdapter;
  private policy: AdPolicy;
  private inFlight = false;
  private rewardTokens = new Set<string>(); // idempotencia

  constructor(adapter: AdAdapter, policy: AdPolicy) {
    this.adapter = adapter;
    this.policy = policy;
  }

  async init() { await this.adapter.init(); }

  canShow(placement: AdPlacement, type: AdType): boolean {
    return this.policy.canShow(placement, type) && !this.inFlight;
  }

  async showRewarded(placement: AdPlacement, token: string): Promise<AdResult> {
    if (!this.policy.canShow(placement, 'rewarded')) {
      return { status: 'cooldown', rewardGranted: false, placement };
    }
    if (this.rewardTokens.has(token)) {
      return { status: 'error', rewardGranted: false, placement, message: 'duplicate_token' };
    }
    this.inFlight = true;
    this.policy.onStart(placement);

    try {
      this.adapter.gameplayStop?.();
      const result = await this.adapter.showRewarded(placement);
      if (result.status === 'completed') {
        this.rewardTokens.add(token);
        this.policy.onReward(placement);
        return { ...result, rewardGranted: true };
      }
      return { ...result, rewardGranted: false };
    } finally {
      this.adapter.gameplayStart?.();
      this.inFlight = false;
    }
  }

  async showInterstitial(placement: AdPlacement): Promise<AdResult> {
    if (!this.policy.canShow(placement, 'interstitial')) {
      return { status: 'cooldown', rewardGranted: false, placement };
    }
    this.inFlight = true;
    this.policy.onStart(placement);
    try {
      this.adapter.gameplayStop?.();
      return await this.adapter.showInterstitial(placement);
    } finally {
      this.adapter.gameplayStart?.();
      this.inFlight = false;
    }
  }
}
```

### 3.3 Política de frecuencia

| Placement | Tipo | Disparador | Cap | Recompensa |
|-----------|------|------------|-----|------------|
| `revive` | Rewarded | Pantalla de muerte, botón explícito | **1 por run**, 3/día | Revivir en celda libre cercana + 3 s de invulnerabilidad |
| `unlock_trial` | Rewarded | Mundo/skin bloqueado en selección | 1 por mundo/día | 1 run de prueba o 15 min de skin |
| `double_credits` | Rewarded | Results, botón explícito | 1 por run | ×2 créditos de la partida |
| `post_game` | Interstitial | Al cerrar Results | Cada 2 runs, mínimo 180 s, nunca en la primera run | — |
| `world_transition` | Interstitial | Cambio de mundo confirmado | 1 cada 5 min | — |

Reglas adicionales:
- No mostrar interstitial si el jugador acaba de ver un rewarded en la misma pantalla.
- No mostrar anuncios si `adsConsent === 'denied'` o `unknown` (cuando la normativa lo exija).
- Pausar música/SFX y el loop de simulación antes de pedir el anuncio; reanudar al terminar.
- En portales, no solicitar interstitial antes de `gameplayStart`/después de `gameplayStop` de forma incorrecta; respetar su ciclo de vida.
- Persistir caps diarios en el save (`ads.lastShownAt`, `ads.countByPlacement`) para que no se reseteen recargando.

### 3.4 Máquina de estados de recompensa

```text
[Botón "Revivir (ver anuncio)"]
        │
        ▼
 canShow(revive)? ── no ──► mostrar "No disponible" (sin castigo)
        │ sí
        ▼
 AdManager.showRewarded('revive', token)
        │
        ├─ completed ──► engine.revivePlayer() ──► grant una vez (token)
        ├─ dismissed ──► volver a Results (sin recompensa)
        ├─ unavailable/error ──► mostrar fallback y permitir reintento con cooldown
        └─ timeout (p. ej. 20 s) ──► tratar como dismissed
```

**Revivir seguro (especificación):**
1. Elegir la celda libre más cercana a la cabeza (BFS corto) que no sea hazard/rival/cuerpo.
2. Limpiar hazards en un radio de 1 celda (o dar 3 s de escudo).
3. Mantener la longitud y el score; resetear el acumulador de paso.
4. Marcar `reviveUsed = true` en el run; no permitir otro revivir en la misma partida.
5. Si no existe celda segura, no ofrecer revivir (evita un estado injugable).

### 3.5 Adaptador CrazyGames (v3)

> Verificar la firma exacta contra la documentación vigente del SDK; las versiones cambian. Este código es un contrato de integración, no una copia literal.

```html
<!-- index.html solo para target crazygames -->
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

```ts
// src/monetization/adapters/CrazyGamesAdapter.ts
export class CrazyGamesAdapter implements AdAdapter {
  readonly id = 'crazygames' as const;
  private sdk = (window as any).CrazyGames?.SDK;

  async init() {
    if (!this.sdk) throw new Error('CrazyGames SDK no cargado');
    await this.sdk.init();
  }

  isSupported(type: AdType) { return type === 'rewarded' || type === 'interstitial'; }

  gameLoadingStart() { this.sdk?.game.loadingStart(); }
  gameLoadingStop() { this.sdk?.game.loadingStop(); }
  gameplayStart() { this.sdk?.game.gameplayStart(); }
  gameplayStop() { this.sdk?.game.gameplayStop(); }
  isAdBlocked() { return Boolean(this.sdk?.ad.hasAdblock?.()); }

  showRewarded(placement: AdPlacement): Promise<AdResult> {
    return new Promise((resolve) => {
      this.sdk.ad.requestAd('rewarded', {
        adStarted: () => { /* pausar audio ya hecho por AdManager */ },
        adFinished: () => resolve({ status: 'completed', rewardGranted: true, placement }),
        adError: (err: unknown) =>
          resolve({ status: 'error', rewardGranted: false, placement, message: String(err) }),
      });
    });
  }

  showInterstitial(placement: AdPlacement): Promise<AdResult> {
    return new Promise((resolve) => {
      this.sdk.ad.requestAd('midgame', {
        adStarted: () => {},
        adFinished: () => resolve({ status: 'completed', rewardGranted: false, placement }),
        adError: () => resolve({ status: 'unavailable', rewardGranted: false, placement }),
      });
    });
  }
}
```

Notas:
- `environment` del SDK (`local`/`crazygames`/`disabled`) debe decidir si se muestran anuncios; en local, usar `NoopAdapter`.
- El SDK puede requerir `loadingStart/Stop` alrededor de la carga inicial y `gameplayStart/Stop` en cada transición real.
- No incluir AdSense ni otros scripts de anuncios en el build de CrazyGames.

### 3.6 Adaptador Google AdSense H5 (`adBreak`)

> Solo para el target `web` (dominio propio). **No** usar en CrazyGames/Poki. La API H5 de AdSense está sujeta a requisitos de elegibilidad y puede cambiar; validar con la cuenta real y la documentación vigente.

```html
<script async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
  crossorigin="anonymous"></script>
```

```ts
// src/monetization/adapters/AdSenseAdapter.ts
declare global {
  interface Window {
    adsbygoogle?: any[];
    adBreak?: (opts: Record<string, unknown>) => void;
  }
}

export class AdSenseAdapter implements AdAdapter {
  readonly id = 'adsense' as const;
  private adBreak?: (opts: Record<string, unknown>) => void;

  async init() {
    const queue: any[] = (window.adsbygoogle = window.adsbygoogle || []);
    this.adBreak =
      (window as any).adBreak ||
      function (...args: any[]) {
        (queue as any).push(args);
      };
  }

  isSupported() { return true; }

  showRewarded(placement: AdPlacement): Promise<AdResult> {
    return new Promise((resolve) => {
      let rewarded = false;
      this.adBreak?.({
        type: 'reward',
        name: placement,
        beforeAd: () => {},
        beforeReward: (showAdFn: () => void) => showAdFn(),
        adViewed: () => { rewarded = true; },
        adDismissed: () =>
          resolve({ status: 'dismissed', rewardGranted: false, placement }),
        adEmpty: () =>
          resolve({ status: 'unavailable', rewardGranted: false, placement }),
        noAd: () =>
          resolve({ status: 'unavailable', rewardGranted: false, placement }),
        adBreakDone: () =>
          resolve({
            status: rewarded ? 'completed' : 'dismissed',
            rewardGranted: rewarded,
            placement,
          }),
      });
    });
  }

  showInterstitial(placement: AdPlacement): Promise<AdResult> {
    return new Promise((resolve) => {
      this.adBreak?.({
        type: 'next', // transición natural
        name: placement,
        beforeAd: () => {},
        adBreakDone: (info: { breakStatus?: string }) =>
          resolve({
            status: info?.breakStatus === 'viewed' ? 'completed' : 'dismissed',
            rewardGranted: false,
            placement,
          }),
      });
    });
  }
}
```

Requisitos:
- Consentimiento (CMP certificada) para EEA/UK; no personalizar sin consentimiento.
- No colocar anuncios superpuestos al gameplay; el `adBreak` interrumpe y debe pausar/reanudar audio y simulación.
- `ads.txt` obligatorio en la raíz del dominio (ver §4.5).
- Revisar políticas de contenido y de tráfico válido; los portales H5 suelen prohibir esta integración.

### 3.7 Adaptador Poki (opcional)

```html
<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
```

```ts
// src/monetization/adapters/PokiAdapter.ts
export class PokiAdapter implements AdAdapter {
  readonly id = 'poki' as const;
  private sdk = (window as any).PokiSDK;

  async init() {
    await this.sdk.init();
    this.sdk.gameLoadingFinished?.();
  }

  isSupported(type: AdType) { return type === 'rewarded' || type === 'interstitial'; }

  gameplayStart() { this.sdk.gameplayStart(); }
  gameplayStop() { this.sdk.gameplayStop(); }

  showRewarded(placement: AdPlacement): Promise<AdResult> {
    return this.sdk.rewardedBreak().then((success: boolean) => ({
      status: success ? 'completed' : 'dismissed',
      rewardGranted: success,
      placement,
    }));
  }

  showInterstitial(placement: AdPlacement): Promise<AdResult> {
    return this.sdk.commercialBreak().then(() => ({
      status: 'completed',
      rewardGranted: false,
      placement,
    }));
  }
}
```

### 3.8 Selección de adaptador

```ts
export function createAdManager(target: 'web' | 'crazygames' | 'poki' | 'local'): AdManager {
  switch (target) {
    case 'crazygames': return new AdManager(new CrazyGamesAdapter(), CRAZY_POLICY);
    case 'poki':       return new AdManager(new PokiAdapter(), POKI_POLICY);
    case 'web':        return new AdManager(new AdSenseAdapter(), WEB_POLICY);
    default:           return new AdManager(new NoopAdapter(), NOOP_POLICY);
  }
}
```

`NoopAdapter` devuelve `not_supported`/`unavailable` y permite probar toda la UI sin anuncios. En local, los botones de rewarded deben mostrar el flujo completo con una recompensa simulada solo si `VITE_FAKE_ADS=true` (nunca en producción).

### 3.9 Integración en UI

| Pantalla | Cambio | Archivo |
|----------|--------|---------|
| Muerte | Botón "Revivir (ver anuncio)" si `canShow('revive')` | `ResultsModal` o modal de muerte |
| Results | Botón "Duplicar créditos (ver anuncio)" | `ResultsModal` |
| World Select | Candado + "Probar 1 partida (ver anuncio)" | nuevo `WorldSelectModal` |
| Customizer | Candado + "Probar skin 15 min (ver anuncio)" | `CustomizerModal` |
| Transición | `showInterstitial('world_transition')` al confirmar cambio | `WorldSelectModal` |
| Fin de partida | `showInterstitial('post_game')` al cerrar Results | `App` |

Nunca llamar `showRewarded` desde el motor ni desde un `setTimeout` automático; siempre desde un click del jugador.

### 3.10 Errores, adblock y no-fill

- Si `isAdBlocked()` o `unavailable`, mostrar un mensaje neutral y permitir jugar sin recompensa.
- No castigar al jugador ni bloquear el avance por no ver un anuncio.
- Reintento con cooldown de 30 s y máximo 2 intentos por pantalla.
- Timeout de seguridad de 20–30 s: resolver como `dismissed` y reanudar audio/gameplay.
- Nunca conceder recompensa antes de `adFinished`/`adViewed`.
- Loguear (sin PII) `placement`, `status`, `adapter`, `duration` para diagnosticar no-fill.

---

## 4. Despliegue en Netlify (estático, $0)

### 4.1 Configuración `netlify.toml`

```toml
[build]
  command = "npm run build:web"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
  NPM_FLAGS = "--legacy-peer-deps"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

# SPA (si se añade router). Los archivos estáticos tienen prioridad.
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> **Importante:** `NPM_FLAGS=--legacy-peer-deps` es un parche temporal. La solución correcta es alinear `esbuild` con Vite 8 y versionar `package-lock.json` (ver `ROADMAP.md`, Sprint 0).

### 4.2 Scripts recomendados

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx server.ts",
    "build:web": "vite build",
    "build:server": "esbuild server.ts --platform=node --format=esm --outfile=server.js --packages=external",
    "build": "npm run build:web",
    "preview": "vite preview",
    "lint": "tsc --noEmit",
    "test": "vitest run",
    "content:gen": "node scripts/generate-content.mjs"
  }
}
```

- Netlify usa **solo** `build:web`. El servidor Express queda para desarrollo local o un despliegue Node separado (no recomendado por costo/seguridad).
- `build` no debe sobrescribir `server.js` en cada build web.

### 4.3 Variables y targets

| Target | Comando | SDK de anuncios | IA | `ads.txt` | Dominio |
|--------|---------|-----------------|----|-----------|---------|
| `local` | `vite` | Noop | Estática | No | localhost |
| `web` | `vite build` | AdSense (opcional) | Estática | Sí (AdSense) | propio |
| `crazygames` | `VITE_TARGET=crazygames vite build` | CrazyGames v3 | Estática | No / según portal | portal |
| `poki` | `VITE_TARGET=poki vite build` | Poki v2 | Estática | No / según portal | portal |

- **Ninguna** variable `GEMINI_API_KEY` en Netlify.
- Si se usa un dominio propio: `APP_URL`/`VITE_PUBLIC_URL` para canonical y OG (valor público, no secreto).

### 4.4 Dominio propio y HTTPS

1. Comprar/trasladar dominio (o usar subdominio).
2. Netlify → Domain management → Add custom domain.
3. Configurar DNS: `A`/`ALIAS` a Netlify o nameservers de Netlify.
4. Activar HTTPS automático (Let's Encrypt) y forzar `https://`.
5. Elegir dominio canónico (con/sin `www`) y redirigir el otro con 301.
6. Actualizar `og:url`, `canonical`, `sitemap.xml` y enlaces del portal.
7. Verificar HSTS solo cuando todo el dominio esté en HTTPS.
8. Configurar `privacy@`, `support@` y página de privacidad.

### 4.5 SEO, Open Graph y `ads.txt`

`index.html` (esqueleto recomendado):

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>SNAKE AI 2026 — Arcade 3D Futurista</title>
  <meta name="description" content="Juego arcade 3D de serpiente con 4 mundos, rival IA, power-ups y desafíos. Juega gratis en tu navegador." />
  <link rel="canonical" href="https://tudominio.com/" />
  <meta name="theme-color" content="#02040a" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="SNAKE AI 2026" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:title" content="SNAKE AI 2026 — Arcade 3D Futurista" />
  <meta property="og:description" content="4 mundos, rival IA y power-ups en un arcade 3D gratis para navegador." />
  <meta property="og:url" content="https://tudominio.com/" />
  <meta property="og:image" content="https://tudominio.com/og-image-1200x630.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://tudominio.com/og-image-1200x630.png" />

  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": "SNAKE AI 2026",
    "url": "https://tudominio.com/",
    "image": "https://tudominio.com/og-image-1200x630.png",
    "description": "Arcade 3D de serpiente con 4 mundos, rival IA y power-ups.",
    "genre": ["Arcade", "Snake"],
    "applicationCategory": "Game",
    "operatingSystem": "Any",
    "playMode": "SinglePlayer",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
  }
  </script>
</head>
```

`ads.txt` (solo target `web` con AdSense, en la raíz de `public/`):

```text
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

- Sustituir `pub-...` por el ID real; verificar que Netlify lo sirva como `text/plain` en `https://tudominio.com/ads.txt`.
- En builds de CrazyGames/Poki **no** incluir este archivo ni el script de AdSense.
- Si se usan varios socios, cada línea debe corresponder a un socio autorizado; no inventar entradas.

`robots.txt`:

```text
User-agent: *
Allow: /
Sitemap: https://tudominio.com/sitemap.xml
```

`sitemap.xml`: una sola URL si es SPA, con `lastmod`.

`manifest.webmanifest` (mínimo):

```json
{
  "name": "SNAKE AI 2026",
  "short_name": "SNAKE AI",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#02040a",
  "theme_color": "#02040a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 4.6 Rendimiento de entrega

- `dist/assets/*` con caché inmutable de 1 año (hash en el nombre).
- Compresión Brotli automática de Netlify.
- Self-host de fuentes (subconjunto latino) para eliminar la dependencia de Google Fonts; precargar solo la fuente del título y la del HUD.
- Presupuesto: JS inicial < 200 kB gzip (objetivo), LCP < 2.5 s en 4G, CLS < 0.1, INP < 200 ms.
- Cargar modales pesados con `React.lazy` si el bundle sigue > 250 kB gzip.
- No cargar el SDK del portal en el target `web` ni el de AdSense en portales.

### 4.7 Checklist de despliegue Netlify

- [ ] `npm ci` reproducible (lockfile + peer deps alineados).
- [ ] `npm run build:web` genera `dist/` sin incluir `server.js`.
- [ ] `grep` del bundle: sin `GEMINI_API_KEY`, `@google/genai`, `/api/`.
- [ ] `ads.txt` correcto (solo target web).
- [ ] OG image 1200×630 y favicon verificados con el debugger de redes sociales.
- [ ] Canonical y `og:url` con el dominio final.
- [ ] `robots.txt`, `sitemap.xml`, manifest.
- [ ] HTTPS forzado y dominio canónico con 301.
- [ ] Cabeceras de seguridad y CSP compatibles con el target.
- [ ] Lighthouse móvil ≥ 90 en Performance/Best Practices/SEO (ajustar según 3D).
- [ ] Prueba en iOS Safari, Android Chrome, desktop Chrome/Firefox/Edge.
- [ ] Sin errores de consola; audio inicia tras gesto del usuario.
- [ ] Pausa al perder foco (`visibilitychange`/`blur`).

---

## 5. Requisitos para portales (CrazyGames / Poki)

### 5.1 CrazyGames

Checklist técnico:
- [ ] SDK v3 incluido y `init()` antes de interactuar.
- [ ] `game.loadingStart()` / `loadingStop()` alrededor de la carga real.
- [ ] `game.gameplayStart()` / `gameplayStop()` en cada transición de gameplay.
- [ ] Rewarded e interstitial **solo** vía `SDK.ad.requestAd` (sin AdSense ni otras redes).
- [ ] Sin enlaces externos, compras ni redirecciones.
- [ ] Sin `alert()`, `confirm()` ni prompts del navegador.
- [ ] Responsive: landscape y portrait; controles táctiles y teclado.
- [ ] Audio silenciado hasta el primer gesto; pausa al ocultar pestaña.
- [ ] Sin dependencias de cookies de terceros no consentidas.
- [ ] Guardado compatible con el almacenamiento del portal (si se ofrece) o `localStorage` con fallback.
- [ ] Build sin sourcemaps públicos ni claves.
- [ ] Metadatos: título, descripción, tags, edad, orientación, capturas 16:9 y 1:1.
- [ ] Política de privacidad publicada.
- [ ] QA en su sandbox/preview y corrección de warnings.

### 5.2 Poki

Checklist técnico:
- [ ] SDK v2 incluido y `PokiSDK.init()` al inicio.
- [ ] `gameLoadingFinished()` al terminar la carga.
- [ ] `gameplayStart()` / `gameplayStop()` en cada transición.
- [ ] `commercialBreak()` en transiciones naturales; `rewardedBreak()` solo opt-in.
- [ ] Sin otras redes de anuncios ni enlaces externos.
- [ ] Carga rápida y sin pantallas de "click to start" engañosas.
- [ ] Responsive y jugable en móvil; sin scroll de página.
- [ ] Sin errores de consola; sin logs de debug en producción.
- [ ] Metadatos y assets de portada según su guía.
- [ ] Envío a través de Poki for Developers y revisión de QA.

### 5.3 Matriz de cumplimiento

| Requisito | web | crazygames | poki |
|-----------|:---:|:----------:|:----:|
| AdSense/adBreak | ✅ opcional | ❌ | ❌ |
| SDK del portal | ❌ | ✅ | ✅ |
| `ads.txt` de AdSense | ✅ | ❌ | ❌ |
| Enlaces externos | ✅ | ❌ | ❌ |
| Guardado en la nube del portal | ❌ | ⚠️ opcional | ⚠️ opcional |
| Consentimiento de anuncios | ✅ obligatorio EEA/UK | gestionado por portal | gestionado por portal |
| Build separado | ✅ | ✅ | ✅ |

### 5.4 QA antes de enviar

1. Build de producción con el target correcto; verificar que no se carga el SDK equivocado.
2. Prueba de ads: rewarded completado, dismiss, no-fill, adblock, timeout.
3. Prueba de interrupciones: cambiar de pestaña, bloquear pantalla, llamada entrante (móvil).
4. Prueba de guardado: recargar, cerrar navegador, modo incógnito, cuota llena.
5. Prueba de rendimiento en un móvil de gama media (≥ 30 FPS estables, sin caídas al cambiar de mundo).
6. Prueba de textos: sin mojibake, sin claves técnicas visibles, sin "Gemini" si se eliminó la IA.
7. Prueba de accesibilidad: foco visible, contraste, reducción de movimiento, pausa.
8. Revisión de contenido: sin marcas, música ni arte de terceros; lore propio.

---

## 6. Operación y métricas (sin PII)

Eventos recomendados (propios o del portal, con consentimiento):

| Evento | Propiedades | Uso |
|--------|-------------|-----|
| `run_start` | world, mode, seed | Embudo |
| `run_end` | world, mode, score, duration, cause | Balance |
| `core_eaten` | type, combo | Economía |
| `world_unlocked` | world, source | Progresión |
| `ad_request` | placement, type, adapter | Inventario |
| `ad_result` | placement, status, duration | No-fill/errores |
| `reward_granted` | placement, amount | Validación |
| `save_error` | reason | Robustez |

Reglas:
- No enviar identificadores personales; usar un `profileId` aleatorio local.
- Respetar `analyticsConsent`; en portales, usar su analítica si aplica.
- Alertas: tasa de no-fill > 20%, errores de save > 1%, crash rate > 0.5%.

---

## 7. Go-live checklist final

- [ ] IA estática: sin `fetch('/api/')` en el bundle; sin `GEMINI_API_KEY`.
- [ ] `AdManager` con adaptador correcto por target; Noop en local.
- [ ] Rewarded de revivir, prueba de mundo/skin y doble crédito implementados con caps.
- [ ] Interstitial solo en fin de partida/cambio de mundo.
- [ ] `ads.txt` solo en web.
- [ ] Netlify: dominio, HTTPS, canonical, OG, sitemap, robots, manifest.
- [ ] Build reproducible con lockfile y sin conflictos de peer deps.
- [ ] QA de portales y envío.
- [ ] Privacidad, términos, contacto y edad.
- [ ] Monitoreo de errores y presupuesto $0 confirmado.
