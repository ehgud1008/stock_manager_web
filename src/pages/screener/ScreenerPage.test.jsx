import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import theme from '../../app/theme/theme';
import ScreenerPage from './ScreenerPage';
import * as api from '../../api/screenerApi';
import { fullItemsFixture, itemFixture, pageFixture, runFixture } from '../../test/screenerFixtures';
import { analyzeStockLive } from '../../api/analysisApi';
import { completedAnalysisMock } from '../../mocks/analysisMockData';

vi.mock('../../api/screenerApi');
vi.mock('../../api/analysisApi', () => ({ analyzeStockLive: vi.fn() }));
vi.mock('../../features/stock-chart/components/StockChartPanel', () => ({
  default: ({ stockCode, basic, realData }) => <div aria-label="상세 가격 차트">{stockCode} {basic && '기본 차트'} {realData && '실제 가격'}</div>,
}));
const setup = () => render(<ThemeProvider theme={theme}><ScreenerPage /></ThemeProvider>);
const results = () => screen.getByRole('table', { name: 'EMA 스크리닝 결과' });
const loaded = () => screen.findByRole('table', { name: 'EMA 스크리닝 결과' });
const expectRows = async (count) => waitFor(() => expect(within(results()).getAllByRole('row')).toHaveLength(count + 1));

describe('DB 페이지 조회 스크리너 화면', () => {
  beforeEach(() => {
    localStorage.clear(); vi.resetAllMocks();
    analyzeStockLive.mockImplementation(async (stockCode, request) => ({ success: true, data: { ...completedAnalysisMock, stockCode, analysisMode: request.analysisMode, baseDate: request.baseDate } }));
    api.loadScreenerSnapshot.mockImplementation(async (mode, interval, _id, _signal, query) => pageFixture(mode, interval, query));
    api.getScreenerRun.mockResolvedValue(runFixture());
    api.getScreenerItem.mockImplementation(async (id, code) => ({ ...fullItemsFixture().find((item) => item.stockCode === code), runId:id }));
  });
  it('실행 상태 정리를 확인한 뒤 중단 상태와 재개 버튼을 표시한다', async () => {
    const running = runFixture('SWING', 0, {status: 'RUNNING'});
    const interrupted = {...running, status: 'INTERRUPTED'};
    localStorage.setItem('stockscope.screener.run.SWING.0', JSON.stringify(running.runId));
    api.getScreenerRun.mockResolvedValue(running);
    api.recoverScreenerRun.mockResolvedValue(interrupted);
    setup();
    fireEvent.click(await screen.findByRole('button', {name: '중단 상태 정리'}));
    expect(api.recoverScreenerRun).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', {name: '실패·중단 재개'})).not.toBeInTheDocument();
    api.getScreenerRun.mockResolvedValue(interrupted);
    api.loadScreenerSnapshot.mockResolvedValue({...pageFixture(), run: interrupted});
    fireEvent.click(screen.getByRole('button', {name: '정리하기'}));
    expect(await screen.findByRole('button', {name: '실패·중단 재개'})).toBeInTheDocument();
    await loaded();
    expect(api.recoverScreenerRun).toHaveBeenCalledWith(running.runId);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: '엔진 실행'})).toBeEnabled();
  });
  it('첫 진입은 목록 1회만 요청하고 상세 클릭 때 지정 종목을 조회한다', async () => {
    setup(); await loaded();
    expect(api.startScreenerRun).not.toHaveBeenCalled();
    expect(api.loadScreenerSnapshot).toHaveBeenCalledTimes(1);
    expect(api.loadScreenerSnapshot).toHaveBeenCalledWith('SWING',0,undefined,expect.any(AbortSignal),expect.objectContaining({page:0,size:20}));
    expect(api.getScreenerItem).not.toHaveBeenCalled();
    expect(analyzeStockLive).not.toHaveBeenCalled();
    expect(within(results()).getByText('조회 실패')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:'조회실패종목 상세 보기' }));
    expect(await screen.findByText(/SOURCE_OR_ANALYSIS_FAILED/)).toBeInTheDocument();
    expect(api.getScreenerItem).toHaveBeenCalledWith('run-SWING-0','000001',expect.any(AbortSignal));
  });
  it('최근 전환 필터는 서버에 전달하고 상세 판정과 52주 값을 표시한다', async () => {
    setup(); await loaded();
    fireEvent.click(screen.getByRole('button', {name:'6 → 1 전환',exact:true}));
    await expectRows(1);
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),expect.objectContaining({transitionFilter:'6_1',page:0}));
    fireEvent.click(screen.getByRole('button', {name:'삼성전자 상세 보기'}));
    const detail = await screen.findByRole('dialog', {name:'삼성전자'});
    expect(within(detail).getByLabelText('상세 가격 차트')).toHaveTextContent('005930 기본 차트 실제 가격');
    expect(await within(detail).findByText('STRATEGY')).toBeInTheDocument();
    expect(within(detail).getByText('스윙 눌림목 대기')).toBeInTheDocument();
    expect(analyzeStockLive).toHaveBeenCalledWith('005930', expect.objectContaining({ analysisMode: 'SWING', forceRecalculate: true }));
    expect(within(detail).getByText('직전 봉 스테이지').parentElement).toHaveTextContent('S1');
    expect(within(detail).getByText('직전의 다른 스테이지').parentElement).toHaveTextContent('S6');
    expect(within(detail).getByText('52주 고점').parentElement).toHaveTextContent('90,000원');
    expect(within(detail).getByText('거래대금 (마지막 분석 봉)').parentElement).toHaveTextContent('123.45억원');
  });
  it('스테이지·검색 필터와 빈 결과 초기화가 서버 조회로 동작한다', async () => {
    setup(); await loaded();
    fireEvent.click(screen.getByRole('button', {name:'Stage 6 상승 전환 필터'})); await expectRows(1);
    // Stage 1 is still counted: the stage card aggregate excludes only the selected stage.
    expect(within(screen.getByRole('button', {name:'Stage 1 상승 추세 필터'})).getByText('1')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', {name:'종목명·코드 검색'}), {target:{value:'없는종목'}});
    expect(await screen.findByText('조건에 맞는 종목이 없습니다')).toBeInTheDocument();
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),expect.objectContaining({stage:6,search:'없는종목'}));
    fireEvent.click(screen.getByRole('button', {name:'필터 초기화'})); await expectRows(3);
  });
  it('모드·봉 주기를 전달하고 모드별 필터를 보존한다', async () => {
    setup(); await loaded();
    fireEvent.click(screen.getByRole('button', {name:'Stage 6 상승 전환 필터'})); await expectRows(1);
    fireEvent.click(screen.getByRole('tab', {name:'단타 스크리너'})); await loaded();
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SHORT_TERM',5,undefined,expect.any(AbortSignal),expect.objectContaining({stage:null}));
    fireEvent.click(screen.getByRole('button', {name:'1분',exact:true})); await loaded();
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SHORT_TERM',1,undefined,expect.any(AbortSignal),expect.any(Object));
    fireEvent.click(screen.getByRole('tab', {name:'스윙 스크리너'})); await loaded();
    expect(screen.getByRole('button', {name:'Stage 6 상승 전환 필터'})).toHaveAttribute('aria-pressed','true');
  });
  it('관찰종목을 복원하고 서버에 코드 목록과 빈 관찰 조건을 전달한다', async () => {
    const view = setup(); await loaded();
    fireEvent.click(screen.getByRole('button', {name:'삼성전자 관찰 추가'}));
    view.unmount(); setup(); await loaded();
    fireEvent.click(screen.getByRole('switch', {name:'관찰종목만'})); await expectRows(1);
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),expect.objectContaining({watchOnly:true,watchedCodes:['005930']}));
    fireEvent.click(screen.getByRole('button', {name:'삼성전자 관찰 해제'}));
    expect(await screen.findByText('조건에 맞는 종목이 없습니다')).toBeInTheDocument();
  });
  it('전체 51종목 중 첫 20개만 표시하고 다음 페이지·정렬은 서버에 요청한다', async () => {
    const items = Array.from({length:51}, (_,i) => itemFixture(String(i).padStart(6,'0'),'종목'+i,1));
    api.loadScreenerSnapshot.mockImplementation(async (mode, interval, _id, _signal, query) => pageFixture(mode,interval,query,items));
    setup(); await expectRows(20);
    expect(screen.getByText('1–20 / 51종목')).toBeInTheDocument();
    expect(within(screen.getByRole('button', {name:'Stage 1 상승 추세 필터'})).getByText('51')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'다음 페이지'}));
    await waitFor(() => expect(screen.getByText('21–40 / 51종목')).toBeInTheDocument());
    expect(api.loadScreenerSnapshot).toHaveBeenCalledTimes(2);
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),expect.objectContaining({page:1,size:20}));
    expect(api.getScreenerRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('거래대금 (억원)'));
    await waitFor(() => expect(screen.getByText('1–20 / 51종목')).toBeInTheDocument());
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),expect.objectContaining({page:0,sort:'tradingAmount',descending:false}));
  });
  it('거래대금 입력 단위를 백만원으로 변환해 전달한다', async () => {
    setup(); await loaded();
    fireEvent.change(screen.getByRole('spinbutton', {name:'최소 거래대금 (억원)'}),{target:{value:'123.45'}});
    await expectRows(2);
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),expect.objectContaining({minTradingAmountMillionWon:'12345'}));
  });
  it('실행 대화상자에서 지정한 범위만 등록한다', async () => {
    api.startScreenerRun.mockResolvedValue(runFixture());
    setup(); await loaded();
    fireEvent.click(screen.getByRole('button', {name:'엔진 실행',exact:true}));
    fireEvent.change(screen.getByRole('textbox', {name:'종목 코드 (선택)'}),{target:{value:'005930,005930 000660'}});
    fireEvent.click(screen.getByRole('button', {name:'분석 시작'}));
    await waitFor(() => expect(api.startScreenerRun).toHaveBeenCalledWith({mode:'SWING',interval:0,market:'ALL',stockCodes:['000660','005930']},expect.any(String)));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('목록 오류 시 재조회하며 샘플로 대체하지 않는다', async () => {
    api.loadScreenerSnapshot.mockRejectedValueOnce(new Error('스크리너 테이블 오류'));
    setup();
    expect(await screen.findByText(/스크리너 테이블 오류/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'결과 조회',exact:true})); await loaded();
  });
  it('상세 요청 실패 후 목록을 재조회하지 않고 상세만 재시도한다', async () => {
    api.getScreenerItem.mockRejectedValueOnce(new Error('상세 조회 실패'));
    setup(); await loaded();
    fireEvent.click(screen.getByRole('button', {name:'삼성전자 상세 보기'}));
    expect(await screen.findByText('상세 조회 실패')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'상세 다시 조회'}));
    await screen.findByRole('dialog', {name:'삼성전자'});
    expect(api.getScreenerItem).toHaveBeenCalledTimes(2);
    expect(api.loadScreenerSnapshot).toHaveBeenCalledTimes(1);
  });
  it('빈 실행 결과는 첫 실행을 안내한다', async () => {
    api.loadScreenerSnapshot.mockResolvedValue({run:null,content:[],storageMode:'DATABASE'});
    setup();
    expect(await screen.findByText('엔진 실행으로 첫 분석을 시작해 주세요.')).toBeInTheDocument();
    expect(api.startScreenerRun).not.toHaveBeenCalled();
  });
  it('경량 목록의 null은 0으로 바꾸지 않고 상세는 별도로 조회한다', async () => {
    const item = itemFixture('005930','삼성전자',1,{stage:null,quality:'INSUFFICIENT_DATA',barsSinceTransition:null,barsInStage:null,ema:null,slopes:null,features:null});
    api.loadScreenerSnapshot.mockResolvedValue(pageFixture('SWING',0,{},[item]));
    api.getScreenerItem.mockResolvedValue({...item,runId:'run-SWING-0'});
    setup(); await loaded();
    expect(within(results()).getByText('표본 부족')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'삼성전자 상세 보기'}));
    const detail = await screen.findByRole('dialog', {name:'삼성전자'});
    expect(within(detail).getByText('거래대금 (마지막 분석 봉)').parentElement).toHaveTextContent('미제공');
  });
});
