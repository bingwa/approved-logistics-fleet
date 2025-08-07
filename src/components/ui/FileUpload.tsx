// src/components/ui/FileUpload.tsx
'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'

interface FileUploadProps {
  onUploadComplete: (fileUrl: string, originalName: string) => void
  category: 'fuel' | 'maintenance' | 'compliance' | 'spares'
  accept?: string
  maxSize?: number
  className?: string
  disabled?: boolean
}

export function FileUpload({ 
  onUploadComplete, 
  category, 
  accept = '.jpg,.jpeg,.png,.pdf',
  maxSize = 10,
  className = '',
  disabled = false
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (disabled) return
    
    setError(null)
    
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)

    try {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          setUploadProgress(percentComplete)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          setUploadedFile(response.originalName)
          onUploadComplete(response.fileUrl, response.originalName)
          setUploadProgress(100)
        } else {
          const errorResponse = JSON.parse(xhr.responseText)
          setError(errorResponse.error || 'Upload failed')
        }
        setIsUploading(false)
      })

      xhr.addEventListener('error', () => {
        setError('Upload failed. Please try again.')
        setIsUploading(false)
      })

      xhr.open('POST', '/api/upload')
      xhr.send(formData)

    } catch (error) {
      setError('Upload failed. Please try again.')
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const clearFile = () => {
    setUploadedFile(null)
    setError(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ext === 'pdf' ? FileText : Image
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card
              className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <CardContent className="p-8 text-center">
                {isUploading ? (
                  <div className="space-y-4">
                    <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin" />
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Uploading file...
                      </p>
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-xs text-slate-500">
                        {Math.round(uploadProgress)}% complete
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-slate-400" />
                    <div>
                      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                        Drop files here or click to upload
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Support for {accept.replace(/\./g, '').toUpperCase()} files up to {maxSize}MB
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const IconComponent = getFileIcon(uploadedFile)
                      return <IconComponent className="h-8 w-8 text-green-600" />
                    })()}
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {uploadedFile}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        File uploaded successfully
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    className="text-green-600 hover:text-green-700 hover:bg-green-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2"
        >
          <Card className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
