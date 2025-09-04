import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/* ---------- helpers ---------- */
const formatKSH = (n: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const formatCell = (row: any, col: string) => {
  const v = row[col]
  if (v == null) return ''
  const c = col.toLowerCase()
  if (c.includes('date')) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-KE')
  }
  if (c.includes('cost') || c.includes('amount')) {
    return typeof v === 'number' ? formatKSH(v) : v
  }
  return v.toString()
}

/* ---------- HTML builder ---------- */
function tableSection(title: string, rows: any[], columns: string[]) {
  if (!rows?.length) return `<p><em>No ${title.toLowerCase()} data available</em></p>`
  return `
    <h2>${title}</h2>
    <table>
      <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.slice(0, 100)
          .map(
            r => `<tr>${columns.map(c => `<td>${formatCell(r, c)}</td>`).join('')}</tr>`,
          )
          .join('')}
      </tbody>
    </table>`
}

function htmlReport(report: any, cols: any) {
  return `
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body{font-family:Arial,sans-serif;margin:20px;}
      h1{text-align:center}
      table{width:100%;border-collapse:collapse;margin-bottom:30px}
      th,td{border:1px solid #000;padding:6px;font-size:12px}
      th{background:#f0f0f0}
    </style>
  </head>
  <body>
    <h1>Fleet Report</h1>
    ${tableSection('Maintenance Records',   report.maintenanceRecords,   cols.maintenance)}
    ${tableSection('Fuel Records',          report.fuelRecords,          cols.fuel)}
    ${tableSection('Compliance Documents',  report.complianceDocuments,  cols.compliance)}
  </body>
  </html>`
}

/* ---------- launch browser ---------- */
async function getBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    const exe = await chromium.executablePath()
    return puppeteer.launch({
      args: [...chromium.args, '--no-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: exe,
      headless: chromium.headless,
    })
  }
  const full = require('puppeteer')
  return full.launch({ headless: true, args: ['--no-sandbox'] })
}

/* ---------- route handler ---------- */
export async function POST(req: NextRequest) {
  let browser: puppeteer.Browser | null = null

  try {
    /* auth */
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    /* payload */
    const { report, selectedColumns } = await req.json()
    if (!report) return NextResponse.json({ error: 'No report data provided' }, { status: 400 })

    /* render HTML → PDF */
    const html = htmlReport(report, selectedColumns)
    browser = await getBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })

    /* stream PDF */
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Fleet-Report.pdf"',
        'Content-Length': String(pdf.length),
      },
    })
  } catch (e) {
    console.error('[PDF] generation failed:', e)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
