import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the API client so tests make no HTTP calls. Plain functions, not jest.fn:
// CRA resets jest.fn implementations before every test.
jest.mock('./api', () => ({
  __esModule: true,
  API_BASE: 'http://test',
  default: {
    get: (url) => {
      const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const data = {
        '/tasks/': [
          {
            id: 1, title: 'Read chapter 3', description: '', priority: 'high', status: 'pending',
            category: 'reading', course: 1, due_date: soon, estimated_minutes: 45,
            completed_at: null, created_at: soon, subtasks: [], focus_minutes: 0,
          },
        ],
        '/courses/': [{ id: 1, name: 'Biology', code: 'BIO101', color: '#30a46c' }],
        '/sessions/': [],
      };
      return Promise.resolve({ data: data[url] });
    },
    post: () => Promise.resolve({ data: {} }),
    patch: () => Promise.resolve({ data: {} }),
    delete: () => Promise.resolve({}),
  },
}));

jest.mock('react-hot-toast', () => {
  const noop = () => {};
  const toast = Object.assign(noop, { success: noop, error: noop, dismiss: noop });
  return { Toaster: () => null, toast };
});

import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = jest.fn();
});

test('shows the brand and the loaded task on the Today view', async () => {
  render(<App />);
  expect(screen.getByText('StudyBuddy')).toBeInTheDocument();
  expect(await screen.findByText('Read chapter 3')).toBeInTheDocument();
  expect(screen.getByText('Biology')).toBeInTheDocument();
});

test('navigates between views', async () => {
  render(<App />);
  await screen.findByText('Read chapter 3');

  userEvent.click(screen.getByRole('button', { name: /^Focus/ }));
  expect(await screen.findByRole('timer')).toHaveTextContent('25:00');

  userEvent.click(screen.getByRole('button', { name: /^Courses/ }));
  expect(await screen.findByRole('heading', { name: 'Biology' })).toBeInTheDocument();
});

test('opens the new task dialog', async () => {
  render(<App />);
  await screen.findByText('Read chapter 3');
  userEvent.click(screen.getByRole('button', { name: /^New task N/ }));
  expect(await screen.findByRole('dialog', { name: 'New task' })).toBeInTheDocument();
});
