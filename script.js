let map;
let marker;

function initMap() {
  if (!navigator.geolocation) {
    document.getElementById("message").innerText = "Geolocation not supported by this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: userLocation
      });

      marker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: "You are here!"
      });
    },
    (error) => {
      document.getElementById("message").innerText = "Location access denied or unavailable.";
      console.error(error);
    }
  );
}

// Buttons
document.getElementById("reportBtn").addEventListener("click", () => {
  if (!map) {
    document.getElementById("message").innerText = "Map not loaded yet!";
    return;
  }
  document.getElementById("message").innerText = "Click on the map to report an issue.";

  map.addListener("click", (e) => {
    if (marker) marker.setMap(null);
    marker = new google.maps.Marker({
      position: e.latLng,
      map: map,
      title: "Reported Issue"
    });
    document.getElementById("message").innerText = `Issue reported at: ${e.latLng.lat().toFixed(5)}, ${e.latLng.lng().toFixed(5)}`;
  });
});

document.getElementById("switchViewBtn").addEventListener("click", () => {
  alert("Switching to Authority View (Demo)");
});
