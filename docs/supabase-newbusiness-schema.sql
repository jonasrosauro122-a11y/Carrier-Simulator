-- =====================================================================
-- LAVA CarrierOps - New Business Quoting Simulator
-- Requirement #12 / #14 schema: profiles, scenarios, scenario_files,
-- quote_attempts, quote_answers, gradebook, trainer_reviews (+ RLS + seed)
-- =====================================================================
-- Run this in the Supabase SQL Editor.
--
-- NOTE ON ARCHITECTURE
-- The live static app currently persists attempts/grades to the
-- carrier_* tables created by docs/supabase-setup.sql (run that file too).
-- The tables below match the documented New Business schema and are
-- provisioned and seeded so the project is ready for a future migration
-- to Supabase Auth and the normalized attempt/answer/gradebook model.
-- Use dummy data only. Never store real insured information.
-- Never place a service_role / secret key on the frontend.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text unique,
  role text default 'VA',           -- 'VA' | 'Trainer' | 'Admin'
  created_at timestamptz default now()
);

-- ---------- scenarios ----------
create table if not exists scenarios (
  id text primary key,              -- e.g. HOME-01
  scenario_order integer,
  line_of_business text,            -- 'Home' | 'Auto'
  title text,
  difficulty text,
  dummy_customer jsonb default '{}'::jsonb,
  property_reference_url text,
  scenario_data jsonb default '{}'::jsonb,
  answer_key jsonb default '{}'::jsonb,
  grading_rules jsonb default '{}'::jsonb,
  critical_miss_rules jsonb default '{}'::jsonb,
  pdf_path text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- scenario_files ----------
create table if not exists scenario_files (
  id uuid primary key default gen_random_uuid(),
  scenario_id text references scenarios(id) on delete cascade,
  file_name text,
  file_url text,
  created_at timestamptz default now()
);

-- ---------- quote_attempts ----------
create table if not exists quote_attempts (
  id uuid primary key default gen_random_uuid(),
  scenario_id text,
  trainee_name text,
  trainee_email text,
  line_of_business text,
  status text default 'In Progress', -- 'In Progress' | 'Submitted' | 'Graded'
  started_at timestamptz,
  submitted_at timestamptz,
  total_score numeric,
  pass_status text,
  critical_misses jsonb default '[]'::jsonb,
  section_scores jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ---------- quote_answers ----------
create table if not exists quote_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references quote_attempts(id) on delete cascade,
  scenario_id text,
  answers jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- gradebook ----------
create table if not exists gradebook (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references quote_attempts(id) on delete cascade,
  scenario_id text,
  trainee_name text,
  trainee_email text,
  total_score numeric,
  pass_status text,
  critical_miss_count integer default 0,
  section_scores jsonb default '[]'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- trainer_reviews ----------
create table if not exists trainer_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references quote_attempts(id) on delete cascade,
  trainer_name text,
  review_notes text,
  coaching_topics jsonb default '[]'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- indexes ----------
create index if not exists idx_scenarios_order on scenarios(scenario_order);
create index if not exists idx_attempts_email on quote_attempts(trainee_email);
create index if not exists idx_attempts_scenario on quote_attempts(scenario_id);
create index if not exists idx_gradebook_email on gradebook(trainee_email);
create index if not exists idx_answers_attempt on quote_answers(attempt_id);

-- =====================================================================
-- Row Level Security
-- Demo/training posture. For production, gate the answer_key column and
-- trainer tables behind Supabase Auth + a profiles.role = 'Trainer' check.
-- =====================================================================
alter table profiles        enable row level security;
alter table scenarios       enable row level security;
alter table scenario_files  enable row level security;
alter table quote_attempts  enable row level security;
alter table quote_answers   enable row level security;
alter table gradebook        enable row level security;
alter table trainer_reviews enable row level security;

-- Scenarios + files: readable by anyone authenticated (and anon in demo).
drop policy if exists scenarios_read on scenarios;
create policy scenarios_read on scenarios
  for select to anon, authenticated using (is_active = true);

drop policy if exists scenario_files_read on scenario_files;
create policy scenario_files_read on scenario_files
  for select to anon, authenticated using (true);

-- Trainees can insert their own attempts and answers.
drop policy if exists attempts_insert on quote_attempts;
create policy attempts_insert on quote_attempts
  for insert to anon, authenticated with check (true);

-- Trainees can view their own attempts (email match); demo allows anon read.
drop policy if exists attempts_select on quote_attempts;
create policy attempts_select on quote_attempts
  for select to anon, authenticated using (true);

drop policy if exists attempts_update on quote_attempts;
create policy attempts_update on quote_attempts
  for update to anon, authenticated using (true) with check (true);

drop policy if exists answers_insert on quote_answers;
create policy answers_insert on quote_answers
  for insert to anon, authenticated with check (true);

drop policy if exists answers_select on quote_answers;
create policy answers_select on quote_answers
  for select to anon, authenticated using (true);

-- Gradebook: insertable by attempt owner; viewable by trainers/admin (demo: all).
drop policy if exists gradebook_insert on gradebook;
create policy gradebook_insert on gradebook
  for insert to anon, authenticated with check (true);

drop policy if exists gradebook_select on gradebook;
create policy gradebook_select on gradebook
  for select to anon, authenticated using (true);

-- Trainer reviews: trainers/admin only in production; demo allows all.
drop policy if exists trainer_reviews_all on trainer_reviews;
create policy trainer_reviews_all on trainer_reviews
  for all to anon, authenticated using (true) with check (true);

-- Profiles
drop policy if exists profiles_all on profiles;
create policy profiles_all on profiles
  for all to anon, authenticated using (true) with check (true);

-- =====================================================================
-- Seed data for the 4 fixed scenarios (extracted from the live app).
-- =====================================================================
insert into scenarios (id, scenario_order, line_of_business, title, difficulty, dummy_customer, property_reference_url, scenario_data, answer_key, grading_rules, critical_miss_rules, pdf_path, is_active)
values (
  'HOME-01',
  1,
  'Home',
  'Dallas Primary Home - New Purchase',
  'Foundation',
  '{"name":"Adrian Brooks","coInsured":"Maya Brooks","email":"adrian.brooks.training@example.com","phone":"(214) 555-0198","dob":"1985-04-12","occupation":"Project Manager","maritalStatus":"Married"}'::jsonb,
  'https://www.zillow.com/homedetails/2708-Reagan-St-Dallas-TX-75219/26681747_zpid/',
  '{"difficulty":"Foundation","training_goal":"Verify property facts, complete the full HO3 quote intake, identify roof/claim/mortgagee details, and avoid critical data-entry misses.","summary":["Customer is buying the property as a primary residence and closing soon.","Customer wants strong coverage with replacement cost contents, water backup, service line, equipment breakdown, and identity theft.","Mortgagee evidence is needed for closing; premium will be escrowed.","One weather/wind claim must be documented as closed and repaired. No business, dogs, pool, trampoline, or Airbnb exposure."],"zillow_source":"Zillow public property reference - trainees must manually verify live page during exercise.","pdf_path":"public/scenarios/HOME-01_Dallas_Primary_Home_New_Purchase.pdf"}'::jsonb,
  '{"effective_date":"2026-07-15","expiration_date":"2027-07-15","line_of_business":"Homeowners HO3","transaction_type":"New Business","producer_code":"LAVA-001","quote_state":"TX","submission_source":"Loan Closing","insured_first":"Adrian","insured_last":"Brooks","co_insured":"Maya Brooks","email":"adrian.brooks.training@example.com","phone":"(214) 555-0198","dob":"1985-04-12","marital_status":"Married","occupation":"Project Manager","property_address":"2708 Reagan St","property_city":"Dallas","property_state":"TX","property_zip":"75219","mailing_same":"Yes","occupancy":"Primary Residence","months_occupied":"12","purchase_date":"2026-07-15","purchase_price":"575000","closing_date":"2026-07-15","zillow_verified_address":"2708 Reagan St, Dallas, TX 75219","zillow_year_built":"1930","zillow_square_feet":"2664","zillow_bedrooms":"3","zillow_bathrooms":"2","zillow_home_type":"Unknown","zillow_lot_size":"7500 sqft","zillow_roof_material":"Shake / Shingle","zillow_stories":"Unknown","zillow_mismatch_notes":"No major mismatch; Zillow home type is Unknown and must be noted.","year_built":"1930","square_feet":"2664","stories":"1","construction":"Masonry","foundation":"Pier and Beam","attached_garage":"No","replacement_cost_estimate":"525000","market_value":"562500","distance_to_coast":"Not Applicable","roof_year":"2019","roof_material":"Wood Shake","roof_shape":"Gable","roof_condition":"Good","electrical_type":"Circuit Breakers","plumbing_type":"Copper","plumbing_updated":"Partial","heating":"Central HVAC","solid_fuel":"No","protection_class":"3","fire_hydrant":"Less than 1000 ft","fire_station":"1 - 5 miles","smoke_detectors":"Yes","burglar_alarm":"None","fire_alarm":"Local","sprinkler":"No","gated_community":"No","deadbolts":"Yes","currently_insured":"Yes","prior_carrier":"Travelers","prior_expiration":"2026-07-15","years_continuous_home":"6","prior_cancel_nonrenewal":"No","claims_5yrs":"1","water_claims_5yrs":"0","liability_claims_5yrs":"0","weather_claims_5yrs":"1","repairs_completed":"Yes","coverage_a":"525000","coverage_b":"10% of A","coverage_c":"50% of A","coverage_d":"20% of A","deductible":"1000","wind_hail":"1%","hurricane_deductible":"Included","liability":"300000","medical":"5000","replacement_cost":"Yes","extended_replacement":"25%","water_backup":"25000","service_line":"Yes","equipment_breakdown":"Yes","identity_theft":"Yes","scheduled_property":"No","ordinance_law":"25%","loss_assessment":"No","home_sharing":"No","mortgagee":"Rocket Mortgage LLC","mortgagee_address":"ISAOA ATIMA, PO Box 202070, Florence, SC 29502","loan_number":"RB-071526-01","billing_method":"Mortgagee Escrow","payment_plan":"Paid in Full","escrowed":"Yes","closing_request":"Yes","paperless":"Yes","pool":"No","trampoline":"No","dogs":"No","business":"No","short_term_rental":"No","vacant":"No","brushfire":"No","flood_zone":"X / Preferred","flood_policy":"No","previous_sinkhole":"No","farm_animals":"No","rental_units":"No","open_foundation_hazards":"No","prior_fraud":"No","tax_lien_bankruptcy":"No","illegal_activity":"No","unrepaired_damage":"No","renovation_over_30":"No","roof_less_than_acceptable":"No","photos_required":"Yes - Exterior","inspection_consent":"Yes"}'::jsonb,
  '{"pass_bands":{"excellent":"90-100","passing":"80-89","needs_review":"70-79","failed":"0-69"},"critical_penalty_per_miss":3,"max_critical_penalty":25}'::jsonb,
  '{"critical_fields":["property_address","property_city","property_state","property_zip","zillow_year_built","zillow_square_feet","zillow_bedrooms","zillow_bathrooms","occupancy","claims_5yrs","weather_claims_5yrs","roof_year","coverage_a","mortgagee","loan_number","effective_date","closing_request"]}'::jsonb,
  'public/scenarios/HOME-01_Dallas_Primary_Home_New_Purchase.pdf',
  true
)
on conflict (id) do update set
  scenario_order = excluded.scenario_order,
  line_of_business = excluded.line_of_business,
  title = excluded.title,
  difficulty = excluded.difficulty,
  dummy_customer = excluded.dummy_customer,
  property_reference_url = excluded.property_reference_url,
  scenario_data = excluded.scenario_data,
  answer_key = excluded.answer_key,
  grading_rules = excluded.grading_rules,
  critical_miss_rules = excluded.critical_miss_rules,
  pdf_path = excluded.pdf_path,
  is_active = true;

insert into scenario_files (scenario_id, file_name, file_url)
values ('HOME-01', 'HOME-01_Dallas_Primary_Home_New_Purchase.pdf', '/public/scenarios/HOME-01_Dallas_Primary_Home_New_Purchase.pdf')
on conflict do nothing;

insert into scenarios (id, scenario_order, line_of_business, title, difficulty, dummy_customer, property_reference_url, scenario_data, answer_key, grading_rules, critical_miss_rules, pdf_path, is_active)
values (
  'HOME-02',
  2,
  'Home',
  'Charlotte Existing Home - Reshop / New Business',
  'Intermediate',
  '{"name":"Sofia Martin","coInsured":"Nolan Martin","email":"sofia.martin.training@example.com","phone":"(704) 555-0144","dob":"1979-11-03","occupation":"Nurse Practitioner","maritalStatus":"Married"}'::jsonb,
  'https://www.zillow.com/homedetails/1733-Piccadilly-Dr-Charlotte-NC-28211/6274260_zpid/',
  '{"difficulty":"Intermediate","training_goal":"Quote an existing homeowner account, verify Zillow facts, catch pool/fence and dog exposure, and document prior claim notes.","summary":["Customer is reshopping existing home coverage; no closing involved.","There is a fenced pool and one dog with no bite history. No trampoline or Airbnb exposure.","One closed water claim from 2023 must be documented. Repairs were completed.","No mortgagee change, but mortgagee details still need to be captured."],"zillow_source":"Zillow public property reference - trainees must manually verify live page during exercise.","pdf_path":"public/scenarios/HOME-02_Charlotte_Existing_Home_Reshop.pdf"}'::jsonb,
  '{"effective_date":"2026-08-01","expiration_date":"2027-08-01","line_of_business":"Homeowners HO5","transaction_type":"New Business","producer_code":"LAVA-001","quote_state":"NC","submission_source":"Email Request","insured_first":"Sofia","insured_last":"Martin","co_insured":"Nolan Martin","email":"sofia.martin.training@example.com","phone":"(704) 555-0144","dob":"1979-11-03","marital_status":"Married","occupation":"Nurse Practitioner","property_address":"1733 Piccadilly Dr","property_city":"Charlotte","property_state":"NC","property_zip":"28211","mailing_same":"Yes","occupancy":"Primary Residence","months_occupied":"12","purchase_date":"2025-06-05","purchase_price":"700000","zillow_verified_address":"1733 Piccadilly Dr, Charlotte, NC 28211","zillow_year_built":"1967","zillow_square_feet":"2398","zillow_bedrooms":"3","zillow_bathrooms":"3","zillow_home_type":"SingleFamily","zillow_lot_size":"0.30 Acres","zillow_roof_material":"Not listed","zillow_stories":"1","zillow_mismatch_notes":"Zillow shows 3 beds, 3 baths, 2398 sqft, built 1967; roof material not listed.","year_built":"1967","square_feet":"2398","stories":"1","construction":"Brick Veneer","foundation":"Basement - Finished","basement_sqft":"1199","attached_garage":"No","replacement_cost_estimate":"640000","market_value":"700000","distance_to_coast":"Not Applicable","roof_year":"2018","roof_material":"Architectural Shingle","roof_shape":"Hip","roof_condition":"Good","electrical_type":"Circuit Breakers","plumbing_type":"PEX","plumbing_updated":"Partial","heating":"Gas Furnace","solid_fuel":"No","protection_class":"4","fire_hydrant":"Less than 1000 ft","fire_station":"1 - 5 miles","smoke_detectors":"Yes","burglar_alarm":"Smart Home Monitoring","fire_alarm":"Local","sprinkler":"No","gated_community":"No","deadbolts":"Yes","currently_insured":"Yes","prior_carrier":"State Farm","prior_expiration":"2026-08-01","years_continuous_home":"12","prior_cancel_nonrenewal":"No","claims_5yrs":"1","water_claims_5yrs":"1","liability_claims_5yrs":"0","weather_claims_5yrs":"0","repairs_completed":"Yes","coverage_a":"640000","coverage_b":"10% of A","coverage_c":"70% of A","coverage_d":"30% of A","deductible":"2500","wind_hail":"1%","hurricane_deductible":"Included","liability":"500000","medical":"5000","replacement_cost":"Yes","extended_replacement":"50%","water_backup":"50000","service_line":"Yes","equipment_breakdown":"Yes","identity_theft":"No","scheduled_property":"Yes","ordinance_law":"25%","loss_assessment":"No","home_sharing":"No","mortgagee":"Truist Bank","mortgagee_address":"ISAOA ATIMA, PO Box 47047, Atlanta, GA 30362","loan_number":"TM-080126-02","billing_method":"Mortgagee Escrow","payment_plan":"Paid in Full","escrowed":"Yes","closing_request":"No","paperless":"Yes","pool":"Yes - fenced","trampoline":"No","dogs":"Yes - no bite history","business":"No","short_term_rental":"No","vacant":"No","brushfire":"No","flood_zone":"X / Preferred","flood_policy":"No","previous_sinkhole":"No","farm_animals":"No","rental_units":"No","open_foundation_hazards":"No","prior_fraud":"No","tax_lien_bankruptcy":"No","illegal_activity":"No","unrepaired_damage":"No","renovation_over_30":"No","roof_less_than_acceptable":"No","photos_required":"Yes - Exterior","inspection_consent":"Yes"}'::jsonb,
  '{"pass_bands":{"excellent":"90-100","passing":"80-89","needs_review":"70-79","failed":"0-69"},"critical_penalty_per_miss":3,"max_critical_penalty":25}'::jsonb,
  '{"critical_fields":["property_address","property_city","property_state","property_zip","zillow_year_built","zillow_square_feet","zillow_bedrooms","zillow_bathrooms","claims_5yrs","water_claims_5yrs","pool","dogs","roof_year","coverage_a","mortgagee","effective_date"]}'::jsonb,
  'public/scenarios/HOME-02_Charlotte_Existing_Home_Reshop.pdf',
  true
)
on conflict (id) do update set
  scenario_order = excluded.scenario_order,
  line_of_business = excluded.line_of_business,
  title = excluded.title,
  difficulty = excluded.difficulty,
  dummy_customer = excluded.dummy_customer,
  property_reference_url = excluded.property_reference_url,
  scenario_data = excluded.scenario_data,
  answer_key = excluded.answer_key,
  grading_rules = excluded.grading_rules,
  critical_miss_rules = excluded.critical_miss_rules,
  pdf_path = excluded.pdf_path,
  is_active = true;

insert into scenario_files (scenario_id, file_name, file_url)
values ('HOME-02', 'HOME-02_Charlotte_Existing_Home_Reshop.pdf', '/public/scenarios/HOME-02_Charlotte_Existing_Home_Reshop.pdf')
on conflict do nothing;

insert into scenarios (id, scenario_order, line_of_business, title, difficulty, dummy_customer, property_reference_url, scenario_data, answer_key, grading_rules, critical_miss_rules, pdf_path, is_active)
values (
  'AUTO-01',
  3,
  'Auto',
  'Two-Vehicle Family Auto - Bundle Opportunity',
  'Foundation',
  '{"name":"Marcus Rivera","coInsured":"Elena Rivera","email":"marcus.rivera.training@example.com","phone":"(602) 555-0132","dob":"1982-02-18","occupation":"Operations Supervisor","maritalStatus":"Married"}'::jsonb,
  null,
  '{"difficulty":"Foundation","training_goal":"Complete a two-vehicle household auto quote, catch prior incident details, identify lienholder, and apply bundle/discount questions correctly.","summary":["Household has two vehicles and two licensed drivers.","Vehicle 1 is financed and requires a lienholder/loss payee. Vehicle 2 is owned.","One not-at-fault accident and one comprehensive glass claim must be entered correctly.","Customer is open to bundling with home and enrolling in telematics. No rideshare, delivery, SR-22, or major violations."],"zillow_source":null,"pdf_path":"public/scenarios/AUTO-01_Two_Vehicle_Family_Auto.pdf"}'::jsonb,
  '{"effective_date":"2026-07-20","expiration_date":"2027-07-20","line_of_business":"Personal Auto","transaction_type":"New Business","producer_code":"LAVA-001","quote_state":"AZ","source":"Phone Call","insured_first":"Marcus","insured_last":"Rivera","email":"marcus.rivera.training@example.com","phone":"(602) 555-0132","dob":"1982-02-18","gender":"Male","marital_status":"Married","occupation":"Operations Supervisor","residence_type":"Own Home","mailing_address":"1489 W Desert Palm Dr","mailing_city":"Phoenix","mailing_state":"AZ","mailing_zip":"85041","garaging_same":"Yes","garaging_zip":"85041","years_at_address":"4","currently_insured":"Yes","prior_carrier":"Progressive","prior_expiration":"2026-07-20","continuous_months":"84","prior_limits":"100/300/100","lapse_days":"0","nonpay_cancel_3yrs":"No","prior_claims":"Yes","current_dec_page_ready":"Yes","vehicle_year":"2022","vehicle_make":"Toyota","vehicle_model":"Camry","vehicle_trim":"SE","vin":"4T1G11AK5NU123456","vehicle_value":"26500","ownership":"Financed","lienholder_name":"Toyota Financial Services","vehicle_use":"Commute","annual_miles":"12000","commute_miles":"15","days_per_week":"5","parking_location":"Garage","anti_theft":"Factory Tracking App","additional_vehicles":"1","all_vehicles_same_household":"Yes","any_modified_vehicle":"No","excluded_vehicle":"No","driver_first":"Marcus","driver_last":"Rivera","license_state":"AZ","license_status":"Valid","license_years":"22","driver_training":"No","good_student":"Not Applicable","defensive_driver":"No","driver_assignment":"Rated on Vehicle 1","household_members_14plus":"2","unlisted_household":"No","excluded_driver":"No","non_household_regular_driver":"No","student_away":"Not Applicable","accidents_5yrs":"0","not_at_fault_5yrs":"1","violations_5yrs":"0","major_violations_5yrs":"0","comp_claims_5yrs":"1","injury_claims":"No","license_suspension":"No","liability_limits":"100/300/100","um_uim":"Match BI Limits","medical":"5000","pip_option":"Not Applicable","comp_deductible":"500","collision_deductible":"500","rental":"40/1200","roadside":"Yes","loan_lease_gap":"Yes","oem_parts":"No","new_car_replacement":"No","multi_policy":"Yes","multi_car":"Yes","telematics":"Yes - Enroll","paperless":"Yes","auto_pay":"Yes","paid_in_full":"No","payment_plan":"Monthly EFT","billing_method":"EFT","documents_ready":"Yes","signed_forms_needed":"No","sr22":"No","salvage":"No","business_delivery":"No","out_of_state":"No","unacceptable_driver":"No","fraud_or_misrep":"No"}'::jsonb,
  '{"pass_bands":{"excellent":"90-100","passing":"80-89","needs_review":"70-79","failed":"0-69"},"critical_penalty_per_miss":3,"max_critical_penalty":25}'::jsonb,
  '{"critical_fields":["insured_first","insured_last","dob","mailing_zip","garaging_zip","prior_carrier","prior_limits","lapse_days","vehicle_year","vehicle_make","vehicle_model","vin","ownership","lienholder_name","additional_vehicles","accidents_5yrs","not_at_fault_5yrs","comp_claims_5yrs","liability_limits","um_uim","loan_lease_gap","business_delivery","sr22"]}'::jsonb,
  'public/scenarios/AUTO-01_Two_Vehicle_Family_Auto.pdf',
  true
)
on conflict (id) do update set
  scenario_order = excluded.scenario_order,
  line_of_business = excluded.line_of_business,
  title = excluded.title,
  difficulty = excluded.difficulty,
  dummy_customer = excluded.dummy_customer,
  property_reference_url = excluded.property_reference_url,
  scenario_data = excluded.scenario_data,
  answer_key = excluded.answer_key,
  grading_rules = excluded.grading_rules,
  critical_miss_rules = excluded.critical_miss_rules,
  pdf_path = excluded.pdf_path,
  is_active = true;

insert into scenario_files (scenario_id, file_name, file_url)
values ('AUTO-01', 'AUTO-01_Two_Vehicle_Family_Auto.pdf', '/public/scenarios/AUTO-01_Two_Vehicle_Family_Auto.pdf')
on conflict do nothing;

insert into scenarios (id, scenario_order, line_of_business, title, difficulty, dummy_customer, property_reference_url, scenario_data, answer_key, grading_rules, critical_miss_rules, pdf_path, is_active)
values (
  'AUTO-02',
  4,
  'Auto',
  'Single Driver Auto - Coverage Upgrade',
  'Intermediate',
  '{"name":"Kiara Thompson","email":"kiara.thompson.training@example.com","phone":"(813) 555-0188","dob":"1996-09-27","occupation":"Graphic Designer","maritalStatus":"Single"}'::jsonb,
  null,
  '{"difficulty":"Intermediate","training_goal":"Quote a single-driver auto account, identify a lapse/nonpay concern, select requested higher limits, and flag delivery/rideshare restrictions correctly.","summary":["Single driver, one owned vehicle, currently insured but had a 7-day lapse before current policy started.","Customer wants to upgrade from state minimum to stronger liability limits.","One speeding violation from 2024 must be entered. No at-fault accidents, no rideshare/delivery, no SR-22.","No lienholder, no additional vehicles, no excluded drivers."],"zillow_source":null,"pdf_path":"public/scenarios/AUTO-02_Single_Driver_Coverage_Upgrade.pdf"}'::jsonb,
  '{"effective_date":"2026-08-10","expiration_date":"2027-08-10","line_of_business":"Personal Auto","transaction_type":"New Business","producer_code":"LAVA-001","quote_state":"FL","source":"Agency Website","insured_first":"Kiara","insured_last":"Thompson","email":"kiara.thompson.training@example.com","phone":"(813) 555-0188","dob":"1996-09-27","gender":"Female","marital_status":"Single","occupation":"Graphic Designer","residence_type":"Rent","mailing_address":"8120 Bayshore Trace Apt 214","mailing_unit":"214","mailing_city":"Tampa","mailing_state":"FL","mailing_zip":"33611","garaging_same":"Yes","garaging_zip":"33611","years_at_address":"1","currently_insured":"Yes","prior_carrier":"GEICO","prior_expiration":"2026-08-10","continuous_months":"18","prior_limits":"State Minimum","lapse_days":"7","nonpay_cancel_3yrs":"No","prior_claims":"No","current_dec_page_ready":"Yes","vehicle_year":"2019","vehicle_make":"Honda","vehicle_model":"Civic","vehicle_trim":"EX","vin":"2HGFC2F74KH654321","vehicle_value":"17500","ownership":"Owned","vehicle_use":"Pleasure","annual_miles":"9000","commute_miles":"6","days_per_week":"3","parking_location":"Parking Lot","anti_theft":"Passive Alarm","additional_vehicles":"0","all_vehicles_same_household":"Yes","any_modified_vehicle":"No","excluded_vehicle":"No","driver_first":"Kiara","driver_last":"Thompson","license_state":"FL","license_status":"Valid","license_years":"10","driver_training":"No","good_student":"Not Applicable","defensive_driver":"Yes","driver_assignment":"Rated on Vehicle 1","household_members_14plus":"1","unlisted_household":"No","excluded_driver":"No","non_household_regular_driver":"No","student_away":"Not Applicable","accidents_5yrs":"0","not_at_fault_5yrs":"0","violations_5yrs":"1","major_violations_5yrs":"0","comp_claims_5yrs":"0","injury_claims":"No","license_suspension":"No","liability_limits":"100/300/100","um_uim":"Match BI Limits","medical":"10000","pip_option":"Full PIP","comp_deductible":"500","collision_deductible":"500","rental":"30/900","roadside":"No","loan_lease_gap":"No","oem_parts":"No","new_car_replacement":"No","multi_policy":"No","multi_car":"No","telematics":"Customer Declined","paperless":"Yes","auto_pay":"Yes","paid_in_full":"No","payment_plan":"Monthly EFT","billing_method":"EFT","documents_ready":"Yes","signed_forms_needed":"Yes","sr22":"No","salvage":"No","business_delivery":"No","out_of_state":"No","unacceptable_driver":"No","fraud_or_misrep":"No"}'::jsonb,
  '{"pass_bands":{"excellent":"90-100","passing":"80-89","needs_review":"70-79","failed":"0-69"},"critical_penalty_per_miss":3,"max_critical_penalty":25}'::jsonb,
  '{"critical_fields":["insured_first","insured_last","dob","mailing_zip","garaging_zip","prior_carrier","prior_limits","lapse_days","vehicle_year","vehicle_make","vehicle_model","vin","ownership","accidents_5yrs","violations_5yrs","major_violations_5yrs","liability_limits","um_uim","pip_option","business_delivery","sr22"]}'::jsonb,
  'public/scenarios/AUTO-02_Single_Driver_Coverage_Upgrade.pdf',
  true
)
on conflict (id) do update set
  scenario_order = excluded.scenario_order,
  line_of_business = excluded.line_of_business,
  title = excluded.title,
  difficulty = excluded.difficulty,
  dummy_customer = excluded.dummy_customer,
  property_reference_url = excluded.property_reference_url,
  scenario_data = excluded.scenario_data,
  answer_key = excluded.answer_key,
  grading_rules = excluded.grading_rules,
  critical_miss_rules = excluded.critical_miss_rules,
  pdf_path = excluded.pdf_path,
  is_active = true;

insert into scenario_files (scenario_id, file_name, file_url)
values ('AUTO-02', 'AUTO-02_Single_Driver_Coverage_Upgrade.pdf', '/public/scenarios/AUTO-02_Single_Driver_Coverage_Upgrade.pdf')
on conflict do nothing;


-- End of New Business schema + seed.
