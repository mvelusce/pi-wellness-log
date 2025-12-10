import { useEffect, useState } from 'react'
import { analyticsApi, CorrelationResult } from '../lib/api'
import CorrelationChart from '../components/CorrelationChart'
import MoodTrendChart from '../components/MoodTrendChart'
import { TrendingUp } from 'lucide-react'
import { subDays, format } from 'date-fns'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([])
  const [moodTrends, setMoodTrends] = useState<any[]>([])
  const [dateRange, setDateRange] = useState(30) // days (0 means all data)
  const [stats, setStats] = useState({
    avgMood: 0,
    totalEntries: 0,
    topHabit: ''
  })

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const endDate = format(new Date(), 'yyyy-MM-dd')
      // If dateRange is 0, use undefined for startDate to get all data
      const startDate = dateRange === 0 ? undefined : format(subDays(new Date(), dateRange), 'yyyy-MM-dd')

      const [correlationsRes, trendsRes] = await Promise.all([
        analyticsApi.getCorrelations(startDate, endDate, 5),
        analyticsApi.getMoodTrends(startDate, endDate)
      ])

      setCorrelations(correlationsRes.data)
      setMoodTrends(trendsRes.data.data || [])

      // Calculate stats
      if (trendsRes.data.data && trendsRes.data.data.length > 0) {
        const avgMood = trendsRes.data.data.reduce((sum: number, d: any) => sum + d.mood_score, 0) / trendsRes.data.data.length
        setStats({
          avgMood: avgMood,
          totalEntries: trendsRes.data.data.length,
          topHabit: correlationsRes.data.length > 0 ? correlationsRes.data[0].habit_name : 'N/A'
        })
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      // Don't show toast to avoid spam
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
        <TrendingUp className="text-primary-600" size={28} />
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Period
        </label>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 60, 90, 0].map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === days
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {days === 0 ? 'All' : `${days}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="text-4xl font-bold">{stats.avgMood.toFixed(1)}</div>
          <div className="text-blue-100 mt-1">Average Mood</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
          <div className="text-4xl font-bold">{stats.totalEntries}</div>
          <div className="text-green-100 mt-1">Mood Entries</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <div className="text-2xl font-bold truncate">{stats.topHabit || 'N/A'}</div>
          <div className="text-purple-100 mt-1">Top Correlated Habit</div>
        </div>
      </div>

      {/* Mood Trends */}
      <MoodTrendChart data={moodTrends} />

      {/* Correlations */}
      <CorrelationChart data={correlations} />

      {/* Insights */}
      {correlations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">💡 Insights</h3>
          <div className="space-y-3">
            {correlations
              .filter(c => c.significant && Math.abs(c.correlation) > 0.3)
              .slice(0, 3)
              .map((corr, i) => (
                <div key={i} className="p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg border border-primary-100">
                  <p className="font-medium text-gray-800">
                    {corr.correlation > 0 ? '✅' : '⚠️'} <strong>{corr.habit_name}</strong>
                    {' '}appears to be{' '}
                    {corr.correlation > 0 ? 'positively' : 'negatively'} correlated with your mood.
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    When you complete this habit, your mood tends to be{' '}
                    {corr.correlation > 0 ? 'better' : 'worse'}.
                  </p>
                </div>
              ))}

            {correlations.filter(c => c.significant && Math.abs(c.correlation) > 0.3).length === 0 && (
              <p className="text-gray-600 text-center py-4">
                Keep tracking! We'll show insights when we find significant patterns.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📊 About Mood Correlations</h4>
        <p className="text-sm text-blue-800">
          Correlations show the relationship between completing habits and your mood scores.
          Values range from -1 (strong negative) to +1 (strong positive).
          A result is considered <strong>significant</strong> when p-value &lt; 0.05.
        </p>
      </div>
    </div>
  )
}

