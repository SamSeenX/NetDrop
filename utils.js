// Basic random name generator
const ADJECTIVES = ['Neon', 'Crimson', 'Azure', 'Silent', 'Swift', 'Cosmic', 'Digital', 'Ghost', 'Silver', 'Electric'];
const ANIMALS = ['Fox', 'Eagle', 'Bear', 'Wolf', 'Tiger', 'Panda', 'Falcon', 'Orbit', 'Ray', 'Spark'];
const ICONS = ['🦊', '🦅', '🐻', '🐺', '🐯', '🐼', '🦅', '🌑', '⚡', '✨'];

export function generateIdentity() {
    const rand = Math.floor(Math.random() * ADJECTIVES.length);
    const rand2 = Math.floor(Math.random() * ANIMALS.length);
    return {
        name: `${ADJECTIVES[rand]} ${ANIMALS[rand2]}`,
        icon: ICONS[rand2]
    };
}

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Simple hash for grouping IPs (Client-side obfuscation only)
export async function hashString(str) {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12); // Short hash
}
