import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppRouter from './AppRouter';
import * as api from '../../api/unifiedAnalysisApi';
vi.mock('../../api/unifiedAnalysisApi');
describe('AppRouter', () => {
  beforeEach(() => { vi.clearAllMocks(); api.listDailyReports.mockResolvedValue({ enabled: false, reports: [] }); });
  it('잘못된 URL은 NotFoundPage를 표시한다', () => {
    render(<MemoryRouter initialEntries={['/unknown-route']}><AppRouter /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument();
  });
  it('새 리포트 경로를 열고 모바일 메뉴에서 선택 상태를 표시한다', async () => {
    render(<MemoryRouter initialEntries={['/daily-reports']}><AppRouter /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '장 마감 리포트' })).toBeInTheDocument();
    await screen.findByText(/보고서 기능이 비활성화/);
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    expect(await screen.findByRole('link', { name: '장 마감 리포트' })).toHaveAttribute('aria-current', 'page');
    expect(api.requestDailyReport).not.toHaveBeenCalled();
  });
});
