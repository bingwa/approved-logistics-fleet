// src/components/forms/AddComplianceDocumentForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2, Upload, FileText, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AddComplianceDocumentFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AddComplianceDocumentForm({ onSuccess, onCancel }: AddComplianceDocumentFormProps) {
  const [trucks, setTrucks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>()
  const [expiryDate, setExpiryDate] = useState<Date>()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const [formData, setFormData] = useState({
    truckId: '',
    documentType: '',
    certificateNumber: '',
    cost: '',
    issuingAuthority: ''
  })

  useEffect(() => {
    fetchTrucks()
  }, [])

  const fetchTrucks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/trucks')
      if (response.ok) {
        const data = await response.json()
        setTrucks(data.trucks || [])
      }
    } catch (error) {
      console.error('Error fetching trucks:', error)
      toast.error('Failed to load trucks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload PDF, Word document, or image files only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploadedFile(file)
    toast.success('Document selected successfully!')
  }

  const removeUploadedFile = () => {
    setUploadedFile(null)
    // Reset the file input
    const fileInput = document.getElementById('documentFile') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploadProgress(10)
      
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'compliance')
      
      setUploadProgress(30)

      // Upload to your file storage endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      setUploadProgress(70)

      if (response.ok) {
        const data = await response.json()
        setUploadProgress(100)
        return data.url || data.filePath
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadProgress(0)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.truckId || !formData.documentType || !formData.certificateNumber || 
        !issueDate || !expiryDate || !formData.cost || !formData.issuingAuthority) {
      toast.error('Please fill in all required fields')
      return
    }

    // Calculate days to expiry
    const today = new Date()
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    // Determine status
    let status = 'VALID'
    if (daysToExpiry < 0) {
      status = 'EXPIRED'
    } else if (daysToExpiry <= 30) {
      status = 'EXPIRING'
    }

    try {
      setIsSubmitting(true)
      
      // Upload file if exists
      let documentUrl = null
      if (uploadedFile) {
        toast.info('Uploading document...')
        documentUrl = await uploadFileToStorage(uploadedFile)
        if (!documentUrl) {
          toast.error('Failed to upload document. Please try again.')
          setIsSubmitting(false)
          return
        }
      }

      const complianceData = {
        truckId: formData.truckId,
        documentType: formData.documentType,
        certificateNumber: formData.certificateNumber,
        issueDate: issueDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        cost: parseFloat(formData.cost),
        issuingAuthority: formData.issuingAuthority,
        documentUrl: documentUrl,
        daysToExpiry,
        status
      }

      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(complianceData)
      })

      if (response.ok) {
        toast.success('Compliance document added successfully!')
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add compliance document')
      }
    } catch (error) {
      console.error('Error adding compliance document:', error)
      toast.error('Failed to add compliance document')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    return '📄'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Truck Selection */}
        <div className="space-y-2">
          <Label htmlFor="truckId">Truck *</Label>
          <Select value={formData.truckId} onValueChange={(value) => handleInputChange('truckId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select truck" />
            </SelectTrigger>
            <SelectContent>
              {trucks.map((truck) => (
                <SelectItem key={truck.id} value={truck.id}>
                  {truck.registration} - {truck.make} {truck.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Document Type */}
        <div className="space-y-2">
          <Label htmlFor="documentType">Document Type *</Label>
          <Select value={formData.documentType} onValueChange={(value) => handleInputChange('documentType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NTSA_INSPECTION">NTSA Inspection</SelectItem>
              <SelectItem value="INSURANCE">Insurance Certificate</SelectItem>
              <SelectItem value="TGL_LICENSE">TGL License</SelectItem>
              <SelectItem value="COMMERCIAL_LICENSE">Commercial License</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Certificate Number */}
        <div className="space-y-2">
          <Label htmlFor="certificateNumber">Certificate Number *</Label>
          <Input
            id="certificateNumber"
            value={formData.certificateNumber}
            onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
            placeholder="Enter certificate number"
            required
          />
        </div>

        {/* Cost */}
        <div className="space-y-2">
          <Label htmlFor="cost">Cost (KSh) *</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => handleInputChange('cost', e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Issue Date */}
        <div className="space-y-2">
          <Label>Issue Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !issueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {issueDate ? format(issueDate, "PPP") : <span>Pick issue date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={issueDate}
                onSelect={setIssueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Expiry Date */}
        <div className="space-y-2">
          <Label>Expiry Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !expiryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? format(expiryDate, "PPP") : <span>Pick expiry date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={setExpiryDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Issuing Authority */}
      <div className="space-y-2">
        <Label htmlFor="issuingAuthority">Issuing Authority *</Label>
        <Input
          id="issuingAuthority"
          value={formData.issuingAuthority}
          onChange={(e) => handleInputChange('issuingAuthority', e.target.value)}
          placeholder="e.g., NTSA, Insurance Company Name"
          required
        />
      </div>

      {/* Document Upload - REPLACED URL FIELD */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="documentFile">Upload Document</Label>
          <p className="text-sm text-muted-foreground">
            Upload the compliance document (PDF, Word, or Image files up to 10MB)
          </p>
          
          {!uploadedFile ? (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Click to upload document
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG up to 10MB
                </p>
              </div>
              <Input
                id="documentFile"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {getFileIcon(uploadedFile.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeUploadedFile}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alternative Upload Button */}
          {uploadedFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('documentFile')?.click()}
              className="w-full mt-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              Replace Document
            </Button>
          )}
          
          {/* Hidden file input for replace functionality */}
          {uploadedFile && (
            <Input
              id="documentFile"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
            />
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {uploadedFile ? 'Uploading & Adding...' : 'Adding Document...'}
            </>
          ) : (
            'Add Document'
          )}
        </Button>
      </div>
    </form>
  )
}
