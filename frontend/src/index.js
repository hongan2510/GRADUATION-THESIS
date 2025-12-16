import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CSS Imports
import 'bootstrap/dist/css/bootstrap.min.css';
// SỬA MỚI: Thêm JS của Bootstrap để các dropdown hoạt động
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; 
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-datepicker/dist/react-datepicker.css'; // (Cho SearchBox)
import './App.css';

// SỬA 1: Import AuthProvider (Sửa đường dẫn thêm .jsx)
import { AuthProvider } from './context/AuthContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* SỬA 2: Bọc toàn bộ <App /> bằng <AuthProvider> */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);