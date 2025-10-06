/* Sticky Notes app (localStorage) with drag-drop + Firebase sync stub */
(() => {
  'use strict';

  const NOTES_KEY = 'sticky-notes:v1';
  const AUTOSAVE_DELAY = 700; // ms
  let notes = [];
  const debouncers = new Map();

  // Drag state
  let dragState = { draggingId: null, startIndex: null };

  // --- utilities ---
  function generateId(){
    try { return crypto.randomUUID(); } catch(e) { return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  }
  function now(){ return Date.now(); }
  function saveToStorage(){
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (err) {
      console.error('Save failed', err);
      alert('Unable to save notes — localStorage may be full or blocked.');
    }
  }
  function loadFromStorage(){
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Load failed', err);
      return [];
    }
  }

  // --- models & CRUD ---
  function createNoteObject(content = '', color = 'yellow'){
    return { id: generateId(), content, color, createdAt: now(), updatedAt: now(), position: notes.length };
  }

  function addNote(content = '', color = 'yellow', focus = true){
    const note = createNoteObject(content, color);
    notes.unshift(note); // newest first
    syncPositions();
    saveToStorage();
    renderNotes(currentFilter);
    if (focus) {
      requestAnimationFrame(() => {
        const el = document.querySelector(`.note[data-id="${note.id}"] textarea`);
        if (el) el.focus();
      });
    }
  }

  function deleteNote(id){
    notes = notes.filter(n => n.id !== id);
    debouncers.delete(id);
    syncPositions();
    saveToStorage();
    renderNotes(currentFilter);
  }

  function updateNote(id, patch){
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return;
    notes[idx] = { ...notes[idx], ...patch, updatedAt: now() };
    saveToStorage();
  }

  function reorderNotes(fromIndex, toIndex){
    if (fromIndex === toIndex) return;
    const item = notes.splice(fromIndex,1)[0];
    notes.splice(toIndex,0,item);
    syncPositions();
    saveToStorage();
    renderNotes(currentFilter);
  }

  function syncPositions(){
    // maintain position field consistent with order in array
    notes.forEach((n,i) => n.position = i);
  }

  // --- rendering ---
  const container = document.getElementById('notesContainer');
  let currentFilter = '';

  function renderNotes(filter = ''){
    currentFilter = (filter || '').trim().toLowerCase();
    container.innerHTML = '';
    const toRender = notes.filter(n => n.content.toLowerCase().includes(currentFilter));
    if (toRender.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No notes — create one with New or press Ctrl/Cmd+N';
      container.appendChild(empty);
      return;
    }
    toRender.forEach((n, idx) => {
      container.appendChild(renderNoteElement(n, idx));
    });
  }

  function renderNoteElement(note, index){
    const el = document.createElement('article');
    el.className = 'note';
    el.dataset.id = note.id;
    el.dataset.color = note.color || 'yellow';
    el.draggable = true;
    el.dataset.index = index;

    // toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const colorSelect = document.createElement('select');
    ['yellow','pink','green','blue'].forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; if (c === note.color) o.selected = true;
      colorSelect.appendChild(o);
    });
    colorSelect.title = 'Change color';
    colorSelect.addEventListener('change', (e) => {
      updateNote(note.id, { color: e.target.value });
      el.dataset.color = e.target.value;
    });

    const meta = document.createElement('div');
    meta.className = 'meta';
    const date = new Date(note.updatedAt);
    meta.textContent = date.toLocaleString();

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = 'Delete note';
    delBtn.setAttribute('aria-label','Delete note');
    delBtn.innerHTML = '🗑️';
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this note?')) deleteNote(note.id);
    });

    toolbar.appendChild(colorSelect);
    toolbar.appendChild(meta);
    toolbar.appendChild(delBtn);

    // textarea
    const ta = document.createElement('textarea');
    ta.value = note.content || '';
    ta.setAttribute('aria-label', 'Note content');
    ta.rows = Math.max(3, Math.min(12, ta.value.split('\n').length + 1));

    // save on input (debounced per-note)
    ta.addEventListener('input', (e) => {
      ta.rows = Math.max(3, Math.min(12, ta.value.split('\n').length + 1));
      if (debouncers.has(note.id)) clearTimeout(debouncers.get(note.id));
      const t = setTimeout(() => {
        updateNote(note.id, { content: ta.value });
        const newDate = new Date(notes.find(n=>n.id===note.id).updatedAt);
        meta.textContent = newDate.toLocaleString();
      }, AUTOSAVE_DELAY);
      debouncers.set(note.id, t);
    });

    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        ta.blur();
      }
    });

    // drag events
    el.addEventListener('dragstart', (e) => {
      dragState.draggingId = note.id;
      dragState.startIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', note.id); } catch (err) {}
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', (e) => {
      el.classList.remove('dragging');
      dragState = { draggingId: null, startIndex: null };
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = dragState.startIndex;
      const to = Number(el.dataset.index);
      if (from != null) reorderNotes(from, to);
    });

    el.appendChild(toolbar);
    el.appendChild(ta);
    return el;
  }

  // --- export/import/clear ---
  function exportNotes(){
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sticky-notes-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importNotesFile(file){
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid file format');
        const existingIds = new Set(notes.map(n => n.id));
        const toAdd = imported.filter(n => n && n.id && !existingIds.has(n.id));
        notes = [...toAdd, ...notes];
        syncPositions();
        saveToStorage();
        renderNotes(currentFilter);
        alert(`Imported ${toAdd.length} new notes.`);
      } catch (err) {
        console.error(err);
        alert('Import failed: invalid JSON structure.');
      }
    };
    reader.readAsText(file);
  }

  function clearAllNotes(){
    if (!confirm('Delete ALL notes? This cannot be undone.')) return;
    notes = [];
    saveToStorage();
    renderNotes('');
  }

  // --- Firebase sync stub ---
  // NOTE: This is a lightweight example stub showing where to add Firebase realtime sync.
  // It does NOT include any API keys. To enable, create a Firebase project and replace the config.
  const firebaseSync = {
    enabled: false,
    // initialize would load firebase scripts and initialize app (not executed by default)
    async initialize(config){
      console.warn('Firebase initialize called — this is a stub. Replace config and enable in code to use real Firebase.');
      this.enabled = true;
      // Example logic (not executed here):
      // import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
      // import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";
      // const app = initializeApp(config);
      // const db = getDatabase(app);
      // onValue(ref(db, 'notes'), (snapshot) => { /* merge */ });
    },
    async pushAll(){
      if (!this.enabled) return alert('Firebase sync not enabled — initialize first.');
      // push notes to remote. This is a stub.
      alert('Sync pushed (stub). Replace with real Firebase logic to enable.');
    }
  };

  // --- initialization & event wiring ---
  const addNoteBtn = document.getElementById('addNoteBtn');
  const searchInput = document.getElementById('search');
  const clearBtn = document.getElementById('clearBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFile');
  const syncBtn = document.getElementById('syncBtn');

  addNoteBtn.addEventListener('click', () => addNote('', 'yellow', true));
  searchInput.addEventListener('input', (e) => renderNotes(e.target.value));
  clearBtn.addEventListener('click', clearAllNotes);
  exportBtn.addEventListener('click', exportNotes);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    importNotesFile(f);
    importFileInput.value = '';
  });
  syncBtn.addEventListener('click', () => firebaseSync.pushAll());

  // keyboard: Ctrl/Cmd + N to create note
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      addNote('', 'yellow', true);
    }
  });

  // load on start
  function init(){
    notes = loadFromStorage();
    // ensure positions are synced
    notes.sort((a,b) => (a.position ?? 0) - (b.position ?? 0));
    syncPositions();
    renderNotes('');
  }

  init();

  // expose minimal API for debugging in console
  window.stickyNotesApp = {
    addNote, deleteNote, updateNote, exportNotes, importNotesFile, getNotes: () => notes.slice(), firebaseSync
  };
})();
