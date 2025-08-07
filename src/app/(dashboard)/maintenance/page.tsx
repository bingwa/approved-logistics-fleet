// src/app/(dashboard)/maintenance/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Plus, Wrench, Calendar, AlertTriangle, TrendingUp, Clock, Filter, Search, Eye, Edit, Download, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddMaintenanceForm } from '@/components/forms/AddMaintenanceForm'
import { formatKSH, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface MaintenanceRecord {
  id: string
  serviceDate: string
  serviceType: string
  maintenanceCategory: string
  description: string
  laborCost: number
  vendorName: string
  vendorLocation?: string
  technicianName?: string
  mileageAtService?: number
  nextServiceDue?: string
  routeTaken?: string
  status: string
  totalCost: number
  truck: {
    registration: string
    make: string
    model: string
  }
  user: {
    name: string
  }
  spareParts: Array<{
    id: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

const statusColors = {
  'SCHEDULED': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  'IN_PROGRESS': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  'COMPLETED': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
}

export default function MaintenancePage() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [trucks, setTrucks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTruck, setSelectedTruck] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const router = useRouter()

  // Fetch maintenance records from database
  const fetchMaintenanceRecords = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      
      // Add cache busting timestamp
      const timestamp = Date.now()
      const response = await fetch(`/api/maintenance?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched maintenance records:', data.maintenanceRecords?.length || 0)
        
        // Process data to match interface
        const processedRecords = (data.maintenanceRecords || []).map((record: any) => ({
          ...record,
          totalCost: record.laborCost + (record.spareParts?.reduce((sum: number, part: any) => sum + part.totalPrice, 0) || 0)
        }))
        
        setMaintenanceRecords(processedRecords)
      } else {
        console.error('Failed to fetch maintenance records:', response.status)
        toast.error('Failed to load maintenance records')
        setMaintenanceRecords([])
      }
    } catch (error) {
      console.error('Error fetching maintenance records:', error)
      toast.error('Error loading maintenance records')
      setMaintenanceRecords([])
    } finally {
      if (showLoading) setIsLoading(false)
      setIsRefreshing(false)
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
    fetchMaintenanceRecords()
    fetchTrucks()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchMaintenanceRecords(false)
  }

  const handleRecordCreated = () => {
    // Refresh data after creating new record
    setShowAddForm(false)
    fetchMaintenanceRecords(false)
    toast.success('Maintenance record created successfully!')
  }

  // Calculate analytics
  const totalCost = maintenanceRecords.reduce((sum, record) => sum + record.totalCost, 0)
  const totalLaborCost = maintenanceRecords.reduce((sum, record) => sum + record.laborCost, 0)
  const totalPartsCost = maintenanceRecords.reduce((sum, record) => 
    sum + (record.spareParts?.reduce((partSum, part) => partSum + part.totalPrice, 0) || 0), 0)
  const scheduledMaintenance = maintenanceRecords.filter(record => record.maintenanceCategory === 'PREVENTIVE').length
  const emergencyRepairs = maintenanceRecords.filter(record => record.maintenanceCategory === 'EMERGENCY').length
  const avgCostPerService = maintenanceRecords.length > 0 ? totalCost / maintenanceRecords.length : 0

  // Get unique values for filters
  const uniqueTrucks = [...new Set(maintenanceRecords.map(record => record.truck.registration))]
  const uniqueTypes = [...new Set(maintenanceRecords.map(record => record.serviceType))]

  // Filter records
  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesSearch = record.truck.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTruck = selectedTruck === 'all' || record.truck.registration === selectedTruck
    const matchesType = selectedType === 'all' || record.serviceType === selectedType
    return matchesSearch && matchesTruck && matchesType
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading maintenance records...</span>
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Maintenance & Service</h1>
            <p className="text-muted-foreground">
              Track and manage all truck maintenance and servicing activities
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-background border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add New Maintenance Record</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Record maintenance or service activities for your trucks
                  </DialogDescription>
                </DialogHeader>
                <AddMaintenanceForm
                  onSuccess={handleRecordCreated}
                  onCancel={() => setShowAddForm(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Total Cost</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatKSH(totalCost)}</div>
              <p className="text-xs text-muted-foreground">All maintenance</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Labor Cost</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatKSH(totalLaborCost)}</div>
              <p className="text-xs text-muted-foreground">Service charges</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Parts Cost</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatKSH(totalPartsCost)}</div>
              <p className="text-xs text-muted-foreground">Spare parts</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{scheduledMaintenance}</div>
              <p className="text-xs text-muted-foreground">Preventive</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Avg Cost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatKSH(avgCostPerService)}</div>
              <p className="text-xs text-muted-foreground">Per service</p>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Maintenance Records</CardTitle>
            <CardDescription className="text-muted-foreground">
              Track and manage all maintenance activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by truck, type, description, or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background border-border text-foreground"
                />
              </div>
              
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
                Export
              </Button>
            </div>

            {/* Records Table */}
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No maintenance records found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {maintenanceRecords.length === 0 
                    ? 'Start by adding your first maintenance record'
                    : 'Try adjusting your search or filters'
                  }
                </p>
                {maintenanceRecords.length === 0 && (
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Record
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/50">
                      <TableHead className="text-foreground">Date</TableHead>
                      <TableHead className="text-foreground">Truck</TableHead>
                      <TableHead className="text-foreground">Service Type</TableHead>
                      <TableHead className="text-foreground">Description</TableHead>
                      <TableHead className="text-foreground">Vendor</TableHead>
                      <TableHead className="text-foreground">Total Cost</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-foreground">{formatDate(record.serviceDate)}</TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{record.truck.registration}</div>
                          <div className="text-xs text-muted-foreground">
                            {record.truck.make} {record.truck.model}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={record.serviceType === 'MAINTENANCE' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            }
                          >
                            {record.serviceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground max-w-xs truncate">
                          {record.description}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {record.vendorName}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatKSH(record.totalCost)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={statusColors[record.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <Edit className="h-4 w-4" />
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
