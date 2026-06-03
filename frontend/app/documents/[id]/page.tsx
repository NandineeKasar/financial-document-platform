'use client'

import { use, useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Trash2, 
  ArrowLeft,
  Building2,
  Calendar,
  User,
  Layers,
  Database,
  Hash,
  Search,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { getDocument, getDocumentContext, indexDocument } from '@/lib/api'
import type { Document } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentDetailsPage({ params }: PageProps) {
  const { id } = use(params)
  const [document, setDocument] = useState<Document | null>(null)
  const [chunks, setChunks] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [indexing, setIndexing] = useState(false)
  const [indexMessage, setIndexMessage] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const doc = await getDocument(parseInt(id))
        setDocument(doc)
        // Try to load chunks if indexed
        try {
          const ctx = await getDocumentContext(parseInt(id))
          setChunks(ctx.chunks)
        } catch {
          // Not indexed yet, that's fine
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleIndex = async () => {
    if (!document) return
    setIndexing(true)
    setIndexMessage('')
    try {
      const result = await indexDocument(document.id)
      setIndexMessage(result.message)
      // Reload document and chunks
      const [doc, ctx] = await Promise.all([
        getDocument(document.id),
        getDocumentContext(document.id),
      ])
      setDocument(doc)
      setChunks(ctx.chunks)
    } catch (err: unknown) {
      setIndexMessage(err instanceof Error ? err.message : 'Indexing failed')
    } finally {
      setIndexing(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'indexed':
        return <Badge className="bg-primary/20 text-primary border-0">Indexed</Badge>
      case 'processing':
        return <Badge className="bg-warning/20 text-warning border-0">Processing</Badge>
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-0">Failed</Badge>
      default:
        return <Badge className="bg-primary/20 text-primary border-0">Uploaded</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
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

  if (notFound || !document) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">Document not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              The document you are looking for does not exist
            </p>
            <Button asChild className="mt-4">
              <Link href="/documents">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
              <Link href="/documents">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{document.title}</h1>
                {getStatusBadge(document.status)}
              </div>
              <p className="text-muted-foreground mt-1">{document.file_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-14 sm:pl-0">
            {document.status !== 'indexed' && (
              <Button onClick={handleIndex} disabled={indexing} variant="outline">
                {indexing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Indexing…</>
                ) : (
                  <><Database className="h-4 w-4 mr-2" />Index Document</>
                )}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/search?q=${encodeURIComponent(document.title)}`}>
                <Search className="h-4 w-4 mr-2" />
                Search Similar
              </Link>
            </Button>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {indexMessage && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm">
            {indexMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-2/10">
                  <Building2 className="h-4 w-4 text-chart-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm font-medium text-foreground">{document.company_name}</p>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-3/10">
                  <Layers className="h-4 w-4 text-chart-3" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Document Type</p>
                  <p className="text-sm font-medium text-foreground capitalize">{document.document_type}</p>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/10">
                  <Calendar className="h-4 w-4 text-chart-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(document.created_at)}</p>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uploaded By</p>
                  <p className="text-sm font-medium text-foreground">User #{document.uploaded_by}</p>
                </div>
              </div>
              {document.chunks_count !== undefined && document.chunks_count > 0 && (
                <>
                  <Separator className="bg-border" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-1/10">
                      <Hash className="h-4 w-4 text-chart-1" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Chunks Indexed</p>
                      <p className="text-sm font-medium text-foreground">{document.chunks_count}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Content / Chunks */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="chunks">
              <TabsList className="bg-secondary/50 border border-border">
                <TabsTrigger value="chunks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Database className="h-4 w-4 mr-2" />
                  Indexed Chunks ({chunks.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chunks" className="mt-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Document Chunks</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Text chunks extracted and indexed for semantic search
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chunks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">
                          {document.status === 'indexed'
                            ? 'No chunks available.'
                            : 'Document not yet indexed. Use the Index Document button above.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chunks.map((text, idx) => (
                          <div key={idx} className="p-4 rounded-lg bg-secondary/30 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                Chunk #{idx + 1}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
