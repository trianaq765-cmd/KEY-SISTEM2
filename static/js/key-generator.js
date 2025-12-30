let userName = '';
let mathAnswer = 0;

function submitName(event) {
    event.preventDefault();
    userName = document.getElementById('user_name').value.trim();
    
    if (userName.length < 3) {
        alert('Name must be at least 3 characters');
        return;
    }
    
    checkRateLimit();
}

async function checkRateLimit() {
    const lastGenerated = localStorage.getItem('lastKeyGenerated');
    
    if (lastGenerated) {
        const lastDate = new Date(lastGenerated);
        const now = new Date();
        const hoursDiff = (now - lastDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            showRateLimitWarning(24 - hoursDiff);
            return;
        }
    }
    
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
}

function showRateLimitWarning(hoursRemaining) {
    document.querySelector('.get-key-box').style.display = 'none';
    document.getElementById('rateLimitWarning').style.display = 'block';
    
    updateRateLimitTimer(hoursRemaining);
}

function updateRateLimitTimer(hoursRemaining) {
    const timerElement = document.getElementById('rateLimitTimer');
    
    setInterval(() => {
        const hours = Math.floor(hoursRemaining);
        const minutes = Math.floor((hoursRemaining - hours) * 60);
        const seconds = Math.floor(((hoursRemaining - hours) * 60 - minutes) * 60);
        
        timerElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        hoursRemaining -= 1/3600;
        
        if (hoursRemaining <= 0) location.reload();
    }, 1000);
}

function completeVerification(method) {
    if (method === 'captcha') {
        showCaptcha();
    } else if (method === 'wait') {
        showTimer();
    }
}

function showCaptcha() {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    mathAnswer = num1 + num2;
    
    document.getElementById('mathProblem').textContent = `${num1} + ${num2} = ?`;
    document.getElementById('captchaModal').style.display = 'flex';
}

function checkCaptcha() {
    const userAnswer = parseInt(document.getElementById('captchaAnswer').value);
    
    if (userAnswer === mathAnswer) {
        closeCaptcha();
        generateKey();
    } else {
        alert('Wrong answer! Try again.');
        document.getElementById('captchaAnswer').value = '';
    }
}

function closeCaptcha() {
    document.getElementById('captchaModal').style.display = 'none';
    document.getElementById('captchaAnswer').value = '';
}

function showTimer() {
    document.getElementById('timerModal').style.display = 'flex';
    let timeLeft = 10;
    
    const interval = setInterval(() => {
        timeLeft--;
        document.getElementById('timerDisplay').textContent = timeLeft;
        document.getElementById('countdown').textContent = timeLeft;
        
        const progress = ((10 - timeLeft) / 10) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            document.getElementById('timerModal').style.display = 'none';
            generateKey();
        }
    }, 1000);
}

async function generateKey() {
    try {
        const response = await fetch('/api/public-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: userName,
                key_type: 'TRIAL'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('lastKeyGenerated', new Date().toISOString());
            displayGeneratedKey(data);
        } else {
            alert('Error generating key: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function displayGeneratedKey(data) {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
    
    document.getElementById('generatedKeyValue').value = data.license_key;
    document.getElementById('keyUserName').textContent = userName;
    document.getElementById('keyExpiry').textContent = new Date(data.expires_at).toLocaleDateString();
}

function copyGeneratedKey() {
    const keyInput = document.getElementById('generatedKeyValue');
    keyInput.select();
    document.execCommand('copy');
    alert('✅ License key copied to clipboard!');
}

function resetForm() {
    if (confirm('Are you sure? You can only generate 1 key per day.')) {
        location.reload();
    }
}
