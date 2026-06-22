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
    const stats: Record<string, { count: number, totalDuration: number, lastLogin?: number }> = {};
    
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
      if (!stats[log.userId]) stats[log.userId] = { count: 0, totalDuration: 0 };
      
      const logTime = new Date(log.timestamp).getTime();

      if (log.eventType === 'login') {
          if (logTime >= boundaryTime) {
             stats[log.userId].count++;
          }
          stats[log.userId].lastLogin = logTime;
      } else if (log.eventType.toLowerCase() === 'logout') {
          if (log.durationMinutes && logTime >= boundaryTime) {
             stats[log.userId].totalDuration += log.durationMinutes;
          }
          stats[log.userId].lastLogin = undefined;
      }
    });

    // Add active session
    Object.keys(stats).forEach(userId => {
        const lastLogin = stats[userId].lastLogin;
        if (lastLogin && lastLogin < now) {
            // Duration from login to now, but capped by timeframe (starts at max(login, boundary))
            const startTime = Math.max(lastLogin, boundaryTime);
            stats[userId].totalDuration += Math.max(0, (now - startTime) / (1000 * 60));
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
            <th>Login Count</th>
            <th>Total Time Spent</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.fullName}</td>
              <td>{userStats[user.id]?.count || 0}</td>
              <td>{formatDuration(userStats[user.id]?.totalDuration || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
