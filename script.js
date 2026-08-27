'use strict';

/* =========================================================
   MAHIDA WEB UMUM
   App Shell V1
   ========================================================= */

const MAHIDA_PUBLIC_STORAGE = {
  EMAIL: 'mahida_public_email',
  DEVICE_ID: 'mahida_public_device_id'
};

const SPLASH_DURATION_MS = 1400;
const MAHIDA_PUBLIC_API_URL =
  'https://script.google.com/macros/s/AKfycbxhZ3pheGsa1Y5asHnBqIe99sQMDUdPKsICJSHaqHB3cj51FJY4tmmAUTsTju22Zssi9g/exec';


const STOCK_REFRESH_INTERVAL_MS =
  15000;


let stockItems_ = [];

let stockRefreshTimer_ =
  null;

let stockRequestRunning_ =
  false;

/* =========================================================
   ELEMENT
   ========================================================= */

const splashScreen =
  document.getElementById(
    'splashScreen'
  );

const welcomeScreen =
  document.getElementById(
    'welcomeScreen'
  );

const homeScreen =
  document.getElementById(
    'homeScreen'
  );

const userEmailInput =
  document.getElementById(
    'userEmail'
  );

const emailMessage =
  document.getElementById(
    'emailMessage'
  );

const continueButton =
  document.getElementById(
    'continueButton'
  );

const currentUserEmail =
  document.getElementById(
    'currentUserEmail'
  );

const homeMenu =
  document.getElementById(
    'homeMenu'
  );

const stockScreen =
  document.getElementById(
    'stockScreen'
  );

const stockBackButton =
  document.getElementById(
    'stockBackButton'
  );

const stockRefreshButton =
  document.getElementById(
    'stockRefreshButton'
  );

const stockUpdatedAt =
  document.getElementById(
    'stockUpdatedAt'
  );

const stockSearchInput =
  document.getElementById(
    'stockSearchInput'
  );

const stockLoading =
  document.getElementById(
    'stockLoading'
  );

const stockError =
  document.getElementById(
    'stockError'
  );

const stockEmpty =
  document.getElementById(
    'stockEmpty'
  );

const stockList =
  document.getElementById(
    'stockList'
  );


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  function () {

    ensureDeviceId_();

    restoreSavedEmail_();

    renderHomeMenu_();

    window.setTimeout(
      function () {
        showWelcomeScreen_();
      },
      SPLASH_DURATION_MS
    );
  }
);


/* =========================================================
   SCREEN
   ========================================================= */

function hideAllScreens_() {

  splashScreen
    ?.classList
    .add('hidden');

  welcomeScreen
    ?.classList
    .add('hidden');

  homeScreen
    ?.classList
    .add('hidden');

   stockScreen
  ?.classList
  .add('hidden');
}


function showWelcomeScreen_() {

  hideAllScreens_();

  welcomeScreen
    ?.classList
    .remove('hidden');

  window.setTimeout(
    function () {

      userEmailInput
        ?.focus();

    },
    250
  );
}


function showHomeScreen_(
  email
) {

  hideAllScreens_();

  if (
    currentUserEmail
  ) {
    currentUserEmail.textContent =
      email;
  }

  homeScreen
    ?.classList
    .remove('hidden');

  window.scrollTo(
    {
      top: 0,
      behavior: 'smooth'
    }
  );
}


/* =========================================================
   EMAIL
   ========================================================= */

continueButton
  ?.addEventListener(
    'click',
    handleContinue_
  );


userEmailInput
  ?.addEventListener(
    'keydown',
    function (event) {

      if (
        event.key ===
        'Enter'
      ) {
        handleContinue_();
      }
    }
  );


userEmailInput
  ?.addEventListener(
    'input',
    function () {

      clearEmailMessage_();
    }
  );


function handleContinue_() {

  const email =
    normalizeEmail_(
      userEmailInput?.value
    );

  if (
    !isValidEmail_(
      email
    )
  ) {

    showEmailMessage_(
      'Mangga lebokna alamat email sing bener.'
    );

    userEmailInput
      ?.focus();

    return;
  }

  saveEmail_(
    email
  );

  showHomeScreen_(
    email
  );
}


function normalizeEmail_(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}


function isValidEmail_(
  email
) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      email
    );
}


function saveEmail_(
  email
) {

  try {

    localStorage.setItem(
      MAHIDA_PUBLIC_STORAGE.EMAIL,
      email
    );

  } catch (error) {

    // Web tetap dapat digunakan
    // walaupun storage browser diblokir.
  }
}


function restoreSavedEmail_() {

  let savedEmail = '';

  try {

    savedEmail =
      String(
        localStorage.getItem(
          MAHIDA_PUBLIC_STORAGE.EMAIL
        ) || ''
      );

  } catch (error) {

    savedEmail = '';
  }

  if (
    userEmailInput &&
    savedEmail
  ) {

    userEmailInput.value =
      savedEmail;
  }
}


function showEmailMessage_(
  message
) {

  if (
    !emailMessage
  ) {
    return;
  }

  emailMessage.textContent =
    String(
      message || ''
    );
}


function clearEmailMessage_() {

  showEmailMessage_(
    ''
  );
}


/* =========================================================
   DEVICE / BROWSER ID

   Ini BUKAN password.

   Fungsinya nanti untuk membedakan
   transaksi dari browser/perangkat
   yang berbeda.
   ========================================================= */

function ensureDeviceId_() {

  let existing = '';

  try {

    existing =
      String(
        localStorage.getItem(
          MAHIDA_PUBLIC_STORAGE.DEVICE_ID
        ) || ''
      );

  } catch (error) {

    existing = '';
  }

  if (
    existing
  ) {
    return existing;
  }

  const newId =
    createDeviceId_();

  try {

    localStorage.setItem(
      MAHIDA_PUBLIC_STORAGE.DEVICE_ID,
      newId
    );

  } catch (error) {

    // Abaikan bila browser
    // tidak mengizinkan localStorage.
  }

  return newId;
}


function createDeviceId_() {

  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      'function'
  ) {

    return (
      'WEB-' +
      window.crypto
        .randomUUID()
        .toUpperCase()
    );
  }

  const randomPart =
    Math.random()
      .toString(36)
      .slice(2)
      .toUpperCase();

  return (
    'WEB-' +
    Date.now() +
    '-' +
    randomPart
  );
}


/* =========================================================
   HOME MENU

   Untuk saat ini tombol hanya
   menyiapkan struktur halaman.
   Fitur sesungguhnya kita sambungkan
   tahap demi tahap.
   ========================================================= */

function renderHomeMenu_() {

  if (
    !homeMenu
  ) {
    return;
  }

  homeMenu.innerHTML = `
    <button
      type="button"
      class="home-menu-card"
      data-menu="stock"
    >
      <span class="home-menu-icon">
        📦
      </span>

      <span class="home-menu-copy">
        <strong>
          Persediaan
        </strong>

        <small>
          Cek stok lan rega santri
        </small>
      </span>

      <span class="home-menu-arrow">
        ›
      </span>
    </button>


    <button
      type="button"
      class="home-menu-card"
      data-menu="scan"
    >
      <span class="home-menu-icon">
        📷
      </span>

      <span class="home-menu-copy">
        <strong>
          Scan Santri
        </strong>

        <small>
          Transaksi nganggo QR santri
        </small>
      </span>

      <span class="home-menu-arrow">
        ›
      </span>
    </button>


    <button
      type="button"
      class="home-menu-card"
      data-menu="sales"
    >
      <span class="home-menu-icon">
        🛒
      </span>

      <span class="home-menu-copy">
        <strong>
          Penjualan
        </strong>

        <small>
          Penjualan nganggo rega santri
        </small>
      </span>

      <span class="home-menu-arrow">
        ›
      </span>
    </button>
  `;

  homeMenu
    .querySelectorAll(
      '[data-menu]'
    )
    .forEach(
      function (
        button
      ) {

        button.addEventListener(
          'click',
          function () {

            handleMenuClick_(
              button.dataset.menu
            );
          }
        );
      }
    );
}


function handleMenuClick_(
  menu
) {

  if (
    menu ===
    'stock'
  ) {

    showStockScreen_();

    return;
  }


  const labels = {
    scan:
      'Scan Santri',

    sales:
      'Penjualan'
  };

  const label =
    labels[menu] ||
    'Layanan';

  window.alert(
    label +
    ' bakal diaktifake ing tahap sabanjure.'
  );
}

/* =========================================================
   PERSEDIAAN
   ========================================================= */

function showStockScreen_() {

  hideAllScreens_();

  stockScreen
    ?.classList
    .remove('hidden');

  window.scrollTo(
    {
      top: 0,
      behavior: 'auto'
    }
  );

  loadPublicStock_();

  startStockAutoRefresh_();
}


function leaveStockScreen_() {

  stopStockAutoRefresh_();

  const email =
    normalizeEmail_(
      userEmailInput?.value
    );

  showHomeScreen_(
    email
  );
}


stockBackButton
  ?.addEventListener(
    'click',
    leaveStockScreen_
  );


stockRefreshButton
  ?.addEventListener(
    'click',
    function () {

      loadPublicStock_(
        true
      );
    }
  );


stockSearchInput
  ?.addEventListener(
    'input',
    function () {

      renderStockItems_();
    }
  );


function startStockAutoRefresh_() {

  stopStockAutoRefresh_();

  stockRefreshTimer_ =
    window.setInterval(
      function () {

        if (
          !stockScreen
            ?.classList
            .contains(
              'hidden'
            )
        ) {

          loadPublicStock_(
            false
          );
        }

      },
      STOCK_REFRESH_INTERVAL_MS
    );
}


function stopStockAutoRefresh_() {

  if (
    stockRefreshTimer_
  ) {

    window.clearInterval(
      stockRefreshTimer_
    );

    stockRefreshTimer_ =
      null;
  }
}


async function loadPublicStock_(
  manualRefresh = false
) {

  if (
    stockRequestRunning_
  ) {
    return;
  }

  stockRequestRunning_ =
    true;

  setStockLoading_(
    true,
    manualRefresh
  );

  clearStockError_();

  try {

    /*
     * Content-Type text/plain sengaja dipakai.
     *
     * Ini membuat request dari GitHub Pages
     * tetap sederhana dan tidak membutuhkan
     * preflight CORS khusus.
     */
    const response =
      await fetch(
        MAHIDA_PUBLIC_API_URL,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'text/plain;charset=UTF-8'
          },

          body:
            JSON.stringify(
              {
                action:
                  'public.stock.list'
              }
            )
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        'Server Mahida tidak dapat dihubungi.'
      );
    }


    const payload =
      await response.json();


    if (
      payload.ok !==
      true
    ) {

      throw new Error(
        payload?.error?.message ||
        'Data persediaan belum dapat dimuat.'
      );
    }


    const data =
      payload.data || {};


    stockItems_ =
      Array.isArray(
        data.items
      )
        ? data.items
        : [];


    updateStockTimestamp_(
      data.updatedAt
    );


    renderStockItems_();

  } catch (error) {

    showStockError_(
      error?.message ||
      'Gagal memuat persediaan.'
    );

  } finally {

    stockRequestRunning_ =
      false;

    setStockLoading_(
      false,
      manualRefresh
    );
  }
}


function renderStockItems_() {

  if (
    !stockList
  ) {
    return;
  }


  const query =
    String(
      stockSearchInput?.value ||
      ''
    )
      .trim()
      .toLowerCase();


  const filtered =
    stockItems_
      .filter(
        function (
          item
        ) {

          if (
            !query
          ) {
            return true;
          }


          const haystack =
            (
              String(
                item.name ||
                ''
              ) +
              ' ' +
              String(
                item.code ||
                ''
              )
            )
              .toLowerCase();


          return (
            haystack.indexOf(
              query
            ) !== -1
          );
        }
      );


  if (
    stockEmpty
  ) {

    stockEmpty
      .classList
      .toggle(
        'hidden',
        filtered.length !== 0
      );
  }


  stockList.innerHTML =
    filtered
      .map(
        function (
          item
        ) {

          const stock =
            Math.max(
              0,
              Number(
                item.stock
              ) || 0
            );


          const studentPrice =
            Math.max(
              0,
              Number(
                item.studentPrice
              ) || 0
            );


          return `
            <article
              class="stock-card"
            >

              <h3
                class="stock-card-name"
              >
                ${escapeHtml_(
                  item.name
                )}
              </h3>

              <p
                class="stock-card-code"
              >
                ${escapeHtml_(
                  item.code
                )}
              </p>


              <div
                class="stock-card-info"
              >

                <div
                  class="stock-info-box"
                >

                  <span
                    class="stock-info-label"
                  >
                    Stok tersedia
                  </span>

                  <strong
                    class="
                      stock-info-value
                      ${
                        stock <= 0
                          ? 'out'
                          : ''
                      }
                    "
                  >
                    ${
                      formatNumberId_(
                        stock
                      )
                    }
                  </strong>

                </div>


                <div
                  class="stock-info-box"
                >

                  <span
                    class="stock-info-label"
                  >
                    Harga Santri
                  </span>

                  <strong
                    class="stock-info-value"
                  >
                    ${
                      formatRupiah_(
                        studentPrice
                      )
                    }
                  </strong>

                </div>

              </div>

            </article>
          `;
        }
      )
      .join('');
}


function setStockLoading_(
  loading,
  manualRefresh
) {

  if (
    stockLoading
  ) {

    stockLoading
      .classList
      .toggle(
        'hidden',
        !loading ||
        stockItems_.length > 0
      );
  }


  if (
    stockRefreshButton
  ) {

    stockRefreshButton
      .classList
      .toggle(
        'is-loading',
        loading
      );

    stockRefreshButton.disabled =
      loading;
  }
}


function updateStockTimestamp_(
  value
) {

  if (
    !stockUpdatedAt
  ) {
    return;
  }


  const date =
    value
      ? new Date(
          value
        )
      : new Date();


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    stockUpdatedAt.textContent =
      '-';

    return;
  }


  stockUpdatedAt.textContent =
    new Intl
      .DateTimeFormat(
        'id-ID',
        {
          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit'
        }
      )
      .format(
        date
      );
}


function showStockError_(
  message
) {

  if (
    !stockError
  ) {
    return;
  }


  stockError.textContent =
    String(
      message || ''
    );


  stockError
    .classList
    .remove(
      'hidden'
    );
}


function clearStockError_() {

  if (
    !stockError
  ) {
    return;
  }


  stockError.textContent =
    '';


  stockError
    .classList
    .add(
      'hidden'
    );
}


function formatRupiah_(
  value
) {

  return (
    'Rp' +
    new Intl
      .NumberFormat(
        'id-ID'
      )
      .format(
        Number(
          value
        ) || 0
      )
  );
}


function formatNumberId_(
  value
) {

  return new Intl
    .NumberFormat(
      'id-ID'
    )
    .format(
      Number(
        value
      ) || 0
    );
}


function escapeHtml_(
  value
) {

  return String(
    value || ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}
