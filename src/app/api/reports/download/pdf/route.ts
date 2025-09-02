import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { report, selectedColumns } = await request.json()

    if (!report) {
      return NextResponse.json({ error: 'No report data provided' }, { status: 400 })
    }

    // Generate clean, professional HTML for PDF
    const generateTableHTML = (fieldType: string, data: any[], columns: string[]) => {
      if (!data || data.length === 0) {
        return `<p><em>No ${fieldType} data available</em></p>`
      }

      const displayData = data.slice(0, 50) // Limit to first 50 records for PDF

      const tableHeader = columns.map(col => `<th>${col}</th>`).join('')
      const tableRows = displayData.map(row => {
        const cells = columns.map(col => {
          let value = row[col] || 'N/A'
          // Format numbers if they look like currency
          if (typeof value === 'number' && col.toLowerCase().includes('cost')) {
            value = formatKSH(value)
          }
          return `<td>${value}</td>`
        }).join('')
        return `<tr>${cells}</tr>`
      }).join('')

      return `
        <div class="table-section">
          <h3>${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Records</h3>
          <table>
            <thead>
              <tr>${tableHeader}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          ${data.length > 50 ? `<p class="note">Showing first 50 of ${data.length} total records</p>` : ''}
        </div>
      `
    }

    // Build tables for each data type
    const tables = Object.keys(selectedColumns || {})
      .map(fieldType => {
        const data = report.data[fieldType] || []
        const columns = selectedColumns[fieldType] || []
        return generateTableHTML(fieldType, data, columns)
      })
      .join('')

    // Complete HTML with inline CSS for PDF generation
    const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Fleet Management Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }
        
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          color: #1f2937;
        }
        
        .header .subtitle {
          color: #6b7280;
          font-size: 14px;
        }
        
        .metadata {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .metadata-item {
          font-size: 11px;
        }
        
        .metadata-label {
          font-weight: 600;
          color: #374151;
        }
        
        .metadata-value {
          color: #6b7280;
        }
        
        .table-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .table-section h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #1f2937;
          border-left: 4px solid #3b82f6;
          padding-left: 12px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 10px;
        }
        
        th {
          background: #f3f4f6;
          padding: 8px 6px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        
        td {
          padding: 6px;
          border: 1px solid #e5e7eb;
          vertical-align: top;
        }
        
        tr:nth-child(even) {
          background: #fafafa;
        }
        
        .note {
          font-style: italic;
          color: #6b7280;
          font-size: 10px;
          margin-top: 10px;
        }
        
        .summary {
          background: #eff6ff;
          padding: 15px;
          border-radius: 8px;
          margin-top: 30px;
        }
        
        .summary h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #1e40af;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          font-size: 11px;
        }
        
        .summary-item {
          text-align: center;
        }
        
        .summary-number {
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
        }
        
        .summary-label {
          color: #6b7280;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
        }
        
        @media print {
          body { margin: 0; }
          .page-break { page-break-before: always; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Fleet Management Report</h1>
        <div class="subtitle">Approved Logistics - Generated ${new Date(report.metadata.generatedAt).toLocaleDateString('en-KE', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</div>
      </div>

      <div class="metadata">
        <div class="metadata-item">
          <div class="metadata-label">Report Type</div>
          <div class="metadata-value">${report.metadata.reportType || 'Custom Report'}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Generated By</div>
          <div class="metadata-value">${report.metadata.generatedBy}</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Trucks Included</div>
          <div class="metadata-value">${report.metadata.trucksIncluded} trucks</div>
        </div>
        <div class="metadata-item">
          <div class="metadata-label">Data Fields</div>
          <div class="metadata-value">${report.metadata.fields.join(', ')}</div>
        </div>
        ${report.metadata.dateRange?.from ? `
        <div class="metadata-item">
          <div class="metadata-label">Date Range</div>
          <div class="metadata-value">${new Date(report.metadata.dateRange.from).toLocaleDateString('en-KE')} - ${report.metadata.dateRange.to ? new Date(report.metadata.dateRange.to).toLocaleDateString('en-KE') : 'Present'}</div>
        </div>
        ` : ''}
      </div>

      ${tables}

      <div class="summary">
        <h3>Report Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-number">${report.analytics.maintenance.recordsCount}</div>
            <div class="summary-label">Maintenance Records</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${report.analytics.fuel.recordsCount}</div>
            <div class="summary-label">Fuel Records</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${report.analytics.compliance.recordsCount}</div>
            <div class="summary-label">Compliance Documents</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${report.analytics.spares.recordsCount}</div>
            <div class="summary-label">Spare Parts</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center;">
        <p>This report was generated automatically by the Fleet Management System</p>
        <p>© ${new Date().getFullYear()} Approved Logistics - All rights reserved</p>
      </div>
    </body>
    </html>
    `

    // Return HTML for client-side PDF generation
    return NextResponse.json({
      success: true,
      html: pdfHtml,
      filename: `fleet-report-${new Date().toISOString().split('T')[0]}.pdf`
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
