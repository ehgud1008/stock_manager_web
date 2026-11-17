import httpClient from './httpClient';
const unwrap = ({ data }) => {
  if (!data?.success) throw new Error(data?.message || '계좌 위험 설정 요청에 실패했습니다.');
  return data.data;
};
export const getAccountRisk = signal => httpClient.get('/v1/account-risk', { signal }).then(unwrap);
export const saveAccountRisk = body => httpClient.put('/v1/account-risk', body).then(unwrap);
