import { Box, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PropTypes from 'prop-types';
import { useState } from 'react';
import LoadingState from '../../../components/feedback/LoadingState';
import {
  getPricePeriodOption,
  PRICE_DATA_STATUS,
  PRICE_PERIOD,
  PRICE_PERIOD_OPTIONS,
} from '../../../constants/priceDataStatuses';
import useStockPrices from '../hooks/useStockPrices';
import KLineStockChart from './KLineStockChart';
import PriceDataState from './PriceDataState';
import PriceDataStatusBar from './PriceDataStatusBar';
import TechnicalIndicatorGuide from './TechnicalIndicatorGuide';

export default function StockChartPanel({ stockCode, analysis, refreshKey, basic = false, realData = false }) {
  const [period, setPeriod] = useState(PRICE_PERIOD.DAY);
  const [ichimokuEnabled, setIchimokuEnabled] = useState(true);
  const [bollingerEnabled, setBollingerEnabled] = useState(false);
  const periodOption = getPricePeriodOption(period);
  const { status, data, error, reload } = useStockPrices(
    stockCode,
    period,
    periodOption.interval,
    refreshKey,
    realData,
  );

  const renderContent = () => {
    if (status === 'loading') return <LoadingState />;
    if (status === 'error') {
      return (
        <PriceDataState
          status={PRICE_DATA_STATUS.COLLECTION_FAILED}
          message={error?.message}
          onRetry={reload}
        />
      );
    }
    if (data?.status === PRICE_DATA_STATUS.COLLECTION_FAILED) {
      return (
        <PriceDataState
          status={PRICE_DATA_STATUS.COLLECTION_FAILED}
          message={data.statusMessage}
          onRetry={reload}
        />
      );
    }
    if (!data
      || data.status === PRICE_DATA_STATUS.INSUFFICIENT_DATA
      || data.candles.length < 2) {
      return (
        <PriceDataState
          status={PRICE_DATA_STATUS.INSUFFICIENT_DATA}
          message={data?.statusMessage}
          onRetry={reload}
        />
      );
    }

    return (
      <>
        <PriceDataStatusBar
          baseDate={data.baseDate}
          isLatest={Boolean(data.isLatest)}
          lastCollectedAt={data.lastCollectedAt}
          source={data.source}
        />
        <KLineStockChart
          stockCode={stockCode}
          period={period}
          candles={data.candles}
          analysis={basic ? undefined : analysis}
          basic={basic}
          ichimokuEnabled={!basic && ichimokuEnabled}
          bollingerEnabled={!basic && bollingerEnabled}
        />
        {!basic && <TechnicalIndicatorGuide />}
      </>
    );
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" gap={1} mb={1.5} flexWrap="wrap">
        {!basic && <><ToggleButton
          size="small"
          value="ichimoku"
          selected={ichimokuEnabled}
          onChange={() => setIchimokuEnabled((enabled) => !enabled)}
          aria-label="일목균형표 표시"
          sx={{ px: 1.5, py: 0.5 }}
        >
          일목
        </ToggleButton>
        <ToggleButton
          size="small"
          value="bollinger"
          selected={bollingerEnabled}
          onChange={() => setBollingerEnabled((enabled) => !enabled)}
          aria-label="볼린저밴드 표시"
          sx={{ px: 1.5, py: 0.5 }}
        >
          BOLL
        </ToggleButton>
        </>}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={period}
          onChange={(_, nextPeriod) => nextPeriod && setPeriod(nextPeriod)}
          aria-label="차트 주기"
          sx={{
            bgcolor: 'rgba(8,11,18,.72)',
            '& .MuiToggleButton-root': { px: 1.5, py: 0.5, minWidth: 44 },
          }}
        >
          {PRICE_PERIOD_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              value={option.value}
              aria-label={`${option.chartLabel} 조회`}
            >
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {renderContent()}
    </Box>
  );
}

StockChartPanel.propTypes = {
  stockCode: PropTypes.string.isRequired,
  analysis: PropTypes.object,
  basic: PropTypes.bool,
  realData: PropTypes.bool,
  refreshKey: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
