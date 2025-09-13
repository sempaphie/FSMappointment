import { getApiClient } from './api'
import type { FSMAppointment, FSMResponse } from '../types'
import { getApiConfig } from '../constants'
import { tenantService, type TenantData } from './tenantService'
import { shellSdkService } from './shellSdkService'

// Helper function to get tenant-specific API client
const getTenantApiClient = async () => {
  const fsmContext = shellSdkService.getContext()
  let tenant: TenantData | null = null
  
  if (fsmContext) {
    try {
      const tenantResult = await tenantService.validateTenant()
      if (tenantResult.isValid && tenantResult.tenant) {
        tenant = tenantResult.tenant
      }
    } catch (error) {
      console.warn('Failed to get tenant data for FSM API:', error)
    }
  }

  // Get tenant-specific configuration
  const apiConfig = getApiConfig(tenant)
  
  // Create API client with tenant-specific configuration
  return getApiClient(apiConfig)
}

// FSM API Methods
export const fsmService = {
  // Get all appointments
  getAppointments: async (params?: {
    page?: number
    limit?: number
    status?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<FSMResponse<FSMAppointment[]>> => {
    const client = await getTenantApiClient()
    const response = await client.get('/appointments', { params })
    return response.data
  },

  // Get appointment by ID
  getAppointment: async (id: string): Promise<FSMResponse<FSMAppointment>> => {
    const client = await getTenantApiClient()
    const response = await client.get(`/appointments/${id}`)
    return response.data
  },

  // Create new appointment
  createAppointment: async (appointment: Partial<FSMAppointment>): Promise<FSMResponse<FSMAppointment>> => {
    const client = await getTenantApiClient()
    const response = await client.post('/appointments', appointment)
    return response.data
  },

  // Update appointment
  updateAppointment: async (id: string, appointment: Partial<FSMAppointment>): Promise<FSMResponse<FSMAppointment>> => {
    const client = await getTenantApiClient()
    const response = await client.put(`/appointments/${id}`, appointment)
    return response.data
  },

  // Delete appointment
  deleteAppointment: async (id: string): Promise<FSMResponse<void>> => {
    const client = await getTenantApiClient()
    const response = await client.delete(`/appointments/${id}`)
    return response.data
  },

  // Get technicians
  getTechnicians: async (): Promise<FSMResponse<any[]>> => {
    const client = await getTenantApiClient()
    const response = await client.get('/technicians')
    return response.data
  },

  // Get customers
  getCustomers: async (): Promise<FSMResponse<any[]>> => {
    const client = await getTenantApiClient()
    const response = await client.get('/customers')
    return response.data
  },
}
