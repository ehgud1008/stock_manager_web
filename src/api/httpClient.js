import axios from 'axios';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedMessage = error.response?.data?.message
      || (error.code === 'ECONNABORTED' ? '요청 시간이 초과되었습니다.' : '서버에 연결할 수 없습니다.');
    const normalizedError = new Error(normalizedMessage);
    normalizedError.status = error.response?.status;
    normalizedError.code = error.response?.data?.code || error.code;
    return Promise.reject(normalizedError);
  },
);

export default httpClient;
