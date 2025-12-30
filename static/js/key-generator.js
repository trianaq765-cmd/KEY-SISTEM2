// Check rate limit and generate key
async function checkAndGenerate() {
    const lastGenerated = localStorage.getItem('lastKeyGenerated');
    
    if (lastGenerated) {
        const lastDate = new Date(lastGenerated);
        const now = new Date();
        const hoursDiff = (now - lastDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            showRateLimitState(24 - hoursDiff);
            return;
        }
    }
    
    // Show loading and generate
    showLoadingState();
    
    // Simulate delay for better UX (optional)
    setTimeout(() => {
        generateKey();
    }, 1500);
}

// Show loading state
function showLoadingState() {
    document.getElementById('initialState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('successState').style.display = 'none';
    document.getElementById('rateLimitState').style.display = 'none';
}

// Show success state
function showSuccessState() {
    document.getElementById('initialState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('successState').style.display = 'block';
    document.getElementById('rateLimitState').style.display = 'none';
}

// Show rate limit state
function showRateLimitState(hoursRemaining) {
    document.getElementById('initialState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('successState').style.display = 'none';
    document.getElementById('rateLimitState').style.display = 'block';
    
    updateRateLimitTimer(hoursRemaining);
}

// Update countdown timer
function updateRateLimitTimer(hoursRemaining) {
    const timerElement = document.getElementById('rateLimitTimer');
    
    const updateTimer = () => {
        if (hoursRemaining <= 0) {
            location.reload();
            return;
        }
        
        const hours = Math.floor(hoursRemaining);
        const minutes = Math.floor((hoursRemaining - hours) * 60);
        const seconds = Math.floor(((hoursRemaining - hours) * 60 - minutes) * 60);
        
        timerElement.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        hoursRemaining -= 1/3600;
    };
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// Generate license key
async function generateKey() {
    try {
        const response = await fetch('/api/public-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: 'Free Trial User',
                key_type: 'TRIAL'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Save to localStorage for rate limiting
            localStorage.setItem('lastKeyGenerated', new Date().toISOString());
            localStorage.setItem('lastGeneratedKey', JSON.stringify(data));
            
            // Display key
            displayGeneratedKey(data);
        } else {
            alert('Error generating key: ' + data.message);
            resetToInitial();
        }
    } catch (error) {
        alert('Error: ' + error.message);
        resetToInitial();
    }
}

// Display generated key
function displayGeneratedKey(data) {
    showSuccessState();
    
    const generatedDate = new Date(data.created_at || new Date());
    const expiryDate = new Date(data.expires_at);
    
    document.getElementById('generatedKeyValue').value = data.license_key;
    document.getElementById('keyGenerated').textContent = generatedDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('keyExpiry').textContent = expiryDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

// Copy key to clipboard - FIXED VERSION
function copyGeneratedKey() {
    const keyInput = document.getElementById('generatedKeyValue');
    const copyBtn = document.getElementById('copyBtn');
    
    // Method 1: Modern Clipboard API (preferred)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(keyInput.value).then(() => {
            showCopySuccess(copyBtn);
        }).catch(() => {
            // Fallback to Method 2
            fallbackCopy(keyInput, copyBtn);
        });
    } else {
        // Method 2: Fallback for older browsers
        fallbackCopy(keyInput, copyBtn);
    }
}

// Fallback copy method
function fallbackCopy(input, button) {
    try {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        
        const successful = document.execCommand('copy');
        
        if (successful) {
            showCopySuccess(button);
        } else {
            showCopyError(button);
        }
    } catch (err) {
        showCopyError(button);
    }
}

// Show copy success feedback
function showCopySuccess(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '✅ Copied!';
    button.style.background = '#10b981';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = '';
    }, 2000);
}

// Show copy error feedback
function showCopyError(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '❌ Failed';
    button.style.background = '#ef4444';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = '';
    }, 2000);
}

// Download key information as text file
function downloadKey() {
    const keyData = localStorage.getItem('lastGeneratedKey');
    if (!keyData) {
        alert('No key data found');
        return;
    }
    
    const data = JSON.parse(keyData);
    const content = `
═══════════════════════════════════════
    LICENSE KEY INFORMATION
═══════════════════════════════════════

License Key: ${data.license_key}

Type: FREE TRIAL
Status: ACTIVE
Max Activations: 1 device

Generated: ${new Date().toLocaleDateString('id-ID')}
Expires: ${new Date(data.expires_at).toLocaleDateString('id-ID')}

═══════════════════════════════════════
IMPORTANT NOTES:
═══════════════════════════════════════
- Keep this key secure and confidential
- Valid for 7 days from generation date
- Can be activated on 1 device only
- For support, visit: ${window.location.origin}

═══════════════════════════════════════
Generated from: ${window.location.origin}
═══════════════════════════════════════
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-key-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Reset to initial state
function resetToInitial() {
    document.getElementById('initialState').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('successState').style.display = 'none';
    document.getElementById('rateLimitState').style.display = 'none';
}

// Reset form
function resetForm() {
    if (confirm('Go back to home page?')) {
        window.location.href = '/';
    }
}

// Go to home
function goHome() {
    window.location.href = '/';
}
