// Appointment Booking System Types

export interface AppointmentInstance {
  // Primary keys for DynamoDB
  tenantId: string // Format: {ACCOUNT_ID}-{COMPANY_ID}
  instanceId: string // Unique instance identifier
  
  // Instance metadata
  customerAccessToken: string // Unique token for customer access
  customerUrl: string // Full customer booking URL
  
  // Validity period
  validFrom: string // ISO date string
  validUntil: string // ISO date string (30 days from creation)
  ttl: number // DynamoDB TTL timestamp (Unix timestamp)
  
  // Status tracking
  status: AppointmentInstanceStatus
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  
  // FSM Activity reference
  fsmActivity: {
    activityId: string
    activityCode: string
    subject: string
    status: string
    businessPartner: string
    object?: {
      objectId: string
      objectType: string
    }
    serviceCallId?: string
    serviceCallNumber?: string
  }
  
  // Customer booking (optional - filled when customer submits)
  customerBooking?: CustomerBooking
  
  // FSM user response (optional - filled when FSM user responds)
  fsmResponse?: FSMUserResponse
}

export type AppointmentInstanceStatus = 
  | 'pending'        // Created but customer hasn't accessed yet
  | 'active'         // Customer is actively booking
  | 'scheduled'      // Customer has selected time slots
  | 'confirmed'      // FSM user has confirmed the appointment
  | 'rejected'       // FSM user has rejected the appointment
  | 'expired'        // ValidUntil date has passed
  | 'completed'      // Appointment has been completed

export interface CustomerBooking {
  // Customer details
  customerName: string
  customerEmail: string
  customerPhone?: string
  
  // Preferred time slots (customer can select multiple)
  preferredTimeSlots: TimeSlot[]
  
  // Customer messages/requests
  customerMessage?: string
  specialRequirements?: string
  
  // Status tracking
  status: CustomerBookingStatus
  submittedAt: string // ISO date string
  lastModifiedAt: string // ISO date string
}

export type CustomerBookingStatus =
  | 'draft'          // Customer is still selecting
  | 'submitted'      // Customer has submitted their preferences
  | 'under_review'   // FSM user is reviewing
  | 'approved'       // FSM user approved the booking
  | 'rejected'       // FSM user rejected the booking

export interface TimeSlot {
  id: string
  startTime: string // ISO date string
  endTime: string // ISO date string
  isAvailable: boolean
  isSelected: boolean
}

export interface FSMUserResponse {
  response: 'approve' | 'reject'
  selectedTimeSlot?: TimeSlot
  fsmMessage?: string
  technicianNotes?: string
  respondedAt: string // ISO date string
  respondedBy: string // FSM user ID
}

// API Request/Response types
export interface CreateAppointmentInstanceRequest {
  activityIds: string[]
  activities: Array<{
    id: string
    code: string
    subject: string
    status: string
    businessPartner: string
    object?: {
      objectId: string
      objectType: string
    }
  }>
}

export interface CreateAppointmentInstanceResponse {
  success: boolean
  instances?: AppointmentInstance[]
  error?: string
  customerUrls?: string[]
}

export interface GetAppointmentInstanceResponse {
  success: boolean
  instance?: AppointmentInstance
  error?: string
}

export interface UpdateCustomerBookingRequest {
  customerName: string
  customerEmail: string
  customerPhone?: string
  customerMessage?: string
  specialRequirements?: string
}

export interface UpdateCustomerBookingResponse {
  success: boolean
  customerBooking?: CustomerBooking
  error?: string
}

// Local storage types (for development/fallback)
export interface LocalStorageInstances {
  [tenantId: string]: {
    [instanceId: string]: AppointmentInstance
  }
}

// Tenant configuration
export interface TenantConfig {
  tenantId: string
  accountId: string
  companyId: string
  clientId: string
  clientSecret: string
  fsmBaseUrl: string
  createdAt: string
  isActive: boolean
}
