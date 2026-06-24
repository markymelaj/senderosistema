import { createClient } from '@supabase/supabase-js';

export const CLINICAL_ROLES = new Set(['professional', 'medical', 'psychologist', 'social_worker', 'therapeutic_operator']);

export function send(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(payload);
}

export function serverClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan variables de servidor');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function currentCaller(req, admin) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'Sesión requerida', status: 401 };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { error: 'Sesión inválida', status: 401 };
  const { data: profile, error: profileError } = await admin.from('user_profiles')
    .select('id, role_code, account_kind, professional_id, patient_id, active, full_name')
    .eq('id', data.user.id).maybeSingle();
  if (profileError || !profile?.active) return { error: 'Cuenta sin acceso activo', status: 403 };
  return { user: data.user, profile };
}

export function canProvision(profile, targetRole) {
  if (profile.role_code === 'super_admin') return true;
  if (profile.role_code === 'direction') return !['super_admin', 'auditor'].includes(targetRole);
  if (profile.role_code === 'clinical_coordination') return ['patient', 'family', ...CLINICAL_ROLES].includes(targetRole);
  return false;
}

export function canManageAccess(profile, targetRole) {
  if (profile.role_code === 'super_admin') return true;
  return profile.role_code === 'direction' && !['super_admin', 'direction', 'auditor'].includes(targetRole);
}

export function validPassword(value) {
  const password = String(value || '');
  return password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

export async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find(user => String(user.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  return null;
}

export async function audit(admin, actorId, action, entityTable, entityId = null, patientId = null, metadata = {}, risk = 'normal') {
  await admin.from('audit_logs').insert({
    actor_user_id: actorId, action, entity_table: entityTable, entity_id: entityId,
    patient_id: patientId, metadata, risk_level: risk
  });
}
