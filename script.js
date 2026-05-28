/**
 * MYTUBE STREAMER ENGINE - INTEGRATED WITH YOUTUBE DATA API V3
 */

const GOOGLE_CLIENT_ID = "309375289757-lr6vj8d7husgekf5mjgdglka7mau3due.apps.googleusercontent.com";
// API KEY yang kau bekalkan untuk tarik data real-time
const API_KEY = 'AIzaSyB7qeOTeXcF53s_mOT6cKewZh3drRjKYy8'; 

let ytPlayer = null;
let isLiked = false;
let isSubscribed = false;
let isLoggedIn = false;
let currentPlayingVideoId = "";
let fetchedVideos = [];

// Sandaran (Fallback Data) sekiranya kuota API Key tamat atau ralat jaringan
const backupVideos = [
    {
        id: "pXhTshZ6g_I",
        title: "[EPISOD PENUH] LEMANG SI BUJANG SEPAH (Jep, Mamat, & Shuib) | THROWBACK TELEMOVIE GEMPAK RAYA",
        channel: "TV3Malaysia Official",
        views: "4.1J tontonan",
        time: "7 tahun lalu",
        duration: "1:12:23",
        thumb: "https://images.unsplash.com/photo-1534080391025-497996894002?w=500&q=80",
        channelPfp: "https://api.dicebear.com/7.x/identicon/svg?seed=tv3"
    },
    {
        id: "vX2cDW899pY",
        title: "Gandingan Shuk & Elly Mazlein buat penonton tak berhenti gelak! | #ASK2018",
        channel: "TV3Malaysia Official",
        views: "890K tontonan",
        time: "2 hari lalu",
        duration: "7:23",
        thumb: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80",
        channelPfp: "https://api.dicebear.com/7.x/identicon/svg?seed=tv3"
    }
];

const mockShorts = [
    { title: "Goku Ultra Instinct Mode 🔥", views: "1.2M tontonan", img: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80" },
    { title: "Cute Meow Meow Dance 🐱", views: "3.4M tontonan", img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80" },
    { title: "Gojo Satoru Domain Expansion ⚡", views: "2.7M tontonan", img: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80" }
];

// === COIN WALLET CONTROL ===
let currentCoins = parseInt(localStorage.getItem('shared_coins')) || 0;

function updateCoinDashboard() {
    localStorage.setItem('shared_coins', currentCoins); 
    const coinDisplay = document.getElementById('coin-balance');
    const rmDisplay = document.getElementById('rm-balance');
    
    if (coinDisplay) coinDisplay.innerHTML = `<i class="fa-solid fa-star"></i> ${currentCoins.toLocaleString()} COIN`;
    if (rmDisplay) {
        let estRM = currentCoins / 1000;
        rmDisplay.innerText = `Anggaran: RM ${estRM.toFixed(2)}`;
    }
}

function popRewardAlert(message) {
    const alertBox = document.getElementById('task-alert');
    if (alertBox) {
        alertBox.innerText = message;
        alertBox.style.display = 'block';
        setTimeout(() => { alertBox.style.display = 'none'; }, 2500);
    }
}

// === INITIALIZATION ===
window.onload = function () {
    fetchYouTubeVideos(); // Fungsi baru menarik data menggunakan API Key kau
    renderShortsGrid();
    updateCoinDashboard();
    setupButtonActions();
    initGoogleSignInEngine();
    updateProfileMenuUI();
};

// MENGGUNAKAN API KEY UNTUK TARIK VIDEO POPULAR DARI YOUTUBE DATA API
async function fetchYouTubeVideos() {
    const container = document.getElementById('video-container');
    if (!container) return;

    // Menarik senarai video paling trending/popular (Region: MY)
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=MY&maxResults=5&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            fetchedVideos = data.items.map(item => {
                // Penukaran format durasi ISO 8601 (Contoh: PT1M30S -> 1:30)
                let duration = item.contentDetails.duration.replace('PT', '').replace('H', ':').replace('M', ':').replace('S', '');
                
                return {
                    id: item.id,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    views: parseInt(item.statistics.viewCount).toLocaleString() + " tontonan",
                    time: "Terkini",
                    duration: duration || "Video",
                    thumb: item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.medium.url,
                    channelPfp: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.snippet.channelTitle)}`
                };
            });
            renderMainVideos(fetchedVideos);
        } else {
            // Jika API tiada data, gunakan backup data
            fetchedVideos = backupVideos;
            renderMainVideos(fetchedVideos);
        }
    } catch (error) {
        console.error("Ralat YouTube API: Menggunakan data sandaran.", error);
        fetchedVideos = backupVideos;
        renderMainVideos(fetchedVideos);
    }
}

function renderMainVideos(videosList) {
    const container = document.getElementById('video-container');
    if (!container) return;
    
    container.innerHTML = videosList.map((v, i) => `
        <div class="v-card" onclick="bukaPlayerAction(${i})">
            <div class="thumb-holder">
                <img src="${v.thumb}" alt="thumbnail">
                <span class="duration-badge">${v.duration}</span>
                ${i === 0 ? '<span class="live-badge">🔴 Live</span>' : ''}
            </div>
            <div class="v-meta">
                <img src="${v.channelPfp}" class="ch-pfp">
                <div class="v-text">
                    <h4 class="v-title">${v.title}</h4>
                    <p class="v-subtext">${v.channel} • ${v.views}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderShortsGrid() {
    const container = document.getElementById('shorts-container');
    if (!container) return;
    
    container.innerHTML = mockShorts.map(s => `
        <div class="s-card" onclick="alert('Misi Shorts: Tonton video Shorts selama 15 saat untuk claim token ganjaran!')">
            <img src="${s.img}" alt="shorts">
            <div class="s-overlay">
                <h4 class="s-title">${s.title}</h4>
                <span class="s-views">${s.views}</span>
            </div>
        </div>
    `).join('');
}

// === INTEGRASI API YOUTUBE IFRAME ===
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

function onYouTubeIframeAPIReady() {
    // Sediakan pemain asas menggunakan ID pertama daripada senarai video
    setTimeout(() => {
        const startId = (fetchedVideos.length > 0) ? fetchedVideos[0].id : "pXhTshZ6g_I";
        ytPlayer = new YT.Player('youtube-api-player', {
            height: '100%',
            width: '100%',
            videoId: startId, 
            playerVars: { 
                'autoplay': 0, 
                'controls': 1, 
                'playsinline': 1, 
                'rel': 0, 
                'modestbranding': 1   
            }
        });
    }, 800);
}

function bukaPlayerAction(index) {
    const data = fetchedVideos[index];
    if (!data) return;

    currentPlayingVideoId = data.id;
    resetTaskButtons();

    document.getElementById('video-player-screen').classList.remove('hidden-screen');
    document.getElementById('player-video-title').innerText = data.title;

    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
        ytPlayer.loadVideoById({
            videoId: data.id,
            startSeconds: 0
        });
    } else {
        setTimeout(() => {
            if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
                ytPlayer.loadVideoById(data.id);
            }
        }, 300);
    }
}

function hidePlayerScreen() {
    document.getElementById('video-player-screen').classList.add('hidden-screen');
}

function stopVideoSaja() {
    hidePlayerScreen();
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
}

function showMainPage() {
    hidePlayerScreen();
}

// === ACTION BUTTON LOGIC ===
function setupButtonActions() {
    document.getElementById('btn-subscribe').onclick = function() {
        if (!isSubscribed) {
            currentCoins += 500;
            updateCoinDashboard();
            popRewardAlert("🎉 Task Sukses! +500 COIN dimasukkan ke Wallet!");
            this.innerHTML = `<i class="fas fa-check"></i> Telah Dilanggan (Selesai ✓)`;
            this.style.backgroundColor = "#222";
            this.style.color = "#00cc66";
            isSubscribed = true;
        }
    };

    document.getElementById('btn-like').onclick = function() {
        isLiked = !isLiked;
        this.innerHTML = isLiked ? `<i class="fas fa-thumbs-up" style="color:#00ff00;"></i> 14,001` : `<i class="fas fa-thumbs-up"></i> 14K`;
        this.style.backgroundColor = isLiked ? "#002211" : "#222";
    };
}

function resetTaskButtons() {
    isSubscribed = false;
    isLiked = false;
    const subBtn = document.getElementById('btn-subscribe');
    subBtn.innerHTML = `🔴 SUBSCRIBE CHANNEL & CLAIM 500 COIN`;
    subBtn.style.backgroundColor = "#cc0000";
    subBtn.style.color = "#fff";
}

// === AUTHENTICATION PROFILE CONTROL ===
function initGoogleSignInEngine() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleLoginResponse
        });
    }
}

function updateProfileMenuUI() {
    const actionArea = document.getElementById('profile-action-area');
    if (!actionArea) return;

    if (isLoggedIn) {
        actionArea.innerHTML = `<button class="btn-logout-custom" onclick="logoutUserAccount()">Log Keluar</button>`;
    } else {
        actionArea.innerHTML = `<div id="google-modal-btn"></div>`;
        setTimeout(() => {
            if (typeof google !== 'undefined' && document.getElementById('google-modal-btn')) {
                google.accounts.id.renderButton(
                    document.getElementById("google-modal-btn"),
                    { theme: "dark", size: "large", type: "standard", text: "signin_with" }
                );
            }
        }, 100);
    }
}

function handleGoogleLoginResponse(res) {
    const payload = JSON.parse(atob(res.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    isLoggedIn = true;
    
    document.getElementById('user-avatar').src = payload.picture;
    document.getElementById('nav-user-avatar').src = payload.picture;
    document.getElementById('menu-large-avatar').src = payload.picture;
    document.getElementById('menu-user-name').innerText = payload.name;
    document.getElementById('menu-user-email').innerText = payload.email;
    
    updateProfileMenuUI();
    toggleProfileMenu();
    popRewardAlert(`Selamat Datang, ${payload.name}!`);
}

function toggleProfileMenu() {
    document.getElementById('user-profile-menu').classList.toggle('hidden-screen');
}

function logoutUserAccount() {
    isLoggedIn = false;
    const def = "https://www.w3schools.com/howto/img_avatar.png";
    
    document.getElementById('user-avatar').src = def;
    document.getElementById('nav-user-avatar').src = def;
    document.getElementById('menu-large-avatar').src = def;
    document.getElementById('menu-user-name').innerText = "Tetamu (Guest)";
    document.getElementById('menu-user-email').innerText = "Sila log masuk untuk simpan rekod";
    
    updateProfileMenuUI();
    toggleProfileMenu();
    alert("Berjaya log keluar.");
}
