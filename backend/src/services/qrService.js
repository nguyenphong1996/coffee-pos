import QRCode from 'qrcode';
import Settings from '../models/Settings.js';

export const generateQR = async (text, options = {}) => {
  try {
    const qr = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      ...options,
    });
    return qr;
  } catch (error) {
    throw new Error('Không thể tạo mã QR: ' + error.message);
  }
};

export const generateWifiQR = (wifi) => {
  const { ssid, password, type, isHidden } = wifi;
  if (!ssid) return '';
  let qr = `WIFI:T:${type};S:${ssid};`;
  if (password && type !== 'nopass') qr += `P:${password};`;
  if (isHidden) qr += `H:true;`;
  qr += ';';
  return qr;
};

export const generateOrderQR = (baseUrl, tableId) => {
  return `${baseUrl}/customer/order/${tableId}`;
};
