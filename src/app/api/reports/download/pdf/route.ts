import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import puppeteer from 'puppeteer'

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
        return `
          <div class="no-data-section">
            <div class="no-data-icon">📄</div>
            <p>No ${fieldType} data available</p>
          </div>
        `
      }

      const displayData = data.slice(0, 100) // Show more records in PDF

      const tableHeader = columns.map(col => `<th>${col}</th>`).join('')
      const tableRows = displayData.map((row, index) => {
        const cells = columns.map(col => {
          let value = row[col] || 'N/A'
          if (typeof value === 'number' && col.toLowerCase().includes('cost')) {
            value = formatKSH(value)
          }
          return `<td>${value}</td>`
        }).join('')
        return `<tr class="${index % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`
      }).join('')

      return `
        <div class="data-section">
          <h2 class="section-title">
            <span class="section-icon">${getFieldIcon(fieldType)}</span>
            ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Records
            <span class="record-count">(${data.length} total)</span>
          </h2>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>${tableHeader}</tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
          ${data.length > 100 ? `<p class="table-note">Showing first 100 of ${data.length} total records</p>` : ''}
        </div>
      `
    }

    const getFieldIcon = (fieldType: string) => {
      const icons = {
        maintenance: '🔧',
        fuel: '⛽',
        compliance: '📋',
        spares: '🔩'
      }
      return icons[fieldType] || '📊'
    }

    // Build tables for each data type
    const tables = Object.keys(selectedColumns || {})
      .map(fieldType => {
        const data = report.data[fieldType] || []
        const columns = selectedColumns[fieldType] || []
        return generateTableHTML(fieldType, data, columns)
      })
      .join('')

    // Complete professional HTML template
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fleet Management Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #fff;
          font-size: 12px;
        }
        
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 25px;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        
        .header .subtitle {
          font-size: 16px;
          color: #64748b;
          margin-bottom: 5px;
        }
        
        .header .date {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
          background: #f8fafc;
          padding: 25px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .metadata-item {
          display: flex;
          flex-direction: column;
        }
        
        .metadata-label {
          font-weight: 600;
          font-size: 11px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .metadata-value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
        }
        
        .data-section {
          margin-bottom: 45px;
          page-break-inside: avoid;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .section-icon {
          font-size: 24px;
          margin-right: 10px;
        }
        
        .record-count {
          font-size: 14px;
          font-weight: 400;
          color: #64748b;
          margin-left: auto;
        }
        
        .table-container {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          background: white;
        }
        
        .data-table th {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 10px;
          border-bottom: 2px solid #0f172a;
          position: sticky;
          top: 0;
        }
        
        .data-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
          word-break: break-word;
          max-width: 150px;
        }
        
        .data-table tr.even {
          background: #f8fafc;
        }
        
        .data-table tr.odd {
          background: white;
        }
        
        .data-table tr:hover {
          background: #f0f9ff;
        }
        
        .table-note {
          margin-top: 15px;
          padding: 10px;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          font-style: italic;
          font-size: 11px;
          color: #92400e;
          border-radius: 4px;
        }
        
        .no-data-section {
          text-align: center;
          padding: 60px 20px;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px dashed #d1d5db;
          margin-bottom: 30px;
        }
        
        .no-data-icon {
          font-size: 48px;
          margin-bottom: 15px;
          opacity: 0.5;
        }
        
        .summary-section {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          padding: 30px;
          border-radius: 12px;
          margin-top: 40px;
          border: 1px solid #bfdbfe;
        }
        
        .summary-title {
          font-size: 20px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 25px;
        }
        
        .summary-card {
          text-align: center;
          background: rgba(255, 255, 255, 0.8);
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e0e7ff;
        }
        
        .summary-number {
          font-size: 32px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 8px;
        }
        
        .summary-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 25px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 11px;
        }
        
        .footer p {
          margin: 5px 0;
        }
        
        .footer .company-name {
          font-weight: 600;
          color: #1e293b;
        }
        
        @media print {
          body { margin: 0; }
          .container { padding: 15mm; }
          .data-section { page-break-inside: avoid; }
          .summary-section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Fleet Management Report</h1>
          <div class="subtitle">Comprehensive Fleet Analysis & Documentation</div>
          <div class="date">Generated on ${new Date(report.metadata.generatedAt).toLocaleDateString('en-KE', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>

        <div class="metadata-grid">
          <div class="metadata-item">
            <div class="metadata-label">Report Type</div>
            <div class="metadata-value">${report.metadata.reportType || 'Comprehensive Analysis'}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Generated By</div>
            <div class="metadata-value">${report.metadata.generatedBy}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Fleet Size</div>
            <div class="metadata-value">${report.metadata.trucksIncluded} vehicles</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Data Categories</div>
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

        <div class="summary-section">
          <div class="summary-title">Report Summary</div>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-number">${report.analytics.maintenance.recordsCount}</div>
              <div class="summary-label">Maintenance Records</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${report.analytics.fuel.recordsCount}</div>
              <div class="summary-label">Fuel Records</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${report.analytics.compliance.recordsCount}</div>
              <div class="summary-label">Compliance Documents</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${report.analytics.spares.recordsCount}</div>
              <div class="summary-label">Spare Parts</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p class="company-name">Fleet Management System</p>
          <p>This report contains confidential fleet information and is intended for authorized personnel only.</p>
          <p>© ${new Date().getFullYear()} Fleet Management - Professional Fleet Solutions</p>
          <p>Report ID: FM-${Date.now()} | Generated automatically by Fleet Management System v2.0</p>
        </div>
      </div>
    </body>
    </html>
    `

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      displayHeaderFooter: false
    })

    await browser.close()

    // Generate filename
    const filename = `fleet-report-${new Date().toISOString().split('T')[0]}.pdf`

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      }
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
