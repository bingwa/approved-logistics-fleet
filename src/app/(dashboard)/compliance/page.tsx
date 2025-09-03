'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter, FileText, Calendar, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

// FIXED: Correct default import (no curly braces)
import AddComplianceDocumentForm from '@/components/forms/AddComplianceDocumentForm'

interface ComplianceDocument {
  id: string
  documentType: string
  certificateNumber: string
  issueDate: string
  expiryDate?: string
  status: 'VALID' | 'EXPIRED' | 'EXPIRING_SOON'
  cost: number
  issuingAuthority: string
  daysToExpiry: number
  truck: {
    id: string
    registration: string
    make: string
    model: string
  }
  user: {
    name: string
  }
  createdAt: string
  documentUrl?: string
}

const documentTypeLabels: Record<string, string> = {
  'TGL_LICENSE': 'Transit Goods License',
  'VEHICLE_REGISTRATION': 'Vehicle Registration',
  'INSURANCE': 'Insurance Certificate',
  'INSPECTION': 'Vehicle Inspection',
  'PERMIT': 'Transport Permit',
  'PSV_LICENSE': 'PSV License',
  'OTHER': 'Other Document'
}

const statusColors: Record<string, string> = {
  'VALID': 'bg-green-100 text-green-800',
  'EXPIRED': 'bg-red-100 text-red-800',
  'EXPIRING_SOON': 'bg-yellow-100 text-yellow-800'
}

export default function CompliancePage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)

  // Fetch compliance documents
  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/compliance')
      
      if (!response.ok) {
        throw new Error('Failed to fetch compliance documents')
      }

      const data = await response.json()
      setDocuments(data.data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load compliance documents')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.truck.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    const matchesType = typeFilter === 'all' || doc.documentType === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // Get status summary
  const statusSummary = {
    total: documents.length,
    valid: documents.filter(d => d.status === 'VALID').length,
    expiring: documents.filter(d => d.status === 'EXPIRING_SOON').length,
    expired: documents.filter(d => d.status === 'EXPIRED').length
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // FIXED: Simple conditional rendering without complex components
  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowForm(false)}
            className="mb-4"
          >
            ← Back to Compliance
          </Button>
        </div>
        {/* This should work now */}
        <AddComplianceDocumentForm />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Management</h1>
          <p className="text-gray-600 mt-2">Manage vehicle compliance documents and certificates</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Document
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{statusSummary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valid</p>
                <p className="text-2xl font-bold text-gray-900">{statusSummary.valid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{statusSummary.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{statusSummary.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="VALID">Valid</SelectItem>
                <SelectItem value="EXPIRING_SOON">Expiring Soon</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-4" />
              <span>Loading compliance documents...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
              <p className="text-gray-600 mb-4">
                {documents.length === 0 
                  ? "No compliance documents have been added yet."
                  : "No documents match your current filters."
                }
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Truck</TableHead>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{documentTypeLabels[doc.documentType]}</p>
                          <p className="text-sm text-gray-500">{doc.documentType}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.truck.registration}</p>
                          <p className="text-sm text-gray-500">{doc.truck.make} {doc.truck.model}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{doc.certificateNumber}</TableCell>
                      <TableCell>
                        {format(new Date(doc.issueDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {doc.expiryDate ? (
                          <div>
                            <p>{format(new Date(doc.expiryDate), 'MMM dd, yyyy')}</p>
                            {doc.daysToExpiry > 0 && (
                              <p className="text-xs text-gray-500">
                                {doc.daysToExpiry} days left
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[doc.status]} flex items-center gap-1`}>
                          {doc.status === 'VALID' && <CheckCircle className="h-3 w-3" />}
                          {doc.status === 'EXPIRED' && <AlertTriangle className="h-3 w-3" />}
                          {doc.status === 'EXPIRING_SOON' && <Clock className="h-3 w-3" />}
                          {doc.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.issuingAuthority}</TableCell>
                      <TableCell>{formatCurrency(doc.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
