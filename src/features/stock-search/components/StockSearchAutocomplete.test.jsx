import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useStockMaster from '../hooks/useStockMaster';
import StockSearchAutocomplete from './StockSearchAutocomplete';

vi.mock('../hooks/useStockMaster', () => ({ default: vi.fn() }));

const stocks = [
  { stockCode: '005930', stockName: '삼성전자', marketType: 'KOSPI', stockType: 'ST' },
  { stockCode: '247540', stockName: '에코프로비엠', marketType: 'KOSDAQ', stockType: 'ST' },
];

const overseasStocks = [
  { stockCode: 'AAPL', stockName: '애플', marketType: 'US', stockType: 'ST' },
  { stockCode: 'MSFT', stockName: '마이크로소프트', marketType: 'US', stockType: 'ST' },
];

function LocationPath() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

describe('StockSearchAutocomplete', () => {
  beforeEach(() => {
    localStorage.clear();
    useStockMaster.mockImplementation((market) => ({
      stocks: market === 'OVERSEAS' ? overseasStocks : stocks,
      status: 'success',
      error: null,
    }));
  });

  it('입력창을 열면 최근 검색이 없어도 기본 종목 목록을 표시한다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StockSearchAutocomplete /></MemoryRouter>);

    await user.click(screen.getByRole('combobox', { name: '종목 검색' }));

    expect(await screen.findByRole('option', { name: /삼성전자.*005930.*KOSPI/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /에코프로비엠.*247540.*KOSDAQ/ })).toBeInTheDocument();
  });

  it('종목명 검색 결과에 코드와 시장을 표시하고 선택 시 상세 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<><StockSearchAutocomplete /><LocationPath /></>} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole('combobox', { name: '종목 검색' });
    await user.type(input, '에코프로');

    expect(await screen.findByText(/247540/)).toBeInTheDocument();
    expect(screen.getByText('KOSDAQ')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /에코프로비엠.*247540.*KOSDAQ/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/analysis/247540');
    expect(JSON.parse(localStorage.getItem('stockscope.recentStocks'))[0].stockCode).toBe('247540');
  });

  it('종목코드로 검색할 수 있다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StockSearchAutocomplete /></MemoryRouter>);

    await user.type(screen.getByRole('combobox', { name: '종목 검색' }), '0059');

    expect(await screen.findByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText(/005930/)).toBeInTheDocument();
  });

  it('해외 버튼을 선택하면 해외 종목명과 티커로 검색한다', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><StockSearchAutocomplete /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: '해외 종목' }));
    const input = screen.getByRole('combobox', { name: '종목 검색' });
    expect(input).toHaveAttribute('placeholder', '해외 종목명 또는 티커 검색');

    await user.type(input, 'AAPL');

    expect(await screen.findByRole('option', { name: /애플.*AAPL.*US/ })).toBeInTheDocument();
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument();
  });
});
