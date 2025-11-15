// ULTRA FAST Farcaster Mini App - FIXED USERNAME & NO BIO
console.log('🚀 Starting Ultra Fast Farcaster Mini App...');

// Global state management
window.appState = {
    sdk: null,
    user: null,
    initialized: false,
    readyCalled: false
};

// Ultra fast SDK loader with multiple fallbacks
async function loadSDKUltraFast() {
    const loaders = [
        // Primary: CDN with timeout
        async () => {
            const { sdk } = await import('https://esm.sh/@farcaster/miniapp-sdk');
            console.log('✅ SDK loaded via CDN');
            return sdk;
        },
        // Secondary: Local with timeout
        async () => {
            const { sdk } = await import('@farcaster/miniapp-sdk');
            console.log('✅ SDK loaded locally');
            return sdk;
        },
        // Tertiary: Global SDK
        async () => {
            if (window.sdk) {
                console.log('✅ SDK loaded from global');
                return window.sdk;
            }
            throw new Error('No SDK available');
        }
    ];

    for (const loader of loaders) {
        try {
            // Add timeout to each loader
            const sdk = await Promise.race([
                loader(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 2000)
                )
            ]);
            return sdk;
        } catch (error) {
            console.warn(`Loader failed:`, error.message);
            continue;
        }
    }
    
    throw new Error('All SDK loaders failed');
}

// CRITICAL: Call ready ASAP to hide splash screen
async function callReadyImmediately(sdk) {
    if (window.appState.readyCalled) return;
    
    try {
        console.log('🚀 Calling ready() immediately...');
        await sdk.actions.ready();
        window.appState.readyCalled = true;
        console.log('✅ ready() called successfully');
    } catch (error) {
        console.warn('⚠️ ready() failed, will retry:', error);
        // Don't throw, continue with app
    }
}

// FIXED: Better user data fetching with proper username handling
async function fetchAllUserData(sdk) {
    try {
        console.log('📥 Fetching user data...');
        
        // Get context first (most critical)
        const context = await sdk.context;
        console.log('📋 User context:', context);
        
        if (!context?.user) {
            throw new Error('No user data in context');
        }

        // Show immediate UI update with basic data
        updateUIImmediately(context.user);
        
        // FIXED: Get enhanced profile data including username
        try {
            if (context.user.fid) {
                console.log('🔍 Looking up enhanced profile for FID:', context.user.fid);
                const enhancedProfile = await sdk.lookupUserByFid(context.user.fid);
                console.log('✅ Enhanced profile:', enhancedProfile);
                
                if (enhancedProfile) {
                    updateUIWithEnhancedData(enhancedProfile);
                    cacheUserData(enhancedProfile);
                }
            }
        } catch (profileError) {
            console.log('ℹ️ Enhanced profile not available, using basic data:', profileError);
            // Use basic context data if enhanced profile fails
            if (context.user.username) {
                document.getElementById('username').textContent = context.user.username;
            }
        }

        cacheUserData(context.user);
        return context.user;
        
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
}

// Immediate UI update with basic data
function updateUIImmediately(user) {
    try {
        // Show main app content
        document.getElementById('critical-loading').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        
        // Update critical fields first
        if (user.displayName) {
            document.getElementById('display-name').textContent = user.displayName;
        } else if (user.username) {
            document.getElementById('display-name').textContent = user.username;
        }
        
        if (user.fid) {
            document.getElementById('fid-value').textContent = user.fid;
            window.currentFID = user.fid;
        }
        
        // FIXED: Set username from basic data if available
        if (user.username) {
            document.getElementById('username').textContent = user.username;
        }
        
        // Profile picture with error handling
        const profilePic = document.getElementById('profile-picture');
        if (user.pfpUrl) {
            profilePic.src = user.pfpUrl;
            profilePic.style.display = 'block';
            profilePic.onerror = () => {
                profilePic.style.display = 'none';
            };
        }
        
    } catch (error) {
        console.error('Error in immediate UI update:', error);
    }
}

// Enhanced UI update with additional data - FIXED USERNAME & NO BIO
function updateUIWithEnhancedData(profile) {
    try {
        console.log('🎨 Updating UI with enhanced data:', profile);
        
        // FIXED: Proper username handling
        if (profile.username) {
            document.getElementById('username').textContent = profile.username;
            console.log('✅ Username set to:', profile.username);
        } else if (profile.displayName) {
            document.getElementById('username').textContent = profile.displayName;
        }
        
        // Update display name if better one available
        if (profile.displayName && profile.displayName !== profile.username) {
            document.getElementById('display-name').textContent = profile.displayName;
        }
        
        // BIO SECTION REMOVED - NO MORE BIO CODE HERE
        
    } catch (error) {
        console.error('Error in enhanced UI update:', error);
    }
}

// Cache system for instant loads
function cacheUserData(user) {
    try {
        localStorage.setItem('farcaster-user-cache', JSON.stringify({
            user: user,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Cannot cache user data:', error);
    }
}

function getCachedUserData() {
    try {
        const cached = localStorage.getItem('farcaster-user-cache');
        if (cached) {
            const { user, timestamp } = JSON.parse(cached);
            // Use cache if less than 5 minutes old
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                return user;
            }
        }
    } catch (error) {
        console.warn('Cannot read cache:', error);
    }
    return null;
}

// Event listeners setup
function setupEventListeners() {
    // Copy FID with enhanced feedback
    document.getElementById('copy-fid-btn').addEventListener('click', async () => {
        if (!window.currentFID) {
            showToast('No FID available to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(window.currentFID.toString());
            
            const btn = document.getElementById('copy-fid-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            btn.style.background = '#10B981';
            
            showToast('FID copied to clipboard!');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
            
        } catch (error) {
            // Fallback copy method
            const textArea = document.createElement('textarea');
            textArea.value = window.currentFID.toString();
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('FID copied to clipboard!');
        }
    });

    // Refresh with visual feedback
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '🔄 Refreshing...';
        btn.disabled = true;
        
        try {
            localStorage.removeItem('farcaster-user-cache');
            await initializeApp();
            showToast('Data refreshed!');
        } catch (error) {
            showToast('Refresh failed', 'error');
        } finally {
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 1000);
        }
    });
}

// Toast notification system
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
        console.error('Toast error:', error);
    }
}

// MAIN INITIALIZATION - ULTRA FAST
async function initializeApp() {
    if (window.appState.initialized) return;
    
    try {
        console.log('🎯 Starting ultra fast initialization...');
        
        // Step 1: Try cached data first for instant display
        const cachedUser = getCachedUserData();
        if (cachedUser) {
            console.log('⚡ Using cached user data for instant display');
            updateUIImmediately(cachedUser);
        }
        
        // Step 2: Load SDK and call ready() in parallel with data fetching
        const sdk = await loadSDKUltraFast();
        window.appState.sdk = sdk;
        
        // Step 3: CRITICAL - Call ready() immediately to hide splash screen
        callReadyImmediately(sdk);
        
        // Step 4: Fetch fresh data
        await fetchAllUserData(sdk);
        
        // Step 5: Setup interactions
        setupEventListeners();
        
        window.appState.initialized = true;
        console.log('🎉 App fully initialized!');
        
    } catch (error) {
        console.error('💥 Initialization error:', error);
        
        // Emergency: Ensure app content is visible even on error
        document.getElementById('critical-loading').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        
        showToast('Loading issue - using basic mode', 'error');
    }
}

// Start app immediately - don't wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Final safety net - ensure ready is called within 3 seconds
setTimeout(() => {
    if (!window.appState.readyCalled && window.appState.sdk) {
        console.log('🆘 Safety net: forcing ready() call');
        callReadyImmediately(window.appState.sdk);
    }
}, 3000);

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});
