import React from 'react';
import { OrganizationSettings } from '../types/coreTypes';

interface LogoDisplayProps {
  settings: OrganizationSettings;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const LogoDisplay: React.FC<LogoDisplayProps> = ({ settings, className = '', width = 80, height = 80 }) => {
  const src = settings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png';
  return (
    <img 
      src={src} 
      style={{ width, height, objectFit: 'contain' }} 
      className={className}
      alt="Organization Logo" 
      referrerPolicy="no-referrer"
    />
  );
};
