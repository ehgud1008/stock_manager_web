import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { AppBar, Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const drawerWidth = 248;
const navigation = [
  { label: '대시보드', path: '/', icon: <DashboardOutlinedIcon /> },
  { label: '종합분석', path: '/unified-analysis', icon: <AutoAwesomeOutlinedIcon /> },
  { label: '종목 분석', path: '/analysis/005930', icon: <AssessmentOutlinedIcon /> },
  { label: '전체 종목분석', path: '/analysis-scans', icon: <AssessmentOutlinedIcon /> },
  { label: '스크리너', path: '/screener', icon: <TuneOutlinedIcon /> },
  { label: '백테스트', path: '/backtest', icon: <ScienceOutlinedIcon /> },
  { label: '설정', path: '/settings', icon: <SettingsOutlinedIcon /> },
];

function NavigationContent({ onNavigate }) {
  const location = useLocation();
  const screener = ['/screener', '/analysis-scans', '/unified-analysis'].some(path => location.pathname.startsWith(path));
  return (
    <Stack height="100%">
      <Stack direction="row" alignItems="center" gap={1.25} px={2.5} py={2.8}>
        <Box sx={{ width: 32, height: 32, borderRadius: '10px 4px 10px 4px', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontWeight: 900 }}>S</Box>
        <Box><Typography fontWeight={700} letterSpacing="-.03em">STOCKSCOPE</Typography><Typography variant="caption" color="text.secondary">ANALYSIS CONSOLE</Typography></Box>
      </Stack>
      <Divider />
      <Typography variant="overline" color="text.secondary" px={2.5} pt={3} pb={1}>WORKSPACE</Typography>
      <List sx={{ px: 1.5 }}>
        {navigation.map((item) => {
          const selected = item.path === '/' ? location.pathname === '/' : item.path.startsWith('/analysis/') ? location.pathname.startsWith('/analysis/') : location.pathname.startsWith(item.path);
          return (
            <ListItemButton key={item.path} component={NavLink} to={item.path} onClick={onNavigate} selected={selected} sx={{ mb: 0.5, borderRadius: 2, '&.Mui-selected': { bgcolor: 'rgba(139,218,99,.1)', color: 'primary.light', '&:hover': { bgcolor: 'rgba(139,218,99,.14)' } } }}>
              <ListItemIcon sx={{ minWidth: 38, color: selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: selected ? 650 : 500 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box mt="auto" p={2}>
        <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.035)', border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" gap={1}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: screener ? 'text.secondary' : 'success.main' }} /><Typography variant="caption" fontWeight={600}>{screener ? '서버 분석 연결' : 'Mock API 연결됨'}</Typography></Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>{screener ? '연결·실행 상태는 화면에서 확인하세요.' : '실제 시세·분석 결과가 아닙니다.'}</Typography>
        </Box>
      </Box>
    </Stack>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` }, bgcolor: 'rgba(8,11,18,.82)', backdropFilter: 'blur(16px)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, md: 3.5 } }}>
          {!desktop && <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }} aria-label="메뉴 열기"><MenuRoundedIcon /></IconButton>}
          <Typography variant="body2" color="text.secondary">KOREA EQUITY / RESEARCH</Typography>
          <Box flex={1} />
          <Chip label={['/screener', '/analysis-scans', '/unified-analysis'].some(path => location.pathname.startsWith(path)) ? 'ENGINE API' : 'MOCK DATA'} size="small" variant="outlined" sx={{ fontSize: 10, letterSpacing: '.08em' }} />
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: '#0C1018', borderRightColor: 'divider' } }}>
          <NavigationContent onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` }, minWidth: 0, pt: '64px' }}>
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1600, mx: 'auto' }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
