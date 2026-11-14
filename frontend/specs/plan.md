# Plan de especificaciones del dashboard financiero

## Alcance

Este ejercicio consiste exclusivamente en elaborar especificaciones. No se modificarán componentes React ni el backend, ni se añadirán llamadas `fetch` o conexiones a endpoints. Las decisiones sobre discrepancias entre producto y API quedan pendientes hasta su verificación y aprobación.

Antes de ejecutar el plan, comprobar el estado de Git y confirmar que la rama activa es `feature/frontend-specs`. Preservar los cambios existentes y no cambiar de rama si esto pudiera afectarlos.

## Funcionalidades solicitadas

1. **Filtro de rango de fechas:** dos fechas opcionales en formato `YYYY-MM-DD` para filtrar todos los datos del dashboard; con ambas vacías se muestran todos los datos. Mostrar también el rango disponible en el dataset. Endpoints relevantes: `GET /api/metrics/facets` y el endpoint de métricas existente con sus filtros.
2. **Tabla de alertas de anomalías:** bajo los gráficos, mostrar período, outcome registrado, media móvil de los tres períodos anteriores e incremento porcentual. El umbral debe ser configurable entre `0.01` y `1.0`, con valor predeterminado `0.3`. Respetar los filtros de fechas y mostrar un estado vacío explícito. Endpoint relevante: `GET /api/metrics/alerts?threshold=<ratio>`.
3. **Comparativa B2B vs B2C:** nueva página con dos secciones paralelas y una tabla de las cinco categorías principales de ingresos por grupo, con nombre, total y porcentaje del grupo. Añadir debajo un gráfico comparativo de ingresos totales. Admitir filtros de fechas y obtener las categorías disponibles desde facetas. Endpoints relevantes: `GET /api/metrics/categories/top?operation_type=income&limit=5` y `GET /api/metrics/facets`.

## Fase 1: exploración de la API

**Objetivo:** establecer los contratos reales y detectar diferencias con los requisitos antes de escribir tipos o especificaciones.

**Archivos y fuentes:** `AGENTS.md`, `.agents/rules/`, `memory-bank/`, `backend/app/routes.py`, `backend/app/main.py`, `frontend/src/App.tsx`, `frontend/src/lib/financial-types.ts`, `frontend/vite.config.ts`, `/docs` y `/openapi.json` del backend activo.

**Actividades:**

1. Confirmar la disponibilidad del backend y consultar la documentación OpenAPI y el esquema generado.
2. Inspeccionar métodos, parámetros, restricciones, respuestas, nulabilidad y ejemplos de métricas, facetas, alertas, categorías principales y, si resulta necesario, resumen.
3. Revisar cómo el frontend consume actualmente la API y contrastar los cálculos relevantes con el código del backend.
4. Registrar por separado lo verificado en vivo, lo observado solo en código, lo incorrecto y lo pendiente. No inventar campos, endpoints ni comportamientos.
5. Si OpenAPI no está disponible o surge una discrepancia que impide especificar fielmente, registrar el bloqueo y consultar antes de continuar.

**Revisión personal:** comprobar los hallazgos y decidir cómo resolver las discrepancias que afecten a los requisitos de producto.

**Entregable:** matriz breve de contratos y cuestiones pendientes, que se incorporará al contrato de datos.

**Criterio de finalización:** contratos contrastados con OpenAPI y código; discrepancias identificadas y decisiones necesarias aprobadas antes de definir el comportamiento dependiente de ellas.

## Fase 2: tipos TypeScript

**Objetivo:** representar fielmente los datos de petición y respuesta sin añadir comportamiento.

**Archivos y fuentes:** OpenAPI verificado en la fase 1, `backend/app/routes.py`, `frontend/src/lib/financial-types.ts` y `frontend/tsconfig.app.json`.

**Actividades:**

1. Crear `frontend/specs/api-types.ts` con `FacetsResponse`, `AlertEntry`, `AlertsResponse`, `CategoryEntry` y `TopCategoriesResponse`.
2. Crear `frontend/specs/param-types.ts` con `DateRangeFilter`, `AlertsParams` y `TopCategoriesParams`.
3. Contrastar cada campo, literal, nulabilidad, forma de respuesta y opcionalidad con OpenAPI. Reutilizar tipos existentes cuando corresponda.
4. Documentar las propiedades mediante JSDoc, incluyendo formato, unidades y restricciones. Emplear tipos estrictos, sin `any` ni `object`, y distinguir límites de producto de los que realmente impone la API.

**Revisión personal:** aprobar los tipos y confirmar que reflejan el contrato verificado, no supuestos de implementación.

**Entregables:** `api-types.ts` y `param-types.ts`.

**Criterio de finalización:** todos los campos están verificados contra OpenAPI y ambos archivos pasan la comprobación focalizada de TypeScript.

## Fase 3: especificación de componentes

**Objetivo:** definir las interfaces y comportamientos necesarios para las tres funcionalidades, sin crear ni modificar componentes React.

**Archivos y fuentes:** tipos aprobados, `frontend/src/App.tsx`, componentes actuales de `frontend/src/components/dashboard/` y contratos verificados en la fase 1.

**Actividades:**

1. Crear `frontend/specs/components.md` y describir las responsabilidades y props tipadas de cada componente necesario.
2. Especificar filtro de fechas, rango disponible, tabla y umbral de alertas, navegación y página comparativa, tablas por grupo y gráfico.
3. Definir origen y transformación de datos, renderizado condicional, accesibilidad y estados de carga, error y vacío.
4. Cubrir fechas vacías o invertidas, rangos sin datos, ausencia de anomalías, menos de cinco categorías y grupos sin ingresos.
5. Resolver y documentar las ambigüedades con aprobación personal, sin alterar unilateralmente los requisitos originales.

**Revisión personal:** aprobar props, navegación, estados, cálculos y resoluciones de las cuestiones pendientes.

**Entregable:** `frontend/specs/components.md`.

**Criterio de finalización:** la especificación permite implementar cada flujo sin suposiciones importantes sobre parámetros, cálculos o estados.

## Fase 4: contrato de datos

**Objetivo:** consolidar los contratos y verificar que las especificaciones sean suficientes para la implementación posterior.

**Archivos y fuentes:** resultados de las fases anteriores, `frontend/tsconfig.json`, `frontend/tsconfig.app.json` y `frontend/package.json`.

**Actividades:**

1. Crear `frontend/specs/README.md` con endpoints, tipos de petición y respuesta, parámetros, restricciones, fórmulas, errores y decisiones aprobadas.
2. Documentar al menos dos casos límite concretos por funcionalidad y comprobar que otro agente pueda implementar el trabajo sin aclaraciones importantes.
3. Desde `frontend/`, ejecutar `npx tsc --noEmit --strict --target ES2023 --module esnext --moduleResolution bundler specs/api-types.ts specs/param-types.ts`. La configuración actual de la aplicación incluye `src`, por lo que ejecutar `npx tsc --noEmit` sin incluir explícitamente las especificaciones no garantiza que estas se comprueben.
4. Revisar `git diff --check`, el diff y `git status --short --branch`; confirmar que los cambios están dentro del alcance autorizado.

**Revisión personal:** aprobar el contrato, los casos límite, el diff y la entrega final.

**Entregables:** `frontend/specs/README.md`, los dos archivos de tipos, `components.md`, este plan y resultados reales de verificación.

**Criterio de finalización:** tipos comprobados, documentación coherente con OpenAPI y decisiones aprobadas, y al menos dos casos límite por funcionalidad.

## Cuestiones pendientes de verificar o resolver

- El código revisado calcula las alertas usando los períodos anteriores disponibles, mientras que el requisito solicita la media móvil de los tres períodos anteriores. Verificar el comportamiento y acordar cómo cumplir el requisito antes de especificar la solución.
- El código revisado acepta un umbral de alertas mayor o igual que cero; producto solicita que el control permita valores entre `0.01` y `1.0`. Verificar las restricciones en OpenAPI y documentar la diferencia.
- El modelo de categorías principales revisado no incluye el porcentaje del grupo. Verificar cómo obtener el total completo de ingresos por grupo y acordar el cálculo y el comportamiento cuando sea cero.
- Verificar cómo utilizar las categorías de facetas en la comparativa y qué filtros admite realmente cada endpoint, sin añadir parámetros supuestos.
- Confirmar el estado de Git, la disponibilidad actual de `/docs` y `/openapi.json`, y el acceso al remoto antes de ejecutar o entregar el trabajo.

## Commits y entrega recomendados

Tras revisar y aprobar los cambios correspondientes, se recomiendan commits separados para el plan, los tipos de contrato y la documentación de componentes y datos. Después de la aprobación final, publicar la rama `feature/frontend-specs` en GitHub y confirmar el resultado. No incluir cambios ajenos ni realizar commits o push sin autorización.