import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [fid, setFid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sdk, setSdk] = useState(null);

  // Initialize SDK dan load cached data sekaligus
  useEffect(() => {
    const initializeApp = async () => {
      if (window.telegram && window.telegram.WebApp) {
        const telegramSdk = window.telegram.WebApp;
        setSdk(telegramSdk);
        
        // Cek cache dulu sebelum fetch
        const cachedData = localStorage.getItem('farcaster-cached-data');
        if (cachedData) {
          const { cachedFid, cachedProfile, timestamp } = JSON.parse(cachedData);
          // Gunakan cache jika kurang dari 5 menit
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setFid(cachedFid);
            setProfile(cachedProfile);
          }
        }
        
        // Tetap fetch data terbaru di background
        await fetchUserData(telegramSdk);
      }
    };

    initializeApp();
  }, []);

  const fetchUserData = async (sdkInstance = sdk) => {
    if (!sdkInstance) return;
    
    setLoading(true);
    try {
      // Parallel fetching untuk FID dan profile
      const userPromise = sdkInstance.getUser();
      const userData = await userPromise;
      const userFid = userData.fid;
      
      setFid(userFid);

      // Langsung fetch profile tanpa menunggu state update
      const profilePromise = sdkInstance.lookupUserByFid(userFid);
      const profileData = await profilePromise;
      
      setProfile(profileData);

      // Cache data untuk下次使用
      localStorage.setItem('farcaster-cached-data', JSON.stringify({
        cachedFid: userFid,
        cachedProfile: profileData,
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyFid = () => {
    if (fid) {
      navigator.clipboard.writeText(fid.toString());
      // Bisa tambahkan toast notification di sini
      alert("FID copied to clipboard!");
    }
  };

  const refreshData = () => {
    // Clear cache dan refresh
    localStorage.removeItem('farcaster-cached-data');
    fetchUserData();
  };

  return (
    <div className="app">
      <h1>Farcaster ID Checker</h1>
      <p>Your Farcaster profile information</p>
      
      <div className="profile-section">
        {/* Profile Picture - Load First */}
        <div className="profile-picture">
          <strong>Profile Picture</strong>
          {profile?.pfp ? (
            <img 
              src={profile.pfp} 
              alt="Profile" 
              className="profile-img"
              onLoad={() => console.log("Image loaded")}
              onError={(e) => {
                e.target.style.display = 'none';
                console.log("Image failed to load");
              }}
            />
          ) : loading ? (
            <div className="skeleton skeleton-image"></div>
          ) : (
            <div>No profile image</div>
          )}
        </div>

        {/* FID - Show Immediately if Available */}
        <div className="fid-section">
          <strong>FID: </strong>
          {fid ? (
            <span>{fid}</span>
          ) : loading ? (
            <div className="skeleton skeleton-text"></div>
          ) : (
            <span>---</span>
          )}
        </div>

        {/* Action Buttons - Always Visible */}
        <div className="actions">
          <button onClick={copyFid} disabled={!fid}>
            Copy FID
          </button>
          <button onClick={refreshData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Username and Bio - Load When Ready */}
        <div className="profile-details">
          <div className="detail-item">
            <strong>Username:</strong>
            {profile?.username ? (
              <span>@{profile.username}</span>
            ) : loading ? (
              <div className="skeleton skeleton-text short"></div>
            ) : (
              <span>-</span>
            )}
          </div>
          
          <div className="detail-item">
            <strong>Bio:</strong>
            {profile?.bio ? (
              <span>{profile.bio}</span>
            ) : loading ? (
              <div className="skeleton skeleton-text"></div>
            ) : (
              <span>-</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
