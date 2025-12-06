import { useEffect, useState } from 'react'
import { moodApi, MoodEntry, healthAspectsApi, healthAspectEntriesApi, HealthAspect, HealthAspectEntry } from '../lib/api'
import { formatDate, formatDisplayDate, getMoodEmoji } from '../lib/utils'
import MoodPicker from '../components/MoodPicker'
import { Heart, Smile, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function HealthWellness() {
  const [loading, setLoading] = useState(true)
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    mood_score: 5,
    energy_level: 5,
    stress_level: 5,
    notes: '',
    tags: ''
  })
  
  // Health Aspects
  const [healthAspects, setHealthAspects] = useState<HealthAspect[]>([])
  const [aspectEntries, setAspectEntries] = useState<HealthAspectEntry[]>([])
  const selectedDate = new Date()  // Always use today for health aspects

  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (!mounted) return
      
      try {
        await loadMoodEntries()
      } catch (error) {
        console.error('Error in loadData:', error)
      }
      
      try {
        await loadHealthAspects()
      } catch (error) {
        console.error('Error in loadData:', error)
      }
      
      try {
        await loadAspectEntries()
      } catch (error) {
        console.error('Error in loadData:', error)
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])  // Empty dependency array - only run once on mount

  const loadHealthAspects = async () => {
    try {
      const response = await healthAspectsApi.getAll()
      setHealthAspects(response.data.filter(a => a.is_active))
    } catch (error) {
      console.error('Error loading health aspects:', error)
      // Don't show toast to avoid spam
    }
  }

  const loadAspectEntries = async () => {
    try {
      const response = await healthAspectEntriesApi.getByDate(formatDate(selectedDate))
      setAspectEntries(response.data)
    } catch (error) {
      console.error('Error loading aspect entries:', error)
      // Don't show toast to avoid spam
    }
  }

  const loadMoodEntries = async () => {
    try {
      setLoading(true)
      const response = await moodApi.getAll(undefined, undefined, 30)
      setRecentEntries(response.data)
    } catch (error) {
      console.error('Error loading mood entries:', error)
      // Don't show toast to avoid spam
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await moodApi.create({
        date: formatDate(new Date()),
        mood_score: formData.mood_score,
        energy_level: formData.energy_level,
        stress_level: formData.stress_level,
        notes: formData.notes || undefined,
        tags: formData.tags || undefined
      })

      setRecentEntries([response.data, ...recentEntries])
      setFormData({
        mood_score: 5,
        energy_level: 5,
        stress_level: 5,
        notes: '',
        tags: ''
      })
      setShowForm(false)
      toast.success('Mood logged successfully! 😊')
    } catch (error) {
      console.error('Error creating mood entry:', error)
      toast.error('Failed to log mood')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mood entry?')) {
      return
    }

    try {
      await moodApi.delete(id)
      setRecentEntries(recentEntries.filter(e => e.id !== id))
      toast.success('Mood entry deleted')
    } catch (error) {
      console.error('Error deleting mood entry:', error)
      toast.error('Failed to delete mood entry')
    }
  }

  const handleToggleAspect = async (aspectId: number, currentValue: boolean) => {
    try {
      await healthAspectEntriesApi.create({
        aspect_id: aspectId,
        date: formatDate(selectedDate),
        severity: currentValue ? 0 : 1,  // Toggle: 1 for yes, 0 for no
      })
      loadAspectEntries()
    } catch (error) {
      console.error('Error toggling health aspect:', error)
      toast.error('Failed to update health aspect')
    }
  }

  const isAspectChecked = (aspectId: number): boolean => {
    const entry = aspectEntries.find(e => e.aspect_id === aspectId)
    return entry ? entry.severity > 0 : false
  }

  // Group aspects by category
  const groupedAspects = healthAspects.reduce((groups, aspect) => {
    const category = aspect.category || 'General'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(aspect)
    return groups
  }, {} as Record<string, HealthAspect[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const todayEntries = recentEntries.filter(e => e.date === formatDate(new Date()))
  const averageToday = todayEntries.length > 0
    ? todayEntries.reduce((sum, e) => sum + e.mood_score, 0) / todayEntries.length
    : null
  
  const isToday = formatDate(selectedDate) === formatDate(new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Health & Wellness</h1>
        <Heart className="text-primary-600" size={28} />
      </div>

      {/* Health Aspects Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Health Indicators</h2>
          <span className="text-sm text-gray-600">
            {isToday ? 'Today' : formatDisplayDate(selectedDate)}
          </span>
        </div>

        {healthAspects.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No health aspects to track yet.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAspects).map(([category, aspects]) => (
              <div key={category}>
                <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center">
                  <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
                    {category}
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aspects.map((aspect) => {
                    const isChecked = isAspectChecked(aspect.id)
                    return (
                      <button
                        key={aspect.id}
                        onClick={() => handleToggleAspect(aspect.id, isChecked)}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                          isChecked
                            ? aspect.is_positive
                              ? 'bg-green-50 border-green-500'
                              : 'bg-red-50 border-red-500'
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{aspect.icon}</span>
                          <div className="text-left">
                            <p className="font-semibold text-gray-800">{aspect.name}</p>
                            {aspect.description && (
                              <p className="text-xs text-gray-600">{aspect.description}</p>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isChecked
                              ? aspect.is_positive
                                ? 'bg-green-500 border-green-500'
                                : 'bg-red-500 border-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isChecked && <Check size={16} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mood Tracker Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Mood Tracker</h2>
          <Smile className="text-primary-600" size={24} />
        </div>

      {/* Today's Summary */}
      {averageToday !== null && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md p-6 text-white mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Today's Mood</h3>
              <p className="text-3xl font-bold">{averageToday.toFixed(1)}/10</p>
              <p className="text-sm text-purple-100 mt-1">{todayEntries.length} check-in(s)</p>
            </div>
            <div className="text-6xl">{getMoodEmoji(Math.round(averageToday))}</div>
          </div>
        </div>
      )}

      {/* Log Mood Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-primary-600 text-white py-4 rounded-lg hover:bg-primary-700 font-semibold text-lg shadow-md"
        >
          + Log Your Mood
        </button>
      )}

      {/* Mood Entry Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <h3 className="text-xl font-semibold">How are you feeling?</h3>

          <MoodPicker
            value={formData.mood_score}
            onChange={(value) => setFormData({ ...formData, mood_score: value })}
            label="Overall Mood"
          />

          <MoodPicker
            value={formData.energy_level}
            onChange={(value) => setFormData({ ...formData, energy_level: value })}
            label="Energy Level"
          />

          <MoodPicker
            value={formData.stress_level}
            onChange={(value) => setFormData({ ...formData, stress_level: value })}
            label="Stress Level"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="What's on your mind?"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (Optional)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="work, exercise, social..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-semibold"
            >
              Save Mood
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Recent Entries */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Mood Check-ins</h3>
        
        {recentEntries.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <p>No mood entries yet. Log your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getMoodEmoji(entry.mood_score)}</span>
                    <div>
                      <p className="font-semibold text-lg text-gray-800">{entry.mood_score}/10</p>
                      <p className="text-sm text-gray-600">
                        {formatDisplayDate(entry.date)} • {new Date(entry.time).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>

                {(entry.energy_level || entry.stress_level) && (
                  <div className="flex space-x-4 text-sm text-gray-600 mb-2">
                    {entry.energy_level && (
                      <span>⚡ Energy: {entry.energy_level}/10</span>
                    )}
                    {entry.stress_level && (
                      <span>😰 Stress: {entry.stress_level}/10</span>
                    )}
                  </div>
                )}

                {entry.notes && (
                  <p className="text-gray-700 bg-white p-2 rounded mt-2">
                    {entry.notes}
                  </p>
                )}

                {entry.tags && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.tags.split(',').map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

