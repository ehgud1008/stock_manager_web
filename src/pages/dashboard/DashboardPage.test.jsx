import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import * as api from '../../api/unifiedAnalysisApi';

vi.mock('../../api/unifiedAnalysisApi');

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listDailyReports.mockResolvedValue({ enabled: true, latestReady: { runId: 'report-1', tradeDate: '2026-11-13' } });
  });
  it('실제 최신 보고서와 주요 목적지로 연결하고 샘플 이력을 표시하지 않는다', async () => {
    render(<DashboardPage />, { wrapper: MemoryRouter });

    expect(screen.getByRole('heading', { name: '오늘의 시장을 한눈에' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '종목 검색' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '시장·선정 종목 보기' })).toHaveAttribute('href', '/daily-reports?runId=report-1');
    expect(screen.getByRole('link', { name: /시장 전체에서 종목 찾기/ })).toHaveAttribute('href', '/unified-analysis');
    expect(screen.getByRole('link', { name: /내 보유종목 확인/ })).toHaveAttribute('href', '/holdings');
    expect(screen.queryByText('최근 분석 이력')).not.toBeInTheDocument();
    expect(api.startUnifiedRun).not.toHaveBeenCalled();
  });
  it('확정 보고서가 없으면 작성 상태를 확인할 수 있는 화면으로 연결한다', async () => {
    api.listDailyReports.mockResolvedValue({ enabled: true });
    render(<DashboardPage />, { wrapper: MemoryRouter });
    expect(await screen.findByText(/아직 확정된 보고서가 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '장 마감 리포트 열기' })).toHaveAttribute('href', '/daily-reports');
  });
  it('조회 실패를 표시하고 재시도하며 이전 보고서를 최신으로 단정하지 않는다', async () => {
    api.listDailyReports.mockRejectedValueOnce(new Error('연결 실패')).mockResolvedValue({ enabled: true, latestReady: { runId: 'old', tradeDate: '2026-11-12' }, expectedTradeDate: '2026-11-13' });
    render(<DashboardPage />, { wrapper: MemoryRouter });
    await screen.findByText(/최신 보고서를 확인하지 못했습니다/);
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    expect(await screen.findByText(/최근 예정 거래일 2026-11-13의 보고서는 아직/)).toBeInTheDocument();
  });
});
