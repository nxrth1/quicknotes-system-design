# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts: a small front-end **API client** that proves the browser can talk to a REST API (using the free [JSONPlaceholder](https://jsonplaceholder.typicode.com) practice API), and **design documents** the backend team will build the real service from.

## How to run the API client

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/quicknotes-system-design.git
   cd quicknotes-system-design
   ```
2. Open `index.html` in your browser (double-click it, or run `python3 -m http.server 8000` and visit http://localhost:8000).
3. Click **Load notes** to fetch 10 notes (GET), use the form to add a note (POST), and click **Delete** on a note to remove it (DELETE).

No build step or install is needed. You need an internet connection to reach JSONPlaceholder.

Note: JSONPlaceholder does not actually store created or deleted notes, so changes disappear on reload. See the comment above `deleteNote()` in `api.js` for how this is handled.

## Project files

| File | Purpose |
|------|---------|
| `index.html` | Page structure: load button, status message, note form, notes list |
| `api.js` | `request()` helper plus GET, POST and DELETE, validation and UI states |
| `style.css` | Styling, including distinct success and error messages |

## Design documents

- [API design](docs/api-design.md): REST endpoints, JSON examples and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes and SQL vs NoSQL
- [Architecture](docs/architecture.md): requirements, load estimates, diagram, request flows and trade-offs

## What I learned

- **A reusable `request()` function keeps error handling in one place.** `fetch` only rejects on network failures, so I must check `response.ok` myself and throw; wrapping each call in `try / catch / finally` lets the UI show friendly errors and always re-enable buttons.
- **Good UX needs loading, success, error and empty states.** Disabling buttons while a request runs prevents duplicate submissions, and using `textContent` instead of `innerHTML` prevents XSS from user text.
- **Design starts with numbers.** Estimating 1 million users as about 230 peak reads/s and 25 peak writes/s showed the system is read-heavy, which justified a cache and a read replica instead of over-engineering the write path.
- **Relational modelling and REST design go together.** The many-to-many link between notes and tags needs a join table, and a consistent resource-based API with correct status codes (201, 204, 401, 403, 404) makes the backend predictable for clients.
- **Every component should solve a named problem, and each one needs a plan for failure.** Redundant app servers, a promotable replica and a queue with retrying workers remove single points of failure.
