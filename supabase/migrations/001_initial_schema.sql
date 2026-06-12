-- VoxField Phase 1: Initial schema (TRD §8)
-- UP migration

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('TECHNICIAN', 'SUPERVISOR');

CREATE TYPE public.equipment_status AS ENUM (
  'ACTIVE',
  'UNDER_MAINTENANCE',
  'RETIRED'
);

CREATE TYPE public.inspection_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE public.inspection_status AS ENUM (
  'OPEN',
  'REVIEWED',
  'CLOSED'
);

CREATE TYPE public.work_order_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE public.work_order_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'CLOSED'
);

CREATE TYPE public.alert_severity AS ENUM ('HIGH', 'CRITICAL');

CREATE TYPE public.alert_status AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED'
);

-- ---------------------------------------------------------------------------
-- Utility: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users (linked to auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'TECHNICIAN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_email ON public.users (email);

-- ---------------------------------------------------------------------------
-- equipment
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100),
  installation_date DATE,
  status public.equipment_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER equipment_set_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_equipment_code ON public.equipment (equipment_code);
CREATE INDEX idx_equipment_status ON public.equipment (status);

-- ---------------------------------------------------------------------------
-- repair_history
-- ---------------------------------------------------------------------------
CREATE TABLE public.repair_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment (id) ON DELETE RESTRICT,
  repair_date DATE NOT NULL,
  failure_type VARCHAR(100) NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  repair_duration_hours DECIMAL(5, 2),
  cost DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER repair_history_set_updated_at
  BEFORE UPDATE ON public.repair_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_repair_history_equipment_id ON public.repair_history (equipment_id);
CREATE INDEX idx_repair_history_repair_date ON public.repair_history (repair_date DESC);

-- ---------------------------------------------------------------------------
-- inspection_reports
-- ---------------------------------------------------------------------------
CREATE TABLE public.inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment (id) ON DELETE RESTRICT,
  technician_id UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT,
  severity public.inspection_severity NOT NULL,
  status public.inspection_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER inspection_reports_set_updated_at
  BEFORE UPDATE ON public.inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_inspection_reports_technician_id ON public.inspection_reports (technician_id);
CREATE INDEX idx_inspection_reports_equipment_id ON public.inspection_reports (equipment_id);
CREATE INDEX idx_inspection_reports_severity ON public.inspection_reports (severity);
CREATE INDEX idx_inspection_reports_status ON public.inspection_reports (status);
CREATE INDEX idx_inspection_reports_created_at ON public.inspection_reports (created_at DESC);

-- ---------------------------------------------------------------------------
-- work_orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number VARCHAR(20) NOT NULL UNIQUE,
  equipment_id UUID NOT NULL REFERENCES public.equipment (id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES public.users (id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority public.work_order_priority NOT NULL,
  status public.work_order_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TRIGGER work_orders_set_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_work_orders_created_by ON public.work_orders (created_by);
CREATE INDEX idx_work_orders_assigned_to ON public.work_orders (assigned_to);
CREATE INDEX idx_work_orders_status ON public.work_orders (status);
CREATE INDEX idx_work_orders_priority ON public.work_orders (priority);
CREATE INDEX idx_work_orders_created_at ON public.work_orders (created_at DESC);

-- ---------------------------------------------------------------------------
-- transcripts
-- ---------------------------------------------------------------------------
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  user_prompt TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  tools_used TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER transcripts_set_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_transcripts_user_id ON public.transcripts (user_id);
CREATE INDEX idx_transcripts_session_id ON public.transcripts (session_id);
CREATE INDEX idx_transcripts_created_at ON public.transcripts (created_at DESC);

-- ---------------------------------------------------------------------------
-- activity_logs (immutable audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs (user_id);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs (action_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment (id) ON DELETE RESTRICT,
  inspection_report_id UUID REFERENCES public.inspection_reports (id) ON DELETE SET NULL,
  severity public.alert_severity NOT NULL,
  message TEXT NOT NULL,
  status public.alert_status NOT NULL DEFAULT 'OPEN',
  acknowledged_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TRIGGER alerts_set_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_alerts_equipment_id ON public.alerts (equipment_id);
CREATE INDEX idx_alerts_status ON public.alerts (status);
CREATE INDEX idx_alerts_severity ON public.alerts (severity);
CREATE INDEX idx_alerts_created_at ON public.alerts (created_at DESC);

-- ---------------------------------------------------------------------------
-- equipment_documents (embedding omitted — no vector DB in Phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment (id) ON DELETE RESTRICT,
  document_name VARCHAR(200) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER equipment_documents_set_updated_at
  BEFORE UPDATE ON public.equipment_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_equipment_documents_equipment_id ON public.equipment_documents (equipment_id);
