/**
 * SAP FSM ShellSDK Integration Service
 * Handles communication with the FSM Shell and provides tenant context
 */

export interface FSMContext {
  accountId: string
  companyId: string
  accountName: string
  companyName: string
  currentUser: {
    id: string
    name: string
    email?: string
  }
  tenant: string
  baseUrl: string
}

export interface ShellSDKService {
  initialize(): Promise<FSMContext | null>
  getContext(): FSMContext | null
  isRunningInFSM(): boolean
  showNotification(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void
  openModal(url: string, options?: any): Promise<any>
  navigateToFSM(path: string): void
}

class ShellSDKServiceImpl implements ShellSDKService {
  private context: FSMContext | null = null
  private shellSDK: any = null
  private initialized = false

  /**
   * Initialize the ShellSDK and get FSM context
   */
  async initialize(): Promise<FSMContext | null> {
    if (this.initialized) {
      return this.context
    }

    try {
      // Check if we're running inside FSM
      if (this.isRunningInFSM()) {
        // Wait for FSM ShellSDK to be ready
        const fsmContext = await this.waitForFSMShellSDK()
        
        if (fsmContext) {
          this.context = fsmContext
          this.initialized = true
          
          console.log('FSM ShellSDK initialized successfully', this.context)
          return this.context
        }
      }
      
      console.log('Not running in FSM environment or ShellSDK not available')
      return null
    } catch (error) {
      console.error('Failed to initialize ShellSDK:', error)
      return null
    }
  }

  /**
   * Wait for FSM ShellSDK to be ready and return context
   */
  private async waitForFSMShellSDK(): Promise<FSMContext | null> {
    return new Promise((resolve) => {
      // Check if ShellSDK is already available
      if ((window as any).ShellSDK && (window as any).FSMContext) {
        const context = this.parseFSMContext((window as any).FSMContext)
        resolve(context)
        return
      }

      // Listen for ShellSDK ready event
      const handleReady = (event: CustomEvent) => {
        console.log('FSM ShellSDK ready event received:', event.detail)
        
        this.shellSDK = event.detail.shellSDK
        
        if (event.detail.context) {
          const context = this.parseFSMContext(event.detail.context)
          resolve(context)
        } else {
          resolve(null)
        }
        
        window.removeEventListener('fsm-shell-sdk-ready', handleReady as EventListener)
        window.removeEventListener('fsm-shell-sdk-error', handleError as EventListener)
        window.removeEventListener('fsm-shell-sdk-not-found', handleNotFound as EventListener)
      }

      const handleError = (event: CustomEvent) => {
        console.error('FSM ShellSDK error:', event.detail)
        resolve(null)
        
        window.removeEventListener('fsm-shell-sdk-ready', handleReady as EventListener)
        window.removeEventListener('fsm-shell-sdk-error', handleError as EventListener)
        window.removeEventListener('fsm-shell-sdk-not-found', handleNotFound as EventListener)
      }

      const handleNotFound = () => {
        console.log('FSM ShellSDK not found, using fallback')
        
        // Try to use FSMExtension fallback
        if ((window as any).FSMExtension) {
          const fallbackContext = this.getFallbackContext()
          resolve(fallbackContext)
        } else {
          resolve(null)
        }
        
        window.removeEventListener('fsm-shell-sdk-ready', handleReady as EventListener)
        window.removeEventListener('fsm-shell-sdk-error', handleError as EventListener)
        window.removeEventListener('fsm-shell-sdk-not-found', handleNotFound as EventListener)
      }

      // Set up event listeners
      window.addEventListener('fsm-shell-sdk-ready', handleReady as EventListener)
      window.addEventListener('fsm-shell-sdk-error', handleError as EventListener)
      window.addEventListener('fsm-shell-sdk-not-found', handleNotFound as EventListener)

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('FSM ShellSDK initialization timeout')
        resolve(null)
        
        window.removeEventListener('fsm-shell-sdk-ready', handleReady as EventListener)
        window.removeEventListener('fsm-shell-sdk-error', handleError as EventListener)
        window.removeEventListener('fsm-shell-sdk-not-found', handleNotFound as EventListener)
      }, 10000)
    })
  }

  /**
   * Parse FSM context from ShellSDK response
   */
  private parseFSMContext(fsmContext: any): FSMContext {
    return {
      accountId: fsmContext.accountId || fsmContext.account || 'unknown',
      companyId: fsmContext.companyId || fsmContext.company || 'unknown',
      accountName: fsmContext.accountName || fsmContext.account || 'Unknown Account',
      companyName: fsmContext.companyName || fsmContext.company || 'Unknown Company',
      currentUser: {
        id: fsmContext.userId || fsmContext.user || 'unknown',
        name: fsmContext.userName || fsmContext.user || 'Unknown User',
        email: fsmContext.userEmail || null
      },
      tenant: fsmContext.tenant || fsmContext.selectedLocale || 'default',
      baseUrl: fsmContext.baseUrl || window.location.origin
    }
  }

  /**
   * Check if the application is running inside SAP FSM
   */
  isRunningInFSM(): boolean {
    // Check for FSM-specific objects or parameters
    return !!(
      window.parent !== window ||
      window.location.search.includes('fsm') ||
      window.location.search.includes('shell') ||
      (window as any).sap ||
      (window as any).fsm ||
      document.referrer.includes('fsm.cloud.sap') ||
      document.referrer.includes('coresuite.com')
    )
  }


  /**
   * Extract tenant information from URL
   */
  private extractTenantFromUrl(): string {
    const url = window.location.href
    const match = url.match(/tenant[=:]([^&\/]+)/i)
    return match ? match[1] : 'default'
  }

  /**
   * Extract base URL from current location
   */
  private extractBaseUrlFromUrl(): string {
    const url = new URL(window.location.href)
    return `${url.protocol}//${url.host}`
  }

  /**
   * Extract account ID from URL parameters or environment
   */
  private extractAccountId(): string {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('accountId') || urlParams.get('account') || 'unknown'
  }

  /**
   * Extract company ID from URL parameters or environment
   */
  private extractCompanyId(): string {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('companyId') || urlParams.get('company') || 'unknown'
  }

  /**
   * Get fallback context when ShellSDK is not available
   */
  private getFallbackContext(): FSMContext {
    return {
      accountId: this.extractAccountId(),
      companyId: this.extractCompanyId(),
      accountName: 'Unknown Account',
      companyName: 'Unknown Company',
      currentUser: {
        id: 'unknown',
        name: 'Unknown User'
      },
      tenant: this.extractTenantFromUrl(),
      baseUrl: this.extractBaseUrlFromUrl()
    }
  }

  /**
   * Get current FSM context
   */
  getContext(): FSMContext | null {
    return this.context
  }

  /**
   * Show notification in FSM
   */
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    if (this.shellSDK && (window as any).FSMShell) {
      try {
        const { SHELL_EVENTS } = (window as any).FSMShell
        
        // Use FSM ShellSDK notification events
        this.shellSDK.emit(SHELL_EVENTS.Version1.SHOW_NOTIFICATION, {
          message: message,
          type: type
        })
      } catch (error) {
        console.error('Error showing notification:', error)
        // Fallback to console log
        console.log(`[${type.toUpperCase()}] ${message}`)
      }
    } else {
      // Fallback to browser notification
      console.log(`[${type.toUpperCase()}] ${message}`)
      alert(message)
    }
  }

  /**
   * Open modal in FSM
   */
  async openModal(url: string, options?: any): Promise<any> {
    if (this.shellSDK && (window as any).FSMShell) {
      try {
        const { SHELL_EVENTS } = (window as any).FSMShell
        
        // Use FSM ShellSDK modal events
        return new Promise((resolve, reject) => {
          const modalId = `modal_${Date.now()}`
          
          this.shellSDK.emit(SHELL_EVENTS.Version1.OPEN_MODAL, {
            url: url,
            modalId: modalId,
            options: options
          })
          
          // Listen for modal response
          this.shellSDK.on(`${SHELL_EVENTS.Version1.MODAL_RESPONSE}_${modalId}`, (result: any) => {
            resolve(result)
          })
          
          // Timeout after 30 seconds
          setTimeout(() => {
            reject(new Error('Modal timeout'))
          }, 30000)
        })
      } catch (error) {
        console.error('Error opening modal:', error)
        // Fallback to window.open
        return window.open(url, '_blank', 'width=800,height=600')
      }
    } else {
      // Fallback to window.open
      return window.open(url, '_blank', 'width=800,height=600')
    }
  }

  /**
   * Navigate to FSM path
   */
  navigateToFSM(path: string): void {
    if (this.shellSDK && (window as any).FSMShell) {
      try {
        const { SHELL_EVENTS } = (window as any).FSMShell
        
        // Use FSM ShellSDK navigation events
        this.shellSDK.emit(SHELL_EVENTS.Version1.NAVIGATE, {
          path: path
        })
      } catch (error) {
        console.error('Error navigating:', error)
        // Fallback to window navigation
        window.location.href = path
      }
    } else {
      // Fallback to window navigation
      window.location.href = path
    }
  }
}

// Export singleton instance
export const shellSdkService = new ShellSDKServiceImpl()
