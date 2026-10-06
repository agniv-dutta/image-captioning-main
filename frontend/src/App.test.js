import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Image Captioning product shell', () => {
  render(<App />);
  expect(screen.getAllByText(/image captioning/i).length).toBeGreaterThan(0);
});