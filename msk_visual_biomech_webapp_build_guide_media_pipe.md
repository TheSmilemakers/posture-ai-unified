# MSK Visual Biomechanic Webapp — Build Guide (MediaPipe)

**Goal:** A production-ready webapp to (1) collect patient data and consent, (2) capture or upload **6 static images** (front, back, left, right, front-left 45°, front-right 45°), (3) run **MediaPipe** pose analysis on-device, (4) compute deviations vs. thresholds, (5) generate a **proforma** and map deviations to a **6‑component Functional Pattern corrective regime**, (6) store results and issue a shareable report.

---

## 0) Tech Stack & Architecture

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS.
- **Pose Estimation (client-side):** `@mediapipe/tasks-vision` (PoseLandmarker, IMAGE mode). Optional WebWorker.
- **Validation & Types:** Zod + TypeScript models.
- **Backend & DB:** Supabase (PostgreSQL, Storage, Auth) or self-managed Postgres + S3.
- **Auth:** Supabase Auth (email OTP) with RLS. (Alternatives: Clerk/Auth.js).
- **File Storage:** Supabase Storage bucket `captures` (private) with signed URLs.
- **APIs:** Next.js Route Handlers (Edge compatible where possible).
- **Reports:** Server-generated HTML → PDF (Puppeteer or `@react-pdf/renderer`).
- **Observability:** Audit log table; server logs to Supabase (optional Logflare/Vercel).
- **Privacy:** Client-side landmark extraction (default). Server only receives metrics JSON + low-res thumbnails (configurable).

**High-level flow:**

1. Intake → patient profile + consent.
2. Capture/Upload 6 images → local pose analysis → landmarks + metrics JSON.
3. Deviation engine → flags + proforma JSON.
4. Regimen engine → map flags → 6-component plan.
5. Persist to DB → generate report → share link.

---

## 1) Data Model (PostgreSQL / Supabase)

### 1.1 Tables

```sql
-- 1) Users (clinicians/staff)
create table app_user (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text check (role in ('admin','clinician','assistant')) default 'clinician',
  created_at timestamptz default now()
);

-- 2) Patients
create table patient (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references app_user(id) on delete set null,
  first_name text not null,
  last_name text not null,
  dob date,
  sex text check (sex in ('M','F','Other')),
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  dominant_side text check (dominant_side in ('left','right')),
  email text,
  phone text,
  notes text,
  created_at timestamptz default now()
);

-- 3) Consents
create table consent (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patient(id) on delete cascade,
  consent_type text not null, -- e.g. 'pose_analysis','data_storage','report_share'
  consent_text text not null,
  accepted boolean not null,
  accepted_at timestamptz default now(),
  ip_address inet,
  user_agent text
);

-- 4) Assessments
create table assessment (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patient(id) on delete cascade,
  created_by uuid references app_user(id) on delete set null,
  context text, -- 'baseline','ergonomics','followup#2'
  status text check (status in ('draft','analyzed','final')) default 'draft',
  height_px int, -- reference of image size for normalization
  width_px int,
  created_at timestamptz default now()
);

-- 5) Captured Images (6 views)
create table capture_image (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessment(id) on delete cascade,
  view text check (view in ('front','back','left','right','diag_left','diag_right')) not null,
  storage_path text not null, -- Supabase Storage path
  thumb_path text,           -- optional low-res
  exif jsonb,                -- camera info
  captured_at timestamptz default now()
);

-- 6) Landmarks (raw)
create table landmark_set (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessment(id) on delete cascade,
  image_id uuid references capture_image(id) on delete cascade,
  view text,
  landmarks jsonb not null,  -- 33x {x,y,z,visibility}
  source text default 'mediapipe@tasks-vision',
  created_at timestamptz default now()
);

-- 7) Metrics (derived angles/distances)
create table metric (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessment(id) on delete cascade,
  image_id uuid references capture_image(id) on delete cascade,
  name text not null,        -- e.g. 'Shoulder tilt'
  value numeric not null,
  unit text,                 -- 'deg','px','%height'
  view text,
  note text,
  created_at timestamptz default now()
);

-- 8) Deviations (flags vs thresholds)
create table deviation_flag (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessment(id) on delete cascade,
  code text not null,        -- e.g. 'FHP','APT','KNEE_VALGUS_L'
  severity int check (severity between 0 and 3) default 1,
  evidence jsonb,            -- supporting metrics
  created_at timestamptz default now()
);

-- 9) Regimen (resulting prescription)
create table regimen (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessment(id) on delete cascade,
  summary text,
  created_at timestamptz default now()
);

-- 10) Regimen Items (6 components)
create table regimen_item (
  id uuid primary key default gen_random_uuid(),
  regimen_id uuid references regimen(id) on delete cascade,
  component text check (component in (
    'gait_repattern','core_breath','posterior_chain','scap_shoulder','hip_pelvis','integrated_drills'
  )),
  title text,
  description text,
  frequency text,            -- e.g. '3x/week'
  sets_reps text,            -- e.g. '3x10'
  media jsonb                -- links to demo videos/images (optional)
);

-- 11) Audit log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_user(id) on delete set null,
  action text,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);
```

### 1.2 Indices & RLS (outline)

- Indexes on foreign keys and `(assessment_id, view)` for `capture_image`, `landmark_set`, `metric`.
- Supabase RLS policies: Clinicians only access patients they created or were shared via a join table (not shown).\* Add `patient_access` table if multi-clinic.

---

## 2) TypeScript Models (shared `/lib/types.ts`)

```ts
export type ViewTag = 'front'|'back'|'left'|'right'|'diag_left'|'diag_right';

export interface Landmark { x:number; y:number; z:number; visibility?:number }
export interface LandmarkSet { view: ViewTag; points: Record<string, Landmark> } // keyed by POSE_LANDMARK name

export interface MetricRow {
  name: string; value: number; unit: 'deg'|'px'|'%height'; view?: ViewTag; note?: string;
}

export interface DeviationFlag {
  code: string; severity: 0|1|2|3; evidence: Record<string, unknown>;
}

export interface ProformaSummary {
  patientId: string; assessmentId: string;
  metrics: MetricRow[]; deviations: DeviationFlag[];
}

export type ComponentKey =
  | 'gait_repattern' | 'core_breath' | 'posterior_chain'
  | 'scap_shoulder'  | 'hip_pelvis'  | 'integrated_drills';

export interface RegimenItem {
  component: ComponentKey; title: string; description: string; frequency: string; sets_reps: string;
}
```

---

## 3) Thresholds & Mapping (deviation engine)

```ts
// /lib/thresholds.ts
export const TH = {
  shoulderTiltDeg: 3,           // frontal asymmetry
  hipTiltFrontalDeg: 3,
  trunkLeanDeg: 5,              // sagittal
  fwdHeadPctHeight: 0.05,       // 5% of body height (image px normalized)
  kneeHyperExtDegMin: 170,
  qAngleMale: {min:10, max:15},
  qAngleFemale: {min:15, max:20},
  footRotationDeg: 10
} as const;

// /lib/mapping.ts
import { ComponentKey, DeviationFlag, RegimenItem } from './types';

export function mapFlagsToRegimen(flags: DeviationFlag[]): RegimenItem[] {
  const items: RegimenItem[] = [];
  const add = (component:ComponentKey, title:string, description:string, fr='3x/week', sr='3x10')=>
    items.push({component, title, description, frequency:fr, sets_reps:sr});

  const has = (code:string)=> flags.some(f=>f.code===code);

  if (has('FHP')) {
    add('core_breath','Chin-tuck + 360° breathing', 'Supine chin-tucks synced with nasal, diaphragmatic breathing. Maintain rib depression.');
    add('scap_shoulder','Wall slides + scapular upward rotation', 'Posterior tilt scapula, slide up wall without rib flare.');
  }
  if (has('ROUND_SHOULDERS')) {
    add('scap_shoulder','Band pull‑aparts', 'Neutral ribs, scapular retraction & depression.');
    add('posterior_chain','Hinge pattern drill', 'Hip hinge with dowel (3 points contact).');
  }
  if (has('APT')) {
    add('hip_pelvis','Half‑kneeling hip‑flexor + PPT', 'Posterior pelvic tilt; glute squeeze; avoid lumbar extension.');
    add('core_breath','Dead bug (ipsilateral reach)', 'Maintain lumbopelvic neutrality with 360° breathing.');
  }
  if (has('PPT')) {
    add('core_breath','McGill curl‑up (neutral)', 'Spine neutral; avoid posterior pelvic tuck.');
    add('posterior_chain','Glute bridge (neutral ribs)', 'Drive through heels; avoid rib flare.');
  }
  if (has('SCOLIOSIS_PATTERN') || has('PELVIC_OBLIQUITY')) {
    add('gait_repattern','Contralateral marching', 'March with core brace; level pelvis.');
    add('hip_pelvis','Lateral band walks', 'Glute med activation, maintain knee‑to‑toe line.');
  }
  if (has('KNEE_VALGUS_L') || has('KNEE_VALGUS_R')) {
    add('gait_repattern','Step‑down control', 'Track knee over 2nd toe; slow eccentric.');
    add('hip_pelvis','Clamshells / monster walks', 'Abductor strength; avoid trunk lean.');
  }
  if (has('KNEE_HYPEREXT')) {
    add('gait_repattern','Terminal knee control', 'Slight flexion bias; co‑contraction quads/hamstrings.');
    add('core_breath','Pallof press', 'Anti‑extension/rotation while maintaining soft knees.');
  }
  if (has('FOOT_ROTATION')) {
    add('gait_repattern','Foot tripod + short‑foot', 'Create tripod (1st MTP, 5th MTP, heel); align knee.');
    add('integrated_drills','Multi‑planar lunge + reach', 'Control knee‑hip‑ankle in all planes.');
  }

  return items;
}
```

---

## 4) Next.js Project Scaffolding

```bash
npx create-next-app@latest msk-visual --ts --eslint --tailwind --app
cd msk-visual
npm i zod @mediapipe/tasks-vision
# If using Supabase
npm i @supabase/supabase-js
```

**Directory sketch**

```
msk-visual/
  app/
    layout.tsx
    page.tsx                 # dashboard / recent assessments
    intake/page.tsx          # patient intake form
    capture/[assessmentId]/page.tsx   # 6-view capture/upload
    analyze/[assessmentId]/page.tsx   # review metrics + flags
    
```
