import React from 'react';

export const ECGWave: React.FC = () => {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 1000 100" preserveAspectRatio="none">
      <path
        d="M0 50 L 100 50 L 120 30 L 140 70 L 160 50 L 200 50 L 220 20 L 240 80 L 260 50 L 300 50 L 320 30 L 340 70 L 360 50 L 400 50 L 420 20 L 440 80 L 460 50 L 500 50 L 520 30 L 540 70 L 560 50 L 600 50 L 620 20 L 640 80 L 660 50 L 700 50 L 720 30 L 740 70 L 760 50 L 800 50 L 820 20 L 840 80 L 860 50 L 900 50 L 920 30 L 940 70 L 960 50 L 1000 50"
        fill="none"
        stroke="white"
        strokeWidth="2"
        className="animate-ecg-wave"
      />
    </svg>
  );
};
