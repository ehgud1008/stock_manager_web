import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupportedBackdataTrs, validateKiwoomBackdata, validateKiwoomBackdataBatch } from '../../api/backtestApi';
import BacktestPage from './BacktestPage';

vi.mock('../../api/backtestApi', () => ({
  getSupportedBackdataTrs: vi.fn(),
  validateKiwoomBackdata: vi.fn(),
  validateKiwoomBackdataBatch: vi.fn(),
}));

const supportedTrs = ['ka10081', 'ka10086', 'ka10059'].map((apiId) => ({
  apiId,
  name: apiId,
  datasetType: 'DAILY_PRICE',
  historicalBackfillSupported: true,
}));

describe('BacktestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupportedBackdataTrs.mockResolvedValue({ success: true, data: supportedTrs });
    validateKiwoomBackdataBatch.mockResolvedValue({
      success: true,
      data: {
        runId: 'run-001',
        profile: 'BACKTEST_READY',
        backtestReady: true,
        sourceCalls: supportedTrs.map(({ apiId }) => ({ apiId, apiName: apiId, recordCount: 10, continuation: { hasNext: false, nextKey: '' } })),
        summary: { totalRecords: 30, validRecords: 29, quarantinedRecords: 1, issueCount: 1, issuesBySeverity: { WARNING: 1 } },
        issues: [{ code: 'TEST_WARNING', severity: 'WARNING', message: '테스트 경고', recordIndex: 0, apiId: 'ka10081', stockCode: '005930', businessDate: '2025-01-03' }],
        validRecords: [],
        quarantinedRecords: [],
      },
    });
  });

  it('지원 전문을 확인하고 핵심 3종 배치 검증 결과를 표시한다', async () => {
    const user = userEvent.setup();
    render(<BacktestPage />, { wrapper: MemoryRouter });

    expect(await screen.findByText(/지원 전문 3개/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '백데이터 검증 실행' }));

    await waitFor(() => expect(validateKiwoomBackdataBatch).toHaveBeenCalledWith({
      profile: 'BACKTEST_READY',
      queries: [
        { apiId: 'ka10081', asOfDate: '2025-01-03', request: { stk_cd: '005930', base_dt: '20250103', upd_stkpc_tp: '1' } },
        { apiId: 'ka10086', asOfDate: '2025-01-03', request: { stk_cd: '005930', qry_dt: '20250103', indc_tp: '0' } },
        { apiId: 'ka10059', asOfDate: '2025-01-03', request: { dt: '20250103', stk_cd: '005930', amt_qty_tp: '2', trde_tp: '0', unit_tp: '1' } },
      ],
    }));
    expect(await screen.findByText('백테스트 사용 가능')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.getByText(/TEST_WARNING/)).toBeInTheDocument();
    expect(validateKiwoomBackdata).not.toHaveBeenCalled();
  });
});
