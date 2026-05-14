// ======== data.js ========
// JUMPUPクエスト 静的データ定義ファイル
// SPRITES / JOBS / SKILL_MAP / SKILL_META / CLASSROOM_CONFIG
// ※ index.html で main_core.js より先に読み込むこと


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


// ======== 技メタ情報（動画導線強化） ========
// [見るポイント, よくある失敗例, 次に見るべき基礎技(任意)]
const SKILL_META = {
  // ROOKIE
  '片手バランス（右左）':  {point:'両膝、両腕をしっかり伸ばして顔は正面に向けよう', fail:'目線がぶれてバランスを崩しやすい。視線の固定が最重要！', base:null},
  'ワンステップ':          {point:'腕を下から振り上げ前に跳ぶ。最後利き足が前に出るように着地', fail:'両足で同時に着地をせず、ジャンプ・トン・トンのリズムで着地しよう', base:'片手バランス（右左）'},
  'ブリッジ（30秒）':      {point:'腕と足を肩幅に開き、かかとを上げておへそを高く持ち上げる意識で', fail:'腕が曲がって頭が下がる。肘をしっかり伸ばしてから上げよう', base:null},
  'でんぐり返り':          {point:'手をついたらすぐあごを引いて、丸くなって回ろう', fail:'手が遠すぎて頭が先につく。手をもっと近くについてみよう', base:null},
  'ゆりかご':              {point:'背中を丸めてスムーズに揺れる。首は絶対に床につけない', fail:'背中が伸びて勢いが出ない。丸まることが大事', base:null},
  '壁のぼり倒立':          {point:'一歩一歩確実に足を上げて、腕でしっかり体を支えよう', fail:'壁で体が曲がらないように。お尻に力を入れて肩に体を乗せるイメージを', base:'ブリッジ（30秒）'},

  // CHALLENGER
  'ツーステップ':          {point:'両手を伸ばし足先まで意識して軽やかに。ジャンプが安定したら半回転からの上水平バランスへ', fail:'リズムが取れないと足がうまく運べない。足を上げたらトン・ト・トーンのリズムで', base:'ワンステップ'},
  '前転':                  {point:'マットを蹴って回転し直ぐに足を抱えて回る。最後は立ち上がれたら◎', fail:'頭が上がると回れない。手を着いたら後頭部をマットに着けよう', base:'でんぐり返り'},
  '後転':                  {point:'手は上向けで耳の横に、おへそを見て体を丸める。頭より先に手を着いて押そう', fail:'回転力が大事。マットを思い切り蹴って勢いをつけて回ろう', base:'ゆりかご'},
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
