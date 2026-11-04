const $ = (s) => document.querySelector(s);
const msg = (t) => { $('#admin-msg').textContent = t || ''; };
let token = localStorage.getItem('nexo_admin_token') || '';

async function call(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token, ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

async function loadMetrics() {
  const m = await call('/metrics');
  $('#metrics-card').hidden = false;
  $('#metrics').innerHTML = [
    ['Usuarios', m.users],
    ['Test completados', m.assessmentsCompleted],
    ['Conversión test', `${m.conversionQuiz}%`],
    ['Registros clínicos', m.clinicalRecords],
    ['Enlaces activos', `${m.invitesActive}/${m.invites}`],
    ['Check-ins diarios', m.dailyLogs],
  ].map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${v}</strong></div>`).join('');
}

async function loadInvites() {
  const { invites } = await call('/invites');
  $('#invites-card').hidden = false;
  $('#invites-body').innerHTML = invites.length
    ? invites.map((i) => `
      <tr>
        <td>${i.label || '—'}<br /><small class="hint">${i.revoked ? 'revocado' : i.uses >= i.maxUses ? 'agotado' : 'activo'}</small></td>
        <td><code class="link">${i.link}</code></td>
        <td>${i.uses}/${i.maxUses}</td>
        <td>${i.revoked ? '' : `<button class="btn btn-ghost" data-revoke="${i.id}" style="padding:.35em .8em;font-size:.76rem">Revocar</button>`}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="hint">Sin enlaces todavía.</td></tr>';

  document.querySelectorAll('[data-revoke]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await call(`/invites/${btn.dataset.revoke}/revoke`, { method: 'POST' });
      await loadInvites();
      await loadMetrics();
    });
  });
}

async function enter() {
  if (!token) { msg('Escribe el token.'); return; }
  try {
    await loadMetrics();
    await loadInvites();
    localStorage.setItem('nexo_admin_token', token);
    msg('Sesión de administración activa.');
  } catch (err) {
    msg(err.message);
    $('#metrics-card').hidden = true;
    $('#invites-card').hidden = true;
  }
}

$('#save-token').addEventListener('click', () => { token = $('#token').value.trim(); enter(); });
$('#token').addEventListener('keydown', (e) => { if (e.key === 'Enter') { token = $('#token').value.trim(); enter(); } });

$('#create-invite').addEventListener('click', async () => {
  try {
    const body = {
      label: $('#inv-label').value.trim() || null,
      maxUses: Number($('#inv-uses').value || 1),
      days: $('#inv-days').value ? Number($('#inv-days').value) : null,
    };
    const { link } = await call('/invites', { method: 'POST', body: JSON.stringify(body) });
    msg(`Enlace creado: ${link}`);
    $('#inv-label').value = '';
    await loadInvites();
    await loadMetrics();
  } catch (err) {
    msg(err.message);
  }
});

if (token) { $('#token').value = token; enter(); }
