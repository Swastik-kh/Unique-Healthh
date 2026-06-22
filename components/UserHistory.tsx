import React, { useState, useEffect, useMemo } from 'react';
import { database, ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { UserActivityLog, User } from '../types/coreTypes';
import { toNepaliDigits } from './nepaliUtils'; // Assuming this exists or needed

export const UserHistory: React.FC<{ users: User[] }> = ({ users }) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [timeframe, setTimeframe] = useState<'24h' | '1w' | '1m' | '1y'>('24h');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const logsRef = ref(db, 'userActivityLogs');
    onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logsArray: UserActivityLog[] = Object.values(data);
        setLogs(logsArray);
      }
    });
  }, []);

  const filteredLogs = useMemo(() => {
    const nowTime = new Date();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const diffMs = nowTime.getTime() - logDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      switch (timeframe) {
        case '24h': return diffHours <= 24;
        case '1w': return diffHours <= 24 * 7;
        case '1m': return diffHours <= 24 * 30;
        case '1y': return diffHours <= 24 * 365;
        default: return true;
      }
    });
  }, [logs, timeframe]);

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

    // Check for activity timeout
    const INACTIVE_THRESHOLD_MS = 20 * 1000; // 20 seconds
    Object.keys(stats).forEach(userId => {
        const lastLogin = stats[userId].lastLogin;
        if (lastLogin && (now - lastLogin) >= INACTIVE_THRESHOLD_MS) {
            stats[userId].lastLogin = undefined;
        }
    });

    return stats;
  }, [logs, timeframe, now]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <div className="flex gap-4 mb-6">
        {['24h', '1w', '1m', '1y'].map((tf) => (
          <button key={tf} onClick={() => setTimeframe(tf as any)} className={`px-4 py-2 rounded-lg ${timeframe === tf ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>
            {tf}
          </button>
        ))}
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Active Duration</th>
            <th>Total Time Spent</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            const stats = userStats[user.id];
            const activeDuration = stats?.lastLogin ? (now - stats.lastLogin) / (1000 * 60) : 0;
            const pastDuration = stats?.pastDuration || 0;
            const totalDuration = pastDuration + activeDuration;
            
            return (
              <tr key={user.id}>
                <td className={stats?.lastLogin ? "text-green-600 font-semibold" : ""}>{user.fullName}</td>
                <td className={stats?.lastLogin ? "text-green-600 font-bold" : "text-gray-500"}>
                  {stats?.lastLogin ? "Active" : "Offline"}
                </td>
                <td>{stats?.lastLogin ? formatDuration(activeDuration) : "00:00:00"}</td>
                <td>{formatDuration(totalDuration)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
