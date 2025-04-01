export interface MaintenanceTemplate {
  id: string;
  company_id: string;
  name: string;
  schedule_type: string;
  description: string;
  interval_type: string;
  interval_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSchedule {
  id: string;
  vehicle_id: string;
  template_id: string;
  last_completed: string | null;
  next_due: string;
  company_id: string;
  template: MaintenanceTemplate;
  vehicle: {
    id: string;
    name: string;
    type: string;
  };
  created_at: string;
  updated_at: string;
}

export interface MaintenanceFormData {
  vehicle_id: string;
  template_id: string;
  next_due: string;
}

export interface MaintenanceTemplateFormData {
  name: string;
  schedule_type: string;
  description: string;
  interval_type: string;
  interval_value: number;
}

export interface MaintenanceState {
  templates: MaintenanceTemplate[];
  schedules: MaintenanceSchedule[];
  loading: boolean;
  error: string | null;
  companyId: string | null;
  refreshData: () => Promise<void>;
  addTemplate: (data: MaintenanceTemplateFormData) => Promise<MaintenanceTemplate>;
  updateTemplate: (id: string, data: Partial<MaintenanceTemplateFormData>) => Promise<MaintenanceTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  addSchedule: (data: MaintenanceFormData) => Promise<MaintenanceSchedule>;
  updateSchedule: (id: string, data: Partial<MaintenanceFormData>) => Promise<MaintenanceSchedule>;
  deleteSchedule: (id: string) => Promise<void>;
  completeSchedule: (id: string) => Promise<MaintenanceSchedule>;
}