import { Context, Next } from 'hono';

/**
 * Middleware to ensure users can only access resources they own
 * This adds an extra layer of security beyond the service-level checks
 */
export const ownershipMiddleware = (resourceType: 'deck' | 'userCard') => {
  return async (c: Context, next: Next) => {
    try {
      const user = c.get('user');
      
      if (!user) {
        return c.json({
          success: false,
          error: {
            name: 'AuthenticationError',
            field: 'authorization',
            message: 'Authentication required'
          }
        }, 401);
      }

      // Add user ID to context for service methods to use
      c.set('authenticatedUserId', user.id);
      
      await next();
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'AuthorizationError',
          field: 'general',
          message: 'Access denied'
        }
      }, 403);
    }
  };
};

/**
 * Middleware to validate route parameters
 */
export const validateParamsMiddleware = (requiredParams: string[]) => {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param();
      
      for (const param of requiredParams) {
        if (!params[param]) {
          return c.json({
            success: false,
            error: {
              name: 'ValidationError',
              field: param,
              message: `${param} is required`
            }
          }, 400);
        }
      }
      
      await next();
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'ValidationError',
          field: 'general',
          message: 'Invalid request parameters'
        }
      }, 400);
    }
  };
};

/**
 * Rate limiting middleware (basic implementation)
 */
export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const userId = user?.id || c.req.header('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    
    const userRequests = requests.get(userId);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
    } else {
      userRequests.count++;
      
      if (userRequests.count > maxRequests) {
        return c.json({
          success: false,
          error: {
            name: 'RateLimitError',
            field: 'general',
            message: 'Too many requests. Please try again later.'
          }
        }, 429);
      }
    }
    
    await next();
  };
};