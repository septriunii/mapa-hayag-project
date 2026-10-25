import { useEffect, useRef } from 'react';
import type { DataRecord, MapConfig } from '../config/schema';

interface Props {
  open: boolean;
  config: MapConfig;
  onClose: () => void;
  selection?: { name: string; parent: string; typeLabel: string; record?: DataRecord };
}
export function DetailsDrawer({ open, config, onClose, selection }: Props) {
  const drawer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);
  const rows = selection?.record ? config.detailFields.filter(field => selection.record?.[field.key] != null) : [];
  return (
    <div ref={drawer} id="detail" role="complementary" aria-label="Location details" inert={!open}
      className={`fixed inset-y-0 left-0 z-20 flex w-[min(360px,100%)] flex-col overflow-hidden border-r border-panel-border bg-panel text-white transition-[transform,visibility] duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'visible [transform:translateX(0)]' : 'invisible [transform:translateX(-100%)]'}`}>
      <div id="detail-header" className="shrink-0 border-b border-panel-divider px-5 pt-4 pb-3.5">
        <div id="detail-header-row" className="mb-2.5 flex items-center justify-between">
          <div id="detail-eyebrow" className="mb-1.5 font-mono text-[10px] leading-none tracking-[1.5px] text-[rgba(255,255,255,0.35)] uppercase">{selection?.typeLabel ?? config.title}</div>
          <button id="detail-close" type="button" aria-label="Close details menu" onClick={onClose} className="cursor-pointer border-0 bg-transparent font-[Arial] text-[18px] leading-none text-[rgba(255,255,255,0.4)] transition-colors hover:text-white">✕</button>
        </div>
        <div id="detail-lgu-name" className="mb-1 text-[22px] leading-[1.2] font-semibold text-white">{selection?.name ?? 'Philippines'}</div>
        <div id="detail-region" className="text-[12px] text-[rgba(255,255,255,0.45)]">{selection?.parent ?? 'Select a region to begin'}</div>
      </div>
      <div id="detail-body" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {!selection ? <div className="py-5"><p className="mt-2 text-[12px] leading-[1.8] text-map-text">{config.description}</p></div>
          : rows.length ? rows.map(field => <div key={field.key} className="flex items-baseline justify-between gap-3 border-b border-panel-divider py-2 last:border-0">
            <span className="shrink-0 font-mono text-[10px] tracking-[0.8px] text-[rgba(255,255,255,0.4)] uppercase">{field.label}</span>
            <span className="text-right text-[13px] text-[rgba(255,255,255,0.85)]">{displayValue(selection.record?.[field.key])}</span>
          </div>) : <div className="py-10 text-center text-[13px] leading-[1.8] text-[rgba(255,255,255,0.2)]">No data for this area.</div>}
      </div>
    </div>
  );
}

function displayValue(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
