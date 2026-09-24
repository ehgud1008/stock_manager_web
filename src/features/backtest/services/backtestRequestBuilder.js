const compactDate = (value) => value.replaceAll('-', '');

export const buildSingleValidationRequest = ({
  stockCode,
  asOfDate,
  profile,
  adjustedPrice,
  continuation = 'N',
  nextKey = '',
}) => ({
  apiId: 'ka10081',
  profile,
  asOfDate,
  continuation,
  nextKey,
  request: {
    stk_cd: stockCode,
    base_dt: compactDate(asOfDate),
    upd_stkpc_tp: adjustedPrice,
  },
});

export const buildBatchValidationRequest = ({ stockCode, asOfDate, profile, adjustedPrice }) => {
  const date = compactDate(asOfDate);
  return {
    profile,
    queries: [
      {
        apiId: 'ka10081',
        asOfDate,
        request: { stk_cd: stockCode, base_dt: date, upd_stkpc_tp: adjustedPrice },
      },
      {
        apiId: 'ka10086',
        asOfDate,
        request: { stk_cd: stockCode, qry_dt: date, indc_tp: '0' },
      },
      {
        apiId: 'ka10059',
        asOfDate,
        request: { dt: date, stk_cd: stockCode, amt_qty_tp: '2', trde_tp: '0', unit_tp: '1' },
      },
    ],
  };
};
