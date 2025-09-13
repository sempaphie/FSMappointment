/**
 * API-based Tenant Service
 * Uses API Gateway to interact with DynamoDB instead of direct AWS SDK calls
 */

export interface TenantData {
  // Primary key
  tenantId: string // Format: "accountId_companyId" (e.g., "86810_104348")
  
  // From ShellSDK (Auto-filled)
  accountId: string
  accountName: string
  companyId: string
  companyName: string
  cluster: string
  
  // User Input (Required)
  contactCompanyName: string
  contactFullName: string
  contactPhone?: string
  contactEmailAddress: string
  clientId: string
  clientSecret: string
  
  // License Management
  validFrom: string
  validTo: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface TenantSetupFormData {
  contactCompanyName: string
  contactFullName: string
  contactPhone?: string
  contactEmailAddress: string
  clientId: string
  clientSecret: string
}

export interface TenantValidationResult {
  isValid: boolean
  tenant?: TenantData
  error?: 'NOT_FOUND' | 'EXPIRED' | 'INACTIVE' | 'ERROR'
  message?: string
}

class ApiTenantServiceImpl {
  private readonly API_BASE_URL: string
  private readonly DEFAULT_LICENSE_DAYS = 14

  constructor() {
    // Get API URL from environment variables
    this.API_BASE_URL = import.meta.env.VITE_TENANT_API_URL || 'https://40be8c42uc.execute-api.eu-north-1.amazonaws.com/dev'
    
    if (!this.API_BASE_URL || this.API_BASE_URL.includes('your-api-gateway-url')) {
      console.warn('VITE_TENANT_API_URL not configured. Please set the API Gateway URL in environment variables.')
    }
  }

  /**
   * Generate tenant ID from account and company IDs
   */
  private generateTenantId(accountId: string, companyId: string): string {
    return `${accountId}_${companyId}`
  }

  /**
   * Make API request with error handling
   */
  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.API_BASE_URL}${endpoint}`
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      console.log(`Making API request to: ${url}`)
      const response = await fetch(url, defaultOptions)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`)
      }

      const data = await response.json()
      console.log('API response:', data)
      return data

    } catch (error) {
      console.error(`API request failed for ${url}:`, error)
      throw error
    }
  }

  /**
   * Check if tenant exists and is valid
   */
  async validateTenant(accountId: string, companyId: string): Promise<TenantValidationResult> {
    try {
      const endpoint = `/validate?accountId=${encodeURIComponent(accountId)}&companyId=${encodeURIComponent(companyId)}`
      const result = await this.makeApiRequest(endpoint)

      return {
        isValid: result.isValid,
        tenant: result.tenant,
        error: result.error,
        message: result.message
      }

    } catch (error: any) {
      console.error('Error validating tenant:', error)
      return {
        isValid: false,
        error: 'ERROR',
        message: `Error validating tenant: ${error.message}`
      }
    }
  }

  /**
   * Create new tenant
   */
  async createTenant(
    accountId: string, 
    companyId: string, 
    accountName: string,
    companyName: string,
    cluster: string,
    formData: TenantSetupFormData
  ): Promise<TenantData> {
    try {
      const now = new Date()
      const validFrom = now.toISOString()
      const validTo = new Date(now.getTime() + (this.DEFAULT_LICENSE_DAYS * 24 * 60 * 60 * 1000)).toISOString()

      const tenantPayload = {
        accountId,
        companyId,
        accountName,
        companyName,
        cluster,
        contactCompanyName: formData.contactCompanyName,
        contactFullName: formData.contactFullName,
        contactPhone: formData.contactPhone,
        contactEmailAddress: formData.contactEmailAddress,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        validFrom,
        validTo
      }

      const result = await this.makeApiRequest('/tenant', {
        method: 'POST',
        body: JSON.stringify(tenantPayload)
      })

      if (!result.success) {
        throw new Error(result.message || 'Failed to create tenant')
      }

      console.log('Tenant created successfully via API:', result.tenant)
      return result.tenant

    } catch (error: any) {
      console.error('Error creating tenant:', error)
      throw new Error(`Failed to create tenant: ${error.message}`)
    }
  }

  /**
   * Get current tenant
   */
  async getCurrentTenant(accountId: string, companyId: string): Promise<TenantData | null> {
    try {
      const tenantId = this.generateTenantId(accountId, companyId)
      const endpoint = `/tenant/${encodeURIComponent(tenantId)}`
      
      const result = await this.makeApiRequest(endpoint)
      return result.tenant || null

    } catch (error: any) {
      console.error('Error getting current tenant:', error)
      return null
    }
  }

  /**
   * Update tenant license
   */
  async updateTenantLicense(
    accountId: string, 
    companyId: string, 
    newValidTo: string
  ): Promise<TenantData> {
    try {
      const tenantId = this.generateTenantId(accountId, companyId)
      const endpoint = `/tenant/${encodeURIComponent(tenantId)}`
      
      const result = await this.makeApiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify({
          validTo: newValidTo
        })
      })

      if (!result.success) {
        throw new Error(result.message || 'Failed to update tenant license')
      }

      return result.tenant

    } catch (error: any) {
      console.error('Error updating tenant license:', error)
      throw new Error(`Failed to update tenant license: ${error.message}`)
    }
  }

  /**
   * Update tenant status
   */
  async updateTenantStatus(
    accountId: string, 
    companyId: string, 
    isActive: boolean
  ): Promise<TenantData> {
    try {
      const tenantId = this.generateTenantId(accountId, companyId)
      const endpoint = `/tenant/${encodeURIComponent(tenantId)}`
      
      const result = await this.makeApiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify({
          isActive
        })
      })

      if (!result.success) {
        throw new Error(result.message || 'Failed to update tenant status')
      }

      return result.tenant

    } catch (error: any) {
      console.error('Error updating tenant status:', error)
      throw new Error(`Failed to update tenant status: ${error.message}`)
    }
  }

  /**
   * Check if setup is required
   */
  async isSetupRequired(accountId: string, companyId: string): Promise<boolean> {
    const validation = await this.validateTenant(accountId, companyId)
    return !validation.isValid && validation.error === 'NOT_FOUND'
  }

  /**
   * Check if license is expired
   */
  async isLicenseExpired(accountId: string, companyId: string): Promise<boolean> {
    const validation = await this.validateTenant(accountId, companyId)
    return !validation.isValid && validation.error === 'EXPIRED'
  }

  /**
   * Get days until license expires
   */
  getDaysUntilExpiry(tenant: TenantData): number {
    const now = new Date()
    const validTo = new Date(tenant.validTo)
    const diffTime = validTo.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  /**
   * Get tenant identifier for display
   */
  getTenantIdentifier(tenant: TenantData): string {
    return `${tenant.accountName} (${tenant.companyName})`
  }

  /**
   * Check if API is available
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      // Try a simple request to check if API is available
      await this.makeApiRequest('/validate?accountId=test&companyId=test')
      return true
    } catch (error) {
      console.warn('API health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const apiTenantService = new ApiTenantServiceImpl()
