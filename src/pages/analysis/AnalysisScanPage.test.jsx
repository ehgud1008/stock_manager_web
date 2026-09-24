import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalysisScanPage from './AnalysisScanPage';
import * as api from '../../api/analysisScanApi';
import { completedAnalysisMock } from '../../mocks/analysisMockData';
vi.mock('../../api/analysisScanApi');
const run = { runId: 'scan-1', market: 'ALL', baseDate: '2026-09-18', engineVersion: 'analysis-v6-swing', status: 'COMPLETED', total: 2, completed: 2, failed: 0, skipped: 0 };
const item = { stockCode: '005930', stockName: '삼성전자', market: 'KOSPI', status: 'COMPLETED', quality: 'PARTIAL', priceDate: '2026-09-18', analysisRunId: 101,
  totalScore: 76.2, riseScore: 80, entryScore: 70, riskScore: 60, buySignal: 'BREAKOUT', buyState: 'CONFIRMED', entryStatus: 'CHASE_BLOCKED',
  currentPrice: 71000.123, entryFrom: 70000, entryTo: 71000, targetOne: 76000, targetTwo: null, stopPrice: 67000, rewardRisk: 1.25 };
const page = { run, totalElements: 1, page: 0, size: 20, content: [item] };
const setup = () => render(<MemoryRouter><AnalysisScanPage /></MemoryRouter>);
describe('전체 종목분석', () => {
  beforeEach(() => {
    vi.resetAllMocks(); api.listAnalysisScans.mockResolvedValue([run]); api.getAnalysisScanItems.mockResolvedValue(page);
    api.getAnalysisScanDetail.mockResolvedValue(completedAnalysisMock);
  });
  it('저장 결과만 조회하며 실행이나 상세 재분석을 자동 요청하지 않는다', async () => {
    setup(); expect(await screen.findByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('돌파 · 확정')).toBeInTheDocument(); expect(screen.getByText('추격 보류')).toBeInTheDocument();
    expect(screen.getByText('71,000')).toBeInTheDocument(); expect(screen.queryByText('71,000.123')).not.toBeInTheDocument();
    expect(api.startAnalysisScan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '상세' }));
    expect(await screen.findByText('72.5')).toBeInTheDocument();
    expect(api.getAnalysisScanDetail).toHaveBeenCalledWith('scan-1', '005930', expect.any(AbortSignal));
    expect(screen.getByText(/상세 조회는 재분석이나 실시간 시세 조회를 실행하지 않습니다/)).toBeInTheDocument();
  });
  it('검색 조건을 서버에 전달한다', async () => {
    setup(); await screen.findByText('삼성전자');
    fireEvent.change(screen.getByLabelText('최소 손익비'), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText('종목명·코드'), { target: { value: '삼성' } });
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    await waitFor(() => expect(api.getAnalysisScanItems).toHaveBeenLastCalledWith('scan-1', expect.objectContaining({ search: '삼성', minRewardRisk: '1.5', page: 0 }), expect.any(AbortSignal)));
  });
  it('실행을 확인받고 요청 키를 전송한다', async () => {
    api.startAnalysisScan.mockResolvedValue(run); setup(); await screen.findByText('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '전체 분석 실행' }));
    expect(api.startAnalysisScan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
    await waitFor(() => expect(api.startAnalysisScan).toHaveBeenCalledWith({ market: 'ALL' }, expect.any(String)));
  });
  it('실패 실행은 완료 종목을 유지하며 재개한다', async () => {
    const partial = { ...run, status: 'COMPLETED_WITH_ERRORS', completed: 1, failed: 1 };
    api.getAnalysisScanItems.mockResolvedValue({ ...page, run: partial }); api.resumeAnalysisScan.mockResolvedValue(run);
    setup(); fireEvent.click(await screen.findByRole('button', { name: '실패·미처리 재개' }));
    expect(screen.getByText(/완료 결과는 유지합니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
    await waitFor(() => expect(api.resumeAnalysisScan).toHaveBeenCalledWith('scan-1'));
  });
  it('실패한 조회를 정상 빈 결과로 숨기지 않는다', async () => {
    api.listAnalysisScans.mockRejectedValue(new Error('DB 연결 실패')); setup();
    expect(await screen.findByText('DB 연결 실패')).toBeInTheDocument();
  });
  it('실행 응답 유실 후 재시도에는 같은 요청 키를 쓴다', async () => {
    api.startAnalysisScan.mockRejectedValueOnce(new Error('응답 유실')).mockResolvedValueOnce(run);
    setup(); await screen.findByText('삼성전자');
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: '전체 분석 실행' }));
      fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
      await waitFor(() => expect(api.startAnalysisScan).toHaveBeenCalledTimes(i + 1));
      if (!i) await screen.findByText('응답 유실');
    }
    expect(api.startAnalysisScan.mock.calls[0][1]).toEqual(api.startAnalysisScan.mock.calls[1][1]);
  });
});
