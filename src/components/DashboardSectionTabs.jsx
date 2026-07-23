import React from 'react';

const DashboardSectionTabs = ({ value, onChange, items }) => (
  <div className="grid min-h-12 w-full grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 shadow-sm" role="tablist" aria-label="Seções de procuras">
    {items.map(({ value: itemValue, label, count, icon: Icon }) => {
      const active = value === itemValue;
      return (
        <button
          key={itemValue}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(itemValue)}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span>{label} ({count})</span>
        </button>
      );
    })}
  </div>
);

export default DashboardSectionTabs;
