import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Alert, Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function AnalysisNarrativePanel({ reasons, warnings }) {
  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="overline" color="primary.main">KEY REASONS</Typography>
        <Stack gap={1.1} mt={1}>
          {reasons.length ? reasons.map((reason, index) => (
            <Stack key={`${index}-${reason}`} direction="row" gap={1} alignItems="flex-start">
              <CheckCircleOutlineRoundedIcon color="primary" sx={{ fontSize: 18, mt: 0.2 }} />
              <Typography variant="body2" color="text.secondary">{reason}</Typography>
            </Stack>
          )) : <Typography variant="body2" color="text.secondary">표시할 분석 근거가 없습니다.</Typography>}
        </Stack>
      </Box>
      {warnings.length > 0 && <Alert severity="warning" icon={<WarningAmberRoundedIcon />}><Typography fontWeight={650} mb={0.5}>데이터 확인 사항</Typography>{warnings.map((warning, index) => <Typography key={`${index}-${warning}`} variant="body2">{warning}</Typography>)}</Alert>}
      <Typography variant="caption" color="text.secondary">자동 산출 결과이며 투자 권유가 아닙니다. 주문 전 가격과 공시를 다시 확인하세요.</Typography>
    </Stack>
  );
}

AnalysisNarrativePanel.propTypes = { reasons: PropTypes.arrayOf(PropTypes.string).isRequired, warnings: PropTypes.arrayOf(PropTypes.string).isRequired };
