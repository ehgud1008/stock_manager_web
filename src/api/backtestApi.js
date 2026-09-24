import httpClient from './httpClient';

export const getSupportedBackdataTrs = async () => {
  const response = await httpClient.get('/v1/backdata/trs');
  return response.data;
};

export const validateKiwoomBackdata = async (request) => {
  const response = await httpClient.post('/v1/backdata/validation-runs/kiwoom', request);
  return response.data;
};

export const validateKiwoomBackdataBatch = async (request) => {
  const response = await httpClient.post('/v1/backdata/validation-runs/kiwoom/batch', request);
  return response.data;
};
