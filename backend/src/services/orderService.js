import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Table from '../models/Table.js';
import { deductInventory, restoreInventory } from './inventoryService.js';
import { createNotification } from './notificationService.js';

export const createOrder = async (orderData, io, user) => {
  const { items, tableId, isTakeaway, payment } = orderData;

  // Calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new Error(`Sản phẩm không tồn tại: ${item.productId}`);
    if (!product.isAvailable) throw new Error(`Sản phẩm "${product.name}" hiện không có sằng`);

    const itemTotal = (product.price + (item.variant?.priceModifier || 0)) * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: product._id,
      name: product.name,
      price: product.price + (item.variant?.priceModifier || 0),
      quantity: item.quantity,
      variant: item.variant?.name || '',
      toppings: item.toppings || [],
      note: item.note || '',
      totalPrice: itemTotal,
    });
  }

  if (!isTakeaway) {
    const alerts = await deductInventory(orderItems, io, user._id);
    if (alerts.length > 0) {
      if (io) {
        io.to('role:admin').emit('inventory:alert', { alerts });
        io.to('pos:staff').emit('inventory:alert', { alerts });
      }
      await createNotification({
        recipientRole: 'admin',
        type: 'low_stock',
        title: 'Cảnh báo hết hàng',
        message: `${alerts.length} nguyên liệu sắp hết sau đơn hàng #${user.name}`,
        data: { alerts },
        io,
      });
    }
  }

  const order = new Order({
    items: orderItems,
    subtotal,
    tax: 0,
    discount: 0,
    total: subtotal,
    tableId,
    isTakeaway,
    staffId: user._id,
    staffName: user.name,
    payment: payment || {},
  });

  if (tableId) {
    const table = await Table.findById(tableId);
    if (table) {
      order.tableName = table.name;
      table.status = 'occupied';
      await table.save();
    }
  }

  await order.save();
  return order;
};

export const updateOrderStatus = async (orderId, status, io) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Đơn hàng không tồn tại');

  const oldStatus = order.status;
  order.status = status;

  if (status === 'completed') {
    order.completedAt = new Date();
    order.paymentStatus = 'paid';
  }

  if (status === 'cancelled') {
    if (oldStatus !== 'completed') {
      await restoreInventory(order.items);
    }
    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, { status: 'available' });
    }
  }

  await order.save();

  if (io) {
    io.emit('order:status', { orderId, status, oldStatus });
  }

  return order;
};

export const confirmPayment = async (orderId, io) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Đơn hàng không tồn tại');

  order.paymentStatus = 'paid';
  order.payment.isConfirmed = true;
  order.payment.confirmedAt = new Date();
  order.status = 'confirmed';
  await order.save();

  if (io) {
    io.to('pos:staff').emit('payment:confirmed', { orderId, status: 'confirmed' });
    io.to('role:admin').emit('payment:confirmed', { orderId, status: 'confirmed' });
  }

  return order;
};
