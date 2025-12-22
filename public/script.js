document.addEventListener('DOMContentLoaded', () => {
    // State
    let participants = [];
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // DOM Elements
    const setupView = document.getElementById('setup-view');
    const revealView = document.getElementById('reveal-view');
    const errorView = document.getElementById('error-view');
    const nameInput = document.getElementById('name-input');
    const addBtn = document.getElementById('add-btn');
    const participantsList = document.getElementById('participants-list');
    const drawBtn = document.getElementById('draw-btn');
    const resultsArea = document.getElementById('results-area');
    const linksList = document.getElementById('links-list');

    // Init Logic
    // Init Logic
    loadState(); // Restore state from localStorage

    if (token) {
        initRevealMode(token);
    } else {
        // If we have matches saved, show them directly
        const savedMatches = localStorage.getItem('as_matches');
        if (savedMatches) {
            setupView.classList.remove('hidden'); // Ensure setup is visible as base
            initSetupMode(); // Initialize listeners
            displayLinks(JSON.parse(savedMatches)); // Jump to results
        } else {
            initSetupMode();
        }
    }

    // --- SETUP MODE FUNCTIONS ---
    function initSetupMode() {
        setupView.classList.remove('hidden');

        addBtn.addEventListener('click', addParticipant);
        drawBtn.addEventListener('click', performDraw);
    }

    function addParticipant() {
        const name = nameInput.value.trim();
        if (!name) return;

        if (participants.includes(name)) {
            alert('¡Ese nombre ya existe!');
            return;
        }

        participants.push(name);
        saveState(); // Save to local storage
        renderParticipants();
        nameInput.value = '';
        updateDrawButton();
    }

    function renderParticipants() {
        participantsList.innerHTML = '';
        participants.forEach((name, index) => {
            const li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = `
                <span>Example Avatar 🎅 ${name}</span>
                <button class="remove-btn" onclick="removeParticipant(${index})">&times;</button>
            `;
            participantsList.appendChild(li);
        });
    }

    window.removeParticipant = (index) => {
        participants.splice(index, 1);
        saveState(); // Save to local storage
        renderParticipants();
        updateDrawButton();
    };

    function updateDrawButton() {
        drawBtn.disabled = participants.length < 3;
    }

    function performDraw() {
        if (participants.length < 3) return;

        // Simple shuffle and match
        let shuffled = [...participants];
        // Fisher-Yates shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Validate no one has themselves
        let matches = [];
        for (let i = 0; i < shuffled.length; i++) {
            let giver = shuffled[i];
            let receiver = shuffled[(i + 1) % shuffled.length];
            matches.push({ giver, receiver });
        }

        saveMatches(matches); // Persist matches
        displayLinks(matches);
    }

    function displayLinks(matches) {
        resultsArea.classList.remove('hidden');
        linksList.innerHTML = '';
        drawBtn.classList.add('hidden'); // Hide draw button to prevent re-draws easily

        matches.forEach(match => {
            const token = generateToken(match);
            const link = `${window.location.origin}${window.location.pathname}?token=${token}`;
            const encodedMsg = encodeURIComponent(`Hola ${match.giver}! 🎄\nAquí tienes tu link para descubrir tu Amigo Secreto:\n${link}\n\n¡No le digas a nadie! 🤫`);
            const waLink = `https://wa.me/?text=${encodedMsg}`;

            const li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = `
                <span>Para <strong>${match.giver}</strong></span>
                <div class="link-actions">
                    <a href="${waLink}" target="_blank" class="btn-whatsapp" title="Enviar por WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                    <button class="btn-copy" onclick="copyLink('${link}')" title="Copiar Link">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
            linksList.appendChild(li);
        });
    }

    // --- PERSISTENCE ---
    function saveState() {
        localStorage.setItem('as_participants', JSON.stringify(participants));
    }

    function loadState() {
        const saved = localStorage.getItem('as_participants');
        if (saved) {
            participants = JSON.parse(saved);
            renderParticipants();
            updateDrawButton();
        }
    }

    function saveMatches(matches) {
        localStorage.setItem('as_matches', JSON.stringify(matches));
    }

    // Add clear data button for testing/reset
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.classList.remove('hidden');
        resetBtn.addEventListener('click', () => {
            if (confirm('¿Seguro que quieres borrar todo y empezar de cero?')) {
                localStorage.removeItem('as_participants');
                localStorage.removeItem('as_matches');
                location.reload();
            }
        });
    }

    window.copyLink = (text, btnElement) => {
        // If btnElement is not passed (e.g. from easier call), try to find the button or just do the action
        // But our HTML generation passes copyLink('url') currently. We need to update the HTML generation to pass 'this'
        // Actually, let's just make it simple. We can't easily pass 'this' in the template string without escaping.
        // Let's use event.target.closest('button')

        navigator.clipboard.writeText(text).then(() => {
            const btn = event.target.closest('button');
            const originalHTML = btn.innerHTML;

            btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
            btn.classList.add('copied');

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        });
    };

    // --- TOKEN LOGIC ---
    function generateToken(matchData) {
        // matchData = { giver: "A", receiver: "B" }
        // Simple Base64 encoding for now. 
        // In reality, this is obfuscation, not strong encryption, but sufficient for this casual use case.
        // We add a timestamp to make it dynamic slightly (optional)
        const payload = JSON.stringify(matchData);
        return btoa(payload);
    }

    function decodeToken(token) {
        try {
            const payload = atob(token);
            return JSON.parse(payload);
        } catch (e) {
            return null;
        }
    }

    // --- REVEAL MODE FUNCTIONS ---
    function initRevealMode(token) {
        const data = decodeToken(token);
        if (!data || !data.giver || !data.receiver) {
            errorView.classList.remove('hidden');
            return;
        }

        // HIDE ADMIN INTERFACE
        setupView.classList.add('hidden'); // CRITICAL FIX: Hide setup view
        resultsArea.classList.add('hidden'); // Also hide results if they were somehow visible

        revealView.classList.remove('hidden');
        document.getElementById('recipient-greeting').textContent = `¡Hola ${data.giver}! 🎄`;
        document.getElementById('match-name').textContent = data.receiver;

        // Initialize hover animation
        const floatAnim = anime({
            targets: '#gift-box',
            translateY: [0, -10],
            rotate: [0, 5, 0, -5, 0],
            duration: 2000,
            loop: true,
            easing: 'easeInOutSine'
        });

        document.getElementById('reveal-btn').addEventListener('click', () => {
            const giftBox = document.getElementById('gift-box');
            const finalReveal = document.getElementById('final-reveal');

            // STOP CSS ANIMATION to prevent jitter
            giftBox.style.animation = 'none';
            floatAnim.pause(); // Stop the anime.js loop

            // ANIMATION WITH ANIME.JS
            anime({
                targets: '.lid', // Now contains the bow
                translateY: [-5, -200],
                translateX: [0, 50],
                rotate: [0, 45],
                opacity: 0,
                duration: 800,
                easing: 'easeOutExpo'
            });

            anime({
                targets: '.box',
                scale: 1.1,
                translateY: 50,
                duration: 500,
                easing: 'easeOutQuad',
                complete: () => {
                    // Show overlay with fade in
                    finalReveal.classList.remove('hidden');
                    anime({
                        targets: '.reveal-content',
                        scale: [0, 1],
                        opacity: [0, 1],
                        duration: 800,
                        easing: 'spring(1, 80, 10, 0)'
                    });
                    triggerConfetti();
                }
            });
        });
    }

    // --- FESTIVE EFFECTS (GLOBAL) ---
    function createSnow() {
        const snowContainer = document.getElementById('snow-container');
        // Added circles (●) and festive colors for 'bolitas'
        const shapes = ['❄', '❅', '❆', '•', '●', '★'];
        const colors = ['#FFF', '#FFF', '#FFF', '#f8b229', '#d42426']; // White, Gold, Red

        setInterval(() => {
            if (document.hidden) return; // Save resources
            const flake = document.createElement('div');
            flake.classList.add('snowflake');

            // Random shape
            flake.textContent = shapes[Math.floor(Math.random() * shapes.length)];

            // Random color (mostly white but some ornaments)
            if (Math.random() > 0.8) {
                flake.style.color = colors[Math.floor(Math.random() * colors.length)];
                if (flake.textContent === '●') flake.style.fontSize = '15px'; // Bigger balls
            }

            flake.style.left = Math.random() * 100 + 'vw';

            // Randomize size and speed
            const duration = Math.random() * 3 + 3; // Slower fall (3-6s)
            flake.style.fontSize = (Math.random() * 10 + 10) + 'px';
            flake.style.opacity = Math.random();
            flake.style.animationDuration = duration + 's';

            snowContainer.appendChild(flake);

            setTimeout(() => { flake.remove(); }, duration * 1000);
        }, 80); // Much faster spawning (was 200)
    }

    // --- MUSIC PLAYER ---
    function initMusic() {
        const musicPlayer = document.querySelector('.music-player');
        const audio = document.getElementById('bg-music');
        const musicStatus = document.getElementById('music-status');

        let isPlaying = false;

        // Local Audio Source
        // Use encodeURIComponent for filenames with spaces/special characters
        audio.src = "Michael Bublé - It's Beginning To Look A Lot Like Christmas [Official HD Audio].mp3";
        audio.volume = 0.5;
        audio.currentTime = 35; // Start at 0:35

        const updateUI = (playing) => {
            if (playing) {
                musicStatus.innerHTML = '<i class="fas fa-pause"></i> Pausa';
                musicPlayer.classList.add('playing');
            } else {
                musicStatus.innerHTML = '<i class="fas fa-play"></i> Play';
                musicPlayer.classList.remove('playing');
            }
        };

        const playMusic = () => {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isPlaying = true;
                    updateUI(true);
                }).catch(error => {
                    console.log("Autoplay prevented:", error);
                    // Standard browser behavior: we can't force it without interaction.
                    // But the user didn't want the modal, so we just stay in "Paused" state
                    // until they click the widget.
                });
            }
        };

        // Try to play immediately (might be blocked)
        playMusic();

        // Toggle Button Action
        musicPlayer.addEventListener('click', () => {
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
                updateUI(false);
            } else {
                playMusic();
            }
        });
    }

    function triggerConfetti() {
        const colors = ['#d42426', '#165b33', '#f8b229', '#ffffff'];
        for (let i = 0; i < 100; i++) {
            const conf = document.createElement('div');
            conf.classList.add('confetti');
            conf.style.left = Math.random() * 100 + 'vw';
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
            document.body.appendChild(conf);
        }
    }

    window.handleEnter = (e) => {
        if (e.key === 'Enter') addParticipant();
    }

    // Run Global Effects
    createSnow();
    initMusic();

});
