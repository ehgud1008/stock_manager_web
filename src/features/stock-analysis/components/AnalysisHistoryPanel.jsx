import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Box, ButtonBase, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import formatDateTime from '../../../utils/formatDateTime';

const ACTION_LABELS = { BUY_CANDIDATE: '매수 후보', WATCH: '관찰', WAIT: '대기', AVOID: '회피' };
const formatScore = (value) => value == null ? '—' : Number(value).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function AnalysisHistoryPanel({ status, data, selectedRunId, onSelect }) {
  if (status === 'loading') return <Stack direction="row" alignItems="center" gap={1.25} color="text.secondary"><CircularProgress size={18} /><Typography variant="body2">분석 이력을 불러오는 중입니다.</Typography></Stack>;
  if (status === 'error') return <Typography color="error.main">분석 이력을 불러오지 못했습니다.</Typography>;
  const items = data?.content || [];
  if (!items.length) return <Typography color="text.secondary">저장된 분석 이력이 없습니다.</Typography>;
  return (
    <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
      {items.map((item) => {
        const selected = item.analysisRunId === selectedRunId;
        return (
          <ButtonBase key={item.analysisRunId} onClick={() => onSelect(item.analysisRunId)} sx={{ py: 1.4, px: 1, borderRadius: 1.5, textAlign: 'left', justifyContent: 'stretch', bgcolor: selected ? 'rgba(139,218,99,.06)' : 'transparent' }}>
            <Stack direction="row" alignItems="center" gap={1.5} width="100%">
              <Box flex={1}><Typography variant="body2" fontWeight={650}>{formatDateTime(item.baseDate)}</Typography><Typography variant="caption" color="text.secondary">{item.strategyName || '전략 산출 전'} · 실행 #{item.analysisRunId}</Typography></Box>
              <Chip label={item.strategyName || ACTION_LABELS[item.strategyAction] || item.status} size="small" variant="outlined" />
              <Typography fontWeight={700} minWidth={38} textAlign="right">{formatScore(item.totalScore)}</Typography>
              <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Stack>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

AnalysisHistoryPanel.propTypes = { status: PropTypes.string.isRequired, data: PropTypes.shape({ content: PropTypes.arrayOf(PropTypes.object) }), selectedRunId: PropTypes.number, onSelect: PropTypes.func.isRequired };
