import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Plus,
  ArrowLeft,
  MapPin,
  Sliders,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Building,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  fetchOrganizations,
  fetchServices,
  fetchCounters,
  createCounter,
  updateCounter,
  toggleCounterStatus,
  deleteCounter,
} from '../../lib/api/orgApi';
import type { Organization, Service, Counter } from '../../types/organization';
import { toast } from 'sonner';

export const CounterManager: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState<Counter | null>(null);
  const [deletingCounter, setDeletingCounter] = useState<Counter | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    serviceId: '',
  });

  const loadOrgs = async () => {
    try {
      setIsLoading(true);
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrgId(orgs[0]._id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (orgId: string) => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const [servicesData, countersData] = await Promise.all([
        fetchServices(orgId),
        fetchCounters(orgId),
      ]);
      setServices(servicesData);
      setCounters(countersData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load counters/services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadData(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleOpenCreateModal = () => {
    setEditingCounter(null);
    setFormData({ name: '', location: '', serviceId: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (counter: Counter) => {
    setEditingCounter(counter);
    const serviceIdStr = typeof counter.serviceId === 'object' ? counter.serviceId?._id : counter.serviceId;
    setFormData({
      name: counter.name,
      location: counter.location || '',
      serviceId: serviceIdStr || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    try {
      setIsSubmitting(true);
      if (editingCounter) {
        await updateCounter(editingCounter._id, {
          name: formData.name,
          location: formData.location,
          serviceId: formData.serviceId || undefined,
        });
        toast.success('Counter updated successfully');
      } else {
        await createCounter({
          organizationId: selectedOrgId,
          name: formData.name,
          location: formData.location,
          serviceId: formData.serviceId || undefined,
        });
        toast.success('Counter created successfully');
      }
      setShowModal(false);
      await loadData(selectedOrgId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save counter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (counter: Counter) => {
    try {
      const updated = await toggleCounterStatus(counter._id);
      toast.success(`Counter ${updated.isActive ? 'activated' : 'deactivated'}`);
      setCounters((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deletingCounter) return;
    try {
      setIsSubmitting(true);
      await deleteCounter(deletingCounter._id);
      toast.success('Counter deleted successfully');
      setDeletingCounter(null);
      await loadData(selectedOrgId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete counter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-xs px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/dashboard"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-600" />
              Counter Management
            </h1>
            <p className="text-xs text-slate-500">Configure physical/virtual service desks &amp; counters</p>
          </div>
        </div>

        {selectedOrgId && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Counter</span>
          </button>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Organization Selector */}
        {organizations.length > 1 && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <Building className="w-4 h-4 text-blue-600" />
            <label className="text-xs font-medium text-slate-600">Select Organization:</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : counters.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 shadow-xs">
            <Monitor className="w-8 h-8 text-blue-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900">No Counters Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Create counters (e.g. "Counter 1 - General Desk", "Window B") to serve your customers.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Counter</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {counters.map((counter) => {
              const serviceName =
                typeof counter.serviceId === 'object' ? counter.serviceId?.name : 'Unassigned';
              return (
                <div
                  key={counter._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{counter.name}</h3>
                          {counter.location && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-blue-500" />
                              <span>{counter.location}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          counter.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {counter.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Associated Service</span>
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mt-1">
                        <Sliders className="w-3.5 h-3.5 text-blue-500" />
                        <span>{serviceName}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleStatus(counter)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title={counter.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {counter.isActive ? (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(counter)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Counter"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCounter(counter)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Counter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              {editingCounter ? 'Edit Counter' : 'Create New Counter'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Counter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter 1, Window A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Location / Floor</label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, Main Lobby"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Associate Service (Optional)</label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">None / Unassigned</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} (~{s.estimatedServiceTime} mins)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{editingCounter ? 'Save Changes' : 'Create Counter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCounter && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Counter</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">{deletingCounter.name}</span>?
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCounter(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs inline-flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
