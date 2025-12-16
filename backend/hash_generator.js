import bcrypt from "bcryptjs";

// ĐẶT MẬT KHẨU MỚI DỄ NHỚ CỦA BẠN TẠI ĐÂY
const plainPassword = "new_admin_pass"; 
const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync(plainPassword, salt);

console.log(`Mật khẩu gốc: ${plainPassword}`);
console.log(`Mật khẩu Hash mới (Dùng để dán vào DB): ${hashedPassword}`);