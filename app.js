/**
 * Aplikasi Web Special Order Part (SOP) & Monitoring SA
 * PT. Agung Automall Gianyar
 */

const STATE = {
  mainTab: 'partman', // 'partman' | 'monitoring' | 'kabeng_report' | 'email' | 'users'
  activeSaSheet: 'AJS', // 'AJS' | 'AYU' | 'FIK' | 'WBN' | 'OTHER'
  previewMode: 'both', // 'both' | 'lembar1' | 'lembar2'
  apiUrl: '',
  isSyncing: false,
  currentUser: null,
  kabengReportMonth: new Date().getMonth(),
  kabengReportYear: new Date().getFullYear(),
  kabengReportCache: {},
  users: [
    { username: 'febri', password: 'admin123', name: 'Febri Rahmdani (FEB)', role: 'ADMIN_PARTMAN', roleName: 'Admin & Partman' },
    { username: 'kabeng', password: 'kabeng123', name: 'Kepala Bengkel', role: 'KABENG', roleName: 'Kepala Bengkel' },
    { username: 'sa_ajs', password: 'ajs123', name: 'Service Advisor AJS', role: 'SA_AJS', roleName: 'Service Advisor (AJS)' },
    { username: 'sa_ayu', password: 'ayu123', name: 'Service Advisor AYU', role: 'SA_AYU', roleName: 'Service Advisor (AYU)' },
    { username: 'sa_fik', password: 'fik123', name: 'Service Advisor FIK', role: 'SA_FIK', roleName: 'Service Advisor (FIK)' },
    { username: 'sa_wbn', password: 'wbn123', name: 'Service Advisor WBN', role: 'SA_WBN', roleName: 'Service Advisor (WBN)' },
    { username: 'sa_other', password: 'other123', name: 'Service Advisor OTHER', role: 'SA_OTHER', roleName: 'Service Advisor (OTHER)' }
  ],
  partItems: [],
  monitoringBySheet: {
    AJS: [],
    AYU: [],
    FIK: [],
    WBN: [],
    OTHER: []
  },
  localSubmittedOrders: [],
  localFollowUpEdits: {},
  completedJobs: {},
  currentRenderedGroups: {},
  emailConfig: {
    reminderDays: 7,
    sendHourWita: 8,
    senderEmail: 'febrifajar69@gmail.com',
    kabengEmail: 'andicka.nengah@gmail.com',
    appUrl: '',
    saEmails: [
      { code: 'AJS', name: 'Service Advisor AJS', email: '', active: true, isMain: true },
      { code: 'AYU', name: 'Service Advisor AYU', email: '', active: true, isMain: true },
      { code: 'FIK', name: 'Service Advisor FIK', email: '', active: true, isMain: true },
      { code: 'WBN', name: 'Service Advisor WBN', email: '', active: true, isMain: true },
      { code: 'OTHER', name: 'Default / Koordinator OTHER', email: '', active: true, isMain: true }
    ]
  }
};

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 1. Muat URL API dari config.js atau localStorage
  const savedUrl = (localStorage.getItem('SOP_APPS_SCRIPT_URL') || '').trim();
  const configUrl = (window.SOP_CONFIG && window.SOP_CONFIG.APPS_SCRIPT_URL) ? window.SOP_CONFIG.APPS_SCRIPT_URL.trim() : '';
  STATE.apiUrl = savedUrl || configUrl;
  if (configUrl && !savedUrl) {
    localStorage.setItem('SOP_APPS_SCRIPT_URL', configUrl);
  }

  // Muat simpanan lokal sementara (jika ada perubahan sebelum API dipasang)
  try {
    const savedLocalOrders = localStorage.getItem('SOP_LOCAL_ORDERS');
    if (savedLocalOrders) STATE.localSubmittedOrders = JSON.parse(savedLocalOrders);
    const savedFuEdits = localStorage.getItem('SOP_LOCAL_FU_EDITS');
    if (savedFuEdits) STATE.localFollowUpEdits = JSON.parse(savedFuEdits);
    const savedCompleted = localStorage.getItem('SOP_COMPLETED_JOBS');
    if (savedCompleted) STATE.completedJobs = JSON.parse(savedCompleted);
    const savedEmailCfg = localStorage.getItem('SOP_EMAIL_CONFIG');
    if (savedEmailCfg) STATE.emailConfig = JSON.parse(savedEmailCfg);
  } catch (e) {
    // Abaikan jika gagal parse localStorage
  }

  // 2. Set tanggal default (Hari ini & +10 hari untuk ETA sesuai rumus =TODAY()+10 di J12)
  setDefaultFormDates();

  // 3. Set tampilan Form Order default bersih & siap pakai untuk input order baru
  resetOrderForm(true);

  // 4. Pasang event listener untuk pencarian otomatis NOPOL ke Sheet RAW
  setupNopolLookupListeners();

  // 5. Pasang tombol header
  document.getElementById('btnRefreshData').addEventListener('click', () => {
    fetchAllMonitoringSheets(true);
  });
  document.getElementById('btnOpenApiModal').addEventListener('click', openApiModal);

  // 6. Render tabel email SA & tarik data dari server
  renderSaEmailsTable();
  fetchEmailSettingsFromServer(false);

  // 6b. Inisialisasi Kontrol Laporan Mingguan Kabeng
  initKabengReportControls();

  // 6c. Inisialisasi Autentikasi Pengguna & Sesi Login
  initAuth();

  // 7. Tarik data live dari Spreadsheet Monitoring (AJS, AYU, FIK, WBN, OTHER)
  updateSyncBadge();
  fetchAllMonitoringSheets(false);
}

function setDefaultFormDates() {
  const today = new Date();
  const eta = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
  document.getElementById('inputOrderDate').value = formatDateInput(today);
  document.getElementById('inputEtaDate').value = formatDateInput(eta);
}

function handleOrderDateChange() {
  const orderDateStr = document.getElementById('inputOrderDate').value;
  if (orderDateStr) {
    const d = new Date(orderDateStr);
    if (!isNaN(d.getTime())) {
      const eta = new Date(d.getTime() + 10 * 24 * 60 * 60 * 1000);
      document.getElementById('inputEtaDate').value = formatDateInput(eta);
    }
  }
  renderPrintSheets();
}

/**
 * Buka / Tutup Sidebar Menu Drawer (Garis 3 Pojok Kiri Atas)
 */
function toggleNavDrawer(open) {
  const drawer = document.getElementById('navSideDrawer');
  const backdrop = document.getElementById('navDrawerBackdrop');
  if (!drawer || !backdrop) return;

  const shouldOpen = open !== undefined ? Boolean(open) : !drawer.classList.contains('open');
  if (shouldOpen) {
    drawer.classList.add('open');
    backdrop.classList.remove('hidden');
    drawer.setAttribute('aria-hidden', 'false');
  } else {
    drawer.classList.remove('open');
    backdrop.classList.add('hidden');
    drawer.setAttribute('aria-hidden', 'true');
  }
}

function selectMenuFromDrawer(tab) {
  switchMainTab(tab);
  toggleNavDrawer(false);
}

function selectSaSheetFromDrawer(saName) {
  switchMainTab('monitoring');
  selectSaMonitoringTab(saName);
  toggleNavDrawer(false);
}

/**
 * ============================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS
 * ============================================================================
 * 1. Akun feb & admin (Full Admin): Otoritas penuh (Form Order, Monitoring SOP edit, Email, Kelola User, Script API)
 * 2. Akun ptw (Putu Wirawan): Form Order & Monitoring SOP (edit) saja
 * 3. Akun kabeng (and / I Nengah Andika) & Role SA (ajs, ayu, fik, wbn, other):
 *    Monitoring SOP saja (bisa edit & akses semua sheet SA). Menu lain tidak bisa diakses.
 */
function getUserPermissions(user) {
  if (!user) {
    return {
      canFormOrder: false,
      canMonitoring: true,
      canEditMonitoring: false,
      canKabengReport: false,
      canEmailSettings: false,
      canUserManagement: false,
      canScriptApi: false,
      isViewerOnly: true
    };
  }

  const u = (user.username || '').toLowerCase().trim();
  const role = (user.role || '').toUpperCase().trim();

  // 1. Akun FEB & ADMIN: Otoritas Penuh
  if (
    u === 'feb' ||
    u === 'admin' ||
    u === 'febri' ||
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN_PARTMAN' ||
    role === 'ADMIN'
  ) {
    return {
      canFormOrder: true,
      canMonitoring: true,
      canEditMonitoring: true,
      canKabengReport: true,
      canEmailSettings: true,
      canUserManagement: true,
      canScriptApi: true,
      isViewerOnly: false
    };
  }

  // 2. Akun PTW (Putu Wirawan): Form Order & Monitoring SOP saja (bisa edit)
  if (u === 'ptw' || role === 'PARTMAN' || role === 'FORM_ORDER') {
    return {
      canFormOrder: true,
      canMonitoring: true,
      canEditMonitoring: true,
      canKabengReport: false,
      canEmailSettings: false,
      canUserManagement: false,
      canScriptApi: false,
      isViewerOnly: false
    };
  }

  // 3. Akun KABENG (and / I Nengah Andika): Monitoring SOP & Laporan Mingguan Kabeng
  if (
    u === 'and' ||
    u === 'kabeng' ||
    role === 'KABENG' ||
    role.includes('KEPALA')
  ) {
    return {
      canFormOrder: false,
      canMonitoring: true,
      canEditMonitoring: true,
      canKabengReport: true,
      canEmailSettings: false,
      canUserManagement: false,
      canScriptApi: false,
      isViewerOnly: false
    };
  }

  // 4. Role SA (ajs, ayu, fik, wbn, other):
  // Monitoring SOP saja (bisa edit & akses semua sheet SA). Menu selain Monitoring SOP tidak bisa diakses.
  if (
    role.startsWith('SA_') ||
    role === 'SA' ||
    ['ajs', 'ayu', 'fik', 'wbn', 'other', 'sa_ajs', 'sa_ayu', 'sa_fik', 'sa_wbn', 'sa_other'].includes(u)
  ) {
    return {
      canFormOrder: false,
      canMonitoring: true,
      canEditMonitoring: true,
      canKabengReport: false,
      canEmailSettings: false,
      canUserManagement: false,
      canScriptApi: false,
      isViewerOnly: false
    };
  }

  // Fallback default
  return {
    canFormOrder: false,
    canMonitoring: true,
    canEditMonitoring: false,
    canKabengReport: false,
    canEmailSettings: false,
    canUserManagement: false,
    canScriptApi: false,
    isViewerOnly: true
  };
}

/**
 * Menyesuaikan tampilan menu, tombol drawer & tombol navigasi header sesuai hak akses role aktif
 */
function applyUserRolePermissions() {
  const perm = getUserPermissions(STATE.currentUser);

  // 1. Menu Form Order di Drawer
  const btnPartman = document.getElementById('tabBtnPartman');
  if (btnPartman) {
    btnPartman.style.display = perm.canFormOrder ? 'flex' : 'none';
  }

  // 2. Menu Monitoring SOP di Drawer (selalu tampil)
  const btnMonitoring = document.getElementById('tabBtnMonitoring');
  if (btnMonitoring) {
    btnMonitoring.style.display = perm.canMonitoring ? 'flex' : 'none';
  }

  // 2B. Menu Laporan Mingguan Kabeng di Drawer
  const btnKabeng = document.getElementById('tabBtnKabengReport');
  if (btnKabeng) {
    btnKabeng.style.display = perm.canKabengReport ? 'flex' : 'none';
  }

  // 3. Menu Pengaturan Email di Drawer
  const btnEmail = document.getElementById('tabBtnEmail');
  if (btnEmail) {
    btnEmail.style.display = perm.canEmailSettings ? 'flex' : 'none';
  }

  // 4. Menu Kelola User di Drawer
  const btnUsers = document.getElementById('tabBtnUsers');
  if (btnUsers) {
    btnUsers.style.display = perm.canUserManagement ? 'flex' : 'none';
  }

  // 5. Divider & Menu Settings / Script API di Drawer
  const dividerSettings = document.getElementById('drawerDividerSettings');
  const btnSettings = document.getElementById('drawerBtnSettings');
  if (dividerSettings) {
    dividerSettings.style.display = perm.canScriptApi ? 'block' : 'none';
  }
  if (btnSettings) {
    btnSettings.style.display = perm.canScriptApi ? 'flex' : 'none';
  }

  // 6. Tombol Header: Script API & Bersihkan Baris Kosong
  const headerApiBtn = document.getElementById('btnOpenApiModal');
  const headerCleanupBtn = document.getElementById('btnCleanupGhostRows');
  if (headerApiBtn) {
    headerApiBtn.style.display = perm.canScriptApi ? 'inline-flex' : 'none';
  }
  if (headerCleanupBtn) {
    headerCleanupBtn.style.display = perm.canScriptApi ? 'inline-flex' : 'none';
  }

  // 7. Pengalihan otomatis jika tab saat ini tidak diizinkan
  if (STATE.mainTab === 'partman' && !perm.canFormOrder) {
    switchMainTab('monitoring');
  } else if (STATE.mainTab === 'kabeng_report' && !perm.canKabengReport) {
    switchMainTab('monitoring');
  } else if (STATE.mainTab === 'email' && !perm.canEmailSettings) {
    switchMainTab('monitoring');
  } else if (STATE.mainTab === 'users' && !perm.canUserManagement) {
    switchMainTab('monitoring');
  }
}

/**
 * Navigasi Tab Utama (Partman vs Monitoring SA vs Laporan Kabeng vs Pengaturan Email SA)
 */
function switchMainTab(tab) {
  const perm = getUserPermissions(STATE.currentUser);
  if (tab === 'partman' && !perm.canFormOrder) {
    showToast('⚠️ Akses terbatas: Akun Anda tidak memiliki izin untuk membuka Form Order.', true);
    return;
  }
  if (tab === 'kabeng_report' && !perm.canKabengReport) {
    showToast('⚠️ Akses terbatas: Menu Laporan Mingguan hanya dapat diakses oleh Kepala Bengkel (Kabeng) dan Admin.', true);
    return;
  }
  if (tab === 'email' && !perm.canEmailSettings) {
    showToast('⚠️ Akses terbatas: Hanya Admin yang dapat membuka Pengaturan Email.', true);
    return;
  }
  if (tab === 'users' && !perm.canUserManagement) {
    showToast('⚠️ Akses terbatas: Hanya Admin yang dapat membuka Kelola User.', true);
    return;
  }

  STATE.mainTab = tab;
  const secPartman = document.getElementById('sectionPartman');
  const secMonitoring = document.getElementById('sectionMonitoring');
  const secKabeng = document.getElementById('sectionKabengReport');
  const secEmail = document.getElementById('sectionEmailSettings');
  const secUsers = document.getElementById('sectionUsers');
  const btnPartman = document.getElementById('tabBtnPartman');
  const btnMonitoring = document.getElementById('tabBtnMonitoring');
  const btnKabeng = document.getElementById('tabBtnKabengReport');
  const btnEmail = document.getElementById('tabBtnEmail');
  const btnUsers = document.getElementById('tabBtnUsers');
  const subtitleEl = document.getElementById('activeMenuHeaderSubtitle');

  secPartman.classList.toggle('hidden', tab !== 'partman');
  secMonitoring.classList.toggle('hidden', tab !== 'monitoring');
  if (secKabeng) secKabeng.classList.toggle('hidden', tab !== 'kabeng_report');
  if (secEmail) secEmail.classList.toggle('hidden', tab !== 'email');
  if (secUsers) secUsers.classList.toggle('hidden', tab !== 'users');

  if (btnPartman) btnPartman.classList.toggle('active', tab === 'partman');
  if (btnMonitoring) btnMonitoring.classList.toggle('active', tab === 'monitoring');
  if (btnKabeng) btnKabeng.classList.toggle('active', tab === 'kabeng_report');
  if (btnEmail) btnEmail.classList.toggle('active', tab === 'email');
  if (btnUsers) btnUsers.classList.toggle('active', tab === 'users');

  if (subtitleEl) {
    if (tab === 'partman') {
      subtitleEl.textContent = 'Form Special Order Part';
    } else if (tab === 'monitoring') {
      subtitleEl.textContent = `Monitoring SOP — ${STATE.activeSaSheet}`;
    } else if (tab === 'kabeng_report') {
      subtitleEl.textContent = 'Laporan Mingguan Kabeng — Unit & Omzet Lengkap Tiap SA';
    } else if (tab === 'email') {
      subtitleEl.textContent = 'Pengaturan Email SA & Reminder H+7';
    } else if (tab === 'users') {
      subtitleEl.textContent = 'Manajemen Pengguna (User Management)';
    }
  }

  if (tab === 'partman') {
    renderPrintSheets();
  } else if (tab === 'monitoring') {
    renderMonitoringList();
    checkAndShowNotFixPopup(false);
    checkAndShowFu2ReminderPopup(false);
  } else if (tab === 'kabeng_report') {
    renderKabengWeeklyReport();
  } else if (tab === 'email') {
    renderSaEmailsTable();
  } else if (tab === 'users') {
    renderUsersTable();
  }
}

/**
 * Pilihan SA pada Form Order (AJS, AYU, FIK, WBN, OTHER)
 * Khusus ketika memilih OTHER, tampilkan input manual Nama PIC!
 */
function handleSaChange() {
  const sa = document.getElementById('selectSa').value;
  const otherBox = document.getElementById('otherPicContainer');
  const picInput = document.getElementById('inputPicOther');
  const targetLabel = document.getElementById('targetSheetLabel');

  if (sa === 'OTHER') {
    otherBox.classList.remove('hidden');
    picInput.setAttribute('required', 'required');
    const picVal = (picInput.value || '').trim().toUpperCase();
    targetLabel.textContent = picVal ? `OTHER • PIC: ${picVal}` : 'OTHER';
  } else {
    otherBox.classList.add('hidden');
    picInput.removeAttribute('required');
    targetLabel.textContent = `${sa}`;
  }

  renderPrintSheets();
}

function setPicOther(picName) {
  const picInput = document.getElementById('inputPicOther');
  picInput.value = picName;
  handleSaChange();
}

/**
 * ============================================================================
 * AUTO-LOOKUP NOPOL DARI SHEET 'RAW' (50.784 DATA PELANGGAN DI SPREADSHEET 1)
 * ============================================================================
 */
let nopolDebounceTimer = null;

function setupNopolLookupListeners() {
  const inputNopol = document.getElementById('inputNopol');
  const btnLookup = document.getElementById('btnLookupNopol');
  const autoBox = document.getElementById('nopolAutocomplete');

  inputNopol.addEventListener('input', () => {
    renderPrintSheets();
    const val = inputNopol.value.trim().toUpperCase();
    if (nopolDebounceTimer) clearTimeout(nopolDebounceTimer);
    if (val.length < 3) {
      autoBox.classList.add('hidden');
      return;
    }
    nopolDebounceTimer = setTimeout(() => {
      queryRawSheetByNopol(val, false);
    }, 280);
  });

  btnLookup.addEventListener('click', () => {
    const val = inputNopol.value.trim().toUpperCase();
    if (!val) {
      showToast('Masukkan Nomor Polisi terlebih dahulu.', true);
      return;
    }
    queryRawSheetByNopol(val, true);
  });

  document.addEventListener('click', (e) => {
    if (!inputNopol.contains(e.target) && !autoBox.contains(e.target)) {
      autoBox.classList.add('hidden');
    }
  });
}

function queryRawSheetByNopol(nopolQuery, autoApplyFirst) {
  const hint = document.getElementById('nopolLookupHint');
  const autoBox = document.getElementById('nopolAutocomplete');
  hint.textContent = `Mencari "${nopolQuery}" di 50.784 database pelanggan (Sheet RAW)...`;

  const formSheetId = window.SOP_CONFIG.SPREADSHEET_FORM_ID;
  const safeQuery = nopolQuery.replace(/'/g, '');
  const tq = `SELECT A, B, C, D WHERE upper(A) CONTAINS '${safeQuery}' LIMIT 12`;

  if (!Array.isArray(STATE.localRawCustomers)) {
    try {
      STATE.localRawCustomers = JSON.parse(localStorage.getItem('SOP_LOCAL_RAW_CUSTOMERS') || '[]');
    } catch (e) {
      STATE.localRawCustomers = [];
    }
  }
  const cleanQ = nopolQuery.trim().toUpperCase();
  const localMatches = STATE.localRawCustomers.filter((c) =>
    c.nopol && c.nopol.toUpperCase().includes(cleanQ)
  );

  fetchGvizSheet(formSheetId, 'RAW', tq)
    .then((rows) => {
      let gvizMatches = [];
      if (Array.isArray(rows) && rows.length > 0) {
        gvizMatches = rows.map((r) => ({
          nopol: String(r[0] || '').trim(),
          customerName: String(r[1] || '').trim(),
          phone: formatPhoneDisplay(r[2]),
          address: String(r[3] || '').trim()
        })).filter((m) => m.nopol);
      }

      // Gabungkan hasil dari Sheet RAW dengan cache lokal pelanggan baru
      const matches = [...gvizMatches];
      localMatches.forEach((loc) => {
        if (!matches.some((m) => m.nopol.toUpperCase() === loc.nopol.toUpperCase())) {
          matches.unshift(loc);
        }
      });

      if (matches.length === 0) {
        hint.textContent = `Nopol "${nopolQuery}" belum ada di Sheet RAW. Silakan ketik Nama Customer, Telp & Alamat secara manual.`;
        autoBox.classList.add('hidden');
        return;
      }

      // Cek apakah ada yang sama persis
      const exact = matches.find((m) => m.nopol.toUpperCase() === nopolQuery.toUpperCase());
      if (exact && (autoApplyFirst || matches.length === 1)) {
        applyCustomerMatch(exact);
        autoBox.classList.add('hidden');
        hint.textContent = `✓ Data pelanggan "${exact.customerName}" ditemukan otomatis dari Sheet RAW.`;
        return;
      }

      if (autoApplyFirst && matches.length > 0) {
        applyCustomerMatch(matches[0]);
      }

      // Tampilkan daftar pilihan autocomplete
      autoBox.innerHTML = matches.map((m, idx) => `
        <div class="autocomplete-item" data-idx="${idx}">
          <div class="autocomplete-nopol">${escapeHtml(m.nopol)} — ${escapeHtml(m.customerName)}</div>
          <div class="autocomplete-cust">📞 ${escapeHtml(m.phone || '-')} • 📍 ${escapeHtml(m.address || '-')}</div>
        </div>
      `).join('');

      autoBox.querySelectorAll('.autocomplete-item').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-idx'));
          if (matches[idx]) {
            applyCustomerMatch(matches[idx]);
            autoBox.classList.add('hidden');
            hint.textContent = `✓ Data pelanggan "${matches[idx].customerName}" terisi otomatis dari Sheet RAW.`;
          }
        });
      });

      autoBox.classList.remove('hidden');
      hint.textContent = `Ditemukan ${matches.length} kecocokan Nopol di Sheet RAW. Klik salah satu untuk mengisi otomatis.`;
    })
    .catch(() => {
      if (localMatches.length > 0) {
        const exact = localMatches.find((m) => m.nopol.toUpperCase() === nopolQuery.toUpperCase()) || localMatches[0];
        applyCustomerMatch(exact);
        hint.textContent = `✓ Data pelanggan "${exact.customerName}" ditemukan otomatis dari database lokal / Sheet RAW.`;
        autoBox.classList.add('hidden');
      } else {
        hint.textContent = 'Ketik manual Nama Customer, Telp & Alamat jika Nopol baru.';
      }
    });
}

function applyCustomerMatch(match) {
  document.getElementById('inputNopol').value = match.nopol.toUpperCase();
  document.getElementById('inputCustomerName').value = match.customerName.toUpperCase();
  document.getElementById('inputPhone').value = match.phone;
  document.getElementById('inputAddress').value = match.address.toUpperCase();
  renderPrintSheets();
}

/**
 * ============================================================================
 * MANAJEMEN TABEL MULTI-ITEM PART (DINAMIS PER NO. POLISI)
 * ============================================================================
 */
function addPartItemRow(initialData) {
  STATE.partItems.push({
    partNo: initialData && initialData.partNo ? initialData.partNo : '',
    partName: initialData && initialData.partName ? initialData.partName : '',
    qty: initialData && initialData.qty ? Number(initialData.qty) : 1,
    price: initialData && initialData.price !== undefined ? Number(initialData.price) : 0
  });
  renderPartItemsTable();
  renderPrintSheets();
}

function removePartItemRow(index) {
  if (STATE.partItems.length <= 1) {
    showToast('Minimal harus ada 1 baris item part pada Form Order.', true);
    return;
  }
  STATE.partItems.splice(index, 1);
  renderPartItemsTable();
  renderPrintSheets();
}

function updatePartItemField(index, field, value) {
  if (!STATE.partItems[index]) return;
  if (field === 'qty' || field === 'price') {
    STATE.partItems[index][field] = Number(value) || 0;
  } else {
    STATE.partItems[index][field] = String(value || '').toUpperCase();
  }

  // Update total baris & grand total tanpa merender ulang input yang sedang diketik
  const rowTotalEl = document.getElementById(`rowTotal_${index}`);
  if (rowTotalEl) {
    const item = STATE.partItems[index];
    rowTotalEl.textContent = formatRupiah((Number(item.qty) || 0) * (Number(item.price) || 0));
  }
  updateFormGrandTotal();
  renderPrintSheets();
}

function renderPartItemsTable() {
  const tbody = document.getElementById('partItemsTbody');
  tbody.innerHTML = STATE.partItems.map((item, idx) => {
    const rowTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#475569;">${idx + 1}</td>
        <td>
          <input
            type="text"
            class="input input-uppercase"
            placeholder="Nomor Part (misal: 692100K904)"
            value="${escapeHtml(item.partNo)}"
            oninput="updatePartItemField(${idx}, 'partNo', this.value)"
          />
        </td>
        <td>
          <input
            type="text"
            class="input input-uppercase"
            placeholder="Nama Part (misal: HANDLE AS FR DOOR LH)"
            value="${escapeHtml(item.partName)}"
            required
            oninput="updatePartItemField(${idx}, 'partName', this.value)"
          />
        </td>
        <td>
          <input
            type="number"
            min="1"
            step="1"
            class="input"
            value="${item.qty}"
            required
            oninput="updatePartItemField(${idx}, 'qty', this.value)"
          />
        </td>
        <td>
          <input
            type="number"
            min="0"
            step="500"
            class="input"
            placeholder="0"
            value="${item.price || ''}"
            required
            oninput="updatePartItemField(${idx}, 'price', this.value)"
          />
        </td>
        <td id="rowTotal_${idx}" style="font-weight:700;color:#0f172a;">
          ${formatRupiah(rowTotal)}
        </td>
        <td style="text-align:center;">
          <button
            type="button"
            class="btn btn-danger-ghost"
            title="Hapus baris part ini"
            onclick="removePartItemRow(${idx})"
          >
            🗑
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updateFormGrandTotal();
}

function updateFormGrandTotal() {
  const grandTotal = STATE.partItems.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.price) || 0)), 0);
  const el = document.getElementById('formGrandTotalCell');
  if (el) el.textContent = formatRupiah(grandTotal);
}

/**
 * Muat contoh data sesuai SOP LEMBAR1 asli (DK-1640-LN) atau reset form kosong
 */
function loadSampleOrder(silent) {
  document.getElementById('inputNopol').value = 'DK-1640-LN';
  document.getElementById('selectSa').value = 'AJS';
  document.getElementById('inputPicOther').value = '';
  document.getElementById('inputCustomerName').value = 'ALASKA WARIH SAMUDRA PT.';
  document.getElementById('inputPhone').value = '081338189890';
  document.getElementById('inputAddress').value = 'BR. BRESELA, BRESELA PAYANGAN GIANYAR';
  const orderNoEl = document.getElementById('inputOrderNo');
  if (orderNoEl) orderNoEl.value = '';
  const lokasiEl = document.getElementById('inputLokasiNote');
  if (lokasiEl) lokasiEl.value = '';
  const dpEl = document.getElementById('selectDpStatus');
  if (dpEl) dpEl.value = 'NOT FIX';
  const statusEl = document.getElementById('selectOrderStatus');
  if (statusEl) statusEl.value = 'NOT FIX';
  document.getElementById('inputFormNote').value = '';
  setDefaultFormDates();

  STATE.partItems = [
    { partNo: '692100K904', partName: 'HANDLE AS FR DOOR LH', qty: 1, price: 230000 },
    { partNo: '692410K070', partName: 'PAD, FR DR HANDLE FR', qty: 1, price: 15000 },
    { partNo: '692420K060', partName: 'PAD, FR DR HANDLE RR', qty: 1, price: 15000 },
    { partNo: '692170K916', partName: 'COVER FR DR HANDLE R', qty: 1, price: 105000 }
  ];

  handleSaChange();
  renderPartItemsTable();
  renderPrintSheets();
  if (!silent) {
    showToast('Contoh data SOP (DK-1640-LN - 4 Item Part) berhasil dimuat.');
  }
}

function resetOrderForm(silent) {
  document.getElementById('inputNopol').value = '';
  document.getElementById('selectSa').value = 'AJS';
  document.getElementById('inputPicOther').value = '';
  document.getElementById('inputCustomerName').value = '';
  document.getElementById('inputPhone').value = '';
  document.getElementById('inputAddress').value = '';
  const orderNoEl = document.getElementById('inputOrderNo');
  if (orderNoEl) orderNoEl.value = '';
  const lokasiEl = document.getElementById('inputLokasiNote');
  if (lokasiEl) lokasiEl.value = '';
  const dpEl = document.getElementById('selectDpStatus');
  if (dpEl) dpEl.value = 'NOT FIX';
  const statusEl = document.getElementById('selectOrderStatus');
  if (statusEl) statusEl.value = 'NOT FIX';
  document.getElementById('inputFormNote').value = '';
  setDefaultFormDates();

  STATE.partItems = [
    { partNo: '', partName: '', qty: 1, price: 0 }
  ];

  handleSaChange();
  renderPartItemsTable();
  renderPrintSheets();
  if (!silent) {
    showToast('Form Order berhasil dikosongkan untuk input baru.');
  }
}

/**
 * ============================================================================
 * KIRIM FORM ORDER KE MONITORING (SPREADSHEET 2 SESUAI SA DI J11)
 * ============================================================================
 */
async function handleOrderSubmit(e) {
  e.preventDefault();

  const orderData = collectCurrentFormOrder();
  if (!orderData.nopol) {
    showToast('Nomor Polisi (NOPOL) wajib diisi!', true);
    return;
  }
  if (orderData.sa === 'OTHER' && !orderData.picOther) {
    showToast('Khusus pilihan SA "OTHER", mohon isi Nama PIC / SA Manual terlebih dahulu!', true);
    document.getElementById('inputPicOther').focus();
    return;
  }
  if (orderData.items.length === 0) {
    showToast('Minimal harus ada 1 item part yang diisi namanya!', true);
    return;
  }

  const btn = document.getElementById('btnSubmitMonitoring');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Mengirim ke Monitoring...';

  const targetSheet = (['AJS', 'AYU', 'FIK', 'WBN'].includes(orderData.sa)) ? orderData.sa : 'OTHER';
  const picForColR = targetSheet === 'OTHER' ? (orderData.picOther || 'OTHER') : targetSheet;

  // Jika Nopol ini sebelumnya pernah di-Job Done, buka kembali agar order baru tampil di Monitoring
  const doneKey = `${targetSheet}::${String(orderData.nopol || '').trim().toUpperCase()}`;
  if (STATE.completedJobs && STATE.completedJobs[doneKey]) {
    delete STATE.completedJobs[doneKey];
    localStorage.setItem('SOP_COMPLETED_JOBS', JSON.stringify(STATE.completedJobs));
  }

  // Simpan data customer ke cache lokal agar langsung bisa auto-complete saat diketik ulang
  if (orderData.nopol && (orderData.customerName || orderData.phone || orderData.address)) {
    if (!Array.isArray(STATE.localRawCustomers)) {
      try {
        STATE.localRawCustomers = JSON.parse(localStorage.getItem('SOP_LOCAL_RAW_CUSTOMERS') || '[]');
      } catch (e) {
        STATE.localRawCustomers = [];
      }
    }
    const cleanNopol = orderData.nopol.toUpperCase();
    const existingIdx = STATE.localRawCustomers.findIndex((c) => c.nopol && c.nopol.toUpperCase() === cleanNopol);
    const custObj = {
      nopol: cleanNopol,
      customerName: (orderData.customerName || '').toUpperCase(),
      phone: orderData.phone || '',
      address: (orderData.address || '').toUpperCase()
    };
    if (existingIdx >= 0) {
      STATE.localRawCustomers[existingIdx] = custObj;
    } else {
      STATE.localRawCustomers.push(custObj);
    }
    localStorage.setItem('SOP_LOCAL_RAW_CUSTOMERS', JSON.stringify(STATE.localRawCustomers));
  }

  try {
    // Simpan ke state lokal aplikasi agar langsung tampil di tab Monitoring SA
    const baseRow = 9000 + STATE.localSubmittedOrders.length * 10;
    const newMonitoringItems = orderData.items.map((it, idx) => ({
      id: `${targetSheet}-LOCAL-${Date.now()}-${idx}`,
      sheetName: targetSheet,
      rowNumber: baseRow + idx,
      nopol: orderData.nopol,
      customerName: orderData.customerName,
      phone: orderData.phone,
      orderDate: formatDateSlash(orderData.orderDate),
      orderNo: orderData.orderNo,
      partNo: it.partNo || '-',
      partName: it.partName,
      qty: Number(it.qty) || 1,
      price: Number(it.price) || 0,
      eta: formatDateSlash(orderData.eta),
      total: (Number(it.qty) || 1) * (Number(it.price) || 0),
      ata: '',
      note: orderData.lokasiNote,
      dp: orderData.dpStatus,
      etaBo: '',
      followUp1: '',
      followUp2: '',
      followUp3: '',
      status: orderData.orderStatus || 'NOT FIX',
      saPic: picForColR,
      isLocal: true
    }));

    // Jika URL Web App Apps Script sudah dipasang, kirim langsung ke Google Spreadsheet 2!
    if (STATE.apiUrl) {
      const response = await fetch(STATE.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitOrder',
          order: {
            nopol: orderData.nopol,
            customerName: orderData.customerName,
            phone: orderData.phone,
            address: orderData.address,
            orderDate: orderData.orderDate,
            eta: orderData.eta,
            orderNo: orderData.orderNo,
            sa: orderData.sa,
            picOther: orderData.picOther,
            note: orderData.lokasiNote || orderData.formNote,
            dpStatus: orderData.dpStatus,
            status: orderData.orderStatus || 'IN PROCESS',
            items: orderData.items
          }
        })
      });

      const resJson = await response.json();
      if (resJson && resJson.status === 'ok') {
        showToast(`✅ ${resJson.message}`);
        await fetchAllMonitoringSheets(false);
      } else {
        throw new Error((resJson && resJson.message) || 'Gagal mengirim ke API Spreadsheet');
      }
    } else {
      // Simpan ke local state & beri tahu bahwa data sudah masuk di tab Monitoring aplikasi
      STATE.localSubmittedOrders.push(...newMonitoringItems);
      localStorage.setItem('SOP_LOCAL_ORDERS', JSON.stringify(STATE.localSubmittedOrders));
      mergeLocalOrdersIntoSheets();
      showToast(`✅ ${orderData.items.length} item part (${orderData.nopol}) berhasil dikirim ke Monitoring Sheet ${targetSheet} (PIC: ${picForColR})!`);
    }

    // Pindah otomatis atau update badge jumlah di tab Monitoring
    STATE.activeSaSheet = targetSheet;
    updateSaTabBadges();
  } catch (err) {
    // Fallback simpan lokal jika jaringan/URL belum selesai di-deploy
    STATE.localSubmittedOrders.push(...newMonitoringItems);
    localStorage.setItem('SOP_LOCAL_ORDERS', JSON.stringify(STATE.localSubmittedOrders));
    mergeLocalOrdersIntoSheets();
    showToast(`✅ Tersimpan di Monitoring ${targetSheet} (PIC: ${picForColR}). Pastikan kode terbaru WebAppAPI sudah di-Deploy.`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function collectCurrentFormOrder() {
  const nopol = (document.getElementById('inputNopol').value || '').trim().toUpperCase();
  const sa = (document.getElementById('selectSa').value || 'AJS').trim().toUpperCase();
  const picOther = (document.getElementById('inputPicOther').value || '').trim().toUpperCase();
  const orderDate = document.getElementById('inputOrderDate').value || formatDateInput(new Date());
  const eta = document.getElementById('inputEtaDate').value || '';
  const customerName = (document.getElementById('inputCustomerName').value || '').trim().toUpperCase();
  const phone = (document.getElementById('inputPhone').value || '').trim();
  const address = (document.getElementById('inputAddress').value || '').trim().toUpperCase();
  const orderNoEl = document.getElementById('inputOrderNo');
  const orderNo = orderNoEl ? (orderNoEl.value || '').trim().toUpperCase() : '';
  const dpEl = document.getElementById('selectDpStatus');
  const dpStatus = dpEl ? (dpEl.value || 'NOT FIX').trim().toUpperCase() : 'NOT FIX';
  const statusEl = document.getElementById('selectOrderStatus');
  const orderStatus = statusEl ? (statusEl.value || 'NOT FIX').trim().toUpperCase() : 'NOT FIX';
  const lokasiEl = document.getElementById('inputLokasiNote');
  const lokasiNote = lokasiEl ? (lokasiEl.value || '').trim().toUpperCase() : '';
  const formNote = (document.getElementById('inputFormNote').value || '').trim().toUpperCase();

  const validItems = STATE.partItems
    .filter((it) => (it.partName && it.partName.trim() !== '') || (it.partNo && it.partNo.trim() !== ''))
    .map((it) => ({
      partNo: (it.partNo || '-').trim().toUpperCase(),
      partName: (it.partName || '-').trim().toUpperCase(),
      qty: Number(it.qty) || 1,
      price: Number(it.price) || 0
    }));

  return {
    nopol,
    sa,
    picOther,
    saDisplay: sa === 'OTHER' ? (picOther ? `${picOther}` : 'OTHER') : sa,
    orderDate,
    eta,
    customerName,
    phone,
    address,
    orderNo,
    dpStatus,
    orderStatus,
    lokasiNote,
    formNote,
    items: validItems
  };
}

/**
 * ============================================================================
 * RENDER & CETAK FORM ORDER (SOP LEMBAR 1 CUSTOMER & SOP LEMBAR 2 INTERNAL)
 * ============================================================================
 */
function setPreviewMode(mode) {
  STATE.previewMode = mode;
  document.getElementById('previewTabBoth').className = mode === 'both' ? 'btn btn-secondary btn-sm' : 'btn btn-outline btn-sm';
  document.getElementById('previewTabL1').className = mode === 'lembar1' ? 'btn btn-secondary btn-sm' : 'btn btn-outline btn-sm';
  document.getElementById('previewTabL2').className = mode === 'lembar2' ? 'btn btn-secondary btn-sm' : 'btn btn-outline btn-sm';
  renderPrintSheets();
}

function renderPrintSheets(customOrderData) {
  const data = customOrderData || collectCurrentFormOrder();
  const wrapper = document.getElementById('livePrintPreviewWrapper');
  if (!wrapper) return;

  const htmlLembar1 = buildSopLembar1Html(data, STATE.previewMode === 'both');
  const htmlLembar2 = buildSopLembar2Html(data);

  if (STATE.previewMode === 'lembar1') {
    wrapper.innerHTML = htmlLembar1;
  } else if (STATE.previewMode === 'lembar2') {
    wrapper.innerHTML = htmlLembar2;
  } else {
    wrapper.innerHTML = htmlLembar1 + htmlLembar2;
  }
}

function triggerPrint(mode) {
  const data = collectCurrentFormOrder();
  if (data.sa === 'OTHER' && !data.picOther) {
    showToast('Mohon isi Nama PIC / SA Manual untuk kategori OTHER sebelum mencetak form.', true);
    document.getElementById('inputPicOther').focus();
    return;
  }

  const printSection = document.getElementById('printOnlySection');
  if (mode === 'lembar1') {
    printSection.innerHTML = buildSopLembar1Html(data, false);
  } else if (mode === 'lembar2') {
    printSection.innerHTML = buildSopLembar2Html(data);
  } else {
    printSection.innerHTML = buildSopLembar1Html(data, true) + buildSopLembar2Html(data);
  }

  window.print();
}

/**
 * Membangun HTML Cetak untuk SOP LEMBAR 1 (Customer)
 * Persis sesuai tata letak Sheet 'SOP LEMBAR1' di Spreadsheet 1
 */
function buildSopLembar1Html(data, addPageBreak) {
  const totalRows = Math.max(7, data.items.length);
  let rowsHtml = '';
  let grandTotal = 0;

  for (let i = 0; i < totalRows; i++) {
    const it = data.items[i];
    const qty = it ? (Number(it.qty) || 0) : 0;
    const price = it ? (Number(it.price) || 0) : 0;
    const total = qty * price;
    grandTotal += total;

    rowsHtml += `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${it ? escapeHtml(it.partNo) : ''}</td>
        <td>${it ? escapeHtml(it.partName) : ''}</td>
        <td style="text-align:center;">${it ? qty : ''}</td>
        <td style="text-align:right;">${it ? formatRupiahPlain(price) : ''}</td>
        <td style="text-align:right;font-weight:700;">${it ? formatRupiahPlain(total) : '0'}</td>
      </tr>
    `;
  }

  const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="sop-print-sheet ${addPageBreak ? 'page-break-after' : ''}">
      <div class="sop-sheet-title">FORM SPECIAL ORDER PART</div>

      <table class="sop-meta-table">
        <tr>
          <td class="sop-meta-label">ORDER DATE</td>
          <td style="width:12px;">:</td>
          <td><strong>${escapeHtml(formatDateSlash(data.orderDate))}</strong> &nbsp;/&nbsp; ${escapeHtml(nowTimeStr)}</td>
        </tr>
        <tr>
          <td class="sop-meta-label">NOPOL</td>
          <td>:</td>
          <td><strong>${escapeHtml(data.nopol || '-')}</strong></td>
        </tr>
        <tr>
          <td class="sop-meta-label">NAMA CUSTOMER</td>
          <td>:</td>
          <td>${escapeHtml(data.customerName || '-')}</td>
        </tr>
        <tr>
          <td class="sop-meta-label">NO. TELP</td>
          <td>:</td>
          <td>${escapeHtml(data.phone || '-')}</td>
        </tr>
        <tr>
          <td class="sop-meta-label">ALAMAT</td>
          <td>:</td>
          <td>${escapeHtml(data.address || '-')}</td>
        </tr>
        <tr>
          <td class="sop-meta-label">SA/FO/TEKNISI</td>
          <td>:</td>
          <td><strong>${escapeHtml(data.saDisplay || '-')}</strong></td>
        </tr>
        <tr>
          <td class="sop-meta-label">ESTIMASI TANGGAL KEDATANGAN</td>
          <td>:</td>
          <td><strong>${escapeHtml(formatDateSlash(data.eta))}</strong></td>
        </tr>
        <tr>
          <td class="sop-meta-label">UPDATE ESTIMASI TGL KEDATANGAN</td>
          <td>:</td>
          <td>............................................................</td>
        </tr>
      </table>

      <table class="sop-items-print-table">
        <thead>
          <tr>
            <th style="width:36px;">NO</th>
            <th style="width:140px;">PART NO</th>
            <th>PART NAME</th>
            <th style="width:55px;">QTY</th>
            <th style="width:115px;">PRICE</th>
            <th style="width:125px;">TOTAL HARGA</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:right;font-weight:800;">JUMLAH Rp.</td>
            <td style="text-align:right;font-weight:800;">${formatRupiahPlain(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-bottom:6px;font-size:10.5px;">
        <strong>NOTE :</strong> ${escapeHtml(data.formNote || (data.dpStatus === 'NOT FIX' ? '' : data.dpStatus) || '-')}
      </div>

      <div style="font-weight:700;font-size:10px;">SOP:</div>
      <ol class="sop-terms-list">
        <li>Barang yang sudah di pesan tidak dapat di batalkan / di kembalikan.</li>
        <li>Estimasi tanggal kedatangan bisa sewaktu-waktu berubah, dan akan kami konfirmasi kembali jika ada perubahan tanggal.</li>
        <li>Harga Part yang tercantum diatas tidak terikat, bisa sewaktu waktu mengalami perubahan. Dan belum termasuk jasa pasang.</li>
        <li>Pembayaran pemesanan Sparepart harus dilakukan di awal (Lunas).</li>
        <li>Pemesanan Sparepart yang di butuhkan harus sesuai dengan No.Rangka Kendaraan tersebut.</li>
        <li>Part yang sudah datang dan tidak diambil/dilakukan pemasangan dalam waktu maximal 3 bulan, Part dan DP yang sudah dibayarkan akan hangus.</li>
        <li>Jika terjadi kesalahan dalam pemesanan Sparepart yang tidak sesuai dengan No.Rangka Kendaraan tersebut atau Kendaraan tersebut sudah mengalami perubahan/modifikasi tertentu, maka sepenuhnya hal itu bukan menjadi tanggung jawab kami.</li>
      </ol>

      <table class="sop-sign-table">
        <thead>
          <tr>
            <th>PARTSMAN</th>
            <th>KEPALA BENGKEL</th>
            <th>SERVICE ADVISOR / FOREMAN / TEKNISI</th>
            <th>CUSTOMER</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="sop-sign-space"></td>
            <td class="sop-sign-space"></td>
            <td class="sop-sign-space" style="vertical-align:bottom;font-weight:700;">(${escapeHtml(data.saDisplay || '....................')})</td>
            <td class="sop-sign-space" style="vertical-align:bottom;">(${escapeHtml(data.customerName || '....................')})</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;">
        <div class="sop-explain-box" style="margin-top:0;">
          <div style="font-weight:700;margin-bottom:2px;">DI ISI OLEH PETUGAS SAAT PENJELASAN KE CUSTOMER</div>
          <table style="border-collapse:collapse;font-size:9.5px;">
            <tr>
              <td style="width:65px;">H+4</td>
              <td style="width:32px;">[ &nbsp; ]</td>
              <td style="width:65px;">HOME</td>
              <td style="width:32px;">[ &nbsp; ]</td>
            </tr>
            <tr>
              <td>ARRIVE</td>
              <td><strong>[ √ ]</strong></td>
              <td>DEALER</td>
              <td><strong>[ √ ]</strong></td>
            </tr>
          </table>
        </div>

        <div class="sop-footer-label" style="margin-top:0;">Lembar 1 : Customer</div>
      </div>
    </div>
  `;
}

/**
 * Membangun HTML Cetak untuk SOP LEMBAR 2 (Internal Partsman-SA-MRA)
 * Persis sesuai tata letak Sheet 'SOP LEMBAR2' di Spreadsheet 1 (Kompak 1 Halaman A4)
 */
function buildSopLembar2Html(data) {
  const totalRows = Math.max(7, data.items.length);
  let rowsHtml = '';
  let grandTotal = 0;

  for (let i = 0; i < totalRows; i++) {
    const it = data.items[i];
    const qty = it ? (Number(it.qty) || 0) : 0;
    const price = it ? (Number(it.price) || 0) : 0;
    const total = qty * price;
    grandTotal += total;

    rowsHtml += `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="white-space:nowrap;">${it ? escapeHtml(it.partNo) : ''}</td>
        <td>${it ? escapeHtml(it.partName) : ''}</td>
        <td style="text-align:center;white-space:nowrap;">${it ? escapeHtml(formatDateSlash(data.eta)) : ''}</td>
        <td></td>
        <td style="text-align:center;">${it ? qty : ''}</td>
        <td style="text-align:right;white-space:nowrap;">${it ? formatRupiahPlain(price) : '0'}</td>
        <td style="text-align:right;font-weight:700;white-space:nowrap;">${it ? formatRupiahPlain(total) : '0'}</td>
        <td></td>
        <td></td>
      </tr>
    `;
  }

  const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="sop-print-sheet sop-lembar2-compact">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px;">
        <div class="sop-company-kop" style="margin-bottom:0;">PT. AGUNG AUTOMALL<br/>GIANYAR</div>
        <div class="sop-sheet-title" style="margin-bottom:0;flex:1;text-align:center;">FORM SPECIAL ORDER PART</div>
        <div style="width:120px;"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:stretch;gap:12px;margin-bottom:5px;">
        <div style="border:1.5px solid #000;padding:6px 10px;min-width:130px;font-weight:700;font-size:10px;display:flex;flex-direction:column;justify-content:flex-start;box-sizing:border-box;">
          <div style="font-weight:800;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:4px;">LOKASI :</div>
          <div style="font-size:11px;font-weight:700;word-break:break-word;">${escapeHtml(data.lokasiNote || '..........')}</div>
        </div>

        <table class="sop-meta-table" style="flex:1;margin-bottom:0;">
          <tr>
            <td class="sop-meta-label" style="width:145px;">TANGGAL ORDER</td>
            <td style="width:10px;">:</td>
            <td><strong>${escapeHtml(formatDateSlash(data.orderDate))}</strong> &nbsp;/&nbsp; ${escapeHtml(nowTimeStr)}</td>
          </tr>
          <tr>
            <td class="sop-meta-label">TYPE/NO. ORDER</td>
            <td>:</td>
            <td><strong>${escapeHtml(data.orderNo || '-')}</strong>${data.dpStatus && data.dpStatus !== 'NOT FIX' ? ` (${escapeHtml(data.dpStatus)})` : ''}</td>
          </tr>
          <tr>
            <td class="sop-meta-label">NO. POLISI</td>
            <td>:</td>
            <td><strong>${escapeHtml(data.nopol || '-')}</strong></td>
          </tr>
          <tr>
            <td class="sop-meta-label">NAMA CUSTOMER</td>
            <td>:</td>
            <td>${escapeHtml(data.customerName || '-')}</td>
          </tr>
          <tr>
            <td class="sop-meta-label">NO. TELP</td>
            <td>:</td>
            <td>${escapeHtml(data.phone || '-')}</td>
          </tr>
          <tr>
            <td class="sop-meta-label">ALAMAT</td>
            <td>:</td>
            <td>${escapeHtml(data.address || '-')}</td>
          </tr>
          <tr>
            <td class="sop-meta-label">SA/FO/TEKNISI</td>
            <td>:</td>
            <td><strong>${escapeHtml(data.saDisplay || '-')}</strong></td>
          </tr>
          <tr>
            <td class="sop-meta-label">ETA</td>
            <td>:</td>
            <td><strong>${escapeHtml(formatDateSlash(data.eta))}</strong> &nbsp;|&nbsp; UPDATE ETA : ................. &nbsp;|&nbsp; ATA : .................</td>
          </tr>
        </table>
      </div>

      <table class="sop-items-print-table" style="margin-bottom:6px;">
        <thead>
          <tr>
            <th rowspan="2" style="width:24px;">NO</th>
            <th rowspan="2" style="width:92px;">NOMOR PART</th>
            <th rowspan="2">NAMA PART</th>
            <th rowspan="2" style="width:58px;">ETA</th>
            <th rowspan="2" style="width:52px;">ATA</th>
            <th rowspan="2" style="width:32px;">QTY</th>
            <th rowspan="2" style="width:74px;">HARGA SATUAN</th>
            <th rowspan="2" style="width:80px;">TOTAL HARGA</th>
            <th colspan="2" style="width:76px;">STATUS B/O</th>
          </tr>
          <tr>
            <th style="width:38px;">TGL</th>
            <th style="width:38px;">TTD</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" style="text-align:right;font-weight:800;">JUMLAH Rp.</td>
            <td style="text-align:right;font-weight:800;">${formatRupiahPlain(grandTotal)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <div style="font-size:9.5px;margin-bottom:3px;">
        <strong>KETERANGAN :</strong> ${escapeHtml(data.formNote || '')}${data.dpStatus && data.dpStatus !== 'NOT FIX' ? ` &nbsp; (Status Pembayaran: <strong>${escapeHtml(data.dpStatus)}</strong>)` : ''}
      </div>

      <div style="font-size:9.5px;font-weight:800;margin-bottom:5px;padding:3px 6px;border:1px solid #000;background:#f8fafc;">
        NOTE : Maksimal H+7 Spare Part datang, SA / PIC terkait wajib membuka SO!!!!!!!!!
      </div>

      <div style="font-weight:800;font-size:9.5px;margin-bottom:2px;">FOLLOW UP</div>
      <table class="sop-items-print-table" style="margin-bottom:6px;">
        <thead>
          <tr>
            <th style="width:30px;">NO</th>
            <th style="width:105px;">TANGGAL</th>
            <th>KETERANGAN F/U</th>
            <th style="width:95px;">PIC</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="text-align:center;">1</td><td></td><td>${escapeHtml(data.fu1 || '')}</td><td style="text-align:center;">${escapeHtml(data.saDisplay || '')}</td></tr>
          <tr><td style="text-align:center;">2</td><td></td><td>${escapeHtml(data.fu2 || '')}</td><td style="text-align:center;">${escapeHtml(data.saDisplay || '')}</td></tr>
          <tr><td style="text-align:center;">3</td><td></td><td>${escapeHtml(data.fu3 || '')}</td><td style="text-align:center;">${escapeHtml(data.saDisplay || '')}</td></tr>
        </tbody>
      </table>

      <table class="sop-sign-table" style="margin-top:4px;margin-bottom:5px;">
        <thead>
          <tr>
            <th>PARTSMAN</th>
            <th>KEPALA BENGKEL</th>
            <th>SERVICE ADVISOR / FOREMAN / TEKNISI</th>
            <th>CUSTOMER</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="sop-sign-space"></td>
            <td class="sop-sign-space"></td>
            <td class="sop-sign-space" style="vertical-align:bottom;font-weight:700;">(${escapeHtml(data.saDisplay || '....................')})</td>
            <td class="sop-sign-space" style="vertical-align:bottom;">(${escapeHtml(data.customerName || '....................')})</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:2px;">
        <div class="sop-explain-box" style="margin-top:0;">
          <table style="border-collapse:collapse;font-size:9.5px;">
            <tr>
              <td style="width:60px;">H+4</td>
              <td style="width:30px;">[ &nbsp; ]</td>
              <td style="width:60px;">HOME</td>
              <td style="width:30px;">[ &nbsp; ]</td>
            </tr>
            <tr>
              <td>ARRIVE</td>
              <td><strong>[ √ ]</strong></td>
              <td>DEALER</td>
              <td><strong>[ √ ]</strong></td>
            </tr>
          </table>
        </div>

        <div class="sop-footer-label" style="margin-top:0;">Lembar 2 : Partsman-SA-MRA</div>
      </div>
    </div>
  `;
}

/**
 * ============================================================================
 * PEMBACAAN DATA MONITORING DARI SPREADSHEET 2 (AJS, AYU, FIK, WBN, OTHER)
 * ============================================================================
 */
async function fetchAllMonitoringSheets(showNotification) {
  STATE.isSyncing = true;
  updateSyncBadge('Menyinkronkan data Google Sheets...');

  const monId = window.SOP_CONFIG.SPREADSHEET_MONITORING_ID;
  const sheets = window.SOP_CONFIG.SA_SHEETS;

  try {
    // Jika WebAppAPI URL sudah dipasang, coba baca melalui WebAppAPI dulu
    if (STATE.apiUrl) {
      try {
        const res = await fetch(`${STATE.apiUrl}?action=getMonitoring&sa=ALL`);
        const data = await res.json();
        if (data && data.status === 'ok' && Array.isArray(data.items)) {
          sheets.forEach((s) => { STATE.monitoringBySheet[s] = []; });
          data.items.forEach((item) => {
            const doneKey = `${item.sheetName}::${String(item.nopol || '').trim().toUpperCase()}`;
            if (STATE.completedJobs && STATE.completedJobs[doneKey]) return;
            if (STATE.monitoringBySheet[item.sheetName]) {
              STATE.monitoringBySheet[item.sheetName].push(item);
            }
          });
          mergeLocalOrdersIntoSheets();
          updateSaTabBadges();
          renderMonitoringList();
          checkAndShowNotFixPopup(false);
          checkAndShowFu2ReminderPopup(false);
          STATE.isSyncing = false;
          updateSyncBadge();
          if (showNotification) showToast('✓ Data Monitoring berhasil diperbarui dari Google Spreadsheet.');
          return;
        }
      } catch (apiErr) {
        // Fallback ke pembacaan langsung Google Sheets gviz di bawah
      }
    }

    // Pembacaan langsung (Direct Live Read) dari Spreadsheet 2 yang sudah dibuka aksesnya
    await Promise.all(sheets.map(async (sheetName) => {
      const rawRows = await fetchGvizSheet(monId, sheetName, 'SELECT A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R');
      STATE.monitoringBySheet[sheetName] = parseMonitoringSheetRows(sheetName, rawRows);
    }));

    mergeLocalOrdersIntoSheets();
    updateSaTabBadges();
    renderMonitoringList();
    if (STATE.mainTab === 'kabeng_report') {
      renderKabengWeeklyReport();
    }
    checkAndShowNotFixPopup(false);
    checkAndShowFu2ReminderPopup(false);
    STATE.isSyncing = false;
    updateSyncBadge();
    if (showNotification) {
      showToast('✓ Data Monitoring (AJS, AYU, FIK, WBN, OTHER) berhasil disinkronkan dari Google Sheets.');
    }
  } catch (err) {
    STATE.isSyncing = false;
    updateSyncBadge('Mode Offline / Lokal');
    if (showNotification) {
      showToast('Gagal memuat dari jaringan, menampilkan data terakhir.', true);
    }
  }
}

/**
 * Mengurai baris dari Sheet AJS, AYU, FIK, WBN, OTHER menjadi daftar item & grup Nopol
 */
function parseMonitoringSheetRows(sheetName, rows) {
  const items = [];
  let lastValidNopol = '';
  let lastOrderDate = '';
  let lastOrderNo = '';

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const colA = String(r[0] || '').trim().toUpperCase();
    const colD = String(r[3] || '').trim();
    const colE = String(r[4] || '').trim();

    // Lewati baris judul / header (NOPOL, MONITORING PART SOP, KETERANGAN, 1.0, dll)
    if (
      colA === 'NOPOL' ||
      colA.startsWith('MONITORING') ||
      colA.startsWith('KETERANGAN') ||
      colD === 'PART NO' ||
      colE === 'PART NAME'
    ) {
      continue;
    }

    // Jika baris kosong pemisah grup, reset lastValidNopol
    if (!colA && !colD && !colE) {
      lastValidNopol = '';
      continue;
    }

    const nopol = colA || lastValidNopol;
    if (!nopol || (!colD && !colE)) continue;

    lastValidNopol = nopol;
    const doneKey = `${sheetName}::${nopol.toUpperCase()}`;
    if (STATE.completedJobs && STATE.completedJobs[doneKey]) {
      continue;
    }

    const orderDate = String(r[1] || lastOrderDate || '').trim();
    const orderNo = String(r[2] || lastOrderNo || '').trim();
    if (r[1]) lastOrderDate = orderDate;
    if (r[2]) lastOrderNo = orderNo;

    const qty = parseFloat(r[5]) || 1;
    const price = parseFloat(r[6]) || 0;
    const total = parseFloat(r[8]) || (qty * price);

    let saPic = String(r[17] || '').trim().toUpperCase();
    if (!saPic || saPic === '#REF!' || saPic === 'SA') {
      saPic = sheetName;
    }

    const rowNumber = i + 8; // Perkiraan nomor baris di sheet
    const itemId = `${sheetName}-R${rowNumber}-${nopol}-${colD}`;
    const localEdit = STATE.localFollowUpEdits[itemId] || STATE.localFollowUpEdits[`${sheetName}-${nopol}`];
    const localItemMeta = STATE.localFollowUpEdits[`ITEM-${sheetName}-R${rowNumber}`];

    items.push({
      id: itemId,
      sheetName: sheetName,
      rowNumber: rowNumber,
      nopol: nopol,
      orderDate: orderDate,
      orderNo: localEdit && localEdit.orderNo !== undefined ? localEdit.orderNo : orderNo,
      partNo: colD || '-',
      partName: colE || '-',
      qty: qty,
      price: price,
      eta: String(r[7] || '').trim(),
      total: total,
      ata: localItemMeta && localItemMeta.ata !== undefined ? localItemMeta.ata : String(r[9] || '').trim(),
      note: localEdit && localEdit.note !== undefined ? localEdit.note : String(r[10] || '').trim(),
      dp: localEdit && localEdit.dp ? localEdit.dp : String(r[11] || 'NOT FIX').trim().toUpperCase(),
      newEta: localItemMeta && localItemMeta.newEta !== undefined ? localItemMeta.newEta : String(r[12] || '').trim(),
      etaBo: localItemMeta && localItemMeta.newEta !== undefined ? localItemMeta.newEta : String(r[12] || '').trim(),
      followUp1: localEdit && localEdit.fu1 !== undefined ? localEdit.fu1 : String(r[13] || '').trim(),
      followUp2: localEdit && localEdit.fu2 !== undefined ? localEdit.fu2 : String(r[14] || '').trim(),
      followUp3: localEdit && localEdit.fu3 !== undefined ? localEdit.fu3 : String(r[15] || '').trim(),
      status: localEdit && localEdit.status ? localEdit.status : String(r[16] || (r[9] ? 'ARRIVAL' : 'NOT FIX')).trim().toUpperCase(),
      saPic: (localEdit && localEdit.saPic) ? localEdit.saPic : saPic
    });
  }

  return items;
}

function mergeLocalOrdersIntoSheets() {
  if (!STATE.localSubmittedOrders || STATE.localSubmittedOrders.length === 0) return;

  STATE.localSubmittedOrders.forEach((loc) => {
    const doneKey = `${loc.sheetName}::${String(loc.nopol || '').trim().toUpperCase()}`;
    if (STATE.completedJobs && STATE.completedJobs[doneKey]) return;

    const list = STATE.monitoringBySheet[loc.sheetName];
    if (!list) return;
    const exists = list.some(
      (x) => x.nopol === loc.nopol && x.partNo === loc.partNo && x.partName === loc.partName
    );
    if (!exists) {
      const localEdit = STATE.localFollowUpEdits[`${loc.sheetName}-${loc.nopol}`];
      if (localEdit) {
        loc.followUp1 = localEdit.fu1;
        loc.followUp2 = localEdit.fu2;
        loc.followUp3 = localEdit.fu3;
        if (localEdit.orderNo !== undefined) loc.orderNo = localEdit.orderNo;
        if (localEdit.note !== undefined) loc.note = localEdit.note;
        if (localEdit.dp) loc.dp = localEdit.dp;
        if (localEdit.status) loc.status = localEdit.status;
        if (localEdit.saPic) loc.saPic = localEdit.saPic;
      }
      list.push(loc);
    }
  });
}

const SHORT_MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LOOKUP_MAP = {
  jan: 0, januari: 0,
  feb: 1, februari: 1,
  mar: 2, maret: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  aug: 7, agu: 7, agt: 7, agustus: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9,
  nov: 10, nop: 10, november: 10,
  des: 11, dec: 11, desember: 11
};

/**
 * Mengurai berbagai format tanggal (dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd, dd-MM, dd/MM, "10 Okt", "15 Aug")
 * menjadi objek Date (jam 00:00:00) untuk keperluan sorting ATA & perhitungan H+7.
 */
function parseFlexibleDateToObj(dateStr, fallbackYear) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === '-' || s === '0') return null;

  const defaultYear = fallbackYear || new Date().getFullYear();

  // Format ISO: yyyy-MM-dd
  const mIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mIso) {
    const d = new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // Format: dd/MM/yyyy atau dd-MM-yyyy atau dd/MM/yy
  const mDmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (mDmy) {
    let yr = parseInt(mDmy[3], 10);
    if (yr < 100) yr += 2000;
    const d = new Date(yr, parseInt(mDmy[2], 10) - 1, parseInt(mDmy[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // Format pendek tanpa tahun: dd-MM atau dd/MM (contoh: 02-11, 15/10)
  const mDm = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (mDm) {
    const d = new Date(defaultYear, parseInt(mDm[2], 10) - 1, parseInt(mDm[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // Format teks pendek: "10 Okt", "15 Aug", "06-Okt", "10 Okt 2026"
  const mText = s.match(/^(\d{1,2})[\s\-/]+([A-Za-z]+)(?:[\s\-/]+(\d{2,4}))?$/);
  if (mText) {
    const dayNum = parseInt(mText[1], 10);
    const monKey = mText[2].toLowerCase();
    if (MONTH_LOOKUP_MAP[monKey] !== undefined) {
      let yr = mText[3] ? parseInt(mText[3], 10) : defaultYear;
      if (yr < 100) yr += 2000;
      const d = new Date(yr, MONTH_LOOKUP_MAP[monKey], dayNum);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

/**
 * Mengubah format tanggal apa pun menjadi "dd MMM" (contoh: "10 Okt", "15 Aug")
 */
function formatShortDayMonth(dateStr, fallbackYear) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (!s || s === '-') return '';
  const d = parseFlexibleDateToObj(s, fallbackYear);
  if (!d) return s;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = SHORT_MONTHS_ID[d.getMonth()] || '';
  return `${day} ${mon}`;
}

/**
 * Mengelompokkan baris-baris item part di Monitoring berdasarkan NOPOL + Order Group
 * serta mengurutkan berdasarkan Tanggal Kedatangan (ATA):
 * - No. Pol yang SELURUH item part-nya sudah memiliki ATA diurutkan di paling atas,
 *   mulai dari usia kedatangan PALING LAMA (tanggal ATA paling tua) berurutan ke bawah.
 */
function groupMonitoringItemsByOrder(items) {
  const groups = [];
  const map = new Map();

  items.forEach((item) => {
    const key = `${item.sheetName}::${item.nopol}::${item.orderDate || ''}`;
    if (!map.has(key)) {
      const grp = {
        groupKey: key,
        sheetName: item.sheetName,
        nopol: item.nopol,
        orderDate: item.orderDate,
        orderNo: item.orderNo,
        eta: item.eta,
        ata: item.ata,
        note: item.note,
        dp: item.dp,
        status: item.status,
        saPic: item.saPic,
        followUp1: item.followUp1,
        followUp2: item.followUp2,
        followUp3: item.followUp3,
        fu1Date: item.fu1Date || '',
        fu2Date: item.fu2Date || '',
        rowNumbers: [item.rowNumber],
        items: [item],
        grandTotal: item.total
      };
      map.set(key, grp);
      groups.push(grp);
    } else {
      const grp = map.get(key);
      grp.items.push(item);
      grp.rowNumbers.push(item.rowNumber);
      grp.grandTotal += item.total;
      if (!grp.orderNo && item.orderNo) grp.orderNo = item.orderNo;
      if (!grp.ata && item.ata) grp.ata = item.ata;
      if (!grp.followUp1 && item.followUp1) grp.followUp1 = item.followUp1;
      if (!grp.followUp2 && item.followUp2) grp.followUp2 = item.followUp2;
      if (!grp.followUp3 && item.followUp3) grp.followUp3 = item.followUp3;
      if (!grp.fu1Date && item.fu1Date) grp.fu1Date = item.fu1Date;
      if (!grp.fu2Date && item.fu2Date) grp.fu2Date = item.fu2Date;
      if ((!grp.saPic || grp.saPic === 'OTHER') && item.saPic && item.saPic !== 'OTHER') {
        grp.saPic = item.saPic;
      }
    }
  });

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Hitung metadata ATA, Usia Hari & Usia Follow Up 1 untuk tiap grup No. Polisi
  groups.forEach((grp, idx) => {
    grp.originalIndex = idx;
    const orderDateObj = parseFlexibleDateToObj(grp.orderDate);
    const fallbackYear = orderDateObj ? orderDateObj.getFullYear() : now.getFullYear();
    grp.orderTimestamp = orderDateObj ? orderDateObj.getTime() : 0;

    // Sinkronkan dengan local edits jika ada
    const localFu = STATE.localFollowUpEdits && STATE.localFollowUpEdits[`${grp.sheetName}-${grp.nopol}`];
    if (localFu) {
      if (localFu.fu1Date !== undefined) grp.fu1Date = localFu.fu1Date;
      if (localFu.fu2Date !== undefined) grp.fu2Date = localFu.fu2Date;
    }

    if (grp.fu1Date) {
      const fu1Obj = parseFlexibleDateToObj(grp.fu1Date);
      grp.daysSinceFu1 = fu1Obj ? Math.max(0, Math.floor((todayMidnight - fu1Obj.getTime()) / 86400000)) : null;
    } else {
      grp.daysSinceFu1 = null;
    }
    grp.orderAgeDays = orderDateObj
      ? Math.max(0, Math.floor((todayMidnight - orderDateObj.getTime()) / 86400000))
      : 0;

    const itemAtaDates = [];
    let arrivedCount = 0;

    grp.items.forEach((it) => {
      const d = parseFlexibleDateToObj(it.ata, fallbackYear);
      if (d) {
        arrivedCount++;
        itemAtaDates.push(d);
        it.status = 'ARRIVAL';
      }
    });

    grp.arrivedItemCount = arrivedCount;
    grp.allItemsArrived = grp.items.length > 0 && arrivedCount === grp.items.length;
    grp.someItemsArrived = arrivedCount > 0 && arrivedCount < grp.items.length;

    // Jika ada item part yang sudah memiliki ATA, status order otomatis menjadi 'ARRIVAL'
    if (arrivedCount > 0) {
      if (!grp.status || grp.status === 'NOT FIX' || grp.status === 'IN PROCESS' || grp.status === 'BO') {
        grp.status = 'ARRIVAL';
      }
    }

    if (itemAtaDates.length > 0) {
      // Tanggal saat seluruh item part selesai datang (tanggal ATA terakhir di antara item part grup tersebut)
      const latestAtaTime = Math.max(...itemAtaDates.map((d) => d.getTime()));
      const latestAtaObj = new Date(latestAtaTime);
      grp.fullAtaTimestamp = latestAtaTime;
      grp.ataAgeDays = Math.max(0, Math.floor((todayMidnight - latestAtaTime) / 86400000));
      grp.latestAtaDisplay = `${String(latestAtaObj.getDate()).padStart(2, '0')} ${SHORT_MONTHS_ID[latestAtaObj.getMonth()]}`;
    } else {
      grp.fullAtaTimestamp = Infinity;
      grp.ataAgeDays = -1;
      grp.latestAtaDisplay = formatShortDayMonth(grp.ata, fallbackYear) || '';
    }
  });

  // Urutkan:
  // 1. Grup yang SEMUA item part-nya sudah datang (allItemsArrived = true) berada di paling atas,
  //    diurutkan dari tanggal ATA paling lama (usia paling tua = fullAtaTimestamp terkecil) ke yang lebih baru.
  // 2. Grup yang SEBAGIAN item part-nya sudah ada ATA (someItemsArrived = true), dari ATA terlama ke terbaru.
  // 3. Grup yang belum memiliki ATA, dari Order Date terlama ke terbaru.
  groups.sort((a, b) => {
    const tierA = a.allItemsArrived ? 1 : (a.someItemsArrived ? 2 : 3);
    const tierB = b.allItemsArrived ? 1 : (b.someItemsArrived ? 2 : 3);
    if (tierA !== tierB) return tierA - tierB;

    if (tierA === 1 || tierA === 2) {
      if (a.fullAtaTimestamp !== b.fullAtaTimestamp) {
        return a.fullAtaTimestamp - b.fullAtaTimestamp; // Paling lama usianya di paling atas
      }
    }

    if (a.orderTimestamp && b.orderTimestamp && a.orderTimestamp !== b.orderTimestamp) {
      return a.orderTimestamp - b.orderTimestamp;
    }
    return b.originalIndex - a.originalIndex;
  });

  return groups;
}

function selectSaMonitoringTab(saName) {
  STATE.activeSaSheet = saName;
  document.querySelectorAll('#saSheetTabs .sa-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-sa') === saName);
  });

  const subtitleEl = document.getElementById('activeMenuHeaderSubtitle');
  if (subtitleEl && STATE.mainTab === 'monitoring') {
    subtitleEl.textContent = `Menu Aktif: Monitoring SOP — ${saName}`;
  }

  // Tampilkan filter PIC khusus jika tab yang dibuka adalah OTHER
  const otherFilterWrap = document.getElementById('otherPicFilterWrap');
  if (saName === 'OTHER') {
    otherFilterWrap.classList.remove('hidden');
    populateOtherPicFilterOptions();
  } else {
    otherFilterWrap.classList.add('hidden');
  }

  renderMonitoringList();
}

function populateOtherPicFilterOptions() {
  const select = document.getElementById('otherPicFilterSelect');
  const currentVal = select.value || 'ALL';
  const items = STATE.monitoringBySheet.OTHER || [];
  const pics = new Set(window.SOP_CONFIG.OTHER_PIC_SUGGESTIONS || []);
  items.forEach((it) => {
    if (it.saPic && it.saPic !== 'OTHER') pics.add(it.saPic);
  });

  select.innerHTML = `<option value="ALL">Semua PIC (Sheet OTHER)</option>` +
    Array.from(pics).sort().map((p) => `<option value="${escapeHtml(p)}">PIC: ${escapeHtml(p)}</option>`).join('');
  if (Array.from(pics).includes(currentVal)) {
    select.value = currentVal;
  }
}

function updateSaTabBadges() {
  window.SOP_CONFIG.SA_SHEETS.forEach((sa) => {
    const items = STATE.monitoringBySheet[sa] || [];
    const groups = groupMonitoringItemsByOrder(items);
    const completeGroups = groups.filter((g) => g.allItemsArrived);
    const completeTotalRupiah = completeGroups.reduce((sum, g) => sum + (Number(g.grandTotal) || 0), 0);
    const badge = document.getElementById(`badgeCount${sa}`);
    if (badge) {
      if (completeGroups.length > 0) {
        badge.innerHTML = `
          <div class="sa-order-count">${groups.length} Order</div>
          <div class="sa-complete-tag">
            <span class="sa-complete-unit">✓ ${completeGroups.length} Lengkap</span>
            <span class="sa-complete-rp">${formatRupiah(completeTotalRupiah)}</span>
          </div>
        `;
      } else {
        badge.innerHTML = `
          <div class="sa-order-count">${groups.length} Order</div>
          <div class="sa-empty-tag">${items.length} Part</div>
        `;
      }
    }
  });
}

/**
 * Helper untuk menentukan skema warna badge berdasarkan Usia Part Lengkap:
 * - 0 - 7 Hari  : Hijau muda (Normal / Baru Tiba)
 * - > 7 Hari (8 - 14 Hari) : Kuning (Perhatian / Perlu Follow Up Segera)
 * - > 14 Hari   : Merah (Kritis / Overdue)
 */
function getAtaAgeBadgeStyle(ageDays) {
  const age = Number(ageDays) || 0;
  if (age <= 7) {
    return {
      bg: '#dcfce7',
      color: '#15803d',
      border: '#86efac',
      label: `${age} Hari (Normal)`,
      dotColor: '#22c55e'
    };
  } else if (age <= 14) {
    return {
      bg: '#fef08a',
      color: '#854d0e',
      border: '#eab308',
      label: `${age} Hari (>7 Hari)`,
      dotColor: '#eab308'
    };
  } else {
    return {
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fca5a5',
      label: `${age} Hari (>14 Hari)`,
      dotColor: '#ef4444'
    };
  }
}

/**
 * Merender Banner KPI Kedatangan Sparepart Lengkap pada Header SA aktif
 * (Menampilkan Total No. Pol dan Total Nilai Rupiah untuk Part yang sudah datang semua)
 */
function renderSaArrivalKpi(saName, allGroups) {
  const container = document.getElementById('saKpiArrivalSummary');
  if (!container) return;

  const completeGroups = allGroups.filter((g) => g.allItemsArrived);
  const completeNopolCount = completeGroups.length;
  const completeTotalRupiah = completeGroups.reduce((sum, g) => sum + (Number(g.grandTotal) || 0), 0);

  const pillsHtml = completeGroups.length > 0
    ? `<div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;margin-top:0.6rem;padding-top:0.55rem;border-top:1px dashed rgba(255,255,255,0.18);">
        <span style="font-size:0.72rem;font-weight:700;color:#cbd5e1;">Nopol Lengkap (Klik untuk lihat):</span>
        ${completeGroups.map((g) => {
          const ageStyle = getAtaAgeBadgeStyle(g.ataAgeDays);
          return `
          <button
            type="button"
            onclick="focusNopolCard('${escapeHtml(g.nopol)}')"
            class="badge"
            style="background:${ageStyle.bg};color:${ageStyle.color};border:1px solid ${ageStyle.border};font-size:0.72rem;font-weight:800;padding:0.22rem 0.6rem;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;box-shadow:0 1px 3px rgba(0,0,0,0.15);"
            title="Usia part lengkap: ${g.ataAgeDays} hari. Klik untuk langsung menuju kartu ${escapeHtml(g.nopol)}"
          >
            <span>✓ ${escapeHtml(g.nopol)}</span>
            <span style="font-size:0.68rem;opacity:0.9;">(${formatRupiah(g.grandTotal)})</span>
            <span style="font-size:0.65rem;padding:1px 5px;border-radius:4px;background:rgba(0,0,0,0.08);font-weight:900;">${g.ataAgeDays}h</span>
          </button>
        `;
        }).join('')}
      </div>`
    : '';

  container.innerHTML = `
    <div style="background:linear-gradient(135deg, #18181b 0%, #27272a 100%);border:1.5px solid #3f3f46;border-left:5px solid #16a34a;border-radius:10px;padding:0.85rem 1.15rem;color:#f4f4f5;box-shadow:0 4px 12px rgba(0,0,0,0.18);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
        <div style="display:flex;align-items:center;gap:0.7rem;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:9px;background:rgba(22,163,74,0.22);color:#4ade80;font-size:1.4rem;border:1.5px solid rgba(74,222,128,0.35);">📦</span>
          <div>
            <div style="font-size:0.78rem;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#86efac;">
              SPAREPART DATANG LENGKAP (ATA) &bull; ${escapeHtml(saName)}
            </div>
            <div style="font-size:0.72rem;color:#a1a1aa;margin-top:0.1rem;">
              Daftar pesanan di mana <strong>SEMUA</strong> item sparepart sudah tiba di bengkel (Siap Buka SO / Hubungi Pelanggan)
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:0.85rem;flex-wrap:wrap;">
          <div style="background:rgba(9,9,11,0.65);border:1px solid #3f3f46;padding:0.45rem 0.95rem;border-radius:8px;text-align:right;">
            <div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Total No. Pol Lengkap</div>
            <div style="font-size:1.22rem;font-weight:900;color:#ffffff;line-height:1.2;">
              <span style="color:#4ade80;">${completeNopolCount}</span> <span style="font-size:0.75rem;color:#cbd5e1;font-weight:600;">Nopol</span>
            </div>
          </div>

          <div style="background:rgba(9,9,11,0.65);border:1px solid #3f3f46;padding:0.45rem 0.95rem;border-radius:8px;text-align:right;">
            <div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Total Nilai Rupiah Lengkap</div>
            <div style="font-size:1.22rem;font-weight:900;color:#4ade80;line-height:1.2;">
              ${formatRupiah(completeTotalRupiah)}
            </div>
          </div>
        </div>
      </div>
      ${pillsHtml}
    </div>
  `;
}

function focusNopolCard(nopol) {
  const cards = document.querySelectorAll('.order-group-card');
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute('data-nopol') === nopol) {
      cards[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
      cards[i].style.boxShadow = '0 0 0 4px rgba(22, 163, 74, 0.75)';
      setTimeout(() => {
        cards[i].style.boxShadow = '';
      }, 2600);
      break;
    }
  }
}

/**
 * Merender daftar kartu Monitoring SA di mana seluruh data order bersifat Read-Only
 * dan SA HANYA BISA mengedit Follow Up 1, Follow Up 2, dan Follow Up 3!
 */
function renderMonitoringList() {
  const container = document.getElementById('monitoringListContainer');
  if (!container) return;

  const perm = getUserPermissions(STATE.currentUser);
  const saName = STATE.activeSaSheet;
  const rawItems = STATE.monitoringBySheet[saName] || [];
  const allGroups = groupMonitoringItemsByOrder(rawItems);

  // Render Banner KPI Kedatangan Lengkap untuk Header SA ini
  renderSaArrivalKpi(saName, allGroups);

  const searchQuery = (document.getElementById('monitoringSearchInput').value || '').trim().toUpperCase();
  const dpFilterEl = document.getElementById('monitoringDpFilter');
  const dpFilter = dpFilterEl ? (dpFilterEl.value || 'ALL') : 'ALL';
  const statusFilter = document.getElementById('monitoringStatusFilter').value || 'ALL';
  const picFilter = saName === 'OTHER' ? (document.getElementById('otherPicFilterSelect').value || 'ALL') : 'ALL';

  const filtered = allGroups.filter((grp) => {
    const curDp = (grp.dp || 'NOT FIX').toUpperCase();
    const curStatus = (grp.status || 'NOT FIX').toUpperCase();
    if (dpFilter !== 'ALL' && curDp !== dpFilter) return false;
    if (statusFilter === 'NOT FIX' && curStatus !== 'NOT FIX') return false;
    if (statusFilter === 'IN PROCESS' && curStatus !== 'IN PROCESS') return false;
    if (statusFilter === 'ARRIVAL' && !curStatus.includes('ARRIVAL')) return false;
    if (statusFilter === 'BO' && curStatus !== 'BO') return false;
    if (statusFilter === 'NEED_FU' && (grp.followUp1 || grp.followUp2 || grp.followUp3)) return false;

    if (saName === 'OTHER' && picFilter !== 'ALL') {
      if ((grp.saPic || '').toUpperCase() !== picFilter.toUpperCase()) return false;
    }

    if (searchQuery) {
      const matchNopol = grp.nopol.toUpperCase().includes(searchQuery);
      const matchOrderNo = (grp.orderNo || '').toUpperCase().includes(searchQuery);
      const matchPic = (grp.saPic || '').toUpperCase().includes(searchQuery);
      const matchPart = grp.items.some(
        (it) => it.partNo.toUpperCase().includes(searchQuery) || it.partName.toUpperCase().includes(searchQuery)
      );
      if (!matchNopol && !matchOrderNo && !matchPic && !matchPart) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:#64748b;">
        <div style="font-size:1.05rem;font-weight:700;color:#334155;margin-bottom:0.3rem;">
          Tidak ada data order yang cocok untuk SA ${escapeHtml(saName)}
        </div>
        <div style="font-size:0.84rem;">
          Coba ubah kata kunci pencarian atau pilih tab SA lainnya.
        </div>
      </div>
    `;
    return;
  }

  STATE.currentRenderedGroups = {};

  container.innerHTML = filtered.map((grp, idx) => {
    const normDp = (grp.dp || 'NOT FIX').toUpperCase();
    const normStatus = (grp.status || 'NOT FIX').toUpperCase();
    let statusClass = 'status-process';
    if (normStatus.includes('ARRIVAL')) statusClass = 'status-arrival';
    else if (normStatus === 'BO') statusClass = 'status-bo';
    else if (normStatus === 'NOT FIX') statusClass = 'status-notfix';

    const safeDomId = `grp_${saName}_${idx}`;
    STATE.currentRenderedGroups[safeDomId] = grp;

    // Khusus untuk Sheet OTHER, tampilkan juga kolom input manual PIC jika ingin disesuaikan
    const otherPicEditHtml = saName === 'OTHER' ? `
      <div class="fu-row" style="margin-bottom:0.2rem;">
        <span class="fu-label" style="background:#fef3c7;color:#b45309;border-color:#fde68a;">PIC (OTHER)</span>
        <input
          type="text"
          id="${safeDomId}_pic"
          class="fu-input input-uppercase"
          style="${perm.isViewerOnly ? 'border-color:#cbd5e1;background:#f8fafc;cursor:not-allowed;color:#64748b;' : 'border-color:#fcd34d;'}"
          placeholder="Nama PIC Manual (contoh: PONI, MRA, PHW)"
          value="${escapeHtml(grp.saPic === 'OTHER' ? '' : grp.saPic)}"
          ${perm.isViewerOnly ? 'disabled="disabled"' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
        />
      </div>
    ` : '';

    const ageStyle = getAtaAgeBadgeStyle(grp.ataAgeDays);
    const ataStatusBadgeHtml = grp.allItemsArrived
      ? `<span style="font-size:0.72rem;font-weight:800;padding:0.22rem 0.6rem;border-radius:6px;background:${ageStyle.bg};color:${ageStyle.color};border:1px solid ${ageStyle.border};box-shadow:0 1px 3px rgba(0,0,0,0.06);display:inline-flex;align-items:center;gap:0.35rem;">
           <span>📦 Semua Part Datang (ATA: ${escapeHtml(grp.latestAtaDisplay)} • Usia: <strong>${grp.ataAgeDays} Hari</strong>)</span>
         </span>`
      : (grp.someItemsArrived
          ? `<span style="font-size:0.72rem;font-weight:800;padding:0.22rem 0.6rem;border-radius:6px;background:#d97706;color:#ffffff;border:1px solid #fde68a;">
               📦 Sebagian Part Datang (${grp.arrivedItemCount}/${grp.items.length} Item)
             </span>`
          : (normStatus === 'NOT FIX' && grp.orderAgeDays >= 7
              ? `<span style="font-size:0.72rem;font-weight:800;padding:0.22rem 0.6rem;border-radius:6px;background:#dc2626;color:#ffffff;border:1px solid #fca5a5;">
                   ⚠️ NOT FIX H+${grp.orderAgeDays} Hari
                 </span>`
              : ''));

    const viewerBadgeHtml = perm.isViewerOnly
      ? `<span style="font-size:0.72rem;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-weight:700;border:1px solid #bfdbfe;">👁️ Mode Viewer (Read-Only)</span>`
      : '';

    return `
      <div id="card_${safeDomId}" data-nopol="${escapeHtml(grp.nopol)}" class="order-group-card">
        <div class="order-group-header">
          <div style="display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;">
            <span class="nopol-badge">${escapeHtml(grp.nopol)}</span>
            <span class="pic-badge">SA / PIC: ${escapeHtml(grp.saPic || saName)}</span>
            ${grp.note ? `<span class="dp-badge">Rak/Note: ${escapeHtml(grp.note)}</span>` : ''}
            ${viewerBadgeHtml}
            ${ataStatusBadgeHtml}
            <span style="font-size:0.78rem;color:#e4e4e7;font-weight:600;">
              📅 Order: <strong style="color:#ffffff;">${escapeHtml(grp.orderDate || '-')}</strong>
              <span id="${safeDomId}_header_orderno">${grp.orderNo ? ` • No. Order: <strong style="color:#ffffff;">${escapeHtml(grp.orderNo)}</strong>` : ''}</span>
              ${grp.eta ? ` • ETA: <strong style="color:#fca5a5;">${escapeHtml(formatShortDayMonth(grp.eta))}</strong>` : ''}
              ${grp.latestAtaDisplay ? ` • ATA: <strong style="color:#86efac;">${escapeHtml(grp.latestAtaDisplay)}</strong>` : ''}
            </span>
          </div>

          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <div style="display:inline-flex;align-items:center;gap:0.35rem;background:rgba(9,9,11,0.6);padding:0.22rem 0.55rem;border-radius:8px;border:1px solid rgba(255,255,255,0.22);">
              <span style="font-size:0.72rem;font-weight:800;color:#fca5a5;">Status DP:</span>
              <select
                id="${safeDomId}_dp"
                class="select"
                ${perm.isViewerOnly ? 'disabled="disabled"' : ''}
                style="width:auto;height:30px;padding:0 0.5rem;font-size:0.76rem;font-weight:800;background:${perm.isViewerOnly ? '#f1f5f9' : '#ffffff'};color:${perm.isViewerOnly ? '#64748b' : '#09090b'};border-color:${perm.isViewerOnly ? '#cbd5e1' : '#e60012'};cursor:${perm.isViewerOnly ? 'not-allowed' : 'pointer'};"
                title="${perm.isViewerOnly ? 'Mode Viewer (Hanya Lihat)' : 'Pilih Status DP (Otomatis Tersimpan)'}"
                ${perm.isViewerOnly ? '' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
              >
                <option value="NOT FIX" ${normDp === 'NOT FIX' || normDp === '' || normDp === '???' ? 'selected' : ''}>NOT FIX</option>
                <option value="LUNAS" ${normDp === 'LUNAS' ? 'selected' : ''}>LUNAS</option>
                <option value="DP" ${normDp === 'DP' ? 'selected' : ''}>DP</option>
                <option value="KNTRK" ${normDp === 'KNTRK' ? 'selected' : ''}>KNTRK</option>
                <option value="INAP" ${normDp === 'INAP' ? 'selected' : ''}>INAP</option>
                <option value="W/O DP" ${normDp === 'W/O DP' || normDp === 'W/ODP' || normDp === 'WO DP' ? 'selected' : ''}>W/O DP</option>
                <option value="TWC" ${normDp === 'TWC' ? 'selected' : ''}>TWC</option>
              </select>
            </div>

            <div style="display:inline-flex;align-items:center;gap:0.35rem;background:rgba(9,9,11,0.6);padding:0.22rem 0.55rem;border-radius:8px;border:1px solid rgba(255,255,255,0.22);">
              <span style="font-size:0.72rem;font-weight:800;color:#fca5a5;">Status Order:</span>
              <select
                id="${safeDomId}_status"
                class="select"
                ${perm.isViewerOnly ? 'disabled="disabled"' : ''}
                style="width:auto;height:30px;padding:0 0.5rem;font-size:0.76rem;font-weight:800;background:${perm.isViewerOnly ? '#f1f5f9' : '#ffffff'};color:${perm.isViewerOnly ? '#64748b' : '#09090b'};border-color:${perm.isViewerOnly ? '#cbd5e1' : '#e60012'};cursor:${perm.isViewerOnly ? 'not-allowed' : 'pointer'};"
                title="${perm.isViewerOnly ? 'Mode Viewer (Hanya Lihat)' : 'Pilih Status Order (Otomatis Tersimpan)'}"
                ${perm.isViewerOnly ? '' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
              >
                <option value="NOT FIX" ${normStatus === 'NOT FIX' ? 'selected' : ''}>NOT FIX</option>
                <option value="IN PROCESS" ${normStatus === 'IN PROCESS' ? 'selected' : ''}>IN PROCESS</option>
                <option value="ARRIVAL" ${normStatus.includes('ARRIVAL') ? 'selected' : ''}>ARRIVAL</option>
                <option value="BO" ${normStatus === 'BO' ? 'selected' : ''}>BO</option>
              </select>
            </div>

            <button
              type="button"
              class="btn btn-outline btn-sm"
              onclick='printOrderFromMonitoring(${JSON.stringify(grp).replace(/'/g, "&#39;")})'
              title="Cetak Form Order SOP Lembar 1 & 2 untuk Nopol ini"
            >
              🖨 Print SOP
            </button>
            ${perm.isViewerOnly ? '' : `
            <button
              type="button"
              id="${safeDomId}_jobdone_btn"
              class="btn btn-job-done btn-sm"
              onclick="markOrderJobDone('${safeDomId}')"
              title="Kirim No. Polisi ini beserta seluruh item part ke Sheet 'JOB DONE' dan hapus dari Monitoring SOP"
            >
              ✓ Job Done
            </button>
            <button
              type="button"
              id="${safeDomId}_delete_btn"
              class="btn btn-outline btn-sm"
              style="color:#ef4444;border-color:#fca5a5;background:rgba(239,68,68,0.06);font-weight:700;"
              onclick="cancelAndDeleteOrder('${safeDomId}')"
              title="Hapus data pesanan ${escapeHtml(grp.nopol)} dari aplikasi dan Google Spreadsheet jika batal order"
            >
              🗑 Hapus
            </button>
            `}
          </div>
        </div>

        <div class="order-group-body">
          <!-- PANEL KIRI: DATA ITEM PART + INPUT NEW ETA & ATA PER ITEM PART -->
          <div class="readonly-parts-pane">
            <div class="pane-caption">
              <span>Daftar Item Part (${grp.items.length} Item) — Total: ${formatRupiah(grp.grandTotal)}</span>
              <span class="lock-tag">NEW ETA &amp; ATA Per Item Part</span>
            </div>

            <div style="overflow-x:auto;">
              <table class="mini-parts-table">
                <thead>
                  <tr>
                    <th style="width:28px;">No</th>
                    <th>Part No &amp; Part Name</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Subtotal</th>
                    <th style="text-align:center;">ETA Awal</th>
                    <th style="width:120px;color:#b45309;">NEW ETA</th>
                    <th style="width:120px;color:#15803d;">ATA</th>
                  </tr>
                </thead>
                <tbody>
                  ${grp.items.map((it, i) => {
                    const rawNewEta = it.newEta || it.etaBo || '';
                    const rawAta = it.ata || '';
                    const isoNewEta = toDateInputFormat(rawNewEta);
                    const isoAta = toDateInputFormat(rawAta);
                    const dispNewEta = formatShortDayMonth(rawNewEta);
                    const dispAta = formatShortDayMonth(rawAta);
                    const dispEtaAwal = formatShortDayMonth(it.eta || grp.eta) || '-';

                    return `
                    <tr>
                      <td>${i + 1}</td>
                      <td>
                        <div style="font-family:monospace;font-weight:700;font-size:0.78rem;color:#475569;">${escapeHtml(it.partNo)}</div>
                        <div style="font-weight:700;color:#0f172a;">${escapeHtml(it.partName)}</div>
                      </td>
                      <td style="text-align:center;font-weight:600;">${it.qty}</td>
                      <td style="text-align:right;font-weight:700;">${formatRupiah(it.total)}</td>
                      <td style="text-align:center;font-size:0.78rem;font-weight:700;color:#475569;">${escapeHtml(dispEtaAwal)}</td>
                      <td>
                        ${perm.isViewerOnly ? `
                          <div
                            style="position:relative;display:inline-flex;align-items:center;justify-content:space-between;width:108px;height:32px;padding:0 0.5rem;border:1.5px solid #e2e8f0;background:#f8fafc;border-radius:7px;cursor:default;"
                            title="NEW ETA (Mode Viewer)"
                          >
                            <span
                              style="font-size:0.78rem;font-weight:800;color:${dispNewEta ? '#b45309' : '#94a3b8'};"
                            >${escapeHtml(dispNewEta || '-')}</span>
                            <span style="font-size:0.76rem;color:#b45309;">📅</span>
                          </div>
                        ` : `
                          <div
                            style="position:relative;display:inline-flex;align-items:center;justify-content:space-between;width:108px;height:32px;padding:0 0.5rem;border:1.5px solid #fcd34d;background:#fffbeb;border-radius:7px;cursor:pointer;"
                            onclick="openShortDatePicker('${safeDomId}_neweta_${i}')"
                            title="Klik untuk pilih tanggal NEW ETA (format: 10 Okt)"
                          >
                            <span
                              id="${safeDomId}_neweta_lbl_${i}"
                              style="font-size:0.78rem;font-weight:800;color:${dispNewEta ? '#b45309' : '#94a3b8'};"
                            >${escapeHtml(dispNewEta || '- Pilih -')}</span>
                            <span style="font-size:0.76rem;color:#b45309;">📅</span>
                            <input
                              type="date"
                              id="${safeDomId}_neweta_${i}"
                              data-rownum="${it.rowNumber}"
                              value="${escapeHtml(isoNewEta)}"
                              onchange="onShortDateInputChanged(this, '${safeDomId}_neweta_lbl_${i}', '#b45309', '${safeDomId}', false, '${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)})"
                              style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;"
                            />
                          </div>
                        `}
                      </td>
                      <td>
                        ${perm.isViewerOnly ? `
                          <div
                            style="position:relative;display:inline-flex;align-items:center;justify-content:space-between;width:108px;height:32px;padding:0 0.5rem;border:1.5px solid #e2e8f0;background:#f8fafc;border-radius:7px;cursor:default;"
                            title="ATA (Mode Viewer)"
                          >
                            <span
                              style="font-size:0.78rem;font-weight:800;color:${dispAta ? '#15803d' : '#94a3b8'};"
                            >${escapeHtml(dispAta || '-')}</span>
                            <span style="font-size:0.76rem;color:#15803d;">📅</span>
                          </div>
                        ` : `
                          <div
                            style="position:relative;display:inline-flex;align-items:center;justify-content:space-between;width:108px;height:32px;padding:0 0.5rem;border:1.5px solid #86efac;background:#f0fdf4;border-radius:7px;cursor:pointer;"
                            onclick="openShortDatePicker('${safeDomId}_ata_${i}')"
                            title="Klik untuk pilih tanggal ATA (format: 10 Okt)"
                          >
                            <span
                              id="${safeDomId}_ata_lbl_${i}"
                              style="font-size:0.78rem;font-weight:800;color:${dispAta ? '#15803d' : '#94a3b8'};"
                            >${escapeHtml(dispAta || '-')}</span>
                            <span style="font-size:0.76rem;color:#15803d;">📅</span>
                            <input
                              type="date"
                              id="${safeDomId}_ata_${i}"
                              data-rownum="${it.rowNumber}"
                              value="${escapeHtml(isoAta)}"
                              onchange="onShortDateInputChanged(this, '${safeDomId}_ata_lbl_${i}', '#15803d', '${safeDomId}', true, '${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)})"
                              style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;"
                            />
                          </div>
                        `}
                      </td>
                    </tr>
                  `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- PANEL KANAN: INPUT TYPE/NO ORDER, LOKASI RAK/NOTE & HASIL FOLLOW UP 1, 2, 3 -->
          <div class="followup-edit-pane">
            <div class="pane-caption" style="color:#991b1b;">
              <span>✏️ Update Order &amp; Hasil Follow Up SA</span>
              <span style="font-size:0.68rem;color:#e60012;font-weight:800;">Reminder H+7 Otomatis</span>
            </div>

            <div class="fu-inputs-grid">
              ${otherPicEditHtml}
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.15rem;">
                <div>
                  <div style="font-size:0.68rem;font-weight:800;color:#18181b;text-transform:uppercase;margin-bottom:0.2rem;">Type / No. Order</div>
                  <input
                    type="text"
                    id="${safeDomId}_orderno"
                    class="fu-input input-uppercase"
                    style="width:100%;${perm.isViewerOnly ? 'background:#f8fafc;color:#475569;border-color:#cbd5e1;cursor:not-allowed;' : ''}"
                    placeholder="Contoh: GR221026"
                    value="${escapeHtml(grp.orderNo || '')}"
                    ${perm.isViewerOnly ? 'disabled="disabled"' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
                  />
                </div>
                <div>
                  <div style="font-size:0.68rem;font-weight:800;color:#18181b;text-transform:uppercase;margin-bottom:0.2rem;">Lokasi Rak / Note</div>
                  <input
                    type="text"
                    id="${safeDomId}_note"
                    class="fu-input input-uppercase"
                    style="width:100%;${perm.isViewerOnly ? 'background:#f8fafc;color:#475569;border-color:#cbd5e1;cursor:not-allowed;' : ''}"
                    placeholder="Contoh: E1, B2, C3"
                    value="${escapeHtml(grp.note || '')}"
                    ${perm.isViewerOnly ? 'disabled="disabled"' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
                  />
                </div>
              </div>
              <div class="fu-row" style="flex-direction:column;align-items:stretch;gap:0.2rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span class="fu-label" style="margin-bottom:0;">Follow Up 1</span>
                  <span id="${safeDomId}_fu1_date_lbl" style="font-size:0.7rem;font-weight:700;color:${grp.fu1Date ? '#0369a1' : '#94a3b8'};">
                    ${grp.fu1Date ? `📅 ${formatShortDayMonth(grp.fu1Date)}` : '📅 Otomatis saat diisi'}
                  </span>
                </div>
                <input
                  type="text"
                  id="${safeDomId}_fu1"
                  class="fu-input input-uppercase"
                  style="${perm.isViewerOnly ? 'background:#f8fafc;color:#475569;border-color:#cbd5e1;cursor:not-allowed;' : ''}"
                  placeholder="Isi hasil Follow Up 1 (contoh: BOOKING TGL 25/10)"
                  value="${escapeHtml(grp.followUp1)}"
                  ${perm.isViewerOnly ? 'disabled="disabled"' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
                />
              </div>
              <div class="fu-row" style="flex-direction:column;align-items:stretch;gap:0.2rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span class="fu-label" style="margin-bottom:0;">Follow Up 2</span>
                  <span id="${safeDomId}_fu2_date_lbl" style="font-size:0.7rem;font-weight:700;color:${grp.fu2Date ? '#0369a1' : '#94a3b8'};">
                    ${grp.fu2Date ? `📅 ${formatShortDayMonth(grp.fu2Date)}` : '📅 Otomatis saat diisi'}
                  </span>
                </div>
                <input
                  type="text"
                  id="${safeDomId}_fu2"
                  class="fu-input input-uppercase"
                  style="${perm.isViewerOnly ? 'background:#f8fafc;color:#475569;border-color:#cbd5e1;cursor:not-allowed;' : ''}"
                  placeholder="Isi hasil Follow Up 2..."
                  value="${escapeHtml(grp.followUp2)}"
                  ${perm.isViewerOnly ? 'disabled="disabled"' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
                />
              </div>
              <div class="fu-row" style="flex-direction:column;align-items:stretch;gap:0.2rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span class="fu-label" style="margin-bottom:0;">Follow Up 3</span>
                  <span style="font-size:0.7rem;font-weight:700;color:#94a3b8;">Catatan Tambahan</span>
                </div>
                <input
                  type="text"
                  id="${safeDomId}_fu3"
                  class="fu-input input-uppercase"
                  style="${perm.isViewerOnly ? 'background:#f8fafc;color:#475569;border-color:#cbd5e1;cursor:not-allowed;' : ''}"
                  placeholder="Isi hasil Follow Up 3..."
                  value="${escapeHtml(grp.followUp3)}"
                  ${perm.isViewerOnly ? 'disabled="disabled"' : `onchange="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"`}
                />
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:0.35rem;">
              ${perm.isViewerOnly ? `
                <div style="font-size:0.75rem;color:#64748b;font-weight:700;padding:4px 8px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0;">
                  👁️ Mode Viewer (Perubahan Dinonaktifkan)
                </div>
              ` : `
                <button
                  type="button"
                  id="${safeDomId}_btn"
                  class="btn btn-primary btn-sm"
                  onclick="saveFollowUpGroup('${escapeHtml(saName)}', '${escapeHtml(grp.nopol)}', ${JSON.stringify(grp.rowNumbers)}, '${safeDomId}')"
                >
                  💾 Simpan Perubahan
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Menyimpan perubahan Follow Up 1, 2, dan 3, Type/No Order, Lokasi Rak/Note,
 * Status DP, Status Order, serta NEW ETA & ATA per masing-masing item part
 */
async function saveFollowUpGroup(sheetName, nopol, rowNumbers, domPrefix) {
  const perm = getUserPermissions(STATE.currentUser);
  if (perm.isViewerOnly) {
    showToast('⚠️ Mode Viewer: Akun Anda adalah viewer (hanya melihat) dan tidak dapat mengubah data.', true);
    return;
  }

  const fu1 = (document.getElementById(`${domPrefix}_fu1`).value || '').trim().toUpperCase();
  const fu2 = (document.getElementById(`${domPrefix}_fu2`).value || '').trim().toUpperCase();
  const fu3 = (document.getElementById(`${domPrefix}_fu3`).value || '').trim().toUpperCase();
  const orderNoEl = document.getElementById(`${domPrefix}_orderno`);
  const orderNoVal = orderNoEl ? (orderNoEl.value || '').trim().toUpperCase() : undefined;
  const noteEl = document.getElementById(`${domPrefix}_note`);
  const noteVal = noteEl ? (noteEl.value || '').trim().toUpperCase() : undefined;
  const dpEl = document.getElementById(`${domPrefix}_dp`);
  const dpVal = dpEl ? (dpEl.value || 'NOT FIX').trim().toUpperCase() : '';
  const statusEl = document.getElementById(`${domPrefix}_status`);
  let statusVal = statusEl ? (statusEl.value || 'NOT FIX').trim().toUpperCase() : '';
  const picEl = document.getElementById(`${domPrefix}_pic`);
  const saPic = picEl ? (picEl.value || '').trim().toUpperCase() : '';

  // Kumpulkan NEW ETA & ATA dari setiap baris item part dalam grup ini
  const itemUpdates = [];
  let hasAnyAta = false;
  rowNumbers.forEach((rNum, idx) => {
    const newEtaInput = document.getElementById(`${domPrefix}_neweta_${idx}`);
    const ataInput = document.getElementById(`${domPrefix}_ata_${idx}`);
    const newEtaVal = newEtaInput ? (newEtaInput.value || '').trim() : '';
    const ataVal = ataInput ? (ataInput.value || '').trim() : '';
    const formattedAta = ataVal ? formatDateSlash(ataVal) : '';
    if (formattedAta) {
      hasAnyAta = true;
    }

    // Tiap part yang sudah ada ATA otomatis statusnya jadi 'ARRIVAL'
    const itemStatus = formattedAta ? 'ARRIVAL' : statusVal;

    itemUpdates.push({
      rowNumber: rNum,
      newEta: newEtaVal ? formatDateSlash(newEtaVal) : '',
      ata: formattedAta,
      status: itemStatus
    });

    STATE.localFollowUpEdits[`ITEM-${sheetName}-R${rNum}`] = {
      newEta: newEtaVal ? formatDateSlash(newEtaVal) : '',
      ata: formattedAta,
      status: itemStatus
    };
  });

  // Jika ada part yang sudah ada ATA-nya, pastikan status grup/kartu adalah 'ARRIVAL'
  if (hasAnyAta && statusVal !== 'ARRIVAL') {
    statusVal = 'ARRIVAL';
    if (statusEl) statusEl.value = 'ARRIVAL';
  }

  const grp = STATE.currentRenderedGroups[domPrefix];
  const todayIso = formatDateInput(new Date());

  // Otomatis tentukan tanggal Follow Up 1 saat diisi
  let fu1DateVal = grp ? (grp.fu1Date || '') : '';
  if (fu1 && !fu1DateVal) {
    fu1DateVal = todayIso;
    if (grp) grp.fu1Date = todayIso;
  } else if (!fu1) {
    fu1DateVal = '';
    if (grp) grp.fu1Date = '';
  }

  // Otomatis tentukan tanggal Follow Up 2 saat diisi
  let fu2DateVal = grp ? (grp.fu2Date || '') : '';
  if (fu2 && !fu2DateVal) {
    fu2DateVal = todayIso;
    if (grp) grp.fu2Date = todayIso;
  } else if (!fu2) {
    fu2DateVal = '';
    if (grp) grp.fu2Date = '';
  }

  const btn = document.getElementById(`${domPrefix}_btn`);
  const origText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Menyimpan...';
  }

  // Update di memori & localStorage terlebih dahulu agar responsif seketika
  STATE.localFollowUpEdits[`${sheetName}-${nopol}`] = {
    fu1,
    fu2,
    fu3,
    fu1Date: fu1DateVal,
    fu2Date: fu2DateVal,
    orderNo: orderNoVal,
    note: noteVal,
    dp: dpVal || undefined,
    status: statusVal || undefined,
    saPic: saPic || undefined
  };
  localStorage.setItem('SOP_LOCAL_FU_EDITS', JSON.stringify(STATE.localFollowUpEdits));

  const sheetItems = STATE.monitoringBySheet[sheetName] || [];
  sheetItems.forEach((it) => {
    if (it.nopol === nopol) {
      it.followUp1 = fu1;
      it.followUp2 = fu2;
      it.followUp3 = fu3;
      it.fu1Date = fu1DateVal;
      it.fu2Date = fu2DateVal;
      if (orderNoVal !== undefined) it.orderNo = orderNoVal;
      if (noteVal !== undefined) it.note = noteVal;
      if (dpVal) it.dp = dpVal;
      if (statusVal) it.status = statusVal;
      if (saPic) it.saPic = saPic;

      const matchedUpd = itemUpdates.find((u) => Number(u.rowNumber) === Number(it.rowNumber));
      if (matchedUpd) {
        it.newEta = matchedUpd.newEta;
        it.etaBo = matchedUpd.newEta;
        it.ata = matchedUpd.ata;
        if (matchedUpd.status) {
          it.status = matchedUpd.status;
        }
      }
    }
  });

  try {
    if (STATE.apiUrl) {
      const response = await fetch(STATE.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateFollowUp',
          sheetName: sheetName,
          nopol: nopol,
          rowNumber: rowNumbers[0],
          rowNumbers: rowNumbers,
          followUp1: fu1,
          followUp2: fu2,
          followUp3: fu3,
          fu1Date: fu1DateVal,
          fu2Date: fu2DateVal,
          orderNo: orderNoVal,
          note: noteVal,
          dp: dpVal || undefined,
          status: statusVal || undefined,
          saPic: saPic || undefined,
          itemUpdates: itemUpdates
        })
      });
      const resJson = await response.json();
      if (resJson && resJson.status === 'ok') {
        showToast(`✅ Perubahan data (${nopol}) berhasil disimpan ke Sheet ${sheetName}!`);
      } else {
        throw new Error((resJson && resJson.message) || 'Gagal update ke Spreadsheet');
      }
    } else {
      showToast(`✅ Perubahan data untuk ${nopol} berhasil disimpan!`);
    }
  } catch (err) {
    showToast(`✅ Tersimpan di perangkat. Pastikan kode WebAppAPI.gs terbaru sudah di-Deploy.`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
    const orderNoSpan = document.getElementById(`${domPrefix}_header_orderno`);
    if (orderNoSpan) {
      orderNoSpan.innerHTML = orderNoVal ? ` • No. Order: <strong style="color:#ffffff;">${escapeHtml(orderNoVal)}</strong>` : '';
    }
    const fu1Lbl = document.getElementById(`${domPrefix}_fu1_date_lbl`);
    if (fu1Lbl) {
      fu1Lbl.textContent = fu1DateVal ? `📅 ${formatShortDayMonth(fu1DateVal)}` : '📅 Otomatis saat diisi';
      fu1Lbl.style.color = fu1DateVal ? '#0369a1' : '#94a3b8';
    }
    const fu2Lbl = document.getElementById(`${domPrefix}_fu2_date_lbl`);
    if (fu2Lbl) {
      fu2Lbl.textContent = fu2DateVal ? `📅 ${formatShortDayMonth(fu2DateVal)}` : '📅 Otomatis saat diisi';
      fu2Lbl.style.color = fu2DateVal ? '#0369a1' : '#94a3b8';
    }
    updateSaTabBadges();
    checkAndShowFu2ReminderPopup(false);
  }
}

/**
 * Memindahkan 1 grup No. Polisi beserta seluruh item part-nya ke Sheet 'JOB DONE'
 * sekaligus menghapusnya dari menu Monitoring SOP & Sheet SA terkait.
 */
async function markOrderJobDone(domPrefix) {
  const perm = getUserPermissions(STATE.currentUser);
  if (perm.isViewerOnly) {
    showToast('⚠️ Mode Viewer: Akun Anda adalah viewer dan tidak memiliki izin untuk menandai Job Done.', true);
    return;
  }

  const grp = STATE.currentRenderedGroups && STATE.currentRenderedGroups[domPrefix];
  if (!grp) return;

  const sheetName = grp.sheetName;
  const nopol = grp.nopol;
  const itemCount = grp.items ? grp.items.length : 1;

  const confirmed = window.confirm(
    `Apakah pekerjaan untuk No. Polisi ${nopol} (${itemCount} item part) sudah selesai (JOB DONE)?\n\n` +
    `• Seluruh item part akan dipindahkan ke Sheet 'JOB DONE'\n` +
    `• Data ${nopol} akan dihapus dari Monitoring SOP (Sheet ${sheetName})`
  );
  if (!confirmed) return;

  // Ambil nilai terbaru yang sedang tampil di kartu (Follow Up, Status DP, Status Order, PIC, NEW ETA, ATA)
  const fu1El = document.getElementById(`${domPrefix}_fu1`);
  const fu2El = document.getElementById(`${domPrefix}_fu2`);
  const fu3El = document.getElementById(`${domPrefix}_fu3`);
  const dpEl = document.getElementById(`${domPrefix}_dp`);
  const statusEl = document.getElementById(`${domPrefix}_status`);
  const picEl = document.getElementById(`${domPrefix}_pic`);

  const latestFu1 = fu1El ? (fu1El.value || '').trim().toUpperCase() : (grp.followUp1 || '');
  const latestFu2 = fu2El ? (fu2El.value || '').trim().toUpperCase() : (grp.followUp2 || '');
  const latestFu3 = fu3El ? (fu3El.value || '').trim().toUpperCase() : (grp.followUp3 || '');
  const latestDp = dpEl ? (dpEl.value || '').trim().toUpperCase() : (grp.dp || 'NOT FIX');
  const latestStatus = statusEl ? (statusEl.value || '').trim().toUpperCase() : (grp.status || 'ARRIVAL');
  const latestPic = picEl && picEl.value.trim() ? picEl.value.trim().toUpperCase() : (grp.saPic || sheetName);

  const updatedItems = (grp.items || []).map((it, idx) => {
    const newEtaInput = document.getElementById(`${domPrefix}_neweta_${idx}`);
    const ataInput = document.getElementById(`${domPrefix}_ata_${idx}`);
    const newEtaVal = newEtaInput && newEtaInput.value ? formatDateSlash(newEtaInput.value) : (it.newEta || it.etaBo || '');
    const ataVal = ataInput && ataInput.value ? formatDateSlash(ataInput.value) : (it.ata || '');
    return Object.assign({}, it, {
      newEta: newEtaVal,
      etaBo: newEtaVal,
      ata: ataVal,
      dp: latestDp,
      followUp1: latestFu1,
      followUp2: latestFu2,
      followUp3: latestFu3,
      status: latestStatus,
      saPic: latestPic
    });
  });

  const btn = document.getElementById(`${domPrefix}_jobdone_btn`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Memindahkan ke JOB DONE...';
  }

  try {
    if (STATE.apiUrl) {
      const response = await fetch(STATE.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'moveOrderToJobDone',
          sheetName: sheetName,
          nopol: nopol,
          rowNumbers: grp.rowNumbers || [],
          orderData: {
            nopol: nopol,
            orderDate: grp.orderDate || '',
            orderNo: grp.orderNo || '',
            eta: grp.eta || '',
            ata: grp.ata || '',
            note: grp.note || '',
            dp: latestDp,
            followUp1: latestFu1,
            followUp2: latestFu2,
            followUp3: latestFu3,
            status: latestStatus,
            saPic: latestPic,
            items: updatedItems
          }
        })
      });
      const resJson = await response.json();
      if (resJson && resJson.status === 'ok') {
        showToast(`✅ ${resJson.message}`);
      } else {
        throw new Error((resJson && resJson.message) || 'Gagal memindahkan ke Sheet JOB DONE');
      }
    } else {
      showToast(`✅ Order ${nopol} dipindahkan ke JOB DONE & dihapus dari Monitoring ${sheetName}!`);
    }
  } catch (err) {
    showToast(`✅ Order ${nopol} dihapus dari Monitoring. Pastikan kode WebAppAPI.gs terbaru sudah di-Deploy agar otomatis masuk ke Sheet JOB DONE.`);
  }

  // Tandai selesai & langsung hapus dari daftar Monitoring SOP di layar
  const doneKey = `${sheetName}::${nopol.toUpperCase()}`;
  if (!STATE.completedJobs) STATE.completedJobs = {};
  STATE.completedJobs[doneKey] = {
    completedAt: new Date().toISOString(),
    nopol: nopol,
    sheetName: sheetName
  };
  localStorage.setItem('SOP_COMPLETED_JOBS', JSON.stringify(STATE.completedJobs));

  if (Array.isArray(STATE.monitoringBySheet[sheetName])) {
    STATE.monitoringBySheet[sheetName] = STATE.monitoringBySheet[sheetName].filter(
      (it) => String(it.nopol || '').trim().toUpperCase() !== nopol.toUpperCase()
    );
  }
  if (Array.isArray(STATE.localSubmittedOrders)) {
    STATE.localSubmittedOrders = STATE.localSubmittedOrders.filter(
      (it) => !(it.sheetName === sheetName && String(it.nopol || '').trim().toUpperCase() === nopol.toUpperCase())
    );
    localStorage.setItem('SOP_LOCAL_ORDERS', JSON.stringify(STATE.localSubmittedOrders));
  }

  updateSaTabBadges();
  renderMonitoringList();
}

/**
 * Menghapus pesanan jika batal order langsung dari kartu No Pol
 * sekaligus menghapus baris-barisnya dari Google Spreadsheet
 */
async function cancelAndDeleteOrder(domPrefixOrSheetName, explicitNopol, explicitRowNumbers) {
  const perm = getUserPermissions(STATE.currentUser);
  if (perm.isViewerOnly) {
    showToast('⚠️ Mode Viewer: Akun Anda adalah viewer dan tidak memiliki izin untuk menghapus data order.', true);
    return;
  }

  let sheetName = '';
  let nopol = '';
  let rowNumbers = [];
  let domPrefix = '';

  if (typeof domPrefixOrSheetName === 'string' && STATE.currentRenderedGroups && STATE.currentRenderedGroups[domPrefixOrSheetName]) {
    domPrefix = domPrefixOrSheetName;
    const grp = STATE.currentRenderedGroups[domPrefix];
    sheetName = grp.sheetName || '';
    nopol = grp.nopol || '';
    rowNumbers = grp.rowNumbers || [];
  } else {
    sheetName = domPrefixOrSheetName || '';
    nopol = explicitNopol || '';
    rowNumbers = explicitRowNumbers || [];
  }

  if (!nopol || !sheetName) {
    showToast('⚠️ Data pesanan tidak ditemukan.', true);
    return;
  }

  const ok = window.confirm(
    `Apakah Anda yakin ingin MENGHAPUS pesanan No. Polisi ${nopol} (Sheet ${sheetName})?\n\n` +
    `• Data pesanan dan seluruh part untuk ${nopol} akan dihapus permanen dari aplikasi dan Google Spreadsheet.\n` +
    `• Gunakan fitur ini jika pelanggan batal melakukan order.`
  );
  if (!ok) return;

  if (domPrefix) {
    const btn = document.getElementById(`${domPrefix}_delete_btn`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Menghapus...';
    }
    const cardEl = document.getElementById(`card_${domPrefix}`);
    if (cardEl) {
      cardEl.style.transition = 'all 0.3s ease';
      cardEl.style.opacity = '0.3';
      cardEl.style.transform = 'scale(0.98)';
    }
  }

  // 1. Catat ke completedJobs / deleted lokal agar tidak muncul lagi
  const doneKey = `${sheetName}::${nopol.toUpperCase()}`;
  if (!STATE.completedJobs) STATE.completedJobs = {};
  STATE.completedJobs[doneKey] = {
    nopol: nopol,
    sheetName: sheetName,
    deletedAt: new Date().toISOString()
  };
  localStorage.setItem('SOP_COMPLETED_JOBS', JSON.stringify(STATE.completedJobs));

  // 2. Hapus dari STATE.monitoringBySheet
  if (Array.isArray(STATE.monitoringBySheet[sheetName])) {
    STATE.monitoringBySheet[sheetName] = STATE.monitoringBySheet[sheetName].filter(
      (it) => String(it.nopol || '').trim().toUpperCase() !== nopol.toUpperCase()
    );
  }

  // 3. Hapus dari local submitted orders jika ada
  if (Array.isArray(STATE.localSubmittedOrders)) {
    STATE.localSubmittedOrders = STATE.localSubmittedOrders.filter(
      (it) => !(it.sheetName === sheetName && String(it.nopol || '').trim().toUpperCase() === nopol.toUpperCase())
    );
    localStorage.setItem('SOP_LOCAL_ORDERS', JSON.stringify(STATE.localSubmittedOrders));
  }

  // 4. Bersihkan edit follow up lokal jika ada
  if (STATE.localFollowUpEdits && typeof STATE.localFollowUpEdits === 'object') {
    Object.keys(STATE.localFollowUpEdits).forEach((key) => {
      if (key.includes(nopol.toUpperCase()) || key.startsWith(`${sheetName}__${nopol}`) || key.startsWith(`${sheetName}::${nopol}`)) {
        delete STATE.localFollowUpEdits[key];
      }
    });
  }

  // 5. Kirim perintah hapus ke WebAppAPI.gs
  try {
    if (STATE.apiUrl) {
      const resp = await fetch(STATE.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteCancelledOrder',
          sheetName: sheetName,
          nopol: nopol,
          rowNumbers: Array.isArray(rowNumbers) ? rowNumbers : []
        })
      });
      const resJson = await resp.json().catch(() => null);
      if (resJson && resJson.status === 'ok') {
        showToast(`🗑 ${resJson.message || `Pesanan ${nopol} berhasil dihapus dari Spreadsheet.`}`);
      } else {
        showToast(`🗑 Pesanan ${nopol} berhasil dihapus dari Monitoring SOP.`);
      }
    } else {
      showToast(`🗑 Pesanan ${nopol} berhasil dihapus dari Monitoring SOP.`);
    }
  } catch (err) {
    console.error('Error deleting cancelled order:', err);
    showToast(`🗑 Pesanan ${nopol} telah dihapus dari aplikasi.`);
  } finally {
    updateSaTabBadges();
    renderMonitoringList();
    if (typeof checkAndShowNotFixPopup === 'function') checkAndShowNotFixPopup(false);
    if (typeof checkAndShowFu2ReminderPopup === 'function') checkAndShowFu2ReminderPopup(false);
  }
}

/**
 * Cetak ulang SOP Lembar 1 & 2 langsung dari kartu Monitoring SA
 */
function printOrderFromMonitoring(grp) {
  const printData = {
    nopol: grp.nopol,
    sa: grp.sheetName,
    picOther: grp.sheetName === 'OTHER' ? grp.saPic : '',
    saDisplay: grp.saPic || grp.sheetName,
    orderDate: grp.orderDate,
    eta: grp.eta,
    customerName: '',
    phone: '',
    address: '',
    orderNo: grp.orderNo,
    dpStatus: grp.dp || 'LUNAS',
    lokasiNote: grp.note || '',
    formNote: '',
    fu1: grp.followUp1 || '',
    fu2: grp.followUp2 || '',
    fu3: grp.followUp3 || '',
    items: grp.items.map((it) => ({
      partNo: it.partNo,
      partName: it.partName,
      qty: it.qty,
      price: it.price
    }))
  };

  // 1. Cek terlebih dahulu dari cache pelanggan lokal (tersimpan seketika saat diinput di form order)
  const cleanGrpNopol = String(grp.nopol || '').trim().toUpperCase();
  const normalizedGrp = cleanGrpNopol.replace(/[^A-Z0-9]/g, '');

  if (!Array.isArray(STATE.localRawCustomers)) {
    try {
      STATE.localRawCustomers = JSON.parse(localStorage.getItem('SOP_LOCAL_RAW_CUSTOMERS') || '[]');
    } catch (e) {
      STATE.localRawCustomers = [];
    }
  }

  const localMatch = STATE.localRawCustomers.find((c) => {
    if (!c || !c.nopol) return false;
    const cClean = String(c.nopol).trim().toUpperCase();
    return cClean === cleanGrpNopol || cClean.replace(/[^A-Z0-9]/g, '') === normalizedGrp;
  });

  if (localMatch) {
    if (localMatch.customerName) printData.customerName = localMatch.customerName;
    if (localMatch.phone) printData.phone = formatPhoneDisplay(localMatch.phone);
    if (localMatch.address) printData.address = localMatch.address;
  }

  // Jika data pelanggan sudah lengkap dari cache lokal, langsung cetak tanpa delay jaringan
  if (printData.customerName && (printData.phone || printData.address)) {
    const printSection = document.getElementById('printOnlySection');
    printSection.innerHTML = buildSopLembar1Html(printData, true) + buildSopLembar2Html(printData);
    window.print();
    return;
  }

  // 2. Jika belum lengkap di lokal, cari data Nama Customer, Telp, Alamat dari Sheet RAW
  const formSheetId = window.SOP_CONFIG.SPREADSHEET_FORM_ID;
  const safeNopol = cleanGrpNopol.replace(/'/g, '');
  const tqQuery = `SELECT A, B, C, D WHERE upper(A) CONTAINS '${safeNopol}' LIMIT 5`;

  fetchGvizSheet(formSheetId, 'RAW', tqQuery)
    .then((rows) => {
      if (rows && rows.length > 0) {
        // Cari yang paling cocok
        const matchedRow = rows.find((r) => {
          const rNopol = String(r[0] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          return rNopol === normalizedGrp;
        }) || rows[0];

        if (matchedRow) {
          if (!printData.customerName && matchedRow[1]) printData.customerName = String(matchedRow[1]).trim();
          if (!printData.phone && matchedRow[2]) printData.phone = formatPhoneDisplay(matchedRow[2]);
          if (!printData.address && matchedRow[3]) printData.address = String(matchedRow[3]).trim();
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      const printSection = document.getElementById('printOnlySection');
      printSection.innerHTML = buildSopLembar1Html(printData, true) + buildSopLembar2Html(printData);
      window.print();
    });
}

/**
 * ============================================================================
 * HELPER GOOGLE SHEETS JSONP READER (MEMBACA LIVE TANPA KENDALA CORS)
 * ============================================================================
 */
function fetchGvizSheet(spreadsheetId, sheetName, tqQuery) {
  return new Promise((resolve, reject) => {
    const cbName = 'gvizCb_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    const script = document.createElement('script');
    let timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout membaca Google Spreadsheet'));
    }, 10000);

    function cleanup() {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
    }

    window[cbName] = function(response) {
      cleanup();
      if (!response || response.status === 'error' || !response.table) {
        reject(new Error('Gagal membaca tabel Google Sheets'));
        return;
      }
      const rows = (response.table.rows || []).map((r) =>
        (r.c || []).map((cell) => {
          if (!cell) return '';
          if (cell.f !== undefined && cell.f !== null) return String(cell.f);
          if (cell.v !== undefined && cell.v !== null) return String(cell.v);
          return '';
        })
      );
      resolve(rows);
    };

    const tqParam = tqQuery ? `&tq=${encodeURIComponent(tqQuery)}` : '';
    script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}${tqParam}&tqx=responseHandler:${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Network error saat menghubungi Google Sheets'));
    };
    document.body.appendChild(script);
  });
}

/**
 * Modal Pengaturan API
 */
function openApiModal() {
  const perm = getUserPermissions(STATE.currentUser);
  if (!perm.canScriptApi) {
    showToast('⚠️ Akses terbatas: Hanya Admin yang dapat membuka konfigurasi Script API.', true);
    return;
  }
  document.getElementById('inputApiUrl').value = STATE.apiUrl || '';
  document.getElementById('apiSetupModal').classList.remove('hidden');
}

function closeApiModal() {
  document.getElementById('apiSetupModal').classList.add('hidden');
}

function saveApiUrlFromModal() {
  const url = (document.getElementById('inputApiUrl').value || '').trim();
  STATE.apiUrl = url;
  localStorage.setItem('SOP_APPS_SCRIPT_URL', url);
  updateSyncBadge();
  closeApiModal();
  if (url) {
    showToast('✅ URL Google Apps Script API berhasil disimpan! Menyinkronkan data...');
    fetchAllMonitoringSheets(false);
  } else {
    showToast('URL API dikosongkan. Aplikasi berjalan dalam mode pembacaan langsung.');
  }
}

function updateSyncBadge(customText) {
  const dot = document.getElementById('syncDot');
  const txt = document.getElementById('syncText');
  if (!dot || !txt) return;

  if (customText) {
    txt.textContent = customText;
    return;
  }

  if (STATE.apiUrl) {
    dot.className = 'sync-dot';
    txt.textContent = 'Live Read/Write API Aktif';
  } else {
    dot.className = 'sync-dot';
    txt.textContent = 'Live Read Google Sheets Aktif';
  }
}

/**
 * Utilitas Format Tanggal, Rupiah, & Toast
 */
function formatDateInput(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateSlash(dateStr) {
  if (!dateStr) return '-';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function toDateInputFormat(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = parseFlexibleDateToObj(s);
  if (parsed) {
    return formatDateInput(parsed);
  }
  return '';
}

function openShortDatePicker(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch (e) {}
  }
  input.focus();
}

function onShortDateInputChanged(inputEl, labelId, activeColor, domPrefix, isAta, sheetName, nopol, rowNumbers) {
  const lbl = document.getElementById(labelId);
  if (!lbl || !inputEl) return;
  const val = (inputEl.value || '').trim();
  if (val) {
    lbl.textContent = formatShortDayMonth(val);
    lbl.style.color = activeColor || '#0f172a';

    // Jika input ATA diisi, otomatis alihkan dropdown Status Order ke 'ARRIVAL'
    if (isAta && domPrefix) {
      const statusEl = document.getElementById(`${domPrefix}_status`);
      if (statusEl && statusEl.value !== 'ARRIVAL') {
        statusEl.value = 'ARRIVAL';
        statusEl.style.transition = 'all 0.3s ease';
        statusEl.style.borderColor = '#16a34a';
        statusEl.style.boxShadow = '0 0 0 3px rgba(22, 163, 74, 0.25)';
        setTimeout(() => {
          if (statusEl) {
            statusEl.style.borderColor = '';
            statusEl.style.boxShadow = '';
          }
        }, 1500);
      }
    }
  } else {
    lbl.textContent = '- Pilih -';
    lbl.style.color = '#94a3b8';
  }

  // Otomatis simpan perubahan seketika ke Google Spreadsheet
  if (sheetName && nopol && Array.isArray(rowNumbers) && rowNumbers.length > 0 && domPrefix) {
    saveFollowUpGroup(sheetName, nopol, rowNumbers, domPrefix);
  }
}

function formatRupiah(num) {
  const n = Math.round(Number(num) || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatRupiahPlain(num) {
  const n = Math.round(Number(num) || 0);
  return n.toLocaleString('id-ID');
}

function formatPhoneDisplay(val) {
  if (!val) return '';
  let s = String(val).trim();
  if (s.includes('E') || s.includes('e')) {
    const num = Number(s);
    if (!isNaN(num)) s = String(Math.round(num));
  }
  return s;
}

function escapeHtml(str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 4200);
}

/**
 * ============================================================================
 * MANAJEMEN DINAMIS EMAIL SA & JADWAL REMINDER H+7 (TANPA UBAH SCRIPT)
 * ============================================================================
 */
async function fetchEmailSettingsFromServer(showNotif) {
  if (!STATE.apiUrl) {
    renderSaEmailsTable();
    return;
  }

  try {
    const res = await fetch(`${STATE.apiUrl}?action=getEmailSettings`);
    const data = await res.json();
    if (data && data.status === 'ok' && data.emailConfig) {
      STATE.emailConfig = data.emailConfig;
      localStorage.setItem('SOP_EMAIL_CONFIG', JSON.stringify(STATE.emailConfig));

      const badge = document.getElementById('triggerStatusBadge');
      if (badge) {
        badge.textContent = data.triggerActive
          ? `Jadwal H+${STATE.emailConfig.reminderDays || 7}: Aktif Otomatis`
          : `Jadwal H+${STATE.emailConfig.reminderDays || 7}: Siap Diaktifkan`;
      }
      renderSaEmailsTable();
      if (showNotif) showToast('✓ Daftar alamat email SA berhasil dimuat dari server.');
    }
  } catch (err) {
    renderSaEmailsTable();
  }
}

function renderSaEmailsTable() {
  const tbody = document.getElementById('saEmailsTbody');
  if (!tbody) return;

  const senderInput = document.getElementById('inputSenderEmail');
  const kabengInput = document.getElementById('inputKabengEmail');
  const daysInput = document.getElementById('inputReminderDays');
  const hourSelect = document.getElementById('selectReminderHour');
  const appUrlInput = document.getElementById('inputAppUrlForEmail');

  if (senderInput) senderInput.value = STATE.emailConfig.senderEmail || 'febrifajar69@gmail.com';
  if (kabengInput) kabengInput.value = STATE.emailConfig.kabengEmail || 'andicka.nengah@gmail.com';
  if (daysInput) daysInput.value = STATE.emailConfig.reminderDays || 7;
  if (hourSelect) hourSelect.value = String(STATE.emailConfig.sendHourWita !== undefined ? STATE.emailConfig.sendHourWita : 8);
  if (appUrlInput) {
    appUrlInput.value = STATE.emailConfig.appUrl || (window.location.origin.startsWith('http') ? window.location.origin : '');
  }

  const list = STATE.emailConfig.saEmails || [];

  tbody.innerHTML = list.map((item, idx) => {
    const isCoreSheet = ['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'].includes((item.code || '').toUpperCase());
    return `
      <tr>
        <td>
          <input
            type="text"
            class="input input-uppercase"
            value="${escapeHtml(item.code)}"
            ${isCoreSheet ? 'readonly title="Kode Sheet Utama"' : 'placeholder="Misal: PONI / MRA"'}
            oninput="updateSaEmailField(${idx}, 'code', this.value)"
          />
        </td>
        <td>
          <input
            type="text"
            class="input"
            placeholder="Nama SA (Bisa diganti kapan saja)"
            value="${escapeHtml(item.name || '')}"
            oninput="updateSaEmailField(${idx}, 'name', this.value)"
          />
        </td>
        <td>
          <input
            type="email"
            class="input"
            placeholder="contoh.sa@gmail.com"
            value="${escapeHtml(item.email || '')}"
            oninput="updateSaEmailField(${idx}, 'email', this.value)"
          />
        </td>
        <td style="text-align:center;">
          <input
            type="checkbox"
            style="width:18px;height:18px;cursor:pointer;"
            ${item.active !== false ? 'checked' : ''}
            onchange="updateSaEmailField(${idx}, 'active', this.checked)"
          />
        </td>
        <td style="text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:0.35rem;">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              onclick="sendTestEmailRow(${idx})"
              title="Kirim email percobaan ke SA + CC Kepala Bengkel"
            >
              📨 Test
            </button>
            ${!isCoreSheet ? `
              <button
                type="button"
                class="btn btn-danger-ghost"
                onclick="removeSaEmailRow(${idx})"
                title="Hapus baris PIC ini"
              >
                🗑
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateSaEmailField(index, field, value) {
  if (!STATE.emailConfig.saEmails[index]) return;
  if (field === 'code') {
    STATE.emailConfig.saEmails[index].code = String(value || '').trim().toUpperCase();
  } else if (field === 'active') {
    STATE.emailConfig.saEmails[index].active = Boolean(value);
  } else {
    STATE.emailConfig.saEmails[index][field] = String(value || '').trim();
  }
}

function addSaEmailRow() {
  STATE.emailConfig.saEmails.push({
    code: '',
    name: '',
    email: '',
    active: true,
    isMain: false
  });
  renderSaEmailsTable();
}

function removeSaEmailRow(index) {
  const item = STATE.emailConfig.saEmails[index];
  if (!item) return;
  if (['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'].includes((item.code || '').toUpperCase())) {
    showToast('Kode Sheet utama (AJS, AYU, FIK, WBN, OTHER) tidak dapat dihapus, cukup ganti alamat emailnya.', true);
    return;
  }
  STATE.emailConfig.saEmails.splice(index, 1);
  renderSaEmailsTable();
}

async function saveEmailSettingsToServer() {
  const senderInput = document.getElementById('inputSenderEmail');
  const kabengInput = document.getElementById('inputKabengEmail');
  const daysInput = document.getElementById('inputReminderDays');
  const hourSelect = document.getElementById('selectReminderHour');
  const appUrlInput = document.getElementById('inputAppUrlForEmail');

  STATE.emailConfig.senderEmail = (senderInput ? senderInput.value : 'febrifajar69@gmail.com').trim();
  STATE.emailConfig.kabengEmail = (kabengInput ? kabengInput.value : 'andicka.nengah@gmail.com').trim();
  STATE.emailConfig.reminderDays = Number(daysInput ? daysInput.value : 7) || 7;
  STATE.emailConfig.sendHourWita = Number(hourSelect ? hourSelect.value : 8);
  STATE.emailConfig.appUrl = (appUrlInput ? appUrlInput.value : '').trim();

  localStorage.setItem('SOP_EMAIL_CONFIG', JSON.stringify(STATE.emailConfig));

  const btn = document.getElementById('btnSaveEmailConfig');
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Menyimpan ke Server...';

  try {
    if (!STATE.apiUrl) {
      showToast('Tersimpan secara lokal. Pastikan URL WebAppAPI sudah terpasang.', true);
      return;
    }

    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveEmailSettings',
        emailConfig: STATE.emailConfig,
        enableAutoTrigger: true
      })
    });
    const resJson = await res.json();
    if (resJson && resJson.status === 'ok') {
      showToast(`✅ ${resJson.message}`);
      const badge = document.getElementById('triggerStatusBadge');
      if (badge) {
        badge.textContent = `Jadwal H+${STATE.emailConfig.reminderDays}: Aktif Otomatis`;
      }
    } else {
      throw new Error((resJson && resJson.message) || 'Gagal menyimpan pengaturan email');
    }
  } catch (err) {
    showToast('✅ Tersimpan di perangkat. Pastikan kode WebAppAPI.gs terbaru sudah di-Deploy di Google Apps Script.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
    }
}

async function sendTestEmailRow(index) {
  const entry = STATE.emailConfig.saEmails[index];
  if (!entry || !entry.email || !entry.email.includes('@')) {
    showToast('Mohon isi alamat email yang valid terlebih dahulu pada baris tersebut.', true);
    return;
  }
  if (!STATE.apiUrl) {
    showToast('Pasang URL WebAppAPI terlebih dahulu untuk mengirim email.', true);
    return;
  }

  showToast(`⏳ Mengirim test email ke ${entry.email} (+ CC Kepala Bengkel)...`);
  try {
    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sendTestEmail',
        targetSa: entry.code || 'SA',
        targetName: entry.name || entry.code || 'Service Advisor',
        targetEmail: entry.email
      })
    });
    const resJson = await res.json();
    if (resJson && resJson.status === 'ok') {
      showToast(`✅ ${resJson.message}`);
    } else {
      showToast(`❌ Gagal kirim email: ${(resJson && resJson.message) || 'Periksa izin MailApp di Apps Script'}`, true);
    }
  } catch (err) {
    showToast('❌ Pastikan Anda sudah memperbarui kode WebAppAPI.gs dan mengklik Authorize untuk izin pengiriman Email.', true);
  }
}

async function triggerReminderCheckNow() {
  if (!STATE.apiUrl) {
    showToast('URL WebAppAPI belum terpasang.', true);
    return;
  }
  const btn = document.getElementById('btnRunReminderNow');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Mengecek H+7 & Mengirim Email...';

  try {
    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'runReminderNow' })
    });
    const resJson = await res.json();
    if (resJson && resJson.status === 'ok') {
      showToast(`✅ ${resJson.message}`);
    } else {
      showToast(`❌ ${(resJson && resJson.message) || 'Gagal menjalankan pengecekan reminder.'}`, true);
    }
  } catch (err) {
    showToast('Pastikan kode terbaru WebAppAPI.gs sudah di-Deploy.', true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

/**
 * ============================================================================
 * POP-UP PERINGATAN OTOMATIS H+7 UNTUK STATUS ORDER "NOT FIX"
 * ============================================================================
 */
let HAS_SHOWN_NOTFIX_POPUP_SESSION = false;

function getOverdueNotFixGroups() {
  const overdueList = [];
  const sheets = (window.SOP_CONFIG && window.SOP_CONFIG.SA_SHEETS) || ['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'];

  sheets.forEach((sa) => {
    const rawItems = STATE.monitoringBySheet[sa] || [];
    const groups = groupMonitoringItemsByOrder(rawItems);
    groups.forEach((grp) => {
      const normStatus = String(grp.status || 'NOT FIX').trim().toUpperCase();
      if (normStatus === 'NOT FIX' && grp.orderAgeDays >= 7) {
        overdueList.push(grp);
      }
    });
  });

  // Urutkan dari yang paling lama menggantung (H+ terbesar di paling atas)
  overdueList.sort((a, b) => b.orderAgeDays - a.orderAgeDays);
  return overdueList;
}

function checkAndShowNotFixPopup(forceOpen) {
  const overdueList = getOverdueNotFixGroups();
  const topBtn = document.getElementById('btnOpenNotFixModal');
  const countEl = document.getElementById('notFixAlertCount');

  if (countEl) countEl.textContent = String(overdueList.length);
  if (topBtn) {
    topBtn.classList.toggle('hidden', overdueList.length === 0);
  }

  if (overdueList.length === 0) {
    const modal = document.getElementById('notFixReminderModal');
    if (modal) modal.classList.add('hidden');
    return;
  }

  const todayKey = formatDateInput(new Date());
  const snoozedDate = localStorage.getItem('SOP_NOTFIX_SNOOZE_DATE') || '';

  if (forceOpen || (!HAS_SHOWN_NOTFIX_POPUP_SESSION && snoozedDate !== todayKey)) {
    HAS_SHOWN_NOTFIX_POPUP_SESSION = true;
    openNotFixPopup(true);
  }
}

function openNotFixPopup(forceRender) {
  const overdueList = getOverdueNotFixGroups();
  const modal = document.getElementById('notFixReminderModal');
  const listEl = document.getElementById('notFixModalList');
  const subEl = document.getElementById('notFixModalSubtitle');
  if (!modal || !listEl) return;

  if (overdueList.length === 0) {
    modal.classList.add('hidden');
    if (forceRender) {
      showToast('✅ Tidak ada order berstatus NOT FIX yang melewati H+7 hari.');
    }
    return;
  }

  if (subEl) {
    subEl.innerHTML = `Terdapat <strong>${overdueList.length} No. Polisi</strong> yang sudah <strong>&ge; 7 hari (H+7)</strong> sejak diinput ke Monitoring SOP namun masih berstatus <strong>NOT FIX</strong>:`;
  }

  listEl.innerHTML = overdueList.map((grp, idx) => {
    const partSummary = grp.items
      .slice(0, 3)
      .map((it) => `${escapeHtml(it.partName)} (${it.qty}x)`)
      .join(', ') + (grp.items.length > 3 ? ` +${grp.items.length - 3} lainnya` : '');

    const safeSa = escapeHtml(grp.sheetName);
    const safeNopol = escapeHtml(grp.nopol);
    const rowNumsJson = JSON.stringify(grp.rowNumbers || []);

    return `
      <div style="background:#ffffff;border:1.5px solid #d4d4d8;border-left:5px solid #e60012;border-radius:10px;padding:0.9rem 1.05rem;box-shadow:0 3px 10px rgba(9,9,11,0.06);display:flex;flex-direction:column;gap:0.55rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <div style="display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;">
            <span style="font-size:0.78rem;font-weight:900;color:#71717a;">#${idx + 1}</span>
            <span class="nopol-badge" style="font-size:0.88rem;padding:0.25rem 0.65rem;">${safeNopol}</span>
            <span style="font-size:0.75rem;font-weight:800;padding:0.22rem 0.55rem;border-radius:6px;background:#18181b;color:#ffffff;">
              Sheet ${safeSa} (SA/PIC: ${escapeHtml(grp.saPic || grp.sheetName)})
            </span>
            <span style="font-size:0.75rem;font-weight:800;padding:0.22rem 0.55rem;border-radius:6px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">
              ⏰ Tgl Input: ${escapeHtml(grp.orderDate || '-')} (Sudah H+${grp.orderAgeDays} Hari)
            </span>
          </div>
          <div style="font-size:0.82rem;font-weight:800;color:#09090b;">
            ${grp.items.length} Item &bull; <span style="color:#e60012;">${formatRupiah(grp.grandTotal)}</span>
          </div>
        </div>

        <div style="font-size:0.79rem;color:#3f3f46;background:#f8fafc;padding:0.45rem 0.65rem;border-radius:6px;border:1px solid #e4e4e7;">
          <strong>Item Part:</strong> ${partSummary}
          ${grp.followUp1 ? `<br/><strong>Follow Up Terakhir:</strong> ${escapeHtml(grp.followUp1)}` : ''}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-top:0.15rem;">
          <div style="font-size:0.74rem;color:#52525b;font-weight:600;">
            Status DP: <strong style="color:#09090b;">${escapeHtml(grp.dp || 'NOT FIX')}</strong> &bull;
            Status Order: <strong style="color:#dc2626;">NOT FIX</strong>
          </div>
          <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
            <button
              type="button"
              class="btn btn-success btn-sm"
              onclick='quickProceedNotFixOrder("${safeSa}", "${safeNopol}", ${rowNumsJson})'
              title="Ubah Status Order menjadi IN PROCESS karena customer jadi memesan"
            >
              ✅ Lanjut Order (IN PROCESS)
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick='jumpToNotFixCard("${safeSa}", "${safeNopol}")'
              title="Buka kartu No. Polisi ini di menu Monitoring SOP"
            >
              🔎 Lihat Kartu
            </button>
            <button
              type="button"
              class="btn btn-outline btn-sm"
              style="color:#dc2626;border-color:#fecaca;"
              onclick='quickCancelNotFixOrder("${safeSa}", "${safeNopol}", ${rowNumsJson})'
              title="Hapus dari Monitoring SOP jika customer batal order"
            >
              🗑 Batal / Hapus
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function closeNotFixPopup(snoozeForToday) {
  const modal = document.getElementById('notFixReminderModal');
  if (modal) modal.classList.add('hidden');
  if (snoozeForToday) {
    localStorage.setItem('SOP_NOTFIX_SNOOZE_DATE', formatDateInput(new Date()));
    showToast('🔕 Pengingat Pop-Up NOT FIX H+7 dijeda hingga besok.');
  }
}

async function quickProceedNotFixOrder(sheetName, nopol, rowNumbers) {
  // Update di memori lokal & localStorage menjadi IN PROCESS
  const editKey = `${sheetName}-${nopol}`;
  const prevEdit = STATE.localFollowUpEdits[editKey] || {};
  STATE.localFollowUpEdits[editKey] = {
    ...prevEdit,
    status: 'IN PROCESS'
  };
  localStorage.setItem('SOP_LOCAL_FU_EDITS', JSON.stringify(STATE.localFollowUpEdits));

  const list = STATE.monitoringBySheet[sheetName] || [];
  list.forEach((it) => {
    if (it.nopol === nopol) {
      it.status = 'IN PROCESS';
    }
  });

  renderMonitoringList();
  openNotFixPopup(false);
  checkAndShowNotFixPopup(false);
  showToast(`✅ Status Order ${nopol} (Sheet ${sheetName}) diubah menjadi IN PROCESS!`);

  if (STATE.apiUrl && Array.isArray(rowNumbers) && rowNumbers.length > 0) {
    try {
      await fetch(STATE.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateFollowUp',
          sheetName: sheetName,
          rowNumber: rowNumbers[0],
          rowNumbers: rowNumbers,
          status: 'IN PROCESS'
        })
      });
    } catch (e) {}
  }
}

function jumpToNotFixCard(sheetName, nopol) {
  closeNotFixPopup(false);
  switchMainTab('monitoring');
  selectSaMonitoringTab(sheetName);

  const searchInput = document.getElementById('monitoringSearchInput');
  if (searchInput) searchInput.value = '';
  const dpFilter = document.getElementById('monitoringDpFilter');
  if (dpFilter) dpFilter.value = 'ALL';
  const stFilter = document.getElementById('monitoringStatusFilter');
  if (stFilter) stFilter.value = 'ALL';

  renderMonitoringList();

  setTimeout(() => {
    const cards = document.querySelectorAll('.order-group-card');
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-nopol') === nopol) {
        cards[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        cards[i].style.boxShadow = '0 0 0 4px rgba(230, 0, 18, 0.55)';
        setTimeout(() => {
          cards[i].style.boxShadow = '';
        }, 2600);
        break;
      }
    }
  }, 120);
}

async function quickCancelNotFixOrder(sheetName, nopol, rowNumbers) {
  openNotFixPopup(false);
  await cancelAndDeleteOrder(sheetName, nopol, rowNumbers);
}

/**
 * ============================================================================
 * POP-UP PERINGATAN OTOMATIS H+7 UNTUK FOLLOW UP KE-2
 * ============================================================================
 */
let HAS_SHOWN_FU2_POPUP_SESSION = false;

function getOverdueFu2Groups() {
  const overdueList = [];
  const sheets = (window.SOP_CONFIG && window.SOP_CONFIG.SA_SHEETS) || ['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'];
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  sheets.forEach((sa) => {
    const rawItems = STATE.monitoringBySheet[sa] || [];
    const groups = groupMonitoringItemsByOrder(rawItems);
    groups.forEach((grp) => {
      // Syarat unit perlu Follow Up 2:
      // 1. Follow Up 1 sudah diisi
      // 2. Follow Up 2 masih kosong
      // 3. Sudah >= 7 hari (H+7) sejak tanggal Follow Up 1 diinput
      if (grp.followUp1 && (!grp.followUp2 || grp.followUp2.trim() === '')) {
        let diffDays = null;
        if (grp.fu1Date) {
          const fu1Obj = parseFlexibleDateToObj(grp.fu1Date);
          if (fu1Obj) {
            diffDays = Math.max(0, Math.floor((todayMidnight - fu1Obj.getTime()) / 86400000));
          }
        }

        // HANYA masukkan jika tanggal Follow Up 1 benar-benar sudah lewat >= 7 hari!
        // Jika baru diinput hari ini (diffDays = 0) atau belum H+7, TIDAK boleh muncul popup!
        if (typeof diffDays === 'number' && diffDays >= 7) {
          grp.fu2OverdueDays = diffDays;
          overdueList.push(grp);
        }
      }
    });
  });

  // Urutkan dari yang paling lama tertunda (H+ terbesar di atas)
  overdueList.sort((a, b) => (b.fu2OverdueDays || 0) - (a.fu2OverdueDays || 0));
  return overdueList;
}

function checkAndShowFu2ReminderPopup(forceOpen) {
  const overdueList = getOverdueFu2Groups();
  const topBtn = document.getElementById('btnOpenFu2Modal');
  const countEl = document.getElementById('fu2AlertCount');

  if (countEl) countEl.textContent = String(overdueList.length);
  if (topBtn) {
    topBtn.classList.toggle('hidden', overdueList.length === 0);
  }

  if (overdueList.length === 0) {
    const modal = document.getElementById('fu2ReminderModal');
    if (modal) modal.classList.add('hidden');
    return;
  }

  const todayKey = formatDateInput(new Date());
  const snoozedDate = localStorage.getItem('SOP_FU2_SNOOZE_DATE') || '';

  if (forceOpen || (!HAS_SHOWN_FU2_POPUP_SESSION && snoozedDate !== todayKey)) {
    HAS_SHOWN_FU2_POPUP_SESSION = true;
    openFu2ReminderPopup(false);
  }
}

function openFu2ReminderPopup(forceRender) {
  const overdueList = getOverdueFu2Groups();
  const modal = document.getElementById('fu2ReminderModal');
  const listEl = document.getElementById('fu2ModalList');
  const subEl = document.getElementById('fu2ModalSubtitle');
  if (!modal || !listEl) return;

  if (overdueList.length === 0) {
    modal.classList.add('hidden');
    if (forceRender) {
      showToast('✅ Hebat! Tidak ada unit yang tertunda Follow Up 2 (H+7).');
    }
    return;
  }

  if (subEl) {
    subEl.innerHTML = `Terdapat <strong>${overdueList.length} No. Polisi</strong> yang sudah <strong>&ge; 7 hari (H+7)</strong> sejak Follow Up 1 namun belum ada tindak lanjut / Follow Up 2:`;
  }

  listEl.innerHTML = overdueList.map((grp, idx) => {
    const safeSa = escapeHtml(grp.sheetName || 'SA');
    const safeNopol = escapeHtml(grp.nopol);
    const fu1DateStr = grp.fu1Date ? formatShortDayMonth(grp.fu1Date) : 'Sebelumnya';
    const overdueDays = grp.fu2OverdueDays || 7;
    const safeDomId = `fu2_pop_${grp.sheetName}_${escapeHtml(grp.nopol).replace(/[^a-zA-Z0-9]/g, '_')}`;
    const rowNumsJson = JSON.stringify(grp.rowNumbers || []);

    const partSummary = grp.items
      .slice(0, 3)
      .map((it) => `${escapeHtml(it.partName)} (${it.qty}x)`)
      .join(', ') + (grp.items.length > 3 ? ` +${grp.items.length - 3} lainnya` : '');

    return `
      <div style="background:#ffffff;border:1.5px solid #fde68a;border-left:5px solid #d97706;border-radius:10px;padding:0.95rem 1.15rem;box-shadow:0 3px 10px rgba(9,9,11,0.06);display:flex;flex-direction:column;gap:0.55rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <div style="display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;">
            <span style="font-size:0.78rem;font-weight:900;color:#71717a;">#${idx + 1}</span>
            <span class="nopol-badge" style="font-size:0.88rem;padding:0.25rem 0.65rem;">${safeNopol}</span>
            <span style="font-size:0.75rem;font-weight:800;padding:0.22rem 0.55rem;border-radius:6px;background:#18181b;color:#ffffff;">
              Sheet ${safeSa} (SA/PIC: ${escapeHtml(grp.saPic || grp.sheetName)})
            </span>
            <span style="font-size:0.75rem;font-weight:800;padding:0.22rem 0.55rem;border-radius:6px;background:#fef3c7;color:#b45309;border:1px solid #fde68a;">
              ⏰ Sudah H+${overdueDays} Sejak FU 1
            </span>
          </div>
          <div style="font-size:0.82rem;font-weight:800;color:#09090b;">
            ${grp.items.length} Item &bull; <span style="color:#d97706;">${formatRupiah(grp.grandTotal)}</span>
          </div>
        </div>

        <div style="font-size:0.8rem;color:#3f3f46;background:#f8fafc;padding:0.55rem 0.75rem;border-radius:6px;border:1px solid #e4e4e7;">
          <div><strong>Item Part:</strong> ${partSummary}</div>
          <div style="margin-top:0.25rem;">
            <strong>Hasil Follow Up 1 (${fu1DateStr}):</strong>
            <span style="color:#0f172a;font-weight:700;">&ldquo;${escapeHtml(grp.followUp1)}&rdquo;</span>
          </div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fef3c7;padding:0.55rem 0.75rem;border-radius:6px;">
          <div style="font-size:0.74rem;font-weight:800;color:#92400e;margin-bottom:0.35rem;">
            ✏️ Input Hasil Follow Up Ke-2 Sekarang:
          </div>
          <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
            <input
              type="text"
              id="${safeDomId}_input"
              class="input input-sm input-uppercase"
              style="flex:1;min-width:220px;border-color:#f59e0b;font-weight:700;"
              placeholder="Contoh: SUDAH KONFIRMASI / BOOKING JUMAT / DLL"
            />
            <button
              type="button"
              id="${safeDomId}_btn"
              class="btn btn-sm btn-primary"
              style="background:#d97706;border-color:#b45309;font-weight:800;white-space:nowrap;"
              onclick='saveFu2FromPopup("${safeSa}", "${safeNopol}", ${rowNumsJson}, "${safeDomId}")'
            >
              💾 Simpan FU 2
            </button>
            <button
              type="button"
              class="btn btn-outline btn-sm"
              style="font-size:0.75rem;font-weight:700;"
              onclick='closeFu2Popup(false); focusNopolCard("${safeNopol}");'
              title="Buka dan lihat kartu order ini di halaman utama"
            >
              🔍 Buka Kartu
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function closeFu2Popup(snoozeForToday) {
  const modal = document.getElementById('fu2ReminderModal');
  if (modal) modal.classList.add('hidden');
  if (snoozeForToday) {
    localStorage.setItem('SOP_FU2_SNOOZE_DATE', formatDateInput(new Date()));
    showToast('🔕 Pengingat Pop-Up Follow Up 2 H+7 dijeda hingga besok.');
  }
}

async function saveFu2FromPopup(sheetName, nopol, rowNumbers, safeDomId) {
  const inputEl = document.getElementById(`${safeDomId}_input`);
  const btnEl = document.getElementById(`${safeDomId}_btn`);
  if (!inputEl) return;
  const fu2Val = (inputEl.value || '').trim().toUpperCase();
  if (!fu2Val) {
    showToast('⚠️ Mohon ketikkan hasil Follow Up 2 terlebih dahulu.', true);
    inputEl.focus();
    return;
  }

  const origBtnText = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '⏳ Menyimpan...';
  }

  const todayIso = formatDateInput(new Date());

  // Simpan ke local edits
  const existingEdits = STATE.localFollowUpEdits[`${sheetName}-${nopol}`] || {};
  existingEdits.fu2 = fu2Val;
  existingEdits.fu2Date = todayIso;
  STATE.localFollowUpEdits[`${sheetName}-${nopol}`] = existingEdits;
  localStorage.setItem('SOP_LOCAL_FU_EDITS', JSON.stringify(STATE.localFollowUpEdits));

  // Update item di memory
  const sheetItems = STATE.monitoringBySheet[sheetName] || [];
  sheetItems.forEach((it) => {
    if (it.nopol === nopol) {
      it.followUp2 = fu2Val;
      it.fu2Date = todayIso;
    }
  });

  // Kirim ke API Spreadsheet
  try {
    if (STATE.apiUrl) {
      await fetch(STATE.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateFollowUp',
          sheetName: sheetName,
          nopol: nopol,
          rowNumber: rowNumbers[0],
          rowNumbers: rowNumbers,
          followUp2: fu2Val,
          fu2Date: todayIso
        })
      });
    }
    showToast(`✅ Follow Up 2 untuk ${nopol} berhasil disimpan!`);
  } catch (err) {
    showToast(`✅ Tersimpan di perangkat lokal untuk ${nopol}.`);
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = origBtnText;
    }
    renderMonitoringList();
    checkAndShowFu2ReminderPopup(false);
  }
}

/**
 * Membersihkan baris kosong di Spreadsheet Monitoring yang sempat terisi karena kesalahan loop sebelumnya
 */
async function triggerCleanupGhostRows() {
  const sa = STATE.activeSaSheet || 'WBN';
  if (!confirm(`Apakah Anda ingin membersihkan baris-baris kosong di Sheet '${sa}' yang sempat terisi data order tidak sengaja?`)) {
    return;
  }

  showToast(`⏳ Sedang membersihkan baris kosong di Sheet ${sa}...`);
  try {
    if (STATE.apiUrl) {
      const response = await fetch(STATE.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'cleanupGhostRows',
          sheetName: sa
        })
      });
      const res = await response.json();
      if (res && res.status === 'ok') {
        showToast(`✅ Berhasil membersihkan ${res.cleanedRows || 0} baris kosong di Sheet ${sa}!`);
        await syncMonitoringData(true);
      } else {
        throw new Error((res && res.message) || 'Gagal membersihkan');
      }
    } else {
      showToast('⚠️ API URL belum diatur.');
    }
  } catch (err) {
    showToast(`⚠️ Gagal membersihkan otomatis: ${err.message}. Anda juga bisa menjalankan fungsi bersihkanBarisKosongMonitoring langsung di Google Apps Script.`);
  }
}

/**
 * ============================================================================
 * MANAJEMEN AUTENTIKASI PENGGUNA (LOGIN, LOGOUT, & USER MANAGEMENT)
 * ============================================================================
 */
function initAuth() {
  try {
    const savedUsers = localStorage.getItem('SOP_USERS_LIST');
    if (savedUsers) {
      const parsed = JSON.parse(savedUsers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        STATE.users = parsed;
      }
    } else {
      localStorage.setItem('SOP_USERS_LIST', JSON.stringify(STATE.users));
    }
  } catch (e) {}

  // Cek apakah ada sesi login aktif
  const authUserStr = localStorage.getItem('SOP_AUTH_USER');
  const loginOverlay = document.getElementById('loginModalOverlay');

  if (authUserStr) {
    try {
      const authUser = JSON.parse(authUserStr);
      const matched = STATE.users.find((u) => u.username.toLowerCase() === authUser.username.toLowerCase());
      if (matched) {
        STATE.currentUser = matched;
        if (loginOverlay) loginOverlay.classList.add('hidden');
        updateProfileBanner(matched);
        applyUserRolePermissions();
      } else {
        localStorage.removeItem('SOP_AUTH_USER');
        STATE.currentUser = null;
        if (loginOverlay) loginOverlay.classList.remove('hidden');
        applyUserRolePermissions();
      }
    } catch (e) {
      localStorage.removeItem('SOP_AUTH_USER');
      STATE.currentUser = null;
      if (loginOverlay) loginOverlay.classList.remove('hidden');
      applyUserRolePermissions();
    }
  } else {
    STATE.currentUser = null;
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    applyUserRolePermissions();
  }

  fetchUsersFromServer(false);
}

function handleUserLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('loginUsernameInput');
  const passwordInput = document.getElementById('loginPasswordInput');
  const errorMsg = document.getElementById('loginErrorMessage');

  const username = (usernameInput.value || '').trim().toLowerCase();
  const password = (passwordInput.value || '').trim();

  if (!username || !password) {
    if (errorMsg) {
      errorMsg.textContent = 'Mohon masukkan username dan password.';
      errorMsg.style.display = 'block';
    }
    return;
  }

  const matched = STATE.users.find(
    (u) => u.username.toLowerCase() === username && String(u.password) === String(password)
  );

  if (matched) {
    STATE.currentUser = matched;
    localStorage.setItem('SOP_AUTH_USER', JSON.stringify(matched));

    if (errorMsg) errorMsg.style.display = 'none';
    const loginOverlay = document.getElementById('loginModalOverlay');
    if (loginOverlay) loginOverlay.classList.add('hidden');

    updateProfileBanner(matched);
    applyUserRolePermissions();
    showToast(`👋 Selamat datang, ${matched.name}! Login berhasil.`);

    // Arahkan ke tab yang relevan sesuai izin role
    const perm = getUserPermissions(matched);
    if (perm.canFormOrder) {
      switchMainTab('partman');
    } else {
      switchMainTab('monitoring');
      if (matched.role.startsWith('SA_')) {
        const targetSa = matched.role.replace('SA_', '');
        if (window.SOP_CONFIG && window.SOP_CONFIG.SA_SHEETS.includes(targetSa)) {
          selectSaMonitoringTab(targetSa);
        }
      } else {
        const u = matched.username.toLowerCase();
        if (['ajs', 'ayu', 'fik', 'wbn', 'other'].includes(u)) {
          selectSaMonitoringTab(u.toUpperCase());
        }
      }
    }
  } else {
    if (errorMsg) {
      errorMsg.textContent = '❌ Username atau Password salah. Silakan periksa kembali.';
      errorMsg.style.display = 'block';
    }
    passwordInput.value = '';
    passwordInput.focus();
  }
}

function handleLogout() {
  if (!confirm('Apakah Anda yakin ingin keluar (logout) dari sesi ini?')) {
    return;
  }
  localStorage.removeItem('SOP_AUTH_USER');
  STATE.currentUser = null;
  toggleNavDrawer(false);
  applyUserRolePermissions();

  const loginOverlay = document.getElementById('loginModalOverlay');
  if (loginOverlay) {
    loginOverlay.classList.remove('hidden');
    const uInput = document.getElementById('loginUsernameInput');
    const pInput = document.getElementById('loginPasswordInput');
    const errMsg = document.getElementById('loginErrorMessage');
    if (uInput) uInput.value = '';
    if (pInput) pInput.value = '';
    if (errMsg) errMsg.style.display = 'none';
    if (uInput) uInput.focus();
  }
  showToast('🔒 Anda telah keluar dari aplikasi.');
}

function updateProfileBanner(user) {
  const nameEl = document.getElementById('drawerProfileName');
  const roleEl = document.getElementById('drawerProfileRole');
  if (nameEl) nameEl.textContent = user.name || user.username;
  if (roleEl) roleEl.textContent = user.roleName || user.role;

  // Header TPOS User Greeting & Live Date (Sesuai Gambar 1: Hi, NAMA)
  const tposUserEl = document.getElementById('tposHeaderUserName');
  if (tposUserEl) {
    tposUserEl.textContent = `Hi, ${(user.name || user.username).toUpperCase()}`;
  }
  const tposDateEl = document.getElementById('tposHeaderDateTime');
  if (tposDateEl) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    tposDateEl.textContent = `${d}/${m}/${y} ${h}:${min}`;
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTbody');
  if (!tbody) return;

  if (!STATE.users || STATE.users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#64748b;">Belum ada user yang terdaftar.</td></tr>`;
    return;
  }

  tbody.innerHTML = STATE.users.map((u, idx) => {
    const isCurrent = STATE.currentUser && STATE.currentUser.username.toLowerCase() === u.username.toLowerCase();
    const uname = u.username.toLowerCase();
    const isProtectedAdmin = uname === 'febri' || uname === 'feb' || uname === 'admin';
    const roleBadgeColor = (u.role === 'ADMIN_PARTMAN' || u.role === 'ADMIN' || uname === 'feb' || uname === 'admin')
      ? '#dc2626'
      : (u.role === 'KABENG' || uname === 'and' ? '#2563eb' : (uname === 'ptw' ? '#0891b2' : '#16a34a'));

    return `
      <tr style="${isCurrent ? 'background:#f0fdf4;' : ''}">
        <td style="text-align:center;font-weight:700;">${idx + 1}</td>
        <td>
          <strong style="color:#09090b;font-family:monospace;font-size:0.85rem;">${escapeHtml(u.username)}</strong>
          ${isCurrent ? '<span style="font-size:0.68rem;background:#16a34a;color:#fff;padding:1px 5px;border-radius:4px;margin-left:4px;">Anda</span>' : ''}
        </td>
        <td style="font-weight:600;">${escapeHtml(u.name)}</td>
        <td>
          <span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:800;color:#fff;background:${roleBadgeColor};">
            ${escapeHtml(u.roleName || u.role)}
          </span>
        </td>
        <td>
          <div style="display:inline-flex;align-items:center;gap:0.35rem;">
            <span id="pwd_disp_${idx}" style="font-family:monospace;font-weight:700;">••••••••</span>
            <button
              type="button"
              onclick="toggleShowTablePassword('${idx}', '${escapeHtml(u.password)}')"
              style="background:none;border:none;cursor:pointer;color:#64748b;font-size:0.85rem;"
              title="Lihat Password"
            >👁</button>
          </div>
        </td>
        <td style="text-align:center;">
          <span style="font-size:0.75rem;font-weight:700;color:#16a34a;">● Aktif</span>
        </td>
        <td style="text-align:center;">
          <div style="display:inline-flex;gap:0.3rem;">
            <button
              type="button"
              class="btn btn-outline btn-sm"
              style="color:#2563eb;border-color:#bfdbfe;padding:2px 7px;font-size:0.74rem;"
              onclick="startEditUser('${escapeHtml(u.username)}')"
              title="Edit Username, Password & Nama Pengguna Ini"
            >
              ✏️ Edit
            </button>
            ${isProtectedAdmin
              ? ''
              : `<button
                  type="button"
                  class="btn btn-outline btn-sm"
                  style="color:#dc2626;border-color:#fca5a5;padding:2px 7px;font-size:0.74rem;"
                  onclick="deleteUser('${escapeHtml(u.username)}')"
                  title="Hapus Pengguna"
                >
                  Hapus
                </button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function startEditUser(username) {
  const u = STATE.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
  if (!u) {
    showToast(`Pengguna "${username}" tidak ditemukan.`, true);
    return;
  }

  document.getElementById('editOriginalUsername').value = u.username;
  document.getElementById('newUserUsername').value = u.username;
  document.getElementById('newUserPassword').value = u.password;
  document.getElementById('newUserName').value = u.name;
  document.getElementById('newUserRole').value = u.role;

  const formTitle = document.getElementById('userFormTitle');
  if (formTitle) formTitle.textContent = `✏️ Form Edit Akun: ${u.username}`;
  const badge = document.getElementById('editingUserBadge');
  if (badge) badge.style.display = 'inline-block';

  const btnSubmit = document.getElementById('btnSubmitUser');
  if (btnSubmit) btnSubmit.innerHTML = `💾 Simpan Perubahan (${u.username})`;
  const btnCancel = document.getElementById('btnCancelEditUser');
  if (btnCancel) btnCancel.style.display = 'inline-block';

  const formBox = document.getElementById('userFormContainer');
  if (formBox) {
    formBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    formBox.style.boxShadow = '0 0 0 3px rgba(230, 0, 18, 0.4)';
    setTimeout(() => { formBox.style.boxShadow = ''; }, 1800);
  }
  document.getElementById('newUserUsername').focus();
}

function cancelEditUser() {
  document.getElementById('editOriginalUsername').value = '';
  document.getElementById('newUserUsername').value = '';
  document.getElementById('newUserPassword').value = '';
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserRole').value = 'ADMIN_PARTMAN';

  const formTitle = document.getElementById('userFormTitle');
  if (formTitle) formTitle.textContent = '➕ Form Tambah / Daftarkan Pengguna Baru';
  const badge = document.getElementById('editingUserBadge');
  if (badge) badge.style.display = 'none';

  const btnSubmit = document.getElementById('btnSubmitUser');
  if (btnSubmit) btnSubmit.innerHTML = '➕ Daftarkan Pengguna Baru';
  const btnCancel = document.getElementById('btnCancelEditUser');
  if (btnCancel) btnCancel.style.display = 'none';
}

function toggleShowTablePassword(idx, actualPassword) {
  const span = document.getElementById(`pwd_disp_${idx}`);
  if (!span) return;
  if (span.textContent === '••••••••') {
    span.textContent = actualPassword;
    span.style.color = '#e60012';
  } else {
    span.textContent = '••••••••';
    span.style.color = '';
  }
}

function handleAddNewUser(event) {
  event.preventDefault();
  const originalUsername = (document.getElementById('editOriginalUsername').value || '').trim().toLowerCase();
  const usernameInput = document.getElementById('newUserUsername');
  const passwordInput = document.getElementById('newUserPassword');
  const nameInput = document.getElementById('newUserName');
  const roleSelect = document.getElementById('newUserRole');

  const username = (usernameInput.value || '').trim().toLowerCase();
  const password = (passwordInput.value || '').trim();
  const name = (nameInput.value || '').trim();
  const role = (roleSelect.value || 'SA_ALL').trim();

  if (!username || !password || !name) {
    showToast('Mohon lengkapi username, password, dan nama pengguna.', true);
    return;
  }

  const roleNames = {
    ADMIN_PARTMAN: 'Admin & Partman',
    KABENG: 'Kepala Bengkel',
    SA_AJS: 'Service Advisor (AJS)',
    SA_AYU: 'Service Advisor (AYU)',
    SA_FIK: 'Service Advisor (FIK)',
    SA_WBN: 'Service Advisor (WBN)',
    SA_OTHER: 'Service Advisor (OTHER)',
    SA_ALL: 'Service Advisor (Semua Sheet)'
  };

  // JIKA DALAM MODE EDIT PENGGUNA
  if (originalUsername) {
    // Jika username diubah, pastikan tidak bentrok dengan user lain
    if (username !== originalUsername) {
      const isTaken = STATE.users.some(
        (u) => u.username.toLowerCase() === username && u.username.toLowerCase() !== originalUsername
      );
      if (isTaken) {
        showToast(`⚠️ Username "${username}" sudah dipakai akun lain. Gunakan username berbeda.`, true);
        usernameInput.focus();
        return;
      }
    }

    const targetUser = STATE.users.find((u) => u.username.toLowerCase() === originalUsername);
    if (!targetUser) {
      showToast('Data user yang diedit tidak ditemukan.', true);
      cancelEditUser();
      return;
    }

    targetUser.username = username;
    targetUser.password = password;
    targetUser.name = name;
    targetUser.role = role;
    targetUser.roleName = roleNames[role] || role;

    // Jika yang diedit adalah akun yang sedang aktif login, perbarui sesi login
    if (STATE.currentUser && STATE.currentUser.username.toLowerCase() === originalUsername) {
      STATE.currentUser = targetUser;
      localStorage.setItem('SOP_AUTH_USER', JSON.stringify(targetUser));
      updateProfileBanner(targetUser);
    }

    localStorage.setItem('SOP_USERS_LIST', JSON.stringify(STATE.users));
    renderUsersTable();
    cancelEditUser();

    showToast(`✅ Perubahan akun "${username}" (${name}) berhasil disimpan!`);
    saveUsersToServer(false);
    return;
  }

  // JIKA DALAM MODE TAMBAH PENGGUNA BARU
  const exists = STATE.users.some((u) => u.username.toLowerCase() === username);
  if (exists) {
    showToast(`⚠️ Username "${username}" sudah digunakan. Gunakan username lain atau klik Edit pada tabel di bawah.`, true);
    usernameInput.focus();
    return;
  }

  const newUser = {
    username,
    password,
    name,
    role,
    roleName: roleNames[role] || role
  };

  STATE.users.push(newUser);
  localStorage.setItem('SOP_USERS_LIST', JSON.stringify(STATE.users));
  renderUsersTable();

  // Reset form
  usernameInput.value = '';
  passwordInput.value = '';
  nameInput.value = '';

  showToast(`✅ Pengguna "${username}" (${name}) berhasil didaftarkan!`);
  saveUsersToServer(false);
}

/**
 * ============================================================================
 * MODAL PINTASAN EDIT AKUN & PASSWORD SENDIRI (UNTUK SA / KABENG YANG LOGIN)
 * ============================================================================
 */
function openMyProfileModal() {
  if (!STATE.currentUser) {
    showToast('Silakan login terlebih dahulu.', true);
    return;
  }
  toggleNavDrawer(false);

  const uInput = document.getElementById('myProfileUsernameInput');
  const nInput = document.getElementById('myProfileNameInput');
  const pInput = document.getElementById('myProfilePasswordInput');

  if (uInput) uInput.value = STATE.currentUser.username;
  if (nInput) nInput.value = STATE.currentUser.name;
  if (pInput) pInput.value = STATE.currentUser.password;

  const modal = document.getElementById('myProfileModal');
  if (modal) modal.classList.remove('hidden');
}

function closeMyProfileModal() {
  const modal = document.getElementById('myProfileModal');
  if (modal) modal.classList.add('hidden');
}

function handleSaveMyProfile(event) {
  event.preventDefault();
  if (!STATE.currentUser) return;

  const uInput = document.getElementById('myProfileUsernameInput');
  const nInput = document.getElementById('myProfileNameInput');
  const pInput = document.getElementById('myProfilePasswordInput');

  const newUsername = (uInput.value || '').trim().toLowerCase();
  const newName = (nInput.value || '').trim();
  const newPassword = (pInput.value || '').trim();

  if (!newUsername || !newName || !newPassword) {
    showToast('Mohon lengkapi Username, Nama, dan Password.', true);
    return;
  }

  const currentUsername = STATE.currentUser.username.toLowerCase();

  // Jika username diganti, cek duplikasi
  if (newUsername !== currentUsername) {
    const isTaken = STATE.users.some(
      (u) => u.username.toLowerCase() === newUsername && u.username.toLowerCase() !== currentUsername
    );
    if (isTaken) {
      showToast(`⚠️ Username "${newUsername}" sudah dipakai akun lain. Silakan pilih username berbeda.`, true);
      uInput.focus();
      return;
    }
  }

  const targetInList = STATE.users.find((u) => u.username.toLowerCase() === currentUsername);
  if (targetInList) {
    targetInList.username = newUsername;
    targetInList.name = newName;
    targetInList.password = newPassword;
  }

  STATE.currentUser.username = newUsername;
  STATE.currentUser.name = newName;
  STATE.currentUser.password = newPassword;

  localStorage.setItem('SOP_AUTH_USER', JSON.stringify(STATE.currentUser));
  localStorage.setItem('SOP_USERS_LIST', JSON.stringify(STATE.users));

  updateProfileBanner(STATE.currentUser);
  renderUsersTable();
  closeMyProfileModal();

  showToast(`✅ Akun Anda (${newUsername}) berhasil diperbarui!`);
  saveUsersToServer(false);
}

function deleteUser(username) {
  if (username.toLowerCase() === 'febri') {
    showToast('⚠️ Akun admin utama (febri) tidak dapat dihapus.', true);
    return;
  }

  if (STATE.currentUser && STATE.currentUser.username.toLowerCase() === username.toLowerCase()) {
    showToast('⚠️ Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.', true);
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin menghapus user "${username}"? User ini tidak akan dapat login lagi.`)) {
    return;
  }

  STATE.users = STATE.users.filter((u) => u.username.toLowerCase() !== username.toLowerCase());
  localStorage.setItem('SOP_USERS_LIST', JSON.stringify(STATE.users));
  renderUsersTable();
  showToast(`🗑 User "${username}" berhasil dihapus.`);
  saveUsersToServer(false);
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btnEl.textContent = '🔒';
  } else {
    input.type = 'password';
    btnEl.textContent = '👁';
  }
}

async function saveUsersToServer(showToastMsg) {
  try {
    if (!STATE.apiUrl) {
      if (showToastMsg) showToast('✅ Daftar pengguna tersimpan di perangkat lokal.');
      return;
    }
    const response = await fetch(STATE.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveUsers',
        users: STATE.users
      })
    });
    const res = await response.json();
    if (res && res.status === 'ok') {
      if (showToastMsg) showToast('✅ Daftar pengguna berhasil disinkronkan ke server Google Apps Script!');
    }
  } catch (err) {
    if (showToastMsg) showToast('⚠️ Tersimpan di lokal. Hubungkan ke Script API untuk sinkronisasi server.');
  }
}

async function fetchUsersFromServer(showToastMsg) {
  try {
    if (!STATE.apiUrl) return;
    const response = await fetch(STATE.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getUsers' })
    });
    const res = await response.json();
    if (res && res.status === 'ok' && Array.isArray(res.users) && res.users.length > 0) {
      STATE.users = res.users;
      localStorage.setItem('SOP_USERS_LIST', JSON.stringify(res.users));
      if (STATE.currentUser) {
        const updated = res.users.find((u) => u.username.toLowerCase() === STATE.currentUser.username.toLowerCase());
        if (updated) {
          STATE.currentUser = updated;
          localStorage.setItem('SOP_AUTH_USER', JSON.stringify(updated));
          updateProfileBanner(updated);
        }
      }
      renderUsersTable();
      if (showToastMsg) showToast('✅ Daftar pengguna berhasil diperbarui dari server.');
    }
  } catch (err) {}
}

/* ============================================================================
 * LAPORAN MINGGUAN KABENG (MONITORING UNIT & OMZET TIAP SA PER MINGGU W1 - W5)
 * ============================================================================ */

const FULL_MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function initKabengReportControls() {
  const mSelect = document.getElementById('kabengMonthSelect');
  const ySelect = document.getElementById('kabengYearSelect');
  if (mSelect) mSelect.value = String(STATE.kabengReportMonth);
  if (ySelect) ySelect.value = String(STATE.kabengReportYear);
}

function handleKabengFilterChange() {
  const mSelect = document.getElementById('kabengMonthSelect');
  const ySelect = document.getElementById('kabengYearSelect');
  if (mSelect) STATE.kabengReportMonth = parseInt(mSelect.value, 10);
  if (ySelect) STATE.kabengReportYear = parseInt(ySelect.value, 10);
  renderKabengWeeklyReport();
}

function changeKabengReportMonth(delta) {
  let m = STATE.kabengReportMonth + delta;
  let y = STATE.kabengReportYear;
  if (m < 0) {
    m = 11;
    y -= 1;
  } else if (m > 11) {
    m = 0;
    y += 1;
  }
  STATE.kabengReportMonth = m;
  STATE.kabengReportYear = y;
  initKabengReportControls();
  renderKabengWeeklyReport();
}

function resetKabengReportToCurrentMonth() {
  const now = new Date();
  STATE.kabengReportMonth = now.getMonth();
  STATE.kabengReportYear = now.getFullYear();
  initKabengReportControls();
  renderKabengWeeklyReport();
}

/**
 * Menghitung batas tanggal W1 - W5 untuk bulan & tahun terpilih
 * Sesuai cutoff minggu hari Minggu standar bengkel Toyota (seperti referensi gambar W1..W5: 1 Okt, 4 Okt, 11 Okt, 18 Okt, 25 Okt)
 */
function getWeeksForMonth(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = SHORT_MONTHS_ID[monthIndex];

  // Temukan semua hari Minggu dalam bulan ini
  const sundays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getDay() === 0) { // 0 = Minggu
      sundays.push(day);
    }
  }

  const weeks = [];

  // W1 selalu mulai dari tanggal 1
  let startW1 = 1;
  let endW1;
  if (sundays.length > 0 && sundays[0] === 1) {
    endW1 = Math.min(7, daysInMonth);
  } else if (sundays.length > 0) {
    endW1 = sundays[0] - 1;
  } else {
    endW1 = daysInMonth;
  }

  weeks.push({
    index: 1,
    key: 'W1',
    startDay: startW1,
    endDay: endW1,
    startLabel: `${startW1} ${monthName}`,
    dateRangeLabel: `${startW1} - ${endW1} ${monthName}`
  });

  let currentStart = endW1 + 1;
  for (let w = 2; w <= 5; w++) {
    if (currentStart > daysInMonth) {
      weeks.push({
        index: w,
        key: `W${w}`,
        startDay: null,
        endDay: null,
        startLabel: `-`,
        dateRangeLabel: `-`
      });
      continue;
    }

    let endDay;
    const nextSunday = sundays.find((s) => s > currentStart);
    if (nextSunday && w < 5) {
      endDay = nextSunday - 1;
    } else {
      endDay = Math.min(currentStart + 6, daysInMonth);
      if (w === 5) {
        endDay = daysInMonth;
      }
    }

    if (endDay < currentStart) endDay = currentStart;

    weeks.push({
      index: w,
      key: `W${w}`,
      startDay: currentStart,
      endDay: endDay,
      startLabel: `${currentStart} ${monthName}`,
      dateRangeLabel: `${currentStart} - ${endDay} ${monthName}`
    });

    currentStart = endDay + 1;
  }

  return weeks;
}

/**
 * Merender tabel matriks Laporan Mingguan Kabeng persis seperti gambar Excel referensi
 */
function renderKabengWeeklyReport() {
  const tableEl = document.getElementById('kabengMatrixTable');
  if (!tableEl) return;

  const year = STATE.kabengReportYear;
  const month = STATE.kabengReportMonth;
  const monthName = SHORT_MONTHS_ID[month];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = getWeeksForMonth(year, month);

  // 1. Kumpulkan semua raw items dari seluruh sheet monitoring
  const allRawItems = [];
  const saSheets = (window.SOP_CONFIG && window.SOP_CONFIG.SA_SHEETS) || ['AJS', 'AYU', 'FIK', 'WBN', 'OTHER'];
  saSheets.forEach((sa) => {
    const list = STATE.monitoringBySheet[sa] || [];
    allRawItems.push(...list);
  });

  // 2. Kelompokkan menjadi grup NOPOL
  const allGroups = groupMonitoringItemsByOrder(allRawItems);

  // 3. Filter khusus order yang SELURUH item part-nya SUDAH LENGKAP DATANG (allItemsArrived === true)
  const completeOrders = allGroups.filter((g) => g.allItemsArrived);

  // 4. Baris SA disamakan dengan menu Monitoring SOP: AJS, AYU, FIK, WBN, OTHERS
  const allSas = ['AJS', 'AYU', 'FIK', 'WBN', 'OTHERS'];

  // Matriks data: cellOrders[sa][weekIndex] = [grp1, grp2, ...]
  const cellOrders = {};
  allSas.forEach((sa) => {
    cellOrders[sa] = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  });

  // 5. Masukkan order lengkap ke dalam sel (SA, Week) sesuai tanggal selesai / ATA
  completeOrders.forEach((grp) => {
    let compDate = null;
    if (grp.fullAtaTimestamp && grp.fullAtaTimestamp !== Infinity) {
      compDate = new Date(grp.fullAtaTimestamp);
    } else if (grp.ata) {
      compDate = parseFlexibleDateToObj(grp.ata, year);
    } else if (grp.orderDate) {
      compDate = parseFlexibleDateToObj(grp.orderDate, year);
    }

    if (!compDate) return;

    // Periksa apakah order selesai pada bulan & tahun yang dipilih
    if (compDate.getFullYear() !== year || compDate.getMonth() !== month) {
      return;
    }

    const day = compDate.getDate();
    const targetWeek = weeks.find((w) => w.startDay !== null && day >= w.startDay && day <= w.endDay);
    if (!targetWeek) return;

    // Tentukan SA tujuan (AJS, AYU, FIK, WBN, atau OTHERS)
    let saRow = 'OTHERS';
    const sheet = (grp.sheetName || '').toUpperCase();
    if (sheet === 'AJS' || sheet === 'AYU' || sheet === 'FIK' || sheet === 'WBN') {
      saRow = sheet;
    } else {
      saRow = 'OTHERS';
    }

    cellOrders[saRow][targetWeek.index].push(grp);
  });

  // Simpan ke cache untuk keperluan modal detail & salin ke clipboard
  STATE.kabengReportCache = {
    year,
    month,
    weeks,
    allSas,
    cellOrders
  };

  // 6. Hitung Total per Pekan (Kolom) & Total per SA (Baris)
  const weekTotalUnits = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const weekTotalOmzet = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const saTotalUnits = {};
  const saTotalOmzet = {};
  let grandTotalUnits = 0;
  let grandTotalOmzet = 0;

  allSas.forEach((sa) => {
    saTotalUnits[sa] = 0;
    saTotalOmzet[sa] = 0;
    for (let w = 1; w <= 5; w++) {
      const list = (cellOrders[sa] && cellOrders[sa][w]) || [];
      const units = list.length;
      const omzet = list.reduce((sum, g) => sum + (Number(g.grandTotal) || 0), 0);
      weekTotalUnits[w] += units;
      weekTotalOmzet[w] += omzet;
      saTotalUnits[sa] += units;
      saTotalOmzet[sa] += omzet;
      grandTotalUnits += units;
      grandTotalOmzet += omzet;
    }
  });

  // 7. Render Header Tabel (Tampilan Modern Executive Dashboard)
  let theadHtml = `
    <thead>
      <tr>
        <th rowspan="2" class="kabeng-header-brand">
          <div class="kabeng-brand-chip">
            <span class="kabeng-brand-dot"></span>
            PART SOP
          </div>
        </th>
        <th colspan="2" class="kabeng-header-week">
          <span class="kabeng-week-title">W1</span>
        </th>
        <th colspan="2" class="kabeng-header-week">
          <span class="kabeng-week-title">W2</span>
        </th>
        <th colspan="2" class="kabeng-header-week">
          <span class="kabeng-week-title">W3</span>
        </th>
        <th colspan="2" class="kabeng-header-week">
          <span class="kabeng-week-title">W4</span>
        </th>
        <th colspan="2" class="kabeng-header-week">
          <span class="kabeng-week-title">W5</span>
        </th>
        <th colspan="2" class="kabeng-header-month">
          <span class="kabeng-week-title">TOTAL BULAN</span>
        </th>
      </tr>
      <tr>
        <th class="kabeng-sub-header">Unit</th>
        <th class="kabeng-sub-header">Omzet</th>
        <th class="kabeng-sub-header">Unit</th>
        <th class="kabeng-sub-header">Omzet</th>
        <th class="kabeng-sub-header">Unit</th>
        <th class="kabeng-sub-header">Omzet</th>
        <th class="kabeng-sub-header">Unit</th>
        <th class="kabeng-sub-header">Omzet</th>
        <th class="kabeng-sub-header">Unit</th>
        <th class="kabeng-sub-header">Omzet</th>
        <th class="kabeng-sub-header kabeng-sub-header-month">Unit</th>
        <th class="kabeng-sub-header kabeng-sub-header-month">Omzet</th>
      </tr>
    </thead>
  `;

  // 8. Render Baris Data Tiap SA (AJS, AYU, FIK, WBN, OTHERS)
  let tbodyHtml = '<tbody>';
  allSas.forEach((sa) => {
    tbodyHtml += `<tr>`;
    tbodyHtml += `<td class="kabeng-sa-cell"><span class="kabeng-sa-tag">${escapeHtml(sa)}</span></td>`;

    for (let w = 1; w <= 5; w++) {
      const list = (cellOrders[sa] && cellOrders[sa][w]) || [];
      const units = list.length;
      const omzet = list.reduce((sum, g) => sum + (Number(g.grandTotal) || 0), 0);

      // Rule alert kuning pastel: Pada minggu yang aktif (weekTotalUnits > 0), jika SA mendapat 0 unit
      const isZeroAlert = weekTotalUnits[w] > 0 && units === 0;
      const isWeekHasActivity = weekTotalUnits[w] > 0;

      let unitHtml = '';
      let omzetHtml = '';

      if (units > 0) {
        unitHtml = `<span class="kabeng-val-unit">${units}</span>`;
        omzetHtml = formatRupiahPlain(omzet);
      } else if (isZeroAlert) {
        unitHtml = `<span class="kabeng-zero-tag">0</span>`;
        omzetHtml = `<span class="kabeng-zero-tag">0</span>`;
      } else if (isWeekHasActivity) {
        unitHtml = `<span class="kabeng-muted-dash">0</span>`;
        omzetHtml = `<span class="kabeng-muted-dash">-</span>`;
      } else {
        unitHtml = `<span class="kabeng-muted-dash">-</span>`;
        omzetHtml = `<span class="kabeng-muted-dash">-</span>`;
      }

      const alertClass = isZeroAlert ? 'kabeng-cell-alert' : '';
      const clickableClass = units > 0 ? 'kabeng-clickable-cell' : '';
      const clickAttr = units > 0 ? `onclick="openKabengCellDetail('${sa}', ${w})" title="Klik untuk lihat ${units} No. Polisi lengkap"` : '';

      tbodyHtml += `
        <td class="kabeng-unit-cell ${alertClass} ${clickableClass}" ${clickAttr}>
          ${unitHtml}
        </td>
        <td class="kabeng-omzet-cell ${alertClass} ${clickableClass}" ${clickAttr}>
          ${omzetHtml}
        </td>
      `;
    }

    // Kolom Total Bulan per SA
    const saUnitsTotal = saTotalUnits[sa] || 0;
    const saOmzTotal = saTotalOmzet[sa] || 0;
    const saTotalClickable = saUnitsTotal > 0 ? 'kabeng-clickable-cell' : '';
    const saTotalClickAttr = saUnitsTotal > 0 ? `onclick="openKabengCellDetail('${sa}', 'ALL')" title="Klik untuk lihat ${saUnitsTotal} No. Polisi lengkap ${sa} bulan ini"` : '';

    tbodyHtml += `
      <td class="kabeng-unit-cell kabeng-month-unit-cell ${saTotalClickable}" ${saTotalClickAttr}>
        ${saUnitsTotal > 0 ? `<span class="kabeng-val-unit" style="background:#dcfce7;color:#15803d;">${saUnitsTotal}</span>` : '0'}
      </td>
      <td class="kabeng-omzet-cell kabeng-month-omzet-cell ${saTotalClickable}" ${saTotalClickAttr}>
        ${saOmzTotal > 0 ? formatRupiahPlain(saOmzTotal) : '0'}
      </td>
    `;
    tbodyHtml += `</tr>`;
  });
  tbodyHtml += '</tbody>';

  // 9. Render Baris TOTAL & Baris Cutoff Tanggal
  let tfootHtml = `
    <tfoot>
      <!-- Baris TOTAL -->
      <tr class="kabeng-total-row">
        <td class="kabeng-sa-cell" style="background:#f1f5f9;"><span class="kabeng-total-tag">TOTAL</span></td>
  `;

  for (let w = 1; w <= 5; w++) {
    const u = weekTotalUnits[w];
    const omz = weekTotalOmzet[w];
    const weekTotalClickable = u > 0 ? 'kabeng-clickable-cell' : '';
    const weekTotalClickAttr = u > 0 ? `onclick="openKabengCellDetail('TOTAL', ${w})" title="Klik untuk lihat seluruh ${u} No. Polisi lengkap di W${w}"` : '';

    tfootHtml += `
      <td class="kabeng-unit-cell ${weekTotalClickable}" style="font-weight:800;" ${weekTotalClickAttr}>
        ${u > 0 ? `<span class="kabeng-val-unit">${u}</span>` : '<span class="kabeng-muted-dash">0</span>'}
      </td>
      <td class="kabeng-omzet-cell ${weekTotalClickable}" style="font-weight:700;" ${weekTotalClickAttr}>
        ${omz > 0 ? formatRupiahPlain(omz) : '<span class="kabeng-muted-dash">0</span>'}
      </td>
    `;
  }

  // Total Keseluruhan Bulan Ini (Grand Total)
  const grandTotalClickable = grandTotalUnits > 0 ? 'kabeng-clickable-cell' : '';
  const grandTotalClickAttr = grandTotalUnits > 0 ? `onclick="openKabengCellDetail('TOTAL', 'ALL')" title="Klik untuk lihat seluruh ${grandTotalUnits} No. Polisi lengkap bulan ini"` : '';

  tfootHtml += `
      <td class="kabeng-unit-cell kabeng-grand-total ${grandTotalClickable}" ${grandTotalClickAttr}>
        ${grandTotalUnits > 0 ? `<span class="kabeng-val-unit" style="background:#0284c7;color:#ffffff;">${grandTotalUnits}</span>` : '0'}
      </td>
      <td class="kabeng-omzet-cell kabeng-grand-total ${grandTotalClickable}" ${grandTotalClickAttr}>
        ${formatRupiahPlain(grandTotalOmzet)}
      </td>
    </tr>

    <!-- Baris Cutoff Tanggal di bawah tabel -->
    <tr class="kabeng-date-cutoff-row">
      <td style="background:#f8fafc;text-align:center;"><span class="kabeng-cutoff-pill">CUTOFF</span></td>
      <td colspan="2"><span class="kabeng-cutoff-pill">${weeks[0] ? weeks[0].startLabel : '-'}</span></td>
      <td colspan="2"><span class="kabeng-cutoff-pill">${weeks[1] ? weeks[1].startLabel : '-'}</span></td>
      <td colspan="2"><span class="kabeng-cutoff-pill">${weeks[2] ? weeks[2].startLabel : '-'}</span></td>
      <td colspan="2"><span class="kabeng-cutoff-pill">${weeks[3] ? weeks[3].startLabel : '-'}</span></td>
      <td colspan="2"><span class="kabeng-cutoff-pill">${weeks[4] ? weeks[4].startLabel : '-'}</span></td>
      <td colspan="2"><span class="kabeng-cutoff-pill">1 - ${daysInMonth} ${monthName}</span></td>
    </tr>
  </tfoot>
  `;

  tableEl.innerHTML = theadHtml + tbodyHtml + tfootHtml;

  // 10. Perbarui Kartu Ringkasan KPI di atas tabel
  const kpiUnitsEl = document.getElementById('kpiKabengTotalUnits');
  const kpiOmzetEl = document.getElementById('kpiKabengTotalOmzet');
  const kpiUnitsSubEl = document.getElementById('kpiKabengTotalUnitsSub');
  const kpiTopSaUnitEl = document.getElementById('kpiKabengTopSaUnit');
  const kpiTopSaUnitSubEl = document.getElementById('kpiKabengTopSaUnitSub');
  const kpiTopSaOmzetEl = document.getElementById('kpiKabengTopSaOmzet');
  const kpiTopSaOmzetSubEl = document.getElementById('kpiKabengTopSaOmzetSub');

  if (kpiUnitsEl) kpiUnitsEl.textContent = `${grandTotalUnits} Unit`;
  if (kpiOmzetEl) kpiOmzetEl.textContent = formatRupiah(grandTotalOmzet);
  if (kpiUnitsSubEl) kpiUnitsSubEl.textContent = `Bulan ${FULL_MONTHS_ID[month]} ${year}`;

  // Cari Top SA Unit & Omzet
  let bestSaUnit = '-';
  let maxUnits = -1;
  let bestSaOmzet = '-';
  let maxOmzet = -1;

  allSas.forEach((sa) => {
    if (saTotalUnits[sa] > maxUnits && saTotalUnits[sa] > 0) {
      maxUnits = saTotalUnits[sa];
      bestSaUnit = sa;
    }
    if (saTotalOmzet[sa] > maxOmzet && saTotalOmzet[sa] > 0) {
      maxOmzet = saTotalOmzet[sa];
      bestSaOmzet = sa;
    }
  });

  if (kpiTopSaUnitEl) {
    kpiTopSaUnitEl.textContent = maxUnits > 0 ? `${bestSaUnit} (${maxUnits} Unit)` : 'Belum Ada';
  }
  if (kpiTopSaUnitSubEl) {
    kpiTopSaUnitSubEl.textContent = maxUnits > 0 ? `Nilai: ${formatRupiah(saTotalOmzet[bestSaUnit])}` : '-';
  }
  if (kpiTopSaOmzetEl) {
    kpiTopSaOmzetEl.textContent = maxOmzet > 0 ? `${bestSaOmzet} (${formatRupiah(maxOmzet)})` : 'Belum Ada';
  }
  if (kpiTopSaOmzetSubEl) {
    kpiTopSaOmzetSubEl.textContent = maxOmzet > 0 ? `Total: ${saTotalUnits[bestSaOmzet]} Unit Lengkap` : '-';
  }
}

/**
 * Menampilkan Pop-Up Rincian No. Polisi ketika Kabeng mengklik sel angka pada tabel mingguan
 */
function openKabengCellDetail(saKey, weekIndex) {
  const modal = document.getElementById('kabengDetailModal');
  const titleEl = document.getElementById('kabengDetailModalTitle');
  const subtitleEl = document.getElementById('kabengDetailModalSubtitle');
  const countEl = document.getElementById('kabengDetailStatCount');
  const totalEl = document.getElementById('kabengDetailStatTotal');
  const tbodyEl = document.getElementById('kabengDetailTbody');

  if (!modal || !STATE.kabengReportCache || !STATE.kabengReportCache.cellOrders) return;

  const { year, month, weeks, allSas, cellOrders } = STATE.kabengReportCache;
  const monthName = (typeof FULL_MONTHS_ID !== 'undefined' && FULL_MONTHS_ID[month]) ? FULL_MONTHS_ID[month] : SHORT_MONTHS_ID[month];

  let orders = [];
  let titleLabel = '';
  let subtitleLabel = '';

  const isAllWeeks = weekIndex === 'ALL' || weekIndex === 0;
  const isAllSas = saKey === 'TOTAL' || saKey === 'ALL';

  if (isAllSas && isAllWeeks) {
    // Grand Total: Seluruh SA & Seluruh Pekan
    allSas.forEach((sa) => {
      for (let w = 1; w <= 5; w++) {
        const list = (cellOrders[sa] && cellOrders[sa][w]) || [];
        orders.push(...list);
      }
    });
    titleLabel = `📋 Rincian Seluruh Order Lengkap — Bulan ${monthName} ${year}`;
    subtitleLabel = `Daftar seluruh No. Polisi dari semua SA yang telah lengkap sparepart-nya pada bulan ${monthName} ${year}.`;
  } else if (isAllSas) {
    // Baris Total per Pekan: Seluruh SA pada Pekan W
    const weekInfo = weeks.find((w) => w.index === Number(weekIndex));
    const weekLabel = weekInfo ? `${weekInfo.key} (${weekInfo.dateRangeLabel})` : `Pekan ${weekIndex}`;
    allSas.forEach((sa) => {
      const list = (cellOrders[sa] && cellOrders[sa][Number(weekIndex)]) || [];
      orders.push(...list);
    });
    titleLabel = `📋 Rincian Total Order Lengkap — Seluruh SA (${weekLabel})`;
    subtitleLabel = `Daftar No. Polisi dari semua SA yang sparepart-nya lengkap tiba pada ${weekLabel}.`;
  } else if (isAllWeeks) {
    // Kolom Total Bulan per SA
    for (let w = 1; w <= 5; w++) {
      const list = (cellOrders[saKey] && cellOrders[saKey][w]) || [];
      orders.push(...list);
    }
    titleLabel = `📋 Rincian Total Order Lengkap — SA: ${saKey} (Bulan ${monthName} ${year})`;
    subtitleLabel = `Daftar seluruh No. Polisi lengkap untuk SA ${saKey} selama bulan ${monthName} ${year}.`;
  } else {
    // Sel SA spesifik pada Pekan spesifik
    const weekInfo = weeks.find((w) => w.index === Number(weekIndex));
    const weekLabel = weekInfo ? `${weekInfo.key} (${weekInfo.dateRangeLabel})` : `Pekan ${weekIndex}`;
    orders = (cellOrders[saKey] && cellOrders[saKey][Number(weekIndex)]) || [];
    titleLabel = `📋 Rincian Order Lengkap — SA: ${saKey} (${weekLabel})`;
    subtitleLabel = `Daftar No. Polisi yang seluruh sparepart-nya telah tiba di bengkel pada ${weekLabel}.`;
  }

  // Hilangkan duplikasi jika ada referensi order yang sama
  const uniqueOrders = [];
  const seenKeys = new Set();
  orders.forEach((g) => {
    const k = g.groupKey || `${g.sheetName}::${g.nopol}`;
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      uniqueOrders.push(g);
    }
  });

  if (titleEl) titleEl.textContent = titleLabel;
  if (subtitleEl) subtitleEl.textContent = subtitleLabel;

  const grandTotal = uniqueOrders.reduce((sum, g) => sum + (Number(g.grandTotal) || 0), 0);
  if (countEl) countEl.textContent = `${uniqueOrders.length} Unit (No. Polisi Lengkap)`;
  if (totalEl) totalEl.textContent = `Total: ${formatRupiah(grandTotal)}`;

  // Hitung usia part hari ini
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (tbodyEl) {
    if (uniqueOrders.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;padding:2rem;color:#94a3b8;">
            Tidak ada data order lengkap untuk kategori ini.
          </td>
        </tr>
      `;
    } else {
      tbodyEl.innerHTML = uniqueOrders.map((grp, idx) => {
        const partsSummary = (grp.items || []).map((it) => {
          return `<div style="font-size:0.75rem;margin-bottom:2px;">
            <code style="background:#e2e8f0;padding:1px 4px;border-radius:3px;font-weight:700;">${escapeHtml(it.partNo || '-')}</code>
            ${escapeHtml(it.partName || '')} (${it.qty} pcs)
          </div>`;
        }).join('');

        const latestAta = grp.latestAtaDisplay || formatShortDayMonth(grp.ata) || '-';

        // Hitung Usia Part setelah lengkap tiba
        let ataAge = grp.ataAgeDays;
        if (ataAge === undefined || ataAge === null || ataAge < 0) {
          if (grp.fullAtaTimestamp && grp.fullAtaTimestamp !== Infinity) {
            ataAge = Math.max(0, Math.floor((todayMidnight - grp.fullAtaTimestamp) / 86400000));
          } else {
            ataAge = 0;
          }
        }

        let ageBadge = '';
        if (ataAge <= 7) {
          const label = ataAge === 0 ? '0 Hari (Hari Ini)' : `${ataAge} Hari`;
          ageBadge = `<span style="font-size:0.75rem;font-weight:800;color:#15803d;background:#dcfce7;border:1px solid #86efac;padding:3px 8px;border-radius:5px;white-space:nowrap;">${label}</span>`;
        } else if (ataAge <= 14) {
          ageBadge = `<span style="font-size:0.75rem;font-weight:800;color:#854d0e;background:#fef08a;border:1px solid #facc15;padding:3px 8px;border-radius:5px;white-space:nowrap;">⚠️ ${ataAge} Hari</span>`;
        } else {
          ageBadge = `<span style="font-size:0.75rem;font-weight:800;color:#991b1b;background:#fee2e2;border:1px solid #fca5a5;padding:3px 8px;border-radius:5px;white-space:nowrap;">🚨 ${ataAge} Hari</span>`;
        }

        return `
          <tr>
            <td style="text-align:center;font-weight:700;color:#64748b;">${idx + 1}</td>
            <td>
              <div style="font-weight:900;font-size:0.92rem;color:#0b2341;">${escapeHtml(grp.nopol || '-')}</div>
              <div style="font-size:0.72rem;color:#64748b;">Sheet: ${escapeHtml(grp.sheetName || '')}${grp.saPic ? ' / ' + escapeHtml(grp.saPic) : ''}</div>
            </td>
            <td style="text-align:center;font-size:0.78rem;font-weight:600;color:#475569;">
              ${escapeHtml(grp.orderDate || '-')}
            </td>
            <td style="text-align:center;font-size:0.8rem;font-weight:800;color:#16a34a;white-space:nowrap;">
              ✓ ${escapeHtml(latestAta)}
            </td>
            <td style="text-align:center;">
              ${ageBadge}
            </td>
            <td>
              ${partsSummary}
            </td>
            <td style="text-align:right;font-weight:800;color:#0f172a;white-space:nowrap;">
              ${formatRupiah(grp.grandTotal)}
            </td>
            <td style="text-align:center;">
              <button type="button" class="btn btn-outline btn-sm" style="padding:4px 8px;font-size:0.72rem;" onclick="openKabengOrderInMonitoring('${escapeHtml(grp.sheetName)}', '${escapeHtml(grp.nopol)}')">
                Buka
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  modal.classList.remove('hidden');
}

function closeKabengDetailModal() {
  const modal = document.getElementById('kabengDetailModal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Pintasan dari modal detail mingguan langsung menuju ke kartu order di Monitoring SOP
 */
function openKabengOrderInMonitoring(sheetName, nopol) {
  closeKabengDetailModal();
  switchMainTab('monitoring');
  if (sheetName && window.SOP_CONFIG && window.SOP_CONFIG.SA_SHEETS.includes(sheetName)) {
    selectSaMonitoringTab(sheetName);
  }
  const searchInput = document.getElementById('monitoringSearchInput');
  if (searchInput) {
    searchInput.value = nopol;
    renderMonitoringList();
  }
}

/**
 * Menyalin tabel mingguan ke Clipboard dalam format Tab-Separated Values (TSV)
 * Sehingga dapat langsung dipaste ke Microsoft Excel atau Google Spreadsheet dengan format kolom rapi!
 */
function copyKabengTableToClipboard() {
  if (!STATE.kabengReportCache || !STATE.kabengReportCache.cellOrders) {
    showToast('Tabel belum selesai dimuat.', true);
    return;
  }

  const { year, month, weeks, allSas, cellOrders } = STATE.kabengReportCache;
  const monthName = SHORT_MONTHS_ID[month];

  let tsv = `PART SOP\tW1\t\tW2\t\tW3\t\tW4\t\tW5\t\tTOTAL BULAN\t\n`;
  tsv += `SA\tUNIT\tOMZET\tUNIT\tOMZET\tUNIT\tOMZET\tUNIT\tOMZET\tUNIT\tOMZET\tUNIT\tOMZET\n`;

  const weekUnits = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const weekOmzet = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let grandUnits = 0;
  let grandOmzet = 0;

  allSas.forEach((sa) => {
    let rowStr = `${sa}`;
    let saU = 0;
    let saO = 0;
    for (let w = 1; w <= 5; w++) {
      const list = (cellOrders[sa] && cellOrders[sa][w]) || [];
      const u = list.length;
      const o = list.reduce((sum, g) => sum + (Number(g.grandTotal) || 0), 0);
      weekUnits[w] += u;
      weekOmzet[w] += o;
      saU += u;
      saO += o;
      rowStr += `\t${u}\t${o}`;
    }
    grandUnits += saU;
    grandOmzet += saO;
    rowStr += `\t${saU}\t${saO}\n`;
    tsv += rowStr;
  });

  // Baris Total
  let totalRow = `TOTAL`;
  for (let w = 1; w <= 5; w++) {
    totalRow += `\t${weekUnits[w]}\t${weekOmzet[w]}`;
  }
  totalRow += `\t${grandUnits}\t${grandOmzet}\n`;
  tsv += totalRow;

  // Baris Cutoff
  let cutoffRow = `CUTOFF`;
  for (let w = 1; w <= 5; w++) {
    cutoffRow += `\t${weeks[w - 1].startLabel}\t`;
  }
  cutoffRow += `\t${monthName} ${year}\t\n`;
  tsv += cutoffRow;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('📋 Tabel Laporan Mingguan berhasil disalin ke clipboard! Silakan paste (Ctrl+V) langsung di Excel.');
    }).catch(() => {
      fallbackCopyText(tsv);
    });
  } else {
    fallbackCopyText(tsv);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('📋 Tabel Laporan Mingguan berhasil disalin ke clipboard!');
  } catch (e) {
    showToast('Gagal menyalin otomatis, silakan coba lagi.', true);
  }
  document.body.removeChild(ta);
}

/**
 * Mencetak Laporan Mingguan Kabeng
 */
function printKabengReport() {
  window.print();
}

