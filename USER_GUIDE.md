# BlackWire User Guide

Welcome to BlackWire! This guide will walk you through all the features of the application, from sending your first file to managing trusted devices.

## Table of Contents

1.  [Sending Files](#1-sending-files)
2.  [Connecting to Another Device](#2-connecting-to-another-device)
    -   [Method A: Pairing with QR Code / Text (Recommended)](#method-a-pairing-with-qr-code--text-recommended)
    -   [Method B: Sharing a Link](#method-b-sharing-a-link)
3.  [Managing Your Devices](#3-managing-your-devices)
    -   [Trusting a Device](#trusting-a-device)
    -   [Auto-Reconnecting](#auto-reconnecting)
4.  [Viewing Transfer History](#4-viewing-transfer-history)
5.  [Benchmarking Performance](#5-benchmarking-performance)

---

## 1. Sending Files

Sending files is simple and intuitive.

1.  **Add Files:** Drag and drop any files or folders directly onto the "Drag & drop files here" area on the main page. Alternatively, click the area to open a file browser.
2.  **Queue:** Your selected files will appear in the "Transfer Queue" table. You can add more files or remove them by clicking the trash icon.
3.  **Connect:** Establish a connection with another device using one of the methods described below.
4.  **Send:** Once you are connected to a peer, the "Send" button in the header will become active. Click it to begin transferring all the files in your queue.

The application will show you the progress and transfer speed for each file in real-time.

## 2. Connecting to Another Device

You have two primary ways to connect to another peer.

### Method A: Pairing with QR Code / Text (Recommended)

This is the most secure method for pairing two devices.

1.  Click the **"Pair Device"** button in the header. A dialog will open.
2.  **On Device 1 (Sender):**
    -   The "Share Offer" tab is selected by default. A unique QR code and a text block will be displayed.
3.  **On Device 2 (Receiver):**
    -   Click "Pair Device" and switch to the **"Connect to Offer"** tab.
    -   You can either:
        -   Use your device's camera to scan the QR code from Device 1 (if your browser supports it).
        -   Paste the text offer from Device 1 into the "Connection Offer from Peer" text area and click **"Receive Offer"**.
    -   Your device will now generate an **"Answer"**.
4.  **On Device 1 (Sender):**
    -   Paste the "Answer" from Device 2 into the "Paste Answer from Peer" text area.
    -   Click **"Connect"**.

The devices will establish a secure, end-to-end encrypted connection.

### Method B: Sharing a Link

This method is convenient for sending a connection offer to someone who is not physically nearby.

1.  Click the **"Share via Link"** button in the header.
2.  A dialog will appear and generate a unique, single-use URL.
3.  Click **"Copy"** and send this link to the person you want to connect with.
4.  When the receiver opens the link, their browser will generate an "Answer". They must send this answer back to you.
5.  You must then paste their answer into the **"Pair Device"** dialog (as described in Method A, step 4) to complete the connection.

**Note:** The link is only valid while your browser tab remains open.

## 3. Managing Your Devices

The "My Devices" panel on the right side of the main screen lists all the peers you have previously connected to.

### Trusting a Device

For devices you own or connect to frequently, you can establish a cryptographic trust relationship.

1.  **Connect:** First, establish a successful connection with the device. This completes a secure key exchange in the background.
2.  **Trust:** In the "My Devices" list, click the **"Trust Device"** button next to the connected peer. The icon will change to a shield, and a "verified" badge will appear on subsequent connections.

A trusted connection provides two key benefits:
-   **Cryptographic Verification:** The app guarantees you are connecting to the exact same device every time.
-   **Auto-Reconnect:** The app will try to automatically reconnect to trusted devices when you open it.

### Auto-Reconnecting

Once a device is trusted, the application will attempt to automatically reconnect to it on startup, saving you the effort of pairing manually.

## 4. Viewing Transfer History

The application keeps a log of all your completed and failed transfers.

-   Click on the **"History"** link in the left sidebar to view the log.
-   The history page shows the file name, size, peer, status, and timestamp for each transfer.
-   You can clear the entire history by clicking the **"Clear History"** button.

## 5. Benchmarking Performance

If you are interested in the technical performance of your P2P connection, you can use the built-in benchmark tool.

1.  Click on the **"Benchmark"** link in the left sidebar.
2.  Establish a connection with a peer.
3.  Click the **"Start Benchmark Test"** button.

The application will send 100 MB of in-memory data to your peer and measure the throughput in Mbps. The results are saved and displayed in a chart, allowing you to track performance over time.
