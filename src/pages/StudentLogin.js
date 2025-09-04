import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { getAuth, signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import axios from "axios";
import FeatherIcon from "feather-icons-react";

const OTP_RATE_LIMIT = 60;

const StudentLogin = () => {
  const [idNumber, setIdNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentDocId, setStudentDocId] = useState("");
  const [step, setStep] = useState("id");
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const auth = getAuth();

  // Floating hearts animation
  useEffect(() => {
    const container = document.getElementById("hearts-container");
    const heartCount = 15;

    for (let i = 0; i < heartCount; i++) {
      const heart = document.createElement("div");
      heart.classList.add("heart");
      heart.style.left = Math.random() * 100 + "vw";
      heart.style.animationDuration = (Math.random() * 5 + 5) + "s";
      heart.style.animationDelay = Math.random() * 5 + "s";
      heart.style.opacity = Math.random() * 0.5 + 0.1;
      heart.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
      container.appendChild(heart);
    }

    // Cleanup: remove hearts when component unmounts
    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendOtp = async (phone, studentDocId) => {
    if (!phone || !studentDocId) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Phone number or student ID is missing!",
        confirmButtonColor: "#EF4444",
      });
      return false;
    }
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const response = await axios.post(
        "https://us-central1-blind-date-web-84b3d.cloudfunctions.net/sendOtp",
        {
          phone,
          studentDocId,
        }
      );
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "OTP Sent!",
          text: `A 6-digit OTP was sent to ${phone}`,
          confirmButtonColor: "#ec4899",
        });
        setResendTimer(OTP_RATE_LIMIT);
        return true;
      } else {
        throw new Error(response.data.error || "Failed to send OTP");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: err.message || "Could not send OTP. Try again.",
        confirmButtonColor: "#EF4444",
      });
      return false;
    }
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const studentRef = doc(db, "students", idNumber);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        Swal.fire({
          icon: "error",
          title: "Not Found",
          text: "Student not found!",
          confirmButtonColor: "#EF4444",
        });
        setLoading(false);
        return;
      }
      const studentData = studentSnap.data();
      setStudentDocId(idNumber);
      setStudentName(studentData.name);
      setStudentPhone(studentData.phone);
      const success = await sendOtp(studentData.phone, idNumber);
      if (success) {
        setStep("otp");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Something went wrong verifying student: ${err.message}`,
        confirmButtonColor: "#EF4444",
      });
    }
    setLoading(false);
  };

  const handleOtpChange = (e, index) => {
    if (/^[0-9]?$/.test(e.target.value)) {
      const newOtp = [...otp];
      newOtp[index] = e.target.value;
      setOtp(newOtp);
      if (e.target.value && index < 5) {
        document.getElementById(`otp-${index + 1}`).focus();
      }
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const enteredOtp = otp.join("");
      const otpRef = doc(db, "otps", studentDocId);
      const otpSnap = await getDoc(otpRef);
      if (!otpSnap.exists()) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No OTP found. Please request a new OTP.",
          confirmButtonColor: "#EF4444",
        });
        return;
      }
      const otpData = otpSnap.data();
      const now = Date.now();
      const createdAt = otpData.createdAt?.toMillis();
      if (!createdAt || (now - createdAt) / 1000 > 300) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "OTP has expired. Please request a new OTP.",
          confirmButtonColor: "#EF4444",
        });
        return;
      }
      if (otpData.otp !== enteredOtp) {
        Swal.fire({
          icon: "error",
          title: "Invalid OTP",
          text: "The code you entered is incorrect.",
          confirmButtonColor: "#EF4444",
        });
        return;
      }
      Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: `OTP Verified 🎉 `,
        confirmButtonColor: "#ec4899",
      }).then(() => {
        localStorage.setItem("authUser", JSON.stringify({ uid: studentDocId }));
        navigate("/student-dashboard", { state: { studentDocId } });
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Verification failed: ${err.message}`,
        confirmButtonColor: "#EF4444",
      });
    }
  };

  const handleResendOtp = async () => {
    const success = await sendOtp(studentPhone, studentDocId);
    if (success) {
      setOtp(new Array(6).fill(""));
    }
  };

  return (
    <div className="font-poppins bg-pink-50 heart-bg min-h-screen flex flex-col items-center justify-between p-4 relative overflow-hidden">
      <div className="floating-hearts" id="hearts-container"></div>
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl relative z-10">
        {step === "id" && (
          <div>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FeatherIcon icon="heart" className="text-pink-500 w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-pink-600 mb-2">BlindDate, 2025</h1>
              <p className="text-pink-400">Enter your Index Number to continue</p>
            </div>
            <form onSubmit={handleIdSubmit} className="space-y-6">
              <div>
                <label htmlFor="idNumber" className="block text-sm font-medium text-pink-700 mb-1">
                  Student ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FeatherIcon icon="user" className="text-pink-400" />
                  </div>
                  <input
                    type="text"
                    id="idNumber"
                    placeholder="Enter your Index number"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-heart text-white py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <FeatherIcon icon="loader" className="animate-spin inline mr-2" />
                    Verifying...
                  </span>
                ) : (
                  "Continue with Love"
                )}
              </button>
            </form>
          </div>
        )}
        {step === "otp" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-pink-600 mb-1">Hello {studentName}</h2>
              <p className="text-pink-500">
                We've sent a 6-digit code to <span className="font-semibold">{studentPhone}</span>
              </p>
            </div>
            <div className="grid grid-cols-6 gap-2 mb-8 px-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(e, index)}
                  className="otp-input rounded-lg aspect-square w-full text-center"
                />
              ))}
            </div>
            <button
              onClick={handleVerifyOtp}
              className="w-full btn-heart text-white py-3 px-4 rounded-lg font-medium mb-3 transition-all transform hover:scale-[1.02]"
            >
              Verify & Continue
            </button>
            <button
              onClick={handleResendOtp}
              disabled={resendTimer > 0}
              className="w-full py-3 px-4 rounded-lg font-medium text-pink-600 bg-pink-100 hover:bg-pink-200 transition disabled:opacity-50"
            >
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        )}
      </div>
      <footer className="w-full text-center py-4 text-pink-600 relative z-10">
        <a
          href="https://wa.me/+233247055443"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center text-pink-600 hover:text-pink-700 transition"
        >
          <FeatherIcon icon="message-circle" className="mr-2 w-5 h-5" />
          Contact Us
        </a>
      </footer>
    </div>
  );
};

export default StudentLogin;
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { db } from "../firebase";
// import { getAuth, signInAnonymously } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import Swal from "sweetalert2";
// import axios from "axios";
// import FeatherIcon from "feather-icons-react";

// const OTP_RATE_LIMIT = 60;

// const StudentLogin = () => {
//   const [idNumber, setIdNumber] = useState("");
//   const [studentName, setStudentName] = useState("");
//   const [studentPhone, setStudentPhone] = useState("");
//   const [studentDocId, setStudentDocId] = useState("");
//   const [step, setStep] = useState("id");
//   const [otp, setOtp] = useState(new Array(6).fill(""));
//   const [loading, setLoading] = useState(false);
//   const [resendTimer, setResendTimer] = useState(0);
//   const navigate = useNavigate();
//   const auth = getAuth();

//   // Floating hearts animation
//   useEffect(() => {
//     const container = document.getElementById("hearts-container");
//     const heartCount = 15;

//     for (let i = 0; i < heartCount; i++) {
//       const heart = document.createElement("div");
//       heart.classList.add("heart");
//       heart.style.left = Math.random() * 100 + "vw";
//       heart.style.animationDuration = (Math.random() * 5 + 5) + "s";
//       heart.style.animationDelay = Math.random() * 5 + "s";
//       heart.style.opacity = Math.random() * 0.5 + 0.1;
//       heart.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
//       container.appendChild(heart);
//     }

//     // Cleanup: remove hearts when component unmounts
//     return () => {
//       while (container.firstChild) {
//         container.removeChild(container.firstChild);
//       }
//     };
//   }, []);

//   useEffect(() => {
//     let interval;
//     if (resendTimer > 0) {
//       interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [resendTimer]);

//   const sendOtp = async (phone, studentDocId) => {
//     if (!phone || !studentDocId) {
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: "Phone number or student ID is missing!",
//         confirmButtonColor: "#EF4444",
//       });
//       return false;
//     }
//     try {
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//       }
//       const response = await axios.post("http://localhost:5000/send-otp", {
//         phone,
//         studentDocId,
//       });
//       if (response.data.success) {
//         Swal.fire({
//           icon: "success",
//           title: "OTP Sent!",
//           text: `A 6-digit OTP was sent to ${phone}`,
//           confirmButtonColor: "#ec4899",
//         });
//         setResendTimer(OTP_RATE_LIMIT);
//         return true;
//       } else {
//         throw new Error(response.data.error || "Failed to send OTP");
//       }
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: err.message || "Could not send OTP. Try again.",
//         confirmButtonColor: "#EF4444",
//       });
//       return false;
//     }
//   };

//   const handleIdSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//       }
//       const studentRef = doc(db, "students", idNumber);
//       const studentSnap = await getDoc(studentRef);
//       if (!studentSnap.exists()) {
//         Swal.fire({
//           icon: "error",
//           title: "Not Found",
//           text: "Student not found!",
//           confirmButtonColor: "#EF4444",
//         });
//         setLoading(false);
//         return;
//       }
//       const studentData = studentSnap.data();
//       setStudentDocId(idNumber);
//       setStudentName(studentData.name);
//       setStudentPhone(studentData.phone);
//       const success = await sendOtp(studentData.phone, idNumber);
//       if (success) {
//         setStep("otp");
//       }
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Something went wrong verifying student: ${err.message}`,
//         confirmButtonColor: "#EF4444",
//       });
//     }
//     setLoading(false);
//   };

//   const handleOtpChange = (e, index) => {
//     if (/^[0-9]?$/.test(e.target.value)) {
//       const newOtp = [...otp];
//       newOtp[index] = e.target.value;
//       setOtp(newOtp);
//       if (e.target.value && index < 5) {
//         document.getElementById(`otp-${index + 1}`).focus();
//       }
//     }
//   };

//   const handleVerifyOtp = async () => {
//     try {
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//       }
//       const enteredOtp = otp.join("");
//       const otpRef = doc(db, "otps", studentDocId);
//       const otpSnap = await getDoc(otpRef);
//       if (!otpSnap.exists()) {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "No OTP found. Please request a new OTP.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }
//       const otpData = otpSnap.data();
//       const now = Date.now();
//       const createdAt = otpData.createdAt?.toMillis();
//       if (!createdAt || (now - createdAt) / 1000 > 300) {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "OTP has expired. Please request a new OTP.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }
//       if (otpData.otp !== enteredOtp) {
//         Swal.fire({
//           icon: "error",
//           title: "Invalid OTP",
//           text: "The code you entered is incorrect.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }
//       Swal.fire({
//         icon: "success",
//         title: "Welcome!",
//         text: `OTP Verified 🎉 `,
//         confirmButtonColor: "#ec4899",
//       }).then(() => {
//         localStorage.setItem("authUser", JSON.stringify({ uid: studentDocId }));
//         navigate("/student-dashboard", { state: { studentDocId } });
//       });
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Verification failed: ${err.message}`,
//         confirmButtonColor: "#EF4444",
//       });
//     }
//   };

//   const handleResendOtp = async () => {
//     const success = await sendOtp(studentPhone, studentDocId);
//     if (success) {
//       setOtp(new Array(6).fill(""));
//     }
//   };

//   return (
//     <div className="font-poppins bg-pink-50 heart-bg min-h-screen flex flex-col items-center justify-between p-4 relative overflow-hidden">
//       <div className="floating-hearts" id="hearts-container"></div>
//       <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl relative z-10">
//         {step === "id" && (
//           <div>
//             <div className="text-center mb-8">
//               <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <FeatherIcon icon="heart" className="text-pink-500 w-10 h-10" />
//               </div>
//               <h1 className="text-3xl font-bold text-pink-600 mb-2">BlindDate, 2025</h1>
//               <p className="text-pink-400">Enter your Index Number to continue</p>
//             </div>
//             <form onSubmit={handleIdSubmit} className="space-y-6">
//               <div>
//                 <label htmlFor="idNumber" className="block text-sm font-medium text-pink-700 mb-1">
//                   Student ID
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <FeatherIcon icon="user" className="text-pink-400" />
//                   </div>
//                   <input
//                     type="text"
//                     id="idNumber"
//                     placeholder="Enter your Index number"
//                     value={idNumber}
//                     onChange={(e) => setIdNumber(e.target.value)}
//                     className="w-full pl-10 pr-4 py-3 rounded-lg border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition"
//                     required
//                   />
//                 </div>
//               </div>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full btn-heart text-white py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] disabled:opacity-50"
//               >
//                 {loading ? (
//                   <span className="flex items-center justify-center">
//                     <FeatherIcon icon="loader" className="animate-spin inline mr-2" />
//                     Verifying...
//                   </span>
//                 ) : (
//                   "Continue with Love"
//                 )}
//               </button>
//             </form>
//           </div>
//         )}
//         {step === "otp" && (
//           <div>
//             <div className="text-center mb-6">
//               <h2 className="text-xl font-bold text-pink-600 mb-1">Hello {studentName}</h2>
//               <p className="text-pink-500">
//                 We've sent a 6-digit code to <span className="font-semibold">{studentPhone}</span>
//               </p>
//             </div>
//             <div className="grid grid-cols-6 gap-2 mb-8 px-4">
//               {otp.map((digit, index) => (
//                 <input
//                   key={index}
//                   id={`otp-${index}`}
//                   type="text"
//                   maxLength="1"
//                   value={digit}
//                   onChange={(e) => handleOtpChange(e, index)}
//                   className="otp-input rounded-lg aspect-square w-full text-center"
//                 />
//               ))}
//             </div>
//             <button
//               onClick={handleVerifyOtp}
//               className="w-full btn-heart text-white py-3 px-4 rounded-lg font-medium mb-3 transition-all transform hover:scale-[1.02]"
//             >
//               Verify & Continue
//             </button>
//             <button
//               onClick={handleResendOtp}
//               disabled={resendTimer > 0}
//               className="w-full py-3 px-4 rounded-lg font-medium text-pink-600 bg-pink-100 hover:bg-pink-200 transition disabled:opacity-50"
//             >
//               {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
//             </button>
//           </div>
//         )}
//       </div>
//       <footer className="w-full text-center py-4 text-pink-600 relative z-10">
//         <a
//           href="https://wa.me/+233247055443"
//           target="_blank"
//           rel="noopener noreferrer"
//           className="flex items-center justify-center text-pink-600 hover:text-pink-700 transition"
//         >
//           <FeatherIcon icon="message-circle" className="mr-2 w-5 h-5" />
//           Contact Us
//         </a>
//       </footer>
//     </div>
//   );
// };

// export default StudentLogin;



// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { db } from "../firebase";
// import { getAuth, signInAnonymously } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import Swal from "sweetalert2";
// import axios from "axios";
// import FeatherIcon from "feather-icons-react";

// const OTP_RATE_LIMIT = 60;

// const StudentLogin = () => {
//   const [idNumber, setIdNumber] = useState("");
//   const [studentName, setStudentName] = useState("");
//   const [studentPhone, setStudentPhone] = useState("");
//   const [studentDocId, setStudentDocId] = useState("");
//   const [step, setStep] = useState("id");
//   const [otp, setOtp] = useState(new Array(6).fill(""));
//   const [loading, setLoading] = useState(false);
//   const [resendTimer, setResendTimer] = useState(0);
//   const navigate = useNavigate();
//   const auth = getAuth();

//   // Floating hearts animation
//   useEffect(() => {
//     const container = document.getElementById("hearts-container");
//     const heartCount = 15;

//     for (let i = 0; i < heartCount; i++) {
//       const heart = document.createElement("div");
//       heart.classList.add("heart");
//       heart.style.left = Math.random() * 100 + "vw";
//       heart.style.animationDuration = (Math.random() * 5 + 5) + "s";
//       heart.style.animationDelay = Math.random() * 5 + "s";
//       heart.style.opacity = Math.random() * 0.5 + 0.1;
//       heart.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
//       container.appendChild(heart);
//     }

//     // Cleanup: remove hearts when component unmounts
//     return () => {
//       while (container.firstChild) {
//         container.removeChild(container.firstChild);
//       }
//     };
//   }, []);

//   useEffect(() => {
//     let interval;
//     if (resendTimer > 0) {
//       interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [resendTimer]);

//   const sendOtp = async (phone, studentDocId) => {
//     if (!phone || !studentDocId) {
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: "Phone number or student ID is missing!",
//         confirmButtonColor: "#EF4444",
//       });
//       return false;
//     }
//     try {
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//       }
//       const response = await axios.post("http://localhost:5000/send-otp", {
//         phone,
//         studentDocId,
//       });
//       if (response.data.success) {
//         Swal.fire({
//           icon: "success",
//           title: "OTP Sent!",
//           text: `A 6-digit OTP was sent to ${phone}`,
//           confirmButtonColor: "#ec4899",
//         });
//         setResendTimer(OTP_RATE_LIMIT);
//         return true;
//       } else {
//         throw new Error(response.data.error || "Failed to send OTP");
//       }
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: err.message || "Could not send OTP. Try again.",
//         confirmButtonColor: "#EF4444",
//       });
//       return false;
//     }
//   };

//   const handleIdSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//       }
//       const studentRef = doc(db, "students", idNumber);
//       const studentSnap = await getDoc(studentRef);
//       if (!studentSnap.exists()) {
//         Swal.fire({
//           icon: "error",
//           title: "Not Found",
//           text: "Student not found!",
//           confirmButtonColor: "#EF4444",
//         });
//         setLoading(false);
//         return;
//       }
//       const studentData = studentSnap.data();
//       setStudentDocId(idNumber);
//       setStudentName(studentData.name);
//       setStudentPhone(studentData.phone);
//       const success = await sendOtp(studentData.phone, idNumber);
//       if (success) {
//         setStep("otp");
//       }
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Something went wrong verifying student: ${err.message}`,
//         confirmButtonColor: "#EF4444",
//       });
//     }
//     setLoading(false);
//   };

//   const handleOtpChange = (e, index) => {
//     if (/^[0-9]?$/.test(e.target.value)) {
//       const newOtp = [...otp];
//       newOtp[index] = e.target.value;
//       setOtp(newOtp);
//       if (e.target.value && index < 5) {
//         document.getElementById(`otp-${index + 1}`).focus();
//       }
//     }
//   };

//   const handleVerifyOtp = async () => {
//     try {
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//       }
//       const enteredOtp = otp.join("");
//       const otpRef = doc(db, "otps", studentDocId);
//       const otpSnap = await getDoc(otpRef);
//       if (!otpSnap.exists()) {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "No OTP found. Please request a new OTP.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }
//       const otpData = otpSnap.data();
//       const now = Date.now();
//       const createdAt = otpData.createdAt?.toMillis();
//       if (!createdAt || (now - createdAt) / 1000 > 300) {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "OTP has expired. Please request a new OTP.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }
//       if (otpData.otp !== enteredOtp) {
//         Swal.fire({
//           icon: "error",
//           title: "Invalid OTP",
//           text: "The code you entered is incorrect.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }
//       Swal.fire({
//         icon: "success",
//         title: "Welcome!",
//         text: `OTP Verified 🎉 `,
//         confirmButtonColor: "#ec4899",
//       }).then(() => {
//         localStorage.setItem("authUser", JSON.stringify({ uid: studentDocId }));
//         navigate("/student-dashboard", { state: { studentDocId } });
//       });
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Verification failed: ${err.message}`,
//         confirmButtonColor: "#EF4444",
//       });
//     }
//   };

//   const handleResendOtp = async () => {
//     const success = await sendOtp(studentPhone, studentDocId);
//     if (success) {
//       setOtp(new Array(6).fill(""));
//     }
//   };

//   return (
//     <div className="font-poppins bg-pink-50 heart-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
//       <div className="floating-hearts" id="hearts-container"></div>
//       <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl relative z-10">
//         {step === "id" && (
//           <div>
//             <div className="text-center mb-8">
//               <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <FeatherIcon icon="heart" className="text-pink-500 w-10 h-10" />
//               </div>
//               <h1 className="text-3xl font-bold text-pink-600 mb-2">BlindDate, 2025</h1>
//               <p className="text-pink-400">Enter your Index Number to continue</p>
//             </div>
//             <form onSubmit={handleIdSubmit} className="space-y-6">
//               <div>
//                 <label htmlFor="idNumber" className="block text-sm font-medium text-pink-700 mb-1">
//                   Student ID
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <FeatherIcon icon="user" className="text-pink-400" />
//                   </div>
//                   <input
//                     type="text"
//                     id="idNumber"
//                     placeholder="Enter your Index number"
//                     value={idNumber}
//                     onChange={(e) => setIdNumber(e.target.value)}
//                     className="w-full pl-10 pr-4 py-3 rounded-lg border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition"
//                     required
//                   />
//                 </div>
//               </div>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full btn-heart text-white py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-[1.02] disabled:opacity-50"
//               >
//                 {loading ? (
//                   <span className="flex items-center justify-center">
//                     <FeatherIcon icon="loader" className="animate-spin inline mr-2" />
//                     Verifying...
//                   </span>
//                 ) : (
//                   "Continue with Love"
//                 )}
//               </button>
//             </form>
//           </div>
//         )}
//         {step === "otp" && (
//           <div>
//             <div className="text-center mb-6">
//               <h2 className="text-xl font-bold text-pink-600 mb-1">Hello {studentName}</h2>
//               <p className="text-pink-500">
//                 We've sent a 6-digit code to <span className="font-semibold">{studentPhone}</span>
//               </p>
//             </div>
//             <div className="grid grid-cols-6 gap-2 mb-8 px-4">
//               {otp.map((digit, index) => (
//                 <input
//                   key={index}
//                   id={`otp-${index}`}
//                   type="text"
//                   maxLength="1"
//                   value={digit}
//                   onChange={(e) => handleOtpChange(e, index)}
//                   className="otp-input rounded-lg aspect-square w-full text-center"
//                 />
//               ))}
//             </div>
//             <button
//               onClick={handleVerifyOtp}
//               className="w-full btn-heart text-white py-3 px-4 rounded-lg font-medium mb-3 transition-all transform hover:scale-[1.02]"
//             >
//               Verify & Continue
//             </button>
//             <button
//               onClick={handleResendOtp}
//               disabled={resendTimer > 0}
//               className="w-full py-3 px-4 rounded-lg font-medium text-pink-600 bg-pink-100 hover:bg-pink-200 transition disabled:opacity-50"
//             >
//               {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default StudentLogin;


// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { db } from "../firebase"; // Firestore
// import { getAuth, signInAnonymously } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import Swal from "sweetalert2";
// import axios from "axios";

// const OTP_RATE_LIMIT = 60; // seconds

// const StudentLogin = () => {
//   const [idNumber, setIdNumber] = useState("");
//   const [studentName, setStudentName] = useState("");
//   const [studentPhone, setStudentPhone] = useState("");
//   const [studentDocId, setStudentDocId] = useState("");
//   const [step, setStep] = useState("id"); // id | otp
//   const [otp, setOtp] = useState(new Array(6).fill(""));
//   const [loading, setLoading] = useState(false);
//   const [resendTimer, setResendTimer] = useState(0);
//   const navigate = useNavigate();
//   const auth = getAuth();

//   // Countdown for Resend OTP
//   useEffect(() => {
//     let interval;
//     if (resendTimer > 0) {
//       interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [resendTimer]);

//   // Send OTP using Arkesel via Express server
//   const sendOtp = async (phone, studentDocId) => {
//     if (!phone || !studentDocId) {
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: "Phone number or student ID is missing!",
//         confirmButtonColor: "#EF4444",
//       });
//       return false;
//     }

//     try {
//       // Sign in anonymously to satisfy Firestore security rules
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//         console.log("Signed in anonymously");
//       }

//       const response = await axios.post("http://localhost:5000/send-otp", {
//         phone,
//         studentDocId,
//       });
//       if (response.data.success) {
//         Swal.fire({
//           icon: "success",
//           title: "OTP Sent!",
//           text: `A 6-digit OTP was sent to ${phone}`,
//           confirmButtonColor: "#4F46E5",
//         });
//         setResendTimer(OTP_RATE_LIMIT);
//         return true;
//       } else {
//         throw new Error(response.data.error || "Failed to send OTP");
//       }
//     } catch (err) {
//       console.error("Error sending OTP:", err.message);
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: err.message || "Could not send OTP. Try again.",
//         confirmButtonColor: "#EF4444",
//       });
//       return false;
//     }
//   };

//   // Handle ID submit
//   const handleIdSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       // Sign in anonymously to satisfy Firestore security rules
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//         console.log("Signed in anonymously");
//       }

//       // Fetch student by idNumber (document ID)
//       const studentRef = doc(db, "students", idNumber);
//       const studentSnap = await getDoc(studentRef);

//       if (!studentSnap.exists()) {
//         console.log("No student found for idNumber:", idNumber);
//         Swal.fire({
//           icon: "error",
//           title: "Not Found",
//           text: "Student not found!",
//           confirmButtonColor: "#EF4444",
//         });
//         setLoading(false);
//         return;
//       }

//       const studentData = studentSnap.data();
//       console.log("Student data:", studentData);

//       setStudentDocId(idNumber);
//       setStudentName(studentData.name);
//       setStudentPhone(studentData.phone);

//       const success = await sendOtp(studentData.phone, idNumber);
//       if (success) {
//         setStep("otp");
//       }
//     } catch (err) {
//       console.error("Error verifying ID:", err.message);
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Something went wrong verifying student: ${err.message}`,
//         confirmButtonColor: "#EF4444",
//       });
//     }
//     setLoading(false);
//   };

//   // OTP input change
//   const handleOtpChange = (e, index) => {
//     if (/^[0-9]?$/.test(e.target.value)) {
//       const newOtp = [...otp];
//       newOtp[index] = e.target.value;
//       setOtp(newOtp);

//       if (e.target.value && index < 5) {
//         document.getElementById(`otp-${index + 1}`).focus();
//       }
//     }
//   };

//   // Verify OTP
//   const handleVerifyOtp = async () => {
//     try {
//       // Ensure user is signed in anonymously
//       if (!auth.currentUser) {
//         await signInAnonymously(auth);
//         console.log("Signed in anonymously");
//       }

//       const enteredOtp = otp.join("");
//       const otpRef = doc(db, "otps", studentDocId);
//       const otpSnap = await getDoc(otpRef);

//       if (!otpSnap.exists()) {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "No OTP found. Please request a new OTP.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }

//       const otpData = otpSnap.data();
//       const now = Date.now();
//       const createdAt = otpData.createdAt?.toMillis();

//       if (!createdAt || (now - createdAt) / 1000 > 300) {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: "OTP has expired. Please request a new OTP.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }

//       if (otpData.otp !== enteredOtp) {
//         Swal.fire({
//           icon: "error",
//           title: "Invalid OTP",
//           text: "The code you entered is incorrect.",
//           confirmButtonColor: "#EF4444",
//         });
//         return;
//       }

//       // OTP verified, store user data and navigate
//       Swal.fire({
//         icon: "success",
//         title: "Welcome!",
//         text: `OTP Verified 🎉 Hello ${studentName}`,
//         confirmButtonColor: "#4F46E5",
//       }).then(() => {
//         localStorage.setItem("authUser", JSON.stringify({ uid: studentDocId }));
//         navigate("/student-dashboard", { state: { studentDocId } });
//       });
//     } catch (err) {
//       console.error("Error verifying OTP:", err.message);
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Verification failed: ${err.message}`,
//         confirmButtonColor: "#EF4444",
//       });
//     }
//   };

//   // Resend OTP
//   const handleResendOtp = async () => {
//     const success = await sendOtp(studentPhone, studentDocId);
//     if (success) {
//       setOtp(new Array(6).fill(""));
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl">
//         {step === "id" && (
//           <>
//             <h1 className="text-2xl font-bold text-center mb-6">Student Verification</h1>
//             <form onSubmit={handleIdSubmit} className="space-y-6">
//               <input
//                 type="text"
//                 placeholder="Enter ID Number"
//                 value={idNumber}
//                 onChange={(e) => setIdNumber(e.target.value)}
//                 className="w-full px-4 py-3 rounded-lg border border-gray-300"
//                 required
//               />
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
//               >
//                 {loading ? "Verifying..." : "Continue"}
//               </button>
//             </form>
//           </>
//         )}

//         {step === "otp" && (
//           <>
//             <h2 className="text-xl font-bold text-center mb-4">Welcome {studentName}</h2>
//             <p className="text-center text-gray-600 mb-4">
//               We’ve sent a 6-digit code to <b>{studentPhone}</b>
//             </p>
//             <div className="flex justify-center gap-3 mb-6">
//               {otp.map((digit, index) => (
//                 <input
//                   key={index}
//                   id={`otp-${index}`}
//                   type="text"
//                   maxLength="1"
//                   value={digit}
//                   onChange={(e) => handleOtpChange(e, index)}
//                   className="otp-input w-12 h-12 text-center border rounded-lg"
//                 />
//               ))}
//             </div>
//             <button
//               onClick={handleVerifyOtp}
//               className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
//             >
//               Verify & Continue
//             </button>
//             <button
//               onClick={handleResendOtp}
//               disabled={resendTimer > 0}
//               className={`w-full mt-3 py-3 px-4 rounded-lg font-medium transition-colors ${
//                 resendTimer > 0
//                   ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                   : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//             >
//               {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
//             </button>
//           </>
//         )}
//         {/* Removed reCAPTCHA container as it's not needed for Arkesel OTP */}
//       </div>
//     </div>
//   );
// };

// export default StudentLogin;


// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { db } from "../firebase"; // Firestore
// import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
// import { collection, query, where, getDocs } from "firebase/firestore";
// import Swal from "sweetalert2";

// const OTP_RATE_LIMIT = 60; // seconds

// const StudentLogin = () => {
//   const [idNumber, setIdNumber] = useState("");
//   const [studentName, setStudentName] = useState("");
//   const [studentPhone, setStudentPhone] = useState("");
//   const [studentDocId, setStudentDocId] = useState("");
//   const [step, setStep] = useState("id"); // id | otp
//   const [otp, setOtp] = useState(new Array(6).fill(""));
//   const [loading, setLoading] = useState(false);
//   const [resendTimer, setResendTimer] = useState(0);
//   const [confirmationResult, setConfirmationResult] = useState(null);
//   const navigate = useNavigate();
//   const auth = getAuth();

//   // Countdown for Resend OTP
//   useEffect(() => {
//     let interval;
//     if (resendTimer > 0) {
//       interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [resendTimer]);

//   // Send OTP using Firebase Phone Authentication
//   const sendOtp = async (phone) => {
//     if (!phone) {
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: "Phone number is missing!",
//         confirmButtonColor: "#EF4444",
//       });
//       return;
//     }

//     try {
//       // Initialize reCAPTCHA verifier
//       const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
//         size: "invisible",
//         callback: () => {
//           console.log("reCAPTCHA verified");
//         },
//         "expired-callback": () => {
//           console.log("reCAPTCHA expired");
//         },
//       });

//       // For testing only: disable reCAPTCHA (remove in production)
//       if (process.env.NODE_ENV === "development") {
//         window.recaptchaVerifier = recaptchaVerifier; // Expose for testing
//         // Firebase Auth test API (not for production)
//         if (typeof auth.settings !== "undefined") {
//           auth.settings.appVerificationDisabledForTesting = true;
//         }
//       }

//       const formattedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/[^0-9]/g, "")}`; // Ensure E.164 format
//       const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
//       setConfirmationResult(result);
//       Swal.fire({
//         icon: "success",
//         title: "OTP Sent!",
//         text: `A 6-digit OTP was sent to ${phone}`,
//         confirmButtonColor: "#4F46E5",
//       });
//       setResendTimer(OTP_RATE_LIMIT);
//     } catch (err) {
//       console.error("Error sending OTP:", err.code, err.message);
//       Swal.fire({
//         icon: "error",
//         title: "Failed",
//         text: err.message || "Could not send OTP. Try again.",
//         confirmButtonColor: "#EF4444",
//       });
//     }
//   };

//   // Handle ID submit
//   const handleIdSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       console.log("Querying for idNumber:", idNumber);
//       const q = query(collection(db, "students"), where("idNumber", "==", idNumber));
//       const querySnapshot = await getDocs(q);

//       if (querySnapshot.empty) {
//         console.log("No student found for idNumber:", idNumber);
//         Swal.fire({
//           icon: "error",
//           title: "Not Found",
//           text: "Student not found!",
//           confirmButtonColor: "#EF4444",
//         });
//         setLoading(false);
//         return;
//       }

//       const studentDoc = querySnapshot.docs[0];
//       const studentData = studentDoc.data();
//       console.log("Student data:", studentData);

//       setStudentDocId(studentDoc.id);
//       setStudentName(studentData.name);
//       setStudentPhone(studentData.phone);

//       await sendOtp(studentData.phone);
//       setStep("otp");
//     } catch (err) {
//       console.error("Error verifying ID:", err.code, err.message);
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Something went wrong verifying student: ${err.message}`,
//         confirmButtonColor: "#EF4444",
//       });
//     }
//     setLoading(false);
//   };

//   // OTP input change
//   const handleOtpChange = (e, index) => {
//     if (/^[0-9]?$/.test(e.target.value)) {
//       const newOtp = [...otp];
//       newOtp[index] = e.target.value;
//       setOtp(newOtp);

//       if (e.target.value && index < 5) {
//         document.getElementById(`otp-${index + 1}`).focus();
//       }
//     }
//   };

//   // Verify OTP
//   const handleVerifyOtp = async () => {
//     if (!confirmationResult) {
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: "No OTP session found. Please request a new OTP.",
//         confirmButtonColor: "#EF4444",
//       });
//       return;
//     }

//     try {
//       const enteredOtp = otp.join("");
//       const result = await confirmationResult.confirm(enteredOtp);
//       const user = result.user;

//       Swal.fire({
//         icon: "success",
//         title: "Welcome!",
//         text: `OTP Verified 🎉 Hello ${studentName}`,
//         confirmButtonColor: "#4F46E5",
//       }).then(() => {
//         localStorage.setItem("authUser", JSON.stringify({ uid: user.uid }));
//         navigate("/student-dashboard", { state: { studentDocId } });
//       });
//     } catch (err) {
//       console.error("Error verifying OTP:", err.code, err.message);
//       Swal.fire({
//         icon: "error",
//         title: "Invalid OTP",
//         text: err.message || "The code you entered is incorrect.",
//         confirmButtonColor: "#EF4444",
//       });
//     }
//   };

//   // Resend OTP
//   const handleResendOtp = async () => {
//     await sendOtp(studentPhone);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl">
//         {step === "id" && (
//           <>
//             <h1 className="text-2xl font-bold text-center mb-6">Student Verification</h1>
//             <form onSubmit={handleIdSubmit} className="space-y-6">
//               <input
//                 type="text"
//                 placeholder="Enter ID Number"
//                 value={idNumber}
//                 onChange={(e) => setIdNumber(e.target.value)}
//                 className="w-full px-4 py-3 rounded-lg border border-gray-300"
//                 required
//               />
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
//               >
//                 {loading ? "Verifying..." : "Continue"}
//               </button>
//             </form>
//           </>
//         )}

//         {step === "otp" && (
//           <>
//             <h2 className="text-xl font-bold text-center mb-4">Welcome {studentName}</h2>
//             <p className="text-center text-gray-600 mb-4">
//               We’ve sent a 6-digit code to <b>{studentPhone}</b>
//             </p>
//             <div className="flex justify-center gap-3 mb-6">
//               {otp.map((digit, index) => (
//                 <input
//                   key={index}
//                   id={`otp-${index}`}
//                   type="text"
//                   maxLength="1"
//                   value={digit}
//                   onChange={(e) => handleOtpChange(e, index)}
//                   className="otp-input w-12 h-12 text-center border rounded-lg"
//                 />
//               ))}
//             </div>
//             <button
//               onClick={handleVerifyOtp}
//               className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
//             >
//               Verify & Continue
//             </button>
//             <button
//               onClick={handleResendOtp}
//               disabled={resendTimer > 0}
//               className={`w-full mt-3 py-3 px-4 rounded-lg font-medium transition-colors ${
//                 resendTimer > 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//               }`}
//             >
//               {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
//             </button>
//           </>
//         )}
//         <div id="recaptcha-container"></div>
//       </div>
//     </div>
//   );
// };

// export default StudentLogin;