import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { geographyFixture } from '../../tests/geographyFixture';
import { resourceCache } from '../config/loadConfig';
import { parseRoute } from '../navigation/routes';
import { useMapNavigation } from './useMapNavigation';

beforeEach(() => { window.history.replaceState(null, '', '/#/'); });
afterEach(() => { resourceCache.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('ignores an older pending region response and removes browser listeners on unmount', async () => {
  const { config, repository, fetcher } = geographyFixture();
  const national = (await repository.national()).collection;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let waiting = false;
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async input => {
    if (String(input).includes('provdists-region-900000000')) { waiting = true; await gate; }
    return fetcher(input);
  }));
  const add = vi.spyOn(window, 'addEventListener'), remove = vi.spyOn(window, 'removeEventListener');
  const { result, unmount } = renderHook(() => useMapNavigation(config, national, 'https://map.test/data.json'), { wrapper: StrictMode });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  act(() => result.current.navigate(parseRoute('#/region/900000000')));
  await waitFor(() => expect(waiting).toBe(true));
  act(() => result.current.navigate(parseRoute('#/region/1300000000')));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => { release(); await gate; });
  expect(result.current.view?.route).toEqual(parseRoute('#/region/1300000000'));
  unmount();
  for (const [event, listener] of add.mock.calls.filter(([event]) => event === 'popstate' || event === 'hashchange')) {
    expect(remove).toHaveBeenCalledWith(event, listener);
  }
});
