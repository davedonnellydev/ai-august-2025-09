'use client';

import { useState } from 'react';
import { Landing } from '../components/Landing/Landing';
import { Leads } from '../components/Jobs/Jobs';
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
import { UserProvider, useUser } from './contexts/UserContext';

const userID: string = '2d30743e-10cb-4490-933c-4ccdf37364e9';

function HomePageContent() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const [currentView, setCurrentView] = useState<'landing' | 'leads'>(
    'landing'
  );
  const { userId } = useUser();

  const handleNavigation = (view: 'landing' | 'leads') => {
    setCurrentView(view);
    // Close mobile menu when navigating
    if (mobileOpened) {
      closeMobile();
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'leads':
        return <Leads userId={userId} />;
      default:
        return <Landing userId={userId} />;
    }
  };

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
            <Text
              size="lg"
              fw={700}
              c="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => handleNavigation('landing')}
            >
              Job Application Manager
            </Text>

            {/* Desktop Navigation */}
            <Group gap="md" visibleFrom="sm">
              <Button
                variant={currentView === 'leads' ? 'filled' : 'subtle'}
                component="button"
                onClick={() => handleNavigation('leads')}
              >
                Leads
              </Button>
              {/* <Button variant="subtle" component="a" href="#applications">
                Applications
              </Button> */}
              <Button
                variant="subtle"
                component="a"
                onClick={() => handleNavigation('landing')}
              >
                Dashboard
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
              variant={currentView === 'landing' ? 'filled' : 'subtle'}
              fullWidth
              justify="start"
              component="button"
              onClick={() => handleNavigation('landing')}
            >
              Dashboard
            </Button>
            <Button
              variant={currentView === 'leads' ? 'filled' : 'subtle'}
              fullWidth
              justify="start"
              component="button"
              onClick={() => handleNavigation('leads')}
            >
              Leads
            </Button>
            {/* <Button
              variant="subtle"
              fullWidth
              justify="start"
              component="a"
              href="#applications"
            >
              Applications
            </Button> */}
            {/* <Button
              variant="subtle"
              fullWidth
              justify="start"
              component="a"
              href="#companies"
            >
              Companies
            </Button> */}
            {/* <Button
              variant="subtle"
              fullWidth
              justify="start"
              component="a"
              href="#overview"
            >
              Overview
            </Button> */}
          </Stack>
        </Container>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>{renderMainContent()}</AppShell.Main>

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

export default function HomePage() {
  return (
    <UserProvider userId={userID}>
      <HomePageContent />
    </UserProvider>
  );
}
