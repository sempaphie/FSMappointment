// FSM API Types
export interface FSMAppointment {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  customer: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  location: {
    address: string
    city: string
    state: string
    zipCode: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  technician?: {
    id: string
    name: string
    email: string
  }
  serviceType: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface FSMResponse<T> {
  data: T
  success: boolean
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
