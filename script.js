// DATABASE SYSTEM EMULATION USING LOCALSTORAGE
const STORAGE_KEY = "premium_greetings_data";

function getAllGreetings() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveGreeting(greetingItem) {
    const greetings = getAllGreetings();
    greetings.push(greetingItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(greetings));
}

// SECURE VALIDATION TOKEN UTILITIES
function generateUUID() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 5);
}

function generateSecureToken(id, recipient) {
    // Basic cryptographic tokens emulation hashing method
    let hash = 0;
    const mixStr = id + recipient + "PREMIUM_SECRET_2026";
    for (let i = 0; i < mixStr.length; i++) {
        hash = (hash << 5) - hash + mixStr.charCodeAt(i);
        hash |= 0; 
    }
    return btoa(Math.abs(hash).toString());
}

// CANVAS PARTICLE GRAPHICS SYSTEM
const canvas = document.getElementById('canvas-particles');
const ctx = canvas.getContext('2d');
let particlesArray = [];
let activeEffect = 'luxury-gold';
let systemThemeColor = '#ff2a7f';

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height + canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 1;
        this.alpha = Math.random() * 0.6 + 0.2;
        this.color = systemThemeColor;
    }
    update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        
        if (activeEffect === 'floating-hearts') {
            this.size += 0.01;
        }

        if (this.y < -20 || this.x < -20 || this.x > canvas.width + 20) {
            this.reset();
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        if (activeEffect === 'floating-hearts') {
            // Draw smooth vector heart shape
            ctx.beginPath();
            let d = this.size * 2;
            ctx.moveTo(this.x, this.y);
            ctx.bezierCurveTo(this.x - d/2, this.y - d/2, this.x - d, this.y + d/3, this.x, this.y + d);
            ctx.bezierCurveTo(this.x + d, this.y + d/3, this.x + d/2, this.y - d/2, this.x, this.y);
            ctx.fill();
        } else if (activeEffect === 'neon-stars') {
            // Draw neon stars visual
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Gold Sparkles Dust
            ctx.fillStyle = `rgba(212, 175, 55, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function initParticles() {
    particlesArray = [];
    for(let i = 0; i < 60; i++) {
        particlesArray.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}

// INITIATE ROUTER CORE LOGIC
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    const tokenParam = urlParams.get('token');

    if (idParam) {
        // RECIPIENT DISPLAY ARCHITECTURE MODE
        document.getElementById('recipient-section').classList.remove('hidden');
        initRecipientPage(idParam, tokenParam);
    } else {
        // CONFIGURATOR CREATOR MODE VIEW ACTIVATION
        document.getElementById('creator-section').classList.remove('hidden');
        initParticles();
        animateParticles();
    }
});

// FORM MANAGEMENT HANDLERS
const greetingForm = document.getElementById('greeting-form');
if (greetingForm) {
    greetingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const recipient = document.getElementById('recipient-name').value;
        const id = generateUUID();
        const token = generateSecureToken(id, recipient);

        const newGreeting = {
            id: id,
            token: token,
            sender: document.getElementById('sender-name').value,
            recipient: recipient,
            title: document.getElementById('greeting-title').value,
            message: document.getElementById('greeting-message').value,
            photo: document.getElementById('photo-url').value,
            music: document.getElementById('music-url').value,
            color: document.getElementById('theme-color').value,
            effect: document.getElementById('animation-effect').value,
            views: 0,
            timestamp: new Date().toLocaleString()
        };

        saveGreeting(newGreeting);

        // Render Generated URI
        const currentDomain = window.location.origin + window.location.pathname;
        const targetUrl = `${currentDomain}?id=${newGreeting.id}&token=${newGreeting.token}`;
        
        document.getElementById('generated-link').value = targetUrl;
        document.getElementById('result-modal').classList.remove('hidden');
    });
}

document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    document.getElementById('result-modal').classList.add('hidden');
    greetingForm.reset();
});

document.getElementById('btn-copy')?.addEventListener('click', () => {
    const linkInput = document.getElementById('generated-link');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value);
    
    const copyBtn = document.getElementById('btn-copy');
    copyBtn.innerText = "Tersalin!";
    setTimeout(() => { copyBtn.innerText = "Salin Link"; }, 2000);
});

// RECIPIENT ENGINE HOOKS
function initRecipientPage(id, token) {
    const list = getAllGreetings();
    const currentGreeting = list.find(g => g.id === id);

    // SECURITY CHECKS AND VALIDATIONS
    if (!currentGreeting || currentGreeting.token !== token) {
        document.getElementById('recipient-section').classList.add('hidden');
        document.getElementById('error-section').classList.remove('hidden');
        document.getElementById('premium-loader').style.opacity = '0';
        setTimeout(() => document.getElementById('premium-loader').remove(), 600);
        return;
    }

    // UPDATE DYNAMIC STYLES GLOBALLY VIA INJECTED CONSTANTS
    systemThemeColor = currentGreeting.color;
    activeEffect = currentGreeting.effect;
    document.documentElement.style.setProperty('--theme-color', currentGreeting.color);
    
    // Smooth hex to alpha conversion
    let r = parseInt(systemThemeColor.slice(1,3), 16),
        g = parseInt(systemThemeColor.slice(3,5), 16),
        b = parseInt(systemThemeColor.slice(5,7), 16);
    document.documentElement.style.setProperty('--theme-glow', `rgba(${r}, ${g}, ${b}, 0.35)`);

    // Hydrate Base Fields
    document.getElementById('gate-recipient-name').innerText = currentGreeting.recipient;
    
    // Hide Base Loader Smoothly
    setTimeout(() => {
        const loader = document.getElementById('premium-loader');
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 600);
    }, 1500);

    // Setup Unlock Screen Execution
    document.getElementById('btn-unlock').addEventListener('click', () => {
        // Record statistics hook safely
        incrementViewStat(id);

        // Unlocking Audio Player Pipelines
        const audio = document.getElementById('bg-audio');
        audio.src = currentGreeting.music;
        audio.play().catch(err => console.log("Audio play deferred due to browser sandboxing policies"));

        document.getElementById('gate-overlay').remove();
        runCountdownSequence(currentGreeting);
    });
}

function incrementViewStat(id) {
    const greetings = getAllGreetings();
    const index = greetings.findIndex(g => g.id === id);
    if (index !== -1) {
        greetings[index].views += 1;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(greetings));
    }
}

function runCountdownSequence(data) {
    const overlay = document.getElementById('countdown-overlay');
    const numDisplay = document.getElementById('countdown-number');
    overlay.classList.remove('hidden');
    
    let count = 3;
    initParticles();
    animateParticles();

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numDisplay.innerText = count;
        } else {
            clearInterval(interval);
            overlay.style.transition = "opacity 0.5s ease";
            overlay.style.opacity = "0";
            setTimeout(() => {
                overlay.remove();
                triggerMainShowcase(data);
            }, 500);
        }
    }, 1000);
}

function triggerMainShowcase(data) {
    document.getElementById('main-recipient-content').classList.remove('hidden');
    
    // Set elements data sources
    document.getElementById('display-photo').src = data.photo;
    document.getElementById('display-title').innerText = data.title;
    document.getElementById('display-sender-name').innerText = data.sender;
    
    // Typewriter engine simulation execution
    const targetParagraph = document.getElementById('display-message');
    let messageText = data.message;
    let idx = 0;
    targetParagraph.innerText = "";

    function type() {
        if (idx < messageText.length) {
            targetParagraph.innerText += messageText.charAt(idx);
            idx++;
            setTimeout(type, 45); // Typing speed pace constant
        }
    }
    setTimeout(type, 400);
}
