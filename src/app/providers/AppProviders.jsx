import { CssBaseline, ThemeProvider } from '@mui/material';
import PropTypes from 'prop-types';
import theme from '../theme/theme';

export default function AppProviders({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

AppProviders.propTypes = { children: PropTypes.node.isRequired };
