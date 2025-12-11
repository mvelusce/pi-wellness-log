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

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Add trailing slash for GET requests to fix 307 redirect issues with FastAPI
  if (config.method === 'get' && config.url && !config.url.includes('?')) {
    if (!config.url.endsWith('/')) {
      config.url = config.url + '/'
    }
  }
  
  return config
})

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Types
export interface LifestyleFactor {
  id: number
  name: string
  description?: string
  color: string
  icon?: string
  category: string
  created_at: string
  is_active: boolean
}

export interface LifestyleFactorEntry {
  id: number
  lifestyle_factor_id: number
  date: string
  completed: boolean
  notes?: string
  created_at: string
}

export interface WellbeingMetricEntry {
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
  lifestyle_factor_name: string
  lifestyle_factor_id: number
  metric_name: string  // e.g., "mood_score", "energy_level", etc.
  correlation: number
  p_value: number
  significant: boolean
  sample_size: number
}

export interface MetricCorrelationSummary {
  metric_name: string
  metric_display_name: string
  correlations: CorrelationResult[]
}

export interface MultiMetricCorrelationResult {
  by_metric: MetricCorrelationSummary[]
  by_lifestyle_factor: { [key: number]: CorrelationResult[] }
}

export interface LifestyleFactorStats {
  lifestyle_factor_id: number
  lifestyle_factor_name: string
  total_days: number
  completed_days: number
  completion_rate: number
  current_streak: number
  longest_streak: number
}

// Lifestyle Factor API
export const lifestyleFactorsApi = {
  getAll: (includeInactive?: boolean) => api.get<LifestyleFactor[]>('/api/lifestyle-factors', {
    params: { include_inactive: includeInactive }
  }),
  getOne: (id: number) => api.get<LifestyleFactor>(`/api/lifestyle-factors/${id}`),
  create: (data: Partial<LifestyleFactor>) => api.post<LifestyleFactor>('/api/lifestyle-factors', data),
  update: (id: number, data: Partial<LifestyleFactor>) => api.put<LifestyleFactor>(`/api/lifestyle-factors/${id}`, data),
  delete: (id: number) => api.delete(`/api/lifestyle-factors/${id}`),
  archive: (id: number) => api.post<LifestyleFactor>(`/api/lifestyle-factors/${id}/archive`),
  unarchive: (id: number) => api.post<LifestyleFactor>(`/api/lifestyle-factors/${id}/unarchive`),
  getStats: (id: number) => api.get<LifestyleFactorStats>(`/api/lifestyle-factors/${id}/stats`),
  getCategories: () => api.get<{ categories: string[] }>('/api/lifestyle-factors/categories/list'),
}

// Lifestyle Factor Entries API
export const lifestyleFactorEntriesApi = {
  create: (data: Partial<LifestyleFactorEntry>) => api.post<LifestyleFactorEntry>('/api/lifestyle-factors/entries', data),
  getRange: (startDate: string, endDate: string, lifestyleFactorId?: number) => 
    api.get<LifestyleFactorEntry[]>('/api/lifestyle-factors/entries/range', {
      params: { start_date: startDate, end_date: endDate, lifestyle_factor_id: lifestyleFactorId }
    }),
  getByDate: (date: string) => api.get<LifestyleFactorEntry[]>(`/api/lifestyle-factors/entries/date/${date}`),
}

// Well-Being Metrics API
export const wellbeingApi = {
  create: (data: Partial<WellbeingMetricEntry>) => api.post<WellbeingMetricEntry>('/api/wellbeing', data),
  getAll: (startDate?: string, endDate?: string, limit?: number) => 
    api.get<WellbeingMetricEntry[]>('/api/wellbeing', {
      params: { start_date: startDate, end_date: endDate, limit }
    }),
  getOne: (id: number) => api.get<WellbeingMetricEntry>(`/api/wellbeing/${id}`),
  getByDate: (date: string) => api.get<WellbeingMetricEntry[]>(`/api/wellbeing/date/${date}`),
  update: (id: number, data: Partial<WellbeingMetricEntry>) => api.put<WellbeingMetricEntry>(`/api/wellbeing/${id}`, data),
  delete: (id: number) => api.delete(`/api/wellbeing/${id}`),
  getStats: (startDate?: string, endDate?: string) => 
    api.get('/api/wellbeing/stats/summary', {
      params: { start_date: startDate, end_date: endDate }
    }),
}

// Analytics API
export const analyticsApi = {
  getCorrelations: (startDate?: string, endDate?: string, minSamples?: number) => 
    api.get<CorrelationResult[]>('/api/analytics/correlations', {
      params: { start_date: startDate, end_date: endDate, min_samples: minSamples }
    }),
  getMultiMetricCorrelations: (startDate?: string, endDate?: string, minSamples?: number, metric?: string) => 
    api.get<MultiMetricCorrelationResult>('/api/analytics/correlations/multi-metric', {
      params: { start_date: startDate, end_date: endDate, min_samples: minSamples, metric }
    }),
  getLifestyleFactorCorrelation: (lifestyleFactorId: number, startDate?: string, endDate?: string, metric?: string) => 
    api.get(`/api/analytics/correlations/${lifestyleFactorId}`, {
      params: { start_date: startDate, end_date: endDate, metric }
    }),
  getMoodTrends: (startDate?: string, endDate?: string) => 
    api.get('/api/analytics/trends/wellbeing', {
      params: { start_date: startDate, end_date: endDate }
    }),
  getWellbeingTrends: (startDate?: string, endDate?: string) => 
    api.get('/api/analytics/trends/wellbeing', {
      params: { start_date: startDate, end_date: endDate }
    }),
  getLifestyleFactorHeatmap: (lifestyleFactorId: number, year?: number) => 
    api.get(`/api/analytics/heatmap/${lifestyleFactorId}`, {
      params: { year }
    }),
}

