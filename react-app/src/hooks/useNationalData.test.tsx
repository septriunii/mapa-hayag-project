import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { useNationalData } from './useNationalData';
import { resourceCache } from '../config/loadConfig';

const nir = JSON.parse(readFileSync('../geo-nir/country.0.001.json', 'utf8'));
const legacy = JSON.parse(readFileSync('../philippines-json-maps/2023/geojson/country/lowres/country.0.001.json', 'utf8'));
afterEach(() => { resourceCache.clear(); vi.unstubAllGlobals(); });

it('deduplicates StrictMode mount requests', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => new Response(JSON.stringify(String(input).endsWith('data.json') ? {} : nir)));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => useNationalData('https://map.test/data.json', null, 0), { wrapper: StrictMode });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(fetcher).toHaveBeenCalledTimes(2); // config plus national; not twice each
});

it('ignores a stale geographic response after alignment changes', async () => {
  let finishNir!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async input => {
    const url = String(input);
    if (url.endsWith('data.json')) return new Response('{}');
    if (url.includes('/geo-nir/')) return new Promise(resolve => { finishNir = resolve; });
    return new Response(JSON.stringify(legacy));
  }));
  const { result, rerender } = renderHook(({ alignment }) => useNationalData('https://map.test/data.json', alignment, 0), { initialProps: { alignment: 'nir' } });
  await waitFor(() => expect(finishNir).toBeTypeOf('function'));
  rerender({ alignment: 'legacy' });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => { finishNir(new Response(JSON.stringify(nir))); });
  expect(result.current.status === 'ready' && result.current.config.alignment).toBe('legacy');
});
