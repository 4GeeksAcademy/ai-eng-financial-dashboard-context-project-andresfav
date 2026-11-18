# Progreso del proyecto

## Apartado 2: Aplicar la skill accessibility

### Skill y origen

Se utilizó [`accessibility`](../.agents/skills/accessibility/SKILL.md), de `addyosmani/web-quality-skills` (origen registrado en `skills-lock.json`). Sus referencias locales incluyeron patrones de accesibilidad y un resumen de WCAG 2.2.

### Hallazgos y correcciones

- [`App.tsx`](../frontend/src/App.tsx): los errores de carga se anuncian con `role="alert"` y `lang="es"`; una región `role="status"` comunica carga y finalización sin duplicar el anuncio del error, y las secciones ocupadas exponen `aria-busy`.
- [`card.tsx`](../frontend/src/components/ui/card.tsx): los títulos de gráficos renderizan encabezados `h2`, bajo el título principal.
- [`income-outcome-chart.tsx`](../frontend/src/components/dashboard/income-outcome-chart.tsx) y [`profit-percent-chart.tsx`](../frontend/src/components/dashboard/profit-percent-chart.tsx): se añadieron tablas de datos nativas, expandibles por teclado, con captions y encabezados de filas/columnas como alternativa a los gráficos.
- [`index.html`](../frontend/index.html): el título genérico se sustituyó por uno descriptivo. [`dashboard-header.tsx`](../frontend/src/components/dashboard/dashboard-header.tsx) y [`kpi-card.tsx`](../frontend/src/components/dashboard/kpi-card.tsx) ocultan los iconos decorativos, y [`skeleton.tsx`](../frontend/src/components/ui/skeleton.tsx) oculta los placeholders visuales.

### Verificaciones y límites

- Lint y build del frontend pasaron; Vitest pasó **8/8**.
- El usuario confirmó manualmente en navegador que ambas tablas se abren y cierran con teclado y que el foco es visible.
- No se realizaron pruebas con lector de pantalla ni auditorías Lighthouse. La revisión de estados HTTP/red y de respuesta vacía no cubrió todos los casos.

**Commit:** `1376878` (`feat(a11y): improve dashboard accessibility using accessibility skill`). Incluyó las correcciones anteriores y la skill con sus referencias.

## Apartado 3: Aplicar la skill vercel-react-best-practices

### Skill y hallazgo

Se utilizó [`vercel-react-best-practices`](../.agents/skills/vercel-react-best-practices/SKILL.md), de `vercel-labs/agent-skills`. La aplicación es React + TypeScript + Vite; se aplicó code splitting compatible con ese stack, no APIs de Next.js.

El build inicial tenía un único entry JavaScript de **587,27 kB** (175,70 kB gzip) y advertía por superar el umbral de chunks de 500 kB. [`App.tsx`](../frontend/src/App.tsx) importaba estáticamente ambos gráficos basados en Recharts.

### Corrección y resultados

- [`App.tsx`](../frontend/src/App.tsx) usa `React.lazy`, imports dinámicos con rutas literales y `Suspense` para separar los módulos de gráficos del entry. Los fallbacks en [`income-outcome-chart.tsx`](../frontend/src/components/dashboard/income-outcome-chart.tsx) y [`profit-percent-chart.tsx`](../frontend/src/components/dashboard/profit-percent-chart.tsx) reservan también la altura del control de datos.
- En el build posterior, el entry quedó en **188,09 kB** (59,92 kB gzip), el chunk de Recharts en **342,30 kB**, y desapareció la advertencia de chunks superiores a 500 kB.
- La suma de los chunks aumentó ligeramente: aproximadamente **589,9 kB** sin gzip y **180,4 kB** gzip frente a 587,27/175,70 kB iniciales. Se demostró una reducción del entry y la desaparición de la advertencia, no una reducción del JavaScript total ni una mejora real de velocidad; no se midieron tiempos de carga ni Core Web Vitals.
- Lint y build pasaron; Vitest pasó **9/9**.

**Commit:** `8928b77` (`perf(frontend): apply vercel-react-best-practices skill`). Incluyó la skill, los tres archivos funcionales anteriores y `skills-lock.json`.

## Apartado 4: Explorar el ecosistema

### Temas y skills explorados

Se buscaron ambos temas con los comandos solicitados:

- `npx skills find testing`
- `npx skills find responsive`

Se leyeron los documentos de las dos candidatas antes de elegir:

| Tema | Skill y origen | Aplicabilidad al dashboard |
| --- | --- | --- |
| Testing | [`vitest`](../.agents/skills/vitest/SKILL.md), `antfu/skills`; generado desde la documentación de `vitest-dev/vitest` | Coincide con Vitest, que ya usa el frontend Vite + TypeScript. La documentación instalada se basa en Vitest 5.1.0-beta.1; se usaron patrones compatibles con la versión instalada, Vitest 4.1.4. |
| Responsive | `responsive-design`, `wshobson/agents` (`plugins/ui-design/skills/responsive-design/SKILL.md`) | Propone diseño móvil primero, breakpoints por contenido, layouts fluidos y pruebas en dispositivos. El dashboard ya usa grids por breakpoints, gráficos responsivos y overflow horizontal en tablas; no se encontró un defecto concreto de responsive que justificara otro cambio. |

La referencia complementaria de responsive (`references/details.md`) describe container queries, escalas fluidas, Grid/Flexbox, breakpoints, navegación e imágenes adaptables. Para Vitest se consultaron las referencias de Test API, Expect, Hooks, Environments y CLI. No se añadió ninguna dependencia npm.

### Selección

Se eligió `antfu/skills@vitest`, instalada para GitHub Copilot en ámbito Project mediante:

`npx skills add antfu/skills --skill vitest --agent github-copilot --yes`

El CLI detectó `github_copilot_vscode_agent`, copió la skill en `.agents/skills/vitest/` y reportó evaluación de bajo riesgo. La skill encaja con la infraestructura existente y permitió cubrir una regresión concreta con una prueba reproducible. Se descartó responsive design porque el diseño ya presenta adaptaciones y no se observó evidencia suficiente de un fallo responsive específico; no se eligió por número de instalaciones.

### Cambio aplicado

- [`financial-utils.test.ts`](../frontend/src/lib/financial-utils.test.ts): se añadió una prueba para una fecha ISO del primer día de mes, ejecutada con `TZ=America/Los_Angeles`.
- [`financial-utils.ts`](../frontend/src/lib/financial-utils.ts): el test reprodujo que `new Date("2024-02-01")` seguido de getters locales podía agrupar ese movimiento en enero. `toYearMonthKey` ahora toma el prefijo calendario `YYYY-MM` del ISO, preservando la semántica de la fecha.
- [`skills-lock.json`](../skills-lock.json): registra la fuente y el commit de la skill Vitest.
- [`SKILL.md`](../.agents/skills/vitest/SKILL.md) y referencias: se añadió la skill al repositorio para Copilot en ámbito Project.

No se modificaron contratos de API ni las mejoras de accesibilidad y code splitting anteriores.

### Verificación

- La nueva prueba falló antes de corregir el helper: esperaba `Feb 2024` y obtuvo `Jan 2024` con zona negativa.
- `TZ=America/Los_Angeles npm test -- src/lib/financial-utils.test.ts`: 9/9 pasaron tras la corrección.
- `npm run lint`: pasó.
- `npm run build`: pasó, sin advertencias de chunks.
- `TZ=America/Los_Angeles npm test`: 9/9 pasaron.
- Frontend (`http://127.0.0.1:5173/`) y API (`http://127.0.0.1:8000/api/metrics`): HTTP 200.

### Límites pendientes

- La skill Vitest instalada está generada para Vitest 5.1 beta, mientras el proyecto usa 4.1.4. No se aplicaron funciones marcadas como exclusivas de Vitest 5.
- La prueba de zona horaria depende de ejecutar Vitest con `TZ=America/Los_Angeles`; la configuración CI no fue revisada ni modificada.
- No se hizo una auditoría visual en distintos dispositivos ni se afirmaron mediciones de Core Web Vitals. No se encontró una corrección responsive justificada para este apartado.
- El cambio demuestra que la agregación conserva el mes calendario bajo el offset probado; no mide mejoras de rendimiento.

**Commit:** `980e642` (`fix(financial): correct month grouping using vitest skill`). Incluyó la skill comunitaria Vitest, su registro en `skills-lock.json`, la prueba de regresión y el fix de agrupación mensual.

## Apartado 5: Escribir una skill interna del proyecto

### Necesidad identificada

Se creó [`financial-dashboard-qa`](../.skills/financial-dashboard-qa/SKILL.md) en `.skills/`, la ubicación requerida por el ejercicio. La necesidad es específica del proyecto: revisar la coherencia entre fechas y movimientos de FastAPI, los cálculos TypeScript y los estados de KPI/gráficos. Las skills comunitarias de accesibilidad y rendimiento no describen este contrato financiero local; la skill Vitest ofrece patrones de pruebas, pero no el mapa de datos, los estados ni las fórmulas del dashboard.

La skill define como objetivo prevenir resultados financieros engañosos o inconsistentes; sus inputs son rutas reales de API, tipos, utilidades, componentes, tests, scripts, reglas y memoria relevantes. Sus outputs son un informe trazable del flujo, hallazgos, verificaciones y correcciones o decisiones pendientes. Acepta una auditoría cuando estados/casos se contrastan por separado, la cobertura se describe según assertions reales y cualquier conflación se reporta sin exigir un fix no autorizado.

La evidencia de origen es:

- [`routes.py`](../backend/app/routes.py) define `FinancialMovement` con `create_date: date` y `amount: float`; `/api/metrics` devuelve una lista filtrable, generada con semilla y 360 movimientos por defecto.
- [`financial-types.ts`](../frontend/src/lib/financial-types.ts) representa `create_date` como `string` ISO.
- [`App.tsx`](../frontend/src/App.tsx) solicita `/api/metrics` sin filtros y distingue `movements === null` durante la carga/error de una lista ya recibida. En JavaScript `[]` es truthy.
- [`financial-utils.ts`](../frontend/src/lib/financial-utils.ts) suma ingresos y gastos; beneficio es ingreso menos gasto; el porcentaje se define como cero si el total de ingresos no es positivo. `computeKPIs([])` produce totales y beneficio cero; `computeMonthlyData([])` produce una lista vacía.
- [`kpi-row.tsx`](../frontend/src/components/dashboard/kpi-row.tsx) presenta cualquier objeto `metrics` truthy como valores formateados. Las dos tarjetas de gráficos muestran fallback vacío; [`profit-percent-chart.tsx`](../frontend/src/components/dashboard/profit-percent-chart.tsx) decide que hay datos solo si algún `profitPercent !== 0`.

### Tarea usada para probar la skill

Se leyó explícitamente el `SKILL.md` completo desde su ruta `.skills/` y se siguió su procedimiento para auditar estados y cálculos, sin corregir lógica:

1. **Respuesta vacía:** el endpoint local por defecto respondió una lista con 360 movimientos; una consulta con `start_date=2099-01-01` respondió `[]`. La UI actual no envía ese filtro, por lo que la lista vacía es un caso válido del tipo/endpoint filtrable, pero no el comportamiento normal actual de la llamada sin parámetros.
2. **Propagación de la lista vacía:** `movements=[]` es truthy, así que `App.tsx` llama `computeKPIs([])`. La función produce cero; las tarjetas lo presentan como `$0` y `0.0%`. El período resulta `No data`, el estado anuncia ausencia de datos y los gráficos reciben `[]` y muestran “No data available”. Es una presentación inconsistente entre período, KPI y gráficos.
3. **Movimientos con beneficio y margen cero:** para movimientos existentes con ingreso 100 y gasto 100, las fórmulas actuales producen beneficio 0 y margen 0; el punto mensual conserva ingreso/gasto y `profitPercent: 0`. La tarjeta KPI puede presentar `$0` y `0.0%`, pero la condición `data.some((d) => d.profitPercent !== 0)` hace que el gráfico de margen muestre “No data available”. Esta condición confunde un margen cero válido con ausencia de puntos.
4. **Cero denominador:** sin ingresos, el helper retorna `profitPercent: 0`; esa es la fórmula implementada, no una definición de margen aprobada por producto. La skill exige mantener esa ambigüedad explícita, no cambiarla por cuenta propia.
5. **Carga/error:** `null` representa datos aún no recibidos; el fallo HTTP/de red establece `error` y `finally` termina `loading`. El error se muestra aparte, mientras una lista vacía sigue la ruta de éxito. No se modificaron estos estados.

### Verificaciones y cobertura observada

- `docker compose exec -T frontend npm test -- src/lib/financial-utils.test.ts`: 9/9 pasaron. Cubren totales de un caso normal, porcentaje cuando no hay ingresos, agrupación mensual/orden y formato de fechas; no contienen casos de `computeKPIs([])`, beneficio exactamente cero con ingresos y gastos existentes, ni pruebas de render de KPI/gráficos.
- `docker compose exec -T backend pytest tests/test_routes.py`: 15/15 pasaron. Incluye la generación del año de 360 movimientos y filtros, pero no prueba explícitamente que una fecha futura devuelva lista vacía ni compara importes entre API y UI. Pytest emitió una advertencia deprecada de `starlette.testclient` con httpx.
- Consultas HTTP al backend activo: `/api/metrics` devolvió 360 elementos; `/api/metrics?start_date=2099-01-01` devolvió `[]`.
- No se ejecutó lint ni build: la tarea fue una auditoría de código, skill y pruebas existentes; no se modificó código de aplicación. Tampoco se verificó visualmente el render de los casos vacíos/cero en navegador. No se afirma cobertura de componentes ni de navegador.

### Refinamiento de la skill

La primera versión podía interpretarse como que la condición de aceptación requería que la implementación ya diferenciara correctamente cero y ausencia, incluso durante una auditoría sin autorización de corrección. Se ajustó `Acceptance Criteria`: ahora exige probar los casos por separado y reportar la conflación como hallazgo, sin exigir ni aplicar el fix en una tarea audit-only. Se volvió a leer el archivo completo y sus inputs, pasos, outputs, criterios y limitaciones resultaron suficientes para ejecutar la tarea sin instrucciones adicionales.

### Pendientes y límites

- No se corrigió la presentación inconsistente de lista vacía ni la condición del gráfico de margen, conforme al alcance de auditoría. Una corrección requiere decidir cómo expresar la ausencia de ingreso y distinguir datos vacíos de margen válido cero.
- No se infirieron reglas sobre si margen sin ingresos debe mostrarse como cero, N/A u otro estado; requiere una decisión de producto.
- La generación por defecto del backend siempre produce el conjunto simulado sembrado de 360 movimientos. Las pruebas de extremo a extremo API/KPI/gráficos no existen actualmente.
- No se instalaron dependencias nuevas ni se modificaron contratos o commits anteriores.

**Commit:** `9a1ff79` (`docs(skills): add internal financial-dashboard-qa skill`). Incluyó la skill interna y este registro del apartado 5.
