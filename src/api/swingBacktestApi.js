import httpClient from './httpClient';

const path = '/v1/swing-backtests';

export const runHistoricalBacktest = async (settings) => {
  const response = await httpClient.post(`${path}/historical`, settings, { timeout: 120000 });
  return response.data.data;
};

export const listSwingPaperRuns = async () => (await httpClient.get(`${path}/paper-runs`)).data.data;
export const getSwingPaperRun = async (id) => (await httpClient.get(`${path}/paper-runs/${id}`)).data.data;
export const startSwingPaperRun = async (id, settings) =>
  (await httpClient.put(`${path}/paper-runs/${id}`, settings)).data.data;
