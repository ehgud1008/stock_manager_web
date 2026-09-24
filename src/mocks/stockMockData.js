export const stockSearchOptions = Object.freeze([
  { stockCode: '005930', stockName: '삼성전자', marketType: 'KOSPI' },
  { stockCode: '000660', stockName: 'SK하이닉스', marketType: 'KOSPI' },
  { stockCode: '035420', stockName: 'NAVER', marketType: 'KOSPI' },
  { stockCode: '035720', stockName: '카카오', marketType: 'KOSPI' },
]);

export const watchlistMock = Object.freeze([
  { stockCode: '005930', stockName: '삼성전자', marketType: 'KOSPI', note: '화면 구성 확인용' },
  { stockCode: '000660', stockName: 'SK하이닉스', marketType: 'KOSPI', note: '실시간 시세 아님' },
  { stockCode: '035420', stockName: 'NAVER', marketType: 'KOSPI', note: '샘플 종목 정보' },
]);

export const recentAnalysisMock = Object.freeze([
  { stockCode: '005930', stockName: '삼성전자', mode: 'SWING', status: '준비 중', date: '화면용 샘플' },
  { stockCode: '000660', stockName: 'SK하이닉스', mode: 'SHORT_TERM', status: '준비 중', date: '화면용 샘플' },
]);
