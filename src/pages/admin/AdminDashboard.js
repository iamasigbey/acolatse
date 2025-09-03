import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faChevronLeft,
  faBars,
  faUserShield,
  faUser,
  faTachometerAlt,
  faUsers,
  faCalendarAlt,
  faHandshake,
  faBullhorn,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { Route, Routes, Link, Navigate, useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import ManageStudents from "./ManageStudents";
import ManageEvents from "./ManageEvents";
import ManagePartners from "./ManagePartners";
import Announcement from "./Announcement";
import Swal from "sweetalert2";

// Dashboard Component
const Dashboard = ({ stats }) => {
  const [studentsWithProfilePic, setStudentsWithProfilePic] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const studentsList = studentsSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((student) => student.profilePicUrl); // Filter students with profilePicUrl
        setStudentsWithProfilePic(studentsList);
      } catch (error) {
        console.error("Error fetching students:", error);
        Swal.fire("Error!", "Failed to load students.", "error");
      }
    };
    fetchStudents();
  }, []);

  return (
    <main className="p-6">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Total Students", value: stats.totalStudents, icon: faUsers, bg: "bg-indigo-100", color: "text-indigo-600" },
          { title: "Upcoming Events", value: stats.upcomingEvents, icon: faCalendarAlt, bg: "bg-blue-100", color: "text-blue-600" },
          { title: "Active Pairings", value: stats.activePairings, icon: faHandshake, bg: "bg-green-100", color: "text-green-600" },
          {
            title: "Students with Profile Picture",
            value: studentsWithProfilePic.length,
            icon: faUser,
            bg: "bg-purple-100",
            color: "text-purple-600",
          },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">{stat.title}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                <FontAwesomeIcon icon={stat.icon} className="text-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Students with Profile Picture Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Students with Profile Picture</h2>
        </div>
        <div className="max-h-96 overflow-y-auto"> {/* Scrollable table body */}
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">ID Number</th>
                <th className="px-6 py-3">Gender</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Profile Picture</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithProfilePic.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No students with profile pictures.
                  </td>
                </tr>
              ) : (
                studentsWithProfilePic.map((student, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-6 py-4">{student.name}</td>
                    <td className="px-6 py-4">{student.idNumber}</td>
                    <td className="px-6 py-4">{student.gender}</td>
                    <td className="px-6 py-4">{student.phone}</td>
                    <td className="px-6 py-4">
                      {student.profilePicUrl ? (
                        <img
                          src={student.profilePicUrl}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

// Main AdminDashboard Component
const AdminDashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: "0",
    upcomingEvents: "0",
    activePairings: "0",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        signOut(auth)
          .then(() => {
            Swal.fire({
              title: "Session Expired",
              text: "You have been logged out due to inactivity.",
              icon: "info",
              confirmButtonText: "OK",
            }).then(() => {
              navigate("/admin-login");
            });
          })
          .catch((error) => {
            console.error("Error signing out:", error);
          });
      }, 10 * 60 * 1000); // 10 minutes
    };

    // Reset timer on user activity
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // Start timer on mount

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [navigate]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const pairingsSnapshot = await getDocs(collection(db, "partners"));
        const upcomingEvents = eventsSnapshot.docs.filter((doc) => doc.data().status === "Upcoming").length;

        setStats({
          totalStudents: studentsSnapshot.size.toString(),
          upcomingEvents: upcomingEvents.toString(),
          activePairings: pairingsSnapshot.size.toString(),
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        Swal.fire("Error!", "Failed to load dashboard stats.", "error");
      }
    };
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleOverlayClick = () => {
    setIsMobileMenuOpen(false);
  };

  // Handle manual logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Swal.fire({
        title: "Logged Out",
        text: "You have been logged out successfully.",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/admin-login");
      });
    } catch (error) {
      console.error("Error signing out:", error);
      Swal.fire("Error!", "Failed to log out.", "error");
    }
  };

  // Redirect to login if not authenticated
  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  return (
    <div className="bg-gray-100 font-sans min-h-screen">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-20">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md bg-indigo-600 text-white"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-[5] ${
          isMobileMenuOpen ? "block" : "hidden"
        } md:hidden`}
        onClick={handleOverlayClick}
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed h-full bg-indigo-800 text-white flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "w-[70px]" : "w-64"
        } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 z-10`}
      >
        <div className="p-4 flex items-center space-x-2 border-b border-indigo-700">
          <FontAwesomeIcon icon={faUserShield} className="text-2xl" />
          <span className={`${isSidebarCollapsed ? "hidden" : ""} text-xl font-bold`}>
            Admin Panel
          </span>
        </div>
        <div className="p-4 flex items-center space-x-2 border-b border-indigo-700">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
            <FontAwesomeIcon icon={faUser} />
          </div>
          <div className={`${isSidebarCollapsed ? "hidden" : ""}`}>
            <p className="font-medium">Admin User</p>
            <p className="text-xs text-indigo-300">Super Admin</p>
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {[
              { icon: faTachometerAlt, text: "Dashboard", to: "/admin-dashboard" },
              { icon: faUsers, text: "Manage Students", to: "/admin/students" },
              { icon: faCalendarAlt, text: "Manage Events", to: "/admin/events" },
              { icon: faHandshake, text: "Manage Partners", to: "/admin/partners" },
              { icon: faBullhorn, text: "Announcements", to: "/admin/announcements" },
            ].map((item, index) => (
              <li key={index}>
                <Link
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 p-2 rounded transition hover:bg-indigo-700 ${
                    isSidebarCollapsed ? "justify-center" : ""
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} />
                  <span className={`${isSidebarCollapsed ? "hidden" : ""}`}>
                    {item.text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-indigo-700 hidden md:block">
          <button
            onClick={toggleSidebar}
            className={`flex items-center space-x-3 p-2 rounded hover:bg-indigo-700 transition w-full ${
              isSidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <FontAwesomeIcon icon={isSidebarCollapsed ? faChevronRight : faChevronLeft} />
            <span className={`${isSidebarCollapsed ? "hidden" : ""}`}>
              {isSidebarCollapsed ? "Expand" : "Collapse"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? "ml-[70px]" : "ml-64"
        } md:ml-64`}
      >
        <nav className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="p-2 rounded-full hover:bg-gray-200">
                <FontAwesomeIcon icon={faBell} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
            <div className="relative">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <FontAwesomeIcon icon={faUser} />
                </div>
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard stats={stats} />} />
          <Route path="/students" element={<ManageStudents />} />
          <Route path="/events" element={<ManageEvents />} />
          <Route path="/partners" element={<ManagePartners />} />
          <Route path="/announcements" element={<Announcement />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;

// import React, { useState, useEffect } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faChevronRight,
//   faChevronLeft,
//   faBars,
//   faUserShield,
//   faUser,
//   faTachometerAlt,
//   faUsers,
//   faCalendarAlt,
//   faHandshake,
//   faBullhorn,
//   faBell,
// } from "@fortawesome/free-solid-svg-icons";
// import { Route, Routes, Link } from "react-router-dom";
// import { db } from "./firebase";
// import { collection, getDocs } from "firebase/firestore";
// import ManageStudents from "./ManageStudents";
// import ManageEvents from "./ManageEvents";
// import ManagePartners from "./ManagePartners";
// import Announcement from "./Announcement";

// // Dashboard Component
// const Dashboard = ({ stats }) => {
//   const [students, setStudents] = useState([]);

//   useEffect(() => {
//     const fetchStudents = async () => {
//       const studentsSnapshot = await getDocs(collection(db, "students"));
//       setStudents(studentsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
//     };
//     fetchStudents();
//   }, []);

//   return (
//     <main className="p-6">
//       <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//         {[
//           { title: "Total Students", value: stats.totalStudents, icon: faUsers, bg: "bg-indigo-100", color: "text-indigo-600" },
//           { title: "Upcoming Events", value: stats.upcomingEvents, icon: faCalendarAlt, bg: "bg-blue-100", color: "text-blue-600" },
//           { title: "Active Pairings", value: stats.activePairings, icon: faHandshake, bg: "bg-green-100", color: "text-green-600" },
//         ].map((stat, index) => (
//           <div key={index} className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-gray-500">{stat.title}</p>
//                 <h3 className="text-2xl font-bold">{stat.value}</h3>
//               </div>
//               <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
//                 <FontAwesomeIcon icon={stat.icon} className="text-xl" />
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Logged-in Students Table */}
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="px-6 py-4 border-b border-gray-200">
//           <h2 className="text-xl font-semibold">Logged-in Students</h2>
//         </div>
//         <table className="w-full text-left">
//           <thead>
//             <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
//               <th className="px-6 py-3">Name</th>
//               <th className="px-6 py-3">ID Number</th>
//               <th className="px-6 py-3">Gender</th>
//               <th className="px-6 py-3">Phone</th>
//             </tr>
//           </thead>
//           <tbody>
//             {students.map((student, index) => (
//               <tr key={index} className="border-t">
//                 <td className="px-6 py-4">{student.name}</td>
//                 <td className="px-6 py-4">{student.idNumber}</td>
//                 <td className="px-6 py-4">{student.gender}</td>
//                 <td className="px-6 py-4">{student.phone}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </main>
//   );
// };

// // Main AdminDashboard Component
// const AdminDashboard = () => {
//   const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [stats, setStats] = useState({
//     totalStudents: "0",
//     upcomingEvents: "0",
//     activePairings: "0",
//   });

//   useEffect(() => {
//     const fetchStats = async () => {
//       const studentsSnapshot = await getDocs(collection(db, "students"));
//       const eventsSnapshot = await getDocs(collection(db, "events"));
//       const pairingsSnapshot = await getDocs(collection(db, "partners"));
//       const upcomingEvents = eventsSnapshot.docs.filter((doc) => doc.data().status === "Upcoming").length;

//       setStats({
//         totalStudents: studentsSnapshot.size.toString(),
//         upcomingEvents: upcomingEvents.toString(),
//         activePairings: pairingsSnapshot.size.toString(),
//       });
//     };
//     fetchStats();
//   }, []);

//   const toggleSidebar = () => {
//     setIsSidebarCollapsed(!isSidebarCollapsed);
//   };

//   const toggleMobileMenu = () => {
//     setIsMobileMenuOpen(!isMobileMenuOpen);
//   };

//   const handleOverlayClick = () => {
//     setIsMobileMenuOpen(false);
//   };

//   return (
//     <div className="bg-gray-100 font-sans min-h-screen">
//       {/* Mobile Menu Button */}
//       <div className="md:hidden fixed top-4 left-4 z-20">
//         <button
//           onClick={toggleMobileMenu}
//           className="p-2 rounded-md bg-indigo-600 text-white"
//         >
//           <FontAwesomeIcon icon={faBars} />
//         </button>
//       </div>

//       {/* Overlay for mobile */}
//       <div
//         className={`fixed inset-0 bg-black bg-opacity-50 z-[5] ${
//           isMobileMenuOpen ? "block" : "hidden"
//         } md:hidden`}
//         onClick={handleOverlayClick}
//       ></div>

//       {/* Sidebar */}
//       <div
//         className={`fixed h-full bg-indigo-800 text-white flex flex-col transition-all duration-300 ${
//           isSidebarCollapsed ? "w-[70px]" : "w-64"
//         } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 z-10`}
//       >
//         <div className="p-4 flex items-center space-x-2 border-b border-indigo-700">
//           <FontAwesomeIcon icon={faUserShield} className="text-2xl" />
//           <span className={`${isSidebarCollapsed ? "hidden" : ""} text-xl font-bold`}>
//             Admin Panel
//           </span>
//         </div>
//         <div className="p-4 flex items-center space-x-2 border-b border-indigo-700">
//           <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
//             <FontAwesomeIcon icon={faUser} />
//           </div>
//           <div className={`${isSidebarCollapsed ? "hidden" : ""}`}>
//             <p className="font-medium">Admin User</p>
//             <p className="text-xs text-indigo-300">Super Admin</p>
//           </div>
//         </div>
//         <div className="p-4 flex-1 overflow-y-auto">
//           <ul className="space-y-2">
//             {[
//               { icon: faTachometerAlt, text: "Dashboard", to: "/admin-dashboard" },
//               { icon: faUsers, text: "Manage Students", to: "/admin/students" },
//               { icon: faCalendarAlt, text: "Manage Events", to: "/admin/events" },
//               { icon: faHandshake, text: "Manage Partners", to: "/admin/partners" },
//               { icon: faBullhorn, text: "Announcements", to: "/admin/announcements" },
//             ].map((item, index) => (
//               <li key={index}>
//                 <Link
//                   to={item.to}
//                   onClick={() => setIsMobileMenuOpen(false)}
//                   className={`flex items-center space-x-3 p-2 rounded transition hover:bg-indigo-700 ${
//                     isSidebarCollapsed ? "justify-center" : ""
//                   }`}
//                 >
//                   <FontAwesomeIcon icon={item.icon} />
//                   <span className={`${isSidebarCollapsed ? "hidden" : ""}`}>
//                     {item.text}
//                   </span>
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </div>
//         <div className="p-4 border-t border-indigo-700 hidden md:block">
//           <button
//             onClick={toggleSidebar}
//             className={`flex items-center space-x-3 p-2 rounded hover:bg-indigo-700 transition w-full ${
//               isSidebarCollapsed ? "justify-center" : ""
//             }`}
//           >
//             <FontAwesomeIcon icon={isSidebarCollapsed ? faChevronRight : faChevronLeft} />
//             <span className={`${isSidebarCollapsed ? "hidden" : ""}`}>
//               {isSidebarCollapsed ? "Expand" : "Collapse"}
//             </span>
//           </button>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div
//         className={`min-h-screen transition-all duration-300 ${
//           isSidebarCollapsed ? "ml-[70px]" : "ml-64"
//         } md:ml-64`}
//       >
//         <nav className="bg-white shadow p-4 flex justify-between items-center">
//           <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
//           <div className="flex items-center space-x-4">
//             <div className="relative">
//               <button className="p-2 rounded-full hover:bg-gray-200">
//                 <FontAwesomeIcon icon={faBell} />
//                 <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
//               </button>
//             </div>
//             <div className="relative">
//               <button className="flex items-center space-x-2">
//                 <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
//                   <FontAwesomeIcon icon={faUser} />
//                 </div>
//                 <span className="hidden md:inline">Admin</span>
//               </button>
//             </div>
//           </div>
//         </nav>

//         <Routes>
//           <Route path="/" element={<Dashboard stats={stats} />} />
//           <Route path="/students" element={<ManageStudents />} />
//           <Route path="/events" element={<ManageEvents />} />
//           <Route path="/partners" element={<ManagePartners />} />
//           <Route path="/announcements" element={<Announcement />} />
//         </Routes>
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;

// // import React, { useState, useEffect } from 'react';
// // import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// // import {
// //   faChevronRight,
// //   faChevronLeft,
// //   faBars,
// //   faUserShield,
// //   faUser,
// //   faTachometerAlt,
// //   faUsers,
// //   faCalendarAlt,
// //   faHandshake,
// //   faCog,
// //   faBell,
// // } from '@fortawesome/free-solid-svg-icons';
// // import { Route, Routes, Link } from 'react-router-dom';
// // import { db } from './firebase';
// // import { collection, getDocs } from 'firebase/firestore';
// // import ManageStudents from './ManageStudents';
// // import ManageEvents from './ManageEvents';
// // import ManagePartners from './ManagePartners';

// // // Dashboard Component
// // const Dashboard = ({ stats }) => (
// //   <main className="p-6">
// //     <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
// //     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
// //       {[
// //         { title: 'Total Students', value: stats.totalStudents, icon: faUsers, bg: 'bg-indigo-100', color: 'text-indigo-600' },
// //         { title: 'Upcoming Events', value: stats.upcomingEvents, icon: faCalendarAlt, bg: 'bg-blue-100', color: 'text-blue-600' },
// //         { title: 'Active Pairings', value: stats.activePairings, icon: faHandshake, bg: 'bg-green-100', color: 'text-green-600' },
// //       ].map((stat, index) => (
// //         <div key={index} className="bg-white rounded-lg shadow p-6">
// //           <div className="flex items-center justify-between">
// //             <div>
// //               <p className="text-gray-500">{stat.title}</p>
// //               <h3 className="text-2xl font-bold">{stat.value}</h3>
// //             </div>
// //             <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
// //               <FontAwesomeIcon icon={stat.icon} className="text-xl" />
// //             </div>
// //           </div>
// //         </div>
// //       ))}
// //     </div>
// //   </main>
// // );

// // // Main AdminDashboard Component
// // const AdminDashboard = () => {
// //   const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
// //   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
// //   const [stats, setStats] = useState({
// //     totalStudents: '0',
// //     upcomingEvents: '0',
// //     activePairings: '0',
// //   });

// //   useEffect(() => {
// //     const fetchStats = async () => {
// //       const studentsSnapshot = await getDocs(collection(db, 'students'));
// //       const eventsSnapshot = await getDocs(collection(db, 'events'));
// //       const pairingsSnapshot = await getDocs(collection(db, 'pairings'));
// //       const upcomingEvents = eventsSnapshot.docs.filter(doc => doc.data().status === 'Upcoming').length;

// //       setStats({
// //         totalStudents: studentsSnapshot.size.toString(),
// //         upcomingEvents: upcomingEvents.toString(),
// //         activePairings: pairingsSnapshot.size.toString(),
// //       });
// //     };
// //     fetchStats();
// //   }, []);

// //   const toggleSidebar = () => {
// //     setIsSidebarCollapsed(!isSidebarCollapsed);
// //   };

// //   const toggleMobileMenu = () => {
// //     setIsMobileMenuOpen(!isMobileMenuOpen);
// //   };

// //   const handleOverlayClick = () => {
// //     setIsMobileMenuOpen(false);
// //   };

// //   return (
// //     <div className="bg-gray-100 font-sans min-h-screen">
// //       {/* Mobile Menu Button */}
// //       <div className="md:hidden fixed top-4 left-4 z-20">
// //         <button
// //           onClick={toggleMobileMenu}
// //           className="p-2 rounded-md bg-indigo-600 text-white"
// //         >
// //           <FontAwesomeIcon icon={faBars} />
// //         </button>
// //       </div>

// //       {/* Overlay for mobile */}
// //       <div
// //         className={`fixed inset-0 bg-black bg-opacity-50 z-[5] ${
// //           isMobileMenuOpen ? 'block' : 'hidden'
// //         } md:hidden`}
// //         onClick={handleOverlayClick}
// //       ></div>

// //       {/* Sidebar */}
// //       <div
// //         className={`fixed h-full bg-indigo-800 text-white flex flex-col transition-all duration-300 ${
// //           isSidebarCollapsed ? 'w-[70px]' : 'w-64'
// //         } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 z-10`}
// //       >
// //         <div className="p-4 flex items-center space-x-2 border-b border-indigo-700">
// //           <FontAwesomeIcon icon={faUserShield} className="text-2xl" />
// //           <span className={`${isSidebarCollapsed ? 'hidden' : ''} text-xl font-bold`}>
// //             Admin Panel
// //           </span>
// //         </div>
// //         <div className="p-4 flex items-center space-x-3 border-b border-indigo-700">
// //           <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
// //             <FontAwesomeIcon icon={faUser} />
// //           </div>
// //           <div className={`${isSidebarCollapsed ? 'hidden' : ''}`}>
// //             <p className="font-medium">Admin User</p>
// //             <p className="text-xs text-indigo-300">Super Admin</p>
// //           </div>
// //         </div>
// //         <div className="p-4 flex-1 overflow-y-auto">
// //           <ul className="space-y-2">
// //             {[
// //               { icon: faTachometerAlt, text: 'Dashboard', to: '/admin-dashboard' },
// //               { icon: faUsers, text: 'Manage Students', to: '/admin/students' },
// //               { icon: faCalendarAlt, text: 'Manage Events', to: '/admin/events' },
// //               { icon: faHandshake, text: 'Manage Partners', to: '/admin/partners' },
// //               { icon: faCog, text: 'Settings', to: '/settings' },
// //             ].map((item, index) => (
// //               <li key={index}>
// //                 <Link
// //                   to={item.to}
// //                   onClick={() => setIsMobileMenuOpen(false)}
// //                   className={`flex items-center space-x-3 p-2 rounded transition hover:bg-indigo-700 ${
// //                     isSidebarCollapsed ? 'justify-center' : ''
// //                   }`}
// //                 >
// //                   <FontAwesomeIcon icon={item.icon} />
// //                   <span className={`${isSidebarCollapsed ? 'hidden' : ''}`}>
// //                     {item.text}
// //                   </span>
// //                 </Link>
// //               </li>
// //             ))}
// //           </ul>
// //         </div>
// //         <div className="p-4 border-t border-indigo-700 hidden md:block">
// //           <button
// //             onClick={toggleSidebar}
// //             className={`flex items-center space-x-3 p-2 rounded hover:bg-indigo-700 transition w-full ${
// //               isSidebarCollapsed ? 'justify-center' : ''
// //             }`}
// //           >
// //             <FontAwesomeIcon icon={isSidebarCollapsed ? faChevronRight : faChevronLeft} />
// //             <span className={`${isSidebarCollapsed ? 'hidden' : ''}`}>
// //               {isSidebarCollapsed ? 'Expand' : 'Collapse'}
// //             </span>
// //           </button>
// //         </div>
// //       </div>

// //       {/* Main Content */}
// //       <div
// //         className={`min-h-screen transition-all duration-300 ${
// //           isSidebarCollapsed ? 'ml-[70px]' : 'ml-64'
// //         } md:ml-64`}
// //       >
// //         <nav className="bg-white shadow p-4 flex justify-between items-center">
// //           <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
// //           <div className="flex items-center space-x-4">
// //             <div className="relative">
// //               <button className="p-2 rounded-full hover:bg-gray-200">
// //                 <FontAwesomeIcon icon={faBell} />
// //                 <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
// //               </button>
// //             </div>
// //             <div className="relative">
// //               <button className="flex items-center space-x-2">
// //                 <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
// //                   <FontAwesomeIcon icon={faUser} />
// //                 </div>
// //                 <span className="hidden md:inline">Admin</span>
// //               </button>
// //             </div>
// //           </div>
// //         </nav>

// //         <Routes>
// //           <Route path="/" element={<Dashboard stats={stats} />} />
// //           <Route path="/students" element={<ManageStudents />} />
// //           <Route path="/events" element={<ManageEvents />} />
// //           <Route path="/partners" element={<ManagePartners />} />
// //           <Route path="/settings" element={<div className="p-6"><h2>Settings Page</h2></div>} />
// //         </Routes>
// //       </div>
// //     </div>
// //   );
// // };

// // export default AdminDashboard;