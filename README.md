# BlackWire P2P

BlackWire is a high-performance, secure, and feature-rich peer-to-peer (P2P) file transfer application built with Next.js, React, and WebRTC. It is designed to match or exceed the functionality and performance of native solutions like Apple's AirDrop, but on the web.

The application allows for direct, end-to-end encrypted file transfers between any two devices with a modern web browser, without needing to upload files to a central server.

## Key Features

- **Any File Type:** Transfer any file, including documents, media, and large archives.
- **High Performance:** Utilizes WebRTC for direct P2P connections, maximizing transfer speed by avoiding server bottlenecks. Chunks are sent in parallel to saturate network capacity.
- **Cross-Session Resume:** If a transfer is interrupted, it can be seamlessly resumed later, even after a browser restart.
- **Cryptographic Trust:** A robust security model allows users to "trust" devices. Reconnections are cryptographically verified using a challenge-response handshake, ensuring you are always connected to the correct peer.
- **Multiple Transfer Modes:** Connect to peers via a QR Code, a secure shareable link, or by manually exchanging connection details.
- **Performance Benchmarking:** An integrated benchmark tool to measure raw P2P throughput.
- **Transfer History:** A persistent log of all completed and failed transfers.

---

## Documentation

For a complete understanding of how to use and develop the application, please refer to the guides below.

- **[📖 User Guide](./USER_GUIDE.md)**: A guide for end-users on how to use all the features of BlackWire.
- **[🛠️ Technical Guide](./TECHNICAL_GUIDE.md)**: A detailed guide for developers covering the architecture, state management, security model, and core logic.
