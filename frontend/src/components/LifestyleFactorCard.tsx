import { useState } from 'react'
import { LifestyleFactor, LifestyleFactorEntry } from '../lib/api'
import { Check, Edit2, Trash2, Archive } from 'lucide-react'

interface LifestyleFactorCardProps {
  lifestyleFactor: LifestyleFactor
  entry?: LifestyleFactorEntry
  onToggle: (completed: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onArchive?: () => void
}

export default function LifestyleFactorCard({ lifestyleFactor, entry, onToggle, onEdit, onDelete, onArchive }: LifestyleFactorCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const isCompleted = entry?.completed || false

  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-all hover:shadow-lg"
      style={{ borderLeft: `4px solid ${lifestyleFactor.color}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <button
            onClick={() => onToggle(!isCompleted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isCompleted
                ? 'bg-primary-500 dark:bg-primary-600 text-white scale-110'
                : 'border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
            }`}
          >
            {isCompleted ? <Check size={24} /> : lifestyleFactor.icon || '✓'}
          </button>
          
          <div className="flex-1">
            <h3 className={`font-semibold text-lg text-gray-800 dark:text-gray-200 ${isCompleted ? 'line-through text-gray-500 dark:text-gray-500' : ''}`}>
              {lifestyleFactor.name}
            </h3>
            {lifestyleFactor.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{lifestyleFactor.description}</p>
            )}
            {lifestyleFactor.category && lifestyleFactor.category !== 'General' && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full">
                {lifestyleFactor.category}
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
          >
            ⋮
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10">
              <button
                onClick={() => {
                  onEdit()
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
              {onArchive && (
                <button
                  onClick={() => {
                    onArchive()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-orange-600 dark:text-orange-400"
                >
                  <Archive size={16} />
                  <span>Archive</span>
                </button>
              )}
              <button
                onClick={() => {
                  onDelete()
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-red-600 dark:text-red-400"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {isCompleted && entry?.notes && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
          💭 {entry.notes}
        </div>
      )}
    </div>
  )
}

