/**
 * SAP FSM Extension Initialization Script
 * Based on FSMtableV2 implementation patterns
 */

(function() {
  'use strict';

  console.log('FSM Extension Initialization Script loaded');

  // FSM ShellSDK Configuration
  const FSM_SHELL_CONFIG = {
    clientIdentifier: 'fsm-appointment-manager',
    version: '1.20.0',
    unpkgUrl: 'https://unpkg.com/fsm-shell@1.20.0/release/fsm-shell-client'
  };

  // Initialize ShellSDK with proper FSM patterns
  function initializeShellSDK() {
    console.log('Initializing FSM ShellSDK...');
    
    // Load FSM Shell SDK if not already loaded
    if (!window.FSMShell) {
      loadFSMShellSDK().then(function() {
        setupShellSDK();
      }).catch(function(error) {
        console.error('Failed to load FSM ShellSDK:', error);
        setupFallbackMode();
      });
    } else {
      setupShellSDK();
    }
  }

  // Load FSM Shell SDK from unpkg
  function loadFSMShellSDK() {
    return new Promise(function(resolve, reject) {
      if (window.FSMShell) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = FSM_SHELL_CONFIG.unpkgUrl;
      script.async = true;
      
      script.onload = function() {
        console.log('FSM ShellSDK loaded successfully');
        resolve();
      };
      
      script.onerror = function() {
        console.error('Failed to load FSM ShellSDK from unpkg');
        reject(new Error('FSM ShellSDK load failed'));
      };
      
      document.head.appendChild(script);
    });
  }

  // Setup ShellSDK with proper FSM integration
  function setupShellSDK() {
    try {
      const { ShellSdk, SHELL_EVENTS } = window.FSMShell;
      
      if (!ShellSdk || !SHELL_EVENTS) {
        throw new Error('FSM ShellSDK not properly loaded');
      }

      // Initialize ShellSDK client
      const shellSdk = ShellSdk.init(parent, '*');
      
      // Request FSM context
      shellSdk.emit(SHELL_EVENTS.Version1.REQUIRE_CONTEXT, {
        clientIdentifier: FSM_SHELL_CONFIG.clientIdentifier,
      });

      // Listen for context response
      shellSdk.on(SHELL_EVENTS.Version1.REQUIRE_CONTEXT, function(event) {
        try {
          // Handle both string and object responses
          const context = typeof event === 'string' ? JSON.parse(event) : event;
          console.log('FSM Context received:', context);
          
          // Make ShellSDK and context available globally
          window.ShellSDK = shellSdk;
          window.FSMContext = context;
          
          // Dispatch ready event
          window.dispatchEvent(new CustomEvent('fsm-shell-sdk-ready', {
            detail: { 
              shellSDK: shellSdk, 
              context: context,
              FSMShell: window.FSMShell
            }
          }));
        } catch (error) {
          console.error('Error parsing FSM context:', error);
          setupFallbackMode();
        }
      });

      // Handle ShellSDK errors
      shellSdk.on(SHELL_EVENTS.Version1.ERROR, function(error) {
        console.error('ShellSDK error:', error);
        window.dispatchEvent(new CustomEvent('fsm-shell-sdk-error', {
          detail: { error: error }
        }));
      });

    } catch (error) {
      console.error('Error setting up ShellSDK:', error);
      setupFallbackMode();
    }
  }

  // Setup fallback mode when ShellSDK is not available
  function setupFallbackMode() {
    console.log('Setting up fallback mode - ShellSDK not available');
    
    window.FSMExtension = {
      isRunningInFSM: function() {
        return !!(
          window.parent !== window ||
          window.location.search.includes('fsm') ||
          window.location.search.includes('shell') ||
          document.referrer.includes('fsm.cloud.sap') ||
          document.referrer.includes('coresuite.com')
        );
      },

      getFSMParameters: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const referrerParams = document.referrer ? new URLSearchParams(document.referrer.split('?')[1] || '') : new URLSearchParams();
        
        return {
          accountId: urlParams.get('accountId') || referrerParams.get('accountId'),
          companyId: urlParams.get('companyId') || referrerParams.get('companyId'),
          tenant: urlParams.get('tenant') || referrerParams.get('tenant'),
          userId: urlParams.get('userId') || referrerParams.get('userId'),
          userToken: urlParams.get('token') || referrerParams.get('token')
        };
      },

      getCurrentUser: function() {
        const params = this.getFSMParameters();
        return Promise.resolve({
          id: params.userId || 'unknown',
          name: 'FSM User',
          email: null
        });
      },

      getTenantContext: function() {
        const params = this.getFSMParameters();
        return Promise.resolve({
          accountId: params.accountId || 'unknown',
          companyId: params.companyId || 'unknown',
          tenant: params.tenant || 'default',
          baseUrl: window.location.origin
        });
      }
    };

    window.dispatchEvent(new CustomEvent('fsm-shell-sdk-not-found'));
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShellSDK);
  } else {
    initializeShellSDK();
  }

  console.log('FSM Extension initialization script loaded');
})();
