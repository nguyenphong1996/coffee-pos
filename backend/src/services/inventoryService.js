import Order from '../models/Order.js';
import Product from '../models/Product.js';
import InventoryItem from '../models/InventoryItem.js';
import Settings from '../models/Settings.js';

export const deductInventory = async (orderItems, io, userId) => {
  const settings = await Settings.findOne({ key: 'main' });
  const required = new Map();

  for (const item of orderItems) {
    const product = await Product.findById(item.productId);
    if (!product || !product.recipe?.length) continue;

    for (const recipe of product.recipe) {
      const key = String(recipe.inventoryItemId);
      const current = required.get(key) || { inventoryItemId: recipe.inventoryItemId, quantity: 0, note: [] };
      current.quantity += recipe.amount * item.quantity;
      current.note.push(`Bán: ${product.name} x${item.quantity}`);
      required.set(key, current);
    }
  }

  if (settings?.pos?.autoAddTakeawayItems?.length) {
    for (const takeaway of settings.pos.takeawayItems) {
      const key = String(takeaway.inventoryItemId);
      const current = required.get(key) || { inventoryItemId: takeaway.inventoryItemId, quantity: 0, note: [] };
      current.quantity += takeaway.quantity;
      current.note.push(`Takeaway: ${takeaway.name}`);
      required.set(key, current);
    }
  }

  const requiredItems = Array.from(required.values());
  if (requiredItems.length === 0) return [];

  const inventoryIds = requiredItems.map((r) => r.inventoryItemId);
  const inventories = await InventoryItem.find({ _id: { $in: inventoryIds } });
  const inventoryById = new Map(inventories.map((inventory) => [String(inventory._id), inventory]));

  const insufficient = requiredItems
    .map((reqItem) => {
      const inventory = inventoryById.get(String(reqItem.inventoryItemId));
      if (!inventory || inventory.quantity < reqItem.quantity) {
        return {
          itemId: reqItem.inventoryItemId,
          name: inventory?.name || 'Không xác định',
          quantity: inventory?.quantity || 0,
          required: reqItem.quantity,
          threshold: inventory?.alertThreshold || 0,
          type: 'insufficient',
        };
      }
      return null;
    })
    .filter(Boolean);

  if (insufficient.length > 0) {
    const error = new Error('Không đủ tồn kho để tạo đơn hàng');
    error.code = 'INSUFFICIENT_INVENTORY';
    error.details = insufficient;
    throw error;
  }

  const applied = [];

  try {
    for (const reqItem of requiredItems) {
      const result = await InventoryItem.updateOne(
        { _id: reqItem.inventoryItemId, quantity: { $gte: reqItem.quantity } },
        {
          $inc: { quantity: -reqItem.quantity },
          $push: {
            history: {
              type: 'out',
              quantity: -reqItem.quantity,
              note: reqItem.note.join(' | '),
              performedBy: userId,
            },
          },
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error('Tồn kho thay đổi trong lúc tạo đơn, vui lòng thử lại');
      }

      applied.push(reqItem);
    }
  } catch (error) {
    for (const reqItem of applied) {
      await InventoryItem.updateOne(
        { _id: reqItem.inventoryItemId },
        { $inc: { quantity: reqItem.quantity } }
      );
    }
    throw error;
  }

  const refreshedInventories = await InventoryItem.find({ _id: { $in: inventoryIds } });
  return refreshedInventories
    .filter((inventory) => inventory.quantity <= inventory.alertThreshold)
    .map((inventory) => ({
      itemId: inventory._id,
      name: inventory.name,
      quantity: inventory.quantity,
      threshold: inventory.alertThreshold,
      type: 'low_stock',
    }));
};

export const restoreInventory = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.productId);
    if (!product || !product.recipe?.length) continue;

    for (const recipe of product.recipe) {
      await InventoryItem.updateOne(
        { _id: recipe.inventoryItemId },
        { $inc: { quantity: recipe.amount * item.quantity } }
      );
    }
  }
};
