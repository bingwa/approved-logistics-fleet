import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatKSH } from '@/lib/utils'

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

    // MINIMAL, CLEAN REPORT DESIGN - No excessive graphics
    const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fleet Management Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: white;
            color: #333;
            line-height: 1.5;
            font-size: 11px;
        }
        
        .container {
            width: 100%;
            max-width: none;
            padding: 20px;
        }
        
        /* MINIMAL HEADER - No fancy graphics */
        .header {
            border-bottom: 2px solid #333;
            padding: 20px 0;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
        }
        
        .header h2 {
            font-size: 16px;
            font-weight: normal;
            margin-bottom: 15px;
            color: #666;
        }
        
        .header-meta {
            font-size: 10px;
            color: #666;
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
        }
        
        /* MINIMAL SECTIONS */
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
        }
        
        /* SIMPLE STATS - No colors or graphics */
        .stats-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
        }
        
        .stat-item {
            text-align: center;
            flex: 1;
        }
        
        .stat-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
        }
        
        .stat-label {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
        }
        
        /* CLEAN DATA TABLES - Minimal design */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin: 15px 0;
            border: 1px solid #333;
        }
        
        .data-table thead {
            background: #f5f5f5;
        }
        
        .data-table th {
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 9px;
            border-bottom: 1px solid #333;
            border-right: 1px solid #ddd;
        }
        
        .data-table tbody tr {
            border-bottom: 1px solid #ddd;
        }
        
        .data-table tbody tr:nth-child(even) {
            background: #fafafa;
        }
        
        .data-table td {
            padding: 6px;
            border-right: 1px solid #ddd;
            vertical-align: top;
            word-wrap: break-word;
        }
        
        /* COMPLIANCE FOCUS - Minimal highlighting */
        .compliance-section .data-table th {
            background: #f0f0f0;
        }
        
        .compliance-urgent {
            background: #ffebee !important;
        }
        
        .compliance-expiring {
            background: #fff3e0 !important;
        }
        
        /* SPARE PARTS FOCUS - Subtle highlighting */
        .spares-section .data-table th {
            background: #f5f5f5;
        }
        
        .spares-cell {
            background: #fafafa !important;
            font-weight: 500;
        }
        
        /* MINIMAL FOOTER */
        .footer {
            border-top: 1px solid #333;
            padding: 15px 0;
            text-align: center;
            font-size: 10px;
            color: #666;
            margin-top: 30px;
        }
        
        .report-info {
            margin-top: 10px;
            font-family: monospace;
            font-size: 9px;
        }
        
        /* PRINT OPTIMIZATIONS */
        @media print {
            body {
                font-size: 9px;
                margin: 0;
            }
            
            .container {
                padding: 10px;
            }
            
            .section {
                page-break-inside: avoid;
            }
            
            .data-table {
                font-size: 8px;
            }
            
            .data-table th,
            .data-table td {
                padding: 4px 3px;
            }
        }
        
        @page {
            margin: 15mm;
            size: A4;
        }
    </style>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 1000);
        }
    </script>
</head>
<body>
    <div class="container">
        <!-- MINIMAL HEADER -->
        <div class="header">
            <h1>APPROVED LOGISTICS LIMITED</h1>
            <h2>Fleet Management Report</h2>
            
            <div class="header-meta">
                <span><strong>Generated:</strong> ${new Date(report.metadata.generatedAt).toLocaleDateString()}</span>
                <span><strong>Type:</strong> ${report.metadata.reportType || 'Custom'}</span>
                <span><strong>By:</strong> ${report.metadata.generatedBy}</span>
            </div>
        </div>

        <!-- SIMPLE FINANCIAL SUMMARY -->
        <div class="section">
            <div class="section-title">Financial Summary</div>
            
            <div class="stats-row">
                <div class="stat-item">
                    <div class="stat-value">${formatKSH(report.analytics?.overall?.totalOperationalCost || 0)}</div>
                    <div class="stat-label">Total Operational Cost</div>
                </div>
                ${report.analytics?.fuel ? `
                <div class="stat-item">
                    <div class="stat-value">${formatKSH(report.analytics.fuel.totalCost)}</div>
                    <div class="stat-label">Fuel Expenses</div>
                </div>
                ` : ''}
                ${report.analytics?.maintenance ? `
                <div class="stat-item">
                    <div class="stat-value">${formatKSH(report.analytics.maintenance.totalLaborCost)}</div>
                    <div class="stat-label">Labor Costs</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${formatKSH(report.analytics.maintenance.totalPartsCost)}</div>
                    <div class="stat-label">Spare Parts</div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- COMPLIANCE SUMMARY (if compliance data exists) -->
        ${report.analytics?.compliance ? `
        <div class="section">
            <div class="section-title">Compliance Status Summary</div>
            <div class="stats-row">
                <div class="stat-item">
                    <div class="stat-value">${report.analytics.compliance.documentsCount}</div>
                    <div class="stat-label">Total Documents</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${report.analytics.compliance.validCount}</div>
                    <div class="stat-label">Valid</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${report.analytics.compliance.expiringCount}</div>
                    <div class="stat-label">Expiring Soon</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${report.analytics.compliance.expiredCount}</div>
                    <div class="stat-label">Expired</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${report.analytics.compliance.urgentCount}</div>
                    <div class="stat-label">Urgent</div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- DATA TABLES - CLEAN AND MINIMAL -->
        ${Object.keys(selectedColumns || {}).map(fieldType => {
          if (!selectedColumns[fieldType]?.length || !report.data[fieldType]?.length) return '';
          
          const fieldTitles = {
            maintenance: 'Maintenance Records',
            fuel: 'Fuel Records', 
            compliance: 'Compliance Documents',
            analytics: 'Analytics Data',
            spares: 'Spare Parts Details'
          };
          
          const isCompliance = fieldType === 'compliance';
          const isSpares = fieldType === 'spares' || 
            selectedColumns[fieldType].some((col: string) => 
              col.toLowerCase().includes('spare') || col.toLowerCase().includes('parts'));
          
          return `
          <div class="section ${isCompliance ? 'compliance-section' : ''} ${isSpares ? 'spares-section' : ''}">
              <div class="section-title">${fieldTitles[fieldType] || fieldType} (${report.data[fieldType].length} records)</div>
              
              <table class="data-table">
                  <thead>
                      <tr>
                          ${selectedColumns[fieldType].map((col: string) => `<th>${col}</th>`).join('')}
                      </tr>
                  </thead>
                  <tbody>
                      ${report.data[fieldType].slice(0, 50).map((record: any, index: number) => {
                        // Determine row class for compliance
                        let rowClass = '';
                        if (isCompliance && record['Critical Status']) {
                          if (record['Critical Status'] === 'EXPIRED' || record['Critical Status'] === 'URGENT') {
                            rowClass = 'compliance-urgent';
                          } else if (record['Critical Status'] === 'DUE SOON') {
                            rowClass = 'compliance-expiring';
                          }
                        }
                        
                        return `
                        <tr class="${rowClass}">
                            ${selectedColumns[fieldType].map((col: string) => {
                              let value = record[col] || 'N/A';
                              
                              // Format data
                              if (col.toLowerCase().includes('date') && value !== 'N/A') {
                                try {
                                  value = new Date(value).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  });
                                } catch (e) {}
                              }
                              
                              if (col.toLowerCase().includes('cost') && typeof value === 'number') {
                                value = formatKSH(value);
                              }
                              
                              if (col.toLowerCase().includes('quantity') && typeof value === 'number') {
                                value = value.toLocaleString() + ' units';
                              }

                              if (col.toLowerCase().includes('price') && typeof value === 'number') {
                                value = formatKSH(value);
                              }
                              
                              // Highlight spare parts cells
                              const isSparesCol = col.toLowerCase().includes('spare') || 
                                                col.toLowerCase().includes('parts') ||
                                                col.toLowerCase().includes('quantity') ||
                                                col.toLowerCase().includes('destination') ||
                                                col.toLowerCase().includes('supplier');
                              
                              if (typeof value === 'string' && value.length > 40) {
                                value = value.substring(0, 40) + '...';
                              }
                              
                              return `<td class="${isSparesCol ? 'spares-cell' : ''}">${value}</td>`;
                            }).join('')}
                        </tr>
                        `;
                      }).join('')}
                      ${report.data[fieldType].length > 50 ? `
                      <tr>
                          <td colspan="${selectedColumns[fieldType].length}" style="text-align: center; padding: 15px; font-style: italic; color: #666;">
                              Showing first 50 of ${report.data[fieldType].length} total records
                          </td>
                      </tr>
                      ` : ''}
                  </tbody>
              </table>
          </div>
          `;
        }).join('')}

        <!-- MINIMAL FOOTER -->
        <div class="footer">
            <div><strong>Fleet Management System Report</strong></div>
            <div>Professional fleet analysis and compliance tracking</div>
            
            <div class="report-info">
                Report ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()} | 
                Generated: ${new Date().toISOString().substring(0, 19)}Z
            </div>
            
            <div style="margin-top: 10px; font-size: 9px;">
                © ${new Date().getFullYear()} Approved Logistics Limited. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>`

    return new Response(pdfHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="Fleet-Report-${new Date().toISOString().split('T')[0]}.html"`
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
