import { render, screen } from '@testing-library/react';
import { App } from './App';
import { vi } from 'vitest';

vi.mock('../hooks/useNationalData', () => ({ useNationalData: () => ({ status: 'loading' }) }));

it('mounts the isolated application shell', () => {
  render(<App />);
  expect(screen.getByRole('main', { name: 'MAPA-Hayag map' })).toBeInTheDocument();
});
