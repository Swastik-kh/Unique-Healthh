

import React, { useState, useMemo } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { Printer, BookOpen, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';
// Corrected import paths for User, InventoryItem, IssueReportEntry, ReturnEntry, OrganizationSettings, DakhilaPratibedanEntry, PropertyUseRow
import { User, OrganizationSettings } from '../types/coreTypes';
import { InventoryItem, IssueReportEntry, ReturnEntry, DakhilaPratibedanEntry, PropertyUseRow } from '../types/inventoryTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface SahayakJinshiKhataProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  generalSettings: OrganizationSettings;
  users: User[]; // Added to fix prop type error
}

export const SahayakJinshiKhata: React.FC<SahayakJinshiKhataProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  issueReports,
  dakhilaReports,
  users,
  returnEntries,
  generalSettings
}) => {
  const [selectedPersonName, setSelectedPersonName] = useState<string>('');

  const personOptions = useMemo(() => {
      const names = new Set<string>();
      users.forEach(u => names.add(u.fullName));
      issueReports.forEach(r => {
          if (r.demandBy?.name) names.add(r.demandBy.name);
      });
      return Array.from(names).sort().map(name => ({
          id: name,
          value: name,
          label: name
      }));
  }, [users, issueReports]);

  const tableData = useMemo(() => {
    const rows: PropertyUseRow[] = [];
    if (!selectedPersonName) return [];

    const safeSelectedName = selectedPersonName.trim().toLowerCase();
    
    // Map to store aggregated return data for each issued item
    const returnedItemsMap = new Map<string, { qty: number; dates: string[]; receivers: string[]; }>();
    returnEntries.forEach(r => {
        if (r.status === 'Approved' && r.returnedBy?.name?.trim().toLowerCase() === safeSelectedName) {
            r.items.forEach(retItem => {
                // Key to match issued item: Combination of original inventory ID (if available), name and code
                const key = `${retItem.inventoryId || retItem.name.trim().toLowerCase()}-${(retItem.codeNo || '').trim().toLowerCase()}`;
                const current = returnedItemsMap.get(key) || { qty: 0, dates: [], receivers: [] };
                current.qty += retItem.quantity;
                current.dates.push(r.date);
                current.receivers.push(r.approvedBy?.name || 'Store'); // Store approver's name for return
                returnedItemsMap.set(key, current);
            });
        }
    });

    issueReports.forEach(report => {
        if (!report.status || report.status.trim() !== 'Issued' || report.fiscalYear !== currentFiscalYear) return;
        const reportDemandName = report.demandBy?.name?.trim().toLowerCase() || '';
        
        // Only include Non-Expendable items for Subsidiary Ledger
        if (reportDemandName === safeSelectedName && report.itemType === 'Non-Expendable') {
            report.items.forEach(item => {
                // Find the original inventory item details for more context
                const invItem = inventoryItems.find(i => 
                    (item.id !== undefined && i.id === String(item.id)) || // FIX: Convert item.id (number) to string for comparison with i.id (string)
                    (i.itemName.trim().toLowerCase() === item.name.trim().toLowerCase() && 
                     (item.codeNo ? (i.uniqueCode === item.codeNo || i.sanketNo === item.codeNo) : true)) // Fallback to name/code
                );
                
                const rate = item.rate || invItem?.rate || 0;
                const issuedQty = parseFloat(item.quantity.toString()) || 0;
                const total = rate * issuedQty;
                
                const itemCode = item.codeNo || invItem?.uniqueCode || invItem?.sanketNo || '';
                
                // Construct the same key as used in returnedItemsMap
                const returnKey = `${invItem?.id || item.name.trim().toLowerCase()}-${itemCode.trim().toLowerCase()}`;
                const itemReturnData = returnedItemsMap.get(returnKey) || { qty: 0, dates: [], receivers: [] };
                
                // Determine source for issued item
                const issueSource = report.issueNo ? `निकासा नं: ${report.issueNo}` : `माग फारम नं: ${report.magFormNo}`;

                rows.push({
                    id: `ISSUE-${report.id}-${item.id}`, // Unique ID for the row
                    date: report.issueDate || report.requestDate || '',
                    magFormNo: report.magFormNo.toString(),
                    sanketNo: itemCode, 
                    name: item.name,
                    model: invItem?.specification || '', // Using specification as a stand-in for model/details if no dedicated model field
                    specification: item.specification || invItem?.specification || '',
                    idNo: invItem?.uniqueCode || invItem?.sanketNo || itemCode, // Best available unique identifier
                    estLife: '', // Placeholder, as no data in InventoryItem for this
                    makeCountry: '', // Placeholder, as no data in InventoryItem for this
                    source: invItem?.receiptSource || issueSource || 'खरिद', // Source of original acquisition or issue report
                    unit: item.unit,
                    quantity: issuedQty,
                    totalCost: total,
                    receiverName: report.demandBy?.name || '',
                    receiverDesignation: report.demandBy?.designation || '',
                    receiverSignatureDate: report.demandBy?.date || '',
                    returnedQuantity: itemReturnData.qty,
                    returnDates: itemReturnData.dates.sort(), // Sort dates for consistent display
                    returnReceivers: itemReturnData.receivers, // Names of those who approved the return
                    isCleared: issuedQty <= itemReturnData.qty // Check if fully returned
                });
            });
        }
    });

    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending
  }, [selectedPersonName, issueReports, inventoryItems, returnEntries, currentFiscalYear]);

  const isCompletelyCleared = useMemo(() => {
      if (!selectedPersonName) return false;
      return tableData.length === 0 || tableData.every(row => row.isCleared);
  }, [tableData, selectedPersonName]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Landscape Print Helper CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                .sahayak-khata-print-container {
                    width: 100% !important;
                    max-width: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                @page {
                    size: A4 landscape;
                    margin: 1cm;
                }
            }
        ` }} />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
            <div className="flex flex-col gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-nepali text-lg">
                    <BookOpen size={24} className="text-primary-600"/>
                    सहायक जिन्सी खाता (व्यक्तिगत जिम्मेवारी)
                </div>
                <div className="w-full md:w-80">
                    <SearchableSelect 
                        label="कर्मचारी/व्यक्ति छान्नुहोस्"
                        options={personOptions}
                        value={selectedPersonName}
                        onChange={(val) => setSelectedPersonName(val)} 
                        onSelect={(opt) => setSelectedPersonName(opt.value)}
                        placeholder="नाम खोज्नुहोस्..."
                    />
                </div>
            </div>
            <button 
                onClick={() => window.print()}
                disabled={!selectedPersonName}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
            >
                <Printer size={18} /> प्रिन्ट (Print)
            </button>
        </div>

        {selectedPersonName && (
            <div className={`p-4 rounded-xl border flex items-center gap-4 mb-6 shadow-sm no-print ${
                isCompletelyCleared ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
                <div className={`w-3 h-3 rounded-full ${isCompletelyCleared ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                    <h4 className={`font-bold font-nepali ${isCompletelyCleared ? 'text-green-800' : 'text-red-800'}`}>
                        {isCompletelyCleared ? 'जिन्सी क्लियरेन्स (Cleared)' : 'जिम्मामा सामान बाँकी (Pending)'}
                    </h4>
                    <p className="text-sm opacity-80">
                        {isCompletelyCleared ? 'यस कर्मचारीको जिम्मामा कुनै सामान बाँकी छैन।' : 'सबै सामान फिर्ता नभएसम्म क्लियरेन्स हुँदैन।'}
                    </p>
                </div>
            </div>
        )}

        <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg w-full overflow-x-auto print:shadow-none print:p-0 sahayak-khata-print-container">
            {/* Print Header */}
            <div className="hidden print:block mb-4 text-slate-900">
                <div className="text-right font-bold text-[10px] mb-2">म.ले.प.फारम नं: ४०१</div>
                <div className="flex items-start justify-between">
                    <div className="w-24 flex justify-start pt-1">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-20 w-20 object-contain" />
                    </div>
                    <div className="flex-1 text-center space-y-1 text-xs">
                        <h1 className="text-base font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                        <h2 className="font-bold">{generalSettings.subTitleNepali}</h2>
                        {generalSettings.subTitleNepali2 && <h3 className="font-bold">{generalSettings.subTitleNepali2}</h3>}
                        {generalSettings.subTitleNepali3 && <h3 className="font-bold">{generalSettings.subTitleNepali3}</h3>}
                        {/* ADDED: Contact Details Row from generalSettings for print */}
                        <div className="text-[10px] mt-2 space-x-3 font-medium text-slate-600">
                            {generalSettings.address && <span>{generalSettings.address}</span>}
                            {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                            {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                            {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                        </div>
                    </div>
                    <div className="w-24"></div> 
                </div>
                <div className="text-center mt-4">
                    <h2 className="text-lg font-bold underline underline-offset-4">जिन्सी सहायक खाता (सम्पत्ति प्रयोग विवरण)</h2>
                </div>
                <div className="flex justify-between items-end mt-4 text-xs">
                    <div>
                        <p>सम्पत्ति प्रयोग गर्नेको नाम, पद, पहिचान नम्बर, ठेगाना लगायतका विवरण:</p>
                        <p><span className="font-bold border-b border-dotted border-slate-800 px-2">{selectedPersonName}</span></p>
                        {/* The image shows "वा" followed by "सम्पत्ति रहेको कार्यक, शाखा वा स्थानको नाम:" but doesn't have fields for it */}
                        {/* <p>वा</p>
                        <p>सम्पत्ति रहेको कार्यक, शाखा वा स्थानको नाम:</p> */}
                    </div>
                    <div className="text-right space-y-1">
                        <p>आ.व.: <span className="font-bold border-b border-dotted border-slate-800 px-2">{currentFiscalYear}</span></p>
                        <p>मिती: <span className="font-bold border-b border-dotted border-slate-800 px-2">{new NepaliDate().format('YYYY-MM-DD')}</span></p>
                    </div>
                </div>
            </div>

            <table className="w-full text-left border-collapse border border-slate-900 text-[9px] print:text-[7px]">
                <thead>
                    <tr className="bg-slate-50 print:bg-slate-100 print:table-header-group">
                        <th className="border border-slate-900 p-1 w-[40px]" rowSpan={2}>मिति <br/> (Col 1)</th>
                        <th className="border border-slate-900 p-1 w-[60px]" rowSpan={2}>माग फारम नं <br/> (Col 2)</th>
                        <th className="border border-slate-900 p-1" colSpan={7}>सम्पत्तिको विवरण (जिन्सी मालसामानको विवरण)</th>
                        <th className="border border-slate-900 p-1" colSpan={4}>सम्पत्ति बुझिलिनेको विवरण</th>
                        <th className="border border-slate-900 p-1" colSpan={3}>सम्पत्ति फिर्ताको विवरण</th>
                        <th className="border border-slate-900 p-1 w-[90px]" rowSpan={2}>बुझilिनेको नाम र दस्तखत <br/> (Col 17)</th>
                    </tr>
                    <tr className="bg-slate-50 print:bg-slate-100">
                        <th className="border border-slate-900 p-1 w-[55px]">सङ्केत नं. <br/> (Col 3)</th>
                        <th className="border border-slate-900 p-1 w-[80px]">नाम <br/> (Col 4)</th>
                        <th className="border border-slate-900 p-1 w-[60px]">मोडल <br/> (Col 5)</th>
                        <th className="border border-slate-900 p-1 w-[70px]">स्पेसिफिकेसन <br/> (Col 6)</th>
                        <th className="border border-slate-900 p-1 w-[60px]">पहिचान नं. <br/> (Col 7)</th>
                        <th className="border border-slate-900 p-1 w-[55px]">अनुमानित आयु <br/> (Col 8)</th>
                        <th className="border border-slate-900 p-1 w-[70px]">निर्माण भएको देश/कम्पनी <br/> (Col 9)</th>

                        <th className="border border-slate-900 p-1 w-[50px]">प्राप्तिको स्रोत <br/> (Col 10)</th>
                        <th className="border border-slate-900 p-1 w-[45px]">एकाई <br/> (Col 11)</th>
                        <th className="border border-slate-900 p-1 w-[45px]">परिमाण <br/> (Col 12)</th>
                        <th className="border border-slate-900 p-1 w-[60px]">जम्मा परल मूल्य <br/> (Col 13)</th>
                        
                        <th className="border border-slate-900 p-1 w-[45px]">परिमाण <br/> (Col 14)</th>
                        <th className="border border-slate-900 p-1 w-[55px]">मिति <br/> (Col 15)</th>
                        <th className="border border-slate-900 p-1 w-[55px]">दस्तखत <br/> (Col 16)</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.length === 0 ? (
                        <tr>
                            <td colSpan={17} className="p-10 text-center text-slate-400 font-nepali print:text-xs">कुनै पनि रेकर्ड फेला परेन।</td>
                        </tr>
                    ) : (
                        tableData.map((row, index) => (
                            <tr key={row.id} className="hover:bg-slate-50 print:page-break-inside-avoid">
                                <td className="border border-slate-900 p-1 font-nepali">{row.date}</td>
                                <td className="border border-slate-900 p-1 font-mono">{row.magFormNo}</td>
                                <td className="border border-slate-900 p-1 font-mono">{row.sanketNo || '-'}</td>
                                <td className="border border-slate-900 p-1 font-medium text-left">{row.name}</td>
                                <td className="border border-slate-900 p-1 text-left">{row.model || '-'}</td>
                                <td className="border border-slate-900 p-1 text-left">{row.specification || '-'}</td>
                                <td className="border border-slate-900 p-1 font-mono">{row.idNo || '-'}</td>
                                <td className="border border-slate-900 p-1">{row.estLife || '-'}</td>
                                <td className="border border-slate-900 p-1">{row.makeCountry || '-'}</td>
                                <td className="border border-slate-900 p-1">{row.source || '-'}</td>
                                <td className="border border-slate-900 p-1">{row.unit || '-'}</td>
                                <td className="border border-slate-900 p-1">{row.quantity}</td>
                                <td className="border border-slate-900 p-1 text-right">{row.totalCost.toFixed(2)}</td>

                                <td className="border border-slate-900 p-1 text-red-600 font-bold">{row.returnedQuantity > 0 ? row.returnedQuantity : '-'}</td>
                                <td className="border border-slate-900 p-1 text-red-600">{row.returnDates.length > 0 ? row.returnDates.join(', ') : '-'}</td>
                                <td className="border border-slate-900 p-1 text-red-600">{row.returnReceivers.length > 0 ? row.returnReceivers.join(', ') : '-'}</td>
                                <td className="border border-slate-900 p-1">
                                    <div className="font-medium">{row.receiverName || '-'}</div>
                                    <div className="text-[8px] text-slate-500">{row.receiverDesignation || '-'}</div>
                                    <div className="text-[8px] italic text-slate-400">{row.receiverSignatureDate || '-'}</div>
                                    {row.isCleared ? 
                                        <span className="text-green-600 flex items-center justify-center gap-1 font-bold"><CheckCircle2 size={10}/> फिर्ता</span> : 
                                        <span className="text-red-500 flex items-center justify-center gap-1 font-bold"><AlertCircle size={10}/> बाँकी</span>
                                    }
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Print Footer */}
            <div className="hidden print:grid grid-cols-3 gap-10 mt-16 text-center text-xs print:page-break-inside-avoid">
                <div className="border-t border-slate-800 pt-3 font-bold">तयार गर्ने (Prepared By)</div>
                <div className="border-t border-slate-800 pt-3 font-bold">जिन्सी शाखा (Store Section)</div>
                <div className="border-t border-slate-800 pt-3 font-bold">स्वीकृत गर्ने (Approved By)</div>
            </div>
        </div>
    </div>
  );
};