/**
 * SAP FSM Extension Initialization Script
 * This script is loaded when the extension runs within SAP FSM
 */

(function() {
  'use strict';

  console.log('FSM Extension Initialization Script loaded');

  // Initialize ShellSDK when available
  function initializeShellSDK() {
    if (typeof ShellSDK !== 'undefined') {
      console.log('ShellSDK found, initializing...');
      
      try {
        ShellSDK.initialize().then(function() {
          console.log('ShellSDK initialized successfully');
          
          // Make ShellSDK available globally
          window.ShellSDK = ShellSDK;
          
          // Dispatch custom event to notify the app
          window.dispatchEvent(new CustomEvent('fsm-shell-sdk-ready', {
            detail: { shellSDK: ShellSDK }
          }));
        }).catch(function(error) {
          console.error('Failed to initialize ShellSDK:', error);
          
          // Dispatch error event
          window.dispatchEvent(new CustomEvent('fsm-shell-sdk-error', {
            detail: { error: error }
          }));
        });
      } catch (error) {
        console.error('Error initializing ShellSDK:', error);
      }
    } else {
      console.log('ShellSDK not found, checking periodically...');
      
      // Check for ShellSDK periodically
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds with 100ms intervals
      
      const checkInterval = setInterval(function() {
        attempts++;
        
        if (typeof ShellSDK !== 'undefined') {
          clearInterval(checkInterval);
          initializeShellSDK();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.log('ShellSDK not found after maximum attempts');
          
          // Dispatch event to notify that ShellSDK is not available
          window.dispatchEvent(new CustomEvent('fsm-shell-sdk-not-found'));
        }
      }, 100);
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShellSDK);
  } else {
    initializeShellSDK();
  }

  // Add FSM-specific utilities
  window.FSMExtension = {
    // Check if running in FSM
    isRunningInFSM: function() {
      return !!(
        window.parent !== window ||
        window.location.search.includes('fsm') ||
        window.location.search.includes('shell') ||
        document.referrer.includes('fsm.cloud.sap') ||
        document.referrer.includes('coresuite.com')
      );
    },

    // Get FSM parameters from URL
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

    // Get current user context
    getCurrentUser: function() {
      // Try to get from ShellSDK first
      if (window.ShellSDK && window.ShellSDK.getContext) {
        return window.ShellSDK.getContext().then(function(context) {
          return context.currentUser;
        });
      }
      
      // Fallback to URL parameters
      const params = this.getFSMParameters();
      return Promise.resolve({
        id: params.userId || 'unknown',
        name: 'FSM User',
        email: null
      });
    },

    // Get tenant context
    getTenantContext: function() {
      // Try to get from ShellSDK first
      if (window.ShellSDK && window.ShellSDK.getContext) {
        return window.ShellSDK.getContext();
      }
      
      // Fallback to URL parameters
      const params = this.getFSMParameters();
      return Promise.resolve({
        accountId: params.accountId || 'unknown',
        companyId: params.companyId || 'unknown',
        tenant: params.tenant || 'default',
        baseUrl: window.location.origin
      });
    }
  };

  console.log('FSM Extension utilities initialized');
})();
