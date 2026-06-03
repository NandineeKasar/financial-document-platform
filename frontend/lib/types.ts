// Types matching the backend schemas

export type DocumentType = 'invoice' | 'report' | 'contract' | 'agreement' | 'other'

export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
}

export interface Document {
  id: number
  title: string
  company_name: string
  document_type: DocumentType
  file_name: string
  uploaded_by: number
  created_at: string
  status?: 'processing' | 'indexed' | 'failed'
  chunks_count?: number
}

export interface ChunkResult {
  document_id: number
  title: string
  company_name: string
  chunk_text: string
  score: float
  chunk_index?: number
}

export interface SearchResponse {
  query: string
  results: ChunkResult[]
  total_retrieved: number
  total_returned: number
}

export interface RAGResponse {
  query: string
  answer: string
  sources: ChunkResult[]
  confidence: number
}

export interface DashboardStats {
  total_documents: number
  indexed_documents: number
  total_searches: number
  active_users: number
}

export interface AnalyticsData {
  upload_trends: { date: string; count: number }[]
  search_volume: { date: string; count: number }[]
  document_distribution: { type: DocumentType; count: number }[]
}

export interface QueryHistoryItem {
  id: number
  query: string
  timestamp: string
  results_count: number
}

// For score types
type float = number
