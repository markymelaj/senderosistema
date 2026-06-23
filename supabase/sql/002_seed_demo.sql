-- Datos de prueba para Fundación Senderos de Libertad.
-- Los pacientes son ficticios y pueden eliminarse con 003_cleanup_demo.sql.

insert into public.organizations(name, legal_name, cuit, activity, address, city, province, country, is_demo)
values('Fundación Senderos de Libertad','Fundación Senderos de Libertad','30-71928002-8','Servicios relacionados con la salud humana n.c.p.','República de Siria 115, Piso 2','Mendoza','Mendoza','Argentina', false)
on conflict(cuit) do update set name=excluded.name, legal_name=excluded.legal_name, activity=excluded.activity, address=excluded.address, city=excluded.city, province=excluded.province;

insert into public.programs(org_id, name, slug, description, duration_weeks, is_demo)
select (select id from public.organizations where cuit='30-71928002-8'), v.name, v.slug, v.description, v.duration_weeks, true
from (values
('Prevención y sensibilización','prevencion-sensibilizacion','Talleres educativos, charlas para familias, docentes y referentes comunitarios, campañas de concientización y reducción del estigma.',8),
('Orientación y tratamiento','orientacion-tratamiento','Primera orientación, evaluación, consejería, terapia individual, grupos de apoyo, centro de día y coordinación con redes de salud.',24),
('Acompañamiento familiar','acompanamiento-familiar','Apoyo a familiares, límites saludables, codependencia y herramientas para sostener el proceso sin cargarlo en silencio.',12),
('Reinserción social y laboral','reinsercion-social-laboral','Habilidades para la vida, capacitación, orientación laboral, empleo, emprendimiento y redes de apoyo.',20),
('Programa Online','programa-online','Orientación, terapia y seguimiento virtual para personas que no pueden asistir presencialmente.',12)
) v(name, slug, description, duration_weeks)
on conflict(slug) do update set description=excluded.description, duration_weeks=excluded.duration_weeks, is_demo=true;

insert into public.program_stages(program_id, name, stage_order, description, is_demo)
select p.id, s.name, s.stage_order, s.description, true
from public.programs p
join (values
('orientacion-tratamiento','Primer contacto',1,'Escucha inicial, orientación y contención.'),
('orientacion-tratamiento','Evaluación',2,'Revisión del caso, red familiar, nivel de riesgo y alternativas.'),
('orientacion-tratamiento','Plan de apoyo',3,'Definición de terapia, grupo, centro de día, residencia o derivación.'),
('orientacion-tratamiento','Tratamiento',4,'Acompañamiento individual, grupal y familiar.'),
('reinsercion-social-laboral','Reinserción',5,'Autonomía, rutina, vínculos, capacitación y oportunidades.'),
('reinsercion-social-laboral','Seguimiento',6,'Continuidad, redes de apoyo e indicadores de avance.'),
('acompanamiento-familiar','Orientación familiar',1,'Espacio para referentes y familiares.'),
('prevencion-sensibilizacion','Taller comunitario',1,'Charlas y acciones preventivas.'),
('programa-online','Ingreso online',1,'Orientación inicial remota y agenda virtual.')
) s(slug, name, stage_order, description) on p.slug=s.slug
on conflict do nothing;

insert into public.locations(org_id, name, address, city, active, is_demo)
select (select id from public.organizations where cuit='30-71928002-8'), 'Sede Mendoza', 'República de Siria 115, Piso 2', 'Mendoza', true, true
where not exists(select 1 from public.locations where name='Sede Mendoza');

insert into public.rooms(location_id, name, room_type, capacity, active, is_demo)
select l.id, v.name, v.room_type, v.capacity, true, true
from public.locations l
cross join (values
('Consultorio psicológico','individual',2),
('Consultorio médico','individual',2),
('Sala familiar','familiar',5),
('Sala de grupos','grupal',18),
('Atención online','virtual',1)
) v(name, room_type, capacity)
where l.name='Sede Mendoza' and not exists(select 1 from public.rooms r where r.location_id=l.id and r.name=v.name);

insert into public.appointment_types(name, default_minutes, requires_clinical_entry, is_demo)
select * from (values
('Orientación inicial',45,true,true),
('Evaluación interdisciplinaria',60,true,true),
('Terapia individual',50,true,true),
('Grupo de apoyo',90,true,true),
('Acompañamiento familiar',60,true,true),
('Seguimiento online',45,true,true),
('Actividad de prevención',90,false,true),
('Gestión administrativa',30,false,true),
('Asesoría legal',45,false,true),
('Entrevista de voluntariado',45,false,true)
) v(name, default_minutes, requires_clinical_entry, is_demo)
where not exists(select 1 from public.appointment_types a where a.name=v.name);

insert into public.document_types(name, category, requires_expiration, is_demo)
select * from (values
('DNI / documento de identidad','administrativo',false,true),
('Consentimiento informado','legal-clinico',false,true),
('Autorización de familiar o tutor','legal',false,true),
('Evaluación inicial','clinico',false,true),
('Informe psicológico','clinico',false,true),
('Informe social','clinico',false,true),
('Informe médico','clinico',false,true),
('Certificado emitido','administrativo',false,true),
('Comprobante de aporte o donación','financiero',false,true)
) v(name, category, requires_expiration, is_demo)
where not exists(select 1 from public.document_types d where d.name=v.name);

insert into public.clinical_templates(name, entry_type, body_template, active, is_demo)
select * from (values
('Primer contacto','primer_contacto','Motivo de consulta:\n\nPersona que solicita orientación:\n\nSituación actual:\n\nRed familiar/referente:\n\nRiesgo inmediato:\n\nPróximo paso:\n',true,true),
('Evaluación interdisciplinaria','evaluacion_interdisciplinaria','Antecedentes relevantes:\n\nEvaluación clínica/psicológica/social:\n\nNivel de riesgo:\n\nRecursos familiares/comunitarios:\n\nPlan sugerido:\n',true,true),
('Evolución individual','evolucion_individual','Objetivo de la sesión:\n\nObservaciones:\n\nAcuerdos:\n\nTareas o indicaciones:\n\nPróximo turno:\n',true,true),
('Reunión familiar','reunion_familiar','Participantes:\n\nSituación familiar actual:\n\nLímites y acuerdos:\n\nOrientaciones:\n\nSeguimiento:\n',true,true),
('Informe de seguimiento','informe_seguimiento','Resumen del período:\n\nAvances:\n\nDificultades:\n\nRed de apoyo:\n\nPróximas acciones:\n',true,true)
) v(name, entry_type, body_template, active, is_demo)
where not exists(select 1 from public.clinical_templates t where t.name=v.name);

insert into public.professionals(org_id, full_name, role_title, specialty, license_number, email, phone, bio, active, is_demo)
select (select id from public.organizations where cuit='30-71928002-8'), v.full_name, v.role_title, v.specialty, v.license_number, v.email, v.phone, v.bio, true, true
from (values
('Dra. Valeria Moreno','Psiquiatra','Evaluación clínica y manejo médico','MP-DEMO-001','valeria.moreno@senderos.demo','+54 9 261 000 1001','Perfil de prueba.'),
('Lic. Martín Quiroga','Psicólogo','Terapia individual, grupal y familiar','MP-DEMO-002','martin.quiroga@senderos.demo','+54 9 261 000 1002','Perfil de prueba.'),
('Lic. Ana Rivas','Asistente social','Redes, familia y reinserción','MP-DEMO-003','ana.rivas@senderos.demo','+54 9 261 000 1003','Perfil de prueba.'),
('Carlos Medina','Asistente terapéutico','Acompañamiento cotidiano y talleres',null,'carlos.medina@senderos.demo','+54 9 261 000 1004','Perfil de prueba.'),
('Sofía Herrera','Nutricionista','Hábitos, alimentación y bienestar','MP-DEMO-004','sofia.herrera@senderos.demo','+54 9 261 000 1005','Perfil de prueba.'),
('Paula Torres','Musicoterapeuta','Espacios expresivos y grupales','MP-DEMO-005','paula.torres@senderos.demo','+54 9 261 000 1006','Perfil de prueba.'),
('Diego Salvatierra','Educación física','Rutina, cuerpo y bienestar',null,'diego.salvatierra@senderos.demo','+54 9 261 000 1007','Perfil de prueba.'),
('Dra. Laura Benegas','Asesoría legal','Orientación institucional y derivaciones legales','MP-DEMO-006','laura.benegas@senderos.demo','+54 9 261 000 1008','Perfil de prueba.'),
('Equipo de voluntariado','Voluntariado','Apoyo comunitario, talleres y acompañamiento transversal',null,'voluntariado@senderos.demo','+54 9 261 000 1009','Perfil de prueba.')
) v(full_name, role_title, specialty, license_number, email, phone, bio)
where not exists(select 1 from public.professionals p where p.email=v.email);

insert into public.patients(org_id, first_name, last_name, document_type, document_number, birth_date, gender, email, phone, address, city, province, emergency_contact_name, emergency_contact_phone, admission_status, admission_date, risk_level, notes, is_demo)
select (select id from public.organizations where cuit='30-71928002-8'), v.*
from (values
('Mateo','Roldán','DNI','99000101','1997-05-12','masculino','mateo.roldan@paciente.demo','+54 9 261 111 0001','Domicilio de prueba 1','Mendoza','Mendoza','Laura Roldán','+54 9 261 222 0001','en_tratamiento',current_date - interval '23 days','medio','Registro ficticio para demostración.',true),
('Lucía','Giménez','DNI','99000102','2001-09-04','femenino','lucia.gimenez@paciente.demo','+54 9 261 111 0002','Domicilio de prueba 2','Godoy Cruz','Mendoza','Patricia Giménez','+54 9 261 222 0002','evaluacion',current_date - interval '6 days','bajo','Registro ficticio para demostración.',true),
('Santiago','Páez','DNI','99000103','1989-11-18','masculino','santiago.paez@paciente.demo','+54 9 261 111 0003','Domicilio de prueba 3','Guaymallén','Mendoza','Elena Páez','+54 9 261 222 0003','seguimiento',current_date - interval '105 days','bajo','Registro ficticio para demostración.',true),
('Rocío','Molina','DNI','99000104','1994-01-21','femenino','rocio.molina@paciente.demo','+54 9 261 111 0004','Domicilio de prueba 4','Las Heras','Mendoza','Claudia Molina','+54 9 261 222 0004','preingreso',current_date - interval '1 day','alto','Registro ficticio para demostración.',true)
) v(first_name,last_name,document_type,document_number,birth_date,gender,email,phone,address,city,province,emergency_contact_name,emergency_contact_phone,admission_status,admission_date,risk_level,notes,is_demo)
where not exists(select 1 from public.patients p where p.document_number=v.document_number);

insert into public.patient_contacts(patient_id, full_name, relationship, phone, email, is_authorized, can_access_portal, can_receive_updates, notes, is_demo)
select p.id, p.emergency_contact_name, 'Familiar referente', p.emergency_contact_phone, null, true, true, true, 'Contacto de prueba.', true
from public.patients p where p.is_demo=true and not exists(select 1 from public.patient_contacts c where c.patient_id=p.id);

insert into public.patient_programs(patient_id, program_id, responsible_professional_id, current_stage, start_date, status, goals, is_demo)
select p.id, pr.id, prof.id,
case when p.first_name='Rocío' then 'Primer contacto' when p.first_name='Lucía' then 'Evaluación' when p.first_name='Santiago' then 'Seguimiento' else 'Tratamiento' end,
coalesce(p.admission_date,current_date), 'activo', 'Sostener asistencia, fortalecer red familiar y ordenar próximos pasos.', true
from public.patients p
join public.programs pr on pr.slug = case when p.first_name='Santiago' then 'reinsercion-social-laboral' when p.first_name='Lucía' then 'orientacion-tratamiento' when p.first_name='Rocío' then 'orientacion-tratamiento' else 'acompanamiento-familiar' end
left join public.professionals prof on prof.email='martin.quiroga@senderos.demo'
where p.is_demo=true
on conflict do nothing;

insert into public.appointments(org_id, patient_id, professional_id, program_id, appointment_type_id, location_id, room_id, start_at, end_at, status, modality, reason, attendance_status, notes, is_demo)
select (select id from public.organizations where cuit='30-71928002-8'), p.id, prof.id, pp.program_id, at.id, l.id, r.id,
(date_trunc('day', now()) + offs.start_offset)::timestamptz,
(date_trunc('day', now()) + offs.end_offset)::timestamptz,
offs.status, offs.modality, offs.reason, null, 'Turno de prueba.', true
from public.patients p
join public.patient_programs pp on pp.patient_id=p.id
join public.professionals prof on prof.email = case when p.first_name='Lucía' then 'valeria.moreno@senderos.demo' when p.first_name='Santiago' then 'ana.rivas@senderos.demo' when p.first_name='Rocío' then 'martin.quiroga@senderos.demo' else 'martin.quiroga@senderos.demo' end
join public.appointment_types at on at.name = case when p.first_name='Rocío' then 'Orientación inicial' when p.first_name='Lucía' then 'Evaluación interdisciplinaria' when p.first_name='Santiago' then 'Acompañamiento familiar' else 'Terapia individual' end
join public.locations l on l.name='Sede Mendoza'
join public.rooms r on r.location_id=l.id and r.name = case when p.first_name='Santiago' then 'Sala familiar' when p.first_name='Rocío' then 'Consultorio psicológico' else 'Consultorio psicológico' end
join lateral (select 
case when p.first_name='Mateo' then interval '1 day 10 hours' when p.first_name='Lucía' then interval '2 days 9 hours' when p.first_name='Santiago' then interval '3 days 15 hours' else interval '1 day 16 hours' end as start_offset,
case when p.first_name='Mateo' then interval '1 day 10 hours 50 minutes' when p.first_name='Lucía' then interval '2 days 10 hours' when p.first_name='Santiago' then interval '3 days 16 hours' else interval '1 day 16 hours 45 minutes' end as end_offset,
'confirmado'::text as status,
case when p.first_name='Rocío' then 'online' else 'presencial' end as modality,
case when p.first_name='Rocío' then 'Primer contacto' else 'Seguimiento del proceso' end as reason
) offs on true
where p.is_demo=true and not exists(select 1 from public.appointments a where a.patient_id=p.id and a.is_demo=true);

insert into public.clinical_entries(patient_id, professional_id, appointment_id, program_id, entry_type, title, body, status, visibility, signed_at, is_demo)
select p.id, prof.id, null, pp.program_id,
case when p.first_name='Rocío' then 'primer_contacto' when p.first_name='Lucía' then 'evaluacion_interdisciplinaria' else 'evolucion_individual' end,
case when p.first_name='Rocío' then 'Primer contacto' when p.first_name='Lucía' then 'Evaluación inicial' else 'Evolución de seguimiento' end,
'Registro de prueba. No corresponde a una persona real.\n\nMotivo: validar el uso del sistema con los programas y áreas que figuran en la web institucional.\n\nPróximo paso: confirmar turno, revisar documentación y sostener contacto con referente autorizado.',
'signed','internal_clinical', now() - interval '1 day', true
from public.patients p
join public.patient_programs pp on pp.patient_id=p.id
left join public.professionals prof on prof.email='martin.quiroga@senderos.demo'
where p.is_demo=true and not exists(select 1 from public.clinical_entries ce where ce.patient_id=p.id and ce.is_demo=true);

insert into public.patient_documents(patient_id, document_type_id, title, file_path, mime_type, size_bytes, visibility, status, is_demo)
select p.id, dt.id, 'Consentimiento informado', null, 'application/pdf', 0, 'private_administrative', 'pendiente_de_carga', true
from public.patients p
join public.document_types dt on dt.name='Consentimiento informado'
where p.is_demo=true and not exists(select 1 from public.patient_documents d where d.patient_id=p.id and d.title='Consentimiento informado');

insert into public.portal_document_releases(document_id, patient_id, released_to, active)
select d.id, d.patient_id, 'patient', true
from public.patient_documents d
join public.patients p on p.id=d.patient_id
where p.is_demo=true
  and d.title='Consentimiento informado'
  and not exists(select 1 from public.portal_document_releases r where r.document_id=d.id and r.patient_id=d.patient_id);

insert into public.portal_requests(patient_id, request_type, subject, message, status, is_demo)
select p.id, 'turno', 'Consulta por próximo turno', 'Solicitud de prueba visible desde el portal del paciente.', 'pendiente', true
from public.patients p
where p.document_number='99000101'
  and not exists(select 1 from public.portal_requests r where r.patient_id=p.id and r.is_demo=true);

insert into public.financial_movements(org_id, patient_id, movement_type, category, description, amount, currency, method, status, movement_date, is_demo)
select (select id from public.organizations where cuit='30-71928002-8'), p.id, 'ingreso', 'aporte familiar', 'Aporte de prueba para visualizar el módulo financiero.', 35000, 'ARS', 'transferencia', 'registrado', current_date - interval '3 days', true
from public.patients p
where p.is_demo=true and p.first_name='Mateo' and not exists(select 1 from public.financial_movements f where f.patient_id=p.id and f.is_demo=true);

insert into public.audit_logs(action, entity_table, entity_id, patient_id, metadata, risk_level)
select 'SEED_DEMO_DATA','patients',p.id,p.id,jsonb_build_object('message','Carga demo inicial'), 'normal'
from public.patients p where p.is_demo=true and not exists(select 1 from public.audit_logs a where a.action='SEED_DEMO_DATA' and a.patient_id=p.id);
