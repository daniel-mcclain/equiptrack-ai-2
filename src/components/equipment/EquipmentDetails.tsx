import React from 'react';
import { PenTool as Tool, Calendar, Clock, MapPin, FileText, Shield, Award, AlertTriangle, Clipboard, Tag } from 'lucide-react';
import { Equipment } from '../../types/equipment';

interface EquipmentDetailsProps {
  equipment: Equipment;
}

export const EquipmentDetails: React.FC<EquipmentDetailsProps> = ({ equipment }) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'In Use':
        return 'bg-blue-100 text-blue-800';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'Out of Service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{equipment.name}</h2>
            <p className="text-gray-500">{equipment.manufacturer} {equipment.model}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(equipment.status)}`}>
            {equipment.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Tag className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="text-sm text-gray-900">{equipment.type}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clipboard className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Serial Number</p>
                  <p className="text-sm text-gray-900">{equipment.serial_number || 'Not specified'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Purchase Date</p>
                  <p className="text-sm text-gray-900">{formatDate(equipment.purchase_date)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Warranty Expiry</p>
                  <p className="text-sm text-gray-900">{formatDate(equipment.warranty_expiry)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">{equipment.location || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Information</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Tool className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Maintenance</p>
                  <p className="text-sm text-gray-900">{formatDate(equipment.last_maintenance)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Next Maintenance Due</p>
                  <p className="text-sm text-gray-900">{formatDate(equipment.next_maintenance)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {equipment.technical_specs && Object.keys(equipment.technical_specs).length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(equipment.technical_specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-gray-200">
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="text-sm text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {equipment.operating_requirements && equipment.operating_requirements.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Operating Requirements</h3>
              <ul className="space-y-2">
                {equipment.operating_requirements.map((req, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block h-5 w-5 rounded-full bg-blue-100 text-blue-500 mr-2 flex-shrink-0 text-center">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {equipment.safety_guidelines && equipment.safety_guidelines.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Safety Guidelines</h3>
              <ul className="space-y-2">
                {equipment.safety_guidelines.map((guideline, index) => (
                  <li key={index} className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{guideline}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {equipment.required_certifications && equipment.required_certifications.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Required Certifications</h3>
              <ul className="space-y-2">
                {equipment.required_certifications.map((cert, index) => (
                  <li key={index} className="flex items-start">
                    <Award className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {equipment.notes && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">{equipment.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};