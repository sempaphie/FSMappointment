// Application constants
export const APP_CONFIG = {
  name: 'FSM Appointment Manager',
  version: '1.0.0',
  description: 'Manage your field service appointments efficiently',
} as const

// API Configuration
export const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  baseURL: import.meta.env.VITE_SAP_FSM_BASE_URL || 'https://eu.fsm.cloud.sap',
  dataAPIURL: `${import.meta.env.VITE_SAP_FSM_BASE_URL || 'https://eu.fsm.cloud.sap'}/api/data/v4`,
  serviceURL: import.meta.env.VITE_SAP_SERVICE_URL || 'https://eu.fsm.cloud.sap/api/service-management/v2/activities/',
} as const

// FSM API Headers
export const FSM_HEADERS = {
  'X-Account-ID': import.meta.env.VITE_SAP_ACCOUNT_ID || '86810',
  'X-Company-ID': import.meta.env.VITE_SAP_COMPANY_ID || '111214',
  'X-Client-ID': import.meta.env.VITE_SAP_CLIENT_ID || 'SDO',
  'X-Client-Version': import.meta.env.VITE_SAP_CLIENT_ID_VERSION || '1.0',
} as const

// Appointment Status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
} as const

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  MANAGER: 'manager',
} as const
