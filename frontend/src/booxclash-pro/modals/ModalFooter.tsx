import React from 'react';
import { ModalType, MODAL_CONFIG } from './types';

interface ModalFooterProps {
  type: ModalType;
  onClose: () => void;
  onGenerate: () => void;
  disabled: boolean;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ type, onClose, onGenerate, disabled }) => {
  if (!type) return null;
  const config = MODAL_CONFIG[type];

  return (
    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
      <button 
        onClick={onClose} 
        className="px-4 py-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
      >
        Cancel
      </button>
      <button 
        onClick={onGenerate}
        disabled={disabled}
        className={`px-6 py-2.5 ${config.color} text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {config.icon}
        {config.btnText}
      </button>
    </div>
  );
};

export default ModalFooter;