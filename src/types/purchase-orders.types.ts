// Types for the Smart Purchase Order System

export type PurchaseUnitType =
  | 'package'
  | 'box'
  | 'unit'
  | 'kilogram'
  | 'liter'
  | 'bag'
  | 'bundle'
  | 'sack'
  | 'tray'
  | 'other';

export type PurchaseOrderStatus = 'draft' | 'saved' | 'completed' | 'canceled';

// ─── Purchase Products ─────────────────────────────────────

export interface PurchaseProduct {
  id: string;
  company_id: string;
  name: string;
  unit_type: PurchaseUnitType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseProductRequest {
  companyId: string;
  name: string;
  unitType: PurchaseUnitType;
}

export interface UpdatePurchaseProductRequest {
  name?: string;
  unitType?: PurchaseUnitType;
  isActive?: boolean;
}

// ─── Purchase Order Items ──────────────────────────────────

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name_snapshot: string;
  unit_type_snapshot: string;
  quantity: number;
  observation?: string;
  created_at: string;
}

export interface CreatePurchaseOrderItemInput {
  /** UUID of an existing product, or omit to create a new one automatically */
  productId?: string;
  /** Required when productId is not provided (auto-create flow) */
  productName?: string;
  unitType: PurchaseUnitType;
  quantity: number;
  observation?: string;
}

// ─── Purchase Orders ───────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  company_id: string;
  order_date: string;
  status: PurchaseOrderStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderRequest {
  companyId: string;
  orderDate?: string; // ISO date, defaults to today
  notes?: string;
  items: CreatePurchaseOrderItemInput[];
}

export interface UpdatePurchaseOrderRequest {
  orderDate?: string;
  notes?: string;
  status?: PurchaseOrderStatus;
  items?: CreatePurchaseOrderItemInput[];
}

// ─── Smart Suggestions ────────────────────────────────────

export interface ProductPurchasePattern {
  product_id: string;
  product_name: string;
  unit_type: PurchaseUnitType;
  last_purchase_date: string;
  total_times_purchased: number;
  average_interval_days: number;
  last_purchased_quantity: number;
  next_estimated_purchase_date: string;
  days_until_next: number;
}
