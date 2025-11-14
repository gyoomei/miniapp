import { sdk } from '@farcaster/miniapp-sdk'

class FIDChecker {
    constructor() {
        this.init()
    }

    async init() {
        try {
            // Inisialisasi SDK
            await this.initializeSDK()
            
            // Dapatkan user context
            await this.loadUserContext()
            
            // Setup event listeners
            this.setupEventListeners()
            
            // Tampilkan app
            await sdk.actions.ready()
            
        } catch (error) {
            console.error('Error initializing app:', error)
            this.showError('Failed to load user data')
        }
    }

    async initializeSDK() {
        // Tunggu sampai SDK siap
        if (!sdk.isReady) {
            await new Promise(resolve => {
                const checkReady = setInterval(() => {
                    if (sdk.isReady) {
                        clearInterval(checkReady)
                        resolve()
                    }
                }, 100)
            })
        }
    }

    async loadUserContext() {
        try {
            this.showLoadingState(true)
            
            // Dapatkan context user dari Farcaster
            const context = await sdk.context
            console.log('User context:', context)
            
            if (context && context.user) {
                this.updateUI(context.user)
            } else {
                this.showError('No user data available')
            }
            
        } catch (error) {
            console.error('Error loading user context:', error)
            this.showError('Cannot access user profile')
        } finally {
            this.showLoadingState(false)
        }
    }

    updateUI(user) {
        // Update profile picture
        const profilePic = document.getElementById('profile-picture')
        if (user.pfpUrl) {
            profilePic.src = user.pfpUrl
            profilePic.style.display = 'block'
        } else {
            profilePic.style.display = 'none'
        }

        // Update display name
        const displayName = document.getElementById('display-name')
        displayName.textContent = user.displayName || 'Anonymous User'

        // Update FID
        const fidValue = document.getElementById('fid-value')
        fidValue.textContent = user.fid || 'N/A'

        // Update username
        const username = document.getElementById('username')
        username.textContent = user.username || 'Not set'

        // Update bio
        const bio = document.getElementById('bio')
        bio.textContent = user.bio || 'No bio available'

        // Store FID untuk copy function
        this.currentFID = user.fid
    }

    setupEventListeners() {
        // Copy FID button
        const copyBtn = document.getElementById('copy-fid-btn')
        copyBtn.addEventListener('click', () => this.copyFID())

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn')
        refreshBtn.addEventListener('click', () => this.refreshData())
    }

    async copyFID() {
        if (!this.currentFID) {
            this.showToast('No FID available to copy', 'error')
            return
        }

        try {
            // Gunakan Clipboard API
            await navigator.clipboard.writeText(this.currentFID.toString())
            this.showToast('FID copied to clipboard! ✅')
            
            // Tambahkan feedback visual
            const copyBtn = document.getElementById('copy-fid-btn')
            const originalText = copyBtn.innerHTML
            copyBtn.innerHTML = '✅ Copied!'
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText
            }, 2000)
            
        } catch (error) {
            console.error('Copy failed:', error)
            // Fallback untuk browser yang tidak support Clipboard API
            this.fallbackCopyFID()
        }
    }

    fallbackCopyFID() {
        const textArea = document.createElement('textarea')
        textArea.value = this.currentFID.toString()
        document.body.appendChild(textArea)
        textArea.select()
        
        try {
            document.execCommand('copy')
            this.showToast('FID copied to clipboard! ✅')
        } catch (error) {
            this.showToast('Failed to copy FID', 'error')
        }
        
        document.body.removeChild(textArea)
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn')
        refreshBtn.innerHTML = '🔄 Refreshing...'
        refreshBtn.disabled = true
        
        await this.loadUserContext()
        
        refreshBtn.innerHTML = '🔄 Refresh'
        refreshBtn.disabled = false
        this.showToast('Data refreshed!')
    }

    showLoadingState(show) {
        const elements = document.querySelectorAll('.profile-pic, .fid-value, .detail-value')
        elements.forEach(el => {
            if (show) {
                el.classList.add('loading-pulse')
            } else {
                el.classList.remove('loading-pulse')
            }
        })
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast')
        toast.textContent = message
        toast.className = `toast ${type}`
        toast.classList.add('show')
        
        setTimeout(() => {
            toast.classList.remove('show')
        }, 3000)
    }

    showError(message) {
        this.showToast(message, 'error')
        
        // Update UI dengan placeholder data
        document.getElementById('display-name').textContent = 'Error Loading Data'
        document.getElementById('fid-value').textContent = '---'
        document.getElementById('username').textContent = 'Error'
        document.getElementById('bio').textContent = message
    }
}

// Inisialisasi app ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new FIDChecker()
})

// Handle potential errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
})
