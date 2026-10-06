export interface DateRange {
  from: string;
  to: string;
}

export interface AnalyticsOverview {
  organizationId: string;
  dateRange: DateRange;
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  skippedTokens: number;
  waitingTokens: number;
  calledTokens: number;
  servingTokens: number;
  completionRate: number;
  cancellationRate: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface DailyAnalyticsItem {
  date: string;
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  skippedTokens: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface ServiceAnalyticsItem {
  serviceId: string;
  serviceName: string;
  totalTokens: number;
  completedTokens: number;
  cancelledTokens: number;
  skippedTokens: number;
  completionRate: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface CounterAnalyticsItem {
  counterId: string;
  counterName: string;
  totalCompleted: number;
  skippedTokens: number;
  completionRate: number;
  averageWaitingTime: number;
  averageServiceTime: number;
}

export interface StaffAnalyticsItem {
  staffId: string;
  staffName: string;
  counterId?: string | null;
  counterName?: string;
  totalCompleted: number;
  totalSkipped: number;
  averageServiceTime: number;
  averageTokensHandled: number;
  attributionNote: string;
}
