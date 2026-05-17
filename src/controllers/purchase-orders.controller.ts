import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import purchaseOrderService from '../services/purchase-orders.service';
import {
  CreatePurchaseProductRequest,
  UpdatePurchaseProductRequest,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  PurchaseUnitType,
  PurchaseOrderStatus,
} from '../types/purchase-orders.types';

const VALID_UNIT_TYPES: PurchaseUnitType[] = [
  'package', 'box', 'unit', 'kilogram', 'liter', 'bag', 'bundle', 'sack', 'tray', 'other',
];

const VALID_ORDER_STATUSES: PurchaseOrderStatus[] = ['draft', 'saved', 'completed', 'canceled'];

export class PurchaseProductsController {
  /**
   * GET /api/purchase-products?companyId=xxx&search=xxx&onlyActive=true
   */
  async search(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, search, onlyActive } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId is required' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const activeOnly = onlyActive !== 'false';
      const data = await purchaseOrderService.searchProducts(
        supabase,
        companyId,
        typeof search === 'string' ? search : '',
        activeOnly,
      );

      return res.json(data);
    } catch (error: any) {
      console.error('Error in PurchaseProductsController.search:', error);
      return res.status(500).json({ error: 'Failed to search products', message: error.message });
    }
  }

  /**
   * GET /api/purchase-products/list?companyId=xxx
   */
  async list(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId is required' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const data = await purchaseOrderService.listProducts(supabase, companyId);
      return res.json(data);
    } catch (error: any) {
      console.error('Error in PurchaseProductsController.list:', error);
      return res.status(500).json({ error: 'Failed to list products', message: error.message });
    }
  }

  /**
   * POST /api/purchase-products
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as CreatePurchaseProductRequest;

      if (!body.companyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }
      if (!body.name || body.name.trim().length === 0) {
        return res.status(400).json({ error: 'name is required' });
      }
      if (!body.unitType || !VALID_UNIT_TYPES.includes(body.unitType)) {
        return res.status(400).json({ error: `unitType must be one of: ${VALID_UNIT_TYPES.join(', ')}` });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const data = await purchaseOrderService.createProduct(
        supabase,
        body.companyId,
        body.name,
        body.unitType,
      );

      return res.status(201).json(data);
    } catch (error: any) {
      console.error('Error in PurchaseProductsController.create:', error);
      return res.status(500).json({ error: 'Failed to create product', message: error.message });
    }
  }

  /**
   * PUT /api/purchase-products/:id
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const body = req.body as UpdatePurchaseProductRequest;

      const updates: Record<string, unknown> = {};

      if (body.name !== undefined) {
        if (body.name.trim().length === 0) {
          return res.status(400).json({ error: 'name cannot be empty' });
        }
        updates.name = body.name.trim();
      }

      if (body.unitType !== undefined) {
        if (!VALID_UNIT_TYPES.includes(body.unitType)) {
          return res.status(400).json({ error: `unitType must be one of: ${VALID_UNIT_TYPES.join(', ')}` });
        }
        updates.unit_type = body.unitType;
      }

      if (body.isActive !== undefined) {
        updates.is_active = body.isActive;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const data = await purchaseOrderService.updateProduct(supabase, id, updates as any);
      return res.json(data);
    } catch (error: any) {
      console.error('Error in PurchaseProductsController.update:', error);
      return res.status(500).json({ error: 'Failed to update product', message: error.message });
    }
  }
}

export class PurchaseOrdersController {
  /**
   * GET /api/purchase-orders?companyId=xxx&status=xxx
   */
  async list(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, status } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId is required' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const validStatus =
        status && typeof status === 'string' && VALID_ORDER_STATUSES.includes(status as PurchaseOrderStatus)
          ? (status as PurchaseOrderStatus)
          : undefined;

      const data = await purchaseOrderService.listOrders(supabase, companyId, validStatus);
      return res.json(data);
    } catch (error: any) {
      console.error('Error in PurchaseOrdersController.list:', error);
      return res.status(500).json({ error: 'Failed to list orders', message: error.message });
    }
  }

  /**
   * GET /api/purchase-orders/:id
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;

      const supabase = getSupabaseClient(authReq.accessToken!);
      const data = await purchaseOrderService.getOrderById(supabase, id);

      if (!data) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Error in PurchaseOrdersController.getById:', error);
      return res.status(500).json({ error: 'Failed to get order', message: error.message });
    }
  }

  /**
   * POST /api/purchase-orders
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as CreatePurchaseOrderRequest;

      if (!body.companyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }
      if (!body.items || body.items.length === 0) {
        return res.status(400).json({ error: 'items must have at least one entry' });
      }

      for (const item of body.items) {
        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({ error: 'Each item must have a quantity greater than zero' });
        }
        if (!VALID_UNIT_TYPES.includes(item.unitType)) {
          return res.status(400).json({ error: `unitType must be one of: ${VALID_UNIT_TYPES.join(', ')}` });
        }
        if (!item.productId && (!item.productName || item.productName.trim().length === 0)) {
          return res.status(400).json({ error: 'Each item must have productId or productName' });
        }
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const userId = authReq.user!.id;
      const orderDate = body.orderDate ?? new Date().toISOString().split('T')[0];

      const data = await purchaseOrderService.createOrder(
        supabase,
        body.companyId,
        userId,
        orderDate,
        body.items,
        body.notes,
      );

      return res.status(201).json(data);
    } catch (error: any) {
      console.error('Error in PurchaseOrdersController.create:', error);
      return res.status(500).json({ error: 'Failed to create order', message: error.message });
    }
  }

  /**
   * PUT /api/purchase-orders/:id
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const body = req.body as UpdatePurchaseOrderRequest;

      if (body.status && !VALID_ORDER_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_ORDER_STATUSES.join(', ')}` });
      }

      if (body.items) {
        for (const item of body.items) {
          if (!item.quantity || item.quantity <= 0) {
            return res.status(400).json({ error: 'Each item must have a quantity greater than zero' });
          }
          if (!VALID_UNIT_TYPES.includes(item.unitType)) {
            return res.status(400).json({ error: `unitType must be one of: ${VALID_UNIT_TYPES.join(', ')}` });
          }
          if (!item.productId && (!item.productName || item.productName.trim().length === 0)) {
            return res.status(400).json({ error: 'Each item must have productId or productName' });
          }
        }
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      // Extract companyId from the existing order
      const existing = await purchaseOrderService.getOrderById(supabase, id);
      if (!existing) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      const data = await purchaseOrderService.updateOrder(
        supabase,
        id,
        existing.company_id,
        {
          orderDate: body.orderDate,
          notes: body.notes,
          status: body.status,
          items: body.items,
        },
      );

      return res.json(data);
    } catch (error: any) {
      console.error('Error in PurchaseOrdersController.update:', error);
      return res.status(500).json({ error: 'Failed to update order', message: error.message });
    }
  }

  /**
   * POST /api/purchase-orders/:id/cancel
   */
  async cancel(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const data = await purchaseOrderService.cancelOrder(supabase, id, companyId);
      return res.json(data);
    } catch (error: any) {
      console.error('Error in PurchaseOrdersController.cancel:', error);
      return res.status(500).json({ error: 'Failed to cancel order', message: error.message });
    }
  }

  /**
   * GET /api/purchase-orders/:id/whatsapp-message
   */
  async getWhatsAppMessage(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { greeting, closing } = req.query;

      const supabase = getSupabaseClient(authReq.accessToken!);
      const order = await purchaseOrderService.getOrderById(supabase, id);

      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      if (!order.purchase_order_items || order.purchase_order_items.length === 0) {
        return res.status(400).json({ error: 'Order has no items' });
      }

      const message = purchaseOrderService.generateWhatsAppMessage(
        order.purchase_order_items,
        typeof greeting === 'string' ? greeting : undefined,
        typeof closing === 'string' ? closing : undefined,
      );

      return res.json({ message });
    } catch (error: any) {
      console.error('Error in PurchaseOrdersController.getWhatsAppMessage:', error);
      return res.status(500).json({ error: 'Failed to generate message', message: error.message });
    }
  }

  /**
   * GET /api/purchase-orders/suggestions?companyId=xxx
   */
  async getSuggestions(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId is required' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const suggestions = await purchaseOrderService.getSuggestions(supabase, companyId);
      return res.json(suggestions);
    } catch (error: any) {
      console.error('Error in PurchaseOrdersController.getSuggestions:', error);
      return res.status(500).json({ error: 'Failed to get suggestions', message: error.message });
    }
  }
}

export const purchaseProductsController = new PurchaseProductsController();
export const purchaseOrdersController = new PurchaseOrdersController();
