import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function SectionCard({ title, caption, action, children, sx }) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
        {(title || action) && (
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2.25}>
            <Box>
              {title && <Typography variant="h3">{title}</Typography>}
              {caption && <Typography variant="body2" color="text.secondary" mt={0.5}>{caption}</Typography>}
            </Box>
            {action}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

SectionCard.propTypes = {
  title: PropTypes.string,
  caption: PropTypes.string,
  action: PropTypes.node,
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
};
