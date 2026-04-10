// ======== FIREBASE ========
// 設定はindex.htmlのmeta要素から読み込む（APIキーをJSファイルに直書きしない）

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// index.htmlのmeta要素からFirebase設定を読み込む
function getFirebaseConfig() {
  const get = name => document.querySelector(`meta[name="fb-${name}"]`)?.content || '';
  return {
    apiKey:            get('api-key'),
    authDomain:        get('auth-domain'),
    projectId:         get('project-id'),
    storageBucket:     get('storage-bucket'),
    messagingSenderId: get('messaging-sender-id'),
    appId:             get('app-id'),
  };
}

let app, auth, db;
let fbReady = false;

async function fbInit() {
  try {
    const config = getFirebaseConfig();
    if(!config.apiKey) throw new Error('Firebase設定が見つかりません');
    app  = initializeApp(config);
    auth = getAuth(app);
    db   = getFirestore(app);
    await signInAnonymously(auth);
    fbReady = true;
    console.log('Firebase: 匿名ログイン完了');
    return true;
  } catch(e) {
    console.warn('Firebase: 初期化失敗', e);
    return false;
  }
}

async function fbGetAll() {
  if(!fbReady) return null;
  try {
    const snap = await getDocs(collection(db, 'chars'));
    const result = [];
    snap.forEach(d => result.push(d.data()));
    return result;
  } catch(e) { console.warn('fbGetAll error', e); return null; }
}

async function fbSaveChar(char) {
  if(!fbReady || !char?.id) return;
  try { await setDoc(doc(db, 'chars', char.id), char); }
  catch(e) { console.warn('fbSaveChar error', e); }
}

async function fbDeleteChar(charId) {
  if(!fbReady || !charId) return;
  try { await deleteDoc(doc(db, 'chars', charId)); }
  catch(e) { console.warn('fbDeleteChar error', e); }
}

export { fbInit, fbGetAll, fbSaveChar, fbDeleteChar };
