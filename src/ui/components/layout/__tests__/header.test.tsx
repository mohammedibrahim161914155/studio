
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../header';
import { usePeerStore, PeerStatus } from '@/connection/peer';
import { useTransferStore, TransferFile } from '@/core/transfer';
import { useToast } from '@/hooks/use-toast';
import { Peer } from '@/core/peer-manager';

// Mock dependencies
jest.mock('@/connection/peer');
jest.mock('@/core/transfer');
jest.mock('@/hooks/use-toast');
jest.mock('@/ui/components/theme-toggle', () => ({ ThemeToggle: () => <div data-testid="theme-toggle" /> }));
jest.mock('@/ui/components/share-link-dialog', () => ({ ShareLinkDialog: () => <div data-testid="share-link-dialog" /> }));
jest.mock('@/ui/components/qr-code-dialog', () => ({ QrCodeDialog: () => <div data-testid="qr-code-dialog" /> }));

describe('Header', () => {
  const mockUsePeerStore = usePeerStore as jest.Mock;
  const mockUseTransferStore = useTransferStore as jest.Mock;
  const mockToast = jest.fn();

  // Mocks for a connected peer
  const connectedPeer: Peer = { id: '123', name: 'Test Peer', status: 'connected', trusted: true, offer: {type: 'offer', sdp: ''} };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    // Default mocks for a "happy path" scenario
    mockUsePeerStore.mockReturnValue({
      status: 'connected',
      activePeer: connectedPeer,
      send: jest.fn(),
      peer: { on: jest.fn(), removeListener: jest.fn() },
    });
    mockUseTransferStore.mockReturnValue({
      files: [],
      updateFileStatus: jest.fn(),
      updateFileProgress: jest.fn(),
      calculateFileChecksum: jest.fn().mockResolvedValue('checksum-123'),
      setFileChecksum: jest.fn(),
      getFile: jest.fn(),
    });
  });

  it('renders the header with title and action buttons', () => {
    render(<Header />);
    expect(screen.getByText('File Transfer')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('share-link-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('disables the send button if not connected', () => {
    mockUsePeerStore.mockReturnValue({ ...usePeerStore.getState(), status: 'disconnected' });
    const pendingFile = { file: new File([''], 'a.txt'), status: 'pending' } as TransferFile;
    mockUseTransferStore.mockReturnValue({ ...useTransferStore.getState(), files: [pendingFile] });
    
    render(<Header />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('disables the send button if there are no pending files', () => {
    mockUseTransferStore.mockReturnValue({ ...useTransferStore.getState(), files: [] });

    render(<Header />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('enables the send button when connected and there are pending files', () => {
    const pendingFile = { file: new File([''], 'a.txt'), status: 'pending' } as TransferFile;
    mockUseTransferStore.mockReturnValue({ ...useTransferStore.getState(), files: [pendingFile] });

    render(<Header />);
    const sendButton = screen.getByRole('button', {name: /send \(1\)/i});
    expect(sendButton).toBeEnabled();
  });

  it('shows a toast if send is clicked while not connected', () => {
    mockUsePeerStore.mockReturnValue({ ...usePeerStore.getState(), status: 'disconnected' });
    const pendingFile = { file: new File([''], 'a.txt'), status: 'pending' } as TransferFile;
    mockUseTransferStore.mockReturnValue({ ...useTransferStore.getState(), files: [pendingFile] });

    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /send \(1\)/i }));

    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Not Connected',
      description: 'Please connect to a peer before sending files.',
    });
  });

  it('shows a toast if send is clicked with no pending files', () => {
     mockUseTransferStore.mockReturnValue({ ...useTransferStore.getState(), files: [] });
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'No Files to Send',
      description: 'Add new files or clear completed ones to send again.',
    });
  });

  it('initiates file sending process on click', async () => {
    const mockSend = jest.fn();
    const mockUpdateFileStatus = jest.fn();
    const mockSetFileChecksum = jest.fn();
    const mockCalculateChecksum = jest.fn().mockResolvedValue('checksum-abc');
    
    const pendingFile = { file: new File(['test'], 'a.txt', {type: 'text/plain'}), status: 'pending', direction: 'sent' } as TransferFile;

    mockUsePeerStore.mockReturnValue({ ...usePeerStore.getState(), send: mockSend });
    mockUseTransferStore.mockReturnValue({
        ...useTransferStore.getState(),
        files: [pendingFile],
        updateFileStatus: mockUpdateFileStatus,
        setFileChecksum: mockSetFileChecksum,
        calculateFileChecksum: mockCalculateChecksum,
    });

    render(<Header />);
    
    const sendButton = screen.getByRole('button', { name: /send \(1\)/i });
    fireEvent.click(sendButton);

    // Check for "preparing" toast
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Preparing Files...',
      description: `Calculating checksums before sending.`,
    });
    
    // Wait for checksum calculation and metadata sending
    await screen.findByRole('button', { name: /send \(1\)/i });

    expect(mockCalculateChecksum).toHaveBeenCalledWith(pendingFile.file);
    expect(mockSetFileChecksum).toHaveBeenCalledWith('a.txt', 'checksum-abc');
    
    // Verify metadata is sent
    expect(mockSend).toHaveBeenCalledWith({
      type: 'metadata',
      payload: {
        name: 'a.txt',
        size: 4,
        type: 'text/plain',
        checksum: 'checksum-abc'
      }
    });

    // Check for "sending" toast
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sending Files',
      description: `Initiating transfer of 1 file(s) to ${connectedPeer.name}.`,
    });

    // Verify chunk is sent
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        type: 'chunk'
    }));

  });

});
