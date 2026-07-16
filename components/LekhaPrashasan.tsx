import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calculator, Plus, Search, Printer, Trash2, Edit, Save, 
  ArrowUpCircle, ArrowDownCircle, Users, Briefcase, 
  TrendingUp, TrendingDown, LayoutDashboard, ChevronRight,
  Filter, Calendar, ExternalLink, X, DollarSign, CreditCard, Download,
  ClipboardList, Building2, Eye, Book, FileText, CheckSquare
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
import { toNepaliNumber } from './nepaliUtils';
import { db } from '../firebase';
import { ref, onValue, remove } from 'firebase/database';

interface LekhaPrashasanProps {
  programs: FinancialProgram[];
  parties: ListedParty[];
  transactions: FinancialTransaction[];
  payments: PartyPaymentRecord[];
  vouchers: GoswaraVoucher[];
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
  vouchers = [],
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'programs' | 'transactions' | 'vendors' | 'payments' | 'payment_requests' | 'allowances' | 'reports' | 'journal_voucher' | 'bank_cash_book' | 'kharcha_fatbari' | 'bank_reconciliation'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const nepaliMonths = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'
  ];
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'program' | 'party' | 'transaction' | 'payment' | 'nagarpalika_payment' | 'allowance'>('program');
  const [paymentSubTab, setPaymentSubTab] = useState<'history' | 'pending'>('history');
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
  const [txnIsVatBill, setTxnIsVatBill] = useState(false);
  const [txnVatTaxableAmount, setTxnVatTaxableAmount] = useState<number | ''>('');

  const getNepaliMonthName = (dateBs: string) => {
    const parts = dateBs.split(/[-/]/);
    if (parts.length < 2) return dateBs;
    const monthNo = parseInt(parts[1]);
    const months = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'];
    return months[monthNo-1] || dateBs;
  }

  const [isOtherProgramSelected, setIsOtherProgramSelected] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

  const [txnItems, setTxnItems] = useState<{
    remarks: string, 
    amount: number, 
    programId?: string, 
    partyName?: string,
    isVatBill?: boolean,
    vatTaxableAmount?: number,
    applyTds?: boolean,
    applySasukar?: boolean,
    applyTax15?: boolean,
    needsBharpai?: boolean,
    bharpaiUnitType?: 'days' | 'qty',
    bharpaiDays?: number,
    bharpaiRate?: number,
    bharpaiPersons?: { name: string; days: number; rate: number }[]
  }[]>([{remarks: '', amount: 0, isVatBill: false, vatTaxableAmount: 0, applyTds: false, applySasukar: false, applyTax15: false, needsBharpai: false, bharpaiUnitType: 'days', bharpaiDays: 0, bharpaiRate: 0, bharpaiPersons: []}]);
  const [txnPaymentMethod, setTxnPaymentMethod] = useState<'Bank' | 'Cash'>('Cash');
  const [txnCheckNo, setTxnCheckNo] = useState<string>('');
  const [txnType, setTxnType] = useState<'Income' | 'Expense'>('Expense');
  const [editNeedsBharpai, setEditNeedsBharpai] = useState<boolean>(false);
  const [editBharpaiUnitType, setEditBharpaiUnitType] = useState<'days' | 'qty'>('days');
  const [editBharpaiPersons, setEditBharpaiPersons] = useState<{ name: string; days: number; rate: number }[]>([]);
  const [editTxnAmount, setEditTxnAmount] = useState<number | ''>('');
  const [editBharpaiDays, setEditBharpaiDays] = useState<number | ''>('');
  const [editBharpaiRate, setEditBharpaiRate] = useState<number | ''>('');

  const [unclearedIds, setUnclearedIds] = useState<string[]>([]);
  const [bankStatementBalance, setBankStatementBalance] = useState<number>(0);

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

  useEffect(() => {
    if (editNeedsBharpai) {
      if (editBharpaiPersons && editBharpaiPersons.length > 0) {
        const total = editBharpaiPersons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
        setEditTxnAmount(total || '');
      } else {
        const total = Number(editBharpaiDays || 0) * Number(editBharpaiRate || 0);
        setEditTxnAmount(total || '');
      }
    }
  }, [editNeedsBharpai, editBharpaiDays, editBharpaiRate, editBharpaiPersons]);

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
    const type = formData.get('type') as any;
    const category = formData.get('category') as any;
    const incomeSource = formData.get('incomeSource') as any;
    const referenceNo = (formData.get('referenceNo') as string) || txnRefNo;
    const isVatBill = txnIsVatBill;

    // If type is Expense, use txnItems
    if (type === 'Expense' && !editingItem) {
      if (txnItems.length > 1) {
        // Multi-item transaction
        const aggregatedItems: any[] = [];
        let totalAmount = 0;
        let totalAmountWithVAT = 0;
        let totalAmountWithoutVAT = 0;
        let totalVatTaxableAmount = 0;
        let totalTdsAmount = 0;
        let totalSasukarAmount = 0;
        let totalTax15Amount = 0;
        let isVatBill = false;

        txnItems.forEach(item => {
          if (item.amount <= 0) return;

          const amount = Number(item.amount);
          const itemIsVatBill = !!item.isVatBill;
          if (itemIsVatBill) isVatBill = true;
          
          const vatTaxableAmount = itemIsVatBill ? (item.vatTaxableAmount || amount / 1.13) : 0;
          const vatAmount = itemIsVatBill ? vatTaxableAmount * 0.13 : 0;
          const amountWithoutVAT = amount - vatAmount;
          const amountWithVAT = amount;
          
          const tdsAmount = item.applyTds ? (itemIsVatBill ? vatTaxableAmount * 0.015 : amount * 0.015) : 0;
          const sasukarAmount = item.applySasukar ? amountWithoutVAT * 0.01 : 0;
          const tax15Amount = item.applyTax15 ? amountWithoutVAT * 0.15 : 0;

          totalAmount += amount;
          totalAmountWithVAT += amountWithVAT;
          totalAmountWithoutVAT += amountWithoutVAT;
          totalVatTaxableAmount += vatTaxableAmount;
          totalTdsAmount += tdsAmount;
          totalSasukarAmount += sasukarAmount;
          totalTax15Amount += tax15Amount;

          aggregatedItems.push({
            remarks: item.remarks,
            amount,
            amountWithVAT,
            amountWithoutVAT,
            vatTaxableAmount,
            isVatBill: itemIsVatBill,
            tdsAmount,
            sasukarAmount,
            tax15Amount,
            partyName: item.partyName || (formData.get('partyName') as string) || undefined,
            programId: item.programId || (formData.get('programId') as string) || undefined,
          });
        });

        if (aggregatedItems.length === 0) return;

        onSaveTransaction({
          dateBs: txnFormDate,
          dateAd: new NepaliDate(txnFormDate).toJsDate().toISOString(),
          category,
          type,
          isVatBill,
          vatTaxableAmount: totalVatTaxableAmount,
          amountWithoutVAT: totalAmountWithoutVAT,
          amountWithVAT: totalAmountWithVAT,
          tdsAmount: totalTdsAmount,
          sasukarAmount: totalSasukarAmount,
          tax15Amount: totalTax15Amount,
          amount: totalAmount,
          remarks: aggregatedItems[0].remarks + (aggregatedItems.length > 1 ? ` र अन्य ${aggregatedItems.length - 1} खर्चहरू` : ''),
          partyName: formData.get('partyName') as string || undefined,
          fiscalYear: currentFiscalYear,
          referenceNo,
          programId: aggregatedItems[0].programId,
          paymentMethod: txnPaymentMethod,
          checkNo: (txnPaymentMethod === 'Bank' && type !== 'Income') ? txnCheckNo : undefined,
          items: aggregatedItems
        });
      } else {
        // Single item
        txnItems.forEach(item => {
          if (item.amount <= 0) return;

          const amount = Number(item.amount);
          const isVatBill = !!item.isVatBill;
          const vatTaxableAmount = isVatBill ? (item.vatTaxableAmount || amount / 1.13) : 0;
          const vatAmount = isVatBill ? vatTaxableAmount * 0.13 : 0;
          const amountWithoutVAT = amount - vatAmount;
          const amountWithVAT = amount;
          
          const tdsAmount = item.applyTds ? (isVatBill ? vatTaxableAmount * 0.015 : amount * 0.015) : 0;
          const sasukarAmount = item.applySasukar ? amountWithoutVAT * 0.01 : 0;
          const tax15Amount = item.applyTax15 ? amountWithoutVAT * 0.15 : 0;

          onSaveTransaction({
            dateBs: txnFormDate,
            dateAd: new NepaliDate(txnFormDate).toJsDate().toISOString(),
            category,
            type,
            isVatBill,
            vatTaxableAmount,
            amountWithoutVAT,
            amountWithVAT,
            tdsAmount,
            sasukarAmount,
            tax15Amount,
            amount,
            remarks: item.remarks,
            partyName: item.partyName || (formData.get('partyName') as string) || undefined,
            fiscalYear: currentFiscalYear,
            referenceNo,
            programId: item.programId || (formData.get('programId') as string) || undefined,
            paymentMethod: txnPaymentMethod,
            checkNo: (txnPaymentMethod === 'Bank' && type !== 'Income') ? txnCheckNo : undefined,
            needsBharpai: item.needsBharpai,
            bharpaiUnitType: item.bharpaiUnitType || 'days',
            bharpaiDays: item.bharpaiDays,
            bharpaiRate: item.bharpaiRate,
            bharpaiPersons: item.needsBharpai ? (item.bharpaiPersons && item.bharpaiPersons.length > 0 ? item.bharpaiPersons : [{ name: item.partyName || item.remarks || '', days: item.bharpaiDays || 1, rate: item.bharpaiRate || item.amount || 0 }]) : undefined
          });
        });
      }
    } else {
      // Single transaction (Income or Edit)
      const amount = editTxnAmount !== '' ? Number(editTxnAmount) : Number(formData.get('amount') || 0);
      const vatTaxableAmount = isVatBill ? Number(txnVatTaxableAmount || 0) : 0;
      const vatAmount = isVatBill ? vatTaxableAmount * 0.13 : 0;
      const amountWithoutVAT = amount - vatAmount;
      const amountWithVAT = amount;
      
      const applyTds = formData.get('applyTds') === 'on';
      const tdsAmount = applyTds ? (isVatBill ? vatTaxableAmount * 0.015 : amount * 0.015) : 0;
      const applySasukar = formData.get('applySasukar') === 'on';
      const sasukarAmount = applySasukar ? amountWithoutVAT * 0.01 : 0;
      const applyTax15 = formData.get('applyTax15') === 'on';
      const tax15Amount = applyTax15 ? amountWithoutVAT * 0.15 : 0;

      onSaveTransaction({
        ...editingItem,
        dateBs: txnFormDate,
        dateAd: new NepaliDate(txnFormDate).toJsDate().toISOString(),
        category,
        type,
        isVatBill,
        vatTaxableAmount,
        amountWithoutVAT,
        amountWithVAT,
        tdsAmount,
        sasukarAmount,
        tax15Amount,
        amount,
        remarks: formData.get('remarks') as string,
        partyName: formData.get('partyName') as string || undefined,
        fiscalYear: editingItem?.fiscalYear || currentFiscalYear,
        referenceNo,
        incomeSource: incomeSource || undefined,
        programId: formData.get('programId') as string || undefined,
        paymentMethod: txnPaymentMethod,
        checkNo: (txnPaymentMethod === 'Bank' && type !== 'Income') ? txnCheckNo : undefined,
        needsBharpai: editNeedsBharpai,
        bharpaiUnitType: editBharpaiUnitType || 'days',
        bharpaiDays: Number(editBharpaiDays || 0),
        bharpaiRate: Number(editBharpaiRate || 0),
        bharpaiPersons: editNeedsBharpai ? (editBharpaiPersons && editBharpaiPersons.length > 0 ? editBharpaiPersons : [{ name: (formData.get('partyName') as string) || (formData.get('remarks') as string) || '', days: Number(editBharpaiDays || 1), rate: Number(editBharpaiRate || amount || 0) }]) : undefined
      });
    }

    setShowForm(false);
    setEditingItem(null);
    setTxnType('Expense');
    setTxnPaymentMethod('Cash');
    setTxnItems([{remarks: '', amount: 0, isVatBill: false, applyTds: false, applySasukar: false, applyTax15: false}]);
    setTxnCheckNo('');
    setEditTxnAmount('');
    setEditBharpaiDays('');
    setEditBharpaiRate('');
    setEditNeedsBharpai(false);
    setEditBharpaiUnitType('days');
    setEditBharpaiPersons([]);
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

    const paymentData: any = {
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
    };

    if (editingItem?.id) {
       paymentData.id = editingItem.id;
    }

    onSavePayment(paymentData);

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
           @page { size: A4 ${printOrientation}; margin: 10mm; } 
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
    const nepaliNumbers = ["", "एक", "दुई", "तीन", "चार", "पाँच", "छ", "सात", "आठ", "नौ", "दश", "एघार", "बाह्र", "तेह्र", "चौध", "पन्ध्र", "सोह्र", "सत्र", "अठार", "उन्नाइस", "बीस", "एक्काईस", "बाइस", "तेइस", "चौबीस", "पच्चीस", "छब्बिस", "सत्ताइस", "अठ्ठाइस", "उनन्तिस", "तीस", "एक्तीस", "बत्तीस", "तेतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड्तीस", "उनन्चालीस", "चालीस", "एकचालीस", "बयालीस", "त्रिचालीस", "चौवालीस", "पैंतालीस", "छयालीस", "सतालीस", "अठचालीस", "उनन्पचास", "पचास", "एकाउन्न", "बाउन्न", "त्रिपन्न", "चौरन्न", "पचपन्न", "छपन्न", "सन्ताउन्न", "अन्ठाउन्न", "उनन्साठी", "साठी", "एकसट्ठी", "बैसट्ठी", "त्रिसट्ठी", "चौसट्ठी", "पैंसट्ठी", "छैसट्ठी", "सतसट्ठी", "अठसट्ठी", "उनन्सत्तरी", "सत्तरी", "एकहत्तर", "बहत्तर", "त्रिसहत्तर", "चौहत्तर", "पचहत्तर", "छयहत्तर", "सतहत्तर", "अठहत्तर", "उनान्सी", "असी", "एकासी", "बयासी", "त्रियासी", "चौरासी", "पचासी", "छयासी", "सतासी", "अठासी", "उनान्नब्बे", "नब्बे", "एकानब्बे", "ब्यानब्बे", "त्रियानब्बे", "चौरानब्बे", "पन्चानब्बे", "छयानब्बे", "सन्तानब्बे", "अन्ठानब्बे", "उनान्सय"];
    
    if (num === 0) return 'शून्य';
    
    // Handle paisa separately
    const mainPart = Math.floor(num);
    const paisaPart = Math.round((num - mainPart) * 100);

    function convert(n: number) {
      n = Math.floor(n);
      let word = '';
      if (n >= 100) {
        word += nepaliNumbers[Math.floor(n / 100)] + ' सय ';
        n %= 100;
      }
      if (n > 0) word += nepaliNumbers[Math.floor(n)] + ' ';
      return word;
    }
    
    let result = '';
    let tempNum = mainPart;
    const crore = Math.floor(tempNum / 10000000);
    tempNum %= 10000000;
    const lakh = Math.floor(tempNum / 100000);
    tempNum %= 100000;
    const thousand = Math.floor(tempNum / 1000);
    tempNum %= 1000;
    
    if (crore > 0) result += convert(crore) + 'करोड ';
    if (lakh > 0) result += convert(lakh) + 'लाख ';
    if (thousand > 0) result += convert(thousand) + 'हजार ';
    if (tempNum > 0) result += convert(tempNum);
    
    if (paisaPart > 0) {
      result = result.trim() + ' र ' + nepaliNumbers[paisaPart] + ' पैसा';
    }
    
    return result.trim();
  };

  const pendingPayments = useMemo(() => {
    if (activeTab !== 'payments' || paymentSubTab !== 'pending') return [];
    
    return transactions.filter(t => t.type === 'Expense').map(txn => {
      const totalPaidForTxn = payments
        .filter(p => p.transactionId === txn.id)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const balance = (txn.amountWithVAT || txn.amount || 0) - totalPaidForTxn;
      
      return {
        ...txn,
        totalPaid: totalPaidForTxn,
        balance: balance
      };
    }).filter(p => p.balance > 0);
  }, [activeTab, paymentSubTab, transactions, payments]);

  const handlePrintPendingPayments = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const netTotal = pendingPayments.reduce((sum, p) => sum + p.balance, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>भुक्तानी हुन बाँकी विवरण</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap');
            @page { size: ${printOrientation}; margin: 10mm; }
            body { font-family: 'Noto Sans Devanagari', sans-serif; padding: 40px; color: #334155; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            h1 { margin: 0; color: #1e293b; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #f8fafc; font-weight: bold; }
            .text-right { text-align: right; }
            .footer { margin-top: 30px; font-weight: bold; text-align: right; font-size: 16px; }
            .print-date { font-size: 12px; color: #64748b; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>भुक्तानी हुन बाँकी विवरण (Pending Payments Report)</h1>
            <div class="print-date">प्रिन्ट मिति: ${today} (${currentFiscalYear})</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>मिति</th>
                <th>पार्टीको नाम</th>
                <th>कार्यक्रम / विवरण</th>
                <th class="text-right">कुल रकम</th>
                <th class="text-right">भुक्तानी भएको</th>
                <th class="text-right">बाँकी रकम</th>
              </tr>
            </thead>
            <tbody>
              ${pendingPayments.map(p => `
                <tr>
                  <td>${p.dateBs}</td>
                  <td>${p.partyName || '-'}</td>
                  <td>${p.remarks}</td>
                  <td class="text-right">रू ${(p.amountWithVAT || p.amount || 0).toLocaleString()}</td>
                  <td class="text-right">रू ${p.totalPaid.toLocaleString()}</td>
                  <td class="text-right"><b>रू ${p.balance.toLocaleString()}</b></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="text-right"><b>कुल बाँकी रकम:</b></td>
                <td class="text-right"><b>रू ${netTotal.toLocaleString()}</b></td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top: 100px; display: flex; justify-content: space-between;">
             <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px;">तयार गर्ने</div>
             <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px;">सदर गर्ने</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintPaymentHistory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const items = payments.filter(p => 
      p.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manualPartyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parties.find(pa => pa.id === p.partyId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPaid = items.reduce((sum, p) => sum + p.amount, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>भुक्तानी इतिहास</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap');
            @page { size: ${printOrientation}; margin: 10mm; }
            body { font-family: 'Noto Sans Devanagari', sans-serif; padding: 40px; color: #334155; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            h1 { margin: 0; color: #1e293b; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #f8fafc; font-weight: bold; }
            .text-right { text-align: right; }
            .footer { margin-top: 30px; font-weight: bold; text-align: right; font-size: 16px; }
            .print-date { font-size: 12px; color: #64748b; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>भुक्तानी इतिहास विवरण (Payment History Report)</h1>
            <div class="print-date">प्रिन्ट मिति: ${today} (${currentFiscalYear})</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>मिति</th>
                <th>पार्टी / फर्म</th>
                <th>कार्यक्रम</th>
                <th>विवरण</th>
                <th class="text-right">रकम</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(p => {
                const txn = transactions.find(t => t.id === p.transactionId);
                const prog = programs.find(pr => pr.id === p.programId);
                const partyName = p.partyId === 'manual' ? p.manualPartyName : (parties.find(pa => pa.id === p.partyId)?.name || 'Unknown');
                return `
                  <tr>
                    <td>${p.dateBs}</td>
                    <td>${partyName}</td>
                    <td>${prog?.name || '-'}</td>
                    <td>${txn?.remarks || p.remarks || '-'}</td>
                    <td class="text-right">रू ${p.amount.toLocaleString()}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="text-right"><b>जम्मा भुक्तानी रकम:</b></td>
                <td class="text-right"><b>रू ${totalPaid.toLocaleString()}</b></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintBankCashBook = (items: any[]) => {
    const printWin = window.open('', '', 'width=1200,height=800');
    if (!printWin) return;

    const title = "बैंक नगदी किताब (Bank Cash Book)";

    const content = `
    <html>
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 5mm; }
          body { font-family: 'Mukta', sans-serif; font-size: 10px; padding: 10px; }
          .print-header { display: flex; align-items: flex-start; margin-bottom: 15px; position: relative; }
          .logo-side { width: 80px; flex-shrink: 0; }
          .header-content { flex-grow: 1; text-align: center; margin-right: 80px; }
          .h1 { font-size: 20px; font-weight: 800; margin: 0; line-height: 1.2; }
          .h2 { font-size: 16px; font-weight: 700; margin: 0; line-height: 1.2; }
          .h3 { font-size: 14px; font-weight: 600; margin: 0; line-height: 1.2; }
          .h4 { font-size: 12px; font-weight: 500; margin: 0; line-height: 1.2; }
          .address { font-size: 11px; margin-top: 2px; }
          .report-title { font-size: 16px; font-weight: 800; margin-top: 10px; text-decoration: underline; }
          .report-meta { font-size: 10px; margin-top: 5px; }
          .form-num { position: absolute; right: 10px; top: 0px; font-weight: bold; font-size: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid black; padding: 4px; text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; font-family: monospace; }
          .font-bold { font-weight: bold; }
          .subheader { display: flex; justify-content: space-between; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="form-num">साविकको फारम न. ९</div>
        <div class="print-header">
          <div class="logo-side">
            <img src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" style="width: 80px;">
          </div>
          <div class="header-content">
            <div class="h1">${generalSettings.orgNameNepali}</div>
            <div class="h2">${generalSettings.subTitleNepali || ''}</div>
            <div class="h3">${generalSettings.subTitleNepali2 || ''}</div>
            <div class="h4">${generalSettings.subTitleNepali3 || ''}</div>
            <div class="address">${generalSettings.address || ''}</div>
            <h2 class="report-title">${title}</h2>
            <div class="report-meta">${selectedMonth !== 'All' ? `महिना: ${selectedMonth}` : 'आर्थिक वर्ष भरिको विवरण'}</div>
          </div>
        </div>
        
        <div class="subheader">
          <div>बजेट उप-शीर्षक न: ................</div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2">मिति</th>
              <th rowspan="2">भौचर नं.</th>
              <th rowspan="2" style="width: 250px;">विवरण</th>
              <th colspan="2">नगद मौज्दात</th>
              <th colspan="3">बैंक मौज्दात</th>
              <th rowspan="2">बाँकी</th>
              <th colspan="2">बजेट खर्च</th>
              <th colspan="2">विविध</th>
              <th rowspan="2">कैफियत</th>
            </tr>
            <tr>
              <th>डेबिट</th>
              <th>क्रेडिट</th>
              <th>डेबिट</th>
              <th>क्रेडिट</th>
              <th>चेक नं.</th>
              <th>संकेत</th>
              <th>रकम</th>
              <th>डेबिट</th>
              <th>क्रेडिट</th>
            </tr>
            <tr style="background: #f0f0f0; font-size: 8px;">
              <td>१</td><td>२</td><td>३</td><td>४</td><td>५</td><td>६</td><td>७</td><td>८</td><td>९</td><td>१०</td><td>११</td><td>१६</td><td>१७</td><td>१८</td>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.dateBs}</td>
                <td>${item.id.slice(-6)}</td>
                <td class="text-left">${item.remarks}</td>
                <td class="text-right">${item.debitCash > 0 ? item.debitCash.toLocaleString() : ''}</td>
                <td class="text-right">${item.creditCash > 0 ? item.creditCash.toLocaleString() : ''}</td>
                <td class="text-right">${item.debitBank > 0 ? item.debitBank.toLocaleString() : ''}</td>
                <td class="text-right">${item.creditBank > 0 ? item.creditBank.toLocaleString() : ''}</td>
                <td>${item.checkNo || ''}</td>
                <td class="text-right font-bold">${item.runningBalance.toLocaleString()}</td>
                <td>${programs.find(p => p.id === item.programId)?.id || ''}</td>
                <td class="text-right">${item.budgetExp > 0 ? item.budgetExp.toLocaleString() : ''}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>`;

    printWin.document.write(content);
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  };
  const handlePrintKharchaFatbari = (data: any[], month: string) => {
    const printWin = window.open('', '', 'width=1200,height=800');
    if (!printWin) return;

    const title = "खर्चको फाँटबारी (Expenditure Statement)";

    const content = `
    <html>
      <head>
        <title>खर्चको फाँटबारी - ${month}</title>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 5mm; }
          body { font-family: 'Mukta', sans-serif; font-size: 10px; padding: 10px; }
          .print-header { display: flex; align-items: flex-start; margin-bottom: 15px; position: relative; }
          .logo-side { width: 80px; flex-shrink: 0; }
          .header-content { flex-grow: 1; text-align: center; margin-right: 80px; }
          .h1 { font-size: 20px; font-weight: 800; margin: 0; line-height: 1.2; }
          .h2 { font-size: 16px; font-weight: 700; margin: 0; line-height: 1.2; }
          .h3 { font-size: 14px; font-weight: 600; margin: 0; line-height: 1.2; }
          .h4 { font-size: 12px; font-weight: 500; margin: 0; line-height: 1.2; }
          .address { font-size: 11px; margin-top: 2px; }
          .report-title { font-size: 16px; font-weight: 800; margin-top: 10px; text-decoration: underline; }
          .report-meta { font-size: 10px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid black; padding: 4px; text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; font-family: monospace; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="logo-side">
            <img src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" style="width: 80px;">
          </div>
          <div class="header-content">
            <div class="h1">${generalSettings.orgNameNepali}</div>
            <div class="h2">${generalSettings.subTitleNepali || ''}</div>
            <div class="h3">${generalSettings.subTitleNepali2 || ''}</div>
            <div class="h4">${generalSettings.subTitleNepali3 || ''}</div>
            <div class="address">${generalSettings.address || ''}</div>
            <h2 class="report-title">${title}</h2>
            <div class="report-meta">${month === 'All' ? 'आर्थिक वर्ष भरिको विवरण' : `महिना: ${month}`}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>सि.नं.</th>
              <th style="width: 80px;">खर्च संकेत नं</th>
              <th style="width: 250px;">खर्च संकेतको नाम</th>
              <th>अन्तिम बजेट</th>
              <th>यस महिना सम्मको निकासा</th>
              <th>गत महिना सम्मको खर्च</th>
              <th>यस महिनाको खर्च</th>
              <th>यस महिना सम्मको खर्च</th>
              <th>पेश्की</th>
              <th>पेश्की बाहेक खर्च</th>
              <th>बाँकी बजेट</th>
            </tr>
            <tr style="background: #f0f0f0; font-size: 8px;">
              <td>१</td><td>२</td><td>३</td><td>४</td><td>५</td><td>६</td><td>७</td><td>८=(६+७)</td><td>९</td><td>१०=(८-९)</td><td>११=(४-८)</td>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.id}</td>
                <td class="text-left">${item.name}</td>
                <td class="text-right">${item.budget.toLocaleString()}</td>
                <td class="text-right">${item.release.toLocaleString()}</td>
                <td class="text-right">${item.prevExp.toLocaleString()}</td>
                <td class="text-right">${item.thisMonthExp.toLocaleString()}</td>
                <td class="text-right font-bold">${item.totalExp.toLocaleString()}</td>
                <td class="text-right">${item.peski.toLocaleString()}</td>
                <td class="text-right">${item.netExp.toLocaleString()}</td>
                <td class="text-right">${item.balance.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>`;

    printWin.document.write(content);
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  };

  const renderKharchaFatbari = () => {
    const monthIndex = selectedMonth === 'All' ? -1 : nepaliMonths.indexOf(selectedMonth);
    
    const fatbariData = programs.map(program => {
      const allProgramPayments = payments.filter(p => p.programId === program.id);
      
      let prevMonthExp = 0;
      let thisMonthExp = 0;
      let totalExp = 0;

      allProgramPayments.forEach(p => {
        const parts = p.dateBs.split(/[-/]/);
        if (parts.length < 2) return;
        const pMonthNum = parseInt(parts[1]);
        const pMonthIdx = pMonthNum - 1;

        if (selectedMonth === 'All') {
          thisMonthExp += p.amount;
        } else {
          if (pMonthIdx < monthIndex) {
            prevMonthExp += p.amount;
          } else if (pMonthIdx === monthIndex) {
            thisMonthExp += p.amount;
          }
        }
      });

      totalExp = prevMonthExp + thisMonthExp;
      
      // Release is usually equal to budget in many simple setups, but let's assume we can fetch it from transactions if needed.
      // For now, let's treat budget as final budget and release as budget.
      const budget = program.budget || 0;
      const release = budget; // Simplified
      const peski = 0; // Simplified
      const netExp = totalExp - peski;
      const balance = budget - totalExp;

      return {
        ...program,
        budget,
        release,
        prevExp: prevMonthExp,
        thisMonthExp,
        totalExp,
        peski,
        netExp,
        balance
      };
    }).filter(item => item.totalExp > 0 || item.budget > 0);

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 font-nepali flex items-center gap-2">
                <FileText className="text-primary-600" size={20} /> खर्चको फाँटबारी (Expenditure Statement)
              </h3>
              <p className="text-xs text-slate-500 font-nepali">बजेट उप-शीर्षक अनुसारको खर्च विवरण</p>
            </div>
            <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold font-nepali outline-none"
              >
                <option value="All">सबै महिना (All Months)</option>
                {nepaliMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <button 
            onClick={() => handlePrintKharchaFatbari(fatbariData, selectedMonth)}
            className="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-sky-700 transition-all text-sm"
          >
            <Printer size={18} /> प्रिन्ट गर्नुहोस् (Print)
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="divide-x divide-slate-200">
                  <th className="px-2 py-3 text-center font-bold text-slate-500 uppercase font-nepali">सि.नं.</th>
                  <th className="px-2 py-3 text-center font-bold text-slate-500 uppercase font-nepali">खर्च संकेत नं</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase font-nepali w-[250px]">खर्च संकेतको नाम</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-600 uppercase font-nepali">अन्तिम बजेट</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-600 uppercase font-nepali bg-blue-50/30">निकासा</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-400 uppercase font-nepali">गत महिना सम्म</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-500 uppercase font-nepali bg-yellow-50/30">यस महिना</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-800 uppercase font-nepali bg-slate-100">कुल खर्च</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-500 uppercase font-nepali">पेश्की</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-600 uppercase font-nepali">खुद खर्च</th>
                  <th className="px-2 py-3 text-right font-bold text-slate-800 uppercase font-nepali">बाँकी बजेट</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fatbariData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-50">
                    <td className="px-2 py-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-3 text-center font-mono font-bold text-slate-600">{item.id}</td>
                    <td className="px-4 py-3 font-nepali font-bold text-slate-700">{item.name}</td>
                    <td className="px-2 py-3 text-right font-mono font-bold">{item.budget.toLocaleString()}</td>
                    <td className="px-2 py-3 text-right font-mono text-blue-600 bg-blue-50/10">{item.release.toLocaleString()}</td>
                    <td className="px-2 py-3 text-right font-mono text-slate-400">{item.prevExp.toLocaleString()}</td>
                    <td className="px-2 py-3 text-right font-mono text-yellow-600 bg-yellow-50/10 font-bold">{item.thisMonthExp.toLocaleString()}</td>
                    <td className="px-2 py-3 text-right font-black font-mono bg-slate-50 text-slate-800">{item.totalExp.toLocaleString()}</td>
                    <td className="px-2 py-3 text-right font-mono text-slate-400">{item.peski.toLocaleString()}</td>
                    <td className="px-2 py-3 text-right font-mono text-slate-600">{item.netExp.toLocaleString()}</td>
                    <td className={`px-2 py-3 text-right font-black font-mono ${item.balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{item.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-[11px] font-mono">
                <tr className="divide-x divide-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-right font-nepali">जम्मा (Total Amount)</td>
                  <td className="px-2 py-3 text-right">{fatbariData.reduce((sum, i) => sum + i.budget, 0).toLocaleString()}</td>
                  <td className="px-2 py-3 text-right">{fatbariData.reduce((sum, i) => sum + i.release, 0).toLocaleString()}</td>
                  <td className="px-2 py-3 text-right">{fatbariData.reduce((sum, i) => sum + i.prevExp, 0).toLocaleString()}</td>
                  <td className="px-2 py-3 text-right">{fatbariData.reduce((sum, i) => sum + i.thisMonthExp, 0).toLocaleString()}</td>
                  <td className="px-2 py-3 text-right">{fatbariData.reduce((sum, i) => sum + i.totalExp, 0).toLocaleString()}</td>
                  <td className="px-2 py-3 text-right">0</td>
                  <td className="px-2 py-3 text-right">{fatbariData.reduce((sum, i) => sum + i.netExp, 0).toLocaleString()}</td>
                  <td className="px-2 py-3 text-right">{fatbariData.reduce((sum, i) => sum + i.balance, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
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
             @page { size: A4 ${printOrientation}; margin: 10mm; } 
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
            </div>
            <div class="header-center org-info">
               <h2>${generalSettings.orgNameNepali}</h2>
               <h1>${generalSettings.subTitleNepali || ''}</h1>
               <p>${generalSettings.subTitleNepali2 || ''}</p>
               <p>${generalSettings.subTitleNepali3 || ''}</p>
               <p>कार्यालय कोड नं.: <span class="dots">${toNepaliNumber(generalSettings.officeCode || '......................')}</span></p>
            </div>
            <div class="header-side" style="display: flex; flex-direction: column; align-items: flex-end;">
               <div class="form-number">
                 म.ले.प.फारम नं: ${toNepaliNumber('२०३')}<br>
                 साबिकको फारम नं: ${toNepaliNumber('१०')}
               </div>
               <div class="qr-code" style="margin-top: 10px;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`Voucher ID: ${voucher.id}\nDate: ${voucher.dateBs}\nAmount: ${toNepaliNumber(voucher.totalAmount)}\nOrg: ${generalSettings.orgNameNepali}\nEntries: ${voucher.entries.map(e => `\n- Activity: ${e.activityName || 'N/A'}, Account: ${e.accountName}, Amount: ${toNepaliNumber(e.debit || e.credit || '0')}`).join('')}`)}" style="width: 100%; height: 100%;">
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
               मिति : <span class="dots" style="min-width: 150px;">${toNepaliNumber(voucher.dateBs)}</span>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-item" style="flex: 2;">
               बजेट उप शीर्षक नं : <span class="dots" style="min-width: 150px;"></span>
            </div>
            <div class="meta-item">
               मुल गो.भौ.न. : <span class="dots" style="min-width: 150px;">${toNepaliNumber(voucher.id)}</span>
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
                    <td class="text-center">${toNepaliNumber(idx + 1)}</td>
                    <td></td>
                    <td style="font-size: 11px;">${toNepaliNumber(e.activityName || '')}</td>
                    <td>
                       ${(e.accountName.includes('Expense Account') || e.accountName === 'खर्च') && voucher.remarks 
                         ? (e.debit ? 'डे. ब.ख. ' : (e.credit ? 'क्रे. ' : '')) + voucher.remarks 
                         : (e.debit ? 'डे. ब.ख. ' : (e.credit ? 'क्रे. ' : '')) + e.accountName}
                    </td>
                    <td></td>
                    <td style="padding: 0;">
                       <div style="display: flex; height: 100%;">
                          <div style="flex: 1; border-right: 1px solid black;"></div>
                          <div style="flex: 1.5; border-right: 1px solid black;"></div>
                          <div style="flex: 1; border-right: 1px solid black;"></div>
                          <div style="flex: 1.5; font-size: 10px; text-align: center;">
                            ${voucher.paymentMethod === 'Bank' ? `बैंक${voucher.checkNo ? `<br>(${voucher.checkNo})` : ''}` : 'नगद'}
                          </div>
                       </div>
                    </td>
                    <td class="text-right">${toNepaliNumber(e.debit ? e.debit.toLocaleString() : '')}</td>
                    <td class="text-right">${toNepaliNumber(e.credit ? e.credit.toLocaleString() : '')}</td>
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
              ${voucher.entries.length < 3 ? Array(3 - voucher.entries.length).fill('').map(() => `
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
                    <td class="text-right">रू ${toNepaliNumber(voucher.totalAmount)}</td>
                    <td class="text-right">रू ${toNepaliNumber(voucher.totalAmount)}</td>
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

  const handlePrintBharpai = (txn: FinancialTransaction) => {
    const printWin = window.open('', '', 'width=1000,height=800');
    if (!printWin) return;

    const unitLabel = txn.bharpaiUnitType === 'qty' ? 'संख्या' : 'दिन';
    const program = programs.find(p => p.id === txn.programId);
    
    // Determine the list of persons
    const persons = txn.bharpaiPersons && txn.bharpaiPersons.length > 0
      ? txn.bharpaiPersons
      : [{
          name: txn.partyName || txn.remarks || '....................',
          days: txn.bharpaiDays || 1,
          rate: txn.bharpaiRate || txn.amount || 0
        }];

    // Calculate total base amount from persons
    const txnTotalAmount = persons.reduce((sum, p) => sum + (p.days * p.rate), 0) || (txn.amountWithVAT || txn.amount || 0);

    let rowsHtml = '';
    let grandTotal = 0;
    let grandTotalTax = 0;
    let grandNetAmount = 0;

    persons.forEach((person, idx) => {
      const personTotal = person.days * person.rate;
      const ratio = txnTotalAmount > 0 ? (personTotal / txnTotalAmount) : (1 / persons.length);

      // Proportional taxes
      const personTds = (txn.tdsAmount && txn.tdsAmount > 0) ? Math.round((txn.tdsAmount || 0) * ratio) : 0;
      const personSasukar = (txn.sasukarAmount && txn.sasukarAmount > 0) ? Math.round((txn.sasukarAmount || 0) * ratio) : 0;
      const personTax15 = (txn.tax15Amount && txn.tax15Amount > 0) ? Math.round((txn.tax15Amount || 0) * ratio) : 0;
      const personTax = personTds + personSasukar + personTax15;
      const personNet = personTotal - personTax;

      grandTotal += personTotal;
      grandTotalTax += personTax;
      grandNetAmount += personNet;

      // Construct tax breakdown text
      const taxParts: string[] = [];
      if (personTds > 0) taxParts.push(`TDS (१.५%): ${toNepaliNumber(personTds.toLocaleString())}`);
      if (personSasukar > 0) taxParts.push(`सा.सु. कर (१%): ${toNepaliNumber(personSasukar.toLocaleString())}`);
      if (personTax15 > 0) taxParts.push(`कर (१५%): ${toNepaliNumber(personTax15.toLocaleString())}`);
      
      const taxBreakdown = taxParts.length > 0 
        ? `${toNepaliNumber(personTax.toLocaleString())}<br><span style="font-size: 11px; color: #475569;">(${taxParts.join(', ')})</span>`
        : 'रू ०';

      rowsHtml += `
        <tr>
          <td>${toNepaliNumber(idx + 1)}</td>
          <td class="text-left font-bold">${person.name || '....................'}</td>
          <td>${toNepaliNumber(person.days || '१')}</td>
          <td>${toNepaliNumber((person.rate || 0).toLocaleString())}</td>
          <td>${toNepaliNumber(personTotal.toLocaleString())}</td>
          <td>${taxBreakdown}</td>
          <td class="font-bold">${toNepaliNumber(personNet.toLocaleString())}</td>
          <td></td>
        </tr>
      `;
    });

    const content = `
      <html>
        <head>
          <title>भर्पाई - ${txn.remarks}</title>
          <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 ${printOrientation}; margin: 15mm; }
            body { font-family: 'Mukta', sans-serif; margin: 0; padding: 10px; font-size: 15px; color: #1e293b; }
            .print-header { display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 20px; border-bottom: 2px solid #ef4444; padding-bottom: 15px; }
            .logo-img { width: 85px; height: auto; position: absolute; left: 0; top: 0; }
            .header-info { text-align: center; width: 100%; padding-left: 95px; padding-right: 95px; }
            .header-info h1 { color: #e11d48; margin: 0; font-size: 22px; font-weight: 800; line-height: 1.2; }
            .header-info h2 { margin: 3px 0 0 0; font-size: 15px; font-weight: 600; color: #475569; }
            .header-info h3 { margin: 2px 0 0 0; font-size: 13px; font-weight: 500; color: #475569; }
            .header-info h4 { margin: 2px 0 0 0; font-size: 13px; font-weight: 500; color: #64748b; }
            .bharpai-title { text-align: center; margin: 20px 0 15px 0; }
            .bharpai-title h2 { margin: 0; font-size: 20px; font-weight: 800; border-bottom: 2px double #334155; display: inline-block; padding-bottom: 4px; }
            .bharpai-meta { font-size: 15px; margin-bottom: 12px; display: flex; justify-content: space-between; font-weight: 600; background: #f8fafc; padding: 8px 12px; rounded: 8px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #475569; padding: 8px; text-align: center; }
            th { background: #f1f5f9; font-weight: 700; font-size: 14px; }
            td { font-size: 14px; }
            .footer-signatures { margin-top: 60px; display: flex; justify-content: space-between; font-weight: 700; padding: 0 10px; }
            .sig-box { text-align: center; border-top: 1px dashed #475569; width: 180px; padding-top: 5px; }
            .text-left { text-align: left; }
            .font-bold { font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <img class="logo-img" src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" referrerPolicy="no-referrer">
            <div class="header-info">
              <h1>${generalSettings.orgNameNepali}</h1>
              <h2>${generalSettings.subTitleNepali || ''}</h2>
              <h3>${generalSettings.subTitleNepali2 || ''}</h3>
              <h4>${generalSettings.subTitleNepali3 || ''}</h4>
              <div style="font-size: 13px; font-weight: bold; color: #64748b; margin-top: 2px;">${generalSettings.address || ''}</div>
            </div>
          </div>

          <div class="bharpai-title">
            <h2>भर्पाई (Receipt)</h2>
          </div>

          <div class="bharpai-meta">
            <div>खर्च विवरण (शीर्षक): ${txn.remarks}</div>
            <div>मिति : ${toNepaliNumber(txn.dateBs)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">क्र.स.</th>
                <th>नाम थर</th>
                <th style="width: 80px;">${unitLabel}</th>
                <th style="width: 100px;">दर</th>
                <th style="width: 120px;">जम्मा</th>
                <th style="width: 200px;">करकट्टी विवरण</th>
                <th style="width: 150px;">बुझिलिएको खुद रकम</th>
                <th style="width: 150px;">हस्ताक्षर</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="font-bold" style="background-color: #f1f5f9;">
                <td colspan="4">जम्मा (Grand Total)</td>
                <td>${toNepaliNumber(grandTotal.toLocaleString())}</td>
                <td>${toNepaliNumber(grandTotalTax.toLocaleString())}</td>
                <td style="color: #e11d48;">${toNepaliNumber(grandNetAmount.toLocaleString())}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 30px; font-size: 13px; color: #64748b; line-height: 1.5; background: #fafafa; padding: 10px; border-radius: 6px; border: 1px solid #f0f0f0;">
            <strong>कैफियत:</strong> ${txn.remarks || 'N/A'}
          </div>

          <div class="footer-signatures">
            <div class="sig-box">पेश गर्ने</div>
            <div class="sig-box">जाँच गर्ने</div>
            <div class="sig-box">स्वीकृत गर्ने</div>
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
      setTxnType(item.type || 'Expense');
      setTxnPaymentMethod(item.paymentMethod || 'Cash');
      setTxnCheckNo(item.checkNo || '');
      setEditTxnAmount(item.amount || '');
      setEditBharpaiDays(item.bharpaiDays || '');
      setEditBharpaiRate(item.bharpaiRate || '');
      setEditNeedsBharpai(!!item.needsBharpai);
      setEditBharpaiUnitType(item.bharpaiUnitType || 'days');
      setEditBharpaiPersons(item.bharpaiPersons || []);
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

    const previousRecords = allRecords.filter(t => {
      // 1. Transactions from strictly previous fiscal years
      if (t.fiscalYear < reportFilter.fiscalYear) return true;
      
      // 2. Transactions within the current fiscal year, but before the selected date/month
      if (t.fiscalYear === reportFilter.fiscalYear) {
          if (reportFilter.type === 'Daily') return t.dateBs < reportFilter.date;
          if (reportFilter.type === 'Monthly') return t.dateBs.substring(0, 7) < reportFilter.month;
      }
      return false; // For Annual report, opening balance is 0 or handled differently
    });

    const openingBalance = previousRecords.reduce((s, t) => 
      s + (t.type === 'Income' ? (t.amountWithVAT || t.amount || 0) : -((t.amountWithVAT || t.amount || 0) - (t.tdsAmount || 0) - (t.sasukarAmount || 0))), 
    0);

    const reportIncome = reportData.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amountWithVAT || t.amount || 0), 0);
    const reportExpense = reportData.filter(t => t.type === 'Expense').reduce((s, t) => s + ((t.amountWithVAT || t.amount || 0) - (t.tdsAmount || 0) - (t.sasukarAmount || 0)), 0);
    const closingBalance = openingBalance + reportIncome - reportExpense;

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
             @page { size: A4 ${printOrientation}; margin: 10mm; } 
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
                const parts = t.dateBs.split(/[-/]/);
                const displayDate = reportFilter.type === 'Monthly' ? (parts[2] || t.dateBs) : t.dateBs;
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
          {reportFilter.type === 'Monthly' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Month</label>
              <select 
                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" 
                value={reportFilter.month.split('-')[1] || '01'} 
                onChange={e => {
                    const year = reportFilter.month.split('-')[0] || new Date().getFullYear().toString();
                    setReportFilter({...reportFilter, month: `${year}-${e.target.value.padStart(2, '0')}`})
                }}
              >
                {['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'].map((m, i) => (
                  <option key={i+1} value={(i+1).toString().padStart(2, '0')}>{m}</option>
                ))}
              </select>
            </div>
          )}
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
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
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


  const renderBankCashBook = () => {
    const incomeItems = transactions.filter(t => t.type === 'Income');
    const paymentItems = payments;

    const mergedItems = [
      ...incomeItems.map(t => ({
        id: t.id,
        dateBs: t.dateBs,
        remarks: t.remarks,
        debitBank: t.incomeSource === 'Nagarpalika' ? 0 : (t.amount || 0),
        debitCash: t.incomeSource === 'Nagarpalika' ? (t.amount || 0) : 0,
        creditBank: 0,
        creditCash: 0,
        budgetExp: 0,
        checkNo: t.referenceNo || '',
        programId: t.programId
      })),
      ...paymentItems.map(p => {
        const txn = transactions.find(t => t.id === p.transactionId);
        return {
          id: p.id,
          dateBs: p.dateBs,
          remarks: p.remarks || txn?.remarks || '',
          debitBank: 0,
          debitCash: 0,
          creditBank: p.paymentMethod === 'Bank' ? p.amount : 0,
          creditCash: p.paymentMethod === 'Cash' ? p.amount : 0,
          budgetExp: p.amount,
          checkNo: '',
          programId: p.programId
        };
      })
    ].sort((a, b) => a.dateBs.localeCompare(b.dateBs));

    const monthFilteredItems = mergedItems.filter(item => {
      if (selectedMonth === 'All') return true;
      const parts = item.dateBs.split(/[-/]/);
      if (parts.length < 2) return false;
      const monthNum = parseInt(parts[1]);
      // In BS, 01 is Baishakh, 02 is Jestha, etc.
      return nepaliMonths[monthNum - 1] === selectedMonth;
    });

    const searchFilteredItems = monthFilteredItems.filter(item => 
      item.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    let runningBalance = 0;
    const itemsWithBalance = searchFilteredItems.map(item => {
      const debit = (item.debitBank || 0) + (item.debitCash || 0);
      const credit = (item.creditBank || 0) + (item.creditCash || 0);
      runningBalance += (debit - credit);
      return { ...item, runningBalance };
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
           <div className="flex items-center gap-4">
             <div>
                <h3 className="text-lg font-black text-slate-800 font-nepali flex items-center gap-2">
                  <Book className="text-primary-600" size={20} /> बैंक नगदी किताब (Bank Cash Book)
                </h3>
                <p className="text-xs text-slate-500 font-nepali">आय-व्यय तथा भुक्तानीको एकिकृत विवरण</p>
             </div>
             <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
             <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold font-nepali focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                >
                  <option value="All">सबै महिना (All Months)</option>
                  {nepaliMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
             </div>
           </div>
           
           <button 
             onClick={() => {
               // We pass a title with the month to the print helper if needed
               handlePrintBankCashBook(itemsWithBalance);
             }}
             className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-700 transition-all text-sm shadow-lg shadow-primary-100"
           >
             <Printer size={18} /> प्रिन्ट गर्नुहोस् (Print)
           </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse min-w-[1200px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="divide-x divide-slate-200">
                  <th rowSpan={2} className="px-2 py-4 text-center font-bold text-slate-500 uppercase font-nepali">मिति</th>
                  <th rowSpan={2} className="px-2 py-4 text-center font-bold text-slate-500 uppercase font-nepali">भौचर नं.</th>
                  <th rowSpan={2} className="px-4 py-4 text-left font-bold text-slate-500 uppercase font-nepali min-w-[200px]">विवरण</th>
                  <th colSpan={2} className="px-2 py-2 text-center font-bold text-slate-600 uppercase font-nepali border-b bg-emerald-50/50">नगद मौज्दात</th>
                  <th colSpan={3} className="px-2 py-2 text-center font-bold text-slate-600 uppercase font-nepali border-b bg-sky-50/50">बैंक मौज्दात</th>
                  <th rowSpan={2} className="px-2 py-4 text-center font-bold text-slate-800 uppercase font-nepali bg-slate-100">बाँकी</th>
                  <th colSpan={2} className="px-2 py-2 text-center font-bold text-rose-600 uppercase font-nepali border-b bg-rose-50/30">बजेट खर्च</th>
                  <th colSpan={2} className="px-2 py-2 text-center font-bold text-slate-500 uppercase font-nepali border-b">विविध</th>
                  <th rowSpan={2} className="px-2 py-4 text-center font-bold text-slate-500 uppercase font-nepali">कैफियत</th>
                </tr>
                <tr className="divide-x divide-slate-200">
                  <th className="px-1 py-2 text-center font-bold text-emerald-700 bg-emerald-50/30">डेबिट</th>
                  <th className="px-1 py-2 text-center font-bold text-emerald-700 bg-emerald-50/30">क्रेडिट</th>
                  <th className="px-1 py-2 text-center font-bold text-sky-700 bg-sky-50/30">डेबिट</th>
                  <th className="px-1 py-2 text-center font-bold text-sky-700 bg-sky-50/30">क्रेडिट</th>
                  <th className="px-1 py-2 text-center font-bold text-sky-700 bg-sky-50/30 text-[8px]">चेक नं.</th>
                  
                  <th className="px-1 py-2 text-center font-bold text-rose-700 bg-rose-50/20 text-[8px]">संकेत</th>
                  <th className="px-1 py-2 text-center font-bold text-rose-700 bg-rose-50/20">रकम</th>
                  
                  <th className="px-1 py-2 text-center font-bold text-slate-500">डेबिट</th>
                  <th className="px-1 py-2 text-center font-bold text-slate-500">क्रेडिट</th>
                </tr>
                <tr className="divide-x divide-slate-100 bg-slate-100/50 text-[8px] text-center italic text-slate-400">
                  <td className="py-1">१</td><td>२</td><td>३</td><td>४</td><td>५</td><td>६</td><td>७</td><td>८</td><td>९</td><td>१०</td><td>११</td><td>१६</td><td>१७</td><td>१८</td>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsWithBalance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-50">
                    <td className="px-2 py-3 text-center font-mono font-bold text-slate-600">{item.dateBs}</td>
                    <td className="px-2 py-3 text-center font-mono text-[9px] text-slate-400">{item.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 font-nepali font-medium text-slate-700">{item.remarks}</td>
                    <td className="px-2 py-3 text-right font-mono text-emerald-600">{item.debitCash > 0 ? item.debitCash.toLocaleString() : '-'}</td>
                    <td className="px-2 py-3 text-right font-mono text-emerald-600">{item.creditCash > 0 ? item.creditCash.toLocaleString() : '-'}</td>
                    <td className="px-2 py-3 text-right font-mono text-sky-600">{item.debitBank > 0 ? item.debitBank.toLocaleString() : '-'}</td>
                    <td className="px-2 py-3 text-right font-mono text-sky-600">{item.creditBank > 0 ? item.creditBank.toLocaleString() : '-'}</td>
                    <td className="px-1 py-3 text-center font-mono text-[9px] text-slate-400">{item.checkNo || '-'}</td>
                    <td className="px-2 py-3 text-right font-black font-mono bg-slate-50 text-slate-800">{item.runningBalance.toLocaleString()}</td>
                    <td className="px-1 py-3 text-center font-mono text-[9px] text-rose-400">{programs.find(p => p.id === item.programId)?.id.slice(0,4) || '-'}</td>
                    <td className="px-2 py-3 text-right font-bold font-mono text-rose-600">{item.budgetExp > 0 ? item.budgetExp.toLocaleString() : '-'}</td>
                    <td className="px-2 py-3 text-right font-mono text-slate-300">-</td>
                    <td className="px-2 py-3 text-right font-mono text-slate-300">-</td>
                    <td className="px-2 py-3 text-center text-slate-300 text-[10px]">-</td>
                  </tr>
                ))}
                {itemsWithBalance.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center text-slate-400 font-nepali">कुनै विवरण फेला परेन।</td>
                  </tr>
                )}
              </tbody>
              {itemsWithBalance.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-black font-mono">
                   <tr className="divide-x divide-slate-200">
                      <td colSpan={3} className="px-4 py-4 text-left font-nepali">यो महिनाको जम्मा (Total)</td>
                      <td className="px-2 py-4 text-right text-emerald-700">{itemsWithBalance.reduce((sum, i) => sum + (i.debitCash || 0), 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-right text-emerald-700">{itemsWithBalance.reduce((sum, i) => sum + (i.creditCash || 0), 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-right text-sky-700">{itemsWithBalance.reduce((sum, i) => sum + (i.debitBank || 0), 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-right text-sky-700">{itemsWithBalance.reduce((sum, i) => sum + (i.creditBank || 0), 0).toLocaleString()}</td>
                      <td></td>
                      <td className="px-2 py-4 text-right bg-slate-100">{runningBalance.toLocaleString()}</td>
                      <td></td>
                      <td className="px-2 py-4 text-right text-rose-700">{itemsWithBalance.reduce((sum, i) => sum + (i.budgetExp || 0), 0).toLocaleString()}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                   </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    );
  };

  const toggleUncleared = (id: string) => {
    setUnclearedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrintBankReconciliation = (bookBalance: number, addItems: any[], lessItems: any[], bankBalance: number) => {
    const printWin = window.open('', '', 'width=1000,height=800');
    if (!printWin) return;

    const totalAdd = addItems.reduce((sum, i) => sum + i.amount, 0);
    const totalLess = lessItems.reduce((sum, i) => sum + i.amount, 0);
    const adjusted = bookBalance + totalAdd - totalLess;
    const diff = adjusted - bankBalance;
    const title = "बैंक हिसाब मिलान विवरण (Bank Reconciliation Statement)";

    const content = `
    <html>
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Mukta', sans-serif; font-size: 11px; padding: 10px; color: #333; }
          .print-header { display: flex; align-items: flex-start; margin-bottom: 15px; position: relative; }
          .logo-side { width: 70px; flex-shrink: 0; }
          .header-content { flex-grow: 1; text-align: center; margin-right: 70px; }
          .h1 { font-size: 18px; font-weight: 800; margin: 0; line-height: 1.2; }
          .h2 { font-size: 14px; font-weight: 700; margin: 0; line-height: 1.2; }
          .h3 { font-size: 13px; font-weight: 600; margin: 0; line-height: 1.2; }
          .h4 { font-size: 11px; font-weight: 500; margin: 0; line-height: 1.2; }
          .address { font-size: 10px; margin-top: 2px; }
          .report-title { font-size: 15px; font-weight: 800; margin-top: 10px; text-decoration: underline; }
          .report-meta { font-size: 10px; margin-top: 5px; }
          
          .form-meta { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 9px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid black; padding: 6px; text-align: left; }
          th { background: #f9fafb; text-align: center; font-size: 10px; }
          .text-right { text-align: right; font-family: monospace; }
          .font-bold { font-weight: bold; }
          .section-label { font-weight: 800; padding: 10px 0 5px 0; border-bottom: 1px solid #eee; margin-top: 15px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .sign-box { text-align: center; width: 200px; border-top: 1px solid black; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="form-meta">
           <div></div>
           <div style="text-align: right;">म.ले.प. फारम न: २१२<br>साविकको फारम न: १५</div>
        </div>
        <div class="print-header">
          <div class="logo-side">
            <img src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" style="width: 70px;">
          </div>
          <div class="header-content">
            <div class="h1">${generalSettings.orgNameNepali}</div>
            <div class="h2">${generalSettings.subTitleNepali || ''}</div>
            <div class="h3">${generalSettings.subTitleNepali2 || ''}</div>
            <div class="h4">${generalSettings.subTitleNepali3 || ''}</div>
            <div class="address">${generalSettings.address || ''}</div>
            <h2 class="report-title">${title}</h2>
            <div class="report-meta">मिति: ${new NepaliDate().format('YYYY/MM/DD')} (महिना: ${selectedMonth})</div>
          </div>
        </div>

        <div class="summary-row font-bold" style="background: #f3f4f6;">
           <span>क. श्रेस्ता अनुसारको मौज्दात रू:</span>
           <span class="text-right">${bookBalance.toLocaleString()}</span>
        </div>

        <div class="section-label">ख. जोड्ने (श्रेस्तामा भुक्तानी जनाइएको तर बैंकबाट भुक्तानी हुन बाँकी)</div>
        <table>
           <thead>
              <tr>
                 <th style="width: 40px;">क्र.सं.</th>
                 <th style="width: 80px;">मिति</th>
                 <th>चेक नं./भौचर नं.</th>
                 <th>विवरण</th>
                 <th style="width: 120px;">रकम</th>
              </tr>
           </thead>
           <tbody>
              ${addItems.map((item, idx) => `
                <tr>
                   <td style="text-align: center;">${idx + 1}</td>
                   <td>${item.dateBs}</td>
                   <td>${item.id.slice(-6).toUpperCase()}</td>
                   <td>${item.remarks}</td>
                   <td class="text-right">${item.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
              ${addItems.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #999;">-</td></tr>' : ''}
              <tr class="font-bold">
                 <td colspan="4" style="text-align: right;">जम्मा</td>
                 <td class="text-right">${totalAdd.toLocaleString()}</td>
              </tr>
           </tbody>
        </table>

        <div class="section-label">ग. घटाउने (श्रेस्तामा आम्दानी जनाई बैंक जम्मा गर्न पठाइएको तर जम्मा हुन बाँकी)</div>
        <table>
           <thead>
              <tr>
                 <th style="width: 40px;">क्र.सं.</th>
                 <th style="width: 80px;">मिति</th>
                 <th>चेक नं./भौचर नं.</th>
                 <th>विवरण</th>
                 <th style="width: 120px;">रकम</th>
              </tr>
           </thead>
           <tbody>
              ${lessItems.map((item, idx) => `
                <tr>
                   <td style="text-align: center;">${idx + 1}</td>
                   <td>${item.dateBs}</td>
                   <td>${item.id.slice(-6).toUpperCase()}</td>
                   <td>${item.remarks}</td>
                   <td class="text-right">${item.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
              ${lessItems.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #999;">-</td></tr>' : ''}
              <tr class="font-bold">
                 <td colspan="4" style="text-align: right;">जम्मा</td>
                 <td class="text-right">${totalLess.toLocaleString()}</td>
              </tr>
           </tbody>
        </table>

        <div class="summary-row font-bold" style="margin-top: 20px; border-top: 2px solid black;">
           <span>घ. कायम हुने बैंकको मौज्दात (क+ख-ग) रू:</span>
           <span class="text-right">${adjusted.toLocaleString()}</span>
        </div>

        <div class="summary-row">
           <span>ङ. बैंक स्टेटमेन्ट अनुसारको मौज्दात रकम रू:</span>
           <span class="text-right">${bankBalance.toLocaleString()}</span>
        </div>

        <div class="summary-row font-bold">
           <span>च. फरक रकम रू (घ-ङ):</span>
           <span class="text-right">${diff.toLocaleString()}</span>
        </div>

        <div style="margin-top: 20px; font-style: italic;">
           (फरक रकमको पुष्ट्याई): ..........................................................................................................
        </div>

        <div class="signatures">
           <div class="sign-box">
              पेस गर्नेको हस्ताक्षर<br><br>
              नाम: ....................<br>
              दर्जा: ....................<br>
              मिति: ....................
           </div>
           <div class="sign-box">
              स्वीकृत गर्नेको हस्ताक्षर<br><br>
              नाम: ....................<br>
              दर्जा: ....................<br>
              मिति: ....................
           </div>
        </div>
      </body>
    </html>`;

    printWin.document.write(content);
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  };

  const renderBankReconciliation = () => {
    const incomeItems = transactions.filter(t => t.type === 'Income');
    const paymentItems = payments;
    
    // Process all historical items to get a true book balance at any point in time
    const allItemsParsed = [
      ...incomeItems.map(t => ({ ...t, reconciledType: 'Income', parsedDate: new Date(t.dateBs.replace(/\//g, '-')) })),
      ...paymentItems.map(p => ({ ...p, reconciledType: 'Payment', parsedDate: new Date(p.dateBs.replace(/\//g, '-')) }))
    ].sort((a, b) => a.dateBs.localeCompare(b.dateBs));

    // Determine target month index
    const monthIndex = selectedMonth === 'All' ? 11 : nepaliMonths.indexOf(selectedMonth);

    // Calculate Book Balance up to the end of selected month
    let currentBookBalance = 0;
    allItemsParsed.forEach(item => {
      const parts = item.dateBs.split(/[-/]/);
      if (parts.length < 2) return;
      const mNum = parseInt(parts[1]);
      const mIdx = mNum - 1;

      if (selectedMonth === 'All' || mIdx <= monthIndex) {
        if ((item as any).reconciledType === 'Income') {
          currentBookBalance += (item as any).amount || 0;
        } else {
          currentBookBalance -= (item as any).amount || 0;
        }
      }
    });

    // Items specifically from the selected month for selection
    const monthItems = allItemsParsed.filter(item => {
      if (selectedMonth === 'All') return true;
      const parts = item.dateBs.split(/[-/]/);
      if (parts.length < 2) return false;
      const mNum = parseInt(parts[1]);
      return nepaliMonths[mNum - 1] === selectedMonth;
    });

    const addItems = allItemsParsed.filter(item => (item as any).reconciledType === 'Payment' && unclearedIds.includes(item.id));
    const lessItems = allItemsParsed.filter(item => (item as any).reconciledType === 'Income' && unclearedIds.includes(item.id));

    const totalAdd = addItems.reduce((sum, i) => sum + (i as any).amount, 0);
    const totalLess = lessItems.reduce((sum, i) => sum + (i as any).amount, 0);
    const adjustedBalance = currentBookBalance + totalAdd - totalLess;
    const difference = adjustedBalance - bankStatementBalance;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
              <h2 className="text-xl font-black text-slate-800 font-nepali flex items-center gap-2">
                <CheckSquare className="text-indigo-600" size={24} /> बैंक हिसाब मिलान विवरण (Reconciliation)
              </h2>
              <p className="text-sm text-slate-500 font-nepali">श्रेस्ता र बैंक स्टेटमेन्ट बीचको हिसाब मिलान विवरण</p>
           </div>
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <Calendar size={16} className="text-slate-400 ml-2" />
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold font-nepali outline-none min-w-[120px]"
                >
                  <option value="All">सबै महिना</option>
                  {nepaliMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button 
                onClick={() => handlePrintBankReconciliation(currentBookBalance, addItems, lessItems, bankStatementBalance)}
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
              >
                <Printer size={18} /> प्रिन्ट विवरण
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">गणना सारांश (Summary)</h3>
                 
                 <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-nepali text-slate-600 text-sm">(क) श्रेस्ता अनुसारको मौज्दात:</span>
                    <span className="font-black font-mono text-slate-800">रू {currentBookBalance.toLocaleString()}</span>
                 </div>

                 <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <span className="font-nepali text-emerald-700 font-bold text-sm">(ख) जोड्ने (Add Items):</span>
                    <span className="font-black font-mono text-emerald-700">रू {totalAdd.toLocaleString()}</span>
                 </div>

                 <div className="flex justify-between items-center p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                    <span className="font-nepali text-rose-700 font-bold text-sm">(ग) घटाउने (Less Items):</span>
                    <span className="font-black font-mono text-rose-700">रू {totalLess.toLocaleString()}</span>
                 </div>

                 <div className="flex justify-between items-center p-4 bg-primary-50 rounded-xl border-2 border-primary-100">
                    <span className="font-nepali text-primary-800 font-black">(घ) कायम हुने बैंक मौज्दात:</span>
                    <span className="font-black font-mono text-primary-800 text-lg">रू {adjustedBalance.toLocaleString()}</span>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center">
                       <span className="font-nepali text-slate-700 font-bold text-sm">(ङ) बैंक मौज्दात (Statement):</span>
                       <div className="relative">
                         <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">रू</span>
                         <input 
                           type="number"
                           value={bankStatementBalance}
                           onChange={(e) => setBankStatementBalance(Number(e.target.value))}
                           className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1.5 pl-6 font-mono text-right font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
                         />
                       </div>
                    </div>
                 </div>

                 <div className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all ${difference === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                    <span className="font-nepali font-bold">(च) फरक रकम (घ-ङ):</span>
                    <span className={`font-black font-mono text-lg ${difference === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      रू {difference.toLocaleString()}
                    </span>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <div>
                    <h3 className="font-black text-slate-700 font-nepali text-sm uppercase tracking-wider">कारोवार छनौट (Select Uncleared Items)</h3>
                    <p className="text-[10px] text-slate-400 font-nepali">बैंक स्टेटमेन्टमा नदेखिएका आइटमहरू यहाँ छनौट गर्नुहोस्</p>
                 </div>
                 <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500">
                    Selected: {unclearedIds.length}
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                 <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                       <tr className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-wider divide-x divide-slate-100">
                          <th className="p-3 text-center w-12">Select</th>
                          <th className="p-3">मिति</th>
                          <th className="p-3">विवरण (Remarks)</th>
                          <th className="p-3 text-right">रकम</th>
                          <th className="p-3 text-center">प्रकार</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {monthItems.map(item => (
                          <tr 
                            key={item.id} 
                            onClick={() => toggleUncleared(item.id)}
                            className={`cursor-pointer transition-all duration-200 divide-x divide-slate-50 ${unclearedIds.includes(item.id) ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
                          >
                             <td className="p-3 text-center">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${unclearedIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-300 bg-white'}`}>
                                   {unclearedIds.includes(item.id) && <X size={12} className="text-white rotate-45" />}
                                </div>
                             </td>
                             <td className="p-3 font-mono text-slate-500 text-[10px]">{item.dateBs}</td>
                             <td className="p-3 font-nepali font-medium text-slate-700">{item.remarks}</td>
                             <td className="p-3 text-right font-black font-mono text-slate-800">रू {item.amount?.toLocaleString()}</td>
                             <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${(item as any).reconciledType === 'Payment' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                  {(item as any).reconciledType === 'Payment' ? 'OUT' : 'IN'}
                                </span>
                             </td>
                          </tr>
                       ))}
                       {monthItems.length === 0 && (
                          <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-nepali italic">यस महिनाको कुनै कारोवार फेला परेन।</td></tr>
                       )}
                    </tbody>
                 </table>
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
             {vouchers.map(v => (
               <tr key={v.id} className="border-b">
                  <td className="px-6 py-4 font-nepali">{toNepaliNumber(v.dateBs)}</td>
                  <td className="px-6 py-4 font-mono text-xs font-nepali">{toNepaliNumber(v.id)}</td>
                  <td className="px-6 py-4 text-xs">
                    <span className={`px-2 py-1 rounded-full ${v.id.includes('PAY') || v.entries.some(e => e.debit && !e.accountName.includes('Bank/Cash')) ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {v.id.includes('PAY') || v.entries.some(e => e.debit && !e.accountName.includes('Bank/Cash')) ? 'खर्च' : 'प्राप्ती'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-nepali">{toNepaliNumber(v.remarks || '-')}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-700 font-nepali">रू {toNepaliNumber(v.totalAmount.toLocaleString())}</td>
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
    if (activeTab === 'bank_cash_book') return renderBankCashBook();
    if (activeTab === 'bank_reconciliation') return renderBankReconciliation();
    if (activeTab === 'kharcha_fatbari') return renderKharchaFatbari();

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
                  {activeTab === 'payments' && paymentSubTab === 'pending' && <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">विवरण (Particulars)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">फर्म / पार्टी</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali text-right">बाँकी रकम</th>
                  </>}
                  {activeTab === 'payments' && paymentSubTab === 'history' && <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">पार्टी</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase font-nepali">कार्यक्रम</th>
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
                {activeTab === 'payments' && paymentSubTab === 'pending' ? pendingPayments.map((item: any) => (
                   <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-[10px] text-slate-300 block font-mono">{item.id.slice(0, 10)}</span>
                          <span className="text-xs font-bold text-slate-600 font-mono tracking-tight">{item.dateBs}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600 font-nepali">{item.remarks}</td>
                      <td className="px-6 py-4 text-xs font-nepali">
                         {item.partyName || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-black font-mono text-sm text-rose-600">रू {item.balance.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => {
                               setFormType('payment');
                               setPaymentSelectedProgram(item.programId);
                               setPaymentSelectedTransaction(item.id);
                               setEditingItem(null);
                               setTxnFormDate(today);
                               setShowForm(true);
                             }}
                             className="bg-primary-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-primary-700 transition-all shadow-sm"
                           >
                             भुक्तानी (Pay)
                           </button>
                         </div>
                      </td>
                   </tr>
                )) : activeTab === 'programs' ? (() => {
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
                                <div className="text-emerald-700">रू {(item.amountPaid || 0).toLocaleString()}</div>
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
                            {item.paymentMethod && (
                              <div className="mt-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                {item.paymentMethod === 'Bank' ? '🏦 Bank' : '💵 Cash'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-black font-mono text-sm">
                             {item.isVatBill && (
                               <div className="text-[10px] text-rose-600 font-bold font-nepali mb-1 bg-rose-50 rounded px-1.5 py-0.5 inline-block">भ्याट बिल (VAT Bill)</div>
                             )}
                             {item.isVatBill && item.vatTaxableAmount > 0 && (
                               <>
                                 <div className="text-[10px] text-slate-500">भ्याट लाग्ने: रू {item.vatTaxableAmount.toLocaleString()}</div>
                                 <div className="text-[10px] text-slate-500">भ्याट (१३%): रू {Math.round(item.vatTaxableAmount * 0.13).toLocaleString()}</div>
                               </>
                             )}
                             <div className="text-[10px] text-slate-400">VAT बाहेक: रू {Math.round(item.amountWithoutVAT || item.amount || 0).toLocaleString()}</div>
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

                        {activeTab === 'payments' && paymentSubTab === 'history' && (() => {
                           const txn = transactions.find(t => t.id === item.transactionId);
                           return (
                             <>
                               <td className="px-6 py-4 text-sm font-bold text-slate-600 font-nepali">{item.partyId === 'manual' ? item.manualPartyName : (parties.find(p => p.id === item.partyId)?.name || 'Unknown')}</td>
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
                                 else if (activeTab === 'transactions') {
                                   setFormType('transaction');
                                   setTxnType(item.type || 'Expense');
                                   setTxnPaymentMethod(item.paymentMethod || 'Cash');
                                   setTxnCheckNo(item.checkNo || '');
                                   setTxnIsVatBill(!!item.isVatBill);
                                   setTxnVatTaxableAmount(item.vatTaxableAmount !== undefined && item.vatTaxableAmount !== null ? item.vatTaxableAmount : '');
                                   setEditNeedsBharpai(!!item.needsBharpai);
                                   setEditBharpaiUnitType(item.bharpaiUnitType || 'days');
                                   setEditBharpaiPersons(item.bharpaiPersons || []);
                                   setEditTxnAmount(item.amount || '');
                                   setEditBharpaiDays(item.bharpaiDays || '');
                                   setEditBharpaiRate(item.bharpaiRate || '');
                                 }
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
                             {(activeTab === 'payments' || activeTab === 'transactions') && (() => {
                                 const searchId = activeTab === 'payments' ? (item.transactionId || item.id) : item.id;
                                 const voucher = vouchers.find(v => 
                                   v.transactionId === searchId || v.id === searchId || v.id === `JV-${searchId}`
                                 );
                                 return voucher ? (
                                   <button 
                                     onClick={() => handlePrintVoucher(voucher)}
                                     title="Goswara Voucher Print"
                                     className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                   >
                                      <Printer size={16} />
                                   </button>
                                 ) : null;
                             })()}
                             {item.needsBharpai && (
                               <button 
                                 onClick={() => handlePrintBharpai(item)}
                                 title="Print Bharpai"
                                 className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                               >
                                 <FileText size={16} />
                               </button>
                             )}
                             <button 
                               onClick={() => {
                                 if (confirm('तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
                                   if (item._type === 'PaymentRequest') onDeletePaymentRequest(item.id);
                                   else if (item._type === 'Allowance') onDeleteAllowance(item.id);
                                   else if (activeTab === 'vendors') onDeleteParty(item.id);
                                   else if (activeTab === 'transactions') onDeleteTransaction(item.id);
                                   else if (activeTab === 'payments') onDeletePayment(item.id, item.amount, item.partyId, item.programId);
                                   else if (activeTab === 'programs') onDeleteProgram(item.id);
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
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg">
                <button 
                  onClick={() => setPrintOrientation('portrait')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${printOrientation === 'portrait' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Portrait
                </button>
                <button 
                  onClick={() => setPrintOrientation('landscape')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${printOrientation === 'landscape' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Landscape
                </button>
              </div>
              <div className="h-4 w-[1px] bg-slate-200"></div>
              <div className="flex items-center gap-3">
                <Filter className="text-slate-400" size={16} />
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Fiscal Year</p>
                  <p className="text-xs font-black text-slate-800 leading-tight">{currentFiscalYear}</p>
                </div>
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
                    setTxnType('Expense');
                    setTxnPaymentMethod('Cash');
                    setTxnCheckNo('');
                    setTxnRefNo(generateReferenceNo());
                    setTxnIsVatBill(false);
                    setTxnVatTaxableAmount('');
                    setEditNeedsBharpai(false);
                    setEditBharpaiUnitType('days');
                    setEditBharpaiPersons([]);
                    setEditTxnAmount('');
                    setEditBharpaiDays('');
                    setEditBharpaiRate('');
                    setTxnItems([{remarks: '', amount: 0, isVatBill: false, applyTds: false, applySasukar: false, applyTax15: false, needsBharpai: false, bharpaiDays: 0, bharpaiRate: 0, bharpaiPersons: []}]);
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
              { id: 'bank_cash_book', label: 'CashBook (बैंक नगदी किताब)', icon: <Book size={18} /> },
              { id: 'bank_reconciliation', label: 'Reconciliation (हिसाब मिलान)', icon: <CheckSquare size={18} /> },
              { id: 'kharcha_fatbari', label: 'Fatbari (खर्चको फाँटबारी)', icon: <FileText size={18} /> },
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

        {activeTab === 'payments' && (
          <div className="flex items-center justify-between bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm mb-6 -mt-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setPaymentSubTab('history')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${paymentSubTab === 'history' ? 'bg-primary-50 text-primary-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                भुक्तानी इतिहास (History)
              </button>
              <button 
                onClick={() => setPaymentSubTab('pending')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${paymentSubTab === 'pending' ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                भुक्तानी हुन बाँकी (Pending)
              </button>
            </div>
            {paymentSubTab === 'pending' && (
               <button 
                onClick={handlePrintPendingPayments}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all text-xs"
              >
                 <Printer size={14} /> प्रिन्ट विवरण (Print Pending)
               </button>
            )}
            {paymentSubTab === 'history' && (
               <button 
                onClick={handlePrintPaymentHistory}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all text-xs"
              >
                 <Printer size={14} /> प्रिन्ट इतिहास (Print History)
               </button>
            )}
          </div>
        )}

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
                        <Select 
                          label="प्रकार (Type)" 
                          name="type" 
                          value={txnType} 
                          onChange={(e) => setTxnType(e.target.value as any)}
                          options={[{label: 'आम्दानी (Income)', value: 'Income'}, {label: 'खर्च (Expense)', value: 'Expense'}]} 
                          required 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Select 
                          label="भुक्तानी विधि (Payment Method)" 
                          name="paymentMethod" 
                          value={txnPaymentMethod}
                          onChange={(e) => setTxnPaymentMethod(e.target.value as any)}
                          options={[
                            {label: 'नगद (Cash)', value: 'Cash'},
                            {label: 'बैंक (Bank)', value: 'Bank'}
                          ]} 
                          required
                        />
                        {txnPaymentMethod === 'Bank' && txnType !== 'Income' && (
                          <Input 
                            label="चेक नं. (Check No)" 
                            value={txnCheckNo} 
                            onChange={(e) => setTxnCheckNo(e.target.value)} 
                            required 
                          />
                        )}
                        <Select label="वर्ग (Category)" name="category" defaultValue={editingItem?.category || 'General'} options={[
                          {label: 'एम्बुलेन्स (Ambulance)', value: 'Ambulance'},
                          {label: 'ल्याब (Lab Service)', value: 'Lab'},
                          {label: 'साधारण (General)', value: 'General'},
                          {label: 'कार्यक्रम भुक्तानी (Program Payment)', value: 'Program Payment'}
                        ]} required />
                      </div>

                      {txnType === 'Income' || editingItem ? (
                        <>
                          <Input 
                            label="रकम (Amount)" 
                            name="amount" 
                            type="number" 
                            value={editTxnAmount} 
                            onChange={(e) => setEditTxnAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                            required 
                          />
                          <Input label="विवरण (Remarks)" name="remarks" defaultValue={editingItem?.remarks} required />
                          {txnType === 'Income' && (
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
                          )}
                           <Select 
                            label="कार्यक्रम/बजेट उप-शीर्षक (Program/Budget)" 
                            name="programId" 
                            defaultValue={editingItem?.programId}
                            options={[...programs].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ label: p.name, value: p.id }))} 
                          />
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">खर्च विवरणहरू (Expense Items)</label>
                            <button 
                              type="button" 
                              onClick={() => setTxnItems([...txnItems, {remarks: '', amount: 0}])}
                              className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs font-bold"
                            >
                              <Plus size={14} /> थप्नुहोस् (Add)
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {txnItems.map((item, index) => (
                              <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group">
                                {txnItems.length > 1 && (
                                  <button 
                                    type="button" 
                                    onClick={() => setTxnItems(txnItems.filter((_, i) => i !== index))}
                                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">विवरण (Remarks)</label>
                                    <input 
                                      type="text" 
                                      value={item.remarks} 
                                      onChange={(e) => {
                                        const newItems = [...txnItems];
                                        newItems[index].remarks = e.target.value;
                                        setTxnItems(newItems);
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="खर्चको विवरण"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">रकम (Amount)</label>
                                    <input 
                                      type="number" 
                                      value={item.amount || ''} 
                                      onChange={(e) => {
                                        const newItems = [...txnItems];
                                        newItems[index].amount = Number(e.target.value);
                                        setTxnItems(newItems);
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="रकम"
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">कार्यक्रम (Program)</label>
                                    <select 
                                      value={item.programId || ''} 
                                      onChange={(e) => {
                                        const newItems = [...txnItems];
                                        newItems[index].programId = e.target.value;
                                        setTxnItems(newItems);
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">कार्यक्रम छान्नुहोस्</option>
                                      {[...programs].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">पार्टीको नाम (Party)</label>
                                    <input 
                                      type="text" 
                                      value={item.partyName || ''} 
                                      onChange={(e) => {
                                        const newItems = [...txnItems];
                                        newItems[index].partyName = e.target.value;
                                        setTxnItems(newItems);
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="फर्म वा व्यक्तिको नाम"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                                   <div className="flex items-center gap-1.5">
                                      <input 
                                        type="checkbox" 
                                        checked={!!item.isVatBill}
                                        onChange={(e) => {
                                          const newItems = [...txnItems];
                                          newItems[index].isVatBill = e.target.checked;
                                          if (e.target.checked && item.amount > 0) {
                                            newItems[index].vatTaxableAmount = Number((item.amount / 1.13).toFixed(2));
                                          }
                                          setTxnItems(newItems);
                                        }}
                                        className="rounded text-rose-600 focus:ring-rose-500" 
                                      />
                                      <label className="text-[9px] font-black text-slate-700 uppercase">VAT बिल</label>
                                   </div>
                                   {item.isVatBill && (
                                     <div className="col-span-1 space-y-1">
                                       <input 
                                         type="number" 
                                         value={item.vatTaxableAmount || ''} 
                                         onChange={(e) => {
                                           const newItems = [...txnItems];
                                           newItems[index].vatTaxableAmount = Number(e.target.value);
                                           setTxnItems(newItems);
                                         }}
                                         className="w-full bg-white border border-rose-200 rounded-lg px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-rose-500"
                                         placeholder="Taxable Amt"
                                       />
                                     </div>
                                   )}
                                   <div className="flex items-center gap-1.5">
                                      <input 
                                        type="checkbox" 
                                        checked={!!item.applyTds}
                                        onChange={(e) => {
                                          const newItems = [...txnItems];
                                          newItems[index].applyTds = e.target.checked;
                                          setTxnItems(newItems);
                                        }}
                                        className="rounded text-rose-600 focus:ring-rose-500" 
                                      />
                                      <label className="text-[9px] font-black text-rose-600 uppercase">१.५% TDS</label>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      <input 
                                        type="checkbox" 
                                        checked={!!item.applySasukar}
                                        onChange={(e) => {
                                          const newItems = [...txnItems];
                                          newItems[index].applySasukar = e.target.checked;
                                          setTxnItems(newItems);
                                        }}
                                        className="rounded text-rose-600 focus:ring-rose-500" 
                                      />
                                      <label className="text-[9px] font-black text-slate-700 uppercase">१% सा.सु कर</label>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      <input 
                                        type="checkbox" 
                                        checked={!!item.applyTax15}
                                        onChange={(e) => {
                                          const newItems = [...txnItems];
                                          newItems[index].applyTax15 = e.target.checked;
                                          setTxnItems(newItems);
                                        }}
                                        className="rounded text-rose-600 focus:ring-rose-500" 
                                      />
                                      <label className="text-[9px] font-black text-slate-700 uppercase">१५% कर</label>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      <input 
                                        type="checkbox" 
                                        checked={!!item.needsBharpai}
                                        onChange={(e) => {
                                          const newItems = [...txnItems];
                                          newItems[index].needsBharpai = e.target.checked;
                                           if (e.target.checked) {
                                             if (item.bharpaiPersons && item.bharpaiPersons.length > 0) {
                                               newItems[index].amount = item.bharpaiPersons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
                                             } else {
                                               newItems[index].amount = Number(item.bharpaiDays || 0) * Number(item.bharpaiRate || 0);
                                             }
                                           }
                                          setTxnItems(newItems);
                                        }}
                                        className="rounded text-primary-600 focus:ring-primary-500" 
                                      />
                                      <label className="text-[9px] font-black text-primary-700 uppercase">भर्पाई चाहिने?</label>
                                   </div>
                                </div>
                                {item.needsBharpai && (
                                  <div className="pt-2 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">भर्पाई प्रकार (Unit Type)</span>
                                      <div className="flex gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newItems = [...txnItems];
                                            newItems[index].bharpaiUnitType = 'days';
                                            setTxnItems(newItems);
                                          }}
                                          className={`px-2.5 py-0.5 text-[9px] font-black rounded-md border transition-all ${
                                            (item.bharpaiUnitType || 'days') === 'days'
                                              ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                          }`}
                                        >
                                          दिन (Days)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newItems = [...txnItems];
                                            newItems[index].bharpaiUnitType = 'qty';
                                            setTxnItems(newItems);
                                          }}
                                          className={`px-2.5 py-0.5 text-[9px] font-black rounded-md border transition-all ${
                                            item.bharpaiUnitType === 'qty'
                                              ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                          }`}
                                        >
                                          संख्या (Qty)
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                          {item.bharpaiUnitType === 'qty' ? 'संख्या (Qty)' : 'दिन (Days)'}
                                        </label>
                                        <input 
                                          type="number" 
                                          value={item.bharpaiDays || ''} 
                                          onChange={(e) => {
                                            const newItems = [...txnItems];
                                            const val = Number(e.target.value);
                                            newItems[index].bharpaiDays = val;
                                            if (item.needsBharpai) {
                                              if (item.bharpaiPersons && item.bharpaiPersons.length > 0) {
                                                newItems[index].amount = item.bharpaiPersons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
                                              } else {
                                                newItems[index].amount = val * Number(item.bharpaiRate || 0);
                                              }
                                            }
                                            setTxnItems(newItems);
                                          }}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder={item.bharpaiUnitType === 'qty' ? 'संख्या' : 'दिन'}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">दर (Rate)</label>
                                        <input 
                                          type="number" 
                                          value={item.bharpaiRate || ''} 
                                          onChange={(e) => {
                                            const newItems = [...txnItems];
                                            const val = Number(e.target.value);
                                            newItems[index].bharpaiRate = val;
                                            if (item.needsBharpai) {
                                              if (item.bharpaiPersons && item.bharpaiPersons.length > 0) {
                                                newItems[index].amount = item.bharpaiPersons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
                                              } else {
                                                newItems[index].amount = Number(item.bharpaiDays || 0) * val;
                                              }
                                            }
                                            setTxnItems(newItems);
                                          }}
                                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder="दर"
                                        />
                                      </div>
                                    </div>

                                    <div className="bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/60 space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">बहु-व्यक्ति विवरण (Multiple Persons)</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newItems = [...txnItems];
                                            const currentPersons = item.bharpaiPersons || [];
                                            const updatedPersons = [...currentPersons, { name: '', days: item.bharpaiDays || 1, rate: item.bharpaiRate || 0 }];
                                            newItems[index].bharpaiPersons = updatedPersons;
                                            if (item.needsBharpai) {
                                              newItems[index].amount = updatedPersons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
                                            }
                                            setTxnItems(newItems);
                                          }}
                                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-[9px] font-black uppercase"
                                        >
                                          <Plus size={10} /> थप्नुहोस् (Add Person)
                                        </button>
                                      </div>

                                      <div className="space-y-1.5">
                                        {(item.bharpaiPersons || []).map((person, pIdx) => (
                                          <div key={pIdx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-1.5 rounded-lg border border-slate-200 relative group">
                                            <div className="col-span-5">
                                              <input 
                                                type="text" 
                                                value={person.name} 
                                                onChange={(e) => {
                                                  const newItems = [...txnItems];
                                                  const persons = [...(item.bharpaiPersons || [])];
                                                  persons[pIdx].name = e.target.value;
                                                  newItems[index].bharpaiPersons = persons;
                                                  setTxnItems(newItems);
                                                }}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-md px-1.5 py-1 text-[11px] outline-none focus:ring-1 focus:ring-primary-500"
                                                placeholder="नाम थर"
                                                required
                                              />
                                            </div>
                                            <div className="col-span-3">
                                              <input 
                                                type="number" 
                                                value={person.days || ''} 
                                                onChange={(e) => {
                                                  const newItems = [...txnItems];
                                                  const persons = [...(item.bharpaiPersons || [])];
                                                  persons[pIdx].days = Number(e.target.value);
                                                  newItems[index].bharpaiPersons = persons;
                                                  
                                                  if (item.needsBharpai) {
                                                    const totalAmount = persons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
                                                    newItems[index].amount = totalAmount;
                                                  }
                                                  
                                                  setTxnItems(newItems);
                                                }}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-md px-1.5 py-1 text-[11px] outline-none focus:ring-1 focus:ring-primary-500"
                                                placeholder={item.bharpaiUnitType === 'qty' ? 'संख्या' : 'दिन'}
                                                required
                                              />
                                            </div>
                                            <div className="col-span-3">
                                              <input 
                                                type="number" 
                                                value={person.rate || ''} 
                                                onChange={(e) => {
                                                  const newItems = [...txnItems];
                                                  const persons = [...(item.bharpaiPersons || [])];
                                                  persons[pIdx].rate = Number(e.target.value);
                                                  newItems[index].bharpaiPersons = persons;
                                                  
                                                  if (item.needsBharpai) {
                                                    const totalAmount = persons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
                                                    newItems[index].amount = totalAmount;
                                                  }
                                                  
                                                  setTxnItems(newItems);
                                                }}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-md px-1.5 py-1 text-[11px] outline-none focus:ring-1 focus:ring-primary-500"
                                                placeholder="दर"
                                                required
                                              />
                                            </div>
                                            <div className="col-span-1 text-center">
                                              <button 
                                                type="button" 
                                                onClick={() => {
                                                  const newItems = [...txnItems];
                                                  const persons = (item.bharpaiPersons || []).filter((_, i) => i !== pIdx);
                                                  newItems[index].bharpaiPersons = persons;
                                                  
                                                  if (item.needsBharpai) {
                                                    if (persons.length > 0) {
                                                      newItems[index].amount = persons.reduce((sum, p) => sum + (Number(p.days || 0) * Number(p.rate || 0)), 0);
                                                    } else {
                                                      newItems[index].amount = Number(item.bharpaiDays || 0) * Number(item.bharpaiRate || 0);
                                                    }
                                                  }
                                                  
                                                  setTxnItems(newItems);
                                                }}
                                                className="text-rose-500 hover:text-rose-600"
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                        {(item.bharpaiPersons || []).length === 0 && (
                                          <p className="text-[9px] text-slate-400 italic text-center py-0.5">कुनै व्यक्ति थपिएको छैन। स्वतः मुख्य विवरण प्रयोग हुनेछ।</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-5 gap-4 mt-2">
                        <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              name="isVatBill" 
                              id="isVatBill" 
                              checked={txnIsVatBill}
                              onChange={(e) => {
                                setTxnIsVatBill(e.target.checked);
                                if (e.target.checked && editTxnAmount) {
                                  setTxnVatTaxableAmount(Number((Number(editTxnAmount) / 1.13).toFixed(2)));
                                } else if (!e.target.checked) {
                                  setTxnVatTaxableAmount('');
                                }
                              }}
                              className="rounded text-rose-600 focus:ring-rose-500" 
                            />
                            <label htmlFor="isVatBill" className="text-[10px] font-black text-slate-700 uppercase tracking-widest">VAT बिल हो?</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="applyTds" id="applyTds" className="rounded text-rose-600 focus:ring-rose-500" />
                            <label htmlFor="applyTds" className="text-[10px] font-black text-rose-600 uppercase tracking-widest">१.५% TDS?</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="applySasukar" id="applySasukar" className="rounded text-rose-600 focus:ring-rose-500" />
                            <label htmlFor="applySasukar" className="text-[10px] font-black text-slate-700 uppercase tracking-widest">१% सा.सु कर?</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="applyTax15" id="applyTax15" className="rounded text-rose-600 focus:ring-rose-500" />
                            <label htmlFor="applyTax15" className="text-[10px] font-black text-slate-700 uppercase tracking-widest">१५% कर?</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              name="needsBharpai" 
                              id="needsBharpai" 
                              checked={editNeedsBharpai}
                              onChange={(e) => setEditNeedsBharpai(e.target.checked)}
                              className="rounded text-primary-600 focus:ring-primary-500" 
                            />
                            <label htmlFor="needsBharpai" className="text-[10px] font-black text-primary-700 uppercase tracking-widest">भर्पाई?</label>
                        </div>
                      </div>

                      {editNeedsBharpai && (
                        <div className="space-y-3 mt-4">
                          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">भर्पाई प्रकार (Unit Type)</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditBharpaiUnitType('days')}
                                className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${
                                  editBharpaiUnitType === 'days'
                                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                दिन (Days)
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditBharpaiUnitType('qty')}
                                className={`px-3 py-1 text-[10px] font-black rounded-lg border transition-all ${
                                  editBharpaiUnitType === 'qty'
                                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                संख्या (Qty)
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                  {editBharpaiUnitType === 'qty' ? 'संख्या (Qty)' : 'दिन (Days)'}
                                </label>
                                <input 
                                  type="number" 
                                  name="bharpaiDays" 
                                  value={editBharpaiDays} 
                                  onChange={(e) => setEditBharpaiDays(e.target.value === '' ? '' : Number(e.target.value))}
                                  placeholder={editBharpaiUnitType === 'qty' ? 'संख्या' : 'दिन'}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">दर (Rate)</label>
                                <input 
                                  type="number" 
                                  name="bharpaiRate" 
                                  value={editBharpaiRate} 
                                  onChange={(e) => setEditBharpaiRate(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" 
                                />
                            </div>
                          </div>

                          <div className="bg-slate-100/50 p-3 rounded-2xl border border-slate-200/60 space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">बहु-व्यक्ति विवरण (Multiple Persons)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditBharpaiPersons([...editBharpaiPersons, { name: '', days: editingItem?.bharpaiDays || 1, rate: editingItem?.bharpaiRate || 0 }]);
                                }}
                                className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-[10px] font-black uppercase"
                              >
                                <Plus size={12} /> थप्नुहोस् (Add Person)
                              </button>
                            </div>

                            <div className="space-y-2">
                              {editBharpaiPersons.map((person, pIdx) => (
                                <div key={pIdx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 relative group">
                                  <div className="col-span-5">
                                    <input 
                                      type="text" 
                                      value={person.name} 
                                      onChange={(e) => {
                                        const updated = [...editBharpaiPersons];
                                        updated[pIdx].name = e.target.value;
                                        setEditBharpaiPersons(updated);
                                      }}
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary-500"
                                      placeholder="नाम थर"
                                      required
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <input 
                                      type="number" 
                                      value={person.days || ''} 
                                      onChange={(e) => {
                                        const updated = [...editBharpaiPersons];
                                        updated[pIdx].days = Number(e.target.value);
                                        setEditBharpaiPersons(updated);
                                      }}
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary-500"
                                      placeholder={editBharpaiUnitType === 'qty' ? 'संख्या' : 'दिन'}
                                      required
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <input 
                                      type="number" 
                                      value={person.rate || ''} 
                                      onChange={(e) => {
                                        const updated = [...editBharpaiPersons];
                                        updated[pIdx].rate = Number(e.target.value);
                                        setEditBharpaiPersons(updated);
                                      }}
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary-500"
                                      placeholder="दर"
                                      required
                                    />
                                  </div>
                                  <div className="col-span-1 text-center">
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setEditBharpaiPersons(editBharpaiPersons.filter((_, i) => i !== pIdx));
                                      }}
                                      className="text-rose-500 hover:text-rose-600"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {editBharpaiPersons.length === 0 && (
                                <p className="text-[10px] text-slate-400 italic text-center py-1">कुनै व्यक्ति थपिएको छैन। स्वतः मुख्य विवरण प्रयोग हुनेछ।</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {txnIsVatBill && (
                        <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 mt-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">VAT लाग्ने रकम (VAT Taxable Amount)</label>
                          <input 
                            type="number" 
                            name="vatTaxableAmount" 
                            value={txnVatTaxableAmount} 
                            onChange={(e) => setTxnVatTaxableAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                            required 
                            placeholder="VAT लाग्ने रकम प्रविष्ट गर्नुहोस्" 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                          {txnVatTaxableAmount !== '' && (
                            <div className="text-[10px] text-slate-500 font-nepali flex justify-between px-1">
                              <span>VAT बाहेक: रू {Number(txnVatTaxableAmount).toLocaleString()}</span>
                              <span>VAT (१३%): रू {Math.round(Number(txnVatTaxableAmount) * 0.13).toLocaleString()}</span>
                              <span className="font-bold text-rose-700">VAT सहित: रू {Math.round(Number(txnVatTaxableAmount) * 1.13).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <Input label="सन्दर्भ नं. (Reference No)" name="referenceNo" defaultValue={txnRefNo} required />
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
