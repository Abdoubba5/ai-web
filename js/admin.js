// admin.js — responsive improvements: ensure sidebar toggles, provide mobile-friendly interactions
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const lockOverlay = $('#lock-overlay');
  const lockForm = $('#lock-form');
  const adminEmail = $('#admin-email');
  const adminPass = $('#admin-pass');
  const demoFill = $('#demo-fill');
  const sidebar = $('#sidebar');
  const sidebarToggle = $('#sidebar-toggle');
  const sbItems = $$('.sb-item');
  const membersTable = $('#members-table');
  const exportBtn = $('#export-csv');
  const exportSpinner = $('#export-spinner');
  const toast = $('#toast-admin');
  const CONTRAST_KEY = 'bba_high_contrast';

  // Demo credentials
  const CRED = { email: 'admin@bba.dz', pass: 'bba2026' };

  function showAdminToast(msg, theme='info') {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> { toast.style.opacity = '0'; setTimeout(()=> toast.style.display='none',400); }, 3000);
  }

  // Demo fill button
  demoFill?.addEventListener('click', () => {
    adminEmail.value = CRED.email;
    adminPass.value = CRED.pass;
  });

  // Focus trap for lock overlay (vault)
  function trapVault(e) {
    if (e.key !== 'Tab') return;
    const modal = $('#vault');
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll('input,button,[tabindex]:not([tabindex="-1"])')).filter(n => !n.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  // Lock form submit: simulate authentication
  lockForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const em = adminEmail.value.trim();
    const pw = adminPass.value.trim();
    if (em === CRED.email && pw === CRED.pass) {
      // hide overlay with smooth transition
      lockOverlay.style.opacity = '1';
      lockOverlay.style.transition = 'opacity 420ms ease';
      lockOverlay.style.opacity = '0';
      setTimeout(()=> { lockOverlay.style.display = 'none'; lockOverlay.setAttribute('aria-hidden','true'); document.removeEventListener('keydown', trapVault); initializeDashboard(); }, 460);
    } else {
      showAdminToast('بيانات غير صحيحة. الرجاء المحاولة مرة أخرى.', 'error');
    }
  });

  // Attach trap when overlay shown
  if (lockOverlay && lockOverlay.getAttribute('aria-hidden') === 'false') {
    document.addEventListener('keydown', trapVault);
    // focus first input
    setTimeout(()=> $('#admin-email')?.focus(), 120);
  }

  // Initialize dashboard after "auth"
  function initializeDashboard() {
    // restore contrast preference for admin if exists
    const savedContrast = localStorage.getItem(CONTRAST_KEY);
    if (savedContrast === '1') document.body.classList.add('high-contrast');

    // populate counters (demo values)
    $('#counter-today').textContent = '18';
    $('#counter-members').textContent = '346';
    // fill members table (demo rows)
    const demoMembers = [
      {name:'أحمد ق.', muni:'برج بوعريريج', type:'عضو فعال في الإدارة', status:'Approved'},
      {name:'فاطمة ع.', muni:'المنصورة', type:'عضو في التنظيم', status:'Pending'},
      {name:'يوسف م.', muni:'رأس الوادي', type:'عضو في التنظيم', status:'Approved'},
      {name:'سلمى ب.', muni:'الماين', type:'عضو فعال في الإدارة', status:'Pending'}
    ];
    membersTable.innerHTML = '';
    demoMembers.forEach((m, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.name}</td>
        <td>${m.muni}</td>
        <td style="color:${m.type.includes('إدارة')? '#D4AF37':'#ffffff'}; font-weight:800">${m.type}</td>
        <td>${m.status === 'Approved' ? '<span class="badge approved">موافق</span>' : '<span class="badge pending">قيد المراجعة</span>'}</td>
        <td><button class="btn outline small view-member" data-idx="${idx}">عرض</button></td>
      `;
      membersTable.appendChild(tr);
    });

    // Chart
    const ctx = document.getElementById('barChart');
    if (ctx && window.Chart) {
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['يناير','فبراير','مارس','أبريل','ماي','يونيو'],
          datasets: [{
            label: 'قرارات',
            data: [12, 19, 8, 15, 10, 14],
            backgroundColor: 'rgba(212,175,55,0.28)',
            borderColor: 'rgba(212,175,55,0.86)',
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 18
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: '#e6eef8' },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#dfeaf6' },
              grid: { color: 'rgba(255,255,255,0.03)' }
            }
          }
        }
      });
    }

    // enable view buttons
    document.querySelectorAll('.view-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tr = e.target.closest('tr');
        const cols = tr.querySelectorAll('td');
        const info = `الاسم: ${cols[0].innerText}\nالبلدية: ${cols[1].innerText}\nنوع العضوية: ${cols[2].innerText}\nالحالة: ${cols[3].innerText}`;
        showAdminToast(info);
      });
    });
  }

  // Sidebar toggle for small screens
  sidebarToggle?.addEventListener('click', () => {
    if (!sidebar) return;
    const shown = sidebar.style.left === '0px';
    sidebar.style.left = shown ? '-320px' : '0px';
  });

  // Ensure sidebar state on resize
  function handleResize() {
    if (!sidebar) return;
    if (window.innerWidth <= 980) {
      sidebar.style.left = '-320px';
    } else {
      sidebar.style.left = '0px';
    }
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // Export CSV logic (UTF-8 BOM + disable button + spinner)
  exportBtn?.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportSpinner.style.display = 'inline-block';
    try {
      // assemble CSV from table
      const rows = [];
      const headers = ['الاسم','البلدية','نوع العضوية','الحالة'];
      rows.push(headers);
      const trs = Array.from(document.querySelectorAll('#members-table tr'));
      trs.forEach(tr => {
        const cols = Array.from(tr.querySelectorAll('td')).slice(0,4).map(td => td.innerText.trim().replace(/\n/g,' '));
        rows.push(cols);
      });
      // convert to CSV with BOM
      const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell.replace(/"/g,'""')}"`).join(',')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bba_members_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showAdminToast('تم تصدير الملف بنجاح. سيتم تنزيله الآن.');
    } catch (err) {
      showAdminToast('فشل التصدير. الرجاء المحاولة مرة أخرى.', 'error');
    } finally {
      setTimeout(()=> {
        exportBtn.disabled = false;
        exportSpinner.style.display = 'none';
      }, 800);
    }
  });

  // Initialize minimal state if overlay is already hidden (edge)
  if (lockOverlay && lockOverlay.style.display === 'none') {
    initializeDashboard();
  }

})();
