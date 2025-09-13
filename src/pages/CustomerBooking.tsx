import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { awsAppointmentService } from '../services'
import { AlertCircle, Loader2, CheckCircle, Calendar, User, MessageSquare } from 'lucide-react'
import type { AppointmentInstance, UpdateCustomerBookingRequest } from '../types'

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
    specialRequirements: '',
    requestedDateTime: ''
  })
  

  // Load appointment instance
  useEffect(() => {
    const loadAppointmentInstance = async () => {
      if (!token) {
        setError('Invalid booking link')
        setLoading(false)
        return
      }

      try {
        const result = await awsAppointmentService.getAppointmentInstanceByToken(token)
        
        if (result.success && result.instance) {
          setAppointmentInstance(result.instance)
          
          // Pre-fill form if customer already submitted
          if (result.instance.customerBooking) {
            const booking = result.instance.customerBooking
            setFormData({
              customerName: booking.customerName,
              customerEmail: booking.customerEmail,
              customerPhone: booking.customerPhone || '',
              customerMessage: booking.customerMessage || '',
              specialRequirements: booking.specialRequirements || '',
              requestedDateTime: booking.requestedDateTime || ''
            })
            
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
    
    // Time slot selection is no longer required

    setSubmitting(true)
    try {
      const bookingData: UpdateCustomerBookingRequest = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone || undefined,
        customerMessage: formData.customerMessage || undefined,
        specialRequirements: formData.specialRequirements || undefined,
        requestedDateTime: formData.requestedDateTime || undefined
      }

      const result = await awsAppointmentService.updateCustomerBooking(token, bookingData)
      
      if (result.success) {
        setSubmitted(true)
        const message = formData.requestedDateTime 
          ? `Your appointment request for ${new Date(formData.requestedDateTime).toLocaleString()} has been submitted successfully! We will contact you soon to confirm the details.`
          : 'Your appointment request has been submitted successfully! We will contact you soon to confirm the details.'
        alert(message)
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


  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--sap-background-color)' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="sap-card" style={{ maxWidth: '400px' }}>
            <div className="sap-card-content">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--sap-color-primary)' }} />
                <p style={{ color: 'var(--sap-text-color-secondary)' }}>Loading appointment details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--sap-background-color)' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="sap-card" style={{ maxWidth: '400px' }}>
            <div className="sap-card-content">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sap-color-error)' }} />
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--sap-text-color)' }}>Error</h2>
                <p style={{ color: 'var(--sap-text-color-secondary)' }}>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!appointmentInstance) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--sap-background-color)' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="sap-card" style={{ maxWidth: '400px' }}>
            <div className="sap-card-content">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sap-color-error)' }} />
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--sap-text-color)' }}>Not Found</h2>
                <p style={{ color: 'var(--sap-text-color-secondary)' }}>Appointment instance not found</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8" style={{ background: 'var(--sap-background-color)' }}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--sap-text-color)' }}>Schedule Your Appointment</h1>
          <p style={{ color: 'var(--sap-text-color-secondary)' }}>Please fill out the form below to request your appointment</p>
        </div>

        {/* Service Details */}
        <div className="sap-card mb-6">
          <div className="sap-card-header">
            <h2 className="sap-card-title flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: 'var(--sap-color-primary)' }} />
              Service Details
            </h2>
          </div>
          <div className="sap-card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Equipment Code</p>
                <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                  {appointmentInstance.fsmActivity.equipment?.code || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Equipment Name</p>
                <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                  {appointmentInstance.fsmActivity.equipment?.name || 'N/A'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm mb-1" style={{ color: 'var(--sap-text-color-secondary)' }}>Address of the Equipment</p>
                <p className="font-semibold" style={{ color: 'var(--sap-text-color)' }}>
                  {appointmentInstance.fsmActivity.equipment?.address || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        {submitted ? (
          <div className="sap-card text-center">
            <div className="sap-card-content" style={{ padding: '2rem' }}>
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--sap-color-success)' }} />
              <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--sap-text-color)' }}>Request Submitted!</h2>
              <p className="mb-4" style={{ color: 'var(--sap-text-color-secondary)' }}>
                Thank you for your appointment request. We will review your preferences and contact you soon to confirm the details.
              </p>
              <div className="sap-card" style={{ background: '#e3f2fd', borderColor: '#bbdefb', textAlign: 'left' }}>
                <div className="sap-card-content">
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--sap-color-primary)' }}>Your Request Summary:</h3>
                  <p style={{ color: 'var(--sap-text-color)' }}><strong>Name:</strong> {formData.customerName}</p>
                  <p style={{ color: 'var(--sap-text-color)' }}><strong>Email:</strong> {formData.customerEmail}</p>
                  {formData.customerPhone && <p style={{ color: 'var(--sap-text-color)' }}><strong>Phone:</strong> {formData.customerPhone}</p>}
                  {formData.requestedDateTime && <p style={{ color: 'var(--sap-text-color)' }}><strong>Requested Date:</strong> {new Date(formData.requestedDateTime).toLocaleString()}</p>}
                  {formData.customerMessage && <p style={{ color: 'var(--sap-text-color)' }}><strong>Message:</strong> {formData.customerMessage}</p>}
                  {formData.specialRequirements && <p style={{ color: 'var(--sap-text-color)' }}><strong>Special Requirements:</strong> {formData.specialRequirements}</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Customer Information */}
            <div className="sap-card mb-6">
              <div className="sap-card-header">
                <h2 className="sap-card-title flex items-center gap-2">
                  <User className="w-5 h-5" style={{ color: 'var(--sap-color-primary)' }} />
                  Your Information
                </h2>
              </div>
              <div className="sap-card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: 'var(--sap-border-color)'
                      }}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: 'var(--sap-border-color)'
                      }}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: 'var(--sap-border-color)'
                      }}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>
                      Request a Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.requestedDateTime}
                      onChange={(e) => handleInputChange('requestedDateTime', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: 'var(--sap-border-color)'
                      }}
                      placeholder="Select your preferred date and time"
                    />
                  </div>
                </div>
              </div>
            </div>


            {/* Additional Information */}
            <div className="sap-card mb-6">
              <div className="sap-card-header">
                <h2 className="sap-card-title flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" style={{ color: 'var(--sap-color-primary)' }} />
                  Additional Information
                </h2>
              </div>
              <div className="sap-card-content">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>
                      Message (Optional)
                    </label>
                    <textarea
                      value={formData.customerMessage}
                      onChange={(e) => handleInputChange('customerMessage', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: 'var(--sap-border-color)'
                      }}
                      placeholder="Any additional information or questions..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--sap-text-color)' }}>
                      Special Requirements (Optional)
                    </label>
                    <textarea
                      value={formData.specialRequirements}
                      onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: 'var(--sap-border-color)'
                      }}
                      placeholder="Any special requirements or accessibility needs..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={submitting}
                className="sap-button"
                style={{ padding: '12px 32px', fontSize: '16px' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  'Submit Appointment Request'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
