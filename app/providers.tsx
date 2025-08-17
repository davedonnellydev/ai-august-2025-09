'use client';

import { SessionProvider } from 'next-auth/react';
import { MantineProvider } from '@mantine/core';
import { theme } from '../theme';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <MantineProvider theme={theme}>
        {children}
      </MantineProvider>
    </SessionProvider>
  );
}
