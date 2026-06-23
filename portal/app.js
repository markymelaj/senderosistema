const root = document.getElementById('portal');
let sb, session, profile;
let data = { appointments: [], documents: [], requests: [], patient: null };
const patientDemo = { email: 'paciente@senderos.demo', password: 'Senderos2026!' };

init();
async function init(){
  const cfg = await (await fetch('/api/public-config')).json();
  if(!cfg.supabaseUrl || !cfg.supabaseAnonKey){ root.innerHTML = loginShell('<div class="notice error">Portal no configurado.</div>'); return; }
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth:{ persistSession:true, autoRefreshToken:true }});
  const res = await sb.auth.getSession(); session = res.data.session;
  sb.auth.onAuthStateChange(async (_e,s)=>{ session=s; if(s) await load(); else { profile=null; data={ appointments: [], documents: [], requests: [], patient: null }; } render(); });
  if(session) await load();
  render();
}
function render(){ if(!session){ root.innerHTML=loginShell(); bindLogin(); return; } root.innerHTML=shell(); bind(); }
function loginShell(extra=''){ return `<main class="login"><section class="login-card"><img src="../assets/logo-senderos.png" alt=""><h1>Portal de pacientes y familiares</h1><p>Acceso para turnos, solicitudes y documentos autorizados por la fundación.</p>${extra}<form id="login" class="form"><label class="field">Email<input name="email" type="email" required></label><label class="field">Contraseña<input name="password" type="password" required></label><button class="btn primary">Ingresar</button></form><div class="demo-box"><button class="btn secondary full" type="button" data-prepare-demo>Preparar accesos demo</button><button class="demo-login" type="button" data-demo-patient><strong>Ingresar como paciente demo</strong><span>paciente@senderos.demo</span></button></div><a class="back-link" href="/">Volver a la web</a></section></main>`; }
function shell(){ return `<main class="wrap"><header class="header"><div class="brand"><img src="../assets/logo-senderos.png" alt=""><div><strong>Senderos de Libertad</strong><small>Portal seguro</small></div></div><button class="btn secondary" id="logout">Salir</button></header><section class="hero"><h1>${escapeHtml(profile?.full_name||'Portal')}</h1><p>La información visible en este portal está autorizada por el equipo de la fundación.</p></section><div id="msg"></div><section class="grid"><div class="card"><h2>Turnos</h2>${table(['Fecha','Tipo','Profesional','Estado'], data.appointments.map(a=>[fmt(a.start_at), a.appointment_types?.name||'-', a.professionals?.full_name||'-', tag(a.status)]))}</div><div class="card"><h2>Documentos</h2>${documents()}</div><div class="card"><h2>Nueva solicitud</h2><form id="requestForm" class="form"><label class="field">Tipo<select name="request_type"><option value="turno">Turno</option><option value="documento">Documento</option><option value="datos">Corrección de datos</option><option value="otro">Otro</option></select></label><label class="field">Asunto<input name="subject" required></label><label class="field full">Mensaje<textarea name="message" rows="5" required></textarea></label><button class="btn primary">Enviar solicitud</button></form></div><div class="card"><h2>Solicitudes enviadas</h2>${table(['Fecha','Tipo','Asunto','Estado'], data.requests.map(r=>[fmt(r.created_at), r.request_type, r.subject, tag(r.status)]))}</div></section><p class="footer-note">Si existe riesgo inmediato, acudir a urgencias o contactar servicios de emergencia.</p></main>`; }
async function load(){
  const p = await sb.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle(); profile = p.data || null;
  const [appts, docs, reqs, patient] = await Promise.all([
    sb.from('appointments').select('*, professionals(full_name), appointment_types(name)').order('start_at',{ascending:true}).limit(50),
    sb.from('patient_documents').select('*').order('created_at',{ascending:false}).limit(50),
    sb.from('portal_requests').select('*').order('created_at',{ascending:false}).limit(50),
    profile?.patient_id ? sb.from('patients').select('*').eq('id',profile.patient_id).maybeSingle() : Promise.resolve({data:null})
  ]);
  data.appointments = appts.data || []; data.documents = docs.data || []; data.requests = reqs.data || []; data.patient = patient.data;
}
function bindLogin(){
  document.getElementById('login')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); await loginWith(String(fd.get('email')), String(fd.get('password'))); });
  document.querySelector('[data-demo-patient]')?.addEventListener('click', async()=>loginWith(patientDemo.email, patientDemo.password));
  document.querySelector('[data-prepare-demo]')?.addEventListener('click', async()=>{
    const btn=document.querySelector('[data-prepare-demo]'); btn.disabled=true; btn.textContent='Preparando accesos...';
    try{
      const res=await fetch('/api/init-demo-users',{method:'POST'}); const data=await res.json();
      if(!res.ok) throw new Error(data.error || 'No se pudieron preparar los accesos');
      root.innerHTML=loginShell(`<div class="notice ok">Accesos demo listos. Ya podés ingresar.</div>`);
    }catch(err){ root.innerHTML=loginShell(`<div class="notice error">${escapeHtml(err.message)}</div>`); }
    bindLogin();
  });
}
async function loginWith(email,password){ const {error}=await sb.auth.signInWithPassword({email,password}); if(error) root.innerHTML=loginShell(`<div class="notice error">${escapeHtml(error.message)}</div>`), bindLogin(); }
function bind(){ document.getElementById('logout')?.addEventListener('click', async()=>sb.auth.signOut()); document.getElementById('requestForm')?.addEventListener('submit', async e=>{ e.preventDefault(); if(!profile?.patient_id) return message('Usuario sin paciente vinculado.','error'); const fd=new FormData(e.currentTarget); const {error}=await sb.from('portal_requests').insert({patient_id:profile.patient_id, request_type:fd.get('request_type'), subject:fd.get('subject'), message:fd.get('message')}); if(error) message(error.message,'error'); else { await load(); render(); message('Solicitud enviada.'); } }); document.querySelectorAll('[data-download]').forEach(b=>b.addEventListener('click', async()=>{ const path=b.dataset.download; const {data,error}=await sb.storage.from('clinical-documents').createSignedUrl(path,60); if(error) return message(error.message,'error'); window.open(data.signedUrl,'_blank'); })); }
function documents(){ if(!data.documents.length) return `<div class="empty">Sin documentos disponibles</div>`; return `<div class="doc-list">${data.documents.map(d=>`<button class="doc-row" ${d.file_path?`data-download="${escapeHtml(d.file_path)}"`:''}><strong>${escapeHtml(d.title)}</strong><small>${d.file_path?'Descargar':'Pendiente'}</small></button>`).join('')}</div>`; }
function message(t,type=''){ const el=document.getElementById('msg'); if(el) el.innerHTML=`<div class="notice ${type}">${escapeHtml(t)}</div>`; }
function table(headers, rows){ if(!rows.length) return '<div class="empty">Sin registros</div>'; return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${String(c||'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function tag(s){ return `<span class="tag">${escapeHtml(s||'-')}</span>`; }
function fmt(v){ if(!v) return '-'; return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)); }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
