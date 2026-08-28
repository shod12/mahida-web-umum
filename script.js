'use strict';

/* =========================================================
   MAHIDA WEB UMUM V2 FINAL
   ========================================================= */

const MAHIDA_PUBLIC_APP_VERSION = 'MAHIDA_WEB_UMUM_V2_1';

const MAHIDA_PUBLIC_STORAGE = {
  EMAIL: 'mahida_public_email',
  DEVICE_ID: 'mahida_public_device_id',
  LAST_DRAFT: 'mahida_public_last_draft_v2'
};

const SPLASH_DURATION_MS = 1200;
const STOCK_REFRESH_INTERVAL_MS = 15000;
const DRAFT_STATUS_POLL_MS = 8000;

const MAHIDA_PUBLIC_BRIDGE_URL =
  'https://script.google.com/macros/s/AKfycbzzm1txakGC5DQTidoQr3UdPNi4k9y8YDn9UNokKXhmJ6Lj9xyPseKd2kaJ2nL_qU2KEw/exec';

const MAHIDA_PUBLIC_BRIDGE_REQUEST =
  'MAHIDA_PUBLIC_BRIDGE_REQUEST_V1';
const MAHIDA_PUBLIC_BRIDGE_RESPONSE =
  'MAHIDA_PUBLIC_BRIDGE_RESPONSE_V1';
const MAHIDA_PUBLIC_BRIDGE_READY =
  'MAHIDA_PUBLIC_BRIDGE_READY_V1';

const PUBLIC_BRIDGE_READY_TIMEOUT_MS = 12000;
const PUBLIC_BRIDGE_REQUEST_TIMEOUT_MS = 30000;

const MAHIDA_QR_SCANNER_URL =
  'https://shod12.github.io/mahida-qr-scanner/';
const MAHIDA_QR_SCANNER_ORIGIN =
  'https://shod12.github.io';
const MAHIDA_QR_SCAN_MESSAGE_TYPE =
  'MAHIDA_SANTRI_QR_SCAN_V1';
const MAHIDA_QR_SCAN_ACK_TYPE =
  'MAHIDA_SANTRI_QR_SCAN_ACK_V1';


/* =========================================================
   STATE
   ========================================================= */

let publicBridgeReady_ = false;
let publicBridgeOrigin_ = '';
let publicBridgeWindow_ = null;
let publicBridgeInitStarted_ = false;
const publicBridgePending_ = new Map();

let stockItems_ = [];
let stockUpdatedAtValue_ = '';
let stockRefreshTimer_ = null;
let stockRequestRunning_ = false;

let catalogItems_ = [];
let catalogUpdatedAt_ = 0;
let catalogRequest_ = null;

let scanStudent_ = null;
let scanTicket_ = '';
let scanCart_ = [];
let scanSubmitRequestId_ = '';
let scannerSession_ = '';
let scannerWindow_ = null;
let scannerProcessing_ = false;

let salesCart_ = [];
let salesSubmitRequestId_ = '';

let currentDraftRef_ = null;
let draftPollTimer_ = null;
let draftStatusBusy_ = false;
let currentDraftResolved_ = false;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function byId_(id) {
  return document.getElementById(id);
}

function setText_(id, value) {
  const element = byId_(id);
  if (element) {
    element.textContent = String(value == null ? '' : value);
  }
}

function setHidden_(id, hidden) {
  const element = byId_(id);
  if (element) {
    element.classList.toggle('hidden', !!hidden);
  }
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRupiah_(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatNumberId_(value) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function errorText_(error) {
  return String(
    error && error.message
      ? error.message
      : error || 'Terjadi kesalahan.'
  )
    .replace(/^Error:\s*/, '')
    .trim();
}


/* =========================================================
   STARTUP
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  ensureDeviceId_();
  restoreSavedEmail_();
  renderHomeMenu_();
  bindUiEvents_();
  initPublicBridge_();
  renderRecentDraftCard_();

  window.addEventListener('message', handleExternalQrMessage_);

  window.setTimeout(function () {
    showWelcomeScreen_();
  }, SPLASH_DURATION_MS);
});


function bindUiEvents_() {
  byId_('continueButton')?.addEventListener('click', handleContinue_);
  byId_('userEmail')?.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      handleContinue_();
    }
  });
  byId_('userEmail')?.addEventListener('input', function () {
    setText_('emailMessage', '');
  });

  byId_('changeEmailButton')?.addEventListener('click', changePublicEmail_);

  byId_('stockBackButton')?.addEventListener('click', showHomeFromCurrentEmail_);
  byId_('stockRefreshButton')?.addEventListener('click', function () {
    loadPublicStock_(true);
  });
  byId_('stockSearchInput')?.addEventListener('input', renderStockList_);

  byId_('scanBackButton')?.addEventListener('click', showHomeFromCurrentEmail_);
  byId_('startSantriScanButton')?.addEventListener('click', startSantriScanner_);
  byId_('rescanSantriButton')?.addEventListener('click', function () {
    resetScanFlow_();
    startSantriScanner_();
  });
  byId_('scanProductSearch')?.addEventListener('input', function () {
    renderProductPicker_('scan');
  });
  byId_('submitScanDraftButton')?.addEventListener('click', submitScanDraft_);

  byId_('salesBackButton')?.addEventListener('click', showHomeFromCurrentEmail_);
  byId_('salesProductSearch')?.addEventListener('input', function () {
    renderProductPicker_('sales');
  });
  byId_('salesBuyerName')?.addEventListener('input', function () {
    salesSubmitRequestId_ = '';
    renderCart_('sales');
  });
  byId_('salesPaymentMethod')?.addEventListener('change', function () {
    salesSubmitRequestId_ = '';
  });
  byId_('submitSalesDraftButton')?.addEventListener('click', submitSalesDraft_);

  byId_('draftStatusBackButton')?.addEventListener('click', leaveDraftStatusToHome_);
  byId_('draftStatusHomeButton')?.addEventListener('click', leaveDraftStatusToHome_);
  byId_('thankYouHomeButton')?.addEventListener('click', leaveDraftStatusToHome_);
  byId_('draftStatusRefreshButton')?.addEventListener('click', function () {
    refreshCurrentDraftStatus_(true);
  });

  byId_('recentDraftCard')?.addEventListener('click', function () {
    const draft = readRecentDraft_();
    if (draft) {
      openDraftStatusScreen_(draft);
    }
  });

  window.addEventListener('beforeunload', function () {
    stopStockRefresh_();
    stopDraftPolling_();
  });
}


/* =========================================================
   SCREEN NAVIGATION
   ========================================================= */

function hideAllScreens_() {
  [
    'splashScreen',
    'welcomeScreen',
    'homeScreen',
    'stockScreen',
    'scanScreen',
    'salesScreen',
    'draftStatusScreen'
  ].forEach(function (id) {
    byId_(id)?.classList.add('hidden');
  });
}


function stopPageTimers_() {
  stopStockRefresh_();
  stopDraftPolling_();
}


function showWelcomeScreen_() {
  stopPageTimers_();
  hideAllScreens_();
  byId_('welcomeScreen')?.classList.remove('hidden');

  window.setTimeout(function () {
    byId_('userEmail')?.focus();
  }, 180);
}


function showHomeScreen_(email) {
  stopPageTimers_();
  hideAllScreens_();
  setText_('currentUserEmail', email || '-');
  byId_('homeScreen')?.classList.remove('hidden');
  renderRecentDraftCard_();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


function showHomeFromCurrentEmail_() {
  showHomeScreen_(getCurrentEmail_());
}


function showStockScreen_() {
  stopPageTimers_();
  hideAllScreens_();
  byId_('stockScreen')?.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'auto' });
  loadPublicStock_(false);
  startStockRefresh_();
}


async function showScanScreen_() {
  stopPageTimers_();
  hideAllScreens_();
  byId_('scanScreen')?.classList.remove('hidden');
  resetScanFlow_();
  window.scrollTo({ top: 0, behavior: 'auto' });
}


async function showSalesScreen_() {
  stopPageTimers_();
  hideAllScreens_();
  byId_('salesScreen')?.classList.remove('hidden');
  resetSalesFlow_();
  window.scrollTo({ top: 0, behavior: 'auto' });

  try {
    await loadCatalogForTransaction_(true);
    renderProductPicker_('sales');
  } catch (error) {
    showMiniState_('sales', errorText_(error), true);
  }
}


/* =========================================================
   EMAIL / DEVICE
   ========================================================= */

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function handleContinue_() {
  const input = byId_('userEmail');
  const email = normalizeEmail_(input?.value);

  if (!isValidEmail_(email)) {
    setText_('emailMessage', 'Mangga lebokna alamat email sing bener.');
    input?.focus();
    return;
  }

  try {
    localStorage.setItem(MAHIDA_PUBLIC_STORAGE.EMAIL, email);
  } catch (error) {
    // Tetap lanjut bila storage diblokir.
  }

  showHomeScreen_(email);
}


function restoreSavedEmail_() {
  let email = '';

  try {
    email = String(localStorage.getItem(MAHIDA_PUBLIC_STORAGE.EMAIL) || '');
  } catch (error) {
    email = '';
  }

  if (email && byId_('userEmail')) {
    byId_('userEmail').value = email;
  }
}


function getCurrentEmail_() {
  const visible = normalizeEmail_(byId_('currentUserEmail')?.textContent);
  if (isValidEmail_(visible)) {
    return visible;
  }

  const input = normalizeEmail_(byId_('userEmail')?.value);
  if (isValidEmail_(input)) {
    return input;
  }

  try {
    return normalizeEmail_(localStorage.getItem(MAHIDA_PUBLIC_STORAGE.EMAIL));
  } catch (error) {
    return '';
  }
}


function changePublicEmail_() {
  stopPageTimers_();

  try {
    localStorage.removeItem(MAHIDA_PUBLIC_STORAGE.EMAIL);
  } catch (error) {
    // Abaikan.
  }

  if (byId_('userEmail')) {
    byId_('userEmail').value = '';
  }

  setText_('emailMessage', '');
  showWelcomeScreen_();
}


function ensureDeviceId_() {
  let existing = '';

  try {
    existing = String(localStorage.getItem(MAHIDA_PUBLIC_STORAGE.DEVICE_ID) || '');
  } catch (error) {
    existing = '';
  }

  if (existing && /^[A-Za-z0-9._:-]{8,120}$/.test(existing)) {
    return existing;
  }

  const newId = createDeviceId_();

  try {
    localStorage.setItem(MAHIDA_PUBLIC_STORAGE.DEVICE_ID, newId);
  } catch (error) {
    // Abaikan.
  }

  return newId;
}


function createDeviceId_() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return 'WEB-' + window.crypto.randomUUID().toUpperCase();
  }

  return (
    'WEB-' +
    Date.now() +
    '-' +
    Math.random().toString(36).slice(2).toUpperCase()
  );
}


function makeClientRequestId_() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return 'PUB-' + window.crypto.randomUUID();
  }

  return (
    'PUB-' +
    Date.now() +
    '-' +
    Math.random().toString(36).slice(2)
  );
}


/* =========================================================
   HOME MENU
   ========================================================= */

function renderHomeMenu_() {
  const container = byId_('homeMenu');
  if (!container) return;

  container.innerHTML = `
    <button type="button" class="home-menu-card" data-menu="stock">
      <span class="home-menu-icon">📦</span>
      <span class="home-menu-copy">
        <strong>Persediaan</strong>
        <small>Cek stok lan Harga Santri</small>
      </span>
      <span class="home-menu-arrow">›</span>
    </button>

    <button type="button" class="home-menu-card" data-menu="scan">
      <span class="home-menu-icon">📷</span>
      <span class="home-menu-copy">
        <strong>Scan Santri</strong>
        <small>Transaksi nganggo QR Santri</small>
      </span>
      <span class="home-menu-arrow">›</span>
    </button>

    <button type="button" class="home-menu-card" data-menu="sales">
      <span class="home-menu-icon">🛒</span>
      <span class="home-menu-copy">
        <strong>Penjualan</strong>
        <small>Penjualan nganggo Harga Santri</small>
      </span>
      <span class="home-menu-arrow">›</span>
    </button>
  `;

  container.querySelectorAll('[data-menu]').forEach(function (button) {
    button.addEventListener('click', function () {
      const menu = String(button.dataset.menu || '');

      if (menu === 'stock') {
        showStockScreen_();
      } else if (menu === 'scan') {
        showScanScreen_();
      } else if (menu === 'sales') {
        showSalesScreen_();
      }
    });
  });
}


/* =========================================================
   PUBLIC BRIDGE
   ========================================================= */

function isTrustedPublicBridgeOrigin_(origin) {
  try {
    const url = new URL(String(origin || ''));
    const hostname = String(url.hostname || '').toLowerCase();

    return (
      url.protocol === 'https:' &&
      (
        hostname === 'script.google.com' ||
        hostname.endsWith('script.googleusercontent.com')
      )
    );
  } catch (error) {
    return false;
  }
}


function initPublicBridge_() {
  const frame = byId_('publicBridgeFrame');

  if (!frame || publicBridgeInitStarted_) {
    return;
  }

  publicBridgeInitStarted_ = true;
  publicBridgeReady_ = false;
  publicBridgeOrigin_ = '';
  publicBridgeWindow_ = null;

  window.addEventListener('message', handlePublicBridgeMessage_);

  frame.src =
    MAHIDA_PUBLIC_BRIDGE_URL +
    '?page=public-bridge&v=' +
    encodeURIComponent(MAHIDA_PUBLIC_APP_VERSION);
}


function handlePublicBridgeMessage_(event) {
  const message = event.data;

  if (!message || typeof message !== 'object') {
    return;
  }

  /*
   * HtmlService memakai iframe sandbox internal Google.
   * READY bisa datang dari child frame googleusercontent, bukan
   * langsung dari publicBridgeFrame.contentWindow.
   */
  if (message.type === MAHIDA_PUBLIC_BRIDGE_READY) {
    if (!isTrustedPublicBridgeOrigin_(event.origin)) {
      return;
    }

    if (!event.source || typeof event.source.postMessage !== 'function') {
      return;
    }

    publicBridgeWindow_ = event.source;
    publicBridgeOrigin_ = String(event.origin || '');
    publicBridgeReady_ = true;
    return;
  }

  if (message.type !== MAHIDA_PUBLIC_BRIDGE_RESPONSE) {
    return;
  }

  if (
    !publicBridgeWindow_ ||
    event.source !== publicBridgeWindow_ ||
    event.origin !== publicBridgeOrigin_
  ) {
    return;
  }

  const requestId = String(message.requestId || '');
  const pending = publicBridgePending_.get(requestId);

  if (!pending) {
    return;
  }

  window.clearTimeout(pending.timeoutId);
  publicBridgePending_.delete(requestId);

  const response = message.response;

  if (!response || response.ok !== true) {
    pending.reject(
      new Error(
        response && response.error && response.error.message
          ? response.error.message
          : 'Layanan Mahida tidak memberikan jawaban yang valid.'
      )
    );
    return;
  }

  pending.resolve(response.data);
}


function waitForPublicBridgeReady_() {
  if (
    publicBridgeReady_ &&
    publicBridgeWindow_ &&
    publicBridgeOrigin_
  ) {
    return Promise.resolve();
  }

  initPublicBridge_();

  return new Promise(function (resolve, reject) {
    const startedAt = Date.now();

    const timer = window.setInterval(function () {
      if (
        publicBridgeReady_ &&
        publicBridgeWindow_ &&
        publicBridgeOrigin_
      ) {
        window.clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt >= PUBLIC_BRIDGE_READY_TIMEOUT_MS) {
        window.clearInterval(timer);
        reject(
          new Error(
            'Koneksi menyang server Mahida durung siap. Priksa internet banjur coba maneh.'
          )
        );
      }
    }, 100);
  });
}


async function publicBridgeRequest_(action, payload) {
  await waitForPublicBridgeReady_();

  if (
    !publicBridgeWindow_ ||
    !publicBridgeOrigin_
  ) {
    throw new Error('Public Bridge Mahida tidak tersedia.');
  }

  const requestId = makeClientRequestId_();

  return new Promise(function (resolve, reject) {
    const timeoutId = window.setTimeout(function () {
      publicBridgePending_.delete(requestId);
      reject(
        new Error(
          'Server Mahida suwe nanggapi. Priksa internet banjur coba maneh.'
        )
      );
    }, PUBLIC_BRIDGE_REQUEST_TIMEOUT_MS);

    publicBridgePending_.set(requestId, {
      resolve: resolve,
      reject: reject,
      timeoutId: timeoutId
    });

    publicBridgeWindow_.postMessage(
      {
        type: MAHIDA_PUBLIC_BRIDGE_REQUEST,
        requestId: requestId,
        action: action,
        payload: payload || {}
      },
      publicBridgeOrigin_
    );
  });
}


/* =========================================================
   STOCK
   ========================================================= */

async function loadPublicStock_(force) {
  if (stockRequestRunning_ && !force) {
    return;
  }

  stockRequestRunning_ = true;
  setHidden_('stockLoading', false);
  setHidden_('stockError', true);

  try {
    const data = await publicBridgeRequest_('public.stock.list', {});

    stockItems_ = data && Array.isArray(data.items) ? data.items : [];
    stockUpdatedAtValue_ = data && data.updatedAt ? data.updatedAt : '';

    setText_('stockUpdatedAt', formatUpdatedAt_(stockUpdatedAtValue_));
    renderStockList_();

  } catch (error) {
    setText_('stockError', errorText_(error));
    setHidden_('stockError', false);
    stockItems_ = [];
    renderStockList_();

  } finally {
    setHidden_('stockLoading', true);
    stockRequestRunning_ = false;
  }
}


function renderStockList_() {
  const container = byId_('stockList');
  if (!container) return;

  const query = String(byId_('stockSearchInput')?.value || '')
    .trim()
    .toLowerCase();

  const filtered = stockItems_.filter(function (item) {
    if (!query) return true;
    return (
      String(item.code || '').toLowerCase().includes(query) ||
      String(item.name || '').toLowerCase().includes(query)
    );
  });

  setHidden_('stockEmpty', filtered.length !== 0);

  container.innerHTML = filtered.map(function (item) {
    const stock = Math.max(0, Number(item.stock) || 0);
    const out = stock <= 0;

    return `
      <article class="stock-card">
        <h3 class="stock-card-name">${escapeHtml_(item.name || '-')}</h3>
        <p class="stock-card-code">${escapeHtml_(item.code || '-')}</p>

        <div class="stock-card-info">
          <div class="stock-info-box">
            <span class="stock-info-label">Stok</span>
            <strong class="stock-info-value ${out ? 'out' : ''}">
              ${out ? 'Habis' : formatNumberId_(stock)}
            </strong>
          </div>

          <div class="stock-info-box">
            <span class="stock-info-label">Harga Santri</span>
            <strong class="stock-info-value">
              ${escapeHtml_(formatRupiah_(item.studentPrice))}
            </strong>
          </div>
        </div>
      </article>
    `;
  }).join('');
}


function startStockRefresh_() {
  stopStockRefresh_();
  stockRefreshTimer_ = window.setInterval(function () {
    if (!byId_('stockScreen')?.classList.contains('hidden')) {
      loadPublicStock_(false);
    }
  }, STOCK_REFRESH_INTERVAL_MS);
}


function stopStockRefresh_() {
  if (stockRefreshTimer_) {
    window.clearInterval(stockRefreshTimer_);
  }
  stockRefreshTimer_ = null;
}


function formatUpdatedAt_(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}


/* =========================================================
   CATALOG / PRODUCT PICKER
   ========================================================= */

async function loadCatalogForTransaction_(force) {
  const fresh =
    catalogItems_.length > 0 &&
    Date.now() - catalogUpdatedAt_ < 12000;

  if (!force && fresh) {
    return catalogItems_;
  }

  if (catalogRequest_) {
    return catalogRequest_;
  }

  catalogRequest_ = publicBridgeRequest_('public.stock.list', {})
    .then(function (data) {
      catalogItems_ = data && Array.isArray(data.items) ? data.items : [];
      catalogUpdatedAt_ = Date.now();
      return catalogItems_;
    })
    .finally(function () {
      catalogRequest_ = null;
    });

  return catalogRequest_;
}


function getModeCart_(mode) {
  return mode === 'scan' ? scanCart_ : salesCart_;
}


function getModeSearchValue_(mode) {
  return String(
    byId_(mode === 'scan' ? 'scanProductSearch' : 'salesProductSearch')?.value || ''
  )
    .trim()
    .toLowerCase();
}


function showMiniState_(mode, message, isError) {
  const id = mode === 'scan' ? 'scanProductState' : 'salesProductState';
  const element = byId_(id);
  if (!element) return;

  element.textContent = String(message || '');
  element.classList.toggle('error', !!isError);
  element.classList.toggle('hidden', !message);
}


function renderProductPicker_(mode) {
  const container = byId_(mode === 'scan' ? 'scanProductList' : 'salesProductList');
  if (!container) return;

  const query = getModeSearchValue_(mode);
  const cart = getModeCart_(mode);
  const cartCodes = new Set(cart.map(function (item) { return item.code; }));

  let rows = catalogItems_.filter(function (item) {
    if (!query) return true;
    const haystack = (String(item.code || '') + ' ' + String(item.name || '')).toLowerCase();
    return haystack.includes(query);
  });

  rows = rows.slice(0, 30);

  showMiniState_(
    mode,
    catalogItems_.length && rows.length === 0
      ? 'Barang ora ditemokake.'
      : '',
    false
  );

  container.innerHTML = rows.map(function (item) {
    const stock = Math.max(0, Number(item.stock) || 0);
    const price = Math.max(0, Number(item.studentPrice) || 0);
    const selected = cartCodes.has(String(item.code || ''));
    const disabled = stock <= 0 || price <= 0 || selected;

    return `
      <article class="product-picker-card ${stock <= 0 ? 'out' : ''}">
        <div class="product-picker-main">
          <strong>${escapeHtml_(item.name || '-')}</strong>
          <small>${escapeHtml_(item.code || '-')}</small>
          <div class="product-picker-meta">
            <span>Stok ${formatNumberId_(stock)}</span>
            <span>${escapeHtml_(formatRupiah_(price))}</span>
          </div>
        </div>

        <button
          type="button"
          class="product-add-button"
          data-add-product="${escapeHtml_(item.code || '')}"
          ${disabled ? 'disabled' : ''}
        >
          ${selected ? 'Dipilih' : stock <= 0 ? 'Habis' : 'Tambah'}
        </button>
      </article>
    `;
  }).join('');

  container.querySelectorAll('[data-add-product]').forEach(function (button) {
    button.addEventListener('click', function () {
      addProductToCart_(mode, button.dataset.addProduct);
    });
  });
}


function addProductToCart_(mode, code) {
  const cart = getModeCart_(mode);
  const product = catalogItems_.find(function (item) {
    return String(item.code || '') === String(code || '');
  });

  if (!product || Number(product.stock) <= 0 || Number(product.studentPrice) <= 0) {
    return;
  }

  if (cart.some(function (item) { return item.code === product.code; })) {
    return;
  }

  cart.push({
    code: String(product.code || ''),
    name: String(product.name || ''),
    stock: Math.max(0, Number(product.stock) || 0),
    price: Math.max(0, Number(product.studentPrice) || 0),
    qty: 1
  });

  resetModeRequestId_(mode);
  renderCart_(mode);
  renderProductPicker_(mode);
}


function updateCartQty_(mode, code, delta) {
  const cart = getModeCart_(mode);
  const item = cart.find(function (row) { return row.code === code; });
  if (!item) return;

  const next = Math.max(1, Math.min(item.stock, item.qty + delta));

  if (next !== item.qty) {
    item.qty = next;
    resetModeRequestId_(mode);
    renderCart_(mode);
  }
}


function removeCartItem_(mode, code) {
  if (mode === 'scan') {
    scanCart_ = scanCart_.filter(function (item) { return item.code !== code; });
  } else {
    salesCart_ = salesCart_.filter(function (item) { return item.code !== code; });
  }

  resetModeRequestId_(mode);
  renderCart_(mode);
  renderProductPicker_(mode);
}


function resetModeRequestId_(mode) {
  if (mode === 'scan') {
    scanSubmitRequestId_ = '';
  } else {
    salesSubmitRequestId_ = '';
  }
}


function renderCart_(mode) {
  const cart = getModeCart_(mode);
  const prefix = mode === 'scan' ? 'scan' : 'sales';
  const list = byId_(prefix + 'CartList');
  const empty = byId_(prefix + 'CartEmpty');
  const count = byId_(prefix + 'CartCount');
  const totalElement = byId_(prefix + 'CartTotal');
  const submit = byId_(mode === 'scan' ? 'submitScanDraftButton' : 'submitSalesDraftButton');

  if (!list) return;

  const total = cart.reduce(function (sum, item) {
    return sum + Number(item.price) * Number(item.qty);
  }, 0);

  if (empty) empty.classList.toggle('hidden', cart.length > 0);
  if (count) count.textContent = cart.length + ' barang';
  if (totalElement) totalElement.textContent = formatRupiah_(total);

  list.innerHTML = cart.map(function (item) {
    return `
      <article class="cart-item">
        <div class="cart-item-head">
          <strong>${escapeHtml_(item.name || '-')}</strong>
          <button
            type="button"
            class="cart-remove-button"
            data-cart-remove="${escapeHtml_(item.code)}"
            aria-label="Hapus"
          >×</button>
        </div>

        <div class="cart-item-sub">
          <span>${escapeHtml_(item.code)}</span>
          <span>${escapeHtml_(formatRupiah_(item.price))} • stok ${formatNumberId_(item.stock)}</span>
        </div>

        <div class="cart-item-bottom">
          <div class="qty-control">
            <button type="button" data-cart-minus="${escapeHtml_(item.code)}">−</button>
            <strong>${formatNumberId_(item.qty)}</strong>
            <button type="button" data-cart-plus="${escapeHtml_(item.code)}" ${item.qty >= item.stock ? 'disabled' : ''}>+</button>
          </div>

          <strong class="cart-item-subtotal">
            ${escapeHtml_(formatRupiah_(Number(item.price) * Number(item.qty)))}
          </strong>
        </div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('[data-cart-remove]').forEach(function (button) {
    button.addEventListener('click', function () {
      removeCartItem_(mode, button.dataset.cartRemove);
    });
  });

  list.querySelectorAll('[data-cart-minus]').forEach(function (button) {
    button.addEventListener('click', function () {
      updateCartQty_(mode, button.dataset.cartMinus, -1);
    });
  });

  list.querySelectorAll('[data-cart-plus]').forEach(function (button) {
    button.addEventListener('click', function () {
      updateCartQty_(mode, button.dataset.cartPlus, 1);
    });
  });

  if (submit) {
    if (mode === 'scan') {
      submit.disabled = !scanStudent_ || !scanTicket_ || cart.length === 0;
    } else {
      submit.disabled =
        cart.length === 0 ||
        String(byId_('salesBuyerName')?.value || '').trim().length < 2;
    }
  }
}


function cartPayload_(mode) {
  return getModeCart_(mode).map(function (item) {
    return {
      productCode: item.code,
      qty: Number(item.qty)
    };
  });
}


function cartTotal_(mode) {
  return getModeCart_(mode).reduce(function (sum, item) {
    return sum + Number(item.price) * Number(item.qty);
  }, 0);
}


/* =========================================================
   SCAN SANTRI
   ========================================================= */

function resetScanFlow_() {
  scanStudent_ = null;
  scanTicket_ = '';
  scanCart_ = [];
  scanSubmitRequestId_ = '';
  scannerProcessing_ = false;

  setHidden_('scanStartCard', false);
  setHidden_('scanIdentityCard', true);
  setHidden_('scanOrderArea', true);
  setText_('scanMessage', '');

  if (byId_('scanProductSearch')) {
    byId_('scanProductSearch').value = '';
  }

  renderCart_('scan');
}


function createScannerSession_() {
  if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
    throw new Error('Browser ora ndhukung sesi scanner sing aman.');
  }

  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(function (value) {
      return value.toString(16).padStart(2, '0');
    })
    .join('');
}


function startSantriScanner_() {
  if (scannerWindow_ && !scannerWindow_.closed) {
    try {
      scannerWindow_.focus();
    } catch (error) {
      // Abaikan.
    }
    return;
  }

  try {
    scannerSession_ = createScannerSession_();
  } catch (error) {
    setScanMessage_(errorText_(error), true);
    return;
  }

  const url = new URL(MAHIDA_QR_SCANNER_URL);
  url.searchParams.set('session', scannerSession_);
  url.searchParams.set('mode', 'single');
  url.searchParams.set('client', 'web');

  scannerWindow_ = window.open(
    url.toString(),
    'MahidaQrScanner',
    'popup=yes,width=560,height=820'
  );

  if (!scannerWindow_) {
    scannerSession_ = '';
    setScanMessage_(
      'Scanner ora bisa dibukak. Izinkan pop-up kanggo situs Mahida banjur coba maneh.',
      true
    );
    return;
  }

  setScanMessage_('Scanner dibukak. Mangga arahake kamera menyang QR Santri.', false);
}


async function handleExternalQrMessage_(event) {
  if (event.origin !== MAHIDA_QR_SCANNER_ORIGIN) return;
  if (!scannerWindow_ || event.source !== scannerWindow_) return;

  const data = event.data;

  if (!data || data.type !== MAHIDA_QR_SCAN_MESSAGE_TYPE) return;
  if (String(data.session || '') !== scannerSession_) return;

  const rawToken = String(data.token || '').trim();

  if (!/^MHQ1\.[0-9a-f]{96}$/.test(rawToken)) {
    sendScannerAck_(false, 'Format QR Santri tidak valid.');
    return;
  }

  if (scannerProcessing_) return;
  scannerProcessing_ = true;
  setScanMessage_('QR terbaca. Lagi diverifikasi menyang server Mahida...', false);

  try {
    const result = await publicBridgeRequest_('public.qr.identify', {
      rawToken: rawToken,
      senderEmail: getCurrentEmail_(),
      deviceId: ensureDeviceId_()
    });

    if (!result || !result.santri || !result.scanTicket) {
      throw new Error('Hasil verifikasi QR belum lengkap.');
    }

    scanStudent_ = result.santri;
    scanTicket_ = String(result.scanTicket || '');
    scanCart_ = [];
    scanSubmitRequestId_ = '';

    renderScanIdentity_();
    sendScannerAck_(true, 'QR berhasil diverifikasi. Bali menyang Web Umum Mahida.');

    scannerSession_ = '';
    window.setTimeout(function () {
      scannerWindow_ = null;
    }, 1200);

    setScanMessage_('QR Santri berhasil diverifikasi.', false, true);

    showMiniState_('scan', 'Memuat barang lan stok paling anyar...', false);
    await loadCatalogForTransaction_(true);
    showMiniState_('scan', '', false);
    renderProductPicker_('scan');
    renderCart_('scan');
    setHidden_('scanOrderArea', false);

  } catch (error) {
    const message = errorText_(error);
    sendScannerAck_(false, message);
    setScanMessage_(message, true);

  } finally {
    scannerProcessing_ = false;
  }
}


function sendScannerAck_(success, message) {
  if (!scannerWindow_ || scannerWindow_.closed || !scannerSession_) {
    return;
  }

  try {
    scannerWindow_.postMessage(
      {
        type: MAHIDA_QR_SCAN_ACK_TYPE,
        session: scannerSession_,
        success: success === true,
        message: String(message || '')
      },
      MAHIDA_QR_SCANNER_ORIGIN
    );
  } catch (error) {
    // Scanner tetap bisa ditutup manual.
  }
}


function renderScanIdentity_() {
  if (!scanStudent_) return;

  setText_('scanStudentName', scanStudent_.namaSantri || '-');
  setText_('scanStudentId', scanStudent_.idSantri || '-');
  setText_('scanStudentClass', scanStudent_.namaKelas || '-');
  setHidden_('scanIdentityCard', false);
  setHidden_('scanStartCard', true);
}


function setScanMessage_(message, isError, isSuccess) {
  const element = byId_('scanMessage');
  if (!element) return;

  element.textContent = String(message || '');
  element.classList.toggle('error', !!isError);
  element.classList.toggle('success', !!isSuccess);
}


async function submitScanDraft_() {
  const button = byId_('submitScanDraftButton');

  if (!scanStudent_ || !scanTicket_ || !scanCart_.length) {
    setScanMessage_('Scan Santri lan keranjang kudu lengkap dhisik.', true);
    return;
  }

  const email = getCurrentEmail_();
  if (!isValidEmail_(email)) {
    showWelcomeScreen_();
    return;
  }

  scanSubmitRequestId_ = scanSubmitRequestId_ || makeClientRequestId_();

  if (button) {
    button.disabled = true;
    button.textContent = 'Ngirim Draft...';
  }

  try {
    const result = await publicBridgeRequest_('public.qr.draft.create', {
      senderEmail: email,
      deviceId: ensureDeviceId_(),
      appVersion: MAHIDA_PUBLIC_APP_VERSION,
      clientRequestId: scanSubmitRequestId_,
      scanTicket: scanTicket_,
      items: cartPayload_('scan')
    });

    scanTicket_ = '';

    const ref = makeDraftReference_(result, cartTotal_('scan'));
    saveRecentDraft_(ref);
    openDraftStatusScreen_(ref);

  } catch (error) {
    setScanMessage_(errorText_(error), true);
    if (button) button.disabled = false;

  } finally {
    if (button) {
      button.textContent = 'Kirim ke Admin';
      renderCart_('scan');
    }
  }
}


/* =========================================================
   SALES
   ========================================================= */

function resetSalesFlow_() {
  salesCart_ = [];
  salesSubmitRequestId_ = '';
  setText_('salesDraftMessage', '');

  if (byId_('salesBuyerName')) byId_('salesBuyerName').value = '';
  if (byId_('salesPaymentMethod')) byId_('salesPaymentMethod').value = 'Tunai';
  if (byId_('salesProductSearch')) byId_('salesProductSearch').value = '';

  renderCart_('sales');
}


function setSalesDraftMessage_(message, isError, isSuccess) {
  const element = byId_('salesDraftMessage');
  if (!element) return;

  element.textContent = String(message || '');
  element.classList.toggle('error', !!isError);
  element.classList.toggle('success', !!isSuccess);
}


async function submitSalesDraft_() {
  const button = byId_('submitSalesDraftButton');
  const buyerName = String(byId_('salesBuyerName')?.value || '').trim();
  const paymentMethod = String(byId_('salesPaymentMethod')?.value || '').trim();
  const email = getCurrentEmail_();

  if (buyerName.length < 2) {
    setSalesDraftMessage_('Nama pembeli kudu diisi.', true);
    byId_('salesBuyerName')?.focus();
    return;
  }

  if (!salesCart_.length) {
    setSalesDraftMessage_('Pilih minimal siji barang.', true);
    return;
  }

  if (!['Tunai', 'Transfer'].includes(paymentMethod)) {
    setSalesDraftMessage_('Metode pembayaran ora valid.', true);
    return;
  }

  if (!isValidEmail_(email)) {
    showWelcomeScreen_();
    return;
  }

  salesSubmitRequestId_ = salesSubmitRequestId_ || makeClientRequestId_();

  if (button) {
    button.disabled = true;
    button.textContent = 'Ngirim Draft...';
  }

  setSalesDraftMessage_('Draft lagi dikirim menyang Admin...', false);

  try {
    const result = await publicBridgeRequest_('public.sale.draft.create', {
      senderEmail: email,
      deviceId: ensureDeviceId_(),
      appVersion: MAHIDA_PUBLIC_APP_VERSION,
      clientRequestId: salesSubmitRequestId_,
      buyerName: buyerName,
      paymentMethod: paymentMethod,
      items: cartPayload_('sales')
    });

    const ref = makeDraftReference_(result, cartTotal_('sales'));
    saveRecentDraft_(ref);
    openDraftStatusScreen_(ref);

  } catch (error) {
    setSalesDraftMessage_(errorText_(error), true);
    if (button) button.disabled = false;

  } finally {
    if (button) {
      button.textContent = 'Kirim ke Admin';
      renderCart_('sales');
    }
  }
}


/* =========================================================
   RECENT DRAFT STORAGE
   ========================================================= */

function makeDraftReference_(result, fallbackTotal) {
  const data = result || {};

  if (!data.draftId || !data.accessKey) {
    throw new Error('Server durung ngirim kunci status Draft.');
  }

  return {
    draftId: String(data.draftId || ''),
    accessKey: String(data.accessKey || ''),
    type: String(data.type || ''),
    status: String(data.status || 'MENUNGGU PERSETUJUAN'),
    totalSnapshot: Number(
      data.summary && data.summary.total != null
        ? data.summary.total
        : fallbackTotal
    ) || 0,
    email: getCurrentEmail_(),
    deviceId: ensureDeviceId_(),
    createdAt: String(data.createdAt || new Date().toISOString())
  };
}


function saveRecentDraft_(draft) {
  try {
    localStorage.setItem(
      MAHIDA_PUBLIC_STORAGE.LAST_DRAFT,
      JSON.stringify(draft || {})
    );
  } catch (error) {
    // Status tetap bisa dibuka di sesi aktif.
  }
}


function readRecentDraft_() {
  let parsed = null;

  try {
    const raw = localStorage.getItem(MAHIDA_PUBLIC_STORAGE.LAST_DRAFT);
    parsed = raw ? JSON.parse(raw) : null;
  } catch (error) {
    parsed = null;
  }

  if (!parsed || !parsed.draftId || !parsed.accessKey) {
    return null;
  }

  if (
    normalizeEmail_(parsed.email) !== normalizeEmail_(getCurrentEmail_()) ||
    String(parsed.deviceId || '') !== String(ensureDeviceId_())
  ) {
    return null;
  }

  return parsed;
}


function clearRecentDraft_() {
  try {
    localStorage.removeItem(MAHIDA_PUBLIC_STORAGE.LAST_DRAFT);
  } catch (error) {
    // Abaikan.
  }
}


function renderRecentDraftCard_() {
  const container = byId_('recentDraftCard');
  if (!container) return;

  const draft = readRecentDraft_();

  if (!draft) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const typeLabel = draft.type === 'PENJUALAN_UMUM'
    ? 'Penjualan'
    : 'QR Santri';

  container.innerHTML = `
    <strong>⌛ Cek status Draft terakhir</strong>
    <span>${escapeHtml_(draft.draftId)} • ${escapeHtml_(typeLabel)}</span>
    <small>Tap kanggo mriksa keputusan Admin.</small>
  `;
  container.classList.remove('hidden');
}


/* =========================================================
   DRAFT STATUS
   ========================================================= */

function openDraftStatusScreen_(draftRef) {
  currentDraftRef_ = Object.assign({}, draftRef || {});
  currentDraftResolved_ = false;
  stopPageTimers_();
  hideAllScreens_();
  byId_('draftStatusScreen')?.classList.remove('hidden');

  setHidden_('thankYouCard', true);
  setHidden_('draftStatusCard', false);
  renderDraftStatusWaiting_();
  window.scrollTo({ top: 0, behavior: 'auto' });

  refreshCurrentDraftStatus_(false);
  startDraftPolling_();
}


function renderDraftStatusWaiting_() {
  const card = byId_('draftStatusCard');
  if (card) card.className = 'draft-status-card waiting';

  setText_('draftStatusIcon', '⌛');
  setText_('draftStatusLabel', 'MENUNGGU PERSETUJUAN');
  setText_('draftStatusTitle', 'Draft wis dikirim menyang Admin');
  setText_(
    'draftStatusMessage',
    'Mangga ngenteni. Sistem bakal mriksa status kanthi otomatis.'
  );
  setText_('draftStatusId', currentDraftRef_?.draftId || '-');
  setText_('draftStatusTotal', formatRupiah_(currentDraftRef_?.totalSnapshot || 0));
  setText_('draftStatusSubtitle', 'Menunggu keputusan Admin');
  setHidden_('draftDecisionInfo', true);
}


async function refreshCurrentDraftStatus_(manual) {
  if (!currentDraftRef_ || draftStatusBusy_) return;

  draftStatusBusy_ = true;

  if (manual) {
    setText_('draftStatusMessage', 'Lagi mriksa status paling anyar...');
  }

  try {
    const result = await publicBridgeRequest_('public.draft.status', {
      draftId: currentDraftRef_.draftId,
      accessKey: currentDraftRef_.accessKey,
      senderEmail: currentDraftRef_.email,
      deviceId: currentDraftRef_.deviceId
    });

    currentDraftRef_.status = result.status || currentDraftRef_.status;
    currentDraftRef_.invoice = result.invoice || '';
    currentDraftRef_.rejectionReason = result.rejectionReason || '';
    currentDraftRef_.finalTotal = Number(result.finalTotal) || 0;
    saveRecentDraft_(currentDraftRef_);

    renderDraftStatusResult_(result);

  } catch (error) {
    if (manual) {
      setText_(
        'draftStatusMessage',
        'Status durung bisa dipriksa: ' + errorText_(error)
      );
    }

  } finally {
    draftStatusBusy_ = false;
  }
}


function renderDraftStatusResult_(result) {
  const status = String(result && result.status || '').trim();

  if (
    status === 'MENUNGGU PERSETUJUAN' ||
    status === 'SEDANG DIPROSES'
  ) {
    const processing = status === 'SEDANG DIPROSES';
    const card = byId_('draftStatusCard');
    if (card) card.className = 'draft-status-card waiting';

    setText_('draftStatusIcon', processing ? '⚙️' : '⌛');
    setText_('draftStatusLabel', status);
    setText_(
      'draftStatusTitle',
      processing ? 'Draft lagi diproses Admin' : 'Draft isih ngenteni Admin'
    );
    setText_(
      'draftStatusMessage',
      processing
        ? 'Admin wis miwiti proses. Aja ngirim Draft kaping pindho.'
        : 'Mangga ngenteni. Status iki bakal dipriksa maneh kanthi otomatis.'
    );
    return;
  }

  if (status === 'DISETUJUI') {
    currentDraftResolved_ = true;
    stopDraftPolling_();
    setHidden_('draftStatusCard', true);
    setHidden_('thankYouCard', false);
    setText_('thankYouInvoice', result.invoice || '-');
    setText_('draftStatusSubtitle', 'Transaksi wis disetujui');
    return;
  }

  if (status === 'DITOLAK') {
    currentDraftResolved_ = true;
    stopDraftPolling_();

    const card = byId_('draftStatusCard');
    if (card) card.className = 'draft-status-card rejected';

    setText_('draftStatusIcon', '×');
    setText_('draftStatusLabel', 'DITOLAK');
    setText_('draftStatusTitle', 'Draft durung bisa diproses');
    setText_(
      'draftStatusMessage',
      'Admin nolak Draft iki. Ora ana transaksi resmi lan stok ora dikurangi.'
    );
    setText_('draftStatusSubtitle', 'Draft ditolak Admin');

    const info = byId_('draftDecisionInfo');
    if (info) {
      info.textContent = result.rejectionReason
        ? 'Alasan Admin: ' + result.rejectionReason
        : 'Admin ora menehi alasan tambahan.';
      info.classList.remove('hidden');
    }
  }
}


function startDraftPolling_() {
  stopDraftPolling_();

  draftPollTimer_ = window.setInterval(function () {
    if (
      currentDraftRef_ &&
      !byId_('draftStatusScreen')?.classList.contains('hidden') &&
      !currentDraftResolved_
    ) {
      refreshCurrentDraftStatus_(false);
    }
  }, DRAFT_STATUS_POLL_MS);
}


function stopDraftPolling_() {
  if (draftPollTimer_) {
    window.clearInterval(draftPollTimer_);
  }
  draftPollTimer_ = null;
}


function leaveDraftStatusToHome_() {
  if (currentDraftResolved_) {
    clearRecentDraft_();
  }

  currentDraftRef_ = null;
  currentDraftResolved_ = false;
  stopDraftPolling_();
  showHomeFromCurrentEmail_();
}
