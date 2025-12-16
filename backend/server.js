import express from "express";
import mysql from "mysql"; 
import cors from "cors";
import bcrypt from "bcrypt"; 
import multer from "multer"; 
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import moment from 'moment'; 
import qs from 'qs'; 
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode'; 
import cron from 'node-cron'; // Thêm dòng này vào phần import trên cùng

// --- TÁI TẠO __dirname TRONG ES MODULE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình Transporter (Nên để ngoài route để tái sử dụng)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'canthotravel91@gmail.com', // Email của bạn
        pass: 'rcpb plqa refa grod'       // Mật khẩu ứng dụng 16 ký tự (Check kỹ lại cái này!)
    }
});
// --- CẤU HÌNH DATABASE ---
const db = mysql.createConnection({
    host: "localhost", 
    user: "root",       
    password: "",       
    database: "tourism_db", 
});



db.connect((err) => {
    if (err) {
        console.error("❌ Lỗi kết nối CSDL:", err.code, err.message);
        return;
    }
    console.log("✅ Connected to MySQL (Standard Driver)");
    
});

const queryAsync = (sql, values) => {
    return new Promise((resolve, reject) => {
        db.query(sql, values, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};
const app = express();
const PORT = 8082; 

app.use(cors()); 
app.use(express.json()); 

// --- 3. CẤU HÌNH UPLOAD ẢNH (MULTER) ---
// Tự động tạo thư mục uploads nếu chưa có
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static('uploads')); // Public thư mục ảnh

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// API Upload ảnh (Dùng chung cho cả hệ thống)
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Chưa chọn file ảnh!" });
    const imageUrl = `http://localhost:8082/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// ============================================================
// 🛠️ HÀM TIỆN ÍCH: TÍNH KHOẢNG CÁCH (Haversine Formula)
// ============================================================

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Bán kính trái đất (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Khoảng cách km
    return d.toFixed(1);
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Tọa độ cố định các điểm giao thông chính tại Cần Thơ
const FIXED_LOCATIONS = {
    AIRPORT: { lat: 10.085122, lng: 105.712357, name: "Sân bay Quốc tế Cần Thơ", type: 'airport' },
    BUS_STATION: { lat: 10.012452, lng: 105.764821, name: "Bến xe khách Cần Thơ", type: 'bus' }
};

// ============================================================
// 🔎 CÁC API TÌM KIẾM (SEARCH ENGINES)
// ============================================================

app.get('/api/search', (req, res) => {
    const keyword = req.query.q;
    if (!keyword) return res.json([]);

    const searchTerm = `%${keyword}%`;

    const sql = `
        (SELECT hotel_id AS id, name, image_url AS image, 'hotel' AS type FROM hotels WHERE name LIKE ? LIMIT 5)
        UNION
        (SELECT dest_id AS id, name, image, 'destination' AS type FROM destinations WHERE name LIKE ? LIMIT 5)
        UNION
        (SELECT tour_id AS id, name, image, 'tour' AS type FROM tours WHERE name LIKE ? LIMIT 5)
        UNION
        (SELECT restaurant_id AS id, name, image, 'restaurant' AS type FROM restaurants WHERE name LIKE ? LIMIT 5)
    `;

    db.query(sql, [searchTerm, searchTerm, searchTerm, searchTerm], (err, results) => {
        if (err) return res.status(500).json({ error: 'Lỗi Server' });
        res.json(results);
    });
});

// ============================================================
// 🔎 API TÌM KIẾM KHÁCH SẠN (CÓ LỌC PHÒNG TRỐNG)
// ============================================================
app.get('/api/search/hotels', (req, res) => {
    const { q, checkIn, checkOut } = req.query;
    const keyword = q ? `%${q}%` : '%';

    // Ngày mặc định nếu khách không chọn
    const cIn = checkIn || new Date().toISOString().split('T')[0];
    const cOut = checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // CÂU SQL "THẦN THÁNH":
    // 1. Tìm khách sạn theo tên/địa chỉ.
    // 2. Tính giá thấp nhất.
    // 3. Đếm xem khách sạn đó còn bao nhiêu phòng trống trong ngày khách chọn.
const sql = `
        SELECT 
            h.hotel_id, h.name, h.description, h.address, h.image_url, h.star_rating, 
            h.city_id, c.name AS city_name,
            (SELECT MIN(price_per_night) FROM rooms WHERE hotel_id = h.hotel_id) AS price_per_night,
            
            (
                SELECT COUNT(r.room_id)
                FROM rooms r
                WHERE r.hotel_id = h.hotel_id
                AND r.room_id NOT IN (
                    SELECT hbd.room_id 
                    FROM hotel_booking_details hbd
                    JOIN bookings b ON hbd.booking_id = b.booking_id
                    WHERE b.status_id IN (1, 2) -- <--- SỬA DÒNG NÀY (Thay vì != 5)
                    AND (hbd.check_in_date < ? AND hbd.check_out_date > ?)
                )
            ) as available_rooms_count

        FROM hotels h
        LEFT JOIN cities c ON h.city_id = c.city_id
        WHERE (h.name LIKE ? OR h.address LIKE ? OR c.name LIKE ?)
        -- Chỉ hiện khách sạn còn ít nhất 1 phòng trống (Bỏ dòng này nếu muốn hiện cả khách sạn hết phòng)
        HAVING available_rooms_count > 0 
        ORDER BY h.hotel_id DESC 
        LIMIT 500
    `;

    // Thứ tự tham số: [checkOut, checkIn, keyword, keyword, keyword]
    db.query(sql, [cOut, cIn, keyword, keyword, keyword], (err, results) => {
        if (err) {
            console.error("Lỗi tìm kiếm:", err);
            return res.status(500).json({ error: "Lỗi Server" });
        }
        res.json(results);
    });
});

app.get('/api/search/activities', (req, res) => {
    const { q } = req.query;
    const keyword = q ? `%${q.trim()}%` : '%';

    const sql = `
        (SELECT tour_id AS id, name, image, price, 'tour' AS type, description AS info, 
                COALESCE(dest_id, 0) as city_id 
         FROM tours WHERE name LIKE ? LIMIT 500)
        UNION
        (SELECT dest_id AS id, name, image, 0 AS price, 'destination' AS type, location AS info, 
                COALESCE(city_id, 0) as city_id 
         FROM destinations WHERE name LIKE ? OR location LIKE ? LIMIT 500)
    `;

    db.query(sql, [keyword, keyword, keyword], (err, results) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        res.json(results);
    });
});

app.get('/api/search/restaurants', (req, res) => {
    const { q } = req.query;
    const keyword = q ? `%${q.trim()}%` : '%';

    const sql = `
        SELECT restaurant_id AS id, name, description, address, image, price_range, 'restaurant' AS type,
                COALESCE(city_id, 0) as city_id
        FROM restaurants
        WHERE name LIKE ? OR address LIKE ?
        ORDER BY restaurant_id DESC LIMIT 500
    `;
    
    db.query(sql, [keyword, keyword], (err, results) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        res.json(results);
    });
});

// ============================================================
// 🔑 API XÁC THỰC (AUTH)
// ============================================================

app.post('/api/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, 'customer')";
        
        db.query(sql, [fullName, email, hashedPassword, phone], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: "Email này đã được sử dụng!" });
                }
                return res.status(500).json({ message: "Lỗi Server khi đăng ký." });
            }
            res.status(201).json({ message: "Đăng ký thành công!" });
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server." });
    }
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
    }
    
    const sql = "SELECT user_id, full_name, email, password, phone, role FROM users WHERE email = ?";
    
    db.query(sql, [email], (err, users) => {
        if (err) return res.status(500).json({ message: "Lỗi server" });
        if (users.length === 0) return res.status(404).json({ message: "Email không tồn tại." });
        
        const user = users[0];
        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        
        if (!isPasswordCorrect) return res.status(401).json({ message: "Mật khẩu không đúng." });
        
        const { password: _, ...userInfo } = user;
        res.status(200).json({ message: "Đăng nhập thành công", user: userInfo });
    });
});


// ============================================================
// 2. API Lấy 4 khách sạn ngẫu nhiên (CHỈ LẤY CÁI NÀO CÓ PHÒNG & GIÁ)
// ============================================================
app.get('/api/home/random-hotels', (req, res) => {
    // Sử dụng INNER JOIN để chỉ lấy những khách sạn có liên kết với bảng rooms
    const sql = `
        SELECT 
            h.hotel_id, 
            h.name, 
            h.image_url, 
            h.star_rating,
            MIN(r.price_per_night) as min_price
        FROM hotels h
        INNER JOIN rooms r ON h.hotel_id = r.hotel_id
        WHERE h.image_url IS NOT NULL
        GROUP BY h.hotel_id, h.name, h.image_url, h.star_rating
        ORDER BY RAND() 
        LIMIT 4
    `;
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Lỗi lấy random hotels:", err);
            return res.status(500).json(err);
        }
        res.json(result);
    });
});
// ============================================================
// 🏡 API PUBLIC (Cho trang chủ)
// ============================================================

app.get("/api/hotels", (_req, res) => {
    const sql = `
        SELECT 
            h.hotel_id, h.name, h.description, h.address, h.image_url, h.star_rating, 
            c.name AS city_name,
            (SELECT MIN(price_per_night) FROM rooms WHERE hotel_id = h.hotel_id) AS min_price
        FROM hotels h 
        JOIN cities c ON h.city_id = c.city_id
        ORDER BY h.hotel_id DESC LIMIT 10`; 
        
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        return res.json(data); 
    });
});
app.get("/api/cities", (_req, res) => {
    const sql = `SELECT city_id, name FROM cities ORDER BY city_id ASC`; 
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        return res.json(data); 
    });
});

app.get("/api/destinations", (_req, res) => {
    const sql = `SELECT dest_id, name, description, image, city_id FROM destinations ORDER BY dest_id DESC LIMIT 10`; 
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        return res.json(data); 
    });
});
// ==========================================
// API LẤY COUPONS (SỬA LỖI: BỔ SUNG LỊCH SỬ DÙNG CÁ NHÂN)
// ==========================================
app.get('/api/coupons', async (req, res) => {
    // 1. Lấy user_id từ query param (Front-end gửi lên)
    const userId = req.query.user_id; 

    // Truy vấn 1: Lấy danh sách coupons hợp lệ (dùng chung cho mọi người)
    const sqlGetCoupons = `
        SELECT 
            c.*, 
            (IFNULL(c.usage_limit, 0) - IFNULL(c.used_count, 0)) AS remaining_count
        FROM 
            coupons c
        WHERE 
            (IFNULL(c.start_date, CURRENT_DATE()) <= CURRENT_DATE())
            AND c.expiry_date >= CURRENT_DATE()
            AND (IFNULL(c.usage_limit, 0) = 0 OR IFNULL(c.used_count, 0) < c.usage_limit)
        ORDER BY 
            c.expiry_date ASC; 
    `;

    try {
        const coupons = await queryAsync(sqlGetCoupons);

        if (userId && coupons.length > 0) {
            // 2. Truy vấn 2: Lấy số lần sử dụng cá nhân cho user này
            const couponCodes = coupons.map(c => c.code);

            const sqlUserUsage = `
                SELECT coupon_code, COUNT(*) AS user_used_count
                FROM user_coupons
                WHERE user_id = ? AND coupon_code IN (?)
                GROUP BY coupon_code
            `;
            const userUsage = await queryAsync(sqlUserUsage, [userId, couponCodes]);
            
            // Chuyển kết quả về dạng Map để dễ dàng ghép vào từng coupon
            const usageMap = new Map(userUsage.map(item => [item.coupon_code, item.user_used_count]));
            
            // 3. Ghép dữ liệu và trả về
            const finalCoupons = coupons.map(c => ({
                ...c,
                // Thêm trường quan trọng này: số lần người dùng hiện tại đã dùng
                user_used_count: usageMap.get(c.code) || 0 
            }));

            return res.json(finalCoupons);
        }

        // Nếu không có user_id hoặc không có coupon nào, trả về dữ liệu gốc
        return res.json(coupons.map(c => ({...c, user_used_count: 0})));

    } catch (err) {
        console.error("❌ Lỗi SQL khi lấy coupons:", err);
        return res.status(500).json({ error: "Lỗi Server hoặc Database." });
    }
});
app.get('/api/users', (req, res) => {
    const sql = "SELECT user_id, full_name, email, phone, role, profile_img, created_at FROM users ORDER BY created_at DESC"; 
    db.query(sql, (err, data) => {
        if (err) return res.json({ Error: "Lỗi server khi lấy danh sách user" });
        return res.json(data);
    });
});

app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    db.query("DELETE FROM users WHERE user_id = ?", [userId], (err, result) => {
        if (err) return res.json({ Error: "Lỗi xóa người dùng" });
        return res.json({ Status: "Success", Message: "Đã xóa người dùng" });
    });
});

// API cập nhật
// GET /api/users/:id/restaurant-bookings
app.get('/api/users/:id/restaurant-bookings', (req, res) => {
  const userId = req.params.id;
  const customerEmail = req.query.email || null;

  // 1) Lấy thông tin email/phone từ bảng users (nếu tồn tại)
  const sqlGetUser = `SELECT email, phone FROM users WHERE user_id = ? LIMIT 1`;
  db.query(sqlGetUser, [userId], (err, userRows) => {
    if (err) {
      console.error('Lỗi lấy user:', err);
      return res.status(500).json({ message: 'Lỗi server (get user)' });
    }

    const user = userRows[0] || {};
    const emailToCheck = customerEmail || user.email || null;
    const phoneToCheck = user.phone || null;

    // 2) Kiểm tra xem bảng restaurant_bookings có cột user_id hay không
    const checkColumnSql = `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'restaurant_bookings'
        AND COLUMN_NAME = 'user_id'
      LIMIT 1
    `;
    db.query(checkColumnSql, (errCol, colRows) => {
      if (errCol) {
        console.error('Lỗi kiểm tra column:', errCol);
        // fallback sang truy vấn theo email/phone nếu có, hoặc trả mảng rỗng
        return fetchByEmailPhone();
      }

      const hasUserId = Array.isArray(colRows) && colRows.length > 0;

      if (hasUserId) {
        // nếu có user_id: lấy theo user_id (an toàn)
        const sqlByUserId = `
          SELECT
            rb.id AS booking_id,
            'restaurant' AS booking_type,
            rb.customer_name,
            rb.booking_time,
            rb.guest_count,
            rb.status,
            rb.created_at,
            rb.note
          FROM restaurant_bookings rb
          WHERE rb.user_id = ?
          ORDER BY rb.booking_time DESC
        `;
        db.query(sqlByUserId, [userId], (err2, rowsByUser) => {
          if (err2) {
            console.warn('Lỗi truy vấn theo user_id, fallback email/phone:', err2);
            return fetchByEmailPhone();
          }
          // Nếu tìm thấy theo user_id thì trả luôn; nếu không có hàng, fallback tiếp
          if (rowsByUser && rowsByUser.length > 0) return res.json(rowsByUser);
          return fetchByEmailPhone();
        });
      } else {
        // nếu không có cột user_id -> tìm theo email/phone
        return fetchByEmailPhone();
      }

      // helper: truy vấn theo email/phone (nếu có)
      function fetchByEmailPhone() {
        const conditions = [];
        const params = [];

        if (emailToCheck) {
          conditions.push('rb.email = ?');
          params.push(emailToCheck);
        }
        if (phoneToCheck) {
          conditions.push('rb.phone = ?');
          params.push(phoneToCheck);
        }

        if (conditions.length === 0) {
          // Không có cách xác định user -> trả empty (an toàn)
          return res.json([]);
        }

        const sqlByContact = `
          SELECT
            rb.id AS booking_id,
            'restaurant' AS booking_type,
            rb.customer_name,
            rb.booking_time,
            rb.guest_count,
            rb.status,
            rb.created_at,
            rb.note
          FROM restaurant_bookings rb
          WHERE (${conditions.join(' OR ')})
          ORDER BY rb.booking_time DESC
        `;
        db.query(sqlByContact, params, (err3, rows) => {
          if (err3) {
            console.error('Lỗi truy vấn theo email/phone:', err3);
            return res.status(500).json({ message: 'Lỗi server (query bookings)' });
          }
          return res.json(rows || []);
        });
      }

    }); // end checkColumnSql
  }); // end sqlGetUser
});

// 🔍 API TÌM KIẾM KHÁCH SẠN CHO SO SÁNH (ĐÃ SỬA LỖI SQL)
app.get('/api/compare/search', (req, res) => {
    const keyword = req.query.q;
    if (!keyword || keyword.trim() === "") return res.json([]);

    const sql = `
        SELECT 
            hotel_id, name, address, star_rating, image_url,
            (SELECT MIN(price_per_night) FROM rooms WHERE hotel_id = hotels.hotel_id) AS price,
            (SELECT AVG(rating) FROM reviews WHERE item_id = hotels.hotel_id AND review_type='hotel') as avg_rating,
            (SELECT COUNT(*) FROM reviews WHERE item_id = hotels.hotel_id AND review_type='hotel') as total_reviews,
            amenities -- Lấy cột JSON trực tiếp
        FROM hotels
        WHERE name LIKE ? 
        ORDER BY name ASC
        LIMIT 20
    `;

    db.query(sql, [`%${keyword}%`], (err, results) => {
        if (err) return res.status(500).json({ error: "Lỗi server" });
        
        // Parse JSON string thành mảng object để frontend dùng
        const finalResults = results.map(hotel => ({
            ...hotel,
            amenities: hotel.amenities ? JSON.parse(hotel.amenities) : []
        }));

        res.json(finalResults);
    });
});

// ============================================================
// 🔄 API GỢI Ý & TÌM KIẾM SO SÁNH (ĐÃ SỬA: Lấy Amenities từ JSON)
// ============================================================
app.get('/api/hotels/:id/similar', (req, res) => {
    const hotelId = req.params.id;
    const { q } = req.query; 

    // SỬA: Lấy trực tiếp cột h.amenities thay vì JOIN bảng cũ
    let sql = `
        SELECT h.hotel_id, h.name, h.image_url, h.star_rating, h.address, h.city_id, h.amenities,
               (SELECT MIN(price_per_night) FROM rooms WHERE hotel_id = h.hotel_id) AS price,
               (SELECT AVG(rating) FROM reviews WHERE item_id = h.hotel_id AND review_type='hotel') as avg_rating,
               (SELECT COUNT(*) FROM reviews WHERE item_id = h.hotel_id AND review_type='hotel') as total_reviews
        FROM hotels h
        WHERE h.hotel_id != ? 
    `;

    const params = [hotelId];

    if (q) {
        sql += ` AND LOWER(h.name) LIKE LOWER(?) `;
        params.push(`%${q}%`);
        sql += ` LIMIT 20`; 
    } else {
        // Gợi ý theo cùng thành phố
        sql += ` AND h.city_id = (SELECT city_id FROM hotels WHERE hotel_id = ?) ORDER BY RAND() LIMIT 10`;
        params.push(hotelId);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("❌ Lỗi SQL Similar:", err);
            return res.status(500).json({ error: "Lỗi server" });
        }

        // Xử lý JSON amenities trước khi trả về
        const finalResults = results.map(hotel => {
            let amenitiesList = [];
            try {
                amenitiesList = hotel.amenities ? JSON.parse(hotel.amenities) : [];
            } catch (e) { amenitiesList = []; }

            return {
                ...hotel,
                // Trả về mảng amenities (Frontend tự loop hiển thị)
                amenities: amenitiesList, 
                // Hoặc nếu frontend cần chuỗi string như cũ:
                amenities_string: amenitiesList.join(', ') 
            };
        });

        res.json(finalResults);
    });
});

/// ============================================================
// 🏨 API CHI TIẾT KHÁCH SẠN (ĐÃ FIX: TÍNH TOÁN PHÒNG TRỐNG CHÍNH XÁC)
// ============================================================
app.get('/api/hotels/:id', (req, res) => {
    const hotelId = req.params.id;
    
    // --- 1. LOGIC KIỂM TRA NGÀY ---
    const hasDates = req.query.checkIn && req.query.checkOut;
    const checkIn = hasDates ? req.query.checkIn : new Date().toISOString().split('T')[0];
    const checkOut = hasDates ? req.query.checkOut : new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // --- 2. SQL Info Khách sạn ---
    const sqlHotel = `
        SELECT 
            h.*, 
            c.name AS city_name,
            o.owner_name, o.owner_email, o.owner_phone, o.avatar_url AS owner_avatar, o.created_at AS owner_join_date
        FROM hotels h 
        JOIN cities c ON h.city_id = c.city_id 
        LEFT JOIN hotel_owners o ON h.owner_id = o.owner_id 
        WHERE h.hotel_id = ?`;

    // --- 3. SQL Rooms (LOGIC: Đếm số phòng đã có người đặt trong khoảng check-in/out) ---
    // Công thức trùng lịch: (Booked_CheckIn < Request_CheckOut) AND (Booked_CheckOut > Request_CheckIn)
    // Status ID: 1 (Hold), 2 (Confirmed), 3 (Paid). Bỏ qua 5 (Cancelled).
    const sqlRooms = `
        SELECT r.*,
        (
            SELECT COUNT(*) 
            FROM hotel_booking_details hbd
            JOIN bookings b ON hbd.booking_id = b.booking_id
            WHERE hbd.room_id = r.room_id 
            AND b.status_id IN (1, 2, 3) 
            AND (hbd.check_in_date < ? AND hbd.check_out_date > ?)
        ) as is_booked,
        COALESCE(r.total_inventory, 5) as total_inventory 
        FROM rooms r 
        WHERE r.hotel_id = ?
    `;
    
    // Params: [Ngày khách Ra, Ngày khách Vào, HotelID]
    const roomParams = [checkOut, checkIn, hotelId];

    // --- 4. Các SQL phụ giữ nguyên ---
    const sqlReviews = `SELECT r.*, u.full_name, u.profile_img AS avatar FROM reviews r LEFT JOIN users u ON r.user_id = u.user_id WHERE r.item_id = ? AND r.review_type = 'hotel' ORDER BY r.created_at DESC`;
    const sqlNearbyDestinations = `SELECT dest_id AS id, name, image, description, 'activity' AS type, ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance FROM destinations HAVING distance < 50 ORDER BY distance ASC LIMIT 6`;
    const sqlNearbyRestaurants = `SELECT restaurant_id AS id, name, image, price_range, 'restaurant' AS type, description, ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance FROM restaurants HAVING distance < 50 ORDER BY distance ASC LIMIT 6`;
    const sqlSidebarLandmarks = `SELECT dest_id, name, ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance FROM destinations HAVING distance < 50 ORDER BY distance ASC LIMIT 4`;

    // --- THỰC THI QUERY ---
    db.query(sqlHotel, [hotelId], (err, hotelResults) => {
        if (err) return res.status(500).json({ error: "Lỗi Server khi lấy Hotel" });
        if (hotelResults.length === 0) return res.status(404).json({ message: "Not Found" });

        const hotelInfo = hotelResults[0];
        const lat = hotelInfo.latitude || 10.0341851; 
        const lng = hotelInfo.longitude || 105.782964;

        let amenitiesList = [];
        try { amenitiesList = hotelInfo.amenities ? JSON.parse(hotelInfo.amenities) : []; } catch (e) { amenitiesList = []; }

        const transportDistances = [
            { name: FIXED_LOCATIONS.AIRPORT.name, distance: getDistanceFromLatLonInKm(lat, lng, FIXED_LOCATIONS.AIRPORT.lat, FIXED_LOCATIONS.AIRPORT.lng), type: 'airport' },
            { name: FIXED_LOCATIONS.BUS_STATION.name, distance: getDistanceFromLatLonInKm(lat, lng, FIXED_LOCATIONS.BUS_STATION.lat, FIXED_LOCATIONS.BUS_STATION.lng), type: 'bus' }
        ];

        // Lấy danh sách phòng với số lượng booked đã tính toán
        db.query(sqlRooms, roomParams, (err, rooms) => {
            if (err) { console.error(err); return res.status(500).json({ error: "Lỗi lấy danh sách phòng" }); }

            db.query(sqlReviews, [hotelId], (err, reviews) => {
                db.query(sqlNearbyDestinations, [lat, lng, lat], (err, destinations) => {
                    db.query(sqlNearbyRestaurants, [lat, lng, lat], (err, restaurants) => {
                        db.query(sqlSidebarLandmarks, [lat, lng, lat], (err, landmarks) => {
                            
                            res.json({ 
                                ...hotelInfo, 
                                amenities: amenitiesList, 
                                date_selected: true, // Luôn trả về true để frontend hiển thị logic còn/hết phòng
                                check_in: checkIn,
                                check_out: checkOut,
                                rooms: rooms || [], 
                                reviews: reviews || [],
                                nearby_transport: transportDistances,
                                nearby_landmarks: landmarks || [],
                                nearby_activities: destinations || [], 
                                nearby_restaurants: restaurants || []
                            });

                        });
                    });
                });
            });
        });
    });
});
// ============================================================
// 🏕️ API CHI TIẾT TOUR
// ============================================================
app.get('/api/tours/:id', (req, res) => {
    const tourId = req.params.id;

    // 1. Lấy thông tin Tour
    const sqlTour = `
        SELECT t.*, 
               COALESCE(c.name, 'Chưa phân loại') as category_name, 
               COALESCE(d.name, 'Đang cập nhật') as dest_name 
        FROM tours t
        LEFT JOIN tour_categories c ON t.category_id = c.category_id
        LEFT JOIN destinations d ON t.dest_id = d.dest_id
        WHERE t.tour_id = ?
    `;

    // 2. Lấy Reviews (SỬA LẠI ĐOẠN NÀY ĐỂ LẤY REPLY)
    const sqlReviews = `
        SELECT 
            r.review_id, r.rating, r.comment, r.created_at, 
            r.admin_reply, r.admin_reply_at, -- <--- THÊM DÒNG NÀY
            u.full_name, u.profile_img AS avatar 
        FROM reviews r 
        LEFT JOIN users u ON r.user_id = u.user_id 
        WHERE r.item_id = ? AND r.review_type = 'tour' 
        ORDER BY r.created_at DESC
    `;

    db.query(sqlTour, [tourId], (err, tourResults) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        
        if (tourResults.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy Tour này" });
        }

        const tour = tourResults[0];

        try {
            tour.itinerary = tour.itinerary ? JSON.parse(tour.itinerary) : [];
            tour.highlights = tour.highlights ? JSON.parse(tour.highlights) : [];
            tour.includes = tour.includes ? JSON.parse(tour.includes) : [];
            tour.excludes = tour.excludes ? JSON.parse(tour.excludes) : [];
            tour.gallery = tour.gallery ? JSON.parse(tour.gallery) : [];
        } catch (e) {
            tour.itinerary = []; tour.highlights = [];
        }

        const formattedAmenities = tour.highlights.length > 0 
            ? tour.highlights.map(h => ({ 
                name: typeof h === 'string' ? h : h.content,
                icon: 'bi-check-circle-fill' 
              }))
            : [{ name: 'Xe đưa đón', icon: 'bi-bus-front' }, { name: 'Vé tham quan', icon: 'bi-ticket-perforated' }];

        // 3. Thực hiện truy vấn Reviews
        db.query(sqlReviews, [tourId], (err, reviews) => {
            if (err) console.error("Lỗi lấy review tour:", err);

            res.json({
                ...tour,
                amenities: formattedAmenities, 
                reviews: reviews || []
            });
        });
    });
});
// ============================================================
// 🔄 API LẤY TOUR KHÁC CÙNG ĐỊA ĐIỂM (ĐÃ SỬA: DÙNG BẢNG REVIEWS CHUNG)
// ============================================================
app.get('/api/tours/:id/similar', (req, res) => {
    const tourId = req.params.id;

    const sql = `
        SELECT t.tour_id, t.name, t.image, t.price, 
               'Hàng ngày' as duration, 
               COALESCE(avg_r.rating, 5) as avg_rating,
               COALESCE(count_r.total, 0) as total_reviews
        FROM tours t
        JOIN tours current_t ON current_t.tour_id = ? 
        -- Sửa: Lấy từ bảng reviews chung với điều kiện review_type = 'tour'
        LEFT JOIN (
            SELECT item_id, AVG(rating) as rating 
            FROM reviews 
            WHERE review_type = 'tour' 
            GROUP BY item_id
        ) avg_r ON t.tour_id = avg_r.item_id
        LEFT JOIN (
            SELECT item_id, COUNT(*) as total 
            FROM reviews 
            WHERE review_type = 'tour' 
            GROUP BY item_id
        ) count_r ON t.tour_id = count_r.item_id
        
        WHERE t.dest_id = current_t.dest_id 
          AND t.tour_id != ?
        ORDER BY RAND() 
        LIMIT 4
    `;

    db.query(sql, [tourId, tourId], (err, results) => {
        if (err) {
            console.error("Lỗi lấy similar tours:", err);
            return res.json([]); 
        }
        res.json(results);
    });
});

/// =======================================================
// API: CHI TIẾT NHÀ HÀNG (ĐÃ SỬA: DATA JSON + UNIFIED REVIEWS)
// =======================================================
app.get('/api/restaurants/:id', (req, res) => {
    const resId = req.params.id;

    // 1. Lấy thông tin nhà hàng (Bao gồm các cột JSON: menu, features, gallery...)
    const sqlRestaurant = `SELECT * FROM restaurants WHERE restaurant_id = ?`;

    // 2. Lấy đánh giá từ bảng reviews chung
    const sqlReviews = `
        SELECT r.review_id, r.rating, r.comment, r.created_at, u.full_name, u.profile_img AS avatar 
        FROM reviews r 
        LEFT JOIN users u ON r.user_id = u.user_id 
        WHERE r.item_id = ? AND r.review_type = 'restaurant' 
        ORDER BY r.created_at DESC
    `;

    db.query(sqlRestaurant, [resId], (err, results) => {
        if (err) {
            console.error("Lỗi lấy chi tiết nhà hàng:", err);
            return res.status(500).json({ error: "Lỗi Server" });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy nhà hàng" });
        }

        const restaurant = results[0];

        // --- BƯỚC QUAN TRỌNG: PARSE JSON TỪ DATABASE ---
        try {
            // Chuyển chuỗi JSON trong DB thành mảng/object Javascript
            restaurant.features = restaurant.features ? JSON.parse(restaurant.features) : [];
            restaurant.menu = restaurant.menu ? JSON.parse(restaurant.menu) : [];
            restaurant.gallery = restaurant.gallery ? JSON.parse(restaurant.gallery) : [];
            restaurant.opening_hours = restaurant.opening_hours ? JSON.parse(restaurant.opening_hours) : [];
        } catch (e) {
            console.error("⚠️ Lỗi parse JSON Restaurant:", e.message);
            // Gán giá trị mặc định nếu lỗi
            restaurant.features = [];
            restaurant.menu = [];
            restaurant.gallery = [];
            restaurant.opening_hours = [];
        }

        // --- XỬ LÝ HIỂN THỊ GIỜ MỞ CỬA ---
        let openTimeStr = "09:00 - 22:00"; // Mặc định
        if (Array.isArray(restaurant.opening_hours) && restaurant.opening_hours.length > 0) {
            // Lấy khung giờ đầu tiên để hiển thị tóm tắt
            const h = restaurant.opening_hours[0]; 
            // Kiểm tra xem dữ liệu có đúng định dạng không
            if (h.open_time && h.close_time) {
                const open = h.open_time.toString().slice(0, 5); 
                const close = h.close_time.toString().slice(0, 5);
                openTimeStr = `${open} - ${close}`;
            }
        }

        // 3. Lấy đánh giá và trả về kết quả
        db.query(sqlReviews, [resId], (err, reviews) => {
            if (err) console.error("Lỗi lấy review nhà hàng:", err);

            res.json({
                ...restaurant,
                city_name: "Cần Thơ", // Hoặc có thể JOIN bảng cities nếu muốn chính xác
                opening_hours_display: openTimeStr, // Trả về chuỗi giờ hiển thị
                reviews: reviews || []
            });
        });
    });
});
// ==========================================
// [ĐÃ SỬA] API UPDATE BOOKING (CÓ KIỂM TRA TỒN KHO)
// ==========================================
app.put('/api/bookings/update/:id', async (req, res) => {
    const bookingId = req.params.id;
    const checkIn = req.body.checkIn || req.body.check_in;
    const checkOut = req.body.checkOut || req.body.check_out;
    const newQuantity = parseInt(req.body.new_quantity); 

    console.log(`🔄 [UPDATE] Booking #${bookingId} -> Qty: ${newQuantity}, In: ${checkIn}, Out: ${checkOut}`);

    if (!checkIn || !checkOut) {
        return res.status(400).json({ message: "Thiếu ngày nhận/trả phòng" });
    }

    try {
        // 1. Lấy thông tin đơn hàng hiện tại
        const bookings = await queryAsync(`
            SELECT b.*, hbd.room_id, r.total_inventory, r.price_per_night
            FROM bookings b
            JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
            JOIN rooms r ON hbd.room_id = r.room_id
            WHERE b.booking_id = ?
            LIMIT 1
        `, [bookingId]);
        
        if (bookings.length === 0) return res.status(404).json({ message: "Booking not found" });
        
        const currentBooking = bookings[0];
        const quantityToUpdate = newQuantity || currentBooking.total_rooms_booked;
        const roomId = currentBooking.room_id;

        // --- 2. [QUAN TRỌNG] KIỂM TRA LẠI TỒN KHO ---
        // Đếm số phòng đã bị NGƯỜI KHÁC đặt trong khoảng thời gian này (trừ đơn hiện tại ra)
        const sqlCheckInventory = `
            SELECT 
                r.total_inventory,
                (
                    SELECT COUNT(*) 
                    FROM hotel_booking_details hbd
                    JOIN bookings b ON hbd.booking_id = b.booking_id
                    WHERE hbd.room_id = r.room_id
                    AND b.status_id IN (1, 2, 3)    -- Tính các đơn Hold, Confirmed, Paid
                    AND b.booking_id != ?           -- [QUAN TRỌNG] Không tính đơn hiện tại
                    AND (hbd.check_in_date < ? AND hbd.check_out_date > ?) -- Logic trùng ngày
                ) as other_people_booked
            FROM rooms r
            WHERE r.room_id = ?
        `;

        const inventoryRes = await queryAsync(sqlCheckInventory, [bookingId, checkOut, checkIn, roomId]);
        const roomData = inventoryRes[0];
        const availableForMe = roomData.total_inventory - roomData.other_people_booked;

        // Nếu số lượng muốn đặt > số lượng còn lại cho mình
        if (quantityToUpdate > availableForMe) {
            return res.status(400).json({ 
                success: false, 
                message: `Không đủ phòng! Chỉ còn có thể đặt tối đa ${availableForMe} phòng.` 
            });
        }
        // ---------------------------------------------

        // 3. Tính lại tổng tiền
        const d1 = new Date(checkIn);
        const d2 = new Date(checkOut);
        const nights = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
        const newTotalPrice = quantityToUpdate * nights * currentBooking.price_per_night;

        // 4. Update bảng BOOKINGS
        await queryAsync(
            `UPDATE bookings 
             SET start_date = ?, end_date = ?, total_price = ?, total_rooms_booked = ?, updated_at = NOW() 
             WHERE booking_id = ?`,
            [checkIn, checkOut, newTotalPrice, quantityToUpdate, bookingId]
        );

        // 5. Update bảng CHI TIẾT (Xóa cũ insert mới để đồng bộ số dòng)
        const checkInTime = `${checkIn} 14:00:00`;
        const checkOutTime = `${checkOut} 12:00:00`;

        await queryAsync("DELETE FROM hotel_booking_details WHERE booking_id = ?", [bookingId]);
        
        let detailsValues = [];
        for(let i=0; i < quantityToUpdate; i++) {
            detailsValues.push([
                bookingId, roomId, checkIn, checkOut, checkInTime, checkOutTime, 
                currentBooking.guests_count, currentBooking.price_per_night
            ]);
        }
        
        const sqlInsertDetails = `
            INSERT INTO hotel_booking_details 
            (booking_id, room_id, check_in_date, check_out_date, check_in_datetime, check_out_datetime, guests_count, price_per_night) 
            VALUES ?
        `;
        if (detailsValues.length > 0) {
            await queryAsync(sqlInsertDetails, [detailsValues]);
        }

        console.log(`✅ [UPDATE SUCCESS] Booking #${bookingId} updated to ${quantityToUpdate} rooms.`);
        res.json({ success: true, message: "Cập nhật thành công" });

    } catch (e) {
        console.error("❌ [UPDATE ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});
// ==========================================
// [ĐÃ SỬA] API: ĐẶT PHÒNG KHÁCH SẠN (UPDATE NẾU CÓ ID, INSERT NẾU MỚI)
// ==========================================
app.post('/api/bookings/hotel', async (req, res) => {
  const { 
    user_id, customer_name, customer_email, customer_phone, 
    arrival_time, support_tier, total_price, note, hotel_id, details,
    coupon_code,
    payment_method, 
    booking_id // <--- QUAN TRỌNG: Nhận booking_id từ Frontend gửi lên
  } = req.body;

  console.log(`🟡 [BOOKING HOTEL] Request received. ID: ${booking_id || 'NEW'} | Customer: ${customer_name}`);

  if (!customer_name || !customer_email || !hotel_id || !details || !details.check_in_date || !details.check_out_date) {
    return res.status(400).json({ message: "Thiếu thông tin (Tên, Email, ID khách sạn, hoặc ngày vào/ra)" });
  }

  // Định dạng giờ mặc định
  const CHECKIN_TIME = '14:00:00';
  const CHECKOUT_TIME = '12:00:00';

  // Ghép ngày + giờ để lưu vào DB
  const check_in_datetime  = `${details.check_in_date} ${CHECKIN_TIME}`;    
  const check_out_datetime = `${details.check_out_date} ${CHECKOUT_TIME}`;  

  const basePrice = Number(total_price || 0);
  let finalPrice = basePrice;
  let discount_amount = 0;
  let couponData = null;

  db.beginTransaction(async (txErr) => {
    if (txErr) {
      console.error("❌ beginTransaction error:", txErr);
      return res.status(500).json({ error: "Lỗi bắt đầu transaction", details: txErr });
    }

    try {
      // === 1) Xử lý Voucher (Giữ nguyên logic cũ) ===
      if (coupon_code) {
        const checkCouponSql = `
          SELECT * FROM coupons 
          WHERE code = ? 
            AND service_type IN ('HOTEL','ALL')
            AND (expiry_date IS NULL OR expiry_date >= CURDATE())
        `;
        const rows = await queryAsync(checkCouponSql, [coupon_code]);
        couponData = rows && rows[0];

        if (!couponData) {
             return db.rollback(() => res.status(400).json({ message: "Mã giảm giá không hợp lệ hoặc đã hết hạn" }));
        }

        if (basePrice < (couponData.min_order_value || 0)) {
          return db.rollback(() => res.status(400).json({ message: `Mã giảm giá áp dụng cho đơn >= ${couponData.min_order_value}` }));
        }

        if (couponData.usage_limit > 0 && couponData.used_count >= couponData.usage_limit) {
           return db.rollback(() => res.status(400).json({ message: "Mã giảm giá đã hết lượt sử dụng" }));
        }

        let discountValue = 0;
        if ((couponData.discount_percent || 0) > 0) {
          discountValue = basePrice * (couponData.discount_percent / 100);
          if (couponData.max_discount && couponData.max_discount > 0) {
            discountValue = Math.min(discountValue, couponData.max_discount);
          }
        } else if ((couponData.discount_amount || 0) > 0) {
          discountValue = couponData.discount_amount;
        }
        finalPrice = Math.max(0, basePrice - discountValue);
        discount_amount = discountValue;
      } 

      // === 2) Xác định trạng thái ===
      // Pay Later/Tại khách sạn -> 2 (Confirmed)
      // Pay Online (VNPAY) -> 1 (Holding/Pending) -> Sẽ thành 3 khi thanh toán xong
      let initialStatus = (payment_method === 'pay_later' || payment_method === 'pay_at_hotel') ? 2 : 1;

      let finalBookingId = booking_id;

      // === 3) LOGIC CHÍNH: UPDATE HAY INSERT? ===
      
      if (booking_id) {
          // --- TRƯỜNG HỢP A: ĐÃ CÓ ID (CẬP NHẬT ĐƠN CŨ #256) ---
          console.log(`🔄 Updating existing booking #${booking_id}`);
          
          // Cập nhật bảng bookings
          const sqlUpdate = `
            UPDATE bookings 
            SET status_id = ?, customer_name = ?, customer_email = ?, customer_phone = ?, 
                total_price = ?, guests_count = ?, note = ?, arrival_time = ?, 
                support_tier = ?, coupon_code = ?, updated_at = NOW() 
            WHERE booking_id = ?
          `;
          
          await queryAsync(sqlUpdate, [
            initialStatus, customer_name, customer_email, customer_phone,
            finalPrice, details.guests_count || 1, note || '', arrival_time || CHECKIN_TIME,
            support_tier || 'standard', coupon_code || null, 
            booking_id
          ]);

          // Cập nhật bảng hotel_booking_details
          const sqlUpdateDetails = `
            UPDATE hotel_booking_details 
            SET room_id = ?, check_in_date = ?, check_out_date = ?, 
                check_in_datetime = ?, check_out_datetime = ?, guests_count = ?, price_per_night = ?
            WHERE booking_id = ?
          `;
          await queryAsync(sqlUpdateDetails, [
            details.room_id || null, details.check_in_date, details.check_out_date,
            check_in_datetime, check_out_datetime, details.guests_count || 1, details.price_per_night || 0.0,
            booking_id
          ]);

      } else {
          // --- TRƯỜNG HỢP B: CHƯA CÓ ID (TẠO ĐƠN MỚI) ---
          console.log(`✨ Creating NEW booking (No ID provided)`);
          
          const sqlBooking = `
            INSERT INTO bookings 
            (user_id, status_id, booking_type, customer_name, customer_email, customer_phone, item_id, total_price, start_date, end_date, guests_count, note, arrival_time, support_tier, created_at, coupon_code)
            VALUES (?, ?, 'hotel', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
          `;
          const bookingValues = [
            user_id || null,
            initialStatus, 
            customer_name, customer_email, customer_phone,
            hotel_id, finalPrice, details.check_in_date, details.check_out_date,
            details.guests_count || 1, note || '',
            arrival_time || CHECKIN_TIME, support_tier || 'standard',
            coupon_code || null
          ];

          const bookingResult = await queryAsync(sqlBooking, bookingValues);
          finalBookingId = bookingResult.insertId;
          console.log("✅ [DB] Created new booking:", finalBookingId);

          // Tạo chi tiết phòng
          const sqlDetails = `
            INSERT INTO hotel_booking_details 
            (booking_id, room_id, check_in_date, check_out_date, check_in_datetime, check_out_datetime, guests_count, price_per_night)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const detailValues = [
            finalBookingId,
            details.room_id || null,
            details.check_in_date,
            details.check_out_date,
            check_in_datetime,
            check_out_datetime,
            details.guests_count || 1,
            details.price_per_night || 0.0
          ];
          await queryAsync(sqlDetails, detailValues);
      }

      // === 4) Cập nhật Coupon Usage (Nếu có) ===
      if (coupon_code && couponData) {
        const updateCouponSql = `UPDATE coupons SET used_count = used_count + 1 WHERE code = ?`;
        await queryAsync(updateCouponSql, [coupon_code]);

        if (user_id) {
          const insertUsageSql = `INSERT INTO user_coupons (user_id, coupon_code, used_at) VALUES (?, ?, NOW())`;
          await queryAsync(insertUsageSql, [user_id, coupon_code]);
        }
      }

      // === 5) Commit Transaction ===
      db.commit(async (commitErr) => {
        if (commitErr) {
          console.error("❌ Commit error:", commitErr);
          return db.rollback(() => res.status(500).json({ error: "Lỗi commit transaction", details: commitErr }));
        }

        // === Tạo Thông Báo ===
        if (user_id) {
            const hotels = await queryAsync("SELECT name FROM hotels WHERE hotel_id = ?", [hotel_id]);
            const hotelName = hotels.length ? hotels[0].name : 'Khách sạn';

            await createNotification(
                user_id, 
                'success', 
                'Đặt phòng thành công', 
                `Đơn phòng #${finalBookingId} tại ${hotelName} đã được xác nhận.`,
                finalBookingId, 
                'hotel'
            );
        }
        
        // Trả về response cho Frontend
        // Frontend sẽ dùng booking_id này để chuyển hướng hoặc hiển thị
        res.json({
          message: "Đặt phòng thành công",
          booking_id: finalBookingId, // Trả về đúng ID (256 nếu update, 257 nếu mới)
          status_id: initialStatus,
          final_price: finalPrice,
          discount_amount
        });

        // === GỬI MAIL (CHỈ KHI THANH TOÁN SAU) ===
        if (payment_method === 'pay_later' || payment_method === 'pay_at_hotel') {
            console.log(`📩 [MAIL START] Sending 'Pay Later' email for booking #${finalBookingId}`);

            (async () => {
              try {
                const getInfoSql = `
                  SELECT h.name as hotel_name, h.address as hotel_address, h.image_url, 
                          r.room_type_name 
                  FROM hotels h 
                  LEFT JOIN rooms r ON h.hotel_id = r.hotel_id 
                  WHERE h.hotel_id = ? AND r.room_id = ?
                `;
                const infoRows = await queryAsync(getInfoSql, [hotel_id, details.room_id]);
                if (!infoRows || infoRows.length === 0) return;
                
                const info = infoRows[0];
                let nights = 1;
                try {
                  const d1 = new Date(details.check_in_date);
                  const d2 = new Date(details.check_out_date);
                  nights = Math.max(1, Math.ceil(Math.abs(d2 - d1) / (24*60*60*1000)));
                } catch (e) {}

                let transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: process.env.MAIL_USER || 'canthotravel91@gmail.com',
                    pass: process.env.MAIL_PASS || 'rcpb plqa refa grod'
                  }
                });

                const mailOptions = {
                  from: '"CanTho Travel" <no-reply@canthotravel.com>',
                  to: customer_email,
                  subject: `[Xác nhận] Đặt phòng #${finalBookingId} - ${info.hotel_name}`,
                  html: `
                    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width:700px; margin:0 auto; color:#333;">
                      <div style="background:#003580; color:#fff; padding:22px 24px; border-top-left-radius:8px; border-top-right-radius:8px; text-align:center;">
                        <img src="${info.hotel_logo || 'https://via.placeholder.com/120x40?text=CanTho+Travel'}" alt="logo" style="height:40px; display:block; margin:0 auto 8px;">
                        <h1 style="font-size:20px; margin:0 0 4px; letter-spacing:0.5px;">XÁC NHẬN ĐẶT PHÒNG</h1>
                        <div style="font-size:14px; opacity:0.95;">Mã đơn: <strong>#${finalBookingId}</strong></div>
                      </div>

                      <div style="background:#fff; padding:20px 24px; border:1px solid #e6e6e6; border-bottom-left-radius:8px; border-bottom-right-radius:8px;">
                        <p style="margin:0 0 12px;">Xin chào <strong>${customer_name}</strong>,</p>
                        <p style="margin:0 0 16px;">Cảm ơn bạn đã đặt phòng tại <strong>${info.hotel_name}</strong>. Dưới đây là chi tiết đặt phòng (vui lòng in hoặc trình email này khi nhận phòng).</p>

                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:16px;">
                          <tr>
                            <td style="vertical-align:top; width:50%; padding-right:12px;">
                              <div style="font-size:13px; color:#666; margin-bottom:6px;">Thông tin khách hàng</div>
                              <div style="font-size:14px;">
                                <div><strong>${customer_name}</strong></div>
                                <div style="color:#555; font-size:13px; margin-top:6px;">Email: ${customer_email}</div>
                                ${details.customer_phone ? `<div style="color:#555; font-size:13px;">Điện thoại: ${details.customer_phone}</div>` : ''}
                              </div>
                            </td>
                            <td style="vertical-align:top; width:50%; padding-left:12px; border-left:1px solid #f0f0f0;">
                              <div style="font-size:13px; color:#666; margin-bottom:6px;">Thông tin đặt phòng</div>
                              <div style="font-size:14px;">
                                <div><strong>${info.room_type_name}</strong></div>
                                <div style="margin-top:6px; color:#555; font-size:13px;">
                                  <div>📍 ${info.hotel_address || 'Địa chỉ khách sạn'}</div>
                                  <div>📅 ${nights} đêm — ${new Date(details.check_in_date).toLocaleDateString('vi-VN')} → ${new Date(details.check_out_date).toLocaleDateString('vi-VN')}</div>
                                  ${details.arrival_time ? `<div>⏰ Giờ đến dự kiến: ${details.arrival_time}</div>` : ''}
                                </div>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <div style="background:#fafafa; border:1px solid #f0f0f0; padding:12px; border-radius:6px; margin-bottom:14px;">
                          <div style="font-weight:600; margin-bottom:10px;">HÓA ĐƠN TẠM TÍNH</div>
                          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse; font-size:14px;">
                            <thead>
                              <tr>
                                <th align="left" style="padding:6px 8px; color:#666; font-weight:600; font-size:13px;">Mục</th>
                                <th align="right" style="padding:6px 8px; color:#666; font-weight:600; font-size:13px;">Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td style="border-top:1px solid #eee; padding:8px;">${info.room_type_name} x ${nights} đêm</td>
                                <td align="right" style="border-top:1px solid #eee; padding:8px;">${parseInt(basePrice).toLocaleString()} VND</td>
                              </tr>
                              ${discount_amount > 0 ? `
                              <tr>
                                <td style="padding:8px; color:#4CAF50;">Giảm giá Voucher</td>
                                <td align="right" style="color:#4CAF50; padding:8px;">- ${parseInt(discount_amount).toLocaleString()} VND</td>
                              </tr>` : ''}
                              <tr>
                                <td style="padding:10px 8px; font-weight:700; border-top:2px solid #eee;">Tổng thanh toán</td>
                                <td align="right" style="padding:10px 8px; font-weight:700; color:#d32f2f; border-top:2px solid #eee;">${parseInt(finalPrice).toLocaleString()} VND</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div style="font-size:13px; color:#555; line-height:1.45; margin-bottom:12px;">
                          <p style="margin:0 0 8px;"><strong>Lưu ý:</strong> Vui lòng thanh toán tại khách sạn khi nhận phòng.</p>
                        </div>
                        
                        <div style="text-align:center; margin-top:16px; font-size:12px; color:#999;">
                          Đây là email tự động. Mã đơn #${finalBookingId}
                        </div>
                      </div>
                    </div>
                  `
                };

                await transporter.sendMail(mailOptions);
                console.log(`🚀 [MAIL SUCCESS] Email sent to: ${customer_email}`);
              } catch (mailError) {
                console.error("❌ [MAIL FAIL] Error sending email:", mailError);
              }
            })();
        
        } else {
            console.log("⏳ [MAIL SKIP] Paying Online. Email will be sent after payment completion.");
        }

      }); // end commit

    } catch (err) {
      console.error("❌ Transaction error:", err);
      return db.rollback(() => res.status(500).json({ error: "Lỗi xử lý đơn", details: err.message || err }));
    }
  }); // end beginTransaction
});
// ==========================================
// 💳 API THANH TOÁN V3.0 (GỬI MAIL CHUẨN AGODA)
// ==========================================
app.post('/api/payment/process', (req, res) => {
    const { booking_id, card_number, amount, email } = req.body; 

    // 1. Validate thẻ cơ bản
    if (!card_number || card_number.length < 9) {
        return res.status(400).json({ success: false, message: "Thẻ không hợp lệ!" });
    }

    const transactionId = "PAY" + Date.now(); 

    // 2. Cập nhật trạng thái đơn hàng (Status = 3: Paid Online)
    // Chỉ update nếu đơn hàng chưa hoàn thành (status != 4) và chưa hủy (status != 5)
    // Để tránh việc thanh toán lại đơn đã xong hoặc đã hủy
    const updateSql = `
        UPDATE bookings 
        SET status_id = 3, 
            note = CONCAT(IFNULL(note, ''), ' [Đã thanh toán Online: ', ?, ']'),
            updated_at = NOW()
        WHERE booking_id = ? AND status_id NOT IN (3, 4, 5)`;

    db.query(updateSql, [transactionId, booking_id], (err, result) => {
        if (err) {
            console.error("❌ Lỗi DB Update Payment:", err);
            return res.status(500).json({ success: false, message: "Lỗi Server" });
        }

        // Kiểm tra xem có dòng nào được update không
        // Nếu không có (affectedRows = 0), có thể đơn đã thanh toán rồi hoặc không tồn tại
        if (result.affectedRows === 0) {
             console.warn(`⚠️ Đơn #${booking_id} không được update (có thể đã thanh toán/hủy hoặc sai ID).`);
             // Vẫn trả về success để Frontend không bị kẹt, nhưng log warning
        }

        // 3. LẤY THÔNG TIN CHI TIẾT ĐỂ GỬI MAIL (JOIN NHIỀU BẢNG)
        const getInfoSql = `
            SELECT 
                b.booking_id, b.customer_name, b.customer_email, b.customer_phone, 
                b.start_date, b.end_date, b.guests_count, b.total_price, b.arrival_time, b.note,
                h.name as hotel_name, h.address as hotel_address, h.image_url as hotel_image, 
                h.check_in_time, h.check_out_time, h.hotel_policy,
                r.room_type_name
            FROM bookings b
            JOIN hotels h ON b.item_id = h.hotel_id
            JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
            JOIN rooms r ON hbd.room_id = r.room_id
            WHERE b.booking_id = ?
        `;

        db.query(getInfoSql, [booking_id], async (err, data) => {
            if (err || data.length === 0) {
                console.error("⚠️ Thanh toán thành công nhưng không lấy được info để gửi mail");
                // Vẫn trả về success vì tiền đã trừ (giả lập)
                return res.json({ success: true, message: "Thanh toán thành công!", transaction_id: transactionId });
            }

            const info = data[0];
            
            // Format ngày tháng
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const checkInDate = new Date(info.start_date).toLocaleDateString('vi-VN', options);
            const checkOutDate = new Date(info.end_date).toLocaleDateString('vi-VN', options);
            
            // Tính số đêm
            const nights = Math.max(1, Math.ceil((new Date(info.end_date) - new Date(info.start_date)) / (1000 * 60 * 60 * 24)));

            // 4. GỬI EMAIL (MẪU AGODA)
            try {
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'canthotravel91@gmail.com', 
                        pass: 'rcpb plqa refa grod'       
                    }
                });

                const mailContent = `
                    <div style="background-color: #f2f2f2; font-family: Arial, sans-serif; padding: 20px;">
                        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            
                            <div style="text-align: center; padding: 30px 20px; border-bottom: 3px solid #28a745;">
                                <h1 style="color: #28a745; margin: 0; font-size: 24px;">THANH TOÁN THÀNH CÔNG!</h1>
                                <p style="color: #666; margin-top: 10px;">Mã đặt phòng: <strong>#${info.booking_id}</strong></p>
                            </div>

                            <div style="padding: 20px; border-bottom: 1px solid #eee;">
                                <table width="100%">
                                    <tr>
                                        <td width="30%" style="vertical-align: top;">
                                            <img src="${info.hotel_image}" alt="hotel" style="width: 100%; border-radius: 5px; object-fit: cover;">
                                        </td>
                                        <td width="70%" style="padding-left: 20px; vertical-align: top;">
                                            <h2 style="margin: 0 0 10px 0; color: #333;">${info.hotel_name}</h2>
                                            <p style="margin: 0; color: #007bff; font-size: 14px;">${info.hotel_address}</p>
                                            <p style="margin: 10px 0 0 0; color: #28a745; font-weight: bold;">✔ Đã thanh toán qua thẻ</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div style="padding: 20px; background-color: #f9f9f9;">
                                <h3 style="margin-top: 0; border-bottom: 2px solid #ddd; padding-bottom: 10px;">Chi tiết đặt phòng</h3>
                                <table width="100%" cellpadding="10">
                                    <tr>
                                        <td style="color: #666;">Khách chính:</td>
                                        <td><strong>${info.customer_name}</strong><br><small>${info.customer_email} | ${info.customer_phone}</small></td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666;">Thời gian:</td>
                                        <td><strong>${nights} đêm</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666;">Nhận phòng:</td>
                                        <td>
                                            <strong style="font-size: 16px;">${checkInDate}</strong><br>
                                            <span style="color: #888;">(Từ ${info.check_in_time || '14:00'})</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666;">Trả phòng:</td>
                                        <td>
                                            <strong style="font-size: 16px;">${checkOutDate}</strong><br>
                                            <span style="color: #888;">(Trước ${info.check_out_time || '12:00'})</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666;">Loại phòng:</td>
                                        <td>${info.room_type_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666;">Số khách:</td>
                                        <td>${info.guests_count} người lớn</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666;">Giờ đến dự kiến:</td>
                                        <td>${info.arrival_time}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="padding: 20px; background-color: #fff; border-top: 1px solid #eee;">
                                <table width="100%">
                                    <tr>
                                        <td style="font-size: 18px; font-weight: bold;">Tổng tiền đã thanh toán:</td>
                                        <td style="text-align: right; font-size: 24px; color: #dc3545; font-weight: bold;">
                                            ${parseInt(info.total_price).toLocaleString()} VND
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="text-align: right; font-size: 12px; color: #999;">
                                            (Đã bao gồm thuế, phí dịch vụ)
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div style="padding: 20px; background-color: #fff8f8; border: 1px dashed #ffcccc; margin: 20px; border-radius: 5px;">
                                <h4 style="margin-top: 0; color: #cc0000;">⚠️ Lưu ý quan trọng</h4>
                                <ul style="padding-left: 20px; color: #555; font-size: 13px; line-height: 1.6;">
                                    <li>Vui lòng xuất trình email này hoặc mã đặt phòng <strong>#${info.booking_id}</strong> khi nhận phòng.</li>
                                    <li><strong>Chính sách khách sạn:</strong> ${info.hotel_policy || 'Tuân thủ quy định chung.'}</li>
                                </ul>
                            </div>

                            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px; background-color: #f2f2f2;">
                                <p>© 2025 CanTho Travel. Vui lòng không trả lời email này.</p>
                            </div>
                        </div>
                    </div>
                `;

                const mailOptions = {
                    from: '"CanTho Travel Booking" <no-reply@canthotravel.com>',
                    to: email || info.customer_email, 
                    subject: `[Xác nhận] Thanh toán thành công đơn phòng #${booking_id}`,
                    html: mailContent
                };

                await transporter.sendMail(mailOptions);
                console.log("✅ [MAIL PAID] Email xác nhận thanh toán đã gửi thành công!");

            } catch (mailError) {
                console.error("❌ Lỗi gửi mail thanh toán:", mailError);
            }

            // 5. Trả về Client sau khi đã xử lý xong mail
            res.json({ success: true, message: "Thanh toán thành công!", transaction_id: transactionId });
        });
    });
});
// ============================================================
// 🔒 API: GIỮ CHỖ (ĐÃ FIX: CHỐNG DOUBLE BOOKING TUYỆT ĐỐI)
// ============================================================
// ==========================================
// API: GIỮ CHỖ (ĐÃ FIX: TRANSACTION + LOCKING)
// ==========================================
app.post('/api/bookings/hold', (req, res) => {
    const { user_id, hotel_id, room_id, check_in, check_out, guests_count, quantity } = req.body;
    const roomsToBook = parseInt(quantity) || 1; 

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ error: "Transaction Error" });

        try {
            // 1. Dọn đơn ảo cũ của user (nếu có)
            if (user_id) {
                await queryAsync(`UPDATE bookings SET status_id = 5 WHERE user_id = ? AND status_id = 1`, [user_id]);
            }

            // 2. KHÓA DÒNG DỮ LIỆU (QUAN TRỌNG NHẤT)
            // Lệnh FOR UPDATE sẽ bắt các request khác phải CHỜ cho đến khi request này xong
            const sqlLock = `SELECT total_inventory FROM rooms WHERE room_id = ? FOR UPDATE`;
            const roomInfo = await queryAsync(sqlLock, [room_id]);
            
            if (!roomInfo.length) throw new Error("Phòng không tồn tại");
            const totalInventory = roomInfo[0].total_inventory;

            // 3. ĐẾM SỐ PHÒNG ĐÃ ĐẶT TRONG KHOẢNG NGÀY ĐÓ
            // Tính cả: Hold (1), Confirmed (2), Paid (3)
            const sqlCount = `
                SELECT COUNT(*) as booked_count
                FROM hotel_booking_details hbd
                JOIN bookings b ON hbd.booking_id = b.booking_id
                WHERE hbd.room_id = ? 
                AND b.status_id IN (1, 2, 3) 
                AND (hbd.check_in_date < ? AND hbd.check_out_date > ?)
            `;
            const bookedRes = await queryAsync(sqlCount, [room_id, check_out, check_in]);
            const currentBooked = bookedRes[0].booked_count;
            const available = totalInventory - currentBooked;

            // 4. KIỂM TRA
            if (available < roomsToBook) {
                db.rollback(() => {
                    res.status(409).json({ 
                        success: false, 
                        message: `Hết phòng! Chỉ còn ${available} phòng trống.` 
                    });
                });
                return;
            }

            // 5. NẾU CÒN PHÒNG -> INSERT
            const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 phút
            const sqlInsert = `INSERT INTO bookings (user_id, status_id, booking_type, item_id, start_date, end_date, guests_count, total_rooms_booked, expires_at, created_at) VALUES (?, 1, 'hotel', ?, ?, ?, ?, ?, ?, NOW())`;
            
            const result = await queryAsync(sqlInsert, [user_id || null, hotel_id, check_in, check_out, guests_count, roomsToBook, expiresAt]);
            const bookingId = result.insertId;

            // Insert chi tiết
            let details = [];
            for(let i=0; i<roomsToBook; i++) details.push([bookingId, room_id, check_in, check_out, Math.ceil(guests_count/roomsToBook)]);
            await queryAsync(`INSERT INTO hotel_booking_details (booking_id, room_id, check_in_date, check_out_date, guests_count) VALUES ?`, [details]);

            // 6. COMMIT (Mở khóa cho người khác)
            db.commit((commitErr) => {
                if (commitErr) return db.rollback(() => res.status(500).json({ error: "Commit Error" }));
                res.json({ success: true, booking_id: bookingId, expires_at: expiresAt });
            });

        } catch (e) {
            console.error(e);
            db.rollback(() => res.status(500).json({ error: e.message }));
        }
    });
});
// ==========================================
// TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (CHẠY MỖI PHÚT)
// ==========================================
setInterval(() => {
    // 1. TỰ ĐỘNG HỦY ĐƠN QUÁ HẠN (Holding -> Cancelled)
    const sqlCleanup = `
        UPDATE bookings 
        SET status_id = 5 
        WHERE status_id = 1 -- Đang là Holding
        AND expires_at < NOW() -- Và đã quá giờ giữ chỗ
    `;
    db.query(sqlCleanup, (err, result) => {
        if (!err && result.affectedRows > 0) {
            console.log(`🧹 [AUTO-CANCEL] Đã hủy ${result.affectedRows} đơn giữ chỗ quá hạn.`);
        }
    });

    // 2. HOTEL: TỰ ĐỘNG HOÀN THÀNH (Confirmed/Paid -> Completed)
    // Logic: Nếu ngày trả phòng (end_date) nhỏ hơn ngày hiện tại (CURDATE) -> Tức là đã qua ngày hôm sau -> Hoàn thành.
    const sqlHotelComplete = `
        UPDATE bookings 
        SET status_id = 4, updated_at = NOW()
        WHERE booking_type = 'hotel'
        AND status_id IN (2, 3) -- Kiểm tra cả (2) Pay Later và (3) Paid Online
        AND end_date < CURDATE() -- Dùng trực tiếp cột end_date trong bảng bookings
    `;
    
    db.query(sqlHotelComplete, (err, result) => {
        if (err) {
            console.error("❌ [AUTO-HOTEL] Lỗi cập nhật:", err);
        } else if (result.affectedRows > 0) {
            console.log(`✅ [AUTO-HOTEL] ${result.affectedRows} đơn đã chuyển sang HOÀN THÀNH (Qua ngày).`);
        }
    });

    // 3. TOUR: TỰ ĐỘNG HOÀN THÀNH
    // Logic tương tự: Nếu ngày kết thúc tour (end_date) đã qua -> Hoàn thành.
    const sqlTourComplete = `
        UPDATE bookings 
        SET status_id = 4, updated_at = NOW()
        WHERE booking_type = 'tour'
        AND status_id IN (2, 3) 
        AND end_date < CURDATE() -- Dùng trực tiếp cột end_date trong bảng bookings
    `;

    db.query(sqlTourComplete, (err, result) => {
        if (err) {
            console.error("❌ [AUTO-TOUR] Lỗi cập nhật:", err);
        } else if (result.affectedRows > 0) {
            console.log(`✅ [AUTO-TOUR] ${result.affectedRows} đơn đã chuyển sang HOÀN THÀNH (Qua ngày).`);
        }
    });

}, 60 * 1000); // Chạy mỗi 60 giây (1 phút)
// --- [ĐÃ SỬA] API: LẤY CHI TIẾT BOOKING (HỖ TRỢ CẢ HOTEL & TOUR) ---
app.get('/api/bookings/:id', async (req, res) => {
    const bookingId = req.params.id;

    try {
        // 1. Lấy thông tin cơ bản để biết loại booking (booking_type)
        const baseQuery = `SELECT booking_type FROM bookings WHERE booking_id = ?`;
        const baseRows = await queryAsync(baseQuery, [bookingId]);

        if (baseRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        const type = baseRows[0].booking_type;

        // 2. Xử lý theo từng loại
        if (type === 'hotel') {
            // --- LOGIC CŨ CHO KHÁCH SẠN ---
            const sqlHotel = `
                SELECT 
                    b.booking_id, b.status_id, b.total_price, b.expires_at, 
                    b.end_date as booking_end_date,
                    DATE_FORMAT(MIN(hbd.check_in_date), '%Y-%m-%d') AS check_in_date,
                    DATE_FORMAT(MAX(hbd.check_out_date), '%Y-%m-%d') AS check_out_date,
                    MIN(hbd.check_in_datetime) AS check_in_datetime,
                    MAX(hbd.check_out_datetime) AS check_out_datetime,
                    SUM(hbd.guests_count) AS total_guests, 
                    COUNT(hbd.detail_id) AS total_rooms,
                    h.hotel_id, h.name AS hotel_name, h.address AS hotel_address, h.image_url AS hotel_image,
                    r.room_id, r.room_type_name, r.price_per_night, r.image_url AS room_image, 
                    r.size, r.max_guests
                FROM bookings b
                JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
                JOIN hotels h ON b.item_id = h.hotel_id
                JOIN rooms r ON hbd.room_id = r.room_id
                WHERE b.booking_id = ?
                GROUP BY b.booking_id, h.hotel_id, r.room_id
            `;
            
            const results = await queryAsync(sqlHotel, [bookingId]);
            if (results.length === 0) return res.status(404).json({ message: "Lỗi dữ liệu chi tiết khách sạn" });
            
            const data = results[0];

            // Auto-complete logic (Giữ nguyên logic của bạn)
            const isConfirmedOrPaid = (data.status_id === 2 || data.status_id === 3);
            if (isConfirmedOrPaid && data.booking_end_date) {
                const endDate = new Date(data.booking_end_date);
                const today = new Date();
                today.setHours(0,0,0,0); endDate.setHours(0,0,0,0);
                if (endDate < today) {
                    await queryAsync(`UPDATE bookings SET status_id = 4, updated_at = NOW() WHERE booking_id = ?`, [bookingId]);
                    data.status_id = 4;
                }
            }

            return res.json({
                booking_id: data.booking_id,
                booking_type: 'hotel', // Trả về type để frontend biết đường render
                status_id: data.status_id,
                expires_at: data.expires_at,
                check_in: data.check_in_date,
                check_out: data.check_out_date,
                guests_count: data.total_guests,
                total_rooms: data.total_rooms,
                hotel_info: {
                    id: data.hotel_id,
                    name: data.hotel_name,
                    address: data.hotel_address,
                    image_url: data.hotel_image
                },
                room_info: {
                    room_id: data.room_id,
                    room_type_name: data.room_type_name,
                    price: data.price_per_night,
                    image_url: data.room_image,
                    size: data.size,
                    max_guests: data.max_guests
                }
            });

        } else if (type === 'tour') {
            // --- LOGIC MỚI CHO TOUR ---
            const sqlTour = `
                SELECT 
                    b.booking_id, b.status_id, b.total_price, b.customer_name, b.customer_phone, b.customer_email,
                    b.guests_count, b.start_date,
                    t.tour_id, t.name AS tour_name, t.image AS tour_image, 
                    t.start_location, t.start_time, t.duration_hours
                FROM bookings b
                JOIN tours t ON b.item_id = t.tour_id
                WHERE b.booking_id = ?
            `;
            
            const results = await queryAsync(sqlTour, [bookingId]);
            if (results.length === 0) return res.status(404).json({ message: "Lỗi dữ liệu chi tiết tour" });
            
            const data = results[0];

            return res.json({
                booking_id: data.booking_id,
                booking_type: 'tour',
                status_id: data.status_id,
                total_price: data.total_price,
                guests_count: data.guests_count,
                check_in: data.start_date, // Tour dùng start_date làm ngày check-in
                tour_info: {
                    id: data.tour_id,
                    name: data.tour_name,
                    image_url: data.tour_image,
                    start_location: data.start_location,
                    start_time: data.start_time,
                    duration: data.duration_hours
                },
                contact_info: {
                    name: data.customer_name,
                    phone: data.customer_phone,
                    email: data.customer_email
                }
            });
        } else {
             // Trường hợp Booking nhà hàng hoặc loại khác
             return res.status(400).json({ message: "Loại đơn hàng này chưa hỗ trợ xem chi tiết ở đây." });
        }

    } catch (err) {
        console.error("Lỗi lấy chi tiết booking:", err);
        return res.status(500).json({ error: "Lỗi server", details: err });
    }
});
// ==========================================
// API: HỦY ĐƠN HÀNG (SỬA LỖI SQL + FULL TÍNH NĂNG)
// ==========================================
app.post('/api/bookings/cancel', (req, res) => {
    const { booking_id } = req.body;

    if (!booking_id) return res.status(400).json({ message: "Thiếu Booking ID" });

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ error: "Lỗi kết nối DB" });

        try {
            // 1. Lấy thông tin đơn hàng (Đã sửa: dùng b.start_date thay vì b.booking_time)
            const getBookingSql = `
                SELECT b.coupon_code, b.user_id, b.status_id, b.customer_email, b.customer_name, 
                       b.booking_type, b.item_id, b.start_date 
                FROM bookings b 
                WHERE b.booking_id = ? 
                FOR UPDATE
            `;
            const bookingRows = await queryAsync(getBookingSql, [booking_id]);

            if (bookingRows.length === 0) {
                return db.rollback(() => res.status(404).json({ message: "Không tìm thấy đơn hàng" }));
            }

            const booking = bookingRows[0];

            // Chặn hủy nếu đơn đã hoàn thành (4) hoặc đã hủy (5)
            if (booking.status_id === 4) {
                return db.rollback(() => res.status(400).json({ message: "Không thể hủy đơn hàng đã hoàn thành." }));
            }
            if (booking.status_id === 5) {
                return db.rollback(() => res.status(400).json({ message: "Đơn hàng này đã hủy trước đó." }));
            }

            // 2. Cập nhật trạng thái sang 5 (Cancelled)
            const updateSql = "UPDATE bookings SET status_id = 5 WHERE booking_id = ?";
            await queryAsync(updateSql, [booking_id]);

            // 3. Hoàn lại Voucher (Nếu có dùng)
            if (booking.coupon_code) {
                console.log(`♻️ [REFUND VOUCHER] Đang hoàn mã ${booking.coupon_code} cho đơn #${booking_id}`);
                const sqlDecr = `UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?`;
                await queryAsync(sqlDecr, [booking.coupon_code]);

                if (booking.user_id) {
                    const sqlDelHistory = `DELETE FROM user_coupons WHERE user_id = ? AND coupon_code = ? LIMIT 1`;
                    await queryAsync(sqlDelHistory, [booking.user_id, booking.coupon_code]);
                }
            }

            // 4. Commit Transaction
            db.commit(async (commitErr) => {
                if (commitErr) return db.rollback(() => res.status(500).json({ message: "Lỗi Commit" }));

                // === LẤY TÊN DỊCH VỤ ĐỂ GHI VÀO THÔNG BÁO ===
                let serviceName = "Dịch vụ";
                try {
                    if (booking.booking_type === 'hotel') {
                        const hotels = await queryAsync("SELECT name FROM hotels WHERE hotel_id = ?", [booking.item_id]);
                        if (hotels.length) serviceName = hotels[0].name;
                    } else if (booking.booking_type === 'tour') {
                        const tours = await queryAsync("SELECT name FROM tours WHERE tour_id = ?", [booking.item_id]);
                        if (tours.length) serviceName = tours[0].name;
                    }
                } catch (e) { console.error("Lỗi lấy tên dịch vụ:", e); }

                // === A. TẠO THÔNG BÁO NAVBAR ===
                if (booking.user_id) {
                    await createNotification(
                        booking.user_id, 
                        'danger', // Màu đỏ
                        'Đã hủy đơn hàng', 
                        `Đơn hàng #${booking_id} (${serviceName}) đã được hủy thành công.`,
                        booking_id,
                        booking.booking_type
                    );
                }

if (booking.customer_email) {
                    const dateStr = new Date(booking.start_date).toLocaleDateString('vi-VN');
                    
                    try {
                        const mailOptions = {
                            from: '"CanTho Travel" <no-reply@canthotravel.com>',
                            to: booking.customer_email,
                            subject: `[Đã Hủy] Xác nhận hủy đơn hàng #${booking_id}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background-color: #ffffff;">
                                    
                                    <div style="text-align: center; border-bottom: 3px solid #d9534f; padding-bottom: 15px; margin-bottom: 20px;">
                                        <h2 style="color: #d9534f; margin: 0;">ĐƠN HÀNG ĐÃ HỦY</h2>
                                        <p style="color: #777; margin: 5px 0 0;">Mã đơn: <strong>#${booking_id}</strong></p>
                                    </div>

                                    <p>Xin chào <strong>${booking.customer_name}</strong>,</p>
                                    <p>Yêu cầu hủy đơn hàng của bạn đã được thực hiện thành công theo yêu cầu.</p>
                                    
                                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px dashed #ccc;">
                                        <h3 style="margin-top:0; color: #333; font-size: 16px;">📦 Thông tin đơn hàng:</h3>
                                        <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8;">
                                            <li><strong>Dịch vụ:</strong> ${serviceName}</li>
                                            <li><strong>Ngày đi/Check-in:</strong> ${dateStr}</li>
                                            <li><strong>Số lượng khách:</strong> ${booking.guests_count} người</li>
                                            <li><strong>Tổng tiền:</strong> <span style="text-decoration: line-through; color: #999;">${Number(booking.total_price).toLocaleString()} VND</span> (Đã hủy)</li>
                                            <li><strong>Trạng thái:</strong> <span style="color: red; font-weight: bold; background: #ffebee; padding: 2px 6px; border-radius: 4px;">ĐÃ HỦY</span></li>
                                        </ul>
                                    </div>

                                    <p style="font-size: 13px;">Nếu đây là nhầm lẫn hoặc bạn cần hỗ trợ đặt lại, vui lòng liên hệ hotline <strong>1900 1234</strong>.</p>
                                    <hr style="border: 0; border-top: 1px solid #eee;">
                                    <div style="text-align: center; font-size: 12px; color: #888;">
                                        <p>&copy; 2025 CanTho Travel. All rights reserved.</p>
                                    </div>
                                </div>
                            `
                        };
                        transporter.sendMail(mailOptions);
                        console.log(`📧 Email hủy đơn đã gửi tới: ${booking.customer_email}`);
                    } catch (mailError) {
                        console.error("Lỗi gửi mail hủy:", mailError);
                    }
                }
                
                console.log(`✅ [CANCEL SUCCESS] Đã hủy đơn #${booking_id}`);
                res.json({ success: true, message: "Đã hủy đơn hàng thành công" });
            });

        } catch (error) {
            console.error("❌ Lỗi xử lý hủy đơn:", error);
            db.rollback(() => res.status(500).json({ message: "Lỗi hệ thống khi hủy đơn" }));
        }
    });
});
// ==========================================
// API: HỦY ĐƠN & GỬI YÊU CẦU HOÀN TIỀN (BẮT BUỘC CÓ)
// ==========================================
app.post('/api/bookings/cancel-refund', (req, res) => {
    const { 
        booking_id, user_id, 
        bank_name, account_number, account_holder_name, reason 
    } = req.body;

    if (!booking_id || !bank_name || !account_number) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin hoàn tiền!" });
    }

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ error: "Lỗi kết nối DB" });

        try {
            // 1. Lấy thông tin đơn hàng để biết số tiền và email
            const getBookingSql = `
                SELECT b.*, t.name as tour_name, h.name as hotel_name 
                FROM bookings b
                LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
                LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
                WHERE b.booking_id = ? FOR UPDATE`;
            
            const bookingRows = await queryAsync(getBookingSql, [booking_id]);

            if (bookingRows.length === 0) {
                return db.rollback(() => res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." }));
            }

            const booking = bookingRows[0];
            const serviceName = booking.tour_name || booking.hotel_name || "Dịch vụ";

            // 2. Cập nhật trạng thái đơn -> Đã hủy (Status ID = 5)
            await queryAsync("UPDATE bookings SET status_id = 5 WHERE booking_id = ?", [booking_id]);

            // 3. Lưu yêu cầu hoàn tiền vào bảng refund_requests
            // (Đảm bảo tên cột khớp với ảnh database bạn gửi)
            const insertRefundSql = `
                INSERT INTO refund_requests 
                (booking_id, user_id, bank_name, account_number, account_holder_name, reason, refund_amount, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            await queryAsync(insertRefundSql, [
                booking_id, user_id, bank_name, account_number, account_holder_name, reason, booking.total_price
            ]);

            // 4. Xử lý Voucher (Hoàn lại lượt dùng nếu có)
            if (booking.coupon_code) {
                await queryAsync("UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?", [booking.coupon_code]);
                // Xóa lịch sử dùng của user để họ dùng lại được
                if (user_id) {
                    await queryAsync("DELETE FROM user_coupons WHERE user_id = ? AND coupon_code = ? LIMIT 1", [user_id, booking.coupon_code]);
                }
            }

            // 5. Commit Transaction
            db.commit(async (commitErr) => {
                if (commitErr) return db.rollback(() => res.status(500).json({ success: false, message: "Lỗi Commit" }));

                // --- A. TẠO THÔNG BÁO NAVBAR ---
                await createNotification(
                    user_id, 
                    'danger', // Màu đỏ cảnh báo
                    'Yêu cầu hoàn tiền', 
                    `Đơn #${booking_id} đã hủy. Yêu cầu hoàn tiền đang được xử lý.`,
                    booking_id,
                    booking.booking_type
                );

                // --- B. GỬI EMAIL XÁC NHẬN ---
// === B. GỬI EMAIL XÁC NHẬN HOÀN TIỀN (CẬP NHẬT) ===
                if (booking.customer_email) {
                    // 1. Format ngày tháng cho đẹp
                    const bookingDate = new Date(booking.created_at).toLocaleDateString('vi-VN');
                    const startDate = new Date(booking.start_date).toLocaleDateString('vi-VN');
                    const endDate = new Date(booking.end_date).toLocaleDateString('vi-VN');
                    
                    try {
                        const mailOptions = {
                            from: '"CanTho Travel Support" <no-reply@canthotravel.com>',
                            to: booking.customer_email,
                            subject: `[Xác nhận] Yêu cầu hoàn tiền đơn hàng #${booking_id}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                                    
                                    <div style="text-align: center; border-bottom: 2px solid #d9534f; padding-bottom: 10px; margin-bottom: 20px;">
                                        <h2 style="color: #d9534f; margin: 0;">YÊU CẦU HOÀN TIỀN ĐANG XỬ LÝ</h2>
                                        <p style="color: #777; margin: 5px 0 0;">Mã đơn: <strong>#${booking_id}</strong></p>
                                    </div>

                                    <p>Xin chào <strong>${booking.customer_name}</strong>,</p>
                                    <p>Hệ thống đã ghi nhận yêu cầu hủy đơn hàng và đang tiến hành thủ tục hoàn tiền.</p>
                                    
                                    <div style="background: #eef2f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                        <h3 style="margin-top:0; color: #0056b3; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">📦 Thông tin đơn hàng đã hủy:</h3>
                                        <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8;">
                                            <li><strong>Dịch vụ:</strong> ${serviceName}</li>
                                            <li><strong>Ngày đặt:</strong> ${bookingDate}</li>
                                            <li><strong>Thời gian sử dụng:</strong> ${startDate} ${booking.booking_type === 'hotel' ? `đến ${endDate}` : ''}</li>
                                            <li><strong>Số khách:</strong> ${booking.guests_count} người</li>
                                            <li><strong>Tổng tiền:</strong> ${Number(booking.total_price).toLocaleString()} VND</li>
                                        </ul>
                                    </div>

                                    <div style="background: #fff8e1; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px dashed #f0ad4e;">
                                        <h3 style="margin-top:0; color: #856404; font-size: 16px; border-bottom: 1px solid #f0ad4e; padding-bottom: 5px;">💳 Thông tin nhận tiền hoàn:</h3>
                                        <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8;">
                                            <li><strong>Ngân hàng:</strong> ${bank_name}</li>
                                            <li><strong>Số tài khoản:</strong> ${account_number}</li>
                                            <li><strong>Chủ tài khoản:</strong> ${account_holder_name}</li>
                                            <li><strong>Số tiền hoàn dự kiến:</strong> <span style="color: #d9534f; font-weight: bold; font-size: 18px;">${Number(booking.total_price).toLocaleString()} VND</span></li>
                                        </ul>
                                    </div>
                                    
                                    <p>⏳ <strong>Thời gian xử lý:</strong> Tiền sẽ được hoàn về tài khoản của bạn trong vòng <strong>3 - 7 ngày làm việc</strong> (không tính T7, CN).</p>
                                    <hr style="border: 0; border-top: 1px solid #eee;">
                                    <p style="font-size: 12px; color: #999; text-align: center;">
                                        Đây là email tự động, vui lòng không trả lời.<br>
                                        Bộ phận kế toán CanTho Travel
                                    </p>
                                </div>
                            `
                        };
                        transporter.sendMail(mailOptions);
                        console.log(`📧 Email hoàn tiền (Full info) đã gửi tới: ${booking.customer_email}`);
                    } catch (e) { console.error("Lỗi gửi mail:", e); }
                }

                res.json({ success: true, message: "Đã gửi yêu cầu hoàn tiền thành công!" });
            });

        } catch (error) {
            console.error(error);
            db.rollback(() => res.status(500).json({ success: false, message: "Lỗi hệ thống" }));
        }
    });
});
// =========================================================
// 🎟️ API XÁC THỰC MÃ GIẢM GIÁ (POST /api/coupons/validate)
// =========================================================
app.post('/api/coupons/validate', (req, res) => {
    // Input: { code: 'TOUR15P', user_id: 123, order_value: 350000, service_type: 'TOUR' }
    const { code, user_id, order_value, service_type } = req.body;
    
    // Yêu cầu user_id để kiểm tra giới hạn sử dụng cá nhân (user_id có thể là NULL)
    if (!code || !order_value || !service_type) {
        return res.status(400).json({ success: false, message: "Thiếu mã, giá trị đơn hàng, hoặc loại dịch vụ." });
    }

    // 1. Lấy thông tin Voucher
    const sqlGetCoupon = `
        SELECT 
            *, 
            (usage_limit - used_count) AS remaining_count
        FROM coupons 
        WHERE code = ?;
    `;

    db.query(sqlGetCoupon, [code], (err, results) => {
        if (err) {
            console.error("❌ Lỗi SQL khi lấy coupon:", err);
            return res.status(500).json({ success: false, message: "Lỗi hệ thống database." });
        }
        
        if (results.length === 0) {
            return res.json({ success: false, message: "Mã giảm giá không tồn tại." });
        }
        
        const coupon = results[0];
        const now = new Date();
        
        // --- 1. KIỂM TRA ĐIỀU KIỆN CHUNG & THỜI HẠN ---
        
        // Chuyển đổi Date objects (đảm bảo chúng ta không so sánh chuỗi)
        const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
        const expiryDate = new Date(coupon.expiry_date);

        if (startDate && startDate > now) {
            return res.json({ success: false, message: "Mã chưa đến ngày kích hoạt." });
        }
        if (expiryDate < now) {
            return res.json({ success: false, message: "Mã đã hết hạn sử dụng." });
        }
        if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
            return res.json({ success: false, message: "Mã đã hết số lượt sử dụng toàn hệ thống." });
        }
        if (order_value < coupon.min_order_value) {
            return res.json({ success: false, message: `Giá trị đơn hàng tối thiểu là ${coupon.min_order_value.toLocaleString()}₫.` });
        }
        if (coupon.service_type !== 'ALL' && coupon.service_type !== service_type) {
             return res.json({ success: false, message: `Mã này chỉ áp dụng cho dịch vụ ${coupon.service_type}.` });
        }

        // --- 2. KIỂM TRA ĐIỀU KIỆN EVENT ĐẶC BIỆT (Ví dụ: WEEKEND50, SUMMERTOUR20) ---
        if (coupon.is_event) {
            const currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }); // Ví dụ: Fri, Sat, Sun

            if (coupon.code === 'WEEKEND50') {
                if (!['Fri', 'Sat', 'Sun'].includes(currentDayOfWeek)) { 
                    return res.json({ success: false, message: "Mã WEEKEND50 chỉ áp dụng cho cuối tuần (T6-CN)." });
                }
            }
            if (coupon.code === 'SUMMERTOUR20') {
                // Kiểm tra tháng (Tháng 6, 7, 8 tương ứng với index 5, 6, 7)
                const currentMonth = now.getMonth(); 
                if (currentMonth < 5 || currentMonth > 7) {
                    return res.json({ success: false, message: "Mã SUMMERTOUR20 chỉ áp dụng cho mùa hè (Tháng 6-8)." });
                }
            }
            // Thêm các logic Event khác tại đây...
        }

        // --- 3. KIỂM TRA GIỚI HẠN SỬ DỤNG CÁ NHÂN (Yêu cầu User_ID) ---
        if (user_id && coupon.max_usage_per_user > 0) {
            const sqlUserUsage = "SELECT COUNT(*) AS user_uses FROM user_coupons WHERE user_id = ? AND coupon_code = ?";
            db.query(sqlUserUsage, [user_id, code], (errUser, userResult) => {
                if (errUser) {
                     console.error("Lỗi SQL user_coupons:", errUser);
                     return res.status(500).json({ success: false, message: "Lỗi kiểm tra người dùng." });
                }

                const userUses = userResult[0].user_uses;
                if (userUses >= coupon.max_usage_per_user) {
                    return res.json({ success: false, message: `Bạn đã sử dụng mã này tối đa ${coupon.max_usage_per_user} lần.` });
                }

                // Nếu OK, tính toán và trả về
                respondWithDiscount(res, coupon, order_value);
            });
        } else {
             // Nếu user_id là NULL (khách chưa đăng nhập) hoặc không có giới hạn cá nhân
             respondWithDiscount(res, coupon, order_value);
        }
    });
});

// --- HÀM TÍNH TOÁN VÀ TRẢ VỀ DISCOUNT (HELPER) ---
function respondWithDiscount(res, coupon, order_value) {
    let discountValue = 0;
    const order_value_num = Number(order_value);

    if (coupon.discount_percent > 0) {
        // Tính % giảm giá
        discountValue = (order_value_num * coupon.discount_percent) / 100;
    } else if (coupon.discount_amount > 0) {
        // Giảm theo số tiền cố định
        discountValue = coupon.discount_amount;
    }

    // Giới hạn discount tối đa là giá trị đơn hàng
    discountValue = Math.min(discountValue, order_value_num); 

    res.json({ 
        success: true, 
        message: "Áp dụng mã giảm giá thành công!",
        discount_amount: Math.round(discountValue), // Làm tròn giá trị giảm
        coupon_info: {
            code: coupon.code,
            discount_type: coupon.discount_percent > 0 ? 'PERCENT' : 'AMOUNT',
            discount_value: coupon.discount_percent > 0 ? coupon.discount_percent : coupon.discount_amount,
            min_order: coupon.min_order_value
        }
    });
}
// ==========================================
// API: ĐẶT TOUR (TOUR BOOKING)
// ==========================================
app.post('/api/bookings/tour', (req, res) => {
    const { 
        user_id, customer_name, customer_email, customer_phone, 
        note, tour_id, check_in_date, guests_count, total_price, coupon_code,
        payment_method // <--- 1. BẮT BUỘC NHẬN BIẾN NÀY
    } = req.body; 

    if (!customer_name || !customer_phone || !tour_id) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
    }

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: "Lỗi kết nối DB" });

        // === 2) Xác định Status dựa trên Payment Method ===
        // Pay Later -> 2 (Confirmed)
        // Pay Online -> 1 (Holding - Chờ thanh toán)
        let initialStatus = (payment_method === 'pay_later' || payment_method === 'pay_at_hotel') ? 2 : 1;

        // === 3) Insert vào bookings ===
        const sqlBooking = `
            INSERT INTO bookings (user_id, status_id, booking_type, customer_name, customer_email, customer_phone, item_id, total_price, start_date, end_date, guests_count, total_rooms_booked, note, created_at, coupon_code)
            VALUES (?, ?, 'tour', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), ?)
        `;

        const values = [
            user_id || null, 
            initialStatus, // <--- Sử dụng biến status động
            customer_name, customer_email, customer_phone, 
            tour_id, total_price, check_in_date, check_in_date, 
            guests_count, note || '',
            coupon_code || null
        ];

        db.query(sqlBooking, values, (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ message: "Lỗi tạo booking", err }));
            
            const newBookingId = result.insertId;
            
            db.commit(async (err) => {
                if (err) return db.rollback(() => res.status(500).json({ message: "Lỗi Commit" }));
                // === 🟢 THÊM ĐOẠN NÀY ĐỂ TẠO THÔNG BÁO TOUR ===
                if (user_id) {
                    // Lấy tên tour để thông báo đẹp hơn
                    const tours = await queryAsync("SELECT name FROM tours WHERE tour_id = ?", [tour_id]);
                    const tourName = tours.length ? tours[0].name : 'Tour du lịch';
                    
                    await createNotification(
                        user_id, 
                        'success', 
                        'Đặt tour thành công', 
                        `Đơn tour #${newBookingId}: ${tourName} đã được xác nhận.`,
                        newBookingId, 
                        'tour'
                    );
                }
                // === 🟢 KẾT THÚC ĐOẠN THÊM ===

                // Trả về Client ngay lập tức
                res.status(201).json({ success: true, message: "Đặt tour thành công!", booking_id: newBookingId });


                // ============================================================
                // 🔴 LOGIC GỬI MAIL: CHỈ GỬI KHI PAY LATER
                // ============================================================
                if (payment_method === 'pay_later' || payment_method === 'pay_at_hotel') {
                    console.log(`📩 [MAIL START] Gửi mail 'Xác nhận Tour (Thanh toán sau)' cho đơn #${newBookingId}`);
                    
                    const sqlGetTour = `SELECT * FROM tours WHERE tour_id = ?`;
                    db.query(sqlGetTour, [tour_id], async (errTour, tourResult) => {
                        if (!errTour && tourResult.length > 0) {
                            const tourInfo = tourResult[0];
                            const dateStr = new Date(check_in_date).toLocaleDateString('vi-VN');
                            
                            // Format giờ
                            const formatTime = (t) => (t && t.toString().length > 5) ? t.toString().slice(0, 5) : (t || '---');
                            const startTime = formatTime(tourInfo.start_time);
                            const startLocation = tourInfo.start_location || 'Liên hệ sau';
                            const endTime = formatTime(tourInfo.end_time);
                            const endLocation = tourInfo.end_location || 'Tại điểm khởi hành';
                            const duration = tourInfo.duration_hours ? `${tourInfo.duration_hours} tiếng` : 'Trong ngày';

                            try {
                                const qrData = `BOOKING-PENDING-${newBookingId}`;
                                const qrCodeBuffer = await QRCode.toBuffer(qrData);

                                let transporter = nodemailer.createTransport({
                                    service: 'gmail',
                                    auth: { user: 'canthotravel91@gmail.com', pass: 'rcpb plqa refa grod' }
                                });

                                const mailContent = `
                                    <div style="font-family: Arial, sans-serif; padding: 40px 0; background-color: #f4f6f8;">
                                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                                            <div style="padding: 20px; border-bottom: 3px solid #ff9800; text-align: center;">
                                                <h2 style="color: #e65100; margin: 0;">ĐẶT TOUR THÀNH CÔNG</h2>
                                                <p style="color: #666; margin-top: 5px;">(Thanh toán sau)</p>
                                                <p>Mã vé: <strong>#${newBookingId}</strong></p>
                                            </div>
                                            
                                            <div style="padding: 20px;">
                                                <p>Xin chào <strong>${customer_name}</strong>,</p>
                                                <p>Đơn đặt tour của bạn đã được ghi nhận. Vui lòng thanh toán tại điểm khởi hành hoặc văn phòng.</p>
                                                
                                                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                                    <p><strong>🗺 Tour:</strong> ${tourInfo.name}</p>
                                                    <p><strong>📅 Ngày đi:</strong> ${dateStr}</p>
                                                    <p><strong>⏰ Giờ đón:</strong> ${startTime}</p>
                                                    <p><strong>📍 Điểm đón:</strong> ${startLocation}</p>
                                                    <p><strong>💰 Tổng tiền:</strong> <span style="color:red; font-weight:bold">${parseInt(total_price).toLocaleString()} VND</span></p>
                                                </div>

                                                <div style="text-align: center; margin-top: 20px;">
                                                    <p style="font-size: 12px; color: #666;">Quét mã QR dưới đây để check-in:</p>
                                                    <img src="cid:qrcode_pending" style="width: 150px; border: 1px solid #eee; padding: 5px;" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;

                                await transporter.sendMail({
                                    from: '"CanTho Travel" <no-reply@canthotravel.com>',
                                    to: customer_email,
                                    subject: `[Xác nhận] Đơn tour #${newBookingId} - ${dateStr}`,
                                    html: mailContent,
                                    attachments: [{ filename: 'qrcode.png', content: qrCodeBuffer, cid: 'qrcode_pending' }]
                                });
                                console.log("✅ Email xác nhận Tour (Pay Later) đã gửi.");
                            } catch (e) { console.error("Lỗi mail:", e); }
                        }
                    });
                } else {
                    console.log(`⏳ [MAIL SKIP] Đơn Tour #${newBookingId} chọn thanh toán Online. Đợi thanh toán xong mới gửi mail Vé.`);
                }
            });
        });
    });
});
// ==========================================
// 💳 API THANH TOÁN TOUR (FINAL FIX: CALLBACK + VOUCHER UPDATE)
// ==========================================
app.post('/api/payment/process-tour', (req, res) => {
    // Lấy coupon_code từ body (Front-end phải gửi mã đã áp dụng)
    const { booking_id, card_number, amount, email, coupon_code } = req.body; 

    if (!card_number || card_number.length < 9) {
        return res.status(400).json({ success: false, message: "Thẻ không hợp lệ!" });
    }

    const transactionId = "TOUR-" + Date.now(); 

    // BẮT ĐẦU TRANSACTION
    db.beginTransaction((err) => { 
        if (err) return res.status(500).json({ success: false, message: "Lỗi kết nối DB" });

        // 1. LẤY THÔNG TIN BOOKING GỐC VÀ XÁC ĐỊNH USER_ID/COUPON CŨ
        const sqlGetBooking = `SELECT user_id, coupon_code FROM bookings WHERE booking_id = ? FOR UPDATE`;
        
        db.query(sqlGetBooking, [booking_id], (err, bookingRows) => {
            if (err) return db.rollback(() => res.status(500).json({ success: false, message: "Lỗi truy vấn booking" }));
            if (bookingRows.length === 0) return db.rollback(() => res.status(404).json({ success: false, message: "Mã đặt tour không tồn tại." }));
            
            const finalUserId = bookingRows[0].user_id || null;
            const existingCouponCode = bookingRows[0].coupon_code;

            // Xác định mã voucher cần xử lý (Ưu tiên mã đã lưu trong DB nếu có)
            const couponToSave = existingCouponCode || coupon_code || null;
            const needsVoucherUpdate = couponToSave && !existingCouponCode; // Chỉ chạy update voucher nếu có mã VÀ mã chưa được lưu

            // 2. CẬP NHẬT TRẠNG THÁI BOOKING & LƯU COUPON_CODE
            // Status = 3 (Đã thanh toán Online)
            const updateSql = `
                UPDATE bookings 
                SET status_id = 3, 
                    note = CONCAT(IFNULL(note, ''), ' [Thanh toán thẻ: ', ?, ']'),
                    coupon_code = ? 
                WHERE booking_id = ?`;

            db.query(updateSql, [transactionId, couponToSave, booking_id], (err, result) => {
                if (err) return db.rollback(() => { console.error("❌ Lỗi UPDATE bookings:", err); return res.status(500).json({ success: false, message: "Lỗi cập nhật trạng thái đơn hàng." }); });
                
                // --- 3. HÀM XỬ LÝ VOUCHER (Định nghĩa hàm để gọi) ---
                const processVoucher = (callback) => {
                    if (!needsVoucherUpdate) return callback(); // Bỏ qua nếu mã đã được lưu

                    // Lấy thông tin coupon
                    db.query(`SELECT * FROM coupons WHERE code = ?`, [couponToSave], (err, couponRows) => {
                        if (err || couponRows.length === 0) {
                            return callback(new Error(`Mã giảm giá ${couponToSave} không tồn tại.`));
                        }
                        
                        // a. Tăng used_count
                        const sqlInc = `UPDATE coupons SET used_count = IFNULL(used_count,0) + 1 WHERE code = ?`;
                        db.query(sqlInc, [couponToSave], (err) => {
                            if (err) return callback(new Error("Lỗi cập nhật UsedCount."));
                            
                            // b. Insert user_coupons history
                            const sqlInsertUserCoupon = `INSERT INTO user_coupons (user_id, coupon_code, used_at) VALUES (?, ?, NOW())`;
                            db.query(sqlInsertUserCoupon, [finalUserId, couponToSave], (err) => {
                                if (err) return callback(new Error("Lỗi lưu lịch sử sử dụng voucher."));
                                console.log(`✅ [VOUCHER] Cập nhật voucher ${couponToSave} thành công.`);
                                callback(); // Hoàn thành xử lý voucher
                            });
                        });
                    });
                };

                // --- 4. CHẠY XỬ LÝ VOUCHER VÀ COMMIT ---
                processVoucher((voucherErr) => {
                    if (voucherErr) {
                        console.error("❌ Lỗi xử lý Voucher:", voucherErr.message);
                        return db.rollback(() => res.status(500).json({ success: false, message: `Thanh toán lỗi: ${voucherErr.message}` }));
                    }

                    // COMMIT TRANSACTION
                    db.commit(async (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ success: false, message: "Lỗi Commit Transaction." }));
                        
                        console.log(`✅ [COMMIT] Transaction for Tour #${booking_id} successful.`);

                        // Trả về Client ngay (không chờ mail)
                        res.json({ success: true, message: "Thanh toán thành công!", transaction_id: transactionId });

                        // 5. GỬI MAIL VÉ ĐIỆN TỬ SAU KHI THANH TOÁN
                        const getTourInfoSql = `
                            SELECT 
                                b.booking_id, b.customer_name, b.customer_email, b.customer_phone, 
                                b.start_date, b.guests_count, b.total_price, b.coupon_code,
                                t.name as tour_name, t.image as tour_image,
                                t.start_location, t.end_location, t.duration_hours, t.start_time, t.end_time 
                            FROM bookings b
                            JOIN tours t ON b.item_id = t.tour_id
                            WHERE b.booking_id = ?
                        `;
                        
                        try {
                            // Sử dụng queryAsync ở đây để code gọn hơn trong block async
                            const data = await queryAsync(getTourInfoSql, [booking_id]);

                            if (data.length > 0) {
                                const info = data[0];
                                const dateStr = new Date(info.start_date).toLocaleDateString('vi-VN');

                                // --- FORMAT DỮ LIỆU ---
                                const startLocation = info.start_location || 'Đang cập nhật';
                                const endLocation = info.end_location || 'Tại điểm khởi hành';
                                const formatTime = (t) => (t && t.toString().length > 5) ? t.toString().slice(0, 5) : (t || '---');
                                const startTime = formatTime(info.start_time);
                                const endTime = formatTime(info.end_time);
                                const duration = info.duration_hours ? `${info.duration_hours} tiếng` : 'Trong ngày';
                                const appliedCouponDisplay = info.coupon_code ? ` (Đã áp dụng mã ${info.coupon_code})` : '';

                                let transporter = nodemailer.createTransport({
                                    service: 'gmail',
                                    auth: { user: 'canthotravel91@gmail.com', pass: 'rcpb plqa refa grod' }
                                });

                                const qrData = `TICKET-PAID-${info.booking_id}-CONFIRMED`;
                                const qrCodeBuffer = await QRCode.toBuffer(qrData);

                                const mailContent = `
                                    <div style="background-color: #f4f6f8; font-family: Arial, sans-serif; padding: 40px 0;">
                                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                                            
                                            <div style="text-align: center; padding: 30px; border-bottom: 3px solid #28a745;">
                                                <h1 style="color: #28a745; margin: 0; font-size: 24px;">THANH TOÁN THÀNH CÔNG</h1>
                                                <p style="color: #666; margin-top: 10px; font-size: 14px;">Mã vé: <strong>#${info.booking_id}</strong></p>
                                            </div>

                                            <div style="text-align: center; padding: 20px; background-color: #e8f5e9;">
                                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #2e7d32; font-weight: bold;">MÃ VÉ ĐIỆN TỬ (QR):</p>
                                                <img src="cid:qrcode_paid" style="width: 160px; height: 160px; border: 4px solid white; border-radius: 8px;" />
                                            </div>

                                            <div style="padding: 25px;">
                                                <h3 style="margin-top: 0; color: #333; font-size: 16px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Chi tiết chuyến đi</h3>
                                                
                                                <table style="width: 100%; font-size: 14px;">
                                                    <tr><td style="padding: 5px 0; color:#666;">Khách hàng:</td><td style="font-weight:bold;">${info.customer_name}</td></tr>
                                                    <tr><td style="padding: 5px 0; color:#666;">Tour:</td><td style="font-weight:bold;">${info.tour_name}</td></tr>
                                                    <tr><td style="padding: 5px 0; color:#666;">Ngày đi:</td><td style="font-weight:bold;">${dateStr}</td></tr>
                                                    <tr><td style="padding: 5px 0; color:#666;">Giờ đón:</td><td style="font-weight:bold; color:#d9534f;">${startTime}</td></tr>
                                                    <tr><td style="padding: 5px 0; color:#666;">Điểm đón:</td><td>${startLocation}</td></tr>
                                                    <tr><td style="padding: 5px 0; color:#666;">Số khách:</td><td>${info.guests_count}</td></tr>
                                                </table>
                                            </div>

                                            <div style="background-color: #f9f9f9; padding: 20px; border-top: 1px solid #eee;">
                                                <table style="width: 100%;">
                                                    <tr>
                                                        <td style="font-size: 16px; font-weight: bold; color: #333;">Tổng tiền đã thanh toán:</td>
                                                        <td style="text-align: right; font-size: 24px; color: #d9534f; font-weight: bold;">
                                                            ${Number(info.total_price).toLocaleString()} VND
                                                        </td>
                                                    </tr>
                                                </table>
                                            </div>
                                             <div style="padding: 20px; margin: 20px; background-color: #e8f5e9; border: 1px dashed #66bb6a; border-radius: 6px;">
                                                <h4 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 14px;">✅ Hướng dẫn sử dụng vé ${appliedCouponDisplay}</h4>
                                                <ul style="margin: 0; padding-left: 20px; color: #1b5e20; font-size: 13px; line-height: 1.6;">
                                                    <li>Đây là <strong>Vé điện tử</strong>. Vui lòng xuất trình email này cho HDV khi tập trung.</li>
                                                    <li>Có mặt tại điểm hẹn trước <strong>15 phút</strong>.</li>
                                                </ul>
                                            </div>

                                            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                                                <p>© 2025 CanTho Travel. All rights reserved.</p>
                                            </div>
                                        </div>
                                    </div>
                                `;

                                await transporter.sendMail({
                                    from: '"CanTho Travel Tours" <no-reply@canthotravel.com>',
                                    to: info.customer_email,
                                    subject: `[Vé điện tử] Thanh toán thành công tour #${info.booking_id}`,
                                    html: mailContent,
                                    attachments: [{
                                        filename: 'qrcode.png',
                                        content: qrCodeBuffer,
                                        cid: 'qrcode_paid'
                                    }]
                                });
                                console.log("✅ [MAIL PAID] Email vé Tour đã gửi.");
                            }
                        } catch (e) { 
                            console.error("❌ Lỗi gửi mail (không ảnh hưởng transaction):", e); 
                        }

                    }); // End db.commit
                }); // End processVoucher
            }); // End db.query update
        }); // End db.query getBooking
    }); // End db.beginTransaction
});

// ==========================================
// API: ĐẶT BÀN + GỬI EMAIL CHUYÊN NGHIỆP
// ==========================================
app.post('/api/bookings/chat', (req, res) => {
    console.log("📩 Nhận đơn đặt bàn:", req.body);

    const { restaurant_id, customer_name, phone, email, booking_time, guest_count, note } = req.body;

    const sqlInsert = `
        INSERT INTO restaurant_bookings 
        (restaurant_id, customer_name, phone, email, booking_time, guest_count, note, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())
    `;

    // Xử lý dữ liệu phòng khi null
    const values = [
        restaurant_id, 
        customer_name || 'Khách vãng lai', 
        phone || '', 
        email || '', 
        booking_time, 
        guest_count || 1, 
        note || ''
    ];

    db.query(sqlInsert, values, async (err, result) => {
        if (err) {
            console.error("❌ Lỗi SQL Insert:", err);
            return res.status(500).json({ success: false, message: "Lỗi lưu database" });
        }

        const newBookingId = result.insertId;
        
        // Format ngày giờ cho đẹp (VD: 19:30 ngày 25/12/2025)
        const dateFormatted = new Date(booking_time).toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
        });

        // --- LẤY THÔNG TIN NHÀ HÀNG ĐỂ GỬI MAIL ---
        const sqlRestaurant = "SELECT name, address FROM restaurants WHERE restaurant_id = ?";
        db.query(sqlRestaurant, [restaurant_id], async (errRest, resultRest) => {
            let restaurantName = "Nhà Hàng CanTho Travel";
            let restaurantAddress = "Cần Thơ";

            if (!errRest && resultRest.length > 0) {
                restaurantName = resultRest[0].name;
                restaurantAddress = resultRest[0].address;
            }

            // --- BẮT ĐẦU GỬI MAIL ---
            if (email && email.includes('@')) {
                try {
                    const mailOptions = {
                        from: '"CanTho Travel Restaurant" <no-reply@canthotravel.com>',
                        to: email,
                        subject: `✅ Xác nhận đặt bàn thành công - Mã #${newBookingId}`,
                        html: `
                            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 1.6; background-color: #f4f4f4; padding: 20px;">
                                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
                                    
                                    <div style="background-color: #00466a; padding: 30px 40px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">XÁC NHẬN ĐẶT BÀN</h1>
                                        <p style="color: #e0e0e0; margin: 10px 0 0;">Mã đơn: <strong>#${newBookingId}</strong></p>
                                    </div>

                                    <div style="padding: 40px;">
                                        <p style="font-size: 16px; color: #333;">Xin chào <strong>${customer_name}</strong>,</p>
                                        <p style="font-size: 16px; color: #555;">Cảm ơn bạn đã lựa chọn <strong>${restaurantName}</strong>. Đơn đặt bàn của bạn đã được chúng tôi ghi nhận thành công!</p>
                                        
                                        <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 25px 0;">
                                            <h3 style="margin-top: 0; color: #00466a; border-bottom: 2px solid #00466a; padding-bottom: 10px; display: inline-block;">THÔNG TIN CHI TIẾT</h3>
                                            <table style="width: 100%; font-size: 15px; margin-top: 15px;">
                                                <tr>
                                                    <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Nhà hàng:</strong></td>
                                                    <td style="padding: 8px 0; color: #333; font-weight: 500;">${restaurantName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #666;"><strong>Địa chỉ:</strong></td>
                                                    <td style="padding: 8px 0; color: #333;">${restaurantAddress}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #666;"><strong>Thời gian:</strong></td>
                                                    <td style="padding: 8px 0; color: #2ecc71; font-weight: bold;">${dateFormatted}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #666;"><strong>Số khách:</strong></td>
                                                    <td style="padding: 8px 0; color: #333;">${guest_count} người</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #666;"><strong>Số điện thoại:</strong></td>
                                                    <td style="padding: 8px 0; color: #333;">${phone}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #666;"><strong>Ghi chú:</strong></td>
                                                    <td style="padding: 8px 0; color: #333; font-style: italic;">${note || 'Không có'}</td>
                                                </tr>
                                            </table>
                                        </div>

                                        <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                                <strong>Lưu ý quan trọng:</strong><br>
                                                • Vui lòng đến đúng giờ để được phục vụ tốt nhất.<br>
                                                • Nếu cần thay đổi hoặc hủy bàn, vui lòng liên hệ hotline hoặc giữ lại <strong>Mã đặt bàn (#${newBookingId})</strong> để sử dụng trên hệ thống.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div style="background-color: #f1f1f1; padding: 20px; text-align: center; color: #888; font-size: 13px;">
                                        <p style="margin: 0;">CanTho Travel Inc</p>
                                        <p style="margin: 5px 0;">Ninh Kieu, Can Tho | Hotline: 1900 1234</p>
                                        <p style="margin: 0;">&copy; 2025 CanTho Travel. All rights reserved.</p>
                                    </div>
                                </div>
                            </div>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                    console.log("✅ Email xác nhận đã gửi tới:", email);
                } catch (mailErr) {
                    console.error("⚠️ Lỗi gửi mail (nhưng vẫn đặt bàn thành công):", mailErr);
                }
            }

            // Trả kết quả về cho React
            res.json({ 
                success: true, 
                message: "Đặt bàn thành công! (Email xác nhận đã được gửi)", 
                booking_id: newBookingId 
            });
        });
    });
});
// ==========================================
// API: HỦY ĐẶT BÀN (Status: Cancelled + Email Đỏ)
// URL: POST /api/restaurant/bookings/cancel
// ==========================================
app.post('/api/restaurant/bookings/cancel', (req, res) => {
    let { booking_id } = req.body;

    // 1. Validate
    if (!booking_id) return res.status(400).json({ success: false, message: "Thiếu mã đặt bàn!" });
    const cleanId = parseInt(booking_id.toString().replace('#', '').trim());
    if (isNaN(cleanId)) return res.json({ success: false, message: "Mã đặt bàn không hợp lệ." });

    // 2. Kiểm tra đơn trước khi hủy
    db.query("SELECT * FROM restaurant_bookings WHERE id = ?", [cleanId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Lỗi Server" });
        if (results.length === 0) return res.json({ success: false, message: "Không tìm thấy đơn đặt bàn." });

        const booking = results[0];
        if (booking.status === 'cancelled') {
            return res.json({ success: false, message: "Đơn này đã hủy rồi." });
        }

        // 3. Update Database
        const updateSql = "UPDATE restaurant_bookings SET status = 'cancelled' WHERE id = ?";
        db.query(updateSql, [cleanId], (updateErr) => {
            if (updateErr) return res.status(500).json({ success: false, message: "Lỗi Database" });

            // 4. Gửi Email (CSS nhúng trực tiếp)
            if (booking.email) {
                const timeString = new Date(booking.booking_time).toLocaleString('vi-VN', { 
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
                });

                const htmlContent = `
                <div style="background-color: #f3f4f6; padding: 20px; font-family: Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="background-color: #D32F2F; padding: 20px; text-align: center;">
                            <h2 style="color: white; margin: 0; text-transform: uppercase; font-size: 20px;">Xác nhận Hủy Đặt Bàn</h2>
                        </div>
                        
                        <div style="padding: 25px;">
                            <p style="color: #333; font-size: 16px;">Xin chào <strong>${booking.customer_name}</strong>,</p>
                            <p style="color: #555; line-height: 1.6;">Yêu cầu hủy đặt bàn của bạn đã được xử lý thành công. Chúng tôi rất tiếc vì sự bất tiện này và hy vọng được phục vụ bạn vào dịp khác.</p>
                            
                            <div style="background-color: #FFF5F5; border: 1px solid #FEB2B2; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                <table style="width: 100%; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 5px 0; color: #666;">Mã đặt bàn:</td>
                                        <td style="padding: 5px 0; font-weight: bold; color: #D32F2F;">#${cleanId}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; color: #666;">Thời gian cũ:</td>
                                        <td style="padding: 5px 0; font-weight: bold; color: #333;">${timeString}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; color: #666;">Trạng thái:</td>
                                        <td style="padding: 5px 0; font-weight: bold; text-transform: uppercase;">ĐÃ HỦY</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                            <p style="margin: 0;">Email này được gửi tự động từ hệ thống nhà hàng.</p>
                        </div>
                    </div>
                </div>
                `;

                // Thực hiện gửi
                transporter.sendMail({
                    from: '"Nhà Hàng Của Tôi" <no-reply@restaurant.com>',
                    to: booking.email,
                    subject: `⛔ Đã hủy đặt bàn #${cleanId}`,
                    html: htmlContent
                });
            }

            console.log(`✅ Đã hủy đơn #${cleanId} và gửi mail.`);
            res.json({ success: true, message: "Đã hủy đơn thành công!" });
        });
    });
});

// ==========================================
// API: CẬP NHẬT ĐƠN (Update + Email Xanh Dương)
// URL: POST /api/restaurant/bookings/update
// ==========================================
app.post('/api/restaurant/bookings/update', (req, res) => {
    const { booking_id, new_time, new_guests, note } = req.body;

    // 1. Validate
    if (!booking_id) return res.status(400).json({ success: false, message: "Thiếu ID" });
    const cleanId = parseInt(booking_id.toString().replace('#', '').trim());

    // 2. Lấy dữ liệu cũ
    db.query("SELECT * FROM restaurant_bookings WHERE id = ?", [cleanId], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: "Không tìm thấy đơn." });

        const oldData = results[0];
        const updateTime = new_time ? new_time : oldData.booking_time;
        const updateGuests = new_guests ? new_guests : oldData.guest_count;
        const updateNote = note ? note : oldData.note;

        // 3. Update Database
        const sql = "UPDATE restaurant_bookings SET booking_time = ?, guest_count = ?, note = ? WHERE id = ?";
        db.query(sql, [updateTime, updateGuests, updateNote, cleanId], (updateErr) => {
            if (updateErr) return res.status(500).json({ success: false, message: "Lỗi Update" });

            // 4. Lấy lại dữ liệu MỚI NHẤT để gửi mail
            db.query("SELECT * FROM restaurant_bookings WHERE id = ?", [cleanId], (errNew, resultsNew) => {
                const newData = resultsNew[0];
                const dateFormatted = new Date(newData.booking_time).toLocaleString('vi-VN', {
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                });

                // 5. Gửi Email (CSS nhúng trực tiếp - Màu Xanh)
                if (newData.email) {
                    const htmlContent = `
                    <div style="background-color: #f3f4f6; padding: 20px; font-family: Arial, sans-serif;">
                        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="background-color: #1976D2; padding: 20px; text-align: center;">
                                <h2 style="color: white; margin: 0; text-transform: uppercase; font-size: 20px;">Cập Nhật Thành Công</h2>
                            </div>
                            
                            <div style="padding: 25px;">
                                <p style="color: #333; font-size: 16px;">Xin chào <strong>${newData.customer_name}</strong>,</p>
                                <p style="color: #555; line-height: 1.6;">Thông tin đặt bàn của bạn đã được thay đổi theo yêu cầu. Vui lòng kiểm tra lại thông tin bên dưới:</p>
                                
                                <div style="background-color: #E3F2FD; border: 1px solid #90CAF9; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                    <table style="width: 100%; font-size: 14px;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #555; width: 40%;">Mã vé:</td>
                                            <td style="padding: 8px 0; font-weight: bold; color: #1976D2;">#${newData.id}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #555; border-top: 1px dashed #ccc;">Thời gian mới:</td>
                                            <td style="padding: 8px 0; font-weight: bold; color: #333; border-top: 1px dashed #ccc;">${dateFormatted}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #555; border-top: 1px dashed #ccc;">Số khách:</td>
                                            <td style="padding: 8px 0; font-weight: bold; color: #333; border-top: 1px dashed #ccc;">${newData.guest_count} người</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #555; border-top: 1px dashed #ccc;">Ghi chú:</td>
                                            <td style="padding: 8px 0; font-style: italic; color: #555; border-top: 1px dashed #ccc;">${newData.note || 'Không có'}</td>
                                        </tr>
                                    </table>
                                </div>
                                <p style="text-align: center; color: #1976D2; font-weight: bold;">Hẹn gặp quý khách tại nhà hàng!</p>
                            </div>

                            <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                                <p style="margin: 0;">Mọi thắc mắc xin vui lòng liên hệ hotline.</p>
                            </div>
                        </div>
                    </div>
                    `;

                    transporter.sendMail({
                        from: '"Nhà Hàng Của Tôi" <no-reply@restaurant.com>',
                        to: newData.email,
                        subject: `✅ Cập nhật vé #${newData.id} thành công`,
                        html: htmlContent
                    });
                }

                // Trả về JSON cho Client
                res.json({ 
                    success: true, 
                    message: "Cập nhật thành công!",
                    data: { 
                        id: newData.id,
                        time: dateFormatted,
                        guests: newData.guest_count,
                        email: newData.email,
                        name: newData.customer_name
                    }
                });
            });
        });
    });
});
// Route: GET /api/bookings/invoice/:id
app.get('/api/bookings/invoice/:id', async (req, res) => {
  const bookingId = req.params.id;
  if (!bookingId) return res.status(400).json({ message: "Booking ID required" });

  try {
    // --- 0) Auto complete (Logic tự động hoàn thành đơn nếu quá hạn) ---
    // (Giữ nguyên logic cũ của bạn)
    const sqlAutoHotel = `
      UPDATE bookings b
      JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
      SET b.status_id = 4, b.updated_at = NOW()
      WHERE b.booking_id = ?
        AND b.booking_type = 'hotel'
        AND b.status_id = 2
        AND hbd.check_out_datetime <= NOW()
    `;
    await queryAsync(sqlAutoHotel, [bookingId]);

    const sqlAutoTour = `
      UPDATE bookings b
      JOIN tour_booking_details tbd ON b.booking_id = tbd.booking_id
      LEFT JOIN tours t ON tbd.tour_id = t.tour_id
      SET b.status_id = 4, b.updated_at = NOW()
      WHERE b.booking_id = ?
        AND b.booking_type = 'tour'
        AND b.status_id = 2
        AND STR_TO_DATE(CONCAT(tbd.tour_date, ' ', IFNULL(t.start_time,'23:59:59')), '%Y-%m-%d %H:%i:%s') <= NOW()
    `;
    await queryAsync(sqlAutoTour, [bookingId]);

    // --- 1) Master booking (ĐÃ SỬA: XÓA b.payment_id) ---
    const sqlMaster = `
      SELECT 
        b.booking_id, b.user_id, b.booking_type, b.item_id, b.total_price,
        b.customer_name, b.customer_email, b.customer_phone, b.note,
        b.coupon_code, b.start_date, b.end_date, b.guests_count,
        b.total_rooms_booked, b.status_id, 
        -- Đã xóa b.payment_id ở đây vì database không có
        DATE_FORMAT(b.created_at,'%Y-%m-%dT%H:%i:%s') AS created_at,
        DATE_FORMAT(b.updated_at,'%Y-%m-%dT%H:%i:%s') AS updated_at,
        bs.status_name
      FROM bookings b
      LEFT JOIN booking_status bs ON b.status_id = bs.status_id
      WHERE b.booking_id = ?
      LIMIT 1
    `;
    const rows = await queryAsync(sqlMaster, [bookingId]);

    if (!rows.length) return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    const master = rows[0];

    // Tạo object invoice cơ bản
    const invoice = {
      booking_id: master.booking_id,
      booking_type: master.booking_type,
      item_id: master.item_id ?? null,
      status_id: master.status_id,
      status_name: master.status_name,
      created_at: master.created_at,
      updated_at: master.updated_at,
      coupon_code: master.coupon_code || null,
      total_price: Number(master.total_price || 0),
      note: master.note || null,
      customer: {
        name: master.customer_name,
        email: master.customer_email,
        phone: master.customer_phone
      },
      payment: null, // Mặc định null
      service: {},
      detail: {},
      totals: {}
    };

    // --- 2) Payment info (SỬA LẠI LOGIC) ---
    // Vì không có payment_id, ta dựa vào status_id để xác định đã thanh toán hay chưa
    // Status 3 = Đã thanh toán, Status 4 = Hoàn thành (cũng coi như đã trả)
    if (master.status_id === 3 || master.status_id === 4) {
        invoice.payment = {
          payment_method: "Thanh toán Online / Thẻ", 
          amount: Number(master.total_price || 0),
          status_id: master.status_id,
          paid_at: master.updated_at // Lấy ngày update gần nhất làm ngày thanh toán
        };
    } else {
        invoice.payment = {
          payment_method: "Thanh toán sau (Pay Later)",
          amount: 0,
          status_id: master.status_id,
          paid_at: null
        };
    }

    // ============================
    // ⭐ HOTEL 
    // ============================
    if (master.booking_type === "hotel") {
      const sqlHotelInfo = `
        SELECT hotel_id, name, address, image_url, check_in_time, check_out_time, hotel_policy
        FROM hotels WHERE hotel_id = ? LIMIT 1
      `;
      const hotelRows = await queryAsync(sqlHotelInfo, [master.item_id]);
      const hotel = hotelRows[0] || {};

      const sqlRoomsGrouped = `
        SELECT
          COALESCE(r.room_type_name, 'Phòng') AS room_type_name,
          COALESCE(r.price_per_night, 0) AS price_per_night,
          COUNT(*) AS quantity
        FROM hotel_booking_details hbd
        LEFT JOIN rooms r ON hbd.room_id = r.room_id
        WHERE hbd.booking_id = ?
        GROUP BY r.room_type_name, r.price_per_night
      `;
      const roomsGrouped = await queryAsync(sqlRoomsGrouped, [bookingId]);

      const sqlHotelDetail = `
        SELECT
          MIN(hbd.check_in_date) AS check_in_date,
          MAX(hbd.check_out_date) AS check_out_date,
          DATE_FORMAT(MIN(hbd.check_in_datetime),'%Y-%m-%dT%H:%i:%s') AS check_in_datetime,
          DATE_FORMAT(MAX(hbd.check_out_datetime),'%Y-%m-%dT%H:%i:%s') AS check_out_datetime,
          SUM(hbd.guests_count) AS total_guests_details
        FROM hotel_booking_details hbd
        WHERE hbd.booking_id = ?
      `;
      const detailRows = await queryAsync(sqlHotelDetail, [bookingId]);
      const hd = detailRows[0] || {};

      invoice.service = {
        id: hotel.hotel_id || master.item_id || null,
        name: hotel.name || null,
        address: hotel.address || null,
        image: hotel.image_url || null,
        check_in_time: hotel.check_in_time || "14:00",
        check_out_time: hotel.check_out_time || "12:00",
        hotel_policy: hotel.hotel_policy || null
      };

      const roomsSummaryArray = Array.isArray(roomsGrouped) ? roomsGrouped.map(r => ({
        room_type_name: r.room_type_name,
        price_per_night: Number(r.price_per_night || 0),
        quantity: Number(r.quantity || 0)
      })) : [];

      invoice.detail = {
        check_in_date: hd.check_in_date || master.start_date,
        check_out_date: hd.check_out_date || master.end_date,
        check_in_datetime: hd.check_in_datetime,
        check_out_datetime: hd.check_out_datetime,
        total_guests: Number(hd.total_guests_details || master.guests_count),
        total_rooms: Number(master.total_rooms_booked || 0),
        rooms_summary: roomsSummaryArray
      };
    }

    // ============================
    // ⭐ TOUR
    // ============================
    if (master.booking_type === "tour") {
      const sqlTourInfo = `
        SELECT tour_id, name, image, price, start_location, end_location, duration_hours, start_time, end_time
        FROM tours WHERE tour_id = ? LIMIT 1
      `;
      const tourRows = await queryAsync(sqlTourInfo, [master.item_id]);
      const tour = tourRows[0] || {};

      const sqlTourDetail = `
        SELECT
          MIN(tbd.tour_date) AS tour_date,
          DATE_FORMAT(MIN(CONCAT(tbd.tour_date,' ',IFNULL(t.start_time,'00:00:00'))),'%Y-%m-%dT%H:%i:%s') AS tour_datetime,
          SUM(tbd.quantity) AS total_guests_details
        FROM tour_booking_details tbd
        LEFT JOIN tours t ON tbd.tour_id = t.tour_id
        WHERE tbd.booking_id = ?
      `;
      // Nếu không có bảng tour_booking_details thì dùng fallback
      let td = {};
      try {
        const detailRows = await queryAsync(sqlTourDetail, [bookingId]);
        td = detailRows[0] || {};
      } catch (e) {
        console.warn("Không tìm thấy tour_booking_details, dùng thông tin master");
      }

      invoice.service = {
        id: tour.tour_id || master.item_id || null,
        name: tour.name || null,
        image: tour.image || null,
        start_location: tour.start_location || null,
        end_location: tour.end_location || null,
        duration_hours: tour.duration_hours || null,
        start_time: tour.start_time || null,
        end_time: tour.end_time || null
      };

      invoice.detail = {
        tour_date: td.tour_date || master.start_date,
        tour_datetime: td.tour_datetime,
        total_guests: Number(td.total_guests_details || master.guests_count),
        tour_price_per_person: Number(tour.price || 0)
      };
    }

    // Totals chung
    invoice.totals = {
      subtotal: Number(master.total_price),
      discount: 0,
      grand_total: Number(master.total_price)
    };

    // --- RETURN ---
    res.json(invoice);

  } catch (err) {
    console.error("❌ Invoice Error:", err);
    return res.status(500).json({ message: "Lỗi server", details: err.message });
  }
});

// TRONG FILE server.js, THÊM HOẶC KIỂM TRA KHỐI API NÀY
// ==========================================
// 🧾 API RIÊNG: LẤY DỮ LIỆU ĐẶT BÀN (Restaurant Booking)
// ==========================================
app.get('/api/bookings/invoice/restaurant/:id', async (req, res) => {
    const bookingId = req.params.id;

    // Truy vấn từ bảng restaurant_bookings và JOIN với bảng restaurants
    const sql = `
        SELECT
            rb.id AS booking_id,
            'restaurant' AS booking_type, -- Loại dịch vụ
            rb.customer_name, rb.email AS customer_email, rb.phone AS customer_phone,
            rb.note,
            rb.booking_time,
            rb.guest_count AS total_guests,
            rb.status AS status_name,
            rb.created_at,
            r.name AS service_name,
            r.address AS service_address,
            r.image AS service_image,
            r.price_range
        FROM restaurant_bookings rb
        JOIN restaurants r ON rb.restaurant_id = r.restaurant_id
        WHERE rb.id = ?
    `;

    try {
        const results = await queryAsync(sql, [bookingId]);
        if (results.length === 0) {
            // Lỗi 404 cho Frontend
            return res.status(404).json({ message: "Không tìm thấy đơn đặt bàn." });
        }
        
        // Đơn đặt bàn không có total_price, nên gán giá cố định cho dễ hiển thị (hoặc 0)
        const data = { ...results[0], total_price: 0 }; 
        res.json(data);

    } catch (error) {
        console.error("❌ Lỗi truy vấn hóa đơn nhà hàng:", error);
        // Lỗi 500 cho Frontend
        res.status(500).json({ message: "Lỗi Server khi truy vấn đơn đặt bàn.", details: error.message });
    }
});
// ============================================================
// 👤 API QUẢN LÝ USER (PROFILE & CARDS)
// ============================================================

app.put('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { full_name, phone, password, role } = req.body;

    if (full_name === undefined && phone === undefined && password === undefined && role === undefined) {
        return res.status(400).json({ message: "Không có thông tin nào để cập nhật!" });
    }

    try {
        let sql = "UPDATE users SET ";
        const params = [];

        if (full_name !== undefined) { sql += "full_name = ?, "; params.push(full_name); }
        if (phone !== undefined) { sql += "phone = ?, "; params.push(phone); }
        if (role !== undefined) { sql += "role = ?, "; params.push(role); }
        if (password !== undefined && password !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql += "password = ?, ";
            params.push(hashedPassword);
        }

        if (params.length === 0) return res.status(400).json({ message: "Không có dữ liệu thay đổi hợp lệ." });

        sql = sql.slice(0, -2) + " WHERE user_id = ?";
        params.push(userId);

        db.query(sql, params, (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi Server khi cập nhật thông tin." });
            
            db.query("SELECT user_id, full_name, email, phone, role, profile_img FROM users WHERE user_id = ?", [userId], (err, users) => {
                if(!err && users.length > 0) {
                    res.json({ message: "Cập nhật thành công!", user: users[0] });
                } else {
                    res.json({ message: "Cập nhật thành công!" });
                }
            });
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server." });
    }
});

app.get('/api/users/:id/cards', (req, res) => {
    const userId = req.params.id;
    const sql = "SELECT * FROM user_cards WHERE user_id = ?";
    db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ message: "Lỗi lấy danh sách thẻ" });
        res.json(data);
    });
});

app.post('/api/users/:id/cards', (req, res) => {
    const userId = req.params.id;
    const { card_type, card_number, card_holder_name, expiry_date } = req.body;
    
    const sql = "INSERT INTO user_cards (user_id, card_type, card_number, card_holder_name, expiry_date) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [userId, card_type, card_number, card_holder_name, expiry_date], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi Server khi thêm thẻ." });
        res.status(201).json({ message: "Thêm thẻ thành công!", cardId: result.insertId });
    });
});

app.delete('/api/users/:userId/cards/:cardId', (req, res) => {
    const { userId, cardId } = req.params;
    const sql = "DELETE FROM user_cards WHERE card_id = ? AND user_id = ?";
    db.query(sql, [cardId, userId], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi Server khi xóa thẻ." });
        res.json({ message: "Đã xóa thẻ thành công." });
    });
});

// ==========================================
// API: LẤY DANH SÁCH ĐƠN HÀNG CỦA USER (ĐÃ FIX LỖI BẢNG PAYMENTS)
// ==========================================
app.get('/api/users/:id/bookings', async (req, res) => {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    // Ép kiểu số nguyên cho page và pageSize để tránh lỗi SQL Injection hoặc Syntax
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(200, Math.max(10, parseInt(req.query.pageSize || '20', 10)));
    const offset = (page - 1) * pageSize;

    try {
        // --- 1. Main Select Query ---
        const sql = `
            SELECT 
                b.booking_id, 
                b.booking_type, 
                b.total_price, 
                b.coupon_code,
                DATE_FORMAT(b.expires_at, '%Y-%m-%dT%H:%i:%s') AS expires_at,
                b.status_id,
                DATE_FORMAT(b.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
                bs.status_name,
                
                -- SỬA LỖI: Lấy trực tiếp total_price làm amount (vì ko có bảng payments)
                b.total_price AS amount,

                -- Lấy tên dịch vụ (Hotel hoặc Tour)
                COALESCE(h.name, t.name, 'Dịch vụ không xác định') AS service_name,
                COALESCE(h.image_url, t.image, '') AS service_image,
                COALESCE(h.address, t.start_location, '') AS service_address,

                -- Lấy ngày bắt đầu/kết thúc chuẩn
                DATE_FORMAT(b.start_date, '%Y-%m-%dT%H:%i:%s') AS primary_date,
                DATE_FORMAT(b.end_date, '%Y-%m-%dT%H:%i:%s') AS check_out_date,
                b.guests_count

            FROM bookings b
            LEFT JOIN booking_status bs ON b.status_id = bs.status_id
            
            -- JOIN MỀM DẺO (Dùng LOWER để tránh lỗi chữ hoa/thường)
            LEFT JOIN hotels h ON b.item_id = h.hotel_id AND LOWER(b.booking_type) = 'hotel'
            LEFT JOIN tours t ON b.item_id = t.tour_id AND LOWER(b.booking_type) = 'tour'
            
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
            LIMIT ${pageSize} OFFSET ${offset}
        `;

        const rows = await queryAsync(sql, [userId]);

        // Map dữ liệu trả về cho Frontend
        const bookings = rows.map(r => ({
            booking_id: r.booking_id,
            type: r.booking_type,
            status_id: r.status_id,
            status_name: r.status_name,
            total_price: Number(r.total_price || 0),
            amount: Number(r.amount || 0),
            coupon_code: r.coupon_code || null,
            created_at: r.created_at,
            expires_at: r.expires_at,
            service_name: r.service_name,
            service_image: r.service_image,
            service_address: r.service_address,
            primary_date: r.primary_date,       
            check_out_date: r.check_out_date,   
            guests_count: r.guests_count
        }));

        // Đếm tổng số đơn (để phân trang)
        const countSql = `SELECT COUNT(*) as total FROM bookings WHERE user_id = ?`;
        const countRes = await queryAsync(countSql, [userId]);
        const total = (countRes && countRes[0]) ? Number(countRes[0].total) : bookings.length;

        console.log(`✅ [API BOOKINGS] User ${userId}: Found ${bookings.length} items.`);
        return res.json({ page, pageSize, total, count: bookings.length, bookings });

    } catch (err) {
        console.error("❌ Error GET bookings:", err);
        return res.status(500).json({ error: "Lỗi server", details: err.message });
    }
});
// =========================
// REVIEW SYSTEM (UNIFIED)
// =========================

// GET: All reviews of a user
app.get('/api/users/:userId/reviews', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        if (!userId) return res.status(400).json({ success: false, message: "userId required" });

        const sql = `
            SELECT r.*, 
                CASE 
                    WHEN r.review_type = 'hotel' THEN h.name
                    WHEN r.review_type = 'tour' THEN t.name
                    WHEN r.review_type = 'restaurant' THEN rs.name
                END AS service_name,

                CASE 
                    WHEN r.review_type = 'hotel' THEN h.image_url
                    WHEN r.review_type = 'tour' THEN t.image
                    WHEN r.review_type = 'restaurant' THEN rs.image
                END AS service_image,

                CASE
                    WHEN r.review_type = 'hotel' THEN h.address
                    WHEN r.review_type = 'restaurant' THEN rs.address
                    ELSE NULL
                END AS service_address

            FROM reviews r
            LEFT JOIN hotels h ON (r.review_type='hotel' AND r.item_id=h.hotel_id)
            LEFT JOIN tours t ON (r.review_type='tour' AND r.item_id=t.tour_id)
            LEFT JOIN restaurants rs ON (r.review_type='restaurant' AND r.item_id=rs.restaurant_id)
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `;

        const rows = await queryAsync(sql, [userId]);

        return res.status(200).json(rows);

    } catch (err) {
        console.error("GET USER REVIEWS ERROR", err);
        return res.status(500).json({ success: false, message: "Server error", details: err.message });
    }
});


// POST: Add Hotel Review
app.post('/api/reviews/hotel', async (req, res) => {
    try {
        const authUserId = req.user?.user_id || req.user?.id;
        const {
            user_id, item_id, rating, title, comment, cleanliness,
            comfort, location_rating, service_score, value_for_money,
            traveler_type, stay_duration, room_type_booked, country, booking_id
        } = req.body;

        const finalUserId = Number(authUserId || user_id);
        const finalItemId = Number(item_id);

        if (!finalUserId) return res.status(401).json({ success: false, message: "Login required" });
        if (!finalItemId) return res.status(400).json({ success: false, message: "item_id required" });

        // Convert rating 1–5 → 1–10
        let r = Number(rating);
        if (r <= 5) r = r * 2;

        const sql = `
            INSERT INTO reviews 
            (user_id, booking_id, item_id, review_type, rating, title, comment,
             cleanliness, comfort, location_rating, service_score, value_for_money,
             traveler_type, stay_duration, room_type_booked, country)
            VALUES (?, ?, ?, 'hotel', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            finalUserId, booking_id || null, finalItemId, r, title || null, comment || null,
            cleanliness, comfort, location_rating, service_score, value_for_money,
            traveler_type, stay_duration, room_type_booked, country
        ];

        const result = await queryAsync(sql, params);

        return res.status(201).json({ success: true, reviewId: result.insertId });

    } catch (err) {
        console.error("POST HOTEL REVIEW ERROR", err);
        return res.status(500).json({ success: false, message: "Server error", details: err.message });
    }
});


// POST: Add Tour Review
app.post('/api/reviews/tour', async (req, res) => {
    try {
        const authUserId = req.user?.user_id || req.user?.id;
        const { user_id, item_id, rating, comment, booking_id } = req.body;

        const finalUserId = Number(authUserId || user_id);
        const finalItemId = Number(item_id);

        if (!finalUserId) return res.status(401).json({ success: false, message: "Login required" });
        if (!finalItemId) return res.status(400).json({ success: false, message: "item_id required" });

        const r = Math.min(5, Math.max(1, Number(rating || 5)));

        const sql = `
            INSERT INTO reviews (user_id, booking_id, item_id, review_type, rating, comment)
            VALUES (?, ?, ?, 'tour', ?, ?)
        `;

        const params = [finalUserId, booking_id || null, finalItemId, r, comment || null];

        const result = await queryAsync(sql, params);

        return res.status(201).json({ success: true, reviewId: result.insertId });

    } catch (err) {
        console.error("POST TOUR REVIEW ERROR", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


// POST: Add Restaurant Review
app.post('/api/reviews/restaurant', async (req, res) => {
    try {
        const authUserId = req.user?.user_id || req.user?.id;
        const {
            user_id, item_id, rating, title, comment, food_quality,
            rest_service, rest_cleanliness, atmosphere, rest_value_for_money,
            booking_id
        } = req.body;

        const finalUserId = Number(authUserId || user_id);
        const finalItemId = Number(item_id);

        if (!finalUserId) return res.status(401).json({ success: false, message: "Login required" });
        if (!finalItemId) return res.status(400).json({ success: false, message: "item_id required" });

        const r = Math.min(5, Math.max(1, Number(rating || 5)));

        const sql = `
            INSERT INTO reviews 
            (user_id, booking_id, item_id, review_type, rating, title, comment,
             food_quality, rest_service, rest_cleanliness, atmosphere, rest_value_for_money)
            VALUES (?, ?, ?, 'restaurant', ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            finalUserId, booking_id || null, finalItemId, r, title || null, comment || null,
            food_quality, rest_service, rest_cleanliness, atmosphere, rest_value_for_money
        ];

        const result = await queryAsync(sql, params);

        return res.status(201).json({ success: true, reviewId: result.insertId });

    } catch (err) {
        console.error("POST RESTAURANT REVIEW ERROR", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
// ==========================================
// 🔔 HỆ THỐNG THÔNG BÁO (NOTIFICATION SYSTEM)
// ==========================================

// Hàm tiện ích: Tạo thông báo vào DB
const createNotification = async (userId, type, title, message, bookingId = null, bookingType = null) => {
    if (!userId) return; 
    try {
        await queryAsync(
            `INSERT INTO notifications (user_id, type, title, message, booking_id, booking_type, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [userId, type, title, message, bookingId, bookingType]
        );
        console.log(`🔔 Notify User ${userId}: ${title}`);
    } catch (error) {
        console.error("Lỗi tạo thông báo:", error);
    }
};

// API: Lấy danh sách thông báo
app.get('/api/notifications', async (req, res) => {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ message: "Thiếu user_id" });

    try {
        const rows = await queryAsync(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 20
        `, [userId]);
        
        // Xử lý thời gian hiển thị (VD: "2 phút trước")
        const result = rows.map(n => {
            const diff = new Date() - new Date(n.created_at);
            const minutes = Math.floor(diff / 60000);
            let timeStr = 'Vừa xong';
            if (minutes > 0) timeStr = `${minutes} phút trước`;
            if (minutes > 60) timeStr = `${Math.floor(minutes/60)} giờ trước`;
            if (minutes > 1440) timeStr = `${Math.floor(minutes/1440)} ngày trước`;
            return { ...n, time: timeStr };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
});

// API: Đánh dấu đã đọc
app.post('/api/notifications/mark-read', async (req, res) => {
    const { user_id } = req.body;
    try {
        await queryAsync(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [user_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});
// ==========================================
// ⏰ CRON JOB: NHẮC HẸN TỰ ĐỘNG (Chạy 08:00 sáng hàng ngày)
// ==========================================
cron.schedule('0 8 * * *', async () => {
    console.log('--- ⏰ Bắt đầu quét đơn để nhắc hẹn ---');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // 1. Quét đơn NHÀ HÀNG (restaurant_bookings)
        const restBookings = await queryAsync(`
            SELECT rb.id, rb.user_id, rb.booking_time, r.name as restaurant_name 
            FROM restaurant_bookings rb
            JOIN restaurants r ON rb.restaurant_id = r.restaurant_id
            WHERE DATE(rb.booking_time) = ? AND rb.status = 'confirmed' AND rb.user_id IS NOT NULL
        `, [tomorrowStr]);

        for (const b of restBookings) {
            const time = new Date(b.booking_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            await createNotification(
                b.user_id, 'warning', 'Sắp đến lịch hẹn nhà hàng', 
                `Ngày mai bạn có lịch ăn tối tại ${b.restaurant_name} lúc ${time}.`,
                b.id, 'restaurant'
            );
        }

        // 2. Quét đơn TOUR & KHÁCH SẠN (bookings)
        // Status 2 (Confirmed) hoặc 3 (Paid Online)
        const generalBookings = await queryAsync(`
            SELECT b.booking_id, b.user_id, b.booking_type, b.item_id, b.start_date
            FROM bookings b
            WHERE b.start_date = ? AND b.status_id IN (2, 3) AND b.user_id IS NOT NULL
        `, [tomorrowStr]);

        for (const b of generalBookings) {
            let itemName = "Dịch vụ";
            let typeName = "";

            if (b.booking_type === 'hotel') {
                const hotels = await queryAsync("SELECT name FROM hotels WHERE hotel_id = ?", [b.item_id]);
                if (hotels.length) itemName = hotels[0].name;
                typeName = "Check-in Khách sạn";
            } else {
                const tours = await queryAsync("SELECT name FROM tours WHERE tour_id = ?", [b.item_id]);
                if (tours.length) itemName = tours[0].name;
                typeName = "Lịch khởi hành Tour";
            }

            await createNotification(
                b.user_id, 'warning', `Nhắc nhở: ${typeName}`, 
                `Ngày mai là ngày bắt đầu chuyến đi của bạn tại ${itemName}.`,
                b.booking_id, b.booking_type
            );
        }
        console.log(`✅ Đã gửi nhắc nhở xong.`);
    } catch (error) {
        console.error("Lỗi Cron Job:", error);
    }
});

// ============================================================
// 💼 API ADMIN (CRUD)
// ============================================================

app.get("/api/admin/hotels", (_req, res) => {
    const sql = `
        SELECT h.hotel_id, h.name, h.description, h.address, h.star_rating, h.image_url, h.city_id, c.name AS city_name
        FROM hotels h JOIN cities c ON h.city_id = c.city_id
        ORDER BY h.hotel_id DESC`; 
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        return res.json(data); 
    });
});

app.post("/api/admin/hotels", (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ message: `Lỗi upload: ${err.message}` });

        const { name, description, address, star_rating, city_id } = req.body;
        const file = req.file;

        if (!name || !address || !city_id) {
            if (file) fs.unlinkSync(file.path); 
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
        }

        let imageUrl = file ? `http://localhost:${PORT}/public/images/${file.filename}` : 'https://placehold.co/1200x800/adb5bd/FFFFFF?text=No+Image'; 

        const sql = "INSERT INTO hotels (name, description, address, image_url, star_rating, city_id) VALUES (?, ?, ?, ?, ?, ?)";
        
        db.query(sql, [name, description, address, imageUrl, parseInt(star_rating), parseInt(city_id)], (err, result) => {
            if (err) {
                if (file) fs.unlinkSync(file.path);
                return res.status(500).json({ message: "Lỗi Server khi thêm khách sạn" });
            }
            res.status(201).json({ message: "Thêm khách sạn thành công!", hotelId: result.insertId });
        });
    });
});

app.put("/api/admin/hotels/:id", (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ message: `Lỗi upload: ${err.message}` });

        const hotelId = req.params.id;
        const { name, description, address, image_url: currentImageUrl, star_rating, city_id } = req.body;
        const file = req.file;
        
        let imageUrl = file ? `http://localhost:${PORT}/public/images/${file.filename}` : currentImageUrl;

        const sql = "UPDATE hotels SET name=?, description=?, address=?, image_url=?, star_rating=?, city_id=? WHERE hotel_id = ?";
        
        db.query(sql, [name, description, address, imageUrl, parseInt(star_rating), parseInt(city_id), hotelId], (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi Server" });
            res.json({ message: "Cập nhật thành công!" });
        });
    });
});

app.delete("/api/admin/hotels/:id", (req, res) => {
    const hotelId = req.params.id;
    db.query("DELETE FROM hotels WHERE hotel_id = ?", [hotelId], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi Server" });
        res.json({ message: "Xóa thành công!" });
    });
});

app.get("/api/admin/bookings", (_req, res) => {
    const sql = `
        SELECT b.booking_id, b.booking_type, b.customer_name, b.customer_email, b.customer_phone, b.created_at, 
            bs.status_name, p.amount, 
            hbd.check_in_date, hbd.check_out_date, hbd.guests_count, 
            h.name AS hotel_name, r.room_type_name,
            tbd.tour_date, tbd.quantity, t.name AS tour_name
        FROM bookings b 
        LEFT JOIN booking_status bs ON b.status_id = bs.status_id 
        LEFT JOIN payments p ON b.payment_id = p.payment_id 
        LEFT JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id AND b.booking_type = 'hotel' 
        LEFT JOIN rooms r ON hbd.room_id = r.room_id 
        LEFT JOIN hotels h ON r.hotel_id = h.hotel_id 
        LEFT JOIN tour_booking_details tbd ON b.booking_id = tbd.booking_id AND b.booking_type = 'tour' 
        LEFT JOIN tours t ON tbd.tour_id = t.tour_id
        ORDER BY b.created_at DESC`;

    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ message: "Lỗi Server" });
        res.json(data);
    });
});
// ============================================================
// 📊 API ADMIN: DASHBOARD STATS (Thống kê tổng quan)
// ============================================================
app.get('/api/admin/stats', async (req, res) => {
    try {
        // 1. Query gộp để lấy các chỉ số cơ bản
        // - Revenue: Chỉ tính các đơn Đã xác nhận (2), Đã thanh toán (3), Hoàn thành (4)
        // - New Bookings: Đếm đơn tạo trong ngày hôm nay (CURDATE)
        const sqlStats = `
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status_id IN (2, 3, 4)) AS revenue,
                (SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURDATE()) AS new_bookings_today,
                (SELECT COUNT(*) FROM bookings) AS total_bookings,
                (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_users,
                (SELECT COUNT(*) FROM hotels) AS total_hotels
        `;
        
        const statsResults = await queryAsync(sqlStats);
        const stats = statsResults[0];

        // 2. Query lấy 5 đơn hàng mới nhất (để hiển thị bảng)
        const sqlRecent = `
            SELECT b.booking_id, b.customer_name, b.total_price, b.created_at, b.status_id, bs.status_name,
                   COALESCE(h.name, t.name, 'Dịch vụ khác') as service_name
            FROM bookings b
            LEFT JOIN booking_status bs ON b.status_id = bs.status_id
            LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
            LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
            ORDER BY b.created_at DESC
            LIMIT 5
        `;
        const recentBookings = await queryAsync(sqlRecent);

        // Trả về dữ liệu gộp
        res.json({
            revenue: stats.revenue,
            new_bookings_today: stats.new_bookings_today,
            total_bookings: stats.total_bookings,
            total_users: stats.total_users,
            total_hotels: stats.total_hotels,
            recent_bookings: recentBookings
        });

    } catch (err) {
        console.error("Lỗi Dashboard Stats:", err);
        res.status(500).json({ error: "Lỗi Server lấy thống kê" });
    }
});
// ============================================================
// 📊 API ADMIN: DASHBOARD ANALYTICS (FULL BỘ LỌC & BIỂU ĐỒ)
// ============================================================
app.get('/api/admin/analytics', async (req, res) => {
    const { range } = req.query; // 'today', 'week', 'month', 'year'
    
    let condition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)";
    let dateFormat = "%d/%m";

    switch (range) {
        case 'today': condition = "DATE(created_at) = CURDATE()"; dateFormat = "%H:00"; break;
        case 'week':  condition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)"; dateFormat = "%d/%m"; break;
        case 'month': condition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)"; dateFormat = "%d/%m"; break;
        case 'year':  condition = "created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)"; dateFormat = "Thg %m"; break;
    }
    
    const groupBy = `GROUP BY DATE_FORMAT(created_at, '${dateFormat}') ORDER BY MIN(created_at) ASC`;

    try {
        // 1. Tổng quan (Summary)
        const sqlSummary = `
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status_id IN (2, 3, 4) AND ${condition}) AS revenue,
                (SELECT COUNT(*) FROM bookings WHERE booking_type = 'hotel' AND ${condition}) AS total_hotel_orders,
                (SELECT COUNT(*) FROM bookings WHERE booking_type = 'tour' AND ${condition}) AS total_tour_orders,
                (SELECT COUNT(*) FROM restaurant_bookings WHERE ${condition}) AS total_restaurant_orders,
                (SELECT COUNT(*) FROM users WHERE role = 'customer' AND ${condition}) AS new_users
        `;
        const summaryRows = await queryAsync(sqlSummary);

        // 2. Dữ liệu Biểu đồ Doanh thu (Line Chart)
        const revenueChart = await queryAsync(`
            SELECT DATE_FORMAT(created_at, '${dateFormat}') as name, SUM(total_price) as value
            FROM bookings WHERE status_id IN (2, 3, 4) AND ${condition} ${groupBy}
        `);

        // 3. Dữ liệu Biểu đồ Phân loại (Bar Chart)
        const bookingsType = await queryAsync(`
            SELECT DATE_FORMAT(created_at, '${dateFormat}') as date_label, booking_type, COUNT(*) as count
            FROM bookings WHERE ${condition} GROUP BY date_label, booking_type
        `);
        const restType = await queryAsync(`
            SELECT DATE_FORMAT(created_at, '${dateFormat}') as date_label, COUNT(*) as count
            FROM restaurant_bookings WHERE ${condition} GROUP BY date_label
        `);

        // Gộp dữ liệu Bar Chart
        const mergedOrders = {};
        const initEntry = (d) => { if (!mergedOrders[d]) mergedOrders[d] = { name: d, hotel: 0, tour: 0, restaurant: 0 }; };

        bookingsType.forEach(i => { initEntry(i.date_label); if(i.booking_type === 'hotel') mergedOrders[i.date_label].hotel = i.count; if(i.booking_type === 'tour') mergedOrders[i.date_label].tour = i.count; });
        restType.forEach(i => { initEntry(i.date_label); mergedOrders[i.date_label].restaurant = i.count; });

        // 4. Đơn hàng gần đây
        const recentBookings = await queryAsync(`
            SELECT b.booking_id, b.customer_name, b.total_price, b.created_at, b.status_id, bs.status_name,
                   COALESCE(h.name, t.name, 'Dịch vụ khác') as service_name
            FROM bookings b
            LEFT JOIN booking_status bs ON b.status_id = bs.status_id
            LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
            LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
            ORDER BY b.created_at DESC LIMIT 6
        `);

        res.json({
            summary: summaryRows[0] || {},
            charts: { revenue: revenueChart || [], orders: Object.values(mergedOrders) || [] },
            recent_bookings: recentBookings || []
        });

    } catch (err) {
        console.error("Lỗi Analytics:", err);
        res.status(500).json({ error: "Lỗi Server" });
    }
});
// ============================================================
// 🚀 API QUẢN LÝ ĐẶT CHỖ (SEARCH ĐA NĂNG + FULL FILTER)
// ============================================================

app.get('/api/admin/bookings-advanced', async (req, res) => {
    const { page = 1, limit = 10, search, type, status } = req.query;
    const offset = (page - 1) * limit;

    try {
        // --- 1. Query Booking (Hotel & Tour) ---
        let sqlHotelTour = `
            SELECT 
                b.booking_id, b.customer_name, b.customer_email, b.customer_phone,
                b.booking_type, b.total_price, b.created_at, b.updated_at, b.start_date,
                b.status_id, bs.status_name,
                COALESCE(h.name, t.name) as service_name,
                COALESCE(h.image_url, t.image) as service_image
            FROM bookings b
            LEFT JOIN booking_status bs ON b.status_id = bs.status_id
            LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
            LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
            WHERE 1=1
        `;

        // --- 2. Query Restaurant ---
        let sqlRestaurant = `
            SELECT 
                id as booking_id, customer_name, email as customer_email, phone as customer_phone,
                'restaurant' as booking_type, 0 as total_price, created_at, created_at as updated_at, booking_time as start_date,
                CASE WHEN status = 'confirmed' THEN 2 WHEN status = 'cancelled' THEN 5 ELSE 1 END as status_id,
                CASE WHEN status = 'confirmed' THEN 'Đã đặt' WHEN status = 'cancelled' THEN 'Đã hủy' ELSE 'Chờ duyệt' END as status_name,
                r.name as service_name, r.image as service_image
            FROM restaurant_bookings rb
            LEFT JOIN restaurants r ON rb.restaurant_id = r.restaurant_id
            WHERE 1=1
        `;

        // --- 3. Xử lý Lọc & Tìm Kiếm ---
        const params = [];
        let finalQuery = "";

        // Lọc theo loại (Type)
        if (type === 'hotel' || type === 'tour') {
            finalQuery = sqlHotelTour + ` AND b.booking_type = ?`;
            params.push(type);
        } else if (type === 'restaurant') {
            finalQuery = sqlRestaurant;
        } else {
            finalQuery = `(${sqlHotelTour}) UNION ALL (${sqlRestaurant})`;
        }

        // Bọc query để áp dụng Search & Status chung
        let wrapperQuery = `SELECT * FROM (${finalQuery}) AS combined_table WHERE 1=1`;
        
        // 🔥 LOGIC TÌM KIẾM ĐA NĂNG (MỚI) 🔥
        if (search) {
            wrapperQuery += ` AND (
                booking_id LIKE ? OR 
                customer_name LIKE ? OR 
                customer_phone LIKE ? OR 
                customer_email LIKE ? OR 
                service_name LIKE ? -- Tìm theo tên Khách sạn/Tour/Nhà hàng
            )`;
            const term = `%${search}%`;
            params.push(term, term, term, term, term);
        }

        // Lọc theo trạng thái (Status)
        if (status && status !== 'all') {
            wrapperQuery += ` AND status_id = ?`;
            params.push(parseInt(status));
        }

        // Đếm tổng
        const countQuery = `SELECT COUNT(*) as total FROM (${wrapperQuery}) as count_tbl`;
        // Hack: Clone params vì mysql driver cũ có thể consume params (nếu dùng mysql2 thì không cần)
        // Để an toàn và đơn giản, ta chạy query đếm trước với params tương tự (trừ limit)
        // Tuy nhiên, cách tốt nhất là query 2 lần độc lập hoặc dùng SQL_CALC_FOUND_ROWS (nhưng đã deprecated).
        // Ở đây mình giả lập query đếm bằng cách chạy lại logic params.
        const countRes = await queryAsync(countQuery, params); 
        const total = countRes[0]?.total || 0;

        // Query lấy dữ liệu (Sắp xếp mới nhất)
        wrapperQuery += ` ORDER BY COALESCE(updated_at, created_at) DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const rows = await queryAsync(wrapperQuery, params);

        res.json({ data: rows, total, page: parseInt(page), total_pages: Math.ceil(total/limit) });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});
// ============================================================
// 👑 API CHI TIẾT ĐƠN HÀNG (FULL INFO CHO ADMIN)
// ============================================================

// 1. API Chi tiết cho HOTEL & TOUR
// Tìm đoạn: app.get('/api/admin/bookings/:id', ...)
app.get('/api/admin/bookings/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const sql = `
            SELECT 
                b.*, 
                bs.status_name,
                u.email as user_email,
                
                -- Thông tin chung hiển thị
                COALESCE(h.name, t.name) as service_name,
                COALESCE(h.image_url, t.image) as service_image,
                COALESCE(h.address, t.start_location) as service_address,

                -- 🏨 HOTEL
                r.room_type_name, 
                r.size as room_size,
                hbd.check_in_date, 
                hbd.check_out_date,
                
                -- 🗺 TOUR
                t.start_time,
                t.end_time,
                t.start_location,
                t.end_location,
                t.duration_hours,

                -- 💰 THÔNG TIN HOÀN TIỀN (Lấy từ bảng refund_requests của User)
                rr.request_id,
                rr.bank_name,
                rr.account_number,
                rr.account_holder_name,
                rr.reason as user_refund_reason, -- Lý do khách ghi
                rr.refund_amount as requested_amount

            FROM bookings b
            LEFT JOIN booking_status bs ON b.status_id = bs.status_id
            LEFT JOIN users u ON b.user_id = u.user_id
            
            -- JOIN REFUND REQUESTS (Để lấy thông tin ngân hàng khách nhập)
            LEFT JOIN refund_requests rr ON b.booking_id = rr.booking_id

            -- JOIN HOTEL
            LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
            LEFT JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
            LEFT JOIN rooms r ON hbd.room_id = r.room_id
            
            -- JOIN TOUR
            LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
            
            WHERE b.booking_id = ?
        `;
        
        const rows = await queryAsync(sql, [id]);
        if (!rows.length) return res.status(404).json({ message: "Không tìm thấy đơn" });
        
        res.json(rows[0]);
    } catch (e) { 
        console.error("Lỗi API Hotel/Tour:", e);
        res.status(500).json({ error: "Lỗi server lấy chi tiết" }); 
    }
});

// 2. API Chi tiết cho RESTAURANT (Sửa lỗi thiếu khách)
app.get('/api/admin/bookings/restaurant/:id', async (req, res) => {
    try {
        const sql = `
            SELECT 
                rb.id as booking_id, 
                rb.customer_name, 
                rb.email as customer_email, 
                rb.phone as customer_phone, 
                rb.guest_count,  -- Sửa lỗi thiếu số khách
                rb.booking_time, -- Ngày giờ đặt
                rb.note, 
                rb.created_at,
                'restaurant' as booking_type,
                0 as total_price,
                
                CASE WHEN rb.status = 'confirmed' THEN 2 WHEN rb.status = 'cancelled' THEN 5 ELSE 1 END as status_id,
                CASE WHEN rb.status = 'confirmed' THEN 'Đã đặt' WHEN rb.status = 'cancelled' THEN 'Đã hủy' ELSE 'Chờ duyệt' END as status_name,
                
                r.name as service_name, 
                r.address as service_address, 
                r.image as service_image
            FROM restaurant_bookings rb 
            JOIN restaurants r ON rb.restaurant_id = r.restaurant_id
            WHERE rb.id = ?`;
            
        const rows = await queryAsync(sql, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: "Không tìm thấy đơn nhà hàng" });
        res.json(rows[0]);
    } catch (e) { 
        console.error("Lỗi API Restaurant:", e);
        res.status(500).json({ error: e.message }); 
    }
});
// ============================================================
// 📊 API ĐẾM SỐ LƯỢNG ĐƠN THEO LOẠI (CHO TABS)
// ============================================================
app.get('/api/admin/bookings-count-by-type', async (req, res) => {
    try {
        // 1. Đếm Hotel và Tour từ bảng bookings
        const sqlBookings = `SELECT booking_type, COUNT(*) as count FROM bookings GROUP BY booking_type`;
        const bookingCounts = await queryAsync(sqlBookings);

        // 2. Đếm Nhà hàng từ bảng restaurant_bookings
        const sqlRest = `SELECT COUNT(*) as count FROM restaurant_bookings`;
        const restCounts = await queryAsync(sqlRest);

        // 3. Tổng hợp dữ liệu
        let stats = { hotel: 0, tour: 0, restaurant: 0, all: 0 };

        bookingCounts.forEach(item => {
            if (item.booking_type === 'hotel') stats.hotel = item.count;
            if (item.booking_type === 'tour') stats.tour = item.count;
        });

        if (restCounts.length > 0) {
            stats.restaurant = restCounts[0].count;
        }

        // Tính tổng tất cả
        stats.all = stats.hotel + stats.tour + stats.restaurant;

        res.json(stats);
    } catch (e) {
        console.error("Lỗi đếm số lượng:", e);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// ============================================================
// 🏨 API QUẢN LÝ KHÁCH SẠN & OWNER (LOGIC TỰ ĐỘNG TẠO TK)
// ============================================================

// 1. Lấy danh sách Khách sạn
app.get('/api/admin/hotels-manager', async (req, res) => {
    const { search } = req.query;
    try {
        let sql = `
            SELECT h.hotel_id, h.name, h.address, h.star_rating, h.image_url,
                   c.name as city_name,
                   o.owner_name, o.owner_email,
                   (SELECT COUNT(*) FROM rooms WHERE hotel_id = h.hotel_id) as total_rooms,
                   (SELECT MIN(price_per_night) FROM rooms WHERE hotel_id = h.hotel_id) as min_price
            FROM hotels h
            LEFT JOIN cities c ON h.city_id = c.city_id
            LEFT JOIN hotel_owners o ON h.owner_id = o.owner_id
            WHERE 1=1
        `;
        const params = [];
        if (search) {
            sql += ` AND (h.name LIKE ? OR o.owner_name LIKE ? OR CAST(h.hotel_id AS CHAR) LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        sql += ` ORDER BY h.hotel_id DESC`;
        const rows = await queryAsync(sql, params);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Lấy danh sách Chủ sở hữu
app.get('/api/admin/owners-manager', async (req, res) => {
    try {
        const sql = `
            SELECT o.*, u.username, COUNT(h.hotel_id) as total_hotels,
                   GROUP_CONCAT(h.name SEPARATOR ', ') as hotel_names
            FROM hotel_owners o
            LEFT JOIN hotels h ON o.owner_id = h.owner_id
            LEFT JOIN users u ON o.user_id = u.user_id
            GROUP BY o.owner_id ORDER BY o.owner_id DESC`;
        const rows = await queryAsync(sql);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. 📧 TẠO OWNER MỚI (Tự động sinh User & Gửi Mail)
app.post('/api/admin/owners-create-account', async (req, res) => {
    const { owner_name, owner_email, owner_phone } = req.body;

    if (!owner_name) return res.status(400).json({ message: "Thiếu tên chủ sở hữu!" });

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ error: "Lỗi kết nối DB" });

        try {
            // B1: Tạo hồ sơ Owner trước để lấy ID
            const ownerRes = await queryAsync(
                "INSERT INTO hotel_owners (owner_name, owner_email, owner_phone) VALUES (?, ?, ?)",
                [owner_name, owner_email, owner_phone]
            );
            const newOwnerId = ownerRes.insertId;

            // B2: Sinh Username & Hash Password
            // Username = tên viết liền không dấu + ID (vd: hongan31)
            const cleanName = owner_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase();
            const generatedUsername = `${cleanName}${newOwnerId}`;
            const defaultPass = "123456"; // Mật khẩu mặc định
            const hashedPassword = await bcrypt.hash(defaultPass, 10);

            // B3: Tạo tài khoản User (role='owner', must_change_password=1)
            const userRes = await queryAsync(
                "INSERT INTO users (full_name, email, username, password, phone, role, must_change_password) VALUES (?, ?, ?, ?, ?, 'owner', 1)",
                [owner_name, owner_email, generatedUsername, hashedPassword, owner_phone]
            );
            const newUserId = userRes.insertId;

            // B4: Update lại user_id cho Owner
            await queryAsync("UPDATE hotel_owners SET user_id = ? WHERE owner_id = ?", [newUserId, newOwnerId]);

            // B5: Gửi Email
if (owner_email) {
    const mailOptions = {
        from: '"CanTho Travel Admin" <no-reply@canthotravel.com>',
        to: owner_email,
        subject: '🔐 Thông tin tài khoản quản trị Khách sạn',
        html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    
                    <div style="background-color: #003580; padding: 30px 40px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">CANTHO TRAVEL</h1>
                        <p style="color: #e0e0e0; margin: 5px 0 0; font-size: 14px;">Hệ thống quản lý đối tác</p>
                    </div>

                    <div style="padding: 40px;">
                        <h2 style="color: #333333; margin-top: 0; font-size: 20px;">Xin chào, ${owner_name}!</h2>
                        <p style="color: #666666; line-height: 1.6; font-size: 15px;">
                            Chúc mừng bạn đã trở thành đối tác chính thức của CanTho Travel. Tài khoản quản trị của bạn đã được khởi tạo thành công.
                        </p>
                        <p style="color: #666666; line-height: 1.6; font-size: 15px;">
                            Dưới đây là thông tin đăng nhập dành riêng cho bạn:
                        </p>

                        <div style="background-color: #f8f9fa; border: 1px dashed #003580; border-radius: 6px; padding: 20px; margin: 25px 0; text-align: center;">
                            <div style="margin-bottom: 15px;">
                                <div style="font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 5px;">Tên đăng nhập</div>
                                <div style="font-size: 18px; font-weight: bold; color: #003580; letter-spacing: 0.5px;">${generatedUsername}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 5px;">Mật khẩu mặc định</div>
                                <div style="font-size: 22px; font-weight: bold; color: #d63384; font-family: monospace; letter-spacing: 2px;">${defaultPass}</div>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="http://localhost:3000/admin/login" style="background-color: #003580; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; box-shadow: 0 2px 5px rgba(0,53,128,0.3);">
                                Đăng nhập trang quản trị
                            </a>
                        </div>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #d63384; font-size: 13px; font-style: italic; margin: 0;">
                                ⚠️ <strong>Lưu ý quan trọng:</strong> Vì lý do bảo mật, hệ thống sẽ yêu cầu bạn đổi mật khẩu ngay trong lần đăng nhập đầu tiên.
                            </p>
                        </div>
                    </div>

                    <div style="background-color: #f4f6f8; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                        <p style="margin: 0;">&copy; 2025 CanTho Travel. All rights reserved.</p>
                        <p style="margin: 5px 0 0;">Cần hỗ trợ? Liên hệ: <a href="mailto:support@canthotravel.com" style="color: #003580; text-decoration: none;">support@canthotravel.com</a></p>
                    </div>
                </div>
            </div>
        `
    };
                 await transporter.sendMail(mailOptions); // Bỏ comment dòng này khi chạy thật
                console.log(`[EMAIL MOCK] To: ${owner_email} | User: ${generatedUsername} | Pass: ${defaultPass}`);
            }

            db.commit(() => {
                res.json({ success: true, message: `Đã tạo tài khoản: ${generatedUsername}` });
            });

        } catch (error) {
            console.error("Lỗi tạo owner:", error);
            db.rollback(() => {
                if (error.code === 'ER_DUP_ENTRY') {
                    res.status(400).json({ message: "Email hoặc SĐT đã tồn tại trên hệ thống!" });
                } else {
                    res.status(500).json({ message: "Lỗi hệ thống.", details: error.message });
                }
            });
        }
    });
});

// 4. Cập nhật thông tin Owner (Chỉ sửa thông tin hiển thị)
app.put('/api/admin/owners/:id', async (req, res) => {
    const { owner_name, owner_email, owner_phone } = req.body;
    try {
        await queryAsync(
            `UPDATE hotel_owners SET owner_name=?, owner_email=?, owner_phone=? WHERE owner_id=?`,
            [owner_name, owner_email, owner_phone, req.params.id]
        );
        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Xóa Owner
app.delete('/api/admin/owners/:id', async (req, res) => {
    try {
        const check = await queryAsync(`SELECT COUNT(*) as count FROM hotels WHERE owner_id = ?`, [req.params.id]);
        if (check[0].count > 0) return res.status(400).json({ message: "Không thể xóa! Chủ này đang sở hữu khách sạn." });
        
        // Lấy user_id để xóa luôn tài khoản đăng nhập
        const owner = await queryAsync(`SELECT user_id FROM hotel_owners WHERE owner_id = ?`, [req.params.id]);
        if(owner.length > 0 && owner[0].user_id) {
            await queryAsync(`DELETE FROM users WHERE user_id = ?`, [owner[0].user_id]);
        }
        
        await queryAsync(`DELETE FROM hotel_owners WHERE owner_id = ?`, [req.params.id]);
        res.json({ success: true, message: "Đã xóa chủ sở hữu và tài khoản liên quan." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Lấy chi tiết khách sạn (Cho modal)
// 6. Lấy chi tiết khách sạn (Cho modal Admin) - ĐÃ SỬA LỖI JSON
app.get('/api/admin/hotels/:id/full-details', async (req, res) => {
    const hotelId = req.params.id;
    try {
        // 1. Lấy thông tin khách sạn (đã bao gồm cột amenities JSON trong h.*)
        const hotelSql = `
            SELECT h.*, c.name as city_name, o.owner_name, o.owner_phone, o.owner_email, o.avatar_url as owner_avatar
            FROM hotels h
            LEFT JOIN cities c ON h.city_id = c.city_id
            LEFT JOIN hotel_owners o ON h.owner_id = o.owner_id
            WHERE h.hotel_id = ?`;
        
        const hotelRows = await queryAsync(hotelSql, [hotelId]);
        if (!hotelRows.length) return res.status(404).json({ message: "Not found" });

        const hotelData = hotelRows[0];

        // 2. Tính phòng trống hôm nay
        const roomsSql = `
            SELECT r.*,
            (SELECT COUNT(*) FROM hotel_booking_details hbd 
             JOIN bookings b ON hbd.booking_id = b.booking_id 
             WHERE hbd.room_id = r.room_id 
             AND b.status_id IN (1, 2) 
             AND (CURDATE() >= hbd.check_in_date AND CURDATE() < hbd.check_out_date)
            ) as booked_count
            FROM rooms r WHERE r.hotel_id = ?`;
        const rooms = await queryAsync(roomsSql, [hotelId]);

        // 3. XỬ LÝ AMENITIES (QUAN TRỌNG: Parse từ JSON, không query bảng cũ)
        let amenitiesList = [];
        try {
            amenitiesList = hotelData.amenities ? JSON.parse(hotelData.amenities) : [];
        } catch (e) {
            amenitiesList = [];
        }

        // Format lại cho khớp với cấu trúc cũ mà Frontend Admin có thể đang chờ (mảng object)
        // Nếu Frontend của bạn chỉ cần mảng string thì để nguyên amenitiesList
        const formattedAmenities = amenitiesList.map(item => ({ amenity_name: item }));

        res.json({ 
            ...hotelData, 
            rooms, 
            amenities: formattedAmenities // Trả về dạng [{ amenity_name: "Wifi" }, ...]
        });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});


// ============================================================
// 📂 API QUẢN LÝ DANH MỤC TOUR (CATEGORIES)
// ============================================================

// 1. API GET: Lấy danh sách loại tour (Hiển thị lên Tabs)
app.get('/api/admin/tour-categories', async (req, res) => {
    try {
        const rows = await queryAsync("SELECT * FROM tour_categories ORDER BY category_id ASC");
        res.json(rows);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi lấy danh mục" }); 
    }
});

// 2. API POST: Thêm loại tour mới (Nút +)
app.post('/api/admin/tour-categories', async (req, res) => {
    const { name, description } = req.body;
    
    if (!name) return res.status(400).json({ message: "Tên loại tour không được để trống" });

    try {
        await queryAsync(
            "INSERT INTO tour_categories (name, description) VALUES (?, ?)",
            [name, description || '']
        );
        res.json({ success: true, message: "Thêm phân loại thành công!" });
    } catch (e) { 
        console.error("Lỗi thêm category:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// 3. API DELETE: Xóa Phân Loại Tour
app.delete('/api/admin/tour-categories/:id', async (req, res) => {
    try {
        // B1: Kiểm tra xem có tour nào đang dùng loại này không
        const check = await queryAsync(
            "SELECT COUNT(*) as count FROM tours WHERE category_id = ?", 
            [req.params.id]
        );

        if (check[0].count > 0) {
            return res.status(400).json({ 
                message: `Không thể xóa! Đang có ${check[0].count} tour thuộc loại này.` 
            });
        }

        // B2: Nếu không có tour nào dùng -> Xóa
        await queryAsync("DELETE FROM tour_categories WHERE category_id = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa phân loại thành công!" });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

/// ============================================================
// 🗺️ API CRUD QUẢN LÝ TOUR (ĐÃ CẬP NHẬT FULL JSON)
// ============================================================

// 1. Lấy danh sách Tour (Kèm parse JSON để Admin hiển thị)
app.get('/api/admin/tours', async (req, res) => {
    const { search } = req.query;
    try {
        let sql = `
            SELECT t.*, c.name as category_name, c.category_id as cat_id_ref 
            FROM tours t 
            LEFT JOIN tour_categories c ON t.category_id = c.category_id 
            WHERE 1=1
        `;
        let params = [];
        
        if(search) {
            sql += " AND (t.name LIKE ? OR t.start_location LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }
        
        sql += " ORDER BY t.tour_id DESC";
        
        const rows = await queryAsync(sql, params);

        // Parse JSON các cột dữ liệu lớn để Frontend dễ dùng
        const tours = rows.map(tour => {
            try {
                return {
                    ...tour,
                    includes: tour.includes ? JSON.parse(tour.includes) : [],
                    excludes: tour.excludes ? JSON.parse(tour.excludes) : [],
                    highlights: tour.highlights ? JSON.parse(tour.highlights) : [],
                    itinerary: tour.itinerary ? JSON.parse(tour.itinerary) : [],
                    gallery: tour.gallery ? JSON.parse(tour.gallery) : []
                };
            } catch (e) {
                console.error(`Lỗi parse JSON tour ID ${tour.tour_id}:`, e);
                return tour;
            }
        });

        res.json(tours);
    } catch(e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi lấy danh sách tour" }); 
    }
});

// 2. Thêm Tour Mới (Lưu các cột JSON)
app.post('/api/admin/tours', async (req, res) => {
    const { 
        name, price, start_location, end_location, 
        duration_hours, start_time, end_time, 
        description, schedule, image, category_id,
        // Các trường mảng mới từ Frontend
        includes, excludes, highlights, itinerary, gallery 
    } = req.body;

    try {
        // Chuyển mảng thành chuỗi JSON
        const includesJson = JSON.stringify(includes || []);
        const excludesJson = JSON.stringify(excludes || []);
        const highlightsJson = JSON.stringify(highlights || []);
        const itineraryJson = JSON.stringify(itinerary || []);
        const galleryJson = JSON.stringify(gallery || []);

        await queryAsync(
            `INSERT INTO tours 
            (name, price, start_location, end_location, duration_hours, start_time, end_time, description, schedule, image, category_id, 
             includes, excludes, highlights, itinerary, gallery) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, price, start_location, end_location, duration_hours, start_time, end_time, description, schedule, image, category_id,
                includesJson, excludesJson, highlightsJson, itineraryJson, galleryJson
            ]
        );
        res.json({ success: true, message: "Thêm tour thành công!" });
    } catch(e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi thêm tour: " + e.message }); 
    }
});

// 3. Cập nhật Tour (Update các cột JSON)
app.put('/api/admin/tours/:id', async (req, res) => {
    const { 
        name, price, start_location, end_location, 
        duration_hours, start_time, end_time, 
        description, schedule, image, category_id,
        // Các trường mảng mới
        includes, excludes, highlights, itinerary, gallery
    } = req.body;

    try {
        // Chuyển mảng thành chuỗi JSON
        const includesJson = JSON.stringify(includes || []);
        const excludesJson = JSON.stringify(excludes || []);
        const highlightsJson = JSON.stringify(highlights || []);
        const itineraryJson = JSON.stringify(itinerary || []);
        const galleryJson = JSON.stringify(gallery || []);

        await queryAsync(
            `UPDATE tours SET 
                name=?, price=?, start_location=?, end_location=?, 
                duration_hours=?, start_time=?, end_time=?, 
                description=?, schedule=?, image=?, category_id=?,
                includes=?, excludes=?, highlights=?, itinerary=?, gallery=?
            WHERE tour_id=?`,
            [
                name, price, start_location, end_location, duration_hours, start_time, end_time, description, schedule, image, category_id,
                includesJson, excludesJson, highlightsJson, itineraryJson, galleryJson,
                req.params.id
            ]
        );
        res.json({ success: true, message: "Cập nhật tour thành công!" });
    } catch(e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi cập nhật tour: " + e.message }); 
    }
});

// 4. Xóa Tour (Giữ nguyên, chỉ cần xóa ở bảng cha là xong)
app.delete('/api/admin/tours/:id', async (req, res) => {
    try {
        // Kiểm tra xem tour có đơn đặt không
        const check = await queryAsync(
            "SELECT COUNT(*) as c FROM bookings WHERE item_id = ? AND booking_type='tour'", 
            [req.params.id]
        );
        
        if (check[0].c > 0) {
            return res.status(400).json({ message: "Không thể xóa! Tour này đang có đơn đặt hàng." });
        }

        await queryAsync("DELETE FROM tours WHERE tour_id = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa tour thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// 🎫 API QUẢN LÝ ĐƠN ĐẶT TOUR (BOOKINGS)
// ============================================================
// ============================================================
// 1. LẤY DANH SÁCH ĐƠN TOUR (KÈM FULL THÔNG TIN HOÀN TIỀN)
// ============================================================
app.get('/api/admin/tour-bookings', async (req, res) => {
    const { status, search } = req.query;
    try {
        let sql = `
            SELECT 
                b.*, 
                t.name as service_name, 
                t.image as service_image,
                t.start_time, t.end_time, 
                t.start_location, t.end_location, 
                t.duration_hours,
                b.item_id as tour_id, 
                bs.status_name,
                u.email as customer_email_real,
                
                -- 🔥 LẤY ĐẦY ĐỦ THÔNG TIN TỪ BẢNG REFUND_REQUESTS
                rr.request_id,
                rr.status as refund_status,
                rr.refund_amount,
                rr.bank_name,
                rr.account_number,
                rr.account_holder_name,
                rr.reason as refund_reason,
                rr.admin_note
                
            FROM bookings b
            JOIN tours t ON b.item_id = t.tour_id
            LEFT JOIN booking_status bs ON b.status_id = bs.status_id
            LEFT JOIN users u ON b.user_id = u.user_id
            -- Join với bảng hoàn tiền để lấy dữ liệu
            LEFT JOIN refund_requests rr ON b.booking_id = rr.booking_id
            WHERE b.booking_type = 'tour'
        `;
        
        const params = [];
        if (status && status !== 'all') {
            sql += ` AND b.status_id = ?`;
            params.push(status);
        }
        if (search) {
            sql += ` AND (b.booking_id LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ? OR t.name LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }

        sql += ` ORDER BY CASE WHEN DATE(b.start_date) = CURDATE() THEN 0 ELSE 1 END ASC, b.created_at DESC`;
        
        const rows = await queryAsync(sql, params);
        res.json(rows);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi lấy danh sách đơn tour" }); 
    }
});

// 2. Sửa Đơn Tour & Gửi Mail Thông Báo
app.put('/api/admin/tour-bookings/:id', async (req, res) => {
    const bookingId = req.params.id;
    const { start_date, guests_count, total_price, note, status_id } = req.body;

    try {
        // Cập nhật Database
        await queryAsync(
            `UPDATE bookings SET start_date=?, guests_count=?, total_price=?, note=?, status_id=?, updated_at=NOW() WHERE booking_id=?`,
            [start_date, guests_count, total_price, note, status_id, bookingId]
        );

        // Lấy lại thông tin để gửi mail
        const booking = (await queryAsync(`
            SELECT b.*, t.name as tour_name 
            FROM bookings b JOIN tours t ON b.item_id = t.tour_id 
            WHERE b.booking_id = ?`, [bookingId]))[0];

        // Gửi Email thông báo thay đổi
        if (booking && booking.customer_email) {
            const mailOptions = {
                from: '"CanTho Travel Support" <canthotravel91@gmail.com>', // Sửa email người gửi
                to: booking.customer_email,
                subject: `⚠️ CẬP NHẬT THÔNG TIN ĐƠN TOUR #${bookingId}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #e67e22; border-bottom: 2px solid #e67e22; padding-bottom: 10px;">THÔNG BÁO THAY ĐỔI ĐƠN HÀNG</h2>
                        <p>Xin chào <strong>${booking.customer_name}</strong>,</p>
                        <p>Thông tin đơn đặt tour <strong>#${bookingId}</strong> của bạn vừa được cập nhật bởi quản trị viên.</p>
                        
                        <div style="background: #fff8e1; padding: 15px; border-radius: 5px; border-left: 4px solid #e67e22; margin: 15px 0;">
                            <h4 style="margin-top: 0; color: #d35400;">Chi tiết cập nhật:</h4>
                            <p><strong>Tour:</strong> ${booking.tour_name}</p>
                            <p><strong>Ngày khởi hành mới:</strong> ${new Date(start_date).toLocaleDateString('vi-VN')}</p>
                            <p><strong>Số lượng khách:</strong> ${guests_count} người</p>
                            <p><strong>Tổng tiền:</strong> ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total_price)}</p>
                            <p><strong>Ghi chú từ Admin:</strong> ${note || 'Cập nhật theo yêu cầu khách hàng'}</p>
                        </div>
                        
                        <p>Nếu có thắc mắc, vui lòng liên hệ hotline <strong>1900 1234</strong>.</p>
                        <hr style="border: 0; border-top: 1px solid #eee;">
                        <small style="color: #777;">Cảm ơn bạn đã sử dụng dịch vụ của CanTho Travel.</small>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`📧 Đã gửi mail cập nhật tới: ${booking.customer_email}`);
        }

        res.json({ success: true, message: "Đã cập nhật đơn hàng và gửi email thông báo!" });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi cập nhật: " + e.message }); 
    }
});
// ============================================================
// 💸 API XỬ LÝ HOÀN TIỀN (BẢN KHÔNG CẦN CỘT ADMIN_NOTE)
// ============================================================
app.put('/api/admin/process-refund', async (req, res) => {
    const { request_id, booking_id, status, admin_note, customer_email } = req.body;
    
    console.log("🔄 ADMIN đang xử lý hoàn tiền:", { request_id, booking_id, status });

    // Sử dụng Transaction để đảm bảo an toàn dữ liệu tiền nong
    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ error: "Lỗi kết nối Transaction" });

        try {
            // --- BƯỚC 1: KIỂM TRA TRẠNG THÁI HIỆN TẠI CỦA ĐƠN HÀNG ---
            // Lấy status_id để check xem đã hoàn chưa
            // Lấy booking_type để biết là Tour hay Hotel (phục vụ log hoặc mail)
            const [booking] = await queryAsync(
                "SELECT status_id, booking_type, user_id, total_price, customer_name FROM bookings WHERE booking_id = ? FOR UPDATE", 
                [booking_id]
            );

            if (!booking) {
                return db.rollback(() => res.status(404).json({ message: "Không tìm thấy đơn hàng gốc!" }));
            }

            // 🔥 CHẶN LOGIC: Nếu đơn đã là trạng thái 6 (Đã hoàn tiền) thì dừng lại ngay
            // Điều này chặn trường hợp Owner vừa hoàn xong thì Admin lại bấm hoàn tiếp
            if (booking.status_id === 6) {
                return db.rollback(() => res.status(400).json({ 
                    message: "Giao dịch thất bại! Đơn hàng này ĐÃ ĐƯỢC HOÀN TIỀN trước đó (bởi Owner hoặc Admin khác)." 
                }));
            }

            // --- BƯỚC 2: CẬP NHẬT/TẠO YÊU CẦU HOÀN TIỀN (REFUND REQUESTS) ---
            if (request_id && request_id !== 'null' && request_id !== 0) {
                // TRƯỜNG HỢP A: Đã có yêu cầu từ User -> UPDATE
                await queryAsync(
                    `UPDATE refund_requests SET status = ? WHERE request_id = ?`,
                    [status, request_id]
                );
            } else {
                // TRƯỜNG HỢP B: Admin chủ động hoàn (chưa có request) -> INSERT MỚI
                // Code này chạy cho cả Tour và Hotel vì bảng bookings chứa đủ info
                await queryAsync(
                    `INSERT INTO refund_requests 
                    (booking_id, user_id, account_holder_name, bank_name, account_number, reason, refund_amount, status, created_at)
                    VALUES (?, ?, ?, 'Tiền mặt/Chuyển khoản (Admin)', '---', ?, ?, ?, NOW())`,
                    [
                        booking_id, 
                        booking.user_id, 
                        booking.customer_name, 
                        'Admin hoàn tiền chủ động', 
                        booking.total_price, 
                        status
                    ]
                );
            }

            // --- BƯỚC 3: CẬP NHẬT TRẠNG THÁI BOOKING (QUAN TRỌNG NHẤT) ---
            // Chỉ cập nhật Booking gốc khi trạng thái là 'processed' (Đã duyệt chi)
            if (status === 'processed') {
                await queryAsync(
                    `UPDATE bookings 
                     SET status_id = 6, 
                         refunded_by = 'admin', 
                         refunded_at = NOW() 
                     WHERE booking_id = ?`, 
                    [booking_id]
                );
            }

            // --- BƯỚC 4: COMMIT TRANSACTION ---
            db.commit(async (commitErr) => {
                if (commitErr) {
                    return db.rollback(() => res.status(500).json({ error: "Lỗi Commit Transaction" }));
                }

                // --- BƯỚC 5: GỬI EMAIL THÔNG BÁO ---
                if (customer_email) {
                    // Tùy biến tiêu đề dựa theo loại dịch vụ (Hotel/Tour)
                    const serviceType = booking.booking_type === 'tour' ? 'Tour du lịch' : 'Khách sạn';
                    
                    // --- KHAI BÁO CÁC BIẾN CÒN THIẾU TẠI ĐÂY ---
                    let subject, message, themeColor, iconUrl;

                    if (status === 'processed') {
                        // Trường hợp chấp nhận hoàn tiền
                        subject = `✅ [CanTho Travel] THÔNG BÁO: ĐÃ HOÀN TIỀN ĐƠN HÀNG #${booking_id}`;
                        message = `Hệ thống xác nhận đã hoàn tiền thành công cho đơn <strong>${serviceType}</strong> mã #${booking_id}.`;
                        themeColor = '#28a745'; // Màu xanh lá
                        iconUrl = 'https://cdn-icons-png.flaticon.com/512/190/190411.png'; // Icon Check xanh
                    } else {
                        // Trường hợp từ chối
                        subject = `❌ [CanTho Travel] THÔNG BÁO: TỪ CHỐI HOÀN TIỀN ĐƠN #${booking_id}`;
                        message = `Yêu cầu hoàn tiền cho đơn <strong>${serviceType}</strong> mã #${booking_id} không được chấp nhận.`;
                        themeColor = '#dc3545'; // Màu đỏ
                        iconUrl = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png'; // Icon X đỏ
                    }

                    const mailOptions = {
                        from: '"CanTho Travel Finance" <canthotravel91@gmail.com>',
                        to: customer_email,
                        subject: subject,
                        html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 40px 0;">
                                        
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e0e0e0;">
                                            
                                            <tr>
                                                <td bgcolor="#003580" style="padding: 30px 40px; text-align: center;">
                                                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">CANTHO TRAVEL</h1>
                                                    <p style="margin: 5px 0 0; color: #b3c7e6; font-size: 13px; text-transform: uppercase;">Bộ phận Tài chính & Kế toán</p>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td style="padding: 40px;">
                                                    <div style="text-align: center; margin-bottom: 25px;">
                                                        <img src="${iconUrl}" alt="Status" width="50" style="display: block; margin: 0 auto 15px;">
                                                        <h2 style="color: ${themeColor}; margin: 0; font-size: 20px; text-transform: uppercase;">${subject}</h2>
                                                    </div>

                                                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin-bottom: 25px; text-align: justify;">
                                                        ${message}
                                                    </p>

                                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px;">
                                                        <tr>
                                                            <td style="padding: 12px 20px; border-bottom: 1px dashed #d1d5db; color: #6c757d; font-size: 14px; width: 40%;">Loại dịch vụ:</td>
                                                            <td style="padding: 12px 20px; border-bottom: 1px dashed #d1d5db; color: #333333; font-weight: 600; font-size: 14px; text-align: right;">
                                                                ${serviceType.toUpperCase()}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 12px 20px; border-bottom: 1px dashed #d1d5db; color: #6c757d; font-size: 14px;">Số tiền xử lý:</td>
                                                            <td style="padding: 12px 20px; border-bottom: 1px dashed #d1d5db; color: ${themeColor}; font-weight: 700; font-size: 16px; text-align: right;">
                                                                ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.total_price)}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 12px 20px; color: #6c757d; font-size: 14px; vertical-align: top;">Ghi chú từ Admin:</td>
                                                            <td style="padding: 12px 20px; color: #333333; font-style: italic; font-size: 14px; text-align: right;">
                                                                "${admin_note || 'Không có ghi chú'}"
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <p style="margin-top: 30px; font-size: 13px; color: #888; text-align: center; line-height: 1.5;">
                                                        Mọi thắc mắc về giao dịch này, vui lòng liên hệ hotline <strong>1900 1234</strong> hoặc phản hồi email này để được hỗ trợ.
                                                    </p>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td bgcolor="#f1f3f5" style="padding: 15px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0;">
                                                    <p style="margin: 0;">© 2025 CanTho Travel Finance Team.</p>
                                                    <p style="margin: 5px 0;">Đây là email tự động, vui lòng không trả lời nếu không cần hỗ trợ.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </body>
                        </html>
                        `
                    };
                    
                    await transporter.sendMail(mailOptions).catch(e => console.error("Lỗi gửi mail refund:", e));
                
                }

                res.json({ success: true, message: "Đã xử lý hoàn tiền thành công!" });
            });

        } catch (e) { 
            console.error("❌ Lỗi xử lý hoàn tiền:", e);
            db.rollback(() => res.status(500).json({ error: "Lỗi Server: " + e.message })); 
        }
    });
});
/// ============================================================
// 🍽️ API QUẢN LÝ NHÀ HÀNG (SỬ DỤNG CỘT JSON)
// ============================================================

// 1. Lấy danh sách Nhà hàng (Kèm đánh giá trung bình)
app.get('/api/admin/restaurants', async (req, res) => {
    const { search } = req.query;
    try {
        let sql = `
            SELECT r.restaurant_id, r.name, r.address, r.image, r.price_range, r.city_id,
            (SELECT AVG(rating) FROM reviews rv WHERE rv.item_id = r.restaurant_id AND rv.review_type='restaurant') as avg_rating,
            (SELECT COUNT(*) FROM reviews rv WHERE rv.item_id = r.restaurant_id AND rv.review_type='restaurant') as total_reviews
            FROM restaurants r WHERE 1=1
        `;
        const params = [];
        if (search) {
            sql += " AND (r.name LIKE ? OR r.address LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }
        sql += " ORDER BY r.restaurant_id DESC";
        
        const results = await queryAsync(sql, params);
        res.json(results);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi lấy danh sách nhà hàng" }); 
    }
});

// 2. Lấy CHI TIẾT Nhà hàng (Parse JSON trả về Frontend)
app.get('/api/admin/restaurants/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Lấy thông tin chính (bao gồm các cột JSON)
        const rows = await queryAsync("SELECT * FROM restaurants WHERE restaurant_id = ?", [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy nhà hàng" });

        const restaurant = rows[0];

        // Parse JSON các trường dữ liệu lớn
        try {
            restaurant.features = restaurant.features ? JSON.parse(restaurant.features) : [];
            restaurant.menu = restaurant.menu ? JSON.parse(restaurant.menu) : [];
            restaurant.opening_hours = restaurant.opening_hours ? JSON.parse(restaurant.opening_hours) : [];
            restaurant.gallery = restaurant.gallery ? JSON.parse(restaurant.gallery) : [];
        } catch (err) {
            console.error("JSON Parse Error:", err);
            // Fallback về mảng rỗng nếu lỗi parse
            restaurant.features = [];
            restaurant.menu = [];
            restaurant.opening_hours = [];
            restaurant.gallery = [];
        }

        res.json(restaurant);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

// 3. Thêm Nhà hàng (Lưu JSON vào DB)
app.post('/api/admin/restaurants', async (req, res) => {
    const { 
        name, address, description, image, price_range, city_id, 
        latitude, longitude, features, opening_hours, menu, gallery 
    } = req.body;
    
    try {
        // Chuyển đổi mảng/object sang chuỗi JSON để lưu vào MySQL
        const featuresJson = JSON.stringify(features || []);
        const hoursJson = JSON.stringify(opening_hours || []); // Lưu ý: Frontend gửi key là opening_hours hoặc hours
        const menuJson = JSON.stringify(menu || []);
        const galleryJson = JSON.stringify(gallery || []);

        await queryAsync(
            `INSERT INTO restaurants 
            (name, address, description, image, price_range, city_id, latitude, longitude, features, opening_hours, menu, gallery) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, address, description, image, price_range, city_id || 1, 
                latitude, longitude, featuresJson, hoursJson, menuJson, galleryJson
            ]
        );

        res.json({ success: true, message: "Thêm nhà hàng thành công!" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

// 4. Cập nhật Nhà hàng (Update JSON trực tiếp)
app.put('/api/admin/restaurants/:id', async (req, res) => {
    const id = req.params.id;
    const { 
        name, address, description, image, price_range, city_id, 
        latitude, longitude, features, opening_hours, menu, gallery 
    } = req.body;

    try {
        // Chuyển đổi sang JSON
        const featuresJson = JSON.stringify(features || []);
        const hoursJson = JSON.stringify(opening_hours || []);
        const menuJson = JSON.stringify(menu || []);
        const galleryJson = JSON.stringify(gallery || []);

        await queryAsync(
            `UPDATE restaurants SET 
                name=?, address=?, description=?, image=?, price_range=?, city_id=?, 
                latitude=?, longitude=?, features=?, opening_hours=?, menu=?, gallery=? 
             WHERE restaurant_id=?`,
            [
                name, address, description, image, price_range, city_id, 
                latitude, longitude, featuresJson, hoursJson, menuJson, galleryJson, id
            ]
        );

        res.json({ success: true, message: "Cập nhật thông tin thành công!" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

// 5. Xóa Nhà hàng
app.delete('/api/admin/restaurants/:id', async (req, res) => {
    try {
        // Kiểm tra ràng buộc đơn đặt bàn
        const check = await queryAsync("SELECT COUNT(*) as c FROM restaurant_bookings WHERE restaurant_id=?", [req.params.id]);
        if(check[0].c > 0) return res.status(400).json({ message: "Không thể xóa! Nhà hàng đang có đơn đặt." });
        
        // Chỉ cần xóa dòng trong bảng restaurants (Dữ liệu features, menu... nằm trong row này nên sẽ mất theo)
        await queryAsync("DELETE FROM restaurants WHERE restaurant_id=?", [req.params.id]);
        
        res.json({ success: true, message: "Đã xóa nhà hàng thành công!" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});
// ============================================================
// 📅 API LẤY DANH SÁCH ĐƠN ĐẶT BÀN (LOGIC SẮP XẾP CHUẨN)
// ============================================================
app.get('/api/admin/restaurant-bookings', async (req, res) => {
    const { status, search } = req.query;
    try {
        let sql = `
            SELECT 
                rb.id, 
                rb.customer_name, 
                rb.phone, 
                rb.email, 
                rb.booking_time, 
                rb.guest_count, 
                rb.status, 
                rb.note, 
                rb.created_at,
                r.name as restaurant_name, 
                r.image as restaurant_image, 
                r.address as restaurant_address
            FROM restaurant_bookings rb
            LEFT JOIN restaurants r ON rb.restaurant_id = r.restaurant_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status && status !== 'all') { 
            sql += " AND rb.status = ?"; 
            params.push(status); 
        }
        
        if (search) { 
            sql += " AND (rb.id LIKE ? OR rb.customer_name LIKE ? OR r.name LIKE ?)"; 
            const term = `%${search}%`;
            params.push(term, term, term); 
        }
        
        // 🔥 SỬA LOGIC ORDER BY TẠI ĐÂY:
        sql += ` ORDER BY 
            -- Nhóm 1: Hôm nay (0) -> Tương lai (1) -> Quá khứ (2)
            CASE 
                WHEN DATE(rb.booking_time) = CURDATE() THEN 0 
                WHEN DATE(rb.booking_time) > CURDATE() THEN 1 
                ELSE 2 
            END ASC,
            
            -- Trong nhóm Hôm nay & Tương lai: Sắp xếp giờ TĂNG DẦN (Gần nhất lên trước)
            CASE WHEN DATE(rb.booking_time) >= CURDATE() THEN rb.booking_time END ASC,
            
            -- Trong nhóm Quá khứ: Sắp xếp giờ GIẢM DẦN (Vừa mới qua lên trước, cũ quá xuống đáy)
            CASE WHEN DATE(rb.booking_time) < CURDATE() THEN rb.booking_time END DESC
        `;
        
        const rows = await queryAsync(sql, params);
        res.json(rows);

    } catch (e) { 
        console.error("Lỗi lấy đơn nhà hàng:", e);
        res.status(500).json({ error: e.message }); 
    }
});
// ============================================================
// 📧 API SỬA/HỦY ĐƠN & GỬI MAIL (RESTAURANT)
// ============================================================
app.put('/api/admin/restaurant-bookings/:id', async (req, res) => {
    const bookingId = req.params.id;
    // booking_time: 'YYYY-MM-DD HH:mm:ss'
    const { booking_time, guest_count, note, status } = req.body;
    
    try {
        // 1. Cập nhật dữ liệu vào SQL
        await queryAsync(
            `UPDATE restaurant_bookings 
             SET booking_time=?, guest_count=?, note=?, status=?, updated_at=NOW() 
             WHERE id=?`,
            [booking_time, guest_count, note, status, bookingId]
        );

        // 2. Lấy thông tin chi tiết để gửi mail
        const booking = (await queryAsync(
            `SELECT rb.*, r.name as restaurant_name 
             FROM restaurant_bookings rb 
             JOIN restaurants r ON rb.restaurant_id = r.restaurant_id 
             WHERE rb.id=?`, 
            [bookingId]
        ))[0];
        
        // 3. Gửi Email nếu có địa chỉ email
        if (booking && booking.email) {
            let subject = '';
            let titleColor = '#333';
            let messageIntro = '';

            // Tùy chỉnh nội dung mail theo trạng thái
            if (status === 'cancelled') {
                subject = `❌ THÔNG BÁO HỦY ĐƠN ĐẶT BÀN #${bookingId}`;
                titleColor = '#dc3545'; // Màu đỏ
                messageIntro = `Rất tiếc, đơn đặt bàn của bạn tại <strong>${booking.restaurant_name}</strong> đã bị hủy.`;
            } else if (status === 'confirmed') {
                subject = `✅ XÁC NHẬN ĐẶT BÀN THÀNH CÔNG #${bookingId}`;
                titleColor = '#198754'; // Màu xanh
                messageIntro = `Chúc mừng! Đơn đặt bàn tại <strong>${booking.restaurant_name}</strong> đã được xác nhận.`;
            } else {
                subject = `⚠️ CẬP NHẬT THÔNG TIN ĐƠN #${bookingId}`;
                titleColor = '#0d6efd'; // Màu xanh dương
                messageIntro = `Thông tin đơn đặt bàn tại <strong>${booking.restaurant_name}</strong> vừa được cập nhật.`;
            }

            const timeString = new Date(booking_time).toLocaleString('vi-VN', { hour12: false });

            const mailOptions = {
                from: '"CanTho Food Service" <canthotravel91@gmail.com>',
                to: booking.email,
                subject: subject,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: ${titleColor}; color: white; padding: 15px; text-align: center;">
                            <h2 style="margin: 0;">${subject}</h2>
                        </div>
                        <div style="padding: 20px;">
                            <p>Xin chào <strong>${booking.customer_name}</strong>,</p>
                            <p>${messageIntro}</p>
                            
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                <p style="margin: 5px 0;"><strong>🕒 Thời gian:</strong> ${timeString}</p>
                                <p style="margin: 5px 0;"><strong>👥 Số khách:</strong> ${guest_count}</p>
                                <p style="margin: 5px 0;"><strong>📝 Ghi chú từ Admin:</strong> ${note || 'Không có'}</p>
                            </div>

                            <p style="font-size: 13px; color: #6c757d;">Nếu có thắc mắc, vui lòng liên hệ hotline hỗ trợ.</p>
                        </div>
                        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px;">
                            CanTho Travel System
                        </div>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
        }

        res.json({ success: true, message: "Cập nhật đơn và gửi mail thành công!" });

    } catch (e) { 
        console.error("Lỗi cập nhật booking:", e);
        res.status(500).json({ error: e.message }); 
    }
});
// ============================================================
// 👥 API QUẢN LÝ NGƯỜI DÙNG (USER & OWNER)
// ============================================================

// 1. Lấy danh sách User (Lọc theo role)
app.get('/api/admin/users', async (req, res) => {
    const { role, search } = req.query;
    try {
        let sql = `SELECT * FROM users WHERE role != 'admin'`; // Không hiện Admin ở đây để tránh xóa nhầm
        const params = [];

        if (role && role !== 'all') {
            sql += " AND role = ?";
            params.push(role);
        }

        if (search) {
            sql += " AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        sql += " ORDER BY created_at DESC";
        res.json(await queryAsync(sql, params));
    } catch (e) { res.status(500).json(e); }
});

// 2. Thêm User mới
app.post('/api/admin/users', async (req, res) => {
    const { full_name, email, password, phone, role } = req.body;
    try {
        // Kiểm tra email trùng
        const check = await queryAsync("SELECT * FROM users WHERE email = ?", [email]);
        if (check.length > 0) return res.status(400).json({ message: "Email này đã tồn tại!" });

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        await queryAsync(
            `INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
            [full_name, email, hashedPassword, phone, role]
        );
        res.json({ success: true, message: "Thêm người dùng thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Sửa User (Nếu không nhập pass thì giữ nguyên)
app.put('/api/admin/users/:id', async (req, res) => {
    const { full_name, email, phone, role, password } = req.body;
    try {
        let sql = "UPDATE users SET full_name=?, email=?, phone=?, role=?";
        let params = [full_name, email, phone, role];

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql += ", password=?";
            params.push(hashedPassword);
        }

        sql += " WHERE user_id=?";
        params.push(req.params.id);

        await queryAsync(sql, params);
        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Xóa User
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        // Có thể thêm kiểm tra ràng buộc (ví dụ: Owner đang có khách sạn thì ko cho xóa)
        await queryAsync("DELETE FROM users WHERE user_id = ?", [req.params.id]);
        res.json({ success: true, message: "Đã xóa người dùng!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// ============================================================
// ⭐ API QUẢN LÝ ĐÁNH GIÁ (REVIEWS)
// ============================================================

// 1. Lấy danh sách đánh giá (Có phân trang, lọc theo sao, loại dịch vụ)
app.get('/api/admin/reviews', async (req, res) => {
    const { page = 1, limit = 10, type, rating, search } = req.query;
    const offset = (page - 1) * limit;

    try {
        let sql = `
            SELECT 
                r.review_id, r.user_id, r.rating, r.comment, r.created_at, r.review_type,
                u.full_name as user_name, u.email as user_email, u.profile_img as user_avatar,
                
                -- Lấy tên dịch vụ dựa trên loại
                CASE 
                    WHEN r.review_type = 'hotel' THEN h.name
                    WHEN r.review_type = 'tour' THEN t.name
                    WHEN r.review_type = 'restaurant' THEN res.name
                    ELSE 'Dịch vụ không xác định'
                END as service_name,

                -- Lấy ảnh dịch vụ
                CASE 
                    WHEN r.review_type = 'hotel' THEN h.image_url
                    WHEN r.review_type = 'tour' THEN t.image
                    WHEN r.review_type = 'restaurant' THEN res.image
                    ELSE ''
                END as service_image

            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.user_id
            LEFT JOIN hotels h ON (r.item_id = h.hotel_id AND r.review_type = 'hotel')
            LEFT JOIN tours t ON (r.item_id = t.tour_id AND r.review_type = 'tour')
            LEFT JOIN restaurants res ON (r.item_id = res.restaurant_id AND r.review_type = 'restaurant')
            WHERE 1=1
        `;

        const params = [];

        // --- BỘ LỌC ---
        if (type && type !== 'all') {
            sql += ` AND r.review_type = ?`;
            params.push(type);
        }

        if (rating && rating !== 'all') {
            // Lọc chính xác số sao (ví dụ: lấy tất cả 5 sao)
            sql += ` AND ROUND(r.rating) = ?`;
            params.push(rating);
        }

        if (search) {
            sql += ` AND (u.full_name LIKE ? OR r.comment LIKE ? OR 
                      (r.review_type='hotel' AND h.name LIKE ?) OR 
                      (r.review_type='tour' AND t.name LIKE ?) OR 
                      (r.review_type='restaurant' AND res.name LIKE ?))`;
            const term = `%${search}%`;
            params.push(term, term, term, term, term);
        }

        // Đếm tổng số lượng để phân trang
        const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_tbl`;
        // Lưu ý: Ta cần chạy query count trước khi thêm ORDER BY/LIMIT vào sql chính
        // Tuy nhiên, để đơn giản và tránh lỗi params khi dùng mysql driver cũ, 
        // ta sẽ query count riêng biệt hoặc chấp nhận query 2 lần. 
        // Ở đây mình dùng cách đơn giản: thực thi câu SQL đếm trước.
        const countRes = await queryAsync(countSql, params);
        const total = countRes[0]?.total || 0;

        // Thêm sắp xếp và phân trang
        sql += ` ORDER BY r.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const reviews = await queryAsync(sql, params);

        res.json({
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                total_pages: Math.ceil(total / limit)
            }
        });

    } catch (e) {
        console.error("Lỗi lấy danh sách đánh giá:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Xóa đánh giá (Dành cho Admin khi thấy comment vi phạm)
app.delete('/api/admin/reviews/:id', async (req, res) => {
    const reviewId = req.params.id;
    try {
        await queryAsync("DELETE FROM reviews WHERE review_id = ?", [reviewId]);
        res.json({ success: true, message: "Đã xóa đánh giá thành công!" });
    } catch (e) {
        console.error("Lỗi xóa đánh giá:", e);
        res.status(500).json({ error: "Lỗi Server" });
    }
});
// 3. Phản hồi đánh giá (Reply Review)
app.put('/api/admin/reviews/:id/reply', async (req, res) => {
    const reviewId = req.params.id;
    const { reply } = req.body;

    if (!reply) return res.status(400).json({ message: "Nội dung phản hồi không được để trống" });

    try {
        await queryAsync(
            "UPDATE reviews SET admin_reply = ?, admin_reply_at = NOW() WHERE review_id = ?", 
            [reply, reviewId]
        );
        res.json({ success: true, message: "Đã gửi phản hồi thành công!" });
    } catch (e) {
        console.error("Lỗi reply review:", e);
        res.status(500).json({ error: "Lỗi Server" });
    }
});
// ============================================================
// 📞 API HỖ TRỢ & LIÊN HỆ (CONTACT SUPPORT - PRO VERSION)
// ============================================================

// 1. API Lấy danh sách đơn hàng rút gọn (Có kèm loại đơn)
app.get('/api/users/:id/bookings-simple', async (req, res) => {
    const userId = req.params.id;
    try {
        // Query hợp nhất 3 bảng để lấy danh sách đơn gọn nhẹ
        const sql = `
            (SELECT booking_id, 'hotel' as type, total_price, created_at, 'Đặt phòng khách sạn' as title 
             FROM bookings WHERE user_id = ? AND booking_type = 'hotel')
            UNION ALL
            (SELECT booking_id, 'tour' as type, total_price, created_at, 'Đặt Tour du lịch' as title 
             FROM bookings WHERE user_id = ? AND booking_type = 'tour')
            UNION ALL
            (SELECT id as booking_id, 'restaurant' as type, 0 as total_price, created_at, 'Đặt bàn nhà hàng' as title 
             FROM restaurant_bookings WHERE user_id = ?)
            ORDER BY created_at DESC LIMIT 15
        `;
        const rows = await queryAsync(sql, [userId, userId, userId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.json([]);
    }
});

// 2. API Gửi Liên Hệ & Lưu Database & Auto-Reply
app.post('/api/contact', async (req, res) => {
    // booking_id nhận từ frontend sẽ có dạng "hotel-10", "tour-5" v.v...
    const { name, email, phone, topic, booking_id, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: "Vui lòng nhập đủ thông tin." });
    }

    // --- Xử lý tách booking_id và booking_type ---
    let finalBookingId = null;
    let finalBookingType = null;

    if (booking_id && typeof booking_id === 'string' && booking_id.includes('-')) {
        const parts = booking_id.split('-'); // VD: "hotel-12" -> ["hotel", "12"]
        if (parts.length === 2) {
            finalBookingType = parts[0];
            finalBookingId = parts[1];
        }
    } else if (booking_id) {
        // Trường hợp frontend gửi ID số nguyên (code cũ)
        finalBookingId = booking_id;
    }

    try {
        // 1. Tìm user_id (nếu khách dùng email đã đăng ký)
        let userId = null;
        const users = await queryAsync("SELECT user_id FROM users WHERE email = ?", [email]);
        if (users.length > 0) userId = users[0].user_id;

        // 2. Lưu vào Database
        const sqlInsert = `
            INSERT INTO support_tickets 
            (user_id, booking_id, booking_type, customer_name, customer_email, customer_phone, topic, message, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `;

        const result = await queryAsync(sqlInsert, [
            userId, 
            finalBookingId, 
            finalBookingType,
            name, 
            email, 
            phone || null, 
            topic, 
            message
        ]);

        const newTicketId = result.insertId;
        const ticketCode = `TK-${newTicketId}`;

        // 3. Gửi Email Auto-reply
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: 'canthotravel91@gmail.com', pass: 'rcpb plqa refa grod' } // Check lại pass ứng dụng
        });

        // Nội dung hiển thị trong mail (có thêm loại đơn)
        let bookingInfoHtml = '';
        if (finalBookingId) {
            const typeName = finalBookingType === 'hotel' ? 'Khách sạn' : (finalBookingType === 'restaurant' ? 'Nhà hàng' : 'Tour');
            bookingInfoHtml = `<li style="margin-bottom: 5px;"><strong>Đơn hàng liên quan:</strong> #${finalBookingId} (${typeName})</li>`;
        }

        const mailOptions = {
            from: '"CanTho Travel Support" <no-reply@canthotravel.com>',
            to: email,
            subject: `[Đã tiếp nhận] Yêu cầu hỗ trợ #${ticketCode}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #003580; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0;">YÊU CẦU ĐANG ĐƯỢC XỬ LÝ</h2>
                        <p style="margin: 5px 0 0;">Mã phiếu: <strong>#${ticketCode}</strong></p>
                    </div>
                    <div style="padding: 25px; background-color: #ffffff;">
                        <p>Xin chào <strong>${name}</strong>,</p>
                        <p>Chúng tôi đã nhận được yêu cầu của bạn. Đội ngũ hỗ trợ sẽ kiểm tra và phản hồi sớm nhất.</p>
                        
                        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #003580; margin: 20px 0;">
                            <h4 style="margin-top: 0; color: #333;">Thông tin yêu cầu:</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; color: #555;">
                                <li style="margin-bottom: 5px;"><strong>Chủ đề:</strong> ${topic}</li>
                                ${bookingInfoHtml}
                                <li><strong>Nội dung:</strong> "${message}"</li>
                            </ul>
                        </div>

                        <p>Thời gian phản hồi dự kiến: <strong>24 giờ làm việc</strong>.</p>
                    </div>
                    <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                        CanTho Travel Support System
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Gửi yêu cầu thành công!", ticket_code: ticketCode });

    } catch (error) {
        console.error("Lỗi tạo ticket:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống." });
    }
});
// ============================================================
// 🆘 API ADMIN: QUẢN LÝ HỖ TRỢ & GỬI PHẢN HỒI
// ============================================================

// 1. Lấy danh sách phiếu hỗ trợ (Tickets)
app.get('/api/admin/support-tickets', async (req, res) => {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let sql = `SELECT * FROM support_tickets WHERE 1=1`;
        const params = [];

        if (status && status !== 'all') {
            sql += ` AND status = ?`;
            params.push(status);
        }

        if (search) {
            sql += ` AND (customer_name LIKE ? OR customer_email LIKE ? OR ticket_id LIKE ?)`;
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        // Đếm tổng
        const countRes = await queryAsync(`SELECT COUNT(*) as total FROM (${sql}) as t`, params);
        const total = countRes[0].total;

        // Lấy dữ liệu
        sql += ` ORDER BY FIELD(status, 'pending', 'processing', 'resolved', 'closed'), created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const rows = await queryAsync(sql, params);

        res.json({
            data: rows,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, total_pages: Math.ceil(total / limit) }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// 2. Admin trả lời & Gửi mail cho khách
app.put('/api/admin/support-tickets/:id/reply', async (req, res) => {
    const ticketId = req.params.id;
    const { response, status } = req.body; 

    console.log("Đang xử lý reply cho ticket:", ticketId); // Log để debug

    if (!response) return res.status(400).json({ message: "Nội dung phản hồi không được trống." });

    try {
        // 1. Lấy thông tin ticket cũ
        const ticketRows = await queryAsync("SELECT * FROM support_tickets WHERE ticket_id = ?", [ticketId]);
        if (ticketRows.length === 0) return res.status(404).json({ message: "Không tìm thấy phiếu hỗ trợ." });
        
        const ticket = ticketRows[0];

        // 2. Cập nhật Database (Bỏ updated_at nếu bảng chưa có)
        // Nếu bạn chắc chắn có cột updated_at thì giữ nguyên, nếu không thì dùng dòng dưới:
        await queryAsync(
            `UPDATE support_tickets SET admin_response = ?, status = ? WHERE ticket_id = ?`,
            [response, status || 'resolved', ticketId]
        );

        // 3. Gửi Email (Bọc trong try-catch riêng để không làm lỗi API nếu mail fail)
        try {
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: 'canthotravel91@gmail.com', pass: 'rcpb plqa refa grod' }
            });

            const mailOptions = {
    from: '"CanTho Travel Support" <no-reply@canthotravel.com>',
    to: ticket.customer_email,
    subject: `[Phản hồi] Về yêu cầu hỗ trợ #${ticketId} - ${ticket.topic}`,
    html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e0e0e0;">
                
                <div style="background-color: #003580; padding: 30px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">PHẢN HỒI HỖ TRỢ</h1>
                    <p style="color: #e0e0e0; margin: 10px 0 0; font-size: 14px;">Mã phiếu: <strong>#${ticketId}</strong></p>
                </div>

                <div style="padding: 40px;">
                    <p style="font-size: 16px; color: #333; margin-top: 0;">Xin chào <strong>${ticket.customer_name}</strong>,</p>
                    
                    <p style="font-size: 15px; color: #555; line-height: 1.6;">
                        Cảm ơn bạn đã liên hệ với bộ phận CSKH của CanTho Travel. Về vấn đề <strong>"${ticket.topic}"</strong> của bạn, chúng tôi xin phản hồi như sau:
                    </p>
                    
                    <div style="background-color: #f0f7ff; border-left: 4px solid #003580; padding: 20px; margin: 25px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #003580; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">Nội dung trả lời:</p>
                        <div style="color: #333; font-size: 15px; line-height: 1.6; white-space: pre-line;">${response}</div>
                    </div>

                    <p style="font-size: 15px; color: #555; line-height: 1.6;">
                        Hy vọng câu trả lời này giải quyết được vấn đề của bạn. Nếu cần hỗ trợ thêm, vui lòng phản hồi lại email này hoặc liên hệ hotline.
                    </p>
                    
                    <div style="margin-top: 30px;">
                        <p style="font-size: 15px; color: #333; font-weight: bold; margin-bottom: 0;">Trân trọng,</p>
                        <p style="font-size: 15px; color: #555; margin-top: 5px;">Đội ngũ Hỗ trợ CanTho Travel</p>
                    </div>
                </div>

                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; color: #888; font-size: 13px;">© 2025 CanTho Travel. All rights reserved.</p>
                    <p style="margin: 5px 0 0; color: #888; font-size: 13px;">
                        Ninh Kiều, Cần Thơ | Hotline: <strong style="color: #003580;">1900 1234</strong>
                    </p>
                </div>
            </div>
        </div>
    `
};
            

            await transporter.sendMail(mailOptions);
            console.log(`✅ Mail sent to ${ticket.customer_email}`);
        } catch (mailError) {
            console.error("⚠️ Lỗi gửi mail (nhưng vẫn update DB):", mailError.message);
            // Không return lỗi ở đây để báo thành công cho Admin
        }

        res.json({ success: true, message: "Đã gửi phản hồi thành công!" });

    } catch (e) {
        console.error("❌ Lỗi API Reply:", e); // Xem lỗi chi tiết ở terminal
        res.status(500).json({ error: e.message });
    }
});// ============================================================
// 📊 API BÁO CÁO: LẤY TOÀN BỘ ĐƠN HÀNG ĐỂ XUẤT PDF (KHÔNG LIMIT)
// ============================================================
app.get('/api/admin/report/bookings', async (req, res) => {
    const { range } = req.query; // 'today', 'week', 'month', 'year'
    
    let condition = "1=1";
    
    switch (range) {
        case 'today': condition = "DATE(b.created_at) = CURDATE()"; break;
        case 'week':  condition = "YEARWEEK(b.created_at, 1) = YEARWEEK(CURDATE(), 1)"; break;
        case 'month': condition = "MONTH(b.created_at) = MONTH(CURDATE()) AND YEAR(b.created_at) = YEAR(CURDATE())"; break;
        case 'year':  condition = "YEAR(b.created_at) = YEAR(CURDATE())"; break;
        default: condition = "b.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"; // Mặc định tuần
    }

    try {
        const sql = `
            SELECT 
                b.booking_id, 
                b.customer_name, 
                b.total_price, 
                b.status_id,
                bs.status_name,
                DATE_FORMAT(b.created_at, '%d/%m/%Y %H:%i') as created_at_fmt,
                COALESCE(h.name, t.name, 'Dịch vụ khác') as service_name
            FROM bookings b
            LEFT JOIN booking_status bs ON b.status_id = bs.status_id
            LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
            LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
            WHERE ${condition}
            ORDER BY b.created_at DESC
        `;
        
        const rows = await queryAsync(sql);
        res.json(rows);
    } catch (e) {
        console.error("Lỗi Report API:", e);
        res.status(500).json({ error: "Lỗi lấy dữ liệu báo cáo" });
    }
});
app.post('/api/owner/login', (req, res) => {
    const { username, password } = req.body;
    
    // Log xem client gửi gì lên
    console.log("👉 [LOGIN DEBUG] Request từ client:", { username, password });

    // Lưu ý: Bạn kiểm tra lại tên bảng là 'users' hay 'owners' nhé (theo ảnh cũ là owners)
    const sql = "SELECT * FROM users WHERE username = ? AND role = 'owner'";
    
    db.query(sql, [username], async (err, users) => {
        if (err) {
            console.error("❌ Lỗi SQL:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
        
        if (users.length === 0) {
            console.log("👉 [LOGIN DEBUG] Không tìm thấy user hoặc sai role owner");
            return res.status(401).json({ message: "Tài khoản không tồn tại hoặc không phải Owner" });
        }

        const user = users[0];
        
        // So sánh mật khẩu
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            console.log("👉 [LOGIN DEBUG] Kết quả so sánh bcrypt:", isMatch); 
            
            if (!isMatch) {
                return res.status(401).json({ message: "Sai mật khẩu!" });
            }

            // --- PHẦN SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY ---
            
            // Kiểm tra trực tiếp: Nếu mật khẩu người dùng nhập vào là "123456"
            // thì biến requireChange sẽ là true
            const isDefaultPass = (password === '123456');

            console.log("👉 [LOGIN DEBUG] Có phải mật khẩu mặc định không?:", isDefaultPass);

            // Trả về kết quả chung, frontend sẽ dựa vào require_change_pass để điều hướng
            return res.json({ 
                success: true, 
                require_change_pass: isDefaultPass, // True nếu pass là 123456
                user_id: user.user_id, 
                username: user.username, 
                full_name: user.full_name, 
                token: "fake-jwt" 
            });
            // ----------------------------------------

        } catch (bcryptErr) {
            console.error("❌ Lỗi bcrypt compare:", bcryptErr);
            return res.status(500).json({ message: "Lỗi mã hóa server" });
        }
    });
});
app.post('/api/auth/change-password-force', async (req, res) => {
    
    console.log("👉 [DEBUG] Nhận yêu cầu đổi pass từ Frontend:", req.body);

    // Lấy username và mật khẩu mới từ client gửi lên
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
        console.log("❌ Thiếu thông tin (username hoặc password)!");
        return res.status(400).json({ message: "Thiếu thông tin gửi lên server" });
    }

    try {
        // 1. Mã hóa mật khẩu mới
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 2. Cập nhật vào Database (Lưu ý tên bảng là 'users')
        const sql = "UPDATE users SET password = ? WHERE username = ?";
        
        db.query(sql, [hashedPassword, username], (err, result) => {
            if (err) {
                console.error("❌ Lỗi SQL:", err);
                return res.status(500).json({ message: "Lỗi server khi cập nhật SQL" });
            }

            // Kiểm tra xem có dòng nào được update không
            if (result.affectedRows === 0) {
                 console.log("⚠️ Không tìm thấy user có username là:", username);
                 return res.status(404).json({ message: "Không tìm thấy user này trong hệ thống" });
            }

            console.log("✅ Đã đổi mật khẩu thành công cho:", username);
            res.json({ success: true, message: "Đổi mật khẩu thành công!" });
        });

    } catch (error) {
        console.error("❌ Lỗi hệ thống:", error);
        res.status(500).json({ message: "Lỗi xử lý server" });
    }
});

// --- API QUẢN LÝ COUPON (MÃ GIẢM GIÁ) ---

// 1. GET: Lấy danh sách tất cả coupon
app.get("/api/coupons", (req, res) => {
    // Sắp xếp ID giảm dần để mã mới nhất lên đầu
    const q = "SELECT * FROM coupons ORDER BY coupon_id DESC";
    
    db.query(q, (err, data) => {
        if (err) {
            console.error("Lỗi lấy danh sách coupon:", err);
            return res.status(500).json("Lỗi Server");
        }
        return res.status(200).json(data);
    });
});

// 2. POST: Thêm mới coupon
app.post("/api/coupons", (req, res) => {
    // 1. Validate cơ bản ở backend
    if (!req.body.code || !req.body.expiry_date) {
        return res.status(400).json("Vui lòng nhập Mã coupon và Ngày hết hạn!");
    }

    const q = `
        INSERT INTO coupons 
        (code, description, discount_amount, discount_percent, min_order_value, service_type, start_date, expiry_date, image_url, usage_limit, used_count, max_usage_per_user, is_event) 
        VALUES (?)
    `;

    const values = [
        req.body.code.toUpperCase(), // Tự động viết hoa mã coupon
        req.body.description,
        req.body.discount_amount || 0,
        req.body.discount_percent || 0,
        req.body.min_order_value || 0,
        req.body.service_type || 'ALL',
        req.body.start_date || null, // Nếu rỗng thì lưu là NULL tránh lỗi DB
        req.body.expiry_date,
        req.body.image_url || '',
        req.body.usage_limit || 100,
        0, // used_count khởi tạo là 0
        req.body.max_usage_per_user || 1,
        req.body.is_event ? 1 : 0
    ];

    db.query(q, [values], (err, data) => {
        if (err) {
            // Bắt lỗi trùng Mã Code (nếu trong DB cột code có set UNIQUE)
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json("Mã giảm giá này đã tồn tại!");
            }
            console.error(err);
            return res.status(500).json(err);
        }
        return res.status(200).json("Thêm mã giảm giá thành công!");
    });
});

// 3. PUT: Cập nhật coupon theo ID
app.put("/api/coupons/:id", (req, res) => {
    const couponId = req.params.id;
    
    const q = `
        UPDATE coupons 
        SET code = ?, description = ?, discount_amount = ?, discount_percent = ?, 
            min_order_value = ?, service_type = ?, start_date = ?, expiry_date = ?, 
            image_url = ?, usage_limit = ?, max_usage_per_user = ?, is_event = ?
        WHERE coupon_id = ?
    `;

    const values = [
        req.body.code.toUpperCase(),
        req.body.description,
        req.body.discount_amount || 0,
        req.body.discount_percent || 0,
        req.body.min_order_value || 0,
        req.body.service_type,
        req.body.start_date || null,
        req.body.expiry_date,
        req.body.image_url || '',
        req.body.usage_limit,
        req.body.max_usage_per_user,
        req.body.is_event ? 1 : 0,
        couponId
    ];

    db.query(q, values, (err, data) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json("Mã giảm giá này đã trùng với mã khác!");
            }
            return res.status(500).json(err);
        }
        return res.status(200).json("Cập nhật mã giảm giá thành công!");
    });
});

// 4. DELETE: Xóa coupon
app.delete("/api/coupons/:id", (req, res) => {
    const couponId = req.params.id;
    const q = "DELETE FROM coupons WHERE coupon_id = ?";

    db.query(q, [couponId], (err, data) => {
        if (err) return res.status(500).json(err);
        return res.status(200).json("Đã xóa mã giảm giá!");
    });
});
// ============================================================
// 👑 API OWNER DASHBOARD (FINAL VERSION)
// ============================================================

// --- CẤU HÌNH GỬI MAIL (Thay đổi thông tin tại đây) ---
const MAIL_CONFIG = {
    user: 'canthotravel91@gmail.com',
    pass: 'rcpb plqa refa grod' // ⚠️ Lưu ý: Nên dùng biến môi trường process.env.EMAIL_PASS
};

// 🛡️ Middleware: Xác thực Owner & Lấy owner_id
// Đảm bảo DB bạn có bảng 'hotel_owners' (liên kết user_id -> owner_id)
const checkOwnerPermission = async (req, res, next) => {
    const userId = req.headers['user-id'] || req.query.user_id;
    if (!userId) return res.status(401).json({ error: "Unauthorized: Thiếu User ID" });
    
    try {
        const sql = `SELECT owner_id FROM hotel_owners WHERE user_id = ?`;
        const result = await queryAsync(sql, [userId]);
        
        if (result.length === 0) {
            return res.status(403).json({ error: "Forbidden: Tài khoản này không phải là Owner" });
        }

        req.owner_id = result[0].owner_id;
        next();
    } catch (e) {
        return res.status(500).json({ error: "Lỗi xác thực Owner: " + e.message });
    }
};

// ------------------------------------------------------------
// 🏨 1. Lấy danh sách Khách sạn (SỬA LẠI: Lấy FULL thông tin để hiển thị form sửa)
// ------------------------------------------------------------
app.get('/api/owner/hotels', checkOwnerPermission, async (req, res) => {
    try {
        // ⚠️ CŨ: SELECT hotel_id, name, address, image_url, star_rating ... (Thiếu description, policy...)
        
        // ✅ MỚI: Dùng SELECT * để lấy đủ Description, Policy, Amenities, Time...
        const sql = `
            SELECT * FROM hotels 
            WHERE owner_id = ? 
            ORDER BY hotel_id DESC
        `;

        const hotels = await queryAsync(sql, [req.owner_id]);
        res.json(hotels);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// 2. 📅 Lấy danh sách Booking (Đã thêm GROUP BY để chống trùng)
// ------------------------------------------------------------
/// ------------------------------------------------------------
// 2. 📅 Lấy danh sách Booking (Đã thêm JOIN refund_requests để lấy thông tin ngân hàng)
// ------------------------------------------------------------
app.get('/api/owner/bookings', checkOwnerPermission, async (req, res) => {
    const { hotel_id, status, limit } = req.query;

    try {
        let sql = `
            SELECT 
                b.booking_id, b.customer_name, b.customer_phone, b.customer_email,
                b.total_price, b.status_id, b.created_at, b.note,
                
                -- Thông tin hoàn tiền (Admin/Owner)
                b.refunded_by,
                b.refunded_at,

                -- 🔥 [MỚI] Lấy thông tin từ bảng refund_requests (nếu có)
                rr.bank_name,
                rr.account_number,
                rr.account_holder_name,
                rr.reason as refund_reason, -- Lấy lý do khách nhập (nếu có)
                rr.refund_amount as requested_amount,

                CASE 
                    WHEN b.status_id = 1 THEN 'Chờ xác nhận'
                    WHEN b.status_id = 2 THEN 'Đã xác nhận' 
                    WHEN b.status_id = 3 THEN 'Đã thanh toán'
                    WHEN b.status_id = 4 THEN 'Đã hoàn thành'
                    WHEN b.status_id = 5 THEN 'Đã hủy'
                    WHEN b.status_id = 6 THEN 'Đã hoàn tiền'
                    ELSE 'Khác'
                END as status_text,

                h.name as hotel_name,
                r.room_type_name,
                hbd.assigned_room_number,
                hbd.check_in_date,
                hbd.check_out_date,
                hbd.guests_count,
                DATEDIFF(hbd.check_out_date, hbd.check_in_date) as nights
            FROM bookings b
            JOIN hotels h ON b.item_id = h.hotel_id
            JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
            LEFT JOIN rooms r ON hbd.room_id = r.room_id
            
            -- 🔥 [MỚI] JOIN BẢNG REFUND REQUESTS
            LEFT JOIN refund_requests rr ON b.booking_id = rr.booking_id

            WHERE h.owner_id = ? 
            AND b.booking_type = 'hotel'
        `;

        const params = [req.owner_id];

        if (hotel_id && hotel_id !== 'null' && hotel_id !== '') { 
            sql += ` AND h.hotel_id = ?`; 
            params.push(hotel_id); 
        }

        if (status && status !== 'ALL') { 
            sql += ` AND b.status_id = ?`; 
            params.push(status); 
        }

        sql += ` GROUP BY b.booking_id `; 
        sql += ` ORDER BY b.created_at DESC`;

        if (limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(limit));
        }

        const bookings = await queryAsync(sql, params);
        res.json(bookings);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
// ------------------------------------------------------------
// 3. 🔑 Gán số phòng (Assign Room & Gửi Mail)
// ------------------------------------------------------------
app.put('/api/owner/bookings/:id/assign', checkOwnerPermission, async (req, res) => {
    const bookingId = req.params.id;
    const { room_number } = req.body;

    if (!room_number) return res.status(400).json({ error: "Vui lòng nhập số phòng" });

    try {
        // 3.1. Kiểm tra quyền sở hữu & trạng thái đơn
        const checkSql = `
            SELECT b.booking_id, b.status_id
            FROM bookings b
            JOIN hotels h ON b.item_id = h.hotel_id
            WHERE b.booking_id = ? AND h.owner_id = ?
        `;
        const checkOwner = await queryAsync(checkSql, [bookingId, req.owner_id]);
        
        if (checkOwner.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền quản lý đơn hàng này" });
        }
        
        // Chặn gán phòng nếu đơn đã hủy hoặc đã hoàn thành
        if (checkOwner[0].status_id === 3) return res.status(400).json({ error: "Đơn này ĐÃ HỦY, không thể gán phòng." });
        if (checkOwner[0].status_id === 4) return res.status(400).json({ error: "Đơn này ĐÃ HOÀN THÀNH, không thể chỉnh sửa." });

        // 3.2. Cập nhật số phòng vào bảng chi tiết
        await queryAsync(
            `UPDATE hotel_booking_details SET assigned_room_number = ? WHERE booking_id = ?`,
            [room_number, bookingId]
        );

        // 3.3. Cập nhật trạng thái Booking -> Confirmed (2) nếu đang là Pending (1)
        await queryAsync(
            `UPDATE bookings SET status_id = 2 WHERE booking_id = ? AND status_id = 1`,
            [bookingId]
        );

        // 3.4. Lấy thông tin chi tiết để gửi mail
        const sqlGetInfo = `
            SELECT 
                b.customer_email, b.customer_name, b.booking_id,
                DATE_FORMAT(hbd.check_in_date, '%d/%m/%Y') as check_in,
                DATE_FORMAT(hbd.check_out_date, '%d/%m/%Y') as check_out,
                h.name as hotel_name, h.address as hotel_address,
                r.room_type_name
            FROM bookings b
            JOIN hotels h ON b.item_id = h.hotel_id
            JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
            LEFT JOIN rooms r ON hbd.room_id = r.room_id
            WHERE b.booking_id = ?
        `;
        
        const rows = await queryAsync(sqlGetInfo, [bookingId]);
        
        if (rows.length > 0) {
            const info = rows[0];
            
            // Gửi email
            try {
                const mailContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <div style="background-color: #003580; padding: 20px; text-align: center; color: white;">
                            <h2 style="margin: 0;">XÁC NHẬN PHÒNG THÀNH CÔNG</h2>
                            <p>Mã đơn: <strong>#${bookingId}</strong></p>
                        </div>
                        <div style="padding: 25px; background-color: #fff;">
                            <p>Chào <strong>${info.customer_name}</strong>,</p>
                            <p>Khách sạn <strong>${info.hotel_name}</strong> đã xác nhận phòng của bạn.</p>
                            <div style="background-color: #f0fdf4; border: 1px dashed #16a34a; padding: 15px; margin: 20px 0; text-align: center;">
                                <p style="margin:0; color:#555">Số phòng của bạn:</p>
                                <h1 style="margin:10px 0; color:#166534; font-size:36px;">${room_number}</h1>
                                <p style="margin:0; font-weight:bold">${info.room_type_name}</p>
                            </div>
                            <p>📅 <strong>Check-in:</strong> ${info.check_in} — <strong>Check-out:</strong> ${info.check_out}</p>
                            <p>📍 <strong>Địa chỉ:</strong> ${info.hotel_address}</p>
                        </div>
                    </div>
                `;

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: MAIL_CONFIG.user, pass: MAIL_CONFIG.pass }
                });

                await transporter.sendMail({
                    from: '"CanTho Travel Support" <no-reply@canthotravel.com>',
                    to: info.customer_email,
                    subject: `✅ Xác nhận phòng ${room_number} - Đơn hàng #${bookingId}`,
                    html: mailContent
                });
                console.log("✅ Mail sent to:", info.customer_email);
            } catch (mailError) {
                console.error("Lỗi gửi mail:", mailError);
                // Không return lỗi ở đây để tránh crash flow API, chỉ log ra console
            }
        }
        
        res.json({ success: true, message: `Đã gán phòng ${room_number} thành công!` });
    } catch (e) {
        console.error("Lỗi assign phòng:", e);
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// 4. 🔄 Cập nhật trạng thái (Hủy / Check-out)
// ------------------------------------------------------------
app.put('/api/owner/bookings/:id/status', checkOwnerPermission, async (req, res) => {
    const bookingId = req.params.id;
    const { status_id } = req.body; 

    try {
        const checkSql = `
            SELECT b.booking_id 
            FROM bookings b
            JOIN hotels h ON b.item_id = h.hotel_id
            WHERE b.booking_id = ? AND h.owner_id = ?
        `;
        const checkOwner = await queryAsync(checkSql, [bookingId, req.owner_id]);
        
        if (checkOwner.length === 0) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await queryAsync(
            `UPDATE bookings SET status_id = ?, updated_at = NOW() WHERE booking_id = ?`, 
            [status_id, bookingId]
        );
        res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// 5. 📊 Thống kê Dashboard (ĐÃ SỬA LOGIC ĐẾM HỦY)
// ------------------------------------------------------------
app.get('/api/owner/stats', checkOwnerPermission, async (req, res) => {
    const { hotel_id } = req.query;

    try {
        let sql = `
            SELECT 
                COUNT(*) as total_bookings,
                -- Active: Đang ở hoặc Đã xác nhận (Status 2)
                SUM(CASE WHEN b.status_id = 2 THEN 1 ELSE 0 END) as active_bookings,
                
                -- Revenue: Chỉ tính khi Hoàn thành (Status 4) hoặc Đã thanh toán (Status 3) tùy bạn chọn
                -- Ở đây mình để Status 4 (Hoàn thành) mới tính doanh thu thực tế
                SUM(CASE WHEN b.status_id = 4 THEN b.total_price ELSE 0 END) as total_revenue,
                
                -- 🔴 SỬA LỖI TẠI ĐÂY: Đếm Status 5 mới là Hủy (Code cũ để là 3 nên bị sai)
                SUM(CASE WHEN b.status_id = 5 THEN 1 ELSE 0 END) as cancelled_bookings
            FROM bookings b
            JOIN hotels h ON b.item_id = h.hotel_id
            WHERE h.owner_id = ? 
            AND b.booking_type = 'hotel'
        `;
        
        const params = [req.owner_id];
        if (hotel_id) { sql += ` AND h.hotel_id = ?`; params.push(hotel_id); }

        const result = await queryAsync(sql, params);
        const stats = result[0];

        res.json({
            total_bookings: stats.total_bookings || 0,
            active_bookings: stats.active_bookings || 0,
            revenue: stats.total_revenue || 0,
            cancelled: stats.cancelled_bookings || 0
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// 6. ⭐ Quản lý Đánh giá (Reviews)
// ------------------------------------------------------------
app.get('/api/owner/reviews', checkOwnerPermission, async (req, res) => {
    try {
        const sql = `
            SELECT 
                rv.review_id, rv.rating, rv.comment, rv.title, rv.created_at, rv.response,
                u.full_name as customer_name, u.profile_img as customer_avatar,
                h.name as hotel_name
            FROM reviews rv
            JOIN hotels h ON rv.item_id = h.hotel_id
            JOIN users u ON rv.user_id = u.user_id
            WHERE h.owner_id = ? AND rv.review_type = 'hotel'
            ORDER BY rv.created_at DESC
        `;
        const reviews = await queryAsync(sql, [req.owner_id]);
        res.json(reviews);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/owner/reviews/:id/reply', checkOwnerPermission, async (req, res) => {
    const reviewId = req.params.id;
    const { response } = req.body;

    if (!response) return res.status(400).json({ error: "Nội dung trống" });

    try {
        const checkSql = `
            SELECT rv.review_id
            FROM reviews rv
            JOIN hotels h ON rv.item_id = h.hotel_id
            WHERE rv.review_id = ? AND h.owner_id = ?
        `;
        const checkResult = await queryAsync(checkSql, [reviewId, req.owner_id]);
        
        if (checkResult.length === 0) return res.status(403).json({ error: "Unauthorized" });

        await queryAsync(`UPDATE reviews SET response = ? WHERE review_id = ?`, [response, reviewId]);
        res.json({ success: true, message: "Đã trả lời đánh giá!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ------------------------------------------------------------
// 7. 📈 API Dữ liệu Biểu đồ (CẬP NHẬT THÊM LỌC THEO NGÀY)
// ------------------------------------------------------------
app.get('/api/owner/stats/chart', checkOwnerPermission, async (req, res) => {
    const { hotel_id, period } = req.query; // period: 'day', 'week', 'month', 'year'

    try {
        let groupByFormat = '%Y-%m-%d'; 
        let whereCondition = '';

        // Xử lý logic thời gian
        switch (period) {
            case 'day': // 🆕 MỚI: Lọc theo hôm nay
                // Lọc dữ liệu trong ngày hiện tại, gom nhóm theo Giờ (08:00, 09:00...)
                whereCondition = 'AND DATE(b.created_at) = CURDATE()'; 
                groupByFormat = '%H:00'; 
                break;
            case 'week':
                whereCondition = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                groupByFormat = '%d/%m'; // Ngày/Tháng
                break;
            case 'month':
                whereCondition = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                groupByFormat = '%d/%m';
                break;
            case 'year':
                whereCondition = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)';
                groupByFormat = 'Tháng %m'; 
                break;
            default: 
                whereCondition = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        }

        let sql = `
            SELECT 
                DATE_FORMAT(b.created_at, ?) as name, 
                SUM(b.total_price) as revenue,
                COUNT(b.booking_id) as bookings
            FROM bookings b
            JOIN hotels h ON b.item_id = h.hotel_id
            WHERE h.owner_id = ? 
            AND b.booking_type = 'hotel'
            AND b.status_id = 4 -- ⚠️ QUAN TRỌNG: Chỉ tính đơn HOÀN THÀNH
            ${whereCondition}
        `;

        const params = [groupByFormat, req.owner_id];

        if (hotel_id && hotel_id !== 'null' && hotel_id !== '') {
            sql += ` AND h.hotel_id = ?`;
            params.push(hotel_id);
        }

        sql += ` GROUP BY name ORDER BY b.created_at ASC`;

        const data = await queryAsync(sql, params);
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
// ============================================================
// 2. SỬA API HOÀN TIỀN OWNER (Nhận thông tin Ngân hàng & Update DB)
// ============================================================
app.put('/api/owner/bookings/:id/refund', checkOwnerPermission, async (req, res) => {
    const bookingId = req.params.id;
    const ownerId = req.owner_id;
    const actor = 'owner';
    
    // Nhận thêm dữ liệu từ Form Frontend
    const { refund_amount, reason, bank_name, account_number, account_holder_name } = req.body;

    console.log(`🔄 OWNER ${ownerId} hoàn tiền đơn #${bookingId}`);

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ error: "Transaction Error" });

        try {
            // 1. Kiểm tra & Khóa dòng
            const [booking] = await queryAsync(`
                SELECT b.*, h.owner_id, h.name as hotel_name
                FROM bookings b 
                JOIN hotels h ON b.item_id = h.hotel_id
                WHERE b.booking_id = ? AND h.owner_id = ?
                FOR UPDATE`, 
                [bookingId, ownerId]
            );

            if (!booking) return db.rollback(() => res.status(404).json({ error: "Không tìm thấy đơn." }));
            if (booking.status_id === 6) return db.rollback(() => res.status(400).json({ error: "Đơn này đã hoàn tiền rồi." }));
            
            // Chỉ hoàn tiền khi đơn ĐÃ HỦY (5) (Theo đúng quy trình bạn yêu cầu)
            if (booking.status_id !== 5) {
                return db.rollback(() => res.status(400).json({ error: "Phải hủy đơn trước khi hoàn tiền." }));
            }

            // 2. Cập nhật Status Booking -> 6
            await queryAsync(`
                UPDATE bookings 
                SET status_id = 6, refunded_by = ?, refunded_at = NOW() 
                WHERE booking_id = ?`, 
                [actor, bookingId]
            );

            // 3. Lưu/Cập nhật thông tin vào bảng refund_requests
            // Kiểm tra xem đã có record chưa (do user tạo khi hủy)
            const [existingReq] = await queryAsync("SELECT request_id FROM refund_requests WHERE booking_id = ?", [bookingId]);

            if (existingReq) {
                // Update nếu đã có
                await queryAsync(`
                    UPDATE refund_requests 
                    SET status = 'processed', refund_amount = ?, reason = ?, 
                        bank_name = ?, account_number = ?, account_holder_name = ?
                    WHERE booking_id = ?`,
                    [refund_amount, reason, bank_name, account_number, account_holder_name, bookingId]
                );
            } else {
                // Insert mới nếu chưa có
                await queryAsync(`
                    INSERT INTO refund_requests 
                    (booking_id, user_id, refund_amount, reason, bank_name, account_number, account_holder_name, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'processed', NOW())`,
                    [bookingId, booking.user_id, refund_amount, reason, bank_name, account_number, account_holder_name]
                );
            }

            // 4. Commit & Gửi Mail
            db.commit(async (commitErr) => {
                if (commitErr) return db.rollback(() => res.status(500).json({ error: "Commit Error" }));

                // Gửi mail (Giữ nguyên logic cũ)
                const mailOptions = {
    from: '"CanTho Travel Support" <canthotravel91@gmail.com>',
    to: booking.customer_email,
    subject: `✅ [Hoàn tiền thành công] Đơn hàng #${bookingId} - CanTho Travel`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận hoàn tiền</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        
                        <tr>
                            <td bgcolor="#0056b3" style="padding: 30px 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 1px;">CANTHO TRAVEL</h1>
                                <p style="margin: 10px 0 0; color: #e1f5fe; font-size: 14px;">Thông báo giao dịch hoàn tiền</p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 40px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Success" width="64" style="display: block; margin: 0 auto 15px;">
                                    <h2 style="color: #27ae60; margin: 0; font-size: 22px;">Xác Nhận Hoàn Tiền Thành Công</h2>
                                    <p style="color: #555555; margin-top: 10px; line-height: 1.5;">
                                        Yêu cầu hoàn tiền cho đơn hàng <strong>#${bookingId}</strong> của Quý khách đã được xử lý và chấp thuận.
                                    </p>
                                </div>

                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px;">
                                    <tr>
                                        <td style="padding: 12px 15px; border-bottom: 1px dashed #ced4da; color: #6c757d; font-size: 14px;">Số tiền hoàn lại:</td>
                                        <td style="padding: 12px 15px; border-bottom: 1px dashed #ced4da; color: #27ae60; font-weight: bold; font-size: 18px; text-align: right;">
                                            ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(refund_amount)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 15px; border-bottom: 1px dashed #ced4da; color: #6c757d; font-size: 14px;">Ngân hàng thụ hưởng:</td>
                                        <td style="padding: 12px 15px; border-bottom: 1px dashed #ced4da; color: #333; font-weight: 500; text-align: right;">
                                            ${bank_name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 15px; border-bottom: 1px dashed #ced4da; color: #6c757d; font-size: 14px;">Số tài khoản:</td>
                                        <td style="padding: 12px 15px; border-bottom: 1px dashed #ced4da; color: #333; font-weight: 500; text-align: right;">
                                            ${account_number}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 15px; color: #6c757d; font-size: 14px; vertical-align: top;">Lý do/Ghi chú:</td>
                                        <td style="padding: 12px 15px; color: #333; font-style: italic; text-align: right;">
                                            "${reason}"
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
                                    <em>*Lưu ý: Thời gian tiền nổi trong tài khoản phụ thuộc vào quy trình của từng ngân hàng, thường mất từ <strong>24h đến 48h</strong> làm việc (không tính T7, CN).</em>
                                </p>

                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="https://canthotravel.com" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">Truy cập Website</a>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td bgcolor="#f1f3f5" style="padding: 20px; text-align: center; color: #868e96; font-size: 12px;">
                                <p style="margin: 0;">© 2025 CanTho Travel. All rights reserved.</p>
                                <p style="margin: 5px 0;">Địa chỉ: Ninh Kiều, Cần Thơ | Hotline: 1900 1234</p>
                                <p style="margin: 5px 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
    </html>
    `
};
                await transporter.sendMail(mailOptions).catch(e => console.error(e));

                res.json({ success: true, message: "Hoàn tiền thành công!" });
            });

        } catch (e) {
            console.error(e);
            db.rollback(() => res.status(500).json({ error: e.message }));
        }
    });
});
// ============================================================
// 🏨 API QUẢN LÝ KHÁCH SẠN (DÀNH CHO OWNER)
// ============================================================

// 1. ➕ THÊM KHÁCH SẠN MỚI
app.post('/api/owner/hotels', checkOwnerPermission, async (req, res) => {
    // Lấy tất cả các trường dữ liệu từ bảng hotels
    const { 
        name, address, city_id, description, image_url, star_rating, 
        check_in_time, check_out_time, hotel_policy, latitude, longitude, amenities 
    } = req.body;

    if (!name || !address) {
        return res.status(400).json({ error: "Tên và địa chỉ là bắt buộc." });
    }

    try {
        // Chuyển mảng tiện nghi thành chuỗi JSON để lưu vào DB
        const amenitiesJson = JSON.stringify(amenities || []);

        const sql = `
            INSERT INTO hotels 
            (name, address, city_id, description, image_url, star_rating, owner_id, 
             check_in_time, check_out_time, hotel_policy, latitude, longitude, amenities)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            name, address, city_id || 1, description, image_url, star_rating || 3, req.owner_id,
            check_in_time || '14:00', check_out_time || '12:00', hotel_policy, latitude, longitude, amenitiesJson
        ];

        await queryAsync(sql, values);
        res.json({ success: true, message: "Thêm khách sạn thành công!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 2. ✏️ CẬP NHẬT KHÁCH SẠN
app.put('/api/owner/hotels/:id', checkOwnerPermission, async (req, res) => {
    const hotelId = req.params.id;
    const { 
        name, address, city_id, description, image_url, star_rating, 
        check_in_time, check_out_time, hotel_policy, latitude, longitude, amenities 
    } = req.body;

    try {
        // Kiểm tra quyền sở hữu trước khi sửa
        const check = await queryAsync("SELECT hotel_id FROM hotels WHERE hotel_id = ? AND owner_id = ?", [hotelId, req.owner_id]);
        if (check.length === 0) return res.status(403).json({ error: "Bạn không có quyền sửa khách sạn này." });

        const amenitiesJson = JSON.stringify(amenities || []);

        const sql = `
            UPDATE hotels SET 
                name=?, address=?, city_id=?, description=?, image_url=?, star_rating=?, 
                check_in_time=?, check_out_time=?, hotel_policy=?, latitude=?, longitude=?, amenities=?
            WHERE hotel_id=? AND owner_id=?
        `;

        const values = [
            name, address, city_id, description, image_url, star_rating,
            check_in_time, check_out_time, hotel_policy, latitude, longitude, amenitiesJson,
            hotelId, req.owner_id
        ];

        await queryAsync(sql, values);
        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 3. ❌ XÓA KHÁCH SẠN
app.delete('/api/owner/hotels/:id', checkOwnerPermission, async (req, res) => {
    const hotelId = req.params.id;

    try {
        // Kiểm tra quyền sở hữu
        const check = await queryAsync("SELECT hotel_id FROM hotels WHERE hotel_id = ? AND owner_id = ?", [hotelId, req.owner_id]);
        if (check.length === 0) return res.status(403).json({ error: "Bạn không có quyền xóa khách sạn này." });

        // Kiểm tra ràng buộc: Không cho xóa nếu đang có đơn đặt phòng
        const bookingsCheck = await queryAsync(
            "SELECT COUNT(*) as count FROM bookings WHERE item_id = ? AND booking_type='hotel'", 
            [hotelId]
        );
        if (bookingsCheck[0].count > 0) {
            return res.status(400).json({ error: "Không thể xóa khách sạn đang có đơn đặt phòng." });
        }

        // Xóa các phòng thuộc khách sạn trước (nếu DB không set ON DELETE CASCADE)
        await queryAsync("DELETE FROM rooms WHERE hotel_id = ?", [hotelId]);
        
        // Xóa khách sạn
        await queryAsync("DELETE FROM hotels WHERE hotel_id = ?", [hotelId]);

        res.json({ success: true, message: "Đã xóa khách sạn thành công." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});// ============================================================
// 🏨 API QUẢN LÝ KHÁCH SẠN (DÀNH CHO OWNER)
// ============================================================

// 1. ➕ THÊM KHÁCH SẠN MỚI
app.post('/api/owner/hotels', checkOwnerPermission, async (req, res) => {
    // Lấy tất cả các trường dữ liệu từ bảng hotels
    const { 
        name, address, city_id, description, image_url, star_rating, 
        check_in_time, check_out_time, hotel_policy, latitude, longitude, amenities 
    } = req.body;

    if (!name || !address) {
        return res.status(400).json({ error: "Tên và địa chỉ là bắt buộc." });
    }

    try {
        // Chuyển mảng tiện nghi thành chuỗi JSON để lưu vào DB
        const amenitiesJson = JSON.stringify(amenities || []);

        const sql = `
            INSERT INTO hotels 
            (name, address, city_id, description, image_url, star_rating, owner_id, 
             check_in_time, check_out_time, hotel_policy, latitude, longitude, amenities)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            name, address, city_id || 1, description, image_url, star_rating || 3, req.owner_id,
            check_in_time || '14:00', check_out_time || '12:00', hotel_policy, latitude, longitude, amenitiesJson
        ];

        await queryAsync(sql, values);
        res.json({ success: true, message: "Thêm khách sạn thành công!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 2. ✏️ CẬP NHẬT KHÁCH SẠN
app.put('/api/owner/hotels/:id', checkOwnerPermission, async (req, res) => {
    const hotelId = req.params.id;
    const { 
        name, address, city_id, description, image_url, star_rating, 
        check_in_time, check_out_time, hotel_policy, latitude, longitude, amenities 
    } = req.body;

    try {
        // Kiểm tra quyền sở hữu trước khi sửa
        const check = await queryAsync("SELECT hotel_id FROM hotels WHERE hotel_id = ? AND owner_id = ?", [hotelId, req.owner_id]);
        if (check.length === 0) return res.status(403).json({ error: "Bạn không có quyền sửa khách sạn này." });

        const amenitiesJson = JSON.stringify(amenities || []);

        const sql = `
            UPDATE hotels SET 
                name=?, address=?, city_id=?, description=?, image_url=?, star_rating=?, 
                check_in_time=?, check_out_time=?, hotel_policy=?, latitude=?, longitude=?, amenities=?
            WHERE hotel_id=? AND owner_id=?
        `;

        const values = [
            name, address, city_id, description, image_url, star_rating,
            check_in_time, check_out_time, hotel_policy, latitude, longitude, amenitiesJson,
            hotelId, req.owner_id
        ];

        await queryAsync(sql, values);
        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 3. ❌ XÓA KHÁCH SẠN
app.delete('/api/owner/hotels/:id', checkOwnerPermission, async (req, res) => {
    const hotelId = req.params.id;

    try {
        // Kiểm tra quyền sở hữu
        const check = await queryAsync("SELECT hotel_id FROM hotels WHERE hotel_id = ? AND owner_id = ?", [hotelId, req.owner_id]);
        if (check.length === 0) return res.status(403).json({ error: "Bạn không có quyền xóa khách sạn này." });

        // Kiểm tra ràng buộc: Không cho xóa nếu đang có đơn đặt phòng
        const bookingsCheck = await queryAsync(
            "SELECT COUNT(*) as count FROM bookings WHERE item_id = ? AND booking_type='hotel'", 
            [hotelId]
        );
        if (bookingsCheck[0].count > 0) {
            return res.status(400).json({ error: "Không thể xóa khách sạn đang có đơn đặt phòng." });
        }

        // Xóa các phòng thuộc khách sạn trước (nếu DB không set ON DELETE CASCADE)
        await queryAsync("DELETE FROM rooms WHERE hotel_id = ?", [hotelId]);
        
        // Xóa khách sạn
        await queryAsync("DELETE FROM hotels WHERE hotel_id = ?", [hotelId]);

        res.json({ success: true, message: "Đã xóa khách sạn thành công." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
// ============================================================
// 🏨 API: LẤY TÓM TẮT THÔNG TIN KHÁCH SẠN (Cho nút "Quản lý")
// ============================================================
app.get('/api/owner/hotels/:id/summary', checkOwnerPermission, async (req, res) => {
    const hotelId = req.params.id;
    const ownerId = req.owner_id;

    try {
        // 1. Verify ownership
        const hotelCheck = await queryAsync("SELECT hotel_id, name FROM hotels WHERE hotel_id = ? AND owner_id = ?", [hotelId, ownerId]);
        if (hotelCheck.length === 0) return res.status(403).json({ error: "Unauthorized" });

        // 2. Get Room Types & Availability (Logic: Total Inventory - Active Bookings Today)
        // Note: This is a simplified availability check for "Today". 
        const roomsSql = `
            SELECT 
                r.room_id, r.room_type_name, r.price_per_night, r.total_inventory,
                (
                    SELECT COUNT(*) 
                    FROM hotel_booking_details hbd 
                    JOIN bookings b ON hbd.booking_id = b.booking_id
                    WHERE hbd.room_id = r.room_id 
                    AND b.status_id IN (2, 3) -- Confirmed or Paid
                    AND CURDATE() BETWEEN hbd.check_in_date AND (hbd.check_out_date - INTERVAL 1 DAY)
                ) as booked_today
            FROM rooms r
            WHERE r.hotel_id = ?
        `;
        const rooms = await queryAsync(roomsSql, [hotelId]);

        // Calculate available count
        const roomSummary = rooms.map(r => ({
            ...r,
            available: Math.max(0, r.total_inventory - r.booked_today)
        }));

        // 3. Get Recent Bookings for this Hotel
        const bookingsSql = `
            SELECT b.booking_id, b.customer_name, b.total_price, b.status_id, 
                   hbd.check_in_date, hbd.check_out_date, r.room_type_name
            FROM bookings b
            JOIN hotel_booking_details hbd ON b.booking_id = hbd.booking_id
            LEFT JOIN rooms r ON hbd.room_id = r.room_id
            WHERE b.item_id = ? AND b.booking_type = 'hotel'
            ORDER BY b.created_at DESC
            LIMIT 5
        `;
        const recentBookings = await queryAsync(bookingsSql, [hotelId]);

        res.json({
            hotel: hotelCheck[0],
            rooms: roomSummary,
            bookings: recentBookings
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
// ============================================================
// 🛏️ API QUẢN LÝ PHÒNG (ROOMS)
// ============================================================

// 1. Lấy danh sách phòng theo Hotel ID
app.get('/api/owner/rooms', checkOwnerPermission, async (req, res) => {
    const { hotel_id } = req.query;
    try {
        const rooms = await queryAsync(`SELECT * FROM rooms WHERE hotel_id = ?`, [hotel_id]);
        res.json(rooms);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Thêm phòng mới
app.post('/api/owner/rooms', checkOwnerPermission, async (req, res) => {
    const { hotel_id, room_type_name, price_per_night, total_inventory, max_guests, size, bed_type, view_type, facilities, image_url } = req.body;
    try {
        const facilitiesJson = JSON.stringify(facilities || []);
        await queryAsync(
            `INSERT INTO rooms (hotel_id, room_type_name, price_per_night, total_inventory, max_guests, size, bed_type, view_type, facilities, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [hotel_id, room_type_name, price_per_night, total_inventory || 5, max_guests || 2, size || 20, bed_type, view_type, facilitiesJson, image_url]
        );
        res.json({ success: true, message: "Thêm phòng thành công!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Sửa phòng
app.put('/api/owner/rooms/:id', checkOwnerPermission, async (req, res) => {
    const roomId = req.params.id;
    const { room_type_name, price_per_night, total_inventory, max_guests, size, bed_type, view_type, facilities, image_url } = req.body;
    try {
        const facilitiesJson = JSON.stringify(facilities || []);
        await queryAsync(
            `UPDATE rooms SET room_type_name=?, price_per_night=?, total_inventory=?, max_guests=?, size=?, bed_type=?, view_type=?, facilities=?, image_url=? WHERE room_id=?`,
            [room_type_name, price_per_night, total_inventory, max_guests, size, bed_type, view_type, facilitiesJson, image_url, roomId]
        );
        res.json({ success: true, message: "Cập nhật phòng thành công!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Xóa phòng
app.delete('/api/owner/rooms/:id', checkOwnerPermission, async (req, res) => {
    const roomId = req.params.id;
    try {
        // Kiểm tra xem phòng có đang được book không trước khi xóa (Optional)
        await queryAsync(`DELETE FROM rooms WHERE room_id=?`, [roomId]);
        res.json({ success: true, message: "Đã xóa phòng!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// PUT /api/owner/profile
app.put('/api/owner/profile', async (req, res) => {
    const ownerId = req.headers['user-id']; // Lấy ID từ header (hoặc từ token)
    const { full_name, phone, address, password, new_password } = req.body;

    try {
        // 1. Cập nhật thông tin cơ bản
        let sql = `UPDATE users SET full_name = ?, phone_number = ?, address = ? WHERE user_id = ?`;
        let params = [full_name, phone, address, ownerId];

        // 2. Nếu có yêu cầu đổi mật khẩu (Logic đơn giản, thực tế nên dùng bcrypt để hash)
        if (new_password) {
            // Kiểm tra mật khẩu cũ (nếu cần bảo mật cao hơn)
            sql = `UPDATE users SET full_name = ?, phone_number = ?, address = ?, password = ? WHERE user_id = ?`;
            params = [full_name, phone, address, new_password, ownerId]; // Nhớ hash new_password trước khi lưu
        }

        await db.execute(sql, params);
        res.json({ success: true, message: 'Cập nhật hồ sơ thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật hồ sơ' });
    }
});
import chatbotRoute from './routes/chatbot.route.js';

app.use('/api', chatbotRoute);
// =============================================================
// API 1: LẤY DANH SÁCH ĐỊA ĐIỂM NỔI BẬT (Cho Trang Chủ)
// =============================================================
app.get('/api/destinations/featured', (req, res) => {
    // Lấy 4 địa điểm đầu tiên để hiển thị trang chủ
    const sql = "SELECT dest_id, name, image, location FROM destinations LIMIT 4";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Lỗi lấy danh sách địa điểm:", err);
            return res.status(500).json({ error: "Lỗi Server" });
        }
        res.json(results);
    });
});

// =============================================================
// API 2: LẤY CHI TIẾT MỘT ĐỊA ĐIỂM (Cho Trang Chi Tiết)
// =============================================================
app.get('/api/destinations/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = "SELECT * FROM destinations WHERE dest_id = ?";
    
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Lỗi lấy chi tiết địa điểm:", err);
            return res.status(500).json({ error: "Lỗi Server" });
        }
        
        if (results.length > 0) {
            res.json(results[0]); // Trả về object địa điểm
        } else {
            res.status(404).json({ message: "Không tìm thấy địa điểm này" });
        }
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});