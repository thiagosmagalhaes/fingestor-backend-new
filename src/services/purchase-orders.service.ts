import { SupabaseClient } from '@supabase/supabase-js';
import {
  PurchaseUnitType,
  PurchaseOrderStatus,
  CreatePurchaseOrderItemInput,
  ProductPurchasePattern,
} from '../types/purchase-orders.types';

export class PurchaseOrderService {
  // ─── Products ──────────────────────────────────────────────────

  async searchProducts(
    supabase: SupabaseClient,
    companyId: string,
    search: string,
    onlyActive = true,
  ) {
    let query = supabase
      .from('purchase_products')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    if (search && search.trim().length > 0) {
      // Case-insensitive prefix / contains match
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data ?? [];
  }

  async getProductById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('purchase_products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createProduct(
    supabase: SupabaseClient,
    companyId: string,
    name: string,
    unitType: PurchaseUnitType,
  ) {
    const { data, error } = await supabase
      .from('purchase_products')
      .insert({ company_id: companyId, name: name.trim(), unit_type: unitType })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateProduct(
    supabase: SupabaseClient,
    id: string,
    updates: { name?: string; unit_type?: PurchaseUnitType; is_active?: boolean },
  ) {
    const { data, error } = await supabase
      .from('purchase_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async listProducts(supabase: SupabaseClient, companyId: string) {
    const { data, error } = await supabase
      .from('purchase_products')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  // ─── Orders ────────────────────────────────────────────────────

  async listOrders(
    supabase: SupabaseClient,
    companyId: string,
    status?: PurchaseOrderStatus,
  ) {
    let query = supabase
      .from('purchase_orders')
      .select(`*, purchase_order_items(*)`)
      .eq('company_id', companyId)
      .order('order_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getOrderById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`*, purchase_order_items(*)`)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Creates a purchase order.
   * For each item:
   *  - If productId is provided, uses the existing product.
   *  - If only productName is provided, tries to find an existing product by
   *    normalized name; creates a new one if not found.
   * Returns the saved order with its items.
   */
  async createOrder(
    supabase: SupabaseClient,
    companyId: string,
    userId: string,
    orderDate: string,
    items: CreatePurchaseOrderItemInput[],
    notes?: string,
    status: PurchaseOrderStatus = 'saved',
  ) {
    if (!items || items.length === 0) {
      throw new Error('A purchase order must have at least one item.');
    }

    // 1. Create the purchase order
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        company_id: companyId,
        order_date: orderDate,
        status,
        notes: notes ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Resolve / auto-create products and build item rows
    const itemRows: Array<{
      purchase_order_id: string;
      product_id: string;
      product_name_snapshot: string;
      unit_type_snapshot: string;
      quantity: number;
      observation: string | null;
    }> = [];

    for (const item of items) {
      let productId = item.productId;
      let productName: string;
      let unitType = item.unitType;

      if (productId) {
        // Fetch existing product
        const product = await this.getProductById(supabase, productId);
        if (!product) throw new Error(`Product ${productId} not found.`);
        productName = product.name;
        unitType = product.unit_type;
      } else {
        // Auto-create: look for an existing product with the same normalized name
        if (!item.productName || item.productName.trim().length === 0) {
          throw new Error('productName is required when productId is not provided.');
        }

        const normalizedName = item.productName.trim().toLowerCase();

        const { data: existing } = await supabase
          .from('purchase_products')
          .select('*')
          .eq('company_id', companyId)
          .ilike('name', normalizedName)
          .maybeSingle();

        if (existing) {
          productId = existing.id;
          productName = existing.name;
        } else {
          // Create new product
          const created = await this.createProduct(
            supabase,
            companyId,
            item.productName.trim(),
            unitType,
          );
          productId = created.id;
          productName = created.name;
        }
      }

      itemRows.push({
        purchase_order_id: order.id,
        product_id: productId!,
        product_name_snapshot: productName!,
        unit_type_snapshot: unitType,
        quantity: item.quantity,
        observation: item.observation ?? null,
      });
    }

    // 3. Insert all items
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemRows);

    if (itemsError) throw itemsError;

    // 4. Return the full order
    return this.getOrderById(supabase, order.id);
  }

  async updateOrder(
    supabase: SupabaseClient,
    id: string,
    companyId: string,
    userId: string,
    updates: {
      orderDate?: string;
      notes?: string;
      status?: PurchaseOrderStatus;
      items?: CreatePurchaseOrderItemInput[];
    },
  ) {
    const orderUpdates: Record<string, unknown> = {};
    if (updates.orderDate !== undefined) orderUpdates.order_date = updates.orderDate;
    if (updates.notes !== undefined) orderUpdates.notes = updates.notes;
    if (updates.status !== undefined) orderUpdates.status = updates.status;

    if (Object.keys(orderUpdates).length > 0) {
      const { error } = await supabase
        .from('purchase_orders')
        .update(orderUpdates)
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
    }

    // If items are provided, replace them entirely
    if (updates.items !== undefined) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);
      if (deleteError) throw deleteError;

      // Re-create via helper (without creating a new order)
      // We reuse the same order id, so we call a simplified version
      if (updates.items.length === 0) {
        throw new Error('A purchase order must have at least one item.');
      }

      const itemRows: Array<{
        purchase_order_id: string;
        product_id: string;
        product_name_snapshot: string;
        unit_type_snapshot: string;
        quantity: number;
        observation: string | null;
      }> = [];

      for (const item of updates.items) {
        let productId = item.productId;
        let productName: string;
        let unitType = item.unitType;

        if (productId) {
          const product = await this.getProductById(supabase, productId);
          if (!product) throw new Error(`Product ${productId} not found.`);
          productName = product.name;
          unitType = product.unit_type;
        } else {
          if (!item.productName || item.productName.trim().length === 0) {
            throw new Error('productName is required when productId is not provided.');
          }
          const { data: existing } = await supabase
            .from('purchase_products')
            .select('*')
            .eq('company_id', companyId)
            .ilike('name', item.productName.trim())
            .maybeSingle();

          if (existing) {
            productId = existing.id;
            productName = existing.name;
          } else {
            const created = await this.createProduct(
              supabase,
              companyId,
              item.productName.trim(),
              unitType,
            );
            productId = created.id;
            productName = created.name;
          }
        }

        itemRows.push({
          purchase_order_id: id,
          product_id: productId!,
          product_name_snapshot: productName!,
          unit_type_snapshot: unitType,
          quantity: item.quantity,
          observation: item.observation ?? null,
        });
      }

      const { error: insertError } = await supabase
        .from('purchase_order_items')
        .insert(itemRows);
      if (insertError) throw insertError;
    }

    return this.getOrderById(supabase, id);
  }

  async cancelOrder(supabase: SupabaseClient, id: string, companyId: string) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ status: 'canceled' })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ─── WhatsApp Message ──────────────────────────────────────────

  generateWhatsAppMessage(
    items: Array<{ quantity: number; unit_type_snapshot: string; product_name_snapshot: string }>,
    greeting?: string,
    closing?: string,
  ): string {
    // Cumprimento automático em português
    let hora = new Date().getHours();
    let cumprimento = 'Bom dia';
    if (hora >= 12 && hora < 18) cumprimento = 'Boa tarde';
    if (hora >= 18 || hora < 5) cumprimento = 'Boa noite';
    if (greeting) cumprimento = greeting;

    // Fechamento padrão
    let fechamento = closing || 'Obrigado.';

    // Tradução das unidades
    const unidadePt: Record<string, string> = {
      package: 'pacote',
      box: 'caixa',
      unit: 'unidade',
      kilogram: 'kg',
      liter: 'litro',
      bag: 'saco',
      bundle: 'fardo',
      sack: 'saco',
      tray: 'bandeja',
      other: 'un.',
    };

    const plural = (word: string, qty: number) => {
      if (qty === 1) return word;
      if (word === 'kg' || word === 'litro') return word + 's';
      if (word === 'unidade') return 'unidades';
      if (word === 'bandeja') return 'bandejas';
      if (word === 'caixa') return 'caixas';
      if (word === 'pacote') return 'pacotes';
      if (word === 'saco') return 'sacos';
      if (word === 'fardo') return 'fardos';
      return word + 's';
    };

    const lines = items.map((i) => {
      const unidade = unidadePt[i.unit_type_snapshot] || i.unit_type_snapshot;
      return `- ${i.quantity} ${plural(unidade, i.quantity)} de ${i.product_name_snapshot}`;
    });

    return [
      `${cumprimento}, tudo bem?`,
      '',
      'Gostaria de fazer o seguinte pedido:',
      '',
      ...lines,
      '',
      fechamento,
    ].join('\n');
  }

  // ─── Smart Suggestions ────────────────────────────────────────

  /**
   * Calculates smart purchase suggestions by analyzing the purchase history
   * of each product. Only products purchased at least twice are included.
   */
  async getSuggestions(
    supabase: SupabaseClient,
    companyId: string,
  ): Promise<ProductPurchasePattern[]> {
    // Fetch all saved/completed orders with their items
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select('id, order_date, purchase_order_items(product_id, product_name_snapshot, unit_type_snapshot, quantity)')
      .eq('company_id', companyId)
      .in('status', ['saved', 'completed'])
      .order('order_date', { ascending: true });

    if (error) throw error;
    if (!orders || orders.length === 0) return [];

    // Aggregate purchase history per product
    const productHistory = new Map<
      string,
      {
        name: string;
        unitType: string;
        dates: string[];
        quantities: number[];
      }
    >();

    for (const order of orders) {
      for (const item of (order.purchase_order_items as any[])) {
        const pid = item.product_id as string;
        if (!productHistory.has(pid)) {
          productHistory.set(pid, {
            name: item.product_name_snapshot,
            unitType: item.unit_type_snapshot,
            dates: [],
            quantities: [],
          });
        }
        const entry = productHistory.get(pid)!;
        // Avoid duplicate dates for the same product
        if (!entry.dates.includes(order.order_date)) {
          entry.dates.push(order.order_date);
        }
        entry.quantities.push(Number(item.quantity));
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const SUGGESTION_DAYS_BEFORE = 2;
    const suggestions: ProductPurchasePattern[] = [];

    for (const [productId, history] of productHistory) {
      // Rule 1: at least 2 purchases
      if (history.dates.length < 2) continue;

      // Sort dates ascending
      const sortedDates = [...history.dates].sort();

      // Rule 2: calculate average interval
      let totalInterval = 0;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        totalInterval += Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      }
      const avgIntervalDays = Math.round(totalInterval / (sortedDates.length - 1));

      const lastDate = new Date(sortedDates[sortedDates.length - 1]);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + avgIntervalDays);

      // Rule 4: show when today >= nextDate - SUGGESTION_DAYS_BEFORE
      const showFrom = new Date(nextDate);
      showFrom.setDate(showFrom.getDate() - SUGGESTION_DAYS_BEFORE);

      if (today < showFrom) continue;

      // Rule 5: last purchased quantity as suggestion
      const lastQuantity = history.quantities[history.quantities.length - 1];

      const daysUntilNext = Math.round(
        (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      suggestions.push({
        product_id: productId,
        product_name: history.name,
        unit_type: history.unitType as PurchaseUnitType,
        last_purchase_date: lastDate.toISOString().split('T')[0],
        total_times_purchased: history.dates.length,
        average_interval_days: avgIntervalDays,
        last_purchased_quantity: lastQuantity,
        next_estimated_purchase_date: nextDate.toISOString().split('T')[0],
        days_until_next: daysUntilNext,
      });
    }

    // Sort: most overdue first
    suggestions.sort((a, b) => a.days_until_next - b.days_until_next);

    return suggestions;
  }
}

export default new PurchaseOrderService();
