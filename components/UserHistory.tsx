import React, { useState, useEffect, useMemo } from 'react';
import { database, ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { UserActivityLog, User } from '../types/coreTypes';
import { toNepaliDigits } from './nepaliUtils'; // Assuming this exists or needed

export const UserHistory: React.FC<{ users: User[] }> = ({ users }) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [timeframe, setTimeframe] = useState<'24h' | '1w' | '1m' | '1y'>('24h');

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
    const now = new Date();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const diffMs = now.getTime() - logDate.getTime();
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
    const stats: Record<string, { count: number, totalDuration: number }> = {};
    filteredLogs.forEach(log => {
      if (!stats[log.userId]) stats[log.userId] = { count: 0, totalDuration: 0 };
      if (log.eventType === 'login') stats[log.userId].count++;
      if (log.durationMinutes) stats[log.userId].totalDuration += log.durationMinutes;
    });
    return stats;
  }, [filteredLogs]);

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
