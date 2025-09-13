import React, { useState, useEffect } from 'react'
import { shellSdkService, type FSMContext, type FSMObjectPermissions } from '../services/shellSdkService'
import './ShellSDKInfo.css'

interface ShellSDKInfoProps {
  className?: string
}

export const ShellSDKInfo: React.FC<ShellSDKInfoProps> = ({ className = '' }) => {
  const [context, setContext] = useState<FSMContext | null>(null)
  const [permissions, setPermissions] = useState<FSMObjectPermissions | null>(null)
  const [companySetting, setCompanySetting] = useState<any>(null)
  const [userSetting, setUserSetting] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadShellSDKInfo = async () => {
      try {
        // Get basic context
        const fsmContext = shellSdkService.getContext()
        setContext(fsmContext)

        // Get permissions for ACTIVITY object
        const activityPermissions = await shellSdkService.getPermissions('ACTIVITY')
        setPermissions(activityPermissions)

        // Get company setting (example: userPerson)
        const userPersonSetting = await shellSdkService.getCompanySetting('userPerson')
        setCompanySetting(userPersonSetting)

        // Get user setting (example: timeZone)
        const timeZoneSetting = await shellSdkService.getUserSetting('timeZone')
        setUserSetting(timeZoneSetting)

      } catch (error) {
        console.error('Error loading ShellSDK info:', error)
      } finally {
        setLoading(false)
      }
    }

    loadShellSDKInfo()
  }, [])

  if (loading) {
    return (
      <div className={`shell-sdk-info ${className}`}>
        <h3>Loading ShellSDK Information...</h3>
      </div>
    )
  }

  return (
    <div className={`shell-sdk-info ${className}`}>
      <h3>🔧 ShellSDK Available Fields & Data</h3>
      
      {/* Basic Context Information */}
      <div className="info-section">
        <h4>📋 FSM Context</h4>
        {context ? (
          <div className="context-info">
            <div><strong>Account:</strong> {context.accountName} ({context.accountId})</div>
            <div><strong>Company:</strong> {context.companyName} ({context.companyId})</div>
            <div><strong>User:</strong> {context.currentUser.name} ({context.currentUser.id})</div>
            <div><strong>Email:</strong> {context.currentUser.email || 'N/A'}</div>
            <div><strong>Locale:</strong> {context.selectedLocale || 'N/A'}</div>
            <div><strong>Tenant:</strong> {context.tenant}</div>
            <div><strong>Base URL:</strong> {context.baseUrl}</div>
            
            {/* Additional ShellSDK Fields */}
            <div className="additional-fields">
              <h5>🔍 Additional ShellSDK Fields:</h5>
              <div><strong>account:</strong> {context.account || 'N/A'}</div>
              <div><strong>company:</strong> {context.company || 'N/A'}</div>
              <div><strong>user:</strong> {context.user || 'N/A'}</div>
              <div><strong>userId:</strong> {context.userId || 'N/A'}</div>
              <div><strong>userEmail:</strong> {context.userEmail || 'N/A'}</div>
            </div>
          </div>
        ) : (
          <div className="no-context">No FSM context available</div>
        )}
      </div>

      {/* Permissions Information */}
      <div className="info-section">
        <h4>🔐 Object Permissions (ACTIVITY)</h4>
        {permissions ? (
          <div className="permissions-info">
            <div><strong>Object:</strong> {permissions.objectName}</div>
            <div><strong>CREATE:</strong> {permissions.permission.CREATE ? '✅' : '❌'}</div>
            <div><strong>READ:</strong> {permissions.permission.READ ? '✅' : '❌'}</div>
            <div><strong>UPDATE:</strong> {permissions.permission.UPDATE ? '✅' : '❌'}</div>
            <div><strong>DELETE:</strong> {permissions.permission.DELETE ? '✅' : '❌'}</div>
            <div><strong>UI Permissions:</strong> [{permissions.UI_PERMISSIONS.join(', ')}]</div>
          </div>
        ) : (
          <div className="no-permissions">No permissions data available</div>
        )}
      </div>

      {/* Company Settings */}
      <div className="info-section">
        <h4>🏢 Company Settings</h4>
        {companySetting ? (
          <div className="settings-info">
            <div><strong>Key:</strong> {companySetting.key}</div>
            <div><strong>Value:</strong> {JSON.stringify(companySetting.value)}</div>
          </div>
        ) : (
          <div className="no-settings">No company settings available</div>
        )}
      </div>

      {/* User Settings */}
      <div className="info-section">
        <h4>👤 User Settings</h4>
        {userSetting ? (
          <div className="settings-info">
            <div><strong>Key:</strong> {userSetting.key}</div>
            <div><strong>Value:</strong> {JSON.stringify(userSetting.value)}</div>
          </div>
        ) : (
          <div className="no-settings">No user settings available</div>
        )}
      </div>

      {/* Available ShellSDK Events */}
      <div className="info-section">
        <h4>🚀 Available ShellSDK Events</h4>
        <div className="events-list">
          <div><strong>REQUIRE_CONTEXT:</strong> Get tenant context (account, company, user info)</div>
          <div><strong>GET_PERMISSIONS:</strong> Check user permissions for objects (ACTIVITY, SERVICECALL, etc.)</div>
          <div><strong>GET_SETTINGS:</strong> Get company-specific settings</div>
          <div><strong>GET_STORAGE_ITEM:</strong> Get user-specific settings</div>
          <div><strong>SHOW_NOTIFICATION:</strong> Display notifications in FSM</div>
          <div><strong>OPEN_MODAL:</strong> Open modal dialogs</div>
          <div><strong>NAVIGATE:</strong> Navigate to FSM paths</div>
        </div>
      </div>

    </div>
  )
}
