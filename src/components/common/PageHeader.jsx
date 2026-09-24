import { Box, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function PageHeader({ eyebrow, title, description, chip = '화면용 목업' }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} gap={2} mb={3.5}>
      <Box>
        <Typography variant="overline" color="primary.main">{eyebrow}</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.7rem' }, mt: 0.5 }}>{title}</Typography>
        <Typography color="text.secondary" mt={1} sx={{ maxWidth: 720 }}>{description}</Typography>
      </Box>
      <Chip label={chip} size="small" variant="outlined" color="primary" />
    </Stack>
  );
}

PageHeader.propTypes = {
  eyebrow: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  chip: PropTypes.string,
};
