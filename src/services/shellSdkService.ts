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
        // First try to get ShellSDK from the initialization script
        this.shellSDK = (window as any).ShellSDK || (window as any).FSMExtension
        
        if (!this.shellSDK) {
          // Load ShellSDK dynamically if not available
          this.shellSDK = await this.loadShellSDK()
        }
        
        if (this.shellSDK) {
          // Initialize ShellSDK if it has an initialize method
          if (typeof this.shellSDK.initialize === 'function') {
            await this.shellSDK.initialize()
          }
          
          // Get FSM context
          this.context = await this.getFSMContext()
          this.initialized = true
          
          console.log('ShellSDK initialized successfully', this.context)
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
   * Dynamically load the ShellSDK
   */
  private async loadShellSDK(): Promise<any> {
    try {
      // Try to load ShellSDK from various possible locations
      const possiblePaths = [
        '/sdk/shell-sdk.js',
        '/shell-sdk.js',
        '/fsm-shell-sdk.js',
        './shell-sdk.js'
      ]

      for (const path of possiblePaths) {
        try {
          const script = document.createElement('script')
          script.src = path
          script.async = false
          
          await new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })

          // Check if ShellSDK is now available
          if ((window as any).ShellSDK) {
            return (window as any).ShellSDK
          }
        } catch (error) {
          console.log(`Failed to load ShellSDK from ${path}:`, error)
          continue
        }
      }

      // If not found, try to access from window object
      return (window as any).ShellSDK || null
    } catch (error) {
      console.error('Error loading ShellSDK:', error)
      return null
    }
  }

  /**
   * Get FSM context information
   */
  private async getFSMContext(): Promise<FSMContext> {
    if (!this.shellSDK) {
      throw new Error('ShellSDK not initialized')
    }

    try {
      let context: any = {}

      // Try to get context from ShellSDK
      if (typeof this.shellSDK.getContext === 'function') {
        context = await this.shellSDK.getContext()
      } else if (typeof this.shellSDK.getTenantContext === 'function') {
        // Use FSMExtension utilities
        context = await this.shellSDK.getTenantContext()
      }

      // Get current user information
      let currentUser: any = {}
      if (context.currentUser) {
        currentUser = context.currentUser
      } else if (typeof this.shellSDK.getCurrentUser === 'function') {
        currentUser = await this.shellSDK.getCurrentUser()
      }

      // Extract tenant information
      const tenant = context.tenant || this.extractTenantFromUrl()
      const baseUrl = context.baseUrl || this.extractBaseUrlFromUrl()

      return {
        accountId: context.accountId || this.extractAccountId(),
        companyId: context.companyId || this.extractCompanyId(),
        accountName: context.accountName || 'Unknown Account',
        companyName: context.companyName || 'Unknown Company',
        currentUser: {
          id: currentUser.id || 'unknown',
          name: currentUser.name || 'Unknown User',
          email: currentUser.email
        },
        tenant,
        baseUrl
      }
    } catch (error) {
      console.error('Error getting FSM context:', error)
      
      // Fallback to extracting from URL or environment
      return this.getFallbackContext()
    }
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
    if (this.shellSDK && this.shellSDK.showNotification) {
      this.shellSDK.showNotification(message, type)
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
    if (this.shellSDK && this.shellSDK.openModal) {
      return await this.shellSDK.openModal(url, options)
    } else {
      // Fallback to window.open
      return window.open(url, '_blank', 'width=800,height=600')
    }
  }

  /**
   * Navigate to FSM path
   */
  navigateToFSM(path: string): void {
    if (this.shellSDK && this.shellSDK.navigateTo) {
      this.shellSDK.navigateTo(path)
    } else {
      // Fallback to window navigation
      window.location.href = path
    }
  }
}

// Export singleton instance
export const shellSdkService = new ShellSDKServiceImpl()
