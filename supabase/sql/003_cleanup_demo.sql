-- =============================================================
-- Fundación Senderos de Libertad - Limpieza de datos demo
-- Archivo 003_cleanup_demo.sql
-- Ejecutar cuando la fundación apruebe el sistema y quiera partir limpio.
-- Borra pacientes, turnos, evoluciones y registros marcados como is_demo=true.
-- No borra configuración base, roles, permisos ni la organización.
-- =============================================================

begin;

delete from public.audit_logs where metadata->>'message' = 'Carga demo inicial ficticia' or (patient_id in (select id from public.patients where is_demo=true));
delete from public.financial_movements where is_demo=true;
delete from public.portal_requests where is_demo=true;
delete from public.portal_document_releases where patient_id in (select id from public.patients where is_demo=true);
delete from public.document_access_logs where patient_id in (select id from public.patients where is_demo=true);
delete from public.patient_documents where is_demo=true;
delete from public.clinical_alerts where is_demo=true;
delete from public.clinical_entry_versions where clinical_entry_id in (select id from public.clinical_entries where is_demo=true);
delete from public.clinical_entries where is_demo=true;
delete from public.waiting_list where is_demo=true;
delete from public.appointment_status_history where appointment_id in (select id from public.appointments where is_demo=true);
delete from public.appointments where is_demo=true;
delete from public.patient_programs where is_demo=true;
delete from public.patient_status_history where patient_id in (select id from public.patients where is_demo=true);
delete from public.patient_contacts where is_demo=true;
delete from public.patients where is_demo=true;
delete from public.professionals where is_demo=true;
delete from public.rooms where is_demo=true;
delete from public.locations where is_demo=true;
delete from public.program_stages where is_demo=true;
delete from public.programs where is_demo=true;
delete from public.clinical_templates where is_demo=true;
delete from public.document_types where is_demo=true;
delete from public.appointment_types where is_demo=true;

commit;

-- Nota: si cargaste archivos demo reales en Storage, eliminarlos desde Supabase Storage > clinical-documents.
