'use client';

import { useSession } from 'next-auth/react';
import { Text, Code, Paper, Stack } from '@mantine/core';

export function SessionDebug() {
  const { data: session, status } = useSession();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Paper p="md" withBorder style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, maxWidth: 400 }}>
      <Stack gap="xs">
        <Text size="sm" fw={500}>Session Debug (Dev Only)</Text>
        <Text size="xs">Status: <Code>{status}</Code></Text>
        {session?.user && (
          <>
            <Text size="xs">User ID: <Code>{session.user.id}</Code></Text>
            <Text size="xs">Email: <Code>{session.user.email}</Code></Text>
          </>
        )}
        {!session && status === 'unauthenticated' && (
          <Text size="xs" c="red">No session found</Text>
        )}
      </Stack>
    </Paper>
  );
}
