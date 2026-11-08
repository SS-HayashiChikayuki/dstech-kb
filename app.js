let currentUser = null;
let domoUsers = [];
let domoGroups = [];
let knowledgeItems = [];
let comments = [];
let notifications = [];
let knowledgeHistories = [];
let currentKnowledgeId = null;
let activeAttrFilters = [];
let isEditMode = false;
let editingItemId = null;
let currentFormTags = [];
let currentFormAttributes = [];
let currentFormPermissions = [];
const editorFileStore = new Map();
let editorFileIdCounter = 0;

const COLLECTIONS = {
  KNOWLEDGE: 'knowledgeItems',
  COMMENTS: 'comments',
  NOTIFICATIONS: 'notifications',
  HISTORY: 'knowledgeHistory'
};

const PERMISSION_LEVELS = {
  READ: 'read',
  READ_EDIT: 'read_edit',
  READ_EDIT_DELETE: 'read_edit_delete'
};

const PERMISSION_LABELS = {
  [PERMISSION_LEVELS.READ]: '読取のみ',
  [PERMISSION_LEVELS.READ_EDIT]: '読取＋編集',
  [PERMISSION_LEVELS.READ_EDIT_DELETE]: '読取＋編集＋削除'
};

// カテゴリ色はカテゴリ名から自動で決定する（applyCategoryColor を参照）

async function init() {
  try {
    await loadCurrentUser();
    await loadDomoUsers();
    await loadDomoGroups();
    await loadKnowledgeItems();
    await loadComments();
    await loadNotifications();
    await loadKnowledgeHistories();
    
    if (knowledgeItems.length === 0) {
      await initializeSampleData();
      await loadKnowledgeItems();
      await loadComments();
      await loadNotifications();
    }
    
    setupEventListeners();
    updateCurrentUserDisplay();
    updateNotificationBadge();
    renderKnowledgeList();
    showPage('list');
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('アプリの初期化中にエラーが発生しました', 'error');
  }
}

async function loadCurrentUser() {
  try {
    if (typeof domo !== 'undefined' && domo.env && domo.env.userName) {
      currentUser = {
        id: String(domo.env.userId || '1'),
        name: domo.env.userName,
        email: domo.env.userEmail || ''
      };
      return;
    }
  } catch (error) {
    console.error('Failed to load from domo.env:', error);
  }

  currentUser = { id: '1', name: '名無しユーザー', email: '' };
}

async function loadDomoUsers() {
  try {
    const response = await domo.get('/domo/users/v1?limit=500');
    domoUsers = (response || []).map(u => ({
      id: String(u.id),
      name: u.displayName || u.name || '',
      email: u.email || ''
    }));
  } catch (error) {
    console.error('Failed to load Domo users:', error);
    domoUsers = [];
  }
}

async function loadDomoGroups() {
  try {
    const response = await domo.get('/domo/groups/v1?limit=500');
    domoGroups = (response || []).map(g => ({
      id: String(g.id),
      name: g.name || '',
      memberIds: (g.memberIds || []).map(String)
    }));
  } catch (error) {
    console.error('Failed to load Domo groups:', error);
    domoGroups = [];
  }
}

async function loadKnowledgeItems() {
  try {
    const response = await domo.get(`/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents`);
    knowledgeItems = (response || []).map(doc => ({
      id: doc.id,
      ...doc.content
    }));
  } catch (error) {
    console.error('Failed to load knowledge items:', error);
    knowledgeItems = [];
  }
}

async function loadComments() {
  try {
    const response = await domo.get(`/domo/datastores/v1/collections/${COLLECTIONS.COMMENTS}/documents`);
    comments = (response || []).map(doc => ({
      id: doc.id,
      ...doc.content
    }));
  } catch (error) {
    console.error('Failed to load comments:', error);
    comments = [];
  }
}

async function loadNotifications() {
  try {
    const response = await domo.get(`/domo/datastores/v1/collections/${COLLECTIONS.NOTIFICATIONS}/documents`);
    notifications = (response || []).map(doc => ({
      id: doc.id,
      ...doc.content
    }));
  } catch (error) {
    console.error('Failed to load notifications:', error);
    notifications = [];
  }
}

async function loadKnowledgeHistories() {
  try {
    const response = await domo.get(`/domo/datastores/v1/collections/${COLLECTIONS.HISTORY}/documents`);
    knowledgeHistories = (response || []).map(doc => ({
      id: doc.id,
      ...doc.content
    }));
  } catch (error) {
    console.error('Failed to load knowledge histories:', error);
    knowledgeHistories = [];
  }
}

async function initializeSampleData() {
  const sampleKnowledge = [
    {
      title: 'TypeScript基礎ガイド',
      category: '技術',
      content: [
        { type: 'text', value: 'TypeScriptは型安全性を提供するJavaScriptのスーパーセットです。' },
        { type: 'text', value: '静的型チェックにより、開発時のエラーを削減できます。' }
      ],
      tags: ['TypeScript', 'プログラミング', '開発'],
      customAttributes: [
        { key: 'レベル', value: '初級' },
        { key: '所要時間', value: '30分' }
      ],
      authorId: currentUser.id,
      authorName: currentUser.name,
      status: 'published',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      likeCount: 5,
      likedBy: [],
      commentCount: 2,
      viewCount: 12,
      permissions: [
        { targetType: 'everyone', targetId: null, targetName: '全員', level: PERMISSION_LEVELS.READ_EDIT }
      ]
    },
    {
      title: '営業プレゼンテーション資料作成のコツ',
      category: '営業',
      content: [
        { type: 'text', value: '効果的なプレゼン資料を作成するためには以下のポイントを押さえましょう：' },
        { type: 'text', value: '1. 顧客の課題を明確にする\n2. 解決策をシンプルに提示\n3. データで裏付ける' }
      ],
      tags: ['営業', 'プレゼン', '資料作成'],
      customAttributes: [
        { key: 'レベル', value: '中級' },
        { key: '業種', value: '全業種' }
      ],
      authorId: currentUser.id,
      authorName: currentUser.name,
      status: 'published',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      likeCount: 8,
      likedBy: [],
      commentCount: 1,
      viewCount: 20,
      permissions: [
        { targetType: 'everyone', targetId: null, targetName: '全員', level: PERMISSION_LEVELS.READ_EDIT }
      ]
    },
    {
      title: '新入社員オリエンテーション手順',
      category: '総務',
      content: [
        { type: 'text', value: '新入社員の初日にすべきことをまとめました。' },
        { type: 'text', value: '1. 入館証の発行\n2. PCアカウント設定\n3. 部門紹介\n4. 社内ツール説明' }
      ],
      tags: ['新入社員', '総務', 'オリエンテーション'],
      customAttributes: [
        { key: '対象', value: '新入社員' },
        { key: '更新頻度', value: '半年ごと' }
      ],
      authorId: currentUser.id,
      authorName: currentUser.name,
      status: 'published',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      likeCount: 3,
      likedBy: [],
      commentCount: 0,
      viewCount: 8,
      permissions: [
        { targetType: 'everyone', targetId: null, targetName: '全員', level: PERMISSION_LEVELS.READ_EDIT }
      ]
    }
  ];

  for (const item of sampleKnowledge) {
    await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents`, {
      content: item
    });
  }

  const sampleComments = [
    {
      knowledgeId: null,
      authorId: currentUser.id,
      authorName: currentUser.name,
      body: '参考になりました！ありがとうございます。',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      knowledgeId: null,
      authorId: currentUser.id,
      authorName: currentUser.name,
      body: '実際にプレゼンに活用してみます！',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      knowledgeId: null,
      authorId: currentUser.id,
      authorName: currentUser.name,
      body: '追加の型定義例もあると嬉しいです。',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  await loadKnowledgeItems();
  
  if (knowledgeItems.length >= 2) {
    sampleComments[0].knowledgeId = knowledgeItems[0].id;
    sampleComments[2].knowledgeId = knowledgeItems[0].id;
    sampleComments[1].knowledgeId = knowledgeItems[1].id;
    
    for (const comment of sampleComments) {
      await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.COMMENTS}/documents`, {
        content: comment
      });
    }
  }

  const sampleNotifications = [
    {
      recipientId: currentUser.id,
      type: 'like',
      actorName: '佐藤花子',
      knowledgeId: knowledgeItems[0]?.id || '',
      knowledgeTitle: 'TypeScript基礎ガイド',
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      recipientId: currentUser.id,
      type: 'comment',
      actorName: '鈴木一郎',
      knowledgeId: knowledgeItems[1]?.id || '',
      knowledgeTitle: '営業プレゼンテーション資料作成のコツ',
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      recipientId: currentUser.id,
      type: 'like',
      actorName: '田中次郎',
      knowledgeId: knowledgeItems[1]?.id || '',
      knowledgeTitle: '営業プレゼンテーション資料作成のコツ',
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const notification of sampleNotifications) {
    await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.NOTIFICATIONS}/documents`, {
      content: notification
    });
  }
}

function setupEventListeners() {
  document.getElementById('btn-nav-list').addEventListener('click', () => {
    showPage('list');
    renderKnowledgeList();
  });

  document.getElementById('btn-nav-ranking').addEventListener('click', () => {
    showPage('ranking');
    renderRanking('weekly');
  });

  document.getElementById('btn-nav-new').addEventListener('click', () => {
    clearForm();
    isEditMode = false;
    editingItemId = null;
    document.getElementById('form-heading').textContent = '新規ナレッジ登録';
    showPage('form');
  });

  document.getElementById('notification-bell').addEventListener('click', toggleNotificationPanel);
  document.getElementById('close-notification-panel').addEventListener('click', closeNotificationPanel);
  document.getElementById('mark-all-read').addEventListener('click', markAllNotificationsRead);

  document.getElementById('search-input').addEventListener('input', renderKnowledgeList);
  document.getElementById('filter-category').addEventListener('change', renderKnowledgeList);
  document.getElementById('filter-tags').addEventListener('change', renderKnowledgeList);
  document.getElementById('filter-author').addEventListener('change', renderKnowledgeList);
  document.getElementById('sort-select').addEventListener('change', renderKnowledgeList);

  document.getElementById('add-attr-filter-btn').addEventListener('click', openAttrFilterForm);
  document.getElementById('attr-filter-cancel-btn').addEventListener('click', closeAttrFilterForm);
  document.getElementById('attr-filter-add-confirm-btn').addEventListener('click', addAttrFilter);
  document.getElementById('clear-attr-filters-btn').addEventListener('click', clearAttrFilters);

  document.getElementById('back-to-list').addEventListener('click', () => {
    showPage('list');
    renderKnowledgeList();
  });

  document.getElementById('detail-like-btn').addEventListener('click', toggleLike);
  document.getElementById('detail-edit-btn').addEventListener('click', editKnowledge);
  document.getElementById('detail-delete-btn').addEventListener('click', deleteKnowledge);
  document.getElementById('detail-download-json-btn').addEventListener('click', downloadAsJson);
  document.getElementById('bulk-export-json-btn').addEventListener('click', bulkExportAsJsonZip);
  document.getElementById('detail-download-pdf-btn').addEventListener('click', openPdfOptionsModal);
  document.getElementById('close-pdf-options-modal').addEventListener('click', closePdfOptionsModal);
  document.getElementById('pdf-options-cancel').addEventListener('click', closePdfOptionsModal);
  document.getElementById('pdf-options-confirm').addEventListener('click', confirmPdfOptions);
  document.getElementById('pdf-options-select-all').addEventListener('click', () => setAllPdfOptions(true));
  document.getElementById('pdf-options-clear-all').addEventListener('click', () => setAllPdfOptions(false));
  document.getElementById('pdf-options-modal').addEventListener('click', (e) => {
    if (e.target.id === 'pdf-options-modal') closePdfOptionsModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('pdf-options-modal').classList.contains('hidden')) {
      closePdfOptionsModal();
    }
  });
  document.getElementById('detail-download-csv-btn').addEventListener('click', downloadAsCsv);
  document.getElementById('submit-comment-btn').addEventListener('click', submitComment);

  const form = document.getElementById('knowledge-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });

  document.getElementById('submit-btn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveKnowledge('published');
  });

  document.getElementById('save-draft-btn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveKnowledge('draft');
  });

  document.getElementById('cancel-btn').addEventListener('click', () => {
    showPage('list');
    renderKnowledgeList();
  });

  document.getElementById('add-category-btn').addEventListener('click', () => {
    const newCategoryInput = document.getElementById('new-category-input');
    newCategoryInput.classList.toggle('hidden');
    if (!newCategoryInput.classList.contains('hidden')) {
      document.getElementById('new-category-value').focus();
    }
  });

  const tagsInput = document.getElementById('tags-input');
  tagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });
  tagsInput.addEventListener('input', showTagAutocomplete);

  document.getElementById('add-tag-btn').addEventListener('click', addTag);

  document.getElementById('add-attribute-btn').addEventListener('click', () => {
    document.getElementById('new-attribute-form').classList.remove('hidden');
    document.getElementById('new-attribute-key').focus();
  });

  const attrKeyInput = document.getElementById('new-attribute-key');
  attrKeyInput.addEventListener('input', showAttrKeyAutocomplete);

  document.getElementById('save-attribute-btn').addEventListener('click', saveAttribute);
  document.getElementById('cancel-attribute-btn').addEventListener('click', () => {
    document.getElementById('new-attribute-form').classList.add('hidden');
    document.getElementById('new-attribute-key').value = '';
    document.getElementById('new-attribute-value').value = '';
  });

  const contentEditor = document.getElementById('content-editor');
  contentEditor.addEventListener('paste', handlePaste);
  contentEditor.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  contentEditor.addEventListener('drop', handleDrop);

  const dropZone = document.getElementById('image-drop-zone');
  dropZone.addEventListener('click', () => document.getElementById('image-file-input').click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drop-zone-active');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone-active');
  });
  dropZone.addEventListener('drop', handleImageDrop);

  document.getElementById('image-file-input').addEventListener('change', handleImageFileSelect);
  document.getElementById('select-image-btn').addEventListener('click', () => {
    document.getElementById('image-file-input').click();
  });

  document.getElementById('add-permission-btn').addEventListener('click', openPermissionModal);
  document.getElementById('permission-modal-cancel').addEventListener('click', closePermissionModal);
  document.getElementById('permission-modal-confirm').addEventListener('click', confirmPermission);
  document.getElementById('permission-target-type').addEventListener('change', updatePermissionTargetSelector);

  document.getElementById('ranking-tab-weekly').addEventListener('click', () => {
    document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active', 'border-blue-500', 'text-blue-600'));
    document.getElementById('ranking-tab-weekly').classList.add('active', 'border-blue-500', 'text-blue-600');
    document.getElementById('ranking-score-description').textContent = 'いいね数(×3)・コメント数(×2)・閲覧数(×1) の合計スコアで順位を決定';
    renderRanking('weekly');
  });

  document.getElementById('ranking-tab-monthly').addEventListener('click', () => {
    document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active', 'border-blue-500', 'text-blue-600'));
    document.getElementById('ranking-tab-monthly').classList.add('active', 'border-blue-500', 'text-blue-600');
    document.getElementById('ranking-score-description').textContent = 'いいね数(×5)・コメント数(×2)・閲覧数(×1) の合計スコアで順位を決定';
    renderRanking('monthly');
  });

  document.getElementById('api-debug-btn').addEventListener('click', openApiDebugModal);
  document.getElementById('api-debug-btn-nav').addEventListener('click', openApiDebugModal);
  document.getElementById('close-api-debug-modal').addEventListener('click', closeApiDebugModal);
  document.getElementById('test-api-users-limit1-btn').addEventListener('click', testUsersLimit1);
  document.getElementById('test-domo-env-btn').addEventListener('click', testDomoEnv);
  document.getElementById('test-api-users-limit500-btn').addEventListener('click', testUsersLimit500);

  updateApiDebugCurrentUser();

  document.getElementById('detail-history-btn').addEventListener('click', openHistoryModal);
  document.getElementById('close-history-modal').addEventListener('click', () => document.getElementById('history-modal').classList.add('hidden'));
  document.getElementById('close-history-diff-modal').addEventListener('click', () => document.getElementById('history-diff-modal').classList.add('hidden'));
  document.getElementById('back-to-history-list').addEventListener('click', backToHistoryList);

  document.getElementById('btn-nav-docs').addEventListener('click', () => {
    showPage('docs');
    showDocTab('spec');
  });

  document.getElementById('doc-tab-spec').addEventListener('click', () => showDocTab('spec'));
  document.getElementById('doc-tab-test').addEventListener('click', () => showDocTab('test'));
  document.getElementById('doc-tab-manual').addEventListener('click', () => showDocTab('manual'));

  document.getElementById('doc-print-btn').addEventListener('click', printCurrentDoc);

  const testCaseToggles = document.querySelectorAll('.test-case-toggle');
  testCaseToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      toggleTestCase(this);
    });
  });
}

function showPage(name) {
  document.querySelectorAll('.page-section').forEach(page => {
    page.style.display = 'none';
  });
  
  const targetPage = document.getElementById(`page-${name}`);
  if (targetPage) {
    targetPage.style.display = 'block';
  }

  updateNavStyles(name === 'form' ? 'new' : name);
}

// ナビゲーションボタンの配色
// - ページタブ（記事一覧/ランキング/ドキュメント）: 選択中=青、非選択=白地+枠線
// - 新規投稿: アクションボタンとして常に緑。選択中はリングで強調
const NAV_TAB_STYLES = {
  default: {
    active: ['bg-blue-600', 'text-white', 'border-blue-600', 'shadow-sm', 'hover:bg-blue-700'],
    inactive: ['bg-white', 'text-gray-700', 'border-gray-300', 'hover:bg-gray-100', 'hover:text-gray-900'],
  },
  // ランキング: #33A65E（常に塗り。選択中は濃色＋リング）
  ranking: {
    active: ['bg-[#2B8F50]', 'text-white', 'border-[#2B8F50]', 'shadow-sm', 'ring-2', 'ring-offset-2', 'ring-[#33A65E]'],
    inactive: ['bg-[#33A65E]', 'text-white', 'border-[#33A65E]', 'hover:bg-[#2B8F50]'],
  },
  // ドキュメント: #F5B679（白文字だと読みにくいため濃茶の文字）
  docs: {
    active: ['bg-[#EBA25E]', 'text-[#3D2200]', 'border-[#EBA25E]', 'shadow-sm', 'ring-2', 'ring-offset-2', 'ring-[#F5B679]'],
    inactive: ['bg-[#F5B679]', 'text-[#3D2200]', 'border-[#F5B679]', 'hover:bg-[#EBA25E]'],
  },
};
const NAV_ACTION_ACTIVE = ['ring-2', 'ring-offset-2', 'ring-green-500', 'bg-green-700'];
const NAV_ACTION_INACTIVE = ['bg-green-600'];

function updateNavStyles(activeKey) {
  ['list', 'ranking', 'docs'].forEach(key => {
    const btn = document.getElementById(`btn-nav-${key}`);
    if (!btn) return;
    const isActive = key === activeKey;
    const style = NAV_TAB_STYLES[key] || NAV_TAB_STYLES.default;
    btn.classList.remove(...style.active, ...style.inactive);
    btn.classList.add(...(isActive ? style.active : style.inactive));
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const newBtn = document.getElementById('btn-nav-new');
  if (newBtn) {
    const isActive = activeKey === 'new';
    newBtn.classList.remove(...NAV_ACTION_ACTIVE, ...NAV_ACTION_INACTIVE);
    newBtn.classList.add(...(isActive ? NAV_ACTION_ACTIVE : NAV_ACTION_INACTIVE));
    newBtn.setAttribute('aria-current', isActive ? 'page' : 'false');
  }
}

function showDocTab(tabName) {
  const tabs = ['spec', 'test', 'manual'];
  const tabTitles = {
    spec: 'アプリケーション仕様書',
    test: 'テスト仕様書',
    manual: '利用手順書'
  };

  tabs.forEach(tab => {
    const tabBtn = document.getElementById(`doc-tab-${tab}`);
    const tabContent = document.getElementById(`doc-content-${tab}`);

    if (tab === tabName) {
      tabBtn.classList.add('active', 'border-blue-500', 'text-blue-600');
      tabBtn.classList.remove('border-transparent', 'text-gray-600');
      tabContent.classList.remove('hidden');
    } else {
      tabBtn.classList.remove('active', 'border-blue-500', 'text-blue-600');
      tabBtn.classList.add('border-transparent', 'text-gray-600');
      tabContent.classList.add('hidden');
    }
  });

  document.getElementById('doc-title').textContent = tabTitles[tabName];
}

function toggleTestCase(toggleBtn) {
  const container = toggleBtn.closest('.border');
  const content = container.querySelector('.test-case-content');
  const arrow = toggleBtn.querySelector('svg');

  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    arrow.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    arrow.style.transform = 'rotate(0deg)';
  }
}

function printCurrentDoc() {
  const activeTab = document.querySelector('.doc-tab.active');
  if (!activeTab) return;

  const tabId = activeTab.id.replace('doc-tab-', '');
  const content = document.getElementById(`doc-content-${tabId}`);
  const title = document.getElementById('doc-title').textContent;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>body { font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif; padding: 20px; } table { border-collapse: collapse; width: 100%; margin: 10px 0; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f0f0f0; } pre { background-color: #f5f5f5; padding: 10px; overflow-x: auto; }</style>
    </head>
    <body><h1>${title}</h1>${content.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function updateCurrentUserDisplay() {
  const avatarEl = document.getElementById('current-user-avatar');
  const nameEl = document.getElementById('current-user-name');
  
  if (currentUser && avatarEl && nameEl) {
    const initials = currentUser.name.charAt(0);
    avatarEl.textContent = initials;
    nameEl.textContent = currentUser.name;
  }
}

function updateNotificationBadge() {
  const unreadCount = notifications.filter(n => 
    String(n.recipientId) === String(currentUser.id) && !n.isRead
  ).length;
  
  const badge = document.getElementById('notification-badge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function toggleNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  panel.classList.toggle('hidden');
  
  if (!panel.classList.contains('hidden')) {
    renderNotifications();
  }
}

function closeNotificationPanel() {
  document.getElementById('notification-panel').classList.add('hidden');
}

function renderNotifications() {
  const list = document.getElementById('notification-list');
  const userNotifications = notifications.filter(n => 
    String(n.recipientId) === String(currentUser.id)
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (userNotifications.length === 0) {
    list.innerHTML = '<div class="p-4 text-center text-sm text-gray-500">通知はありません</div>';
    return;
  }

  list.innerHTML = '';
  const template = document.getElementById('notification-template');

  userNotifications.forEach(notif => {
    const clone = template.content.cloneNode(true);
    const item = clone.querySelector('.notification-item');
    
    if (!notif.isRead) {
      item.classList.add('bg-blue-50');
    }

    const icon = clone.querySelector('.notification-icon');
    if (notif.type === 'like') {
      icon.classList.add('text-red-500');
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>';
    } else {
      icon.classList.add('text-blue-500');
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>';
    }

    const message = notif.type === 'like' 
      ? `${notif.actorName}さんが「${notif.knowledgeTitle}」にいいねしました`
      : `${notif.actorName}さんが「${notif.knowledgeTitle}」にコメントしました`;
    
    clone.querySelector('.notification-message').textContent = message;
    clone.querySelector('.notification-time').textContent = formatRelativeTime(notif.createdAt);

    item.addEventListener('click', async () => {
      if (!notif.isRead) {
        notif.isRead = true;
        await domo.put(
          `/domo/datastores/v1/collections/${COLLECTIONS.NOTIFICATIONS}/documents/${notif.id}`,
          { content: notif }
        );
        updateNotificationBadge();
      }
      else if (node.tagName === 'BR') {
        textBuffer += '\n';
      }
      else {
        const isBlock = ['DIV', 'P', 'BLOCKQUOTE', 'LI', 'UL', 'OL'].includes(node.tagName);
        if (isBlock) {
          node.childNodes.forEach(child => processNode(child));
          if (textBuffer && !textBuffer.endsWith('\n')) {
            textBuffer += '\n';
          }
        } else {
          node.childNodes.forEach(child => processNode(child));
        }
      }
      closeNotificationPanel();
      viewKnowledgeDetail(notif.knowledgeId);
    });

    list.appendChild(clone);
  });
}

async function markAllNotificationsRead() {
  const userNotifications = notifications.filter(n => 
    String(n.recipientId) === String(currentUser.id) && !n.isRead
  );

  for (const notif of userNotifications) {
    notif.isRead = true;
    await domo.put(
      `/domo/datastores/v1/collections/${COLLECTIONS.NOTIFICATIONS}/documents/${notif.id}`,
      { content: notif }
    );
  }

  updateNotificationBadge();
  renderNotifications();
  showToast('すべての通知を既読にしました', 'success');
}

// 現在の検索条件・フィルター・並び順を適用した記事一覧を返す（一覧表示と一括エクスポートで共用）
function getFilteredKnowledgeItems() {
  const searchQuery = document.getElementById('search-input').value.toLowerCase();
  const categoryFilter = document.getElementById('filter-category').value;
  const authorFilter = document.getElementById('filter-author').value;
  const sortBy = document.getElementById('sort-select').value;

  let filtered = knowledgeItems.filter(item => item.status === 'published');

  if (searchQuery) {
    filtered = filtered.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(searchQuery);
      const contentText = item.content
        .filter(c => c.type === 'text')
        .map(c => c.value)
        .join(' ')
        .toLowerCase();
      const contentMatch = contentText.includes(searchQuery);
      
      const tagMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(searchQuery));
      
      const customAttrMatch = (item.customAttributes || []).some(attr => 
        (attr.key && attr.key.toLowerCase().includes(searchQuery)) ||
        (attr.value && attr.value.toLowerCase().includes(searchQuery))
      );
      
      return titleMatch || contentMatch || tagMatch || customAttrMatch;
    });
  }

  if (categoryFilter) {
    filtered = filtered.filter(item => item.category === categoryFilter);
  }

  if (authorFilter) {
    filtered = filtered.filter(item => item.authorName === authorFilter);
  }

  const selectedTags = Array.from(document.getElementById('filter-tags').selectedOptions)
    .map(o => o.value)
    .filter(v => v !== '');

  if (selectedTags.length > 0) {
    filtered = filtered.filter(item => 
      selectedTags.every(tag => (item.tags || []).includes(tag))
    );
  }

  if (activeAttrFilters.length > 0) {
    filtered = filtered.filter(item => 
      activeAttrFilters.every(filter => {
        return (item.customAttributes || []).some(attr => {
          const keyMatch = attr.key && attr.key.toLowerCase() === filter.key.toLowerCase();
          if (!filter.value) return keyMatch;
          const valueMatch = attr.value && attr.value.toLowerCase().includes(filter.value.toLowerCase());
          return keyMatch && valueMatch;
        });
      })
    );
  }

  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy === 'likes') {
    filtered.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  }

  return filtered;
}

function renderKnowledgeList() {
  const filtered = getFilteredKnowledgeItems();

  const listEl = document.getElementById('knowledge-list');
  const emptyState = document.getElementById('empty-state');

  // 一括エクスポートバー（件数表示・ボタンの有効/無効）
  const resultCountEl = document.getElementById('list-result-count');
  if (resultCountEl) resultCountEl.textContent = `${filtered.length} 件`;
  const bulkBtn = document.getElementById('bulk-export-json-btn');
  if (bulkBtn) bulkBtn.disabled = filtered.length === 0;

  if (filtered.length === 0) {
    listEl.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  listEl.classList.remove('hidden');
  emptyState.classList.add('hidden');

  const tbody = document.getElementById('knowledge-list-body');
  tbody.innerHTML = '';

  const EXCERPT_LENGTH = 100;

  filtered.forEach(item => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 cursor-pointer transition focus:outline-none focus-visible:bg-blue-50';
    row.tabIndex = 0;
    row.setAttribute('aria-label', `${item.title} を開く`);

    // タイトル
    const titleCell = document.createElement('td');
    titleCell.className = 'px-4 py-3 font-semibold text-gray-900';
    titleCell.textContent = item.title;
    row.appendChild(titleCell);

    // カテゴリ
    const categoryCell = document.createElement('td');
    categoryCell.className = 'px-4 py-3 whitespace-nowrap';
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap';
    categoryBadge.textContent = item.category;
    applyCategoryColor(categoryBadge, item.category);
    categoryCell.appendChild(categoryBadge);
    row.appendChild(categoryCell);

    // 内容のまとめ（本文テキストの冒頭を1行にまとめて表示）
    const excerptCell = document.createElement('td');
    excerptCell.className = 'px-4 py-3 text-gray-600';
    const fullText = (item.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.value)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    excerptCell.textContent = fullText.length > EXCERPT_LENGTH
      ? fullText.substring(0, EXCERPT_LENGTH) + '...'
      : fullText;
    if (fullText.length > EXCERPT_LENGTH) excerptCell.title = fullText;
    row.appendChild(excerptCell);

    // タグ一覧
    const tagsCell = document.createElement('td');
    tagsCell.className = 'px-4 py-3';
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'flex flex-wrap gap-1';
    (item.tags || []).forEach(tag => {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'tag-badge px-2 py-1 text-xs rounded-full whitespace-nowrap';
      applyTagColor(tagBadge, tag);
      tagBadge.textContent = tag;
      tagsWrap.appendChild(tagBadge);
    });
    tagsCell.appendChild(tagsWrap);
    row.appendChild(tagsCell);

    // 更新日
    const dateCell = document.createElement('td');
    dateCell.className = 'px-4 py-3 text-gray-600 whitespace-nowrap';
    dateCell.textContent = formatDate(item.updatedAt || item.createdAt);
    row.appendChild(dateCell);

    row.addEventListener('click', () => viewKnowledgeDetail(item.id));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') viewKnowledgeDetail(item.id);
    });

    tbody.appendChild(row);
  });

  updateFilters();
}

function updateFilters() {
  const categories = [...new Set(knowledgeItems.filter(i => i.status === 'published').map(i => i.category))];
  const authors = [...new Set(knowledgeItems.filter(i => i.status === 'published').map(i => i.authorName))];
  const allTags = [...new Set(knowledgeItems.filter(i => i.status === 'published').flatMap(i => i.tags || []))];

  const categorySelect = document.getElementById('filter-category');
  const currentCategory = categorySelect.value;
  categorySelect.innerHTML = '<option value="">すべてのカテゴリ</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    if (cat === currentCategory) option.selected = true;
    categorySelect.appendChild(option);
  });

  const authorSelect = document.getElementById('filter-author');
  const currentAuthor = authorSelect.value;
  authorSelect.innerHTML = '<option value="">すべての作成者</option>';
  authors.forEach(author => {
    const option = document.createElement('option');
    option.value = author;
    option.textContent = author;
    if (author === currentAuthor) option.selected = true;
    authorSelect.appendChild(option);
  });

  const tagsSelect = document.getElementById('filter-tags');
  const currentSelectedTags = Array.from(tagsSelect.selectedOptions).map(o => o.value).filter(v => v !== '');
  tagsSelect.innerHTML = '<option value="">すべてのタグ</option>';
  allTags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    if (currentSelectedTags.includes(tag)) {
      option.selected = true;
    }
    tagsSelect.appendChild(option);
  });
}

function openAttrFilterForm() {
  const form = document.getElementById('attr-filter-form');
  const keySelect = document.getElementById('attr-filter-key-select');
  const valueInput = document.getElementById('attr-filter-value-input');
  
  const allKeys = [...new Set(knowledgeItems.flatMap(i => (i.customAttributes || []).map(a => a.key)))];
  
  keySelect.innerHTML = '<option value=""></option>';
  allKeys.forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key;
    keySelect.appendChild(option);
  });
  
  valueInput.value = '';
  form.classList.remove('hidden');
}

function closeAttrFilterForm() {
  document.getElementById('attr-filter-form').classList.add('hidden');
}

function addAttrFilter() {
  const keySelect = document.getElementById('attr-filter-key-select');
  const valueInput = document.getElementById('attr-filter-value-input');
  
  const key = keySelect.value.trim();
  const value = valueInput.value.trim();
  
  if (!key) {
    showToast('キーを選択してください', 'error');
    return;
  }
  
  activeAttrFilters.push({ key, value });
  renderAttrFilterBadges();
  closeAttrFilterForm();
  renderKnowledgeList();
}

function clearAttrFilters() {
  activeAttrFilters = [];
  renderAttrFilterBadges();
  renderKnowledgeList();
}

function renderAttrFilterBadges() {
  const container = document.getElementById('attr-filter-list');
  const clearBtn = document.getElementById('clear-attr-filters-btn');
  
  container.innerHTML = '';
  
  if (activeAttrFilters.length === 0) {
    clearBtn.classList.add('hidden');
    return;
  }
  
  clearBtn.classList.remove('hidden');
  
  activeAttrFilters.forEach((filter, index) => {
    const badge = document.createElement('div');
    badge.className = 'flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full';
    badge.innerHTML = `
      <span>${filter.key}${filter.value ? ': ' + filter.value : ''}</span>
      <button type="button" class="hover:text-purple-900">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;
    badge.querySelector('button').addEventListener('click', () => {
      activeAttrFilters.splice(index, 1);
      renderAttrFilterBadges();
      renderKnowledgeList();
    });
    container.appendChild(badge);
  });
}

async function viewKnowledgeDetail(id) {
  currentKnowledgeId = id;
  const item = knowledgeItems.find(i => i.id === id);
  if (!item) return;

  item.viewCount = (item.viewCount || 0) + 1;
  await domo.put(
    `/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents/${id}`,
    { content: item }
  );

  const historyCount = knowledgeHistories.filter(h => h.knowledgeId === id).length;
  const historyBtn = document.getElementById('detail-history-btn');
  if (historyCount > 0) {
    historyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    historyBtn.disabled = false;
  } else {
    historyBtn.classList.add('opacity-50', 'cursor-not-allowed');
    historyBtn.disabled = true;
  }

  document.getElementById('detail-title').textContent = item.title;
  
  const categoryBadge = document.getElementById('detail-category');
  categoryBadge.textContent = item.category;
  categoryBadge.className = 'px-3 py-1 rounded-full text-xs font-medium';
  applyCategoryColor(categoryBadge, item.category);

  const tagsContainer = document.getElementById('detail-tags');
  tagsContainer.innerHTML = '';
  (item.tags || []).forEach(tag => {
    const badge = document.createElement('span');
    badge.className = 'px-2 py-1 text-xs rounded-full';
    applyTagColor(badge, tag);
    badge.textContent = tag;
    tagsContainer.appendChild(badge);
  });

  document.getElementById('detail-author-name').textContent = item.authorName;
  document.getElementById('detail-created-at').textContent = formatDate(item.createdAt);
  
  if (item.updatedAt && item.updatedAt !== item.createdAt) {
    const updatedEl = document.getElementById('detail-updated-at');
    updatedEl.textContent = `更新: ${formatDate(item.updatedAt)}`;
    updatedEl.classList.remove('hidden');
  } else {
    document.getElementById('detail-updated-at').classList.add('hidden');
  }

  if (item.customAttributes && item.customAttributes.length > 0) {
    const attrsContainer = document.getElementById('detail-custom-attrs');
    attrsContainer.classList.remove('hidden');
    const dl = attrsContainer.querySelector('dl');
    dl.innerHTML = '';
    item.customAttributes.forEach(attr => {
      const dt = document.createElement('dt');
      dt.className = 'font-semibold text-gray-700';
      dt.textContent = attr.key;
      const dd = document.createElement('dd');
      dd.className = 'text-gray-600';
      dd.textContent = attr.value;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  } else {
    document.getElementById('detail-custom-attrs').classList.add('hidden');
  }

  const images = item.content.filter(c => c.type === 'image');
  const files = item.content.filter(c => c.type === 'file');
  
  if (images.length > 0 || files.length > 0) {
    const filesContainer = document.getElementById('detail-files');
    filesContainer.classList.remove('hidden');
    const filesList = filesContainer.querySelector('.space-y-2');
    filesList.innerHTML = '';
    
    images.forEach((imgBlock, idx) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg';
      const imgFileName = imgBlock.name || ('image_' + (idx + 1) + '.png');
      fileItem.innerHTML = `
        <svg class="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <span class="text-sm text-gray-700 flex-1">${imgFileName}</span>
        <a href="${imgBlock.value}" download="${imgFileName}" class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          ダウンロード
        </a>
      `;
      filesList.appendChild(fileItem);
    });
    
    files.forEach(fileBlock => {
      const fileItem = document.createElement('div');
      fileItem.className = 'flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg';
      const fileName = fileBlock.name || 'ファイル';
      fileItem.innerHTML = `
        <svg class="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span class="text-sm text-gray-700 flex-1">${fileName}</span>
        <a href="${fileBlock.value}" download="${fileName}" class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          ダウンロード
        </a>
      `;
      filesList.appendChild(fileItem);
    });
  } else {
    document.getElementById('detail-files').classList.add('hidden');
  }

  const contentEl = document.getElementById('detail-content');
  contentEl.innerHTML = '';
  item.content.forEach(block => {
    if (block.type === 'text') {
      const p = document.createElement('p');
      p.textContent = block.value;
      p.className = 'mb-3 text-gray-700 whitespace-pre-wrap';
      contentEl.appendChild(p);
    } else if (block.type === 'image') {
      const img = document.createElement('img');
      img.src = block.value;
      img.className = 'max-w-full h-auto rounded-lg my-3';
      contentEl.appendChild(img);
    }
  });

  if (images.length > 0) {
    const imagesContainer = document.getElementById('detail-images');
    imagesContainer.classList.remove('hidden');
    const grid = imagesContainer.querySelector('div');
    grid.innerHTML = '';
    images.forEach((imgBlock, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'relative group';
      const imgEl = document.createElement('img');
      imgEl.src = imgBlock.value;
      imgEl.className = 'w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition';
      imgEl.addEventListener('click', () => {
        window.open(imgBlock.value, '_blank');
      });
      const dlLink = document.createElement('a');
      const imgFileName = imgBlock.name || ('image_' + (idx + 1) + '.png');
      dlLink.href = imgBlock.value;
      dlLink.download = imgFileName;
      dlLink.className = 'absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition flex items-center gap-1';
      dlLink.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>DL`;
      wrapper.appendChild(imgEl);
      wrapper.appendChild(dlLink);
      grid.appendChild(wrapper);
    });
  } else {
    document.getElementById('detail-images').classList.add('hidden');
  }

  document.getElementById('detail-like-count').textContent = item.likeCount || 0;
  document.getElementById('detail-comment-count').textContent = item.commentCount || 0;

  const isLiked = (item.likedBy || []).map(String).includes(String(currentUser.id));
  const likeBtn = document.getElementById('detail-like-btn');
  const likeIcon = likeBtn.querySelector('.like-icon');
  if (isLiked) {
    likeIcon.setAttribute('fill', 'currentColor');
    likeIcon.classList.add('text-red-500');
  } else {
    likeIcon.setAttribute('fill', 'none');
    likeIcon.classList.remove('text-red-500');
  }

  const permLevel = getPermissionLevel(item);
  const canEdit = permLevel === PERMISSION_LEVELS.READ_EDIT || permLevel === PERMISSION_LEVELS.READ_EDIT_DELETE;
  const canDelete = permLevel === PERMISSION_LEVELS.READ_EDIT_DELETE;

  const editBtn = document.getElementById('detail-edit-btn');
  const deleteBtn = document.getElementById('detail-delete-btn');

  editBtn.disabled = !canEdit;
  deleteBtn.disabled = !canDelete;

  if (!canEdit) {
    editBtn.classList.add('opacity-50', 'cursor-not-allowed');
    editBtn.title = '編集権限がありません';
  } else {
    editBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    editBtn.title = '';
  }

  if (!canDelete) {
    deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
    deleteBtn.title = '削除権限がありません';
  } else {
    deleteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    deleteBtn.title = '';
  }

  renderComments();

  showPage('detail');
}

function renderComments() {
  const itemComments = comments.filter(c => c.knowledgeId === currentKnowledgeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const listEl = document.getElementById('comments-list');
  const emptyEl = document.getElementById('comments-empty');

  if (itemComments.length === 0) {
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  listEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';

  const template = document.getElementById('comment-template');

  itemComments.forEach(comment => {
    const clone = template.content.cloneNode(true);
    clone.querySelector('.comment-author').textContent = comment.authorName;
    clone.querySelector('.comment-date').textContent = formatDateTime(comment.createdAt);
    clone.querySelector('.comment-body').textContent = comment.body;

    if (String(comment.authorId) === String(currentUser.id)) {
      const deleteBtn = clone.querySelector('.comment-delete-btn');
      deleteBtn.classList.remove('hidden');
      deleteBtn.addEventListener('click', () => deleteComment(comment.id));
    }

    listEl.appendChild(clone);
  });
}

async function submitComment() {
  const input = document.getElementById('comment-input');
  const body = input.value.trim();

  if (!body) {
    showToast('コメントを入力してください', 'error');
    return;
  }

  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;

  const comment = {
    knowledgeId: currentKnowledgeId,
    authorId: currentUser.id,
    authorName: currentUser.name,
    body,
    createdAt: new Date().toISOString()
  };

  try {
    const response = await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.COMMENTS}/documents`, {
      content: comment
    });
    comment.id = response.id;
    comments.push(comment);

    item.commentCount = (item.commentCount || 0) + 1;
    await domo.put(
      `/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents/${currentKnowledgeId}`,
      { content: item }
    );

    if (String(item.authorId) !== String(currentUser.id)) {
      const notification = {
        recipientId: item.authorId,
        type: 'comment',
        actorName: currentUser.name,
        knowledgeId: currentKnowledgeId,
        knowledgeTitle: item.title,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      const notifResponse = await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.NOTIFICATIONS}/documents`, {
        content: notification
      });
      notification.id = notifResponse.id;
      notifications.push(notification);
    }

    input.value = '';
    renderComments();
    document.getElementById('detail-comment-count').textContent = item.commentCount;
    showToast('コメントを投稿しました', 'success');
  } catch (error) {
    console.error('Failed to submit comment:', error);
    showToast('コメントの投稿に失敗しました', 'error');
  }
}

async function deleteComment(commentId) {
  const confirmed = await showConfirmDialog('コメントを削除しますか？', 'この操作は取り消せません。');
  if (!confirmed) return;

  try {
    await domo.delete(`/domo/datastores/v1/collections/${COLLECTIONS.COMMENTS}/documents/${commentId}`);
    const index = comments.findIndex(c => c.id === commentId);
    if (index !== -1) {
      comments.splice(index, 1);
    }

    const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
    if (item) {
      item.commentCount = Math.max(0, (item.commentCount || 0) - 1);
      await domo.put(
        `/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents/${currentKnowledgeId}`,
        { content: item }
      );
      document.getElementById('detail-comment-count').textContent = item.commentCount;
    }

    renderComments();
    showToast('コメントを削除しました', 'success');
  } catch (error) {
    console.error('Failed to delete comment:', error);
    showToast('コメントの削除に失敗しました', 'error');
  }
}

async function toggleLike() {
  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;

  item.likedBy = item.likedBy || [];
  const userIdStr = String(currentUser.id);
  const isLiked = item.likedBy.map(String).includes(userIdStr);

  if (isLiked) {
    item.likedBy = item.likedBy.filter(id => String(id) !== userIdStr);
    item.likeCount = Math.max(0, (item.likeCount || 0) - 1);
  } else {
    item.likedBy.push(currentUser.id);
    item.likeCount = (item.likeCount || 0) + 1;

    if (String(item.authorId) !== String(currentUser.id)) {
      const notification = {
        recipientId: item.authorId,
        type: 'like',
        actorName: currentUser.name,
        knowledgeId: currentKnowledgeId,
        knowledgeTitle: item.title,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      try {
        const response = await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.NOTIFICATIONS}/documents`, {
          content: notification
        });
        notification.id = response.id;
        notifications.push(notification);
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    }
  }

  try {
    await domo.put(
      `/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents/${currentKnowledgeId}`,
      { content: item }
    );

    document.getElementById('detail-like-count').textContent = item.likeCount;
    const likeIcon = document.querySelector('#detail-like-btn .like-icon');
    if (!isLiked) {
      likeIcon.setAttribute('fill', 'currentColor');
      likeIcon.classList.add('text-red-500');
    } else {
      likeIcon.setAttribute('fill', 'none');
      likeIcon.classList.remove('text-red-500');
    }

    showToast(isLiked ? 'いいねを取り消しました' : 'いいねしました', 'success');
  } catch (error) {
    console.error('Failed to toggle like:', error);
    showToast('いいねの更新に失敗しました', 'error');
  }
}

function editKnowledge() {
  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;

  const permLevel = getPermissionLevel(item);
  if (permLevel === PERMISSION_LEVELS.READ) {
    showToast('編集権限がありません', 'error');
    return;
  }

  isEditMode = true;
  editingItemId = currentKnowledgeId;
  document.getElementById('form-heading').textContent = 'ナレッジを編集';

  document.getElementById('title-input').value = item.title;
  
  const categorySelect = document.getElementById('category-select');
  categorySelect.value = item.category;
  if (!categorySelect.value) {
    const option = document.createElement('option');
    option.value = item.category;
    option.textContent = item.category;
    categorySelect.appendChild(option);
    categorySelect.value = item.category;
  }

  const editor = document.getElementById('content-editor');
  editor.innerHTML = '';
  editorFileStore.clear();
  editorFileIdCounter = 0;
  
  item.content.forEach(block => {
  if (block.type === 'text') {
    const lines = block.value.split('\n');
    lines.forEach((line) => {
      const div = document.createElement('div');
      if (line === '') {
        div.innerHTML = '<br>';
      } else {
        div.textContent = line;
      }
      editor.appendChild(div);
    });
  } else if (block.type === 'image') {
      const fileId = 'file_' + (++editorFileIdCounter);
      const imgName = block.name || ('image_' + Date.now() + '.png');
      editorFileStore.set(fileId, { name: imgName, mimeType: 'image/png', dataUrl: block.value });
      const img = document.createElement('img');
      img.src = block.value;
      img.className = 'max-w-full h-auto my-2 rounded';
      img.dataset.type = 'image';
      img.dataset.fileId = fileId;
      img.title = imgName;
      editor.appendChild(img);
    } else if (block.type === 'file') {
      const fileId = 'file_' + (++editorFileIdCounter);
      editorFileStore.set(fileId, { name: block.name, mimeType: block.mimeType || 'application/octet-stream', dataUrl: block.value });
      const fileDiv = document.createElement('div');
      fileDiv.dataset.type = 'file';
      fileDiv.dataset.fileId = fileId;
      fileDiv.dataset.name = block.name;
      fileDiv.className = 'file-block flex items-center gap-2 p-2 bg-gray-100 rounded border border-gray-300 my-1';
      fileDiv.contentEditable = 'false';
      fileDiv.innerHTML = `
        <svg class="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span class="text-sm text-gray-700 flex-1">${block.name}</span>
        <button type="button" class="remove-file-btn ml-auto text-red-500 text-xs hover:text-red-700">削除</button>
      `;
      fileDiv.querySelector('.remove-file-btn').addEventListener('click', () => {
        editorFileStore.delete(fileId);
        fileDiv.remove();
      });
      editor.appendChild(fileDiv);
    }
  });

  currentFormTags = [...(item.tags || [])];
  renderFormTags();

  currentFormAttributes = [...(item.customAttributes || [])];
  renderFormAttributes();

  document.getElementById('author-input').value = item.authorName;
  document.getElementById('created-at-input').value = formatDateTime(item.createdAt);

  currentFormPermissions = [...(item.permissions || [])];
  renderPermissionsTable();

  showPage('form');
}

async function deleteKnowledge() {
  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;

  const permLevel = getPermissionLevel(item);
  if (permLevel !== PERMISSION_LEVELS.READ_EDIT_DELETE) {
    showToast('削除権限がありません', 'error');
    return;
  }

  const confirmed = await showConfirmDialog('ナレッジを削除しますか？', 'この操作は取り消せません。');
  if (!confirmed) return;

  try {
    await domo.delete(`/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents/${currentKnowledgeId}`);
    
    const index = knowledgeItems.findIndex(i => i.id === currentKnowledgeId);
    if (index !== -1) {
      knowledgeItems.splice(index, 1);
    }

    const itemComments = comments.filter(c => c.knowledgeId === currentKnowledgeId);
    for (const comment of itemComments) {
      await domo.delete(`/domo/datastores/v1/collections/${COLLECTIONS.COMMENTS}/documents/${comment.id}`);
    }
    comments = comments.filter(c => c.knowledgeId !== currentKnowledgeId);

    showToast('ナレッジを削除しました', 'success');
    showPage('list');
    renderKnowledgeList();
  } catch (error) {
    console.error('Failed to delete knowledge:', error);
    showToast('ナレッジの削除に失敗しました', 'error');
  }
}

// ファイル名に使えない文字を置換
function sanitizeFileName(name) {
  return String(name).replace(/[\/\\:*?"<>|]/g, '_').trim() || 'file';
}

// 同じフォルダ内でファイル名が重複しないよう「名前 (2).png」形式にする
function makeUniqueName(name, usedNames) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  while (usedNames.has(`${base} (${n})${ext}`)) n++;
  const unique = `${base} (${n})${ext}`;
  usedNames.add(unique);
  return unique;
}

// エクスポート用に本文を組み立てる。
// 画像・添付ファイルは本文中の位置に [画像: ファイル名] / [添付ファイル: ファイル名] として埋め込む。
// attachments には zip に同梱するためのデータ（フォルダ内パス・元データ）を返す
function buildExportContent(item) {
  const images = [];
  const files = [];
  const attachments = [];
  const usedImageNames = new Set();
  const usedFileNames = new Set();

  const lines = (item.content || []).map(block => {
    if (block.type === 'text') return block.value;
    if (block.type === 'image') {
      // 詳細画面のダウンロード名と同じ規則（名前が無ければ image_N.png）
      const rawName = block.name || `image_${images.length + 1}.png`;
      const name = makeUniqueName(sanitizeFileName(rawName), usedImageNames);
      images.push(name);
      attachments.push({ path: `images/${name}`, value: block.value });
      return `[画像: ${name}]`;
    }
    if (block.type === 'file') {
      const rawName = block.name || `file_${files.length + 1}`;
      const name = makeUniqueName(sanitizeFileName(rawName), usedFileNames);
      files.push(name);
      attachments.push({ path: `files/${name}`, value: block.value });
      return `[添付ファイル: ${name}]`;
    }
    return null;
  }).filter(line => line != null);
  return { text: lines.join('\n'), images, files, attachments };
}

// data URL / URL から Blob を取得する
async function attachmentToBlob(value) {
  if (!value) throw new Error('empty attachment');
  if (value.startsWith('data:')) {
    const commaIdx = value.indexOf(',');
    const meta = value.substring(5, commaIdx);
    const data = value.substring(commaIdx + 1);
    const mimeType = meta.split(';')[0] || 'application/octet-stream';
    if (meta.includes(';base64')) {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mimeType });
    }
    return new Blob([decodeURIComponent(data)], { type: mimeType });
  }
  const res = await fetch(value);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// エクスポート本体。添付が無ければ単体ファイル、あれば画像・添付ファイルを含む zip でダウンロード
async function downloadExport(item, mainBlob, mainExt, exported, label) {
  const baseName = sanitizeFileName(item.title);

  if (exported.attachments.length === 0) {
    triggerDownload(mainBlob, `${baseName}.${mainExt}`);
    showToast(`${label}ファイルをダウンロードしました`, 'success');
    return;
  }

  if (typeof JSZip === 'undefined') {
    // ライブラリが読み込めない場合は従来どおり単体ファイルのみ
    triggerDownload(mainBlob, `${baseName}.${mainExt}`);
    showToast('ZIPライブラリを読み込めなかったため、添付ファイルを除いてダウンロードしました', 'error');
    return;
  }

  showToast('ZIPファイルを作成しています...', 'info');
  const zip = new JSZip();
  zip.file(`${baseName}.${mainExt}`, mainBlob);

  // 記事一覧の一括出力と同じく、添付は <記事id>/images, <記事id>/files に保存
  const folder = getAttachmentFolder(item);
  const failed = [];
  for (const att of exported.attachments) {
    const path = `${folder}/${att.path}`;
    try {
      zip.file(path, await attachmentToBlob(att.value));
    } catch (e) {
      console.error('Failed to add attachment to zip:', path, e);
      failed.push(path);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${baseName}.zip`);

  if (failed.length > 0) {
    showToast(`ZIPをダウンロードしました（取得できなかったファイル: ${failed.join(', ')}）`, 'error');
  } else {
    showToast(`${label}と添付ファイルをZIPでダウンロードしました`, 'success');
  }
}

// 添付ファイルを格納するフォルダ名（記事id）
function getAttachmentFolder(item) {
  return sanitizeFileName(String(item.id));
}

// JSON エクスポート用の記事データ（単体・一括で共通）
function buildExportRecord(item, exported) {
  const record = buildExportRecordBase(item, exported);
  if (exported.attachments.length > 0) {
    record.attachmentFolder = `${getAttachmentFolder(item)}/`;
  }
  return record;
}

function buildExportRecordBase(item, exported) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    content: exported.text,
    images: exported.images,
    files: exported.files,
    tags: item.tags || [],
    customAttributes: item.customAttributes || [],
    authorName: item.authorName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    likeCount: item.likeCount || 0,
    commentCount: item.commentCount || 0,
    viewCount: item.viewCount || 0
  };
}

// 検索結果の記事を一括で JSON + 添付ファイル（記事idごとのフォルダ）として ZIP 出力
//   knowledge_export_YYYYMMDD_HHMMSS.zip
//   ├── knowledge.json            ← 記事データの配列（各記事に id 付き）
//   ├── <記事id>/images/...       ← 画像
//   └── <記事id>/files/...        ← 添付ファイル
async function bulkExportAsJsonZip() {
  const items = getFilteredKnowledgeItems();
  if (items.length === 0) {
    showToast('ダウンロードする記事がありません', 'error');
    return;
  }
  if (typeof JSZip === 'undefined') {
    showToast('ZIPライブラリを読み込めなかったため、ダウンロードできません', 'error');
    return;
  }

  const btn = document.getElementById('bulk-export-json-btn');
  if (btn) btn.disabled = true;
  showToast(`${items.length} 件の記事をZIPにまとめています...`, 'info');

  try {
    const zip = new JSZip();
    const records = [];
    const failed = [];

    for (const item of items) {
      const exported = buildExportContent(item);
      const record = buildExportRecord(item, exported);
      const folder = getAttachmentFolder(item);
      records.push(record);

      for (const att of exported.attachments) {
        const path = `${folder}/${att.path}`;
        try {
          zip.file(path, await attachmentToBlob(att.value));
        } catch (e) {
          console.error('Failed to add attachment to zip:', path, e);
          failed.push(path);
        }
      }
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      count: records.length,
      items: records
    };
    zip.file('knowledge.json', JSON.stringify(exportData, null, 2));

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    triggerDownload(zipBlob, `knowledge_export_${stamp}.zip`);

    if (failed.length > 0) {
      showToast(`ZIPをダウンロードしました（取得できなかったファイル: ${failed.join(', ')}）`, 'error');
    } else {
      showToast(`${records.length} 件の記事をZIPでダウンロードしました`, 'success');
    }
  } catch (error) {
    console.error('Failed to bulk export:', error);
    showToast('一括エクスポートに失敗しました', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ===== PDF 出力項目の選択モーダル =====
const PDF_OPTION_GROUPS = {
  title: [
    { key: 'title', label: 'タイトル' },
  ],
  overview: [
    { key: 'id', label: '記事ID' },
    { key: 'category', label: 'カテゴリ' },
    { key: 'tags', label: 'タグ' },
    { key: 'author', label: '作成者' },
    { key: 'createdAt', label: '作成日時' },
    { key: 'updatedAt', label: '更新日時' },
  ],
  detail: [
    { key: 'text', label: '本文' },
    { key: 'images', label: '画像' },
    { key: 'files', label: '添付ファイル名' },
  ],
};
const PDF_OPTIONS_STORAGE_KEY = 'kbshare.pdfOptions';

// 前回の選択（固定項目のみ）を読み込む。保存が使えない環境では全項目ON
function loadPdfOptionPrefs() {
  try {
    const raw = localStorage.getItem(PDF_OPTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function savePdfOptionPrefs(prefs) {
  try {
    localStorage.setItem(PDF_OPTIONS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    // 保存できなくても出力には影響しない
  }
}

function createPdfOptionCheckbox(container, name, value, label, checked) {
  const wrap = document.createElement('label');
  wrap.className = 'flex items-center gap-2 text-sm text-gray-700 cursor-pointer';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'pdf-option w-4 h-4 rounded border-gray-300';
  input.dataset.group = name;
  input.value = value;
  input.checked = checked;
  input.addEventListener('change', updatePdfConfirmState);
  const span = document.createElement('span');
  span.textContent = label;
  wrap.appendChild(input);
  wrap.appendChild(span);
  container.appendChild(wrap);
}

function openPdfOptionsModal() {
  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;

  const prefs = loadPdfOptionPrefs();
  ['title', 'overview', 'detail'].forEach(group => {
    const container = document.getElementById(`pdf-options-group-${group}`);
    container.innerHTML = '';
    PDF_OPTION_GROUPS[group].forEach(opt => {
      createPdfOptionCheckbox(container, 'field', opt.key, opt.label, prefs[opt.key] !== false);
    });
  });

  // カスタム属性は記事ごとにキーが異なるため、その記事のキーを個別に選択（初期値はすべてON）
  const customContainer = document.getElementById('pdf-options-group-custom');
  customContainer.innerHTML = '';
  const customKeys = [...new Set((item.customAttributes || []).map(a => a && a.key).filter(Boolean))];
  document.getElementById('pdf-options-custom-fieldset').classList.toggle('hidden', customKeys.length === 0);
  customKeys.forEach(key => createPdfOptionCheckbox(customContainer, 'custom', key, key, true));

  updatePdfConfirmState();
  document.getElementById('pdf-options-modal').classList.remove('hidden');
  document.getElementById('pdf-options-confirm').focus();
}

function closePdfOptionsModal() {
  document.getElementById('pdf-options-modal').classList.add('hidden');
}

function setAllPdfOptions(checked) {
  document.querySelectorAll('#pdf-options-modal .pdf-option').forEach(cb => { cb.checked = checked; });
  updatePdfConfirmState();
}

function updatePdfConfirmState() {
  const anyChecked = Array.from(document.querySelectorAll('#pdf-options-modal .pdf-option')).some(cb => cb.checked);
  document.getElementById('pdf-options-confirm').disabled = !anyChecked;
}

function confirmPdfOptions() {
  const fields = new Set();
  const customKeys = new Set();
  document.querySelectorAll('#pdf-options-modal .pdf-option').forEach(cb => {
    if (!cb.checked) return;
    if (cb.dataset.group === 'custom') customKeys.add(cb.value);
    else fields.add(cb.value);
  });

  const prefs = {};
  Object.values(PDF_OPTION_GROUPS).flat().forEach(opt => { prefs[opt.key] = fields.has(opt.key); });
  savePdfOptionPrefs(prefs);

  closePdfOptionsModal();
  downloadAsPdf({ fields, customKeys });
}

// ===== PDF 出力 =====
// 構成: 1. 記事タイトル / 2. 記事の概要（カテゴリ・タグ・作成者・日時・カスタム属性）/ 3. 記事詳細（本文・画像・添付ファイル名）
// options.fields: 出力する固定項目のキー、options.customKeys: 出力するカスタム属性のキー
function buildPdfElement(item, options) {
  const fields = options.fields;
  const customKeys = options.customKeys;
  const FONT = '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif';
  const el = (tag, style, text) => {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (text != null) e.textContent = text;
    return e;
  };

  const root = el('div', `font-family:${FONT};color:#2B241F;font-size:11pt;line-height:1.7;width:180mm;background:#fff;`);

  // 1. 記事タイトル
  if (fields.has('title')) {
    root.appendChild(el('h1', 'font-size:20pt;font-weight:bold;margin:0 0 4mm;padding-bottom:3mm;border-bottom:2px solid #2B241F;', item.title));
  }

  // 2. 記事の概要（選択された項目のみ。1行も無ければ見出しごと省略）
  const table = el('table', 'width:100%;border-collapse:collapse;font-size:10pt;');
  const addRow = (label, value) => {
    if (value == null || value === '') return;
    const tr = el('tr');
    tr.appendChild(el('th', 'width:35mm;text-align:left;vertical-align:top;background:#F3EDE4;border:1px solid #D3C6B4;padding:2mm 3mm;font-weight:bold;', label));
    tr.appendChild(el('td', 'border:1px solid #D3C6B4;padding:2mm 3mm;white-space:pre-wrap;word-break:break-all;', value));
    table.appendChild(tr);
  };
  if (fields.has('id')) addRow('記事ID', String(item.id ?? ''));
  if (fields.has('category')) addRow('カテゴリ', item.category);
  if (fields.has('tags')) addRow('タグ', (item.tags || []).join(', '));
  if (fields.has('author')) addRow('作成者', item.authorName);
  if (fields.has('createdAt')) addRow('作成日時', item.createdAt ? formatDateTime(item.createdAt) : '');
  if (fields.has('updatedAt')) addRow('更新日時', item.updatedAt ? formatDateTime(item.updatedAt) : '');
  (item.customAttributes || []).forEach(attr => {
    if (attr && attr.key && customKeys.has(attr.key)) addRow(attr.key, attr.value || '');
  });
  if (table.rows.length > 0) {
    root.appendChild(el('h2', 'font-size:13pt;font-weight:bold;margin:6mm 0 2mm;', '記事の概要'));
    root.appendChild(table);
  }

  // 3. 記事詳細（本文・画像・添付ファイル名のうち選択されたもの。何も無ければ見出しごと省略）
  const body = el('div', '');
  let imageIndex = 0;
  (item.content || []).forEach(block => {
    if (block.type === 'text') {
      if (!fields.has('text')) return;
      body.appendChild(el('div', 'white-space:pre-wrap;word-break:break-all;margin:0 0 3mm;', block.value));
    } else if (block.type === 'image' && block.value) {
      if (!fields.has('images')) return;
      imageIndex++;
      const fig = el('div', 'margin:3mm 0;page-break-inside:avoid;break-inside:avoid;');
      const img = el('img', 'max-width:100%;max-height:230mm;border:1px solid #E6DDD0;');
      img.src = block.value;
      img.crossOrigin = 'anonymous';
      fig.appendChild(img);
      fig.appendChild(el('div', 'font-size:8.5pt;color:#6B5D52;margin-top:1mm;', block.name || `image_${imageIndex}.png`));
      body.appendChild(fig);
    } else if (block.type === 'file') {
      if (!fields.has('files')) return;
      body.appendChild(el('div', 'margin:2mm 0;padding:2mm 3mm;background:#FAF7F2;border:1px solid #E6DDD0;font-size:10pt;', `添付ファイル: ${block.name || 'file'}`));
    }
  });
  if (body.childNodes.length > 0) {
    root.appendChild(el('h2', 'font-size:13pt;font-weight:bold;margin:8mm 0 2mm;', '記事詳細'));
    root.appendChild(body);
  }

  return root;
}

async function downloadAsPdf(options) {
  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;
  if (!options) return;

  if (typeof html2pdf === 'undefined') {
    showToast('PDFライブラリを読み込めなかったため、PDFを出力できません', 'error');
    return;
  }

  const btn = document.getElementById('detail-download-pdf-btn');
  if (btn) btn.disabled = true;
  showToast('PDFを作成しています...', 'info');

  try {
    const element = buildPdfElement(item, options);
    if (element.childNodes.length === 0) {
      showToast('選択した項目に出力できる内容がありません', 'error');
      return;
    }

    // 画像の読み込み完了を待ってから描画する（未読込のまま描画するとレイアウトが崩れ、本文が欠ける）
    await Promise.all(Array.from(element.querySelectorAll('img')).map(img =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })
    ));

    // スクロール位置がずれていると html2canvas の描画範囲がずれて下部（記事詳細）が欠けるため、
    // 描画中だけ先頭にスクロールし、終わったら元に戻す
    const prevScrollX = window.scrollX;
    const prevScrollY = window.scrollY;
    window.scrollTo(0, 0);
    try {
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `${sanitizeFileName(item.title)}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['img', 'tr'] }
        })
        .from(element)
        .save();
    } finally {
      window.scrollTo(prevScrollX, prevScrollY);
    }
    showToast('PDFをダウンロードしました', 'success');
  } catch (error) {
    console.error('Failed to export PDF:', error);
    showToast('PDFの出力に失敗しました', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function downloadAsJson() {
  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;

  const exported = buildExportContent(item);
  const exportData = buildExportRecord(item, exported);

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });

  try {
    await downloadExport(item, blob, 'json', exported, 'JSON');
  } catch (error) {
    console.error('Failed to export JSON:', error);
    showToast('エクスポートに失敗しました', 'error');
  }
}

async function downloadAsCsv() {
  const item = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!item) return;
  
  const exported = buildExportContent(item);

  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const rows = [
    ['項目', '値'],
    ['id', escapeCSV(item.id)],
    ['タイトル', escapeCSV(item.title)],
    ['カテゴリ', escapeCSV(item.category)],
    ['タグ', escapeCSV((item.tags || []).join(', '))],
    ['作成者', escapeCSV(item.authorName)],
    ['作成日時', escapeCSV(formatDateTime(item.createdAt))],
    ['更新日時', escapeCSV(formatDateTime(item.updatedAt))],
    ['いいね数', item.likeCount || 0],
    ['コメント数', item.commentCount || 0],
    ['閲覧数', item.viewCount || 0]
  ];
  
  if (item.customAttributes && item.customAttributes.length > 0) {
    item.customAttributes.forEach(attr => {
      rows.push([escapeCSV(`カスタム属性: ${attr.key}`), escapeCSV(attr.value)]);
    });
  }
  
  rows.push(['内容', escapeCSV(exported.text)]);
  if (exported.images.length > 0) {
    rows.push(['画像', escapeCSV(exported.images.join(', '))]);
  }
  if (exported.files.length > 0) {
    rows.push(['添付ファイル', escapeCSV(exported.files.join(', '))]);
  }
  if (exported.attachments.length > 0) {
    rows.push(['添付フォルダ', escapeCSV(`${getAttachmentFolder(item)}/`)]);
  }
  
  const csvContent = rows.map(row => row.join(',')).join('\n');
  const bom = '\uFEFF';
  const csvWithBom = bom + csvContent;
  
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });

  try {
    await downloadExport(item, blob, 'csv', exported, 'CSV');
  } catch (error) {
    console.error('Failed to export CSV:', error);
    showToast('エクスポートに失敗しました', 'error');
  }
}

function clearForm() {
  try {
    document.getElementById('title-input').value = '';
    document.getElementById('category-select').value = '';
    document.getElementById('new-category-input').classList.add('hidden');
    document.getElementById('new-category-value').value = '';
    document.getElementById('content-editor').innerHTML = '';
    document.getElementById('author-input').value = currentUser ? currentUser.name : '';
    document.getElementById('created-at-input').value = formatDateTime(new Date().toISOString());
    editorFileStore.clear();
    editorFileIdCounter = 0;
    
    currentFormTags = [];
    renderFormTags();
    
    currentFormAttributes = [];
    renderFormAttributes();
    
    currentFormPermissions = [
      { targetType: 'everyone', targetId: null, targetName: '全員', level: PERMISSION_LEVELS.READ_EDIT }
    ];
    renderPermissionsTable();

    document.getElementById('new-attribute-form').classList.add('hidden');
    document.getElementById('new-attribute-key').value = '';
    document.getElementById('new-attribute-value').value = '';
  } catch (error) {
    console.error('Error in clearForm:', error);
  }
}

function addTag() {
  const input = document.getElementById('tags-input');
  const tag = input.value.trim();
  
  if (tag && !currentFormTags.includes(tag)) {
    currentFormTags.push(tag);
    renderFormTags();
    input.value = '';
    hideTagAutocomplete();
  }
}

// タグ名から色相を決めて、タグごとに少しずつ違う色にする（同じタグは常に同じ色）
function getTagHue(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  // 黄金角(約137.5°)で色相を散らし、似た名前のタグでも色が近くなりにくくする
  return Math.round((hash * 137.508) % 360);
}

function applyTagColor(el, tag) {
  const hue = getTagHue(tag);
  el.style.backgroundColor = `hsl(${hue}, 70%, 92%)`;
  el.style.color = `hsl(${hue}, 55%, 28%)`;
  el.style.border = `1px solid hsl(${hue}, 50%, 80%)`;
}

// カテゴリもタグと同じ仕組みで色分け。タグと区別できるよう背景をやや濃くする
function applyCategoryColor(el, category) {
  const hue = getTagHue(category || '');
  el.style.backgroundColor = `hsl(${hue}, 65%, 84%)`;
  el.style.color = `hsl(${hue}, 60%, 22%)`;
  el.style.border = `1px solid hsl(${hue}, 55%, 72%)`;
}

function renderFormTags() {
  const container = document.getElementById('tags-container');
  container.innerHTML = '';

  currentFormTags.forEach(tag => {
    const badge = document.createElement('div');
    badge.className = 'flex items-center gap-1 px-3 py-1 text-sm rounded-full';
    applyTagColor(badge, tag);
    badge.innerHTML = `
      <span>${tag}</span>
      <button type="button" class="hover:opacity-60">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;
    badge.querySelector('button').addEventListener('click', () => {
      currentFormTags = currentFormTags.filter(t => t !== tag);
      renderFormTags();
    });
    container.appendChild(badge);
  });
}

function showTagAutocomplete() {
  const input = document.getElementById('tags-input');
  const query = input.value.trim().toLowerCase();
  
  if (!query) {
    hideTagAutocomplete();
    return;
  }
  
  const allTags = [...new Set(knowledgeItems.flatMap(i => i.tags || []))];
  const matches = allTags.filter(t => 
    t.toLowerCase().startsWith(query) && !currentFormTags.includes(t)
  );
  
  if (matches.length === 0) {
    hideTagAutocomplete();
    return;
  }
  
  const dropdown = document.getElementById('tags-autocomplete');
  dropdown.innerHTML = '';
  
  matches.slice(0, 5).forEach(tag => {
    const item = document.createElement('div');
    item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm';
    item.textContent = tag;
    item.addEventListener('click', () => {
      currentFormTags.push(tag);
      renderFormTags();
      input.value = '';
      hideTagAutocomplete();
    });
    dropdown.appendChild(item);
  });
  
  dropdown.classList.remove('hidden');
}

function hideTagAutocomplete() {
  document.getElementById('tags-autocomplete').classList.add('hidden');
}

function saveAttribute() {
  const key = document.getElementById('new-attribute-key').value.trim();
  const value = document.getElementById('new-attribute-value').value.trim();
  
  if (!key || !value) {
    showToast('キーと値を入力してください', 'error');
    return;
  }
  
  currentFormAttributes.push({ key, value });
  renderFormAttributes();
  
  document.getElementById('new-attribute-form').classList.add('hidden');
  document.getElementById('new-attribute-key').value = '';
  document.getElementById('new-attribute-value').value = '';
  hideAttrKeyAutocomplete();
}

function renderFormAttributes() {
  const container = document.getElementById('attributes-container');
  container.innerHTML = '';
  
  if (currentFormAttributes.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">カスタム属性が設定されていません</p>';
    return;
  }
  
  currentFormAttributes.forEach((attr, index) => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
    item.innerHTML = `
      <div class="flex-1">
        <span class="text-sm font-medium text-gray-700">${attr.key}:</span>
        <span class="text-sm text-gray-600 ml-2">${attr.value}</span>
      </div>
      <button type="button" class="text-red-500 hover:text-red-600 p-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      currentFormAttributes.splice(index, 1);
      renderFormAttributes();
    });
    container.appendChild(item);
  });
}

function showAttrKeyAutocomplete() {
  const input = document.getElementById('new-attribute-key');
  const query = input.value.trim().toLowerCase();
  
  if (!query) {
    hideAttrKeyAutocomplete();
    return;
  }
  
  const allKeys = [...new Set(knowledgeItems.flatMap(i => (i.customAttributes || []).map(a => a.key)))];
  const matches = allKeys.filter(k => k.toLowerCase().startsWith(query));
  
  if (matches.length === 0) {
    hideAttrKeyAutocomplete();
    return;
  }
  
  const dropdown = document.getElementById('attr-key-autocomplete');
  dropdown.innerHTML = '';
  
  matches.slice(0, 5).forEach(key => {
    const item = document.createElement('div');
    item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm';
    item.textContent = key;
    item.addEventListener('click', () => {
      input.value = key;
      hideAttrKeyAutocomplete();
      document.getElementById('new-attribute-value').focus();
    });
    dropdown.appendChild(item);
  });
  
  dropdown.classList.remove('hidden');
}

function hideAttrKeyAutocomplete() {
  document.getElementById('attr-key-autocomplete').classList.add('hidden');
}

function handlePaste(e) {
  const items = e.clipboardData.items;
  
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      e.preventDefault();
      const file = items[i].getAsFile();
      if (file) {
        insertFileIntoEditor(file);
        const fileType = file.type.startsWith('image/') ? '画像' : 'ファイル';
        showToast(`${fileType}をペーストしました`, 'success');
      }
      return;
    }
  }
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const files = e.dataTransfer.files;
  for (let i = 0; i < files.length; i++) {
    insertFileIntoEditor(files[i]);
  }
}

function handleImageDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const dropZone = document.getElementById('image-drop-zone');
  dropZone.classList.remove('drop-zone-active');
  
  const files = e.dataTransfer.files;
  for (let i = 0; i < files.length; i++) {
    insertFileIntoEditor(files[i]);
  }
}

function handleImageFileSelect(e) {
  const files = e.target.files;
  for (let i = 0; i < files.length; i++) {
    insertFileIntoEditor(files[i]);
  }
  e.target.value = '';
}

function insertFileIntoEditor(file) {
  const editor = document.getElementById('content-editor');
  
  let savedRange = null;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (editor.contains(range.startContainer)) {
      savedRange = range.cloneRange();
    }
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const fileId = 'file_' + (++editorFileIdCounter);
    
    let fileName = file.name;
    if (!fileName || fileName === 'image.png' || fileName === 'blob' || fileName === '') {
      if (file.type.startsWith('image/')) {
        const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'png';
        fileName = 'screenshot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.' + ext;
      } else {
        const ext = file.type ? file.type.split('/')[1] || 'bin' : 'bin';
        fileName = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.' + ext;
      }
    }
    
    editorFileStore.set(fileId, { name: fileName, mimeType: file.type || 'application/octet-stream', dataUrl: e.target.result });
    
    let element;
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'max-w-full h-auto my-2 rounded';
      img.dataset.type = 'image';
      img.dataset.fileId = fileId;
      img.title = fileName;
      element = img;
    } else {
      const fileDiv = document.createElement('div');
      fileDiv.dataset.type = 'file';
      fileDiv.dataset.fileId = fileId;
      fileDiv.dataset.name = fileName;
      fileDiv.className = 'file-block flex items-center gap-2 p-2 bg-gray-100 rounded border border-gray-300 my-1';
      fileDiv.contentEditable = 'false';
      fileDiv.innerHTML = `
        <svg class="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span class="text-sm text-gray-700 flex-1">${fileName}</span>
        <button type="button" class="remove-file-btn ml-auto text-red-500 text-xs hover:text-red-700">削除</button>
      `;
      fileDiv.querySelector('.remove-file-btn').addEventListener('click', () => {
        editorFileStore.delete(fileId);
        fileDiv.remove();
      });
      element = fileDiv;
    }
    
    if (savedRange) {
      const container = savedRange.startContainer;
      const offset = savedRange.startOffset;
      
      if (container.nodeType === Node.TEXT_NODE && offset > 0 && offset < container.textContent.length) {
        const afterText = container.splitText(offset);
        savedRange.setStartBefore(afterText);
        savedRange.setEndBefore(afterText);
      }
      
      savedRange.insertNode(element);
      
      const newRange = document.createRange();
      newRange.setStartAfter(element);
      newRange.setEndAfter(element);
      const newSelection = window.getSelection();
      newSelection.removeAllRanges();
      newSelection.addRange(newRange);
    } else {
      editor.appendChild(element);
    }
  };
  reader.readAsDataURL(file);
}

function openPermissionModal() {
  document.getElementById('permission-modal').classList.remove('hidden');
  document.getElementById('permission-target-type').value = 'everyone';
  document.getElementById('permission-level-select').value = PERMISSION_LEVELS.READ_EDIT;
  updatePermissionTargetSelector();
}

function closePermissionModal() {
  document.getElementById('permission-modal').classList.add('hidden');
}

function updatePermissionTargetSelector() {
  const targetType = document.getElementById('permission-target-type').value;
  const selector = document.getElementById('permission-target-selector');
  const select = document.getElementById('permission-target-select');
  
  if (targetType === 'everyone') {
    selector.classList.add('hidden');
    return;
  }
  
  selector.classList.remove('hidden');
  select.innerHTML = '<option value="">選択してください</option>';
  
  if (targetType === 'user') {
    domoUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.name;
      select.appendChild(option);
    });
  } else if (targetType === 'group') {
    domoGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });
  }
}

function confirmPermission() {
  const targetType = document.getElementById('permission-target-type').value;
  const level = document.getElementById('permission-level-select').value;
  
  let targetId = null;
  let targetName = '全員';
  
  if (targetType !== 'everyone') {
    const select = document.getElementById('permission-target-select');
    targetId = select.value;
    targetName = select.options[select.selectedIndex].text;
    
    if (!targetId) {
      showToast('対象を選択してください', 'error');
      return;
    }
  }
  
  const exists = currentFormPermissions.some(p => 
    p.targetType === targetType && String(p.targetId) === String(targetId)
  );
  
  if (exists) {
    showToast('この対象は既に追加されています', 'error');
    return;
  }
  
  currentFormPermissions.push({ targetType, targetId, targetName, level });
  renderPermissionsTable();
  closePermissionModal();
}

function renderPermissionsTable() {
  const tbody = document.getElementById('permissions-table-body');
  tbody.innerHTML = '';
  
  if (isEditMode) {
    const item = knowledgeItems.find(i => i.id === editingItemId);
    if (item) {
      const template = document.getElementById('permission-entry-template');
      const clone = template.content.cloneNode(true);
      clone.querySelector('.permission-target-name').textContent = item.authorName + ' (作成者)';
      clone.querySelector('.permission-level-label').textContent = PERMISSION_LABELS[PERMISSION_LEVELS.READ_EDIT_DELETE];
      clone.querySelector('.permission-remove-btn').remove();
      tbody.appendChild(clone);
    }
  }
  
  const template = document.getElementById('permission-entry-template');
  
  currentFormPermissions.forEach((perm, index) => {
    const clone = template.content.cloneNode(true);
    clone.querySelector('.permission-target-name').textContent = perm.targetName;
    clone.querySelector('.permission-level-label').textContent = PERMISSION_LABELS[perm.level];
    
    const removeBtn = clone.querySelector('.permission-remove-btn');
    removeBtn.addEventListener('click', () => {
      currentFormPermissions.splice(index, 1);
      renderPermissionsTable();
    });
    
    tbody.appendChild(clone);
  });
}

async function saveKnowledge(status) {
  console.log('saveKnowledge called with status:', status);
  
  const title = document.getElementById('title-input').value.trim();
  const categorySelectVal = document.getElementById('category-select').value;
  const newCategoryVal = document.getElementById('new-category-value').value.trim();
  const category = categorySelectVal || newCategoryVal;
  
  console.log('title:', title, 'category:', category);
  
  if (!title) {
    showToast('タイトルを入力してください', 'error');
    return;
  }
  
  if (!category) {
    showToast('カテゴリを選択または入力してください', 'error');
    return;
  }
  
  const editor = document.getElementById('content-editor');
  const content = [];
  let textBuffer = '';
  
  function flushTextBuffer() {
    const trimmed = textBuffer.trim();
    if (trimmed) content.push({ type: 'text', value: trimmed });
    textBuffer = '';
  }
  
  function processNode(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'IMG' && node.dataset.type === 'image') {
        flushTextBuffer();
        const fileId = node.dataset.fileId;
        let imgSrc = node.src;
        let imgName = node.title || ('image_' + Date.now() + '.png');
        if (fileId && editorFileStore.has(fileId)) {
          const fileData = editorFileStore.get(fileId);
          imgSrc = fileData.dataUrl;
          imgName = fileData.name || imgName;
        }
        content.push({ type: 'image', name: imgName, value: imgSrc });
      }
      else if (node.dataset && node.dataset.type === 'file') {
        flushTextBuffer();
        const fileId = node.dataset.fileId;
        if (fileId && editorFileStore.has(fileId)) {
          const fileData = editorFileStore.get(fileId);
          content.push({ type: 'file', name: fileData.name, mimeType: fileData.mimeType, value: fileData.dataUrl });
        } else {
          const name = node.dataset.name || 'file';
          const mime = node.dataset.mime || 'application/octet-stream';
          const val = node.dataset.value || '';
          if (val) content.push({ type: 'file', name, mimeType: mime, value: val });
        }
      }
      else if (node.tagName === 'BR') {
        textBuffer += '\n';
      }
      else {
        const isBlock = ['DIV', 'P', 'BLOCKQUOTE', 'LI', 'UL', 'OL'].includes(node.tagName);
        node.childNodes.forEach(child => processNode(child));
        if (isBlock) {
          if (textBuffer && !textBuffer.endsWith('\n')) {
            textBuffer += '\n';
          }
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        textBuffer += node.textContent;
      }
    }
  }
  
  editor.childNodes.forEach(node => {
    processNode(node);
  });
  
  flushTextBuffer();
  
  if (content.length === 0) {
    showToast('内容を入力してください', 'error');
    return;
  }
  
  const now = new Date().toISOString();
  const editingItem = isEditMode ? knowledgeItems.find(i => i.id === editingItemId) : null;
  
  const data = {
    title,
    category,
    content,
    tags: currentFormTags,
    customAttributes: currentFormAttributes,
    authorId: currentUser.id,
    authorName: currentUser.name,
    status,
    createdAt: editingItem ? editingItem.createdAt : now,
    updatedAt: now,
    likeCount: editingItem ? (editingItem.likeCount || 0) : 0,
    likedBy: editingItem ? (editingItem.likedBy || []) : [],
    commentCount: editingItem ? (editingItem.commentCount || 0) : 0,
    viewCount: editingItem ? (editingItem.viewCount || 0) : 0,
    permissions: currentFormPermissions
  };
  
  try {
    if (isEditMode && editingItemId) {
      const existingItem = knowledgeItems.find(i => i.id === editingItemId);
      if (existingItem) {
        const existingHistories = knowledgeHistories.filter(h => h.knowledgeId === editingItemId);
        const version = existingHistories.length + 1;
        
        const historyEntry = {
          knowledgeId: editingItemId,
          version: version,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          updatedById: currentUser.id,
          snapshot: {
            title: existingItem.title,
            category: existingItem.category,
            content: existingItem.content,
            tags: existingItem.tags || [],
            customAttributes: existingItem.customAttributes || []
          }
        };
        
        const historyResponse = await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.HISTORY}/documents`, { content: historyEntry });
        historyEntry.id = historyResponse.id;
        knowledgeHistories.push(historyEntry);
      }
      
      await domo.put(
        `/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents/${editingItemId}`,
        { content: data }
      );
      
      const index = knowledgeItems.findIndex(i => i.id === editingItemId);
      if (index !== -1) {
        knowledgeItems[index] = { id: editingItemId, ...data };
      }
      
      showToast('ナレッジを更新しました', 'success');
    } else {
      const response = await domo.post(`/domo/datastores/v1/collections/${COLLECTIONS.KNOWLEDGE}/documents`, {
        content: data
      });
      
      data.id = response.id;
      knowledgeItems.push(data);
      
      showToast(status === 'published' ? 'ナレッジを投稿しました' : '下書きを保存しました', 'success');
    }
    
    showPage('list');
    renderKnowledgeList();
  } catch (error) {
    console.error('Failed to save knowledge:', error);
    showToast('ナレッジの保存に失敗しました: ' + (error.message || '不明なエラー'), 'error');
  }
}

function renderRanking(period) {
  const publishedItems = knowledgeItems.filter(item => item.status === 'published');
  
  let scored;
  if (period === 'weekly') {
    scored = publishedItems.map(item => ({
      ...item,
      score: (item.likeCount || 0) * 3 + (item.commentCount || 0) * 2 + (item.viewCount || 0) * 1
    }));
  } else {
    scored = publishedItems.map(item => ({
      ...item,
      score: (item.likeCount || 0) * 5 + (item.commentCount || 0) * 2 + (item.viewCount || 0) * 1
    }));
  }
  
  const filtered = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  const listEl = document.getElementById('ranking-list');
  const emptyEl = document.getElementById('ranking-empty');
  
  if (filtered.length === 0) {
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }
  
  listEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';
  
  const template = document.getElementById('ranking-card-template');
  const badgeColors = ['#F59E0B', '#9CA3AF', '#B45309'];
  
  filtered.forEach((item, index) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.ranking-card');
    
    const badge = clone.querySelector('.ranking-badge');
    const number = clone.querySelector('.ranking-number');
    number.textContent = index + 1;
    
    if (index < 3) {
      badge.style.backgroundColor = badgeColors[index];
    } else {
      badge.style.backgroundColor = '#85766A';
    }
    
    clone.querySelector('.ranking-title').textContent = item.title;
    
    const categoryBadge = clone.querySelector('.ranking-category');
    categoryBadge.textContent = item.category;
    categoryBadge.className = 'ranking-category px-2 py-1 rounded-full text-xs font-medium';
    applyCategoryColor(categoryBadge, item.category);
    
    clone.querySelector('.ranking-author-name').textContent = item.authorName;
    clone.querySelector('.ranking-likes').textContent = item.likeCount || 0;
    clone.querySelector('.ranking-comments').textContent = item.commentCount || 0;
    
    card.addEventListener('click', () => viewKnowledgeDetail(item.id));
    
    listEl.appendChild(clone);
  });
}

function openHistoryModal() {
  const histories = knowledgeHistories
    .filter(h => h.knowledgeId === currentKnowledgeId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  const listEl = document.getElementById('history-list');
  
  if (histories.length === 0) {
    listEl.innerHTML = '<p class="text-center text-gray-500 py-8">更新履歴はありません</p>';
  } else {
    listEl.innerHTML = '';
    histories.forEach(history => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3 hover:bg-gray-50 cursor-pointer transition';
      item.innerHTML = `
        <div>
          <div class="text-sm font-medium text-gray-900">バージョン ${history.version}</div>
          <div class="text-xs text-gray-500 mt-1">${formatDateTime(history.updatedAt)} ・ ${history.updatedBy}</div>
        </div>
        <button class="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition">
          変更を確認
        </button>
      `;
      item.querySelector('button').addEventListener('click', () => showHistoryDiff(history));
      listEl.appendChild(item);
    });
  }
  
  document.getElementById('history-modal').classList.remove('hidden');
}

function showHistoryDiff(history) {
  const currentItem = knowledgeItems.find(i => i.id === currentKnowledgeId);
  if (!currentItem) return;
  
  const before = history.snapshot;
  const after = {
    title: currentItem.title,
    category: currentItem.category,
    content: currentItem.content,
    tags: currentItem.tags || [],
    customAttributes: currentItem.customAttributes || []
  };
  
  document.getElementById('history-diff-title').textContent = 
    `変更内容の比較 (バージョン ${history.version} → 現在)`;
  
  const diffEl = document.getElementById('history-diff-content');
  diffEl.innerHTML = '';
  
  const titleSection = createDiffSection('タイトル',
    before.title,
    after.title,
    before.title !== after.title
  );
  diffEl.appendChild(titleSection);
  
  const categorySection = createDiffSection('カテゴリ',
    before.category,
    after.category,
    before.category !== after.category
  );
  diffEl.appendChild(categorySection);
  
  const beforeContentText = (before.content || [])
    .filter(c => c.type === 'text')
    .map(c => c.value)
    .join('\n');
  const afterContentText = (after.content || [])
    .filter(c => c.type === 'text')
    .map(c => c.value)
    .join('\n');
  const contentSection = createDiffSection('テキスト内容',
    beforeContentText,
    afterContentText,
    beforeContentText !== afterContentText
  );
  diffEl.appendChild(contentSection);
  
  const beforeImages = (before.content || [])
    .filter(c => c.type === 'image')
    .map(c => c.value);
  const afterImages = (after.content || [])
    .filter(c => c.type === 'image')
    .map(c => c.value);
  
  const imagesChanged = beforeImages.length !== afterImages.length ||
    beforeImages.some((src, i) => src !== afterImages[i]);
  
  const imagesSection = createImageDiffSection('画像',
    beforeImages,
    afterImages,
    imagesChanged
  );
  diffEl.appendChild(imagesSection);
  
  const beforeTags = (before.tags || []).join(', ');
  const afterTags = (after.tags || []).join(', ');
  const tagsSection = createDiffSection('タグ',
    beforeTags || '(なし)',
    afterTags || '(なし)',
    beforeTags !== afterTags
  );
  diffEl.appendChild(tagsSection);
  
  const beforeAttrs = (before.customAttributes || []).map(a => `${a.key}: ${a.value}`).join('\n');
  const afterAttrs = (after.customAttributes || []).map(a => `${a.key}: ${a.value}`).join('\n');
  const attrsSection = createDiffSection('カスタム属性',
    beforeAttrs || '(なし)',
    afterAttrs || '(なし)',
    beforeAttrs !== afterAttrs
  );
  diffEl.appendChild(attrsSection);
  
  document.getElementById('history-modal').classList.add('hidden');
  document.getElementById('history-diff-modal').classList.remove('hidden');
}

function createDiffSection(label, beforeText, afterText, hasChanged) {
  const section = document.createElement('div');
  section.className = 'mb-6';
  
  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 mb-2';
  header.innerHTML = `
    <h4 class="text-sm font-semibold text-gray-700">${label}</h4>
    ${hasChanged 
      ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">変更あり</span>'
      : '<span class="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">変更なし</span>'
    }
  `;
  section.appendChild(header);
  
  if (hasChanged) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-3';
    
    const beforeBox = document.createElement('div');
    beforeBox.className = 'p-3 bg-red-50 border border-red-200 rounded-lg';
    beforeBox.innerHTML = `
      <div class="text-xs font-medium text-red-600 mb-1">変更前</div>
      <div class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(beforeText)}</div>
    `;
    
    const afterBox = document.createElement('div');
    afterBox.className = 'p-3 bg-green-50 border border-green-200 rounded-lg';
    afterBox.innerHTML = `
      <div class="text-xs font-medium text-green-600 mb-1">変更後</div>
      <div class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(afterText)}</div>
    `;
    
    grid.appendChild(beforeBox);
    grid.appendChild(afterBox);
    section.appendChild(grid);
  } else {
    const box = document.createElement('div');
    box.className = 'p-3 bg-gray-50 border border-gray-200 rounded-lg';
    box.innerHTML = `<div class="text-sm text-gray-600 whitespace-pre-wrap">${escapeHtml(beforeText)}</div>`;
    section.appendChild(box);
  }
  
  return section;
}

function createImageDiffSection(label, beforeImages, afterImages, hasChanged) {
  const section = document.createElement('div');
  section.className = 'mb-6';
  
  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 mb-2';
  header.innerHTML = `
    <h4 class="text-sm font-semibold text-gray-700">${label}</h4>
    ${hasChanged 
      ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">変更あり</span>'
      : '<span class="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">変更なし</span>'
    }
  `;
  section.appendChild(header);
  
  if (hasChanged) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-3';
    
    const beforeBox = document.createElement('div');
    beforeBox.className = 'p-3 bg-red-50 border border-red-200 rounded-lg';
    const beforeLabel = document.createElement('div');
    beforeLabel.className = 'text-xs font-medium text-red-600 mb-2';
    beforeLabel.textContent = `変更前 (${beforeImages.length}枚)`;
    beforeBox.appendChild(beforeLabel);
    
    if (beforeImages.length === 0) {
      const noImg = document.createElement('div');
      noImg.className = 'text-xs text-gray-400 italic';
      noImg.textContent = '(画像なし)';
      beforeBox.appendChild(noImg);
    } else {
      beforeImages.forEach((imgSrc, idx) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'mb-2';
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `変更前 画像${idx + 1}`;
        img.className = 'w-full h-auto max-h-48 object-contain rounded border border-red-200 cursor-pointer hover:opacity-80 transition';
        img.addEventListener('click', () => window.open(imgSrc, '_blank'));
        const caption = document.createElement('div');
        caption.className = 'text-xs text-gray-400 mt-1 text-center';
        caption.textContent = `画像 ${idx + 1}`;
        imgWrapper.appendChild(img);
        imgWrapper.appendChild(caption);
        beforeBox.appendChild(imgWrapper);
      });
    }
    
    const afterBox = document.createElement('div');
    afterBox.className = 'p-3 bg-green-50 border border-green-200 rounded-lg';
    const afterLabel = document.createElement('div');
    afterLabel.className = 'text-xs font-medium text-green-600 mb-2';
    afterLabel.textContent = `変更後 (${afterImages.length}枚)`;
    afterBox.appendChild(afterLabel);
    
    if (afterImages.length === 0) {
      const noImg = document.createElement('div');
      noImg.className = 'text-xs text-gray-400 italic';
      noImg.textContent = '(画像なし)';
      afterBox.appendChild(noImg);
    } else {
      afterImages.forEach((imgSrc, idx) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'mb-2';
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `変更後 画像${idx + 1}`;
        img.className = 'w-full h-auto max-h-48 object-contain rounded border border-green-200 cursor-pointer hover:opacity-80 transition';
        img.addEventListener('click', () => window.open(imgSrc, '_blank'));
        const caption = document.createElement('div');
        caption.className = 'text-xs text-gray-400 mt-1 text-center';
        caption.textContent = `画像 ${idx + 1}`;
        imgWrapper.appendChild(img);
        imgWrapper.appendChild(caption);
        afterBox.appendChild(imgWrapper);
      });
    }
    
    grid.appendChild(beforeBox);
    grid.appendChild(afterBox);
    section.appendChild(grid);
  } else {
    const box = document.createElement('div');
    box.className = 'p-3 bg-gray-50 border border-gray-200 rounded-lg';
    if (beforeImages.length === 0) {
      box.innerHTML = '<div class="text-sm text-gray-400 italic">(画像なし)</div>';
    } else {
      const countLabel = document.createElement('div');
      countLabel.className = 'text-xs text-gray-500 mb-2';
      countLabel.textContent = `${beforeImages.length}枚`;
      box.appendChild(countLabel);
      const imgGrid = document.createElement('div');
      imgGrid.className = 'grid grid-cols-3 gap-2';
      beforeImages.forEach((imgSrc, idx) => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `画像${idx + 1}`;
        img.className = 'w-full h-24 object-contain rounded border border-gray-200 cursor-pointer hover:opacity-80 transition';
        img.addEventListener('click', () => window.open(imgSrc, '_blank'));
        imgGrid.appendChild(img);
      });
      box.appendChild(imgGrid);
    }
    section.appendChild(box);
  }
  
  return section;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function backToHistoryList() {
  document.getElementById('history-diff-modal').classList.add('hidden');
  openHistoryModal();
}

function getPermissionLevel(item) {
  if (!currentUser) return PERMISSION_LEVELS.READ;
  
  if (String(item.authorId) === String(currentUser.id)) {
    return PERMISSION_LEVELS.READ_EDIT_DELETE;
  }
  
  const order = [PERMISSION_LEVELS.READ, PERMISSION_LEVELS.READ_EDIT, PERMISSION_LEVELS.READ_EDIT_DELETE];
  let best = null;
  
  for (const perm of (item.permissions || [])) {
    let matches = false;
    
    if (perm.targetType === 'everyone') {
      matches = true;
    } else if (perm.targetType === 'user') {
      matches = String(perm.targetId) === String(currentUser.id);
    } else if (perm.targetType === 'group') {
      const group = domoGroups.find(g => String(g.id) === String(perm.targetId));
      matches = group && (group.memberIds || []).map(String).includes(String(currentUser.id));
    }
    
    if (matches) {
      const currentIndex = order.indexOf(perm.level);
      const bestIndex = best ? order.indexOf(best) : -1;
      if (currentIndex > bestIndex) {
        best = perm.level;
      }
    }
  }
  
  return best || PERMISSION_LEVELS.READ;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const template = document.getElementById('toast-template');
  const clone = template.content.cloneNode(true);
  
  const toast = clone.querySelector('.toast');
  const icon = clone.querySelector('.toast-icon');
  
  if (type === 'success') {
    toast.classList.add('border-green-500');
    icon.classList.add('text-green-500');
  } else if (type === 'error') {
    toast.classList.add('border-red-500');
    icon.classList.add('text-red-500');
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
  }
  
  clone.querySelector('.toast-message').textContent = message;
  
  const closeBtn = clone.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });
  
  container.appendChild(clone);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 3000);
}

function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const template = document.getElementById('confirm-dialog-template');
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.confirm-title').textContent = title;
    clone.querySelector('.confirm-message').textContent = message;
    
    const yesBtn = clone.querySelector('.confirm-yes');
    const noBtn = clone.querySelector('.confirm-no');
    
    yesBtn.addEventListener('click', () => {
      dialog.remove();
      resolve(true);
    });
    
    noBtn.addEventListener('click', () => {
      dialog.remove();
      resolve(false);
    });
    
    const dialog = clone.firstElementChild;
    document.body.appendChild(clone);
  });
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return formatDate(isoString);
}

function openApiDebugModal() {
  document.getElementById('api-debug-modal').classList.remove('hidden');
  updateApiDebugCurrentUser();
}

function closeApiDebugModal() {
  document.getElementById('api-debug-modal').classList.add('hidden');
}

function updateApiDebugCurrentUser() {
  if (currentUser) {
    document.getElementById('debug-current-user-id').textContent = currentUser.id || '-';
    document.getElementById('debug-current-user-name').textContent = currentUser.name || '-';
    document.getElementById('debug-current-user-email').textContent = currentUser.email || '-';
  } else {
    document.getElementById('debug-current-user-id').textContent = '-';
    document.getElementById('debug-current-user-name').textContent = '-';
    document.getElementById('debug-current-user-email').textContent = '-';
  }
}

async function testUsersLimit1() {
  const textarea = document.getElementById('api-response-textarea');
  const btn = document.getElementById('test-api-users-limit1-btn');
  
  btn.disabled = true;
  btn.textContent = '実行中...';
  textarea.value = 'APIリクエストを送信中...\n';
  
  try {
    const response = await domo.get('/domo/users/v1?limit=1');
    
    const output = {
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      endpoint: '/domo/users/v1?limit=1',
      response: response
    };
    
    textarea.value = JSON.stringify(output, null, 2);
    showToast('API実行成功', 'success');
  } catch (error) {
    const output = {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      endpoint: '/domo/users/v1?limit=1',
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack || '',
        statusCode: error.statusCode || error.status || 'N/A'
      }
    };
    
    textarea.value = JSON.stringify(output, null, 2);
    showToast('API実行エラー', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>/domo/users/v1?limit=1 を実行';
  }
}

function testDomoEnv() {
  const textarea = document.getElementById('api-response-textarea');
  const btn = document.getElementById('test-domo-env-btn');
  
  btn.disabled = true;
  btn.textContent = '実行中...';
  
  try {
    const output = {
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      source: 'domo.env',
      domoExists: typeof domo !== 'undefined',
      domoEnv: typeof domo !== 'undefined' && domo.env ? domo.env : null,
      domoKeys: typeof domo !== 'undefined' ? Object.keys(domo) : [],
      domoEnvKeys: typeof domo !== 'undefined' && domo.env ? Object.keys(domo.env) : []
    };
    
    textarea.value = JSON.stringify(output, null, 2);
    showToast('domo.env 確認成功', 'success');
  } catch (error) {
    const output = {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      source: 'domo.env',
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack || ''
      }
    };
    
    textarea.value = JSON.stringify(output, null, 2);
    showToast('domo.env 確認エラー', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>domo.env を確認';
  }
}

async function testUsersLimit500() {
  const textarea = document.getElementById('api-response-textarea');
  const btn = document.getElementById('test-api-users-limit500-btn');
  
  btn.disabled = true;
  btn.textContent = '実行中...';
  textarea.value = 'APIリクエストを送信中...\n';
  
  try {
    const response = await domo.get('/domo/users/v1?limit=500');
    
    const output = {
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      endpoint: '/domo/users/v1?limit=500',
      userCount: Array.isArray(response) ? response.length : 'N/A',
      response: response
    };
    
    textarea.value = JSON.stringify(output, null, 2);
    showToast('API実行成功', 'success');
  } catch (error) {
    const output = {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      endpoint: '/domo/users/v1?limit=500',
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack || '',
        statusCode: error.statusCode || error.status || 'N/A'
      }
    };
    
    textarea.value = JSON.stringify(output, null, 2);
    showToast('API実行エラー', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>/domo/users/v1?limit=500 を実行';
  }
}

document.addEventListener('DOMContentLoaded', init);