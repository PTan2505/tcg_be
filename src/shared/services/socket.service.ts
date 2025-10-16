import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import WebSocket, { WebSocketServer } from 'ws';

class SocketService {
  private wss: WebSocketServer | null = null;
  // userId -> set of sockets
  private clients: Map<string, Set<WebSocket>> = new Map();

  start(port: number) {
    if (this.wss) return this.wss;
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // Attempt to parse JWT from query string: ?token=...
      try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token) {
          ws.close(4001, 'No token');
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
        const userId = decoded.userId;
        if (!userId) {
          ws.close(4002, 'Invalid token');
          return;
        }

        // store socket
        if (!this.clients.has(userId)) this.clients.set(userId, new Set());
        this.clients.get(userId)!.add(ws);

        ws.on('message', (msg: WebSocket.RawData) => {
          // handle incoming messages if needed later
          // For now no special incoming handling
        });

        const cleanup = () => {
          const set = this.clients.get(userId);
          if (set) set.delete(ws);
        };

        ws.on('close', cleanup);
        ws.on('error', cleanup);
      } catch (e) {
        try { ws.close(1011); } catch (err) {}
      }
    });

    this.wss.on('listening', () => {
      console.log(`🔌 WebSocket server listening on port ${port}`);
    });

    return this.wss;
  }

  emitToUser(userId: string, event: string, payload: any) {
    const set = this.clients.get(userId);
    if (!set || set.size === 0) return;
    const message = JSON.stringify({ event, payload });
    for (const ws of Array.from(set)) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(message);
      } catch (e) {
        set.delete(ws);
      }
    }
  }
}

export const socketService = new SocketService();
