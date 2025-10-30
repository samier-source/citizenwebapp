// Simple working version: shows a map and allows marker placement

document.addEventListener("DOMContentLoaded", function () {
  const openMapBtn = document.getElementById("openMapBtn");

  if (openMapBtn) {
    openMapBtn.addEventListener("click", () => {
      window.location.href = "main.html";
    });
  }

  // If we are on main.html, initialize the map
  if (window.location.pathname.includes("main.html")) {
    initMap();
  }
});

function initMap() {
  // Create the map container if it doesn't exist
  let mapContainer = document.getElementById("map");
  if (!mapContainer) {
    mapContainer = document.createElement("div");
    mapContainer.id = "map";
    document.body.appendChild(mapContainer);
  }

  // Set basic map styles
  mapContainer.style.width = "100vw";
  mapContainer.style.height = "100vh";

  // Load Google Maps API dynamically
  const script = document.createElement("script");
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=loadMap";
  script.async = true;
  document.head.appendChild(script);
}

function loadMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 19.076, lng: 72.8777 }, // Mumbai center (example)
    zoom: 14,
  });

  map.addListener("click", (event) => {
    new google.maps.Marker({
      position: event.latLng,
      map: map,
    });
  });
}
