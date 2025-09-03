import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db, storage, auth } from "./firebase";
import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaCamera, FaHeart, FaPencilAlt, FaMapMarkerAlt, FaDonate } from "react-icons/fa";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

// Load Paystack Pop library
const PaystackPop = window.PaystackPop;

const StudentDashboard = () => {
  const [hasProfilePic, setHasProfilePic] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [studentData, setStudentData] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); // Define showModal state
  const location = useLocation();
  const navigate = useNavigate();
  const studentDocId = location.state?.studentDocId;

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/student-login");
  };

  // Fetch student and event data
  useEffect(() => {
    const fetchData = async () => {
      if (!studentDocId) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Student ID not found. Please log in again.",
          confirmButtonColor: "#EF4444",
        }).then(() => {
          navigate("/student-login");
        });
        return;
      }

      try {
        // Fetch student data
        const studentRef = doc(db, "students", studentDocId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          setStudentData({
            name: data.name || "Unknown",
            idNumber: data.idNumber || "N/A",
            email: data.email || "student@example.com",
          });
          if (data.profilePicUrl) {
            setProfilePicUrl(data.profilePicUrl);
            setHasProfilePic(true);
            setShowModal(false);
          } else {
            setShowModal(true);
          }
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Student data not found.",
            confirmButtonColor: "#EF4444",
          }).then(() => {
            navigate("/student-login");
          });
        }

        // Fetch next event (date saved as string)
        const eventsQuery = query(collection(db, "events"), orderBy("date", "asc"));
        const eventSnap = await getDocs(eventsQuery);
        if (!eventSnap.empty) {
          const event = eventSnap.docs[0].data();

          // Convert string date + time to Date object
          const dateTimeString = `${event.date}T${event.startTime || "00:00"}`;
          const eventDate = new Date(dateTimeString);

          setEventData({
            date: eventDate,
            title: event.title || "Upcoming Event",
            description: event.description || "No description available.",
            location: event.description || "TBD",
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to load data.",
          confirmButtonColor: "#EF4444",
        }).then(() => {
          navigate("/student-dashboard");
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [studentDocId, navigate]);

  // Handle profile picture upload
  const handleProfilePicUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const storageRef = ref(storage, `profile_pics/${studentDocId}/${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const studentRef = doc(db, "students", studentDocId);
        await updateDoc(studentRef, { profilePicUrl: downloadURL });

        setProfilePicUrl(downloadURL);
        setHasProfilePic(true);
        setShowModal(false);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Profile picture uploaded!",
          confirmButtonColor: "#4F46E5",
        });
      } catch (err) {
        console.error("Error uploading profile picture:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to upload profile picture.",
          confirmButtonColor: "#EF4444",
        });
      }
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      const studentRef = doc(db, "students", studentDocId);
      await updateDoc(studentRef, {
        name: studentData.name,
        idNumber: studentData.idNumber,
      });
      Swal.fire("Updated!", "Profile updated successfully.", "success");
      setShowModal(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      Swal.fire("Error", "Failed to update profile.", "error");
    }
  };

  // Handle Paystack donation
  const handleSupportUs = async () => {
    const { value: amount } = await Swal.fire({
      title: "Support Us",
      input: "number",
      inputLabel: "Enter donation amount (GHS)",
      inputPlaceholder: "Enter amount",
      inputAttributes: {
        min: 1,
        step: 1,
      },
      showCancelButton: true,
      confirmButtonText: "Donate",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#4F46E5",
      inputValidator: (value) => {
        if (!value || value < 1) {
          return "Please enter a valid amount!";
        }
      },
    });

    if (amount) {
      try {
        const handler = PaystackPop.setup({
          key: "pk_live_2c46c5b84e9f7854ca5ae661280eb557043cc72a", // Replace with your Paystack public key
          email: studentData?.email || "dinnernight@acolatsevodzi.com",
          amount: amount * 100, // Convert GHS to kobo
          currency: "GHS",
          callback: function (response) {
            Swal.fire({
              icon: "success",
              title: "Thank You!",
              text: `Donation successful! Reference: ${response.reference}`,
              confirmButtonColor: "#4F46E5",
            });
          },
          onClose: function () {
            Swal.fire({
              icon: "info",
              title: "Donation Cancelled",
              text: "You closed the payment window.",
              confirmButtonColor: "#4F46E5",
            });
          },
        });
        handler.openIframe();
      } catch (err) {
        console.error("Error initiating Paystack payment:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to initiate donation.",
          confirmButtonColor: "#EF4444",
        });
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="font-sans bg-gray-50 min-h-screen relative">
      {/* Logout Button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      {/* Profile Update Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaCamera className="text-pink-500 text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Update Profile</h2>
              <input
                type="text"
                placeholder="Full Name"
                defaultValue={studentData?.name}
                onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
                className="w-full border px-3 py-2 mb-4 rounded-lg"
              />
              <input
                type="text"
                placeholder="Index Number"
                defaultValue={studentData?.idNumber}
                onChange={(e) => setStudentData({ ...studentData, idNumber: e.target.value })}
                className="w-full border px-3 py-2 mb-4 rounded-lg"
              />
              <input
                type="file"
                className="block w-full text-sm text-gray-500 mb-4"
                onChange={handleProfilePicUpload}
              />
              <button
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                onClick={handleProfileUpdate}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="min-h-screen">
        {/* Banner */}
        <div className="bg-gradient-to-r from-pink-500 via-red-500 to-purple-600 text-white py-12 px-6 text-center">
          <h1 className="text-4xl font-bold mb-2">
            Welcome, <span>{studentData?.name || "Student"}</span>!
          </h1>
          <p className="text-xl opacity-90">Your perfect match is waiting...</p>
          <div className="mt-6">
            <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-2">
              <FaDonate className="inline mr-2" />
              <span className="font-medium">Support our team!</span>
              <button
                onClick={handleSupportUs}
                className="ml-4 bg-blue-600 text-white py-1 px-4 rounded-full font-medium hover:bg-blue-700 transition-colors"
              >
                Donate Now
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="md:flex">
              <div className="md:w-1/3 bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-8">
                <div className="relative">
                  <img
                    src={profilePicUrl || "https://via.placeholder.com/150"}
                    alt="Profile"
                    className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-md mx-auto"
                  />
                  <div className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md">
                    <FaPencilAlt
                      className="text-pink-500 cursor-pointer"
                      onClick={() => setShowModal(true)}
                    />
                  </div>
                </div>
              </div>
              <div className="p-8 md:w-2/3">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Full Name</p>
                    <p className="font-medium">{studentData?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Index Number</p>
                    <p className="font-medium">{studentData?.idNumber || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Event Card */}
          {eventData && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Next Event</h2>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white text-center">
                      <div className="text-4xl font-bold mb-1">{eventData.date.getDate()}</div>
                      <div className="text-lg">
                        {eventData.date.toLocaleString("default", { month: "long" })}
                      </div>
                      <div className="text-sm opacity-80 mt-2">
                        {eventData.date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <div className="md:w-2/3">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{eventData.title}</h3>
                    <p className="text-gray-600 mb-4">{eventData.description}</p>
                    {/* <div className="flex items-center text-gray-500 mb-4">
                      <FaMapMarkerAlt className="mr-2" />
                      <span>{eventData.location}</span>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating My Date Button */}
      <motion.button
        onClick={() => navigate("/mydates")}
        className="fixed bottom-6 right-6 bg-pink-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        whileHover={{ scale: 1.2 }}
      >
        <FaHeart className="text-2xl" />
      </motion.button>
    </div>
  );
};

export default StudentDashboard;


// import React, { useState, useEffect } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { db, storage, auth } from "./firebase"; 
// import {
//   doc,
//   getDoc,
//   updateDoc,
//   query,
//   collection,
//   orderBy,
//   getDocs,
// } from "firebase/firestore";
// import { signOut } from "firebase/auth";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { FaCamera, FaHeart, FaPencilAlt, FaMapMarkerAlt } from "react-icons/fa";
// import { motion } from "framer-motion";
// import Swal from "sweetalert2";

// const StudentDashboard = () => {
//   const [hasProfilePic, setHasProfilePic] = useState(false);
//   const [profilePicUrl, setProfilePicUrl] = useState("");
//   const [countdown, setCountdown] = useState("");
//   const [showModal, setShowModal] = useState(false);
//   const [studentData, setStudentData] = useState(null);
//   const [eventData, setEventData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const location = useLocation();
//   const navigate = useNavigate();
//   const studentDocId = location.state?.studentDocId;

//   // Logout
//   const handleLogout = async () => {
//     await signOut(auth);
//     navigate("/student-login");
//   };

//   // Fetch student and event data
//   useEffect(() => {
//     const fetchData = async () => {
//       if (!studentDocId) {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "Student ID not found. Please log in again.",
//           confirmButtonColor: "#EF4444",
//         }).then(() => {
//           navigate("/student-login");
//         });
//         return;
//       }

//       try {
//         // Fetch student data
//         const studentRef = doc(db, "students", studentDocId);
//         const studentSnap = await getDoc(studentRef);
//         if (studentSnap.exists()) {
//           const data = studentSnap.data();
//           setStudentData({
//             name: data.name || "Unknown",
//             idNumber: data.idNumber || "N/A",
//           });
//           if (data.profilePicUrl) {
//             setProfilePicUrl(data.profilePicUrl);
//             setHasProfilePic(true);
//             setShowModal(false);
//           } else {
//             setShowModal(true);
//           }
//         } else {
//           Swal.fire({
//             icon: "error",
//             title: "Error",
//             text: "Student data not found.",
//             confirmButtonColor: "#EF4444",
//           }).then(() => {
//             navigate("/student-login");
//           });
//         }

//         // Fetch next event (date saved as string)
//         const eventsQuery = query(collection(db, "events"), orderBy("date", "asc"));
//         const eventSnap = await getDocs(eventsQuery);
//         if (!eventSnap.empty) {
//           const event = eventSnap.docs[0].data();

//           // Convert string date + time to Date object
//           const dateTimeString = `${event.date}T${event.startTime || "00:00"}`;
//           const eventDate = new Date(dateTimeString);

//           setEventData({
//             date: eventDate,
//             title: event.title || "Upcoming Event",
//             description: event.description || "No description available.",
//             location: event.description || "TBD",
//           });
//         }
//       } catch (err) {
//         console.error("Error fetching data:", err);
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "Failed to load data.",
//           confirmButtonColor: "#EF4444",
//         }).then(() => {
//           navigate("/student-dashboard");
//         });
//       }
//       setLoading(false);
//     };

//     fetchData();
//   }, [studentDocId, navigate]);

//   // Countdown timer
//   useEffect(() => {
//     if (!eventData) return;

//     const updateCountdown = () => {
//       const eventDate = eventData.date.getTime();
//       const now = new Date().getTime();
//       const distance = eventDate - now;

//       if (distance <= 0) {
//         setCountdown("Event is live now!");
//         return;
//       }

//       const days = Math.floor(distance / (1000 * 60 * 60 * 24));
//       const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//       const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

//       setCountdown(`Next event in: ${days}d ${hours}h ${minutes}m`);
//     };

//     updateCountdown();
//     const interval = setInterval(updateCountdown, 60000);
//     return () => clearInterval(interval);
//   }, [eventData]);

//   // Handle profile picture upload
//   const handleProfilePicUpload = async (e) => {
//     if (e.target.files && e.target.files[0]) {
//       const file = e.target.files[0];
//       try {
//         const storageRef = ref(storage, `profile_pics/${studentDocId}/${file.name}`);
//         await uploadBytes(storageRef, file);
//         const downloadURL = await getDownloadURL(storageRef);

//         const studentRef = doc(db, "students", studentDocId);
//         await updateDoc(studentRef, { profilePicUrl: downloadURL });

//         setProfilePicUrl(downloadURL);
//         setHasProfilePic(true);
//         setShowModal(false);
//         Swal.fire({
//           icon: "success",
//           title: "Success",
//           text: "Profile picture uploaded!",
//           confirmButtonColor: "#4F46E5",
//         });
//       } catch (err) {
//         console.error("Error uploading profile picture:", err);
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "Failed to upload profile picture.",
//           confirmButtonColor: "#EF4444",
//         });
//       }
//     }
//   };

//   // Handle profile update
//   const handleProfileUpdate = async () => {
//     try {
//       const studentRef = doc(db, "students", studentDocId);
//       await updateDoc(studentRef, {
//         name: studentData.name,
//         idNumber: studentData.idNumber,
//       });
//       Swal.fire("Updated!", "Profile updated successfully.", "success");
//       setShowModal(false);
//     } catch (err) {
//       console.error("Error updating profile:", err);
//       Swal.fire("Error", "Failed to update profile.", "error");
//     }
//   };

//   if (loading) {
//     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
//   }

//   return (
//     <div className="font-sans bg-gray-50 min-h-screen relative">
//       {/* Logout Button */}
//       <div className="flex justify-end p-4">
//         <button
//           onClick={handleLogout}
//           className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
//         >
//           Logout
//         </button>
//       </div>

//       {/* Profile Update Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
//             <div className="text-center">
//               <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
//                 <FaCamera className="text-pink-500 text-3xl" />
//               </div>
//               <h2 className="text-2xl font-bold text-gray-800 mb-2">Update Profile</h2>
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 defaultValue={studentData?.name}
//                 onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
//                 className="w-full border px-3 py-2 mb-4 rounded-lg"
//               />
//               <input
//                 type="text"
//                 placeholder="Index Number"
//                 defaultValue={studentData?.idNumber}
//                 onChange={(e) => setStudentData({ ...studentData, idNumber: e.target.value })}
//                 className="w-full border px-3 py-2 mb-4 rounded-lg"
//               />
//               <input
//                 type="file"
//                 className="block w-full text-sm text-gray-500 mb-4"
//                 onChange={handleProfilePicUpload}
//               />
//               <button
//                 className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
//                 onClick={handleProfileUpdate}
//               >
//                 Save Changes
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Dashboard Content */}
//       <div className="min-h-screen">
//         {/* Banner */}
//         <div className="bg-gradient-to-r from-pink-500 via-red-500 to-purple-600 text-white py-12 px-6 text-center">
//           <h1 className="text-4xl font-bold mb-2">
//             Welcome, <span>{studentData?.name || "Student"}</span>!
//           </h1>
//           <p className="text-xl opacity-90">Your perfect match is waiting...</p>
//           <div className="mt-6">
//             <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-2">
//               <FaHeart className="inline mr-2" />
//               <span className="font-medium">{countdown || "Loading event..."}</span>
//             </div>
//           </div>
//         </div>

//         <div className="container mx-auto px-4 py-8 max-w-4xl">
//           {/* Profile Card */}
//           <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
//             <div className="md:flex">
//               <div className="md:w-1/3 bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-8">
//                 <div className="relative">
//                   <img
//                     src={profilePicUrl || "https://via.placeholder.com/150"}
//                     alt="Profile"
//                     className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-md mx-auto"
//                   />
//                   <div className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md">
//                     <FaPencilAlt
//                       className="text-pink-500 cursor-pointer"
//                       onClick={() => setShowModal(true)}
//                     />
//                   </div>
//                 </div>
//               </div>
//               <div className="p-8 md:w-2/3">
//                 <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Profile</h2>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-gray-500 text-sm">Full Name</p>
//                     <p className="font-medium">{studentData?.name || "N/A"}</p>
//                   </div>
//                   <div>
//                     <p className="text-gray-500 text-sm">Index Number</p>
//                     <p className="font-medium">{studentData?.idNumber || "N/A"}</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Next Event Card */}
//           {eventData && (
//             <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
//               <div className="p-8">
//                 <h2 className="text-2xl font-bold text-gray-800 mb-4">Next Event</h2>
//                 <div className="flex flex-col md:flex-row gap-6">
//                   <div className="md:w-1/3">
//                     <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white text-center">
//                       <div className="text-4xl font-bold mb-1">{eventData.date.getDate()}</div>
//                       <div className="text-lg">
//                         {eventData.date.toLocaleString("default", { month: "long" })}
//                       </div>
//                       <div className="text-sm opacity-80 mt-2">
//                         {eventData.date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
//                       </div>
//                     </div>
//                   </div>
//                   <div className="md:w-2/3">
//                     <h3 className="text-xl font-bold text-gray-800 mb-2">{eventData.title}</h3>
//                     <p className="text-gray-600 mb-4">{eventData.description}</p>
//                     <div className="flex items-center text-gray-500 mb-4">
//                       <FaMapMarkerAlt className="mr-2" />
//                       <span>{eventData.location}</span>
//                     </div>
//                     <button className="bg-pink-600 text-white py-2 px-6 rounded-full font-medium hover:bg-pink-700 transition-colors">
//                       RSVP Now
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Floating My Date Button */}
//       <motion.button
//         onClick={() => navigate("/mydates")}
//         className="fixed bottom-6 right-6 bg-pink-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
//         animate={{ scale: [1, 1.1, 1] }}
//         transition={{ duration: 1.5, repeat: Infinity }}
//         whileHover={{ scale: 1.2 }}
//       >
//         <FaHeart className="text-2xl" />
//       </motion.button>
//     </div>
//   );
// };

// export default StudentDashboard;
