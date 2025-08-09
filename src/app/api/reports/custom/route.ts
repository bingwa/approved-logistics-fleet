import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// ENHANCED: Column mapping with detailed spare parts support
const COLUMN_MAPPINGS = {
  maintenance: {
    'Truck Number (Registration Plate)': 'truck.registration',
    'Service Date': 'serviceDate',
    'Maintenance Type': 'serviceType', 
    'Category': 'maintenanceCategory',
    'Description': 'description',
    'Labor Cost': 'laborCost',
    'Vendor': 'vendorName',
    'Technician': 'technicianName',
    'Status': 'status',
    'Mileage': 'mileageAtService',
    // NEW: Spare Parts Columns
    'Spare Parts Used': 'spareParts.names',
    'Spare Part Types': 'spareParts.categories',
    'Spare Parts Quantity': 'spareParts.totalQuantity',
    'Spare Parts Unit Price': 'spareParts.averageUnitPrice',
    'Spare Parts Total Cost': 'spareParts.totalCost',
    'Parts Destination/Location': 'spareParts.destinations',
    'Spare Parts Cost Breakdown': 'spareParts.costBreakdown',
    'Individual Spare Part Costs': 'spareParts.individualCosts',
    'Spare Parts vs Labor Cost Ratio': 'spareParts.laborRatio',
    'Total Parts Investment': 'spareParts.totalInvestment',
    'Spare Parts Details': 'spareParts.fullDetails',
    'Parts Cost Analysis': 'spareParts.costAnalysis',
    'Parts Installation Location': 'spareParts.installationLocations'
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
    'Days to Expiry': 'daysToExpiry',
    'Cost': 'cost',
    'Authority': 'issuingAuthority'
  },
  // NEW: Dedicated spare parts mapping
  spares: {
    'Truck Number (Registration Plate)': 'truck.registration',
    'Service Date': 'maintenanceRecord.serviceDate',
    'Spare Part Name': 'name',
    'Spare Part Category/Type': 'category',
    'Quantity Used': 'quantity',
    'Unit Price': 'unitPrice',
    'Total Cost': 'totalPrice',
    'Supplier/Vendor': 'supplier',
    'Destination/Installation Location': 'installationLocation',
    'Part Number/Code': 'partNumber',
    'Maintenance Reference': 'maintenanceRecord.description',
    'Cost per Unit Analysis': 'costAnalysis',
    'Maintenance Type': 'maintenanceRecord.serviceType'
  }
}

// NEW: Enhanced spare parts data processing
function processSparePartsData(spareParts: any[]): any {
  if (!spareParts || spareParts.length === 0) {
    return {
      names: 'No spare parts used',
      categories: 'N/A',
      totalQuantity: 0,
      averageUnitPrice: 0,
      totalCost: 0,
      destinations: 'N/A',
      costBreakdown: 'No parts used',
      individualCosts: 'N/A',
      laborRatio: 'N/A',
      totalInvestment: 0,
      fullDetails: 'No spare parts used in this service',
      costAnalysis: 'No cost analysis available',
      installationLocations: 'N/A'
    }
  }

  const totalCost = spareParts.reduce((sum, part) => sum + (part.totalPrice || 0), 0)
  const totalQuantity = spareParts.reduce((sum, part) => sum + (part.quantity || 0), 0)
  const averageUnitPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0

  return {
    names: spareParts.map(p => p.name).join(', '),
    categories: [...new Set(spareParts.map(p => p.category || 'General'))].join(', '),
    totalQuantity,
    averageUnitPrice: Math.round(averageUnitPrice * 100) / 100,
    totalCost,
    destinations: spareParts.map(p => p.installationLocation || 'Workshop').join(', '),
    costBreakdown: spareParts.map(p => `${p.name}: ${formatKSH(p.totalPrice || 0)}`).join(' | '),
    individualCosts: spareParts.map(p => `${p.name} (Qty: ${p.quantity}) = ${formatKSH(p.totalPrice || 0)}`).join(' | '),
    laborRatio: 'Calculated per service record',
    totalInvestment: totalCost,
    fullDetails: spareParts.map(p => 
      `${p.name} - Qty: ${p.quantity}, Unit: ${formatKSH(p.unitPrice || 0)}, Total: ${formatKSH(p.totalPrice || 0)}, Location: ${p.installationLocation || 'Workshop'}`
    ).join(' | '),
    costAnalysis: `Total: ${formatKSH(totalCost)}, Avg Unit: ${formatKSH(averageUnitPrice)}, Items: ${spareParts.length}`,
    installationLocations: [...new Set(spareParts.map(p => p.installationLocation || 'Workshop'))].join(', ')
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
      
      // Calculate labor ratio
      const laborCost = record.laborCost || 0;
      const partsCost = record.spareParts.totalCost || 0;
      record.spareParts.laborRatio = laborCost > 0 ? 
        `Parts: ${Math.round((partsCost / (laborCost + partsCost)) * 100)}% | Labor: ${Math.round((laborCost / (laborCost + partsCost)) * 100)}%` : 
        'No labor cost data';
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
          
          mappedRecord[columnName] = value || 'N/A';
        } else {
          mappedRecord[columnName] = record[dbField] || 'N/A';
        }
      } else {
        mappedRecord[columnName] = record[columnName] || 'N/A';
      }
    });
    
    return mappedRecord;
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    console.log('[DEBUG] Custom report request with spare parts focus:', JSON.stringify(body, null, 2))

    // Build where condition
    const whereCondition: any = {}
    if (truckIds && truckIds.length > 0 && !truckIds.includes('all')) {
      whereCondition.truckId = { in: truckIds }
    }

    if (dateRange?.from || dateRange?.to) {
      const dateFilter: any = {}
      if (dateRange.from) dateFilter.gte = new Date(dateRange.from)
      if (dateRange.to) dateFilter.lte = new Date(dateRange.to)
      whereCondition.createdAt = dateFilter
    }

    const reportData: any = {}

    // Fetch trucks
    const trucks = await prisma.truck.findMany({
      where: truckIds?.includes('all') ? {} : { id: { in: truckIds || [] } },
      include: {
        _count: {
          select: {
            fuelRecords: true,
            maintenanceRecords: true,
            complianceDocuments: true,
            spareParts: true
          }
        }
      }
    })
    reportData.trucks = trucks

    // ENHANCED: Fetch maintenance with comprehensive spare parts data
    if (fields?.includes('maintenance')) {
      const maintenanceRecords = await prisma.maintenanceRecord.findMany({
        where: whereCondition,
        include: {
          truck: {
            select: { registration: true, make: true, model: true }
          },
          spareParts: {
            select: {
              name: true,
              category: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              supplier: true,
              installationLocation: true,
              partNumber: true,
              createdAt: true
            }
          },
          user: {
            select: { name: true }
          }
        },
        orderBy: { serviceDate: 'desc' }
      })
      reportData.maintenanceRecords = maintenanceRecords
    }

    // NEW: Fetch dedicated spare parts data
    if (fields?.includes('spares')) {
      const sparePartsRecords = await prisma.sparePart.findMany({
        where: {
          maintenanceRecord: whereCondition
        },
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
      
      // Flatten the data for easier reporting
      const flattenedSpares = sparePartsRecords.map(spare => ({
        ...spare,
        truck: spare.maintenanceRecord?.truck,
        serviceDate: spare.maintenanceRecord?.serviceDate,
        serviceType: spare.maintenanceRecord?.serviceType,
        costAnalysis: `Unit: ${formatKSH(spare.unitPrice || 0)} × ${spare.quantity} = ${formatKSH(spare.totalPrice || 0)}`
      }))
      
      reportData.spareParts = flattenedSpares
    }

    // Fetch fuel records
    if (fields?.includes('fuel')) {
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
    }

    // Fetch compliance
    if (fields?.includes('compliance')) {
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
    }

    // Enhanced analytics with spare parts focus
    const analytics = calculateAnalyticsWithSpares(reportData)

    // Map data to selected columns
    const mappedData: any = {}
    
    Object.keys(selectedColumns || {}).forEach(fieldType => {
      let rawData = [];
      
      if (fieldType === 'spares') {
        rawData = reportData.spareParts || []
      } else {
        rawData = reportData[`${fieldType}Records`] || reportData[fieldType] || []
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
        dateRange,
        trucksIncluded: trucks.length,
        fields: Object.keys(selectedColumns || {}),
        selectedColumns,
        sparePartsFocus: true // NEW: Indicate spare parts focus
      },
      trucks: reportData.trucks,
      data: mappedData,
      analytics
    }

    return NextResponse.json({ 
      success: true, 
      report: finalReport
    })

  } catch (error) {
    console.error('[DEBUG] Error generating spare parts focused report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report. Please try again.' },
      { status: 500 }
    )
  }
}

// ENHANCED: Analytics with spare parts focus
function calculateAnalyticsWithSpares(data: any) {
  const analytics: any = {}

  // Fuel analytics (existing)
  if (data.fuelRecords?.length > 0) {
    const fuelRecords = data.fuelRecords
    const totalLiters = fuelRecords.reduce((sum: number, r: any) => sum + (r.liters || 0), 0)
    const totalCost = fuelRecords.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0)

    analytics.fuel = {
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      recordsCount: fuelRecords.length
    }
  }

  // ENHANCED: Maintenance analytics with spare parts breakdown
  if (data.maintenanceRecords?.length > 0) {
    const maintenanceRecords = data.maintenanceRecords
    const totalLaborCost = maintenanceRecords.reduce((sum: number, r: any) => sum + (r.laborCost || 0), 0)
    const totalPartsCost = maintenanceRecords.reduce((sum: number, r: any) => {
      return sum + (r.spareParts || []).reduce((pSum: number, part: any) => pSum + (part.totalPrice || 0), 0)
    }, 0)

    // NEW: Detailed spare parts analytics
    const allSpareParts = maintenanceRecords.flatMap((r: any) => r.spareParts || [])
    const sparePartsAnalytics = {
      totalPartsUsed: allSpareParts.length,
      totalPartsQuantity: allSpareParts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0),
      averagePartCost: allSpareParts.length > 0 ? totalPartsCost / allSpareParts.length : 0,
      mostExpensivePart: allSpareParts.reduce((max: any, part: any) => 
        (part.totalPrice || 0) > (max.totalPrice || 0) ? part : max, {}),
      partCategories: [...new Set(allSpareParts.map((p: any) => p.category).filter(Boolean))],
      topSuppliers: [...new Set(allSpareParts.map((p: any) => p.supplier).filter(Boolean))]
    }

    analytics.maintenance = {
      totalLaborCost: Math.round(totalLaborCost * 100) / 100,
      totalPartsCost: Math.round(totalPartsCost * 100) / 100,
      totalMaintenanceCost: Math.round((totalLaborCost + totalPartsCost) * 100) / 100,
      laborToPartsRatio: totalPartsCost > 0 ? Math.round((totalLaborCost / totalPartsCost) * 100) / 100 : 'No parts data',
      recordsCount: maintenanceRecords.length,
      spareParts: sparePartsAnalytics
    }
  }

  // NEW: Dedicated spare parts analytics
  if (data.spareParts?.length > 0) {
    const spareParts = data.spareParts
    const totalSparesCost = spareParts.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0)
    const totalQuantity = spareParts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)

    analytics.spareParts = {
      totalCost: Math.round(totalSparesCost * 100) / 100,
      totalQuantity,
      averageCostPerPart: spareParts.length > 0 ? Math.round((totalSparesCost / spareParts.length) * 100) / 100 : 0,
      uniquePartTypes: [...new Set(spareParts.map((p: any) => p.category).filter(Boolean))].length,
      topPartsByValue: spareParts
        .sort((a: any, b: any) => (b.totalPrice || 0) - (a.totalPrice || 0))
        .slice(0, 5)
        .map((p: any) => ({ name: p.name, cost: p.totalPrice })),
      installationLocations: [...new Set(spareParts.map((p: any) => p.installationLocation).filter(Boolean))]
    }
  }

  // Compliance analytics (existing)
  if (data.complianceDocuments?.length > 0) {
    const complianceDocuments = data.complianceDocuments
    analytics.compliance = {
      totalCost: Math.round(complianceDocuments.reduce((sum: number, d: any) => sum + (d.cost || 0), 0) * 100) / 100,
      validCount: complianceDocuments.filter((d: any) => d.status === 'VALID').length,
      expiringCount: complianceDocuments.filter((d: any) => d.status === 'EXPIRING').length,
      expiredCount: complianceDocuments.filter((d: any) => d.status === 'EXPIRED').length,
      documentsCount: complianceDocuments.length
    }
  }

  // Overall analytics with spare parts emphasis
  const totalOperationalCost = (analytics.fuel?.totalCost || 0) + 
                               (analytics.maintenance?.totalMaintenanceCost || 0) + 
                               (analytics.compliance?.totalCost || 0)

  analytics.overall = {
    totalOperationalCost: Math.round(totalOperationalCost * 100) / 100,
    costBreakdown: {
      fuel: analytics.fuel?.totalCost || 0,
      labor: analytics.maintenance?.totalLaborCost || 0,
      spareParts: analytics.maintenance?.totalPartsCost || 0,
      compliance: analytics.compliance?.totalCost || 0
    },
    sparePartsPercentage: totalOperationalCost > 0 ? 
      Math.round(((analytics.maintenance?.totalPartsCost || 0) / totalOperationalCost) * 100) : 0
  }

  return analytics
}

// Helper function for formatting (if not available)
function formatKSH(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
