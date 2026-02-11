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

  const ADMIN_ID = "123456789"; // REPLACE WITH YOUR ACTUAL ID

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
    const { data } = await supabase.from('progress').select('task_key, is_done').eq('user_id', id);
    if (data) {
      const loadedGrid = {};
      data.forEach(row => { loadedGrid[row.task_key] = row.is_done; });
      setGridData(loadedGrid);
    }
  };

  const handleRegister = async () => {
    if (!formData.firstName || !formData.lastName) return alert("Please fill both fields");
    const fullName = `${formData.firstName} ${formData.lastName}`;
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, full_name: fullName });
    if (!error) {
      setUserName(fullName);
      setIsRegistered(true);
      loadSavedProgress(userId);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("This will reset your profile. Continue?")) {
      await supabase.from('profiles').delete().eq('user_id', userId);
      setIsRegistered(false);
      setUserName("");
      setGridData({});
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

  // --- MODERN REGISTRATION UI ---
  if (!isRegistered && userId) {
    return (
      <div className="container registration-screen">
        <div className="logo-box">✍️</div>
        <h2 className="title">Welcome</h2>
        <p className="subtitle">Enter your details to start tracking</p>
        
        <div className="input-group">
          <input 
            className="modern-input" 
            placeholder="First Name"
            onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
          />
          <input 
            className="modern-input" 
            placeholder="Family Name"
            onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
          />
          <button className="primary-btn register-btn" onClick={handleRegister}>
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  // --- ADMIN LIST ---
  if (view === 'admin') {
    return (
      <div className="container">
        <button onClick={() => setView('user')} className="nav-btn-back">← Back</button>
        <h2 className="admin-title">Student List</h2>
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
        <div className="header-top">
          <h1 className="welcome-text">{view === 'view-student' ? inspectingStudent.full_name : userName}</h1>
          {userId === ADMIN_ID && view === 'user' && (
            <button onClick={async () => {
              const { data } = await supabase.from('profiles').select('*');
              setStudents(data || []);
              setView('admin');
            }} className="admin-badge">Admin</button>
          )}
          {view === 'view-student' && <button onClick={() => setView('admin')} className="admin-badge">Close</button>}
        </div>
        <div className="stat-card main-stats">
          <span>Overall Coefficient</span>
          <span className="coef-number">{calculateCoef(activeData)}%</span>
        </div>
      </header>

      <div className="nav-bar">
        <button className="nav-btn" onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}>←</button>
        <span className="week-label">WEEK {currentWeek}</span>
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
      
      <button className="logout-btn" onClick={handleLogout}>Reset Profile</button>
    </div>
  );
}

export default App;