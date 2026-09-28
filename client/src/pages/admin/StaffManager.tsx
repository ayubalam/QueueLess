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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/dashboard"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Staff Roster & Assignments
            </h1>
            <p className="text-xs text-slate-400">Add staff users and assign them to service counters</p>
          </div>
        </div>

        {selectedOrgId && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Organization Selector */}
        {organizations.length > 1 && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <Building className="w-4 h-4 text-amber-400" />
            <label className="text-xs font-medium text-slate-300">Select Organization:</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
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
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : staffList.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4">
            <Users className="w-8 h-8 text-amber-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white">No Staff Members Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Create staff accounts to operate counters and serve queues.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs inline-flex items-center gap-2"
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
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {staff.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{staff.fullName}</h3>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{staff.email}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          staff.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Assigned Counter</span>
                        <span className="font-semibold text-slate-300 flex items-center gap-1 mt-0.5">
                          <Monitor className="w-3.5 h-3.5 text-amber-400" />
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
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-semibold transition-colors"
                      >
                        Change Counter
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleToggleStatus(staff)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title={staff.isActive ? 'Deactivate Staff' : 'Activate Staff'}
                    >
                      {staff.isActive ? (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-400" />
              Add Staff Member
            </h3>
            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@org.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Assign Counter (Optional)</label>
                <select
                  value={formData.counterId}
                  onChange={(e) => setFormData({ ...formData, counterId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500"
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold inline-flex items-center gap-1.5"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Assign Staff Counter</h3>
            <p className="text-xs text-slate-400">
              Select counter for <span className="font-semibold text-slate-200">{assigningStaff.fullName}</span>:
            </p>
            <form onSubmit={handleAssignCounter} className="space-y-4 text-xs">
              <select
                value={targetCounterId}
                onChange={(e) => setTargetCounterId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-amber-500"
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold inline-flex items-center gap-1.5"
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
