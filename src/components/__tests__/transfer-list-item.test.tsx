
import { render, screen, fireEvent } from '@testing-library/react';
import { TransferListItem } from '@/ui/components/transfer-list-item';
import { useTransferStore, TransferFile } from '@/core/transfer';

// Mock the transfer store
jest.mock('@/core/transfer', () => ({
  useTransferStore: jest.fn(),
}));

const mockRemoveFile = jest.fn();

describe('TransferListItem', () => {
  const baseFile = new File(['content'], 'test-file.txt', { type: 'text/plain' });
  
  beforeEach(() => {
    (useTransferStore as jest.Mock).mockReturnValue({
      removeFile: mockRemoveFile,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockTransfer = (overrides: Partial<TransferFile>): TransferFile => ({
    file: baseFile,
    progress: 0,
    status: 'pending',
    speed: 0,
    lastUpdateTime: 0,
    lastSentBytes: 0,
    direction: 'sent',
    ...overrides,
  });

  it('renders basic file information', () => {
    const transfer = createMockTransfer({
        progress: 25,
        file: new File([''], 'document.pdf', { type: 'application/pdf' })
    });
    render(<TransferListItem transfer={transfer} />);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('0 Bytes')).toBeInTheDocument(); // size
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('displays the correct status for "pending"', () => {
    const transfer = createMockTransfer({ status: 'pending' });
    render(<TransferListItem transfer={transfer} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays the correct status and speed for "sending"', () => {
    const transfer = createMockTransfer({ status: 'sending', speed: 1024 * 1024, progress: 50 }); // 1 MB/s
    render(<TransferListItem transfer={transfer} />);
    
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('1 MB/s')).toBeInTheDocument();
  });

  it('displays the correct status for "complete"', () => {
    const transfer = createMockTransfer({ status: 'complete' });
    render(<TransferListItem transfer={transfer} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('displays the correct status for "error"', () => {
    const transfer = createMockTransfer({ status: 'error' });
    render(<TransferListItem transfer={transfer} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('displays the correct status for "verifying"', () => {
    const transfer = createMockTransfer({ status: 'verifying' });
    render(<TransferListItem transfer={transfer} />);
    expect(screen.getByText('Verifying...')).toBeInTheDocument();
  });

  it('calls removeFile when trash icon is clicked', () => {
    const transfer = createMockTransfer({});
    render(<TransferListItem transfer={transfer} />);
    
    const removeButton = screen.getByRole('button', { name: /remove test-file.txt from queue/i });
    fireEvent.click(removeButton);

    expect(mockRemoveFile).toHaveBeenCalledWith('test-file.txt');
  });

  it('does not show transfer speed when status is not "sending"', () => {
    const transfer = createMockTransfer({ status: 'pending', speed: 1024 * 1024 });
    render(<TransferListItem transfer={transfer} />);
    expect(screen.queryByText('1 MB/s')).not.toBeInTheDocument();
  });

  it('formats bytes correctly', () => {
    const transfer = createMockTransfer({ 
        file: new File(new Uint8Array(1024 * 500), 'large-file.bin') // 500 KB
    });
    render(<TransferListItem transfer={transfer} />);
    expect(screen.getByText('500 KB')).toBeInTheDocument();
  });
});
