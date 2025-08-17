'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  MultiSelect,
  NumberInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Alert,
  LoadingOverlay,
} from '@mantine/core';
import { useSession } from 'next-auth/react';
import { IconAlertCircle, IconCheck, IconRefresh } from '@tabler/icons-react';

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

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    watchedLabelIds: [],
    cronFrequencyMinutes: 1440,
    customInstructions: '',
  });
  const [loading, setLoading] = useState(false);
  const [syncingLabels, setSyncingLabels] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fetch labels and settings on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchLabels();
      fetchSettings();
    }
  }, [status]);

  const fetchLabels = async () => {
    try {
      const response = await fetch('/api/gmail/labels');
      if (response.ok) {
        const data = await response.json();
        setLabels(data.labels || []);
      } else {
        console.error('Failed to fetch labels');
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error('Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const syncLabels = async () => {
    setSyncingLabels(true);
    try {
      const response = await fetch('/api/gmail/labels/sync', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `Successfully synced ${data.synced} labels`,
        });
        // Refresh labels after sync
        await fetchLabels();
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.error || 'Failed to sync labels',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to sync labels. Please try again.',
      });
    } finally {
      setSyncingLabels(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.error || 'Failed to save settings',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter out system labels for the multi-select
  const userLabels = labels.filter((label) => label.type === 'user');

  if (status === 'loading') {
    return (
      <Container size="md" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container size="md" py="xl">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Authentication Required"
          color="red"
        >
          Please sign in to access your settings.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xl">
        Settings
      </Title>

      {message && (
        <Alert
          icon={
            message.type === 'success' ? (
              <IconCheck size="1rem" />
            ) : (
              <IconAlertCircle size="1rem" />
            )
          }
          title={message.type === 'success' ? 'Success' : 'Error'}
          color={message.type === 'success' ? 'green' : 'red'}
          mb="md"
          onClose={() => setMessage(null)}
          withCloseButton
        >
          {message.text}
        </Alert>
      )}

      <Paper shadow="xs" p="xl" withBorder>
        <Stack gap="lg">
          {/* Gmail Labels Section */}
          <div>
            <Group justify="space-between" mb="sm">
              <Title order={3}>Gmail Labels</Title>
              <Button
                leftSection={<IconRefresh size="1rem" />}
                onClick={syncLabels}
                loading={syncingLabels}
                variant="outline"
              >
                Sync Labels
              </Button>
            </Group>
            <Text size="sm" c="dimmed" mb="md">
              Select which Gmail labels to monitor for job leads. Use the "Sync
              Labels" button to refresh the list from Gmail.
            </Text>

            <MultiSelect
              label="Watched Labels"
              placeholder="Select labels to monitor"
              data={userLabels.map((label) => ({
                value: label.id,
                label: label.name,
              }))}
              value={settings.watchedLabelIds}
              onChange={(value) =>
                setSettings((prev) => ({ ...prev, watchedLabelIds: value }))
              }
              searchable
              disabled={labels.length === 0}
            />
            {labels.length === 0 && (
              <Text size="xs" c="dimmed" mt="xs">
                No labels found. Click "Sync Labels" to fetch labels from Gmail.
              </Text>
            )}
          </div>

          {/* Sync Frequency Section */}
          <div>
            <Title order={3} mb="sm">
              Sync Frequency
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              How often to check for new emails (in minutes). Minimum 15,
              maximum 1440 (24 hours).
            </Text>

            <NumberInput
              label="Check every (minutes)"
              placeholder="1440"
              min={15}
              max={1440}
              value={settings.cronFrequencyMinutes}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  cronFrequencyMinutes:
                    typeof value === 'number' ? value : 1440,
                }))
              }
              step={15}
            />
          </div>

          {/* Custom Instructions Section */}
          <div>
            <Title order={3} mb="sm">
              Custom Instructions
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Provide specific instructions for the AI when extracting job leads
              from your emails.
            </Text>

            <Textarea
              label="Extraction Instructions"
              placeholder="e.g., Ignore links with 'Senior' in the title, focus on remote positions, prefer companies with 50+ employees"
              value={settings.customInstructions}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  customInstructions: event.currentTarget.value,
                }))
              }
              minRows={4}
              maxRows={8}
            />
            <Text size="xs" c="dimmed" mt="xs">
              These instructions will be sent to the AI to help it better
              understand your preferences when analyzing emails.
            </Text>
          </div>

          {/* Save Button */}
          <Group justify="flex-end" mt="xl">
            <Button onClick={saveSettings} loading={loading} size="lg">
              Save Settings
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
