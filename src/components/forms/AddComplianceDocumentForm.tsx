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
  const [trucks, setTrucks] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issueDateOpen, setIssueDateOpen] = useState(false)
  const [expiryDateOpen, setExpiryDateOpen] = useState(false)
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

    // Validation - NOTE: uploadedFile is NOT required here
    if (!formData.truckId || !formData.documentType || !formData.certificateNumber ||
        !issueDate || !formData.issuingAuthority) {
      toast.error('Please fill in all required fields')
      return
    }

    // Calculate days to expiry
    const today = new Date()
    let daysToExpiry = 0
    if (expiryDate) {
      daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Determine status
    let status = 'VALID'
    if (expiryDate) {
      if (daysToExpiry < 0) {
        status = 'EXPIRED'
      } else if (daysToExpiry <= 30) {
        status = 'EXPIRING'
      }
    }

    try {
      setIsSubmitting(true)

      // Upload file if exists
      let documentUrl = ''
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
        documentNumber: formData.certificateNumber, // Map certificateNumber to documentNumber
        issueDate: issueDate.toISOString(),
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        issuingAuthority: formData.issuingAuthority,
        documentUrl: documentUrl,
        status
      }

      // 🔹 DEBUG: Log payload to browser console
      console.log('[DEBUG] Sending compliance payload to /api/compliance:')
      console.log(JSON.stringify(complianceData, null, 2))

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
        onCancel()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add compliance document')
        // 🔹 DEBUG: Log backend error response
        console.error('[DEBUG] Backend POST /api/compliance returned error:', error)
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
        <span className="ml-2">Loading trucks...</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Truck Selection */}
        <div>
          <Label>Truck *</Label>
          <Select onValueChange={(value) => handleInputChange('truckId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select truck" />
            </SelectTrigger>
            <SelectContent>
              {trucks.map((truck: any) => (
                <SelectItem key={truck.id} value={truck.id}>
                  {truck.registration} - {truck.make} {truck.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Document Type */}
        <div>
          <Label>Document Type *</Label>
          <Select onValueChange={(value) => handleInputChange('documentType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NTSA Inspection">NTSA Inspection</SelectItem>
              <SelectItem value="Insurance Certificate">Insurance Certificate</SelectItem>
              <SelectItem value="TGL License">TGL License</SelectItem>
              <SelectItem value="Commercial License">Commercial License</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Certificate Number */}
        <div>
          <Label>Certificate Number *</Label>
          <Input
            value={formData.certificateNumber}
            onChange={(e) => handleInputChange('certificateNumber', e.target.value)}
            placeholder="Enter certificate number"
            required
          />
        </div>

        {/* Issue Date */}
        <div>
          <Label>Issue Date *</Label>
          <Popover open={issueDateOpen} onOpenChange={setIssueDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !issueDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {issueDate ? format(issueDate, "PPP") : "Pick issue date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={issueDate}
                onSelect={(date) => {
                  setIssueDate(date!)
                  setIssueDateOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Expiry Date */}
        <div>
          <Label>Expiry Date (Optional)</Label>
          <Popover open={expiryDateOpen} onOpenChange={setExpiryDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !expiryDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? format(expiryDate, "PPP") : "Pick expiry date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={(date) => {
                  setExpiryDate(date!)
                  setExpiryDateOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Issuing Authority */}
        <div>
          <Label>Issuing Authority *</Label>
          <Input
            value={formData.issuingAuthority}
            onChange={(e) => handleInputChange('issuingAuthority', e.target.value)}
            placeholder="e.g., NTSA, Insurance Company Name"
            required
          />
        </div>
        
        {/* Add this field after Issuing Authority */}
<div>
  <Label>Cost (KSh) *</Label>
  <Input
    type="number"
    min="0"
    step="0.01"
    value={formData.cost}
    onChange={(e) => handleInputChange('cost', e.target.value)}
    placeholder="Enter document cost"
    required
  />
</div>
{/* Document Upload - OPTIONAL */}
        <div>
          <Label>Upload Document (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Upload the compliance document (PDF, Word, or Image files up to 10MB)
          </p>

          {!uploadedFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                id="documentFile"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
              />
              <label htmlFor="documentFile" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Click to upload document</p>
                <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
              </label>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getFileIcon(uploadedFile.type)}</span>
                  <div>
                    <p className="font-medium text-sm">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeUploadedFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600">
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
            </div>
          )}

          {/* Alternative Upload Button */}
          {uploadedFile && (
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('documentFile')?.click()}
              className="w-full mt-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              Replace Document
            </Button>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadedFile ? 'Uploading & Adding...' : 'Adding Document...'}
              </>
            ) : (
              'Add Document'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
