// ======== JUMPUPクエスト Service Worker ========
// キャッシュしない設定（常に最新ファイルを取得）

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // 古いキャッシュを全て削除
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // GETリクエストのみ処理
  if (e.request.method !== 'GET') return;
  
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

  // 全ファイルをネットワークから取得（キャッシュしない）
  e.respondWith(
    fetch(e.request).catch(() => new Response('offline', { status: 503 }))
  );
});

// ======== オフライン入力同期 ========
const GAS_URL = 'https://script.google.com/macros/s/AKfycbylpcb5Apcve7j06th8Lh0XB7w-bTfXDwKfT2CA_MBBr0-I0aVSniIkXw9Hy2cRCWCHdg/exec';

self.addEventListener('sync', e => {
  if (e.tag === 'sync-chars') {
    e.waitUntil(syncPendingChars());
  }
});

async function syncPendingChars() {
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
