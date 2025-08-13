'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Group,
  Text,
  Badge,
  Container,
  Title,
  Button,
  LoadingOverlay,
  Alert,
  Card,
  ActionIcon,
  Tooltip,
  Box,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

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

interface JobsProps {
  userId: string;
}

export function Jobs({ userId }: JobsProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (userId) {
      fetchJobs();
    }
  }, [userId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/jobs?userId=${encodeURIComponent(userId)}`
      );
      const result = await response.json();

      if (result.success) {
        setJobs(result.data);
      } else {
        setError(result.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      ready: 'yellow',
      applied: 'orange',
      interview: 'purple',
      offer: 'green',
      rejected: 'red',
      archived: 'gray',
    };
    return colors[status] || 'gray';
  };

  const getDecisionColor = (decision: string) => {
    const colors: Record<string, string> = {
      undecided: 'gray',
      apply: 'green',
      skip: 'red',
    };
    return colors[decision] || 'gray';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewJob = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
  };

  const handleEditJob = (jobId: string) => {
    router.push(`/jobs/${jobId}/edit`);
  };

  const handleNewJob = () => {
    router.push('/jobs/new');
  };

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
      <Group justify="space-between" mb="xl">
        <Title order={1}>Job Listings</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleNewJob}
          size="md"
        >
          Add New Job
        </Button>
      </Group>

      {jobs.length === 0 ? (
        <Card p="xl" ta="center">
          <Text c="dimmed" size="lg">
            No job listings found. Start by adding your first job!
          </Text>
          <Button
            variant="outline"
            onClick={handleNewJob}
            mt="md"
            leftSection={<IconPlus size={16} />}
          >
            Add Your First Job
          </Button>
        </Card>
      ) : (
        <Card p={0} withBorder>
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Company</Table.Th>
                  <Table.Th>Location</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Decision</Table.Th>
                  <Table.Th>Added</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {jobs.map((job) => (
                  <Table.Tr key={job.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {job.title || 'Untitled'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {job.company?.name || 'Unknown Company'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {job.location || job.company?.location || 'Remote'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(job.status)}
                        variant="light"
                        size="sm"
                      >
                        {job.status.charAt(0).toUpperCase() +
                          job.status.slice(1)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getDecisionColor(job.decision)}
                        variant="light"
                        size="sm"
                      >
                        {job.decision.charAt(0).toUpperCase() +
                          job.decision.slice(1)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDate(job.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View Details">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => handleViewJob(job.id)}
                            aria-label="View job details"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit Job">
                          <ActionIcon
                            variant="subtle"
                            color="yellow"
                            onClick={() => handleEditJob(job.id)}
                            aria-label="Edit job"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Card>
      )}
    </Container>
  );
}
