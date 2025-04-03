export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: string;
  manufacturer: string;
  model: string;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  location: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  technical_specs: Record<string, any> | null;
  operating_requirements: string[] | null;
  safety_guidelines: string[] | null;
  required_certifications: string[] | null;
  notes: string | null;
  company_id: string | null;
  is_demo: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentUsage {
  id: string;
  equipment_id: string;
  user_id: string;
  department_id: string | null;
  checkout_date: string;
  return_date: string | null;
  expected_return_date: string | null;
  purpose: string;
  notes: string | null;
  condition_at_return: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  asset_type: 'equipment' | 'vehicle';
  maintenance_type: string;
  description: string;
  cost: number;
  performed_by: string;
  performed_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentFormData {
  name: string;
  type: string;
  status: string;
  manufacturer: string;
  model: string;
  serial_number?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  location?: string;
  technical_specs?: Record<string, any>;
  operating_requirements?: string[];
  safety_guidelines?: string[];
  required_certifications?: string[];
  notes?: string;
}