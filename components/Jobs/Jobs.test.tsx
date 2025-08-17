import { render, screen } from '@/test-utils';
import { Leads } from './Jobs';

// Mock fetch
global.fetch = jest.fn();

describe('Leads', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders leads table when leads are available', async () => {
    const mockLeads = [
      {
        id: '1',
        url: 'https://example.com/job1',
        type: 'job_posting',
        title: 'Software Engineer',
        company: 'Example Corp',
        location: 'San Francisco',
        status: 'new',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ leads: mockLeads }),
    });

    render(<Leads userId={mockUserId} />);

    expect(await screen.findByText('Leads')).toBeInTheDocument();
    expect(await screen.findByText('Software Engineer')).toBeInTheDocument();
    expect(await screen.findByText('Example Corp')).toBeInTheDocument();
    expect(await screen.findByText('San Francisco')).toBeInTheDocument();
  });

  it('renders empty state when no leads are available', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ leads: [] }),
    });

    render(<Leads userId={mockUserId} />);

    expect(await screen.findByText('No leads found')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Leads will appear here once you configure watched labels and sync your Gmail.'
      )
    ).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Leads userId={mockUserId} />);

    expect(
      await screen.findByText('Network error occurred')
    ).toBeInTheDocument();
  });

  it('displays correct table columns', async () => {
    const mockLeads = [
      {
        id: '1',
        url: 'https://example.com/job1',
        type: 'job_posting',
        title: 'Software Engineer',
        company: 'Example Corp',
        location: 'San Francisco',
        status: 'new',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ leads: mockLeads }),
    });

    render(<Leads userId={mockUserId} />);

    expect(await screen.findByText('Status')).toBeInTheDocument();
    expect(await screen.findByText('URL')).toBeInTheDocument();
    expect(await screen.findByText('Type')).toBeInTheDocument();
    expect(await screen.findByText('Title')).toBeInTheDocument();
    expect(await screen.findByText('Company')).toBeInTheDocument();
    expect(await screen.findByText('Location')).toBeInTheDocument();
    expect(await screen.findByText('First Seen')).toBeInTheDocument();
    expect(await screen.findByText('Actions')).toBeInTheDocument();
  });
});
