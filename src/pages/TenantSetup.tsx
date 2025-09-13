import React, { useState, useEffect } from 'react'
import { shellSdkService, type FSMContext } from '../services/shellSdkService'
import { tenantService, type TenantSetupFormData } from '../services/tenantService'
import './TenantSetup.css'

interface TenantSetupProps {
  onSetupComplete: () => void
}

export const TenantSetup: React.FC<TenantSetupProps> = ({ onSetupComplete }) => {
  const [fsmContext, setFsmContext] = useState<FSMContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<TenantSetupFormData>({
    contactCompanyName: '',
    contactFullName: '',
    contactPhone: '',
    contactEmailAddress: '',
    clientId: '',
    clientSecret: ''
  })

  const [formErrors, setFormErrors] = useState<Partial<TenantSetupFormData>>({})

  useEffect(() => {
    const initializeSetup = async () => {
      try {
        await shellSdkService.initialize()
        const context = shellSdkService.getContext()
        
        if (!context) {
          setError('Unable to get FSM context. Please ensure you are running this extension within SAP FSM.')
          return
        }

        setFsmContext(context)
        
        // Pre-fill contact email with current user's email if available
        if (context.currentUser.email) {
          setFormData(prev => ({
            ...prev,
            contactEmailAddress: context.currentUser.email || ''
          }))
        }
        
      } catch (error) {
        console.error('Error initializing setup:', error)
        setError('Failed to initialize setup. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }

    initializeSetup()
  }, [])

  const validateForm = (): boolean => {
    const errors: Partial<TenantSetupFormData> = {}

    if (!formData.contactCompanyName.trim()) {
      errors.contactCompanyName = 'Contact Company Name is required'
    }

    if (!formData.contactFullName.trim()) {
      errors.contactFullName = 'Contact Full Name is required'
    }

    if (!formData.contactEmailAddress.trim()) {
      errors.contactEmailAddress = 'Contact Email Address is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.contactEmailAddress)) {
      errors.contactEmailAddress = 'Please enter a valid email address'
    }

    if (!formData.clientId.trim()) {
      errors.clientId = 'Client ID is required'
    }

    if (!formData.clientSecret.trim()) {
      errors.clientSecret = 'Client Secret is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof TenantSetupFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      await tenantService.createTenant(formData)
      
      // Show success notification
      shellSdkService.showNotification(
        'Tenant setup completed successfully! Redirecting to application...',
        'success'
      )

      // Redirect to application after a short delay
      setTimeout(() => {
        onSetupComplete()
      }, 1500)

    } catch (error) {
      console.error('Error creating tenant:', error)
      setError('Failed to create tenant. Please check your information and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="tenant-setup">
        <div className="setup-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading FSM context...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !fsmContext) {
    return (
      <div className="tenant-setup">
        <div className="setup-container">
          <div className="error-state">
            <h2>❌ Setup Error</h2>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tenant-setup">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Tenant Setup</h1>
          <p className="setup-description">
            We've pre-filled your tenant identifiers from the FSM shell. Please add your contact and OAuth client details to complete the setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {/* Tenant Identifiers (Pre-filled) */}
          <div className="form-section">
            <h2>Tenant Identifiers (Pre-filled)</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="accountId">Account ID</label>
                <input
                  type="text"
                  id="accountId"
                  value={fsmContext?.accountId || ''}
                  readOnly
                  className="readonly-field"
                />
              </div>
              <div className="form-group">
                <label htmlFor="companyId">Company ID</label>
                <input
                  type="text"
                  id="companyId"
                  value={fsmContext?.companyId || ''}
                  readOnly
                  className="readonly-field"
                />
              </div>
              <div className="form-group">
                <label htmlFor="cluster">Cluster</label>
                <input
                  type="text"
                  id="cluster"
                  value={fsmContext?.cluster || ''}
                  readOnly
                  className="readonly-field"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h2>Contact information</h2>
            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="contactCompanyName">
                  Contact Company Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="contactCompanyName"
                  value={formData.contactCompanyName}
                  onChange={(e) => handleInputChange('contactCompanyName', e.target.value)}
                  className={formErrors.contactCompanyName ? 'error' : ''}
                  placeholder="Enter your company name"
                />
                {formErrors.contactCompanyName && (
                  <span className="error-message">{formErrors.contactCompanyName}</span>
                )}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contactFullName">
                  Contact Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="contactFullName"
                  value={formData.contactFullName}
                  onChange={(e) => handleInputChange('contactFullName', e.target.value)}
                  className={formErrors.contactFullName ? 'error' : ''}
                  placeholder="Enter your full name"
                />
                {formErrors.contactFullName && (
                  <span className="error-message">{formErrors.contactFullName}</span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="contactPhone">Contact Phone</label>
                <input
                  type="tel"
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="contactEmailAddress">
                  Contact Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="contactEmailAddress"
                  value={formData.contactEmailAddress}
                  onChange={(e) => handleInputChange('contactEmailAddress', e.target.value)}
                  className={formErrors.contactEmailAddress ? 'error' : ''}
                  placeholder="Enter your email address"
                />
                {formErrors.contactEmailAddress && (
                  <span className="error-message">{formErrors.contactEmailAddress}</span>
                )}
              </div>
            </div>
          </div>

          {/* Client Credentials */}
          <div className="form-section">
            <h2>Client credentials</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="clientId">
                  Client ID <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="clientId"
                  value={formData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  className={formErrors.clientId ? 'error' : ''}
                  placeholder="Enter your OAuth Client ID"
                />
                {formErrors.clientId && (
                  <span className="error-message">{formErrors.clientId}</span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="clientSecret">
                  Client Secret <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="clientSecret"
                  value={formData.clientSecret}
                  onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                  className={formErrors.clientSecret ? 'error' : ''}
                  placeholder="Enter your OAuth Client Secret"
                />
                {formErrors.clientSecret && (
                  <span className="error-message">{formErrors.clientSecret}</span>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              disabled={saving}
              className="save-button"
            >
              {saving ? (
                <>
                  <div className="button-spinner"></div>
                  Saving...
                </>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
