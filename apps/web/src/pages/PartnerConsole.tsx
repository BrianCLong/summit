import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { PolicyProfileSelector } from '@/components/PolicyProfileSelector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Plus } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  settings: {
    policy_profile?: string
    [key: string]: any
  }
}

export default function PartnerConsole() {
  const { token, user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    residency: 'US',
  })

  // Note: In a real app, this should probably be paginated
  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/tenants', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await res.json()
      if (json.success) {
        setTenants(json.data)
      } else {
        console.error('Failed to fetch tenants:', json.error)
        setTenants([])
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch tenants', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [token])

  const handlePolicyApplied = () => {
    setIsPolicyDialogOpen(false)
    fetchTenants() // Refresh list
  }

  const handleCreateTenant = async () => {
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTenant),
      })
      const json = await res.json()
      if (json.success) {
        setIsCreateDialogOpen(false)
        setNewTenant({ name: '', slug: '', residency: 'US' })
        fetchTenants()
      } else {
        console.error('Failed to create tenant', json.error)
      }
    } catch (e) {
      console.error('Network error creating tenant', e)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partner Console</h1>
          <p className="text-muted-foreground">
            Manage tenants and security policies.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tenant Name</Label>
                <Input
                  id="name"
                  value={newTenant.name}
                  onChange={e =>
                    setNewTenant({ ...newTenant, name: e.target.value })
                  }
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={newTenant.slug}
                  onChange={e =>
                    setNewTenant({ ...newTenant, slug: e.target.value })
                  }
                  placeholder="acme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="residency">Residency</Label>
                <select
                  id="residency"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newTenant.residency}
                  onChange={e =>
                    setNewTenant({ ...newTenant, residency: e.target.value })
                  }
                >
                  <option value="US">United States (US)</option>
                  <option value="EU">Europe (EU)</option>
                </select>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleCreateTenant}>Create Tenant</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Policy Profile</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(tenant => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.status === 'active' ? 'default' : 'secondary'
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tenant.settings.policy_profile || 'None'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog
                      open={isPolicyDialogOpen && selectedTenant === tenant.id}
                      onOpenChange={open => {
                        setIsPolicyDialogOpen(open)
                        if (open) setSelectedTenant(tenant.id)
                        else setSelectedTenant(null)
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTenant(tenant.id)}
                        >
                          Change Policy
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Apply Policy Profile - {tenant.name}
                          </DialogTitle>
                        </DialogHeader>
                        <PolicyProfileSelector
                          tenantId={tenant.id}
                          currentProfile={tenant.settings.policy_profile}
                          onSuccess={handlePolicyApplied}
                        />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
