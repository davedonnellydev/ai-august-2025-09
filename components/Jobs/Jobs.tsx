'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Table,
  Group,
  Text,
  Badge,
  Container,
  Title,
  LoadingOverlay,
  Alert,
  Card,
  ActionIcon,
  Tooltip,
  Box,
  Select,
} from '@mantine/core';
import { IconEye, IconAlertCircle } from '@tabler/icons-react';
import { ViewJob } from './ViewJob';

interface Lead {
  id: string;
  url: string;
  type: string;
  title?: string;
  company?: string;
  location?: string;
  status: 'new' | 'undecided' | 'added_to_huntr' | 'rejected' | 'duplicate';
  createdAt: string;
}

interface LeadsProps {
  userId: string;
}

type ViewMode = 'list' | 'view';

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'undecided', label: 'Undecided' },
  { value: 'added_to_huntr', label: 'Added to Huntr' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'duplicate', label: 'Duplicate' },
];

export function Leads({ userId }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const selectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId && viewMode === 'list') {
      fetchLeads();
    }
  }, [userId, viewMode]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/leads');
      const result = await response.json();

      if (result.leads) {
        setLeads(Array.isArray(result.leads) ? result.leads : []);
      } else {
        setError(result.error || 'Failed to fetch leads');
        setLeads([]);
      }
    } catch (err) {
      setError('Network error occurred');
      setLeads([]);
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
      month: 'short',
      day: 'numeric',
    });
  };

  const getUrlDisplay = (url: string) => {
    try {
      const urlObj = new URL(url);
      return {
        host: urlObj.hostname,
        path: urlObj.pathname,
      };
    } catch {
      return {
        host: 'Invalid URL',
        path: '',
      };
    }
  };

  const handleViewLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setViewMode('view');
  };

  const handleBackToLeads = () => {
    setViewMode('list');
    setSelectedLeadId(null);
    // Refresh the leads list to show any changes
    fetchLeads();
  };

  const handleStatusEdit = (leadId: string) => {
    setEditingStatus(leadId);
  };

  const handleStatusChange = async (
    leadId: string,
    newStatus: string,
    currentStatus: string
  ) => {
    // Only save if the status actually changed
    if (newStatus !== currentStatus) {
      try {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (response.ok) {
          // Update local state
          setLeads((prevLeads) =>
            prevLeads.map((lead) =>
              lead.id === leadId ? { ...lead, status: newStatus as any } : lead
            )
          );
        } else {
          console.error('Failed to update lead status');
        }
      } catch (error) {
        console.error('Error updating lead status:', error);
      }
    }
    setEditingStatus(null);
  };

  // Render view component if needed
  if (viewMode === 'view' && selectedLeadId) {
    return (
      <ViewJob
        jobId={selectedLeadId}
        userId={userId}
        onBack={handleBackToLeads}
        onEdit={() => {}} // No edit functionality for leads
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
          icon={<IconAlertCircle size="1rem" />}
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
        <Title order={1}>Leads</Title>
      </Group>

      {leads.length === 0 ? (
        <Card p="xl" ta="center">
          <Text c="dimmed" size="lg">
            No leads found
          </Text>
          <Text c="dimmed" size="sm">
            Leads will appear here once you configure watched labels and sync
            your Gmail.
          </Text>
        </Card>
      ) : (
        <Card p={0} withBorder>
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>URL</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Company</Table.Th>
                  <Table.Th>Location</Table.Th>
                  <Table.Th>First Seen</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {Array.isArray(leads) &&
                  leads.map((lead) => {
                    const urlDisplay = getUrlDisplay(lead.url);
                    return (
                      <Table.Tr key={lead.id}>
                        <Table.Td>
                          {editingStatus === lead.id ? (
                            <Select
                              ref={selectRef}
                              size="xs"
                              data={statusOptions}
                              value={lead.status}
                              onChange={async (value) => {
                                if (value !== null && value !== undefined) {
                                  await handleStatusChange(
                                    lead.id,
                                    value,
                                    lead.status
                                  );
                                }
                              }}
                              onDropdownClose={() => {
                                setTimeout(() => {
                                  if (editingStatus === lead.id) {
                                    setEditingStatus(null);
                                  }
                                }, 100);
                              }}
                              style={{ width: 'auto', minWidth: 'fit-content' }}
                              autoFocus
                            />
                          ) : (
                            <Badge
                              color={getStatusColor(lead.status)}
                              variant="light"
                              size="sm"
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleStatusEdit(lead.id)}
                            >
                              {lead.status
                                .replace('_', ' ')
                                .charAt(0)
                                .toUpperCase() +
                                lead.status.replace('_', ' ').slice(1)}
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>
                              {urlDisplay.host}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {urlDisplay.path}
                            </Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={getTypeColor(lead.type)}
                            variant="light"
                            size="sm"
                          >
                            {lead.type
                              .replace('_', ' ')
                              .charAt(0)
                              .toUpperCase() +
                              lead.type.replace('_', ' ').slice(1)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {lead.title || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{lead.company || '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {lead.location || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {formatDate(lead.createdAt)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Tooltip label="View Details">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() => handleViewLead(lead.id)}
                                aria-label="View lead details"
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
              </Table.Tbody>
            </Table>
          </Box>
        </Card>
      )}
    </Container>
  );
}
