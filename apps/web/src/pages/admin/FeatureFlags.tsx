// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFeatureFlags } from '@/contexts/FeatureFlagContext'
import { Loader2, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react'

interface FlagDefinition {
  key: string
  description: string
  type: 'boolean' | 'string' | 'number' | 'json'
  enabled: boolean
  defaultValue: any
  tenantId?: string
  updatedAt?: string
}

export default function FeatureFlagsPage() {
  const { token } = useAuth()
  const { reloadFlags } = useFeatureFlags()
  const [flags, setFlags] = useState<FlagDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFlag, setEditingFlag] = useState<FlagDefinition | null>(null)
  const [formData, setFormData] = useState<Partial<FlagDefinition>>({
    type: 'boolean',
    enabled: false,
    defaultValue: false,
  })

  const fetchFlags = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/feature-flags', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFlags(data)
      }
    } catch (error) {
      console.error('Failed to fetch flags', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [token])

  const handleSave = async () => {
    try {
      const url = '/api/feature-flags'
      const method = 'POST' // We use POST for create and update (upsert)

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        fetchFlags()
        reloadFlags() // Refresh context
        setEditingFlag(null)
        setFormData({ type: 'boolean', enabled: false, defaultValue: false })
      }
    } catch (error) {
      console.error('Failed to save flag', error)
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm('Are you sure you want to delete this flag?')) return

    try {
      await fetch(`/api/feature-flags/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchFlags()
      reloadFlags()
    } catch (error) {
      console.error('Failed to delete flag', error)
    }
  }

  const openEdit = (flag: FlagDefinition) => {
    setEditingFlag(flag)
    setFormData(flag)
    setIsDialogOpen(true)
  }

  const openCreate = () => {
    setEditingFlag(null)
    setFormData({ type: 'boolean', enabled: false, defaultValue: false })
    setIsDialogOpen(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage application features and configuration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchFlags()
              reloadFlags()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Flag
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {flags.map(flag => (
            <Card
              key={flag.key}
              className="flex flex-row items-center p-4 gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{flag.key}</h3>
                  <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Badge variant="outline">{flag.type}</Badge>
                  {flag.tenantId && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700"
                    >
                      Tenant: {flag.tenantId}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {flag.description || 'No description'}
                </p>
                <div className="text-xs text-gray-400 mt-1">
                  Default: {JSON.stringify(flag.defaultValue)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(flag)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(flag.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {flags.length === 0 && (
            <div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
              No feature flags found. Create one to get started.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingFlag ? 'Edit Flag' : 'Create New Flag'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={formData.key || ''}
                onChange={e =>
                  setFormData({ ...formData, key: e.target.value })
                }
                disabled={!!editingFlag}
                placeholder="feature.name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: any) =>
                    setFormData({ ...formData, type: val })
                  }
                  disabled={!!editingFlag}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="enabled">State</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={checked =>
                      setFormData({ ...formData, enabled: checked })
                    }
                  />
                  <Label htmlFor="enabled">
                    {formData.enabled ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="defaultValue">Default Value</Label>
              {formData.type === 'boolean' ? (
                <Switch
                  checked={formData.defaultValue}
                  onCheckedChange={checked =>
                    setFormData({ ...formData, defaultValue: checked })
                  }
                />
              ) : (
                <Input
                  id="defaultValue"
                  value={
                    typeof formData.defaultValue === 'object'
                      ? JSON.stringify(formData.defaultValue)
                      : formData.defaultValue
                  }
                  onChange={e => {
                    let val: any = e.target.value
                    if (formData.type === 'number') val = Number(val)
                    if (formData.type === 'json') {
                      try {
                        val = JSON.parse(val)
                      } catch (e) {}
                    }
                    setFormData({ ...formData, defaultValue: val })
                  }}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tenantId">Tenant ID (Optional)</Label>
              <Input
                id="tenantId"
                value={formData.tenantId || ''}
                onChange={e =>
                  setFormData({ ...formData, tenantId: e.target.value })
                }
                placeholder="Global if empty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
