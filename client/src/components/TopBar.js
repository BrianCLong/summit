import { AppBar, Toolbar, Typography, Box, TextField, InputAdornment } from ' @mui/material';
import SearchIcon from ' @mui/icons-material/Search';
import TopbarSetupButton from './TopbarSetupButton';

export default function TopBar() {
  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>CompanyOS Switchboard</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search agents, rooms, views…"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mr: 2, minWidth: 280 }}
        />
        <TopbarSetupButton />
      </Toolbar>
    </AppBar>
  );
}