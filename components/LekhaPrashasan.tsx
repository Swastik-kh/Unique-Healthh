import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calculator, Plus, Search, Printer, Trash2, Edit, Save, 
  ArrowUpCircle, ArrowDownCircle, Users, Briefcase, 
  TrendingUp, TrendingDown, LayoutDashboard, ChevronRight,
  Filter, Calendar, ExternalLink, X, DollarSign, CreditCard, Download,
  ClipboardList, Building2, Eye
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FinancialProgram, ListedParty, FinancialTransaction, PartyPaymentRecord, PaymentRequest, AllowanceRecord, GoswaraVoucher, JournalEntry } from '../types/financeTypes';
import { OrganizationSettings } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import NepaliDate from 'nepali-date-converter';
import { db } from '../firebase';
import { ref, onValue, remove } from 'firebase/database';

interface LekhaPrashasanProps {
  programs: FinancialProgram[];
  parties: ListedParty[];
  transactions: FinancialTransaction[];
  payments: PartyPaymentRecord[];
  paymentRequests: PaymentRequest[];
  allowances: AllowanceRecord[];
  onSaveProgram: (program: any) => void;
  onDeleteProgram: (id: string) => void;
  onSaveParty: (party: any) => void;
  onDeleteParty: (id: string) => void;
  onSaveTransaction: (transaction: any) => void;
  onSavePayment: (payment: Omit<PartyPaymentRecord, 'id'>) => void;
  onSavePaymentRequest: (request: Omit<PaymentRequest, 'id'>) => void;
  onSaveAllowance: (allowance: Omit<AllowanceRecord, 'id'>) => void;
  onUpdatePaymentRequest: (id: string, request: Partial<PaymentRequest>) => void;
  onUpdateAllowance: (id: string, allowance: Partial<AllowanceRecord>) => void;
  onDeletePaymentRequest: (id: string) => void;
  onDeleteAllowance: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onDeletePayment: (id: string, amount: number, partyId: string, programId: string) => void;
  generalSettings: OrganizationSettings;
  currentFiscalYear: string;
  isAdmin: boolean;
}

export const LekhaPrashasan: React.FC<LekhaPrashasanProps> = ({
  programs = [],
  parties = [],
  transactions = [],
  payments = [],
  paymentRequests = [],
  allowances = [],
  onSaveProgram,
  onDeleteProgram,
  onSaveParty,
  onDeleteParty,
  onSaveTransaction,
  onSavePayment,
  onSavePaymentRequest,
  onSaveAllowance,
  onUpdatePaymentRequest,
  onUpdateAllowance,
  onDeletePaymentRequest,
  onDeleteAllowance,
  onDeleteTransaction,
  onDeletePayment,
  generalSettings,
  currentFiscalYear,
  isAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'programs' | 'transactions' | 'vendors' | 'payments' | 'payment_requests' | 'allowances' | 'reports' | 'journal_voucher'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'program' | 'party' | 'transaction' | 'payment' | 'nagarpalika_payment' | 'allowance'>('program');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [paymentSelectedProgram, setPaymentSelectedProgram] = useState('');
  const [paymentSelectedTransaction, setPaymentSelectedTransaction] = useState('');
  const [paymentApplyTds, setPaymentApplyTds] = useState(false);
  const [paymentApplySasukar, setPaymentApplySasukar] = useState(false);
  const [isManualParty, setIsManualParty] = useState(false);
  
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

  const getNepaliMonthName = (dateBs: string) => {
    const monthNo = parseInt(dateBs.split('-')[1]);
    const months = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'];
    return months[monthNo-1] || dateBs;
  }

  const [isOtherProgramSelected, setIsOtherProgramSelected] = useState(false);
  const [goswaraVouchers, setGoswaraVouchers] = useState<GoswaraVoucher[]>([]);

  useEffect(() => {
      const orgName = generalSettings.orgNameEnglish;
      if (!orgName) return;
      const safeOrgName = orgName.trim().replace(/[.#$[\]]/g, "_");
      const vouchersRef = ref(db, `orgData/${safeOrgName}/goswaraVouchers`);
      const unsub = onValue(vouchersRef, (snap) => {
          const data = snap.val();
          const vouchers = data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
          setGoswaraVouchers(vouchers);
      });
      return () => unsub();
  }, [generalSettings.orgNameEnglish]);

  const handleDeleteVoucher = async (id: string) => {
    if (window.confirm('के तपाईं निश्चित रूपमा यो गोश्वारा भौचर हटाउन चाहनुहुन्छ?')) {
      const orgName = generalSettings.orgNameEnglish;
      if (!orgName) return;
      const safeOrgName = orgName.trim().replace(/[.#$[\]]/g, "_");
      try {
        await remove(ref(db, `orgData/${safeOrgName}/goswaraVouchers/${id}`));
      } catch (error) {
        console.error('Error deleting voucher:', error);
        alert('भौचर हटाउन सकिएन।');
      }
    }
  };

  useEffect(() => {
    if (paymentSelectedTransaction) {
      const txn = transactions.find(t => t.id === paymentSelectedTransaction);
      if (txn) {
        setPaymentApplyTds(!!(txn.tdsAmount && txn.tdsAmount > 0));
        setPaymentApplySasukar(!!(txn.sasukarAmount && txn.sasukarAmount > 0));
      }
    } else {
      setPaymentApplyTds(false);
      setPaymentApplySasukar(false);
    }
  }, [paymentSelectedTransaction, transactions]);

  // Derived State
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If predominantly vertical scroll, transform to horizontal
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        // Block page scroll
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const stats = useMemo(() => {
    const fyTransactions = transactions.filter(t => t.fiscalYear === currentFiscalYear);
    const income = fyTransactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    
    // Include all expense transactions immediately
    const expense = fyTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    // Vendor Totals
    const totalContract = parties.reduce((sum, p) => sum + (p.totalContractAmount || 0), 0);
    const totalPaid = parties.reduce((sum, p) => sum + (p.totalPaidAmount || 0), 0);
    const totalRemaining = totalContract - totalPaid;
    
    return { income, expense, balance, totalContract, totalPaid, totalRemaining };
  }, [transactions, parties, currentFiscalYear]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'programs': return programs.filter(p => p.name.toLowerCase().includes(term) && p.fiscalYear === currentFiscalYear);
      case 'vendors': return parties.filter(p => p.name.toLowerCase().includes(term) || p.panNumber.includes(term));
      case 'transactions': return transactions.filter(t => t.remarks.toLowerCase().includes(term) && t.fiscalYear === currentFiscalYear);
      case 'payments': return payments.filter(p => p.remarks.toLowerCase().includes(term) && p.fiscalYear === currentFiscalYear);
      case 'payment_requests': {
        return paymentRequests
          .filter(p => 
            ((p.remarks || '').toLowerCase().includes(term) || 
              (p.customProgramName || '').toLowerCase().includes(term) ||
              (programs.find(prog => prog.id === p.programId)?.name || '').toLowerCase().includes(term)) && 
            p.fiscalYear === currentFiscalYear
          )
          .map(p => ({ ...p, _type: 'PaymentRequest' }))
          .sort((a, b) => b.dateBs.localeCompare(a.dateBs));
      }
      case 'allowances': {
        return allowances
          .filter(a => 
            ((a.remarks || '').toLowerCase().includes(term) || 
              a.employeeName.toLowerCase().includes(term) || 
              (a.customProgramName || '').toLowerCase().includes(term) ||
              (programs.find(prog => prog.id === a.programId)?.name || '').toLowerCase().includes(term)) && 
            a.fiscalYear === currentFiscalYear
          )
          .map(a => ({ ...a, _type: 'Allowance' }))
          .sort((a, b) => b.dateBs.localeCompare(a.dateBs));
      }
      default: return [];
    }
  }, [activeTab, programs, parties, transactions, payments, paymentRequests, allowances, searchTerm, currentFiscalYear]);

  const budgetPatternData = useMemo(() => {
    // Get unique fiscal years from programs
    const allFYs = Array.from(new Set(programs.map(p => p.fiscalYear))).sort().reverse();
    // Take top 3
    const top3FYs = allFYs.slice(0, 3).reverse();
    
    return top3FYs.map(fy => ({
      fy,
      budget: programs.filter(p => p.fiscalYear === fy).reduce((sum, p) => sum + p.totalBudget, 0)
    }));
  }, [programs]);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setIsManualParty(false);
    setPaymentSelectedProgram('');
    setPaymentSelectedTransaction('');
    setPaymentApplyTds(false);
    setPaymentApplySasukar(false);
  };

  // Handle Saves
  const handleProgramSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSaveProgram({
      ...editingItem,
      name: formData.get('name') as string,
      source: formData.get('source') as any,
      totalBudget: Number(formData.get('budget')),
      fiscalYear: editingItem?.fiscalYear || currentFiscalYear,
      createdAt: editingItem?.createdAt || today,
      spentAmount: editingItem?.spentAmount || 0
    });
    setShowForm(false);
    setEditingItem(null);
  };

  const handleNagarpalikaPaymentRequestSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const progId = formData.get('programId') as string;
    const payload: any = {
      programId: progId,
      amountRequested: Number(formData.get('amountRequested')),
      amountPaid: Number(formData.get('amountPaid')),
      status: formData.get('status') as any,
      dateBs: txnFormDate,
      remarks: (formData.get('remarks') as string) || '',
      fiscalYear: currentFiscalYear
    };
    
    if (progId === 'other') {
      const customName = formData.get('customProgramName') as string;
      if (customName) payload.customProgramName = customName;
    }

    if (editingItem) {
      onUpdatePaymentRequest(editingItem.id, payload);
    } else {
      onSavePaymentRequest(payload);
    }
    setShowForm(false);
    setEditingItem(null);
    setIsOtherProgramSelected(false);
  };

  const handleAllowanceSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const progId = formData.get('programId') as string;
    const payload: any = {
      programId: progId,
      employeeName: formData.get('employeeName') as string,
      amount: Number(formData.get('amount')),
      dateBs: txnFormDate,
      isPaid: formData.get('isPaid') === 'on',
      remarks: (formData.get('remarks') as string) || '',
      fiscalYear: currentFiscalYear
    };

    if (progId === 'other') {
      const customName = formData.get('customProgramName') as string;
      if (customName) payload.customProgramName = customName;
    }

    if (editingItem) {
      onUpdateAllowance(editingItem.id, payload);
    } else {
      onSaveAllowance(payload);
    }
    setShowForm(false);
    setEditingItem(null);
    setIsOtherProgramSelected(false);
  };

  const handleTransactionSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const isVatBill = formData.get('isVatBill') === 'on';
    const amountWithoutVAT = isVatBill ? amount / 1.13 : amount;
    const amountWithVAT = amount;
    const applyTds = formData.get('applyTds') === 'on';
    const tdsAmount = applyTds ? amount * 0.015 : 0;
    const applySasukar = formData.get('applySasukar') === 'on';
    const sasukarAmount = applySasukar ? amountWithoutVAT * 0.01 : 0;

    onSaveTransaction({
      ...editingItem,
      dateBs: txnFormDate,
      dateAd: new NepaliDate(txnFormDate).toJsDate().toISOString(),
      category: formData.get('category') as any,
      type: formData.get('type') as any,
      amountWithoutVAT: amountWithoutVAT,
      amountWithVAT: amountWithVAT,
      tdsAmount: tdsAmount,
      sasukarAmount: sasukarAmount,
      amount: amount,
      remarks: formData.get('remarks') as string,
      partyName: formData.get('partyName') as string || undefined,
      fiscalYear: editingItem?.fiscalYear || currentFiscalYear,
      referenceNo: (formData.get('referenceNo') as string) || txnRefNo,
      incomeSource: formData.get('incomeSource') as any || undefined,
      programId: formData.get('programId') as string || undefined,
    });
    setShowForm(false);
    setEditingItem(null);
  };

  const handlePartySave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSaveParty({
      ...editingItem,
      name: formData.get('name') as string,
      panNumber: formData.get('panNumber') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      totalContractAmount: Number(formData.get('contractAmount')),
      totalPaidAmount: editingItem?.totalPaidAmount || 0
    });
    handleCloseForm();
  };

  const handlePaymentSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const partyId = formData.get('partyId') as string;
    const manualPartyName = formData.get('manualPartyName') as string;
    const programId = formData.get('programId') as string;
    const transactionId = formData.get('transactionId') as string;

    const applyTds = paymentApplyTds;
    const amountWithoutVAT = amount; // Simplified for payments
    const tdsAmount = applyTds ? amount * 0.015 : 0;
    const applySasukar = paymentApplySasukar;
    const sasukarAmount = applySasukar ? amountWithoutVAT * 0.01 : 0;

    onSavePayment({
      partyId: isManualParty ? 'manual' : partyId,
      manualPartyName: isManualParty ? manualPartyName : undefined,
      programId,
      transactionId,
      amount,
      tdsAmount,
      sasukarAmount,
      dateBs: txnFormDate,
      fiscalYear: currentFiscalYear,
      paymentMethod: formData.get('method') as string,
      remarks: formData.get('remarks') as string
    });

    handleCloseForm();
  };

  const handlePrintParties = () => {
    const printWin = window.open('', '', 'width=900,height=600');
    if (!printWin) return;
    const title = "पार्टी विवरण (Party Details)";

    const content = `
    <html>
      <head>
        <title>${title}</title>
        <style>
           @page { size: A4 portrait; margin: 10mm; } 
           body { font-family: 'Mukta', sans-serif; } 
           table { width: 100%; border-collapse: collapse; margin-top: 20px; } 
           th, td { border: 1px solid black; padding: 10px; text-align: left; font-size: 12px; } 
           th { background: #f3f4f6; text-align: center; }
           .text-right { text-align: right; }
           .text-xs { font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <h2 style="text-align: center;">${title}</h2>
        <table>
          <thead>
            <tr>
              <th>पार्टीको नाम र खर्च विवरण</th>
              <th>PAN</th>
              <th>सम्झौता</th>
              <th>भुक्तानी</th>
              <th>बाँकी</th>
            </tr>
          </thead>
          <tbody>
            ${parties.map(p => {
              const partyTxns = transactions.filter(t => t.partyId === p.id);
              return `
                <tr>
                  <td>
                    <div><strong>${p.name}</strong></div>
                    ${partyTxns.map(t => `<div class="text-xs">- ${t.remarks} (रू ${t.amount})</div>`).join('')}
                  </td>
                  <td>${p.panNumber}</td>
                  <td class="text-right">रू ${p.totalContractAmount.toLocaleString()}</td>
                  <td class="text-right">रू ${(p.totalPaidAmount || 0).toLocaleString()}</td>
                  <td class="text-right">रू ${(p.totalContractAmount - (p.totalPaidAmount || 0)).toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
    </html>`;
    printWin.document.write(content);
    printWin.document.close();
    printWin.print();
  };

  const handleDownloadPartiesExcel = () => {
    const data = parties.map(p => {
      const partyTxns = transactions.filter(t => t.partyId === p.id);
      const bibaran = partyTxns.map(t => `${t.remarks} (रू ${t.amount})`).join(', ');
      return {
        'पार्टीको नाम': p.name,
        'खर्च विवरण': bibaran,
        'PAN': p.panNumber,
        'सम्झौता रकम': p.totalContractAmount,
        'भुक्तानी रकम': p.totalPaidAmount || 0,
        'बाँकी रकम': p.totalContractAmount - (p.totalPaidAmount || 0)
      };
    });

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Parties");
    writeFile(wb, "Party_Details.xlsx");
  };

  const numberToWords = (num: number) => {
    const ones = ['', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ'];
    const teens = ['दश', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस'];
    const tens = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठी', 'सत्तर', 'असी', 'नब्बे'];
    
    if (num === 0) return 'शून्य';
    
    function convert(n: number) {
      let word = '';
      if (n >= 100) {
        word += ones[Math.floor(n / 100)] + ' सय ';
        n %= 100;
      }
      if (n >= 20) {
        word += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n >= 10) {
        word += teens[n - 10] + ' ';
        n = 0;
      }
      if (n > 0) {
        word += ones[n] + ' ';
      }
      return word;
    }
    
    let result = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    
    if (crore > 0) result += convert(crore) + 'करोड ';
    if (lakh > 0) result += convert(lakh) + 'लाख ';
    if (thousand > 0) result += convert(thousand) + 'हजार ';
    if (num > 0) result += convert(num);
    
    return result.trim();
  };

  const handlePrintVoucher = (voucher: GoswaraVoucher) => {
    const printWin = window.open('', '', 'width=1000,height=800');
    if (!printWin) return;
    
    const logoUrl = generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png";

    const content = `
      <html>
        <head>
          <title>गोश्वारा भौचर - ${voucher.id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
             @page { size: A4 landscape; margin: 10mm; } 
             body { font-family: 'Mukta', sans-serif; margin: 0; padding: 10px; font-size: 14px; } 
             .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
             .header-center { text-align: center; flex: 1; }
             .header-side { width: 150px; }
             .org-info h1 { margin: 0; font-size: 20px; font-weight: 800; color: #000; }
             .org-info h2 { margin: 0; font-size: 16px; font-weight: 600; }
             .org-info p { margin: 2px 0; font-size: 14px; }
             
             .form-number { text-align: right; font-size: 12px; }
             .main-title { text-align: center; margin: 10px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 5px 0; }
             .main-title h3 { margin: 0; font-size: 18px; font-weight: 800; text-decoration: underline; }
             
             .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: 500; }
             .meta-item { display: flex; gap: 5px; }
             .dots { border-bottom: 1px dotted #000; flex: 1; min-width: 100px; display: inline-block; padding-left: 5px; }
             
             table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; } 
             th, td { border: 1px solid black; padding: 5px; text-align: left; font-size: 13px; word-wrap: break-word; } 
             th { background: #f9fafb; text-align: center; font-weight: 700; }
             .text-right { text-align: right; }
             .text-center { text-align: center; }
             
             .source-header { text-align: center; border-bottom: 1px solid black; }
             .source-sub-cols { display: flex; }
             .source-sub-col { flex: 1; text-align: center; font-size: 10px; padding: 2px; }
             .source-sub-col:not(:last-child) { border-right: 1px solid black; }
             
             .footer { margin-top: 30px; display: flex; justify-content: space-between; }
             .sign-box { text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 5px; }
             
             .qr-code { width: 80px; height: 80px; border: 1px solid #ccc; background: #fafafa; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #aaa; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-side">
               <img src="${logoUrl}" style="width: 70px;">
               <div style="font-size: 10px; margin-top: 5px;">नेपाल सरकारको छाप</div>
            </div>
            <div class="header-center org-info">
               <h2>${generalSettings.subTitleNepali || 'संघ/ प्रदेश / स्थानीय तह'}</h2>
               <h1>${generalSettings.orgNameNepali}</h1>
               <p>${generalSettings.subTitleNepali2 || 'मन्त्रालय / विभाग / कार्यालय'}</p>
               <p>कार्यालय कोड नं.: <span class="dots">${generalSettings.officeCode || '......................'}</span></p>
            </div>
            <div class="header-side" style="display: flex; flex-direction: column; align-items: flex-end;">
               <div class="form-number">
                 म.ले.प.फारम नं: २०३<br>
                 साबिकको फारम नं: १०
               </div>
               <div class="qr-code" style="margin-top: 10px;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${voucher.id}" style="width: 100%; height: 100%;">
               </div>
            </div>
          </div>

          <div class="main-title">
            <h3>गोश्वारा भौचर (खर्च/विविध)</h3>
          </div>

          <div class="meta-row">
            <div class="meta-item" style="flex: 2;">
               गोश्वारा भौचरको प्रकार: प्राप्ती/खर्च/धरौटी/अन्य: <span class="dots" style="min-width: 150px;">
                 ${voucher.id.includes('PAY') || voucher.entries.some(e => e.debit && !e.accountName.includes('Bank/Cash')) ? 'खर्च' : 'प्राप्ती'}
               </span>
            </div>
            <div class="meta-item">
               मिति : <span class="dots" style="min-width: 150px;">${voucher.dateBs}</span>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-item" style="flex: 2;">
               बजेट उप शीर्षक नं : <span class="dots" style="min-width: 150px;"></span>
            </div>
            <div class="meta-item">
               मुल गो.भौ.न. : <span class="dots" style="min-width: 150px;">${voucher.id}</span>
            </div>
          </div>
          
          <div class="meta-row">
             <div class="meta-item" style="flex: 2;">
                विद्युतीय कारोवार नं.: <span class="dots" style="min-width:150px;"></span>
             </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">क्र.सं.</th>
                <th style="width: 100px;">संकेत / उप-शीर्षक नम्बर</th>
                <th style="width: 120px;">क्रियाकलाप / कार्यक्रम संकेत नं:</th>
                <th>कारोवारको ब्यहोरा</th>
                <th style="width: 50px;">खाता पाना नं</th>
                <th style="width: 240px; padding: 0;">
                   <div style="border-bottom: 1px solid black; padding: 2px;">स्रोतको</div>
                   <div style="display: flex; font-size: 11px;">
                      <div style="flex: 1; border-right: 1px solid black; padding: 2px;">तह</div>
                      <div style="flex: 1.5; border-right: 1px solid black; padding: 2px;">स्रोत व्यहोर्ने संस्था</div>
                      <div style="flex: 1; border-right: 1px solid black; padding: 2px;">प्रकार</div>
                      <div style="flex: 1.5; padding: 2px;">भुक्तानी विधि</div>
                   </div>
                </th>
                <th style="width: 100px;">डेबिट</th>
                <th style="width: 100px;">क्रेडिट</th>
              </tr>
            </thead>
            <tbody>
              ${voucher.entries.map((e, idx) => `
                <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td></td>
                    <td style="font-size: 11px;">${e.activityName || ''}</td>
                    <td>
                       ${(e.accountName.includes('Expense Account') || e.accountName === 'खर्च') && voucher.remarks 
                         ? voucher.remarks 
                         : e.accountName}
                    </td>
                    <td></td>
                    <td style="padding: 0;">
                       <div style="display: flex; height: 100%;">
                          <div style="flex: 1; border-right: 1px solid black;"></div>
                          <div style="flex: 1.5; border-right: 1px solid black;"></div>
                          <div style="flex: 1; border-right: 1px solid black;"></div>
                          <div style="flex: 1.5;"></div>
                       </div>
                    </td>
                    <td class="text-right">${e.debit ? e.debit.toLocaleString() : ''}</td>
                    <td class="text-right">${e.credit ? e.credit.toLocaleString() : ''}</td>
                </tr>
              `).join('')}
              ${voucher.remarks ? `
                <tr>
                    <td class="text-center"></td>
                    <td></td>
                    <td></td>
                    <td colspan="5" style="font-size: 11px; padding: 5px; background: #fff;">
                      <strong>कारोबारको संक्षिप्त व्यहोरा (Narration):</strong> ${voucher.remarks}
                    </td>
                </tr>
              ` : ''}
              <!-- Fill remaining rows for height if needed -->
              ${voucher.entries.length < 5 ? Array(5 - voucher.entries.length).fill('').map(() => `
                <tr style="height: 30px;">
                    <td></td><td></td><td></td><td></td><td></td><td>
                      <div style="display: flex; height: 100%;">
                          <div style="flex: 1; border-right: 1px solid black;"></div>
                          <div style="flex: 1.5; border-right: 1px solid black;"></div>
                          <div style="flex: 1; border-right: 1px solid black;"></div>
                          <div style="flex: 1.5;"></div>
                       </div>
                    </td><td></td><td></td>
                </tr>
              `).join('') : ''}
            </tbody>
            <tfoot>
                <tr style="font-weight: bold;">
                    <td colspan="6" class="text-right">जम्मा (Total)</td>
                    <td class="text-right">रू ${voucher.totalAmount.toLocaleString()}</td>
                    <td class="text-right">रू ${voucher.totalAmount.toLocaleString()}</td>
                </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 15px; font-weight: bold;">अक्षरेपि : रू ${numberToWords(voucher.totalAmount)} मात्र ।</div>

          <div class="footer">
            <div class="sign-box">
              पेस गर्ने
              <div style="margin-top: 30px;">नाम : ....................</div>
              <div>पद : ....................</div>
              <div>मिति : ....................</div>
            </div>
            <div class="sign-box">
              जाँच गर्ने
              <div style="margin-top: 30px;">नाम : ....................</div>
              <div>पद : ....................</div>
              <div>मिति : ....................</div>
            </div>
            <div class="sign-box">
              सदर गर्ने
              <div style="margin-top: 30px;">नाम : ....................</div>
              <div>पद : ....................</div>
              <div>मिति : ....................</div>
            </div>
          </div>
        </body>
      </html>
    `;
    printWin.document.write(content);
    printWin.document.close();
    setTimeout(() => {
        printWin.focus();
        printWin.print();
    }, 500);
  };

  const openEditForm = (item: any, type: typeof formType) => {
    setEditingItem(item);
    setFormType(type);
    if (type === 'transaction') {
      setTxnFormDate(item.dateBs);
      setTxnRefNo(item.referenceNo);
    }
    if (type === 'payment') {
      setPaymentSelectedProgram(item.programId || '');
    }
    setShowForm(true);
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

  const renderReports = () => {
    const allRecords = [
      ...transactions.map(t => ({ ...t, isPayment: false })),
    ];

    const reportData = allRecords.filter(t => {
      if (t.fiscalYear !== reportFilter.fiscalYear) return false;
      
      if (reportFilter.type === 'Daily') return t.dateBs === reportFilter.date;
      if (reportFilter.type === 'Monthly') return t.dateBs.startsWith(reportFilter.month);
      return true;
    });

    const reportIncome = reportData.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amountWithVAT || t.amount || 0), 0);
    const reportExpense = reportData.filter(t => t.type === 'Expense').reduce((s, t) => s + ((t.amountWithVAT || t.amount || 0) - (t.tdsAmount || 0) - (t.sasukarAmount || 0)), 0);

    const handlePrint = () => {
      const printWin = window.open('', '', 'width=900,height=600');
      if (!printWin) return;
      const title = reportFilter.type === 'Daily' ? `दैनिक आय-व्यय विवरण (${reportFilter.date})` : 
                    reportFilter.type === 'Monthly' ? `मासिक आय-व्यय विवरण (${reportFilter.month.split('-')[0]} ${getNepaliMonthName(reportFilter.month + '-01')})` : 
                    `आर्थिक वर्ष ${reportFilter.fiscalYear} को वार्षिक आय-व्यय विवरण`;

      const getProgramName = (id?: string) => programs.find(p => p.id === id)?.name || '-';

      const content = `
      <html>
        <head>
          <title>${title}</title>
          <style>
             @page { size: A4 portrait; margin: 10mm; } 
             body { font-family: 'Mukta', sans-serif; } 
             table { width: 100%; border-collapse: collapse; margin-top: 20px; } 
             th, td { border: 1px solid black; padding: 10px; text-align: left; } 
             th { background: #f3f4f6; text-align: center; }
             .text-right { text-align: right; }
             .text-center { text-align: center; }
             .summary { margin-top: 20px; display: flex; gap: 20px; }
             .box { border: 1px solid #ccc; padding: 15px; flex: 1; text-align: center; }
          </style>
        </head>
        <body>
          <div style="display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 20px;">
            <img src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" style="width: 80px; position: absolute; left: 0;">
            <div style="text-align: center; width: 100%;">
              <h1 style="color: #e11d48; margin: 0; font-size: 24px;">${generalSettings.orgNameNepali}</h1>
              <div style="font-size: 14px; font-weight: bold; margin: 5px 0;">
                  ${generalSettings.subTitleNepali || ''} ${generalSettings.subTitleNepali2 ? '| ' + generalSettings.subTitleNepali2 : ''} ${generalSettings.subTitleNepali3 ? '| ' + generalSettings.subTitleNepali3 : ''}
              </div>
              <h2 style="margin: 0; font-size: 20px;">${title}</h2>
              <p style="margin: 5px 0;">आर्थिक वर्ष: ${reportFilter.fiscalYear}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>मिति (गते)</th><th>विवरण</th><th>आम्दानी</th><th>खर्च</th></tr>
            </thead>
            <tbody>
              ${reportData.map(t => {
                const displayDate = reportFilter.type === 'Monthly' ? t.dateBs.split('-')[2] : t.dateBs;
                return `<tr><td class="text-center">${displayDate}</td><td>${getProgramName(t.programId)} (${t.remarks || ''})</td><td class="text-right">${t.type === 'Income' ? t.amount.toLocaleString() : '-'}</td><td class="text-right">${t.type === 'Expense' ? t.amount.toLocaleString() : '-'}</td></tr>`
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <td colspan="2" style="text-align: right;">Total</td>
                <td class="text-right">${reportIncome.toLocaleString()}</td>
                <td class="text-right">${reportExpense.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <div class="summary">
            <div class="box">
              <p>मौज्दात रकम</p>
              <h3>रू ${stats.balance.toLocaleString()}</h3>
            </div>
            <div class="box">
              <p>भुक्तानी गर्न बाँकी</p>
              <h3>रू ${stats.totalRemaining.toLocaleString()}</h3>
            </div>
          </div>
        </body>
      </html>`;
      printWin.document.write(content);
      printWin.document.close();
      printWin.print();
    };

    const handleDownloadExcel = () => {
      const title = reportFilter.type === 'Daily' ? `दैनिक आय-व्यय विवरण (${reportFilter.date})` : 
                    reportFilter.type === 'Monthly' ? `मासिक आय-व्यय विवरण (${reportFilter.month})` : 
                    `आर्थिक वर्ष ${reportFilter.fiscalYear} को वार्षिक आय-व्यय विवरण`;

      const getProgramName = (id?: string) => programs.find(p => p.id === id)?.name || '-';

      const data = reportData.map(t => ({
        'मिति': t.dateBs,
        'विवरण': `${getProgramName(t.programId)} (${t.remarks || ''})`,
        'आम्दानी': t.type === 'Income' ? t.amount : 0,
        'खर्च': t.type === 'Expense' ? t.amount : 0
      }));

      // Add totals
      data.push({
        'मिति': 'जम्मा (Total)',
        'विवरण': '',
        'आम्दानी': reportIncome,
        'खर्च': reportExpense
      });

      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Report");
      writeFile(wb, `${title}.xlsx`);
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Report Type</label>
            <select className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" value={reportFilter.type} onChange={e => setReportFilter({...reportFilter, type: e.target.value as any})}>
              <option value="Daily">Daily</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          {reportFilter.type === 'Daily' && <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Date</label><NepaliDatePicker value={reportFilter.date} onChange={val => setReportFilter({...reportFilter, date: val})} /></div>}
          <div className="flex gap-2 ml-auto">
            <button onClick={handleDownloadExcel} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700"><Download size={18} /> Excel</button>
            <button onClick={handlePrint} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900"><Printer size={18} /> Print</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8 animate-in fade-in">
          <div className="flex items-center gap-6 mb-8 border-b pb-6">
            <img 
              src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
              alt="Logo" 
              className="h-24 w-24 object-contain"
            />
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-black text-rose-600 uppercase leading-tight">{generalSettings.orgNameNepali}</h1>
              <div className="flex justify-center gap-2 text-xs text-slate-600 font-bold mt-1">
                  {generalSettings.subTitleNepali && <span>{generalSettings.subTitleNepali}</span>}
                  {generalSettings.subTitleNepali2 && <span>| {generalSettings.subTitleNepali2}</span>}
                  {generalSettings.subTitleNepali3 && <span>| {generalSettings.subTitleNepali3}</span>}
              </div>
              <h2 className="text-xl font-black underline underline-offset-8 mt-4">
                {reportFilter.type === 'Daily' ? `दैनिक आय-व्यय विवरण (${reportFilter.date})` : 
                 reportFilter.type === 'Monthly' ? `मासिक आय-व्यय विवरण (${reportFilter.month.split('-')[0]} ${getNepaliMonthName(reportFilter.month + '-01')})` : 
                 `वार्षिक आय-व्यय विवरण (${reportFilter.fiscalYear})`}
              </h2>
              <p className="font-bold mt-2 text-slate-500 text-sm">आर्थिक वर्ष: {reportFilter.fiscalYear}</p>
            </div>
            <div className="w-24"></div>
          </div>
          
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">मिति</th>
                <th className="px-4 py-3 text-left">विवरण</th>
                <th className="px-4 py-3 text-right">आम्दानी</th>
                <th className="px-4 py-3 text-right">खर्च</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{t.dateBs}</td>
                  <td className="px-4 py-3 font-nepali font-bold text-slate-700">{programs.find(p => p.id === t.programId)?.name || '-'} {t.remarks}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-black">{t.type === 'Income' ? (t.amountWithVAT || t.amount || 0).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right text-rose-600 font-black">{t.type === 'Expense' ? ((t.amountWithVAT || t.amount || 0) - (t.tdsAmount || 0) - (t.sasukarAmount || 0)).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td colSpan={2} className="px-4 py-3 text-right">Total</td>
                <td className="px-4 py-3 text-right text-emerald-700">रू {reportIncome.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-rose-700">रू {reportExpense.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {budgetPatternData.length > 0 && (
            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 print:hidden overflow-hidden">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} />
                ३ वर्षको बजेट ढाँचा (3 Year Budget Pattern)
              </h3>
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="99%" height="100%" minHeight={300}>
                  <BarChart data={budgetPatternData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="fy" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(value) => `रू ${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`रू ${value.toLocaleString()}`, 'कुल बजेट']}
                    />
                    <Bar 
                      dataKey="budget" 
                      fill="#e11d48" 
                      radius={[6, 6, 0, 0]} 
                      barSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 border-t pt-6">
             <div className="bg-blue-50 p-4 rounded-xl">
               <p className="text-xs font-black text-blue-400 uppercase">मौज्दात रकम (Available Fund)</p>
               <p className="text-2xl font-black text-blue-700">रू {stats.balance.toLocaleString()}</p>
             </div>
             <div className="bg-rose-50 p-4 rounded-xl">
               <p className="text-xs font-black text-rose-400 uppercase">भुक्तानी गर्न बाँकी (Pending Payments)</p>
               <p className="text-2xl font-black text-rose-700">रू {stats.totalRemaining.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>
    );
  };


  const renderJournalVouchers = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
           <thead>
             <tr className="bg-slate-50 border-b">
               <th className="px-6 py-4">मिति</th>
               <th className="px-6 py-4">भौचर नं</th>
               <th className="px-6 py-4">प्रकार</th>
               <th className="px-6 py-4">विवरण (Remarks)</th>
               <th className="px-6 py-4 text-right">रकम</th>
               <th className="px-6 py-4 text-center">कार्य</th>
             </tr>
           </thead>
           <tbody>
             {goswaraVouchers.map(v => (
               <tr key={v.id} className="border-b">
                  <td className="px-6 py-4">{v.dateBs}</td>
                  <td className="px-6 py-4 font-mono text-xs">{v.id}</td>
                  <td className="px-6 py-4 text-xs">
                    <span className={`px-2 py-1 rounded-full ${v.id.includes('PAY') || v.entries.some(e => e.debit && !e.accountName.includes('Bank/Cash')) ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {v.id.includes('PAY') || v.entries.some(e => e.debit && !e.accountName.includes('Bank/Cash')) ? 'खर्च' : 'प्राप्ती'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-nepali">{v.remarks || '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-700 font-nepali">रू {v.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => handlePrintVoucher(v)} className="text-indigo-600 hover:text-indigo-900" title="प्रिन्ट">
                         <Printer size={16} />
                       </button>
                       <button onClick={() => handleDeleteVoucher(v.id)} className="text-rose-500 hover:text-rose-700" title="हटाउनुहोस्">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );

  const renderTable = () => {
    if (activeTab === 'dashboard') return renderDashboard();
    if (activeTab === 'reports') return renderReports();
    if (activeTab === 'journal_voucher') return renderJournalVouchers();

    return (
      <div className="space-y-6">
        {activeTab === 'vendors' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">कुल सम्झौता रकम (Total Contract)</p>
              <h4 className="text-xl font-black text-slate-800 font-mono">रू {stats.totalContract.toLocaleString()}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">कुल भुक्तानी रकम (Total Paid)</p>
              <h4 className="text-xl font-black text-emerald-600 font-mono">रू {stats.totalPaid.toLocaleString()}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">भुक्तानी हुन बाँकी (Total Pending)</p>
              <h4 className="text-xl font-black text-rose-600 font-mono">रू {stats.totalRemaining.toLocaleString()}</h4>
            </div>
          </div>
        )}

        {(activeTab === 'payment_requests' || activeTab === 'allowances') && (
          <div className="flex justify-end bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => { 
                setFormType(activeTab === 'payment_requests' ? 'nagarpalika_payment' : 'allowance'); 
                setEditingItem(null); 
                setTxnFormDate(today); 
                setIsOtherProgramSelected(false);
                setShowForm(true); 
              }}
              className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all text-sm"
            >
              <Plus size={16} /> {activeTab === 'payment_requests' ? 'नयाँ भुक्तानी माग' : 'नयाँ भत्ता रेकर्ड'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali whitespace-nowrap">ID / मिति</th>
                  {activeTab === 'programs' && <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कार्यक्रमको नाम</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">बजेट/आम्दानी/खर्च/भुक्तानी</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">प्रगति</th>
                  </>}
                  {activeTab === 'vendors' && <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">पार्टीको नाम</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">PAN</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">सम्झौता</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">भुक्तानी</th>
                  </>}
                  {activeTab === 'transactions' && <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">विवरण</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">प्रकार</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">रकम</th>
                  </>}
                  {activeTab === 'payment_requests' && <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कार्यक्रम</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">विवरण (Payment Result)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">माग</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">भुक्तानी रकम</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-center">अवस्था</th>
                  </>}
                  {activeTab === 'allowances' && <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कार्यक्रम</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कर्मचारी र विवरण</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">भत्ता रकम</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-center">अवस्था</th>
                  </>}
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-center">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTab === 'programs' ? (() => {
                  const groupedPrograms: Record<string, any[]> = {};
                  const sources = ['Nagarpalika', 'Wada', 'Internal', 'Other', 'Unknown'];
                  
                  filteredData.forEach((p: any) => {
                    const s = p.source || 'Unknown';
                    if (!groupedPrograms[s]) groupedPrograms[s] = [];
                    groupedPrograms[s].push(p);
                  });

                  return sources.filter(s => groupedPrograms[s]).map(source => (
                    <React.Fragment key={source}>
                      <tr className="bg-slate-100/50">
                        <td colSpan={4} className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {source === 'Nagarpalika' ? 'नगरपालिका' : source === 'Wada' ? 'वडा' : source === 'Internal' ? 'आन्तरिक' : source === 'Other' ? 'अन्य' : 'अन्य/नबुझेको'} श्रोत
                        </td>
                      </tr>
                      {groupedPrograms[source].map((item: any) => {
                        const programTransactions = transactions.filter(t => t.programId === item.id);
                        const income = programTransactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
                        const expense = programTransactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
                        const payment = payments.filter(p => p.programId === item.id).reduce((s, p) => s + p.amount, 0);
                        
                        const p1 = item.totalBudget > 0 ? Math.min((income / item.totalBudget) * 100, 100) : 0;
                        const p2 = income > 0 ? Math.min((expense / income) * 100, 100) : 0;
                        const p3 = expense > 0 ? Math.min((payment / expense) * 100, 100) : 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700 font-nepali">{item.name}</td>
                            <td className="px-6 py-4 font-mono text-sm text-right">
                              <div className="text-[10px] text-slate-400">Budget: रू {item.totalBudget.toLocaleString()}</div>
                              <div className="text-[10px] text-emerald-600">Income: रू {income.toLocaleString()}</div>
                              <div className="text-[10px] text-rose-600">Exp: रू {expense.toLocaleString()}</div>
                              <div className="text-[10px] text-blue-600">Pay: रू {payment.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 space-y-2 min-w-[200px]">
                              <div className="flex items-center gap-2">
                                 <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex-1"><div className="h-full bg-slate-500 rounded-full" style={{ width: `${p1}%` }}></div></div>
                                 <span className="text-[10px] w-8 font-black text-slate-500">{p1.toFixed(0)}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex-1"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p2}%` }}></div></div>
                                 <span className="text-[10px] w-8 font-black text-emerald-600">{p2.toFixed(0)}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex-1"><div className="h-full bg-rose-500 rounded-full" style={{ width: `${p3}%` }}></div></div>
                                 <span className="text-[10px] w-8 font-black text-rose-600">{p3.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setEditingItem(item); setFormType('program'); setShowForm(true); }} className="text-slate-300 hover:text-blue-500"><Edit size={16} /></button>
                                <button onClick={() => onDeleteProgram(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ));
                })() : filteredData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <td className="px-6 py-3 whitespace-nowrap">
                            <span className="text-[10px] text-slate-300 block font-mono">{item.id.slice(0, 10)}</span>
                            <span className="text-xs font-bold text-slate-600 font-mono tracking-tight">{item.dateBs}</span>
                        </td>

                        {activeTab === 'payment_requests' && item._type === 'PaymentRequest' && (
                          <>
                             <td className="px-6 py-3 text-xs font-nepali font-bold text-slate-700">
                                {item.programId === 'other' ? item.customProgramName : (programs.find(p => p.id === item.programId)?.name || 'Unknown')}
                             </td>
                             <td className="px-6 py-3 text-xs font-nepali text-slate-600 max-w-[200px] truncate" title={item.remarks}>
                                {item.remarks}
                             </td>
                             <td className="px-6 py-3 text-sm font-black text-slate-900 border-l border-slate-50 text-right">
                                <div className="text-[9px] text-slate-400">माग: रू {(item.amountRequested || 0).toLocaleString()}</div>
                                <div>रू {(item.amountPaid || 0).toLocaleString()}</div>
                             </td>
                             <td className="px-6 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                                  item.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 
                                  item.status === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {item.status === 'Paid' ? 'भुक्तानी' : item.status === 'Partial' ? 'आंशिक' : 'पेश'}
                                </span>
                             </td>
                          </>
                        )}

                        {activeTab === 'allowances' && item._type === 'Allowance' && (
                          <>
                             <td className="px-6 py-3 text-[11px] font-nepali text-slate-700">
                                <div className="font-bold">{item.programId === 'other' ? item.customProgramName : (programs.find(p => p.id === item.programId)?.name || 'Unknown')}</div>
                                <div className="text-slate-500 mt-0.5 italic">{item.employeeName}</div>
                             </td>
                             <td className="px-6 py-3 text-xs font-nepali text-slate-600 max-w-[200px] truncate" title={item.remarks}>
                                {item.remarks || '-'}
                             </td>
                             <td className="px-6 py-3 text-sm font-black text-slate-900 text-right">रू {(item.amount || 0).toLocaleString()}</td>
                             <td className="px-6 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${item.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {item.isPaid ? 'भुक्तानी' : 'बाँकी'}
                                </span>
                             </td>
                          </>
                        )}

                        {activeTab === 'vendors' && (() => {
                          const partyTxns = transactions.filter(t => t.partyId === item.id);
                          return (
                            <>
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-700 font-nepali">{item.name}</div>
                                {partyTxns.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {partyTxns.slice(0, 3).map(t => (
                                      <div key={t.id} className="text-[10px] text-slate-500 italic font-nepali">
                                        - {t.remarks} (रू {t.amount.toLocaleString()})
                                      </div>
                                    ))}
                                    {partyTxns.length > 3 && <div className="text-[9px] text-slate-400 font-bold tracking-widest">+ {partyTxns.length - 3} more...</div>}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-sm">{item.panNumber}</td>
                              <td className="px-6 py-4 font-mono text-sm text-right">रू {item.totalContractAmount.toLocaleString()}</td>
                              <td className="px-6 py-4 font-mono text-sm text-emerald-600 text-right">रू {(item.totalPaidAmount || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 font-black font-mono text-sm text-right text-rose-600 hidden lg:table-cell">रू {(item.totalContractAmount - (item.totalPaidAmount || 0)).toLocaleString()}</td>
                            </>
                          );
                        })()}

                        {activeTab === 'transactions' && <>
                          <td className="px-6 py-4 text-sm text-slate-600 font-nepali">
                            <div className="font-bold">{item.remarks}</div>
                            {item.partyName && <div className="text-[10px] text-rose-600 mt-1 italic">फर्म/पार्टी: {item.partyName}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.type}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-black font-mono text-sm">
                             <div className="text-[10px] text-slate-400">VAT बाहेक: रू {(item.amountWithoutVAT || item.amount || 0).toLocaleString()}</div>
                             <div className="text-emerald-700">
                               VAT सहित: रू {(item.amountWithVAT || item.amount || 0).toLocaleString()}
                               {item.type === 'Expense' && item.tdsAmount > 0 && (
                                 <div className="text-rose-600 text-[10px]">
                                   (TDS: रू {item.tdsAmount.toLocaleString()})
                                 </div>
                               )}
                               {item.type === 'Expense' && item.sasukarAmount > 0 && (
                                 <div className="text-rose-600 text-[10px]">
                                   (सा.सु: रू {item.sasukarAmount.toLocaleString()})
                                 </div>
                               )}
                             </div>
                          </td>
                        </>}

                        {activeTab === 'payments' && (() => {
                           const txn = transactions.find(t => t.id === item.transactionId);
                           return (
                             <>
                               <td className="px-6 py-4 text-sm font-bold text-slate-600 font-nepali">{parties.find(p => p.id === item.partyId)?.name}</td>
                               <td className="px-6 py-4 text-xs font-nepali">
                                 <div className="font-bold text-slate-700">{programs.find(p => p.id === item.programId)?.name}</div>
                                 {txn && <div className="text-slate-400 mt-1 italic">({txn.remarks})</div>}
                               </td>
                               <td className="px-6 py-4 text-right font-black font-mono text-sm">रू {item.amount.toLocaleString()}</td>
                             </>
                           );
                        })()}

                        <td className="px-4 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => {
                                 setEditingItem(item);
                                 if (item._type === 'PaymentRequest') setFormType('nagarpalika_payment');
                                 else if (item._type === 'Allowance') setFormType('allowance');
                                 else if (activeTab === 'vendors') setFormType('party');
                                 else if (activeTab === 'transactions') setFormType('transaction');
                                 else if (activeTab === 'payments') {
                                   setFormType('payment');
                                   setPaymentSelectedProgram(item.programId);
                                   setPaymentSelectedTransaction(item.transactionId || '');
                                   setPaymentApplyTds(!!(item.tdsAmount && item.tdsAmount > 0));
                                   setPaymentApplySasukar(!!(item.sasukarAmount && item.sasukarAmount > 0));
                                 }
                                 
                                 setTxnFormDate(item.dateBs);
                                 setIsOtherProgramSelected(item.programId === 'other');
                                 setShowForm(true);
                               }}
                               className="p-1 text-sky-600 hover:bg-sky-50 rounded transition-colors"
                             >
                                <Edit size={16} />
                             </button>
                             {activeTab === 'payments' && (() => {
                                 const voucher = goswaraVouchers.find(v => v.transactionId === item.transactionId);
                                 return voucher ? (
                                   <button 
                                     onClick={() => handlePrintVoucher(voucher)}
                                     className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                   >
                                      <Printer size={16} />
                                   </button>
                                 ) : null;
                             })()}
                             <button 
                               onClick={() => {
                                 if (confirm('तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
                                   if (item._type === 'PaymentRequest') onDeletePaymentRequest(item.id);
                                   else if (item._type === 'Allowance') onDeleteAllowance(item.id);
                                   else if (activeTab === 'vendors') onDeleteParty(item.id);
                                   else if (activeTab === 'transactions') onDeleteTransaction(item.id);
                                   else if (activeTab === 'payments') onDeletePayment(item.id, item.amount, item.partyId, item.programId);
                                 }
                               }}
                               className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                             >
                                <Trash2 size={16} />
                             </button>
                           </div>
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
            {activeTab !== 'dashboard' && activeTab !== 'reports' && activeTab !== 'payment_requests' && activeTab !== 'allowances' && (
              <button 
                onClick={() => {
                  if (activeTab === 'programs') setFormType('program');
                  else if (activeTab === 'vendors') setFormType('party');
                  else if (activeTab === 'transactions') {
                    setFormType('transaction');
                    setTxnFormDate(today);
                    setTxnRefNo(generateReferenceNo());
                  } else if (activeTab === 'payments') {
                    setFormType('payment');
                    setPaymentSelectedProgram('');
                    setPaymentSelectedTransaction('');
                    setPaymentApplyTds(false);
                    setPaymentApplySasukar(false);
                    setEditingItem(null);
                  }
                  setShowForm(true);
                }}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
              >
                <Plus size={20} /> <span className="font-nepali">नयाँ थप्नुहोस्</span>
              </button>
            )}
            {activeTab === 'vendors' && (
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadPartiesExcel} 
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all text-sm"
                >
                  <Download size={16} /> Excel
                </button>
                <button 
                  onClick={handlePrintParties} 
                  className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all text-sm"
                >
                  <Printer size={16} /> Print
                </button>
                <button 
                  onClick={() => { 
                    setFormType('payment'); 
                    setPaymentSelectedProgram('');
                    setShowForm(true); 
                  }}
                  className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 shadow-lg shadow-slate-100 transition-all active:scale-95 text-sm"
                >
                  <CreditCard size={18} /> <span className="font-nepali">भुक्तानी</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div 
            ref={scrollRef}
            className="flex-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex overflow-x-auto no-scrollbar scroll-smooth"
          >
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
              { id: 'payment_requests', label: 'Payment (भुक्तानी माग)', icon: <ClipboardList size={18} /> },
              { id: 'allowances', label: 'Allowance (भत्ता रेकर्ड)', icon: <Briefcase size={18} /> },
              { id: 'programs', label: 'Programs (बजेट)', icon: <Briefcase size={18} /> },
              { id: 'transactions', label: 'Revenue (आम्दानी/खर्च)', icon: <TrendingUp size={18} /> },
              { id: 'vendors', label: 'Parties (फर्म/भुक्तानी)', icon: <Users size={18} /> },
              { id: 'payments', label: 'Payments (भुक्तानी)', icon: <CreditCard size={18} /> },
              { id: 'journal_voucher', label: 'Journal (गोश्वारा भौचर)', icon: <ClipboardList size={18} /> },
              { id: 'reports', label: 'Reports', icon: <Calendar size={18} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); window.scrollTo(0, 0); }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-100 scale-100' 
                    : 'text-slate-500 hover:bg-slate-50 scale-95 opacity-80 hover:opacity-100 hover:scale-100'
                }`}
              >
                {tab.icon}
                <span className="font-nepali">{tab.label.split(' ')[1] || tab.label}</span>
                <span className="hidden md:inline opacity-60 text-[10px] ml-1 uppercase">{tab.label.split(' ')[0]}</span>
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
                className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-xl font-bold text-slate-800 font-nepali">
                    {editingItem ? 'विवरण सम्पादन गर्नुहोस्' : (
                      <>
                        {formType === 'program' && 'नयाँ कार्यक्रम थप्नुहोस्'}
                        {formType === 'party' && 'नयाँ पार्टी थप्नुहोस् (Add Party/Vendor)'}
                        {formType === 'transaction' && 'आम्दानी/खर्च प्रविष्टि (Add Transaction)'}
                        {formType === 'payment' && 'भुक्तानी गर्नुहोस् (Party Payment)'}
                        {formType === 'nagarpalika_payment' && 'नगरपालिका भुक्तानी माग (Nagarpalika Payment Request)'}
                        {formType === 'allowance' && 'कर्मचारी भत्ता रेकर्ड (Allowance Record)'}
                      </>
                    )}
                  </h2>
                  <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
                </div>

                <form className="p-6 space-y-4 overflow-y-auto" onSubmit={
                  formType === 'program' ? handleProgramSave : 
                  formType === 'party' ? handlePartySave : 
                  formType === 'transaction' ? handleTransactionSave : 
                  formType === 'nagarpalika_payment' ? handleNagarpalikaPaymentRequestSave :
                  formType === 'allowance' ? handleAllowanceSave :
                  handlePaymentSave
                }>
                  {formType === 'program' && (
                    <>
                      <Input label="कार्यक्रमको नाम (Program Name)" name="name" defaultValue={editingItem?.name} required />
                      <Select 
                        label="बजेट श्रोत (Budget Source)" 
                        name="source" 
                        defaultValue={editingItem?.source}
                        options={[
                          {label: 'नगरपालिका (Nagarpalika)', value: 'Nagarpalika'},
                          {label: 'वडा (Wada)', value: 'Wada'},
                          {label: 'आन्तरिक (Internal)', value: 'Internal'},
                          {label: 'अन्य (Other)', value: 'Other'}
                        ]} 
                      />
                      <Input label="कुल बजेट (Total Budget)" name="budget" type="number" defaultValue={editingItem?.totalBudget} required />
                    </>
                  )}

                  {formType === 'party' && (
                    <>
                      <Input label="पार्टी/फर्मको नाम (Firm Name)" name="name" defaultValue={editingItem?.name} required />
                      <Input label="PAN नम्बर" name="panNumber" defaultValue={editingItem?.panNumber} />
                      <Input label="ठेगाना" name="address" defaultValue={editingItem?.address} />
                      <Input label="सम्पर्क नम्बर" name="phone" defaultValue={editingItem?.phone} />
                      <Input label="कुल सम्झौता रकम (Total Contract Amount)" name="contractAmount" type="number" defaultValue={editingItem?.totalContractAmount} />
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
                        <Input label="रकम (Amount)" name="amount" type="number" defaultValue={editingItem?.amount || editingItem?.amountWithVAT} required />
                        <div className="flex items-center gap-2 mt-6">
                            <input type="checkbox" name="isVatBill" id="isVatBill" className="rounded text-rose-600 focus:ring-rose-500" />
                            <label htmlFor="isVatBill" className="text-xs font-black text-slate-700 uppercase tracking-widest">VAT बिल हो? (Is VAT Bill?)</label>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                            <input type="checkbox" name="applyTds" id="applyTds" className="rounded text-rose-600 focus:ring-rose-500" />
                            <label htmlFor="applyTds" className="text-xs font-black text-rose-600 uppercase tracking-widest">१.५% TDS काट्ने? (Deduct 1.5% TDS?)</label>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                            <input type="checkbox" name="applySasukar" id="applySasukar" className="rounded text-rose-600 focus:ring-rose-500" />
                            <label htmlFor="applySasukar" className="text-xs font-black text-slate-700 uppercase tracking-widest">१% सा.सु कर काट्ने? (Deduct 1% SASUKAR?)</label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Select label="प्रकार (Type)" name="type" defaultValue={editingItem?.type} options={[{label: 'आम्दानी (Income)', value: 'Income'}, {label: 'खर्च (Expense)', value: 'Expense'}]} required />
                        <Select label="वर्ग (Category)" name="category" defaultValue={editingItem?.category} options={[
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
                          defaultValue={editingItem?.incomeSource}
                          options={[
                            {label: 'नगरपालिका (Nagarpalika)', value: 'Nagarpalika'},
                            {label: 'वडा (Wada)', value: 'Wada'},
                            {label: 'आन्तरिक (Internal)', value: 'Internal'},
                            {label: 'अन्य (Other)', value: 'Other'}
                          ]} 
                        />
                         <Select 
                          label="खर्च विवरण/कार्यक्रम (Budget/Program)" 
                          name="programId" 
                          defaultValue={editingItem?.programId}
                          options={[...programs].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ label: p.name, value: p.id }))} 
                        />
                      </div>
                      <Input label="फर्म/पार्टीको नाम (Form/Party Name)" name="partyName" defaultValue={editingItem?.partyName} placeholder="खर्च हुने फर्म वा व्यक्तिको नाम" />
                      <Input label="सन्दर्भ नं. (Reference No)" name="referenceNo" defaultValue={txnRefNo} required />
                      <Input label="विवरण (Remarks)" name="remarks" defaultValue={editingItem?.remarks} required />
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
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">पार्टी (Party)</label>
                          <label className="flex items-center gap-2 text-xs font-bold text-primary-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isManualParty} 
                              onChange={(e) => setIsManualParty(e.target.checked)}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Manual Entry?</span>
                          </label>
                        </div>
                        {isManualParty ? (
                          <Input label="पार्टी/व्यक्तिको नाम (Party/Name)" name="manualPartyName" required placeholder="व्यक्तिको नाम लेख्नुहोस्" />
                        ) : (
                          <Select 
                            label="" 
                            name="partyId" 
                            required 
                            defaultValue={editingItem?.partyId}
                            options={[...parties].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ label: `${p.name} (Baki: रू ${p.totalContractAmount - (p.totalPaidAmount || 0)})`, value: p.id }))} 
                          />
                        )}
                      </div>

                      <Select 
                        label="कार्यक्रम (Program)" 
                        name="programId" 
                        required 
                        value={paymentSelectedProgram || editingItem?.programId || ''}
                        onChange={(e) => setPaymentSelectedProgram(e.target.value)}
                        options={[...programs].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ label: p.name, value: p.id }))} 
                      />
                      {(paymentSelectedProgram || editingItem?.programId) && (
                        <Select 
                          label="खर्च विवरण (Expenditure Detail / Bibaran)" 
                          name="transactionId" 
                          required 
                          value={paymentSelectedTransaction || editingItem?.transactionId || ''}
                          onChange={(e) => setPaymentSelectedTransaction(e.target.value)}
                          options={transactions
                            .filter(t => t.programId === (paymentSelectedProgram || editingItem?.programId) && t.type === 'Expense')
                            .map(t => ({ label: `${t.remarks} (रू ${t.amount})`, value: t.id }))
                            .sort((a, b) => a.label.localeCompare(b.label))} 
                          helperText="यो कार्यक्रमको कुन खर्च विवरणको भुक्तानी हो छान्नुहोस् ।"
                        />
                      )}
                      <Input label="भुक्तानी रकम (Payment Amount)" name="amount" type="number" defaultValue={editingItem?.amount} required />
                      
                      <div className="flex gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="applyTds" 
                            checked={paymentApplyTds} 
                            onChange={(e) => setPaymentApplyTds(e.target.checked)}
                            className="rounded border-slate-300 text-primary-600" 
                          />
                          <span className="text-sm font-bold text-slate-700">TDS काट्ने? (1.5%)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="applySasukar" 
                            checked={paymentApplySasukar}
                            onChange={(e) => setPaymentApplySasukar(e.target.checked)}
                            className="rounded border-slate-300 text-primary-600" 
                          />
                          <span className="text-sm font-bold text-slate-700">सा.सु. कर काट्ने? (1%)</span>
                        </label>
                      </div>

                      <Input label="विवरण (Remarks)" name="remarks" defaultValue={editingItem?.remarks} />
                    </>
                  )}

                  {formType === 'nagarpalika_payment' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">मिति (BS)</label>
                        <NepaliDatePicker 
                          value={txnFormDate}
                          onChange={(val) => setTxnFormDate(val)}
                        />
                      </div>
                      <Select 
                        label="कार्यक्रम (Program)" 
                        name="programId" 
                        defaultValue={editingItem?.programId} 
                        required 
                        onChange={(e) => setIsOtherProgramSelected(e.target.value === 'other')}
                        options={[
                          ...programs.map(p => ({ label: p.name, value: p.id })),
                          { label: 'अन्य (Other)', value: 'other' }
                        ]} 
                      />
                      {(isOtherProgramSelected || editingItem?.programId === 'other') && (
                        <Input label="कार्यक्रमको नाम (Custom Program Name)" name="customProgramName" defaultValue={editingItem?.customProgramName} required />
                      )}
                      <Input label="माग गरिएको रकम (Amount Requested)" name="amountRequested" type="number" defaultValue={editingItem?.amountRequested} required />
                      <Input label="भुक्तानी भएको रकम (Amount Paid)" name="amountPaid" type="number" defaultValue={editingItem?.amountPaid} required />
                      <Select label="अवस्था (Status)" name="status" defaultValue={editingItem?.status} options={[
                        {label: 'Submitted (पेश गरिएको)', value: 'Submitted'},
                        {label: 'Partial (आंशिक भुक्तानी)', value: 'Partial'},
                        {label: 'Paid (भुक्तानी भएको)', value: 'Paid'}
                      ]} required />
                      <Input label="विवरण (Remarks)" name="remarks" defaultValue={editingItem?.remarks} />
                    </>
                  )}

                  {formType === 'allowance' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">मिति (BS)</label>
                        <NepaliDatePicker 
                          value={txnFormDate}
                          onChange={(val) => setTxnFormDate(val)}
                        />
                      </div>
                      <Select 
                        label="कार्यक्रम (Program)" 
                        name="programId" 
                        defaultValue={editingItem?.programId} 
                        required 
                        onChange={(e) => setIsOtherProgramSelected(e.target.value === 'other')}
                        options={[
                          ...programs.map(p => ({ label: p.name, value: p.id })),
                          { label: 'अन्य (Other)', value: 'other' }
                        ]} 
                      />
                      {(isOtherProgramSelected || editingItem?.programId === 'other') && (
                        <Input label="कार्यक्रमको नाम (Custom Program Name)" name="customProgramName" defaultValue={editingItem?.customProgramName} required />
                      )}
                      <Input label="कर्मचारीको नाम (Employee Name)" name="employeeName" defaultValue={editingItem?.employeeName} required />
                      <Input label="भत्ता रकम (Allowance Amount)" name="amount" type="number" defaultValue={editingItem?.amount} required />
                      <div className="flex items-center gap-2">
                        <input type="checkbox" name="isPaid" id="isPaid" defaultChecked={editingItem?.isPaid} className="form-checkbox h-5 w-5 text-primary-600 rounded" />
                        <label htmlFor="isPaid" className="text-sm font-bold text-slate-700">भुक्तानी भयो (Paid)</label>
                      </div>
                      <Input label="विवरण (Remarks)" name="remarks" defaultValue={editingItem?.remarks} />
                    </>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors">रद्द गर्नुहोस्</button>
                    <button type="submit" className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all flex items-center justify-center gap-2">
                       <Save size={18} /> {editingItem ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
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
