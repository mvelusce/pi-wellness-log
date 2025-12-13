import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, CheckSquare, Heart, BarChart3, LogOut, Calendar, Brain, Moon, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: Home },
    { path: '/lifestyleFactors', label: 'Lifestyle Factors', shortLabel: 'Habits', icon: CheckSquare },
    { path: '/calendar', label: 'Calendar', shortLabel: 'Calendar', icon: Calendar },
    { path: '/wellbeing', label: 'Well-Being Metrics', shortLabel: 'Health', icon: Heart },
    { path: '/cbt', label: 'CBT Thoughts', shortLabel: 'CBT', icon: Brain },
    { path: '/analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3 },
  ]

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout()
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">📙 Wellness Log</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg transition-colors">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon size={24} />
                  <span className="text-xs mt-1 hidden sm:inline">{item.label}</span>
                  <span className="text-xs mt-1 sm:hidden">{item.shortLabel}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}

