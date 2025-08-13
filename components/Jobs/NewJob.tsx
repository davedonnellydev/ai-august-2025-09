'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Group,
  Stack,
  Alert,
  Card,
  LoadingOverlay,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconCheck } from '@tabler/icons-react';

interface NewJobProps {
  userId: string;
  onBack: () => void;
}

interface JobFormData {
  title: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniority: string;
  salaryMin: number | '';
  salaryMax: number | '';
  currency: string;
  url: string;
  description: string;
  companyName: string;
  companyWebsite: string;
}

const workModeOptions = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

const employmentTypeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

const seniorityOptions = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
];

const currencyOptions = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'CAD', label: 'CAD (C$)' },
];

export function NewJob({ userId, onBack }: NewJobProps) {
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    location: '',
    workMode: '',
    employmentType: '',
    seniority: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    url: '',
    description: '',
    companyName: '',
    companyWebsite: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (
    field: keyof JobFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Job title is required';
    }
    if (!formData.location.trim()) {
      return 'Location is required';
    }
    if (
      formData.salaryMin &&
      formData.salaryMax &&
      formData.salaryMin > formData.salaryMax
    ) {
      return 'Minimum salary cannot be greater than maximum salary';
    }
    if (formData.url && !isValidUrl(formData.url)) {
      return 'Please enter a valid URL';
    }
    return null;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/jobs?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // Redirect back to jobs list after a short delay
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        setError(result.error || 'Failed to create job');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container size="xl" py="xl">
        <Card p="xl" ta="center">
          <IconCheck
            size={48}
            color="green"
            style={{ margin: '0 auto 1rem' }}
          />
          <Title order={2} mb="md" c="green">
            Job Created Successfully!
          </Title>
          <Text c="dimmed">Redirecting back to job listings...</Text>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <LoadingOverlay visible={loading} />

      <Group mb="xl">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
        >
          Back to Jobs
        </Button>
      </Group>

      <Title order={1} mb="xl">
        Add New Job
      </Title>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          variant="filled"
          mb="xl"
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* Job Details */}
          <Card p="xl" withBorder>
            <Title order={3} mb="md">
              Job Details
            </Title>
            <Stack gap="md">
              <TextInput
                label="Job Title *"
                placeholder="e.g., Frontend Developer"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />

              <TextInput
                label="Location *"
                placeholder="e.g., Sydney, Australia"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
              />

              <Group grow>
                <Select
                  label="Work Mode"
                  placeholder="Select work mode"
                  data={workModeOptions}
                  value={formData.workMode}
                  onChange={(value) =>
                    handleInputChange('workMode', value || '')
                  }
                  clearable
                />

                <Select
                  label="Employment Type"
                  placeholder="Select employment type"
                  data={employmentTypeOptions}
                  value={formData.employmentType}
                  onChange={(value) =>
                    handleInputChange('employmentType', value || '')
                  }
                  clearable
                />
              </Group>

              <Select
                label="Seniority Level"
                placeholder="Select seniority level"
                data={seniorityOptions}
                value={formData.seniority}
                onChange={(value) =>
                  handleInputChange('seniority', value || '')
                }
                clearable
              />
            </Stack>
          </Card>

          {/* Salary Information */}
          <Card p="xl" withBorder>
            <Title order={3} mb="md">
              Salary Information
            </Title>
            <Stack gap="md">
              <Group grow>
                <NumberInput
                  label="Minimum Salary"
                  placeholder="e.g., 80000"
                  value={formData.salaryMin}
                  onChange={(value) =>
                    handleInputChange('salaryMin', value || '')
                  }
                  min={0}
                />

                <NumberInput
                  label="Maximum Salary"
                  placeholder="e.g., 120000"
                  value={formData.salaryMax}
                  onChange={(value) =>
                    handleInputChange('salaryMax', value || '')
                  }
                  min={0}
                />
              </Group>

              <Select
                label="Currency"
                data={currencyOptions}
                value={formData.currency}
                onChange={(value) =>
                  handleInputChange('currency', value || 'USD')
                }
              />
            </Stack>
          </Card>

          {/* Company Information */}
          <Card p="xl" withBorder>
            <Title order={3} mb="md">
              Company Information
            </Title>
            <Stack gap="md">
              <TextInput
                label="Company Name"
                placeholder="e.g., Acme Corporation"
                value={formData.companyName}
                onChange={(e) =>
                  handleInputChange('companyName', e.target.value)
                }
              />

              <TextInput
                label="Company Website"
                placeholder="e.g., https://acme.com"
                value={formData.companyWebsite}
                onChange={(e) =>
                  handleInputChange('companyWebsite', e.target.value)
                }
              />
            </Stack>
          </Card>

          {/* Additional Information */}
          <Card p="xl" withBorder>
            <Title order={3} mb="md">
              Additional Information
            </Title>
            <Stack gap="md">
              <TextInput
                label="Job URL"
                placeholder="e.g., https://jobs.acme.com/frontend-developer"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
              />

              <Textarea
                label="Job Description"
                placeholder="Enter job description, requirements, and responsibilities..."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange('description', e.target.value)
                }
                rows={6}
              />
            </Stack>
          </Card>

          {/* Submit Button */}
          <Group justify="flex-end">
            <Button variant="outline" onClick={onBack} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              leftSection={<IconCheck size={16} />}
            >
              Create Job
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}
