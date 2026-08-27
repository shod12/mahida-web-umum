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


/* =========================================================
   MENU SEMENTARA
   ========================================================= */

function handleMenuClick_(
  menu
) {

  const labels = {
    stock:
      'Persediaan',

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
