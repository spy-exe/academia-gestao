BEGIN;
SET TIME ZONE 'America/Sao_Paulo';
INSERT INTO plans(id,name,price,period_months,benefits,active) VALUES
 (1001,'Essencial',139.90,1,'Musculação e orientação em todos os horários.',true),
 (1002,'Movimento',189.90,1,'Musculação, aulas coletivas e acompanhamento mensal.',true),
 (1003,'Performance',499.90,3,'Acesso completo e revisão de treinos a cada quatro semanas.',true),
 (1004,'Plano anterior',99.90,1,'Plano descontinuado, preservado no histórico.',false)
ON CONFLICT(id) DO NOTHING;
INSERT INTO students(id,name,email,phone,birth_date,enrollment_date,plan_id,active) VALUES
 (1001,'Ana Luiza Martins','ana.martins@example.test','(11) 99900-1001','1998-03-14',current_date-180,1002,true),
 (1002,'Bruno Almeida','bruno.almeida@example.test','(11) 99900-1002','1994-07-22',current_date-150,1001,true),
 (1003,'Camila Ribeiro','camila.ribeiro@example.test','(11) 99900-1003','2001-11-05',current_date-120,1003,true),
 (1004,'Diego Santos','diego.santos@example.test','(11) 99900-1004','1990-02-10',current_date-100,1002,true),
 (1005,'Elisa Costa','elisa.costa@example.test','(11) 99900-1005','1997-06-18',current_date-90,1001,true),
 (1006,'Felipe Nunes','felipe.nunes@example.test','(11) 99900-1006','1992-09-30',current_date-75,1001,true),
 (1007,'Gabriela Rocha','gabriela.rocha@example.test','(11) 99900-1007','1999-12-08',current_date-60,1002,true),
 (1008,'Henrique Dias','henrique.dias@example.test','(11) 99900-1008','1988-04-25',current_date-200,1004,false)
ON CONFLICT(id) DO NOTHING;
INSERT INTO teachers(id,name,email,phone,specialties,registration,active) VALUES
 (1001,'Marina Oliveira','marina.oliveira@example.test','(11) 99800-2001','Musculação e treinamento funcional','DEMO-1001',true),
 (1002,'Rafael Pereira','rafael.pereira@example.test','(11) 99800-2002','Força e condicionamento','DEMO-1002',true),
 (1003,'Sofia Lima','sofia.lima@example.test','(11) 99800-2003','Mobilidade e aulas coletivas','DEMO-1003',true)
ON CONFLICT(id) DO NOTHING;
INSERT INTO invoices(id,student_id,competence,due_date,amount,period_months,paid_on) VALUES
 (1001,1001,date_trunc('month',current_date)::date,current_date-8,189.90,1,current_date-5),
 (1002,1002,date_trunc('month',current_date)::date,current_date-7,139.90,1,current_date-4),
 (1003,1003,date_trunc('month',current_date)::date,current_date-6,499.90,3,current_date-3),
 (1004,1004,date_trunc('month',current_date)::date,current_date+7,189.90,1,null),
 (1005,1005,date_trunc('month',current_date)::date,current_date+5,139.90,1,null),
 (1006,1006,date_trunc('month',current_date)::date,current_date-10,139.90,1,null),
 (1007,1007,date_trunc('month',current_date)::date,current_date-4,189.90,1,null),
 (1008,1001,(date_trunc('month',current_date)-interval '1 month')::date,current_date-35,179.90,1,current_date-33)
ON CONFLICT(id) DO NOTHING;
INSERT INTO workouts(id,name,student_id,teacher_id,issued_on,notes,active) VALUES
 (1001,'Ficha A · Base de força',1001,1001,current_date-14,'Revisão programada após quatro semanas de acompanhamento.',true),
 (1002,'Ficha B · Condicionamento',1002,1002,current_date-7,'Registrar as cargas utilizadas e respeitar os intervalos.',true),
 (1003,'Ficha anterior · Adaptação',1001,1001,current_date-60,'Histórico de adaptação inicial.',false)
ON CONFLICT(id) DO NOTHING;
INSERT INTO workout_exercises(workout_id,position,name,sets,repetitions,load_kg,rest_seconds,notes) VALUES
 (1001,0,'Agachamento livre',3,'10–12',20,90,'Ajustar a execução com a professora.'),
 (1001,1,'Remada baixa',3,'12',25,60,''),
 (1001,2,'Supino com halteres',3,'10',8,60,''),
 (1002,0,'Leg press',3,'12',80,90,''),
 (1002,1,'Puxada frontal',3,'12',30,60,''),
 (1003,0,'Agachamento com peso corporal',2,'15',0,60,'Adaptação')
ON CONFLICT(workout_id,position) DO NOTHING;
INSERT INTO assessments(id,student_id,assessed_on,weight_kg,height_cm,waist_cm,chest_cm,hip_cm,notes) VALUES
 (1001,1001,current_date-60,72.40,168,80,92,101,'Registro inicial de acompanhamento.'),
 (1002,1001,current_date-30,71.20,168,78.5,91,100,'Segundo registro mensal.'),
 (1003,1001,current_date-2,70.60,168,77.5,90.5,99.5,'Registro mais recente.'),
 (1004,1002,current_date-7,84.20,179,90,102,104,'Primeira avaliação registrada.')
ON CONFLICT(id) DO NOTHING;
INSERT INTO activities(id,actor,description,occurred_at) VALUES
 (1001,'demonstração','Avaliação registrada · Ana Luiza Martins',now()-interval '2 hours'),
 (1002,'demonstração','Ficha criada · Ficha B · Condicionamento',now()-interval '90 minutes'),
 (1003,'demonstração','Pagamento registrado · Camila Ribeiro',now()-interval '45 minutes'),
 (1004,'demonstração','Aluno cadastrado · Gabriela Rocha',now()-interval '15 minutes')
ON CONFLICT(id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('plans','id'),(select max(id) from plans));
SELECT setval(pg_get_serial_sequence('students','id'),(select max(id) from students));
SELECT setval(pg_get_serial_sequence('teachers','id'),(select max(id) from teachers));
SELECT setval(pg_get_serial_sequence('invoices','id'),(select max(id) from invoices));
SELECT setval(pg_get_serial_sequence('workouts','id'),(select max(id) from workouts));
SELECT setval(pg_get_serial_sequence('assessments','id'),(select max(id) from assessments));
SELECT setval(pg_get_serial_sequence('activities','id'),(select max(id) from activities));
COMMIT;
