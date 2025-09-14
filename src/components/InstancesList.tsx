import React, { useState, useEffect } from 'react'
import { 
  ExternalLink, 
  Settings, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import type { AppointmentInstance } from '../types/appointment'
import { cloudAppointmentService } from '../services/cloudAppointmentService'

interface InstancesListProps {
  // No props needed as instances are tenant-specific
}

export const InstancesList: React.FC<InstancesListProps> = () => {
  const [instances, setInstances] = useState<AppointmentInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetInstances = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await cloudAppointmentService.getAllInstancesForTenant()
      setInstances(result)
    } catch (err) {
      setError('Failed to fetch appointment instances')
      console.error('Instances fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch instances when component mounts
  useEffect(() => {
    handleGetInstances()
  }, [])

  const handleOpenInstance = (instance: AppointmentInstance) => {
    // Open customer URL in new tab
    window.open(instance.customerUrl, '_blank')
    console.log('Opened customer URL:', instance.customerUrl)
  }

  const getInstanceStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <span className="sap-badge" style={{ background: '#fff3e0', color: '#f57c00', borderColor: '#ffcc02' }}>Pending</span>
      case 'active':
        return <span className="sap-badge" style={{ background: '#e3f2fd', color: '#1976d2', borderColor: '#bbdefb' }}>Active</span>
      case 'scheduled':
        return <span className="sap-badge" style={{ background: '#f3e5f5', color: '#7b1fa2', borderColor: '#e1bee7' }}>Scheduled</span>
      case 'confirmed':
        return <span className="sap-badge" style={{ background: '#e8f5e8', color: '#2e7d32', borderColor: '#c8e6c9' }}>Confirmed</span>
      case 'rejected':
        return <span className="sap-badge" style={{ background: '#ffebee', color: '#c62828', borderColor: '#ffcdd2' }}>Rejected</span>
      case 'expired':
        return <span className="sap-badge" style={{ background: '#f5f5f5', color: '#666', borderColor: '#ddd' }}>Expired</span>
      default:
        return <span className="sap-badge sap-badge-status">{status}</span>
    }
  }

  const getInstanceStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4" style={{ color: '#f57c00' }} />
      case 'active':
        return <Clock className="w-4 h-4" style={{ color: '#1976d2' }} />
      case 'scheduled':
        return <Clock className="w-4 h-4" style={{ color: '#7b1fa2' }} />
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" style={{ color: '#2e7d32' }} />
      case 'rejected':
        return <XCircle className="w-4 h-4" style={{ color: '#c62828' }} />
      case 'expired':
        return <AlertTriangle className="w-4 h-4" style={{ color: '#666' }} />
      default:
        return <Clock className="w-4 h-4" style={{ color: 'var(--sap-text-color-secondary)' }} />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 0) {
      return 'Expired'
    } else if (diffHours < 24) {
      return `${diffHours}h remaining`
    } else {
      const diffDays = Math.ceil(diffHours / 24)
      return `${diffDays}d remaining`
    }
  }

  const renderInstancesTable = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--sap-text-color)' }}>All Appointment Instances</h3>
          {instances.length > 0 && (
            <span className="text-sm" style={{ color: 'var(--sap-text-color-secondary)' }}>
              {instances.length} {instances.length === 1 ? 'instance' : 'instances'}
            </span>
          )}
        </div>
        
        {instances.length > 0 ? (
          <div className="overflow-x-auto sap-table">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-20">Actions</th>
                  <th className="w-12">Status</th>
                  <th>Activity Code</th>
                  <th>Activity Subject</th>
                  <th>Customer Name</th>
                  <th>Customer Email</th>
                  <th>Created</th>
                  <th>Valid Until</th>
                  <th>Customer Response</th>
                </tr>
              </thead>
              <tbody>
                {instances.map((instance) => (
                  <tr key={instance.instanceId}>
                    <td>
                      <button
                        onClick={() => handleOpenInstance(instance)}
                        className="sap-button"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        title="Open customer booking page"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getInstanceStatusIcon(instance.status)}
                        {getInstanceStatusBadge(instance.status)}
                      </div>
                    </td>
                    <td style={{ color: 'var(--sap-text-color-secondary)' }}>
                      {instance.fsmActivity.activityCode || 'N/A'}
                    </td>
                    <td style={{ color: 'var(--sap-text-color)' }}>
                      {instance.fsmActivity.subject || 'No Subject'}
                    </td>
                    <td style={{ color: 'var(--sap-text-color)' }}>
                      {instance.customerBooking?.customerName || 'N/A'}
                    </td>
                    <td style={{ color: 'var(--sap-text-color-secondary)' }}>
                      {instance.customerBooking?.customerEmail || 'N/A'}
                    </td>
                    <td style={{ color: 'var(--sap-text-color-secondary)' }}>
                      {instance.createdAt ? formatDate(instance.createdAt) : 'N/A'}
                    </td>
                    <td style={{ color: 'var(--sap-text-color-secondary)' }}>
                      {instance.validUntil ? formatExpiryDate(instance.validUntil) : 'N/A'}
                    </td>
                    <td>
                      {instance.customerBooking ? (
                        <span className="sap-badge" style={{ background: '#e3f2fd', color: '#1976d2', borderColor: '#bbdefb' }}>
                          Submitted
                        </span>
                      ) : (
                        <span className="sap-badge" style={{ background: '#f5f5f5', color: '#666', borderColor: '#ddd' }}>
                          No Response
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--sap-text-color-secondary)', border: '1px solid var(--sap-border-color)', borderRadius: '8px' }}>
            No appointment instances found
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Instances Table */}
      <div className="sap-card">
        <div className="sap-card-header">
          <div className="flex items-center justify-between">
            <h2 className="sap-card-title">Appointment Instances</h2>
            <Settings className="sap-icon" style={{ color: 'var(--sap-color-primary)' }} />
          </div>
        </div>
        <div className="sap-card-content">
          {renderInstancesTable()}

          {loading && (
            <div className="text-center py-8 p-4" style={{ color: 'var(--sap-text-color-secondary)' }}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading appointment instances...
            </div>
          )}

          {error && (
            <div className="p-4 m-4" style={{ background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '8px' }}>
              <div className="flex items-center gap-2" style={{ color: '#c62828' }}>
                <AlertCircle className="w-4 h-4" />
                <p className="font-medium">Error: {error}</p>
              </div>
            </div>
          )}

          <div className="p-4 border-t" style={{ borderColor: 'var(--sap-border-color-light)', background: '#f8f9fa' }}>
            <button
              onClick={handleGetInstances}
              disabled={loading}
              className="sap-button w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Instances...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Instances
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {instances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="sap-card">
            <div className="sap-card-content">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ background: '#fff3e0' }}>
                  <Clock className="w-5 h-5" style={{ color: '#f57c00' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--sap-text-color-secondary)' }}>Pending</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                    {instances.filter(i => i.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sap-card">
            <div className="sap-card-content">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ background: '#e8f5e8' }}>
                  <CheckCircle className="w-5 h-5" style={{ color: '#2e7d32' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--sap-text-color-secondary)' }}>Approved</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                    {instances.filter(i => i.status === 'CONFIRMED').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sap-card">
            <div className="sap-card-content">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ background: '#ffebee' }}>
                  <XCircle className="w-5 h-5" style={{ color: '#c62828' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--sap-text-color-secondary)' }}>Rejected</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                    {instances.filter(i => i.status === 'REJECTED').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sap-card">
            <div className="sap-card-content">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ background: '#f3e5f5' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: '#7b1fa2' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--sap-text-color-secondary)' }}>Expired</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                    {instances.filter(i => i.status === 'EXPIRED').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
