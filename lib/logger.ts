import { getDatabase, ref, push, set } from 'firebase/database';
import { db } from '../firebase';
import { UserActivityLog } from '../types/coreTypes';
import NepaliDate from 'nepali-date-converter';

export const logUserActivity = async (
  userId: string,
  username: string,
  eventType: 'login' | 'logout' | 'activity',
  fiscalYear: string,
  durationMinutes?: number
) => {
  try {
      console.log('Logging activity:', { userId, username, eventType, fiscalYear });
      const logsRef = ref(db, 'userActivityLogs');
      const newLogRef = push(logsRef);
      const logEntry: any = {
        id: newLogRef.key || '',
        userId,
        username,
        eventType,
        timestamp: new Date().toISOString(),
        fiscalYear
      };
      if (durationMinutes !== undefined) {
        logEntry.durationMinutes = durationMinutes;
      }
      await set(newLogRef, logEntry);
      console.log('Activity logged successfully');
  } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
  }
};
