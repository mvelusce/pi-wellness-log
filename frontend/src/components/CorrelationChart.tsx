import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CorrelationResult } from '../lib/api'
import { getCorrelationColor, getCorrelationLabel } from '../lib/utils'

interface CorrelationChartProps {
  data: CorrelationResult[]
}

export default function CorrelationChart({ data }: CorrelationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500 dark:text-gray-400 transition-colors">
        <p>Not enough data to calculate correlations.</p>
        <p className="text-sm mt-2">Track lifestyleFactors and mood for at least 7 days to see correlations.</p>
      </div>
    )
  }

  const chartData = data.map(item => ({
    name: item.lifestyle_factor_name,
    correlation: item.correlation,
    significant: item.significant,
    samples: item.sample_size
  }))

  const getBarColor = (correlation: number, significant: boolean) => {
    if (!significant) return '#9ca3af' // gray
    if (correlation > 0.5) return '#10b981' // strong positive - green
    if (correlation > 0.2) return '#60a5fa' // moderate positive - blue
    if (correlation > -0.2) return '#fbbf24' // weak - yellow
    if (correlation > -0.5) return '#fb923c' // moderate negative - orange
    return '#ef4444' // strong negative - red
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">LifestyleFactor-Mood Correlations</h3>
      
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        <p>This chart shows how each habit correlates with your mood.</p>
        <p className="mt-1">
          <span className="text-green-600 dark:text-green-400 font-semibold">Positive</span> = habit completion associated with better mood
        </p>
        <p>
          <span className="text-red-600 dark:text-red-400 font-semibold">Negative</span> = habit completion associated with worse mood
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[-1, 1]} />
          <YAxis type="category" dataKey="name" width={100} />
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload[0]) return null
              const data = payload[0].payload
              return (
                <div className="bg-white p-3 shadow-lg rounded-lg border">
                  <p className="font-semibold">{data.name}</p>
                  <p className="text-sm">Correlation: {data.correlation.toFixed(3)}</p>
                  <p className="text-sm">Samples: {data.samples}</p>
                  <p className={`text-sm font-semibold ${data.significant ? 'text-green-600' : 'text-gray-500'}`}>
                    {data.significant ? '✓ Significant' : '✗ Not significant'}
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="correlation" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.correlation, entry.significant)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 space-y-2">
        {data.map((item) => (
          <div key={item.lifestyle_factor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: getBarColor(item.correlation, item.significant)
                }}
              />
              <span className="font-medium">{item.lifestyle_factor_name}</span>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${getCorrelationColor(item.correlation)}`}>
                {getCorrelationLabel(item.correlation)}
              </p>
              <p className="text-xs text-gray-500">
                r = {item.correlation.toFixed(3)} (n={item.sample_size})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

