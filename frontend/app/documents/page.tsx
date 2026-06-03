'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Search, 
  FileText, 
  MoreVertical, 
  Eye, 
  Trash2, 
  Download,
  Upload,
  Filter,
  SortAsc,
  SortDesc,
  Building2,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { listDocuments, deleteDocument } from '@/lib/api'
import type { Document, DocumentType } from '@/lib/types'

type SortField = 'title' | 'company_name' | 'created_at' | 'document_type'
type SortDirection = 'asc' | 'desc'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.company_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'all' || doc.document_type === typeFilter
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'title': comparison = a.title.localeCompare(b.title); break
        case 'company_name': comparison = a.company_name.localeCompare(b.company_name); break
        case 'created_at': comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break
        case 'document_type': comparison = a.document_type.localeCompare(b.document_type); break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDelete = (id: number) => {
    setSelectedDocId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedDocId) return
    setDeleting(true)
    try {
      await deleteDocument(selectedDocId)
      setDocuments((prev) => prev.filter((d) => d.id !== selectedDocId))
    } catch {
      // leave as-is; could show a toast here
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedDocId(null)
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'indexed':
        return <Badge variant="default" className="bg-primary/20 text-primary border-0">Indexed</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-warning/20 text-warning border-0">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-0">Failed</Badge>
      default:
        return <Badge variant="default" className="bg-primary/20 text-primary border-0">Indexed</Badge>
    }
  }

  const getTypeBadge = (type: DocumentType) => {
    const colors: Record<DocumentType, string> = {
      invoice: 'bg-chart-4/20 text-chart-4',
      report: 'bg-chart-1/20 text-chart-1',
      contract: 'bg-chart-2/20 text-chart-2',
      agreement: 'bg-chart-3/20 text-chart-3',
      other: 'bg-muted text-muted-foreground',
    }
    return (
      <Badge variant="secondary" className={`${colors[type]} border-0 capitalize`}>
        {type}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />
      )}
    </button>
  )

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">
              Manage and browse your document library
            </p>
          </div>
          <Button asChild>
            <Link href="/upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentType | 'all')}>
                  <SelectTrigger className="w-[150px] bg-input border-border text-foreground">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="agreement">Agreement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] bg-input border-border text-foreground">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="indexed">Indexed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Document Library</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {loading ? 'Loading…' : `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''} found`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                        <TableHead className="text-muted-foreground font-medium">
                          <SortButton field="title">
                            <FileText className="h-4 w-4 mr-1" />
                            Document
                          </SortButton>
                        </TableHead>
                        <TableHead className="text-muted-foreground font-medium hidden md:table-cell">
                          <SortButton field="company_name">
                            <Building2 className="h-4 w-4 mr-1" />
                            Company
                          </SortButton>
                        </TableHead>
                        <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">
                          <SortButton field="document_type">
                            <Layers className="h-4 w-4 mr-1" />
                            Type
                          </SortButton>
                        </TableHead>
                        <TableHead className="text-muted-foreground font-medium hidden sm:table-cell">
                          Status
                        </TableHead>
                        <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">
                          <SortButton field="created_at">
                            <Calendar className="h-4 w-4 mr-1" />
                            Date
                          </SortButton>
                        </TableHead>
                        <TableHead className="text-muted-foreground font-medium text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-secondary/20">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate max-w-[200px] lg:max-w-[300px]">
                                  {doc.title}
                                </p>
                                <p className="text-xs text-muted-foreground truncate md:hidden">
                                  {doc.company_name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-foreground">{doc.company_name}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {getTypeBadge(doc.document_type)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {getStatusBadge(doc.status)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">{formatDate(doc.created_at)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer">
                                  <Link href={`/documents/${doc.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                  onClick={() => handleDelete(doc.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredDocuments.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">No documents found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your search or filter criteria
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/upload">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this document? This action cannot be undone.
              The document and all its indexed data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
