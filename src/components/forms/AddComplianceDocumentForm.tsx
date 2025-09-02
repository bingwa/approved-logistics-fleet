'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2, Upload, FileText, X, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AddComplianceDocumentFormProps {
  onSuccess: () => void
  onCancel: () => void
}

interface Truck {
  id: string
  registration: string
  make: string
  model: string
}

export function AddComplianceDocumentForm({ onSuccess, onCancel }: AddComplianceDocumentFormProps) {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issueDateOpen, setIssueDateOpen] = useState(false)
  const [expiryDateOpen, setExpiryDateOpen] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>()
  const [expiryDate, setExpiryDate] = useState<Date>()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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
      const response = await fetch('/api/trucks', {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTrucks(data.trucks || [])
        console.log('✅ Loaded trucks:', data.trucks?.length || 0)
      } else {
        console.error('❌ Failed to fetch trucks:', response.status)
        toast.error('Failed to load trucks')
      }
    } catch (error) {
      console.error('❌ Error fetching trucks:', error)
      toast.error('Failed to load trucks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.truckId) errors.truckId = 'Please select a truck'
    if (!formData.documentType) errors.documentType = 'Please select document type'
    if (!formData.certificateNumber.trim()) errors.certificateNumber = 'Certificate number is required'
    if (!issueDate) errors.issueDate = 'Issue date is required'
    if (!formData.issuingAuthority.trim()) errors.issuingAuthority = 'Issuing authority is required'
    if (!formData.cost.trim() || isNaN(parseFloat(formData.cost))) {
      errors.cost = 'Please enter a valid cost amount'
    }

    // Date validation
    if (issueDate && expiryDate && expiryDate <= issueDate) {
      errors.expiryDate = 'Expiry date must be after issue date'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
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
    const fileInput = document.getElementById('documentFile') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploadProgress(10)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'compliance')
      
      setUploadProgress(30)
      
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
      console.error('❌ Error uploading file:', error)
      setUploadProgress(0)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 Form submission started')
    
    // Validate form
    if (!validateForm()) {
      console.log('❌ Form validation failed:', formErrors)
      toast.error('Please fix the errors in the form')
      return
    }

    console.log('✅ Form validation passed')

    try {
      setIsSubmitting(true)
      
      // Upload file if exists
      let documentUrl = ''
      if (uploadedFile) {
        console.log('📤 Uploading file:', uploadedFile.name)
        toast.info('Uploading document...')
        
        documentUrl = await uploadFileToStorage(uploadedFile)
        if (!documentUrl) {
          toast.error('Failed to upload document. Please try again.')
          return
        }
        
        console.log('✅ File uploaded successfully')
      }

      // Prepare compliance data
      const complianceData = {
        truckId: formData.truckId,
        documentType: formData.documentType,
        certificateNumber: formData.certificateNumber.trim(),
        issueDate: issueDate!.toISOString(),
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        cost: parseFloat(formData.cost),
        issuingAuthority: formData.issuingAuthority.trim(),
        documentUrl: documentUrl || null
      }

      console.log('[DEBUG] Sending compliance payload:', JSON.stringify(complianceData, null, 2))

      // Make API request with enhanced error handling
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(complianceData)
      })

      console.log('[DEBUG] Response status:', response.status)
      console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()))

      // Get response text first to debug
      const responseText = await response.text()
      console.log('[DEBUG] Raw response text:', responseText)

      // Parse response
      let responseData: any
      try {
        responseData = JSON.parse(responseText)
        console.log('[DEBUG] Parsed response data:', responseData)
      } catch (parseError) {
        console.error('[DEBUG] Failed to parse response as JSON:', parseError)
        console.error('[DEBUG] Raw response was:', responseText)
        toast.error('Invalid server response - check console for details')
        return
      }

      // Handle success
      if (response.ok && responseData.success) {
        console.log('[DEBUG] ✅ Success response:', responseData)
        toast.success(responseData.message || 'Compliance document added successfully!')
        onSuccess()
        onCancel()
        return
      }

      // Handle API errors
      console.error('[DEBUG] ❌ API error response:', responseData)
      
      let errorMessage = 'Failed to add compliance document'
      
      if (responseData.error) {
        errorMessage = responseData.error
      } else if (responseData.details) {
        errorMessage = responseData.details
      } else if (responseData.message) {
        errorMessage = responseData.message
      } else if (!response.ok) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`
      }

      // Show specific error details if available
      if (responseData.missingFields && Array.isArray(responseData.missingFields)) {
        errorMessage = `Missing required fields: ${responseData.missingFields.join(', ')}`
      }

      console.error('[DEBUG] Displaying error to user:', errorMessage)
      toast.error(errorMessage)

    } catch (networkError: any) {
      console.error('[DEBUG] ❌ Network/fetch error:', networkError)
      const errorMessage = networkError?.message || 'Network error - please check your connection'
      toast.error(errorMessage)
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
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading trucks...</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Truck Selection */}
        <div className="space-y-2">
          <Label htmlFor="truckId">Truck *</Label>
          <Select 
            value={formData.truckId} 
            onValueChange={(value) => handleInputChange('truckId', value)}
          >
            <SelectTrigger className={cn(formErrors.truckId && "border-red-500")}>
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
          {formErrors.truckId && (
            <p className="text-sm text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {formErrors.truckId}
            </p>
          )}
        </div>

        {/* Document Type */}
        <div className="space-y-2">
          <Label htmlFor="documentType">Document Type *</Label>
          <Select 
            value={formData.documentType} 
            onValueChange={(value) => handleInputChange('documentType', value)}
          >
            <SelectTrigger className={cn(formErrors.documentType && "border-red-500")}>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NTSA_INSPECTION">NTSA Inspection</SelectItem>
              <SelectItem value="INSURANCE">Insurance Certificate</SelectItem>
              <SelectItem value="TGL_LICENSE">TGL License</SelectItem>
              <SelectItem value="COMMERCIAL_LICENSE">Commercial License</SelectItem>
              <SelectItem value="ROAD_LICENSE">Road License</SelectItem>
              <SelectItem value="OPERATING_LICENSE">Operating License</SelectItem>
            </SelectContent>
          </Select>
          {formErrors.documentType && (
            <p className="text-sm text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {formErrors.documentType}
            </p>
          )}
        </div>

        {/* Certificate Number */}
        <div className="space-y-2">
          <Label htmlFor="certificateNumber">Certificate Number *</Label>
          <Input
            id="certificateNumber"
            value={formData.certificateNumber}
            onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
            placeholder="Enter certificate number"
            className={cn(formErrors.certificateNumber && "border-red-500")}
          />
          {formErrors.certificateNumber && (
            <p className="text-sm text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {formErrors.certificateNumber}
            </p>
          )}
        </div>

        {/* Cost Field */}
        <div className="space-y-2">
          <Label htmlFor="cost">Cost (KSh) *</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => handleInputChange('cost', e.target.value)}
            placeholder="Enter document cost"
            className={cn(formErrors.cost && "border-red-500")}
          />
          {formErrors.cost && (
            <p className="text-sm text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {formErrors.cost}
            </p>
          )}
        </div>

        {/* Issue Date */}
        <div className="space-y-2">
          <Label>Issue Date *</Label>
          <Popover open={issueDateOpen} onOpenChange={setIssueDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !issueDate && "text-muted-foreground",
                  formErrors.issueDate && "border-red-500"
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
                onSelect={(date) => {
                  setIssueDate(date!)
                  setIssueDateOpen(false)
                  if (formErrors.issueDate) {
                    setFormErrors(prev => ({ ...prev, issueDate: '' }))
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {formErrors.issueDate && (
            <p className="text-sm text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {formErrors.issueDate}
            </p>
          )}
        </div>

        {/* Expiry Date */}
        <div className="space-y-2">
          <Label>Expiry Date (Optional)</Label>
          <Popover open={expiryDateOpen} onOpenChange={setExpiryDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !expiryDate && "text-muted-foreground",
                  formErrors.expiryDate && "border-red-500"
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
                onSelect={(date) => {
                  setExpiryDate(date!)
                  setExpiryDateOpen(false)
                  if (formErrors.expiryDate) {
                    setFormErrors(prev => ({ ...prev, expiryDate: '' }))
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {formErrors.expiryDate && (
            <p className="text-sm text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {formErrors.expiryDate}
            </p>
          )}
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
          className={cn(formErrors.issuingAuthority && "border-red-500")}
        />
        {formErrors.issuingAuthority && (
          <p className="text-sm text-red-500 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {formErrors.issuingAuthority}
          </p>
        )}
      </div>

      {/* Document Upload */}
      <div className="space-y-2">
        <Label htmlFor="documentFile">Upload Document (Optional)</Label>
        <p className="text-sm text-muted-foreground">
          Upload the compliance document (PDF, Word, or Image files up to 10MB)
        </p>

        {!uploadedFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="documentFile"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('documentFile')?.click()}
              className="mx-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Click to upload document
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              PDF, DOC, DOCX, JPG, PNG up to 10MB
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(uploadedFile.type)}</span>
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeUploadedFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Replace button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('documentFile')?.click()}
              className="w-full mt-3"
            >
              <Upload className="mr-2 h-4 w-4" />
              Replace Document
            </Button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          id="documentFile"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="min-w-32"
        >
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
