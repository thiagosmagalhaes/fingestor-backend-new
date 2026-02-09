// Types para o sistema de Produtos e Serviços

export interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  color?: string;
  parent_id?: string;
  category_type?: 'product' | 'service' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductCategoryRequest {
  companyId: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  categoryType?: 'product' | 'service' | 'both';
}

export interface UpdateProductCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  parentId?: string;
  categoryType?: 'product' | 'service' | 'both';
  isActive?: boolean;
}

export interface ProductService {
  id: string;
  company_id: string;
  category_id?: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  item_type: 'product' | 'service';
  cost_price?: number;
  sale_price: number;
  track_inventory: boolean;
  current_stock: number;
  min_stock: number;
  stock_unit: string;
  tax_percentage: number;
  commission_percentage: number;
  images: string[];
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateProductServiceRequest {
  companyId: string;
  categoryId?: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  itemType: 'product' | 'service';
  costPrice?: number;
  salePrice: number;
  trackInventory?: boolean;
  currentStock?: number;
  minStock?: number;
  stockUnit?: string;
  taxPercentage?: number;
  commissionPercentage?: number;
  images?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateProductServiceRequest {
  categoryId?: string;
  sku?: string;
  barcode?: string;
  name?: string;
  description?: string;
  costPrice?: number;
  salePrice?: number;
  trackInventory?: boolean;
  currentStock?: number;
  minStock?: number;
  stockUnit?: string;
  taxPercentage?: number;
  commissionPercentage?: number;
  images?: string[];
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface InventoryMovement {
  id: string;
  company_id: string;
  product_service_id: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer' | 'loss';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  sale_id?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface AddStockRequest {
  productId: string;
  quantity: number;
  referenceNumber?: string;
  notes?: string;
}

export interface AdjustStockRequest {
  productId: string;
  newStock: number;
  notes?: string;
}

export interface LowStockProduct {
  id: string;
  company_id: string;
  sku?: string;
  name: string;
  current_stock: number;
  min_stock: number;
  stock_unit: string;
  sale_price: number;
  category_name?: string;
  category_color?: string;
}
