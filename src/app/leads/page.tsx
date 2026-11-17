'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  getLeads,
  createLead,
  updateLeadStatus,
  getLeadActivities,
  addLeadActivity,
  importLeadsCSV
} from '@/lib/services/leads';
import { logActivity } from '@/lib/services/activity-logs';
import { Lead, LeadStatus, LeadPriority, LeadSource, LeadActivity } from '@/types/database';
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  X,
  FileSpreadsheet,
  MessageSquare,
  Clock,
  Send,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const PIPELINE_STAGES: { key: string; label: string }[] = [
  { key: 'all', label: 'All Leads' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'quotation_sent', label: 'Quote Sent' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeStage, setActiveStage] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
  const [activityType, setActivityType] = useState<LeadActivity['activity_type']>('call');
  const [activityDesc, setActivityDesc] = useState('');

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedPreview, setCsvParsedPreview] = useState<Partial<Lead>[]>([]);
  const [csvImportErrors, setCsvImportErrors] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('b2b_inquiry');
  const [productInterest, setProductInterest] = useState('Clear Magnetic Acrylic Photo Frame');
  const [quantity, setQuantity] = useState('50');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<LeadPriority>('medium');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      loadActivities(selectedLead.id);
    }
  }, [selectedLead]);

  async function loadLeads() {
    setLoading(true);
    const res = await getLeads();
    setLeads(res.data);
    setLoading(false);
  }

  async function loadActivities(leadId: string) {
    const res = await getLeadActivities(leadId);
    setLeadActivities(res.data);
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please specify the lead name or contact person.');
      return;
    }

    const res = await createLead({
      name,
      business_name: businessName || null,
      phone: phone || null,
      email: email || null,
      source,
      product_interest: productInterest,
      quantity: parseInt(quantity, 10) || 1,
      budget: budget ? parseFloat(budget) : null,
      location: location || null,
      status: 'new',
      priority,
      notes: notes || null,
      is_demo: false,
    });

    if (res.success && res.data) {
      await logActivity({
        entity_type: 'lead',
        entity_id: res.data.id,
        action: 'lead_created',
        description: `New lead created: ${res.data.name} (${res.data.business_name || 'Retail Inquiry'})`,
        actor_type: 'user',
        actor_id: 'admin@kriatech.com',
      });
      setIsAddModalOpen(false);
      resetForm();
      loadLeads();
    } else {
      setFormError(res.error || 'Failed to create lead.');
    }
  }

  async function handleStatusChange(id: string, newStatus: LeadStatus) {
    const res = await updateLeadStatus(id, newStatus);
    if (res.success) {
      const lead = leads.find((l) => l.id === id);
      await logActivity({
        entity_type: 'lead',
        entity_id: id,
        action: 'status_changed',
        description: `Moved ${lead?.name || 'lead'} to ${newStatus}`,
        actor_type: 'user',
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
      );
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    }
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead || !activityDesc.trim()) return;

    const res = await addLeadActivity(selectedLead.id, {
      activity_type: activityType,
      description: activityDesc.trim(),
      performed_by: 'admin@kriatech.com',
    });

    if (res.success) {
      setActivityDesc('');
      loadActivities(selectedLead.id);
      await logActivity({
        entity_type: 'lead_activity',
        entity_id: selectedLead.id,
        action: 'activity_logged',
        description: `Logged ${activityType} for ${selectedLead.name}`,
        actor_type: 'user',
      });
    }
  }

  // Handle CSV file selection and client-side parsing
  function handleCsvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvImportErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setCsvImportErrors(['CSV file is empty or missing data rows.']);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const parsedRows: Partial<Lead>[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Basic CSV split respecting quotes
        const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));

        const nameIndex = headers.findIndex((h) => h === 'name');
        if (nameIndex === -1 || !values[nameIndex]) {
          errors.push(`Row ${i}: Missing contact name`);
          continue;
        }

        const getVal = (field: string) => {
          const idx = headers.findIndex((h) => h === field);
          return idx !== -1 ? values[idx] : undefined;
        };

        parsedRows.push({
          name: values[nameIndex],
          business_name: getVal('business') || getVal('business_name') || null,
          phone: getVal('phone') || null,
          email: getVal('email') || null,
          source: (getVal('source') as LeadSource) || 'b2b_inquiry',
          product_interest: getVal('product') || getVal('product_interest') || 'Clear Magnetic Acrylic Photo Frame',
          quantity: parseInt(getVal('quantity') || '1', 10) || 1,
          budget: parseFloat(getVal('budget') || '0') || null,
          location: getVal('location') || null,
          priority: (getVal('priority') as LeadPriority) || 'medium',
          notes: getVal('notes') || null,
        });
      }

      setCsvParsedPreview(parsedRows);
      setCsvImportErrors(errors);
    };
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    if (csvParsedPreview.length === 0) return;
    setImportStatus('Importing records...');

    const res = await importLeadsCSV(csvParsedPreview);
    if (res.success) {
      setImportStatus(`Successfully imported ${res.importedCount} leads!`);
      await logActivity({
        entity_type: 'lead',
        action: 'bulk_csv_imported',
        description: `Imported ${res.importedCount} leads from CSV file`,
        actor_type: 'user',
      });
      setTimeout(() => {
        setIsImportModalOpen(false);
        setCsvFile(null);
        setCsvParsedPreview([]);
        setImportStatus(null);
        loadLeads();
      }, 1500);
    } else {
      setImportStatus('Import failed. Please check errors.');
    }
  }

  function resetForm() {
    setName('');
    setBusinessName('');
    setPhone('');
    setEmail('');
    setSource('b2b_inquiry');
    setProductInterest('Clear Magnetic Acrylic Photo Frame');
    setQuantity('50');
    setBudget('');
    setLocation('');
    setPriority('medium');
    setNotes('');
    setFormError('');
  }

  // CSV Export
  function exportCSV() {
    const headers = ['Name', 'Business', 'Phone', 'Email', 'Source', 'Product', 'Quantity', 'Budget INR', 'Location', 'Status', 'Priority', 'Notes'];
    const rows = leads.map((l) => [
      `"${l.name}"`,
      `"${l.business_name || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.source}"`,
      `"${l.product_interest || ''}"`,
      l.quantity,
      l.budget || '',
      `"${l.location || ''}"`,
      `"${l.status}"`,
      `"${l.priority}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kria_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filtered = leads.filter((l) => {
    const matchesStage = activeStage === 'all' || l.status === activeStage;
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.business_name && l.business_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.product_interest && l.product_interest.toLowerCase().includes(search.toLowerCase())) ||
      (l.location && l.location.toLowerCase().includes(search.toLowerCase()));
    return matchesStage && matchesSearch;
  });

  return (
    <>
      <Header
        title="Leads & CRM Pipeline"
        subtitle="Manage prospective retail and bulk wholesale customers for KRIA TECH"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads by name, business, product, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-kria-card border border-kria-border text-xs text-white placeholder-slate-400 focus:outline-none focus:border-electric"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-kria-card hover:bg-kria-hover text-slate-300 border border-kria-border transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-electric-light" />
              Import CSV
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-kria-card hover:bg-kria-hover text-slate-300 border border-kria-border transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              Export CSV
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Pipeline Stage Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-kria-border/70">
          {PIPELINE_STAGES.map((stage) => {
            const count =
              stage.key === 'all'
                ? leads.length
                : leads.filter((l) => l.status === stage.key).length;

            return (
              <button
                key={stage.key}
                onClick={() => setActiveStage(stage.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeStage === stage.key
                    ? 'bg-kria-800 text-white border border-electric/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-kria-card'
                }`}
              >
                <span>{stage.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeStage === stage.key
                      ? 'bg-electric text-white'
                      : 'bg-kria-surface text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leads Cards */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading CRM records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-kria-card rounded-xl border border-kria-border">
            <Users className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No leads found in this pipeline view.</p>
            <p className="text-xs text-slate-500 mt-1">Click &ldquo;Add Lead&rdquo; or &ldquo;Import CSV&rdquo; to record inquiries.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-card"
              >
                {/* Left Column: Lead Info */}
                <div
                  className="space-y-1.5 flex-1 cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-white hover:text-electric-light transition-colors">
                      {lead.name}
                    </span>
                    {lead.business_name && (
                      <span className="text-xs font-medium text-electric-light">
                        • {lead.business_name}
                      </span>
                    )}
                    {lead.is_demo && <DemoBadge />}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        lead.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : lead.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {lead.priority} Priority
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {lead.phone}
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {lead.email}
                      </span>
                    )}
                    {lead.location && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {lead.location}
                      </span>
                    )}
                    <span className="text-slate-400">
                      Source: <strong className="text-slate-300 uppercase">{lead.source}</strong>
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-kria-surface p-2.5 rounded-lg border border-kria-border/60 mt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Interest: <strong className="text-white">{lead.product_interest || 'General'}</strong>
                      </span>
                      <span className="text-slate-400">
                        Qty: <strong className="text-white">{lead.quantity} units</strong>
                        {lead.budget && (
                          <> | Est. Budget: <strong className="text-emerald-400">₹{lead.budget.toLocaleString()}</strong></>
                        )}
                      </span>
                    </div>
                    {lead.notes && (
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                        {lead.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column: Stage Selector & Touchpoint Drawer Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:border-l lg:border-kria-border lg:pl-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Stage Transition
                    </label>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none ${
                        lead.status === 'won'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : lead.status === 'lost'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-kria-850 text-white border-kria-border'
                      }`}
                    >
                      <option value="new">New Inquiry</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="quotation_sent">Quotation Sent</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won (Deal Closed)</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setSelectedLead(lead)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-kria-850 hover:bg-kria-800 text-electric-light border border-kria-border transition-colors mt-4 sm:mt-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Activity History
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lead Activity & Touchpoints Drawer */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
            <div className="bg-kria-900 border-l border-kria-border w-full max-w-lg h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-kria-border">
                  <div>
                    <h2 className="text-base font-bold text-white">{selectedLead.name}</h2>
                    <p className="text-xs text-electric-light font-medium">
                      {selectedLead.business_name || 'Retail Lead'} • {selectedLead.location || 'Location Not Specified'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-kria-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Details Summary */}
                <div className="my-4 p-3.5 rounded-xl bg-kria-850 border border-kria-border text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Product Interest:</span>
                    <strong className="text-white">{selectedLead.product_interest || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order Quantity:</span>
                    <strong className="text-white">{selectedLead.quantity} units</strong>
                  </div>
                  {selectedLead.budget && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Budget:</span>
                      <strong className="text-emerald-400">₹{selectedLead.budget.toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Pipeline Stage:</span>
                    <strong className="text-electric-light uppercase">{selectedLead.status}</strong>
                  </div>
                </div>

                {/* Add Touchpoint Form */}
                <div className="mb-6 p-4 rounded-xl bg-kria-surface border border-kria-border">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-electric-light" />
                    Log Customer Touchpoint
                  </h3>
                  <form onSubmit={handleAddActivity} className="space-y-2.5">
                    <div className="flex gap-2">
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as any)}
                        className="px-3 py-1.5 rounded-lg bg-kria-850 border border-kria-border text-xs text-white"
                      >
                        <option value="call">Phone Call</option>
                        <option value="whatsapp">WhatsApp Chat</option>
                        <option value="email">Email</option>
                        <option value="quote_created">Quote Sent</option>
                        <option value="meeting">In-Person / Zoom</option>
                        <option value="note">Internal Note</option>
                      </select>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="e.g. Discussed 5x7 frame delivery timeline. Customer accepted sample quote."
                      value={activityDesc}
                      onChange={(e) => setActivityDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white shadow-glow"
                      >
                        <Send className="h-3 w-3" />
                        Log Touchpoint
                      </button>
                    </div>
                  </form>
                </div>

                {/* Touchpoint Timeline */}
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Activity History & Notes ({leadActivities.length})
                  </h3>

                  {leadActivities.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-kria-border rounded-xl">
                      No interaction touchpoints recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-kria-border">
                      {leadActivities.map((act) => (
                        <div key={act.id} className="relative pl-8 text-xs space-y-1">
                          <div className="absolute left-2 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-electric border-2 border-kria-900" />
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white capitalize font-mono text-[11px]">
                              {act.activity_type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(act.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-300 bg-kria-850 p-2.5 rounded-lg border border-kria-border/70 leading-relaxed">
                            {act.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-kria-border flex justify-end">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-kria-800 hover:bg-kria-700 text-slate-200"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-kria-900 border border-kria-border rounded-xl w-full max-w-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setCsvFile(null);
                  setCsvParsedPreview([]);
                  setCsvImportErrors([]);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet className="h-5 w-5 text-electric-light" />
                <h2 className="text-base font-bold text-white">Import Leads via CSV</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Upload a CSV spreadsheet with columns: <code className="text-slate-300 bg-kria-800 px-1 py-0.5 rounded">Name, Business, Phone, Email, Source, Quantity, Budget, Location</code>
              </p>

              {importStatus && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {importStatus}
                </div>
              )}

              {csvImportErrors.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="h-4 w-4" />
                    Validation Notices:
                  </div>
                  {csvImportErrors.map((err, i) => (
                    <p key={i} className="text-[11px]">• {err}</p>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <div className="border-2 border-dashed border-kria-border hover:border-electric/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-kria-850/50">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-xs font-semibold text-electric-light hover:underline">
                      Click to choose CSV file
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">UTF-8 encoded .csv files up to 5MB</p>
                  {csvFile && (
                    <p className="mt-2 text-xs font-semibold text-white bg-kria-800 py-1 px-2 rounded inline-block">
                      Selected: {csvFile.name}
                    </p>
                  )}
                </div>

                {/* Parsed Preview Table */}
                {csvParsedPreview.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white mb-2">
                      Validated Preview ({csvParsedPreview.length} leads ready)
                    </h3>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-kria-border bg-kria-surface">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-kria-850 text-slate-400 sticky top-0 border-b border-kria-border">
                          <tr>
                            <th className="p-2">Name</th>
                            <th className="p-2">Business</th>
                            <th className="p-2">Phone</th>
                            <th className="p-2">Product</th>
                            <th className="p-2">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-kria-border text-slate-300">
                          {csvParsedPreview.slice(0, 8).map((row, idx) => (
                            <tr key={idx} className="hover:bg-kria-850">
                              <td className="p-2 font-semibold text-white">{row.name}</td>
                              <td className="p-2 text-slate-400">{row.business_name || '-'}</td>
                              <td className="p-2">{row.phone || '-'}</td>
                              <td className="p-2 truncate max-w-[120px]">{row.product_interest}</td>
                              <td className="p-2 font-mono">{row.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-kria-border">
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setCsvFile(null);
                      setCsvParsedPreview([]);
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-kria-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={csvParsedPreview.length === 0}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-40 shadow-glow"
                  >
                    Confirm Import ({csvParsedPreview.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Lead */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-kria-900 border border-kria-border rounded-xl w-full max-w-lg shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-white mb-1">Add Lead to CRM</h2>
              <p className="text-xs text-slate-400 mb-4">
                Record new retail or wholesale inquiries with product interest.
              </p>

              {formError && (
                <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddLead} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Patel Gift Shoppe"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="contact@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Lead Source</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value as LeadSource)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    >
                      <option value="b2b_inquiry">B2B Inquiry</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="website">Website Form</option>
                      <option value="instagram">Instagram</option>
                      <option value="direct">Direct Walk-in</option>
                      <option value="referral">Referral</option>
                      <option value="trade_show">Trade Show</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as LeadPriority)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Interest</label>
                  <input
                    type="text"
                    placeholder="e.g. Clear Magnetic Acrylic Photo Frame (5x7 & 8x10)"
                    value={productInterest}
                    onChange={(e) => setProductInterest(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Qty</label>
                    <input
                      type="number"
                      placeholder="50"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Budget (₹)</label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">City / State</label>
                    <input
                      type="text"
                      placeholder="Mumbai, MH"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Requirements / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Requested sample piece sent to shop address before bulk purchase order."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-kria-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white shadow-glow"
                  >
                    Save Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
