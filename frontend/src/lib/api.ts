import axios from 'axios'

// Type for runtime config injected via config.js
declare global {
  interface Window {
    ENV?: {
      BACKEND_PORT?: string
      API_URL?: string
    }
  }
}

// Automatically detect API URL based on current location and runtime config
const getApiBaseUrl = () => {
  // Priority 1: Runtime config API_URL (from docker-entrypoint.sh via .env)
  if (window.ENV?.API_URL) {
    return window.ENV.API_URL
  }
  
  // Priority 2: Build-time environment variable (for custom builds)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Priority 3: Runtime config backend port (from .env)
  const { protocol, hostname, port } = window.location
  
  if (window.ENV?.BACKEND_PORT) {
    // Use the backend port from runtime config
    return `${protocol}//${hostname}:${window.ENV.BACKEND_PORT}`
  }
  
  // Priority 4: Localhost with standard development port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000'
  }
  
  // Priority 5: Auto-detect backend port from frontend port
  // This is useful when runtime config isn't available (non-Docker deployments)
  let backendPort = '8000'
  
  if (port) {
    // Common port mappings
    const portMap: Record<string, string> = {
      '9797': '9898',
      '3000': '8000',
      '80': '8000',
      '443': '8000',
    }
    backendPort = portMap[port] || '8000'
  }
  
  return `${protocol}//${hostname}:${backendPort}`
}

const API_BASE_URL = getApiBaseUrl()

// Log the detected API URL for debugging
console.log('API Base URL:', API_BASE_URL)
if (window.ENV) {
  console.log('Runtime config:', window.ENV)
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to ensure trailing slashes for GET requests
// This fixes 307 redirect issues with FastAPI
api.interceptors.request.use((config) => {
  if (config.method === 'get' && config.url && !config.url.includes('?')) {
    // Add trailing slash if not present and no query params
    if (!config.url.endsWith('/')) {
      config.url = config.url + '/'
    }
  }
  return config
})

// Types
export interface Habit {
  id: number
  name: string
  description?: string
  color: string
  icon?: string
  category: string
  created_at: string
  is_active: boolean
}

export interface HabitEntry {
  id: number
  habit_id: number
  date: string
  completed: boolean
  notes?: string
  created_at: string
}

export interface MoodEntry {
  id: number
  date: string
  time: string
  // Mood scores (1-5 scale, higher is better)
  mood_score: number
  energy_level?: number
  // Stress & Cognitive (0-3 scale, lower is better for negative ones)
  stress_level?: number
  anxiety_level?: number
  rumination_level?: number
  anger_level?: number
  // Physical symptoms
  general_health?: number  // 0-5 scale (higher is better)
  sleep_quality?: number  // 0-3 scale (higher is better)
  sweating_level?: number  // 0-3 scale (lower is better)
  libido_level?: number  // 0-3 scale (higher is better)
  notes?: string
  tags?: string
  created_at: string
}

export interface CorrelationResult {
  habit_name: string
  habit_id: number
  correlation: number
  p_value: number
  significant: boolean
  sample_size: number
}

export interface HabitStats {
  habit_id: number
  habit_name: string
  total_days: number
  completed_days: number
  completion_rate: number
  current_streak: number
  longest_streak: number
}

// Habit API
export const habitsApi = {
  getAll: (includeInactive?: boolean) => api.get<Habit[]>('/api/habits', {
    params: { include_inactive: includeInactive }
  }),
  getOne: (id: number) => api.get<Habit>(`/api/habits/${id}`),
  create: (data: Partial<Habit>) => api.post<Habit>('/api/habits', data),
  update: (id: number, data: Partial<Habit>) => api.put<Habit>(`/api/habits/${id}`, data),
  delete: (id: number) => api.delete(`/api/habits/${id}`),
  archive: (id: number) => api.post<Habit>(`/api/habits/${id}/archive`),
  unarchive: (id: number) => api.post<Habit>(`/api/habits/${id}/unarchive`),
  getStats: (id: number) => api.get<HabitStats>(`/api/habits/${id}/stats`),
  getCategories: () => api.get<{ categories: string[] }>('/api/habits/categories/list'),
}

// Habit Entries API
export const habitEntriesApi = {
  create: (data: Partial<HabitEntry>) => api.post<HabitEntry>('/api/habits/entries', data),
  getRange: (startDate: string, endDate: string, habitId?: number) => 
    api.get<HabitEntry[]>('/api/habits/entries/range', {
      params: { start_date: startDate, end_date: endDate, habit_id: habitId }
    }),
  getByDate: (date: string) => api.get<HabitEntry[]>(`/api/habits/entries/date/${date}`),
}

// Mood API
export const moodApi = {
  create: (data: Partial<MoodEntry>) => api.post<MoodEntry>('/api/mood', data),
  getAll: (startDate?: string, endDate?: string, limit?: number) => 
    api.get<MoodEntry[]>('/api/mood', {
      params: { start_date: startDate, end_date: endDate, limit }
    }),
  getOne: (id: number) => api.get<MoodEntry>(`/api/mood/${id}`),
  getByDate: (date: string) => api.get<MoodEntry[]>(`/api/mood/date/${date}`),
  update: (id: number, data: Partial<MoodEntry>) => api.put<MoodEntry>(`/api/mood/${id}`, data),
  delete: (id: number) => api.delete(`/api/mood/${id}`),
  getStats: (startDate?: string, endDate?: string) => 
    api.get('/api/mood/stats/summary', {
      params: { start_date: startDate, end_date: endDate }
    }),
}

// Analytics API
export const analyticsApi = {
  getCorrelations: (startDate?: string, endDate?: string, minSamples?: number) => 
    api.get<CorrelationResult[]>('/api/analytics/correlations', {
      params: { start_date: startDate, end_date: endDate, min_samples: minSamples }
    }),
  getHabitCorrelation: (habitId: number, startDate?: string, endDate?: string) => 
    api.get(`/api/analytics/correlations/${habitId}`, {
      params: { start_date: startDate, end_date: endDate }
    }),
  getMoodTrends: (startDate?: string, endDate?: string) => 
    api.get('/api/analytics/trends/mood', {
      params: { start_date: startDate, end_date: endDate }
    }),
  getHabitHeatmap: (habitId: number, year?: number) => 
    api.get(`/api/analytics/heatmap/${habitId}`, {
      params: { year }
    }),
}

