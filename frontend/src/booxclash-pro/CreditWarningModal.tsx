import React from 'react';

// Define the types for the component's props
interface CreditWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cost?: number;
  featureName?: string;
  isLoading?: boolean;
}

const CreditWarningModal: React.FC<CreditWarningModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  cost = 3, 
  featureName = "Chalkboard Diagram",
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        
        {/* Header styling based on cost */}
        <div className={`p-5 ${cost >= 3 ? 'bg-amber-500' : 'bg-blue-600'} flex items-center justify-between`}>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">{cost >= 3 ? '💎' : '🪙'}</span>
            Premium Feature
          </h3>
        </div>

        {/* Body content */}
        <div className="p-6">
          <p className="text-gray-700 text-lg mb-2">
            Generating a <strong>{featureName}</strong> will cost <span className="font-bold text-amber-600">{cost} credits</span>.
          </p>
          <p className="text-gray-500 text-sm">
            Are you sure you want to proceed? You cannot undo this action once the generation begins.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-lg font-bold text-white transition-colors flex items-center gap-2 disabled:opacity-70 ${
              cost >= 3 
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
            } shadow-lg`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              `Spend ${cost} Credits`
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreditWarningModal;