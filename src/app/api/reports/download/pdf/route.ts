// src/app/api/reports/download-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function formatKSH(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

async function getBrowser() {
  console.log('🔍 [PDF] Browser setup - Environment:', process.env.NODE_ENV)
  
  try {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
      console.log('🔍 [PDF] Using @sparticuz/chromium for production')
      
      const executablePath = await chromium.executablePath()
      console.log('🔍 [PDF] Chromium executable path:', executablePath)
      
      return await puppeteer.launch({
        args: [
          ...chromium.args,
          '--hide-scrollbars',
          '--disable-web-security',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      })
    } else {
      console.log('🔍 [PDF] Using system puppeteer for development')
      const puppeteerFull = require('puppeteer')
      return await puppeteerFull.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  } catch (browserError) {
    console.error('💥 [PDF] Browser launch error:', browserError)
    throw new Error(`Browser launch failed: ${browserError.message}`)
  }
}

export async function POST(request: NextRequest) {
  let browser = null
  console.log('🔍 [PDF] Starting PDF generation')

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { report, selectedColumns } = await request.json()

    if (!report) {
      return NextResponse.json({ error: 'No report data provided' }, { status: 400 })
    }

    console.log('🔍 [PDF] Report data received, launching browser...')

    // Launch browser with detailed error handling
    browser = await getBrowser()
    const page = await browser.newPage()
    
    console.log('✅ [PDF] Browser launched successfully')

    // Generate HTML content
    const generateTableHTML = (fieldType: string, data: any[], columns: string[]) => {
      if (!data || data.length === 0) {
        return `
          <div class="no-data-section">
            <div class="no-data-icon">📄</div>
            <p>No ${fieldType} data available</p>
          </div>
        `
      }

      const displayData = data.slice(0, 100)
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
            ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Records
            <span class="record-count">(${data.length} total)</span>
          </h2>
          <div class="table-container">
            <table class="data-table">
              <thead><tr>${tableHeader}</tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
          ${data.length > 100 ? `<p class="table-note">Showing first 100 of ${data.length} total records</p>` : ''}
        </div>
      `
    }

    // Build tables
    const tables = Object.keys(selectedColumns || {})
      .map(fieldType => {
        const data = report.data[fieldType] || []
        const columns = selectedColumns[fieldType] || []
        return generateTableHTML(fieldType, data, columns)
      })
      .join('')

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fleet Management Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          line-height: 1.5; color: #1f2937; background: #fff; font-size: 12px;
          max-width: 210mm; margin: 0 auto; padding: 20px;
        }
        .header {
          text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 25px;
        }
        .header h1 { font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .header .subtitle { font-size: 18px; color: #64748b; margin-bottom: 8px; }
        .data-section { margin-bottom: 40px; page-break-inside: avoid; }
        .section-title {
          font-size: 22px; font-weight: 600; color: #1e293b; margin-bottom: 20px;
          padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;
        }
        .record-count { font-size: 14px; font-weight: 400; color: #64748b; }
        .table-container {
          overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .data-table { width: 100%; border-collapse: collapse; font-size: 10px; background: white; }
        .data-table th {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white; padding: 12px 8px; text-align: left; font-weight: 600; font-size: 9px;
        }
        .data-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; word-break: break-word; }
        .data-table tr.even { background: #f8fafc; }
        .data-table tr.odd { background: white; }
        .table-note {
          margin-top: 15px; padding: 10px; background: #fef3c7; border-left: 4px solid #f59e0b;
          font-style: italic; font-size: 10px; color: #92400e;
        }
        .no-data-section {
          text-align: center; padding: 40px 20px; background: #f9fafb;
          border-radius: 8px; border: 2px dashed #d1d5db;
        }
        .no-data-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.6; }
        @media print { body { margin: 0; padding: 15mm; } .data-section { page-break-inside: avoid; } }
        @page { size: A4; margin: 15mm; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Fleet Management Report</h1>
        <div class="subtitle">Comprehensive Fleet Analysis & Documentation</div>
        <div class="date">Generated on ${new Date(report.metadata.generatedAt).toLocaleDateString('en-KE', { 
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}</div>
      </div>
      ${tables}
      <div class="footer" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px;">
        <p style="font-weight: 600; color: #1e293b;">Fleet Management System</p>
        <p>© ${new Date().getFullYear()} Fleet Management - Professional Fleet Solutions</p>
      </div>
    </body>
    </html>
    `

    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' })
    
    console.log('✅ [PDF] HTML content set, generating PDF...')
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
      displayHeaderFooter: false
    })

    console.log('✅ [PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    const filename = `fleet-report-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('💥 [PDF] Generation error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF',
      message: error.message,
      details: 'PDF generation failed - check server logs'
    }, { status: 500 })
    
  } finally {
    if (browser) {
      await browser.close()
      console.log('🔒 [PDF] Browser closed')
    }
  }
}
