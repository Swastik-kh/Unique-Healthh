import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, User, Hash, Clock, Stethoscope, 
  Volume2, VolumeX, Maximize, Minimize, Activity
} from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { db } from '../firebase';
import { ref, onValue, set, push, serverTimestamp } from 'firebase/database';
import { ServiceSeekerRecord } from '../types/coreTypes';

interface TokenDisplayProps {
  deviceId: string;
  orgName?: string;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({ deviceId, orgName = 'Smart Health Hospital' }) => {
  const [currentCall, setCurrentCall] = useState<{
    name: string;
    token: string;
    service: string;
    room?: string;
  } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Heartbeat for status monitoring
    const heartbeatRef = ref(db, `display_status/${deviceId}`);
    const interval = setInterval(() => {
      set(heartbeatRef, {
        lastPing: serverTimestamp(),
        status: 'Online'
      });
    }, 30000); // every 30 seconds

    return () => clearInterval(interval);
  }, [deviceId]);

  useEffect(() => {
    // Listen for calls targeted at this device or global calls
    const callsRef = ref(db, `display_calls/${deviceId}`);
    const globalRef = ref(db, `display_calls/GLOBAL`);
    
    const handleSnap = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const lastCall = Object.values(data).pop() as any;
        setCurrentCall(lastCall);
        setHistory(prev => {
          const newHist = [lastCall, ...prev].slice(0, 10);
          return newHist;
        });
        if (!isMuted && lastCall) {
          playAnnouncement(lastCall.name, lastCall.token, lastCall.service);
        }
      }
    };

    const unsubDevice = onValue(callsRef, handleSnap);
    const unsubGlobal = onValue(globalRef, handleSnap);

    return () => {
      unsubDevice();
      unsubGlobal();
    };
  }, [deviceId, isMuted]);

  const playAnnouncement = (name: string, token: string, service: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `बिरामी ${name}, पालो नम्बर ${token}, कृपया ${service} कक्षमा आउनुहोला।`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ne-NP';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour12: true });
  const nepaliDate = new NepaliDate().format('YYYY MMMM DD, dddd');

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-primary-900/40 border-b border-white/10 p-6 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-lg shadow-primary-500/20">
             <Activity className="text-primary-600 w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white/90">{orgName}</h1>
            <p className="text-primary-300 font-nepali text-lg">पालो प्रदर्शन प्रणाली (Token Display System)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-4xl font-mono font-bold text-white leading-none">{formattedTime}</div>
            <div className="text-slate-400 font-nepali text-sm mt-1">{nepaliDate}</div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10"
            >
              {isMuted ? <VolumeX className="text-red-400" /> : <Volume2 className="text-emerald-400" />}
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10"
            >
              {isFullscreen ? <Minimize /> : <Maximize />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden">
        {/* Active Call Section */}
        <div className="col-span-8 flex flex-col gap-8">
          <div className="flex-1 bg-gradient-to-br from-primary-600 to-primary-800 rounded-[3rem] p-12 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl shadow-primary-900/50">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48 blur-3xl"></div>
            
            {currentCall ? (
              <div className="w-full text-center space-y-12 animate-in zoom-in-95 duration-500">
                <div className="space-y-4">
                  <span className="px-8 py-3 bg-white/10 rounded-full text-primary-100 font-bold text-2xl uppercase tracking-[0.2em] border border-white/20">
                    Now Calling
                  </span>
                  <div className="text-[15rem] font-black leading-none tracking-tighter text-white drop-shadow-2xl">
                    {currentCall.token}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 mx-auto max-w-2xl transform hover:scale-105 transition-all duration-300">
                  <div className="text-6xl font-bold text-white mb-4 font-nepali">
                    {currentCall.name}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-primary-100">
                    <Stethoscope size={32} />
                    <span className="text-4xl font-bold uppercase tracking-wide">
                      {currentCall.service}
                    </span>
                  </div>
                </div>

                {currentCall.room && (
                  <div className="text-3xl font-bold text-primary-200 uppercase tracking-widest bg-black/20 py-4 px-12 rounded-full inline-block border border-white/10">
                    Room No: {currentCall.room}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-white/5 p-12 rounded-full inline-block animate-pulse">
                  <Bell size={120} className="text-primary-300/30" />
                </div>
                <h2 className="text-5xl font-black text-white/40 font-nepali">नयाँ पालोको पर्खाइमा...</h2>
                <p className="text-2xl text-white/20 uppercase tracking-[0.3em]">Ready for Next Patient</p>
              </div>
            )}
          </div>

          {/* Ticker / Announcement */}
          <div className="h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center px-8 overflow-hidden">
            <div className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold text-xl uppercase mr-8 animate-pulse shrink-0">
              Notice
            </div>
            <div className="text-3xl font-medium text-slate-300 font-nepali whitespace-nowrap animate-marquee">
               कृपया आफ्नो पालो आएपछि मात्र भित्र प्रवेश गर्नुहोला। स्वास्थ्य संस्था सफा राखौं। सुर्तिजन्य पदार्थ निषेध गरिएको छ।
            </div>
          </div>
        </div>

        {/* History / Sidebar */}
        <div className="col-span-4 bg-white/5 border border-white/10 rounded-[3rem] p-8 flex flex-col gap-6 overflow-hidden">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
             <h3 className="text-2xl font-black text-slate-400 uppercase tracking-wider flex items-center gap-3">
               <Clock className="text-primary-500" />
               Recent Calls
             </h3>
             <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-bold">Today</span>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
             {history.length > 0 ? (
               history.map((item, idx) => (
                 <div key={idx} className="bg-white/5 border border-white/5 p-6 rounded-3xl flex justify-between items-center hover:bg-white/10 transition-all cursor-default">
                    <div className="flex items-center gap-6">
                      <div className="text-4xl font-black text-primary-400 w-16">{item.token}</div>
                      <div>
                        <div className="text-2xl font-bold text-white/90 font-nepali">{item.name}</div>
                        <div className="text-sm text-slate-500 uppercase tracking-widest">{item.service}</div>
                      </div>
                    </div>
                    <div className="text-slate-600 font-mono text-sm">{item.time}</div>
                 </div>
               ))
             ) : (
               <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4">
                 <History size={80} />
                 <p className="text-xl uppercase tracking-widest">No Recent Calls</p>
               </div>
             )}
          </div>

          {/* Device Info Footer */}
          <div className="pt-6 border-t border-white/10 flex justify-between items-center text-slate-600 text-xs font-mono uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Device: {deviceId}
            </div>
            <div>Smart Health v4.0</div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}} />
    </div>
  );
};
