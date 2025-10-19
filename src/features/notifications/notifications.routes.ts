import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { NotificationController } from '../posts/notification.controller';

const notif = new Hono();
const notificationController = new NotificationController();

notif.use('*', authMiddleware);

// REST endpoints for notifications (generic resource)
notif.get('/', notificationController.getNotifications);
notif.get('/unread-count', notificationController.getUnreadCount);
notif.put('/:id/read', notificationController.markAsRead);
notif.put('/read-all', notificationController.markAllAsRead);
notif.delete('/:id', notificationController.deleteNotification);

export default notif;
