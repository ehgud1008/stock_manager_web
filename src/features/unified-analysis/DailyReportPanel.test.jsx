import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DailyReportPanel from './DailyReportPanel';
import * as api from '../../api/unifiedAnalysisApi';

vi.mock('../../api/unifiedAnalysisApi');
const report = { status: 'READY', tradeDate: '2026-10-13', forecastDate: '2026-10-14', informationAsOf: '2026-10-13T11:30:00Z', finalizedAt: '2026-10-13T11:31:00Z',
  markets: [{ market: 'KOSPI', bias: '중립', dayReturn: 0.2, return20: 2, advancingPercent: 48, aboveEma20Percent: 52, baseScenario: '현재 흐름 유지 확인', upsideScenario: '저항 돌파 시 강화', downsideScenario: '지지 이탈 시 취소', cautions: [] }],
  candidates: [], limitations: ['업종과 공시는 미확인'], assessedStocks: 100, eligibleStocks: 110, version: 'candidate-market-v1' };
describe('장 마감 보고서', () => {
  beforeEach(() => { vi.resetAllMocks(); api.getDailyReport.mockResolvedValue({ state: 'READY', report, notificationState: 'DISABLED' }); });
  it('보고서를 조회만 하며 후보 없음과 실패를 구분한다', async () => {
    const view = render(<DailyReportPanel runId="r1" onDetail={vi.fn()} />);
    expect(await screen.findByText('오늘은 조건을 충족한 종목이 없습니다')).toBeInTheDocument();
    expect(screen.getByText('알림 비활성화')).toBeInTheDocument();
    expect(api.requestDailyReport).not.toHaveBeenCalled();
    view.unmount(); api.getDailyReport.mockResolvedValue({ state: 'FAILED', report: { status: 'FAILED' } });
    render(<DailyReportPanel runId="r2" onDetail={vi.fn()} />);
    expect(await screen.findByText(/오늘 종합분석 작업에 실패했습니다/)).toBeInTheDocument();
    expect(screen.queryByText('오늘은 조건을 충족한 종목이 없습니다')).not.toBeInTheDocument();
  });
  it('관찰 후보와 반대·미확인 근거를 표시하고 저장된 상세를 연다', async () => {
    const stock = { code: '005930', name: '삼성전자', disposition: 'WATCH', relativeReturn20: 2, netRewardRisk: null, cautions: ['진입 조건 미충족'],
      evidence: [{ code: 'STAGE_6_TO_1', label: '6→1 전환', value: 1, unit: '봉', passed: true, role: 'SELECTION', comparison: '3봉 이내' },
        { code: 'LIQUIDITY', label: '거래대금 지속성', value: null, passed: null, role: 'SUPPORT', comparison: '20거래일 필요' }] };
    api.getDailyReport.mockResolvedValue({ state: 'READY', report: { ...report, candidates: [stock] }, notificationState: 'UNKNOWN' });
    const detail = vi.fn();render(<DailyReportPanel runId="r1" onDetail={detail} />);
    fireEvent.click(await screen.findByText('삼성전자 (005930) · 관찰 대상'));
    expect(screen.getByText('진입 조건 미충족')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '삼성전자 선정 근거' })).toHaveTextContent('참고·미확인');
    expect(screen.getByText(/자동 재전송 중지/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장된 종목 분석 보기' }));expect(detail).toHaveBeenCalledWith(stock);
  });
  it('명시적 요청으로만 보고서를 생성한다', async () => {
    api.getDailyReport.mockResolvedValue({ state: 'NOT_CREATED' });api.requestDailyReport.mockResolvedValue({ state: 'PENDING' });
    render(<DailyReportPanel runId="r1" onDetail={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '이 실행의 보고서 생성' }));
    await waitFor(() => expect(api.requestDailyReport).toHaveBeenCalledTimes(1));
  });
  it('실행 변경 시 늦은 이전 응답을 버린다', async () => {
    let resolveOld;api.getDailyReport.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const view = render(<DailyReportPanel runId="old" onDetail={vi.fn()} />);
    view.rerender(<DailyReportPanel runId="new" onDetail={vi.fn()} />);
    await screen.findByText('오늘은 조건을 충족한 종목이 없습니다');
    await act(async () => resolveOld({ state: 'FAILED' }));
    expect(screen.queryByText(/오늘 종합분석 작업에 실패했습니다/)).not.toBeInTheDocument();
  });
});
