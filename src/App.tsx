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

        // Check if we're in development mode (localhost)
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.includes('localhost')
        
        if (isDevelopment) {
          console.log('Running in development mode - skipping FSM initialization')
          // In development mode, go directly to ready state with mock tenant validation
          setTenantValidation({
            isValid: true,
            tenant: {
              accountId: 'dev-account',
              accountName: 'Development Account',
              companyId: 'dev-company',
              companyName: 'Development Company',
              cluster: 'dev-cluster',
              contactCompanyName: 'Development Company',
              contactFullName: 'Dev User',
              contactEmailAddress: 'dev@example.com',
              clientId: 'dev-client-id',
              clientSecret: 'dev-client-secret',
              validFrom: new Date().toISOString(),
              validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isActive: true
            }
          })
          setAppState('ready')
          return
        }

        // Production mode - initialize ShellSDK and validate tenant
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
        // Check if we're in development mode for fallback
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.includes('localhost')
        
        if (isDevelopment) {
          console.log('Development mode fallback - setting ready state')
          setTenantValidation({
            isValid: true,
            tenant: {
              accountId: 'dev-account',
              accountName: 'Development Account',
              companyId: 'dev-company',
              companyName: 'Development Company',
              cluster: 'dev-cluster',
              contactCompanyName: 'Development Company',
              contactFullName: 'Dev User',
              contactEmailAddress: 'dev@example.com',
              clientId: 'dev-client-id',
              clientSecret: 'dev-client-secret',
              validFrom: new Date().toISOString(),
              validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isActive: true
            }
          })
          setAppState('ready')
        } else {
          // Fallback to setup if there's an error in production
          setAppState('setup')
        }
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