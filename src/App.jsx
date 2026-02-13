import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css'; 

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
  const [formData, setFormData] = useState({ firstName: "", lastName: "" });
  const [view, setView] = useState('user'); 
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
  const { data, error } = await supabase
    .from('progress')
    .select('data, full_name')
    .eq('user_id', id)
    .single();

  if (data) {
    // data.data contains our "done/not done" object
    setGridData(data.data || {});
    if (!userName) setUserName(data.full_name);
  }
};

  const handleRegister = async () => {
  if (!formData.firstName || !formData.lastName) return alert("Please enter both names");
  const fullName = `${formData.firstName} ${formData.lastName}`;
  
  // Save to profiles
  await supabase.from('profiles').upsert({ user_id: userId, full_name: fullName });
  
  // Initialize the progress row with the full_name
  const { error } = await supabase.from('progress').upsert({ 
    user_id: userId, 
    full_name: fullName,
    data: {} 
  });

  if (!error) {
    setUserName(fullName);
    setIsRegistered(true);
  }
};

  const handleLogout = async () => {
    if (window.confirm("This will reset your profile. Are you sure?")) {
      await supabase.from('profiles').delete().eq('user_id', userId);
      setIsRegistered(false);
      setUserName("");
      setGridData({});
      window.location.reload();
    }
  };

  const toggleCell = async (task, lesson) => {
  if (view === 'view-student' || !userId) return;

  const cleanTaskName = task.replace(/\s+/g, '').replace(/[()]/g, '');
  const key = `${cleanTaskName}-W${currentWeek}-L${lesson}`;
  
  // 1. Create the new state locally
  const newGridData = { ...gridData, [key]: !gridData[key] };
  setGridData(newGridData);

  // 2. Save the ENTIRE object to the 'data' column
  const { error } = await supabase
    .from('progress')
    .upsert({ 
      user_id: userId, 
      full_name: userName, // Keep the name updated
      data: newGridData    // This is the JSON object
    });

  if (error) {
    alert("Save Error: " + error.message);
  }
};

  const calculateCoef = (data) => {
    const total = habits.length * totalWeeks * 3;
    const done = Object.values(data).filter(v => v === true).length;
    return ((done / total) * 100).toFixed(1);
  };

  const styles = {
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

  // --- Registration UI (Modernized) ---
  if (!isRegistered && userId) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ backgroundColor: 'var(--primary-green)', width: '70px', height: '70px', borderRadius: '22px', margin: '0 auto 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(0, 148, 114, 0.2)' }}>
             <span style={{ fontSize: '32px' }}>✍️</span>
          </div>
          <h2 style={{ color: 'var(--dark-teal)', fontSize: '28px', fontWeight: '800', margin: '0' }}>Welcome</h2>
          <p style={{ color: '#8e8e93', fontSize: '15px', marginTop: '8px' }}>Please set up your student profile</p>
        </div>

        <div style={{ width: '100%', maxWidth: '320px' }}>
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
            style={{ marginTop: '10px', height: '54px', borderRadius: '16px', fontSize: '17px', fontWeight: 'bold' }}
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
        <button onClick={() => setView('user')} className="nav-btn" style={{width: 'auto', borderRadius: '8px', padding: '0 10px', marginBottom: '15px'}}>← Back</button>
        <h2 style={{color: 'var(--dark-teal)'}}>Student List</h2>
        {students.map(s => (
          <div key={s.user_id} className="stat-card" style={{ marginBottom: '10px', cursor: 'pointer' }} onClick={async () => {
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
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
          <h1 className="welcome-text" style={{ fontSize: '24px' }}>{view === 'view-student' ? inspectingStudent.full_name : userName}</h1>
          {userId === ADMIN_ID && view === 'user' && (
            <button onClick={async () => {
              const { data } = await supabase.from('profiles').select('*');
              setStudents(data || []);
              setView('admin');
            }} className="primary-btn" style={{width: 'auto', padding: '6px 14px', borderRadius: '20px', fontSize: '12px'}}>Admin</button>
          )}
          {view === 'view-student' && <button onClick={() => setView('admin')} className="primary-btn" style={{width: 'auto', padding: '6px 14px', borderRadius: '20px', fontSize: '12px'}}>Close</button>}
        </div>
        <div className="stat-card" style={{ backgroundColor: 'var(--dark-teal)', color: 'white' }}>
          <span>Overall Coefficient</span>
          <span style={{fontSize: '24px', fontWeight: '800'}}>{calculateCoef(activeData)}%</span>
        </div>
      </header>

      <div className="nav-bar">
        <button className="nav-btn" onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}>←</button>
        <span style={{fontWeight: '800', color: 'var(--dark-teal)'}}>WEEK {currentWeek}</span>
        <button className="nav-btn" onClick={() => setCurrentWeek(w => Math.min(totalWeeks, w + 1))}>→</button>
      </div>

      <div className="table-wrapper">
        <div className="grid-layout">
          <div className="header-cell">HABITS</div>
          {lessons.map(l => <div key={l} className="header-cell">L{l}</div>)}
          
          {habits.map(habit => {
            // MATCHING LOGIC: Generate the same clean key used for saving
            const cleanTaskName = habit.replace(/\s+/g, '').replace(/[()]/g, '');
            
            return (
              <React.Fragment key={habit}>
                <div className="habit-label">{habit}</div>
                {lessons.map(l => {
                  const dataKey = `${cleanTaskName}-W${currentWeek}-L${l}`;
                  const isDone = activeData[dataKey];
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
            );
          })}
        </div>
      </div>
      
      <button 
        onClick={handleLogout} 
        style={{
          marginTop: '40px',
          background: 'none',
          border: '1px solid #ff3b30',
          borderRadius: '12px',
          padding: '12px',
          color: '#ff3b30',
          fontSize: '14px',
          fontWeight: 'bold',
          width: '100%',
          cursor: 'pointer'
        }}
      >
        Reset Profile
      </button>
    </div>
  );
}

export default App;