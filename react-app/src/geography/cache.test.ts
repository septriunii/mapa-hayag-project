import { ResourceCache, ResourceError } from './cache';
import { loadConfig } from '../config/loadConfig';

describe('validated request cache', () => {
  it('deduplicates simultaneous consumers and repeated navigation', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ title: 'MAPA-Hayag' })));
    const cache = new ResourceCache(fetcher);
    const first = loadConfig('https://example.test/data.json', cache);
    const second = loadConfig('https://example.test/data.json', cache);
    expect(second).toBe(first);
    expect((await first).title).toBe('MAPA-Hayag');
    await loadConfig('https://example.test/data.json', cache);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['http', 'json', 'schema', 'network'])('evicts a %s failure and permits retry', async kind => {
    const fetcher = vi.fn<typeof fetch>();
    if (kind === 'http') fetcher.mockResolvedValueOnce(new Response('', { status: 404 }));
    if (kind === 'json') fetcher.mockResolvedValueOnce(new Response('{broken'));
    if (kind === 'schema') fetcher.mockResolvedValueOnce(new Response('{"alignment":"wrong"}'));
    if (kind === 'network') fetcher.mockRejectedValueOnce(new Error('offline'));
    fetcher.mockResolvedValueOnce(new Response('{}'));
    const cache = new ResourceCache(fetcher);
    await expect(loadConfig('https://example.test/data.json', cache)).rejects.toBeInstanceOf(ResourceError);
    expect((await loadConfig('https://example.test/data.json', cache)).alignment).toBe('nir');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
