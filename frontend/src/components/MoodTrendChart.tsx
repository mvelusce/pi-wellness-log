import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatDisplayDate } from '../lib/utils'

interface MoodTrendData {
  date: string
  mood_score: number
  mood_ma7: number
  energy_level?: number
  stress_level?: number
}

interface MoodTrendChartProps {
  data: MoodTrendData[]
}

export default function MoodTrendChart({ data }: MoodTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500 dark:text-gray-400 transition-colors">
        <p>No mood data available.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Mood Trends Over Time</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              const d = new Date(date)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <YAxis domain={[0, 10]} />
          <Tooltip
            labelFormatter={(date) => formatDisplayDate(date as string)}
            formatter={(value: number) => [value.toFixed(1), '']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="mood_score"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Mood"
          />
          <Line
            type="monotone"
            dataKey="mood_ma7"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="7-Day Average"
          />
          {data.some(d => d.energy_level !== null) && (
            <Line
              type="monotone"
              dataKey="energy_level"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={{ r: 2 }}
              name="Energy"
            />
          )}
          {data.some(d => d.stress_level !== null) && (
            <Line
              type="monotone"
              dataKey="stress_level"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={{ r: 2 }}
              name="Stress"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

