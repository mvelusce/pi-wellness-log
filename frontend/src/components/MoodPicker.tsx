import { getMoodEmoji } from '../lib/utils'

interface MoodPickerProps {
  value: number
  onChange: (value: number) => void
  label?: string
  min?: number
  max?: number
  showEmoji?: boolean
  reversed?: boolean  // For metrics where lower is better (e.g., stress)
  minLabel?: string
  maxLabel?: string
}

export default function MoodPicker({ 
  value, 
  onChange, 
  label = "How are you feeling?",
  min = 1,
  max = 5,
  showEmoji = false,
  reversed = false,
  minLabel = reversed ? "None" : "Low",
  maxLabel = reversed ? "Severe" : "High"
}: MoodPickerProps) {
  
  const getGradientColor = () => {
    if (reversed) {
      // For reversed scales (lower is better): green -> yellow -> red
      return "from-green-400 via-yellow-400 to-red-400"
    } else {
      // For normal scales (higher is better): red -> yellow -> green
      return "from-red-400 via-yellow-400 to-green-400"
    }
  }
  
  const getAccentColor = () => {
    const range = max - min
    const position = (value - min) / range
    
    if (reversed) {
      // For reversed scales: green when low, red when high
      return position <= 0.33 ? '#10b981' : position <= 0.66 ? '#fbbf24' : '#ef4444'
    } else {
      // For normal scales: red when low, green when high
      return position >= 0.66 ? '#10b981' : position >= 0.33 ? '#fbbf24' : '#ef4444'
    }
  }
  
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-4">
          {showEmoji && <span className="text-4xl">{getMoodEmoji(value)}</span>}
          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{value}/{max}</span>
        </div>
        
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`w-full h-3 bg-gradient-to-r ${getGradientColor()} rounded-lg appearance-none cursor-pointer`}
          style={{
            accentColor: getAccentColor()
          }}
        />
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  )
}

