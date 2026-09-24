import { describe, expect, it } from 'vitest';
import { parseStockMaster, searchStockMaster } from './stockMasterService';

const stockMasterText = [
  '005930,삼성전자,코스피,ST',
  '005935,삼성전자우,코스피,ST',
  '035720,카카오,코스피,ST',
  '247540,에코프로비엠,코스닥,ST',
].join('\n');

describe('stockMasterService', () => {
  const stocks = parseStockMaster(stockMasterText);

  it('종목 마스터를 파싱하고 시장을 정규화한다', () => {
    expect(stocks).toHaveLength(4);
    expect(stocks[0]).toEqual({
      stockCode: '005930',
      stockName: '삼성전자',
      marketType: 'KOSPI',
      stockType: 'ST',
    });
    expect(stocks[3].marketType).toBe('KOSDAQ');
  });

  it('종목명과 종목코드로 검색한다', () => {
    expect(searchStockMaster(stocks, '삼성').map((stock) => stock.stockCode))
      .toEqual(['005930', '005935']);
    expect(searchStockMaster(stocks, '2475')[0].stockName).toBe('에코프로비엠');
  });

  it('시장 정보가 없는 해외 종목에는 해외 기본값을 적용한다', () => {
    const overseasStocks = parseStockMaster(
      'AAPL,애플,\nMSFT,마이크로소프트,',
      { marketType: 'US', stockType: 'ST' },
    );

    expect(overseasStocks).toEqual([
      { stockCode: 'AAPL', stockName: '애플', marketType: 'US', stockType: 'ST' },
      { stockCode: 'MSFT', stockName: '마이크로소프트', marketType: 'US', stockType: 'ST' },
    ]);
    expect(searchStockMaster(overseasStocks, 'AAPL')[0].stockName).toBe('애플');
  });
});
