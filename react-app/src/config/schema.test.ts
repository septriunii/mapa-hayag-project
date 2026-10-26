import { readFileSync } from 'node:fs';
import { parseConfig } from './schema';
import { normalizePsgc } from '../geography/psgc';
import { createColorLookup } from './colors';

describe('configuration compatibility', () => {
  it('loads the unchanged production config and defaults to NIR', () => {
    const config = parseConfig(JSON.parse(readFileSync('../data.json', 'utf8')));
    expect(config.title).toBe('MAPAhayag project');
    expect(config.alignment).toBe('nir');
    expect(config.maxDepth).toBe('municity');
  });
  it('accepts explicit legacy alignment and unknown comment fields', () => {
    expect(parseConfig({ alignment: 'legacy', _comment: 'documentation' }).alignment).toBe('legacy');
  });
  it.each([
    { maxDepth: 'barangay' }, { alignment: 'standard' }, { colorField: 'value' },
    { colorField: 'value', colorDomain: [100, 0], colorScheme: 'interpolateBlues' },
    { colorField: 'value', colorDomain: [0, 100], colorScheme: 'select' },
    { data: { region: [{ psgc: 100 }, { psgc: '0000000100' }] } },
    { data: { region: [{ psgc: '100abc' }] } },
    { colorField: 'value', colorDomain: [0, 100], colorScheme: 'interpolateBlues', data: { region: [{ psgc: 100, value: '82' }] } },
  ])('rejects invalid configuration %j', input => { expect(() => parseConfig(input)).toThrow(); });
  it('normalizes leading-zero representation without translating code vintages', () => {
    expect(normalizePsgc('0604500000')).toBe(normalizePsgc(604500000));
    expect(normalizePsgc(604500000)).not.toBe(normalizePsgc(1804500000));
    expect(() => normalizePsgc('0')).toThrow();
  });
  it('matches records, clamps colors, and supplies the semantic missing-data color', () => {
    const input = { colorField: 'value', colorDomain: [0, 100], colorScheme: 'interpolateBlues', data: { region: [{ psgc: 100, value: 100 }, { psgc: 200, value: 999 }] } };
    const color = createColorLookup(parseConfig(input));
    expect(color('region', '0000000100')).toBe(color('region', 200));
    expect(color('region', 300)).toBe('var(--color-land)');
  });
});
