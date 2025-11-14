// Enhanced Farcaster Mini App with robust SDK handling
console.log('🚀 Farcaster Mini App Starting...');

// Global variable to track SDK status
window.farcasterSDKReady = false;
window.appInitialized = false;

// Method 1: Direct SDK import with fallback
async function initializeFarcasterSDK() {
    try {
        console.log('📦 Importing Farcaster SDK...');
        
        // Try to import the SDK
        const { sdk } = await import('https://esm.sh/@farcaster/miniapp-sdk');
        console.log('✅ SDK imported via CDN');
        return sdk;
    } catch (error) {
        console.error('❌ CDN import failed, trying local:', error);
        
        try {
            // Fallback to local import
            const { sdk } = await import('@farcaster/miniapp-sdk');
            console.log('✅ SDK imported locally');
            return sdk;
        } catch (localError) {
            console.error('❌ All SDK imports failed:', localError);
            throw new Error('Cannot load Farcaster SDK');
        }
    }
}

// Method 2: Wait for SDK to be truly ready
function waitForSDKReady(sdk, timeout = 5000) {
    return new Promise((resolve, reject) => {
        console.log('⏳ Waiting for SDK to be ready...');
        
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (sdk.isReady) {
                clearInterval(checkInterval);
                console.log('✅ SDK is ready!');
                window.farcasterSDKReady = true;
                resolve(sdk);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                console.warn('⚠️ SDK ready timeout, continuing anyway...');
                window.farcasterSDKReady = true;
                resolve(sdk); // Resolve anyway to prevent blocking
            }
        }, 100);
    });
}

// Method 3: Force call ready() with multiple attempts
async function callReadyAction(sdk, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`🔄 Calling sdk.actions.ready() - Attempt ${attempt}`);
            await sdk.actions.ready();
            console.log('✅ sdk.actions.ready() successful!');
            return true;
        } catch (error) {
            console.error(`❌ ready() attempt ${attempt} failed:`, error);
            
            if (attempt === maxAttempts) {
                console.error('🚨 All ready() attempts failed');
                return false;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// Main app initialization
async function initializeApp() {
    if (window.appInitialized) {
        console.log('🔄 App already initialized');
        return;
    }

    try {
        console.log('🎯 Starting app initialization...');
        
        // Step 1: Load SDK
        const sdk = await initializeFarcasterSDK();
        window.farcasterSDK = sdk;
        
        // Step 2: Wait for SDK readiness
        await waitForSDKReady(sdk);
        
        // Step 3: Load user data
        await loadUserData(sdk);
        
        // Step 4: Setup event listeners
        setupEventListeners();
        
        // Step 5: CRITICAL - Call ready() to hide splash screen
        const readySuccess = await callReadyAction(sdk);
        
        if (readySuccess) {
            console.log('🎉 App initialized successfully!');
            window.appInitialized = true;
        } else {
            console.warn('⚠️ App initialized but ready() failed');
            window.appInitialized = true;
        }
        
    } catch (error) {
        console.error('💥 App initialization failed:', error);
        emergencyFallback();
    }
}

// Load user data
async function loadUserData(sdk) {
    try {
        console.log('👤 Loading user data...');
        const context = await sdk.context;
        console.log('📋 User context:', context);
        
        if (context && context.user) {
            updateUserInterface(context.user);
        } else {
            showErrorMessage('No user data available');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showErrorMessage('Cannot access user profile');
    }
}

// Update UI with user data
function updateUserInterface(user) {
    try {
        console.log('🎨 Updating UI with user data...');
        
        // Profile picture
        const profilePic = document.getElementById('profile-picture');
        if (user.pfpUrl) {
            profilePic.src = user.pfpUrl;
            profilePic.style.display = 'block';
            console.log('🖼️ Profile picture loaded:', user.pfpUrl);
        } else {
            profilePic.style.display = 'none';
        }

        // Display name
        const displayName = document.getElementById('display-name');
        displayName.textContent = user.displayName || 'Anonymous User';

        // FID
        const fidValue = document.getElementById('fid-value');
        fidValue.textContent = user.fid || 'N/A';
        window.currentFID = user.fid;
        console.log('🔢 FID loaded:', user.fid);

        // Username
        const username = document.getElementById('username');
        username.textContent = user.username || 'Not set';

        // Bio - Improved handling
        const bio = document.getElementById('bio');
        if (user.bio && user.bio.trim().length > 0) {
            bio.textContent = user.bio;
            console.log('📝 Bio loaded:', user.bio);
        } else {
            bio.textContent = '🌟 Bio is empty - tell us about yourself!';
            bio.style.fontStyle = 'italic';
            bio.style.opacity = '0.7';
        }
        
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    try {
        console.log('🔗 Setting up event listeners...');
        
        // Copy FID button
        const copyBtn = document.getElementById('copy-fid-btn');
        copyBtn.addEventListener('click', copyFIDToClipboard);

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.addEventListener('click', refreshData);
        
        console.log('✅ Event listeners setup complete');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Copy FID to clipboard
async function copyFIDToClipboard() {
    if (!window.currentFID) {
        showToast('No FID available to copy', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(window.currentFID.toString());
        showToast('FID copied to clipboard! ✅');
        
        const copyBtn = document.getElementById('copy-fid-btn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✅ Copied!';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Copy failed:', error);
        fallbackCopyFID();
    }
}

// Fallback copy method
function fallbackCopyFID() {
    const textArea = document.createElement('textarea');
    textArea.value = window.currentFID.toString();
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('FID copied to clipboard! ✅');
    } catch (error) {
        showToast('Failed to copy FID', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Refresh data
async function refreshData() {
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.innerHTML = '🔄 Refreshing...';
    refreshBtn.disabled = true;
    
    if (window.farcasterSDK) {
        await loadUserData(window.farcasterSDK);
    }
    
    refreshBtn.innerHTML = '🔄 Refresh';
    refreshBtn.disabled = false;
    showToast('Data refreshed!');
}

// Show toast message
function showToast(message, type = 'success') {
    try {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } catch (error) {
        console.error('Error showing toast:', error);
    }
}

// Show error message
function showErrorMessage(message) {
    console.error('App Error:', message);
    showToast(message, 'error');
    
    try {
        document.getElementById('display-name').textContent = 'Error Loading Data';
        document.getElementById('fid-value').textContent = '---';
        document.getElementById('username').textContent = 'Error';
        document.getElementById('bio').textContent = message;
    } catch (error) {
        console.error('Error updating error UI:', error);
    }
}

// EMERGENCY FALLBACK: Last resort to hide splash screen
async function emergencyFallback() {
    console.log('🆘 EMERGENCY FALLBACK ACTIVATED');
    
    // Try multiple methods to call ready()
    const methods = [
        // Method 1: Direct SDK call
        async () => {
            if (window.farcasterSDK && window.farcasterSDK.actions) {
                await window.farcasterSDK.actions.ready();
                return true;
            }
            return false;
        },
        // Method 2: Global SDK object
        async () => {
            if (window.sdk && window.sdk.actions) {
                await window.sdk.actions.ready();
                return true;
            }
            return false;
        },
        // Method 3: Try to access via import
        async () => {
            try {
                const { sdk } = await import('@farcaster/miniapp-sdk');
                await sdk.actions.ready();
                return true;
            } catch (e) {
                return false;
            }
        }
    ];
    
    for (const method of methods) {
        try {
            const success = await method();
            if (success) {
                console.log('🆘 Emergency ready() successful!');
                return;
            }
        } catch (error) {
            console.error('Emergency method failed:', error);
        }
    }
    
    console.error('🚨 ALL EMERGENCY METHODS FAILED');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Final fallback: Call ready after 5 seconds no matter what
setTimeout(async () => {
    if (!window.appInitialized) {
        console.log('⏰ FINAL FALLBACK: 5 second timeout reached');
        await emergencyFallback();
        window.appInitialized = true;
    }
}, 5000);

// Global error handler
window.addEventListener('error', (event) => {
    console.error('🌍 Global error:', event.error);
});
