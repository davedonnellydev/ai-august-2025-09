import { render, screen, waitFor } from '@/test-utils';
import { Jobs } from './Jobs';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Jobs component', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock to return a pending promise by default
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
  });

  it('renders loading state initially', async () => {
    render(<Jobs userId={mockUserId} />);

    // Initially shows loading overlay - check for the LoadingOverlay component by class
    const loadingOverlay = document.querySelector(
      '.mantine-LoadingOverlay-root'
    );
    expect(loadingOverlay).toBeInTheDocument();
  });

  it('renders jobs table when data is loaded', async () => {
    const mockJobs = [
      {
        id: '1',
        title: 'Frontend Developer',
        company: { id: '1', name: 'Acme Corp', location: 'Sydney' },
        location: 'Sydney, Australia',
        status: 'new',
        decision: 'undecided',
        createdAt: '2025-01-15T00:00:00Z',
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Job Listings')).toBeInTheDocument();
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Sydney, Australia')).toBeInTheDocument();
    });
  });

  it('renders empty state when no jobs', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Job Listings')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No job listings found. Start by adding your first job!'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Add Your First Job')).toBeInTheDocument();
    });
  });

  it('renders error state when API fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'API Error' }),
    });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('displays correct status badges', async () => {
    const mockJobs = [
      {
        id: '1',
        title: 'Test Job',
        company: { id: '1', name: 'Test Company' },
        status: 'applied',
        decision: 'apply',
        createdAt: '2025-01-15T00:00:00Z',
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Job Listings')).toBeInTheDocument();
      expect(screen.getByText('Applied')).toBeInTheDocument();
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });
  });
});
