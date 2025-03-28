export interface Vehicle {
  id: string;
  name: string;
  type: string;
  status: string;
  manufacturer: string;
  model: string;
  year: number;
  license_plate: string | null;
  vin: string | null;
  mileage: number;
  fuel_type: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  groups: string[];
  tags: string[];
}