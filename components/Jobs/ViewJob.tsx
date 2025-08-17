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
  Divider,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconExternalLink,
} from '@tabler/icons-react';

interface ViewJobProps {
  jobId: string;
  userId: string;
  onBack: () => void;
  onEdit: () => void;
}

interface Lead {
  id: string;
  url: string;
  type: string;
  title?: string;
  company?: string;
  location?: string;
  seniority?: string;
  employmentType?: string;
  workMode?: string;
  status: string;
  canonicalJobKey?: string;
  anchorText?: string;
  sourceLabelId?: string;
  firstSeenAt?: string;
  tags?: string[];
  confidence?: string;
  createdAt: string;
  updatedAt: string;
}

export function ViewJob({ jobId, userId, onBack, onEdit }: ViewJobProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLead();
  }, [jobId]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads/${jobId}`);
      const result = await response.json();

      if (response.ok) {
        setLead(result);
      } else {
        setError(result.error || 'Failed to fetch lead details');
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
      undecided: 'gray',
      added_to_huntr: 'green',
      rejected: 'red',
      duplicate: 'orange',
    };
    return colors[status] || 'gray';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      job_posting: 'blue',
      job_list: 'green',
      company: 'purple',
      unsubscribe: 'red',
      tracking: 'yellow',
      other: 'gray',
    };
    return colors[type] || 'gray';
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

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  if (error || !lead) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error"
          color="red"
          variant="filled"
        >
          {error || 'Lead not found'}
        </Alert>
        <Button variant="outline" onClick={onBack} mt="md">
          Back to Leads
        </Button>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group mb="xl">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size="1rem" />}
          onClick={onBack}
        >
          Back to Leads
        </Button>
      </Group>

      <Stack gap="lg">
        {/* Header */}
        <Card p="xl" withBorder>
          <Group justify="space-between" align="flex-start" mb="md">
            <div>
              <Title order={1} mb="xs">
                {lead.title || 'Untitled Lead'}
              </Title>
              {lead.company && (
                <Text size="lg" c="dimmed" mb="xs">
                  {lead.company}
                </Text>
              )}
              {lead.location && (
                <Text size="md" c="dimmed">
                  📍 {lead.location}
                </Text>
              )}
            </div>
            <Group gap="sm">
              <Badge
                color={getStatusColor(lead.status)}
                variant="light"
                size="lg"
              >
                {lead.status.replace('_', ' ').charAt(0).toUpperCase() +
                  lead.status.replace('_', ' ').slice(1)}
              </Badge>
              <Badge color={getTypeColor(lead.type)} variant="light" size="lg">
                {lead.type.replace('_', ' ').charAt(0).toUpperCase() +
                  lead.type.replace('_', ' ').slice(1)}
              </Badge>
            </Group>
          </Group>

          <Divider my="md" />

          <Group gap="lg">
            <Button
              variant="filled"
              leftSection={<IconExternalLink size="1rem" />}
              onClick={() => openUrl(lead.url)}
            >
              View Original
            </Button>
          </Group>
        </Card>

        {/* Details */}
        <Card p="xl" withBorder>
          <Title order={3} mb="md">
            Lead Details
          </Title>
          <Stack gap="md">
            <Group>
              <Text fw={500} style={{ minWidth: '120px' }}>
                URL:
              </Text>
              <Text size="sm" style={{ wordBreak: 'break-all' }}>
                {lead.url}
              </Text>
            </Group>

            {lead.seniority && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Seniority:
                </Text>
                <Text size="sm">{lead.seniority}</Text>
              </Group>
            )}

            {lead.employmentType && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Employment Type:
                </Text>
                <Text size="sm">{lead.employmentType}</Text>
              </Group>
            )}

            {lead.workMode && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Work Mode:
                </Text>
                <Text size="sm">{lead.workMode}</Text>
              </Group>
            )}

            {lead.canonicalJobKey && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Job Key:
                </Text>
                <Text size="sm" style={{ fontFamily: 'monospace' }}>
                  {lead.canonicalJobKey}
                </Text>
              </Group>
            )}

            {lead.anchorText && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Anchor Text:
                </Text>
                <Text size="sm">{lead.anchorText}</Text>
              </Group>
            )}

            {lead.confidence && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Confidence:
                </Text>
                <Text size="sm">{lead.confidence}%</Text>
              </Group>
            )}

            {lead.tags && lead.tags.length > 0 && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Tags:
                </Text>
                <Group gap="xs">
                  {lead.tags.map((tag, index) => (
                    <Badge key={index} variant="light" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}
          </Stack>
        </Card>

        {/* Timeline */}
        <Card p="xl" withBorder>
          <Title order={3} mb="md">
            Timeline
          </Title>
          <Stack gap="md">
            <Group>
              <Text fw={500} style={{ minWidth: '120px' }}>
                First Seen:
              </Text>
              <Text size="sm">
                {lead.firstSeenAt
                  ? formatDate(lead.firstSeenAt)
                  : formatDate(lead.createdAt)}
              </Text>
            </Group>
            <Group>
              <Text fw={500} style={{ minWidth: '120px' }}>
                Created:
              </Text>
              <Text size="sm">{formatDate(lead.createdAt)}</Text>
            </Group>
            {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
              <Group>
                <Text fw={500} style={{ minWidth: '120px' }}>
                  Updated:
                </Text>
                <Text size="sm">{formatDate(lead.updatedAt)}</Text>
              </Group>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
