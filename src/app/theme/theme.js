import { alpha, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#8BDA63', light: '#B8EE9C', dark: '#63AE41', contrastText: '#0A1207' },
    secondary: { main: '#71A7FF' },
    background: { default: '#080B12', paper: '#111620' },
    text: { primary: '#F3F6F1', secondary: '#929CAB' },
    divider: 'rgba(255,255,255,0.08)',
    success: { main: '#66D38A' },
    warning: { main: '#F0B766' },
    error: { main: '#F27878' },
  },
  typography: {
    fontFamily: '"Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif',
    h1: { fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 600, letterSpacing: '-0.055em', lineHeight: 1.08 },
    h2: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.035em' },
    h3: { fontSize: '1.05rem', fontWeight: 600, letterSpacing: '-0.02em' },
    button: { fontWeight: 600, textTransform: 'none' },
    overline: { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em' },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { minWidth: 320, backgroundImage: 'radial-gradient(circle at 55% -20%, rgba(139,218,99,.08), transparent 34%)' },
        '*': { boxSizing: 'border-box' },
        '::selection': { background: alpha('#8BDA63', 0.28) },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10, minHeight: 42 } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid rgba(255,255,255,.075)', backgroundColor: 'rgba(17,22,32,.92)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});

export default theme;
