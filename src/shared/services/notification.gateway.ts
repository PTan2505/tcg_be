// Shim: keep export for compatibility with any remaining imports
import { socketService } from './socket.service';

export const notificationGateway = {
  emitToUser: (userId: string, event: string, payload: any) => socketService.emitToUser(userId, event, payload),
  // subscribe is not supported; SSE was removed in favor of WebSocket
  subscribe: (_: string, __: any) => {
    const { getMessage } = require('../constants/messages');
    const AppError = require('../errors/AppError').default;
    throw new AppError(getMessage('ERRORS.INTERNAL_SERVER_ERROR') + ': SSE subscribe removed; use WebSocket', 501);
  }
};
