import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { shellSdkService, type FSMContext } from '../services/shellSdkService'

interface FSMContextType {
  context: FSMContext | null
  loading: boolean
  error: string | null
  isRunningInFSM: boolean
  refreshContext: () => Promise<void>
}

const FSMContext = createContext<FSMContextType | undefined>(undefined)

interface FSMProviderProps {
  children: ReactNode
}

export const FSMProvider: React.FC<FSMProviderProps> = ({ children }) => {
  const [context, setContext] = useState<FSMContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRunningInFSM, setIsRunningInFSM] = useState(false)

  const initializeFSM = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if running in FSM
      const inFSM = shellSdkService.isRunningInFSM()
      setIsRunningInFSM(inFSM)
      
      if (inFSM) {
        // Initialize ShellSDK and get context
        const fsmContext = await shellSdkService.initialize()
        setContext(fsmContext)
        
        if (!fsmContext) {
          setError('Failed to initialize FSM context')
        }
      } else {
        console.log('Application running outside FSM environment')
        setContext(null)
      }
    } catch (err) {
      console.error('Error initializing FSM:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const refreshContext = async () => {
    await initializeFSM()
  }

  useEffect(() => {
    initializeFSM()
  }, [])

  const value: FSMContextType = {
    context,
    loading,
    error,
    isRunningInFSM,
    refreshContext
  }

  return (
    <FSMContext.Provider value={value}>
      {children}
    </FSMContext.Provider>
  )
}

export const useFSM = (): FSMContextType => {
  const context = useContext(FSMContext)
  if (context === undefined) {
    throw new Error('useFSM must be used within an FSMProvider')
  }
  return context
}

// Hook to get FSM context data directly
export const useFSMContext = (): FSMContext | null => {
  const { context } = useFSM()
  return context
}

// Hook to check if running in FSM
export const useIsRunningInFSM = (): boolean => {
  const { isRunningInFSM } = useFSM()
  return isRunningInFSM
}
