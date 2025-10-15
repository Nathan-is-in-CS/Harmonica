/**
 * Harmonica - Main JavaScript
 * Author: Harmonica Team
 * Description: Core functionality for music learning platform with Web Audio API
 */

// ===================================
// Hamburger Menu Toggle (Responsive Nav)
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        // Toggle menu on button click
        navToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            
            // Toggle states
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('open');
            
            console.log('Menu toggled:', navMenu.classList.contains('active'));
        });
        
        // Close menu when clicking a nav link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.classList.remove('open');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.classList.remove('open');
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.classList.remove('open');
                navToggle.focus();
            }
        });
    }
});

// ===================================
// Audio Context Setup
// ===================================
let audioContext = null;

/**
 * Initialize or resume audio context
 * Must be called after user interaction due to browser autoplay policies
 */
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/**
 * Play a musical note with given frequency and duration
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds (default: 0.8)
 * @param {string} waveType - Oscillator wave type: 'sine', 'square', 'triangle', 'sawtooth'
 */
function playNote(frequency, duration = 0.8, waveType = 'sine') {
    const ctx = initAudioContext();
    
    // Create oscillator for the tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Connect nodes: oscillator -> gain -> destination
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Configure oscillator
    oscillator.frequency.value = frequency;
    oscillator.type = waveType;
    
    // Configure envelope (ADSR-like)
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay/Release
    
    // Start and stop oscillator
    oscillator.start(now);
    oscillator.stop(now + duration);
}

/**
 * Calculate frequency for a given note and octave
 * Uses equal temperament tuning (A4 = 440 Hz)
 * @param {string} note - Note name (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
 * @param {number} octave - Octave number (default: 4)
 * @returns {number} Frequency in Hz
 */
function getNoteFrequency(note, octave = 4) {
    const noteMap = {
        'C': 0, 'C#': 1, 'Db': 1,
        'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4,
        'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8,
        'A': 9, 'A#': 10, 'Bb': 10,
        'B': 11
    };
    
    const noteNumber = noteMap[note];
    if (noteNumber === undefined) {
        console.error(`Invalid note: ${note}`);
        return 440; // Return A4 as fallback
    }
    
    // Calculate frequency using formula: f = 440 * 2^((n-49)/12)
    // where n is the number of semitones from C0
    const semitonesFromA4 = (octave - 4) * 12 + (noteNumber - 9);
    return 440 * Math.pow(2, semitonesFromA4 / 12);
}

/**
 * Play a chord (multiple notes simultaneously)
 * @param {Array<string>} notes - Array of note names
 * @param {number} octave - Octave number
 * @param {number} duration - Duration in seconds
 */
function playChord(notes, octave = 4, duration = 1.0) {
    notes.forEach(note => {
        playNote(getNoteFrequency(note, octave), duration);
    });
}

// ===================================
// Smooth Scroll Enhancement
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===================================
// Active Navigation Link Highlighting
// ===================================
function updateActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', updateActiveNavLink);

// ===================================
// Intersection Observer for Animations
// ===================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.instrument-card, .feature');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});