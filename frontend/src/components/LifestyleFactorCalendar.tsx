import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Filter, X, ListChecks } from 'lucide-react'
import { lifestyleFactorsApi, lifestyleFactorEntriesApi, LifestyleFactor, LifestyleFactorEntry } from '../lib/api'
import { formatDate } from '../lib/utils'
import toast from 'react-hot-toast'

interface DayData {
  date: Date
  entries: LifestyleFactorEntry[]
  isCurrentMonth: boolean
  isToday: boolean
}

interface DayModalData {
  date: Date
  entries: LifestyleFactorEntry[]
}

export default function LifestyleFactorCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lifestyleFactors, setLifestyleFactors] = useState<LifestyleFactor[]>([])
  const [entries, setEntries] = useState<LifestyleFactorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [categories, setCategories] = useState<string[]>([])
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DayModalData | null>(null)
  const [selectedFactorIds, setSelectedFactorIds] = useState<Set<number>>(new Set())
  const [showFactorSelector, setShowFactorSelector] = useState(false)

  // Calculate calendar days for the current month
  const getCalendarDays = (): DayData[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Start from the last Monday before or on the first day
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7))
    
    // End on the Sunday after or on the last day
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (7 - endDate.getDay()) % 7)
    
    const days: DayData[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d)
      const dayEntries = entries.filter(e => e.date === dateStr)
      
      days.push({
        date: new Date(d),
        entries: dayEntries,
        isCurrentMonth: d.getMonth() === month,
        isToday: d.getTime() === today.getTime()
      })
    }
    
    return days
  }

  useEffect(() => {
    loadData()
    loadCategories()
  }, [currentDate])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get date range for current month
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const startDate = new Date(year, month, 1)
      startDate.setDate(startDate.getDate() - 7) // Include previous week
      const endDate = new Date(year, month + 1, 0)
      endDate.setDate(endDate.getDate() + 7) // Include next week
      
      const [factorsRes, entriesRes] = await Promise.all([
        lifestyleFactorsApi.getAll(),
        lifestyleFactorEntriesApi.getRange(
          formatDate(startDate),
          formatDate(endDate)
        )
      ])
      
      const activeFactors = factorsRes.data.filter(f => f.is_active)
      setLifestyleFactors(activeFactors)
      setEntries(entriesRes.data)
      
      // Initialize with all factors selected
      if (selectedFactorIds.size === 0) {
        setSelectedFactorIds(new Set(activeFactors.map(f => f.id)))
      }
    } catch (error) {
      console.error('Error loading calendar data:', error)
      toast.error('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await lifestyleFactorsApi.getCategories()
      setCategories(['All', ...response.data.categories])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleToggleFactor = async (lifestyleFactorId: number, date: Date, completed: boolean) => {
    try {
      const dateStr = formatDate(date)
      const response = await lifestyleFactorEntriesApi.create({
        lifestyle_factor_id: lifestyleFactorId,
        date: dateStr,
        completed
      })
      
      // Update local state
      const existingIndex = entries.findIndex(
        e => e.lifestyle_factor_id === lifestyleFactorId && e.date === dateStr
      )
      
      if (existingIndex >= 0) {
        const newEntries = [...entries]
        newEntries[existingIndex] = response.data
        setEntries(newEntries)
      } else {
        setEntries([...entries, response.data])
      }
      
      // Update selected day modal if open
      if (selectedDay && formatDate(selectedDay.date) === dateStr) {
        const updatedEntries = selectedDay.entries.filter(
          e => e.lifestyle_factor_id !== lifestyleFactorId
        )
        updatedEntries.push(response.data)
        setSelectedDay({ ...selectedDay, entries: updatedEntries })
      }
      
      toast.success(completed ? 'Marked complete! 🎉' : 'Unchecked')
    } catch (error) {
      console.error('Error toggling factor:', error)
      toast.error('Failed to update')
    }
  }

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const filteredFactors = lifestyleFactors
    .filter(f => selectedCategory === 'All' || f.category === selectedCategory)
    .filter(f => selectedFactorIds.has(f.id))
  
  const toggleFactorSelection = (factorId: number) => {
    const newSelected = new Set(selectedFactorIds)
    if (newSelected.has(factorId)) {
      newSelected.delete(factorId)
    } else {
      newSelected.add(factorId)
    }
    setSelectedFactorIds(newSelected)
  }
  
  const selectAllFactors = () => {
    setSelectedFactorIds(new Set(lifestyleFactors.map(f => f.id)))
  }
  
  const clearAllFactors = () => {
    setSelectedFactorIds(new Set())
  }
  
  const categoryFilteredFactors = selectedCategory === 'All'
    ? lifestyleFactors
    : lifestyleFactors.filter(f => f.category === selectedCategory)

  const calendarDays = getCalendarDays()

  const getCompletionRate = (dayData: DayData): number => {
    if (filteredFactors.length === 0) return 0
    const completed = dayData.entries.filter(e => {
      const factor = filteredFactors.find(f => f.id === e.lifestyle_factor_id)
      return factor && e.completed
    }).length
    return (completed / filteredFactors.length) * 100
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-gray-900"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800 min-w-[200px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-gray-900"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Today
            </button>
            <button
              onClick={() => {
                setShowFactorSelector(!showFactorSelector)
                setShowCategoryFilter(false)
              }}
              className={`p-2 rounded-lg ${
                selectedFactorIds.size < lifestyleFactors.length
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Select Factors"
            >
              <ListChecks size={20} />
            </button>
            <button
              onClick={() => {
                setShowCategoryFilter(!showCategoryFilter)
                setShowFactorSelector(false)
              }}
              className={`p-2 rounded-lg ${
                selectedCategory !== 'All'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Filter by Category"
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Factor Selector */}
        {showFactorSelector && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Select Factors to Display</span>
              <button
                onClick={() => setShowFactorSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={selectAllFactors}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Select All
              </button>
              <button
                onClick={clearAllFactors}
                className="px-3 py-1.5 text-xs bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Clear All
              </button>
              <span className="text-xs text-gray-600 ml-2">
                {selectedFactorIds.size} of {lifestyleFactors.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {categoryFilteredFactors.map((factor) => (
                <label
                  key={factor.id}
                  className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFactorIds.has(factor.id)}
                    onChange={() => toggleFactorSelection(factor.id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-lg">{factor.icon || '✓'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {factor.name}
                    </div>
                    <div className="text-xs text-gray-500">{factor.category}</div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: factor.color }}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        {showCategoryFilter && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Filter by Category</span>
              <button
                onClick={() => setShowCategoryFilter(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Completion Rate:</span>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-xs text-gray-600">0-33%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span className="text-xs text-gray-600">34-66%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-xs text-gray-600">67-100%</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Tracking {filteredFactors.length} lifestyle factor{filteredFactors.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-md p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 text-sm py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dayData, index) => {
            const completionRate = getCompletionRate(dayData)
            const completedCount = dayData.entries.filter(e => {
              const factor = filteredFactors.find(f => f.id === e.lifestyle_factor_id)
              return factor && e.completed
            }).length

            let bgColor = 'bg-white'
            if (dayData.isCurrentMonth && filteredFactors.length > 0) {
              if (completionRate === 0) {
                bgColor = 'bg-white'
              } else if (completionRate <= 33) {
                bgColor = 'bg-red-100 border-red-300'
              } else if (completionRate <= 66) {
                bgColor = 'bg-yellow-100 border-yellow-300'
              } else {
                bgColor = 'bg-green-100 border-green-300'
              }
            }

            return (
              <button
                key={index}
                onClick={() => {
                  if (dayData.isCurrentMonth) {
                    setSelectedDay({ date: dayData.date, entries: dayData.entries })
                  }
                }}
                className={`
                  relative min-h-[80px] p-2 border rounded-lg transition-all
                  ${bgColor}
                  ${dayData.isCurrentMonth ? 'hover:shadow-md cursor-pointer' : 'opacity-40 cursor-default'}
                  ${dayData.isToday ? 'ring-2 ring-primary-600' : ''}
                `}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  dayData.isToday ? 'text-primary-600' : 'text-gray-700'
                }`}>
                  {dayData.date.getDate()}
                </div>
                
                {dayData.isCurrentMonth && filteredFactors.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {completedCount}/{filteredFactors.length}
                  </div>
                )}
                
                {dayData.isCurrentMonth && completedCount > 0 && (
                  <div className="mt-1">
                    {completionRate === 100 ? '🌟' : completionRate >= 67 ? '🔥' : completionRate >= 34 ? '💪' : '🌱'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedDay.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCategory !== 'All' && (
                  <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full">
                    Category: {selectedCategory}
                  </span>
                )}
                {selectedFactorIds.size < lifestyleFactors.length && (
                  <span className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                    {selectedFactorIds.size} of {lifestyleFactors.length} factors selected
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                {filteredFactors.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No lifestyle factors to display. {selectedCategory !== 'All' ? 'Try changing the filter.' : 'Create some lifestyle factors first.'}
                  </p>
                ) : (
                  filteredFactors.map((factor) => {
                    const entry = selectedDay.entries.find(
                      e => e.lifestyle_factor_id === factor.id && e.date === formatDate(selectedDay.date)
                    )
                    const isCompleted = entry?.completed || false

                    return (
                      <div
                        key={factor.id}
                        className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                        style={{ borderLeft: `4px solid ${factor.color}` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="text-2xl">{factor.icon || '✓'}</span>
                            <div className="flex-1">
                              <h4 className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                {factor.name}
                              </h4>
                              {factor.description && (
                                <p className="text-sm text-gray-600">{factor.description}</p>
                              )}
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                                {factor.category}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleFactor(factor.id, selectedDay.date, !isCompleted)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-primary-500 text-white scale-110'
                                : 'border-2 border-gray-300 hover:border-primary-500'
                            }`}
                          >
                            {isCompleted ? '✓' : '○'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setSelectedDay(null)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

