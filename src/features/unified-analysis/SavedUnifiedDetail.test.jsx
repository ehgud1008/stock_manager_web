import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SavedUnifiedDetail from './SavedUnifiedDetail';
import * as api from '../../api/unifiedAnalysisApi';

vi.mock('../../api/unifiedAnalysisApi');
vi.mock('./UnifiedAnalysisResults', () => ({ default: ({ data, saved }) => <div>{data.result.priceDate} {saved ? 'saved' : 'latest'}</div> }));
vi.mock('../trade-decision/UnifiedDecisionTab', () => ({ default: () => <div>과거 뉴스 분석</div> }));
const selection = { runId: 'old-report', code: '005930', name: '삼성전자' };
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);
it('최신 모드는 저장 실행을 조회하지 않고 최신 자료로 분석한다', async () => {
  api.analyzeUnifiedStock.mockResolvedValue({ result: { priceDate: '2026-10-22' } });
  render(<SavedUnifiedDetail selection={selection} latest onClose={() => {}} />);
  expect(await screen.findByText('2026-10-22 latest')).toBeInTheDocument();
  expect(api.analyzeUnifiedStock).toHaveBeenCalledWith('005930', expect.any(AbortSignal));
  expect(api.getUnifiedDetail).not.toHaveBeenCalled();
  expect(screen.queryByRole('tab', { name: '뉴스·업황' })).not.toBeInTheDocument();
});
it('최신 조회 실패 시 과거 결과로 대체하지 않고 재시도한다', async () => {
  api.analyzeUnifiedStock.mockRejectedValueOnce(new Error('자료 조회 실패')).mockResolvedValue({ result: { priceDate: '2026-10-22' } });
  render(<SavedUnifiedDetail selection={selection} latest onClose={() => {}} />);
  await screen.findByText('자료 조회 실패');
  fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
  await screen.findByText('2026-10-22 latest');
  expect(api.getUnifiedDetail).not.toHaveBeenCalled();
});
it('기존 보고서의 상세는 당시 저장 분석을 유지한다', async () => {
  api.getUnifiedDetail.mockResolvedValue({ result: { priceDate: '2026-10-16' } });
  render(<SavedUnifiedDetail selection={selection} onClose={() => {}} />);
  await screen.findByText('2026-10-16 saved');
  expect(api.getUnifiedDetail).toHaveBeenCalledWith('old-report', '005930', expect.any(AbortSignal));
  expect(api.analyzeUnifiedStock).not.toHaveBeenCalled();
});
it('종목을 바꾸면 이전 요청을 취소하고 늦은 응답을 버린다', async () => {
  let finish;
  api.analyzeUnifiedStock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ result: { priceDate: 'new-stock' } });
  const view = render(<SavedUnifiedDetail selection={selection} latest onClose={() => {}} />);
  const signal = api.analyzeUnifiedStock.mock.calls[0][1];
  view.rerender(<SavedUnifiedDetail selection={{ ...selection, code: '000080' }} latest onClose={() => {}} />);
  await screen.findByText('new-stock latest');
  expect(signal.aborted).toBe(true);
  finish({ result: { priceDate: 'old-stock' } });
  await waitFor(() => expect(screen.queryByText('old-stock latest')).not.toBeInTheDocument());
});
