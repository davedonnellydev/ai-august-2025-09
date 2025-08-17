'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Alert,
  LoadingOverlay,
  Group,
  Divider,
} from '@mantine/core';
import { IconBrandGoogle, IconAlertCircle, IconCheck } from '@tabler/icons-react';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Use redirect: true to let NextAuth handle the redirect
      await signIn('google', {
        callbackUrl: '/',
        redirect: true,
      });
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign-in error:', err);
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" p="xl" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Title order={1} mb="xs">
              Sign In
            </Title>
            <Text c="dimmed" size="sm">
              Sign in to your Job Application Manager account
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Authentication Error"
              color="red"
              variant="light"
              onClose={() => setError(null)}
              withCloseButton
            >
              {error}
            </Alert>
          )}

          {/* Success Alert */}
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

          {/* Sign-in Options */}
          <Stack gap="md">
            <Button
              leftSection={<IconBrandGoogle size="1rem" />}
              variant="outline"
              size="lg"
              onClick={handleGoogleSignIn}
              loading={isLoading}
              fullWidth
            >
              Continue with Google
            </Button>

            <Divider label="or" labelPosition="center" />

            <Button
              variant="subtle"
              onClick={handleBackToHome}
              disabled={isLoading}
              fullWidth
            >
              Back to Home
            </Button>
          </Stack>

          {/* Info Text */}
          <Text size="xs" c="dimmed" ta="center">
            By signing in, you agree to our terms of service and privacy policy.
          </Text>

          {/* Loading Overlay */}
          <LoadingOverlay visible={isLoading} />
        </Stack>
      </Paper>
    </Container>
  );
}
