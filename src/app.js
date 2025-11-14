import { sdk } from '@farcaster/miniapp-sdk'

console.log('🔧 Farcaster Mini App Starting...');

class FIDChecker {
    constructor() {
        this.currentFID = null;
        this.sdkReady = false;
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Initializing Farcaster SDK...');
            
            // Tunggu SDK benar-benar ready
            await this.waitForSDK();
            
            console.log('✅ SDK Ready, loading user context...');
            await this.loadUserContext();
            
            console.log('✅ Setting up event listeners...');
            this.setupEventListeners();
            
            console.log('🚀 Calling sdk.actions.ready()...');
            await sdk.actions.ready();
            console.log('🎉 Splash screen should be hidden now!');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError('Failed to load: ' + error.message);
            
            // Tetap coba sembunyikan splash screen meski error
            try {
                await sdk.actions.ready();
            } catch (e) {
                console.error('Even ready failed:', e);
            }
        }
    }

    async waitForSDK() {
        // Method 1: Tunggu sampai sdk.isReady = true
        if (sdk.isReady) {
            this.sdkReady = true;
            return;
        }

        // Method 2: Tunggu maksimal 5 detik
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                clearInterval(interval);
                reject(new Error('SDK timeout after 5 seconds'));
            }, 5000);

            const interval = setInterval(() => {
                if (sdk.isReady) {
                    clearTimeout(timeout);
                    clearInterval(interval);
                    this.sdkReady = true;
                    resolve();
                }
            }, 100);
        });
    }

    async loadUserContext() {
        try {
            this.showLoadingState(true);
            
            // Pastikan context tersedia
            if (!sdk.context) {
                throw new Error('SDK context not available');
            }
            
            const context = await sdk.context;
            console.log('📋 User context:', context);
            
            if (context && context.user) {
                this.updateUI(context.user);
            } else {
                this.showError('No user data available');
            }
            
        } catch (error) {
            console.error('Error loading user context:', error);
            this.showError('Cannot access user profile');
            // Tetap lanjut meski error
        } finally {
            this.showLoadingState(false);
        }
    }

    updateUI(user) {
        try {
            const profilePic = document.getElementById('profile-picture');
            if (user.pfpUrl) {
                profilePic.src = user.pfpUrl;
                profilePic.style.display = 'block';
                console.log('🖼️ Profile picture loaded');
            } else {
                profilePic.style.display = 'none';
            }

            const displayName = document.getElementById('display-name');
            displayName.textContent = user.displayName || 'Anonymous User';

            const fidValue = document.getElementById('fid-value');
            fidValue.textContent = user.fid || 'N/A';
            console.log('🔢 FID loaded:', user.fid);

            const username = document.getElementById('username');
            username.textContent = user.username || 'Not set';

            const bio = document.getElementById('bio');
            bio.textContent = user.bio || 'No bio available';

            this.currentFID = user.fid;
            
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    setupEventListeners() {
        try {
            const copyBtn = document.getElementById('copy-fid-btn');
            copyBtn.addEventListener('click', () => this.copyFID());

            const refreshBtn = document.getElementById('refresh-btn');
            refreshBtn.addEventListener('click', () => this.refreshData());
            
            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    async copyFID() {
        if (!this.currentFID) {
            this.showToast('No FID available to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.currentFID.toString());
            this.showToast('FID copied to clipboard! ✅');
            
            const copyBtn = document.getElementById('copy-fid-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copied!';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            this.fallbackCopyFID();
        }
    }

    fallbackCopyFID() {
        const textArea = document.createElement('textarea');
        textArea.value = this.currentFID.toString();
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showToast('FID copied to clipboard! ✅');
        } catch (error) {
            this.showToast('Failed to copy FID', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.innerHTML = '🔄 Refreshing...';
        refreshBtn.disabled = true;
        
        await this.loadUserContext();
        
        refreshBtn.innerHTML = '🔄 Refresh';
        refreshBtn.disabled = false;
        this.showToast('Data refreshed!');
    }

    showLoadingState(show) {
        const elements = document.querySelectorAll('.profile-pic, .fid-value, .detail-value');
        elements.forEach(el => {
            if (show) {
                el.classList.add('loading-pulse');
            } else {
                el.classList.remove('loading-pulse');
            }
        });
    }

    showToast(message, type = 'success') {
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

    showError(message) {
        console.error('App Error:', message);
        this.showToast(message, 'error');
        
        try {
            document.getElementById('display-name').textContent = 'Error Loading Data';
            document.getElementById('fid-value').textContent = '---';
            document.getElementById('username').textContent = 'Error';
            document.getElementById('bio').textContent = message;
        } catch (error) {
            console.error('Error updating error UI:', error);
        }
    }
}

// Inisialisasi app dengan error handling
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM Content Loaded');
    
    try {
        new FIDChecker();
    } catch (error) {
        console.error('❌ Failed to initialize FIDChecker:', error);
        
        // Emergency fallback - coba sembunyikan splash screen
        try {
            await sdk.actions.ready();
            console.log('🆘 Emergency ready() called');
        } catch (e) {
            console.error('🆘 Even emergency ready failed:', e);
        }
    }
});

// Fallback global - panggil ready setelah timeout
setTimeout(async () => {
    console.log('⏰ Fallback timeout reached');
    try {
        await sdk.actions.ready();
        console.log('🆘 Fallback ready() called');
    } catch (error) {
        console.error('🆘 Fallback ready failed:', error);
    }
}, 3000);

// Handle global errors
window.addEventListener('error', (event) => {
    console.error('🌍 Global error:', event.error);
});
