import { render, screen } from '@/test-utils';
import { Landing } from './Landing';

describe('Landing component', () => {
  it('renders the landing dashboard text', () => {
    render(<Landing />);
    expect(
      screen.getByText('This is the landing dashboard.')
    ).toBeInTheDocument();
  });

  it('renders with correct styling classes', () => {
    render(<Landing />);
    const textElement = screen.getByText('This is the landing dashboard.');
    expect(textElement).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    expect(() => render(<Landing />)).not.toThrow();
  });
});
