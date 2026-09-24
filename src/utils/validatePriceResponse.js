import { PRICE_DATA_STATUS } from '../constants/priceDataStatuses';

const knownStatuses = new Set(Object.values(PRICE_DATA_STATUS));

export const validatePriceResponse = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('가격 데이터 응답 형식이 올바르지 않습니다.');
  }
  if (!knownStatuses.has(data.status)) {
    throw new Error('가격 데이터 상태를 확인할 수 없습니다.');
  }
  if (!Array.isArray(data.candles)) {
    throw new Error('가격 데이터 목록 형식이 올바르지 않습니다.');
  }
  return data;
};
