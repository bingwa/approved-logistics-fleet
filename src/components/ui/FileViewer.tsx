// src/components/ui/FileViewer.tsx
'use client'

import { useState } from 'react'
import { FileText, Image, Download, Eye, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface FileViewerProps {
  fileUrl: string
  fileName: string
  fileSize?: number
  className?: string
}

export function FileViewer({ fileUrl, fileName, fileSize, className = '' }: FileViewerProps) {
  const [isLoading, setIsLoading] = useState(false)

  const getFileIcon = () => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ext === 'pdf' ? FileText : Image
  }

  const getFileType = () => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ext === 'pdf' ? 'PDF Document' : 'Image File'
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const openInNewTab = () => {
    window.open(fileUrl, '_blank')
  }

  const FileIcon = getFileIcon()

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <FileIcon className="h-8 w-8 text-slate-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {fileName}
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <span>{getFileType()}</span>
                {fileSize && <span>• {formatFileSize(fileSize)}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>{fileName}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  {fileName.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={fileUrl}
                      className="w-full h-[70vh] border rounded-lg"
                      title={fileName}
                    />
                  ) : (
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-w-full h-auto rounded-lg"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={openInNewTab}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={isLoading}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
