import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { API_CONFIG, FSM_HEADERS } from '../constants'

// Create axios instance with default configuration
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...FSM_HEADERS,
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

export const apiClient = createApiClient()