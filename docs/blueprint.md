# **App Name**: BlackWire P2P

## Core Features:

- Core P2P Transfers: Enables peer-to-peer file transfers using WebRTC DataChannels with TURN/STUN fallback for robust connectivity.
- End-to-End Encryption: Provides secure file transfers with X25519 and AES-GCM/ChaCha20 encryption, forward secrecy, and post-quantum cryptography (PQC) hybrid (Kyber/Dilithium).
- Link-Based Sharing: Create one-time or expiring links with optional passwords for secure file sharing.
- QR Code Pairing: Facilitate secure onboarding through QR code pairing for devices without relying on passwords.
- Theming: Implement light and dark themes for enhanced user experience and accessibility.
- Zero-knowledge relays: servers never see plaintext.
- Metadata protection: filenames, sizes, patterns obfuscated.
- Chunked transfers: 1–4 MB chunks with parallel streams (8–16).
- Resumable transfers: Pause/resume, across sessions.
- Adaptive chunk sizing: Adaptive chunk sizing + auto-tuning.
- Optional Zstd compression: Optional Zstd compression per chunk.
- Multi-file & folder transfer: Drag & drop support.
- Offline queuing: Auto-send when online.
- Multi-device rooms: One-to-many transfers.
- File previews: Images, PDFs, text, partial streaming for large media.
- Streaming mode: Watch video/audio while downloading.
- Selective sync: Choose folders/files + versioning/rollback.
- Delivery receipts: Tamper-proof audit logs.
- Role-based access control (RBAC): Admin policies.
- Analytics dashboards: For enterprises.
- QR code / NFC / hardware token pairing: Secure onboarding.
- Self-hostable with Docker/K8s: Federated deployment option.
- Compliance modules: GDPR, HIPAA, ISO27001.
- White-labeling & developer SDK: Customization options.
- Modern theming: Dark/light, responsive UI, installable PWA.

## Style Guidelines:

- Primary color: Deep cobalt blue (#3D5A80) to convey security and trust, subtly nodding to the 'Black' in BlackWire.
- Background color: Very light desaturated blue (#E0FBFC) to create a clean, modern interface, using the blue hue from the primary.
- Accent color: Vivid coral (#EE6C4D) for interactive elements and calls to action, adding a touch of warmth and energy while contrasting the analogous hues.
- Font pairing: 'Space Grotesk' (sans-serif) for headers paired with 'Inter' (sans-serif) for body text; for a balance of modern tech aesthetic and readability.
- Code font: 'Source Code Pro' for displaying code snippets clearly.
- A clean, intuitive layout focusing on ease of use, suitable for both desktop and mobile PWA views.
- Use subtle animations to provide feedback during file transfers and other interactive actions.