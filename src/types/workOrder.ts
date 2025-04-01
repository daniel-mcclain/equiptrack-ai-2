export interface WorkOrder {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  type: 'repair' | 'maintenance' | 'inspection' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  asset_type: 'vehicle' | 'equipment';
  asset_id: string;
  vehicle_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  parts_cost: number | null;
  labor_cost: number | null;
  notes: string | null;
  attachments: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderFormData {
  title: string;
  description?: string;
  type: WorkOrder['type'];
  priority: WorkOrder['priority'];
  asset_type: WorkOrder['asset_type'];
  asset_id: string;
  due_date?: string;
  estimated_hours?: number;
  notes?: string;
  attachments?: string[];
}

export interface WorkOrderState {
  workOrders: WorkOrder[];
  loading: boolean;
  error: string | null;
  companyId: string | null;
  refreshData: () => Promise<void>;
  addWorkOrder: (data: WorkOrderFormData) => Promise<WorkOrder>;
  updateWorkOrder: (id: string, data: Partial<WorkOrderFormData>) => Promise<WorkOrder>;
  deleteWorkOrder: (id: string) => Promise<void>;
  completeWorkOrder: (id: string) => Promise<WorkOrder>;
  cancelWorkOrder: (id: string) => Promise<WorkOrder>;
  holdWorkOrder: (id: string) => Promise<WorkOrder>;
  resumeWorkOrder: (id: string) => Promise<WorkOrder>;
}