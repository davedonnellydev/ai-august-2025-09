'use client';

import { Leads } from '../../components/Jobs/Jobs';
import { UserProvider, useUser } from '../contexts/UserContext';

const userID: string = '2d30743e-10cb-4490-933c-4ccdf37364e9';

function LeadsPageContent() {
  const { userId } = useUser();
  return <Leads userId={userId} />;
}

export default function LeadsPage() {
  return (
    <UserProvider userId={userID}>
      <LeadsPageContent />
    </UserProvider>
  );
}
