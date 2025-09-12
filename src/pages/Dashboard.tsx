import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui'
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
        const result = await authService.getBearerToken()
        if (result.success && result.token) {
          setBearerToken(result.token)
        }
      } catch (error) {
        console.error('Failed to get token:', error)
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
        <Card>
          <CardHeader>
            <CardTitle>FSM Activities</CardTitle>
            <CardDescription>
              {tokenLoading 
                ? 'Connecting to SAP FSM...' 
                : 'Failed to connect to SAP FSM'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">
                {tokenLoading 
                  ? 'Please wait while we authenticate with SAP FSM...'
                  : 'Unable to connect. Please check your configuration.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
