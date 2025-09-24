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
                  "username",
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
                  username: {
                    type: "string",
                    minLength: 3,
                    description: "Username",
                    example: "johndoe",
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
  },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "User ID",
          },
          username: {
            type: "string",
            description: "Username",
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
