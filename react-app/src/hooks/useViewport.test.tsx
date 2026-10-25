import { act, renderHook } from '@testing-library/react';
import { useViewport } from './useViewport';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('catches a resize between the initial render and listener subscription', () => {
  let width = 390, height = 844;
  vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => width);
  vi.spyOn(window, 'innerHeight', 'get').mockImplementation(() => height);
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'resize') { width = 844; height = 390; }
    add(type, listener, options);
  });
  const { result } = renderHook(() => useViewport());
  expect(result.current).toEqual({ width: 844, height: 390 });
});

it('measures settled dimensions once per frame and cleans up pending work', () => {
  let width = 390, height = 844;
  vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => width);
  vi.spyOn(window, 'innerHeight', 'get').mockImplementation(() => height);
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const remove = vi.spyOn(window, 'removeEventListener');
  const { result, unmount } = renderHook(() => useViewport());
  act(() => {
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    // Layout can settle after the event callback, before the next paint.
    width = 844; height = 390;
  });
  expect(frames.size).toBe(1);
  expect(result.current.width).toBe(390);
  act(() => { const callback = [...frames.values()][0]; frames.clear(); callback(16); });
  expect(result.current).toEqual({ width: 844, height: 390 });
  act(() => window.dispatchEvent(new Event('resize')));
  expect(frames.size).toBe(1);
  unmount();
  expect(frames.size).toBe(0);
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  act(() => window.dispatchEvent(new Event('resize')));
  expect(frames.size).toBe(0);
});
