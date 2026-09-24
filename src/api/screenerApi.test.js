import { beforeEach, describe, expect, it, vi } from 'vitest';
import httpClient from './httpClient';
import { getScreenerItem, loadScreenerSnapshot, startScreenerRun } from './screenerApi';
import { runFixture } from '../test/screenerFixtures';
vi.mock('./httpClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const response = (content, totalElements, run = runFixture(), page = 0, size = 20) => ({ data: { success:true, data:{ run, content, totalElements, page, size } } });
describe('screener HTTP contract', () => {
  beforeEach(() => vi.resetAllMocks());
  it('전체 종목 수와 무관하게 현재 20개만 한 번 요청한다', async () => {
    const items = Array.from({ length:20 }, (_,i) => ({ stockCode:String(i).padStart(6,'0') }));
    httpClient.post.mockResolvedValue(response(items,2000));
    const result = await loadScreenerSnapshot('SWING',0);
    expect(result.content).toHaveLength(20);
    expect(httpClient.post).toHaveBeenCalledTimes(1);
    expect(httpClient.post).toHaveBeenCalledWith('/v1/screener/search', { mode:'SWING', interval:0, page:0, size:20 }, {signal:undefined});
    expect(httpClient.get).not.toHaveBeenCalled();
  });
  it('고정 실행 ID·페이지·필터를 서버에 전달한다', async () => {
    httpClient.post.mockResolvedValue(response([{stockCode:'005930'}],21,runFixture(),1));
    const query = {page:1, stage:6, watchedCodes:['005930'], watchOnly:true};
    await loadScreenerSnapshot('SWING',0,'run-SWING-0',undefined,query);
    expect(httpClient.post).toHaveBeenCalledWith('/v1/screener/search', {...query, mode:'SWING',interval:0,runId:'run-SWING-0',size:20},{signal:undefined});
  });
  it('누락·중복과 다른 실행·주기·페이지 응답을 거부한다', async () => {
    httpClient.post.mockResolvedValue(response([{stockCode:'005930'}],2));
    await expect(loadScreenerSnapshot('SWING',0)).rejects.toThrow('누락');
    httpClient.post.mockResolvedValue(response([{stockCode:'005930'},{stockCode:'005930'}],2));
    await expect(loadScreenerSnapshot('SWING',0)).rejects.toThrow('누락');
    httpClient.post.mockResolvedValue(response([],0,runFixture('SHORT_TERM',5)));
    await expect(loadScreenerSnapshot('SWING',0)).rejects.toThrow('봉 주기');
    httpClient.post.mockResolvedValue(response([],0));
    await expect(loadScreenerSnapshot('SWING',0,'different')).rejects.toThrow('실행 결과');
    httpClient.post.mockResolvedValue(response([],0,runFixture(),2));
    await expect(loadScreenerSnapshot('SWING',0)).rejects.toThrow('페이지');
  });
  it('상세는 지정 종목만 조회한다', async () => {
    httpClient.get.mockResolvedValue({data:{success:true,data:{stockCode:'005930'}}});
    await getScreenerItem('run-1','005930');
    expect(httpClient.get).toHaveBeenCalledWith('/v1/screener/runs/run-1/stocks/005930',{signal:undefined});
  });
  it('실행 등록에 멱등 키와 API 봉투를 사용한다', async () => {
    httpClient.post.mockResolvedValue({data:{success:true,data:runFixture()}});
    const request = {mode:'SWING',interval:0,market:'ALL',stockCodes:['005930']};
    await expect(startScreenerRun(request,'key')).resolves.toEqual(runFixture());
    expect(httpClient.post).toHaveBeenCalledWith('/v1/screener/runs',request,{headers:{'Idempotency-Key':'key'}});
  });
});
