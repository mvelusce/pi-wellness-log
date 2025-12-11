import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { lifestyleFactorsApi, lifestyleFactorEntriesApi, wellbeingApi, LifestyleFactor } from '../lib/api'
import { formatDate, formatDisplayDate, getMoodEmoji } from '../lib/utils'
import LifestyleFactorCard from '../components/LifestyleFactorCard'
import EditLifestyleFactorModal from '../components/EditLifestyleFactorModal'
import { Calendar, TrendingUp, Heart } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { lifestyleFactors, setLifestyleFactors, lifestyleFactorEntries, setLifestyleFactorEntries, selectedDate, setSelectedDate } = useStore()
  const [loading, setLoading] = useState(true)
  const [todayMood, setTodayMood] = useState<number | null>(null)
  const [editingLifestyleFactor, setEditingLifestyleFactor] = useState<LifestyleFactor | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    loadData()
    loadCategories()
  }, [selectedDate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [habitsRes, entriesRes, moodRes] = await Promise.all([
        lifestyleFactorsApi.getAll(),
        lifestyleFactorEntriesApi.getByDate(formatDate(selectedDate)),
        wellbeingApi.getByDate(formatDate(selectedDate))
      ])
      
      setLifestyleFactors(habitsRes.data)
      setLifestyleFactorEntries(entriesRes.data)
      
      if (moodRes.data.length > 0) {
        const avgMood = moodRes.data.reduce((sum: number, m: any) => sum + m.mood_score, 0) / moodRes.data.length
        setTodayMood(Math.round(avgMood))
      } else {
        setTodayMood(null)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Don't show toast to avoid spam
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await lifestyleFactorsApi.getCategories()
      const uniqueCategories = ['All', ...response.data.categories]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleEditLifestyleFactor = async (updatedData: Partial<LifestyleFactor>) => {
    if (!editingLifestyleFactor) return
    
    try {
      await lifestyleFactorsApi.update(editingLifestyleFactor.id, updatedData)
      toast.success('LifestyleFactor updated!')
      loadData()
      setEditingLifestyleFactor(null)
    } catch (error) {
      console.error('Error updating lifestyleFactor:', error)
      toast.error('Failed to update lifestyle factor')
    }
  }

  const handleArchiveLifestyleFactor = async (id: number, name: string) => {
    if (!confirm(`Archive "${name}"?`)) return
    
    try {
      await lifestyleFactorsApi.archive(id)
      toast.success('LifestyleFactor archived')
      loadData()
    } catch (error) {
      console.error('Error archiving lifestyleFactor:', error)
      toast.error('Failed to archive lifestyle factor')
    }
  }

  const handleDeleteLifestyleFactor = async (id: number, name: string) => {
    if (!confirm(`Permanently delete "${name}"?`)) return
    
    try {
      await lifestyleFactorsApi.delete(id)
      toast.success('LifestyleFactor deleted')
      loadData()
    } catch (error) {
      console.error('Error deleting lifestyleFactor:', error)
      toast.error('Failed to delete lifestyle factor')
    }
  }

  const handleToggleLifestyleFactor = async (lifestyleFactorId: number, completed: boolean) => {
    try {
      const response = await lifestyleFactorEntriesApi.create({
        lifestyle_factor_id: lifestyleFactorId,
        date: formatDate(selectedDate),
        completed
      })
      
      const existing = lifestyleFactorEntries.findIndex(
        e => e.lifestyle_factor_id === lifestyleFactorId && e.date === formatDate(selectedDate)
      )
      
      if (existing >= 0) {
        const newEntries = [...lifestyleFactorEntries]
        newEntries[existing] = response.data
        setLifestyleFactorEntries(newEntries)
      } else {
        setLifestyleFactorEntries([...lifestyleFactorEntries, response.data])
      }
      
      toast.success(completed ? 'LifestyleFactor completed! 🎉' : 'LifestyleFactor unchecked')
    } catch (error) {
      console.error('Error toggling lifestyleFactor:', error)
      toast.error('Failed to update lifestyle factor')
    }
  }

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const isToday = formatDate(selectedDate) === formatDate(new Date())
  const completedCount = lifestyleFactorEntries.filter(e => e.completed).length
  const totalCount = lifestyleFactors.filter(h => h.is_active).length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Filter and group lifestyleFactors
  const activeLifestyleFactors = lifestyleFactors.filter(h => h.is_active)
  const filteredLifestyleFactors = selectedCategory === 'All' 
    ? activeLifestyleFactors 
    : activeLifestyleFactors.filter(h => h.category === selectedCategory)
  
  const groupedLifestyleFactors = filteredLifestyleFactors.reduce((groups, lifestyleFactor) => {
    const category = lifestyleFactor.category || 'General'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(lifestyleFactor)
    return groups
  }, {} as Record<string, typeof activeLifestyleFactors>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-semibold text-xl transition-colors"
          >
            ←
          </button>
          
          <div className="flex items-center space-x-2">
            <Calendar className="text-primary-600 dark:text-primary-400" size={20} />
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {isToday ? 'Today' : formatDisplayDate(selectedDate)}
            </span>
          </div>
          
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-semibold text-xl disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
            disabled={isToday}
          >
            →
          </button>
        </div>
        
        {!isToday && (
          <button
            onClick={() => setSelectedDate(new Date())}
            className="w-full mt-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Back to Today
          </button>
        )}
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-lg shadow-md p-6 text-white transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              {completedCount} / {totalCount}
            </h2>
            <p className="text-primary-100 dark:text-primary-200">Lifestyle Factors Completed</p>
          </div>
          <div className="text-5xl">
            {completionRate === 100 ? '🌟' : completionRate >= 75 ? '🔥' : completionRate >= 50 ? '💪' : '🌱'}
          </div>
        </div>
        
        <div className="bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        
        <div className="mt-2 flex items-center justify-between text-sm text-primary-100 dark:text-primary-200">
          <span>{completionRate}% Complete</span>
          {todayMood && (
            <span className="flex items-center space-x-1">
              <span>Mood:</span>
              <span className="text-2xl">{getMoodEmoji(todayMood)}</span>
              <span>{todayMood}/5</span>
            </span>
          )}
        </div>
      </div>

      {/* Check In Button */}
      <Link
        to="/wellbeing"
        className="block bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-lg">
              <Heart className="text-primary-600 dark:text-primary-400" size={28} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Check In</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Log your well-being metrics for today</p>
            </div>
          </div>
          <div className="text-2xl dark:text-gray-400">→</div>
        </div>
      </Link>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 dark:bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Habits List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Your Lifestyle Factors</h2>
          <TrendingUp className="text-primary-600 dark:text-primary-400" size={24} />
        </div>
        
        {filteredLifestyleFactors.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center transition-colors">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {lifestyleFactors.length === 0 ? 'No lifestyleFactors yet. Create your first habit!' : 'No lifestyleFactors in this category.'}
            </p>
            {lifestyleFactors.length === 0 && (
              <a
                href="/lifestyleFactors"
                className="inline-block bg-primary-600 dark:bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
              >
                Create LifestyleFactor
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLifestyleFactors).map(([category, categoryHabits]) => (
              <div key={category}>
                {selectedCategory === 'All' && (
                  <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                    <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full">
                      {category}
                    </span>
                    <span className="ml-2 text-gray-500 dark:text-gray-500">({categoryHabits.length})</span>
                  </h3>
                )}
                
                <div className="space-y-3">
                  {categoryHabits.map(lifestyleFactor => {
                    const entry = lifestyleFactorEntries.find(
                      e => e.lifestyle_factor_id === lifestyleFactor.id && e.date === formatDate(selectedDate)
                    )
                    
                    return (
                      <LifestyleFactorCard
                        key={lifestyleFactor.id}
                        lifestyleFactor={lifestyleFactor}
                        entry={entry}
                        onToggle={(completed) => handleToggleLifestyleFactor(lifestyleFactor.id, completed)}
                        onEdit={() => setEditingLifestyleFactor(lifestyleFactor)}
                        onDelete={() => handleDeleteLifestyleFactor(lifestyleFactor.id, lifestyleFactor.name)}
                        onArchive={() => handleArchiveLifestyleFactor(lifestyleFactor.id, lifestyleFactor.name)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingLifestyleFactor && (
        <EditLifestyleFactorModal
          lifestyleFactor={editingLifestyleFactor}
          isOpen={!!editingLifestyleFactor}
          onClose={() => setEditingLifestyleFactor(null)}
          onSave={handleEditLifestyleFactor}
        />
      )}
    </div>
  )
}

