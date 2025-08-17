'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  AppShell,
  Header,
  Group,
  Button,
  Container,
  Text,
  LoadingOverlay,
  Alert,
  ActionIcon,
  Tooltip,
  Badge,
} from '@mantine/core';
import {
  IconBriefcase,
  IconDashboard,
  IconSettings,
  IconLogout,
  IconRefresh,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import { Landing } from '../components/Landing/Landing';
import { Leads } from '../components/Jobs/Jobs';
import { SessionDebug } from './components/SessionDebug';

interface SyncStatus {
  isRunning: boolean;
  lastSync?: string;
  message?: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [currentView, setCurrentView] = useState<'landing' | 'leads'>('landing');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('Session Debug: User not authenticated');
    } else if (status === 'authenticated' && session?.user?.id) {
      console.log('Session Debug:', {
        status,
        hasSession: !!session,
        userId: session.user.id,
      });
    }
  }, [status, session]);

  const handleNavigation = (view: 'landing' | 'leads') => {
    setCurrentView(view);
  };

  const startManualSync = async () => {
    try {
      setSyncStatus({ isRunning: true, message: 'Starting manual sync...' });
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/sync', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSyncStatus({
          isRunning: false,
          lastSync: new Date().toISOString(),
          message: `Sync completed! Processed ${data.data.totalEmailsProcessed} emails, created ${data.data.totalLeadsInserted} leads.`,
        });
        setSuccess('Manual sync completed successfully!');
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start manual sync');
        setSyncStatus({ isRunning: false });
      }
    } catch (error) {
      setError('Failed to start manual sync');
      setSyncStatus({ isRunning: false });
      console.error('Manual sync error:', error);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const renderMainContent = () => {
    if (status === 'loading') {
      return (
        <Container size="md" py="xl" style={{ textAlign: 'center' }}>
          <Text>Loading...</Text>
        </Container>
      );
    }

    // Don't render components that require userId if not authenticated
    if (status === 'unauthenticated') {
      return (
        <Container size="md" py="xl" style={{ textAlign: 'center' }}>
          <Text size="lg" mb="md">
            Welcome to Job Application Manager
          </Text>
          <Text c="dimmed" mb="lg">
            Please sign in to access your dashboard and manage job leads.
          </Text>
          <Button
            component="a"
            href="/auth/signin"
            leftSection={<IconBriefcase size="1rem" />}
            size="lg"
          >
            Sign In with Google
          </Button>
        </Container>
      );
    }

    switch (currentView) {
      case 'leads':
        return <Leads userId={session?.user?.id || ''} />;
      default:
        return <Landing userId={session?.user?.id || ''} />;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <IconBriefcase size="1.5rem" />
            <Text size="lg" fw={600}>
              Job Application Manager
            </Text>
          </Group>

          {status === 'authenticated' && session?.user?.id && (
            <Group>
              {/* Sync Status Badge */}
              {syncStatus.lastSync && (
                <Badge
                  color="green"
                  variant="light"
                  size="sm"
                  leftSection={<IconCheck size="0.75rem" />}
                >
                  Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                </Badge>
              )}

              {/* Manual Sync Button */}
              <Tooltip label="Sync emails for new job leads">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="lg"
                  onClick={startManualSync}
                  loading={syncStatus.isRunning}
                  disabled={syncStatus.isRunning}
                >
                  <IconRefresh size="1.2rem" />
                </ActionIcon>
              </Tooltip>

              {/* Navigation Buttons */}
              <Button
                variant={currentView === 'landing' ? 'filled' : 'light'}
                leftSection={<IconDashboard size="1rem" />}
                onClick={() => handleNavigation('landing')}
                size="sm"
              >
                Dashboard
              </Button>

              <Button
                variant={currentView === 'leads' ? 'filled' : 'light'}
                leftSection={<IconBriefcase size="1rem" />}
                onClick={() => handleNavigation('leads')}
                size="sm"
              >
                Leads
              </Button>

              <Button
                component="a"
                href="/settings"
                variant="light"
                leftSection={<IconSettings size="1rem" />}
                size="sm"
              >
                Settings
              </Button>

              {/* User Info and Sign Out */}
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  {session.user.email}
                </Text>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconLogout size="1rem" />}
                  onClick={handleSignOut}
                  size="sm"
                >
                  Sign Out
                </Button>
              </Group>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {/* Sync Status Alert */}
        {syncStatus.message && (
          <Container size="xl" mb="md">
            <Alert
              icon={syncStatus.isRunning ? <IconRefresh size="1rem" /> : <IconCheck size="1rem" />}
              title={syncStatus.isRunning ? 'Sync in Progress' : 'Last Sync'}
              color={syncStatus.isRunning ? 'blue' : 'green'}
              variant="light"
              onClose={() => setSyncStatus(prev => ({ ...prev, message: undefined }))}
              withCloseButton
            >
              <Text size="sm">{syncStatus.message}</Text>
            </Alert>
          </Container>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Container size="xl" mb="md">
            <Alert
              icon={<IconX size="1rem" />}
              title="Error"
              color="red"
              variant="light"
              onClose={() => setError(null)}
              withCloseButton
            >
              {error}
            </Alert>
          </Container>
        )}

        {success && (
          <Container size="xl" mb="md">
            <Alert
              icon={<IconCheck size="1rem" />}
              title="Success"
              color="green"
              variant="light"
              onClose={() => setSuccess(null)}
              withCloseButton
            >
              {success}
            </Alert>
          </Container>
        )}

        {renderMainContent()}
        <SessionDebug />
      </AppShell.Main>
    </AppShell>
  );
}
