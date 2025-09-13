import React from 'react'
import { Header } from './Header'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  subtitle 
}) => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--sap-background-color)' }}>
      <Header title={title} subtitle={subtitle} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
