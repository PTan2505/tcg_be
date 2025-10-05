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
    {
      name: "User Cards",
      description: "User card collection management",
    },
    {
      name: "User Decks",
      description: "User deck management operations (CRUD)",
    },
    {
      name: "Pokemon Decks",
      description: "Pokemon recommended deck browsing (read-only)",
    },
    {
      name: "Cards",
      description: "Unified card browsing and discovery (Pokemon, Yu-Gi-Oh!, One Piece)",
    },
    {
      name: "Sets",
      description: "Unified card set management and discovery (Pokemon, Yu-Gi-Oh!, One Piece)",
    },
    {
      name: "Social Posts",
      description: "Social media posting features",
    },
    {
      name: "Comments",
      description: "Post comments and replies",
    },
    {
      name: "Reactions",
      description: "Like reactions",
    },
    {
      name: "Friendship",
      description: "Friend management and relationships",
    },
    {
      name: "Notifications",
      description: "Real-time notifications",
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
                    maxLength: 30,
                    pattern: "^[a-zA-Z0-9_]+$",
                    description: "Unique username (letters, numbers, underscores only)",
                    example: "john_doe",
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
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example:
                        "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực tài khoản.",
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
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
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
    "/auth/verify-email-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify email address using HOTP code",
        description: "Verify user email using HMAC-based One-Time Password (HOTP) received via email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "User's email address",
                  },
                  otp: {
                    type: "string",
                    pattern: "^\\d{6}$",
                    description: "6-digit HOTP code received via email",
                    example: "123456",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Email verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Xác thực email thành công",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid OTP code or expired",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Invalid OTP code",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/resend-verification-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Resend email verification HOTP",
        description: "Request a new HOTP code for email verification",
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
            description: "New OTP sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Mã OTP mới đã được gửi đến email của bạn",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid email or already verified",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Email already verified",
                    },
                  },
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
        summary: "Request password reset HOTP",
        description: "Send HMAC-based One-Time Password (HOTP) to user's email for password reset",
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
            description: "Reset HOTP sent (if email exists)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Nếu email tồn tại, mã OTP đã được gửi đến hộp thư của bạn",
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
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Không thể xử lý yêu cầu",
                    },
                  },
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
    "/auth/reset-password-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Reset password using HOTP code",
        description: "Reset user password using HMAC-based One-Time Password (HOTP) received via email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp", "newPassword"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "User's email address",
                  },
                  otp: {
                    type: "string",
                    pattern: "^\\d{6}$",
                    description: "6-digit HOTP code received via email",
                    example: "123456",
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
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    message: {
                      type: "string",
                      example: "Đặt lại mật khẩu thành công",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid OTP, expired, or invalid password",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: false,
                    },
                    error: {
                      type: "string",
                      example: "Invalid OTP code",
                    },
                  },
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
    "/user-cards": {
      post: {
        tags: ["User Cards"],
        summary: "Add card to collection",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["cardId", "category"],
                properties: {
                  cardId: {
                    type: "string",
                    description: "ID of the card to add",
                  },
                  category: {
                    type: "string",
                    enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
                    description: "Card category",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Card added successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationError",
                },
              },
            },
          },
        },
      },
      get: {
        tags: ["User Cards"],
        summary: "Get user's card collection",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "category",
            schema: {
              type: "string",
              enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
            },
            description: "Filter by card category",
          },
          {
            in: "query",
            name: "sortBy",
            schema: {
              type: "string",
              enum: ["name", "addedAt", "rarity", "type"],
            },
            description: "Sort field",
          },
          {
            in: "query",
            name: "sortOrder",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
            },
            description: "Sort order",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
            },
            description: "Number of cards per page",
          },
          {
            in: "query",
            name: "offset",
            schema: {
              type: "integer",
              minimum: 0,
            },
            description: "Pagination offset",
          },
          {
            in: "query",
            name: "search",
            schema: {
              type: "string",
            },
            description: "Search query",
          },
        ],
        responses: {
          "200": {
            description: "Collection retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UserCard" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/user-cards/{cardId}": {
      delete: {
        tags: ["User Cards"],
        summary: "Remove card from collection",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "cardId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Card ID",
          },
          {
            in: "query",
            name: "category",
            required: true,
            schema: {
              type: "string",
              enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
            },
            description: "Card category",
          },
        ],
        responses: {
          "200": {
            description: "Card removed successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
        },
      },
    },
    "/user-cards/category/{category}": {
      get: {
        tags: ["User Cards"],
        summary: "Get user cards by category",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "category",
            required: true,
            schema: {
              type: "string",
              enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
            },
            description: "Card category",
          },
        ],
        responses: {
          "200": {
            description: "Cards retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UserCard" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/user-cards/search": {
      get: {
        tags: ["User Cards"],
        summary: "Search user cards",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "q",
            required: true,
            schema: {
              type: "string",
            },
            description: "Search query",
          },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UserCard" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/user-cards/details/{cardId}": {
      get: {
        tags: ["User Cards"],
        summary: "Get card details",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "cardId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Card ID",
          },
          {
            in: "query",
            name: "category",
            required: true,
            schema: {
              type: "string",
              enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
            },
            description: "Card category",
          },
        ],
        responses: {
          "200": {
            description: "Card details retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/CardDetails" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/user": {
      post: {
        tags: ["User Decks"],
        summary: "Create new deck",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "category", "format"],
                properties: {
                  name: {
                    type: "string",
                    maxLength: 100,
                    description: "Deck name",
                  },
                  description: {
                    type: "string",
                    maxLength: 500,
                    description: "Deck description",
                  },
                  category: {
                    type: "string",
                    enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
                    description: "Card category",
                  },
                  format: {
                    type: "string",
                    enum: ["standard", "expanded", "unlimited", "custom"],
                    description: "Deck format",
                  },
                  isPublic: {
                    type: "boolean",
                    description: "Make deck public",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Deck tags",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Deck created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Deck" },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ["User Decks"],
        summary: "Get user's decks",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Decks retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Deck" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/user/{deckId}": {
      get: {
        tags: ["User Decks"],
        summary: "Get deck by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
        ],
        responses: {
          "200": {
            description: "Deck retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Deck" },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["User Decks"],
        summary: "Update deck",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", maxLength: 100 },
                  description: { type: "string", maxLength: 500 },
                  format: {
                    type: "string",
                    enum: ["standard", "expanded", "unlimited", "custom"],
                  },
                  isPublic: { type: "boolean" },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Deck updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Deck" },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["User Decks"],
        summary: "Delete deck",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
        ],
        responses: {
          "200": {
            description: "Deck deleted successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
        },
      },
    },
    "/decks/user/{deckId}/cards": {
      post: {
        tags: ["User Decks"],
        summary: "Add card to deck",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["cardId", "category", "quantity"],
                properties: {
                  cardId: { type: "string" },
                  category: {
                    type: "string",
                    enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
                  },
                  quantity: {
                    type: "integer",
                    minimum: 1,
                    maximum: 4,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Card added to deck successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Deck" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/user/{deckId}/cards/{cardId}": {
      delete: {
        tags: ["User Decks"],
        summary: "Remove card from deck",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
          {
            in: "path",
            name: "cardId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Card ID",
          },
        ],
        responses: {
          "200": {
            description: "Card removed from deck successfully",
          },
        },
      },
      patch: {
        tags: ["User Decks"],
        summary: "Update card quantity in deck",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
          {
            in: "path",
            name: "cardId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Card ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: {
                    type: "integer",
                    minimum: 1,
                    maximum: 4,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Card quantity updated successfully",
          },
        },
      },
    },
    "/decks/user/{deckId}/validate": {
      get: {
        tags: ["User Decks"],
        summary: "Validate deck format compliance",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
        ],
        responses: {
          "200": {
            description: "Deck validation results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/DeckValidation" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/user/{deckId}/duplicate": {
      post: {
        tags: ["User Decks"],
        summary: "Duplicate deck",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Deck ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    maxLength: 100,
                    description: "New deck name",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Deck duplicated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Deck" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/pokemon": {
      get: {
        tags: ["Pokemon Decks"],
        summary: "Get all Pokemon recommended decks",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of decks per page",
          },
        ],
        responses: {
          "200": {
            description: "Pokemon decks retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PokemonDeck" },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                        hasNext: { type: "boolean" },
                        hasPrev: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/pokemon/search": {
      get: {
        tags: ["Pokemon Decks"],
        summary: "Search Pokemon decks",
        parameters: [
          {
            in: "query",
            name: "query",
            required: true,
            schema: {
              type: "string",
            },
            description: "Search query",
          },
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of decks per page",
          },
        ],
        responses: {
          "200": {
            description: "Search results retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PokemonDeck" },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                        hasNext: { type: "boolean" },
                        hasPrev: { type: "boolean" },
                      },
                    },
                    query: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/pokemon/types": {
      get: {
        tags: ["Pokemon Decks"],
        summary: "Get Pokemon decks by types",
        parameters: [
          {
            in: "query",
            name: "types",
            required: true,
            schema: {
              type: "array",
              items: { type: "string" },
            },
            description: "Pokemon types to filter by",
          },
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of decks per page",
          },
        ],
        responses: {
          "200": {
            description: "Decks filtered by types retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PokemonDeck" },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                        hasNext: { type: "boolean" },
                        hasPrev: { type: "boolean" },
                      },
                    },
                    types: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/decks/pokemon/id/{deckId}": {
      get: {
        tags: ["Pokemon Decks"],
        summary: "Get Pokemon deck by ID",
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Pokemon deck ID",
          },
        ],
        responses: {
          "200": {
            description: "Pokemon deck retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/PokemonDeck" },
                  },
                },
              },
            },
          },
          "404": {
            description: "Pokemon deck not found",
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
    "/decks/pokemon/ext/{deckExtId}": {
      get: {
        tags: ["Pokemon Decks"],
        summary: "Get Pokemon deck by external ID",
        parameters: [
          {
            in: "path",
            name: "deckExtId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Pokemon deck external ID",
          },
        ],
        responses: {
          "200": {
            description: "Pokemon deck retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/PokemonDeck" },
                  },
                },
              },
            },
          },
          "404": {
            description: "Pokemon deck not found",
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
    "/decks/pokemon/id/{deckId}/stats": {
      get: {
        tags: ["Pokemon Decks"],
        summary: "Get Pokemon deck statistics",
        parameters: [
          {
            in: "path",
            name: "deckId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Pokemon deck ID",
          },
        ],
        responses: {
          "200": {
            description: "Pokemon deck statistics retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        totalCards: { type: "integer" },
                        uniqueCards: { type: "integer" },
                        pokemonCount: { type: "integer" },
                        trainerCount: { type: "integer" },
                        energyCount: { type: "integer" },
                        typeDistribution: {
                          type: "object",
                          additionalProperties: { type: "integer" },
                        },
                        rarityDistribution: {
                          type: "object",
                          additionalProperties: { type: "integer" },
                        },
                        averageCost: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Pokemon deck not found",
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
    "/posts": {
      post: {
        tags: ["Social Posts"],
        summary: "Create a text-only post",
        description: "Create a post without images. For posts with images, use /posts/with-files endpoint.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    maxLength: 2000,
                    description: "Post content",
                  },
                  cardReferences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cardId: { type: "string" },
                        cardType: { type: "string", enum: ["pokemon", "yugioh", "onepiece"] },
                      },
                    },
                    description: "Referenced cards",
                  },
                  deckReferences: {
                    type: "array",
                    items: { type: "string" },
                    description: "Referenced deck IDs",
                  },
                  privacy: {
                    type: "string",
                    enum: ["public", "friends", "private"],
                    default: "public",
                    description: "Post privacy setting",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tagged user IDs",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Post created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Post" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/with-files": {
      post: {
        tags: ["Social Posts"],
        summary: "Create a new post with file uploads",
        description: "Create a post with actual image file uploads (multipart/form-data)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    maxLength: 2000,
                    description: "Post content",
                  },
                  images: {
                    type: "array",
                    items: {
                      type: "string",
                      format: "binary",
                    },
                    description: "Image files to upload (max 5MB each)",
                  },
                  privacy: {
                    type: "string",
                    enum: ["public", "friends", "private"],
                    default: "public",
                    description: "Post privacy setting",
                  },
                  cardReferences: {
                    type: "string",
                    description: "JSON string of card references array",
                  },
                  deckReferences: {
                    type: "string",
                    description: "JSON string of deck reference IDs array",
                  },
                  tags: {
                    type: "string",
                    description: "JSON string of tagged user IDs array",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Post created successfully with uploaded images",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Post" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid file type or size",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationError",
                },
              },
            },
          },
        },
      },
    },
    "/posts/feed": {
      get: {
        tags: ["Social Posts"],
        summary: "Get user's feed",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            description: "Posts per page",
          },
        ],
        responses: {
          "200": {
            description: "Feed retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        posts: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Post" },
                        },
                        total: { type: "integer" },
                        hasMore: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/upload-url": {
      post: {
        tags: ["Social Posts"],
        summary: "Get S3 upload URL for images",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fileName", "mimeType"],
                properties: {
                  fileName: { type: "string", description: "File name" },
                  mimeType: {
                    type: "string",
                    pattern: "^image/(jpeg|jpg|png|gif|webp)$",
                    description: "Image MIME type",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Upload URL generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        uploadUrl: { type: "string", format: "uri" },
                        fileUrl: { type: "string", format: "uri" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/taggable-users": {
      get: {
        tags: ["Social Posts"],
        summary: "Get taggable users for @mentions",
        description: "Get list of users that can be tagged based on context (friends, post owner, comment owner)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "type",
            in: "query",
            required: false,
            description: "Context type for tagging rules",
            schema: {
              type: "string",
              enum: ["post", "comment", "reply"],
              default: "post"
            }
          },
          {
            name: "postId",
            in: "query",
            required: false,
            description: "Post ID (required for reply context)",
            schema: { type: "string" }
          },
          {
            name: "parentCommentId",
            in: "query",
            required: false,
            description: "Parent comment ID (required for reply context)",
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Taggable users retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          _id: { type: "string" },
                          username: { type: "string" },
                          firstName: { type: "string" },
                          lastName: { type: "string" }
                        }
                      }
                    },
                    message: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/posts/{id}": {
      get: {
        tags: ["Social Posts"],
        summary: "Get specific post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Post ID",
          },
        ],
        responses: {
          "200": {
            description: "Post retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Post" },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Social Posts"],
        summary: "Update post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Post ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: { type: "string", maxLength: 2000 },
                  privacy: {
                    type: "string",
                    enum: ["public", "friends", "private"],
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Post updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Post" },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Social Posts"],
        summary: "Delete post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Post ID",
          },
        ],
        responses: {
          "200": {
            description: "Post deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/{id}/reactions": {
      post: {
        tags: ["Reactions"],
        summary: "Toggle post reaction (like/unlike)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Post ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    type: "string",
                    enum: ["like"],
                    description: "Reaction type",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Reaction toggled successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        action: {
                          type: "string",
                          enum: ["added", "removed"],
                        },
                        likesCount: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/{postId}/comments": {
      post: {
        tags: ["Comments"],
        summary: "Create comment on post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "postId",
            required: true,
            schema: { type: "string" },
            description: "Post ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: {
                    type: "string",
                    maxLength: 500,
                    description: "Comment content",
                  },
                  parentComment: {
                    type: "string",
                    description: "Parent comment ID for replies",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tagged user IDs",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Comment created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Comment" },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ["Comments"],
        summary: "Get comments for post",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "postId",
            required: true,
            schema: { type: "string" },
            description: "Post ID",
          },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
            description: "Comments per page",
          },
        ],
        responses: {
          "200": {
            description: "Comments retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        comments: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Comment" },
                        },
                        total: { type: "integer" },
                        hasMore: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends": {
      get: {
        tags: ["Friendship"],
        summary: "Get friends list",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Friends list retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Friend" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends/request": {
      post: {
        tags: ["Friendship"],
        summary: "Send friend request",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: {
                    type: "string",
                    description: "User ID to send friend request to",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Friend request sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Friendship" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends/{id}/respond": {
      put: {
        tags: ["Friendship"],
        summary: "Respond to friend request",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Friend request ID",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: {
                    type: "string",
                    enum: ["accept", "decline"],
                    description: "Response to the friend request",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Friend request response processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: { $ref: "#/components/schemas/Friendship" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends/{id}": {
      delete: {
        tags: ["Friendship"],
        summary: "Unfriend a user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Friend ID to unfriend",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "User unfriended successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends/block": {
      post: {
        tags: ["Friendship"],
        summary: "Block a user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: {
                    type: "string",
                    description: "ID of the user to block",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User blocked successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends/block/{id}": {
      delete: {
        tags: ["Friendship"],
        summary: "Unblock a user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "User ID to unblock",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "User unblocked successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends/pending": {
      get: {
        tags: ["Friendship"],
        summary: "Get pending friend requests",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Pending friend requests retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Friendship" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users/friends/status/{userId}": {
      get: {
        tags: ["Friendship"],
        summary: "Get friendship status with a specific user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            description: "User ID to check friendship status with",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Friendship status retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        status: {
                          type: "string",
                          enum: ["none", "pending", "accepted", "blocked"],
                          description: "Current friendship status",
                        },
                        friendship: { $ref: "#/components/schemas/Friendship" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get user notifications",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
            description: "Notifications per page",
          },
        ],
        responses: {
          "200": {
            description: "Notifications retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        notifications: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Notification" },
                        },
                        total: { type: "integer" },
                        hasMore: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Get unread notifications count",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Unread count retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        unreadCount: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/notifications/{id}/read": {
      put: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Notification ID",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Notification marked as read successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/notifications/read-all": {
      put: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "All notifications marked as read successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        modifiedCount: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/posts/notifications/{id}": {
      delete: {
        tags: ["Notifications"],
        summary: "Delete a notification",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Notification ID",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Notification deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    // =============================================================================
    // UNIFIED API ENDPOINTS - New unified card and set management
    // =============================================================================
    "/cards": {
      get: {
        tags: ["Cards"],
        summary: "Get all cards from all game types with pagination and filtering",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of cards per page",
          },
          {
            in: "query",
            name: "sortBy",
            schema: {
              type: "string",
              enum: ["name", "gameType", "createdAt"],
            },
            description: "Sort field",
          },
          {
            in: "query",
            name: "sortOrder",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
            },
            description: "Sort order",
          },
        ],
        responses: {
          "200": {
            description: "Cards retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/UnifiedCard",
                      },
                    },
                    pagination: {
                      $ref: "#/components/schemas/Pagination",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
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
    "/cards/{gameType}": {
      get: {
        tags: ["Cards"],
        summary: "Get cards by game type with pagination and filtering",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "gameType",
            required: true,
            schema: {
              type: "string",
              enum: ["pokemon", "yugioh", "onepiece"],
            },
            description: "Game type (pokemon, yugioh, or onepiece)",
          },
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of cards per page",
          },
          {
            in: "query",
            name: "sortBy",
            schema: {
              type: "string",
              enum: ["name", "cleanName", "createdAt"],
            },
            description: "Sort field",
          },
          {
            in: "query",
            name: "sortOrder",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
            },
            description: "Sort order",
          },
          {
            in: "query",
            name: "rarity",
            schema: {
              type: "string",
            },
            description: "Filter by card rarity",
          },
          {
            in: "query",
            name: "minPrice",
            schema: {
              type: "number",
              minimum: 0,
            },
            description: "Minimum price filter",
          },
          {
            in: "query",
            name: "maxPrice",
            schema: {
              type: "number",
              minimum: 0,
            },
            description: "Maximum price filter",
          },
        ],
        responses: {
          "200": {
            description: "Cards retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/UnifiedCard",
                      },
                    },
                    pagination: {
                      $ref: "#/components/schemas/Pagination",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid game type or parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationError",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
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
    "/cards/{gameType}/search": {
      get: {
        tags: ["Cards"],
        summary: "Search cards by game type with advanced filters",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "gameType",
            required: true,
            schema: {
              type: "string",
              enum: ["pokemon", "yugioh", "onepiece"],
            },
            description: "Game type (pokemon, yugioh, or onepiece)",
          },
          {
            in: "query",
            name: "q",
            required: true,
            schema: {
              type: "string",
              minLength: 1,
            },
            description: "Search query",
          },
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of cards per page",
          },
          {
            in: "query",
            name: "sortBy",
            schema: {
              type: "string",
              enum: ["name", "cleanName", "relevance"],
            },
            description: "Sort field",
          },
          {
            in: "query",
            name: "sortOrder",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
            },
            description: "Sort order",
          },
        ],
        responses: {
          "200": {
            description: "Search results retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/UnifiedCard",
                      },
                    },
                    pagination: {
                      $ref: "#/components/schemas/Pagination",
                    },
                    query: {
                      type: "string",
                      description: "Search query used",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid search parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationError",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
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
    "/cards/card/{cardId}": {
      get: {
        tags: ["Cards"],
        summary: "Get specific card by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "cardId",
            required: true,
            schema: {
              type: "string",
            },
            description: "Card ID",
          },
        ],
        responses: {
          "200": {
            description: "Card retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      $ref: "#/components/schemas/UnifiedCard",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Card not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
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
    "/cards/{gameType}/stats": {
      get: {
        tags: ["Cards"],
        summary: "Get card statistics for a specific game type",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "gameType",
            required: true,
            schema: {
              type: "string",
              enum: ["pokemon", "yugioh", "onepiece"],
            },
            description: "Game type to get statistics for",
          },
        ],
        responses: {
          "200": {
            description: "Card statistics retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "object",
                      properties: {
                        totalCards: {
                          type: "integer",
                        },
                        cardsByGameType: {
                          type: "object",
                          properties: {
                            pokemon: {
                              type: "integer",
                            },
                            yugioh: {
                              type: "integer",
                            },
                            onepiece: {
                              type: "integer",
                            },
                          },
                        },
                        lastUpdated: {
                          type: "string",
                          format: "date-time",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
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
    "/sets": {
      get: {
        tags: ["Sets"],
        summary: "Get all sets from all game types with pagination and filtering",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of sets per page",
          },
          {
            in: "query",
            name: "sortBy",
            schema: {
              type: "string",
              enum: ["name", "gameType", "groupId", "createdAt"],
            },
            description: "Sort field",
          },
          {
            in: "query",
            name: "sortOrder",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
            },
            description: "Sort order",
          },
        ],
        responses: {
          "200": {
            description: "Sets retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/UnifiedSet",
                      },
                    },
                    pagination: {
                      $ref: "#/components/schemas/Pagination",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
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
    "/sets/{gameType}": {
      get: {
        tags: ["Sets"],
        summary: "Get sets by game type with pagination and filtering",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "gameType",
            required: true,
            schema: {
              type: "string",
              enum: ["pokemon", "yugioh", "onepiece"],
            },
            description: "Game type (pokemon, yugioh, or onepiece)",
          },
          {
            in: "query",
            name: "page",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            description: "Number of sets per page",
          },
          {
            in: "query",
            name: "sortBy",
            schema: {
              type: "string",
              enum: ["name", "groupId", "createdAt"],
            },
            description: "Sort field",
          },
          {
            in: "query",
            name: "sortOrder",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
            },
            description: "Sort order",
          },
        ],
        responses: {
          "200": {
            description: "Sets retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/UnifiedSet",
                      },
                    },
                    pagination: {
                      $ref: "#/components/schemas/Pagination",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid game type or parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationError",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
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
          username: {
            type: "string",
            description: "Unique username",
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
      ValidationError: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "object",
            properties: {
              name: {
                type: "string",
                example: "ValidationError",
              },
              field: {
                type: "string",
                example: "cardId",
              },
              message: {
                type: "string",
                example: "Card ID is required",
              },
            },
          },
        },
      },
      ApiResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
          },
          message: {
            type: "string",
          },
          data: {
            type: "object",
          },
        },
      },
      UserCard: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "User card ID",
          },
          userId: {
            type: "string",
            description: "User ID",
          },
          cardId: {
            type: "string",
            description: "Card ID",
          },
          category: {
            type: "string",
            enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
            description: "Card category",
          },
          addedAt: {
            type: "string",
            format: "date-time",
            description: "Date added to collection",
          },
          cardDetails: {
            type: "object",
            description: "Full card information",
          },
        },
      },
      CardDetails: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },
          name: {
            type: "string",
            description: "Card name",
          },
          type: {
            type: "string",
            description: "Card category (pokemon, yugioh, or onepiece)",
          },
          desc: {
            type: "string",
            description: "Card description",
          },
          atk: {
            type: "number",
            description: "Attack points (Yugioh)",
          },
          def: {
            type: "number",
            description: "Defense points (Yugioh)",
          },
          card_images: {
            type: "array",
            items: {
              type: "object",
              properties: {
                image_url: { type: "string" },
                image_url_small: { type: "string" },
                image_url_cropped: { type: "string" },
              },
            },
            description: "Card images",
          },
          card_prices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cardmarket_price: { type: "string" },
                tcgplayer_price: { type: "string" },
                ebay_price: { type: "string" },
                amazon_price: { type: "string" },
              },
            },
            description: "Card market prices",
          },
        },
      },
      Deck: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "Deck ID",
          },
          name: {
            type: "string",
            description: "Deck name",
          },
          description: {
            type: "string",
            description: "Deck description",
          },
          userId: {
            type: "string",
            description: "Owner user ID",
          },
          category: {
            type: "string",
            enum: ["PokemonCard", "YugiohCard", "OnePieceCard"],
            description: "Card category",
          },
          format: {
            type: "string",
            enum: ["standard", "expanded", "unlimited", "custom"],
            description: "Deck format",
          },
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cardId: { type: "string" },
                category: { type: "string" },
                quantity: { type: "integer", minimum: 1, maximum: 4 },
              },
            },
            description: "Cards in deck",
          },
          isPublic: {
            type: "boolean",
            description: "Is deck public",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Deck tags",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      PokemonDeck: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "Pokemon deck ID",
          },
          name: {
            type: "string",
            description: "Deck name",
          },
          description: {
            type: "string",
            description: "Deck description",
          },
          extId: {
            type: "string",
            description: "External deck ID",
          },
          types: {
            type: "array",
            items: { type: "string" },
            description: "Pokemon types in deck",
          },
          legality: {
            type: "object",
            properties: {
              standard: { type: "boolean" },
              expanded: { type: "boolean" },
              unlimited: { type: "boolean" },
            },
            description: "Format legality",
          },
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                count: { type: "integer" },
                cardDetails: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    supertype: { type: "string" },
                    subtypes: {
                      type: "array",
                      items: { type: "string" },
                    },
                    hp: { type: "string" },
                    types: {
                      type: "array",
                      items: { type: "string" },
                    },
                    attacks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          cost: {
                            type: "array",
                            items: { type: "string" },
                          },
                          convertedEnergyCost: { type: "integer" },
                          damage: { type: "string" },
                          text: { type: "string" },
                        },
                      },
                    },
                    weaknesses: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          value: { type: "string" },
                        },
                      },
                    },
                    resistances: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          value: { type: "string" },
                        },
                      },
                    },
                    retreatCost: {
                      type: "array",
                      items: { type: "string" },
                    },
                    convertedRetreatCost: { type: "integer" },
                    set: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        series: { type: "string" },
                        printedTotal: { type: "integer" },
                        total: { type: "integer" },
                        legalities: {
                          type: "object",
                          additionalProperties: { type: "string" },
                        },
                        releaseDate: { type: "string" },
                        updatedAt: { type: "string" },
                        images: {
                          type: "object",
                          properties: {
                            symbol: { type: "string" },
                            logo: { type: "string" },
                          },
                        },
                      },
                    },
                    number: { type: "string" },
                    artist: { type: "string" },
                    rarity: { type: "string" },
                    flavorText: { type: "string" },
                    nationalPokedexNumbers: {
                      type: "array",
                      items: { type: "integer" },
                    },
                    legalities: {
                      type: "object",
                      additionalProperties: { type: "string" },
                    },
                    images: {
                      type: "object",
                      properties: {
                        small: { type: "string" },
                        large: { type: "string" },
                      },
                    },
                    tcgplayer: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                        updatedAt: { type: "string" },
                        prices: {
                          type: "object",
                          additionalProperties: {
                            type: "object",
                            properties: {
                              low: { type: "number" },
                              mid: { type: "number" },
                              high: { type: "number" },
                              market: { type: "number" },
                              directLow: { type: "number" },
                            },
                          },
                        },
                      },
                    },
                    cardmarket: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                        updatedAt: { type: "string" },
                        prices: {
                          type: "object",
                          properties: {
                            averageSellPrice: { type: "number" },
                            lowPrice: { type: "number" },
                            trendPrice: { type: "number" },
                            germanProLow: { type: "number" },
                            suggestedPrice: { type: "number" },
                            reverseHoloSell: { type: "number" },
                            reverseHoloLow: { type: "number" },
                            reverseHoloTrend: { type: "number" },
                            lowPriceExPlus: { type: "number" },
                            avg1: { type: "number" },
                            avg7: { type: "number" },
                            avg30: { type: "number" },
                            reverseHoloAvg1: { type: "number" },
                            reverseHoloAvg7: { type: "number" },
                            reverseHoloAvg30: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            description: "Cards in deck with details",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      DeckValidation: {
        type: "object",
        properties: {
          isValid: {
            type: "boolean",
            description: "Whether deck is valid",
          },
          errors: {
            type: "array",
            items: { type: "string" },
            description: "Validation errors",
          },
          warnings: {
            type: "array",
            items: { type: "string" },
            description: "Validation warnings",
          },
          cardCount: {
            type: "object",
            properties: {
              total: { type: "integer" },
              unique: { type: "integer" },
              minRequired: { type: "integer" },
              maxAllowed: { type: "integer" },
            },
            description: "Card count statistics",
          },
        },
      },
      SetDetails: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "Set ID",
          },
          set_name: {
            type: "string",
            description: "Set name",
          },
          set_code: {
            type: "string",
            description: "Set code",
          },
          num_of_cards: {
            type: "integer",
            description: "Number of cards in set",
          },
          tcg_date: {
            type: "string",
            format: "date",
            description: "TCG release date",
          },
          set_image: {
            type: "string",
            description: "Set image URL",
          },
          setType: {
            type: "string",
            enum: ["pokemon", "yugioh", "onepiece"],
            description: "Set category (pokemon, yugioh, or onepiece)",
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
      Post: {
        type: "object",
        properties: {
          _id: { type: "string", description: "Post ID" },
          author: { $ref: "#/components/schemas/User" },
          content: { type: "string", description: "Post content" },
          images: {
            type: "array",
            items: { type: "string", format: "uri" },
            description: "Image URLs",
          },
          cardReferences: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cardId: { type: "string" },
                cardType: { type: "string", enum: ["pokemon", "yugioh", "onepiece"] },
              },
            },
            description: "Referenced cards",
          },
          deckReferences: {
            type: "array",
            items: { type: "string" },
            description: "Referenced deck IDs",
          },
          privacy: {
            type: "string",
            enum: ["public", "friends", "private"],
            description: "Post privacy setting",
          },
          tags: {
            type: "array",
            items: { $ref: "#/components/schemas/User" },
            description: "Tagged users",
          },
          likesCount: { type: "integer", description: "Number of likes" },
          commentsCount: { type: "integer", description: "Number of comments" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          _id: { type: "string", description: "Comment ID" },
          author: { $ref: "#/components/schemas/User" },
          post: { type: "string", description: "Post ID" },
          parentComment: { type: "string", description: "Parent comment ID" },
          content: { type: "string", description: "Comment content" },
          tags: {
            type: "array",
            items: { $ref: "#/components/schemas/User" },
            description: "Tagged users",
          },
          likesCount: { type: "integer", description: "Number of likes" },
          repliesCount: { type: "integer", description: "Number of replies" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          _id: { type: "string", description: "Notification ID" },
          recipient: { type: "string", description: "Recipient user ID" },
          sender: { $ref: "#/components/schemas/User" },
          type: {
            type: "string",
            enum: [
              "post_like",
              "post_comment",
              "comment_like",
              "comment_reply",
              "post_tag",
              "comment_tag",
              "friend_request",
              "friend_accept",
            ],
            description: "Notification type",
          },
          post: { type: "string", description: "Related post ID" },
          comment: { type: "string", description: "Related comment ID" },
          isRead: { type: "boolean", description: "Read status" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Friendship: {
        type: "object",
        properties: {
          _id: { type: "string", description: "Friendship ID" },
          requester: { $ref: "#/components/schemas/User" },
          recipient: { $ref: "#/components/schemas/User" },
          status: {
            type: "string",
            enum: ["pending", "accepted", "declined", "blocked"],
            description: "Friendship status",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Friend: {
        type: "object",
        properties: {
          _id: { type: "string", description: "User ID" },
          firstName: { type: "string", description: "First name" },
          lastName: { type: "string", description: "Last name" },
          avatarUrl: { type: "string", format: "uri", description: "Avatar URL" },
          friendshipId: { type: "string", description: "Friendship ID" },
          friendsSince: { type: "string", format: "date-time" },
        },
      },
      EmailVerificationOTP: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User's email address",
            example: "user@example.com",
          },
          otp: {
            type: "string",
            pattern: "^\\d{6}$",
            description: "6-digit HOTP code received via email",
            example: "123456",
          },
        },
        description: "Email verification using HMAC-based One-Time Password",
      },
      ResendOTP: {
        type: "object",
        required: ["email"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User's email address to resend OTP",
            example: "user@example.com",
          },
        },
        description: "Request to resend HOTP code",
      },
      PasswordResetOTP: {
        type: "object",
        required: ["email", "otp", "newPassword"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "User's email address",
            example: "user@example.com",
          },
          otp: {
            type: "string",
            pattern: "^\\d{6}$",
            description: "6-digit HOTP code received via email",
            example: "123456",
          },
          newPassword: {
            type: "string",
            format: "password",
            minLength: 8,
            pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
            description: "New password (must contain uppercase, lowercase, and number)",
            example: "NewSecurePass123",
          },
        },
        description: "Password reset using HMAC-based One-Time Password",
      },
      HOTPResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Operation success status",
            example: true,
          },
          message: {
            type: "string",
            description: "Success message in Vietnamese",
            example: "Xác thực email thành công",
          },
        },
        description: "Standard HOTP operation response",
      },
      HOTPError: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Operation success status",
            example: false,
          },
          error: {
            type: "string",
            description: "Error message in Vietnamese",
            example: "Invalid OTP code",
          },
        },
        description: "HOTP operation error response",
      },
      UnifiedCard: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "Card ID",
          },
          name: {
            type: "string",
            description: "Card name",
          },
          game: {
            type: "string",
            enum: ["pokemon", "yugioh", "onepiece"],
            description: "Game type",
          },
          image: {
            type: "string",
            description: "Card image URL",
          },
          rarity: {
            type: "string",
            description: "Card rarity",
          },
          set: {
            type: "string",
            description: "Set name",
          },
          price: {
            type: "object",
            properties: {
              low: { type: "number" },
              mid: { type: "number" },
              high: { type: "number" },
              market: { type: "number" },
            },
            description: "Card pricing information",
          },
        },
        description: "Unified card structure for all TCG types",
      },
      UnifiedSet: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "Set ID",
          },
          name: {
            type: "string",
            description: "Set name",
          },
          game: {
            type: "string",
            enum: ["pokemon", "yugioh", "onepiece"],
            description: "Game type",
          },
          releaseDate: {
            type: "string",
            format: "date",
            description: "Set release date",
          },
          cardCount: {
            type: "integer",
            description: "Total cards in set",
          },
          symbol: {
            type: "string",
            description: "Set symbol",
          },
          logo: {
            type: "string",
            description: "Set logo URL",
          },
        },
        description: "Unified set structure for all TCG types",
      },
      Pagination: {
        type: "object",
        properties: {
          page: {
            type: "integer",
            description: "Current page number",
          },
          limit: {
            type: "integer",
            description: "Items per page",
          },
          total: {
            type: "integer",
            description: "Total number of items",
          },
          totalPages: {
            type: "integer",
            description: "Total number of pages",
          },
        },
        description: "Pagination information",
      },
    },
  },
};
