'use strict';

/* =========================================================
   MAHIDA WEB UMUM — PWA + RUDDER CONTROLLER V1
   UI-only enhancement. Existing transaction functions remain the source
   of truth and are called directly without replacing their logic.
   ========================================================= */

let mahidaDeferredInstallPrompt_ = null;

function mahidaIsStandalone_() {
  return (
    window.matchMedia &&
    window.matchMedia('(display-mode: standalone)').matches
  ) || window.navigator.standalone === true;
}

function mahidaCreateRudderUi_() {
  const home = document.getElementById('homeScreen');
  const content = home && home.querySelector('.home-content');

  if (!home || !content || document.getElementById('mahidaRudder')) {
    return;
  }

  const firstSection = content.querySelector('.section-heading');

  if (firstSection) {
    firstSection.style.display = 'none';
  }

  const welcome = document.createElement('section');
  welcome.className = 'mahida-warm-welcome';
  welcome.setAttribute('aria-label', 'Sambutan Koperasi Mahida');
  welcome.innerHTML = `
    <span class="eyebrow">KOPERASI MAHIDA</span>
    <h2>Sugeng rawuh 👋</h2>
    <p>
      Mugi dinten menika lancar, kabutuhan sampeyan gampang ditemokake,
      lan saben transaksi nggawa manfaat lan keberkahan.
    </p>
    <div class="mahida-quick-hint">
      <span class="mahida-quick-hint-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7V4h3"/><path d="M17 4h3v3"/><path d="M20 17v3h-3"/><path d="M7 20H4v-3"/>
          <rect x="7" y="7" width="4" height="4" rx=".4"/>
          <rect x="13" y="7" width="4" height="4" rx=".4"/>
          <rect x="7" y="13" width="4" height="4" rx=".4"/>
          <path d="M14 14h3v3h-2v-1"/>
        </svg>
      </span>
      <span>Gunakake tombol Scan ing tengah kanggo transaksi QR Santri kanthi luwih cepet.</span>
    </div>
  `;

  content.insertBefore(welcome, content.firstChild);

  const installCard = document.createElement('section');
  installCard.id = 'mahidaInstallCard';
  installCard.className = 'mahida-install-card';
  installCard.innerHTML = `
    <div class="mahida-install-copy">
      <strong>Pasang Koperasi Mahida</strong>
      <small>Bukak kaya aplikasi tanpa kolom alamat Chrome.</small>
    </div>
    <button id="mahidaInstallButton" class="mahida-install-button" type="button">
      Install
    </button>
  `;

  welcome.insertAdjacentElement('afterend', installCard);

  const rudder = document.createElement('nav');
  rudder.id = 'mahidaRudder';
  rudder.className = 'mahida-rudder';
  rudder.setAttribute('aria-label', 'Navigasi layanan Mahida');
  rudder.innerHTML = `
    <div class="mahida-rudder-inner">
      <button class="mahida-rudder-item" type="button" data-rudder="stock" aria-label="Persediaan">
        <span class="mahida-rudder-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z"/><path d="M4 7.5V16.5L12 21l8-4.5V7.5"/><path d="M12 12v9"/></svg>
        </span>
        <span>Persediaan</span>
      </button>

      <button class="mahida-rudder-item mahida-rudder-scan" type="button" data-rudder="scan" aria-label="Scan QR Santri">
        <span class="mahida-rudder-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 8V4h4"/><path d="M16 4h4v4"/><path d="M20 16v4h-4"/><path d="M8 20H4v-4"/><rect x="7" y="7" width="4" height="4"/><rect x="13" y="7" width="4" height="4"/><rect x="7" y="13" width="4" height="4"/><path d="M14 14h3v3h-2v-1"/></svg>
        </span>
        <span>Scan</span>
      </button>

      <button class="mahida-rudder-item" type="button" data-rudder="sales" aria-label="Penjualan">
        <span class="mahida-rudder-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="10" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></svg>
        </span>
        <span>Penjualan</span>
      </button>
    </div>
  `;

  home.appendChild(rudder);

  rudder.querySelectorAll('[data-rudder]').forEach(function (button) {
    button.addEventListener('click', function () {
      const target = String(button.dataset.rudder || '');

      if (target === 'stock' && typeof window.showStockScreen_ === 'function') {
        window.showStockScreen_();
      } else if (target === 'scan' && typeof window.showScanScreen_ === 'function') {
        window.showScanScreen_();
      } else if (target === 'sales' && typeof window.showSalesScreen_ === 'function') {
        window.showSalesScreen_();
      }
    });
  });

  const installButton = document.getElementById('mahidaInstallButton');
  if (installButton) {
    installButton.addEventListener('click', mahidaInstallApp_);
  }

  mahidaSyncInstallUi_();
}

function mahidaSyncInstallUi_() {
  const card = document.getElementById('mahidaInstallCard');
  if (!card) return;

  const canInstall = !!mahidaDeferredInstallPrompt_ && !mahidaIsStandalone_();
  card.classList.toggle('is-visible', canInstall);
}

async function mahidaInstallApp_() {
  if (!mahidaDeferredInstallPrompt_) {
    mahidaSyncInstallUi_();
    return;
  }

  const promptEvent = mahidaDeferredInstallPrompt_;
  mahidaDeferredInstallPrompt_ = null;

  try {
    promptEvent.prompt();
    await promptEvent.userChoice;
  } catch (error) {
    console.warn('Install Mahida tidak dapat dijalankan:', error);
  }

  mahidaSyncInstallUi_();
}

function mahidaRegisterServiceWorker_() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(function (error) {
        console.warn('Service Worker Mahida gagal didaftarkan:', error);
      });
  });
}

window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault();
  mahidaDeferredInstallPrompt_ = event;
  mahidaSyncInstallUi_();
});

window.addEventListener('appinstalled', function () {
  mahidaDeferredInstallPrompt_ = null;
  mahidaSyncInstallUi_();
});

document.addEventListener('DOMContentLoaded', function () {
  mahidaCreateRudderUi_();
  mahidaRegisterServiceWorker_();
});
