import React, { useState, useEffect } from 'react'
import { activitiesService, appointmentServiceCloud, type FSMActivity } from '../services'
import { Card, CardContent, CardHeader, CardTitle } from './ui'
import { Button } from './ui/Button'
import { AlertCircle, Loader2, RefreshCw, Settings, Info, Plus, ExternalLink } from 'lucide-react'
import type { AppointmentInstance } from '../types'

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
        const instances = await appointmentServiceCloud.getAllInstancesForTenant()
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
      const result = await appointmentServiceCloud.createAppointmentInstances({
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
    if (!status) return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Unknown</span>
    
    switch (status.toUpperCase()) {
      case 'OPEN':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Open</span>
      case 'DRAFT':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Draft</span>
      case 'CLOSED':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Closed</span>
      case 'IN_PROGRESS':
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">In Progress</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>
    }
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full border border-orange-200">Medium</span>
    
    switch (priority.toUpperCase()) {
      case 'HIGH':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full border border-red-200">High</span>
      case 'MEDIUM':
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full border border-orange-200">Medium</span>
      case 'LOW':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full border border-green-200">Low</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full border border-orange-200">{priority}</span>
    }
  }

  const getTypeBadge = (type?: string) => {
    if (!type) return <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full border border-pink-200">Assignment</span>
    
    switch (type.toUpperCase()) {
      case 'ASSIGNMENT':
        return <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full border border-pink-200">Assignment</span>
      case 'REPAIR':
        return <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full border border-pink-200">Reparatur</span>
      case 'MAINTENANCE':
        return <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full border border-pink-200">Maintenance</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full border border-pink-200">{type}</span>
    }
  }

  const getServiceCallCode = (activity: FSMActivity) => {
    return activity.object?.objectId?.slice(-7) || activity.id?.slice(-7) || 'N/A'
  }

  const getServiceCallSubject = (activity: FSMActivity) => {
    return activity.subject || 'No Subject'
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-gray-900">{title}</h3>
          {activitiesList.length > 0 && (
            <span className="text-sm text-gray-500">
              {activitiesList.length} {activitiesList.length === 1 ? 'activity' : 'activities'}
            </span>
          )}
        </div>
        
        {activitiesList.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {showOpenButton && (
                    <th className="text-left py-3 px-4 w-20">
                      {/* Open Instance column */}
                    </th>
                  )}
                  {hasSelection && (
                    <th className="text-left py-3 px-4 w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={selectionState.size === activitiesList.length && activitiesList.length > 0}
                        onChange={(e) => onSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-4 w-12">
                    {/* Info column */}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Service Call Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Service Call Subject</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Service Call Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Activity Code</th>
                </tr>
              </thead>
              <tbody>
                        {activitiesList.map((activity) => {
                  const activityId = activity.id || `activity-${activities.indexOf(activity)}`
                  const isSelected = hasSelection && selectionState.has(activityId)
                  
                  return (
                    <tr key={activityId} className={`border-b border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                      {showOpenButton && (
                        <td className="py-3 px-4">
                          <Button
                            onClick={() => handleOpenInstance(activity)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </Button>
                        </td>
                      )}
                      {hasSelection && (
                        <td className="py-3 px-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300" 
                            checked={isSelected}
                            onChange={(e) => onSelectionChange(activityId, e.target.checked)}
                          />
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <Info className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-blue-600 underline cursor-pointer">
                          {getServiceCallCode(activity)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {getServiceCallSubject(activity)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(activity.status)}
                      </td>
                      <td className="py-3 px-4">
                        {getPriorityBadge(activity.priority)}
                      </td>
                      <td className="py-3 px-4">
                        {getTypeBadge(activity.type)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {activity.code || 'N/A'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
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
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Appointment Requests</CardTitle>
              <Settings className="w-4 h-4 text-blue-600 cursor-pointer hover:text-blue-800" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {renderActivitiesTable(
              "Activities with Appointment Requests",
              activitiesWithAppointmentRequests,
              false,
              undefined,
              undefined,
              undefined,
              true // showOpenButton
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Activities Table */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Available Activities</CardTitle>
            <Settings className="w-4 h-4 text-blue-600 cursor-pointer hover:text-blue-800" />
          </div>
        </CardHeader>
      
        <CardContent className="p-0">
          {/* Appointment Request Button */}
          {activitiesWithoutAppointmentRequests.length > 0 && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedActivities.size} of {activitiesWithoutAppointmentRequests.length} activities selected
                  </span>
                </div>
                <Button
                  onClick={handleGenerateAppointmentRequests}
                  disabled={selectedActivities.size === 0 || appointmentLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                </Button>
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
            <div className="text-center py-8 text-gray-600 p-4">
              No activities found.
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-600 p-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading activities...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <p className="font-medium">Error: {error}</p>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={handleGetActivities}
              disabled={loading}
              className="w-full"
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
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}