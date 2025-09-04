import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import Swal from "sweetalert2";
import axios from "axios";

const Announcement = () => {
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recipientType, setRecipientType] = useState("individual");
  const [selectedStudent, setSelectedStudent] = useState("");

  // Initialize Feather Icons
  useEffect(() => {
    if (window.feather) {
      window.feather.replace();
    }
  }, [announcements]); // Re-run when announcements change to update icons

  // Fetch students and announcements
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const studentList = studentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStudents(studentList);

        // Set default selected student (first student in the list) if individual
        if (studentList.length > 0 && recipientType === "individual") {
          setSelectedStudent(studentList[0].id);
        }

        // Fetch announcements
        const announcementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc")
        );
        const announcementsSnapshot = await getDocs(announcementsQuery);
        setAnnouncements(
          announcementsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        Swal.fire("Error!", "Failed to load data.", "error");
      }
    };
    fetchData();
  }, [recipientType]);

  // Update recipient buttons styling
  const updateRecipientButtons = (type) => {
    setRecipientType(type);
    if (type !== "individual") {
      setSelectedStudent("");
    } else if (students.length > 0) {
      setSelectedStudent(students[0].id);
    }
  };

  // Handle sending announcement
  const handleSendAnnouncement = async () => {
    if (!message.trim()) {
      Swal.fire("Error!", "Message cannot be empty.", "error");
      return;
    }

    if (recipientType === "individual" && !selectedStudent) {
      Swal.fire("Error!", "Please select a student.", "error");
      return;
    }

    let recipients = [];
    if (recipientType === "all") {
      recipients = students;
    } else if (recipientType === "males") {
      recipients = students.filter((s) => s.gender?.toLowerCase() === "male");
    } else if (recipientType === "females") {
      recipients = students.filter((s) => s.gender?.toLowerCase() === "female");
    } else {
      const student = students.find((s) => s.id === selectedStudent);
      if (!student) {
        Swal.fire("Error!", "Selected student not found.", "error");
        return;
      }
      recipients = [student];
    }

    if (recipients.length === 0) {
      Swal.fire("Error!", "No recipients match the selected criteria.", "error");
      return;
    }

    try {
      Swal.fire({
        title: "Sending...",
        html: "Please wait while we send the announcements",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const newAnnouncements = [];
      for (const student of recipients) {
        const greeting = student.gender?.toLowerCase() === "male" ? "Hi Mr." : "Hi Miss";
        const fullMessage = `${greeting} ${student.name}, ${message}`;

        // Save to Firestore
        const announcement = {
          studentId: student.id,
          studentName: student.name,
          message: fullMessage,
          createdAt: new Date(),
        };
        const docRef = await addDoc(collection(db, "announcements"), announcement);

        // Send SMS via Cloud Function
        try {
          await axios.post(
            process.env.REACT_APP_SMS_API_URL || "https://sendsms-7gg6sq4r6q-uc.a.run.app",
            {
              phone: student.phone,
              message: fullMessage,
            }
          );
        } catch (smsErr) {
          console.error(`[SMS Error] Failed to send to ${student.phone}:`, smsErr.response?.data || smsErr.message);
        }

        newAnnouncements.push({ id: docRef.id, ...announcement });
      }

      setAnnouncements((prev) => [...newAnnouncements, ...prev]);
      setMessage("");
      if (recipientType === "individual" && students.length > 0) {
        setSelectedStudent(students[0].id);
      }
      Swal.fire("Success!", "Announcement(s) sent successfully!", "success");
    } catch (error) {
      console.error("Error sending announcement(s):", error);
      Swal.fire("Error!", "Failed to send announcement(s).", "error");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <i data-feather="bell" className="mr-2"></i> Announcement System
        </h1>
        <p className="text-gray-600">Send important messages to students</p>
      </header>

      {/* Announcement Form */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 transition-all duration-300">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
          <i data-feather="edit-3" className="mr-2"></i> Create New Announcement
        </h2>
        <div className="space-y-4">
          {/* Recipient Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Type</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {["individual", "all", "males", "females"].map((type) => (
                <button
                  key={type}
                  onClick={() => updateRecipientButtons(type)}
                  className={`recipient-btn py-2 px-4 rounded-lg border transition-colors ${
                    recipientType === type
                      ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  {type === "individual"
                    ? "Individual"
                    : type === "all"
                    ? "All Students"
                    : type === "males"
                    ? "All Males"
                    : "All Females"}
                </button>
              ))}
            </div>
          </div>

          {/* Student Selector */}
          <div className={`${recipientType === "individual" ? "fade-in" : "hidden"}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.idNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              className="w-full border border-gray-300 rounded-lg py-2 px-3 h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            ></textarea>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSendAnnouncement}
              className="bg-indigo-600 text-white py-2 px-6 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
            >
              <i data-feather="send" className="mr-2"></i> Send Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <i data-feather="list" className="mr-2"></i> Sent Announcements
          </h2>
          <span className="text-sm text-gray-500">
            {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="divide-y divide-gray-200">
          {announcements.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No announcements sent yet.</div>
          ) : (
            announcements.map((announcement, index) => (
              <div
                key={index}
                className="p-6 announcement-card transition-all duration-300 hover:transform hover:-translate-y-[2px] hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-800">{announcement.studentName}</h3>
                  <span className="text-sm text-gray-500">
                    {new Date(announcement.createdAt.seconds * 1000).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700">{announcement.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcement;

// import React, { useState, useEffect } from "react";
// import { db } from "./firebase";
// import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
// import Swal from "sweetalert2";
// import axios from "axios";

// const Announcement = () => {
//   const [message, setMessage] = useState("");
//   const [students, setStudents] = useState([]);
//   const [announcements, setAnnouncements] = useState([]);
//   const [recipientType, setRecipientType] = useState("individual");
//   const [selectedStudent, setSelectedStudent] = useState("");

//   // Initialize Feather Icons
//   useEffect(() => {
//     if (window.feather) {
//       window.feather.replace();
//     }
//   }, [announcements]); // Re-run when announcements change to update icons

//   // Fetch students and announcements
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         // Fetch students
//         const studentsSnapshot = await getDocs(collection(db, "students"));
//         const studentList = studentsSnapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }));
//         setStudents(studentList);

//         // Set default selected student (first student in the list) if individual
//         if (studentList.length > 0 && recipientType === "individual") {
//           setSelectedStudent(studentList[0].id);
//         }

//         // Fetch announcements
//         const announcementsQuery = query(
//           collection(db, "announcements"),
//           orderBy("createdAt", "desc")
//         );
//         const announcementsSnapshot = await getDocs(announcementsQuery);
//         setAnnouncements(
//           announcementsSnapshot.docs.map((doc) => ({
//             id: doc.id,
//             ...doc.data(),
//           }))
//         );
//       } catch (error) {
//         console.error("Error fetching data:", error);
//         Swal.fire("Error!", "Failed to load data.", "error");
//       }
//     };
//     fetchData();
//   }, [recipientType]);

//   // Update recipient buttons styling
//   const updateRecipientButtons = (type) => {
//     setRecipientType(type);
//     if (type !== "individual") {
//       setSelectedStudent("");
//     } else if (students.length > 0) {
//       setSelectedStudent(students[0].id);
//     }
//   };

//   // Handle sending announcement
//   const handleSendAnnouncement = async () => {
//     if (!message.trim()) {
//       Swal.fire("Error!", "Message cannot be empty.", "error");
//       return;
//     }

//     if (recipientType === "individual" && !selectedStudent) {
//       Swal.fire("Error!", "Please select a student.", "error");
//       return;
//     }

//     let recipients = [];
//     if (recipientType === "all") {
//       recipients = students;
//     } else if (recipientType === "males") {
//       recipients = students.filter((s) => s.gender?.toLowerCase() === "male");
//     } else if (recipientType === "females") {
//       recipients = students.filter((s) => s.gender?.toLowerCase() === "female");
//     } else {
//       const student = students.find((s) => s.id === selectedStudent);
//       if (!student) {
//         Swal.fire("Error!", "Selected student not found.", "error");
//         return;
//       }
//       recipients = [student];
//     }

//     if (recipients.length === 0) {
//       Swal.fire("Error!", "No recipients match the selected criteria.", "error");
//       return;
//     }

//     try {
//       Swal.fire({
//         title: "Sending...",
//         html: "Please wait while we send the announcements",
//         allowOutsideClick: false,
//         didOpen: () => {
//           Swal.showLoading();
//         },
//       });

//       const newAnnouncements = [];
//       for (const student of recipients) {
//         const greeting = student.gender?.toLowerCase() === "male" ? "Hi Mr." : "Hi Miss";
//         const fullMessage = `${greeting} ${student.name}, ${message}`;

//         // Save to Firestore
//         const announcement = {
//           studentId: student.id,
//           studentName: student.name,
//           message: fullMessage,
//           createdAt: new Date(),
//         };
//         const docRef = await addDoc(collection(db, "announcements"), announcement);

//         // Send SMS via Arkesel
//         try {
//           await axios.post("http://localhost:5000/send-sms", {
//             phone: student.phone,
//             message: fullMessage,
//           });
//         } catch (smsErr) {
//           console.error(`[SMS Error] Failed to send to ${student.phone}:`, smsErr.response?.data || smsErr.message);
//         }

//         newAnnouncements.push({ id: docRef.id, ...announcement });
//       }

//       setAnnouncements((prev) => [...newAnnouncements, ...prev]);
//       setMessage("");
//       if (recipientType === "individual" && students.length > 0) {
//         setSelectedStudent(students[0].id);
//       }
//       Swal.fire("Success!", "Announcement(s) sent successfully!", "success");
//     } catch (error) {
//       console.error("Error sending announcement(s):", error);
//       Swal.fire("Error!", "Failed to send announcement(s).", "error");
//     }
//   };

//   return (
//     <div className="container mx-auto px-4 py-8">
//       {/* Header */}
//       <header className="mb-8">
//         <h1 className="text-3xl font-bold text-gray-800 flex items-center">
//           <i data-feather="bell" className="mr-2"></i> Announcement System
//         </h1>
//         <p className="text-gray-600">Send important messages to students</p>
//       </header>

//       {/* Announcement Form */}
//       <div className="bg-white rounded-xl shadow-md p-6 mb-8 transition-all duration-300">
//         <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
//           <i data-feather="edit-3" className="mr-2"></i> Create New Announcement
//         </h2>
//         <div className="space-y-4">
//           {/* Recipient Type */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Type</label>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
//               {["individual", "all", "males", "females"].map((type) => (
//                 <button
//                   key={type}
//                   onClick={() => updateRecipientButtons(type)}
//                   className={`recipient-btn py-2 px-4 rounded-lg border transition-colors ${
//                     recipientType === type
//                       ? "bg-indigo-100 border-indigo-500 text-indigo-700"
//                       : "border-gray-300 text-gray-700"
//                   }`}
//                 >
//                   {type === "individual"
//                     ? "Individual"
//                     : type === "all"
//                     ? "All Students"
//                     : type === "males"
//                     ? "All Males"
//                     : "All Females"}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Student Selector */}
//           <div className={`${recipientType === "individual" ? "fade-in" : "hidden"}`}>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
//             <select
//               value={selectedStudent}
//               onChange={(e) => setSelectedStudent(e.target.value)}
//               className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//             >
//               <option value="">Select a student</option>
//               {students.map((student) => (
//                 <option key={student.id} value={student.id}>
//                   {student.name} ({student.idNumber})
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Message Input */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
//             <textarea
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               placeholder="Enter your message here..."
//               className="w-full border border-gray-300 rounded-lg py-2 px-3 h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//             ></textarea>
//           </div>

//           {/* Send Button */}
//           <div className="flex justify-end">
//             <button
//               onClick={handleSendAnnouncement}
//               className="bg-indigo-600 text-white py-2 px-6 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
//             >
//               <i data-feather="send" className="mr-2"></i> Send Announcement
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Announcements List */}
//       <div className="bg-white rounded-xl shadow-md overflow-hidden">
//         <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
//           <h2 className="text-xl font-semibold text-gray-800 flex items-center">
//             <i data-feather="list" className="mr-2"></i> Sent Announcements
//           </h2>
//           <span className="text-sm text-gray-500">
//             {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
//           </span>
//         </div>
//         <div className="divide-y divide-gray-200">
//           {announcements.length === 0 ? (
//             <div className="p-6 text-center text-gray-500">No announcements sent yet.</div>
//           ) : (
//             announcements.map((announcement, index) => (
//               <div
//                 key={index}
//                 className="p-6 announcement-card transition-all duration-300 hover:transform hover:-translate-y-[2px] hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
//               >
//                 <div className="flex justify-between items-start mb-2">
//                   <h3 className="font-medium text-gray-800">{announcement.studentName}</h3>
//                   <span className="text-sm text-gray-500">
//                     {new Date(announcement.createdAt.seconds * 1000).toLocaleString()}
//                   </span>
//                 </div>
//                 <p className="text-gray-700">{announcement.message}</p>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Announcement;


// import React, { useState, useEffect } from "react";
// import { db } from "./firebase";
// import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faBullhorn, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
// import Swal from "sweetalert2";

// const Announcement = () => {
//   const [message, setMessage] = useState("");
//   const [students, setStudents] = useState([]);
//   const [announcements, setAnnouncements] = useState([]);
//   const [selectedStudent, setSelectedStudent] = useState("");

//   // Fetch students and announcements
//   useEffect(() => {
//     const fetchData = async () => {
//       // Fetch students
//       const studentsSnapshot = await getDocs(collection(db, "students"));
//       const studentList = studentsSnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       }));
//       setStudents(studentList);

//       // Set default selected student (first student in the list)
//       if (studentList.length > 0) {
//         setSelectedStudent(studentList[0].id);
//       }

//       // Fetch announcements
//       const announcementsQuery = query(
//         collection(db, "announcements"),
//         orderBy("createdAt", "desc")
//       );
//       const announcementsSnapshot = await getDocs(announcementsQuery);
//       setAnnouncements(
//         announcementsSnapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }))
//       );
//     };
//     fetchData();
//   }, []);

//   // Handle sending announcement
//   const handleSendAnnouncement = async () => {
//     if (!selectedStudent) {
//       Swal.fire("Error!", "Please select a student.", "error");
//       return;
//     }
//     if (!message.trim()) {
//       Swal.fire("Error!", "Message cannot be empty.", "error");
//       return;
//     }

//     const student = students.find((s) => s.id === selectedStudent);
//     if (!student) {
//       Swal.fire("Error!", "Selected student not found.", "error");
//       return;
//     }

//     const greeting = student.gender?.toLowerCase() === "male" ? "Hi Mr." : "Hi Miss";
//     const fullMessage = `${greeting} ${student.name}, ${message}`;

//     try {
//       const announcement = {
//         studentId: student.id,
//         studentName: student.name,
//         message: fullMessage,
//         createdAt: new Date(),
//       };
//       const docRef = await addDoc(collection(db, "announcements"), announcement);
//       setAnnouncements((prev) => [
//         { id: docRef.id, ...announcement },
//         ...prev,
//       ]);
//       setMessage("");
//       Swal.fire("Success!", "Announcement sent successfully!", "success");
//     } catch (err) {
//       console.error("Error sending announcement:", err);
//       Swal.fire("Error!", "Failed to send announcement.", "error");
//     }
//   };

//   return (
//     <div className="p-6">
//       <h2 className="text-2xl font-bold mb-6 text-gray-800">Announcements</h2>

//       {/* Announcement Form */}
//       <div className="bg-white rounded-lg shadow p-6 mb-8">
//         <h3 className="text-xl font-semibold mb-4">Create Announcement</h3>
//         <div className="grid grid-cols-1 gap-4">
//           <div>
//             <label className="block text-sm font-medium mb-1">Select Student</label>
//             <select
//               value={selectedStudent}
//               onChange={(e) => setSelectedStudent(e.target.value)}
//               className="w-full border border-gray-300 rounded-md py-2 px-3"
//             >
//               <option value="">Select a student</option>
//               {students.map((student) => (
//                 <option key={student.id} value={student.id}>
//                   {student.name} ({student.idNumber})
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium mb-1">Message</label>
//             <textarea
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               placeholder="Enter your message here..."
//               className="w-full border border-gray-300 rounded-md py-2 px-3 h-32 resize-none"
//             ></textarea>
//           </div>
//           <div className="flex justify-end">
//             <button
//               onClick={handleSendAnnouncement}
//               className="bg-indigo-600 text-white py-2 px-4 rounded-md flex items-center hover:bg-indigo-700 transition"
//             >
//               <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
//               Send Announcement
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Announcements Table */}
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         <div className="px-6 py-4 border-b border-gray-200 flex justify-between">
//           <h3 className="text-xl font-semibold">Sent Announcements</h3>
//           <span className="text-sm text-gray-500">
//             {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
//           </span>
//         </div>
//         <table className="w-full text-left">
//           <thead>
//             <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
//               <th className="px-6 py-3">Student</th>
//               <th className="px-6 py-3">Message</th>
//               <th className="px-6 py-3">Sent At</th>
//             </tr>
//           </thead>
//           <tbody>
//             {announcements.length === 0 ? (
//               <tr>
//                 <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
//                   No announcements sent yet.
//                 </td>
//               </tr>
//             ) : (
//               announcements.map((announcement, index) => (
//                 <tr key={index} className="border-t">
//                   <td className="px-6 py-4">{announcement.studentName}</td>
//                   <td className="px-6 py-4">{announcement.message}</td>
//                   <td className="px-6 py-4">
//                     {new Date(announcement.createdAt.seconds * 1000).toLocaleString()}
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default Announcement;