// ======== FIREBASE ========
// 設定はindex.htmlのmeta要素から読み込む（APIキーをJSファイルに直書きしない）

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, addDoc, query, orderBy, limit, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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


// ======== 技動画URL（Firestoreで全デバイス共有） ========
// Firestoreのコレクション: videos/global ドキュメントに全URL格納
const VIDEOS_DOC_ID = 'global';

async function fbGetVideos() {
  if(!fbReady) return null;
  try {
    const snap = await getDoc(doc(db, 'videos', VIDEOS_DOC_ID));
    return snap.exists() ? snap.data() : {};
  } catch(e) { console.warn('fbGetVideos error', e); return null; }
}

async function fbSaveVideos(videos) {
  if(!fbReady) return;
  try {
    await setDoc(doc(db, 'videos', VIDEOS_DOC_ID), videos);
  } catch(e) { console.warn('fbSaveVideos error', e); }
}


// ======== 全国進捗ログ ========
async function fbPostActivityLog(entry){
  if(!fbReady)return;
  try{
    await addDoc(collection(db,'activity_log'),{
      ...entry,
      ts: Date.now(),
    });
  }catch(e){console.warn('fbPostActivityLog error',e);}
}

function fbWatchActivityLog(callback,limitCount=20){
  if(!fbReady)return ()=>{};
  try{
    const q=query(collection(db,'activity_log'),orderBy('ts','desc'),limit(limitCount));
    return onSnapshot(q,snap=>{
      const logs=[];
      snap.forEach(d=>logs.push(d.data()));
      callback(logs);
    });
  }catch(e){console.warn('fbWatchActivityLog error',e);return ()=>{};}
}

// ======== ギルドイベント ========
async function fbGetEvent(){
  if(!fbReady)return null;
  try{
    const snap=await getDoc(doc(db,'events','current'));
    return snap.exists()?snap.data():null;
  }catch(e){console.warn('fbGetEvent error',e);return null;}
}

async function fbSaveEvent(event){
  if(!fbReady)return;
  try{
    await setDoc(doc(db,'events','current'),event);
  }catch(e){console.warn('fbSaveEvent error',e);}
}

async function fbDeleteEvent(){
  if(!fbReady)return;
  try{
    await deleteDoc(doc(db,'events','current'));
  }catch(e){console.warn('fbDeleteEvent error',e);}
}

function fbWatchEvent(callback){
  if(!fbReady)return ()=>{};
  try{
    return onSnapshot(doc(db,'events','current'),snap=>{
      callback(snap.exists()?snap.data():null);
    });
  }catch(e){console.warn('fbWatchEvent error',e);return ()=>{};}
}


// ======== 動画一括更新（本部管理） ========
async function fbGetVideosByJob(jobKey){
  if(!fbReady) return null;
  try{
    const snap = await getDoc(doc(db, 'videos', jobKey));
    return snap.exists() ? snap.data() : {};
  }catch(e){ console.warn('fbGetVideosByJob error', e); return null; }
}

async function fbSaveVideosBulk(videosObj){
  // videosObj: { '技名': 'URL', ... } を global ドキュメントに一括保存
  if(!fbReady) return;
  try{
    await setDoc(doc(db, 'videos', 'global'), videosObj);
  }catch(e){ console.warn('fbSaveVideosBulk error', e); }
}

// ======== プロフィール写真（Firestoreに保存・全端末共有） ========
async function fbSavePhoto(charId, base64DataUrl) {
  if(!fbReady || !charId) return;
  try {
    await setDoc(doc(db, 'photos', charId), { photo: base64DataUrl, updatedAt: Date.now() });
  } catch(e) { console.warn('fbSavePhoto error', e); }
}

async function fbGetPhoto(charId) {
  if(!fbReady || !charId) return null;
  try {
    const snap = await getDoc(doc(db, 'photos', charId));
    return snap.exists() ? snap.data().photo : null;
  } catch(e) { console.warn('fbGetPhoto error', e); return null; }
}

async function fbGetAllPhotos() {
  if(!fbReady) return {};
  try {
    const snap = await getDocs(collection(db, 'photos'));
    const result = {};
    snap.forEach(d => { result[d.id] = d.data().photo; });
    return result;
  } catch(e) { console.warn('fbGetAllPhotos error', e); return {}; }
}

// ======== アイコン設定（Firestoreに保存・全端末共有） ========
async function fbSaveIcon(charId, setting) {
  if(!fbReady || !charId) return;
  try {
    await setDoc(doc(db, 'icons', charId), { setting, updatedAt: Date.now() });
  } catch(e) { console.warn('fbSaveIcon error', e); }
}

async function fbGetAllIcons() {
  if(!fbReady) return {};
  try {
    const snap = await getDocs(collection(db, 'icons'));
    const result = {};
    snap.forEach(d => { result[d.id] = d.data().setting; });
    return result;
  } catch(e) { console.warn('fbGetAllIcons error', e); return {}; }
}

// ======== 管理者操作ログ ========
async function fbPostAdminLog(entry){
  if(!fbReady)return;
  try{
    await addDoc(collection(db,'admin_log'),{
      ...entry,
      ts: Date.now(),
    });
  }catch(e){console.warn('fbPostAdminLog error',e);}
}

function fbWatchAdminLog(callback,limitCount=50){
  if(!fbReady)return ()=>{};
  try{
    const q=query(collection(db,'admin_log'),orderBy('ts','desc'),limit(limitCount));
    return onSnapshot(q,snap=>{
      const logs=[];
      snap.forEach(d=>logs.push({id:d.id,...d.data()}));
      callback(logs);
    });
  }catch(e){console.warn('fbWatchAdminLog error',e);return ()=>{};}
}
// ======== 先生のイチオシ ========
async function fbGetFeatured() {
  if(!fbReady) return null;
  try {
    const snap = await getDoc(doc(db, 'featured', 'current'));
    return snap.exists() ? snap.data() : null;
  } catch(e) { console.warn('fbGetFeatured error', e); return null; }
}

async function fbSaveFeatured(data) {
  if(!fbReady) return;
  try {
    await setDoc(doc(db, 'featured', 'current'), data);
  } catch(e) { console.warn('fbSaveFeatured error', e); }
}

export { fbInit, fbGetAll, fbSaveChar, fbDeleteChar, fbGetVideos, fbSaveVideos, fbSaveVideosBulk,
  fbPostActivityLog, fbWatchActivityLog,
  fbGetEvent, fbSaveEvent, fbDeleteEvent, fbWatchEvent,
  fbPostAdminLog, fbWatchAdminLog,
  fbSavePhoto, fbGetPhoto, fbGetAllPhotos,
  fbSaveIcon, fbGetAllIcons,
  fbGetFeatured, fbSaveFeatured };
