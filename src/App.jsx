import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css'; // Import the new CSS file

function App() {
  const habits = [
    "The Board", "Workbook", "Work on Mistakes (WB)", "Student's Book", "Sentences", 
    "Dialogues", "Essay", "Reading", "Work on Mistakes (Read)", "Tactics Workbook", 
    "Tactics Listening", "Work on Mistakes (Tactics)", "Grammar", 
    "Work on Mistakes (Grammar)", "Vocabulary", "Work on Mistakes (Vocab)"
  ];
  const lessons = [1, 2, 3];
  const totalWeeks = 4;

  const ADMIN_ID = "123456789"; // Replace with your actual ID

  const [currentWeek, setCurrentWeek] = useState(1);
  const [gridData, setGridData] = useState({});
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [formData, setFormData] = useState({ firstName: "", lastName: "" });
  const [view, setView] = useState('user'); // 'user', 'admin', 'view-student'
  const [students, setStudents] = useState([]);
  const [inspectingStudent, setInspectingStudent] = useState(null);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe?.user) {
      const id = tg.initDataUnsafe.user.id.toString();
      setUserId(id);
      checkUser(id);
    }
  }, []);

  const checkUser = async (id) => {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', id).single();
    if (profile) {
      setIsRegistered(true);
      setUserName(profile.full_name);
      loadSavedProgress(id);
    }
  };

  const loadSavedProgress = async (id) => {
    const { data } = await supabase.from('progress').select('task_key, is_done').eq('user_id', id);
    if (data) {
      const loadedGrid = {};
      data.forEach(row => { loadedGrid[row.task_key] = row.is_done; });
      setGridData(loadedGrid);
    }
  };

  const handleRegister = async () => {
    const fullName = `${formData.firstName} ${formData.lastName}`;
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, full_name: fullName });
    if (!error) {
      setUserName(fullName);
      setIsRegistered(true);
      loadSavedProgress(userId);
    }
  };

  const styles = {
  // ... your other styles
  modernInput: {
    backgroundColor: '#f5f5f7',
    border: 'none',
    padding: '15px',
    borderRadius: '12px',
    fontSize: '16px',
    marginBottom: '12px',
    width: '100%',
    boxSizing: 'border-box',
    color: 'var(--dark-teal)'
  }
};

  const handleLogout = async () => {
  if (window.confirm("This will reset your profile name. Are you sure?")) {
    // 1. Delete the profile from Supabase so checkUser doesn't find it
    await supabase.from('profiles').delete().eq('user_id', userId);

    // 2. Clear local states
    setIsRegistered(false);
    setUserName("");
    setGridData({});
    setRegStep(1);
    
    // 3. Reload to start fresh
    window.location.reload();
  }
};

  const toggleCell = async (task, lesson) => {
  if (view === 'view-student') return;
  
  const key = `${task}-W${currentWeek}-L${lesson}`;
  const newValue = !gridData[key];
  
  // 1. Update UI instantly
  setGridData(prev => ({ ...prev, [key]: newValue }));

  // 2. Save to Database
  const { error } = await supabase
    .from('progress')
    .upsert(
      { 
        user_id: userId, 
        task_key: key, 
        is_done: newValue 
      }, 
      { onConflict: 'user_id, task_key' } // This matches your SQL constraint name
    );

  if (error) {
    console.error("Error saving to Supabase:", error.message);
  }
};

  const calculateCoef = (data) => {
    const total = habits.length * totalWeeks * 3;
    const done = Object.values(data).filter(v => v === true).length;
    return ((done / total) * 100).toFixed(1);
  };

  // --- Registration UI ---
  // --- Registration UI (Modernized) ---
  if (!isRegistered && userId) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ backgroundColor: 'var(--primary-green)', width: '60px', height: '60px', borderRadius: '20px', margin: '0 auto 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             <span style={{ fontSize: '30px' }}>✍️</span>
          </div>
          <h2 style={{ color: 'var(--dark-teal)', fontSize: '28px', marginBottom: '8px' }}>Welcome</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>Please set up your student profile</p>
        </div>

        <div style={{ width: '100%', maxWidth: '300px' }}>
          <input 
            className="input-field" 
            placeholder="First Name"
            style={styles.modernInput}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
          />
          <input 
            className="input-field" 
            placeholder="Family Name"
            style={styles.modernInput}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
          />
          <button 
            className="primary-btn" 
            style={{ marginTop: '10px', height: '50px', borderRadius: '15px', fontSize: '16px' }}
            onClick={handleRegister}
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  // --- Admin Student List ---
  if (view === 'admin') {
    return (
      <div className="container">
        <button onClick={() => setView('user')} className="nav-btn" style={{width: 'auto', borderRadius: '8px', padding: '0 10px'}}>← Back</button>
        <h2 style={{color: 'var(--dark-teal)'}}>Students</h2>
        {students.map(s => (
          <div key={s.user_id} className="stat-card" onClick={async () => {
            const { data } = await supabase.from('progress').select('task_key, is_done').eq('user_id', s.user_id);
            const loaded = {};
            if(data) data.forEach(r => loaded[r.task_key] = r.is_done);
            setInspectingStudent({...s, grid: loaded});
            setView('view-student');
          }}>
            <span>{s.full_name}</span>
            <span>View →</span>
          </div>
        ))}
      </div>
    );
  }

  const activeData = view === 'view-student' ? inspectingStudent.grid : gridData;

  return (
    <div className="container">
      <header className="header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <h1 className="welcome-text">{view === 'view-student' ? inspectingStudent.full_name : userName}</h1>
          {userId === ADMIN_ID && view === 'user' && (
            <button onClick={async () => {
              const { data } = await supabase.from('profiles').select('*');
              setStudents(data || []);
              setView('admin');
            }} className="primary-btn" style={{width: 'auto', padding: '6px 12px'}}>Admin</button>
          )}
          {view === 'view-student' && <button onClick={() => setView('admin')} className="primary-btn" style={{width: 'auto'}}>Close</button>}
        </div>
        <div className="stat-card">
          <span>Overall Coefficient</span>
          <span style={{fontSize: '20px', fontWeight: 'bold'}}>{calculateCoef(activeData)}%</span>
        </div>
      </header>

      <div className="nav-bar">
        <button className="nav-btn" onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}>←</button>
        <span style={{fontWeight: 'bold', color: 'var(--dark-teal)'}}>WEEK {currentWeek}</span>
        <button className="nav-btn" onClick={() => setCurrentWeek(w => Math.min(totalWeeks, w + 1))}>→</button>
      </div>

      <div className="table-wrapper">
        <div className="grid-layout">
          <div className="header-cell">HABITS</div>
          {lessons.map(l => <div key={l} className="header-cell">L{l}</div>)}
          
          {habits.map(habit => (
            <React.Fragment key={habit}>
              <div className="habit-label">{habit}</div>
              {lessons.map(l => {
                const isDone = activeData[`${habit}-W${currentWeek}-L${l}`];
                return (
                  <div 
                    key={l} 
                    onClick={() => toggleCell(habit, l)}
                    className="cell"
                    style={{ backgroundColor: isDone ? 'var(--primary-green)' : 'var(--light-gray)' }}
                  >
                    {isDone && '✓'}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      {/* ... existing table code ... */}
      
      <button 
        onClick={handleLogout} 
        style={{
          marginTop: '40px',
          background: 'none',
          border: 'none',
          color: '#ff3b30', // Red color for logout
          fontSize: '14px',
          width: '100%',
          cursor: 'pointer'
        }}
      >
        Log Out / Reset Profile
      </button>
    </div> // This is the final closing div of the container
  );
}

export default App;