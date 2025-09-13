/**
 * Tenant Management Service
 * Handles tenant setup, validation, and license management
 */

import { shellSdkService, type FSMContext } from './shellSdkService'
import { apiTenantService } from './apiTenantService'


export interface TenantData {
  // From ShellSDK
  accountId: string
  accountName: string
  companyId: string
  companyName: string
  cluster: string
  
  // User provided data
  contactCompanyName: string
  contactFullName: string
  contactPhone?: string
  contactEmailAddress: string
  clientId: string
  clientSecret: string
  
  // License management
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

class TenantServiceImpl {
  private readonly TENANT_KEY_PREFIX = 'fsm_tenant_'
  private readonly DEFAULT_LICENSE_DAYS = 14
  
  private get useApi(): boolean {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // In browser, use API if explicitly enabled via environment variable
      const useApi = import.meta.env.VITE_USE_DYNAMODB === 'true'
      console.log('Browser environment - useApi:', useApi, 'VITE_USE_DYNAMODB:', import.meta.env.VITE_USE_DYNAMODB)
      return useApi
    }
    // In Node.js environment (build time), use production logic
    const useApi = process.env.NODE_ENV === 'production' || process.env.USE_DYNAMODB === 'true'
    console.log('Node.js environment - useApi:', useApi, 'NODE_ENV:', process.env.NODE_ENV)
    return useApi
  }


  /**
   * Generate tenant key from FSM context
   */
  private generateTenantKey(context: FSMContext): string {
    return `${this.TENANT_KEY_PREFIX}${context.accountId}_${context.companyId}`
  }

  /**
   * Check if tenant exists and is valid
   */
  async validateTenant(): Promise<TenantValidationResult> {
    try {
      const context = shellSdkService.getContext()
      if (!context) {
        return {
          isValid: false,
          error: 'NOT_FOUND',
          message: 'No FSM context available'
        }
      }

      console.log('validateTenant - useApi:', this.useApi, 'VITE_USE_DYNAMODB:', import.meta.env.VITE_USE_DYNAMODB)
      
      if (this.useApi) {
        // Use API Gateway for production
        console.log('Using API Gateway for validateTenant')
        return await apiTenantService.validateTenant(context.accountId, context.companyId)
      } else {
        console.log('Using localStorage for validateTenant')
        // Use localStorage for development
        const tenantKey = this.generateTenantKey(context)
        const tenant = await this.getTenant(tenantKey)

        if (!tenant) {
          return {
            isValid: false,
            error: 'NOT_FOUND',
            message: 'Tenant not found. Setup required.'
          }
        }

        if (!tenant.isActive) {
          return {
            isValid: false,
            error: 'INACTIVE',
            message: 'Tenant is inactive'
          }
        }

        const now = new Date()
        const validTo = new Date(tenant.validTo)

        if (now > validTo) {
          return {
            isValid: false,
            error: 'EXPIRED',
            message: 'Tenant license has expired',
            tenant
          }
        }

        return {
          isValid: true,
          tenant,
          message: 'Tenant is valid'
        }
      }

    } catch (error) {
      console.error('Error validating tenant:', error)
      return {
        isValid: false,
        error: 'NOT_FOUND',
        message: 'Error validating tenant'
      }
    }
  }

  /**
   * Create new tenant
   */
  async createTenant(formData: TenantSetupFormData): Promise<TenantData> {
    try {
      const context = shellSdkService.getContext()
      if (!context) {
        throw new Error('No FSM context available')
      }

      console.log('createTenant - useApi:', this.useApi, 'VITE_USE_DYNAMODB:', import.meta.env.VITE_USE_DYNAMODB)
      
      if (this.useApi) {
        // Use API Gateway for production
        console.log('Using API Gateway for createTenant')
        return await apiTenantService.createTenant(
          context.accountId,
          context.companyId,
          context.accountName,
          context.companyName,
          context.cluster,
          formData
        )
      } else {
        console.log('Using localStorage for createTenant')
        // Use localStorage for development
        const now = new Date()
        const validFrom = now.toISOString()
        const validTo = new Date(now.getTime() + (this.DEFAULT_LICENSE_DAYS * 24 * 60 * 60 * 1000)).toISOString()

        const tenant: TenantData = {
          // From ShellSDK
          accountId: context.accountId,
          accountName: context.accountName,
          companyId: context.companyId,
          companyName: context.companyName,
          cluster: context.cluster,
          
          // User provided data
          contactCompanyName: formData.contactCompanyName,
          contactFullName: formData.contactFullName,
          contactPhone: formData.contactPhone,
          contactEmailAddress: formData.contactEmailAddress,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          
          // License management
          validFrom,
          validTo,
          
          // Metadata
          createdAt: validFrom,
          updatedAt: validFrom,
          isActive: true
        }

        const tenantKey = this.generateTenantKey(context)
        await this.saveTenant(tenantKey, tenant)

        console.log('Tenant created successfully:', tenant)
        return tenant
      }

    } catch (error) {
      console.error('Error creating tenant:', error)
      throw new Error('Failed to create tenant')
    }
  }

  /**
   * Get tenant data
   */
  async getTenant(tenantKey: string): Promise<TenantData | null> {
    try {
      // For now, use localStorage. In production, this would be an API call
      const stored = localStorage.getItem(tenantKey)
      if (!stored) {
        return null
      }

      return JSON.parse(stored) as TenantData
    } catch (error) {
      console.error('Error getting tenant:', error)
      return null
    }
  }

  /**
   * Save tenant data
   */
  async saveTenant(tenantKey: string, tenant: TenantData): Promise<void> {
    try {
      // For now, use localStorage. In production, this would be an API call
      localStorage.setItem(tenantKey, JSON.stringify(tenant))
    } catch (error) {
      console.error('Error saving tenant:', error)
      throw new Error('Failed to save tenant')
    }
  }

  /**
   * Update tenant license
   */
  async updateTenantLicense(tenant: TenantData, newValidTo: string): Promise<TenantData> {
    try {
      const context = shellSdkService.getContext()
      if (!context) {
        throw new Error('No FSM context available')
      }

      const updatedTenant: TenantData = {
        ...tenant,
        validTo: newValidTo,
        updatedAt: new Date().toISOString()
      }

      const tenantKey = this.generateTenantKey(context)
      await this.saveTenant(tenantKey, updatedTenant)

      return updatedTenant
    } catch (error) {
      console.error('Error updating tenant license:', error)
      throw new Error('Failed to update tenant license')
    }
  }

  /**
   * Get current tenant (if exists)
   */
  async getCurrentTenant(): Promise<TenantData | null> {
    try {
      const context = shellSdkService.getContext()
      if (!context) {
        return null
      }

      const tenantKey = this.generateTenantKey(context)
      return await this.getTenant(tenantKey)
    } catch (error) {
      console.error('Error getting current tenant:', error)
      return null
    }
  }

  /**
   * Check if setup is required
   */
  async isSetupRequired(): Promise<boolean> {
    const validation = await this.validateTenant()
    return !validation.isValid && validation.error === 'NOT_FOUND'
  }

  /**
   * Check if license is expired
   */
  async isLicenseExpired(): Promise<boolean> {
    const validation = await this.validateTenant()
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
}

// Export singleton instance
export const tenantService = new TenantServiceImpl()
