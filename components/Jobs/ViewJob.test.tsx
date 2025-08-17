import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { ViewJob } from './ViewJob';

// Mock fetch
global.fetch = jest.fn();

describe('ViewJob component', () => {
  const mockJobId = 'test-job-id';
  const mockUserId = 'test-user-id';
  const mockOnBack = jest.fn();
  const mockOnEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders lead details when data is loaded', async () => {
    const mockLead = {
      id: mockJobId,
      url: 'https://example.com/job',
      type: 'job_posting',
      title: 'Software Engineer',
      company: 'Example Corp',
      location: 'San Francisco',
      seniority: 'Mid-level',
      employmentType: 'Full-time',
      workMode: 'Remote',
      status: 'new',
      canonicalJobKey: 'job-123',
      anchorText: 'Apply Now',
      confidence: '85',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLead,
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Example Corp')).toBeInTheDocument();
      expect(screen.getByText('📍 San Francisco')).toBeInTheDocument();
    });
  });

  it('displays status and type badges', async () => {
    const mockLead = {
      id: mockJobId,
      url: 'https://example.com/job',
      type: 'job_posting',
      title: 'Software Engineer',
      company: 'Example Corp',
      status: 'new',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLead,
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Job posting')).toBeInTheDocument();
    });
  });

  it('displays lead details correctly', async () => {
    const mockLead = {
      id: mockJobId,
      url: 'https://example.com/job',
      type: 'job_posting',
      title: 'Software Engineer',
      company: 'Example Corp',
      location: 'San Francisco',
      seniority: 'Mid-level',
      employmentType: 'Full-time',
      workMode: 'Remote',
      status: 'new',
      canonicalJobKey: 'job-123',
      anchorText: 'Apply Now',
      confidence: '85',
      tags: ['React', 'TypeScript'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLead,
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Details')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/job')).toBeInTheDocument();
      expect(screen.getByText('Mid-level')).toBeInTheDocument();
      expect(screen.getByText('Full-time')).toBeInTheDocument();
      expect(screen.getByText('Remote')).toBeInTheDocument();
      expect(screen.getByText('job-123')).toBeInTheDocument();
      expect(screen.getByText('Apply Now')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', async () => {
    const mockLead = {
      id: mockJobId,
      url: 'https://example.com/job',
      type: 'job_posting',
      title: 'Software Engineer',
      company: 'Example Corp',
      status: 'new',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLead,
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      const backButton = screen.getByText('Back to Leads');
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  it('renders all lead sections', async () => {
    const mockLead = {
      id: mockJobId,
      url: 'https://example.com/job',
      type: 'job_posting',
      title: 'Software Engineer',
      company: 'Example Corp',
      status: 'new',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLead,
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Details')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
  });

  it('handles missing optional fields gracefully', async () => {
    const mockLead = {
      id: mockJobId,
      url: 'https://example.com/job',
      type: 'job_posting',
      title: 'Software Engineer',
      status: 'new',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLead,
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/job')).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      expect(screen.getByText('Back to Leads')).toBeInTheDocument();
    });
  });

  it('handles API error response', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Lead not found' }),
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Lead not found')).toBeInTheDocument();
      expect(screen.getByText('Back to Leads')).toBeInTheDocument();
    });
  });

  it('opens URL in new tab when view original button is clicked', async () => {
    const mockLead = {
      id: mockJobId,
      url: 'https://example.com/job',
      type: 'job_posting',
      title: 'Software Engineer',
      company: 'Example Corp',
      status: 'new',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLead,
    });

    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    await waitFor(() => {
      const viewOriginalButton = screen.getByText('View Original');
      fireEvent.click(viewOriginalButton);
      expect(mockOpen).toHaveBeenCalledWith(
        'https://example.com/job',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });
});
