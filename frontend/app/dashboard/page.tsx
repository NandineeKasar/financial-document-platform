'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Database, 
  Search, 
  Users, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  Upload,
  ChevronRight,
  BarChart3,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { listDocuments, getMe } from '@/lib/api'
import type { Document, User } from '@/lib/types'

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [docs, me] = await Promise.all([listDocuments(), getMe()])
        setDocuments(docs)
        setUser(me)
      } catch {
        // token expired or backend down — leave empty
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalDocuments = documents.length
  const indexedDocuments = documents.filter((d) => d.status === 'indexed').length

  const stats = [
    {
      title: 'Total Documents',
      value: totalDocuments.toLocaleString(),
      change: 'all time',
      changeLabel: '',
      icon: FileText,
      iconBg: 'bg-chart-1/20',
      iconColor: 'text-chart-1',
    },
    {
      title: 'Indexed Documents',
      value: indexedDocuments.toLocaleString(),
      change: totalDocuments > 0 ? `${Math.round((indexedDocuments / totalDocuments) * 100)}%` : '0%',
      changeLabel: 'indexing rate',
      icon: Database,
      iconBg: 'bg-chart-2/20',
      iconColor: 'text-chart-2',
    },
    {
      title: 'Processing',
      value: documents.filter((d) => d.status === 'processing').length.toString(),
      change: 'in queue',
      changeLabel: '',
      icon: Search,
      iconBg: 'bg-chart-3/20',
      iconColor: 'text-chart-3',
    },
    {
      title: 'Document Types',
      value: new Set(documents.map((d) => d.document_type)).size.toString(),
      change: 'categories',
      changeLabel: '',
      icon: Users,
      iconBg: 'bg-chart-4/20',
      iconColor: 'text-chart-4',
    },
  ]

  const recentDocuments = documents.slice(0, 5)

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'indexed':
        return <Badge variant="default" className="bg-primary/20 text-primary border-0">Indexed</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-warning/20 text-warning border-0">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-0">Failed</Badge>
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back{user ? `, ${user.full_name.split(' ')[0]}` : ''}. Here&apos;s your document intelligence overview.
            </p>
          </div>
          <Button asChild>
            <Link href="/upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-primary font-medium flex items-center gap-0.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {stat.change}
                      </span>
                      <span className="text-muted-foreground">{stat.changeLabel}</span>
                    </div>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Documents */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Recent Documents</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Latest uploads and their processing status
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/documents" className="flex items-center gap-1 text-primary">
                  View all
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No documents yet. Upload your first one!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {doc.company_name} &middot; {doc.document_type}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</p>
                        {doc.chunks_count ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{doc.chunks_count} chunks</p>
                        ) : null}
                      </div>
                      <Link href={`/documents/${doc.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links where search history used to be */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Semantic Search</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Query your indexed documents
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/search" className="flex items-center gap-1 text-primary">
                  Open
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'What are the payment terms?',
                  'Revenue for Q4 2024?',
                  'Find indemnification clauses',
                  'Show me all invoices over $50k',
                ].map((q) => (
                  <Link
                    key={q}
                    href={`/search?q=${encodeURIComponent(q)}`}
                    className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <p className="text-sm text-foreground line-clamp-2">{q}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Example query
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center gap-2 bg-secondary/30 border-border hover:bg-secondary/50">
                <Link href="/upload">
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-foreground">Upload Document</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center gap-2 bg-secondary/30 border-border hover:bg-secondary/50">
                <Link href="/search">
                  <Search className="h-5 w-5 text-primary" />
                  <span className="text-foreground">Semantic Search</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center gap-2 bg-secondary/30 border-border hover:bg-secondary/50">
                <Link href="/documents">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-foreground">Browse Documents</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto py-4 flex flex-col items-center gap-2 bg-secondary/30 border-border hover:bg-secondary/50">
                <Link href="/analytics">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-foreground">View Analytics</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
