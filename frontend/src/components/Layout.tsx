import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, CheckSquare, Heart, BarChart3, LogOut, Calendar, Brain } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { logout } = useAuth()
  
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-primary-600">🌟 Wellness Log</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
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
                      ? 'text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
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

