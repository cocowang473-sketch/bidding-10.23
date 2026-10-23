import React, { useState } from 'react';
import { TenderInstructionAttachmentsWorkbench } from './TenderInstructionAttachmentsWorkbench';
import { INITIAL_VARIABLE_VALUES } from '../data/mockProposalComponents';

interface InstructionsAttachmentsViewWrapperProps {
  projectName?: string;
  onNavigateToBoq?: () => void;
}

export const InstructionsAttachmentsViewWrapper: React.FC<InstructionsAttachmentsViewWrapperProps> = ({
  projectName,
  onNavigateToBoq,
}) => {
  const [variableValues, setVariableValues] = useState(INITIAL_VARIABLE_VALUES);

  const handleUpdateVariable = (key: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <TenderInstructionAttachmentsWorkbench
        variableValues={variableValues}
        onUpdateVariable={handleUpdateVariable}
        langMode="bilingual"
        onNavigateToBoq={onNavigateToBoq}
      />
    </div>
  );
};
