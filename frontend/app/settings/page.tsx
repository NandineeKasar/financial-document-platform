'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Shield,
  Key,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { getMe, getUserRoles } from '@/lib/api'
import type { User as UserType } from '@/lib/types'

interface Role {
  id: number
  name: string
}

const ROLE_COLORS: Record<string, string> = {
  'Admin': 'bg-destructive/20 text-destructive',
  'Financial Analyst': 'bg-chart-2/20 text-chart-2',
  'Auditor': 'bg-chart-3/20 text-chart-3',
  'Client': 'bg-chart-4/20 text-chart-4',
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Admin': ['Upload documents', 'Edit documents', 'Delete documents', 'View documents', 'Manage users', 'Manage roles'],
  'Financial Analyst': ['Upload documents', 'Edit documents', 'View documents'],
  'Auditor': ['Review documents', 'View documents'],
  'Client': ['View documents'],
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showApiUrl, setShowApiUrl] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const me = await getMe()
        setUser(me)
        const userRoles = await getUserRoles(me.id)
        setRoles(userRoles)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const allPermissions = Array.from(
    new Set(roles.flatMap(r => ROLE_PERMISSIONS[r.name] ?? []))
  )

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and view your permissions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Profile
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold shrink-0">
                    {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">{user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">User ID</p>
                  <p className="text-sm text-foreground font-mono">#{user?.id}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.length > 0 ? roles.map(r => (
                      <Badge
                        key={r.id}
                        className={`${ROLE_COLORS[r.name] ?? 'bg-muted text-muted-foreground'} border-0`}
                      >
                        {r.name}
                      </Badge>
                    )) : (
                      <Badge className="bg-muted text-muted-foreground border-0">No role assigned</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Config Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  API Configuration
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Backend connection settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Backend URL</Label>
                  <div className="relative">
                    <Input
                      type={showApiUrl ? 'text' : 'password'}
                      value={apiUrl}
                      readOnly
                      className="bg-input border-border text-foreground pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiUrl(!showApiUrl)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set via <span className="font-mono">NEXT_PUBLIC_API_URL</span> in .env.local
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-primary">Backend connected</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Permissions Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Your Permissions
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  What you can do based on your assigned roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allPermissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No permissions found. Contact an admin.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allPermissions.map((perm) => (
                      <div key={perm} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground">{perm}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role Details */}
            {roles.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">Role Details</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Breakdown of each role and its capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roles.map((role) => (
                    <div key={role.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={`${ROLE_COLORS[role.name] ?? 'bg-muted text-muted-foreground'} border-0`}>
                          {role.name}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(ROLE_PERMISSIONS[role.name] ?? []).map(perm => (
                          <span
                            key={perm}
                            className="text-xs px-2 py-1 rounded-full bg-background text-muted-foreground border border-border"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* About */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">About FinDoc AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Frontend', value: 'Next.js 16' },
                    { label: 'Backend', value: 'FastAPI' },
                    { label: 'Vector DB', value: 'Qdrant' },
                    { label: 'Database', value: 'PostgreSQL' },
                    { label: 'Embeddings', value: 'all-MiniLM-L6-v2' },
                    { label: 'Reranker', value: 'ms-marco-MiniLM' },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
