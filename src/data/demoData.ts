import { addDays, subDays, subMonths, addMonths } from 'date-fns';

export interface DemoVehicle {
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
  fuel_type: string;
  last_maintenance: string | null;
  next_maintenance: string | null;
  groups: string[];
  tags: string[];
}

export interface DemoEquipment {
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
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DemoCompany {
  id: string;
  name: string;
  industry: string;
  fleet_size: number;
  subscription_tier: string;
  subscription_start_date: string;
  trial_ends_at: string | null;
  is_trial: boolean;
  max_vehicles: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface DemoPermission {
  id: string;
  role: string;
  resource: string;
  action: string;
  description: string;
}

export interface DemoTeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_url: string;
  joined_date: string;
}

export interface DemoCompanyStats {
  totalVehicles: number;
  activeVehicles: number;
  totalTeamMembers: number;
  uptime: number;
  totalMileage: number;
  fuelConsumption: number;
  maintenanceCosts: number;
  incidentCount: number;
  lastMonthStats: {
    totalTrips: number;
    totalDistance: number;
    fuelUsed: number;
    maintenanceEvents: number;
    costSavings: number;
  };
  yearlyStats: {
    totalExpenses: number;
    maintenanceCosts: number;
    fuelCosts: number;
    insuranceCosts: number;
    otherCosts: number;
  };
}

export interface DemoMaintenanceTemplate {
  id: string;
  name: string;
  schedule_type: string;
  description: string;
  interval_type: string;
  interval_value: number;
  is_active: boolean;
}

export interface DemoMaintenanceSchedule {
  id: string;
  vehicle_id: string;
  template_id: string;
  last_completed: string | null;
  next_due: string;
  template: DemoMaintenanceTemplate;
  vehicle: DemoVehicle;
}

export const DEMO_COMPANY: DemoCompany = {
  id: 'demo-company',
  name: 'Demo Fleet Solutions',
  industry: 'logistics',
  fleet_size: 25,
  subscription_tier: 'standard',
  subscription_start_date: subMonths(new Date(), 3).toISOString(),
  trial_ends_at: null,
  is_trial: false,
  max_vehicles: 50,
  contact_name: 'Demo User',
  contact_email: 'demo@example.com',
  contact_phone: '(555) 123-4567',
  street_address: '123 Demo Street',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94105'
};

export const DEMO_TEAM_MEMBERS: DemoTeamMember[] = [
  {
    id: 'tm1',
    name: 'Sarah Johnson',
    role: 'Fleet Manager',
    email: 'sarah.j@demofleet.com',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    joined_date: subMonths(new Date(), 6).toISOString()
  },
  {
    id: 'tm2',
    name: 'Michael Chen',
    role: 'Maintenance Supervisor',
    email: 'michael.c@demofleet.com',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    joined_date: subMonths(new Date(), 4).toISOString()
  },
  {
    id: 'tm3',
    name: 'Emily Rodriguez',
    role: 'Operations Coordinator',
    email: 'emily.r@demofleet.com',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
    joined_date: subMonths(new Date(), 2).toISOString()
  }
];

export const DEMO_COMPANY_STATS: DemoCompanyStats = {
  totalVehicles: 25,
  activeVehicles: 22,
  totalTeamMembers: 15,
  uptime: 94.5,
  totalMileage: 458750,
  fuelConsumption: 45200,
  maintenanceCosts: 78500,
  incidentCount: 3,
  lastMonthStats: {
    totalTrips: 850,
    totalDistance: 42500,
    fuelUsed: 3800,
    maintenanceEvents: 12,
    costSavings: 4500
  },
  yearlyStats: {
    totalExpenses: 425000,
    maintenanceCosts: 185000,
    fuelCosts: 145000,
    insuranceCosts: 65000,
    otherCosts: 30000
  }
};

export const DEMO_VEHICLES: DemoVehicle[] = [
  {
    id: 'demo-v1',
    name: 'Truck 101',
    type: 'Truck',
    status: 'Active',
    manufacturer: 'Volvo',
    model: 'VNL 860',
    year: 2023,
    license_plate: 'DEMO-101',
    vin: '1HGCM82633A123456',
    mileage: 25000,
    fuel_type: 'Diesel',
    last_maintenance: subDays(new Date(), 15).toISOString(),
    next_maintenance: addDays(new Date(), 15).toISOString(),
    groups: ['long_haul'],
    tags: ['Express', 'Heavy Load']
  },
  {
    id: 'demo-v2',
    name: 'Van 202',
    type: 'Van',
    status: 'Maintenance',
    manufacturer: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2022,
    license_plate: 'DEMO-202',
    vin: '2FMZA52233B123456',
    mileage: 45000,
    fuel_type: 'Diesel',
    last_maintenance: subDays(new Date(), 2).toISOString(),
    next_maintenance: addDays(new Date(), 1).toISOString(),
    groups: ['local_delivery'],
    tags: ['Local Delivery']
  },
  {
    id: 'demo-v3',
    name: 'Truck 303',
    type: 'Truck',
    status: 'Active',
    manufacturer: 'Peterbilt',
    model: '579',
    year: 2023,
    license_plate: 'DEMO-303',
    vin: '3VWFA21233M123456',
    mileage: 15000,
    fuel_type: 'Diesel',
    last_maintenance: subDays(new Date(), 30).toISOString(),
    next_maintenance: addDays(new Date(), 30).toISOString(),
    groups: ['refrigerated'],
    tags: ['Refrigerated', 'Long Haul']
  },
  {
    id: 'demo-v4',
    name: 'Van 404',
    type: 'Van',
    status: 'Out of Service',
    manufacturer: 'Ford',
    model: 'Transit',
    year: 2022,
    license_plate: 'DEMO-404',
    vin: '4VWFA21233M123456',
    mileage: 75000,
    fuel_type: 'Gasoline',
    last_maintenance: subDays(new Date(), 5).toISOString(),
    next_maintenance: addDays(new Date(), 2).toISOString(),
    groups: ['local_delivery'],
    tags: ['Local Delivery', 'Express']
  }
];

export const DEMO_EQUIPMENT: DemoEquipment[] = [
  {
    id: 'demo-e1',
    name: 'Forklift 101',
    type: 'Forklift',
    status: 'Available',
    manufacturer: 'Toyota',
    model: '8FGU25',
    serial_number: 'TYT-8FGU25-12345',
    purchase_date: subMonths(new Date(), 18).toISOString(),
    warranty_expiry: addMonths(new Date(), 6).toISOString(),
    location: 'Warehouse A',
    last_maintenance: subDays(new Date(), 30).toISOString(),
    next_maintenance: addDays(new Date(), 60).toISOString(),
    technical_specs: {
      capacity: '5000 lbs',
      lift_height: '189 inches',
      power_type: 'Propane',
      engine: '4Y-ECS',
      transmission: 'Automatic'
    },
    operating_requirements: ['Operator certification required', 'Indoor use only'],
    safety_guidelines: ['Daily inspection required', 'No passengers allowed', 'Maximum speed 5 mph'],
    required_certifications: ['Forklift Operator Certification'],
    notes: 'Primary warehouse forklift, scheduled for replacement in 12 months',
    company_id: 'demo-company',
    is_demo: true,
    created_at: subMonths(new Date(), 18).toISOString(),
    updated_at: subDays(new Date(), 30).toISOString()
  },
  {
    id: 'demo-e2',
    name: 'Pallet Jack 202',
    type: 'Pallet Jack',
    status: 'In Use',
    manufacturer: 'Crown',
    model: 'PTH50',
    serial_number: 'CRW-PTH50-67890',
    purchase_date: subMonths(new Date(), 24).toISOString(),
    warranty_expiry: subMonths(new Date(), 12).toISOString(),
    location: 'Warehouse B',
    last_maintenance: subDays(new Date(), 45).toISOString(),
    next_maintenance: addDays(new Date(), 45).toISOString(),
    technical_specs: {
      capacity: '5000 lbs',
      fork_length: '48 inches',
      power_type: 'Manual',
      weight: '180 lbs'
    },
    operating_requirements: ['Basic training required'],
    safety_guidelines: ['Check load stability before lifting', 'Do not exceed capacity'],
    required_certifications: null,
    notes: 'Used primarily in shipping area',
    company_id: 'demo-company',
    is_demo: true,
    created_at: subMonths(new Date(), 24).toISOString(),
    updated_at: subDays(new Date(), 45).toISOString()
  },
  {
    id: 'demo-e3',
    name: 'Generator 303',
    type: 'Generator',
    status: 'Maintenance',
    manufacturer: 'Caterpillar',
    model: 'D125-6',
    serial_number: 'CAT-D125-54321',
    purchase_date: subMonths(new Date(), 36).toISOString(),
    warranty_expiry: subMonths(new Date(), 24).toISOString(),
    location: 'Maintenance Shop',
    last_maintenance: subDays(new Date(), 5).toISOString(),
    next_maintenance: addDays(new Date(), 2).toISOString(),
    technical_specs: {
      power_output: '125 kW',
      voltage: '480V',
      fuel_type: 'Diesel',
      tank_capacity: '300 gallons',
      runtime: '24 hours at full load'
    },
    operating_requirements: ['Outdoor use only', 'Regular fuel checks'],
    safety_guidelines: ['Keep clear of exhaust', 'Proper grounding required', 'No smoking near generator'],
    required_certifications: ['Electrical Safety Training'],
    notes: 'Backup power for main warehouse, currently undergoing maintenance for fuel system issues',
    company_id: 'demo-company',
    is_demo: true,
    created_at: subMonths(new Date(), 36).toISOString(),
    updated_at: subDays(new Date(), 5).toISOString()
  },
  {
    id: 'demo-e4',
    name: 'Scissor Lift 404',
    type: 'Lift',
    status: 'Available',
    manufacturer: 'JLG',
    model: '1930ES',
    serial_number: 'JLG-1930ES-98765',
    purchase_date: subMonths(new Date(), 12).toISOString(),
    warranty_expiry: addMonths(new Date(), 12).toISOString(),
    location: 'Warehouse A',
    last_maintenance: subDays(new Date(), 15).toISOString(),
    next_maintenance: addDays(new Date(), 75).toISOString(),
    technical_specs: {
      platform_height: '19 ft',
      capacity: '500 lbs',
      power_type: 'Electric',
      weight: '2750 lbs',
      dimensions: '30" x 72"'
    },
    operating_requirements: ['Indoor use only', 'Charge after each use'],
    safety_guidelines: ['Wear harness at all times', 'Check for overhead obstructions', 'No leaning over railings'],
    required_certifications: ['Aerial Lift Certification'],
    notes: 'Used for inventory management and light maintenance',
    company_id: 'demo-company',
    is_demo: true,
    created_at: subMonths(new Date(), 12).toISOString(),
    updated_at: subDays(new Date(), 15).toISOString()
  },
  {
    id: 'demo-e5',
    name: 'Pressure Washer 505',
    type: 'Cleaning Equipment',
    status: 'Out of Service',
    manufacturer: 'Kärcher',
    model: 'HD 3.5/30',
    serial_number: 'KAR-HD3530-24680',
    purchase_date: subMonths(new Date(), 30).toISOString(),
    warranty_expiry: subMonths(new Date(), 18).toISOString(),
    location: 'Maintenance Shop',
    last_maintenance: subDays(new Date(), 60).toISOString(),
    next_maintenance: null,
    technical_specs: {
      pressure: '3000 PSI',
      flow_rate: '3.5 GPM',
      power_type: 'Electric',
      hose_length: '50 ft'
    },
    operating_requirements: ['Water connection required', 'Circuit: 20A minimum'],
    safety_guidelines: ['Wear eye protection', 'Never point at people', 'Secure work area'],
    required_certifications: null,
    notes: 'Pump failure, awaiting replacement parts',
    company_id: 'demo-company',
    is_demo: true,
    created_at: subMonths(new Date(), 30).toISOString(),
    updated_at: subDays(new Date(), 3).toISOString()
  }
];

export const DEMO_MAINTENANCE_TEMPLATES = [
  {
    id: 'demo-t1',
    name: 'Regular Service',
    schedule_type: 'Preventive Maintenance',
    description: 'Regular preventive maintenance check including oil change, fluid levels, brake inspection, and tire rotation',
    interval_type: 'days',
    interval_value: 30,
    is_active: true
  },
  {
    id: 'demo-t2',
    name: 'Oil Change',
    schedule_type: 'Oil Change',
    description: 'Standard oil change service with filter replacement',
    interval_type: 'miles',
    interval_value: 5000,
    is_active: true
  },
  {
    id: 'demo-t3',
    name: 'Brake Inspection',
    schedule_type: 'Safety Check',
    description: 'Comprehensive brake system inspection and maintenance',
    interval_type: 'miles',
    interval_value: 15000,
    is_active: true
  },
  {
    id: 'demo-t4',
    name: 'Annual DOT Inspection',
    schedule_type: 'Regulatory',
    description: 'Department of Transportation required annual vehicle inspection',
    interval_type: 'days',
    interval_value: 365,
    is_active: true
  },
  {
    id: 'demo-t5',
    name: 'Tire Rotation',
    schedule_type: 'Tire Service',
    description: 'Regular tire rotation and pressure check',
    interval_type: 'miles',
    interval_value: 7500,
    is_active: true
  }
];

export const DEMO_MAINTENANCE_SCHEDULES = [
  {
    id: 'demo-m1',
    vehicle_id: 'demo-v1',
    template_id: 'demo-t1',
    last_completed: subDays(new Date(), 15).toISOString(),
    next_due: addDays(new Date(), 15).toISOString(),
    template: DEMO_MAINTENANCE_TEMPLATES[0],
    vehicle: DEMO_VEHICLES[0]
  },
  {
    id: 'demo-m2',
    vehicle_id: 'demo-v2',
    template_id: 'demo-t2',
    last_completed: subDays(new Date(), 2).toISOString(),
    next_due: addDays(new Date(), 1).toISOString(),
    template: DEMO_MAINTENANCE_TEMPLATES[1],
    vehicle: DEMO_VEHICLES[1]
  },
  {
    id: 'demo-m3',
    vehicle_id: 'demo-v3',
    template_id: 'demo-t3',
    last_completed: subDays(new Date(), 45).toISOString(),
    next_due: addDays(new Date(), 5).toISOString(),
    template: DEMO_MAINTENANCE_TEMPLATES[2],
    vehicle: DEMO_VEHICLES[2]
  },
  {
    id: 'demo-m4',
    vehicle_id: 'demo-v1',
    template_id: 'demo-t4',
    last_completed: subDays(new Date(), 180).toISOString(),
    next_due: addDays(new Date(), 185).toISOString(),
    template: DEMO_MAINTENANCE_TEMPLATES[3],
    vehicle: DEMO_VEHICLES[0]
  },
  {
    id: 'demo-m5',
    vehicle_id: 'demo-v2',
    template_id: 'demo-t5',
    last_completed: subDays(new Date(), 10).toISOString(),
    next_due: addDays(new Date(), 20).toISOString(),
    template: DEMO_MAINTENANCE_TEMPLATES[4],
    vehicle: DEMO_VEHICLES[1]
  }
];

export const DEMO_ACTIVITY = [
  {
    id: 'demo-a1',
    type: 'maintenance',
    vehicle_id: 'demo-v1',
    description: 'Completed regular maintenance check',
    date: subDays(new Date(), 15).toISOString(),
    vehicle: DEMO_VEHICLES[0]
  },
  {
    id: 'demo-a2',
    type: 'status',
    vehicle_id: 'demo-v2',
    description: 'Vehicle status changed to Maintenance',
    date: subDays(new Date(), 2).toISOString(),
    vehicle: DEMO_VEHICLES[1]
  },
  {
    id: 'demo-a3',
    type: 'assignment',
    vehicle_id: 'demo-v3',
    description: 'Assigned to new route: LA-SF Express',
    date: subDays(new Date(), 1).toISOString(),
    vehicle: DEMO_VEHICLES[2]
  }
];

export const DEMO_STATS = {
  totalVehicles: DEMO_VEHICLES.length,
  activeVehicles: DEMO_VEHICLES.filter(v => v.status === 'Active').length,
  maintenanceDue: DEMO_VEHICLES.filter(v => v.status === 'Maintenance').length,
  uptime: 92.5,
  totalMileage: DEMO_VEHICLES.reduce((acc, v) => acc + v.mileage, 0),
  fuelConsumption: 2850,
  maintenanceCosts: 12500,
  incidentCount: 2
};

export const DEMO_PERMISSIONS: DemoPermission[] = [
  // Admin permissions
  { id: 'p1', role: 'admin', resource: 'vehicles', action: 'view', description: 'View all vehicles' },
  { id: 'p2', role: 'admin', resource: 'vehicles', action: 'create', description: 'Create new vehicles' },
  { id: 'p3', role: 'admin', resource: 'vehicles', action: 'edit', description: 'Edit vehicle details' },
  { id: 'p4', role: 'admin', resource: 'vehicles', action: 'delete', description: 'Delete vehicles' },
  { id: 'p5', role: 'admin', resource: 'maintenance', action: 'view', description: 'View maintenance records' },
  { id: 'p6', role: 'admin', resource: 'maintenance', action: 'create', description: 'Create maintenance records' },
  { id: 'p7', role: 'admin', resource: 'maintenance', action: 'edit', description: 'Edit maintenance records' },
  { id: 'p8', role: 'admin', resource: 'settings', action: 'view', description: 'View system settings' },
  { id: 'p9', role: 'admin', resource: 'settings', action: 'edit', description: 'Edit system settings' },

  // Manager permissions
  { id: 'p10', role: 'manager', resource: 'vehicles', action: 'view', description: 'View all vehicles' },
  { id: 'p11', role: 'manager', resource: 'vehicles', action: 'edit', description: 'Edit vehicle details' },
  { id: 'p12', role: 'manager', resource: 'maintenance', action: 'view', description: 'View maintenance records' },
  { id: 'p13', role: 'manager', resource: 'maintenance', action: 'create', description: 'Create maintenance records' },
  { id: 'p14', role: 'manager', resource: 'reports', action: 'view', description: 'View reports' },

  // Operator permissions
  { id: 'p15', role: 'operator', resource: 'vehicles', action: 'view', description: 'View assigned vehicles' },
  { id: 'p16', role: 'operator', resource: 'maintenance', action: 'view', description: 'View maintenance schedules' },
  { id: 'p17', role: 'operator', resource: 'maintenance', action: 'create', description: 'Report maintenance issues' },

  // Maintenance staff permissions
  { id: 'p18', role: 'maintenance', resource: 'vehicles', action: 'view', description: 'View vehicle details' },
  { id: 'p19', role: 'maintenance', resource: 'maintenance', action: 'view', description: 'View maintenance records' },
  { id: 'p20', role: 'maintenance', resource: 'maintenance', action: 'create', description: 'Create maintenance records' },
  { id: 'p21', role: 'maintenance', resource: 'maintenance', action: 'edit', description: 'Update maintenance records' },

  // Viewer permissions
  { id: 'p22', role: 'viewer', resource: 'vehicles', action: 'view', description: 'View vehicle list' },
  { id: 'p23', role: 'viewer', resource: 'maintenance', action: 'view', description: 'View maintenance schedules' },
  { id: 'p24', role: 'viewer', resource: 'reports', action: 'view', description: 'View basic reports' }
];