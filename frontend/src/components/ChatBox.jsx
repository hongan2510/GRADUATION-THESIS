import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import './ChatBox.css';

const ChatBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Lấy user từ localStorage (Sửa key 'user' nếu bạn lưu tên khác)
  const getCurrentUser = () => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  };

  // State tin nhắn
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_history');
    return saved ? JSON.parse(saved) : [
      { role: 'bot', type: 'text', content: 'Xin chào! 👋 Mình là trợ lý ảo Cần Thơ Tour.\n\nBạn muốn tìm **Tour**, **Khách sạn** hay gõ **"Check đơn"** để xem lịch sử?' }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Tự động cuộn & Lưu lịch sử
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Hàm helper để chọn màu trạng thái
  const getStatusClass = (statusText) => {
    const s = statusText.toLowerCase();
    if (s.includes('hủy') || s.includes('cancelled')) return 'status-danger';
    if (s.includes('xác nhận') || s.includes('confirmed') || s.includes('hoàn thành')) return 'status-success';
    if (s.includes('chờ') || s.includes('holding') || s.includes('pending')) return 'status-warning';
    return 'status-info';
  };

  // --- XỬ LÝ GỬI TIN ---
  // Thêm tham số manualText để hỗ trợ gọi hàm khi click vào mã đơn
  const handleSend = async (manualText = null) => {
    // Ưu tiên dùng text truyền vào (nếu có), nếu không thì dùng input
    const textToSend = typeof manualText === 'string' ? manualText : input;
    
    if (!textToSend.trim()) return;

    const lowerText = textToSend.toLowerCase();

    // 1. Thêm tin nhắn User
    setMessages(prev => [...prev, { role: 'user', type: 'text', content: textToSend }]);
    setInput('');
    setIsLoading(true);

    // =================================================================
    // LOGIC A: TRA CỨU ĐƠN HÀNG (CÓ 2 TRƯỜNG HỢP)
    // =================================================================

    // A1. TRƯỜNG HỢP KHÁCH CLICK VÀO MÃ ĐƠN (VD: "Chi tiết đơn #218")
    const detailMatch = lowerText.match(/(?:chi tiết|xem)\s*(?:đơn)?\s*#?(\d+)/);
    
    if (detailMatch) {
        const orderIdToCheck = detailMatch[1]; // Lấy số ID

        try {
            // Gọi API tra cứu theo ID
            const res = await axios.post('http://localhost:8082/api/chatbot/check-order', { 
                orderId: orderIdToCheck 
            });

            if (res.data.found) {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    type: 'order_list', // Tái sử dụng giao diện Box
                    content: `✅ Đây là thông tin chi tiết đơn hàng **#${orderIdToCheck}**:`,
                    data: res.data.data // Mảng chứa 1 đơn hàng
                }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', type: 'text', content: `❌ Không tìm thấy đơn hàng #${orderIdToCheck}.` }]);
            }
        } catch (e) {
            console.error("Lỗi xem chi tiết:", e);
            setMessages(prev => [...prev, { role: 'bot', type: 'text', content: 'Lỗi kết nối server.' }]);
        }
        setIsLoading(false);
        return;
    }

    // A2. TRƯỜNG HỢP KHÁCH MUỐN XEM DANH SÁCH ("Check đơn")
    if (lowerText.includes('check đơn') || lowerText.includes('kiểm tra đơn') || lowerText.includes('đơn hàng')) {
        
        const currentUser = getCurrentUser();

        // Nếu chưa đăng nhập
        if (!currentUser) {
             setTimeout(() => {
                setMessages(prev => [...prev, { 
                    role: 'bot', 
                    type: 'text',
                    content: '🔒 **Bạn chưa đăng nhập.**\n\nVui lòng đăng nhập để xem danh sách đơn hàng nhé! 👇\n\n[Đăng nhập ngay](/login)' 
                }]);
                setIsLoading(false);
             }, 600);
             return;
        }

        // Nếu đã đăng nhập -> Gọi API lấy danh sách
        try {
            const userIdToCheck = currentUser.user_id || currentUser.id; 

            const res = await axios.post('http://localhost:8082/api/chatbot/check-order', { 
                userId: userIdToCheck 
            });

            if (res.data.found) {
                const botMsg = {
                    role: 'bot',
                    type: 'order_list',
                    content: `📋 Chào **${currentUser.full_name}**, tìm thấy ${res.data.data.length} đơn gần nhất (Bấm vào mã để xem riêng):`,
                    data: res.data.data
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                setMessages(prev => [...prev, { 
                    role: 'bot', 
                    type: 'text',
                    content: `📭 Tài khoản **${currentUser.username}** chưa có đơn hàng nào.` 
                }]);
            }
        } catch (error) {
            console.error("Lỗi Check Order:", error);
            setMessages(prev => [...prev, { role: 'bot', type: 'text', content: '⚠️ Lỗi kết nối Server. Vui lòng thử lại sau.' }]);
        }

        setIsLoading(false);
        return;
    }

    // =================================================================
    // LOGIC B: CHAT AI THÔNG THƯỜNG
    // =================================================================
    try {
      const res = await axios.post('http://localhost:8082/api/chatbot', { message: textToSend });
      setMessages(prev => [...prev, { role: 'bot', type: 'text', content: res.data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', type: 'text', content: '🤖 Hệ thống AI đang bảo trì.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const clearChat = () => {
    localStorage.removeItem('chat_history');
    setMessages([{ role: 'bot', type: 'text', content: 'Đã xóa lịch sử chat. 🚀' }]);
  };

  // Cấu hình Markdown cho Link
  const MarkdownComponents = {
    a: ({ href, children, ...props }) => (
        <a 
          href={href}
          className="chat-link"
          onClick={(e) => {
            e.preventDefault(); 
            const currentOrigin = window.location.origin;
            if (href.startsWith('/') || href.includes('localhost')) {
              let path = href.replace(currentOrigin, '').replace('http://localhost:3000', '');
              if (!path.startsWith('/')) path = '/' + path;
              navigate(path);
            } else {
              window.open(href, '_blank');
            }
          }}
          {...props}
        >
          {children}
        </a>
    )
  };

  return (
    <>
      <button className="chat-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg> : "💬"}
      </button>

      <div className={`chat-box ${isOpen ? 'active' : ''}`}>
        <div className="chat-header">
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <span style={{fontSize:'20px'}}>🤖</span>
            <div>
                <div style={{fontSize:'15px', fontWeight:'700'}}>Trợ lý Cần Thơ</div>
                <div style={{fontSize:'11px', opacity:0.9}}>Hỗ trợ 24/7</div>
            </div>
          </div>
          <div style={{display:'flex', gap:'5px'}}>
              <button className="clear-btn" onClick={clearChat} title="Xóa lịch sử">🗑️</button>
              <button className="chat-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>
        </div>

        <div className="chat-body">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-row ${msg.role}`}>
              {msg.role === 'bot' && <div className="chat-avatar">🤖</div>}
              
              <div className={`chat-msg ${msg.role}`} style={msg.type === 'order_list' ? {width: '100%', background: 'transparent', boxShadow:'none', padding: 0} : {}}>
                
                {/* LOGIC RENDER: NẾU LÀ ORDER_LIST THÌ VẼ BOX, CÒN KHÔNG THÌ VẼ TEXT */}
                {msg.type === 'order_list' ? (
                    <div>
                        <div style={{background: '#fff', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '8px', border: '1px solid #edf2f7'}}>
                            <ReactMarkdown components={MarkdownComponents}>{msg.content}</ReactMarkdown>
                        </div>
                        
                        <div className="order-list-container">
                            {msg.data && msg.data.map((order) => (
                                <div key={order.id} className="order-box">
                                    <div className="order-header">
                                        {/* SỰ KIỆN CLICK ĐỂ XEM CHI TIẾT */}
                                        <span 
                                            className="order-id" 
                                            style={{cursor: 'pointer', color: '#0d6efd', textDecoration:'underline'}}
                                            onClick={() => handleSend(`Chi tiết đơn #${order.id}`)}
                                            title="Bấm để xem riêng đơn này"
                                        >
                                            #{order.id}
                                        </span>

                                        <span className={`order-status ${getStatusClass(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="order-body">
                                        <div className="order-item">
                                            <strong>Dịch vụ:</strong> 
                                            <span style={{maxWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={order.service}>
                                                {order.service}
                                            </span>
                                        </div>
                                        <div className="order-item">
                                            <strong>Ngày đi:</strong> <span>{order.date}</span>
                                        </div>
                                        <div className="order-item">
                                            <strong>Tổng tiền:</strong> <span className="item-price">{order.price}</span>
                                        </div>
                                        {/* Link điều hướng sang trang chi tiết Booking (nếu có) */}
                                        <a href={`/booking/detail/${order.id}`} className="view-detail-link" onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/booking/${order.service.includes('Hotel') ? 'hotel' : 'tour'}/${order.id}`); 
                                        }}>
                                            Xem chi tiết →
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Render tin nhắn thường
                    <ReactMarkdown components={MarkdownComponents}>
                        {msg.content}
                    </ReactMarkdown>
                )}

              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-row bot">
              <div className="chat-avatar">🤖</div>
              <div className="typing"><span></span><span></span><span></span></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <input 
            type="text" 
            placeholder="Nhập 'Check đơn'..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {/* Sửa lại hàm onClick để chỉ gọi handleSend khi click nút gửi */}
          <button onClick={() => handleSend()} disabled={!input.trim()}>➤</button>
        </div>
      </div>
    </>
  );
};

export default ChatBox;