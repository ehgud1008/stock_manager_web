import httpClient from './httpClient';
const unwrap = ({ data }) => {
  if (!data?.success) throw new Error(data?.message || '보유정보 요청에 실패했습니다.');
  return data.data;
};
export const listHoldings = signal => httpClient.get('/v1/holdings', { signal }).then(unwrap);
export const saveHolding = (code, body) => httpClient.put(`/v1/holdings/${encodeURIComponent(code)}`, body).then(unwrap);
