import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { amplifyAppointmentService } from '../services'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui'
import { Button } from '../components/ui/Button'
import { AlertCircle, Loader2, CheckCircle, Calendar, Clock, User, MessageSquare } from 'lucide-react'
import type { AppointmentInstance, TimeSlot, UpdateCustomerBookingRequest } from '../types'

export const CustomerBooking: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [appointmentInstance, setAppointmentInstance] = useState<AppointmentInstance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerMessage: '',
    specialRequirements: ''
  })
  
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([])

  // Load appointment instance
  useEffect(() => {
    const loadAppointmentInstance = async () => {
      if (!token) {
        setError('Invalid booking link')
        setLoading(false)
        return
      }

      try {
        const result = await amplifyAppointmentService.getAppointmentInstanceByToken(token)
        
        if (result.success && result.instance) {
          setAppointmentInstance(result.instance)
          
          // Generate available time slots
          const timeSlots = amplifyAppointmentService.generateAvailableTimeSlots()
          setAvailableTimeSlots(timeSlots)
          
          // Pre-fill form if customer already submitted
          if (result.instance.customerBooking) {
            const booking = result.instance.customerBooking
            setFormData({
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              customerPhone: booking.customerPhone || '',
              customerMessage: booking.customerMessage || '',
              specialRequirements: booking.specialRequirements || ''
            })
            setSelectedTimeSlots(booking.preferredTimeSlots)
            
            if (booking.status === 'submitted' || booking.status === 'approved') {
              setSubmitted(true)
            }
          }
        } else {
          setError(result.error || 'Appointment instance not found')
        }
      } catch (err) {
        setError('Failed to load appointment details')
        console.error('Error loading appointment instance:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAppointmentInstance()
  }, [token])

  const handleTimeSlotToggle = (slot: TimeSlot) => {
    setSelectedTimeSlots(prev => {
      const isSelected = prev.some(s => s.id === slot.id)
      if (isSelected) {
        return prev.filter(s => s.id !== slot.id)
      } else {
        return [...prev, { ...slot, isSelected: true }]
      }
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!appointmentInstance || !token) return
    
    if (!formData.customerName || !formData.customerEmail) {
      alert('Please fill in your name and email address')
      return
    }
    
    if (selectedTimeSlots.length === 0) {
      alert('Please select at least one preferred time slot')
      return
    }

    setSubmitting(true)
    try {
      const bookingData: UpdateCustomerBookingRequest = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone || undefined,
        selectedTimeSlots: selectedTimeSlots,
        customerMessage: formData.customerMessage || undefined,
        specialRequirements: formData.specialRequirements || undefined
      }

      const result = await amplifyAppointmentService.updateCustomerBooking(token, bookingData)
      
      if (result.success) {
        setSubmitted(true)
        alert('Your appointment request has been submitted successfully! We will contact you soon to confirm the details.')
      } else {
        alert(`Error submitting request: ${result.error}`)
      }
    } catch (error) {
      console.error('Error submitting booking:', error)
      alert('Error submitting request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!appointmentInstance) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Found</h2>
            <p className="text-gray-600">Appointment instance not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Your Appointment</h1>
          <p className="text-gray-600">Please fill out the form below to request your preferred appointment time</p>
        </div>

        {/* Service Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Activity Code</p>
                <p className="font-semibold">{appointmentInstance.fsmActivity.activityCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Service Call ID</p>
                <p className="font-semibold">{appointmentInstance.fsmActivity.serviceCallId}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Service Description</p>
                <p className="font-semibold">{appointmentInstance.fsmActivity.subject}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        {submitted ? (
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Request Submitted!</h2>
              <p className="text-gray-600 mb-4">
                Thank you for your appointment request. We will review your preferences and contact you soon to confirm the details.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Your Request Summary:</h3>
                <p><strong>Name:</strong> {formData.customerName}</p>
                <p><strong>Email:</strong> {formData.customerEmail}</p>
                {formData.customerPhone && <p><strong>Phone:</strong> {formData.customerPhone}</p>}
                <p><strong>Preferred Times:</strong> {selectedTimeSlots.length} time slot(s) selected</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Customer Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Slot Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Preferred Appointment Times
                </CardTitle>
                <p className="text-sm text-gray-600">Select one or more preferred time slots</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableTimeSlots.map((slot) => {
                    const isSelected = selectedTimeSlots.some(s => s.id === slot.id)
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleTimeSlotToggle(slot)}
                        className={`p-3 text-left border rounded-lg transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-medium">{formatDate(slot.startTime)}</div>
                        <div className="text-sm text-gray-600">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (Optional)
                    </label>
                    <textarea
                      value={formData.customerMessage}
                      onChange={(e) => handleInputChange('customerMessage', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional information or questions..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Requirements (Optional)
                    </label>
                    <textarea
                      value={formData.specialRequirements}
                      onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any special requirements or accessibility needs..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="text-center">
              <Button
                type="submit"
                disabled={submitting || selectedTimeSlots.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  'Submit Appointment Request'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
