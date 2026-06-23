import { createClient } from '@supabase/supabase-js';

const internalRoles = new Set(['super_admin', 'direction', 'clinical_coordination']);

function send(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(payload);
}

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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return send(res, 500, { error: 'Faltan variables de servidor' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return send(res, 401, { error: 'Sesión requerida' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return send(res, 401, { error: 'Sesión inválida' });

  const { data: callerProfile, error: profileError } = await admin
    .from('user_profiles')
    .select('id, role_code, active')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !callerProfile?.active || !internalRoles.has(callerProfile.role_code)) {
    return send(res, 403, { error: 'No autorizado' });
  }

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '').trim();
  const fullName = String(body.full_name || '').trim();
  const roleCode = String(body.role_code || '').trim();
  const patientId = body.patient_id || null;
  const professionalId = body.professional_id || null;

  if (!email || !password || !fullName || !roleCode) {
    return send(res, 400, { error: 'Faltan datos obligatorios' });
  }
  if (password.length < 8) {
    return send(res, 400, { error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  let user;
  try {
    user = await findUserByEmail(admin, email);
  } catch (err) {
    return send(res, 400, { error: err.message });
  }

  if (user) {
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role_code: roleCode }
    });
    if (updateError) return send(res, 400, { error: updateError.message });
    user = updated.user;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role_code: roleCode }
    });
    if (createError) return send(res, 400, { error: createError.message });
    user = created.user;
  }

  const userId = user.id;
  const { error: upsertError } = await admin.from('user_profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    role_code: roleCode,
    patient_id: patientId,
    professional_id: professionalId,
    active: true
  }, { onConflict: 'id' });

  if (upsertError) return send(res, 400, { error: upsertError.message });

  await admin.rpc('add_audit_log', {
    p_action: 'USER_CREATED_FROM_ADMIN',
    p_entity_table: 'user_profiles',
    p_entity_id: userId,
    p_patient_id: patientId,
    p_metadata: { email, role_code: roleCode },
    p_risk_level: 'high'
  });

  return send(res, 200, { user_id: userId, email, role_code: roleCode, active: true });
}
