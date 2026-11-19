'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { getProducts, createProduct, updateProduct } from '@/lib/services/products';
import { logActivity } from '@/lib/services/activity-logs';
import { calculateWholesaleQuote } from '@/lib/services/pricing-engine';
import { Product, ProductStatus } from '@/types/database';
import {
  Plus,
  Search,
  Package,
  X,
  ShieldAlert,
  ChevronRight,
  Layers,
  Sparkles,
  Calculator,
  Check,
  Table as TableIcon,
  LayoutGrid,
  Filter,
  RefreshCw,
  Edit3,
  ShieldCheck,
  Tag,
  Info,
  Box,
  Compass,
  FileText,
  Archive,
  ArrowRight,
  SlidersHorizontal,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

type ProductTypeKey = 'all' | 'desktop_frame' | 'fridge_magnet' | 'keychain' | 'starter_kit';
type StatusFilterKey = 'all' | 'active' | 'draft' | 'archived';

interface ProductClassification {
  typeKey: 'desktop_frame' | 'fridge_magnet' | 'keychain' | 'starter_kit';
  typeLabel: string;
  badgeClass: string;
  dotColor: string;
}

function classifyProduct(product: Product): ProductClassification {
  const sku = (product.sku || '').toUpperCase();
  const cat = (product.category || '').toLowerCase();

  if (sku === 'KRA-KIT-DEMO24' || cat.includes('starter kit') || cat.includes('reseller')) {
    return {
      typeKey: 'starter_kit',
      typeLabel: 'Starter Kit',
      badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    };
  }
  if (sku.startsWith('KRA-KEY-') || cat.includes('keychain')) {
    return {
      typeKey: 'keychain',
      typeLabel: 'Keychain',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      dotColor: 'bg-amber-400',
    };
  }
  if (
    sku.startsWith('KRA-REC-') ||
    sku.startsWith('KRA-SQU-') ||
    sku.startsWith('KRA-CIR-') ||
    sku.startsWith('KRA-HRT-') ||
    cat.includes('fridge') ||
    cat.includes('magnet')
  ) {
    return {
      typeKey: 'fridge_magnet',
      typeLabel: 'Fridge Magnet',
      badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
      dotColor: 'bg-sky-400',
    };
  }
  return {
    typeKey: 'desktop_frame',
    typeLabel: 'Desktop Frame',
    badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    dotColor: 'bg-indigo-400',
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & View Mode (Table is default)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductTypeKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Drawer & Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Live Calculator in Drawer
  const [calcQuantity, setCalcQuantity] = useState<number>(50);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Photo Frames');
  const [formDimensions, setFormDimensions] = useState('');
  const [formRetailPrice, setFormRetailPrice] = useState('');
  const [formBulkPrice, setFormBulkPrice] = useState('');
  const [formMinBulkQty, setFormMinBulkQty] = useState('50');
  const [formDescription, setFormDescription] = useState('');
  const [formProductionNotes, setFormProductionNotes] = useState('');
  const [formStatus, setFormStatus] = useState<ProductStatus>('draft');
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Load Products from Supabase on mount
  useEffect(() => {
    loadProducts();
    async function loadUser() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) setCurrentUserEmail(user.email);
      } catch {
        // Fallback
      }
    }
    loadUser();
  }, []);

  async function loadProducts(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await getProducts();
      if (res.error && (!res.data || res.data.length === 0)) {
        setError(res.error);
      } else {
        setProducts(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Categories list derived dynamically from database data
  const uniqueCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['all', ...cats];
  }, [products]);

  // Overview metrics
  const metrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.status === 'active').length;
    const draft = products.filter((p) => p.status === 'draft').length;
    const archived = products.filter((p) => p.status === 'archived').length;
    return { total, active, draft, archived };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        prod.name.toLowerCase().includes(search.toLowerCase()) ||
        prod.sku.toLowerCase().includes(search.toLowerCase()) ||
        (prod.dimensions && prod.dimensions.toLowerCase().includes(search.toLowerCase())) ||
        (prod.description && prod.description.toLowerCase().includes(search.toLowerCase()));

      // Type filter
      const classification = classifyProduct(prod);
      const matchesType = typeFilter === 'all' || classification.typeKey === typeFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || prod.status === statusFilter;

      // Category filter
      const matchesCategory = categoryFilter === 'all' || prod.category === categoryFilter;

      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });
  }, [products, search, typeFilter, statusFilter, categoryFilter]);

  // Handle drawer open
  function openProductDrawer(product: Product) {
    setSelectedProduct(product);
    const minQty = product.sku === 'KRA-KIT-DEMO24' ? 1 : product.min_bulk_quantity || 50;
    setCalcQuantity(minQty);
  }

  // Handle Add Product Modal
  function handleOpenAddModal() {
    setFormName('');
    setFormSku('');
    setFormCategory('Magnetic Fridge Frame (Square / Grid)');
    setFormDimensions('');
    setFormRetailPrice('');
    setFormBulkPrice('');
    setFormMinBulkQty('50');
    setFormDescription('');
    setFormProductionNotes('');
    setFormStatus('draft'); // Default to draft for safety
    setFormError('');
    setIsAddModalOpen(true);
  }

  // Handle Edit Product
  function handleOpenEditModal(product: Product) {
    setProductToEdit(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category);
    setFormDimensions(product.dimensions || '');
    setFormRetailPrice(String(product.retail_price));
    setFormBulkPrice(String(product.bulk_price));
    setFormMinBulkQty(String(product.min_bulk_quantity));
    setFormDescription(product.description || '');
    setFormProductionNotes(product.production_notes || '');
    setFormStatus(product.status);
    setFormError('');
    setIsEditModalOpen(true);
  }

  async function handleSaveNewProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formSku.trim() || !formRetailPrice || !formBulkPrice) {
      setFormError('Please fill in Name, SKU, Retail Price, and Bulk Price.');
      return;
    }

    setFormSaving(true);
    const res = await createProduct({
      name: formName.trim(),
      sku: formSku.trim().toUpperCase(),
      category: formCategory,
      dimensions: formDimensions.trim() || 'Custom Spec',
      retail_price: parseFloat(formRetailPrice),
      bulk_price: parseFloat(formBulkPrice),
      min_bulk_quantity: parseInt(formMinBulkQty, 10) || 50,
      description: formDescription.trim() || null,
      production_notes: formProductionNotes.trim() || null,
      materials: ['2mm Monolithic Cell-Cast Acrylic', 'Grade N35 Flush Neodymium Magnet'],
      available_shapes: ['Custom'],
      status: formStatus, // Safe default to draft
      is_demo: false,
    });

    setFormSaving(false);

    if (res.success && res.data) {
      await logActivity({
        entity_type: 'product',
        entity_id: res.data.sku,
        action: 'product_created',
        description: `Added product: ${res.data.name} (${res.data.sku}) with status ${res.data.status}`,
        actor_type: 'user',
        actor_id: currentUserEmail || 'user',
      });
      setIsAddModalOpen(false);
      loadProducts(true);
    } else {
      setFormError(res.error || 'Failed to save product to database.');
    }
  }

  async function handleSaveEditProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productToEdit) return;
    setFormError('');

    if (!formName.trim() || !formRetailPrice || !formBulkPrice) {
      setFormError('Name, Retail Price, and Bulk Price are required.');
      return;
    }

    setFormSaving(true);
    const updates: Partial<Product> = {
      name: formName.trim(),
      category: formCategory,
      dimensions: formDimensions.trim() || null,
      retail_price: parseFloat(formRetailPrice),
      bulk_price: parseFloat(formBulkPrice),
      min_bulk_quantity: parseInt(formMinBulkQty, 10) || 50,
      description: formDescription.trim() || null,
      production_notes: formProductionNotes.trim() || null,
      status: formStatus,
    };

    const res = await updateProduct(productToEdit.id, updates);
    setFormSaving(false);

    if (res.success && res.data) {
      await logActivity({
        entity_type: 'product',
        entity_id: res.data.sku,
        action: 'product_updated',
        description: `Updated specs for ${res.data.name} (${res.data.sku}). Status: ${res.data.status}`,
        actor_type: 'user',
        actor_id: currentUserEmail || 'user',
      });
      setIsEditModalOpen(false);
      if (selectedProduct && selectedProduct.id === res.data.id) {
        setSelectedProduct(res.data);
      }
      loadProducts(true);
    } else {
      setFormError(res.error || 'Failed to update product.');
    }
  }

  // Reset all filters
  function handleResetFilters() {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all';

  return (
    <>
      <Header
        title="Product Command Center"
        subtitle="Precision acrylic manufacturing specs, wholesale pricing matrices, and inventory control"
      />

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Liquid Glass Action Bar & Overview Metrics */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Hyderabad Fabrication Facility
                </span>
                <span className="text-xs text-slate-400 font-mono">2mm Monolithic Cast Acrylic</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                Fabrication Catalog & Wholesale Matrix
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadProducts(true)}
                disabled={refreshing}
                title="Sync from Supabase"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">Sync Data</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-glow transition-all active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>

          {/* 4 Compact Overview Metric Pills (Liquid Glass) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Metric 1: Total Catalog */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Total Products
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {metrics.total}
                </span>
                <span className="text-xs text-slate-400">SKUs tracked</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                <span>All fabrication lines & kits</span>
              </div>
            </div>

            {/* Metric 2: Active Storefront */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Active (Live)
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
                  {metrics.active}
                </span>
                <span className="text-xs text-emerald-500/80">Live Retail</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Freestanding desktop frames</span>
              </div>
            </div>

            {/* Metric 3: Draft (Staged) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Draft (Staging)
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-amber-300 tracking-tight">
                  {metrics.draft}
                </span>
                <span className="text-xs text-amber-400/80">Pending Review</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Magnets, keychains & demo kit</span>
              </div>
            </div>

            {/* Metric 4: Archived */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Archived
                </span>
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400">
                  <Archive className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-300 tracking-tight">
                  {metrics.archived}
                </span>
                <span className="text-xs text-slate-400">Retired</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                <span>Discontinued catalog items</span>
              </div>
            </div>
          </div>
        </section>

        {/* Multifaceted Filter & Controls Toolbar */}
        <section className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-lg space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, SKU, dimensions, or specs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Mode Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Product Type Filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ProductTypeKey)}
                  className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 cursor-pointer appearance-none pr-7"
                >
                  <option value="all" className="bg-slate-900 text-white">All Product Types</option>
                  <option value="desktop_frame" className="bg-slate-900 text-white">Desktop Magnetic Frames (MAPF)</option>
                  <option value="fridge_magnet" className="bg-slate-900 text-white">Magnetic Fridge Frames</option>
                  <option value="keychain" className="bg-slate-900 text-white">Dual-Sided Keychains</option>
                  <option value="starter_kit" className="bg-slate-900 text-white">Demo Starter Kits</option>
                </select>
                <ChevronRight className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilterKey)}
                  className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 cursor-pointer appearance-none pr-7"
                >
                  <option value="all" className="bg-slate-900 text-white">All Statuses</option>
                  <option value="active" className="bg-slate-900 text-white">Active Only</option>
                  <option value="draft" className="bg-slate-900 text-white">Draft Only</option>
                  <option value="archived" className="bg-slate-900 text-white">Archived</option>
                </select>
                <ChevronRight className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
              </div>

              {/* Category Filter */}
              <div className="relative hidden sm:block">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 cursor-pointer appearance-none pr-7 max-w-[200px] truncate"
                >
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
                <ChevronRight className="h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
              </div>

              {/* Reset Filters Pill */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center gap-1 transition-all"
                  title="Clear all filters"
                >
                  <X className="h-3 w-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}

              {/* Table / Grid Mode Toggle (Table as default) */}
              <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  title="Table View (Default)"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Category Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
            <span className="text-[11px] text-slate-500 font-medium mr-1 uppercase tracking-wider shrink-0">
              Filter:
            </span>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-white/[0.12] text-white border border-white/20'
                    : 'bg-white/[0.02] text-slate-400 hover:text-slate-200 border border-white/[0.05]'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </section>

        {/* Main Content Area: Loading / Error / Table / Grid */}
        {loading ? (
          <div className="p-16 text-center rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl">
            <RefreshCw className="h-8 w-8 text-cyan-400 mx-auto animate-spin mb-3" />
            <p className="text-sm font-medium text-white">Loading KRIA TECH catalog & wholesale tiers...</p>
            <p className="text-xs text-slate-500 mt-1">Connecting to live Supabase database</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 mx-auto text-rose-400" />
            <p className="text-sm font-semibold">Error loading catalog: {error}</p>
            <button
              onClick={() => loadProducts(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Sync
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center bg-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-xl space-y-3">
            <Package className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">No products match current filters.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn&apos;t find any items matching &ldquo;{search}&rdquo; with the selected status and category filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 transition-all"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* ========================================================================= */
          /* TABLE VIEW (DEFAULT): Apple-Inspired SaaS Liquid Glass Structure          */
          /* ========================================================================= */
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.03] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Product & Specification</th>
                    <th className="py-3.5 px-3">SKU</th>
                    <th className="py-3.5 px-3">Type & Line</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Retail MRP</th>
                    <th className="py-3.5 px-3 text-right">Wholesale Base</th>
                    <th className="py-3.5 px-3 text-center">MOQ</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredProducts.map((prod) => {
                    const classification = classifyProduct(prod);
                    const tiers = prod.customization_options?.wholesale_tiers;
                    const isStarterKit = prod.sku === 'KRA-KIT-DEMO24';

                    return (
                      <tr
                        key={prod.id}
                        onClick={() => openProductDrawer(prod)}
                        className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        {/* 1. Product Thumbnail & Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm group-hover:border-cyan-500/40 transition-colors">
                              {prod.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to CAD icon on broken link
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              {/* Fallback Schematic glyph */}
                              <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none -z-0">
                                {classification.typeKey === 'starter_kit' ? (
                                  <Box className="w-5 h-5 text-emerald-400/70" />
                                ) : classification.typeKey === 'keychain' ? (
                                  <Compass className="w-5 h-5 text-amber-400/70" />
                                ) : (
                                  <Layers className="w-5 h-5 text-cyan-400/70" />
                                )}
                              </div>
                            </div>

                            <div className="min-w-0 max-w-xs sm:max-w-sm">
                              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                                {prod.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {prod.dimensions || '2mm Cell-Cast Acrylic'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. SKU Monospace Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                            {prod.sku}
                          </span>
                        </td>

                        {/* 3. Product Type & Category */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${classification.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${classification.dotColor}`} />
                              {classification.typeLabel}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                              {prod.category}
                            </span>
                          </div>
                        </td>

                        {/* 4. Status Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                              prod.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : prod.status === 'draft'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                prod.status === 'active'
                                  ? 'bg-emerald-400'
                                  : prod.status === 'draft'
                                  ? 'bg-amber-400'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {prod.status}
                          </span>
                        </td>

                        {/* 5. Retail MRP */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="text-white font-semibold">₹{prod.retail_price}</span>
                          {prod.customization_options?.storefront_base_price && (
                            <span className="block text-[10px] text-slate-400">
                              Base: ₹{prod.customization_options.storefront_base_price}
                            </span>
                          )}
                        </td>

                        {/* 6. Wholesale Price */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="font-bold text-emerald-400">
                            ₹{isStarterKit ? '999' : prod.bulk_price}
                          </span>
                          {tiers ? (
                            <span className="block text-[10px] text-slate-400">
                              (₹{tiers.tier_1000} @ 1k)
                            </span>
                          ) : (
                            <span className="block text-[10px] text-slate-400">Wholesale</span>
                          )}
                        </td>

                        {/* 7. MOQ */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300">
                            {isStarterKit ? '1 kit' : `≥${prod.min_bulk_quantity} pcs`}
                          </span>
                        </td>

                        {/* 8. Action */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openProductDrawer(prod);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 group-hover:text-white bg-white/[0.02] group-hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                          >
                            <span>Specs</span>
                            <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="py-3 px-4 bg-white/[0.01] border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing <strong className="text-white">{filteredProducts.length}</strong> of{' '}
                <strong className="text-white">{products.length}</strong> total products
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> 3 Live Storefront
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-2" /> 15 Staged Drafts
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* GRID VIEW: Apple-Inspired Liquid Glass Cards                              */
          /* ========================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredProducts.map((prod) => {
              const classification = classifyProduct(prod);
              const tiers = prod.customization_options?.wholesale_tiers;
              const isStarterKit = prod.sku === 'KRA-KIT-DEMO24';

              return (
                <div
                  key={prod.id}
                  onClick={() => openProductDrawer(prod)}
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-all backdrop-blur-xl flex flex-col justify-between overflow-hidden group shadow-lg hover:shadow-cyan-500/5 cursor-pointer relative"
                >
                  {/* Card Header & Visual Media */}
                  <div>
                    <div className="h-36 w-full bg-slate-950/80 relative overflow-hidden border-b border-white/[0.08]">
                      {prod.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}

                      {/* Schematic Glass Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-3.5">
                        <div className="w-full flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-cyan-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                            {prod.sku}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md border ${
                              prod.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {prod.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${classification.badgeClass}`}
                        >
                          {classification.typeLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {prod.category}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {prod.name}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2">
                        {prod.description || 'Monolithic 2mm cell-cast acrylic with rare-earth magnetic assembly.'}
                      </p>

                      <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-300 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dimensions:</span>
                          <span className="font-medium text-slate-200">{prod.dimensions || 'Standard'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">MOQ:</span>
                          <span className="font-medium text-slate-200">
                            {isStarterKit ? '1 kit' : `${prod.min_bulk_quantity} pcs`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Pricing Footer */}
                  <div className="p-4 bg-white/[0.01] border-t border-white/[0.08] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                        Retail MRP
                      </span>
                      <strong className="text-sm font-bold text-white">₹{prod.retail_price}</strong>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                        Wholesale Base
                      </span>
                      <strong className="text-sm font-bold text-emerald-400">
                        ₹{isStarterKit ? '999' : prod.bulk_price}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PRODUCT DETAIL & LIVE CALCULATOR SIDE DRAWER                               */}
        {/* ========================================================================= */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end animate-fadeIn">
            <div className="bg-[#0B0F19] border-l border-white/[0.1] w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-6">
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/60">
                        {selectedProduct.sku}
                      </span>
                      {selectedProduct.is_demo && <DemoBadge />}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          selectedProduct.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {selectedProduct.status}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedProduct.category}</p>
                  </div>

                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.08] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Visual Image / Spec CAD Banner */}
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/90 overflow-hidden relative shadow-md">
                  <div className="h-44 w-full relative">
                    {selectedProduct.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedProduct.image_url}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
                  </div>

                  <div className="p-4 bg-white/[0.02] border-t border-white/[0.08] grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Dimensions
                      </span>
                      <strong className="text-white text-xs">
                        {selectedProduct.dimensions || '2mm Cell-Cast Acrylic'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Manufacturing Base
                      </span>
                      <strong className="text-white text-xs">Hyderabad, Telangana</strong>
                    </div>
                  </div>
                </div>

                {/* Fabrication & Material Specifications */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3 text-xs">
                  <h3 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-cyan-400" />
                    Material Architecture & Standards
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Optical Clarity</span>
                      <strong className="text-emerald-400">93% Grade-A Transparency</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Magnet Specification</span>
                      <strong className="text-cyan-300">Grade N35 Flush Countersunk</strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Materials Used</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.materials?.map((mat, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-200 border border-white/[0.08] text-[11px]"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedProduct.production_notes && (
                    <div className="pt-2 border-t border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Shop Floor Production Protocol
                      </span>
                      <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-black/40 p-2.5 rounded-xl border border-white/[0.06]">
                        {selectedProduct.production_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* 5-Tier Authoritative Wholesale Price Matrix */}
                {selectedProduct.customization_options?.wholesale_tiers && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-emerald-400" />
                        5-Tier Wholesale Matrix (Authoritative)
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">No % Approximations</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.08] text-slate-400 text-[10px] uppercase">
                            <th className="py-2 px-2">Wholesale Tier</th>
                            <th className="py-2 px-2 text-right">Unit Price</th>
                            <th className="py-2 px-2 text-right">VIP Program</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05] text-[11px]">
                          <tr>
                            <td className="py-2 px-2 text-slate-300">Storefront Base (&lt;50)</td>
                            <td className="py-2 px-2 text-right font-medium text-slate-300">
                              ₹{selectedProduct.customization_options.wholesale_tiers.storefront_base}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-400">—</td>
                          </tr>
                          <tr className="bg-emerald-500/5">
                            <td className="py-2 px-2 font-medium text-emerald-300">50 Units Tier</td>
                            <td className="py-2 px-2 text-right font-bold text-white">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_50}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_50 - 2}
                            </td>
                          </tr>
                          <tr className="bg-emerald-500/5">
                            <td className="py-2 px-2 font-medium text-emerald-300">100 Units Tier</td>
                            <td className="py-2 px-2 text-right font-bold text-white">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_100}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_100 - 2}
                            </td>
                          </tr>
                          <tr className="bg-emerald-500/5">
                            <td className="py-2 px-2 font-medium text-emerald-300">250 Units Tier</td>
                            <td className="py-2 px-2 text-right font-bold text-white">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_250}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_250 - 2}
                            </td>
                          </tr>
                          <tr className="bg-emerald-500/5">
                            <td className="py-2 px-2 font-medium text-emerald-300">500 Units Tier</td>
                            <td className="py-2 px-2 text-right font-bold text-white">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_500}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_500 - 2}
                            </td>
                          </tr>
                          <tr className="bg-emerald-500/10">
                            <td className="py-2 px-2 font-bold text-cyan-300">1,000+ Units Tier</td>
                            <td className="py-2 px-2 text-right font-bold text-cyan-300">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_1000}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">
                              ₹{selectedProduct.customization_options.wholesale_tiers.tier_1000 - 2}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Starter Kit Bundle Breakdown */}
                {selectedProduct.sku === 'KRA-KIT-DEMO24' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                    <span className="font-bold text-emerald-300 uppercase text-[11px] tracking-wider block">
                      Demo Starter Kit Bundle Breakdown (24 Pieces Total)
                    </span>
                    <ul className="space-y-1.5 text-slate-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>20 Assorted Acrylic Frames (Rectangle, Square, Circle, Heart)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>4 FREE Dual-Sided Chrome Keychains</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>Free Doorstep Express Air Delivery Across India</span>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Interactive Wholesale Quote Calculator */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Calculator className="h-4 w-4 text-cyan-400" />
                      Live Wholesale Quote Calculator
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      MOQ:{' '}
                      {selectedProduct.sku === 'KRA-KIT-DEMO24'
                        ? '1 kit'
                        : `${selectedProduct.min_bulk_quantity} units`}
                    </span>
                  </div>

                  {/* Quantity Input & Preset Pills */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Order Quantity:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={calcQuantity}
                        onChange={(e) => setCalcQuantity(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-500/60 font-mono"
                      />
                    </div>

                    {selectedProduct.sku !== 'KRA-KIT-DEMO24' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {[50, 100, 250, 500, 1000].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setCalcQuantity(qty)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
                              calcQuantity === qty
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                            }`}
                          >
                            {qty} pcs
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VIP Subscription Program Toggle */}
                  {selectedProduct.sku !== 'KRA-KIT-DEMO24' && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/30 to-indigo-950/30 border border-blue-500/20 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                          KRIA VIP Reseller Subscription
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Unlocks extra ₹2 OFF per frame on bulk tiers + priority dispatch
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasSubscription}
                          onChange={(e) => setHasSubscription(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  )}

                  {/* Dynamic Quote Calculation Breakdown */}
                  {(() => {
                    let quote;
                    try {
                      // Attempt authoritative matrix calculation
                      quote = calculateWholesaleQuote({
                        sku: selectedProduct.sku,
                        quantity: calcQuantity,
                        hasSubscription,
                      });
                    } catch {
                      // Graceful fallback for custom / MAPF items
                      const isBulk = calcQuantity >= selectedProduct.min_bulk_quantity;
                      let unitPrice = isBulk ? selectedProduct.bulk_price : selectedProduct.retail_price;
                      let subDiscount = 0;
                      if (hasSubscription && isBulk) {
                        subDiscount = 2;
                        unitPrice = Math.max(1, unitPrice - subDiscount);
                      }
                      quote = {
                        tier_applied: isBulk ? 'Bulk Wholesale' : 'Standard Retail / Below MOQ',
                        is_below_moq: !isBulk,
                        effective_unit_price: unitPrice,
                        subscription_discount_per_unit: subDiscount,
                        final_total_inr: unitPrice * calcQuantity,
                        notes: isBulk ? 'Standard bulk tier applied' : 'Order quantity below MOQ',
                      };
                    }

                    return (
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Applied Tier:</span>
                          <span
                            className={`font-semibold ${
                              quote.is_below_moq ? 'text-amber-300' : 'text-emerald-400'
                            }`}
                          >
                            {quote.tier_applied}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Unit Price:</span>
                          <span className="font-bold text-white">
                            ₹{quote.effective_unit_price} / unit
                          </span>
                        </div>

                        {quote.subscription_discount_per_unit > 0 && (
                          <div className="flex justify-between items-center text-amber-300 text-[11px]">
                            <span>VIP Member Discount:</span>
                            <span>-₹{quote.subscription_discount_per_unit * calcQuantity} (₹2/unit)</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2.5 border-t border-white/[0.08]">
                          <span className="font-bold text-white text-sm">Estimated Total:</span>
                          <span className="font-bold text-lg text-emerald-400">
                            ₹{quote.final_total_inr.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                <button
                  onClick={() => handleOpenEditModal(selectedProduct)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5 text-cyan-400" />
                  Edit Specs
                </button>

                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-glow transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD PRODUCT MODAL (Safe default to DRAFT)                                  */}
        {/* ========================================================================= */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0B0F19] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>

              <div>
                <h2 className="text-lg font-bold text-white">Add New Product to Catalog</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Import or configure a new acrylic fabrication item. Status defaults to Draft.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveNewProduct} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Minimal Hexagon Photo Magnet"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">SKU Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KRA-HEX-0303"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white uppercase font-mono focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    >
                      <option value="Magnetic Fridge Frame (Square / Grid)">Magnetic Fridge Frame (Square / Grid)</option>
                      <option value="Magnetic Fridge Frame (Landscape / Panorama)">Magnetic Fridge Frame (Landscape / Panorama)</option>
                      <option value="Magnetic Fridge Frame (Round)">Magnetic Fridge Frame (Round)</option>
                      <option value="Keepsake & Return Gifts">Keepsake & Return Gifts</option>
                      <option value="Keychains & Daily Accessories">Keychains & Daily Accessories</option>
                      <option value="Photo Frames">Photo Frames (Desktop)</option>
                      <option value="Reseller & Stall Starter Kit">Reseller & Stall Starter Kit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Dimensions / Spec</label>
                    <input
                      type="text"
                      placeholder="e.g. 3 × 3 inches (2mm cast acrylic)"
                      value={formDimensions}
                      onChange={(e) => setFormDimensions(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Retail MRP (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="99"
                      value={formRetailPrice}
                      onChange={(e) => setFormRetailPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Bulk Wholesale (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="49"
                      value={formBulkPrice}
                      onChange={(e) => setFormBulkPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">MOQ</label>
                    <input
                      type="number"
                      value={formMinBulkQty}
                      onChange={(e) => setFormMinBulkQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Production Notes & Features</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Diamond-polished edges, high-definition photo print lamination, moisture-sealed."
                    value={formProductionNotes}
                    onChange={(e) => setFormProductionNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Catalog Status: <strong>DRAFT</strong> (Requires owner review before activation)</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-glow transition-all disabled:opacity-50"
                  >
                    {formSaving ? 'Saving...' : 'Save as Draft'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EDIT PRODUCT MODAL (Preserves all existing safeguards)                     */}
        {/* ========================================================================= */}
        {isEditModalOpen && productToEdit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0B0F19] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative space-y-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>

              <div>
                <h2 className="text-lg font-bold text-white">Edit Product Specification</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update specs for <span className="font-mono text-cyan-300">{productToEdit.sku}</span>
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveEditProduct} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Dimensions</label>
                    <input
                      type="text"
                      value={formDimensions}
                      onChange={(e) => setFormDimensions(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ProductStatus)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    >
                      <option value="draft">Draft (Staging)</option>
                      <option value="active">Active (Live Retail)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Retail MRP (₹)</label>
                    <input
                      type="number"
                      required
                      value={formRetailPrice}
                      onChange={(e) => setFormRetailPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Bulk Wholesale (₹)</label>
                    <input
                      type="number"
                      required
                      value={formBulkPrice}
                      onChange={(e) => setFormBulkPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Min Bulk Qty</label>
                    <input
                      type="number"
                      value={formMinBulkQty}
                      onChange={(e) => setFormMinBulkQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Production Notes</label>
                  <textarea
                    rows={2}
                    value={formProductionNotes}
                    onChange={(e) => setFormProductionNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-glow transition-all disabled:opacity-50"
                  >
                    {formSaving ? 'Updating...' : 'Update Product'}
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
