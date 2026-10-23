# QuickNotes API Design

This is the **real** REST API the backend team should build (not JSONPlaceholder). It is versioned under `/v1`, uses JSON, and authenticates with a bearer token (`Authorization: Bearer <token>`). Every note belongs to one user; users can only access their own notes.

## Endpoints

| Method | Path | Description | Success status |
|--------|------|-------------|----------------|
| POST | `/v1/auth/login` | Exchange email and password for an access token | 200 OK |
| GET | `/v1/notes?limit=10&cursor=...&tag=...` | List the current user's notes (newest first, paginated, optional tag filter) | 200 OK |
| POST | `/v1/notes` | Create a note | 201 Created |
| GET | `/v1/notes/{id}` | Get a single note | 200 OK |
| PUT | `/v1/notes/{id}` | Replace a note's title and body | 200 OK |
| DELETE | `/v1/notes/{id}` | Delete a note | 204 No Content |
| GET | `/v1/tags` | List the current user's tags | 200 OK |
| POST | `/v1/notes/{id}/tags` | Attach a tag to a note (creates the tag if new) | 201 Created |
| DELETE | `/v1/notes/{id}/tags/{tagId}` | Remove a tag from a note | 204 No Content |

Design choices: nouns in paths, HTTP verbs for actions, plural collections, `201` plus the new resource on creation, `204` with no body on deletion, and cursor pagination so list calls stay fast with millions of rows.

## Example: create a note

**Request**

```http
POST /v1/notes
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "title": "Buy groceries",
  "body": "Milk, eggs, bread",
  "tags": ["personal", "shopping"]
}
```

**Response: 201 Created**

```http
Location: /v1/notes/4821
```

```json
{
  "id": 4821,
  "title": "Buy groceries",
  "body": "Milk, eggs, bread",
  "tags": ["personal", "shopping"],
  "user_id": 17,
  "created_at": "2026-10-23T09:15:00Z",
  "updated_at": "2026-10-23T09:15:00Z"
}
```

## Example: list notes

**Request**

```http
GET /v1/notes?limit=2
Authorization: Bearer eyJhbGciOi...
```

**Response: 200 OK**

```json
{
  "data": [
    {
      "id": 4821,
      "title": "Buy groceries",
      "body": "Milk, eggs, bread",
      "tags": ["personal", "shopping"],
      "created_at": "2026-10-23T09:15:00Z",
      "updated_at": "2026-10-23T09:15:00Z"
    },
    {
      "id": 4790,
      "title": "Project ideas",
      "body": "Flood map dashboard",
      "tags": ["work"],
      "created_at": "2026-10-22T16:40:00Z",
      "updated_at": "2026-10-22T16:40:00Z"
    }
  ],
  "next_cursor": "eyJpZCI6NDc5MH0="
}
```

An empty list returns `200 OK` with `"data": []` (not a 404).

## Error status codes

| Status | Meaning | When it happens |
|--------|---------|-----------------|
| 400 Bad Request | Invalid input | Missing title, title over 100 characters, malformed JSON |
| 401 Unauthorized | Not authenticated | Missing, expired or invalid token |
| 403 Forbidden | Authenticated but not allowed | Trying to read or change another user's note |
| 404 Not Found | Resource does not exist | Unknown note or tag id |
| 429 Too Many Requests | Rate limit exceeded | Too many requests from one client |
| 500 Internal Server Error | Unexpected server fault | Bug or dependency failure (no internal details exposed) |

All errors use the same body shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title must be 100 characters or fewer.",
    "field": "title",
    "request_id": "req_9f2c1a"
  }
}
```
