import { Box, Button, Chip, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Tooltip, Typography } from '@mui/material';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { GAP_LABELS, signed, STAGES, watchKey } from '../screenerModel';
import { formatNumber, QUALITY_LABELS, TRANSITION_LABELS } from '../screenerAdapter';

export default function ScreenerTable({ rows, total, page, size, sort, onPage, onSize, onSort, unit, mode, watched, onWatch, onSelect, onReset }) {
  const changeSort = (field) => {
    onSort({ field, direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc' });
  };
  const sortable = (field, label) => <TableSortLabel active={sort.field === field} direction={sort.field === field ? sort.direction : 'asc'} onClick={() => changeSort(field)}>{label}</TableSortLabel>;
  if (!rows.length) return (
    <Stack role="status" alignItems="center" gap={1.5} py={7}>
      <SearchOffRoundedIcon sx={{ fontSize: 36, color: 'text.secondary' }} />
      <Typography fontWeight={600}>조건에 맞는 종목이 없습니다</Typography>
      <Typography variant="body2" color="text.secondary">스테이지나 전환 조건을 넓혀보세요.</Typography>
      <Button onClick={onReset} variant="outlined">필터 초기화</Button>
    </Stack>
  );
  return <>
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" aria-label="EMA 스크리닝 결과" sx={{ minWidth: 1040, '& th': { whiteSpace: 'nowrap', bgcolor: 'rgba(255,255,255,.025)', color: 'text.secondary', py: 1.5 }, '& td': { py: 1.6, whiteSpace: 'nowrap' } }}>
        <TableHead><TableRow>
          <TableCell align="center">관찰</TableCell><TableCell>종목 / 분석 종가</TableCell>
          <TableCell>{sortable('stage', '현재 스테이지')}</TableCell><TableCell>최근 전환</TableCell>
          <TableCell>{sortable('barsInStage', `유지 (${unit})`)}</TableCell>
          <TableCell>기울기 · 5 / 20 / 40</TableCell><TableCell>중·장기 간격</TableCell>
          <TableCell align="right">{sortable('tradingAmount100m', '거래대금 (억원)')}</TableCell><TableCell><span aria-hidden="true">↗</span></TableCell>
        </TableRow></TableHead>
        <TableBody>{rows.map((row) => {
          const meta = STAGES[row.stage - 1] || { label: QUALITY_LABELS[row.quality] || '미판정', color: '#A5ADBA' };
          const saved = watched.includes(watchKey(mode, row.stockCode));
          return <TableRow key={row.stockCode} hover sx={{ '&:hover': { bgcolor: 'rgba(139,218,99,.035) !important' } }}>
            <TableCell align="center"><IconButton size="small" aria-label={`${row.stockName} 관찰 ${saved ? '해제' : '추가'}`} aria-pressed={saved} onClick={() => onWatch(row.stockCode)} sx={{ color: saved ? 'primary.main' : 'text.secondary' }}>{saved ? <StarRoundedIcon fontSize="small" /> : <StarBorderRoundedIcon fontSize="small" />}</IconButton></TableCell>
            <TableCell><Button onClick={() => onSelect(row)} color="inherit" sx={{ p: 0, minHeight: 0, minWidth: 0, fontSize: 14, justifyContent: 'flex-start' }}>{row.stockName}</Button><Typography variant="caption" color="text.secondary" display="block">{row.stockCode} · {row.market}</Typography><Typography variant="caption">{formatNumber(row.price)}원</Typography></TableCell>
            <TableCell><Chip label={row.stage ? `S${row.stage} · ${meta.label}` : meta.label} size="small" sx={{ bgcolor: `${meta.color}13`, color: meta.color, border: `1px solid ${meta.color}30`, borderRadius: 1.5 }} />{row.status === 'ANALYZED' && !row.sourceComplete && <Typography variant="caption" display="block" color="warning.main">조회 범위 부족</Typography>}</TableCell>
            <TableCell><Typography fontSize={13}>{row.previousDistinctStage != null && row.stage != null ? `S${row.previousDistinctStage} → S${row.stage} · ${TRANSITION_LABELS[row.transitionDirection]}` : '전환 미확인'}</Typography><Typography variant="caption" color="text.secondary">{row.barsSinceTransition == null ? '—' : row.barsSinceTransition === 0 ? '이번 봉 전환' : `${row.barsSinceTransition}${unit} 전`}</Typography></TableCell>
            <TableCell><Typography fontSize={14} fontWeight={600}>{row.barsInStage == null ? '—' : `${row.barsInStage}${row.stageDurationComplete ? '' : '+'}`}<Box component="span" fontSize={11} color="text.secondary" ml={0.5}>{unit}</Box></Typography></TableCell>
            <TableCell><Stack direction="row" gap={0.7}>{row.slopes.map((slope, index) => <Tooltip key={index} title={`EMA${row.emaPeriods[index]} 직전 ${row.slopeLookback}봉 대비 ${signed(slope)}%`}><Typography component="span" sx={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: slope == null || slope === 0 ? 'text.secondary' : slope > 0 ? 'primary.main' : 'secondary.main' }}>{slope == null ? '' : slope === 0 ? '→' : slope > 0 ? '↗' : '↘'}{signed(slope)}</Typography></Tooltip>)}</Stack></TableCell>
            <TableCell><Typography fontSize={13}>{signed(row.middleLongGap)}%</Typography><Typography variant="caption" color="text.secondary">거리 {GAP_LABELS[row.bandState]}</Typography></TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(row.tradingAmount100m, 0)}</TableCell>
            <TableCell><IconButton onClick={() => onSelect(row)} size="small" aria-label={`${row.stockName} 상세 보기`}><ArrowForwardRoundedIcon fontSize="small" /></IconButton></TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>
    <TablePagination component="div" count={total} page={page} rowsPerPage={size} onPageChange={(_, next) => onPage(next)} onRowsPerPageChange={(event) => onSize(Number(event.target.value))} rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="표시 행" labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}종목`} getItemAriaLabel={(type) => ({ next: '다음 페이지', previous: '이전 페이지', first: '첫 페이지', last: '마지막 페이지' }[type])} sx={{ borderTop: '1px solid', borderColor: 'divider' }} />
  </>;
}
