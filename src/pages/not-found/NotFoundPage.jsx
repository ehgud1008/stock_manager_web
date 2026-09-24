import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Box sx={{ minHeight: 'calc(100vh - 150px)', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box><Typography sx={{ fontSize: 'clamp(5rem, 16vw, 10rem)', fontWeight: 700, lineHeight: 0.9, color: 'rgba(139,218,99,.12)' }}>404</Typography><Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' }, mt: -2 }}>페이지를 찾을 수 없습니다</Typography><Typography color="text.secondary" mt={2}>요청한 주소가 변경되었거나 존재하지 않습니다.</Typography><Button component={Link} to="/" variant="contained" startIcon={<ArrowBackRoundedIcon />} sx={{ mt: 3 }}>대시보드로 이동</Button></Box>
    </Box>
  );
}
