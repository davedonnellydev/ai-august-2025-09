'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Card,
  Badge,
  Grid,
  Alert,
  LoadingOverlay,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconBriefcase,
  IconBuilding,
  IconMapPin,
  IconClock,
  IconRefresh,
  IconCheck,
  IconX,
  IconSettings,
} from '@tabler/icons-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  location?: string;
}

interface JobListing {
  id: string;
  title: string;
  company: Company;
  location?: string;
  status:
    | 'new'
    | 'ready'
    | 'applied'
    | 'interview'
    | 'offer'
    | 'rejected'
    | 'archived';
  decision: 'undecided' | 'apply' | 'skip';
  createdAt: string;
}

interface LandingProps {
  userId: string;
}

interface SyncStatus {
  isRunning: boolean;
  lastSync?: string;
  message?: string;
}

export function Landing({ userId }: LandingProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userId && userId.trim() !== '') {
      fetchJobs();
    } else {
      setLoading(false);
      setJobs([]);
    }
  }, [userId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // For now, use mock data since /api/jobs doesn't exist
      // TODO: Replace with actual API call when endpoint is implemented
      const mockJobs: JobListing[] = [
        {
          id: '1',
          title: 'Senior Frontend Developer',
          company: { id: '1', name: 'TechCorp Inc', location: 'San Francisco' },
          location: 'San Francisco, CA',
          status: 'new',
          decision: 'undecided',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Full Stack Engineer',
          company: { id: '2', name: 'StartupXYZ', location: 'Remote' },
          location: 'Remote',
          status: 'ready',
          decision: 'apply',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      
      setJobs(mockJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
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
        
        // Refresh jobs after successful sync
        setTimeout(() => {
          fetchJobs();
        }, 1000);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue';
      case 'ready':
        return 'green';
      case 'applied':
        return 'yellow';
      case 'interview':
        return 'orange';
      case 'offer':
        return 'green';
      case 'rejected':
        return 'red';
      case 'archived':
        return 'gray';
      default:
        return 'blue';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'apply':
        return 'green';
      case 'skip':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header with Sync Button */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} mb="xs">
              <IconBriefcase size="1.5rem" style={{ marginRight: '0.5rem' }} />
              Job Application Dashboard
            </Title>
            <Text c="dimmed">
              Track your job leads and manage applications
            </Text>
          </div>
          
          <Group>
            <Button
              leftSection={<IconRefresh size="1rem" />}
              onClick={startManualSync}
              loading={syncStatus.isRunning}
              disabled={syncStatus.isRunning}
              variant="filled"
              color="blue"
              size="md"
            >
              {syncStatus.isRunning ? 'Syncing...' : 'Sync Emails'}
            </Button>
            
            <Button
              component={Link}
              href="/settings"
              leftSection={<IconSettings size="1rem" />}
              variant="outline"
              size="md"
            >
              Settings
            </Button>
          </Group>
        </Group>

        {/* Sync Status */}
        {syncStatus.message && (
          <Alert
            icon={syncStatus.isRunning ? <IconRefresh size="1rem" /> : <IconCheck size="1rem" />}
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

        {/* Quick Stats */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="lg" withBorder>
              <Group>
                <IconBriefcase size="2rem" color="blue" />
                <div>
                  <Text size="lg" fw={700}>
                    {jobs.length}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Total Jobs
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="lg" withBorder>
              <Group>
                <IconCheck size="2rem" color="green" />
                <div>
                  <Text size="lg" fw={700}>
                    {jobs.filter(job => job.status === 'ready').length}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Ready to Apply
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="lg" withBorder>
              <Group>
                <IconClock size="2rem" color="yellow" />
                <div>
                  <Text size="lg" fw={700}>
                    {jobs.filter(job => job.status === 'applied').length}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Applied
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="lg" withBorder>
              <Group>
                <IconBuilding size="2rem" color="orange" />
                <div>
                  <Text size="lg" fw={700}>
                    {jobs.filter(job => job.status === 'interview').length}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Interviews
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Recent Jobs */}
        <div>
          <Group justify="space-between" align="center" mb="md">
            <Title order={2} size="h3">
              Recent Job Leads
            </Title>
            <Button
              component={Link}
              href="/jobs"
              variant="outline"
              size="sm"
            >
              View All Jobs
            </Button>
          </Group>

          {jobs.length === 0 ? (
            <Card shadow="sm" p="xl" withBorder>
              <Stack align="center" gap="md">
                <IconBriefcase size="3rem" color="gray" />
                <div style={{ textAlign: 'center' }}>
                  <Text size="lg" fw={500}>
                    No job leads yet
                  </Text>
                  <Text c="dimmed" size="sm">
                    Use the "Sync Emails" button to scan your Gmail for job opportunities, 
                    or configure your settings to start automatic syncing.
                  </Text>
                </div>
                <Button
                  leftSection={<IconRefresh size="1rem" />}
                  onClick={startManualSync}
                  disabled={syncStatus.isRunning}
                  variant="filled"
                  color="blue"
                >
                  Sync Emails Now
                </Button>
              </Stack>
            </Card>
          ) : (
            <Stack gap="md">
              {jobs.slice(0, 5).map((job) => (
                <Card key={job.id} shadow="sm" p="lg" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs" mb="xs">
                        <Text fw={600} size="lg">
                          {job.title}
                        </Text>
                        <Badge color={getStatusColor(job.status)} variant="light">
                          {job.status}
                        </Badge>
                        <Badge color={getDecisionColor(job.decision)} variant="light">
                          {job.decision}
                        </Badge>
                      </Group>
                      
                      <Group gap="lg" mb="xs">
                        <Group gap="xs">
                          <IconBuilding size="1rem" color="gray" />
                          <Text size="sm">{job.company.name}</Text>
                        </Group>
                        
                        {job.location && (
                          <Group gap="xs">
                            <IconMapPin size="1rem" color="gray" />
                            <Text size="sm">{job.location}</Text>
                          </Group>
                        )}
                        
                        <Group gap="xs">
                          <IconClock size="1rem" color="gray" />
                          <Text size="sm">{formatDate(job.createdAt)}</Text>
                        </Group>
                      </Group>
                    </div>
                    
                    <Button
                      component={Link}
                      href={`/jobs/${job.id}`}
                      variant="outline"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </div>
      </Stack>
    </Container>
  );
}
