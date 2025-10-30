document.getElementById('openMapBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(success, error);
});

function success(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const mapWindow = window.open('', '_blank');
  mapWindow.document.write(`
    <html>
      <head>
        <title>Map View</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      </head>
      <body style="margin:0">
        <div id="map" style="height:100vh;width:100vw"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lon}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);
          L.marker([${lat}, ${lon}]).addTo(map)
            .bindPopup('You are here!')
            .openPopup();
        <\/script>
      </body>
    </html>
  `);
}

function error(err) {
  alert('Unable to retrieve location. Please enable location access.');
  console.error(err);
}
