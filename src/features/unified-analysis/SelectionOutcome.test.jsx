import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScenarioMonitoringTable from './ScenarioMonitoringTable';
const row = { runId: 'selection-one', selectionDate: '2026-10-16', code: '171090', name: '테스트 종목', stock: {
  name: '테스트 종목', disposition: 'WATCH', status: 'WATCH_ONLY', dataState: 'CURRENT', notes: [], history: [],
  scenario: { entryFrom: 81800, entryTo: 82600, targets: [97100], stopLoss: 79011 }, latestPriceDate: '2026-10-30', latestClose: 78300,
  outcome: { result: 'WATCH_ONLY', summary: '관찰 대상 · 매매 수익 판정 없음', entryPrice: null },
  selectionOutcome: { result: 'FAILURE_STOP', eventDate: '2026-10-29', summary: '선정 실패 · 손절 기준 선행 도달 · 2026-10-29', eventCloseReturnPercent: -5.21 }
} };
describe('선정 평가와 매매 평가 분리', () => {
  it('관찰 종목의 손절 실패와 미진입을 함께 표시하고 불필요한 미확인 손익은 숨긴다', () => {
    render(<ScenarioMonitoringTable rows={[row]} showSelection />);
    const table = screen.getByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    expect(table).toHaveTextContent('선정 실패 · 손절 도달'); expect(table).toHaveTextContent('2026-10-29');
    expect(table).toHaveTextContent('손익 산정 대상 아님');
    fireEvent.click(screen.getByRole('button', { name: '상세보기' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('선정 실패 · 손절 기준 선행 도달');
    expect(dialog).toHaveTextContent('미진입 · 모의 손익 산정 대상 아님');
    expect(dialog).not.toHaveTextContent('비용 차감 전 손익 미확인');
  });
  it('목표 미달 실패와 기간 종료 수익을 혼동하지 않는다', () => {
    render(<ScenarioMonitoringTable rows={[{ ...row, stock: { ...row.stock, status: 'PERIOD_ENDED',
      selectionOutcome: { result: 'FAILURE_TIMEOUT', eventDate: '2026-11-13' },
      outcome: { result: 'TIME_PROFIT', netReturnPercent: 3.5 } } }]} showSelection />);
    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('선정 실패 · 20거래일 목표 미달');
    expect(table).toHaveTextContent('기간 종료 · 수익'); expect(table).toHaveTextContent('종료 3.5%');
  });
  it('단일 보고서에서도 선정 성공과 관찰 매매 상태를 별도로 표시한다', () => {
    render(<ScenarioMonitoringTable rows={[{ ...row, stock: { ...row.stock, selectionOutcome: { result: 'SUCCESS', eventDate: '2026-10-23' } } }]} />);
    const table = screen.getByRole('table', { name: '선정 종목 시나리오 추적' });
    expect(within(table).getByText(/선정 성공 · 목표 달성/)).toBeInTheDocument();
    expect(table).toHaveTextContent('관찰 대상 · 진입 가정 없음');
  });
});
