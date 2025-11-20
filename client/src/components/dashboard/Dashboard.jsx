import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp,
  Group,
  AccountTree,
  Assessment,
} from '@mui/icons-material';
import { useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import OnboardingTour from '../onboarding/OnboardingTour';
import ActivityWidget from '../activity/ActivityWidget';
import ServiceHealthCard from './ServiceHealthCard';
import TemplateModal from '../templates/TemplateModal';
import { useI18n } from '../../hooks/useI18n';
import LocaleSelector from '../i18n/LocaleSelector';

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const CREATE_ALERT = gql`
    mutation DemoAlert($title: String!, $message: String!) {
      createAlert(
        type: "prediction"
        severity: "info"
        title: $title
        message: $message
      ) {
        id
      }
    }
  `;
  const [createAlert] = useMutation(CREATE_ALERT);

  useEffect(() => {
    const seen = localStorage.getItem('onboarding_seen');
    if (!seen) setShowOnboarding(true);
  }, []);

  const stats = [
    {
      label: t('dashboard.stats.activeInvestigations'),
      value: '12',
      icon: <Assessment />,
      color: 'primary',
    },
    {
      label: t('dashboard.stats.totalEntities'),
      value: '1,247',
      icon: <Group />,
      color: 'secondary',
    },
    {
      label: t('dashboard.stats.relationships'),
      value: '3,891',
      icon: <AccountTree />,
      color: 'success',
    },
    {
      label: t('dashboard.stats.monthlyGrowth'),
      value: '+23%',
      icon: <TrendingUp />,
      color: 'info'
    },
  ];

  const recentInvestigations = [
    {
      id: 1,
      title: 'Financial Network Analysis',
      status: 'active',
      entities: 45,
      updated: '2 hours ago',
    },
    {
      id: 2,
      title: 'Supply Chain Investigation',
      status: 'pending',
      entities: 78,
      updated: '5 hours ago',
    },
    {
      id: 3,
      title: 'Communication Pattern Analysis',
      status: 'completed',
      entities: 123,
      updated: '1 day ago',
    },
    {
      id: 4,
      title: 'Geographic Movement Tracking',
      status: 'active',
      entities: 34,
      updated: '2 days ago',
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          {t('dashboard.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <LocaleSelector variant="button" size="small" />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/investigations')}
            size="large"
          >
            {t('dashboard.newInvestigation')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowTemplateModal(true)}
            size="large"
          >
            {t('dashboard.startFromTemplate')}
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              createAlert({
                variables: {
                  title: 'Demo alert',
                  message: 'This is a demo alert from Dashboard',
                },
              })
            }
          >
            {t('dashboard.sendDemoAlert')}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: `${stat.color}.light`,
                      color: `${stat.color}.main`,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ActivityWidget />
        </Grid>
        <Grid item xs={12} md={6}>
          <ServiceHealthCard />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('dashboard.recentInvestigations')}
          </Typography>
          <Box sx={{ mt: 2 }}>
            {recentInvestigations.map((investigation) => (
              <Box
                key={investigation.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderBottom: '1px solid #eee',
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: 'grey.50', cursor: 'pointer' },
                }}
                onClick={() => navigate(`/graph/${investigation.id}`)}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {investigation.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.entitiesPlural', { count: investigation.entities })} • {t('dashboard.updated', { time: investigation.updated })}
                  </Typography>
                </Box>
                <Chip
                  label={t(`dashboard.status.${investigation.status}`)}
                  color={getStatusColor(investigation.status)}
                  size="small"
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {showOnboarding && (
        <OnboardingTour
          open
          onClose={() => {
            localStorage.setItem('onboarding_seen', '1');
            setShowOnboarding(false);
          }}
        />
      )}
      {showTemplateModal && (
        <TemplateModal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelect={(tpl) => navigate(`/investigations?template=${tpl.id}`)}
        />
      )}
    </Box>
  );
}

export default Dashboard;
