// src/lib/fileUpload.ts
import path from 'path'
import fs from 'fs'

export const UPLOAD_DIRS = {
  fuel: 'public/uploads/fuel',
  maintenance: 'public/uploads/maintenance',
  compliance: 'public/uploads/compliance',
  spares: 'public/uploads/spares'
}

// Ensure upload directories exist
export const ensureUploadDirs = () => {
  Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

// Generate unique filename
export const generateUniqueFilename = (originalName: string) => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = path.extname(originalName)
  const basename = path.basename(originalName, extension)
  return `${timestamp}-${randomString}-${basename}${extension}`
}

// Validate file type and size
export const validateFile = (file: File) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf'
  ]
  
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, and PDF files are allowed')
  }
  
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB')
  }
  
  return true
}
