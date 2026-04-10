
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
let _fb={saveChar:()=>Promise.resolve(),deleteChar:()=>Promise.resolve()};
let fbLoaded=false;
async function loadFirebase(){
  if(fbLoaded)return;
  try{
    const m=await import('./firebase.js');
    await m.fbInit();
    _fb={saveChar:m.fbSaveChar,deleteChar:m.fbDeleteChar};
    fbLoaded=true;
    const fbChars=await m.fbGetAll();
    if(fbChars&&fbChars.length>0){chars=fbChars;saveChars();showGasStatus('online');console.log('Firebase: '+fbChars.length+'件読み込み');}
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
async function saveCharsToGAS(char){saveChars();_fb.saveChar(char).catch(()=>{});if(!gasReady)return;try{await gasPost({action:'saveChar',char});}catch(e){}}
async function saveTestToGAS(char,testDate){saveChars();_fb.saveChar(char).catch(()=>{});if(!gasReady)return;try{await gasPost({action:'saveTest',charId:char.id,charName:char.name,testDate,stats:char.stats,char});}catch(e){}}
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
function renderNextAction(c){
  const el=document.getElementById('stNextAction');
  if(!el)return;
  const recs=c.skillRecords||{};
  const jobOrder=['rookie','challenger','ninja','airrider','coremaster','performer','waterflow','striker','tracerunner','airmaster','illusionist'];

  // 挑戦中（未マスター・pt>0）の技を優先、次いで未挑戦技
  let nextSkill=null, nextPtMsg='';
  for(const jk of jobOrder){
    const candidates=SKILL_MAP.filter(([n,k])=>k===jk&&recs[n]&&!recs[n].mastered&&(recs[n].pts||0)>0);
    if(candidates.length){
      const [name]=candidates.sort((a,b)=>(recs[b[0]].pts||0)-(recs[a[0]].pts||0))[0];
      const pts=recs[name].pts||0;
      nextSkill=name;
      nextPtMsg=`あと${Math.max(0,10-pts)}pt でマスター！（現在${pts}pt）`;
      break;
    }
  }
  if(!nextSkill){
    // 未挑戦の技を探す
    for(const jk of jobOrder){
      const untried=SKILL_MAP.filter(([n,k])=>k===jk&&!recs[n]);
      if(untried.length){nextSkill=untried[0][0];nextPtMsg='まだ挑戦していない技だよ！';break;}
    }
  }
  if(!nextSkill){el.style.display='none';return;}

  // 今月のポイント計算（簡易：skillRecordsの合計）
  const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);

  document.getElementById('stNextSkill').textContent=nextSkill;
  document.getElementById('stNextPt').textContent=nextPtMsg;
  document.getElementById('stMonthPt').textContent=totalPt+'pt';
  el.style.display='block';
}

function renderMailBox(c){
  const msgs=(c.messages||[]).slice().reverse(); // 新しい順
  const mailList=document.getElementById('stMailList');
  const badge=document.getElementById('stUnreadBadge');
  const unreadCnt=msgs.filter(m=>!m.read).length;
  if(badge) badge.style.display=unreadCnt>0?'inline':'none';

  if(msgs.length===0){
    mailList.innerHTML='<div style="color:var(--text2);font-size:.85rem;padding:.5rem 0;">まだメッセージはないよ。テストをがんばろう！</div>';
    return;
  }
  const j=JOBS[c.job]||JOBS.rookie;
  mailList.innerHTML=msgs.map((m,idx)=>{
    const subject=m.subject||'先生からのメッセージ';
    const preview=m.body?m.body.slice(0,40)+(m.body.length>40?'…':''):'';
    const accentColor=m.read?'var(--border)':j.color;
    const unreadDot=m.read?'':' <div class="mail-item-unread-dot"></div>';
    return `<div class="mail-item${m.read?'':' unread'}" onclick="openMailModal(${idx})">
      <div class="mail-item-accent" style="background:${accentColor};"></div>
      <div class="mail-item-content">
        <div class="mail-item-top">
          <div class="mail-item-subject">${subject}</div>
          ${unreadDot}
          <div class="mail-item-date">${m.date||''}</div>
        </div>
        <div class="mail-item-preview">${preview}</div>
      </div>
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
  document.getElementById('stJoinDate').textContent=c.joinDate;
  document.getElementById('stClass').textContent=c.classroom;
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
        return `<div style="background:var(--bg3);border-left:3px solid ${jb.color};padding:.6rem .8rem;border-radius:0 6px 6px 0;">
          <div style="font-weight:700;font-size:.88rem;">${name}</div>
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
function renderLegend(){
  if(curJob!=='all'){document.getElementById('mapLegend').innerHTML='';return;}
  document.getElementById('mapLegend').innerHTML=Object.entries(JOBS).filter(([k])=>k!=='next'&&SKILL_MAP.some(([,j])=>j===k)).map(([,j])=>`<div style="display:flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--text2);"><div style="width:10px;height:10px;background:${j.color};border-radius:50%;box-shadow:0 0 4px ${j.color}88;"></div>${j.name}</div>`).join('');
}
function isLight(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return(r*299+g*587+b*114)/1000>130;}
function dk(h){return'#'+[1,3,5].map(i=>Math.max(0,parseInt(h.slice(i,i+2),16)-50).toString(16).padStart(2,'0')).join('');}

// ======== ADMIN ========
function adminLogin(){
  if(document.getElementById('adminPw').value==='jumpup2025'){
    document.getElementById('adminLock').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    loadAdminSel();loadMsgTarget();loadDelSel();
    renderDashboard();
  }
  else{const e=document.getElementById('adminErr');e.style.display='block';setTimeout(()=>e.style.display='none',2000);}
}
function adminLogout(){document.getElementById('adminLock').style.display='block';document.getElementById('adminPanel').style.display='none';document.getElementById('adminPw').value='';}
function loadAdminSel(){
  const s=document.getElementById('adminSel');if(!s)return;
  s.innerHTML='<option value="">-- 選んでね --</option>'+chars.map(c=>`<option value="${c.id}">${c.name}（${c.id}）</option>`).join('');
}
function loadMsgTarget(){
  const s=document.getElementById('msgTarget');if(!s)return;
  s.innerHTML='<option value="">-- 選んでね --</option>'+chars.map(c=>`<option value="${c.id}">${c.name}（${c.id}）</option>`).join('');
  document.getElementById('msgDate').value=new Date().toISOString().slice(0,10);
}
function loadDelSel(){
  const s=document.getElementById('delSel');if(!s)return;
  s.innerHTML='<option value="">-- 選んでね --</option>'+chars.map(c=>`<option value="${c.id}">${c.name}（${c.id}）</option>`).join('');
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
  document.getElementById('adminSkillList').innerHTML='';addSkillRow();
}
function addSkillRow(){
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
  sel.onchange=()=>updateSkillRow(rowId,c);

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
}
async function saveResult(){
  const id=document.getElementById('adminSel').value;const c=chars.find(x=>x.id===id);if(!c)return;
  const testDate=document.getElementById('adminDate').value||new Date().toISOString().slice(0,10);
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
    c.skillRecords[sk]={pts:result.pts,lastResult:result.lastResult,consec0:result.consec0,mastered:result.mastered};
  });
  c.skills=Object.entries(c.skillRecords).filter(([,r])=>r.mastered).map(([sk])=>sk);
  showToast('💾 保存中...');await saveTestToGAS(c,testDate);
  if(newMasters.length>0){
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
  const id=document.getElementById('nId').value.trim()||'JU-'+(chars.length+1).toString().padStart(3,'0');
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
function renderDashboard(){
  const el=document.getElementById('dashboardContent');
  if(!el)return;
  if(chars.length===0){el.innerHTML='<div style="color:var(--text2);font-size:.85rem;">冒険者がいません</div>';return;}

  const now=new Date();
  const rows=chars.map(c=>{
    const recs=c.skillRecords||{};
    const masterCnt=Object.values(recs).filter(r=>r.mastered).length;
    const totalPt=Object.values(recs).reduce((s,r)=>s+(r.pts||0),0);
    const trainings=Object.values(recs).filter(r=>r.training&&!r.mastered).length;
    const challenged=Object.values(recs).filter(r=>(r.pts||0)>0&&!r.mastered).length;
    // 停滞判定：挑戦中なのに修行モード2つ以上、またはポイントが全部0
    const isStuck=trainings>=2||(Object.keys(recs).length>0&&totalPt===0);
    const j=JOBS[c.job]||JOBS.rookie;
    return{c,masterCnt,totalPt,trainings,challenged,isStuck,j};
  }).sort((a,b)=>(b.isStuck-a.isStuck)||b.trainings-a.trainings);

  el.innerHTML=rows.map(({c,masterCnt,totalPt,trainings,isStuck,j})=>{
    const statusColor=isStuck?'var(--pink)':trainings>0?'#8888ff':'var(--green)';
    const statusLabel=isStuck?'🌱 フォロー推奨':trainings>0?'🌱 修行中':'✅ 順調';
    const sprite=SPRITES[c.job]?`<img src="${SPRITES[c.job]}" style="width:32px;height:32px;object-fit:contain;image-rendering:pixelated;">`:`<span style="font-size:1.2rem;">${j.emoji}</span>`;
    return `<div style="display:flex;align-items:center;gap:.7rem;padding:.6rem .8rem;background:var(--bg);border:2px solid ${isStuck?'var(--pink)':'var(--border)'};border-left:4px solid ${statusColor};margin-bottom:.4rem;flex-wrap:wrap;">
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
    </div>`;
  }).join('');
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
