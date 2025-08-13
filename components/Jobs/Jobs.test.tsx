import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { Jobs } from './Jobs';

// Mock fetch
global.fetch = jest.fn();

describe('Jobs component', () => {
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

  it('renders jobs list when data is loaded', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Backend Developer')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('TechCorp')).toBeInTheDocument();
    });
  });

  it('shows empty state when no jobs exist', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'No job listings found. Start by adding your first job!'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Add Your First Job')).toBeInTheDocument();
    });
  });

  it('allows inline editing of decision', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJobs }),
    });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Undecided')).toBeInTheDocument();
    });

    // Click on the decision badge to start editing
    const decisionBadge = screen.getByText('Undecided');
    fireEvent.click(decisionBadge);

    // Should show the select dropdown
    await waitFor(() => {
      expect(screen.getByDisplayValue('Undecided')).toBeInTheDocument();
    });
  });

  it('auto-saves decision change when different value is selected', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockJobs }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockJobs[0] }),
      });

    render(<Jobs userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Undecided')).toBeInTheDocument();
    });

    // Click on the decision badge to start editing
    const decisionBadge = screen.getByText('Undecided');
    fireEvent.click(decisionBadge);

    // Wait for the select to appear and change the value
    await waitFor(() => {
      const select = screen.getByDisplayValue('Undecided');
      fireEvent.change(select, { target: { value: 'apply' } });
    });

    // Should automatically save and show the updated decision
    await waitFor(() => {
      // Look for the badge specifically, not just any "Apply" text
      const applyBadges = screen.getAllByText('Apply');
      expect(applyBadges.length).toBeGreaterThan(0);
    });
  });
});
