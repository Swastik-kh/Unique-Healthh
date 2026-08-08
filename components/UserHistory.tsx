import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { UserActivityLog, User } from '../types/coreTypes';
import { 
  Clock, 
  Search, 
  RefreshCw, 
  Users, 
  Flame, 
  Key, 
  ShieldCheck, 
  Timer,
  Mail
} from 'lucide-react';

export const UserHistory: React.FC<{ users: User[] }> = ({ users }) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [presenceStates, setPresenceStates] = useState<Record<string, { state: 'online' | 'offline', lastActive?: number, username?: string, fullName?: string }>>({});
  const [timeframe, setTimeframe] = useState<'24h' | '1w' | '1m' | '1y'>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(Date.now());

  // Trigger ticking every second for real-time spend watch
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Activity Logs & Presence updates
  useEffect(() => {
    const logsRef = ref(db, 'userActivityLogs');
    const unsubLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logsArray: UserActivityLog[] = Object.values(data);
        setLogs(logsArray);
      } else {
        setLogs([]);
      }
    });

    const presenceRef = ref(db, 'presence');
    const unsubPresence = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPresenceStates(data);
      } else {
        setPresenceStates({});
      }
    });

    return () => {
      unsubLogs();
      unsubPresence();
    };
  }, []);

  // Calculate filtered logs and user stats per timeframe
  const userStats = useMemo(() => {
    const stats: Record<string, { count: number, pastDuration: number, lastLogin?: number }> = {};
    
    // Calculate time boundary
    const timeBoundary = new Date();
    if (timeframe === '24h') timeBoundary.setHours(timeBoundary.getHours() - 24);
    else if (timeframe === '1w') timeBoundary.setDate(timeBoundary.getDate() - 7);
    else if (timeframe === '1m') timeBoundary.setDate(timeBoundary.getDate() - 30);
    else if (timeframe === '1y') timeBoundary.setFullYear(timeBoundary.getFullYear() - 1);
    const boundaryTime = timeBoundary.getTime();

    // Sort all logs by time
    const sortedLogs = [...logs].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sortedLogs.forEach(log => {
      if (!stats[log.userId]) stats[log.userId] = { count: 0, pastDuration: 0 };
      
      const logTime = new Date(log.timestamp).getTime();

      if (log.eventType === 'login') {
          if (logTime >= boundaryTime) {
             stats[log.userId].count++;
          }
          stats[log.userId].lastLogin = logTime;
      } else if (log.eventType.toLowerCase() === 'logout') {
          if (log.durationMinutes && logTime >= boundaryTime) {
             stats[log.userId].pastDuration += log.durationMinutes;
          }
          stats[log.userId].lastLogin = undefined;
      }
    });

    return stats;
  }, [logs, timeframe]);

  // Helper to format duration in HH:MM:SS format
  const formatDuration = (minutes: number) => {
    if (minutes < 0) minutes = 0;
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered users search mapping
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // General counters info
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(user => presenceStates[user.id]?.state === 'online').length;

  const totalLoginHits = useMemo(() => {
    let sum = 0;
    filteredUsers.forEach(u => {
      sum += userStats[u.id]?.count || 0;
    });
    return sum;
  }, [filteredUsers, userStats]);

  const accumulatedDurationTotal = useMemo(() => {
    let sum = 0;
    filteredUsers.forEach(u => {
      const stats = userStats[u.id];
      const isOnline = presenceStates[u.id]?.state === 'online';
      const activeDuration = isOnline && stats?.lastLogin ? (now - stats.lastLogin) / (1000 * 60) : 0;
      const pastDuration = stats?.pastDuration || 0;
      sum += pastDuration + activeDuration;
    });
    return sum;
  }, [filteredUsers, userStats, presenceStates, now]);

  return (
    <div className="space-y-6">
      {/* Visual Elegant Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Timer className="h-7 w-7 text-green-300 animate-pulse" />
              प्रयोगकर्ता लगइन तथा अनलाइन इतिहास (User Login & Activity Tracker)
            </h1>
            <p className="text-blue-100 text-xs mt-1">
              प्रणालीमा प्रयोगकर्ताहरूको सक्रियता, कुल समय खर्च, र वास्तविक समयको अनलाइन स्थिति ट्र्याक गर्नुहोस्।
            </p>
          </div>
          <div className="flex bg-white/10 p-1 rounded-xl self-start md:self-auto backdrop-blur-md border border-white/10">
            {[
              { id: '24h', label: '24 hours' },
              { id: '1w', label: '1 week' },
              { id: '1m', label: '1 month' },
              { id: '1y', label: '1 year' }
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  timeframe === tf.id 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Colorful Indicator Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">कुल कर्मचारी (Users)</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalUsersCount}</h3>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-700/70 font-medium">
            System registered staff accounts
          </div>
        </div>

        {/* Active Now */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider font-semibold">अहिले सक्रिय (Active Now)</p>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-800">{activeUsersCount}</h3>
                {activeUsersCount > 0 && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                )}
              </div>
            </div>
            <div className="bg-green-500/10 p-3 rounded-2xl text-green-600">
              <Flame className="h-6 w-6 animate-bounce" />
            </div>
          </div>
          <div className="mt-2 text-xs text-green-700/70 font-medium">
            Currently logged in staff
          </div>
        </div>

        {/* Total Login Count */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">कुल लगइन संख्या (Logins)</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalLoginHits} <span className="text-sm font-medium text-slate-500">पटक</span></h3>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-600">
              <Key className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-xs text-amber-700/70 font-medium">
            Frequency of access in selected timeframe
          </div>
        </div>

        {/* Total Time Spent */}
        <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1">
                जम्मा बिताएको समय (Total Time)
                <a href="https://www.smartinventoryy.com/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 lowercase font-normal hover:underline">@smartinventoryy</a>
              </p>
              <h3 className="font-mono text-xl font-bold text-slate-800 mt-1.5">{formatDuration(accumulatedDurationTotal)}</h3>
            </div>
            <div className="bg-cyan-500/10 p-3 rounded-2xl text-cyan-500">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-2 text-xs text-cyan-700/70 font-medium">
            Combined sum of all sessions
          </div>
        </div>
      </div>

      {/* Main Table Segment */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Search header toolbar */}
        <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="प्रयोगकर्ताको नाम खोज्नुहोस्..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
            Live Presence Node Linked
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 uppercase font-bold tracking-wider text-[11px] text-slate-500 border-b border-slate-100">
                <th className="py-4 px-6 text-slate-500">प्रयोगकर्ताको नाम (User Info)</th>
                <th className="py-4 px-6 text-center text-slate-500">अवस्था (Status)</th>
                <th className="py-4 px-6 text-center text-slate-500">लगइन सङ्ख्या (Login Count)</th>
                <th className="py-4 px-6 text-center text-slate-500">चालू सेसन अवधि (Active Session)</th>
                <th className="py-4 px-6 text-center text-slate-500">
                  कूल खर्चेको समय (Total Spent Time)
                  <a href="https://www.smartinventoryy.com/" target="_blank" rel="noopener noreferrer" className="block text-[9px] text-blue-400 font-normal normal-case hover:underline">smartinventoryy.com</a>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-base">No staff accounts found</p>
                    <p className="text-xs mt-1">Try adjusting your search filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const stats = userStats[user.id];
                  const isOnline = presenceStates[user.id]?.state === 'online';
                  const activeDuration = isOnline && stats?.lastLogin ? (now - stats.lastLogin) / (1000 * 60) : 0;
                  const pastDuration = stats?.pastDuration || 0;
                  const totalDuration = pastDuration + activeDuration;
                  const loginTimes = stats?.count || 0;

                  // Get initials for avatar
                  const initials = user.fullName
                    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    : user.username.substring(0, 2).toUpperCase();

                  // Set avatar colors based on role or name characters
                  const colorClasses = [
                    'bg-red-100 text-red-600',
                    'bg-orange-100 text-orange-600',
                    'bg-emerald-100 text-emerald-600',
                    'bg-teal-100 text-teal-600',
                    'bg-blue-100 text-blue-600',
                    'bg-indigo-100 text-indigo-600',
                    'bg-purple-100 text-purple-600'
                  ];
                  const charCodeSum = user.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const avatarColor = colorClasses[charCodeSum % colorClasses.length];

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/70 transition-colors duration-150 ${
                        isOnline ? 'bg-emerald-500/[0.04]' : ''
                      }`}
                    >
                      {/* Name Card Profile */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm ${avatarColor}`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {user.fullName}
                              {user.role === 'admin' && (
                                <ShieldCheck className="h-4 w-4 text-blue-500" title="Administrator" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">@{user.username}</div>
                            {user.email && <div className="text-[10px] text-blue-500 font-medium truncate max-w-[150px] flex items-center gap-1"><Mail size={10} /> {user.email}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex justify-center">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black border border-emerald-100 shadow-sm">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-semibold border border-slate-200">
                              <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                              Offline
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Login Frequency (Kati patak login garo) */}
                      <td className="py-4 px-6 text-center font-semibold text-slate-700">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200">
                          {loginTimes} पटक
                        </span>
                      </td>

                      {/* Current Active Session Tracker */}
                      <td className="py-4 px-6 text-center">
                        {isOnline ? (
                          <div className="flex items-center justify-center gap-1.5 font-mono text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-100 w-fit mx-auto shadow-sm">
                            <Timer className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                            {formatDuration(activeDuration)}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">-</span>
                        )}
                      </td>

                      {/* Total Time Spent Accumulator */}
                      <td className="py-4 px-6 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <div className="font-bold text-slate-800 bg-slate-100 py-1.5 px-3 rounded-xl border border-slate-200 w-fit mx-auto shadow-sm">
                            {formatDuration(totalDuration)}
                          </div>
                          <a href="https://www.smartinventoryy.com/" target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 mt-1 hover:underline font-normal">
                            smartinventoryy.com
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>सक्रिय समय र टाइपिङ सेकेन्डपिच्छे स्वतः परिवर्तन भई अद्यावधिक हुन्छ।</span>
          <span>Explicit logging out ensures perfect sync tracking.</span>
        </div>
      </div>
    </div>
  );
};
