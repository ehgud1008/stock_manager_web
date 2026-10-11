import { Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

const actions = { BUY: '매수 검토', SELL: '매도 검토', HOLD: '보유 유지', WAIT: '진입 대기', UNDETERMINED: '판단 유보' };
const price = value => value == null ? '미제시' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;

export default function EngineAiComparison({ result }) {
  const { policy, aiReview: review, context } = result;
  const plan = policy.horizonPlan;
  const metrics = plan?.status === 'AVAILABLE' ? plan.metrics || {} : {};
  const strategy = review.independent.strategies.find(item => item.id === review.planId)
    || review.independent.strategies.find(item => item.id === 'MAIN');
  const action = value => value === 'BUY' && context?.positionStatus === 'HELD' ? '추가 매수 검토' : actions[value] || '판단 유보';
  const rows = [
    ['판단', action(policy.engineAssessment), action(result.finalAction)],
    ['가격 전략 기간', plan?.horizonTradingDays ? `${plan.horizonTradingDays}거래일${plan.referenceOnly ? ' · 엔진 비교용' : ''}` : '미제시', strategy ? `${strategy.horizonTradingDays}거래일` : '미제시'],
    ['진입 범위', metrics.ENTRY_LOW?.value != null && metrics.ENTRY_HIGH?.value != null ? `${price(metrics.ENTRY_LOW.value)} ~ ${price(metrics.ENTRY_HIGH.value)}` : '미제시', strategy ? `${price(strategy.entryLow.value)} ~ ${price(strategy.entryHigh.value)}` : '미제시'],
    ['1차 목표', price(metrics.TARGET_ONE?.value), price(strategy?.targets[0]?.value)],
    ['2차 목표', price(metrics.TARGET_TWO?.value), price(strategy?.targets[1]?.value)],
    ['손절 참고선', price(metrics.STOP?.value), price(strategy?.stop.value)],
    ['판단·전략 설명', plan?.reason || '저장된 엔진 설명이 없습니다.', review.detail?.conclusion?.text || '저장된 AI 설명이 없습니다.'],
    ['재검토 조건', plan?.timeRule || '미제시', strategy?.timeCondition || review.detail?.timeReview?.text || '미제시'],
  ];
  return <Stack gap={1}>
    <Typography fontWeight={700}>엔진과 AI 비교</Typography>
    <Typography variant="caption" color="text.secondary">왼쪽은 저장된 엔진 분석, 오른쪽은 AI 판단입니다. 값이 다른 행은 색상과 ‘차이’ 표시로 구분합니다. 가격은 각 전략의 기간을 함께 확인하세요.</Typography>
    <TableContainer component={Box} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Table size="small" aria-label="엔진과 AI 좌우 비교" sx={{ tableLayout: 'fixed', minWidth: 560 }}>
        <TableHead><TableRow>
          <TableCell scope="col" sx={{ width: '50%', bgcolor: 'action.hover', fontWeight: 700 }}>엔진 분석</TableCell>
          <TableCell scope="col" sx={{ width: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>AI 분석</TableCell>
        </TableRow></TableHead>
        <TableBody>{rows.map(([label, engine, ai]) => {
          const differs = engine !== ai;
          return <TableRow key={label}>{[engine, ai].map((value, index) => <TableCell key={index} sx={{ verticalAlign: 'top', overflowWrap: 'anywhere', p: 1.5,
            borderLeft: index ? 1 : 0, borderLeftColor: 'divider', bgcolor: differs ? (index ? 'info.light' : 'action.hover') : 'background.paper',
            color: differs && index ? 'info.contrastText' : 'text.primary' }}>
            <Stack direction="row" alignItems="center" gap={1} mb={0.5}><Typography variant="caption" fontWeight={700}>{label}</Typography>
              {differs && <Chip size="small" variant="outlined" label="차이" sx={{ height: 20, color: 'inherit', borderColor: 'currentColor' }} />}</Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontWeight: label === '판단' ? 700 : 400 }}>{value}</Typography>
          </TableCell>)}</TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>
    <Typography variant="caption" color="text.secondary">AI 가격은 선택 전략 또는 주 전략 기준입니다. 전략을 제시하지 않은 경우 엔진 가격으로 대신 표시하지 않습니다.</Typography>
  </Stack>;
}
