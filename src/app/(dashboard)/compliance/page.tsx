'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddComplianceDocumentForm } from '@/components/forms/AddComplianceDocumentForm'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface ComplianceDocument {
  id: string
  truckId: string
  documentType: string
  certificateNumber: string
  issueDate: string
  expiryDate: string
  issuingAuthority: string
  status: string
  documentUrl?: string
  daysToExpiry: number
  truck: {
    registration: string
    make: string
    model: string
  }
  user: {
    name: string
  }
}

export default function CompliancePage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<ComplianceDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    fetchComplianceDocuments()
  }, [])

  // Filter documents whenever search term, status filter, or documents change
  useEffect(() => {
    let filtered = documents

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.truck.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => {
        const status = doc.status.toLowerCase()
        switch (statusFilter) {
          case 'valid':
            return status === 'valid'
          case 'expiring':
            return status === 'expiring'
          case 'expired':
            return status === 'expired'
          default:
            return true
        }
      })
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => {
        const docType = doc.documentType.toLowerCase()
        switch (typeFilter) {
          case 'insurance':
            return docType === 'insurance'
          case 'ntsa':
            return docType === 'ntsa_inspection' || docType === 'ntsa inspection'
          case 'license':
            return docType.includes('license')
          default:
            return true
        }
      })
    }

    console.log('[DEBUG] Filtering results:')
    console.log('Total documents:', documents.length)
    console.log('Search term:', searchTerm)
    console.log('Status filter:', statusFilter)
    console.log('Type filter:', typeFilter)
    console.log('Filtered results:', filtered.length)

    setFilteredDocuments(filtered)
  }, [documents, searchTerm, statusFilter, typeFilter])

  const fetchComplianceDocuments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/compliance')
      if (response.ok) {
        const data = await response.json()
        
        // DEBUG: Log received data
        console.log('[DEBUG] Compliance page received data:', data)
        console.log('[DEBUG] Number of documents:', data.complianceDocuments?.length)
        console.log('[DEBUG] Documents:', data.complianceDocuments)
        
        setDocuments(data.complianceDocuments || [])
        console.log(`Fetched ${data.complianceDocuments?.length || 0} compliance documents`)
      } else {
        toast.error('Failed to fetch compliance documents')
      }
    } catch (error) {
      console.error('Error fetching compliance documents:', error)
      toast.error('Failed to fetch compliance documents')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSuccess = () => {
    fetchComplianceDocuments()
    setShowAddForm(false)
    toast.success('Compliance document added successfully!')
  }

  const getStatusBadge = (status: string, daysToExpiry: number) => {
    const statusLower = status.toLowerCase()
    
    switch (statusLower) {
      case 'valid':
        return <Badge variant="success" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>
      case 'expiring':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Expiring ({daysToExpiry} days)</Badge>
      case 'expired':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDocumentTypeDisplay = (docType: string) => {
    switch (docType.toUpperCase()) {
      case 'NTSA_INSPECTION':
        return 'NTSA Inspection'
      case 'INSURANCE':
        return 'Insurance Certificate'
      case 'TGL_LICENSE':
        return 'TGL License'
      case 'COMMERCIAL_LICENSE':
        return 'Commercial License'
      default:
        return docType
    }
  }

  // Calculate statistics
  const validDocs = documents.filter(doc => doc.status.toLowerCase() === 'valid')
  const expiringDocs = documents.filter(doc => doc.status.toLowerCase() === 'expiring')
  const expiredDocs = documents.filter(doc => doc.status.toLowerCase() === 'expired')

  if (showAddForm) {
    return (
      <div className="container mx-auto p-6">
        <AddComplianceDocumentForm
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Management</h1>
          <p className="text-muted-foreground">
            Track and manage vehicle compliance documents and certifications
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently valid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{validDocs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need renewal</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringDocs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent action needed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredDocs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.length > 0 ? Math.round((validDocs.length / documents.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by truck registration or certificate number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring">Expiring</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="ntsa">NTSA Inspection</SelectItem>
                <SelectItem value="license">Licenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {documents.length === 0 
                      ? 'Start by adding your first compliance document' 
                      : 'No documents match your current filters'}
                  </p>
                  {documents.length === 0 && (
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Document
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredDocuments.map((document) => (
              <Card key={document.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {document.truck.registration}
                        </h3>
                        {getStatusBadge(document.status, document.daysToExpiry)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {document.truck.make} {document.truck.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Certificate: {document.certificateNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2">
                        {getDocumentTypeDisplay(document.documentType)}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Expires: {format(new Date(document.expiryDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Issue Date</p>
                      <p className="font-medium">{format(new Date(document.issueDate), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Issuing Authority</p>
                      <p className="font-medium">{document.issuingAuthority}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Days to Expiry</p>
                      <p className="font-medium">{document.daysToExpiry}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Added by</p>
                      <p className="font-medium">{document.user.name}</p>
                    </div>
                  </div>
                  
                  {document.documentUrl && (
                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" asChild>
                        <a href={document.documentUrl} target="_blank" rel="noopener noreferrer">
                          View Document
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
