import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { Dashboard, CustomerBooking } from './pages'
import { InstancesPage } from './pages/InstancesPage'
import { FSMProvider } from './contexts/FSMContext'

function App() {
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
        </Routes>
      </Router>
    </FSMProvider>
  )
}

export default App