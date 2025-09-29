import { Context, Next } from "hono";
import { ZodError, ZodSchema } from "zod";

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
        return c.json(
          {
            success: false,
            error: {
              name: "ValidationError",
              field: error.issues[0].path.join("."),
              message: error.issues[0].message,
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
            message: error instanceof Error ? error.message : "Unknown error",
          },
        },
        400
      );
    }
  };
};
