import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api/tradeDecisionApi';
import NewsInsightsPanel from './NewsInsightsPanel';
import NewsInsightView from './NewsInsightView';

vi.mock('../../api/tradeDecisionApi', async original => ({ ...await original(), listDecisions: vi.fn(), getDecision: vi.fn(), startNewsInsights: vi.fn(), waitForJob: vi.fn() }));
const context = { lookbackDays: 14, sectorQuery: '' };
const source = { id: 'S1', title: '기업의 업황 관련 보도', excerpt: '', provider: 'GOOGLE_NEWS_RSS', publisher: '예시 언론', publishedDate: '2026-10-10', eventDate: null, depth: 'TITLE_ONLY', topics: ['COMPANY','SECTOR'], url: 'https://example.com/article' };
const result = () => ({ generationMode: 'NEWS_INSIGHTS', context, engine: { priceDate: '2026-10-05', evidence: { ANALYSIS: { totalScore: 70 } } },
  evidence: { sources: [source], collectedAt: '2026-10-11T00:00:00Z', windowStart: '2026-09-28', windowEnd: '2026-10-11', sectorScope: 'COMPANY_CONTEXT', coverage: [{ provider: 'DART', topic: 'DISCLOSURE', status: 'NOT_CONFIGURED', count: 0, detail: '공시 조회 키 미설정' }] },
  report: { summary: '업황 보도를 확보했으나 원문 확인이 필요합니다.', summarySourceIds: ['S1'], events: [{ title: '업황 변화 가능성', sourceIds: ['S1'], quoteSourceId: 'S1', factQuote: source.title, interpretation: '영향을 단정할 근거가 부족합니다.', impactPath: '수요와 매출의 연결 확인 필요', relevance: '해당 기업 관련 보도', counterEvidence: '계약 자료 미확보', engineRelation: 'UNCERTAIN', engineEvidenceIds: ['ANALYSIS'] }], nextChecks: [], limitations: ['제목만 수집했습니다.'] }, changes: { previousId: null, newSourceIds: [] } });
const job = () => ({ id: 'news-one', snapshotId: 'snapshot-one', status: 'SUCCEEDED', context, result: result() });
describe('뉴스·업황 인사이트', () => {
  beforeEach(() => {vi.clearAllMocks();sessionStorage.clear();window.history.replaceState({}, '', '/');api.listDecisions.mockResolvedValue({ items: [], hasMore: false });api.waitForJob.mockImplementation(async value => value);api.startNewsInsights.mockResolvedValue(job());});
  it('성향 입력 없이 명시적으로 요청하며 같은 요청 재사용과 최신 자료 재수집을 구분한다', async () => {
    render(<NewsInsightsPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured embedded />);
    const button = await screen.findByRole('button', { name: '뉴스·업황 분석' });await waitFor(() => expect(button).toBeEnabled());
    expect(api.startNewsInsights).not.toHaveBeenCalled();expect(screen.queryByLabelText('보유 상태')).not.toBeInTheDocument();
    fireEvent.click(button);await screen.findByText('이번 분석에 추가되는 정보');await waitFor(() => expect(button).toBeEnabled());
    expect(api.startNewsInsights).toHaveBeenCalledWith('snapshot-one', context, expect.any(String), expect.any(AbortSignal));
    const firstKey = api.startNewsInsights.mock.calls[0][2];fireEvent.click(button);await waitFor(() => expect(api.startNewsInsights).toHaveBeenCalledTimes(2));await waitFor(() => expect(button).toBeEnabled());
    expect(api.startNewsInsights.mock.calls[1][2]).toBe(firstKey);
    fireEvent.click(screen.getByRole('button', { name: '최신 자료 재수집·새 분석' }));await waitFor(() => expect(api.startNewsInsights).toHaveBeenCalledTimes(3));
    expect(api.startNewsInsights.mock.calls[2][2]).not.toBe(firstKey);
  });
  it('응답 유실 후에는 같은 키로 재시도하고 저장 결과는 조회만 한다', async () => {
    api.startNewsInsights.mockRejectedValueOnce(new Error('응답 유실')).mockResolvedValueOnce(job());
    render(<NewsInsightsPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured embedded />);
    const button = await screen.findByRole('button', { name: '뉴스·업황 분석' });await waitFor(() => expect(button).toBeEnabled());fireEvent.click(button);
    await screen.findByText('응답 유실');fireEvent.click(button);await screen.findByText('이번 분석에 추가되는 정보');
    expect(api.startNewsInsights.mock.calls[0][2]).toBe(api.startNewsInsights.mock.calls[1][2]);
  });
  it('저장된 리포트를 복원하고 검색 조건 변경을 기존 결과와 구분한다', async () => {
    api.listDecisions.mockResolvedValue({ items: [{ id: 'news-one', createdAt: 1, status: 'SUCCEEDED' }], hasMore: false });api.getDecision.mockResolvedValue(job());
    render(<NewsInsightsPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured embedded />);
    await screen.findByText('이번 분석에 추가되는 정보');expect(api.startNewsInsights).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText('관련 업종 검색어 (선택)')).toBeEnabled());fireEvent.change(screen.getByLabelText('관련 업종 검색어 (선택)'), { target: { value: '반도체' } });
    expect(screen.getByText(/검색 조건이 바뀌었습니다/)).toBeInTheDocument();
  });
  it('출처의 날짜·확보 수준·미설정 상태와 엔진 대비 해석을 표시한다', () => {
    render(<NewsInsightView result={result()} />);
    expect(screen.getByText(/게시·접수일 2026-10-10 · 사건 발생일 원문 확인 필요/)).toBeInTheDocument();
    expect(screen.getByText('영향 판단 유보')).toBeInTheDocument();
    const table = within(screen.getByRole('table', { name: '업황 변화 가능성 엔진과 외부 정보 비교' }));expect(table.getByText('종합 점수 70')).toBeInTheDocument();expect(table.getByText('영향을 단정할 근거가 부족합니다.')).toBeInTheDocument();
    expect(screen.getByText('공시 · DART · 미설정 (0건)')).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', source.url);
  });
  it('외부 텍스트와 위험한 URL을 실행하지 않는다', () => {
    const saved = result();saved.evidence.sources[0] = { ...source, url: 'javascript:alert(1)', title: '<img src=x onerror=alert(1)>' };saved.report.summary = '<script>alert(1)</script>';
    render(<NewsInsightView result={saved} />);expect(screen.queryByRole('link')).not.toBeInTheDocument();expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();expect(document.querySelector('script')).toBeNull();
  });
});
