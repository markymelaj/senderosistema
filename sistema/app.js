const app = document.getElementById('app');
let sb; let session; let profile; let config = {}; let activeTab = 'dashboard';
let state = emptyState();

const roles = [
  ['direction','Dirección'], ['clinical_coordination','Coordinación clínica'],
  ['medical','Médico/a'], ['psychologist','Psicología'], ['social_worker','Trabajo social'],
  ['therapeutic_operator','Operador/a terapéutico'], ['professional','Profesional clínico'],
  ['admission','Admisión'], ['finance','Finanzas'], ['communications','Comunicaciones'],
  ['auditor','Auditoría'], ['patient','Paciente'], ['family','Familiar autorizado']
];
const tabs = [
  ['dashboard','Inicio'], ['patients','Pacientes'], ['professionals','Profesionales'],
  ['schedule','Agenda'], ['clinical','Historia clínica'], ['documents','Documentos'],
  ['programs','Programas'], ['access','Accesos'], ['finance','Pagos'],
  ['communications','Comunicados'], ['audit','Auditoría']
];

function emptyState() {
  return {
    patients:[], contacts:[], professionals:[], programs:[], appointmentTypes:[], rooms:[],
    appointments:[], availability:[], blocks:[], clinical:[], documents:[], documentTypes:[],
    requirements:[], submissions:[], profiles:[], charges:[], payments:[], audit:[]
  };
}
function esc(value='') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char])); }
function name(person) { return person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : '-'; }
function roleName(code) { return (roles.find(row => row[0] === code) || [code])[1]; }
function tag(value, kind='') { return `<span class="tag ${kind}">${esc(value || '-')}</span>`; }
function dateTime(value) { return value ? new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : '-'; }
function money(value,currency='ARS') { return `${currency} ${Number(value || 0).toLocaleString('es-AR')}`; }
function table(headers, rows) {
  if (!rows.length) return '<div class="empty">Sin registros</div>';
  return `<div class="table-wrap"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function selectOptions(items, label, includeBlank=false) {
  return `${includeBlank ? '<option value="">Sin asignar</option>' : ''}${items.map(item => `<option value="${item.id}">${esc(label(item))}</option>`).join('')}`;
}
function field(key,label,type='text',required=false) {
  return `<label class="field">${label}<input name="${key}" type="${type}" ${required ? 'required' : ''}></label>`;
}
function pick(form, keys) {
  const values = {}; const data = new FormData(form);
  keys.forEach(key => { values[key] = data.get(key) || null; });
  return values;
}
function isAdmin() { return ['super_admin','direction','clinical_coordination'].includes(profile?.role_code); }
function canFinance() { return ['super_admin','direction','finance'].includes(profile?.role_code); }
function canCommunicate() { return ['super_admin','direction','clinical_coordination','admission','communications'].includes(profile?.role_code); }
function canManageDocuments() { return ['super_admin','direction','clinical_coordination','admission','professional','medical','psychologist','social_worker','therapeutic_operator'].includes(profile?.role_code); }
function isAdminRole() { return ['super_admin','direction'].includes(profile?.role_code); }

// ---------------------------------------------------------------
// Iconografía de navegación (SVG en línea, sin dependencias)
// ---------------------------------------------------------------
const ICONS = {
  dashboard:'<path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/>',
  patients:'<path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.3-8 4v3h8m8-7c-.6 0-1.3 0-2 .1 1.6.9 2 2 2 2.9V20h8v-3c0-2.7-5.3-4-8-4Z"/>',
  professionals:'<path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Zm-1 13-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6Z"/>',
  schedule:'<path d="M7 2v3M17 2v3M3 8h18M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 8h4v4H7Z"/>',
  clinical:'<path d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1Zm2 8v2H9v2h2v2h2v-2h2v-2h-2v-2h-2Z"/>',
  documents:'<path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5M8 13h8v2H8Zm0 4h8v2H8Z"/>',
  programs:'<path d="M4 4h16v4H4V4Zm0 6h16v4H4v-4Zm0 6h10v4H4v-4Z"/>',
  access:'<path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Zm3 4a2 2 0 0 1 1 3.7V20h-2v-2.3A2 2 0 0 1 12 14Z"/>',
  finance:'<path d="M12 2C6.5 2 2 4 2 6.5v11C2 20 6.5 22 12 22s10-2 10-4.5v-11C22 4 17.5 2 12 2Zm0 2c4.7 0 8 1.6 8 2.5S16.7 11 12 11 4 9.4 4 6.5 7.3 4 12 4Zm0 16c-4.7 0-8-1.6-8-2.5v-2.2C5.8 14.4 8.7 15 12 15s6.2-.6 8-1.7v2.2c0 .9-3.3 2.5-8 2.5Z"/>',
  communications:'<path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 5h10v2H7Zm0 4h7v2H7Z"/>',
  audit:'<path d="M11 2a7 7 0 1 0 4.2 12.6l5.1 5.1 1.4-1.4-5.1-5.1A7 7 0 0 0 11 2Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-1 2v4l3 2 .8-1.3-2.3-1.4V6Z"/>'
};
function navIcon(id){ return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[id]||''}</svg>`; }

// ---------------------------------------------------------------
// Guía in-app por rol. Cada perfil recibe pasos concretos según lo
// que realmente puede hacer en el sistema.
// ---------------------------------------------------------------
const GUIDES = {
  direction:{ title:'Guía para Dirección',
    intro:'Tenés la vista completa: personas acompañadas, equipo, agenda, historia clínica, documentos, pagos, comunicados y auditoría.',
    steps:[
      ['Mirá el tablero','En Inicio ves de un vistazo personas activas, próximos turnos, documentación pendiente y cargos abiertos.'],
      ['Dá de alta a una persona','En Pacientes cargás la ficha, asignás programa y profesional responsable, y podés registrar al familiar referente.'],
      ['Sumá al equipo','En Profesionales cargás cada integrante. Desde Accesos le creás su cuenta con el rol clínico o administrativo que corresponda.'],
      ['Controlá la operación','Agenda, Documentos y Pagos muestran el día a día. Auditoría deja la trazabilidad de todo lo que ocurre.'],
      ['Restaurá la demo','Con “Restaurar demo” volvés todo al estado de ejemplo, ideal antes de una presentación.']
    ]},
  clinical_coordination:{ title:'Guía para Coordinación clínica',
    intro:'Coordinás pacientes, equipo, tratamientos, agenda e historia clínica.',
    steps:[
      ['Revisá el tablero','En Inicio seguís turnos próximos y pendientes de documentación.'],
      ['Ordená los programas','En Programas definís y ajustás los dispositivos terapéuticos y sus etapas.'],
      ['Asigná responsables','Desde Pacientes vinculás cada persona con su programa y profesional tratante.'],
      ['Seguí la clínica','En Historia clínica registrás y consultás evoluciones; los registros firmados quedan protegidos.']
    ]},
  clinical:{ title:'Guía para el equipo clínico',
    intro:'Trabajás con las personas que tenés asignadas: su agenda, sus documentos y su historia clínica.',
    steps:[
      ['Mirá tu agenda','En Agenda ves tus turnos y marcás asistencia, ausencia o reprogramación.'],
      ['Registrá la evolución','En Historia clínica creás un borrador y, cuando esté listo, lo firmás. Una vez firmado no se edita: se rectifica.'],
      ['Gestioná documentos','En Documentos cargás informes y podés liberar al portal lo que corresponda.'],
      ['Cuidá la confidencialidad','Solo ves a las personas de las que sos responsable o con quienes tenés turnos.']
    ]},
  admission:{ title:'Guía para Admisión y recepción',
    intro:'Sos la puerta de entrada: alta de personas, turnos y documentación.',
    steps:[
      ['Registrá el ingreso','En Pacientes completás la ficha y sumás al familiar referente.'],
      ['Agendá el primer turno','En Agenda elegís profesional, tipo y horario; el sistema evita superposiciones.'],
      ['Solicitá documentación','En Documentos pedís lo que la persona debe subir por el portal y revisás lo recibido.']
    ]},
  finance:{ title:'Guía para Administración',
    intro:'Gestionás cargos, pagos, becas y convenios de forma manual y trazable.',
    steps:[
      ['Creá un cargo','En Pagos registrás un aporte, convenio o donación, con o sin persona asociada.'],
      ['Registrá el pago','Cargás pagos parciales o totales; el saldo y el estado se concilian solos.'],
      ['Seguí los saldos','La tabla de cargos muestra montos, pagado y estado. Los pagos no se borran: se revierten.']
    ]},
  communications:{ title:'Guía para Comunicaciones',
    intro:'Emitís comunicados institucionales a profesionales, personas o familias.',
    steps:[
      ['Elegí la audiencia','Profesionales, pacientes, familias autorizadas o la red de una persona.'],
      ['Redactá sin datos clínicos','Los comunicados no incluyen información clínica sensible.'],
      ['Enviá y hacé seguimiento','El envío en el portal es inmediato; el correo queda en cola hasta configurar el proveedor.']
    ]},
  auditor:{ title:'Guía para Auditoría',
    intro:'Controlás la operación y la trazabilidad sin acceder a la historia clínica ni a documentos clínicos.',
    steps:[
      ['Revisá el tablero','Ves indicadores de operación de solo lectura.'],
      ['Consultá pacientes y agenda','Accedés a la información operativa: personas, profesionales, turnos y programas.'],
      ['Auditá la actividad','En Auditoría revisás cada acción registrada, con su rol y nivel de riesgo.']
    ]}
};
function guideFor(role){
  if (GUIDES[role]) return GUIDES[role];
  if (['professional','medical','psychologist','social_worker','therapeutic_operator'].includes(role)) return GUIDES.clinical;
  return GUIDES.direction;
}

function helpPanelHtml(){
  const g = guideFor(profile?.role_code);
  const steps = g.steps.map((s,i)=>`<div class="help-step"><span class="n">${i+1}</span><h4>${esc(s[0])}</h4><p>${esc(s[1])}</p></div>`).join('');
  const reset = isAdminRole() && config.demoEnabled ? `<button class="btn danger full" data-demo-reset>Restaurar la demostración</button>` : '';
  return `<div class="help-overlay" data-help-overlay></div><aside class="help-panel" id="helpPanel" aria-label="Guía de uso">
    <div class="help-head"><div><p class="eyebrow">Guía de uso</p><h2>${esc(g.title)}</h2></div><button class="help-close" data-help-close aria-label="Cerrar">&times;</button></div>
    <div class="help-body"><p class="help-intro">${esc(g.intro)}</p>${steps}</div>
    <div class="help-foot"><a class="btn secondary full" href="/assets/guia-senderos.pdf" target="_blank" rel="noopener">Descargar mini guía (PDF)</a>${reset}<p class="help-cred">Sistema de la Fundación Senderos de Libertad</p></div>
  </aside>`;
}
function welcomeModalHtml(){
  const g = guideFor(profile?.role_code);
  const bullets = g.steps.slice(0,3).map(s=>`<li>${esc(s[0])}</li>`).join('');
  return `<div class="modal-overlay" id="welcomeModal"><div class="modal">
    <div class="modal-top"><p class="eyebrow">Te damos la bienvenida</p><h2>${esc(g.title)}</h2></div>
    <div class="modal-body"><p>${esc(g.intro)}</p><ul class="modal-list">${bullets}</ul>
    <p class="muted">Podés reabrir esta guía cuando quieras desde el botón <strong>Guía</strong>.</p></div>
    <div class="modal-foot"><span class="grow">Rol actual: ${esc(roleName(profile.role_code))}</span>
    <button class="btn secondary" data-welcome-close>Explorar por mi cuenta</button>
    <button class="btn primary" data-welcome-guide>Ver la guía paso a paso</button></div>
  </div></div>`;
}
function welcomeKey(){ return `senderos_welcome_${profile?.role_code||'x'}`; }
function maybeShowWelcome(){
  try { if (localStorage.getItem(welcomeKey())) return; } catch(e){}
  const host = document.getElementById('modalHost'); if (!host) return;
  host.innerHTML = welcomeModalHtml();
  const overlay = document.getElementById('welcomeModal');
  requestAnimationFrame(()=>overlay.classList.add('open'));
  const dismiss = ()=>{ try{ localStorage.setItem(welcomeKey(),'1'); }catch(e){} overlay.classList.remove('open'); setTimeout(()=>host.innerHTML='',200); };
  overlay.querySelector('[data-welcome-close]').addEventListener('click',dismiss);
  overlay.addEventListener('click',e=>{ if(e.target===overlay) dismiss(); });
  overlay.querySelector('[data-welcome-guide]').addEventListener('click',()=>{ dismiss(); openHelp(); });
}
function openHelp(){ const p=document.getElementById('helpPanel'); const o=document.querySelector('[data-help-overlay]'); p?.classList.add('open'); o?.classList.add('open'); }
function closeHelp(){ const p=document.getElementById('helpPanel'); const o=document.querySelector('[data-help-overlay]'); p?.classList.remove('open'); o?.classList.remove('open'); }
async function resetDemo(){
  if (!confirm('Esto vuelve la demostración al estado de ejemplo y elimina todo lo que se haya cargado durante la prueba. ¿Continuar?')) return;
  notice('Restaurando la demostración…');
  const response = await api('/api/reset-demo', {});
  if (!response.ok) return notice(response.error||'No se pudo restaurar.','error');
  await load(); render(); notice('Demostración restaurada al estado de ejemplo.');
}

init();
async function init() {
  try {
    const response = await fetch('/api/public-config');
    config = await response.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('Faltan variables públicas de Supabase.');
    sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth:{persistSession:true,autoRefreshToken:true} });
    const { data } = await sb.auth.getSession(); session = data.session;
    sb.auth.onAuthStateChange(async (_event, nextSession) => {
      session = nextSession;
      if (session) await load();
      else { profile = null; state = emptyState(); }
      render();
    });
    if (session) await load();
    render();
  } catch (error) {
    app.innerHTML = `<main class="login-wrap"><section class="login-card"><h1>Sistema no configurado</h1><p>${esc(error.message)}</p></section></main>`;
  }
}

async function loadTable(query) {
  const result = await query;
  return result.error ? [] : (result.data || []);
}
async function load() {
  const result = await sb.from('user_profiles').select('*').eq('id',session.user.id).maybeSingle();
  profile = result.data || null;
  if (!profile || profile.account_kind !== 'internal') return;
  const queries = await Promise.all([
    loadTable(sb.from('patients').select('*').is('deleted_at',null).order('last_name').limit(500)),
    loadTable(sb.from('patient_contacts').select('*').order('full_name').limit(500)),
    loadTable(sb.from('professionals').select('*').eq('active',true).order('full_name')),
    loadTable(sb.from('programs').select('*').eq('active',true).order('name')),
    loadTable(sb.from('appointment_types').select('*').eq('active',true).order('name')),
    loadTable(sb.from('rooms').select('*').eq('active',true).order('name')),
    loadTable(sb.from('appointments').select('*, patients(first_name,last_name), professionals(full_name), appointment_types(name), rooms(name)').order('start_at').limit(500)),
    loadTable(sb.from('professional_availability_rules').select('*, professionals(full_name), rooms(name)').eq('active',true).order('weekday')),
    loadTable(sb.from('calendar_blocks').select('*, professionals(full_name), rooms(name)').eq('active',true).order('start_at').limit(300)),
    loadTable(sb.from('clinical_entries').select('*, patients(first_name,last_name), professionals(full_name)').is('deleted_at',null).order('created_at',{ascending:false}).limit(300)),
    loadTable(sb.from('patient_documents').select('*, patients(first_name,last_name), document_types(name)').order('created_at',{ascending:false}).limit(300)),
    loadTable(sb.from('document_types').select('*').eq('active',true).order('name')),
    loadTable(sb.from('document_requirements').select('*, patients(first_name,last_name), document_types(name)').order('created_at',{ascending:false}).limit(300)),
    loadTable(sb.from('portal_document_submissions').select('*, document_requirements(title), patients(first_name,last_name)').order('created_at',{ascending:false}).limit(300)),
    loadTable(sb.from('user_profiles').select('*').order('created_at',{ascending:false}).limit(500)),
    loadTable(sb.from('financial_charges').select('*, patients(first_name,last_name)').order('created_at',{ascending:false}).limit(300)),
    loadTable(sb.from('financial_payments').select('*, financial_charges(description), patients(first_name,last_name)').order('paid_at',{ascending:false}).limit(300)),
    loadTable(sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(300))
  ]);
  [state.patients,state.contacts,state.professionals,state.programs,state.appointmentTypes,state.rooms,
    state.appointments,state.availability,state.blocks,state.clinical,state.documents,state.documentTypes,
    state.requirements,state.submissions,state.profiles,state.charges,state.payments,state.audit] = queries;
}

function allowedTabs() {
  const role = profile?.role_code;
  const blocked = {
    auditor:['clinical','documents','finance','access','communications'],
    finance:['clinical','documents','programs','access','communications','professionals'],
    admission:['clinical','finance','audit'],
    communications:['clinical','documents','finance','access','audit','programs'],
    professional:['access','finance','audit','communications'],
    medical:['access','finance','audit','communications'],
    psychologist:['access','finance','audit','communications'],
    social_worker:['access','finance','audit','communications'],
    therapeutic_operator:['access','finance','audit','communications']
  };
  const hidden = blocked[role] || [];
  const list = tabs.filter(tab => !hidden.includes(tab[0]));
  if (!list.some(tab => tab[0] === activeTab)) activeTab = list[0]?.[0] || 'dashboard';
  return list;
}

function render() {
  if (!session) { app.innerHTML = login(); bindLogin(); return; }
  if (!profile) {
    app.innerHTML = `<main class="login-wrap"><section class="login-card"><h1>Acceso pendiente</h1><p>Esta cuenta no tiene un perfil interno activo. Solicite una invitación al administrador.</p><button class="btn secondary" data-logout>Salir</button></section></main>`;
    document.querySelector('[data-logout]')?.addEventListener('click',() => sb.auth.signOut());
    return;
  }
  if (profile.account_kind !== 'internal') { window.location.href = '/portal/'; return; }
  app.innerHTML = shell(tabContent());
  bindBase(); bindTab(); maybeShowWelcome();
}

function login() {
  const demo = config.demoEnabled ? `<div class="demo-box"><button class="btn secondary full" type="button" data-demo-setup>Preparar demo local</button><p>Disponible solo en un entorno de demostración.</p></div>` : '';
  return `<main class="login-wrap"><section class="login-card"><img src="../assets/logo-senderos.png" alt=""><h1>Sistema interno</h1><p>Acceso seguro para equipos clínicos, administrativos y de dirección.</p><form id="loginForm" class="form"><label class="field">Email<input name="email" type="email" required autocomplete="email"></label><label class="field">Contraseña<input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary">Ingresar</button></form>${demo}<a class="back-link" href="/">Volver a la web</a></section></main>`;
}
function shell(content) {
  const reset = isAdminRole() && config.demoEnabled ? `<button class="btn danger" data-demo-reset>Restaurar demo</button>` : '';
  const nav = allowedTabs().map(([id,label]) => `<button data-tab="${id}" class="${activeTab===id?'active':''}">${navIcon(id)}<span>${label}</span></button>`).join('');
  return `<div class="layout"><aside class="sidebar"><div class="brand"><img src="../assets/logo-senderos.png" alt=""><div><strong>Senderos de Libertad</strong><small>${esc(roleName(profile.role_code))}</small></div></div><nav class="nav">${nav}</nav><div class="side-foot"><button class="side-help" data-help-open>${navIcon('audit')}<span>Guía de uso</span></button><button class="logout" data-logout>Cerrar sesión</button></div></aside><main class="main"><header class="topbar"><div><p class="eyebrow">Operación clínica y administrativa</p><h1>${(tabs.find(tab => tab[0]===activeTab)||[])[1] || 'Sistema'}</h1></div><div class="top-actions"><button class="btn secondary" data-help-open>Guía</button>${reset}<button class="btn secondary" data-refresh>Actualizar</button></div></header><div id="messages"></div>${content}</main>${helpPanelHtml()}<div id="modalHost"></div></div>`;
}
function notice(text,type='ok') { const element=document.getElementById('messages'); if(element) element.innerHTML=`<div class="notice ${type==='error'?'error':'ok'}">${esc(text)}</div>`; }

function tabContent() {
  return ({
    dashboard: dashboard(), patients: patientsTab(), professionals: professionalsTab(), schedule: scheduleTab(),
    clinical: clinicalTab(), documents: documentsTab(), programs: programsTab(), access: accessTab(),
    finance: financeTab(), communications: communicationsTab(), audit: auditTab()
  })[activeTab] || '';
}
function dashboard() {
  const active = state.patients.filter(patient => !['egresado','derivado','suspendido'].includes(patient.admission_status)).length;
  const upcoming = state.appointments.filter(item => new Date(item.start_at)>new Date() && !['cancelado','reprogramado'].includes(item.status)).length;
  const pendingDocs = state.requirements.filter(item => ['requested','rejected'].includes(item.status)).length;
  const pendingPayments = state.charges.filter(item => ['open','partial','overdue'].includes(item.status)).length;
  return `<div class="stack"><div class="kpis"><div class="kpi b1"><span>Pacientes activos</span><strong>${active}</strong></div><div class="kpi"><span>Turnos próximos</span><strong>${upcoming}</strong></div><div class="kpi b2"><span>Documentos solicitados</span><strong>${pendingDocs}</strong></div><div class="kpi b3"><span>Cargos abiertos</span><strong>${pendingPayments}</strong></div></div><div class="cols-2"><section class="panel"><h2>Próximos turnos</h2>${table(['Fecha','Paciente','Profesional','Estado'],state.appointments.slice(0,8).map(item=>[dateTime(item.start_at),name(item.patients),esc(item.professionals?.full_name||'-'),tag(item.status)]))}</section><section class="panel"><h2>Control operativo</h2><p class="muted">La agenda valida disponibilidad, bloqueos y solapamientos. Los documentos enviados por el portal requieren revisión; los pagos se concilian de forma manual, sin pasarela.</p><p class="muted" style="margin-top:8px">La sincronización con Google Calendar queda preparada hasta configurar OAuth y el calendario de cada profesional.</p></section></div></div>`;
}
function patientsTab() {
  const rows = state.patients.map(patient => [esc(name(patient)),esc(patient.document_number||'-'),tag(patient.admission_status),tag(patient.risk_level,patient.risk_level==='alto'?'red':''),esc(patient.phone||'-')]);
  const form = `<section class="panel"><h2>Alta de paciente y referente</h2><form id="patientForm" class="form two-cols">${field('first_name','Nombre','text',true)}${field('last_name','Apellido','text',true)}${field('document_number','DNI','text')}${field('birth_date','Nacimiento','date')}${field('phone','Teléfono')}${field('email','Email','email')}<label class="field">Estado<select name="admission_status"><option value="preingreso">Preingreso</option><option value="evaluacion">Evaluación</option><option value="admitido">Admitido</option><option value="en_tratamiento">En tratamiento</option><option value="seguimiento">Seguimiento</option></select></label><label class="field">Riesgo<select name="risk_level"><option value="bajo">Bajo</option><option value="medio">Medio</option><option value="alto">Alto</option></select></label><label class="field full">Programa<select name="program_id"><option value="">Sin asignar</option>${selectOptions(state.programs,item=>item.name)}</select></label><label class="field full">Profesional responsable<select name="professional_id"><option value="">Sin asignar</option>${selectOptions(state.professionals,item=>item.full_name)}</select></label><h3 class="field full">Familiar o referente</h3>${field('contact_name','Nombre')}${field('contact_email','Email','email')}${field('contact_phone','Teléfono')}<label class="field">Relación<input name="contact_relationship" placeholder="Madre, tutor, referente"></label><label class="field inline full"><input type="checkbox" name="contact_authorized"> Autorizar portal y comunicaciones para este contacto</label><button class="btn primary full">Guardar paciente</button></form></section>`;
  return `<div class="board"><div class="board-main"><section class="panel"><h2>Personas acompañadas <span class="pill">${state.patients.length}</span></h2>${table(['Paciente','DNI','Estado','Riesgo','Teléfono'],rows)}</section></div><aside class="board-side">${form}</aside></div>`;
}
function professionalsTab() {
  const rows = state.professionals.map(item => [esc(item.full_name),esc(item.role_title),esc(item.specialty||'-'),esc(item.email||'-')]);
  const form = isAdmin() ? `<section class="panel"><h2>Alta de profesional</h2><form id="professionalForm" class="form two-cols">${field('full_name','Nombre completo','text',true)}${field('role_title','Cargo','text',true)}${field('specialty','Especialidad')}${field('license_number','Matrícula')}${field('email','Email','email')}${field('phone','Teléfono')}<label class="field full">Perfil<textarea name="bio" rows="3"></textarea></label><button class="btn primary full">Guardar profesional</button></form></section>` : '';
  const main=`<section class="panel"><h2>Equipo profesional <span class="pill">${state.professionals.length}</span></h2>${table(['Nombre','Cargo','Especialidad','Email'],rows)}</section>`;
  return form?`<div class="board"><div class="board-main">${main}</div><aside class="board-side">${form}</aside></div>`:`<div class="board wide">${main}</div>`;
}
function weekCalendar() {
  const first = new Date(); first.setHours(0,0,0,0);
  const days = Array.from({length:7},(_,index)=>new Date(first.getTime()+index*86400000));
  return `<div style="display:grid;gap:10px;grid-template-columns:repeat(7,minmax(128px,1fr));overflow:auto;padding-bottom:4px">${days.map(day=>{const key=day.toISOString().slice(0,10);const entries=state.appointments.filter(item=>item.start_at.slice(0,10)===key);return `<section class="panel" style="padding:10px;box-shadow:none;background:var(--surface-2)"><strong style="font-size:13px;color:var(--brand)">${day.toLocaleDateString('es-AR',{weekday:'short',day:'numeric'})}</strong>${entries.map(item=>`<div class="item" style="margin-top:8px;padding:8px;display:block"><small>${new Date(item.start_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</small><strong style="display:block;font-size:13px">${esc(name(item.patients))}</strong><small>${esc(item.professionals?.full_name||'-')}</small></div>`).join('') || '<p class="muted" style="font-size:12.5px;margin-top:8px">Sin turnos</p>'}</section>`}).join('')}</div>`;
}
function scheduleTab() {
  const appointmentRows = state.appointments.map(item => [dateTime(item.start_at),esc(name(item.patients)),esc(item.professionals?.full_name||'-'),esc(item.rooms?.name||'-'),tag(item.status),`<div class="row-actions">${['asistido','ausente','cancelado','reprogramado'].map(status=>`<button class="btn small secondary" data-appointment-status="${status}" data-id="${item.id}">${status}</button>`).join('')}</div>`]);
  const availability = `<section class="panel"><h2>Disponibilidad profesional</h2><form id="availabilityForm" class="form two-cols"><label class="field full">Profesional<select name="professional_id" required>${selectOptions(state.professionals,item=>item.full_name)}</select></label><label class="field">Día<select name="weekday"><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option><option value="0">Domingo</option></select></label>${field('start_time','Desde','time',true)}${field('end_time','Hasta','time',true)}${field('effective_from','Vigente desde','date',true)}<button class="btn secondary full">Agregar disponibilidad</button></form><div class="list">${state.availability.map(item=>`<div class="item"><strong>${esc(item.professionals?.full_name||'-')}</strong><span>${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][item.weekday]} · ${item.start_time.slice(0,5)}–${item.end_time.slice(0,5)}</span></div>`).join('') || '<p class="muted">Sin disponibilidad cargada.</p>'}</div></section>`;
  const block = `<section class="panel"><h2>Bloquear horario</h2><form id="blockForm" class="form two-cols"><label class="field full">Profesional<select name="professional_id"><option value="">Solo sala</option>${selectOptions(state.professionals,item=>item.full_name)}</select></label><label class="field full">Sala<select name="room_id"><option value="">Sin sala</option>${selectOptions(state.rooms,item=>item.name)}</select></label>${field('title','Motivo','text',true)}<label class="field">Tipo<select name="block_type"><option value="manual">Bloqueo manual</option><option value="leave">Licencia</option><option value="meeting">Reunión</option><option value="external_busy">Ocupado externo</option></select></label>${field('start_at','Inicio','datetime-local',true)}${field('end_at','Fin','datetime-local',true)}<button class="btn danger full">Bloquear</button></form></section>`;
  const create = `<section class="panel"><h2>Agendar turno</h2><form id="appointmentForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id" required>${selectOptions(state.patients,name)}</select></label><label class="field full">Profesional<select name="professional_id" required>${selectOptions(state.professionals,item=>item.full_name)}</select></label><label class="field">Tipo<select name="appointment_type_id" required>${selectOptions(state.appointmentTypes,item=>item.name)}</select></label><label class="field">Sala<select name="room_id"><option value="">Sin sala</option>${selectOptions(state.rooms,item=>item.name)}</select></label><label class="field">Programa<select name="program_id"><option value="">Sin programa</option>${selectOptions(state.programs,item=>item.name)}</select></label><label class="field">Modalidad<select name="modality"><option value="presencial">Presencial</option><option value="online">Online</option></select></label>${field('start_at','Inicio','datetime-local',true)}${field('end_at','Fin','datetime-local',true)}<label class="field full">Motivo<input name="reason"></label><button class="btn primary full">Confirmar turno</button></form></section>`;
  return `<div class="board"><div class="board-main"><section class="panel"><h2>Calendario semanal</h2>${weekCalendar()}</section><section class="panel"><h2>Turnos y estados</h2>${table(['Fecha','Paciente','Profesional','Sala','Estado','Acción'],appointmentRows)}</section><section class="panel"><h2>Bloqueos próximos</h2>${table(['Desde','Hasta','Profesional','Motivo'],state.blocks.map(item=>[dateTime(item.start_at),dateTime(item.end_at),esc(item.professionals?.full_name||item.rooms?.name||'-'),esc(item.title)]))}</section></div><aside class="board-side">${create}${availability}${block}</aside></div>`;
}
function clinicalTab() {
  const form = `<section class="panel"><h2>Nueva evolución</h2><form id="clinicalForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id" required>${selectOptions(state.patients,name)}</select></label><label class="field full">Profesional<select name="professional_id"><option value="">Mi profesional asociado</option>${selectOptions(state.professionals,item=>item.full_name)}</select></label><label class="field">Tipo<input name="entry_type" value="evolucion"></label><label class="field">Estado<select name="status"><option value="draft">Borrador</option><option value="signed">Firmar y cerrar</option></select></label>${field('title','Título','text',true)}<label class="field full">Contenido<textarea name="body" rows="9" required></textarea></label><button class="btn primary full">Guardar</button></form></section>`;
  return `<div class="board"><div class="board-main"><section class="panel"><h2>Registros clínicos recientes</h2><p class="panel-note">Los registros firmados no se editan: quedan protegidos y se corrigen mediante una rectificación.</p>${table(['Fecha','Paciente','Título','Estado'],state.clinical.map(item=>[dateTime(item.created_at),esc(name(item.patients)),esc(item.title),tag(item.status)]))}</section></div><aside class="board-side">${form}</aside></div>`;
}
function documentsTab() {
  const upload = canManageDocuments() ? `<section class="panel"><h2>Cargar documento interno</h2><form id="documentForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id" required>${selectOptions(state.patients,name)}</select></label><label class="field full">Tipo<select name="document_type_id"><option value="">Sin tipo</option>${selectOptions(state.documentTypes,item=>item.name)}</select></label>${field('title','Título','text',true)}<label class="field">Visibilidad<select name="visibility"><option value="private_administrative">Administrativo</option><option value="private_clinical">Clínico</option><option value="internal_direction">Dirección</option></select></label><label class="field full">Archivo<input name="file" type="file" accept=".pdf,image/png,image/jpeg,image/webp"></label><button class="btn primary full">Guardar documento</button></form></section>` : '';
  const request = canManageDocuments() ? `<section class="panel"><h2>Solicitar documentación</h2><form id="requirementForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id" required>${selectOptions(state.patients,name)}</select></label><label class="field full">Tipo<select name="document_type_id"><option value="">Otro</option>${selectOptions(state.documentTypes,item=>item.name)}</select></label>${field('title','Documento requerido','text',true)}${field('due_date','Vencimiento','date')}<label class="field full">Indicaciones<textarea name="instructions" rows="3"></textarea></label><label class="field inline"><input type="checkbox" name="allow_patient" checked> Puede subir paciente</label><label class="field inline"><input type="checkbox" name="allow_family" checked> Puede subir familiar</label><button class="btn secondary full">Solicitar en portal</button></form></section>` : '';
  const docs = state.documents.map(item=>[esc(name(item.patients)),esc(item.title),esc(item.document_types?.name||'-'),tag(item.status),`<button class="btn small secondary" data-release-doc="${item.id}" data-patient="${item.patient_id}">Liberar al paciente</button>`]);
  const requirements = state.requirements.map(item=>[esc(name(item.patients)),esc(item.title),item.due_date||'-',tag(item.status)]);
  const submissions = state.submissions.map(item=>[esc(name(item.patients)),esc(item.document_requirements?.title||'-'),dateTime(item.created_at),tag(item.status),item.status==='submitted'?`<div class="row-actions"><button class="btn small primary" data-review="approved" data-id="${item.id}">Aprobar</button><button class="btn small danger" data-review="rejected" data-id="${item.id}">Rechazar</button></div>`:'-']);
  const main=`<section class="panel"><h2>Documentos del legajo</h2>${table(['Paciente','Documento','Tipo','Estado','Portal'],docs)}</section><section class="panel"><h2>Solicitudes pendientes</h2>${table(['Paciente','Documento','Vence','Estado'],requirements)}</section><section class="panel"><h2>Archivos recibidos desde el portal</h2>${table(['Paciente','Solicitud','Recibido','Estado','Acción'],submissions)}</section>`;
  const side=[upload,request].filter(Boolean).join('');
  return side?`<div class="board"><div class="board-main">${main}</div><aside class="board-side">${side}</aside></div>`:`<div class="board wide">${main}</div>`;
}
function programsTab() {
  const form = isAdmin() ? `<section class="panel"><h2>Nuevo programa</h2><form id="programForm" class="form"><label class="field">Nombre<input name="name" required></label>${field('duration_weeks','Duración (semanas)','number')}<label class="field">Descripción<textarea name="description" rows="4"></textarea></label><button class="btn primary">Guardar programa</button></form></section>`:'';
  const main=`<section class="panel"><h2>Dispositivos y programas <span class="pill">${state.programs.length}</span></h2>${table(['Programa','Duración','Descripción'],state.programs.map(item=>[esc(item.name),item.duration_weeks||'-',esc(item.description||'-')]))}</section>`;
  return form?`<div class="board"><div class="board-main">${main}</div><aside class="board-side">${form}</aside></div>`:`<div class="board wide">${main}</div>`;
}
function accessTab() {
  if (!isAdmin()) return '<section class="panel"><p class="muted">No posee permisos para gestionar accesos.</p></section>';
  const users = state.profiles.map(item=>[esc(item.full_name),esc(item.email),esc(roleName(item.role_code)),tag(item.active?'activo':'inactivo',item.active?'green':'red'),`<div class="row-actions"><button class="btn small secondary" data-toggle-user="${item.id}" data-active="${item.active?'false':'true'}">${item.active?'Desactivar':'Activar'}</button><button class="btn small secondary" data-reset-user="${item.id}">Restablecer</button></div>`]);
  return `<div class="board"><div class="board-main"><section class="panel"><h2>Usuarios y credenciales <span class="pill">${state.profiles.length}</span></h2>${table(['Nombre','Email','Rol','Estado','Acción'],users)}</section></div><aside class="board-side"><section class="panel"><h2>Crear acceso seguro</h2><p class="panel-note">Paciente y familiar son cuentas de portal; el familiar requiere un contacto autorizado. Nunca puede recibir un rol de auditoría.</p><form id="accessForm" class="form two-cols"><label class="field">Tipo<select name="kind" id="accessKind"><option value="patient">Paciente</option><option value="family">Familiar autorizado</option><option value="professional">Profesional clínico</option><option value="internal">Administración interna</option></select></label><div class="field" id="accessRoleWrap"></div><div class="field full" id="accessLinkWrap"></div>${field('full_name','Nombre visible','text',true)}${field('email','Email','email',true)}${field('password','Contraseña temporal','password',true)}<small class="field full">Mínimo 12 caracteres, con mayúscula, minúscula y número. El acceso se crea nuevo: no se reasignan cuentas existentes.</small><button class="btn primary full">Crear acceso</button></form></section></aside></div>`;
}
function financeTab() {
  if (!canFinance()) return '<section class="panel"><p class="muted">No posee permisos de finanzas.</p></section>';
  const chargeRows = state.charges.map(item=>[esc(name(item.patients)),esc(item.description),money(item.amount,item.currency),money(item.paid_amount,item.currency),tag(item.status),`<button class="btn small secondary" data-pay-charge="${item.id}" data-patient="${item.patient_id||''}">Registrar pago</button>`]);
  return `<div class="board"><div class="board-main"><section class="panel"><h2>Cargos y saldos</h2>${table(['Paciente','Concepto','Cargo','Pagado','Estado','Acción'],chargeRows)}</section><section class="panel"><h2>Últimos pagos</h2>${table(['Fecha','Paciente','Monto','Método','Estado'],state.payments.map(item=>[dateTime(item.paid_at),esc(name(item.patients)),money(item.amount,item.currency),esc(item.method),tag(item.status)]))}</section></div><aside class="board-side"><section class="panel"><h2>Crear cargo</h2><form id="chargeForm" class="form two-cols"><label class="field full">Paciente<select name="patient_id"><option value="">Sin paciente (donación/convenio)</option>${selectOptions(state.patients,name)}</select></label>${field('category','Categoría','text',true)}${field('amount','Monto','number',true)}${field('description','Descripción','text',true)}${field('due_date','Vencimiento','date')}<label class="field">Moneda<select name="currency"><option>ARS</option><option>USD</option></select></label><button class="btn primary full">Registrar cargo</button></form></section><section class="panel"><h2>Registrar pago manual</h2><form id="paymentForm" class="form two-cols"><input type="hidden" name="charge_id"><label class="field full">Paciente<select name="patient_id"><option value="">Sin paciente</option>${selectOptions(state.patients,name)}</select></label>${field('amount','Monto','number',true)}<label class="field">Método<select name="method"><option value="bank_transfer">Transferencia</option><option value="cash">Efectivo</option><option value="pos">POS</option><option value="agreement">Convenio</option><option value="scholarship">Beca</option><option value="other">Otro</option></select></label>${field('reference','Referencia / comprobante')}${field('payer_name','Pagador')}<label class="field full">Notas<input name="notes"></label><button class="btn secondary full">Confirmar pago</button></form></section></aside></div>`;
}
function communicationsTab() {
  if (!canCommunicate()) return '<section class="panel"><p class="muted">No posee permisos para enviar comunicados.</p></section>';
  return `<div class="board wide" style="max-width:820px"><section class="panel"><h2>Nuevo comunicado institucional</h2><p class="muted">No incluir información clínica sensible. Los correos quedan en cola hasta configurar un proveedor de envío.</p><form id="communicationForm" class="form two-cols"><label class="field">Audiencia<select name="audience"><option value="professionals">Profesionales</option><option value="patients">Pacientes</option><option value="families">Familiares autorizados</option><option value="patient_network">Paciente y familia</option></select></label><label class="field">Canal<select name="channel"><option value="in_app">Portal / sistema</option><option value="email">Email (cola preparada)</option></select></label><label class="field full">Paciente específico (opcional; obligatorio para red)<select name="patient_id"><option value="">Toda la audiencia</option>${selectOptions(state.patients,name)}</select></label>${field('title','Asunto','text',true)}<label class="field full">Mensaje<textarea name="body" rows="8" required></textarea></label><button class="btn primary full">Enviar comunicado</button></form></section></div>`;
}
function auditTab() {
  return `<div class="board wide"><section class="panel"><h2>Trazabilidad de la operación</h2><p class="panel-note">Cada acción queda registrada con su responsable, rol y nivel de riesgo. Auditoría no accede a la historia clínica.</p>${table(['Fecha','Acción','Entidad','Rol','Riesgo'],state.audit.map(item=>[dateTime(item.created_at),esc(item.action),esc(item.entity_table||'-'),esc(item.actor_role||'-'),tag(item.risk_level)]))}</section></div>`;
}

function bindLogin() {
  document.getElementById('loginForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(event.currentTarget);const {error}=await sb.auth.signInWithPassword({email:data.get('email'),password:data.get('password')});if(error){app.innerHTML=login();bindLogin();}});
  document.querySelector('[data-demo-setup]')?.addEventListener('click',async()=>{const response=await fetch('/api/init-demo-users',{method:'POST'});const data=await response.json();if(!response.ok) alert(data.error||'No se pudo preparar la demo.');else alert('Demo preparada.');});
}
function bindBase() {
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{activeTab=button.dataset.tab;render();}));
  document.querySelector('[data-logout]')?.addEventListener('click',()=>sb.auth.signOut());
  document.querySelector('[data-refresh]')?.addEventListener('click',async()=>{await load();render();notice('Información actualizada.');});
  document.querySelectorAll('[data-help-open]').forEach(button=>button.addEventListener('click',openHelp));
  document.querySelector('[data-help-close]')?.addEventListener('click',closeHelp);
  document.querySelector('[data-help-overlay]')?.addEventListener('click',closeHelp);
  document.querySelectorAll('[data-demo-reset]').forEach(button=>button.addEventListener('click',resetDemo));
}
async function save(tableName,payload,message) {
  const { error } = await sb.from(tableName).insert(payload);
  if (error) throw error;
  await load(); render(); notice(message);
}
function bindTab() {
  document.getElementById('patientForm')?.addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.currentTarget; const payload=pick(form,['first_name','last_name','document_number','birth_date','phone','email','admission_status','risk_level']); payload.admission_date=new Date().toISOString().slice(0,10);
    const {data,error}=await sb.from('patients').insert(payload).select().single(); if(error) return notice(error.message,'error');
    const formData=new FormData(form); const programId=formData.get('program_id'); const professionalId=formData.get('professional_id');
    if(programId) await sb.from('patient_programs').insert({patient_id:data.id,program_id:programId,responsible_professional_id:professionalId||null,current_stage:'Primer contacto',goals:'Acompañamiento inicial.'});
    if(formData.get('contact_name')) await sb.from('patient_contacts').insert({patient_id:data.id,full_name:formData.get('contact_name'),email:formData.get('contact_email')||null,phone:formData.get('contact_phone')||null,relationship:formData.get('contact_relationship')||null,is_authorized:Boolean(formData.get('contact_authorized')),can_access_portal:Boolean(formData.get('contact_authorized')),can_receive_updates:Boolean(formData.get('contact_authorized'))});
    await load();render();notice('Paciente y referente guardados.');
  });
  document.getElementById('professionalForm')?.addEventListener('submit',async event=>{event.preventDefault();try{await save('professionals',{...pick(event.currentTarget,['full_name','role_title','specialty','license_number','email','phone','bio']),active:true},'Profesional guardado.');}catch(error){notice(error.message,'error');}});
  document.getElementById('appointmentForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=pick(event.currentTarget,['patient_id','professional_id','appointment_type_id','start_at','end_at','program_id','room_id','modality','reason']);const {error}=await sb.rpc('create_appointment_secure',{p_patient_id:data.patient_id,p_professional_id:data.professional_id,p_appointment_type_id:data.appointment_type_id,p_start_at:data.start_at,p_end_at:data.end_at,p_program_id:data.program_id||null,p_room_id:data.room_id||null,p_location_id:null,p_modality:data.modality,p_reason:data.reason||null});if(error)return notice(error.message,'error');await load();render();notice('Turno confirmado y protegido contra solapamientos.');});
  document.getElementById('availabilityForm')?.addEventListener('submit',async event=>{event.preventDefault();try{await save('professional_availability_rules',{...pick(event.currentTarget,['professional_id','weekday','start_time','end_time','effective_from']),active:true},'Disponibilidad agregada.');}catch(error){notice(error.message,'error');}});
  document.getElementById('blockForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=pick(event.currentTarget,['professional_id','room_id','title','block_type','start_at','end_at']);data.professional_id=data.professional_id||null;data.room_id=data.room_id||null;if(!data.professional_id&&!data.room_id)return notice('Seleccione profesional o sala.','error');try{await save('calendar_blocks',{...data,active:true},'Horario bloqueado.');}catch(error){notice(error.message,'error');}});
  document.querySelectorAll('[data-appointment-status]').forEach(button=>button.addEventListener('click',async()=>{const {error}=await sb.rpc('update_appointment_status_secure',{p_appointment_id:button.dataset.id,p_status:button.dataset.appointmentStatus,p_attendance_status:null,p_reason:null});if(error)return notice(error.message,'error');await load();render();notice('Estado actualizado.');}));
  document.getElementById('clinicalForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=pick(event.currentTarget,['patient_id','professional_id','entry_type','title','body','status']);data.professional_id=data.professional_id||null;if(data.status==='signed')data.signed_at=new Date().toISOString();try{await save('clinical_entries',data,'Registro clínico guardado.');}catch(error){notice(error.message,'error');}});
  document.getElementById('documentForm')?.addEventListener('submit',uploadInternalDocument);
  document.getElementById('requirementForm')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const data=pick(form,['patient_id','document_type_id','title','instructions','due_date']);const fd=new FormData(form);data.document_type_id=data.document_type_id||null;data.due_date=data.due_date||null;data.allow_patient=Boolean(fd.get('allow_patient'));data.allow_family=Boolean(fd.get('allow_family'));try{await save('document_requirements',data,'Solicitud publicada en el portal.');}catch(error){notice(error.message,'error');}});
  document.querySelectorAll('[data-review]').forEach(button=>button.addEventListener('click',async()=>{const note=prompt(button.dataset.review==='approved'?'Nota interna opcional:':'Motivo del rechazo para portal:');const response=await api('/api/review-document-submission',{submission_id:button.dataset.id,decision:button.dataset.review,reviewer_note:note||null});if(!response.ok)return notice(response.error,'error');await load();render();notice(button.dataset.review==='approved'?'Documento aprobado.':'Documento rechazado.');}));
  document.querySelectorAll('[data-release-doc]').forEach(button=>button.addEventListener('click',async()=>{const {error}=await sb.from('portal_document_releases').insert({document_id:button.dataset.releaseDoc,patient_id:button.dataset.patient,released_to:'patient',active:true});if(error)return notice(error.message,'error');notice('Documento liberado al paciente.');}));
  document.getElementById('programForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=pick(event.currentTarget,['name','duration_weeks','description']);data.slug=data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');data.active=true;try{await save('programs',data,'Programa guardado.');}catch(error){notice(error.message,'error');}});
  bindAccess();
  document.getElementById('chargeForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=pick(event.currentTarget,['patient_id','category','description','amount','currency','due_date']);data.patient_id=data.patient_id||null;data.due_date=data.due_date||null;data.amount=Number(data.amount);try{await save('financial_charges',data,'Cargo registrado.');}catch(error){notice(error.message,'error');}});
  document.getElementById('paymentForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=pick(event.currentTarget,['charge_id','patient_id','amount','method','reference','payer_name','notes']);data.charge_id=data.charge_id||null;data.patient_id=data.patient_id||null;data.amount=Number(data.amount);data.status='confirmed';try{await save('financial_payments',data,'Pago manual registrado y conciliado.');}catch(error){notice(error.message,'error');}});
  document.querySelectorAll('[data-pay-charge]').forEach(button=>button.addEventListener('click',()=>{const form=document.getElementById('paymentForm');form.charge_id.value=button.dataset.payCharge;form.patient_id.value=button.dataset.patient||'';form.scrollIntoView({behavior:'smooth'});}));
  document.getElementById('communicationForm')?.addEventListener('submit',async event=>{event.preventDefault();const response=await api('/api/send-communication',pick(event.currentTarget,['title','body','audience','channel','patient_id']));if(!response.ok)return notice(response.error,'error');event.currentTarget.reset();notice(`Comunicado enviado a ${response.recipients} destinatarios.`);});
}
async function uploadInternalDocument(event) {
  event.preventDefault(); const form=event.currentTarget; const fd=new FormData(form); const file=fd.get('file'); let path=null;
  if(file?.name){path=`${fd.get('patient_id')}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;const {error}=await sb.storage.from('clinical-documents').upload(path,file);if(error)return notice(error.message,'error');}
  try{await save('patient_documents',{patient_id:fd.get('patient_id'),document_type_id:fd.get('document_type_id')||null,title:fd.get('title'),visibility:fd.get('visibility'),file_path:path,storage_bucket:'clinical-documents',mime_type:file?.type||null,size_bytes:file?.size||null,status:'cargado'},'Documento guardado.');}catch(error){notice(error.message,'error');}
}
function bindAccess() {
  const form=document.getElementById('accessForm'); if(!form)return;
  const kind=document.getElementById('accessKind');
  const sync=()=>{
    const value=kind.value;const role=document.getElementById('accessRoleWrap');const linked=document.getElementById('accessLinkWrap');
    if(value==='patient'){role.innerHTML='Rol<input value="Paciente" disabled>';linked.innerHTML=`Vincular paciente<select name="patient_id" required>${selectOptions(state.patients,name)}</select>`;}
    if(value==='family'){role.innerHTML='Rol<input value="Familiar autorizado (portal)" disabled>';linked.innerHTML=`Paciente<select name="family_patient_id" id="familyPatient" required>${selectOptions(state.patients,name)}</select><div id="familyContactWrap"></div><label class="field inline"><input type="checkbox" name="can_view_documents"> Ver documentos liberados</label><label class="field inline"><input type="checkbox" name="can_upload_documents"> Cargar documentos solicitados</label>`;syncFamilyContacts();}
    if(value==='professional'){role.innerHTML=`Rol clínico<select name="role_code">${roles.filter(row=>['professional','medical','psychologist','social_worker','therapeutic_operator'].includes(row[0])).map(row=>`<option value="${row[0]}">${row[1]}</option>`).join('')}</select>`;linked.innerHTML=`Vincular profesional<select name="professional_id" required>${selectOptions(state.professionals,item=>item.full_name)}</select>`;}
    if(value==='internal'){role.innerHTML=`Rol<select name="role_code">${roles.filter(row=>['admission','finance','communications','direction','auditor'].includes(row[0])).map(row=>`<option value="${row[0]}">${row[1]}</option>`).join('')}</select>`;linked.innerHTML='Cuenta interna sin ficha clínica';}
  };
  const syncFamilyContacts=()=>{const patient=document.getElementById('familyPatient');const wrap=document.getElementById('familyContactWrap');if(!patient||!wrap)return;const contacts=state.contacts.filter(item=>item.patient_id===patient.value&&item.is_authorized&&item.can_access_portal);wrap.innerHTML=`Contacto autorizado<select name="patient_contact_id" required>${selectOptions(contacts,item=>`${item.full_name} · ${item.relationship||'referente'}`)}</select>`;patient.addEventListener('change',syncFamilyContacts,{once:true});};
  kind.addEventListener('change',sync);sync();
  form.addEventListener('submit',async event=>{event.preventDefault();const fd=new FormData(form);const body={kind:fd.get('kind'),email:fd.get('email'),password:fd.get('password'),full_name:fd.get('full_name'),role_code:fd.get('role_code')};if(body.kind==='patient')body.patient_id=fd.get('patient_id');if(body.kind==='professional')body.professional_id=fd.get('professional_id');if(body.kind==='family')body.authorizations=[{patient_id:fd.get('family_patient_id'),patient_contact_id:fd.get('patient_contact_id'),can_view_profile:true,can_view_appointments:true,can_receive_updates:true,can_view_documents:Boolean(fd.get('can_view_documents')),can_upload_documents:Boolean(fd.get('can_upload_documents'))}];const response=await api('/api/create-user',body);if(!response.ok)return notice(response.error,'error');await load();render();notice('Acceso creado de forma segura.');});
  document.querySelectorAll('[data-toggle-user]').forEach(button=>button.addEventListener('click',()=>updateAccess(button.dataset.toggleUser,{active:button.dataset.active==='true'})));
  document.querySelectorAll('[data-reset-user]').forEach(button=>button.addEventListener('click',()=>{const password=prompt('Nueva contraseña temporal (12+ caracteres, mayúscula, minúscula y número):');if(password)updateAccess(button.dataset.resetUser,{password});}));
}
async function updateAccess(userId,payload){const response=await api('/api/update-user-access',{user_id:userId,...payload});if(!response.ok)return notice(response.error,'error');await load();render();notice('Acceso actualizado.');}
async function api(url,body){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify(body)});let data={};try{data=await response.json();}catch{}return {ok:response.ok,...data};}

