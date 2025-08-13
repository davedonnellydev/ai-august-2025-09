'use client';

import { useState, useEffect, useRef } from 'react';
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
  Select,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconAlertCircle,
} from '@tabler/icons-react';
import { NewJob } from './NewJob';
import { ViewJob } from './ViewJob';
import { EditJob } from './EditJob';

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

type ViewMode = 'list' | 'new' | 'view' | 'edit';

const decisionOptions = [
  { value: 'undecided', label: 'Undecided' },
  { value: 'apply', label: 'Apply' },
  { value: 'skip', label: 'Skip' },
];

export function Jobs({ userId }: JobsProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [editingDecision, setEditingDecision] = useState<string | null>(null);
  const selectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId && viewMode === 'list') {
      fetchJobs();
    }
  }, [userId, viewMode]);

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
    setSelectedJobId(jobId);
    setViewMode('view');
  };

  const handleEditJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setViewMode('edit');
  };

  const handleNewJob = () => {
    setViewMode('new');
  };

  const handleBackToJobs = () => {
    setViewMode('list');
    setSelectedJobId(null);
    // Refresh the jobs list to show any changes
    fetchJobs();
  };

  const handleBackToView = () => {
    setViewMode('view');
  };

  const handleDecisionEdit = (jobId: string) => {
    setEditingDecision(jobId);
  };

  const handleDecisionChange = async (
    jobId: string,
    newDecision: string,
    currentDecision: string
  ) => {
    console.log('handleDecisionChange called:', {
      jobId,
      newDecision,
      currentDecision,
    });

    // Only save if the decision actually changed
    if (newDecision !== currentDecision) {
      console.log('Decision changed, making API call...');
      try {
        const currentJob = jobs.find((job) => job.id === jobId);
        if (!currentJob) {
          console.error('Job not found in local state');
          return;
        }

        const requestBody = {
          title: currentJob.title,
          location:
            currentJob.location || currentJob.company?.location || 'Remote',
          decision: newDecision,
        };

        console.log('Sending request body:', requestBody);

        const response = await fetch(
          `/api/jobs/${jobId}?userId=${encodeURIComponent(userId)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        const result = await response.json();
        console.log('API response:', result);

        if (result.success) {
          console.log('Successfully updated decision, updating local state...');
          // Update the local state
          setJobs((prevJobs) =>
            prevJobs.map((job) =>
              job.id === jobId
                ? {
                    ...job,
                    decision: newDecision as 'undecided' | 'apply' | 'skip',
                  }
                : job
            )
          );
        } else {
          console.error('Failed to update decision:', result.error);
          // You might want to show a toast notification here
        }
      } catch (err) {
        console.error('Error updating decision:', err);
        // You might want to show a toast notification here
      }
    } else {
      console.log('Decision unchanged, skipping API call');
    }
  };

  // Render different components based on view mode
  if (viewMode === 'new') {
    return <NewJob userId={userId} onBack={handleBackToJobs} />;
  }

  if (viewMode === 'view' && selectedJobId) {
    return (
      <ViewJob
        jobId={selectedJobId}
        userId={userId}
        onBack={handleBackToJobs}
        onEdit={() => setViewMode('edit')}
      />
    );
  }

  if (viewMode === 'edit' && selectedJobId) {
    return (
      <EditJob
        jobId={selectedJobId}
        userId={userId}
        onBack={handleBackToView}
        onSave={handleBackToJobs}
      />
    );
  }

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
                {Array.isArray(jobs) &&
                  jobs.map((job) => (
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
                        {editingDecision === job.id ? (
                          <Select
                            ref={selectRef}
                            size="xs"
                            data={decisionOptions}
                            value={job.decision}
                            onChange={async (value) => {
                              console.log(
                                'Select onChange triggered with value:',
                                value
                              );
                              // Always call handleDecisionChange, let it handle the logic
                              if (value !== null && value !== undefined) {
                                await handleDecisionChange(
                                  job.id,
                                  value,
                                  job.decision
                                );
                              }
                            }}
                            onDropdownClose={() => {
                              console.log('Dropdown closed');
                              // Only close if we're not in the middle of processing a change
                              setTimeout(() => {
                                if (editingDecision === job.id) {
                                  setEditingDecision(null);
                                }
                              }, 100);
                            }}
                            style={{ width: 'auto', minWidth: 'fit-content' }}
                            autoFocus
                          />
                        ) : (
                          <Badge
                            color={getDecisionColor(job.decision)}
                            variant="light"
                            size="sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleDecisionEdit(job.id)}
                          >
                            {job.decision.charAt(0).toUpperCase() +
                              job.decision.slice(1)}
                          </Badge>
                        )}
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
