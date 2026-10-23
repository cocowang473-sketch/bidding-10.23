export type HistoryActionType =
  | 'pricing' // 量单组价与调价
  | 'variable' // 标书条款与变量
  | 'rfq' // 供应商询价与比选采纳
  | 'quota' // 定额含量与人工基数
  | 'import' // 历史签单台账导入
  | 'system' // 系统费率与汇率配置
  | 'notice' // 招标公告智能解读
  | 'instructions'; // 投标须知工作台

export interface ChangeHistoryRecord {
  id: string;
  actionType: HistoryActionType;
  title: string;
  description: string;
  target: string;
  operator: string;
  timestamp: string;
  timeAgo: string;
  details?: {
    before?: string;
    after?: string;
  };
}
