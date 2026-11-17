import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AccountRiskSettings from './AccountRiskSettings';
import * as api from '../../api/accountRiskApi';
vi.mock('../../api/accountRiskApi', () => ({ getAccountRisk: vi.fn(), saveAccountRisk: vi.fn() }));
const settings = { totalAssets: 100000, availableCash: 10000, maxLossPerTrade: 500, maxPositionPercent: 5, balanceDate: '2026-11-17', revision: 3 };
describe('AccountRiskSettings', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-17T01:00:00Z')); vi.clearAllMocks(); api.getAccountRisk.mockResolvedValue({ status: 'AVAILABLE', settings }); });
  afterEach(() => vi.useRealTimers());
  it('only reads on entry and sends exact money strings with the saved revision', async () => {
    api.saveAccountRisk.mockResolvedValue({ ...settings, availableCash: '1234.56', revision: 4 });
    render(<AccountRiskSettings />);
    await waitFor(() => expect(screen.getByRole('button', { name: '계좌 위험 설정 저장' })).toBeEnabled());
    expect(api.saveAccountRisk).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/매수 가능 현금/), { target: { value: '1234.56' } });
    fireEvent.click(screen.getByRole('button', { name: '계좌 위험 설정 저장' }));
    await screen.findByText(/저장했습니다. 새 통합 판단부터/);
    expect(api.saveAccountRisk).toHaveBeenCalledWith({ totalAssets: '100000', availableCash: '1234.56', maxLossPerTrade: '500', maxPositionPercent: '5', balanceDate: '2026-11-17', expectedRevision: 3 });
    expect(screen.getByText(/버전 4/)).toBeInTheDocument();
  });
  it('rejects inconsistent amounts and permits explicit zero as a stop limit', async () => {
    render(<AccountRiskSettings />);await waitFor(() => expect(screen.getByRole('button', { name: '계좌 위험 설정 저장' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText(/매수 가능 현금/), { target: { value: '100001' } });
    expect(screen.getByRole('button', { name: '계좌 위험 설정 저장' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/매수 가능 현금/), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: '계좌 위험 설정 저장' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText(/총자산/), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/거래당 허용 손실액/), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: '계좌 위험 설정 저장' })).toBeEnabled();
    expect(api.saveAccountRisk).not.toHaveBeenCalled();
  });
  it('shows migration and conflict errors without silently overwriting another revision', async () => {
    api.getAccountRisk.mockResolvedValueOnce({ status: 'UNAVAILABLE', message: '20261117_01_account_risk.sql 적용 필요' });
    render(<AccountRiskSettings />);await screen.findByText(/sql 적용 필요/);
    expect(screen.getByRole('button', { name: '계좌 위험 설정 저장' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '최신 설정 다시 조회' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '계좌 위험 설정 저장' })).toBeEnabled());
    api.saveAccountRisk.mockRejectedValue(Object.assign(new Error('설정 충돌'), { status: 409 }));
    fireEvent.click(screen.getByRole('button', { name: '계좌 위험 설정 저장' }));
    await screen.findByText(/최신 설정을 다시 조회한 뒤 저장하세요/);
    expect(screen.getByText(/버전 3/)).toBeInTheDocument();
  });
});
