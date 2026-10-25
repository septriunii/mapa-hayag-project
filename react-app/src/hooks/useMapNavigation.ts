import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MapConfig } from '../config/schema';
import { resourceCache } from '../config/loadConfig';
import { GeographicRepository } from '../geography/repository';
import type { GeographicCollection } from '../geography/types';
import { formatRoute, parseRoute, type MapRoute } from '../navigation/routes';
import { resolveView, type MapView } from '../navigation/view';

type State = { status: 'loading'; view?: MapView } | { status: 'ready'; view: MapView } | { status: 'error'; view?: MapView; message: string };

export function useMapNavigation(config: MapConfig, national: GeographicCollection, configUrl: string) {
  const repository = useMemo(() => new GeographicRepository(config, configUrl, resourceCache), [config, configUrl]);
  const [hash, setHash] = useState(() => window.location.hash);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    const restore = () => setHash(window.location.hash);
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => { window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore); };
  }, []);
  useEffect(() => {
    let active = true;
    setState(previous => ({ status: 'loading', view: previous.view }));
    void (async () => {
      const view = await resolveView(parseRoute(hash), config, national, repository);
      if (!active) return;
      const canonical = formatRoute(view.route);
      if (hash !== canonical) window.history.replaceState(null, '', canonical);
      setState({ status: 'ready', view });
    })().catch(error => {
      if (active) setState(previous => ({ status: 'error', view: previous.view, message: error instanceof Error ? error.message : 'Unable to load map' }));
    });
    return () => { active = false; };
  }, [hash, attempt, config, national, repository]);

  const navigate = useCallback((route: MapRoute) => {
    const next = formatRoute(route);
    if (window.location.hash !== next) window.history.pushState(null, '', next);
    setHash(next);
  }, []);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { ...state, navigate, retry };
}
