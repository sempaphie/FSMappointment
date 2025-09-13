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

// This service provides a cloud-ready interface that can be easily switched
// between localStorage (development) and real cloud storage (production)

// Generate unique tokens and IDs
const generateUniqueToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const generateInstanceId = (): string => {
  return `inst_${Date.now()}_${Math.random().toString(36).substring(2)}`
}

// Get tenant ID from environment
const getTenantId = (): string => {
  const accountId = import.meta.env.VITE_SAP_ACCOUNT_ID || '86810'
  const companyId = import.meta.env.VITE_SAP_COMPANY_ID || '111214'
  return `${accountId}-${companyId}`
}

// Calculate TTL for DynamoDB (30 days from now)
const calculateTTL = (): number => {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  return Math.floor(thirtyDaysFromNow.getTime() / 1000) // Unix timestamp
}

// Generate customer URL
const generateCustomerUrl = (token: string): string => {
  const baseUrl = window.location.origin
  return `${baseUrl}/booking/${token}`
}

// Enhanced localStorage operations with cloud-ready structure
const saveToCloudStorage = async (instances: AppointmentInstance[]): Promise<void> => {
  const tenantId = getTenantId()
  const storageKey = `appointment_instances_${tenantId}`
  const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}')
  
  instances.forEach(instance => {
    existingData[instance.instanceId] = instance
  })
  
  localStorage.setItem(storageKey, JSON.stringify(existingData))
  
  // TODO: In production, also sync to cloud storage
  // await syncToCloudStorage()
}

const loadFromCloudStorage = async (instanceId?: string): Promise<AppointmentInstance | AppointmentInstance[] | null> => {
  const tenantId = getTenantId()
  const storageKey = `appointment_instances_${tenantId}`
  const data = JSON.parse(localStorage.getItem(storageKey) || '{}')
  
  if (instanceId) {
    return data[instanceId] || null
  }
  
  // Return all instances for tenant
  const instances = Object.values(data) as AppointmentInstance[]
  
  // Filter out expired instances
  const now = new Date()
  const validInstances = instances.filter(instance => 
    new Date(instance.validUntil) > now
  )
  
  // TODO: In production, also load from cloud storage
  // const cloudInstances = await loadFromCloudStorageCloud()
  // return mergeInstances(validInstances, cloudInstances)
  
  return validInstances
}

// Future cloud storage functions (ready for implementation)
// const syncToCloudStorage = async (): Promise<void> => {
//   // This will be implemented when Amplify backend is ready
//   console.log('Cloud sync not yet implemented, using localStorage')
// }

// const loadFromCloudStorageCloud = async (): Promise<AppointmentInstance[]> => {
//   // This will be implemented when Amplify backend is ready
//   console.log('Cloud load not yet implemented, using localStorage')
//   return []
// }

// const mergeInstances = (local: AppointmentInstance[], cloud: AppointmentInstance[]): AppointmentInstance[] => {
//   // Merge and deduplicate instances from local and cloud storage
//   const merged = new Map<string, AppointmentInstance>()
//   
//   local.forEach(instance => merged.set(instance.instanceId, instance))
//   cloud.forEach(instance => {
//     const existing = merged.get(instance.instanceId)
//     if (!existing || new Date(instance.updatedAt) > new Date(existing.updatedAt)) {
//       merged.set(instance.instanceId, instance)
//     }
//   })
//   
//   return Array.from(merged.values())
// }

export const cloudAppointmentService = {
  async createAppointmentInstances(
    request: CreateAppointmentInstanceRequest
  ): Promise<CreateAppointmentInstanceResponse> {
    try {
      const tenantId = getTenantId()
      const instances: AppointmentInstance[] = []
      const customerUrls: string[] = []
      
      // Create one instance per activity
      for (const activity of request.activities) {
        const customerAccessToken = generateUniqueToken()
        const instanceId = generateInstanceId()
        const customerUrl = generateCustomerUrl(customerAccessToken)
        const now = new Date().toISOString()
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        
        const instance: AppointmentInstance = {
          tenantId,
          instanceId,
          customerAccessToken,
          customerUrl,
          validFrom: now,
          validUntil,
          ttl: calculateTTL(),
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          fsmActivity: {
            activityId: activity.id,
            activityCode: activity.code,
            subject: activity.subject,
            status: activity.status,
            businessPartner: activity.businessPartner,
            object: activity.object,
            serviceCallId: activity.object?.objectId,
            serviceCallNumber: activity.object?.objectId?.slice(-7) // Last 7 chars as service call number
          }
        }
        
        instances.push(instance)
        customerUrls.push(customerUrl)
      }
      
      // Save to cloud storage (currently localStorage, ready for real cloud)
      await saveToCloudStorage(instances)
      
      console.log('Created appointment instances:', instances)
      
      return {
        success: true,
        instances,
        customerUrls
      }
      
    } catch (error) {
      console.error('Error creating appointment instances:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  async getAppointmentInstanceByToken(
    customerAccessToken: string
  ): Promise<GetAppointmentInstanceResponse> {
    try {
      const instances = await loadFromCloudStorage() as AppointmentInstance[]
      
      if (!instances || !Array.isArray(instances)) {
        return {
          success: false,
          error: 'No instances found'
        }
      }
      
      const instance = instances.find(inst => inst.customerAccessToken === customerAccessToken)
      
      if (!instance) {
        return {
          success: false,
          error: 'Appointment instance not found'
        }
      }
      
      // Check if instance is expired
      if (new Date() > new Date(instance.validUntil)) {
        return {
          success: false,
          error: 'Appointment instance has expired'
        }
      }
      
      return {
        success: true,
        instance
      }
      
    } catch (error) {
      console.error('Error getting appointment instance:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  async updateCustomerBooking(
    customerAccessToken: string,
    bookingData: UpdateCustomerBookingRequest
  ): Promise<UpdateCustomerBookingResponse> {
    try {
      const instanceResult = await this.getAppointmentInstanceByToken(customerAccessToken)
      
      if (!instanceResult.success || !instanceResult.instance) {
        return {
          success: false,
          error: instanceResult.error || 'Instance not found'
        }
      }
      
      const instance = instanceResult.instance
      const now = new Date().toISOString()
      
      // Create customer booking
      const customerBooking = {
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        preferredTimeSlots: [], // No time slots selected since we removed that feature
        customerMessage: bookingData.customerMessage,
        specialRequirements: bookingData.specialRequirements,
        status: 'submitted' as const,
        submittedAt: now,
        lastModifiedAt: now
      }
      
      // Update instance
      const updatedInstance: AppointmentInstance = {
        ...instance,
        customerBooking,
        status: 'scheduled',
        updatedAt: now
      }
      
      // Save updated instance
      await saveToCloudStorage([updatedInstance])
      
      return {
        success: true,
        customerBooking
      }
      
    } catch (error) {
      console.error('Error updating customer booking:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  async respondToCustomerBooking(
    instanceId: string,
    response: FSMUserResponse
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const instance = await loadFromCloudStorage(instanceId) as AppointmentInstance
      
      if (!instance) {
        return {
          success: false,
          error: 'Appointment instance not found'
        }
      }
      
      const now = new Date().toISOString()
      
      // Update instance with FSM response
      const updatedInstance: AppointmentInstance = {
        ...instance,
        fsmResponse: response,
        status: response.response === 'approve' ? 'confirmed' : 'rejected',
        updatedAt: now
      }
      
      // Save updated instance
      await saveToCloudStorage([updatedInstance])
      
      return { success: true }
      
    } catch (error) {
      console.error('Error responding to customer booking:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  async getAllInstancesForTenant(): Promise<AppointmentInstance[]> {
    try {
      const instances = await loadFromCloudStorage() as AppointmentInstance[]
      return instances || []
    } catch (error) {
      console.error('Error getting all instances:', error)
      return []
    }
  },

  generateAvailableTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = []
    const now = new Date()
    
    // Generate slots for next 14 days
    for (let day = 1; day <= 14; day++) {
      const date = new Date(now)
      date.setDate(date.getDate() + day)
      
      // Skip weekends (optional)
      if (date.getDay() === 0 || date.getDay() === 6) continue
      
      // Generate 3 time slots per day (morning, afternoon, evening)
      const timeSlots = [
        { start: 9, end: 12 },   // Morning
        { start: 13, end: 16 },  // Afternoon
        { start: 16, end: 19 }   // Evening
      ]
      
      timeSlots.forEach((slot, index) => {
        const startTime = new Date(date)
        startTime.setHours(slot.start, 0, 0, 0)
        
        const endTime = new Date(date)
        endTime.setHours(slot.end, 0, 0, 0)
        
        slots.push({
          id: `slot_${day}_${index}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          isAvailable: true,
          isSelected: false
        })
      })
    }
    
    return slots
  }
}
