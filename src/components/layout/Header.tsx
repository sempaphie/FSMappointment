import React from 'react'
import { Calendar } from 'lucide-react'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'FSM Appointment Manager',
  subtitle = 'Manage your field service appointments efficiently'
}) => {
  return (
    <header className="border-b bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {title}
            </h1>
            <p className="text-gray-600 mt-1">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
