// src/app/(dashboard)/compliance/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Plus, Shield, AlertTriangle, CheckCircle, Clock, Calendar, Download, Eye, Upload, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
// ✅ ADD THIS MISSING IMPORT
import { AddComplianceDocumentForm } from '@/components/forms/AddComplianceDocumentForm'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface ComplianceDocument {
  id: string
  documentType: string
  certificateNumber: string
  issueDate: string
  expiryDate: string
  status: string
  cost: number
  truck: {
    registration: string
    make: string
    model: string
  }
}

const statusColors = {
  'VALID': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  'EXPIRING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  'EXPIRED': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  'PENDING': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
}

export default function CompliancePage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [trucks, setTrucks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTruck, setSelectedTruck] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const router = useRouter()

  // Fetch compliance documents from database
  const fetchComplianceDocuments = async () => {
    try {
      setIsLoading(true)
      
      const timestamp = Date.now()
      const response = await fetch(`/api/compliance?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched compliance documents:', data.documents?.length || 0)
        setDocuments(data.documents || [])
      } else {
        console.error('Failed to fetch compliance documents:', response.status)
        toast.error('Failed to load compliance documents')
        setDocuments([])
      }
    } catch (error) {
      console.error('Error fetching compliance documents:', error)
      toast.error('Error loading compliance documents')
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch trucks for filters
  const fetchTrucks = async () => {
    try {
      const response = await fetch('/api/trucks', {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        setTrucks(data.trucks || [])
      }
    } catch (error) {
      console.error('Error fetching trucks:', error)
    }
  }

  useEffect(() => {
    fetchComplianceDocuments()
    fetchTrucks()
  }, [])

  // ✅ ADD THIS MISSING HANDLER
  const handleDocumentCreated = () => {
    setShowAddForm(false)
    fetchComplianceDocuments()
    toast.success('Compliance document added successfully!')
  }

  // Calculate compliance statistics
  const validDocs = documents.filter(doc => doc.status === 'VALID').length
  const expiringSoon = documents.filter(doc => doc.status === 'EXPIRING').length
  const expiredDocs = documents.filter(doc => doc.status === 'EXPIRED').length
  const complianceRate = documents.length > 0 ? (validDocs / documents.length) * 100 : 0

  // Get unique values for filters
  const uniqueTrucks = [...new Set(documents.map(doc => doc.truck.registration))]
  const uniqueTypes = [...new Set(documents.map(doc => doc.documentType))]

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.truck.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTruck = selectedTruck === 'all' || doc.truck.registration === selectedTruck
    const matchesType = selectedType === 'all' || doc.documentType === selectedType
    return matchesSearch && matchesTruck && matchesType
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading compliance data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Management</h1>
            <p className="text-muted-foreground">
              Track and manage vehicle compliance documents and certifications
            </p>
          </div>
          {/* ✅ ADD THE DIALOG WITH THE FORM */}
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add Compliance Document</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Upload and manage vehicle compliance documents
                </DialogDescription>
              </DialogHeader>
              <AddComplianceDocumentForm 
                onSuccess={handleDocumentCreated}
                onCancel={() => setShowAddForm(false)}
              />
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Valid Documents</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{validDocs}</div>
              <p className="text-xs text-muted-foreground">Currently valid</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{expiringSoon}</div>
              <p className="text-xs text-muted-foreground">Need renewal</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{expiredDocs}</div>
              <p className="text-xs text-muted-foreground">Urgent action needed</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Compliance Rate</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{complianceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Overall compliance</p>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Compliance Documents</CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage all vehicle compliance documents and their validity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Search by truck, document type, or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-background border-border text-foreground"
              />
              
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger className="sm:w-[200px] bg-background border-border text-foreground">
                  <SelectValue placeholder="All trucks" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all" className="text-foreground">All trucks</SelectItem>
                  {uniqueTrucks.map((truck) => (
                    <SelectItem key={truck} value={truck} className="text-foreground">
                      {truck}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="sm:w-[200px] bg-background border-border text-foreground">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all" className="text-foreground">All types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-foreground">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="border-border hover:bg-muted">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Documents Table */}
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No compliance documents found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {documents.length === 0 
                    ? 'Start by adding your first compliance document'
                    : 'Try adjusting your search or filters'
                  }
                </p>
                {documents.length === 0 && (
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/50">
                      <TableHead className="text-foreground">Truck</TableHead>
                      <TableHead className="text-foreground">Document Type</TableHead>
                      <TableHead className="text-foreground">Certificate Number</TableHead>
                      <TableHead className="text-foreground">Issue Date</TableHead>
                      <TableHead className="text-foreground">Expiry Date</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id} className="border-border hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium text-foreground">{doc.truck.registration}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.truck.make} {doc.truck.model}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{doc.documentType.replace('_', ' ')}</TableCell>
                        <TableCell className="text-foreground">{doc.certificateNumber}</TableCell>
                        <TableCell className="text-foreground">{formatDate(doc.issueDate)}</TableCell>
                        <TableCell className="text-foreground">{formatDate(doc.expiryDate)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={statusColors[doc.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <Upload className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
