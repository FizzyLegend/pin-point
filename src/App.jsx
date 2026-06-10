import React, { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Sphere, Graticule, ZoomableGroup } from "react-simple-maps";
import { ref as dbref, onValue, set, remove } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { db, auth } from "./firebase"; 
import './App.css';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const RANKS = [
  { name: "Novice Nomad", min: 0 },
  { name: "Seasoned Explorer", min: 6 },
  { name: "Global Globetrotter", min: 16 },
  { name: "Master Voyager", min: 30 },
  { name: "World Conqueror", min: 50 }
];

function App() {
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [visitedCountries, setVisitedCountries] = useState([]);
  const [allWorldCountries, setAllWorldCountries] = useState([]); 
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newTripName, setNewTripName] = useState("");
  const [newTripTag, setNewTripTag] = useState("");
  const [tripPhotos, setTripPhotos] = useState([]); 
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });
  const [isResetting, setIsResetting] = useState(false);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const [popupState, setPopupState] = useState({ view: 'list', tripIndex: null });
  const [expandedCountry, setExpandedCountry] = useState(null);
  
  const [isRankDropdownOpen, setIsRankDropdownOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState('all'); 
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState("");
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  const rankDropdownRef = useRef(null);
  const countryDropdownRef = useRef(null);
  const popupRef = useRef(null);

  // Click-Outside Listener
  // 🌟 NEW: Global Click Listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the Rank menu is open, and the click was OUTSIDE the Rank menu boundary, close it
      if (rankDropdownRef.current && !rankDropdownRef.current.contains(event.target)) {
        setIsRankDropdownOpen(false); // Make sure this matches your actual state variable name!
      }
      
      // If the Country menu is open, and the click was OUTSIDE the Country menu boundary, close it
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false); 
      }
    };

    // Attach the listener to the whole webpage
    document.addEventListener("mousedown", handleClickOutside, true);
    
    // Clean up the listener when the app closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, []);

  // Fetch Country Map Data
  useEffect(() => {
    fetch(geoUrl).then(res => res.json()).then(data => {
      const names = data.objects.countries.geometries.map(g => g.properties.name).filter(Boolean).sort();
      setAllWorldCountries(names);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const userTripsRef = dbref(db, `users/${user.uid}/countries`);
    const unsubscribe = onValue(userTripsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedCountries = Object.keys(data).map(countryName => ({
          name: countryName,
          trips: data[countryName].trips || []
        }));
        setVisitedCountries(loadedCountries);
      } else {
        setVisitedCountries([]); // Handle empty database
      }
      
      setIsLoading(false); // 🌟 NEW: Turns off the loading screen once data arrives!
    });

    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: nickname });
        setUser({ ...userCredential.user, displayName: nickname });
      }
    } catch (error) { setAuthError(error.message.replace("Firebase:", "")); }
  };

  const getHeatmapColor = (count) => {
    if (count >= 4) return "#2dd4bf"; 
    if (count >= 2) return "#0ea5e9"; 
    return "#3b82f6"; 
  };

  const addTrip = async () => {
    if (!newTripName.trim() || !user) return;
    setIsUploading(true);
    let uploadedUrls = [];
    if (tripPhotos.length > 0) {
      try {
        const uploadPromises = tripPhotos.map(async (photo) => {
          const formData = new FormData();
          formData.append("file", photo);
          formData.append("upload_preset", "aqioeaaa"); // 🛑 REPLACE THIS
          const response = await fetch(`https://api.cloudinary.com/v1_1/dx5gatvsn/image/upload`, { method: "POST", body: formData }); // 🛑 REPLACE THIS
          const data = await response.json();
          return data.secure_url; 
        });
        uploadedUrls = await Promise.all(uploadPromises);
      } catch (error) { alert("Upload failed! Please check console."); setIsUploading(false); return; }
    }
    const newTrip = { name: newTripName, tag: newTripTag || "General", photoUrls: uploadedUrls, timestamp: Date.now() };
    const existing = visitedCountries.find(c => c.name === selectedCountry);
    const updated = existing ? [...existing.trips, newTrip] : [newTrip];
    await set(dbref(db, `users/${user.uid}/countries/${selectedCountry}`), { name: selectedCountry, flag: '📍', trips: updated });
    setNewTripName(""); setNewTripTag(""); setTripPhotos([]); setIsUploading(false); setPopupState({ view: 'list', tripIndex: null });
  };

  const deleteTrip = async (countryName, tripIndex) => {
    if (!user) return;
    const existingCountry = visitedCountries.find(c => c.name === countryName);
    if (!existingCountry) return;
    const updatedTrips = existingCountry.trips.filter((_, index) => index !== tripIndex);

    if (updatedTrips.length === 0) {
      await remove(dbRef(db, `users/${user.uid}/countries/${countryName}`));
      if (selectedCountry === countryName) setSelectedCountry(null);
    } else {
      await set(dbRef(db, `users/${user.uid}/countries/${countryName}`), { ...existingCountry, trips: updatedTrips });
      if (selectedCountry === countryName && popupState.view === 'gallery' && popupState.tripIndex === tripIndex) {
        setPopupState({ view: 'list', tripIndex: null });
      }
    }
  };

  const removePhoto = async (tripIdx, photoUrlToRemove) => {
    if (!user) return;
    const existingCountry = visitedCountries.find(c => c.name === selectedCountry);
    const trip = existingCountry.trips[tripIdx];
    let currentPhotos = trip.photoUrls || (trip.photoUrl ? [trip.photoUrl] : []);
    let updatedPhotos = currentPhotos.filter(url => url !== photoUrlToRemove);
    let updatedTrips = [...existingCountry.trips];
    updatedTrips[tripIdx] = { ...trip, photoUrls: updatedPhotos, photoUrl: null }; 
    await set(dbRef(db, `users/${user.uid}/countries/${selectedCountry}`), { ...existingCountry, trips: updatedTrips });
  };

  const dynamicTags = Array.from(new Set(visitedCountries.flatMap(c => c.trips.map(t => t.tag))));
  const matchingTags = dynamicTags.filter(tag => {
    const searchString = newTripTag.toLowerCase();
    const tagLower = tag.toLowerCase();
    if (searchString.trim() === "") return true;
    return tagLower.includes(searchString) && tagLower !== searchString.trim();
  });

  const toggleFilter = (tag) => {
    setActiveFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filteredList = visitedCountries.filter(country => {
    const matchesSearch = country.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilters.length === 0 || country.trips.some(trip => activeFilters.includes(trip.tag));
    return matchesSearch && matchesFilter;
  });

  const handleMoveEnd = (pos) => setPosition(pos);
  const handleDoubleClickReset = (e) => {
    e.preventDefault(); e.stopPropagation(); 
    setIsResetting(true); setPosition({ coordinates: [0, 0], zoom: 1 });
    setTimeout(() => setIsResetting(false), 500);
  };

  const openCountryFromDropdown = (name) => {
    // Centers the popup perfectly on the screen
    setPopupPos({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 150 });
    setSelectedCountry(name);
    setPopupState({ view: 'list', tripIndex: null });
    setIsCountryDropdownOpen(false);
    setDropdownSearchQuery(""); // Clears search after clicking
  };

  const openCountryFromSidebar = (name, idx = null) => {
    setSelectedCountry(name);
    setPopupState({ view: idx !== null ? 'gallery' : 'list', tripIndex: idx });
    setIsCountryDropdownOpen(false);
    setIsSidebarOpen(true); // 🌟 Guarantees the sidebar is open
  };

  const handleCountryClick = (e, name) => {
    setPopupPos({ x: e.clientX, y: e.clientY });
    setSelectedCountry(name);
    setPopupState({ view: 'list', tripIndex: null });
    setIsRankDropdownOpen(false);
    setIsCountryDropdownOpen(false);
  };

  const clickedCountryData = visitedCountries.find(c => c.name === selectedCountry);
  const getActivePhotos = () => {
    if (!clickedCountryData || popupState.tripIndex === null) return [];
    const trip = clickedCountryData.trips[popupState.tripIndex];
    return trip.photoUrls || (trip.photoUrl ? [trip.photoUrl] : []);
  };

  let currentRank = RANKS[0];
  RANKS.forEach(r => { if (visitedCountries.length >= r.min) currentRank = r; });
  let latestTrip = null;
  if (visitedCountries.length > 0) {
    const allTrips = visitedCountries.flatMap(c => c.trips.map((t, idx) => ({...t, country: c.name, tripIndex: idx})));
    latestTrip = allTrips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
  }

  const displayedCountries = allWorldCountries.filter(c => {
    const isVisited = visitedCountries.some(vc => vc.name === c);
    if (countryFilter === 'visited') return isVisited;
    if (countryFilter === 'unvisited') return !isVisited;
    return true; 
  });

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card glass-card">
          <h2 className="brand">📍 PinPoint</h2>
          <p className="auth-subtitle">{isLoginMode ? "Welcome back, Explorer." : "Begin your global journey."}</p>
          <form onSubmit={handleAuth} className="auth-form">
            {!isLoginMode && (
          <input
            type="text"
            placeholder="Choose a Nickname..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            className="auth-input glass-input" 
          />
        )}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            {authError && <p className="auth-error">{authError}</p>}
            <button type="submit" className="auth-btn">{isLoginMode ? "Sign In" : "Join the Journey"}</button>
          </form>
          <p className="toggle-text" onClick={() => setIsLoginMode(!isLoginMode)}>{isLoginMode ? "Create an account" : "Back to Login"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container modern-theme">
      
      {/* Onboarding Overlay */}
      {!isLoading && visitedCountries.length === 0 && !selectedCountry && (
        <div className="onboarding-overlay">
          <p className="pulse">Where to next? Click any country to begin.</p>
        </div>
      )}

      {/* 🌟 NEW: Loading State Overlay */}
      {isLoading && user && (
        <div className="loading-overlay">
          <h3 className="pulse">Loading your travels...</h3>
        </div>
      )}

      <header className="stats-bar glass">
        <div className="header-left"><h2 className="brand">PinPoint</h2></div>
        <div className="stats-dashboard">
          
          <div className="stat-item dropdown-trigger" ref={rankDropdownRef} onClick={() => setIsRankDropdownOpen(!isRankDropdownOpen)}>
             <span className="v-label">Rank</span>
             <span className="v-value accent">{currentRank.name} ▾</span>
             {isRankDropdownOpen && (
               <div className="dropdown glass-menu anim-slide-down">
                 <div className="dd-header">Travel Ranks</div>
                 {RANKS.map(r => (
                   <div key={r.name} className={`dd-item ${visitedCountries.length < r.min ? 'locked' : ''}`}>
                     <span>{visitedCountries.length < r.min ? '🔒 ' : ''}{r.name}</span>
                     <span className="dd-min">{r.min}+</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
          
          <div className="stat-divider" />
          
          <div className="stat-item dropdown-trigger" ref={countryDropdownRef}>
             <div className="trigger-wrapper" onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}>
               <span className="v-label">Countries</span>
               <span className="v-value">{visitedCountries.length} ▾</span>
             </div>
             {isCountryDropdownOpen && (
               <div className="dropdown glass-menu anim-slide-down">
                 <div className="dropdown-filters">
                   <button className={countryFilter === 'all' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setCountryFilter('all');}}>All</button>
                   <button className={countryFilter === 'visited' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setCountryFilter('visited');}}>Visited</button>
                   <button className={countryFilter === 'unvisited' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setCountryFilter('unvisited');}}>Not Visited</button>
                 </div>
                 
                 {/* 🌟 NEW: Dropdown Search Bar */}
                 <div className="dd-search">
                   <input 
                     type="text" 
                     placeholder="Search countries..." 
                     value={dropdownSearchQuery}
                     onChange={(e) => setDropdownSearchQuery(e.target.value)}
                     onClick={(e) => e.stopPropagation()} 
                   />
                 </div>

                 <div className="scroll-hide" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                   {displayedCountries
                     .filter(c => c.toLowerCase().includes(dropdownSearchQuery.toLowerCase()))
                     .map(c => {
                       const isVisited = visitedCountries.some(vc => vc.name === c);
                       return (
                         <div key={c} className={`dd-item ${isVisited ? 'visited' : 'unvisited'}`} onClick={(e) => { e.stopPropagation(); openCountryFromDropdown(c); }}>
                           <span>{c}</span>
                           {isVisited && <span className="check">✓</span>}
                         </div>
                       );
                   })}
                 </div>
               </div>
             )}
          </div>
          
          <div className="stat-divider" />
          
          <div className="stat-item clickable" onClick={() => latestTrip && openCountryFromSidebar(latestTrip.country, latestTrip.tripIndex)}>
             <span className="v-label">Latest Trip</span>
             <span className="v-value truncate">{latestTrip ? latestTrip.name : "None"}</span>
          </div>
        </div>
        <div className="header-right"><button className="signout-btn" onClick={() => signOut(auth)}>Sign Out</button></div>
      </header>

      <div className="main-content">
        <div className={`map-area ${isResetting ? 'smooth-zoom' : ''}`} onDoubleClickCapture={handleDoubleClickReset}>
          <ComposableMap projectionConfig={{ scale: 125 }}>
            <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={setPosition} minZoom={1} maxZoom={8}>
              <Sphere stroke="#1e293b" strokeWidth={0.5} fill="url(#oceanGradient)" />
              <defs>
                <radialGradient id="oceanGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </radialGradient>
              </defs>
              <Graticule stroke="#334155" strokeWidth={0.3} />
              <Geographies geography={geoUrl}>
                {({ geographies }) => geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  const country = visitedCountries.find(c => c.name === countryName);
                  const isSelected = selectedCountry === countryName; 
                  
                  return (
                    <Geography key={geo.rsmKey} geography={geo} onClick={(e) => {
                        setSelectedCountry(countryName);
                        setPopupState({ view: 'list', tripIndex: null });
                        setIsSidebarOpen(true); // Forces sidebar open if it was closed
                      }}
                      style={{
                        default: { 
                          fill: country ? getHeatmapColor(country.trips.length) : "#1e293b", 
                          stroke: isSelected ? "#ffffff" : "#0f172a", 
                          strokeWidth: isSelected ? 1.5 : 0.5,        
                          outline: "none" 
                        },
                        hover: { fill: "#334155", stroke: "#0ea5e9", strokeWidth: 1.5, cursor: "pointer", outline: "none" },
                        pressed: { fill: "#0ea5e9", outline: "none" }
                      }}
                    />
                  );
                })}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          <div className="profile-widget glass">
             <div className="profile-icon">{user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}</div>
             <div className="profile-info">
                <span className="profile-name">{user.displayName || "Explorer"}</span>
                <span className="profile-sub">{user.email}</span>
             </div>
          </div>
        </div>

        <button className={`sidebar-toggle glass ${!isSidebarOpen ? 'closed' : ''}`} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? '▶' : '◀'}
        </button>

        <aside className={`sidebar glass-sidebar ${isSidebarOpen ? '' : 'closed'} ${isMobileCollapsed ? 'collapsed' : ''}`}>

          {/* 🌟 2. NEW: The drag handle goes right here at the very top! */}
          <div 
            className="mobile-drag-handle" 
            onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
          ></div>
          {selectedCountry ? (
            /* 🌟 THE SIDEBAR TAKEOVER: Replaces the Floating Popup */
            <div className="sidebar-detail-view anim-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <button className="p-back" onClick={() => setSelectedCountry(null)} style={{ textAlign: 'left', marginBottom: '15px', fontSize: '0.9rem' }}>
  <span className="desktop-arrow">←</span>
  <span className="mobile-arrow">↓</span> Back to Map
</button>
              <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent)', fontSize: '1.5rem' }}>{selectedCountry}</h2>

              <div className="scroll-hide" style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                
                {/* LIST VIEW */}
                {popupState.view === 'list' && (
                  <div className="p-list">
                    {!clickedCountryData ? (
                      <div className="p-form" style={{textAlign: 'center', padding: '10px 0'}}>
                        <p className="empty-msg" style={{marginBottom: '15px'}}>You haven't explored {selectedCountry} yet!</p>
                        <button className="save-btn" onClick={() => setPopupState({ view: 'add' })}>+ Log First Trip</button>
                      </div>
                    ) : (
                      <>
                        {clickedCountryData.trips.map((t, i) => {
                          const hasPhotos = (t.photoUrls && t.photoUrls.length > 0) || t.photoUrl;
                          return (
                            <div key={i} className="p-row" onClick={() => setPopupState({ view: 'gallery', tripIndex: i })}>
                              <div className="p-row-info">
                                <span>{t.name ? t.name : "Unnamed Trip"}</span>
                                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                  <small>{t.tag}</small>
                                  {hasPhotos && <span style={{fontSize: '0.8rem'}}>📸</span>}
                                </div>
                              </div>
                              <span className="p-arrow">›</span>
                            </div>
                          );
                        })}
                        <button className="p-add-trigger" onClick={() => setPopupState({ view: 'add' })}>+ Log New Trip</button>
                      </>
                    )}
                  </div>
                )}

                {/* GALLERY VIEW */}
                {/* 🌟 UPGRADED: TRIP DETAIL VIEW */}
                {popupState.view === 'gallery' && clickedCountryData && (
                  <div className="p-gallery">
                     <button className="p-back" onClick={() => setPopupState({ view: 'list' })}>← Back to Trips</button>
                     
                     <div className="trip-detail-header">
                        <h4>{clickedCountryData.trips[popupState.tripIndex].name || "Unnamed Trip"}</h4>
                        <span className="td-tag">{clickedCountryData.trips[popupState.tripIndex].tag || "No Tag"}</span>
                     </div>

                     <h5 className="td-label">Trip Memories</h5>
                     
                     {getActivePhotos().length > 0 ? (
                       <div className="photo-grid-mini">
                         {getActivePhotos().map((url, i) => (
                           <div key={i} className="photo-square">
                             <img src={url} alt="Trip memory" />
                             <button className="delete-photo-btn" onClick={() => removePhoto(popupState.tripIndex, url)}>✕</button>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="empty-photo-box">
                         <p>No photos uploaded for this trip yet.</p>
                       </div>
                     )}
                  </div>
                )}

                {/* ADD/FORM VIEW */}
                {popupState.view === 'add' && (
                  <div className="p-form">
                     <button className="p-back" onClick={() => setPopupState({ view: 'list' })}>← Cancel</button>
                     <input type="text" placeholder="Trip Name (e.g. Summer Break)" value={newTripName} onChange={e => setNewTripName(e.target.value)} />
                     <div className="tag-input-container">
                       <input type="text" placeholder="Category (e.g. Adventure)" value={newTripTag} onChange={e => setNewTripTag(e.target.value)} onFocus={() => setIsTagInputFocused(true)} onBlur={() => setIsTagInputFocused(false)} />
                       {isTagInputFocused && matchingTags.length > 0 && (
                         <ul className="tag-autocomplete-dropdown">
                           {matchingTags.map(tag => <li key={tag} onMouseDown={() => setNewTripTag(tag)}>{tag}</li>)}
                         </ul>
                       )}
                     </div>
                     <input type="file" multiple accept="image/*" onChange={e => setTripPhotos(Array.from(e.target.files))} />
                     <button className="save-btn" onClick={addTrip} disabled={isUploading}>{isUploading ? 'Uploading...' : 'Save Trip'}</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 🌟 STANDARD SIDEBAR (Search, Tags, Country List) */
            <>
              <div className="sidebar-search">
                <input type="text" className="search-glass" placeholder="Search visited..." onChange={e => setSearchQuery(e.target.value)} />
              </div>

              {dynamicTags.length > 0 && (
                <div className="filter-section">
                  <span className="filter-title">Filter by Tag</span>
                  <div className={`filter-chips ${!isTagsExpanded ? 'collapsed' : 'expanded'}`}>
                    {dynamicTags.map(tag => (
                      <button key={tag} className={`filter-chip ${activeFilters.includes(tag) ? 'active' : ''}`} onClick={() => toggleFilter(tag)}>{tag}</button>
                    ))}
                  </div>
                  {dynamicTags.length > 6 && (
                    <button className="tag-toggle-btn" onClick={() => setIsTagsExpanded(!isTagsExpanded)}>
                      {isTagsExpanded ? 'Show Less ▴' : 'Show More ▾'}
                    </button>
                  )}
                </div>
              )}

              <div className="c-list scroll-hide">
                {filteredList.map((c, i) => (
                  <div key={c.name} className="c-card" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="c-card-head" onClick={() => setExpandedCountry(expandedCountry === c.name ? null : c.name)}>
                      <span>{c.name}</span> <span className="badge">{c.trips.length}</span>
                    </div>
                    {expandedCountry === c.name && (
                      <div className="c-card-body anim-slide-down">
                        {c.trips.map((t, idx) => {
                          const hasPhotos = (t.photoUrls && t.photoUrls.length > 0) || t.photoUrl;
                          const safeName = (t.name && t.name.trim() !== "") ? t.name : "Unnamed Trip";
                          const safeTag = (t.tag && t.tag.trim() !== "") ? t.tag : "";
                          return (
                            <div key={idx} className="t-pill" onClick={() => openCountryFromSidebar(c.name, idx)}>
                              <div className="t-pill-left">
                                <span className="t-name-text">{safeName}</span>
                                {safeTag && <span className="t-tag-badge">{safeTag}</span>}
                                {hasPhotos && <span className="t-photo-icon">📸</span>}
                              </div>
                              <button className="delete-trip-btn" onClick={(e) => { e.stopPropagation(); deleteTrip(c.name, idx); }}>✕</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="s-footer">
                <p className="quote">"The world is a book, and those who do not travel read only one page."<br/><span>– Saint Augustine</span></p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;