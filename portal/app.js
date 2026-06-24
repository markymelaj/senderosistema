const root = document.getElementById('portal');
let sb; let session; let profile; let config = {}; let selectedPatientId = null;
let state = { patients:[], appointments:[], documents:[], requirements:[], submissions:[], requests:[], messages:[] };

function esc(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));}
function dateTime(value){return value?new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'-';}
function tag(value){return `<span class="tag">${esc(value||'-')}</span>`;}
function table(headers,rows){return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(item=>`<th>${item}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell??'-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="empty">Sin registros</div>';}
function patientName(patient){return patient?`${patient.first_name||''} ${patient.last_name||''}`.trim():'-';}

init();
async function init(){
  try{
    config=await (await fetch('/api/public-config')).json();
    if(!config.supabaseUrl||!config.supabaseAnonKey)throw new Error('Portal no configurado.');
    sb=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data}=await sb.auth.getSession();session=data.session;
    sb.auth.onAuthStateChange(async(_event,next)=>{session=next;if(next)await load();else{profile=null;state={patients:[],appointments:[],documents:[],requirements:[],submissions:[],requests:[],messages:[]};}render();});
    if(session)await load();render();
  }catch(error){root.innerHTML=`<main class="login"><section class="login-card"><h1>Portal no disponible</h1><p>${esc(error.message)}</p></section></main>`;}
}
async function query(request){const result=await request;return result.error?[]:(result.data||[]);}
async function load(){
  const profileResult=await sb.from('user_profiles').select('*').eq('id',session.user.id).maybeSingle();profile=profileResult.data||null;
  if(!profile)return;
  let patients=[];
  if(profile.account_kind==='patient'&&profile.patient_id){const result=await sb.from('patients').select('*').eq('id',profile.patient_id).maybeSingle();if(result.data)patients=[result.data];}
  if(profile.account_kind==='family'){patients=await query(sb.from('family_authorizations').select('patient_id,patients(*)').eq('user_id',session.user.id).eq('active',true));patients=patients.map(item=>item.patients).filter(Boolean);}
  state.patients=patients;
  if(!selectedPatientId||!patients.some(item=>item.id===selectedPatientId))selectedPatientId=patients[0]?.id||null;
  if(!selectedPatientId){state={...state,appointments:[],documents:[],requirements:[],submissions:[],requests:[],messages:[]};return;}
  const results=await Promise.all([
    query(sb.from('appointments').select('*,professionals(full_name),appointment_types(name)').eq('patient_id',selectedPatientId).order('start_at').limit(100)),
    query(sb.from('patient_documents').select('*').eq('patient_id',selectedPatientId).order('created_at',{ascending:false}).limit(100)),
    query(sb.from('document_requirements').select('*').eq('patient_id',selectedPatientId).in('status',['requested','rejected']).order('created_at',{ascending:false})),
    query(sb.from('portal_document_submissions').select('*,document_requirements(title)').eq('patient_id',selectedPatientId).order('created_at',{ascending:false})),
    query(sb.from('portal_requests').select('*').eq('patient_id',selectedPatientId).order('created_at',{ascending:false})),
    query(sb.from('communication_recipients').select('*,communications(title,body,created_at)').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100))
  ]);
  [state.appointments,state.documents,state.requirements,state.submissions,state.requests,state.messages]=results;
}
function render(){
  if(!session){root.innerHTML=login();bindLogin();return;}
  if(!profile){root.innerHTML='<main class="login"><section class="login-card"><p>Cuenta sin perfil de portal.</p></section></main>';return;}
  if(profile.account_kind==='internal'){window.location.href='/sistema/';return;}
  root.innerHTML=shell();bind();
}
function login(){
  const demo=config.demoEnabled?'<p class="muted">La demo solo está habilitada en ambientes de prueba.</p>':'';
  return `<main class="login"><section class="login-card"><img src="../assets/logo-senderos.png" alt=""><h1>Portal seguro</h1><p>Turnos, documentos solicitados y comunicados autorizados por la clínica.</p><form id="login" class="form"><label class="field">Email<input name="email" type="email" required></label><label class="field">Contraseña<input name="password" type="password" required></label><button class="btn primary">Ingresar</button></form>${demo}<a class="back-link" href="/">Volver a la web</a></section></main>`;
}
function shell(){
  const patient=state.patients.find(item=>item.id===selectedPatientId);
  return `<main class="wrap"><header class="header"><div class="brand"><img src="../assets/logo-senderos.png" alt=""><div><strong>Senderos de Libertad</strong><small>Portal seguro · ${profile.account_kind==='family'?'familiar autorizado':'paciente'}</small></div></div><button class="btn secondary" id="logout">Salir</button></header><section class="hero"><h1>${esc(profile.full_name||'Portal')}</h1><p>Solo se muestra información habilitada para esta cuenta. No se publican evoluciones ni notas clínicas.</p>${state.patients.length>1?`<label class="field">Persona vinculada<select id="patientSelect">${state.patients.map(item=>`<option value="${item.id}" ${item.id===selectedPatientId?'selected':''}>${esc(patientName(item))}</option>`).join('')}</select></label>`:`<p>${esc(patientName(patient))}</p>`}</section><div id="msg"></div><section class="grid"><div class="card"><h2>Turnos</h2>${table(['Fecha','Tipo','Profesional','Estado'],state.appointments.map(item=>[dateTime(item.start_at),esc(item.appointment_types?.name||'-'),esc(item.professionals?.full_name||'-'),tag(item.status)]))}</div><div class="card"><h2>Documentos disponibles</h2>${documents()}</div><div class="card"><h2>Documentos solicitados</h2>${requirements()}</div><div class="card"><h2>Nueva solicitud</h2><form id="requestForm" class="form"><label class="field">Tipo<select name="request_type"><option value="turno">Turno</option><option value="documento">Documento</option><option value="datos">Corrección de datos</option><option value="otro">Otro</option></select></label><label class="field">Asunto<input name="subject" required></label><label class="field">Mensaje<textarea name="message" rows="5" required></textarea></label><button class="btn primary">Enviar solicitud</button></form></div><div class="card"><h2>Solicitudes enviadas</h2>${table(['Fecha','Tipo','Asunto','Estado'],state.requests.map(item=>[dateTime(item.created_at),esc(item.request_type),esc(item.subject),tag(item.status)]))}</div><div class="card"><h2>Comunicados</h2>${messages()}</div></section><p class="footer-note">Ante una situación de riesgo inmediato, comuníquese con los servicios de emergencia de su zona.</p></main>`;
}
function documents(){
  if(!state.documents.length)return '<div class="empty">Sin documentos liberados</div>';
  return `<div class="doc-list">${state.documents.map(item=>`<button class="doc-row" data-download="${item.id}"><strong>${esc(item.title)}</strong><small>Descargar</small></button>`).join('')}</div>`;
}
function requirements(){
  if(!state.requirements.length)return '<div class="empty">No hay documentación pendiente</div>';
  return `<div class="list">${state.requirements.map(item=>`<div class="item"><div><strong>${esc(item.title)}</strong><small>${esc(item.instructions||'')}</small><small>Vence: ${item.due_date||'sin fecha'}</small></div><form class="uploadRequirement" data-requirement="${item.id}"><input type="file" name="file" accept=".pdf,image/png,image/jpeg,image/webp" required><button class="btn secondary">Subir</button></form></div>`).join('')}</div>`;
}
function messages(){
  if(!state.messages.length)return '<div class="empty">Sin comunicados</div>';
  return `<div class="list">${state.messages.map(item=>`<button class="item" data-read="${item.id}"><div><strong>${esc(item.communications?.title||'Comunicado')}</strong><small>${esc(item.communications?.body||'')}</small></div><span>${item.read_at?'Leído':'Nuevo'}</span></button>`).join('')}</div>`;
}
function message(text,type=''){const el=document.getElementById('msg');if(el)el.innerHTML=`<div class="notice ${type==='error'?'error':''}">${esc(text)}</div>`;}
function bindLogin(){document.getElementById('login')?.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(event.currentTarget);const {error}=await sb.auth.signInWithPassword({email:data.get('email'),password:data.get('password')});if(error){root.innerHTML=login();bindLogin();}});}
function bind(){
  document.getElementById('logout')?.addEventListener('click',()=>sb.auth.signOut());
  document.getElementById('patientSelect')?.addEventListener('change',async event=>{selectedPatientId=event.target.value;await load();render();});
  document.getElementById('requestForm')?.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(event.currentTarget);const {error}=await sb.from('portal_requests').insert({patient_id:selectedPatientId,request_type:data.get('request_type'),subject:data.get('subject'),message:data.get('message'),requester_user_id:session.user.id});if(error)return message(error.message,'error');await load();render();message('Solicitud enviada.');});
  document.querySelectorAll('[data-download]').forEach(button=>button.addEventListener('click',()=>downloadDocument(button.dataset.download)));
  document.querySelectorAll('.uploadRequirement').forEach(form=>form.addEventListener('submit',event=>uploadRequirement(event,form.dataset.requirement)));
  document.querySelectorAll('[data-read]').forEach(button=>button.addEventListener('click',async()=>{await sb.rpc('mark_communication_read',{p_recipient_id:button.dataset.read});await load();render();}));
}
async function uploadRequirement(event,requirementId){
  event.preventDefault();const file=new FormData(event.currentTarget).get('file');if(!file?.name)return;
  if(file.size>10*1024*1024)return message('El archivo supera 10 MB.','error');
  const path=`${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
  const {error:uploadError}=await sb.storage.from('portal-submissions').upload(path,file);
  if(uploadError)return message(uploadError.message,'error');
  const {error}=await sb.from('portal_document_submissions').insert({requirement_id:requirementId,patient_id:selectedPatientId,submitted_by:session.user.id,file_path:path,original_filename:file.name,mime_type:file.type,size_bytes:file.size});
  if(error)return message(error.message,'error');
  await load();render();message('Archivo recibido. El equipo lo revisará antes de incorporarlo al legajo.');
}
async function downloadDocument(documentId){
  const response=await fetch('/api/document-download',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({document_id:documentId})});
  const data=await response.json();if(!response.ok)return message(data.error||'No se pudo abrir el documento.','error');window.open(data.url,'_blank','noopener');
}

