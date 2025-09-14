import React, { useState, useEffect } from 'react'
import { ActivitiesList } from '../components/ActivitiesList'
import { authService } from '../services'

export const Dashboard: React.FC = () => {
  const [bearerToken, setBearerToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  // Auto-fetch token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      setTokenLoading(true)
      try {
        // Check if we're in development mode
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.includes('localhost')
        
        if (isDevelopment) {
          console.log('Development mode - using mock bearer token')
          // Use a mock token for development
          setBearerToken('dev-bearer-token-mock')
          setTokenLoading(false)
          return
        }

        // Production mode - get real token
        const result = await authService.getBearerToken()
        if (result.success && result.token) {
          setBearerToken(result.token)
        }
      } catch (error) {
        console.error('Failed to get token:', error)
        // In development mode, still set mock token even if there's an error
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.includes('localhost')
        
        if (isDevelopment) {
          console.log('Development mode fallback - using mock bearer token')
          setBearerToken('dev-bearer-token-mock')
        }
      } finally {
        setTokenLoading(false)
      }
    }

    fetchToken()
  }, [])

  return (
    <div className="space-y-8">
      {/* Activities List */}
      {bearerToken ? (
        <ActivitiesList bearerToken={bearerToken} />
      ) : (
        <div className="sap-card">
          <div className="sap-card-header">
            <h2 className="sap-card-title">FSM Activities</h2>
            <p className="text-sm" style={{ color: 'var(--sap-text-color-secondary)', marginTop: '4px' }}>
              {tokenLoading 
                ? 'Connecting to SAP FSM...' 
                : 'Failed to connect to SAP FSM'
              }
            </p>
          </div>
          <div className="sap-card-content">
            <div className="text-center py-8">
              <p style={{ color: 'var(--sap-text-color-secondary)' }}>
                {tokenLoading 
                  ? 'Please wait while we authenticate with SAP FSM...'
                  : 'Unable to connect. Please check your configuration.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
