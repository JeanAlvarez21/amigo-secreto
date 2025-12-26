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
                <span> 🎅 ${name}</span>
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

        // Algoritmo de emparejamiento aleatorio verdadero (Derangement)
        // Garantiza: nadie se regala a sí mismo + asignación completamente aleatoria

        let matches = [];
        let attempts = 0;
        const maxAttempts = 1000; // Prevenir bucle infinito

        while (attempts < maxAttempts) {
            attempts++;
            matches = [];

            // Crear lista de receptores disponibles (copia mezclada)
            let receivers = [...participants];

            // Mezclar varias veces para más aleatoriedad
            for (let round = 0; round < 3; round++) {
                for (let i = receivers.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
                }
            }

            let valid = true;
            let usedReceivers = new Set();

            // Asignar aleatoriamente cada giver a un receiver disponible
            for (let i = 0; i < participants.length; i++) {
                const giver = participants[i];

                // Buscar un receiver válido (no es el mismo giver, no está usado)
                let receiverIndex = -1;
                for (let j = 0; j < receivers.length; j++) {
                    if (receivers[j] !== giver && !usedReceivers.has(receivers[j])) {
                        receiverIndex = j;
                        break;
                    }
                }

                // Si no encontramos receptor válido, reintentar todo
                if (receiverIndex === -1) {
                    valid = false;
                    break;
                }

                const receiver = receivers[receiverIndex];
                usedReceivers.add(receiver);
                receivers.splice(receiverIndex, 1);
                matches.push({ giver, receiver });
            }

            // Si todos tienen asignación válida, salir del bucle
            if (valid && matches.length === participants.length) {
                console.log(`✅ Sorteo completado en ${attempts} intento(s)`);
                break;
            }
        }

        // Verificación final: mezclar el orden de los matches para más aleatoriedad en la visualización
        for (let i = matches.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [matches[i], matches[j]] = [matches[j], matches[i]];
        }

        saveMatches(matches);
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
                        duration: 8000,
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
        audio.src = "Arcangel - Jingle Bell, Jingle Bell, Jingle Madafaka (Video Oficial).mp3";
        audio.volume = 0.3;
        audio.currentTime = 20; // Start at 0:35

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

        // Confetti lento y suave - una sola fase gradual
        for (let i = 0; i < 50; i++) {
            // Crear con delay escalonado para efecto más natural
            setTimeout(() => {
                const conf = document.createElement('div');
                conf.classList.add('confetti');
                conf.style.left = Math.random() * 100 + 'vw';
                conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                conf.style.animationDuration = (Math.random() * 4 + 6) + 's'; // Lento: 6s a 10s
                conf.style.opacity = '0.8';
                document.body.appendChild(conf);

                // Eliminar después de terminar
                setTimeout(() => conf.remove(), 30000);
            }, i * 80); // Espaciado de 80ms entre cada pieza
        }
    }

    window.handleEnter = (e) => {
        if (e.key === 'Enter') addParticipant();
    }

    // Run Global Effects
    createSnow();
    initMusic();

    // --- CERTIFICATE LOGIC ---
    const paramsBtn = document.getElementById('params-btn');
    const descInput = document.getElementById('desc-words');
    const loadingState = document.getElementById('loading-state');
    const stepForm = document.getElementById('step-form');
    const certModal = document.getElementById('certificate-modal');

    // Cert Elements
    const certAttributes = document.getElementById('cert-attributes'); // The 3 words
    const certName = document.getElementById('cert-name'); // Recipient
    const certDescription = document.getElementById('cert-description'); // AI Text

    if (paramsBtn) {
        paramsBtn.addEventListener('click', async () => {
            const words = descInput.value.trim();
            if (!words) {
                alert("¡Escribe algo! Al menos una palabra describiendo a tu amigo.");
                return;
            }

            // Validar maximo 3 palabras (aprox)
            const wordCount = words.split(/\s+/).length;
            if (wordCount > 5) { // Allow a bit of flexibility, but prompt asked for 3
                alert("Trata de ser conciso (máximo 3 palabras).");
                return;
            }

            // UI Loading
            stepForm.classList.add('hidden');
            loadingState.classList.remove('hidden');

            const recipient = document.getElementById('match-name').textContent;

            try {
                const description = await generateDescription(recipient, words);

                // Fill Certificate
                certAttributes.textContent = words.toUpperCase();
                certName.textContent = recipient;
                certDescription.textContent = `"${description}"`;

                // Show Modal
                certModal.classList.remove('hidden');

                // Confetti again!
                triggerConfetti();

            } catch (error) {
                console.warn("API Error, switching to local fallback:", error);

                // FALLBACK: Usamos generador local si la API falla
                const fallbackText = generateLocalDescription(recipient, words);

                certAttributes.textContent = words.toUpperCase();
                certName.textContent = recipient;
                certDescription.textContent = `"${fallbackText}"`;

                // No mostramos alerta de error al usuario para no cortar la experiencia ("Magic trick")
                certModal.classList.remove('hidden');
                triggerConfetti();

            } finally {
                loadingState.classList.add('hidden');
                stepForm.classList.remove('hidden'); // Reset for if they close and retry
            }
        });
    }

    // Gemini API Call via Secure Backend Proxy
    async function generateDescription(name, traits) {
        console.log("Conectando a API segura...");

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, traits })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error ${response.status}`);
        }

        const data = await response.json();

        if (!data.description) {
            throw new Error("La API no devolvió descripción");
        }

        return data.description;
    }

    // --- GENERADOR LOCAL AVANZADO (FALLBACK) ---
    // Si la API falla, usamos esto. Tunea esto para que parezca "Inteligente".
    function generateLocalDescription(name, words) {
        const traits = words.split(/[ ,]+/).filter(w => w.length > 2);
        const trait = traits.length > 0 ? traits[Math.floor(Math.random() * traits.length)] : "único"; // Palabra clave del usuario

        // Plantillas Categorizadas para variar el "Sarcasmo"
        const templates = [
            // Pasivo Agresivo
            `Por su impresionante capacidad de ser ${trait} y creer que nadie se da cuenta.`,
            `Por llevar el concepto de ser ${trait} a niveles que la ciencia no puede explicar.`,
            `Por hacer que ser ${trait} parezca un deporte olímpico (y ganar el oro).`,
            `Por esa vibra de ${trait} que, honestamente, ya es parte de su marca personal.`,

            // Sarcasmo Puro
            `¿${trait}? Sí, claro. Digamos que es su "talento especial".`,
            `Reconocimiento por intentar no ser ${trait} este año (y fallar estrepitosamente).`,
            `Por ser consistentemente ${trait} incluso en días festivos. ¡Qué dedicación!`,

            // Absurdo
            `Por sobrevivir 2024 siendo tan ${trait} sin recibir una sola multa.`,
            `Porque el horóscopo dijo que este año sería ${trait} y vaya que cumplió.`,
            `Por convertir ser ${trait} en todo un estilo de vida.`,

            // Específicos Navideños
            `Por pedir regalo cuando lo único que ofreció fue ser ${trait}.`,
            `Por ser ${trait}, incluso más que el Grinch en lunes por la mañana.`
        ];

        return templates[Math.floor(Math.random() * templates.length)];
    }

    // Print & Close & Regenerate & PDF Download
    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });

    // Descargar PDF
    document.getElementById('download-pdf-btn').addEventListener('click', async () => {
        const element = document.getElementById('printable-cert');
        const recipientName = document.getElementById('cert-name').textContent || 'Certificado';

        // Mostrar feedback
        const btn = document.getElementById('download-pdf-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
        btn.disabled = true;

        // Guardar estilos originales
        const originalStyles = element.style.cssText;

        // Aplicar estilos temporales para maximizar el tamaño
        element.style.width = '10.5in';
        element.style.height = '8in';
        element.style.maxWidth = 'none';
        element.style.maxHeight = 'none';
        element.style.margin = '0';

        // Pequeña espera para que los estilos se apliquen
        await new Promise(resolve => setTimeout(resolve, 100));

        const opt = {
            margin: 0.25,
            filename: `Certificado_${recipientName.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: {
                unit: 'in',
                format: 'letter',
                orientation: 'landscape'
            }
        };

        try {
            await html2pdf().set(opt).from(element).save();
        } finally {
            // Restaurar estilos originales
            element.style.cssText = originalStyles;
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('close-cert').addEventListener('click', () => {
        certModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    });

    // Variables para guardar el estado actual (para regenerar)
    let currentRecipient = '';
    let currentWords = '';

    // Guardar estado cuando se genera (conectar al flujo principal)
    const originalParamsClick = paramsBtn?.onclick;
    if (paramsBtn) {
        // Guardamos recipient y words antes de generar
        const origListener = paramsBtn.cloneNode(true);
        paramsBtn.addEventListener('click', () => {
            currentRecipient = document.getElementById('match-name').textContent;
            currentWords = descInput.value.trim();
        }, true); // capture phase, runs first
    }

    document.getElementById('regen-btn').addEventListener('click', async () => {
        if (!currentRecipient || !currentWords) {
            currentRecipient = document.getElementById('match-name').textContent;
            currentWords = descInput.value.trim() || 'único';
        }

        const regenBtn = document.getElementById('regen-btn');
        regenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        regenBtn.disabled = true;

        try {
            const newDescription = await generateDescription(currentRecipient, currentWords);
            certDescription.textContent = `"${newDescription}"`;
        } catch (error) {
            console.warn("Regen error:", error);
            const fallbackText = generateLocalDescription(currentRecipient, currentWords);
            certDescription.textContent = `"${fallbackText}"`;
        } finally {
            regenBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Regenerar';
            regenBtn.disabled = false;
        }
    });

    // Cambiar Etiquetas - volver al formulario de entrada
    document.getElementById('edit-tags-btn').addEventListener('click', () => {
        certModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        // Enfocar el input de palabras para que el usuario edite
        descInput.focus();
    });

    // Añadir clase modal-open cuando se muestra el certificado
    const originalCertShow = () => {
        document.body.classList.add('modal-open');
    };

    // Observar cuando el modal se muestra
    const certObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                if (!certModal.classList.contains('hidden')) {
                    document.body.classList.add('modal-open');
                }
            }
        });
    });
    certObserver.observe(certModal, { attributes: true });

});
