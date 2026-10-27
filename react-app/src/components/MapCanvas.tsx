import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { easeCubicInOut, select, zoom, zoomIdentity } from 'd3';
import type { ZoomBehavior, ZoomTransform } from 'd3';
import type { CSSProperties } from 'react';
import { GeographicLabels } from './GeographicLabels';
import type { MapConfig } from '../config/schema';
import { createColorLookup } from '../config/colors';
import { makePath, paddedBounds } from '../geography/projection';
import { administrativeBoundaries } from '../geography/boundaries';
import { featureCode } from '../geography/psgc';
import { nameProperty, type GeographicFeature } from '../geography/types';
import type { MapView } from '../navigation/view';
import { formatRoute } from '../navigation/routes';
import { useViewport } from '../hooks/useViewport';

interface Props { view: MapView; config: MapConfig; onSelect: (feature: GeographicFeature) => void; busy: boolean; selected?: { view: MapView; code: string } }

function viewPath(view: MapView, width: number, height: number) {
  return makePath(width, height, view.route.level === 'national' ? undefined : paddedBounds(view.collection.features, view.route.level === 'municity'));
}

export function MapCanvas({ view, config, onSelect, busy, selected }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const behavior = useRef<ZoomBehavior<SVGSVGElement, unknown>>(null);
  const { width, height } = useViewport();
  const [displayed, setDisplayed] = useState(view);
  const [animating, setAnimating] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [transform, setTransform] = useState(zoomIdentity);
  const [labelScale, setLabelScale] = useState(1);
  const currentTransform = useRef(transform);
  const updateTransform = (value: ZoomTransform) => { currentTransform.current = value; setTransform(value); };
  useEffect(() => {
    if (!svg.current) return;
    const element = select(svg.current);
    const interaction = zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 20])
      .on('zoom', event => updateTransform(event.transform))
      .on('end', event => setLabelScale(event.transform.k));
    behavior.current = interaction;
    element.call(interaction).on('dblclick.zoom', null);
    return () => { element.on('.zoom', null); interaction.on('zoom', null).on('end', null); behavior.current = null; };
  }, []);
  useEffect(() => {
    if (view === displayed) return;
    let frame = 0;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const nextCode = view.route.level === 'region' ? view.route.region : view.route.level === 'province' ? view.route.province : view.route.level === 'municity' ? view.route.municity : undefined;
    const target = nextCode && displayed.collection.features.find(feature => featureCode(feature, displayed.level) === nextCode);
    const forward = formatRoute(view.route).startsWith(formatRoute(displayed.route)) && target;
    const duration = reducedMotion ? 0 : forward ? 700 : 200;
    const start = currentTransform.current;
    let end = start;
    if (forward) {
      const [[x0, y0], [x1, y1]] = viewPath(displayed, width, height).bounds(target);
      const scale = Math.min(1e4, 0.85 * Math.min(width / Math.max(x1 - x0, 0.00001), height / Math.max(y1 - y0, 0.00001)));
      end = zoomIdentity.translate(width / 2 - scale * (x0 + x1) / 2, height / 2 - scale * (y0 + y1) / 2).scale(scale);
    }
    setAnimating(true);
    const started = performance.now();
    const tick = (now: number) => {
      const progress = duration ? Math.min(1, (now - started) / duration) : 1;
      const t = easeCubicInOut(progress);
      if (forward) updateTransform(zoomIdentity.translate(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t).scale(start.k + (end.k - start.k) * t));
      else setOpacity(1 - t);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        setDisplayed(view);
        setAnimating(false);
        setOpacity(1);
        if (svg.current && behavior.current) select(svg.current).call(behavior.current.transform, zoomIdentity);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); setOpacity(1); setAnimating(false); };
  }, [view, displayed, width, height]);
  const disabled = busy || animating || displayed !== view;
  // React owns rendered transforms, paths and labels. D3 owns gesture listeners
  // and supplies coordinates; animation frames also commit through React state.
  useEffect(() => { behavior.current?.filter(event => !disabled && (!event.ctrlKey || event.type === 'wheel') && !event.button); }, [disabled]);
  const labelPath = useMemo(() => viewPath(displayed, width, height), [displayed, width, height]);
  return <svg ref={svg} aria-label={displayed.route.level === 'national' ? 'Philippines national map' : `${displayed.details?.name} map`}
    aria-busy={disabled} data-view={formatRoute(displayed.route)} viewBox={`0 0 ${width} ${height}`} className="block h-full w-full touch-none cursor-grab active:cursor-grabbing">
    <g key={formatRoute(displayed.route)} transform={transform.toString()} opacity={opacity}
      style={{ '--map-label-counter-scale': 1 / transform.k } as CSSProperties} className={disabled ? 'pointer-events-none' : undefined}>
      <GeographicLayer view={displayed} config={config} onSelect={onSelect} selected={selected} disabled={disabled} width={width} height={height} />
      <GeographicLabels view={displayed} path={labelPath}
        width={width} scale={labelScale} disabled={disabled} onSelect={onSelect} />
    </g>
  </svg>;
}

const GeographicLayer = memo(function GeographicLayer({ view, config, onSelect, selected, disabled, width, height }: Omit<Props, 'busy'> & { disabled: boolean; width: number; height: number }) {
  const path = useMemo(() => viewPath(view, width, height), [view, width, height]);
  const color = useMemo(() => createColorLookup(config), [config]);
  const boundaries = useMemo(() => administrativeBoundaries(view.collection), [view.collection]);
  const boundaryPath = useMemo(() => path(boundaries) ?? '', [path, boundaries]);
  const shapes = useMemo(() => view.collection.features.map(feature => ({ feature, code: featureCode(feature, view.level), d: path(feature) ?? '', fill: color(view.level, featureCode(feature, view.level)) })), [view, path, color]);
  const lineworkClass = view.level === 'region' ? 'map-linework-region' : view.level === 'province' ? 'map-linework-province' : 'map-linework-municipality';
  return <>
    {view.background?.features.map((feature, index) => <path key={index} className="region-bg pointer-events-none" d={path(feature) ?? ''} fill="var(--color-land)" stroke="none" />)}
    {shapes.map(({ feature, code, d, fill }) => <path key={code} data-psgc={code} d={d} data-choropleth={fill !== 'var(--color-land)' || undefined}
      fill={fill} vectorEffect="non-scaling-stroke" role="button" tabIndex={disabled ? -1 : 0} aria-label={feature.properties[nameProperty[view.level]] ?? code}
      aria-pressed={(selected?.view === view && selected.code === code) || (view.route.level === 'municity' && view.route.municity === code)}
      onClick={event => { if (!disabled && !event.defaultPrevented) onSelect(feature); }} onKeyDown={event => { if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(feature); } }}
      className="map-feature motion-safe:animate-map-shapes cursor-pointer focus-visible:outline-none" />)}
    <path data-administrative-borders="" aria-hidden="true" d={boundaryPath} fill="none" vectorEffect="non-scaling-stroke"
      className={`map-boundaries ${lineworkClass} motion-safe:animate-map-shapes pointer-events-none`} />
  </>;
});
