import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data';
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

const client = generateClient<Schema>();

// Convert Amplify model to our type
const convertAmplifyToAppointmentInstance = (amplify: any): AppointmentInstance => ({
  tenantId: amplify.tenantId,
  instanceId: amplify.id,
  customerAccessToken: amplify.customerAccessToken,
  customerUrl: amplify.customerUrl,
  validFrom: amplify.validFrom,
  validUntil: amplify.validUntil,
  ttl: amplify.ttl,
  status: amplify.status,
  createdAt: amplify.createdAt,
  updatedAt: amplify.updatedAt,
  fsmActivity: {
    activityId: amplify.fsmActivity.activityId,
    activityCode: amplify.fsmActivity.activityCode,
    subject: amplify.fsmActivity.subject,
    status: amplify.fsmActivity.status,
    businessPartner: amplify.fsmActivity.businessPartner,
    object: amplify.fsmActivity.object,
    serviceCallId: amplify.fsmActivity.serviceCallId,
    serviceCallNumber: amplify.fsmActivity.serviceCallNumber
  },
  customerBooking: amplify.customerBooking ? {
    customerName: amplify.customerBooking.customerName,
    customerEmail: amplify.customerBooking.customerEmail,
    customerPhone: amplify.customerBooking.customerPhone,
    preferredTimeSlots: amplify.customerBooking.preferredTimeSlots?.map((slot: any) => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
      isSelected: slot.isSelected
    })) || [],
    customerMessage: amplify.customerBooking.customerMessage,
    specialRequirements: amplify.customerBooking.specialRequirements,
    status: amplify.customerBooking.status,
    submittedAt: amplify.customerBooking.submittedAt,
    lastModifiedAt: amplify.customerBooking.lastModifiedAt
  } : undefined,
  fsmResponse: amplify.fsmResponse ? {
    response: amplify.fsmResponse.response,
    selectedTimeSlot: amplify.fsmResponse.selectedTimeSlot ? {
      id: amplify.fsmResponse.selectedTimeSlot.id,
      startTime: amplify.fsmResponse.selectedTimeSlot.startTime,
      endTime: amplify.fsmResponse.selectedTimeSlot.endTime,
      isAvailable: amplify.fsmResponse.selectedTimeSlot.isAvailable,
      isSelected: amplify.fsmResponse.selectedTimeSlot.isSelected
    } : undefined,
    fsmMessage: amplify.fsmResponse.fsmMessage,
    technicianNotes: amplify.fsmResponse.technicianNotes,
    respondedAt: amplify.fsmResponse.respondedAt,
    respondedBy: amplify.fsmResponse.respondedBy
  } : undefined
});

// Convert our type to Amplify model
const convertToAmplifyAppointmentInstance = (instance: AppointmentInstance): any => ({
  tenantId: instance.tenantId,
  customerAccessToken: instance.customerAccessToken,
  customerUrl: instance.customerUrl,
  validFrom: instance.validFrom,
  validUntil: instance.validUntil,
  ttl: instance.ttl,
  status: instance.status,
  fsmActivity: {
    activityId: instance.fsmActivity.activityId,
    activityCode: instance.fsmActivity.activityCode,
    subject: instance.fsmActivity.subject,
    status: instance.fsmActivity.status,
    businessPartner: instance.fsmActivity.businessPartner,
    object: instance.fsmActivity.object,
    serviceCallId: instance.fsmActivity.serviceCallId,
    serviceCallNumber: instance.fsmActivity.serviceCallNumber
  },
  customerBooking: instance.customerBooking ? {
    customerName: instance.customerBooking.customerName,
    customerEmail: instance.customerBooking.customerEmail,
    customerPhone: instance.customerBooking.customerPhone,
    preferredTimeSlots: instance.customerBooking.preferredTimeSlots.map(slot => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
      isSelected: slot.isSelected
    })),
    customerMessage: instance.customerBooking.customerMessage,
    specialRequirements: instance.customerBooking.specialRequirements,
    status: instance.customerBooking.status,
    submittedAt: instance.customerBooking.submittedAt,
    lastModifiedAt: instance.customerBooking.lastModifiedAt
  } : undefined,
  fsmResponse: instance.fsmResponse ? {
    response: instance.fsmResponse.response,
    selectedTimeSlot: instance.fsmResponse.selectedTimeSlot ? {
      id: instance.fsmResponse.selectedTimeSlot.id,
      startTime: instance.fsmResponse.selectedTimeSlot.startTime,
      endTime: instance.fsmResponse.selectedTimeSlot.endTime,
      isAvailable: instance.fsmResponse.selectedTimeSlot.isAvailable,
      isSelected: instance.fsmResponse.selectedTimeSlot.isSelected
    } : undefined,
    fsmMessage: instance.fsmResponse.fsmMessage,
    technicianNotes: instance.fsmResponse.technicianNotes,
    respondedAt: instance.fsmResponse.respondedAt,
    respondedBy: instance.fsmResponse.respondedBy
  } : undefined
});

export const amplifyAppointmentService = {
  async createAppointmentInstances(
    request: CreateAppointmentInstanceRequest
  ): Promise<CreateAppointmentInstanceResponse> {
    try {
      const tenantId = `${import.meta.env.VITE_SAP_ACCOUNT_ID}-${import.meta.env.VITE_SAP_COMPANY_ID}`
      const instances: AppointmentInstance[] = []
      const customerUrls: string[] = []
      
      for (const activity of request.activities) {
        const customerAccessToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
        const customerUrl = `${window.location.origin}/booking/${customerAccessToken}`
        const now = new Date().toISOString()
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        
        const instance: AppointmentInstance = {
          tenantId,
          instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          customerAccessToken,
          customerUrl,
          validFrom: now,
          validUntil,
          ttl: Math.floor(new Date(validUntil).getTime() / 1000),
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
            serviceCallNumber: activity.object?.objectId?.slice(-7)
          }
        }
        
        // Save to DataStore
        const amplifyData = convertToAmplifyAppointmentInstance(instance);
        const result = await client.models.AppointmentInstance.create(amplifyData);
        
        if (result.data) {
          instances.push(instance)
          customerUrls.push(customerUrl)
        }
      }
      
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
      const { data: amplifyInstances } = await client.models.AppointmentInstance.list({
        filter: {
          customerAccessToken: {
            eq: customerAccessToken
          }
        }
      });
      
      if (!amplifyInstances || amplifyInstances.length === 0) {
        return {
          success: false,
          error: 'Appointment instance not found'
        }
      }
      
      const instance = convertAmplifyToAppointmentInstance(amplifyInstances[0])
      
      // Check if expired
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
        preferredTimeSlots: bookingData.selectedTimeSlots,
        customerMessage: bookingData.customerMessage,
        specialRequirements: bookingData.specialRequirements,
        status: 'submitted' as const,
        submittedAt: now,
        lastModifiedAt: now
      }
      
      // Update instance in DataStore
      const { data: updatedInstance } = await client.models.AppointmentInstance.update({
        id: instance.instanceId,
        customerBooking: customerBooking,
        status: 'scheduled',
        updatedAt: now
      });
      
      if (updatedInstance) {
        return {
          success: true,
          customerBooking
        }
      } else {
        return {
          success: false,
          error: 'Failed to update customer booking'
        }
      }
    } catch (error) {
      console.error('Error updating customer booking:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  async getAllInstancesForTenant(): Promise<AppointmentInstance[]> {
    try {
      const tenantId = `${import.meta.env.VITE_SAP_ACCOUNT_ID}-${import.meta.env.VITE_SAP_COMPANY_ID}`
      const { data: amplifyInstances } = await client.models.AppointmentInstance.list({
        filter: {
          tenantId: {
            eq: tenantId
          }
        }
      });
      
      return amplifyInstances?.map(convertAmplifyToAppointmentInstance) || []
    } catch (error) {
      console.error('Error getting all instances:', error)
      return []
    }
  },

  async respondToCustomerBooking(
    instanceId: string,
    response: FSMUserResponse
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString()
      
      const { data: updatedInstance } = await client.models.AppointmentInstance.update({
        id: instanceId,
        fsmResponse: response,
        status: response.response === 'approve' ? 'confirmed' : 'rejected',
        updatedAt: now
      });
      
      if (updatedInstance) {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Failed to update appointment instance'
        }
      }
    } catch (error) {
      console.error('Error responding to customer booking:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
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
