import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { getHealth } from '../../../api/healthApi';
import SectionCard from '../../../components/common/SectionCard';
import ErrorState from '../../../components/feedback/ErrorState';
import LoadingState from '../../../components/feedback/LoadingState';
import useAsyncData from '../../../hooks/useAsyncData';

export default function ServerStatusCard() {
  const { status, data, error, reload } = useAsyncData(getHealth, []);

  return (
    <SectionCard title="서버 연결 상태" caption="API 헬스 체크">
      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && (
        <Stack gap={2.5}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'success.main', bgcolor: 'rgba(102,211,138,.08)' }}><CloudDoneOutlinedIcon /></Box>
            <Box flex={1}><Typography fontWeight={650}>Mock API 정상</Typography><Typography variant="caption" color="text.secondary">{data.status} · /api/v1/health</Typography></Box>
            <Chip label="CONNECTED" size="small" color="success" variant="outlined" />
          </Stack>
          <Box><Stack direction="row" justifyContent="space-between" mb={0.75}><Typography variant="caption" color="text.secondary">응답 상태</Typography><Typography variant="caption" color="success.main">정상</Typography></Stack><LinearProgress variant="determinate" value={100} color="success" sx={{ height: 4, borderRadius: 4 }} /></Box>
          <Typography variant="caption" color="text.secondary">현재는 화면 확인용 Stub 응답을 사용합니다.</Typography>
        </Stack>
      )}
    </SectionCard>
  );
}
