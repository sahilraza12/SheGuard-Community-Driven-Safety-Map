// 1. Initialize Map
const map = L.map('map-container').setView([30.7045, 76.2175], 14); 
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Search for a safe place...",
    errorMessage: "Location not found."
})
.on('markgeocode', function(e) {
    const latlng = e.geocode.center;
    
    // Map ko us jagah par move karein
    map.setView(latlng, 16);

    // Use as Destination: Is jagah ko selectedLatLng maan lein
    selectedLatLng = latlng;

    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker(latlng).addTo(map)
        .bindPopup(`<b>Destination:</b> ${e.geocode.name}<br>Now click 'Show Safe Path'`)
        .openPopup();
})
.addTo(map);
const icons = {
    safe: L.icon({ 
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/11832/11832801.png', 
        iconSize: [35, 35], 
        popupAnchor: [0, -15] 
    }), 
    caution: L.icon({ 
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564619.png', 
        iconSize: [30, 30], 
        popupAnchor: [0, -15] 
    }), 
    danger: L.icon({ 
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/752/752755.png', 
        iconSize: [35, 35], 
        popupAnchor: [0, -15] 
    }) 
};

let selectedLatLng = null;
let tempMarker = null;
let routingControl = null;

// 2. Heatmap Layer (Advanced)
let heatLayer = L.heatLayer([], {radius: 30, blur: 15, maxZoom: 17}).addTo(map);

// 3. Modal Function
function closeModal() {
    document.getElementById('welcome-modal').style.display = 'none';
}

// 4. Night Mode Logic
const hour = new Date().getHours();
if (hour >= 20 || hour <= 5) {
    document.getElementById('map-container').style.filter = "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)";
    console.log("Night Safety Mode Active");
}

// 5. Police Stations (With working Icon)
const policeStations = [
    { name: "City Police Station Khanna", lat: 30.7065, lng: 76.2210 },
    { name: "Sadar Police Station", lat: 30.6980, lng: 76.2050 },
    { name: "CIA Staff Khanna", lat: 30.7120, lng: 76.2150 }
];

const policeIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2563/2563451.png',
    iconSize: [30, 30],
    popupAnchor: [0, -15]
});

policeStations.forEach(ps => {
    L.marker([ps.lat, ps.lng], { icon: policeIcon }).addTo(map)
        .bindPopup(`<b>👮 ${ps.name}</b><br>Emergency: 112`);
});

// 6. Color Logic
function getColor(type) {
    if(type === 'safe') return '#2ecc71';
    if(type === 'caution') return '#f1c40f';
    return '#e74c3c';
}

// 7. Update Heatmap & Stats
function updateMapFeatures() {
    const reports = JSON.parse(localStorage.getItem('sheGuardReports')) || [];
    const currentHour = new Date().getHours();
    let heatData = [];
    
    // Stats counter initialize karein
    let counts = { safe: 0, caution: 0, danger: 0 };

    // Purane markers clear karne ke liye (Optional but good practice)
    // map.eachLayer((layer) => { if (layer instanceof L.Marker && !layer.options.icon.options.iconUrl.includes('police')) map.removeLayer(layer); });

    reports.forEach(r => {
        let displayType = r.type; // Default type (safe/caution/danger)
        let statusMessage = r.type.toUpperCase();

        // --- SMART TIME LOGIC ---
        // Agar Danger report raat ki hai aur abhi din hai, toh stats mein 'caution' count hoga
        if (r.type === 'danger' && (r.hour >= 20 || r.hour <= 5)) {
            if (currentHour >= 6 && currentHour < 20) {
                displayType = 'caution'; 
                statusMessage = "DANGER AT NIGHT (Caution Now)";
            }
        }
        
        // Stats update karein (displayType ke basis par)
        if (counts.hasOwnProperty(displayType)) {
            counts[displayType]++;
        }

        // Heatmap logic
        if (displayType === 'danger') heatData.push([r.lat, r.lng, 1.0]);
        if (displayType === 'caution') heatData.push([r.lat, r.lng, 0.5]);

        // Marker Display
        L.marker([r.lat, r.lng], { icon: icons[displayType] || icons['safe'] })
            .addTo(map)
            .bindPopup(`
                <div style="font-family: sans-serif; min-width:150px;">
                    <b style="font-size:14px; color:#673ab7;">📍 ${r.name}</b><br>
                    <b style="color:${displayType === 'danger' ? 'red' : '#f1c40f'};">Status:</b> ${statusMessage}<br>
                    <p style="margin:5px 0; font-size:12px;"><b>Issue:</b> ${r.desc || 'No details provided'}</p>
                    <hr style="border:0; border-top:1px solid #eee;">
                    <small style="color:gray;">Reported at: ${r.hour || 0}:00 hrs</small>
                </div>
            `);
    });

    // Heatmap update
    if (heatLayer) heatLayer.setLatLngs(heatData);
    
    // --- STATISTICS DISPLAY (FIXED) ---
    const statsDiv = document.getElementById('stats-content');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <p style="color: #2ecc71; margin: 5px 0;">✅ Safe Spots: <b>${counts.safe}</b></p>
            <p style="color: #f1c40f; margin: 5px 0;">⚠️ Caution Areas: <b>${counts.caution}</b></p>
            <p style="color: #e74c3c; margin: 5px 0;">🚩 Danger Zones: <b>${counts.danger}</b></p>
        `;
    }
}
// 8. Interactivity (Clicks & Locate)
map.on('click', function(e) {
    selectedLatLng = e.latlng;
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker(e.latlng).addTo(map).bindPopup("<b>Target Selected</b><br>Fill form or get path.").openPopup();
});

document.getElementById('locate-me').addEventListener('click', () => {
    map.locate({setView: true, maxZoom: 16});
});

map.on('locationfound', (e) => {
    selectedLatLng = e.latlng;
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.circleMarker(e.latlng, {radius: 12, color: 'blue'}).addTo(map).bindPopup("You are here").openPopup();
});

// This will make EVERY SOS button on the page work
document.querySelectorAll('.sos-btn').forEach(button => {
    button.addEventListener('click', function() {
        // 1. Start Alarm Sound
        const audio = document.getElementById('sos-sound');
        if(audio) audio.play();

        // 2. Visual Alert (Screen Flashing)
        document.body.classList.add('emergency-mode');

        // 3. Get Location and Send WhatsApp
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
                
                const phoneNumber = "919876543210"; // Replace with your real number
                const message = `🚨 EMERGENCY! I need help. My current location: ${mapLink}`;
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                
                // Open WhatsApp
                window.location.href = whatsappUrl;
            }, (error) => {
                alert("Location access denied. Please enable GPS for SOS to work.");
            });
        } else {
            alert("Geolocation not supported by this browser.");
        }
        
        
        // 4. Reset screen after 10 seconds
        setTimeout(() => {
            document.body.classList.remove('emergency-mode');
            if(audio) audio.pause();
        }, 10000);
    });
});

// 10. Safe Routing
function activateRouting() {
    if (!selectedLatLng) return alert("Pehle map par destination select karein!");
    
    navigator.geolocation.getCurrentPosition((position) => {
        const userLocation = L.latLng(position.coords.latitude, position.coords.longitude);
        const targetLocation = L.latLng(selectedLatLng.lat, selectedLatLng.lng);

        if (routingControl) map.removeControl(routingControl);

        routingControl = L.Routing.control({
            waypoints: [userLocation, targetLocation],
            lineOptions: {
                styles: [{ color: '#2ecc71', weight: 8, opacity: 0.9 }] // Shuruat Green se
            },
            createMarker: function() { return null; },
            addWaypoints: false,
            routeWhileDragging: false
        }).addTo(map);

        // --- DYNAMIC SAFETY CHECK ---
        routingControl.on('routesfound', function(e) {
            const route = e.routes[0];
            const reports = JSON.parse(localStorage.getItem('sheGuardReports')) || [];
            let isUnsafe = false;

            // Raste ke har point ko Danger Zone se check karo
            route.coordinates.forEach(coord => {
                reports.forEach(r => {
                    if (r.type === 'danger') {
                        const distance = map.distance([coord.lat, coord.lng], [r.lat, r.lng]);
                        if (distance < 200) { // 200 meters ka danger radius
                            isUnsafe = true;
                        }
                    }
                });
            });

            // Agar rasta unsafe hai toh line color RED kar do
            if (isUnsafe) {
                routingControl.getPlan().setWaypoints([userLocation, targetLocation]); 
                // Line style update
                routingControl.options.lineOptions.styles = [{ color: '#e74c3c', weight: 8, opacity: 0.9 }];
                map.removeControl(routingControl);
                routingControl.addTo(map);
                
                alert("🚩 WARNING: The shortest path goes through a Danger Zone. Please follow the RED line with caution or try another route!");
            } else {
                alert("✅ Route is Clear: Follow the Green path.");
            }
        });

    }, (error) => {
        alert("Location access needed for routing.");
    });
}

// 11. Form Handling
document.getElementById('report-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!selectedLatLng) return alert("Please select a location on map!");

    const now = new Date();
    const newReport = {
        name: document.getElementById('loc-name').value,
        desc: document.getElementById('loc-desc').value, // Description save ho raha hai
        type: document.getElementById('issue-type').value,
        lat: selectedLatLng.lat,
        lng: selectedLatLng.lng,
        hour: now.getHours() // Current time (0-23) save ho raha hai
    };

    let reports = JSON.parse(localStorage.getItem('sheGuardReports')) || [];
    reports.push(newReport);
    localStorage.setItem('sheGuardReports', JSON.stringify(reports));

    location.reload(); // Refresh to show new data
});

// Initialize
updateMapFeatures();

// script.js ke bilkul niche paste karein
function shareLiveLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Sahi Google Maps link format
            const link = `https://www.google.com/maps?q=${lat},${lng}`;
            
            // Clipboard par copy karne ka logic
            navigator.clipboard.writeText(`I am traveling. Track my live location here: ${link}`)
            .then(() => {
                alert("✅ Tracking link copied to clipboard! Now paste and send it to your family via WhatsApp/SMS.");
            })
            .catch(err => {
                alert("Could not copy link. Please try again.");
            });
        }, (error) => {
            alert("Please enable GPS to share your location.");
        });
    } else {
        alert("Your browser does not support Geolocation.");
    }
}
function showTips() {
    alert("Safety Tips:\n1. Share your live location with family.\n2. Avoid dark shortcuts.\n3. Keep your phone charged.");
}
function updateTimeUI() {
    const hour = new Date().getHours();
    const statusDiv = document.getElementById('time-status');
    if (hour >= 20 || hour <= 5) {
        statusDiv.style.background = "#2c3e50";
        statusDiv.style.color = "white";
        statusDiv.innerHTML = "🌙 Night Safety Mode Active";
    } else {
        statusDiv.style.background = "#f1c40f";
        statusDiv.style.color = "black";
        statusDiv.innerHTML = "☀️ Day Mode Active";
    }
}
updateTimeUI();