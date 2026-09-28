import React, { useState, useEffect } from 'react';
import {
  Building,
  Save,
  Plus,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  toggleOrganizationStatus,
} from '../../lib/api/orgApi';
import type { Organization } from '../../types/organization';
import { toast } from 'sonner';

export const OrganizationManager: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    category: 'Healthcare',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0]);
        setFormData({
          name: orgs[0].name || '',
          description: orgs[0].description || '',
          address: orgs[0].address || '',
          phone: orgs[0].phone || '',
          email: orgs[0].email || '',
          category: orgs[0].category || 'Healthcare',
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load organization data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const newOrg = await createOrganization(formData);
      toast.success('Organization created successfully');
      setShowCreateModal(false);
      await loadData();
      setSelectedOrg(newOrg);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      setIsSubmitting(true);
      const updated = await updateOrganization(selectedOrg._id, formData);
      toast.success('Organization updated successfully');
      setSelectedOrg(updated);
      setOrganizations((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedOrg) return;
    try {
      const updated = await toggleOrganizationStatus(selectedOrg._id);
      toast.success(`Organization ${updated.isActive ? 'activated' : 'deactivated'}`);
      setSelectedOrg(updated);
      setOrganizations((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/dashboard"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Organization Management
            </h1>
            <p className="text-xs text-slate-500">Manage your business details and profile</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : organizations.length === 0 ? (
          /* Empty State - No Organization Yet */
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">No Organization Registered</h2>
              <p className="text-xs text-slate-500 mt-1">
                Set up your organization to start managing services, counters, and queues.
              </p>
            </div>
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  address: '',
                  phone: '',
                  email: '',
                  category: 'Healthcare',
                });
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Organization</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left sidebar listing */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Organizations</span>
                <button
                  onClick={() => {
                    setFormData({
                      name: '',
                      description: '',
                      address: '',
                      phone: '',
                      email: '',
                      category: 'Healthcare',
                    });
                    setShowCreateModal(true);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => {
                      setSelectedOrg(org);
                      setFormData({
                        name: org.name || '',
                        description: org.description || '',
                        address: org.address || '',
                        phone: org.phone || '',
                        email: org.email || '',
                        category: org.category || 'Healthcare',
                      });
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      selectedOrg?._id === org._id
                        ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{org.name}</p>
                      <p className="text-[10px] text-slate-500">{org.category}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        org.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main org profile editor */}
            {selectedOrg && (
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selectedOrg.name}</h2>
                    <p className="text-xs text-slate-500">Organization Settings & Contact Details</p>
                  </div>
                  <button
                    onClick={handleToggleStatus}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      selectedOrg.isActive
                        ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                        : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {selectedOrg.isActive ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                </div>

                <form onSubmit={handleUpdateOrg} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Organization Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="Healthcare">Healthcare / Hospital</option>
                        <option value="Banking">Banking & Financial Services</option>
                        <option value="Government">Government & Civic Services</option>
                        <option value="Retail">Retail & Customer Service</option>
                        <option value="Education">Education & University</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief overview of services provided..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Address</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Phone</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>Email</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Create New Organization
            </h3>
            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Healthcare">Healthcare / Hospital</option>
                  <option value="Banking">Banking & Financial Services</option>
                  <option value="Government">Government & Civic Services</option>
                  <option value="Retail">Retail & Customer Service</option>
                  <option value="Education">Education & University</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
