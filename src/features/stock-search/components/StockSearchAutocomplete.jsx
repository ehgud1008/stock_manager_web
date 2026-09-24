import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalysisRoute } from '../../../constants/routes';
import useRecentStocks from '../hooks/useRecentStocks';
import useStockMaster from '../hooks/useStockMaster';
import { searchStockMaster, STOCK_MARKET } from '../services/stockMasterService';

const marketColor = (marketType) => (
  marketType === 'KOSDAQ' ? 'secondary' : 'primary'
);

export default function StockSearchAutocomplete({
  compact = false,
  initialMarket = STOCK_MARKET.DOMESTIC,
  navigationState,
  onSelect,
}) {
  const navigate = useNavigate();
  const [market, setMarket] = useState(initialMarket);
  const { stocks, status, error } = useStockMaster(market);
  const { recentStocks, rememberStock } = useRecentStocks();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setMarket(initialMarket);
    setInputValue('');
  }, [initialMarket]);

  const options = useMemo(() => {
    if (inputValue.trim()) return searchStockMaster(stocks, inputValue);

    const marketRecentStocks = recentStocks.filter((stock) => (
      market === STOCK_MARKET.OVERSEAS
        ? stock.marketType === 'US'
        : stock.marketType !== 'US'
    ));
    const recentCodes = new Set(marketRecentStocks.map((stock) => stock.stockCode));
    return [
      ...marketRecentStocks,
      ...stocks.filter((stock) => !recentCodes.has(stock.stockCode)),
    ].slice(0, 30);
  }, [inputValue, market, recentStocks, stocks]);

  const visibleRecentStocks = recentStocks.filter((stock) => (
    market === STOCK_MARKET.OVERSEAS
      ? stock.marketType === 'US'
      : stock.marketType !== 'US'
  ));

  const changeMarket = (_, nextMarket) => {
    if (!nextMarket) return;
    setMarket(nextMarket);
    setInputValue('');
  };

  const selectStock = (stock) => {
    if (!stock) return;
    rememberStock(stock);
    setInputValue('');
    onSelect?.(stock);
    navigate(getAnalysisRoute(stock.stockCode), { state: navigationState });
  };

  return (
    <Box>
      <ToggleButtonGroup
        value={market}
        exclusive
        onChange={changeMarket}
        size="small"
        aria-label="종목 시장 선택"
        sx={{ mb: compact ? 0.75 : 1 }}
      >
        <ToggleButton value={STOCK_MARKET.DOMESTIC} aria-label="국내 종목">국내</ToggleButton>
        <ToggleButton value={STOCK_MARKET.OVERSEAS} aria-label="해외 종목">해외</ToggleButton>
      </ToggleButtonGroup>
      <Autocomplete
        value={null}
        inputValue={inputValue}
        onInputChange={(_, value, reason) => {
          if (reason !== 'reset') setInputValue(value);
        }}
        onChange={(_, stock) => selectStock(stock)}
        options={options}
        loading={status === 'loading'}
        openOnFocus
        autoHighlight
        filterOptions={(items) => items}
        isOptionEqualToValue={(option, value) => (
          option.stockCode === value.stockCode && option.marketType === value.marketType
        )}
        getOptionLabel={(option) => `${option.stockName} ${option.stockCode}`}
        noOptionsText={status === 'error' ? '종목 목록을 불러오지 못했습니다.' : '검색 결과가 없습니다.'}
        loadingText="종목 목록을 불러오는 중입니다."
        renderOption={(props, option) => {
          const { key, ...optionProps } = props;
          return (
            <Box component="li" key={key} {...optionProps} sx={{ gap: 1.5, py: '10px !important' }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={650} noWrap>{option.stockName}</Typography>
                <Typography variant="caption" color="text.secondary">{option.stockCode} · {option.stockType}</Typography>
              </Box>
              <Chip
                label={option.marketType}
                size="small"
                color={marketColor(option.marketType)}
                variant="outlined"
                sx={{ fontSize: 10 }}
              />
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            type="search"
            placeholder={market === STOCK_MARKET.OVERSEAS
              ? '해외 종목명 또는 티커 검색'
              : '국내 종목명 또는 종목코드 검색'}
            inputProps={{ ...params.inputProps, 'aria-label': '종목 검색' }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {status === 'loading' && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            error={status === 'error'}
            helperText={status === 'error' ? error?.message : undefined}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(8,11,18,.72)',
                minHeight: compact ? 44 : 50,
              },
            }}
          />
        )}
      />
      {visibleRecentStocks.length > 0 && (
        <Stack direction="row" alignItems="center" gap={1} mt={1.25} sx={{ overflowX: 'auto', pb: 0.25 }}>
          <HistoryRoundedIcon sx={{ fontSize: 16, color: 'text.secondary', flex: '0 0 auto' }} />
          <Typography variant="caption" color="text.secondary" sx={{ flex: '0 0 auto' }}>최근 검색</Typography>
          {visibleRecentStocks.slice(0, compact ? 4 : 6).map((stock) => (
            <Chip
              key={stock.stockCode}
              label={`${stock.stockName} ${stock.stockCode}`}
              size="small"
              variant="outlined"
              onClick={() => selectStock(stock)}
              sx={{ flex: '0 0 auto' }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

StockSearchAutocomplete.propTypes = {
  compact: PropTypes.bool,
  initialMarket: PropTypes.oneOf(Object.values(STOCK_MARKET)),
  navigationState: PropTypes.object,
  onSelect: PropTypes.func,
};
