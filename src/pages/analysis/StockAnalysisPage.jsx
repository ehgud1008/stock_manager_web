import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import { Box, Button, Chip, Grid, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SectionCard from '../../components/common/SectionCard';
import ErrorState from '../../components/feedback/ErrorState';
import LoadingState from '../../components/feedback/LoadingState';
import { ANALYSIS_MODE } from '../../constants/analysisModes';
import AnalysisHistoryPanel from '../../features/stock-analysis/components/AnalysisHistoryPanel';
import AnalysisNarrativePanel from '../../features/stock-analysis/components/AnalysisNarrativePanel';
import AnalysisResultPanel from '../../features/stock-analysis/components/AnalysisResultPanel';
import AnalysisToolbar from '../../features/stock-analysis/components/AnalysisToolbar';
import PositionContextForm from '../../features/stock-analysis/components/PositionContextForm';
import FactorScorePanel from '../../features/stock-analysis/components/FactorScorePanel';
import TimeframeScorePanel from '../../features/stock-analysis/components/TimeframeScorePanel';
import useAnalysisHistory from '../../features/stock-analysis/hooks/useAnalysisHistory';
import useStockAnalysis from '../../features/stock-analysis/hooks/useStockAnalysis';
import formatDateTime from '../../utils/formatDateTime';
import StockChartPanel from '../../features/stock-chart/components/StockChartPanel';
import StockSearchAutocomplete from '../../features/stock-search/components/StockSearchAutocomplete';
import useStockMaster from '../../features/stock-search/hooks/useStockMaster';
import {
  getStockByCode,
  STOCK_MARKET,
} from '../../features/stock-search/services/stockMasterService';

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export default function StockAnalysisPage() {
  const { stockCode } = useParams();
  return <StockAnalysisContent key={stockCode} />;
}

function StockAnalysisContent() {
  const { stockCode } = useParams();
  const [mode, setMode] = useState(ANALYSIS_MODE.SWING);
  const [baseDate, setBaseDate] = useState(today);
  const [forceRecalculate, setForceRecalculate] = useState(false);
  const [positionDraft, setPositionDraft] = useState(null);
  const analysis = useStockAnalysis(stockCode, mode);
  const history = useAnalysisHistory(stockCode, mode);
  const stockMarket = /^\d+$/.test(stockCode) ? STOCK_MARKET.DOMESTIC : STOCK_MARKET.OVERSEAS;
  const { stocks } = useStockMaster(stockMarket);
  const stockInfo = getStockByCode(stocks, stockCode);
  const stockName = stockInfo?.stockName || analysis.data?.stockName || '종목 분석';
  const marketType = stockInfo?.marketType || analysis.data?.marketType || 'KRX';

  const executeAnalysis = async () => {
    const context = mode === ANALYSIS_MODE.SWING && positionDraft?.stockCode === stockCode ? positionDraft : null;
    if (context?.error) return;
    try {
      await analysis.execute({ analysisMode: mode, baseDate, forceRecalculate, ...(context?.position ? { position: context.position } : {}) });
      history.reload();
    } catch {
      // The hook exposes the normalized error state in the page.
    }
  };

  const selectHistory = async (analysisRunId) => {
    try {
      await analysis.loadRun(analysisRunId);
    } catch {
      // The hook exposes the normalized error state in the page.
    }
  };

  const renderSummary = () => {
    if (analysis.status === 'loading' || analysis.status === 'running') return <LoadingState />;
    if (analysis.status === 'error') return <ErrorState message={analysis.error?.message} onRetry={analysis.reload} />;
    if (analysis.status === 'empty') {
      return (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <InsightsRoundedIcon color="primary" sx={{ fontSize: 34 }} />
          <Typography variant="h3" mt={1.5}>아직 분석 결과가 없습니다</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>기준일과 모드를 확인한 뒤 분석을 실행하세요.</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={executeAnalysis}>첫 분석 실행</Button>
        </Box>
      );
    }
    return <AnalysisResultPanel result={analysis.data} />;
  };

  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} gap={2} mb={2.5}>
        <Button component={Link} to="/" startIcon={<ArrowBackRoundedIcon />} color="inherit" size="small">대시보드</Button>
        <Box sx={{ width: { xs: '100%', md: 480 } }}>
          <StockSearchAutocomplete compact initialMarket={stockMarket} />
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} gap={2} mb={2.5}>
        <Box>
          <Typography variant="overline" color="primary.main">STOCK ANALYSIS / {stockCode}</Typography>
          <Stack direction="row" alignItems="center" gap={1.25} mt={0.5}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.8rem' } }}>{stockName}</Typography>
            <Chip label={marketType} size="small" variant="outlined" />
          </Stack>
          <Typography color="text.secondary" mt={1}>종목 코드 {stockCode} · 결과 기준일 {formatDateTime(analysis.data?.baseDate, '분석 전')}</Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1}>
          {analysis.data?.dataQualityStatus && <Chip label={`데이터 ${analysis.data.dataQualityStatus}`} color={analysis.data.dataQualityStatus === 'COMPLETE' ? 'success' : 'warning'} size="small" variant="outlined" />}
          <Chip label={analysis.data?.status || 'READY'} size="small" variant="outlined" />
        </Stack>
      </Stack>

      <AnalysisToolbar
        mode={mode}
        baseDate={baseDate}
        forceRecalculate={forceRecalculate}
        running={analysis.status === 'running'}
        onModeChange={value => { setMode(value); setPositionDraft(null); }}
        onBaseDateChange={setBaseDate}
        onForceChange={setForceRecalculate}
        onExecute={executeAnalysis}
      />
      {mode === ANALYSIS_MODE.SWING && <PositionContextForm onChange={value => setPositionDraft({ stockCode, ...value })} />}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8.4 }}>
          <SectionCard title={`${stockName} · ${stockCode}`} caption="키움 차트 전문과 분석 가격 구간">
            <StockChartPanel stockCode={stockCode} analysis={analysis.data} refreshKey={analysis.data?.analysisRunId} />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 3.6 }}>
          <SectionCard title="분석 요약" caption={analysis.data ? `${analysis.data.analysisMode} · ${analysis.data.engineVersion ? `엔진 ${analysis.data.engineVersion}` : '엔진 버전 미표시'}` : `${mode} · 분석 상태`}>
            {renderSummary()}
          </SectionCard>
        </Grid>

        {analysis.status === 'success' && analysis.data && (
          <>
            <Grid size={{ xs: 12 }}>
              <SectionCard title="스윙 시간대 점수" caption="일봉은 진입 타이밍, 주봉은 중심 추세, 월봉은 장기 방향을 판정합니다.">
                <TimeframeScorePanel result={analysis.data} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <SectionCard title="팩터별 점수" caption="원시값을 점수화한 뒤 모드별 가중치를 적용합니다.">
                <FactorScorePanel factors={analysis.data.factors} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard title="분석 근거와 확인 사항" caption="점수와 전략 판정에 사용한 핵심 설명">
                <AnalysisNarrativePanel reasons={analysis.data.reasons} warnings={analysis.data.warnings} />
              </SectionCard>
            </Grid>
          </>
        )}

        <Grid size={{ xs: 12 }}>
          <SectionCard title="과거 분석 이력" caption={`${mode} 모드의 최근 분석 결과`} action={history.data?.totalElements != null ? <Chip label={`${history.data.totalElements}건`} size="small" variant="outlined" /> : null}>
            <AnalysisHistoryPanel status={history.status} data={history.data} selectedRunId={analysis.data?.analysisRunId} onSelect={selectHistory} />
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
