import { render, screen } from '@testing-library/react';
import profiles from '../data/geographic-profiles.json';
import sources from '../data/geographic-sources.json';
import { parseProfileCatalog } from '../profiles/schema';
import { GeographicProfile } from './GeographicProfile';
import { DetailsDrawer } from './DetailsDrawer';
import { parseConfig } from '../config/schema';
import { normalizePsgc } from '../geography/psgc';

const catalog = parseProfileCatalog(profiles, sources);
const profile = catalog.profiles.get('region:0900000000')!;
it('shows dated statistics, explicit missing values, Sulu notice and safe official links', () => {
  render(<GeographicProfile profile={profile} sources={catalog.sources} />);
  expect(screen.getByText('5,089,934')).toBeInTheDocument();
  expect(screen.getByText('0900000000')).toBeInTheDocument();
  expect(screen.getAllByText('Data unavailable')).toHaveLength(2);
  expect(screen.getByRole('complementary', { name: 'Administrative boundary notice' })).toHaveTextContent('does not include Sulu');
  expect(screen.getByRole('heading', { name: 'Sources and Data Notes' })).toBeInTheDocument();
  expect(screen.getAllByText('As of', { exact: false }).length).toBeGreaterThan(0);
  for (const link of screen.getAllByRole('link')) {
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

it('treats profile markup as text and clears old profiles on loading and failure', () => {
  const attack = '<img src=x onerror="window.injected=true">';
  const edited = structuredClone(profile); edited.sections[0].paragraphs[0].text = attack;
  const props = { open: true, config: parseConfig({}), onClose: () => {}, profile: edited, sources: catalog.sources };
  const { container, rerender } = render(<DetailsDrawer {...props} />);
  expect(screen.getByText(attack)).toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
  const body = container.querySelector('#detail-body')!; body.scrollTop = 300;
  rerender(<DetailsDrawer {...props} busy />);
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(body.scrollTop).toBe(0);
  expect(screen.getByText('Loading location details…')).toBeInTheDocument();
  rerender(<DetailsDrawer {...props} navigationError="HTTP 503" />);
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(screen.getByText('Location unavailable')).toBeInTheDocument();
});

it('keeps configured records with a profile and falls back if profile validation fails', () => {
  const config = parseConfig({ detailFields: [{ key: 'value', label: 'Custom metric' }] });
  const selection = { name: 'Region IX', parent: 'Philippines', typeLabel: 'Region', record: { psgc: normalizePsgc('900000000'), value: 42 } };
  const props = { open: true, config, selection, onClose: () => {} };
  const { rerender } = render(<DetailsDrawer {...props} profile={profile} sources={catalog.sources} />);
  expect(screen.getByText('Custom metric')).toBeInTheDocument();
  expect(screen.getByText('42')).toBeInTheDocument();
  rerender(<DetailsDrawer {...props} profileError="Geographic profile unavailable." />);
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(screen.getByText('42')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Geographic profile unavailable.');
});
