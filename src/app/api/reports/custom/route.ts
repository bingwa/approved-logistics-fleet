import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// FIXED: Updated maintenance columns to match your actual maintenance form fields
const COLUMN_MAPPINGS = {
  maintenance: {
    'Truck Number (Registration Plate)': 'truck.registration',
    'Service Date': 'serviceDate',
    'Maintenance Type': 'serviceType',
    'Description': 'description',
    'Labor Cost': 'laborCost',
    'Vendor Name': 'vendorName',
    'Technician Name': 'technicianName',
    'Status': 'status',
    'Mileage at Service': 'mileageAtService',
    'Route Taken': 'routeTaken',
    'Next Service Date': 'nextServiceDate',
    'Created By': 'user.name',
    // Simplified spare parts columns that actually exist
    'Spare Parts Used': 'spareParts.names',
    'Total Spare Parts Cost': 'spareParts.totalCost',
    'Spare Parts Count': 'spareParts.count'
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
  },
  spares: {
    'Truck Number (Registration Plate)': 'truck.registration',
    'Service Date': 'maintenanceRecord.serviceDate',
    'Spare Part Name': 'name',
    'Quantity Used': 'quantity',
    'Unit Price': 'unitPrice',
    'Total Cost': 'totalPrice',
    'Installation Location': 'installationLocation',
    'Part Number': 'partNumber',
    'Maintenance Reference': 'maintenanceRecord.description'
  }
}

// Helper function for formatting
function formatKSH(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Simplified spare parts processing
function processSparePartsData(spareParts: any[]): any {
  if (!spareParts || spareParts.length === 0) {
    return {
      names: 'No spare parts used',
      totalCost: 0,
      count: 0
    }
  }

  const totalCost = spareParts.reduce((sum, part) => sum + (part.totalPrice || 0), 0)
  return {
    names: spareParts.map(p => p.name).join(', '),
    totalCost: Math.round(totalCost * 100) / 100,
    count: spareParts.length
  }
}

function mapDataToSelectedColumns(data: any[], fieldType: string, selectedColumns: string[]) {
  if (!selectedColumns || selectedColumns.length === 0) return data;

  const mappings = COLUMN_MAPPINGS[fieldType as keyof typeof COLUMN_MAPPINGS] || {};

  return data.map(record => {
    const mappedRecord: any = {};

    // Process spare parts data for maintenance records
    if (fieldType === 'maintenance' && record.spareParts) {
      record.spareParts = processSparePartsData(record.spareParts);
    }

    selectedColumns.forEach(columnName => {
      const dbField = mappings[columnName];
      if (dbField) {
        // Handle nested properties
        if (dbField.includes('.')) {
          const parts = dbField.split('.');
          let value = record;
          for (const part of parts) {
            value = value?.[part];
            if (value === undefined || value === null) break;
          }

          // Format specific field types
          if (columnName.includes('Date') && value && value !== 'N/A') {
            try {
              value = new Date(value).toLocaleDateString('en-KE')
            } catch (e) {
              // Keep original value if date parsing fails
            }
          }

          if (columnName.includes('Cost') && typeof value === 'number') {
            value = formatKSH(value)
          }

          mappedRecord[columnName] = value || 'N/A';
        } else {
          let value = record[dbField];
          // Format specific field types
          if (columnName.includes('Date') && value && value !== 'N/A') {
            try {
              value = new Date(value).toLocaleDateString('en-KE')
            } catch (e) {
              // Keep original value if date parsing fails
            }
          }

          if (columnName.includes('Cost') && typeof value === 'number') {
            value = formatKSH(value)
          }

          mappedRecord[columnName] = value || 'N/A';
        }
      } else {
        mappedRecord[columnName] = 'N/A';
      }
    });

    return mappedRecord;
  });
}

export async function POST(request: NextRequest) {
  console.log('[DEBUG] === CUSTOM REPORTS API START ===')
  
  try {
    // Step 1: Check session
    console.log('[DEBUG] Step 1: Checking session...')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('[DEBUG] FAIL: No session found')
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'No valid session found'
      }, { status: 401 })
    }

    console.log('[DEBUG] Session valid for user:', session.user.id)

    // Step 2: Parse request body
    console.log('[DEBUG] Step 2: Parsing request body...')
    let body
    try {
      body = await request.json()
      console.log('[DEBUG] Request body parsed:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('[DEBUG] FAIL: Error parsing request body:', parseError)
      return NextResponse.json({
        error: 'Invalid request body',
        details: 'Could not parse JSON from request'
      }, { status: 400 })
    }

    const { truckIds, fields, selectedColumns, dateRange, reportType } = body

    // Step 3: Validate required fields
    console.log('[DEBUG] Step 3: Validating request...')
    if (!truckIds || !Array.isArray(truckIds) || truckIds.length === 0) {
      return NextResponse.json({
        error: 'Invalid truck selection',
        details: 'Please select at least one truck'
      }, { status: 400 })
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({
        error: 'Invalid field selection',
        details: 'Please select at least one data field'
      }, { status: 400 })
    }

    // Step 4: FIXED - Ensure user exists with upsert
    console.log('[DEBUG] Step 4: Ensuring user exists...')
    try {
      const user = await prisma.user.upsert({
        where: { 
          id: session.user.id 
        },
        update: {
          // Update existing user fields if needed
          name: session.user.name || '',
          email: session.user.email || '',
        },
        create: {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.name || '',
        }
      })

      console.log('[DEBUG] User ready:', user.id)
    } catch (userError) {
      console.error('[DEBUG] FAIL: User upsert error:', userError)
      return NextResponse.json({
        error: 'User setup failed',
        details: userError instanceof Error ? userError.message : 'Unknown user error'
      }, { status: 500 })
    }

    // Step 5: Build where condition
    console.log('[DEBUG] Step 5: Building database query conditions...')
    const whereCondition: any = {}
    
    if (truckIds && truckIds.length > 0 && !truckIds.includes('all')) {
      whereCondition.truckId = { in: truckIds }
    }

    if (dateRange?.from || dateRange?.to) {
      const dateFilter: any = {}
      if (dateRange.from) dateFilter.gte = new Date(dateRange.from)
      if (dateRange.to) dateFilter.lte = new Date(dateRange.to)
      whereCondition.serviceDate = dateFilter
    }

    console.log('[DEBUG] Where condition:', JSON.stringify(whereCondition, null, 2))

    const reportData: any = {}

    // Step 6: Fetch trucks
    console.log('[DEBUG] Step 6: Fetching trucks...')
    try {
      const trucks = await prisma.truck.findMany({
        where: truckIds?.includes('all') ? {} : { id: { in: truckIds || [] } },
        select: { id: true, registration: true, make: true, model: true }
      })
      
      console.log('[DEBUG] Found trucks:', trucks.length)
      reportData.trucks = trucks

      if (trucks.length === 0) {
        return NextResponse.json({
          error: 'No trucks found',
          details: 'No trucks match the selected criteria'
        }, { status: 404 })
      }
    } catch (truckError) {
      console.error('[DEBUG] FAIL: Error fetching trucks:', truckError)
      return NextResponse.json({
        error: 'Database error fetching trucks',
        details: truckError instanceof Error ? truckError.message : 'Unknown truck fetch error'
      }, { status: 500 })
    }

    // Step 7: Fetch maintenance records if requested
    if (fields?.includes('maintenance')) {
      console.log('[DEBUG] Step 7: Fetching maintenance records...')
      try {
        const maintenanceRecords = await prisma.maintenanceRecord.findMany({
          where: whereCondition,
          include: {
            truck: {
              select: { id: true, registration: true, make: true, model: true }
            },
            spareParts: {
              select: {
                id: true,
                name: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                installationLocation: true,
                partNumber: true
              }
            },
            user: {
              select: { id: true, name: true }
            }
          },
          orderBy: { serviceDate: 'desc' },
          take: 100
        })

        console.log('[DEBUG] Maintenance records fetched:', maintenanceRecords.length)
        reportData.maintenanceRecords = maintenanceRecords

        if (maintenanceRecords.length > 0) {
          console.log('[DEBUG] Sample maintenance record:', {
            id: maintenanceRecords[0].id,
            serviceType: maintenanceRecords[0].serviceType,
            truck: maintenanceRecords[0].truck?.registration,
            spareParts: maintenanceRecords[0].spareParts?.length
          })
        }
      } catch (maintenanceError) {
        console.error('[DEBUG] FAIL: Error fetching maintenance records:', maintenanceError)
        return NextResponse.json({
          error: 'Database error fetching maintenance records',
          details: maintenanceError instanceof Error ? maintenanceError.message : 'Unknown maintenance fetch error'
        }, { status: 500 })
      }
    }

    // Fetch dedicated spare parts data
    if (fields?.includes('spares')) {
      console.log('[DEBUG] Fetching spare parts records...')
      try {
        const sparePartsRecords = await prisma.sparePart.findMany({
          include: {
            maintenanceRecord: {
              select: {
                serviceDate: true,
                serviceType: true,
                description: true,
                truck: {
                  select: { registration: true, make: true, model: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        const flattenedSpares = sparePartsRecords.map(spare => ({
          ...spare,
          truck: spare.maintenanceRecord?.truck,
          serviceDate: spare.maintenanceRecord?.serviceDate,
          serviceType: spare.maintenanceRecord?.serviceType
        }))

        reportData.spareParts = flattenedSpares
        console.log('[DEBUG] Spare parts records processed:', flattenedSpares.length)
      } catch (sparePartsError) {
        console.error('[DEBUG] FAIL: Error fetching spare parts:', sparePartsError)
        return NextResponse.json({
          error: 'Database error fetching spare parts',
          details: sparePartsError instanceof Error ? sparePartsError.message : 'Unknown spare parts fetch error'
        }, { status: 500 })
      }
    }

    // Fetch fuel records
    if (fields?.includes('fuel')) {
      console.log('[DEBUG] Fetching fuel records...')
      try {
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
        console.log('[DEBUG] Fuel records fetched:', fuelRecords.length)
      } catch (fuelError) {
        console.error('[DEBUG] FAIL: Error fetching fuel records:', fuelError)
        return NextResponse.json({
          error: 'Database error fetching fuel records',
          details: fuelError instanceof Error ? fuelError.message : 'Unknown fuel fetch error'
        }, { status: 500 })
      }
    }

    // Fetch compliance documents
    if (fields?.includes('compliance')) {
      console.log('[DEBUG] Fetching compliance documents...')
      try {
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
        console.log('[DEBUG] Compliance documents fetched:', complianceDocuments.length)
      } catch (complianceError) {
        console.error('[DEBUG] FAIL: Error fetching compliance documents:', complianceError)
        return NextResponse.json({
          error: 'Database error fetching compliance documents',
          details: complianceError instanceof Error ? complianceError.message : 'Unknown compliance fetch error'
        }, { status: 500 })
      }
    }

    // Step 8: Process and map data
    console.log('[DEBUG] Step 8: Processing and mapping data...')
    const mappedData: any = {}
    
    try {
      Object.keys(selectedColumns || {}).forEach(fieldType => {
        let rawData = []
        if (fieldType === 'maintenance') {
          rawData = reportData.maintenanceRecords || []
        } else if (fieldType === 'compliance') {
          rawData = reportData.complianceDocuments || []
        } else if (fieldType === 'spares') {
          rawData = reportData.spareParts || []
        } else {
          rawData = reportData[`${fieldType}Records`] || []
        }

        const columns = selectedColumns[fieldType] || []
        console.log(`[DEBUG] Processing ${fieldType}: ${rawData.length} records, ${columns.length} columns`)
        
        if (rawData.length > 0 && columns.length > 0) {
          mappedData[fieldType] = mapDataToSelectedColumns(rawData, fieldType, columns)
          console.log(`[DEBUG] Mapped ${fieldType} data:`, mappedData[fieldType]?.length, 'records')
        }
      })
    } catch (mappingError) {
      console.error('[DEBUG] FAIL: Error mapping data:', mappingError)
      return NextResponse.json({
        error: 'Error processing report data',
        details: mappingError instanceof Error ? mappingError.message : 'Unknown mapping error'
      }, { status: 500 })
    }

    // Step 9: Build final report
    console.log('[DEBUG] Step 9: Building final report...')
    const finalReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.name || session.user.email,
        reportType,
        dateRange,
        trucksIncluded: reportData.trucks?.length || 0,
        fields: Object.keys(selectedColumns || {}),
        selectedColumns
      },
      trucks: reportData.trucks,
      data: mappedData,
      analytics: {
        maintenance: {
          recordsCount: reportData.maintenanceRecords?.length || 0
        },
        compliance: {
          recordsCount: reportData.complianceDocuments?.length || 0
        },
        fuel: {
          recordsCount: reportData.fuelRecords?.length || 0
        },
        spares: {
          recordsCount: reportData.spareParts?.length || 0
        }
      }
    }

    console.log('[DEBUG] Final report structure:', {
      dataKeys: Object.keys(finalReport.data),
      maintenanceRecords: finalReport.data.maintenance?.length || 0,
      complianceRecords: finalReport.data.compliance?.length || 0,
      fuelRecords: finalReport.data.fuel?.length || 0,
      spareRecords: finalReport.data.spares?.length || 0
    })

    console.log('[DEBUG] === CUSTOM REPORTS API SUCCESS ===')
    
    return NextResponse.json({
      success: true,
      report: finalReport
    })

  } catch (error) {
    console.error('[DEBUG] === CUSTOM REPORTS API FATAL ERROR ===')
    console.error('[DEBUG] Fatal error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown server error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
