/**
 * DynamoDB Tenant Service
 * Production-ready tenant management using AWS DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

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
  clientSecret: string // Should be encrypted in production
  
  // License Management
  validFrom: string
  validTo: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  isActive: boolean
  
  // DynamoDB specific fields
  gsi1pk?: string // Global Secondary Index for querying by account
  gsi1sk?: string // Global Secondary Index for sorting
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
  error?: 'NOT_FOUND' | 'EXPIRED' | 'INACTIVE'
  message?: string
}

class DynamoDBTenantServiceImpl {
  private readonly TABLE_NAME = 'fsm-appointment-tenants'
  private readonly DEFAULT_LICENSE_DAYS = 14
  private readonly client: DynamoDBDocumentClient

  constructor() {
    // Initialize DynamoDB client
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      // In production, use IAM roles. For development, you might need credentials
      ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      } : {})
    })
    
    this.client = DynamoDBDocumentClient.from(dynamoClient)
  }

  /**
   * Generate tenant ID from account and company IDs
   */
  private generateTenantId(accountId: string, companyId: string): string {
    return `${accountId}_${companyId}`
  }

  /**
   * Check if tenant exists and is valid
   */
  async validateTenant(accountId: string, companyId: string): Promise<TenantValidationResult> {
    try {
      const tenantId = this.generateTenantId(accountId, companyId)
      
      const command = new GetCommand({
        TableName: this.TABLE_NAME,
        Key: {
          tenantId
        }
      })

      const { Item: tenant } = await this.client.send(command)

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
          tenant: tenant as TenantData
        }
      }

      return {
        isValid: true,
        tenant: tenant as TenantData,
        message: 'Tenant is valid'
      }

    } catch (error: any) {
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

      const tenantId = this.generateTenantId(accountId, companyId)

      const tenantData: TenantData = {
        tenantId,
        accountId,
        accountName,
        companyId,
        companyName,
        cluster,
        contactCompanyName: formData.contactCompanyName,
        contactFullName: formData.contactFullName,
        contactPhone: formData.contactPhone,
        contactEmailAddress: formData.contactEmailAddress,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret, // TODO: Encrypt in production
        validFrom,
        validTo,
        createdAt: validFrom,
        updatedAt: validFrom,
        isActive: true,
        // GSI for querying by account
        gsi1pk: `ACCOUNT#${accountId}`,
        gsi1sk: `TENANT#${tenantId}`
      }

      const command = new PutCommand({
        TableName: this.TABLE_NAME,
        Item: tenantData,
        // Prevent overwriting existing tenant
        ConditionExpression: 'attribute_not_exists(tenantId)'
      })

      await this.client.send(command)

      console.log('Tenant created successfully in DynamoDB:', tenantData)
      return tenantData

    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') {
        throw new Error('Tenant already exists')
      }
      console.error('Error creating tenant:', error)
      throw new Error('Failed to create tenant')
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

      const command = new UpdateCommand({
        TableName: this.TABLE_NAME,
        Key: {
          tenantId
        },
        UpdateExpression: 'SET validTo = :validTo, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':validTo': newValidTo,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      })

      const { Attributes } = await this.client.send(command)

      if (!Attributes) {
        throw new Error('Tenant not found')
      }

      return Attributes as TenantData
    } catch (error: any) {
      console.error('Error updating tenant license:', error)
      throw new Error('Failed to update tenant license')
    }
  }

  /**
   * Get current tenant
   */
  async getCurrentTenant(accountId: string, companyId: string): Promise<TenantData | null> {
    try {
      const tenantId = this.generateTenantId(accountId, companyId)
      
      const command = new GetCommand({
        TableName: this.TABLE_NAME,
        Key: {
          tenantId
        }
      })

      const { Item } = await this.client.send(command)

      if (!Item) {
        return null
      }

      return Item as TenantData
    } catch (error: any) {
      console.error('Error getting current tenant:', error)
      return null
    }
  }

  /**
   * Get all tenants for an account
   */
  async getTenantsByAccount(accountId: string): Promise<TenantData[]> {
    try {
      const command = new QueryCommand({
        TableName: this.TABLE_NAME,
        IndexName: 'GSI1', // Assuming you have a GSI with gsi1pk and gsi1sk
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: {
          ':pk': `ACCOUNT#${accountId}`
        }
      })

      const { Items } = await this.client.send(command)

      return (Items || []) as TenantData[]
    } catch (error: any) {
      console.error('Error getting tenants by account:', error)
      return []
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

      const command = new UpdateCommand({
        TableName: this.TABLE_NAME,
        Key: {
          tenantId
        },
        UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':isActive': isActive,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      })

      const { Attributes } = await this.client.send(command)

      if (!Attributes) {
        throw new Error('Tenant not found')
      }

      return Attributes as TenantData
    } catch (error: any) {
      console.error('Error updating tenant status:', error)
      throw new Error('Failed to update tenant status')
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
}

// Export singleton instance
export const dynamoDBTenantService = new DynamoDBTenantServiceImpl()
