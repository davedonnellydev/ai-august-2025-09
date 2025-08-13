'use client';

import { Landing } from '../components/Landing/Landing';
import {
  AppShell,
  Container,
  Group,
  Text,
  Button,
  Burger,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBrandGithub,
  IconBrandTwitter,
  IconBrandLinkedin,
} from '@tabler/icons-react';

export default function HomePage() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      footer={{ height: 60 }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%">
            <Text size="lg" fw={700} c="blue">
              Job Application Manager
            </Text>

            {/* Desktop Navigation */}
            <Group gap="md" visibleFrom="sm">
              <Button variant="subtle" component="a" href="#jobs">
                Jobs
              </Button>
              <Button variant="subtle" component="a" href="#applications">
                Applications
              </Button>
              <Button variant="subtle" component="a" href="#overview">
                Overview
              </Button>
            </Group>

            {/* Mobile Menu Button */}
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation menu"
            />
          </Group>
        </Container>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="md">
        <Container size="xl">
          <Stack gap="md">
            <Button
              variant="subtle"
              fullWidth
              justify="start"
              component="a"
              href="#jobs"
            >
              Jobs
            </Button>
            <Button
              variant="subtle"
              fullWidth
              justify="start"
              component="a"
              href="#applications"
            >
              Applications
            </Button>
            <Button
              variant="subtle"
              fullWidth
              justify="start"
              component="a"
              href="#companies"
            >
              Companies
            </Button>
            <Button
              variant="subtle"
              fullWidth
              justify="start"
              component="a"
              href="#overview"
            >
              Overview
            </Button>
          </Stack>
        </Container>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <Container size="xl" py="xl">
          <Landing />
        </Container>
      </AppShell.Main>

      {/* Footer */}
      <AppShell.Footer>
        <Container size="xl" h="100%">
          <Group justify="flex-end" h="100%" align="center">
            <Text size="sm" c="dimmed">
              MIT License © Dave Donnelly 2025.
            </Text>
          </Group>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}
