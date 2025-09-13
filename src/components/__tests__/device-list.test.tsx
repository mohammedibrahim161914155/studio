
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceList } from '@/ui/components/device-list';
import { usePeerManagerStore, Peer } from '@/core/peer-manager';
import { usePeerStore } from '@/connection/peer';
import { useToast } from '@/hooks/use-toast';

// Mock the stores and hooks
jest.mock('@/core/peer-manager');
jest.mock('@/connection/peer');
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock child components to prevent issues with their own logic
jest.mock('@/ui/input', () => ({
  Input: (props: any) => <input data-testid="mock-input" {...props} />,
}));
jest.mock('@/ui/switch', () => ({
  Switch: (props: any) => <input type="checkbox" role="switch" {...props} />,
}));


describe('DeviceList', () => {
  const mockUsePeerManagerStore = usePeerManagerStore as jest.Mock;
  const mockUsePeerStore = usePeerStore as jest.Mock;
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    mockUsePeerStore.mockReturnValue({
        connectToPeer: jest.fn(),
        activePeer: null,
        destroyPeer: jest.fn(),
        status: 'disconnected'
    });
    mockUsePeerManagerStore.mockReturnValue({
        peers: [],
        removePeer: jest.fn(),
        updatePeerName: jest.fn(),
        updatePeerTrusted: jest.fn(),
    });
  });

  it('renders "no paired devices" message when there are no peers', () => {
    render(<DeviceList />);
    expect(screen.getByText(/No paired devices/)).toBeInTheDocument();
  });

  it('renders a list of peers', () => {
    const peers: Peer[] = [
      { id: '1', name: 'Laptop', status: 'disconnected', trusted: false },
      { id: '2', name: 'Phone', status: 'connected', trusted: true },
    ];
    mockUsePeerManagerStore.mockReturnValue({ peers });
    render(<DeviceList />);

    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('calls connectToPeer when connect button is clicked', () => {
    const connectToPeer = jest.fn();
    mockUsePeerStore.mockReturnValue({
      connectToPeer,
      status: 'disconnected',
      activePeer: null,
      destroyPeer: jest.fn(),
    });
    const peers: Peer[] = [{ id: '1', name: 'Laptop', status: 'disconnected', trusted: false }];
    mockUsePeerManagerStore.mockReturnValue({ peers });
    
    render(<DeviceList />);
    
    fireEvent.click(screen.getByText('Connect'));
    
    expect(connectToPeer).toHaveBeenCalledWith(peers[0]);
    expect(mockToast).toHaveBeenCalledWith({ title: 'Connecting...', description: 'Attempting to connect to Laptop.' });
  });

   it('calls destroyPeer when disconnect button is clicked', () => {
    const destroyPeer = jest.fn();
    const peer: Peer = { id: '1', name: 'Laptop', status: 'connected', trusted: false };
    mockUsePeerStore.mockReturnValue({
      destroyPeer,
      status: 'connected',
      activePeer: peer,
      connectToPeer: jest.fn(),
    });
     mockUsePeerManagerStore.mockReturnValue({ peers: [peer] });
    
    render(<DeviceList />);
    
    fireEvent.click(screen.getByText('Disconnect'));
    
    expect(destroyPeer).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({ title: 'Disconnected', description: 'Disconnected from Laptop.' });
  });

  it('allows editing and saving a peer name', async () => {
    const updatePeerName = jest.fn();
    const peers: Peer[] = [{ id: '1', name: 'Old Name', status: 'disconnected', trusted: false }];
    mockUsePeerManagerStore.mockReturnValue({ peers, updatePeerName });

    render(<DeviceList />);

    // Enter edit mode by clicking the edit button
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    const input = await screen.findByDisplayValue('Old Name');
    expect(input).toBeInTheDocument();

    // Change name and save
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /check/i }));

    expect(updatePeerName).toHaveBeenCalledWith('1', 'New Name');
    expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument(); // Input field should disappear
  });

  it('calls removePeer when remove button is clicked', () => {
    const removePeer = jest.fn();
    const peers: Peer[] = [{ id: '1', name: 'Peer to Remove', status: 'disconnected', trusted: false }];
     mockUsePeerManagerStore.mockReturnValue({ peers, removePeer });
    
    render(<DeviceList />);
    
    fireEvent.click(screen.getByRole('button', { name: /trash/i }));
    
    expect(removePeer).toHaveBeenCalledWith('1');
    expect(mockToast).toHaveBeenCalledWith({ variant: 'destructive', title: 'Peer Removed', description: 'Peer to Remove has been removed from your list.' });
  });

   it('toggles the trusted status of a peer', () => {
    const updatePeerTrusted = jest.fn();
    const peers: Peer[] = [{ id: '1', name: 'Test Peer', status: 'disconnected', trusted: false }];
    mockUsePeerManagerStore.mockReturnValue({ peers, updatePeerTrusted });

    render(<DeviceList />);

    const switchControl = screen.getByRole('switch');
    fireEvent.click(switchControl);

    expect(updatePeerTrusted).toHaveBeenCalledWith('1', true);
  });
});
