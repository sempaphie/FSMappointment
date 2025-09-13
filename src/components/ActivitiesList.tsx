import React, { useState, useEffect } from 'react'
import { activitiesService, awsAppointmentService, type FSMActivity } from '../services'
import { AlertCircle, Loader2, RefreshCw, Settings, Info, Plus, ExternalLink } from 'lucide-react'
import type { AppointmentInstance } from '../types'
import { format } from 'date-fns'

interface ActivitiesListProps {
  bearerToken: string
}

export const ActivitiesList: React.FC<ActivitiesListProps> = ({ bearerToken }) => {
  const [activities, setActivities] = useState<FSMActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [appointmentLoading, setAppointmentLoading] = useState(false)
  const [appointmentRequests, setAppointmentRequests] = useState<Set<string>>(new Set())
  const [appointmentInstances, setAppointmentInstances] = useState<AppointmentInstance[]>([])

  const handleGetActivities = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await activitiesService.getActivities(bearerToken)

      if (result.success && result.activities) {
        setActivities(result.activities)
      } else {
        setError(result.error || 'Failed to fetch activities')
        console.error('Activities fetch error:', result.details)
      }
    } catch (err) {
      setError('Unexpected error occurred')
      console.error('Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch activities when component mounts or token changes
  useEffect(() => {
    if (bearerToken) {
      handleGetActivities()
    }
  }, [bearerToken])

  // Load existing appointment instances
  useEffect(() => {
    const loadAppointmentInstances = async () => {
      try {
        const instances = await awsAppointmentService.getAllInstancesForTenant()
        setAppointmentInstances(instances)
        
        // Update appointment requests set based on existing instances
        const existingActivityIds = instances.map(instance => instance.fsmActivity.activityId)
        setAppointmentRequests(new Set(existingActivityIds))
      } catch (error) {
        console.error('Error loading appointment instances:', error)
      }
    }
    
    loadAppointmentInstances()
  }, [])

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = activities.map(activity => activity.id || `activity-${activities.indexOf(activity)}`)
      setSelectedActivities(new Set(allIds))
    } else {
      setSelectedActivities(new Set())
    }
  }

  const handleSelectActivity = (activityId: string, checked: boolean) => {
    const newSelected = new Set(selectedActivities)
    if (checked) {
      newSelected.add(activityId)
    } else {
      newSelected.delete(activityId)
    }
    setSelectedActivities(newSelected)
  }

  const handleGenerateAppointmentRequests = async () => {
    if (selectedActivities.size === 0) {
      alert('Please select at least one activity to generate appointment requests.')
      return
    }

    setAppointmentLoading(true)
    try {
      const selectedActivitiesData = activities.filter(activity => {
        const activityId = activity.id || `activity-${activities.indexOf(activity)}`
        return selectedActivities.has(activityId)
      })

      console.log('Generating appointment requests for:', selectedActivitiesData)
      
      // Create appointment instances using the cloud-ready service
      const result = await awsAppointmentService.createAppointmentInstances({
        activityIds: selectedActivitiesData.map(activity => activity.id || `activity-${activities.indexOf(activity)}`),
        activities: selectedActivitiesData.map(activity => ({
          id: activity.id || `activity-${activities.indexOf(activity)}`,
          code: activity.code || 'N/A',
          subject: activity.subject || 'No Subject',
          status: activity.status || 'Unknown',
          businessPartner: activity.businessPartner || 'Unknown',
          object: activity.object
        }))
      })
      
      if (result.success && result.instances) {
        // Update state with new instances
        setAppointmentInstances(prev => [...prev, ...result.instances!])
        
        // Move selected activities to appointment requests
        const newAppointmentRequests = new Set([...appointmentRequests, ...selectedActivities])
        setAppointmentRequests(newAppointmentRequests)
        
        // Clear selection after successful generation
        setSelectedActivities(new Set())
        
        // Show success message with customer URLs
        const customerUrls = result.customerUrls || []
        const message = `Successfully created ${result.instances.length} appointment request(s)!\n\nCustomer URLs:\n${customerUrls.join('\n')}`
        alert(message)
      } else {
        alert(`Error creating appointment requests: ${result.error || 'Unknown error'}`)
      }
      
    } catch (error) {
      console.error('Error generating appointment requests:', error)
      alert('Error generating appointment requests. Please try again.')
    } finally {
      setAppointmentLoading(false)
    }
  }

  const handleOpenInstance = (activity: FSMActivity) => {
    const activityId = activity.id || `activity-${activities.indexOf(activity)}`
    console.log('Opening instance for activity:', activity)
    
    // Find the appointment instance for this activity
    const instance = appointmentInstances.find(inst => 
      inst.fsmActivity.activityId === activityId
    )
    
    if (instance) {
      // Open customer URL in new tab
      window.open(instance.customerUrl, '_blank')
      console.log('Opened customer URL:', instance.customerUrl)
    } else {
      alert(`No appointment instance found for activity: ${activity.code || activityId}`)
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return <span className="sap-badge sap-badge-status">Unknown</span>
    
    switch (status.toUpperCase()) {
      case 'OPEN':
        return <span className="sap-badge" style={{ background: '#e3f2fd', color: '#1976d2', borderColor: '#bbdefb' }}>Ready to Plan</span>
      case 'DRAFT':
        return <span className="sap-badge" style={{ background: '#fff3e0', color: '#f57c00', borderColor: '#ffcc02' }}>Draft</span>
      case 'CLOSED':
        return <span className="sap-badge" style={{ background: '#e8f5e8', color: '#2e7d32', borderColor: '#c8e6c9' }}>Closed</span>
      case 'IN_PROGRESS':
        return <span className="sap-badge" style={{ background: '#f3e5f5', color: '#7b1fa2', borderColor: '#e1bee7' }}>In Progress</span>
      default:
        return <span className="sap-badge sap-badge-status">{status}</span>
    }
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return <span className="sap-badge sap-badge-priority-medium">Medium</span>
    
    switch (priority.toUpperCase()) {
      case 'HIGH':
        return <span className="sap-badge" style={{ background: '#ffebee', color: '#c62828', borderColor: '#ffcdd2' }}>High</span>
      case 'MEDIUM':
        return <span className="sap-badge sap-badge-priority-medium">Medium</span>
      case 'LOW':
        return <span className="sap-badge" style={{ background: '#e8f5e8', color: '#2e7d32', borderColor: '#c8e6c9' }}>Low</span>
      default:
        return <span className="sap-badge sap-badge-priority-medium">{priority}</span>
    }
  }

  const getTypeBadge = (type?: string) => {
    if (!type) return <span className="sap-badge sap-badge-type-maintenance">Maintenance</span>
    
    switch (type.toUpperCase()) {
      case 'ASSIGNMENT':
        return <span className="sap-badge" style={{ background: '#e1f5fe', color: '#0277bd', borderColor: '#b3e5fc' }}>Assignment</span>
      case 'REPAIR':
        return <span className="sap-badge" style={{ background: '#fff3e0', color: '#ef6c00', borderColor: '#ffcc02' }}>Reparatur</span>
      case 'MAINTENANCE':
        return <span className="sap-badge sap-badge-type-maintenance">Maintenance</span>
      default:
        return <span className="sap-badge sap-badge-type-maintenance">{type}</span>
    }
  }

  const getServiceCallCode = (activity: FSMActivity) => {
    return activity.object?.objectId?.slice(-7) || activity.id?.slice(-7) || 'N/A'
  }

  const getServiceCallSubject = (activity: FSMActivity) => {
    return activity.subject || 'No Subject'
  }

  // Helper functions for date formatting
  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return 'N/A'
    try {
      return format(new Date(dateTimeString), 'dd.MM.yyyy HH:mm')
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const getStartDateTime = (activity: FSMActivity) => {
    // If activity.earliestStartDateTime is not null then this else serviceCall.startDateTime
    return activity.earliestStartDateTime || activity.serviceCall?.startDateTime || activity.startDateTime
  }

  const getEndDateTime = (activity: FSMActivity) => {
    // If activity.latestStartDateTime is not null then this else serviceCall.endDateTime
    return activity.latestStartDateTime || activity.serviceCall?.endDateTime || activity.endDateTime
  }

  // Filter activities based on appointment request status
  const activitiesWithAppointmentRequests = activities.filter(activity => {
    const activityId = activity.id || `activity-${activities.indexOf(activity)}`
    return appointmentRequests.has(activityId)
  })

  const activitiesWithoutAppointmentRequests = activities.filter(activity => {
    const activityId = activity.id || `activity-${activities.indexOf(activity)}`
    return !appointmentRequests.has(activityId)
  })

  // Reusable table component
  const renderActivitiesTable = (
    title: string,
    activitiesList: FSMActivity[],
    showSelection: boolean = false,
    selectionState?: Set<string>,
    onSelectionChange?: (activityId: string, checked: boolean) => void,
    onSelectAll?: (checked: boolean) => void,
    showOpenButton: boolean = false
  ) => {
    const hasSelection = showSelection && selectionState && onSelectionChange && onSelectAll

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--sap-text-color)' }}>{title}</h3>
          {activitiesList.length > 0 && (
            <span className="text-sm" style={{ color: 'var(--sap-text-color-secondary)' }}>
              {activitiesList.length} {activitiesList.length === 1 ? 'activity' : 'activities'}
            </span>
          )}
        </div>
        
        {activitiesList.length > 0 ? (
          <div className="overflow-x-auto sap-table">
            <table className="w-full">
              <thead>
                <tr>
                  {showOpenButton && (
                    <th className="w-20">
                      {/* Open Instance column */}
                    </th>
                  )}
                  {hasSelection && (
                    <th className="w-12">
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={selectionState.size === activitiesList.length && activitiesList.length > 0}
                        onChange={(e) => onSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="w-12">
                    {/* Info column */}
                  </th>
                  <th>Service Call Code</th>
                  <th>Service Call Subject</th>
                  <th>Priority</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {activitiesList.map((activity) => {
                  const activityId = activity.id || `activity-${activities.indexOf(activity)}`
                  const isSelected = hasSelection && selectionState.has(activityId)
                  
                  return (
                    <tr key={activityId} className={isSelected ? 'selected' : ''}>
                      {showOpenButton && (
                        <td>
                          <button
                            onClick={() => handleOpenInstance(activity)}
                            className="sap-button"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </button>
                        </td>
                      )}
                      {hasSelection && (
                        <td>
                          <input 
                            type="checkbox" 
                            className="rounded" 
                            checked={isSelected}
                            onChange={(e) => onSelectionChange(activityId, e.target.checked)}
                          />
                        </td>
                      )}
                      <td>
                        <Info className="sap-icon" />
                      </td>
                      <td>
                        <span className="sap-link">
                          {getServiceCallCode(activity)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--sap-text-color)' }}>
                        {getServiceCallSubject(activity)}
                      </td>
                      <td>
                        {getPriorityBadge(activity.priority)}
                      </td>
                      <td style={{ color: 'var(--sap-text-color-secondary)' }}>
                        {formatDateTime(getStartDateTime(activity))}
                      </td>
                      <td style={{ color: 'var(--sap-text-color-secondary)' }}>
                        {formatDateTime(getEndDateTime(activity))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--sap-text-color-secondary)', border: '1px solid var(--sap-border-color)', borderRadius: '8px' }}>
            No activities found
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Appointment Requests Table */}
      {activitiesWithAppointmentRequests.length > 0 && (
        <div className="sap-card">
          <div className="sap-card-header">
            <div className="flex items-center justify-between">
              <h2 className="sap-card-title">Appointment Requests</h2>
              <Settings className="sap-icon" style={{ color: 'var(--sap-color-primary)' }} />
            </div>
          </div>
          <div className="sap-card-content">
            {renderActivitiesTable(
              "Activities with Appointment Requests",
              activitiesWithAppointmentRequests,
              false,
              undefined,
              undefined,
              undefined,
              true // showOpenButton
            )}
          </div>
        </div>
      )}

      {/* Main Activities Table */}
      <div className="sap-card">
        <div className="sap-card-header">
          <div className="flex items-center justify-between">
            <h2 className="sap-card-title">Available Activities</h2>
            <Settings className="sap-icon" style={{ color: 'var(--sap-color-primary)' }} />
          </div>
        </div>
      
        <div className="sap-card-content">
          {/* Appointment Request Button */}
          {activitiesWithoutAppointmentRequests.length > 0 && (
            <div className="p-4 border-b" style={{ borderColor: 'var(--sap-border-color-light)', background: '#f8f9fa' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--sap-text-color-secondary)' }}>
                    {selectedActivities.size} of {activitiesWithoutAppointmentRequests.length} activities selected
                  </span>
                </div>
                <button
                  onClick={handleGenerateAppointmentRequests}
                  disabled={selectedActivities.size === 0 || appointmentLoading}
                  className="sap-button"
                >
                  {appointmentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Appointment Requests
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {renderActivitiesTable(
            "Available Activities for Appointment Requests",
            activitiesWithoutAppointmentRequests,
            true,
            selectedActivities,
            handleSelectActivity,
            handleSelectAll
          )}

          {activities.length === 0 && !loading && !error && (
            <div className="text-center py-8 p-4" style={{ color: 'var(--sap-text-color-secondary)' }}>
              No activities found.
            </div>
          )}

          {loading && (
            <div className="text-center py-8 p-4" style={{ color: 'var(--sap-text-color-secondary)' }}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading activities...
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
              onClick={handleGetActivities}
              disabled={loading}
              className="sap-button w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Activities...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Activities
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}