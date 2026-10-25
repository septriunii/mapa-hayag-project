import { fireEvent, render, screen } from '@testing-library/react';
import { parseConfig } from '../config/schema';
import { DetailsDrawer } from './DetailsDrawer';

it('renders configuration and data markup as literal text', () => {
  const attack = '<img src=x onerror="window.injected=true">';
  const config = parseConfig({ description: attack, detailFields: [{ key: 'notes', label: attack }], data: { region: [{ psgc: 1, notes: attack }] } });
  const { container, rerender } = render(<DetailsDrawer open config={config} onClose={() => {}} />);
  expect(screen.getByText(attack)).toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
  rerender(<DetailsDrawer open config={config} onClose={() => {}} selection={{ name: 'Region', parent: 'Philippines', typeLabel: 'Region', record: config.data.region[0] }} />);
  expect(screen.getAllByText(attack)).toHaveLength(2);
  expect(container.querySelector('img')).toBeNull();
});

it('closes on Escape and removes the document listener on unmount', () => {
  const close = vi.fn();
  const { unmount } = render(<DetailsDrawer open config={parseConfig({})} onClose={close} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
  unmount(); fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});
