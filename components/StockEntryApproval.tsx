
import React, { useState } from 'react';
import { CheckCircle2, X, Eye, ClipboardCheck, AlertCircle, Calendar, Store as StoreIcon, Package, Clock, HelpCircle, ShieldCheck } from 'lucide-react';
// Corrected import paths for StockEntryRequest, User, Store
import { User } from '../types/coreTypes';
import { StockEntryRequest, Store } from '../types/inventoryTypes';

interface StockEntryApprovalProps {
  requests: StockEntryRequest[];
  currentUser: User;
  onApprove: (requestId: string, approverName: string, approverDesignation: string) => void;
  onReject: (requestId: string, reason: string, approverName: string) => void;
  stores: Store[];
}

export const StockEntryApproval: React.FC<StockEntryApprovalProps> = ({ 
  requests, 
  currentUser, 
  onApprove, 
  onReject,
  stores
}) => {
  const [selectedRequest, setSelectedRequest] = useState<StockEntryRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');

  // Check if current user has approval privileges
  const canApprove = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

  const displayedRequests = requests.filter(req => {
      if (activeTab === 'Pending') return req.status === 'Pending';
      return req.status !== 'Pending';
  }).sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const handleApproveClick = () => {
      if (!selectedRequest) return;
      setShowApproveConfirm(true);
  };

  const confirmApproval = () => {
      if (!selectedRequest) return;
      
      // Pass the CURRENT LOGGED-IN user's details as the approver
      onApprove(selectedRequest.id, currentUser.fullName, currentUser.designation);
      
      setShowApproveConfirm(false);
      setSelectedRequest(null);
      
      // User notification
      alert(`दाखिला सफलतापूर्वक स्वीकृत भयो। सामानहरू ${getStoreName(selectedRequest.storeId)} को मौज्दातमा थपिएका छन्।`);
  };

  const handleRejectClick = (request: StockEntryRequest) => {
      setSelectedRequest(request);
      setShowRejectModal(true);
      setRejectionReason('');
  };

  const submitRejection = () => {
      if (!selectedRequest) return;
      if (!rejectionReason.trim()) {
          alert('कृपया अस्वीकार गर्नुको कारण उल्लेख गर्नुहोस्।');
          return;
      }
      onReject(selectedRequest.id, rejectionReason, currentUser.fullName);
      setShowRejectModal(false);
      setSelectedRequest(null);
  };

  const getStoreName = (storeId: string) => {
      return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">स्टक प्रविष्टि अनुरोध (Stock Entry Requests)</h2>
            <p className="text-sm text-slate-500">नयाँ स्टक प्रविष्टिहरू स्वीकृत वा अस्वीकृत गर्नुहोस्</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('Pending')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'Pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                लम्बित (Pending)
            </button>
            <button
                onClick={() => setActiveTab('History')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'History' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                इतिहास (History)
            </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {displayedRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">
                  कुनै {activeTab === 'Pending' ? 'लम्बित' : 'पुराना'} अनुरोध छैन। (No {activeTab.toLowerCase()} requests found.)
              </div>
          ) : (
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-3">मिति (Date)</th>
                          <th className="px-6 py-3">गोदाम (Store)</th>
                          <th className="px-6 py-3">स्रोत / आपूर्तिकर्ता</th>
                          <th className="px-6 py-3">सामान संख्या</th>
                          <th className="px-6 py-3">अवस्था (Status)</th>
                          <th className="px-6 py-3 text-right">कार्य (Action)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {displayedRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                  <div className="font-nepali font-bold text-slate-700">{req.requestDateBs}</div>
                                  <div className="text-[10px] text-slate-400">{req.requestDateAd}</div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                      <StoreIcon size={14} className="text-slate-400" />
                                      <span className="font-medium text-slate-700">{getStoreName(req.storeId)}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="text-slate-800 font-medium">{req.receiptSource}</div>
                                  {req.supplier && <div className="text-xs text-slate-500">{req.supplier}</div>}
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-slate-600">
                                      <Package size={14} />
                                      <span className="font-bold">{req.items.length}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                      req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                      'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                      {req.status === 'Pending' && <Clock size={12} />}
                                      {req.status === 'Approved' && <CheckCircle2 size={12} />}
                                      {req.status === 'Rejected' && <X size={12} />}
                                      {req.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button 
                                      onClick={() => setSelectedRequest(req)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-bold transition-colors border border-indigo-200"
                                  >
                                      <Eye size={14} /> विवरण (Details)
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {selectedRequest && !showRejectModal && !showApproveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRequest(null)}></div>
              
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="font-bold text-slate-800 text-lg font-nepali">अनुरोध विवरण (Request Details)</h3>
                          <p className="text-xs text-slate-500 font-mono uppercase">Request ID: {selectedRequest.id} | Mode: {selectedRequest.mode}</p>
                      </div>
                      <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-sm">
                          <div>
                              <label className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Store/Godam</label>
                              <p className="font-bold text-slate-800">{getStoreName(selectedRequest.storeId)}</p>
                          </div>
                          <div>
                              <label className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Entry Date</label>
                              <p className="font-bold text-slate-800 font-nepali">{selectedRequest.requestDateBs}</p>
                              <p className="text-[10px] text-slate-400">{selectedRequest.requestDateAd}</p>
                          </div>
                          <div>
                              <label className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Source/Supplier</label>
                              <p className="font-bold text-slate-800">{selectedRequest.receiptSource}</p>
                              <p className="text-[10px] text-slate-500 truncate">{selectedRequest.supplier || '-'}</p>
                          </div>
                          <div>
                              <label className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Prepared By</label>
                              <p className="font-bold text-slate-800">{selectedRequest.requesterName}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">{selectedRequest.requesterDesignation}</p>
                          </div>
                      </div>

                      {selectedRequest.status === 'Rejected' && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 text-red-800 text-sm flex items-start gap-3">
                              <AlertCircle className="shrink-0 mt-0.5" />
                              <div>
                                  <span className="font-bold">अस्वीकृत गरिएको (Rejected By):</span> {selectedRequest.approvedBy}<br/>
                                  <span className="font-bold">कारण (Reason):</span> {selectedRequest.rejectionReason}
                              </div>
                          </div>
                      )}

                      <h4 className="font-bold text-slate-700 mb-3 text-sm border-b pb-2 flex justify-between items-center">
                          <span className="flex items-center gap-2"><Package size={16} /> सामानहरू (Items List)</span>
                          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">Total: {selectedRequest.items.length} items</span>
                      </h4>
                      
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-xs text-left whitespace-nowrap">
                              <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                                  <tr>
                                      <th className="px-4 py-3 border-b min-w-[200px]">Item Name / Classification</th>
                                      <th className="px-4 py-3 border-b">Codes</th>
                                      <th className="px-4 py-3 border-b">Type</th>
                                      <th className="px-4 py-3 border-b">Unit</th>
                                      <th className="px-4 py-3 border-b text-center">Qty</th>
                                      <th className="px-4 py-3 border-b text-right">Rate</th>
                                      <th className="px-4 py-3 border-b text-right">Total Amount</th>
                                      <th className="px-4 py-3 border-b min-w-[150px]">Remarks</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {selectedRequest.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-4 py-3 align-top">
                                              <div className="font-bold text-slate-800 whitespace-normal leading-tight">{item.itemName}</div>
                                              <div className="text-[10px] text-slate-400 mt-1">{item.itemClassification || '-'}</div>
                                          </td>
                                          <td className="px-4 py-3 text-[10px] text-slate-500 align-top font-mono">
                                              <div>U: {item.uniqueCode || '-'}</div>
                                              <div>S: {item.sanketNo || '-'}</div>
                                          </td>
                                          <td className="px-4 py-3 align-top">
                                              <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold border uppercase ${
                                                  item.itemType === 'Expendable' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                              }`}>
                                                  {item.itemType === 'Expendable' ? 'Exp' : 'Non-Exp'}
                                              </span>
                                          </td>
                                          <td className="px-4 py-3 align-top">{item.unit}</td>
                                          <td className="px-4 py-3 text-center font-black text-slate-800 align-top bg-slate-50/50">{item.currentQuantity}</td>
                                          <td className="px-4 py-3 text-right align-top">{item.rate ? item.rate.toFixed(2) : '-'}</td>
                                          <td className="px-4 py-3 text-right font-black text-indigo-700 align-top">{item.totalAmount?.toFixed(2)}</td>
                                          <td className="px-4 py-3 text-[10px] text-slate-500 align-top italic whitespace-normal max-w-[150px]">
                                              {item.remarks || '-'}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                      <button 
                          onClick={() => setSelectedRequest(null)}
                          className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors"
                      >
                          बन्द गर्नुहोस् (Close)
                      </button>
                      
                      {selectedRequest.status === 'Pending' && canApprove && (
                          <>
                              <button 
                                  onClick={() => handleRejectClick(selectedRequest)}
                                  className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors border border-red-200"
                              >
                                  <X size={16} /> अस्वीकार (Reject)
                              </button>
                              <button 
                                  onClick={handleApproveClick}
                                  className="flex items-center gap-2 px-8 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-bold shadow-lg shadow-teal-200 transition-all active:scale-95"
                              >
                                  <CheckCircle2 size={18} /> स्वीकृत गर्नुहोस् (Approve)
                              </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Approve Confirmation Dialog */}
      {showApproveConfirm && selectedRequest && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setShowApproveConfirm(false)}></div>
              <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-8 text-center">
                      <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-teal-50">
                          <ShieldCheck size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 font-nepali mb-3">दाखिला स्वीकृत पुष्टि (Confirm Approval)</h3>
                      <p className="text-slate-600 mb-4 font-medium font-nepali leading-relaxed">
                        के तपाईं यो जिन्सी दाखिला स्वीकृत गर्न चाहनुहुन्छ? <br/>
                        स्वीकृत भएपछि सामानहरू <strong>{getStoreName(selectedRequest.storeId)}</strong> को मौज्दातमा गणना हुनेछन्।
                      </p>
                      
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left space-y-2 mb-2">
                         <div className="flex justify-between text-xs">
                             <span className="text-slate-400 font-bold uppercase">Approver:</span>
                             <span className="text-slate-700 font-bold">{currentUser.fullName}</span>
                         </div>
                         <div className="flex justify-between text-xs">
                             <span className="text-slate-400 font-bold uppercase">Designation:</span>
                             <span className="text-slate-700 font-bold">{currentUser.designation}</span>
                         </div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-slate-100 border-t border-slate-100">
                      <button onClick={() => setShowApproveConfirm(false)} className="bg-white py-4 text-slate-500 font-bold hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest">रद्द (Cancel)</button>
                      <button onClick={confirmApproval} className="bg-white py-4 text-teal-600 font-bold hover:bg-slate-50 transition-colors text-xs flex items-center justify-center gap-2 uppercase tracking-widest border-l border-slate-100">
                        <CheckCircle2 size={18} /> स्वीकृत (Confirm)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Reject Reason Dialog */}
      {showRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRejectModal(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b bg-red-50 text-red-800 flex justify-between items-center">
                      <h3 className="font-bold font-nepali">अस्वीकार गर्नुको कारण (Reason)</h3>
                      <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-white/50 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <textarea 
                          className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none min-h-[120px] transition-all" 
                          placeholder="Rejection reason here..." 
                          value={rejectionReason} 
                          onChange={(e) => setRejectionReason(e.target.value)} 
                      />
                      <div className="flex justify-end gap-3 pt-2">
                          <button onClick={() => setShowRejectModal(false)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold">रद्द</button>
                          <button onClick={submitRejection} className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold shadow-lg shadow-red-200">अस्वीकार गर्नुहोस्</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
