import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../theme-toggle';

describe('ThemeToggle', () => {
  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('toggles the theme on click', () => {
    // Set initial theme to light
    document.documentElement.classList.remove('dark');

    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });

    // Initially, the sun icon should be visible
    expect(screen.getByRole('button', { name: /switch to dark mode/i})).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');

    // First click, should switch to dark mode
    fireEvent.click(button);
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: /switch to light mode/i})).toBeInTheDocument();
    
    // Second click, should switch back to light mode
    fireEvent.click(button);
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByRole('button', { name: /switch to dark mode/i})).toBeInTheDocument();
  });

  it('initializes with the correct theme from the DOM', () => {
     // Set initial theme to dark
    document.documentElement.classList.add('dark');

    render(<ThemeToggle />);
    
    expect(screen.getByRole('button', { name: /switch to light mode/i})).toBeInTheDocument();

    document.documentElement.classList.remove('dark');
  })
});
