[1mdiff --git a/app.js b/app.js[m
[1mindex 746ca04..fae7716 100644[m
[1m--- a/app.js[m
[1m+++ b/app.js[m
[36m@@ -364,6 +364,7 @@[m [mfunction setupEventListeners() {[m
   document.getElementById('detail-edit-btn').addEventListener('click', editKnowledge);[m
   document.getElementById('detail-delete-btn').addEventListener('click', deleteKnowledge);[m
   document.getElementById('detail-download-json-btn').addEventListener('click', downloadAsJson);[m
[32m+[m[32m  document.getElementById('bulk-export-json-btn').addEventListener('click', bulkExportAsJsonZip);[m
   document.getElementById('detail-download-csv-btn').addEventListener('click', downloadAsCsv);[m
   document.getElementById('submit-comment-btn').addEventListener('click', submitComment);[m
 [m
[36m@@ -746,7 +747,8 @@[m [masync function markAllNotificationsRead() {[m
   showToast('すべての通知を既読にしました', 'success');[m
 }[m
 [m
[31m-function renderKnowledgeList() {[m
[32m+[m[32m// 現在の検索条件・フィルター・並び順を適用した記事一覧を返す（一覧表示と一括エクスポートで共用）[m
[32m+[m[32mfunction getFilteredKnowledgeItems() {[m
   const searchQuery = document.getElementById('search-input').value.toLowerCase();[m
   const categoryFilter = document.getElementById('filter-category').value;[m
   const authorFilter = document.getElementById('filter-author').value;[m
[36m@@ -814,9 +816,21 @@[m [mfunction renderKnowledgeList() {[m
     filtered.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));[m
   }[m
 [m
[32m+[m[32m  return filtered;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mfunction renderKnowledgeList() {[m
[32m+[m[32m  const filtered = getFilteredKnowledgeItems();[m
[32m+[m
   const listEl = document.getElementById('knowledge-list');[m
   const emptyState = document.getElementById('empty-state');[m
 [m
[32m+[m[32m  // 一括エクスポートバー（件数表示・ボタンの有効/無効）[m
[32m+[m[32m  const resultCountEl = document.getElementById('list-result-count');[m
[32m+[m[32m  if (resultCountEl) resultCountEl.textContent = `${filtered.length} 件`;[m
[32m+[m[32m  const bulkBtn = document.getElementById('bulk-export-json-btn');[m
[32m+[m[32m  if (bulkBtn) bulkBtn.disabled = filtered.length === 0;[m
[32m+[m
   if (filtered.length === 0) {[m
     listEl.classList.add('hidden');[m
     emptyState.classList.remove('hidden');[m
[36m@@ -1539,19 +1553,157 @@[m [masync function deleteKnowledge() {[m
   }[m
 }[m
 [m
[31m-function downloadAsJson() {[m
[31m-  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);[m
[31m-  if (!item) return;[m
[31m-  [m
[31m-  const textContent = item.content[m
[31m-    .filter(c => c.type === 'text')[m
[31m-    .map(c => c.value)[m
[31m-    .join('\n');[m
[31m-  [m
[31m-  const exportData = {[m
[32m+[m[32m// ファイル名に使えない文字を置換[m
[32m+[m[32mfunction sanitizeFileName(name) {[m
[32m+[m[32m  return String(name).replace(/[\/\\:*?"<>|]/g, '_').trim() || 'file';[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m// 同じフォルダ内でファイル名が重複しないよう「名前 (2).png」形式にする[m
[32m+[m[32mfunction makeUniqueName(name, usedNames) {[m
[32m+[m[32m  if (!usedNames.has(name)) {[m
[32m+[m[32m    usedNames.add(name);[m
[32m+[m[32m    return name;[m
[32m+[m[32m  }[m
[32m+[m[32m  const dot = name.lastIndexOf('.');[m
[32m+[m[32m  const base = dot > 0 ? name.slice(0, dot) : name;[m
[32m+[m[32m  const ext = dot > 0 ? name.slice(dot) : '';[m
[32m+[m[32m  let n = 2;[m
[32m+[m[32m  while (usedNames.has(`${base} (${n})${ext}`)) n++;[m
[32m+[m[32m  const unique = `${base} (${n})${ext}`;[m
[32m+[m[32m  usedNames.add(unique);[m
[32m+[m[32m  return unique;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m// エクスポート用に本文を組み立てる。[m
[32m+[m[32m// 画像・添付ファイルは本文中の位置に [画像: ファイル名] / [添付ファイル: ファイル名] として埋め込む。[m
[32m+[m[32m// attachments には zip に同梱するためのデータ（フォルダ内パス・元データ）を返す[m
[32m+[m[32mfunction buildExportContent(item) {[m
[32m+[m[32m  const images = [];[m
[32m+[m[32m  const files = [];[m
[32m+[m[32m  const attachments = [];[m
[32m+[m[32m  const usedImageNames = new Set();[m
[32m+[m[32m  const usedFileNames = new Set();[m
[32m+[m
[32m+[m[32m  const lines = (item.content || []).map(block => {[m
[32m+[m[32m    if (block.type === 'text') return block.value;[m
[32m+[m[32m    if (block.type === 'image') {[m
[32m+[m[32m      // 詳細画面のダウンロード名と同じ規則（名前が無ければ image_N.png）[m
[32m+[m[32m      const rawName = block.name || `image_${images.length + 1}.png`;[m
[32m+[m[32m      const name = makeUniqueName(sanitizeFileName(rawName), usedImageNames);[m
[32m+[m[32m      images.push(name);[m
[32m+[m[32m      attachments.push({ path: `images/${name}`, value: block.value });[m
[32m+[m[32m      return `[画像: ${name}]`;[m
[32m+[m[32m    }[m
[32m+[m[32m    if (block.type === 'file') {[m
[32m+[m[32m      const rawName = block.name || `file_${files.length + 1}`;[m
[32m+[m[32m      const name = makeUniqueName(sanitizeFileName(rawName), usedFileNames);[m
[32m+[m[32m      files.push(name);[m
[32m+[m[32m      attachments.push({ path: `files/${name}`, value: block.value });[m
[32m+[m[32m      return `[添付ファイル: ${name}]`;[m
[32m+[m[32m    }[m
[32m+[m[32m    return null;[m
[32m+[m[32m  }).filter(line => line != null);[m
[32m+[m[32m  return { text: lines.join('\n'), images, files, attachments };[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m// data URL / URL から Blob を取得する[m
[32m+[m[32masync function attachmentToBlob(value) {[m
[32m+[m[32m  if (!value) throw new Error('empty attachment');[m
[32m+[m[32m  if (value.startsWith('data:')) {[m
[32m+[m[32m    const commaIdx = value.indexOf(',');[m
[32m+[m[32m    const meta = value.substring(5, commaIdx);[m
[32m+[m[32m    const data = value.substring(commaIdx + 1);[m
[32m+[m[32m    const mimeType = meta.split(';')[0] || 'application/octet-stream';[m
[32m+[m[32m    if (meta.includes(';base64')) {[m
[32m+[m[32m      const binary = atob(data);[m
[32m+[m[32m      const bytes = new Uint8Array(binary.length);[m
[32m+[m[32m      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);[m
[32m+[m[32m      return new Blob([bytes], { type: mimeType });[m
[32m+[m[32m    }[m
[32m+[m[32m    return new Blob([decodeURIComponent(data)], { type: mimeType });[m
[32m+[m[32m  }[m
[32m+[m[32m  const res = await fetch(value);[m
[32m+[m[32m  if (!res.ok) throw new Error(`HTTP ${res.status}`);[m
[32m+[m[32m  return await res.blob();[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mfunction triggerDownload(blob, filename) {[m
[32m+[m[32m  const url = URL.createObjectURL(blob);[m
[32m+[m[32m  const a = document.createElement('a');[m
[32m+[m[32m  a.href = url;[m
[32m+[m[32m  a.download = filename;[m
[32m+[m[32m  document.body.appendChild(a);[m
[32m+[m[32m  a.click();[m
[32m+[m[32m  document.body.removeChild(a);[m
[32m+[m[32m  URL.revokeObjectURL(url);[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m// エクスポート本体。添付が無ければ単体ファイル、あれば画像・添付ファイルを含む zip でダウンロード[m
[32m+[m[32masync function downloadExport(item, mainBlob, mainExt, exported, label) {[m
[32m+[m[32m  const baseName = sanitizeFileName(item.title);[m
[32m+[m
[32m+[m[32m  if (exported.attachments.length === 0) {[m
[32m+[m[32m    triggerDownload(mainBlob, `${baseName}.${mainExt}`);[m
[32m+[m[32m    showToast(`${label}ファイルをダウンロードしました`, 'success');[m
[32m+[m[32m    return;[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  if (typeof JSZip === 'undefined') {[m
[32m+[m[32m    // ライブラリが読み込めない場合は従来どおり単体ファイルのみ[m
[32m+[m[32m    triggerDownload(mainBlob, `${baseName}.${mainExt}`);[m
[32m+[m[32m    showToast('ZIPライブラリを読み込めなかったため、添付ファイルを除いてダウンロードしました', 'error');[m
[32m+[m[32m    return;[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  showToast('ZIPファイルを作成しています...', 'info');[m
[32m+[m[32m  const zip = new JSZip();[m
[32m+[m[32m  zip.file(`${baseName}.${mainExt}`, mainBlob);[m
[32m+[m
[32m+[m[32m  // 記事一覧の一括出力と同じく、添付は <記事id>/images, <記事id>/files に保存[m
[32m+[m[32m  const folder = getAttachmentFolder(item);[m
[32m+[m[32m  const failed = [];[m
[32m+[m[32m  for (const att of exported.attachments) {[m
[32m+[m[32m    const path = `${folder}/${att.path}`;[m
[32m+[m[32m    try {[m
[32m+[m[32m      zip.file(path, await attachmentToBlob(att.value));[m
[32m+[m[32m    } catch (e) {[m
[32m+[m[32m      console.error('Failed to add attachment to zip:', path, e);[m
[32m+[m[32m      failed.push(path);[m
[32m+[m[32m    }[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  const zipBlob = await zip.generateAsync({ type: 'blob' });[m
[32m+[m[32m  triggerDownload(zipBlob, `${baseName}.zip`);[m
[32m+[m
[32m+[m[32m  if (failed.length > 0) {[m
[32m+[m[32m    showToast(`ZIPをダウンロードしました（取得できなかったファイル: ${failed.join(', ')}）`, 'error');[m
[32m+[m[32m  } else {[m
[32m+[m[32m    showToast(`${label}と添付ファイルをZIPでダウンロードしました`, 'success');[m
[32m+[m[32m  }[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m// 添付ファイルを格納するフォルダ名（記事id）[m
[32m+[m[32mfunction getAttachmentFolder(item) {[m
[32m+[m[32m  return sanitizeFileName(String(item.id));[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m// JSON エクスポート用の記事データ（単体・一括で共通）[m
[32m+[m[32mfunction buildExportRecord(item, exported) {[m
[32m+[m[32m  const record = buildExportRecordBase(item, exported);[m
[32m+[m[32m  if (exported.attachments.length > 0) {[m
[32m+[m[32m    record.attachmentFolder = `${getAttachmentFolder(item)}/`;[m
[32m+[m[32m  }[m
[32m+[m[32m  return record;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mfunction buildExportRecordBase(item, exported) {[m
[32m+[m[32m  return {[m
[32m+[m[32m    id: item.id,[m
     title: item.title,[m
     category: item.category,[m
[31m-    content: textContent,[m
[32m+[m[32m    content: exported.text,[m
[32m+[m[32m    images: exported.images,[m
[32m+[m[32m    files: exported.files,[m
     tags: item.tags || [],[m
     customAttributes: item.customAttributes || [],[m
     authorName: item.authorName,[m
[36m@@ -1561,34 +1713,100 @@[m [mfunction downloadAsJson() {[m
     commentCount: item.commentCount || 0,[m
     viewCount: item.viewCount || 0[m
   };[m
[31m-  [m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m// 検索結果の記事を一括で JSON + 添付ファイル（記事idごとのフォルダ）として ZIP 出力[m
[32m+[m[32m//   knowledge_export_YYYYMMDD_HHMMSS.zip[m
[32m+[m[32m//   ├── knowledge.json            ← 記事データの配列（各記事に id 付き）[m
[32m+[m[32m//   ├── <記事id>/images/...       ← 画像[m
[32m+[m[32m//   └── <記事id>/files/...        ← 添付ファイル[m
[32m+[m[32masync function bulkExportAsJsonZip() {[m
[32m+[m[32m  const items = getFilteredKnowledgeItems();[m
[32m+[m[32m  if (items.length === 0) {[m
[32m+[m[32m    showToast('ダウンロードする記事がありません', 'error');[m
[32m+[m[32m    return;[m
[32m+[m[32m  }[m
[32m+[m[32m  if (typeof JSZip === 'undefined') {[m
[32m+[m[32m    showToast('ZIPライブラリを読み込めなかったため、ダウンロードできません', 'error');[m
[32m+[m[32m    return;[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  const btn = document.getElementById('bulk-export-json-btn');[m
[32m+[m[32m  if (btn) btn.disabled = true;[m
[32m+[m[32m  showToast(`${items.length} 件の記事をZIPにまとめています...`, 'info');[m
[32m+[m
[32m+[m[32m  try {[m
[32m+[m[32m    const zip = new JSZip();[m
[32m+[m[32m    const records = [];[m
[32m+[m[32m    const failed = [];[m
[32m+[m
[32m+[m[32m    for (const item of items) {[m
[32m+[m[32m      const exported = buildExportContent(item);[m
[32m+[m[32m      const record = buildExportRecord(item, exported);[m
[32m+[m[32m      const folder = getAttachmentFolder(item);[m
[32m+[m[32m      records.push(record);[m
[32m+[m
[32m+[m[32m      for (const att of exported.attachments) {[m
[32m+[m[32m        const path = `${folder}/${att.path}`;[m
[32m+[m[32m        try {[m
[32m+[m[32m          zip.file(path, await attachmentToBlob(att.value));[m
[32m+[m[32m        } catch (e) {[m
[32m+[m[32m          console.error('Failed to add attachment to zip:', path, e);[m
[32m+[m[32m          failed.push(path);[m
[32m+[m[32m        }[m
[32m+[m[32m      }[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    const exportData = {[m
[32m+[m[32m      exportedAt: new Date().toISOString(),[m
[32m+[m[32m      count: records.length,[m
[32m+[m[32m      items: records[m
[32m+[m[32m    };[m
[32m+[m[32m    zip.file('knowledge.json', JSON.stringify(exportData, null, 2));[m
[32m+[m
[32m+[m[32m    const zipBlob = await zip.generateAsync({ type: 'blob' });[m
[32m+[m[32m    const d = new Date();[m
[32m+[m[32m    const pad = n => String(n).padStart(2, '0');[m
[32m+[m[32m    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;[m
[32m+[m[32m    triggerDownload(zipBlob, `knowledge_export_${stamp}.zip`);[m
[32m+[m
[32m+[m[32m    if (failed.length > 0) {[m
[32m+[m[32m      showToast(`ZIPをダウンロードしました（取得できなかったファイル: ${failed.join(', ')}）`, 'error');[m
[32m+[m[32m    } else {[m
[32m+[m[32m      showToast(`${records.length} 件の記事をZIPでダウンロードしました`, 'success');[m
[32m+[m[32m    }[m
[32m+[m[32m  } catch (error) {[m
[32m+[m[32m    console.error('Failed to bulk export:', error);[m
[32m+[m[32m    showToast('一括エクスポートに失敗しました', 'error');[m
[32m+[m[32m  } finally {[m
[32m+[m[32m    if (btn) btn.disabled = false;[m
[32m+[m[32m  }[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32masync function downloadAsJson() {[m
[32m+[m[32m  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);[m
[32m+[m[32m  if (!item) return;[m
[32m+[m
[32m+[m[32m  const exported = buildExportContent(item);[m
[32m+[m[32m  const exportData = buildExportRecord(item, exported);[m
[32m+[m
   const jsonStr = JSON.stringify(exportData, null, 2);[m
   const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });[m
[31m-  const url = URL.createObjectURL(blob);[m
[31m-  [m
[31m-  const sanitizedTitle = item.title.replace(/[\/\\:*?"<>|]/g, '_');[m
[31m-  const filename = `${sanitizedTitle}.json`;[m
[31m-  [m
[31m-  const a = document.createElement('a');[m
[31m-  a.href = url;[m
[31m-  a.download = filename;[m
[31m-  document.body.appendChild(a);[m
[31m-  a.click();[m
[31m-  document.body.removeChild(a);[m
[31m-  URL.revokeObjectURL(url);[m
[31m-  [m
[31m-  showToast('JSONファイルをダウンロードしました', 'success');[m
[32m+[m
[32m+[m[32m  try {[m
[32m+[m[32m    await downloadExport(item, blob, 'json', exported, 'JSON');[m
[32m+[m[32m  } catch (error) {[m
[32m+[m[32m    console.error('Failed to export JSON:', error);[m
[32m+[m[32m    showToast('エクスポートに失敗しました', 'error');[m
[32m+[m[32m  }[m
 }[m
 [m
[31m-function downloadAsCsv() {[m
[32m+[m[32masync function downloadAsCsv() {[m
   const item = knowledgeItems.find(i => i.id === currentKnowledgeId);[m
   if (!item) return;[m
   [m
[31m-  const textContent = item.content[m
[31m-    .filter(c => c.type === 'text')[m
[31m-    .map(c => c.value)[m
[31m-    .join('\n');[m
[31m-  [m
[32m+[m[32m  const exported = buildExportContent(item);[m
[32m+[m
   const escapeCSV = (value) => {[m
     if (value == null) return '';[m
     const str = String(value);[m
[36m@@ -1600,6 +1818,7 @@[m [mfunction downloadAsCsv() {[m
   [m
   const rows = [[m
     ['項目', '値'],[m
[32m+[m[32m    ['id', escapeCSV(item.id)],[m
     ['タイトル', escapeCSV(item.title)],[m
     ['カテゴリ', escapeCSV(item.category)],[m
     ['タグ', escapeCSV((item.tags || []).join(', '))],[m
[36m@@ -1617,27 +1836,29 @@[m [mfunction downloadAsCsv() {[m
     });[m
   }[m
   [m
[31m-  rows.push(['内容', escapeCSV(textContent)]);[m
[32m+[m[32m  rows.push(['内容', escapeCSV(exported.text)]);[m
[32m+[m[32m  if (exported.images.length > 0) {[m
[32m+[m[32m    rows.push(['画像', escapeCSV(exported.images.join(', '))]);[m
[32m+[m[32m  }[m
[32m+[m[32m  if (exported.files.length > 0) {[m
[32m+[m[32m    rows.push(['添付ファイル', escapeCSV(exported.files.join(', '))]);[m
[32m+[m[32m  }[m
[32m+[m[32m  if (exported.attachments.length > 0) {[m
[32m+[m[32m    rows.push(['添付フォルダ', escapeCSV(`${getAttachmentFolder(item)}/`)]);[m
[32m+[m[32m  }[m
   [m
   const csvContent = rows.map(row => row.join(',')).join('\n');[m
   const bom = '\uFEFF';[m
   const csvWithBom = bom + csvContent;[m
   [m
   const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });[m
[31m-  const url = URL.createObjectURL(blob);[m
[31m-  [m
[31m-  const sanitizedTitle = item.title.replace(/[\/\\:*?"<>|]/g, '_');[m
[31m-  const filename = `${sanitizedTitle}.csv`;[m
[31m-  [m
[31m-  const a = document.createElement('a');[m
[31m-  a.href = url;[m
[31m-  a.download = filename;[m
[31m-  document.body.appendChild(a);[m
[31m-  a.click();[m
[31m-  document.body.removeChild(a);[m
[31m-  URL.revokeObjectURL(url);[m
[31m-  [m
[31m-  showToast('CSVファイルをダウンロードしました', 'success');[m
[32m+[m
[32m+[m[32m  try {[m
[32m+[m[32m    await downloadExport(item, blob, 'csv', exported, 'CSV');[m
[32m+[m[32m  } catch (error) {[m
[32m+[m[32m    console.error('Failed to export CSV:', error);[m
[32m+[m[32m    showToast('エクスポートに失敗しました', 'error');[m
[32m+[m[32m  }[m
 }[m
 [m
 function clearForm() {[m
[1mdiff --git a/index.html b/index.html[m
[1mindex edb4152..9427ea7 100644[m
[1m--- a/index.html[m
[1m+++ b/index.html[m
[36m@@ -2,11 +2,12 @@[m
   <meta charset="UTF-8">[m
   <meta name="viewport" content="width=device-width, initial-scale=1.0">[m
   <meta name="description" content="社内の知見を共有・蓄積するための統合ナレッジ管理プラットフォーム">[m
[31m-  <title>ナレッジ管理システム</title>[m
[32m+[m[32m  <title>総研テックKB</title>[m
   <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>[m
   <script src="app.js" defer=""></script>[m
   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>[m
   <script src="https://unpkg.com/ryuu.js"></script>[m
[32m+[m[32m  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>[m
   <style type="text/tailwindcss">[m
     @theme {[m
       --color-base-bg: #F5F0E8;[m
[36m@@ -368,6 +369,15 @@[m
           </div>[m
         </div>[m
 [m
[32m+[m[32m        <!-- List toolbar: result count + bulk export -->[m
[32m+[m[32m        <div class="flex items-center justify-between mb-3">[m
[32m+[m[32m          <span class="text-sm text-gray-600">検索結果: <span id="list-result-count" class="font-semibold text-gray-900">0 件</span></span>[m
[32m+[m[32m          <button type="button" id="bulk-export-json-btn" class="inline-flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="検索結果の記事をJSON(ZIP)で一括ダウンロード">[m
[32m+[m[32m            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>[m
[32m+[m[32m            検索結果をJSONで一括ダウンロード（ZIP）[m
[32m+[m[32m          </button>[m
[32m+[m[32m        </div>[m
[32m+[m
         <!-- Knowledge List (Table) -->[m
         <div id="knowledge-list" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">[m
           <table class="w-full text-sm text-left">[m
