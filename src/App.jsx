import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const taskNames = ["Morning Exercise", "Read 10 Pages", "Code for 1 hour"];
  
  // REPLACE THIS with your actual Telegram ID (as a string)
  const ADMIN_ID = "123456789"; 

  const [gridData, setGridData] = useState({});
  const [userName, setUserName] = useState("Student");
  const [userId, setUserId] = useState(null);
  const [view, setView] = useState('user'); // 'user' or 'admin'
  const [allStats, setAllStats] = useState([]);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    if (tg.initDataUnsafe?.user) {
      const id = tg.initDataUnsafe.user.id.toString();
      setUserName(tg.initDataUnsafe.user.first_name);
      setUserId(id);
      loadSavedProgress(id);
    }
  }, []);

  // --- STUDENT: Load Data ---
  const loadSavedProgress = async (id) => {
    const { data } = await supabase.from('progress').select('task_key, is_done').eq('user_id', id);
    if (data) {
      const loadedGrid = {};
      data.forEach(row => { loadedGrid[row.task_key] = row.is_done; });
      setGridData(loadedGrid);
    }
  };

  // --- STUDENT: Toggle Cell ---
  const toggleCell = async (task, day) => {
    const key = `${task}-${day}`;
    const newValue = !gridData[key];
    setGridData(prev => ({ ...prev, [key]: newValue }));
    if (userId) {
      await supabase.from('progress').upsert({ user_id: userId, task_key: key, is_done: newValue }, { onConflict: 'user_id, task_key' });
    }
  };

  // --- ADMIN: Load All Students ---
  const loadAdminDashboard = async () => {
    const { data, error } = await supabase.from('progress').select('*');
    if (data) {
      // Group data by user_id to show a nice list
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = { id: curr.user_id, total: 0 };
        if (curr.is_done) acc[curr.user_id].total += 1;
        return acc;
      }, {});
      setAllStats(Object.values(grouped));
      setView('admin');
    }
  };

  // --- RENDER ADMIN VIEW ---
  if (view === 'admin') {
    return (
      <div style={styles.container}>
        <button onClick={() => setView('user')} style={styles.backButton}>← Back to My Tracker</button>
        <h2>Admin Dashboard</h2>
        <p>Total completion count per student:</p>
        <div style={styles.adminList}>
          {allStats.map(stat => (
            <div key={stat.id} style={styles.adminCard}>
              <span>Student ID: <strong>{stat.id}</strong></span>
              <span style={styles.badge}>{stat.total} Tasks Done</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER STUDENT VIEW ---
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{userName}'s Tracker</h2>
          {userId === ADMIN_ID && (
            <button onClick={loadAdminDashboard} style={styles.adminToggle}>Admin</button>
          )}
        </div>
      </header>

      <div style={styles.tableWrapper}>
        <div style={styles.grid}>
          <div style={styles.headerCell}>Task</div>
          {days.map(day => <div key={day} style={styles.headerCell}>{day}</div>)}
          {taskNames.map(task => (
            <React.Fragment key={task}>
              <div style={styles.taskLabel}>{task}</div>
              {days.map(day => {
                const isDone = gridData[`${task}-${day}`];
                return (
                  <div key={`${task}-${day}`} onClick={() => toggleCell(task, day)}
                    style={{ ...styles.cell, backgroundColor: isDone ? '#4CAF50' : '#e0e0e0' }}>
                    {isDone && '✓'}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '15px', fontFamily: 'sans-serif', backgroundColor: '#fff', minHeight: '100vh' },
  header: { marginBottom: '20px' },
  tableWrapper: { overflowX: 'auto' },
  grid: { display: 'grid', gridTemplateColumns: '120px repeat(7, 40px)', gap: '8px', alignItems: 'center' },
  headerCell: { fontWeight: 'bold', fontSize: '11px', textAlign: 'center', color: '#888', textTransform: 'uppercase' },
  taskLabel: { fontSize: '13px', fontWeight: '500', color: '#333' },
  cell: { width: '35px', height: '35px', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'white' },
  adminToggle: { padding: '5px 10px', fontSize: '12px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' },
  backButton: { marginBottom: '15px', padding: '8px', border: 'none', background: 'none', color: '#0088cc', cursor: 'pointer', fontWeight: 'bold' },
  adminList: { marginTop: '20px' },
  adminCard: { padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#4CAF50', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }
};

export default App;