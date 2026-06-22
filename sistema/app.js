const app = document.getElementById('app');
let sb = null;
let session = null;
let profile = null;
let activeTab = 'dashboard';
let state = {
  patients: [], professionals: [], programs: [], appointments: [], appointmentTypes: [], rooms: [],
  clinicalEntries: [], templates: [], documents: [], documentTypes: [], finance: [], profiles: [], audit: [], orgs: []
};

const tabs = [
  ['dashboard','Inicio'], ['patients','Pacientes'], ['professionals','Profesionales'], ['appointments','Turnos'],
  ['clinical','Historia clínica'], ['documents','Documentos'], ['programs','Programas'], ['access','Accesos'],
  ['finance','Finanzas'], ['audit','Auditoría']
];

const roleOptions = [
  ['direction','Dirección'], ['clinical_coordination','Coordinación clínica'], ['medical','Psiquiatra / Médico'],
  ['psychologist','Psicología'], ['social_worker','Asistente social'], ['therapeutic_operator','Asistente terapéutico'],
  ['professional','Profesional'], ['admission','Admisión'], ['finance','Administración'], ['auditor','Auditoría'],
  ['patient','Paciente'], ['family','Familiar autorizado']
];

const statusLabel = {
  preingreso:'Preingreso', evaluacion:'Evaluación', admitido:'Admitido', en_tratamiento:'En tratamiento',
  seguimiento:'Seguimiento', egresado:'Egresado', suspendido:'Suspendido', derivado:'Derivado'
};

init();

async function init(){
  try{
    const cfgRes = await fetch('/api/public-config');
    const cfg = await cfgRes.json();
    if(!cfg.supabaseUrl || !cfg.supabaseAnonKey){
      app.innerHTML = loginShell(`<div class="notice error">Faltan variables de Supabase en Vercel.</div>`);
      return;
    }
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth:{ persistSession:true, autoRefreshToken:true }});
    const { data } = await sb.auth.getSession();
    session = data.session;
    sb.auth.onAuthStateChange((_event, newSession)=>{ session = newSession; render(); if(session) loadAll(); });
    if(session) await loadAll();
    render();
  }catch(err){
    app.innerHTML = loginShell(`<div class="notice error">No se pudo iniciar el sistema: ${escapeHtml(err.message)}</div>`);
  }
}

function render(){
  if(!session){ app.innerHTML = loginShell(); bindLogin(); return; }
  if(!profile){ app.innerHTML = shell(`<div class="panel"><h2>Activar primer administrador</h2><p class="muted">El usuario inició sesión, pero todavía no tiene perfil interno.</p><button class="btn primary" data-action="bootstrap">Crear primer administrador</button></div>`); bindBase(); return; }
  app.innerHTML = shell(renderTab());
  bindBase();
  bindTab();
}

function loginShell(extra=''){
  return `<main class="login-wrap"><section class="login-card"><img src="../assets/logo-senderos.png" alt="Senderos de Libertad"><h1>Sistema interno</h1><p>Acceso para dirección, admisión, profesionales y administración.</p>${extra}<form id="loginForm" class="form"><label class="field">Email<input name="email" type="email" required autocomplete="email"></label><label class="field">Contraseña<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary" type="submit">Ingresar</button></form></section></main>`;
}

function shell(content){
  return `<div class="layout"><aside class="sidebar"><div class="brand"><img src="../assets/logo-senderos.png" alt=""><div><strong>Senderos de Libertad</strong><small>${profile ? roleName(profile.role_code) : 'Sin perfil'}</small></div></div><nav class="nav">${tabs.map(([id,label])=>`<button data-tab="${id}" class="${activeTab===id?'active':''}">${label}</button>`).join('')}</nav><button class="logout" data-action="logout">Cerrar sesión</button></aside><main class="main"><header class="topbar"><div><p class="eyebrow">Sistema clínico administrativo</p><h1>${tabTitle(activeTab)}</h1></div><div class="top-actions"><button class="btn secondary" data-action="refresh">Actualizar</button></div></header><div id="messages"></div>${content}</main></div>`;
}

function tabTitle(id){ return (tabs.find(t=>t[0]===id)||[])[1] || 'Sistema'; }
function roleName(code){ return (roleOptions.find(r=>r[0]===code)||[])[1] || code || 'Usuario'; }
function msg(text,type='ok'){ const el=document.getElementById('messages'); if(el) el.innerHTML=`<div class="notice ${type}">${escapeHtml(text)}</div>`; }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
function fmt(v){ if(!v) return '-'; return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)); }
function money(n,c='ARS'){ return `${c} ${Number(n||0).toLocaleString('es-AR')}`; }

function bindLogin(){
  document.getElementById('loginForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
    if(error) app.innerHTML = loginShell(`<div class="notice error">${escapeHtml(error.message)}</div>`), bindLogin();
  });
}

function bindBase(){
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{ activeTab=btn.dataset.tab; render(); }));
  document.querySelector('[data-action="logout"]')?.addEventListener('click', async()=>{ await sb.auth.signOut(); });
  document.querySelector('[data-action="refresh"]')?.addEventListener('click', async()=>{ await loadAll(); render(); msg('Información actualizada.'); });
  document.querySelector('[data-action="bootstrap"]')?.addEventListener('click', async()=>{
    const { data, error } = await sb.rpc('bootstrap_first_admin', { display_name: 'Administrador Senderos' });
    if(error) msg(error.message,'error'); else { await loadAll(); render(); msg(data || 'Administrador creado.'); }
  });
}

async function loadAll(){
  const prof = await sb.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle();
  profile = prof.data || null;
  if(!profile) return;
  const queries = await Promise.all([
    sb.from('patients').select('*').is('deleted_at', null).order('created_at',{ascending:false}).limit(500),
    sb.from('professionals').select('*').order('full_name').limit(300),
    sb.from('programs').select('*').order('name').limit(100),
    sb.from('appointment_types').select('*').order('name'),
    sb.from('rooms').select('id,name').order('name'),
    sb.from('appointments').select('*, patients(first_name,last_name), professionals(full_name), appointment_types(name), rooms(name)').order('start_at',{ascending:true}).limit(300),
    sb.from('clinical_entries').select('*, patients(first_name,last_name), professionals(full_name)').is('deleted_at', null).order('created_at',{ascending:false}).limit(300),
    sb.from('clinical_templates').select('*').order('name'),
    sb.from('patient_documents').select('*, patients(first_name,last_name), document_types(name)').order('created_at',{ascending:false}).limit(300),
    sb.from('document_types').select('*').order('name'),
    sb.from('financial_movements').select('*, patients(first_name,last_name)').order('movement_date',{ascending:false}).limit(300),
    sb.from('user_profiles').select('*').order('created_at',{ascending:false}).limit(300),
    sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(200),
    sb.from('organizations').select('*').limit(10)
  ]);
  ['patients','professionals','programs','appointmentTypes','rooms','appointments','clinicalEntries','templates','documents','documentTypes','finance','profiles','audit','orgs'].forEach((key,i)=>{ if(!queries[i].error) state[key]=queries[i].data||[]; });
}

function renderTab(){
  if(activeTab==='dashboard') return dashboard();
  if(activeTab==='patients') return patientsTab();
  if(activeTab==='professionals') return professionalsTab();
  if(activeTab==='appointments') return appointmentsTab();
  if(activeTab==='clinical') return clinicalTab();
  if(activeTab==='documents') return documentsTab();
  if(activeTab==='programs') return programsTab();
  if(activeTab==='access') return accessTab();
  if(activeTab==='finance') return financeTab();
  if(activeTab==='audit') return auditTab();
  return '';
}

function dashboard(){
  const active = state.patients.filter(p=>['preingreso','evaluacion','admitido','en_tratamiento','seguimiento'].includes(p.admission_status)).length;
  const next = state.appointments.filter(a=>new Date(a.start_at)>new Date()).length;
  const docs = state.documents.filter(d=>d.status!=='validado').length;
  const demo = state.patients.filter(p=>p.is_demo).length;
  return `<div class="grid kpis"><div class="kpi"><span>Pacientes activos</span><strong>${active}</strong></div><div class="kpi"><span>Turnos próximos</span><strong>${next}</strong></div><div class="kpi"><span>Documentos pendientes</span><strong>${docs}</strong></div><div class="kpi"><span>Pacientes de prueba</span><strong>${demo}</strong></div></div><div class="grid two" style="margin-top:16px"><section class="panel"><h2>Agenda próxima</h2>${table(['Fecha','Paciente','Profesional','Estado'], state.appointments.slice(0,8).map(a=>[fmt(a.start_at), patientName(a.patients), a.professionals?.full_name||'-', tag(a.status)]))}</section><section class="panel"><h2>Pacientes recientes</h2>${table(['Paciente','DNI','Estado','Riesgo'], state.patients.slice(0,8).map(p=>[fullName(p), p.document_number||'-', statusLabel[p.admission_status]||p.admission_status, riskTag(p.risk_level)]))}</section></div><section class="panel" style="margin-top:16px"><h2>Acciones rápidas</h2><div class="top-actions"><button class="btn primary" data-tab-jump="patients">Nuevo paciente</button><button class="btn primary" data-tab-jump="professionals">Nuevo profesional</button><button class="btn secondary" data-tab-jump="appointments">Agendar turno</button><button class="btn secondary" data-tab-jump="access">Crear acceso</button></div></section>`;
}

function patientsTab(){
  return `<div class="grid two"><section class="panel"><h2>Alta de paciente</h2><form id="patientForm" class="form two-cols">${field('first_name','Nombre','text',true)}${field('last_name','Apellido','text',true)}${field('document_number','DNI','text',false)}${field('birth_date','Fecha de nacimiento','date',false)}${field('phone','Teléfono','text',false)}${field('email','Email','email',false)}<label class="field">Estado<select name="admission_status"><option value="preingreso">Preingreso</option><option value="evaluacion">Evaluación</option><option value="admitido">Admitido</option><option value="en_tratamiento">En tratamiento</option><option value="seguimiento">Seguimiento</option></select></label><label class="field">Riesgo<select name="risk_level"><option value="bajo">Bajo</option><option value="medio">Medio</option><option value="alto">Alto</option></select></label>${field('emergency_contact_name','Familiar / referente','text',false)}${field('emergency_contact_phone','Teléfono referente','text',false)}<label class="field full">Programa inicial<select name="program_id"><option value="">Sin asignar</option>${state.programs.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select></label><label class="field full">Profesional responsable<select name="responsible_professional_id"><option value="">Sin asignar</option>${state.professionals.map(p=>`<option value="${p.id}">${escapeHtml(p.full_name)} · ${escapeHtml(p.role_title)}</option>`).join('')}</select></label><label class="field inline full"><input type="checkbox" name="create_access"> Crear acceso al portal ahora</label>${field('access_email','Email de acceso','email',false)}${field('access_password','Contraseña inicial','password',false)}<button class="btn primary full" type="submit">Guardar paciente</button></form></section><section class="panel"><h2>Pacientes</h2>${table(['Paciente','DNI','Teléfono','Estado','Riesgo','Acción'], state.patients.map(p=>[fullName(p), p.document_number||'-', p.phone||'-', statusLabel[p.admission_status]||p.admission_status, riskTag(p.risk_level), `<button class="btn small secondary" data-create-access="patient" data-id="${p.id}" data-name="${escapeHtml(fullName(p))}" data-email="${escapeHtml(p.email||'')}">Acceso</button>`]))}</section></div>`;
}

function professionalsTab(){
  return `<div class="grid two"><section class="panel"><h2>Alta de profesional</h2><form id="professionalForm" class="form two-cols">${field('full_name','Nombre completo','text',true)}${field('role_title','Cargo','text',true)}${field('specialty','Especialidad','text',false)}${field('license_number','Matrícula','text',false)}${field('email','Email','email',false)}${field('phone','Teléfono','text',false)}<label class="field full">Descripción<textarea name="bio" rows="3"></textarea></label><label class="field inline full"><input type="checkbox" name="create_access"> Crear acceso al sistema ahora</label><label class="field">Rol de acceso<select name="role_code">${roleOptions.filter(r=>!['patient','family'].includes(r[0])).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>${field('access_password','Contraseña inicial','password',false)}<button class="btn primary full" type="submit">Guardar profesional</button></form></section><section class="panel"><h2>Profesionales</h2>${table(['Nombre','Cargo','Especialidad','Email','Acción'], state.professionals.map(p=>[p.full_name, p.role_title, p.specialty||'-', p.email||'-', `<button class="btn small secondary" data-create-access="professional" data-id="${p.id}" data-name="${escapeHtml(p.full_name)}" data-email="${escapeHtml(p.email||'')}">Acceso</button>`]))}</section></div>`;
}

function appointmentsTab(){
  return `<div class="grid two"><section class="panel"><h2>Nuevo turno</h2><form id="appointmentForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id" required>${opts(state.patients, fullName)}</select></label><label class="field full">Profesional<select name="professional_id" required>${opts(state.professionals, p=>`${p.full_name} · ${p.role_title}`)}</select></label><label class="field">Tipo<select name="appointment_type_id" required>${opts(state.appointmentTypes, t=>t.name)}</select></label><label class="field">Programa<select name="program_id"><option value="">Sin programa</option>${opts(state.programs, p=>p.name)}</select></label><label class="field">Sala<select name="room_id"><option value="">Sin sala</option>${opts(state.rooms, r=>r.name)}</select></label><label class="field">Modalidad<select name="modality"><option value="presencial">Presencial</option><option value="online">Online</option></select></label>${field('start_at','Inicio','datetime-local',true)}${field('end_at','Fin','datetime-local',true)}<label class="field full">Motivo<input name="reason"></label><button class="btn primary full" type="submit">Agendar turno</button></form></section><section class="panel"><h2>Agenda</h2>${table(['Fecha','Paciente','Profesional','Tipo','Estado'], state.appointments.map(a=>[fmt(a.start_at), patientName(a.patients), a.professionals?.full_name||'-', a.appointment_types?.name||'-', tag(a.status)]))}</section></div>`;
}

function clinicalTab(){
  return `<div class="grid two"><section class="panel"><h2>Registro clínico</h2><form id="clinicalForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id" required>${opts(state.patients, fullName)}</select></label><label class="field full">Profesional<select name="professional_id">${opts(state.professionals, p=>`${p.full_name} · ${p.role_title}`, true)}</select></label><label class="field">Tipo<select name="entry_type">${state.templates.map(t=>`<option value="${escapeHtml(t.entry_type)}">${escapeHtml(t.name)}</option>`).join('')}<option value="nota">Nota</option></select></label><label class="field">Estado<select name="status"><option value="draft">Borrador</option><option value="signed">Firmado / cerrado</option></select></label>${field('title','Título','text',true)}<label class="field full">Contenido<textarea name="body" rows="9" required></textarea></label><button class="btn primary full" type="submit">Guardar registro</button></form></section><section class="panel"><h2>Historia clínica</h2>${table(['Fecha','Paciente','Tipo','Título','Estado'], state.clinicalEntries.map(e=>[fmt(e.created_at), patientName(e.patients), e.entry_type, e.title, tag(e.status)]))}</section></div>`;
}

function documentsTab(){
  return `<div class="grid two"><section class="panel"><h2>Cargar documento</h2><form id="documentForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id" required>${opts(state.patients, fullName)}</select></label><label class="field full">Tipo<select name="document_type_id">${opts(state.documentTypes, d=>d.name, true)}</select></label>${field('title','Título','text',true)}<label class="field">Visibilidad<select name="visibility"><option value="private_administrative">Privado administrativo</option><option value="private_clinical">Privado clínico</option><option value="internal_direction">Solo dirección</option></select></label><label class="field full">Archivo<input type="file" name="file"></label><button class="btn primary full" type="submit">Guardar documento</button></form></section><section class="panel"><h2>Documentos</h2>${table(['Paciente','Documento','Tipo','Estado','Archivo','Portal'], state.documents.map(d=>[patientName(d.patients), d.title, d.document_types?.name||'-', d.status, d.file_path?'Cargado':'Pendiente', `<button class="btn small secondary" data-release-doc="${d.id}" data-patient="${d.patient_id}">Liberar</button>`]))}</section></div>`;
}

function programsTab(){
  return `<div class="grid two"><section class="panel"><h2>Nuevo programa</h2><form id="programForm" class="form">${field('name','Nombre','text',true)}<label class="field">Duración estimada, semanas<input name="duration_weeks" type="number" min="1"></label><label class="field">Descripción<textarea name="description" rows="5"></textarea></label><button class="btn primary" type="submit">Guardar programa</button></form></section><section class="panel"><h2>Programas</h2>${table(['Programa','Duración','Estado','Descripción'], state.programs.map(p=>[p.name, p.duration_weeks?`${p.duration_weeks} semanas`:'-', p.active?'Activo':'Inactivo', p.description||'-']))}</section></div>`;
}

function accessTab(){
  return `<div class="grid two"><section class="panel"><h2>Crear credencial</h2><form id="accessForm" class="form two-cols"><label class="field">Tipo<select name="kind" id="accessKind"><option value="patient">Paciente</option><option value="family">Familiar autorizado</option><option value="professional">Profesional</option></select></label><label class="field">Rol<select name="role_code" id="accessRole">${roleOptions.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label class="field full">Vincular con<select name="linked_id" id="linkedSelect"></select></label>${field('full_name','Nombre visible','text',true)}${field('email','Email','email',true)}${field('password','Contraseña inicial','password',true)}<button class="btn primary full" type="submit">Crear acceso</button></form></section><section class="panel"><h2>Usuarios</h2>${table(['Nombre','Email','Rol','Estado'], state.profiles.map(u=>[u.full_name, u.email, roleName(u.role_code), u.active?tag('activo','green'):tag('inactivo','red')]))}</section></div>`;
}

function financeTab(){
  return `<div class="grid two"><section class="panel"><h2>Movimiento financiero</h2><form id="financeForm" class="form two-cols"><label class="field">Tipo<select name="movement_type"><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></label>${field('category','Categoría','text',true)}<label class="field full">Paciente opcional<select name="patient_id"><option value="">Sin paciente</option>${opts(state.patients, fullName)}</select></label>${field('amount','Monto','number',true)}<label class="field">Moneda<select name="currency"><option value="ARS">ARS</option><option value="USD">USD</option></select></label><label class="field">Método<input name="method" value="transferencia"></label><label class="field full">Descripción<input name="description" required></label><button class="btn primary full" type="submit">Registrar movimiento</button></form></section><section class="panel"><h2>Movimientos</h2>${table(['Fecha','Tipo','Categoría','Descripción','Monto'], state.finance.map(f=>[f.movement_date, f.movement_type, f.category, f.description, money(f.amount,f.currency)]))}</section></div>`;
}

function auditTab(){ return `<section class="panel"><h2>Auditoría</h2>${table(['Fecha','Acción','Entidad','Rol','Riesgo'], state.audit.map(a=>[fmt(a.created_at), a.action, a.entity_table||'-', a.actor_role||'-', tag(a.risk_level)]))}</section>`; }

function bindTab(){
  document.querySelectorAll('[data-tab-jump]').forEach(b=>b.addEventListener('click',()=>{ activeTab=b.dataset.tabJump; render(); }));
  document.querySelectorAll('[data-create-access]').forEach(b=>b.addEventListener('click',()=>{ activeTab='access'; render(); setTimeout(()=>prefillAccess(b.dataset.createAccess,b.dataset.id,b.dataset.name,b.dataset.email),0); }));
  bindPatientForm(); bindProfessionalForm(); bindAppointmentForm(); bindClinicalForm(); bindDocumentForm(); bindReleaseDocument(); bindProgramForm(); bindAccessForm(); bindFinanceForm();
}

function bindPatientForm(){ document.getElementById('patientForm')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const payload=pick(fd,['first_name','last_name','document_number','birth_date','phone','email','admission_status','risk_level','emergency_contact_name','emergency_contact_phone']); payload.admission_date = new Date().toISOString().slice(0,10); const { data, error } = await sb.from('patients').insert(payload).select().single(); if(error) return msg(error.message,'error'); const programId=fd.get('program_id'); if(programId) await sb.from('patient_programs').insert({ patient_id:data.id, program_id:programId, responsible_professional_id:fd.get('responsible_professional_id')||null, current_stage:'Primer contacto', goals:'Acompañamiento inicial.' }); if(fd.get('create_access')){ const email=String(fd.get('access_email')||payload.email||''); const password=String(fd.get('access_password')||''); if(email && password) await createUser({ email, password, full_name:`${payload.first_name} ${payload.last_name}`, role_code:'patient', patient_id:data.id }); } await loadAll(); render(); msg('Paciente guardado.'); }); }
function bindProfessionalForm(){ document.getElementById('professionalForm')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const payload=pick(fd,['full_name','role_title','specialty','license_number','email','phone','bio']); payload.active=true; const { data, error } = await sb.from('professionals').insert(payload).select().single(); if(error) return msg(error.message,'error'); if(fd.get('create_access')){ const password=String(fd.get('access_password')||''); if(payload.email && password) await createUser({ email:payload.email, password, full_name:payload.full_name, role_code:String(fd.get('role_code')), professional_id:data.id }); } await loadAll(); render(); msg('Profesional guardado.'); }); }
function bindAppointmentForm(){ document.getElementById('appointmentForm')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const payload=pick(fd,['patient_id','professional_id','program_id','appointment_type_id','room_id','modality','start_at','end_at','reason']); payload.status='confirmado'; Object.keys(payload).forEach(k=>{ if(payload[k]==='') payload[k]=null; }); const { error } = await sb.from('appointments').insert(payload); if(error) return msg(error.message,'error'); await loadAll(); render(); msg('Turno agendado.'); }); }
function bindClinicalForm(){ document.getElementById('clinicalForm')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const payload=pick(fd,['patient_id','professional_id','entry_type','title','body','status']); if(payload.status==='signed') payload.signed_at=new Date().toISOString(); Object.keys(payload).forEach(k=>{ if(payload[k]==='') payload[k]=null; }); const { error } = await sb.from('clinical_entries').insert(payload); if(error) return msg(error.message,'error'); await loadAll(); render(); msg('Registro guardado.'); }); }
function bindDocumentForm(){ document.getElementById('documentForm')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const file=fd.get('file'); let filePath=null; if(file && file.name){ filePath=`${fd.get('patient_id')}/${Date.now()}-${file.name}`; const up=await sb.storage.from('clinical-documents').upload(filePath,file); if(up.error) return msg(up.error.message,'error'); } const payload={ patient_id:fd.get('patient_id'), document_type_id:fd.get('document_type_id')||null, title:fd.get('title'), visibility:fd.get('visibility'), file_path:filePath, mime_type:file?.type||null, size_bytes:file?.size||null }; const { error } = await sb.from('patient_documents').insert(payload); if(error) return msg(error.message,'error'); await loadAll(); render(); msg('Documento guardado.'); }); }

function bindReleaseDocument(){ document.querySelectorAll('[data-release-doc]').forEach(btn=>btn.addEventListener('click', async()=>{ const { error } = await sb.from('portal_document_releases').insert({ document_id:btn.dataset.releaseDoc, patient_id:btn.dataset.patient, released_to:'patient', active:true }); if(error) return msg(error.message,'error'); await loadAll(); render(); msg('Documento liberado al portal.'); })); }

function bindProgramForm(){ document.getElementById('programForm')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const name=String(fd.get('name')); const payload={ name, slug:slugify(name), duration_weeks:Number(fd.get('duration_weeks')||0)||null, description:fd.get('description'), active:true }; const { error } = await sb.from('programs').insert(payload); if(error) return msg(error.message,'error'); await loadAll(); render(); msg('Programa guardado.'); }); }
function bindAccessForm(){ const form=document.getElementById('accessForm'); if(!form) return; const kind=document.getElementById('accessKind'); kind?.addEventListener('change',()=>refreshLinkedSelect()); refreshLinkedSelect(); form.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const kind=String(fd.get('kind')); const linked=String(fd.get('linked_id')); const body={ email:String(fd.get('email')), password:String(fd.get('password')), full_name:String(fd.get('full_name')), role_code:String(fd.get('role_code')) }; if(kind==='professional') body.professional_id=linked; else body.patient_id=linked; const res=await createUser(body); if(res){ await loadAll(); render(); msg('Acceso creado.'); } }); }
function bindFinanceForm(){ document.getElementById('financeForm')?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); const payload=pick(fd,['movement_type','category','description','amount','currency','method','patient_id']); payload.amount=Number(payload.amount); payload.patient_id=payload.patient_id||null; payload.status='registrado'; const { error } = await sb.from('financial_movements').insert(payload); if(error) return msg(error.message,'error'); await loadAll(); render(); msg('Movimiento registrado.'); }); }

async function createUser(body){ const token=session.access_token; const res=await fetch('/api/create-user',{ method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify(body)}); const data=await res.json(); if(!res.ok){ msg(data.error||'No se pudo crear el acceso.','error'); return null; } return data; }
function pick(fd,keys){ const o={}; keys.forEach(k=>o[k]=fd.get(k)||null); return o; }
function opts(arr,label,allowEmpty=false){ return `${allowEmpty?'<option value="">Sin asignar</option>':''}${arr.map(x=>`<option value="${x.id}">${escapeHtml(label(x))}</option>`).join('')}`; }
function field(name,label,type='text',required=false){ return `<label class="field">${label}<input name="${name}" type="${type}" ${required?'required':''}></label>`; }
function fullName(p){ return `${p.first_name||''} ${p.last_name||''}`.trim(); }
function patientName(p){ return p ? `${p.first_name||''} ${p.last_name||''}`.trim() : '-'; }
function tag(text,color=''){ return `<span class="tag ${color}">${escapeHtml(text||'-')}</span>`; }
function riskTag(r){ return tag(r, r==='alto'?'red':r==='bajo'?'green':''); }
function table(headers, rows){ if(!rows.length) return `<div class="empty">Sin registros</div>`; return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${String(c??'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function slugify(s){ return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function refreshLinkedSelect(){ const kind=document.getElementById('accessKind')?.value || 'patient'; const role=document.getElementById('accessRole'); const linked=document.getElementById('linkedSelect'); if(!linked) return; if(kind==='professional'){ linked.innerHTML=opts(state.professionals, p=>`${p.full_name} · ${p.role_title}`); if(role) role.value='professional'; } else { linked.innerHTML=opts(state.patients, fullName); if(role) role.value=kind==='family'?'family':'patient'; } }
function prefillAccess(kind,id,name,email){ const kindEl=document.getElementById('accessKind'); const linked=document.getElementById('linkedSelect'); if(kindEl){ kindEl.value=kind; refreshLinkedSelect(); } if(linked) linked.value=id; const form=document.getElementById('accessForm'); if(form){ form.full_name.value=name||''; form.email.value=email||''; form.role_code.value=kind==='professional'?'professional':'patient'; } }
