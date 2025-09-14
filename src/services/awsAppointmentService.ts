import type {
  AppointmentInstance,
  CreateAppointmentInstanceRequest,
  CreateAppointmentInstanceResponse,
  GetAppointmentInstanceResponse,
  UpdateCustomerBookingRequest,
  UpdateCustomerBookingResponse,
  TimeSlot
} from '../types/appointment'

// Mock appointment instances for development mode
const getMockAppointmentInstances = (): AppointmentInstance[] => {
  const now = new Date()
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  
  return [
    {
      instanceId: 'mock-instance-1',
      tenantId: 'dev-tenant',
      customerAccessToken: 'dev-token-1',
      customerUrl: 'https://main.d354vm8a3zuelv.amplifyapp.com/booking/dev-token-1',
      status: 'PENDING',
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ttl: Math.floor(validUntil.getTime() / 1000),
      fsmActivity: {
        id: '01E12B09F87F4B458BAE623CBE6855AA',
        activityId: '01E12B09F87F4B458BAE623CBE6855AA',
        subject: 'Tankrevision inkl. Inspektion',
        status: 'OPEN',
        businessPartner: 'O\'Leary\'s Contractors',
        equipment: {
          code: 'EQ-001',
          name: 'Doosan 250/HP185WDZ-T4F',
          address: '1031 N. Cicero Ave., Chicago, US, 60651'
        }
      }
    },
    {
      instanceId: 'mock-instance-2',
      tenantId: 'dev-tenant',
      customerAccessToken: 'dev-token-2',
      customerUrl: 'https://main.d354vm8a3zuelv.amplifyapp.com/booking/dev-token-2',
      status: 'SUBMITTED',
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ttl: Math.floor(validUntil.getTime() / 1000),
      fsmActivity: {
        id: '12D86A8536034AD79AC3448B5F1F58E1',
        activityId: '12D86A8536034AD79AC3448B5F1F58E1',
        subject: 'Leckwarngert. Wartung',
        status: 'OPEN',
        businessPartner: 'Tech Solutions Inc',
        equipment: {
          code: 'EQ-002',
          name: 'Leak Detection System Alpha',
          address: '456 Industrial Blvd, Detroit, US, 48201'
        }
      },
      customerBooking: {
        customerName: 'John Doe',
        customerEmail: 'john.doe@techsolutions.com',
        customerPhone: '+1-555-0123',
        preferredTimeSlots: [],
        requestedDateTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        customerMessage: 'Please schedule for next week if possible',
        status: 'submitted',
        submittedAt: now.toISOString(),
        lastModifiedAt: now.toISOString()
      }
    }
  ]
}

// AWS API Configuration
const AWS_API_BASE_URL = import.meta.env.VITE_TENANT_API_URL || 'https://40be8c42uc.execute-api.eu-north-1.amazonaws.com/dev'

// Get tenant ID from environment
const getTenantId = (): string => {
  const accountId = import.meta.env.VITE_SAP_ACCOUNT_ID || '86810'
  const companyId = import.meta.env.VITE_SAP_COMPANY_ID || '111214'
  return `${accountId}-${companyId}`
}

// Generate available time slots (same as before)
const generateAvailableTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const now = new Date()
  
  // Generate slots for the next 30 days
  for (let day = 1; day <= 30; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() + day)
    
    // Skip weekends for now (you can customize this)
    if (date.getDay() === 0 || date.getDay() === 6) continue
    
    // Generate time slots for each day (9 AM to 5 PM, every 2 hours)
    for (let hour = 9; hour <= 17; hour += 2) {
      const startTime = new Date(date)
      startTime.setHours(hour, 0, 0, 0)
      
      const endTime = new Date(date)
      endTime.setHours(hour + 2, 0, 0, 0)
      
      slots.push({
        id: `slot_${day}_${hour}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isAvailable: true,
        isSelected: false
      })
    }
  }
  
  return slots
}

// AWS API calls
const makeApiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${AWS_API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

export const awsAppointmentService = {
  async createAppointmentInstances(request: CreateAppointmentInstanceRequest): Promise<CreateAppointmentInstanceResponse> {
    try {
      console.log('Creating appointment instances via AWS API...', request)
      
      const response = await makeApiCall(`/appointments?tenantId=${getTenantId()}`, {
        method: 'POST',
        body: JSON.stringify(request)
      })

      if (!response.success) {
        throw new Error('Failed to create appointment instances')
      }

      return {
        success: true,
        instances: response.data.instances
      }
    } catch (error) {
      console.error('Error creating appointment instances:', error)
      throw error
    }
  },

  async getAppointmentInstanceByToken(customerAccessToken: string): Promise<GetAppointmentInstanceResponse> {
    try {
      console.log('Getting appointment instance by token via AWS API...', customerAccessToken)
      
      const response = await makeApiCall(`/appointments/token/${customerAccessToken}?tenantId=${getTenantId()}`, {
        method: 'GET'
      })

      if (!response.success) {
        throw new Error('Failed to get appointment instance')
      }

      return {
        success: true,
        instance: response.data
      }
    } catch (error) {
      console.error('Error getting appointment instance:', error)
      throw error
    }
  },

  async getAllInstancesForTenant(): Promise<AppointmentInstance[]> {
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost')
    
    if (isDevelopment) {
      console.log('Development mode - returning mock appointment instances')
      return getMockAppointmentInstances()
    }

    try {
      console.log('Getting all appointment instances for tenant via AWS API...')
      console.log('Tenant ID:', getTenantId())
      console.log('API URL:', `${AWS_API_BASE_URL}/appointments?tenantId=${getTenantId()}`)
      
      const response = await makeApiCall(`/appointments?tenantId=${getTenantId()}`, {
        method: 'GET'
      })

      console.log('API Response:', response)

      if (!response.success) {
        throw new Error('Failed to get appointment instances')
      }

      console.log('Appointment instances retrieved:', response.data?.length || 0, 'instances')
      return response.data || []
    } catch (error) {
      console.error('Error getting appointment instances:', error)
      // In development mode, return mock data even if there's an error
      if (isDevelopment) {
        console.log('Development mode fallback - returning mock appointment instances')
        return getMockAppointmentInstances()
      }
      // Fallback to empty array if AWS is not available
      console.warn('Falling back to empty array due to AWS API error')
      return []
    }
  },

  generateAvailableTimeSlots,

  async updateCustomerBooking(token: string, bookingData: UpdateCustomerBookingRequest): Promise<UpdateCustomerBookingResponse> {
    try {
      console.log('Updating customer booking via AWS API...', token, bookingData)
      
      const response = await makeApiCall(`/appointments/token/${token}?tenantId=${getTenantId()}`, {
        method: 'PUT',
        body: JSON.stringify(bookingData)
      })

      if (!response.success) {
        throw new Error('Failed to update customer booking')
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Error updating customer booking:', error)
      throw error
    }
  }
}
