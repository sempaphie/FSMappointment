// Common types used throughout the application

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'technician' | 'manager'
  avatar?: string
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  coordinates?: {
    latitude: number
    longitude: number
  }
}

export interface Technician {
  id: string
  name: string
  email: string
  phone?: string
  skills: string[]
  availability: {
    startTime: string
    endTime: string
    workingDays: number[]
  }
  currentLocation?: {
    latitude: number
    longitude: number
  }
}

export interface ServiceType {
  id: string
  name: string
  description: string
  estimatedDuration: number // in minutes
  requiredSkills: string[]
  basePrice: number
}

export interface Appointment {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  status: AppointmentStatus
  priority: Priority
  customer: Customer
  technician?: Technician
  serviceType: ServiceType
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
  notes?: string
  attachments?: string[]
  createdAt: Date
  updatedAt: Date
}

export type AppointmentStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface AppointmentFilters extends PaginationParams {
  status?: AppointmentStatus
  priority?: Priority
  technicianId?: string
  customerId?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

// Re-export FSM types
export * from './fsm'

// Re-export appointment types
export * from './appointment'
