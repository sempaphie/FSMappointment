import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { Dashboard, CustomerBooking } from './pages'

function App() {
  return (
    <Router>
      <Routes>
        {/* FSM User Interface */}
        <Route path="/" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        
        {/* Customer Booking Interface */}
        <Route path="/booking/:token" element={<CustomerBooking />} />
      </Routes>
    </Router>
  )
}

export default App