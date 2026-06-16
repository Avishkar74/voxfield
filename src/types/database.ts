export type UserRole = "TECHNICIAN" | "SUPERVISOR";

export type EquipmentStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "RETIRED";

export type InspectionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type InspectionStatus = "OPEN" | "REVIEWED" | "CLOSED";

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type WorkOrderStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type AlertSeverity = "HIGH" | "CRITICAL";

export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface User {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  equipment_code: string;
  name: string;
  location: string;
  manufacturer: string | null;
  installation_date: string | null;
  status: EquipmentStatus;
  created_at: string;
  updated_at: string;
}

export interface RepairHistory {
  id: string;
  equipment_id: string;
  repair_date: string;
  failure_type: string;
  description: string | null;
  performed_by: string | null;
  repair_duration_hours: number | null;
  cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionReport {
  id: string;
  equipment_id: string;
  technician_id: string;
  title: string;
  description: string;
  recommendation: string | null;
  severity: InspectionSeverity;
  status: InspectionStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  work_order_number: string;
  equipment_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Transcript {
  id: string;
  user_id: string;
  user_prompt: string;
  agent_response: string;
  session_id: string;
  tools_used: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  equipment_id: string;
  inspection_report_id: string | null;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  acknowledged_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface EquipmentDocument {
  id: string;
  equipment_id: string;
  document_name: string;
  document_type: string;
  document_text: string;
  created_at: string;
  updated_at: string;
}

export interface QuantityLog {
  id: string;
  asset_item: string;
  previous_quantity: number;
  updated_quantity: number;
  user_id: string;
  timestamp: string;
  source_action: string;
}

export interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  component_service: string;
  timestamp: string;
  severity: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, "id">>;
        Relationships: [];
      };
      equipment: {
        Row: Equipment;
        Insert: Omit<Equipment, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Equipment, "id">>;
        Relationships: [];
      };
      repair_history: {
        Row: RepairHistory;
        Insert: Omit<RepairHistory, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<RepairHistory, "id">>;
        Relationships: [];
      };
      inspection_reports: {
        Row: InspectionReport;
        Insert: Omit<InspectionReport, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<InspectionReport, "id">>;
        Relationships: [];
      };
      work_orders: {
        Row: WorkOrder;
        Insert: Omit<WorkOrder, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WorkOrder, "id">>;
        Relationships: [];
      };
      transcripts: {
        Row: Transcript;
        Insert: Omit<Transcript, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Transcript, "id">>;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ActivityLog, "id">>;
        Relationships: [];
      };
      alerts: {
        Row: Alert;
        Insert: Omit<Alert, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Alert, "id">>;
        Relationships: [];
      };
      equipment_documents: {
        Row: EquipmentDocument;
        Insert: Omit<EquipmentDocument, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EquipmentDocument, "id">>;
        Relationships: [];
      };
      quantity_logs: {
        Row: QuantityLog;
        Insert: Omit<QuantityLog, "id" | "timestamp"> & {
          id?: string;
          timestamp?: string;
        };
        Update: Partial<Omit<QuantityLog, "id">>;
        Relationships: [];
      };
      error_logs: {
        Row: ErrorLog;
        Insert: Omit<ErrorLog, "id" | "timestamp"> & {
          id?: string;
          timestamp?: string;
        };
        Update: Partial<Omit<ErrorLog, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      equipment_status: EquipmentStatus;
      inspection_severity: InspectionSeverity;
      inspection_status: InspectionStatus;
      work_order_priority: WorkOrderPriority;
      work_order_status: WorkOrderStatus;
      alert_severity: AlertSeverity;
      alert_status: AlertStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
