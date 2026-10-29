import { useEffect, useRef } from 'react';
import type { DataRecord, MapConfig } from '../config/schema';
import type { GeographicProfileData, GeographicSource } from '../profiles/schema';
import { GeographicProfile } from './GeographicProfile';

interface Props {
  open: boolean;
  config: MapConfig;
  onClose: () => void;
  selection?: { name: string; parent: string; typeLabel: string; record?: DataRecord };
  profile?: GeographicProfileData;
  sources?: ReadonlyMap<string, GeographicSource>;
  busy?: boolean;
  navigationError?: string;
  profileError?: string;
  selectionKey?: string;
}
export function DetailsDrawer({ open, config, onClose, selection, profile, sources, busy, navigationError, profileError, selectionKey }: Props) {
  const drawer = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [profile?.key, selectionKey, busy, navigationError]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);
  const rows = selection?.record ? config.detailFields.filter(field => selection.record?.[field.key] != null) : [];
  return (
    <div ref={drawer} id="detail" role="complementary" aria-label="Location details" inert={!open}
      className={`fixed inset-y-0 left-0 z-20 flex w-[min(360px,100%)] flex-col overflow-hidden border-r border-divider bg-panel font-ui text-text-primary transition-[transform,visibility] duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'visible [transform:translateX(0)]' : 'invisible [transform:translateX(-100%)]'}`}>
      <div id="detail-header" className="shrink-0 border-b border-divider px-5 pt-4 pb-3.5">
        <div id="detail-header-row" className="mb-2.5 flex items-center justify-between">
          <div id="detail-eyebrow" className="mb-1.5 text-[10px] leading-none tracking-[1.5px] text-text-secondary uppercase">{busy || navigationError ? config.title : selection?.typeLabel ?? (profile ? `${config.title} · ${profile.levelLabel}` : config.title)}</div>
          <button id="detail-close" type="button" aria-label="Close details menu" onClick={onClose} className="cursor-pointer border-0 bg-transparent font-[Arial] text-[18px] leading-none text-text-secondary transition-colors hover:text-text-primary">✕</button>
        </div>
        <div id="detail-lgu-name" className="mb-1 text-[22px] leading-[1.2] font-semibold text-text-primary">{busy ? 'Loading…' : navigationError ? 'Location unavailable' : selection?.name ?? profile?.name ?? 'Philippines'}</div>
        <div id="detail-region" className="text-[12px] text-text-secondary">{busy || navigationError ? 'Location details' : selection?.parent ?? profile?.subtitle ?? 'Select a region to begin'}</div>
      </div>
      <div ref={body} id="detail-body" tabIndex={0} aria-label="Location information" aria-busy={busy || undefined} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {busy ? <p role="status">Loading location details…</p> : navigationError ? <p>{navigationError}</p> : <>
        {profileError && <p role="status" className="mb-3 text-[12px] text-text-secondary">{profileError}</p>}
        {!selection && <div className={profile ? 'pb-4' : 'py-5'}><p id="map-description" className="mt-2 text-[12px] leading-[1.8] text-text-primary">{config.description}</p></div>}
        {selection && rows.length > 0 && <div className={profile ? 'mb-4' : undefined} aria-label="Configured location data">{rows.map(field => <div key={field.key} className="flex items-baseline justify-between gap-3 border-b border-divider py-2 last:border-0">
            <span className="shrink-0 text-[10px] tracking-[0.8px] text-text-secondary uppercase">{field.label}</span>
            <span className="text-right text-[13px] text-text-primary">{displayValue(selection.record?.[field.key])}</span>
          </div>)}</div>}
        {profile && sources ? <GeographicProfile profile={profile} sources={sources} /> : selection && !rows.length ? <div className="py-10 text-center text-[13px] leading-[1.8] text-text-secondary">No data for this area.</div> : null}
        </>}
      </div>
    </div>
  );
}

function displayValue(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
