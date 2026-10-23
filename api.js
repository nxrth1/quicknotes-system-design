// QuickNotes API client — talks to the JSONPlaceholder practice API.
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const form = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");
const notesList = document.getElementById("notes-list");

// ---------- UI helpers ----------

// type: "loading" | "success" | "error" | "" (clears the message)
function setStatus(message, type = "") {
  statusEl.textContent = message; // textContent only: never innerHTML
  statusEl.className = type;
}

// Disable every button while a request runs so users cannot double-submit.
function setBusy(isBusy) {
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
  notesList.querySelectorAll("button").forEach((btn) => {
    btn.disabled = isBusy;
  });
}

function showEmptyState() {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "No notes yet. Click \"Load notes\" or add one above.";
  notesList.replaceChildren(li);
}

function removeEmptyState() {
  const empty = notesList.querySelector("li.empty");
  if (empty) empty.remove();
}

// Builds one <li>. All user/server text goes in through textContent.
function createNoteElement(note, isLocal = false) {
  const li = document.createElement("li");
  li.dataset.id = note.id;
  li.dataset.local = String(isLocal);

  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title;

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body || "";

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "delete-btn";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", () => deleteNote(note.id, li));

  li.append(title, body, delBtn);
  return li;
}

function renderNotes(notes) {
  if (notes.length === 0) {
    showEmptyState();
    return;
  }
  notesList.replaceChildren(...notes.map((n) => createNoteElement(n)));
}

// ---------- Reusable request function ----------

async function request(path = "", options = {}) {
  const response = await fetch(API_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return { status: response.status, data };
}

// ---------- GET: load 10 notes ----------

async function loadNotes() {
  setStatus("Loading notes...", "loading");
  setBusy(true);
  try {
    const { data } = await request("?_limit=10");
    renderNotes(data);
    if (data.length === 0) {
      setStatus("The server returned no notes.", "success");
    } else {
      setStatus(`Loaded ${data.length} notes from the server.`, "success");
    }
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we couldn't load your notes. Please check your connection and try again.", "error");
  } finally {
    setBusy(false);
  }
}

// ---------- Validation ----------

// Returns an error message, or "" when valid. Body is optional.
function validateTitle(title) {
  if (title.length === 0) return "Title is required.";
  if (title.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or fewer (currently ${title.length}).`;
  }
  return "";
}

// ---------- POST: create a note ----------

async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    titleInput.focus();
    return;
  }

  setStatus("Saving note...", "loading");
  setBusy(true);
  try {
    const { status, data } = await request("", {
      method: "POST",
      body: JSON.stringify({ title, body, userId: 1 }),
    });
    removeEmptyState();
    // isLocal = true: JSONPlaceholder echoes the note but does not store it.
    notesList.prepend(createNoteElement(data, true));
    form.reset();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we couldn't create your note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

// ---------- DELETE: remove a note ----------

/*
 * JSONPlaceholder does NOT really store what we create: a POST returns a fake
 * id (always 101) but the note never exists on the server. Sending
 * DELETE /posts/101 would therefore be meaningless (the fake API replies
 * "OK" for any id). My approach:
 *   - Notes loaded from the server (isLocal = false): send a real DELETE
 *     request, and only remove the note from the page if it succeeds.
 *   - Notes created in this session (isLocal = true): they only exist in the
 *     browser, so we remove them from the list without calling the server.
 * With a real backend, both cases would be a normal DELETE /notes/{id}.
 * Note: JSONPlaceholder also won't remove server notes, so clicking
 * "Load notes" again brings them back. That is expected for a practice API.
 */
async function deleteNote(id, li) {
  if (li.dataset.local === "true") {
    li.remove();
    if (notesList.children.length === 0) showEmptyState();
    setStatus("Note removed (it only existed in your browser).", "success");
    return;
  }

  setStatus("Deleting note...", "loading");
  setBusy(true);
  try {
    const { status } = await request(`/${id}`, { method: "DELETE" });
    li.remove();
    if (notesList.children.length === 0) showEmptyState();
    setStatus(`Note ${id} deleted (status ${status}).`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we couldn't delete that note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

// ---------- Wire up events ----------

loadBtn.addEventListener("click", loadNotes);
form.addEventListener("submit", createNote);
showEmptyState();
