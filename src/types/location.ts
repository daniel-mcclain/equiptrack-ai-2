/**
 * Represents a location entity in the system
 */
export interface Location {
  id: string;
  company_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Form data for creating or updating a location
 */
export interface LocationFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  status: 'active' | 'inactive';
}

/**
 * State for the location table component
 */
export interface LocationTableState {
  page: number;
  pageSize: number;
  filters: {
    status: string;
    city: string;
    state: string;
  };
  sort: {
    field: keyof Location;
    direction: 'asc' | 'desc';
  };
  search: string;
  selectedLocations: string[];
}

/**
 * Return type for the useLocations hook
 */
export interface UseLocationsResult {
  locations: Location[];
  loading: boolean;
  error: string | null;
  totalLocations: number;
  refreshData: () => Promise<void>;
  addLocation: (data: LocationFormData) => Promise<Location>;
  updateLocation: (id: string, data: Partial<LocationFormData>) => Promise<Location>;
  deleteLocation: (id: string) => Promise<void>;
  bulkUpdateLocations: (ids: string[], data: Partial<LocationFormData>) => Promise<void>;
}