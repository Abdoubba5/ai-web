// app.js — تعاملات الواجهة الأمامية للزوار (استشارات، نموذج التطوع، نسخ الكود، تنقلات)
// إضافة: حفظ المسودات محليًا، شدة الحالة، زر طوارئ، تبديل تباين عالي، traps للتركيز في drawer، تحسين وصولية.
(() => {
  // Utilities
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Persisted keys
  const DRAFT_KEY = 'bba_consult_draft_v1';
  const VOL_DRAFT_KEY = 'bba_vol_draft_v1';
  const CONTRAST_KEY = 'bba_high_contrast';

  // Mobile drawer toggle + focus trap
  const hamburger = $('#hamburger');
  const drawer = $('#mobile-drawer');
  const drawerNav = $('#drawer-nav');
  const drawerClose = $('#drawer-close');

  function openDrawer() {
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('open');
    // focus first link
    const first = drawer.querySelector('a');
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

  // bottom nav
  const bottomNavBtns = $$('.bn-item');
  bottomNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.target);
      if (target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

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

  // Keyboard shortcut to focus consult description (ctrl+shift+c)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      $('#consult-desc').focus();
      showToast('تركيز سريع على وصف الاستشارة', 'info');
    }
  });

  // Smooth in-page nav highlight
  const navLinks = $$('.nav-link');
  navLinks.forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const href = a.getAttribute('href');
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({behavior:'smooth',block:'start'});
      navLinks.forEach(l => l.classList.remove('active'));
      a.classList.add('active');
    });
  });

  // Progressive reveal for article cards
  window.addEventListener('load', () => {
    $$('.article-card').forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(10px)';
      setTimeout(()=> {
        c.style.transition = 'opacity 450ms ease, transform 450ms ease';
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      }, 120*i);
    });
    // restore drafts
    restoreConsultDraft();
    restoreVolDraft();
  });

  // Save draft on unload as well
  window.addEventListener('beforeunload', () => {
    saveConsultDraft();
    saveVolDraft();
  });

  // Accessibility: close drawer on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drawer.getAttribute('aria-hidden') === 'false') closeDrawer();
    }
  });

})();
