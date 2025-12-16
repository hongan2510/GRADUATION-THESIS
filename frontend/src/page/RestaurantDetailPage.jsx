import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// ==========================================
// 1. CÁC HÀM XỬ LÝ NGÔN NGỮ (NLP) & UTILS
// ==========================================
const removeVietnameseTones = (str) => {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); 
    return str;
};

const normalizeInput = (text) => {
    let normalized = text.toLowerCase().trim();
    normalized = normalized.replace(/\btoois\b/g, 'tối'); 
    normalized = normalized.replace(/\bbuoii\b/g, 'buổi');
    normalized = normalized.replace(/\bhom\b/g, 'hôm');
    normalized = normalized.replace(/\bngay\b/g, 'ngày');
    normalized = normalized.replace(/\bdt\b/g, 'điện thoại');
    normalized = normalized.replace(/\bsdt\b/g, 'số điện thoại');
    normalized = normalized.replace(/hũy/g, 'hủy');
    normalized = normalized.replace(/book/g, 'đặt');
    return normalized;
};

const parseFlexibleDate = (input) => {
    const now = new Date();
    let targetDate = new Date(); 
    let hasDate = false;
    let hasTime = false;
    targetDate.setHours(now.getHours(), now.getMinutes(), 0, 0); 
    const lowerInput = normalizeInput(input);
    const unsignedInput = removeVietnameseTones(lowerInput); 
    let hour = -1; let minute = 0; let daysToAdd = -1;
    if (unsignedInput.includes('ngay mot') || unsignedInput.includes('mot')) { daysToAdd = 2; } 
    else if (['ngay mai', 'toi mai', 'sang mai', 'mai'].some(k => unsignedInput.includes(k))) { daysToAdd = 1; } 
    else if (['hom nay', 'toi nay', 'sang nay', 'nay'].some(k => unsignedInput.includes(k))) { daysToAdd = 0; } 
    if (daysToAdd >= 0) {
        if (daysToAdd > 0) { targetDate.setDate(now.getDate() + daysToAdd); targetDate.setHours(0, 0, 0, 0); }
        hasDate = true;
    } else {
        const dayNames = ['chu nhat', 'thu 2', 'thu 3', 'thu 4', 'thu 5', 'thu 6', 'thu 7'];
        const dayMatchIndex = dayNames.findIndex(day => unsignedInput.includes(day));
        if (dayMatchIndex !== -1) {
            const currentDay = now.getDay(); 
            let targetDayOfWeek = dayMatchIndex; 
            let daysToAddDayOfWeek = targetDayOfWeek - currentDay;
            if (daysToAddDayOfWeek <= 0) daysToAddDayOfWeek += 7; 
            targetDate.setDate(now.getDate() + daysToAddDayOfWeek); targetDate.setHours(0, 0, 0, 0); 
            hasDate = true;
        } else {
            const dateMatch = lowerInput.match(/(\d{1,2})[\/\-\.](\d{1,2})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]); const month = parseInt(dateMatch[2]) - 1; 
                targetDate.setMonth(month); targetDate.setDate(day); targetDate.setHours(0, 0, 0, 0); 
                const tempNow = new Date(now); tempNow.setHours(0,0,0,0);
                if (targetDate < tempNow) { targetDate.setFullYear(now.getFullYear() + 1); }
                hasDate = true;
            }
        }
    }
    const explicitTimeMatch = lowerInput.match(/(\d{1,2})\s*(?:h|:|g)(\d{0,2})/);
    if (explicitTimeMatch) { hour = parseInt(explicitTimeMatch[1]); minute = explicitTimeMatch[2] ? parseInt(explicitTimeMatch[2]) : 0; hasTime = true; } 
    else {
        const parts = lowerInput.split(/\s+/);
        for (let part of parts) { if (/^\d+$/.test(part) && !part.includes('/') && !part.includes('-')) { const val = parseInt(part); if (val >= 0 && val <= 24) { hour = val; hasTime = true; break; } } }
    }
    if (hasTime && hour !== -1) {
        if (['chieu', 'toi', 'pm'].some(k => unsignedInput.includes(k))) { if (hour < 12) hour += 12; }
        if (['sang', 'am'].some(k => unsignedInput.includes(k)) && hour === 12) { hour = 0; }
        if ((daysToAdd === 0 || !hasDate) && hour < 12) { const tempTestDate = new Date(targetDate); tempTestDate.setHours(hour, minute); if (tempTestDate < now) hour += 12; }
        targetDate.setHours(hour, minute, 0, 0);
    } else { return null; }
    if (targetDate < now) return "PAST";
    return targetDate;
};


// ==========================================
// 2. COMPONENTS GIAO DIỆN PHỤ TRỢ
// ==========================================

// --- COMPONENT POPUP YÊU CẦU ĐĂNG NHẬP (MỚI THÊM) ---
const LoginRequestModal = ({ isOpen, onClose, onLogin }) => {
    if (!isOpen) return null;
    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s' }}>
            <div className="bg-white rounded-4 p-4 shadow-lg text-center position-relative" 
                 style={{ width: '380px', maxWidth: '90%', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                
                {/* Nút tắt X */}
                <button onClick={onClose} className="btn-close position-absolute top-0 end-0 m-3"></button>

                {/* Icon */}
                <div className="mb-3 d-inline-block p-3 rounded-circle bg-warning bg-opacity-10 text-warning">
                     <i className="bi bi-person-lock fs-1"></i>
                </div>

                <h4 className="fw-bold mb-2 text-dark">Chưa đăng nhập</h4>
                <p className="text-muted mb-4 px-2">
                    Bạn cần đăng nhập để sử dụng tính năng đặt bàn và trò chuyện với trợ lý ảo.
                </p>

                <div className="d-flex gap-2 justify-content-center">
                    <button className="btn btn-light rounded-pill px-4 py-2 fw-semibold" onClick={onClose}>
                        Để sau
                    </button>
                    <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm" onClick={onLogin}>
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
            
            {/* CSS Animation nhỏ trong component */}
            <style>{`
                @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

const ImageWithFallback = ({ src, alt, className, style, fallbackSrc }) => {
    const [imgSrc, setImgSrc] = useState(src);
    useEffect(() => { setImgSrc(src); }, [src]);
    const handleError = () => { setImgSrc(fallbackSrc || "https://via.placeholder.com/400x300?text=No+Image"); };
    return <img src={imgSrc} alt={alt} className={className} style={style} onError={handleError} />;
};

const ChatBookingModal = ({ isOpen, onClose, restaurantName, onConfirmBooking, onCancelBooking, onUpdateBooking }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [step, setStep] = useState(-1);
    const [bookingData, setBookingData] = useState({});
    const [isTyping, setIsTyping] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setStep(-1); setBookingData({}); setMessages([]);
            addBotMessage(`👋 Chào bạn! Tôi là trợ lý ảo của **${restaurantName}**. Tôi có thể giúp bạn Đặt bàn, Hủy đơn hoặc Sửa đơn.`, 0);
            setTimeout(() => setStep(1), 1000);
        }
    }, [isOpen]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping, isProcessing]);

    const resetFlow = () => { setStep(1); setBookingData({}); setMessages([]); addBotMessage(`Vâng, chúng ta làm lại từ đầu. Bạn đi bao nhiêu người ạ?`); };
    const addBotMessage = (text, delay = 500) => { setIsTyping(true); setTimeout(() => { setMessages(prev => [...prev, { sender: 'bot', text }]); setIsTyping(false); }, delay); };
    const addUserMessage = (text) => { setMessages(prev => [...prev, { sender: 'user', text }]); };

    const detectIntent = (text) => {
        const lowerText = normalizeInput(text); const unsignedText = removeVietnameseTones(lowerText); 
        if (['quay lai', 've truoc', 'back', 'lui lai'].some(k => unsignedText.includes(k))) return 'BACK';
        if (['dat lai', 've dau', 'tu dau', 'reset', 'huy het'].some(k => unsignedText.includes(k))) return 'RESET';
        if (['doi so luong', 'sua so nguoi', 'doi nguoi', 'nhap lai so nguoi'].some(k => unsignedText.includes(k))) return 'GOTO_GUESTS';
        if (['doi gio', 'sua gio', 'doi ngay', 'sua ngay', 'chon lai gio'].some(k => unsignedText.includes(k))) return 'GOTO_TIME';
        if (['huy', 'cancel', 'xoa', 'khong den'].some(k => unsignedText.includes(k))) return 'CANCEL';
        if (['sua', 'doi', 'thay doi'].some(k => unsignedText.includes(k))) return 'MODIFY';
        return null; 
    };
    
    const validateInput = (currentStep, val) => {
        if (currentStep === 1) { const num = parseInt(val); if (isNaN(num) || num <= 0) return "Vui lòng nhập số lượng khách là số dương (VD: 2, 5)."; }
        if (currentStep === 2) { 
            const parsedDate = parseFlexibleDate(val);
            if (!parsedDate) return "Bot chưa hiểu giờ. Vui lòng nhập rõ hơn (VD: 25/12 9h, hoặc 'tối nay 7h').";
            if (parsedDate === "PAST") return "Thời gian đặt bàn không được ở quá khứ. Vui lòng chọn thời gian khác.";
            const displayDate = `${parsedDate.getHours()}:${String(parsedDate.getMinutes()).padStart(2, '0')} ngày ${parsedDate.getDate()}/${parsedDate.getMonth()+1}/${parsedDate.getFullYear()}`;
            const sqlDate = `${parsedDate.getFullYear()}-${parsedDate.getMonth()+1}-${parsedDate.getDate()} ${parsedDate.getHours()}:${parsedDate.getMinutes()}:00`;
            return { display: displayDate, sql: sqlDate };
        }
        if (currentStep === 4) { const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/; if (!phoneRegex.test(val)) return "Số điện thoại không hợp lệ (VD: 0912345678)."; }
        if (currentStep === 5) { const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!emailRegex.test(val)) return "Email không đúng định dạng."; }
        return null;
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userText = input.trim(); const userTextNormalized = normalizeInput(userText); 
        addUserMessage(userText); setInput("");
        const intent = detectIntent(userText);
        if (intent === 'BACK') { if (step > 1 && step < 6) { let prevStep = step - 1; setStep(prevStep); if(prevStep===1) addBotMessage("Quay lại bước 1."); if(prevStep===2) addBotMessage("Quay lại bước 2."); if(prevStep===3) addBotMessage("Quay lại bước 3."); if(prevStep===4) addBotMessage("Quay lại bước 4."); } else { addBotMessage("Bạn đang ở bước đầu tiên."); } return; }
        if (intent === 'GOTO_GUESTS') { setStep(1); addBotMessage("Ok, nhập lại số người nhé:"); return; }
        if (intent === 'GOTO_TIME') { if(!bookingData.guests) { setStep(1); addBotMessage("Nhập số người trước đã nhé:"); } else { setStep(2); addBotMessage("Ok, chọn lại thời gian nào:"); } return; }
        if (intent === 'RESET') { addBotMessage("Ok, làm lại từ đầu nhé!"); setTimeout(resetFlow, 1000); return; }
        if (intent === 'CANCEL') { setStep(7); addBotMessage("Để hủy bàn, vui lòng nhập MÃ ĐẶT BÀN (Booking ID)."); return; }
        if (intent === 'MODIFY') { setStep(8); addBotMessage("Để sửa đơn, vui lòng nhập MÃ ĐẶT BÀN (Booking ID)."); return; }
        if (step === -1) { setStep(1); return; }

        if (step === 7) { setIsProcessing(true); const result = await onCancelBooking(userText); setIsProcessing(false); if (result.success) { addBotMessage(`✅ ${result.message}`); setStep(6); } else { addBotMessage(`❌ Lỗi: ${result.message}`); } return; }
        if (step === 8) { setBookingData({ ...bookingData, booking_id: userText }); setStep(9); addBotMessage(`Đơn #${userText}. Bạn muốn đổi "Giờ" hay "Số người"?`); return; }
        if (step === 9) { const choice = removeVietnameseTones(userTextNormalized); if (['gio', 'time', 'ngay', 'luc'].some(k => choice.includes(k))) { setBookingData({ ...bookingData, edit_type: 'time' }); setStep(10); addBotMessage("Nhập Ngày Giờ mới (VD: tối nay 7h):"); } else if (['nguoi', 'khach', 'khac', 'khah', 'kha', 'slot', 'cho'].some(k => choice.includes(k))) { setBookingData({ ...bookingData, edit_type: 'guests' }); setStep(10); addBotMessage("Nhập Số lượng khách mới:"); } else { addBotMessage("Mình chưa hiểu. Nhập 'Giờ' hoặc 'Số người'."); } return; }
        if (step === 10) { const validationStep = bookingData.edit_type === 'time' ? 2 : 1; const validationResult = validateInput(validationStep, userText); if (typeof validationResult === 'string') { addBotMessage(validationResult); return; } setIsProcessing(true); let finalVal = userText; if (bookingData.edit_type === 'time') finalVal = validationResult.sql; const updatePayload = { booking_id: bookingData.booking_id, new_time: bookingData.edit_type === 'time' ? finalVal : null, new_guests: bookingData.edit_type === 'guests' ? userText : null, note: `Sửa qua Chatbot: ${bookingData.edit_type}` }; const result = await onUpdateBooking(updatePayload); setIsProcessing(false); if (result.success) { addBotMessage(`✅ ${result.message}`); setStep(6); } else { addBotMessage(`❌ Lỗi: ${result.message}`); setStep(8); } return; }

        if (step === 6) { addBotMessage("Bạn đã hoàn tất. Nhắn 'Đặt lại' nếu muốn tạo đơn mới."); return; }
        const validationResult = validateInput(step, userText); if (typeof validationResult === 'string') { addBotMessage(`⚠️ ${validationResult}`); return; }

        if (step === 1) { setBookingData({ ...bookingData, guests: userText }); setStep(2); addBotMessage(`Vâng, ${userText} người. Bạn muốn đặt lúc nào? (Ví dụ: Tối nay 7h...)`); } 
        else if (step === 2) { setBookingData({ ...bookingData, timeDisplay: validationResult.display, timeSQL: validationResult.sql }); setStep(3); addBotMessage(`Chốt ${validationResult.display}. Mời bạn nhập Tên người đặt:`); }
        else if (step === 3) { setBookingData({ ...bookingData, name: userText }); setStep(4); addBotMessage(`Chào ${userText}, cho mình xin Số điện thoại:`); }
        else if (step === 4) { setBookingData({ ...bookingData, phone: userText }); setStep(5); addBotMessage("Cuối cùng, cho mình xin Email để gửi vé xác nhận:"); }
        else if (step === 5) { const finalData = { ...bookingData, email: userText }; setBookingData(finalData); setStep(6); setIsProcessing(true); addBotMessage("Đang tạo đơn... Vui lòng đợi."); const result = await onConfirmBooking(finalData); setIsProcessing(false); if (result.success) { addBotMessage(result.message); setStep(6); } else { addBotMessage(`❌ Lỗi: ${result.message}.`); setStep(5); } }
    };

    if (!isOpen) return null;
    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
            <div className="bg-white rounded-4 shadow-lg overflow-hidden d-flex flex-column" style={{ width: '500px', height: '700px', maxHeight: '95vh', transition: 'all 0.3s ease' }}>
                <div className="p-3 bg-primary text-white d-flex justify-content-between align-items-center shadow-sm">
                    <div className="d-flex align-items-center"><div className="rounded-circle bg-white text-primary d-flex justify-content-center align-items-center me-3" style={{width: 40, height: 40}}><i className="bi bi-robot fs-5"></i></div><div><h6 className="mb-0 fw-bold fs-5">Trợ lý nhà hàng</h6><div className="d-flex align-items-center"><span className="bg-success rounded-circle d-inline-block me-1" style={{width: 8, height: 8}}></span><small className="opacity-90" style={{fontSize: '12px'}}>Luôn sẵn sàng</small></div></div></div>
                    <button onClick={onClose} className="btn btn-link text-white text-decoration-none fs-4 p-0 opacity-75 hover-opacity-100"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="flex-grow-1 p-4 overflow-auto bg-light" style={{ scrollBehavior: 'smooth' }}>
                    {messages.map((msg, idx) => (<div key={idx} className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>{msg.sender === 'bot' && <i className="bi bi-robot text-primary me-2 mt-2 fs-5"></i>}<div className={`p-3 rounded-4 shadow-sm text-break ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'}`} style={{ maxWidth: '85%', fontSize: '1rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{msg.text}</div></div>))}
                    {(isTyping || isProcessing) && (<div className="d-flex justify-content-start mb-3"><i className="bi bi-robot text-primary me-2 mt-2 fs-5"></i><div className="bg-white p-3 rounded-4 shadow-sm border"><div className="d-flex gap-1"><div className="spinner-grow spinner-grow-sm text-secondary" role="status"></div><div className="spinner-grow spinner-grow-sm text-secondary" role="status"></div><div className="spinner-grow spinner-grow-sm text-secondary" role="status"></div></div></div></div>)}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-3 bg-white border-top">
                    <div className="d-flex gap-2 mb-2 overflow-auto pb-1" style={{scrollbarWidth: 'none'}}>
                        {step >= 6 ? ( <> <button className="btn btn-sm btn-outline-primary rounded-pill px-3 text-nowrap" onClick={() => { setInput("Đặt bàn mới"); handleSend(); }}>Đặt mới</button> <button className="btn btn-sm btn-outline-warning rounded-pill px-3 text-nowrap" onClick={() => { setInput("Tôi muốn sửa"); handleSend(); }}>Sửa đơn</button> <button className="btn btn-sm btn-outline-danger rounded-pill px-3 text-nowrap" onClick={() => { setInput("Tôi muốn hủy"); handleSend(); }}>Hủy đơn</button> </> ) : ( <> {step > 1 && (<button className="btn btn-sm btn-outline-secondary rounded-pill px-3 text-nowrap" onClick={() => { setInput("Quay lại"); handleSend(); }}><i className="bi bi-arrow-left me-1"></i> Quay lại</button>)} {step > 1 && (<button className="btn btn-sm btn-outline-info rounded-pill px-3 text-nowrap" onClick={() => { setInput("Sửa số người"); handleSend(); }}>Sửa số người</button>)} {step > 2 && (<button className="btn btn-sm btn-outline-info rounded-pill px-3 text-nowrap" onClick={() => { setInput("Chọn lại giờ"); handleSend(); }}>Sửa giờ</button>)} </> )}
                    </div>
                    <div className="input-group input-group-lg">
                        <input type="text" className="form-control border bg-light rounded-pill px-3 fs-6" placeholder="Nhập tin nhắn..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSend()} disabled={isProcessing} autoFocus />
                        <button className="btn btn-primary rounded-circle ms-2 shadow-sm d-flex justify-content-center align-items-center" style={{width: 48, height: 48}} onClick={handleSend} disabled={isProcessing || !input.trim()}><i className="bi bi-send-fill fs-5"></i></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. PAGE WRAPPER (MAIN PAGE)
// ==========================================

const RestaurantDetailPage = () => {
    const { restaurant_id } = useParams();
    const navigate = useNavigate(); 
    const location = useLocation(); 
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    
    // --- STATE ĐỂ HIỂN THỊ POPUP YÊU CẦU LOGIN ---
    const [showLoginModal, setShowLoginModal] = useState(false);

    const formatCurrency = (amount) => {
        if (!amount) return "Liên hệ";
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // --- HÀM KIỂM TRA ĐĂNG NHẬP (SỬA ĐỔI) ---
    const handleOpenBooking = () => {
        const isLoggedIn = localStorage.getItem('accessToken') || localStorage.getItem('user');

        if (isLoggedIn) {
            setShowChat(true); 
        } else {
            // Thay vì alert, bật modal đẹp lên
            setShowLoginModal(true);
        }
    };

    // --- HÀM XỬ LÝ KHI BẤM "ĐĂNG NHẬP NGAY" TRONG POPUP ---
    const handleRedirectLogin = () => {
        setShowLoginModal(false);
        navigate('/login', { state: { from: location.pathname } });
    };

    // API 1: ĐẶT BÀN
    const handleBotSubmit = async (bookingInfo) => {
        // Lấy thông tin user hiện tại
        const userStorage = localStorage.getItem('user');
        const currentUser = userStorage ? JSON.parse(userStorage) : null;

        const payload = {
            user_id: currentUser ? currentUser.user_id : null, // Gửi user_id để nhận thông báo nhắc hẹn
            restaurant_id: restaurant_id,
            customer_name: bookingInfo.name, 
            phone: bookingInfo.phone,
            email: bookingInfo.email,
            booking_time: bookingInfo.timeSQL, 
            guest_count: parseInt(bookingInfo.guests) || 1,
            note: "Đặt qua Chatbot",
        };
        try {
            const response = await axios.post('http://localhost:8082/api/bookings/chat', payload);
            if (response.data && response.data.success) {
                const ticketId = response.data.booking_id;
                const fullMsg = `
**ĐẶT BÀN THÀNH CÔNG!**
------------------------------
🎫 Mã vé: **#${ticketId}**
👤 Khách: ${bookingInfo.name}
📞 SĐT: ${bookingInfo.phone}
👥 Số khách: ${bookingInfo.guests}
🕒 Lúc: ${bookingInfo.timeDisplay}
------------------------------
*Vui lòng lưu Mã vé (#${ticketId}) để tra cứu.*`;
                return { success: true, message: fullMsg };
            } else { return { success: false, message: response.data.message }; }
        } catch (err) { return { success: false, message: "Lỗi kết nối server." }; }
    };

    // API 2: HỦY BÀN
    const handleCancelBooking = async (bookingId) => {
        try {
            const response = await axios.post('http://localhost:8082/api/restaurant/bookings/cancel', { booking_id: bookingId });
            return response.data?.success ? { success: true, message: `Đã hủy đơn **#${bookingId}** thành công!` } : { success: false, message: response.data.message };
        } catch (err) { return { success: false, message: "Lỗi mạng" }; }
    };

    // API 3: SỬA ĐƠN
    const handleUpdateBooking = async (payload) => {
        try {
            const response = await axios.post('http://localhost:8082/api/restaurant/bookings/update', payload);
            if (response.data?.success) {
                const data = response.data.data;
                const fullMsg = `
**CẬP NHẬT THÀNH CÔNG!**
------------------------------
🎫 Mã vé: **#${data.id}**
👤 Khách: ${data.name}
👥 Số khách: ${data.guests}
🕒 Lúc: ${data.time}
------------------------------`;
                return { success: true, message: fullMsg };
            }
            return { success: false, message: response.data.message };
        } catch (err) { return { success: false, message: "Lỗi mạng" }; }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!restaurant_id) return;
            try {
                const res = await axios.get(`http://localhost:8082/api/restaurants/${restaurant_id}`);
                setData(res.data);
                setLoading(false);
            } catch (error) { setLoading(false); }
        };
        fetchData();
    }, [restaurant_id]);

    if (loading) return <div className="min-vh-100 d-flex justify-content-center align-items-center"><div className="spinner-border text-primary"></div></div>;
    if (!data) return <div className="text-center mt-5">Không tìm thấy nhà hàng</div>;

    return (
        <div className="bg-light min-vh-100 pb-5">
            <div className="position-relative" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', paddingTop: '2rem', paddingBottom: '2rem' }}>
                <div className="container">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-3">
                            <li className="breadcrumb-item"><Link to="/" className="text-white text-decoration-none opacity-75">Trang chủ</Link></li>
                            <li className="breadcrumb-item"><Link to="/search?type=restaurant" className="text-white text-decoration-none opacity-75">Nhà hàng</Link></li>
                            <li className="breadcrumb-item active text-white">{data.name}</li>
                        </ol>
                    </nav>
                    <h1 className="fw-bold mb-2 text-white display-5">{data.name}</h1>
                    <p className="text-white mb-0 fs-5 opacity-90"><i className="bi bi-geo-alt-fill me-2"></i>{data.address}</p>
                </div>
            </div>

            <div className="container mt-4">
                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="position-relative rounded-4 overflow-hidden shadow mb-4 bg-dark" style={{ height: '450px' }}>
                            <ImageWithFallback src={data.image} alt={data.name} className="w-100 h-100 object-fit-cover opacity-100" fallbackSrc="https://via.placeholder.com/800x450?text=No+Image" />
                        </div>
                        <div className="bg-white p-4 rounded-4 shadow-sm mb-4 border border-light">
                            <h4 className="fw-bold mb-3">Giới thiệu</h4>
                            <p className="text-secondary lh-lg" style={{ whiteSpace: 'pre-line' }}>{data.description}</p>
                        </div>
                        <div className="bg-white p-4 rounded-4 shadow-sm mb-4 border border-light">
                            <h4 className="fw-bold mb-4">Thực đơn nổi bật</h4>
                            {data.menu && data.menu.length > 0 ? (
                                <div className="row g-3">
                                    {data.menu.map((item, idx) => {
                                        // --- SỬA Ở ĐÂY: Ưu tiên lấy item.name, nếu không có thì lấy item.dish_name ---
                                        const dishName = item.name || item.dish_name || "Tên món";
                                        const dishImage = item.image || item.image_url; 
                                        // -----------------------------------------------------------------------------

                                        return (
                                            <div key={idx} className="col-md-6">
                                                <div className="card h-100 border-0 shadow-sm">
                                                    <div className="card-body p-0">
                                                        <div className="d-flex align-items-center p-3">
                                                            <div className="position-relative me-3">
                                                                <div style={{ width: '80px', height: '80px' }}>
                                                                    <ImageWithFallback src={dishImage} alt={dishName} className="rounded-3 w-100 h-100 object-fit-cover" fallbackSrc="https://via.placeholder.com/80?text=Food" />
                                                                </div>
                                                            </div>
                                                            <div className="flex-grow-1">
                                                                <h6 className="fw-bold mb-1 text-dark">{dishName}</h6>
                                                                <div className="text-danger fw-bold fs-6">{formatCurrency(item.price)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <div className="text-center text-muted py-5"><p>Chưa có thực đơn</p></div>}
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="bg-white rounded-4 shadow-sm border border-light sticky-top overflow-hidden" style={{ top: '100px' }}>
                            <div className="p-4 pb-3 border-bottom">
                                <h5 className="fw-bold mb-0 text-dark">Thông tin liên hệ</h5>
                            </div>
                            <div className="p-4">
                                <div className="mb-3"><small className="text-muted d-block">Giờ mở cửa</small>
                                    <strong className="text-dark">{data.opening_hours_display || "09:00 - 22:00"}</strong>
                                </div>
                                <div className="mb-3"><small className="text-muted d-block">Mức giá</small><strong className="text-success">{data.price_range}</strong></div>
                                <div className="mb-4"><small className="text-muted d-block">Địa chỉ</small><strong className="text-dark">{data.address}</strong></div>
                                
                                <button 
                                    onClick={handleOpenBooking}
                                    className="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                                >
                                    <i className="bi bi-chat-dots-fill"></i>
                                    Đặt bàn ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* COMPONENT CHAT */}
            <ChatBookingModal 
                isOpen={showChat} 
                onClose={() => setShowChat(false)} 
                restaurantName={data.name}
                onConfirmBooking={handleBotSubmit}
                onCancelBooking={handleCancelBooking}
                onUpdateBooking={handleUpdateBooking}
            />

            {/* COMPONENT POPUP LOGIN MỚI */}
            <LoginRequestModal 
                isOpen={showLoginModal} 
                onClose={() => setShowLoginModal(false)}
                onLogin={handleRedirectLogin}
            />
        </div>
    );
};

export default RestaurantDetailPage;