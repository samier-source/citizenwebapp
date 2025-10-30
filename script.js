// This runs when you're on the homepage
const openMapBtn = document.getElementById("openMapBtn");

if (openMapBtn) {
  openMapBtn.addEventListener("click", () => {
    // Navigate to map page
    window.location.href = "main.html";
  });
}

// This runs when you're on the map page
if (window.location.pathname.includes("main.html")) {
  const map = L.map("map").setView([19.0760, 72.8777], 12);

  // Load map tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // Try to get user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Center map and add marker
        map.setView([lat, lon], 14);
        L.marker([lat, lon])
          .addTo(map)
          .bindPopup("You are here.")
          .openPopup();
      },
      (err) => {
        alert("Error: Location not authorized or unavailable.");
        console.error(err);
      }
    );
  } else {
    alert("Geolocation not supported by your browser.");
  }
}
