import { useEffect, useState } from 'react'
import { analyticsApi, CorrelationResult } from '../lib/api'
import CorrelationChart from '../components/CorrelationChart'
import MoodTrendChart from '../components/MoodTrendChart'
import { TrendingUp, Heart } from 'lucide-react'
import { subDays, format } from 'date-fns'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([])
  const [healthCorrelations, setHealthCorrelations] = useState<any>(null)
  const [moodTrends, setMoodTrends] = useState<any[]>([])
  const [dateRange, setDateRange] = useState(30) // days
  const [activeTab, setActiveTab] = useState<'mood' | 'health'>('mood')
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
      const startDate = format(subDays(new Date(), dateRange), 'yyyy-MM-dd')

      const [correlationsRes, trendsRes, healthCorrelationsRes] = await Promise.all([
        analyticsApi.getCorrelations(startDate, endDate, 5),
        analyticsApi.getMoodTrends(startDate, endDate),
        analyticsApi.getHabitHealthAspectCorrelations(undefined, startDate, endDate)
      ])

      setCorrelations(correlationsRes.data)
      setMoodTrends(trendsRes.data.data || [])
      setHealthCorrelations(healthCorrelationsRes.data)

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
        <div className="flex space-x-2">
          {[7, 14, 30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === days
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="bg-white rounded-lg shadow-md p-2 flex space-x-2">
        <button
          onClick={() => setActiveTab('mood')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            activeTab === 'mood'
              ? 'bg-primary-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          😊 Mood Correlations
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
            activeTab === 'health'
              ? 'bg-primary-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Heart size={20} />
          <span>Health Correlations</span>
        </button>
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
          <div className="text-2xl font-bold truncate">{stats.topHabit}</div>
          <div className="text-purple-100 mt-1">Top Correlated Habit</div>
        </div>
      </div>

      {/* Mood Trends */}
      {activeTab === 'mood' && <MoodTrendChart data={moodTrends} />}

      {/* Correlations */}
      {activeTab === 'mood' && <CorrelationChart data={correlations} />}

      {/* Health Correlations */}
      {activeTab === 'health' && healthCorrelations && (
        <div className="space-y-6">
          {healthCorrelations.results && healthCorrelations.results.length > 0 ? (
            healthCorrelations.results.map((aspectData: any) => (
              <div key={aspectData.aspect_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    {aspectData.aspect_name}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    aspectData.is_positive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {aspectData.aspect_category}
                  </span>
                </div>

                {aspectData.correlations && aspectData.correlations.length > 0 ? (
                  <div className="space-y-3">
                    {aspectData.correlations.slice(0, 5).map((corr: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-2 ${
                          corr.significant
                            ? corr.correlation > 0
                              ? 'bg-red-50 border-red-200'
                              : 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">
                              {corr.correlation > 0 ? '⚠️' : '✅'} {corr.habit_name}
                              {corr.habit_category && (
                                <span className="ml-2 text-xs text-gray-600">
                                  ({corr.habit_category})
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {corr.correlation > 0 
                                ? `May increase ${aspectData.aspect_name.toLowerCase()}`
                                : `May reduce ${aspectData.aspect_name.toLowerCase()}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              corr.correlation > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {corr.correlation > 0 ? '+' : ''}{(corr.correlation * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-600">
                              {corr.significant ? '✓ Significant' : 'Not significant'}
                            </div>
                            <div className="text-xs text-gray-500">
                              n={corr.sample_size}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Not enough data for this health aspect yet.
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">
                No health correlation data available yet. Keep tracking!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {activeTab === 'mood' && correlations.length > 0 && (
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
        <h4 className="font-semibold text-blue-900 mb-2">
          {activeTab === 'mood' ? '📊 About Mood Correlations' : '❤️ About Health Correlations'}
        </h4>
        <p className="text-sm text-blue-800">
          {activeTab === 'mood' ? (
            <>
              Correlations show the relationship between completing habits and your mood scores.
              Values range from -1 (strong negative) to +1 (strong positive).
              A result is considered <strong>significant</strong> when p-value &lt; 0.05.
            </>
          ) : (
            <>
              Health correlations show which habits (foods, supplements, activities) correlate with your health indicators.
              <strong> Positive correlation (red)</strong> means the habit may worsen the symptom.
              <strong> Negative correlation (green)</strong> means the habit may improve it.
              Results are significant when p-value &lt; 0.05.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

