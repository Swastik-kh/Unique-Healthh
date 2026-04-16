import React, { useState } from 'react';
import { Database, Download, Upload, HardDrive, FileText, ShoppingCart, Archive, FileUp, CheckCircle2, Info, Trash2, Lock, FileOutput, RotateCcw, Wrench, Scroll, ClipboardList, Send, Warehouse, Layers, ShieldCheck, Table as TableIcon, AlertTriangle, Loader2, X } from 'lucide-react';
import { User } from '../types/coreTypes'; // Changed import
import { InventoryItem, MagFormEntry, PurchaseOrderEntry, IssueReportEntry, FirmEntry, Store, DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry, ItemEntry } from '../types/inventoryTypes'; // Changed import
import { RabiesPatient, TBPatient } from '../types/healthTypes'; // Changed import
import { Select } from './Select';

interface DatabaseManagementProps {
  currentUser: User;
  users: User[];
  inventoryItems: InventoryItem[];
  magForms: MagFormEntry[];
  purchaseOrders: PurchaseOrderEntry[];
  issueReports: IssueReportEntry[];
  rabiesPatients: RabiesPatient[];
  tbPatients: TBPatient[]; // Added TB Patients prop
  firms: FirmEntry[];
  stores: Store[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  marmatEntries: MarmatEntry[];
  dhuliyaunaEntries: DhuliyaunaEntry[];
  logBookEntries: LogBookEntry[];
  itemList: ItemEntry[];
  onClearData?: (sectionId: string) => void;
  onUploadData: (sectionId: string, data: any[], extraMeta?: any) => Promise<void>;
}

const UPLOAD_FORMATS: Record<string, { headers: string[], example: string[] }> = {
    inventory: {
        headers: [
            'Item Name', 
            'Item Classification', 
            'Unique Code', 
            'Sanket No', 
            'Ledger Page', 
            'Unit', 
            'Qty', 
            'Rate', 
            'Tax %', 
            'Batch No', 
            'Expiry (AD)', 
            'Specification', 
            'Remarks'
        ],
        example: [
            'Paracetamol 500mg', 
            'Medicine', 
            'UC-2082-001', 
            'SN-505', 
            '12', 
            'Pkt', 
            '100', 
            '85.50', 
            '0', 
            'B-101', // Example for Batch No
            '2026-12-31', 
            'USP Standard', 
            'Essential drug supply'
        ]
    },
    item_list: {
        headers: ['Item Name', 'Unit'],
        example: ['Paracetamol 500mg', 'Pkt']
    }
};

export const DatabaseManagement: React.FC<DatabaseManagementProps> = ({
  currentUser,
  inventoryItems,
  magForms,
  purchaseOrders,
  issueReports,
  rabiesPatients,
  tbPatients, // Destructure TB Patients
  firms,
  stores,
  dakhilaReports,
  returnEntries,
  marmatEntries,
  dhuliyaunaEntries,
  logBookEntries,
  itemList,
  onClearData,
  onUploadData
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'delete'>('download');
  const [uploadTarget, setUploadTarget] = useState('');
  const [uploadStoreId, setUploadStoreId] = useState('');
  const [uploadItemType, setUploadItemType] = useState<'Expendable' | 'Non-Expendable' | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null); // Added for clearer error messages

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isAdmin = currentUser.role === 'ADMIN';

  if (!isSuperAdmin && !isAdmin) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
              <div className="bg-red-50 p-6 rounded-full mb-4"><Lock size={48} className="text-red-400" /></div>
              <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
              <p className="text-sm text-slate-500 max-w-md text-center">यो मेनु प्रयोग गर्न तपाईंलाई अनुमति छैन।</p>
          </div>
      );
  }

  const handleUpload = async () => {
      if (!uploadTarget || !selectedFile) {
          setUploadError('कृपया अपलोड गर्नको लागि डाटा प्रकार र फाइल छान्नुहोस्।');
          return;
      }
      if (uploadTarget === 'inventory' && (!uploadStoreId || !uploadItemType)) {
          setUploadError('सामान अपलोड गर्नको लागि स्टोर र सामानको प्रकार छान्नुहोस्।');
          return;
      }

      setIsUploading(true);
      setUploadSuccess(null);
      setUploadError(null); // Clear previous errors

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const data = e.target?.result;
              if (!data) throw new Error("फाइल खाली छ।");

              let rows: any[] = [];

              if (selectedFile?.name.endsWith('.xlsx') || selectedFile?.name.endsWith('.xls')) {
                  const { read, utils } = await import('xlsx');
                  const workbook = read(data, { type: 'binary' });
                  const sheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[sheetName];
                  rows = utils.sheet_to_json(worksheet);
              } else {
                  const text = data as string;
                  // Check if it looks like a binary file (e.g., Excel)
                  if (text.includes('\u0000') || text.length < 100 && text.charCodeAt(0) > 127) {
                      throw new Error("यो फाइल CSV जस्तो देखिँदैन। कृपया Excel फाइललाई CSV (Comma Delimited) ढाँचामा सेभ गरेर अपलोड गर्नुहोस् वा .xlsx फाइल प्रयोग गर्नुहोस्।");
                  }

                  // SIMPLE CSV PARSER
                  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
                  if (lines.length < 2) throw new Error("हेडर र कम्तिमा एउटा डाटाको लाइन आवश्यक छ।");

                  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                  
                  rows = lines.slice(1).map(line => {
                      // Handle commas inside quotes and potential empty values
                      const values: string[] = [];
                      let current = "";
                      let inQuotes = false;
                      for (let char of line) {
                          if (char === '"') {
                              inQuotes = !inQuotes;
                          } else if (char === ',' && !inQuotes) {
                              values.push(current.trim());
                              current = "";
                          } else {
                              current += char;
                          }
                      }
                      values.push(current.trim()); // Push the last value

                      const obj: any = {};
                      headers.forEach((h, i) => {
                          obj[h] = values[i]?.replace(/^"|"$/g, '') || "";
                      });
                      return obj;
                  });
              }

              if (rows.length === 0) throw new Error("कुनै डाटाको लहर भेटिएन।");

              await onUploadData(uploadTarget, rows, { 
                  storeId: uploadStoreId, 
                  itemType: uploadItemType 
              });
              
              setUploadSuccess(`${rows.length} वटा रेकर्डहरू सफलतापूर्वक प्रोसेस गरियो र डाटाबेसमा थपियो।`);
              setSelectedFile(null);
              setUploadStoreId('');
              setUploadItemType('');
              setUploadTarget('');
          } catch (error: any) {
              console.error(error);
              setUploadError(`फाइल पढ्दा वा डाटा म्यापिङ गर्दा समस्या आयो: ${error.message || 'अज्ञात त्रुटि'}। कृपया कोलमका हेडरहरू र फाइल ढाँचा जाँच गर्नुहोस्।`);
          } finally {
              setIsUploading(false);
          }
      };

      reader.onerror = (e) => {
          console.error("FileReader error:", e);
          setUploadError(`फाइल लोड गर्न सकिएन: ${reader.error?.message || 'अज्ञात त्रुटि'}`);
          setIsUploading(false);
      };

      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
          reader.readAsBinaryString(selectedFile);
      } else {
          reader.readAsText(selectedFile);
      }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) { alert("डाउनलोड गर्नको लागि कुनै डाटा छैन"); return; }
    
    // Ensure all objects have consistent keys (headers)
    const allKeys = new Set<string>();
    data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    const csvRows = [headers.map(header => `"${header}"`).join(',')]; // Wrap headers in quotes
    for (const row of data) {
        const values = headers.map(header => {
            let val = row[header];
            if (val === null || val === undefined) val = '';
            // Handle complex objects (e.g., signatures, nested arrays)
            if (typeof val === 'object' && val !== null) {
                val = JSON.stringify(val);
            }
            const escaped = String(val).replace(/"/g, '""'); // Escape double quotes within a field
            return `"${escaped}"`; // Wrap each field in quotes
        });
        csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (sectionId: string, title: string) => {
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं "${title}" को सम्पूर्ण डाटा मेटाउन चाहनुहुन्छ? यो कार्य स्थायी हो र पूर्ववत गर्न सकिँदैन।`)) {
          if (onClearData) {
              onClearData(sectionId);
              alert(`${title} को डाटा सफलतापूर्वक मेटियो।`);
          }
      }
  };

  const dataSections = [
    { id: 'inventory', title: 'जिन्सी मौज्दात', data: inventoryItems, icon: <Warehouse size={24} className="text-purple-600" />, desc: 'हालको जिन्सी सामानहरूको सूची', color: 'bg-purple-50 border-purple-200', uploadable: true, uploadFormat: 'inventory' },
    { id: 'item_list', title: 'सामानको सूची (Item List)', data: itemList, icon: <TableIcon size={24} className="text-blue-600" />, desc: 'सामानको नाम र एकाइको सूची', color: 'bg-blue-50 border-blue-200', uploadable: true, uploadFormat: 'item_list' },
    { id: 'magForms', title: 'माग फारमहरू', data: magForms, icon: <FileText size={24} className="text-orange-600" />, desc: 'सबै माग फारमहरूको विवरण', color: 'bg-orange-50 border-orange-200' },
    { id: 'purchaseOrders', title: 'खरिद आदेशहरू', data: purchaseOrders, icon: <ShoppingCart size={24} className="text-green-600" />, desc: 'सबै खरिद आदेशहरूको विवरण', color: 'bg-green-50 border-green-200' },
    { id: 'issueReports', title: 'निकासा प्रतिवेदनहरू', data: issueReports, icon: <FileOutput size={24} className="text-indigo-600" />, desc: 'जारी गरिएका निकासा प्रतिवेदनहरू', color: 'bg-indigo-50 border-indigo-200' },
    { id: 'dakhilaReports', title: 'दाखिला प्रतिवेदनहरू', data: dakhilaReports, icon: <Archive size={24} className="text-cyan-600" />, desc: 'दाखिला गरिएका सामानहरूको विवरण', color: 'bg-cyan-50 border-cyan-200' },
    { id: 'returnEntries', title: 'जिन्सी फिर्ता', data: returnEntries, icon: <RotateCcw size={24} className="text-red-600" />, desc: 'फिर्ता गरिएका सामानहरूको विवरण', color: 'bg-red-50 border-red-200' },
    { id: 'marmatEntries', title: 'मर्मत आवेदन', data: marmatEntries, icon: <Wrench size={24} className="text-yellow-600" />, desc: 'मर्मत सम्भार अनुरोध र आदेशहरू', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'dhuliyaunaEntries', title: 'धुल्याउने फारम', data: dhuliyaunaEntries, icon: <Trash2 size={24} className="text-gray-600" />, desc: 'लिलाम/मिनाहा/धुल्याउने फारमहरू', color: 'bg-gray-50 border-gray-200' },
    { id: 'logBookEntries', title: 'लग बुक', data: logBookEntries, icon: <Scroll size={24} className="text-blue-600" />, desc: 'सवारी साधन र मेसिनरीको लग बुक', color: 'bg-blue-50 border-blue-200' },
    { id: 'firms', title: 'फर्महरू', data: firms, icon: <ClipboardList size={24} className="text-green-600" />, desc: 'सूचीकृत फर्महरूको विवरण', color: 'bg-green-50 border-green-200' },
    { id: 'stores', title: 'स्टोरहरू', data: stores, icon: <HardDrive size={24} className="text-indigo-600" />, desc: 'विभिन्न स्टोरहरूको विवरण', color: 'bg-indigo-50 border-indigo-200' },
    { id: 'rabiesPatients', title: 'रेबिज बिरामीहरू', data: rabiesPatients, icon: <ClipboardList size={24} className="text-purple-600" />, desc: 'रेबिज खोप बिरामीहरूको विवरण', color: 'bg-purple-50 border-purple-200' },
    { id: 'tbPatients', title: 'क्षयरोग बिरामीहरू', data: tbPatients, icon: <ClipboardList size={24} className="text-teal-600" />, desc: 'क्षयरोग / कुष्ठरोग बिरामीहरूको विवरण', color: 'bg-teal-50 border-teal-200' }
  ];

  const storeOptions = stores.map(s => ({ id: s.id, value: s.id, label: s.name }));
  const itemTypeOptions = [
    { id: 'expendable', value: 'Expendable', label: 'खर्च हुने (Expendable)' },
    { id: 'nonExpendable', value: 'Non-Expendable', label: 'खर्च नहुने (Non-Expendable)' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="bg-slate-800 p-2 rounded-lg text-white">
          <Database size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">डाटाबेस व्यवस्थापन (Database Management)</h2>
          <p className="text-sm text-slate-500">डाटा आयात, निर्यात र मेटाउनुहोस्</p>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg shadow-inner no-print">
        <button
          onClick={() => setActiveTab('download')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'download' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Download size={16} /> डाटा डाउनलोड
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Upload size={16} /> डाटा अपलोड
        </button>
        <button
          onClick={() => setActiveTab('delete')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'delete' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trash2 size={16} /> डाटा डिलिट
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'download' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Download size={20} className="text-blue-600" /> डाउनलोड गर्न डाटा प्रकार छान्नुहोस्
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataSections.map((section) => (
              <div
                key={section.id}
                className={`flex items-center justify-between p-4 rounded-lg border shadow-sm ${section.color}`}
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <div>
                    <p className="font-medium text-slate-700">{section.title}</p>
                    <p className="text-xs text-slate-500">{section.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => downloadCSV(section.data, section.title.replace(/\s/g, '_'))}
                  className="px-3 py-1.5 bg-white text-blue-600 rounded-md text-xs font-bold hover:bg-blue-50 transition-colors border border-blue-200"
                >
                  CSV डाउनलोड
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-green-600" /> CSV फाइल अपलोड गर्नुहोस्
          </h3>

          {uploadSuccess && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-3 rounded-r-xl text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle2 size={18} /> {uploadSuccess}
                  <button onClick={() => setUploadSuccess(null)} className="ml-auto text-green-400 hover:text-green-600"><X size={16}/></button>
              </div>
          )}
          {uploadError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl text-red-700 text-sm flex items-start gap-2">
                  <AlertTriangle size={18} className="mt-0.5" />
                  <span className="flex-1">{uploadError}</span>
                  <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={16}/></button>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Select
                label="अपलोड गर्न डाटा प्रकार छान्नुहोस्"
                options={dataSections.filter(s => s.uploadable).map(s => ({ id: s.id, value: s.id, label: s.title }))}
                value={uploadTarget}
                onChange={(e) => {
                    setUploadTarget(e.target.value);
                    setUploadSuccess(null); // Clear messages on target change
                    setUploadError(null);
                    setSelectedFile(null); // Clear file
                }}
                placeholder="-- छान्नुहोस् --"
                icon={<TableIcon size={16} />}
              />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">CSV फाइल चयन गर्नुहोस्</label>
                <div className="relative border border-slate-300 rounded-lg flex items-center bg-white px-3 py-2.5 shadow-sm">
                    <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-3">
                        <FileUp size={18} className="text-slate-400" />
                        <span className="text-sm text-slate-600">
                            {selectedFile ? selectedFile.name : 'कुनै फाइल छनौट गरिएको छैन'}
                        </span>
                    </div>
                    <button type="button" className="ml-auto px-4 py-1.5 bg-slate-100 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-200">
                        ब्राउज गर्नुहोस्
                    </button>
                </div>
            </div>
          </div>

          {uploadTarget === 'inventory' && (
            <div className="grid grid-cols-2 gap-6 mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <Select label="गोदाम/स्टोर छान्नुहोस् *" options={storeOptions} value={uploadStoreId} onChange={e => setUploadStoreId(e.target.value)} required icon={<Warehouse size={16} />} />
              <Select label="सामानको प्रकार छान्नुहोस् *" options={itemTypeOptions} value={uploadItemType} onChange={e => setUploadItemType(e.target.value as any)} required icon={<Layers size={16} />} />
            </div>
          )}

          {uploadTarget && UPLOAD_FORMATS[uploadTarget] && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <h4 className="font-bold mb-2 flex items-center gap-2"><Info size={18}/> अपेक्षित CSV हेडरहरू:</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                      {UPLOAD_FORMATS[uploadTarget].headers.map((header, idx) => <li key={idx}>{header}</li>)}
                  </ul>
                  <h4 className="font-bold mt-4 mb-2 flex items-center gap-2"><TableIcon size={18}/> उदाहरण डाटा:</h4>
                  <p className="font-mono text-xs bg-blue-100 p-2 rounded">{UPLOAD_FORMATS[uploadTarget].example.join(', ')}</p>
                  <p className="text-xs italic mt-2">नोट: `Qty`, `Rate`, `Tax %` संख्यात्मक हुनुपर्छ। `Expiry (AD)` YYYY-MM-DD ढाँचामा हुनुपर्छ।</p>
              </div>
          )}


          <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !uploadTarget || (uploadTarget === 'inventory' && (!uploadStoreId || !uploadItemType))}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {isUploading ? 'अपलोड गर्दै...' : 'अपलोड गर्नुहोस्'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'delete' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-red-600">
            <Trash2 size={20} /> डाटा डिलिट गर्नुहोस् (सावधानीपूर्वक प्रयोग गर्नुहोस्)
          </h3>
          <p className="text-red-500 text-sm mb-6 flex items-start gap-2"><AlertTriangle size={18} className="shrink-0 mt-0.5" /> यो कार्य स्थायी हो र पूर्ववत गर्न सकिँदैन।</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataSections.map((section) => (
              <div
                key={section.id}
                className={`flex items-center justify-between p-4 rounded-lg border shadow-sm ${section.color}`}
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <div>
                    <p className="font-medium text-slate-700">{section.title}</p>
                    <p className="text-xs text-slate-500">{section.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(section.id, section.title)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-bold hover:bg-red-100 transition-colors border border-red-200"
                >
                  डिलिट गर्नुहोस्
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};