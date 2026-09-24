import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  it('주요 영역을 렌더링한다', () => {
    render(<DashboardPage />, { wrapper: MemoryRouter });

    expect(screen.getByRole('heading', { name: '오늘의 시장을 한눈에' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '종목 검색' })).toBeInTheDocument();
    expect(screen.getByText('최신 스크리닝 후보')).toBeInTheDocument();
    expect(screen.getByText('최근 분석 이력')).toBeInTheDocument();
    expect(screen.getByText('서버 연결 상태')).toBeInTheDocument();
  });
});
