import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Spinner, Button, Badge } from 'react-bootstrap'; // Hoặc dùng CSS thường tùy bạn

const DestinationDetailPage = () => {
    const { id } = useParams(); // Lấy ID từ URL
    const navigate = useNavigate();
    const [destination, setDestination] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                // Gọi API bạn vừa tạo ở Bước 1
                const res = await axios.get(`http://localhost:8082/api/destinations/${id}`);
                setDestination(res.data);
            } catch (error) {
                console.error("Lỗi tải địa điểm:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
    if (!destination) return <div className="text-center mt-5"><h3>Không tìm thấy địa điểm!</h3></div>;

    return (
        <div className="destination-detail-page" style={{ paddingBottom: '50px' }}>
            {/* 1. Banner Ảnh Lớn */}
            <div style={{ 
                width: '100%', 
                height: '400px', 
                backgroundImage: `url(${destination.image || 'https://via.placeholder.com/1200x400'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    padding: '20px', color: '#fff'
                }}>
                    <Container>
                        <h1 style={{ fontWeight: 'bold' }}>{destination.name}</h1>
                        <p><i className="fas fa-map-marker-alt"></i> {destination.location}</p>
                    </Container>
                </div>
            </div>

            {/* 2. Nội dung chi tiết */}
            <Container className="mt-5">
                <Row>
                    <Col md={8}>
                        <h3 className="mb-4" style={{borderLeft: '5px solid #0d6efd', paddingLeft: '15px'}}>Giới thiệu</h3>
                        <div style={{ lineHeight: '1.8', fontSize: '16px', color: '#444', whiteSpace: 'pre-line' }}>
                            {destination.description || "Đang cập nhật mô tả..."}
                        </div>
                    </Col>
                    
                    <Col md={4}>
                        {/* Sidebar thông tin / Bản đồ nhỏ */}
                        <div className="p-4 shadow-sm rounded" style={{ background: '#f8f9fa' }}>
                            <h5 className="mb-3">Thông tin nhanh</h5>
                            <hr />
                            <p><strong>Toạ độ:</strong> {destination.latitude}, {destination.longitude}</p>
                            
                            {/* Nút xem bản đồ (Mở Google Maps thật) */}
                            <Button 
                                variant="outline-primary" 
                                className="w-100 mb-3"
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`, '_blank')}
                            >
                                🗺️ Xem trên Google Maps
                            </Button>

                            <Button variant="primary" className="w-100" onClick={() => navigate('/search?type=tour')}>
                                🛶 Tìm Tour đến đây
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default DestinationDetailPage;