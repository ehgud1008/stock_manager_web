import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useScreener from './useScreener';
import * as api from '../../api/screenerApi';
import { pageFixture, runFixture } from '../../test/screenerFixtures';
vi.mock('../../api/screenerApi');
describe('screener job lifecycle', () => {
  beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); api.loadScreenerSnapshot.mockResolvedValue(pageFixture()); });
  afterEach(() => vi.useRealTimers());
  it('스윙 진입 시 어제 저장된 실행 대신 최신 완료 배치를 조회하고 이후 페이지는 고정한다', async () => {
    localStorage.setItem('stockscope.screener.run.SWING.0', JSON.stringify('yesterday'));
    api.getScreenerRun.mockResolvedValue(runFixture('SWING',0,{runId:'yesterday'}));
    api.loadScreenerSnapshot.mockResolvedValue({...pageFixture(),run:runFixture('SWING',0,{runId:'overnight'})});
    const { result, rerender } = renderHook(({page}) => useScreener('SWING',0,{page}), {initialProps:{page:0}});
    await waitFor(() => expect(result.current.run?.runId).toBe('overnight'));
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,undefined,expect.any(AbortSignal),{page:0});
    rerender({page:1});
    await waitFor(() => expect(api.loadScreenerSnapshot).toHaveBeenCalledTimes(2));
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'overnight',expect.any(AbortSignal),{page:1});
  });
  it('단타는 저장된 실행 선택 동작을 유지한다', async () => {
    localStorage.setItem('stockscope.screener.run.SHORT_TERM.5', JSON.stringify('saved-minute'));
    api.getScreenerRun.mockResolvedValue(runFixture('SHORT_TERM',5,{runId:'saved-minute'}));
    api.loadScreenerSnapshot.mockResolvedValue(pageFixture('SHORT_TERM',5));
    const { result } = renderHook(() => useScreener('SHORT_TERM',5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.loadScreenerSnapshot).toHaveBeenCalledWith('SHORT_TERM',5,'saved-minute',expect.any(AbortSignal),{});
  });
  it('진행 상태를 polling하고 완료 후 결과를 조회한다', async () => {
    vi.useFakeTimers();
    localStorage.setItem('stockscope.screener.run.SWING.0',JSON.stringify('running'));
    api.getScreenerRun.mockResolvedValueOnce(runFixture('SWING',0,{runId:'running',status:'RUNNING'})).mockResolvedValueOnce(runFixture('SWING',0,{runId:'running'}));
    const { result, unmount } = renderHook(() => useScreener('SWING',0));
    await act(async () => {});
    expect(result.current.run.status).toBe('RUNNING');
    expect(api.loadScreenerSnapshot).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(api.loadScreenerSnapshot).toHaveBeenCalledWith('SWING',0,'running',expect.any(AbortSignal),{});
    expect(result.current.data.content).toHaveLength(3);
    unmount();
    const calls = api.getScreenerRun.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(api.getScreenerRun).toHaveBeenCalledTimes(calls);
  });
  it('실행 요청 실패 후 같은 조건은 동일 요청 키로 재시도한다', async () => {
    api.startScreenerRun.mockRejectedValue(new Error('timeout'));
    const { result } = renderHook(() => useScreener('SWING',0));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const request={mode:'SWING',interval:0,market:'ALL',stockCodes:['005930']};
    await act(async () => { await result.current.start(request); });
    await act(async () => { await result.current.start(request); });
    expect(api.startScreenerRun.mock.calls[0][1]).toEqual(api.startScreenerRun.mock.calls[1][1]);
    expect(result.current.error).toContain('timeout');
  });
  it('이전 화면의 늦은 응답은 새 화면을 덮어쓰지 않는다', async () => {
    let finish;
    api.loadScreenerSnapshot.mockReturnValueOnce(new Promise(resolve => {finish=resolve;}));
    const old = renderHook(() => useScreener('SWING',0));
    old.unmount();
    api.loadScreenerSnapshot.mockResolvedValue(pageFixture('SHORT_TERM',5));
    const next = renderHook(() => useScreener('SHORT_TERM',5));
    await waitFor(() => expect(next.result.current.loading).toBe(false));
    await act(async () => {finish(pageFixture());});
    expect(next.result.current.run.request.mode).toBe('SHORT_TERM');
  });
  it('중단 상태 정리 후 polling이 끝나고 중단 상태를 표시한다', async () => {
    vi.useFakeTimers();
    const running = runFixture('SWING', 0, {status: 'RUNNING'});
    const interrupted = {...running, status: 'INTERRUPTED'};
    localStorage.setItem('stockscope.screener.run.SWING.0', JSON.stringify(running.runId));
    api.getScreenerRun.mockResolvedValueOnce(running).mockResolvedValue(interrupted);
    api.recoverScreenerRun.mockResolvedValue(interrupted);
    api.loadScreenerSnapshot.mockResolvedValue({...pageFixture(), run: interrupted});
    const {result, unmount} = renderHook(() => useScreener('SWING', 0));
    await act(async () => {});
    await act(async () => { await result.current.recover(); });
    expect(api.recoverScreenerRun).toHaveBeenCalledWith(running.runId);
    expect(result.current.run.status).toBe('INTERRUPTED');
    expect(result.current.loading).toBe(false);
    const calls = api.getScreenerRun.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(api.getScreenerRun).toHaveBeenCalledTimes(calls);
    expect(api.resumeScreenerRun).not.toHaveBeenCalled();
    unmount();
  });
  it('실제 실행 중이라 정리가 거절되면 오류를 표시하고 상태를 바꾸지 않는다', async () => {
    api.loadScreenerSnapshot.mockResolvedValue({...pageFixture(), run: runFixture('SWING', 0, {status: 'RUNNING'})});
    api.recoverScreenerRun.mockRejectedValue(new Error('실제로 실행 중입니다.'));
    const {result} = renderHook(() => useScreener('SWING', 0));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.recover(); });
    expect(result.current.run.status).toBe('RUNNING');
    expect(result.current.error).toContain('실제로 실행 중');
    expect(result.current.submitting).toBe(false);
  });
  it('재개는 저장된 실행 ID를 사용한다', async () => {
    api.resumeScreenerRun.mockResolvedValue(runFixture());
    api.getScreenerRun.mockResolvedValue(runFixture());
    const { result } = renderHook(() => useScreener('SWING',0));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {await result.current.resume();});
    expect(api.resumeScreenerRun).toHaveBeenCalledWith('run-SWING-0');
  });
  it('페이지 이동은 고정 실행으로 한 번 조회하며 완료 상태 재요청을 생략한다', async () => {
    const { result, rerender } = renderHook(({page}) => useScreener('SWING',0,{page,size:20}), {initialProps:{page:0}});
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({page:1});
    await waitFor(() => expect(api.loadScreenerSnapshot).toHaveBeenCalledTimes(2));
    expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),{page:1,size:20});
    expect(api.getScreenerRun).not.toHaveBeenCalled();
  });
  it('브라우저 저장소가 막혀도 페이지 이동은 현재 실행 ID를 유지한다', async () => {
    const readSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      const { result, rerender, unmount } = renderHook(({page}) => useScreener('SWING',0,{page}), {initialProps:{page:0}});
      await waitFor(() => expect(result.current.loading).toBe(false));
      rerender({page:1});
      await waitFor(() => expect(api.loadScreenerSnapshot).toHaveBeenCalledTimes(2));
      expect(api.loadScreenerSnapshot).toHaveBeenLastCalledWith('SWING',0,'run-SWING-0',expect.any(AbortSignal),{page:1});
      unmount();
    } finally { readSpy.mockRestore(); writeSpy.mockRestore(); }
  });
  it('빠른 필터 변경에서 취소된 응답이 새 결과를 덮지 않는다', async () => {
    const { result, rerender } = renderHook(({search}) => useScreener('SWING',0,{search}), {initialProps:{search:''}});
    await waitFor(() => expect(result.current.loading).toBe(false));
    let finish;
    api.loadScreenerSnapshot.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    rerender({search:'old'});
    await waitFor(() => expect(api.loadScreenerSnapshot).toHaveBeenCalledTimes(2));
    const oldSignal = api.loadScreenerSnapshot.mock.calls[1][3];
    api.loadScreenerSnapshot.mockResolvedValueOnce({...pageFixture(), totalElements:0, content:[]});
    rerender({search:'new'});
    await waitFor(() => expect(result.current.data.totalElements).toBe(0));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => { finish(pageFixture()); });
    expect(result.current.data.totalElements).toBe(0);
  });
});
