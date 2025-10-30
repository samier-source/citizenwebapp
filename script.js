// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDrUmBXIllRZbEgGULgGWeNmfp_NO9CB4Y",
  authDomain: "roadintersectionproject.firebaseapp.com",
  projectId: "roadintersectionproject",
  storageBucket: "roadintersectionproject.firebasestorage.app",
  messagingSenderId: "300868445861",
  appId: "1:300868445861:web:58fe033d1adeacb0610f4c",
  measurementId: "G-F4LMHHMY9M",
};

let app, auth, db;
let map, currentUser, currentView = "citizen";
let selectedLatLng = null;
let markers = {};
const collectionPath = "artifacts/default-citizen-app/public/data/road-issues";

// DOM Elements
const toggleViewBtn = document.getElementById("toggleViewBtn");
const reportBtn = document.getElementById("reportBtn");
const reportModal = document.getElementById("reportModal");
const reportForm = document.getElementById("reportForm");
const closeReportModal = document.getElementById("closeReportModal");
const viewModal = document.getElementById("viewModal");
const closeViewModal = document.getElementById("closeViewModal");
const authorityControls = document.getElementById("authorityControls");
const updateStatusBtn = document.getElementById("updateStatusBtn");

// Initialize Firebase
app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);

// Sign in anonymously
signInAnonymously(auth).catch(console.error);

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user.uid;
    if (map) loadIssues();
  }
});

// Initialize map
window.initMap = () => {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 19.076, lng: 72.8777 },
    zoom: 13,
  });

  // Geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }

  map.addListener("click", (e) => {
    if (currentView === "citizen") {
      selectedLatLng = e.latLng;
      reportModal.classList.remove("hidden");
    }
  });
};

// Load issues from Firestore
function loadIssues() {
  const colRef = collection(db, collectionPath);
  onSnapshot(colRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const id = change.doc.id;
      const data = change.doc.data();

      if (change.type === "added") addMarker(id, data);
      if (change.type === "modified") updateMarker(id, data);
      if (change.type === "removed") removeMarker(id);
    });
  });
}

function addMarker(id, data) {
  const iconColor =
    data.status === "Resolved"
      ? "green"
      : data.status === "In Progress"
      ? "orange"
      : "red";

  const marker = new google.maps.Marker({
    position: { lat: data.lat, lng: data.lng },
    map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: iconColor,
      fillOpacity: 0.9,
      strokeWeight: 1,
    },
  });

  marker.addListener("click", () => openViewModal(id, data));
  markers[id] = marker;
}

function updateMarker(id, data) {
  removeMarker(id);
  addMarker(id, data);
}

function removeMarker(id) {
  if (markers[id]) {
    markers[id].setMap(null);
    delete markers[id];
  }
}

// Submit new report
reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedLatLng || !currentUser) return;

  const newIssue = {
    type: document.getElementById("issueType").value,
    description: document.getElementById("description").value || "No description",
    status: "Received",
    lat: selectedLatLng.lat(),
    lng: selectedLatLng.lng(),
    reportedBy: currentUser,
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, collectionPath), newIssue);
  reportModal.classList.add("hidden");
});

// View Modal
function openViewModal(id, data) {
  document.getElementById("viewType").textContent = data.type;
  document.getElementById("viewDesc").textContent = data.description;
  document.getElementById("viewStatus").textContent = data.status;
  document.getElementById("viewUser").textContent = data.reportedBy;

  authorityControls.classList.toggle("hidden", currentView !== "authority");
  updateStatusBtn.onclick = async () => {
    const newStatus = document.getElementById("updateStatus").value;
    await updateDoc(doc(db, collectionPath, id), { status: newStatus });
    viewModal.classList.add("hidden");
  };

  viewModal.classList.remove("hidden");
}

// Button handlers
toggleViewBtn.addEventListener("click", () => {
  currentView = currentView === "citizen" ? "authority" : "citizen";
  toggleViewBtn.textContent =
    currentView === "authority"
      ? "Switch to Citizen View"
      : "Switch to Authority View";
});

closeReportModal.addEventListener("click", () =>
  reportModal.classList.add("hidden")
);
closeViewModal.addEventListener("click", () =>
  viewModal.classList.add("hidden")
);
