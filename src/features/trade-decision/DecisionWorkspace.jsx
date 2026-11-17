import { useId } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import SectionCard from '../../components/common/SectionCard';
import NewsInsightsPanel from './NewsInsightsPanel';
import IntegratedDecisionPanel from './IntegratedDecisionPanel';
import TradeDecisionPanel from './TradeDecisionPanel';

/** The same explicit, read-only-on-entry workflow in single analysis and saved-result popups. */
export default function DecisionWorkspace({ snapshotId, stockCode, aiConfigured, integratedAvailable, embedded = false, prepareSnapshot, sourceRunId, holdingAnalysis }) {
  const id = useId();
  const newsId = `${id}-news`; const integratedId = `${id}-integrated`; const personalId = `${id}-personal`;
  const jump = target => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const common = { snapshotId, stockCode, aiConfigured, embedded, prepareSnapshot };
  return <Stack gap={2}>
    <SectionCard title="AI 분석 이용 안내" caption="필요한 분석을 선택해 실행하세요. 화면을 여는 것만으로 새 AI 분석이 시작되지는 않습니다.">
      <Stack gap={1.5}>
        <Typography variant="body2">{integratedAvailable
          ? '뉴스·공시 근거 확인 → 통합 매매 판단 → 판단 이후 모의 성과 확인 순서로 이용하세요.'
          : '뉴스·업황에서 외부 근거를 확인하고, 개인 조건별 검토가 필요하면 AI 매매 판단을 이용하세요.'}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          <Button variant="outlined" onClick={() => jump(newsId)}>뉴스·공시 확인으로 이동</Button>
          {integratedAvailable && <Button variant="outlined" onClick={() => jump(integratedId)}>통합 판단·성과로 이동</Button>}
          <Button onClick={() => jump(personalId)}>개인 조건 검토로 이동</Button>
        </Stack>
        {integratedAvailable && <Typography variant="body2" color="text.secondary">통합 판단은 완료된 뉴스 리서치와 실행 시점의 등록 잔고를 함께 사용합니다. 뉴스가 없거나 오래되면 신규 매수가 제한될 수 있습니다. 모의 성과는 판단 완료 다음 거래일부터 자료가 쌓이면 표시됩니다.</Typography>}
      </Stack>
    </SectionCard>
    <Box component="section" id={newsId} aria-label="뉴스·공시 근거 확인" sx={{ scrollMarginTop: '88px' }}>
      <NewsInsightsPanel {...common} />
    </Box>
    {integratedAvailable && <Box component="section" id={integratedId} aria-label="통합 판단과 모의 성과" sx={{ scrollMarginTop: '88px' }}>
      <IntegratedDecisionPanel {...common} onReviewResearch={() => jump(newsId)} />
    </Box>}
    <Box component="section" id={personalId} aria-label="개인 조건별 AI 검토" sx={{ scrollMarginTop: '88px' }}>
      <Typography variant="body2" color="text.secondary" mb={1}>선택 기능 · 아래 AI 매매 판단은 성향·확인 빈도·보유기간을 바꿔 검토하는 별도 분석입니다. 뉴스 리서치를 결합한 통합 판단과 구분해 확인하세요.</Typography>
      <TradeDecisionPanel {...common} sourceRunId={sourceRunId} holdingAnalysis={holdingAnalysis} />
    </Box>
  </Stack>;
}
