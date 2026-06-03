'use client'

import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { 
  TrendingUp, 
  TrendingDown,
  FileText,
  Search,
  Upload,
  Users,
  Calendar,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { listDocuments } from '@/lib/api'
import type { Document } from '@/lib/types'

const uploadChartConfig = {
  count: {
    label: 'Uploads',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

const searchChartConfig = {
  count: {
    label: 'Searches',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const pieChartConfig = {
  report: {
    label: 'Report',
    color: 'var(--chart-1)',
  },
  contract: {
    label: 'Contract',
    color: 'var(--chart-2)',
  },
  invoice: {
    label: 'Invoice',
    color: 'var(--chart-3)',
  },
  agreement: {
    label: 'Agreement',
    color: 'var(--chart-4)',
  },
  other: {
    label: 'Other',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('14d')
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setDocuments([]))
  }, [timeRange])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const days = parseInt(timeRange) || 14

  const uploadTrends = (() => {
    const counts: Record<string, number> = {}
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      counts[d.toISOString().split('T')[0]] = 0
    }
    documents.forEach((doc) => {
      const day = doc.created_at.split('T')[0]
      if (day in counts) counts[day]++
    })
    return Object.entries(counts).map(([date, count]) => ({ date, count }))
  })()

  const formattedUploadData = uploadTrends.map(item => ({
    ...item,
    formattedDate: formatDate(item.date),
  }))

  const formattedSearchData = uploadTrends.map(item => ({
    ...item,
    count: 0,
    formattedDate: formatDate(item.date),
  }))

  const totalUploads = documents.length
  const totalSearches = 0
  const avgDailyUploads = days > 0 ? Math.round(totalUploads / days) : 0
  const avgDailySearches = 0

  const typeCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] ?? 0) + 1; return acc
  }, {})
  const documentDistribution = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Monitor your document intelligence platform performance
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-input border-border text-foreground">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Uploads</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalUploads}</p>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary font-medium">+18%</span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/20">
                  <Upload className="h-5 w-5 text-chart-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Searches</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalSearches.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary font-medium">+24%</span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/20">
                  <Search className="h-5 w-5 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Daily Uploads</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{avgDailyUploads}</p>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary font-medium">+5</span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/20">
                  <FileText className="h-5 w-5 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{documents.length}</p>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary font-medium">+4</span>
                    <span className="text-muted-foreground">new this week</span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/20">
                  <Users className="h-5 w-5 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Trends */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Upload Trends</CardTitle>
              <CardDescription className="text-muted-foreground">
                Document uploads over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={uploadChartConfig} className="h-[300px] w-full">
                <AreaChart data={formattedUploadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <defs>
                    <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#uploadGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Search Volume */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Search Volume</CardTitle>
              <CardDescription className="text-muted-foreground">
                Search queries over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={searchChartConfig} className="h-[300px] w-full">
                <AreaChart data={formattedSearchData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <defs>
                    <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    fill="url(#searchGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Type Distribution */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Document Types</CardTitle>
              <CardDescription className="text-muted-foreground">
                Distribution by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={pieChartConfig} className="h-[250px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={documentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="type"
                  >
                    {documentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {documentDistribution.map((item, index) => (
                  <div key={item.type} className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm text-muted-foreground capitalize">{item.type}</span>
                    <Badge variant="secondary" className="bg-secondary/50 text-foreground border-0 text-xs">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Companies */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Documents by Company</CardTitle>
              <CardDescription className="text-muted-foreground">
                Top companies by document count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                count: { label: 'Documents', color: 'var(--chart-1)' }
              }} className="h-[280px] w-full">
                <BarChart
                  data={[
                    { company: 'Acme Corp', count: 42 },
                    { company: 'TechFlow', count: 35 },
                    { company: 'CloudSync', count: 28 },
                    { company: 'DataStream', count: 24 },
                    { company: 'Nexus', count: 18 },
                  ]}
                  layout="vertical"
                  margin={{ left: 80, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="company" 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={75}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--chart-1)" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">System Performance</CardTitle>
            <CardDescription className="text-muted-foreground">
              Key performance indicators for the document intelligence system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg. Search Latency</p>
                <p className="text-3xl font-bold text-foreground">1.2s</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingDown className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary font-medium">-0.3s</span>
                  <span className="text-muted-foreground">improvement</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Indexing Success Rate</p>
                <p className="text-3xl font-bold text-foreground">98.5%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary font-medium">+1.2%</span>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">RAG Answer Accuracy</p>
                <p className="text-3xl font-bold text-foreground">92%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary font-medium">+3%</span>
                  <span className="text-muted-foreground">improvement</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg. Processing Time</p>
                <p className="text-3xl font-bold text-foreground">3.8s</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingDown className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary font-medium">-0.5s</span>
                  <span className="text-muted-foreground">faster</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
