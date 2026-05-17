# Purchase Order System – API Reference (cURL)

> Base URL: `http://localhost:3001`  
> All endpoints require a valid Supabase JWT in the `Authorization: Bearer <TOKEN>` header.

---

## Table of Contents

1. [Purchase Products](#1-purchase-products)
   - [1.1 Search / Autocomplete](#11-search--autocomplete)
   - [1.2 List All Products](#12-list-all-products)
   - [1.3 Create Product](#13-create-product)
   - [1.4 Update Product](#14-update-product)
2. [Purchase Suppliers](#2-purchase-suppliers)
   - [2.1 Search Suppliers](#21-search-suppliers)
   - [2.2 List All Suppliers](#22-list-all-suppliers)
3. [Purchase Orders](#3-purchase-orders)
   - [3.1 List Orders](#31-list-orders)
   - [3.2 Get Order by ID](#32-get-order-by-id)
   - [3.3 Create Order (with auto supplier & product creation)](#33-create-order-with-auto-supplier--product-creation)
   - [3.4 Update Order](#34-update-order)
   - [3.5 Cancel Order](#35-cancel-order)
   - [3.6 Complete Order](#36-complete-order)
   - [3.7 Generate WhatsApp Message](#37-generate-whatsapp-message)
   - [3.8 Smart Purchase Suggestions](#38-smart-purchase-suggestions)

---

## Valid Values

### `unitType`
| Value | Description |
|-------|-------------|
| `package` | Package |
| `box` | Box |
| `unit` | Unit |
| `kilogram` | Kilogram |
| `liter` | Liter |
| `bag` | Bag |
| `bundle` | Bundle |
| `sack` | Sack |
| `tray` | Tray |
| `other` | Other |

### `status` (purchase orders)
| Value | Description |
|-------|-------------|
| `draft` | Draft, not yet saved |
| `saved` | Saved (default on creation) |
| `completed` | Completed |
| `canceled` | Canceled |

---

## 1. Purchase Products

### 1.1 Search / Autocomplete

Returns up to 20 active products whose name contains the `search` string. Use this for autocomplete while the user is typing.

```bash
curl -X GET \
  "http://localhost:3001/api/purchase-products/search?companyId=YOUR_COMPANY_ID&search=flour&onlyActive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `companyId` | Yes | – | UUID of the company |
| `search` | No | `""` | Text to search for (case-insensitive contains match) |
| `onlyActive` | No | `true` | Pass `false` to include inactive products |

**Response `200`**
```json
[
  {
    "id": "d4a7e890-...",
    "company_id": "YOUR_COMPANY_ID",
    "name": "Wheat Flour",
    "unit_type": "bundle",
    "is_active": true,
    "created_at": "2026-05-01T10:00:00Z",
    "updated_at": "2026-05-01T10:00:00Z"
  }
]
```

---

### 1.2 List All Products

Returns every product of the company (active and inactive), sorted alphabetically.

```bash
curl -X GET \
  "http://localhost:3001/api/purchase-products/list?companyId=YOUR_COMPANY_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `companyId` | Yes | UUID of the company |

**Response `200`** – Same schema as search, returns all products.

---

### 1.3 Create Product

Manually registers a new purchase product.

```bash
curl -X POST \
  "http://localhost:3001/api/purchase-products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID",
    "name": "Mozzarella",
    "unitType": "box"
  }'
```

**Request Body**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `companyId` | Yes | `string` | UUID of the company |
| `name` | Yes | `string` | Product name |
| `unitType` | Yes | `string` | One of the valid unit types |

**Response `201`**
```json
{
  "id": "b1c2d3e4-...",
  "company_id": "YOUR_COMPANY_ID",
  "name": "Mozzarella",
  "unit_type": "box",
  "is_active": true,
  "created_at": "2026-05-16T12:00:00Z",
  "updated_at": "2026-05-16T12:00:00Z"
}
```

---

### 1.4 Update Product

Updates one or more fields of an existing product. Useful for renaming, changing the unit type, or marking as inactive.

```bash
curl -X PUT \
  "http://localhost:3001/api/purchase-products/PRODUCT_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Mozzarella",
    "unitType": "box",
    "isActive": true
  }'
```

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | UUID of the product |

**Request Body** (all fields optional, at least one required)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | New product name |
| `unitType` | `string` | New unit type |
| `isActive` | `boolean` | `false` to deactivate the product |

**Response `200`** – Updated product object.

---

## 2. Purchase Suppliers

### 2.1 Search Suppliers

Returns up to 20 active suppliers whose name or CNPJ contains the `search` string. Use this for autocomplete while the user is typing.

```bash
curl -X GET \
  "http://localhost:3001/api/purchase-suppliers/search?companyId=YOUR_COMPANY_ID&search=Distribuidora&onlyActive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `companyId` | Yes | – | UUID of the company |
| `search` | No | `""` | Text to search for in name or CNPJ (case-insensitive) |
| `onlyActive` | No | `true` | Pass `false` to include inactive suppliers |

**Response `200`**
```json
[
  {
    "id": "f8e1d290-...",
    "company_id": "YOUR_COMPANY_ID",
    "name": "Distribuidora ABC",
    "cnpj": "12.345.678/0001-90",
    "is_active": true,
    "created_at": "2026-05-01T10:00:00Z",
    "updated_at": "2026-05-01T10:00:00Z"
  }
]
```

---

### 2.2 List All Suppliers

Returns every supplier of the company (active and inactive), sorted alphabetically.

```bash
curl -X GET \
  "http://localhost:3001/api/purchase-suppliers/list?companyId=YOUR_COMPANY_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `companyId` | Yes | UUID of the company |

**Response `200`** – Array of all supplier objects.

---

## 3. Purchase Orders

### 3.1 List Orders

Returns all purchase orders for a company, including their items and supplier information.


```bash
curl -X GET \
  "http://localhost:3001/api/purchase-orders?companyId=YOUR_COMPANY_ID&status=saved" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `companyId` | Yes | – | UUID of the company |
| `status` | No | all | Filter by status: `draft`, `saved`, `completed`, `canceled` |

**Response `200`**
```json
[
  {
    "id": "order-uuid-...",
    "company_id": "YOUR_COMPANY_ID",
    "order_date": "2026-05-16",
    "status": "saved",
    "notes": "Weekly order",
    "created_by": "user-uuid",
    "created_at": "2026-05-16T12:00:00Z",
    "updated_at": "2026-05-16T12:00:00Z",
    "purchase_order_items": [
      {
        "id": "item-uuid-...",
        "purchase_order_id": "order-uuid-...",
        "product_id": "product-uuid-...",
        "product_name_snapshot": "Wheat Flour",
        "unit_type_snapshot": "bundle",
        "quantity": 2,
        "observation": null,
        "created_at": "2026-05-16T12:00:00Z"
      }
    ]
  }
]
```

---

### 2.2 Get Order by ID

```bash
curl -X GET \
  "http://localhost:3001/api/purchase-orders/ORDER_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response `200`** – Single order object with items and supplier (same schema as list).  
**Response `404`** – `{ "error": "Purchase order not found" }`

---

### 3.3 Create Order (with auto supplier & product creation)

Creates a purchase order with automatic supplier and product registration when needed.

- **For suppliers**: Provide `supplierId` to use an existing supplier, or `supplierName` (and optionally `supplierCnpj`) to find/create one automatically.
- **For products**: Provide `productId` to use an existing product, or `productName` to trigger automatic product registration.

After the order is saved, any new suppliers and products are permanently stored and will appear in future searches.

**Using existing supplier and products:**
```bash
curl -X POST \
  "http://localhost:3001/api/purchase-orders" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID",
    "orderDate": "2026-05-16",
    "notes": "Weekly supplier order",
    "supplier": {
      "supplierId": "EXISTING_SUPPLIER_UUID"
    },
    "items": [
      {
        "productId": "EXISTING_PRODUCT_UUID",
        "unitType": "bundle",
        "quantity": 2
      },
      {
        "productId": "ANOTHER_PRODUCT_UUID",
        "unitType": "box",
        "quantity": 1,
        "observation": "Extra cold please"
      }
    ]
  }'
```

**With auto supplier & product creation (new items typed by name):**
```bash
curl -X POST \
  "http://localhost:3001/api/purchase-orders" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID",
    "orderDate": "2026-05-16",
    "notes": "First order from new supplier",
    "supplier": {
      "supplierName": "Distribuidora ABC",
      "supplierCnpj": "12.345.678/0001-90"
    },
    "items": [
      {
        "productName": "Wheat Flour Bundle",
        "unitType": "bundle",
        "quantity": 2
      },
      {
        "productName": "Mozzarella",
        "unitType": "box",
        "quantity": 1
      },
      {
        "productName": "Tomato Sauce",
        "unitType": "unit",
        "quantity": 3
      },
      {
        "productName": "Chicken",
        "unitType": "kilogram",
        "quantity": 5
      }
    ]
  }'
```

**Request Body**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `companyId` | Yes | `string` | UUID of the company |
| `orderDate` | No | today | ISO date string (`YYYY-MM-DD`) |
| `notes` | No | `null` | Optional notes |
| `supplier` | No | `object` | Supplier information (optional) |
| `supplier.supplierId` | Conditional | `string` | UUID of existing supplier. If omitted, uses `supplierName` |
| `supplier.supplierName` | Conditional | `string` | Name of the supplier. Auto-creates if not found |
| `supplier.supplierCnpj` | No | `string` | Optional CNPJ for better identification |
| `items` | Yes | `array` | At least one item required |
| `items[].productId` | Conditional | `string` | UUID of existing product. Required if `productName` is omitted |
| `items[].productName` | Conditional | `string` | Name of the product. Used to auto-create when `productId` is omitted |
| `items[].unitType` | Yes | `string` | Unit type |
| `items[].quantity` | Yes | `number` | Must be greater than 0 |
| `items[].observation` | No | `null` | Optional item observation |

**Response `201`** – Created order with all items and supplier resolved.

---

### 3.4 Update Order

Updates an existing purchase order. All fields are optional. You can update supplier, items, dates, notes, or status.

Updates header fields and/or fully replaces the item list of an existing order.

```bash
curl -X PUT \
  "http://localhost:3001/api/purchase-orders/ORDER_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated notes",
    "status": "saved",
    "items": [
      {
        "productName": "Wheat Flour",
        "unitType": "bundle",
        "quantity": 3
      },
      {
        "productId": "EXISTING_PRODUCT_UUID",
        "unitType": "kilogram",
        "quantity": 5,
        "observation": "Fresh batch"
      }
    ]
  }'
```

**Path Parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | UUID of the purchase order |

**Request Body** (all fields optional)

| Field | Type | Description |
|-------|------|-------------|
| `orderDate` | `string` | New order date |
| `notes` | `string` | New notes |
| `status` | `string` | New status |
| `supplier` | `object` | New supplier information (same schema as create) |
| `items` | `array` | If provided, replaces all existing items. Same schema as create |

**Response `200`** – Updated order with items.

---

### 3.5 Cancel Order

```bash
curl -X POST \
  "http://localhost:3001/api/purchase-orders/ORDER_UUID/cancel" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID"
  }'
```

**Response `200`**
```json
{
  "id": "ORDER_UUID",
  "status": "canceled",
  ...
}
```

---

### 3.6 Complete Order

Marks a purchase order as completed (received).

```bash
curl -X POST \
  "http://localhost:3001/api/purchase-orders/ORDER_UUID/complete" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "YOUR_COMPANY_ID"
  }'
```

**Request Body**

| Field | Required | Description |
|-------|----------|-------------|
| `companyId` | Yes | UUID of the company |

**Response `200`**
```json
{
  "id": "ORDER_UUID",
  "status": "completed",
  ...
}
```

---

### 3.7 Generate WhatsApp Message

Generates a formatted WhatsApp message ready to copy and send manually to a supplier.

```bash
curl -X GET \
  "http://localhost:3001/api/purchase-orders/ORDER_UUID/whatsapp-message" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**With custom greeting/closing:**
```bash
curl -X GET \
  "http://localhost:3001/api/purchase-orders/ORDER_UUID/whatsapp-message?greeting=Good%20afternoon!&closing=Best%20regards." \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `greeting` | No | `Hello, good morning!` | Opening line of the message |
| `closing` | No | `Thank you.` | Closing line of the message |

**Response `200`**
```json
{
  "message": "Hello, good morning!\n\nI would like to place the following order:\n\n- 2 bundle of Wheat Flour\n- 1 box of Mozzarella\n- 3 unit of Tomato Sauce\n- 5 kilogram of Chicken\n\nThank you."
}
```

The `message` field can be copied directly and pasted into WhatsApp.

---

### 3.8 Smart Purchase Suggestions

Analyzes previous purchase history and returns products that are likely needed again based on average purchase intervals.

**Rules applied:**
- Only products purchased **at least twice** are returned.
- The average interval between purchases is calculated.
- Suggestions are shown starting **2 days before** the estimated next purchase date.
- Items are sorted with the most overdue first.

```bash
curl -X GET \
  "http://localhost:3001/api/purchase-orders/suggestions?companyId=YOUR_COMPANY_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `companyId` | Yes | UUID of the company |

**Response `200`**
```json
[
  {
    "product_id": "product-uuid-...",
    "product_name": "Wheat Flour",
    "unit_type": "bundle",
    "last_purchase_date": "2026-05-15",
    "total_times_purchased": 3,
    "average_interval_days": 7,
    "last_purchased_quantity": 2,
    "next_estimated_purchase_date": "2026-05-22",
    "days_until_next": 6
  },
  {
    "product_id": "product-uuid-2-...",
    "product_name": "Mozzarella",
    "unit_type": "box",
    "last_purchase_date": "2026-05-10",
    "total_times_purchased": 2,
    "average_interval_days": 14,
    "last_purchased_quantity": 1,
    "next_estimated_purchase_date": "2026-05-24",
    "days_until_next": 8
  }
]
```

**Response Fields**

| Field | Description |
|-------|-------------|
| `product_id` | UUID of the product |
| `product_name` | Current product name |
| `unit_type` | Unit type |
| `last_purchase_date` | Date of the most recent purchase |
| `total_times_purchased` | Number of orders containing this product |
| `average_interval_days` | Average number of days between purchases |
| `last_purchased_quantity` | Quantity from the last purchase (suggested quantity) |
| `next_estimated_purchase_date` | Estimated date for the next purchase |
| `days_until_next` | Days until the next purchase (negative = overdue) |

---

## Full Workflow Example

```bash
# 1. Search for an existing product
curl -X GET \
  "http://localhost:3001/api/purchase-products/search?companyId=COMPANY&search=flour" \
  -H "Authorization: Bearer TOKEN"

# 2. Create a new order mixing existing and new products
curl -X POST \
  "http://localhost:3001/api/purchase-orders" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "COMPANY",
    "items": [
      { "productId": "EXISTING_UUID", "unitType": "bundle", "quantity": 2 },
      { "productName": "New Ingredient", "unitType": "kilogram", "quantity": 10 }
    ]
  }'
# → Returns the saved order. "New Ingredient" is auto-registered in purchase_products.

# 3. Copy the WhatsApp message
curl -X GET \
  "http://localhost:3001/api/purchase-orders/ORDER_UUID/whatsapp-message" \
  -H "Authorization: Bearer TOKEN"

# 4. Check what to buy next time
curl -X GET \
  "http://localhost:3001/api/purchase-orders/suggestions?companyId=COMPANY" \
  -H "Authorization: Bearer TOKEN"
```
