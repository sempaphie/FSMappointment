import React from 'react'
import { InstancesList } from '../components/InstancesList'

export const InstancesPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--sap-background-color)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--sap-text-color)' }}>
            Appointment Instances
          </h1>
          <p className="text-lg" style={{ color: 'var(--sap-text-color-secondary)' }}>
            Manage and monitor all appointment booking instances
          </p>
        </div>
        
        <InstancesList />
      </div>
    </div>
  )
}
