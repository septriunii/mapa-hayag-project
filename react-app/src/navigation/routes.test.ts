import { formatRoute, parentRoute, parseRoute } from './routes';

describe('route foundation', () => {
  it.each(['#/', '#/region/600000000', '#/region/1800000000/province/604500000', '#/region/1800000000/province/604500000/municity/630200000', '#/region/1300000000/municity/1380100000'])('round trips %s without shadowing municipality routes', hash => {
    expect(formatRoute(parseRoute(hash))).toBe(hash);
  });
  it.each(['#/region/123junk', '#/region/0', '#/region/600000000/wrong/4', '#/province/1', '#/region/1/province/2/municity/3/extra'])('rejects invalid route %s', hash => expect(() => parseRoute(hash)).toThrow());
  it('uses the full known ancestry to calculate a parent', () => {
    expect(formatRoute(parentRoute(parseRoute('#/region/1800000000/province/604500000/municity/630200000')))).toBe('#/region/1800000000/province/604500000');
    expect(formatRoute(parentRoute(parseRoute('#/region/1300000000/municity/1380100000')))).toBe('#/region/1300000000');
  });
});
