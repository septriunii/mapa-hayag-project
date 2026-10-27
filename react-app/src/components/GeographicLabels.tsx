import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { labelGeometry, placeLabels } from '../geography/labels';
import { featureCode } from '../geography/psgc';
import { nameProperty, type GeographicFeature } from '../geography/types';
import type { makePath } from '../geography/projection';
import type { MapView } from '../navigation/view';

interface Props {
  view: MapView; path: ReturnType<typeof makePath>; width: number;
  scale: number; disabled: boolean; onSelect: (feature: GeographicFeature) => void;
}

export const GeographicLabels = memo(function GeographicLabels({ view, path, width, scale, disabled, onSelect }: Props) {
  const level = view.route.level === 'municity' ? 'city' : view.level;
  const metrics = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const size = parseFloat(style.getPropertyValue(`--map-label-${level}-size`)) * (width < 600 ? parseFloat(style.getPropertyValue('--map-label-mobile-scale')) : 1);
    const family = style.getPropertyValue('--font-map-label');
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${style.getPropertyValue('--map-label-weight')} ${size}px ${family}`;
    return { size, lineHeight: size * parseFloat(style.getPropertyValue('--map-label-line-height')),
      maxWidth: parseFloat(style.getPropertyValue(level === 'region' ? '--map-label-region-width' : '--map-label-width')),
      measure: (text: string) => context.measureText(text).width };
  }, [level, width]);
  const seeds = useMemo(() => view.collection.features.flatMap(feature => {
    const name = feature.properties[nameProperty[view.level]] ?? '';
    if (!name) return [];
    const geometry = labelGeometry(feature, path);
    if (!geometry) return [];
    return [{ ...geometry, code: featureCode(feature, view.level), name: view.level === 'region' ? name.match(/\(([^)]+)\)/)?.[1] ?? name : name }];
  }), [view, path]);
  const labels = useMemo(() => placeLabels(seeds, metrics.measure, metrics.maxWidth, metrics.lineHeight, scale, width), [seeds, metrics, scale, width]);
  const features = useMemo(() => new Map<string, GeographicFeature>(view.collection.features.map(feature => [featureCode(feature, view.level), feature])), [view]);
  const clickable = view.route.level === 'province';
  return <g data-map-labels="" data-font-ready="true" className={disabled ? 'pointer-events-none' : undefined}>
    {labels.map(label => <g key={label.code} transform={`translate(${label.anchor[0]},${label.anchor[1]})`}>
      <text data-label-psgc={label.code} data-label-name={label.name} aria-label={label.name}
        x={label.dx} y={label.dy - (label.lines.length - 1) * metrics.lineHeight / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ '--map-label-size': `${metrics.size}px` } as CSSProperties}
        className={`map-label map-label-${level} motion-safe:animate-map-labels ${clickable ? 'cursor-pointer' : 'pointer-events-none'}`}
        onClick={clickable ? () => { if (!disabled) onSelect(features.get(label.code)!); } : undefined}>
        {label.lines.map((line, index) => <tspan key={index} x={label.dx} dy={index ? metrics.lineHeight : 0}>{line}</tspan>)}
      </text>
    </g>)}
  </g>;
});
