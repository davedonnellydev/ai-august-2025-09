'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Divider,
  Alert,
  LoadingOverlay,
  Select,
  Textarea,
  NumberInput,
  Badge,
  Switch,
  Card,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconRefresh,
  IconSettings,
  IconMail,
  IconClock,
  IconEdit,
  IconRefreshAlert,
  IconCheck,
  IconX,
} from '@tabler/icons-react';

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

interface UserSettings {
  watchedLabelIds: string[];
  cronFrequencyMinutes: number;
  customInstructions: string;
}

interface SyncStatus {
  isRunning: boolean;
  lastSync?: string;
  message?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    watchedLabelIds: [],
    cronFrequencyMinutes: 1440,
    customInstructions: '',
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchLabels();
      fetchSettings();
    }
  }, [session?.user?.id]);

  const fetchLabels = async () => {
    try {
      const response = await fetch('/api/gmail/labels');
      if (response.ok) {
        const data = await response.json();
        setLabels(data.labels || []);
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const syncLabels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/gmail/labels/sync', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(`Labels synced successfully! Found ${data.synced} labels.`);
        fetchLabels(); // Refresh the labels list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to sync labels');
      }
    } catch (error) {
      setError('Failed to sync labels');
      console.error('Label sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setSuccess('Settings saved successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save settings');
      }
    } catch (error) {
      setError('Failed to save settings');
      console.error('Save settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startManualSync = async () => {
    try {
      setSyncStatus({ isRunning: true, message: 'Starting manual sync...' });
      setError(null);
      
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

  const handleLabelToggle = (labelId: string) => {
    setSettings(prev => ({
      ...prev,
      watchedLabelIds: prev.watchedLabelIds.includes(labelId)
        ? prev.watchedLabelIds.filter(id => id !== labelId)
        : [...prev.watchedLabelIds, labelId],
    }));
  };

  const formatFrequency = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  };

  if (!session?.user?.id) {
    return (
      <Container size="md" py="xl">
        <Paper shadow="md" p="xl" withBorder>
          <Text ta="center" c="dimmed">
            Please sign in to access settings.
          </Text>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} mb="xs">
              <IconSettings size="1.5rem" style={{ marginRight: '0.5rem' }} />
              Settings
            </Title>
            <Text c="dimmed">
              Manage your Gmail sync preferences and job lead extraction rules
            </Text>
          </div>
          
          {/* Manual Sync Button */}
          <Button
            leftSection={<IconRefreshAlert size="1rem" />}
            onClick={startManualSync}
            loading={syncStatus.isRunning}
            disabled={syncStatus.isRunning || settings.watchedLabelIds.length === 0}
            variant="filled"
            color="blue"
            size="lg"
          >
            {syncStatus.isRunning ? 'Syncing...' : 'Manual Sync'}
          </Button>
        </Group>

        {/* Sync Status */}
        {syncStatus.message && (
          <Alert
            icon={syncStatus.isRunning ? <IconRefreshAlert size="1rem" /> : <IconCheck size="1rem" />}
            title={syncStatus.isRunning ? 'Sync in Progress' : 'Last Sync'}
            color={syncStatus.isRunning ? 'blue' : 'green'}
            variant="light"
          >
            <Text size="sm">{syncStatus.message}</Text>
            {syncStatus.lastSync && (
              <Text size="xs" c="dimmed" mt="xs">
                Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
              </Text>
            )}
          </Alert>
        )}

        {/* Error/Success Messages */}
        {error && (
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
        )}

        {success && (
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
        )}

        <LoadingOverlay visible={loading} />

        {/* Gmail Labels Section */}
        <Paper shadow="md" p="xl" withBorder>
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <div>
                <Title order={2} size="h3">
                  <IconMail size="1.2rem" style={{ marginRight: '0.5rem' }} />
                  Gmail Labels
                </Title>
                <Text c="dimmed" size="sm">
                  Select which Gmail labels to monitor for job leads
                </Text>
              </div>
              
              <Button
                leftSection={<IconRefresh size="1rem" />}
                onClick={syncLabels}
                loading={loading}
                variant="outline"
                size="sm"
              >
                Sync Labels
              </Button>
            </Group>

            {labels.length === 0 ? (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  No Gmail labels found. Click "Sync Labels" to fetch your Gmail labels.
                </Text>
              </Alert>
            ) : (
              <div>
                <Text size="sm" fw={500} mb="md">
                  Select labels to watch for job leads:
                </Text>
                <Stack gap="xs">
                  {labels.map((label) => (
                    <Card key={label.id} withBorder p="sm">
                      <Group justify="space-between" align="center">
                        <div>
                          <Text size="sm" fw={500}>
                            {label.name}
                          </Text>
                          <Group gap="xs" mt="xs">
                            <Badge size="xs" variant="light">
                              {label.type}
                            </Badge>
                            {settings.watchedLabelIds.includes(label.id) && (
                              <Badge size="xs" color="green" variant="light">
                                Watching
                              </Badge>
                            )}
                          </Group>
                        </div>
                        
                        <Switch
                          checked={settings.watchedLabelIds.includes(label.id)}
                          onChange={() => handleLabelToggle(label.id)}
                          size="sm"
                        />
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        </Paper>

        {/* Sync Frequency Section */}
        <Paper shadow="md" p="xl" withBorder>
          <Stack gap="lg">
            <div>
              <Title order={2} size="h3">
                <IconClock size="1.2rem" style={{ marginRight: '0.5rem' }} />
                Sync Frequency
              </Title>
              <Text c="dimmed" size="sm">
                How often to automatically sync emails (in minutes)
              </Text>
            </div>

            <NumberInput
              label="Sync Interval"
              description={`Currently syncing every ${formatFrequency(settings.cronFrequencyMinutes)}`}
              placeholder="1440"
              min={15}
              max={1440}
              step={15}
              value={settings.cronFrequencyMinutes}
              onChange={(value) => setSettings(prev => ({ ...prev, cronFrequencyMinutes: typeof value === 'number' ? value : 1440 }))}
              leftSection={<IconClock size="1rem" />}
            />
            
            <Text size="xs" c="dimmed">
              Note: Minimum 15 minutes, maximum 24 hours (1440 minutes). 
              Changes will take effect on the next scheduled sync.
            </Text>
          </Stack>
        </Paper>

        {/* Custom Instructions Section */}
        <Paper shadow="md" p="xl" withBorder>
          <Stack gap="lg">
            <div>
              <Title order={2} size="h3">
                <IconEdit size="1.2rem" style={{ marginRight: '0.5rem' }} />
                Custom Extraction Rules
              </Title>
              <Text c="dimmed" size="sm">
                Provide specific instructions for AI job lead extraction
              </Text>
            </div>

            <Textarea
              label="Custom Instructions"
              description="Tell the AI how to identify and classify job leads from your emails"
              placeholder="Example: Focus on engineering and technical roles only. Ignore marketing and sales positions. Prioritize remote/hybrid opportunities. Look for senior-level positions (5+ years experience)."
              value={settings.customInstructions}
              onChange={(event) => setSettings(prev => ({ ...prev, customInstructions: event.currentTarget.value }))}
              minRows={4}
              maxRows={8}
            />
            
            <Text size="xs" c="dimmed">
              These instructions will be used by the AI to better understand what types of job leads 
              you're interested in and how to classify them.
            </Text>
          </Stack>
        </Paper>

        {/* Save Button */}
        <Group justify="center">
          <Button
            leftSection={<IconCheck size="1rem" />}
            onClick={saveSettings}
            loading={loading}
            size="lg"
            disabled={settings.watchedLabelIds.length === 0}
          >
            Save Settings
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
