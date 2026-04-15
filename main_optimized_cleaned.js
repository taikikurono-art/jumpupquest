
// ======== SPRITES ========
// ======== SPRITE IMAGES ========
const SPRITES = {
  'rookie': 'sprite_1.webp',
  'challenger': 'sprite_2.webp',
  'ninja': 'sprite_3.webp',
  'airrider': 'sprite_4.webp',
  'coremaster': 'sprite_5.webp',
  'performer': 'sprite_6.webp',
  'waterflow': 'sprite_7.webp',
  'striker': 'sprite_8.webp',
  'tracerunner': 'sprite_9.webp',
  'airmaster': 'sprite_10.webp',
  'illusionist': 'sprite_11.webp',
};;;;


// ======== GAS + FIREBASE ========
// Firebase連携コード（GASと並走）
let _fb={
  saveChar:()=>Promise.resolve(),
  deleteChar:()=>Promise.resolve(),
  getVideos:()=>Promise.resolve(null),
  saveVideos:()=>Promise.resolve(),
  saveVideosBulk:()=>Promise.resolve(),
  postActivityLog:()=>Promise.resolve(),
  watchActivityLog:()=>()=>{},
  getEvent:()=>Promise.resolve(null),
  saveEvent:()=>Promise.resolve(),
  deleteEvent:()=>Promise.resolve(),
  watchEvent:()=>()=>{},
};
let fbLoaded=false;
async function loadFirebase(){
  if(fbLoaded)return;
  try{
    const m=await import('./firebase.js');
    await m.fbInit();
    _fb={
      saveChar:m.fbSaveChar,
      deleteChar:m.fbDeleteChar,
      getVideos:m.fbGetVideos,
      saveVideos:m.fbSaveVideos,
      saveVideosBulk:m.fbSaveVideosBulk,
      postActivityLog:m.fbPostActivityLog,
      watchActivityLog:m.fbWatchActivityLog,
      getEvent:m.fbGetEvent,
      saveEvent:m.fbSaveEvent,
      deleteEvent:m.fbDeleteEvent,
      watchEvent:m.fbWatchEvent,
    };
    fbLoaded=true;
    const fbChars=await m.fbGetAll();
    if(fbChars&&fbChars.length>0){chars=fbChars;saveChars();showGasStatus('online');console.log('Firebase: '+fbChars.length+'件読み込み');}
    // 動画URLをFirestoreから読み込み（ローカルより優先）
    const fbVideos=await _fb.getVideos();
    if(fbVideos&&Object.keys(fbVideos).length>0){
      localStorage.setItem('jq_videos',JSON.stringify(fbVideos));
      console.log('Firebase: 動画URL '+Object.keys(fbVideos).length+'件読み込み');
    }
    // 全国進捗ログのウォッチ開始
    startActivityLogWatch();
    // ギルドイベントのウォッチ開始
    startEventWatch();
  }catch(e){console.warn('Firebase失敗（GASで継続）',e);}
}

const GAS_URL='https://script.google.com/macros/s/AKfycbylpcb5Apcve7j06th8Lh0XB7w-bTfXDwKfT2CA_MBBr0-I0aVSniIkXw9Hy2cRCWCHdg/exec';
const DEMO=[];
let chars=JSON.parse(localStorage.getItem('jq5')||'null')||[];
let gasReady=false;
let currentUser=null; // ログイン中のキャラ
let prevPage='pg-title'; // もどるボタン用

function saveChars(){localStorage.setItem('jq5',JSON.stringify(chars));}
async function initGAS(){
  if(!GAS_URL){showGasStatus('offline');return;}
  try{
    showGasStatus('loading');
    const res=await fetch(GAS_URL+'?action=getAll');
    const data=await res.json();
    if(data.chars&&data.chars.length>0){chars=data.chars;localStorage.setItem('jq5',JSON.stringify(chars));gasReady=true;showGasStatus('online');}
    else{gasReady=true;showGasStatus('online');}
  }catch(e){console.error('GAS接続エラー:',e);showGasStatus('offline');}
}
function showGasStatus(s){
  const els=['gasStatusTitle','gasStatusAdmin'].map(i=>document.getElementById(i)).filter(Boolean);
  els.forEach(el=>{
    if(s==='online'){el.textContent='🟢 DB連携中';el.style.color='var(--green)';}
    if(s==='offline'){el.textContent='🔴 ローカルモード';el.style.color='var(--pink)';}
    if(s==='loading'){el.textContent='🟡 接続中...';el.style.color='var(--gold)';}
  });
}
async function gasPost(body){
  if(!GAS_URL)return null;
  const res=await fetch(GAS_URL,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'text/plain'}});
  return await res.json();
}
async function saveCharsToGAS(char){
  saveChars();_fb.saveChar(char).catch(()=>{});
  if(!gasReady||!navigator.onLine){
    await addPendingToIDB({action:'saveChar',char});
    showToast('📦 オフライン保存しました（復帰後に同期）');
    return;
  }
  try{await gasPost({action:'saveChar',char});}catch(e){await addPendingToIDB({action:'saveChar',char});}
}
async function saveTestToGAS(char,testDate){
  saveChars();_fb.saveChar(char).catch(()=>{});
  if(!gasReady||!navigator.onLine){
    await addPendingToIDB({action:'saveTest',charId:char.id,charName:char.name,testDate,stats:char.stats,char});
    showToast('📦 オフライン保存しました（復帰後に同期）');
    return;
  }
  try{await gasPost({action:'saveTest',charId:char.id,charName:char.name,testDate,stats:char.stats,char});}
  catch(e){await addPendingToIDB({action:'saveTest',charId:char.id,charName:char.name,testDate,stats:char.stats,char});}
}

// ======== IndexedDB オフライン同期 ========
function openIDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('jumpupquest',1);
    req.onupgradeneeded=e=>{e.target.result.createObjectStore('pending',{keyPath:'id',autoIncrement:true});};
    req.onsuccess=e=>res(e.target.result);
    req.onerror=rej;
  });
}
async function addPendingToIDB(data){
  try{const db=await openIDB();const tx=db.transaction('pending','readwrite');tx.objectStore('pending').add(data);await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=j;});}catch(e){}
}
async function syncPendingData(){
  if(!navigator.onLine||!gasReady)return;
  try{
    const db=await openIDB();
    const items=await new Promise((res,rej)=>{const tx=db.transaction('pending','readonly');const req=tx.objectStore('pending').getAll();req.onsuccess=()=>res(req.result);req.onerror=rej;});
    if(!items||items.length===0)return;
    showToast(`🔄 ${items.length}件のデータを同期中...`);
    for(const item of items){
      const {id,...body}=item;
      try{
        await gasPost(body);
        const db2=await openIDB();const tx=db2.transaction('pending','readwrite');tx.objectStore('pending').delete(id);await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=j;});
      }catch(e){}
    }
    showToast('✅ 同期完了！');
  }catch(e){}
}
// オンライン復帰時に自動同期
window.addEventListener('online',()=>{showToast('🟢 オンラインに復帰しました');syncPendingData();});
window.addEventListener('load',()=>{
  loadFirebase();
  initGAS();
  // タイトルキャラをSPRITES画像でローテーション
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
  let i=0;
  function nextChara(){
    const el=document.getElementById('titleCharaImg');
    if(!el)return;
    const job=jobOrder[i%jobOrder.length];
    if(SPRITES[job]){
      el.style.opacity='0';
      setTimeout(()=>{el.src=SPRITES[job];el.style.opacity='1';},200);
    }
    i++;
  }
  setTimeout(()=>{nextChara();setInterval(nextChara,1400);},300);
});



// ======== JOB DATA ========
const JOBS={
  rookie:     {name:'ルーキー',       charName:'シバッチ', genre:'入門',          emoji:'🐕', color:'#ffb7a0', level:'Lv.1〜3',  desc:'体操の世界に踏み出したばかりの冒険者！まずは基本の動きをしっかり覚えよう。'},
  challenger: {name:'チャレンジャー',  charName:'グラン',   genre:'初級',          emoji:'🐻', color:'#ffe066', level:'Lv.4〜7',  desc:'基本をマスターした挑戦者。ここから6つのジョブへ進化できるぞ！'},
  ninja:      {name:'ニンジャ',        charName:'クロウド', genre:'反射',          emoji:'🦊', color:'#bb33ff', level:'Lv.8〜11', desc:'素早い反射神経と瞬発力を持つ忍者。瞬間的な動きの切れ味が武器！'},
  airrider:   {name:'エア・ライダー',  charName:'ライト',   genre:'跳躍',          emoji:'🐰', color:'#00ccee', level:'Lv.8〜11', desc:'軽やかに空を舞う跳躍の達人。高さとスピードで誰よりも高く飛び上がれ！'},
  coremaster: {name:'コア・マスター',  charName:'ゼン',     genre:'バランス',       emoji:'🐱', color:'#33cc55', level:'Lv.8〜11', desc:'体幹の強さとバランス感覚に優れた達人。倒立や静止技が完璧に決まる！'},
  performer:  {name:'パフォーマー',    charName:'エレナ',   genre:'美しさ',         emoji:'🦢', color:'#ff7722', level:'Lv.8〜11', desc:'美しい動きと表現力を持つアーティスト。ポーズや演技の美しさで観客を魅了する！'},
  waterflow:  {name:'ウォーター・フロー',charName:'リュウ', genre:'柔軟',         emoji:'🦦', color:'#6655ff', level:'Lv.8〜11', desc:'水のように柔らかく流れる動きが特技。しなやかさと流れる美しさが武器！'},
  striker:    {name:'ストライカー',    charName:'ボルト',   genre:'パワー',         emoji:'🦍', color:'#ff3333', level:'Lv.8〜11', desc:'力強いジャンプと爆発的なパワーを持つ戦士。空中技や高さのある技が得意！'},
  tracerunner:{name:'トレース・ランナー',charName:'ソウ',  genre:'パルクール',   emoji:'🐒', color:'#ff5588', level:'Lv.12〜',  desc:'反射×バランスを極めた者がなれる超高速の体術師！壁も障害物も自由自在に駆け抜けろ。'},
  airmaster:  {name:'エアマスター',    charName:'ファルコ', genre:'アクロバット',   emoji:'🦅', color:'#00ffaa', level:'Lv.12〜',  desc:'パワー×跳躍を極めた者だけがなれる究極の空中術師！宙返りや高難度技をマスターしている。'},
  illusionist:{name:'イリュージョニスト',charName:'ミラ',  genre:'新体操',       emoji:'🐿️', color:'#ff88dd', level:'Lv.12〜',  desc:'美しさ×柔軟を極めた者だけがなれる美の頂点。新体操の芸術で観客を魅了する伝説の演者。'},
  next:       {name:'NEXT ?',          charName:'？',       genre:'Coming Soon',   emoji:'❓', color:'#555577', level:'???',       desc:'次のジョブはまだ秘密…。さらなる高みを目指す冒険者に新しいジョブが解放されるかも！？'},
};

// SKILL_MAP: [技名, JOB, x=リスク(低0〜高100), y=難易度(易100〜難0)]
// x軸：左=安全、右=危険　y軸：上=難しい(小)、下=簡単(大)
// PDF完成版（2026-04-08）に準拠 全97技
const SKILL_MAP=[
  // ===== ROOKIE 入門 6技 =====
  ['片手バランス（右左）',             'rookie',  6, 95],
  ['ワンステップ',                     'rookie', 12, 90],
  ['ブリッジ（30秒）',                 'rookie', 16, 88],
  ['でんぐり返り',                     'rookie', 14, 85],
  ['ゆりかご',                         'rookie',  8, 93],
  ['壁のぼり倒立',                     'rookie', 20, 78],

  // ===== CHALLENGER 初級 7技 =====
  ['ツーステップ',                     'challenger', 20, 82],
  ['前転',                             'challenger', 18, 80],
  ['後転',                             'challenger', 24, 78],
  ['開脚後転',                         'challenger', 30, 72],
  ['開脚前転',                         'challenger', 26, 75],
  ['三点倒立',                         'challenger', 18, 60],
  ['側転',                             'challenger', 42, 55],

  // ===== STRIKER パワー 9技 =====
  ['カエルバランス（15秒）',           'striker', 10, 70],
  ['倒立前転',                         'striker', 48, 58],
  ['跳ね倒立',                         'striker', 55, 42],
  ['後転倒立',                         'striker', 40, 38],
  ['倒立移行（倒立して一周回る）',     'striker', 58, 32],
  ['スクート（トリッキング）',         'striker', 62, 50],
  ['片手側転',                         'striker', 55, 60],
  ['伸肘倒立',                         'striker', 45, 50],
  ['脚前挙',                           'striker', 38, 72],

  // ===== AIRRIDER 跳躍 9技 =====
  ['マット跳び越し（2段）',            'airrider', 40, 65],
  ['モンキーアップ',                   'airrider', 30, 70],
  ['ターンヴォルト',                   'airrider', 50, 55],
  ['ステップヴォルト',                 'airrider', 55, 48],
  ['レイジーヴォルト',                 'airrider', 52, 52],
  ['スピードヴォルト',                 'airrider', 60, 42],
  ['ダッシュヴォルト',                 'airrider', 65, 35],
  ['跳ね起き',                         'airrider', 45, 28],
  ['大前転',                           'airrider', 38, 72],

  // ===== NINJA 反射 9技 =====
  ['モンキーウォーク',                 'ninja', 26, 68],
  ['ランディング',                     'ninja', 28, 72],
  ['シットターン',                     'ninja', 32, 74],
  ['プレシジョンジャンプ',             'ninja', 48, 48],
  ['シットターンハイパー',             'ninja', 44, 54],
  ['PKロール',                         'ninja', 38, 60],
  ['サイドロール',                     'ninja', 34, 65],
  ['跳び前転',                         'ninja', 46, 32],
  ['頭跳ね起き',                       'ninja', 50, 22],

  // ===== COREMASTER バランス 9技 =====
  ['キャットウォーク',                 'coremaster', 12, 72],
  ['ルルベ',                           'coremaster',  8, 68],
  ['上水平バランス（飛行機）',         'coremaster',  6, 88],
  ['背中倒立',                         'coremaster', 35, 52],
  ['胸倒立',                           'coremaster', 28, 58],
  ['パッセバランス',                   'coremaster', 18, 55],
  ['バックルバランス',                 'coremaster', 14, 48],
  ['Y字バランス（3秒）',               'coremaster', 10, 74],
  ['逆立ち',                           'coremaster', 32, 55],

  // ===== PERFORMER 美しさ 9技 =====
  ['鹿のポーズ',                       'performer', 16, 78],
  ['プリエ',                           'performer', 10, 65],
  ['グランバッドマン（90°以上開脚）',  'performer', 20, 50],
  ['シャッセ',                         'performer', 14, 58],
  ['片足上げブリッジ',                 'performer', 28, 42],
  ['立ちブリッジ起き',                 'performer', 34, 32],
  ['甲立ち',                           'performer', 12, 62],
  ['肘倒立',                           'performer', 30, 50],
  ['カブリオール（カットジャンプ）',   'performer', 42, 28],

  // ===== WATERFLOW 柔軟 9技 =====
  ['倒立ブリッジ',                     'waterflow', 44, 30],
  ['伸膝後転',                         'waterflow', 34, 50],
  ['伸膝前転',                         'waterflow', 30, 58],
  ['ローリング1,2（ブリッジから）',    'waterflow', 15, 65],
  ['皿回し',                           'waterflow', 25, 50],
  ['左右前後180°開脚',                 'waterflow',  6, 72],
  ['前後開脚横転',                     'waterflow', 20, 58],
  ['I字バランス（3秒）',               'waterflow', 12, 64],
  ['パンシェバランス',                 'waterflow',  6, 80],

  // ===== AIRMASTER アクロバット 10技 =====
  ['倒立歩行（10歩）',                 'airmaster', 25, 32],
  ['ロンダート（途中で足を揃えて着地）','airmaster', 60, 48],
  ['マスタースワイプ（トリッキング）', 'airmaster', 68, 40],
  ['マカコ（座った状態から斜め後ろに跳ぶ）','airmaster', 80, 18],
  ['バック転（後方倒立回転跳び）',     'airmaster', 76, 22],
  ['ハンドスプリング（前方倒立回転跳び）','airmaster', 72, 30],
  ['閉脚伸肘倒立',                     'airmaster', 50, 52],
  ['バタフライキック（トリッキング）', 'airmaster', 74, 24],
  ['後方宙返り（抱え込み）',           'airmaster', 82, 10],
  ['前方宙返り（抱え込み）',           'airmaster', 78, 14],

  // ===== TRACERUNNER パルクール 10技 =====
  ['ウィリアムスピン',                 'tracerunner', 18, 42],
  ['360°プレシジョン',                 'tracerunner', 52, 38],
  ['バタフライヴォルト',               'tracerunner', 64, 38],
  ['レイジーターンヴォルト',           'tracerunner', 63, 28],
  ['ロール・オン',                     'tracerunner', 48, 36],
  ['パームステップスピン',             'tracerunner', 56, 44],
  ['シットスピンアラウンドヴォルト',   'tracerunner', 68, 22],
  ['リバースヴォルト',                 'tracerunner', 60, 32],
  ['レイジーキックヴォルト',           'tracerunner', 66, 30],
  ['ステップリバウンド',               'tracerunner', 70, 16],

  // ===== ILLUSIONIST 新体操 10技 =====
  ['鹿ジャンプ',                       'illusionist', 36, 68],
  ['皿回し反転',                       'illusionist', 16, 42],
  ['モグリ',                           'illusionist',  8, 70],
  ['パッセターン',                     'illusionist', 16, 28],
  ['肘鹿倒立',                         'illusionist', 36, 42],
  ['ジャンプターン',                   'illusionist', 22, 20],
  ['倒立から前後開脚',                 'illusionist', 48, 22],
  ['前方倒立回転',                     'illusionist', 42, 26],
  ['後方倒立回転（ゆっくり回る）',     'illusionist', 35, 34],
  ['パンシェターン',                   'illusionist', 10, 88],
]
const SKILL_BY_JOB={};
SKILL_MAP.forEach(([n,j])=>{if(!SKILL_BY_JOB[j])SKILL_BY_JOB[j]=[];SKILL_BY_JOB[j].push(n);});

// ======== STARS ========
(()=>{const c=document.getElementById('stars');for(let i=0;i<90;i++){const s=document.createElement('div');s.className='star';s.style.left=Math.random()*100+'%';s.style.top=Math.random()*100+'%';s.style.setProperty('--d',(2+Math.random()*5)+'s');s.style.setProperty('--delay',(Math.random()*5)+'s');c.appendChild(s);}})();

// ======== NAVIGATION ========
function goPage(id){
  if(id==='pg-title' && !currentUser) resetClassroomTheme();
  const cur=document.querySelector('.page.active');
  if(cur&&cur.id!==id) prevPage=cur.id;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById(id);
  pg.classList.add('active');
  pg.classList.remove('fadein');void pg.offsetWidth;pg.classList.add('fadein');
  // 初期化
  if(id==='pg-matrix') initMatrix();
  if(id==='pg-jobmap') initJobMap();
  if(id==='pg-explorer') initExplorer();
  if(id==='pg-admin') loadAdminSel();
  if(id==='pg-status'&&currentUser) renderStatus(currentUser);
}
function goBack(){goPage(prevPage);}
function goRoom(){ if(currentUser) goPage('pg-status'); else goPage('pg-title'); }

// 写真アップロード
function uploadStatusPhoto(event){
  const file=event.target.files[0];if(!file)return;
  const c=currentUser;if(!c)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const dataUrl=e.target.result;
    localStorage.setItem('jq_photo_'+c.id,dataUrl);
    renderStatus(c);
    showToast('📷 写真を設定したよ！');
  };
  reader.readAsDataURL(file);
}
function uploadRoomPhoto(event){ uploadStatusPhoto(event); } // 後方互換

// ======== TITLE ========
// ======== LOGIN ========
function loginSearch(){
  const q=document.getElementById('loginSearch').value.trim().toLowerCase();
  const res=document.getElementById('loginResults');
  if(!q){res.innerHTML='';return;}
  const found=chars.filter(c=>c.name.toLowerCase().includes(q));
  if(found.length===0){res.innerHTML='<div style="font-family:\'Press Start 2P\';font-size:.4rem;color:var(--text2);margin-top:.5rem;">みつかりません…</div>';return;}
  res.innerHTML=found.map(c=>{
    const j=JOBS[c.job]||JOBS.rookie;
    const imgSrc=SPRITES[c.job]?`<img src="${SPRITES[c.job]}" class="login-char-img" alt="">`:`<span style="font-size:2rem;">${c.sprite}</span>`;
    return `<button class="login-char-btn" onclick="loginAs('${c.id}')">
      ${imgSrc}
      <div class="login-char-info">
        <div class="login-char-name">${c.name}</div>
        <div class="login-char-job" style="color:${j.color};">${j.name}（${j.genre}）</div>
      </div>
    </button>`;
  }).join('');
}
function loginAs(id){
  const c=chars.find(x=>x.id===id);
  if(!c)return;
  currentUser=c;
  enterRoom(c);
}

// ======== NEW CHAR ========
async function createNewChar(){
  const name=document.getElementById('newName').value.trim();
  const err=document.getElementById('newCharErr');
  if(!name){err.textContent='なまえを入れてね！';err.style.display='block';return;}
  if(chars.find(c=>c.name===name)){err.textContent='そのなまえはもう使われているよ！';err.style.display='block';return;}
  err.style.display='none';
  const id='JU-'+(chars.length+1).toString().padStart(3,'0');
  const newChar={id,name,sprite:'🐕',job:'rookie',level:1,exp:0,
    joinDate:new Date().toISOString().slice(0,10),
    classroom:document.getElementById('newClass').value,
    stats:{power:1,flex:1,speed:1,balance:1,beauty:1,focus:1},
    skills:[],skillRecords:{},messages:[]};
  chars.push(newChar);
  await saveCharsToGAS(newChar);
  currentUser=newChar;
  // 演出
  showToast('✨ ようこそ、'+name+'！');
  setTimeout(()=>enterRoom(newChar),800);
}

// ======== ENTER STATUS (formerly enterRoom) ========
function enterRoom(c){ enterStatus(c); } // 後方互換
function enterStatus(c){
  currentUser=c;
  goPage('pg-status');
}
function goStatus(){ if(currentUser) goPage('pg-status'); }

// ======== MAIL BOX ========
// ======== 次にやること ========
function getSkillStage(rec){
  if(!rec)return{label:'初挑戦',color:'var(--text2)',icon:'🌟'};
  if(rec.mastered)return{label:'マスター',color:'var(--gold)',icon:'🏆'};
  const pts=rec.pts||0;
  if(pts>=8)return{label:'もう少しでマスター',color:'var(--gold)',icon:'⭐'};
  if(pts>=5)return{label:'安定してきた',color:'var(--teal)',icon:'📈'};
  if(pts>=2)return{label:'コツをつかみ中',color:'var(--green)',icon:'💡'};
  if(pts>0)return{label:'土台づくり中',color:'#8888ff',icon:'🌱'};
  return{label:'初挑戦',color:'var(--text2)',icon:'🌟'};
}
function getNextHint(rec,pts){
  if(!rec||pts===0)return'まだ挑戦していない技だよ！はじめての挑戦をしてみよう✨';
  const rem=Math.max(0,10-pts);
  if(rec.lastResult===3&&rem>0)return`あと${rem}pt でマスター！この調子で続けよう🔥`;
  if(rem<=2)return`もう少し！あと${rem}ptでマスターだよ⭐`;
  if(rem<=5)return`安定してきた！あと${rem}pt でマスター📈`;
  return`コツをつかんできたね！現在${pts}pt、あと${rem}pt💡`;
}
function renderNextAction(c){
  const el=document.getElementById('stNextAction');
  if(!el)return;
  const recs=c.skillRecords||{};
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
  const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);

  // 候補リスト：① 挑戦中(pt>0,未マスター) ② 修行中 ③ 未挑戦
  const inProgress=[];
  const training=[];
  const untried=[];
  for(const jk of jobOrder){
    SKILL_MAP.filter(([n,k])=>k===jk).forEach(([name,jk2])=>{
      const r=recs[name];
      if(!r){untried.push({name,jk:jk2});return;}
      if(r.mastered)return;
      if(r.training)training.push({name,jk:jk2,r});
      else if((r.pts||0)>0)inProgress.push({name,jk:jk2,r});
    });
  }

  // 3枠：取り組みやすい・チャレンジ・気分転換
  const cards=[];
  // 枠1：最もptが多い挑戦中の技（取り組みやすい）
  const sorted=[...inProgress].sort((a,b)=>(b.r.pts||0)-(a.r.pts||0));
  if(sorted.length>0){
    const {name,r}=sorted[0];
    const pts=r.pts||0;const prev=r.lastResult===3?'⭐⭐⭐':r.lastResult===1?'⭐⭐':r.lastResult===0?'🌱':'初';
    cards.push({tag:'取り組みやすい',tagColor:'var(--teal)',name,pts,hint:getNextHint(r,pts),prev});
  }
  // 枠2：次に難しい未挑戦技（チャレンジ）
  if(untried.length>0){
    const {name}=untried[0];
    cards.push({tag:'チャレンジ',tagColor:'var(--gold)',name,pts:0,hint:'新しい技に挑戦してみよう！できたらポイントGET✨',prev:'なし'});
  }
  // 枠3：修行中 or 2番目に進んでいる技（気分転換）
  const alt=training[0]||sorted[1];
  if(alt&&alt.name!==cards[0]?.name){
    const nm=alt.name,r=alt.r||{};const pts=r.pts||0;
    cards.push({tag:'気分転換に',tagColor:'var(--pink)',name:nm,pts,hint:pts>0?`現在${pts}pt。たまには違う技もいいね！`:'基礎からじっくり取り組もう！',prev:r.lastResult===3?'⭐⭐⭐':r.lastResult===1?'⭐⭐':r.lastResult===0?'🌱':'なし'});
  }

  if(cards.length===0){el.style.display='none';return;}
  document.getElementById('stMonthPt').textContent=totalPt+'pt';

  const cardsEl=document.getElementById('stNextCards');
  cardsEl.innerHTML=cards.map(card=>`
    <div style="background:var(--bg);border:2px solid var(--border);border-radius:4px;padding:.65rem .8rem;display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:${card.tagColor};background:${card.tagColor}22;padding:.2rem .45rem;border-radius:2px;white-space:nowrap;">${card.tag}</div>
      <div style="flex:1;min-width:100px;">
        <div style="font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:.95rem;margin-bottom:.2rem;">${card.name}</div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);">${card.hint}</div>
      </div>
      ${card.pts>0?`<div style="font-family:'Press Start 2P',monospace;font-size:.45rem;color:var(--teal);text-align:right;"><div style="font-size:.28rem;color:var(--text2);">現在</div>${card.pts}pt</div>`:''}
    </div>`).join('');
  el.style.display='block';
}


// 日付差分（日数）
function daysDiff(dateA, dateB){
  if(!dateA||!dateB)return null;
  const a=new Date(dateA),b=new Date(dateB);
  return Math.round((b-a)/(1000*60*60*24));
}
function renderMailBox(c){
  const msgs=(c.messages||[]).slice().reverse();
  const mailList=document.getElementById('stMailList');
  const badge=document.getElementById('stUnreadBadge');
  const unreadCnt=msgs.filter(m=>!m.read).length;
  if(badge) badge.style.display=unreadCnt>0?'inline':'none';

  // マスター済み技を取得（日付なし → joinDateで代用）
  const recs=c.skillRecords||{};
  const masteredSkills=Object.entries(recs)
    .filter(([,r])=>r.mastered)
    .map(([sk])=>({type:'master',skill:sk,date:c.joinDate||''}));

  // メッセージをタイムラインアイテムに変換
  const msgItems=msgs.map((m,idx)=>({type:'msg',msg:m,idx,date:m.date||''}));

  // 日付で降順ソート（新しい順）
  const timeline=[...msgItems,...masteredSkills].sort((a,b)=>{
    if(b.date>a.date)return 1;if(b.date<a.date)return -1;return 0;
  });

  if(timeline.length===0){
    mailList.innerHTML='<div style="color:var(--text2);font-size:.85rem;padding:.5rem 0;">まだ記録はないよ。テストをがんばろう！</div>';
    return;
  }

  const j=JOBS[c.job]||JOBS.rookie;

  // 月ごとにグループ化
  const grouped={};
  timeline.forEach(item=>{
    const month=item.date?item.date.slice(0,7):'不明';
    if(!grouped[month])grouped[month]=[];
    grouped[month].push(item);
  });

  const months=Object.keys(grouped).sort((a,b)=>b.localeCompare(a));

  mailList.innerHTML=months.map(month=>{
    const [y,m]=month.split('-');
    const monthLabel=month==='不明'?'記録日不明':`${y}年${parseInt(m)}月`;
    const items=grouped[month].map(item=>{
      if(item.type==='msg'){
        const msg=item.msg;
        const subject=msg.subject||'先生からのメッセージ';
        const preview=msg.body?msg.body.slice(0,40)+(msg.body.length>40?'…':''):'';
        const isUnread=!msg.read;
        return `<div class="tl-item tl-msg${isUnread?' unread':''}" onclick="openMailModal(${item.idx})" style="cursor:pointer;">
          <div class="tl-dot" style="background:${isUnread?j.color:'var(--border)'};box-shadow:${isUnread?`0 0 8px ${j.color}`:''};"></div>
          <div class="tl-body">
            <div class="tl-label" style="color:${isUnread?j.color:'var(--text2)'};">💬 先生からのメッセージ${isUnread?' 🔴':''}</div>
            <div class="tl-title">${subject}</div>
            <div class="tl-preview">${preview}</div>
          </div>
        </div>`;
      } else {
        const jobKey=SKILL_MAP.find(([n])=>n===item.skill)?.[1];
        const jb=JOBS[jobKey]||JOBS.rookie;
        const mRec=(c.skillRecords||{})[item.skill]||{};
        const mDate=mRec.masterDate||item.date||'';
        const mDays=mRec.firstDate&&mRec.masterDate?daysDiff(mRec.firstDate,mRec.masterDate):null;
        return `<div class="tl-item tl-master" onclick="openSkillDetail('${item.skill.replace(/'/g,"\'")}','${jobKey||'rookie'}')" style="cursor:pointer;">
          <div class="tl-dot" style="background:var(--gold);box-shadow:0 0 8px var(--gold);"></div>
          <div class="tl-body">
            <div class="tl-label" style="color:var(--gold);">🏆 技マスター！${mRec.instantMaster?' ⚡一発':''}</div>
            <div class="tl-title" style="color:var(--gold);">「${item.skill}」</div>
            <div class="tl-preview" style="color:${jb.color};">${jb.name}（${jb.genre}）${mDays!==null?` · 初挑戦から${mDays}日`:''}</div>
          </div>
        </div>`;
      }
    }).join('');

    return `<div class="tl-month">
      <div class="tl-month-label">📅 ${monthLabel}</div>
      <div class="tl-month-items">${items}</div>
    </div>`;
  }).join('');
}

function openMailModal(idx){
  if(!currentUser)return;
  const msgs=(currentUser.messages||[]).slice().reverse();
  const m=msgs[idx];if(!m)return;
  // 既読にする
  if(!m.read){ m.read=true; saveChars(); renderMailBox(currentUser); }
  const subject=m.subject||'先生からのメッセージ';
  document.getElementById('mailModalSubject').textContent=subject;
  document.getElementById('mailModalMeta').textContent=`📅 ${m.date||''}　　📬 先生より`;
  document.getElementById('mailModalBody').textContent=m.body||'';
  document.getElementById('mailModal').classList.add('open');
}
function closeMailModal(e){
  if(!e||e.target===document.getElementById('mailModal'))
    document.getElementById('mailModal').classList.remove('open');
}
// 旧API後方互換
function openPost(){ /* 部屋削除により不使用 */ }
function closeMsg(){ document.getElementById('mailModal').classList.remove('open'); }

// ======== STATUS ========
function renderStatus(c){
  const j=JOBS[c.job]||JOBS.rookie;

  // ===== 次にやること =====
  renderNextAction(c);

  // ナビタイトル
  const navTitle=document.getElementById('stNavTitle');
  if(navTitle) navTitle.textContent=c.name+'のページ';

  // 右側JOBスプライト（背景飾り）
  const spriteBg=document.getElementById('stJobSpriteBg');
  if(spriteBg){
    if(SPRITES[c.job]){
      spriteBg.innerHTML=`<img src="${SPRITES[c.job]}" style="width:110px;height:110px;object-fit:contain;image-rendering:pixelated;opacity:.12;filter:blur(.5px);">`;
    } else {
      spriteBg.textContent=j.emoji;
    }
  }

  // 顔写真 or キャラスプライト or イニシャル
  const photo=localStorage.getItem('jq_photo_'+c.id);
  const useSprite=localStorage.getItem('jq_useSprite_'+c.id)==='1';
  const stPhoto=document.getElementById('stPhoto');
  const stInitial=document.getElementById('stInitial');
  if(useSprite&&SPRITES[c.job]){
    stPhoto.src=SPRITES[c.job];
    stPhoto.style.display='block';
    stPhoto.style.objectFit='contain';
    stPhoto.style.imageRendering='pixelated';
    stPhoto.style.background=j.color+'18';
    stInitial.style.display='none';
  } else if(photo){
    stPhoto.src=photo;stPhoto.style.display='block';
    stPhoto.style.objectFit='cover';
    stPhoto.style.imageRendering='auto';
    stPhoto.style.background='none';
    stInitial.style.display='none';
  } else {
    stPhoto.style.display='none';
    stInitial.style.display='flex';
    stInitial.textContent=c.name.charAt(0);
    stInitial.style.background=`linear-gradient(135deg,${j.color},${j.color}88)`;
    stInitial.style.borderColor=j.color;
  }

  document.getElementById('stName').textContent=c.name;
  // 称号を表示
  const titleData=calcTitle(c);
  let titleEl=document.getElementById('stCharTitle');
  if(!titleEl){
    titleEl=document.createElement('div');titleEl.id='stCharTitle';
    const nameEl=document.getElementById('stName');
    nameEl.parentNode.insertBefore(titleEl,nameEl.nextSibling);
  }
  if(titleData){
    titleEl.innerHTML=`<div style="font-family:'Press Start 2P',monospace;font-size:.32rem;color:${titleData.color};margin:.25rem 0;">${titleData.icon} ${titleData.title}</div>`;
  } else {
    titleEl.innerHTML='';
  }
  document.getElementById('stJoinDate').textContent=c.joinDate;
  document.getElementById('stClass').textContent=c.classroom;
  // 教室カスタマイズ：グリーティング表示
  const cfg=getClassroomConfig(c.classroom);
  let greetEl=document.getElementById('stGreeting');
  if(!greetEl){
    greetEl=document.createElement('div');greetEl.id='stGreeting';
    greetEl.style.cssText='font-family:"Zen Maru Gothic",sans-serif;font-size:.78rem;color:var(--text2);padding:.5rem .8rem;background:var(--bg3);border-left:3px solid var(--teal);margin-bottom:.6rem;line-height:1.7;';
    const nextEl=document.getElementById('stNextAction');
    if(nextEl&&nextEl.parentNode) nextEl.parentNode.insertBefore(greetEl,nextEl.nextSibling);
  }
  greetEl.textContent=cfg.teacherChar+' '+cfg.greeting;
  const b=document.getElementById('stJobBadge');
  b.textContent=j.name+'（'+j.genre+'）';
  b.style.cssText=`background:${j.color}22;border-color:${j.color};color:${j.color};font-family:'Press Start 2P',monospace;font-size:.38rem;padding:.3rem .7rem;border:2px solid;display:inline-block;`;

  const recs=c.skillRecords||{};
  const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);
  const masterCnt=Object.values(recs).filter(r=>r.mastered).length;
  document.getElementById('stMasterCnt').textContent=masterCnt+'技';
  document.getElementById('stTotalPt').textContent=totalPt+'pt';

  // ===== TROPHY =====
  const masteredJobs=new Set();
  SKILL_MAP.forEach(([skillName,jobKey])=>{
    const rec=recs[skillName];
    if(rec&&rec.mastered) masteredJobs.add(jobKey);
  });
  const fullyMastered=Object.keys(JOBS).filter(jobKey=>{
    if(jobKey==='next')return false;
    const jobSkills=SKILL_MAP.filter(([,jk])=>jk===jobKey).map(([n])=>n);
    if(jobSkills.length===0)return false;
    return jobSkills.every(sk=>recs[sk]&&recs[sk].mastered);
  });
  const trophyEl=document.getElementById('stTrophyRow');
  if(masteredJobs.size===0){
    trophyEl.innerHTML='<div style="color:var(--text2);font-size:.8rem;">まだトロフィーはないよ！テストで技をマスターしよう💪</div>';
  } else {
    // 全JOBを表示（マスターあり=カラー、なし=グレー）
    const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
    trophyEl.innerHTML=jobOrder.map(jobKey=>{
      const jb=JOBS[jobKey];if(!jb||jobKey==='next')return'';
      const hasMastered=masteredJobs.has(jobKey);
      const isFull=fullyMastered.includes(jobKey);
      const spriteImg=SPRITES[jobKey]
        ?`<img src="${SPRITES[jobKey]}" style="width:40px;height:40px;object-fit:contain;image-rendering:pixelated;${hasMastered?'':'filter:grayscale(1);opacity:.3;'}">`
        :`<span style="font-size:1.5rem;${hasMastered?'':'filter:grayscale(1);opacity:.3;'}">${jb.emoji}</span>`;
      const sprite=isFull
        ?`<div style="position:relative;display:inline-block;">
            ${spriteImg}
            <span style="position:absolute;top:-8px;right:-8px;font-size:1rem;filter:drop-shadow(0 0 4px var(--gold));animation:titleGlow 1.5s ease-in-out infinite alternate;">🏆</span>
          </div>`
        :spriteImg;
      const borderCol=hasMastered?(isFull?jb.color:jb.color+'88'):'var(--border)';
      const bg=hasMastered?(isFull?jb.color+'22':jb.color+'12'):'transparent';
      return `<div class="st-trophy-item" style="border-color:${borderCol};background:${bg};">
        ${sprite}
        <div style="font-family:'Press Start 2P',monospace;font-size:.22rem;color:${hasMastered?jb.color:'var(--border)'};text-align:center;">${jb.name}</div>
        ${isFull?'<div style="font-family:\'Press Start 2P\',monospace;font-size:.2rem;color:var(--gold);">完全制覇</div>':''}
      </div>`;
    }).join('');
  }

  // ===== バッジ =====
  renderBadges(c);

  // ===== メールBOX =====
  renderMailBox(c);

  // ===== SKILL RECORDS（JOBごとにグループ化） =====
  const grid=document.getElementById('stSkillRecs');
  if(Object.keys(recs).length===0){
    grid.innerHTML='<div style="color:var(--text2);font-size:.85rem;padding:.5rem 0;">まだテストを受けていないよ。月次テストを楽しみにしてね！</div>';
    return;
  }
  const jobOrder2=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
  let html='';
  jobOrder2.forEach(jobKey=>{
    const jb=JOBS[jobKey];if(!jb)return;
    // このJOBに属する技でrecordがあるものだけ
    const jobSkills=SKILL_MAP.filter(([n,jk])=>jk===jobKey&&recs[n]);
    if(jobSkills.length===0)return;
    const groupMasterCnt=jobSkills.filter(([n])=>recs[n]&&recs[n].mastered).length;
    html+=`<div class="st-job-group">
      <div class="st-job-group-header" style="border-color:${jb.color};color:${jb.color};">
        ${SPRITES[jobKey]?`<img src="${SPRITES[jobKey]}" style="width:28px;height:28px;object-fit:contain;image-rendering:pixelated;">`:`<span style="font-size:1.1rem;">${jb.emoji}</span>`}
        <span>${jb.name}</span>
        <span style="margin-left:auto;color:var(--text2);">🏆 ${groupMasterCnt}/${jobSkills.length}</span>
      </div>`;
    jobSkills.forEach(([sk])=>{
      const r=recs[sk];
      const pct=Math.min(100,(r.pts||0)*10);
      const isMastered=r.mastered;
      const isDanger=r.consec0>=1&&!isMastered;
      const cls=isMastered?'mastered':isDanger?'danger':'';
      const icon=isMastered?'🏆 ':isDanger?'⚠️ ':'';
      const starStr=isMastered?'🏆':r.lastResult===3?'⭐⭐⭐':r.lastResult===1?'⭐⭐':r.lastResult===0?'☆':'--';
      const ptColor=isMastered?'var(--gold)':isDanger?'var(--pink)':'var(--teal)';
      html+=`<div class="st-skill-item ${cls}">
        <div class="st-skill-name">${icon}${sk}</div>
        <div class="st-skill-bar-wrap">
          <div class="st-skill-bar-bg"><div class="st-skill-bar-fill" style="width:${pct}%;${isMastered?'box-shadow:0 0 6px var(--gold);':''}"></div></div>
          <div class="st-skill-pt" style="color:${ptColor};">${r.pts||0}pt / 10pt</div>
        </div>
        <div class="st-skill-star" style="color:${ptColor};">${starStr}</div>
      </div>`;
    });
    html+='</div>';
  });
  grid.innerHTML=html;
}

// ======== EXPLORER ========
function initExplorer(){
  document.getElementById('explorerGrid').innerHTML=chars.map(c=>{
    const j=JOBS[c.job]||JOBS.rookie;
    const recs=c.skillRecords||{};
    const masterCnt=Object.values(recs).filter(r=>r.mastered).length;
    const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);
    const photo=localStorage.getItem('jq_photo_'+c.id);
    const imgEl=photo
      ?`<img src="${photo}" style="width:60px;height:60px;object-fit:cover;border-radius:50%;border:2px solid ${j.color};display:block;margin:0 auto .5rem;">`
      :`<div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,${j.color},${j.color}88);border:2px solid ${j.color};display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:900;color:#fff;margin:0 auto .5rem;">${c.name.charAt(0)}</div>`;
    return `<div class="exp-card" onclick="openExplorerSkillPopup('${c.id}')">
      ${imgEl}
      <div style="font-weight:900;font-size:1rem;margin-bottom:.3rem;text-align:center;">${c.name}</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.36rem;padding:.2rem .5rem;border:2px solid ${j.color};color:${j.color};background:${j.color}18;display:inline-block;margin-bottom:.4rem;">${j.name}（${j.genre}）</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.38rem;color:var(--text2);">🏆${masterCnt}技　${totalPt}pt</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--teal);margin-top:.3rem;">▶ 技を見る</div>
    </div>`;
  }).join('');
}

function openExplorerSkillPopup(charId){
  const c=chars.find(x=>x.id===charId);if(!c)return;
  const j=JOBS[c.job]||JOBS.rookie;
  const recs=c.skillRecords||{};
  const masterCnt=Object.values(recs).filter(r=>r.mastered).length;
  const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);

  // アバター（顔写真 or イニシャル）
  const spriteEl=document.getElementById('espSprite');
  const espPhoto=localStorage.getItem('jq_photo_'+c.id);
  const espJob=JOBS[c.job]||JOBS.rookie;
  if(espPhoto){
    spriteEl.innerHTML=`<img src="${espPhoto}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:3px solid ${espJob.color};">`;
  } else {
    spriteEl.innerHTML=`<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,${espJob.color},${espJob.color}88);border:3px solid ${espJob.color};display:inline-flex;align-items:center;justify-content:center;font-size:2rem;font-weight:900;color:#fff;">${c.name.charAt(0)}</div>`;
  }

  document.getElementById('espName').textContent=c.name;
  const jobEl=document.getElementById('espJob');
  jobEl.textContent=`${j.name}（${j.genre}）`;
  jobEl.style.color=j.color;
  jobEl.style.borderColor=j.color;
  jobEl.style.background=j.color+'18';
  document.getElementById('espStats').textContent=`🏆${masterCnt}技マスター　合計${totalPt}pt`;

  // スキル一覧（そのキャラのジョブ＋入門に関係する技）
  const allSkills=SKILL_MAP;
  const charSkills=SKILL_MAP; // 全技を表示
  
  const skillHtml=SKILL_MAP.map(([name,job])=>{
    const rec=recs[name]||{};
    const pts=rec.pts||0;
    const mastered=rec.mastered||false;
    const lastResult=rec.lastResult;
    const pct=Math.min(100,Math.round(pts/10*100));
    const jobInfo=JOBS[job]||JOBS.rookie;
    
    // 全技表示（未挑戦も含む）
    
    const starStr=mastered?'🏆':lastResult===3?'⭐⭐⭐':lastResult===1?'⭐⭐':lastResult===0?'☆':'－';
    const barColor=mastered?'var(--gold)':jobInfo.color||'var(--teal)';
    
    return `<div style="background:var(--bg);border:1px solid var(--border);padding:.5rem .7rem;border-radius:2px;opacity:${pts===0&&!mastered?0.45:1};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem;">
        <span style="font-size:.82rem;font-weight:700;">${mastered?'🏆 ':''}${name}</span>
        <span style="font-family:'Press Start 2P',monospace;font-size:.32rem;color:${jobInfo.color};">${jobInfo.name}</span>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;">
        <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${barColor};transition:width .3s;${mastered?'box-shadow:0 0 6px var(--gold);':''}"></div>
        </div>
        <span style="font-family:'Press Start 2P',monospace;font-size:.32rem;color:var(--text2);white-space:nowrap;">${pts}pt ${starStr}</span>
      </div>
    </div>`;
  }).filter(Boolean).join('');

  document.getElementById('espSkillList').innerHTML = skillHtml ||
    `<div style="color:var(--text2);text-align:center;font-size:.85rem;padding:1rem;">まだ挑戦した技がないよ！</div>`;

  document.getElementById('explorerSkillPopup').style.display='flex';
}

function closeExplorerSkillPopup(e){
  if(!e||e.target===document.getElementById('explorerSkillPopup')){
    document.getElementById('explorerSkillPopup').style.display='none';
  }
}

// ======== JOB MAP ========
function initJobMap(){
  const cont=document.getElementById('jobmapContent');
  cont.innerHTML=`
    <div class="class-label">クラス：入門 / 初級</div>
    <div class="jmap-row">
      ${jnode('rookie')}<div style="color:var(--border);font-size:1.5rem;">▶</div>${jnode('challenger')}
    </div>
    <div class="jmap-arrows"><div style="font-family:'Press Start 2P',monospace;font-size:.38rem;color:var(--text2);">▼ 好きなジョブを選ぼう！ ▼</div></div>
    <div class="jmap-arrows"><div class="arrow-down-multi">${'<div class="arrow-line"><div class="arrow-stem"></div><div class="arrow-head"></div></div>'.repeat(6)}</div></div>
    <div class="class-label">クラス：中級</div>
    <div class="jmap-row" style="gap:.6rem;">
      ${['ninja','airrider','coremaster','performer','waterflow','striker'].map(k=>jnode(k)).join('')}
    </div>
    <div class="jmap-arrows"><div class="arrow-down-multi">${'<div class="arrow-line"><div class="arrow-stem"></div><div class="arrow-head"></div></div>'.repeat(3)}</div></div>
    <div class="class-label">クラス：上級</div>
    <div class="jmap-row" style="gap:.8rem;">
      ${['tracerunner','airmaster','illusionist','next'].map(k=>jnode(k)).join('')}
    </div>`;
}
function jnode(key){
  const j=JOBS[key];
  const imgEl=SPRITES[key]?`<img src="${SPRITES[key]}" style="width:64px;height:64px;object-fit:contain;image-rendering:pixelated;" class="jnode-emoji">`:`<span class="jnode-emoji">${j.emoji}</span>`;
  return `<div class="jnode" style="border-color:${j.color};background:${j.color}18;" onclick="showJobDetail('${key}')">
    ${imgEl}
    <div class="jnode-name" style="color:${j.color};">${j.name}</div>
    <div class="jnode-sub" style="color:${j.color};">（${j.genre}）</div>
    <div class="jnode-lv" style="color:${j.color};">${j.level}</div>
  </div>`;
}

// ======== JOB POPUP ========
function showJobDetail(key){
  const j=JOBS[key];if(!j)return;
  const ppEl=document.getElementById('ppEmoji');
  if(SPRITES[key])ppEl.innerHTML=`<img src="${SPRITES[key]}" style="width:80px;height:80px;object-fit:contain;image-rendering:pixelated;">`;
  else ppEl.textContent=j.emoji;
  const n=document.getElementById('ppName');n.textContent=j.name;n.style.color=j.color;
  document.getElementById('ppSub').textContent=j.genre;
  document.getElementById('ppDesc').textContent=j.desc;
  const lv=document.getElementById('ppLv');lv.textContent=j.level;lv.style.color=j.color;
  document.getElementById('ppTags').innerHTML=(SKILL_BY_JOB[key]||[]).slice(0,5).map(t=>`<div class="chip done">${t}</div>`).join('');
  document.getElementById('jobPopup').classList.add('open');
}
function closeJobPopup(){document.getElementById('jobPopup').classList.remove('open');}
document.getElementById('jobPopup').addEventListener('click',function(e){if(e.target===this)closeJobPopup();});

// ======== MATRIX ========
let curView='map',curJob='all';
function initMatrix(){
  const tabs=document.getElementById('matrixTabs');
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
  // 全体分布タブ
  const allTab=`<div class="jtab active" id="jtab-all" onclick="selJob('all',this)" style="border-color:#7766ff;color:#7766ff;background:#7766ff18;">
    <span>🗺️</span><span>全体分布</span>
  </div>`;
  const jobTabs=jobOrder.map(k=>{
    const j=JOBS[k];if(!j)return'';
    const sprite=SPRITES[k]?`<img src="${SPRITES[k]}" style="width:36px;height:36px;object-fit:contain;image-rendering:pixelated;">`:`<span style="font-size:1.4rem;">${j.emoji}</span>`;
    return `<div class="jtab" id="jtab-${k}" onclick="selJob('${k}',this)">
      ${sprite}<span>${j.name}</span>
    </div>`;
  }).join('');
  tabs.innerHTML=allTab+jobTabs;
  curJob='all';
  renderMatrix();
  renderLegend();
}
function selJob(key,el){
  document.querySelectorAll('.jtab').forEach(t=>{
    t.classList.remove('active');
    t.style.borderColor='';t.style.color='';t.style.background='';
  });
  el.classList.add('active');
  if(key==='all'){
    el.style.borderColor='#7766ff';el.style.color='#7766ff';el.style.background='#7766ff18';
  } else {
    const j=JOBS[key];
    if(j){el.style.borderColor=j.color;el.style.color=j.color;el.style.background=j.color+'18';}
  }
  curJob=key;
  renderMatrix();
  renderLegend();
}
function setView(v){
  curView=v;
  document.getElementById('matrixMap').style.display=v==='map'?'block':'none';
  document.getElementById('matrixList').style.display=v==='list'?'block':'none';
  document.getElementById('btnMap').className='pbtn '+(v==='map'?'btn-teal':'btn-outline');
  document.getElementById('btnList').className='pbtn '+(v==='list'?'btn-teal':'btn-outline');
  renderMatrix();
}
function renderMatrix(){
  const filtered=curJob==='all'?SKILL_MAP:SKILL_MAP.filter(([,j])=>j===curJob);
  const isAll=curJob==='all';

  // ===== マップビュー =====
  if(isAll){
    // 全体分布：●のみ、JOBカラーで表示
    document.getElementById('mapNodes').innerHTML=filtered.map(([name,job,x,y])=>{
      const jb=JOBS[job];
      return `<div style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:${jb.color};box-shadow:0 0 6px ${jb.color}88;border:2px solid ${jb.color}cc;cursor:default;" title="${name}（${jb.name}）"></div>`;
    }).join('');
  } else {
    // JOB別：技名ラベル付き
    const nodeSize=filtered.length<=5?'font-size:.9rem;padding:.45rem .8rem;max-width:140px;'
                  :filtered.length<=8?'font-size:.78rem;padding:.35rem .6rem;max-width:120px;'
                  :'font-size:.65rem;padding:.28rem .45rem;max-width:105px;';
    document.getElementById('mapNodes').innerHTML=filtered.map(([name,job,x,y])=>{
      const jb=JOBS[job];const tc=isLight(jb.color)?'#111':'#fff';
      return `<div class="snode" style="left:${x}%;top:${y}%;background:${jb.color};color:${tc};border-color:${dk(jb.color)};${nodeSize}">${name}</div>`;
    }).join('');
  }

  // ===== リストビュー =====
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
  const grouped={};
  filtered.forEach(([name,job,x,y])=>{
    if(!grouped[job])grouped[job]=[];
    grouped[job].push({name,difficulty:y,safety:x});
  });

  if(isAll){
    // 全体分布のリストはJOB別まとめ表示
    document.getElementById('skillListGrid').innerHTML=jobOrder.filter(jk=>grouped[jk]).map(jk=>{
      const jb=JOBS[jk];if(!jb)return'';
      const sprite=SPRITES[jk]?`<img src="${SPRITES[jk]}" style="width:28px;height:28px;object-fit:contain;image-rendering:pixelated;">`:`<span style="font-size:1.2rem;">${jb.emoji}</span>`;
      const skillNames=grouped[jk].map(({name})=>`<span style="background:${jb.color}22;border:1px solid ${jb.color}55;padding:.15rem .4rem;border-radius:3px;font-size:.8rem;">${name}</span>`).join('');
      return `<div style="display:flex;align-items:flex-start;gap:.6rem;padding:.6rem;background:var(--bg3);border-left:3px solid ${jb.color};border-radius:0 6px 6px 0;margin-bottom:.4rem;">
        ${sprite}
        <div style="flex:1;">
          <div style="font-family:'Press Start 2P',monospace;font-size:.36rem;color:${jb.color};margin-bottom:.4rem;">${jb.name}（${jb.genre}）${grouped[jk].length}技</div>
          <div style="display:flex;flex-wrap:wrap;gap:.3rem;">${skillNames}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    document.getElementById('skillListGrid').innerHTML=jobOrder.filter(jk=>grouped[jk]).map(jk=>{
      const jb=JOBS[jk];if(!jb)return'';
      const sprite=SPRITES[jk]?`<img src="${SPRITES[jk]}" style="width:32px;height:32px;object-fit:contain;image-rendering:pixelated;">`:`<span style="font-size:1.4rem;">${jb.emoji}</span>`;
      const skills=grouped[jk].map(({name})=>{
        return `<div style="background:var(--bg3);border-left:3px solid ${jb.color};padding:.6rem .8rem;border-radius:0 6px 6px 0;cursor:pointer;" onclick="openSkillDetail('${name.replace(/'/g,"\\'")}','${jk}')">
          <div style="font-weight:700;font-size:.88rem;">${name}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);margin-top:.2rem;">▶ タップして詳細を見る</div>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:1.2rem;">
        <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .6rem;background:${jb.color}18;border:1.5px solid ${jb.color}55;border-radius:6px;margin-bottom:.5rem;">
          ${sprite}
          <div>
            <div style="font-family:'Press Start 2P',monospace;font-size:.42rem;color:${jb.color};">${jb.name}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);margin-top:.2rem;">${jb.genre}　${grouped[jk].length}技</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.4rem;">${skills}</div>
      </div>`;
    }).join('');
  }
}
// ======== スキル動画 ========
// 動画URL：Firestoreメイン（localStorageをキャッシュとして使用）
function getSkillVideos(){ return JSON.parse(localStorage.getItem('jq_videos')||'{}'); }
async function saveSkillVideos(v){
  localStorage.setItem('jq_videos',JSON.stringify(v));
  // Firestoreに保存（全デバイス共有）
  try{ await _fb.saveVideos(v); }catch(e){ console.warn('動画URL保存失敗',e); }
}

function openSkillDetail(skillName, jobKey){
  const jb=JOBS[jobKey]||JOBS.rookie;
  const videos=getSkillVideos();
  const url=videos[skillName]||'';
  const embedId=getYouTubeId(url);
  const meta=getSkillMeta(skillName);

  const overlay=document.getElementById('skillDetailOverlay');
  document.getElementById('sdTitle').textContent=skillName;
  document.getElementById('sdJob').textContent=jb.name+'（'+jb.genre+'）';
  document.getElementById('sdJob').style.color=jb.color;

  // 動画エリア
  const videoArea=document.getElementById('sdVideoArea');
  let videoHTML='';
  if(embedId){
    videoHTML+=`<div style="position:relative;padding-top:56.25%;margin-bottom:.7rem;">
      <iframe style="position:absolute;inset:0;width:100%;height:100%;border:2px solid var(--border);"
        src="https://www.youtube.com/embed/${embedId}"
        frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
    </div>`;
    // 見るポイント（動画がある場合のみ強調）
    if(meta?.point){
      videoHTML+=`<div style="background:rgba(0,229,255,.08);border-left:3px solid var(--teal);padding:.55rem .7rem;margin-bottom:.5rem;font-family:'Zen Maru Gothic',sans-serif;font-size:.85rem;line-height:1.7;">
        <span style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--teal);display:block;margin-bottom:.3rem;">👁️ 見るポイント</span>
        ${meta.point}
      </div>`;
    }
  } else {
    videoHTML+=`<div style="height:72px;display:flex;align-items:center;justify-content:center;color:var(--text2);font-family:'Zen Maru Gothic',sans-serif;font-size:.82rem;border:2px dashed var(--border);margin-bottom:.7rem;">🎬 動画はまだ登録されていないよ</div>`;
  }

  // 見るポイント（動画なしでも表示）
  if(meta?.point && !embedId){
    videoHTML+=`<div style="background:rgba(0,229,255,.08);border-left:3px solid var(--teal);padding:.55rem .7rem;margin-bottom:.5rem;font-family:'Zen Maru Gothic',sans-serif;font-size:.85rem;line-height:1.7;">
      <span style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--teal);display:block;margin-bottom:.3rem;">👁️ 見るポイント</span>
      ${meta.point}
    </div>`;
  }

  // よくある失敗例
  if(meta?.fail){
    videoHTML+=`<div style="background:rgba(255,64,129,.06);border-left:3px solid var(--pink);padding:.55rem .7rem;margin-bottom:.5rem;font-family:'Zen Maru Gothic',sans-serif;font-size:.85rem;line-height:1.7;">
      <span style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--pink);display:block;margin-bottom:.3rem;">⚠️ よくある失敗</span>
      ${meta.fail}
    </div>`;
  }

  // 次に見るべき基礎技
  if(meta?.base){
    const baseJobKey=SKILL_MAP.find(([n])=>n===meta.base)?.[1]||jobKey;
    videoHTML+=`<div style="background:rgba(255,215,0,.06);border-left:3px solid var(--gold);padding:.5rem .7rem;margin-bottom:.5rem;font-family:'Zen Maru Gothic',sans-serif;font-size:.82rem;line-height:1.7;">
      <span style="font-family:'Press Start 2P',monospace;font-size:.26rem;color:var(--gold);display:block;margin-bottom:.3rem;">📚 先に確認したい基礎技</span>
      <span style="cursor:pointer;color:var(--gold);font-weight:700;text-decoration:underline;" onclick="closeSkillDetail();setTimeout(()=>openSkillDetail('${meta.base.replace(/'/g,"\'")}','${baseJobKey}'),200);">「${meta.base}」を見る →</span>
    </div>`;
  }

  // 成長ログ（ログインユーザーの記録がある場合）
  if(currentUser){
    const rec=(currentUser.skillRecords||{})[skillName];
    if(rec){
      const stage=getSkillStage(rec);
      const logItems=[];
      if(rec.firstDate) logItems.push(`📅 初挑戦：${rec.firstDate}`);
      if(rec.firstStarDate) logItems.push(`⭐ 初⭐⭐：${rec.firstStarDate}`);
      if(rec.masterDate) logItems.push(`🏆 マスター：${rec.masterDate}`);
      if(logItems.length>0||rec.pts>0){
        videoHTML+=`<div style="background:var(--bg3);border:2px solid var(--border);padding:.55rem .7rem;margin-bottom:.5rem;">
          <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:${stage.color};margin-bottom:.4rem;">${stage.icon} ${stage.label} · ${rec.pts||0}pt${rec.mastered?' · マスター済':''}${rec.training?' · 修行中':''}</div>
          ${logItems.map(l=>`<div style="font-family:'Press Start 2P',monospace;font-size:.26rem;color:var(--text2);line-height:2;">${l}</div>`).join('')}
        </div>`;
      }
    }
  }

  videoArea.innerHTML=videoHTML;

  // 管理者モードなら動画URL編集欄を表示
  const adminSection=document.getElementById('sdAdminSection');
  const isAdmin=document.getElementById('adminPanel')?.style.display==='block';
  if(isAdmin){
    adminSection.style.display='block';
    document.getElementById('sdVideoUrl').value=url;
    document.getElementById('sdVideoUrl').dataset.skill=skillName;
  } else {
    adminSection.style.display='none';
  }

  overlay.classList.add('open');
}

function getYouTubeId(url){
  if(!url)return null;
  const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?m[1]:null;
}

async function saveSkillVideo(){
  const url=document.getElementById('sdVideoUrl').value.trim();
  const skill=document.getElementById('sdVideoUrl').dataset.skill;
  if(!skill)return;
  const videos=getSkillVideos();
  if(url) videos[skill]=url; else delete videos[skill];
  showToast('💾 保存中...');
  await saveSkillVideos(videos);
  openSkillDetail(skill, SKILL_MAP.find(([n])=>n===skill)?.[1]||'rookie');
  showToast('✅ 動画URLを全デバイスに保存しました🎬');
}

function closeSkillDetail(e){
  if(!e||e.target===document.getElementById('skillDetailOverlay'))
    document.getElementById('skillDetailOverlay').classList.remove('open');
}
function renderLegend(){
  if(curJob!=='all'){document.getElementById('mapLegend').innerHTML='';return;}
  document.getElementById('mapLegend').innerHTML=Object.entries(JOBS).filter(([k])=>k!=='next'&&SKILL_MAP.some(([,j])=>j===k)).map(([,j])=>`<div style="display:flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--text2);"><div style="width:10px;height:10px;background:${j.color};border-radius:50%;box-shadow:0 0 4px ${j.color}88;"></div>${j.name}</div>`).join('');
}
function isLight(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return(r*299+g*587+b*114)/1000>130;}
function dk(h){return'#'+[1,3,5].map(i=>Math.max(0,parseInt(h.slice(i,i+2),16)-50).toString(16).padStart(2,'0')).join('');}



// ======== 技メタ情報（動画導線強化） ========
// [見るポイント, よくある失敗例, 次に見るべき基礎技(任意)]
const SKILL_META = {
  // ROOKIE
  '片手バランス（右左）':  {point:'軸足のひざをしっかり伸ばして、目線を一点に固定しよう', fail:'目線がぶれてバランスを崩しやすい。視線の固定が最重要！', base:null},
  'ワンステップ':          {point:'踏み切り足でしっかり地面を押して、着地は両足同時に', fail:'踏み切りが弱く高さが出ない。床を強く押すイメージで', base:'片手バランス（右左）'},
  'ブリッジ（30秒）':      {point:'腕と足を肩幅に開き、おへそを高く持ち上げる意識で', fail:'腕が曲がって頭が下がる。肘をしっかり伸ばしてから上げよう', base:null},
  'でんぐり返り':          {point:'手をついたらすぐあごを引いて、丸くなって回ろう', fail:'手が遠すぎて頭が先につく。手をもっと近くについてみよう', base:null},
  'ゆりかご':              {point:'背中を丸めてスムーズに揺れる。首は絶対に床につけない', fail:'背中が伸びて勢いが出ない。丸まることが大事', base:null},
  '壁のぼり倒立':          {point:'一歩一歩確実に足を上げて、腕でしっかり体を支えよう', fail:'腕が曲がって体が崩れる。鼻と額が壁ギリギリがコツ', base:'ブリッジ（30秒）'},

  // CHALLENGER
  'ツーステップ':          {point:'リズムよく1・2と踏み込んで、しっかり高さを出そう', fail:'踏み込みが弱くて高さが出ない。床を踏む力を意識して', base:'ワンステップ'},
  '前転':                  {point:'手をついたらすぐあごを引いて、丸い背中で一気に回る', fail:'あごが上がって首から落ちてしまう。あご引きが最重要！', base:'でんぐり返り'},
  '後転':                  {point:'後ろに思い切って座って、手を耳の横に素早く置こう', fail:'手が遅れて首が苦しくなる。手を先に置く練習をしよう', base:'ゆりかご'},
  '開脚後転':              {point:'回り切ったら素早く足を開いて床を押して立ち上がる', fail:'足が閉じたまま立ち上がれない。開脚のタイミングを早めに', base:'後転'},
  '開脚前転':              {point:'前転と同じく丸くなって、着地前に足をしっかり開く', fail:'足の開きが遅くて起き上がれない。足を早めに広げよう', base:'前転'},
  '三点倒立':              {point:'頭と両手で正三角形を作って、ゆっくり足を上げよう', fail:'三角形が崩れてバランスが取れない。手の位置を確認しよう', base:'壁のぼり倒立'},
  '側転':                  {point:'正面を向いて真っすぐ、手・手・足・足の順で着く', fail:'斜めに回って着地が曲がる。目線は手をついた方向に！', base:'ツーステップ'},

  // COREMASTER
  'キャットウォーク':      {point:'四つ這いでなめらかに重心移動。腹筋をしっかり使おう', fail:'腰が落ちて動きがぎこちない。おなかを引き上げて', base:null},
  'ルルベ':                {point:'かかとを高く上げて、足のつま先全体で体重を支えよう', fail:'足首がぐらつく。つま先をしっかり押し付けるように', base:'片手バランス（右左）'},
  '上水平バランス（飛行機）':{point:'体を一直線に保って、両腕を広げてバランスを取ろう', fail:'腰が曲がって体が「く」の字になる。全身を一直線に！', base:'ルルベ'},
  '逆立ち':                {point:'壁倒立から少しずつ離れて練習。視線は手の間に！', fail:'ひじが曲がって体を支えられない。ひじ伸ばしが大事', base:'三点倒立'},
  'Y字バランス（3秒）':    {point:'軸足・体幹・上げた足が一直線になるイメージで', fail:'体が傾いてバランスが崩れる。軸足で地面を押す意識を', base:'上水平バランス（飛行機）'},
  '背中倒立':              {point:'両手を腰に当てて支えながら、足を天井に向けてまっすぐ', fail:'足が曲がって体が安定しない。つま先まで伸ばして', base:'ゆりかご'},
  '胸倒立':                {point:'胸と両手で支えて、足を頭の上へゆっくり伸ばそう', fail:'腰が反りすぎてバランスが崩れる。腹筋でコントロール', base:'背中倒立'},
  'パッセバランス':        {point:'片足のひざを引き上げて、軸足でしっかり地面を押そう', fail:'軸足がぐらつく。足の裏全体で床をしっかりとらえて', base:'ルルベ'},
  'バックルバランス':      {point:'後ろに曲げた足首をしっかり持って、バランスを保とう', fail:'引っ張りすぎて前に倒れる。ゆっくり引いて調整しよう', base:'パッセバランス'},

  // NINJA
  'ランディング':          {point:'着地はひざを柔らかく曲げて衝撃を吸収。静かに止まる', fail:'足が突っ張って衝撃が大きい。ひざのクッションを使って', base:null},
  'PKロール':              {point:'肩から入って体を丸め、スムーズに立ち上がる', fail:'頭から入ってしまう。肩を先につける意識で', base:'ランディング'},
  'プレシジョンジャンプ':  {point:'腕を振って高さを出し、ピンポイントで着地しよう', fail:'着地がずれて転びやすい。踏み切りの方向を正確に', base:'ツーステップ'},
  '跳び前転':              {point:'ジャンプして高さを出してから前転。遠くに跳ぶ意識で', fail:'高さが出ないまま前転になる。まず上に跳ぶことが先！', base:'前転'},

  // AIRRIDER
  'マット跳び越し（2段）': {point:'助走のスピードを生かして、踏み切りで高く跳ぼう', fail:'踏み切りが近すぎて高さが出ない。少し遠めから踏もう', base:'ツーステップ'},
  'モンキーアップ':        {point:'手をついてからすぐ足を引き上げる。腕でしっかり押して', fail:'腕の押しが弱くて体が上がらない。手首を使って押そう', base:'マット跳び越し（2段）'},
  '大前転':                {point:'助走のスピードを保ったまま手をついて大きく回ろう', fail:'手をついた瞬間スピードが落ちる。手をついたらすぐ蹴る', base:'前転'},

  // PERFORMER
  '鹿のポーズ':            {point:'片足で立ち、もう片足のひざを曲げて優雅に保持', fail:'軸足がぐらついてポーズが決まらない。腹筋で安定させよう', base:'ルルベ'},
  'プリエ':                {point:'ひざを外側に向けてゆっくり曲げ伸ばし。背筋をまっすぐ', fail:'ひざが内側に入ってしまう。足の裏全体で床を押そう', base:null},
  'シャッセ':              {point:'1・2のリズムで滑らかに横移動。足をそろえる瞬間を意識', fail:'ぎこちなく止まってしまう。音楽に合わせて練習しよう', base:'プリエ'},
  '甲立ち':                {point:'足の甲で体重を支えて、体をまっすぐ保つ', fail:'体が前後に傾く。おなかと背中を同時に意識して', base:null},
  '肘倒立':                {point:'肘で正三角形を作って安定させてから、ゆっくり足を上げる', fail:'肘が広がって体を支えられない。肘の位置を固定しよう', base:'三点倒立'},

  // WATERFLOW
  '左右前後180°開脚':      {point:'ゆっくり息を吐きながら、痛くない範囲でじっくり伸ばす', fail:'勢いでやって筋肉を傷める。毎日少しずつが大事', base:null},
  'I字バランス（3秒）':    {point:'上げた足と体幹が一直線。腕を広げてバランスを助けよう', fail:'上体が曲がって一直線にならない。視線は真正面に', base:'Y字バランス（3秒）'},
  'パンシェバランス':      {point:'上体を前に倒しながら足を後ろへ。シーソーのイメージ', fail:'腰が曲がってしまう。上体と足を同時に動かそう', base:'I字バランス（3秒）'},
  'ローリング1,2（ブリッジから）':{point:'ブリッジの姿勢から前後にゆっくり重心を移動させよう', fail:'腕が曲がって崩れる。しっかり伸ばして支えて', base:'ブリッジ（30秒）'},
  '伸膝前転':              {point:'ひざを伸ばしたまま回って、最後まで足を伸ばし続けよう', fail:'ひざが曲がって普通の前転になる。最後まで意識！', base:'前転'},
  '伸膝後転':              {point:'ひざを伸ばしたまま勢いよく回る。体を丸める感覚で', fail:'ひざが曲がってしまう。まず勢いよく回る練習から', base:'後転'},
};

function getSkillMeta(skillName){
  return SKILL_META[skillName] || null;
}
// ======== バッジ・称号システム ========
const BADGES = [
  // 継続バッジ
  { id:'continue_3m',  icon:'🗓️', name:'3ヶ月の冒険者',   desc:'3ヶ月以上活動している',        type:'continue', check: c => monthsSinceJoin(c) >= 3 },
  { id:'continue_6m',  icon:'🌟', name:'半年の勇者',       desc:'6ヶ月以上活動している',        type:'continue', check: c => monthsSinceJoin(c) >= 6 },
  { id:'continue_12m', icon:'👑', name:'1年の伝説',        desc:'1年以上活動している',          type:'continue', check: c => monthsSinceJoin(c) >= 12 },

  // 挑戦バッジ
  { id:'try_3skills',  icon:'⚔️', name:'チャレンジャー',   desc:'3つの技に挑戦した',            type:'challenge', check: c => countChallenged(c) >= 3 },
  { id:'try_10skills', icon:'🔥', name:'技コレクター',     desc:'10の技に挑戦した',             type:'challenge', check: c => countChallenged(c) >= 10 },
  { id:'master_1',     icon:'🏅', name:'初マスター',       desc:'はじめて技をマスターした',      type:'challenge', check: c => countMastered(c) >= 1 },
  { id:'master_5',     icon:'🎖️', name:'技の達人',        desc:'5つの技をマスターした',        type:'challenge', check: c => countMastered(c) >= 5 },
  { id:'master_10',    icon:'💎', name:'レジェンド',       desc:'10の技をマスターした',         type:'challenge', check: c => countMastered(c) >= 10 },
  { id:'multi_job',    icon:'🌈', name:'マルチプレイヤー', desc:'2つ以上のジョブで技をマスター', type:'challenge', check: c => masteredJobCount(c) >= 2 },
  { id:'instant_master', icon:'⚡', name:'一発マスター！', desc:'3回全部⭐⭐⭐でマスターした',  type:'challenge', check: c => hasInstantMaster(c) },

  // 姿勢バッジ（管理者が手動付与）
  { id:'attitude_hello',  icon:'👋', name:'あいさつ名人',     desc:'いつも元気なあいさつができる', type:'attitude', manual: true },
  { id:'attitude_never',  icon:'💪', name:'あきらめない心',   desc:'何度でも挑戦し続ける',         type:'attitude', manual: true },
  { id:'attitude_cheer',  icon:'🤝', name:'仲間応援マスター', desc:'友だちを全力で応援できる',     type:'attitude', manual: true },
  { id:'attitude_focus',  icon:'🎯', name:'集中の達人',       desc:'練習に全力集中できる',         type:'attitude', manual: true },
];

// バッジ計算ヘルパー
function monthsSinceJoin(c){
  if(!c.joinDate)return 0;
  const join=new Date(c.joinDate);const now=new Date();
  return (now.getFullYear()-join.getFullYear())*12+(now.getMonth()-join.getMonth());
}
function countChallenged(c){
  return Object.keys(c.skillRecords||{}).length;
}
function countMastered(c){
  return Object.values(c.skillRecords||{}).filter(r=>r.mastered).length;
}
function masteredJobCount(c){
  const recs=c.skillRecords||{};
  const jobs=new Set();
  SKILL_MAP.forEach(([n,jk])=>{ if(recs[n]&&recs[n].mastered) jobs.add(jk); });
  return jobs.size;
}
function hasInstantMaster(c){
  // skillRecords に instantMaster フラグが残っているか
  return Object.values(c.skillRecords||{}).some(r=>r.instantMaster);
}

// バッジ取得状態を計算
function calcBadges(c){
  const manual=c.badges||{};
  return BADGES.map(b=>({
    ...b,
    earned: b.manual ? !!manual[b.id] : b.check(c),
  }));
}

// バッジをレンダリング（マイページ用）
function renderBadges(c){
  const el=document.getElementById('stBadgeRow');
  if(!el)return;
  const badges=calcBadges(c);
  const earned=badges.filter(b=>b.earned);
  const notEarned=badges.filter(b=>!b.earned);

  if(earned.length===0){
    el.innerHTML=`<div style="color:var(--text2);font-size:.8rem;">まだバッジはないよ！挑戦を続けよう✨</div>`;
    return;
  }

  const typeLabel={continue:'継続',challenge:'挑戦',attitude:'姿勢'};
  const typeColor={continue:'var(--teal)',challenge:'var(--gold)',attitude:'var(--green)'};

  el.innerHTML=`
    <div style="display:flex;flex-wrap:wrap;gap:.45rem;margin-bottom:.6rem;">
      ${earned.map(b=>`
        <div title="${b.desc}" style="
          display:flex;flex-direction:column;align-items:center;gap:.25rem;
          padding:.5rem .6rem;min-width:68px;
          background:${typeColor[b.type]}18;
          border:2px solid ${typeColor[b.type]};
          position:relative;cursor:default;
        ">
          <div style="font-size:1.5rem;line-height:1;">${b.icon}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:.22rem;color:${typeColor[b.type]};text-align:center;line-height:1.5;">${b.name}</div>
          <div style="position:absolute;top:-7px;right:-7px;font-family:'Press Start 2P',monospace;font-size:.2rem;background:${typeColor[b.type]};color:#000;padding:.1rem .3rem;">${typeLabel[b.type]}</div>
        </div>`).join('')}
    </div>
    ${notEarned.filter(b=>!b.manual).length>0?`
    <details style="margin-top:.3rem;">
      <summary style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);cursor:pointer;padding:.3rem 0;">
        🔒 まだのバッジ（${notEarned.filter(b=>!b.manual).length}個）
      </summary>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--border);">
        ${notEarned.filter(b=>!b.manual).map(b=>`
          <div title="${b.desc}" style="
            display:flex;flex-direction:column;align-items:center;gap:.25rem;
            padding:.5rem .6rem;min-width:68px;
            background:var(--bg3);border:2px solid var(--border);
            filter:grayscale(1);opacity:.45;cursor:default;
          ">
            <div style="font-size:1.5rem;line-height:1;">${b.icon}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:.22rem;color:var(--text2);text-align:center;line-height:1.5;">${b.name}</div>
          </div>`).join('')}
      </div>
    </details>`:''
  }`;
}

// 称号を計算
function calcTitle(c){
  const badges=calcBadges(c).filter(b=>b.earned);
  const mastered=countMastered(c);
  const months=monthsSinceJoin(c);
  // 優先度順に称号を返す
  if(mastered>=10)return{title:'レジェンド冒険者',color:'var(--gold)',icon:'👑'};
  if(mastered>=5&&months>=6)return{title:'技の探究者',color:'var(--teal)',icon:'💎'};
  if(badges.some(b=>b.id==='attitude_never'))return{title:'不屈の挑戦者',color:'var(--pink)',icon:'💪'};
  if(mastered>=5)return{title:'技の達人',color:'var(--gold)',icon:'🎖️'};
  if(masteredJobCount(c)>=2)return{title:'マルチプレイヤー',color:'var(--teal)',icon:'🌈'};
  if(mastered>=1)return{title:'初マスター達成',color:'var(--green)',icon:'🏅'};
  if(months>=3)return{title:'継続の冒険者',color:'var(--teal)',icon:'🗓️'};
  return null;
}

// 管理者が姿勢バッジを付与する関数
async function grantBadge(charId, badgeId){
  const c=chars.find(x=>x.id===charId);
  if(!c)return;
  if(!c.badges)c.badges={};
  c.badges[badgeId]=true;
  await saveCharsToGAS(c);
  renderDashboard();
  showToast(`🏅 「${BADGES.find(b=>b.id===badgeId)?.name}」バッジを付与しました！`);
}
async function revokeBadge(charId, badgeId){
  const c=chars.find(x=>x.id===charId);
  if(!c||!c.badges)return;
  delete c.badges[badgeId];
  await saveCharsToGAS(c);
  showToast('バッジを取り消しました');
}



// ======== 本部からの動画一括更新 ========
function renderBulkVideoAdmin(){
  const el = document.getElementById('bulkVideoContent');
  if(!el) return;
  const videos = getSkillVideos();
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer',
    'waterflow','striker','tracerunner','airmaster','illusionist'];

  el.innerHTML = `
    <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);margin-bottom:.7rem;">
      全デバイスに即反映されます。URLを空にすると動画を削除します。
    </div>
    ${jobOrder.map(jk => {
      const jb = JOBS[jk]; if(!jb) return '';
      const jobSkills = SKILL_MAP.filter(([,k])=>k===jk);
      return `<details style="margin-bottom:.5rem;">
        <summary style="font-family:'Press Start 2P',monospace;font-size:.34rem;color:${jb.color};cursor:pointer;padding:.4rem .2rem;">
          ${jb.emoji} ${jb.name}（${jobSkills.filter(([n])=>videos[n]).length}/${jobSkills.length}本登録済）
        </summary>
        <div style="padding:.4rem 0 .4rem .6rem;display:flex;flex-direction:column;gap:.4rem;margin-top:.3rem;">
          ${jobSkills.map(([sk])=>`
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
              <div style="font-weight:700;font-size:.82rem;min-width:120px;flex:1;">${sk}</div>
              <input class="pinput" style="flex:2;min-width:160px;font-size:.78rem;padding:.4rem .6rem;"
                placeholder="YouTube URL"
                value="${videos[sk]||''}"
                data-skill="${sk}"
                oninput="markBulkDirty(this)">
            </div>`).join('')}
        </div>
      </details>`;
    }).join('')}
    <div style="margin-top:.8rem;display:flex;gap:.5rem;">
      <button class="pbtn btn-gold" onclick="saveBulkVideos()" style="flex:1;font-size:.48rem;">💾 一括保存する</button>
      <button class="pbtn btn-outline" onclick="renderBulkVideoAdmin()" style="font-size:.44rem;padding:0 .8rem;">↺ リセット</button>
    </div>
    <div id="bulkSaveStatus" style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);margin-top:.5rem;text-align:center;"></div>
  `;
}

function markBulkDirty(input){
  input.style.borderColor = 'var(--gold)';
}

async function saveBulkVideos(){
  const inputs = document.querySelectorAll('#bulkVideoContent input[data-skill]');
  const videos = {};
  inputs.forEach(inp => {
    const sk = inp.dataset.skill;
    const url = inp.value.trim();
    if(url) videos[sk] = url;
  });
  const statusEl = document.getElementById('bulkSaveStatus');
  if(statusEl) statusEl.textContent = '💾 保存中...';
  localStorage.setItem('jq_videos', JSON.stringify(videos));
  await _fb.saveVideosBulk(videos);
  if(statusEl) statusEl.textContent = `✅ ${Object.keys(videos).length}本の動画URLを全デバイスに保存しました！`;
  showToast(`✅ 動画URL ${Object.keys(videos).length}本を一括保存しました！`);
  // ボーダーをリセット
  document.querySelectorAll('#bulkVideoContent input[data-skill]').forEach(i=>i.style.borderColor='');
}

// ======== 教室カスタマイズ ========
const CLASSROOM_CONFIG = {
  'ルネック勝川（月）': {
    guildName:  'ルネック冒険者ギルド',
    themeColor: '#00e5ff',   // teal（デフォルト）
    accentColor:'#ffd700',   // gold
    teacherChar:'🧑‍🏫',
    emoji:      '🏠',
    greeting:   'ルネック勝川の冒険者たち、今日も全力でいこう！',
  },
  'スタジオMy（木）': {
    guildName:  'スタジオMy 技師団',
    themeColor: '#ff88dd',   // pink系
    accentColor:'#ffaa00',   // orange-gold
    teacherChar:'👩‍🏫',
    emoji:      '🎭',
    greeting:   'スタジオMyの仲間たち、今日も美しい技を目指そう！',
  },
  'ココロネ学園（火）': {
    guildName:  'ココロネ学園 勇者隊',
    themeColor: '#39ff14',   // green
    accentColor:'#00ccee',   // cyan
    teacherChar:'🧑‍🎓',
    emoji:      '🌟',
    greeting:   'ココロネ学園の仲間たち、心をひとつに挑戦しよう！',
  },
};

// 現在の教室テーマを適用
function applyClassroomTheme(classroom){
  const config = CLASSROOM_CONFIG[classroom];
  if(!config) return;
  const root = document.documentElement;
  // CSSカスタムプロパティを上書き
  root.style.setProperty('--teal',      config.themeColor);
  root.style.setProperty('--teal-dim',  hexToRgba(config.themeColor, .2));
  root.style.setProperty('--gold',      config.accentColor);
  root.style.setProperty('--gold2',     shiftColor(config.accentColor, -20));
  root.style.setProperty('--gold-shadow', hexToRgba(config.accentColor, .35));

  // ギルド名をタイトル画面のキャプションに反映
  const captionEl = document.getElementById('titleGuildName');
  if(captionEl) captionEl.textContent = config.emoji + ' ' + config.guildName;

  // マイページナビタイトル
  const navTitle = document.getElementById('stNavTitle');
  if(navTitle) navTitle.textContent = config.guildName;
}

function resetClassroomTheme(){
  const root = document.documentElement;
  root.style.removeProperty('--teal');
  root.style.removeProperty('--teal-dim');
  root.style.removeProperty('--gold');
  root.style.removeProperty('--gold2');
  root.style.removeProperty('--gold-shadow');
  const captionEl = document.getElementById('titleGuildName');
  if(captionEl) captionEl.textContent = '';
  const navTitle = document.getElementById('stNavTitle');
  if(navTitle) navTitle.textContent = 'マイページ';
}

// カラーユーティリティ
function hexToRgba(hex, alpha=1){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function shiftColor(hex, amount){
  return '#'+[1,3,5].map(i=>
    Math.min(255,Math.max(0,parseInt(hex.slice(i,i+2),16)+amount))
    .toString(16).padStart(2,'0')
  ).join('');
}

// 教室コンフィグをUI用に取得
function getClassroomConfig(classroom){
  return CLASSROOM_CONFIG[classroom] || {
    guildName:'JUMPUPクエスト',emoji:'⚔️',greeting:'今日も全力で挑戦しよう！',
    themeColor:'#00e5ff',accentColor:'#ffd700',teacherChar:'👩‍🏫',
  };
}

// ======== ADMIN ========
const ADMIN_ROOMS={
  'jumpup2025':     null,              // スーパー管理者（全教室）
  'runeck2025':     'ルネック勝川（月）',
  'studio2025':     'スタジオMy（木）',
  'cocoro2025':     'ココロネ学園（火）',
};
let adminClassroom=null; // null=全教室、string=特定教室

function adminLogin(){
  const pw=document.getElementById('adminPw').value;
  if(pw in ADMIN_ROOMS){
    adminClassroom=ADMIN_ROOMS[pw];
    document.getElementById('adminLock').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    const modeEl=document.getElementById('adminModeLabel');
    if(modeEl) modeEl.textContent=adminClassroom?`📍 ${adminClassroom}`:'👑 全教室（スーパー管理者）';
    loadAdminSel();loadMsgTarget();loadDelSel();loadBadgeCharSel();
    renderDashboard();
    // スーパー管理者のみ本部分析を表示
    const hqEl=document.getElementById('hqDashboard');
    if(hqEl) hqEl.style.display=adminClassroom?'none':'block';
    if(!adminClassroom){
      renderHQDashboard();
      const bulkEl=document.getElementById('bulkVideoPanel');
      if(bulkEl){ bulkEl.style.display='block'; renderBulkVideoAdmin(); }
    }
  }
  else{const e=document.getElementById('adminErr');e.style.display='block';setTimeout(()=>e.style.display='none',2000);}
}
function adminLogout(){
  adminClassroom=null;
  document.getElementById('adminLock').style.display='block';
  document.getElementById('adminPanel').style.display='none';
  document.getElementById('adminPw').value='';
  const bulkEl=document.getElementById('bulkVideoPanel');
  if(bulkEl) bulkEl.style.display='none';
}
function getAdminChars(){
  if(!adminClassroom) return chars; // 全教室
  return chars.filter(c=>c.classroom===adminClassroom);
}
function loadAdminSel(){
  const s=document.getElementById('adminSel');if(!s)return;
  s.innerHTML='<option value="">-- 選んでね --</option>'+getAdminChars().map(c=>`<option value="${c.id}">${c.name}（${c.id}）</option>`).join('');
}
function loadMsgTarget(){
  const s=document.getElementById('msgTarget');if(!s)return;
  s.innerHTML='<option value="">-- 選んでね --</option>'+getAdminChars().map(c=>`<option value="${c.id}">${c.name}（${c.id}）</option>`).join('');
  document.getElementById('msgDate').value=new Date().toISOString().slice(0,10);
}
function loadDelSel(){
  const s=document.getElementById('delSel');if(!s)return;
  s.innerHTML='<option value="">-- 選んでね --</option>'+getAdminChars().map(c=>`<option value="${c.id}">${c.name}（${c.id}）</option>`).join('');
}
function loadBadgeCharSel(){
  const s=document.getElementById('badgeCharSel');if(!s)return;
  s.innerHTML='<option value="">-- 選んでね --</option>'+getAdminChars().map(c=>`<option value="${c.id}">${c.name}（${c.id}）</option>`).join('');
}
async function grantBadgeFromAdmin(){
  const id=document.getElementById('badgeCharSel').value;
  const badgeId=document.getElementById('badgeSel').value;
  if(!id){showToast('❌ 冒険者を選んでね');return;}
  await grantBadge(id,badgeId);
}
async function revokeBadgeFromAdmin(){
  const id=document.getElementById('badgeCharSel').value;
  const badgeId=document.getElementById('badgeSel').value;
  if(!id){showToast('❌ 冒険者を選んでね');return;}
  await revokeBadge(id,badgeId);
}

// メッセージ送信
async function sendMessage(){
  const id=document.getElementById('msgTarget').value;
  const subject=(document.getElementById('msgSubject').value||'').trim();
  const body=document.getElementById('msgBody').value.trim();
  const date=document.getElementById('msgDate').value||new Date().toISOString().slice(0,10);
  if(!id){showToast('❌ 冒険者を選んでね');return;}
  if(!body){showToast('❌ メッセージを入力してね');return;}
  const c=chars.find(x=>x.id===id);if(!c)return;
  if(!c.messages)c.messages=[];
  c.messages.push({id:Date.now(),date,subject:subject||'先生からのメッセージ',body,read:false});
  await saveCharsToGAS(c);
  document.getElementById('msgSubject').value='';
  document.getElementById('msgBody').value='';
  showToast('📬 「'+c.name+'」にメッセージを送りました！');
}

// ======== 技マスターシステム ========
function getSkillRecords(c){return c.skillRecords||{};}
// ratings: [1回目, 2回目, 3回目] の配列（各値は 3=できた / 1=あと少し / 0=まだ）
function calcSkillStatus(rec, ratings){
  const pts=rec.pts||0, consec0=rec.consec0||0, mastered=rec.mastered||false;
  let newPts=pts, newConsec0=consec0, newMastered=mastered;

  // 3回全部できた → 即マスター
  if(ratings.every(r=>r===3)){
    return{pts:pts+9,lastResult:3,consec0:0,mastered:true,training:false,instantMaster:true};
  }

  const totalAdd=ratings.reduce((s,r)=>s+r,0);
  const allZero=ratings.every(r=>r===0);
  const lastRating=ratings[ratings.length-1];

  if(allZero){
    // 全☆→リセットではなく「修行モード」へ（ポイントは維持）
    newConsec0=consec0+1;
  } else {
    newConsec0=0;
    newPts=pts+totalAdd;
    if(!mastered&&newPts>=10&&lastRating===3) newMastered=true;
  }
  const isTraining=newConsec0>=2;
  return{pts:newPts,lastResult:lastRating,consec0:newConsec0,mastered:newMastered,training:isTraining,instantMaster:false,resetted:false};
}
function loadAdminChar(){
  const id=document.getElementById('adminSel').value;const c=chars.find(x=>x.id===id);
  ['adminCharInfo','adminSkillSec','adminSaveSec'].forEach(i=>document.getElementById(i).style.display=c?'block':'none');
  if(!c)return;
  const j=JOBS[c.job]||JOBS.rookie;
  document.getElementById('aSprite').textContent=c.sprite;document.getElementById('aName').textContent=c.name;
  document.getElementById('aJob').textContent=j.name+'（'+j.genre+'）';document.getElementById('aJob').style.color=j.color;
  
  const recs=getSkillRecords(c);
  const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);
  const masterCnt=Object.values(recs).filter(r=>r.mastered).length;
  document.getElementById('aTotalPt').textContent=`総${totalPt}pt　🏆マスター${masterCnt}技`;
  document.getElementById('adminSkillList').innerHTML='';

  // 前回挑戦した技を自動表示（未マスター・pt>0の技を最大3件）
  const prevSkills=Object.entries(recs)
    .filter(([,r])=>!r.mastered&&(r.pts||0)>0)
    .sort((a,b)=>(b[1].pts||0)-(a[1].pts||0))
    .slice(0,3)
    .map(([name])=>name);
  if(prevSkills.length>0){
    prevSkills.forEach(sk=>addSkillRow(sk));
  } else {
    addSkillRow();
  }
}
function addSkillRow(preselect=null){
  const id=document.getElementById('adminSel').value;const c=chars.find(x=>x.id===id);if(!c)return;
  const list=document.getElementById('adminSkillList');const recs=getSkillRecords(c);
  const allSkills=SKILL_MAP;  // [技名, JOBキー, ...] の配列をそのまま使う
  const rowId='sr_'+Date.now()+Math.random().toString(36).slice(2,5);
  const div=document.createElement('div');div.className='skill-row';div.id=rowId;

  // 技選択
  const sel=document.createElement('select');sel.className='skill-name-sel';
  // JOBごとにグループ化してoptgroupで表示
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
  const grouped={};
  allSkills.forEach(([name,jobKey])=>{
    if(!grouped[jobKey])grouped[jobKey]=[];
    grouped[jobKey].push(name);
  });
  sel.innerHTML='<option value="">-- 技を選ぶ --</option>'+jobOrder.filter(jk=>grouped[jk]).map(jk=>{
    const jb=JOBS[jk];if(!jb)return'';
    const opts=grouped[jk].map(sk=>{
      const r=recs[sk]||{};const m=r.mastered?'🏆 ':'';const p=r.pts?` (${r.pts}pt)`:'';
      return `<option value="${sk}">${m}${sk}${p}</option>`;
    }).join('');
    return `<optgroup label="【${jb.name}】${jb.genre}">${opts}</optgroup>`;
  }).join('');
  if(preselect&&[...sel.options].some(o=>o.value===preselect)){sel.value=preselect;}
  sel.onchange=()=>updateSkillRow(rowId,c);
  if(preselect)updateSkillRow(rowId,c);

  // 3試技ボタン
  const trialsWrap=document.createElement('div');
  trialsWrap.className='trial-wrap';
  [1,2,3].forEach(trial=>{
    const trialDiv=document.createElement('div');
    trialDiv.className='trial-col';
    const label=document.createElement('div');
    label.className='trial-label';
    label.textContent=`${trial}回目`;
    const btnWrap=document.createElement('div');
    btnWrap.style.cssText='display:flex;flex-direction:column;gap:.2rem;';
    [{v:3,label:'⭐⭐⭐'},{v:1,label:'⭐⭐'},{v:0,label:'🌱'}].forEach(({v,label:bl})=>{
      const b=document.createElement('button');
      b.className=`rbtn r${v}`;b.textContent=bl;
      b.dataset.trial=trial;b.dataset.val=v;
      b.onclick=()=>{
        trialDiv.querySelectorAll('.rbtn').forEach(x=>x.classList.remove('sel'));
        b.classList.add('sel');
        updateSkillRow(rowId,c);
      };
      btnWrap.appendChild(b);
    });
    trialDiv.appendChild(label);trialDiv.appendChild(btnWrap);
    trialsWrap.appendChild(trialDiv);
  });

  const ptDisp=document.createElement('div');ptDisp.className='pt-disp';ptDisp.id=rowId+'_pt';ptDisp.textContent='--';
  const delBtn=document.createElement('button');delBtn.className='del-btn';delBtn.textContent='✕';delBtn.onclick=()=>div.remove();
  const prevInfo=document.createElement('div');prevInfo.className='prev-info';prevInfo.id=rowId+'_prev';

  div.appendChild(sel);div.appendChild(trialsWrap);div.appendChild(ptDisp);div.appendChild(delBtn);div.appendChild(prevInfo);
  list.appendChild(div);
}
function updateSkillRow(rowId,c){
  const div=document.getElementById(rowId);const sel=div.querySelector('.skill-name-sel');
  const ptDisp=document.getElementById(rowId+'_pt');
  const prevEl=document.getElementById(rowId+'_prev');const sk=sel.value;
  if(!sk){ptDisp.textContent='--';prevEl.textContent='';return;}
  const recs=getSkillRecords(c);const rec=recs[sk]||{};
  const prevPts=rec.pts||0,isMastered=rec.mastered||false,prevConsec=rec.consec0||0;
  let prevStr=`現在${prevPts}pt`;
  if(isMastered)prevStr+=' 🏆マスター済';else if(prevConsec===1)prevStr+=' 🌱土台づくり中（もう一度がんばろう）';
  if(rec.lastResult!==undefined){const ll=rec.lastResult===3?'⭐⭐⭐':rec.lastResult===1?'⭐⭐':'🌱';prevStr+=`　前回：${ll}`;}
  prevEl.textContent=prevStr;

  // 3試技分の評価を収集
  const ratings=[1,2,3].map(trial=>{
    const selBtn=div.querySelector(`.rbtn.sel[data-trial="${trial}"]`);
    return selBtn?parseInt(selBtn.dataset.val):null;
  });
  const allSelected=ratings.every(r=>r!==null);
  if(!allSelected){ptDisp.textContent='-- (3回入力してね)';div.className='skill-row';return;}

  const result=calcSkillStatus(rec,ratings);
  if(result.training){ptDisp.textContent='🌱 修行クエストへ！';div.className='skill-row';}
  else if(result.instantMaster){ptDisp.textContent='🏆⚡ 一発マスター！';div.className='skill-row master-ready';}
  else if(result.mastered&&!isMastered){ptDisp.textContent=`🏆 ${result.pts}pt`;div.className='skill-row master-ready';}
  else{ptDisp.textContent=`→${result.pts}pt (+${ratings.reduce((s,r)=>s+r,0)}pt)`;div.className='skill-row';}

  // ===== 練習サジェスト =====
  let suggestEl=div.querySelector('.suggest-box');
  if(!suggestEl){suggestEl=document.createElement('div');suggestEl.className='suggest-box';div.appendChild(suggestEl);}

  const jobKey=SKILL_MAP.find(([n])=>n===sk)?.[1];
  const jobSkills=SKILL_MAP.filter(([,j])=>j===jobKey).sort((a,b)=>b[3]-a[3]); // y降順（簡単→難しい順）
  const currentIdx=jobSkills.findIndex(([n])=>n===sk);
  const nextSkill=jobSkills[currentIdx+1]?.[0]||null;   // 次の難しい技
  const prevSkill=jobSkills[currentIdx-1]?.[0]||null;   // 一つ簡単な技

  let suggestHTML='';
  if(result.mastered&&!isMastered||result.instantMaster){
    // マスター確定 → 次の技を提案
    if(nextSkill){
      suggestHTML=`<div style="margin-top:.5rem;padding:.5rem .7rem;background:rgba(255,215,0,.1);border:2px solid var(--gold);border-radius:4px;font-family:'Zen Maru Gothic',sans-serif;font-size:.8rem;line-height:1.6;">
        🏆 マスター！次の挑戦 →<br>
        <strong style="color:var(--gold);">「${nextSkill}」</strong>にチャレンジしよう！
      </div>`;
    } else {
      suggestHTML=`<div style="margin-top:.5rem;padding:.5rem .7rem;background:rgba(255,215,0,.1);border:2px solid var(--gold);border-radius:4px;font-family:'Zen Maru Gothic',sans-serif;font-size:.8rem;">
        🏆 このジョブの技をコンプリート！
      </div>`;
    }
  } else if(ratings.filter(r=>r===0).length>=2){
    // 🌱が2回以上 → 一つ下の技を提案
    if(prevSkill){
      suggestHTML=`<div style="margin-top:.5rem;padding:.5rem .7rem;background:rgba(136,136,255,.1);border:2px solid #8888ff;border-radius:4px;font-family:'Zen Maru Gothic',sans-serif;font-size:.8rem;line-height:1.6;">
        🌱 まずは<strong style="color:#8888ff;">「${prevSkill}」</strong>をしっかり練習しよう！
      </div>`;
    }
  } else if(ratings.some(r=>r===1)){
    // ⭐⭐あり → 2択提案
    const prevTxt=prevSkill?`<strong style="color:var(--teal);">「${prevSkill}」</strong>で基礎固め`:'基礎練習を重点的に';
    suggestHTML=`<div style="margin-top:.5rem;padding:.5rem .7rem;background:rgba(0,229,255,.08);border:2px solid var(--teal);border-radius:4px;font-family:'Zen Maru Gothic',sans-serif;font-size:.8rem;line-height:1.7;">
      💡 この技を続ける？<br>or ${prevTxt}する？
    </div>`;
  }
  suggestEl.innerHTML=suggestHTML;
}
async function saveResult(){
  const id=document.getElementById('adminSel').value;const c=chars.find(x=>x.id===id);if(!c)return;
  const testDate=document.getElementById('adminDate').value||new Date().toISOString().slice(0,10);
  // 最終テスト日を記録
  c.lastTestDate=testDate;
  const rows=document.querySelectorAll('#adminSkillList .skill-row');
  if(rows.length===0){showToast('❌ 技を追加してね');return;}
  if(!c.skillRecords)c.skillRecords={};
  let newMasters=[];
  rows.forEach(row=>{
    const sk=row.querySelector('.skill-name-sel').value;
    if(!sk)return;
    const ratings=[1,2,3].map(trial=>{
      const selBtn=row.querySelector(`.rbtn.sel[data-trial="${trial}"]`);
      return selBtn?parseInt(selBtn.dataset.val):null;
    });
    if(ratings.some(r=>r===null))return; // 未入力はスキップ
    const rec=c.skillRecords[sk]||{};const result=calcSkillStatus(rec,ratings);
    if(result.mastered&&!rec.mastered)newMasters.push({name:sk,instant:result.instantMaster});
    // 成長ログ
    const log={...rec};
    if(!log.firstDate) log.firstDate=testDate;                                      // 初挑戦日
    if(!log.firstStarDate&&ratings.some(r=>r>=1)) log.firstStarDate=testDate;      // 初⭐⭐日
    if(result.mastered&&!rec.mastered) log.masterDate=testDate;                    // マスター日
    if(result.instantMaster) log.instantMaster=true;
    c.skillRecords[sk]={
      pts:result.pts,lastResult:result.lastResult,consec0:result.consec0,
      mastered:result.mastered,training:result.training||false,
      firstDate:log.firstDate,firstStarDate:log.firstStarDate,
      masterDate:log.masterDate,instantMaster:log.instantMaster||false,
    };
  });
  c.skills=Object.entries(c.skillRecords).filter(([,r])=>r.mastered).map(([sk])=>sk);
  showToast('💾 保存中...');await saveTestToGAS(c,testDate);
  if(newMasters.length>0){
    // 全国進捗ログに投稿
    for(const m of newMasters){ await postMasterLog(c, m.name, m.instant); }
    setTimeout(()=>{
      newMasters.forEach((m,i)=>setTimeout(()=>showMasterBanner(m.name,m.instant),i*3200));
      showToast(`🏆 マスター！${newMasters.map(m=>m.name).join('・')}`);
    },500);
  }
  showToast('✅ 保存完了！');
}
function updateNewCharIcon(){
  const name=document.getElementById('newName').value.trim();
  const icon=document.getElementById('newCharIcon');
  if(!icon)return;
  icon.textContent=name?name[0]:'？';
}
async function addChar(){
  const name=document.getElementById('nName').value.trim();if(!name){showToast('❌ 名前を入力してね');return;}
  const classroom=document.getElementById('nClass').value;
  const classPrefix={'ルネック勝川（月）':'RN','スタジオMy（木）':'SM','okokо学園（火）':'CK'}[classroom]||'JU';
  const existCount=chars.filter(c=>c.classroom===classroom).length+1;
  const defaultId=`${classPrefix}-${existCount.toString().padStart(3,'0')}`;
  const id=document.getElementById('nId').value.trim()||defaultId;
  const newChar={id,name,sprite:'🐕',job:'rookie',joinDate:new Date().toISOString().slice(0,10),classroom:document.getElementById('nClass').value,stats:{power:1,flex:1,speed:1,balance:1,beauty:1,focus:1},skills:[],skillRecords:{},messages:[]};
  chars.push(newChar);await saveCharsToGAS(newChar);loadAdminSel();loadMsgTarget();
  document.getElementById('nName').value='';document.getElementById('nId').value='';
  showToast('✅ 「'+name+'」を登録しました！');
}

async function deleteChar(){
  const id=document.getElementById('delSel').value;
  const confirm=document.getElementById('delConfirm').value.trim();
  const c=chars.find(x=>x.id===id);
  if(!c){showToast('❌ 冒険者を選んでね');return;}
  if(confirm!==c.name){showToast('❌ 名前が一致しません');return;}
  chars=chars.filter(x=>x.id!==id);
  saveChars();
  _fb.deleteChar(id).catch(()=>{});
  if(gasReady){try{await gasPost({action:'deleteChar',charId:id});}catch(e){}}
  loadAdminSel();loadMsgTarget();loadDelSel();
  document.getElementById('delConfirm').value='';
  showToast('🗑️ 「'+c.name+'」を削除しました');
}

// ======== 先生ダッシュボード ========

// ======== 本部分析ダッシュボード（スーパー管理者専用） ========
function renderHQDashboard(){
  const el=document.getElementById('hqContent');
  if(!el)return;

  const active=chars.filter(c=>(c.status||'active')==='active');
  const classrooms=['ルネック勝川（月）','スタジオMy（木）','コロネ学園（火）'];

  // 教室別集計
  const classStats=classrooms.map(cls=>{
    const members=active.filter(c=>c.classroom===cls);
    const allRecs=members.flatMap(c=>Object.values(c.skillRecords||{}));
    const masters=allRecs.filter(r=>r.mastered).length;
    const stuck=members.filter(c=>analyzeStuck(c).isStuck).length;
    const avgPt=members.length>0
      ? Math.round(allRecs.reduce((s,r)=>s+(r.pts||0),0)/members.length)
      : 0;
    return{cls,members:members.length,masters,stuck,avgPt};
  });

  // 人気ジョブ（マスター数上位）
  const jobMasterCounts={};
  active.forEach(c=>{
    Object.entries(c.skillRecords||{}).forEach(([sk,r])=>{
      if(!r.mastered)return;
      const jk=SKILL_MAP.find(([n])=>n===sk)?.[1];
      if(jk) jobMasterCounts[jk]=(jobMasterCounts[jk]||0)+1;
    });
  });
  const topJobs=Object.entries(jobMasterCounts)
    .sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([jk,cnt])=>({jk,cnt,j:JOBS[jk]||JOBS.rookie}));

  // 人気技（マスター数上位5）
  const skillMasterCounts={};
  active.forEach(c=>{
    Object.entries(c.skillRecords||{}).forEach(([sk,r])=>{
      if(r.mastered) skillMasterCounts[sk]=(skillMasterCounts[sk]||0)+1;
    });
  });
  const topSkills=Object.entries(skillMasterCounts)
    .sort((a,b)=>b[1]-a[1]).slice(0,5);

  // 全体の継続率（3ヶ月以上）
  const continueRate=active.length>0
    ? Math.round(active.filter(c=>monthsSinceJoin(c)>=3).length/active.length*100)
    : 0;

  el.innerHTML=`
    <!-- 教室別サマリー -->
    <div style="margin-bottom:1rem;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.36rem;color:var(--teal);margin-bottom:.6rem;">📊 教室別サマリー</div>
      <div style="display:flex;flex-direction:column;gap:.4rem;">
        ${classStats.map(s=>`
          <div style="background:var(--bg);border:2px solid var(--border);padding:.6rem .8rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem;">
              <div style="font-weight:900;font-size:.9rem;">${s.cls}</div>
              <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:${s.stuck>0?'var(--pink)':'var(--text2)'};">
                ${s.stuck>0?`⚠️ フォロー推奨 ${s.stuck}名`:'✅ 全員順調'}
              </div>
            </div>
            <div style="display:flex;gap:.8rem;margin-top:.4rem;flex-wrap:wrap;">
              <span style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);">👥 ${s.members}名</span>
              <span style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--gold);">🏆 ${s.masters}マスター</span>
              <span style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--teal);">平均 ${s.avgPt}pt</span>
            </div>
            <div style="margin-top:.4rem;background:var(--bg3);height:5px;border:1px solid var(--border);">
              <div style="height:100%;background:var(--teal);width:${Math.min(100,s.avgPt)}%;transition:width .8s;"></div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 継続率 -->
    <div style="background:var(--bg);border:2px solid var(--border);padding:.7rem .8rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);margin-bottom:.3rem;">3ヶ月以上継続率</div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.9rem;color:var(--green);">${continueRate}%</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);margin-bottom:.3rem;">在籍人数</div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.9rem;color:var(--teal);">${active.length}名</div>
      </div>
    </div>

    <!-- 人気ジョブ -->
    ${topJobs.length>0?`
    <div style="margin-bottom:1rem;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.36rem;color:var(--teal);margin-bottom:.6rem;">🏆 人気ジョブ TOP3</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        ${topJobs.map((item,i)=>`
          <div style="flex:1;min-width:90px;background:var(--bg);border:2px solid ${item.j.color}55;padding:.6rem;text-align:center;">
            <div style="font-size:1.3rem;">${item.j.emoji}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:${item.j.color};margin:.25rem 0;">${item.j.name}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:.36rem;color:var(--gold);">${item.cnt}マスター</div>
          </div>`).join('')}
      </div>
    </div>`:''}

    <!-- 習得しやすい技 TOP5 -->
    ${topSkills.length>0?`
    <div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.36rem;color:var(--teal);margin-bottom:.6rem;">⚔️ みんながマスターした技 TOP5</div>
      ${topSkills.map(([sk,cnt],i)=>`
        <div style="display:flex;align-items:center;gap:.6rem;padding:.4rem .6rem;background:var(--bg);border:1px solid var(--border);margin-bottom:.3rem;">
          <div style="font-family:'Press Start 2P',monospace;font-size:.32rem;color:var(--gold);min-width:20px;">${i+1}.</div>
          <div style="flex:1;font-weight:700;font-size:.85rem;">${sk}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);">${cnt}人</div>
        </div>`).join('')}
    </div>`:''}
  `;
}

// ======== 停滞検知ロジック ========
function analyzeStuck(c){
  const recs = c.skillRecords || {};
  const entries = Object.entries(recs).filter(([,r])=>!r.mastered);
  // 3回連続同じ技が伸びていない（consec0が2以上の技）
  const stuckSkills = entries.filter(([,r])=>(r.consec0||0)>=2).map(([sk,r])=>({
    name: sk,
    consec: r.consec0||0,
    pts: r.pts||0,
  }));
  // 挑戦中技が全く進んでいない（pt=0かつ記録あり）
  const noProgress = entries.filter(([,r])=>(r.pts||0)===0&&Object.keys(recs).length>0);
  const isStuck = stuckSkills.length >= 2 || (Object.keys(recs).length > 0 && noProgress.length === Object.keys(recs).length);
  const isTraining = stuckSkills.length === 1 || Object.values(recs).some(r=>r.training&&!r.mastered);
  return { isStuck, isTraining, stuckSkills };
}

// 停滞技への介入提案を生成
function getInterventionSuggestion(skillName, rec){
  const pts = rec.pts||0;
  const meta = getSkillMeta(skillName);
  const jobKey = SKILL_MAP.find(([n])=>n===skillName)?.[1];
  const jobSkills = SKILL_MAP.filter(([,j])=>j===jobKey).sort((a,b)=>b[3]-a[3]);
  const currentIdx = jobSkills.findIndex(([n])=>n===skillName);
  const easierSkill = jobSkills[currentIdx-1]?.[0]||null;

  const suggestions = [];
  if(easierSkill) suggestions.push(`📚 「${easierSkill}」で基礎を固め直そう`);
  if(meta?.fail) suggestions.push(`⚠️ よくある失敗：${meta.fail.slice(0,30)}…`);
  suggestions.push('💬 補助練習を取り入れてみよう');
  suggestions.push('🎯 まず成功体験を1回作ることを目標に');
  return suggestions.slice(0,2);
}

function renderDashboard(){
  const el=document.getElementById('dashboardContent');
  if(!el)return;
  const adminChars=getAdminChars().filter(c=>(c.status||'active')==='active');
  const archivedChars=getAdminChars().filter(c=>(c.status||'active')!=='active');
  if(adminChars.length===0&&archivedChars.length===0){
    el.innerHTML='<div style="color:var(--text2);font-size:.85rem;">冒険者がいません</div>';return;
  }

  // 統計サマリー
  const totalActive=adminChars.length;
  const allRecs=adminChars.flatMap(c=>Object.values(c.skillRecords||{}));
  const totalMasters=allRecs.filter(r=>r.mastered).length;
  const stuckCount=adminChars.filter(c=>analyzeStuck(c).isStuck).length;
  // 今月未入力チェック
  const thisMonth=new Date().toISOString().slice(0,7);
  const noInputCount=adminChars.filter(c=>!c.lastTestDate||c.lastTestDate.slice(0,7)<thisMonth).length;
  const summaryHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1rem;">
    <div style="background:var(--bg);border:2px solid var(--border);padding:.6rem;text-align:center;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);margin-bottom:.3rem;">在籍</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.7rem;color:var(--teal);">${totalActive}名</div>
    </div>
    <div style="background:var(--bg);border:2px solid var(--border);padding:.6rem;text-align:center;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);margin-bottom:.3rem;">総マスター</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.7rem;color:var(--gold);">${totalMasters}技</div>
    </div>
    <div style="background:var(--bg);border:2px solid ${stuckCount>0?'var(--pink)':'var(--border)'};padding:.6rem;text-align:center;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);margin-bottom:.3rem;">フォロー推奨</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.7rem;color:${stuckCount>0?'var(--pink)':'var(--text2)'};">${stuckCount}名</div>
    </div>
    <div style="background:var(--bg);border:2px solid ${noInputCount>0?'var(--gold)':'var(--border)'};padding:.6rem;text-align:center;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);margin-bottom:.3rem;">今月未入力</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:.7rem;color:${noInputCount>0?'var(--gold)':'var(--text2)'};">${noInputCount}名</div>
    </div>
  </div>`;

  const rows=adminChars.map(c=>{
    const recs=c.skillRecords||{};
    const masterCnt=Object.values(recs).filter(r=>r.mastered).length;
    const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);
    const {isStuck,isTraining,stuckSkills}=analyzeStuck(c);
    const j=JOBS[c.job]||JOBS.rookie;
    return{c,masterCnt,totalPt,isStuck,isTraining,stuckSkills,j};
  }).sort((a,b)=>(b.isStuck-a.isStuck)||(b.isTraining-a.isTraining));

  const rowsHTML=rows.map(({c,masterCnt,totalPt,isStuck,isTraining,stuckSkills,j})=>{
    const statusColor=isStuck?'var(--pink)':isTraining?'#8888ff':'var(--green)';
    const statusLabel=isStuck?'🌱 フォロー推奨':isTraining?'🌱 修行中':'✅ 順調';
    const sprite=SPRITES[c.job]
      ?`<img src="${SPRITES[c.job]}" style="width:32px;height:32px;object-fit:contain;image-rendering:pixelated;">`
      :`<span style="font-size:1.2rem;">${j.emoji}</span>`;

    // 停滞検知：介入提案を展開表示
    let interventionHTML='';
    if(isStuck&&stuckSkills.length>0){
      const sk=stuckSkills[0];
      const rec=(c.skillRecords||{})[sk.name]||{};
      const suggestions=getInterventionSuggestion(sk.name,rec);
      interventionHTML=`<div style="width:100%;margin-top:.4rem;padding:.45rem .6rem;background:rgba(255,64,129,.06);border:1px solid rgba(255,64,129,.3);border-radius:2px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:.26rem;color:var(--pink);margin-bottom:.3rem;">⚠️ 「${sk.name}」が${sk.consec}回連続🌱</div>
        ${suggestions.map(s=>`<div style="font-family:'Zen Maru Gothic',sans-serif;font-size:.78rem;color:var(--text2);line-height:1.7;">${s}</div>`).join('')}
      </div>`;
    }

    return `<div style="padding:.6rem .8rem;background:var(--bg);border:2px solid ${isStuck?'var(--pink)':'var(--border)'};border-left:4px solid ${statusColor};margin-bottom:.4rem;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:.7rem;">
        ${sprite}
        <div style="flex:1;min-width:120px;">
          <div style="font-weight:900;font-size:.95rem;">${c.name}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:${j.color};margin-top:.2rem;">${j.name}</div>
        </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.32rem;text-align:right;">
          <div style="color:var(--gold);">🏆 ${masterCnt}技</div>
          <div style="color:var(--teal);margin-top:.2rem;">${totalPt}pt</div>
        </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:${statusColor};min-width:90px;text-align:right;">${statusLabel}</div>
      </div>
      ${interventionHTML}
    </div>`;
  }).join('');

  // アーカイブ済み（折りたたみ）
  let archiveHTML='';
  if(archivedChars.length>0){
    const archiveLabel={leave:'⏸️ 休会',withdraw:'📦 退会',graduate:'🎓 卒業'};
    archiveHTML=`<details style="margin-top:.8rem;">
      <summary style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--text2);cursor:pointer;padding:.4rem 0;">
        📂 アーカイブ済み（${archivedChars.length}名）
      </summary>
      <div style="margin-top:.5rem;opacity:.6;">
        ${archivedChars.map(c=>{
          const j=JOBS[c.job]||JOBS.rookie;
          const lbl=archiveLabel[c.status||'withdraw']||'';
          return `<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem .7rem;background:var(--bg3);border:1px solid var(--border);margin-bottom:.3rem;">
            <span style="font-size:1rem;">${j.emoji}</span>
            <span style="font-weight:700;font-size:.88rem;">${c.name}</span>
            <span style="font-family:'Press Start 2P',monospace;font-size:.26rem;color:var(--text2);margin-left:auto;">${lbl}</span>
          </div>`;
        }).join('')}
      </div>
    </details>`;
  }

  el.innerHTML=summaryHTML+rowsHTML+archiveHTML;
}

function toggleSpriteAvatar(){
  if(!currentUser)return;
  const key='jq_useSprite_'+currentUser.id;
  const cur=localStorage.getItem(key)==='1';
  localStorage.setItem(key,cur?'0':'1');
  renderStatus(currentUser);
  showToast(cur?'📷 写真モードに切り替えたよ！':'🎮 キャラアイコンに切り替えたよ！');
}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function showLvUp(){const o=document.getElementById('lvup');o.classList.add('show');setTimeout(()=>o.classList.remove('show'),2300);}

// ===== 紙吹雪・マスター演出 =====
function launchConfetti(count=40){
  const colors=['#ffd700','#00e5ff','#ff4081','#39ff14','#ff8c00','#bb33ff'];
  for(let i=0;i<count;i++){
    const el=document.createElement('div');
    el.className='confetti';
    const size=6+Math.random()*8;
    el.style.cssText=`left:${Math.random()*100}vw;width:${size}px;height:${size*0.6}px;background:${colors[i%colors.length]};animation-duration:${1.2+Math.random()*1.8}s;animation-delay:${Math.random()*.6}s;transform:rotate(${Math.random()*360}deg);`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }
}
function showMasterBanner(skillName,isInstant=false){
  // フラッシュ
  const flash=document.createElement('div');flash.className='master-flash';document.body.appendChild(flash);
  setTimeout(()=>flash.remove(),700);
  // バナー
  const banner=document.createElement('div');banner.className='master-banner';
  banner.innerHTML=`
    <div style="font-family:'Press Start 2P',monospace;font-size:clamp(.7rem,3vw,1.1rem);color:var(--gold);text-shadow:0 0 20px var(--gold),4px 4px 0 #6b3500;margin-bottom:.5rem;">${isInstant?'⚡ 一発 ':''}🏆 MASTER！</div>
    <div style="font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:clamp(1rem,4vw,1.5rem);color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.8);max-width:80vw;">${skillName}</div>
    <div style="font-size:1.8rem;margin-top:.4rem;animation:titleGlow 1s ease-in-out infinite alternate;">✨🏆✨</div>`;
  document.body.appendChild(banner);
  setTimeout(()=>banner.remove(),3000);
  launchConfetti(isInstant?60:40);
}

// ======== テンプレコメント ========
function insertTemplate(text){
  const el=document.getElementById('msgBody');
  if(!el)return;
  el.value=text;
  el.focus();
}

// ======== アーカイブ管理 ========
const ARCHIVE_STATUS_LABEL={
  'active':'✅ 在籍中',
  'leave':'⏸️ 休会',
  'withdraw':'📦 退会',
  'graduate':'🎓 卒業',
};
async function archiveChar(){
  const id=document.getElementById('delSel').value;
  const status=document.getElementById('archiveStatus').value;
  const c=chars.find(x=>x.id===id);
  if(!c){showToast('❌ 冒険者を選んでね');return;}
  c.status=status;
  await saveCharsToGAS(c);
  renderDashboard();
  showToast(`📂 「${c.name}」を「${ARCHIVE_STATUS_LABEL[status]}」に変更しました`);
}

// ======== 保護者モード ========
function goParentPage(){
  if(!currentUser){showToast('❌ ログインしてね');return;}
  renderParentPage(currentUser);
  goPage('pg-parent');
}

function renderParentPage(c){
  const j=JOBS[c.job]||JOBS.rookie;
  const recs=c.skillRecords||{};

  // ヘッダー
  const spriteEl=document.getElementById('parentSprite');
  const emojiEl=document.getElementById('parentSpriteEmoji');
  const spriteImg=SPRITES[c.job];
  if(spriteImg){spriteEl.src=spriteImg;spriteEl.style.display='block';emojiEl.style.display='none';}
  else{emojiEl.textContent=c.sprite||'🐕';emojiEl.style.display='block';spriteEl.style.display='none';}
  document.getElementById('parentName').textContent=c.name+'さん';
  document.getElementById('parentJob').textContent=j.name+'（'+j.genre+'）';
  document.getElementById('parentJob').style.color=j.color;
  document.getElementById('parentClass').textContent='📍 '+c.classroom;
  const masterCnt=Object.values(recs).filter(r=>r.mastered).length;
  document.getElementById('parentMasterCnt').textContent=masterCnt+'技';

  // 最近の取り組み
  const thisMonthEl=document.getElementById('parentThisMonth');
  const challenged=Object.entries(recs).filter(([,r])=>!r.mastered&&(r.pts||0)>0);
  const mastered=Object.entries(recs).filter(([,r])=>r.mastered);
  const trainingSkills=Object.entries(recs).filter(([,r])=>r.training&&!r.mastered);
  let monthHTML='';
  if(mastered.length>0){
    monthHTML+=`<div style="background:rgba(255,215,0,.08);border:2px solid var(--gold);border-radius:4px;padding:.6rem .8rem;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--gold);margin-bottom:.4rem;">🏆 できるようになったこと</div>
      <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:.9rem;line-height:1.8;">${mastered.map(([sk])=>`「${sk}」`).join('　')}</div>
    </div>`;
  }
  if(challenged.length>0){
    monthHTML+=`<div style="background:rgba(0,229,255,.06);border:2px solid var(--teal);border-radius:4px;padding:.6rem .8rem;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--teal);margin-bottom:.4rem;">⚔️ 今まさに挑戦中の技</div>
      <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:.9rem;line-height:1.8;">${challenged.map(([sk,r])=>`「${sk}」（${r.pts}pt）`).join('　')}</div>
    </div>`;
  }
  if(trainingSkills.length>0){
    monthHTML+=`<div style="background:rgba(136,136,255,.08);border:2px solid #8888ff;border-radius:4px;padding:.6rem .8rem;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:#8888ff;margin-bottom:.4rem;">🌱 土台づくり中の技</div>
      <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:.9rem;line-height:1.8;">${trainingSkills.map(([sk])=>`「${sk}」`).join('　')}</div>
      <div style="font-size:.8rem;color:var(--text2);margin-top:.4rem;">焦らず一歩一歩、基礎を大切に積み上げています。</div>
    </div>`;
  }
  if(!monthHTML)monthHTML='<div style="color:var(--text2);font-size:.85rem;">まだ記録がありません。一緒に応援しよう！</div>';
  thisMonthEl.innerHTML=monthHTML;

  // 技ごとの成長段階
  const stagesEl=document.getElementById('parentSkillStages');
  const allChallenged=Object.entries(recs).filter(([,r])=>!r.mastered);
  if(allChallenged.length===0){
    stagesEl.innerHTML='<div style="color:var(--text2);font-size:.85rem;">これから技に挑戦していきます！楽しみにしていてください。</div>';
  } else {
    stagesEl.innerHTML=allChallenged.slice(0,8).map(([sk,r])=>{
      const stage=getSkillStage(r);
      const pts=r.pts||0;const rem=Math.max(0,10-pts);
      const logLine=[];
      if(r.firstDate)logLine.push('初挑戦 '+r.firstDate);
      if(r.masterDate)logLine.push('マスター '+r.masterDate);
      return `<div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .7rem;background:var(--bg);border:2px solid ${r.mastered?'var(--gold)':'var(--border)'};border-radius:4px;">
        <div style="font-size:1.1rem;">${stage.icon}</div>
        <div style="flex:1;">
          <div style="font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:.9rem;${r.mastered?'color:var(--gold);':''}">${sk}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:.26rem;color:${stage.color};margin-top:.2rem;">${stage.label}${pts>0?' · '+pts+'pt':''}${!r.mastered&&pts>0?' · あと'+rem+'pt':''}</div>
          ${logLine.length?`<div style="font-family:'Press Start 2P',monospace;font-size:.22rem;color:var(--text2);margin-top:.2rem;">${logLine.join(' → ')}</div>`:''}
        </div>
      </div>`;
    }).join('');
  }

  // バッジ（保護者向け）
  const parentBadgeEl=document.getElementById('parentBadges');
  if(parentBadgeEl){
    const earnedBadges=calcBadges(c).filter(b=>b.earned);
    if(earnedBadges.length===0){
      parentBadgeEl.innerHTML='<div style="color:var(--text2);font-size:.85rem;">これからバッジを集めていきます！</div>';
    } else {
      const typeColor={continue:'var(--teal)',challenge:'var(--gold)',attitude:'var(--green)'};
      parentBadgeEl.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:.4rem;">'+
        earnedBadges.map(b=>`<div style="display:flex;align-items:center;gap:.4rem;padding:.4rem .6rem;background:${typeColor[b.type]}15;border:1px solid ${typeColor[b.type]};border-radius:2px;">
          <span style="font-size:1.1rem;">${b.icon}</span>
          <span style="font-family:'Zen Maru Gothic',sans-serif;font-size:.82rem;font-weight:700;color:${typeColor[b.type]};">${b.name}</span>
        </div>`).join('')+
      '</div>';
    }
  }

  // 先生コメント
  const msgs=(c.messages||[]).slice(-3).reverse();
  const msgsEl=document.getElementById('parentMessages');
  if(msgs.length===0){
    msgsEl.innerHTML='<div style="color:var(--text2);font-size:.85rem;">まだメッセージはありません。</div>';
  } else {
    msgsEl.innerHTML=msgs.map(m=>`
      <div style="border:2px solid var(--border);border-radius:4px;padding:.65rem .8rem;background:var(--bg);">
        <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--teal);margin-bottom:.35rem;">💬 ${m.date||''}</div>
        <div style="font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:.95rem;margin-bottom:.3rem;">${m.subject||'先生からのメッセージ'}</div>
        <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:.85rem;line-height:1.7;color:var(--text2);">${(m.body||'').slice(0,80)}${(m.body||'').length>80?'…':''}</div>
      </div>`).join('');
  }

  // おうちサポート
  const supportEl=document.getElementById('parentHomeSupport');
  const supportMsgs=[];
  if(trainingSkills.length>0)supportMsgs.push(`🌱 「${trainingSkills[0][0]}」の練習を見守ってあげてください。できたときは思いっきり褒めてあげましょう！`);
  if(challenged.length>0){const best=challenged.sort((a,b)=>(b[1].pts||0)-(a[1].pts||0))[0];supportMsgs.push(`⭐ 「${best[0]}」はもう少しでマスターです。おうちでも「がんばってるね！」の一言が力になります。`);}
  if(masterCnt>0)supportMsgs.push(`🏆 ${masterCnt}個の技をマスターしました！ぜひ「見せて！」と声をかけてあげてください。`);
  if(supportMsgs.length===0)supportMsgs.push('🌟 これからどんどん技を覚えていきます。焦らず、楽しみながら応援してあげてください！');
  supportEl.innerHTML=supportMsgs.join('<br><br>');
}


// ======== 月間成長レポート ========
function generateMonthlyReport(c, targetMonth){
  // targetMonth: 'YYYY-MM' 形式。未指定なら当月
  const now = new Date();
  const ym = targetMonth || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [y, m] = ym.split('-');
  const monthLabel = `${y}年${parseInt(m)}月`;
  const j = JOBS[c.job] || JOBS.rookie;
  const recs = c.skillRecords || {};

  // マスター技・挑戦中・土台づくり中
  const mastered = Object.entries(recs).filter(([,r])=>r.mastered).map(([sk])=>sk);
  const challenged = Object.entries(recs).filter(([,r])=>!r.mastered&&(r.pts||0)>0);
  const training = Object.entries(recs).filter(([,r])=>r.training&&!r.mastered);
  const totalPt = Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);

  // 先生コメント（最新1件）
  const latestMsg = (c.messages||[]).slice(-1)[0];

  // おすすめ（次にやること1件）
  let nextRec = null;
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
  for(const jk of jobOrder){
    const cands = SKILL_MAP.filter(([n,k])=>k===jk&&recs[n]&&!recs[n].mastered&&(recs[n].pts||0)>0);
    if(cands.length){nextRec=cands.sort((a,b)=>(recs[b[0]].pts||0)-(recs[a[0]].pts||0))[0][0];break;}
  }

  // HTMLレポート生成
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${c.name}さんの成長レポート ${monthLabel}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Zen+Maru+Gothic:wght@400;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#080818;color:#e8e8ff;font-family:'Zen Maru Gothic',sans-serif;padding:1.5rem;max-width:640px;margin:0 auto;}
  h1{font-family:'Press Start 2P',monospace;font-size:.9rem;color:#ffd700;margin-bottom:.3rem;letter-spacing:2px;}
  .sub{font-size:.8rem;color:#6666aa;margin-bottom:1.5rem;}
  .card{background:#0f0f28;border:2px solid #252550;padding:1.1rem 1.2rem;margin-bottom:1rem;position:relative;}
  .card::after{content:'';position:absolute;bottom:-4px;right:-4px;width:100%;height:100%;background:rgba(37,37,80,.6);z-index:-1;}
  .card-ttl{font-family:'Press Start 2P',monospace;font-size:.5rem;color:#00e5ff;margin-bottom:.7rem;padding-bottom:.5rem;border-bottom:1px solid #252550;}
  .gold{color:#ffd700;} .teal{color:#00e5ff;} .green{color:#39ff14;} .pink{color:#ff4081;}
  .tag{font-family:'Press Start 2P',monospace;font-size:.3rem;padding:.15rem .4rem;border:1px solid;display:inline-block;margin-bottom:.5rem;}
  ul{list-style:none;display:flex;flex-direction:column;gap:.35rem;}
  li{font-size:.9rem;line-height:1.7;padding-left:1em;position:relative;}
  li::before{content:'▶';position:absolute;left:0;color:#00e5ff;font-size:.5em;top:.4em;}
  .pt-big{font-family:'Press Start 2P',monospace;font-size:1.6rem;color:#ffd700;}
  .comment{background:#0d0d22;border-left:3px solid #ffd700;padding:.8rem 1rem;font-size:.9rem;line-height:1.9;white-space:pre-wrap;}
  .next-box{background:rgba(0,229,255,.06);border:2px solid #00e5ff;padding:.8rem 1rem;}
  .footer{font-family:'Press Start 2P',monospace;font-size:.32rem;color:#6666aa;margin-top:1.5rem;text-align:center;line-height:2;}
</style>
</head>
<body>
  <h1>📊 成長レポート</h1>
  <div class="sub">${c.name}さん ／ ${monthLabel} ／ ${c.classroom}</div>

  <div class="card">
    <div class="card-ttl">🏆 マスターした技（累計）</div>
    ${mastered.length>0
      ? `<ul>${mastered.map(sk=>`<li>${sk}</li>`).join('')}</ul>`
      : '<p style="color:#6666aa;font-size:.85rem;">まだマスター技はありません。これからが楽しみ！</p>'}
  </div>

  <div class="card">
    <div class="card-ttl">⚔️ 今挑戦中の技</div>
    ${challenged.length>0
      ? `<ul>${challenged.map(([sk,r])=>`<li>${sk} <span class="teal" style="font-size:.75rem;">（${r.pts}pt）</span></li>`).join('')}</ul>`
      : '<p style="color:#6666aa;font-size:.85rem;">新しい技に挑戦しよう！</p>'}
  </div>

  ${training.length>0 ? `
  <div class="card">
    <div class="card-ttl">🌱 土台づくり中の技</div>
    <ul>${training.map(([sk])=>`<li>${sk}</li>`).join('')}</ul>
    <p style="font-size:.8rem;color:#6666aa;margin-top:.5rem;">焦らず積み上げています。応援してください！</p>
  </div>` : ''}

  <div class="card">
    <div class="card-ttl">📈 合計獲得ポイント</div>
    <div class="pt-big">${totalPt}<span style="font-size:.7rem;color:#6666aa;">pt</span></div>
    <p style="font-size:.8rem;color:#6666aa;margin-top:.4rem;">マスターまで 10pt 必要です</p>
  </div>

  ${latestMsg ? `
  <div class="card">
    <div class="card-ttl">💬 先生からのメッセージ</div>
    <div style="font-size:.75rem;color:#6666aa;margin-bottom:.5rem;">📅 ${latestMsg.date||''}</div>
    <div class="comment">${latestMsg.body||''}</div>
  </div>` : ''}

  ${nextRec ? `
  <div class="card">
    <div class="card-ttl">🎯 来月のおすすめ</div>
    <div class="next-box">
      <div style="font-family:'Press Start 2P',monospace;font-size:.36rem;color:#00e5ff;margin-bottom:.4rem;">次の挑戦</div>
      <div style="font-weight:900;font-size:1.1rem;">「${nextRec}」</div>
    </div>
  </div>` : ''}

  <div class="footer">
    JUMPUPクエスト 成長レポート<br>
    ${c.name}さんの挑戦を、これからも応援しています！
  </div>
</body>
</html>`;

  return html;
}

function openMonthlyReport(){
  if(!currentUser){showToast('❌ ログインしてね');return;}
  const html = generateMonthlyReport(currentUser);
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentUser.name}_成長レポート.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📊 レポートをダウンロードしました！');
}

// LINE送信用短縮レポートを生成してクリップボードにコピー
function generateLINEReport(c){
  const recs = c.skillRecords || {};
  const mastered = Object.entries(recs).filter(([,r])=>r.mastered).map(([sk])=>sk);
  const challenged = Object.entries(recs).filter(([,r])=>!r.mastered&&(r.pts||0)>0);
  const training = Object.entries(recs).filter(([,r])=>r.training&&!r.mastered);
  const totalPt = Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);
  const j = JOBS[c.job]||JOBS.rookie;
  const titleData = calcTitle(c);

  const lines = [];
  lines.push(`🎮 ${c.name}さんの成長レポート`);
  lines.push(`📍 ${c.classroom} ／ ${j.name}`);
  if(titleData) lines.push(`👑 称号：${titleData.title}`);
  lines.push('');

  if(mastered.length > 0){
    lines.push(`🏆 マスター技（${mastered.length}個）`);
    mastered.slice(0,5).forEach(sk => lines.push(`  ✅ ${sk}`));
    if(mastered.length > 5) lines.push(`  …他${mastered.length-5}個`);
    lines.push('');
  }

  if(challenged.length > 0){
    lines.push(`⚔️ 挑戦中（${challenged.length}個）`);
    challenged.slice(0,3).forEach(([sk,r]) => lines.push(`  📈 ${sk}（${r.pts}pt）`));
    lines.push('');
  }

  if(training.length > 0){
    lines.push(`🌱 土台づくり中`);
    training.slice(0,2).forEach(([sk]) => lines.push(`  🌱 ${sk}`));
    lines.push('');
  }

  lines.push(`📊 合計 ${totalPt}pt`);

  const latestMsg = (c.messages||[]).slice(-1)[0];
  if(latestMsg){
    lines.push('');
    lines.push(`💬 先生より`);
    lines.push(latestMsg.body.slice(0,60)+(latestMsg.body.length>60?'…':''));
  }

  lines.push('');
  lines.push('JUMPUPクエスト 🗡️');
  return lines.join('\n');
}

async function copyLINEReport(){
  if(!currentUser){showToast('❌ ログインしてね');return;}
  const text = generateLINEReport(currentUser);
  try{
    await navigator.clipboard.writeText(text);
    showToast('📋 LINEレポートをコピーしました！');
  }catch(e){
    // フォールバック：テキストエリアに表示
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML=`<div style="background:var(--panel);border:3px solid var(--teal);padding:1.5rem;width:min(500px,95vw);max-height:80vh;overflow-y:auto;">
      <div style="font-family:'Press Start 2P',monospace;font-size:.5rem;color:var(--teal);margin-bottom:.8rem;">📋 LINEレポート</div>
      <textarea style="width:100%;height:200px;background:var(--bg);border:2px solid var(--border);color:var(--text);padding:.7rem;font-size:.9rem;line-height:1.8;resize:none;" readonly>${text}</textarea>
      <button class="pbtn btn-teal" onclick="this.parentNode.parentNode.remove()" style="width:100%;margin-top:.8rem;">✕ 閉じる</button>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('textarea').select();
  }
}

// ======== 全国リアルタイム進捗ログ ========
let _activityUnsubscribe = null;

function startActivityLogWatch(){
  if(_activityUnsubscribe) _activityUnsubscribe();
  _activityUnsubscribe = _fb.watchActivityLog(logs => {
    renderActivityLog(logs);
  }, 15);
}

function renderActivityLog(logs){
  const el = document.getElementById('activityLogList');
  if(!el) return;
  if(!logs || logs.length === 0){
    el.innerHTML = '<div style="color:var(--text2);font-size:.8rem;text-align:center;padding:.8rem;">まだ記録がないよ。テストで技をマスターしよう！</div>';
    return;
  }
  el.innerHTML = logs.map(log => {
    const timeAgo = formatTimeAgo(log.ts);
    const isInstant = log.instant ? ' ⚡' : '';
    return `<div style="display:flex;align-items:center;gap:.6rem;padding:.45rem .6rem;border-bottom:1px solid var(--border);animation:fadeIn .4s ease;">
      <div style="font-size:1rem;flex-shrink:0;">${log.emoji||'🏆'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Zen Maru Gothic',sans-serif;font-weight:900;font-size:.85rem;line-height:1.4;">
          ${log.charName}さんが「${log.skillName}」をマスター${isInstant}
        </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.24rem;color:var(--text2);margin-top:.2rem;">
          ${log.classroom||''} · ${timeAgo}
        </div>
      </div>
    </div>`;
  }).join('');
}

function formatTimeAgo(ts){
  if(!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff/60000);
  const hour = Math.floor(diff/3600000);
  const day = Math.floor(diff/86400000);
  if(min < 1) return 'たった今';
  if(min < 60) return `${min}分前`;
  if(hour < 24) return `${hour}時間前`;
  return `${day}日前`;
}

// マスター達成時に全国ログに投稿
async function postMasterLog(c, skillName, isInstant){
  const j = JOBS[c.job] || JOBS.rookie;
  await _fb.postActivityLog({
    type: 'master',
    charName: c.name,
    charId: c.id,
    classroom: c.classroom,
    skillName,
    instant: isInstant || false,
    job: c.job,
    emoji: j.emoji || '🏆',
  });
}

// ======== ギルドイベント ========
let _currentEvent = null;
let _eventUnsubscribe = null;

function startEventWatch(){
  if(_eventUnsubscribe) _eventUnsubscribe();
  _eventUnsubscribe = _fb.watchEvent(event => {
    _currentEvent = event;
    renderEventBanner(event);
    renderEventAdmin(event);
  });
}

function renderEventBanner(event){
  const el = document.getElementById('eventBanner');
  if(!el) return;
  if(!event || !isEventActive(event)){
    el.style.display = 'none';
    return;
  }
  const remaining = getRemainingDays(event.endDate);
  // 参加状況カウント（targetSkillがある場合）
  let participationHTML = '';
  if(event.targetSkill){
    const activeChars = chars.filter(c=>(c.status||'active')==='active');
    const masteredCount = activeChars.filter(c=>(c.skillRecords||{})[event.targetSkill]?.mastered).length;
    const challengedCount = activeChars.filter(c=>{
      const r=(c.skillRecords||{})[event.targetSkill];
      return r&&!r.mastered&&(r.pts||0)>0;
    }).length;
    const total = activeChars.length;
    const pct = total>0 ? Math.round(masteredCount/total*100) : 0;
    participationHTML = `
    <div style="margin-top:.6rem;padding:.5rem .7rem;background:rgba(255,215,0,.06);border:1px solid var(--gold);">
      <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--gold);margin-bottom:.4rem;">
        🎯 「${event.targetSkill}」チャレンジ
      </div>
      <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;">
        <div style="flex:1;background:var(--bg3);height:8px;border:1px solid var(--border);min-width:80px;">
          <div style="height:100%;background:var(--gold);width:${pct}%;transition:width .8s;"></div>
        </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);white-space:nowrap;">
          🏆${masteredCount} / ⚔️${challengedCount} / 👥${total}名
        </div>
      </div>
    </div>`;
  }
  el.style.display = 'block';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;">
      <div style="font-size:1.6rem;">${event.emoji||'🎉'}</div>
      <div style="flex:1;">
        <div style="font-family:'Press Start 2P',monospace;font-size:.38rem;color:var(--gold);margin-bottom:.25rem;">
          ${event.title}
        </div>
        <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:.82rem;color:var(--text2);line-height:1.6;">
          ${event.description||''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-family:'Press Start 2P',monospace;font-size:.28rem;color:var(--text2);">残り</div>
        <div style="font-family:'Press Start 2P',monospace;font-size:.65rem;color:${remaining<=3?'var(--pink)':'var(--gold)'};">${remaining}日</div>
      </div>
    </div>
    ${participationHTML}
  `;
}

function renderEventAdmin(event){
  const el = document.getElementById('eventAdminForm');
  if(!el) return;
  if(event && isEventActive(event)){
    el.innerHTML = `
      <div style="background:rgba(255,215,0,.08);border:2px solid var(--gold);padding:.7rem .8rem;margin-bottom:.7rem;">
        <div style="font-family:'Press Start 2P',monospace;font-size:.3rem;color:var(--gold);margin-bottom:.4rem;">🎉 開催中：${event.title}</div>
        <div style="font-size:.82rem;color:var(--text2);">${event.startDate} 〜 ${event.endDate}</div>
      </div>
      <button class="pbtn btn-pink" onclick="endEvent()" style="width:100%;font-size:.44rem;">🛑 イベントを終了する</button>
    `;
  } else {
    el.innerHTML = `
      <div class="admin-grid2" style="margin-bottom:.6rem;">
        <div>
          <label class="form-lbl">イベント名</label>
          <input class="pinput" id="evTitle" placeholder="例：春の技チャレンジ" style="width:100%;">
        </div>
        <div>
          <label class="form-lbl">絵文字</label>
          <input class="pinput" id="evEmoji" placeholder="🌸" style="width:100%;" maxlength="2">
        </div>
      </div>
      <div style="margin-bottom:.6rem;">
        <label class="form-lbl">説明文</label>
        <input class="pinput" id="evDesc" placeholder="例：この期間中に新しい技に挑戦しよう！" style="width:100%;">
      </div>
      <div style="margin-bottom:.6rem;">
        <label class="form-lbl">イベント対象技（任意）</label>
        <select class="fselect" id="evSkill">
          <option value="">-- 技を指定しない --</option>
          ${(() => {
            const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];
            const grouped={};
            SKILL_MAP.forEach(([n,jk])=>{if(!grouped[jk])grouped[jk]=[];grouped[jk].push(n);});
            return jobOrder.filter(jk=>grouped[jk]).map(jk=>{
              const jb=JOBS[jk];
              return `<optgroup label="【${jb.name}】">${grouped[jk].map(sk=>`<option value="${sk}">${sk}</option>`).join('')}</optgroup>`;
            }).join('');
          })()}
        </select>
      </div>
      <div class="admin-grid2" style="margin-bottom:.7rem;">
        <div>
          <label class="form-lbl">開始日</label>
          <input class="pinput fselect" type="date" id="evStart" style="width:100%;">
        </div>
        <div>
          <label class="form-lbl">終了日</label>
          <input class="pinput fselect" type="date" id="evEnd" style="width:100%;">
        </div>
      </div>
      <button class="pbtn btn-gold" onclick="startEvent()" style="width:100%;font-size:.48rem;">🎉 イベントを開始する</button>
    `;
    // 今日の日付をデフォルト設定
    const today = new Date().toISOString().slice(0,10);
    const nextWeek = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    const evStart = document.getElementById('evStart');
    const evEnd = document.getElementById('evEnd');
    if(evStart) evStart.value = today;
    if(evEnd) evEnd.value = nextWeek;
  }
}

function isEventActive(event){
  if(!event) return false;
  const now = new Date().toISOString().slice(0,10);
  return event.startDate <= now && now <= event.endDate;
}

function getRemainingDays(endDate){
  if(!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

async function startEvent(){
  const title = (document.getElementById('evTitle')?.value||'').trim();
  const emoji = document.getElementById('evEmoji')?.value||'🎉';
  const desc = document.getElementById('evDesc')?.value||'';
  const skill = document.getElementById('evSkill')?.value||'';
  const startDate = document.getElementById('evStart')?.value;
  const endDate = document.getElementById('evEnd')?.value;
  if(!title){ showToast('❌ イベント名を入力してね'); return; }
  if(!startDate||!endDate){ showToast('❌ 期間を設定してね'); return; }
  if(startDate > endDate){ showToast('❌ 終了日は開始日より後にしてね'); return; }
  const event = { title, emoji, description:desc, targetSkill:skill, startDate, endDate };
  await _fb.saveEvent(event);
  showToast(`🎉 「${title}」イベントを開始しました！`);
}

async function endEvent(){
  await _fb.deleteEvent();
  showToast('🛑 イベントを終了しました');
}

