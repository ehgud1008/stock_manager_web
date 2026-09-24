import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AppRouter from './AppRouter';

describe('AppRouter', () => {
  it('잘못된 URL은 NotFoundPage를 표시한다', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument();
  });
});
