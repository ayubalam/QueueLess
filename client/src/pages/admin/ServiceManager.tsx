import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  ArrowLeft,
  Clock,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Building,
  QrCode,
  Download,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  fetchOrganizations,
  fetchServices,
  createService,
  updateService,
  toggleServiceStatus,
  deleteService,
} from '../../lib/api/orgApi';
import type { Organization, Service } from '../../types/organization';
import { toast } from 'sonner';

export const ServiceManager: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [qrService, setQrService] = useState<Service | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedServiceTime: 15,
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

  const loadServices = async (orgId: string) => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const data = await fetchServices(orgId);
      setServices(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadServices(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setFormData({ name: '', description: '', estimatedServiceTime: 15 });
    setShowModal(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      estimatedServiceTime: service.estimatedServiceTime,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    try {
      setIsSubmitting(true);
      if (editingService) {
        await updateService(editingService._id, formData);
        toast.success('Service updated successfully');
      } else {
        await createService({
          organizationId: selectedOrgId,
          ...formData,
        });
        toast.success('Service created successfully');
      }
      setShowModal(false);
      await loadServices(selectedOrgId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (service: Service) => {
    try {
      const updated = await toggleServiceStatus(service._id);
      toast.success(`Service ${updated.isActive ? 'activated' : 'deactivated'}`);
      setServices((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deletingService) return;
    try {
      setIsSubmitting(true);
      await deleteService(deletingService._id);
      toast.success('Service deleted successfully');
      setDeletingService(null);
      await loadServices(selectedOrgId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrService) return;
    const canvas = document.getElementById('service-qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `${qrService.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('QR Code downloaded');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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
              <Sliders className="w-5 h-5 text-blue-600" />
              Service Management
            </h1>
            <p className="text-xs text-slate-500">Configure queue services and estimated processing times</p>
          </div>
        </div>

        {selectedOrgId && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Organization Selector */}
        {organizations.length > 1 && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <Building className="w-4 h-4 text-blue-600" />
            <label className="text-xs font-medium text-slate-700">Select Organization:</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
        ) : services.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Services Created Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Add your first service (e.g., "General Consultation", "Document Verification").
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Service</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div
                key={service._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{service.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          service.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-xs text-slate-500 mt-1">{service.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{service.estimatedServiceTime} mins est. service time</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQrService(service)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="QR Code & Public Display"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(service)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title={service.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {service.isActive ? (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(service)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Service"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingService(service)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              {editingService ? 'Edit Service' : 'Create New Service'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cash Deposit, General Consultation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Estimated Service Time (minutes) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={480}
                  value={formData.estimatedServiceTime}
                  onChange={(e) => setFormData({ ...formData, estimatedServiceTime: parseInt(e.target.value) || 15 })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Optional summary for customers..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold inline-flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{editingService ? 'Save Changes' : 'Create Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingService && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Service</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-900">{deletingService.name}</span>?
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingService(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code & Public Display Modal */}
      {qrService && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">
                QR & Public Display
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                {qrService.name}
              </h3>
              {qrService.description && (
                <p className="text-xs text-slate-500 line-clamp-2">{qrService.description}</p>
              )}
              <span className="inline-block text-[11px] font-semibold text-slate-400 mt-1">
                Estimated service: ~{qrService.estimatedServiceTime} mins
              </span>
            </div>

            {/* QR Code Canvas Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-2">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <QRCodeCanvas
                  id="service-qr-canvas"
                  value={`${window.location.origin}/join/${qrService._id}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">
                Scan to Join Queue
              </span>
              <p className="text-[10px] text-slate-400">
                Place this QR code at your entrance or front desk
              </p>
            </div>

            {/* Link & URL sharing */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                  Customer Check-In URL
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/join/${qrService._id}`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/join/${qrService._id}`, 'Join Link')}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Copy Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`/join/${qrService._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-blue-600 transition-colors"
                    title="Open Customer Join Page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div>
                <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                  Public TV / Monitor Display URL
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/public/queue/${qrService._id}`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/public/queue/${qrService._id}`, 'Display Link')}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Copy Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`/public/queue/${qrService._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-blue-600 transition-colors"
                    title="Open Public Display"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR</span>
              </button>
              <button
                type="button"
                onClick={() => setQrService(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
