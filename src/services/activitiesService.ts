import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { API_CONFIG, FSM_HEADERS } from '../constants'

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

export const activitiesService = {
  async getActivities(bearerToken: string): Promise<{ success: boolean; activities?: FSMActivity[]; error?: string; details?: any }> {
    try {
      const activitiesUrl = `${API_CONFIG.dataAPIURL}/Activity`

      // Query parameters using FSM Data API format
      const params = new URLSearchParams({
        'dtos': 'Activity.43',
        'pageSize': '50', // Limit to 50 activities for now
      })

      const fullUrl = `${activitiesUrl}?${params.toString()}`
      console.log('FSM Data API URL:', fullUrl)
      console.log('FSM Headers:', {
        'Authorization': `Bearer ${bearerToken}`,
        ...FSM_HEADERS,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      })

      const response: AxiosResponse<ActivitiesResponse> = await axios.get(
        fullUrl,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            ...FSM_HEADERS,
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
