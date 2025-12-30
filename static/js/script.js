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

// Copy Key Function - PROFESSIONAL VERSION
function copyKey() {
    const keyInput = document.getElementById('keyValue');
    const keyValue = keyInput.value;
    
    // Method 1: Modern Clipboard API (for HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(keyValue)
            .then(() => {
                showProfessionalNotification('License key copied successfully!', 'success');
            })
            .catch(() => {
                fallbackCopyMethod(keyInput);
            });
    } else {
        fallbackCopyMethod(keyInput);
    }
}

// Fallback copy method
function fallbackCopyMethod(input) {
    try {
        input.focus();
        input.select();
        input.setSelectionRange(0, 99999);
        
        const successful = document.execCommand('copy');
        
        if (successful) {
            showProfessionalNotification('License key copied successfully!', 'success');
        } else {
            showProfessionalNotification('Please select and copy manually', 'error');
        }
        
        window.getSelection().removeAllRanges();
    } catch (err) {
        showProfessionalNotification('Please select and copy manually', 'error');
    }
}

// Professional notification system - Fixed positioning
function showProfessionalNotification(message, type = 'success') {
    // Remove existing notification
    const existing = document.querySelector('.professional-toast');
    if (existing) {
        existing.remove();
    }
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `professional-toast toast-${type}`;
    
    const icon = type === 'success' ? 
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' :
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
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

// ==================== CONTACT ADMIN MODAL ====================

function showContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('contactModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}
