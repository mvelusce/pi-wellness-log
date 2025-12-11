import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { lifestyleFactorsApi, LifestyleFactorStats, LifestyleFactor } from '../lib/api'
import { Plus, Archive, ArchiveRestore } from 'lucide-react'
import toast from 'react-hot-toast'
import EditLifestyleFactorModal from '../components/EditLifestyleFactorModal'

export default function LifestyleFactors() {
  const { lifestyleFactors, setLifestyleFactors, addLifestyleFactor, removeLifestyleFactor } = useStore()
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [lifestyleFactorStats, setLifestyleFactorStats] = useState<Record<number, LifestyleFactorStats>>({})
  const [editingLifestyleFactor, setEditingLifestyleFactor] = useState<LifestyleFactor | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [categories, setCategories] = useState<string[]>([])
  const [newLifestyleFactor, setNewLifestyleFactor] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '✓',
    category: 'General',
  })

  useEffect(() => {
    loadLifestyleFactors()
    loadCategories()
  }, [showArchived])

  const loadLifestyleFactors = async () => {
    try {
      setLoading(true)
      const response = await lifestyleFactorsApi.getAll(showArchived)
      const allLifestyleFactors = response.data
      
      // When showArchived is true, the API returns all lifestyleFactors, so we need to filter for inactive ones
      // When showArchived is false, the API already filters for active only
      const filtered = showArchived ? allLifestyleFactors.filter(h => !h.is_active) : allLifestyleFactors
      setLifestyleFactors(filtered)
      
      // Load stats for each habit
      const statsPromises = filtered.map(h => lifestyleFactorsApi.getStats(h.id))
      const statsResults = await Promise.all(statsPromises)
      const statsMap: Record<number, LifestyleFactorStats> = {}
      statsResults.forEach(res => {
        statsMap[res.data.lifestyle_factor_id] = res.data
      })
      setLifestyleFactorStats(statsMap)
    } catch (error) {
      console.error('Error loading lifestyleFactors:', error)
      toast.error('Failed to load lifestyleFactors')
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

  const handleCreateLifestyleFactor = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newLifestyleFactor.name.trim()) {
      toast.error('Please enter a habit name')
      return
    }

    try {
      const response = await lifestyleFactorsApi.create(newLifestyleFactor)
      addLifestyleFactor(response.data)
      setNewLifestyleFactor({ name: '', description: '', color: '#3B82F6', icon: '✓', category: 'General' })
      setShowCreateForm(false)
      toast.success('LifestyleFactor created successfully! 🎉')
      loadLifestyleFactors() // Reload to get stats
    } catch (error) {
      console.error('Error creating lifestyleFactor:', error)
      toast.error('Failed to create lifestyle factor')
    }
  }

  const handleEditLifestyleFactor = async (updatedData: Partial<LifestyleFactor>) => {
    if (!editingLifestyleFactor) return
    
    try {
      await lifestyleFactorsApi.update(editingLifestyleFactor.id, updatedData)
      toast.success('LifestyleFactor updated successfully!')
      loadLifestyleFactors()
      setEditingLifestyleFactor(null)
    } catch (error) {
      console.error('Error updating lifestyleFactor:', error)
      toast.error('Failed to update lifestyle factor')
    }
  }

  const handleArchiveLifestyleFactor = async (id: number, name: string) => {
    if (!confirm(`Archive "${name}"? You can restore it later.`)) {
      return
    }

    try {
      await lifestyleFactorsApi.archive(id)
      toast.success('LifestyleFactor archived')
      loadLifestyleFactors()
    } catch (error) {
      console.error('Error archiving lifestyleFactor:', error)
      toast.error('Failed to archive lifestyle factor')
    }
  }

  const handleUnarchiveLifestyleFactor = async (id: number, name: string) => {
    try {
      await lifestyleFactorsApi.unarchive(id)
      toast.success(`"${name}" restored!`)
      loadLifestyleFactors()
    } catch (error) {
      console.error('Error unarchiving lifestyleFactor:', error)
      toast.error('Failed to restore lifestyle factor')
    }
  }

  const handleDeleteLifestyleFactor = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      return
    }

    try {
      await lifestyleFactorsApi.delete(id)
      removeLifestyleFactor(id)
      toast.success('LifestyleFactor deleted')
      loadLifestyleFactors()
    } catch (error) {
      console.error('Error deleting lifestyleFactor:', error)
      toast.error('Failed to delete lifestyle factor')
    }
  }

  const defaultCategories = ['General', 'Health', 'Fitness', 'Nutrition', 'Supplements', 'Lifestyle', 'Wellness']
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Cyan', value: '#06B6D4' },
  ]

  const iconOptions = ['✓', '💪', '🏃', '📚', '🧘', '💧', '🍎', '😴', '🎯', '✨', '🍷', '🍺', '💊', '🥗', '🚿']

  // Filter lifestyleFactors by category
  const filteredHabits = selectedCategory === 'All' 
    ? lifestyleFactors 
    : lifestyleFactors.filter(h => h.category === selectedCategory)
  
  // Group lifestyleFactors by category
  const groupedHabits = filteredHabits.reduce((groups, lifestyleFactor) => {
    const category = lifestyleFactor.category || 'General'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(lifestyleFactor)
    return groups
  }, {} as Record<string, typeof lifestyleFactors>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Manage Lifestyle Factors</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              showArchived 
                ? 'bg-gray-700 dark:bg-gray-600 text-white border-gray-700 dark:border-gray-600' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {showArchived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
            <span>{showArchived ? 'Show Active' : 'Show Archived'}</span>
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center space-x-2 bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
          >
            <Plus size={20} />
            <span>New LifestyleFactor</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateLifestyleFactor} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4 transition-colors">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Create New LifestyleFactor</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              LifestyleFactor Name *
            </label>
            <input
              type="text"
              value={newLifestyleFactor.name}
              onChange={(e) => setNewLifestyleFactor({ ...newLifestyleFactor, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="e.g., Exercise, Read, Meditate"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={newLifestyleFactor.description}
              onChange={(e) => setNewLifestyleFactor({ ...newLifestyleFactor, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            {!isCustomCategory ? (
              <div className="space-y-2">
                <select
                  value={newLifestyleFactor.category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true)
                      setNewLifestyleFactor({ ...newLifestyleFactor, category: '' })
                    } else {
                      setNewLifestyleFactor({ ...newLifestyleFactor, category: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                >
                  {defaultCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="__custom__">+ Create New Category</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newLifestyleFactor.category}
                  onChange={(e) => setNewLifestyleFactor({ ...newLifestyleFactor, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  placeholder="Enter custom category name..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(false)
                    setNewLifestyleFactor({ ...newLifestyleFactor, category: 'General' })
                  }}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  ← Back to preset categories
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex space-x-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewLifestyleFactor({ ...newLifestyleFactor, color: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 ${
                    newLifestyleFactor.color === color.value ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewLifestyleFactor({ ...newLifestyleFactor, icon })}
                  className={`w-12 h-12 text-2xl border-2 rounded-lg ${
                    newLifestyleFactor.icon === icon ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-primary-600 dark:bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
            >
              Create LifestyleFactor
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Habits List */}
      <div className="space-y-6">
        {Object.keys(groupedHabits).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400 transition-colors">
            <p>{showArchived ? 'No archived lifestyleFactors.' : 'No lifestyleFactors yet. Create your first one!'}</p>
          </div>
        ) : (
          Object.entries(groupedHabits).map(([category, categoryHabits]) => (
            <div key={category}>
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-sm">
                  {category}
                </span>
                <span className="ml-2 text-gray-500 dark:text-gray-500 text-sm">({categoryHabits.length})</span>
              </h3>
              
              <div className="space-y-4">
                {categoryHabits.map((lifestyleFactor) => {
                  const stats = lifestyleFactorStats[lifestyleFactor.id]
                  
                  return (
                    <div
                      key={lifestyleFactor.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors"
                      style={{ borderLeft: `4px solid ${lifestyleFactor.color}` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">{lifestyleFactor.icon}</span>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{lifestyleFactor.name}</h3>
                            {lifestyleFactor.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{lifestyleFactor.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingLifestyleFactor(lifestyleFactor)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm px-3 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            Edit
                          </button>
                          {lifestyleFactor.is_active ? (
                            <button
                              onClick={() => handleArchiveLifestyleFactor(lifestyleFactor.id, lifestyleFactor.name)}
                              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm px-3 py-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnarchiveLifestyleFactor(lifestyleFactor.id, lifestyleFactor.name)}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm px-3 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLifestyleFactor(lifestyleFactor.id, lifestyleFactor.name)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t dark:border-gray-700">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                              {stats.completion_rate.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Completion</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {stats.current_streak}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Current Streak</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {stats.longest_streak}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Best Streak</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                              {stats.completed_days}/{stats.total_days}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Days</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
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

