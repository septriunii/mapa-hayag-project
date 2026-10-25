import { useEffect, useState } from 'react';
import { z } from 'zod';
import { loadConfig, resourceCache } from '../config/loadConfig';
import type { MapConfig } from '../config/schema';
import { GeographicRepository } from '../geography/repository';
import type { GeographicResource } from '../geography/types';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; config: MapConfig; national: GeographicResource };
export function useNationalData(configUrl: string, alignmentOverride: string | null, retry: number): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void (async () => {
      const loaded = await loadConfig(configUrl);
      const config = alignmentOverride === null ? loaded : { ...loaded, alignment: z.enum(['nir', 'legacy']).parse(alignmentOverride) };
      const national = await new GeographicRepository(config, configUrl, resourceCache).national();
      if (active) setState({ status: 'ready', config, national });
    })().catch(error => { if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load map' }); });
    return () => { active = false; };
  }, [configUrl, alignmentOverride, retry]);
  return state;
}
