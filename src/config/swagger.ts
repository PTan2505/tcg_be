import type { OpenAPIV3 } from "openapi-types";

export const swaggerDoc: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "TCG Backend API",
    version: "1.0.0",
    description: "API documentation for the Trading Card Game Backend",
  },
  servers: [
    {
      url: process.env.APP_URL || "http://localhost:3000",
      description: "Development Server",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "Authentication endpoints",
    },
    {
      name: "Users",
      description: "User management endpoints",
    },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "email",
                  "password",
                  "firstName",
                  "lastName",
                  "dateOfBirth",
                ],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "User email address",
                    example: "user@example.com",
                  },
                  password: {
                    type: "string",
                    minLength: 8,
                    description: "Password",
                    example: "password123",
                  },
                  firstName: {
                    type: "string",
                    minLength: 1,
                    description: "First name",
                    example: "John",
                  },
                  lastName: {
                    type: "string",
                    minLength: 1,
                    description: "Last name",
                    example: "Doe",
                  },
                  dateOfBirth: {
                    type: "string",
                    format: "date",
                    description: "Date of birth (YYYY-MM-DD)",
                    example: "1990-01-01",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example:
                        "Registration successful. Please check your email to verify your account.",
                    },
                    user: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "User email address",
                  },
                  password: {
                    type: "string",
                    minLength: 6,
                    description: "Password",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: {
                      type: "string",
                      description: "JWT access token",
                    },
                    refreshToken: {
                      type: "string",
                      description: "JWT refresh token",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/auth/verify-email": {
      get: {
        tags: ["Authentication"],
        summary: "Verify email address",
        parameters: [
          {
            in: "query",
            name: "token",
            required: true,
            schema: {
              type: "string",
            },
            description: "Email verification token",
          },
        ],
        responses: {
          "200": {
            description: "Email verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Email verified successfully",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid verification token",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Authentication"],
        summary: "Request password reset",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "User's email address",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Reset instructions sent (if email exists)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example:
                        "If the email exists, password reset instructions have been sent",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/users/profile": {
      get: {
        tags: ["Users"],
        summary: "Get authenticated user's profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - Invalid or missing token",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },

    "/auth/refresh-token": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token using refresh token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: {
                    type: "string",
                    description: "JWT refresh token obtained from login",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "New access token generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: {
                      type: "string",
                      description: "New JWT access token",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid refresh token",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Authentication"],
        summary: "Reset password using token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "newPassword"],
                properties: {
                  token: {
                    type: "string",
                    description: "Password reset token received via email",
                  },
                  newPassword: {
                    type: "string",
                    format: "password",
                    minLength: 8,
                    description:
                      "New password (must contain uppercase, lowercase, and number)",
                    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Password reset successful",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input or token",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Get all users",
        responses: {
          "200": {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/User",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user by ID",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: {
              type: "string",
            },
            description: "User ID",
          },
        ],
        responses: {
          "200": {
            description: "User found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: {
              type: "string",
            },
            description: "User ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: {
                    type: "string",
                    minLength: 1,
                  },
                  lastName: {
                    type: "string",
                    minLength: 1,
                  },
                  dateOfBirth: {
                    type: "string",
                    format: "date",
                    description: "Date of birth (YYYY-MM-DD)",
                  },
                  avatarUrl: {
                    type: "string",
                    format: "uri",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: {
              type: "string",
            },
            description: "User ID",
          },
        ],
        responses: {
          "200": {
            description: "User deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "User deleted successfully",
                    },
                    user: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/users/change-password": {
      post: {
        tags: ["Users"],
        summary: "Change authenticated user's password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: {
                    type: "string",
                    minLength: 8,
                    description: "Current password",
                  },
                  newPassword: {
                    type: "string",
                    minLength: 8,
                    description:
                      "New password (must contain uppercase, lowercase, and number)",
                    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Password changed successfully",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input or current password incorrect",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "User ID",
          },

          email: {
            type: "string",
            format: "email",
            description: "Email address",
          },
          firstName: {
            type: "string",
            description: "First Name",
          },
          lastName: {
            type: "string",
            description: "Last Name",
          },
          avatarUrl: {
            type: "string",
            description: "Avatar URL",
          },
          isEmailVerified: {
            type: "boolean",
            description: "Email verification status",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Creation timestamp",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "Last update timestamp",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Error message",
          },
        },
      },
    },
  },
};
