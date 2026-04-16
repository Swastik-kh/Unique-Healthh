
import React, { useState, useMemo } from 'react';
import { Calendar, Printer, Search, BookOpen, Layers, ShieldCheck, Warehouse } from 'lucide-react';
import { Select } from './Select';
import { SearchableSelect } from './SearchableSelect';
import { InventoryItem, IssueReportEntry, DakhilaPratibedanEntry, ReturnEntry, StockEntryRequest, Store } from '../types/inventoryTypes';
import { OrganizationSettings } from '../types/coreTypes';
import { FISCAL_YEARS } from '../constants';

interface JinshiKhataProps {
  currentFiscalYear: string;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  stockEntryRequests: StockEntryRequest[];
  generalSettings: OrganizationSettings;
  stores: Store[];
}

interface ItemSummary {
  itemName: string;
  unit: string;
  storeName: string; // Now a single store name for a single item
  totalOpening: number;
  totalIncome: number;
  totalExpense: number;
  currentTotalStock: number;
  currentTotalValue: number;
  averageRate: number;
  expiryDateAd: string | null;
  expiryDateBs: string | null;
  batchNo: string;
  remarks: string;
}

export const JinshiKhata: React.FC<JinshiKhataProps> = ({
  currentFiscalYear,
  inventoryItems,
  issueReports,
  dakhilaReports,
  returnEntries,
  stockEntryRequests = [],
  generalSettings,
  stores
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>(''); // Holds the ID of the specific InventoryItem
  const [ledgerType, setLedgerType] = useState<'Expendable' | 'Non-Expendable'>('Expendable');

  const itemOptions = useMemo(() => {
    // Filter inventoryItems by selected fiscal year and ledger type first
    const relevantItems = inventoryItems.filter(item => 
      item.fiscalYear === selectedFiscalYear && 
      item.itemType === ledgerType
    );

    return relevantItems.map(item => {
      const store = stores.find(s => s.id === item.storeId);
      const storeName = store ? store.name : 'Unknown Store';
      const batchInfo = item.batchNo ? ` (Batch: ${item.batchNo})` : '';
      return {
        id: item.id,
        value: item.id, // Value is the unique ID of the inventory item
        label: `${item.itemName} (${item.unit}) - ${storeName}${batchInfo}`,
        itemData: item // Pass full item data for convenience
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [inventoryItems, ledgerType, selectedFiscalYear, stores]);

  const handleTypeToggle = (type: 'Expendable' | 'Non-Expendable') => {
      setLedgerType(type);
      setSelectedInventoryItemId(''); // Reset selected item when type changes
  };

  const tableData: ItemSummary | null = useMemo(() => {
    if (!selectedInventoryItemId) return null; // Return null if no item selected

    const selectedItem = inventoryItems.find(i => i.id === selectedInventoryItemId);

    if (!selectedItem) return null; // No inventory item found

    const store = stores.find(s => s.id === selectedItem.storeId);
    const storeName = store ? store.name : 'Unknown Store';

    let totalOpening = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    // Aggregating transactions for THIS SPECIFIC INVENTORY ITEM (by its unique properties)
    const itemNameLower = selectedItem.itemName.trim().toLowerCase();
    const itemCode = selectedItem.uniqueCode || selectedItem.sanketNo || '';
    const itemStoreId = selectedItem.storeId;
    const itemFiscalYear = selectedItem.fiscalYear; // Ensure all transactions match the item's fiscal year

    // Helper to match transaction items to the selected inventory item
    const matchesSelectedItem = (transactionItemName: string, transactionItemCode: string = '', transactionStoreId: string = '') => {
        const nameMatch = transactionItemName.trim().toLowerCase() === itemNameLower;
        const codeMatch = !itemCode || !transactionItemCode || (transactionItemCode.trim().toLowerCase() === itemCode.trim().toLowerCase());
        const storeMatch = !itemStoreId || !transactionStoreId || (transactionStoreId === itemStoreId);
        return nameMatch && codeMatch && storeMatch;
    };

    // Aggregate from Dakhila Reports
    dakhilaReports
      .filter(report => report.fiscalYear === itemFiscalYear && report.storeId === itemStoreId)
      .forEach(report => report.items.forEach(item => {
        if (matchesSelectedItem(item.name, item.codeNo, report.storeId)) {
          if (item.source === 'Opening') totalOpening += item.quantity;
          else totalIncome += item.quantity;
        }
      }));

    // Aggregate from Stock Entry Requests (Approved)
    stockEntryRequests
      .filter(req => req.status === 'Approved' && req.fiscalYear === itemFiscalYear && req.storeId === itemStoreId)
      .forEach(req => req.items.forEach(item => {
        if (matchesSelectedItem(item.itemName, item.uniqueCode || item.sanketNo, req.storeId)) {
          if (req.mode === 'opening') totalOpening += item.currentQuantity;
          else totalIncome += item.currentQuantity;
        }
      }));

    // Aggregate from Return Entries (Approved)
    returnEntries
      .filter(entry => entry.status === 'Approved' && entry.fiscalYear === itemFiscalYear) // Return entries don't have storeId on top level
      .forEach(entry => entry.items.forEach(item => {
        // For returns, we need to be very specific: match by original inventoryId or full details
        if (item.inventoryId === selectedItem.id || (matchesSelectedItem(item.name, item.codeNo) && item.itemType === selectedItem.itemType)) {
          totalIncome += item.quantity;
        }
      }));

    // Aggregate from Issue Reports (Issued)
    issueReports
      .filter(report => report.status === 'Issued' && report.fiscalYear === itemFiscalYear && report.selectedStoreId === itemStoreId)
      .forEach(report => report.items.forEach(item => {
        if (matchesSelectedItem(item.name, item.codeNo, report.selectedStoreId)) {
          totalExpense += (parseFloat(item.quantity as any) || 0);
        }
      }));

    return {
      itemName: selectedItem.itemName,
      unit: selectedItem.unit,
      storeName: storeName,
      totalOpening: totalOpening,
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      currentTotalStock: selectedItem.currentQuantity, // This is the actual current stock of THIS item
      currentTotalValue: selectedItem.totalAmount || 0, // This is the actual current value of THIS item
      averageRate: (selectedItem.currentQuantity > 0 && selectedItem.totalAmount !== undefined) ? (selectedItem.totalAmount / selectedItem.currentQuantity) : (selectedItem.rate || 0),
      expiryDateAd: selectedItem.expiryDateAd || null,
      expiryDateBs: selectedItem.expiryDateBs || null,
      batchNo: selectedItem.batchNo || '-',
      remarks: selectedItem.remarks || '-'
    };
  }, [selectedInventoryItemId, inventoryItems, dakhilaReports, stockEntryRequests, returnEntries, issueReports, stores]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-col gap-4 w-full xl:w-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-nepali text-lg">
                    <BookOpen size={24} className="text-primary-600"/>
                    जिन्सी खाता व्यवस्थापन
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => handleTypeToggle('Expendable')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${ledgerType === 'Expendable' ? 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-200' : 'text-slate-500'}`}><Layers size={16} />खर्च हुने</button>
                    <button onClick={() => handleTypeToggle('Non-Expendable')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${ledgerType === 'Non-Expendable' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500'}`}><ShieldCheck size={16} />खर्च नहुने</button>
                </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
                <div className="w-48"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} /></div>
                <div className="w-80">
                    <SearchableSelect 
                        label="सामान छान्नुहोस्" 
                        options={itemOptions} 
                        value={selectedInventoryItemId} // Pass selected ID
                        onChange={setSelectedInventoryItemId} // Update selected ID
                        icon={<Search size={18} />} 
                        placeholder="विशिष्ट सामान खोज्नुहोस्..."
                    />
                </div>
            </div>
        </div>
        <button onClick={() => window.print()} disabled={!selectedInventoryItemId} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"><Printer size={18} /> प्रिन्ट</button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full overflow-x-auto print:shadow-none">
        <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
            <h2 className="text-lg font-bold underline mt-4">{ledgerType === 'Expendable' ? 'जिन्सी मालसामान खाता (विवरण)' : 'सम्पत्ति खाता (विवरण)'}</h2>
            {tableData && <h3 className="text-base font-bold mt-2">सामान: {tableData.itemName} - ब्याच: {tableData.batchNo}</h3>}
        </div>

        <table className="w-full border-collapse border border-slate-800 text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-800 p-2">सामानको नाम</th>
              <th className="border border-slate-800 p-2">एकाई</th>
              <th className="border border-slate-800 p-2">गोदाम/स्टोर</th>
              <th className="border border-slate-800 p-2">ब्याच नं.</th>
              <th className="border border-slate-800 p-2">कुल ओपनिङ्ग मौज्दात</th>
              <th className="border border-slate-800 p-2">कुल आम्दानी</th>
              <th className="border border-slate-800 p-2">कुल खर्च</th>
              <th className="border border-slate-800 p-2">हालको कुल मौज्दात</th>
              <th className="border border-slate-800 p-2">कुल मूल्य</th>
              <th className="border border-slate-800 p-2">औसत दर</th>
              {ledgerType === 'Expendable' && <th className="border border-slate-800 p-2">म्याद सकिने मिति (BS)</th>}
              <th className="border border-slate-800 p-2">कैफियत</th>
            </tr>
          </thead>
          <tbody>
            {tableData ? (
              <tr>
                <td className="border border-slate-800 p-2 text-center">{tableData.itemName}</td>
                <td className="border border-slate-800 p-2 text-center">{tableData.unit}</td>
                <td className="border border-slate-800 p-2 text-center flex items-center justify-center gap-1"><Warehouse size={14} className="text-slate-400"/> {tableData.storeName}</td>
                <td className="border border-slate-800 p-2 text-center font-mono">{tableData.batchNo}</td>
                <td className="border border-slate-800 p-2 text-right">{tableData.totalOpening}</td>
                <td className="border border-slate-800 p-2 text-right">{tableData.totalIncome}</td>
                <td className="border border-slate-800 p-2 text-right">{tableData.totalExpense}</td>
                <td className="border border-slate-800 p-2 text-right font-bold">{tableData.currentTotalStock}</td>
                <td className="border border-slate-800 p-2 text-right font-bold">{tableData.currentTotalValue.toFixed(2)}</td>
                <td className="border border-slate-800 p-2 text-right">{tableData.averageRate.toFixed(2)}</td>
                {ledgerType === 'Expendable' && <td className="border border-slate-800 p-2 text-center">{tableData.expiryDateBs || 'N/A'}</td>}
                <td className="border border-slate-800 p-2">{tableData.remarks}</td>
              </tr>
            ) : (
              <tr>
                <td colSpan={ledgerType === 'Expendable' ? 12 : 11} className="border border-slate-800 p-8 text-center text-slate-400">सामान छान्नुहोस्...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};