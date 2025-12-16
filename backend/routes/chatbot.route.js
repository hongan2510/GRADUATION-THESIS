import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import mysql from 'mysql';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// 1. KẾT NỐI DATABASE
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "tourism_db"
});

const queryAsync = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

const formatMoney = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// Hàm xóa dấu tiếng Việt để so sánh tên địa điểm chính xác hơn
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ==========================================================
// API TRA CỨU ĐƠN HÀNG (Giữ nguyên)
// ==========================================================
router.post('/chatbot/check-order', async (req, res) => {
    try {
        const { userId, orderId } = req.body;
        let sql = "", params = [];
        if (orderId) {
            const cleanId = orderId.toString().replace(/[^0-9]/g, '');
            sql = `SELECT b.booking_id, b.total_price, b.created_at, b.booking_type, bs.status_name, 
                   CASE WHEN b.booking_type = 'tour' THEN t.name WHEN b.booking_type = 'hotel' THEN h.name ELSE 'Dịch vụ khác' END as service_name
                   FROM bookings b
                   LEFT JOIN booking_status bs ON b.status_id = bs.status_id
                   LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
                   LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
                   WHERE b.booking_id = ?`;
            params = [cleanId];
        } else if (userId) {
            sql = `SELECT b.booking_id, b.total_price, b.created_at, b.booking_type, bs.status_name, 
                   CASE WHEN b.booking_type = 'tour' THEN t.name WHEN b.booking_type = 'hotel' THEN h.name ELSE 'Dịch vụ khác' END as service_name
                   FROM bookings b
                   LEFT JOIN booking_status bs ON b.status_id = bs.status_id
                   LEFT JOIN tours t ON b.item_id = t.tour_id AND b.booking_type = 'tour'
                   LEFT JOIN hotels h ON b.item_id = h.hotel_id AND b.booking_type = 'hotel'
                   WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 5`;
            params = [userId];
        } else { return res.json({ found: false }); }

        const orders = await queryAsync(sql, params);
        if (orders.length > 0) {
            const listOrders = orders.map(o => ({
                id: o.booking_id,
                service: o.service_name,
                date: new Date(o.created_at).toLocaleDateString('vi-VN'),
                price: formatMoney(o.total_price),
                status: o.status_name
            }));
            return res.json({ found: true, data: listOrders });
        }
        return res.json({ found: false });
    } catch (err) { return res.status(500).json({ found: false }); }
});

// ==========================================================
// API CHATBOT THÔNG MINH (GEO-LOCATION)
// ==========================================================

// Công thức SQL tính khoảng cách (Km) dựa trên cột latitude/longitude trong DB của bạn
const SQL_DISTANCE = (lat, lng, tablePrefix) => `
    (6371 * acos(
        cos(radians(${lat})) * cos(radians(${tablePrefix}.latitude)) * cos(radians(${tablePrefix}.longitude) - radians(${lng})) 
        + sin(radians(${lat})) * sin(radians(${tablePrefix}.latitude))
    ))
`;

router.post('/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ reply: "❗ Bạn chưa nhập câu hỏi." });

    const cleanMsg = removeAccents(message);

    // BƯỚC 1: Lấy danh sách địa điểm nổi tiếng (Destinations)
    // Để biết "Bến Ninh Kiều" hay "Chợ Nổi" nằm ở đâu
    const allDestinations = await queryAsync(`SELECT dest_id, name, latitude, longitude FROM destinations`);

    // BƯỚC 2: Tìm xem khách có nhắc đến địa điểm nào không
    const targetPlace = allDestinations.find(d => cleanMsg.includes(removeAccents(d.name)));

    let contextData = {};
    let systemInstruction = "";

    if (targetPlace && targetPlace.latitude && targetPlace.longitude) {
        // === TÌM KIẾM THEO BÁN KÍNH (NẾU TÌM THẤY ĐỊA ĐIỂM) ===
        const { latitude, longitude, name } = targetPlace;
        console.log(`📍 Tìm xung quanh: ${name} (${latitude}, ${longitude})`);

        // Tìm khách sạn < 5km
        const hotelSql = `
            SELECT hotel_id, name, star_rating, ${SQL_DISTANCE(latitude, longitude, 'hotels')} as distance 
            FROM hotels 
            HAVING distance < 5 
            ORDER BY distance ASC 
            LIMIT 5
        `;

        // Tìm nhà hàng < 5km
        const restSql = `
            SELECT restaurant_id, name, address, ${SQL_DISTANCE(latitude, longitude, 'restaurants')} as distance 
            FROM restaurants 
            HAVING distance < 5 
            ORDER BY distance ASC 
            LIMIT 5
        `;

        const [hotels, restaurants] = await Promise.all([
            queryAsync(hotelSql),
            queryAsync(restSql)
        ]);

        contextData = {
            SEARCH_TYPE: `Gần địa điểm: ${name}`,
            NEARBY_HOTELS: hotels.map(h => ({
                name: h.name,
                info: `${h.star_rating} sao - Cách ${h.distance.toFixed(1)} km`,
                link: `${FRONTEND_URL}/hotel/${h.hotel_id}`
            })),
            NEARBY_RESTAURANTS: restaurants.map(r => ({
                name: r.name,
                info: `Cách ${r.distance.toFixed(1)} km`,
                address: r.address,
                link: `${FRONTEND_URL}/restaurant/${r.restaurant_id}`
            }))
        };

        systemInstruction = `
        Khách đang hỏi về địa điểm: "${name}".
        Hệ thống đã quét được các địa điểm gần đó (trong bán kính 5km).
        
        Nhiệm vụ của bạn:
        1. Trả lời: "Gần ${name}, mình tìm thấy..."
        2. Liệt kê Khách sạn/Nhà hàng gần nhất kèm khoảng cách (VD: Cách 0.5km).
        3. Gắn link [Tên](Link) để khách bấm vào.
        `;

    } else {
        // === TÌM KIẾM CHUNG (NẾU KHÔNG CÓ ĐỊA ĐIỂM CỤ THỂ) ===
        // Load danh sách ngẫu nhiên hoặc rating cao
        const toursRaw = await queryAsync(`SELECT tour_id, name, price FROM tours ORDER BY RAND() LIMIT 5`);
        const hotelsRaw = await queryAsync(`SELECT hotel_id, name, star_rating FROM hotels ORDER BY star_rating DESC LIMIT 5`);
        const restaurantsRaw = await queryAsync(`SELECT restaurant_id, name FROM restaurants LIMIT 5`);

        contextData = {
            HOT_TOURS: toursRaw.map(t => ({ name: t.name, price: formatMoney(t.price), link: `${FRONTEND_URL}/tour/${t.tour_id}` })),
            TOP_HOTELS: hotelsRaw.map(h => ({ name: h.name, rating: `${h.star_rating} sao`, link: `${FRONTEND_URL}/hotel/${h.hotel_id}` })),
            RESTAURANTS: restaurantsRaw.map(r => ({ name: r.name, link: `${FRONTEND_URL}/restaurant/${r.restaurant_id}` }))
        };

        systemInstruction = `
        Bạn là Trợ lý du lịch Cần Thơ.
        Hãy tư vấn dịch vụ dựa trên danh sách hệ thống cung cấp.
        Luôn gắn link [Tên](Link).
        `;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction + `\nDỮ LIỆU JSON:\n${JSON.stringify(contextData)}` },
        { role: "user", content: message }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    return res.json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.error("Chatbot Error:", err);
    return res.status(500).json({ reply: "Hệ thống đang bận, thử lại sau nhé." });
  }
});

export default router;