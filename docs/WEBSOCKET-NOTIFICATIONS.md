WebSocket Realtime Notifications (React Native guide)

This document explains how the backend WebSocket server delivers realtime notifications and how the React Native frontend should connect and handle messages.

Overview

- Server: WebSocket server running separately from the HTTP server. The port is configured with WEBSOCKET_PORT (default 8080).
- Auth: Clients authenticate on connect using a JWT passed as a query parameter: ws://HOST:WEBSOCKET_PORT/?token=<JWT>
- Persistence: Notifications are persisted in MongoDB. The WebSocket delivery is best-effort and complements persisted notifications.
- Events: The server emits JSON messages of the form { event: string, payload: any }.

Common events

- notification
  - Description: A generic notification object created in the database and emitted to the recipient.
  - payload: Notification document (id, type, message, recipientId, actorId, data...)

- market:shipped
  - Description: Emitted when a seller marks a transaction as shipped. The buyer receives this event.
  - payload: Transaction object (id, status, shipping details...)

- market:delivered
  - Description: Emitted when a buyer confirms delivery. The seller receives this event.
  - payload: Transaction object (id, status, ...)

- notifications:readAll
  - Description: Emitted when a user marks all notifications as read. Typically includes new unread count.
  - payload: { unread: number }

Message envelope

All messages use the envelope:

{
  "event": "notification" | "market:shipped" | "market:delivered" | "notifications:readAll" | string,
  "payload": any
}

Connecting from React Native (example)

This example uses the standard WebSocket API available in React Native.

Minimal hook (useWebSocket.ts)

import { useEffect, useRef, useState } from 'react';

export function useWebSocket(token: string, onMessage: (msg: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const url = `ws://YOUR_SERVER_HOST:${process.env.WEBSOCKET_PORT || 8080}/?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('WS connected');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        onMessage(msg);
      } catch (err) {
        console.warn('Invalid WS message', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WS closed');
    };

    ws.onerror = (err) => {
      console.warn('WS error', err);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  return { connected, send: (data: any) => wsRef.current?.send(JSON.stringify(data)) };
}

Usage example

import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

function NotificationsScreen({ token }) {
  const { connected, send } = useWebSocket(token, (msg) => {
    if (msg.event === 'notification') {
      // update local state / show in-app banner
    }
    if (msg.event === 'market:shipped') {
      // update transaction status in the UI
    }
  });

  useEffect(() => {
    if (connected) {
      console.log('Connected to WS');
    }
  }, [connected]);

  return null;
}

Handling background / app kill

- React Native WebSocket connection will be closed when the app goes to background on iOS/Android; for background notifications, integrate with push notifications (APNs / FCM). The server-side persistent notifications allow you to surface missed notifications via REST when the app resumes.

Testing locally

- There is a development helper endpoint in the API: POST /test/emit-notification. It accepts { recipientId, type, data } and will create+emit a notification to the specified user if connected.
- You can also use the scripts/test-ws-token.js script to simulate a client connection with a JWT.

Scaling note

- Current implementation keeps sockets in memory per server instance. For multi-instance deployment use a Redis pub/sub adapter (or a dedicated push gateway) so that notifications created on any instance are forwarded to sockets attached to other instances.

Security notes

- Avoid sending tokens in URLs in production (query string) because they may be logged. Consider negotiating auth via an HTTP upgrade handshake that uses a short-lived key or include a cookie/secure header if the environment allows it. If you must use query tokens, ensure HTTPS and minimize logging.

Appendix: example payload

Notification example (payload of event: 'notification'):

{
  "_id": "650b5c2f...",
  "recipientId": "64f7b2a3e1d2f3c4b5a6d7e8",
  "actorId": "61a2b3c4d5e6f7g8h9i0",
  "type": "market:shipped",
  "message": "Seller123 marked transaction TX123 as shipped",
  "data": { "transactionId": "TX123" },
  "read": false,
  "createdAt": "2025-10-14T12:34:56.789Z"
}
