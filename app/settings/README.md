# User Settings & Manual Sync

This application now provides comprehensive user settings management and manual email synchronization capabilities.

## 🎯 **Features Overview**

### **1. User Settings Management**
- **Gmail Label Selection**: Choose which Gmail labels to monitor for job leads
- **Sync Frequency**: Configure automatic sync intervals (15 minutes to 24 hours)
- **Custom Instructions**: Provide AI with specific rules for job lead extraction
- **Real-time Updates**: Settings are saved immediately and applied to future syncs

### **2. Manual Email Sync**
- **One-Click Sync**: Trigger email scanning from multiple locations in the app
- **Real-time Status**: See sync progress and completion details
- **Smart Refresh**: Automatically refresh job leads after successful sync
- **Error Handling**: Clear feedback for sync failures and issues

## 🚀 **How to Use**

### **Accessing Settings**
1. **From Dashboard**: Click the "Settings" button in the top navigation
2. **From Landing Page**: Use the "Settings" button in the header
3. **Direct URL**: Navigate to `/settings`

### **Configuring Gmail Labels**
1. **Sync Labels**: Click "Sync Labels" to fetch your Gmail labels
2. **Select Labels**: Toggle switches to select which labels to monitor
3. **Save Changes**: Click "Save Settings" to apply your selection

**Recommended Labels:**
- `Job Leads` - For job-related emails
- `Career` - For career opportunities
- `Recruitment` - For recruitment emails
- `Hiring` - For hiring announcements

### **Setting Sync Frequency**
1. **Choose Interval**: Select from 15 minutes to 24 hours
2. **Consider Workload**: More frequent syncs = more real-time updates
3. **Balance Resources**: Less frequent syncs = lower server load

**Recommended Settings:**
- **Active Job Search**: Every 2-4 hours (120-240 minutes)
- **Casual Monitoring**: Every 12-24 hours (720-1440 minutes)
- **Weekly Check**: Every 7 days (10080 minutes)

### **Custom Extraction Rules**
Provide specific instructions for the AI to better identify job leads:

**Example Instructions:**
```
Focus on engineering and technical roles only. 
Ignore marketing and sales positions. 
Prioritize remote/hybrid opportunities. 
Look for senior-level positions (5+ years experience).
Prefer companies with 50+ employees.
```

### **Manual Sync**
1. **From Header**: Click the refresh icon in the top navigation
2. **From Dashboard**: Use the "Sync Emails" button
3. **From Settings**: Use the "Manual Sync" button

## 🔧 **Technical Details**

### **Sync Process**
1. **Label Scanning**: Scans selected Gmail labels for new emails
2. **Content Analysis**: Uses AI to extract job-related information
3. **Lead Creation**: Creates job lead records in the database
4. **Deduplication**: Prevents duplicate leads using URL normalization
5. **Status Updates**: Updates existing leads with new information

### **Data Storage**
- **Users**: Email, display name, and authentication details
- **Gmail Tokens**: OAuth tokens for Gmail API access
- **Job Leads**: Extracted job information with metadata
- **Sync State**: Tracking of sync operations and history

### **API Endpoints**
- `POST /api/sync` - Manual email synchronization
- `GET /api/settings` - Retrieve user settings
- `PUT /api/settings` - Update user settings
- `POST /api/gmail/labels/sync` - Sync Gmail labels
- `GET /api/gmail/labels` - Get available Gmail labels

## 📊 **Monitoring & Debugging**

### **Sync Status Indicators**
- **Header Badge**: Shows last sync time
- **Status Alerts**: Real-time sync progress updates
- **Success/Error Messages**: Clear feedback on sync results

### **Common Issues**
1. **No Labels Found**: Click "Sync Labels" to fetch from Gmail
2. **Sync Fails**: Check Gmail OAuth connection in settings
3. **No Job Leads**: Verify label selection and custom instructions
4. **Slow Sync**: Reduce sync frequency or check email volume

### **Debug Information**
- **Console Logs**: Detailed sync process logging
- **API Responses**: Sync operation results and statistics
- **Database State**: User and token storage verification

## 🎨 **UI Components**

### **Settings Page**
- **Gmail Labels Section**: Label selection with visual indicators
- **Sync Frequency**: Numeric input with validation
- **Custom Instructions**: Multi-line text area for AI rules
- **Save Button**: Disabled until valid configuration

### **Dashboard Integration**
- **Sync Button**: Prominent button for manual sync
- **Status Display**: Real-time sync progress and results
- **Quick Access**: Settings link in main navigation

### **Responsive Design**
- **Mobile Friendly**: Optimized for all screen sizes
- **Touch Support**: Easy navigation on mobile devices
- **Loading States**: Clear feedback during operations

## 🔒 **Security & Privacy**

### **Data Protection**
- **OAuth Only**: No password storage required
- **User Isolation**: Each user sees only their own data
- **Secure Tokens**: Gmail tokens encrypted in database
- **Session Management**: Secure NextAuth session handling

### **API Security**
- **Authentication Required**: All endpoints require valid session
- **User Validation**: Requests validated against session user ID
- **Rate Limiting**: Prevents abuse of sync endpoints
- **Error Handling**: No sensitive data in error messages

## 🚀 **Future Enhancements**

### **Planned Features**
- **Advanced Filtering**: More sophisticated job lead filtering
- **Email Templates**: Custom email response templates
- **Analytics Dashboard**: Detailed sync and lead statistics
- **Integration APIs**: Connect with job application platforms
- **Mobile App**: Native mobile application support

### **Performance Improvements**
- **Incremental Sync**: Only process new emails
- **Batch Processing**: Handle large email volumes efficiently
- **Caching**: Smart caching of frequently accessed data
- **Background Jobs**: Asynchronous sync processing

## 📞 **Support & Troubleshooting**

### **Getting Help**
1. **Check Console**: Look for error messages in browser console
2. **Verify Settings**: Ensure Gmail labels are properly configured
3. **Test Sync**: Use manual sync to test configuration
4. **Review Logs**: Check server logs for detailed error information

### **Common Solutions**
- **Re-authenticate**: Sign out and back in to refresh tokens
- **Re-sync Labels**: Fetch Gmail labels again if none appear
- **Check Permissions**: Ensure Gmail API access is granted
- **Verify Network**: Check internet connection and API accessibility
