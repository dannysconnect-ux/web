import ModalHeader from './modals/ModalHeader';
import ModalFooter from './modals/ModalFooter';
import ModalFormBody from './modals/ModalFormBodyCode';
import { useGenerationModalLogic } from './modals/useGenerationModalLogic';
import { ModalType } from './modals/types';

interface GenerationModalProps {
  isOpen: boolean;
  type: ModalType | 'exam' | 'catchup' | any; 
  onClose: () => void;
  onGenerate: (data: any) => void;
}

export default function GenerationModal({ isOpen, type, onClose, onGenerate }: GenerationModalProps) {
  const logic = useGenerationModalLogic(isOpen, type, onGenerate);

  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-[#ffa500]/20 w-full max-w-lg rounded-3xl shadow-[0_8px_30px_rgba(255,165,0,0.15)] overflow-hidden animate-in fade-in zoom-in duration-200">
        <ModalHeader type={type} onClose={onClose} />
        
        <ModalFormBody 
            type={type} 
            {...logic} // Spreads all properties returned by the hook
        />

        <ModalFooter 
            type={type} 
            onClose={onClose} 
            onGenerate={logic.handleGenerateClick} 
            disabled={
                ((type === 'weekly' || type === 'record') && !logic.formData.topic) || 
                (type === 'lesson' && !logic.formData.topic) ||
                (type === 'exam' && logic.formData.topics.length === 0) ||
                (type === 'scheme' && logic.syllabusStructure.length > 0 && logic.formData.topics.length === 0) || 
                (type === 'catchup' && (!logic.formData.catchupLevel || !logic.formData.lessonTitle)) 
            }
        />
      </div>
    </div>
  );
}