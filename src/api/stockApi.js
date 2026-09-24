import httpClient from './httpClient';

export const searchStocks = async (keyword) => {
  const response = await httpClient.get('/v1/stocks', { params: { keyword } });
  return response.data;
};
