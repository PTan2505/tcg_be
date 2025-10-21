import { Server as HttpServer, IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import WebSocket, { WebSocketServer } from "ws";

class SocketService {
  private wss: WebSocketServer | null = null;
  // userId -> set of sockets
  private clients: Map<string, Set<WebSocket>> = new Map();

  start(port: number) {
    if (this.wss) return this.wss;
    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      // delegate to unified handler; token will be parsed from query if needed
      this.handleConnection(ws, req);
    });

    this.wss.on("listening", () => {
      console.log(`🔌 WebSocket server listening on port ${port}`);
    });

    return this.wss;
  }

  // Attach to an existing HTTP server so WS and HTTP share one process/port
  attach(server: HttpServer) {
    if (this.wss) return this.wss;

    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      // Parse token early to decide whether to accept upgrade
      try {
        const url = new URL(
          request.url || "",
          `http://${request.headers.host}`
        );
        const token = url.searchParams.get("token");
        if (!token) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as any;
        const userId = decoded.userId;
        if (!userId) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          // attach user info and emit connection
          (ws as any).__userId = userId;
          this.wss!.emit("connection", ws, request);
        });
      } catch (e) {
        try {
          socket.destroy();
        } catch (_e) {}
      }
    });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    return this.wss;
  }

  // Centralized connection handling used by both start() and attach()
  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    try {
      // Try to read userId from attached property (set during upgrade), else from query token
      let userId: string | null = (ws as any).__userId || null;
      if (!userId) {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const token = url.searchParams.get("token");
        if (!token) {
          ws.close(4001, "No token");
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as any;
        userId = decoded.userId;
        if (!userId) {
          ws.close(4002, "Invalid token");
          return;
        }
      }

      // store socket
      if (!this.clients.has(userId)) this.clients.set(userId, new Set());
      this.clients.get(userId)!.add(ws);

      ws.on("message", (msg: WebSocket.RawData) => {
        // Optionally handle incoming messages here
      });

      const cleanup = () => {
        const set = this.clients.get(userId!);
        if (set) set.delete(ws);
      };

      ws.on("close", cleanup);
      ws.on("error", cleanup);
    } catch (e) {
      try {
        ws.close(1011);
      } catch (_e) {}
    }
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
