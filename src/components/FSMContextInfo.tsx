import React from 'react'
import { useFSM } from '../contexts/FSMContext'
import { AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react'

export const FSMContextInfo: React.FC = () => {
  const { context, loading, error, isRunningInFSM, refreshContext } = useFSM()

  if (loading) {
    return (
      <div className="sap-card mb-4">
        <div className="sap-card-header">
          <h3 className="sap-card-title flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--sap-color-primary)' }} />
            FSM Context
          </h3>
        </div>
        <div className="sap-card-content">
          <p style={{ color: 'var(--sap-text-color-secondary)' }}>Initializing FSM context...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sap-card mb-4" style={{ borderColor: 'var(--sap-color-error)' }}>
        <div className="sap-card-header">
          <h3 className="sap-card-title flex items-center gap-2">
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--sap-color-error)' }} />
            FSM Context Error
          </h3>
        </div>
        <div className="sap-card-content">
          <p style={{ color: 'var(--sap-color-error)' }}>{error}</p>
          <button 
            className="sap-button-secondary mt-2"
            onClick={refreshContext}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!isRunningInFSM) {
    return (
      <div className="sap-card mb-4" style={{ borderColor: 'var(--sap-color-warning)' }}>
        <div className="sap-card-header">
          <h3 className="sap-card-title flex items-center gap-2">
            <Info className="w-5 h-5" style={{ color: 'var(--sap-color-warning)' }} />
            FSM Context
          </h3>
        </div>
        <div className="sap-card-content">
          <p style={{ color: 'var(--sap-text-color-secondary)' }}>
            Running in standalone mode (not within FSM)
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--sap-text-color-muted)' }}>
            Using mock data and environment variables for development
          </p>
        </div>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="sap-card mb-4" style={{ borderColor: 'var(--sap-color-warning)' }}>
        <div className="sap-card-header">
          <h3 className="sap-card-title flex items-center gap-2">
            <AlertCircle className="w-5 h-5" style={{ color: 'var(--sap-color-warning)' }} />
            FSM Context
          </h3>
        </div>
        <div className="sap-card-content">
          <p style={{ color: 'var(--sap-text-color-secondary)' }}>
            Running in FSM but context not available
          </p>
          <button 
            className="sap-button-secondary mt-2"
            onClick={refreshContext}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sap-card mb-4" style={{ borderColor: 'var(--sap-color-success)' }}>
      <div className="sap-card-header">
        <h3 className="sap-card-title flex items-center gap-2">
          <CheckCircle className="w-5 h-5" style={{ color: 'var(--sap-color-success)' }} />
          FSM Context
        </h3>
      </div>
      <div className="sap-card-content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>Account</p>
            <p style={{ color: 'var(--sap-text-color-secondary)' }}>
              {context.accountName} ({context.accountId})
            </p>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>Company</p>
            <p style={{ color: 'var(--sap-text-color-secondary)' }}>
              {context.companyName} ({context.companyId})
            </p>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>User</p>
            <p style={{ color: 'var(--sap-text-color-secondary)' }}>
              {context.currentUser.name}
              {context.currentUser.email && ` (${context.currentUser.email})`}
            </p>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>Tenant</p>
            <p style={{ color: 'var(--sap-text-color-secondary)' }}>
              {context.tenant}
            </p>
          </div>
        </div>
        <button 
          className="sap-button-secondary mt-3"
          onClick={refreshContext}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          Refresh Context
        </button>
      </div>
    </div>
  )
}
