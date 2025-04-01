import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Plus, AlertCircle, X, Edit2, Trash2, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMaintenance } from '../hooks/useMaintenance';
import type { MaintenanceTemplate, MaintenanceSchedule } from '../types/maintenance';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const INTERVAL_TYPES = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'miles', label: 'Miles' },
  { value: 'hours', label: 'Hours' },
];

const SCHEDULE_TYPES = [
  'Oil Change',
  'Tire Rotation',
  'Brake Inspection',
  'General Service',
  'Safety Inspection',
  'Preventive Maintenance',
  'Major Service',
  'Custom'
];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: MaintenanceSchedule;
}

const Maintenance = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const { isAuthenticated, isLoading, selectedCompanyId, isGlobalAdmin } = useAuth();
  const { 
    templates,
    schedules,
    loading,
    error,
    companyId,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    completeSchedule
  } = useMaintenance(isAuthenticated, isLoading, selectedCompanyId, isGlobalAdmin);

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    schedule_type: '',
    description: '',
    interval_type: 'days',
    interval_value: 30,
  });

  const [assignFormData, setAssignFormData] = useState({
    vehicle_id: '',
    template_id: '',
    next_due: new Date().toISOString().split('T')[0],
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedSchedule(event.resource);
    setActiveTab('schedules');
    
    setAssignFormData({
      vehicle_id: event.resource.vehicle_id,
      template_id: event.resource.template_id,
      next_due: new Date(event.resource.next_due).toISOString().split('T')[0]
    });
  };

  const calendarEvents = schedules.map(schedule => ({
    id: schedule.id,
    title: `${schedule.vehicle.name} - ${schedule.template.name}`,
    start: new Date(schedule.next_due),
    end: new Date(schedule.next_due),
    resource: schedule,
  }));

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      return;
    }

    try {
      await addTemplate(templateFormData);
      setShowTemplateForm(false);
      setTemplateFormData({
        name: '',
        schedule_type: '',
        description: '',
        interval_type: 'days',
        interval_value: 30,
      });
    } catch (err: any) {
      console.error('Error:', err);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      return;
    }

    try {
      await addSchedule(assignFormData);
      setShowAssignForm(false);
      setAssignFormData({
        vehicle_id: '',
        template_id: '',
        next_due: new Date().toISOString().split('T')[0],
      });
    } catch (err: any) {
      console.error('Error:', err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!isAuthenticated) return;
    try {
      await deleteTemplate(id);
    } catch (err: any) {
      console.error('Error:', err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!isAuthenticated) return;
    try {
      await deleteSchedule(id);
    } catch (err: any) {
      console.error('Error:', err);
    }
  };

  const handleCompleteSchedule = async (id: string) => {
    if (!isAuthenticated) return;
    try {
      await completeSchedule(id);
    } catch (err: any) {
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {!isAuthenticated && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👋 Welcome to the demo! You're viewing sample maintenance data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage maintenance schedules.
          </p>
        </div>
      )}

      {isGlobalAdmin && !selectedCompanyId && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Please select a company from the dropdown in the sidebar to view maintenance data.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <div className="flex space-x-4">
          <div className="flex rounded-lg shadow-sm">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:text-gray-900'
              } rounded-l-lg border border-gray-200`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'templates'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:text-gray-900'
              } border-t border-b border-gray-200`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'schedules'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:text-gray-900'
              } rounded-r-lg border border-gray-200`}
            >
              Schedules
            </button>
          </div>
          {activeTab === 'templates' && (
            <button
              onClick={() => setShowTemplateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Template
            </button>
          )}
          {activeTab === 'schedules' && (
            <button
              onClick={() => setShowAssignForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Assign Schedule
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {activeTab === 'calendar' ? (
            <div style={{ height: '600px' }}>
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={['month', 'week', 'day']}
                onSelectEvent={handleEventClick}
              />
            </div>
          ) : activeTab === 'templates' ? (
            <div>
              {showTemplateForm && (
                <div className="mb-6 bg-gray-50 rounded-lg p-6">
                  <form onSubmit={handleTemplateSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Template Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={templateFormData.name}
                          onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="schedule_type" className="block text-sm font-medium text-gray-700">
                          Schedule Type
                        </label>
                        <select
                          id="schedule_type"
                          name="schedule_type"
                          required
                          value={templateFormData.schedule_type}
                          onChange={(e) => setTemplateFormData(prev => ({ ...prev, schedule_type: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select type</option>
                          {SCHEDULE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          required
                          value={templateFormData.description}
                          onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="interval_value" className="block text-sm font-medium text-gray-700">
                          Interval
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="number"
                            id="interval_value"
                            name="interval_value"
                            required
                            min="1"
                            value={templateFormData.interval_value}
                            onChange={(e) => setTemplateFormData(prev => ({ ...prev, interval_value: parseInt(e.target.value) }))}
                            className="flex-1 rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <select
                            id="interval_type"
                            name="interval_type"
                            value={templateFormData.interval_type}
                            onChange={(e) => setTemplateFormData(prev => ({ ...prev, interval_type: e.target.value }))}
                            className="rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          >
                            {INTERVAL_TYPES.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowTemplateForm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Add Template
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Interval</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {templates.map(template => (
                      <tr key={template.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {template.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {template.schedule_type}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {template.description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {template.interval_value} {template.interval_type}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {/* Handle edit */}}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              {showAssignForm && (
                <div className="mb-6 bg-gray-50 rounded-lg p-6">
                  <form onSubmit={handleAssignSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700">
                          Vehicle
                        </label>
                        <select
                          id="vehicle_id"
                          name="vehicle_id"
                          required
                          value={assignFormData.vehicle_id}
                          onChange={(e) => setAssignFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select vehicle</option>
                          {/* Vehicles will be populated from parent component */}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="template_id" className="block text-sm font-medium text-gray-700">
                          Maintenance Template
                        </label>
                        <select
                          id="template_id"
                          name="template_id"
                          required
                          value={assignFormData.template_id}
                          onChange={(e) => setAssignFormData(prev => ({ ...prev, template_id: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select template</option>
                          {templates.map(template =>
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.schedule_type})
                            </option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="next_due" className="block text-sm font-medium text-gray-700">
                          Next Due Date
                        </label>
                        <input
                          type="date"
                          id="next_due"
                          name="next_due"
                          required
                          value={assignFormData.next_due}
                          onChange={(e) => setAssignFormData(prev => ({ ...prev, next_due: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowAssignForm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Assign Schedule
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vehicle</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Template</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Interval</th>
                
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Last Completed</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Next Due</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {schedules.map(schedule => (
                      <tr key={schedule.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {schedule.vehicle.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {schedule.template.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {schedule.template.schedule_type}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {schedule.template.description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {schedule.template.interval_value} {schedule.template.interval_type}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {schedule.last_completed
                            ? new Date(schedule.last_completed).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(schedule.next_due).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCompleteSchedule(schedule.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as completed"
                            >
                              <Check size={16} />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Remove schedule"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Maintenance;