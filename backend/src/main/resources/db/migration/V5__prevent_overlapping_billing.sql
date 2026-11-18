CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE invoices ADD CONSTRAINT invoices_no_overlap EXCLUDE USING gist (
 student_id WITH =,
 daterange(competence,(competence + period_months * INTERVAL '1 month')::date,'[)') WITH &&
);
