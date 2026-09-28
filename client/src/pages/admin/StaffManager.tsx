import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  ArrowLeft,
  Monitor,
  CheckCircle,
  XCircle,
  Loader2,
  Building,
  UserCheck,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  fetchOrganizations,
  fetchCounters,
  fetchStaff,
  createStaff,
  assignStaffCounter,
  toggleStaffStatus,
} from '../../lib/api/orgApi';
import type { Organization, Counter, StaffUser } from '../../types/organization';
import { toast } from 'sonner';

export const StaffManager: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [counters, setCounters] = useState<Counter[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState<StaffUser | null>(null);
  const [targetCounterId, setTargetCounterId] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    counterId: '',
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
      const [countersData, staffData] = await Promise.all([
        fetchCounters(orgId),
        fetchStaff(orgId),
      ]);
      setCounters(countersData);
      setStaffList(staffData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load staff/counters');
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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    try {
      setIsSubmitting(true);
      await createStaff({
        organizationId: selectedOrgId,
        ...formData,
        counterId: formData.counterId || undefined,
      });
      toast.success('Staff user created successfully');
      setShowCreateModal(false);
      setFormData({ fullName: '', email: '', phone: '', password: '', counterId: '' });
      await loadData(selectedOrgId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStaff) return;

    try {
      setIsSubmitting(true);
      await assignStaffCounter(assigningStaff._id, targetCounterId || null);
      toast.success('Counter assignment updated');
      setAssigningStaff(null);
      await loadData(selectedOrgId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign counter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffUser) => {
    try {
      await toggleStaffStatus(staff._id);
      toast.success(`Staff member status updated`);
      await loadData(selectedOrgId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
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
              <Users className="w-5 h-5 text-blue-600" />
              Staff Roster &amp; Assignments
            </h1>
            <p className="text-xs text-slate-500">Add staff users and assign them to service counters</p>
          </div>
        </div>

        {selectedOrgId && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
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
        ) : staffList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 shadow-xs">
            <Users className="w-8 h-8 text-blue-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900">No Staff Members Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Create staff accounts to operate counters and serve queues.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map((staff) => {
              const counterName =
                typeof staff.counterId === 'object' ? staff.counterId?.name : 'Unassigned';
              return (
                <div
                  key={staff._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs">
                          {staff.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{staff.fullName}</h3>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{staff.email}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          staff.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Assigned Counter</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                          <Monitor className="w-3.5 h-3.5 text-blue-500" />
                          <span>{counterName}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setAssigningStaff(staff);
                          const counterIdStr =
                            typeof staff.counterId === 'object' ? staff.counterId?._id : staff.counterId;
                          setTargetCounterId(counterIdStr || '');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-semibold transition-colors"
                      >
                        Change Counter
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleStatus(staff)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title={staff.isActive ? 'Deactivate Staff' : 'Activate Staff'}
                    >
                      {staff.isActive ? (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Add Staff Member
            </h3>
            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@org.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Assign Counter (Optional)</label>
                <select
                  value={formData.counterId}
                  onChange={(e) => setFormData({ ...formData, counterId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">None / Floating Staff</option>
                  {counters.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.location ? `(${c.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  <span>Create Staff</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Counter Modal */}
      {assigningStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Assign Staff Counter</h3>
            <p className="text-xs text-slate-500">
              Select counter for <span className="font-semibold text-slate-700">{assigningStaff.fullName}</span>:
            </p>
            <form onSubmit={handleAssignCounter} className="space-y-4 text-xs">
              <select
                value={targetCounterId}
                onChange={(e) => setTargetCounterId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Unassign / No Counter</option>
                {counters.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.location ? `(${c.location})` : ''}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
