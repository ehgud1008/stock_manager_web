import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getScreenerRun, loadScreenerSnapshot, recoverScreenerRun, resumeScreenerRun, startScreenerRun } from '../../api/screenerApi';

export const isActiveRun = (run) => ['READY', 'RUNNING'].includes(run?.status);
const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Session state still works without storage. */ } };

export default function useScreener(mode, interval, options = {}) {
  const queryKey = JSON.stringify(options);
  const query = useMemo(() => JSON.parse(queryKey), [queryKey]);
  const storageKey = `stockscope.screener.run.${mode}.${interval}`;
  const [state, setState] = useState({ run: null, data: null, loading: true, error: '', submitting: false });
  const alive = useRef(true);
  const generation = useRef(0);
  const controller = useRef(null);
  const timer = useRef(null);
  const currentId = useRef(null);
  const completedRun = useRef(null);
  const initializedStorageKey = useRef(null);
  const initialLookup = useRef(true);
  const latestRefresh = useRef(null);
  const busy = useRef(false);
  const pending = useRef(read(`${storageKey}.pending`));

  const refresh = useCallback(async (id = currentId.current) => {
    const request = ++generation.current;
    clearTimeout(timer.current);
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const valid = () => alive.current && request === generation.current;
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      // Completed runs are immutable; page/filter changes need only the list request.
      let run = id && (!completedRun.current || completedRun.current.runId !== id) ? await getScreenerRun(id, abort.signal) : completedRun.current?.runId === id ? completedRun.current : null;
      if (!valid()) return;
      if (run && (run.request.mode !== mode || run.request.interval !== interval)) throw new Error('저장된 실행의 모드·봉 주기가 다릅니다. 최신 완료 결과를 조회해 주세요.');
      if (isActiveRun(run)) {
        initialLookup.current = false;
        currentId.current = run.runId;
        setState((previous) => ({ ...previous, run, data: null, loading: false }));
        timer.current = setTimeout(() => refresh(run.runId), 2500);
        return;
      }
      // On entry, yesterday's saved completed run must not hide the overnight SWING batch.
      const selectedRunId = initialLookup.current && mode === 'SWING' ? undefined : run?.runId;
      const data = await loadScreenerSnapshot(mode, interval, selectedRunId, abort.signal, query);
      if (!valid()) return;
      initialLookup.current = false;
      run = data.run;
      completedRun.current = ['COMPLETED', 'COMPLETED_WITH_ERRORS'].includes(run?.status) ? run : null;
      currentId.current = run?.runId || null;
      if (run) write(storageKey, run.runId);
      setState((previous) => ({ ...previous, run, data, loading: false, error: '' }));
      if (isActiveRun(run)) timer.current = setTimeout(() => refresh(run.runId), 2500);
    } catch (error) {
      if (!valid()) return;
      if (id && error.status === 404) {
        currentId.current = null;
        write(storageKey, null);
        refresh(null);
        return;
      }
      setState((previous) => ({ ...previous, loading: false, error: error.message || '결과를 조회하지 못했습니다.' }));
    }
  }, [mode, interval, storageKey, query]);

  useEffect(() => {
    alive.current = true;
    latestRefresh.current = refresh;
    if (initializedStorageKey.current !== storageKey) {
      const saved = read(storageKey);
      currentId.current = typeof saved === 'string' ? saved : null;
      completedRun.current = null;
      initialLookup.current = true;
      initializedStorageKey.current = storageKey;
    }
    refresh(currentId.current);
    return () => { alive.current = false; generation.current += 1; controller.current?.abort(); clearTimeout(timer.current); };
  }, [refresh, storageKey]);

  const execute = async (request, resume = false) => {
    if (busy.current) return false;
    busy.current = true;
    // Cancel earlier reads so a slow latest-result response cannot overwrite the new job.
    generation.current += 1;
    completedRun.current = null;
    controller.current?.abort(); clearTimeout(timer.current);
    setState((previous) => ({ ...previous, submitting: true, loading: false, error: '' }));
    try {
      let run;
      if (resume === 'recover') run = await recoverScreenerRun(currentId.current);
      else if (resume) run = await resumeScreenerRun(currentId.current);
      else {
        const body = JSON.stringify(request);
        if (pending.current?.body !== body) pending.current = { body, key: crypto.randomUUID() };
        write(`${storageKey}.pending`, pending.current);
        run = await startScreenerRun(request, pending.current.key);
        pending.current = null; write(`${storageKey}.pending`, null);
      }
      write(storageKey, run.runId);
      if (!alive.current) return true;
      currentId.current = run.runId;
      setState((previous) => ({ ...previous, run, data: null, submitting: false }));
      latestRefresh.current(run.runId);
      return true;
    } catch (error) {
      if (alive.current) setState((previous) => ({ ...previous, submitting: false, error: `${error.message} ${resume ? '결과 조회로 실행 상태를 확인해 주세요.' : '응답이 불확실하면 같은 조건으로 다시 실행해 주세요. 동일 요청 키로 기존 실행을 확인합니다.'}` }));
      return false;
    } finally { busy.current = false; }
  };
  return { ...state, refresh: () => refresh(), latest: () => { write(storageKey, null); currentId.current = null; return refresh(null); }, start: (request) => execute(request), resume: () => execute(null, true), recover: () => execute(null, 'recover') };
}
