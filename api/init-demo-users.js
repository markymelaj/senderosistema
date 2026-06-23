import { createClient } from '@supabase/supabase-js';

function send(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(payload);
}

const PASSWORD = 'Senderos2026!';
const DEMO_USERS = [
  { email: 'direccion@senderos.demo', full_name: 'Dirección Senderos', role_code: 'direction' },
  { email: 'profesional@senderos.demo', full_name: 'Lic. Martín Quiroga', role_code: 'psychologist', professional_email: 'martin.quiroga@senderos.demo' },
  { email: 'paciente@senderos.demo', full_name: 'Mateo Roldán', role_code: 'patient', patient_document: '99000101' },
  { email: 'auditoria@senderos.demo', full_name: 'Auditoría institucional', role_code: 'auditor' }
];

async function findUserByEmail(admin, email) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (!data.users.length || data.users.length < 100) return null;
    page += 1;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido' });
  if (process.env.ENABLE_DEMO_SETUP === 'false') return send(res, 403, { error: 'Demo desactivada' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return send(res, 500, { error: 'Faltan variables de servidor' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const created = [];

  try {
  for (const item of DEMO_USERS) {
    let professionalId = null;
    let patientId = null;

    if (item.professional_email) {
      const { data } = await admin.from('professionals').select('id').eq('email', item.professional_email).maybeSingle();
      professionalId = data?.id || null;
    }
    if (item.patient_document) {
      const { data } = await admin.from('patients').select('id').eq('document_number', item.patient_document).maybeSingle();
      patientId = data?.id || null;
    }

    let user = await findUserByEmail(admin, item.email);
    if (user) {
      const { data, error } = await admin.auth.admin.updateUserById(user.id, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: item.full_name, role_code: item.role_code }
      });
      if (error) throw error;
      user = data.user;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: item.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: item.full_name, role_code: item.role_code }
      });
      if (error) throw error;
      user = data.user;
    }

    const { error: profileError } = await admin.from('user_profiles').upsert({
      id: user.id,
      email: item.email,
      full_name: item.full_name,
      role_code: item.role_code,
      professional_id: professionalId,
      patient_id: patientId,
      active: true
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    created.push({ email: item.email, password: PASSWORD, role_code: item.role_code });
  }

  await admin.from('audit_logs').insert({
    action: 'DEMO_USERS_READY',
    entity_table: 'user_profiles',
    metadata: { users: DEMO_USERS.map(u => u.email) },
    risk_level: 'normal'
  });

  return send(res, 200, { ok: true, credentials: created });
  } catch (err) {
    return send(res, 400, { error: err.message || 'No se pudieron preparar los accesos demo' });
  }
}
