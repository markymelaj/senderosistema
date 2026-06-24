export default function handler(req, res) {
  const demoEnabled = process.env.ENABLE_DEMO_SETUP === 'true' && process.env.VERCEL_ENV !== 'production';
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    demoEnabled,
    timezone: process.env.ORGANIZATION_TIMEZONE || 'America/Argentina/Mendoza'
  });
}
