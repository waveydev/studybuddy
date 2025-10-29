import { render, screen } from '@testing-library/react';

// Mock axios to avoid importing the ESM build in tests and to prevent real HTTP calls
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: [] }),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
}));

// Mock react-hot-toast so tests don't require the package and to suppress UI
jest.mock('react-hot-toast', () => {
  const React = require('react');
  const fn = () => null;
  const toastFn = Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  });
  return { Toaster: fn, toast: toastFn };
}, { virtual: true });

import App from './App';

test('renders StudyBuddy header', async () => {
  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<App />);
  // App header should be visible
  expect(await screen.findByText(/StudyBuddy/i)).toBeInTheDocument();
  errSpy.mockRestore();
});
