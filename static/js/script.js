// ==================== ADMIN PANEL FUNCTIONS ====================

// Login Function
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageDiv.className = 'message success';
            messageDiv.textContent = 'Login successful! Redirecting...';
            setTimeout(() => window.location.reload(), 1000);
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Error: ' + error.message;
    }
}

// Logout Function
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/admin';
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
}

// Generate Key Function (Admin)
async function generateKey(event) {
    event.preventDefault();
    
    const formData = {
        customer_name: document.getElementById('customer_name').value,
        key_type: document.getElementById('key_type').value,
        duration_days: document.getElementById('duration_days').value,
        max_activations: document.getElementById('max_activations').value
    };
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            const keyDisplay = document.getElementById('generatedKey');
            const keyValue = document.getElementById('keyValue');
            const keyInfo = document.getElementById('keyInfo');
            
            keyValue.value = data.license_key;
            keyInfo.textContent = `Expires: ${new Date(data.expires_at).toLocaleDateString()}`;
            keyDisplay.style.display = 'block';
            
            document.getElementById('generateForm').reset();
            loadKeys();
        }
    } catch (error) {
        alert('Error generating key: ' + error.message);
    }
}

// Copy Key Function - FIXED WITH MULTIPLE METHODS
function copyKey() {
    const keyInput = document.getElementById('keyValue');
    const keyValue = keyInput.value;
    
    // Method 1: Modern Clipboard API (for HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(keyValue)
            .then(() => {
                showCopyNotification('✅ License key copied to clipboard!', 'success');
            })
            .catch(() => {
                // Fallback to Method 2
                fallbackCopyMethod(keyInput);
            });
    } else {
        // Method 2: Fallback for HTTP or older browsers
        fallbackCopyMethod(keyInput);
    }
}

// Fallback copy method using execCommand
function fallbackCopyMethod(input) {
    try {
        // Focus the input
        input.focus();
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        
        // Execute copy command
        const successful = document.execCommand('copy');
        
        if (successful) {
            showCopyNotification('✅ License key copied to clipboard!', 'success');
        } else {
            showCopyNotification('❌ Copy failed. Please select and copy manually.', 'error');
        }
        
        // Remove selection
        window.getSelection().removeAllRanges();
    } catch (err) {
        console.error('Copy failed:', err);
        showCopyNotification('❌ Copy failed. Please select and copy manually.', 'error');
    }
}

// Show copy notification
function showCopyNotification(message, type = 'success') {
    // Remove existing notification
    const existing = document.querySelector('.copy-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
        font-size: 0.95rem;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Load All Keys
async function loadKeys() {
    try {
        const response = await fetch('/api/keys');
        const data = await response.json();
        
        const tableContainer = document.getElementById('keysTable');
        
        if (data.keys.length === 0) {
            tableContainer.innerHTML = '<p class="loading">No license keys found</p>';
            return;
        }
        
        let tableHTML = `
            <div class="keys-table">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>License Key</th>
                            <th>Type</th>
                            <th>Created</th>
                            <th>Expires</th>
                            <th>Activations</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.keys.forEach(key => {
            const createdDate = new Date(key.created_at).toLocaleDateString();
            const expiresDate = new Date(key.expires_at).toLocaleDateString();
            const statusClass = key.status === 'active' ? 'status-active' : 'status-inactive';
            
            tableHTML += `
                <tr>
                    <td>${key.customer_name}</td>
                    <td><code>${key.key}</code></td>
                    <td><span class="status-badge">${key.key_type}</span></td>
                    <td>${createdDate}</td>
                    <td>${expiresDate}</td>
                    <td>${key.activations}/${key.max_activations}</td>
                    <td><span class="status-badge ${statusClass}">${key.status}</span></td>
                    <td>
                        <button class="btn btn-warning" onclick="toggleKey('${key.key_hash}')" style="padding: 0.4rem 0.8rem; margin-right: 0.5rem;">
                            ${key.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="btn btn-danger" onclick="deleteKey('${key.key_hash}')" style="padding: 0.4rem 0.8rem;">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table></div>';
        tableContainer.innerHTML = tableHTML;
    } catch (error) {
        console.error('Error loading keys:', error);
    }
}

// Toggle Key Status
async function toggleKey(keyHash) {
    if (!confirm('Are you sure you want to toggle this key status?')) return;
    
    try {
        const response = await fetch(`/api/keys/${keyHash}/toggle`, { method: 'POST' });
        const data = await response.json();
        if (data.success) loadKeys();
    } catch (error) {
        alert('Error toggling key: ' + error.message);
    }
}

// Delete Key
async function deleteKey(keyHash) {
    if (!confirm('Are you sure you want to delete this key? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/keys/${keyHash}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) loadKeys();
    } catch (error) {
        alert('Error deleting key: ' + error.message);
    }
}

// ==================== VERIFY KEY FUNCTIONS ====================

// Verify Key Function
async function verifyKey(event) {
    event.preventDefault();
    
    const licenseKey = document.getElementById('license_key').value;
    const resultDiv = document.getElementById('verifyResult');
    
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: licenseKey })
        });
        
        const data = await response.json();
        resultDiv.style.display = 'block';
        
        if (data.valid) {
            resultDiv.className = 'verify-result valid';
            resultDiv.innerHTML = `
                <h3>✅ Valid License Key</h3>
                <div class="info-grid">
                    <div class="info-row">
                        <strong>Customer:</strong>
                        <span>${data.customer_name}</span>
                    </div>
                    <div class="info-row">
                        <strong>Type:</strong>
                        <span>${data.key_type}</span>
                    </div>
                    <div class="info-row">
                        <strong>Expires:</strong>
                        <span>${new Date(data.expires_at).toLocaleDateString()}</span>
                    </div>
                    <div class="info-row">
                        <strong>Activations:</strong>
                        <span>${data.activations}/${data.max_activations}</span>
                    </div>
                </div>
            `;
        } else {
            resultDiv.className = 'verify-result invalid';
            resultDiv.innerHTML = `<h3>❌ Invalid License Key</h3><p>${data.message}</p>`;
        }
    } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.className = 'verify-result invalid';
        resultDiv.innerHTML = `<h3>❌ Error</h3><p>${error.message}</p>`;
    }
}

// ==================== ANIMATIONS ====================

// Add notification animations to DOM
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        @media (max-width: 768px) {
            .copy-notification {
                left: 10px !important;
                right: 10px !important;
                top: 10px !important;
            }
        }
    `;
    document.head.appendChild(style);
}
