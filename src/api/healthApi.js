import httpClient from './httpClient';

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

export const getHealth = async () => {
  if (useMocks) {
    return { success: true, code: 'SUCCESS', message: '화면용 Mock API 연결됨', data: { status: 'UP' } };
  }
  const response = await httpClient.get('/v1/health');
  return response.data;
};
