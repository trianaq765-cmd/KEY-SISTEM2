from flask import Flask, render_template, request, jsonify, session
import secrets
import hashlib
import json
import os
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Configuration
ADMIN_USERNAME = os.environ.get('ADMIN_USER', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASS', 'admin123')
DB_FILE = 'database/keys.json'

# Ensure database directory exists
os.makedirs('database', exist_ok=True)

def load_keys():
    """Load keys from JSON database"""
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {'keys': []}
    return {'keys': []}

def save_keys(data):
    """Save keys to JSON database"""
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def generate_license_key(prefix="DEV"):
    """Generate a unique license key"""
    random_part = secrets.token_hex(12).upper()
    key = f"{prefix}-{random_part[:4]}-{random_part[4:8]}-{random_part[8:12]}-{random_part[12:16]}"
    return key

def hash_key(key):
    """Hash the license key for secure storage"""
    return hashlib.sha256(key.encode()).hexdigest()

def login_required(f):
    """Decorator to protect admin routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/admin')
def admin():
    """Admin panel"""
    if not session.get('logged_in'):
        return render_template('admin.html', logged_in=False)
    return render_template('admin.html', logged_in=True)

@app.route('/verify')
def verify_page():
    """Verification page"""
    return render_template('verify.html')

@app.route('/get-key')
def get_key_page():
    """Public key generation page"""
    return render_template('get-key.html')

@app.route('/api/login', methods=['POST'])
def login():
    """Admin login"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['logged_in'] = True
        return jsonify({'success': True, 'message': 'Login successful'})
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    """Admin logout"""
    session.pop('logged_in', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/generate', methods=['POST'])
@login_required
def generate_key():
    """Generate new license key (Admin only)"""
    data = request.json
    customer_name = data.get('customer_name', 'Unknown')
    duration_days = int(data.get('duration_days', 30))
    key_type = data.get('key_type', 'STANDARD')
    
    license_key = generate_license_key(prefix=key_type[:3].upper())
    now = datetime.now()
    
    key_data = {
        'key': license_key,
        'key_hash': hash_key(license_key),
        'customer_name': customer_name,
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(days=duration_days)).isoformat(),
        'duration_days': duration_days,
        'key_type': key_type,
        'status': 'active',
        'activations': 0,
        'max_activations': int(data.get('max_activations', 1)),
        'public_generated': False
    }
    
    db = load_keys()
    db['keys'].append(key_data)
    save_keys(db)
    
    return jsonify({
        'success': True,
        'license_key': license_key,
        'created_at': key_data['created_at'],
        'expires_at': key_data['expires_at']
    })

@app.route('/api/public-generate', methods=['POST'])
def public_generate_key():
    """Public API to generate trial keys"""
    data = request.json
    customer_name = data.get('customer_name', 'Free Trial User')
    
    # Generate trial key (7 days, 1 activation)
    license_key = generate_license_key(prefix="TRL")
    now = datetime.now()
    
    key_data = {
        'key': license_key,
        'key_hash': hash_key(license_key),
        'customer_name': customer_name,
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(days=7)).isoformat(),
        'duration_days': 7,
        'key_type': 'TRIAL',
        'status': 'active',
        'activations': 0,
        'max_activations': 1,
        'public_generated': True
    }
    
    db = load_keys()
    db['keys'].append(key_data)
    save_keys(db)
    
    return jsonify({
        'success': True,
        'license_key': license_key,
        'created_at': key_data['created_at'],
        'expires_at': key_data['expires_at']
    })

@app.route('/api/verify', methods=['POST'])
def verify_key():
    """Verify license key"""
    data = request.json
    license_key = data.get('license_key', '').strip()
    
    if not license_key:
        return jsonify({'valid': False, 'message': 'License key is required'}), 400
    
    db = load_keys()
    key_hash = hash_key(license_key)
    
    for key_data in db['keys']:
        if key_data['key_hash'] == key_hash:
            # Check expiration
            expires_at = datetime.fromisoformat(key_data['expires_at'])
            if datetime.now() > expires_at:
                return jsonify({
                    'valid': False,
                    'message': 'License key has expired',
                    'expired': True
                })
            
            # Check status
            if key_data['status'] != 'active':
                return jsonify({
                    'valid': False,
                    'message': 'License key is deactivated'
                })
            
            # Check activations
            if key_data['activations'] >= key_data['max_activations']:
                return jsonify({
                    'valid': False,
                    'message': 'Maximum activations reached'
                })
            
            return jsonify({
                'valid': True,
                'message': 'License key is valid',
                'customer_name': key_data['customer_name'],
                'key_type': key_data['key_type'],
                'expires_at': key_data['expires_at'],
                'activations': key_data['activations'],
                'max_activations': key_data['max_activations']
            })
    
    return jsonify({'valid': False, 'message': 'Invalid license key'}), 404

@app.route('/api/activate', methods=['POST'])
def activate_key():
    """Activate license key"""
    data = request.json
    license_key = data.get('license_key', '').strip()
    
    db = load_keys()
    key_hash = hash_key(license_key)
    
    for key_data in db['keys']:
        if key_data['key_hash'] == key_hash:
            if key_data['activations'] < key_data['max_activations']:
                key_data['activations'] += 1
                save_keys(db)
                return jsonify({
                    'success': True,
                    'message': 'License activated successfully',
                    'activations': key_data['activations']
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Maximum activations reached'
                }), 400
    
    return jsonify({'success': False, 'message': 'Invalid license key'}), 404

@app.route('/api/keys', methods=['GET'])
@login_required
def get_keys():
    """Get all license keys"""
    db = load_keys()
    
    # Don't send the actual keys, only masked version
    safe_keys = []
    for key in db['keys']:
        safe_key = key.copy()
        safe_key['key'] = safe_key['key'][:8] + '****'
        safe_keys.append(safe_key)
    
    return jsonify({'keys': safe_keys})

@app.route('/api/keys/<key_hash>', methods=['DELETE'])
@login_required
def delete_key(key_hash):
    """Delete a license key"""
    db = load_keys()
    db['keys'] = [k for k in db['keys'] if k['key_hash'] != key_hash]
    save_keys(db)
    return jsonify({'success': True, 'message': 'Key deleted successfully'})

@app.route('/api/keys/<key_hash>/toggle', methods=['POST'])
@login_required
def toggle_key(key_hash):
    """Toggle key status (active/inactive)"""
    db = load_keys()
    for key in db['keys']:
        if key['key_hash'] == key_hash:
            key['status'] = 'inactive' if key['status'] == 'active' else 'active'
            save_keys(db)
            return jsonify({'success': True, 'status': key['status']})
    
    return jsonify({'success': False, 'message': 'Key not found'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
