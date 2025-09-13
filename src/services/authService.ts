import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { shellSdkService, type FSMContext } from './shellSdkService'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface AuthConfig {
  tokenUrl: string
  accountId: string
  companyId: string
  clientId: string
  clientSecret: string
  clientIdName: string
  clientIdVersion: string
  testUser: string
}

const getAuthConfig = (fsmContext?: FSMContext | null): AuthConfig => ({
  tokenUrl: import.meta.env.VITE_FSM_TOKEN_URL || 'https://eu.coresuite.com/api',
  accountId: fsmContext?.accountId || import.meta.env.VITE_SAP_ACCOUNT_ID || '86810',
  companyId: fsmContext?.companyId || import.meta.env.VITE_SAP_COMPANY_ID || '111214',
  clientId: import.meta.env.VITE_SAP_CLIENT_ID || '0001531a-fsmtable',
  clientSecret: import.meta.env.VITE_SAP_CLIENT_SECRET || '4b657b69-837c-4b00-a903-7f89161703b4',
  clientIdName: import.meta.env.VITE_SAP_CLIENT_ID_NAME || 'FSMfieldplan',
  clientIdVersion: import.meta.env.VITE_SAP_CLIENT_ID_VERSION || '0.1',
  testUser: import.meta.env.VITE_SAP_TEST_USER || 'BC1164511670442EA56C76A00A9199F8',
})

export const authService = {
  async getBearerToken(): Promise<{ success: boolean; token?: string; error?: string; details?: any }> {
    // Check if we have FSM context available
    const fsmContext = shellSdkService.getContext()
    
    // Mock mode for UI development - set to true to bypass SAP FSM authentication
    // Disable mock mode when running in FSM
    const MOCK_MODE = !fsmContext
    
    if (MOCK_MODE) {
      console.log('Running in MOCK mode - bypassing SAP FSM authentication')
      return {
        success: true,
        token: 'mock-bearer-token-for-ui-development',
        details: {
          mockMode: true,
          message: 'Using mock token for UI development'
        }
      }
    }
    
    try {
      const config = getAuthConfig(fsmContext)
      
      // Validate required environment variables
      const requiredFields = ['accountId', 'companyId', 'clientId', 'clientSecret']
      const missingFields = requiredFields.filter(field => !config[field as keyof AuthConfig])
      
      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Missing required environment variables: ${missingFields.join(', ')}`,
          details: { missingFields, config: { ...config, clientSecret: '***' } }
        }
      }

      const tokenUrl = `${config.tokenUrl}/oauth2/v1/token`
      
      // Create Basic Auth header
      const basicAuth = btoa(`${config.clientId}:${config.clientSecret}`)
      
      const requestBody = new URLSearchParams({
        grant_type: 'client_credentials'
      })

      console.log('Requesting token from:', tokenUrl)
      console.log('Headers:', {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Account-ID': config.accountId,
        'X-Company-ID': config.companyId,
        'Authorization': `Basic ${basicAuth.substring(0, 20)}...`
      })

      const response: AxiosResponse<TokenResponse> = await axios.post(tokenUrl, requestBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Account-ID': config.accountId,
          'X-Company-ID': config.companyId,
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json',
        },
        timeout: 30000,
      })

      if (response.data && response.data.access_token) {
        return {
          success: true,
          token: response.data.access_token,
          details: {
            tokenType: response.data.token_type,
            expiresIn: response.data.expires_in,
            scope: response.data.scope,
            fullResponse: response.data
          }
        }
      } else {
        return {
          success: false,
          error: 'No access token received in response',
          details: response.data
        }
      }
    } catch (error: any) {
      console.error('Token request failed:', error)
      
      let errorMessage = 'Unknown error occurred'
      let errorDetails: any = {}

      if (error.response) {
        // Server responded with error status
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
        errorDetails = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response received from server'
        errorDetails = { request: error.request }
      } else {
        // Something else happened
        errorMessage = error.message
        errorDetails = { message: error.message }
      }

      return {
        success: false,
        error: errorMessage,
        details: errorDetails
      }
    }
  }
}
