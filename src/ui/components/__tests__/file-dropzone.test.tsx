
import { render, screen } from '@testing-library/react';
import { FileDropzone } from '@/ui/components/file-dropzone';
import { useTransferStore } from '@/core/transfer';
import { useDropzone } from 'react-dropzone';

// Mock the transfer store
jest.mock('@/core/transfer', () => ({
  useTransferStore: jest.fn(),
}));

// Mock react-dropzone
jest.mock('react-dropzone');

describe('FileDropzone', () => {
  const mockAddFiles = jest.fn();
  const mockUseDropzone = useDropzone as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useTransferStore as jest.Mock).mockReturnValue({
        addFiles: mockAddFiles,
    });
    mockUseDropzone.mockReturnValue({
      getRootProps: (props: any) => ({ ...props, role: 'button' }),
      getInputProps: () => ({}),
      isDragActive: false,
    });
  });

  it('renders the dropzone with initial text', () => {
    render(<FileDropzone />);
    expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('calls addFiles on file drop', () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    
    // We need to capture the onDrop callback passed to useDropzone
    let onDropCallback: (files: File[]) => void = () => {};
    mockUseDropzone.mockImplementation((options: any) => {
      onDropCallback = options.onDrop;
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false,
      };
    });

    render(<FileDropzone />);
    
    // Manually call the captured onDrop callback
    onDropCallback([file]);

    expect(mockAddFiles).toHaveBeenCalledWith([file]);
  });

  it('changes appearance when dragging a file over', () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ className: 'border-dashed' }),
      getInputProps: () => ({}),
      isDragActive: true,
    });
    
    render(<FileDropzone />);
    
    const dropzoneCard = screen.getByText(/Drop the files here/i).closest('.border-dashed');
    expect(dropzoneCard).toHaveClass('border-accent bg-accent/10');
  });
});
