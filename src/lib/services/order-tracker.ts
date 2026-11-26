/**
 * Order & Revenue Tracking Service (Stage 8 of B2B Bulk Sales Workflow)
 * Records confirmed bulk orders, links them to leads & workflow_runs,
 * and computes confirmed business revenue in INR.
 */

import { createClient } from '@/lib/supabase/server';
import { Order, OrderPaymentStatus, OrderStatus } from '@/types/database';

export interface RecordOrderParams {
  lead_id?: string | null;
  workflow_run_id?: string | null;
  approval_id?: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price_inr: number;
  total_inr: number;
  status?: OrderStatus;
  payment_status?: OrderPaymentStatus;
  notes?: string | null;
}

export interface OrderServiceResult<T = Order> {
  success: boolean;
  data?: T;
  error?: string;
  is_demo?: boolean;
}

export const DEMO_ORDERS: Order[] = [];

const REVENUE_STATUSES: OrderStatus[] = [
  'confirmed',
  'in_production',
  'dispatched',
  'delivered',
];

function isDemoEnv(customClient?: any): boolean {
  if (customClient) return false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !supabaseUrl || supabaseUrl.includes('placeholder');
}

export async function recordOrder(
  params: RecordOrderParams,
  customClient?: any
): Promise<OrderServiceResult<Order>> {
  if (!params.sku || params.sku.trim() === '') {
    return { success: false, error: 'Order SKU is required.' };
  }
  if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
    return { success: false, error: 'Order quantity must be a positive number.' };
  }

  const now = new Date().toISOString();
  const status: OrderStatus = params.status || 'confirmed';
  const payment_status: OrderPaymentStatus = params.payment_status || 'pending';

  if (isDemoEnv(customClient)) {
    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lead_id: params.lead_id || null,
      workflow_run_id: params.workflow_run_id || null,
      approval_id: params.approval_id || null,
      sku: params.sku.trim(),
      product_name: params.product_name,
      quantity: params.quantity,
      unit_price_inr: params.unit_price_inr,
      total_inr: params.total_inr,
      status,
      payment_status,
      notes: params.notes || null,
      is_demo: true,
      created_at: now,
      updated_at: now,
    };
    DEMO_ORDERS.unshift(newOrder);
    return { success: true, data: newOrder, is_demo: true };
  }

  try {
    const supabase = customClient || createClient();
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          lead_id: params.lead_id || null,
          workflow_run_id: params.workflow_run_id || null,
          approval_id: params.approval_id || null,
          sku: params.sku.trim(),
          product_name: params.product_name,
          quantity: params.quantity,
          unit_price_inr: params.unit_price_inr,
          total_inr: params.total_inr,
          status,
          payment_status,
          notes: params.notes || null,
          is_demo: false,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Failed to insert order into Supabase.',
      };
    }

    return { success: true, data: data as Order, is_demo: false };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected error recording order.',
    };
  }
}

export async function getOrdersByLead(
  leadId: string,
  customClient?: any
): Promise<Order[]> {
  if (isDemoEnv(customClient)) {
    return DEMO_ORDERS.filter((o) => o.lead_id === leadId);
  }

  try {
    const supabase = customClient || createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Order[];
  } catch {
    return [];
  }
}

export async function getAllOrders(customClient?: any): Promise<Order[]> {
  if (isDemoEnv(customClient)) {
    return [...DEMO_ORDERS];
  }

  try {
    const supabase = customClient || createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Order[];
  } catch {
    return [];
  }
}

export async function getTotalRevenue(
  customClient?: any
): Promise<{ total_inr: number; confirmed_orders: number }> {
  const orders = await getAllOrders(customClient);
  const confirmed = orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const total_inr = confirmed.reduce((sum, o) => sum + Number(o.total_inr || 0), 0);
  return {
    total_inr,
    confirmed_orders: confirmed.length,
  };
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  customClient?: any
): Promise<OrderServiceResult<Order>> {
  if (isDemoEnv(customClient)) {
    const existing = DEMO_ORDERS.find((o) => o.id === id);
    if (!existing) {
      return { success: false, error: `Order '${id}' not found.` };
    }
    existing.status = status;
    existing.updated_at = new Date().toISOString();
    return { success: true, data: existing, is_demo: true };
  }

  try {
    const supabase = customClient || createClient();
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || `Failed to update order '${id}'.`,
      };
    }

    return { success: true, data: data as Order, is_demo: false };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected error updating order status.',
    };
  }
}
