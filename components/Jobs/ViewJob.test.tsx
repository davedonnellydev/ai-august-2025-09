import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { ViewJob } from './ViewJob';

// Mock fetch
global.fetch = jest.fn();

describe('ViewJob component', () => {
  const mockUserId = 'test-user-id';
  const mockJobId = 'test-job-id';
  const mockOnBack = jest.fn();
  const mockOnEdit = jest.fn();

  const mockJob = {
    id: 'test-job-id',
    title: 'Frontend Developer',
    company: {
      id: '1',
      name: 'Acme Corp',
      website: 'https://acme.com',
      location: 'Sydney',
    },
    location: 'Sydney, Australia',
    workMode: 'hybrid',
    employmentType: 'full-time',
    seniority: 'mid',
    salaryMin: '80000',
    salaryMax: '120000',
    currency: 'AUD',
    url: 'https://jobs.acme.com/frontend',
    description: 'Join our team to build modern web applications.',
    status: 'new',
    decision: 'undecided',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(
      <ViewJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onEdit={mockOnEdit}
      />
    );

    const loadingOverlay = document.querySelector(
      '.mantine-LoadingOverlay-root'
    );
    expect(loadingOverlay).toBeInTheDocument();
  });

  it('renders job details when data is loaded', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
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
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Sydney, Australia')).toBeInTheDocument();
    });
  });

  it('displays status and decision badges', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
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
      expect(screen.getByText('Undecided')).toBeInTheDocument();
    });
  });

  it('formats salary information correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
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
      // Look for the salary text within the Salary Information section
      const salarySection = screen
        .getByText('Salary Information')
        .closest('.mantine-Card-root');
      expect(salarySection).toHaveTextContent('AUD80,000 - AUD120,000');
    });
  });

  it('shows error when API call fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'API Error' }),
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
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
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
      const backButton = screen.getByText('Back to Jobs');
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onEdit when edit button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
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
      const editButton = screen.getByText('Edit Job');
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });

  it('renders all job sections', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
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
      expect(screen.getByText('Job Details')).toBeInTheDocument();
      expect(screen.getByText('Salary Information')).toBeInTheDocument();
      expect(screen.getByText('Company Information')).toBeInTheDocument();
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
    });
  });

  it('handles missing optional fields gracefully', async () => {
    const jobWithMinimalData = {
      ...mockJob,
      workMode: undefined,
      employmentType: undefined,
      seniority: undefined,
      salaryMin: undefined,
      salaryMax: undefined,
      currency: undefined,
      url: undefined,
      description: undefined,
      company: { id: '1', name: 'Acme Corp' },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: jobWithMinimalData }),
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
      // Check that at least one "Not specified" text exists
      const notSpecifiedTexts = screen.getAllByText('Not specified');
      expect(notSpecifiedTexts.length).toBeGreaterThan(0);
    });
  });
});
