# Contrato de datos del dashboard financiero

Referencia para implementar las tres funcionalidades SDD. Separa el contrato confirmado por OpenAPI, las reglas solicitadas por el PM y las propuestas de interfaz de [components.md](components.md). No representa una aprobación de las incompatibilidades indicadas al final.

**Estado:** es una especificación, no una funcionalidad implementada. Los requisitos del PM figuran en [plan.md](plan.md); las propuestas de UI y recomendaciones de este documento requieren aprobación. Los bloqueos de la última sección impiden cerrar los comportamientos afectados. La pantalla actual solo consulta `/api/metrics`; las demás rutas existen, pero no están conectadas a la UI. La evidencia y sus límites están en [verification.md](../../verification.md).

## Convenciones y errores

- `DateRangeFilter`, `AlertsParams` y `TopCategoriesParams` están definidos en [param-types.ts](param-types.ts). `FacetsResponse`, `AlertEntry`, `AlertsResponse`, `CategoryEntry` y `TopCategoriesResponse` están definidos en [api-types.ts](api-types.ts). Los tipos de dominio `OperationType`, `Category`, `BusinessType` y `FinancialMovement` están en [`src/lib/financial-types.ts`](../src/lib/financial-types.ts).
- OpenAPI describe `start_date` y `end_date` como query parameters opcionales de formato `date`. Se omiten si no tienen valor. El texto literal `null` no equivale a omitirlos y respondió HTTP 422 en las pruebas previas.
- Las rutas con query parameters documentan `422 Validation Error`; `HTTPValidationError.detail`, si está presente, es una lista de `ValidationError` con `loc`, `msg` y `type` obligatorios. Facetas solo documenta una respuesta `200` en OpenAPI. Los errores de red y otras respuestas de servidor no son esquemas de éxito ni estados vacíos; la UI debe presentarlos como errores, no como listas vacías.
- Las descripciones de rangos inclusivos, formatos de período y cálculos internos se basan en la inspección de `backend/app/routes.py`, no en restricciones completas expresadas por OpenAPI. Los estados de UI reflejan las propuestas de `components.md`.
- En la presentación propuesta, `formatPercent` recibe un porcentaje ya multiplicado por 100 y muestra un decimal; por ejemplo, ratio `0.3` → `30.0%`. `formatCurrency` muestra USD sin decimales, aunque la API no declara moneda. Moneda y precisión siguen pendientes de aprobación; no redondear los datos para calcular a partir del texto visible.

## 1. Filtro global de fechas

### Propósito

Filtrar todos los datos visibles del dashboard con dos fechas opcionales y mostrar el rango disponible del dataset. Con ambas fechas omitidas, se muestran todos los datos.

### Endpoints

| Método y ruta | Uso | Respuesta OpenAPI |
|---|---|---|
| `GET /api/metrics/facets` | Obtener las opciones de filtro y el rango disponible. No acepta query parameters. | `MetricsFacets`, representado por `FacetsResponse`. |
| `GET /api/metrics` | Obtener los movimientos usados por KPIs y gráficos; admite fechas y filtros opcionales adicionales. | `FinancialMovement[]`, definido en `financial-types.ts`. |
| `GET /api/metrics/alerts` | Obtener alertas respetando el mismo rango; parámetros completos en la sección 2. | `MetricsAlert[]`, representado por `AlertsResponse`. |
| `GET /api/metrics/summary` | Posible fuente adicional de agregados por período; su uso no está decidido ni forma parte de los endpoints relevantes indicados por el PM. | `MetricsSummaryItem[]`; OpenAPI lo documenta, pero no hay una interfaz TypeScript específica en los archivos actuales. |

`GET /api/metrics` también acepta `category` (`Category`) y `operation_type` (`OperationType`), ambos opcionales sin valor predeterminado. No son parte del filtro de fechas, pero deben conservarse si otra vista los utiliza.

### Tipos TypeScript

- Petición: `DateRangeFilter` (`start_date?: string`, `end_date?: string`), heredado por los tipos de parámetros de alertas y categorías.
- Facetas: `FacetsResponse` tiene `operation_types: OperationType[]`, `business_types: BusinessType[]`, `categories: Category[]`, `min_date: string` y `max_date: string`. Las fechas usan `YYYY-MM-DD`; las cinco propiedades son obligatorias y no anulables en el modelo OpenAPI.
- Movimientos: `FinancialMovement[]`; cada elemento contiene `create_date` (fecha), `amount` (número), `operation_type`, `category` y `business_type`.
- El `MetricsSummaryItem` de OpenAPI contiene `period: string` e `income`, `outcome`, `net: number`. No confundir este modelo documentado con un tipo frontend ya declarado.

### Parámetros

| Nombre | Tipo | Obligatorio | Valores/restricciones | Predeterminado |
|---|---|---:|---|---|
| `start_date` | Fecha (`YYYY-MM-DD`) | No | Fecha válida; en el código se aplica inclusivamente (`create_date >= start_date`). | Ninguno; omitir significa sin límite inferior. |
| `end_date` | Fecha (`YYYY-MM-DD`) | No | Fecha válida; en el código se aplica inclusivamente (`create_date <= end_date`). | Ninguno; omitir significa sin límite superior. |

En `/api/metrics`, `category` opcional admite `suppliers`, `sales`, `operational`, `administrative`, `others`; `operation_type` opcional admite `income`, `outcome`. Ambos carecen de valor predeterminado.

### Casos límite y UI

1. **Ambas fechas vacías:** omitir `start_date` y `end_date`; mostrar el conjunto completo. Mostrar `FacetsResponse.min_date`–`max_date` como rango disponible, no como filtro activo.
2. **Solo un extremo:** enviar solo la fecha indicada; la fecha sin valor no restringe ese lado. La consulta continúa incluyendo datos desde/hasta ese extremo inclusivo.
3. **Inicio posterior al fin o fecha inválida:** conservar el valor editable, mostrar el error asociado al control y no consultar hasta que el rango sea válido. Es validación de interfaz propuesta; OpenAPI no define el orden entre fechas.
4. **Rango válido fuera de `min_date`–`max_date`:** permitirlo sin ajustar fechas silenciosamente. Si la respuesta válida no contiene registros, mostrar el estado vacío; no mostrarlo como error HTTP.
5. **Carga/error de facetas:** mientras carga, indicar que el rango disponible aún no está listo. Si falla, mostrar error de facetas separado del estado de datos del dashboard; no inventar límites.

La propuesta de [components.md](components.md) comparte el rango entre dashboard y comparativa durante la sesión. No está definida persistencia entre recargas.

El contenedor mantiene una única selección válida aplicada y la propaga a movimientos/KPI/gráficos, alertas y ambas consultas top y fuentes de totales; facetas nunca recibe fechas. Una edición inválida no sustituye el rango aplicado ni dispara consultas. El encabezado muestra el rango seleccionado, con el extremo abierto identificado como tal; si ambos están vacíos, muestra el rango disponible de facetas, no uno inventado. Esta es una propuesta de UI, no una validación de la API.

Ante cambios rápidos de rango o umbral, la propuesta es descartar respuestas de selecciones anteriores para evitar mezclar datos con filtros nuevos. Cada área dependiente muestra carga hasta resolver su consulta; un fallo muestra error y una respuesta exitosa sin movimientos muestra un estado vacío explícito en KPI y gráficos, no valores anteriores etiquetados con el rango nuevo. Facetas tiene carga/error independientes; su fallo no demuestra que los movimientos estén vacíos.

## 2. Tabla de alertas de anomalías

### Propósito

Mostrar bajo los gráficos el período, gasto registrado, media móvil de los **tres períodos anteriores** e incremento porcentual, con filtro de fechas y umbral configurable.

### Endpoint

| Método y ruta | Uso | Respuesta OpenAPI |
|---|---|---|
| `GET /api/metrics/alerts` | Alertas filtradas por umbral, agrupación, rango y tipo de negocio opcional. | Array JSON directo `MetricsAlert[]`; `AlertsResponse = AlertEntry[]`, sin objeto contenedor. |

OpenAPI declara `422 Validation Error` para parámetros inválidos.

### Tipos TypeScript y campos

- Petición: `AlertsParams extends DateRangeFilter`; `threshold`, `group_by` y `business_type` son opcionales.
- Respuesta: `AlertEntry[]`, con las cuatro propiedades obligatorias y no anulables:

| Campo | Tipo | Significado y unidad |
|---|---|---|
| `period` | `string` | Etiqueta del período. OpenAPI solo garantiza cadena; el código produce `YYYY-MM-DD`, `YYYY-Www` o `YYYY-MM` según la agrupación. |
| `outcome_total` | `number` | Importe agregado de outcome/gasto del período; no es un movimiento individual. La API no indica moneda. |
| `baseline_average` | `number` | Media histórica de los períodos anteriores disponibles que usa actualmente el backend. No garantiza una ventana de tres períodos. |
| `increase_ratio` | `number` | Aumento en proporción; para porcentaje visible se multiplica por 100 (`1.0` equivale a `100%`). |

`MetricsAlert` es el nombre del modelo OpenAPI; `AlertEntry` es su representación frontend. No hay un campo API para la media móvil de tres períodos.

Para el requisito del PM, la fórmula candidata es `media = (gasto₁ + gasto₂ + gasto₃) / 3` y `ratio = (gasto_actual - media) / media`; el porcentaje visible es `ratio × 100`. Por ejemplo, con gastos anteriores `100`, `200`, `300` y gasto actual `260`, la media es `200`, el ratio `0.3` y el incremento `30.0%`. El comparador para decidir si ese caso igual al umbral `0.3` es alerta aún requiere aprobación; la API actual usa estrictamente `>` sobre su media histórica y redondea el ratio devuelto a cuatro decimales. No aplicar el umbral al porcentaje visible ni inferir la regla móvil del resultado histórico.

### Parámetros

| Nombre | Tipo | Obligatorio | Valores/restricciones OpenAPI | Predeterminado |
|---|---|---:|---|---|
| `threshold` | `number` | No | Mínimo API `0`; no hay máximo documentado. La interfaz debe imponer el rango adicional del PM `0.01–1.0`. | `0.3` |
| `group_by` | Unión literal | No | `day`, `week`, `month` | `month` |
| `start_date`, `end_date` | Fecha | No | Formato `YYYY-MM-DD`; filtros inclusivos según código. | Omitidos = sin límite en ese extremo. |
| `business_type` | Unión literal | No | `B2B`, `B2C` | Omitido = ambos grupos. |

### Casos límite y UI

1. **Respuesta `200` con `[]`:** tras completar correctamente el cálculo acordado, mostrar el estado vacío explícito para el rango y umbral activos. No confundir `[]` con carga o error. Mientras no se resuelva la discrepancia de media, `[]` de la API actual solo significa que el detector histórico no encontró alertas; no prueba ausencia de anomalías según la regla móvil del PM.
2. **Carga frente a error:** durante la petición mostrar placeholder; si el servidor responde `422` o hay fallo HTTP/red, mostrar error y no un estado vacío. Conservar visible el umbral y el rango para que puedan corregirse.
3. **Umbral en límites y fuera de ellos:** `0.01` y `1.0` son aceptables en UI; valores menores de `0.01` o mayores de `1.0` se rechazan con indicación y no se aplican. El backend aceptaría `0` y valores mayores que `1`, así que su validación por sí sola no satisface la regla del PM.
4. **Menos de tres períodos previos o períodos sin movimientos:** `summary` omite períodos sin registros; no asumir que estos equivalen a cero ni presentar una media parcial como ventana completa. No evaluar una anomalía hasta definir el tratamiento de historial insuficiente.
5. **Media móvil cero:** no dividir por cero para obtener incremento. Mostrar el resultado según una política aún pendiente; no reutilizar automáticamente la conducta histórica del endpoint como si fuera el requisito del PM.

El backend filtra las fechas antes de agrupar y calcular su historial; por tanto, un período cortado por un extremo puede tener gasto parcial y los períodos anteriores al inicio no participan. En `summary`, `week` usa año y semana ISO; `day` y `month` usan fecha y mes calendario. Para la regla móvil todavía hay que decidir si se aceptan períodos parciales y si se consulta historial anterior al rango. El valor inicial `0.3` es un ratio; la propuesta de UI aplica cada valor válido inmediatamente, muestra las filas cronológicamente y conserva rango y umbral durante carga o error. No hay paso de control aprobado.

## 3. Comparativa B2B vs B2C

### Propósito

En una página separada, comparar hasta cinco categorías principales de ingresos por grupo, mostrando nombre, importe y porcentaje respecto de todos los ingresos del grupo, además de un gráfico de totales B2B/B2C para el rango elegido.

### Endpoints

| Método y ruta | Uso | Respuesta OpenAPI |
|---|---|---|
| `GET /api/metrics/categories/top` | Categorías superiores filtradas por tipo de operación, rango y `business_type`. Hacer una consulta por grupo. | Array JSON directo `TopCategoryItem[]`; `TopCategoriesResponse = CategoryEntry[]`. No devuelve porcentajes ni total global del grupo. |
| `GET /api/metrics/facets` | Catálogo de categorías disponibles y rango del dataset. No está filtrado por fecha ni grupo. | `MetricsFacets`, representado por `FacetsResponse`. |
| `GET /api/metrics/summary` | Fuente adicional posible para ingresos por grupo/período; su uso no está decidido. | `MetricsSummaryItem[]`; tipo de respuesta OpenAPI, pero sin interfaz frontend específica actualmente. |
| `GET /api/metrics/b2b`, `GET /api/metrics/b2c` | Fuentes adicionales posibles: movimientos filtrables por fechas y `operation_type`; su uso no está decidido. | `FinancialMovement[]`, usando el tipo existente. |

Las rutas top, summary, b2b y b2c documentan `422 Validation Error` para validación de query.

### Tipos TypeScript y cálculo solicitado

- Categorías top: `TopCategoriesParams extends DateRangeFilter`, `CategoryEntry` y `TopCategoriesResponse`.
- `CategoryEntry` tiene `category: Category`, `operation_type: OperationType` y `total_amount: number`; las tres propiedades son obligatorias. No incluye porcentaje ni `business_type` en el elemento; el grupo se identifica por el parámetro usado en cada petición.
- Facetas: `FacetsResponse.categories: Category[]` y `business_types: BusinessType[]`.
- Movimientos: posible fuente alternativa `FinancialMovement[]` con `amount`, `operation_type` y `business_type`.
- Resumen: OpenAPI define `MetricsSummaryItem` con `period`, `income`, `outcome`, `net`; no existe un tipo específico de frontend en los archivos actuales.
- Regla de producto para cada fila: `porcentaje = importe de la categoría / total de todos los ingresos del mismo grupo y rango × 100`. El numerador se basa en `CategoryEntry.total_amount`; el denominador no está presente en esa respuesta y requiere otra fuente aprobada. El gráfico usa los mismos totales completos, nunca la suma solo del top cinco.
- Ejemplo: categoría `250` y total del grupo `1.000` producen `25.0%`; no calcular el denominador sumando las filas top ni multiplicar dos veces por 100. El porcentaje solo se calcula con total positivo y comparable; el tratamiento del total cero es una propuesta pendiente, no una propiedad de OpenAPI.

### Parámetros

| Nombre | Tipo | Obligatorio | Valores/restricciones OpenAPI | Predeterminado |
|---|---|---:|---|---|
| `operation_type` | Unión literal | No | `income`, `outcome`; para esta funcionalidad usar `income`. | `outcome` |
| `limit` | `integer` | No | Mínimo `1`, máximo `20`; `5` es el máximo solicitado por el PM, no una garantía de cinco resultados. | `5` |
| `business_type` | Unión literal | No | `B2B`, `B2C`; hacer una petición para cada valor. | Omitido = ambos grupos. |
| `start_date`, `end_date` | Fecha | No | Formato `YYYY-MM-DD`; filtros inclusivos según código. | Omitidos = sin límite en ese extremo. |

Para summary también existen `group_by` (`day`, `week`, `month`, predeterminado `month`), `category` (dominio `Category`) y `operation_type` (`income`, `outcome`); fechas y `business_type` tienen las restricciones anteriores. Los parámetros opcionales se omiten si no se usan.

Las rutas `/api/metrics/b2b` y `/api/metrics/b2c` aceptan fechas, `category` y `operation_type`, todos opcionales y sin predeterminado. No aceptan `business_type`: la propia ruta selecciona el grupo.

### Casos límite y UI

1. **Menos de cinco categorías o lista vacía:** mostrar los elementos recibidos en orden descendente por `total_amount`, sin completar filas artificiales. Si la lista es `[]`, indicar que no hay categorías de ingresos para ese grupo/rango; no tratarlo como fallo.
2. **Grupo sin ingresos / denominador cero:** mostrar total cero en el gráfico solo si ese total está confirmado. El porcentaje matemático es indefinido; se propone mostrar `—` en vez de `0%`, sujeto a aprobación. La determinación de que el grupo tiene cero ingresos depende de la fuente de total que se apruebe.
3. **Un grupo carga o falla y el otro tiene datos:** mantener estados independientes por grupo y para el gráfico; no ocultar el grupo correcto ni convertir el fallo en cero.
4. **Fechas omitidas o parciales:** omitir las dos fechas para todo el dataset o enviar el único extremo presente; usar el mismo rango en ambas solicitudes top y en la fuente de totales.
5. **Categoría presente en facetas, ausente de top:** el catálogo es global y no está segmentado por grupo/fecha/operación. No crear una fila con total cero automáticamente; la UI muestra resultados top y conserva facetas como vocabulario disponible.

Propuesta de navegación de [components.md](components.md): acceso visible desde el dashboard a «Comparativa B2B/B2C», con navegación de vuelta al dashboard y rango compartido durante la sesión. La URL, la navegación directa y el mecanismo de routing no están decididos; no asumir que ya existe un router. La pantalla comparativa coloca las dos secciones antes del gráfico de totales. No se especifica persistencia tras recargar.

Una respuesta `top=[]` por sí sola no confirma el denominador de una consulta separada ni un snapshot común. Solo presentar el total como cero si una fuente aprobada lo confirma para el mismo conjunto; de otro modo mantenerlo desconocido o mostrar el error correspondiente. La presentación del porcentaje con denominador cero es una propuesta pendiente.

## Decisiones pendientes y bloqueos

Las siguientes recomendaciones no son decisiones aprobadas. Un bloqueo afecta solo al comportamiento indicado; no convierte los demás requisitos en implementados.

1. **Fuente y regla de alertas — bloquea cálculo y tabla de anomalías.** La solución futura debe garantizar exactamente tres períodos anteriores, identificar su gasto, calcular la media y el incremento y aplicar el umbral al resultado correcto; el endpoint actual no sirve directamente como sustituto. Adaptar el backend/contrato o calcular a partir de datos suficientes en frontend son alternativas, no decisiones tomadas. Es necesario acordar períodos consecutivos o con datos, huecos, historial insuficiente, historia anterior al rango, períodos parciales, base cero, `>` o `>=` ante igualdad y momento del redondeo; sin estas reglas no puede asegurarse el resultado ni su estado vacío.
2. **Totales y consistencia B2B/B2C — bloquea porcentajes y gráfico de totales.** La solución debe obtener todos los ingresos del grupo y rango, y garantizar que numerador y denominador corresponden al mismo conjunto. Son alternativas no aprobadas `summary`, movimientos o una ampliación de API; cada una requiere resolver precisión y consistencia, y cambiar la fuente del top o el contrato necesita aprobación. Decidir precisión y redondeo, y la presentación con total confirmado cero; `—` es una propuesta porque la división es indefinida. Mientras no se resuelvan fuente y consistencia, `top=[]` no basta para presentar cero ni afirmar porcentajes fiables.
3. **Snapshot — bloquea combinar respuestas como si fueran un mismo dataset hasta garantizarlo.** Los endpoints regeneran con `seed=42` y `date.today()`; llamadas secuenciales el mismo día producen el mismo conjunto según el código, pero el generador comparte estado aleatorio global y la concurrencia no se ha verificado. El cambio de día también puede alterar fechas. Debe acordarse una garantía verificable de consistencia; un snapshot común es una alternativa, no una capacidad actual ni una solución seleccionada.
4. **Navegación — bloquea concretar el mecanismo y, si corresponde, la ruta.** El acceso visible desde el dashboard y la vuelta a él son la propuesta de interfaz; elegir entre routing con URL y cambio de vista en estado local sin imponer biblioteca ni URL. El rango compartido durante la sesión es una propuesta de `components.md`; persistencia al recargar también necesita decisión si se desea.
5. **Presentación y facetas — bloquea cerrar formato y uso visual, no las consultas básicas.** La API no indica moneda; elegir USD sin centavos mediante los helpers existentes o moneda y precisión de producto distintas. Recomendar reutilizar el formato actual solo tras confirmación. Para `FacetsResponse.categories`, elegir catálogo de etiquetas/validación o algún control visible compatible con los endpoints; recomendar catálogo, pues top no admite `category`. `components.md` propone ambos usos de presentación, no demuestra aprobación.

El umbral de UI `0.01–1.0` con valor inicial `0.3` sí procede del PM; la API únicamente exige `>= 0`. Carga, error HTTP/red y respuesta exitosa vacía son estados distintos; las políticas de reintento y de conservación de datos anteriores durante una recarga siguen sin aprobarse. Recomendar reintento explícito y no presentar datos anteriores como resultado del nuevo filtro; esto no bloquea definir los estados básicos.