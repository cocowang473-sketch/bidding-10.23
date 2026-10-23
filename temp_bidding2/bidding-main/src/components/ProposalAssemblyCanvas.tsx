import React, { useState } from 'react';
import { ProposalSection, VariableValues, LanguageMode } from '../types/proposalVariables';
import { TenderAttachment } from '../types/tenderAttachment';
import { ProposalInteractivePreview } from './ProposalInteractivePreview';
import { TenderInstructionAttachmentsWorkbench } from './TenderInstructionAttachmentsWorkbench';

export type ProposalViewMode = 'attachments_01_09' | 'preview';

interface ProposalAssemblyCanvasProps {
  sections: ProposalSection[];
  variableValues: VariableValues;
  onUpdateSections: (sections: ProposalSection[]) => void;
  onUpdateVariable: (key: string, value: string) => void;
  onResetToDemoValues: () => void;
  attachments?: TenderAttachment[];
  onNavigateToAttachments?: (varKey?: string) => void;
  onNavigateToBoq?: () => void;
  focusedVariable?: string | null;
  onFocusVariable?: (varKey: string | null) => void;
  projectName?: string;
  tenderCode?: string;
  defaultViewMode?: ProposalViewMode;
}

export const ProposalAssemblyCanvas: React.FC<ProposalAssemblyCanvasProps> = ({
  sections,
  variableValues,
  onUpdateSections,
  onUpdateVariable,
  onNavigateToBoq,
  projectName = '阿尔及利亚提济乌祖省 240 床综合医院建设项目',
  tenderCode = '240-DZ-HEALTH-2026-001',
  defaultViewMode = 'attachments_01_09',
}) => {
  const [viewMode, setViewMode] = useState<ProposalViewMode>(defaultViewMode);
  const [langMode] = useState<LanguageMode>('bilingual');

  if (viewMode === 'preview') {
    return (
      <div className="bg-white rounded-xl border border-blue-200 shadow-2xs overflow-hidden flex flex-col min-h-[720px]">
        <ProposalInteractivePreview
          sections={sections}
          variableValues={variableValues}
          projectName={projectName}
          tenderCode={tenderCode}
          onClose={() => setViewMode('attachments_01_09')}
        />
      </div>
    );
  }

  // 直接渲染投标须知与附件编制工作台，消除多余重复的顶栏与标题卡片
  return (
    <TenderInstructionAttachmentsWorkbench
      variableValues={variableValues}
      onUpdateVariable={onUpdateVariable}
      langMode={langMode}
      onNavigateToBoq={onNavigateToBoq}
      onOpenPreview={() => setViewMode('preview')}
      sections={sections}
      onUpdateSections={onUpdateSections}
    />
  );
};
