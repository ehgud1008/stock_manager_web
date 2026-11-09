import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HoldingsPage from './HoldingsPage';
import * as api from '../../api/holdingsApi';
vi.mock('../../api/holdingsApi');
vi.mock('../../features/stock-search/hooks/useStockMaster', () => ({ default: () => ({ stocks: [{ stockCode: '005930', stockName: '삼성전자', stockType: 'ST' }], status: 'success' }) }));
const row = { stockCode: '005930', stockName: '삼성전자', quantity: 100, averageBuyPrice: 50000, balanceDate: '2026-11-06', revision: 1 };
describe('내 보유종목', () => {
  beforeEach(() => { vi.clearAllMocks(); api.listHoldings.mockResolvedValue([row]); });
  it('수정 시 버전을 전달하고 전량 매도는 0주로 저장한다', async () => {
    api.saveHolding.mockResolvedValue({ ...row, quantity: 0, averageBuyPrice: null, revision: 2 });
    render(<MemoryRouter><HoldingsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    expect(screen.getByLabelText('종목명 또는 종목코드', { exact: false })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('보유수량', { exact: false }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('저장했습니다. 다음 분석 실행부터 반영됩니다.')).toBeInTheDocument();
    expect(api.saveHolding).toHaveBeenCalledWith('005930', expect.objectContaining({ quantity: 0, averageBuyPrice: null, expectedRevision: 1 }));
    expect(screen.getByText('미보유')).toBeInTheDocument();
  });
  it('종목을 검색해 선택한 코드와 이름을 함께 저장한다', async () => {
    api.saveHolding.mockResolvedValue(row);
    render(<MemoryRouter><HoldingsPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('종목명 또는 종목코드', { exact: false }), { target: { value: '삼성' } });
    fireEvent.click(await screen.findByRole('option', { name: '삼성전자 005930' }));
    fireEvent.change(screen.getByLabelText('보유수량', { exact: false }), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('평균 매입단가', { exact: false }), { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(api.saveHolding).toHaveBeenCalledWith('005930', expect.objectContaining({ stockName: '삼성전자', quantity: 100 }));
  });
  it('조회 실패를 빈 잔고로 확정하지 않고 오류를 표시한다', async () => {
    api.listHoldings.mockRejectedValue(new Error('잔고 조회 실패'));
    render(<MemoryRouter><HoldingsPage /></MemoryRouter>);
    expect(await screen.findByText('잔고 조회 실패')).toBeInTheDocument();
    expect(api.saveHolding).not.toHaveBeenCalled();
  });
});
