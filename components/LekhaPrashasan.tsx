import React, { useState, useMemo } from 'react';
import { 
  Calculator, Plus, Search, Printer, Trash2, Edit, Save, 
  ArrowUpCircle, ArrowDownCircle, Users, Briefcase, 
  TrendingUp, TrendingDown, LayoutDashboard, ChevronRight,
  Filter, Calendar, ExternalLink, X, DollarSign, CreditCard
} from 'lucide-react';
import { FinancialProgram, ListedParty, FinancialTransaction, PartyPaymentRecord } from '../types/financeTypes';
import { OrganizationSettings } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import NepaliDate from 'nepali-date-converter';

interface LekhaPrashasanProps {
  programs: FinancialProgram[];
  parties: ListedParty[];
  transactions: FinancialTransaction[];
  payments: PartyPaymentRecord[];
  onSaveProgram: (program: Omit<FinancialProgram, 'id' | 'spentAmount'>) => void;
  onSaveParty: (party: Omit<ListedParty, 'id' | 'totalPaidAmount'>) => void;
  onSaveTransaction: (transaction: Omit<FinancialTransaction, 'id'>) => void;
  onSavePayment: (payment: Omit<PartyPaymentRecord, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  generalSettings: OrganizationSettings;
  currentFiscalYear: string;
}

export const LekhaPrashasan: React.FC<LekhaPrashasanProps> = ({
  programs = [],
  parties = [],
  transactions = [],
  payments = [],
  onSaveProgram,
  onSaveParty,
  onSaveTransaction,
  onSavePayment,
  onDeleteTransaction,
  generalSettings,
  currentFiscalYear
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'programs' | 'transactions' | 'vendors' | 'reports'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'program' | 'party' | 'transaction' | 'payment'>('program');
  
  // Date Filters for Reports
  const today = new NepaliDate().format('YYYY-MM-DD');
  const currentMonth = today.substring(0, 7); // YYYY-MM
  const [reportFilter, setReportFilter] = useState({
    type: 'Daily' as 'Daily' | 'Monthly' | 'Yearly',
    date: today,
    month: currentMonth,
    fiscalYear: currentFiscalYear
  });

  const generateReferenceNo = () => {
    const prefix = 'TXN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const [txnFormDate, setTxnFormDate] = useState(today);
  const [txnRefNo, setTxnRefNo] = useState('');

  // Derived State
  const stats = useMemo(() => {
    const fyTransactions = transactions.filter(t => t.fiscalYear === currentFiscalYear);
    const income = fyTransactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const expense = fyTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;
    
    return { income, expense, balance };
  }, [transactions, currentFiscalYear]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'programs': return programs.filter(p => p.name.toLowerCase().includes(term) && p.fiscalYear === currentFiscalYear);
      case 'vendors': return parties.filter(p => p.name.toLowerCase().includes(term) || p.panNumber.includes(term));
      case 'transactions': return transactions.filter(t => t.remarks.toLowerCase().includes(term) && t.fiscalYear === currentFiscalYear);
      default: return [];
    }
  }, [activeTab, programs, parties, transactions, searchTerm, currentFiscalYear]);

  // Handle Saves
  const handleProgramSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSaveProgram({
      name: formData.get('name') as string,
      totalBudget: Number(formData.get('budget')),
      fiscalYear: currentFiscalYear,
      createdAt: today
    });
    setShowForm(false);
  };

  const handleTransactionSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSaveTransaction({
      dateBs: txnFormDate,
      dateAd: new NepaliDate(txnFormDate).toJsDate().toISOString(),
      category: formData.get('category') as any,
      type: formData.get('type') as any,
      amount: Number(formData.get('amount')),
      remarks: formData.get('remarks') as string,
      fiscalYear: currentFiscalYear,
      referenceNo: (formData.get('referenceNo') as string) || txnRefNo,
      incomeSource: formData.get('incomeSource') as any || undefined,
      programId: formData.get('programId') as string || undefined,
    });
    setShowForm(false);
  };

  const handlePartySave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSaveParty({
      name: formData.get('name') as string,
      panNumber: formData.get('panNumber') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      totalContractAmount: Number(formData.get('contractAmount'))
    });
    setShowForm(false);
  };

  const handlePaymentSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const partyId = formData.get('partyId') as string;
    const programId = formData.get('programId') as string;

    onSavePayment({
      partyId,
      programId,
      amount,
      dateBs: txnFormDate,
      fiscalYear: currentFiscalYear,
      paymentMethod: formData.get('method') as string,
      remarks: formData.get('remarks') as string
    });

    // Also record as an expense transaction
    const party = parties.find(p => p.id === partyId);
    const program = programs.find(p => p.id === programId);
    onSaveTransaction({
      dateBs: txnFormDate,
      dateAd: new NepaliDate(txnFormDate).toJsDate().toISOString(),
      category: 'Program Payment',
      type: 'Expense',
      amount,
      remarks: `Payment to ${party?.name} for ${program?.name}`,
      partyId,
      programId,
      fiscalYear: currentFiscalYear,
      referenceNo: generateReferenceNo()
    });

    setShowForm(false);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Income</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 font-mono">रू {stats.income.toLocaleString()}</h2>
          <p className="text-xs text-emerald-600 font-bold mt-2 font-nepali">चालु आर्थिक वर्षको कुल आम्दानी</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expense</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 font-mono">रू {stats.expense.toLocaleString()}</h2>
          <p className="text-xs text-rose-600 font-bold mt-2 font-nepali">चालु आर्थिक वर्षको कुल खर्च</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calculator size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Balance</span>
          </div>
          <h2 className={`text-3xl font-black font-mono ${stats.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            रू {stats.balance.toLocaleString()}
          </h2>
          <p className="text-xs text-blue-600 font-bold mt-2 font-nepali">मौज्दात रकम</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Briefcase size={18} className="text-primary-600" />
              <span className="font-nepali">बजेट कार्यक्रमहरू</span>
            </h3>
            <button onClick={() => { setActiveTab('programs'); setSearchTerm(''); }} className="text-xs text-primary-600 font-bold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {programs.slice(0, 5).map(p => (
              <div key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-700 font-nepali">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{p.fiscalYear}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">रू {p.totalBudget.toLocaleString()}</p>
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-primary-500" 
                      style={{ width: `${Math.min((p.spentAmount / p.totalBudget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {programs.length === 0 && <div className="p-8 text-center text-slate-400 font-nepali italic">कुनै कार्यक्रम रेकर्ड गरिएको छैन।</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={18} className="text-rose-600" />
              <span className="font-nepali">हालैका कारोबारहरू</span>
            </h3>
            <button onClick={() => { setActiveTab('transactions'); setSearchTerm(''); }} className="text-xs text-rose-600 font-bold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${t.type === 'Income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {t.type === 'Income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 font-nepali line-clamp-1">{t.remarks}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{t.dateBs}</p>
                  </div>
                </div>
                <p className={`text-sm font-black ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'Income' ? '+' : '-'} रू {t.amount}
                </p>
              </div>
            ))}
            {transactions.length === 0 && <div className="p-8 text-center text-slate-400 font-nepali italic">कुनै कारोबार रेकर्ड गरिएको छैन।</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = () => {
    if (activeTab === 'dashboard') return renderDashboard();
    if (activeTab === 'reports') return renderReports();

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {activeTab === 'programs' && <>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कार्यक्रमको नाम</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कुल बजेट</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">खर्च भएको</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">मौज्दात</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">प्रगति</th>
                </>}
                {activeTab === 'vendors' && <>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">पार्टी/फर्मको नाम</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">PAN नं</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कुल सम्झौता</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">भुक्तानी भएको</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">बाँकी</th>
                </>}
                {activeTab === 'transactions' && <>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">मिति</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">विवरण (Remarks)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">वर्ग (Category)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">प्रकार</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">रकम</th>
                  <th className="px-1 py-1"></th>
                </>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  {activeTab === 'programs' && <>
                    <td className="px-6 py-4 font-bold text-slate-700 font-nepali">{item.name}</td>
                    <td className="px-6 py-4 font-mono text-sm">रू {item.totalBudget.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-sm text-rose-600">रू {item.spentAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-sm text-emerald-600">रू {(item.totalBudget - item.spentAmount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min((item.spentAmount / item.totalBudget) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{(item.spentAmount / item.totalBudget * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </>}
                  {activeTab === 'vendors' && <>
                    <td className="px-6 py-4 font-bold text-slate-700 font-nepali">{item.name}</td>
                    <td className="px-6 py-4 font-mono text-sm">{item.panNumber}</td>
                    <td className="px-6 py-4 font-mono text-sm">रू {item.totalContractAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-sm text-emerald-600">रू {item.totalPaidAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-sm text-rose-600">रू {(item.totalContractAmount - item.totalPaidAmount).toLocaleString()}</td>
                  </>}
                  {activeTab === 'transactions' && <>
                    <td className="px-6 py-4 font-mono text-xs">{item.dateBs}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600 font-nepali">{item.remarks}</td>
                    <td className="px-6 py-4 text-xs font-bold uppercase text-slate-400">{item.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-black font-mono text-sm ${item.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      रू {item.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => onDeleteTransaction(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic font-nepali">
              कुनै तथ्याङ्क फेला परेन।
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => {
    const reportData = transactions.filter(t => {
      if (t.fiscalYear !== reportFilter.fiscalYear) return false;
      const dateParts = t.dateBs.split('-');
      const filterParts = reportFilter.date.split('-');
      
      if (reportFilter.type === 'Daily') return t.dateBs === reportFilter.date;
      if (reportFilter.type === 'Monthly') return t.dateBs.startsWith(reportFilter.month);
      if (reportFilter.type === 'Yearly') return t.dateBs.startsWith(reportFilter.date.split('-')[0]);
      return true;
    });

    const reportIncome = reportData.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const reportExpense = reportData.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

    const handlePrint = () => {
      const printWin = window.open('', '', 'width=900,height=600');
      if (!printWin) return;
      
      const title = reportFilter.type === 'Daily' ? `दैनिक आय-व्यय विवरण (${reportFilter.date})` : 
                    reportFilter.type === 'Monthly' ? `मासिक आय-व्यय विवरण (${reportFilter.month})` : 
                    `वार्षिक आय-व्यय विवरण (${reportFilter.date.split('-')[0]})`;

      const getProgramName = (id?: string) => {
        if (!id) return '-';
        return programs.find(p => p.id === id)?.name || '-';
      };

      const getSourceLabel = (source?: string) => {
        switch (source) {
          case 'Nagarpalika': return 'नगरपालिका';
          case 'Wada': return 'वडा';
          case 'Internal': return 'आन्तरिक';
          case 'Other': return 'अन्य';
          default: return '-';
        }
      };

      const content = `
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body { font-family: 'Tahoma', sans-serif; padding: 0; margin: 0; color: #000; }
              .header-red { color: #dc2626 !important; }
              
              /* Header Specifics */
              .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; position: relative; }
              .logo-container { width: 15%; text-align: left; }
              .center-text { text-align: center; width: 70%; }
              .form-no-container { width: 15%; text-align: right; }
              
              .org-name { font-size: 24px; font-weight: 900; line-height: 1.2; margin: 0; margin-bottom: 5px; }
              .office-name { font-size: 16px; font-weight: 700; margin: 2px 0; }
              .sub-title { font-size: 14px; font-weight: 600; margin: 2px 0; }
              .sub-title-3 { font-size: 13px; font-weight: 600; margin: 2px 0; }
              .address-text { font-size: 13px; margin-top: 4px; font-weight: 500; }
              
              .report-title { margin-top: 15px; font-size: 20px; font-weight: 900; text-decoration: underline; text-underline-offset: 4px; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1.5px solid black; }
              th, td { border: 1px solid black; padding: 8px; text-align: left; font-size: 13px; }
              th { background-color: #f3f4f6; font-weight: 800; font-size: 14px; }
              
              .report-info { text-align: center; margin-bottom: 15px; font-weight: bold; }
              .summary { margin-top: 25px; border-top: 2px solid #333; padding-top: 10px; }
              .summary-row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 5px; font-weight: bold; font-size: 15px; }
              .total-label { width: 150px; }
              .total-value { width: 150px; text-align: right; }
              
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 210mm; margin: 0 auto; padding: 20px;">
              
              <!-- Header Section -->
              <div class="header-container">
                 <div class="logo-container">
                    <img src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" style="width: 80px; height: auto;" />
                 </div>

                 <div class="center-text">
                    <h1 class="header-red org-name">${generalSettings.orgNameNepali}</h1>
                    ${generalSettings.subTitleNepali ? `<h2 class="office-name">${generalSettings.subTitleNepali}</h2>` : ''}
                    ${generalSettings.subTitleNepali2 ? `<h3 class="sub-title">${generalSettings.subTitleNepali2}</h3>` : ''}
                    ${generalSettings.subTitleNepali3 ? `<h4 class="sub-title-3">${generalSettings.subTitleNepali3}</h4>` : ''}
                    <div class="address-text">${[generalSettings.address, generalSettings.phone ? `फोन: ${generalSettings.phone}` : '', generalSettings.email ? `ईमेल: ${generalSettings.email}` : ''].filter(Boolean).join(' | ')}</div>
                    <div class="report-title">${title}</div>
                 </div>

                 <div class="form-no-container"></div>
              </div>
              
              <div class="report-info">
                आर्थिक वर्ष: ${reportFilter.fiscalYear} 
                ${reportFilter.type === 'Daily' ? `| मिति: ${reportFilter.date}` : ''}
                ${reportFilter.type === 'Monthly' ? `| महिना: ${reportFilter.month}` : ''}
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 50px;">क्र.सं.</th>
                    <th>कार्यक्रमको नाम</th>
                    <th>आम्दानीको श्रोत</th>
                    <th style="text-align: right;">आम्दानी रकम (रू)</th>
                    <th style="text-align: right;">खर्च रकम (रू)</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.map((t, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${getProgramName(t.programId)} <br/><small>${t.remarks}</small></td>
                      <td>${t.type === 'Income' ? getSourceLabel(t.incomeSource) : '-'}</td>
                      <td style="text-align: right;">${t.type === 'Income' ? t.amount.toLocaleString() : '0'}</td>
                      <td style="text-align: right;">${t.type === 'Expense' ? t.amount.toLocaleString() : '0'}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background: #f1f5f9; font-weight: bold;">
                    <td colspan="3" style="text-align: right;">कुल जम्मा:</td>
                    <td style="text-align: right;">${reportIncome.toLocaleString()}</td>
                    <td style="text-align: right;">${reportExpense.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>

              <div class="summary">
                <div class="summary-row">
                  <span class="total-label">कुल आम्दानी:</span>
                  <span class="total-value">रू ${reportIncome.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                  <span class="total-label">कुल खर्च:</span>
                  <span class="total-value">रू ${reportExpense.toLocaleString()}</span>
                </div>
                <div class="summary-row" style="color: ${reportIncome - reportExpense >= 0 ? '#059669' : '#e11d48'}">
                  <span class="total-label">मौज्दात रकम:</span>
                  <span class="total-value">रू ${(reportIncome - reportExpense).toLocaleString()}</span>
                </div>
              </div>

              <div style="margin-top: 80px; display: flex; justify-content: space-between;">
                <div style="text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">तयार गर्ने</div>
                <div style="text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">चेक गर्ने</div>
                <div style="text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">सदर गर्ने</div>
              </div>
            </div>
          </body>
        </html>
      `;
      printWin.document.write(content);
      printWin.document.close();
      printWin.print();
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Report Type</label>
            <select 
              className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
              value={reportFilter.type}
              onChange={e => setReportFilter({...reportFilter, type: e.target.value as any})}
            >
              <option value="Daily">Daily Report</option>
              <option value="Monthly">Monthly Report</option>
              <option value="Yearly">Yearly Report</option>
            </select>
          </div>
          
          {reportFilter.type === 'Daily' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Date</label>
              <NepaliDatePicker 
                value={reportFilter.date}
                onChange={(val) => setReportFilter({...reportFilter, date: val})}
              />
            </div>
          )}

          {reportFilter.type === 'Monthly' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Month</label>
              <div className="flex gap-2">
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                  value={reportFilter.month.split('-')[0]}
                  onChange={e => setReportFilter({...reportFilter, month: `${e.target.value}-${reportFilter.month.split('-')[1]}`})}
                >
                   {Array.from({length: 10}, (_, i) => 2075 + i).map(year => (
                     <option key={year} value={year}>{year}</option>
                   ))}
                </select>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                  value={reportFilter.month.split('-')[1]}
                  onChange={e => setReportFilter({...reportFilter, month: `${reportFilter.month.split('-')[0]}-${e.target.value}`})}
                >
                   {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                     <option key={m} value={m}>{m}</option>
                   ))}
                </select>
              </div>
            </div>
          )}

          {reportFilter.type === 'Yearly' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Year</label>
              <select 
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                value={reportFilter.date.split('-')[0]}
                onChange={e => setReportFilter({...reportFilter, date: `${e.target.value}-01-01`})}
              >
                 {Array.from({length: 10}, (_, i) => 2075 + i).map(year => (
                   <option key={year} value={year}>{year}</option>
                 ))}
              </select>
            </div>
          )}
          
          <button onClick={handlePrint} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 ml-auto">
            <Printer size={18} /> रिपोर्ट प्रिन्ट गर्नुहोस्
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
            <h2 className="font-bold text-xl text-slate-800 font-nepali">विस्तृत रिपोर्ट</h2>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-black">Income</p>
                <p className="font-black text-emerald-600">रू {reportIncome}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-black">Expense</p>
                <p className="font-black text-rose-600">रू {reportExpense}</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b text-left">
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">S.N.</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase font-nepali">मिति</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase font-nepali">विवरण</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase font-nepali">प्रकार</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase font-nepali text-right">रकम</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((t, i) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-xs font-mono">{i + 1}</td>
                    <td className="px-6 py-3 text-xs font-mono">{t.dateBs}</td>
                    <td className="px-6 py-3 text-sm font-nepali">{t.remarks}</td>
                    <td className="px-6 py-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${t.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-right font-black font-mono ${t.type === 'Income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Calculator className="text-primary-600" size={32} />
              <span className="font-nepali">लेखा प्रशासन (Finance Admin)</span>
            </h1>
            <p className="text-slate-500 font-medium ml-11">Manage budgets, revenue, and expenditures.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Filter className="text-slate-400" size={18} />
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Fiscal Year</p>
                <p className="text-sm font-black text-slate-800 leading-tight">{currentFiscalYear}</p>
              </div>
            </div>
            {activeTab !== 'dashboard' && activeTab !== 'reports' && (
              <button 
                onClick={() => {
                  if (activeTab === 'programs') setFormType('program');
                  else if (activeTab === 'vendors') setFormType('party');
                  else if (activeTab === 'transactions') {
                    setFormType('transaction');
                    setTxnFormDate(today);
                    setTxnRefNo(generateReferenceNo());
                  }
                  setShowForm(true);
                }}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
              >
                <Plus size={20} /> <span className="font-nepali">नयाँ थप्नुहोस्</span>
              </button>
            )}
            {activeTab === 'vendors' && (
              <button 
                onClick={() => { setFormType('payment'); setShowForm(true); }}
                className="bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-900 shadow-lg shadow-slate-100 transition-all active:scale-95"
              >
                <CreditCard size={20} /> <span className="font-nepali">भुक्तानी</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex overflow-x-auto no-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
              { id: 'programs', label: 'Programs (बजेट)', icon: <Briefcase size={18} /> },
              { id: 'transactions', label: 'Revenue (आम्दानी/खर्च)', icon: <TrendingUp size={18} /> },
              { id: 'vendors', label: 'Parties (फर्म/भुक्तानी)', icon: <Users size={18} /> },
              { id: 'reports', label: 'Reports', icon: <Calendar size={18} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                <span className="font-nepali">{tab.label.split(' ')[1] || tab.label}</span>
                <span className="hidden md:inline opacity-60 text-[10px] ml-1">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          {activeTab !== 'dashboard' && activeTab !== 'reports' && (
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="खोज्नुहोस्..."
                className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-600 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Content */}
        {renderTable()}

        {/* Forms Modal */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setShowForm(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative overflow-hidden"
              >
                <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-xl font-bold text-slate-800 font-nepali">
                    {formType === 'program' && 'नयाँ कार्यक्रम थप्नुहोस्'}
                    {formType === 'party' && 'नयाँ पार्टी थप्नुहोस् (Add Party/Vendor)'}
                    {formType === 'transaction' && 'आम्दानी/खर्च प्रविष्टि (Add Transaction)'}
                    {formType === 'payment' && 'भुक्तानी गर्नुहोस् (Party Payment)'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
                </div>

                <form className="p-6 space-y-4" onSubmit={
                  formType === 'program' ? handleProgramSave : 
                  formType === 'party' ? handlePartySave : 
                  formType === 'transaction' ? handleTransactionSave : 
                  handlePaymentSave
                }>
                  {formType === 'program' && (
                    <>
                      <Input label="कार्यक्रमको नाम (Program Name)" name="name" required />
                      <Input label="कुल बजेट (Total Budget)" name="budget" type="number" required />
                    </>
                  )}

                  {formType === 'party' && (
                    <>
                      <Input label="पार्टी/फर्मको नाम (Firm Name)" name="name" required />
                      <Input label="PAN नम्बर" name="panNumber" />
                      <Input label="ठेगाना" name="address" />
                      <Input label="सम्पर्क नम्बर" name="phone" />
                      <Input label="कुल सम्झौता रकम (Total Contract Amount)" name="contractAmount" type="number" />
                    </>
                  )}

                    {formType === 'transaction' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">मिति (BS)</label>
                          <NepaliDatePicker 
                            value={txnFormDate}
                            onChange={(val) => setTxnFormDate(val)}
                          />
                        </div>
                        <Input label="रकम (Amount)" name="amount" type="number" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Select label="प्रकार (Type)" name="type" options={[{label: 'आम्दानी (Income)', value: 'Income'}, {label: 'खर्च (Expense)', value: 'Expense'}]} required />
                        <Select label="वर्ग (Category)" name="category" options={[
                          {label: 'एम्बुलेन्स (Ambulance)', value: 'Ambulance'},
                          {label: 'ल्याब (Lab Service)', value: 'Lab'},
                          {label: 'साधारण (General)', value: 'General'},
                          {label: 'कार्यक्रम भुक्तानी (Program Payment)', value: 'Program Payment'}
                        ]} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Select 
                          label="आम्दानीको श्रोत (Income Source)" 
                          name="incomeSource" 
                          options={[
                            {label: 'नगरपालिका (Nagarpalika)', value: 'Nagarpalika'},
                            {label: 'वडा (Wada)', value: 'Wada'},
                            {label: 'आन्तरिक (Internal)', value: 'Internal'},
                            {label: 'अन्य (Other)', value: 'Other'}
                          ]} 
                        />
                         <Select 
                          label="सम्बन्धित कार्यक्रम (Optional Program)" 
                          name="programId" 
                          options={programs.map(p => ({ label: p.name, value: p.id }))} 
                        />
                      </div>
                      <Input label="सन्दर्भ नं. (Reference No)" name="referenceNo" defaultValue={txnRefNo} required />
                      <Input label="विवरण (Remarks)" name="remarks" required />
                    </>
                  )}

                  {formType === 'payment' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">मिति (BS)</label>
                        <NepaliDatePicker 
                          value={txnFormDate}
                          onChange={(val) => setTxnFormDate(val)}
                        />
                      </div>
                      <Select 
                        label="पार्टी (Party)" 
                        name="partyId" 
                        required 
                        options={parties.map(p => ({ label: `${p.name} (Baki: रू ${p.totalContractAmount - (p.totalPaidAmount || 0)})`, value: p.id }))} 
                      />
                      <Select 
                        label="कार्यक्रम (Program)" 
                        name="programId" 
                        required 
                        options={programs.map(p => ({ label: p.name, value: p.id }))} 
                      />
                      <Input label="भुक्तानी रकम (Payment Amount)" name="amount" type="number" required />
                      <Input label="विवरण (Remarks)" name="remarks" />
                    </>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors">रद्द गर्नुहोस्</button>
                    <button type="submit" className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all flex items-center justify-center gap-2">
                       <Save size={18} /> सुरक्षित गर्नुहोस्
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
