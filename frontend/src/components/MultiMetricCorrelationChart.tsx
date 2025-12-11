import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MetricCorrelationSummary } from '../lib/api'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface MultiMetricCorrelationChartProps {
  data: MetricCorrelationSummary[]
}

// Metric metadata for display
const METRIC_INFO: { [key: string]: { label: string; higherIsBetter: boolean; color: string } } = {
  mood_score: { label: 'Mood', higherIsBetter: true, color: '#3b82f6' },
  energy_level: { label: 'Energy', higherIsBetter: true, color: '#f59e0b' },
  stress_level: { label: 'Stress', higherIsBetter: false, color: '#ef4444' },
  anxiety_level: { label: 'Anxiety', higherIsBetter: false, color: '#dc2626' },
  rumination_level: { label: 'Rumination', higherIsBetter: false, color: '#991b1b' },
  anger_level: { label: 'Anger', higherIsBetter: false, color: '#7f1d1d' },
  general_health: { label: 'Health', higherIsBetter: true, color: '#10b981' },
  sleep_quality: { label: 'Sleep', higherIsBetter: true, color: '#8b5cf6' },
  sweating_level: { label: 'Sweating', higherIsBetter: false, color: '#f97316' },
  libido_level: { label: 'Libido', higherIsBetter: true, color: '#ec4899' },
}

const getBarColor = (correlation: number, significant: boolean, higherIsBetter: boolean) => {
  if (!significant) return '#9ca3af' // gray for non-significant
  
  // For metrics where higher is better (mood, energy, etc.)
  // Positive correlation = good (green), negative = bad (red)
  // For metrics where lower is better (stress, anxiety, etc.)
  // Negative correlation = good (green), positive = bad (red)
  
  const effectiveCorr = higherIsBetter ? correlation : -correlation
  
  if (effectiveCorr > 0.5) return '#10b981' // strong positive effect - green
  if (effectiveCorr > 0.2) return '#60a5fa' // moderate positive - blue
  if (effectiveCorr > -0.2) return '#fbbf24' // weak - yellow
  if (effectiveCorr > -0.5) return '#fb923c' // moderate negative - orange
  return '#ef4444' // strong negative - red
}

const getCorrelationLabel = (correlation: number, higherIsBetter: boolean) => {
  const effectiveCorr = higherIsBetter ? correlation : -correlation
  const absCorr = Math.abs(effectiveCorr)
  
  let strength = ''
  if (absCorr > 0.7) strength = 'Very Strong'
  else if (absCorr > 0.5) strength = 'Strong'
  else if (absCorr > 0.3) strength = 'Moderate'
  else if (absCorr > 0.1) strength = 'Weak'
  else strength = 'Very Weak'
  
  const direction = effectiveCorr > 0 ? 'Positive' : 'Negative'
  return `${strength} ${direction}`
}

const getEffectDescription = (correlation: number, significant: boolean, higherIsBetter: boolean) => {
  if (!significant) return 'No significant effect found'
  
  const effectiveCorr = higherIsBetter ? correlation : -correlation
  
  if (effectiveCorr > 0.3) return '✅ Appears beneficial'
  if (effectiveCorr > 0.1) return '↗️ Slightly beneficial'
  if (effectiveCorr > -0.1) return '↔️ Minimal impact'
  if (effectiveCorr > -0.3) return '↘️ Slightly detrimental'
  return '⚠️ Appears detrimental'
}

export default function MultiMetricCorrelationChart({ data }: MultiMetricCorrelationChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>(data[0]?.metric_name || '')

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
        <Activity className="mx-auto mb-4" size={48} />
        <p className="text-lg font-medium">Not enough data to calculate correlations.</p>
        <p className="text-sm mt-2">Track lifestyle factors and wellbeing for at least 7 days to see correlations.</p>
      </div>
    )
  }

  const currentMetric = data.find(m => m.metric_name === selectedMetric) || data[0]
  const metricInfo = METRIC_INFO[currentMetric.metric_name]

  const chartData = currentMetric.correlations.map(item => ({
    name: item.lifestyle_factor_name,
    correlation: item.correlation,
    significant: item.significant,
    samples: item.sample_size
  }))

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Lifestyle Factor - Wellbeing Correlations</h3>
        <Activity className="text-primary-600" size={24} />
      </div>

      {/* Metric Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Wellbeing Metric
        </label>
        <div className="flex flex-wrap gap-2">
          {data.map((metric) => {
            const info = METRIC_INFO[metric.metric_name]
            return (
              <button
                key={metric.metric_name}
                onClick={() => setSelectedMetric(metric.metric_name)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
                  selectedMetric === metric.metric_name
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={selectedMetric === metric.metric_name ? { borderColor: info.color } : {}}
              >
                {metric.metric_display_name}
                <span className="ml-2 text-xs text-gray-500">
                  ({metric.correlations.filter(c => c.significant).length})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">About {currentMetric.metric_display_name} Correlations</p>
            <p>
              {metricInfo.higherIsBetter 
                ? `Positive correlations mean the lifestyle factor is associated with better ${currentMetric.metric_display_name.toLowerCase()}.`
                : `Negative correlations mean the lifestyle factor is associated with reduced ${currentMetric.metric_display_name.toLowerCase()}.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[-1, 1]} />
            <YAxis type="category" dataKey="name" width={110} />
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
                      {data.significant ? '✓ Statistically Significant' : '✗ Not Significant'}
                    </p>
                    <p className="text-xs mt-1 text-gray-600">
                      {getEffectDescription(data.correlation, data.significant, metricInfo.higherIsBetter)}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="correlation" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.correlation, entry.significant, metricInfo.higherIsBetter)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No correlations found for this metric.</p>
        </div>
      )}

      {/* Correlation Details List */}
      <div className="mt-6 space-y-2">
        <h4 className="font-semibold text-gray-700 mb-3">Detailed Results</h4>
        {currentMetric.correlations
          .filter(item => item.significant)
          .slice(0, 10)
          .map((item) => {
            const effectiveCorr = metricInfo.higherIsBetter ? item.correlation : -item.correlation
            return (
              <div key={item.lifestyle_factor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getBarColor(item.correlation, item.significant, metricInfo.higherIsBetter)
                    }}
                  />
                  <span className="font-medium">{item.lifestyle_factor_name}</span>
                  {effectiveCorr > 0 ? (
                    <TrendingUp className="text-green-600" size={16} />
                  ) : (
                    <TrendingDown className="text-red-600" size={16} />
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {getCorrelationLabel(item.correlation, metricInfo.higherIsBetter)}
                  </p>
                  <p className="text-xs text-gray-500">
                    r = {item.correlation.toFixed(3)}, p = {item.p_value.toFixed(4)} (n={item.sample_size})
                  </p>
                </div>
              </div>
            )
          })}
        {currentMetric.correlations.filter(c => c.significant).length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No statistically significant correlations found for this metric.
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2 text-sm">Interpretation Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Strong positive effect</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span>Moderate positive effect</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span>Weak/neutral effect</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span>Moderate negative effect</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Strong negative effect</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>Not statistically significant</span>
          </div>
        </div>
      </div>
    </div>
  )
}

