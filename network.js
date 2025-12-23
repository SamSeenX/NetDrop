import Peer from 'peerjs';
import * as Ably from 'ably';
import { hashString } from './utils';

// Debug Helper
function log(msg) {
    const el = document.getElementById('debug-log');
    if (el) {
        const line = document.createElement('div');
        line.textContent = `> ${msg}`;
        el.appendChild(line);
        el.scrollTop = el.scrollHeight;
    }
    console.log(msg);
}

export class NetworkManager {
    constructor(identity, onPeerFound, onPeerLost, onDataReceived, onStatusUpdate) {
        this.identity = identity; // { name, icon, id }
        this.onPeerFound = onPeerFound;
        this.onPeerLost = onPeerLost;
        this.onDataReceived = onDataReceived;
        this.onStatusUpdate = onStatusUpdate;
        this.peers = new Map(); // peerId -> { conn, meta }
        this.ably = null;
        this.myPeerId = null;
        this.peer = null;
    }

    async init() {
        // 1. Initialize PeerJS
        this.peer = new Peer();

        this.peer.on('open', (id) => {
            this.myPeerId = id;
            console.log('My Peer ID:', id);
            this.connectToAbly();
        });

        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => console.error('PeerJS Error:', err));
    }

    async connectToAbly() {
        // TODO: Replace with secure token auth or user input key
        // For MVP, we might need a public key or prompt
        const ABLY_KEY = import.meta.env.VITE_ABLY_KEY;

        if (!ABLY_KEY) {
            console.warn("Ably Key Missing! Discovery won't work.");
            alert("Please provide an Ably API Key in .env to enable discovery.");
            return;
        }

        this.ably = new Ably.Realtime({
            key: ABLY_KEY,
            clientId: this.myPeerId // Required for presence
        });
        log(`Ably connected with clientId: ${this.myPeerId}`);

        // Get Public IP to determine "Room"
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            const ipHash = await hashString(data.ip);
            const channelName = `netdrop-${ipHash}`;

            console.log('Joining Channel:', channelName);
            log(`Joining Room: ${channelName}`);

            // Notify UI of Room ID
            if (this.onStatusUpdate) {
                this.onStatusUpdate('connected', channelName.replace('netdrop-', ''));
            }

            const channel = this.ably.channels.get(channelName);

            // STEP 1: Subscribe to presence events FIRST
            channel.presence.subscribe('enter', (member) => {
                log(`Member ENTER: ${member.clientId} (${member.data?.name})`);
                this.handleMember(member);
            });
            channel.presence.subscribe('update', (member) => {
                log(`Member UPDATE: ${member.clientId} (${member.data?.name})`);
                this.handleMember(member);
            });
            channel.presence.subscribe('leave', (member) => {
                log(`Member LEFT: ${member.data?.peerId}`);
                if (member.data?.peerId) {
                    this.onPeerLost(member.data.peerId);
                }
            });

            // STEP 2: Enter presence
            log(`Entering presence as ${this.identity.name}...`);
            await channel.presence.enter({
                peerId: this.myPeerId,
                name: this.identity.name,
                icon: this.identity.icon
            });
            log('Presence entered successfully.');

            // STEP 3: Fetch existing members using async/await
            log('Fetching existing members...');
            try {
                const members = await channel.presence.get();
                log(`Found ${members ? members.length : 0} existing members.`);
                if (members && members.length > 0) {
                    members.forEach(m => {
                        log(`Existing: ${m.data?.name} (peerId: ${m.data?.peerId})`);
                        this.handleMember(m);
                    });
                }
            } catch (getErr) {
                log(`Presence Get Error: ${getErr.message}`);
            }

        } catch (e) {
            log(`Networking Init Failed: ${e.message}`);
            console.error("Networking Init Failed:", e);
        }
    }

    handleMember(member) {
        if (member.data.peerId === this.myPeerId) return; // Skip self

        // Notify UI
        this.onPeerFound({
            id: member.data.peerId,
            name: member.data.name,
            icon: member.data.icon
        });
    }

    connectToPeer(peerId) {
        if (this.peers.has(peerId)) return;
        const conn = this.peer.connect(peerId);
        this.handleConnection(conn);
    }

    handleConnection(conn) {
        conn.on('open', () => {
            this.peers.set(conn.peer, { conn });
        });

        conn.on('data', (data) => {
            this.onDataReceived(conn.peer, data);
        });

        conn.on('close', () => {
            this.peers.delete(conn.peer);
        });
    }

    async sendFile(peerId, file) {
        log(`Attempting to send file "${file.name}" to ${peerId}`);

        // Convert File to ArrayBuffer for reliable transfer
        const arrayBuffer = await file.arrayBuffer();
        log(`File converted to ArrayBuffer (${arrayBuffer.byteLength} bytes)`);

        const peer = this.peers.get(peerId);
        const sendData = (conn) => {
            log(`Sending file meta...`);
            conn.send({
                type: 'file-meta',
                name: file.name,
                size: file.size,
                mime: file.type
            });
            log(`Sending file data as ArrayBuffer...`);
            conn.send(arrayBuffer);
            log(`File sent!`);
        };

        // If not connected yet, connect first
        if (!peer) {
            log(`No existing connection, creating new connection to ${peerId}...`);
            const conn = this.peer.connect(peerId);
            conn.on('open', () => {
                log(`Connection opened to ${peerId}`);
                sendData(conn);
            });
            conn.on('error', (err) => log(`Connection error: ${err.message}`));
            this.handleConnection(conn);
        } else {
            log(`Using existing connection to ${peerId}`);
            sendData(peer.conn);
        }
    }
}
