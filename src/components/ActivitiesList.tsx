import React, { useState, useEffect } from 'react'
import { activitiesService, awsAppointmentService, type FSMActivity } from '../services'
import { AlertCircle, Loader2, RefreshCw, Settings, Info, Plus, ExternalLink, X } from 'lucide-react'
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
  const [selectedInstance, setSelectedInstance] = useState<AppointmentInstance | null>(null)
  const [showInstanceModal, setShowInstanceModal] = useState(false)

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

  const handleShowInstanceInfo = (activity: FSMActivity) => {
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
      console.log('Setting selectedInstance and showing modal')
      setSelectedInstance(instance)
      setShowInstanceModal(true)
    } else {
      console.log('No instance found for activity:', activityId)
      console.log('Available instances:', appointmentInstances.map(inst => inst.fsmActivity.activityId || inst.fsmActivity.id))
    }
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
                          onClick={() => {
                            console.log('Info button clicked for activity:', activity)
                            handleShowInstanceInfo(activity)
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

      {/* Appointment Instance Modal */}
      {showInstanceModal && selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                  Appointment Instance Details
                </h2>
                <button
                  onClick={() => setShowInstanceModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Activity Information */}
                <div className="sap-card">
                  <div className="sap-card-header">
                    <h3 className="sap-card-title">Activity Information</h3>
                  </div>
                  <div className="sap-card-content">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Activity ID</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {selectedInstance.fsmActivity.id || selectedInstance.fsmActivity.activityId || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Subject</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {selectedInstance.fsmActivity.subject || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Status</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {selectedInstance.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Business Partner</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {selectedInstance.fsmActivity.businessPartner || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Equipment Information */}
                {selectedInstance.fsmActivity.equipment && (
                  <div className="sap-card">
                    <div className="sap-card-header">
                      <h3 className="sap-card-title">Equipment Information</h3>
                    </div>
                    <div className="sap-card-content">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Equipment Code</p>
                          <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                            {selectedInstance.fsmActivity.equipment.code || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Equipment Name</p>
                          <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                            {selectedInstance.fsmActivity.equipment.name || 'N/A'}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Address</p>
                          <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                            {selectedInstance.fsmActivity.equipment.address || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appointment Details */}
                <div className="sap-card">
                  <div className="sap-card-header">
                    <h3 className="sap-card-title">Appointment Details</h3>
                  </div>
                  <div className="sap-card-content">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Valid From</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {format(new Date(selectedInstance.validFrom), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Valid Until</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {format(new Date(selectedInstance.validUntil), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Created</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {format(new Date(selectedInstance.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Last Updated</p>
                        <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                          {format(new Date(selectedInstance.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Booking Information */}
                {selectedInstance.customerBooking && (
                  <div className="sap-card">
                    <div className="sap-card-header">
                      <h3 className="sap-card-title">Customer Booking</h3>
                    </div>
                    <div className="sap-card-content">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Customer Name</p>
                          <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                            {selectedInstance.customerBooking.customerName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Customer Email</p>
                          <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                            {selectedInstance.customerBooking.customerEmail}
                          </p>
                        </div>
                        {selectedInstance.customerBooking.customerPhone && (
                          <div>
                            <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Customer Phone</p>
                            <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                              {selectedInstance.customerBooking.customerPhone}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Booking Status</p>
                          <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                            {selectedInstance.customerBooking.status}
                          </p>
                        </div>
                        {selectedInstance.customerBooking.requestedDateTime && (
                          <div>
                            <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Requested Date</p>
                            <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                              {format(new Date(selectedInstance.customerBooking.requestedDateTime), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        )}
                        {selectedInstance.customerBooking.customerMessage && (
                          <div className="md:col-span-2">
                            <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Customer Message</p>
                            <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                              {selectedInstance.customerBooking.customerMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowInstanceModal(false)}
                  className="sap-button"
                  style={{ background: '#6c757d', color: 'white' }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const activity = activities.find(a => 
                      (a.id || `activity-${activities.indexOf(a)}`) === (selectedInstance.fsmActivity.id || selectedInstance.fsmActivity.activityId)
                    )
                    if (activity) {
                      handleOpenInstance(activity)
                    }
                  }}
                  className="sap-button"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Customer Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}