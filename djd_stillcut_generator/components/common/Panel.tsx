import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-col p-6 bg-gray-800/50 rounded-xl shadow-lg min-h-[500px] justify-between ${className}`}>
      {children}
    </div>
  );
};

export default Panel;