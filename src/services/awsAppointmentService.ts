import type {
  AppointmentInstance,
  CreateAppointmentInstanceRequest,
  CreateAppointmentInstanceResponse,
  GetAppointmentInstanceResponse,
  UpdateCustomerBookingRequest,
  UpdateCustomerBookingResponse,
  TimeSlot,
  FSMUserResponse
} from '../types/appointment'

// AWS API Configuration
const AWS_API_BASE_URL = import.meta.env.VITE_AWS_API_BASE_URL || 'https://your-api-gateway-url.amazonaws.com/prod'

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
        available: true
      })
    }
  }
  
  return slots
}

// AWS API calls
const makeApiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${AWS_API_BASE_URL}${endpoint}`
  const tenantId = getTenantId()
  
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
        instances: response.data.instances,
        totalCreated: response.data.totalCreated
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
    try {
      console.log('Getting all appointment instances for tenant via AWS API...')
      
      const response = await makeApiCall(`/appointments?tenantId=${getTenantId()}`, {
        method: 'GET'
      })

      if (!response.success) {
        throw new Error('Failed to get appointment instances')
      }

      return response.data || []
    } catch (error) {
      console.error('Error getting appointment instances:', error)
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
        success: true,
        message: response.data.message
      }
    } catch (error) {
      console.error('Error updating customer booking:', error)
      throw error
    }
  }
}
