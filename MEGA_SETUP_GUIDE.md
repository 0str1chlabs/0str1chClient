# 🚀 MEGA Cloud Storage Setup Guide

This guide will walk you through setting up MEGA cloud storage for your sheet data with proper folder structure and compression.

## 📋 **Prerequisites**

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **MEGA Account** (free at [mega.nz](https://mega.nz))

## 🔧 **Step 1: Install Dependencies**

The required packages are already installed:
- ✅ `megajs` - MEGA cloud storage client
- ✅ `fflate` - High-performance compression library

## 🔐 **Step 2: Configure MEGA Account**

### **2.1 Create MEGA Account**
1. Go to [mega.nz](https://mega.nz)
2. Click "Create Account"
3. Fill in your details and verify email
4. **Note down your email and password**

### **2.2 Update Configuration File**
Edit `mega-config.js` in your project root:

```javascript
export const MEGA_CONFIG = {
  // Replace with your actual MEGA credentials
  EMAIL: 'your-actual-email@example.com',        // Your MEGA email
  PASSWORD: 'your-actual-mega-password',         // Your MEGA password
  
  // Folder structure (you can customize these)
  ROOT_FOLDER: 'sheets',                         // Root folder name
  USER_FOLDER_PREFIX: 'user_',                   // User folder prefix
  
  // Compression settings
  COMPRESSION_LEVEL: 6,                          // 1-9 (higher = better compression)
  
  // File extensions
  COMPRESSED_EXTENSION: '.gz',                   // Compressed file extension
  METADATA_EXTENSION: '.meta.json',              // Metadata file extension
};
```

## 🗂️ **Step 3: Understanding the Folder Structure**

Your MEGA cloud storage will be organized like this:

```
/sheets/
    ├── user_your-email@example.com/
    │     ├── sheet1.csv.gz          # Compressed CSV data
    │     ├── sheet1.csv.meta.json   # Metadata file
    │     ├── sheet2.csv.gz
    │     └── sheet2.csv.meta.json
    └── user_another-user@example.com/
          ├── data.csv.gz
          └── data.csv.meta.json
```

## 🚀 **Step 4: Test the Integration**

### **4.1 Start Your Application**
```bash
npm run dev
```

### **4.2 Connect to MEGA**
1. Click the **"Connect MEGA"** button in the toolbar
2. The system will authenticate using your configured credentials
3. You should see "MEGA Connected" status

### **4.3 Upload a CSV File**
1. Click **"Upload CSV"** button
2. Select a CSV file
3. Watch the console for compression and upload progress
4. Check your MEGA cloud storage for the new files

## 📊 **Step 5: Verify Everything Works**

### **5.1 Check Console Output**
You should see logs like:
```
🔐 Authenticating with MEGA cloud storage...
✅ MEGA authentication successful
📁 Root folder initialized: sheets
✅ User folder ready: sheets/user_your-email@example.com
🔄 Compressing and storing sheet data in MEGA cloud...
📊 Data compression and upload stats: {...}
✅ Sheet data successfully stored in MEGA cloud with proper folder structure
```

### **5.2 Check MEGA Cloud Storage**
1. Go to [mega.nz](https://mega.nz)
2. Login with your credentials
3. Look for the `sheets` folder
4. Inside, you should see your user folder
5. Check that both `.gz` and `.meta.json` files are present

## 🔍 **Step 6: Data Retrieval Test**

### **6.1 Load Existing Data**
1. Refresh the page
2. The system should automatically check for existing data
3. If found, you'll be prompted to load it
4. Choose a file to restore

### **6.2 Check File List**
The system will show you all available files for your user account.

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **❌ "MEGA configuration error"**
- **Solution**: Update `mega-config.js` with your actual credentials
- **Check**: Ensure email and password are correct

#### **❌ "Authentication failed"**
- **Solution**: Verify your MEGA account is active
- **Check**: Try logging in at mega.nz first

#### **❌ "Folder creation failed"**
- **Solution**: Check your MEGA storage space
- **Check**: Ensure you have at least 100MB free space

#### **❌ "Compression failed"**
- **Solution**: Check that fflate is properly installed
- **Check**: Verify the compression level is 1-9

### **Debug Steps**
1. **Check Console**: Look for error messages
2. **Verify Credentials**: Test login at mega.nz
3. **Check Storage**: Ensure you have free space
4. **Network Issues**: Check your internet connection

## 📈 **Performance Optimization**

### **Compression Settings**
- **Level 1-3**: Fast compression, larger files
- **Level 4-6**: Balanced (recommended)
- **Level 7-9**: Slow compression, smaller files

### **File Size Limits**
- **Maximum**: 100MB per file
- **Recommended**: Under 50MB for best performance
- **Storage**: 80% of your MEGA limit

## 🔒 **Security Features**

### **Data Protection**
- ✅ **End-to-End Encryption**: MEGA provides military-grade encryption
- ✅ **Local Credentials**: Your password never leaves your machine
- ✅ **User Isolation**: Each user has their own folder
- ✅ **Metadata Protection**: Separate files for data and metadata

### **Access Control**
- Only you can access your MEGA account
- Files are organized by user email
- No cross-user data access

## 📱 **User Interface**

### **MEGA Button States**
- **"Connect MEGA"**: Not authenticated
- **"MEGA Connected"**: Successfully authenticated

### **Authentication Modal**
- Shows configuration status
- Displays connection progress
- Provides error feedback

## 🔄 **Data Flow**

### **Upload Process**
1. **CSV Upload** → User selects file
2. **Data Processing** → Parse and structure data
3. **Compression** → Use fflate to compress (60-80% reduction)
4. **Folder Creation** → Create user-specific folder structure
5. **File Upload** → Upload compressed data and metadata
6. **Local Storage** → Store metadata for quick access

### **Retrieval Process**
1. **Authentication Check** → Verify MEGA connection
2. **File Discovery** → List user's files
3. **File Selection** → User chooses which file to load
4. **Download** → Get compressed data from MEGA
5. **Decompression** → Use fflate to restore data
6. **Integration** → Load data into the application

## 📊 **Monitoring & Analytics**

### **Console Logs**
- Authentication status
- Compression ratios
- Upload/download progress
- Error messages

### **Storage Information**
- Current usage
- Available space
- File counts
- Compression statistics

## 🎯 **Next Steps**

### **Immediate Actions**
1. ✅ Update `mega-config.js` with your credentials
2. ✅ Test authentication
3. ✅ Upload a test CSV file
4. ✅ Verify folder structure in MEGA

### **Future Enhancements**
- **Advanced Compression**: Multiple algorithm support
- **File Versioning**: Track changes over time
- **Sharing**: Share files with other users
- **Sync**: Real-time synchronization
- **Analytics**: Detailed usage statistics

## 📞 **Support**

### **Getting Help**
1. **Check this guide first**
2. **Review console error messages**
3. **Verify MEGA account status**
4. **Test with simple files**

### **Reporting Issues**
- Document error messages
- Include console logs
- Note MEGA account status
- Describe steps to reproduce

---

## 🎉 **You're All Set!**

Your MEGA cloud storage integration is now configured with:
- ✅ **Proper folder structure** for user organization
- ✅ **fflate compression** for efficient storage
- ✅ **Automatic authentication** using configured credentials
- ✅ **Comprehensive error handling** and logging
- ✅ **Secure data storage** with end-to-end encryption

**Start uploading your CSV files and enjoy the benefits of cloud storage with compression!** 🚀
