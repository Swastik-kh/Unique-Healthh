import React, { useState, useMemo, useCallback } from 'react';
import { Printer, Calendar, Filter, Package } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { User, OrganizationSettings } from '../types/coreTypes';
import { InventoryItem, DakhilaPratibedanEntry, IssueReportEntry, Store } from '../types/inventoryTypes';
import { PrintOptionsModal } from './PrintOptionsModal';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface MultiYearInventoryReportProps {
  currentFiscalYear: string;
  generalSettings: OrganizationSettings;
  inventoryItems: InventoryItem[];
  dakhilaReports: DakhilaPratibedanEntry[];
  issueReports: IssueReportEntry[];
  stores: Store[];
}

export const MultiYearInventoryReport: React.FC<MultiYearInventoryReportProps> = ({ 
  currentFiscalYear, inventoryItems, generalSettings, 
  dakhilaReports, issueReports, stores
}) => {
  const [filterStore, setFilterStore] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fiscalYearsToConsider = useMemo(() => {
    const currentIndex = FISCAL_YEARS.findIndex(fy => fy.value === currentFiscalYear);
    // Take 3 years ending at current
    return FISCAL_YEARS.slice(Math.max(0, currentIndex - 2), currentIndex + 1).reverse();
  }, [currentFiscalYear]);

  const reportData = useMemo(() => {
    const itemsMap = new Map<string, {
      itemName: string;
      unit: string;
      currentStock: number;
      yearlyExpenditure: Record<string, number>;
    }>();

    // Initialize with current items to get name/unit and current stock
    inventoryItems.forEach(i => {
      const lower = i.itemName.toLowerCase();
      if (!itemsMap.has(lower)) {
        itemsMap.set(lower, { itemName: i.itemName, unit: i.unit, currentStock: 0, yearlyExpenditure: {} });
      }
      if (i.fiscalYear === currentFiscalYear) {
         itemsMap.get(lower)!.currentStock += i.currentQuantity;
      }
    });

    // Populate yearly expenditure
    issueReports.forEach(i => {
      const lower = i.items[0]?.name.toLowerCase(); // Simplified
      if (lower && itemsMap.has(lower)) {
        const item = itemsMap.get(lower)!;
        item.yearlyExpenditure[i.fiscalYear] = (item.yearlyExpenditure[i.fiscalYear] || 0) + i.items.reduce((sum, it) => sum + parseFloat(it.quantity), 0);
      }
    });

    return Array.from(itemsMap.values());
  }, [inventoryItems, issueReports, currentFiscalYear]);

  const handlePrint = useCallback((orientation: 'portrait' | 'landscape') => {
    // Similar print logic as InventoryMonthlyReport
    const printContentId = 'multi-year-report-print';
    const printContent = document.getElementById(printContentId);
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.write(`<html><head><script src="https://cdn.tailwindcss.com"></script><style>@page { size: A4 ${orientation}; } table { border-collapse: collapse; } th, td { border: 1px solid black; padding: 4px; font-size: 10px; }</style></head><body>${printContent.innerHTML}</body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.print(); document.body.removeChild(iframe); setShowPrintModal(false); }, 1000);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border no-print">
        <h2 className="font-bold text-lg">वार्षिक खर्च प्रतिवेदन (३ वर्ष)</h2>
        <button onClick={() => setShowPrintModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg"><Printer size={16} /> प्रिन्ट</button>
      </div>

      <div id="multi-year-report-print" className="bg-white p-6 shadow-sm">
        <h1 className="text-center font-bold text-lg mb-4">{generalSettings.orgNameNepali}</h1>
        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="border p-1">सामानको नाम</th>
              <th className="border p-1">एकाई</th>
              {fiscalYearsToConsider.map(fy => <th key={fy.id} className="border p-1">खर्च ({fy.label})</th>)}
            </tr>
          </thead>
          <tbody>
            {reportData.map((d, i) => (
              <tr key={i}>
                <td className="border p-1">{d.itemName}</td>
                <td className="border p-1">{d.unit}</td>
                {fiscalYearsToConsider.map(fy => <td key={fy.id} className="border p-1">{d.yearlyExpenditure[fy.value] || 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPrintModal && <PrintOptionsModal onClose={() => setShowPrintModal(false)} onPrint={handlePrint} />}
    </div>
  );
};
