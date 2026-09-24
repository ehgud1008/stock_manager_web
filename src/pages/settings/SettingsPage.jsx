import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Alert, Box, Divider, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="SETTINGS / 05" title="작업 환경 설정" description="분석 화면의 기본 동작과 현재 연결 환경을 확인합니다." />
      <Box sx={{ maxWidth: 920 }}>
        <Stack gap={2.5}>
          <SectionCard title="API 연결" caption="브라우저에는 API 키나 비밀번호를 저장하지 않습니다.">
            <Stack gap={2}><TextField fullWidth label="API 서버 주소" value={apiBaseUrl} slotProps={{ input: { readOnly: true } }} /><Alert severity="info" icon={<InfoOutlinedIcon />}>개발 환경의 /api 요청은 localhost:8080으로 전달되도록 구성되어 있습니다.</Alert></Stack>
          </SectionCard>
          <SectionCard title="화면 및 분석 기본값">
            <Stack divider={<Divider flexItem />}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2} py={1}><Box><Typography fontWeight={600}>다크 모드</Typography><Typography variant="body2" color="text.secondary">현재 초기 화면의 기본 테마입니다.</Typography></Box><FormControlLabel control={<Switch checked disabled />} label="사용 중" /></Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2} py={2}><Box><Typography fontWeight={600}>기본 분석 모드</Typography><Typography variant="body2" color="text.secondary">분석 시작 시 먼저 선택되는 모드</Typography></Box><TextField select defaultValue="SWING" sx={{ minWidth: 220 }}><MenuItem value="SWING">SWING</MenuItem><MenuItem value="SHORT_TERM">SHORT TERM</MenuItem></TextField></Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2} py={2}><Box><Typography fontWeight={600}>기본 시장</Typography><Typography variant="body2" color="text.secondary">스크리너 초기 시장 범위</Typography></Box><TextField select defaultValue="ALL" sx={{ minWidth: 220 }}><MenuItem value="ALL">전체 시장</MenuItem><MenuItem value="KOSPI">KOSPI</MenuItem><MenuItem value="KOSDAQ">KOSDAQ</MenuItem></TextField></Stack>
            </Stack>
          </SectionCard>
          <SectionCard title="환경 정보"><Stack direction="row" alignItems="center" gap={1.5}><DarkModeOutlinedIcon color="primary" /><Box><Typography variant="body2">React 19 · Vite · MUI</Typography><Typography variant="caption" color="text.secondary">프론트엔드 초기 골격 / Mock data mode</Typography></Box></Stack></SectionCard>
        </Stack>
      </Box>
    </>
  );
}
