/**
 * MYTUBE ULTRA - FASA 7: MINI PLAYER ENGINE & TRANSITION STATE
 */

const GOOGLE_CLIENT_ID = "309375289757-lr6vj8d7husgekf5mjgdglka7mau3due.apps.googleusercontent.com";
const API_KEY = 'AIzaSyB7qeOTeXcF53s_mOT6cKewZh3drRjKYy8'; 

let ytPlayer;
let globalVideos = [];
let isLiked = false;
let isSubscribed = false;
let isLoggedIn = false;
let isMiniPlayerActive = false; // Status jejak keadaan mini player
let currentPlayingIndex = -1;   // Menyimpan index video aktif semasa

// Muatkan API YouTube Player
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube Player API sedia.");
};

// INITIALIZE APP & GOOGLE IDENTITY SERVICES
window.onload = function () {
    initGoogleSignInEngine();
    setupAllButtonListeners();
    setupMiniPlayerActionListeners();
    loadVideos(); 
};

// Fungsi memulakan enjin Google Sign-In
function initGoogleSignInEngine() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
        
        google.accounts.id.renderButton(
            document.getElementById("google-login-trigger"),
            { theme: "outline", size: "small", type: "icon", shape: "circle" } 
        );
        
        google.accounts.id.prompt();
    }
}

function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    if (responsePayload && responsePayload.picture) {
        isLoggedIn = true;
        document.getElementById('user-avatar').src = responsePayload.picture;
        document.getElementById('nav-user-avatar').src = responsePayload.picture;
        document.getElementById('user-avatar').style.border = "2px solid #00ff00"; 
        
        document.getElementById('menu-large-avatar').src = responsePayload.picture;
        document.getElementById('menu-user-name').innerText = responsePayload.name;
        document.getElementById('menu-user-email').innerText = responsePayload.email;

        document.getElementById('google-login-trigger').style.display = "none";
        document.getElementById('user-avatar').onclick = () => {
            document.getElementById('user-profile-menu').classList.remove('hidden-profile-menu');
        };
        alert(`Selamat datang, ${responsePayload.name}! Log masuk berjaya.`);
    }
}

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function logoutUserAccount() {
    isLoggedIn = false;
    const defaultAvatar = "https://www.w3schools.com/howto/img_avatar.png";
    document.getElementById('user-avatar').src = defaultAvatar;
    document.getElementById('nav-user-avatar').src = defaultAvatar;
    document.getElementById('user-avatar').style.border = "2px solid #ff0000"; 
    
    document.getElementById('menu-large-avatar').src = defaultAvatar;
    document.getElementById('menu-user-name').innerText = "Tetamu (Guest)";
    document.getElementById('menu-user-email').innerText = "Sila log masuk untuk simpan rekod";

    document.getElementById('google-login-trigger').style.display = "block";
    document.getElementById('user-profile-menu').classList.add('hidden-profile-menu');
    alert("Kau telah berjaya log keluar daripada aplikasi.");
}

// AMBIL DATA VIDEO DARI YOUTUBE DATA API V3
async function loadVideos(query = "") {
    const container = document.getElementById('video-container');
    container.innerHTML = "<p style='padding:20px; color:#aaa;'>Memuatkan video...</p>";

    const baseUrl = "https://www.googleapis.com/youtube/v3/";
    const endpoint = query ? "search" : "videos";
    
    const url = query ? 
        `${baseUrl}${endpoint}?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${API_KEY}` :
        `${baseUrl}${endpoint}?part=snippet&chart=mostPopular&regionCode=MY&maxResults=10&key=${API_KEY}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
            container.innerHTML = `<p style='padding:20px; color:red;'>Ralat API: ${data.error.message}</p>`;
            return;
        }
        globalVideos = data.items || [];
        renderVideoGrid();
    } catch (err) {
        container.innerHTML = "<p style='padding:20px; color:red;'>Ralat Rangkaian.</p>";
    }
}

function renderVideoGrid() {
    const container = document.getElementById('video-container');
    if (!container) return;
    if (globalVideos.length === 0) {
        container.innerHTML = "<p style='padding:20px;'>Tiada video ditemui.</p>";
        return;
    }
    container.innerHTML = globalVideos.map((v, i) => {
        const thumbUrl = v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url;
        return `
            <div class="video-card" onclick="bukaPlayer(${i})">
                <div class="thumbnail-box">
                    <img src="${thumbUrl}" alt="thumbnail">
                </div>
                <h4 class="video-title">${v.snippet.title}</h4>
            </div>
        `;
    }).join('');
}

// BUKA VIDEO PLAYER (SISTEM PERALIHAN LANCAR)
function bukaPlayer(i) {
    const v = globalVideos[i];
    if (!v) return;

    currentPlayingIndex = i;

    // Fasa Bonus: Padam terus Mini Player lama jika ada video baru dipilih
    tutupMiniPlayerEngine();

    let id = (v.id && typeof v.id === 'object') ? v.id.videoId : v.id;
    if (!id && v.snippet?.resourceId) id = v.snippet.resourceId.videoId;

    // Kembalikan elemen Iframe Player ke dalam Kotak Player Skrin Besar
    const mainWrapper = document.getElementById('main-player-wrapper');
    const playerElement = document.getElementById('youtube-api-player');
    mainWrapper.appendChild(playerElement);

    resetButtonStates();
    document.getElementById('video-player-screen').classList.remove('hidden-screen');
    document.getElementById('player-video-title').innerText = v.snippet.title;

    if (!ytPlayer) {
        ytPlayer = new YT.Player('youtube-api-player', {
            height: '100%',
            width: '100%',
            videoId: id,
            playerVars: { 'autoplay': 1, 'controls': 1, 'fs': 1, 'playsinline': 1 },
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    } else {
        ytPlayer.loadVideoById(id);
    }
}

// Jejak perubahan status untuk menukar butang Play/Pause secara automatik
function onPlayerStateChange(event) {
    const playPauseBtn = document.getElementById('mini-btn-play-pause');
    if (event.data == YT.PlayerState.PLAYING) {
        playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;
    } else if (event.data == YT.PlayerState.PAUSED) {
        playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
    }
}

// LOGIK KAWALAN MINI PLAYER ENGINE
function tukarKeMiniPlayer() {
    if (currentPlayingIndex === -1 || !ytPlayer) return;

    const v = globalVideos[currentPlayingIndex];
    
    // 1. Sorok skrin player besar
    document.getElementById('video-player-screen').classList.add('hidden-screen');

    // 2. Isi data tajuk & saluran pada mini player
    document.getElementById('mini-player-title').innerText = v.snippet.title;
    document.getElementById('mini-player-channel').innerText = v.snippet.channelTitle || "Saluran YouTube";

    // 3. Pindahkan fizikal elemen Iframe Player masuk ke dalam slot mini player box
    const miniSlot = document.getElementById('mini-player-click-zone');
    const playerElement = document.getElementById('youtube-api-player');
    miniSlot.appendChild(playerElement);

    // 4. Paparkan kotak mini player terapung
    document.getElementById('mini-player-box').classList.remove('hidden-mini-player');
    isMiniPlayerActive = true;
}

function kembalikanKeMaxPlayer() {
    if (currentPlayingIndex === -1) return;

    // 1. Sorok mini player box
    document.getElementById('mini-player-box').classList.add('hidden-mini-player');
    isMiniPlayerActive = false;

    // 2. Ambil balik elemen Iframe masukkan ke slot asal skrin besar
    const mainWrapper = document.getElementById('main-player-wrapper');
    const playerElement = document.getElementById('youtube-api-player');
    mainWrapper.appendChild(playerElement);

    // 3. Naikkan semula skrin besar
    document.getElementById('video-player-screen').classList.remove('hidden-screen');
}

function tutupMiniPlayerEngine() {
    document.getElementById('mini-player-box').classList.add('hidden-mini-player');
    isMiniPlayerActive = false;
}

function setupMiniPlayerActionListeners() {
    // Klik kawasan teks mini player atau kawasan video untuk besarkan skrin semula
    document.getElementById('mini-expand-trigger').onclick = () => kembalikanKeMaxPlayer();
    
    // Butang main/jeda pantas pada mini player
    document.getElementById('mini-btn-play-pause').onclick = function(e) {
        e.stopPropagation(); // Elakkan tercetusnya trigger klik besarkan skrin
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;

        const state = ytPlayer.getPlayerState();
        if (state == YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
            this.innerHTML = `<i class="fas fa-play"></i>`;
        } else {
            ytPlayer.playVideo();
            this.innerHTML = `<i class="fas fa-pause"></i>`;
        }
    };

    // Butang X tutup mini player sepenuhnya
    document.getElementById('mini-btn-close').onclick = function(e) {
        e.stopPropagation();
        tutupMiniPlayerEngine();
        if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
        currentPlayingIndex = -1;
    };
}

// LOGIK KAWALAN BUTANG INTERAKTIF UI ASAL
function setupAllButtonListeners() {
    document.getElementById('search-submit-btn').onclick = () => {
        const queryValue = document.getElementById('search-input').value;
        if(queryValue.trim() !== "") loadVideos(queryValue);
    };

    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim() !== "") loadVideos(this.value);
    });

    const catButtons = document.querySelectorAll('.category-bar .cat-btn');
    catButtons.forEach(btn => {
        btn.onclick = function() {
            catButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const topic = this.getAttribute('data-topic');
            loadVideos(topic === "Semua" || topic === "Trending" ? "" : topic);
        };
    });

    document.getElementById('close-profile-btn').onclick = () => {
        document.getElementById('user-profile-menu').classList.add('hidden-profile-menu');
    };
    
    document.getElementById('btn-logout-google').onclick = () => logoutUserAccount();

    const navItems = document.querySelectorAll('.bottom-nav .nav-item:not(.add-button)');
    navItems.forEach(item => {
        item.onclick = function() {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            const container = document.getElementById('video-container');
            
            if (page === "utama") {
                loadVideos("");
            } else if (page === "anda") {
                if (isLoggedIn) {
                    document.getElementById('user-profile-menu').classList.remove('hidden-profile-menu');
                } else {
                    alert("Sila klik imej profil di atas kanan untuk log masuk dahulu.");
                }
            } else {
                container.innerHTML = `<div style="padding:40px; text-align:center; color:#aaa;">
                    <i class="fas fa-folder-open" style="font-size:30px; margin-bottom:10px;"></i>
                    <p>Halaman ${page.toUpperCase()} sedang dibangunkan.</p>
                </div>`;
            }
        };
    });

    document.getElementById('btn-tambah-video').onclick = () => alert("Fungsi memuat naik Video/Shorts akan datang!");
    document.getElementById('btn-menu').onclick = () => alert("Menu Sisi dibuka.");
    document.getElementById('btn-logo').onclick = () => loadVideos("");
    document.getElementById('btn-cast').onclick = () => alert("Mencari peranti paparan skrin (Screencast)...");
    document.getElementById('btn-notification').onclick = () => alert("Tiada pemberitahuan baharu buat masa ini.");

    // KEMAS KINI BUTANG MINIMIZE: Tukar kepada fungsi mini player terapung
    document.getElementById('minimize-player-btn').onclick = () => {
        tukarKeMiniPlayer();
    };

    // Butang tutup X di skrin besar akan terus matikan video sepenuhnya
    document.getElementById('close-player-btn').onclick = () => {
        document.getElementById('video-player-screen').classList.add('hidden-screen');
        if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
        currentPlayingIndex = -1;
    };

    document.getElementById('btn-sertai').onclick = () => alert("Terima kasih! Fungsi 'Sertai' keahlian saluran akan dibuka tidak lama lagi.");

    document.getElementById('btn-subscribe').onclick = function() {
        isSubscribed = !isSubscribed;
        this.innerHTML = isSubscribed ? `<i class="fas fa-check"></i> Telah Dilanggan` : `<i class="fas fa-bell"></i> Langgan`;
        this.style.backgroundColor = isSubscribed ? "#3f3f3f" : "#cc0000";
    };

    document.getElementById('btn-like').onclick = function() {
        isLiked = !isLiked;
        this.innerHTML = isLiked ? `<i class="fas fa-thumbs-up"></i> 14,001` : `<i class="fas fa-thumbs-up"></i> 14K`;
        this.style.backgroundColor = isLiked ? "#0056b3" : "#272727";
    };

    document.getElementById('btn-kongsi').onclick = () => alert("Pautan video telah berjaya disalin!");
}

function resetButtonStates() {
    isLiked = false;
    isSubscribed = false;
    document.getElementById('btn-like').innerHTML = `<i class="fas fa-thumbs-up"></i> 14K`;
    document.getElementById('btn-like').style.backgroundColor = "#272727";
    document.getElementById('btn-subscribe').innerHTML = `<i class="fas fa-bell"></i> Langgan`;
    document.getElementById('btn-subscribe').style.backgroundColor = "#cc0000";
}
