import React, { useState, useEffect } from 'react'
import { tenantService, type TenantData } from '../services/tenantService'
import { shellSdkService } from '../services/shellSdkService'
import './LicenseExpired.css'

interface LicenseExpiredProps {
  tenant: TenantData
  onRefresh?: () => void
}

export const LicenseExpired: React.FC<LicenseExpiredProps> = ({ tenant, onRefresh }) => {
  const [daysExpired, setDaysExpired] = useState(0)

  useEffect(() => {
    const now = new Date()
    const validTo = new Date(tenant.validTo)
    const diffTime = now.getTime() - validTo.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setDaysExpired(Math.max(0, diffDays))
  }, [tenant.validTo])

  const handleContactSupport = () => {
    // In a real application, this would open a support ticket or contact form
    const subject = encodeURIComponent(`License Renewal Request - ${tenant.contactCompanyName}`)
    const body = encodeURIComponent(`
License Renewal Request

Company: ${tenant.contactCompanyName}
Contact: ${tenant.contactFullName}
Email: ${tenant.contactEmailAddress}
Phone: ${tenant.contactPhone || 'Not provided'}

Account ID: ${tenant.accountId}
Company ID: ${tenant.companyId}
Cluster: ${tenant.cluster}

License expired: ${daysExpired} days ago
Valid until: ${new Date(tenant.validTo).toLocaleDateString()}

Please renew our license to continue using the FSM Appointment Manager extension.
    `)
    
    const mailtoLink = `mailto:support@yourcompany.com?subject=${subject}&body=${body}`
    window.open(mailtoLink)
  }

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="license-expired">
      <div className="expired-container">
        <div className="expired-header">
          <div className="expired-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" 
                fill="currentColor"
              />
            </svg>
          </div>
          <h1>License Expired</h1>
          <p className="expired-description">
            Your FSM Appointment Manager license has expired. Please contact support to renew your license and continue using the extension.
          </p>
        </div>

        <div className="tenant-info">
          <h2>Tenant Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Company</label>
              <span>{tenant.contactCompanyName}</span>
            </div>
            <div className="info-item">
              <label>Contact</label>
              <span>{tenant.contactFullName}</span>
            </div>
            <div className="info-item">
              <label>Email</label>
              <span>{tenant.contactEmailAddress}</span>
            </div>
            {tenant.contactPhone && (
              <div className="info-item">
                <label>Phone</label>
                <span>{tenant.contactPhone}</span>
              </div>
            )}
            <div className="info-item">
              <label>Account ID</label>
              <span>{tenant.accountId}</span>
            </div>
            <div className="info-item">
              <label>Company ID</label>
              <span>{tenant.companyId}</span>
            </div>
            <div className="info-item">
              <label>Cluster</label>
              <span>{tenant.cluster.toUpperCase()}</span>
            </div>
            <div className="info-item">
              <label>License Expired</label>
              <span className="expired-date">
                {new Date(tenant.validTo).toLocaleDateString()} 
                <span className="days-expired">({daysExpired} days ago)</span>
              </span>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            onClick={handleContactSupport}
            className="contact-support-button"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" 
                fill="currentColor"
              />
            </svg>
            Contact Support
          </button>
          
          <button 
            onClick={handleRefresh}
            className="refresh-button"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" 
                fill="currentColor"
              />
            </svg>
            Refresh
          </button>
        </div>

        <div className="support-info">
          <h3>Need Help?</h3>
          <p>
            If you have any questions about your license or need assistance with renewal, 
            please contact our support team. We're here to help you get back up and running quickly.
          </p>
          <div className="support-contacts">
            <div className="support-item">
              <strong>Email:</strong> support@yourcompany.com
            </div>
            <div className="support-item">
              <strong>Phone:</strong> +1 (555) 123-4567
            </div>
            <div className="support-item">
              <strong>Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
