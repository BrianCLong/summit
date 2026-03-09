import React, { useEffect, useMemo, useState } from 'react'
import { PolicyProfileSelector } from '@/components/PolicyProfileSelector'
import { useAuth } from '@/contexts/AuthContext'

type Tenant = {
  id: string
  name: string
  slug: string
  residency?: string
  status?: string
  settings?: Record<string, unknown>
}

type Receipt = {
  id: string
  action: string
  tenantId: string
  actorId: string
  issuedAt: string
  hash: string
}

const planOptions = [
  { value: 'starter', label: 'Starter' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
]

export default function TenantAdminPanel() {
  const { token } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [creating, setCreating] = useState(false)
  const [quotaSaving, setQuotaSaving] = useState(false)
  const [rollbackSaving, setRollbackSaving] = useState(false)

  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    residency: 'US',
  })

  const [quotaForm, setQuotaForm] = useState({
    plan: 'starter',
    api_rpm: '',
    ingest_eps: '',
    egress_gb_day: '',
  })

  const [rollbackReason, setRollbackReason] = useState('')

  const selectedSettings = useMemo(
    () => (selectedTenant?.settings as Record<string, unknown>) || {},
    [selectedTenant],
  )

  const loadTenants = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to load tenants')
      }
      setTenants(json.data || [])
      setSelectedTenantId(prev => prev || json.data?.[0]?.id || '')
      setReceipt(json.receipt || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const loadTenant = async (tenantId: string) => {
    if (!tenantId) {
      setSelectedTenant(null)
      return
    }
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to load tenant')
      }
      setSelectedTenant(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tenant')
    }
  }

  useEffect(() => {
    loadTenants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (selectedTenantId) {
      loadTenant(selectedTenantId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId])

  const handleCreateTenant = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to create tenant')
      }
      setReceipt(json.receipt || null)
      await loadTenants()
      setCreateForm({ name: '', slug: '', residency: 'US' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create tenant')
    } finally {
      setCreating(false)
    }
  }

  const handleQuotaSave = async () => {
    if (!selectedTenantId) return
    setQuotaSaving(true)
    setError(null)
    try {
      const overrides: Record<string, number> = {}
      if (quotaForm.api_rpm) overrides.api_rpm = Number(quotaForm.api_rpm)
      if (quotaForm.ingest_eps)
        overrides.ingest_eps = Number(quotaForm.ingest_eps)
      if (quotaForm.egress_gb_day)
        overrides.egress_gb_day = Number(quotaForm.egress_gb_day)

      const res = await fetch(`/api/tenants/${selectedTenantId}/quotas`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: quotaForm.plan,
          overrides: Object.keys(overrides).length ? overrides : undefined,
          reason: 'switchboard_admin_quota_update',
        }),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to update quotas')
      }
      setReceipt(json.receipt || null)
      await loadTenant(selectedTenantId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update quotas')
    } finally {
      setQuotaSaving(false)
    }
  }

  const handleRollback = async () => {
    if (!selectedTenantId) return
    setRollbackSaving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/tenants/${selectedTenantId}/settings/rollback`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: rollbackReason || 'switchboard_admin_rollback',
          }),
        },
      )
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to rollback settings')
      }
      setReceipt(json.receipt || null)
      setRollbackReason('')
      await loadTenant(selectedTenantId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to rollback settings')
    } finally {
      setRollbackSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-600">Loading tenants…</div>
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Create tenant (Switchboard)
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Provision a new tenant with residency defaults and a receipt.
        </p>
        <form
          onSubmit={handleCreateTenant}
          className="mt-4 grid gap-4 md:grid-cols-3"
        >
          <label className="text-sm font-medium text-gray-700">
            Name
            <input
              value={createForm.name}
              onChange={event =>
                setCreateForm({ ...createForm, name: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Slug
            <input
              value={createForm.slug}
              onChange={event =>
                setCreateForm({ ...createForm, slug: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Residency
            <select
              value={createForm.residency}
              onChange={event =>
                setCreateForm({ ...createForm, residency: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="US">US</option>
              <option value="EU">EU</option>
            </select>
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create tenant'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Tenant configuration
            </h2>
            <p className="text-sm text-gray-500">
              Assign policy profiles, set quotas, and rollback configuration
              changes.
            </p>
          </div>
          <label className="text-sm font-medium text-gray-700">
            Tenant
            <select
              value={selectedTenantId}
              onChange={event => setSelectedTenantId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedTenant ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  Policy profile
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Current profile:{' '}
                  <span className="font-medium">
                    {String(selectedSettings.policy_profile || 'baseline')}
                  </span>
                </p>
                <PolicyProfileSelector
                  tenantId={selectedTenant.id}
                  currentProfile={String(selectedSettings.policy_profile || '')}
                  onSuccess={async () => {
                    await loadTenant(selectedTenant.id)
                    setReceipt(null)
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800">Quotas</h3>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs font-medium text-gray-600">
                    Plan
                    <select
                      value={quotaForm.plan}
                      onChange={event =>
                        setQuotaForm({
                          ...quotaForm,
                          plan: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {planOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    API RPM override
                    <input
                      value={quotaForm.api_rpm}
                      onChange={event =>
                        setQuotaForm({
                          ...quotaForm,
                          api_rpm: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. 5000"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Ingest EPS override
                    <input
                      value={quotaForm.ingest_eps}
                      onChange={event =>
                        setQuotaForm({
                          ...quotaForm,
                          ingest_eps: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. 200"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Egress GB/day override
                    <input
                      value={quotaForm.egress_gb_day}
                      onChange={event =>
                        setQuotaForm({
                          ...quotaForm,
                          egress_gb_day: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. 20"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleQuotaSave}
                    disabled={quotaSaving}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {quotaSaving ? 'Saving…' : 'Save quotas'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  Rollback configuration
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Revert the tenant settings to the previous snapshot.
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    value={rollbackReason}
                    onChange={event => setRollbackReason(event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Reason for rollback"
                  />
                  <button
                    type="button"
                    onClick={handleRollback}
                    disabled={rollbackSaving}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    {rollbackSaving ? 'Rolling back…' : 'Rollback settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-500">
            Select a tenant to manage policy and quota settings.
          </div>
        )}
      </section>

      {receipt && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">
            Latest receipt
          </h2>
          <dl className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
            <div>
              <dt className="font-semibold text-gray-700">Action</dt>
              <dd>{receipt.action}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700">Tenant</dt>
              <dd>{receipt.tenantId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700">Issued</dt>
              <dd>{receipt.issuedAt}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-700">Hash</dt>
              <dd className="break-all">{receipt.hash}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  )
}
