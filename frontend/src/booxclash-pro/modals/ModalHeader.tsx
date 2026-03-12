import React from 'react';
import { X } from 'lucide-react';
import { ModalType, MODAL_CONFIG } from './types';

interface ModalHeaderProps {
  type: ModalType;
  onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ type, onClose }) => {
  if (!type) return null;
  const config = MODAL_CONFIG[type];

  return (
    <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{config.title}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{config.desc}</p>
      </div>
      <button 
        onClick={onClose} 
        className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"
        aria-label="Close modal"
      >
        <X size={20} className="text-slate-400 hover:text-slate-700 transition-colors" />
      </button>
    </div>
  );
};

export default ModalHeader;