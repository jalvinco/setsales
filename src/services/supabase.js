import { supabaseUrl as configUrl, supabaseKey as configApiKey } from '../utils/storage';

// In-memory runtime configuration
let RUNTIME_SUPABASE_URL = configUrl || 'https://jbzajgmyaiapnwmagulb.supabase.co/rest/v1/';
let RUNTIME_SUPABASE_KEY = configApiKey || 'sb_publishable_mi7cJIQRtZ2ya_ieCJLN6w_OENAzgNt';

export function setSupabaseConfig({ url, apiKey }) {
  if (url) RUNTIME_SUPABASE_URL = url.endsWith('/') ? url : `${url}/`;
  if (apiKey) RUNTIME_SUPABASE_KEY = apiKey;
}

export function hashPin(pinStr) {
  if (!pinStr) return '';
  let hash = 0;
  for (let i = 0; i < pinStr.length; i++) {
    const char = pinStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

async function supabaseFetch(endpoint, options = {}) {
  const url = `${RUNTIME_SUPABASE_URL}${endpoint}`;
  const headers = {
    'apikey': RUNTIME_SUPABASE_KEY,
    'Authorization': `Bearer ${RUNTIME_SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMsg = errorText;
    try {
      const parsedObj = JSON.parse(errorText);
      if (parsedObj && parsedObj.message) parsedMsg = parsedObj.message;
    } catch (_e) {}
    throw new Error(`Supabase Error (${response.status}): ${parsedMsg}`);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

// ==================== ROLE PERMISSIONS ====================
export async function fetchRolePermissions() {
  try {
    const data = await supabaseFetch('role_permissions?select=*&order=role.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch role_permissions:', error.message);
    return [
      { id: 1, role: 1, people: true, report: true, inventory: true, items: true, settings: true, refunds: true },
      { id: 2, role: 2, people: true, report: true, inventory: true, items: true, settings: true, refunds: true },
      { id: 3, role: 3, people: false, report: false, inventory: true, items: false, settings: false, refunds: false },
    ];
  }
}

export async function updateRolePermissions(roleNumber, permissionPatchObj) {
  const data = await supabaseFetch(`role_permissions?role=eq.${roleNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(permissionPatchObj),
  });
  return Array.isArray(data) ? data[0] : data;
}

// ==================== PAYMENT METHODS ====================
export async function fetchPaymentMethods() {
  try {
    const data = await supabaseFetch('payment_methods?select=*&order=id.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch payment_methods:', error.message);
    return [
      { id: 1, name: 'Cash', is_active: true, color: '#DCFCE7' },
      { id: 2, name: 'Card', is_active: true, color: '#DBEAFE' },
      { id: 3, name: 'GCash', is_active: true, color: '#EFF6FF' },
    ];
  }
}

export async function createPaymentMethod({ name, color = null }) {
  const payload = {
    name,
    color: color || null,
    is_active: true,
  };
  const data = await supabaseFetch('payment_methods', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updatePaymentMethod(id, { name, is_active, color }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (is_active !== undefined) payload.is_active = Boolean(is_active);
  if (color !== undefined) payload.color = color || null;

  const data = await supabaseFetch(`payment_methods?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

// ==================== DRAWER HISTORY ====================
export async function fetchDrawerHistory() {
  try {
    const data = await supabaseFetch('drawer_history?select=*&order=drawer_datetime.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch drawer_history:', error.message);
    return [];
  }
}

export async function createDrawerHistory({ type, amount, reason = '' }) {
  const payload = {
    drawer_datetime: new Date().toISOString(),
    type, // 'add' | 'subtract' | 'set'
    amount: Number(amount) || 0.0,
    reason: reason || '',
  };

  const data = await supabaseFetch('drawer_history', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

// ==================== USERS & PEOPLE ====================
export async function fetchUsers() {
  try {
    const data = await supabaseFetch('users?select=*&order=id.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch users from Supabase:', error.message);
    return [];
  }
}

export async function createUser({ name, pin = '000000', role = 3, rate = 0, half_rate = 0, extra_rate = 0, color = null }) {
  const nowIso = new Date().toISOString();
  const hashedPin = hashPin(pin || '000000');

  const payload = {
    name,
    pin: hashedPin,
    role: String(role),
    rate: Number(rate) || 0,
    half_rate: Number(half_rate) || 0,
    extra_rate: Number(extra_rate) || 0,
    color: color || null,
    creation: nowIso,
    edited: nowIso,
    last_login: nowIso,
    last_action: 'Out',
  };

  const data = await supabaseFetch('users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateUser(id, { name, pin, role, rate, half_rate, extra_rate, last_login, last_action, color }) {
  const payload = {
    edited: new Date().toISOString(),
  };
  if (name !== undefined) payload.name = name;
  if (pin !== undefined) payload.pin = hashPin(pin);
  if (role !== undefined) payload.role = String(role);
  if (rate !== undefined) payload.rate = Number(rate) || 0;
  if (half_rate !== undefined) payload.half_rate = Number(half_rate) || 0;
  if (extra_rate !== undefined) payload.extra_rate = Number(extra_rate) || 0;
  if (last_login !== undefined) payload.last_login = last_login;
  if (last_action !== undefined) payload.last_action = last_action;
  if (color !== undefined) payload.color = color || null;

  const data = await supabaseFetch(`users?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteUser(id) {
  const data = await supabaseFetch(`users?id=eq.${id}`, {
    method: 'DELETE',
  });
  return data;
}

// ==================== LOGS ====================
export async function fetchLogs() {
  try {
    const data = await supabaseFetch('logs?select=*&order=datetime.desc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch logs from Supabase:', error.message);
    return [];
  }
}

export async function createLog({ datetime, type, user_id }) {
  const parsedUserId = Number(Array.isArray(user_id) ? user_id[0] : user_id) || 1;

  const payload = {
    datetime: datetime || new Date().toISOString(),
    type, // 'In' | 'Out'
    user_id: parsedUserId,
  };

  const data = await supabaseFetch('logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

// ==================== BUSINESS HOURS ====================
export async function fetchBusinessHours() {
  try {
    const data = await supabaseFetch('business_hours?select=*&order=id.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch business_hours:', error.message);
    return [];
  }
}

export async function updateBusinessHours(id, { is_closed, open_time, close_time }) {
  const payload = {};
  if (is_closed !== undefined) payload.is_closed = Boolean(is_closed);
  if (open_time !== undefined) payload.open_time = open_time;
  if (close_time !== undefined) payload.close_time = close_time;

  const data = await supabaseFetch(`business_hours?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

// ==================== CATEGORIES ====================
export async function fetchCategories() {
  try {
    const data = await supabaseFetch('categories?select=*&order=id.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch categories:', error.message);
    return [];
  }
}

export async function createCategory({ name }) {
  const payload = { name, is_active: true };
  const data = await supabaseFetch('categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateCategory(id, { name, is_active }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (is_active !== undefined) payload.is_active = Boolean(is_active);

  const data = await supabaseFetch(`categories?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteCategory(id) {
  const data = await supabaseFetch(`categories?id=eq.${id}`, {
    method: 'DELETE',
  });
  return data;
}

// ==================== ITEM TYPES ====================
export async function fetchItemTypes() {
  try {
    const data = await supabaseFetch('item_types?select=*&order=id.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch item_types:', error.message);
    return [];
  }
}

export async function createItemType({ name, color = null }) {
  const payload = { name, color: color || null };
  const data = await supabaseFetch('item_types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateItemType(id, { name, color }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (color !== undefined) payload.color = color || null;

  const data = await supabaseFetch(`item_types?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteItemType(id) {
  const data = await supabaseFetch(`item_types?id=eq.${id}`, {
    method: 'DELETE',
  });
  return data;
}

// ==================== INVENTORY ====================
export async function fetchInventory() {
  try {
    const data = await supabaseFetch('inventory?select=*&order=id.asc');
    if (!data) return [];
    return data.filter((i) => i.is_deleted !== true && i.is_delete !== true);
  } catch (error) {
    console.warn('Failed to fetch inventory:', error.message);
    return [];
  }
}

export async function createInventory({ name, quantity = 0, measure = 'pcs', warning_quantity = 5.0 }) {
  const payload = {
    name,
    quantity: Number(quantity) || 0,
    measure: measure || 'pcs',
    warning_quantity: Number(warning_quantity) || 5.0,
    is_deleted: false,
  };
  const data = await supabaseFetch('inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateInventory(id, { name, quantity, measure, warning_quantity, is_deleted }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (quantity !== undefined) payload.quantity = Number(quantity) || 0;
  if (measure !== undefined) payload.measure = measure;
  if (warning_quantity !== undefined) payload.warning_quantity = Number(warning_quantity) || 5.0;
  if (is_deleted !== undefined) payload.is_deleted = Boolean(is_deleted);

  const data = await supabaseFetch(`inventory?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteInventory(id) {
  try {
    const data = await supabaseFetch(`inventory?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_deleted: true }),
    });
    return data;
  } catch (e) {
    return await supabaseFetch(`inventory?id=eq.${id}`, {
      method: 'DELETE',
    });
  }
}

// ==================== ITEM RECIPES & MODIFIER RECIPES ====================
export async function fetchItemRecipes() {
  try {
    const data = await supabaseFetch('item_recipes?select=*');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch item_recipes:', error.message);
    return [];
  }
}

export async function fetchItemModifierRecipes() {
  try {
    const data = await supabaseFetch('item_modifier_recipes?select=*');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch item_modifier_recipes:', error.message);
    return [];
  }
}

export async function setInventoryRecipes(inventoryId, itemRecipesList = [], modifierRecipesList = []) {
  try {
    await supabaseFetch(`item_recipes?inventory_id=eq.${inventoryId}`, {
      method: 'DELETE',
    });
    await supabaseFetch(`item_modifier_recipes?inventory_id=eq.${inventoryId}`, {
      method: 'DELETE',
    });

    if (itemRecipesList.length > 0) {
      const itemPayload = itemRecipesList.map((r) => ({
        inventory_id: Number(inventoryId),
        item_id: Number(r.item_id),
        quantity_used: Number(r.quantity_used) || 1.0,
      }));
      await supabaseFetch('item_recipes', {
        method: 'POST',
        body: JSON.stringify(itemPayload),
      });
    }

    if (modifierRecipesList.length > 0) {
      const modPayload = modifierRecipesList.map((r) => ({
        inventory_id: Number(inventoryId),
        modifier_id: Number(r.modifier_id),
        quantity_used: Number(r.quantity_used) || 0.1,
      }));
      await supabaseFetch('item_modifier_recipes', {
        method: 'POST',
        body: JSON.stringify(modPayload),
      });
    }
  } catch (e) {
    console.warn('Error setting inventory recipes:', e.message);
  }
}

// ==================== MODIFIER GROUPS ====================
export async function fetchModifierGroups() {
  try {
    const data = await supabaseFetch('modifier_groups?select=*&order=id.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch modifier_groups:', error.message);
    return [];
  }
}

export async function createModifierGroup({ name, min_selection = 1, max_selection = 1 }) {
  const payload = {
    name,
    min_selection: Number(min_selection) || 0,
    max_selection: Number(max_selection) || 1,
  };
  const data = await supabaseFetch('modifier_groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateModifierGroup(id, { name, min_selection, max_selection }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (min_selection !== undefined) payload.min_selection = Number(min_selection) || 0;
  if (max_selection !== undefined) payload.max_selection = Number(max_selection) || 1;

  const data = await supabaseFetch(`modifier_groups?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteModifierGroup(id) {
  const data = await supabaseFetch(`modifier_groups?id=eq.${id}`, {
    method: 'DELETE',
  });
  return data;
}

// ==================== MODIFIERS ====================
export async function fetchModifiers() {
  try {
    const data = await supabaseFetch('modifiers?select=*&order=id.asc');
    if (!data) return [];
    return data.filter((m) => m.is_deleted !== true);
  } catch (error) {
    console.warn('Failed to fetch modifiers:', error.message);
    return [];
  }
}

export async function createModifier({ group_id, name, extra_price = 0, is_available = true, color = null }) {
  const payload = {
    group_id: Number(group_id),
    name,
    extra_price: Number(extra_price) || 0,
    is_available: Boolean(is_available),
    color: color || null,
    is_deleted: false,
  };
  const data = await supabaseFetch('modifiers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateModifier(id, { name, extra_price, is_available, color }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (extra_price !== undefined) payload.extra_price = Number(extra_price) || 0;
  if (is_available !== undefined) payload.is_available = Boolean(is_available);
  if (color !== undefined) payload.color = color || null;

  const data = await supabaseFetch(`modifiers?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteModifier(id) {
  try {
    const data = await supabaseFetch(`modifiers?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_deleted: true }),
    });
    return data;
  } catch (e) {
    return await supabaseFetch(`modifiers?id=eq.${id}`, {
      method: 'DELETE',
    });
  }
}

// ==================== ITEM MODIFIER GROUPS ====================
export async function fetchItemModifierGroups() {
  try {
    const data = await supabaseFetch('item_modifier_groups?select=*');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch item_modifier_groups:', error.message);
    return [];
  }
}

export async function setItemModifierGroups(itemId, groupIds = []) {
  try {
    await supabaseFetch(`item_modifier_groups?item_id=eq.${itemId}`, {
      method: 'DELETE',
    });

    if (groupIds.length > 0) {
      const payloads = groupIds.map((groupId) => ({
        item_id: Number(itemId),
        modifier_group_id: Number(groupId),
      }));
      await supabaseFetch('item_modifier_groups', {
        method: 'POST',
        body: JSON.stringify(payloads),
      });
    }
  } catch (e) {
    console.warn('Error setting item_modifier_groups:', e.message);
  }
}

// ==================== ITEMS / PRODUCTS ====================
export async function fetchItems() {
  try {
    const data = await supabaseFetch('items?select=*&order=id.asc');
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch items:', error.message);
    return [];
  }
}

export async function createItem({ name, price = 0, cost_amount = 0, type = 'General', category_id, item_type_id, description = '' }) {
  const payload = {
    name,
    price: Number(price) || 0,
    cost_amount: Number(cost_amount) || 0,
    type,
    category_id: category_id ? Number(category_id) : null,
    item_type_id: item_type_id ? Number(item_type_id) : null,
    description,
    creation: new Date().toISOString(),
  };

  const data = await supabaseFetch('items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateItem(id, { name, price, cost_amount, type, category_id, item_type_id, description }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (price !== undefined) payload.price = Number(price) || 0;
  if (cost_amount !== undefined) payload.cost_amount = Number(cost_amount) || 0;
  if (type !== undefined) payload.type = type;
  if (category_id !== undefined) payload.category_id = category_id ? Number(category_id) : null;
  if (item_type_id !== undefined) payload.item_type_id = item_type_id ? Number(item_type_id) : null;
  if (description !== undefined) payload.description = description;

  const data = await supabaseFetch(`items?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteItem(id) {
  const data = await supabaseFetch(`items?id=eq.${id}`, {
    method: 'DELETE',
  });
  return data;
}

// ==================== ORDERS & TRANSACTIONS ====================
export async function fetchOrders() {
  try {
    const data = await supabaseFetch(
      'orders?select=*,order_items(*,order_item_modifiers(*))&order=id.desc'
    );
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch orders:', error.message);
    return [];
  }
}

export async function createCompleteOrder({
  order_number,
  payment_method,
  payment_method_id,
  subtotal,
  discount_amount,
  cost_total,
  payment_amount,
  total_amount,
  cartItems = [],
}) {
  const nowIso = new Date().toISOString();

  const orderPayload = {
    order_number: order_number || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    created_at: nowIso,
    payment_method: payment_method || 'cash',
    payment_method_id: payment_method_id ? Number(payment_method_id) : null,
    discount_amount: Number(discount_amount) || 0,
    cost_amount: Number(cost_total) || 0,
    payment_amount: Number(payment_amount) || Number(total_amount) || 0,
    total_amount: Number(total_amount) || 0,
    status: 'paid',
  };

  const createdOrderArray = await supabaseFetch('orders', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });

  const createdOrder = Array.isArray(createdOrderArray) ? createdOrderArray[0] : createdOrderArray;

  if (cartItems.length > 0 && createdOrder && createdOrder.id) {
    for (const cartItem of cartItems) {
      const itemPayload = {
        order_id: createdOrder.id,
        item_id: cartItem.id,
        item_name: cartItem.name,
        unit_price: cartItem.price,
        quantity: cartItem.quantity,
        discount_amount: cartItem.discountAmountPerUnit
          ? cartItem.discountAmountPerUnit * cartItem.quantity
          : 0,
        quantity_cancelled: 0,
      };

      const insertedItemArray = await supabaseFetch('order_items', {
        method: 'POST',
        body: JSON.stringify(itemPayload),
      });

      const insertedOrderItem = Array.isArray(insertedItemArray) ? insertedItemArray[0] : insertedItemArray;

      if (cartItem.selectedModifiers && cartItem.selectedModifiers.length > 0 && insertedOrderItem?.id) {
        const modifierPayloads = cartItem.selectedModifiers.map((mod) => ({
          order_item_id: insertedOrderItem.id,
          modifier_id: mod.id,
          modifier_name: mod.name,
          extra_price: Number(mod.extra_price) || 0,
        }));

        await supabaseFetch('order_item_modifiers', {
          method: 'POST',
          body: JSON.stringify(modifierPayloads),
        });
      }
    }
  }

  return createdOrder;
}

export async function updateOrderItemCancel(orderItemId, cancelledQty) {
  const data = await supabaseFetch(`order_items?id=eq.${orderItemId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      quantity_cancelled: Number(cancelledQty) || 0,
    }),
  });
  return Array.isArray(data) ? data[0] : data;
}

export async function updateOrderTotal(orderId, { total_amount, cost_amount, discount_amount }) {
  const payload = {};
  if (total_amount !== undefined) payload.total_amount = Number(total_amount) || 0;
  if (cost_amount !== undefined) payload.cost_amount = Number(cost_amount) || 0;
  if (discount_amount !== undefined) payload.discount_amount = Number(discount_amount) || 0;

  if (payload.total_amount === 0) {
    payload.status = 'refunded';
  }

  const data = await supabaseFetch(`orders?id=eq.${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : data;
}
