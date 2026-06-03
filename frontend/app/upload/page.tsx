'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle,
  CloudUpload,
  File,
} from 'lucide-react'
import type { DocumentType } from '@/lib/types'
import { uploadDocument } from '@/lib/api'

interface UploadedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'complete' | 'error'
  progress: number
  error?: string
  docId?: number
}

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'report', label: 'Financial Report' },
  { value: 'contract', label: 'Contract' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'other', label: 'Other' },
]

export default function UploadPage() {
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [companyName, setCompanyName] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('report')
  const [documentTitle, setDocumentTitle] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const addFile = (file: File) => {
    if (file.type !== 'application/pdf') return
    const id = Math.random().toString(36).substring(7)
    setFiles((prev) => [...prev, { id, file, status: 'pending', progress: 0 }])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(addFile)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(addFile)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (!pending.length || !documentTitle || !companyName) return

    setUploading(true)

    for (const entry of pending) {
      setFiles((prev) =>
        prev.map((f) => f.id === entry.id ? { ...f, status: 'uploading', progress: 30 } : f)
      )
      try {
        const doc = await uploadDocument(entry.file, documentTitle, companyName, documentType)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: 'complete', progress: 100, docId: doc.id } : f
          )
        )
      } catch (err: unknown) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        )
      }
    }

    setUploading(false)

    // Navigate to documents after all done
    const allDone = files.every((f) => f.status === 'complete' || f.status === 'error')
    if (allDone) {
      setTimeout(() => router.push('/documents'), 1500)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-primary" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const getStatusText = (f: UploadedFile) => {
    switch (f.status) {
      case 'pending': return 'Ready to upload'
      case 'uploading': return 'Uploading…'
      case 'complete': return 'Upload complete'
      case 'error': return f.error ?? 'Error'
    }
  }

  const hasPending = files.some((f) => f.status === 'pending')
  const isWorking = uploading || files.some((f) => f.status === 'uploading')

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Upload Document</h1>
          <p className="text-muted-foreground mt-1">
            Upload PDF documents to be processed and indexed for semantic search
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Upload Files</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Drag and drop PDF files or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <CloudUpload className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-foreground">
                        Drop your PDF files here
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        or click to browse from your computer
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <File className="h-4 w-4" />
                      PDF files only, up to 50MB each
                    </div>
                  </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-medium text-foreground">Files</p>
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {file.file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.file.size)}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getStatusIcon(file.status)}
                              {getStatusText(file)}
                            </span>
                          </div>
                          {file.status === 'uploading' && (
                            <Progress value={file.progress} className="h-1 mt-2" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => removeFile(file.id)}
                          disabled={file.status === 'uploading'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document Details */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Document Details</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Add metadata to your documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground">Document Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Q4 2024 Financial Report"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-foreground">Company Name</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-foreground">Document Type</Label>
                  <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {documentTypes.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                          className="text-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={handleUpload}
                  disabled={!hasPending || !documentTitle || !companyName || isWorking}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isWorking ? 'Uploading…' : 'Upload Documents'}
                </Button>
              </CardContent>
            </Card>

            {/* Upload Info */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Automatic Processing</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Documents are automatically split into chunks and indexed for semantic search
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-2/10 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Vector Embeddings</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Each chunk is converted to embeddings for similarity search
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
