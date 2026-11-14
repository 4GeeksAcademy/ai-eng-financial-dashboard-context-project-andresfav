# Especificación de componentes del dashboard

Este documento describe los componentes React propuestos para las tres funcionalidades del PM. Es una especificación, no una implementación. Los tipos citados en `frontend/specs/api-types.ts`, `frontend/specs/param-types.ts` y `frontend/src/lib/financial-types.ts` son contratos existentes. Los tipos de vista señalados expresamente como derivados no son respuestas adicionales de la API. En los ejemplos de props se omiten los imports, pero los nombres reutilizan esos tipos.

## 1. Filtro global de fechas

### Componentes y responsabilidades

| Componente | Responsabilidad |
|---|---|
| `DashboardDateRangeControl` | Presentar las dos fechas opcionales, comunicar cambios al contenedor y mostrar el intervalo disponible del dataset. El nombre evita confundir el componente visual con la interfaz `DateRangeFilter`. |
| `App` / contenedor de páginas | Poseer un solo rango para el dashboard y la comparativa, cargar facetas y propagar el mismo rango a todas las consultas de datos relevantes. |

### Props de `DashboardDateRangeControl`

```ts
interface DashboardDateFilterProps {
  value: DateRangeFilter;
  availableRange: Pick<FacetsResponse, "min_date" | "max_date"> | null;
  facetsLoading: boolean;
  facetsError: string | null;
  onChange: (value: DateRangeFilter) => void;
}
```

- `value`: selección actual; usa `start_date` y `end_date` opcionales de `DateRangeFilter`.
- `availableRange`: `min_date` y `max_date` de `FacetsResponse`, ambas cadenas `YYYY-MM-DD`; es el rango del dataset, no necesariamente el rango seleccionado.
- `facetsLoading` y `facetsError`: estado de la consulta de facetas.
- `onChange`: comunica la selección al contenedor; no construye URLs ni llama a la API.

### Estados e interacciones

- **Carga de facetas:** mostrar un estado de carga para el intervalo disponible. Los inputs pueden seguir vacíos; no presentar el rango como conocido antes de recibir facetas.
- **Facetas con datos:** mostrar el rango mínimo–máximo y permitir introducir o borrar cualquiera de las fechas.
- **Error de facetas:** mostrar un error visible para el rango disponible; no sustituirlo por valores inventados. La política de reintento queda a cargo del contenedor.
- **Sin fechas:** representar ambas propiedades omitidas o vacías en la interfaz; el contenedor omite ambos parámetros en las consultas y presenta todos los datos.
- **Rango abierto:** una sola fecha limita solo ese extremo. `start_date` y `end_date` se envían en formato `YYYY-MM-DD` cuando tienen valor.
- **Formato inválido:** los valores intercambiados con la API deben ser fechas calendario válidas en `YYYY-MM-DD`. Mantener la edición local, mostrar el error junto al input y no consultar hasta que se corrija.
- **Inicio posterior al fin:** mostrar un error de rango y no aplicar la selección hasta que `start_date <= end_date`. La API no documenta validación de orden; esta validación pertenece a la interfaz.
- **Fuera del rango disponible:** permitir la selección y no limitarla a `min_date`/`max_date`, pues el PM pidió mostrar el rango disponible, no restringirlo. Si la consulta válida retorna cero datos, mostrar el estado vacío de los datos dependientes; no ajustar las fechas silenciosamente.
- **Compartir el filtro:** conservar el mismo rango al navegar entre dashboard y comparativa durante la sesión. Así ambas vistas representan el mismo intervalo. No se especifica persistencia después de recargar la página.

### Datos y propagación

- Obtener `FacetsResponse` de `GET /api/metrics/facets`; su contrato no recibe fechas.
- Aplicar el mismo rango a cada consulta que alimenta datos visibles: movimientos/KPI/gráficos mediante `GET /api/metrics`, alertas mediante `GET /api/metrics/alerts` y las consultas de resumen/categorías de la comparativa. Omitir los dos parámetros si ambos valores están vacíos; enviar un único extremo si el otro está vacío. Facetas permanece sin filtrar y representa el rango disponible del dataset.
- `DashboardHeader` actualmente recibe `period: string`. Mostrar allí el rango efectivo seleccionado si está definido; cuando ambos filtros estén vacíos, mostrar el rango de dataset de facetas. No presentar el rango disponible como si fuera el rango filtrado.
- Componentes actuales relevantes: `App`, `DashboardHeader`, tarjetas KPI y gráficos mensuales. `App` ya centraliza la petición, estado de carga/error y cálculos locales.

## 2. Tabla de anomalías

### Componentes y responsabilidades

| Componente | Responsabilidad |
|---|---|
| `AlertsPanel` | Agrupar control de umbral, resumen de estado y tabla; aparecer debajo de la sección de gráficos del dashboard principal. |
| `AlertsTable` | Presentar período, gasto registrado, media móvil de tres períodos anteriores e incremento porcentual, o un estado vacío explícito. |
| `ThresholdControl` | Permitir ajustar el umbral solicitado y comunicar el cambio al contenedor. |

### Props propuestas

`AlertsPanel` coordina `AlertsTable` y `ThresholdControl`; props conceptuales:

```ts
interface AlertsPanelProps {
  rows: AlertTableRow[];
  threshold: number;
  loading: boolean;
  error: string | null;
  onThresholdChange: (threshold: number) => void;
}

interface AlertTableRow {
  period: string;
  outcomeTotal: number;
  threePeriodAverage: number;
  increasePercent: number;
}
```

`AlertTableRow` es un **view model derivado**, no un modelo de respuesta de API. Los nombres camelCase son de presentación y no añaden campos a `AlertEntry`. `AlertsResponse`/`AlertEntry` representa exclusivamente la lista que devuelve el endpoint actual; no es una fuente equivalente de filas con media móvil de tres períodos.

- `period`: etiqueta de período.
- `outcomeTotal`: importe de gasto registrado en el período.
- `threePeriodAverage`: media móvil requerida por el PM.
- `increasePercent`: incremento presentado como porcentaje, derivado del ratio definido para la media móvil aprobada.
- `threshold`: ratio configurable, cuyo valor inicial de producto es `0.3`.
- `loading`, `error`: estado de consulta y error; `onThresholdChange` comunica cambios.

### Estados, presentación e interacción

- Colocar el panel después de los gráficos actuales de ingresos/gastos y margen.
- **Carga:** mostrar placeholder de tabla y mantener visible el control con su valor actual.
- **Error:** mostrar un mensaje diferenciado del estado vacío; no presentar una lista fallida como si no hubiera anomalías.
- **Datos disponibles:** una fila por alerta, en orden cronológico; columnas para período, importe, media móvil e incremento porcentual. En la tabla, el ratio se multiplica por 100; mostrar un decimal mediante el helper actual `formatPercent`.
- **Sin anomalías:** cuando la carga termina correctamente y `rows` está vacío, mostrar un mensaje explícito de que no hay anomalías para el rango y umbral actuales.
- Validar el control en la interfaz dentro del intervalo inclusivo `0.01–1.0` solicitado por el PM, con valor inicial `0.3`. No se especifica un paso. Un valor fuera de rango no se aplica ni se consulta; mostrar una indicación junto al control. Tras cada cambio válido, aplicar el umbral inmediatamente y actualizar resultados conservando el filtro de fechas. La API solo documenta `threshold >= 0`, sin máximo; son restricciones distintas.
- Aplicar al cálculo/consulta el `DateRangeFilter` global; si ambas fechas están vacías, no enviar los parámetros.
- Mostrar `increasePercent` como porcentaje (`ratio × 100`), no como la fracción decimal `increase_ratio` sin convertir.
- Dar formato mediante `formatCurrency` del dashboard (USD, sin decimales visibles) para mantener consistencia; la API devuelve números sin moneda. La moneda y precisión de presentación deben confirmarse con producto antes de implementar si se requieren centavos u otra moneda.

### Dependencias y discrepancia de media

- `AlertsParams` describe parámetros del endpoint, y `AlertsResponse` es `AlertEntry[]`. `AlertEntry` contiene `period`, `outcome_total`, `baseline_average` e `increase_ratio`.
- El backend calcula actualmente `baseline_average` como la media de todos los períodos anteriores disponibles y genera sus alertas con esa referencia. **No equivale a la media móvil de los tres períodos anteriores del PM.** No mapearlo a `threePeriodAverage` ni describirlo como tal.
- El endpoint de alertas no entrega los tres períodos fuente ni su ventana explícita. La incompatibilidad requiere decisión antes de implementar. Alternativas:
  1. Cambiar el backend para que el endpoint calcule y devuelva una referencia móvil de tres períodos; implica cambiar el contrato y acordar compatibilidad/campos.
  2. Obtener datos del endpoint de resumen y calcular en el cliente las medias y anomalías; implica definir períodos previos fuera del rango seleccionado, períodos ausentes, base cero y el comparador del umbral.
  3. Mantener el requisito bloqueado hasta acordar una solución de producto/API.
- **Períodos sin registros:** `GET /api/metrics/summary` solo devuelve períodos presentes en sus movimientos; por tanto, un mes sin registros no viene representado como cero. Para una ventana de tres períodos consecutivos del calendario, decidir si los faltantes cuentan como cero o si se usa una secuencia de períodos con datos.
- **Historial insuficiente:** no marcar anomalías antes de disponer de tres períodos previos completos. Es una propuesta conservadora que evita etiquetar una media parcial como media móvil de tres; requiere aprobar la política de inicio de serie.
- **Media base cero:** el endpoint actual omite alertas cuando su baseline no es positivo. Para el cálculo móvil, definir si también se omiten alertas con media cero o se aplica otra regla; no calcular una división por cero.
- Los tres períodos de referencia pueden preceder al inicio visible seleccionado para poder evaluar el primer período del rango. Esta propuesta preserva una ventana completa; confirmar si el filtro de fechas debe limitar también el historial de referencia.

## 3. Página comparativa B2B vs B2C

### Componentes y responsabilidades

| Componente | Responsabilidad |
|---|---|
| `B2BvsB2CPage` | Página separada que coordina filtros, estado de datos y layout comparativo. |
| `BusinessCategorySection` | Sección de un grupo con tabla de hasta cinco categorías de ingresos y su porcentaje del total de ingresos del grupo. Reutilizable con `B2B` o `B2C`. |
| `IncomeComparisonChart` | Comparar los ingresos totales de B2B y B2C para el mismo rango. |
| `DashboardDateRangeControl` | Reutilizar el mismo componente visual del dashboard; el estado de rango se comparte entre páginas durante la sesión. |

El proyecto monta actualmente un único `App` y no declara una biblioteca de routing en `frontend/package.json`. Propuesta de interfaz: navegación principal con entradas “Dashboard” y “Comparativa B2B/B2C”, conservando el rango compartido y señalando la vista activa. La URL y mecanismo de routing requieren aprobación de arquitectura; no se presupone una dependencia ni una ruta concreta.

### Props propuestas

```ts
interface CategoryTableRow {
  category: Category;
  totalAmount: number;
  percentageOfGroup: number | null;
}

interface BusinessCategorySectionProps {
  businessType: BusinessType;
  rows: CategoryTableRow[];
  availableCategories: Category[];
  groupIncomeTotal: number | null;
  loading: boolean;
  error: string | null;
}

interface BusinessIncomeTotal {
  businessType: BusinessType;
  incomeTotal: number;
}

interface IncomeComparisonChartProps {
  totals: BusinessIncomeTotal[];
  loading: boolean;
  error: string | null;
}
```

`CategoryTableRow` y `BusinessIncomeTotal` son modelos de presentación derivados; **no** son respuestas declaradas por la API. `CategoryTableRow.category` reutiliza `Category`, mientras `totalAmount` deriva de `CategoryEntry.total_amount` y `percentageOfGroup` se calcula con el denominador completo. No añadir porcentaje a `CategoryEntry`/`TopCategoriesResponse`.

- `businessType`: `B2B` o `B2C`.
- `rows`: filas presentables derivadas de la respuesta directa `TopCategoriesResponse` y del total completo del grupo.
- `availableCategories`: catálogo `FacetsResponse.categories`, para identificar categorías disponibles; no implica que `categories/top` acepte filtro `category`.
- `groupIncomeTotal`: denominador de porcentaje y total de gráfico para ese grupo; `null` mientras no esté disponible o cuando la política para un grupo sin ingresos esté pendiente.
- `totals`: valores para ambos grupos en el gráfico.
- `loading` y `error`: estado visible correspondiente a las peticiones de cada sección/gráfico.

La página recibe además conceptualmente `dateRange: DateRangeFilter`, `facets: FacetsResponse | null` y `onDateRangeChange: (value: DateRangeFilter) => void`, y propaga el rango compartido a las consultas B2B y B2C. Si una sección falla, la otra conserva su estado/datos; cada petición necesita su propio `loading` y `error`.

### Datos, estados e interacciones

- Solicitar `GET /api/metrics/categories/top` para cada grupo con `operation_type=income`, `limit=5`, su `business_type` y las fechas seleccionadas. `TopCategoriesParams` refleja estos parámetros; `TopCategoriesResponse` es una lista directa de `CategoryEntry`.
- Consultar `GET /api/metrics/facets` para `FacetsResponse.categories` y el rango disponible. Usar `categories` como catálogo canónico para etiquetas/validación de códigos, no como filtro: el endpoint top no acepta `category`. Facetas abarca el dataset, no está segmentado por grupo, fecha ni operación; no inferir que cada categoría disponible tiene ingresos en ambos grupos.
- Presentar dos secciones paralelas, identificadas visiblemente como B2B y B2C. Cada tabla muestra categoría, importe de ingresos y porcentaje del total de ingresos del grupo.
- **Carga:** placeholders independientes para cada sección y gráfico. La carga/falla de un grupo no debería ocultar el resultado satisfactorio del otro.
- **Error:** informar el fallo del grupo o gráfico afectado; no sustituirlo por cero ni por una tabla vacía sin explicación.
- **Sin resultados:** si la consulta top devuelve `[]`, indicar explícitamente que no hay categorías de ingreso para ese grupo/rango. No fabricar filas de importe cero a partir de facetas.
- **Menos de cinco categorías:** mostrar las que devuelve el endpoint; `limit=5` es un máximo, no garantía de cinco resultados. No rellenar categorías ausentes con importes cero.
- **Orden:** conservar el orden descendente por `total_amount` que genera el backend; no reordenar por porcentaje. Si se introduce una ordenación interactiva, queda fuera del requisito actual.
- **Grupo sin ingresos:** mostrar total `0` en el gráfico y mensaje de ausencia de categorías si la respuesta está vacía. Si el total es cero, `percentageOfGroup` será `null` y la celda mostrará `—`, no `0%`, porque el porcentaje no está definido.
- Presentar porcentajes con un decimal mediante `formatPercent`; importes con `formatCurrency` existente. La API no declara moneda y la precisión visual de importes requiere la confirmación indicada anteriormente.
- **Sin rango de fechas:** omitir `start_date` y `end_date`; con rango abierto, enviar solo el extremo definido. Fechas inválidas/invertidas siguen las reglas del filtro de fechas.

### Porcentajes y total del grupo: incompatibilidad pendiente

- `CategoryEntry.total_amount` aporta el numerador por categoría, pero la respuesta top no contiene el porcentaje ni el total completo de ingresos del grupo. El porcentaje solicitado es `total_amount / groupIncomeTotal × 100`; la gráfica requiere ese mismo total completo, no la suma del top cinco.
- Dos fuentes existentes posibles para `groupIncomeTotal` son:
  1. `GET /api/metrics/summary` con fechas, `operation_type=income` y `business_type`; sumar `income` de los períodos devueltos. Cada elemento es `MetricsSummaryItem` (`period`, `income`, `outcome`, `net`). Hay que decidir agrupación y precisión al sumar valores ya redondeados por período.
  2. `GET /api/metrics/b2b` o `/api/metrics/b2c` con fechas y agregar en cliente los movimientos de tipo `income`; provee el detalle, pero implica transferir más datos y no es una respuesta de total agregado.
- Alternativamente, ampliar el contrato backend para entregar total y/o porcentaje junto a categorías. Esta alternativa cambia la API.
- **Consistencia de datos verificada en código, con riesgo:** `categories/top`, `summary` y rutas de movimientos generan datos mediante `generate_mock_movements(seed=42)`. En invocaciones secuenciales el mismo día, la semilla produce el mismo conjunto simulado; las fechas se derivan de `date.today()`. Sin embargo, la función reinicia y consume el generador aleatorio global. Solicitudes concurrentes podrían intercalarse y no hay garantía de snapshot común; un cambio de día también puede cambiar el conjunto. No asumir que numerador y denominador son comparables hasta resolver/verificar este riesgo.
- En consecuencia, ninguna fuente de denominador queda aprobada. Además del riesgo de snapshot, requieren decisión la precisión al sumar `summary` redondeados, la política para cero y la precisión monetaria visible.

## Referencias de datos y presentación

- Tipos de respuesta: `FacetsResponse`, `AlertsResponse` / `AlertEntry`, `TopCategoriesResponse` / `CategoryEntry` en `frontend/specs/api-types.ts`.
- Tipos de query: `DateRangeFilter`, `AlertsParams` y `TopCategoriesParams` en `frontend/specs/param-types.ts`.
- Tipos de movimientos y dominio: `FinancialMovement`, `OperationType`, `Category` y `BusinessType` en `frontend/src/lib/financial-types.ts`.
- Patrón actual: `App` efectúa `fetch`, comprueba `response.ok`, conserva estados de carga/error y realiza cálculos mediante `financial-utils.ts`; los gráficos actuales muestran esqueletos durante la carga y un estado vacío. La especificación reutiliza esos patrones, sin asumir que exista aún un cliente HTTP compartido.

## Decisiones para revisión

1. Resolver cómo satisfacer la media móvil exacta de tres períodos sin confundirla con `baseline_average`.
2. Elegir la fuente del total B2B/B2C y cómo garantizar consistencia entre consultas; aprobar su precisión y la política para porcentajes con denominador cero.
3. Decidir qué papel visual debe tener `FacetsResponse.categories` en la comparativa; la propuesta es usarlo como catálogo, no como filtro ni como fuente de filas con cero.
4. Confirmar la regla propuesta para meses ausentes, historial insuficiente, base cero y el uso de períodos anteriores al rango filtrado en alertas.
5. Aprobar moneda y precisión de presentación; la propuesta reutiliza los formateadores existentes, cuyo display monetario es USD sin centavos.
6. Aprobar la navegación/ruta de la nueva página; la propuesta comparte el rango seleccionado entre vistas durante la sesión.