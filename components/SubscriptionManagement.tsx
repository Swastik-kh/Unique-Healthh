
import React, { useState } from 'react';
import { SubscriptionRequest, User } from '../types/coreTypes';
import { CheckCircle2, XCircle, Clock, Calendar, Building2, User as UserIcon, Send, RefreshCw, AlertCircle } from 'lucide-react';

interface SubscriptionManagementProps {
  requests: SubscriptionRequest[];
  onApprove: (requestId: string, durationDays: number) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  users: User[];
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ requests, onApprove, onReject, users }) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const processedRequests = requests.filter(r => r.status !== 'Pending');

  const handleApprove = async (requestId: string) => {
    setIsProcessing(requestId);
    try {
      await onApprove(requestId, selectedDuration);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setIsProcessing(requestId);
    try {
      await onReject(requestId);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <RefreshCw className="text-primary-600" size={32} />
          सदास्यता व्यवस्थापन (Subscription Management)
        </h2>
        <p className="text-slate-500 mt-2 font-medium">संगठनहरूको सदस्यता अनुरोधहरू र नवीकरण व्यवस्थापन गर्नुहोस्।</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Requests */}
          <section>
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Clock className="text-amber-500" size={20} />
              पेन्डिङ अनुरोधहरू ({pendingRequests.length})
            </h3>
            {pendingRequests.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-400 font-bold">कुनै पनि नयाँ अनुरोधहरू छैनन्।</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <div key={request.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-800">{request.organizationName}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><UserIcon size={14} /> {request.username}</span>
                            <span className="flex items-center gap-1"><Calendar size={14} /> {request.requestDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">अवधि (Days)</label>
                          <select 
                            value={selectedDuration}
                            onChange={(e) => setSelectedDuration(Number(e.target.value))}
                            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                          >
                            <option value={30}>३० दिन (1 Month)</option>
                            <option value={90}>९० दिन (3 Months)</option>
                            <option value={180}>१८० दिन (6 Months)</option>
                            <option value={365}>३६५ दिन (1 Year)</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pt-5">
                          <button 
                            onClick={() => handleReject(request.id)}
                            disabled={!!isProcessing}
                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={20} />
                          </button>
                          <button 
                            onClick={() => handleApprove(request.id)}
                            disabled={!!isProcessing}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isProcessing === request.id ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                            अनुमोदन गर्नुहोस्
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* History */}
          <section>
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <History className="text-slate-400" size={20} />
              हालैका गतिविधिहरू
            </h3>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-4 text-left">संगठन</th>
                    <th className="px-6 py-4 text-left">स्थिति</th>
                    <th className="px-6 py-4 text-left">अवधि</th>
                    <th className="px-6 py-4 text-right">मिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {processedRequests.slice(0, 10).map(request => (
                    <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{request.organizationName}</div>
                        <div className="text-[10px] text-slate-400">{request.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          request.status === 'Approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {request.status === 'Approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-600">
                        {request.durationDays ? `${request.durationDays} Days` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 font-medium">
                        {request.approvedDate || request.requestDate}
                      </td>
                    </tr>
                  ))}
                  {processedRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        कुनै इतिहास उपलब्ध छैन।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <h4 className="text-primary-400 font-black uppercase tracking-widest text-[10px] mb-4">Subscription Overview</h4>
              <div className="space-y-6">
                <div>
                  <div className="text-4xl font-black mb-1">{users.filter(u => u.role === 'ADMIN' && u.isSubscribed).length}</div>
                  <div className="text-slate-400 text-sm font-bold">Active Organizations</div>
                </div>
                <div className="h-px bg-white/10 w-full"></div>
                <div>
                  <div className="text-4xl font-black mb-1">{users.filter(u => u.role === 'ADMIN' && !u.isSubscribed).length}</div>
                  <div className="text-slate-400 text-sm font-bold">Expired/Trial Orgs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-8">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertCircle size={24} />
              <h4 className="font-black text-amber-900">महत्त्वपूर्ण जानकारी</h4>
            </div>
            <p className="text-sm text-amber-800/80 leading-relaxed font-medium">
              सदस्यता अनुमोदन गर्दा, सम्बन्धित संगठनको सबै प्रयोगकर्ताहरूले तोकिएको अवधिको लागि पूर्ण पहुँच प्राप्त गर्नेछन्। 
              अवधि समाप्त भएपछि, तिनीहरूको पहुँच स्वतः प्रतिबन्धित हुनेछ।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const History = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);
