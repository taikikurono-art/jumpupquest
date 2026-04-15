// ======== JUMPUPクエスト Service Worker ========
const CACHE_NAME = 'jumpupquest-20260415-1245';
const STATIC_ASSETS = [
  '/jumpupquest/',
  '/jumpupquest/index.html',
  '/jumpupquest/style.css',
  '/jumpupquest/main_optimized_cleaned.js',
  '/jumpupquest/firebase.js',
  '/jumpupquest/manifest.json',
  '/jumpupquest/embedded_image_1.png',
  '/jumpupquest/sprite_1.webp',
  '/jumpupquest/sprite_2.webp',
  '/jumpupquest/sprite_3.webp',
  '/jumpupquest/sprite_4.webp',
  '/jumpupquest/sprite_5.webp',
  '/jumpupquest/sprite_6.webp',
  '/jumpupquest/sprite_7.webp',
  '/jumpupquest/sprite_8.webp',
  '/jumpupquest/sprite_9.webp',
  '/jumpupquest/sprite_10.webp',
  '/jumpupquest/sprite_11.webp',
];

// インストール時：静的ファイルをキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// フェッチ：キャッシュ優先（静的）/ ネットワーク優先（API）
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // GAS・Firebase・YouTube は常にネットワーク
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('youtu.be')
  ) {
    e.respondWith(fetch(e.request).catch(() => new Response('offline', { status: 503 })));
    return;
  }

  // 静的ファイル：キャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/jumpupquest/'));
    })
  );
});

// ======== オフライン入力同期 ========
// オンライン復帰時にペンディングデータをGASへ送信
const GAS_URL = 'https://script.google.com/macros/s/AKfycbylpcb5Apcve7j06th8Lh0XB7w-bTfXDwKfT2CA_MBBr0-I0aVSniIkXw9Hy2cRCWCHdg/exec';

self.addEventListener('sync', e => {
  if (e.tag === 'sync-chars') {
    e.waitUntil(syncPendingChars());
  }
});

async function syncPendingChars() {
  // ペンディングデータはIndexedDBに保存（main.jsから登録）
  const pending = await getPendingFromIDB();
  if (!pending || pending.length === 0) return;

  for (const item of pending) {
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(item),
        headers: { 'Content-Type': 'text/plain' }
      });
      await removePendingFromIDB(item.id);
    } catch (e) {
      console.warn('同期失敗（次回再試行）:', e);
    }
  }
}

// IndexedDB helpers
function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('jumpupquest', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e);
  });
}
async function getPendingFromIDB() {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('pending', 'readonly');
    const req = tx.objectStore('pending').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });
}
async function removePendingFromIDB(id) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('pending', 'readwrite');
    tx.objectStore('pending').delete(id);
    tx.oncomplete = res;
    tx.onerror = rej;
  });
}
