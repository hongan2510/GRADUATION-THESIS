import React from "react";

// (Tùy chọn) Bạn có thể import CSS chung của mình nếu cần
// import "../App.css"; 

export default function PrivacyPolicyPage() {
  // Lấy ngày hiện tại để hiển thị
  const currentDate = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          {/* Tiêu đề trang */}
          <h1 className="fw-bold mb-3">Chính sách bảo mật CanThoTravel</h1>
          <p className="text-muted">Lần cập nhật cuối: {currentDate}</p>
          <hr className="my-4" />

          {/* Nội dung chính sách */}
          <div className="privacy-content">
            <h4 className="fw-bold mt-4">1. Giới thiệu</h4>
            <p>
              Chào mừng bạn đến với CanThoTravel ("chúng tôi"). Chúng tôi cam kết
              bảo vệ quyền riêng tư của khách hàng. Chính sách bảo mật này giải
              thích cách chúng tôi thu thập, sử dụng, tiết lộ và bảo vệ thông
              tin của bạn khi bạn truy cập trang web của chúng tôi, sử dụng dịch
              vụ của chúng tôi, hoặc tương tác với chúng tôi.
            </p>

            <h4 className="fw-bold mt-4">2. Thông tin chúng tôi thu thập</h4>
            <p>
              Chúng tôi có thể thu thập thông tin cá nhân từ bạn theo nhiều cách
              khác nhau, bao gồm:
            </p>
            <ul>
              <li>
                <strong>Thông tin nhận dạng cá nhân:</strong> Tên, địa chỉ
                email, số điện thoại, ngày sinh, và thông tin hộ chiếu/CCCD (khi
                cần thiết cho việc đặt vé máy bay hoặc khách sạn).
              </li>
              <li>
                <strong>Thông tin đặt chỗ:</strong> Chi tiết về khách sạn, chuyến
                bay, hoặc tour bạn đặt, bao gồm tên khách sạn, ngày nhận/trả
                phòng, và thông tin thanh toán.
              </li>
              <li>
                <strong>Thông tin thanh toán:</strong> Dữ liệu thẻ tín dụng/ghi
                nợ, thông tin ví điện tử (như VNPay) hoặc chi tiết tài khoản ngân
                hàng để xử lý thanh toán.
              </li>
              <li>
                <strong>Thông tin kỹ thuật:</strong> Địa chỉ IP, loại trình
                duyệt, hệ điều hành, và dữ liệu cookie khi bạn truy cập trang
                web của chúng tôi.
              </li>
            </ul>

            <h4 className="fw-bold mt-4">
              3. Cách chúng tôi sử dụng thông tin
            </h4>
            <p>
              Chúng tôi sử dụng thông tin thu thập được cho các mục đích sau:
            </p>
            <ul>
              <li>
                <strong>Để cung cấp dịch vụ:</strong> Xử lý các đơn đặt phòng
                khách sạn, vé máy bay và tour du lịch của bạn.
              </li>
              <li>
                <strong>Để liên lạc:</strong> Gửi cho bạn xác nhận đặt phòng, cập
                nhật trạng thái, và các thông báo quan trọng khác liên quan đến
                dịch vụ.
              </li>
              <li>
                <strong>Để hỗ trợ khách hàng:</strong> Trả lời các câu hỏi và
                yêu cầu hỗ trợ của bạn.
              </li>
              <li>
                <strong>Để tiếp thị (nếu bạn đồng ý):</strong> Gửi cho bạn các
                chương trình khuyến mãi, ưu đãi đặc biệt và bản tin mà chúng tôi
                nghĩ rằng bạn có thể quan tâm.
              </li>
              <li>
                <strong>Để cải thiện trang web:</strong> Phân tích cách bạn sử
                dụng trang web để cải thiện trải nghiệm người dùng và các dịch vụ
                của chúng tôi.
              </li>
            </ul>

            <h4 className="fw-bold mt-4">4. Chia sẻ thông tin</h4>
            <p>
              CanThoTravel sẽ không bán hoặc cho thuê thông tin cá nhân của bạn.
              Chúng tôi chỉ chia sẻ thông tin của bạn với các bên thứ ba trong
              các trường hợp sau:
            </p>
            <ul>
              <li>
                <strong>Các nhà cung cấp dịch vụ:</strong> (Ví dụ: khách sạn,
                hãng hàng không, công ty tổ chức tour) để hoàn tất việc đặt chỗ
                của bạn.
              </li>
              <li>
                <strong>Đối tác xử lý thanh toán:</strong> (Ví dụ: VNPay, các
                ngân hàng) để xác minh và xử lý thanh toán của bạn một cách an
                toàn.
              </li>
              <li>
                <strong>Yêu cầu pháp lý:</strong> Khi được yêu cầu bởi pháp luật,
                tòa án, hoặc cơ quan chính phủ.
              </li>
            </ul>

            <h4 className="fw-bold mt-4">5. Bảo mật dữ liệu</h4>
            <p>
              Chúng tôi áp dụng các biện pháp bảo mật hành chính, kỹ thuật và vật
              lý phù hợp để bảo vệ thông tin cá nhân của bạn khỏi bị truy cập, sử
              dụng hoặc tiết lộ trái phép. Chúng tôi sử dụng mã hóa SSL cho các
              giao dịch thanh toán.
            </p>

            <h4 className="fw-bold mt-4">6. Quyền của bạn</h4>
            <p>
              Bạn có quyền truy cập, sửa đổi hoặc yêu cầu xóa thông tin cá nhân
              của mình. Bạn cũng có thể từ chối nhận các thông báo tiếp thị từ
              chúng tôi bất cứ lúc nào bằng cách nhấp vào liên kết "Hủy đăng ký"
              trong email.
            </p>

            <h4 className="fw-bold mt-4">7. Thay đổi chính sách</h4>
            <p>
              Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian.
              Phiên bản mới nhất sẽ luôn được đăng trên trang web này kèm theo
              ngày cập nhật.
            </p>

            <h4 className="fw-bold mt-4">8. Liên hệ với chúng tôi</h4>
            <p>
              Nếu bạn có bất kỳ câu hỏi nào về Chính sách bảo mật này, vui lòng
              liên hệ với chúng tôi qua trang "Liên hệ" hoặc email
              hotro@canthotravel.vn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}