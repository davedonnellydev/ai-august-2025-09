import { render, screen, waitFor } from '@/test-utils';
import { Landing } from './Landing';

// Mock fetch
global.fetch = jest.fn();

describe('Landing component', () => {
  const mockUserId = 'test-user-id';
  const mockJobs = [
    {
      id: '1',
      title: 'Frontend Developer',
      company: { id: '1', name: 'Acme Corp' },
      location: 'Sydney, Australia',
      status: 'new' as const,
      decision: 'undecided' as const,
      createdAt: '2025-01-15T00:00:00Z',
    },
    {
      id: '2',
      title: 'Backend Developer',
      company: { id: '2', name: 'TechCorp' },
      location: 'Melbourne, Australia',
      status: 'applied' as const,
      decision: 'apply' as const,
      createdAt: '2025-01-14T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard title', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Landing userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Job Application Dashboard')).toBeInTheDocument();
    });
  });

  it('displays job statistics', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Landing userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Total Jobs')).toBeInTheDocument();
      expect(screen.getByText('Active Applications')).toBeInTheDocument();
      expect(screen.getByText('Pending Decisions')).toBeInTheDocument();

      // Check that we have the correct number of statistics cards
      const totalJobsElements = screen.getAllByText('2');
      expect(totalJobsElements.length).toBeGreaterThan(0);
    });
  });

  it('displays charts when data is available', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Landing userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Job Status Distribution')).toBeInTheDocument();
      expect(screen.getByText('Decision Distribution')).toBeInTheDocument();
    });
  });

  it('displays recent activity section', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Landing userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Recent Job Activity')).toBeInTheDocument();
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    render(<Landing userId={mockUserId} />);

    await waitFor(() => {
      // Check that we have statistics cards with zero values
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
      expect(screen.getByText('No job data available')).toBeInTheDocument();
      expect(screen.getByText('No recent job activity')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'API Error' }),
    });

    render(<Landing userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Landing userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });
  });

  it('renders without crashing', () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    expect(() => render(<Landing userId={mockUserId} />)).not.toThrow();
  });
});
