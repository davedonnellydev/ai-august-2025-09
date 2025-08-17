# Netlify Functions

## Gmail Sync Function

The `gmail-sync.ts` function handles scheduled Gmail synchronization for all users.

### Scheduled Functions

This function is configured as a Netlify Scheduled Function that runs automatically at specified intervals. To enable scheduled execution:

1. **Add to `netlify.toml`:**

```toml
[functions]
  directory = "netlify/functions"

[[functions.schedule]]
  function = "gmail-sync"
  cron = "*/15 * * * *"  # Runs every 15 minutes
```

2. **Environment Variables:**
   - `CRON_SECRET`: Required secret key for authentication
   - `DATABASE_URL`: Database connection string
   - Other Gmail/OpenAI environment variables

### CRON_SECRET

The `CRON_SECRET` environment variable is used to authenticate scheduled function calls:

- **Purpose**: Prevents unauthorized access to the sync endpoint
- **Format**: Any secure random string (recommend 32+ characters)
- **Usage**: Netlify automatically includes this in the `Authorization` header
- **Security**: Keep this secret and rotate regularly

### Function Behavior

1. **Authentication**: Validates `CRON_SECRET` from request headers
2. **User Discovery**: Queries all users with configured watched labels
3. **Frequency Check**: Skips users within their configured `cronFrequencyMinutes`
4. **Sync Execution**: Runs history sync with label scan fallback for each user
5. **State Tracking**: Updates `sync_state` table with completion timestamps

### Manual vs Scheduled

- **Manual Sync**: Triggered via `/api/sync` endpoint (authenticated user session)
- **Scheduled Sync**: Automatic via Netlify cron (authenticated with `CRON_SECRET`)
- **Frequency Control**: Users control sync frequency via Settings page (15-1440 minutes)

### Monitoring

The function provides detailed logging and returns comprehensive summaries including:

- Total users processed/skipped
- Emails processed and leads extracted
- Error counts and detailed results per user
- Timestamps for all operations
