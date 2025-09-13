import React from 'react'
import { Calendar, List, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'FSM Appointment Manager',
  subtitle = 'Manage your field service appointments efficiently'
}) => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header className="border-b" style={{ 
      background: '#f8f9fa', 
      borderColor: 'var(--sap-border-color)' 
    }}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8" style={{ color: 'var(--sap-color-primary)' }} />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--sap-text-color)' }}>
                {title}
              </h1>
              <p className="mt-1" style={{ color: 'var(--sap-text-color-secondary)' }}>
                {subtitle}
              </p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                isActive('/') 
                  ? 'sap-button' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              style={{
                color: isActive('/') ? 'white' : 'var(--sap-text-color-secondary)',
                background: isActive('/') ? 'var(--sap-color-primary)' : 'transparent'
              }}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              to="/instances"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                isActive('/instances') 
                  ? 'sap-button' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              style={{
                color: isActive('/instances') ? 'white' : 'var(--sap-text-color-secondary)',
                background: isActive('/instances') ? 'var(--sap-color-primary)' : 'transparent'
              }}
            >
              <List className="h-4 w-4" />
              <span>Instances</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
