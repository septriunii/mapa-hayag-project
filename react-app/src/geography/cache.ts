export class ResourceError extends Error {
  constructor(public readonly url: string, message: string, options?: ErrorOptions) {
    super(`${message}: ${url}`, options);
    this.name = 'ResourceError';
  }
}

/** One shared promise per URL and parser kind, including in-flight requests.
 * Rejections are evicted for retry. Components ignore stale results on cleanup;
 * unmounting one consumer must not abort a request another consumer shares.
 */
export class ResourceCache {
  private readonly requests = new Map<string, Promise<unknown>>();
  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args)) {}

  load<T>(url: string, kind: string, validate: (value: unknown) => T): Promise<T> {
    const key = `${kind}:${url}`;
    const previous = this.requests.get(key);
    if (previous) return previous as Promise<T>;
    const request = (async () => {
      try {
        const response = await this.fetcher(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return validate(await response.json());
      } catch (cause) {
        throw new ResourceError(url, cause instanceof Error ? cause.message : 'Loading failed', { cause });
      }
    })();
    this.requests.set(key, request);
    void request.catch(() => { if (this.requests.get(key) === request) this.requests.delete(key); });
    return request;
  }

  clear() { this.requests.clear(); }
}
