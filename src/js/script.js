const modal = document.getElementById("modal");
const modalOpen = document.getElementById("addBtn");
const modalClose = document.getElementsByClassName("close")[0];
const baseApiUrl = "http://informatica.iesalbarregas.com:7008/";
const apiUrl = `${baseApiUrl}songs`;
const uploadUrl = `${baseApiUrl}upload`;
const songsTableBody = document.querySelector("#songs tbody");
const musicPlayer = document.getElementById("music-player");
const playPauseButton = document.getElementById("playPauseButton");
const pauseButton = document.getElementById("pauseButton");
const currentSongTitle = document.getElementById("currentSongTitle");
const currentSongArtist = document.getElementById("currentSongArtist");
const songCover = document.getElementById("song-cover");
const progressBar = document.getElementById("progress-bar");
const totalTimeDisplay = document.getElementById("totalTime");
const volumeBar = document.getElementById("volume-bar");
const previousButton = document.querySelector(".bx-skip-previous");
const nextButton = document.querySelector(".bx-skip-next");
const songContainer = document.getElementById("songs-content");
const repeatButton = document.querySelector(".bx-repeat");
const shuffleButton = document.querySelector(".bx-shuffle");
const fileSong = document.getElementById("file-song");
const fileImage = document.getElementById("image-song");

// Variables globales para el reproductor
let audio = new Audio();
let playing = false; // Estado de reproducción
let currentSongIndex = -1; // Índice de la canción actual
let songsList = []; // Lista de canciones cargadas
let isRepeatActive = false; // Estado de repetición
let isShuffleActive = false;

// Variables para controlar el arrastre de la barra de progreso
let isDragging = false;
let currentView = "all"; // Vista actual, puede ser "all" o "favorites"
let favoriteSongsList = []; // Lista de canciones favoritas

// Abrir y cerrar el modal
modalOpen.onclick = function () {
    modal.style.display = "block";
};

modalClose.onclick = function () {
    modal.style.display = "none";
};

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

fileSong.addEventListener("change", () => {
    fileSong.style.color = "#171717";
});

fileImage.addEventListener("change", () => {
    fileImage.style.color = "#171717";
});

// Manejo del formulario para subir canciones
document.getElementById("songForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevenir envío del formulario
    let isValid = true;

    // Limpiar mensajes de error
    document.querySelectorAll(".error-message").forEach(msg => (msg.textContent = ""));

    // Validar archivo de canción
    const fileSong = document.getElementById("file-song").files[0];
    if (!fileSong || !fileSong.name.endsWith(".mp3")) {
        document.getElementById("error-file-song").textContent = "La canción debe ser un archivo MP3.";
        isValid = false;
    }

    // Validar título
    const titleSong = document.getElementById("title-song").value.trim();
    if (!/^\p{L}[\p{L}\s]{0,19}$/u.test(titleSong)) {
        document.getElementById("error-title-song").textContent = "El título debe contener solo letras y espacios, máximo 20 caracteres.";
        isValid = false;
    }

    // Validar autor
    const authorSong = document.getElementById("author-song").value.trim();
    if (!/^\p{L}[\p{L}\s]{0,19}$/u.test(authorSong)) {
        document.getElementById("error-author-song").textContent = "El autor debe contener solo letras y espacios, máximo 20 caracteres.";
        isValid = false;
    }

    // Validar imagen de portada
    const imageSong = document.getElementById("image-song").files[0];
    if (!imageSong || !(imageSong.name.endsWith(".png") || imageSong.name.endsWith(".jpg"))) {
        document.getElementById("error-image-song").textContent = "La imagen debe ser un archivo PNG o JPG.";
        isValid = false;
    }

    // Si todo es válido, enviar a la API
    if (isValid) {
        const formData = new FormData(document.getElementById("songForm"));
        fetch(uploadUrl, {
                method: "POST",
                body: formData,
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error subiendo la canción: " + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                alert("Canción subida con éxito: " + data.message);
                modal.style.display = "none";

                songsList.push(data.result); // Agregar nueva canción a la lista
                addSongToContainer(data.result); // Añadir la nueva canción al contenedor

            })
            .catch(error => {
                alert("Ocurrió un error al intentar subir la canción.");
            });
    }
});

// Función para formatear la duración en minutos y segundos
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Función para obtener la duración usando <audio>
function getAudioDuration(audioUrl) {
    return new Promise((resolve) => {
        const audioElement = new Audio(audioUrl);
        audioElement.addEventListener("loadedmetadata", () => {
            resolve(audioElement.duration);
        });
    });
}

// Función para actualizar las listas activas
function updateActiveSongsList() {
    const favorites = getFavoritesFromLocalStorage();
    favoriteSongsList = songsList.filter(song => favorites.includes(song.filepath));
}

// Reproducir una canción por índice, manejando casos fuera de los límites
function playSongByIndex(index) {
    const activeList = currentView === "favorites" ? favoriteSongsList : songsList;

    // Manejar índices fuera de rango
    if (index < 0) {
        currentSongIndex = activeList.length - 1; // Ir a la última canción
    } else if (index >= activeList.length) {
        currentSongIndex = isShuffleActive ? 0 : activeList.length - 1; // Ir a la primera canción si es aleatorio
    } else {
        currentSongIndex = index;
    }

    // Reproducir la canción seleccionada
    const song = activeList[currentSongIndex];
    playSong(song);
}

// Reproducir la siguiente canción
function playNextSong() {
    const activeList = currentView === "favorites" ? favoriteSongsList : songsList;

    if (isShuffleActive) {
        // Cambiar a una canción aleatoria diferente si el modo aleatorio está activado
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * activeList.length);
        } while (activeList.length > 1 && newIndex === currentSongIndex);

        currentSongIndex = newIndex;
    } else {
        currentSongIndex++;
    }

    // Asegurarse de que el índice esté dentro de los límites
    if (currentSongIndex >= activeList.length) {
        currentSongIndex = 0; // Volver al inicio
    }

    playSongByIndex(currentSongIndex);
}

// Reproducir la canción anterior
function playPreviousSong() {
    const activeList = currentView === "favorites" ? favoriteSongsList : songsList;

    if (isShuffleActive) {
        // Cambiar a canción aleatoria si el modo aleatorio está activado
        currentSongIndex = Math.floor(Math.random() * activeList.length);
    } else if (currentSongIndex > 0) {
        currentSongIndex--;
        playSongByIndex(currentSongIndex);
    }
}

// Ajustar la inicialización de `audio` para evitar agregar múltiples listeners
audio.addEventListener("timeupdate", () => {
    if (!isDragging) {
        progressBar.value = audio.currentTime;
        document.getElementById("currentTime").textContent = formatDuration(audio.currentTime);
    }
});

audio.addEventListener("pause", () => {
    togglePlayPauseIcons(false);
    playing = false;
});

// Reproducir la canción siguiente o ir a la primera canción si estamos al final
audio.addEventListener("ended", () => {
    if (isRepeatActive) {
        audio.currentTime = 0; // Reiniciar canción
        audio.play(); // Reproducir de nuevo
        updatePlayPauseIcon(true); // Mantener el icono de pausa
    } else {
        playing = false;
        togglePlayPauseIcons(false);

        if (isShuffleActive) {
            playRandomSong(); // Cambia a canción aleatoria si shuffle está activado
        } else {
            // Si estamos en la última canción, ir a la primera
            if (currentSongIndex < songsList.length - 1) {
                playSongByIndex(currentSongIndex + 1);
            } else {
                playSongByIndex(0); // Ir a la primera canción si estamos al final
            }
        }
    }
});

// Función para manejar la reproducción de canciones
function playSong(song) {
    if (audio.src === song.filepath) {
        if (playing) {
            audio.pause();
            playing = false;
            togglePlayPauseIcons(false); // Cambiar a play
        } else {
            audio.play();
            playing = true;
            togglePlayPauseIcons(true); // Cambiar a pause
        }
    } else {
        if (songCover.firstChild) {
            songCover.removeChild(songCover.firstChild);
        }

        audio.src = song.filepath;
        currentSongTitle.textContent = song.title;
        currentSongArtist.textContent = song.artist;

        const coverImage = document.createElement("img");
        coverImage.src = song.cover;
        songCover.appendChild(coverImage);

        audio.play();
        playing = true;

        getAudioDuration(song.filepath).then((duration) => {
            totalTimeDisplay.textContent = formatDuration(duration);
            progressBar.max = duration;
        });

        updatePlayPauseIcon(true); // Activa la pausa cuando la canción comienza
    }

    updatePlayPauseIcon(playing); // Actualizar icono de reproducción/pausa

    // Actualizar la clase "playing" después de reproducir
    const songCards = document.querySelectorAll(".song-card");
    songCards.forEach(card => card.classList.remove("playing"));

    const activeList = currentView === "favorites" ? favoriteSongsList : songsList;
    const activeIndex = activeList.findIndex(s => s.filepath === song.filepath);

    if (songCards[activeIndex]) {
        songCards[activeIndex].classList.add("playing");
    }
}

function updatePlayPauseIcon(isPlaying) {
    if (isPlaying) {
        playPauseButton.classList.replace("bx-play-circle", "bx-pause-circle");
        pauseButton.textContent = "PAUSE";
    } else {
        playPauseButton.classList.replace("bx-pause-circle", "bx-play-circle");
        pauseButton.textContent = "PLAY";
    }
}

// Función para cambiar las clases de los iconos en lugar de reemplazar el contenido
function togglePlayPauseIcons(isPlaying) {
    if (isPlaying) {
        playPauseButton.classList.replace("bx-play-circle", "bx-pause-circle");
        pauseButton.textContent = "PAUSE";
    } else {
        playPauseButton.classList.replace("bx-pause-circle", "bx-play-circle");
        pauseButton.textContent = "PLAY";
    }
}

// Activar/desactivar repetición
repeatButton.addEventListener("click", () => {
    isRepeatActive = !isRepeatActive; // Cambiar el estado de repetición

    if (isRepeatActive) {
        isShuffleActive = false; // Desactivar el modo aleatorio
        shuffleButton.style.color = ""; // Restaurar color original del shuffle
        repeatButton.style.color = "#1db954"; // Cambiar a verde el botón de repetir
    } else {
        repeatButton.style.color = ""; // Restaurar color original
    }
});

// Eventos de control de reproducción/pausa
playPauseButton.addEventListener("click", () => {
    if (audio.src) {
        if (playing) {
            audio.pause();
        } else {
            audio.play();
        }
        playing = !playing;
        togglePlayPauseIcons(playing);
    } else {
        alert("No hay ninguna canción activa para reproducir.");
    }
});

pauseButton.addEventListener("click", () => {
    if (audio.src) { // Verifica si hay una canción cargada
        if (playing) {
            audio.pause(); // Pausa la reproducción
            playing = false;
            togglePlayPauseIcons(false); // Actualiza el icono a "play"
        } else {
            audio.play(); // Reanuda la reproducción
            playing = true;
            togglePlayPauseIcons(true); // Actualiza el icono a "pause"
        }
    } else {
        alert("No hay ninguna canción activa para pausar o reproducir.");
    }
});

// Navegación de canciones
previousButton.addEventListener("click", () => {
    if (currentSongIndex > 0) {
        playSongByIndex(currentSongIndex - 1);
    }
});

// Activar/desactivar modo aleatorio
shuffleButton.addEventListener("click", () => {
    isShuffleActive = !isShuffleActive; // Cambiar el estado de aleatorio

    if (isShuffleActive) {
        isRepeatActive = false; // Desactivar la repetición
        repeatButton.style.color = ""; // Restaurar color original del repeat
        shuffleButton.style.color = "#1db954"; // Cambiar a verde el botón de shuffle
    } else {
        shuffleButton.style.color = ""; // Restaurar color original
    }
});

// Reproducir siguiente canción aleatoria
function playRandomSong() {
    if (isShuffleActive) {
        currentSongIndex = Math.floor(Math.random() * songsList.length);
        playSongByIndex(currentSongIndex);
    } else {
        if (currentSongIndex < songsList.length - 1) {
            playSongByIndex(currentSongIndex + 1);
        }
    }
}

// Reproducir canción siguiente o aleatoria dependiendo del estado de shuffle
nextButton.addEventListener("click", () => {
    playNextSong();
});

// Barra de progreso - Iniciar arrastre
progressBar.addEventListener("mousedown", (event) => {
    isDragging = true;
    updateProgressBar(event);
});

// Actualizar posición del progreso mientras se arrastra
document.addEventListener("mousemove", (event) => {
    if (isDragging) {
        updateProgressBar(event);
    }
});

// Finalizar arrastre
document.addEventListener("mouseup", () => {
    if (isDragging) {
        isDragging = false;
    }
});

// Función para actualizar la posición del progreso
function updateProgressBar(event) {
    const progressBarRect = progressBar.getBoundingClientRect();
    const clickPosition = event.clientX - progressBarRect.left;
    const newTime = (clickPosition / progressBarRect.width) * audio.duration;

    if (newTime >= 0 && newTime <= audio.duration) {
        audio.currentTime = newTime;
        progressBar.value = newTime;
        document.getElementById("currentTime").textContent = formatDuration(newTime);
    }
}

// Control de volumen
volumeBar.addEventListener("input", (event) => {
    const volume = event.target.value / 100;
    audio.volume = volume;

    // Cambiar los íconos de acuerdo al nivel de volumen
    if (volume === 0) {
        volumeBar.previousElementSibling.classList.replace('bxs-volume-low', 'bxs-volume-mute');
        volumeBar.previousElementSibling.classList.replace('bxs-volume-full', 'bxs-volume-mute');
    } else if (volume > 0 && volume < 1) {
        volumeBar.previousElementSibling.classList.replace('bxs-volume-full', 'bxs-volume-mute');
        volumeBar.previousElementSibling.classList.replace('bxs-volume-mute', 'bxs-volume-low');
    } else if (volume === 1) {
        volumeBar.previousElementSibling.classList.replace('bxs-volume-mute', 'bxs-volume-low');
        volumeBar.previousElementSibling.classList.replace('bxs-volume-low', 'bxs-volume-full');
    }
});

volumeBar.addEventListener('input', function () {
    const value = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.setProperty('--volumeBar', `${value}%`);
});

// Fetch de las canciones
fetch(apiUrl)
    .then((response) => {
        if (!response.ok) {
            throw new Error("Error fetching songs: " + response.statusText);
        }
        return response.json();
    })
    .then((songs) => {
        songsList = songs;
        songs.forEach((song) => {
            addSongToContainer(song);
        });
    })
    .catch((error) => console.error("Error loading songs:", error));

function addSongToContainer(song) {
    const songCard = document.createElement("div");
    songCard.classList.add("song-card");

    const playIcon = document.createElement("i");
    playIcon.className = "bx bx-play";

    const title = document.createElement("span");
    title.textContent = song.title;

    const artist = document.createElement("span");
    artist.textContent = song.artist;

    const duration = document.createElement("span");
    if (song.filepath) {
        getAudioDuration(song.filepath).then((time) => {
            duration.textContent = formatDuration(time);
        });
    }

    const favoriteIcon = document.createElement("i");
    favoriteIcon.className = "bx bx-heart"; // Icono inicial
    const favorites = getFavoritesFromLocalStorage();

    // Actualizar el icono si es favorito
    if (favorites.includes(song.filepath)) {
        favoriteIcon.classList.replace("bx-heart", "bxs-heart");
    }

    // Evento para marcar/desmarcar como favorito
    favoriteIcon.addEventListener("click", (e) => {
        e.stopPropagation(); // Evita que se dispare el clic en el contenedor
        const favorites = getFavoritesFromLocalStorage();

        if (favorites.includes(song.filepath)) {
            // Quitar de favoritos
            favoriteIcon.classList.replace("bxs-heart", "bx-heart");
            const index = favorites.indexOf(song.filepath);
            favorites.splice(index, 1);
        } else {
            // Añadir a favoritos
            favoriteIcon.classList.replace("bx-heart", "bxs-heart");
            favorites.push(song.filepath);
        }

        saveFavoritesToLocalStorage(favorites);
    });

    songCard.appendChild(playIcon);
    songCard.appendChild(title);
    songCard.appendChild(artist);
    songCard.appendChild(duration);
    songCard.appendChild(favoriteIcon);

    // Evento para reproducir la canción al hacer clic
    songCard.addEventListener("click", () => {
        const activeList = currentView === "favorites" ? favoriteSongsList : songsList;
        const index = activeList.findIndex(s => s.filepath === song.filepath);
        playSongByIndex(index);
    });

    songContainer.appendChild(songCard);
}

// Almacenar favoritos en localStorage
function saveFavoritesToLocalStorage(favorites) {
    localStorage.setItem("favoriteSongs", JSON.stringify(favorites));
}

// Recuperar favoritos de localStorage
function getFavoritesFromLocalStorage() {
    const favorites = localStorage.getItem("favoriteSongs");
    return favorites ? JSON.parse(favorites) : [];
}

// Actualiza el contenedor con las canciones según el filtro (favoritos o todos)
function updateSongContainer(filter = "all") {
    songContainer.innerHTML = ""; // Limpia el contenedor

    const favorites = getFavoritesFromLocalStorage();
    const filteredSongs = filter === "favorites" ?
        songsList.filter(song => favorites.includes(song.filepath)) :
        songsList;

    filteredSongs.forEach((song, index) => {
        addSongToContainer(song);

        // Marcar la tarjeta como "playing" si es la canción activa
        if (currentView === filter && currentSongIndex === index) {
            const songCards = document.querySelectorAll(".song-card");
            if (songCards[index]) {
                songCards[index].classList.add("playing");
            }
        }
    });
}

// Filtrar canciones al hacer clic en "Todos" o "Favoritos"
document.querySelector("#filters").addEventListener("click", (event) => {
    if (event.target.textContent === "Todos") {
        currentView = "all";
        updateSongContainer("all");
    } else if (event.target.textContent === "Favoritos") {
        currentView = "favorites";
        updateActiveSongsList(); // Actualizar lista de favoritos activos
        updateSongContainer("favorites");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    updateSongContainer("all"); // Cargar todas las canciones inicialmente
    updateActiveSongsList(); // Inicializar la lista de favoritos
    const filterOptions = document.querySelectorAll('#filters p');

    filterOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Quitar la clase "active" de todos los filtros
            filterOptions.forEach(opt => opt.classList.remove('active'));
            
            // Añadir la clase "active" al filtro seleccionado
            option.classList.add('active');
        });
    });
});