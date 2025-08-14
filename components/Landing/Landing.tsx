'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  Text,
  Group,
  Badge,
  LoadingOverlay,
  Alert,
  Title,
  Stack,
  Box,
} from '@mantine/core';
import { PieChart } from '@mantine/charts';
import { IconAlertCircle, IconBriefcase } from '@tabler/icons-react';

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

const statusColors = {
  new: 'blue',
  ready: 'yellow',
  applied: 'orange',
  interview: 'purple',
  offer: 'green',
  rejected: 'red',
  archived: 'gray',
};

const decisionColors = {
  undecided: 'gray',
  apply: 'green',
  skip: 'red',
};

export function Landing({ userId }: LandingProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchJobs();
    }
  }, [userId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/jobs?userId=${encodeURIComponent(userId)}`
      );
      const result = await response.json();

      if (result.success) {
        setJobs(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.error || 'Failed to fetch jobs');
        setJobs([]);
      }
    } catch (err) {
      setError('Network error occurred');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for status pie chart
  const statusData = jobs.reduce(
    (acc, job) => {
      const status = job.status.charAt(0).toUpperCase() + job.status.slice(1);
      const existing = acc.find((item) => item.name === status);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: status, value: 1, color: statusColors[job.status] });
      }
      return acc;
    },
    [] as Array<{ name: string; value: number; color: string }>
  );

  // Prepare data for decision pie chart
  const decisionData = jobs.reduce(
    (acc, job) => {
      const decision =
        job.decision.charAt(0).toUpperCase() + job.decision.slice(1);
      const existing = acc.find((item) => item.name === decision);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          name: decision,
          value: 1,
          color: decisionColors[job.decision],
        });
      }
      return acc;
    },
    [] as Array<{ name: string; value: number; color: string }>
  );

  // Validate that we have data for charts
  const hasStatusData = statusData.length > 0;
  const hasDecisionData = decisionData.length > 0;

  // Mock data for testing when no real data is available
  const mockStatusData = [
    { name: 'New', value: 5, color: '#228be6' },
    { name: 'Applied', value: 3, color: '#40c057' },
    { name: 'Interview', value: 2, color: '#fd7e14' },
    { name: 'Rejected', value: 1, color: '#fa5252' },
  ];

  const mockDecisionData = [
    { name: 'Undecided', value: 4, color: '#ffd43b' },
    { name: 'Apply', value: 5, color: '#40c057' },
    { name: 'Skip', value: 2, color: '#868e96' },
  ];

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          variant="filled"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Title order={1} ta="center">
          Job Application Dashboard
        </Title>

        {/* Statistics Cards */}
        <Grid align="stretch">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card p="xl" withBorder style={{ height: '100%' }}>
              <Group justify="space-between">
                <div>
                  <Text size="lg" fw={500}>
                    Total Jobs
                  </Text>
                  <Text size="2rem" fw={700} c="blue">
                    {jobs.length}
                  </Text>
                </div>
                <IconBriefcase size={48} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card p="xl" withBorder style={{ height: '100%' }}>
              <Group justify="space-between">
                <div>
                  <Text size="lg" fw={500}>
                    Active Applications
                  </Text>
                  <Text size="2rem" fw={700} c="green">
                    {
                      jobs.filter(
                        (job) =>
                          job.status !== 'archived' && job.status !== 'rejected'
                      ).length
                    }
                  </Text>
                </div>
                <Badge size="xl" color="green" variant="light">
                  Active
                </Badge>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card p="xl" withBorder style={{ height: '100%' }}>
              <Group justify="space-between">
                <div>
                  <Text size="lg" fw={500}>
                    Pending Decisions
                  </Text>
                  <Text size="2rem" fw={700} c="yellow">
                    {jobs.filter((job) => job.decision === 'undecided').length}
                  </Text>
                </div>
                <Badge size="xl" color="yellow" variant="light">
                  Pending
                </Badge>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Charts */}
        <Grid>
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card p="xl" withBorder>
              <Text size="lg" fw={500} mb="md">
                Job Statuses
              </Text>
              {hasStatusData ? (
                <Box style={{ width: 300, height: 300, margin: '0 auto' }}>
                  <PieChart
                    data={statusData}
                    size={200}
                    withLabelsLine={false}
                    withLabels
                    withTooltip
                  />
                </Box>
              ) : (
                <Box
                  style={{
                    width: 300,
                    height: 300,
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <PieChart
                    data={mockStatusData}
                    size={200}
                    withLabelsLine={false}
                    withLabels
                    withTooltip
                  />
                  <Text c="dimmed" ta="center" py="sm" size="sm">
                    Showing sample data - add real jobs to see your data
                  </Text>
                </Box>
              )}
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card p="xl" withBorder>
              <Text size="lg" fw={500} mb="md">
                Decisions
              </Text>
              {hasDecisionData ? (
                <Box style={{ width: 300, height: 300, margin: '0 auto' }}>
                  <PieChart
                    data={decisionData}
                    size={200}
                    withLabelsLine={false}
                    withLabels
                    withTooltip
                  />
                </Box>
              ) : (
                <Box
                  style={{
                    width: 300,
                    height: 300,
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <PieChart
                    data={mockDecisionData}
                    size={200}
                    withLabelsLine={false}
                    withLabels
                    withTooltip
                  />
                  <Text c="dimmed" ta="center" py="sm" size="sm">
                    Showing sample data - add real jobs to see your data
                  </Text>
                </Box>
              )}
            </Card>
          </Grid.Col>
        </Grid>

        {/* Recent Activity */}
        <Card p="xl" withBorder>
          <Text size="lg" fw={500} mb="md">
            Recent Job Activity
          </Text>
          {jobs.length > 0 ? (
            <Stack gap="sm">
              {jobs
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .slice(0, 5)
                .map((job) => (
                  <Group
                    key={job.id}
                    justify="space-between"
                    p="sm"
                    style={{
                      border: '1px solid var(--mantine-color-gray-3)',
                      borderRadius: 'var(--mantine-radius-sm)',
                    }}
                  >
                    <div>
                      <Text fw={500} size="sm">
                        {job.title || 'Untitled'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {job.company?.name || 'Unknown Company'}
                      </Text>
                    </div>
                    <Group gap="xs">
                      <Badge
                        color={statusColors[job.status]}
                        variant="light"
                        size="sm"
                      >
                        {job.status.charAt(0).toUpperCase() +
                          job.status.slice(1)}
                      </Badge>
                      <Badge
                        color={decisionColors[job.decision]}
                        variant="light"
                        size="sm"
                      >
                        {job.decision.charAt(0).toUpperCase() +
                          job.decision.slice(1)}
                      </Badge>
                    </Group>
                  </Group>
                ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              No recent job activity
            </Text>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
