import LifestyleFactorCalendar from '../components/LifestyleFactorCalendar'

export default function Calendar() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Calendar View</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your lifestyle factors across time</p>
        </div>
      </div>
      
      <LifestyleFactorCalendar />
    </div>
  )
}

