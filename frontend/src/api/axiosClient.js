import axios from 'axios';
const axiosClient = axios.create({
  baseURL: 'http://localhost:8080', // backend của bạn
  headers: { 'Content-Type': 'application/json' },
});
export default axiosClient;
