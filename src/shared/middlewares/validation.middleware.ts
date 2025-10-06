import { Context, Next } from "hono";
import { ZodError, ZodSchema } from "zod";
import { MESSAGES, translateZodMessage } from "../constants/messages";

export const validateRequest = (schema: ZodSchema) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      // Parse and validate the data
      const validatedData = schema.parse(body);
      // Store the validated data in the context for the next middleware/route handler
      c.set("validatedData", validatedData);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        return c.json(
          {
            success: false,
            error: {
              name: "ValidationError",
              field: firstIssue.path.join(".") || "general",
              message: translateZodMessage(firstIssue.message),
            },
          },
          400
        );
      }
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            field: "general",
            message: error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR,
          },
        },
        400
      );
    }
  };
};
