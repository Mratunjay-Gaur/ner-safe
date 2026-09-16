export type RiskLevelKey = 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type IncidentWorkflowStatus = 'SUBMITTED' | 'UNDER REVIEW' | 'VERIFIED' | 'RESOLVED';
export type ConnectivityState = 'LIVE' | 'STALE' | 'OFFLINE' | 'READY';

export interface StatusStyleConfig {
  hex: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotBg: string;
  glowColor: string;
  label: string;
}

export const RISK_COLOR_SYSTEM: Record<RiskLevelKey, StatusStyleConfig> = {
  SAFE: {
    hex: '#059669',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
    dotBg: 'bg-emerald-500',
    glowColor: 'rgba(5, 150, 105, 0.25)',
    label: 'SAFE',
  },
  LOW: {
    hex: '#10b981',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
    dotBg: 'bg-emerald-500',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    label: 'LOW THREAT',
  },
  MODERATE: {
    hex: '#d97706',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeBorder: 'border-amber-500/20',
    dotBg: 'bg-amber-500',
    glowColor: 'rgba(217, 119, 6, 0.25)',
    label: 'MODERATE RISK',
  },
  HIGH: {
    hex: '#ea580c',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-700 dark:text-orange-400',
    badgeBorder: 'border-orange-500/25',
    dotBg: 'bg-orange-500',
    glowColor: 'rgba(234, 88, 12, 0.3)',
    label: 'HIGH THREAT',
  },
  CRITICAL: {
    hex: '#e11d48',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-500/35',
    dotBg: 'bg-rose-500',
    glowColor: 'rgba(225, 29, 72, 0.4)',
    label: 'CRITICAL ALERT',
  },
};

export const WORKFLOW_STATUS_CONFIG: Record<IncidentWorkflowStatus, StatusStyleConfig> = {
  SUBMITTED: {
    hex: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-500/30',
    dotBg: 'bg-amber-500',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    label: 'SUBMITTED',
  },
  'UNDER REVIEW': {
    hex: '#0284c7',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-800 dark:text-sky-300',
    badgeBorder: 'border-sky-500/30',
    dotBg: 'bg-sky-500',
    glowColor: 'rgba(2, 132, 199, 0.25)',
    label: 'UNDER REVIEW',
  },
  VERIFIED: {
    hex: '#9333ea',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-800 dark:text-purple-300',
    badgeBorder: 'border-purple-500/30',
    dotBg: 'bg-purple-500',
    glowColor: 'rgba(147, 51, 234, 0.25)',
    label: 'VERIFIED',
  },
  RESOLVED: {
    hex: '#059669',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    dotBg: 'bg-emerald-500',
    glowColor: 'rgba(5, 150, 105, 0.25)',
    label: 'RESOLVED',
  },
};

export const CONNECTIVITY_CONFIG: Record<ConnectivityState, StatusStyleConfig> = {
  LIVE: {
    hex: '#10b981',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
    dotBg: 'bg-emerald-500',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    label: 'LIVE',
  },
  STALE: {
    hex: '#64748b',
    badgeBg: 'bg-slate-500/10',
    badgeText: 'text-slate-600 dark:text-slate-400',
    badgeBorder: 'border-slate-500/20',
    dotBg: 'bg-slate-400',
    glowColor: 'rgba(100, 116, 139, 0.2)',
    label: 'STALE',
  },
  OFFLINE: {
    hex: '#ef4444',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-500/20',
    dotBg: 'bg-rose-500',
    glowColor: 'rgba(239, 68, 68, 0.3)',
    label: 'OFFLINE',
  },
  READY: {
    hex: '#0284c7',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-700 dark:text-sky-400',
    badgeBorder: 'border-sky-500/20',
    dotBg: 'bg-sky-500',
    glowColor: 'rgba(2, 132, 199, 0.2)',
    label: 'READY',
  },
};

export function getRiskLevelStyle(level: string | undefined): StatusStyleConfig {
  const norm = (level || 'LOW').toUpperCase();
  if (norm.includes('CRIT')) return RISK_COLOR_SYSTEM.CRITICAL;
  if (norm.includes('HIGH')) return RISK_COLOR_SYSTEM.HIGH;
  if (norm.includes('MOD')) return RISK_COLOR_SYSTEM.MODERATE;
  if (norm.includes('SAFE')) return RISK_COLOR_SYSTEM.SAFE;
  return RISK_COLOR_SYSTEM.LOW;
}

export function getWorkflowStatusStyle(status: string | undefined): StatusStyleConfig {
  const norm = (status || 'SUBMITTED').toUpperCase().replace(/_/g, ' ');
  if (norm === 'RESOLVED') return WORKFLOW_STATUS_CONFIG.RESOLVED;
  if (norm === 'VERIFIED') return WORKFLOW_STATUS_CONFIG.VERIFIED;
  if (norm === 'UNDER REVIEW') return WORKFLOW_STATUS_CONFIG['UNDER REVIEW'];
  return WORKFLOW_STATUS_CONFIG.SUBMITTED;
}
