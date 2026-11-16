import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { Alert, Box, Button, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api/unifiedAnalysisApi';
import SectionCard from '../../components/common/SectionCard';
import StockSearchPanel from '../../features/stock-search/components/StockSearchPanel';

const destinations = [
  { title: '시장 전체에서 종목 찾기', description: '저장된 분석을 점수·추세·매매 조건으로 검색합니다.', path: '/unified-analysis', icon: <TuneOutlinedIcon /> },
  { title: '내 보유종목 확인', description: '보유수량과 평균 매입단가를 관리하고 종목 분석으로 이어갑니다.', path: '/holdings', icon: <AssessmentOutlinedIcon /> },
];

export default function DashboardPage() {
  const [report, setReport] = useState({ loading: true });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReport({ loading: true });
    api.listDailyReports({ page: 0, size: 1 }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReport({ data }); })
      .catch(error => { if (!controller.signal.aborted) setReport({ error: error.message }); });
    return () => controller.abort();
  }, [refresh]);
  const latest = report.data?.latestReady;
  return <Stack gap={2.5}>
    <Box><Typography variant="overline" color="primary.main">RESEARCH HOME</Typography><Typography variant="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, mt: 0.5 }}>오늘의 시장을 한눈에</Typography><Typography color="text.secondary" mt={1}>시장 흐름을 확인하고, 관심 있는 종목의 분석으로 이어가세요.</Typography></Box>
    <SectionCard title="최신 장 마감 리포트" caption="확정된 보고서에서 시장 판단과 선정 종목을 확인하세요." action={<SummarizeOutlinedIcon color="primary" />} sx={{ borderColor: 'rgba(139,218,99,.3)' }}>
      <Stack gap={2}>
        {report.loading && <LinearProgress aria-label="최신 보고서 확인 중" />}
        {report.error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRefresh(value => value + 1)}>다시 조회</Button>}>최신 보고서를 확인하지 못했습니다. {report.error}</Alert>}
        {latest && <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography sx={{ fontSize: 28, fontWeight: 650 }}>{latest.tradeDate}</Typography><Chip label="최신 확정 보고서" variant="outlined" size="small" /></Stack>}
        {!report.loading && !report.error && !latest && <Typography color="text.secondary">{report.data?.enabled === false ? '보고서 기능이 비활성화되어 있습니다.' : '아직 확정된 보고서가 없습니다. 리포트 화면에서 작성 상태를 확인하세요.'}</Typography>}
        {latest && report.data?.expectedTradeDate && latest.tradeDate < report.data.expectedTradeDate && <Typography variant="body2" color="warning.main">최근 예정 거래일 {report.data.expectedTradeDate}의 보고서는 아직 준비되지 않았습니다.</Typography>}
        <Button component={Link} to={latest ? `/daily-reports?runId=${encodeURIComponent(latest.runId)}` : '/daily-reports'} variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ alignSelf: 'flex-start' }}>{latest ? '시장·선정 종목 보기' : '장 마감 리포트 열기'}</Button>
      </Stack>
    </SectionCard>
    <Grid container spacing={2}>
      {destinations.map(item => <Grid key={item.path} size={{ xs: 12, sm: 6 }}>
        <Box component={Link} to={item.path} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, height: '100%', p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary', textDecoration: 'none', '&:hover': { borderColor: 'primary.main' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 3 } }}>
          <Box sx={{ color: 'text.secondary', pt: 0.25 }}>{item.icon}</Box><Box flex={1}><Typography fontWeight={650}>{item.title}</Typography><Typography variant="body2" color="text.secondary" mt={0.75}>{item.description}</Typography></Box><ArrowForwardRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        </Box>
      </Grid>)}
    </Grid>
    <StockSearchPanel />
  </Stack>;
}
