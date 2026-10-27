import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SelectionAuditPanel, { SelectionAuditView } from './SelectionAuditPanel';
import * as api from '../../api/portfolioApi';
vi.mock('../../api/portfolioApi');
const audit = { runId: 'a', state: 'READY', target: 10, recorded: 9, missingRecords: 1, commonEligible: 3, dataUnavailable: 2, invalidInput: 1,
  singleFailure: 1, multipleFailures: 4, rankLimited: 0, nearMissTotal: 1, nearMisses: [{ code: '005930', name: '삼성전자', rule: '시장 대비 강도' }],
  rules: [{ code: 'RELATIVE_RETURN20', label: '시장 대비 강도', failed: 3, unknown: 2, onlyFailure: 1 }], limitations: ['자료 미확인은 별도 집계합니다.'] };
const reports = [{ id: 'a', tradeDate: '2026-10-13' }, { id: 'b', tradeDate: '2026-10-14' }];
describe('선정 조건 진단', () => {
  beforeEach(() => vi.resetAllMocks());
  it('separates missing data and failed rules', () => {
    render(<SelectionAuditView audit={audit} />);
    expect(screen.getByText(/자료 미확인 2종목 · 입력 오류 1종목 · 근거 미저장 1종목/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '조건별 탈락 원인' })).toHaveTextContent('이 조건만 미충족');
    expect(screen.getByText(/삼성전자 \(005930\) · 시장 대비 강도/)).toBeInTheDocument();
  });
  it('does not fetch until selection or register an evaluation on read', async () => {
    api.getSelectionAudit.mockResolvedValue(audit);
    render(<SelectionAuditPanel reports={reports} />);
    expect(api.getSelectionAudit).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '진단할 보고서' }));
    fireEvent.click(screen.getByRole('option', { name: '2026-10-13 · a' }));
    await screen.findByText(/공통 진입 통과 3종목/);
    expect(api.createPortfolio).not.toHaveBeenCalled(); expect(api.sendTelegramTest).not.toHaveBeenCalled();
  });
  it('discards a late response from the previous report', async () => {
    let resolve; api.getSelectionAudit.mockImplementation(id => id === 'a' ? new Promise(r => { resolve = r; }) : Promise.resolve({ ...audit, runId: 'b', commonEligible: 7 }));
    render(<SelectionAuditPanel reports={reports} />);
    fireEvent.mouseDown(screen.getByRole('combobox')); fireEvent.click(screen.getByRole('option', { name: '2026-10-13 · a' }));
    await waitFor(() => expect(api.getSelectionAudit).toHaveBeenCalledTimes(1));
    fireEvent.mouseDown(screen.getByRole('combobox')); fireEvent.click(screen.getByRole('option', { name: '2026-10-14 · b' }));
    await screen.findByText(/공통 진입 통과 7종목/);
    await act(async () => resolve(audit));
    expect(screen.queryByText(/공통 진입 통과 3종목/)).not.toBeInTheDocument();
  });
  it('does not show fabricated zero statistics for historical unsupported reports', () => {
    render(<SelectionAuditView audit={{ state: 'UNSUPPORTED' }} />);
    expect(screen.getByText(/이전 보고서는/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
