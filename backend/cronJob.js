const cron = require('node-cron');
const db = require('./db'); // Kết nối database của bạn

// Chạy vào 8:00 sáng mỗi ngày
cron.schedule('0 8 * * *', async () => {
    console.log('--- Bắt đầu quét đơn để nhắc hẹn ---');
    
    try {
        // 1. Lấy ngày mai
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

        // 2. Query SQL tìm các đơn có booking_time là ngày mai
        // Giả sử bảng bookings có cột booking_time và user_id
        const query = `
            SELECT * FROM bookings 
            WHERE DATE(booking_time) = ? AND status = 'confirmed'
        `;
        
        const [bookings] = await db.query(query, [tomorrowStr]);

        // 3. Tạo thông báo cho từng đơn
        for (const booking of bookings) {
            const message = `🔔 Nhắc nhở: Bạn có lịch hẹn tại nhà hàng ngày mai lúc ${booking.booking_time}.`;
            
            // Insert vào bảng notifications
            await db.query(`
                INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
                VALUES (?, 'Nhắc lịch hẹn', ?, 'warning', 0, NOW())
            `, [booking.user_id, message]);
            
            // (Nâng cao) Gửi Email luôn ở đây nếu muốn
        }
        console.log(`Đã gửi nhắc nhở cho ${bookings.length} đơn.`);

    } catch (error) {
        console.error('Lỗi Cron Job:', error);
    }
});