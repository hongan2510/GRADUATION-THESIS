import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Hàm chuẩn hóa dữ liệu và nhóm theo thành phố/quận
const groupStaysByCity = (hotels) => {
    const grouped = {};
    
    // Ánh xạ city_id (từ DB) sang key và tên hiển thị
    const cityMap = {
        // Bạn cần đảm bảo các city_id này khớp với DB (1: Ninh Kiều, 2: Cái Răng, 3: Bình Thủy)
        1: { key: 'ninhKieu', name: 'Ninh Kiều' },
        2: { key: 'caiRang', name: 'Cái Răng' },
        3: { key: 'binhThuy', name: 'Bình Thủy' },
        4: { key: 'oMon', name: 'Ô Môn' },
        // Thêm các city_id khác nếu có
    };

    hotels.forEach(hotel => {
        // Tên quận/thành phố để phân nhóm
        const cityInfo = cityMap[hotel.city_id] || cityMap[1]; // Mặc định là Ninh Kiều nếu không tìm thấy ID
        const key = cityInfo.key;

        // Lưu tên thành phố vào đối tượng khách sạn để dễ hiển thị
        hotel.cityName = cityInfo.name; 
        
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(hotel);
    });
    
    return grouped;
};


// Component Card cho từng khách sạn (ĐÃ SỬA GIAO DIỆN)
const StayCard = ({ stay }) => {
    return (
        // Áp dụng class "hotel-card" từ App.css
        <div className="hotel-card"> 
            <Link to={`/hotel/${stay.hotel_id}`} className="text-decoration-none text-dark">
                {/* Container ảnh và badge */}
                <div className="hotel-image-container">
                    <img
                        src={stay.image_url} 
                        alt={stay.name}
                        // Class hotel-image đã được định nghĩa trong App.css
                        className="hotel-image" 
                        onError={(e) => { e.target.src = "https://placehold.co/280x190/f0f0f0/b0b0b0?text=Lỗi Ảnh"; e.target.onerror = null; }}
                    />
                    {/* Dùng class "badge-score" từ App.css */}
                    <span className="badge-score">
                        {stay.star_rating || '3'} {/* Xếp hạng sao */}
                    </span>
                </div>
                {/* Container chi tiết */}
                <div className="hotel-details"> 
                    {/* hotel-city-name: màu xám, chữ in hoa, font nhỏ */}
                    <p className="hotel-city-name">{stay.cityName}</p>
                    {/* hotel-name: font lớn, đậm */}
                    <h4 className="hotel-name">{stay.name}</h4>
                    {/* hotel-address: font nhỏ, màu xám, bị cắt nếu quá dài */}
                    <p className="hotel-address">{stay.address}</p>
                    {/* hotel-price: giá cả */}
                    <p className="hotel-price">
                        <span className="text-muted small">Giá từ </span>
                        {/* price-value: font to, màu đỏ Agoda */}
                        <span className="price-value">
                            {(stay.price || 500000).toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-muted small">/đêm</span>
                    </p>
                </div>
            </Link>
        </div>
    );
};

// Component chính
export default function SuggestedStays({ data }) {
    const { t } = useTranslation();
    // Thiết lập tab mặc định là 'ninhKieu'
    const [activeTab, setActiveTab] = useState('ninhKieu'); 
    const [groupedStays, setGroupedStays] = useState({});

    // Định nghĩa các tab (Đã chuyển lên đây để dùng trong useEffect)
    const tabs = [
        { key: 'ninhKieu', name: 'Ninh Kiều' },
        { key: 'caiRang', name: 'Cái Răng' },
        { key: 'binhThuy', name: 'Bình Thủy' },
        { key: 'oMon', name: 'Ô Môn' },
    ];

    useEffect(() => {
        // Nhóm lại dữ liệu mỗi khi prop data (hotels) thay đổi
        const grouped = groupStaysByCity(data);
        setGroupedStays(grouped);

        // Kiểm tra xem tab mặc định có dữ liệu không. Nếu không, chuyển sang tab đầu tiên có dữ liệu.
        if (!grouped[activeTab] || grouped[activeTab].length === 0) {
            const firstTabWithData = tabs.find(tab => grouped[tab.key] && grouped[tab.key].length > 0);
            if (firstTabWithData) {
                setActiveTab(firstTabWithData.key);
            }
        }
    }, [data]);

    const staysToShow = groupedStays[activeTab] || [];
    
    return (
        <div className="my-5"> {/* Thêm margin để tách biệt với các section khác */}
            {/* Tiêu đề và Link Xem thêm */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold mb-0 section-title">{t('Những chỗ nghỉ nổi bật được đề xuất cho quý khách:')}</h4>
                <Link 
                    to={`/search?q=${activeTab}`} 
                    className="text-decoration-none fw-semibold"
                >
                    {t('Xem thêm')}
                </Link>
            </div>

            {/* Thanh Tabs */}
            <ul className="nav nav-tabs border-0 mb-3">
                {tabs.map((tab) => {
                    // Chỉ hiển thị tab nếu có dữ liệu
                    if (groupedStays[tab.key] && groupedStays[tab.key].length > 0) {
                        return (
                            <li className="nav-item" key={tab.key}>
                                <button 
                                    className={`nav-link fw-semibold ${activeTab === tab.key ? 'active' : 'text-dark'}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {tab.name}
                                </button>
                            </li>
                        );
                    }
                    return null;
                })}
            </ul>

            {/* Danh sách cuộn ngang */}
            <div className="horizontal-scroll-wrapper">
                {/* Dùng class "scroll-x" đã được tối ưu hóa cho cuộn ngang trong App.css */}
                <div className="scroll-x pb-2"> 
                    {staysToShow.map((stay) => (
                        <StayCard stay={stay} key={stay.hotel_id} />
                    ))}
                    {staysToShow.length === 0 && (
                        <div className="p-3 text-muted">
                            Không tìm thấy chỗ nghỉ nào cho khu vực này.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}