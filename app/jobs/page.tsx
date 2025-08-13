'use client';

import { Jobs } from '../../components/Jobs/Jobs';
import { UserProvider, useUser } from '../contexts/UserContext';

const userID: string = '2d30743e-10cb-4490-933c-4ccdf37364e9';

function JobsPageContent() {
  const { userId } = useUser();
  return <Jobs userId={userId} />;
}

export default function JobsPage() {
  return (
    <UserProvider userId={userID}>
      <JobsPageContent />
    </UserProvider>
  );
}
