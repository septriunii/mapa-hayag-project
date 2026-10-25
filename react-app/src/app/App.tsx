import { useCallback, useEffect, useState } from 'react';
import { useNationalData } from '../hooks/useNationalData';
import { useMapNavigation } from '../hooks/useMapNavigation';
import { DetailsDrawer } from '../components/DetailsDrawer';
import { MapCanvas } from '../components/MapCanvas';
import { locationDetails, selectionRoute, type LocationDetails, type MapView } from '../navigation/view';
import { parentRoute, parseRoute } from '../navigation/routes';
import type { GeographicCollection, GeographicFeature } from '../geography/types';
import type { MapConfig } from '../config/schema';

export function App() {
  const [retry, setRetry] = useState(0);
  const configUrl = new URL('./data.json', document.baseURI).href;
  const state = useNationalData(configUrl, new URLSearchParams(location.search).get('alignment'), retry);
  return <main className="h-dvh w-full bg-map text-map-text" aria-label="MAPA-Hayag map">
    {state.status === 'ready' ? <MapApplication config={state.config} national={state.national.collection} configUrl={configUrl} />
      : <MapStatus error={state.status === 'error' ? state.message : undefined} onRetry={() => setRetry(value => value + 1)} text="Loading…" />}
  </main>;
}

function MapApplication({ config, national, configUrl }: { config: MapConfig; national: GeographicCollection; configUrl: string }) {
  const navigation = useMapNavigation(config, national, configUrl);
  const { view, navigate } = navigation;
  const [drawerOpen, setDrawerOpen] = useState(() => !window.matchMedia?.('(pointer: coarse)').matches);
  const [selected, setSelected] = useState<{ view: MapView; details: LocationDetails }>();
  useEffect(() => {
    if (view?.route.level === 'municity') setDrawerOpen(true);
    else if (view?.route.level === 'national') setDrawerOpen(!window.matchMedia?.('(pointer: coarse)').matches);
  }, [view]);
  const close = useCallback(() => {
    const previousFocus = document.activeElement;
    setDrawerOpen(false);
    requestAnimationFrame(() => {
      // Restore focus after the hamburger becomes visible, unless the user
      // has already moved focus to a map polygon or another control.
      if (document.activeElement === previousFocus || document.activeElement === document.body) document.getElementById('info-btn')?.focus();
    });
  }, []);
  const select = useCallback((feature: GeographicFeature) => {
    if (!view) return;
    const route = selectionRoute(view, feature, config);
    if (route) navigate(route);
    else {
      const parent = view.route.level === 'national' ? 'Philippines' : view.route.level === 'municity' ? view.details?.parent ?? '' : view.details?.name ?? '';
      setSelected({ view, details: locationDetails(feature, view.level, parent, config) });
      setDrawerOpen(true);
    }
  }, [view, config, navigate]);
  const back = () => {
    // Parent navigation works for a deep link opened in a fresh tab too.
    try { navigate(parentRoute(parseRoute(window.location.hash))); }
    catch { navigate({ level: 'national' }); }
  };
  const error = navigation.status === 'error' ? navigation.message : undefined;
  return <>
    {view && <MapCanvas view={view} config={config} onSelect={select} busy={navigation.status !== 'ready'} />}
    <button id="info-btn" type="button" aria-label="Open details menu" aria-controls="detail" aria-expanded={drawerOpen}
      onClick={() => setDrawerOpen(true)} className={`fixed top-4 left-4 z-10 h-11 w-11 cursor-pointer border border-control-border bg-control p-2.5 font-mono text-[24px] leading-none text-white hover:bg-control-hover ${drawerOpen ? 'hidden' : ''}`}>☰</button>
    {(view?.backLabel || error) && <button id="back-btn" type="button" onClick={back}
      className="fixed top-4 right-4 z-10 max-w-[calc(100%-92px)] cursor-pointer truncate border border-control-border bg-control px-3.5 py-1.5 font-mono text-[13px] tracking-[0.5px] text-white transition-colors hover:bg-control-hover">← {error ? 'Back' : view?.backLabel}</button>}
    <DetailsDrawer open={drawerOpen} config={config} onClose={close} selection={selected && selected.view === view ? selected.details : view?.details} />
    <MapStatus error={error} onRetry={navigation.retry} text={navigation.status === 'loading' ? 'Loading…' : view?.statusText ?? ''} warnings={navigation.status === 'ready' ? view?.warnings : undefined} />
  </>;
}

function MapStatus({ text, error, onRetry, warnings = [] }: { text: string; error?: string; onRetry: () => void; warnings?: string[] }) {
  return <div id="status" role={error ? 'alert' : 'status'} title={warnings.join('\n')}
    className="pointer-events-none fixed bottom-2 left-3 z-10 max-w-[calc(100%-24px)] bg-black/50 px-2 py-[3px] font-mono text-[11px] text-[#aaa]">
    {error ? <>{error} <button className="pointer-events-auto cursor-pointer underline" onClick={onRetry}>Retry</button></> : <>{text}{warnings.length > 0 && ` — ${warnings.length} source data warning${warnings.length === 1 ? '' : 's'}`}</>}
  </div>;
}
