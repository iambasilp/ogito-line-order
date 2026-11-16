import type { PaymentCollection } from '@/types';

export interface CashCollectionPrintOptions {
  collections: PaymentCollection[];
  dateStr?: string;
  routeName?: string;
  vehicleName?: string;
  collectorName?: string;
  reportTitle?: string;
}

export const printCashCollectionReport = (options: CashCollectionPrintOptions) => {
  const {
    collections = [],
    dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    routeName,
    vehicleName,
    collectorName,
    reportTitle = "TODAY'S CASH COLLECTION REPORT"
  } = options;

  if (!collections || collections.length === 0) {
    alert('No cash collections found to print for this selection.');
    return;
  }

  // Calculate total cash
  const totalCash = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Cleanup existing print containers if present
  const existingContainer = document.getElementById('print-container');
  if (existingContainer && existingContainer.parentNode) {
    existingContainer.parentNode.removeChild(existingContainer);
  }
  const existingStyle = document.getElementById('print-style');
  if (existingStyle && existingStyle.parentNode) {
    existingStyle.parentNode.removeChild(existingStyle);
  }

  const printContainer = document.createElement('div');
  printContainer.id = 'print-container';
  printContainer.style.display = 'none';

  const style = document.createElement('style');
  style.id = 'print-style';
  style.innerHTML = `
    @media print {
      body > *:not(#print-container) { display: none !important; }
      #print-container { 
        display: block !important; 
        position: absolute; 
        top: 0; 
        left: 0; 
        width: 100%; 
        background: #fff; 
        color: #000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 11px;
        line-height: 1.3;
      }
      @page { 
        size: A4 portrait; 
        margin: 12mm 10mm 12mm 10mm; 
      }
      
      .cc-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
      .cc-org-name { font-size: 20px; font-weight: 800; letter-spacing: 1px; margin: 0; }
      .cc-report-title { font-size: 14px; font-weight: 700; text-transform: uppercase; margin: 4px 0 0 0; color: #222; }
      .cc-print-meta { font-size: 9px; color: #555; margin-top: 3px; }

      .cc-meta-grid { 
        display: flex; 
        justify-content: space-between; 
        margin-bottom: 12px; 
        background-color: #f9fafb;
        border: 1px solid #000;
        padding: 8px 12px;
        font-size: 11px;
      }
      .cc-meta-col { display: flex; flex-direction: column; gap: 4px; }
      .cc-meta-item { display: flex; gap: 6px; }
      .cc-meta-label { font-weight: 700; min-width: 80px; }
      .cc-meta-val { font-weight: 600; }
      .cc-total-pill {
        border: 1.5px solid #000;
        padding: 4px 10px;
        background: #fff;
        text-align: right;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .cc-total-pill-val { font-size: 16px; font-weight: 900; }

      table.cc-table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 16px; 
        page-break-inside: auto; 
      }
      table.cc-table th, table.cc-table td { 
        border: 1px solid #000; 
        padding: 5px 6px; 
        text-align: left; 
        font-size: 10.5px; 
      }
      table.cc-table th { 
        background-color: #f3f4f6; 
        font-weight: 700; 
        text-transform: uppercase; 
        font-size: 10px; 
        letter-spacing: 0.5px;
      }
      table.cc-table tr { page-break-inside: avoid; }
      
      .cc-sno { width: 30px; text-align: center; }
      .cc-time { width: 65px; white-space: nowrap; font-size: 9.5px; }
      .cc-cust { font-weight: 700; }
      .cc-route { font-size: 9.5px; color: #444; }
      .cc-amount { width: 85px; text-align: right; font-weight: 800; font-size: 11.5px; font-family: monospace; }
      .cc-collector { width: 100px; white-space: nowrap; font-size: 10px; }
      .cc-notes { font-size: 9.5px; color: #444; }

      .cc-foot-row { 
        background-color: #f3f4f6 !important; 
        font-weight: 800; 
        border-top: 2px solid #000; 
      }

      .cc-sign-box { 
        display: flex; 
        justify-content: space-between; 
        margin-top: 30px; 
        page-break-inside: avoid;
        gap: 20px;
      }
      .cc-sign-col { 
        flex: 1; 
        border: 1px solid #000; 
        padding: 10px 14px; 
        min-height: 85px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .cc-sign-title { font-weight: 700; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      .cc-sign-statement { font-size: 9.5px; color: #444; margin-top: 4px; }
      .cc-sign-line { border-top: 1px dashed #666; margin-top: 25px; padding-top: 4px; font-size: 10px; font-weight: 600; display: flex; justify-content: space-between; }
    }
  `;

  // Build rows HTML
  const rowsHtml = collections.map((col, idx) => {
    const timeFormatted = new Date(col.createdAt || col.date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const customer = col.customerName || (typeof col.customerId === 'object' ? col.customerId?.name : 'Customer');
    const route = col.routeName || (typeof col.route === 'object' ? col.route?.name : '') || '';
    const collector = col.collectedByName || col.collectedByUsername || 'Staff';
    const notes = col.notes || (col.orderId ? 'Daily Order Delivery' : '');

    return `
      <tr>
        <td class="cc-sno">${idx + 1}</td>
        <td class="cc-time">${timeFormatted}</td>
        <td class="cc-cust">
          <div>${customer}</div>
          ${route ? `<div class="cc-route">Route: ${route}</div>` : ''}
        </td>
        <td class="cc-amount">₹${Number(col.amount || 0).toLocaleString('en-IN')}</td>
        <td class="cc-collector">${collector}</td>
        <td class="cc-notes">${notes}</td>
      </tr>
    `;
  }).join('');

  printContainer.innerHTML = `
    <div class="cc-header">
      <h1 class="cc-org-name">PULIKKUTH ENTERPRISES</h1>
      <h2 class="cc-report-title">${reportTitle}</h2>
      <div class="cc-print-meta">Generated: ${dateStr} at ${nowTime} • Cash Reconciliation Sheet</div>
    </div>

    <div class="cc-meta-grid">
      <div class="cc-meta-col">
        <div class="cc-meta-item">
          <span class="cc-meta-label">Date</span>
          <span>:</span>
          <span class="cc-meta-val">${dateStr}</span>
        </div>
        ${routeName ? `
          <div class="cc-meta-item">
            <span class="cc-meta-label">Route</span>
            <span>:</span>
            <span class="cc-meta-val">${routeName}</span>
          </div>
        ` : ''}
        ${vehicleName ? `
          <div class="cc-meta-item">
            <span class="cc-meta-label">Vehicle</span>
            <span>:</span>
            <span class="cc-meta-val">${vehicleName}</span>
          </div>
        ` : ''}
      </div>

      <div class="cc-meta-col">
        <div class="cc-meta-item">
          <span class="cc-meta-label">Total Receipts</span>
          <span>:</span>
          <span class="cc-meta-val">${collections.length} Collections</span>
        </div>
        ${collectorName ? `
          <div class="cc-meta-item">
            <span class="cc-meta-label">Driver / Staff</span>
            <span>:</span>
            <span class="cc-meta-val">${collectorName}</span>
          </div>
        ` : ''}
      </div>

      <div class="cc-total-pill">
        <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #444;">Total Physical Cash</span>
        <span class="cc-total-pill-val">₹${totalCash.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <table class="cc-table">
      <thead>
        <tr>
          <th class="cc-sno">#</th>
          <th class="cc-time">Time</th>
          <th>Customer Name & Details</th>
          <th class="cc-amount">Cash (₹)</th>
          <th class="cc-collector">Collected By</th>
          <th>Notes / Ref</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr class="cc-foot-row">
          <td colspan="3" style="text-align: right; padding-right: 10px; font-weight: 800;">TOTAL PHYSICAL CASH COLLECTED:</td>
          <td class="cc-amount" style="font-size: 13px;">₹${totalCash.toLocaleString('en-IN')}</td>
          <td colspan="2" style="font-size: 9.5px; color: #555;">${collections.length} Cash Transactions</td>
        </tr>
      </tfoot>
    </table>

    <div class="cc-sign-box">
      <div class="cc-sign-col">
        <div class="cc-sign-title">Driver / Helper Handover</div>
        <div class="cc-sign-statement">I hereby confirm that I have collected the above amount totaling <strong>₹${totalCash.toLocaleString('en-IN')}</strong> in physical cash and handed it over to the office.</div>
        <div class="cc-sign-line">
          <span>Driver/Helper Signature</span>
          <span>Date & Time</span>
        </div>
      </div>

      <div class="cc-sign-col">
        <div class="cc-sign-title">Office Cashier / Manager Verification</div>
        <div class="cc-sign-statement">I hereby verify that physical cash amounting to <strong>₹${totalCash.toLocaleString('en-IN')}</strong> has been received and checked against the digital records.</div>
        <div class="cc-sign-line">
          <span>Receiver Signature</span>
          <span>Office Seal / Verification</span>
        </div>
      </div>
    </div>
  `;

  document.head.appendChild(style);
  document.body.appendChild(printContainer);

  const originalTitle = document.title;
  const safeDate = dateStr.replace(/[\/\\]/g, '-');
  document.title = `Cash_Collection_Report_${safeDate}`;

  setTimeout(() => {
    window.print();
    document.title = originalTitle;
  }, 400);
};
