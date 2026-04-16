import React, { useState, useRef } from 'react';
import { Calendar, Save, FileText, CheckCircle2, X, BookOpen, User as UserIcon, Check, XCircle, Eye, List, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Select } from './Select';
import { User, LeaveApplication, LeaveStatus, LeaveBalance, ServiceType, OrganizationSettings } from '../types/coreTypes';
import { BidaMaagFaram } from './BidaMaagFaram';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface BidaAbedanProps {
  currentUser: User | null;
  users: User[];
  leaveApplications: LeaveApplication[];
  onAddLeaveApplication: (application: LeaveApplication) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus, rejectionReason?: string) => void;
  onDeleteLeaveApplication: (id: string) => void;
  leaveBalances: LeaveBalance[];
  onSaveLeaveBalance: (balance: LeaveBalance) => Promise<void>;
  currentFiscalYear: string;
  generalSettings: OrganizationSettings;
}

export const BidaAbedan: React.FC<BidaAbedanProps> = ({
  currentUser,
  users,
  leaveApplications,
  onAddLeaveApplication,
  onUpdateLeaveStatus,
  onDeleteLeaveApplication,
  leaveBalances,
  onSaveLeaveBalance,
  currentFiscalYear,
  generalSettings
}) => {
  const [activeTab, setActiveTab] = useState<'apply' | 'applications'>('apply');
  const [formData, setFormData] = useState({
    employeeName: currentUser?.fullName || '',
    designation: currentUser?.designation || '',
    leaveType: 'Casual & Festival',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'Pending'
  });

  const [showAccumulatedModal, setShowAccumulatedModal] = useState(false);
  const [selectedUserForAccumulated, setSelectedUserForAccumulated] = useState<string>('');
  const [accumulatedData, setAccumulatedData] = useState<Partial<LeaveBalance>>({
    casual: 0,
    sick: 0,
    festival: 0,
    home: 0,
    other: 0,
    maternity: 0,
    kiriya: 0,
    study: 0,
    extraordinary: 0,
    serviceType: 'Permanent'
  });

  const [isSaving, setIsSaving] = useState(false);

  const [viewApplication, setViewApplication] = useState<LeaveApplication | null>(null);

  React.useEffect(() => {
    if (selectedUserForAccumulated) {
      const balance = leaveBalances.find(b => b.userId === selectedUserForAccumulated);
      if (balance) {
        setAccumulatedData(balance);
      } else {
        // Reset if manually entered ID has no existing record
        setAccumulatedData({
          casual: 0, sick: 0, festival: 0, home: 0, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0, serviceType: 'Permanent'
        });
      }
    } else {
      // Reset when selection is cleared
      setAccumulatedData({
          casual: 0, sick: 0, festival: 0, home: 0, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0, serviceType: 'Permanent'
        });
    }
  }, [selectedUserForAccumulated, leaveBalances]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Helper to calculate duration
    const calculateDuration = (start: string, end: string) => {
      try {
          const d1 = new Date(new NepaliDate(start).toJsDate());
          const d2 = new Date(new NepaliDate(end).toJsDate());
          const diffTime = Math.abs(d2.getTime() - d1.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
          return diffDays;
      } catch (e) {
          return 0;
      }
    };

    const days = calculateDuration(formData.startDate, formData.endDate);

    const newApplication: LeaveApplication = {
      id: Date.now().toString(),
      userId: currentUser.id,
      employeeName: currentUser.fullName,
      designation: currentUser.designation,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: days,
      reason: formData.reason,
      status: 'Pending',
      appliedDate: new NepaliDate().format('YYYY-MM-DD'),
      fiscalYear: currentFiscalYear
    };

    onAddLeaveApplication(newApplication);
    
    if (window.confirm('बिदा आवेदन पेश गरियो। के तपाइँ यसलाई प्रिन्ट गर्न चाहनुहुन्छ? (Leave application submitted. Do you want to print it?)')) {
      setPrintApplication(newApplication);
    }

    setFormData({
      ...formData,
      startDate: '',
      endDate: '',
      reason: ''
    });
  };

  const handleSaveAccumulated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAccumulated) {
      alert('Please enter or select an Employee ID.');
      return;
    }

    const user = users.find(u => u.id === selectedUserForAccumulated);
    const employeeName = user ? user.fullName : 'Manual Entry';

    // Check if Home Leave exceeds 180 days
    if ((accumulatedData.home ?? 0) > 180) {
      alert('घर बिदा १८० दिन भन्दा बढी सञ्चित गर्न मिल्दैन (Home leave cannot exceed 180 days)');
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    try {
        const existingBalance = leaveBalances.find(b => b.userId === selectedUserForAccumulated);
        
        const newBalance: LeaveBalance = {
          id: existingBalance?.id || Date.now().toString(),
          userId: selectedUserForAccumulated,
          employeeName: employeeName,
          serviceType: accumulatedData.serviceType ?? 'Permanent',
          casual: accumulatedData.casual ?? 0,
          sick: accumulatedData.sick ?? 0,
          festival: accumulatedData.festival ?? 0,
          home: accumulatedData.home ?? 0,
          other: accumulatedData.other ?? 0,
          maternity: accumulatedData.maternity ?? 0,
          kiriya: accumulatedData.kiriya ?? 0,
          study: accumulatedData.study ?? 0,
          extraordinary: accumulatedData.extraordinary ?? 0,
        };

        await onSaveLeaveBalance(newBalance);
        alert('सञ्चित बिदा विवरण सुरक्षित गरियो (Accumulated leave record saved)');
        setShowAccumulatedModal(false);
    } catch (error) {
        alert('Error saving accumulated leave.');
    } finally {
        setIsSaving(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'APPROVAL';

  const adminBalance = leaveBalances.find(b => b.userId === currentUser?.id) || {
    casual: 0, sick: 0, festival: 0, home: 0, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0
  };

  const myBalance = { ...adminBalance };

  const userOptions = users.map(u => ({ id: u.id, value: u.id, label: `${u.fullName} (${u.designation})` }));

  const pendingApplications = leaveApplications.filter(app => app.status === 'Pending');

  const [printApplication, setPrintApplication] = useState<LeaveApplication | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Leave_Application_Form',
  });

  const getAccumulatedLeaveForPrint = (userId: string) => {
    const balance = leaveBalances.find(b => b.userId === userId);
    if (!balance) return undefined;
    
    return {
      casual: balance.casual,
      festival: balance.festival,
      sick: balance.sick,
      home: balance.home,
      other: balance.other,
      maternity: balance.maternity,
      kiriya: balance.kiriya,
      study: balance.study,
      extraordinary: balance.extraordinary
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">बिदा आवेदन (Leave Application)</h2>
            <p className="text-sm text-slate-500">बिदाको लागि आवेदन फारम</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab(activeTab === 'apply' ? 'applications' : 'apply')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-medium ${
                  activeTab === 'applications' 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <List size={16} />
                <span>बिदा माग आवेदन (Leave Requests)</span>
              </button>
              <button 
                onClick={() => setShowAccumulatedModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm transition-all text-sm font-medium"
              >
                <BookOpen size={16} />
                <span>सञ्चित बिदा अभिलेख (Accumulated Leave Record)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showAccumulatedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-none">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={18} className="text-primary-600"/>
                सञ्चित बिदा व्यवस्थापन
              </h3>
              <button onClick={() => setShowAccumulatedModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveAccumulated} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <Select
                  label="कर्मचारी छान्नुहोस् (Select Employee)"
                  value={selectedUserForAccumulated}
                  onChange={e => setSelectedUserForAccumulated(e.target.value)}
                  options={userOptions}
                  icon={<UserIcon size={16} />}
                  placeholder="Select an employee or enter ID below"
                />

                <Input
                  label="कर्मचारी संकेत नम्बर (Employee ID)"
                  value={selectedUserForAccumulated}
                  onChange={e => setSelectedUserForAccumulated(e.target.value)}
                  icon={<UserIcon size={16} />}
                  placeholder="Enter Employee ID"
                  required
                />

                <Select
                  label="सेवाको प्रकार (Service Type)"
                  value={accumulatedData.serviceType ?? 'Permanent'}
                  onChange={e => setAccumulatedData({...accumulatedData, serviceType: e.target.value as ServiceType})}
                  options={[
                    { id: 'Permanent', value: 'Permanent', label: 'स्थायी (Permanent)' },
                    { id: 'Temporary', value: 'Temporary', label: 'अस्थायी (Temporary)' },
                    { id: 'Contract', value: 'Contract', label: 'करार (Contract)' }
                  ]}
                  required
                  icon={<ShieldCheck size={16} />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="भैपरी आउने र पर्व बिदा"
                    type="number"
                    step="any"
                    value={accumulatedData.casual ?? 0}
                    onChange={e => setAccumulatedData({ ...accumulatedData, casual: Number(e.target.value) })}
                    min={0}
                  />
                  <Input
                    label="बिरामी बिदा (Sick)"
                    type="number"
                    step="any"
                    value={accumulatedData.sick ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, sick: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="घर बिदा (Home)"
                    type="number"
                    step="any"
                    value={accumulatedData.home ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, home: Number(e.target.value)})}
                    min={0}
                  />
                   <Input
                    label="प्रसुति बिदा (Maternity)"
                    type="number"
                    step="any"
                    value={accumulatedData.maternity ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, maternity: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="किरिया बिदा (Kiriya)"
                    type="number"
                    step="any"
                    value={accumulatedData.kiriya ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, kiriya: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="अध्ययन बिदा (Study)"
                    type="number"
                    step="any"
                    value={accumulatedData.study ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, study: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="असाधारण बिदा (Extraordinary)"
                    type="number"
                    step="any"
                    value={accumulatedData.extraordinary ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, extraordinary: Number(e.target.value)})}
                    min={0}
                  />
                   <Input
                    label="अन्य (Other)"
                    type="number"
                    step="any"
                    value={accumulatedData.other ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, other: Number(e.target.value)})}
                    min={0}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 flex-none">
                <button 
                  type="button" 
                  onClick={() => setShowAccumulatedModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  रद्द
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'apply' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">बिदाको विवरण (Leave Details)</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="कर्मचारीको नाम (Employee Name)"
                    value={formData.employeeName}
                    readOnly
                    className="bg-slate-50"
                    icon={<UserIcon size={16} />}
                  />
                  <Input
                    label="पद (Designation)"
                    value={formData.designation}
                    readOnly
                    className="bg-slate-50"
                    icon={<ShieldCheck size={16} />}
                  />
                </div>

                <Select
                  label="बिदाको प्रकार (Leave Type)"
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  options={[
                    { id: 'Casual & Festival', value: 'Casual & Festival', label: 'भैपरी आउने र पर्व बिदा (Casual & Festival)' },
                    { id: 'Sick', value: 'Sick', label: 'बिरामी बिदा (Sick)' },
                    { id: 'Home', value: 'Home', label: 'घर बिदा (Home)' },
                    { id: 'Maternity', value: 'Maternity', label: 'प्रसुति बिदा (Maternity)' },
                    { id: 'Kiriya', value: 'Kiriya', label: 'किरिया बिदा (Kiriya)' },
                    { id: 'Study', value: 'Study', label: 'अध्ययन बिदा (Study)' },
                    { id: 'Extraordinary', value: 'Extraordinary', label: 'असाधारण बिदा (Extraordinary)' },
                    { id: 'Other', value: 'Other', label: 'अन्य (Other)' }
                  ]}
                  required
                  icon={<List size={16} />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NepaliDatePicker
                    label="देखि (Start Date)"
                    value={formData.startDate}
                    onChange={(date) => setFormData({ ...formData, startDate: date })}
                    required
                  />
                  <NepaliDatePicker
                    label="सम्म (End Date)"
                    value={formData.endDate}
                    onChange={(date) => setFormData({ ...formData, endDate: date })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">कारण (Reason)</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] text-sm"
                    placeholder="बिदा बस्नुको कारण उल्लेख गर्नुहोस्..."
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    बिदा आवेदन पेश गर्नुहोस् (Submit Application)
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600"/>
                  मेरो बिदा मौज्दात (My Balance)
                </h3>
                <div className="space-y-3">
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">भैपरी र पर्व</span>
                      <span className="font-bold text-slate-800">{(myBalance.casual || 0) + (myBalance.festival || 0)} दिन</span>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">बिरामी</span>
                      <span className="font-bold text-slate-800">{myBalance.sick || 0} दिन</span>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">घर बिदा</span>
                      <span className="font-bold text-slate-800">{myBalance.home || 0} दिन</span>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">अन्य</span>
                      <span className="font-bold text-slate-800">{myBalance.other || 0} दिन</span>
                   </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">हालैका आवेदनहरू</h3>
                <div className="space-y-3">
                  {leaveApplications.filter(app => app.userId === currentUser?.id).slice(0, 5).map(app => (
                    <div key={app.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 relative group">
                       <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-700">{app.leaveType}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{app.status}</span>
                            <button 
                              onClick={() => setPrintApplication(app)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="Print Form"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                       </div>
                       <p className="text-[10px] text-slate-500">{app.startDate} देखि {app.endDate}</p>
                    </div>
                  ))}
                  {leaveApplications.filter(app => app.userId === currentUser?.id).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">कुनै आवेदन छैन</p>
                  )}
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">बिदा माग आवेदनहरू (Leave Requests)</h3>
              <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-lg text-xs font-bold">
                {pendingApplications.length} Pending
              </span>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                    <tr>
                       <th className="p-4">कर्मचारी</th>
                       <th className="p-4">बिदाको प्रकार</th>
                       <th className="p-4">अवधि</th>
                       <th className="p-4">कारण</th>
                       <th className="p-4">अवस्था</th>
                       <th className="p-4 text-right">कार्य</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {leaveApplications.map(app => (
                       <tr key={app.id} className="hover:bg-slate-50">
                          <td className="p-4">
                             <p className="font-bold text-slate-800">{app.employeeName}</p>
                             <p className="text-xs text-slate-500">{app.designation}</p>
                          </td>
                          <td className="p-4">{app.leaveType}</td>
                          <td className="p-4">
                             <p className="text-xs font-bold">{app.startDate} - {app.endDate}</p>
                             <p className="text-[10px] text-slate-400">Applied: {app.appliedDate}</p>
                          </td>
                          <td className="p-4 max-w-xs truncate" title={app.reason}>{app.reason}</td>
                          <td className="p-4">
                             <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                             }`}>
                                {app.status}
                             </span>
                          </td>
                          <td className="p-4 text-right">
                             {app.status === 'Pending' && (
                                <div className="flex justify-end gap-2">
                                   <button 
                                      onClick={() => {
                                        // Check balance before approving
                                        const balance = leaveBalances.find(b => b.userId === app.userId);
                                        const requestedDays = app.days;
                                        let hasBalance = true;
                                        let balanceType = '';

                                        if (app.leaveType === 'Casual & Festival') {
                                          // For Casual/Festival, we check against the calculated balance (6 - taken)
                                          // But here we need to recalculate it or assume admin knows what they are doing?
                                          // Or we can use the getAccumulatedLeaveForPrint logic.
                                          const currentBalance = getAccumulatedLeaveForPrint(app.userId);
                                          const casualFestivalBalance = (currentBalance?.casual || 0) + (currentBalance?.festival || 0);
                                          if (casualFestivalBalance < requestedDays) {
                                            hasBalance = false;
                                            balanceType = 'भैपरी र पर्व';
                                          }
                                        } else if (app.leaveType === 'Home') {
                                          if ((balance?.home || 0) < requestedDays) {
                                            hasBalance = false;
                                            balanceType = 'घर';
                                          }
                                        } else if (app.leaveType === 'Sick') {
                                          if ((balance?.sick || 0) < requestedDays) {
                                            hasBalance = false;
                                            balanceType = 'बिरामी';
                                          }
                                        }
                                        // Add checks for other leave types if needed

                                        if (!hasBalance) {
                                          alert(`${balanceType} बिदा मौज्दात अपर्याप्त छ (Insufficient ${balanceType} Leave Balance)`);
                                          return;
                                        }

                                        onUpdateLeaveStatus(app.id, 'Approved');
                                      }}
                                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                      title="Approve"
                                   >
                                      <CheckCircle2 size={16} />
                                   </button>
                                   <button 
                                      onClick={() => {
                                         const reason = prompt('Rejection Reason:');
                                         if (reason) onUpdateLeaveStatus(app.id, 'Rejected', reason);
                                      }}
                                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                      title="Reject"
                                   >
                                      <XCircle size={16} />
                                   </button>
                                </div>
                             )}
                              <button 
                                  onClick={() => setPrintApplication(app)}
                                  className="ml-2 p-2 text-slate-400 hover:text-blue-500"
                                  title="Print Form"
                                >
                                  <Printer size={16} />
                                </button>
                                {isAdmin && (
                                <button 
                                  onClick={() => onDeleteLeaveApplication(app.id)}
                                  className="ml-2 p-2 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                             )}
                          </td>
                       </tr>
                    ))}
                    {leaveApplications.length === 0 && (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">कुनै आवेदन छैन।</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
      {printApplication && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-lg">बिदा माग फारम प्रिन्ट (Print Preview)</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePrint()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Printer size={18} /> Print
                </button>
                <button 
                  onClick={() => setPrintApplication(null)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-8 bg-slate-100 flex justify-center">
              <div ref={printRef} className="bg-white shadow-lg print:shadow-none print:w-full">
                <BidaMaagFaram 
                  application={printApplication} 
                  currentUser={users.find(u => u.id === printApplication.userId) || currentUser}
                  accumulatedLeave={getAccumulatedLeaveForPrint(printApplication.userId)}
                  generalSettings={generalSettings}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};