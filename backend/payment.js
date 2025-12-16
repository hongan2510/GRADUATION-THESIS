const express = require('express');
const router = express.Router();
const moment = require('moment');
const qs = require('qs');
const crypto = require('crypto');

// QUAN TRỌNG: Giả sử bạn có file kết nối CSDL,
// ví dụ: const db = require('../db.js');
// Vì tôi không thấy file đó, tôi sẽ để comment TODO nơi bạn cần gọi CSDL

// --- HÀM HELPER SẮP XẾP OBJECT (Bắt buộc cho VNPay) ---
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// --- API 1: TẠO URL THANH TOÁN (React gọi API này) ---
router.post('/create_payment_url', async (req, res) => {
  try {
    // --- BƯỚC 1: LƯU ĐƠN HÀNG VÀO CSDL VỚI STATUS "PENDING" ---
    // Lấy dữ liệu từ React (BookingCheckoutPage.jsx)
    const {
      user_id,
      hotel_id,
      room_id,
      check_in_date,
      check_out_date,
      total_price,
      guests_count,
      customer_name,
      customer_email,
      customer_phone
    } = req.body;

    // TODO: THỰC HIỆN INSERT VÀO CSDL CỦA BẠN TẠI ĐÂY
    // Ví dụ:
    // const sql = "INSERT INTO bookings (user_id, hotel_id, room_id, ..., total_price, status_id, payment_method_id) VALUES (?, ?, ?, ..., ?, 1, 2)";
    // const [result] = await db.query(sql, [user_id, hotel_id, ... , total_price]);
    // const booking_id = result.insertId;
    
    // Giả lập booking_id vì tôi không có CSDL của bạn
    // QUAN TRỌNG: vnp_TxnRef phải là MÃ ĐƠN HÀNG (booking_id) DUY NHẤT
    const booking_id = "BOOK" + moment().format('HHmmss'); // !!! THAY BẰNG BOOKING_ID THẬT CỦA BẠN
    const amount = total_price;
    const orderInfo = `Thanh toan don hang ${booking_id}`;
    // --- Hết BƯỚC 1 ---


    // --- BƯỚC 2: CHUẨN BỊ DỮ LIỆU GỬI SANG VNPAY ---
    const tmnCode = process.env.VNP_TMNCODE; // Lấy từ file .env
    const secretKey = process.env.VNP_HASHSECRET; // Lấy từ file .env
    const vnpUrl = process.env.VNP_URL;
    
    // URL mà VNPay sẽ redirect trình duyệt của user về sau khi thanh toán
    // (Đây LÀ API SỐ 2 CỦA BẠN)
    const returnUrl = "http://localhost:8080/api/payment/vnpay_return"; 
    
    const createDate = moment().format('YYYYMMDDHHmmss');
    const ipAddr = req.headers['x-forwarded-for'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);

    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = booking_id; // MÃ ĐƠN HÀNG (booking_id)
    vnp_Params['vnp_OrderInfo'] = orderInfo;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100; // Phải nhân 100
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    // vnp_Params['vnp_BankCode'] = 'VNBANK'; // (Tùy chọn)

    // Sắp xếp params
    vnp_Params = sortObject(vnp_Params);
    
    // Tạo chữ ký
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    
    vnp_Params['vnp_SecureHash'] = signed;

    // Tạo URL cuối cùng
    const paymentUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });

    // Trả URL về cho React
    res.json({ paymentUrl: paymentUrl });

  } catch (error) {
    console.error("Lỗi khi tạo URL VNPay:", error);
    res.status(500).json({ message: "Lỗi phía máy chủ khi tạo URL thanh toán." });
  }
});


// --- API 2: HỨNG KẾT QUẢ VNPAY TRẢ VỀ (QUA TRÌNH DUYỆT USER) ---
router.get('/vnpay_return', async (req, res) => {
  try {
    const vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    // Xóa hash ra khỏi params
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // Sắp xếp lại
    const sortedParams = sortObject(vnp_Params);
    
    // Lấy secret từ .env
    const secretKey = process.env.VNP_HASHSECRET;
    
    // Tạo lại chữ ký
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    // Lấy mã đơn hàng và mã kết quả
    const booking_id = vnp_Params['vnp_TxnRef'];
    const responseCode = vnp_Params['vnp_ResponseCode'];

    if (secureHash === signed) {
      // --- Chữ ký hợp lệ ---
      
      // TODO: CẬP NHẬT CSDL TẠI ĐÂY
      if (responseCode === '00') {
        // Thanh toán thành công
        // Ví dụ:
        // await db.query("UPDATE bookings SET status_id = 2 WHERE booking_id = ?", [booking_id]);
        // await db.query("INSERT INTO vnpay_transactions (booking_id, vnp_TransactionNo, ...) VALUES (?, ?, ...)", [booking_id, vnp_Params['vnp_TransactionNo']]);
        console.log(`Giao dịch ${booking_id} thành công!`);
        
      } else {
        // Thanh toán thất bại
        // Ví dụ:
        // await db.query("UPDATE bookings SET status_id = 3 WHERE booking_id = ?", [booking_id]);
        console.log(`Giao dịch ${booking_id} thất bại. Mã lỗi: ${responseCode}`);
      }
      
      // --- CHUYỂN HƯỚNG VỀ REACT ---
      // Chuyển tất cả params về React qua URL
      const reactUrlParams = qs.stringify(vnp_Params, { encode: false });
      res.redirect(`http://localhost:3000/payment-return?${reactUrlParams}`);

    } else {
      // --- Chữ ký không hợp lệ ---
      console.log(`Giao dịch ${booking_id} thất bại do sai chữ ký.`);
      // Chuyển hướng về React với mã lỗi '97' (sai chữ ký)
      res.redirect(`http://localhost:3000/payment-return?vnp_ResponseCode=97&vnp_TxnRef=${booking_id}`);
    }

  } catch (error) {
    console.error("Lỗi khi xử lý VNPay Return:", error);
    // Chuyển hướng về React với mã lỗi chung
    res.redirect(`http://localhost:3000/payment-return?vnp_ResponseCode=99`);
  }
});

// --- API 3: HỨNG KẾT QUẢ IPN (VNPAY GỌI SERVER-TO-SERVER) ---
// (API này để đảm bảo, phòng trường hợp user tắt trình duyệt ngay sau khi thanh toán)
router.get('/vnpay_ipn', async (req, res) => {
  try {
    const vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = sortObject(vnp_Params);
    const secretKey = process.env.VNP_HASHSECRET;
    
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    const booking_id = vnp_Params['vnp_TxnRef'];
    const responseCode = vnp_Params['vnp_ResponseCode'];

    if (secureHash === signed) {
      // --- Chữ ký hợp lệ ---
      
      // TODO: KIỂM TRA LẠI ĐƠN HÀNG VÀ CẬP NHẬT CSDL
      // (Đây là nơi quan trọng nhất để xác nhận đơn hàng)
      // Ví dụ:
      // const [rows] = await db.query("SELECT * FROM bookings WHERE booking_id = ?", [booking_id]);
      // if (rows.length > 0) {
      //   if (rows[0].status_id === 1) { // Chỉ cập nhật nếu đơn còn 'pending'
      //     if (responseCode === '00') {
      //       await db.query("UPDATE bookings SET status_id = 2 WHERE booking_id = ?", [booking_id]);
      //     } else {
      //       await db.query("UPDATE bookings SET status_id = 3 WHERE booking_id = ?", [booking_id]);
      //     }
      //     // TRẢ VỀ CHO VNPAY BIẾT ĐÃ XỬ LÝ
      //     res.status(200).json({ RspCode: '00', Message: 'Success' });
      //   } else {
      //     // Đơn đã được cập nhật rồi
      //     res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      //   }
      // } else {
      //   // Không tìm thấy đơn
      //   res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      // }
      
      // Giả lập là đã xử lý
      console.log(`IPN: Xác nhận đơn hàng ${booking_id}, Mã: ${responseCode}`);
      res.status(200).json({ RspCode: '00', Message: 'Success' });

    } else {
      // --- Chữ ký không hợp lệ ---
      console.log(`IPN: Giao dịch ${booking_id} thất bại do sai chữ ký.`);
      res.status(200).json({ RspCode: '97', Message: 'Fail Checksum' });
    }
  } catch (error) {
    console.error("Lỗi khi xử lý VNPay IPN:", error);
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});

module.exports = router;