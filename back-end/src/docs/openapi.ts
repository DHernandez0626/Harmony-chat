export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Chat API",
    version: "1.0.0",
    description:
      "HTTP API on port 8000. Live chat is a separate socket at ws://localhost:8001/rooms/{roomId}. The browser sends the accessToken cookie. A bad token is 401, a user who is not in room_users is 403, and a bad room id is 404. Text frames are relayed to the other open sockets in that room.",
  },
  servers: [{ url: "http://localhost:8000" }],
  components: {
    securitySchemes: {
      accessToken: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
      },
      refreshToken: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
      },
    },
  },
  paths: {
    "/api/auth/login": {
      post: {
        summary: "Log in and set the auth cookies",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "accessToken and refreshToken cookies set",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                },
              },
            },
          },
          "400": { description: "Username or password is missing" },
          "401": { description: "Wrong username or password" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Create an account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "username", "password"],
                properties: {
                  email: { type: "string" },
                  username: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    email: { type: "string" },
                    username: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description:
              "A field is missing, or the email or username is already registered",
          },
          "500": { description: "The account could not be created" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Revoke the session and clear the auth cookies",
        security: [{ accessToken: [], refreshToken: [] }],
        responses: {
          "200": { description: "Cookies cleared" },
          "400": {
            description: "accessToken or refreshToken cookie is missing",
          },
          "401": { description: "The token or session is not valid" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        summary: "Rotate the session and set new auth cookies",
        security: [{ refreshToken: [] }],
        responses: {
          "200": {
            description: "New accessToken and refreshToken cookies set",
          },
          "400": { description: "refreshToken cookie is missing" },
          "401": {
            description: "The refresh token is missing, expired, or revoked",
          },
        },
      },
    },
    "/api/rooms": {
      get: {
        summary: "List rooms",
        parameters: [
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Case-insensitive match on the room name",
          },
          {
            name: "userCount",
            in: "query",
            schema: { type: "string" },
            description:
              "Keep rooms whose member count equals this whole number",
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["name", "userCount"] },
          },
          {
            name: "order",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"] },
          },
        ],
        responses: {
          "200": {
            description: "Rooms that match the filters",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                      hasPassword: { type: "boolean" },
                      createdAt: { type: "string", format: "date-time" },
                      usernames: { type: "array", items: { type: "string" } },
                      userCount: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "A query value is not allowed" },
        },
      },
      delete: {
        summary: "Delete a room",
        description: "Admin only. The room id is in the JSON body.",
        security: [{ accessToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "204": { description: "Room deleted" },
          "400": { description: "Room id is missing or is not a UUID" },
          "401": { description: "Not logged in" },
          "403": { description: "Logged in, but not an admin" },
          "404": { description: "No room with that id" },
        },
      },
    },
    "/api/rooms/{id}/messages": {
      get: {
        summary: "List messages in a room",
        description:
          "Oldest first. The caller must already be a member of the room. New messages are still delivered on the WebSocket.",
        security: [{ accessToken: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Saved messages",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["sender", "text"],
                    properties: {
                      sender: { type: "string" },
                      text: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Room id is not a UUID" },
          "401": { description: "Not logged in" },
          "403": { description: "Logged in, but not a member of this room" },
          "404": { description: "No room with that id" },
        },
      },
    },
    "/api/rooms/{id}/members": {
      get: {
        summary: "List members of a room",
        description:
          "People who have joined this room. The caller must already be a member.",
        security: [{ accessToken: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Room members",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["id", "name"],
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Room id is not a UUID" },
          "401": { description: "Not logged in" },
          "403": { description: "Logged in, but not a member of this room" },
          "404": { description: "No room with that id" },
        },
      },
    },
    "/api/rooms/{id}": {
      post: {
        summary: "Join a room",
        security: [{ accessToken: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  password: {
                    type: "string",
                    description: "Required when the room has a password",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Membership saved" },
          "400": {
            description:
              "Room id is not a UUID, or the room password is missing",
          },
          "401": {
            description: "Not logged in, or the room password is wrong",
          },
          "404": { description: "No room with that id" },
        },
      },
    },
  },
};
