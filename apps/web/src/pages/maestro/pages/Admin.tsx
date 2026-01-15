// =============================================
// Maestro Admin Interface
// =============================================
import React from 'react'
import TenantAdminPanel from './admin/TenantAdminPanel'

export default function Admin() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Switchboard Admin</h1>
        <p className="mt-2 text-gray-600">
          Tenant management, policy profiles, quotas, and rollback controls for
          the Switchboard area.
        </p>
      </div>
      <TenantAdminPanel />
    </div>
  )
}
