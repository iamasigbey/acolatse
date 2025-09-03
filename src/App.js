import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Welcome from './pages/SplashScreen';
import StudentLogin from './pages/StudentLogin';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import ManageStudents from './pages/admin/ManageStudents';
import ManageEvents from './pages/admin/ManageEvents';
import ManagePartners from './pages/admin/ManagePartners';
import Announcement from './pages/admin/Announcement';
import MyDates from "./pages/student/MyDates";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/admin/students" element={<ManageStudents />} />
        <Route path="/admin/events" element={<ManageEvents />} />
        <Route path="/admin/partners" element={<ManagePartners />} />
        <Route path="/mydates" element={<MyDates />} />
        <Route path="/admin/announcements" element={<Announcement />} />
      </Routes>
    </div>
  );
}

export default App;