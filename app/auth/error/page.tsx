'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Alert,
  Code,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconHome } from '@tabler/icons-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please contact support.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification link has expired or has already been used.';
      case 'Default':
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  };

  const handleRetry = () => {
    router.push('/auth/signin');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" p="xl" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Title order={1} mb="xs" color="red">
              Authentication Error
            </Title>
            <Text c="dimmed" size="sm">
              Something went wrong during the sign-in process
            </Text>
          </div>

          {/* Error Details */}
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Error Details"
            color="red"
            variant="light"
          >
            <Text size="sm" mb="xs">
              {getErrorMessage(error)}
            </Text>
            
            {errorDescription && (
              <Text size="xs" c="dimmed" mb="xs">
                {errorDescription}
              </Text>
            )}
            
            {error && (
              <Code size="xs" color="red">
                Error Code: {error}
              </Code>
            )}
          </Alert>

          {/* Action Buttons */}
          <Stack gap="md">
            <Button
              leftSection={<IconArrowLeft size="1rem" />}
              onClick={handleRetry}
              fullWidth
            >
              Try Again
            </Button>

            <Button
              leftSection={<IconHome size="1rem" />}
              variant="subtle"
              onClick={handleGoHome}
              fullWidth
            >
              Go to Home
            </Button>
          </Stack>

          {/* Help Text */}
          <Text size="xs" c="dimmed" ta="center">
            If this problem persists, please contact support or try again later.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}
