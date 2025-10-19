import { Context } from 'hono';
import { createErrorResponse } from '../constants/messages';
import AppError from '../errors/AppError';

export const errorHandler = async (c: Context, next: any) => {
  try {
    return await next();
  } catch (err: any) {
    if (err instanceof AppError) {
      const body = createErrorResponse(err.message);
      return new Response(JSON.stringify(body), { status: err.statusCode, headers: { 'Content-Type': 'application/json' } });
    }

    // Generic fallback
    const body = createErrorResponse('INTERNAL_SERVER_ERROR');
    return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export default errorHandler;
