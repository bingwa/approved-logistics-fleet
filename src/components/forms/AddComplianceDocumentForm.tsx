'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Truck {
  id: string
  registration: string
  make: string
  model: string
}

interface FormData {
  truckId: string
  documentType: string
  certificateNumber: string
  issueDate: Date | null
  expiryDate: Date | null
  cost: number
  issuingAuthority: string
  notes: string
  documentFile: File | null
}

const documentTypes = [
  { value: 'TGL_LICENSE', label: 'Transit Goods License' },
  { value: 'COMMERCIAL_LICENSE', label: 'Commercial License' },
  { value: 'INSURANCE', label: 'Insurance Certificate' },
  { value: 'NTSA_INSPECTION', label: 'NTSA Inspection' }
]

export default function AddComplianceDocumentForm() {
  const router = useRouter()
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    truckId: '',
    documentType: '',
    certificateNumber: '',
    issueDate: null,
    expiryDate: null,
    cost: 0,
    issuingAuthority: '',
    notes: '',
    documentFile: null
  })

  // Fetch trucks on component mount
  useEffect(() => {
    fetchTrucks()
  }, [])

  const fetchTrucks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/trucks')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch trucks`)
      }
      
      const data = await response.json()
      setTrucks(data.trucks || [])
    } catch (err) {
      console.error('Error fetching trucks:', err)
      toast.error('Failed to load trucks')
      setError(err instanceof Error ? err.message : 'Failed to load trucks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  const uploadDocument = async (file: File): Promise<string | null> => {
    if (!file) return null

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'compliance')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      return data.filePath || null
    } catch (err) {
      console.error('Upload error:', err)
      throw new Error(err instanceof Error ? err.message : 'File upload failed')
    }
  }

  const validateForm = (): string | null => {
    if (!formData.truckId) return 'Please select a truck'
    if (!formData.documentType) return 'Please select a document type'
    if (!formData.certificateNumber.trim()) return 'Certificate number is required'
    if (!formData.issueDate) return 'Issue date is required'
    if (!formData.issuingAuthority.trim()) return 'Issuing authority is required'
    
    // Check if expiry date is before issue date
    if (formData.expiryDate && formData.issueDate) {
      if (formData.expiryDate <= formData.issueDate) {
        return 'Expiry date must be after issue date'
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      setError(null)
  
      // Validate form
      const validationError = validateForm()
      if (validationError) {
        setError(validationError)
        toast.error(validationError)
        return
      }
  
      // Upload document if provided
      let documentUrl: string | null = null
      if (formData.documentFile) {
        try {
          setUploadProgress(25)
          documentUrl = await uploadDocument(formData.documentFile)
          setUploadProgress(50)
        } catch (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`)
        }
      }
  
      // Prepare submission data
      const submissionData = {
        truckId: formData.truckId,
        documentType: formData.documentType,
        certificateNumber: formData.certificateNumber.trim(),
        issueDate: formData.issueDate?.toISOString(),
        expiryDate: formData.expiryDate?.toISOString() || null,
        cost: parseFloat(formData.cost.toString()) || 0,
        issuingAuthority: formData.issuingAuthority.trim(),
        notes: formData.notes.trim() || null,
        documentUrl
      }
  
      console.log('📤 Submitting compliance document:', submissionData)
      setUploadProgress(75)
  
      // Submit to API
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })
  
      setUploadProgress(100)
  
      // Parse response (always try to parse JSON)
      let responseData
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError)
        throw new Error(`Server error (${response.status}): Invalid response format`)
      }
  
      console.log('📨 API Response:', responseData)
  
      if (!response.ok) {
        const errorMessage = responseData.message || 
                            responseData.error || 
                            `Server error (${response.status})`
        
        console.error('❌ API error:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData
        })
        
        throw new Error(errorMessage)
      }
  
      // Success handling
      if (responseData.success) {
        toast.success(responseData.message || 'Compliance document created successfully!')
        
        // Reset form
        setFormData({
          truckId: '',
          documentType: '',
          certificateNumber: '',
          issueDate: null,
          expiryDate: null,
          cost: 0,
          issuingAuthority: '',
          notes: '',
          documentFile: null
        })
        
        // Navigate back
        router.push('/compliance')
      } else {
        throw new Error(responseData.message || 'Unknown error occurred')
      }
  
    } catch (err) {
      console.error('🚨 Form submission error:', err)
      
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Add Compliance Document</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading trucks...</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Truck Selection */}
          <div className="space-y-2">
            <Label htmlFor="truck">Truck *</Label>
            <Select
              value={formData.truckId}
              onValueChange={(value) => handleInputChange('truckId', value)}
              disabled={isSubmitting || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a truck" />
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
            <Select
              value={formData.documentType}
              onValueChange={(value) => handleInputChange('documentType', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
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
              placeholder="Enter certificate/document number"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Issue Date */}
            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.issueDate && "text-muted-foreground"
                    )}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.issueDate ? (
                      format(formData.issueDate, "PPP")
                    ) : (
                      "Pick issue date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.issueDate}
                    onSelect={(date) => handleInputChange('issueDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expiryDate && "text-muted-foreground"
                    )}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiryDate ? (
                      format(formData.expiryDate, "PPP")
                    ) : (
                      "Pick expiry date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiryDate}
                    onSelect={(date) => handleInputChange('expiryDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cost and Authority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost */}
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (KSh)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', parseFloat(e.target.value) || null)}
                
                min="0"
                step="0.01"
                disabled={isSubmitting}
              />
            </div>

            {/* Issuing Authority */}
            <div className="space-y-2">
              <Label htmlFor="issuingAuthority">Issuing Authority *</Label>
              <Input
                id="issuingAuthority"
                value={formData.issuingAuthority}
                onChange={(e) => handleInputChange('issuingAuthority', e.target.value)}
                placeholder="e.g., NTSA, KRA"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            <Label htmlFor="documentFile">Document File</Label>
            <Input
              id="documentFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleInputChange('documentFile', e.target.files?.[0] || null)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, JPG, PNG (Max 10MB)
            </p>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-4">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Document...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Compliance Document
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}