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

    // Enhanced Print-Optimized Report with Spare Parts Focus (Fleet Asset Section Removed)
    const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fleet Management Report - Approved Logistics</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            background: white;
            color: #1a1a1a;
            line-height: 1.4;
            font-size: 11px;
        }
        
        .container {
            width: 100%;
            max-width: none;
            padding: 20px;
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 25px;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 30px;
            position: relative;
        }

        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 20%;
            right: 20%;
            height: 3px;
            background: linear-gradient(90deg, #e67e22, #f39c12, #e67e22);
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .header h2 {
            font-size: 14px;
            font-weight: normal;
            margin-bottom: 15px;
            opacity: 0.9;
        }
        
        .header-meta {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
            font-size: 10px;
        }
        
        .meta-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px;
            border-radius: 4px;
            text-align: center;
        }

        .spare-parts-focus {
            background: #e8f5e8;
            border: 2px solid #27ae60;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }

        .spare-parts-focus h3 {
            color: #27ae60;
            font-size: 16px;
            margin-bottom: 8px;
        }

        .spare-parts-focus p {
            color: #2c3e50;
            font-size: 12px;
        }
        
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .section-header {
            background: #ecf0f1;
            border-left: 4px solid #3498db;
            padding: 12px 15px;
            margin-bottom: 15px;
            border-radius: 0 4px 4px 0;
            position: relative;
        }

        .section-header.spare-parts-section {
            background: #e8f5e8;
            border-left-color: #27ae60;
        }

        .section-header.spare-parts-section::before {
            content: '🔧';
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
        }

        .section-title.spare-parts-title {
            color: #27ae60;
        }

        .section-subtitle {
            font-size: 10px;
            color: #7f8c8d;
            margin-top: 4px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
            position: relative;
        }

        .stat-card.spare-parts-card {
            background: #e8f5e8;
            border-color: #27ae60;
        }

        .stat-card.spare-parts-card::before {
            content: '⚙️';
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 12px;
        }
        
        .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .stat-value.spare-parts-value {
            color: #27ae60;
        }
        
        .stat-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin: 15px 0;
            border: 1px solid #dee2e6;
        }
        
        .data-table thead {
            background: #34495e;
            color: white;
        }

        .data-table.spare-parts-table thead {
            background: #27ae60;
        }
        
        .data-table th {
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 9px;
            border-right: 1px solid rgba(255,255,255,0.2);
        }

        .data-table th.spare-parts-column {
            background: #2ecc71 !important;
            font-weight: bold;
        }
        
        .data-table tbody tr {
            border-bottom: 1px solid #dee2e6;
        }
        
        .data-table tbody tr:nth-child(even) {
            background: #f8f9fa;
        }

        .data-table.spare-parts-table tbody tr:nth-child(even) {
            background: #f1f8f1;
        }
        
        .data-table td {
            padding: 6px;
            border-right: 1px solid #dee2e6;
            vertical-align: top;
            word-wrap: break-word;
        }

        .data-table td.spare-parts-cell {
            background: #e8f5e8 !important;
            font-weight: 500;
        }

        .spare-parts-summary {
            background: #e8f5e8;
            border: 2px solid #27ae60;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .spare-parts-summary h4 {
            color: #27ae60;
            font-size: 14px;
            margin-bottom: 15px;
            text-align: center;
            border-bottom: 2px solid #27ae60;
            padding-bottom: 8px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }

        .summary-item {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #27ae60;
        }

        .summary-item .label {
            font-size: 10px;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .summary-item .value {
            font-size: 14px;
            font-weight: bold;
            color: #27ae60;
        }

        .top-parts {
            background: white;
            padding: 12px;
            border-radius: 6px;
            margin-top: 15px;
        }

        .top-parts h5 {
            color: #27ae60;
            font-size: 12px;
            margin-bottom: 8px;
        }

        .part-item {
            font-size: 10px;
            margin-bottom: 4px;
            padding: 4px 8px;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 3px solid #27ae60;
        }

        .footer {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin-top: 30px;
        }

        .report-id {
            background: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-family: monospace;
            font-size: 10px;
        }
        
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
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
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
        <div class="header">
            <h1>APPROVED LOGISTICS LIMITED</h1>
            <h2>Fleet Management Report</h2>
            
            <div class="header-meta">
                <div class="meta-item">
                    <div><strong>Generated:</strong></div>
                    <div>${new Date(report.metadata.generatedAt).toLocaleDateString()}</div>
                </div>
                <div class="meta-item">
                    <div><strong>Report Type:</strong></div>
                    <div>${report.metadata.reportType || 'Custom'}</div>
                </div>
                <div class="meta-item">
                    <div><strong>Generated By:</strong></div>
                    <div>${report.metadata.generatedBy}</div>
                </div>
            </div>
        </div>

        ${report.metadata?.sparePartsFocus ? `
        <div class="spare-parts-focus">
            <h3>🔧 SPARE PARTS FOCUSED REPORT</h3>
            <p>This report emphasizes spare parts data including quantity, pricing, installation locations, and cost analysis as requested by management.</p>
        </div>
        ` : ''}

        <div class="section">
            <div class="section-header">
                <h3 class="section-title">💰 Financial Overview</h3>
                <div class="section-subtitle">Comprehensive operational cost breakdown</div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${formatKSH(report.analytics?.overall?.totalOperationalCost || 0)}</div>
                    <div class="stat-label">Total Operational Cost</div>
                </div>
                ${report.analytics?.fuel ? `
                <div class="stat-card">
                    <div class="stat-value">${formatKSH(report.analytics.fuel.totalCost)}</div>
                    <div class="stat-label">Fuel Expenses</div>
                </div>
                ` : ''}
                ${report.analytics?.maintenance ? `
                <div class="stat-card">
                    <div class="stat-value">${formatKSH(report.analytics.maintenance.totalLaborCost)}</div>
                    <div class="stat-label">Labor Costs</div>
                </div>
                <div class="stat-card spare-parts-card">
                    <div class="stat-value spare-parts-value">${formatKSH(report.analytics.maintenance.totalPartsCost)}</div>
                    <div class="stat-label">Spare Parts Investment</div>
                </div>
                ` : ''}
            </div>
        </div>

        ${report.analytics?.spareParts ? `
        <div class="spare-parts-summary">
            <h4>⚙️ SPARE PARTS INVESTMENT ANALYSIS</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="label">Total Parts Investment</div>
                    <div class="value">${formatKSH(report.analytics.spareParts.totalCost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Total Parts Quantity</div>
                    <div class="value">${report.analytics.spareParts.totalQuantity} units</div>
                </div>
                <div class="summary-item">
                    <div class="label">Average Cost per Part</div>
                    <div class="value">${formatKSH(report.analytics.spareParts.averageCostPerPart)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Different Part Types</div>
                    <div class="value">${report.analytics.spareParts.uniquePartTypes} categories</div>
                </div>
            </div>
            
            ${report.analytics.spareParts.topPartsByValue?.length > 0 ? `
            <div class="top-parts">
                <h5>🏆 Top 5 Most Expensive Parts:</h5>
                ${report.analytics.spareParts.topPartsByValue.slice(0, 5).map((part: any, index: number) => `
                <div class="part-item">
                    ${index + 1}. ${part.name} - <strong>${formatKSH(part.cost)}</strong>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        ` : ''}

        ${Object.keys(selectedColumns || {}).map(fieldType => {
          if (!selectedColumns[fieldType]?.length || !report.data[fieldType]?.length) return '';
          
          const fieldTitles = {
            maintenance: 'Maintenance Records with Spare Parts Details',
            fuel: 'Fuel Consumption Records', 
            compliance: 'Compliance Documentation',
            analytics: 'Performance Analytics',
            spares: '🔧 DETAILED SPARE PARTS ANALYSIS'
          };
          
          const isSparePartsRelated = fieldType === 'spares' || 
            (fieldType === 'maintenance' && selectedColumns[fieldType].some((col: string) => 
              col.toLowerCase().includes('spare') || col.toLowerCase().includes('parts')
            ));
          
          return `
          <div class="section">
              <div class="section-header ${isSparePartsRelated ? 'spare-parts-section' : ''}">
                  <h3 class="section-title ${isSparePartsRelated ? 'spare-parts-title' : ''}">${fieldTitles[fieldType] || fieldType.toUpperCase()}</h3>
                  <div class="section-subtitle">${report.data[fieldType].length} records found</div>
              </div>
              
              <table class="data-table ${isSparePartsRelated ? 'spare-parts-table' : ''}">
                  <thead>
                      <tr>
                          ${selectedColumns[fieldType].map((col: string) => {
                            const isSpareCol = col.toLowerCase().includes('spare') || 
                                              col.toLowerCase().includes('parts') ||
                                              col.toLowerCase().includes('quantity') ||
                                              col.toLowerCase().includes('destination');
                            return `<th class="${isSpareCol ? 'spare-parts-column' : ''}">${col}</th>`;
                          }).join('')}
                      </tr>
                  </thead>
                  <tbody>
                      ${report.data[fieldType].slice(0, 50).map((record: any, index: number) => `
                      <tr>
                          ${selectedColumns[fieldType].map((col: string) => {
                            let value = record[col] || 'N/A';
                            
                            // Enhanced formatting for spare parts data
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
                            
                            // Highlight spare parts related cells
                            const isSpareCol = col.toLowerCase().includes('spare') || 
                                              col.toLowerCase().includes('parts') ||
                                              col.toLowerCase().includes('quantity') ||
                                              col.toLowerCase().includes('destination') ||
                                              col.toLowerCase().includes('supplier');
                            
                            if (typeof value === 'string' && value.length > 35) {
                              value = value.substring(0, 35) + '...';
                            }
                            
                            return `<td class="${isSpareCol ? 'spare-parts-cell' : ''}">${value}</td>`;
                          }).join('')}
                      </tr>
                      `).join('')}
                      ${report.data[fieldType].length > 50 ? `
                      <tr>
                          <td colspan="${selectedColumns[fieldType].length}" style="text-align: center; padding: 15px; background: ${isSparePartsRelated ? '#e8f5e8' : '#f8f9fa'}; font-style: italic; font-weight: 600; color: ${isSparePartsRelated ? '#27ae60' : '#666'};">
                              📊 Showing first 50 records of ${report.data[fieldType].length} total entries
                          </td>
                      </tr>
                      ` : ''}
                  </tbody>
              </table>
          </div>
          `;
        }).join('')}

        <div class="footer">
            <h4>🚀 Fleet Intelligence System</h4>
            <p>Comprehensive fleet management with specialized spare parts tracking and cost analysis</p>
            
            <div class="report-id">
                <strong>Report ID:</strong> ${Math.random().toString(36).substr(2, 9).toUpperCase()} | 
                <strong>Generated:</strong> ${new Date().toISOString().substring(0, 19)}Z
                ${report.metadata?.sparePartsFocus ? ' | <strong>SPARE PARTS FOCUSED REPORT</strong>' : ''}
            </div>
            
            <p style="margin-top: 15px; font-size: 10px;">
                © ${new Date().getFullYear()} Approved Logistics Limited. All rights reserved.
            </p>
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
