
import React, { useState, useMemo, useCallback } from 'react';
import { Printer, Calendar, Filter, Package, FilePlus, Save, CheckCircle2 } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { User, OrganizationSettings } from '../types/coreTypes';
import { InventoryItem, MagFormEntry, DakhilaPratibedanEntry, IssueReportEntry, StockEntryRequest, Store } from '../types/inventoryTypes';
import { PrintOptionsModal } from './PrintOptionsModal';
import { MultiYearInventoryReport } from './MultiYearInventoryReport';
import { ManualReport } from './ManualReport';
import { ManualReportTrend } from './ManualReportTrend';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface InventoryMonthlyReportProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  magForms: MagFormEntry[];
  onSaveMagForm: (form: MagFormEntry) => void;
  generalSettings: OrganizationSettings;
  dakhilaReports: DakhilaPratibedanEntry[]; // Added dakhilaReports
  issueReports: IssueReportEntry[]; // Added issueReports
  stockEntryRequests: StockEntryRequest[]; // Added stockEntryRequests
  stores: Store[]; // Added stores prop
}

// Interface for the aggregated row data
interface AggregatedMonthlyItem {
  id: string; // A unique ID for the aggregated row (e.g., hash of itemName)
  itemName: string;
  ledgerPageNo: string; // Representative ledger page no
  unit: string;
  previousMonthClosingStock: number;
  monthlyReceipts: number;
  monthlyExpenditure: number;
  approvedStockLevel: number; // Representative ASL
  emergencyOrderPoint: number; // Representative EOP
  quantityToOrder: number;
}


export const InventoryMonthlyReport: React.FC<InventoryMonthlyReportProps> = ({ 
  currentFiscalYear, inventoryItems, generalSettings, currentUser, 
  dakhilaReports, issueReports, stockEntryRequests, stores
}) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual' | 'manual'>('monthly');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { return new NepaliDate().format('MM'); } catch(e) { return '01'; }
  }); // Default to current month
  const [filterCenter, setFilterCenter] = useState(''); // New state for filter by store/center
  const [showPrintModal, setShowPrintModal] = useState(false);

  // State for sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const nepaliMonthOptions = [
    { id: '01', value: '01', label: 'बैशाख (Baishakh)' },
    { id: '02', value: '02', label: 'जेठ (Jestha)' },
    { id: '03', value: '03', label: 'असार (Ashad)' },
    { id: '04', value: '04', label: 'साउन (Shrawan)' },
    { id: '05', value: '05', label: 'भदौ (Bhadra)' },
    { id: '06', value: '06', label: 'असोज (Ashwin)' },
    { id: '07', value: '07', label: 'कार्तिक (Kartik)' },
    { id: '08', value: '08', label: 'मंसिर (Mangsir)' },
    { id: '09', value: '09', label: 'पुष (Poush)' },
    { id: '10', value: '10', label: 'माघ (Magh)' },
    { id: '11', value: '11', label: 'फागुन (Falgun)' },
    { id: '12', value: '12', label: 'चैत्र (Caitra)' },
  ];

  const storeOptions = useMemo(() => stores.map(s => ({ id: s.id, value: s.id, label: s.name })), [stores]);


  const reportData = useMemo(() => {
    // 1. Group all relevant inventory items by item name and consolidate initial stock
    const aggregatedItemsMap = new Map<string, {
      id: string; // Use itemName itself as a unique ID for aggregation
      itemName: string;
      ledgerPageNo: string;
      unit: string;
      currentTotalStock: number; // Sum of currentQuantity for all batches/stores of this item name
      approvedStockLevel: number; // Representative ASL
      emergencyOrderPoint: number; // Representative EOP
    }>();

    inventoryItems
      .filter(i => 
        i.fiscalYear === selectedFiscalYear && 
        i.itemType === 'Expendable' &&
        (filterCenter ? i.storeId === filterCenter : true)
      )
      .forEach(item => {
        const lowerItemName = item.itemName.trim().toLowerCase();
        if (!aggregatedItemsMap.has(lowerItemName)) {
          aggregatedItemsMap.set(lowerItemName, {
            id: lowerItemName, // Unique key for the aggregated item
            itemName: item.itemName,
            ledgerPageNo: item.ledgerPageNo || '-', // Take from first encountered
            unit: item.unit,
            currentTotalStock: 0, // Will sum up later
            approvedStockLevel: item.approvedStockLevel || 0, // Take from first encountered
            emergencyOrderPoint: item.emergencyOrderPoint || 0, // Take from first encountered
          });
        }
        // Always sum current stock across all matching physical inventory items
        const aggItem = aggregatedItemsMap.get(lowerItemName)!;
        aggItem.currentTotalStock += item.currentQuantity;
      });

    // 2. Aggregate monthly receipts (for the selected month) by item name
    const monthlyReceiptsMap = new Map<string, number>();
    dakhilaReports
      .filter(d => 
        d.fiscalYear === selectedFiscalYear && 
        d.date.split('-')[1] === selectedMonth &&
        (filterCenter ? d.storeId === filterCenter : true)
      )
      .forEach(d => d.items.forEach(item => {
        const key = item.name.trim().toLowerCase();
        monthlyReceiptsMap.set(key, (monthlyReceiptsMap.get(key) || 0) + item.quantity);
      }));
    
    stockEntryRequests
      .filter(s => 
        s.status === 'Approved' && 
        s.fiscalYear === selectedFiscalYear && 
        s.requestDateBs.split('-')[1] === selectedMonth &&
        (filterCenter ? s.storeId === filterCenter : true)
      )
      .forEach(s => s.items.forEach(item => {
        const key = item.itemName.trim().toLowerCase();
        monthlyReceiptsMap.set(key, (monthlyReceiptsMap.get(key) || 0) + item.currentQuantity);
      }));

    // 3. Aggregate monthly expenditure (for the selected month) by item name
    const monthlyExpenditureMap = new Map<string, number>();
    issueReports
      .filter(i => 
        i.fiscalYear === selectedFiscalYear && 
        i.issueDate?.split('-')[1] === selectedMonth && // Using issueDate now
        (filterCenter ? i.selectedStoreId === filterCenter : true)
      )
      .forEach(i => i.items.forEach(item => {
        const key = item.name.trim().toLowerCase();
        monthlyExpenditureMap.set(key, (monthlyExpenditureMap.get(key) || 0) + parseFloat(item.quantity));
      }));

    // 4. Combine all data into final report rows
    let data: AggregatedMonthlyItem[] = [];

    aggregatedItemsMap.forEach(aggItem => {
        const lowerItemName = aggItem.itemName.trim().toLowerCase();
        const currentMonthReceipts = monthlyReceiptsMap.get(lowerItemName) || 0;
        const currentMonthExpenditure = monthlyExpenditureMap.get(lowerItemName) || 0;

        // Calculate previous month's closing stock for the aggregated item
        // This is the total current stock MINUS receipts in this month PLUS expenditure in this month
        const previousMonthClosingStock = aggItem.currentTotalStock - currentMonthReceipts + currentMonthExpenditure;

        // Ensure these values don't go negative for display if actual stock is managed differently
        const finalPreviousMonthClosingStock = Math.max(0, previousMonthClosingStock);
        const finalCurrentTotalStock = Math.max(0, aggItem.currentTotalStock);

        data.push({
            id: aggItem.id,
            itemName: aggItem.itemName,
            ledgerPageNo: aggItem.ledgerPageNo,
            unit: aggItem.unit,
            previousMonthClosingStock: finalPreviousMonthClosingStock,
            monthlyReceipts: currentMonthReceipts,
            monthlyExpenditure: currentMonthExpenditure,
            approvedStockLevel: aggItem.approvedStockLevel,
            emergencyOrderPoint: aggItem.emergencyOrderPoint,
            // Quantity to order is based on ASL and finalCurrentTotalStock
            quantityToOrder: Math.max(0, (aggItem.approvedStockLevel || 0) - finalCurrentTotalStock),
        });
    });

    // Apply sorting
    if (sortColumn) {
      data.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortColumn === 'ledgerPageNo') {
          valA = parseInt(a.ledgerPageNo.replace(/[^0-9]/g, '') || '0'); // Extract numeric part
          valB = parseInt(b.ledgerPageNo.replace(/[^0-9]/g, '') || '0');
        } else if (sortColumn === 'itemName') {
            valA = a.itemName;
            valB = b.itemName;
        } else {
          valA = (a as any)[sortColumn];
          valB = (b as any)[sortColumn];
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    }

    return data;
  }, [inventoryItems, selectedFiscalYear, selectedMonth, dakhilaReports, issueReports, stockEntryRequests, filterCenter, sortColumn, sortDirection]);

  const currentMonthLabel = nepaliMonthOptions.find(m => m.value === selectedMonth)?.label || '';
  const currentStoreLabel = storeOptions.find(s => s.value === filterCenter)?.label || 'सबै';

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handlePrint = useCallback((orientation: 'portrait' | 'landscape') => {
    const printContentId = 'inventory-monthly-report-print';
    const printContent = document.getElementById(printContentId);

    if (!printContent) {
        alert('प्रिन्ट गर्नको लागि कुनै डाटा छैन।');
        return;
    }

    // Create a hidden iframe for printing to avoid destroying React state/DOM
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Monthly Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 ${orientation}; margin: 1cm; }
          body { font-family: 'Mukta', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; }
          /* Helper to hide print elements in app but show here */
          .print-container { display: block !important; }
          /* Ensure table borders are visible */
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 4px; text-align: left; font-size: 10px; }
          th { background-color: #f8fafc; font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .text-red-600 { color: #dc2626; }
          .border-slate-900 { border-color: #0f172a; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           // Wait for resources (fonts/tailwind) to load slightly
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 1000);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    // Clean up iframe after a delay to ensure print dialog has opened
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
        setShowPrintModal(false);
    }, 5000); 
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-white rounded-lg border w-fit">
        <button className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`} onClick={() => setActiveTab('monthly')}>मासिक प्रतिवेदन</button>
        <button className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'annual' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`} onClick={() => setActiveTab('annual')}>वार्षिक प्रतिवेदन</button>
        <button className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`} onClick={() => setActiveTab('manual')}>म्यानुअल प्रतिवेदन</button>
      </div>

      {activeTab === 'monthly' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
            <div className="flex flex-wrap gap-4">
              <div className="w-40"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} /></div>
              <div className="w-48"><Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} /></div>
              <div className="w-48">
                <Select 
                    label="केन्द्र/गोदाम फिल्टर" 
                    options={[{ id: '', value: '', label: '-- सबै केन्द्रहरू --' }, ...storeOptions]} 
                    value={filterCenter} 
                    onChange={(e) => setFilterCenter(e.target.value)} 
                    icon={<Package size={18} />} 
                />
              </div>
            </div>
            <button onClick={() => setShowPrintModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm"><Printer size={18} /> प्रिन्ट</button>
          </div>

          <div id="inventory-monthly-report-print" className="bg-white p-8 rounded-xl shadow-lg max-w-[297mm] mx-auto min-h-[210mm] font-nepali text-sm print:shadow-none print:p-0">
            <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
                <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                <h3 className="text-lg font-black mt-2 underline font-nepali">जिन्सी मौज्दात तथा निकासा प्रतिवेदन</h3>
                <div className="flex justify-between mt-4 text-xs font-bold text-slate-600">
                    <span>आ.व.: {selectedFiscalYear}</span>
                    <span>महिना: {currentMonthLabel}</span>
                    <span>केन्द्र: {currentStoreLabel}</span>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-900 text-xs responsive-table">
                  <thead>
                      <tr className="bg-slate-50">
                          <th className="border border-slate-900 p-1">क्र.सं.</th>
                          <th 
                              className="border border-slate-900 p-1 cursor-pointer select-none" 
                              onDoubleClick={() => handleSort('itemName')}
                          >
                              सामानको नाम&nbsp;
                              {sortColumn === 'itemName' && (sortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                          <th 
                            className="border border-slate-900 p-1 cursor-pointer select-none" 
                            onDoubleClick={() => handleSort('ledgerPageNo')}
                          >
                            जि.खा.पा.नं.&nbsp;
                            {sortColumn === 'ledgerPageNo' && (sortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                          <th className="border border-slate-900 p-1">एकाई</th>
                          <th className="border border-slate-900 p-1">अघिल्लो महिनाको अन्तिम मौज्दात</th>
                          <th className="border border-slate-900 p-1">यस महिना प्राप्त</th>
                          <th className="border border-slate-900 p-1">यस महिना खर्च</th>
                          <th className="border border-slate-900 p-1">स्वीकृत मौज्दात (ASL)</th>
                          <th className="border border-slate-900 p-1">आपतकालीन अर्डर बिन्दु (EOP)</th>
                          <th className="border border-slate-900 p-1">माग गर्नुपर्ने परिमाण</th>
                      </tr>
                  </thead>
                  <tbody>
                      {reportData.map((d, i) => (
                          <tr key={d.id}>
                              <td className="border border-slate-900 p-1 text-center" data-label="SN">{i + 1}</td>
                              <td className="border border-slate-900 p-1 px-2" data-label="Item Name">{d.itemName}</td>
                              <td className="border border-slate-900 p-1 text-center" data-label="Page No">{d.ledgerPageNo || '-'}</td>
                              <td className="border border-slate-900 p-1 text-center" data-label="Unit">{d.unit}</td>
                              <td className="border border-slate-900 p-1 text-center font-bold" data-label="Prev Stock">{d.previousMonthClosingStock}</td>
                              <td className="border border-slate-900 p-1 text-center text-green-700 font-bold" data-label="Monthly Receipt">{d.monthlyReceipts || 0}</td>
                              <td className="border border-slate-900 p-1 text-center text-red-600 font-bold" data-label="Monthly Exp">{d.monthlyExpenditure || 0}</td>
                              <td className="border border-slate-900 p-1 text-center" data-label="ASL">{d.approvedStockLevel || '-'}</td>
                              <td className="border border-slate-900 p-1 text-center" data-label="EOP">{d.emergencyOrderPoint || '-'}</td>
                              <td className="border border-slate-900 p-1 text-center font-bold text-blue-700" data-label="Qty to Order">{d.quantityToOrder || '-'}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-12">
                <div className="text-center border-t border-slate-800 pt-1">तयार गर्ने</div>
                <div className="text-center border-t border-slate-800 pt-1">शाखा प्रमुख</div>
                <div className="text-center border-t border-slate-800 pt-1">स्वीकृत गर्ने</div>
            </div>
          </div>
        </>
      ) : activeTab === 'annual' ? (
        <MultiYearInventoryReport 
          currentFiscalYear={currentFiscalYear}
          generalSettings={generalSettings}
          inventoryItems={inventoryItems}
          dakhilaReports={dakhilaReports}
          issueReports={issueReports}
          stores={stores}
        />
      ) : (
        <div className="space-y-4">
             <div className="flex gap-2">
                <button className={`px-4 py-2 rounded ${activeTab === 'manual' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`} onClick={() => setActiveTab('manual')}>म्यानुअल फारम</button>
                <button className={`px-4 py-2 rounded ${activeTab === 'trend' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`} onClick={() => setActiveTab('trend')}>३ वर्षको प्रवृत्ति</button>
             </div>
             {activeTab === 'manual' ? (
                <ManualReport 
                    generalSettings={generalSettings} 
                    currentFiscalYear={currentFiscalYear}
                    inventoryItems={inventoryItems}
                    onSave={(data) => console.log('Saving manual report:', data)} 
                />
             ) : (
                <ManualReportTrend currentFiscalYear={currentFiscalYear} />
             )}
        </div>
      )}

      {showPrintModal && <PrintOptionsModal onClose={() => setShowPrintModal(false)} onPrint={handlePrint} />}
    </div>
  );
};
