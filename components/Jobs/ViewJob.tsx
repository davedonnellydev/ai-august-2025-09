'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Alert,
  Card,
  LoadingOverlay,
  Badge,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconEdit } from '@tabler/icons-react';

interface ViewJobProps {
  jobId: string;
  userId: string;
  onBack: () => void;
  onEdit: () => void;
}

interface Company {
  id: string;
  name: string;
  website?: string;
  location?: string;
}

interface JobListing {
  id: string;
  title: string;
  company: Company;
  location?: string;
  workMode?: string;
  employmentType?: string;
  seniority?: string;
  salaryMin?: string;
  salaryMax?: string;
  currency?: string;
  url?: string;
  description?: string;
  status: string;
  decision: string;
  createdAt: string;
  updatedAt: string;
}

export function ViewJob({ jobId, userId, onBack, onEdit }: ViewJobProps) {
  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/jobs/${jobId}?userId=${encodeURIComponent(userId)}`
      );
      const result = await response.json();

      if (result.success) {
        setJob(result.data);
      } else {
        setError(result.error || 'Failed to fetch job details');
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSalary = (min?: string, max?: string, currency?: string) => {
    if (!min && !max) {
      return 'Not specified';
    }

    const currencySymbol =
      currency === 'USD'
        ? '$'
        : currency === 'EUR'
          ? '€'
          : currency === 'GBP'
            ? '£'
            : currency || '';

    if (min && max) {
      return `${currencySymbol}${parseInt(min, 10).toLocaleString()} - ${currencySymbol}${parseInt(max, 10).toLocaleString()}`;
    } else if (min) {
      return `${currencySymbol}${parseInt(min, 10).toLocaleString()}+`;
    } else if (max) {
      return `Up to ${currencySymbol}${parseInt(max, 10).toLocaleString()}`;
    }

    return 'Not specified';
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
          mb="xl"
        >
          {error}
        </Alert>
        <Button variant="outline" onClick={onBack}>
          Back to Jobs
        </Button>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Job Not Found"
          color="red"
          variant="filled"
          mb="xl"
        >
          The requested job could not be found.
        </Alert>
        <Button variant="outline" onClick={onBack}>
          Back to Jobs
        </Button>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group mb="xl" justify="space-between">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
        >
          Back to Jobs
        </Button>
        <Button leftSection={<IconEdit size={16} />} onClick={onEdit}>
          Edit Job
        </Button>
      </Group>

      <Title order={1} mb="xl">
        {job.title}
      </Title>

      <Stack gap="lg">
        {/* Status and Decision */}
        <Card p="xl" withBorder>
          <Group gap="md" mb="md">
            <Badge color={getStatusColor(job.status)} variant="light" size="lg">
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
            <Badge
              color={getDecisionColor(job.decision)}
              variant="light"
              size="lg"
            >
              {job.decision.charAt(0).toUpperCase() + job.decision.slice(1)}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            Created: {formatDate(job.createdAt)}
            {job.updatedAt !== job.createdAt &&
              ` • Updated: ${formatDate(job.updatedAt)}`}
          </Text>
        </Card>

        {/* Job Details */}
        <Card p="xl" withBorder>
          <Title order={3} mb="md">
            Job Details
          </Title>
          <Stack gap="md">
            <Group grow>
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Work Mode
                </Text>
                <Text>{job.workMode || 'Not specified'}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Employment Type
                </Text>
                <Text>{job.employmentType || 'Not specified'}</Text>
              </div>
            </Group>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Seniority Level
              </Text>
              <Text>{job.seniority || 'Not specified'}</Text>
            </div>
          </Stack>
        </Card>

        {/* Salary Information */}
        <Card p="xl" withBorder>
          <Title order={3} mb="md">
            Salary Information
          </Title>
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Salary Range
              </Text>
              <Text>
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
              </Text>
            </div>
            {job.currency && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Currency
                </Text>
                <Text>{job.currency}</Text>
              </div>
            )}
          </Stack>
        </Card>

        {/* Company Information */}
        <Card p="xl" withBorder>
          <Title order={3} mb="md">
            Company Information
          </Title>
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Company Name
              </Text>
              <Text>{job.company?.name || 'Not specified'}</Text>
            </div>
            {job.company?.website && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Website
                </Text>
                <Text>
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                  >
                    {job.company.website}
                  </a>
                </Text>
              </div>
            )}
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Location
              </Text>
              <Text>
                {job.location || job.company?.location || 'Not specified'}
              </Text>
            </div>
          </Stack>
        </Card>

        {/* Additional Information */}
        <Card p="xl" withBorder>
          <Title order={3} mb="md">
            Additional Information
          </Title>
          <Stack gap="md">
            {job.url && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Job URL
                </Text>
                <Text>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                  >
                    {job.url}
                  </a>
                </Text>
              </div>
            )}
            {job.description && (
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Job Description
                </Text>
                <Text style={{ whiteSpace: 'pre-wrap' }}>
                  {job.description}
                </Text>
              </div>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
