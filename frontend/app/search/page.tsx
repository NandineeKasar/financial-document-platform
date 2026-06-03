'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Sparkles, 
  FileText, 
  Clock,
  ExternalLink,
  RefreshCw,
  Zap,
  Hash,
  Building2,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { semanticSearch } from '@/lib/api'
import type { ChunkResult, SearchResponse } from '@/lib/types'

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState('chunks')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsed, setElapsed] = useState<number>(0)

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [])

  const performSearch = async (q: string) => {
    if (!q.trim()) return
    setIsSearching(true)
    setHasSearched(false)
    setError('')
    setResults(null)
    const t0 = Date.now()
    setStartTime(t0)
    try {
      const data = await semanticSearch(q, 5)
      setResults(data)
      setElapsed(Date.now() - t0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
      setHasSearched(true)
    }
  }

  const handleSearch = () => performSearch(query)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-primary'
    if (score >= 0.8) return 'text-chart-2'
    if (score >= 0.7) return 'text-chart-4'
    return 'text-muted-foreground'
  }

  const getScoreBg = (score: number) => {
    if (score >= 0.9) return 'bg-primary/20'
    if (score >= 0.8) return 'bg-chart-2/20'
    if (score >= 0.7) return 'bg-chart-4/20'
    return 'bg-muted'
  }

  const chunks: ChunkResult[] = results?.results ?? []

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Semantic Search</h1>
        <p className="text-muted-foreground mt-1">
          Search your documents using natural language queries
        </p>
      </div>

      {/* Search Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Ask a question about your documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-11 h-12 text-base bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="h-12 px-6"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Quick Suggestions */}
          {!hasSearched && !isSearching && (
            <div className="flex flex-wrap gap-2 mt-4">
              <p className="text-sm text-muted-foreground mr-2">Try:</p>
              {[
                'What are the payment terms?',
                'Revenue projections for Q4',
                'Liability clauses',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setQuery(suggestion); performSearch(suggestion) }}
                  className="text-sm px-3 py-1.5 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isSearching && (
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Analyzing your documents...</p>
                <p className="text-sm text-muted-foreground mt-1">Using vector similarity search and reranking</p>
              </div>
              <div className="w-full max-w-md space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vector Search</span>
                  <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                </div>
                <Progress value={66} className="h-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {hasSearched && error && (
        <Card className="bg-card border-border border-destructive/40">
          <CardContent className="p-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Results */}
      {hasSearched && !isSearching && !error && (
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-secondary/50 border border-border">
              <TabsTrigger
                value="chunks"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Retrieved Chunks ({chunks.length})
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Metrics
              </TabsTrigger>
            </TabsList>

            {/* Chunks Tab */}
            <TabsContent value="chunks" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-foreground">Retrieved Document Chunks</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Ranked by semantic similarity to your query
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chunks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No results found. Try a different query or upload more documents.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chunks.map((chunk, idx) => (
                            <div key={idx} className="p-4 rounded-lg bg-secondary/30 border border-border">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{chunk.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Building2 className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">{chunk.company_name}</span>
                                      {chunk.chunk_index !== undefined && (
                                        <>
                                          <span className="text-xs text-muted-foreground">•</span>
                                          <span className="text-xs text-muted-foreground">Chunk #{chunk.chunk_index + 1}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Similarity</p>
                                    <p className={`text-lg font-bold ${getScoreColor(chunk.score)}`}>
                                      {Math.round(chunk.score * 100)}%
                                    </p>
                                  </div>
                                  <div className="h-12 w-12 relative">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                      <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke="currentColor" strokeWidth="3"
                                        className="text-secondary"
                                      />
                                      <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke="currentColor" strokeWidth="3"
                                        strokeDasharray={`${chunk.score * 100}, 100`}
                                        className={getScoreColor(chunk.score)}
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed bg-background/50 p-3 rounded-lg">
                                {chunk.chunk_text}
                              </p>
                              <div className="flex items-center gap-2 mt-3">
                                <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
                                  <Link href={`/documents/${chunk.document_id}`}>
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View Document
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sources sidebar */}
                {chunks.length > 0 && (
                  <div className="space-y-4">
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium text-foreground">Top Sources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Array.from(new Map(chunks.map((c) => [c.document_id, c])).values()).map((source) => (
                            <Link
                              key={source.document_id}
                              href={`/documents/${source.document_id}`}
                              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{source.title}</p>
                                <p className="text-xs text-muted-foreground">{source.company_name}</p>
                              </div>
                              <Badge variant="secondary" className={`${getScoreBg(source.score)} ${getScoreColor(source.score)} border-0 shrink-0`}>
                                {Math.round(source.score * 100)}%
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">Search Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      <span>Chunks Retrieved</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{results?.total_retrieved ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>After Reranking</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{results?.total_returned ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Response Time</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{(elapsed / 1000).toFixed(2)}s</span>
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Search className="h-4 w-4" />
                      <span>Query</span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{results?.query}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!hasSearched && !isSearching && (
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Start Searching</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Enter a natural language question to search across all your indexed documents.
                Our AI will find the most relevant chunks using vector similarity search.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-secondary/50 rounded w-48" />
            <div className="h-16 bg-secondary/50 rounded" />
          </div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </AppLayout>
  )
}
