import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { API_CONFIG, FSM_HEADERS } from '../constants'
import type { FSMContext } from './shellSdkService'

// Create axios instance with configuration
const createApiClient = (baseURL?: string, headers?: Record<string, string>): AxiosInstance => {
  const client = axios.create({
    baseURL: baseURL || API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || FSM_HEADERS),
    },
  })

  // Request interceptor for logging and error handling
  client.interceptors.request.use(
    (config) => {
      console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
      return config
    },
    (error) => {
      console.error('Request error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      return response
    },
    (error) => {
      console.error('Response error:', error.response?.data || error.message)
      return Promise.reject(error)
    }
  )

  return client
}

// Export a function to get API client with configuration
export const getApiClient = (fsmContext?: FSMContext | null, apiConfig?: { baseURL: string; headers: Record<string, string> }): AxiosInstance => {
  if (apiConfig) {
    return createApiClient(apiConfig.baseURL, apiConfig.headers)
  }
  return createApiClient()
}

// Legacy export for backward compatibility (will use default values)
export const apiClient = createApiClient()