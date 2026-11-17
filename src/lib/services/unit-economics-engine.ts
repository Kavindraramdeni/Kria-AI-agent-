/**
 * KRIA AI — Authoritative Unit Economics, Margin Modeling & Inventory Velocity Engine
 * Grounded in verified KRIA TECH Hyderabad factory manufacturing metrics.
 */

export interface SkuUnitEconomics {
  sku: string;
  product_name: string;
  category: string;
  dimensions: string;
  retail_price_inr: number;
  storefront_base_inr: number;
  wholesale_50_inr: number;
  wholesale_100_inr: number;
  wholesale_500_inr: number;
  estimated_cogs_inr: number;
  raw_material_cogs_inr: number;
  labor_machine_cogs_inr: number;
  retail_margin_pct: number;
  wholesale_500_margin_pct: number;
  units_per_master_sheet: number;
}

export interface InventoryVelocityMetrics {
  master_sheet_dimensions: string;
  laser_cut_seconds_per_unit: number;
  daily_factory_capacity_units: number;
  standard_dispatch_sla_days: number;
  vip_priority_dispatch_sla_days: number;
  acrylic_sheet_safety_stock: number;
  neodymium_magnet_safety_stock: number;
  reorder_lead_time_days: number;
}

export interface ComprehensiveEconomicsModel {
  products: SkuUnitEconomics[];
  inventory_velocity: InventoryVelocityMetrics;
  average_gross_margin_pct: number;
  top_margin_sku: string;
  break_even_vip_units: number;
}

/**
 * Authoritative Factory Cost of Goods Sold (COGS) & Margins Registry
 */
export const FACTORY_UNIT_ECONOMICS: SkuUnitEconomics[] = [
  {
    sku: 'KRA-REC-0604',
    product_name: 'Classic Rectangle Acrylic Photo Magnet (6×4")',
    category: 'Magnetic Fridge Frame (Landscape / Panorama)',
    dimensions: '6 × 4 inches (2mm cell-cast acrylic with grade N35 flush neodymium magnet)',
    retail_price_inr: 179,
    storefront_base_inr: 113,
    wholesale_50_inr: 96,
    wholesale_100_inr: 85,
    wholesale_500_inr: 79,
    raw_material_cogs_inr: 38, // Acrylic sheet fraction: ₹18, N35 flush magnet: ₹8, print core: ₹10, film: ₹2
    labor_machine_cogs_inr: 9, // Laser time: ₹5, diamond polish: ₹2, sleeve packaging: ₹2
    estimated_cogs_inr: 47,
    retail_margin_pct: Math.round(((179 - 47) / 179) * 1000) / 10, // 73.7%
    wholesale_500_margin_pct: Math.round(((79 - 47) / 79) * 1000) / 10, // 40.5%
    units_per_master_sheet: 96,
  },
  {
    sku: 'KRA-REC-3525',
    product_name: 'Classic Rectangle Acrylic Photo Magnet (3.5×2.5")',
    category: 'Magnetic Fridge Frame (Landscape / Panorama)',
    dimensions: '3.5 × 2.5 inches (2mm cell-cast acrylic with grade N35 flush neodymium magnet)',
    retail_price_inr: 99,
    storefront_base_inr: 64,
    wholesale_50_inr: 54,
    wholesale_100_inr: 48,
    wholesale_500_inr: 45,
    raw_material_cogs_inr: 20,
    labor_machine_cogs_inr: 6,
    estimated_cogs_inr: 26,
    retail_margin_pct: Math.round(((99 - 26) / 99) * 1000) / 10, // 73.7%
    wholesale_500_margin_pct: Math.round(((45 - 26) / 45) * 1000) / 10, // 42.2%
    units_per_master_sheet: 160,
  },
  {
    sku: 'KRA-SQU-0202',
    product_name: 'Minimal Square Acrylic Photo Magnet (2×2")',
    category: 'Magnetic Fridge Frame (Square / Grid)',
    dimensions: '2 × 2 inches (2mm cell-cast acrylic with grade N35 flush neodymium magnet)',
    retail_price_inr: 79,
    storefront_base_inr: 49,
    wholesale_50_inr: 42,
    wholesale_100_inr: 37,
    wholesale_500_inr: 34,
    raw_material_cogs_inr: 14,
    labor_machine_cogs_inr: 5,
    estimated_cogs_inr: 19,
    retail_margin_pct: Math.round(((79 - 19) / 79) * 1000) / 10, // 75.9%
    wholesale_500_margin_pct: Math.round(((34 - 19) / 34) * 1000) / 10, // 44.1%
    units_per_master_sheet: 260,
  },
  {
    sku: 'KRA-SQU-0303',
    product_name: 'Minimal Square Acrylic Photo Magnet (3×3")',
    category: 'Magnetic Fridge Frame (Square / Grid)',
    dimensions: '3 × 3 inches (2mm cell-cast acrylic with grade N35 flush neodymium magnet)',
    retail_price_inr: 99,
    storefront_base_inr: 65,
    wholesale_50_inr: 55,
    wholesale_100_inr: 49,
    wholesale_500_inr: 46,
    raw_material_cogs_inr: 21,
    labor_machine_cogs_inr: 6,
    estimated_cogs_inr: 27,
    retail_margin_pct: Math.round(((99 - 27) / 99) * 1000) / 10, // 72.7%
    wholesale_500_margin_pct: Math.round(((46 - 27) / 46) * 1000) / 10, // 41.3%
    units_per_master_sheet: 156,
  },
  {
    sku: 'MAPF-0406-CL',
    product_name: 'Clear Magnetic Acrylic Photo Frame / Tabletop Block (4×6")',
    category: 'Tabletop Acrylic Photo Blocks',
    dimensions: '4 × 6 inches, 20mm total thickness (10mm + 10mm dual virgin cast blocks)',
    retail_price_inr: 549,
    storefront_base_inr: 499,
    wholesale_50_inr: 340,
    wholesale_100_inr: 320,
    wholesale_500_inr: 295,
    raw_material_cogs_inr: 145, // 10+10mm cast blocks: ₹115, 4x N52 nickel magnets: ₹30
    labor_machine_cogs_inr: 30, // Precision diamond beveled wheel polishing: ₹20, packaging box: ₹10
    estimated_cogs_inr: 175,
    retail_margin_pct: Math.round(((549 - 175) / 549) * 1000) / 10, // 68.1%
    wholesale_500_margin_pct: Math.round(((295 - 175) / 295) * 1000) / 10, // 40.7%
    units_per_master_sheet: 48,
  },
  {
    sku: 'KRA-KEY-CIR25',
    product_name: 'Dual-Sided Acrylic Photo Keychain (2.5")',
    category: 'Keychains & Daily Accessories',
    dimensions: '2.5 inch diameter (2mm cast acrylic with metallic swivel key ring)',
    retail_price_inr: 69,
    storefront_base_inr: 40,
    wholesale_50_inr: 34,
    wholesale_100_inr: 30,
    wholesale_500_inr: 28,
    raw_material_cogs_inr: 10, // Acrylic discs: ₹5, swivel chrome ring: ₹5
    labor_machine_cogs_inr: 4,
    estimated_cogs_inr: 14,
    retail_margin_pct: Math.round(((69 - 14) / 69) * 1000) / 10, // 79.7%
    wholesale_500_margin_pct: Math.round(((28 - 14) / 28) * 1000) / 10, // 50.0%
    units_per_master_sheet: 210,
  },
  {
    sku: 'KRA-KIT-DEMO24',
    product_name: 'KRIA Tech Demo Starter Kit (24 Pieces Total)',
    category: 'Reseller & Stall Starter Kit',
    dimensions: 'Assorted Pack (20 Frames: Rectangle, Square, Circle, Heart + 4 Bonus Keychains)',
    retail_price_inr: 2499,
    storefront_base_inr: 999,
    wholesale_50_inr: 999,
    wholesale_100_inr: 999,
    wholesale_500_inr: 999,
    raw_material_cogs_inr: 540,
    labor_machine_cogs_inr: 220, // Assembly: ₹40 + Free Express Air Freight across India: ₹180
    estimated_cogs_inr: 760,
    retail_margin_pct: Math.round(((2499 - 760) / 2499) * 1000) / 10, // 69.6%
    wholesale_500_margin_pct: Math.round(((999 - 760) / 999) * 1000) / 10, // 23.9% (Acquisition Hook)
    units_per_master_sheet: 4, // 4 complete kits per combined master sheets batch
  },
];

export const FACTORY_INVENTORY_VELOCITY: InventoryVelocityMetrics = {
  master_sheet_dimensions: '8 × 4 feet (2440 × 1220 mm)',
  laser_cut_seconds_per_unit: 45,
  daily_factory_capacity_units: 1200,
  standard_dispatch_sla_days: 2,
  vip_priority_dispatch_sla_days: 1,
  acrylic_sheet_safety_stock: 15, // 15 master sheets (~1,440 frame equivalent)
  neodymium_magnet_safety_stock: 5000,
  reorder_lead_time_days: 4,
};

/**
 * Computes complete unit economics and margin modeling analytics.
 */
export function getComprehensiveUnitEconomics(): ComprehensiveEconomicsModel {
  const avgMargin =
    FACTORY_UNIT_ECONOMICS.reduce((acc, p) => acc + p.wholesale_500_margin_pct, 0) /
    FACTORY_UNIT_ECONOMICS.length;

  // Find SKU with highest retail margin
  let topMarginSku = FACTORY_UNIT_ECONOMICS[0].sku;
  let highestMargin = FACTORY_UNIT_ECONOMICS[0].retail_margin_pct;

  for (const p of FACTORY_UNIT_ECONOMICS) {
    if (p.retail_margin_pct > highestMargin) {
      highestMargin = p.retail_margin_pct;
      topMarginSku = p.sku;
    }
  }

  return {
    products: FACTORY_UNIT_ECONOMICS,
    inventory_velocity: FACTORY_INVENTORY_VELOCITY,
    average_gross_margin_pct: Math.round(avgMargin * 10) / 10,
    top_margin_sku: topMarginSku,
    break_even_vip_units: 250, // 250 units * ₹2 discount = ₹500 subscription price
  };
}
