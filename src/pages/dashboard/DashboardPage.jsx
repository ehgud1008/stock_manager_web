import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import { Box, Button, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { getAnalysisRoute } from '../../constants/routes';
import ServerStatusCard from '../../features/server-status/components/ServerStatusCard';
import StockSearchPanel from '../../features/stock-search/components/StockSearchPanel';
import { screenerMockData } from '../../mocks/screenerMockData';
import { recentAnalysisMock, watchlistMock } from '../../mocks/stockMockData';

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="DASHBOARD / 01" title="오늘의 시장을 한눈에" description="종목 탐색에서 분석 결과 확인까지 이어지는 국내 주식 리서치 워크스페이스입니다." />
      <StockSearchPanel />

      <Grid container spacing={2.5} mt={0}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="관심 종목" caption="실시간 가격이 아닌 화면 구성용 종목 목록입니다." action={<Button component={Link} to="/screener" endIcon={<ArrowForwardRoundedIcon />} size="small">전체 보기</Button>}>
            <Grid container spacing={1.5}>
              {watchlistMock.map((stock, index) => (
                <Grid size={{ xs: 12, sm: 4 }} key={stock.stockCode}>
                  <Box component={Link} to={getAnalysisRoute(stock.stockCode)} sx={{ display: 'block', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, color: 'inherit', textDecoration: 'none', transition: '150ms ease', '&:hover': { borderColor: 'rgba(139,218,99,.4)', transform: 'translateY(-2px)' } }}>
                    <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">{stock.marketType}</Typography><Typography variant="caption" color="text.secondary">0{index + 1}</Typography></Stack>
                    <Typography fontWeight={650} mt={2}>{stock.stockName}</Typography>
                    <Typography variant="caption" color="text.secondary">{stock.stockCode}</Typography>
                    <Typography variant="body2" color="primary.main" mt={2}>{stock.note}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}><ServerStatusCard /></Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard title="최신 스크리닝 후보" caption="추천 결과가 아닌 테이블 레이아웃 확인용 샘플입니다." action={<Chip label="MOCK" size="small" variant="outlined" />}>
            <Stack divider={<Divider flexItem />}>
              {screenerMockData.map((row) => (
                <Stack component={Link} to={getAnalysisRoute(row.stockCode)} key={row.stockCode} direction="row" alignItems="center" gap={2} py={1.5} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                  <Typography variant="caption" color="text.secondary" width={20}>{String(row.rank).padStart(2, '0')}</Typography>
                  <Box flex={1}><Typography variant="body2" fontWeight={600}>{row.stockName}</Typography><Typography variant="caption" color="text.secondary">{row.stockCode} · {row.market}</Typography></Box>
                  <Chip label={row.score} size="small" variant="outlined" />
                  <ArrowForwardRoundedIcon fontSize="small" />
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="최근 분석 이력" caption="최근 열어본 샘플 분석 화면">
            <Stack divider={<Divider flexItem />}>
              {recentAnalysisMock.map((item) => (
                <Stack key={`${item.stockCode}-${item.mode}`} direction="row" alignItems="center" gap={1.5} py={1.5}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(113,167,255,.08)', color: 'secondary.main', display: 'grid', placeItems: 'center' }}><BookmarkBorderRoundedIcon fontSize="small" /></Box>
                  <Box flex={1}><Typography variant="body2" fontWeight={600}>{item.stockName}</Typography><Typography variant="caption" color="text.secondary">{item.stockCode} · {item.mode}</Typography></Box>
                  <Typography variant="caption" color="warning.main">{item.status}</Typography>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
