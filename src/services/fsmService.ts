import { apiClient } from './api'
import type { FSMAppointment, FSMResponse } from '../types'

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
    const response = await apiClient.get('/appointments', { params })
    return response.data
  },

  // Get appointment by ID
  getAppointment: async (id: string): Promise<FSMResponse<FSMAppointment>> => {
    const response = await apiClient.get(`/appointments/${id}`)
    return response.data
  },

  // Create new appointment
  createAppointment: async (appointment: Partial<FSMAppointment>): Promise<FSMResponse<FSMAppointment>> => {
    const response = await apiClient.post('/appointments', appointment)
    return response.data
  },

  // Update appointment
  updateAppointment: async (id: string, appointment: Partial<FSMAppointment>): Promise<FSMResponse<FSMAppointment>> => {
    const response = await apiClient.put(`/appointments/${id}`, appointment)
    return response.data
  },

  // Delete appointment
  deleteAppointment: async (id: string): Promise<FSMResponse<void>> => {
    const response = await apiClient.delete(`/appointments/${id}`)
    return response.data
  },

  // Get technicians
  getTechnicians: async (): Promise<FSMResponse<any[]>> => {
    const response = await apiClient.get('/technicians')
    return response.data
  },

  // Get customers
  getCustomers: async (): Promise<FSMResponse<any[]>> => {
    const response = await apiClient.get('/customers')
    return response.data
  },
}
