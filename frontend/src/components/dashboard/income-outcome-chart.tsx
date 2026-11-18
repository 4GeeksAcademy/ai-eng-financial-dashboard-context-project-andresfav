import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type MonthlyDataPoint } from '@/lib/financial-types'
import { formatCurrency } from '@/lib/financial-utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface IncomeOutcomeChartProps {
  data: MonthlyDataPoint[]
  loading?: boolean
}

interface TooltipPayload {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium text-foreground ml-auto pl-4">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function IncomeOutcomeChart({ data, loading }: IncomeOutcomeChartProps) {
  if (loading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-3 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
          <Skeleton className="mt-4 h-5 w-32" />
        </CardContent>
      </Card>
    )
  }

  const hasData = data.some((d) => d.income > 0 || d.outcome > 0)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Income vs. Outcome</CardTitle>
        <CardDescription>Monthly revenue and expenditure evolution</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
            No data available to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.6} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground capitalize">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="income"
                stroke="var(--chart-income)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-income)', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="outcome"
                name="outcome"
                stroke="var(--chart-outcome)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-outcome)', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            View chart data
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Monthly income and outcome</caption>
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2" scope="col">Month</th>
                  <th className="px-3 py-2" scope="col">Income</th>
                  <th className="px-3 py-2" scope="col">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground" colSpan={3}>
                      No data available
                    </td>
                  </tr>
                ) : data.map((entry) => (
                  <tr className="border-b border-border/60 last:border-0" key={entry.month}>
                    <th className="px-3 py-2 font-medium" scope="row">{entry.month}</th>
                    <td className="px-3 py-2">{formatCurrency(entry.income)}</td>
                    <td className="px-3 py-2">{formatCurrency(entry.outcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
