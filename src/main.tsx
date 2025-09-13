import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// TODO: Configure Amplify when backend is ready
// import { Amplify } from 'aws-amplify'
// import awsExports from './aws-exports'
// Amplify.configure(awsExports)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
