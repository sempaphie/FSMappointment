import React, { useState, useEffect } from 'react'
import { activitiesService, awsAppointmentService, type FSMActivity } from '../services'
import { AlertCircle, Loader2, RefreshCw, Settings, Info, Plus, X } from 'lucide-react'
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
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [tooltipInstance, setTooltipInstance] = useState<AppointmentInstance | null>(null)

  const handleGetActivities = async (existingActivityIds: string[] = []) => {
    setLoading(true)
    setError(null)

    try {
      const result = await activitiesService.getActivities(bearerToken, existingActivityIds)

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

  const handleRefreshActivities = async () => {
    // Get current existing activity IDs from appointment requests
    const currentExistingIds = Array.from(appointmentRequests)
    await handleGetActivities(currentExistingIds)
  }

  // Load existing appointment instances first, then activities
  useEffect(() => {
    const loadData = async () => {
      if (!bearerToken) return
      
      try {
        console.log('Loading appointment instances...')
        const instances = await awsAppointmentService.getAllInstancesForTenant()
        console.log('Loaded appointment instances:', instances)
        setAppointmentInstances(instances)
        
        // Update appointment requests set based on existing instances
        // Handle both 'activityId' and 'id' fields in fsmActivity
        const existingActivityIds = instances.map(instance => {
          const activityId = instance.fsmActivity.activityId || instance.fsmActivity.id
          console.log('Instance activity ID:', activityId, 'from fsmActivity:', instance.fsmActivity)
          return activityId
        }).filter((id): id is string => Boolean(id)) // Remove any undefined values and ensure string type
        console.log('Existing activity IDs with appointments:', existingActivityIds)
        setAppointmentRequests(new Set(existingActivityIds))
        
        // Now load activities with existing activity IDs for proper filtering
        await handleGetActivities(existingActivityIds)
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    
    loadData()
  }, [bearerToken])

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
    
    // Find the appointment instance for this activity
    const instance = appointmentInstances.find(inst => {
      const instActivityId = inst.fsmActivity.activityId || inst.fsmActivity.id
      return instActivityId === activityId
    })

    if (instance) {
      // If customerUrl is null or empty, construct it from the customerAccessToken
      let urlToOpen = instance.customerUrl
      if (!urlToOpen && instance.customerAccessToken) {
        urlToOpen = `https://main.d354vm8a3zuelv.amplifyapp.com/booking/${instance.customerAccessToken}`
      }

      if (urlToOpen) {
        // Open customer URL in new tab
        window.open(urlToOpen, '_blank')
      } else {
        alert('No customer URL available for this appointment instance')
      }
    } else {
      alert(`No appointment instance found for activity: ${activityId}`)
    }
  }

  const handleShowInstanceInfo = (activity: FSMActivity, event: React.MouseEvent) => {
    console.log('handleShowInstanceInfo called for activity:', activity)
    const activityId = activity.id || `activity-${activities.indexOf(activity)}`
    console.log('Looking for activityId:', activityId)
    console.log('Available appointment instances:', appointmentInstances.length)
    
    // Find the appointment instance for this activity
    const instance = appointmentInstances.find(inst => {
      const instActivityId = inst.fsmActivity.activityId || inst.fsmActivity.id
      console.log('Comparing:', instActivityId, '===', activityId, '=', instActivityId === activityId)
      return instActivityId === activityId
    })

    console.log('Found instance:', instance)

    if (instance) {
      // Get button position for tooltip placement
      const buttonRect = event.currentTarget.getBoundingClientRect()
      setTooltipPosition({
        x: buttonRect.right + 10, // Position to the right of the button
        y: buttonRect.top
      })
      setTooltipInstance(instance)
      console.log('Setting tooltip position and instance')
    } else {
      console.log('No instance found for activity:', activityId)
      console.log('Available instances:', appointmentInstances.map(inst => inst.fsmActivity.activityId || inst.fsmActivity.id))
    }
  }

  const handleHideTooltip = () => {
    setTooltipPosition(null)
    setTooltipInstance(null)
  }

  const getAppointmentStatusButton = (activity: FSMActivity) => {
    const activityId = activity.id || `activity-${activities.indexOf(activity)}`
    
    // Find the appointment instance for this activity
    const instance = appointmentInstances.find(inst => {
      const instActivityId = inst.fsmActivity.activityId || inst.fsmActivity.id
      return instActivityId === activityId
    })

    if (!instance) {
      return null
    }

    // Calculate days remaining
    const now = new Date()
    const validUntil = new Date(instance.validUntil)
    const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // Determine status and styling
    if (instance.status === 'PENDING') {
      const buttonStyle = {
        background: '#0070f3',
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer'
      }
      
      return (
        <button 
          style={buttonStyle}
          onClick={() => handleOpenInstance(activity)}
          title="Click to open customer booking page"
        >
          Pending {daysRemaining} days
        </button>
      )
    } else if (instance.status === 'SUBMITTED') {
      const buttonStyle = {
        background: '#00a650',
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer'
      }
      
      return (
        <button 
          style={buttonStyle}
          onClick={() => handleOpenInstance(activity)}
          title="Click to open customer booking page"
        >
          Submitted
        </button>
      )
    } else {
      // Other statuses (APPROVED, REJECTED, etc.)
      const buttonStyle = {
        background: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer'
      }
      
      return (
        <button 
          style={buttonStyle}
          onClick={() => handleOpenInstance(activity)}
          title="Click to open customer booking page"
        >
          {instance.status}
        </button>
      )
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


  const getActivityId = (activity: FSMActivity) => {
    return activity.id || 'N/A'
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
    showStatusButton: boolean = false
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
                  {showStatusButton && (
                    <th className="w-40">
                      Status
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
                  <th>Activity ID</th>
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
                      {showStatusButton && (
                        <td>
                          {getAppointmentStatusButton(activity)}
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
                        <button
                          onClick={(e) => {
                            console.log('Info button clicked for activity:', activity)
                            handleShowInstanceInfo(activity, e)
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View appointment details"
                        >
                          <Info className="sap-icon" />
                        </button>
                      </td>
                      <td>
                        <span className="sap-link">
                          {getActivityId(activity)}
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
              true // showStatusButton
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
              onClick={handleRefreshActivities}
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

      {/* Appointment Instance Tooltip */}
      {tooltipPosition && tooltipInstance && (
        <div
          data-tooltip
          className="fixed z-50 rounded-lg shadow-lg border border-gray-300 p-4 max-w-sm"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
          onMouseLeave={handleHideTooltip}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">
              {tooltipInstance.fsmActivity.id || tooltipInstance.fsmActivity.activityId || 'Activity'}
            </h3>
            <button
              onClick={handleHideTooltip}
              className="text-gray-400 hover:text-gray-600 ml-2 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-2 text-xs">
            {/* Subject */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Subject:</span>
              <span className="text-gray-900">{tooltipInstance.fsmActivity.subject || 'N/A'}</span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                tooltipInstance.status === 'PENDING' 
                  ? 'bg-blue-100 text-blue-800' 
                  : tooltipInstance.status === 'SUBMITTED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {tooltipInstance.status}
              </span>
            </div>

            {/* Business Partner */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Business Partner:</span>
              <span className="text-gray-900">{tooltipInstance.fsmActivity.businessPartner || 'N/A'}</span>
            </div>

            {/* Equipment */}
            {tooltipInstance.fsmActivity.equipment && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">Equipment:</span>
                  <span className="text-gray-900">{tooltipInstance.fsmActivity.equipment.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">Code:</span>
                  <span className="text-blue-600 underline">{tooltipInstance.fsmActivity.equipment.code || 'N/A'}</span>
                </div>
              </div>
            )}

            {/* Valid Until */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Valid Until:</span>
              <span className="text-gray-900">{format(new Date(tooltipInstance.validUntil), 'dd.MM.yyyy HH:mm')}</span>
            </div>

            {/* Customer Booking Info */}
            {tooltipInstance.customerBooking && (
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">Customer:</span>
                  <span className="text-gray-900">{tooltipInstance.customerBooking.customerName}</span>
                </div>
                {tooltipInstance.customerBooking.requestedDateTime && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium">Requested:</span>
                    <span className="text-gray-900">{format(new Date(tooltipInstance.customerBooking.requestedDateTime), 'dd.MM.yyyy HH:mm')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  const activity = activities.find(a => 
                    (a.id || `activity-${activities.indexOf(a)}`) === (tooltipInstance.fsmActivity.id || tooltipInstance.fsmActivity.activityId)
                  )
                  if (activity) {
                    handleOpenInstance(activity)
                    handleHideTooltip()
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded font-medium transition-colors"
              >
                Open Customer Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}