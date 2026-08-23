import React, { useState, useMemo } from 'react';
import { AuditLogEntry } from '../types/healthTypes';
import { User } from '../types/coreTypes';
import { 
  ShieldAlert, Search, Filter, Calendar, User as UserIcon, 
  ChevronDown, ChevronUp, RotateCcw, Clock, Layers, FileText, ArrowRight
} from 'lucide-react';

interface AuditLogViewerProps {
  auditLogs: AuditLogEntry[];
  users?: User[];
  activeOrgName?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  auditLogs = [],
  activeOrgName = 'All'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('bachhaImmunizationRecords');
  const [selectedActor, setSelectedActor] = useState<string>('All');
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Unique lists for dropdown filters
  const availableModules = useMemo(() => {
    const modules = new Set<string>();
    modules.add('bachhaImmunizationRecords');
    auditLogs.forEach(log => {
      if (log.module) modules.add(log.module);
    });
    return Array.from(modules);
  }, [auditLogs]);

  const availableActors = useMemo(() => {
    const actors = new Set<string>();
    auditLogs.forEach(log => {
      if (log.actorName) actors.add(log.actorName);
    });
    return Array.from(actors);
  }, [auditLogs]);

  const toggleExpand = (id: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedModule('bachhaImmunizationRecords');
    setSelectedActor('All');
    setSelectedAction('All');
    setFromDate('');
    setToDate('');
  };

  // Filter and sort logs (newest first)
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        // Module filter
        if (selectedModule !== 'All' && log.module !== selectedModule) {
          return false;
        }

        // Actor filter
        if (selectedActor !== 'All' && log.actorName !== selectedActor) {
          return false;
        }

        // Action filter
        if (selectedAction !== 'All' && log.action !== selectedAction) {
          return false;
        }

        // Search term matching recordLabel, recordId, actorName, or changes
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchLabel = log.recordLabel?.toLowerCase().includes(q);
          const matchId = log.recordId?.toLowerCase().includes(q);
          const matchActor = log.actorName?.toLowerCase().includes(q);
          const matchOrg = log.orgName?.toLowerCase().includes(q);
          const matchChanges = log.changes?.some(c => 
            c.field?.toLowerCase().includes(q) || 
            String(c.oldValue).toLowerCase().includes(q) || 
            String(c.newValue).toLowerCase().includes(q)
          );
          if (!matchLabel && !matchId && !matchActor && !matchOrg && !matchChanges) {
            return false;
          }
        }

        // Date range filter
        if (fromDate) {
          const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
          if (!isNaN(fromMs) && log.timestampMs < fromMs) {
            return false;
          }
        }

        if (toDate) {
          const toMs = new Date(`${toDate}T23:59:59.999`).getTime();
          if (!isNaN(toMs) && log.timestampMs > toMs) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  }, [auditLogs, selectedModule, selectedActor, selectedAction, searchTerm, fromDate, toDate]);

  const formatTimestamp = (timestampMs: number) => {
    if (!timestampMs) return '-';
    try {
      const d = new Date(timestampMs);
      return d.toLocaleString('ne-NP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return new Date(timestampMs).toLocaleString();
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VACCINE_DOSE_UPDATED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">खोप अपडेट भयो</span>;
      case 'VACCINE_DOSE_RESET_TO_PENDING':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">खोप Pending बनाइयो</span>;
      case 'RECORD_CREATED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">नयाँ दर्ता</span>;
      case 'RECORD_UPDATED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">अपडेट भयो</span>;
      case 'RECORD_DELETED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">मेटाइयो</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 p-2 sm:p-4">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100 shadow-sm">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              अडिट तथा गतिविधि लग (Audit & Activity Log)
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
                Super Admin strictly
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              प्रणालीमा भएका संवेदनशील परिवर्तनहरू (जस्तै खोप मिति संशोधन, Pending मा फिर्ता, दर्ता तथा मेटाउने) को पूर्ण अभिलेख।
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end justify-center">
          <span className="text-2xl font-black text-slate-800">{filteredLogs.length}</span>
          <span className="text-xs text-slate-500 font-medium">कुल लग प्रविष्टिहरू</span>
        </div>
      </div>

      {/* Filter Controls Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <Filter size={16} className="text-slate-500" />
            <span>फिल्टर विकल्पहरू (Filter Options)</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
            फिल्टर रिसेट
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Search size={12} />
              खोज्नुहोस् (रेकर्ड/कर्ता)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="बच्चाको नाम, दर्ता नं..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Module Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Layers size={12} />
              मोड्युल (Module)
            </label>
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="All">सबै मोड्युल (All Modules)</option>
              {availableModules.map(mod => (
                <option key={mod} value={mod}>
                  {mod === 'bachhaImmunizationRecords' ? 'बच्चा खोप (bachhaImmunizationRecords)' : mod}
                </option>
              ))}
            </select>
          </div>

          {/* Actor Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <UserIcon size={12} />
              कर्ता (Actor Name)
            </label>
            <select
              value={selectedActor}
              onChange={e => setSelectedActor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="All">सबै कर्ता (All Users)</option>
              {availableActors.map(actor => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <FileText size={12} />
              कार्य (Action)
            </label>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="All">सबै कार्यहरू (All Actions)</option>
              <option value="VACCINE_DOSE_UPDATED">खोप अपडेट भयो</option>
              <option value="VACCINE_DOSE_RESET_TO_PENDING">खोप Pending बनाइयो</option>
              <option value="RECORD_CREATED">नयाँ दर्ता</option>
              <option value="RECORD_DELETED">मेटाइयो</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Calendar size={12} />
              मिति देखि (From Date)
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Calendar size={12} />
              मिति सम्म (To Date)
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">समय (Timestamp)</th>
                <th className="py-3.5 px-4">कर्ता (Actor)</th>
                <th className="py-3.5 px-4">संस्था (Org)</th>
                <th className="py-3.5 px-4">कार्य (Action)</th>
                <th className="py-3.5 px-4">रेकर्ड विवरण (Record)</th>
                <th className="py-3.5 px-4 text-center">परिवर्तनहरू</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Clock size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">कुनै अडिट लग भेटिएन।</p>
                    <p className="text-xs text-slate-400 mt-1">कृपया छनोट गरिएका फिल्टरहरू परिवर्तन गरी पुनः प्रयास गर्नुहोस्।</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isExpanded = !!expandedRowIds[log.id];
                  const hasChanges = Array.isArray(log.changes) && log.changes.length > 0;

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleExpand(log.id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/90' : ''}`}
                      >
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {formatTimestamp(log.timestampMs)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{log.actorName || 'Unknown'}</div>
                          <div className="text-[11px] text-slate-400">{log.actorRole || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                          {log.orgName || activeOrgName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {log.recordLabel || log.recordId}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(log.id);
                            }}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                              hasChanges 
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200' 
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}
                          >
                            <span>{hasChanges ? `${log.changes.length} परिवर्तन` : 'विवरण'}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable row content */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 border-b border-slate-200">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-inner space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                                <span>विशिष्ट परिवर्तन विवरण (Detailed Changes)</span>
                                <span className="font-mono text-slate-400 font-normal">
                                  ID: {log.id} | Module: {log.module}
                                </span>
                              </div>

                              {!hasChanges ? (
                                <p className="text-xs text-slate-500 italic">
                                  {log.action === 'RECORD_CREATED' 
                                    ? 'नयाँ रेकर्ड दर्ता गरिएको (कुनै अघिल्लो मान उपलब्ध छैन)।' 
                                    : log.action === 'RECORD_DELETED'
                                    ? 'रेकर्ड पूर्ण रूपमा मेटाइएको।'
                                    : 'कुनै क्षेत्र परिवर्तनहरू दर्ता भएका छैनन्।'}
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {log.changes.map((change, idx) => (
                                    <div 
                                      key={idx}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                                    >
                                      <div className="font-semibold text-slate-700 min-w-[200px]">
                                        फिल्ड: <span className="text-blue-700 font-mono">{change.field}</span>
                                      </div>
                                      <div className="flex items-center gap-2 font-mono flex-wrap">
                                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 line-through">
                                          {change.oldValue === null || change.oldValue === undefined || change.oldValue === ''
                                            ? '(खाली)'
                                            : String(change.oldValue)}
                                        </span>
                                        <ArrowRight size={14} className="text-slate-400 shrink-0" />
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                                          {change.newValue === null || change.newValue === undefined || change.newValue === ''
                                            ? '(खाली)'
                                            : String(change.newValue)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
