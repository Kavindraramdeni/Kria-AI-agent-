'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { getProducts, createProduct } from '@/lib/services/products';
import { logActivity } from '@/lib/services/activity-logs';
import { Product } from '@/types/database';
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
  Check
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Live Calculator in Drawer
  const [calcQuantity, setCalcQuantity] = useState<number>(50);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Photo Frames');
  const [dimensions, setDimensions] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [minBulkQty, setMinBulkQty] = useState('20');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const res = await getProducts();
    setProducts(res.data);
    setLoading(false);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name || !sku || !retailPrice || !bulkPrice) {
      setFormError('Please fill in Name, SKU, Retail Price, and Bulk Price.');
      return;
    }

    const res = await createProduct({
      name,
      sku: sku.toUpperCase(),
      category,
      dimensions: dimensions || 'Standard',
      retail_price: parseFloat(retailPrice),
      bulk_price: parseFloat(bulkPrice),
      min_bulk_quantity: parseInt(minBulkQty, 10) || 10,
      description,
      materials: ['Cast Acrylic', 'Neodymium Magnets'],
      available_shapes: ['Rectangle'],
      status: 'active',
      is_demo: false,
    });

    if (res.success && res.data) {
      await logActivity({
        entity_type: 'product',
        entity_id: res.data.sku,
        action: 'product_created',
        description: `Added product: ${res.data.name} (${res.data.sku})`,
        actor_type: 'user',
        actor_id: 'admin@kriatech.com',
      });
      setIsModalOpen(false);
      resetForm();
      loadProducts();
    } else {
      setFormError(res.error || 'Failed to save product.');
    }
  }

  function resetForm() {
    setName('');
    setSku('');
    setCategory('Photo Frames');
    setDimensions('');
    setRetailPrice('');
    setBulkPrice('');
    setMinBulkQty('20');
    setDescription('');
    setFormError('');
  }

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <>
      <Header
        title="Product Catalog & Production Specifications"
        subtitle="Manage custom acrylic, laser cut, and personalized fabrication offerings"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Controls: Search, Filter, and Add Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by title or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-kria-card border border-kria-border text-xs text-white placeholder-slate-400 focus:outline-none focus:border-electric"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-electric text-white'
                      : 'bg-kria-card text-slate-400 hover:text-white border border-kria-border'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading product catalog...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-kria-card rounded-xl border border-kria-border">
            <Package className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No products found matching criteria.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting your search query or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((prod) => (
              <div
                key={prod.id}
                onClick={() => {
                  setSelectedProduct(prod);
                  setCalcQuantity(prod.min_bulk_quantity || 25);
                }}
                className="rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all flex flex-col justify-between overflow-hidden group shadow-card cursor-pointer"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-kria-800 text-electric-light border border-kria-border">
                      {prod.sku}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {prod.is_demo && <DemoBadge />}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                          prod.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-sm group-hover:text-electric-light transition-colors">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {prod.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 bg-kria-surface p-2.5 rounded-lg border border-kria-border/60">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dimensions:</span>
                      <span className="font-medium text-slate-200">{prod.dimensions || 'N/A'}</span>
                    </div>
                    {prod.materials && prod.materials.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Materials:</span>
                        <span className="font-medium text-slate-200 line-clamp-1">
                          {prod.materials.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Footer */}
                <div className="p-4 bg-kria-850 border-t border-kria-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Retail Price</span>
                    <strong className="text-sm font-bold text-white">₹{prod.retail_price}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">
                      Bulk Wholesale (≥{prod.min_bulk_quantity})
                    </span>
                    <strong className="text-sm font-bold text-emerald-400">
                      ₹{prod.bulk_price}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Technical Specification Drawer */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
            <div className="bg-kria-900 border-l border-kria-border w-full max-w-lg h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-kria-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-electric-light px-2 py-0.5 rounded bg-kria-800 border border-kria-border">
                        {selectedProduct.sku}
                      </span>
                      {selectedProduct.is_demo && <DemoBadge />}
                    </div>
                    <h2 className="text-base font-bold text-white mt-1.5">{selectedProduct.name}</h2>
                    <p className="text-xs text-slate-400">{selectedProduct.category}</p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-kria-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Fabrication Details */}
                <div className="p-4 rounded-xl bg-kria-surface border border-kria-border space-y-3 text-xs">
                  <h3 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-electric-light" />
                    Fabrication & Material Architecture
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Dimensions</span>
                      <strong className="text-white">{selectedProduct.dimensions || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Shapes Available</span>
                      <strong className="text-white">
                        {selectedProduct.available_shapes?.join(', ') || 'Standard'}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] mb-1">Materials Specification</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.materials?.map((mat, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-kria-850 text-slate-200 border border-kria-border">
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedProduct.production_notes && (
                    <div className="pt-2 border-t border-kria-border/70">
                      <span className="text-slate-500 block text-[10px] mb-0.5">Shop Floor Production Notes</span>
                      <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-kria-850 p-2 rounded border border-kria-border/50">
                        {selectedProduct.production_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tier Pricing Calculator */}
                <div className="p-4 rounded-xl bg-kria-surface border border-kria-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Calculator className="h-4 w-4 text-emerald-400" />
                      Bulk Quotation Calculator
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      MOQ: {selectedProduct.min_bulk_quantity} units
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Simulate Order Quantity:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={calcQuantity}
                      onChange={(e) => setCalcQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  {/* Calculated Breakdown */}
                  {(() => {
                    const isBulk = calcQuantity >= selectedProduct.min_bulk_quantity;
                    const unitPrice = isBulk ? selectedProduct.bulk_price : selectedProduct.retail_price;
                    const totalCost = unitPrice * calcQuantity;
                    const savings = isBulk ? (selectedProduct.retail_price - selectedProduct.bulk_price) * calcQuantity : 0;
                    const discountPercent = isBulk ? Math.round(((selectedProduct.retail_price - selectedProduct.bulk_price) / selectedProduct.retail_price) * 100) : 0;

                    return (
                      <div className="p-3 rounded-lg bg-kria-850 border border-kria-border text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Applied Tier:</span>
                          <strong className={isBulk ? 'text-emerald-400' : 'text-slate-200'}>
                            {isBulk ? `Bulk Wholesale (${discountPercent}% OFF)` : 'Standard Retail'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Effective Unit Price:</span>
                          <strong className="text-white">₹{unitPrice}</strong>
                        </div>
                        {savings > 0 && (
                          <div className="flex justify-between text-emerald-400 font-medium">
                            <span>Buyer Bulk Savings:</span>
                            <span>₹{savings.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-kria-border text-sm">
                          <span className="font-bold text-white">Estimated Quote Total:</span>
                          <strong className="font-bold text-emerald-400">₹{totalCost.toLocaleString()}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Customization Options */}
                {selectedProduct.customization_options && Object.keys(selectedProduct.customization_options).length > 0 && (
                  <div className="p-4 rounded-xl bg-kria-surface border border-kria-border space-y-2 text-xs">
                    <span className="font-bold text-white uppercase text-[11px] tracking-wider block">
                      Customization & Finishing Specs
                    </span>
                    <pre className="p-2.5 rounded bg-kria-850 font-mono text-[11px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(selectedProduct.customization_options, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-kria-border flex justify-end">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-kria-800 hover:bg-kria-700 text-slate-200"
                >
                  Close Specification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Product */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-kria-900 border border-kria-border rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-white mb-1">Add Product to Catalog</h2>
              <p className="text-xs text-slate-400 mb-4">
                Configure production specifications, dimensions, and tier pricing.
              </p>

              {formError && (
                <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddProduct} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Magnetic Frame (6x8 inch)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">SKU Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MAPF-0608-CL"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white uppercase focus:outline-none focus:border-electric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    >
                      <option value="Photo Frames">Photo Frames</option>
                      <option value="Keychains">Keychains</option>
                      <option value="Signage">Signage</option>
                      <option value="MDF Products">MDF Products</option>
                      <option value="Gifts & Awards">Gifts & Awards</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Dimensions / Spec</label>
                    <input
                      type="text"
                      placeholder="e.g. 6 x 8 inches (20mm thickness)"
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Retail (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="799"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bulk Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="450"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Min Bulk Qty</label>
                    <input
                      type="number"
                      value={minBulkQty}
                      onChange={(e) => setMinBulkQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Production Notes & Features</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Double acrylic block with 4 corner N52 magnets, diamond beveled edge finish."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-kria-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white shadow-glow"
                  >
                    Save Product
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
