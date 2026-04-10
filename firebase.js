// ======== FIREBASE ========
// GASと並走する形でFirestoreにデータを保存・読み込みする
// 認証：匿名ログインでユーザーを識別

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCVDRhFmGKncW0c3TM7zdx-wiYkzgfH3_M",
  authDomain: "jumpuppupquest.firebaseapp.com",
  projectId: "jumpuppupquest",
  storageBucket: "jumpuppupquest.firebasestorage.app",
  messagingSenderId: "830728135743",
  appId: "1:830728135743:web:c79422603586f97092048a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let fbReady = false;

// 匿名ログイン
async function fbInit() {
  try {
    await signInAnonymously(auth);
    fbReady = true;
    console.log('Firebase: 匿名ログイン完了');
    return true;
  } catch(e) {
    console.warn('Firebase: 初期化失敗', e);
    return false;
  }
}

// 全キャラ取得
async function fbGetAll() {
  if(!fbReady) return null;
  try {
    const snap = await getDocs(collection(db, 'chars'));
    const result = [];
    snap.forEach(d => result.push(d.data()));
    return result;
  } catch(e) {
    console.warn('fbGetAll error', e);
    return null;
  }
}

// キャラ保存（id をドキュメントキーに使用）
async function fbSaveChar(char) {
  if(!fbReady || !char?.id) return;
  try {
    await setDoc(doc(db, 'chars', char.id), char);
  } catch(e) {
    console.warn('fbSaveChar error', e);
  }
}

// キャラ削除
async function fbDeleteChar(charId) {
  if(!fbReady || !charId) return;
  try {
    await deleteDoc(doc(db, 'chars', charId));
  } catch(e) {
    console.warn('fbDeleteChar error', e);
  }
}

export { fbInit, fbGetAll, fbSaveChar, fbDeleteChar, fbReady };
