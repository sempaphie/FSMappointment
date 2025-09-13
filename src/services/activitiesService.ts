import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { API_CONFIG, getApiConfig } from '../constants'
import { tenantService, type TenantData } from './tenantService'
import { shellSdkService } from './shellSdkService'

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
  }
  technician?: {
    id: string
    name?: string
  }
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

// Mock data for UI development
const MOCK_ACTIVITIES: FSMActivity[] = [
  {
    id: '01E12B09F87F4B458BAE623CBE6855AA',
    code: '6',
    subject: 'Tankrevision inkl. Innenreinigung',
    status: 'OPEN',
    startDateTime: '2025-07-02T10:15:00Z',
    endDateTime: '2025-07-02T14:15:00Z',
    businessPartner: '91C30CA6379B4F468B90D7DA90876311',
    object: {
      objectId: '7066C23BFE0B467A94E193C487412623',
      objectType: 'SERVICECALL'
    },
    responsibles: ['6BE3F76238CA41BBB5B2A622548408E8'],
    type: 'ASSIGNMENT',
    executionStage: 'EXECUTION',
    priority: 'Medium',
    activityId: '01E12B09F87F4B458BAE623CBE6855AA',
    serviceCallId: '7066C23BFE0B467A94E193C487412623',
    createdOn: '2025-06-23T11:06:18Z',
    lastModifiedOn: '2025-06-23T11:06:18Z'
  },
  {
    id: '05AF36ACF64948E1967EA9EFDA7372FD',
    code: '40',
    subject: 'Tankrevision inkl. Innenreinigung',
    status: 'OPEN',
    startDateTime: '2025-06-26T06:45:00Z',
    endDateTime: '2025-06-26T18:45:00Z',
    businessPartner: '91C30CA6379B4F468B90D7DA90876311',
    object: {
      objectId: '7066C23BFE0B467A94E193C487412623',
      objectType: 'SERVICECALL'
    },
    responsibles: ['DB6E3F59D0D742B4B358906FD376AE4B'],
    type: 'ASSIGNMENT',
    executionStage: 'EXECUTION',
    priority: 'High',
    activityId: '05AF36ACF64948E1967EA9EFDA7372FD',
    serviceCallId: '7066C23BFE0B467A94E193C487412623',
    createdOn: '2025-06-23T19:08:27Z',
    lastModifiedOn: '2025-06-23T19:08:27Z'
  },
  {
    id: '066E6999D943475798DD44402A410BBB',
    code: '43',
    subject: 'Tankrevision inkl. Innenreinigung',
    status: 'OPEN',
    startDateTime: '2025-06-25T06:30:00Z',
    endDateTime: '2025-06-25T16:45:00Z',
    businessPartner: '91C30CA6379B4F468B90D7DA90876311',
    object: {
      objectId: '7066C23BFE0B467A94E193C487412623',
      objectType: 'SERVICECALL'
    },
    responsibles: ['1778393D09ED479D91F79CF3388691C9'],
    type: 'MAINTENANCE',
    executionStage: 'EXECUTION',
    priority: 'Medium',
    activityId: '066E6999D943475798DD44402A410BBB',
    serviceCallId: '7066C23BFE0B467A94E193C487412623',
    createdOn: '2025-06-23T19:08:27Z',
    lastModifiedOn: '2025-06-23T19:08:27Z'
  },
  {
    id: '0AB78531468F42B08E2F90168AF982F3',
    code: '10',
    subject: 'Tankrevision inkl. Innenreinigung',
    status: 'OPEN',
    startDateTime: '2025-07-04T06:45:00Z',
    endDateTime: '2025-07-04T10:45:00Z',
    businessPartner: '91C30CA6379B4F468B90D7DA90876311',
    object: {
      objectId: '7066C23BFE0B467A94E193C487412623',
      objectType: 'SERVICECALL'
    },
    responsibles: ['6BE3F76238CA41BBB5B2A622548408E8'],
    type: 'ASSIGNMENT',
    executionStage: 'EXECUTION',
    priority: 'Low',
    activityId: '0AB78531468F42B08E2F90168AF982F3',
    serviceCallId: '7066C23BFE0B467A94E193C487412623',
    createdOn: '2025-06-23T11:06:31Z',
    lastModifiedOn: '2025-06-23T11:06:31Z'
  },
  {
    id: '0B1044F9F21F43C6824AB6A31A22904C',
    code: '51',
    subject: 'Tankrevision inkl. Innenreinigung',
    status: 'DRAFT',
    startDateTime: '2025-06-27T04:45:00Z',
    endDateTime: '2025-06-27T08:45:00Z',
    businessPartner: '91C30CA6379B4F468B90D7DA90876311',
    object: {
      objectId: '7066C23BFE0B467A94E193C487412623',
      objectType: 'SERVICECALL'
    },
    responsibles: ['DB6E3F59D0D742B4B358906FD376AE4B'],
    type: 'REPAIR',
    executionStage: 'EXECUTION',
    priority: 'High',
    activityId: '0B1044F9F21F43C6824AB6A31A22904C',
    serviceCallId: '7066C23BFE0B467A94E193C487412623',
    createdOn: '2025-06-23T19:08:35Z',
    lastModifiedOn: '2025-06-23T19:08:35Z'
  }
]

export const activitiesService = {
  async getActivities(bearerToken: string): Promise<{ success: boolean; activities?: FSMActivity[]; error?: string; details?: any }> {
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

    // Mock mode for UI development - set to true to bypass SAP FSM API calls
    const MOCK_MODE = !fsmContext || !tenant
    
    if (MOCK_MODE) {
      console.log('Running in MOCK mode - using sample activities data')
      return {
        success: true,
        activities: MOCK_ACTIVITIES,
        details: {
          mockMode: true,
          totalCount: MOCK_ACTIVITIES.length,
          message: 'Using mock activities for UI development'
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
        return {
          success: true,
          activities: activities,
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
