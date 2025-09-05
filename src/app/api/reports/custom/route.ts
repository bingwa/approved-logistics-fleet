import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Helper function for formatting
function formatKSH(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// FIXED: Only use real database fields that actually exist
const COLUMN_MAPPINGS = {
  maintenance: {
    'Truck Number (Registration Plate)': 'truck.registration',
    'Service Date': 'serviceDate',
    'Maintenance Type': 'serviceType',
    'Description': 'description',
    'Labor Cost': 'laborCost',
    'Vendor': 'vendorName',
    'Technician': 'technicianName', 
    'Status': 'status',
    'Mileage': 'mileageAtService',
    'Spare Parts Used': 'spareParts.names',
    'Spare Parts Quantity': 'spareParts.totalQuantity',
    'Spare Parts Total Cost': 'spareParts.totalCost',
    'Parts Destination/Location': 'spareParts.destinations',
    'Parts Supplier/Vendor': 'spareParts.suppliers'
  },
  fuel: {
    'Truck Number (Registration Plate)': 'truck.registration',
    'Date': 'date',
    'Liters': 'liters',
    'Cost per Liter': 'costPerLiter',
    'Total Cost': 'totalCost',
    'Distance': 'distanceCovered',
    'Efficiency': 'efficiencyKmpl',
    'Attendant': 'attendantName',
    'Route': 'route'
  },
  compliance: {
    'Truck Number (Registration Plate)': 'truck.registration',
    'Document Type': 'documentType',
    'Certificate Number': 'certificateNumber',
    'Issue Date': 'issueDate',
    'Expiry Date': 'expiryDate',
    'Status': 'status',
    'Cost': 'cost',
    'Issuing Authority': 'issuingAuthority'
  }
}

// Process spare parts data using only real fields
function processSparePartsData(spareParts: any[]): any {
  if (!spareParts || spareParts.length === 0) {
    return {
      names: 'No spare parts used',
      totalQuantity: 0,
      totalCost: 0,
      destinations: 'N/A',
      suppliers: 'N/A'
    }
  }

  const totalCost = spareParts.reduce((sum, part) => sum + (part.totalPrice || 0), 0)
  const totalQuantity = spareParts.reduce((sum, part) => sum + (part.quantity || 0), 0)

  return {
    names: spareParts.map(p => p.name).join(', '),
    totalQuantity,
    totalCost,
    destinations: 'Various locations',
    suppliers: 'Various suppliers'
  }
}

function mapDataToSelectedColumns(data: any[], fieldType: string, selectedColumns: string[]) {
  if (!selectedColumns || selectedColumns.length === 0) return data

  const mappings = COLUMN_MAPPINGS[fieldType as keyof typeof COLUMN_MAPPINGS] || {}

  return data.map(record => {
    const mappedRecord: any = {}

    // Process spare parts data for maintenance records
    if (fieldType === 'maintenance' && record.spareParts) {
      record.spareParts = processSparePartsData(record.spareParts)
    }

    selectedColumns.forEach(columnName => {
      const dbField = mappings[columnName]

      if (dbField) {
        // Handle nested properties
        if (dbField.includes('.')) {
          const parts = dbField.split('.')
          let value = record
          for (const part of parts) {
            value = value?.[part]
            if (value === undefined || value === null) break
          }
          mappedRecord[columnName] = value || 'N/A'
        } else {
          mappedRecord[columnName] = record[dbField] || 'N/A'
        }
      } else {
        mappedRecord[columnName] = record[columnName] || 'N/A'
      }
    })

    return mappedRecord
  })
}

export async function POST(request: NextRequest) {
  console.log('🔧 [API] Custom reports API called')
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('🔧 [API] No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 [API] Session valid for user:', session.user.id)

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: session.user.email || '' }
      })
      if (existingUserByEmail) {
        user = await prisma.user.update({
          where: { email: session.user.email || '' },
          data: { id: session.user.id }
        })
      } else {
        user = await prisma.user.create({
          data: {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.name || '',
          }
        })
      }
    }

    const body = await request.json()
    const {
      truckIds,
      fields,
      selectedColumns,
      dateRange,
      reportType,
      format = 'json'
    } = body

    console.log('🔧 [API] Request body:', JSON.stringify(body, null, 2))

    // Build where condition - REMOVED RESTRICTIVE FILTERS
    const whereCondition: any = {}
    if (truckIds && truckIds.length > 0 && !truckIds.includes('all')) {
      whereCondition.truckId = { in: truckIds }
    }

    console.log('🔧 [API] Where condition:', whereCondition)

    const reportData: any = {}

    // Fetch trucks
    const trucks = await prisma.truck.findMany({
      where: truckIds?.includes('all') ? {} : { id: { in: truckIds || [] } },
      select: { id: true, registration: true, make: true, model: true }
    })
    reportData.trucks = trucks

    // Fetch maintenance with ONLY real spare parts fields
    if (fields?.includes('maintenance')) {
      console.log('🔧 [API] Fetching maintenance records...')
      const maintenanceRecords = await prisma.maintenanceRecord.findMany({
        where: whereCondition,
        include: {
          truck: {
            select: { registration: true, make: true, model: true }
          },
          spareParts: {
            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              createdAt: true
              // REMOVED: supplier, installationLocation, partNumber (don't exist)
            }
          },
          user: {
            select: { name: true }
          }
        },
        orderBy: { serviceDate: 'desc' }
      })
      reportData.maintenanceRecords = maintenanceRecords
      console.log('🔧 [API] Maintenance records fetched:', maintenanceRecords.length)
    }

    // Fetch fuel records
    if (fields?.includes('fuel')) {
      console.log('🔧 [API] Fetching fuel records...')
      const fuelRecords = await prisma.fuelRecord.findMany({
        where: whereCondition,
        include: {
          truck: {
            select: { registration: true, make: true, model: true }
          }
        },
        orderBy: { date: 'desc' }
      })
      reportData.fuelRecords = fuelRecords
      console.log('🔧 [API] Fuel records fetched:', fuelRecords.length)
    }

    // Fetch compliance documents
    if (fields?.includes('compliance')) {
      console.log('🔧 [API] Fetching compliance documents...')
      const complianceDocuments = await prisma.complianceDocument.findMany({
        where: whereCondition,
        include: {
          truck: {
            select: { registration: true, make: true, model: true }
          },
          user: {
            select: { name: true }
          }
        },
        orderBy: { expiryDate: 'asc' }
      })
      reportData.complianceDocuments = complianceDocuments
      console.log('🔧 [API] Compliance documents fetched:', complianceDocuments.length)
    }

    // Map data to selected columns
    const mappedData: any = {}
    Object.keys(selectedColumns || {}).forEach(fieldType => {
      let rawData = []
      if (fieldType === 'maintenance') {
        rawData = reportData.maintenanceRecords || []
      } else if (fieldType === 'fuel') {
        rawData = reportData.fuelRecords || []
      } else if (fieldType === 'compliance') {
        rawData = reportData.complianceDocuments || []
      }

      const columns = selectedColumns[fieldType] || []
      if (rawData.length > 0 && columns.length > 0) {
        mappedData[fieldType] = mapDataToSelectedColumns(rawData, fieldType, columns)
      }
    })

    const finalReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.name || session.user.email,
        reportType,
        trucksIncluded: trucks.length,
        fields: Object.keys(selectedColumns || {}),
        selectedColumns
      },
      trucks: reportData.trucks,
      data: mappedData
    }

    console.log('🔧 [API] Report generated successfully with data:', {
      maintenance: finalReport.data.maintenance?.length || 0,
      fuel: finalReport.data.fuel?.length || 0,
      compliance: finalReport.data.compliance?.length || 0
    })

    return NextResponse.json({
      success: true,
      report: finalReport
    })

  } catch (error) {
    console.error('🔧 [API] ERROR generating custom report:', error)
    console.error('🔧 [API] Error stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate report. Please try again.',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
