
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropzone } from '../file-dropzone';
import { useTransferStore } from '@/core/transfer';

// Mock the transfer store
jest.mock('@/core/transfer', () => ({
  useTransferStore: jest.fn(),
}));

describe('FileDropzone', () => {
  const mockAddFiles = jest.fn();
  
  beforeEach(() => {
    (useTransferStore as jest.Mock).mockReturnValue(mockAddFiles);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dropzone with initial text', () => {
    render(<FileDropzone />);
    expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('calls addFiles on file drop', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    render(<FileDropzone />);
    const dropzone = screen.getByRole('button'); // The card has been given button role via getRootProps

    // The react-dropzone library handles the file drop event simulation internally
    // but we can trigger the onDrop manually for a unit test.
    const { rerender } = render(<FileDropzone />);

    // Get the onDrop function from the mocked useDropzone
    const onDrop = (useTransferStore as jest.Mock).mock.calls[0][0](s => s.addFiles);
    
    // We need to re-mock the store to return the addFiles function itself
    (useTransferStore as jest.Mock).mockImplementation(callback => callback({ addFiles: mockAddFiles }));

    rerender(<FileDropzone />);
    
    // Simulate drop
    const dropzoneElement = screen.getByText(/Drag & drop files here/i).closest('div.cursor-pointer');
    
    // To properly simulate, we need to mock a drop event.
    // However, react-dropzone makes this tricky. We'll test the callback directly.
    // This is a known pattern for testing react-dropzone's `onDrop`.
    
    const { getRootProps } = require('react-dropzone');
    const { onDrop: onDropFromProps } = getRootProps();
    
    onDropFromProps({
        preventDefault: jest.fn(),
        dataTransfer: { files: [file] }
    });

    expect(mockAddFiles).toHaveBeenCalledWith([file]);
  });

  it('changes appearance when dragging a file over', () => {
    render(<FileDropzone />);
    const dropzoneCard = screen.getByText(/Drag & drop files here/i).closest('.border-dashed');
    expect(dropzoneCard).not.toHaveClass('border-accent bg-accent/10');

    fireEvent.dragEnter(dropzoneCard!);
    
    expect(dropzoneCard).toHaveClass('border-accent bg-accent/10');
    expect(screen.getByText(/Drop the files here/i)).toBeInTheDocument();

    fireEvent.dragLeave(dropzoneCard!);

    expect(dropzoneCard).not.toHaveClass('border-accent bg-accent/10');
    expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument();
  });
});
