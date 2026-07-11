/* ============================================================
   YURT YOKLAMA SİSTEMİ - app.js
   Tüm veriler tarayıcı localStorage'ında saklanır.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------- STORAGE KEYS ---------------------- */
  const KEYS = {
    floors: 'yurt_floors',
    rooms: 'yurt_rooms',
    students: 'yurt_students',
    attendance: 'yurt_attendance'
  };

  /* ---------------------- STATE ---------------------- */
  let state = {
    floors: [],      // {id, name}
    rooms: [],       // {id, floorId, number, capacity}
    students: [],    // {id, roomId, name}
    attendance: {}   // { 'YYYY-MM-DD': { studentId: 'present' | 'absent' } }
  };

  /* ---------------------- UTIL ---------------------- */
  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateTR(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  function saveState() {
    localStorage.setItem(KEYS.floors, JSON.stringify(state.floors));
    localStorage.setItem(KEYS.rooms, JSON.stringify(state.rooms));
    localStorage.setItem(KEYS.students, JSON.stringify(state.students));
    localStorage.setItem(KEYS.attendance, JSON.stringify(state.attendance));
  }

  function loadState() {
    try {
      state.floors = JSON.parse(localStorage.getItem(KEYS.floors)) || [];
      state.rooms = JSON.parse(localStorage.getItem(KEYS.rooms)) || [];
      state.students = JSON.parse(localStorage.getItem(KEYS.students)) || [];
      state.attendance = JSON.parse(localStorage.getItem(KEYS.attendance)) || {};
    } catch (e) {
      console.error('Veri yüklenirken hata oluştu, sıfırlanıyor.', e);
      state = { floors: [], rooms: [], students: [], attendance: {} };
    }
  }

  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 2400);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ---------------------- LOOKUPS ---------------------- */
  function getFloor(id) { return state.floors.find(f => f.id === id); }
  function getRoom(id) { return state.rooms.find(r => r.id === id); }
  function getRoomsByFloor(floorId) { return state.rooms.filter(r => r.floorId === floorId); }
  function getStudentsByRoom(roomId) { return state.students.filter(s => s.roomId === roomId); }
  function getFloorOfRoom(room) { return room ? getFloor(room.floorId) : null; }

  /* Sıralı: kat adı, oda no, öğrenci adı */
  function sortedFloors() {
    return [...state.floors].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }
  function sortedRoomsOfFloor(floorId) {
    return getRoomsByFloor(floorId).sort((a, b) =>
      a.number.localeCompare(b.number, 'tr', { numeric: true }));
  }
  function sortedStudentsOfRoom(roomId) {
    return getStudentsByRoom(roomId).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }

  /* ============================================================
     TAB NAVIGATION
     ============================================================ */
  function initTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');

        if (btn.dataset.tab === 'attendance') renderAttendanceTab();
        if (btn.dataset.tab === 'manage') renderManageTab();
        if (btn.dataset.tab === 'history') renderHistoryTab();
      });
    });
  }

  /* ============================================================
     MANAGE TAB (Floors / Rooms / Students)
     ============================================================ */
  function renderManageTab() {
    renderFloorsList();
    renderRoomsList();
    renderStudentsList();
    fillFloorSelects();
    fillRoomSelects();
  }

  function renderFloorsList() {
    const list = document.getElementById('list-floors');
    const empty = document.getElementById('floors-empty');
    const floors = sortedFloors();
    empty.classList.toggle('hidden', floors.length > 0);
    list.innerHTML = floors.map(f => {
      const roomCount = getRoomsByFloor(f.id).length;
      return `
        <li class="entity-card" data-id="${f.id}">
          <div>
            <p class="font-semibold text-slate-700">${escapeHtml(f.name)}</p>
            <p class="text-xs text-slate-400">${roomCount} oda</p>
          </div>
          <div class="flex gap-1">
            <button class="btn-icon edit-floor" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon danger delete-floor" title="Sil"><i class="fa-solid fa-trash"></i></button>
          </div>
        </li>`;
    }).join('');
  }

  function renderRoomsList() {
    const list = document.getElementById('list-rooms');
    const empty = document.getElementById('rooms-empty');
    const rooms = [...state.rooms].sort((a, b) => {
      const fa = getFloor(a.floorId)?.name || '';
      const fb = getFloor(b.floorId)?.name || '';
      return fa.localeCompare(fb, 'tr') || a.number.localeCompare(b.number, 'tr', { numeric: true });
    });
    empty.classList.toggle('hidden', rooms.length > 0);
    list.innerHTML = rooms.map(r => {
      const floor = getFloor(r.floorId);
      const studentCount = getStudentsByRoom(r.id).length;
      const over = studentCount > r.capacity;
      return `
        <li class="entity-card" data-id="${r.id}">
          <div>
            <p class="font-semibold text-slate-700">Oda ${escapeHtml(r.number)} <span class="text-xs text-slate-400 font-normal">(${escapeHtml(floor ? floor.name : '—')})</span></p>
            <p class="text-xs ${over ? 'text-rose-500 font-semibold' : 'text-slate-400'}">${studentCount}/${r.capacity} kişi</p>
          </div>
          <div class="flex gap-1">
            <button class="btn-icon edit-room" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon danger delete-room" title="Sil"><i class="fa-solid fa-trash"></i></button>
          </div>
        </li>`;
    }).join('');
  }

  function renderStudentsList() {
    const list = document.getElementById('list-students');
    const empty = document.getElementById('students-empty');
    const students = [...state.students].sort((a, b) => {
      const roomA = getRoom(a.roomId), roomB = getRoom(b.roomId);
      const fa = getFloorOfRoom(roomA)?.name || '';
      const fb = getFloorOfRoom(roomB)?.name || '';
      return fa.localeCompare(fb, 'tr') ||
        (roomA?.number || '').localeCompare(roomB?.number || '', 'tr', { numeric: true }) ||
        a.name.localeCompare(b.name, 'tr');
    });
    empty.classList.toggle('hidden', students.length > 0);
    list.innerHTML = students.map(s => {
      const room = getRoom(s.roomId);
      const floor = getFloorOfRoom(room);
      return `
        <li class="entity-card" data-id="${s.id}">
          <div>
            <p class="font-semibold text-slate-700">${escapeHtml(s.name)}</p>
            <p class="text-xs text-slate-400">${floor ? escapeHtml(floor.name) : '—'} • Oda ${room ? escapeHtml(room.number) : '—'}</p>
          </div>
          <div class="flex gap-1">
            <button class="btn-icon edit-student" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon danger delete-student" title="Sil"><i class="fa-solid fa-trash"></i></button>
          </div>
        </li>`;
    }).join('');
  }

  function fillFloorSelects() {
    const floors = sortedFloors();
    const options = '<option value="">Kat seçiniz</option>' +
      floors.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');

    const selectRoomFloor = document.getElementById('select-room-floor');
    const prevRoomFloor = selectRoomFloor.value;
    selectRoomFloor.innerHTML = options;
    if (floors.some(f => f.id === prevRoomFloor)) selectRoomFloor.value = prevRoomFloor;

    const filter = document.getElementById('attendance-floor-filter');
    const prevFilter = filter.value;
    filter.innerHTML = '<option value="">Tüm Katlar</option>' +
      floors.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
    if (floors.some(f => f.id === prevFilter)) filter.value = prevFilter;
  }

  function fillRoomSelects() {
    const rooms = [...state.rooms].sort((a, b) => {
      const fa = getFloor(a.floorId)?.name || '';
      const fb = getFloor(b.floorId)?.name || '';
      return fa.localeCompare(fb, 'tr') || a.number.localeCompare(b.number, 'tr', { numeric: true });
    });
    const select = document.getElementById('select-student-room');
    const prev = select.value;
    select.innerHTML = '<option value="">Oda seçiniz</option>' +
      rooms.map(r => {
        const floor = getFloor(r.floorId);
        return `<option value="${r.id}">${escapeHtml(floor ? floor.name : '')} - Oda ${escapeHtml(r.number)}</option>`;
      }).join('');
    if (rooms.some(r => r.id === prev)) select.value = prev;
  }

  /* ----- Floor CRUD ----- */
  document.getElementById('form-add-floor').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('input-floor-name');
    const name = input.value.trim();
    if (!name) return;
    if (state.floors.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      toast('Bu kat adı zaten mevcut.', 'error');
      return;
    }
    state.floors.push({ id: uid(), name });
    saveState();
    input.value = '';
    renderManageTab();
    toast('Kat eklendi: ' + name, 'success');
  });

  document.getElementById('list-floors').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    const floor = getFloor(id);
    if (e.target.closest('.edit-floor')) {
      const newName = prompt('Kat adını düzenle:', floor.name);
      if (newName && newName.trim()) {
        floor.name = newName.trim();
        saveState();
        renderManageTab();
        toast('Kat güncellendi.', 'success');
      }
    } else if (e.target.closest('.delete-floor')) {
      const roomCount = getRoomsByFloor(id).length;
      const msg = roomCount > 0
        ? `Bu katta ${roomCount} oda var. Kat ile birlikte tüm odalar ve öğrencileri silinecek. Onaylıyor musunuz?`
        : 'Bu katı silmek istediğinize emin misiniz?';
      if (!confirm(msg)) return;
      const roomIds = getRoomsByFloor(id).map(r => r.id);
      state.students = state.students.filter(s => !roomIds.includes(s.roomId));
      state.rooms = state.rooms.filter(r => r.floorId !== id);
      state.floors = state.floors.filter(f => f.id !== id);
      saveState();
      renderManageTab();
      toast('Kat silindi.', 'success');
    }
  });

  /* ----- Room CRUD ----- */
  document.getElementById('form-add-room').addEventListener('submit', (e) => {
    e.preventDefault();
    const floorId = document.getElementById('select-room-floor').value;
    const numberInput = document.getElementById('input-room-number');
    const capacityInput = document.getElementById('input-room-capacity');
    const number = numberInput.value.trim();
    const capacity = parseInt(capacityInput.value, 10) || 1;
    if (!floorId) { toast('Lütfen kat seçin.', 'error'); return; }
    if (!number) return;
    if (state.rooms.some(r => r.floorId === floorId && r.number.toLowerCase() === number.toLowerCase())) {
      toast('Bu katta aynı numaralı oda zaten var.', 'error');
      return;
    }
    state.rooms.push({ id: uid(), floorId, number, capacity });
    saveState();
    numberInput.value = '';
    capacityInput.value = 4;
    renderManageTab();
    toast('Oda eklendi: ' + number, 'success');
  });

  document.getElementById('list-rooms').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    const room = getRoom(id);
    if (e.target.closest('.edit-room')) {
      const newNumber = prompt('Oda numarasını düzenle:', room.number);
      if (newNumber && newNumber.trim()) room.number = newNumber.trim();
      const newCap = prompt('Kapasiteyi düzenle:', room.capacity);
      if (newCap && !isNaN(parseInt(newCap, 10))) room.capacity = parseInt(newCap, 10);
      saveState();
      renderManageTab();
      toast('Oda güncellendi.', 'success');
    } else if (e.target.closest('.delete-room')) {
      const studentCount = getStudentsByRoom(id).length;
      const msg = studentCount > 0
        ? `Bu odada ${studentCount} öğrenci var. Oda ile birlikte öğrenciler de silinecek. Onaylıyor musunuz?`
        : 'Bu odayı silmek istediğinize emin misiniz?';
      if (!confirm(msg)) return;
      state.students = state.students.filter(s => s.roomId !== id);
      state.rooms = state.rooms.filter(r => r.id !== id);
      saveState();
      renderManageTab();
      toast('Oda silindi.', 'success');
    }
  });

  /* ----- Student CRUD ----- */
  document.getElementById('form-add-student').addEventListener('submit', (e) => {
    e.preventDefault();
    const roomId = document.getElementById('select-student-room').value;
    const nameInput = document.getElementById('input-student-name');
    const name = nameInput.value.trim();
    if (!roomId) { toast('Lütfen oda seçin.', 'error'); return; }
    if (!name) return;
    const room = getRoom(roomId);
    const currentCount = getStudentsByRoom(roomId).length;
    if (room && currentCount >= room.capacity) {
      if (!confirm(`Bu oda kapasitesi (${room.capacity}) dolu. Yine de eklemek istiyor musunuz?`)) return;
    }
    state.students.push({ id: uid(), roomId, name });
    saveState();
    nameInput.value = '';
    renderManageTab();
    toast('Öğrenci eklendi: ' + name, 'success');
  });

  document.getElementById('list-students').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = li.dataset.id;
    const student = state.students.find(s => s.id === id);
    if (e.target.closest('.edit-student')) {
      const newName = prompt('Öğrenci adını düzenle:', student.name);
      if (newName && newName.trim()) {
        student.name = newName.trim();
        saveState();
        renderManageTab();
        toast('Öğrenci güncellendi.', 'success');
      }
    } else if (e.target.closest('.delete-student')) {
      if (!confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) return;
      state.students = state.students.filter(s => s.id !== id);
      saveState();
      renderManageTab();
      toast('Öğrenci silindi.', 'success');
    }
  });

  /* ============================================================
     ATTENDANCE TAB
     ============================================================ */
  function currentAttendanceDate() {
    return document.getElementById('attendance-date').value || todayStr();
  }

  function getDayAttendance(dateStr) {
    if (!state.attendance[dateStr]) state.attendance[dateStr] = {};
    return state.attendance[dateStr];
  }

  function renderAttendanceTab() {
    const dateInput = document.getElementById('attendance-date');
    if (!dateInput.value) dateInput.value = todayStr();
    renderAttendanceList();
  }

  function renderAttendanceList() {
    const container = document.getElementById('attendance-list-container');
    const emptyEl = document.getElementById('attendance-empty');
    const dateStr = currentAttendanceDate();
    const dayData = getDayAttendance(dateStr);
    const floorFilter = document.getElementById('attendance-floor-filter').value;
    const search = document.getElementById('attendance-search').value.trim().toLowerCase();

    if (state.students.length === 0) {
      container.innerHTML = '';
      emptyEl.classList.remove('hidden');
      renderAttendanceSummary(dateStr);
      return;
    }
    emptyEl.classList.add('hidden');

    let floors = sortedFloors();
    if (floorFilter) floors = floors.filter(f => f.id === floorFilter);

    let html = '';
    floors.forEach(floor => {
      const rooms = sortedRoomsOfFloor(floor.id);
      let floorHasContent = false;
      let floorHtml = '';

      rooms.forEach(room => {
        let students = sortedStudentsOfRoom(room.id);
        if (search) {
          students = students.filter(s =>
            s.name.toLowerCase().includes(search) || room.number.toLowerCase().includes(search));
        }
        if (students.length === 0) return;
        floorHasContent = true;
        floorHtml += `<div class="room-group-header"><i class="fa-solid fa-door-open"></i> Oda ${escapeHtml(room.number)} (${students.length} kişi)</div>`;
        students.forEach(s => {
          const status = dayData[s.id] || 'present'; // default: yurtta
          floorHtml += `
            <div class="attendance-row" data-student-id="${s.id}">
              <span class="font-medium text-slate-700"><i class="fa-solid fa-user text-slate-300 mr-1"></i>${escapeHtml(s.name)}</span>
              <div class="toggle-group">
                <button type="button" class="toggle-btn present ${status === 'present' ? 'selected' : ''}" data-status="present">
                  <i class="fa-solid fa-check"></i> Yurtta
                </button>
                <button type="button" class="toggle-btn absent ${status === 'absent' ? 'selected' : ''}" data-status="absent">
                  <i class="fa-solid fa-xmark"></i> Dışarıda
                </button>
              </div>
            </div>`;
        });
      });

      if (floorHasContent) {
        html += `<div class="floor-group-header"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(floor.name)}</div>` + floorHtml;
      }
    });

    if (!html) {
      html = `<div class="p-10 text-center text-slate-400"><i class="fa-solid fa-magnifying-glass text-3xl mb-2"></i><p>Sonuç bulunamadı.</p></div>`;
    }
    container.innerHTML = html;
    renderAttendanceSummary(dateStr);
  }

  function renderAttendanceSummary(dateStr) {
    const dayData = getDayAttendance(dateStr);
    const total = state.students.length;
    let present = 0, absent = 0;
    state.students.forEach(s => {
      const status = dayData[s.id] || 'present';
      if (status === 'present') present++; else absent++;
    });
    const container = document.getElementById('attendance-summary');
    container.innerHTML = `
      <div class="stat-card"><span class="stat-num text-indigo-600">${total}</span><span class="stat-label">Toplam Öğrenci</span></div>
      <div class="stat-card"><span class="stat-num text-emerald-600">${present}</span><span class="stat-label">Yurtta</span></div>
      <div class="stat-card"><span class="stat-num text-rose-600">${absent}</span><span class="stat-label">Dışarıda</span></div>
      <div class="stat-card"><span class="stat-num text-slate-500">${formatDateTR(dateStr)}</span><span class="stat-label">Tarih</span></div>
    `;
  }

  document.getElementById('attendance-list-container').addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    const row = btn.closest('.attendance-row');
    const studentId = row.dataset.studentId;
    const status = btn.dataset.status;
    const dateStr = currentAttendanceDate();
    const dayData = getDayAttendance(dateStr);
    dayData[studentId] = status;
    row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    renderAttendanceSummary(dateStr);
  });

  document.getElementById('attendance-date').addEventListener('change', renderAttendanceList);
  document.getElementById('attendance-floor-filter').addEventListener('change', renderAttendanceList);
  document.getElementById('attendance-search').addEventListener('input', renderAttendanceList);

  document.getElementById('btn-mark-all-present').addEventListener('click', () => {
    const dateStr = currentAttendanceDate();
    const dayData = getDayAttendance(dateStr);
    state.students.forEach(s => dayData[s.id] = 'present');
    renderAttendanceList();
    toast('Tüm öğrenciler "Yurtta" olarak işaretlendi.');
  });

  document.getElementById('btn-mark-all-absent').addEventListener('click', () => {
    const dateStr = currentAttendanceDate();
    const dayData = getDayAttendance(dateStr);
    state.students.forEach(s => dayData[s.id] = 'absent');
    renderAttendanceList();
    toast('Tüm öğrenciler "Dışarıda" olarak işaretlendi.');
  });

  document.getElementById('btn-save-attendance').addEventListener('click', () => {
    saveState();
    toast('Yoklama kaydedildi: ' + formatDateTR(currentAttendanceDate()), 'success');
  });

  document.getElementById('btn-print-attendance').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-export-attendance').addEventListener('click', () => {
    const dateStr = currentAttendanceDate();
    exportAttendanceToExcel([dateStr], `Yoklama_${dateStr}.xlsx`);
  });

  /* ============================================================
     HISTORY TAB
     ============================================================ */
  function renderHistoryTab() {
    const select = document.getElementById('history-date-select');
    const dates = Object.keys(state.attendance).sort().reverse();
    const prev = select.value;
    select.innerHTML = '<option value="">Bir tarih seçin</option>' +
      dates.map(d => `<option value="${d}">${formatDateTR(d)}</option>`).join('');
    if (dates.includes(prev)) select.value = prev;
    renderHistoryDetail(select.value);
  }

  document.getElementById('history-date-select').addEventListener('change', (e) => {
    renderHistoryDetail(e.target.value);
  });

  function renderHistoryDetail(dateStr) {
    const container = document.getElementById('history-list-container');
    const emptyEl = document.getElementById('history-empty');
    const summaryEl = document.getElementById('history-summary');

    if (!dateStr) {
      container.innerHTML = '';
      summaryEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    const dayData = state.attendance[dateStr] || {};
    let present = 0, absent = 0;
    const total = state.students.length;

    let html = '';
    sortedFloors().forEach(floor => {
      const rooms = sortedRoomsOfFloor(floor.id);
      let floorHtml = '';
      let hasContent = false;
      rooms.forEach(room => {
        const students = sortedStudentsOfRoom(room.id);
        if (students.length === 0) return;
        hasContent = true;
        floorHtml += `<div class="room-group-header"><i class="fa-solid fa-door-open"></i> Oda ${escapeHtml(room.number)}</div>`;
        students.forEach(s => {
          const status = dayData[s.id] || 'present';
          if (status === 'present') present++; else absent++;
          const badge = status === 'present'
            ? '<span class="text-emerald-600 font-semibold"><i class="fa-solid fa-check"></i> Yurtta</span>'
            : '<span class="text-rose-600 font-semibold"><i class="fa-solid fa-xmark"></i> Dışarıda</span>';
          floorHtml += `
            <div class="attendance-row">
              <span class="font-medium text-slate-700"><i class="fa-solid fa-user text-slate-300 mr-1"></i>${escapeHtml(s.name)}</span>
              ${badge}
            </div>`;
        });
      });
      if (hasContent) {
        html += `<div class="floor-group-header"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(floor.name)}</div>` + floorHtml;
      }
    });

    container.innerHTML = html || '<div class="p-10 text-center text-slate-400">Bu tarihte kayıtlı öğrenci bulunamadı.</div>';
    summaryEl.innerHTML = `
      <div class="stat-card"><span class="stat-num text-indigo-600">${total}</span><span class="stat-label">Toplam Öğrenci</span></div>
      <div class="stat-card"><span class="stat-num text-emerald-600">${present}</span><span class="stat-label">Yurtta</span></div>
      <div class="stat-card"><span class="stat-num text-rose-600">${absent}</span><span class="stat-label">Dışarıda</span></div>
      <div class="stat-card"><span class="stat-num text-slate-500">${formatDateTR(dateStr)}</span><span class="stat-label">Tarih</span></div>
    `;
  }

  document.getElementById('btn-export-history-day').addEventListener('click', () => {
    const dateStr = document.getElementById('history-date-select').value;
    if (!dateStr) { toast('Lütfen bir tarih seçin.', 'error'); return; }
    exportAttendanceToExcel([dateStr], `Yoklama_${dateStr}.xlsx`);
  });

  document.getElementById('btn-export-history-all').addEventListener('click', () => {
    const dates = Object.keys(state.attendance).sort();
    if (dates.length === 0) { toast('Kayıtlı yoklama bulunamadı.', 'error'); return; }
    exportAttendanceToExcel(dates, `Yurt_Yoklama_Tum_Kayitlar.xlsx`);
  });

  /* ============================================================
     EXCEL EXPORT (SheetJS)
     ============================================================ */
  function buildSheetDataForDate(dateStr) {
    const dayData = state.attendance[dateStr] || {};
    const rows = [];
    sortedFloors().forEach(floor => {
      sortedRoomsOfFloor(floor.id).forEach(room => {
        sortedStudentsOfRoom(room.id).forEach(s => {
          const status = dayData[s.id] || 'present';
          rows.push({
            'Tarih': formatDateTR(dateStr),
            'Kat': floor.name,
            'Oda No': room.number,
            'Öğrenci Adı': s.name,
            'Durum': status === 'present' ? 'Yurtta' : 'Dışarıda'
          });
        });
      });
    });
    return rows;
  }

  function exportAttendanceToExcel(dates, filename) {
    if (typeof XLSX === 'undefined') {
      toast('Excel kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.', 'error');
      return;
    }
    if (state.students.length === 0) {
      toast('Dışa aktarılacak öğrenci bulunamadı.', 'error');
      return;
    }
    const wb = XLSX.utils.book_new();

    if (dates.length === 1) {
      const rows = buildSheetDataForDate(dates[0]);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, formatDateTR(dates[0]).replace(/\./g, '-'));
    } else {
      // Multiple dates -> one sheet per date + a combined summary sheet
      const summaryRows = dates.map(d => {
        const rows = buildSheetDataForDate(d);
        const present = rows.filter(r => r.Durum === 'Yurtta').length;
        const absent = rows.filter(r => r.Durum === 'Dışarıda').length;
        return { 'Tarih': formatDateTR(d), 'Toplam': rows.length, 'Yurtta': present, 'Dışarıda': absent };
      });
      const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
      summaryWs['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Özet');

      dates.forEach(d => {
        const rows = buildSheetDataForDate(d);
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 12 }];
        let sheetName = formatDateTR(d).replace(/\./g, '-');
        if (sheetName.length > 31) sheetName = sheetName.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    }

    XLSX.writeFile(wb, filename);
    toast('Excel dosyası indirildi.', 'success');
  }

  /* ============================================================
     BACKUP / RESTORE / RESET
     ============================================================ */
  document.getElementById('btn-backup-download').addEventListener('click', () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      floors: state.floors,
      rooms: state.rooms,
      students: state.students,
      attendance: state.attendance
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yurt_yedek_${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Yedek dosyası indirildi.', 'success');
  });

  document.getElementById('btn-backup-restore').addEventListener('click', () => {
    const fileInput = document.getElementById('input-backup-restore');
    const file = fileInput.files[0];
    if (!file) { toast('Lütfen bir yedek dosyası seçin.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.floors || !data.rooms || !data.students) {
          throw new Error('Geçersiz yedek dosyası formatı.');
        }
        if (!confirm('Bu işlem mevcut tüm verilerin üzerine yazacaktır. Devam edilsin mi?')) return;
        state.floors = data.floors || [];
        state.rooms = data.rooms || [];
        state.students = data.students || [];
        state.attendance = data.attendance || {};
        saveState();
        renderAll();
        toast('Yedek başarıyla geri yüklendi.', 'success');
      } catch (err) {
        toast('Yedek dosyası okunamadı: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-reset-all').addEventListener('click', () => {
    if (!confirm('TÜM veriler (katlar, odalar, öğrenciler, yoklama kayıtları) kalıcı olarak silinecek. Emin misiniz?')) return;
    if (!confirm('Bu işlem geri alınamaz. Son kez onaylıyor musunuz?')) return;
    state = { floors: [], rooms: [], students: [], attendance: {} };
    saveState();
    renderAll();
    toast('Tüm veriler silindi.', 'success');
  });

  /* ============================================================
     INIT
     ============================================================ */
  function renderAll() {
    renderManageTab();
    renderAttendanceTab();
    renderHistoryTab();
  }

  function initHeader() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('header-date').innerHTML = `<i class="fa-regular fa-calendar"></i> ${dateStr}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initTabs();
    initHeader();
    renderAll();
  });

})();
