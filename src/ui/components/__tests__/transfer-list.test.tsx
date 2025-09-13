
import { render, screen } from '@testing-library/react';
import { TransferList } from '@/ui/components/transfer-list';
import { useTransferStore, TransferFile } from '@/core/transfer';

// Mock the transfer store
jest.mock('@/core/transfer', () => ({
  useTransferStore: jest.fn(),
}));

// Mock the child component
jest.mock('@/ui/components/transfer-list-item', () => ({
  TransferListItem: ({ transfer }: { transfer: TransferFile }) => (
    <tr>
      <td>{transfer.file.name}</td>
      <td>{transfer.status}</td>
    </tr>
  ),
}));

describe('TransferList', () => {
  const mockUseTransferStore = useTransferStore as jest.Mock;

  beforeEach(() => {
    mockUseTransferStore.mockReturnValue({
      files: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders "no files selected" message when the file list is empty', () => {
    render(<TransferList />);
    expect(screen.getByText(/No files selected/)).toBeInTheDocument();
  });

  it('renders a list of transfers when files are present', () => {
    const files: TransferFile[] = [
      {
        file: new File([''], 'file1.txt'),
        status: 'pending',
        progress: 0,
        speed: 0,
        lastSentBytes: 0,
        lastUpdateTime: 0,
        direction: 'sent',
      },
      {
        file: new File([''], 'file2.jpg'),
        status: 'sending',
        progress: 50,
        speed: 1024,
        lastSentBytes: 0,
        lastUpdateTime: 0,
        direction: 'sent',
      },
    ];
    mockUseTransferStore.mockReturnValue({ files });
    
    render(<TransferList />);
    
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.jpg')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('sending')).toBeInTheDocument();
  });
});
