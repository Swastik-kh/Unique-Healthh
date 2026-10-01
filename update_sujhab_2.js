import fs from 'fs';

let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

// Update URL
content = content.replace(
  `const SUJHAB_PETIKA_APP_URL = "https://digitalsujabpeti.web.app";`,
  `const SUJHAB_PETIKA_APP_URL = "https://gunaso-petika.vercel.app";`
);

// Add Download & External Link imports
content = content.replace(
  `import { MessageSquare, Clock, CheckCircle, AlertCircle, FileText, User, Phone, Mail, Building, Archive, Settings, X, CheckSquare, Square, QrCode, Printer, Plus } from 'lucide-react';`,
  `import { MessageSquare, Clock, CheckCircle, AlertCircle, FileText, User, Phone, Mail, Building, Archive, Settings, X, CheckSquare, Square, QrCode, Printer, Plus, Download, ExternalLink } from 'lucide-react';`
);

// Add action buttons in QR modal
let actionButtons = `
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handlePrintQR}
                        disabled={!qrOffice}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 font-nepali disabled:opacity-50"
                    >
                        <Printer size={16} />
                        प्रिन्ट गर्नुहोस्
                    </button>
                    <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors ml-2">
                      <X size={24} />
                    </button>
                </div>
`;

let newActionButtons = `
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handlePrintQR}
                        disabled={!qrOffice}
                        className="px-3 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 font-nepali disabled:opacity-50"
                    >
                        <Printer size={16} />
                        <span className="hidden sm:inline">प्रिन्ट</span>
                    </button>
                    {qrOffice && (
                        <>
                            <a 
                                href={\`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=\${encodeURIComponent(\`\${SUJHAB_PETIKA_APP_URL}?office=\${qrOffice}\`)}\`}
                                download={\`QR_\${qrOffice}.png\`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-nepali shadow-sm"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">डाउनलोड</span>
                            </a>
                            <a 
                                href={\`\${SUJHAB_PETIKA_APP_URL}?office=\${qrOffice}\`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-white border border-slate-200 text-primary-600 text-sm font-bold rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1.5 font-nepali shadow-sm"
                            >
                                <ExternalLink size={16} />
                                <span className="hidden sm:inline">परीक्षण</span>
                            </a>
                        </>
                    )}
                    <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors ml-1">
                      <X size={24} />
                    </button>
                </div>
`;

content = content.replace(actionButtons, newActionButtons);

fs.writeFileSync('components/SujhabPetika.tsx', content);
