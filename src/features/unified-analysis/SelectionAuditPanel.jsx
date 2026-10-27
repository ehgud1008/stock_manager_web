import { useEffect, useState } from 'react';
import { Alert, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { getSelectionAudit } from '../../api/portfolioApi';

export function SelectionAuditView({ audit }) {
  if (!audit) return null;
  if (audit.state !== 'READY') return <Alert severity="info">이전 보고서는 공통 판단 근거가 없어 조건별 정밀 집계를 지원하지 않습니다.</Alert>;
  return <Stack gap={1}>
    <Typography>대상 {audit.target}종목 · 근거 저장 {audit.recorded}종목 · 공통 진입 통과 {audit.commonEligible}종목</Typography>
    <Typography>자료 미확인 {audit.dataUnavailable}종목 · 입력 오류 {audit.invalidInput}종목 · 근거 미저장 {audit.missingRecords}종목</Typography>
    <Typography>한 조건만 미충족 {audit.singleFailure}종목 · 여러 조건 미충족 {audit.multipleFailures}종목 · 순위 상한 제외 {audit.rankLimited}종목</Typography>
    <TableContainer><Table size="small" aria-label="조건별 탈락 원인"><TableHead><TableRow>
      {['조건', '미충족', '미확인', '이 조건만 미충족'].map(text => <TableCell key={text}>{text}</TableCell>)}
    </TableRow></TableHead><TableBody>{audit.rules.map(rule => <TableRow key={rule.code}>
      <TableCell>{rule.label}</TableCell><TableCell>{rule.failed}</TableCell><TableCell>{rule.unknown}</TableCell><TableCell>{rule.onlyFailure}</TableCell>
    </TableRow>)}</TableBody></Table></TableContainer>
    <Typography variant="subtitle2">한 조건만 미충족한 종목 ({audit.nearMisses.length}/{audit.nearMissTotal}, 종목 코드 순 최대 100개)</Typography>
    {audit.nearMisses.map(stock => <Typography key={stock.code} variant="body2">{stock.name} ({stock.code}) · {stock.rule}</Typography>)}
    {!audit.nearMisses.length && <Typography variant="body2">해당 종목 없음</Typography>}
    {audit.limitations.map(text => <Typography key={text} variant="caption" color="text.secondary">{text}</Typography>)}
  </Stack>;
}
SelectionAuditView.propTypes = { audit: PropTypes.object };

export default function SelectionAuditPanel({ reports }) {
  const [id, setId] = useState(''); const [audit, setAudit] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    setAudit(null); setError(''); if (!id) return undefined;
    const controller = new AbortController();
    getSelectionAudit(id, controller.signal).then(data => { if (!controller.signal.aborted) setAudit(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [id]);
  return <Stack gap={1}>
    <Typography variant="h6">선정 조건 진단</Typography>
    <Typography variant="body2">자료 부족과 조건 미충족을 구분합니다. 조회만으로 평가 등록이나 운영 기준 변경을 하지 않습니다.</Typography>
    <TextField select label="진단할 보고서" value={id} onChange={e => setId(e.target.value)}>
      <MenuItem value="">보고서 선택</MenuItem>{reports.map(report => <MenuItem key={report.id} value={report.id}>{report.tradeDate} · {report.id.slice(0, 8)}</MenuItem>)}
    </TextField>
    {id && !audit && !error && <LinearProgress aria-label="선정 조건 진단 조회 중" />}
    {error && <Alert severity="error">{error}</Alert>}
    <SelectionAuditView audit={audit} />
  </Stack>;
}
SelectionAuditPanel.propTypes = { reports: PropTypes.array.isRequired };
