/**
 * api.ts — Typed HTTP client for the Financial Document Management backend.
 *
 * All requests go to NEXT_PUBLIC_API_URL (default http://localhost:8000).
 * The JWT token is stored in localStorage under "access_token".
 */

import type { Document, User, ChunkResult, SearchResponse as SearchResp } from './types'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function setToken(token: string): void {
  localStorage.setItem('access_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('access_token')
}

// ── Base fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const err = await res.json()
      message = err.detail ?? JSON.stringify(err)
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  token_type: string
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    false,
  )
}

export async function register(
  email: string,
  full_name: string,
  password: string,
  role: string = 'Client',
): Promise<User> {
  return request<User>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, full_name, password, role }) },
    false,
  )
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me')
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function listDocuments(): Promise<Document[]> {
  return request<Document[]>('/documents')
}

export async function getDocument(id: number): Promise<Document> {
  return request<Document>(`/documents/${id}`)
}

export async function searchDocuments(params: {
  title?: string
  company_name?: string
  document_type?: string
}): Promise<Document[]> {
  const qs = new URLSearchParams()
  if (params.title) qs.set('title', params.title)
  if (params.company_name) qs.set('company_name', params.company_name)
  if (params.document_type) qs.set('document_type', params.document_type)
  return request<Document[]>(`/documents/search?${qs}`)
}

export async function uploadDocument(
  file: File,
  title: string,
  company_name: string,
  document_type: string,
): Promise<Document> {
  const form = new FormData()
  form.append('file', file)
  form.append('title', title)
  form.append('company_name', company_name)
  form.append('document_type', document_type)
  return request<Document>('/documents/upload', { method: 'POST', body: form })
}

export async function deleteDocument(id: number): Promise<void> {
  return request<void>(`/documents/${id}`, { method: 'DELETE' })
}

// ── RAG / Search ──────────────────────────────────────────────────────────────

export interface IndexResponse {
  document_id: number
  chunks_indexed: number
  message: string
}

export interface ContextResponse {
  document_id: number
  title: string
  chunks: string[]
}

export async function indexDocument(document_id: number): Promise<IndexResponse> {
  const qs = new URLSearchParams({ document_id: String(document_id) })
  return request<IndexResponse>(`/rag/index-document?${qs}`, { method: 'POST' })
}

export async function semanticSearch(
  query: string,
  top_k = 5,
): Promise<SearchResp> {
  return request<SearchResp>('/rag/search', {
    method: 'POST',
    body: JSON.stringify({ query, top_k }),
  })
}

export async function getDocumentContext(document_id: number): Promise<ContextResponse> {
  return request<ContextResponse>(`/rag/context/${document_id}`)
}

// ── Dashboard stats (derived from documents list) ─────────────────────────────

export interface DashboardStats {
  total_documents: number
  indexed_documents: number
  total_searches: number
  active_users: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const docs = await listDocuments()
  return {
    total_documents: docs.length,
    indexed_documents: docs.filter((d) => d.status === 'indexed').length,
    total_searches: 0,   // backend doesn't expose this yet
    active_users: 0,
  }
}


// ── Users / Roles ─────────────────────────────────────────────────────────────

export interface Role {
  id: number
  name: string
}

export async function getUserRoles(userId: number): Promise<Role[]> {
  return request<Role[]>(`/users/${userId}/roles`)
}

export async function assignRole(userId: number, roleName: string): Promise<{ message: string }> {
  return request<{ message: string }>('/users/assign-role', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role_name: roleName }),
  })
}
