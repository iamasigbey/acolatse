import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import FeatherIcon from "feather-icons-react";
import AOS from "aos";
import "aos/dist/aos.css";
import { useNavigate } from "react-router-dom";

export default function MyDates() {
  const [currentUser, setCurrentUser] = useState(null);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize AOS
    AOS.init({ duration: 1000 });

    const fetchCurrentUser = async () => {
      try {
        const authUser = JSON.parse(localStorage.getItem("authUser"));
        if (!authUser?.uid) {
          console.warn("No authUser found in localStorage");
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        const studentRef = doc(db, "students", authUser.uid);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const userData = { uid: authUser.uid, ...studentSnap.data() };
          setCurrentUser(userData);
          console.log("Current user:", userData);
        } else {
          console.warn("No student found for UID:", authUser.uid);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
        setCurrentUser(null);
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!currentUser?.uid || !currentUser?.gender) {
        console.warn("No currentUser or gender available");
        setPartners([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const partnersRef = collection(db, "partners");
        const partnersSnap = await getDocs(partnersRef);

        // Fetch all students to map profilePicUrl
        const studentsRef = collection(db, "students");
        const studentsSnap = await getDocs(studentsRef);
        const studentsMap = new Map();
        studentsSnap.docs.forEach((doc) => {
          studentsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        const userPartners = partnersSnap.docs
          .filter((doc) => {
            const data = doc.data();
            const maleId = data.male?.id;
            const femaleIds = Array.isArray(data.females) ? data.females.map((f) => f.id) : [];
            return maleId === currentUser.uid || femaleIds.includes(currentUser.uid);
          })
          .flatMap((doc) => {
            const data = doc.data();
            const partnersList = [];
            if (currentUser.gender.toUpperCase() === "FEMALE" && data.male?.id && data.male.id !== currentUser.uid) {
              const maleStudent = studentsMap.get(data.male.id);
              if (maleStudent) {
                partnersList.push({
                  id: maleStudent.id,
                  name: maleStudent.name,
                  hall: maleStudent.hall,
                  room: maleStudent.room,
                  idNumber: maleStudent.idNumber,
                  phone: maleStudent.phone,
                  profilePicUrl: maleStudent.profilePicUrl || null,
                });
              }
            } else if (currentUser.gender.toUpperCase() === "MALE" && Array.isArray(data.females)) {
              data.females.forEach((female) => {
                if (female.id !== currentUser.uid) {
                  const femaleStudent = studentsMap.get(female.id);
                  if (femaleStudent) {
                    partnersList.push({
                      id: femaleStudent.id,
                      name: femaleStudent.name,
                      hall: femaleStudent.hall,
                      room: femaleStudent.room,
                      idNumber: femaleStudent.idNumber,
                      phone: femaleStudent.phone,
                      profilePicUrl: femaleStudent.profilePicUrl || null,
                    });
                  }
                }
              });
            }
            return partnersList;
          });

        console.log("Fetched partners:", userPartners);
        setPartners(userPartners);
      } catch (err) {
        console.error("Error fetching partners:", err);
        setPartners([]);
      }
      setLoading(false);
    };

    if (currentUser) {
      fetchPartners();
    }
  }, [currentUser]);

  useEffect(() => {
    const container = document.getElementById("hearts-container");
    if (!container) {
      console.warn("hearts-container not found in DOM");
      return;
    }

    const heartCount = 20;
    for (let i = 0; i < heartCount; i++) {
      const heart = document.createElement("div");
      heart.classList.add("heart");
      heart.style.left = Math.random() * 100 + "vw";
      heart.style.animationDuration = (Math.random() * 10 + 5) + "s";
      heart.style.animationDelay = Math.random() * 5 + "s";
      heart.style.opacity = Math.random() * 0.5 + 0.1;
      heart.style.transform = `scale(${Math.random() * 0.7 + 0.3})`;
      container.appendChild(heart);
    }

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  const openModal = (src) => {
    if (src) {
      setModalImage(src);
      setShowModal(true);
    } else {
      console.warn("No profilePicUrl provided for modal");
    }
  };

  const closeModal = () => setShowModal(false);

  if (loading) {
    return (
      <div className="font-poppins min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#fff5f5] to-[#fef9ff]">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full loading-spinner mb-4"></div>
        <p className="text-pink-600 text-lg">Finding your matches...</p>
      </div>
    );
  }

  if (partners.length === 0 && !loading) {
    return (
      <div className="font-poppins min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#fff5f5] to-[#fef9ff]">
        <div className="floating-hearts" id="hearts-container"></div>
        <div className="empty-state max-w-md mx-auto p-8 text-center">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FeatherIcon icon="heart" className="text-pink-500 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-pink-600 mb-2">No Matches Yet</h3>
          <p className="text-pink-400 mb-6">
            We couldn't find any matches for you at the moment. Please check back later or refresh the page.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-white py-2 px-6 rounded-full font-medium"
            >
              Try Again
            </button>
           
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-poppins min-h-screen p-4 sm:p-8 bg-gradient-to-br from-[#fff5f5] to-[#fef9ff]">
      <div className="floating-hearts" id="hearts-container"></div>
      <div className="container mx-auto max-w-screen-xl relative z-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-pink-600 flex items-center">
              <FeatherIcon icon="heart" className="mr-3 w-8 h-8" />
              MyDates
            </h1>
            <p className="text-pink-400">Find your perfect match</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center text-pink-600 hover:text-pink-700 transition"
            >
              <FeatherIcon icon="refresh-cw" className="mr-2 w-5 h-5" />
             
            </button>
            
          </div>
        </header>

        <main>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="partner-card"
                data-aos="fade-up"
              >
                <div className="bg-gradient-to-r from-pink-400 to-pink-600 h-32 relative">
                  <div className="absolute inset-x-0 -bottom-12 flex justify-center">
                    {partner.profilePicUrl ? (
                      <img
                        src={partner.profilePicUrl}
                        alt={partner.name}
                        className="profile-pic w-24 h-24 rounded-full object-cover cursor-pointer"
                        onClick={() => openModal(partner.profilePicUrl)}
                        role="button"
                        aria-label={`Preview profile picture of ${partner.name}`}
                        onError={(e) => {
                          console.error(`Failed to load image for ${partner.name}:`, e);
                          e.target.style.display = 'none'; // Hide broken image
                          e.target.nextSibling.style.display = 'flex'; // Show fallback
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-pink-100 flex items-center justify-center">
                        <FeatherIcon icon="user" className="text-pink-400 w-10 h-10" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-16 pb-6 px-6 text-center">
                  <h3 className="text-xl font-semibold text-pink-600 mb-1">{partner.name}</h3>
                  <p className="text-pink-400 text-sm mb-2">
                    {partner.hall || "N/A"} • Room {partner.room || "N/A"}
                  </p>
                  <p className="text-pink-400 text-sm mb-2">ID: {partner.idNumber || "N/A"}</p>
                  <p className="text-pink-400 text-sm mb-4">Phone: {partner.phone || "N/A"}</p>
                  <div className="flex justify-center space-x-3">
                    <a
                      href={`tel:${partner.phone || ""}`}
                      className="btn-primary text-white px-4 py-2 rounded-full text-sm flex items-center"
                    >
                      <FeatherIcon icon="phone" className="w-4 h-4 mr-1" />
                      Call
                    </a>
                    <a
                      href={`sms:${partner.phone || ""}`}
                      className="btn-secondary px-4 py-2 rounded-full text-sm flex items-center"
                    >
                      <FeatherIcon icon="message-square" className="w-4 h-4 mr-1" />
                      Message
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {showModal && (
          <div
            id="imageModal"
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="imagePreviewLabel"
          >
            <div className="relative max-w-2xl w-full">
              <button
                className="absolute -top-10 right-0 text-white text-2xl hover:text-pink-300 transition"
                onClick={closeModal}
                aria-label="Close image preview"
              >
                <FeatherIcon icon="x" />
              </button>
              <img
                id="modalImage"
                src={modalImage}
                alt="Profile picture preview"
                className="w-full h-auto rounded-lg shadow-xl"
                onError={(e) => console.error("Failed to load modal image:", e)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// import React, { useEffect, useState } from "react";
// import { collection, getDocs, doc, getDoc } from "firebase/firestore";
// import { db } from "./firebase";
// import FeatherIcon from "feather-icons-react";
// import AOS from "aos";
// import "aos/dist/aos.css";

// export default function MyDates() {
//   const [currentUser, setCurrentUser] = useState(null);
//   const [partners, setPartners] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [modalImage, setModalImage] = useState("");

//   useEffect(() => {
//     // Initialize AOS
//     AOS.init({ duration: 1000 });

//     const fetchCurrentUser = async () => {
//       try {
//         const authUser = JSON.parse(localStorage.getItem("authUser"));
//         if (!authUser?.uid) {
//           setCurrentUser(null);
//           setLoading(false);
//           return;
//         }

//         const studentRef = doc(db, "students", authUser.uid);
//         const studentSnap = await getDoc(studentRef);
//         if (studentSnap.exists()) {
//           const userData = { uid: authUser.uid, ...studentSnap.data() };
//           setCurrentUser(userData);
//         } else {
//           setCurrentUser(null);
//         }
//       } catch (err) {
//         console.error("Error fetching current user:", err);
//         setCurrentUser(null);
//       }
//       setLoading(false);
//     };

//     fetchCurrentUser();
//   }, []);

//   useEffect(() => {
//     const fetchPartners = async () => {
//       if (!currentUser?.uid || !currentUser?.gender) {
//         setPartners([]);
//         return;
//       }

//       setLoading(true);
//       try {
//         const partnersRef = collection(db, "partners");
//         const partnersSnap = await getDocs(partnersRef);

//         const userPartners = partnersSnap.docs
//           .filter((doc) => {
//             const data = doc.data();
//             const maleId = data.male?.id;
//             const femaleIds = Array.isArray(data.females) ? data.females.map((f) => f.id) : [];
//             return maleId === currentUser.uid || femaleIds.includes(currentUser.uid);
//           })
//           .flatMap((doc) => {
//             const data = doc.data();
//             if (currentUser.gender.toUpperCase() === "FEMALE") {
//               if (data.male?.id && data.male.id !== currentUser.uid) {
//                 return [data.male];
//               }
//             } else if (currentUser.gender.toUpperCase() === "MALE") {
//               if (Array.isArray(data.females)) {
//                 return data.females.filter((female) => female.id !== currentUser.uid);
//               }
//             }
//             return [];
//           });

//         setPartners(userPartners);
//       } catch (err) {
//         console.error("Error fetching partners:", err);
//         setPartners([]);
//       }
//       setLoading(false);
//     };

//     fetchPartners();
//   }, [currentUser]);

//   useEffect(() => {
//     const container = document.getElementById("hearts-container");
//     if (!container) {
//       console.warn("hearts-container not found in DOM");
//       return;
//     }

//     const heartCount = 20;
//     for (let i = 0; i < heartCount; i++) {
//       const heart = document.createElement("div");
//       heart.classList.add("heart");
//       heart.style.left = Math.random() * 100 + "vw";
//       heart.style.animationDuration = (Math.random() * 10 + 5) + "s";
//       heart.style.animationDelay = Math.random() * 5 + "s";
//       heart.style.opacity = Math.random() * 0.5 + 0.1;
//       heart.style.transform = `scale(${Math.random() * 0.7 + 0.3})`;
//       container.appendChild(heart);
//     }

//     return () => {
//       while (container.firstChild) {
//         container.removeChild(container.firstChild);
//       }
//     };
//   }, []);

//   const openModal = (src) => {
//     setModalImage(src || "");
//     setShowModal(true);
//   };
//   const closeModal = () => setShowModal(false);

//   if (loading) {
//     return (
//       <div className="font-poppins min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#fff5f5] to-[#fef9ff]">
//         <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full loading-spinner mb-4"></div>
//         <p className="text-pink-600 text-lg">Finding your matches...</p>
//       </div>
//     );
//   }

//   if (partners.length === 0 && !loading) {
//     return (
//       <div className="font-poppins min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#fff5f5] to-[#fef9ff]">
//         <div className="floating-hearts" id="hearts-container"></div>
//         <div className="empty-state max-w-md mx-auto p-8 text-center">
//           <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
//             <FeatherIcon icon="heart" className="text-pink-500 w-10 h-10" />
//           </div>
//           <h3 className="text-xl font-bold text-pink-600 mb-2">No Matches Yet</h3>
//           <p className="text-pink-400 mb-6">
//             We couldn't find any matches for you at the moment. Please check back later or refresh the page.
//           </p>
//           <button
//             onClick={() => window.location.reload()}
//             className="btn-primary text-white py-2 px-6 rounded-full font-medium"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="font-poppins min-h-screen p-4 sm:p-8 bg-gradient-to-br from-[#fff5f5] to-[#fef9ff]">
//       <div className="floating-hearts" id="hearts-container"></div>
//       <div className="container mx-auto max-w-screen-xl relative z-10">
//         <header className="flex justify-between items-center mb-10">
//           <div>
//             <h1 className="text-3xl font-bold text-pink-600 flex items-center">
//               <FeatherIcon icon="heart" className="mr-3 w-8 h-8" />
//               Love Connections
//             </h1>
//             <p className="text-pink-400">Find your perfect match</p>
//           </div>
//           <button
//             onClick={() => window.location.reload()}
//             className="flex items-center text-pink-600 hover:text-pink-700 transition"
//           >
//             <FeatherIcon icon="refresh-cw" className="mr-2 w-5 h-5" />
//             Refresh
//           </button>
//         </header>

//         <main>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {partners.map((partner, index) => (
//               <div
//                 key={index}
//                 className="partner-card"
//                 data-aos="fade-up"
//               >
//                 <div className="bg-gradient-to-r from-pink-400 to-pink-600 h-32 relative">
//                   <div className="absolute inset-x-0 -bottom-12 flex justify-center">
//                     {partner.profilePicUrl ? (
//                       <img
//                         src={partner.profilePicUrl}
//                         alt={partner.name}
//                         className="profile-pic w-24 h-24 rounded-full object-cover cursor-pointer"
//                         onClick={() => openModal(partner.profilePicUrl)}
//                         role="button"
//                         aria-label={`Preview profile picture of ${partner.name}`}
//                       />
//                     ) : (
//                       <div className="w-24 h-24 rounded-full bg-pink-100 flex items-center justify-center">
//                         <FeatherIcon icon="user" className="text-pink-400 w-10 h-10" />
//                       </div>
//                     )}
//                   </div>
//                 </div>
//                 <div className="pt-16 pb-6 px-6 text-center">
//                   <h3 className="text-xl font-semibold text-pink-600 mb-1">{partner.name}</h3>
//                   <p className="text-pink-400 text-sm mb-2">
//                     {partner.hall || "N/A"} • Room {partner.room || "N/A"}
//                   </p>
//                   <p className="text-pink-400 text-sm mb-2">ID: {partner.idNumber || "N/A"}</p>
//                   <p className="text-pink-400 text-sm mb-4">Phone: {partner.phone || "N/A"}</p>
//                   <div className="flex justify-center space-x-3">
//                     <a
//                       href={`tel:${partner.phone || ""}`}
//                       className="btn-primary text-white px-4 py-2 rounded-full text-sm flex items-center"
//                     >
//                       <FeatherIcon icon="phone" className="w-4 h-4 mr-1" />
//                       Call
//                     </a>
//                     <a
//                       href={`sms:${partner.phone || ""}`}
//                       className="btn-secondary px-4 py-2 rounded-full text-sm flex items-center"
//                     >
//                       <FeatherIcon icon="message-square" className="w-4 h-4 mr-1" />
//                       Message
//                     </a>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </main>

//         {showModal && (
//           <div
//             id="imageModal"
//             className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
//             role="dialog"
//             aria-modal="true"
//             aria-labelledby="imagePreviewLabel"
//           >
//             <div className="relative max-w-2xl w-full">
//               <button
//                 className="absolute -top-10 right-0 text-white text-2xl hover:text-pink-300 transition"
//                 onClick={closeModal}
//                 aria-label="Close image preview"
//               >
//                 <FeatherIcon icon="x" />
//               </button>
//               <img
//                 id="modalImage"
//                 src={modalImage}
//                 alt="Profile picture preview"
//                 className="w-full h-auto rounded-lg shadow-xl"
//               />
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


// import React, { useEffect, useState } from "react";
// import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
// import { db } from "./firebase";
// import { Phone, MessageSquare } from "lucide-react";

// export default function MyDates() {
//   const [currentUser, setCurrentUser] = useState(null);
//   const [partners, setPartners] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [modalImage, setModalImage] = useState("");

//   useEffect(() => {
//     const fetchCurrentUser = async () => {
//       try {
//         const authUser = JSON.parse(localStorage.getItem("authUser"));
//         console.log("Auth User:", authUser);
//         if (!authUser?.uid) {
//           console.log("No UID found in authUser");
//           setCurrentUser(null);
//           setLoading(false);
//           return;
//         }

//         const studentRef = doc(db, "students", authUser.uid);
//         const studentSnap = await getDoc(studentRef);
//         if (studentSnap.exists()) {
//           const userData = { uid: authUser.uid, ...studentSnap.data() };
//           console.log("Current User Data:", userData);
//           setCurrentUser(userData);
//         } else {
//           console.log("No student document found for UID:", authUser.uid);
//           setCurrentUser(null);
//         }
//       } catch (err) {
//         console.error("Error fetching current user:", err);
//         setCurrentUser(null);
//       }
//       setLoading(false);
//     };

//     fetchCurrentUser();
//   }, []);

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!currentUser?.uid) {
//         console.log("No current user UID, skipping partner fetch");
//         setPartners([]);
//         return;
//       }

//       setLoading(true);
//       try {
//         const partnersRef = collection(db, "partners");
//         const partnersSnap = await getDocs(partnersRef);
//         console.log("All Partners Snapshot:", partnersSnap.docs.map((d) => d.data()));

//         const userPartners = partnersSnap.docs
//           .filter((doc) => {
//             const data = doc.data();
//             const maleId = data.male?.id;
//             const femaleIds = Array.isArray(data.females) ? data.females.map((f) => f.id) : [];
//             return maleId === currentUser.uid || femaleIds.includes(currentUser.uid);
//           })
//           .map((doc) => ({ id: doc.id, ...doc.data() }));

//         console.log("Filtered User Partners:", userPartners);
//         setPartners(userPartners);
//       } catch (err) {
//         console.error("Error fetching partners:", err);
//         setPartners([]);
//       }
//       setLoading(false);
//     };

//     fetchData();
//   }, [currentUser]);

//   const openModal = (src) => {
//     setModalImage(src);
//     setShowModal(true);
//   };
//   const closeModal = () => setShowModal(false);

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen">
//         <div className="w-16 h-16 rounded-full bg-pink-400 animate-pulse mb-4"></div>
//         <p className="text-pink-600 text-lg">Loading your partners...</p>
//       </div>
//     );
//   }

//   if (partners.length === 0 && !loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-purple-100 p-4">
//         <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl text-center">
//           <h3 className="text-xl font-bold text-gray-800 mb-2">No Partners Available</h3>
//           <p className="text-gray-600 mb-6">
//             No partners are currently assigned. Check console logs for debugging or ensure you're connected.
//           </p>
//           <button
//             onClick={() => window.location.reload()}
//             className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-6 rounded-lg"
//           >
//             Refresh
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto max-w-screen-xl p-4 sm:p-6">
//       <h1 className="text-2xl sm:text-3xl font-bold text-pink-600 font-dancing mb-6">
//         <i className="heart-icon mr-2"></i>Partners
//       </h1>

//       <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
//           {partners.flatMap((group) =>
//             group.females.map((partner) => (
//               <div
//                 key={partner.id}
//                 className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-transform transform hover:-translate-y-1"
//               >
//                 <div className="bg-pink-500 h-24 relative">
//                   <div className="absolute inset-x-0 -bottom-12 flex justify-center">
//                     {partner.photo ? (
//                       <img
//                         src={partner.photo}
//                         alt={partner.name}
//                         className="w-24 h-24 rounded-full border-4 border-white object-cover cursor-pointer"
//                         onClick={() => openModal(partner.photo)}
//                         role="button"
//                         aria-label={`Preview profile picture of ${partner.name}`}
//                       />
//                     ) : (
//                       <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-300 flex items-center justify-center">
//                         <svg
//                           className="w-12 h-12 text-gray-600"
//                           fill="currentColor"
//                           viewBox="0 0 24 24"
//                         >
//                           <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
//                         </svg>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 <div className="pt-16 pb-6 px-6 text-center">
//                   <h3 className="text-xl font-semibold text-gray-800">{partner.name}</h3>
//                   <p className="text-gray-500 text-sm mb-2">
//                     Hostel: {partner.hall || "N/A"}
//                   </p>
//                   <p className="text-gray-500 text-sm mb-2">Room: {partner.room || "N/A"}</p>
//                   <p className="text-gray-500 text-sm mb-4">Phone: {partner.phone || "N/A"}</p>

//                   <div className="flex justify-center space-x-4">
//                     <a
//                       href={`tel:${partner.phone || ""}`}
//                       className="bg-pink-500 text-white px-4 py-2 rounded-full hover:bg-pink-600 text-sm"
//                     >
//                       <Phone className="w-4 h-4 mr-1 inline" /> Call
//                     </a>
//                     <a
//                       href={`sms:${partner.phone || ""}`}
//                       className="bg-purple-500 text-white px-4 py-2 rounded-full hover:bg-purple-600 text-sm"
//                     >
//                       <MessageSquare className="w-4 h-4 mr-1 inline" /> Message
//                     </a>
//                   </div>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>

//       {showModal && (
//         <div
//           id="imagePreviewModal"
//           className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
//           role="dialog"
//           aria-modal="true"
//           aria-labelledby="imagePreviewLabel"
//         >
//           <div className="relative max-w-3xl w-full">
//             <button
//               className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-pink-600 transition"
//               onClick={closeModal}
//               aria-label="Close image preview"
//             >
//               ×
//             </button>
//             <img
//               id="previewImage"
//               src={modalImage}
//               alt="Profile picture preview"
//               className="w-full h-auto rounded-lg shadow-lg"
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }