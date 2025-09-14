import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { API_CONFIG, getApiConfig } from '../constants'
import { tenantService, type TenantData } from './tenantService'
import { shellSdkService } from './shellSdkService'

// Mock activities for development mode
const getMockActivities = (existingActivityIds: string[] = []): FSMActivity[] => {
  const mockActivities: FSMActivity[] = [
    {
      id: '01E12B09F87F4B458BAE623CBE6855AA',
      activityId: '01E12B09F87F4B458BAE623CBE6855AA',
      code: 'ACT-001',
      subject: 'Tankrevision inkl. Inspektion',
      status: 'OPEN',
      type: 'ASSIGNMENT',
      executionStage: 'DISPATCHING',
      businessPartner: 'O\'Leary\'s Contractors',
      startDateTime: '2024-01-15T09:00:00Z',
      endDateTime: '2024-01-15T17:00:00Z',
      priority: 'MEDIUM',
      customerName: 'O\'Leary\'s Contractors',
      serviceCallNumber: '5705854',
      technicianName: 'Ambrosio Gonzalez',
      location: {
        address: '1031 N. Cicero Ave., Chicago, US, 60651',
        city: 'Chicago',
        country: 'US'
      },
      equipment: {
        code: 'EQ-001',
        name: 'Doosan 250/HP185WDZ-T4F',
        address: '1031 N. Cicero Ave., Chicago, US, 60651'
      }
    },
    {
      id: '12D86A8536034AD79AC3448B5F1F58E1',
      activityId: '12D86A8536034AD79AC3448B5F1F58E1',
      code: 'ACT-002',
      subject: 'Leckwarngert. Wartung',
      status: 'OPEN',
      type: 'ASSIGNMENT',
      executionStage: 'DISPATCHING',
      businessPartner: 'Tech Solutions Inc',
      startDateTime: '2024-01-16T10:00:00Z',
      endDateTime: '2024-01-16T14:00:00Z',
      priority: 'HIGH',
      customerName: 'Tech Solutions Inc',
      serviceCallNumber: '5705855',
      technicianName: 'John Smith',
      location: {
        address: '456 Industrial Blvd, Detroit, US, 48201',
        city: 'Detroit',
        country: 'US'
      },
      equipment: {
        code: 'EQ-002',
        name: 'Leak Detection System Alpha',
        address: '456 Industrial Blvd, Detroit, US, 48201'
      }
    },
    {
      id: '23E45C6789012BC345DEF6789012345A',
      activityId: '23E45C6789012BC345DEF6789012345A',
      code: 'ACT-003',
      subject: 'Routine Maintenance Check',
      status: 'OPEN',
      type: 'ASSIGNMENT',
      executionStage: 'DISPATCHING',
      businessPartner: 'Maintenance Pro Ltd',
      startDateTime: '2024-01-17T08:00:00Z',
      endDateTime: '2024-01-17T16:00:00Z',
      priority: 'LOW',
      customerName: 'Maintenance Pro Ltd',
      serviceCallNumber: '5705856',
      technicianName: 'Maria Rodriguez',
      location: {
        address: '789 Service Road, Miami, US, 33101',
        city: 'Miami',
        country: 'US'
      },
      equipment: {
        code: 'EQ-003',
        name: 'Maintenance Unit Beta',
        address: '789 Service Road, Miami, US, 33101'
      }
    }
  ]

  // Filter eligible activities (same logic as production)
  return filterEligibleActivities(mockActivities, existingActivityIds)
}

export interface FSMActivity {
  id: string
  code?: string
  subject?: string
  status?: string
  startDateTime?: string
  endDateTime?: string
  businessPartner?: string
  object?: {
    objectId: string
    objectType: string
  }
  responsibles?: string[]
  type?: string
  executionStage?: string
  // Activity specific fields from the API response
  activityId?: string
  description?: string
  startDate?: string
  endDate?: string
  customerId?: string
  customerName?: string
  serviceCallId?: string
  serviceCallNumber?: string
  technicianId?: string
  technicianName?: string
  location?: {
    address?: string
    city?: string
    country?: string
  }
  equipment?: {
    code?: string
    name?: string
    address?: string
  }
  priority?: string
  estimatedDuration?: number
  actualDuration?: number
  createdOn?: string
  lastModifiedOn?: string
  assignmentNumber?: string
  serviceCallSubject?: string
  customer?: {
    id: string
    name?: string
  }
  serviceCall?: {
    id: string
    number?: string
    subject?: string
    startDateTime?: string
    endDateTime?: string
  }
  technician?: {
    id: string
    name?: string
  }
  // New fields for appointment scheduling
  earliestStartDateTime?: string
  latestStartDateTime?: string
}

interface ActivityResponseItem {
  activity: FSMActivity
}

interface ActivitiesResponse {
  data?: ActivityResponseItem[]
  pageSize?: number
  currentPage?: number
  lastPage?: number
  totalObjectCount?: number
  truncated?: boolean
  // Legacy support
  value?: FSMActivity[]
  results?: FSMActivity[]
  count?: number
  totalCount?: number
  nextLink?: string
  [key: string]: any
}


// Filter function to only include activities that can have appointment instances created
function filterEligibleActivities(activities: FSMActivity[], existingActivityIds: string[] = []): FSMActivity[] {
  console.log(`Filtering ${activities.length} activities for appointment eligibility`)
  console.log(`Existing activity IDs with appointments:`, existingActivityIds)
  
  const filtered = activities.filter(activity => {
    const activityId = activity.id || `activity-${activities.indexOf(activity)}`
    
    // If activity already has an appointment instance, always include it
    if (existingActivityIds.includes(activityId)) {
      console.log(`Activity ${activityId} included (has existing appointment instance):`, {
        status: activity.status,
        executionStage: activity.executionStage,
        type: activity.type,
        subject: activity.subject
      })
      return true
    }
    
    // For new activities, check if they meet criteria for appointment instance creation
    const isNotClosed = activity.status !== 'CLOSED'
    const isDispatching = activity.executionStage === 'DISPATCHING'
    const isAssignment = activity.type === 'ASSIGNMENT'
    
    const isEligible = isNotClosed && isDispatching && isAssignment
    
    if (!isEligible) {
      console.log(`Activity ${activityId} filtered out:`, {
        status: activity.status,
        executionStage: activity.executionStage,
        type: activity.type,
        subject: activity.subject
      })
    }
    
    return isEligible
  })
  
  console.log(`${filtered.length} activities remain after filtering`)
  return filtered
}

export const activitiesService = {
  async getActivities(bearerToken: string, existingActivityIds: string[] = []): Promise<{ success: boolean; activities?: FSMActivity[]; error?: string; details?: any }> {
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost')
    
    if (isDevelopment) {
      console.log('Development mode - returning mock activities')
      return {
        success: true,
        activities: getMockActivities(existingActivityIds)
      }
    }

    // Get FSM context and tenant data
    const fsmContext = shellSdkService.getContext()
    let tenant: TenantData | null = null
    
    if (fsmContext) {
      try {
        const tenantResult = await tenantService.validateTenant()
        if (tenantResult.isValid && tenantResult.tenant) {
          tenant = tenantResult.tenant
        }
      } catch (error) {
        console.warn('Failed to get tenant data for activities API:', error)
      }
    }

    // Always make real API calls - no mock mode
    if (!fsmContext || !tenant) {
      return {
        success: false,
        error: 'FSM context or tenant data not available',
        details: {
          hasContext: !!fsmContext,
          hasTenant: !!tenant
        }
      }
    }
    
    try {
      // Get tenant-specific API configuration
      const apiConfig = getApiConfig(tenant)
      const activitiesUrl = `${apiConfig.dataAPIURL}/Activity`

      // Query parameters using FSM Data API format
      const params = new URLSearchParams({
        'dtos': 'Activity.43',
        'pageSize': '50', // Limit to 50 activities for now
      })

      const fullUrl = `${activitiesUrl}?${params.toString()}`
      console.log('FSM Data API URL:', fullUrl)
      console.log('FSM Headers:', {
        'Authorization': `Bearer ${bearerToken}`,
        ...apiConfig.headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      })

      const response: AxiosResponse<ActivitiesResponse> = await axios.get(
        fullUrl,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            ...apiConfig.headers,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: API_CONFIG.timeout,
        }
      )

      // Debug: Log the response structure (uncomment for debugging)
      // console.log('FSM Data API Response:', response.data)

      // Handle different possible response structures from FSM Data API
      let activities: FSMActivity[] = []
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        // New Activity API structure: { data: [{ activity: {...} }] }
        activities = response.data.data.map((item: ActivityResponseItem) => item.activity)
      } else if (Array.isArray(response.data)) {
        // Response is directly an array
        activities = response.data
      } else if (response.data?.value) {
        // OData-style response with value array
        activities = response.data.value
      } else if (response.data?.results) {
        // Response with results property
        activities = response.data.results
      }

      if (activities.length > 0 || Array.isArray(activities)) {
        // Filter activities to only include those eligible for appointment instance creation
        const filteredActivities = filterEligibleActivities(activities, existingActivityIds)
        return {
          success: true,
          activities: filteredActivities,
          details: {
            originalCount: activities.length,
            filteredCount: filteredActivities.length,
            message: 'Activities filtered for appointment eligibility'
          }
        }
      } else {
        return {
          success: false,
          error: 'No activities data received',
          details: response.data,
        }
      }
    } catch (error: any) {
      console.error('Error fetching activities:', error)
      
      if (error.response) {
        return {
          success: false,
          error: `API Error: ${error.response.status} - ${error.response.statusText}`,
          details: {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          },
        }
      } else if (error.request) {
        return {
          success: false,
          error: 'Network Error: No response received',
          details: error.message,
        }
      } else {
        return {
          success: false,
          error: 'Request Error: ' + error.message,
          details: error,
        }
      }
    }
  }
}
