// app.js — تعاملات الواجهة الأمامية للزوار (استشارات، نموذج التطوع، نسخ الكود، تنقلات)
// إضافة: تحسين تجاوب اللمس، safe-area handling، ضبط السلوك على أجهزة iOS/Android/tablet
// إضافة: ميزة قائمة المهام (To-do) مع LocalStorage — CRUD + فلترة + استيراد/تصدير
(() => {
  // Utilities
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Add class for touch devices to tweak styles
  function detectTouch() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
  }
  detectTouch();

  // Persisted keys
  const DRAFT_KEY = 'bba_consult_draft_v1';
  const VOL_DRAFT_KEY = 'bba_vol_draft_v1';
  const CONTRAST_KEY = 'bba_high_contrast';
  const TODO_KEY = 'bba_todos_v1';

  // Mobile drawer toggle + focus trap
  const hamburger = $('#hamburger');
  const drawer = $('#mobile-drawer');
  const drawerNav = $('#drawer-nav');
  const drawerClose = $('#drawer-close');
  const drawerAdmin = $('#drawer-admin');

  function openDrawer() {
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('open');
    // focus first link
    const first = drawer.querySelector('button, a');
    first?.focus();
    // trap focus
    document.addEventListener('keydown', trapDrawer);
  }
  function closeDrawer() {
    drawer.setAttribute('aria-hidden', 'true');
    drawer.classList.remove('open');
    hamburger?.focus();
    document.removeEventListener('keydown', trapDrawer);
  }
  function trapDrawer(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])')).filter(n => !n.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  hamburger?.addEventListener('click', () => {
    const hidden = drawer.getAttribute('aria-hidden') === 'true';
    if (hidden) openDrawer(); else closeDrawer();
  });
  drawerClose?.addEventListener('click', closeDrawer);

  // drawer admin
  drawerAdmin?.addEventListener('click', () => {
    window.open('admin.html', '_blank');
  });

  // admin button
  $('#open-admin')?.addEventListener('click', () => {
    window.open('admin.html', '_blank');
  });

  // To-do panel open/close
  const todoPanel = $('#todo-panel');
  const openTodosBtn = $('#open-todos');
  const todoClose = $('#todo-close');

  function openTodos() {
    if (!todoPanel) return;
    todoPanel.setAttribute('aria-hidden','false');
    todoPanel.focus();
    showToast('تم فتح قائمة المهام. جميع المهام محفوظة محليًا.', 'info');
  }
  function closeTodos() {
    if (!todoPanel) return;
    todoPanel.setAttribute('aria-hidden','true');
  }
  openTodosBtn?.addEventListener('click', openTodos);
  todoClose?.addEventListener('click', closeTodos);

  // Contrast toggle (persisted)
  const contrastToggle = $('#contrast-toggle');
  function applyContrast(st) {
    if (st) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');
    contrastToggle.setAttribute('aria-pressed', String(Boolean(st)));
    localStorage.setItem(CONTRAST_KEY, st ? '1' : '0');
  }
  contrastToggle?.addEventListener('click', () => {
    const is = document.body.classList.contains('high-contrast');
    applyContrast(!is);
    showToast('تم تبديل وضع التباين العالي.', 'info');
  });
  // restore contrast
  const savedContrast = localStorage.getItem(CONTRAST_KEY);
  if (savedContrast === '1') applyContrast(true);

  // Improve scroll behavior for iOS
  document.documentElement.style.webkitOverflowScrolling = 'touch';

  // Membership selector logic
  const memberOptions = $$('.member-option');
  let selectedMemberType = null;
  memberOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      memberOptions.forEach(b => { b.setAttribute('aria-pressed','false'); });
      btn.setAttribute('aria-pressed','true');
      selectedMemberType = btn.dataset.value;
    });
  });

  // Volunteer form handling + save draft
  const volunteerForm = $('#volunteer-form');
  const volFields = ['#v-name','#v-phone','#v-email','#municipality','#v-notes'];
  function saveVolDraft() {
    const data = {};
    volFields.forEach(s => { const el = $(s); if (el) data[s] = el.value; });
    localStorage.setItem(VOL_DRAFT_KEY, JSON.stringify(data));
  }
  function restoreVolDraft() {
    const raw = localStorage.getItem(VOL_DRAFT_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      volFields.forEach(s => { const el = $(s); if (el && data[s]) el.value = data[s]; });
    } catch(e){}
  }
  volFields.forEach(s => { const el = $(s); if (el) el.addEventListener('input', saveVolDraft); });

  volunteerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#v-name').value.trim();
    const municipality = $('#municipality').value.trim();
    if (!name || !municipality) {
      showToast('يرجى تعبئة الاسم والبلدية لإرسال الطلب.', 'error');
      return;
    }
    showToast('تم إرسال طلبك بنجاح. سنتواصل معك عند الحاجة. شكراً لتطوعك!', 'success');
    volunteerForm.reset();
    memberOptions.forEach(b => b.setAttribute('aria-pressed','false'));
    selectedMemberType = null;
    localStorage.removeItem(VOL_DRAFT_KEY);
  });

  // Consult draft saving & severity & auto-generate
  const D_KEYS = { type:'#consult-type', desc:'#consult-desc' };
  const sevBtns = $$('.sev-btn');
  let selectedSeverity = null;
  sevBtns.forEach(b => {
    b.addEventListener('click', () => {
      sevBtns.forEach(x => x.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
      selectedSeverity = b.dataset.val;
      saveConsultDraft();
    });
  });

  function saveConsultDraft() {
    const payload = {
      type: $(D_KEYS.type)?.value || '',
      desc: $(D_KEYS.desc)?.value || '',
      severity: selectedSeverity || ''
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }
  function restoreConsultDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      if (p.type) $(D_KEYS.type).value = p.type;
      if (p.desc) $(D_KEYS.desc).value = p.desc;
      if (p.severity) {
        const btn = sevBtns.find(s => s.dataset.val === p.severity);
        if (btn) { btn.setAttribute('aria-pressed','true'); selectedSeverity = p.severity; }
      }
    } catch(e){}
  }

  // Auto-generate code on activity & secure code generation
  const generateBtn = $('#generate-code');
  const codeBox = $('#secure-code');
  const copyBtn = $('#copy-code');

  function generateBBA() {
    const arr = new Uint8Array(4);
    window.crypto.getRandomValues(arr);
    const block1 = Array.from(arr.slice(0,2)).map(n => n.toString(16).padStart(2,'0')).join('').toUpperCase().slice(0,4);
    const block2 = Array.from(arr.slice(2,4)).map(n => n.toString(16).padStart(2,'0')).join('').toUpperCase().slice(0,4);
    return `BBA-${block1}-${block2}`;
  }

  generateBtn?.addEventListener('click', () => {
    const code = generateBBA();
    codeBox.textContent = code;
    codeBox.classList.add('glow');
    copyBtn.disabled = false;
    copyBtn.dataset.code = code;
    showToast('تم إنشاء الكود الآمن. يمكنك نسخه ومشاركته عند الحاجة.', 'success');
  });

  copyBtn?.addEventListener('click', async () => {
    const code = copyBtn.dataset.code;
    if (!code) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement('textarea');
        ta.value = code; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      showToast('تم نسخ الكود بنجاح إلى الحافظة.', 'success');
    } catch (err) {
      showToast('فشل نسخ الكود. الرجاء المحاولة يدويًا.', 'error');
    }
  });

  // Auto-generate when user starts typing/selecting (if no existing code)
  let _autoGenTimer = null;
  function scheduleAutoGenerate() {
    if (copyBtn && !copyBtn.dataset.code) {
      clearTimeout(_autoGenTimer);
      _autoGenTimer = setTimeout(() => {
        const code = generateBBA();
        codeBox.textContent = code;
        codeBox.classList.add('glow');
        copyBtn.disabled = false;
        copyBtn.dataset.code = code;
        showToast('تم إنشاء كود آمن تلقائيًا لحفظ متابعتك.', 'info');
      }, 900);
    }
  }
  $('#consult-desc')?.addEventListener('input', () => { saveConsultDraft(); scheduleAutoGenerate(); });
  $('#consult-type')?.addEventListener('change', () => { saveConsultDraft(); scheduleAutoGenerate(); });

  // Start consult quick action:
  $('#open-consult')?.addEventListener('click', () => {
    document.querySelector('#consultation')?.scrollIntoView({behavior:'smooth'});
    showToast('تم الانتقال إلى نافذة الاستشارة. يمكنك إنشاء كود آمن الآن.', 'info');
  });

  $('#start-consult')?.addEventListener('click', () => {
    showToast('طلب الاستشارة قيد المعالجة. سيظهر لك الكود الآمن، احتفظ به للمتابعة.', 'success');
    const code = generateBBA();
    codeBox.textContent = code;
    codeBox.classList.add('glow');
    copyBtn.disabled = false;
    copyBtn.dataset.code = code;
    saveConsultDraft();
  });

  // Urgent button behavior
  $('#im-in-danger')?.addEventListener('click', () => {
    showToast('إذا كنت في خطر حاليًا، الرجاء الاتصال فورًا بخط الطوارئ المحلي أو التوجّه إلى أقرب مصلحة طوارئ. سنحيل حالتك برمز طوارئ.', 'error');
    // generate a special immediate code prefix and show more prominent glow
    const code = generateBBA();
    codeBox.textContent = `!EMG-${code}`;
    codeBox.classList.add('glow');
    copyBtn.disabled = false;
    copyBtn.dataset.code = codeBox.textContent;
    // optionally store marker in draft
    saveConsultDraft();
  });

  // Activate card-cta buttons to smoothly scroll or open admin
  $$('.card-cta').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Toast system
  const toastEl = $('#toast');
  let toastTimer = null;
  function showToast(message, type = 'info') {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.style.display = 'block';
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(-50%) translateY(8px)';
    if (type === 'success') toastEl.style.borderColor = 'rgba(16,185,129,0.12)';
    else if (type === 'error') toastEl.style.borderColor = 'rgba(239,68,68,0.12)';
    else toastEl.style.borderColor = 'rgba(212,175,55,0.06)';
    requestAnimationFrame(() => {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(()=> toastEl.style.display = 'none', 400);
    }, 4500);
  }

  // ----------------------- To-do List Implementation -----------------------
  const todoForm = $('#todo-form');
  const todoInput = $('#todo-input');
  const todoListEl = $('#todo-list');
  const todoCount = $('#todo-count');
  const clearCompletedBtn = $('#clear-completed');
  const exportBtn = $('#export-todos');
  const importBtn = $('#import-todos');
  const importFile = $('#import-file');
  const todoFilters = $$('.todo-filter');

  let todos = [];
  let filter = 'all';

  function loadTodos() {
    try {
      const raw = localStorage.getItem(TODO_KEY);
      todos = raw ? JSON.parse(raw) : [];
    } catch (e) { todos = []; }
  }
  function saveTodos() {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  }

  function renderTodos() {
    todoListEl.innerHTML = '';
    const filtered = todos.filter(t => filter === 'all' ? true : (filter === 'active' ? !t.completed : t.completed));
    filtered.forEach((t, idx) => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (t.completed ? ' completed' : '');
      li.setAttribute('data-id', t.id);
      li.innerHTML = `
        <input type="checkbox" class="todo-toggle" ${t.completed? 'checked':''} aria-label="تحديد المهمة">
        <div class="label" contenteditable="true" role="textbox" aria-label="محتوى المهمة">${escapeHtml(t.text)}</div>
        <div class="actions">
          <button class="btn outline small todo-edit">تعديل</button>
          <button class="btn outline small todo-delete">حذف</button>
        </div>
      `;
      // toggle
      li.querySelector('.todo-toggle').addEventListener('change', (e) => {
        t.completed = e.target.checked;
        saveTodos(); renderTodos();
      });
      // delete
      li.querySelector('.todo-delete').addEventListener('click', () => {
        todos = todos.filter(x => x.id !== t.id);
        saveTodos(); renderTodos();
        showToast('تم حذف المهمة.', 'info');
      });
      // edit (contenteditable + save on blur)
      const label = li.querySelector('.label');
      label.addEventListener('blur', () => {
        const newText = label.innerText.trim();
        if (!newText) {
          // revert
          label.innerText = t.text;
          showToast('المهمة لا يمكن أن تكون فارغة.', 'error');
          return;
        }
        t.text = newText;
        saveTodos(); renderTodos();
        showToast('تم تحديث المهمة.', 'success');
      });
      // small edit button focuses field
      li.querySelector('.todo-edit').addEventListener('click', () => { label.focus(); });

      todoListEl.appendChild(li);
    });
    updateCount();
  }

  function updateCount() {
    const remaining = todos.filter(t => !t.completed).length;
    todoCount.textContent = `${remaining} مهمة متبقية`;
  }

  function addTodo(text) {
    const t = { id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), text: text.trim(), completed: false };
    todos.unshift(t);
    saveTodos(); renderTodos();
  }

  todoForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = (todoInput.value || '').trim();
    if (!val) { showToast('الرجاء إدخال نص المهمة.', 'error'); return; }
    addTodo(val);
    todoInput.value = '';
    showToast('تم إضافة المهمة.', 'success');
  });

  clearCompletedBtn?.addEventListener('click', () => {
    const before = todos.length;
    todos = todos.filter(t => !t.completed);
    saveTodos(); renderTodos();
    showToast(`تم حذف ${before - todos.length} مهمة منجزة.`, 'info');
  });

  // Filters
  todoFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      todoFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderTodos();
    });
  });

  // Export/Import
  exportBtn?.addEventListener('click', () => {
    const data = JSON.stringify(todos, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bba_todos_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('تم تصدير قائمة المهام.', 'success');
  });

  importBtn?.addEventListener('click', () => { importFile.click(); });
  importFile?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) throw new Error('Invalid');
        // basic validation
        parsed.forEach(p => { if (!p.id || !p.text) throw new Error('Invalid'); });
        todos = parsed;
        saveTodos(); renderTodos();
        showToast('تم استيراد المهام بنجاح.', 'success');
      } catch (err) {
        showToast('فشل استيراد الملف. تأكد من تنسيق JSON الصحيح.', 'error');
      }
    };
    reader.readAsText(f, 'utf-8');
    importFile.value = '';
  });

  // Helpers
  function escapeHtml(unsafe) {
    return unsafe.replace(/[&<"'`=\/]/g, function(s) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;","/":"&#x2F;","=`":"&#x3D;"}[s]) || s; });
  }

  // Progressive reveal & initial load
  window.addEventListener('load', () => {
    loadTodos(); renderTodos();
    // restore drafts
    restoreConsultDraft();
    restoreVolDraft();
  });

  // Save draft on unload as well
  window.addEventListener('beforeunload', () => {
    saveConsultDraft();
    saveVolDraft();
    saveTodos();
  });

  // Accessibility: close drawer on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drawer.getAttribute('aria-hidden') === 'false') closeDrawer();
      if (todoPanel && todoPanel.getAttribute('aria-hidden') === 'false') closeTodos();
    }
  });

  // Responsive adjustments on resize: show/hide bottom nav as needed
  function handleResize() {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;
    if (window.innerWidth <= 768) bottomNav.style.display = 'flex';
    else bottomNav.style.display = 'none';
  }
  window.addEventListener('resize', handleResize);
  handleResize();

})();
