import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  Download, 
  Printer, 
  Share2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { EquipmentDetails as EquipmentDetailsComponent } from '../components/equipment/EquipmentDetails';
import { EquipmentUsageTracker } from '../components/equipment/EquipmentUsageTracker';
import { EquipmentMaintenanceTracker } from '../components/equipment/EquipmentMaintenanceTracker';
import VehicleActionModal from '../components/VehicleActionModal';

const EquipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    equipmentId: '',
    equipmentName: ''
  });

  useEffect(() => {
    const fetchEquipmentDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('equipment')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Equipment not found');

        setEquipment(data);
      } catch (err: any) {
        console.error('Error fetching equipment details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentDetails();
  }, [id]);

  const handleEditEquipment = () => {
    if (!isAuthenticated) {
      setError('Please sign in to edit equipment');
      return;
    }
    navigate(`/app/equipment/edit/${id}`);
  };

  const handleDeleteEquipment = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to delete equipment');
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment')
        .update({ status: 'Deleted' })
        .eq('id', id);

      if (error) throw error;

      navigate('/app/equipment', {
        state: { message: 'Equipment deleted successfully', type: 'success' }
      });
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      setError(err.message);
    }
  };

  const refreshEquipmentData = async () => {
    if (!id) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Equipment not found');

      setEquipment(data);
    } catch (err: any) {
      console.error('Error refreshing equipment data:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-600">{error || 'Equipment not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/app/equipment')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">{equipment.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleEditEquipment}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={() => setDeleteModal({
              isOpen: true,
              equipmentId: equipment.id,
              equipmentName: equipment.name
            })}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <EquipmentDetailsComponent equipment={equipment} />
      
      {id && (
        <>
          <EquipmentUsageTracker 
            equipmentId={id} 
            onUpdate={refreshEquipmentData} 
          />
          
          <EquipmentMaintenanceTracker 
            equipmentId={id} 
            onUpdate={refreshEquipmentData} 
          />
        </>
      )}

      <VehicleActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, equipmentId: '', equipmentName: '' })}
        onConfirm={handleDeleteEquipment}
        title="Delete Equipment"
        message={`Are you sure you want to delete ${deleteModal.equipmentName}? This action cannot be undone.`}
        confirmText="Delete Equipment"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default EquipmentDetails;