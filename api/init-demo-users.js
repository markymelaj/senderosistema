import { findUserByEmail, send, serverClient } from './_auth.js';

const PASSWORD = 'Senderos2026!';
const USERS = [
  { email:'direccion@senderos.demo', full_name:'Dirección Senderos', role_code:'direction', account_kind:'internal' },
  { email:'profesional@senderos.demo', full_name:'Lic. Martín Quiroga', role_code:'psychologist', account_kind:'internal', professional_email:'martin.quiroga@senderos.demo' },
  { email:'paciente@senderos.demo', full_name:'Mateo Roldán', role_code:'patient', account_kind:'patient', patient_document:'99000101' },
  { email:'auditoria@senderos.demo', full_name:'Auditoría institucional', role_code:'auditor', account_kind:'internal' }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res,405,{error:'Método no permitido'});
  if (process.env.ENABLE_DEMO_SETUP !== 'true' || process.env.VERCEL_ENV === 'production') {
    return send(res,404,{error:'Demo no disponible.'});
  }
  let admin;
  try { admin=serverClient(); } catch(error) { return send(res,500,{error:error.message}); }
  try {
    for (const item of USERS) {
      let professionalId=null; let patientId=null;
      if (item.professional_email) {
        const {data}=await admin.from('professionals').select('id').eq('email',item.professional_email).maybeSingle();
        professionalId=data?.id||null;
      }
      if (item.patient_document) {
        const {data}=await admin.from('patients').select('id').eq('document_number',item.patient_document).maybeSingle();
        patientId=data?.id||null;
      }
      let user=await findUserByEmail(admin,item.email);
      if (!user) {
        const {data,error}=await admin.auth.admin.createUser({
          email:item.email,password:PASSWORD,email_confirm:true,
          user_metadata:{full_name:item.full_name,role_code:item.role_code,account_kind:item.account_kind}
        });
        if (error) throw error;
        user=data.user;
      }
      const {error:profileError}=await admin.from('user_profiles').upsert({
        id:user.id,email:item.email,full_name:item.full_name,role_code:item.role_code,account_kind:item.account_kind,
        professional_id:professionalId,patient_id:patientId,active:true
      },{onConflict:'id'});
      if (profileError) throw profileError;
    }
    await admin.from('audit_logs').insert({action:'DEMO_USERS_READY',entity_table:'user_profiles',metadata:{count:USERS.length},risk_level:'normal'});
    return send(res,200,{ok:true});
  } catch(error) {
    return send(res,400,{error:error.message||'No se pudieron preparar los accesos demo.'});
  }
}
