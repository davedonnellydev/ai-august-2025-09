import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { NewJob } from './NewJob';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('NewJob component', () => {
  const mockUserId = 'test-user-id';
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the new job form', () => {
    render(<NewJob userId={mockUserId} onBack={mockOnBack} />);

    expect(screen.getByText('Add New Job')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g., Frontend Developer')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g., Sydney, Australia')
    ).toBeInTheDocument();
    expect(screen.getByText('Create Job')).toBeInTheDocument();
  });

  it('renders all form sections', () => {
    render(<NewJob userId={mockUserId} onBack={mockOnBack} />);

    expect(screen.getByText('Job Details')).toBeInTheDocument();
    expect(screen.getByText('Salary Information')).toBeInTheDocument();
    expect(screen.getByText('Company Information')).toBeInTheDocument();
    expect(screen.getByText('Additional Information')).toBeInTheDocument();
  });

  it('has proper form structure with required fields', () => {
    render(<NewJob userId={mockUserId} onBack={mockOnBack} />);

    // Check for required fields by looking for the required attribute on inputs
    const titleInput = screen.getByPlaceholderText('e.g., Frontend Developer');
    const locationInput = screen.getByPlaceholderText(
      'e.g., Sydney, Australia'
    );

    expect(titleInput).toHaveAttribute('required');
    expect(locationInput).toHaveAttribute('required');

    // Check that form sections are present
    expect(screen.getByText('Work Mode')).toBeInTheDocument();
    expect(screen.getByText('Employment Type')).toBeInTheDocument();
    expect(screen.getByText('Seniority Level')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<NewJob userId={mockUserId} onBack={mockOnBack} />);

    const backButton = screen.getByText('Back to Jobs');
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when cancel button is clicked', () => {
    render(<NewJob userId={mockUserId} onBack={mockOnBack} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('submits form successfully with valid data', async () => {
    const mockResponse = {
      success: true,
      data: { id: '1' },
      message: 'Job created successfully',
    };
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    render(<NewJob userId={mockUserId} onBack={mockOnBack} />);

    const titleInput = screen.getByPlaceholderText('e.g., Frontend Developer');
    const locationInput = screen.getByPlaceholderText(
      'e.g., Sydney, Australia'
    );

    fireEvent.change(titleInput, { target: { value: 'Test Job' } });
    fireEvent.change(locationInput, { target: { value: 'Test Location' } });

    const submitButton = screen.getByText('Create Job');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Job Created Successfully!')).toBeInTheDocument();
    });
  });

  it('shows error when API call fails', async () => {
    const mockResponse = { success: false, error: 'API Error' };
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    render(<NewJob userId={mockUserId} onBack={mockOnBack} />);

    const titleInput = screen.getByPlaceholderText('e.g., Frontend Developer');
    const locationInput = screen.getByPlaceholderText(
      'e.g., Sydney, Australia'
    );

    fireEvent.change(titleInput, { target: { value: 'Test Job' } });
    fireEvent.change(locationInput, { target: { value: 'Test Location' } });

    const submitButton = screen.getByText('Create Job');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});
