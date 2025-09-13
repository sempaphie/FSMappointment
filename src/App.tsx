import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Layout } from './components/layout'
import { Dashboard, CustomerBooking } from './pages'
import { InstancesPage } from './pages/InstancesPage'
import { TenantSetup } from './pages/TenantSetup'
import { LicenseExpired } from './pages/LicenseExpired'
import { FSMProvider } from './contexts/FSMContext'
import { tenantService, type TenantValidationResult } from './services/tenantService'
import { shellSdkService } from './services/shellSdkService'

type AppState = 'loading' | 'setup' | 'expired' | 'ready'

function App() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [tenantValidation, setTenantValidation] = useState<TenantValidationResult | null>(null)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if we're on a booking page - if so, skip FSM initialization
        const isBookingPage = window.location.pathname.startsWith('/booking/')
        
        if (isBookingPage) {
          // For booking pages, go directly to ready state
          setAppState('ready')
          return
        }

        // Initialize ShellSDK first
        await shellSdkService.initialize()
        
        // Validate tenant
        const validation = await tenantService.validateTenant()
        setTenantValidation(validation)

        if (validation.isValid) {
          setAppState('ready')
        } else if (validation.error === 'NOT_FOUND') {
          setAppState('setup')
        } else if (validation.error === 'EXPIRED') {
          setAppState('expired')
        } else {
          setAppState('setup')
        }
      } catch (error) {
        console.error('Error initializing app:', error)
        // Fallback to setup if there's an error
        setAppState('setup')
      }
    }

    initializeApp()
  }, [])

  const handleSetupComplete = () => {
    setAppState('ready')
  }

  const handleRefreshTenant = async () => {
    try {
      const validation = await tenantService.validateTenant()
      setTenantValidation(validation)

      if (validation.isValid) {
        setAppState('ready')
      } else if (validation.error === 'EXPIRED') {
        setAppState('expired')
      }
    } catch (error) {
      console.error('Error refreshing tenant:', error)
    }
  }

  // Show loading state
  if (appState === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>Loading FSM Appointment Manager...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Show tenant setup
  if (appState === 'setup') {
    return <TenantSetup onSetupComplete={handleSetupComplete} />
  }

  // Show license expired
  if (appState === 'expired' && tenantValidation?.tenant) {
    return (
      <LicenseExpired 
        tenant={tenantValidation.tenant} 
        onRefresh={handleRefreshTenant}
      />
    )
  }

  // Show main application
  return (
    <FSMProvider>
      <Router>
        <Routes>
          {/* FSM User Interface */}
          <Route path="/" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          
          {/* Instances Management Interface */}
          <Route path="/instances" element={
            <Layout>
              <InstancesPage />
            </Layout>
          } />
          
          {/* Customer Booking Interface */}
          <Route path="/booking/:token" element={<CustomerBooking />} />
          <Route path="/booking/:token/" element={<CustomerBooking />} />
        </Routes>
      </Router>
    </FSMProvider>
  )
}

export default App