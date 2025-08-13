import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { EditJob } from './EditJob';

// Mock fetch
global.fetch = jest.fn();

describe('EditJob component', () => {
  const mockUserId = 'test-user-id';
  const mockJobId = 'test-job-id';
  const mockOnBack = jest.fn();
  const mockOnSave = jest.fn();

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
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    const loadingOverlay = document.querySelector(
      '.mantine-LoadingOverlay-root'
    );
    expect(loadingOverlay).toBeInTheDocument();
  });

  it('populates form with existing job data', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('Frontend Developer')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sydney, Australia')).toBeInTheDocument();
      expect(screen.getByDisplayValue('hybrid')).toBeInTheDocument();
      expect(screen.getByDisplayValue('full-time')).toBeInTheDocument();
      expect(screen.getByDisplayValue('mid')).toBeInTheDocument();
      expect(screen.getByDisplayValue('AUD')).toBeInTheDocument();
    });
  });

  it('renders all form sections', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Job Details')).toBeInTheDocument();
      expect(screen.getByText('Status and Decision')).toBeInTheDocument();
      expect(screen.getByText('Salary Information')).toBeInTheDocument();
      expect(screen.getByText('Company Information')).toBeInTheDocument();
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
    });
  });

  it('shows error when API call fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'API Error' }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
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
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const backButton = screen.getByText('Back to Job Details');
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onBack when cancel button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  it('submits form successfully with valid data', async () => {
    // Mock the GET request for fetching job data
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
    });

    // Mock the PUT request for updating job
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: mockJob,
        message: 'Job updated successfully',
      }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const submitButton = screen.getByText('Save Changes');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Job Updated Successfully!')).toBeInTheDocument();
    });
  });

  it('shows error when update API call fails', async () => {
    // Mock the GET request for fetching job data
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
    });

    // Mock the PUT request for updating job
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Update failed' }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const submitButton = screen.getByText('Save Changes');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('has proper form structure with required fields', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const titleInput = screen.getByDisplayValue('Frontend Developer');
      const locationInput = screen.getByDisplayValue('Sydney, Australia');

      expect(titleInput).toHaveAttribute('required');
      expect(locationInput).toHaveAttribute('required');
    });
  });

  it('displays status and decision options', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockJob }),
    });

    render(
      <EditJob
        jobId={mockJobId}
        userId={mockUserId}
        onBack={mockOnBack}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Decision')).toBeInTheDocument();
    });
  });
});
