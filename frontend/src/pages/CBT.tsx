import { useEffect, useState } from 'react'
import { cbtApi, CBTThought } from '../lib/api'
import { formatDate, formatDisplayDate } from '../lib/utils'
import { Brain, Calendar, Plus, Save, X, ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Cognitive Distortions with descriptions and examples
const COGNITIVE_DISTORTIONS = [
  {
    id: 'all-or-nothing',
    name: 'All-or-Nothing Thinking',
    icon: '⚫⚪',
    description: 'Seeing things in black and white categories',
    example: '"If I\'m not perfect, I\'m a total failure"'
  },
  {
    id: 'overgeneralization',
    name: 'Overgeneralization',
    icon: '🔄',
    description: 'Seeing a single negative event as a never-ending pattern',
    example: '"I failed this once, so I always fail"'
  },
  {
    id: 'mental-filter',
    name: 'Mental Filter',
    icon: '🔍',
    description: 'Focusing exclusively on negatives and filtering out positives',
    example: 'Dwelling on one criticism despite many compliments'
  },
  {
    id: 'disqualifying-positive',
    name: 'Disqualifying the Positive',
    icon: '❌',
    description: 'Rejecting positive experiences as "they don\'t count"',
    example: '"That success was just luck"'
  },
  {
    id: 'jumping-to-conclusions',
    name: 'Jumping to Conclusions',
    icon: '🦘',
    description: 'Making negative interpretations without evidence',
    example: 'Mind reading: "They think I\'m stupid"'
  },
  {
    id: 'catastrophizing',
    name: 'Catastrophizing',
    icon: '🌋',
    description: 'Expecting disaster and magnifying problems',
    example: '"This mistake will ruin everything"'
  },
  {
    id: 'emotional-reasoning',
    name: 'Emotional Reasoning',
    icon: '💭',
    description: 'Assuming feelings reflect facts',
    example: '"I feel stupid, therefore I am stupid"'
  },
  {
    id: 'should-statements',
    name: 'Should Statements',
    icon: '👉',
    description: 'Criticizing yourself or others with "should" or "must"',
    example: '"I should be better at this by now"'
  },
  {
    id: 'labeling',
    name: 'Labeling',
    icon: '🏷️',
    description: 'Attaching negative labels to yourself or others',
    example: '"I\'m a loser" instead of "I made a mistake"'
  },
  {
    id: 'personalization',
    name: 'Personalization',
    icon: '👤',
    description: 'Taking responsibility for things outside your control',
    example: '"It\'s my fault they\'re upset"'
  }
]

export default function CBT() {
  const [loading, setLoading] = useState(true)
  const [thoughts, setThoughts] = useState<CBTThought[]>([])
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'byDate'>('list')
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()))
  const [expandedThought, setExpandedThought] = useState<number | null>(null)
  const [editingThought, setEditingThought] = useState<number | null>(null)
  
  // Form states
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [formData, setFormData] = useState({
    negative_thought: '',
    distortions: [] as string[],
    alternative_thought: '',
    intensity: 5,
    notes: ''
  })

  useEffect(() => {
    loadThoughts()
  }, [])

  const loadThoughts = async () => {
    try {
      setLoading(true)
      const response = await cbtApi.getAll(undefined, undefined, 50)
      setThoughts(response.data)
    } catch (error) {
      console.error('Error loading CBT thoughts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadThoughtsByDate = async (date: string) => {
    try {
      setLoading(true)
      const response = await cbtApi.getByDate(date)
      setThoughts(response.data)
    } catch (error) {
      console.error('Error loading CBT thoughts by date:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    loadThoughtsByDate(date)
  }

  const resetForm = () => {
    setFormData({
      negative_thought: '',
      distortions: [],
      alternative_thought: '',
      intensity: 5,
      notes: ''
    })
    setCurrentStep(1)
    setShowForm(false)
    setEditingThought(null)
  }

  const handleSubmit = async () => {
    if (!formData.negative_thought.trim()) {
      toast.error('Please enter your negative thought')
      return
    }

    try {
      if (editingThought) {
        const response = await cbtApi.update(editingThought, {
          negative_thought: formData.negative_thought,
          distortions: formData.distortions.join(','),
          alternative_thought: formData.alternative_thought || undefined,
          intensity: formData.intensity,
          notes: formData.notes || undefined
        })
        setThoughts(thoughts.map(t => t.id === editingThought ? response.data : t))
        toast.success('Thought updated successfully')
      } else {
        const response = await cbtApi.create({
          date: formatDate(new Date()),
          negative_thought: formData.negative_thought,
          distortions: formData.distortions.join(','),
          alternative_thought: formData.alternative_thought || undefined,
          intensity: formData.intensity,
          notes: formData.notes || undefined
        })
        setThoughts([response.data, ...thoughts])
        toast.success('Thought saved successfully')
      }
      resetForm()
      if (viewMode === 'byDate') {
        loadThoughtsByDate(selectedDate)
      }
    } catch (error) {
      console.error('Error saving CBT thought:', error)
      toast.error('Failed to save thought')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this thought?')) return
    
    try {
      await cbtApi.delete(id)
      setThoughts(thoughts.filter(t => t.id !== id))
      toast.success('Thought deleted')
    } catch (error) {
      console.error('Error deleting thought:', error)
      toast.error('Failed to delete thought')
    }
  }

  const handleEdit = (thought: CBTThought) => {
    setFormData({
      negative_thought: thought.negative_thought,
      distortions: thought.distortions ? thought.distortions.split(',') : [],
      alternative_thought: thought.alternative_thought || '',
      intensity: thought.intensity || 5,
      notes: thought.notes || ''
    })
    setEditingThought(thought.id)
    setShowForm(true)
    setCurrentStep(1)
  }

  const toggleDistortion = (distortionId: string) => {
    if (formData.distortions.includes(distortionId)) {
      setFormData({
        ...formData,
        distortions: formData.distortions.filter(d => d !== distortionId)
      })
    } else {
      setFormData({
        ...formData,
        distortions: [...formData.distortions, distortionId]
      })
    }
  }

  const getDistortionNames = (distortionIds: string) => {
    if (!distortionIds) return []
    return distortionIds.split(',').map(id => {
      const distortion = COGNITIVE_DISTORTIONS.find(d => d.id === id)
      return distortion ? { name: distortion.name, icon: distortion.icon } : null
    }).filter(Boolean)
  }

  // Group thoughts by date
  const thoughtsByDate = thoughts.reduce((acc, thought) => {
    const date = thought.date
    if (!acc[date]) acc[date] = []
    acc[date].push(thought)
    return acc
  }, {} as Record<string, CBTThought[]>)

  if (loading && thoughts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading thoughts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CBT Thought Analysis</h1>
            <p className="text-sm text-gray-600">Challenge negative thoughts using cognitive behavioral therapy</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={20} />
          New Thought
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingThought ? 'Edit Thought' : 'Analyze Negative Thought'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-8 h-1 rounded ${currentStep >= 1 ? 'bg-purple-600' : 'bg-gray-300'}`} />
                  <div className={`w-8 h-1 rounded ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`} />
                  <div className={`w-8 h-1 rounded ${currentStep >= 3 ? 'bg-purple-600' : 'bg-gray-300'}`} />
                </div>
              </div>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Write Negative Thought */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Write Your Negative Thought</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Write down the negative or distressing thought you're experiencing. Be specific and honest.
                    </p>
                    <textarea
                      value={formData.negative_thought}
                      onChange={(e) => setFormData({ ...formData, negative_thought: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={6}
                      placeholder="Example: I'm terrible at my job and everyone thinks I'm incompetent..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thought Intensity (1-10)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.intensity}
                        onChange={(e) => setFormData({ ...formData, intensity: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-purple-600 w-12 text-center">{formData.intensity}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={!formData.negative_thought.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Next: Identify Distortions
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Identify Cognitive Distortions */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Identify Cognitive Distortions</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select any thinking patterns that might be present in your negative thought.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {COGNITIVE_DISTORTIONS.map((distortion) => (
                      <button
                        key={distortion.id}
                        onClick={() => toggleDistortion(distortion.id)}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                          formData.distortions.includes(distortion.id)
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{distortion.icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">{distortion.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{distortion.description}</p>
                            <p className="text-xs text-gray-500 italic mt-1">{distortion.example}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Next: Reframe Thought
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Alternative Thought */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Write an Alternative Thought</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Reframe your negative thought with a more balanced, realistic perspective. Consider evidence for and against your original thought.
                    </p>
                    <textarea
                      value={formData.alternative_thought}
                      onChange={(e) => setFormData({ ...formData, alternative_thought: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={6}
                      placeholder="Example: While I made a mistake, I've also had many successes at work. One error doesn't define my overall competence..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Any additional context, triggers, or reflections..."
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Save size={18} />
                      {editingThought ? 'Update Thought' : 'Save Thought'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewMode('list')
                loadThoughts()
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Thoughts
            </button>
            <button
              onClick={() => setViewMode('byDate')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'byDate'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              By Date
            </button>
          </div>

          {viewMode === 'byDate' && (
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Thoughts List */}
      {thoughts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No thoughts yet</h3>
          <p className="text-gray-600 mb-4">
            Start analyzing your negative thoughts to gain better control over your mental patterns.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={20} />
            Add Your First Thought
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === 'list' ? (
            // List view
            thoughts.map((thought) => (
              <div
                key={thought.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-500">
                          {formatDisplayDate(thought.date)} at {new Date(thought.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {thought.intensity && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            Intensity: {thought.intensity}/10
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 font-medium mb-2">{thought.negative_thought}</p>
                      
                      {thought.distortions && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {getDistortionNames(thought.distortions).map((d: any, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                              <span>{d.icon}</span>
                              <span>{d.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {expandedThought === thought.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          {thought.alternative_thought && (
                            <div>
                              <h4 className="text-sm font-semibold text-green-700 mb-1">Alternative Thought:</h4>
                              <p className="text-gray-700 text-sm">{thought.alternative_thought}</p>
                            </div>
                          )}
                          {thought.notes && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes:</h4>
                              <p className="text-gray-600 text-sm">{thought.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleEdit(thought)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(thought.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => setExpandedThought(expandedThought === thought.id ? null : thought.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedThought === thought.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // By date view
            <div className="space-y-6">
              {Object.entries(thoughtsByDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, dateThoughts]) => (
                  <div key={date} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar size={20} />
                      {formatDisplayDate(date)}
                      <span className="text-sm text-gray-500 font-normal">({dateThoughts.length} thought{dateThoughts.length !== 1 ? 's' : ''})</span>
                    </h3>
                    {dateThoughts.map((thought) => (
                      <div
                        key={thought.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 ml-8"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-gray-500">
                                {new Date(thought.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              {thought.intensity && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                  Intensity: {thought.intensity}/10
                                </span>
                              )}
                            </div>
                            <p className="text-gray-900 font-medium mb-2">{thought.negative_thought}</p>
                            
                            {thought.distortions && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {getDistortionNames(thought.distortions).map((d: any, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                    <span>{d.icon}</span>
                                    <span>{d.name}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {expandedThought === thought.id && (
                              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                {thought.alternative_thought && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-green-700 mb-1">Alternative Thought:</h4>
                                    <p className="text-gray-700 text-sm">{thought.alternative_thought}</p>
                                  </div>
                                )}
                                {thought.notes && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes:</h4>
                                    <p className="text-gray-600 text-sm">{thought.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => handleEdit(thought)}
                              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(thought.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button
                              onClick={() => setExpandedThought(expandedThought === thought.id ? null : thought.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {expandedThought === thought.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

