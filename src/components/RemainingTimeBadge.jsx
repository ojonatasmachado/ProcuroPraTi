import React from 'react';
import { getSearchRemainingMs, normalizeSearchDuration } from '@/lib/searchDuration';

const DAY_MS = 24 * 60 * 60 * 1000;

const getUrgency = (remainingMs) => {
  if (remainingMs <= 0) return 'expired';
  if (remainingMs <= DAY_MS) return 'urgent';
  if (remainingMs <= 3 * DAY_MS) return 'soon';
  return 'calm';
};

const URGENCY_STYLES = {
  expired: { text: 'text-muted-foreground', bg: 'bg-muted', ring: 'text-muted-foreground' },
  urgent: { text: 'text-danger', bg: 'bg-destructive/10', ring: 'text-danger' },
  soon: { text: 'text-warning', bg: 'bg-warning/10', ring: 'text-warning' },
  calm: { text: 'text-primary', bg: 'bg-primary/10', ring: 'text-primary' },
};

const formatLabel = (remainingMs, compact) => {
  if (remainingMs <= 0) return compact ? 'Encerrando' : 'Encerrando';
  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / (60 * 60 * 1000));
  if (compact) return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  return days > 0 ? `${days} dia${days === 1 ? '' : 's'} restante${days === 1 ? '' : 's'}` : `${hours}h restantes`;
};

// Anel de progresso + rótulo colorido por urgência, no lugar do texto cinza
// "X dias restantes" que passava despercebido igual em qualquer prazo.
const RemainingTimeBadge = ({ procura, compact = false, className = '' }) => {
  const remainingMs = getSearchRemainingMs(procura);
  const totalMs = normalizeSearchDuration(procura?.duration) * DAY_MS;
  const elapsedFraction = totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 1;
  const style = URGENCY_STYLES[getUrgency(remainingMs)];

  const size = compact ? 16 : 20;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 ${style.bg} ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-border" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * elapsedFraction}
          strokeLinecap="round"
          className={style.ring}
        />
      </svg>
      <span className={`text-[11px] font-bold leading-none ${style.text}`}>{formatLabel(remainingMs, compact)}</span>
    </span>
  );
};

export default RemainingTimeBadge;
