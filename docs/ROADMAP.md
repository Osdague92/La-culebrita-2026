# ROADMAP — Ejecución por Sprints

> **Baseline auditado:** commit `1a9a7e2` (2026-11-11)  
> **Objetivo:** llevar SNAKE AI 2026 de demo técnica a juego publicable en Netlify y portales H5 (CrazyGames/Poki), con 4 mundos, progresión persistente, monetización desacoplada y costo de IA $0.  
> **Estado de esta fase:** solo auditoría y documentación. **Ninguna tarea de código de este roadmap se ha ejecutado todavía.**

---

## 1. Priorización

| Prioridad | Significado | Regla |
|-----------|-------------|-------|
| **P0** | Bloquea build, despliegue o seguridad/costos | Debe completarse antes de publicar cualquier build. |
| **P1** | Necesario para la experiencia y los portales | Debe completarse antes del envío a CrazyGames/Poki. |
| **P2** | Mejora de retención, rendimiento o alcance | Post-lanzamiento. |

**Orden estratégico:**

```text
Sprint 0  Build reproducible + CI          ← sin esto, nada se despliega
   │
Sprint 1  IA estática ($0, sin backend)    ← elimina el mayor riesgo financiero
   │
Sprint 2  Persistencia y progresión        ← base para mundos y desbloqueos
   │
Sprint 3  Refactor de mundos (paridad)     ← desacopla el escenario actual
   │
Sprint 4  4 mundos + desbloqueos           ← contenido
   │
Sprint 5  AdManager + rewarded/interstitial← monetización
   │
Sprint 6  Netlify + portales + rendimiento ← publicación
   │
Sprint 7  QA, envío y lanzamiento
```

**Duración estimada (1 desarrollador senior, tiempo completo):** 5–7 semanas.  
**Si es a tiempo parcial:** 8–12 semanas. Las estimaciones son relativas y deben revalidarse tras el Sprint 0.

---

## 2. Resumen de sprints

| Sprint | Nombre | Prioridad | Estimación | Depende de | Entregable clave |
|--------|--------|:---------:|-----------:|------------|------------------|
| 0 | Fundaciones de build y CI | P0 | 1–2 d | — | `npm ci` + build reproducible |
| 1 | Desacople de IA estática | P0 | 2–3 d | 0 | Juego 100% offline, sin `/api` |
| 2 | Save V1 y progresión | P1 | 3–4 d | 1 | Progreso persistente y migrado |
| 3 | Arquitectura de mundos | P1 | 5–7 d | 2 | `WorldConfig` + paridad Neon Core |
| 4 | Mundos 2–4 y desbloqueos | P1 | 5–8 d | 3 | 4 biomas jugables |
| 5 | Monetización (`AdManager`) | P1 | 3–5 d | 4 | Rewarded + interstitial con caps |
| 6 | Netlify, portales y rendimiento | P0/P1 | 3–5 d | 5 | Builds por target + SEO + QA base |
| 7 | QA, envío y lanzamiento | P1 | 2–4 d | 6 | Publicación y monitoreo |

---

## 3. Sprint 0 — Fundaciones de build y CI

**Meta:** que cualquier persona (y Netlify) pueda instalar y construir desde cero, sin intervención manual.

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S0-01 | Alinear `esbuild` con Vite 8 (`^0.27`/`^0.28`) o fijar Vite compatible | P0 | 0.25 d | — | `npm install` limpio sin `ERESOLVE` |
| S0-02 | Generar y versionar `package-lock.json`; añadir `packageManager` | P0 | 0.25 d | S0-01 | `npm ci` reproducible en CI |
| S0-03 | Separar scripts: `build:web` (`vite build`) y `build:server` | P0 | 0.25 d | — | `build` web no sobrescribe `server.js` |
| S0-04 | Añadir CI (GitHub Actions): `npm ci`, `lint`, `build:web` | P0 | 0.5 d | S0-02 | Workflow verde en PR |
| S0-05 | Añadir `.nvmrc`/`engines` con Node 22 | P1 | 0.1 d | — | Netlify y local usan la misma versión |
| S0-06 | Sacar `motion` no usado; mover `@types/*`, `eslint`/`vitest` a dev | P2 | 0.25 d | — | `npm ls` sin dependencias muertas |
| S0-07 | Mover Express/GenAI a `server/` opcional o devDependencies | P1 | 0.5 d | — | Cliente no depende de paquetes de servidor |
| S0-08 | `netlify.toml` base (`build:web`, `publish=dist`) | P1 | 0.25 d | S0-03 | Deploy preview funciona |
| S0-09 | Script de verificación de secretos en bundle | P0 | 0.25 d | S0-03 | Falla CI si aparece `GEMINI_API_KEY`/`AIza` |
| S0-10 | Documentar comandos en `README.md` | P2 | 0.25 d | — | Onboarding en < 10 min |

**Definition of Done:** un clon limpio ejecuta `npm ci && npm run lint && npm run build:web` sin errores; Netlify Deploy Preview carga el juego; no hay claves en `dist/`.

---

## 4. Sprint 1 — Desacople de IA estática

**Meta:** eliminar las llamadas de IA en runtime y el backend del despliegue web, manteniendo la experiencia percibida.

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S1-01 | Crear `src/content/`: missions, commentary, coachRules, assistantKb, skins | P0 | 1 d | S0 | Contenido tipado y versionado |
| S1-02 | Implementar `staticContentService` con API espejo de `geminiService` | P0 | 0.5 d | S1-01 | Sin `fetch`, sin `async` innecesario |
| S1-03 | Sustituir llamadas en `App`, `CustomizerModal`, `MissionsModal`, `AssistantModal` | P0 | 0.5 d | S1-02 | Misma UI, sin red |
| S1-04 | Generador determinista de misiones con seed por run/día | P1 | 0.5 d | S1-01 | Misma seed → misma misión; variedad suficiente |
| S1-05 | Generador de skins por hash de prompt (palabras clave → paleta) | P1 | 0.5 d | S1-01 | Prompt repetido → misma skin; 20+ combinaciones |
| S1-06 | Coach heurístico con grade, strengths, weaknesses, drill por mundo | P1 | 0.5 d | S1-01 | Salida coherente para 10 perfiles de partida |
| S1-07 | Eliminar `geminiService` del cliente o aislarlo detrás de flag dev | P1 | 0.25 d | S1-03 | `grep /api/ src/` solo en server/dev |
| S1-08 | Retirar `server.js` de producción; documentar servidor opcional | P0 | 0.25 d | S1-07 | Build web no incluye Express |
| S1-09 | Actualizar textos: "Gemini conectado" → "Contenido local"/"AURA" | P1 | 0.25 d | S1-03 | Sin promesas de IA en vivo |
| S1-10 | Test offline: bloquear red y jugar todas las pantallas | P0 | 0.25 d | S1-03 | Cero errores de consola, cero requests fallidos visibles |
| S1-11 | (Opcional) Script `content:gen` para pregenerar packs con LLM en local/CI | P2 | 1 d | S1-01 | Genera JSON validado, cacheado por hash, commiteable |

**Definition of Done:** el bundle no contiene `GEMINI_API_KEY`, `@google/genai` ni `fetch('/api/`; el juego funciona sin red; no hay cold starts ni costo por usuario; tests de determinismo pasan.

---

## 5. Sprint 2 — Persistencia y progresión (Save V1)

**Meta:** un único save versionado, migrado desde las claves actuales, con récords por mundo, créditos, skins y settings persistentes.

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S2-01 | Definir `SaveDataV1` y validadores | P1 | 0.5 d | S1 | Tipos y parseo estricto |
| S2-02 | Implementar `ProgressStore` + `StorageAdapter` | P1 | 1 d | S2-01 | API load/save/flush; debounce 400 ms |
| S2-03 | Migrar claves legacy (`stats`, `settings`, `custom_skins`) | P1 | 0.5 d | S2-02 | Datos antiguos migran sin pérdida |
| S2-04 | Persistir settings (hoy solo se leen) y skin equipada | P1 | 0.25 d | S2-02 | Recargar conserva ajustes/skin |
| S2-05 | Récord por mundo y `globalHighScore` | P1 | 0.5 d | S2-01 | Cada mundo tiene su mejor score/tiempo/combo |
| S2-06 | Persistir misiones activas y completadas | P2 | 0.5 d | S2-01 | No se pierden al recargar |
| S2-07 | Flags de consentimiento (`ads`, `analytics`) y tutorial | P1 | 0.25 d | S2-01 | Se respetan antes de pedir anuncios |
| S2-08 | Export/import JSON + reset seguro | P2 | 0.5 d | S2-02 | Import inválido no rompe el save |
| S2-09 | Corregir stale closure de callbacks del motor | P1 | 0.25 d | — | `isNewRecord` y `mode` correctos en partidas 2+ |
| S2-10 | Revisar seed `highScore: 1200` | P2 | 0.1 d | — | Nuevo perfil empieza en 0 o se documenta |
| S2-11 | Tests de migración, validación y cuota llena | P1 | 0.5 d | S2-02 | 100% de casos cubiertos |

**Definition of Done:** recargar/cerrar el navegador conserva stats, settings, skins, misiones y récords por mundo; un save corrupto se respalda y se reinicia sin crash; migración legacy probada.

---

## 6. Sprint 3 — Arquitectura de mundos (paridad)

**Meta:** extraer el mundo actual a configuración y sistemas sin cambiar el gameplay ni la estética.

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S3-01 | Crear `WorldConfig`/`WorldTheme` y validación | P1 | 0.5 d | S2 | Tipos compilan; config inválida falla en dev |
| S3-02 | Extraer tema de `ArenaEnvironment` a `neon-core/config.ts` | P1 | 1 d | S3-01 | Captura visual idéntica |
| S3-03 | Aplicar tema desde `WorldManager.apply` (fog, luces, paleta) | P1 | 0.5 d | S3-02 | Cambiar config cambia la escena sin tocar clases |
| S3-04 | Extraer `MovementSystem` y `CollisionSystem` | P1 | 1 d | S3-01 | Golden run con misma puntuación/colisiones |
| S3-05 | Extraer `SpawnSystem`, `ScoringSystem`, `PowerUpSystem` | P1 | 1 d | S3-04 | Sin `if (mode)` disperso en `GameEngine` |
| S3-06 | Introducir `RunConfig` = `WorldConfig × ModeConfig` | P1 | 0.5 d | S3-04 | Motor solo consume `RunConfig` |
| S3-07 | Crear `modes/` y mover hazards de modo | P1 | 0.5 d | S3-06 | `survival`/`cyber_arena`/`ai_rival` equivalentes |
| S3-08 | Selector de mundo en UI (solo Neon Core) | P1 | 0.5 d | S3-03 | Cambio de mundo no recarga; dispose correcto |
| S3-09 | Corregir bugs detectados durante la extracción | P1 | 1 d | S3-04 | Escudo, ráfaga survival, time_dilator, overclock, rival en menú |
| S3-10 | Tests de reglas y “golden runs” | P1 | 1 d | S3-04 | CI bloquea regresiones |
| S3-11 | Medir FPS/draw calls antes/después | P2 | 0.25 d | S3-05 | Sin regresión > 10% |

**Definition of Done:** `neon_core` es indistinguible del juego actual; no hay `if (worldId === ...)` en systems; cambiar de mundo funciona; tests de colisiones/puntuación pasan.

---

## 7. Sprint 4 — Mundos 2–4 y desbloqueos

**Meta:** cuatro biomas jugables con identidad propia, reglas de desbloqueo y progresión.

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S4-01 | Implementar `bio_hazard` (tema, hazards, esporas) | P1 | 1.5 d | S3 | Jugable y distinto; sin errores |
| S4-02 | Implementar `cryo_void` (wrap, inercia de hielo, portales) | P1 | 1.5 d | S3 | Wrap correcto; input con retardo; visible |
| S4-03 | Implementar `solar_forge` (calor, rampa agresiva, láseres) | P1 | 1.5 d | S3 | Dificultad progresiva; no injugable |
| S4-04 | Reglas de desbloqueo y cálculo de estrellas | P1 | 0.75 d | S2, S4-01..03 | Desbloqueos persistentes y testeables |
| S4-05 | `WorldSelectModal` con candados, récords y estrellas | P1 | 1 d | S4-04 | UI clara; estados bloqueado/desbloqueado |
| S4-06 | Misiones y lore por mundo (contenido estático) | P2 | 0.5 d | S1, S4 | 4 pools, sin red |
| S4-07 | Audio/tema de UI por mundo (acentos, BGM) | P2 | 0.5 d | S4 | Cambia sin recargar |
| S4-08 | Pruebas de cada mundo en móvil/desktop | P1 | 1 d | S4-01..03 | 30 FPS estables en gama media |
| S4-09 | Balance inicial (velocidad, pesos de cores, caps) | P2 | 1 d | S4-08 | Partidas de 1–5 min; no triviales |

**Definition of Done:** los 4 mundos se seleccionan, desbloquean y guardan; cada uno tiene tema, reglas y hazards propios; no hay duplicación de lógica; el save conserva estrellas y récords.

---

## 8. Sprint 5 — Monetización (`AdManager`)

**Meta:** capa agnóstica de anuncios con rewarded opt-in e interstitial en transiciones, sin SDKs dentro del gameplay.

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S5-01 | Definir `AdAdapter`, `AdManager`, `AdPolicy` | P1 | 0.5 d | S4 | Contratos compilan |
| S5-02 | Implementar `NoopAdapter` y entornos local/dev | P1 | 0.25 d | S5-01 | Juego sin anuncios funciona |
| S5-03 | Implementar `CrazyGamesAdapter` (v3) | P1 | 0.75 d | S5-01 | Rewarded/interstitial con callbacks |
| S5-04 | Implementar `AdSenseAdapter` (`adBreak`) para web | P1 | 0.75 d | S5-01 | Rewarded/interstitial; consentimiento |
| S5-05 | Implementar `PokiAdapter` (v2) | P2 | 0.5 d | S5-01 | `commercialBreak`/`rewardedBreak` |
| S5-06 | Rewarded “Revivir” con revive seguro + idempotencia | P1 | 1 d | S5-01, S3 | 1/run; recompensa solo si completa |
| S5-07 | Rewarded “Probar mundo/skin” | P1 | 0.75 d | S5-06, S4 | Trial temporal, no desbloqueo permanente |
| S5-08 | Rewarded “Duplicar créditos” | P2 | 0.5 d | S5-06 | 1/run; créditos correctos |
| S5-09 | Interstitial post-game y cambio de mundo con caps | P1 | 0.5 d | S5-01 | Cada 2 runs/180 s; nunca en gameplay |
| S5-10 | Persistir caps/cooldowns y respetar consentimiento | P1 | 0.5 d | S2, S5-09 | Recargar no resetea caps |
| S5-11 | Pausar audio/simulación durante anuncios | P1 | 0.25 d | S5-06 | Sin solapamientos ni inputs perdidos |
| S5-12 | Matriz de pruebas: completed/dismiss/no-fill/adblock/timeout | P1 | 0.5 d | S5-03..06 | Todos los estados manejados |
| S5-13 | Instrumentación de eventos de anuncios (sin PII) | P2 | 0.25 d | S5-12 | Tasa de no-fill y errores visibles |

**Definition of Done:** ningún anuncio interrumpe el gameplay; rewarded solo recompensa si se completa; caps persistentes; AdSense no se carga en portales; fallback silencioso si no hay anuncio.

---

## 9. Sprint 6 — Netlify, portales y rendimiento

**Meta:** builds por target, cumplimiento de portales, SEO/OG y rendimiento móvil.

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S6-01 | Build targets `web`/`crazygames`/`poki`/`local` | P0 | 0.75 d | S5 | Cada target carga su SDK y solo el suyo |
| S6-02 | SDK lifecycle: loadingStart/Stop, gameplayStart/Stop | P1 | 0.5 d | S6-01 | Sin warnings del portal |
| S6-03 | Pantalla de carga y primer gesto de audio | P1 | 0.5 d | S6-01 | Sin audio bloqueado; carga clara |
| S6-04 | Pausa en `visibilitychange`/`blur`; reanudar audio | P1 | 0.25 d | — | No hay BGM en segundo plano |
| S6-05 | `netlify.toml` final, dominio, HTTPS, headers/CSP por target | P1 | 0.5 d | S0 | Deploy preview + producción OK |
| S6-06 | SEO/OG completo, favicon, manifest, robots, sitemap | P1 | 0.5 d | S6-05 | Validadores de OG sin errores |
| S6-07 | `ads.txt` solo en target web | P1 | 0.1 d | S6-05 | `text/plain` en raíz |
| S6-08 | Self-host de fuentes + subconjunto latino | P2 | 0.5 d | — | Sin requests a Google Fonts |
| S6-09 | Code splitting (modales/Three) si el bundle > 250 kB gzip | P2 | 0.75 d | S3 | JS inicial < 250 kB gzip |
| S6-10 | Quality tiers: DPR, sombras, luces por dispositivo | P1 | 0.75 d | S3 | ≥ 30 FPS en gama media |
| S6-11 | Interpolar movimiento entre celdas (opcional) | P2 | 0.5 d | S3 | Movimiento fluido a 60/120 Hz |
| S6-12 | Accesibilidad: foco, contraste, reduced motion, pausa | P2 | 0.5 d | — | Navegable con teclado |
| S6-13 | Página de privacidad y términos | P0 | 0.25 d | — | URL pública para portales |

**Definition of Done:** build de cada target sin errores; portales no reportan warnings; Netlify producción con dominio y HTTPS; Lighthouse móvil aceptable; sin secretos ni `/api` en ningún bundle.

---

## 10. Sprint 7 — QA, envío y lanzamiento

| ID | Tarea | Prio | Est. | Depende | Criterio de aceptación |
|----|-------|:----:|-----:|---------|------------------------|
| S7-01 | Matriz QA: iOS Safari, Android Chrome, desktop, tablet | P1 | 1 d | S6 | Sin crashes; controles y audio OK |
| S7-02 | QA de guardado (recarga, incógnito, cuota, import/export) | P1 | 0.5 d | S2 | Sin pérdida de datos |
| S7-03 | QA de anuncios en sandbox del portal | P1 | 0.5 d | S6 | Rewarded/interstitial conformes |
| S7-04 | Assets de tienda: capturas 16:9/1:1, iconos, descripciones | P1 | 0.5 d | — | Cumplen guías del portal |
| S7-05 | Envío a CrazyGames y Poki; corregir feedback | P1 | 0.5 d | S7-01..04 | Build aceptado / en revisión |
| S7-06 | Deploy de producción + smoke test | P0 | 0.25 d | S6 | URL pública funcional |
| S7-07 | Monitoreo de errores y no-fill; alertas | P2 | 0.5 d | S7-06 | Dashboard básico |
| S7-08 | Plan de rollback (build anterior + save compatible) | P1 | 0.25 d | S7-06 | Revertir en < 5 min |
| S7-09 | Post-lanzamiento: primer parche de balance | P2 | 0.5 d | S7-06 | Basado en datos reales |

**Definition of Done:** build publicado en Netlify y al menos un portal; monitoreo activo; rollback probado; documentación actualizada.

---

## 11. Backlog post-lanzamiento (P2)

| Área | Mejoras |
|------|---------|
| Contenido | Mundo 5, eventos estacionales, misiones diarias/semanales, desafíos con seed compartida |
| Social | Leaderboard (portal o backend ligero), retos de amigos, replays |
| Plataforma | PWA offline, guardado en la nube del portal, i18n (ES/EN/PT), gamepad |
| Rendimiento | Instancing de segmentos/cores, shader de partículas, worker para A*, presupuesto adaptativo |
| Monetización | A/B de caps, bundles cosméticos, pases de temporada (solo si el portal lo permite) |
| Calidad | Tests E2E, Storybook de UI, presupuesto de rendimiento en CI, telemetría anónima |
| Accesibilidad | Remapeo de controles, alto contraste, reducción de movimiento, subtítulos/visualización de SFX |
| IA | Packs generados en CI con LLM + revisión humana; nunca runtime sin control de cuota |

---

## 12. Definition of Done (global)

Una tarea se considera terminada cuando:

- [ ] El código compila (`tsc --noEmit`) y el build del target pasa.
- [ ] Tiene prueba manual documentada o test automatizado (reglas, save, ads).
- [ ] No introduce claves, endpoints de IA ni dependencias de red en el cliente.
- [ ] No rompe la paridad de `neon_core` ni el save existente.
- [ ] Funciona en móvil (táctil) y desktop (teclado) sin errores de consola.
- [ ] Está documentado en `docs/` si cambia arquitectura o configuración.

**Un sprint se considera terminado cuando:** el build de su target se despliega en un preview, pasa el checklist y no hay regresiones de la matriz QA mínima.

---

## 13. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación | Sprint |
|--------|:-----:|:-------:|------------|--------|
| Conflicto de dependencias bloquea CI | Alta | Alto | S0-01/S0-02; lockfile y CI desde el día 1 | 0 |
| Costo/abuso de Gemini | Media | Alto | IA estática; no backend en prod | 1 |
| Pérdida de datos por migración | Media | Alto | Validación, backup, export/import, tests | 2 |
| Refactor rompe colisiones/scoring | Media | Alto | Golden runs + tests antes de añadir mundos | 3 |
| Mundos “reskin” sin identidad | Alta | Medio | Mecánica firma por mundo + presupuesto de arte procedural | 4 |
| Rechazo del portal por SDK/ads | Media | Alto | Builds por target + QA en sandbox | 5–6 |
| Bajo FPS en móvil gama media | Alta | Medio | Quality tiers, menos luces, DPR adaptativo | 6 |
| Bundle demasiado grande | Media | Medio | Code splitting, self-host fonts, presupuesto | 6 |
| Anuncios degradan retención | Media | Medio | Caps, opt-in, nunca en gameplay | 5 |
| Falta de tiempo antes de una fecha | Media | Alto | Priorizar S0–S2 y publicar build estático sin mundos nuevos | — |

---

## 14. Métricas de éxito

| Métrica | Objetivo inicial |
|---------|------------------|
| Costo de IA en producción | **$0** |
| Cold starts | **0** |
| JS inicial (gzip) | < 250 kB; ideal < 200 kB |
| Time to play (4G) | < 3 s |
| FPS en gama media | ≥ 30 estables |
| Crash rate | < 0.5% de sesiones |
| Save error rate | < 1% |
| Rewarded completion | > 60% de los solicitados |
| No-fill | < 20% |
| Retención D1 (portal) | Medir baseline; mejorar con misiones diarias |
| Tiempo medio de sesión | ≥ 5 min |

---

## 15. Próximas 10 acciones concretas

1. Corregir el peer dependency de `esbuild`/Vite y crear `package-lock.json` (S0-01, S0-02).
2. Añadir CI con `npm ci`, `lint` y `build:web` (S0-04).
3. Verificar el build en un Netlify Deploy Preview (S0-08).
4. Crear `src/content/` y el servicio estático con API espejo (S1-01, S1-02).
5. Sustituir las 4 llamadas a `gemini.*` y probar sin red (S1-03, S1-10).
6. Diseñar y validar `SaveDataV1` + `ProgressStore` (S2-01, S2-02).
7. Migrar claves legacy y persistir settings/skin (S2-03, S2-04).
8. Extraer `WorldTheme` y verificar paridad visual de Neon Core (S3-01, S3-02).
9. Extraer `CollisionSystem`/`MovementSystem` y crear golden runs (S3-04, S3-10).
10. Implementar `AdManager` + `NoopAdapter` y el flujo de Revivir con `Noop` (S5-01, S5-02, S5-06).

> **Recordatorio:** este roadmap no se ha implementado. El primer cambio de código debe ser el Sprint 0; el resto depende de una base reproducible.
