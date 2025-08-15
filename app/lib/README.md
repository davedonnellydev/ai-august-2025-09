# Lib Folder Organization

This folder contains shared utility functions and business logic for the application.

## 📁 Folder Structure

### `gmail/` - Gmail API Integration
Contains functions that interact directly with the Gmail API:
- **`gmailClient.ts`** - OAuth2 client setup and Gmail service initialization
- **`fetchMessages.ts`** - Low-level Gmail API calls (list, get, labels)

### `email/` - Email Processing & Sync
Contains functions for processing email content and managing sync state:
- **`normalize.ts`** - Email content normalization (HTML cleaning, text extraction, link parsing)
- **`upsert.ts`** - Database operations for email messages and links
- **`syncState.ts`** - Gmail sync state management (history IDs, timestamps)
- **`shared.ts`** - Common functions used by multiple sync modules
- **`syncByLabel.ts`** - Sync emails by scanning a specific Gmail label
- **`historySync.ts`** - Incremental sync using Gmail History API

## 🔄 Code Organization Principles

### 1. **Separation of Concerns**
- **Gmail API Layer** (`gmail/`): Raw API calls and authentication
- **Email Processing Layer** (`email/`): Content processing and database operations
- **Shared Utilities** (`email/shared.ts`): Common functions to avoid duplication

### 2. **Why This Structure?**
- **`gmail/`** contains Gmail-specific API integration code
- **`email/`** contains generic email processing that could work with other providers (Outlook, etc.)
- **`shared.ts`** eliminates code duplication between sync modules

### 3. **Sync Strategy**
- **`syncByLabel`**: Full scan of messages in a label (used for initial sync or fallback)
- **`historySync`**: Incremental sync using Gmail History API (efficient for ongoing syncs)
- Both use the same shared functions for consistency

## 🚀 Usage Examples

### Basic Gmail Sync
```typescript
import { syncByLabel } from '@/app/lib/email/syncByLabel';

const result = await syncByLabel({
  userId: 'user-123',
  label: 'INBOX',
  maxFetch: 50
});
```

### Incremental History Sync
```typescript
import { syncByHistory } from '@/app/lib/email/historySync';

const result = await syncByHistory({
  userId: 'user-123',
  label: 'INBOX'
});
```

### Direct Gmail API Access
```typescript
import { getGmail } from '@/app/lib/google/gmailClient';

const gmail = await getGmail('user-123');
const messages = await gmail.users.messages.list({
  userId: 'me',
  labelIds: ['INBOX']
});
```

## 🔧 Maintenance

### Adding New Email Providers
1. Create new folder (e.g., `outlook/`)
2. Implement provider-specific API client
3. Reuse email processing functions from `email/` folder

### Updating Sync Logic
1. Modify shared functions in `email/shared.ts`
2. Both sync modules automatically use updated logic
3. No need to update multiple files

### Adding New Email Processing Features
1. Add to appropriate module in `email/` folder
2. Import and use in sync modules as needed
3. Keep Gmail API logic separate in `gmail/` folder
