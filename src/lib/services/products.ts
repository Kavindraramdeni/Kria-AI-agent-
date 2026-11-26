import { createClient } from '@/lib/supabase/client';
import { DEMO_PRODUCTS } from '@/lib/demo-data';
import { isDemoModeActive } from '@/lib/demo-mode';
import { Product } from '@/types/database';

export async function getProducts(): Promise<{ data: Product[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const isAllowed = process.env.NODE_ENV === 'test' || isDemoModeActive();
      return { data: isAllowed ? DEMO_PRODUCTS : [], isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], isLive: false, error: error.message };
    }

    return { data: data || [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}

export async function createProduct(product: Partial<Product>): Promise<{ success: boolean; data?: Product; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      // Create in local demo state
      const newProduct: Product = {
        id: 'prod-' + Date.now(),
        name: product.name || 'Untitled Product',
        sku: product.sku || `SKU-${Date.now()}`,
        category: product.category || 'General',
        description: product.description || null,
        materials: product.materials || [],
        dimensions: product.dimensions || null,
        available_shapes: product.available_shapes || [],
        customization_options: product.customization_options || {},
        retail_price: Number(product.retail_price) || 0,
        bulk_price: Number(product.bulk_price) || 0,
        min_bulk_quantity: Number(product.min_bulk_quantity) || 50,
        production_notes: product.production_notes || null,
        image_url: product.image_url || null,
        status: product.status || 'active',
        seo_keywords: product.seo_keywords || [],
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      DEMO_PRODUCTS.unshift(newProduct);
      return { success: true, data: newProduct };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<{ success: boolean; data?: Product; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const idx = DEMO_PRODUCTS.findIndex((p) => p.id === id);
      if (idx !== -1) {
        DEMO_PRODUCTS[idx] = {
          ...DEMO_PRODUCTS[idx],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return { success: true, data: DEMO_PRODUCTS[idx] };
      }
      return { success: false, error: 'Product not found in local catalog' };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
