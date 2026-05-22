// ============================================================
// JUMPUP クエスト - Google Apps Script バックエンド
// ============================================================

const SHEET_CHARS   = '冒険者';
const SHEET_HISTORY = 'テスト履歴';

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_CHARS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_CHARS);
    sh.getRange(1, 1, 1, 6).setValues([[
      'ID', '名前', 'JOB', '教室', '参加日', 'データ(JSON)'
    ]]);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1a1a3a').setFontColor('white');
    sh.setFrozenRows(1);
  }
  let sh2 = ss.getSheetByName(SHEET_HISTORY);
  if (!sh2) {
    sh2 = ss.insertSheet(SHEET_HISTORY);
    sh2.getRange(1, 1, 1, 5).setValues([[
      '記録日時', '冒険者ID', '冒険者名', 'テスト日', 'データ(JSON)'
    ]]);
    sh2.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#1a1a3a').setFontColor('white');
    sh2.setFrozenRows(1);
  }
  return '初期化完了！';
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    let result;
    if (action === 'getAll')          result = getAllChars();
    else if (action === 'getChar')    result = getChar(e.parameter.id);
    else if (action === 'getHistory') result = getHistory(e.parameter.id);
    else                              result = { error: '不明なアクション: ' + action };
    return jsonResponse(result);
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  try {
    let result;
    if (action === 'saveChar')        result = saveChar(data.char);
    else if (action === 'addChar')    result = addChar(data.char);
    else if (action === 'saveTest')   result = saveTestResult(data);
    else if (action === 'deleteChar') result = deleteChar(data.charId);
    else if (action === 'sendEmail')  result = sendEmailToParent(data);
    else if (action === 'init')       result = { message: initSheets() };
    else                              result = { error: '不明なアクション: ' + action };
    return jsonResponse(result);
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

function getAllChars() {
  const sh = getSheet(SHEET_CHARS);
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return { chars: [] };
  const chars = rows.slice(1).map(row => parseCharRow(row));
  return { chars };
}

function getChar(id) {
  const sh = getSheet(SHEET_CHARS);
  const rows = sh.getDataRange().getValues();
  const row = rows.slice(1).find(r => r[0] === id);
  if (!row) return { error: '冒険者が見つかりません: ' + id };
  return { char: parseCharRow(row) };
}

function getHistory(id) {
  const sh = getSheet(SHEET_HISTORY);
  const rows = sh.getDataRange().getValues();
  const history = rows.slice(1)
    .filter(r => r[1] === id)
    .map(r => ({
      timestamp: r[0], charId: r[1], charName: r[2], testDate: r[3],
      data: safeParseJSON(r[4], {})
    }));
  return { history };
}

function saveChar(char) {
  const sh = getSheet(SHEET_CHARS);
  const rows = sh.getDataRange().getValues();
  const idx = rows.slice(1).findIndex(r => r[0] === char.id);
  const rowData = charToRow(char);
  if (idx >= 0) {
    sh.getRange(idx + 2, 1, 1, rowData.length).setValues([rowData]);
    return { success: true, message: '更新しました: ' + char.name };
  } else {
    sh.appendRow(rowData);
    return { success: true, message: '追加しました: ' + char.name };
  }
}

function addChar(char) {
  const sh = getSheet(SHEET_CHARS);
  const rows = sh.getDataRange().getValues();
  if (rows.slice(1).some(r => r[0] === char.id)) {
    return { error: 'IDが重複しています: ' + char.id };
  }
  sh.appendRow(charToRow(char));
  return { success: true, message: '登録しました: ' + char.name };
}

function deleteChar(charId) {
  const sh = getSheet(SHEET_CHARS);
  const rows = sh.getDataRange().getValues();
  const idx = rows.slice(1).findIndex(r => r[0] === charId);
  if (idx < 0) return { error: '冒険者が見つかりません: ' + charId };
  sh.deleteRow(idx + 2);
  return { success: true, message: '削除しました: ' + charId };
}

function saveTestResult(data) {
  const sh = getSheet(SHEET_HISTORY);
  sh.appendRow([
    new Date().toLocaleString('ja-JP'),
    data.charId,
    data.charName,
    data.testDate,
    JSON.stringify(data.char || {})
  ]);
  // キャラデータも更新
  if (data.char) saveChar(data.char);
  // マスター達成メール送信
  if (data.newMasters && data.newMasters.length > 0 && data.char?.email) {
    data.newMasters.forEach(skillName => {
      try { sendMasterEmail(data.char, skillName); } catch(e) {}
    });
  }
  return { success: true, message: 'テスト結果を保存しました' };
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { initSheets(); sh = ss.getSheetByName(name); }
  return sh;
}

// キャラ全データをJSON1列で保存（skillRecords・messages・badges等を含む）
function charToRow(char) {
  return [
    char.id,
    char.name,
    char.job || 'rookie',
    char.classroom || '',
    char.joinDate || new Date().toISOString().slice(0,10),
    JSON.stringify(char), // キャラ全データをJSON保存
  ];
}

function parseCharRow(row) {
  // 新形式：6列目にJSON全データ
  if (row[5] && row[5] !== '') {
    const char = safeParseJSON(row[5], null);
    if (char && char.id) return char;
  }
  // 旧形式フォールバック（移行期間用）
  return {
    id:           row[0],
    name:         row[1],
    sprite:       row[2] || '🐕',
    job:          row[3] || 'rookie',
    level:        Number(row[4]) || 1,
    exp:          Number(row[5]) || 0,
    joinDate:     row[6] instanceof Date
                    ? Utilities.formatDate(row[6], 'Asia/Tokyo', 'yyyy-MM-dd')
                    : (row[6] || ''),
    classroom:    row[7] || '',
    stats:        safeParseJSON(row[8], {power:1,flex:1,speed:1,balance:1,beauty:1,focus:1}),
    skills:       safeParseJSON(row[9], []),
    skillRecords: {},
    messages:     [],
    badges:       {},
  };
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch(e) { return fallback; }
}

// ======== 保護者メール送信 ========
function sendEmailToParent(data) {
  const { to, subject, body, charName } = data;
  if (!to) return { error: 'メールアドレスがありません' };
  if (!subject || !body) return { error: '件名または本文がありません' };

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#080818;color:#e8e8ff;padding:20px;border-radius:8px;">
        <h2 style="color:#ffd700;font-size:16px;margin-bottom:16px;">🎮 JUMPUPクエスト</h2>
        <h3 style="color:#00e5ff;font-size:14px;margin-bottom:12px;">${subject}</h3>
        <div style="background:#0f0f28;padding:16px;border-radius:4px;line-height:1.8;white-space:pre-wrap;">${body}</div>
        <p style="color:#6666aa;font-size:12px;margin-top:16px;">
          ${charName}さんの保護者様へ<br>
          JUMPUPクエスト 先生より
        </p>
      </div>
    </div>`;

  GmailApp.sendEmail(to, `【JUMPUPクエスト】${subject}`, body, {
    htmlBody: htmlBody,
    name: 'JUMPUPクエスト',
  });

  return { success: true, message: `${to} にメールを送信しました` };
}

// マスター達成メール
function sendMasterEmail(char, skillName) {
  if (!char.email) return;
  const subject = `🏆 ${char.name}さんが「${skillName}」をマスターしました！`;
  const body = `${char.name}さんが「${skillName}」をマスターしました！\n\n引き続き応援よろしくお願いします。\n\nJUMPUPクエスト 先生より`;
  sendEmailToParent({ to: char.email, subject, body, charName: char.name });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
