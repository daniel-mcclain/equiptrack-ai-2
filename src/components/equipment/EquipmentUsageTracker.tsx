import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  LogIn, 
  AlertCircle, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useEquipmentUsage } from '../../hooks/useEquipmentUsage';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface EquipmentUsageTrackerProps {
  equipmentId: string;
  onUpdate: () => void;
}

const CONDITION_OPTIONS = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Damaged'
];

export const EquipmentUsageTracker: React.FC<EquipmentUsageTrackerProps> = ({ 
  equipmentId, 
  onUpdate 
}) => {
  const { isAuthenticated } = useAuth();
  const { 
    usageHistory, 
    currentUsage, 
    loading, 
    error, 
    checkOut, 
    checkIn, 
    refreshData 
  } = useEquipmentUsage(equipmentId, isAuthenticated);

  const [isExpanded, setIsExpanded] = useState(true);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState({
    userId: '',
    departmentId: '',
    purpose: '',
    expectedReturnDate: '',
    notes: ''
  });
  const [checkinData, setCheckinData] = useState({
    condition: 'Good',
    notes: ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchUsers = async () => {
      if (!isAuthenticated) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('status', 'active')
          .order('last_name');
          
        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, [isAuthenticated]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!checkoutData.userId) {
      setFormError('Please select a user');
      return;
    }
    
    if (!checkoutData.purpose) {
      setFormError('Please specify a purpose');
      return;
    }
    
    try {
      await checkOut({
        equipmentId,
        userId: checkoutData.userId,
        departmentId: checkoutData.departmentId || undefined,
        purpose: checkoutData.purpose,
        expectedReturnDate: checkoutData.expectedReturnDate || undefined,
        notes: checkoutData.notes || undefined
      });
      
      setShowCheckoutForm(false);
      setCheckoutData({
        userId: '',
        departmentId: '',
        purpose: '',
        expectedReturnDate: '',
        notes: ''
      });
      onUpdate();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!currentUsage) {
      setFormError('No active usage found');
      return;
    }
    
    try {
      await checkIn(
        currentUsage.id,
        checkinData.condition,
        checkinData.notes
      );
      
      setShowCheckinForm(false);
      setCheckinData({
        condition: 'Good',
        notes: ''
      });
      onUpdate();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none"
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 mr-2" />
          ) : (
            <ChevronDown className="h-5 w-5 mr-2" />
          )}
          <span className="font-medium">Usage Tracking</span>
        </button>
        
        {!isExpanded && (
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="text-gray-500">Current Status:</span>{' '}
              <span className="font-medium text-gray-900">
                {currentUsage ? 'Checked Out' : 'Available'}
              </span>
            </div>
            {currentUsage && (
              <div>
                <span className="text-gray-500">Checked Out By:</span>{' '}
                <span className="font-medium text-gray-900">
                  {currentUsage.user.first_name} {currentUsage.user.last_name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600">{formError}</p>
                <button
                  onClick={() => setFormError(null)}
                  className="ml-auto text-red-400 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Current Status</h3>
                {!currentUsage ? (
                  <button
                    onClick={() => setShowCheckoutForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    disabled={showCheckoutForm}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Check Out
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCheckinForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                    disabled={showCheckinForm}
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Check In
                  </button>
                )}
              </div>

              {currentUsage ? (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-700">Checked Out By</p>
                        <p className="text-sm text-blue-900">
                          {currentUsage.user.first_name} {currentUsage.user.last_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-700">Checkout Date</p>
                        <p className="text-sm text-blue-900">{formatDate(currentUsage.checkout_date)}</p>
                      </div>
                    </div>
                    
                    {currentUsage.expected_return_date && (
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">Expected Return</p>
                          <p className="text-sm text-blue-900">{formatDate(currentUsage.expected_return_date)}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-700">Duration</p>
                        <p className="text-sm text-blue-900">
                          {formatDuration(currentUsage.checkout_date, null)}
                        </p>
                      </div>
                    </div>
                    
                    {currentUsage.department && (
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">Department</p>
                          <p className="text-sm text-blue-900">{currentUsage.department.name}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <FileText className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-700">Purpose</p>
                        <p className="text-sm text-blue-900">{currentUsage.purpose}</p>
                      </div>
                    </div>
                    
                    {currentUsage.notes && (
                      <div className="flex items-start md:col-span-2">
                        <FileText className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">Notes</p>
                          <p className="text-sm text-blue-900">{currentUsage.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-green-800">
                      This equipment is currently available for use.
                    </p>
                  </div>
                </div>
              )}

              {showCheckoutForm && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Check Out Equipment</h4>
                  <form onSubmit={handleCheckout} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                          User
                        </label>
                        <select
                          id="userId"
                          value={checkoutData.userId}
                          onChange={(e) => setCheckoutData(prev => ({ ...prev, userId: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select user</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">
                          Department (Optional)
                        </label>
                        <select
                          id="departmentId"
                          value={checkoutData.departmentId}
                          onChange={(e) => setCheckoutData(prev => ({ ...prev, departmentId: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select department</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
                          Purpose
                        </label>
                        <input
                          type="text"
                          id="purpose"
                          value={checkoutData.purpose}
                          onChange={(e) => setCheckoutData(prev => ({ ...prev, purpose: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="expectedReturnDate" className="block text-sm font-medium text-gray-700">
                          Expected Return Date (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          id="expectedReturnDate"
                          value={checkoutData.expectedReturnDate}
                          onChange={(e) => setCheckoutData(prev => ({ ...prev, expectedReturnDate: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes (Optional)
                        </label>
                        <textarea
                          id="notes"
                          value={checkoutData.notes}
                          onChange={(e) => setCheckoutData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCheckoutForm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                      >
                        Check Out
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showCheckinForm && currentUsage && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Check In Equipment</h4>
                  <form onSubmit={handleCheckin} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                          Condition at Return
                        </label>
                        <select
                          id="condition"
                          value={checkinData.condition}
                          onChange={(e) => setCheckinData(prev => ({ ...prev, condition: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        >
                          {CONDITION_OPTIONS.map(condition => (
                            <option key={condition} value={condition}>
                              {condition}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="checkinNotes" className="block text-sm font-medium text-gray-700">
                          Notes (Optional)
                        </label>
                        <textarea
                          id="checkinNotes"
                          value={checkinData.notes}
                          onChange={(e) => setCheckinData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Describe any issues or observations about the equipment condition"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCheckinForm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
                      >
                        Check In
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Usage History</h3>
              
              {usageHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Checkout Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purpose
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Condition
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usageHistory.map(usage => (
                        <tr key={usage.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {usage.user.first_name} {usage.user.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(usage.checkout_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {usage.return_date ? formatDate(usage.return_date) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(usage.checkout_date, usage.return_date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {usage.purpose}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {usage.condition_at_return ? (
                              <span className={clsx(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                usage.condition_at_return === 'Excellent' ? 'bg-green-100 text-green-800' :
                                usage.condition_at_return === 'Good' ? 'bg-green-100 text-green-800' :
                                usage.condition_at_return === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                                usage.condition_at_return === 'Poor' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              )}>
                                {usage.condition_at_return}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No usage history found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};