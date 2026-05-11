import { body, param, query, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Tên không được để trống'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
];

export const loginRules = [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
];

export const productRules = [
  body('name').trim().notEmpty().withMessage('Tên sản phẩm không được để trống'),
  body('price').isNumeric().withMessage('Giá phải là số'),
];

export const orderRules = [
  body('items').isArray({ min: 1 }).withMessage('Đơn hàng phải có ít nhất 1 sản phẩm'),
];

export const mongoIdParamRules = [
  param('id').isMongoId().withMessage('ID không hợp lệ'),
];

export const createStaffRules = [
  body('name').trim().notEmpty().withMessage('Tên không được để trống'),
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Vai trò không hợp lệ'),
  body('phone').optional().isString().withMessage('Số điện thoại không hợp lệ'),
  body('avatar').optional().isString().withMessage('Avatar không hợp lệ'),
  body('isActive').optional().isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
];

export const updateStaffRules = [
  body('name').optional().trim().notEmpty().withMessage('Tên không được để trống'),
  body('email').optional().isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Vai trò không hợp lệ'),
  body('phone').optional().isString().withMessage('Số điện thoại không hợp lệ'),
  body('avatar').optional().isString().withMessage('Avatar không hợp lệ'),
  body('isActive').optional().isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
];

export const resetStaffPasswordRules = [
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
];

export const updateSettingsRules = [
  body('brandName').optional().trim().notEmpty().withMessage('Tên thương hiệu không được để trống'),
  body('logo').optional().isString().withMessage('Logo không hợp lệ'),
  body('bgImage').optional().isString().withMessage('Ảnh nền không hợp lệ'),
  body('themeColor').optional().matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).withMessage('Màu chủ đề không hợp lệ'),
  body('wifiQR').optional().isObject().withMessage('Cấu hình WiFi không hợp lệ'),
  body('wifiQR.ssid').optional().isString().withMessage('SSID không hợp lệ'),
  body('wifiQR.password').optional().isString().withMessage('Mật khẩu WiFi không hợp lệ'),
  body('wifiQR.type').optional().isIn(['WPA', 'WEP', 'nopass']).withMessage('Loại bảo mật WiFi không hợp lệ'),
  body('wifiQR.isHidden').optional().isBoolean().withMessage('Trạng thái ẩn WiFi không hợp lệ'),
  body('payment').optional().isObject().withMessage('Cấu hình thanh toán không hợp lệ'),
  body('payment.bankName').optional().isString().withMessage('Tên ngân hàng không hợp lệ'),
  body('payment.accountNumber').optional().isString().withMessage('Số tài khoản không hợp lệ'),
  body('payment.accountHolder').optional().isString().withMessage('Tên chủ tài khoản không hợp lệ'),
  body('payment.qrImage').optional().isString().withMessage('QR thanh toán không hợp lệ'),
  body('pos').optional().isObject().withMessage('Cấu hình POS không hợp lệ'),
  body('pos.vatPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('VAT phải từ 0 đến 100'),
  body('pos.serviceFee').optional().isFloat({ min: 0 }).withMessage('Phí dịch vụ phải lớn hơn hoặc bằng 0'),
  body('pos.currency').optional().isString().withMessage('Tiền tệ không hợp lệ'),
  body('pos.autoAddTakeawayItems').optional().isBoolean().withMessage('Cờ tự thêm đồ takeaway không hợp lệ'),
  body('pos.takeawayItems').optional().isArray().withMessage('Danh sách đồ takeaway không hợp lệ'),
  body('pos.takeawayItems.*.inventoryItemId').optional().isMongoId().withMessage('ID vật tư takeaway không hợp lệ'),
  body('pos.takeawayItems.*.name').optional().isString().withMessage('Tên vật tư takeaway không hợp lệ'),
  body('pos.takeawayItems.*.quantity').optional().isInt({ min: 1 }).withMessage('Số lượng takeaway phải >= 1'),
];
