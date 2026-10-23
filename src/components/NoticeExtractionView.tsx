import React, { useState } from 'react';
import { TenderNoticeAttachmentManager } from './TenderNoticeAttachmentManager';
import { TenderAttachment } from '../types/tenderAttachment';
import { INITIAL_VARIABLE_VALUES } from '../data/mockProposalComponents';

interface NoticeExtractionViewProps {
  projectName?: string;
  onNavigateToInstructions?: () => void;
}

export const NoticeExtractionView: React.FC<NoticeExtractionViewProps> = ({ projectName, onNavigateToInstructions }) => {
  const [attachments, setAttachments] = useState<TenderAttachment[]>([]);
  const [variableValues, setVariableValues] = useState(INITIAL_VARIABLE_VALUES);

  const handleAddAttachment = (attachment: TenderAttachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const handleUpdateAttachment = (attachment: TenderAttachment) => {
    setAttachments(prev => prev.map(a => a.id === attachment.id ? attachment : a));
  };

  const handleDeleteAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateVariable = (key: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full">
      <TenderNoticeAttachmentManager
        defaultTab="matrix"
        attachments={attachments}
        variableValues={variableValues}
        onAddAttachment={handleAddAttachment}
        onUpdateAttachment={handleUpdateAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        onUpdateVariable={handleUpdateVariable}
        onNavigateToInstructions={onNavigateToInstructions}
      />
    </div>
  );
};
