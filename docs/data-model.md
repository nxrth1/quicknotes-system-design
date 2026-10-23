# QuickNotes Data Model

## Entities

### users
| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (identity) | **Primary key** |
| email | VARCHAR(255) | Unique, not null |
| display_name | VARCHAR(100) | Not null |
| password_hash | VARCHAR(255) | Not null |
| created_at | TIMESTAMPTZ | Not null, default now() |

### notes
| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (identity) | **Primary key** |
| user_id | BIGINT | **Foreign key** → users(id), not null |
| title | VARCHAR(100) | Not null |
| body | TEXT | Optional |
| created_at | TIMESTAMPTZ | Not null, default now() |
| updated_at | TIMESTAMPTZ | Not null, default now() |

### tags
| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (identity) | **Primary key** |
| user_id | BIGINT | **Foreign key** → users(id), not null |
| name | VARCHAR(50) | Not null; unique per user |

### note_tags (join table)
| Column | Type | Key / constraint |
|--------|------|------------------|
| note_id | BIGINT | **Primary key (part 1)**, **foreign key** → notes(id) |
| tag_id | BIGINT | **Primary key (part 2)**, **foreign key** → tags(id) |

## Relationships

- **One-to-many: users → notes.** One user owns many notes; each note belongs to exactly one user (`notes.user_id`).
- **One-to-many: users → tags.** Each user has their own set of tags (`tags.user_id`).
- **Many-to-many: notes ↔ tags.** A note can have many tags and a tag can label many notes. A relational database cannot store this directly, so the join table `note_tags` holds one row per (note, tag) pair; its composite primary key prevents duplicates.

## CREATE TABLE statements (PostgreSQL)

```sql
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  display_name  VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  body       TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

## Example queries

**1. Latest 10 notes for a user (powers `GET /v1/notes`)**

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 17
ORDER BY created_at DESC
LIMIT 10;
```

**2. Notes with a given tag (JOIN across three tables)**

```sql
SELECT n.id, n.title, n.created_at
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 17
  AND t.name = 'work'
ORDER BY n.created_at DESC;
```

**3. How many notes each tag has for a user**

```sql
SELECT t.name, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 17
GROUP BY t.name
ORDER BY note_count DESC;
```

**4. Update a note's title**

```sql
UPDATE notes
SET title = 'Buy groceries today', updated_at = now()
WHERE id = 4821 AND user_id = 17;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id);
```

**Why:** the most common query is "this user's newest notes". Without `idx_notes_user_created`, the database would scan the whole notes table (about 150 million rows after a year). With it, the rows are already filtered by user and sorted by date, so the query reads only the first 10 index entries. `idx_note_tags_tag` speeds up "all notes with this tag", because the primary key only helps lookups starting from `note_id`.

## SQL or NoSQL?

I chose **SQL (PostgreSQL)**. QuickNotes data is clearly relational (users own notes, notes and tags form a many-to-many link), and foreign keys, unique constraints and transactions keep that data consistent, for example making sure a deleted note leaves no orphan tag links. Our access patterns are simple and always filtered by user, and one year of data (about 150 GB) fits comfortably on one primary with read replicas. If a single database ever becomes the limit, we can shard by `user_id`. A NoSQL document store would scale writes more easily but would make tag queries and consistency harder for little benefit at this size.
